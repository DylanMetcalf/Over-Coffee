// Over Coffee — HTTP server.
//
// Zero runtime dependencies: node:http, node:sqlite, and headless Chromium
// (optional) for PDF files. The browser app is plain ES modules in /web.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store } from './store.js';
import { runPipeline, STAGES, ENGINE_VERSION } from './engine/pipeline.js';
import { TOPIC_CATALOG, interpretInterest, randomTopic, adventurousTopic, resolveTopic } from './engine/topics.js';
import { createResearchAdapter } from './engine/research/index.js';
import { renderPdf, renderPng, findChrome } from './delivery/pdf.js';
import { deliver, audioPayload, renderEmailHtml } from './delivery/channels.js';
import { withLink } from './engine/hooks.js';
import { suggestAreas } from './engine/suggest.js';
import { renderPrintDocument } from '../web/js/render/print.js';
import { initSecret, verifySigned, unsubToken, sign as signValue } from './auth.js';
import { pickSponsored, clickTarget } from './ads.js';
import { entitlementsFor } from './entitlements.js';
import { pushConfigured } from './delivery/push.js';
import { renderSharePage, renderShareCard } from './share.js';
import { hashPassword, verifyPassword, normaliseEmail, validEmail, startSession, endSession, userFromRequest, printToken, checkPrintToken, rateLimited } from './auth.js';
import crypto from 'node:crypto';

const here = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(here, '../web');
const PORT = Number(process.env.PORT || 4321);
const HOST = process.env.HOST || '0.0.0.0';
const BASE_URL = process.env.OC_BASE_URL || `http://localhost:${PORT}`;
const SECURE = BASE_URL.startsWith('https://');
const TRACKED = new Set(['story_saved', 'story_unsaved', 'feedback_given', 'share_created', 'share_visited', 'push_enabled', 'push_disabled', 'unsubscribed', 'history_cleared', 'ad_impression', 'ad_click', 'onboarding_completed', 'edition_opened', 'edition_completed', 'learn_more_opened', 'source_opened', 'pwa_installed', 'topics_changed', 'mode_changed', 'pdf_downloaded', 'lab_opened']);

export const DEFAULT_PROFILE = {
  onboarded: false,
  topics: ['ai', 'food', 'farming'],
  budgetMinutes: 10,
  mode: 'business',
  delivery: { time: '06:00', channels: ['email'], whatsapp: '' },
  tz: 'UTC',
  discovery: 'occasionally',
  pdf: { paper: 'A4' },
  audio: { enabled: true },
};

