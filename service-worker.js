const CACHE_NAME = "forgefit-static-v4";

const basePath = self.location.pathname.replace(/service-worker\.js$/, "");
const APP_SHELL = [
  `${basePath}`,
  `${basePath}index.html`,
  `${basePath}styles.css`,
  `${basePath}styles.css?v=20260222e`,
  `${basePath}app.js`,
  `${basePath}app.js?v=20260222e`,
  `${basePath}exercises.js`,
  `${basePath}exercises.js?v=20260222e`,
  `${basePath}manifest.webmanifest`,
  `${basePath}manifest.webmanifest?v=20260222e`,
  `${basePath}icon-192.png`,
  `${basePath}icon-512.png`,
  `${basePath}apple-touch-icon.png`
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  const isCoreAsset =
    request.mode === "navigate" ||
    request.destination === "document" ||
    request.destination === "script" ||
    request.destination === "style";

  if (isCoreAsset) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200 && response.type === "basic") {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (_error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    if (request.mode === "navigate" || request.destination === "document") {
      return caches.match(`${basePath}index.html`);
    }
    throw _error;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (!response || response.status !== 200 || response.type !== "basic") {
    return response;
  }
  const cache = await caches.open(CACHE_NAME);
  cache.put(request, response.clone());
  return response;
}
