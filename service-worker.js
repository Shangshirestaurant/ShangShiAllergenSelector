// Minimal PWA service worker: network-first for HTML/JSON, SWR for assets
const CACHE_VERSION = "v1759621332";
const RUNTIME_CACHE = `shangshi-runtime-${CACHE_VERSION}`;

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => (k.startsWith("shangshi-runtime-") && k !== RUNTIME_CACHE) ? caches.delete(k) : null)
    ))
  );
  self.clients.claim();
});

const isHTML = (req) => req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
const isJSON = (req) => new URL(req.url).pathname.endsWith(".json");

self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (isHTML(req) || isJSON(req)) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: "no-store" });
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        const cached = await caches.match(req);
        return cached || new Response("Offline", { status: 503 });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(RUNTIME_CACHE);
    const cached = await cache.match(req);
    const fetching = fetch(req).then(res => {
      if (req.method === "GET" && (res.status === 200 || res.status === 0)) cache.put(req, res.clone());
      return res;
    }).catch(() => cached);
    return cached || fetching;
  })());
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});
