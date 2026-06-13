/* =================================================================
   Service worker — maakt de app offline bruikbaar.
   Cachet alle app-bestanden bij de installatie en serveert ze daarna
   uit de cache (cache-first). Verhoog CACHE bij elke nieuwe versie.
   ================================================================= */
var CACHE = "hinnik-schaak-v1";

var ASSETS = [
  "./",
  "index.html",
  "manifest.json",
  "css/styles.css",
  "vendor/chess.js",
  "js/speech.js",
  "js/mascotte.js",
  "js/board.js",
  "js/bot.js",
  "js/modules.js",
  "js/app.js",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-512-maskable.png",
  "icons/apple-touch-icon.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (cache) {
      // voeg toe, maar laat de installatie niet falen als één icoon mist
      return Promise.all(ASSETS.map(function (url) {
        return cache.add(url).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      if (cached) return cached;
      return fetch(e.request).then(function (resp) {
        // nieuwe bestanden meteen meecachen
        var copy = resp.clone();
        caches.open(CACHE).then(function (cache) { cache.put(e.request, copy).catch(function () {}); });
        return resp;
      }).catch(function () {
        // offline en niet in cache: val terug op de startpagina
        return caches.match("index.html");
      });
    })
  );
});
