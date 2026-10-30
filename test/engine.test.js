import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../server/store.js';
import { runPipeline } from '../server/engine/pipeline.js';
import { clusterArticles } from '../server/engine/cluster.js';
import { runQualityGate } from '../server/engine/quality.js';
import { interpretInterest, adventurousTopic, randomTopic } from '../server/engine/topics.js';
import { SAMPLE_ARTICLES, EXPECTED_CLUSTERS, SAMPLE_EDITION_DATE } from '../server/data/sample-corpus.js';
import { renderNewspaper } from '../web/js/render/newspaper.js';
import { renderStory } from '../web/js/render/story.js';

const DATE = SAMPLE_EDITION_DATE;
const run = (store, topicIds, budgetMinutes) => runPipeline({ store, userId: 'u', topicIds, budgetMinutes, date: DATE });

test('clustering turns duplicate reporting into one event per development', () => {
  const clusters = clusterArticles(SAMPLE_ARTICLES);
  const got = clusters.map((c) => [...c.articleIds].sort().join(',')).sort();
  const want = Object.values(EXPECTED_CLUSTERS).map((ids) => [...ids].sort().join(',')).sort();
  assert.deepEqual(got, want);
});

test('every sample edition passes the quality gate', async () => {
  const store = new Store(':memory:');
  for (const topics of [['ai'], ['ai', 'food', 'farming'], ['robotics', 'manufacturing'], ['football']])
    for (const m of [3, 5, 10]) {
      const ed = await run(store, topics, m);
      assert.equal(ed.quality.status, 'pass', `${topics} ${m}: ${JSON.stringify(ed.quality.checks.filter((c) => c.status !== 'pass'))}`);
    }
});

test('reading time is a budget, not a quota: no padding, longer budgets never drop stories', async () => {
  const store = new Store(':memory:');
  const counts = [];
  for (const m of [3, 5, 10]) {
    const ed = await run(store, ['ai', 'food', 'farming'], m);
    assert.ok(ed.stats.readingMinutes.business <= m, 'within budget');
    for (const e of ed.events.filter((e) => e.decision.status === 'published')) assert.ok(e.score.total >= ed.editorial.bar);
    counts.push(ed.stories.length);
  }
  assert.ok(counts[0] <= counts[1] && counts[1] <= counts[2]);
  // Even the 10-minute edition leaves budget unused rather than publishing below the bar.
  const ed20 = await run(store, ['ai', 'food', 'farming'], 20);
  assert.ok(ed20.stats.readingMinutes.business < 20);
  assert.ok(ed20.events.some((e) => e.decision.status === 'held'));
});

test('multi-topic editions are not split evenly; the lead can come from any topic', async () => {
  const ed = await run(new Store(':memory:'), ['ai', 'food', 'farming'], 10);
  const per = Object.fromEntries(ed.sections.map((s) => [s.topicId, s.storyIds.length + (ed.leadTopicId === s.topicId ? 1 : 0)]));
  assert.notEqual(per.ai, per.food);
  assert.equal(ed.leadTopicId, 'farming');
});

test('quiet topics are acknowledged, never filled', async () => {
  const ed = await run(new Store(':memory:'), ['ai', 'food', 'farming'], 5);
  const food = ed.sections.find((s) => s.topicId === 'food');
  assert.equal(food.storyIds.length, 0);
  assert.match(food.quiet, /Nothing in Food cleared/);
  const none = await run(new Store(':memory:'), ['football'], 10);
  assert.equal(none.stories.length, 0);
  assert.match(renderNewspaper(none, 'business'), /A quiet morning/);
});

test('one event, one story — including events that span two of the reader’s topics', async () => {
  const ed = await run(new Store(':memory:'), ['ai', 'food', 'farming'], 20);
  const weather = ed.stories.filter((s) => s.eventId === 'ev-ai-weather-model');
  assert.equal(weather.length, 1);
  assert.deepEqual(weather[0].alsoIn, ['AI']);
});

test('verification derives status from sources, never from the writer', async () => {
  const ed = await run(new Store(':memory:'), ['ai', 'food', 'farming'], 20);
  const claim = (ev, id) => ed.events.find((e) => e.key === ev).claims.find((c) => c.id === id);
  assert.equal(claim('ai-kestrel-4', 'price').status, 'confirmed');
  assert.equal(claim('ai-kestrel-4', 'bench').status, 'reported'); // company's own benchmark
  assert.equal(claim('ai-weather-model', 'skill').status, 'emerging'); // preprint
  assert.equal(claim('food-fermentation', 'parity').status, 'uncertain'); // contested
  assert.equal(claim('ai-tessel-funding', 'valuation').status, 'reported'); // anonymous sourcing
  assert.equal(claim('ai-kestrel-4', 'rivals').status, 'interpreted');
});

