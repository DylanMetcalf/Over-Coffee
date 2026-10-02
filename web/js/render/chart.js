import { esc } from './util.js';

/** A small, honest bar chart: two or three values, labelled directly, sourced. */
export function chartSvg(figure, sourceName) {
  const max = Math.max(...figure.data.map((d) => d.value));
  const rowH = 34;
  const labelW = 132;
  const barW = 210;
  const h = figure.data.length * rowH + 4;
  const fmt = (v) => `${figure.unit === '$' ? '$' : ''}${v.toFixed(figure.decimals ?? 0)}${figure.unit === '%' ? '%' : ''}`;
  const rows = figure.data
    .map((d, i) => {
      const w = Math.max(2, (d.value / max) * barW);
      const y = i * rowH;
      const last = i === figure.data.length - 1;
      return `<text x="0" y="${y + 21}" class="chart__label">${esc(d.label)}</text>
      <rect x="${labelW}" y="${y + 7}" width="${w.toFixed(1)}" height="20" class="chart__bar${last ? ' chart__bar--now' : ''}"/>
      <text x="${(labelW + w + 8).toFixed(1)}" y="${y + 22}" class="chart__value">${fmt(d.value)}</text>`;
    })
    .join('');
  return `<figure class="chart">
  <figcaption class="chart__title">${esc(figure.title)}</figcaption>
  <svg viewBox="0 0 ${labelW + barW + 60} ${h}" role="img" aria-label="${esc(figure.title)}: ${figure.data.map((d) => `${d.label} ${fmt(d.value)}`).join(', ')}">${rows}</svg>
  <div class="chart__source">Source: ${esc(sourceName)}</div>
</figure>`;
}
