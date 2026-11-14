const CACHE_NAME = 'mat-service-tool-v4.8';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
  // Kein automatisches skipWaiting(): Der neue SW wartet, bis autoUpdate-Nutzer auf "Jetzt aktualisieren" klicken.
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // users.json: Online immer aktuell laden (für Sperrungen/Rechte), im Keller offline aus dem Cache liefern
  if (url.pathname.endsWith('/users.json')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(c => c.put('./users.json', copy));
          }
          return res;
        })
        .catch(() => caches.match('./users.json'))
    );
    return;
  }

  // App-Dateien: Cache-First für garantierte Offline-Verfügbarkeit + Schutz vor stillem Überschreiben
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
        }
        return res;
      });
    })
  );
});
