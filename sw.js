const CACHE_NAME = 'laya-mod-v90-light-startup-data';
const APP_SHELL = [
  './',
  './index.html',
  './style.css?v=v90-light-startup',
  './manifest.webmanifest',
  './assets/logo.png',
  './data/checklist_templates.json',
  './js/app.js?v=v90-light-startup',
  './js/firebase-config.js',
  './js/firebase-init.js?v=v90-light-startup'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function isCodeOrStyle(req) {
  const url = new URL(req.url);
  return /\.(css|js)$/i.test(url.pathname);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const isNavigation = req.mode === 'navigate';
  const isSameOrigin = new URL(req.url).origin === self.location.origin;

  if (isNavigation) {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy)).catch(() => {});
          return resp;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // v90: JS/CSS should be network-first so GitHub updates do not get stuck behind old cache.
  if (isSameOrigin && isCodeOrStyle(req)) {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          if (resp && resp.ok) {
            const copy = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
          }
          return resp;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((resp) => {
        if (isSameOrigin && resp && resp.ok) {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return resp;
      });
    })
  );
});
