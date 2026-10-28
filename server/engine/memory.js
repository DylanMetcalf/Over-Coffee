// EDITORIAL MEMORY + SOURCE INDEPENDENCE
//
// Memory answers, per reader: have we already told them this? A new event is
// compared with everything previously published to that reader using canonical
// URLs first (exact), then title/entity similarity (fuzzy, never just the
// headline string). The result is one of:
//   new          nothing like it before
//   duplicate    same reports we already published      → held back
//   recurring    more coverage of the same facts         → held back unless high impact
//   development  new reporting that adds new claims      → published with "what changed"
//
// Independence: syndicated copies (same title republished, "X on MSN") and several
// stories from one outlet are one origin, so they never count as corroboration.

const TRACKING = /^(utm_|fbclid|gclid|mc_|ref$|ref_|source$|cmpid|ocid|cid$|ito$|taid)/i;
const STOP = new Set('about after again against also been before being between both could does doing during each from have having here into just more most much once only other over same should some such than that their them then there these they this those through under until very were what when where which while will with would your says said report reports reported'.split(' '));

export function canonicalUrl(raw) {
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase().replace(/^(www|m|amp|mobile)\./, '');
    const keep = [...u.searchParams].filter(([k]) => !TRACKING.test(k)).sort(([a], [b]) => a.localeCompare(b));
    const q = keep.length ? '?' + keep.map(([k, v]) => `${k}=${v}`).join('&') : '';
    return host + u.pathname.replace(/\/+$/, '').toLowerCase() + q;
  } catch {
    return '';
  }
}

export const normTitle = (t = '') =>
  String(t).toLowerCase().replace(/\s[-–—|]\s[^-–—|]{2,40}$/, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

export const publisherFamily = (p = '') =>
  String(p).toLowerCase().replace(/\s+on\s+(msn|yahoo|flipboard|newsbreak|apple news)$/i, '').replace(/^www\./, '').replace(/\.(com|co\.uk|org|net)$/, '').trim();

/** Number of genuinely independent origins among sources (union-find on shared title or outlet). */
export function independentOrigins(sources) {
  const parent = sources.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < sources.length; i++) {
    for (let j = i + 1; j < sources.length; j++) {
      const sameTitle = normTitle(sources[i].title) && normTitle(sources[i].title) === normTitle(sources[j].title);
      const sameOutlet = publisherFamily(sources[i].publisher) === publisherFamily(sources[j].publisher);
      if (sameTitle || sameOutlet) parent[find(i)] = find(j);
    }
  }
  return new Set(sources.map((_, i) => find(i))).size;
}

export function tokens(sources) {
  const out = new Set();
  for (const s of sources) for (const w of normTitle(s.title).split(' ')) if (w.length > 3 && !STOP.has(w)) out.add(w);
  return out;
}

const jaccard = (a, b) => {
  if (!a.size || !b.size) return 0;
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n / (a.size + b.size - n);
};

const claimKey = (text) => normTitle(text).split(' ').filter((w) => w.length > 3 && !STOP.has(w)).sort().join(' ');

/** Fingerprint of an event for storage. */
export function fingerprint(event) {
  return {
    urls: [...new Set(event.sources.map((s) => canonicalUrl(s.url)).filter(Boolean))],
    tokens: [...tokens(event.sources)],
    families: [...new Set(event.sources.map((s) => publisherFamily(s.publisher)))],
    claims: event.claims.map((c) => claimKey(c.text)).filter(Boolean),
  };
}

/** Classify one event against a reader's memory rows (see store.listMemory). */
export function classify(event, memory, { today, importantImpact = 0.8 }) {
  const fp = fingerprint(event);
  const myTokens = new Set(fp.tokens);
  let best = null;
  for (const m of memory) {
    if (m.lastDate >= today) continue; // regenerating today's edition never counts as a repeat
    const urlHit = fp.urls.some((u) => m.fp.urls.includes(u));
    const sim = jaccard(myTokens, new Set(m.fp.tokens));
    const score = urlHit ? 1 : sim;
    if ((urlHit || sim >= 0.5) && (!best || score > best.score)) best = { m, score, urlHit };
  }
  if (!best) return { kind: 'new' };
  const { m } = best;
  const newUrls = fp.urls.filter((u) => !m.fp.urls.includes(u));
  const newFamilies = fp.families.filter((f) => !m.fp.families.includes(f));
  const newClaims = event.claims.filter((c) => !m.fp.claims.includes(claimKey(c.text)));
  const base = { since: m.lastDate, previousHeadline: m.headline, key: m.key };
  if (!newUrls.length) return { kind: 'duplicate', ...base };
  if (newClaims.length && (newFamilies.length || (event.signals?.novelty ?? 0) >= 0.75)) {
    return { kind: 'development', ...base, changes: newClaims.slice(0, 2).map((c) => c.text) };
  }
  if ((event.signals?.impact ?? 0) >= importantImpact) return { kind: 'development', ...base, changes: [], continuing: true };
  return { kind: 'recurring', ...base };
}
