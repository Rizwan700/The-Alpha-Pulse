// THE ALPHA PULSE - Service Worker (v6.0.0 - Network-First Live Sync)
const CACHE_NAME = "alphapulse-live-v6";
const STATIC_ASSETS = [
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[AlphaPulse SW] Wiping obsolete cache:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Network-First for HTML and Live Feeds, Cache-Only for static icons
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Bypass cache completely for live streams, websockets, and external APIs
  if (
    url.protocol === "ws:" ||
    url.protocol === "wss:" ||
    url.hostname.includes("binance") ||
    url.hostname.includes("kraken") ||
    url.hostname.includes("coincap") ||
    url.hostname.includes("coinbase") ||
    url.hostname.includes("fyers") ||
    url.hostname.includes("tradingview") ||
    url.hostname.includes("workers.dev")
  ) {
    return;
  }

  // Network-First for index.html (Guarantees user always sees fresh live data!)
  if (url.pathname.endsWith("index.html") || url.pathname === "/" || url.pathname.endsWith("/")) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" })
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for static icons
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
