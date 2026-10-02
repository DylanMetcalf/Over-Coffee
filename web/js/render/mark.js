// The Over Coffee mark — "the full stop".
//
// An open ring (the C, also the O of a page turned to the light) around a
// solid point. A full stop is the brand's promise: the edition ends. Read
// from above it is also, quietly, a cup and the first light of the morning,
// without ever drawing either.

export function markSvg({ size = 32, title = 'Over Coffee', cls = '', animate = false } = {}) {
  const ring = 'M 41.32 13.14 A 20 20 0 1 0 41.32 38.86';
  return `<svg class="oc-mark ${cls}${animate ? ' oc-mark--draw' : ''}" width="${size}" height="${size}" viewBox="0 0 52 52" role="img" aria-label="${title}">
  <path class="oc-mark__ring" d="${ring}" fill="none" stroke="currentColor" stroke-width="7.2" stroke-linecap="butt" pathLength="100"/>
  <circle class="oc-mark__dot" cx="26" cy="26" r="5.6" fill="currentColor"/>
</svg>`;
}
