// Editorial illustration — generated, geometric, never pretending to be a photo.
//
// Each story gets a composition chosen from its subject, varied by a seed, and
// coloured by the presentation mode through CSS custom properties:
//   --ill-bg, --ill-ink, --ill-accent, --ill-soft, --ill-pop
// Business keeps it to ink and one accent; Social turns the colour up.

function rng(seed) {
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

const W = 400;
const H = 250;
const f = (n) => Math.round(n * 10) / 10;

const MOTIFS = {
  network(r) {
    let s = '';
    const pts = [];
    for (let y = 0; y < 5; y++) for (let x = 0; x < 8; x++) pts.push([40 + x * 46 + (y % 2) * 12, 40 + y * 42]);
    const lit = new Set(pts.map((_, i) => i).filter(() => r() < 0.28));
    for (let i = 0; i < 14; i++) {
      const a = pts[Math.floor(r() * pts.length)];
      const b = pts[Math.floor(r() * pts.length)];
      s += `<path d="M${a[0]} ${a[1]} Q ${f((a[0] + b[0]) / 2 + (r() - 0.5) * 80)} ${f((a[1] + b[1]) / 2 - 40)} ${b[0]} ${b[1]}" fill="none" stroke="var(--ill-soft)" stroke-width="1.2"/>`;
    }
    s += `<circle cx="${f(250 + r() * 60)}" cy="${f(110 + r() * 40)}" r="78" fill="var(--ill-accent)" opacity=".9"/>`;
    pts.forEach((p, i) => (s += `<circle cx="${p[0]}" cy="${p[1]}" r="${lit.has(i) ? 6 : 3}" fill="${lit.has(i) ? 'var(--ill-ink)' : 'var(--ill-soft)'}"/>`));
    return s;
  },
  document(r) {
    let s = `<rect x="70" y="30" width="170" height="200" fill="var(--ill-paper)" stroke="var(--ill-ink)" stroke-width="2"/>`;
    for (let i = 0; i < 9; i++) s += `<rect x="92" y="${58 + i * 17}" width="${f(90 + r() * 36)}" height="5" fill="var(--ill-soft)"/>`;
    s += `<rect x="92" y="58" width="80" height="9" fill="var(--ill-ink)"/>`;
    s += `<circle cx="262" cy="176" r="52" fill="var(--ill-accent)"/><circle cx="262" cy="176" r="38" fill="none" stroke="var(--ill-paper)" stroke-width="2" stroke-dasharray="3 5"/>`;
    s += `<path d="M300 40 L350 40 L350 90" fill="none" stroke="var(--ill-ink)" stroke-width="2"/>`;
    return s;
  },
  chip(r) {
    let s = `<rect x="130" y="55" width="140" height="140" fill="var(--ill-ink)"/><rect x="162" y="87" width="76" height="76" fill="var(--ill-accent)"/>`;
    for (let i = 0; i < 7; i++) {
      const o = 66 + i * 19;
      s += `<rect x="${o}" y="36" width="6" height="19" transform="translate(${130 - 66}, 0)" fill="var(--ill-soft)"/>`;
      s += `<rect x="${o + 64}" y="195" width="6" height="19" fill="var(--ill-soft)"/>`;
      s += `<rect x="111" y="${o}" width="19" height="6" fill="var(--ill-soft)"/>`;
      s += `<rect x="270" y="${o}" width="19" height="6" fill="var(--ill-soft)"/>`;
    }
    const n = 3 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) s += `<rect x="${f(20 + i * 18)}" y="${f(200 - i * 6)}" width="10" height="${f(10 + i * 6)}" fill="var(--ill-pop)"/>`;
    return s;
  },
  weather(r) {
    let s = '';
    const cx = 150 + r() * 40;
    const cy = 120 + r() * 20;
    for (let i = 6; i > 0; i--) s += `<ellipse cx="${f(cx + i * 6)}" cy="${f(cy)}" rx="${i * 30}" ry="${i * 19}" fill="none" stroke="${i % 2 ? 'var(--ill-soft)' : 'var(--ill-ink)'}" stroke-width="${i === 1 ? 2.4 : 1.2}"/>`;
    s += `<circle cx="${f(cx + 150)}" cy="62" r="34" fill="var(--ill-accent)"/>`;
    for (let i = 0; i < 10; i++) s += `<rect x="${30 + i * 34}" y="${f(214 - r() * 30)}" width="20" height="40" fill="${i < 6 ? 'var(--ill-pop)' : 'var(--ill-soft)'}" opacity=".85"/>`;
    return s;
  },
  field(r) {
    let s = `<circle cx="${f(270 + r() * 50)}" cy="104" r="56" fill="var(--ill-accent)"/>`;
    s += `<rect x="0" y="120" width="${W}" height="${H - 120}" fill="var(--ill-bg)"/>`;
    s += `<line x1="0" y1="120" x2="${W}" y2="120" stroke="var(--ill-ink)" stroke-width="2"/>`;
    const vx = 200 + (r() - 0.5) * 60;
    for (let i = -9; i <= 9; i++) s += `<line x1="${f(vx + i * 6)}" y1="120" x2="${f(vx + i * 52)}" y2="${H}" stroke="${i % 3 === 0 ? 'var(--ill-ink)' : 'var(--ill-soft)'}" stroke-width="${i % 3 === 0 ? 1.6 : 1}"/>`;
    for (let i = 0; i < 4; i++) s += `<line x1="0" y1="${130 + i * i * 9 + i * 8}" x2="${W}" y2="${130 + i * i * 9 + i * 8}" stroke="var(--ill-soft)" stroke-width=".8"/>`;
    return s;
  },
  granules(r) {
    let s = '';
    for (let i = 0; i < 70; i++) {
      const x = 30 + r() * 340;
      const y = 120 + Math.pow(r(), 0.6) * 110;
      s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(3 + r() * 6)}" fill="${r() < 0.2 ? 'var(--ill-accent)' : 'var(--ill-soft)'}"/>`;
    }
    s += `<path d="M30 70 L120 70 L150 95 L230 95 L260 120 L370 120" fill="none" stroke="var(--ill-ink)" stroke-width="3"/>`;
    return s;
  },
  pods(r) {
    let s = '';
    for (let i = 0; i < 3; i++) {
      const x = 90 + i * 110;
      const y = 120 + (r() - 0.5) * 30;
      const rot = -20 + r() * 40;
      s += `<g transform="rotate(${f(rot)} ${x} ${f(y)})"><ellipse cx="${x}" cy="${f(y)}" rx="40" ry="78" fill="${i === 1 ? 'var(--ill-accent)' : 'var(--ill-ink)'}"/>`;
      for (let k = -2; k <= 2; k++) s += `<path d="M${x + k * 12} ${f(y - 70 + Math.abs(k) * 8)} Q ${x + k * 18} ${f(y)} ${x + k * 12} ${f(y + 70 - Math.abs(k) * 8)}" fill="none" stroke="var(--ill-paper)" stroke-width="1.2" opacity=".55"/>`;
      s += `</g>`;
    }
    return s;
  },
  cells(r) {
    let s = '';
    for (let i = 0; i < 16; i++) {
      const x = 40 + r() * 320;
      const y = 40 + r() * 170;
      const rad = 10 + r() * 34;
      s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rad)}" fill="none" stroke="${i % 4 === 0 ? 'var(--ill-ink)' : 'var(--ill-soft)'}" stroke-width="1.4"/>`;
      if (i % 5 === 0) s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rad * 0.4)}" fill="var(--ill-accent)"/>`;
    }
    return s;
  },
  blocks(r) {
    let s = '';
    let x = 40;
    for (let i = 0; i < 6; i++) {
      const h = 50 + r() * 120;
      s += `<rect x="${x}" y="${f(220 - h)}" width="44" height="${f(h)}" fill="${i === 3 ? 'var(--ill-accent)' : i % 2 ? 'var(--ill-soft)' : 'var(--ill-ink)'}"/>`;
      x += 54;
    }
    s += `<path d="M330 220 L330 120 L270 70 L230 70" fill="none" stroke="var(--ill-ink)" stroke-width="7" stroke-linejoin="round"/><circle cx="330" cy="120" r="10" fill="var(--ill-pop)"/><circle cx="270" cy="70" r="8" fill="var(--ill-pop)"/>`;
    return s;
  },
  bars(r) {
    let s = `<line x1="40" y1="215" x2="360" y2="215" stroke="var(--ill-ink)" stroke-width="2"/>`;
    for (let i = 0; i < 9; i++) {
      const h = 30 + i * 15 + r() * 20;
      s += `<rect x="${48 + i * 35}" y="${f(215 - h)}" width="22" height="${f(h)}" fill="${i > 5 ? 'var(--ill-accent)' : 'var(--ill-soft)'}"/>`;
    }
    s += `<circle cx="320" cy="58" r="22" fill="none" stroke="var(--ill-ink)" stroke-width="2"/>`;
    return s;
  },
  battery(r) {
    let s = '';
    for (let i = 0; i < 5; i++) {
      const x = 50 + i * 64;
      const fill = 0.3 + r() * 0.7;
      s += `<rect x="${x}" y="60" width="44" height="140" fill="none" stroke="var(--ill-ink)" stroke-width="2"/><rect x="${x + 14}" y="52" width="16" height="8" fill="var(--ill-ink)"/>`;
      s += `<rect x="${x + 5}" y="${f(195 - 130 * fill)}" width="34" height="${f(130 * fill)}" fill="${i === 2 ? 'var(--ill-accent)' : 'var(--ill-soft)'}"/>`;
    }
    let d = 'M0 230';
    for (let x = 0; x <= W; x += 10) d += ` L${x} ${f(230 - Math.sin(x / 40) * 10)}`;
    return s + `<path d="${d}" fill="none" stroke="var(--ill-pop)" stroke-width="3"/>`;
  },
  aperture(r) {
    let s = '';
    const cx = 200;
    const cy = 125;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + r() * 0.1;
      const b = a + Math.PI / 3;
      s += `<path d="M${cx} ${cy} L${f(cx + Math.cos(a) * 100)} ${f(cy + Math.sin(a) * 100)} L${f(cx + Math.cos(b) * 100)} ${f(cy + Math.sin(b) * 100)} Z" fill="${i % 2 ? 'var(--ill-ink)' : 'var(--ill-soft)'}"/>`;
    }
    return s + `<circle cx="${cx}" cy="${cy}" r="34" fill="var(--ill-accent)"/><circle cx="${cx}" cy="${cy}" r="104" fill="none" stroke="var(--ill-ink)" stroke-width="2"/>`;
  },
  brackets(r) {
    let s = '';
    for (let i = 0; i < 8; i++) s += `<rect x="${f(110 + (i % 3) * 20)}" y="${50 + i * 20}" width="${f(60 + r() * 120)}" height="8" fill="${i === 3 ? 'var(--ill-accent)' : 'var(--ill-soft)'}"/>`;
    return s + `<path d="M80 40 L50 125 L80 210 M330 40 L360 125 L330 210" fill="none" stroke="var(--ill-ink)" stroke-width="6"/>`;
  },
};

const BY_SUBTOPIC = {
  'Model releases': 'network',
  Regulation: 'document',
  Hardware: 'chip',
  Research: 'weather',
  'Enterprise adoption': 'bars',
  Investment: 'blocks',
  'Developer tools': 'brackets',
  'Harvest outlook': 'field',
  Inputs: 'granules',
  Machinery: 'field',
  Commodities: 'pods',
  'Food technology': 'cells',
  Automation: 'blocks',
  Storage: 'battery',
  Cameras: 'aperture',
};
const BY_TOPIC = { ai: 'network', technology: 'network', farming: 'field', food: 'pods', robotics: 'blocks', manufacturing: 'blocks', 'renewable-energy': 'battery', climate: 'weather', photography: 'aperture' };

export function illustrationSvg(story, { cls = '' } = {}) {
  const motif = BY_SUBTOPIC[story.subtopic] || BY_TOPIC[story.topicId] || 'cells';
  const r = rng(story.id);
  return `<svg class="ill ${cls}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><rect width="${W}" height="${H}" fill="var(--ill-bg)"/>${MOTIFS[motif](r)}</svg>`;
}
