/* =================================================================
   Engine — Stockfish (gratis, open source) als hulpje.
   Draait in een Web Worker, volledig in de browser. Wordt gebruikt om
   het kind goede zetten te laten zien (hints), niet als sterke
   tegenstander: het kind moet kunnen blijven winnen.
   Laadt pas wanneer het voor het eerst nodig is (lui).
   ================================================================= */
(function () {
  "use strict";

  var worker = null;
  var ready = false;
  var initStarted = false;
  var queue = [];
  var current = null; // de finish-callback van de lopende opdracht

  function ensureInit() {
    if (initStarted) return;
    initStarted = true;
    try {
      worker = new Worker("vendor/stockfish.js");
    } catch (e) {
      worker = null;
      return;
    }
    worker.onmessage = function (e) {
      handleLine(typeof e.data === "string" ? e.data : "");
    };
    worker.onerror = function () { ready = false; };
    post("uci");
  }

  function post(cmd) { if (worker) try { worker.postMessage(cmd); } catch (e) {} }

  function handleLine(line) {
    if (!line) return;
    if (line.indexOf("uciok") >= 0) {
      post("setoption name Skill Level value 20");
      post("isready");
    } else if (line.indexOf("readyok") >= 0) {
      ready = true;
      pump();
    } else if (line.indexOf("bestmove") >= 0) {
      var m = line.match(/bestmove\s+(\S+)/);
      var mv = (m && m[1] && m[1] !== "(none)") ? parseUci(m[1]) : null;
      var cb = current; current = null;
      if (cb) cb(mv);
      pump();
    }
  }

  function parseUci(s) {
    return { from: s.slice(0, 2), to: s.slice(2, 4), promotion: s.length > 4 ? s[4] : undefined };
  }

  function pump() {
    if (!ready || current || !queue.length) return;
    var job = queue.shift();
    current = job.cb;
    post("position fen " + job.fen);
    post("go " + job.go);
  }

  // bestMove(fen, {movetime, depth, timeout}) -> Promise<{from,to,promotion}|null>
  function bestMove(fen, opts) {
    opts = opts || {};
    ensureInit();
    return new Promise(function (resolve) {
      if (!worker) { resolve(null); return; }
      var done = false;
      function finish(mv) { if (done) return; done = true; resolve(mv); }
      var go = opts.depth ? ("depth " + opts.depth) : ("movetime " + (opts.movetime || 500));
      queue.push({ fen: fen, go: go, cb: finish });
      setTimeout(function () {
        if (!done) {
          if (current === finish) post("stop");
          finish(null);
        }
      }, opts.timeout || 5000);
      pump();
    });
  }

  window.Engine = {
    bestMove: bestMove,
    warmup: ensureInit,
    isAvailable: function () { return !!worker || !initStarted; }
  };
})();
