// 04 — RESEARCH
//
// Research adapters return raw articles. Results are cached per adapter, per
// topic, per editorial date, so two readers who both follow AI share one
// research pass, and re-rendering an edition never re-researches.

import { SampleResearchAdapter } from './sample.js';
import { RssResearchAdapter } from './rss.js';

export function createResearchAdapter(name = process.env.OC_RESEARCH || 'sample') {
  if (name === 'rss') return new RssResearchAdapter();
  return new SampleResearchAdapter();
}

/**
 * Research a set of topics, using the store's research cache.
 * @returns {{articles: object[], cache: {hits: string[], misses: string[]}, adapter: string}}
 */
export async function researchTopics({ adapter, topics, date, store }) {
  const hits = [];
  const misses = [];
  const seen = new Map();
  for (const topic of topics) {
    const key = `${adapter.name}:${date}:${topic.id}${topic.focused ? ':' + topic.expansion.join('|').toLowerCase() : ''}`;
    let articles = store?.getResearchCache(key);
    if (articles) hits.push(topic.id);
    else {
      articles = await adapter.search(topic, date);
      store?.putResearchCache(key, adapter.name, articles);
      misses.push(topic.id);
    }
    for (const a of articles) {
      const prev = seen.get(a.id);
      if (prev) prev.matchedTopics = [...new Set([...prev.matchedTopics, topic.id])];
      else seen.set(a.id, { ...a, matchedTopics: [topic.id] });
    }
  }
  return { articles: [...seen.values()], cache: { hits, misses }, adapter: adapter.name };
}
