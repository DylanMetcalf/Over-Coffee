// 09 — EDIT
//
// The editor decides what deserves space. Three rules:
//
//   1. A story must clear the bar. The bar is set by the reading budget —
//      a 5-minute edition only carries what is worth five minutes.
//   2. Space is allocated in words, not story counts. Higher-ranked stories
//      get more depth; when the budget is tight, depth is cut before stories.
//   3. Nothing is added to fill space. If today needs four minutes of a
//      ten-minute budget, the edition is four minutes long.
//
// Every event receives a recorded decision, published or not.

export const WPM = 230;

/** Minimum score to publish, per reading budget (minutes). */
export const BAR = { 5: 0.84, 10: 0.77, 20: 0.62 };

/** Target words per depth tier (the writer writes to these targets). */
export const TIER_WORDS = { brief: 60, standard: 130, full: 230 };
const TIER_ORDER = ['full', 'standard', 'brief'];

/** Fixed overhead: masthead, summary, one thing to remember, sign-off. */
const OVERHEAD_WORDS = 90;

export function budgetWords(minutes) {
  return Math.round(minutes * WPM * 0.9) - OVERHEAD_WORDS;
}

function preferredTier(rank, minutes) {
  if (rank === 0) return 'full';
  if (minutes >= 20) return 'full';
  if (minutes >= 10) return rank <= 2 ? 'full' : 'standard';
  return 'standard';
}

export function editEdition(events, { minutes, lenient = false }) {
  const bar = lenient ? Math.min(BAR[minutes] ?? BAR[10], 0.6) : BAR[minutes] ?? BAR[10];
  const budget = budgetWords(minutes);
  const ranked = [...events].sort((a, b) => b.score.total - a.score.total);
  const decisions = new Map();
  const picked = [];
  let used = 0;

  for (const e of ranked) {
    if (e.rejectReason || e.score.penaltyReasons.includes('sensational')) {
      decisions.set(e.id, { status: 'rejected', reason: e.rejectReason || 'Sensational; little editorial value.' });
      continue;
    }
    if (e.status === 'unsupported') {
      decisions.set(e.id, { status: 'rejected', reason: 'Lead claim has no supporting source.' });
      continue;
    }
    if (e.score.total < bar) {
      const nearMiss = e.score.total >= bar - 0.1;
      decisions.set(e.id, {
        status: 'held',
        reason: nearMiss
          ? `Below today’s bar for a ${minutes}-minute edition (${e.score.total.toFixed(2)} < ${bar.toFixed(2)}). Would run in a longer edition.`
          : `Below the bar (${e.score.total.toFixed(2)}). Not significant enough to take the reader’s time.`,
      });
      continue;
    }
    const pref = preferredTier(picked.length, minutes);
    const tiers = TIER_ORDER.slice(TIER_ORDER.indexOf(pref));
    const tier = tiers.find((t) => used + TIER_WORDS[t] <= budget);
    if (!tier) {
      decisions.set(e.id, { status: 'held', reason: `Cleared the bar but the ${minutes}-minute budget was full.` });
      continue;
    }
    used += TIER_WORDS[tier];
    picked.push(e);
    decisions.set(e.id, { status: 'published', tier, rank: picked.length, reason: picked.length === 1 ? 'Lead: highest significance for this reader today.' : `Ranked ${picked.length} of the day’s developments.` });
  }

  return { picked, decisions, bar, budgetWords: budget, plannedWords: used };
}

/**
 * Group published stories into the edition's structure. The lead opens the
 * front page; the remaining stories sit under the reader's topics, ordered by
 * their strongest story. Topics with nothing worth publishing are kept, with
 * an honest note, rather than silently dropped.
 */
export function composeSections(picked, { userTopics, considered }) {
  const lead = picked[0] || null;
  const bySection = new Map(userTopics.map((t) => [t.id, []]));
  for (const e of picked.slice(1)) bySection.get(e.primaryTopic)?.push(e);
  const sections = userTopics
    .map((t) => {
      const items = bySection.get(t.id) || [];
      const hasLead = lead?.primaryTopic === t.id;
      // Only developments that did not run anywhere in the edition count as held back.
      const reviewed = considered.filter((e) => e.topicWeights?.[t.id] > 0 && !picked.includes(e)).length;
      return {
        topicId: t.id,
        label: t.label,
        storyEventIds: items.map((e) => e.id),
        top: items[0]?.score.total ?? (hasLead ? lead.score.total : 0),
        quiet:
          !items.length && !hasLead
            ? reviewed
              ? `Nothing in ${t.label} cleared today’s bar. We reviewed ${reviewed} development${reviewed === 1 ? '' : 's'} and held ${reviewed === 1 ? 'it' : 'them'} back.`
              : `No significant ${t.label} developments in today’s research.`
            : null,
      };
    })
    .sort((a, b) => b.top - a.top);
  return { leadEventId: lead?.id || null, sections };
}
