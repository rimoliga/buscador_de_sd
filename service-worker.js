const CACHE_NAME = "radioaficionados-cache-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/script.js",
  "/styles.css",
  "/manifest.json",
  "/data/listado_radioaficionados_unificado.json.gz",
  "/favicon-192x192.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});