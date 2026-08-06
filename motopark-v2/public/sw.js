// Kill-switch: replaces V1's Workbox service worker.
// Wipes all caches, unregisters itself, then reloads the page.
// The browser's built-in SW update check will pick this up
// within 24 hours of the user's next visit.
//
// SAFE TO DELETE once all V1 users have migrated (~ 30 days after deploy).

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
      .then(() => self.registration.unregister())
      .then(() => {
        // Reload all open tabs so they fetch V2 from the network
        self.clients.matchAll({ type: 'window' }).then((clients) => {
          clients.forEach((client) => client.navigate(client.url));
        });
      })
  );
});

// Pass all fetch requests straight to the network (no caching)
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
