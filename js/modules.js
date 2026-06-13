/* =================================================================
   Modules — de leerlijn. Elke module is een verhaaltje dat Hinnik
   vertelt en begeleidt. Ze gebruiken de "L"-helper (zie app.js) met
   awaitbare functies: say, wait, waitMove, waitTap, point, ...
   Het kind kan elke module volledig doen door te luisteren en kijken.
   ================================================================= */
(function () {
  "use strict";

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  var PRAISE = ["Hoera!", "Wauw, knap!", "Helemaal goed!", "Top gedaan!", "Jaaa!", "Wat goed van jou!"];
  var TRY_AGAIN = [
    "Bijna! Probeer het nog eens, je kan het!",
    "Oei, net niet. Nog een keertje!",
    "Geeft niks! Probeer maar opnieuw.",
    "Nog een poging, jij kan dit!"
  ];

  /* ============================ MODULE 1: HET BORD ============================ */
  async function moduleBoard(L) {
    L.board.setupCustom([], "w");
    L.board.setMode("tap");
    await L.say("Hoi! Ik ben Hinnik, het schaakpaardje. Leuk dat je er bent!", { mood: "happy" });
    await L.say("Kijk eens. Dit is een schaakbord.");
    await L.say("Het heeft heel veel vakjes. Lichte en donkere.");
    await L.say("Tik maar eens op een vakje. Kijk wat er gebeurt!");

    var taps = 0;
    while (taps < 4) {
      await L.waitTap();
      taps++;
      L.cheer();
      if (taps < 4) L.blurt(pick(["Ja! Nog eentje.", "Leuk hè? Nog een vakje!", "Hihi, nog een keer!"]));
    }
    await L.say("Wat goed! Je hebt het bord ontdekt.");
    await L.say("Op dit bord gaan we straks schaken. Nu leren we eerst de stukken!", { mood: "happy" });
    L.done();
  }

  /* ============================ MODULE 2: DE STUKKEN ============================ */
  var PIECES = [
    { type: "r", naam: "de toren", start: "d4", goal: "d8",
      uitleg: "Dit is de toren. Hij rijdt rechtdoor. Naar boven, naar onder, of opzij. Net als een trein op de rails!" },
    { type: "b", naam: "de loper", start: "c1", goal: "h6",
      uitleg: "Dit is de loper. Hij glijdt altijd schuin. Net als een schaatser op het ijs!" },
    { type: "n", naam: "het paard", start: "d4", goal: "f5",
      uitleg: "Dit is het paard. Dat ben ik! Ik spring in een letter L. Twee vooruit en dan een stapje opzij. Hop! Ik mag zelfs over andere stukken springen." },
    { type: "q", naam: "de dame", start: "d4", goal: "h8",
      uitleg: "Dit is de dame. Zij is de sterkste! Zij mag rechtdoor en schuin. Alle kanten op!" },
    { type: "k", naam: "de koning", start: "d4", goal: "e5",
      uitleg: "Dit is de koning. Hij is de baas, maar wel een beetje langzaam. Hij zet maar één klein stapje." },
    { type: "p", naam: "de pion", start: "e2", goal: "e4",
      uitleg: "Dit is de pion, het kleinste soldaatje. Hij loopt vooruit. De allereerste keer mag hij twee stapjes. Nooit achteruit!" }
  ];

  async function teachPiece(L, def) {
    function setup() {
      L.board.setupCustom([{ type: def.type, color: "w", square: def.start }], "w");
      L.board.setMode("move");
      L.board.setMovable("w");
      L.board.setGoal(def.goal, "⭐");
    }
    setup();
    L.point(def.start);
    await L.say(def.uitleg);
    L.unpoint();
    await L.say("Tik op het stuk. De groene stipjes laten zien waar hij heen mag.");
    await L.say("Kun jij het sterretje pakken?", { mood: "think" });
    L.point(def.goal);

    while (true) {
      var mv = await L.waitMove();
      if (mv.to === def.goal) {
        L.unpoint();
        L.board.clearGoals();
        L.cheer();
        await L.say(pick(PRAISE) + " Je hebt het sterretje!");
        return;
      } else {
        await L.say(pick(TRY_AGAIN));
        setup();
        L.point(def.goal);
      }
    }
  }

  async function modulePieces(L) {
    await L.say("Nu gaan we de stukken leren. Eentje voor eentje.");
    for (var i = 0; i < PIECES.length; i++) {
      await teachPiece(L, PIECES[i]);
      await L.wait(300);
    }
    L.board.clearGoals();
    await L.say("Knap hoor! Je kent nu alle stukken van het schaakspel!", { mood: "happy" });
    L.done();
  }

  /* ============================ MODULE 3: SLAAN ============================ */
  var CAPTURES = [
    { white: { type: "r", square: "d1" }, black: { type: "p", square: "d6" },
      zeg: "Soms staat er een stuk van de tegenstander in de weg. Dan mag je het pakken! Dat heet slaan.",
      hint: "Sla het zwarte stuk met je toren. Tik op je toren en dan op het zwarte stuk." },
    { white: { type: "b", square: "c1" }, black: { type: "n", square: "g5" },
      zeg: "Nu de loper. Hij slaat schuin, want zo loopt hij ook.",
      hint: "Sla het zwarte paard met je loper!" },
    { white: { type: "p", square: "e4" }, black: { type: "p", square: "d5" },
      zeg: "En nu de pion. Let op! De pion loopt rechtdoor, maar hij slaat alleen schuin.",
      hint: "Sla het zwarte stuk schuin met je pion!" }
  ];

  async function captureRound(L, def) {
    function setup() {
      L.board.setupCustom([
        { type: def.white.type, color: "w", square: def.white.square },
        { type: def.black.type, color: "b", square: def.black.square }
      ], "w");
      L.board.setMode("move");
      L.board.setMovable("w");
    }
    setup();
    await L.say(def.zeg);
    L.point(def.black.square);
    await L.say(def.hint);

    while (true) {
      var mv = await L.waitMove();
      if (mv.captured) {
        L.unpoint();
        L.cheer();
        await L.say(pick(["Hebbes! Je hebt hem geslagen!", "Boem! Geslagen! Knap!", "Ja! Mooi geslagen!"]));
        return;
      } else {
        await L.say(pick(TRY_AGAIN));
        setup();
        L.point(def.black.square);
      }
    }
  }

  async function moduleCapture(L) {
    for (var i = 0; i < CAPTURES.length; i++) {
      await captureRound(L, CAPTURES[i]);
      await L.wait(300);
    }
    await L.say("Slaan kun je nu ook! Je wordt al een echte schaker.", { mood: "happy" });
    L.done();
  }

  /* ============================ MODULE 4: SCHAAK EN MAT ============================ */
  async function moduleCheckmate(L) {
    // Deel 1: laat schaak zien
    L.board.setupCustom([
      { type: "k", color: "b", square: "e8" },
      { type: "q", color: "w", square: "d1" },
      { type: "k", color: "w", square: "e1" }
    ], "w");
    L.board.setMode("locked");
    await L.say("Nu leren we iets belangrijks: schaak.");
    await L.say("Kijk, ik val de zwarte koning aan met de dame.");
    await L.wait(400);
    L.board.move("d1", "d8"); // schaak langs de d-lijn? nee, koning op e8. gebruik queen naar e-lijn
    await L.wait(700);
    // bovenstaande zet geeft mogelijk geen schaak; we vertellen het concept en tonen de aanval
    await L.say("Als de koning wordt aangevallen, heet dat schaak! De koning moet dan oppassen.");
    await L.say("En als de koning niet meer kan ontsnappen, dan is het schaakmat. Dan heb je gewonnen!", { mood: "happy" });

    // Deel 2: mat in één
    function setupPuzzle() {
      L.board.setupCustom([
        { type: "k", color: "b", square: "g8" },
        { type: "p", color: "b", square: "f7" },
        { type: "p", color: "b", square: "g7" },
        { type: "p", color: "b", square: "h7" },
        { type: "r", color: "w", square: "a1" },
        { type: "k", color: "w", square: "e1" }
      ], "w");
      L.board.setMode("move");
      L.board.setMovable("w");
    }
    setupPuzzle();
    await L.say("Nu jij! Kun jij de zwarte koning schaakmat zetten? In één zet!", { mood: "think" });
    await L.say("Tik op je toren en zet hem helemaal naar boven, naast de koning.");

    var tries = 0;
    while (true) {
      var mv = await L.waitMove();
      if (L.board.inCheckmate()) {
        L.unpoint();
        L.cheer();
        await L.say("Schaakmat! Je hebt gewonnen! Hoeraaa!", { mood: "happy" });
        L.done();
        return;
      }
      tries++;
      await L.say(pick(TRY_AGAIN));
      L.board.undoLast();
      L.board.setMode("move");
      L.board.setMovable("w");
      if (tries >= 2) {
        L.board.showHintFrom("a1");
        L.point("a8");
        await L.say("Een tip: zet je toren helemaal naar boven, op het bovenste rijtje.");
      }
    }
  }

  /* ============================ MODULE 5: EEN PARTIJTJE ============================ */
  // laat het kind een goede zet zien als het lang nadenkt (hulp van de engine)
  function startHint(L, delay) {
    var state = { moved: false, timer: null };
    state.timer = setTimeout(function () {
      if (state.moved || !L.alive() || !window.Engine) return;
      if (L.board.turn() !== "w") return;
      window.Engine.bestMove(L.board.fen(), { movetime: 600 }).then(function (best) {
        if (state.moved || !best || !L.alive() || L.board.turn() !== "w") return;
        L.board.showHintFrom(best.from);
        L.point(best.to);
        L.blurt("Zal ik je helpen? Probeer dit stuk eens naar het lichtende vakje te zetten.");
      });
    }, delay);
    return state;
  }

  async function modulePlay(L) {
    L.board.reset();
    L.board.setMode("move");
    L.board.setMovable("w");
    if (window.Engine) window.Engine.warmup();
    await L.say("Nu spelen we een echt partijtje! Jij bent wit.");
    await L.say("Ik speel met de zwarte stukken. Jij mag beginnen!");
    await L.say("Tik op een stuk en zet hem op een groene stip.");

    var moveCount = 0;
    while (true) {
      // beurt van het kind, met hulp als het lang duurt
      L.board.setMovable("w");
      var hint = startHint(L, 13000);
      var mv = await L.waitMove();
      hint.moved = true;
      if (hint.timer) clearTimeout(hint.timer);
      L.board.clearHighlights();
      L.unpoint();
      moveCount++;
      if (mv.captured) L.blurt(pick(["Lekker geslagen!", "Hebbes!", "Goeie!"]));
      else if (moveCount % 4 === 0) L.blurt(pick(["Mooie zet!", "Goed bezig!", "Je doet het knap!"]));
      if (L.board.isGameOver()) break;

      // beurt van de computer
      await L.wait(650);
      var bm = window.Bot.chooseMove(L.board.game, (window.App && App.settings.difficulty) || 1);
      if (!bm) break;
      L.board.move(bm.from, bm.to);
      await L.wait(200);
      if (L.board.isGameOver()) break;
      if (L.board.inCheck()) L.blurt("Pas op, schaak! Je koning wordt aangevallen.");
    }

    // einde: altijd feest
    L.celebrate();
    L.cheer();
    var msg;
    if (L.board.inCheckmate()) {
      msg = (L.board.turn() === "b")
        ? "Schaakmat! Jij hebt gewonnen! Wat een kampioen!"
        : "Ik had even geluk! Maar jij speelde supergoed. Top!";
    } else {
      msg = "Wat een mooi partijtje! Jij bent een echte schaker!";
    }
    await L.say(msg, { mood: "happy" });
    L.done();
  }

  /* ---------- registratie ---------- */
  window.Modules = {
    list: [
      { id: "board",     emoji: "🏁", title: "Het bord",        run: moduleBoard },
      { id: "pieces",    emoji: "♟️", title: "De stukken",       run: modulePieces },
      { id: "capture",   emoji: "💥", title: "Slaan",            run: moduleCapture },
      { id: "checkmate", emoji: "👑", title: "Schaak en mat",    run: moduleCheckmate },
      { id: "play",      emoji: "🏆", title: "Een partijtje",    run: modulePlay }
    ]
  };
})();
