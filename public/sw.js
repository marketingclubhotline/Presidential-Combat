/**
 * Phase 14 — service worker.
 *
 * Cache strategy is split deliberately:
 *   - app shell (html/js/css/icons): cache-first, so the game boots offline
 *     and instantly on a phone home screen.
 *   - data/*.json (balance data): network-first with cache fallback, so a
 *     balance patch reaches players on their next online launch instead of
 *     being pinned forever by an immutable cache.
 *   - never cache /ws or /health — signaling must always hit the network.
 */
const VERSION = 'presidential-combat-animation-v7';
const SHELL = `${VERSION}-shell`;
const DATA = `${VERSION}-data`;

const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(SHELL)
      .then(c => c.addAll(SHELL_ASSETS).catch(() => {/* tolerate a missing icon */}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.pathname.startsWith('/ws') || url.pathname.startsWith('/health')) return;
  if (url.origin !== self.location.origin) return;

  /* NEVER cache the live-ops API. Serving /api/config from a cache-first
     shell would pin the first balance config a player ever received and
     make the kill switch inert — the one control that must always work.
     Same for telemetry, moderation and the sunset status. */
  if (url.pathname.startsWith('/api/')) return;

  // balance data: network-first
  if (url.pathname.includes('/data/')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copy = res.clone();
          caches.open(DATA).then(c => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // HTML must be network-first so local playtests show the latest changes.
  if (url.pathname === '/' || url.pathname.endsWith('/index.html')) {
    e.respondWith(fetch(e.request, {cache:'no-store'}).catch(() => caches.match(e.request)));
    return;
  }

  // Animation and audio assets: network-first to prevent old sprites persisting
  // on an iPhone after a build. Keep offline fallback for installed players.
  e.respondWith(fetch(e.request, {cache:'no-store'}).then(res => {
    if(res.ok){const copy=res.clone();caches.open(SHELL).then(c=>c.put(e.request,copy));}
    return res;
  }).catch(()=>caches.match(e.request)));

});

// let the page trigger an immediate update
self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
