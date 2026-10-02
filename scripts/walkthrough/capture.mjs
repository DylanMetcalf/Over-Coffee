// Captures every screen of the running app for the product walkthrough.
//   node scripts/walkthrough/capture.mjs [outDir]      (server must be running on PORT, default 4321)
// Uses Playwright if installed (locally or globally) and the Chromium the PDF renderer finds.

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { findChrome } from '../../server/delivery/pdf.js';

const BASE = `http://localhost:${process.env.PORT || 4321}`;
const OUT = path.resolve(process.argv[2] || 'data/walkthrough/shots');
fs.mkdirSync(OUT, { recursive: true });

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    const root = execSync('npm root -g').toString().trim();
    return import(path.join(root, 'playwright/index.mjs'));
  }
}

const api = (method, url, body) =>
  fetch(BASE + url, { method, headers: { 'content-type': 'application/json' }, body: body && JSON.stringify(body) }).then((r) => r.json());

// A clean, typical reader: AI · Food · Farming, Business, 10 minutes.
await api('POST', '/api/reset');
await api('PUT', '/api/profile', { onboarded: true, topics: ['ai', 'food', 'farming'], mode: 'business', budgetMinutes: 10 });
await api('PUT', '/api/today', { topicIds: [] });
const { edition: today } = await api('GET', '/api/today');
for (const m of [5, 10, 20]) await api('GET', `/api/previews?minutes=${m}`);

const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ executablePath: findChrome() || undefined });
const manifest = {};

