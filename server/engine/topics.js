// UNDERSTAND + EXPAND
//
// Readers type broad interests in their own words. The engine maps each one
// to a topic, expands it into research areas, and knows which topics sit next
// to it (for "Feeling Adventurous"). Unknown interests are kept as custom
// topics rather than rejected — the research layer can still look for them.

export const TOPIC_CATALOG = [
  {
    id: 'ai',
    label: 'AI',
    name: 'Artificial intelligence',
    aliases: ['ai', 'a.i.', 'artificial intelligence', 'machine learning', 'ml', 'llm', 'llms', 'generative ai', 'genai'],
    expansion: ['AI companies', 'Model releases', 'Regulation', 'Investment', 'Enterprise adoption', 'Research', 'Hardware', 'Developer tools', 'Applications'],
    adjacent: ['robotics', 'technology', 'manufacturing'],
  },
  {
    id: 'technology',
    label: 'Technology',
    name: 'Technology',
    aliases: ['tech', 'technology', 'software', 'gadgets', 'computing'],
    expansion: ['Big tech', 'Software', 'Devices', 'Chips', 'Cybersecurity', 'Platforms'],
    adjacent: ['ai', 'photography'],
  },
  {
    id: 'robotics',
    label: 'Robotics',
    name: 'Robotics',
    aliases: ['robots', 'robotics', 'automation', 'humanoids', 'drones'],
    expansion: ['Industrial robots', 'Warehouse automation', 'Humanoids', 'Autonomous vehicles', 'Agricultural robotics'],
    adjacent: ['manufacturing', 'ai', 'farming'],
  },
  {
    id: 'manufacturing',
    label: 'Manufacturing',
    name: 'Manufacturing',
    aliases: ['manufacturing', 'factories', 'industry', 'industrial', 'production'],
    expansion: ['Factory automation', 'Supply chains', 'Automotive production', 'Reshoring', 'Industrial policy'],
    adjacent: ['robotics', 'business'],
  },
  {
    id: 'food',
    label: 'Food',
    name: 'Food',
    aliases: ['food', 'food industry', 'groceries', 'restaurants', 'nutrition', 'cooking'],
    expansion: ['Food prices', 'Commodities', 'Food regulation', 'Food technology', 'Retail & restaurants', 'Nutrition'],
    adjacent: ['farming', 'health'],
  },
  {
    id: 'farming',
    label: 'Farming',
    name: 'Farming & agriculture',
    aliases: ['farming', 'agriculture', 'agri', 'agritech', 'crops', 'livestock', 'farms', 'harvest'],
    expansion: ['Harvest outlook', 'Inputs & costs', 'Weather & climate', 'Machinery', 'Agri policy', 'Commodity markets'],
    adjacent: ['food', 'climate', 'robotics'],
  },
  {
    id: 'climate',
    label: 'Climate',
    name: 'Climate',
    aliases: ['climate', 'climate change', 'weather', 'environment', 'emissions'],
    expansion: ['Climate science', 'Policy', 'Extreme weather', 'Adaptation', 'Emissions'],
    adjacent: ['renewable-energy', 'farming'],
  },
  {
    id: 'renewable-energy',
    label: 'Renewable energy',
    name: 'Renewable energy',
    aliases: ['renewable energy', 'renewables', 'solar', 'wind', 'energy', 'clean energy', 'batteries', 'grid'],
    expansion: ['Solar & wind', 'Storage', 'Grids', 'Energy policy', 'Energy markets'],
    adjacent: ['climate', 'manufacturing'],
  },
  {
    id: 'business',
    label: 'Business',
    name: 'Business',
    aliases: ['business', 'companies', 'economy', 'markets', 'corporate', 'startups'],
    expansion: ['Company results', 'Deals & funding', 'Markets', 'Economy', 'Leadership'],
    adjacent: ['finance', 'manufacturing'],
  },
  {
    id: 'finance',
    label: 'Finance',
    name: 'Finance',
    aliases: ['finance', 'investing', 'banking', 'stocks', 'money', 'interest rates'],
    expansion: ['Central banks', 'Markets', 'Banking', 'Personal finance'],
    adjacent: ['business'],
  },
  {
    id: 'health',
    label: 'Health',
    name: 'Health',
    aliases: ['health', 'medicine', 'healthcare', 'wellbeing', 'biotech'],
    expansion: ['Medical research', 'Public health', 'Healthcare systems', 'Biotech'],
    adjacent: ['food'],
  },
  {
    id: 'south-africa',
    label: 'South Africa',
    name: 'South Africa',
    aliases: ['south africa', 'sa', 'rsa', 'mzansi'],
    expansion: ['Politics', 'Economy', 'Energy', 'Business', 'Society'],
    adjacent: ['business', 'renewable-energy'],
  },
  {
    id: 'football',
    label: 'Football',
    name: 'Football',
    aliases: ['football', 'soccer', 'premier league', 'psl'],
    expansion: ['Results', 'Transfers', 'Competitions', 'The business of football'],
    adjacent: [],
  },
  {
    id: 'photography',
    label: 'Photography',
    name: 'Photography',
    aliases: ['photography', 'photos', 'cameras', 'photo'],
    expansion: ['Cameras & lenses', 'Image provenance', 'Photographers', 'Industry'],
    adjacent: ['technology'],
  },
  {
    id: 'cars',
    label: 'Cars',
    name: 'Cars',
    aliases: ['cars', 'automotive', 'motoring', 'evs', 'electric vehicles', 'vehicles'],
    expansion: ['Electric vehicles', 'Carmakers', 'Motorsport', 'Regulation'],
    adjacent: ['manufacturing', 'renewable-energy'],
  },
  {
    id: 'space',
    label: 'Space',
    name: 'Space',
    aliases: ['space', 'astronomy', 'rockets', 'satellites', 'nasa'],
    expansion: ['Launches', 'Science', 'Satellites', 'Commercial space'],
    adjacent: ['technology'],
  },
];

