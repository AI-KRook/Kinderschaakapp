/* =================================================================
   Engine — Stockfish (gratis, open source) als hulpje én als zwaarste
   tegenstander. Draait in een Web Worker, volledig in de browser.
   - Als coach (hints): op volle sterkte, zodat de tip altijd goed is.
   - Als tegenstander op niveau 4: bewust op de zwakste stand
     (UCI_LimitStrength), maar zelfs dan is hij sterk. Een kind van 5
     wint hier waarschijnlijk niet; de zachte niveaus 1 tot 3 zijn om
     te winnen.
   De sterkte wordt per opdracht meegegeven, zodat hints en de
   tegenstander los van elkaar staan. Laadt pas wanneer voor het eerst
   nodig (lui).
   ================================================================= */
(function () {
  "use strict";

  var worker = null;
  var ready = false;
  var initStarted = false;
  var queue = [];
  var current = null; // de finish-callback van de lopende opdracht
  var engineMode = null; // "strong" | "weak"; voorkomt onnodig herinstellen

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

  function applyMode(mode, elo) {
    if (mode === engineMode) return;
    engineMode = mode;
    if (mode === "weak") {
      post("setoption name UCI_LimitStrength value true");
      post("setoption name UCI_Elo value " + (elo || 1350));
      post("setoption name Skill Level value 0");
    } else {
      post("setoption name UCI_LimitStrength value false");
      post("setoption name Skill Level value 20");
    }
  }

  function pump() {
    if (!ready || current || !queue.length) return;
    var job = queue.shift();
    current = job.cb;
    applyMode(job.mode, job.elo);
    post("position fen " + job.fen);
    post("go " + job.go);
  }

  // bestMove(fen, {movetime, depth, timeout, elo}) -> Promise<{from,to,promotion}|null>
  // Zonder elo: volle sterkte (coach/hint). Met elo: zwakke tegenstander.
  function bestMove(fen, opts) {
    opts = opts || {};
    ensureInit();
    return new Promise(function (resolve) {
      if (!worker) { resolve(null); return; }
      var done = false;
      function finish(mv) { if (done) return; done = true; resolve(mv); }
      var go = opts.depth ? ("depth " + opts.depth) : ("movetime " + (opts.movetime || 500));
      queue.push({
        fen: fen, go: go, cb: finish,
        mode: opts.elo ? "weak" : "strong", elo: opts.elo || 0
      });
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
