const CACHE_NAME = 'libro-contable-v7';
const SHELL = ['./', './index.html', './contabilidad_3.html', './manifest.json', './icon-192.png', './icon-512.png', './logo.jpg', './jspdf.umd.min.js'];

// cache:'reload' salta el caché HTTP del navegador, para que al instalar una
// versión nueva se guarden los archivos recién publicados y no una copia de
// hace una hora.
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))));
  self.skipWaiting();
});

// Al reemplazar una versión anterior, recarga las pestañas abiertas para que
// pasen de una vez a la app nueva en lugar de seguir con la vieja hasta la
// próxima apertura (una app vieja abierta ya no puede guardar: ver las
// reglas de Firestore).
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const names = await caches.keys();
    const old = names.filter((n) => n !== CACHE_NAME);
    await Promise.all(old.map((n) => caches.delete(n)));
    await self.clients.claim();
    if (old.length) {
      const wins = await self.clients.matchAll({ type: 'window' });
      wins.forEach((w) => w.navigate(w.url).catch(() => {}));
    }
  })());
});

// Primero la copia guardada, y la red actualiza el caché en segundo plano
// para la próxima apertura. Antes se esperaba hasta 3s a la red por cada
// archivo, lo que con señal débil frenaba cada arranque. Si no hay copia
// guardada todavía (primera visita), sí espera a la red porque no hay de otra.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // El SDK de Firebase viene de gstatic con la versión en la URL, así que
  // nunca cambia: se guarda una vez y de ahí en adelante sale del caché sin
  // tocar la red (el caché normal del navegador no siempre lo conserva,
  // sobre todo en iPhone/iPad).
  if (url.href.startsWith('https://www.gstatic.com/firebasejs/')) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(e.request);
      if (cached) return cached;
      const res = await fetch(e.request);
      if (res.ok) cache.put(e.request, res.clone());
      return res;
    })());
    return;
  }

  if (url.origin !== self.location.origin) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(e.request);

    const networkFetch = fetch(e.request, { cache: 'no-cache' }).then((res) => {
      if (res.ok) cache.put(e.request, res.clone());
      return res;
    });

    if (!cached) return networkFetch;

    e.waitUntil(networkFetch.catch(() => {}));
    return cached;
  })());
});
