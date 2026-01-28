// sw.js（全文貼り替え）
const VERSION = '2026-01-29-01'; // ←更新のたびに数字を変える
const CACHE_NAME = `ofa-driver-${VERSION}`;

self.addEventListener('install', (event) => {
  self.skipWaiting(); // すぐ新SWを有効化
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)));
    await self.clients.claim();
  })());
});

// ネット優先（最新を取りに行く）
// 取れなければキャッシュを返す
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 自分のサイトだけ対象
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    try {
      const fresh = await fetch(req, { cache: 'no-store' });
      // 成功したらキャッシュ更新
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, fresh.clone());
      return fresh;
    } catch (e) {
      // オフライン等ならキャッシュ
      const cached = await caches.match(req);
      return cached || new Response('offline', { status: 503 });
    }
  })());
});
