const CACHE = 'jumprope-shell-v7';
const SHELL = ['/', '/manifest.webmanifest', '/icon.svg', '/icon-180.png', '/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  // The operational count viewer must never fall back to the cached app shell.
  // A transient Pages/CDN miss previously rendered the public app login screen at /count-viewer/.
  if (url.pathname === '/count-viewer' || url.pathname.startsWith('/count-viewer/')) return;
  event.respondWith(
    fetch(event.request, { cache: 'no-store' }).then((response) => {
      if (response.ok) caches.open(CACHE).then((cache) => cache.put(event.request, response.clone())).catch(() => {});
      return response;
    }).catch(() => caches.match(event.request).then((cached) => cached || caches.match('/')))
  );
});
