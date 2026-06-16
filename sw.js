// LiverAPP | Service Worker
// This makes the app work fully offline

const CACHE_NAME = 'liver-app-v1';

// Files to cache on install
const PRE_CACHE = [
  './',
  './index.html',
  'https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap'
];

// Install: cache essential files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Pre-caching app shell');
        return cache.addAll(PRE_CACHE);
      })
      .then(() => self.skipWaiting())
      .catch(err => {
        console.log('[SW] Pre-cache failed (will work on next visit):', err);
        return self.skipWaiting();
      })
  );
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names => {
      return Promise.all(
        names.filter(n => n !== CACHE_NAME).map(n => {
          console.log('[SW] Removing old cache:', n);
          return caches.delete(n);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: serve from cache first, fall back to network, cache new responses
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        // Serve from cache immediately, but also update cache in background
        fetch(event.request).then(response => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, response));
          }
        }).catch(() => {}); // Ignore network errors during background update
        return cached;
      }

      // Not in cache - fetch from network and cache it
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200) return response;

        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        // Offline and not cached - return a simple offline message for navigation
        if (event.request.mode === 'navigate') {
          return new Response(
            '<html><body style="font-family:sans-serif;text-align:center;padding:60px 20px"><h2>You are offline</h2><p>Open this page while connected to the internet first, then it will work offline.</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        }
      });
    })
  );
});
