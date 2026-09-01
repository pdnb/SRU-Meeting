/* SRU-Conf app-shell service worker. Do not cache API, WebSocket, or LiveKit. */
const CACHE = "sru-shell-v1";
const SHELL = ["/", "/login", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET") {
    return;
  }
  if (
    url.pathname.startsWith("/api/") ||
    url.protocol === "ws:" ||
    url.protocol === "wss:"
  ) {
    return;
  }
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/") || Response.error()),
    );
    return;
  }
});