export function createApp({ store = new Store() } = {}) {
  initSecret(store);
  const adapter = createResearchAdapter();
  // The edition date follows the reader's own timezone (sample mode pins it).
  const dateFor = (p) => {
    if (adapter.editionDate) return adapter.editionDate;
    try {
      return new Date().toLocaleDateString('en-CA', { timeZone: p?.tz || 'UTC' });
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  };
  const profile = (user) => ({ ...DEFAULT_PROFILE, ...store.getProfile(user) });
  const today = (user) => dateFor(profile(user));

  function effectiveToday(user) {
    const p = profile(user);
    const override = store.getOverride(user, dateFor(p));
    return { profile: p, override, topicIds: override?.topicIds?.length ? override.topicIds : p.topics, budgetMinutes: p.budgetMinutes };
  }

  // One generation at a time per reader: a double tap must not start two pipelines.
  const inflight = new Map();
  function todaysEdition(user, opts = {}) {
    const key = user;
    if (inflight.has(key)) return inflight.get(key);
    const run = buildToday(user, opts)
      .catch((err) => {
        // A failed run must never take the paper away: log it and serve the last published edition.
        store.logFailure(user, today(user), err.message);
        console.error('[edition]', user, err.message);
        const prev = store.latestEditionAny(user);
        if (!prev) throw err;
        return { ...prev, stale: { requestedDate: today(user) } };
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, run);
    return run;
  }
  async function buildToday(user, { force = false } = {}) {
    const { topicIds, budgetMinutes, override } = effectiveToday(user);
    const existing = store.latestEdition(user, today(user));
    const same = existing && existing.engineVersion === ENGINE_VERSION && existing.config.budgetMinutes === budgetMinutes && existing.config.topicIds.join() === topicIds.join() && JSON.stringify(existing.config.focus || {}) === JSON.stringify(profile(user).focus || {});
    if (same && !force) return existing;
    return runPipeline({ store, userId: user, topicIds, budgetMinutes, date: today(user), kind: 'daily', extra: override?.reason ? override : null, focus: profile(user).focus });
  }

  async function previewEdition(variant, minutes) {
    const id = `preview-${variant}-${minutes}`;
    const existing = store.getEdition(id);
    if (existing && existing.engineVersion === ENGINE_VERSION) return existing;
    const topicIds = variant === 'single' ? ['ai'] : ['ai', 'food', 'farming'];
    return runPipeline({ store, userId: 'preview', topicIds, budgetMinutes: minutes, date: dateFor(null), kind: 'preview', id });
  }

  const routes = [];
  const route = (method, pattern, handler, { open = false } = {}) => routes.push({ method, open, re: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), handler });
  const PREVIEW_ID = /^preview-(single|multi)-(5|10|20)$/;
  // A reader may open their own editions and the shared sample previews, nothing else.
  const owned = (user, id) => {
    if (PREVIEW_ID.test(id)) return true;
    const ed = store.getEdition(id);
    return !!ed && ed.userId === user;
  };
  const getOwned = (user, id) => (owned(user, id) ? store.getEdition(id) : null);
  const track = (user, name, props) => {
    if (TRACKED.has(name)) store.logEvent(user, name, props);
  };

  // ── accounts ──
  const authResponse = (user) => {
    const acct = store.accountById(user);
    return { user: { id: user, email: acct?.email }, onboarded: !!profile(user).onboarded };
  };
  route('GET', '/api/auth/me', ({ user }) => (user ? authResponse(user) : { user: null }), { open: true });
  route('POST', '/api/auth/signup', ({ req, res, body }) => {
    const email = normaliseEmail(body.email);
    const pw = String(body.password || '');
    if (rateLimited('signup:' + (req.socket.remoteAddress || ''), 30)) return { status: 429, error: 'Too many attempts. Try again in a few minutes.' };
    if (!validEmail(email)) return { status: 400, error: 'Enter a valid email address.' };
    if (pw.length < 8) return { status: 400, error: 'Use at least 8 characters for your password.' };
    if (store.accountByEmail(email)) return { status: 409, error: 'That email already has an account. Try logging in.' };
    const id = 'u_' + crypto.randomBytes(8).toString('hex');
    const tz = typeof body.tz === 'string' && body.tz.length < 60 ? body.tz : 'UTC';
    store.createAccount(id, email, hashPassword(pw), email.split('@')[0], { ...DEFAULT_PROFILE, tz });
    startSession(store, id, res, { secure: SECURE });
    store.logEvent(id, 'signup');
    return authResponse(id);
  }, { open: true });
  route('POST', '/api/auth/login', ({ req, res, body }) => {
    const email = normaliseEmail(body.email);
    if (rateLimited('login:' + (req.socket.remoteAddress || '') + email, 8)) return { status: 429, error: 'Too many attempts. Try again in a few minutes.' };
    const acct = store.accountByEmail(email);
    if (!acct || !verifyPassword(String(body.password || ''), acct.pwHash)) return { status: 401, error: 'Email or password is not right.' };
    startSession(store, acct.userId, res, { secure: SECURE });
    return authResponse(acct.userId);
  }, { open: true });
  route('POST', '/api/auth/logout', ({ req, res }) => {
    endSession(store, req, res);
    return { ok: true };
  }, { open: true });
  route('POST', '/api/track', ({ user, body }) => {
    track(user, String(body.name || ''), body.props && typeof body.props === 'object' ? body.props : null);
    return { ok: true };
  });

  route('GET', '/api/me', ({ user }) => {
    const { profile: p, override, topicIds } = effectiveToday(user);
    return {
      user: { id: user, email: store.accountById(user)?.email },
      profile: p,
      today: today(user),
      override,
      todayTopics: topicIds.map(resolveTopic),
      profileTopics: p.topics.map(resolveTopic),
      plan: store.planOf(user),
      entitlements: entitlementsFor(store.planOf(user)),
      push: { enabled: pushConfigured(), publicKey: pushConfigured() ? process.env.VAPID_PUBLIC_KEY : null, subscribed: store.listPush(user).length > 0 },
      savedKeys: store.listSaved(user).map((r) => `${r.editionId}/${r.storyId}`),
      sample: !!adapter.sample,
      engineVersion: ENGINE_VERSION,
      stages: STAGES.map(([key, number, label]) => ({ key, number, label })),
      pdf: !!findChrome(),
    };
  });

  route('PUT', '/api/profile', async ({ user, body }) => {
    const prev = profile(user);
    const next = { ...prev, ...body };
    delete next.tz;
    next.tz = typeof body.tz === 'string' && body.tz.length < 60 ? body.tz : prev.tz;
    if (body.delivery) next.delivery = { ...prev.delivery, ...body.delivery };
    // Only channels that actually exist: email, and push once this reader has a subscription.
    next.delivery.channels = [...new Set((next.delivery.channels || []).filter((c) => c === 'email' || (c === 'push' && store.listPush(user).length > 0)))];
    if (next.delivery.channels.includes('email') && !prev.delivery?.channels?.includes('email')) next.delivery.consent = { ...(next.delivery.consent || {}), email: new Date().toISOString() };
    next.delivery.whatsapp = String(next.delivery.whatsapp || '').replace(/[^\d+ ]/g, '').slice(0, 20);
    if (Array.isArray(next.topics)) next.topics = [...new Set(next.topics.filter((t) => typeof t === 'string' && t.length < 80))].slice(0, 12);
    // Focus areas per topic: { topicId: ['Explosion protection', …] }
    const focus = {};
    for (const [k, v] of Object.entries(next.focus && typeof next.focus === 'object' ? next.focus : {})) {
      if (next.topics.includes(k) && Array.isArray(v)) focus[k] = [...new Set(v.map((a) => String(a).trim().slice(0, 40)).filter(Boolean))].slice(0, 10);
    }
    next.focus = focus;
    if (![5, 10, 20].includes(Number(next.budgetMinutes))) next.budgetMinutes = 10;
    next.budgetMinutes = Number(next.budgetMinutes);
    if (!['business', 'social'].includes(next.mode)) next.mode = 'business';
    store.saveProfile(user, next);
    if (next.onboarded && !prev.onboarded) track(user, 'onboarding_completed', { mode: next.mode, topics: next.topics.length });
    if (next.mode !== prev.mode && prev.onboarded) track(user, 'mode_changed', { mode: next.mode });
    if (prev.onboarded && next.topics.join() !== prev.topics.join()) track(user, 'topics_changed', { n: next.topics.length });
    return { profile: next };
  });

  route('POST', '/api/reset', ({ user }) => {
    store.saveProfile(user, { ...DEFAULT_PROFILE, tz: profile(user).tz });
    store.setOverride(user, today(user), null);
    return { profile: DEFAULT_PROFILE };
  });

  route('GET', '/api/topics/catalog', () => {
    const avail = adapter.availableTopics?.() || new Set();
    return { topics: TOPIC_CATALOG.map((t) => ({ id: t.id, label: t.label, name: t.name, expansion: t.expansion, adjacent: t.adjacent, hasMaterial: avail.has(t.id) })) };
  }, { open: true });

  route('POST', '/api/topics/suggest', async ({ req, body }) => {
    if (rateLimited('suggest:' + (req.socket.remoteAddress || ''), 40, 10 * 60_000)) return { status: 429, error: 'Slow down a little.' };
    const topic = interpretInterest(String(body.text || '').slice(0, 80));
    if (!topic) return { status: 400, error: 'Type a topic.' };
    return { topic: topic.label, ...(await suggestAreas({ topic, store })) };
  }, { open: true });
  route('POST', '/api/topics/interpret', ({ body }) => ({ topic: interpretInterest(body.text) }), { open: true });

  route('GET', '/api/topics/random', ({ user, query }) => {
    const { topicIds } = effectiveToday(user);
    return { topic: randomTopic(topicIds, adapter.availableTopics?.(), query.get('seed') || Date.now()) };
  });

  route('GET', '/api/topics/adventurous', ({ user, query }) => {
    const { profile: p } = effectiveToday(user);
    return adventurousTopic(p.topics, adapter.availableTopics?.(), query.get('seed') || Date.now()) || { topic: null };
  });

  // Change Daily — today only; the profile is untouched unless `keep` is set.
  route('PUT', '/api/today', async ({ user, body }) => {
    const ids = Array.isArray(body.topicIds) ? body.topicIds.filter((t) => typeof t === 'string').slice(0, 12) : [];
    if (!ids.length) store.setOverride(user, today(user), null);
    else store.setOverride(user, today(user), { topicIds: ids, reason: body.reason || 'changed', path: body.path || null });
    if (body.keep && ids.length) store.saveProfile(user, { ...profile(user), topics: ids });
    const edition = await todaysEdition(user);
    return { editionId: edition.id };
  });

  route('GET', '/api/today', async ({ user }) => {
    const ed = await todaysEdition(user);
    const sponsored = ed.stale ? null : pickSponsored({ store, user, plan: store.planOf(user), topicIds: ed.config?.topicIds || [], date: ed.editorialDate, editionId: ed.id });
    return { edition: ed, sponsored };
  });

  route('POST', '/api/today/regenerate', async ({ user }) => {
    const ed = await todaysEdition(user, { force: true });
    return { edition: ed };
  });

  route('GET', '/api/editions', ({ user }) => ({ editions: store.listEditions(user) }));
  // Sample previews are public; everything else needs the owner's session.
  route('GET', '/api/editions/:id', async ({ user, params }) => {
    const preview = params.id.match(PREVIEW_ID);
    if (!preview && !user) return { status: 401, error: 'Please log in.', auth: true };
    const ed = preview ? await previewEdition(preview[1], Number(preview[2])) : getOwned(user, params.id);
    return ed ? { edition: ed } : { status: 404, error: 'Edition not found' };
  }, { open: true });
  route('GET', '/api/editions/:id/ledger', ({ user, params }) => (owned(user, params.id) ? store.editionLedger(params.id) : { status: 404, error: 'Edition not found' }));
  route('GET', '/api/editions/:id/audio', ({ user, params, query }) => {
    const ed = getOwned(user, params.id);
    return ed ? audioPayload(ed, query.get('mode') === 'social' ? 'social' : 'business') : { status: 404, error: 'Edition not found' };
  });
  // The morning ping: hooks for push, email and WhatsApp, built from the stored edition.
  route('GET', '/api/editions/:id/hooks', ({ user, params, query }) => {
    const ed = getOwned(user, params.id);
    if (!ed?.hooks) return { status: 404, error: 'Edition not found' };
    const mode = query.get('mode') === 'social' ? 'social' : 'business';
    return { mode, pattern: ed.hooks.pattern, hooks: withLink(ed.hooks, `${BASE_URL}/#/read/${ed.id}?mode=${mode}`)[mode], sample: ed.sample, date: ed.editorialDate };
  });
  route('GET', '/api/hooks/sample', async ({ query }) => {
    const mode = query.get('mode') === 'social' ? 'social' : 'business';
    const ed = await previewEdition('multi', 10);
    return { mode, pattern: ed.hooks.pattern, hooks: withLink(ed.hooks, `${BASE_URL}/#/read/${ed.id}?mode=${mode}`)[mode], sample: ed.sample, date: ed.editorialDate, editionId: ed.id };
  }, { open: true });
  route('GET', '/email/:id', ({ user, params, query, res }) => {
    const ed = getOwned(user, params.id);
    if (!ed?.hooks) return { status: 404, error: 'Edition not found' };
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(renderEmailHtml({ edition: ed, mode: query.get('mode') === 'social' ? 'social' : 'business', baseUrl: BASE_URL }));
    return null;
  });
  route('POST', '/api/editions/:id/deliver', async ({ user, params, body }) => {
    const ed = getOwned(user, params.id);
    if (!ed) return { status: 404, error: 'Edition not found' };
    const p = profile(user);
    const channels = (body.channels?.length ? body.channels : p.delivery.channels).filter((c) => ['push', 'email', 'whatsapp'].includes(c));
    return { delivered: await deliver({ edition: ed, profile: { ...p, email: store.accountById(user)?.email }, baseUrl: BASE_URL, channels }) };
  });

  route('GET', '/api/previews', async ({ query }) => {
    const minutes = [5, 10, 20].includes(Number(query.get('minutes'))) ? Number(query.get('minutes')) : 10;
    const [single, multi] = [await previewEdition('single', minutes), await previewEdition('multi', minutes)];
    return { single, multi };
  }, { open: true });

  // PDF: cached per edition and mode.
  route('GET', '/api/editions/:id/pdf', async ({ user, params, query, res }) => {
    const mode = query.get('mode') === 'social' ? 'social' : 'business';
    const pm = params.id.match(PREVIEW_ID);
    const ed = pm ? await previewEdition(pm[1], Number(pm[2])) : getOwned(user, params.id);
    if (!ed) return { status: 404, error: 'Edition not found' };
    let file = store.getArtifact(ed.id, 'pdf', mode);
    if (!file) {
      try {
        file = await renderPdf({ url: `http://127.0.0.1:${PORT}/print/${ed.id}?mode=${mode}&k=${printToken(ed.id)}`, outFile: path.resolve(process.env.OC_DATA || 'data', 'artifacts', `${ed.id}-${mode}.pdf`) });
        store.putArtifact(ed.id, 'pdf', mode, file);
      } catch (err) {
        if (err.code === 'NO_CHROME') return { redirect: `/print/${ed.id}?mode=${mode}&autoprint=1&k=${printToken(ed.id)}` };
        throw err;
      }
    }
    if (query.get('download')) track(user, 'pdf_downloaded', { mode });
    const name = `over-coffee-${ed.editorialDate}-${mode}.pdf`;
    res.writeHead(200, { 'content-type': 'application/pdf', 'content-disposition': `${query.get('download') ? 'attachment' : 'inline'}; filename="${name}"` });
    fs.createReadStream(file).pipe(res);
    return null;
  });

  // Short links printed in the PDF lead back to the digital depth layer.
  route('GET', '/s/:ed/:st', ({ params, query }) => ({ redirect: `/#/story/${encodeURIComponent(params.ed)}/${encodeURIComponent(params.st)}?mode=${query.get('m') === 's' ? 'social' : 'business'}` }), { open: true });

  route('GET', '/print/:id', ({ user, params, query, res }) => {
    // Browser: owner session. PDF renderer: signed token.
    const ok = checkPrintToken(params.id, query.get('k')) || (user && owned(user, params.id));
    const ed = ok ? store.getEdition(params.id) : null;
    if (!ed) return { status: 404, error: 'Edition not found' };
    const mode = query.get('mode') === 'social' ? 'social' : 'business';
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(renderPrintDocument(ed, mode, { baseUrl: BASE_URL, autoprint: query.get('autoprint') === '1', paper: DEFAULT_PROFILE.pdf.paper }));
    return null;
  }, { open: true });

  // ── library: saved stories, past editions, relevance feedback ──
  const findStory = (user, body) => {
    const ed = PREVIEW_ID.test(String(body.editionId)) ? null : getOwned(user, String(body.editionId || ''));
    const story = ed?.stories.find((x) => x.id === body.storyId);
    return story ? { ed, story } : null;
  };
  route('POST', '/api/saved', ({ user, body }) => {
    const f = findStory(user, body);
    if (!f) return { status: 404, error: 'Story not found' };
    store.saveStory(user, f.ed.id, f.story.id, f.story.copy.business.headline, f.story.topicLabel);
    track(user, 'story_saved');
    return { ok: true };
  });
  route('DELETE', '/api/saved', ({ user, body }) => {
    store.unsaveStory(user, String(body.editionId || ''), String(body.storyId || ''));
    track(user, 'story_unsaved');
    return { ok: true };
  });
  route('GET', '/api/library', ({ user }) => ({ saved: store.listSaved(user), editions: store.listEditions(user, 60) }));
  route('POST', '/api/feedback', ({ user, body }) => {
    const f = findStory(user, body);
    if (!f || !['more', 'less', 'clear'].includes(body.signal)) return { status: 400, error: 'Bad feedback' };
    if (body.signal === 'clear') store.db.prepare('DELETE FROM feedback WHERE user_id = ? AND edition_id = ? AND story_id = ?').run(user, f.ed.id, f.story.id);
    else store.setFeedback(user, f.ed.id, f.story.id, f.story.topicId, f.story.subtopic || null, body.signal);
    track(user, 'feedback_given', { signal: body.signal });
    return { ok: true };
  });
  route('POST', '/api/personalisation/clear', ({ user }) => {
    store.clearPersonalisation(user);
    track(user, 'history_cleared');
    return { ok: true };
  });

  // ── sharing one story (public page + social card; never the personalised edition) ──
  const htmlOut = (res, status, body) => {
    res.writeHead(status, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(body);
    return null;
  };
  const shareFor = (token) => {
    const sh = store.getShare(String(token));
    if (!sh || sh.revoked) return null;
    const ed = store.getEdition(sh.editionId);
    const story = ed?.stories.find((x) => x.id === sh.storyId);
    return story ? { sh, ed, story } : null;
  };
  route('POST', '/api/share', ({ user, body }) => {
    const f = findStory(user, body);
    if (!f) return { status: 404, error: 'Story not found' };
    const token = crypto.randomBytes(9).toString('base64url');
    store.createShare(token, user, f.ed.id, f.story.id);
    track(user, 'share_created');
    return { token, url: `${BASE_URL}/share/${token}`, title: f.story.copy.business.headline };
  });
  route('DELETE', '/api/share', ({ user, body }) => ({ revoked: store.revokeShare(String(body.token || ''), user) }));
  route('GET', '/share/:token', ({ params, res }) => {
    const f = shareFor(params.token);
    if (!f) return htmlOut(res, 404, '<!doctype html><meta charset="utf-8"><title>Over Coffee</title><p style="font:18px system-ui;padding:40px">This shared story is no longer available. <a href="/">Over Coffee</a></p>');
    track(null, 'share_visited', { token: params.token.slice(0, 4) });
    return htmlOut(res, 200, renderSharePage({ edition: f.ed, story: f.story, baseUrl: BASE_URL, token: params.token }));
  }, { open: true });
  route('GET', '/share/:token/card', ({ params, res }) => {
    const f = shareFor(params.token);
    return f ? htmlOut(res, 200, renderShareCard({ edition: f.ed, story: f.story })) : htmlOut(res, 404, 'Not found');
  }, { open: true });
  route('GET', '/share/:token/card.png', async ({ params, res }) => {
    const f = shareFor(params.token);
    if (!f) return { status: 404, error: 'Not found' };
    const file = path.resolve(process.env.OC_DATA || 'data', 'artifacts', `share-${params.token}.png`);
    try {
      if (!fs.existsSync(file)) await renderPng({ url: `http://127.0.0.1:${PORT}/share/${params.token}/card`, outFile: file });
    } catch {
      return { redirect: '/assets/social-card.png' }; // no Chromium: fall back to the brand card
    }
    res.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400' });
    fs.createReadStream(file).pipe(res);
    return null;
  }, { open: true });

  // ── email: one-click unsubscribe (signed link, works without logging in) ──
  const unsubscribe = (u, t) => {
    if (!verifySigned('unsub', String(u), t) || !store.accountById(String(u))) return false;
    const p = profile(u);
    store.saveProfile(u, { ...p, delivery: { ...p.delivery, channels: (p.delivery.channels || []).filter((c) => c !== 'email'), emailUnsubscribedAt: new Date().toISOString() } });
    track(u, 'unsubscribed');
    return true;
  };
  const unsubPage = (title, body = '') => `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Over Coffee</title><link rel="stylesheet" href="/css/fonts.css"><body style="margin:0;background:#fbf8f3;font:18px/1.5 Geist,system-ui,sans-serif;color:#0a0b10"><main style="max-width:520px;margin:0 auto;padding:48px 24px"><h1 style="font:800 30px/1.1 'Bricolage Grotesque',sans-serif;letter-spacing:-.03em">${title}</h1>${body}</main>`;
  route('GET', '/unsubscribe', ({ query, res }) => {
    if (!verifySigned('unsub', query.get('u') || '', query.get('t'))) return htmlOut(res, 400, unsubPage('This link is not valid.'));
    return htmlOut(res, 200, unsubPage('Stop the daily email?', `<p>You can keep reading in the app, and turn email back on any time in Settings.</p><form method="post" action="/unsubscribe?u=${encodeURIComponent(query.get('u'))}&t=${encodeURIComponent(query.get('t'))}"><button style="font:650 16px sans-serif;padding:14px 26px;border-radius:999px;border:0;background:#0a0b10;color:#fff;cursor:pointer">Unsubscribe</button></form>`));
  }, { open: true });
  route('POST', '/unsubscribe', ({ query, res }) => {
    const ok = unsubscribe(query.get('u') || '', query.get('t'));
    return htmlOut(res, ok ? 200 : 400, ok ? unsubPage('You are unsubscribed.', '<p>No more daily emails. <a href="/">Back to Over Coffee</a></p>') : unsubPage('This link is not valid.'));
  }, { open: true });

  // ── web push ──
  route('GET', '/api/push/config', () => ({ enabled: pushConfigured(), publicKey: pushConfigured() ? process.env.VAPID_PUBLIC_KEY : null }), { open: true });
  route('POST', '/api/push/subscribe', ({ user, body }) => {
    const sub = body.subscription;
    let host = '';
    try { host = new URL(sub?.endpoint).protocol; } catch { /* invalid */ }
    if (!pushConfigured()) return { status: 501, error: 'Notifications are not available on this server.' };
    if (host !== 'https:' || !sub.keys?.p256dh || !sub.keys?.auth) return { status: 400, error: 'Invalid subscription.' };
    store.savePush(user, sub.endpoint, { p256dh: String(sub.keys.p256dh), auth: String(sub.keys.auth) });
    const p = profile(user);
    store.saveProfile(user, { ...p, delivery: { ...p.delivery, channels: [...new Set([...(p.delivery.channels || []), 'push'])] } });
    track(user, 'push_enabled');
    return { ok: true };
  });
  route('DELETE', '/api/push/subscribe', ({ user, body }) => {
    store.deletePush(String(body.endpoint || ''));
    if (!store.listPush(user).length) {
      const p = profile(user);
      store.saveProfile(user, { ...p, delivery: { ...p.delivery, channels: (p.delivery.channels || []).filter((c) => c !== 'push') } });
    }
    track(user, 'push_disabled');
    return { ok: true };
  });

  // ── sponsored click-through (logged, then redirected; only https targets of active campaigns) ──
  route('GET', '/ad/:id/click', ({ params, user, query }) => {
    const url = clickTarget(store, params.id);
    if (!url) return { status: 404, error: 'Not found' };
    track(user, 'ad_click', { id: params.id });
    return { redirect: url };
  }, { open: true });

  route('GET', '/newspaper-lab', () => ({ redirect: '/#/lab' }), { open: true });
  route('GET', '/healthz', () => ({ ok: true, version: ENGINE_VERSION, research: adapter.name, sample: !!adapter.sample, writer: process.env.OC_WRITER || 'extractive', pdf: !!findChrome() }), { open: true });
  // Launch signals for the owner: GET /api/admin/stats with header x-admin-token.
  route('GET', '/api/admin/stats', ({ req }) => {
    if (!process.env.OC_ADMIN_TOKEN || req.headers['x-admin-token'] !== process.env.OC_ADMIN_TOKEN) return { status: 404, error: 'Not found' };
    return { events: store.analyticsSummary(), deliveries: store.deliveryStats(), editions: store.editionStats() };
  }, { open: true });

  // Delivery scheduler: once a reader's delivery time passes in their own timezone,
  // generate today's edition and deliver it. Delivery is recorded per channel, so a
  // restart never double-sends, and a failed channel is retried (max 3 attempts).
  const MAX_ATTEMPTS = 3;
  async function tick() {
    for (const user of store.onboardedUsers()) {
      try {
        const p = profile(user);
        if (!p.onboarded) continue;
        const [h, m] = (p.delivery?.time || '06:00').split(':').map(Number);
        const local = new Date(new Date().toLocaleString('en-US', { timeZone: p.tz || 'UTC' }));
        if (local.getHours() * 60 + local.getMinutes() < h * 60 + m) continue;
        const subs = store.listPush(user);
        const wanted = (p.delivery?.channels || []).filter((c) => c === 'email' || (c === 'push' && subs.length && pushConfigured()));
        const day = today(user);
        const exists = store.latestEdition(user, day);
        const done = (ed) => wanted.every((c) => { const d = store.getDelivery(user, ed.id, c); return d && (['sent', 'outbox'].includes(d.status) || d.attempts >= MAX_ATTEMPTS); });
        if (exists && done(exists)) continue;
        // Bounded retries for generation too: three failed runs a day, then leave the last edition in place.
        if (!exists && store.failureCount(user, day) >= MAX_ATTEMPTS) continue;
        const ed = exists || (await todaysEdition(user));
        // Never announce an edition that is not today's, or one that failed quality entirely.
        if (ed.stale || ed.delivery?.status === 'held') continue;
        const pending = wanted.filter((c) => { const d = store.getDelivery(user, ed.id, c); return !d || (d.status === 'failed' && d.attempts < MAX_ATTEMPTS); });
        if (!pending.length) continue;
        const unsubUrl = `${BASE_URL}/unsubscribe?u=${encodeURIComponent(user)}&t=${unsubToken(user)}`;
        const results = await deliver({ edition: ed, profile: { ...p, email: store.accountById(user)?.email }, baseUrl: BASE_URL, channels: pending, unsubUrl, pushSubs: subs });
        for (const e of results.push?.gone || []) store.deletePush(e);
        for (const c of pending) store.recordDelivery(user, ed.id, c, results[c]?.error ? 'failed' : results[c]?.status === 'outbox' ? 'outbox' : 'sent', results[c]?.error || null);
      } catch (e) {
        console.error('[scheduler]', user, e.message);
      }
    }
  }

  async function handler(req, res) {
    const url = new URL(req.url, 'http://x');
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('referrer-policy', 'same-origin');
    res.setHeader('x-frame-options', 'SAMEORIGIN');
    if (SECURE) res.setHeader('strict-transport-security', 'max-age=31536000');
    try {
      for (const r of routes) {
        if (r.method !== req.method) continue;
        const m = url.pathname.match(r.re);
        if (!m) continue;
        const user = userFromRequest(store, req);
        if (!r.open && !user) {
          res.writeHead(401, { 'content-type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Please log in.', auth: true }));
        }
        const body = ['POST', 'PUT', 'DELETE'].includes(req.method) ? await readJson(req) : {};
        const out = await r.handler({ req, res, user, params: m.groups || {}, query: url.searchParams, body });
        if (out === null) return;
        if (out.redirect) {
          res.writeHead(302, { location: out.redirect });
          return res.end();
        }
        res.writeHead(out.status || 200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
        return res.end(JSON.stringify(out));
      }
      if (req.method === 'GET') return serveStatic(url.pathname, res);
      res.writeHead(405).end();
    } catch (err) {
      console.error(err);
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'Something went wrong preparing your edition.', detail: err.message }));
    }
  }

  return { handler, tick, store, todaysEdition, previewEdition, profile };
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon' };

