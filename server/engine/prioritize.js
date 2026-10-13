// 08 — PRIORITIZE
//
// A transparent, weighted score. Every component is stored on the event so
// the edition record can show exactly why a story ranked where it did.

export const WEIGHTS = {
  relevance: 0.3,
  significance: 0.38,
  freshness: 0.1,
  sourceQuality: 0.12,
  corroboration: 0.1,
};

export function scoreEvent(event, { userTopicIds, editionTime }) {
  const weights = event.topicWeights || {};
  const matched = userTopicIds.map((id) => weights[id] || 0);
  const relevance = Math.max(0, ...matched);
  const crossTopic = matched.filter((w) => w >= 0.6).length;

  const s = event.signals;
  const significance = 0.55 * s.impact + 0.25 * s.breadth + 0.2 * s.novelty;

  const newestH = (editionTime - Date.parse(event.lastSeen)) / 36e5;
  const freshness = newestH <= 24 ? 1 : newestH <= 48 ? 0.85 : newestH <= 72 ? 0.6 : 0.3;

  const creds = event.sources.map((x) => x.credibility.score).sort((a, b) => b - a).slice(0, 3);
  const sourceQuality = creds.length ? creds.reduce((a, b) => a + b, 0) / creds.length : 0;

  const credible = new Set(event.sources.filter((x) => x.credibility.score >= 0.6).map((x) => x.publisher));
  const corroboration = Math.min(1, credible.size / 3);

  const bonus = Math.min(0.1, Math.max(0, crossTopic - 1) * 0.05);
  let penalty = 0;
  const reasons = [];
  if (s.flags?.includes('sensational')) (penalty += 0.25), reasons.push('sensational');
  if (s.flags?.includes('low-consequence')) (penalty += 0.2), reasons.push('low consequence');
  if (event.status === 'uncertain') (penalty += 0.05), reasons.push('headline claim unverified');

  const parts = { relevance, significance, freshness, sourceQuality, corroboration };
  let total = Object.entries(WEIGHTS).reduce((acc, [k, w]) => acc + w * parts[k], 0) + bonus - penalty;
  total = Math.round(total * 1000) / 1000;
  const r = (x) => Math.round(x * 100) / 100;
  return {
    total,
    relevance: r(relevance),
    significance: r(significance),
    freshness: r(freshness),
    sourceQuality: r(sourceQuality),
    corroboration: r(corroboration),
    crossTopicBonus: r(bonus),
    penalty: r(penalty),
    penaltyReasons: reasons,
  };
}

/** Which of the reader's topics an event belongs to in this edition. */
export function primaryTopic(event, userTopicIds) {
  let best = null;
  for (const id of userTopicIds) {
    const w = event.topicWeights?.[id] || 0;
    if (w > 0 && (!best || w > best.w)) best = { id, w };
  }
  return best?.id || userTopicIds[0];
}
