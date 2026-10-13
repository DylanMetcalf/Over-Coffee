// The Over Coffee identity.
//
//   Wordmark   "over" in italic serif (the conversation) + "coffee" in heavy
//              grotesque (the ritual) + a full stop (the edition ends).
//   Symbol     an italic "c" with the full stop. The dot is the sunrise, the
//              coffee ring and the full stop at once.
//   Monogram   "oc." for larger places that can hold two letters.
//
// All letterforms are outlined (logo-paths.js), so the logo never depends on a
// web font and renders identically in the app, in email, in PDF and as a file.

import { OVER_PATH, OVER_W, COFFEE_PATH, COFFEE_W, DOT_PATH, DOT_W, C_PATH, OC_PATH } from './logo-paths.js';

export const BRAND = {
  paper: ['#fbf8f3', '#f1ebe1'], // warm newsprint tile
  paperEdge: '#e4dccf',
  sun: '#ffd93d',
  ink: '#0a0b10',
  red: '#ff2d55',
  redOnDark: '#ff5a3c',
};

let uid = 0;

// Glyph placement inside the 64×64 symbol box.
const C_SCALE = 0.088;
const C_BOX = { x0: 15, x1: 352, y0: -516, y1: 9 }; // outline bounds, font units
const C_AT = { cx: 29, cy: 30.5 };
const OC_SCALE = 0.058;
const OC_BOX = { x0: 20, x1: 703, y0: -516, y1: 9 };
const OC_AT = { cx: 29, cy: 31 };

function place(box, at, s) {
  const cx = (box.x0 + box.x1) / 2;
  const cy = (box.y0 + box.y1) / 2;
  return `translate(${(at.cx - cx * s).toFixed(2)} ${(at.cy - cy * s).toFixed(2)}) scale(${s})`;
}

/** The symbol glyph on a 64×64 canvas. `ink` = letter colour, `sun` = the dot. */
export function glyph({ ink = '#fff', sun = BRAND.sun, mono = false, monogram = false, bold = false } = {}) {
  // Small sizes: thicken the hairlines so the italic holds up at 16px.
  const stroke = bold ? ` stroke="${ink}" stroke-width="${monogram ? 46 : 40}" stroke-linejoin="round"` : '';
  if (monogram) {
    return `<g class="oc-mark__c" transform="${place(OC_BOX, OC_AT, OC_SCALE)}"><path d="${OC_PATH}" fill="${ink}"${stroke}/></g><circle class="oc-mark__dot" cx="53" cy="44" r="4.1" fill="${mono ? ink : sun}"/>`;
  }
  return `<g class="oc-mark__c" transform="${place(C_BOX, C_AT, C_SCALE)}"><path d="${C_PATH}" fill="${ink}"${stroke}/></g><circle class="oc-mark__dot" cx="47.5" cy="45" r="5.6" fill="${mono ? ink : sun}"/>`;
}

function tileDefs(id) {
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${BRAND.paper[0]}"/><stop offset="1" stop-color="${BRAND.paper[1]}"/></linearGradient><linearGradient id="${id}k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a1b22"/><stop offset="1" stop-color="${BRAND.ink}"/></linearGradient></defs>`;
}

/**
 * The symbol. `tone`: 'color' (gradient tile), 'dark' (espresso tile), 'light'
 * (white tile), 'mono' (single colour, no tile), 'plain' (ink letter, no tile).
 */
