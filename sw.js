const CACHE_NAME = 'mat-service-tool-v8';
const assetsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon.png'
];

// 1. Sofortige Installation & Caching beim ersten Online-Start
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(assetsToCache);
      })
  );
});

// 2. Sofortige Übernahme der Kontrolle für installierte PWAs
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

// 3. Abfang-Logik speziell für installierte Apps (Cache First)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Wenn die Datei im Cache liegt, liefere sie SOFORT aus
        if (cachedResponse) {
          return cachedResponse;
        }
        // Versuche online zu gehen, bei Misserfolg (offline) liefere immer die index.html
        return fetch(event.request).catch(() => {
          return caches.match('./index.html');
        });
      })
  );
});
