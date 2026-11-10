const CACHE_NAME = 'mat-service-tool-v1.91';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// Installation: Dateien cachen
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting(); // Erzwingt, dass der neue SW sofort aktiv wird
});

// Aktivierung: Alten Cache aufräumen
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Alter Cache wird gelöscht:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Aus dem Cache oder Netzwerk laden
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});
