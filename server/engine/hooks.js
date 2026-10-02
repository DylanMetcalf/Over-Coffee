// 12b — HOOKS
//
// The morning ping: what the reader sees on the lock screen, in the inbox and
// in WhatsApp before they open anything. Built from the stored edition, so it
// costs nothing and can never promise a story the paper does not contain.
//
// The rule that makes a hook honest: it is a teaser for a real, published
// story, every number in it is in that story's evidence, and the first screen
// of the edition answers it. The quality gate checks all three. A quiet
// morning gets a quiet hook ("nothing today — you're done"); that is a feature.

const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
const word = (n) => WORDS[n] || String(n);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const LIMITS = { pushTitle: 65, pushBody: 150, subject: 78, preheader: 120, whatsapp: 700 };

function hashDay(date) {
  let h = 7;
  for (const c of date) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

const stripEmoji = (s) => s.replace(/\s*\p{Extended_Pictographic}️?/gu, '').trim();

/** Hook lines for one story, falling back to the headline when none are authored. */
function lines(story, mode) {
  const h = story.hooks?.[mode];
  const c = story.copy[mode];
  if (mode === 'business') {
    return { head: h?.ticker || truncate(c.headline, 62), tease: h?.tease || truncate(c.dek || '', 110) };
  }
  return { head: h?.title || truncate(c.headline, 58), tease: h?.line || truncate(c.dek || '', 120) };
}

function truncate(s, n) {
  if (s.length <= n) return s;
  const cut = s.slice(0, n - 1).replace(/\s+\S*$/, '');
  return cut + '…';
}

function shortDate(iso) {
  return new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}

export function pickPattern(edition) {
  const n = edition.stories.length;
  if (n === 0) return 'quiet';
  if (n <= 2) return 'light';
  return ['lead', 'count', 'number'][hashDay(edition.editorialDate) % 3];
}

export function buildHooks(edition) {
  const pattern = pickPattern(edition);
  return { pattern, business: forMode(edition, 'business', pattern), social: forMode(edition, 'social', pattern) };
}

function forMode(edition, mode, pattern) {
  const stories = edition.stories;
  const n = stories.length;
  const m = edition.stats.readingMinutes[mode];
  const social = mode === 'social';
  const [lead, second, third] = stories;
  const L = lead && lines(lead, mode);
  const S = second && lines(second, mode);
  const date = shortDate(edition.editorialDate);

  let title;
  let body;

  if (pattern === 'quiet') {
    title = social ? 'Quiet morning ☕' : 'A quiet morning';
    body = social ? 'Nothing was worth your time today. Go enjoy your coffee. You are done.' : 'Nothing cleared today’s bar. No edition to read — you are up to date.';
  } else if (pattern === 'light') {
    title = L.head;
    body = social
      ? `${L.tease} Only ${word(n).toLowerCase()} ${n === 1 ? 'thing' : 'things'} today. ${m} minutes, tops.`
      : `${S ? `Also: ${S.head}. ` : ''}${m}-minute edition, ready now.`;
  } else if (pattern === 'count') {
    title = social ? `${cap(word(n).toLowerCase())} things happened. Number one is a big one 👀` : `${cap(word(n).toLowerCase())} developments. ${m} minutes.`;
    body = social ? `Starting with: ${stripEmoji(L.head)}.` : `${L.head}${S ? ` · ${S.head}` : ''}`;
  } else if (pattern === 'number') {
    const fig = stories.find((s) => s.figure?.data?.length >= 2);
    if (fig && !social) {
      const f = fig.figure;
      const now = f.data.at(-1).value;
      const before = f.data.at(-2).value;
      const fmt = (v) => `${f.unit === '$' ? '$' : ''}${v.toFixed(f.decimals ?? 0)}${f.unit === '%' ? '%' : ''}`;
      title = `${f.short || f.title}: ${fmt(now)}${f.suffix ? ' ' + f.suffix : ''} (from ${fmt(before)})`;
      body = `${m}-minute edition, ready now. Lead: ${L.head}.`;
    } else {
      title = L.head;
      body = social ? `${L.tease} ${cap(word(n - 1).toLowerCase())} more inside.` : `Also: ${S.head}. ${m}-minute edition, ready now.`;
    }
  } else {
    // lead
    title = L.head;
    body = social ? `${L.tease} ${cap(word(n - 1).toLowerCase())} more inside.` : `Also: ${S.head}. ${m}-minute edition, ready now.`;
  }

  const items = stories.slice(0, 4).map((s) => {
    const l = lines(s, mode);
    return { head: l.head, line: l.tease };
  });

  const subject = pattern === 'quiet'
    ? social ? 'Quiet morning. Nothing to read ☕' : 'Over Coffee: a quiet morning'
    : social
      ? (pattern === 'count' ? title : L.head)
      : `${L.head}${n > 1 ? ` + ${n - 1} more` : ''}`;
  const preheaderRaw = pattern === 'quiet' ? body : social ? `${L.tease}${S ? ` Also: ${stripEmoji(S.head)}.` : ''}` : `${S ? S.head : L.tease}${third ? ` · ${lines(third, mode).head}` : ''}`;
  const preheader = truncate(preheaderRaw, LIMITS.preheader - 2);

  const wa = social
    ? [
        `*Over Coffee* ☕ ${date}`,
        '',
        pattern === 'quiet' ? 'Quiet morning. Nothing was worth your time today.' : 'Okay, you need to hear this:',
        ...(pattern === 'quiet' ? [] : ['', `*${L.head}*`, L.tease]),
        ...(items.length > 1 ? ['', 'Also today:', ...items.slice(1, 4).map((i) => `• ${stripEmoji(i.head)}`)] : []),
        '',
        pattern === 'quiet' ? 'Go enjoy your coffee. You are done.' : `The full thing takes ${m} minutes 👉 {{link}}`,
      ]
    : [
        `*Over Coffee* — ${date}`,
        '',
        ...(pattern === 'quiet' ? ['A quiet morning. Nothing cleared today’s bar.'] : [`*${L.head}*`, L.tease, '', ...items.slice(1, 4).map((i) => `• ${i.head}`)]),
        '',
        pattern === 'quiet' ? 'You are up to date.' : `${m}-minute edition: {{link}}`,
      ];

  return {
    push: { title, body },
    email: { subject, preheader, items, cta: social ? 'Read today’s paper' : 'Read today’s newspaper', readMinutes: m },
    whatsapp: { text: wa.join('\n') },
  };
}

/** Fill the {{link}} token for delivery. */
export function withLink(hooks, link) {
  return JSON.parse(JSON.stringify(hooks).replace(/\{\{link\}\}/g, link));
}
