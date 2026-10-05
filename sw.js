/* ============================================================
   sw.js — 離線快取
   ------------------------------------------------------------
   策略分三種:

   1. 本站的檔案(HTML / JS / CSS / 圖):**網路優先,而且刻意繞過
      瀏覽器的 HTTP 快取**(fetch 的 cache:"reload")。只要有網路,
      拿到的一定是伺服器上最新的版本,不會再發生「改了程式碼但網頁
      還是舊的」。拿到之後順手存進快取。
   2. 沒有網路時:回退到快取。整份 App 都預先存過,所以在飛機上、
      在韓國沒網路也打得開。
   3. Google Fonts:快取優先(字型不會變),背景再更新。

   **Supabase 的 API 完全不碰**——那是 POST 而且必須即時,
   一律直接走網路。

   改版時把下面的 VERSION 換一個新值(日期最好記),舊快取會在
   啟用時自動清掉。
   ============================================================ */

const VERSION = '2026-10-05c';
const SHELL   = 'busan-shell-' + VERSION;
const FONTS   = 'busan-fonts-v1';

/* 整個 App 會用到的檔案。查詢字串要跟 index.html / styles.css 裡寫的一模一樣,
   不然離線時會對不上。 */
const PRECACHE = [
  './',
  './index.html',
  './styles.css',
  './data.js',
  './app.js',
  './sync.js',
  './manifest.webmanifest',
  './masthead-gwangan.webp?v=11',
  './icon-192.png?v=13',
  './icon-512.png?v=13'
];

/* ---------- 安裝:把 App 整包存起來 ---------- */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL).then((cache) =>
      /* 一個一個存,某一個檔案失敗不會讓整次安裝掛掉 */
      Promise.all(PRECACHE.map((url) =>
        cache.add(new Request(url, {cache: 'reload'}))
             .catch((err) => console.warn('[sw] 預先快取失敗:', url, err))
      ))
    ).then(() => self.skipWaiting())
  );
});

/* ---------- 啟用:清掉舊版本的快取 ---------- */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== SHELL && k !== FONTS)
            .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* 讓頁面可以叫新版立刻接手 */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

/* ---------- 攔截請求 ---------- */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;                    /* POST 一律不管(含 Supabase) */

  const url = new URL(req.url);

  if (url.hostname.endsWith('supabase.co')) return;    /* 同步 API 永遠走網路 */

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(fontsFirst(req));
    return;
  }

  if (url.origin !== self.location.origin) return;     /* 其他外站不接手 */

  event.respondWith(networkFirst(req));
});

/* 網路優先:繞過 HTTP 快取拿最新的,失敗才吃自己的快取 */
async function networkFirst(req) {
  try {
    const fresh = await fetch(new Request(req.url, {
      cache: 'reload',
      credentials: 'same-origin',
      redirect: 'follow'
    }));
    if (fresh && fresh.status === 200 && fresh.type === 'basic') {
      const cache = await caches.open(SHELL);
      cache.put(req, fresh.clone());
    }
    return fresh;
  } catch (err) {
    const hit = await caches.match(req, {ignoreSearch: false});
    if (hit) return hit;

    /* 查詢字串換過(例如 ?v=12 變 ?v=13)時,退而求其次拿舊的那份 */
    const loose = await caches.match(req, {ignoreSearch: true});
    if (loose) return loose;

    /* 直接開網址、但沒網路 → 給快取裡的首頁 */
    if (req.mode === 'navigate') {
      const shell = await caches.match('./index.html');
      if (shell) return shell;
    }
    throw err;
  }
}

/* 字型:快取優先,背景更新 */
async function fontsFirst(req) {
  const cache = await caches.open(FONTS);
  const hit = await cache.match(req);
  if (hit) {
    fetch(req).then((res) => {
      if (res && res.status === 200) cache.put(req, res.clone());
    }).catch(() => {});
    return hit;
  }
  try {
    const res = await fetch(req);
    if (res && res.status === 200) cache.put(req, res.clone());
    return res;
  } catch (err) {
    return new Response('', {status: 504, statusText: 'offline'});
  }
}
