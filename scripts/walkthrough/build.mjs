// Builds the Over Coffee product walkthrough PDF from captured screenshots.
//   node scripts/walkthrough/build.mjs <shotsDir> <out.pdf>
// Run capture.mjs first. Needs Chromium (PDF) and poppler's pdftoppm + ImageMagick
// (newspaper page images, splitting tall screenshots).

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { renderPdf } from '../../server/delivery/pdf.js';
import { markSvg } from '../../web/js/render/mark.js';

const SHOTS = path.resolve(process.argv[2] || 'data/walkthrough/shots');
const OUT = path.resolve(process.argv[3] || 'docs/walkthrough/Over-Coffee-Walkthrough.pdf');
const ROOT = path.resolve('.');
const data = JSON.parse(fs.readFileSync(path.join(SHOTS, 'manifest.json'), 'utf8'));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ── image helpers ──
const size = (f) => execFileSync('identify', ['-format', '%w %h', f]).toString().split(' ').map(Number);
/** Split very tall screenshots so each part stays readable on an A4 page. */
function parts(name) {
  const file = path.join(SHOTS, `${name}.jpg`);
  const [w, h] = size(file);
  const maxRatio = 1.32;
  if (h / w <= maxRatio * 1.15) return [file];
  const n = Math.ceil(h / (w * maxRatio));
  const step = Math.ceil(h / n);
  const out = [];
  for (let i = 0; i < n; i++) {
    const f = path.join(SHOTS, `${name}--${i + 1}.jpg`);
    execFileSync('convert', [file, '-crop', `${w}x${step + 40}+0+${Math.max(0, i * step - (i ? 40 : 0))}`, '+repage', '-quality', '84', f]);
    out.push(f);
  }
  return out;
}
const pagesDir = path.join(SHOTS, 'pages');
fs.mkdirSync(pagesDir, { recursive: true });
const PREVIEW_FILES = [
  ['N1', 'preview-1-ai-business', 'Preview 1 — AI · Business'],
  ['N2', 'preview-2-ai-food-farming-business', 'Preview 2 — AI · Food · Farming · Business'],
  ['N3', 'preview-3-ai-social', 'Preview 3 — AI · Social'],
  ['N4', 'preview-4-ai-food-farming-social', 'Preview 4 — AI · Food · Farming · Social'],
];
for (const [, base] of PREVIEW_FILES) execFileSync('pdftoppm', ['-r', '80', '-jpeg', '-jpegopt', 'quality=86', path.join(ROOT, 'samples', `${base}.pdf`), path.join(pagesDir, base)]);
const pagesOf = (base) => fs.readdirSync(pagesDir).filter((f) => f.startsWith(base + '-')).sort().map((f) => path.join(pagesDir, f));
const url = (f) => pathToFileURL(f).href;

