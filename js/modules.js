/* =================================================================
   Modules — de leerlijn. Elke module is een verhaaltje dat Hinnik
   vertelt en begeleidt, via de "L"-helper (zie app.js).
   Tijdens een uitleg kan het kind tikken om door te gaan (skip).
   ================================================================= */
(function () {
  "use strict";

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  var PRAISE = ["Hoera!", "Wauw, knap!", "Helemaal goed!", "Top gedaan!", "Jaaa!", "Wat goed van jou!", "Super gedaan!", "Petje af!"];
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
    await L.say("Zullen we beginnen? Kijk eens, dit is het schaakbord.");
    await L.say("Het heeft een heleboel vakjes. Sommige zijn licht, en sommige zijn donker.");
    await L.say("Zie je dat ze om en om staan? Een beetje als een dambord.");
    await L.say("Tik maar eens op een vakje. Kijk wat er gebeurt!");

    var taps = 0;
    while (taps < 4) {
      await L.waitTap();
      taps++;
      L.cheer();
      if (taps < 4) L.blurt(pick(["Ja, die lichtte op! Nog eentje.", "Leuk hè? Probeer er nog een.", "Hihi, jij snapt het al. Nog een keer!"]));
    }
    await L.say("Goed zo! Je hebt het hele bord ontdekt.");
    await L.say("Klaar om de stukken te leren kennen? Daar gaan we!", { mood: "happy" });
    L.done();
  }

  /* ============================ MODULE 2: DE STUKKEN ============================ */
  var PIECES = [
    { type: "r", naam: "de toren", start: "d4", goal: "d8",
      uitleg: "Dit is de toren. Hij rijdt kaarsrecht: naar voren, naar achteren, of opzij. Net een trein op de rails!" },
    { type: "b", naam: "de loper", start: "c1", goal: "h6",
      uitleg: "Dit is de loper. Hij schuift altijd schuin, lekker glijden, net een schaatser op het ijs!" },
    { type: "n", naam: "het paard", start: "d4", goal: "f5",
      uitleg: "Dit is het paard. Dat ben ik! Ik spring in de vorm van een letter L: twee stapjes vooruit en dan eentje opzij. Hop! En ik mag zelfs over andere stukken heen springen." },
    { type: "q", naam: "de dame", start: "d4", goal: "h8",
      uitleg: "Dit is de dame. Zij is de allersterkste! Zij mag rechtdoor en schuin, dus echt alle kanten op." },
    { type: "k", naam: "de koning", start: "d4", goal: "e5",
      uitleg: "Dit is de koning. Hij is de baas, maar een beetje langzaam. Hij zet steeds maar één klein stapje." },
    { type: "p", naam: "de pion", start: "e2", goal: "e4",
      uitleg: "Dit is de pion, het kleinste soldaatje. Hij stapt vooruit, eentje tegelijk. Alleen de eerste keer mag hij er twee. Maar nooit achteruit!" }
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
    await L.say("Tik op het stuk. De groene stipjes laten zien waar hij naartoe mag.");
    await L.say("Probeer maar: kun jij het sterretje pakken?", { mood: "think" });
    L.point(def.goal);

    while (true) {
      var mv = await L.waitMove();
      if (mv.to === def.goal) {
        L.unpoint();
        L.board.clearGoals();
        L.cheer();
        await L.say(pick(PRAISE) + " Je hebt het sterretje te pakken!");
        return;
      } else {
        await L.say(pick(TRY_AGAIN));
        setup();
        L.point(def.goal);
      }
    }
  }

  async function modulePieces(L) {
    await L.say("We gaan de stukken leren kennen. Eentje tegelijk, rustig aan.");
    for (var i = 0; i < PIECES.length; i++) {
      await teachPiece(L, PIECES[i]);
      await L.wait(300);
    }
    L.board.clearGoals();
    await L.say("Wauw, je kent nu alle stukken! Wat heb jij dat snel geleerd.", { mood: "happy" });
    L.done();
  }

  /* ============================ MODULE 3: SLAAN ============================ */
  var CAPTURES = [
    { white: { type: "r", square: "d1" }, black: { type: "p", square: "d6" },
      zeg: "Soms staat er een stuk van de tegenstander in de weg. Weet je wat je dan mag doen? Het pakken! Dat heet slaan.",
      hint: "Pak het zwarte stuk met je toren. Tik op je toren, en dan op het zwarte stuk." },
    { white: { type: "b", square: "c1" }, black: { type: "n", square: "g5" },
      zeg: "Nu met de loper. Hij slaat schuin, want zo loopt hij ook.",
      hint: "Pak het zwarte paard met je loper!" },
    { white: { type: "p", square: "e4" }, black: { type: "p", square: "d5" },
      zeg: "En nu de pion. Let goed op: de pion stapt rechtdoor, maar slaan doet hij schuin!",
      hint: "Pak het zwarte stuk schuin met je pion!" }
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
        await L.say(pick(["Hebbes! Lekker geslagen!", "Boem! Mooi gepakt!", "Ja! Dat ging knap!"]));
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
    await L.say("Slaan kun je nu ook. Je wordt steeds beter, zeg!", { mood: "happy" });
    L.done();
  }

  /* ============================ MODULE 4: SCHAAK EN MAT ============================ */
  async function moduleCheckmate(L) {
    L.board.setupCustom([
      { type: "k", color: "b", square: "e8" },
      { type: "q", color: "w", square: "d1" },
      { type: "k", color: "w", square: "e1" }
    ], "w");
    L.board.setMode("locked");
    await L.say("Nu leren we iets heel belangrijks: schaak.");
    await L.say("Kijk, ik val de zwarte koning aan met mijn dame.");
    await L.wait(300);
    L.board.move("d1", "d8");
    await L.wait(700);
    await L.say("Wordt de koning aangevallen? Dan heet dat schaak. De koning moet dan goed oppassen.");
    await L.say("En kan de koning niet meer ontsnappen? Dan is het schaakmat. Dan heb je gewonnen!", { mood: "happy" });

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
    await L.say("Nu jij! Kun jij de zwarte koning schaakmat zetten, in één zetje?", { mood: "think" });
    await L.say("Tik op je toren en zet hem helemaal naar boven, vlak naast de koning.");

    var tries = 0;
    while (true) {
      var mv = await L.waitMove();
      if (L.board.inCheckmate()) {
        L.unpoint();
        L.cheer();
        await L.say("Schaakmat! Je hebt het voor elkaar! Hoeraaa!", { mood: "happy" });
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
        await L.say("Een tipje: schuif je toren helemaal naar boven, naar het bovenste rijtje.");
      }
    }
  }

  /* ============================ MODULE 5: EEN PARTIJTJE ============================ */
  function showHintNow(L) {
    if (!L.alive() || !window.Engine || L.board.turn() !== "w") return;
    window.Engine.bestMove(L.board.fen(), { movetime: 600 }).then(function (best) {
      if (!best || !L.alive() || L.board.turn() !== "w") return;
      L.board.showHintFrom(best.from);
      L.point(best.to);
      L.blurt("Zal ik je een tip geven? Zet dit stuk eens naar het vakje dat oplicht.");
    });
  }

  function startHint(L, delay) {
    var s = { moved: false, timer: null };
    s.timer = setTimeout(function () { if (!s.moved) showHintNow(L); }, delay);
    return s;
  }

  function makeHintButton(L) {
    var actions = document.getElementById("lesson-actions");
    if (!actions) return null;
    actions.innerHTML = "";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "big-action sun hint-btn";
    btn.innerHTML = '<span class="ba-emoji">💡</span> Hint';
    btn.addEventListener("click", function () { showHintNow(L); });
    actions.appendChild(btn);
    return btn;
  }

  async function modulePlay(L) {
    L.board.reset();
    L.board.setMode("move");
    L.board.setMovable("w");
    if (window.Engine) window.Engine.warmup();
    makeHintButton(L);

    await L.say("Nu gaan we een echt partijtje spelen! Jij speelt met de witte stukken.");
    await L.say("Ik neem de zwarte. En jij mag beginnen, want wit zet altijd als eerste.");
    await L.say("Tik op een stuk en zet het op een groene stip. Heb je hulp nodig? Tik dan op de lamp. Veel plezier!");

    var moveCount = 0;
    while (true) {
      // beurt van het kind, met hulp als het lang duurt
      L.board.setMovable("w");
      var hint = startHint(L, 15000);
      var mv = await L.waitMove();
      hint.moved = true;
      if (hint.timer) clearTimeout(hint.timer);
      L.board.clearHighlights();
      L.unpoint();
      moveCount++;
      if (mv.captured) L.blurt(pick(["Lekker geslagen!", "Hebbes!", "Goed gepakt!"]));
      else if (moveCount % 4 === 0) L.blurt(pick(["Mooie zet!", "Goed bezig, ga zo door!", "Jij kan dit echt goed!"]));
      if (L.board.isGameOver()) break;

      // beurt van de computer
      await L.wait(650);
      var bm = window.Bot.chooseMove(L.board.game, (window.App && App.settings.difficulty) || 1);
      if (!bm) break;
      L.board.move(bm.from, bm.to);
      await L.wait(200);
      if (L.board.isGameOver()) break;
      if (L.board.inCheck()) L.blurt("Pas op! Je koning staat schaak. Hij wordt aangevallen.");
    }

    L.celebrate();
    L.cheer();
    var msg;
    if (L.board.inCheckmate()) {
      msg = (L.board.turn() === "b")
        ? "Schaakmat! Jij hebt gewonnen! Wat ben jij een kampioen!"
        : "Oei, ik had even mazzel! Maar wat speelde jij goed, zeg.";
    } else {
      msg = "Wat een leuk partijtje was dat! Jij bent een echte schaker aan het worden.";
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
