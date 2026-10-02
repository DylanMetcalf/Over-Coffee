// Builds the four required prototype newspapers as PDFs into samples/.
//   Preview 1 — AI, Business          Preview 2 — AI · Food · Farming, Business
//   Preview 3 — AI, Social            Preview 4 — AI · Food · Farming, Social
// Previews 1 & 3 (and 2 & 4) are the same stored edition rendered twice.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createApp } from '../server/index.js';
import { Store } from '../server/store.js';
import { renderPdf, findChrome } from '../server/delivery/pdf.js';

const minutes = Number(process.argv[2] || 10);
const out = path.resolve('samples');
fs.mkdirSync(out, { recursive: true });

const app = createApp({ store: new Store(':memory:') });
const server = http.createServer(app.handler).listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
const port = server.address().port;

if (!findChrome()) {
  console.error('No Chromium found. Set OC_CHROME to a Chrome/Chromium binary.');
  process.exit(1);
}

const plan = [
  [1, 'single', 'business'],
  [2, 'multi', 'business'],
  [3, 'single', 'social'],
  [4, 'multi', 'social'],
];
for (const [n, variant, mode] of plan) {
  const ed = await app.previewEdition(variant, minutes);
  const file = path.join(out, `preview-${n}-${variant === 'single' ? 'ai' : 'ai-food-farming'}-${mode}.pdf`);
  await renderPdf({ url: `http://127.0.0.1:${port}/print/${ed.id}?mode=${mode}`, outFile: file });
  console.log(`Preview ${n}: ${path.relative(process.cwd(), file)} — ${ed.stories.length} stories, ~${ed.stats.readingMinutes[mode]} min, quality ${ed.quality.status}`);
}
server.close();
