/* =================================================================
   Service worker — maakt de app offline bruikbaar.
   Bij de installatie wordt alleen de app-schil opgeslagen (snel en robuust);
   de geluidsfragmenten worden vanzelf bewaard zodra ze voor het eerst klinken
   (cache-first met lui opslaan). Verhoog CACHE bij elke nieuwe versie.
   ================================================================= */
var CACHE = "hinnik-schaak-v35";

var ASSETS = [
  "./",
  "index.html",
  "manifest.json",
  "css/styles.css",
  "fonts/fredoka-400.woff2",
  "fonts/fredoka-600.woff2",
  "fonts/fredoka-700.woff2",
  "vendor/chess.js",
  "vendor/stockfish.js",
  "js/speech.js",
  "js/mascotte.js",
  "js/board.js",
  "js/bot.js",
  "js/engine.js",
  "js/sound.js",
  "js/modules.js",
  "js/app.js",
  "pieces/wp.png", "pieces/wr.png", "pieces/wn.png", "pieces/wb.png", "pieces/wq.png", "pieces/wk.png",
  "pieces/bp.png", "pieces/br.png", "pieces/bn.png", "pieces/bb.png", "pieces/bq.png", "pieces/bk.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-512-maskable.png",
  "icons/apple-touch-icon.png",
  "audio/voices.json",
  "audio/fenna/manifest.json",
  "audio/maarten/manifest.json",
  "audio/_silent.wav"
];

self.addEventListener("install", function (e) {
  // alleen de app-schil + de manifests vooraf opslaan. De mp3's worden vanzelf
  // bewaard zodra ze voor het eerst klinken (zie de fetch-handler hieronder).
  e.waitUntil(
    caches.open(CACHE).then(function (cache) {
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