export function markSvg({ size = 32, title = 'Over Coffee', cls = '', animate = false, tone = 'color', monogram = false, rx = 18 } = {}) {
  const id = `ocg${++uid}`;
  const bold = size <= 28;
  const anim = animate ? ' oc-mark--draw' : '';
  const open = `<svg class="oc-mark oc-mark--${tone} ${cls}${anim}" width="${size}" height="${size}" viewBox="0 0 64 64" role="img" aria-label="${title}">`;
  if (tone === 'plain' || tone === 'mono') {
    return `${open}${glyph({ ink: 'currentColor', sun: 'var(--mark-dot, #ff2d55)', mono: tone === 'mono', monogram, bold })}</svg>`;
  }
  const rect = (fill, edge) => `<rect x="0.75" y="0.75" width="62.5" height="62.5" rx="${rx}" fill="${fill}"${edge ? ` stroke="${edge}" stroke-width="1.5"` : ''}/>`;
  if (tone === 'dark') {
    return `${open}${tileDefs(id)}${rect(`url(#${id}k)`)}${glyph({ ink: '#fff', sun: BRAND.redOnDark, monogram, bold })}</svg>`;
  }
  // 'color' and 'light' are the same quiet paper tile: ink letter, one red dot.
  return `${open}${tileDefs(id)}${rect(`url(#${id})`, BRAND.paperEdge)}${glyph({ ink: BRAND.ink, sun: BRAND.red, monogram, bold })}</svg>`;
}

/**
 * The wordmark as outlines. `height` is the height of the glyph box in px
 * (the svg is sized so the lowercase letters sit on a shared baseline).
 */
export function wordmarkSvg({ height = 32, ink = 'currentColor', accent = BRAND.red, dot = true, over = true, title = 'Over Coffee', cls = '' } = {}) {
  const gap = 120;
  const parts = [];
  let x = 0;
  if (over) {
    parts.push(`<path d="${OVER_PATH}" fill="${accent}"/>`);
    x += OVER_W + gap;
  }
  parts.push(`<g transform="translate(${x} 0)"><path d="${COFFEE_PATH}" fill="${ink}"/></g>`);
  x += COFFEE_W;
  if (dot) parts.push(`<g transform="translate(${x} 0)"><path d="${DOT_PATH}" fill="${accent}"/></g>`);
  if (dot) x += DOT_W;
  const top = -740;
  const h = 780; // ascender to just below baseline
  const w = height * (x / h);
  return `<svg class="oc-word ${cls}" width="${w.toFixed(1)}" height="${height}" viewBox="0 ${top} ${x} ${h}" role="img" aria-label="${title}">${parts.join('')}</svg>`;
}

/** Wordmark + symbol side by side (header, app bar). */
export function lockupSvg({ height = 32, ink = 'currentColor', accent = BRAND.red, tone = 'color' } = {}) {
  return `<span class="oc-lockup" style="display:inline-flex;align-items:center;gap:${Math.round(height * 0.38)}px">${markSvg({ size: Math.round(height * 1.15), tone })}${wordmarkSvg({ height: Math.round(height * 0.78), ink, accent })}</span>`;
}

/** Standalone SVG files (favicon, app icon, logo downloads). */
export function markFile({ tone = 'color', padded = false, monogram = false, bold = false } = {}) {
  const id = 'g';
  const s = padded ? 0.74 : 1;
  const o = (64 - 64 * s) / 2;
  const rx = padded ? 0 : 18; // padded = full-bleed, the OS rounds it
  const inset = padded ? 0 : 0.75;
  const size = 64 - inset * 2;
  const tile = (fill, edge) => `<rect x="${inset}" y="${inset}" width="${size}" height="${size}" rx="${rx}" fill="${fill}"${edge && !padded ? ` stroke="${edge}" stroke-width="1.5"` : ''}/>`;
  let bg = '';
  let inner;
  if (tone === 'dark') {
    bg = tile(`url(#${id}k)`);
    inner = glyph({ ink: '#fff', sun: BRAND.redOnDark, monogram, bold });
  } else if (tone === 'mono') {
    inner = glyph({ ink: BRAND.ink, mono: true, monogram, bold });
  } else {
    bg = tile(`url(#${id})`, BRAND.paperEdge);
    inner = glyph({ ink: BRAND.ink, sun: BRAND.red, monogram, bold });
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${tone === 'mono' ? '' : tileDefs(id)}${bg}<g transform="translate(${o} ${o}) scale(${s})">${inner}</g></svg>\n`;
}

export function wordmarkFile({ ink = BRAND.ink, accent = BRAND.red, height = 100 } = {}) {
  return wordmarkSvg({ height, ink, accent }).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ') + '\n';
}
