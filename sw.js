const CACHE_NAME = 'libro-contable-v4';
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

// Network-first para el cascarón de la app: siempre intenta traer la versión
// más nueva primero y actualiza el caché con lo que llegue; solo usa la copia
// guardada si no hay conexión. Antes era cache-first y los cambios nuevos no
// se veían hasta borrar el caché a mano, sin importar cómo se recargara.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, resClone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
