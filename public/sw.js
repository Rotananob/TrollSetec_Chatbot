// Minimal safe service worker for PWA installability without cache collisions
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Network passthrough - do not cache aggressively to protect iOS Safari
  return;
});
