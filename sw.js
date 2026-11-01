// THE ALPHA PULSE Service Worker - v4 (Network-First Instant Updates)
const CACHE_NAME = 'alphapulse-cache-v4';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Pass real-time WebSockets and streaming broker/market data through directly
  if (
    event.request.url.startsWith('ws://') || 
    event.request.url.startsWith('wss://') ||
    event.request.url.includes('binance.com') ||
    event.request.url.includes('kraken.com') ||
    event.request.url.includes('coincap.io') ||
    event.request.url.includes('fyers.in') ||
    event.request.url.includes('tradingview.com') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // NETWORK-FIRST FOR HTML DOCUMENTS (Guarantees instant updates on refresh without stale cache)
  if (event.request.mode === 'navigate' || event.request.destination === 'document' || event.request.url.includes('index.html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first with network fallback for static icons/assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});