// ── content ──
const P = data.previews;
const SECTIONS = [
  {
    id: 'A',
    title: 'Arriving',
    intro: 'From first open to first newspaper in five short steps. Onboarding asks only what the editor cannot work out alone.',
    screens: [
      ['S01', 'ob-1-empty', 'What do you want to know about?', '#/welcome', 'The first question, in the reader’s own words. No category trees, no hundred filters.', ['The tone of the opening question', 'Suggested topics as quiet text chips, not icons', '“Skip — show me a sample edition” for the impatient']],
      ['S02', 'ob-1-topics', 'Interests, understood', '#/welcome', '“artificial intelligence, agriculture” was typed; the engine mapped it to AI and Farming and shows how it will expand the last topic into research areas.', ['Plain-language interpretation (agriculture → Farming)', 'The expansion line: what “AI” will actually cover', 'Typos and unknown topics are accepted rather than rejected']],
      ['S03', 'ob-2-time', 'How much time do you have?', '#/welcome?step=2', 'Five, ten or twenty minutes — framed as a reading budget, never a story count.', ['“If today only needs four minutes, you get four.”']],
      ['S04', 'ob-3-mode', 'How do you want it presented?', '#/welcome?step=3', 'Business or Social, shown with the same real story in each voice so the choice is concrete.', ['The two sample cards are the actual wheat story in both voices']],
      ['S05', 'ob-4-delivery', 'When should your newspaper arrive?', '#/welcome?step=4', 'Delivery time and channel. Everything else defaults to “let the editor decide”.', []],
      ['S06', 'ob-5-generating', 'Setting your first edition', '#/welcome?step=5', 'The loading state is the engine’s real stage log, replayed: 41 articles, 16 events, verification counts, the editorial bar. The mark draws itself while the edition is set.', ['Each line is a real pipeline stage and its real note']],
      ['S07', 'home', 'Home — the entrance to the publication', '#/', 'Not a dashboard. Date, a greeting, the size of today’s edition, the reader’s topics, and two actions.', ['“Your 5-minute edition” on a 10-minute budget: no padding', 'Prepared time, sources reviewed, audio length — small, honest metadata', 'Change today’s paper, and the four prototype editions, as quiet links']],
    ],
  },
  {
    id: 'B',
    title: 'The newspaper — Business edition',
    intro: 'The primary product surface. A finite newspaper: masthead, front page, sections decided by the editor, and an ending.',
    screens: [
      ['S08', 'b-front', 'Front page', '#/read/…?mode=business', 'A black dateline bar with the mark, the masthead, then a key-figures strip: the day’s headline numbers at a glance, every one sourced. Below, a lead chosen on significance (here Farming, not AI) and a rail with Today in brief, a black “One thing to remember” takeaway and the edition index.', ['Key figures show the previous value, never a computed change', 'Verification label next to every kicker (Confirmed / Reported / Emerging …)', 'Two-column lead with drop cap, chart, “Why it matters / What changed / What happens next”', '“Learn more” as a quiet continuation, not a button', 'Section sizes in the index are unequal on purpose: Farming 3 · AI 4 · Food 1']],
      ['S09', 'b-sec-farming', 'Section — Farming', '', 'Sections are ruled, columned and ordered by their strongest story. The weather study sits in Farming for this reader and is tagged “Also matters for AI” — one event, one story.', ['“Emerging · not yet peer reviewed” on the preprint story']],
      ['S10', 'b-sec-ai', 'Section — AI', '', 'Feature story with editorial illustration and chart, then standard stories in columns.', ['Charts carry only sourced figures (the quality gate checks every value)']],
      ['S11', 'b-sec-food', 'Section — Food', '', 'One story today. Food didn’t get an equal share just because it is a topic.', []],
      ['S12', 'b-colophon', 'The ending', '', '“That’s today’s edition. You’re done.” Plus what the edition cost to make: sources, developments considered, quality checks.', ['The finite edition rule, made visible']],
    ],
  },
  {
    id: 'C',
    title: 'The newspaper — Social edition',
    intro: 'The same stored edition, rendered in a friend’s voice. Same facts, figures, sources and caveats; warmer type, more colour, playful devices.',
    screens: [
      ['S13', 's-top', 'Greeting and the 30-second version', '#/read/…?mode=social', '“Morning. Here’s what happened.” Topic chips in their colours, and the whole edition in eight lines.', ['Fraunces (soft, expressive) replaces Newsreader; Instrument Sans for reading']],
      ['S14', 's-lead', 'The big one today', '', 'Lead story with illustration, “The short version”, a sourced chart, “Why people care”, an attributed quote and a “Did you know?”.', ['Translated, not dumbed down: the numbers are identical to Business']],
      ['S15', 's-full', 'A full story, alternating layout', '', 'Art alternates sides; the emerging-evidence caveat is said plainly (“Big caveat: the study hasn’t been peer reviewed yet”).', []],
      ['S16', 's-standard', 'A standard story', '', 'Stories without art get a big number in the margin and a readable line length.', []],
      ['S17', 's-end', 'Quiz, one thing to remember, the ending', '', '“Three questions over coffee” built only from facts in today’s edition, then the one thing to remember, then done.', []],
      ['S18', 's-quiz-answered', 'Quiz, answered', '', 'Tapping an answer reveals the right one. On paper the answers are printed upside down.', []],
    ],
  },
  {
    id: 'D',
    title: 'The depth layer',
    intro: 'Newspaper → Story → Sources → Original source. Optional, for the curious. The newspaper works without it.',
    screens: [
      ['S19', 'd-top', 'Story view — header', '#/story/…', 'Back to the edition, the headline, and a one-line evidence summary: sources, publishers and how many claims are confirmed vs reported.', []],
      ['S20', 'd-main', 'Story view — the full story', '', 'The story, What happened (timeline), Why it matters, What changed, What people are saying, What happens next — and “How we know”: every claim with its status and the sources behind it. A legend explains the labels; related developments link across the edition.', ['Claim → Event → Source provenance, visible to the reader', '“Considered, not in today’s edition” for related events that didn’t run']],
      ['S21', 'd-sources', 'Sources & further reading', '', 'Sources as editorial items with meaningful headings — the reader knows why each is there before clicking.', ['Primary sources first, then independent reporting, then analysis']],
      ['S22', 'd-source', 'Original source', '#/source/…', 'What the source is, the excerpt relied on, which claims it supports, and how it was assessed. In a live edition this opens the publisher; sample sources say clearly they have no original.', []],
      ['S23', 'd-social', 'Story view — Social voice', '#/story/…?mode=social', 'The same depth layer in the Social voice: headings like “Okay, so here’s the story” and “How sure are we?”.', []],
    ],
  },
  {
    id: 'E',
    title: 'Everyday controls',
    intro: 'Minimal navigation — Today · My topics · Settings · Download — and a few deliberate controls.',
    screens: [
      ['S24', 'sheet-change', 'Change today’s paper', 'Home → Change today’s paper', 'Pick topics for today only, try a Random topic, or Feeling adventurous — which walks out from existing interests and shows the route (here AI → Technology → Photography).', ['Today-only by default; “Keep these as my topics” is opt-in']],
      ['S25', 'sheet-listen', 'Listen to the summary', 'Home → Listen', 'A short spoken summary (about a minute), not the whole paper read aloud. Transcript highlights as it plays.', []],
      ['S26', 'topics', 'My topics', '#/topics', 'What you follow and how each topic is expanded; add anything in plain words; explore the catalogue (dots mark topics with material today); the today-only controls.', []],
      ['S27', 'settings', 'Settings — “Let the editor decide.”', '#/settings', 'Reading time, presentation, delivery time and channel, discovery, PDF paper size, audio. Nothing else.', []],
      ['S28', 'download', 'Download', '#/download', 'PDF in either voice, audio, email, and the archive of past editions — each with its edition record.', []],
    ],
  },
  {
    id: 'F',
    title: 'Comparison and audit',
    intro: 'For evaluating the product: the four prototype editions side by side, and the record of how any edition was made.',
    screens: [
      ['S29', 'c-matrix', 'Four newspapers, one engine', '#/compare', 'The 2×2 of Single/Multi × Business/Social, with story counts and reading times; a budget switch (5/10/20) and three comparison views.', []],
      ['S30', 'c-modes', 'Business vs Social, side by side', '#/compare?view=modes', 'Both columns are the same stored edition. Switching voice re-renders; it never re-researches or re-writes.', []],
      ['S31', 'c-topics', 'Single vs multi-topic, side by side', '#/compare?view=topics', 'The single-topic AI edition next to AI · Food · Farming. The multi-topic lead is a Farming story.', []],
      ['S32', 'c-five', 'A 5-minute budget', '#/compare?m=5', 'At five minutes the bar rises: four stories, and Food is honestly quiet.', []],
      ['S33', 'r-pipeline', 'Edition record — the pipeline', '#/edition/…', 'All 14 stages with what each did for this edition: research cache hits, 41 articles → 16 events, claim statuses, the bar, the writer, quality result.', []],
      ['S34', 'r-decisions', 'Edition record — editorial decisions', '', 'Every development considered, with its score breakdown and decision: published (and at what depth), held (and why), rejected (and why).', ['Rejected: celebrity chef, giant pumpkin, deepfake ad — with reasons']],
      ['S35', 'r-quality', 'Edition record — quality gate', '', 'Eleven checks run on both voices before delivery: provenance, unsupported figures, verbatim quotes, duplication, freshness, budget, language, uncertainty, clarity, balance, honest silence.', []],
    ],
  },
];

