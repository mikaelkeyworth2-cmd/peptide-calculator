/* Offline cache for Peptide Calculator & Planner.
 * Bump CACHE_VERSION whenever any cached file changes so installed copies pick up the update.
 * Strategy: precache the app shell on install; serve same-origin GETs cache-first and refresh the cache in the background
 * (stale-while-revalidate), so the app works offline and updates on the next open after a deploy.
 * User data lives in localStorage and is never touched by the service worker. */
const CACHE_VERSION = 'v1';
const CACHE_NAME = 'peptide-calc-' + CACHE_VERSION;
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(CACHE_NAME).then(function (cache) { return cache.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k.indexOf('peptide-calc-') === 0 && k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never touch third-party requests
  event.respondWith(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.match(req, { ignoreSearch: true }).then(function (cached) {
        const network = fetch(req).then(function (res) {
          if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
          return res;
        }).catch(function () { return null; });
        if (cached) { event.waitUntil(network); return cached; }
        return network.then(function (res) {
          if (res) return res;
          // Offline and not cached: fall back to the app shell for page navigations.
          return req.mode === 'navigate' ? cache.match('./index.html') : Response.error();
        });
      });
    })
  );
});
