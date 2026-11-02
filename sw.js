const CACHE_NAME = 'mat-service-tool-v10';
const assetsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon.png'
];

// 1. Installation & Caching beim ersten Online-Start
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(assetsToCache);
      })
  );
});

// 2. Sofortige Übernahme der Kontrolle
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Zuverlässige Offline-Abfang-Logik (Cache First mit Fallback)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Wenn die Datei im Cache liegt, sofort ausliefern
        if (cachedResponse) {
          return cachedResponse;
        }
        // Versuchen online zu laden, bei Fehler (offline) IMMER die index.html ausliefern
        return fetch(event.request).catch(() => {
          return caches.match('./index.html');
        });
      })
  );
});
