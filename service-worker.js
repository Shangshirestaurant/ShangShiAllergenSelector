// service-worker.js (hybrid update, network-first HTML/JSON, SWR assets)
const CACHE_VERSION = "v3"; // bump each deploy
const RUNTIME_CACHE = `shangshi-runtime-${CACHE_VERSION}`;

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k.startsWith("shangshi-runtime-") && k !== RUNTIME_CACHE) ? caches.delete(k) : null))
    )
  );
  self.clients.claim();
});

function isHTMLRequest(req) {
  return req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
}
function isJSONRequest(req) {
  return new URL(req.url).pathname.endsWith(".json");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (isHTMLRequest(req) || isJSONRequest(req)) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: "no-store" });
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match(req);
        return cached || new Response("Offline", { status: 503 });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(RUNTIME_CACHE);
    const cached = await cache.match(req);
    const fetched = fetch(req).then(res => {
      if (req.method === "GET" && (res.status === 200 || res.status === 0)) {
        cache.put(req, res.clone());
      }
      return res;
    }).catch(() => cached);
    return cached || fetched;
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
