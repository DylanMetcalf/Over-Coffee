// Shared between the server (quality gate, audio, word counts) and the
// browser renderer, so "what a tier contains" has exactly one definition.

export const TIER_FIELDS = {
  brief: { body: 1, dek: false, why: false, changed: false, next: false },
  standard: { body: 2, dek: true, why: true, changed: false, next: false },
  full: { body: Infinity, dek: true, why: true, changed: true, next: true },
};

/** The parts of a story's copy that appear at a given tier. */
export function tierCopy(copy, tier) {
  const f = TIER_FIELDS[tier] || TIER_FIELDS.standard;
  return {
    kicker: copy.kicker,
    headline: copy.headline,
    dek: f.dek ? copy.dek : null,
    body: (copy.body || []).slice(0, f.body),
    why: f.why ? copy.why : null,
    changed: f.changed ? copy.changed || null : null,
    next: f.next ? copy.next || null : null,
    shortVersion: copy.shortVersion || null,
    didYouKnow: tier === 'full' ? copy.didYouKnow || null : null,
  };
}

export function textOf(parts) {
  return [parts.headline, parts.dek, ...(parts.body || []), parts.why, parts.changed, parts.next, parts.shortVersion, parts.didYouKnow]
    .filter(Boolean)
    .join(' ');
}

export const countWords = (s) => (String(s).match(/[\p{L}\p{N}][\p{L}\p{N}'’.,%$-]*/gu) || []).length;

export const WORDS_PER_MINUTE = 230;

export function minutesFor(words) {
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

export const STATUS_LABEL = {
  confirmed: 'Confirmed',
  reported: 'Reported',
  interpreted: 'Interpretation',
  emerging: 'Emerging',
  uncertain: 'Unverified',
  unsupported: 'Unsupported',
};

export const STATUS_EXPLAINER = {
  confirmed: 'Backed by a primary source or two independent outlets.',
  reported: 'Reported by a credible source, or a figure the organisation reports about itself.',
  interpreted: 'Analysis or opinion, attributed to whoever offered it.',
  emerging: 'Early evidence, such as research not yet peer reviewed.',
  uncertain: 'Claimed but disputed or not independently verified.',
  unsupported: 'No supporting source.',
};