const byId = new Map(TOPIC_CATALOG.map((t) => [t.id, t]));

export function getTopic(id) {
  return byId.get(id) || null;
}

const norm = (s) => s.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}. ]+/gu, ' ').replace(/\s+/g, ' ').trim();

function levenshtein(a, b) {
  if (a === b) return 0;
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

/**
 * Interpret one free-text interest. Returns a topic object; custom topics
 * get a generic expansion and `custom: true`.
 */
export function interpretInterest(text) {
  const q = norm(String(text || ''));
  if (!q) return null;
  // exact alias / id / label
  for (const t of TOPIC_CATALOG) {
    if (t.id === q || norm(t.label) === q || t.aliases.includes(q)) return describe(t);
  }
  // phrase containment ("news about solar power" → renewable energy)
  for (const t of TOPIC_CATALOG) {
    if (t.aliases.some((a) => a.length > 3 && (q.includes(a) || (q.length > 3 && a.includes(q))))) return describe(t);
  }
  // typo tolerance
  let best = null;
  for (const t of TOPIC_CATALOG) {
    for (const a of t.aliases) {
      if (a.length < 4) continue;
      const d = levenshtein(q, a);
      if (d <= (a.length > 7 ? 2 : 1) && (!best || d < best.d)) best = { t, d };
    }
  }
  if (best) return describe(best.t);

  const label = String(text).trim().replace(/\s+/g, ' ');
  const nice = label.charAt(0).toUpperCase() + label.slice(1);
  return {
    id: 'custom-' + q.replace(/[^a-z0-9]+/g, '-'),
    label: nice,
    name: nice,
    custom: true,
    expansion: [`${nice}: news`, `${nice}: policy`, `${nice}: business`, `${nice}: people`],
    adjacent: [],
  };
}

export function describe(t) {
  return { id: t.id, label: t.label, name: t.name, expansion: t.expansion.slice(), adjacent: t.adjacent.slice(), custom: false };
}

/** Resolve a stored topic id (catalog or custom) to a full topic description. */
export function resolveTopic(idOrLabel) {
  if (byId.has(idOrLabel)) return describe(byId.get(idOrLabel));
  if (String(idOrLabel).startsWith('custom-')) return interpretInterest(String(idOrLabel).slice(7).replace(/-/g, ' '));
  return interpretInterest(idOrLabel);
}

/** Deterministic PRNG so "random" choices are reproducible in tests. */
export function seeded(seed) {
  let h = 2166136261;
  for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Random Topic — an unexpected topic the reader does not follow.
 * `available` limits the choice to topics the research layer has material for
 * today, so the surprise is never an empty page.
 */
export function randomTopic(followed, available, seed = Date.now()) {
  const rand = seeded(seed);
  const pool = TOPIC_CATALOG.filter((t) => !followed.includes(t.id) && (!available || available.has(t.id)));
  if (!pool.length) return null;
  return describe(pool[Math.floor(rand() * pool.length)]);
}

/**
 * Feeling Adventurous — walk outward from existing interests one or two steps
 * through the adjacency graph, e.g. AI → Robotics → Manufacturing. Returns the
 * topic plus the path, so the interface can explain the leap.
 */
export function adventurousTopic(followed, available, seed = Date.now()) {
  const rand = seeded(seed);
  const candidates = [];
  for (const start of followed) {
    const t = byId.get(start);
    if (!t) continue;
    for (const a of t.adjacent) {
      if (!followed.includes(a)) candidates.push({ path: [start, a], depth: 1 });
      const at = byId.get(a);
      for (const b of at?.adjacent || []) {
        if (!followed.includes(b) && b !== start && b !== a) candidates.push({ path: [start, a, b], depth: 2 });
      }
    }
  }
  const usable = candidates.filter((c) => !available || available.has(c.path.at(-1)));
  if (!usable.length) return null;
  // Prefer a two-step leap: far enough to be a discovery, close enough to stay relevant.
  const oneStep = new Set(usable.filter((c) => c.depth === 1).map((c) => c.path.at(-1)));
  const twoStep = usable.filter((c) => c.depth === 2 && !oneStep.has(c.path.at(-1)));
  const list = twoStep.length ? twoStep : usable;
  const pick = list[Math.floor(rand() * list.length)];
  return { topic: describe(byId.get(pick.path.at(-1))), path: pick.path.map((id) => byId.get(id).label) };
}
