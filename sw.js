// THE ALPHA PULSE Service Worker - v3 (GitHub Pages & PWA Compatible)
const CACHE_NAME = 'alphapulse-cache-v3';
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
  // Allow real-time WebSockets and streaming broker/market data through untouched
  if (
    event.request.url.startsWith('ws://') || 
    event.request.url.startsWith('wss://') ||
    event.request.url.includes('binance.com') ||
    event.request.url.includes('kraken.com') ||
    event.request.url.includes('fyers.in') ||
    event.request.url.includes('tradingview.com') ||
    event.request.method !== 'GET'
  ) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});