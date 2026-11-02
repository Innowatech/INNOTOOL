JavaScript

const CACHE_NAME = 'mat-service-tool-v1';
const assetsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// Installation & Caching beim ersten Online-Start
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(assetsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Alte Caches aufräumen bei Updates
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

// Jede Anfrage abfangen: Erst im Cache suchen, sonst online gehen
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse; // Sofort aus dem Cache liefern!
        }
        return fetch(event.request);
      })
  );
});