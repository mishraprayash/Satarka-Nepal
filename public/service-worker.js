/*
 * Satarka service worker — deliberately small and hand-written.
 *
 * - Hashed build assets (/_next/static) and icons: cache-first.
 * - Page navigations: network-first, falling back to the last cached copy of
 *   that page (or the locale home page) when offline.
 * - /api/* is never cached here: hazard data must never be served stale
 *   without a label. useAlerts keeps its own clearly-marked last-known snapshot.
 *
 * Bump CACHE_VERSION to drop every cache on the next activation.
 */
const CACHE_VERSION = "v1";
const STATIC_CACHE = `satarka-static-${CACHE_VERSION}`;
const PAGES_CACHE = `satarka-pages-${CACHE_VERSION}`;
const OWN_CACHES = [STATIC_CACHE, PAGES_CACHE];

const PRECACHE = [
  "/en",
  "/ne",
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PAGES_CACHE);
      // Best-effort: a failed precache must not block installation.
      await Promise.allSettled(PRECACHE.map((url) => cache.add(url)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Also clears caches left behind by the previous next-pwa/workbox worker.
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !OWN_CACHES.includes(k)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

function isStaticAsset(url) {
  return url.pathname.startsWith("/_next/static/") || /\.(?:png|svg|ico|webmanifest|woff2?)$/.test(url.pathname);
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(STATIC_CACHE);
    void cache.put(request, response.clone());
  }
  return response;
}

async function networkFirstPage(request, url) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(PAGES_CACHE);
      void cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    const locale = url.pathname.startsWith("/ne") ? "/ne" : "/en";
    const home = await caches.match(locale);
    if (home) return home;
    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request, url));
  } else if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
  }
});
