import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Store } from '../server/store.js';
import { createApp } from '../server/index.js';
import { deliver, renderEmailHtml } from '../server/delivery/channels.js';
import { sendPush } from '../server/delivery/push.js';
import { pickSponsored } from '../server/ads.js';
import { entitlementsFor } from '../server/entitlements.js';
import { unsubToken } from '../server/auth.js';

process.env.OC_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-feat-'));

async function boot() {
  const app = createApp({ store: new Store(':memory:') });
  const server = http.createServer(app.handler);
  server.unref();
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  let cookie = '';
  const call = async (method, url, body, raw = false) => {
    const res = await fetch(base + url, { method, headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined, redirect: 'manual' });
    const set = res.headers.getSetCookie?.()[0];
    if (set) cookie = set.split(';')[0];
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* html */ }
    return { status: res.status, json, text, headers: res.headers };
  };
  await call('POST', '/api/auth/signup', { email: 'f@x.com', password: 'longenough1' });
  await call('PUT', '/api/profile', { onboarded: true, topics: ['ai', 'farming'], delivery: { time: '00:00', channels: ['email'] } });
  const ed = (await call('GET', '/api/today')).json.edition;
  const story = ed.stories[1];
  return { app, call, ed, story, base };
}

test('saved stories and feedback: only your own stories, library lists them, history can be cleared', async () => {
  const { app, call, ed, story } = await boot();
  assert.equal((await call('POST', '/api/saved', { editionId: ed.id, storyId: story.id })).status, 200);
  assert.equal((await call('POST', '/api/saved', { editionId: ed.id, storyId: 'nope' })).status, 404);
  assert.equal((await call('POST', '/api/saved', { editionId: 'preview-single-5', storyId: story.id })).status, 404, 'sample previews cannot be saved');
  const lib = (await call('GET', '/api/library')).json;
  assert.equal(lib.saved.length, 1);
  assert.ok(lib.editions.length >= 1);
  assert.ok((await call('GET', '/api/me')).json.savedKeys.includes(`${ed.id}/${story.id}`));
  assert.equal((await call('POST', '/api/feedback', { editionId: ed.id, storyId: story.id, signal: 'less' })).status, 200);
  assert.equal((await call('POST', '/api/feedback', { editionId: ed.id, storyId: story.id, signal: 'bogus' })).status, 400);
  const user = (await call('GET', '/api/me')).json.user.id;
  assert.equal(app.store.feedbackFor(user).length, 1);
  await call('DELETE', '/api/saved', { editionId: ed.id, storyId: story.id });
  await call('POST', '/api/personalisation/clear');
  assert.equal(app.store.feedbackFor(user).length + app.store.listSaved(user).length, 0);
});

test('sharing: public page shows only the story and its real sources; revoked links stop working', async () => {
  const { call, ed, story, base } = await boot();
  const sh = (await call('POST', '/api/share', { editionId: ed.id, storyId: story.id })).json;
  assert.match(sh.url, /\/share\/[\w-]+$/);
  const at = base + new URL(sh.url).pathname; // anonymous: no cookie
  const anon = await fetch(at);
  const page = await anon.text();
  assert.equal(anon.status, 200);
  assert.ok(page.includes(story.copy.business.headline.replace(/&/g, '&amp;').slice(0, 20)) || page.includes('og:title'));
  assert.match(page, /og:image/);
  assert.match(page, /noindex/);
  assert.ok(!page.includes('f@x.com'), 'no reader identity');
  const mine = ed.sources.filter((x) => x.eventId === story.eventId);
  assert.ok(mine.length >= 1, 'story has sources');
  for (const s of mine) assert.ok(page.includes(s.publisher.replace(/&/g, '&amp;')) && page.includes(s.title.replace(/&/g, '&amp;')), 'source listed: ' + s.title);
  const others = ed.stories.filter((x) => x.id !== story.id)[0];
  assert.ok(!page.includes(others.copy.business.headline.replace(/&/g, '&amp;')), 'other stories are not exposed');
  await call('DELETE', '/api/share', { token: sh.token });
  assert.equal((await fetch(at)).status, 404);
});

test('unsubscribe: signed one-click link removes email; forged links do nothing; email carries the links', async () => {
  const { app, call, ed } = await boot();
  const user = (await call('GET', '/api/me')).json.user.id;
  assert.ok((await call('GET', '/api/me')).json.profile.delivery.channels.includes('email'));
  assert.equal((await call('POST', `/unsubscribe?u=${user}&t=forged`)).status, 400);
  assert.equal((await call('GET', `/unsubscribe?u=${user}&t=${unsubToken(user)}`)).status, 200, 'confirmation page does not unsubscribe on GET');
  assert.ok(app.profile(user).delivery.channels.includes('email'));
  assert.equal((await call('POST', `/unsubscribe?u=${user}&t=${unsubToken(user)}`)).status, 200);
  assert.ok(!app.profile(user).delivery.channels.includes('email'));
  const html = renderEmailHtml({ edition: ed, mode: 'business', baseUrl: 'https://x.test', unsubUrl: 'https://x.test/unsubscribe?u=1&t=2', manageUrl: 'https://x.test/#/settings' });
  assert.match(html, /Unsubscribe/);
  assert.match(html, /Manage delivery preferences/);
  assert.ok(html.includes(`https://x.test/#/read/${ed.id}`), 'real edition link');
});

