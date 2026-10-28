// 1200×630 social preview (Open Graph) in the brand: wordmark + tagline on warm paper.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { wordmarkSvg } from '../../web/js/render/mark.js';
const require = createRequire(process.env.PW_PATH || '/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../web/assets');
// Fonts inlined as data URIs so the page renders them without network or file access.
const face = (family, file, extra = '') => `@font-face{font-family:'${family}';${extra}src:url(data:font/woff2;base64,${fs.readFileSync(path.join(out, 'fonts', file)).toString('base64')}) format('woff2')}`;
const fonts = face('Bricolage Grotesque', 'bricolage-normal.woff2', 'font-weight:200 800;') + face('Geist', 'geist-normal.woff2', 'font-weight:100 900;') + face('Instrument Serif', 'instrument-serif-italic.woff2', 'font-style:italic;');
const html = `<style>${fonts}html,body{margin:0}.c{width:1200px;height:630px;box-sizing:border-box;padding:70px 84px;background:#fbf8f3;display:flex;flex-direction:column;justify-content:space-between}
.t{font:italic 400 54px/1.1 'Instrument Serif';color:#c4431c}.s{font:500 28px 'Geist';color:#3a3e4b;margin-top:14px;max-width:760px}</style>
<div class="c"><div>${wordmarkSvg({ height: 92, ink: '#0a0b10' })}</div><div><div class="t">A little perspective for your day.</div><div class="s">Your own daily publication, prepared each morning from the sources you care about.</div></div></div>`;
const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
await p.setContent(html);
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(400);
await p.screenshot({ path: path.join(out, 'social-card.png') });
await b.close();
console.log('wrote social-card.png');
