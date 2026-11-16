/* Offline cache for Peptide Calculator & Planner.
 * Bump CACHE_VERSION whenever any cached file changes so installed copies pick up the update.
 * Strategy: precache the app shell on install; serve same-origin GETs cache-first and refresh the cache in the background
 * (stale-while-revalidate), so the app works offline and updates on the next open after a deploy.
 * User data lives in localStorage and is never touched by the service worker.
 * Notifications (opt-in, shown by the app via registration.showNotification) are handled by the notificationclick and periodicsync listeners below.
 * The 'peptide-notify-state' cache is separate from the app-shell cache and holds only upcoming reminder text (no dose amounts). */
const CACHE_VERSION = 'v2';
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

/* ---------- Notifications ---------- */
// Tapping a notification focuses an open app window (and switches tab) or opens the app on the Today tab (Inventory for stock alerts).
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const data = event.notification.data || {};
  const tab = data.tab === 'inventory' ? 'inventory' : 'today';
  const scope = self.registration.scope;
  const target = new URL('./#' + tab, scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (let i = 0; i < list.length; i++) {
        const c = list[i];
        if (c.url.indexOf(scope) === 0) {
          try { c.postMessage({ type: 'notification-click', tab: tab }); } catch (e) { /* ignore */ }
          if ('focus' in c) return c.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});

// Best effort only: where Periodic Background Sync is available (installed Chrome PWAs), show reminders that came due while the app was closed.
// The app writes a snapshot of upcoming reminders (title/body/time only) and which ones were already shown; never relied on.
const NOTIFY_CACHE = 'peptide-notify-state', NOTIFY_URL = './notify-state.json';
self.addEventListener('periodicsync', function (event) {
  if (event.tag !== 'peptide-dose-check') return;
  event.waitUntil((async function () {
    const cache = await caches.open(NOTIFY_CACHE);
    const res = await cache.match(NOTIFY_URL);
    if (!res) return;
    const snap = await res.json();
    const now = Date.now(), notified = snap.notified || {};
    const d = new Date(now), pad = function (n) { return String(n).padStart(2, '0'); };
    const todayKey = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    let changed = false;
    if (snap.notifyDoses) {
      for (const x of (snap.doses || [])) {
        if (x.at <= now && x.at > now - 6 * 3600000 && !notified['d|' + x.id]) {
          notified['d|' + x.id] = 1; changed = true;
          await self.registration.showNotification(x.title, { body: x.body, tag: 'dose-' + x.id, icon: 'icon-192.png', badge: 'icon-192.png', data: { tab: 'today' } });
        }
      }
    }
    if (snap.notifyReorder) {
      for (const x of (snap.reorders || [])) {
        if (x.key.slice(-10) === todayKey && !notified['r|' + x.key]) {
          notified['r|' + x.key] = 1; changed = true;
          await self.registration.showNotification(x.title, { body: x.body, tag: 'stock-' + x.key, icon: 'icon-192.png', badge: 'icon-192.png', data: { tab: 'inventory' } });
        }
      }
    }
    if (changed) { snap.notified = notified; await cache.put(NOTIFY_URL, new Response(JSON.stringify(snap), { headers: { 'Content-Type': 'application/json' } })); }
  })());
});
