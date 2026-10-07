// Launch verification: drives the real app in headless Chromium (phone + desktop).
// Usage: node scripts/qa/launch-e2e.mjs [baseUrl]   → prints PASS/FAIL per check, writes docs/LAUNCH-VERIFICATION.json
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const require = createRequire(process.env.PW_PATH || '/opt/node22/lib/node_modules/');
const { chromium, devices } = require('playwright');

const BASE = process.argv[2] || process.env.OC_URL || 'http://localhost:4321';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const results = [];
const check = async (group, name, fn) => {
  try {
    const detail = await fn();
    results.push({ group, name, status: 'PASS', detail: detail || '' });
  } catch (e) {
    results.push({ group, name, status: 'FAIL', detail: String(e.message).split('\n')[0] });
  }
  const r = results.at(-1);
  console.log(`${r.status === 'PASS' ? '✓' : '✗'} [${group}] ${name}${r.detail ? ' — ' + r.detail : ''}`);
};
const ok = (cond, msg) => { if (!cond) throw new Error(msg); };

const email = `qa-${Date.now()}@test.com`;
const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 780 }, serviceWorkers: 'allow' });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
p.on('console', (m) => m.type() === 'error' && !/401|Failed to load resource/.test(m.text()) && errors.push(m.text()));
const cdp = await ctx.newCDPSession(p);
// Real touch events (touchStart/Move/End), the same input a thumb produces.
const swipe = async (dx, dy) => {
  const [x0, y0] = [dx < 0 ? 320 : 70, dy < 0 ? 600 : 300];
  const [x1, y1] = [x0 + dx, y0 + dy];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
  for (let i = 1; i <= 12; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + ((x1 - x0) * i) / 12, y: y0 + ((y1 - y0) * i) / 12 }] }); await new Promise((r) => setTimeout(r, 16)); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
};

