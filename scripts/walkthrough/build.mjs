// Screenshot walkthrough: drives the real app on a phone viewport, then lays the shots out as a PDF.
// Usage: node scripts/walkthrough/build.mjs [baseUrl]  → docs/walkthrough/Over-Coffee-Walkthrough.pdf
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { markSvg, wordmarkSvg } from '../../web/js/render/mark.js';
const require = createRequire(process.env.PW_PATH || '/opt/node22/lib/node_modules/');
const { chromium, devices } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:4321';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const OUT = path.resolve('docs/walkthrough');
const SH = path.join(OUT, 'shots');
fs.mkdirSync(SH, { recursive: true });

const b = await chromium.launch({ executablePath: CHROME });
const ctx = await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
const steps = [];
const snap = async (file, title, text) => { await p.waitForTimeout(700); await p.screenshot({ path: path.join(SH, file + '.png') }); steps.push({ file, title, text }); };
const next = async () => { await p.click('.pager-bar [data-next]'); await p.waitForTimeout(650); };

await p.goto(BASE + '/');
await p.waitForSelector('.auth');
await snap('01-welcome', 'Open the link', 'Over Coffee is your own daily newspaper. Tap “Create an account”.');
await p.click('a[href="#/signup"]');
await p.fill('input[name=email]', `walkthrough-${Date.now()}@example.com`);
await p.fill('input[name=password]', 'password123');
await snap('02-account', 'Create an account', 'An email and a password of 8 or more characters. That is all.');
await p.click('button[type=submit]');
await p.waitForSelector('[data-input]');
await p.fill('[data-input]', 'hazardous area electrical');
await p.click('.ob__input button');
await p.waitForSelector('[data-area]');
await p.click('[data-add="AI"]');
await p.waitForTimeout(500);
await snap('03-topics', 'Say what you care about', 'Type it the way you would say it. Tick the areas you want, add your own, or follow just the broad topic.');
await p.click('[data-next]'); await p.waitForSelector('[data-budget="5"]');
await p.click('[data-budget="5"]');
await snap('04-time', 'Choose your reading time', '3, 5 or 10 minutes. It is a budget, not a quota: on a quiet day you get less.');
await p.click('[data-next]'); await p.waitForSelector('[data-mode="social"]');
await snap('05-voice', 'Pick a voice', 'Business is concise and calm. Conversational is a friend explaining it. Same facts, same sources. Switch any day.');
await p.click('[data-next]'); await p.waitForSelector('[data-chan="email"]');
await snap('06-delivery', 'Choose when it arrives', 'Pick a morning time. Your edition is prepared and emailed by then.');
await p.click('[data-next]');
await p.waitForSelector('.home, .paper, .pager', { timeout: 60000 });
await p.goto(BASE + '/#/');
await p.waitForSelector('.home__actions', { timeout: 30000 });
await snap('07-home', 'Your edition is ready', 'Home shows what is waiting, how long it takes, and how many sources were checked.');
await p.click('.home__actions a.btn--brand');
await p.waitForSelector('.pager .pg');
await snap('08-front', 'The front page', 'The biggest story first. Scroll down to read the page.');
await next();
await snap('09-swipe', 'Swipe to turn the page', 'Swipe sideways, or tap the arrows. Each page is one part of the paper. The bar shows where you are.');
if ((await p.locator('.pg').count()) > 3) await next();
await snap('10-section', 'One page per topic', 'Stories are sized by importance. Labels show how well each is sourced: confirmed, reported or emerging.');
const more = p.locator('.pg:nth-child(n+2) a.more:not(.more--print)').first();
await more.scrollIntoViewIfNeeded(); await more.click();
await p.waitForSelector('.depth');
await snap('11-learn', 'Learn more', 'Open any story for context, a timeline and what each source added.');
await p.evaluate(() => (document.querySelector('#sources') || document.querySelector('.sources') || document.querySelector('.source'))?.scrollIntoView({ block: 'start' }));
await snap('12-sources', 'See the sources', 'Sources are grouped and explained, with a path to the original.');
await p.click('.depth__back');
await p.waitForSelector('.pager .pg');
await snap('13-back', 'Back to where you were', 'Return to the paper on the same page and carry on reading.');
for (let i = 0; i < 10 && !(await p.locator('.pager-bar [data-next]').isDisabled()); i++) await next();
await snap('14-done', 'You are done', 'The last page has your tools: listen, download a PDF, see how it was made. Then get on with your day.');
await p.goto(BASE + '/#/read/today?mode=social');
await p.waitForSelector('.paper--social, .pager .pg'); await p.waitForTimeout(500);
await snap('15-conversational', 'Conversational voice', 'The same edition in simple, friendly words. Caveats like “not peer reviewed” are kept.');
await p.goto(BASE + '/#/download'); await p.waitForSelector('.dl--install');
await snap('16-install', 'Install it', 'iPhone: Share, then Add to Home Screen. Android and desktop Chrome: tap Install. It opens like an app.');
await b.close();

