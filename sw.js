/* 釜山潮汐行程表 — 離線快取
   策略:優先走網路(這樣改版會立刻生效),沒網路時回退到快取。 */
const CACHE = 'busan-tide-v16';
const ASSETS = ['./', './index.html', './styles.css', './data.js', './app.js',
  './manifest.webmanifest', './masthead-gwangan.webp?v=11',
  './icon-192.png?v=13', './icon-512.png?v=13'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((hit) => hit || caches.match('./index.html')))
  );
});
