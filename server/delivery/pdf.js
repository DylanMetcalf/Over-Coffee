// DELIVERY — PDF
//
// The PDF is a print rendering of the stored edition (see /print/:id), turned
// into a file by headless Chromium. No new research or writing happens here.
// Without a Chromium binary, readers fall back to the browser's own
// "Save as PDF" on the same print page.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export function findChrome() {
  const candidates = [
    process.env.OC_CHROME,
    ...safeList('/opt/pw-browsers').filter((d) => d.startsWith('chromium-')).map((d) => `/opt/pw-browsers/${d}/chrome-linux/chrome`),
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p)) || null;
}

function safeList(dir) {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

export async function renderPdf({ url, outFile, chrome = findChrome() }) {
  if (!chrome) throw Object.assign(new Error('No Chromium available for PDF rendering'), { code: 'NO_CHROME' });
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const args = [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--no-first-run',
    '--hide-scrollbars',
    '--no-pdf-header-footer',
    '--run-all-compositor-stages-before-draw',
    '--virtual-time-budget=4000',
    `--print-to-pdf=${outFile}`,
    url,
  ];
  await new Promise((resolve, reject) => {
    const p = spawn(chrome, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => (err += d));
    const timer = setTimeout(() => p.kill('SIGKILL'), 30000);
    p.on('exit', (code) => {
      clearTimeout(timer);
      fs.existsSync(outFile) && fs.statSync(outFile).size > 0 ? resolve() : reject(new Error(`chrome exited ${code}: ${err.slice(-400)}`));
    });
  });
  return outFile;
}

/** PNG screenshot of a URL (share cards). Same Chromium as PDFs. */
export async function renderPng({ url, outFile, width = 1200, height = 630, chrome = findChrome() }) {
  if (!chrome) throw Object.assign(new Error('No Chromium available'), { code: 'NO_CHROME' });
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  await new Promise((resolve, reject) => {
    const p = spawn(chrome, ['--headless', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', `--window-size=${width},${height}`, '--virtual-time-budget=3000', `--screenshot=${outFile}`, url], { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (code) => (code === 0 && fs.existsSync(outFile) ? resolve() : reject(new Error('screenshot failed: ' + err.slice(-200)))));
    p.on('error', reject);
  });
  return outFile;
}
