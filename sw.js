const CACHE_NAME = 'mat-service-tool-v8';
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
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(assetsToCache);
    })
  );
});

// 2. Sofortige Übernahme der Kontrolle und alte Caches löschen
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

// 3. Ultra-robuster Offline-Fetch-Handler für PC und Mobile
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).catch(() => {
          // Fallback bei fehlendem Internet: Liefere immer die index.html aus dem Cache
          return caches.match('./index.html').then(indexResponse => {
            return indexResponse || caches.match('./');
          });
        });
      })
  );
});
