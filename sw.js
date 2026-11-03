const CACHE_NAME = 'troll-setec-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/KonBong.html',
  '/KonPov.html',
  '/genZ.html',
  '/manifest.webmanifest',
  '/offline.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => { if (key !== CACHE_NAME) return caches.delete(key); return null; })
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Network-first for navigation (HTML pages), cache-first for assets
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return res;
      }).catch(() => caches.match('/offline.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((res) => {
      // Optionally cache fetched responses for same-origin
      if (event.request.url.startsWith(self.location.origin)) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      }
      return res;
    }).catch(() => {
      // fallback to cached offline or nothing
      return caches.match('/offline.html');
    }))
  );
});
