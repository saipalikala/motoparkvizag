// public/sw.js
// Replaces old Workbox SW on all existing user devices.
// Wipes every cache, then passes all requests straight to network.
// Vite PWA will overwrite this with a new generated SW on next build —
// that is correct and expected behaviour.

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});