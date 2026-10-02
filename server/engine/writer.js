// 10 — WRITE
//
// One writer call per published event produces BOTH presentation voices from
// the same verified claims. Changing Business ⇄ Social later is a render
// switch, never a re-write or re-research.
//
// Writers, in order of preference:
//   DeskWriter       — prototype: authored copy for sample events
//   ClaudeWriter     — live: Claude writes from claims + excerpts (opt-in via
//                      OC_WRITER=claude); output is cached per event
//   ExtractiveWriter — fallback: attributed sentences lifted from sources,
//                      never paraphrased beyond them

import crypto from 'node:crypto';
import { firstSentence } from './analyst.js';

export function createWriter({ store } = {}) {
  const claude = process.env.OC_WRITER === 'claude' ? new ClaudeWriter({ store }) : null;
  return {
    name: claude ? 'desk+claude' : 'desk+extractive',
    async write(event) {
      if (event.desk?.business) return { ...deskCopy(event.desk), writer: 'desk' };
      if (claude) {
        try {
          return { ...(await claude.write(event)), writer: 'claude' };
        } catch (err) {
          console.warn('[writer] Claude writer failed, falling back to extractive:', err.message);
        }
      }
      return { ...extractiveCopy(event), writer: 'extractive' };
    },
  };
}

function deskCopy(desk) {
  return {
    copy: { business: desk.business, social: desk.social },
    depth: desk.depth || { timeline: [], saying: [], related: [] },
    sourceNotes: desk.sourceNotes || {},
    figure: desk.figure || null,
  };
}

export function extractiveCopy(event) {
  const lead = [...event.sources].sort((a, b) => b.credibility.score - a.credibility.score)[0];
  const body = event.sources
    .filter((s) => s.credibility.score >= 0.6)
    .slice(0, 3)
    .map((s) => `${s.publisher} reports: ${firstSentence(s.excerpt)}`);
  const base = {
    kicker: event.subtopic || 'Developing',
    headline: lead.title,
    dek: `As reported by ${[...new Set(event.sources.map((s) => s.publisher))].slice(0, 3).join(', ')}.`,
    body,
    why: null,
    summaryLine: lead.title,
  };
  return {
    copy: { business: base, social: { ...base, kicker: 'Here’s what happened', shortVersion: null } },
    depth: { timeline: event.sources.map((s) => ({ when: s.publishedAt.slice(0, 16).replace('T', ' · '), what: `${s.publisher}: ${s.title}` })), saying: [], related: [] },
    sourceNotes: Object.fromEntries(event.sources.map((s) => [s.id, { heading: s.title, role: s.typeLabel }])),
    figure: null,
  };
}

// ── Claude writer ─────────────────────────────────────────────────────────

const VOICE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['kicker', 'headline', 'dek', 'body', 'why', 'summaryLine'],
  properties: {
    kicker: { type: 'string' },
    headline: { type: 'string' },
    dek: { type: 'string' },
    body: { type: 'array', items: { type: 'string' } },
    why: { type: 'string' },
    changed: { type: 'string' },
    next: { type: 'string' },
    shortVersion: { type: 'string' },
    summaryLine: { type: 'string' },
  },
};

const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['business', 'social'],
  properties: { business: VOICE_SCHEMA, social: VOICE_SCHEMA },
};

// Frozen so it caches across every event in every edition.
const SYSTEM = `You are the writer for Over Coffee, a finite morning newspaper.
Write one story in two voices from the verified claims and source excerpts you are given.

BUSINESS voice: concise, precise, neutral, premium editorial. No exclamation marks.
SOCIAL voice: a well-informed friend catching the reader up — warm, plain, occasionally playful. Same facts.

Rules for both voices:
- Use only facts present in the claims or excerpts. Every number you write must appear in them.
- Keep each claim's status: attribute "reported" and "interpreted" claims; flag "emerging" and "uncertain" ones plainly.
- Never invent quotes, sources, figures or context.
- No clickbait, filler, or stock phrases ("game-changer", "in today's fast-paced world", "delve").
- body: 2–3 short paragraphs. why: one or two sentences on why it matters.`;

export class ClaudeWriter {
  constructor({ store, model = process.env.OC_WRITER_MODEL || 'claude-opus-5-5' } = {}) {
    this.store = store;
    this.model = model;
  }

  async client() {
    if (!this._client) {
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      this._client = new Anthropic();
    }
    return this._client;
  }

  async write(event) {
    const brief = {
      claims: event.claims.map((c) => ({ text: c.text, status: c.status, sources: c.sources })),
      sources: event.sources.map((s) => ({ id: s.id, publisher: s.publisher, type: s.typeLabel, published: s.publishedAt, excerpt: s.excerpt })),
    };
    const cacheKey = 'writer:' + crypto.createHash('sha256').update(this.model + JSON.stringify(brief)).digest('hex');
    const cached = this.store?.getResearchCache(cacheKey);
    if (cached) return cached;

    const client = await this.client();
    const response = await client.beta.messages.create({
      model: this.model,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
      system: SYSTEM,
      messages: [{ role: 'user', content: JSON.stringify(brief) }],
    });
    if (response.stop_reason === 'refusal') throw new Error('writer declined: ' + (response.stop_details?.category || 'refusal'));
    const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    const copy = JSON.parse(text);
    const result = { ...extractiveCopy(event), copy };
    this.store?.putResearchCache(cacheKey, 'claude-writer', result);
    return result;
  }
}
