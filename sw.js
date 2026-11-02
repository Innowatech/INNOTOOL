const CACHE_NAME = 'mat-service-tool-v10';
const assetsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// 1. Installieren und sofort cachen
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(assetsToCache);
    })
  );
});

// 2. Alte Caches sofort löschen und Kontrolle übernehmen
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

// 3. Ultra-robuster Fetch-Handler für Desktop-PWAs
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).catch(() => {
          // Wenn offline und die Hauptseite angefordert wird, IMMER index.html liefern
          return caches.match('./index.html').then(indexResponse => {
            if (indexResponse) {
              return indexResponse;
            }
            return caches.match('./');
          });
        });
      })
  );
});
