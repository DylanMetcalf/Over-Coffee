// 05 — DETECT EVENTS + 06 — CLUSTER
//
// Five outlets reporting one launch is one event, not five stories.
// Clustering is deterministic and cheap: entity overlap plus headline token
// similarity, joined transitively with union-find. No model call is needed to
// collapse duplicate reporting.

const STOPWORDS = new Set('a an and are as at be by for from has have in is it its of on or that the to was were will with after over new says said'.split(' '));

const tokens = (s) =>
  new Set(
    String(s)
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
  );

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

export function similarity(a, b) {
  const ea = new Set(a.entities.map((e) => e.toLowerCase()));
  const eb = new Set(b.entities.map((e) => e.toLowerCase()));
  let shared = 0;
  for (const e of ea) if (eb.has(e)) shared++;
  const overlap = shared / Math.max(1, Math.min(ea.size, eb.size));
  const title = jaccard(tokens(a.title), tokens(b.title));
  return { shared, overlap, title };
}

export function sameEvent(a, b) {
  const s = similarity(a, b);
  return s.shared >= 2 || (s.shared >= 1 && s.overlap >= 0.5) || s.title >= 0.45;
}

export function clusterArticles(articles) {
  const parent = articles.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < articles.length; i++) {
    for (let j = i + 1; j < articles.length; j++) {
      if (sameEvent(articles[i], articles[j])) parent[find(i)] = find(j);
    }
  }
  const groups = new Map();
  articles.forEach((a, i) => {
    const r = find(i);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(a);
  });
  return [...groups.values()].map((members) => {
    members.sort((x, y) => x.publishedAt.localeCompare(y.publishedAt));
    const counts = new Map();
    for (const m of members) for (const e of m.entities) counts.set(e, (counts.get(e) || 0) + 1);
    const label = [...counts.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] || members[0].title;
    return {
      articleIds: members.map((m) => m.id),
      articles: members,
      label,
      firstSeen: members[0].publishedAt,
      lastSeen: members.at(-1).publishedAt,
      publishers: [...new Set(members.map((m) => m.publisher))],
    };
  });
}
