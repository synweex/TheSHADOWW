// Service worker: permite jocul offline după prima deschidere
const CACHE = 'skystack-v2';
const FILES = [
  './', 'index.html', 'style.css', 'manifest.webmanifest', 'icon.svg',
  'js/data.js', 'js/audio.js', 'js/storage.js', 'js/game.js', 'js/ui.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// rețea întâi (ca să primești actualizări), cache dacă ești offline
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('index.html')))
  );
});
