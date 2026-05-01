const CACHE_NAME = 'laya-mod-v96-all-roles-can-post';
const APP_VERSION = 'v96-all-roles-can-post';
const APP_SHELL = [
  './',
  './index.html',
  './style.css?v=' + APP_VERSION,
  './manifest.webmanifest',
  './assets/logo.png?v=' + APP_VERSION,
  './data/checklist_templates.json?v=' + APP_VERSION,
  './js/app.js?v=' + APP_VERSION,
  './js/firebase-config.js?v=' + APP_VERSION,
  './js/firebase-init.js?v=' + APP_VERSION
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

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data && event.data.type === 'CLEAR_OLD_CACHES') {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
    );
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isNavigation = req.mode === 'navigate';
  const isSameOrigin = url.origin === self.location.origin;
  const isCodeAsset = isSameOrigin && /\.(?:html|js|css|json)$/i.test(url.pathname);

  if (isNavigation) {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy)).catch(() => {});
          return resp;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  if (isCodeAsset) {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
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
