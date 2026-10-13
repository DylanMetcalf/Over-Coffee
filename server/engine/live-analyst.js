// 05–07 for live research: a small, cheap model groups articles into events,
// drops noise, scores significance and extracts claims. Every claim must be
// supported by the supplied snippets; anything else is rejected here, before
// the writer ever sees it. Used only when ANTHROPIC_API_KEY is set.

import crypto from 'node:crypto';

const MODEL = process.env.OC_TRIAGE_MODEL || 'claude-haiku-4-5-20251001';
const MAX_ARTICLES = 45;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['events'],
  properties: {
    events: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['articleIds', 'label', 'subtopic', 'topic', 'impact', 'breadth', 'novelty', 'claims'],
        properties: {
          articleIds: { type: 'array', items: { type: 'string' } },
          label: { type: 'string' },
          subtopic: { type: 'string' },
          topic: { type: 'string' },
          impact: { type: 'number' },
          breadth: { type: 'number' },
          novelty: { type: 'number' },
          claims: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['text', 'kind', 'sources'],
              properties: { text: { type: 'string' }, kind: { type: 'string', enum: ['fact', 'reported', 'interpreted'] }, sources: { type: 'array', items: { type: 'string' } } },
            },
          },
        },
      },
    },
  },
};

const SYSTEM = `You are the news desk triage for a personal daily newspaper. You receive article headlines and snippets (id, title, publisher, time, excerpt).
Group articles that report the SAME development into one event. Skip adverts, listicles, opinion fluff, duplicates of nothing, and anything unrelated to the reader's topics.
For each event return: label, subtopic (2-3 words), topic (one of the reader's topic ids), impact/breadth/novelty in 0..1 (be conservative: most events are 0.3-0.7; reserve >0.8 for genuinely major news), and 1-4 claims.
Rules for claims: each claim must be stated in the supplied snippets/titles of the cited sources, close to their wording. Never add facts, numbers, names or context that are not in the snippets. A claim supported by only one source must have kind "reported". Use "interpreted" for analysis or forecasts. sources are article ids.`;

export const triageEnabled = () => !!process.env.ANTHROPIC_API_KEY && process.env.OC_TRIAGE !== 'off';

/** Returns clusters in the same shape clusterArticles() produces, plus a ready-made analysis. */
export async function claudeTriage({ articles, topics, store, client }) {
  const pool = [...articles].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, MAX_ARTICLES);
  const byId = new Map(pool.map((a) => [a.id, a]));
  const payload = {
    topics: topics.map((t) => ({ id: t.id, name: t.name })),
    articles: pool.map((a) => ({ id: a.id, title: a.title, publisher: a.publisher, published: a.publishedAt, excerpt: String(a.excerpt || '').slice(0, 280) })),
  };
  const key = 'triage:' + crypto.createHash('sha256').update(MODEL + JSON.stringify(payload)).digest('hex');
  let out = store?.getResearchCache(key);
  if (!out) {
    const c = client || new (await import('@anthropic-ai/sdk')).default();
    const res = await c.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: SYSTEM,
      output_config: { format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{ role: 'user', content: JSON.stringify(payload) }],
    });
    out = JSON.parse(res.content.filter((b) => b.type === 'text').map((b) => b.text).join(''));
    store?.putResearchCache(key, 'claude-triage', out);
  }
  const used = new Set();
  const clusters = [];
  for (const ev of out.events || []) {
    const members = [...new Set(ev.articleIds)].filter((id) => byId.has(id) && !used.has(id)).map((id) => byId.get(id));
    if (!members.length) continue;
    members.forEach((m) => used.add(m.id));
    members.sort((x, y) => x.publishedAt.localeCompare(y.publishedAt));
    const ids = new Set(members.map((m) => m.id));
    const claims = ev.claims
      .map((c, i) => ({ id: 'c' + i, kind: c.kind, text: c.text.trim(), sources: c.sources.filter((s) => ids.has(s)) }))
      .filter((c) => c.text && c.sources.length)
      .map((c) => ({ ...c, kind: c.sources.length < 2 && c.kind === 'fact' ? 'reported' : c.kind }));
    if (!claims.length) continue;
    const clamp = (n) => Math.max(0, Math.min(0.95, Number(n) || 0));
    const topicIds = new Set(topics.map((t) => t.id));
    const topicWeights = Object.fromEntries(topics.map((t) => [t.id, 0]));
    topicWeights[topicIds.has(ev.topic) ? ev.topic : members[0].matchedTopics?.[0] || topics[0].id] = 1;
    clusters.push({
      articleIds: members.map((m) => m.id),
      articles: members,
      label: ev.label,
      firstSeen: members[0].publishedAt,
      lastSeen: members.at(-1).publishedAt,
      publishers: [...new Set(members.map((m) => m.publisher))],
      preAnalysis: {
        key: 'live-' + members[0].id,
        fromDesk: false,
        subtopic: ev.subtopic,
        topicWeights,
        signals: { impact: clamp(ev.impact), breadth: clamp(ev.breadth), novelty: clamp(ev.novelty), flags: [] },
        rejectReason: null,
        claims,
        desk: null,
      },
    });
  }
  return clusters;
}
