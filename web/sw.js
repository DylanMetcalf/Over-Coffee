// Over Coffee service worker.
//   - App shell and assets: cache-first (versioned), so the app opens instantly and offline.
//   - Navigation: network-first, falling back to the cached shell.
//   - Reader's edition data: network-first, falling back to the last copy, so
//     today's paper is readable on a train with no signal.
//   - Account, writes and anything else: never cached.
// The cache is wiped on logout so a shared device never shows another reader's paper.

const VERSION = 'oc-v4';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/css/fonts.css', '/css/tokens.css', '/css/paper.css', '/css/social.css', '/css/base.css', '/assets/favicon.svg', '/assets/icon-192.png', '/assets/mark.svg'];
const DATA = /^\/api\/(today|editions\/[^/]+(\/ledger)?|me|auth\/me)$/;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('message', (e) => {
  if (e.data === 'clear') e.waitUntil(caches.delete(VERSION).then(() => caches.open(VERSION)));
});

async function networkFirst(req, fallbackKey) {
  const cache = await caches.open(VERSION);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(fallbackKey || req, res.clone());
    return res;
  } catch {
    const hit = await cache.match(fallbackKey || req);
    if (hit) return hit;
    throw new Error('offline');
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(VERSION);
  const hit = await cache.match(req);
  if (hit) {
    fetch(req).then((res) => res.ok && cache.put(req, res)).catch(() => {});
    return hit;
  }
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(networkFirst(req, '/index.html').catch(() => new Response('<h1>Offline</h1><p>Open Over Coffee when you are back online.</p>', { headers: { 'content-type': 'text/html' }, status: 503 })));
    return;
  }
  if (url.pathname.startsWith('/api/')) {
    if (DATA.test(url.pathname)) e.respondWith(networkFirst(req));
    return;
  }
  if (/^\/(css|js|assets)\//.test(url.pathname) || url.pathname === '/manifest.webmanifest') e.respondWith(cacheFirst(req));
});
