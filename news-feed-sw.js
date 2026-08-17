const CACHE = 'cei-news-feed-v2-safe';
const ASSETS = ['./','./news-feed.html','./news-feed.css','./news-feed.js','./news-feed-manifest.json','./news-feed-icon-192.svg','./news-feed-icon-512.svg'];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', event => { event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request))); });
