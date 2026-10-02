// The Over Coffee mark — "C."
//
// A bold C with its full stop sitting in the mouth of the letter. The full
// stop is the brand promise: the edition ends. Two forms:
//   tile  — gradient squircle, white C, bright dot (app icon, nav, masthead)
//   plain — currentColor C with an accent dot (inline, print, quiet places)

const RING = 'M 40.6 22.4 A 14.5 14.5 0 1 0 40.6 41.6';

let uid = 0;

export function markSvg({ size = 32, title = 'Over Coffee', cls = '', animate = false, tile = true } = {}) {
  const id = `ocg${++uid}`;
  const anim = animate ? ' oc-mark--draw' : '';
  if (!tile) {
    return `<svg class="oc-mark ${cls}${anim}" width="${size}" height="${size}" viewBox="0 0 64 64" role="img" aria-label="${title}">
  <path class="oc-mark__ring" d="${RING}" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round" pathLength="100"/>
  <circle class="oc-mark__dot" cx="49.5" cy="32" r="5" style="fill: var(--mark-dot, currentColor)"/>
</svg>`;
  }
  return `<svg class="oc-mark oc-mark--tile ${cls}${anim}" width="${size}" height="${size}" viewBox="0 0 64 64" role="img" aria-label="${title}">
  <defs><linearGradient id="${id}" x1="6" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ff7a1a"/><stop offset="1" stop-color="#ff2d55"/></linearGradient></defs>
  <rect width="64" height="64" rx="18" fill="url(#${id})"/>
  <path class="oc-mark__ring" d="${RING}" transform="translate(-1.5 0)" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" pathLength="100"/>
  <circle class="oc-mark__dot" cx="48" cy="32" r="5" fill="#fff"/>
</svg>`;
}

/** Standalone SVG file for favicon / app icon. */
export function markFile({ padded = false } = {}) {
  const s = padded ? 0.72 : 1;
  const o = (64 - 64 * s) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<defs><linearGradient id="g" x1="6" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ff7a1a"/><stop offset="1" stop-color="#ff2d55"/></linearGradient></defs>
<rect width="64" height="64" ${padded ? '' : 'rx="18"'} fill="url(#g)"/>
<g transform="translate(${o} ${o}) scale(${s})"><path d="${RING}" transform="translate(-1.5 0)" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round"/><circle cx="48" cy="32" r="5" fill="#fff"/></g>
</svg>`;
}
