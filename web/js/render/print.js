// Print / PDF document: the newspaper as an artifact. No navigation, no
// interface — just the edition, set for paper. "Learn more" becomes a short
// printed link to the digital depth layer.

import { renderNewspaper } from './newspaper.js';
import { esc, longDate } from './util.js';

export function renderPrintDocument(ed, mode, { baseUrl = '', autoprint = false, paper = 'A4' } = {}) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Over Coffee — ${esc(longDate(ed.editorialDate))}${mode === 'social' ? ' (Social)' : ''}</title>
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/css/fonts.css">
<link rel="stylesheet" href="/css/paper.css">
<link rel="stylesheet" href="/css/social.css">
<link rel="stylesheet" href="/css/print.css">
<style>@page { size: ${paper === 'Letter' ? 'Letter' : 'A4'}; margin: 12mm 12mm 14mm; }</style>
</head>
<body class="print-body">
${renderNewspaper(ed, mode, { print: true, baseUrl })}
${autoprint ? '<script>window.addEventListener("load", () => setTimeout(() => window.print(), 400));</script>' : ''}
</body>
</html>`;
}
