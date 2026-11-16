const CACHE_NAME = 'mat-service-tool-v5.12';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];
const IS_PREVIEW = /(^|\.)run\.app$|localhost|127\.0\.0\.1|webcontainer/i.test(self.location.hostname);

self.addEventListener('install', event => {
  if (IS_PREVIEW) {
    self.skipWaiting();
    return;
  }
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
  if (IS_PREVIEW) {
    event.waitUntil(
      caches.keys()
        .then(names => Promise.all(names.map(n => caches.delete(n))))
        .then(() => self.clients.claim())
        .then(() => self.registration.unregister())
        .then(() => self.clients.matchAll({ type: 'window' }))
        .then(clients => Promise.all(clients.map(c => c.navigate(c.url).catch(() => null))))
        .catch(() => {})
    );
    return;
  }
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

async function fetchUsersWithTimeout(request, ms = 1500) {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(request, { cache: 'no-store', signal: ctrl.signal });
    if (!res || !res.ok) throw new Error('HTTP ' + (res ? res.status : 0));
    const bodyText = await res.text();
    const freshRes = new Response(bodyText, {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
    const cacheCopy = freshRes.clone();
    caches.open(CACHE_NAME).then(c => c.put('./users.json', cacheCopy)).catch(() => {});
    return freshRes;
  } finally {
    clearTimeout(tid);
  }
}

self.addEventListener('fetch', event => {
  if (IS_PREVIEW) return;
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.searchParams.has('cb')) return;

  // users.json: Max. 1,5s Netzwerk-Timeout (inkl. Body-Read), bei Schwachnetz/Keller sofort Fallback aus Cache
  if (url.pathname.endsWith('/users.json')) {
    event.respondWith(
      fetchUsersWithTimeout(event.request, 1500)
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
