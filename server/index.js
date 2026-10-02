// Over Coffee — HTTP server.
//
// Zero runtime dependencies: node:http, node:sqlite, and headless Chromium
// (optional) for PDF files. The browser app is plain ES modules in /web.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store } from './store.js';
import { runPipeline, STAGES, ENGINE_VERSION } from './engine/pipeline.js';
import { TOPIC_CATALOG, interpretInterest, randomTopic, adventurousTopic, resolveTopic } from './engine/topics.js';
import { createResearchAdapter } from './engine/research/index.js';
import { renderPdf, findChrome } from './delivery/pdf.js';
import { deliverEmail, audioPayload } from './delivery/channels.js';
import { renderPrintDocument } from '../web/js/render/print.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(here, '../web');
const PORT = Number(process.env.PORT || 4321);
const HOST = process.env.HOST || '0.0.0.0';
const BASE_URL = process.env.OC_BASE_URL || `http://localhost:${PORT}`;
const USER = 'reader';

export const DEFAULT_PROFILE = {
  onboarded: false,
  topics: ['ai', 'food', 'farming'],
  budgetMinutes: 10,
  mode: 'business',
  delivery: { time: '06:00', method: 'web' },
  discovery: 'occasionally',
  pdf: { paper: 'A4' },
  audio: { enabled: true },
};

