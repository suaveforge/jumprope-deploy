const CACHE = 'jumprope-shell-v8';
const SHELL = ['/', '/manifest.webmanifest', '/icon.svg', '/icon-180.png', '/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))));
    await self.clients.claim();

    // COUNT_VIEWER_SW_AUTOHEAL_V1
    // Users already controlled by the old v6 worker can receive the cached app shell
    // on the first /count-viewer/ navigation. Once this worker activates, force only
    // those viewer clients to navigate again so the request bypasses the app-shell fallback.
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    await Promise.all(clients.map(async (client) => {
      try {
        const url = new URL(client.url);
        if (url.pathname === '/count-viewer' || url.pathname.startsWith('/count-viewer/')) {
          await client.navigate(client.url);
        }
      } catch {}
    }));
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  // The operational count viewer must never fall back to the cached app shell.
  if (url.pathname === '/count-viewer' || url.pathname.startsWith('/count-viewer/')) return;
  event.respondWith(
    fetch(event.request, { cache: 'no-store' }).then((response) => {
      if (response.ok) caches.open(CACHE).then((cache) => cache.put(event.request, response.clone())).catch(() => {});
      return response;
    }).catch(() => caches.match(event.request).then((cached) => cached || caches.match('/')))
  );
});
