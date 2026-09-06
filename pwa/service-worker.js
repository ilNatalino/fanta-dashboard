const CACHE_PREFIX = "fanta-dashboard-";
const CACHE_NAME = `${CACHE_PREFIX}__PWA_RELEASE_ID__`;
const APP_SHELL_PATHS = /* __PWA_APP_SHELL__ */ [];
const appShellUrls = APP_SHELL_PATHS.map(
  (path) => new URL(path, self.registration.scope).href,
);
const offlineEntryUrl = new URL("index.html", self.registration.scope).href;
const scopePath = new URL(self.registration.scope).pathname;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(appShellUrls)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
        .map((key) => caches.delete(key)),
    )),
  );
});

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);
  if (
    event.request.method !== "GET"
    || requestUrl.origin !== self.location.origin
    || !requestUrl.pathname.startsWith(scopePath)
  ) return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        if (event.request.mode === "navigate") return cache.match(offlineEntryUrl);
        return fetch(event.request);
      }),
    ),
  );
});