export function createApp({ store = new Store() } = {}) {
  store.ensureUser(USER, 'Reader', DEFAULT_PROFILE);
  const adapter = createResearchAdapter();
  const today = () => adapter.editionDate || new Date().toISOString().slice(0, 10);
  const profile = () => ({ ...DEFAULT_PROFILE, ...store.getProfile(USER) });

  function effectiveToday() {
    const p = profile();
    const override = store.getOverride(USER, today());
    return { profile: p, override, topicIds: override?.topicIds?.length ? override.topicIds : p.topics, budgetMinutes: p.budgetMinutes };
  }

  async function todaysEdition({ force = false } = {}) {
    const { topicIds, budgetMinutes, override } = effectiveToday();
    const existing = store.latestEdition(USER, today());
    const same = existing && existing.engineVersion === ENGINE_VERSION && existing.config.budgetMinutes === budgetMinutes && existing.config.topicIds.join() === topicIds.join();
    if (same && !force) return existing;
    return runPipeline({ store, userId: USER, topicIds, budgetMinutes, date: today(), kind: 'daily', extra: override?.reason ? override : null });
  }

  async function previewEdition(variant, minutes) {
    const id = `preview-${variant}-${minutes}`;
    const existing = store.getEdition(id);
    if (existing && existing.engineVersion === ENGINE_VERSION) return existing;
    const topicIds = variant === 'single' ? ['ai'] : ['ai', 'food', 'farming'];
    return runPipeline({ store, userId: 'preview', topicIds, budgetMinutes: minutes, date: today(), kind: 'preview', id });
  }

  const routes = [];
  const route = (method, pattern, handler) => routes.push({ method, re: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), handler });

  route('GET', '/api/me', () => {
    const { profile: p, override, topicIds } = effectiveToday();
    return {
      user: { id: USER },
      profile: p,
      today: today(),
      override,
      todayTopics: topicIds.map(resolveTopic),
      profileTopics: p.topics.map(resolveTopic),
      sample: !!adapter.sample,
      engineVersion: ENGINE_VERSION,
      stages: STAGES.map(([key, number, label]) => ({ key, number, label })),
      pdf: !!findChrome(),
    };
  });

  route('PUT', '/api/profile', async ({ body }) => {
    const next = { ...profile(), ...body };
    if (body.delivery) next.delivery = { ...profile().delivery, ...body.delivery };
    if (Array.isArray(next.topics)) next.topics = [...new Set(next.topics)].slice(0, 12);
    if (![5, 10, 20].includes(Number(next.budgetMinutes))) next.budgetMinutes = 10;
    next.budgetMinutes = Number(next.budgetMinutes);
    if (!['business', 'social'].includes(next.mode)) next.mode = 'business';
    store.saveProfile(USER, next);
    return { profile: next };
  });

  route('POST', '/api/reset', () => {
    store.saveProfile(USER, DEFAULT_PROFILE);
    store.setOverride(USER, today(), null);
    return { profile: DEFAULT_PROFILE };
  });

  route('GET', '/api/topics/catalog', () => {
    const avail = adapter.availableTopics?.() || new Set();
    return { topics: TOPIC_CATALOG.map((t) => ({ id: t.id, label: t.label, name: t.name, expansion: t.expansion, adjacent: t.adjacent, hasMaterial: avail.has(t.id) })) };
  });

  route('POST', '/api/topics/interpret', ({ body }) => ({ topic: interpretInterest(body.text) }));

  route('GET', '/api/topics/random', ({ query }) => {
    const { topicIds } = effectiveToday();
    return { topic: randomTopic(topicIds, adapter.availableTopics?.(), query.get('seed') || Date.now()) };
  });

  route('GET', '/api/topics/adventurous', ({ query }) => {
    const { profile: p } = effectiveToday();
    return adventurousTopic(p.topics, adapter.availableTopics?.(), query.get('seed') || Date.now()) || { topic: null };
  });

  // Change Daily — today only; the profile is untouched unless `keep` is set.
  route('PUT', '/api/today', async ({ body }) => {
    if (!body.topicIds?.length) store.setOverride(USER, today(), null);
    else store.setOverride(USER, today(), { topicIds: body.topicIds, reason: body.reason || 'changed', path: body.path || null });
    if (body.keep && body.topicIds?.length) store.saveProfile(USER, { ...profile(), topics: body.topicIds });
    const edition = await todaysEdition();
    return { editionId: edition.id };
  });

  route('GET', '/api/today', async () => {
    const ed = await todaysEdition();
    return { edition: ed };
  });

  route('POST', '/api/today/regenerate', async () => {
    const ed = await todaysEdition({ force: true });
    return { edition: ed };
  });

  route('GET', '/api/editions', () => ({ editions: store.listEditions(USER) }));
  route('GET', '/api/editions/:id', async ({ params }) => {
    const preview = params.id.match(/^preview-(single|multi)-(5|10|20)$/);
    const ed = preview ? await previewEdition(preview[1], Number(preview[2])) : store.getEdition(params.id);
    return ed ? { edition: ed } : { status: 404, error: 'Edition not found' };
  });
  route('GET', '/api/editions/:id/ledger', ({ params }) => store.editionLedger(params.id));
  route('GET', '/api/editions/:id/audio', ({ params, query }) => {
    const ed = store.getEdition(params.id);
    return ed ? audioPayload(ed, query.get('mode') === 'social' ? 'social' : 'business') : { status: 404, error: 'Edition not found' };
  });
  route('POST', '/api/editions/:id/email', ({ params }) => {
    const ed = store.getEdition(params.id);
    if (!ed) return { status: 404, error: 'Edition not found' };
    return { file: path.relative(process.cwd(), deliverEmail({ edition: ed, profile: profile(), baseUrl: BASE_URL })) };
  });

  route('GET', '/api/previews', async ({ query }) => {
    const minutes = [5, 10, 20].includes(Number(query.get('minutes'))) ? Number(query.get('minutes')) : 10;
    const [single, multi] = [await previewEdition('single', minutes), await previewEdition('multi', minutes)];
    return { single, multi };
  });

  // PDF: cached per edition and mode.
  route('GET', '/api/editions/:id/pdf', async ({ params, query, res }) => {
    const mode = query.get('mode') === 'social' ? 'social' : 'business';
    const ed = store.getEdition(params.id);
    if (!ed) return { status: 404, error: 'Edition not found' };
    let file = store.getArtifact(ed.id, 'pdf', mode);
    if (!file) {
      try {
        file = await renderPdf({ url: `http://127.0.0.1:${PORT}/print/${ed.id}?mode=${mode}`, outFile: path.resolve('data/artifacts', `${ed.id}-${mode}.pdf`) });
        store.putArtifact(ed.id, 'pdf', mode, file);
      } catch (err) {
        if (err.code === 'NO_CHROME') return { redirect: `/print/${ed.id}?mode=${mode}&autoprint=1` };
        throw err;
      }
    }
    const name = `over-coffee-${ed.editorialDate}-${mode}.pdf`;
    res.writeHead(200, { 'content-type': 'application/pdf', 'content-disposition': `${query.get('download') ? 'attachment' : 'inline'}; filename="${name}"` });
    fs.createReadStream(file).pipe(res);
    return null;
  });

  // Short links printed in the PDF lead back to the digital depth layer.
  route('GET', '/s/:ed/:st', ({ params, query }) => ({ redirect: `/#/story/${encodeURIComponent(params.ed)}/${encodeURIComponent(params.st)}?mode=${query.get('m') === 's' ? 'social' : 'business'}` }));

  route('GET', '/print/:id', ({ params, query, res }) => {
    const ed = store.getEdition(params.id);
    if (!ed) return { status: 404, error: 'Edition not found' };
    const mode = query.get('mode') === 'social' ? 'social' : 'business';
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(renderPrintDocument(ed, mode, { baseUrl: BASE_URL, autoprint: query.get('autoprint') === '1', paper: profile().pdf?.paper }));
    return null;
  });

  // Delivery scheduler: generate today's edition once the delivery time passes.
  function tick() {
    const p = profile();
    if (!p.onboarded) return;
    const [h, m] = (p.delivery?.time || '06:00').split(':').map(Number);
    const now = new Date();
    if (now.getHours() * 60 + now.getMinutes() < h * 60 + m) return;
    if (store.latestEdition(USER, today())) return;
    todaysEdition()
      .then((ed) => p.delivery?.method === 'email' && deliverEmail({ edition: ed, profile: p, baseUrl: BASE_URL }))
      .catch((e) => console.error('[scheduler]', e));
  }

  async function handler(req, res) {
    const url = new URL(req.url, 'http://x');
    try {
      for (const r of routes) {
        if (r.method !== req.method) continue;
        const m = url.pathname.match(r.re);
        if (!m) continue;
        const body = ['POST', 'PUT'].includes(req.method) ? await readJson(req) : {};
        const out = await r.handler({ req, res, params: m.groups || {}, query: url.searchParams, body });
        if (out === null) return;
        if (out.redirect) {
          res.writeHead(302, { location: out.redirect });
          return res.end();
        }
        res.writeHead(out.status || 200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
        return res.end(JSON.stringify(out));
      }
      if (req.method === 'GET') return serveStatic(url.pathname, res);
      res.writeHead(405).end();
    } catch (err) {
      console.error(err);
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'Something went wrong preparing your edition.', detail: err.message }));
    }
  }

  return { handler, tick, store, todaysEdition, previewEdition };
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon' };

function serveStatic(pathname, res) {
  const rel = pathname === '/' ? '/index.html' : decodeURIComponent(pathname);
  const file = path.resolve(WEB, '.' + rel);
  if (!file.startsWith(WEB) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    return res.end('Not found');
  }
  const ext = path.extname(file);
  res.writeHead(200, { 'content-type': TYPES[ext] || 'application/octet-stream', 'cache-control': ext === '.woff2' ? 'public, max-age=31536000' : 'no-cache' });
  fs.createReadStream(file).pipe(res);
}

function readJson(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const app = createApp();
  http.createServer(app.handler).listen(PORT, HOST, () => {
    console.log(`\n  OVER COFFEE  ·  ${BASE_URL}\n  Good morning. Here’s what matters.\n`);
  });
  setInterval(app.tick, 60_000);
}
