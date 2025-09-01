const CACHE_NAME="shangshi-cache-v1";
const URLS=[
  "./",
  "./index.html",
  "./menu.html",
  "./styles.css",
  "./app.js",
  "./menu.json",
  "./logo.png",
  "./manifest.webmanifest"
];

self.addEventListener("install",e=>{
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(URLS)));
  self.skipWaiting();
});

self.addEventListener("activate",e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.map(k=>k!==CACHE_NAME?caches.delete(k):null)))
  );
  self.clients.claim();
});

self.addEventListener("fetch",e=>{
  const req=e.request;
  e.respondWith(
    caches.match(req).then(res=>res||fetch(req).then(r=>{
      // runtime cache for GET requests
      if(req.method==="GET" && (r.status===200 || r.status===0)){
        const resp=r.clone();
        caches.open(CACHE_NAME).then(c=>c.put(req, resp));
      }
      return r;
    }).catch(()=>caches.match("./index.html")))
  );
});