function serveStatic(pathname, res) {
  const rel = pathname === '/' ? '/index.html' : decodeURIComponent(pathname);
  const file = path.resolve(WEB, '.' + rel);
  if (!file.startsWith(WEB) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    return res.end('Not found');
  }
  const ext = path.extname(file);
  res.writeHead(200, { 'content-type': TYPES[ext] || 'application/octet-stream', 'cache-control': ext === '.woff2' ? 'public, max-age=31536000' : 'no-cache' });
  fs.createReadStream(file).pipe(res);
}

function readJson(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 200_000) req.destroy();
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const app = createApp();
  http.createServer(app.handler).listen(PORT, HOST, () => {
    const writer = process.env.OC_WRITER === 'claude' && process.env.ANTHROPIC_API_KEY ? 'Claude' : 'extractive (no model)';
    console.log(`\n  OVER COFFEE  ·  ${BASE_URL}\n  Good morning. Here’s what matters.\n`);
    console.log(`  research: ${process.env.OC_RESEARCH || 'sample'} · writer: ${writer} · triage: ${process.env.ANTHROPIC_API_KEY ? 'model' : 'heuristic'} · email: ${process.env.RESEND_API_KEY ? 'Resend' : 'outbox files only'} · pdf: ${findChrome() ? 'ok' : 'no Chromium'}`);
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.OC_BASE_URL) console.warn('  ! OC_BASE_URL is not set: links in emails will point at localhost.');
      if (!process.env.ANTHROPIC_API_KEY) console.warn('  ! ANTHROPIC_API_KEY is not set: editions will use plain extractive copy.');
    }
  });
  setInterval(app.tick, 60_000);
}
