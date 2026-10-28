import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Store } from '../server/store.js';
import { createApp } from '../server/index.js';
import { hashPassword, verifyPassword } from '../server/auth.js';
import { claudeTriage } from '../server/engine/live-analyst.js';
import { suggestAreas } from '../server/engine/suggest.js';
import { interpretInterest } from '../server/engine/topics.js';

process.env.OC_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-test-'));

async function serve() {
  const app = createApp({ store: new Store(':memory:') });
  const server = http.createServer(app.handler);
  server.unref();
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const client = () => {
    let cookie = '';
    return async (method, url, body) => {
      const res = await fetch(base + url, { method, headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined, redirect: 'manual' });
      const set = res.headers.getSetCookie?.()[0];
      if (set) cookie = set.split(';')[0];
      return { status: res.status, json: await res.json().catch(() => null) };
    };
  };
  return { app, server, client };
}

test('passwords are salted scrypt hashes and verify correctly', () => {
  const h = hashPassword('correct horse');
  assert.ok(h.startsWith('scrypt$'));
  assert.notEqual(h, hashPassword('correct horse'));
  assert.ok(verifyPassword('correct horse', h));
  assert.ok(!verifyPassword('wrong', h));
});

test('accounts: signup, session, logout, bad login; app routes need a session', async () => {
  const { server, client } = await serve();
  const a = client();
  assert.equal((await a('GET', '/api/me')).status, 401);
  assert.equal((await a('POST', '/api/auth/signup', { email: 'a@x.com', password: 'short' })).status, 400);
  assert.equal((await a('POST', '/api/auth/signup', { email: 'a@x.com', password: 'longenough1' })).status, 200);
  assert.equal((await a('POST', '/api/auth/signup', { email: 'A@x.com', password: 'longenough1' })).status, 409);
  assert.equal((await a('GET', '/api/me')).status, 200);
  await a('POST', '/api/auth/logout');
  assert.equal((await a('GET', '/api/me')).status, 401);
  assert.equal((await a('POST', '/api/auth/login', { email: 'a@x.com', password: 'nope' })).status, 401);
  assert.equal((await a('POST', '/api/auth/login', { email: 'a@x.com', password: 'longenough1' })).status, 200);
  server.close();
});

test('isolation: one reader cannot read, print or export another reader\'s edition', async () => {
  const { server, client } = await serve();
  const a = client(), b = client();
  await a('POST', '/api/auth/signup', { email: 'a@x.com', password: 'longenough1' });
  await b('POST', '/api/auth/signup', { email: 'b@x.com', password: 'longenough1' });
  await a('PUT', '/api/profile', { onboarded: true, topics: ['ai'] });
  const id = (await a('GET', '/api/today')).json.edition.id;
  assert.equal((await a('GET', `/api/editions/${id}`)).status, 200);
  for (const url of [`/api/editions/${id}`, `/api/editions/${id}/ledger`, `/api/editions/${id}/hooks`, `/print/${id}`, `/email/${id}`]) {
    assert.equal((await b('GET', url)).status, 404, url);
  }
  assert.deepEqual((await b('GET', '/api/me')).json.profile.topics, ['ai', 'food', 'farming']);
  assert.equal((await client()('GET', '/api/editions/preview-single-5')).status, 200, 'sample previews are public');
  server.close();
});

test('model triage groups articles, drops unsupported sources and downgrades single-source facts', async () => {
  const articles = [
    { id: 'a1', title: 'Acme cuts prices', publisher: 'Wire', publishedAt: '2026-10-07T05:00:00Z', excerpt: 'Acme cut prices by 20%.', matchedTopics: ['ai'] },
    { id: 'a2', title: 'Acme price cut', publisher: 'Daily', publishedAt: '2026-10-07T06:00:00Z', excerpt: 'Acme lowered prices.', matchedTopics: ['ai'] },
  ];
  const client = { messages: { create: async () => ({ content: [{ type: 'text', text: JSON.stringify({ events: [{ articleIds: ['a1', 'a2', 'zzz'], label: 'Acme price cut', subtopic: 'Pricing', topic: 'ai', impact: 0.7, breadth: 0.5, novelty: 0.6, claims: [{ text: 'Acme cut prices by 20%.', kind: 'fact', sources: ['a1'] }, { text: 'Invented.', kind: 'fact', sources: ['nope'] }] }] }) }] }) } };
  const clusters = await claudeTriage({ articles, topics: [{ id: 'ai', name: 'AI' }], client });
  assert.equal(clusters.length, 1);
  assert.deepEqual(clusters[0].articleIds, ['a1', 'a2']);
  const claims = clusters[0].preAnalysis.claims;
  assert.equal(claims.length, 1, 'claim citing unknown source is dropped');
  assert.equal(claims[0].kind, 'reported', 'single-source fact is downgraded to reported');
});

test('topic suggestions: model areas are cleaned; failure falls back without breaking onboarding', async () => {
  const topic = interpretInterest('hazardous area electrical');
  const good = { messages: { create: async () => ({ content: [{ type: 'text', text: JSON.stringify({ areas: ['Explosion protection', 'Explosion protection', 'Zone classification', 'IEC 60079'] }) }] }) } };
  assert.deepEqual((await suggestAreas({ topic, client: good })).areas, ['Explosion protection', 'Zone classification', 'IEC 60079']);
  const bad = { messages: { create: async () => { throw new Error('boom'); } } };
  const out = await suggestAreas({ topic, client: bad });
  assert.equal(out.source, 'none');
});

test('delivery is recorded per channel so a restart never double-sends', async () => {
  const store = new Store(':memory:');
  store.ensureUser('u', 'u');
  assert.equal(store.getDelivery('u', 'ed1', 'email'), null);
  store.recordDelivery('u', 'ed1', 'email', 'failed', 'timeout');
  store.recordDelivery('u', 'ed1', 'email', 'sent');
  const d = store.getDelivery('u', 'ed1', 'email');
  assert.equal(d.status, 'sent');
  assert.equal(d.attempts, 2);
});

test('scheduler prepares and delivers once, retries a failed channel, and never double-sends', async () => {
  const { app, server, client } = await serve();
  const a = client();
  await a('POST', '/api/auth/signup', { email: 's@x.com', password: 'longenough1', tz: 'UTC' });
  await a('PUT', '/api/profile', { onboarded: true, topics: ['ai'], delivery: { time: '00:00', channels: ['email'] } });
  const user = (await a('GET', '/api/me')).json.user.id;
  await app.tick();
  const ed = app.store.latestEdition(user, app.store.latestEdition(user, (await a('GET', '/api/me')).json.today).editorialDate);
  const first = app.store.getDelivery(user, ed.id, 'email');
  assert.ok(first && ['sent', 'outbox'].includes(first.status), 'delivered on first tick');
  await app.tick();
  assert.equal(app.store.getDelivery(user, ed.id, 'email').attempts, 1, 'second tick does not resend');
  // a failed channel is retried, but only up to the cap
  app.store.recordDelivery(user, ed.id, 'email', 'failed', 'provider timeout');
  await app.tick();
  assert.equal(app.store.getDelivery(user, ed.id, 'email').status, 'outbox', 'failed channel was retried');
  const attempts = app.store.getDelivery(user, ed.id, 'email').attempts;
  app.store.recordDelivery(user, ed.id, 'email', 'failed', 'again');
  app.store.recordDelivery(user, ed.id, 'email', 'failed', 'again');
  await app.tick();
  assert.equal(app.store.getDelivery(user, ed.id, 'email').attempts, attempts + 2, 'no retry beyond the attempt cap');
  server.close();
});
