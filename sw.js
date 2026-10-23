/* Р-сталь калькулятор — service worker.
   При выпуске новой версии поменяйте VERSION — старый кеш удалится сам. */
const VERSION = 'v10.12';
const CACHE = 'bichamp-calc-' + VERSION;
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest?v=2',
  './icons/apple-touch-icon.png?v=2',
  './icons/icon-192.png?v=2',
  './icons/icon-512.png?v=2',
  './icons/icon-maskable-512.png?v=2',
  './icons/favicon-32.png?v=2'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('bichamp-calc-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Страница: сначала сеть (чтобы сразу получать обновления), при отсутствии сети или
   ответе дольше 3 с — копия из кеша. Иконки и манифест: сначала кеш. */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === 'navigate'){
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const net = await Promise.race([
          fetch(req, {cache: 'no-store'}),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))
        ]);
        if (net && net.ok){ cache.put('./index.html', net.clone()); return net; }
        throw new Error('bad response');
      } catch (_){
        return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
      }
    })());
    return;
  }

  e.respondWith(
    caches.match(req, {ignoreSearch: true}).then(hit => hit || fetch(req).then(res => {
      if (res && res.ok){ const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }))
  );
});
