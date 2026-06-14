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
  var SLAGEN = ["Hebbes! Lekker geslagen!", "Boem! Mooi gepakt!", "Ja! Dat ging knap!"];

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
        await L.say(pick(SLAGEN));
        return;
      } else {
        await L.say(pick(TRY_AGAIN));
        setup();
        L.point(def.black.square);
      }
    }
  }

  // en passant: een hele bijzondere manier van slaan
  var EP_FEN = "4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1";
  function epSetup(L) {
    L.board.setFEN(EP_FEN);
    L.board.move("d7", "d5"); // de zwarte pion rent twee vakjes langs de witte pion
    L.board.setMode("move");
    L.board.setMovable(function (sq) { return sq === "e5"; });
    L.point("d6");
  }

  async function enPassantRound(L) {
    L.board.setFEN(EP_FEN);
    L.board.setMode("locked");
    await L.say("Nu komt een hele bijzondere! Het heet en passant. Dat is Frans voor: in het voorbijgaan.");
    await L.say("Kijk goed. Mijn zwarte pion rent met twee stappen langs jouw pion. Hij denkt: lekker, jij kan mij niet pakken!");
    await L.wait(250);
    L.board.move("d7", "d5");
    await L.wait(850);
    await L.say("Maar dat mag jij juist wel! Jouw pion slaat hem schuin, alsof hij maar een stapje had gedaan.");
    L.board.setMode("move");
    L.board.setMovable(function (sq) { return sq === "e5"; });
    L.point("d6");
    await L.say("Sla mijn pion en passant! Tik op jouw pion, en dan op het schuine vakje erachter.");

    while (true) {
      var mv = await L.waitMove();
      if (mv.to === "d6" && mv.captured) {
        L.unpoint();
        L.cheer();
        L.star();
        await L.say(pick(SLAGEN));
        return;
      }
      await L.say(pick(TRY_AGAIN));
      epSetup(L);
    }
  }

  async function moduleCapture(L) {
    await L.say("Nu leren we slaan. Dat is: stukken van de tegenstander pakken.");
    await L.say("Je slaat een stuk op de manier waarop dat stuk zelf loopt. Je zet jouw stuk op de plek van het andere.");
    for (var i = 0; i < CAPTURES.length; i++) {
      await captureRound(L, CAPTURES[i]);
      await L.wait(300);
    }
    await enPassantRound(L);
    await L.say("Knap! Maar let op: de tegenstander mag jouw stukken ook slaan. Bescherm ze dus goed.");
    await L.say("Slaan kun je nu ook, en zelfs en passant! Je wordt steeds beter, zeg!", { mood: "happy" });
    L.done();
  }

  /* ============================ MODULE 4: SCHAAK, MAT EN ROKEREN ============================ */

  async function teachCheck(L) {
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

    // de drie manieren, nu ook echt voorgedaan op het bord.
    // zelfde stand (zwarte koning staat schaak van de witte toren), drie oplossingen:
    // weglopen (Ke8-f8), blokkeren (Ta4-e4) of slaan (Lh4xe1). Vooraf in chess.js gecontroleerd.
    function checkBase() {
      L.board.setupCustom([
        { type: "k", color: "b", square: "e8" },
        { type: "r", color: "b", square: "a4" },
        { type: "b", color: "b", square: "h4" },
        { type: "r", color: "w", square: "e1" }
      ], "b");
      L.board.setMode("locked");
      L.board.showHintFrom("e1"); // de aanvaller licht op
    }

    await L.say("Sta je schaak? Dan kan je drie dingen doen om je koning te redden.");

    checkBase();
    L.point("e8");
    await L.say("Eén: loop met je koning weg, naar een veilig vakje.");
    L.unpoint();
    await L.wait(250);
    L.board.move("e8", "f8");
    await L.wait(1100);

    checkBase();
    L.point("e4");
    await L.say("Twee: zet een ander stuk ervoor, als een schildje.");
    L.unpoint();
    await L.wait(250);
    L.board.move("a4", "e4");
    await L.wait(1100);

    checkBase();
    L.point("e1");
    await L.say("Drie: sla het stuk dat jouw koning aanvalt.");
    L.unpoint();
    await L.wait(250);
    L.board.move("h4", "e1");
    await L.wait(1100);

    L.board.clearHighlights();
    await L.say("En kan de koning helemaal niet meer ontsnappen? Dan is het schaakmat. Het spel is uit!", { mood: "happy" });
    await L.say("En soms kan niemand winnen. Dan is het gelijkspel, niemand verliest.");
  }

  // het kind geeft zelf schaak (nog geen mat)
  async function giveCheck(L) {
    L.board.setupCustom([
      { type: "r", color: "w", square: "h1" },
      { type: "k", color: "b", square: "e8" }
    ], "w");
    L.board.setMode("move");
    L.board.setMovable("w");
    L.point("h8");
    await L.say("Nu jij! Geef de zwarte koning eens schaak. Jaag hem op met je toren.", { mood: "think" });
    while (true) {
      var mv = await L.waitMove();
      if (L.board.inCheck()) {
        L.unpoint();
        L.cheer();
        L.star();
        await L.say("Schaak! Heel knap! De koning wordt nu aangevallen.", { mood: "happy" });
        await L.say("Dit was nog geen mat, want de koning kon nog weglopen. Maar goed gedaan, hoor!");
        return;
      }
      await L.say(pick(TRY_AGAIN));
      L.board.setupCustom([
        { type: "r", color: "w", square: "h1" },
        { type: "k", color: "b", square: "e8" }
      ], "w");
      L.board.setMode("move");
      L.board.setMovable("w");
      L.point("h8");
    }
  }

  // rokeren: kort, lang, en waarom het soms niet mag
  var ROK_KORT = "4k3/8/8/8/8/8/8/4K2R w K - 0 1";
  var ROK_LANG = "4k3/8/8/8/8/8/8/R3K3 w Q - 0 1";
  var ROK_NIET = "4kr2/8/8/8/8/8/8/4K2R w K - 0 1";

  async function castleOnce(L, fen, flag, vraag) {
    function setup() {
      L.board.setFEN(fen);
      L.board.setMode("move");
      L.board.setMovable("w");
    }
    setup();
    L.point(flag === "k" ? "g1" : "c1");
    await L.say(vraag);
    while (true) {
      var mv = await L.waitMove();
      if (mv.flags && mv.flags.indexOf(flag) >= 0) {
        L.unpoint();
        L.cheer();
        L.star();
        await L.wait(500);
        return;
      }
      await L.say(pick(TRY_AGAIN));
      setup();
      L.point(flag === "k" ? "g1" : "c1");
    }
  }

  async function teachCastling(L) {
    L.board.setFEN(ROK_KORT);
    L.board.setMode("locked");
    await L.say("Nu een slimme truc om je koning veilig te zetten. Het heet rokeren.");
    await L.say("De koning en de toren bewegen samen, in één keer. De koning springt twee vakjes opzij, en de toren springt aan de andere kant naast hem.");
    await L.say("Zo zit je koning lekker veilig in een hoekje, met de toren ervoor.");

    await castleOnce(L, ROK_KORT, "k", "Doe de korte rokade. Tik op de koning, en zet hem twee vakjes naar rechts.");
    await L.say("Knap! Je koning staat nu veilig in het hoekje.");

    await castleOnce(L, ROK_LANG, "q", "En nu de lange rokade. Tik op de koning, en zet hem twee vakjes naar links.");
    await L.say("Allebei gelukt! Nu ken je de korte en de lange rokade.", { mood: "happy" });

    L.board.setFEN(ROK_NIET);
    L.board.setMode("locked");
    await L.say("Maar let op, rokeren mag niet altijd!");
    L.point("f8");
    await L.say("Zie je die zwarte toren? De koning zou er vlak langs lopen. Door het gevaar heen rokeren mag niet. En ook niet als je koning al schaak staat.");
    L.unpoint();
    await L.wait(300);
  }

  // mat-in-één puzzels (allemaal vooraf in chess.js gecontroleerd)
  var MATES = [
    { pieces: [
        { type: "k", color: "b", square: "g8" }, { type: "p", color: "b", square: "f7" },
        { type: "p", color: "b", square: "g7" }, { type: "p", color: "b", square: "h7" },
        { type: "r", color: "w", square: "a1" }, { type: "k", color: "w", square: "e1" } ],
      point: "a8", hintFrom: "a1",
      zeg: "Zet de zwarte koning schaakmat! Schuif je toren naar boven, vlak naast de koning.",
      hint: "Een tipje: schuif je toren helemaal naar boven. Naar het bovenste rijtje." },
    { pieces: [
        { type: "k", color: "b", square: "a8" }, { type: "k", color: "w", square: "b6" },
        { type: "q", color: "w", square: "a1" } ],
      point: "a7", hintFrom: "a1",
      zeg: "Pak je dame, en zet hem vlak naast de zwarte koning. Jouw koning past goed op de dame.",
      hint: "Een tipje: zet je dame vlak naast de zwarte koning." },
    { pieces: [
        { type: "k", color: "b", square: "g8" }, { type: "p", color: "b", square: "f7" },
        { type: "p", color: "b", square: "g7" }, { type: "p", color: "b", square: "h7" },
        { type: "q", color: "w", square: "d1" }, { type: "k", color: "w", square: "e1" } ],
      point: "d8", hintFrom: "d1",
      zeg: "Nog eentje! Zet je dame helemaal naar boven, op het rijtje van de koning.",
      hint: "Een tipje: schuif je dame naar boven, naar het rijtje van de koning." }
  ];

  async function matePuzzle(L, def) {
    L.board.setupCustom(def.pieces, "w");
    L.board.setMode("move");
    L.board.setMovable("w");
    L.board.clearGoals();
    L.point(def.point);
    await L.say(def.zeg, { mood: "think" });
    var tries = 0;
    while (true) {
      var mv = await L.waitMove();
      if (L.board.inCheckmate()) {
        L.unpoint();
        L.cheer();
        L.star();
        await L.say("Schaakmat! Je hebt het voor elkaar! Hoeraaa!", { mood: "happy" });
        return;
      }
      tries++;
      await L.say(pick(TRY_AGAIN));
      L.board.undoLast();
      L.board.setMode("move");
      L.board.setMovable("w");
      L.point(def.point);
      if (tries >= 2) {
        L.board.showHintFrom(def.hintFrom);
        await L.say(def.hint);
      }
    }
  }

  async function moduleCheckmate(L) {
    await teachCheck(L);
    await L.wait(300);
    await giveCheck(L);
    await L.wait(300);
    await teachCastling(L);
    await L.wait(300);
    await L.say("Nu gaan we matzetten oefenen. Klaar voor de eerste?", { mood: "think" });
    for (var i = 0; i < MATES.length; i++) {
      await matePuzzle(L, MATES[i]);
      await L.wait(400);
    }
    L.celebrate();
    await L.say("Wauw! Je weet nu wat schaak is, en schaakmat, en je kan zelfs rokeren. Wat ben jij knap!", { mood: "happy" });
    L.done();
  }

  /* ============================ MODULE 5: EEN PARTIJTJE ============================ */
  function showHintNow(L, human) {
    if (!L.alive() || !window.Engine || L.board.turn() !== human) return;
    window.Engine.bestMove(L.board.fen(), { movetime: 600 }).then(function (best) {
      if (!best || !L.alive() || L.board.turn() !== human) return;
      L.board.showHintFrom(best.from);
      L.point(best.to);
      L.blurt("Zal ik je een tip geven? Zet dit stuk eens naar het vakje dat oplicht.");
    });
  }

  function startHint(L, delay, human) {
    var s = { moved: false, timer: null };
    s.timer = setTimeout(function () { if (!s.moved) showHintNow(L, human); }, delay);
    return s;
  }

  function makeHintButton(L, human) {
    var actions = document.getElementById("lesson-actions");
    if (!actions) return null;
    actions.innerHTML = "";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "big-action sun hint-btn";
    btn.innerHTML = '<span class="ba-emoji">💡</span> Hint';
    btn.addEventListener("click", function () { showHintNow(L, human); });
    actions.appendChild(btn);
    return btn;
  }

  // het kind kiest met welke kleur het speelt
  function chooseColor(L) {
    return new Promise(function (resolve) {
      var actions = document.getElementById("lesson-actions");
      if (!actions) { resolve("w"); return; }
      actions.innerHTML = "";
      function mk(color, label, glyph, cls) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "big-action " + cls;
        b.innerHTML = '<span class="ba-emoji">' + glyph + '</span> ' + label;
        b.addEventListener("click", function () {
          if (!L.alive()) return;
          actions.innerHTML = "";
          resolve(color);
        });
        actions.appendChild(b);
      }
      mk("w", "Wit", "♔", "pick-white");
      mk("b", "Zwart", "♚", "pick-black");
      L.blurt("Met welke stukken wil je spelen? Wit of zwart?");
    });
  }

  async function modulePlay(L) {
    if (window.Engine) window.Engine.warmup();
    L.board.setFlipped(false);
    L.board.reset();
    L.board.setMode("locked");

    var human = await chooseColor(L);           // "w" of "b"
    var bot = (human === "w") ? "b" : "w";
    L.board.setFlipped(human === "b");          // bord draait om bij zwart
    L.board.setMode("move");
    L.board.setMovable(human);
    makeHintButton(L, human);

    var level = (window.App && App.settings.difficulty) || 1;

    if (human === "w") {
      await L.say("Nu gaan we een echt partijtje spelen! Jij speelt met de witte stukken, ik met de zwarte.");
      await L.say("Onthoud: jij wint als je mijn koning schaakmat zet. En pas goed op je eigen koning!");
      await L.say("Jij mag beginnen, want wit zet altijd als eerste. Heb je hulp nodig? Tik dan op de lamp. Veel plezier!");
    } else {
      await L.say("Nu gaan we een echt partijtje spelen! Jij speelt met de zwarte stukken, ik met de witte.");
      await L.say("Onthoud: jij wint als je mijn koning schaakmat zet. En pas goed op je eigen koning!");
      await L.say("Ik begin, want wit mag altijd eerst. Daarna ben jij. Heb je hulp nodig? Tik dan op de lamp. Veel plezier!");
      // Hinnik (wit) doet de eerste zet
      await L.wait(500);
      var first = await window.Bot.chooseMove(L.board.game, level);
      if (L.alive() && first && L.board.turn() === bot) {
        L.board.move(first.from, first.to);
        await L.wait(200);
      }
    }

    var moveCount = 0;
    while (true) {
      L.board.setMovable(human);
      var hint = startHint(L, 15000, human);
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
      var bm = await window.Bot.chooseMove(L.board.game, level);
      if (!L.alive() || L.board.turn() !== bot) break; // les afgebroken of stand veranderd
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
      msg = (L.board.turn() === bot) // de partij die mat staat, is aan zet
        ? "Schaakmat! Jij hebt gewonnen! Wat ben jij een kampioen!"
        : "Oei, ik had even mazzel! Maar wat speelde jij goed, zeg.";
    } else if (L.board.inStalemate()) {
      msg = "Patstelling! De koning kan niet meer, maar staat niet schaak. Het is gelijkspel.";
    } else if (L.board.isDraw()) {
      msg = "Het is gelijkspel! Niemand wint. Knap gespeeld, hoor!";
    } else {
      msg = "Wat een leuk partijtje! Jij bent een echte schaker aan het worden.";
    }
    await L.say(msg, { mood: "happy" });
    L.done();
  }

  /* ============================ MODULE: PUZZELS (TACTIEK) ============================ */
  // Vijf duidelijk verschillende tactieken (geen mat, geen dubbele). Alle
  // standen vooraf in chess.js gecontroleerd. Types: capture, fork, skewer.
  var PUZZLES = [
    // gratis stuk: pak de onverdedigde dame met de toren
    { type: "capture", only: "d1", point: "d6", target: "d6",
      pieces: [{ type: "k", color: "w", square: "g1" }, { type: "r", color: "w", square: "d1" },
               { type: "k", color: "b", square: "h8" }, { type: "q", color: "b", square: "d6" }],
      zeg: "Pak de zwarte dame! Ze staat helemaal alleen, niemand verdedigt haar.",
      hint: "Tik op je toren en pak de dame die oplicht." },
    // vork: het paard valt de koning en de dame tegelijk aan
    { type: "fork", only: "b5", point: "c7", target: "c7",
      pieces: [{ type: "k", color: "w", square: "h1" }, { type: "n", color: "w", square: "b5" },
               { type: "k", color: "b", square: "a8" }, { type: "q", color: "b", square: "e8" }],
      zeg: "De vork! Zet je paard op het vakje dat oplicht. Dan val je de koning en de dame samen aan.",
      hint: "Zet je paard op het paarse vakje.",
      gelukt: "Een vork! Allebei tegelijk! Wat ben jij slim." },
    // penning: het gepende paard mag niet weg, pak het met de pion
    { type: "capture", only: "d4", point: "e5", target: "e5",
      pieces: [{ type: "k", color: "b", square: "e8" }, { type: "n", color: "b", square: "e5" },
               { type: "r", color: "w", square: "e1" }, { type: "p", color: "w", square: "d4" },
               { type: "k", color: "w", square: "h1" }],
      zeg: "De penning! Het zwarte paard zit vast voor de koning, het mag niet weg. Pak het met je pion!",
      hint: "Tik op je pion en sla het paard schuin.",
      gelukt: "Knap! Het paard zat vast en jij pakte het." },
    // spies: de koning staat ervoor, win de dame erachter
    { type: "skewer", only: "h1", point: "a1", target: "a1",
      pieces: [{ type: "k", color: "b", square: "a4" }, { type: "q", color: "b", square: "a7" },
               { type: "r", color: "w", square: "h1" }, { type: "k", color: "w", square: "h8" }],
      zeg: "De spies! Val de koning aan met je toren. Hij moet opzij, en dan pak jij de dame erachter.",
      hint: "Zet je toren op het paarse vakje, onder de koning.",
      gelukt: "Een spies! Eerst de koning, dan de dame. Wat ben jij slim!" },
    // aftrekschaak: haal het paard weg, de toren erachter geeft schaak, win de dame
    { type: "capture", only: "e4", point: "c5", target: "c5",
      pieces: [{ type: "k", color: "b", square: "e8" }, { type: "q", color: "b", square: "c5" },
               { type: "r", color: "w", square: "e1" }, { type: "n", color: "w", square: "e4" },
               { type: "k", color: "w", square: "h1" }],
      zeg: "Het aftrekschaak! Haal je paard weg, en de toren erachter geeft schaak. Pak meteen de dame!",
      hint: "Zet je paard op de dame. Dan geeft de toren erachter schaak.",
      gelukt: "Aftrekschaak! De toren geeft schaak en jij wint de dame. Super slim!" }
  ];

  function setupPuzzle(L, def) {
    L.board.setupCustom(def.pieces, "w");
    L.board.setMode("move");
    L.board.setMovable(function (sq) { return sq === def.only; }); // alleen het juiste stuk
    // leeg doelvakje laten oplichten waar het kind naartoe moet
    if (def.type === "fork" || def.type === "promo" || def.type === "skewer") L.board.showHintFrom(def.point);
    L.point(def.point);
  }

  async function puzzleSolve(L, def) {
    setupPuzzle(L, def);
    await L.say(def.zeg, { mood: "think" });
    var tries = 0;
    while (true) {
      var mv = await L.waitMove();
      var ok = (def.type === "mate") ? L.board.inCheckmate()
             : (def.type === "capture") ? (!!mv.captured && mv.to === def.target)
             : (def.type === "promo") ? (!!mv.flags && mv.flags.indexOf("p") >= 0)
             : (mv.to === def.target); // fork en skewer: het juiste vakje bereiken
      if (ok) {
        L.unpoint();
        L.cheer();
        L.star();
        var msg = def.gelukt ? def.gelukt
                : (def.type === "fork") ? "Een vork! Allebei tegelijk! Wat ben jij slim."
                : (def.type === "mate") ? "Schaakmat! Je hebt het voor elkaar! Hoeraaa!"
                : (def.type === "promo") ? "Joepie! Je pion is een dame geworden!"
                : pick(SLAGEN);
        await L.say(msg, { mood: "happy" });
        return;
      }
      tries++;
      await L.say(pick(TRY_AGAIN));
      setupPuzzle(L, def);
      if (tries >= 2 && def.hint) {
        if (def.type === "mate") L.board.showHintFrom(def.point);
        await L.say(def.hint);
      }
    }
  }

  async function modulePuzzles(L) {
    await L.say("Welkom bij de puzzels! Hier word jij een echte schaakbaas. Klaar?", { mood: "happy" });
    await puzzleSolve(L, PUZZLES[0]); await L.wait(300); // gratis stuk
    await puzzleSolve(L, PUZZLES[1]); await L.wait(300); // vork
    await L.say("Nu wat moeilijkere trucs! Goed opletten.");
    await puzzleSolve(L, PUZZLES[2]); await L.wait(300); // penning
    await puzzleSolve(L, PUZZLES[3]); await L.wait(300); // spies
    await puzzleSolve(L, PUZZLES[4]); await L.wait(300); // aftrekschaak
    L.board.clearGoals();
    L.celebrate();
    await L.say("Wauw! Jij bent een echte puzzelkampioen. Knap hoor!", { mood: "happy" });
    L.done();
  }

  /* ============================ MODULE: DE OPENING ============================ */
  // Drie eenvoudige openingsregels, stap voor stap voorgedaan op het echte bord.
  async function moduleOpening(L) {
    L.board.setFlipped(false);
    L.board.reset();
    L.board.setMode("move");
    L.board.setMovable("w");
    await L.say("Hoe begin je een potje goed? Ik leer je drie slimme regels!", { mood: "happy" });

    // begeleid één zet: alleen 'only' beweegbaar, doelvakje 'target', daarna het zwarte antwoord
    async function guide(only, target, zeg, reply) {
      function setup() {
        L.board.setMode("move");
        L.board.setMovable(function (sq) { return sq === only; });
        L.point(target);
      }
      setup();
      await L.say(zeg);
      while (true) {
        var mv = await L.waitMove();
        if (mv.to === target) {
          L.unpoint();
          L.blurt(pick(["Mooie zet!", "Goed bezig, ga zo door!", "Jij kan dit echt goed!"]));
          if (reply) { await L.wait(450); L.board.move(reply[0], reply[1]); await L.wait(300); }
          return;
        }
        await L.say(pick(TRY_AGAIN));
        L.board.undoLast();
        setup();
      }
    }

    await guide("e2", "e4", "Regel één: zet een pion in het midden. Schuif je pion twee vakjes vooruit.", ["e7", "e5"]);
    await guide("g1", "f3", "Regel twee: haal je paard naar buiten, klaar om te springen.", ["b8", "c6"]);
    await guide("f1", "c4", "Ook je loper mag naar buiten. Geef hem de ruimte.", ["f8", "c5"]);

    // rokeren: alleen de koning beweegbaar, herken de korte rokade
    L.board.setMode("move");
    L.board.setMovable(function (sq) { return sq === "e1"; });
    L.point("g1");
    await L.say("En nu het belangrijkste: zet je koning veilig. Rokeer!");
    while (true) {
      var mv = await L.waitMove();
      if (mv.flags && mv.flags.indexOf("k") >= 0) { L.unpoint(); break; }
      await L.say(pick(TRY_AGAIN));
      L.board.undoLast();
      L.board.setMode("move");
      L.board.setMovable(function (sq) { return sq === "e1"; });
      L.point("g1");
    }
    L.cheer();
    L.star();
    await L.say("Knap! Je pion staat in het midden, je stukken zijn klaar, en je koning is veilig. Zo begin je als een kampioen!", { mood: "happy" });
    L.done();
  }

  /* ============================ MODULE: HET EINDSPEL ============================ */
  // Echte eindspeltechniek (geen matzetten): de oppositie, een actieve koning,
  // en een pion naar de overkant brengen. Alle standen vooraf gecontroleerd.
  async function moduleEndgame(L) {
    // begeleid één koningszet: alleen 'only' beweegbaar, doelvakje 'target'
    async function kingTo(only, target) {
      function setup() {
        L.board.setMode("move");
        L.board.setMovable(function (sq) { return sq === only; });
        L.board.showHintFrom(target);
        L.point(target);
      }
      setup();
      while (true) {
        var mv = await L.waitMove();
        if (mv.to === target) { L.unpoint(); L.cheer(); L.star(); return; }
        await L.say(pick(TRY_AGAIN));
        L.board.undoLast();
        setup();
      }
    }

    await L.say("Welkom bij het eindspel! Er staan nog maar weinig stukken. Nu komt het op je koning aan.", { mood: "happy" });

    // 1) OPPOSITIE
    L.board.setupCustom([
      { type: "k", color: "b", square: "d6" }, { type: "k", color: "w", square: "c4" },
      { type: "p", color: "w", square: "c2" }
    ], "w");
    await L.say("Eerst de oppositie. Zet je koning recht tegenover de zwarte koning, met één vakje ertussen. Dan moet hij wijken.", { mood: "think" });
    await kingTo("c4", "d4");
    await L.say("Knap! Nu heb jij de oppositie. Kijk, de zwarte koning moet opzij.", { mood: "happy" });
    await L.wait(300);
    L.board.move("d6", "e6"); // zwart moet wijken
    await L.wait(800);

    // 2) ACTIEVE KONING
    L.board.setupCustom([
      { type: "k", color: "w", square: "d4" }, { type: "k", color: "b", square: "f6" },
      { type: "p", color: "w", square: "d3" }
    ], "w");
    await L.say("In het eindspel is je koning juist sterk. Loop er dapper mee naar voren!", { mood: "think" });
    await kingTo("d4", "d5");
    await L.say("Goed zo! Een sterke koning helpt je winnen.");
    await L.wait(300);

    // 3) DE PION NAAR DE OVERKANT
    L.board.setupCustom([
      { type: "k", color: "w", square: "g7" }, { type: "p", color: "w", square: "h7" },
      { type: "k", color: "b", square: "a1" }
    ], "w");
    L.board.setMode("move");
    L.board.setMovable(function (sq) { return sq === "h7"; });
    L.board.showHintFrom("h8");
    L.point("h8");
    await L.say("En nu het mooiste: breng de pion naar de overkant. Je koning beschermt hem.", { mood: "think" });
    while (true) {
      var mv = await L.waitMove();
      if (mv.flags && mv.flags.indexOf("p") >= 0) { L.unpoint(); L.cheer(); L.star(); break; }
      await L.say(pick(TRY_AGAIN));
      L.board.undoLast();
      L.board.setMode("move");
      L.board.setMovable(function (sq) { return sq === "h7"; });
      L.board.showHintFrom("h8");
      L.point("h8");
    }
    await L.say("De pion is een dame geworden! Zo win je een eindspel.", { mood: "happy" });
    L.board.clearGoals();
    L.celebrate();
    await L.say("Knap! Je weet nu hoe je het eindspel speelt: met je koning en de oppositie.", { mood: "happy" });
    L.done();
  }

  /* ---------- registratie ---------- */
  window.Modules = {
    list: [
      { id: "board",     emoji: "🏁", title: "Het bord",        run: moduleBoard },
      { id: "pieces",    emoji: "♟️", title: "De stukken",       run: modulePieces },
      { id: "capture",   emoji: "💥", title: "Slaan",            run: moduleCapture },
      { id: "checkmate", emoji: "👑", title: "Schaak en mat",    run: moduleCheckmate },
      { id: "puzzles",   emoji: "🧩", title: "Puzzels",          run: modulePuzzles },
      { id: "opening",   emoji: "🚀", title: "De opening",       run: moduleOpening },
      { id: "endgame",   emoji: "🏅", title: "Het eindspel",     run: moduleEndgame },
      { id: "play",      emoji: "🏆", title: "Een partijtje",    run: modulePlay }
    ]
  };
})();
