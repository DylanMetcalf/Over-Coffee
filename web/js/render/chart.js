import { esc } from './util.js';

export const fmtFigure = (f, v) => `${f.unit === '$' ? '$' : ''}${v.toFixed(f.decimals ?? 0)}${f.unit === '%' ? '%' : ''}`;

/** A small, honest bar chart: two or three values, labelled directly, sourced. */
export function chartSvg(figure, sourceName) {
  const max = Math.max(...figure.data.map((d) => d.value));
  const rowH = 38;
  const labelW = Math.max(112, Math.min(170, Math.max(...figure.data.map((d) => String(d.label).length)) * 7 + 10));
  const barW = 150;
  const h = figure.data.length * rowH;
  const fmt = (v) => fmtFigure(figure, v);
  const rows = figure.data
    .map((d, i) => {
      const w = Math.max(6, (d.value / max) * barW);
      const y = i * rowH;
      const last = i === figure.data.length - 1;
      return `<text x="0" y="${y + 23}" class="chart__label">${esc(d.label)}</text>
      <rect x="${labelW}" y="${y + 8}" width="${w.toFixed(1)}" height="22" rx="7" class="chart__bar${last ? ' chart__bar--now' : ''}"/>
      <text x="${(labelW + w + 10).toFixed(1)}" y="${y + 24}" class="chart__value">${fmt(d.value)}</text>`;
    })
    .join('');
  return `<figure class="chart">
  <figcaption class="chart__title">${esc(figure.title)}</figcaption>
  <svg viewBox="0 0 ${labelW + barW + 64} ${h}" role="img" aria-label="${esc(figure.title)}: ${figure.data.map((d) => `${d.label} ${fmt(d.value)}`).join(', ')}">${rows}</svg>
  <div class="chart__source">Source: ${esc(sourceName)}</div>
</figure>`;
}