const logo = wordmarkSvg({ height: 44, ink: '#0a0b10' });
const icon = markSvg({ size: 88 });
const card = (s, i) => `<section class="pg"><div class="n">${String(i + 1).padStart(2, '0')}</div><div class="txt"><h2>${s.title}</h2><p>${s.text}</p></div><div class="ph"><img src="shots/${s.file}.png"></div></section>`;
const html = `<!doctype html><meta charset="utf-8"><title>Over Coffee — walkthrough</title><style>
@font-face{font-family:Bricolage;font-weight:200 800;src:url(../../web/assets/fonts/bricolage-normal.woff2)}
@font-face{font-family:Geist;font-weight:100 900;src:url(../../web/assets/fonts/geist-normal.woff2)}
@page{size:A4 landscape;margin:0}*{box-sizing:border-box}body{margin:0;font:15px/1.5 Geist,sans-serif;color:#0a0b10}
.pg{width:297mm;height:210mm;page-break-after:always;display:grid;grid-template-columns:1fr 92mm;align-items:center;gap:14mm;padding:0 22mm;background:linear-gradient(135deg,#fbf8f3,#fff 60%)}
.n{position:absolute;margin:-70mm 0 0 0;font:800 120px/1 Bricolage;letter-spacing:-.06em;color:#0a0b10;opacity:.07}
.txt{position:relative}.txt h2{margin:0 0 10px;font:800 40px/1.02 Bricolage;letter-spacing:-.04em}.txt p{margin:0;font-size:19px;color:#3a3f4c;max-width:30ch}
.ph{height:176mm;display:grid;place-items:center}.ph img{height:176mm;border-radius:7mm;border:2.5mm solid #0a0b10;box-shadow:0 10mm 20mm rgba(10,11,16,.18)}
.cover{display:grid;place-items:center;text-align:center;grid-template-columns:1fr;gap:6mm;background:#fbf8f3}.cover h1{margin:0;font:800 54px/1 Bricolage;letter-spacing:-.045em}.cover p{font-size:22px;color:#3a3f4c;margin:0}
.end{grid-template-columns:1fr;text-align:center;justify-items:center;background:#fbf8f3}.end h2{font:800 44px/1 Bricolage;letter-spacing:-.04em;margin:0 0 10px}.end p{max-width:48ch;font-size:19px;color:#3a3f4c;margin:6px 0}
</style>
<section class="pg cover"><div>${icon}</div><div>${logo}</div><h1>How to use Over Coffee</h1><p>Your own daily newspaper. A few minutes, then you are done.</p><p style="font-size:15px;color:#7a7f8c">Sample screenshots. The edition shown uses fictional demo content.</p></section>
${steps.map(card).join('')}
<section class="pg end"><div>${icon}</div><h2>That is the whole thing.</h2><p>Tell it what you care about. Read it over coffee. Swipe the pages, tap Learn more when you are curious. Then get on with your day.</p><p><b>Something wrong or confusing?</b> Send a screenshot and one line on what you expected.</p></section>`;
fs.writeFileSync(path.join(OUT, 'walkthrough.html'), html);
const pdf = path.join(OUT, 'Over-Coffee-Walkthrough.pdf');
execFileSync(CHROME, ['--headless', '--no-sandbox', '--disable-gpu', '--no-pdf-header-footer', `--print-to-pdf=${pdf}`, '--virtual-time-budget=4000', 'file://' + path.join(OUT, 'walkthrough.html')], { stdio: 'ignore' });
console.log('wrote', pdf, steps.length, 'screens');
