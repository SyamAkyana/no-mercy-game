/* ============================================================================
   No Mercy — Service Worker (offline app shell)
   ----------------------------------------------------------------------------
   Precaches the app shell so the game loads even with no network. Real gameplay
   still needs the Socket.IO connection (shown by the "CONNECTION LOST" banner),
   but the shell + local pass-and-play visuals are available offline.
   ========================================================================== */
const CACHE = 'no-mercy-v1';
const SHELL = [
  '/',
  '/index.html',
  '/game-engine.js',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Only handle same-origin GET requests.
  if (req.method !== 'GET' || url.origin !== location.origin) return;

  // Navigations: network-first, fall back to cached shell (offline).
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/index.html', copy));
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Socket.IO client: stale-while-revalidate.
  if (url.pathname === '/socket.io/socket.io.js') {
    e.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Other same-origin assets: cache-first, then network (cache put).
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      });
    })
  );
});
