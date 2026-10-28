// 07 — VERIFY
//
// Source credibility is assessed from source type and publisher record.
// Each claim's status is derived from the sources that support it — never
// asserted by the writer:
//
//   confirmed   — a primary source (official, filing, regulatory, peer-reviewed
//                 research, documentation) or two independent credible outlets
//   reported    — one credible outlet, a company's own unverified figure, or
//                 anonymous sourcing
//   interpreted — analysis or opinion, attributed as such
//   emerging    — early evidence (e.g. a preprint) still under review
//   uncertain   — contested, or supported only by low-credibility sources

import { SAMPLE_PUBLISHERS } from '../data/sample-corpus.js';
import { independentOrigins } from './memory.js';

export const PRIMARY_TYPES = new Set(['official', 'filing', 'regulatory', 'research', 'documentation']);

const TYPE_BASE = {
  official: 0.85,
  filing: 0.95,
  regulatory: 0.95,
  research: 0.85,
  documentation: 0.85,
  wire: 0.9,
  journalism: 0.85,
  analysis: 0.8,
  expert: 0.75,
  trade: 0.75,
  blog: 0.5,
  aggregator: 0.2,
};

export const SOURCE_TYPE_LABEL = {
  official: 'Official announcement',
  filing: 'Company filing',
  regulatory: 'Regulatory document',
  research: 'Research',
  documentation: 'Technical documentation',
  wire: 'Wire report',
  journalism: 'Independent reporting',
  analysis: 'Analysis',
  expert: 'Expert source',
  trade: 'Trade press',
  blog: 'Blog',
  aggregator: 'Aggregator / social',
};

export function assessSource(article) {
  const base = TYPE_BASE[article.sourceType] ?? 0.5;
  const pub = SAMPLE_PUBLISHERS[article.publisher];
  let score = pub ? (base + pub.tier) / 2 : base;
  const basis = [`${SOURCE_TYPE_LABEL[article.sourceType] || article.sourceType}`];
  if (pub) basis.push(`publisher record ${Math.round(pub.tier * 100)}/100`);
  if (article.preprint) {
    score = Math.min(score, 0.7);
    basis.push('preprint — not peer reviewed');
  }
  return { score: Math.round(score * 100) / 100, primary: PRIMARY_TYPES.has(article.sourceType) && !article.preprint, basis: basis.join(' · ') };
}

/** Status of one claim given the edition's source records (by id). */
export function claimStatus(claim, sourcesById) {
  const supporting = claim.sources.map((id) => sourcesById.get(id)).filter(Boolean);
  if (!supporting.length) return { status: 'unsupported', note: 'No supporting source in the research snapshot.' };
  if (claim.kind === 'contested' || claim.contestedBy?.length) return { status: 'uncertain', note: 'Claim made by the company; disputed or unverified by independent sources.' };
  if (claim.kind === 'interpretation') return { status: 'interpreted', note: 'Analysis or opinion, attributed to its source.' };
  if (claim.preprint || supporting.every((s) => s.preprint)) return { status: 'emerging', note: 'Early research, not yet peer reviewed.' };
  if (claim.anonymous) return { status: 'reported', note: 'Reported by one outlet citing unnamed sources.' };
  if (claim.kind === 'self-reported') return { status: 'reported', note: 'Figure reported by the organisation itself; not independently verified.' };

  const credible = supporting.filter((s) => s.credibility.score >= 0.6);
  if (!credible.length) return { status: 'uncertain', note: 'Supported only by low-credibility sources.' };
  if (credible.some((s) => s.credibility.primary)) return { status: 'confirmed', note: 'Primary source.' };
  // Syndicated copies and several stories from one outlet are one origin, not corroboration.
  const origins = independentOrigins(credible);
  if (origins >= 2) return { status: 'confirmed', note: `Corroborated by ${origins} independent outlets.` };
  return { status: 'reported', note: credible.length > 1 ? 'Several copies of one outlet’s report; not independently corroborated.' : 'Single credible outlet.' };
}

export const STATUS_ORDER = ['confirmed', 'reported', 'interpreted', 'emerging', 'uncertain', 'unsupported'];

/** The event's headline status is the status of its first (lead) claim. */
export function eventStatus(claims) {
  return claims[0]?.status || 'uncertain';
}