test('sensational, low-consequence developments are rejected with a reason', async () => {
  const ed = await run(new Store(':memory:'), ['ai'], 20);
  const dd = ed.events.find((e) => e.key === 'ai-deepfake-ad');
  assert.equal(dd.decision.status, 'rejected');
  assert.ok(dd.decision.reason.length > 10);
});

test('the quality gate catches fabricated figures, altered quotes, clickbait and hidden uncertainty', async () => {
  const ed = await run(new Store(':memory:'), ['ai'], 10);
  const bad = structuredClone(ed);
  const st = bad.stories.find((s) => s.id === 'st-ai-kestrel-4');
  st.copy.social.body[0] += ' Usage grew 340% overnight!';
  st.copy.business.headline = 'You won’t believe Kestrel’s game-changer';
  st.depth.saying[0].quote = 'We have solved intelligence.';
  bad.stories.find((s) => s.id === 'st-ai-weather-model').copy.business.body = ['A learned model beats physics forecasts on 87% of variables.'];
  bad.stories.find((s) => s.id === 'st-ai-weather-model').copy.business.why = 'It is better.';
  bad.stories.find((s) => s.id === 'st-ai-weather-model').copy.business.headline = 'Learned model beats physics';
  bad.stories.find((s) => s.id === 'st-ai-weather-model').copy.business.dek = 'The model is better.';
  bad.stories.find((s) => s.id === 'st-ai-weather-model').copy.business.next = 'More tests.';
  const q = runQualityGate(bad);
  const failed = q.checks.filter((c) => c.status === 'fail').map((c) => c.id);
  assert.equal(q.status, 'fail');
  for (const id of ['figures', 'quotes', 'language', 'uncertainty']) assert.ok(failed.includes(id), `${id} should fail: ${failed}`);
});

test('Business and Social are renderings of the same stored edition', async () => {
  const ed = await run(new Store(':memory:'), ['ai', 'food', 'farming'], 10);
  const b = renderNewspaper(ed, 'business');
  const s = renderNewspaper(ed, 'social');
  for (const st of ed.stories) {
    assert.ok(b.includes(`id="${st.id}"`) && s.includes(`id="${st.id}"`));
  }
  assert.match(b, /Learn more/);
  assert.match(s, /Tell me more/);
  assert.match(renderStory(ed, ed.stories[0].id, 'business'), /Sources &amp; further reading/);
});

test('research is cached and reused across editions', async () => {
  const store = new Store(':memory:');
  const first = await run(store, ['ai', 'farming'], 10);
  const second = await run(store, ['ai', 'food'], 10);
  assert.deepEqual(first.research.cache.hits, []);
  assert.deepEqual(second.research.cache.hits, ['ai']);
  assert.deepEqual(second.research.cache.misses, ['food']);
});

test('editions are persisted and auditable through normalised tables', async () => {
  const store = new Store(':memory:');
  const ed = await run(store, ['ai'], 10);
  assert.equal(store.getEdition(ed.id).id, ed.id);
  const ledger = store.editionLedger(ed.id);
  assert.equal(ledger.events.length, ed.events.length);
  assert.ok(ledger.claimsByStatus.some((r) => r.status === 'confirmed'));
});

test('interests are understood in plain language, and discovery stays adjacent', () => {
  assert.equal(interpretInterest('artificial intelligence').id, 'ai');
  assert.equal(interpretInterest('agriculture').id, 'farming');
  assert.equal(interpretInterest('farmng').id, 'farming');
  assert.equal(interpretInterest('solar power').id, 'renewable-energy');
  const custom = interpretInterest('Hazardous areas');
  assert.ok(custom.custom && custom.expansion.length);
  const adv = adventurousTopic(['ai'], null, 1);
  assert.equal(adv.path[0], 'AI');
  assert.ok(adv.path.length >= 2 && adv.topic.id !== 'ai');
  const r = randomTopic(['ai', 'food'], new Set(['ai', 'food', 'robotics']), 7);
  assert.equal(r.id, 'robotics');
});
