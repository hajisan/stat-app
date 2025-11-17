const CACHE_NAME = 'stat-app-cache-v1';
const ASSETS = [
  '/stat-app/',
  '/stat-app/index.html',
  '/stat-app/styles.css',
  '/stat-app/app.js',
  '/stat-app/manifest.webmanifest',
  '/stat-app/icons/basketball-192.png',
  '/stat-app/icons/basketball-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;

  // Network first for navigation, cache first for assets
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/stat-app/index.html'))
    );
  } else {
    event.respondWith(
      caches.match(req).then(
        cached => cached || fetch(req)
      )
    );
  }
});