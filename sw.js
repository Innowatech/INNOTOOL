const CACHE_NAME = 'mat-service-tool-v6.3.1';
const CORE_URLS = [
  './',
  './index.html',
  './media.js',
  './manifest.json'
];
const OPTIONAL_URLS = [
  './anleitung.html',
  './users.json',
  './databases.json',
  './icon.png'
];
const IS_PREVIEW = /(^|\.)run\.app$|localhost|127\.0\.0\.1|webcontainer/i.test(self.location.hostname);

function fetchWithHardTimeout(request, ms = 1500, fetchOpts = {}) {
  const ctrl = new AbortController();
  let tid;
  const timeoutPromise = new Promise((_, reject) => {
    tid = setTimeout(() => {
      try { ctrl.abort(); } catch {}
      reject(new Error('SW network timeout after ' + ms + 'ms'));
    }, ms);
  });
  const fetchPromise = fetch(request, { ...fetchOpts, signal: ctrl.signal });
  return Promise.race([fetchPromise, timeoutPromise]).finally(() => clearTimeout(tid));
}

self.addEventListener('install', event => {
  if (IS_PREVIEW) {
    self.skipWaiting();
    return;
  }
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_URLS);
    await Promise.all(OPTIONAL_URLS.map(async u => {
      try {
        const res = await fetchWithHardTimeout(u, 3000, { cache: 'no-cache' });
        if (res && res.ok && !res.redirected) {
          await cache.put(u, res);
        }
      } catch {}
    }));
  })());
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

async function fetchJsonWithTimeout(request, cacheKey, ms = 1200) {
  const res = await fetchWithHardTimeout(request, ms, { cache: 'no-store' });
  if (!res || !res.ok) throw new Error('HTTP ' + (res ? res.status : 0));
  const bodyText = await Promise.race([
    res.text(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Body timeout')), ms))
  ]);
  const freshRes = new Response(bodyText, {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
  const cacheCopy = freshRes.clone();
  caches.open(CACHE_NAME).then(c => c.put(cacheKey, cacheCopy)).catch(() => {});
  return freshRes;
}

async function toNonRedirectedResponse(res) {
  if (!res || !res.redirected) return res;
  const buf = await res.arrayBuffer();
  return new Response(buf, {
    status: res.status || 200,
    statusText: res.statusText || 'OK',
    headers: res.headers
  });
}

self.addEventListener('fetch', event => {
  if (IS_PREVIEW) return;
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.searchParams.has('cb')) return;

  // Navigation (App-Start): Sofort & ohne jede Netzwerk-Wartezeit aus dem Cache bedienen
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const hit = (await cache.match(event.request, { ignoreSearch: true }))
        || (await cache.match('./index.html'))
        || (await cache.match('./'));
      if (hit) return toNonRedirectedResponse(hit);
      return fetchWithHardTimeout(event.request, 4000);
    })());
    return;
  }

  // users.json & databases.json: Harter 1,2s Timeout (inkl. Body-Read), bei Schwachnetz sofort Cache-Fallback
  if (url.pathname.endsWith('/users.json') || url.pathname.endsWith('/databases.json')) {
    const cacheKey = url.pathname.endsWith('/databases.json') ? './databases.json' : './users.json';
    event.respondWith(
      fetchJsonWithTimeout(event.request, cacheKey, 1200)
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match(cacheKey);
          return cached || new Response('{}', {
            status: 503,
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
          });
        })
    );
    return;
  }

  // Alle übrigen App-Dateien (manifest.json, icon.png, favicon.ico etc.):
  // Cache-First + harter 1,5s Netzwerk-Timeout, damit uncached Icons im Funkloch niemals das Laden blockieren
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = (await cache.match(event.request, { ignoreSearch: true }))
      || (await caches.match(event.request, { ignoreSearch: true }));
    if (cached) return toNonRedirectedResponse(cached);
    try {
      const res = await fetchWithHardTimeout(event.request, 1500);
      if (res && res.ok && res.type === 'basic' && !res.redirected) {
        const copy = res.clone();
        cache.put(event.request, copy).catch(() => {});
      }
      return res;
    } catch {
      if (url.pathname.endsWith('/favicon.ico') || url.pathname.endsWith('/icon.png')) {
        return new Response('', { status: 204 });
      }
      return new Response('', { status: 504 });
    }
  })());
});
