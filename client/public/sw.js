// Small service worker: repeat visits load from the phone's own storage, and a friendly page shows when there is no internet.
// It never stores /api answers, so events, forms and tickets are always fresh.
const VERSION = 'v3';
const STATIC = `static-${VERSION}`;
const OFFLINE = '/offline.html';
const PRECACHE = [OFFLINE, '/favicon.png', '/favicon-64.png', '/boot.js', '/manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(STATIC).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== STATIC).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (/^\/(api|s|admin|uploads)(\/|$)/.test(url.pathname)) return;

  // pages: always try the network first so people see the newest content; fall back to the offline page
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match(OFFLINE)));
    return;
  }
  // hashed build files and core shell assets: serve from storage instantaneously
  if (url.pathname.startsWith('/assets/') || PRECACHE.includes(url.pathname)) {
    e.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })
    );
    return;
  }
  // logos keep their file name when they are replaced: show the saved copy at once, then refresh it in the background
  if (url.pathname.startsWith('/logos/')) {
    e.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(req);
        const fresh = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
        return hit || (await fresh) || Response.error();
      })
    );
  }
});