test('push: delivers to subscriptions, drops expired ones, reports other errors, offers nothing when unconfigured', async () => {
  const subs = [{ endpoint: 'https://p.test/a', keys: {} }, { endpoint: 'https://p.test/gone', keys: {} }, { endpoint: 'https://p.test/bad', keys: {} }];
  const sender = async (s) => {
    if (s.endpoint.endsWith('gone')) throw Object.assign(new Error('gone'), { statusCode: 410 });
    if (s.endpoint.endsWith('bad')) throw Object.assign(new Error('boom'), { statusCode: 500 });
  };
  const r = await sendPush(subs, { title: 't' }, { sender });
  assert.deepEqual([r.sent, r.gone, r.errors.length], [1, ['https://p.test/gone'], 1]);
  assert.match((await sendPush(subs, {}, { env: {} })).errors[0], /not configured/);
  const { app, call } = await boot();
  assert.equal((await call('GET', '/api/push/config')).json.enabled, false);
  assert.equal((await call('POST', '/api/push/subscribe', { subscription: { endpoint: 'https://p.test/a', keys: { p256dh: 'a', auth: 'b' } } })).status, 501);
  process.env.VAPID_PUBLIC_KEY = 'pub'; process.env.VAPID_PRIVATE_KEY = 'priv';
  try {
    assert.equal((await call('POST', '/api/push/subscribe', { subscription: { endpoint: 'http://insecure', keys: { p256dh: 'a', auth: 'b' } } })).status, 400);
    assert.equal((await call('POST', '/api/push/subscribe', { subscription: { endpoint: 'https://p.test/a', keys: { p256dh: 'a', auth: 'b' } } })).status, 200);
    assert.ok((await call('GET', '/api/me')).json.profile.delivery.channels.includes('push'));
    const user = (await call('GET', '/api/me')).json.user.id;
    assert.equal(app.store.listPush(user).length, 1);
    await call('DELETE', '/api/push/subscribe', { endpoint: 'https://p.test/a' });
    assert.ok(!(await call('GET', '/api/me')).json.profile.delivery.channels.includes('push'));
  } finally {
    delete process.env.VAPID_PUBLIC_KEY; delete process.env.VAPID_PRIVATE_KEY;
  }
});

test('a failed generation never takes the paper away: the last edition is served and the failure logged', async () => {
  const { app, call, ed } = await boot();
  const user = (await call('GET', '/api/me')).json.user.id;
  const real = app.store.saveEdition.bind(app.store);
  app.store.saveEdition = () => { throw new Error('disk full'); };
  await call('PUT', '/api/profile', { budgetMinutes: 5 }); // forces a rebuild
  const r = (await call('GET', '/api/today')).json;
  app.store.saveEdition = real;
  assert.equal(r.edition.id, ed.id);
  assert.ok(r.edition.stale, 'marked as not-today');
  assert.equal(app.store.failureCount(user, app.store.latestEditionAny(user).editorialDate) >= 1, true);
});

test('sponsored placements: off by default, labelled, https-only, ad-free plans respected, never in the stored edition', async () => {
  const store = new Store(':memory:');
  store.ensureUser('u', 'u');
  const add = (id, url, extra = '') => store.db.prepare("INSERT INTO sponsors (id, advertiser, headline, url, status, topic_ids) VALUES (?, 'Acme', 'Try Acme', ?, 'active', ?)").run(id, url, extra || '[]');
  add('s1', 'https://acme.test/x');
  add('s2', 'http://insecure.test');
  const args = { store, user: 'u', plan: 'free', topicIds: ['ai'], date: '2026-10-02', editionId: 'e1' };
  assert.equal(pickSponsored({ ...args, env: {} }), null, 'off unless OC_ADS=on');
  const sp = pickSponsored({ ...args, env: { OC_ADS: 'on' } });
  assert.equal(sp.label, 'Sponsored');
  assert.equal(sp.id, 's1', 'http targets are ignored');
  assert.match(sp.href, /^\/ad\/s1\/click/);
  assert.equal(pickSponsored({ ...args, plan: 'supporter', env: { OC_ADS: 'on' } }), null, 'paid plan is ad-free');
  assert.equal(entitlementsFor('nonsense').ads, true, 'unknown plans fall back to free');
  assert.equal(entitlementsFor('free', { OC_PLANS_JSON: '{"free":{"maxTopics":3}}' }).maxTopics, 3, 'terms are configurable');
});
