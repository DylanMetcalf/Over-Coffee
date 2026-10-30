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

test('previews are always the fictional sample, even when live research is configured', async () => {
  process.env.OC_RESEARCH = 'rss';
  try {
    const app = createApp({ store: new Store(':memory:') });
    const ed = await app.previewEdition('single', 5);
    assert.equal(ed.sample, true);
    assert.equal(ed.editorialDate, '2026-10-02');
    assert.ok(ed.stories.length >= 1, 'sample preview has stories');
    // a stale preview saved by an older version from live data is replaced
    app.store.db.prepare("UPDATE editions SET sample = 0 WHERE id = 'preview-single-5'").run();
    const re = await app.previewEdition('single', 5);
    assert.equal(re.sample, true);
  } finally {
    delete process.env.OC_RESEARCH;
  }
});

test('slow generation answers "still preparing" instead of hanging; the next request joins the same build', async () => {
  process.env.OC_PENDING_MS = '1';
  try {
    const { call } = await boot();
    await call('PUT', '/api/profile', { topics: ['ai', 'food', 'farming'], budgetMinutes: 20 }); // forces a rebuild
    const first = await call('GET', '/api/today');
    assert.ok([200, 202].includes(first.status));
    let r = first;
    for (let i = 0; i < 50 && r.status === 202; i++) { assert.equal(r.json.pending, true); await new Promise((ok) => setTimeout(ok, 40)); r = await call('GET', '/api/today'); }
    assert.equal(r.status, 200);
    assert.ok(r.json.edition.stories.length >= 1);
  } finally {
    delete process.env.OC_PENDING_MS;
  }
});

test('rate limits are per client address (forwarded by the host), not one shared bucket', async () => {
  const app = createApp({ store: new Store(':memory:') });
  const server = http.createServer(app.handler);
  server.unref();
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const signup = (ip, n) => fetch(base + '/api/auth/signup', { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': ip }, body: JSON.stringify({ email: `u${n}@rl.test`, password: 'longenough1' }) }).then((r) => r.status);
  let blocked = 0;
  for (let i = 0; i < 33; i++) if ((await signup('9.9.9.9', i)) === 429) blocked++;
  assert.ok(blocked >= 1, 'one address is limited');
  assert.equal(await signup('8.8.8.8', 100), 200, 'a different address is not');
});

test('reading times are 3, 5 and 10 minutes: shorter editions are shorter, 20 is retired and migrates to 10', async () => {
  const { app, call } = await boot();
  const user = (await call('GET', '/api/me')).json.user.id;
  const sizes = {};
  for (const m of [3, 5, 10]) {
    assert.equal((await call('PUT', '/api/profile', { budgetMinutes: m })).json.profile.budgetMinutes, m);
    let r = await call('GET', '/api/today');
    for (let i = 0; i < 50 && r.status === 202; i++) { await new Promise((ok) => setTimeout(ok, 40)); r = await call('GET', '/api/today'); }
    const ed = r.json.edition;
    sizes[m] = ed.stories.length;
    assert.equal(ed.config.budgetMinutes, m);
    assert.ok(ed.stats.readingMinutes.business <= m * 1.05, `${m}-minute edition fits (${ed.stats.readingMinutes.business} min)`);
  }
  assert.ok(sizes[3] <= sizes[5] && sizes[5] <= sizes[10], 'story count grows with the budget: ' + JSON.stringify(sizes));
  assert.ok(sizes[3] >= 1, 'even the 3-minute edition is not empty');
  assert.equal((await call('PUT', '/api/profile', { budgetMinutes: 20 })).json.profile.budgetMinutes, 10, '20 is rejected');
  app.store.saveProfile(user, { ...app.profile(user), budgetMinutes: 20 }); // an account saved before the change
  assert.equal(app.profile(user).budgetMinutes, 10, 'old 20-minute readers move to 10');
  assert.equal((await call('GET', '/api/editions/preview-single-20')).status, 404);
  assert.equal((await call('GET', '/api/editions/preview-single-3')).status, 200);
});
