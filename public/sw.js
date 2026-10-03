// Service worker of the storefront.
//
// It does two things only:
//   1. keeps the files that never change (/_next/static/*, icons, fonts) so repeat
//      visits are faster, and
//   2. shows /offline.html when a page is opened without a connection.
//
// Pages, prices, product data and the admin are NEVER stored here, so a visitor
// can't be shown an old price. Bump CACHE when this file's behavior changes.
const CACHE = "ews-static-v2";
const OFFLINE_URL = "/offline.html";

// Cloudflare serves /offline.html through a redirect (to /offline). A response that
// went through a redirect can't answer a page open, so store a clean copy of it.
async function storeOfflinePage() {
  const response = await fetch(OFFLINE_URL);
  if (!response.ok) throw new Error("offline page unavailable");
  const clean = new Response(await response.blob(), {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
  await (await caches.open(CACHE)).put(OFFLINE_URL, clean);
}

self.addEventListener("install", (event) => {
  event.waitUntil(storeOfflinePage());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

function isImmutableAsset(url) {
  return url.pathname.startsWith("/_next/static/");
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Hashed build files: the name changes whenever the content does, so cache-first is safe.
  if (isImmutableAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  // Page opens: always the network; only when it fails, the offline page.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
  }
});
