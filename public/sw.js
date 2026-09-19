/* Minimal service worker for PWA installability. Network-first for app; cache shell icons only. */
const SHELL_CACHE = "noxy-crm-shell-v3";
const SHELL_ASSETS = [
  "/favicon.svg",
  "/favicon.webp",
  "/apple-touch-icon.png",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(async (cache) => {
      await Promise.all(
        SHELL_ASSETS.map((asset) => cache.add(asset).catch(() => undefined)),
      );
      await self.skipWaiting();
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== SHELL_CACHE).map((key) => caches.delete(key))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache API or auth traffic.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) {
    return;
  }

  const isShellAsset = SHELL_ASSETS.some((asset) => url.pathname === asset);
  if (isShellAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        });
        return cached || network;
      }),
    );
    return;
  }

  // Navigation / app pages: network-first, fall back to cache only if offline.
  event.respondWith(
    fetch(request)
      .then((response) => response)
      .catch(() => caches.match(request).then((cached) => cached || Response.error())),
  );
});
