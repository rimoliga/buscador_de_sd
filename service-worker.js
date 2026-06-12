const APP_VERSION = "2026.06.12.13";
const DATA_VERSION = "2025.12.17";
const STATIC_CACHE = `radioaficionados-static-${APP_VERSION}`;
const DATA_CACHE = `radioaficionados-data-${DATA_VERSION}`;
const STATIC_ASSETS = [
  "/",
  "index.html",
  "script.js",
  "manifest.json",
  "favicon-192x192.png",
  "modules/config.js",
  "modules/dataset.js",
  "modules/logbook.js",
  "modules/pins.js",
  "modules/pwa.js",
  "modules/repeaters.js",
  "modules/search.js",
  "modules/tabs.js",
  "modules/ui.js",
  "modules/version.js",
  "libs/leaflet.min.js",
  "libs/leaflet.min.css",
  "libs/images/marker-icon-2x.png",
  "libs/images/marker-icon.png",
  "libs/images/marker-shadow.png"
];
const DATA_PATHS = [
  "/data/listado_radioaficionados_unificado.json.gz",
  "/data/dataset_metadata.json",
  "/data/version.json",
  "/data/repetidoras.json"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache =>
      Promise.allSettled(STATIC_ASSETS.map(url =>
        cache.add(url).catch(err => console.warn('[SW] Failed to cache:', url, err))
      ))
    )
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => ![STATIC_CACHE, DATA_CACHE].includes(key))
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const requestUrl = new URL(event.request.url);
  if (
    requestUrl.origin === location.origin &&
    DATA_PATHS.some(path => requestUrl.pathname.endsWith(path))
  ) {
    event.respondWith(handleDataRequest(event));
    return;
  }
  if (requestUrl.hostname.endsWith('tile.openstreetmap.org')) {
    event.respondWith(
      caches.open('map-tiles').then(cache =>
        cache.match(event.request).then(cached =>
          cached || fetch(event.request).then(res => {
            if (res && res.ok) cache.put(event.request, res.clone());
            return res;
          }).catch(() => cached)
        )
      )
    );
    return;
  }
  // HTML navigation: network-first so users always get the latest markup
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.ok)
            caches.open(STATIC_CACHE).then(c => c.put(event.request, response.clone()));
          return response;
        })
        .catch(() => caches.match(event.request).then(r => r || caches.match('index.html')))
    );
    return;
  }
  // Static assets (JS, CSS, images): cache-first
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

async function handleDataRequest(event) {
  const cache = await caches.open(DATA_CACHE);
  const cachedResponse = await cache.match(event.request);

  const networkFetch = fetch(event.request)
    .then(async networkResponse => {
      if (networkResponse && networkResponse.ok) {
        const responseClone = networkResponse.clone();
        event.waitUntil(cache.put(event.request, responseClone));

        if (cachedResponse) {
          event.waitUntil(compareAndNotify(event.request.url, cachedResponse, networkResponse.clone()));
        } else {
          event.waitUntil(notifyClients({ type: "DATA_UPDATED", version: DATA_VERSION }));
        }
        return networkResponse;
      }
      return cachedResponse || networkResponse;
    })
    .catch(() => cachedResponse);

  return cachedResponse || networkFetch;
}

async function compareAndNotify(url, oldResponse, newResponse) {
  const hasChanged = await responsesDiffer(oldResponse, newResponse);
  if (hasChanged) {
    await notifyClients({ type: "DATA_UPDATED", version: DATA_VERSION, url });
  }
}

async function responsesDiffer(oldResponse, newResponse) {
  const [oldBuffer, newBuffer] = await Promise.all([
    oldResponse.clone().arrayBuffer(),
    newResponse.clone().arrayBuffer()
  ]);
  if (oldBuffer.byteLength !== newBuffer.byteLength) {
    return true;
  }
  const oldView = new Uint8Array(oldBuffer);
  const newView = new Uint8Array(newBuffer);
  for (let i = 0; i < oldView.length; i += 1) {
    if (oldView[i] !== newView[i]) {
      return true;
    }
  }
  return false;
}

async function notifyClients(message) {
  const clientList = await self.clients.matchAll({ includeUncontrolled: true });
  clientList.forEach(client => client.postMessage(message));
}
