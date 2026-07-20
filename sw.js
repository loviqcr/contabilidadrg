const CACHE_NAME = 'libro-contable-v5';
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

// Network-first, pero con un límite de espera: si hay copia guardada y la
// red tarda más de 3s (típico con señal débil), se usa esa copia de una vez
// en lugar de dejar la página colgada — la red sigue trabajando en segundo
// plano y actualiza el caché para la próxima. Si no hay copia guardada
// todavía (primera visita), sí espera a la red porque no hay de otra.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(e.request);

    const networkFetch = fetch(e.request).then((res) => {
      cache.put(e.request, res.clone());
      return res;
    });

    if (!cached) return networkFetch;

    const timeout = new Promise((resolve) => setTimeout(() => resolve(cached), 3000));
    try {
      return await Promise.race([networkFetch, timeout]);
    } catch (err) {
      return cached;
    }
  })());
});
