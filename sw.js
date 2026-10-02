const CACHE_NAME = 'libro-contable-v6';
const SHELL = ['./', './index.html', './contabilidad_3.html', './manifest.json', './icon-192.png', './icon-512.png', './logo.jpg', './jspdf.umd.min.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
  );
  self.clients.claim();
});

// Primero la copia guardada, y la red actualiza el caché en segundo plano
// para la próxima apertura. Antes se esperaba hasta 3s a la red por cada
// archivo, lo que con señal débil frenaba cada arranque. Si no hay copia
// guardada todavía (primera visita), sí espera a la red porque no hay de otra.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(e.request);

    const networkFetch = fetch(e.request).then((res) => {
      if (res.ok) cache.put(e.request, res.clone());
      return res;
    });

    if (!cached) return networkFetch;

    e.waitUntil(networkFetch.catch(() => {}));
    return cached;
  })());
});
