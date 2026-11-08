// PWA Service Worker - Automatic Cache Purge & Fresh Network Passthrough
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => caches.delete(k)));
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Always passthrough to network so PWA standalone always uses fresh bundles & APIs
  return;
});