const PHONE = [
  ['m-home', 'Home'],
  ['m-business', 'Business'],
  ['m-social', 'Social'],
  ['m-story', 'Story view'],
];

function screenBlock([sid, shot, title, route, what, look]) {
  const imgs = parts(shot);
  return imgs
    .map(
      (f, i) => `<section class="screen${i ? ' screen--cont' : ''}" id="${sid}">
  <header class="screen__head"><span class="sid">${sid}${imgs.length > 1 ? `<small>${i + 1}/${imgs.length}</small>` : ''}</span><h3>${esc(title)}${i ? ' <em>(continued)</em>' : ''}</h3>${route && !i ? `<code>${esc(route)}</code>` : ''}</header>
  ${!i ? `<p class="what">${esc(what)}</p>` : ''}
  <figure class="shot"><img src="${url(f)}" alt=""></figure>
  ${!i && look.length ? `<ul class="look">${look.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}
</section>`,
    )
    .join('');
}

const allScreens = SECTIONS.flatMap((s) => s.screens);
const mark = (size, cls = '') => markSvg({ size, cls });

const contents = [
  ['1', 'How to use this document'],
  ['2', 'Over Coffee in one page'],
  ['3', 'Brand'],
  ['4', 'The editorial engine'],
  ...SECTIONS.map((s) => [s.id, `${s.title} — ${s.screens[0][0]}–${s.screens.at(-1)[0]}`]),
  ['G', 'On a phone — S36'],
  ['H', 'The four newspapers — N1–N4'],
  ['I', 'What’s real, what’s sample, what’s next'],
  ['J', 'Feedback sheet'],
];

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Over Coffee — Product walkthrough</title>
<link rel="stylesheet" href="${url(path.join(ROOT, 'web/css/fonts.css'))}">
<style>
@page { size: A4; margin: 16mm 15mm 17mm;
  @bottom-left { content: 'Over Coffee · Product walkthrough · Design prototype v0.1'; font: 600 7pt 'Instrument Sans', sans-serif; letter-spacing: .08em; text-transform: uppercase; color: #8b8b90; }
  @bottom-right { content: counter(page); font: 600 8pt 'Instrument Sans', sans-serif; color: #8b8b90; }
}
@page :first { @bottom-left { content: none } @bottom-right { content: none } }
:root { --paper:#ffffff; --paper2:#f4f4f2; --ink:#0b0b0c; --ink2:#2e2e31; --muted:#6b6b70; --hair:#e0e0dc; --accent:#d42a1c; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font-family: 'Newsreader', Georgia, serif; color: var(--ink); font-size: 10.5pt; line-height: 1.45; }
h1, h2, h3 { font-family: 'Newsreader', serif; font-weight: 600; letter-spacing: -.015em; margin: 0; }
.sans { font-family: 'Instrument Sans', sans-serif; }
.eyebrow { font: 700 7.5pt 'Instrument Sans', sans-serif; letter-spacing: .17em; text-transform: uppercase; color: var(--accent); margin: 0 0 3mm; }
.page { break-before: page; }
.lede { font-style: italic; font-size: 12.5pt; color: var(--ink2); margin: 0 0 6mm; }
p { margin: 0 0 2.6mm; }

/* cover */
.cover { break-after: page; padding: 6mm 4mm 0; }
.cover .oc-mark { color: var(--accent); }
.cover__mast { border-top: 3px solid var(--ink); border-bottom: 1px solid var(--ink); padding: 2mm 0 0; margin-top: 10mm; }
.cover__title { font-size: 74pt; font-weight: 500; font-variation-settings: 'opsz' 72; letter-spacing: -.03em; line-height: .95; margin: 8mm 0 0; }
.cover__sub { font: 700 9pt 'Instrument Sans', sans-serif; letter-spacing: .2em; text-transform: uppercase; margin: 7mm 0 3mm; }
.cover__tag { font-style: italic; font-size: 19pt; color: var(--ink2); margin: 0 0 10mm; }
.cover__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; }
.cover__grid img { width: 100%; height: 118mm; object-fit: cover; object-position: top; border: 1px solid var(--hair); display: block; box-shadow: 0 1.5mm 4mm rgba(0,0,0,.12); }
.cover__foot { display: flex; justify-content: space-between; font: 600 7.5pt 'Instrument Sans', sans-serif; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); border-top: 1px solid var(--ink); padding-top: 3mm; margin-top: 8mm; }
.sample { font: 500 8pt 'Instrument Sans', sans-serif; background: var(--paper2); border-left: 3px solid var(--accent); padding: 2.4mm 3.5mm; margin: 0 0 6mm; }
.sample b { text-transform: uppercase; letter-spacing: .1em; font-size: 7.5pt; }

/* blocks */
.toc { list-style: none; padding: 0; margin: 4mm 0 0; border-top: 1px solid var(--ink); }
.toc li { display: grid; grid-template-columns: 12mm 1fr; padding: 2.2mm 0; border-bottom: 1px dotted var(--hair); font-size: 12pt; }
.toc b { font: 700 9pt 'Instrument Sans', sans-serif; color: var(--accent); }
.cols2 { display: grid; grid-template-columns: 1fr 1fr; gap: 7mm; }
.card { border-top: 2px solid var(--ink); padding-top: 2.5mm; }
.card h3 { font-size: 13pt; margin-bottom: 1.5mm; }
.card p { font-size: 10pt; color: var(--ink2); }
.k { font: 700 7.5pt 'Instrument Sans', sans-serif; letter-spacing: .14em; text-transform: uppercase; margin: 0 0 2mm; }
.big { font-size: 26pt; line-height: 1.05; font-weight: 500; letter-spacing: -.02em; margin: 0 0 5mm; }
.rule { border: 0; border-top: 1px solid var(--hair); margin: 5mm 0; }
.section-title { break-before: page; padding-top: 30mm; }
.section-title .letter { font: 700 10pt 'Instrument Sans', sans-serif; letter-spacing: .2em; color: var(--accent); }
.section-title h2 { font-size: 40pt; font-weight: 500; line-height: 1; margin: 3mm 0 6mm; border-bottom: 3px solid var(--ink); padding-bottom: 5mm; }
.section-title p { font-style: italic; font-size: 14pt; color: var(--ink2); max-width: 150mm; }

.screen { break-inside: avoid; margin: 0 0 9mm; }
.screen--cont { break-before: page; }
.screen__head { display: flex; align-items: baseline; gap: 3.5mm; border-top: 2px solid var(--ink); padding-top: 2mm; margin-bottom: 2mm; }
.sid { font: 800 10pt 'Instrument Sans', sans-serif; color: #fff; background: var(--accent); padding: 1.1mm 2.2mm .9mm; letter-spacing: .05em; align-self: center; }
.sid small { font-size: 7pt; margin-left: 1.5mm; opacity: .85; }
.screen__head h3 { font-size: 15pt; flex: 1; }
.screen__head em { font-weight: 400; color: var(--muted); font-size: 11pt; }
.screen__head code { font: 500 7.5pt 'Instrument Sans', sans-serif; color: var(--muted); }
.what { font-size: 10.5pt; color: var(--ink2); margin-bottom: 3mm; }
.shot { margin: 0; border: 1px solid var(--hair); background: #fff; }
.shot img { display: block; width: 100%; max-height: 205mm; object-fit: contain; object-position: top; }
.look { margin: 2.5mm 0 0; padding: 0; list-style: none; columns: 2; column-gap: 6mm; font: 400 8.6pt/1.4 'Instrument Sans', sans-serif; color: var(--ink2); }
.look li { break-inside: avoid; padding-left: 3.5mm; position: relative; margin-bottom: 1mm; }
.look li::before { content: ''; position: absolute; left: 0; top: 1.6mm; width: 1.6mm; height: 1.6mm; background: var(--accent); border-radius: 50%; }

.phones { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4mm; }
.phones figure { margin: 0; }
.phones img { width: 100%; border: 1px solid #222; border-radius: 4mm; display: block; }
.phones figcaption { font: 700 7.5pt 'Instrument Sans', sans-serif; letter-spacing: .12em; text-transform: uppercase; text-align: center; margin-top: 2mm; }

/* brand */
.marks { display: flex; align-items: flex-end; gap: 9mm; padding: 6mm 0; border-bottom: 1px solid var(--hair); }
.marks .oc-mark { color: var(--accent); }
.marks figure { margin: 0; text-align: center; }
.marks figcaption, .sw figcaption { font: 600 7pt 'Instrument Sans', sans-serif; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); margin-top: 2mm; }
.appicon { width: 26mm; height: 26mm; border-radius: 6mm; background: var(--ink); display: grid; place-items: center; }
.appicon .oc-mark { color: var(--paper) !important; }
.appicon .oc-mark circle { fill: #e3352a; }
.swatches { display: grid; grid-template-columns: repeat(6, 1fr); gap: 3mm; margin: 4mm 0; }
.sw { margin: 0; }
.sw div { height: 15mm; border: 1px solid var(--hair); }
.type { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6mm; margin-top: 5mm; }
.type div { border-top: 2px solid var(--ink); padding-top: 2mm; }
.type .sample-n { font-family: 'Newsreader'; font-size: 30pt; font-weight: 600; line-height: 1; }
.type .sample-f { font-family: 'Fraunces'; font-variation-settings: 'SOFT' 100; font-size: 30pt; font-weight: 700; line-height: 1; }
.type .sample-i { font-family: 'Instrument Sans'; font-size: 24pt; font-weight: 600; line-height: 1.1; }

/* engine */
.stages { columns: 2; column-gap: 8mm; list-style: none; padding: 0; margin: 3mm 0 0; border-top: 1px solid var(--ink); }
.stages li { break-inside: avoid; display: grid; grid-template-columns: 9mm 1fr; padding: 1.8mm 0; border-bottom: 1px dotted var(--hair); font-size: 9.6pt; }
.stages b { font: 700 8pt 'Instrument Sans', sans-serif; color: var(--accent); }
.stages strong { font-weight: 600; }
.funnel { display: grid; grid-template-columns: repeat(5, 1fr); border: 1px solid var(--ink); margin: 5mm 0; }
.funnel div { padding: 3mm; border-left: 1px solid var(--hair); }
.funnel div:first-child { border-left: 0; }
.funnel b { display: block; font-size: 24pt; font-weight: 500; line-height: 1; }
.funnel span { font: 600 7pt 'Instrument Sans', sans-serif; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); }
.status { font: 700 7.5pt 'Instrument Sans', sans-serif; letter-spacing: .1em; text-transform: uppercase; }
.legend { display: grid; grid-template-columns: repeat(5, 1fr); gap: 3mm; font: 400 8.5pt/1.35 'Instrument Sans', sans-serif; color: var(--ink2); }

/* newspapers */
table.cmp { width: 100%; border-collapse: collapse; font: 400 9pt 'Instrument Sans', sans-serif; margin: 4mm 0 6mm; }
.cmp th { text-align: left; font: 700 7pt 'Instrument Sans', sans-serif; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); border-bottom: 1px solid var(--ink); padding: 1.5mm 2mm 1.5mm 0; }
.cmp td { border-bottom: 1px solid var(--hair); padding: 2mm 2mm 2mm 0; vertical-align: top; }
.cmp td:first-child { font: 800 9pt 'Instrument Sans', sans-serif; color: var(--accent); }
.news-head { display: flex; align-items: baseline; gap: 3.5mm; border-top: 2px solid var(--ink); padding-top: 2mm; margin-bottom: 3mm; }
.news-head h3 { font-size: 16pt; flex: 1; }
.news-head span { font: 500 8pt 'Instrument Sans', sans-serif; color: var(--muted); }
.pages { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; }
.pages--4 { grid-template-columns: repeat(4, 1fr); }
.pages figure { margin: 0; break-inside: avoid; }
.pages img { width: 100%; display: block; border: 1px solid var(--hair); box-shadow: 0 1mm 2mm rgba(0,0,0,.08); }
.pages figcaption { font: 600 7pt 'Instrument Sans', sans-serif; color: var(--muted); text-align: center; margin-top: 1.2mm; letter-spacing: .08em; text-transform: uppercase; }
.frontpage { width: 74%; margin: 0 auto; display: block; border: 1px solid var(--hair); box-shadow: 0 1.5mm 4mm rgba(0,0,0,.12); }

/* feedback */
.fb { width: 100%; border-collapse: collapse; font: 400 9pt 'Instrument Sans', sans-serif; }
.fb th { text-align: left; font: 700 7pt 'Instrument Sans', sans-serif; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); border-bottom: 1px solid var(--ink); padding: 1.5mm 0; }
.fb td { border-bottom: 1px solid var(--hair); height: 8.6mm; padding: 0 2mm 0 0; vertical-align: middle; }
.fb td:first-child { width: 13mm; font-weight: 800; color: var(--accent); }
.fb td:nth-child(2) { width: 62mm; color: var(--ink2); }
ul.plain { padding-left: 4.5mm; margin: 0; }
ul.plain li { margin-bottom: 1.6mm; }
</style></head><body>

<!-- COVER -->
<div class="cover">
  ${mark(46)}
  <div class="cover__mast"></div>
  <h1 class="cover__title">Over Coffee</h1>
  <p class="cover__sub">Product walkthrough · Design prototype v0.1</p>
  <p class="cover__tag">Good morning. Here’s what matters.</p>
  <div class="cover__grid">
    <img src="${url(pagesOf('preview-2-ai-food-farming-business')[0])}" alt="">
    <img src="${url(pagesOf('preview-4-ai-food-farming-social')[0])}" alt="">
  </div>
  <div class="cover__foot"><span>Friday 2 October 2026</span><span>Business &amp; Social editions</span><span>Sample content — fictional</span></div>
</div>

<!-- 1 HOW TO USE -->
<section class="page">
  <p class="eyebrow">1 · How to use this document</p>
  <h2 class="big">Everything in one place — no links required.</h2>
  <div class="sample"><b>Design prototype — sample edition.</b> Every organisation, person, quote and figure in the newspapers is fictional and was written to exercise the product. None of it is current news. The software, the editorial engine and the design are real.</div>
  <div class="cols2">
    <div>
      <p class="k">How to comment</p>
      <p>Every screen has a number: <b>S01–S36</b> for the app, <b>N1–N4</b> for the four newspapers. Comment by number — for example “S08: the lead headline is too long” or “N4 page 3: the quiz feels busy”. A feedback sheet at the end lists every number with space for notes.</p>
      <p class="k" style="margin-top:5mm">What the screenshots are</p>
      <p>Real captures of the running app at desktop width (1440 px) and phone width (390 px), and the real PDFs it produces. Nothing is mocked up.</p>
    </div>
    <div>
      <p class="k">Contents</p>
      <ol class="toc">${contents.map(([n, t]) => `<li><b>${n}</b><span>${esc(t)}</span></li>`).join('')}</ol>
    </div>
  </div>
</section>

<!-- 2 PRODUCT -->
<section class="page">
  <p class="eyebrow">2 · Over Coffee in one page</p>
  <h2 class="big">A personal daily newspaper you can finish over a cup of coffee.</h2>
  <p class="lede">The world produces more information than anyone can read. Over Coffee asks one question every morning — what actually matters to this person today? — and answers it with a finite, edited newspaper.</p>
  <div class="cols2">
    <div class="card"><h3>The newspaper is the destination</h3><p>Open, read, understand, finish. No feed, no infinite scroll. Every edition ends with “You’re done.”</p></div>
    <div class="card"><h3>Time is an editorial budget</h3><p>5, 10 or 20 minutes is a ceiling, not a quota. A quiet day looks quiet; silence is valid.</p></div>
    <div class="card"><h3>Edited, not generated</h3><p>Events, not articles. Duplicate reporting is collapsed, claims are verified against sources, and an editor decides what deserves space — and records why.</p></div>
    <div class="card"><h3>Trust is structural</h3><p>Every claim traces Claim → Event → Source with a visible status. A quality gate refuses unsupported numbers, altered quotes and hidden uncertainty.</p></div>
    <div class="card"><h3>One engine, two experiences</h3><p>Business (precise, calm) and Social (a friend catching you up) are two renderings of one stored edition — never a second research pass.</p></div>
    <div class="card"><h3>The depth is optional</h3><p>Newspaper → Story → Sources → Original. “Learn more” exists for the curious; the paper works perfectly without it.</p></div>
  </div>
  <hr class="rule">
  <p class="k">Today’s sample edition, in numbers (AI · Food · Farming, 10-minute budget)</p>
  <div class="funnel">
    <div><b>41</b><span>articles researched</span></div>
    <div><b>16</b><span>developments</span></div>
    <div><b>${data.today.stats.published}</b><span>published</span></div>
    <div><b>${data.today.stats.readingMinutes.business}</b><span>minutes to read</span></div>
    <div><b>11/11</b><span>quality checks</span></div>
  </div>
</section>

<!-- 3 BRAND -->
<section class="page">
  <p class="eyebrow">3 · Brand</p>
  <h2 class="big">The full stop.</h2>
  <p class="lede">An open ring — a C, and the O of a page turned to the light — around a solid point. A full stop is the brand’s promise: the edition ends. Seen from above it is also, quietly, a cup and the first light of the morning, without ever drawing either.</p>
  <div class="marks">
    <figure>${mark(130)}<figcaption>Mark</figcaption></figure>
    <figure>${mark(64)}<figcaption>Masthead ear</figcaption></figure>
    <figure>${mark(32)}<figcaption>Navigation</figcaption></figure>
    <figure>${mark(16)}<figcaption>16 px</figcaption></figure>
    <figure><div class="appicon">${mark(64)}</div><figcaption>App icon</figcaption></figure>
    <figure><img src="${url(path.join(ROOT, 'web/assets/favicon.svg'))}" width="40" height="40" alt=""><figcaption>Favicon</figcaption></figure>
  </div>
  <p class="k" style="margin-top:5mm">Colour — Business is white, true black and one signal red; Social turns the colour up</p>
  <div class="swatches">
    ${[['#ffffff', 'Paper'], ['#0b0b0c', 'Ink'], ['#d42a1c', 'Signal red'], ['#e0e0dc', 'Hairline'], ['#157a45', 'Confirmed'], ['#c2410c', 'Emerging']].map(([c, n]) => `<figure class="sw"><div style="background:${c}"></div><figcaption>${n}<br>${c}</figcaption></figure>`).join('')}
    ${[['#fff8ec', 'Social paper'], ['#5b3fd6', 'AI'], ['#e04f37', 'Food'], ['#2f8655', 'Farming'], ['#2a78bd', 'Robotics'], ['#e2a915', 'Energy']].map(([c, n]) => `<figure class="sw"><div style="background:${c}"></div><figcaption>${n}<br>${c}</figcaption></figure>`).join('')}
  </div>
  <p class="k" style="margin-top:4mm">Type — self-hosted, open licence</p>
  <div class="type">
    <div><p class="sample-n">Newsreader</p><p>Business headlines and body. Designed for news; optical sizes from captions to mastheads.</p></div>
    <div><p class="sample-f">Fraunces</p><p>Social headlines. Soft, expressive, a little wonky — personality without childishness.</p></div>
    <div><p class="sample-i">Instrument Sans</p><p>Labels, kickers, metadata, and Social body text.</p></div>
  </div>
  <hr class="rule">
  <p class="k">Rules</p>
  <ul class="plain"><li>No cartoon cups, no clip-art, no gradients for decoration.</li><li>Illustration is geometric and generated per story — never a fake photograph.</li><li>Colour carries meaning: verification status, and topic in Social.</li></ul>
</section>

<!-- 4 ENGINE -->
<section class="page">
  <p class="eyebrow">4 · The editorial engine</p>
  <h2 class="big">Fourteen stages, run once per reader per day.</h2>
  <p class="lede">The complexity stays behind the scenes. The result is one stored edition that every format renders.</p>
  <ol class="stages">${[
    ['Wake up', 'topics, budget, mode, today-only changes'],
    ['Understand', 'plain-language interests → topics'],
    ['Expand', 'AI → companies, releases, regulation, hardware…'],
    ['Research', 'per-topic, cached and shared between readers'],
    ['Detect events', 'what actually happened'],
    ['Cluster', 'five reports of one launch = one event'],
    ['Verify', 'claim status from the evidence'],
    ['Prioritize', 'relevance, significance, freshness, source quality, corroboration'],
    ['Edit', 'the bar, the budget, the depth of each story'],
    ['Write', 'both voices from the same verified claims'],
    ['Quality check', '11 checks, both voices; failing stories are pulled'],
    ['Generate', 'summary, one thing to remember, audio script'],
    ['Deliver', 'web, PDF, audio, email'],
    ['Done', 'the reader has their newspaper'],
  ]
    .map(([t, d], i) => `<li><b>${String(i + 1).padStart(2, '0')}</b><span><strong>${t}</strong> — ${d}</span></li>`)
    .join('')}</ol>
  <hr class="rule">
  <p class="k">Verification labels the reader sees</p>
  <div class="legend">
    <div><span class="status" style="color:#157a45">● Confirmed</span><br>Primary source or two independent outlets.</div>
    <div><span class="status" style="color:#9a5b00">● Reported</span><br>One credible outlet, or an organisation’s own figure.</div>
    <div><span class="status" style="color:#3555a6">● Interpretation</span><br>Analysis or opinion, attributed.</div>
    <div><span class="status" style="color:#c2410c">○ Emerging</span><br>Early evidence, e.g. not yet peer reviewed.</div>
    <div><span class="status" style="color:#d42a1c">○ Unverified</span><br>Claimed but disputed or unconfirmed.</div>
  </div>
  <hr class="rule">
  <p class="k">The reading budget, in practice (AI · Food · Farming)</p>
  <table class="cmp"><thead><tr><th>Budget</th><th>Bar</th><th>Stories</th><th>Reads in</th><th>What changes</th></tr></thead><tbody>
    <tr><td>5 min</td><td>0.84</td><td>4</td><td>~3 min</td><td>Only the most significant developments; Food is honestly quiet</td></tr>
    <tr><td>10 min</td><td>0.77</td><td>8</td><td>~5 min</td><td>The day’s important developments, top three in full depth</td></tr>
    <tr><td>20 min</td><td>0.62</td><td>12</td><td>~7 min</td><td>More context and a few more stories — and still budget left unused</td></tr>
  </tbody></table>
</section>

${SECTIONS.map(
  (s) => `<div class="section-title"><span class="letter">SECTION ${s.id}</span><h2>${esc(s.title)}</h2><p>${esc(s.intro)}</p></div>
${s.screens.map(screenBlock).join('')}`,
).join('')}

<div class="section-title"><span class="letter">SECTION G</span><h2>On a phone</h2><p>The same product at 390 px. The newspaper reflows to one column; nothing is hidden behind menus.</p></div>
<section class="screen" id="S36">
  <header class="screen__head"><span class="sid">S36</span><h3>Home, Business, Social and the story view</h3></header>
  <p class="what">Masthead, lead and “Today in brief” stack in reading order. Social keeps its greeting and 30-second version at the top.</p>
  <div class="phones">${PHONE.map(([f, l]) => `<figure><img src="${url(path.join(SHOTS, f + '.jpg'))}" alt=""><figcaption>${l}</figcaption></figure>`).join('')}</div>
</section>

<div class="section-title"><span class="letter">SECTION H</span><h2>The four newspapers</h2><p>The required prototypes, exactly as the product prints them. Previews 1 and 3 are one stored edition rendered twice; so are 2 and 4. The full PDFs are in the repository under samples/.</p></div>
<section class="screen">
  <table class="cmp"><thead><tr><th></th><th>Topics</th><th>Voice</th><th>Stories</th><th>Reads in</th><th>Space by topic</th><th>Lead story</th></tr></thead><tbody>
  ${[
    ['N1', P.single, 'AI', 'Business', 'business'],
    ['N2', P.multi, 'AI · Food · Farming', 'Business', 'business'],
    ['N3', P.single, 'AI', 'Social', 'social'],
    ['N4', P.multi, 'AI · Food · Farming', 'Social', 'social'],
  ]
    .map(([n, e, t, v, m]) => `<tr><td>${n}</td><td>${t}</td><td>${v}</td><td>${e.stats.published} of ${e.stats.considered}</td><td>~${e.stats.readingMinutes[m]} min</td><td>${e.sections.map((s) => `${s.label} ${s.n}`).join(' · ')}</td><td>${esc(e.lead)}</td></tr>`)
    .join('')}
  </tbody></table>
  <p class="what">The topics are not given equal space: the editor gave AI four stories, Farming three and Food one, and led with Farming. Nothing was added to fill the 10-minute budget.</p>
</section>
${PREVIEW_FILES.map(([n, base, label]) => {
  const pages = pagesOf(base);
  return `<section class="page" id="${n}">
  <div class="news-head"><span class="sid">${n}</span><h3>${esc(label)}</h3><span>${pages.length} pages · A4</span></div>
  <img class="frontpage" src="${url(pages[0])}" alt="">
</section>
<section class="page">
  <div class="news-head"><span class="sid">${n}</span><h3>${esc(label)} — every page</h3><span>samples/${base}.pdf</span></div>
  <div class="pages${pages.length > 6 ? ' pages--4' : ''}">${pages.map((f, i) => `<figure><img src="${url(f)}" alt=""><figcaption>${n} · page ${i + 1}</figcaption></figure>`).join('')}</div>
</section>`;
}).join('')}

<!-- I -->
<section class="page">
  <p class="eyebrow">I · What’s real, what’s sample, what’s next</p>
  <h2 class="big">An honest account.</h2>
  <div class="cols2">
    <div>
      <p class="k">Real and working</p>
      <ul class="plain">
        <li>The reader app, onboarding, topics, settings, download, comparison and edition record</li>
        <li>The engine: research cache, clustering, verification, scoring, budgeted editing, quality gate</li>
        <li>Newspaper renderer (web + PDF) in both voices; story, source and audio layers</li>
        <li>Database with full edition records for audit and regeneration</li>
        <li>Live RSS research mode (tested: 58 real articles today)</li>
      </ul>
      <p class="k" style="margin-top:5mm">Sample</p>
      <ul class="plain">
        <li>The research corpus and the authored copy for it — all fictional, labelled everywhere</li>
        <li>The “assess” and “write” steps use authored fixtures so editions are reproducible</li>
      </ul>
    </div>
    <div>
      <p class="k">Next for production</p>
      <ul class="plain">
        <li>Model-backed assessment and writing on live research (Claude writer is built, not yet run against the API)</li>
        <li>Better topic relevance for live feeds</li>
        <li>Accounts, a durable scheduler, real email and voice providers</li>
        <li>Future, kept outside the reader experience: one sponsor per edition, industry editions (e.g. Hazardous Area Daily), ecosystem integrations through the edition API</li>
      </ul>
    </div>
  </div>
</section>

<!-- J FEEDBACK -->
<section class="page">
  <p class="eyebrow">J · Feedback sheet</p>
  <h2 class="big" style="font-size:20pt">Notes by screen</h2>
  <table class="fb"><thead><tr><th>#</th><th>Screen</th><th>Notes</th></tr></thead><tbody>
  ${[...allScreens.map((s) => [s[0], s[2]]), ['S36', 'On a phone'], ...PREVIEW_FILES.map(([n, , l]) => [n, l])].map(([n, t]) => `<tr><td>${n}</td><td>${esc(t)}</td><td></td></tr>`).join('')}
  <tr><td>General</td><td>Would you open it every morning?</td><td></td></tr>
  </tbody></table>
</section>
</body></html>`;

const htmlFile = path.join(SHOTS, 'walkthrough.html');
fs.writeFileSync(htmlFile, html);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
await renderPdf({ url: pathToFileURL(htmlFile).href, outFile: OUT + '.tmp.pdf' });
fs.renameSync(OUT + '.tmp.pdf', OUT);
console.log('Walkthrough →', path.relative(process.cwd(), OUT), `(${(fs.statSync(OUT).size / 1e6).toFixed(1)} MB)`);
