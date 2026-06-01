/* ============================================================
   Science Wonders — Service Worker
   Caches all pages so the app works fully offline.
   IMPORTANT: bump CACHE_VERSION whenever you add/change files,
   so installed apps pull the new version on next online open.
   ============================================================ */

const CACHE_VERSION = "science-wonders-v1";

// All files to cache for offline use.
// Filenames with spaces are URL-encoded (e.g. %20) so they match correctly.
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./preview.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png",
  // ── Featured simulations ──
  "./lenses-mirrors.html",
  "./friction.html",
  "./twin-paradox.html",
  "./Earth%20and%20SolarSystem.html",
  // ── All simulations grid ──
  "./gravity.html",
  "./double-slit.html",
  "./Doppler_effect.html",
  "./Planet_formation.html",
  "./BlackHole.html",
  "./CarbonDating.html",
  "./double-pendulum.html",
  "./induction.html"
];

// Install: pre-cache all files
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      // addAll fails entirely if ONE file is missing, so we add individually
      return Promise.allSettled(
        FILES_TO_CACHE.map((url) => cache.add(url))
      );
    })
  );
  self.skipWaiting();
});

// Activate: delete old caches when version bumps
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: serve from cache first, fall back to network, then update cache
self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  // Skip Google Analytics and other cross-origin tracking
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // Serve cached, but refresh in background
        fetch(event.request)
          .then((resp) => {
            if (resp && resp.status === 200) {
              caches.open(CACHE_VERSION).then((c) => c.put(event.request, resp.clone()));
            }
          })
          .catch(() => {});
        return cached;
      }
      // Not cached: fetch from network and cache it
      return fetch(event.request)
        .then((resp) => {
          if (resp && resp.status === 200) {
            const clone = resp.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(event.request, clone));
          }
          return resp;
        })
        .catch(() => {
          // Offline and not cached — fall back to homepage for navigations
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }
        });
    })
  );
});