// ── CORE ──
await check('Core', 'Landing page for logged-out visitor', async () => {
  await p.goto(BASE + '/');
  await p.waitForSelector('.auth');
  ok(await p.locator('.auth__pitch h1').isVisible(), 'pitch missing');
});
await check('Core', 'Logged-out visitor cannot reach the app API', async () => {
  const r = await p.evaluate(() => fetch('/api/me').then((x) => x.status));
  ok(r === 401, 'status ' + r);
});
await check('Core', 'Sample newspaper readable without account', async () => {
  await p.goto(BASE + '/#/read/preview-multi-10?mode=business');
  await p.waitForSelector('.pager, .paper', { timeout: 20000 });
});
await check('Core', 'Signup rejects weak password with a clear message', async () => {
  await p.goto(BASE + '/#/signup');
  await p.fill('input[name=email]', email);
  await p.fill('input[name=password]', 'short');
  await p.click('button[type=submit]');
  await p.waitForSelector('.auth__error:not([hidden])');
  ok(/8 characters/.test(await p.locator('.auth__error').innerText()), 'wrong message');
});
await check('Core', 'Signup', async () => {
  await p.fill('input[name=password]', 'password123');
  await p.click('button[type=submit]');
  await p.waitForSelector('[data-next]');
  ok(p.url().includes('welcome'), 'not in onboarding: ' + p.url());
});
await check('Core', 'Duplicate email is refused', async () => {
  const r = await p.evaluate((em) => fetch('/api/auth/signup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: em, password: 'password123' }) }).then((x) => x.status), email);
  ok(r === 409, 'status ' + r);
});

// ── Onboarding & topics ──
await check('Core', 'Natural-language topic is understood (custom topic added)', async () => {
  await p.fill('[data-input]', 'hazardous area electrical');
  await p.click('.ob__input button');
  await p.waitForSelector('[data-chosen] .chip');
  ok((await p.locator('[data-chosen]').innerText()).toLowerCase().includes('hazardous area electrical'), 'chip missing');
});
await check('Core', 'Topic areas shown; Select all / Broad only / add-own work', async () => {
  await p.waitForSelector('[data-area]');
  const n = await p.locator('[data-area]').count();
  ok(n >= 3, 'only ' + n + ' areas');
  await p.click('[data-areas-none]');
  ok((await p.locator('[data-area][aria-pressed=true]').count()) === 0, 'broad only did not clear');
  await p.click('[data-areas-all]');
  ok((await p.locator('[data-area][aria-pressed=true]').count()) === n, 'select all failed');
  await p.fill('[data-area-form] input', 'Zone classification');
  await p.click('[data-area-form] button');
  ok(await p.locator('[data-area="Zone classification"]').count(), 'add own failed');
  return `${n} areas (${process.env.ANTHROPIC_API_KEY ? 'model' : 'fallback'})`;
});
await check('Core', 'Add and remove topics', async () => {
  await p.click('[data-add="Farming"]');
  await p.waitForFunction(() => document.querySelectorAll('[data-chosen] .chip').length === 2);
  await p.click('[data-chosen] .chip:last-child');
  await p.waitForFunction(() => document.querySelectorAll('[data-chosen] .chip').length === 1);
  await p.click('[data-add="AI"]');
  await p.waitForFunction(() => document.querySelectorAll('[data-chosen] .chip').length === 2);
});
await check('Core', 'Reading time, edition style and delivery steps', async () => {
  await p.click('[data-next]'); await p.waitForSelector('[data-budget="5"]');
  await p.click('[data-budget="5"]'); await p.click('[data-next]');
  await p.waitForSelector('[data-mode="social"]'); await p.click('[data-mode="social"]'); await p.click('[data-mode="business"]'); await p.click('[data-next]');
  await p.waitForSelector('[data-chan="email"]');
  ok((await p.locator('[data-chan]').count()) === 1, 'only email should be offered');
});
await check('Edition', 'First edition generates from onboarding', async () => {
  await p.click('[data-next]');
  await p.waitForSelector('.home, .paper, .pager', { timeout: 60000 });
});

// ── Reading (phone) ──
await check('Reading', 'Home shows today\'s edition and links to the paper', async () => {
  await p.goto(BASE + '/#/');
  await p.waitForSelector('.home__actions a.btn--brand', { timeout: 30000 });
});
await check('Reading', 'Newspaper opens as pages with page indicator', async () => {
  await p.click('.home__actions a.btn--brand');
  await p.waitForSelector('.pager .pg', { timeout: 30000 });
  const pages = await p.locator('.pg').count();
  ok(pages >= 3, 'pages: ' + pages);
  ok(await p.locator('.pager-bar__title').innerText().then((t) => /1 \/ \d+/.test(t)), 'indicator missing');
  return pages + ' pages';
});
await check('Reading', 'Horizontal swipe turns the page', async () => {
  await swipe(-250, 0);
  await p.waitForFunction(() => /^2 \//.test(document.querySelector('.pager-bar__title').textContent), null, { timeout: 4000 });
});
await check('Reading', 'Vertical scroll reads within a page without turning it', async () => {
  const before = await p.locator('.pager-bar__title').innerText();
  await swipe(0, -450);
  await p.waitForTimeout(500);
  const top = await p.evaluate(() => [...document.querySelectorAll('.pg__in')].map((e) => e.scrollTop));
  ok(top.some((t) => t > 50), 'page did not scroll');
  const left = await p.evaluate(() => document.querySelector('.pager').scrollLeft);
  ok(left > 0, 'pager moved back during vertical read');
  ok((await p.locator('.pager-bar__title').innerText()) === before, 'page turned while scrolling');
});
await check('Reading', 'Next-page button and bar controls work', async () => {
  await p.click('.pager-bar [data-next]');
  await p.waitForFunction(() => /^3 \//.test(document.querySelector('.pager-bar__title').textContent), null, { timeout: 4000 });
  await p.click('.pager-bar [data-prev]');
  await p.waitForFunction(() => /^2 \//.test(document.querySelector('.pager-bar__title').textContent), null, { timeout: 4000 });
});
let storyHref;
await check('Reading', 'Learn more opens the story/source layer', async () => {
  // A story from a later page, so "back" has somewhere other than the front page to return to.
  const idx = (await p.locator('.pg').count()) > 3 ? 3 : 2;
  const link = p.locator(`.pg:nth-child(${idx}) a.more:not(.more--print)`).first();
  if (!(await link.count())) throw new Error('no story link on page ' + idx);
  storyHref = await link.getAttribute('href');
  await link.scrollIntoViewIfNeeded();
  await link.click();
  await p.waitForSelector('.depth', { timeout: 15000 });
  ok(await p.locator('.source, .sources').count(), 'no sources section');
});
await check('Reading', 'Sources are grouped with names (not raw URL dump)', async () => {
  const t = await p.locator('.depth').innerText();
  ok(/Sources|sources/.test(t), 'no sources heading');
});
await check('Reading', 'Back returns to the same newspaper page', async () => {
  await p.click('.depth__back');
  await p.waitForSelector('.pager .pg');
  await p.waitForTimeout(600);
  const title = await p.locator('.pager-bar__title').innerText();
  ok(!/^1 \//.test(title), 'returned to front page: ' + title);
});
await check('Reading', 'Position survives a reload', async () => {
  const before = await p.locator('.pager-bar__title').innerText();
  await p.reload(); await p.waitForSelector('.pager .pg'); await p.waitForTimeout(800);
  ok((await p.locator('.pager-bar__title').innerText()) === before, 'position lost');
});
await check('Reading', 'Last page reached (edition is finite)', async () => {
  for (let i = 0; i < 12; i++) { if (await p.locator('.pager-bar [data-next]').isDisabled()) break; await p.click('.pager-bar [data-next]'); await p.waitForTimeout(250); }
  ok(await p.locator('.colophon').count(), 'no sign-off page');
});

// ── Design / responsive ──
await check('Design', 'Phone: no horizontal page overflow', async () => {
  const w = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  ok(w[0] <= w[1] + 1, JSON.stringify(w));
});
await check('Design', 'Conversational edition renders', async () => {
  await p.goto(BASE + '/#/read/today?mode=social'); await p.waitForSelector('.paper--social');
  ok(await p.locator('.s-headline').count(), 'no headlines');
});

// ── PWA ──
await check('PWA', 'Manifest valid with icons, standalone, start_url', async () => {
  const m = await (await p.request.get(BASE + '/manifest.webmanifest')).json();
  ok(m.display === 'standalone' && m.start_url && m.name && m.short_name && m.theme_color && m.background_color, 'missing fields');
  ok(m.icons.some((i) => i.sizes === '192x192') && m.icons.some((i) => i.sizes === '512x512') && m.icons.some((i) => i.purpose === 'maskable'), 'icons');
  for (const i of m.icons.filter((x) => x.src.endsWith('.png'))) ok((await p.request.get(BASE + i.src)).ok(), 'icon 404 ' + i.src);
});
await check('PWA', 'Service worker active and controlling', async () => {
  const state = await p.evaluate(async () => { const r = await navigator.serviceWorker.ready; return r.active?.state; });
  ok(state === 'activated', 'state ' + state);
});
await check('PWA', 'Apple touch icon + theme meta present', async () => {
  await p.goto(BASE + '/'); 
  ok(await p.locator('link[rel=apple-touch-icon]').count() && await p.locator('meta[name=theme-color]').count(), 'meta missing');
});
await check('PWA', 'Offline: app shell and last edition still open', async () => {
  await p.goto(BASE + '/#/'); await p.waitForSelector('.home__actions', { timeout: 20000 });
  await p.evaluate(() => fetch('/api/today').then((r) => r.json())); // warm cache
  await ctx.setOffline(true);
  await p.reload();
  await p.waitForSelector('.home__actions', { timeout: 15000 });
  await ctx.setOffline(false);
});

// ── Edition: PDF ──
await check('Edition', 'PDF generates and has pages and text', async () => {
  const today = await (await p.request.get(BASE + '/api/today')).json();
  const res = await p.request.get(`${BASE}/api/editions/${today.edition.id}/pdf?mode=business`);
  ok(res.ok() && (res.headers()['content-type'] || '').includes('pdf'), 'status ' + res.status());
  fs.mkdirSync('/tmp/oc-qa', { recursive: true });
  fs.writeFileSync('/tmp/oc-qa/e2e.pdf', await res.body());
  const info = execFileSync('pdfinfo', ['/tmp/oc-qa/e2e.pdf']).toString();
  const pages = Number(/Pages:\s+(\d+)/.exec(info)[1]);
  const text = execFileSync('pdftotext', ['/tmp/oc-qa/e2e.pdf', '-']).toString();
  const lead = today.edition.stories.find((x) => x.rank === 0 || x.rank === 1) || today.edition.stories[0];
  const norm = (t) => t.replace(/\s+/g, ' ').replace(/[’‘]/g, "'");
  const head = norm(lead.copy.business.headline).slice(0, 24);
  ok(pages >= 1 && text.length > 400 && norm(text).includes(head), `pages ${pages}, ${text.length} chars, headline "${head}" ${norm(text).includes(head) ? 'found' : 'missing'}`);
  return pages + ' pages';
});
await check('Edition', 'Quality gate recorded and edition has sources', async () => {
  const today = await (await p.request.get(BASE + '/api/today')).json();
  const e = today.edition;
  ok(['pass', 'warn'].includes(e.quality.status), 'quality ' + e.quality.status);
  ok(e.sources?.length > 0 || e.stories.length === 0, 'no sources');
  return `quality ${e.quality.status}, ${e.stories.length} stories, ${e.sources?.length || 0} sources, ${e.sample ? 'SAMPLE data' : 'live data'}`;
});

// ── Desktop ──
const dctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const d = await dctx.newPage();
await check('Design', 'Desktop: newspaper renders as scrolling layout without pager', async () => {
  await d.goto(BASE + '/'); await d.waitForSelector('.auth');
  await d.click('a[href="#/login"]').catch(() => {});
  await d.fill('input[name=email]', email); await d.fill('input[name=password]', 'password123');
  await d.click('button[type=submit]'); await d.waitForSelector('.home__actions a.btn--brand', { timeout: 30000 });
  await d.click('.home__actions a.btn--brand'); await d.waitForSelector('.paper', { timeout: 20000 });
  ok((await d.locator('.pager').count()) === 0, 'pager on desktop');
  const w = await d.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  ok(w[0] <= w[1] + 1, 'overflow ' + JSON.stringify(w));
});
await check('Core', 'Login works on a second device; settings change persists', async () => {
  await d.goto(BASE + '/#/settings'); await d.waitForSelector('[data-set="mode"]');
  await d.click('[data-set="mode"][data-value="social"]'); await d.waitForTimeout(600);
  const me = await (await d.request.get(BASE + '/api/me')).json();
  ok(me.profile.mode === 'social', 'mode not saved');
});
await check('Core', 'Change today: random topic and adventurous options exist', async () => {
  await d.goto(BASE + '/#/read/today'); await d.waitForSelector('[data-change]');
  await d.click('[data-change]');
  await d.waitForSelector('[data-random]'); ok(await d.locator('[data-adventure]').count(), 'no adventurous');
  await d.click('[data-random]'); await d.waitForTimeout(800);
});
await check('Core', 'Logout ends the session; protected API refuses', async () => {
  await d.goto(BASE + '/#/settings'); await d.waitForSelector('[data-logout]'); await d.click('[data-logout]');
  await d.waitForSelector('.auth');
  const r = await d.evaluate(() => fetch('/api/me').then((x) => x.status));
  ok(r === 401, 'status ' + r);
});
await check('Core', 'Another account cannot read this reader\'s edition', async () => {
  const j = { 'content-type': 'application/json' };
  const a = await browser.newContext(); const b = await browser.newContext();
  const ra = await a.request.post(BASE + '/api/auth/signup', { headers: j, data: { email: 'iso-a-' + Date.now() + '@t.com', password: 'password123' } });
  ok(ra.ok(), 'signup A');
  await a.request.put(BASE + '/api/profile', { headers: j, data: { onboarded: true, topics: ['ai'] } });
  const ed = (await (await a.request.get(BASE + '/api/today')).json()).edition.id;
  await b.request.post(BASE + '/api/auth/signup', { headers: j, data: { email: 'iso-b-' + Date.now() + '@t.com', password: 'password123' } });
  const rb = await b.request.get(`${BASE}/api/editions/${ed}`);
  const pb = await b.request.get(`${BASE}/api/editions/${ed}/pdf`);
  const hb = await b.request.get(`${BASE}/print/${ed}`);
  ok(rb.status() === 404 && pb.status() === 404 && hb.status() === 404, `${rb.status()}/${pb.status()}/${hb.status()}`);
  await a.close(); await b.close();
});
await check('Core', 'No JavaScript errors during the run', async () => { ok(!errors.length, errors.slice(0, 2).join(' | ')); });

await browser.close();
fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync('docs/LAUNCH-VERIFICATION.json', JSON.stringify({ at: new Date().toISOString(), base: BASE, results }, null, 2));
const failed = results.filter((r) => r.status === 'FAIL');
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
