import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalUrl, independentOrigins, classify, fingerprint } from '../server/engine/memory.js';
import { claimStatus } from '../server/engine/verify.js';
import { Store } from '../server/store.js';

const src = (id, publisher, title, url) => ({ id, publisher, title, url, credibility: { score: 0.85, primary: false } });
const ev = (sources, claims, signals = { impact: 0.5, novelty: 0.5 }) => ({ sources, claims, signals });

test('canonical URLs ignore tracking, www, fragments and trailing slashes', () => {
  assert.equal(canonicalUrl('https://www.Example.com/a/b/?utm_source=x&id=2#top'), canonicalUrl('http://example.com/a/b?id=2&fbclid=9'));
  assert.notEqual(canonicalUrl('https://example.com/a'), canonicalUrl('https://example.com/b'));
});

test('syndicated copies and one outlet\'s repeats are one origin, not corroboration', () => {
  const a = src('1', 'The Verge', 'Anthropic says Haiku 5.5 is its fastest model - The Verge', 'https://theverge.com/x');
  const b = src('2', 'The Verge on MSN', 'Anthropic says Haiku 5.5 is its fastest model', 'https://msn.com/x');
  const c = src('3', 'Reuters', 'Anthropic launches faster Haiku model', 'https://reuters.com/y');
  assert.equal(independentOrigins([a, b]), 1);
  assert.equal(independentOrigins([a, c]), 2);
  const by = (list) => new Map(list.map((s) => [s.id, s]));
  assert.equal(claimStatus({ kind: 'fact', sources: ['1', '2'] }, by([a, b])).status, 'reported');
  assert.equal(claimStatus({ kind: 'fact', sources: ['1', '3'] }, by([a, c])).status, 'confirmed');
});

test('memory: new, duplicate, development and recurring are told apart', () => {
  const s1 = src('1', 'Wire', 'Acme cuts prices on cloud AI models by sixty percent', 'https://wire.com/acme');
  const first = ev([s1], [{ text: 'Acme cut prices by 60%.' }]);
  const memory = [{ key: 'k1', lastDate: '2026-10-01', headline: 'Acme cuts prices', fp: fingerprint(first) }];
  assert.equal(classify(ev([src('9', 'Other', 'Quantum chip breakthrough announced', 'https://o.com/q')], [{ text: 'x' }]), memory, { today: '2026-10-02' }).kind, 'new');
  assert.equal(classify(first, memory, { today: '2026-10-02' }).kind, 'duplicate', 'same URL again');
  const dev = ev(
    [s1, src('2', 'Reuters', 'Acme price cut: rivals respond to cloud AI prices decision', 'https://reuters.com/acme2')],
    [{ text: 'Acme cut prices by 60%.' }, { text: 'Two rivals announced matching cuts.' }],
  );
  const d = classify(dev, memory, { today: '2026-10-02' });
  assert.equal(d.kind, 'development');
  assert.deepEqual(d.changes, ['Two rivals announced matching cuts.']);
  const more = ev([s1, src('3', 'Blog', 'Acme cuts cloud AI model prices sixty percent explained', 'https://blog.com/acme')], [{ text: 'Acme cut prices by 60%.' }]);
  assert.equal(classify(more, memory, { today: '2026-10-02' }).kind, 'recurring', 'more coverage, no new facts');
  assert.equal(classify({ ...more, signals: { impact: 0.9, novelty: 0.4 } }, memory, { today: '2026-10-02' }).continuing, true, 'important continuing story is kept');
  assert.equal(classify(first, memory, { today: '2026-10-01' }).kind, 'new', 'regenerating the same day never self-suppresses');
});

test('feedback nudges relevance and can be cleared; saved stories round-trip', () => {
  const store = new Store(':memory:');
  store.ensureUser('u', 'u');
  store.setFeedback('u', 'e1', 's1', 'ai', 'Pricing', 'more');
  store.setFeedback('u', 'e1', 's2', 'ai', 'Chips', 'less');
  store.setFeedback('u', 'e1', 's3', 'food', null, 'less');
  assert.deepEqual(store.affinity('u'), { topics: { ai: 0, food: -1 }, subtopics: { Pricing: 1, Chips: -1 } });
  store.saveStory('u', 'e1', 's1', 'H', 'ai');
  assert.equal(store.listSaved('u').length, 1);
  store.unsaveStory('u', 'e1', 's1');
  assert.equal(store.listSaved('u').length, 0);
  store.upsertMemory('u', 'k', '2026-10-01', 'H', { urls: [], tokens: [], families: [], claims: [] });
  store.clearPersonalisation('u');
  assert.equal(store.listMemory('u').length + store.feedbackFor('u').length, 0);
});