async function page(width = 1440, height = 900, scale = 1.5) {
  const p = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
  p.on('pageerror', (e) => console.warn('page error:', e.message));
  return p;
}
async function open(p, hash, wait = 600) {
  await p.goto(`${BASE}/${hash}`, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(wait);
}
async function save(p, name, opts = {}) {
  const file = path.join(OUT, `${name}.jpg`);
  if (opts.selector) await p.locator(opts.selector).first().screenshot({ path: file, type: 'jpeg', quality: 84, animations: 'disabled' });
  else await p.screenshot({ path: file, type: 'jpeg', quality: 84, fullPage: !!(opts.full || opts.clip), clip: opts.clip, animations: 'disabled' });
  manifest[name] = path.basename(file);
  console.log('✓', name);
}
/** Clip from the top of one element to the bottom of another (page coordinates). */
async function span(p, fromSel, toSel, pad = 16) {
  return p.evaluate(
    ([a, b, pad]) => {
      const ra = document.querySelector(a).getBoundingClientRect();
      const rb = document.querySelector(b).getBoundingClientRect();
      const y = Math.max(0, ra.top + scrollY - pad);
      return { x: 0, y, width: innerWidth, height: rb.bottom + scrollY + pad - y };
    },
    [fromSel, toSel, pad],
  );
}

// ── Onboarding ──
{
  await api('POST', '/api/reset');
  const p = await page();
  await open(p, '#/welcome');
  await save(p, 'ob-1-empty');
  await p.fill('[data-input]', 'artificial intelligence, agriculture');
  await p.press('[data-input]', 'Enter');
  await p.waitForSelector('[data-remove="farming"]');
  await p.click('[data-add="Food"]');
  await p.waitForSelector('[data-remove="food"]');
  await save(p, 'ob-1-topics');
  await p.click('[data-next]');
  await p.waitForSelector('[data-budget]');
  await save(p, 'ob-2-time');
  await p.click('[data-next]');
  await p.waitForSelector('[data-mode]');
  await save(p, 'ob-3-mode');
  await p.click('[data-next]');
  await p.waitForSelector('[data-time]');
  await save(p, 'ob-4-delivery');
  await p.click('[data-next]');
  await p.waitForSelector('.stages li.is-done:nth-child(9)', { timeout: 15000 });
  await save(p, 'ob-5-generating');
  await p.close();
  await api('PUT', '/api/profile', { onboarded: true, topics: ['ai', 'food', 'farming'], mode: 'business', budgetMinutes: 10 });
}

// ── Home & sheets ──
{
  const p = await page();
  await open(p, '#/', 2200);
  await save(p, 'home');
  await p.click('[data-change]');
  await p.waitForTimeout(400);
  await p.click('[data-adventure]');
  await p.waitForSelector('.path');
  await p.waitForTimeout(300);
  await save(p, 'sheet-change');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(400);
  await p.click('[data-listen]');
  await p.waitForSelector('.transcript li');
  await p.waitForTimeout(400);
  await save(p, 'sheet-listen');
  await p.close();
}

// ── Newspaper: Business ──
const ed = (await api('GET', '/api/today')).edition;
{
  const p = await page();
  await open(p, `#/read/${ed.id}?mode=business`);
  await save(p, 'b-front', { clip: await span(p, '.readbar', '.front', 0) });
  const secs = await p.$$eval('.sec', (els) => els.map((e) => e.id));
  for (const id of secs) await save(p, `b-${id}`, { selector: `#${id}` });
  await save(p, 'b-colophon', { selector: '.colophon' });
  await p.close();
}

// ── Newspaper: Social ──
{
  const p = await page();
  await open(p, `#/read/${ed.id}?mode=social`);
  await save(p, 's-top', { clip: await span(p, '.readbar', '.s-tldr', 0) });
  await save(p, 's-lead', { selector: '.s-story--lead' });
  await save(p, 's-full', { selector: '.s-story--full:not(.s-story--lead)' });
  await save(p, 's-standard', { selector: '.s-story--standard' });
  await save(p, 's-end', { clip: await span(p, '.s-quiz', '.colophon', 10) });
  await p.click('.s-q__opt >> nth=0');
  await p.click('.s-q:nth-child(2) .s-q__opt >> nth=0');
  await save(p, 's-quiz-answered', { selector: '.s-quiz' });
  await p.close();
}

// ── Depth layer ──
{
  const lead = ed.stories.find((s) => s.eventId === ed.leadEventId).id;
  const p = await page();
  await open(p, `#/story/${ed.id}/${lead}?mode=business`);
  await save(p, 'd-top', { clip: await span(p, '.depth__nav', '.depth__art', 4) });
  await save(p, 'd-main', { selector: '.depth__grid' });
  await save(p, 'd-sources', { selector: '.sources' });
  await open(p, `#/story/${ed.id}/st-ai-weather-model?mode=social`);
  await save(p, 'd-social', { clip: await span(p, '.depth__nav', '.depth__sec', 4) });
  await open(p, `#/source/${ed.id}/wheat-council?mode=business&from=${lead}`);
  await save(p, 'd-source', { clip: await span(p, '.depth__nav', '.source-page', 4) });
  await p.close();
}

// ── Topics, settings, download ──
{
  const p = await page();
  await open(p, '#/topics');
  await save(p, 'topics', { full: true });
  await open(p, '#/settings');
  await save(p, 'settings', { full: true });
  await open(p, '#/download');
  await save(p, 'download', { full: true });
  await p.close();
}

// ── Compare & edition record ──
{
  const p = await page(1440, 1000);
  await open(p, '#/compare?set=single&mode=business&m=10&view=one');
  await save(p, 'c-matrix');
  await open(p, '#/compare?set=multi&m=10&view=modes', 2500);
  await save(p, 'c-modes');
  await open(p, '#/compare?mode=business&m=10&view=topics', 2500);
  await save(p, 'c-topics');
  await open(p, '#/compare?set=multi&mode=business&m=5&view=one');
  await save(p, 'c-five', { clip: await span(p, '.cmp-head', '.mast', 0) });
  await open(p, '#/edition/preview-multi-10?mode=business');
  await save(p, 'r-pipeline', { clip: await span(p, '.page .eyebrow', '.pipeline', 10) });
  await save(p, 'r-decisions', { selector: '.block:nth-of-type(2)' });
  await save(p, 'r-quality', { selector: '.block:nth-of-type(3)' });
  await p.close();
}

// ── Phone ──
{
  const p = await page(390, 844, 2);
  await open(p, '#/', 2200);
  await save(p, 'm-home');
  await open(p, `#/read/${ed.id}?mode=business`);
  await save(p, 'm-business');
  await open(p, `#/read/${ed.id}?mode=social`);
  await p.evaluate(() => document.querySelector('.s-mast').scrollIntoView());
  await p.waitForTimeout(300);
  await save(p, 'm-social');
  await open(p, `#/story/${ed.id}/st-ai-kestrel-4?mode=social`);
  await save(p, 'm-story');
  await p.close();
}

await browser.close();
const previews = await api('GET', '/api/previews?minutes=10');
const data = {
  today: { id: ed.id, stats: ed.stats, sections: ed.sections, lead: ed.stories[0]?.copy.business.headline },
  previews: Object.fromEntries(
    Object.entries(previews).map(([k, e]) => [k, { id: e.id, stats: e.stats, sections: e.sections.map((s) => ({ label: s.label, n: s.storyIds.length + (e.leadTopicId === s.topicId ? 1 : 0) })), lead: e.stories[0]?.copy.business.headline }]),
  ),
  shots: manifest,
};
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(data, null, 2));
console.log(`\n${Object.keys(manifest).length} screenshots → ${OUT}`);
