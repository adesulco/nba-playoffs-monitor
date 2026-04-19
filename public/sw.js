/* eslint-disable no-restricted-globals */
/**
 * Gibol service worker — Phase 1
 *
 * Strategy:
 *   - App shell (HTML, JS bundles): stale-while-revalidate
 *   - Bracket + schedule pages: cache-first with 5-minute TTL (offline viewing)
 *   - Score endpoints: network-first with 3s timeout, cache fallback
 *   - Recap OG images: cache-first (they're immutable post-final)
 *   - Everything else: network-first
 *
 * Bump SW_VERSION to force a cache flush.
 */

const SW_VERSION = "gibol-2026-04-18-v1";
const SHELL_CACHE = `${SW_VERSION}-shell`;
const RUNTIME_CACHE = `${SW_VERSION}-runtime`;
const IMMUTABLE_CACHE = `${SW_VERSION}-immutable`;

// The minimum surface that must work offline: bracket view + home.
const PRECACHE_URLS = [
  "/",
  "/playoff",
  "/bracket",
  "/offline",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      // individual add() so a single 404 doesn't break the whole install
      Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn("[sw] precache miss", url, err);
          }),
        ),
      ),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(SW_VERSION))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Only handle same-origin — don't interfere with third-party (analytics, ads)
  if (url.origin !== self.location.origin) return;

  // Recap images: aggressively cache, immutable after final
  if (url.pathname.startsWith("/api/recap/")) {
    event.respondWith(cacheFirst(request, IMMUTABLE_CACHE, 60 * 60 * 24 * 7));
    return;
  }

  // Live score endpoints: network-first with short timeout
  if (url.pathname.startsWith("/api/scores") || url.pathname.startsWith("/api/live")) {
    event.respondWith(networkFirst(request, RUNTIME_CACHE, 3000));
    return;
  }

  // Bracket + playoff pages: cache-first with short TTL (offline viewing)
  if (url.pathname.startsWith("/bracket") || url.pathname === "/playoff") {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    return;
  }

  // JS / CSS / fonts: stale-while-revalidate
  if (/\.(?:js|css|woff2?|ttf|otf|png|jpg|jpeg|svg|webp|ico)$/i.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
    return;
  }

  // Navigations: network-first, offline fallback
  if (request.mode === "navigate") {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }

  // Default
  event.respondWith(networkFirst(request, RUNTIME_CACHE, 5000));
});

/* --- Strategy helpers --- */

async function cacheFirst(request, cacheName, maxAgeSec) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached && !isExpired(cached, maxAgeSec)) {
    return cached;
  }
  try {
    const response = await fetch(request);
    if (response.ok) {
      const clone = response.clone();
      await cache.put(request, tagWithTimestamp(clone));
    }
    return response;
  } catch (err) {
    if (cached) return cached;
    throw err;
  }
}

async function networkFirst(request, cacheName, timeoutMs) {
  const cache = await caches.open(cacheName);
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), timeoutMs)),
    ]);
    if (response && response.ok) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}

async function networkFirstWithOfflineFallback(request) {
  try {
    return await fetch(request);
  } catch (err) {
    const cache = await caches.open(SHELL_CACHE);
    const offline = await cache.match("/offline");
    if (offline) return offline;
    return new Response("Offline", { status: 503, headers: { "content-type": "text/plain" } });
  }
}

function tagWithTimestamp(response) {
  const headers = new Headers(response.headers);
  headers.set("x-sw-cached-at", String(Date.now()));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function isExpired(response, maxAgeSec) {
  if (!maxAgeSec) return false;
  const cachedAt = response.headers.get("x-sw-cached-at");
  if (!cachedAt) return false;
  const ageSec = (Date.now() - Number(cachedAt)) / 1000;
  return ageSec > maxAgeSec;
}

/* --- Push notifications (Phase 1 opt-in, wired but inert until keys set) --- */

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Gibol", body: event.data.text() };
  }
  const { title = "Gibol", body = "", url = "/", tag, icon, badge } = payload;
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: icon ?? "/icons/icon-192.png",
      badge: badge ?? "/icons/badge-72.png",
      tag,
      data: { url },
      vibrate: [100, 40, 100],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url ?? "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(target) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    }),
  );
});
