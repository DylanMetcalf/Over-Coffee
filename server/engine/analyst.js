// ASSESS + EXTRACT (between CLUSTER and VERIFY)
//
// Turns a cluster of articles into an editorial event: signals (impact,
// breadth, novelty, flags), topic weights and claims with supporting sources.
//
// Desk material is matched to clusters by article overlap. For clusters the
// desk has never seen (live research), a deterministic extractive analyst
// produces conservative signals and attributed claims — it never paraphrases
// beyond what a source says.

import { SAMPLE_DESK } from '../data/sample-desk.js';

export function matchDesk(cluster, desk = SAMPLE_DESK, corpusIndex) {
  let best = null;
  for (const [key, entry] of Object.entries(desk)) {
    const ids = corpusIndex?.[key] || [];
    const overlap = cluster.articleIds.filter((id) => ids.includes(id)).length;
    if (overlap && (!best || overlap > best.overlap)) best = { key, entry, overlap };
  }
  return best;
}

export function analyseCluster(cluster, { corpusIndex, userTopics }) {
  const match = matchDesk(cluster, SAMPLE_DESK, corpusIndex);
  if (match) {
    const { key, entry } = match;
    return {
      key,
      fromDesk: true,
      subtopic: entry.subtopic,
      topicWeights: entry.topicWeights,
      signals: { flags: [], ...entry.signals },
      rejectReason: entry.rejectReason || null,
      // Only claims whose sources are actually in this cluster survive.
      claims: entry.claims
        .map((c) => ({ ...c, sources: c.sources.filter((s) => cluster.articleIds.includes(s)) }))
        .filter((c) => c.sources.length),
      desk: entry,
    };
  }
  return extractive(cluster, userTopics);
}

function extractive(cluster, userTopics) {
  const topicWeights = {};
  for (const a of cluster.articles) for (const t of a.matchedTopics || a.topics) topicWeights[t] = 1;
  for (const t of userTopics) if (!(t.id in topicWeights)) topicWeights[t.id] = 0;
  const pubs = cluster.publishers.length;
  const claims = cluster.articles.slice(0, 3).map((a, i) => ({
    id: 'c' + i,
    kind: 'fact',
    text: firstSentence(a.excerpt) || a.title,
    sources: [a.id],
  }));
  return {
    key: 'live-' + cluster.articleIds[0],
    fromDesk: false,
    subtopic: null,
    topicWeights,
    // Without a model, breadth of coverage is the best available proxy for significance.
    signals: { impact: Math.min(0.9, 0.45 + 0.12 * pubs), breadth: Math.min(0.9, 0.4 + 0.15 * pubs), novelty: 0.6, flags: [] },
    rejectReason: null,
    claims,
    desk: null,
  };
}

export function firstSentence(text = '') {
  const m = String(text).match(/^(.+?[.!?])(\s|$)/);
  return (m ? m[1] : String(text)).trim();
}
