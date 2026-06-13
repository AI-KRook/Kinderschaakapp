/* =================================================================
   Modules — de leerlijn. Teksten zijn geschreven met korte zinnen en
   komma's, zodat de stem natuurlijk pauzeert en de juiste woorden
   benadrukt (de gratis stem negeert losse klemtoontekens).
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
  var COUNT = ["Eén ster!", "Twee sterren!", "Drie sterren!", "Vier sterren!"];

  /* ============================ MODULE 1: HET BORD ============================ */
  async function moduleBoard(L) {
    L.board.setupCustom([], "w");
    L.board.setMode("tap");
    await L.say("Zullen we beginnen? Kijk, dit is het schaakbord.");
    await L.say("Het heeft heel veel vakjes. Sommige zijn licht, en sommige zijn donker.");
    await L.say("Zie je dat ze om en om staan? Net een dambord.");
    await L.say("Op dit bord spelen twee legers tegen elkaar. De witte stukken, en de zwarte stukken.");
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
    { type: "r", naam: "de toren", start: "a1", path: ["a5", "f5", "f2"],
      uitleg: "Dit is de toren. Hij rijdt kaarsrecht, net als een trein op de rails. Naar voren, naar achteren, of opzij. Zo ver als hij wil! Maar nooit schuin. De toren is een sterk stuk." },
    { type: "b", naam: "de loper", start: "c1", path: ["h6", "f8", "a3"],
      uitleg: "Dit is de loper. Hij glijdt altijd schuin, net een schaatser op het ijs. Zo ver als hij wil! Maar altijd schuin, nooit rechtdoor. En kijk: hij blijft steeds op dezelfde kleur." },
    { type: "n", naam: "het paard", start: "d4", path: ["f5", "d6", "b5"],
      uitleg: "Dit is het paard. Dat ben ik! Ik spring in de vorm van een letter L. Twee stapjes vooruit, en dan eentje opzij. Hop! En het allerleukste: ik mag over andere stukken heen springen. Dat kan niemand anders." },
    { type: "q", naam: "de dame", start: "d1", path: ["d4", "a7", "a1"],
      uitleg: "Dit is de dame. Zij is het allersterkste stuk! Zij mag rechtdoor, en ook schuin. Echt alle kanten op, zo ver als ze wil. Pas dus goed op haar." },
    { type: "k", naam: "de koning", start: "e4", path: ["e5", "d6", "c5"],
      uitleg: "Dit is de koning. Hij is de baas van het spel. Maar wel een beetje langzaam: hij zet steeds maar één klein stapje. De koning is het belangrijkste stuk. Hem moet je goed beschermen." },
    { type: "p", naam: "de pion", start: "e2", path: ["e4", "e5", "e6"],
      uitleg: "Dit is de pion, het kleinste soldaatje. Hij stapt vooruit, eentje tegelijk. De eerste keer mag hij er twee. Maar nooit achteruit! En weet je wat knap is? Komt een pion helemaal aan de overkant, dan wordt hij een dame!" }
  ];

  async function teachPiece(L, def) {
    function place() {
      L.board.setupCustom([{ type: def.type, color: "w", square: def.start }], "w");
      L.board.setMode("move");
      L.board.setMovable("w");
    }
    place();
    L.point(def.start);
    await L.say(def.uitleg);
    L.unpoint();
    await L.say("Tik op het stuk. De groene stipjes laten zien waar hij naartoe mag.");
    await L.say("Verzamel nu de sterretjes! Pak ze één voor één.");

    for (var i = 0; i < def.path.length; i++) {
      var target = def.path[i];
      L.board.clearGoals();
      L.board.setGoal(target, "⭐");
      L.point(target);
      while (true) {
        var mv = await L.waitMove();
        if (mv.to === target) {
          L.cheer();
          L.star();
          L.board.setTurn("w");
          if (i < def.path.length - 1) L.blurt(COUNT[i] || "Hebbes!");
          break;
        } else {
          await L.say(pick(TRY_AGAIN));
          L.board.undoLast();
          L.board.setMode("move");
          L.board.setMovable("w");
          L.board.setGoal(target, "⭐");
          L.point(target);
        }
      }
    }
    L.unpoint();
    L.board.clearGoals();
    await L.say(pick(PRAISE) + " Je hebt alle sterretjes!");
  }

  async function modulePieces(L) {
    await L.say("We gaan de stukken leren kennen. Elk stuk loopt op zijn eigen manier. Rustig aan, eentje tegelijk.");
    for (var i = 0; i < PIECES.length; i++) {
      await teachPiece(L, PIECES[i]);
      await L.wait(300);
    }
    L.board.clearGoals();
    await L.say("Wauw! Je kent nu alle stukken, en hoe ze lopen. Wat heb jij dat snel geleerd.", { mood: "happy" });
    L.done();
  }

  /* ============================ MODULE 3: SLAAN ============================ */
  var CAPTURES = [
    { white: { type: "r", square: "d1" }, black: { type: "p", square: "d6" },
      zeg: "Soms staat er een stuk van de tegenstander in de weg. Weet je wat je dan mag doen? Het pakken! Dat heet slaan. Je zet jouw stuk op zijn plek.",
      hint: "Pak het zwarte stuk met je toren. Tik op je toren, en dan op het zwarte stuk." },
    { white: { type: "b", square: "c1" }, black: { type: "n", square: "g5" },
      zeg: "Ook de loper kan slaan. Hij pakt schuin, want zo loopt hij ook.",
      hint: "Pak het zwarte paard met je loper!" },
    { white: { type: "p", square: "e4" }, black: { type: "p", square: "d5" },
      zeg: "En nu de pion. Let goed op! De pion stapt rechtdoor, maar slaan doet hij schuin.",
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
        L.star();
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
    await L.say("Nu leren we slaan. Dat is: stukken van de tegenstander pakken.");
    for (var i = 0; i < CAPTURES.length; i++) {
      await captureRound(L, CAPTURES[i]);
      await L.wait(300);
    }
    await L.say("Knap! Maar let op: de tegenstander mag jouw stukken ook slaan. Bescherm ze dus goed.");
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
    await L.say("Nu komt het belangrijkste van schaken. Want waarom spelen we eigenlijk?");
    await L.say("Het doel van het hele spel is: de koning van de ander vangen. Dat heet schaakmat. En dan win je!");
    await L.say("Kijk, ik val de zwarte koning aan met mijn dame.");
    await L.wait(300);
    L.board.move("d1", "d8");
    await L.wait(700);
    await L.say("Wordt een koning aangevallen? Dan heet dat schaak. De koning moet dan snel veilig worden.");
    await L.say("En kan de koning helemaal niet meer ontsnappen? Dan is het schaakmat. Het spel is uit, en jij hebt gewonnen!", { mood: "happy" });

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
    await L.say("Nu jij! Kun jij de zwarte koning schaakmat zetten? In één zetje!", { mood: "think" });
    await L.say("Tik op je toren, en zet hem helemaal naar boven. Vlak naast de koning.");

    var tries = 0;
    while (true) {
      var mv = await L.waitMove();
      if (L.board.inCheckmate()) {
        L.unpoint();
        L.cheer();
        L.star();
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
        await L.say("Een tipje: schuif je toren helemaal naar boven. Naar het bovenste rijtje.");
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

    await L.say("Nu gaan we een echt partijtje spelen! Jij speelt met de witte stukken, ik met de zwarte.");
    await L.say("Onthoud: jij wint als je mijn koning schaakmat zet. En pas goed op je eigen koning!");
    await L.say("Jij mag beginnen, want wit zet altijd als eerste. Heb je hulp nodig? Tik dan op de lamp. Veel plezier!");

    var moveCount = 0;
    while (true) {
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
    L.star();
    var msg;
    if (L.board.inCheckmate()) {
      msg = (L.board.turn() === "b")
        ? "Schaakmat! Jij hebt gewonnen! Wat ben jij een kampioen!"
        : "Oei, ik had even mazzel! Maar wat speelde jij goed, zeg.";
    } else {
      msg = "Wat een leuk partijtje! Jij bent een echte schaker aan het worden.";
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
