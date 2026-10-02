// Writes the logo files in web/assets from the single source of truth, mark.js.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { markFile, wordmarkFile, BRAND } from '../../web/js/render/mark.js';

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../web/assets');
const w = (name, text) => fs.writeFileSync(path.join(out, name), text);
w('mark.svg', markFile());
w('favicon.svg', markFile({ bold: true }));
w('app-icon.svg', markFile({ padded: true }));
w('mark-dark.svg', markFile({ tone: 'dark' }));
w('mark-mono.svg', markFile({ tone: 'mono' }));
w('monogram.svg', markFile({ monogram: true }));
w('wordmark.svg', wordmarkFile());
w('wordmark-dark.svg', wordmarkFile({ ink: '#ffffff', accent: BRAND.redOnDark }));
w('wordmark-mono.svg', wordmarkFile({ ink: BRAND.ink, accent: BRAND.ink }));
console.log('logo assets written to', out);

// PNGs for places that cannot use SVG (email clients, app stores, OS icons).
try {
  const { createRequire } = await import('node:module');
  const require = createRequire('/opt/node22/lib/node_modules/');
  const { chromium } = require('playwright');
  const { wordmarkSvg } = await import('../../web/js/render/mark.js');
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const shot = async (name, svg, width, height) => {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.setContent(`<body style="margin:0;background:transparent">${svg.replace(/<svg /, `<svg style="display:block;width:${width}px;height:${height}px" `)}</body>`);
    await page.screenshot({ path: path.join(out, name), omitBackground: true });
    await page.close();
  };
  const file = (f) => fs.readFileSync(path.join(out, f), 'utf8');
  await shot('icon-192.png', file('app-icon.svg'), 192, 192);
  await shot('icon-512.png', file('app-icon.svg'), 512, 512);
  await shot('apple-touch-icon.png', file('app-icon.svg'), 180, 180);
  await shot('profile-400.png', file('mark.svg'), 400, 400);
  const wm = wordmarkSvg({ height: 64, ink: BRAND.ink });
  const wmW = Math.round(Number(/width="([\d.]+)"/.exec(wm)[1]));
  await shot('email-logo.png', wm.replace(/width="[\d.]+" height="64"/, `width="${wmW}" height="64"`), wmW, 64);
  await browser.close();
  console.log('png assets written');
} catch (err) {
  console.warn('PNG export skipped:', err.message);
}
