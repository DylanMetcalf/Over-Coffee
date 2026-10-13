// Topic intelligence: turn a free-text interest into a handful of genuinely
// useful areas to follow. Cheap model, cached per topic. Without an API key it
// falls back to the catalog expansion (or a generic one) so onboarding never breaks.

import crypto from 'node:crypto';

const MODEL = process.env.OC_TRIAGE_MODEL || 'claude-haiku-4-5-20251001';
const SCHEMA = { type: 'object', additionalProperties: false, required: ['areas'], properties: { areas: { type: 'array', items: { type: 'string' } } } };
const SYSTEM = `You help a reader set up a personal daily newspaper. Given a topic they typed, list 6 to 8 distinct areas within it that a well-informed professional or enthusiast would genuinely want news about.
Each area: 1 to 4 words, specific to the topic (not generic words like "news", "policy", "people"), title case, no duplicates. Include standards, regulation, industry applications, technology and safety/inspection areas where they apply. Return JSON only.`;

export const suggestEnabled = () => !!process.env.ANTHROPIC_API_KEY && process.env.OC_TRIAGE !== 'off';

export async function suggestAreas({ topic, store, client }) {
  const fallback = { areas: topic.custom ? [] : topic.expansion.slice(), source: topic.custom ? 'none' : 'catalog' };
  if (!suggestEnabled() && !client) return fallback;
  const key = 'suggest:' + crypto.createHash('sha256').update(MODEL + topic.name.toLowerCase()).digest('hex');
  const cached = store?.getResearchCache(key);
  if (cached) return { areas: cached.areas, source: 'model' };
  try {
    const c = client || new (await import('@anthropic-ai/sdk')).default();
    const res = await c.messages.create({
      model: MODEL,
      max_tokens: 600,
      system: SYSTEM,
      output_config: { format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{ role: 'user', content: topic.name }],
    });
    const out = JSON.parse(res.content.filter((b) => b.type === 'text').map((b) => b.text).join(''));
    const areas = [...new Set(out.areas.map((a) => String(a).trim()).filter((a) => a && a.length <= 40))].slice(0, 8);
    if (!areas.length) return fallback;
    store?.putResearchCache(key, 'claude-suggest', { areas });
    return { areas, source: 'model' };
  } catch (err) {
    console.warn('[suggest] failed:', err.message);
    return fallback;
  }
}
