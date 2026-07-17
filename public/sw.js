// Minimal hand-rolled service worker for Ishin.
// Goals: installability + fast repeat loads + a graceful offline page.
// Deliberately conservative: never caches HTML navigations (the app is
// auth-driven and force-dynamic, so a cached page could show the wrong state)
// and never touches /api (translations stream and must hit the network).

const VERSION = 'v4'; // v4: seal brand icons — flush the precached torii set
const STATIC_CACHE = `tt-static-${VERSION}`;
const OFFLINE_URL = '/offline.html';
const PRECACHE = [OFFLINE_URL, '/icon-192.png', '/icon-512.png'];

// Hashed build assets under /_next/static/ accumulate forever within one cache
// version — every deploy mints new filenames and the old ones are never
// requested again — so cap them, evicting oldest-first (CacheStorage keys are
// in insertion order). Other static assets (icons, images) are naturally
// bounded and left alone, which also keeps the precache safe from eviction.
const MAX_HASHED_ENTRIES = 80;

async function trimHashedAssets(cache) {
  const keys = await cache.keys();
  const hashed = keys.filter((req) => new URL(req.url).pathname.startsWith('/_next/static/'));
  if (hashed.length <= MAX_HASHED_ENTRIES) return;
  await Promise.all(hashed.slice(0, hashed.length - MAX_HASHED_ENTRIES).map((req) => cache.delete(req)));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith('tt-static-') && k !== STATIC_CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    /\.(?:png|svg|ico|webp|jpg|jpeg|gif|woff2?)$/.test(url.pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api')) return; // let the network handle it

  // HTML navigations: network-first, fall back to the offline page (never cache).
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Static assets: stale-while-revalidate.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((res) => {
            // Trim is best-effort fire-and-forget: the response must not wait
            // on cache housekeeping, and a missed trim is retried next fetch.
            if (res && res.ok) cache.put(request, res.clone()).then(() => trimHashedAssets(cache));
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});
