const APP_VERSION = "2025.12.1";
const DATA_VERSION = "2025.12.17";
const STATIC_CACHE = `radioaficionados-static-${APP_VERSION}`;
const DATA_CACHE = `radioaficionados-data-${DATA_VERSION}`;
const STATIC_ASSETS = [
  "/",
  "index.html",
  "script.js",
  "manifest.json",
  "favicon-192x192.png"
];
const DATA_PATHS = [
  "/data/listado_radioaficionados_unificado.json.gz",
  "/data/dataset_metadata.json",
  "/data/listado_radioaficionados_stats.json",
  "/data/version.json"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS))
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
