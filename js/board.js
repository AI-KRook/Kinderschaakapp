/* =================================================================
   Board — kindvriendelijk schaakbord
   - tekent zelf het bord en de stukken (grote, duidelijke stukken)
   - verzetten via twee tikken (stuk, dan doelveld) OF slepen
   - legale doelvelden lichten altijd op
   - gebruikt chess.js voor alle regels (zetten, schaak, mat)
   ================================================================= */
(function () {
  "use strict";

  var FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
  var GLYPH = { p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚" };

  function Board() {
    this.el = null;
    this.piecesLayer = null;
    this.pointerEl = null;
    this.game = new Chess();
    this.cellBySquare = {};
    this.pieceEls = {};
    this.goals = {};
    this.selected = null;
    this.mode = "move";          // "move" | "tap" | "locked"
    this.movable = "w";          // "w" | "b" | functie(square,piece) | null(=alles aan de beurt)
    this.dragging = null;        // { from, el, moved, startX, startY }
    this.onMove = null;          // fn(move) bij elke zet
    this.onUserMove = null;      // fn(move) alleen bij zet van het kind
    this.onTapSquare = null;     // fn(square, piece) in tap-modus
    this._waiters = [];          // openstaande beloftes
  }

  /* ---------- opbouw ---------- */
  Board.prototype.mount = function (el) {
    this.el = el;
    el.innerHTML = "";
    this.cellBySquare = {};
    for (var row = 0; row < 8; row++) {
      for (var col = 0; col < 8; col++) {
        var sq = FILES[col] + (8 - row);
        var cell = document.createElement("div");
        cell.className = "cell " + (((row + col) % 2 === 0) ? "light" : "dark");
        cell.dataset.square = sq;
        var dot = document.createElement("span");
        dot.className = "dot";
        cell.appendChild(dot);
        // coördinaten: cijfer 8..1 op de linkerkolom, letter a..h op de onderste rij
        if (col === 0) {
          var rk = document.createElement("span");
          rk.className = "coord rank";
          rk.textContent = String(8 - row);
          cell.appendChild(rk);
        }
        if (row === 7) {
          var fl = document.createElement("span");
          fl.className = "coord file";
          fl.textContent = FILES[col];
          cell.appendChild(fl);
        }
        el.appendChild(cell);
        this.cellBySquare[sq] = cell;
      }
    }
    this.piecesLayer = document.createElement("div");
    this.piecesLayer.className = "pieces";
    el.appendChild(this.piecesLayer);

    this.pointerEl = document.createElement("div");
    this.pointerEl.className = "board-pointer hidden";
    this.pointerEl.textContent = "👇"; // 👇
    el.appendChild(this.pointerEl);

    this._bindPointer();

    // stukken, ster en wijzer schalen mee met de werkelijke vakjesgrootte
    this._updateCellSize();
    var self = this;
    if (window.ResizeObserver) {
      this._ro = new ResizeObserver(function () { self._updateCellSize(); });
      this._ro.observe(el);
    }
    window.addEventListener("resize", function () { self._updateCellSize(); });
    // ook nadat de lay-out is uitgerekend
    setTimeout(function () { self._updateCellSize(); }, 60);
  };

  Board.prototype._updateCellSize = function () {
    if (!this.el) return;
    var w = this.el.clientWidth || this.el.getBoundingClientRect().width;
    if (w > 0) this.el.style.setProperty("--cell", (w / 8) + "px");
  };

  /* ---------- stand zetten ---------- */
  Board.prototype.setFEN = function (fen) {
    this.game = new Chess(fen);
    this.clearSelection();
    this.clearHighlights();
    this.renderFull();
  };
  Board.prototype.reset = function () { this.setFEN("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"); };

  // bouw een eigen stand met losse stukken; pieces = [{type,color,square}]
  Board.prototype.setupCustom = function (pieces, turn) {
    this.game = new Chess();
    this.game.clear();
    pieces.forEach(function (p) {
      this.game.put({ type: p.type, color: p.color }, p.square);
    }, this);
    // forceer de beurt door de FEN aan te passen
    if (turn) {
      var parts = this.game.fen().split(" ");
      parts[1] = turn;
      parts[3] = "-";
      try { this.game.load(parts.join(" ")); } catch (e) {}
    }
    this.clearSelection();
    this.clearHighlights();
    this.renderFull();
  };

  Board.prototype.fen = function () { return this.game.fen(); };
  Board.prototype.turn = function () { return this.game.turn(); };

  // zet de beurt (handig bij oefeningen waar hetzelfde stuk meerdere keren mag zetten)
  Board.prototype.setTurn = function (color) {
    var parts = this.game.fen().split(" ");
    parts[1] = color;
    parts[3] = "-";
    try { this.game.load(parts.join(" ")); } catch (e) {}
  };
  Board.prototype.get = function (square) { return this.game.get(square); };

  /* ---------- tekenen ---------- */
  Board.prototype._transformFor = function (square) {
    var col = FILES.indexOf(square[0]);
    var row = 8 - parseInt(square[1], 10);
    return "translate(" + (col * 100) + "%," + (row * 100) + "%)";
  };

  Board.prototype.renderFull = function () {
    this.piecesLayer.innerHTML = "";
    this.pieceEls = {};
    var board = this.game.board(); // array[8][8] van boven (rank 8) naar onder
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        var p = board[r][c];
        if (!p) continue;
        var sq = FILES[c] + (8 - r);
        this._makePiece(sq, p.type, p.color);
      }
    }
    this._renderGoals();
  };

  Board.prototype._makePiece = function (square, type, color) {
    var el = document.createElement("div");
    el.className = "piece " + (color === "w" ? "white" : "black");
    el.dataset.square = square;
    el.style.transform = this._transformFor(square);
    var g = document.createElement("span");
    g.className = "piece-glyph";
    g.textContent = GLYPH[type];
    el.appendChild(g);
    this.piecesLayer.appendChild(el);
    this.pieceEls[square] = el;
    return el;
  };

  Board.prototype._renderGoals = function () {
    // verwijder oude
    Object.keys(this.cellBySquare).forEach(function (sq) {
      var old = this.cellBySquare[sq].querySelector(".goal");
      if (old) old.remove();
    }, this);
    Object.keys(this.goals).forEach(function (sq) {
      var cell = this.cellBySquare[sq];
      if (!cell) return;
      var g = document.createElement("span");
      g.className = "goal";
      g.textContent = this.goals[sq];
      cell.appendChild(g);
    }, this);
  };

  Board.prototype.setGoal = function (square, emoji) { this.goals[square] = emoji || "⭐"; this._renderGoals(); };
  Board.prototype.clearGoals = function () { this.goals = {}; this._renderGoals(); };

  /* ---------- selectie & highlights ---------- */
  Board.prototype.legalTargets = function (square) {
    var moves = this.game.moves({ square: square, verbose: true }) || [];
    return moves.map(function (m) { return m.to; });
  };

  Board.prototype.select = function (square) {
    this.clearSelection();
    this.selected = square;
    var cell = this.cellBySquare[square];
    if (cell) cell.classList.add("selected");
    var targets = this.legalTargets(square);
    targets.forEach(function (t) {
      var c = this.cellBySquare[t];
      if (!c) return;
      if (this.game.get(t)) c.classList.add("capture");
      else c.classList.add("target");
    }, this);
    this._targets = targets;
  };

  Board.prototype.clearSelection = function () {
    this.selected = null;
    this._targets = [];
    Object.keys(this.cellBySquare).forEach(function (sq) {
      this.cellBySquare[sq].classList.remove("selected", "target", "capture");
    }, this);
  };

  Board.prototype.clearHighlights = function () {
    Object.keys(this.cellBySquare).forEach(function (sq) {
      this.cellBySquare[sq].classList.remove("lastmove", "hintfrom");
    }, this);
  };

  Board.prototype.showHintFrom = function (square) {
    var c = this.cellBySquare[square];
    if (c) c.classList.add("hintfrom");
  };

  /* ---------- wijzende hand ---------- */
  Board.prototype.pointAt = function (square) {
    var col = FILES.indexOf(square[0]);
    var row = 8 - parseInt(square[1], 10);
    this.pointerEl.style.left = ((col + 0.5) * 12.5) + "%";
    this.pointerEl.style.top = ((row + 0.5) * 12.5) + "%";
    this.pointerEl.classList.remove("hidden");
  };
  Board.prototype.clearPointer = function () { if (this.pointerEl) this.pointerEl.classList.add("hidden"); };

  /* ---------- modus & beweegbaarheid ---------- */
  Board.prototype.setMode = function (m) { this.mode = m; this.clearSelection(); };
  Board.prototype.setMovable = function (m) { this.movable = m; };

  Board.prototype._isMovable = function (square) {
    var piece = this.game.get(square);
    if (!piece) return false;
    if (this.mode !== "move") return false;
    if (typeof this.movable === "function") return this.movable(square, piece);
    if (this.movable === "w" || this.movable === "b") {
      return piece.color === this.movable && this.game.turn() === this.movable;
    }
    return piece.color === this.game.turn();
  };

  /* ---------- coördinaten ---------- */
  Board.prototype._squareFromPoint = function (clientX, clientY) {
    var rect = this.el.getBoundingClientRect();
    var x = clientX - rect.left, y = clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;
    var col = Math.floor(x / (rect.width / 8));
    var row = Math.floor(y / (rect.height / 8));
    col = Math.max(0, Math.min(7, col));
    row = Math.max(0, Math.min(7, row));
    return FILES[col] + (8 - row);
  };

  /* ---------- pointer-afhandeling (tik + sleep) ---------- */
  Board.prototype._bindPointer = function () {
    var self = this;
    this.el.addEventListener("pointerdown", function (e) { self._onDown(e); });
    this.el.addEventListener("pointermove", function (e) { self._onMoveP(e); });
    this.el.addEventListener("pointerup", function (e) { self._onUp(e); });
    this.el.addEventListener("pointercancel", function () { self._endDrag(true); });
  };

  Board.prototype._onDown = function (e) {
    // tikt het kind tijdens een uitleg? dan die uitleg meteen afmaken (doorgaan),
    // en de tik niet als zet behandelen.
    if (window.Speech && Speech.isBlocking()) { e.preventDefault(); Speech.skip(); return; }
    if (this.mode === "locked") return;
    var sq = this._squareFromPoint(e.clientX, e.clientY);
    if (!sq) return;
    e.preventDefault();

    if (this.mode === "tap") { this._downSquare = sq; return; }

    // staat er een selectie en is dit een legaal doelveld? -> verzetten
    if (this.selected && this._targets && this._targets.indexOf(sq) >= 0) {
      this._performMove(this.selected, sq, true);
      return;
    }
    // een eigen, beweegbaar stuk oppakken
    if (this._isMovable(sq)) {
      this.select(sq);
      var el = this.pieceEls[sq];
      if (el) {
        el.classList.add("lift", "dragging");
        this.dragging = { from: sq, el: el, moved: false, startX: e.clientX, startY: e.clientY };
        try { this.el.setPointerCapture(e.pointerId); } catch (err) {}
      }
    } else {
      this.clearSelection();
    }
  };

  Board.prototype._onMoveP = function (e) {
    if (!this.dragging) return;
    var d = this.dragging;
    var dx = e.clientX - d.startX, dy = e.clientY - d.startY;
    if (!d.moved && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) d.moved = true;
    if (!d.moved) return;
    var rect = this.el.getBoundingClientRect();
    var size = rect.width / 8;
    var x = e.clientX - rect.left - size / 2;
    var y = e.clientY - rect.top - size / 2;
    d.el.style.transform = "translate(" + x + "px," + y + "px)";
  };

  Board.prototype._onUp = function (e) {
    if (this.mode === "tap") {
      var sqT = this._squareFromPoint(e.clientX, e.clientY);
      if (sqT && sqT === this._downSquare) this._handleTap(sqT);
      this._downSquare = null;
      return;
    }
    if (!this.dragging) return;
    var d = this.dragging;
    var target = this._squareFromPoint(e.clientX, e.clientY);
    if (d.moved && target && this._targets && this._targets.indexOf(target) >= 0 && target !== d.from) {
      d.el.classList.remove("lift", "dragging");
      this.dragging = null;
      this._performMove(d.from, target, true);
    } else {
      // terug op zijn plek; selectie blijft staan zodat tik-tik nog werkt
      d.el.style.transform = this._transformFor(d.from);
      d.el.classList.remove("lift", "dragging");
      this.dragging = null;
    }
  };

  Board.prototype._endDrag = function (snap) {
    if (!this.dragging) return;
    var d = this.dragging;
    if (snap) d.el.style.transform = this._transformFor(d.from);
    d.el.classList.remove("lift", "dragging");
    this.dragging = null;
  };

  Board.prototype._handleTap = function (square) {
    var cell = this.cellBySquare[square];
    if (cell) { cell.classList.add("selected"); setTimeout(function () { cell.classList.remove("selected"); }, 500); }
    var piece = this.game.get(square);
    if (typeof this.onTapSquare === "function") this.onTapSquare(square, piece);
    this._resolveWaiters("tap", { square: square, piece: piece });
  };

  /* ---------- een zet uitvoeren + animeren ---------- */
  Board.prototype._performMove = function (from, to, byUser) {
    var move = this.game.move({ from: from, to: to, promotion: "q" });
    if (!move) { this.clearSelection(); return null; }
    this.clearSelection();
    this._animateMove(move);
    this.clearHighlights();
    var cf = this.cellBySquare[from], ct = this.cellBySquare[to];
    if (cf) cf.classList.add("lastmove");
    if (ct) ct.classList.add("lastmove");

    if (typeof this.onMove === "function") this.onMove(move);
    if (byUser && typeof this.onUserMove === "function") this.onUserMove(move);
    this._resolveWaiters(byUser ? "usermove" : "move", move);
    return move;
  };

  // programmatische zet (bv. de computer)
  Board.prototype.move = function (from, to) { return this._performMove(from, to, false); };

  Board.prototype._animateMove = function (move) {
    var el = this.pieceEls[move.from];
    if (!el) { this.renderFull(); return; }
    delete this.pieceEls[move.from];

    // geslagen stuk laten verdwijnen
    var capturedSq = move.to;
    if (move.flags && move.flags.indexOf("e") >= 0) {
      // en-passant (komt in v1 niet voor, maar voor de zekerheid)
      capturedSq = move.to[0] + move.from[1];
    }
    var capEl = this.pieceEls[capturedSq];
    if (capEl && move.captured) {
      capEl.classList.add("captured");
      delete this.pieceEls[capturedSq];
      setTimeout(function () { if (capEl.parentNode) capEl.parentNode.removeChild(capEl); }, 360);
    }

    el.dataset.square = move.to;
    el.style.transform = this._transformFor(move.to);
    this.pieceEls[move.to] = el;

    // promotie: maak er een dame van
    if (move.promotion) {
      var g = el.querySelector(".piece-glyph");
      if (g) g.textContent = GLYPH[move.promotion];
    }
    // klein 'plop'-effect bij aankomst
    var self = this;
    setTimeout(function () {
      el.classList.add("pop");
      setTimeout(function () { el.classList.remove("pop"); }, 360);
      // rokade: koningstoren ook verplaatsen (komt in v1 niet voor)
      if (move.flags && (move.flags.indexOf("k") >= 0 || move.flags.indexOf("q") >= 0)) self.renderFull();
    }, 280);
  };

  Board.prototype.undoLast = function () {
    this.game.undo();
    this.clearSelection();
    this.clearHighlights();
    this.renderFull();
  };

  /* ---------- toestand opvragen ---------- */
  Board.prototype.inCheck = function () { return this.game.in_check(); };
  Board.prototype.inCheckmate = function () { return this.game.in_checkmate(); };
  Board.prototype.isGameOver = function () { return this.game.game_over(); };
  Board.prototype.moves = function (opts) { return this.game.moves(opts); };

  /* ---------- beloftes voor de lessen ---------- */
  Board.prototype.waitForUserMove = function (filter) { return this._wait("usermove", filter); };
  Board.prototype.waitForTap = function (filter) { return this._wait("tap", filter); };

  Board.prototype._wait = function (kind, filter) {
    var self = this;
    return new Promise(function (resolve, reject) {
      self._waiters.push({ kind: kind, filter: filter || null, resolve: resolve, reject: reject });
    });
  };

  Board.prototype._resolveWaiters = function (kind, data) {
    var remaining = [];
    this._waiters.forEach(function (w) {
      if (w.kind === kind && (!w.filter || w.filter(data))) w.resolve(data);
      else remaining.push(w);
    });
    this._waiters = remaining;
  };

  Board.prototype.cancelWaits = function () {
    var ws = this._waiters; this._waiters = [];
    ws.forEach(function (w) { w.reject({ cancelled: true }); });
  };

  window.Board = new Board();
})();
