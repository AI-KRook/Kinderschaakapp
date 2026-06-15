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
    "Bijna! Kijk waar het handje wijst.",
    "Oei, net niet. Volg het handje maar.",
    "Nog een keertje! Het handje wijst de weg.",
    "Probeer het nog eens, naar het vakje met het handje."
  ];
  var COUNT = ["Eén ster!", "Twee sterren!", "Drie sterren!", "Vier sterren!"];
  var SLAGEN = ["Hebbes! Lekker geslagen!", "Boem! Mooi gepakt!", "Ja! Dat ging knap!"];

  // korte schrijfwijze voor standen: 'wke8' -> { color:'w', type:'k', square:'e8' }
  function P1(s) { return { color: s[0], type: s[1], square: s.slice(2) }; }
  function PP(str) { return str.split(" ").map(P1); }

  // keuzeknoppen (ja/nee, mat/pat, ...) in de actiebalk; lost de gekozen waarde op
  function askChoice(L, options) {
    return new Promise(function (resolve) {
      var actions = document.getElementById("lesson-actions");
      if (!actions) { resolve(null); return; }
      actions.innerHTML = "";
      options.forEach(function (o) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "big-action " + (o.cls || "sun");
        b.innerHTML = (o.glyph ? '<span class="ba-emoji">' + o.glyph + '</span> ' : "") + o.label;
        b.addEventListener("click", function () {
          if (!L.alive()) return;
          actions.innerHTML = "";
          resolve(o.value);
        });
        actions.appendChild(b);
      });
    });
  }

  // stel een herken-vraag met knoppen; herhaalt tot het juiste antwoord
  async function askPick(L, vraag, options, correct, goed, fout) {
    await L.say(vraag, { mood: "think" });
    while (true) {
      var ans = await askChoice(L, options);
      if (ans === correct) { L.cheer(); L.star(); await L.say(goed, { mood: "happy" }); return; }
      await L.say(fout);
    }
  }

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

    // de vorm van het bord: rijen, lijnen en diagonalen (kort en luchtig)
    await L.say("Kijk, de vakjes liggen in rijtjes naast elkaar. Zo'n rijtje van links naar rechts heet een rij.");
    await L.say("En van jou naar de overkant lopen de lijnen, recht vooruit.");
    await L.say("Gaat het schuin? Dan heet het een diagonaal. Daar houdt de loper van!");
    await L.say("Tik nu eens op een hoekje van het bord, helemaal in de hoek.");
    while (true) {
      var t = await L.waitTap();
      if (t.square === "a1" || t.square === "a8" || t.square === "h1" || t.square === "h8") { L.cheer(); L.star(); break; }
      L.blurt(pick(["Bijna! Een hoekje zit helemaal in de hoek.", "Net niet, zoek een hoekje van het bord."]));
    }
    await L.say("Knap gevonden! Dat was een hoekje van het bord.");

    await L.say("Klaar om de stukken te leren kennen? Daar gaan we!", { mood: "happy" });
    L.done();
  }

  /* ============================ MODULE 2: DE STUKKEN ============================ */
  var PIECES = [
    { type: "r", naam: "de toren", start: "a1", path: ["a5", "f5", "f2"],
      uitleg: "Dit is de toren. Hij gaat rechtdoor: vooruit, achteruit of opzij. Maar nooit schuin.",
      mis: "De toren gaat rechtdoor. Schuif hem naar de ster!" },
    { type: "b", naam: "de loper", start: "c1", path: ["h6", "f8", "a3"],
      uitleg: "Dit is de loper. Hij gaat altijd schuin, en blijft op zijn eigen kleur.",
      mis: "De loper gaat schuin. Schuif hem naar de ster!" },
    { type: "n", naam: "het paard", start: "d4", path: ["f5", "d6", "b5"],
      uitleg: "Dit is het paard, dat ben ik! Ik spring in een L, en mag over andere stukken heen.",
      mis: "Het paard springt in een L. Spring naar de ster!" },
    { type: "q", naam: "de dame", start: "d1", path: ["d4", "a7", "a1"],
      uitleg: "Dit is de dame, het sterkste stuk. Zij mag alle kanten op, recht en schuin.",
      mis: "De dame mag alle kanten op. Ga naar de ster!" },
    { type: "k", naam: "de koning", start: "e4", path: ["e5", "d6", "c5"],
      uitleg: "Dit is de koning, de baas. Hij zet maar één stapje tegelijk. Pas goed op hem!",
      mis: "De koning zet één stapje. Ga naar de ster!" },
    { type: "p", naam: "de pion", start: "e2", path: ["e4", "e5", "e6"],
      uitleg: "Dit is de pion. Hij stapt vooruit, eentje tegelijk. Aan de overkant wordt hij een dame!",
      mis: "De pion stapt vooruit. Ga naar de ster!" }
  ];

  async function teachPiece(L, def, first) {
    function place() {
      L.board.setupCustom([{ type: def.type, color: "w", square: def.start }], "w");
      L.board.setMode("move");
      L.board.setMovable("w");
    }
    place();
    L.point(def.start);
    await L.say(def.uitleg);
    L.unpoint();
    if (first) {
      await L.say("Tik op het stuk. De groene stipjes laten zien waar hij naartoe mag.");
      await L.say("Verzamel nu de sterretjes! Pak ze één voor één.");
    }

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
          await L.say(def.mis);
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
      await teachPiece(L, PIECES[i], i === 0);
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
    await L.say("Knap! Maar let op: de tegenstander mag jouw stukken ook slaan. Bescherm ze dus goed.");
    await L.say("Je kunt nu slaan met al je stukken. Je wordt steeds beter, zeg!", { mood: "happy" });
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
    await L.say("De koning en de toren bewegen samen. De koning springt twee vakjes opzij, de toren komt ernaast.");
    await L.say("Zo zit je koning lekker veilig in een hoekje, met de toren ervoor.");

    await castleOnce(L, ROK_KORT, "k", "Doe de korte rokade. Tik op de koning, en zet hem twee vakjes naar rechts.");
    await L.say("Knap! Je koning staat nu veilig in het hoekje.");

    await castleOnce(L, ROK_LANG, "q", "En nu de lange rokade. Tik op de koning, en zet hem twee vakjes naar links.");
    await L.say("Allebei gelukt! Nu ken je de korte en de lange rokade.", { mood: "happy" });

    L.board.setFEN(ROK_NIET);
    L.board.setMode("locked");
    await L.say("Maar let op, rokeren mag niet altijd!");
    L.point("f8");
    await L.say("Zie je die zwarte toren? De koning zou er vlak langs lopen. Door gevaar rokeren mag niet.");
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

  /* ============================ MODULE: SLIM SLAAN ============================ */
  // Stukwaarden + slim kiezen wat je slaat: gratis stukken, het sterkste pakken,
  // en terugslaan. Loopt op van makkelijk naar moeilijk. Alle standen vooraf met
  // chess.js gecontroleerd (zie tools-verificatie).

  // de waarde van de stukken, met twee tik-vragen
  async function askValueTap(L, wantType, hintSquare, vraag, goed) {
    await L.say(vraag, { mood: "think" });
    var tries = 0;
    while (true) {
      var t = await L.waitTap();
      if (t.piece && t.piece.type === wantType && t.piece.color === "w") {
        L.unpoint(); L.cheer(); L.star();
        await L.say(goed, { mood: "happy" });
        return;
      }
      tries++;
      await L.say("Bijna! Kijk nog eens goed naar de stukken.");
      if (tries >= 2) L.point(hintSquare);
    }
  }

  async function teachValues(L) {
    L.board.setupCustom([
      { type: "p", color: "w", square: "b4" },
      { type: "n", color: "w", square: "c4" },
      { type: "b", color: "w", square: "d4" },
      { type: "r", color: "w", square: "e4" },
      { type: "q", color: "w", square: "f4" }
    ], "w");
    L.board.setMode("tap");
    await L.say("Voordat je slim leert slaan, moet je weten hoe sterk elk stuk is. Elk stuk is punten waard.");
    L.point("b4"); await L.say("De pion is het zwakste. Hij is één punt waard."); L.unpoint();
    L.point("c4"); await L.say("Het paard is drie punten waard."); L.unpoint();
    L.point("d4"); await L.say("De loper ook, drie punten."); L.unpoint();
    L.point("e4"); await L.say("De toren is sterker. Vijf punten."); L.unpoint();
    L.point("f4"); await L.say("En de dame is de sterkste van allemaal. Negen punten!"); L.unpoint();
    await askValueTap(L, "q", "f4", "Tik nu op het sterkste stuk. Welke is dat?", "Dat is de dame! Negen punten, de sterkste van het bord.");
    await askValueTap(L, "r", "e4", "En tik nu op het stuk dat vijf punten waard is.", "Ja! De toren, vijf punten.");
  }

  // eenvoudige slag-oefening: alleen 'only' beweegbaar, sla het juiste stuk
  async function captureExercise(L, def) {
    function setup() {
      L.board.setupCustom(def.pieces, "w");
      L.board.setMode("move");
      L.board.setMovable(function (sq) { return sq === def.only; });
      L.board.showHintFrom(def.only); // het te gebruiken stuk licht op
      L.point(def.point);             // het handje wijst het doelvakje aan
    }
    setup();
    await L.say(def.zeg, { mood: "think" });
    var tries = 0;
    while (true) {
      var mv = await L.waitMove();
      if (mv.captured && (!def.target || mv.to === def.target)) {
        L.unpoint(); L.cheer(); L.star();
        await L.say(def.gelukt || pick(SLAGEN), { mood: "happy" });
        return;
      }
      tries++;
      await L.say(pick(TRY_AGAIN));
      setup();
      if (tries >= 2 && def.hint) await L.say(def.hint);
    }
  }

  var SMART = [
    { only: "e4", point: "d6", target: "d6",
      pieces: [{ type: "k", color: "w", square: "h1" }, { type: "n", color: "w", square: "e4" },
               { type: "k", color: "b", square: "h8" }, { type: "r", color: "b", square: "d6" }],
      zeg: "Slaan met het paard! Het paard springt in een L. Tik op je paard dat oplicht, en sla daarmee de toren.",
      gelukt: "Hebbes! Een toren gepakt met je paard. Vijf punten gewonnen!",
      hint: "Tik op je paard dat oplicht, en spring naar de toren die het handje aanwijst." },
    { only: "d1", point: "d6", target: "d6",
      pieces: [{ type: "k", color: "w", square: "h1" }, { type: "q", color: "w", square: "d1" },
               { type: "k", color: "b", square: "h8" }, { type: "r", color: "b", square: "d6" }],
      zeg: "Nu met de dame. Tik op je dame, en sla daarmee de toren.",
      gelukt: "Knap! Je dame pakte de toren.",
      hint: "Tik op je dame die oplicht, en pak dan de toren die het handje aanwijst." }
  ];

  // pak het sterkste stuk (toren 5 boven paard 3)
  async function exStrongest(L) {
    function setup() {
      L.board.setupCustom([
        { type: "k", color: "w", square: "a1" }, { type: "q", color: "w", square: "d1" },
        { type: "k", color: "b", square: "a8" }, { type: "n", color: "b", square: "d5" },
        { type: "r", color: "b", square: "h5" }
      ], "w");
      L.board.setMode("move");
      L.board.setMovable(function (sq) { return sq === "d1"; });
      L.board.showHintFrom("d1"); // je dame licht op
      L.point("h5");
    }
    setup();
    await L.say("Je kunt twee stukken pakken: een paard van drie punten, of een toren van vijf. Tik op je dame en pak de sterkste, dat is de toren!", { mood: "think" });
    while (true) {
      var mv = await L.waitMove();
      if (mv.captured && mv.to === "h5") {
        L.unpoint(); L.cheer(); L.star();
        await L.say("Top! De toren is vijf punten, meer dan het paard. Altijd het sterkste pakken!", { mood: "happy" });
        return;
      }
      if (mv.captured && mv.to === "d5") await L.say("Bijna! Je pakte het paard, drie punten. Maar de toren is meer waard. Pak de sterkste!");
      else await L.say(pick(TRY_AGAIN));
      setup();
    }
  }

  // verdedigd of niet: pak de gratis toren, niet de verdedigde loper
  async function exDefended(L) {
    function setup() {
      L.board.setupCustom([
        { type: "k", color: "w", square: "h1" }, { type: "q", color: "w", square: "d1" },
        { type: "k", color: "b", square: "h8" }, { type: "r", color: "b", square: "d5" },
        { type: "b", color: "b", square: "a4" }, { type: "p", color: "b", square: "b5" }
      ], "w");
      L.board.setMode("move");
      L.board.setMovable(function (sq) { return sq === "d1"; });
      L.board.showHintFrom("d1"); // je dame licht op
      L.point("d5");
    }
    setup();
    await L.say("Nu goed opletten! De loper wordt verdedigd door een pion, maar de toren staat helemaal alleen. Tik op je dame en pak de toren die alleen staat.", { mood: "think" });
    while (true) {
      var mv = await L.waitMove();
      if (mv.captured && mv.to === "d5") {
        L.unpoint(); L.cheer(); L.star();
        await L.say("Knap! De toren stond onverdedigd, die pak je gratis. Vijf punten!", { mood: "happy" });
        return;
      }
      if (mv.captured && mv.to === "a4") {
        await L.wait(350);
        L.board.move("b5", "a4"); // de pion slaat de dame terug
        await L.wait(900);
        await L.say("Oei! Zag je dat? De pion sloeg jouw dame terug. De loper werd verdedigd. Dat kostte je je sterkste stuk!");
      } else {
        await L.say(pick(TRY_AGAIN));
      }
      setup();
    }
  }

  // terugslaan: zwart pakt je pion, jij slaat terug
  async function exRecapture(L) {
    function setup() { L.board.setFEN("7k/3r4/8/8/8/3P4/8/5B1K b - - 0 1"); L.board.setMode("locked"); }
    function enable() {
      L.board.setMode("move");
      L.board.setMovable(function (sq) { return sq === "f1"; });
      L.board.showHintFrom("f1"); // je loper licht op
      L.point("d3");
    }
    setup();
    await L.say("Soms slaat de tegenstander jouw stuk. Dan sla je gewoon terug! Dat heet terugslaan.", { mood: "think" });
    await L.wait(300);
    L.board.move("d7", "d3"); // zwart slaat de pion
    await L.wait(900);
    await L.say("Au! Ik pakte net je pion met mijn toren. Maar nu staat mijn toren onbeschermd. Pak hem terug met je loper!");
    enable();
    while (true) {
      var mv = await L.waitMove();
      if (mv.captured && mv.to === "d3") {
        L.unpoint(); L.cheer(); L.star();
        await L.say("Mooi teruggeslagen! Nu sta je weer gelijk. Goed onthouden: sla bijna altijd terug!", { mood: "happy" });
        return;
      }
      await L.say(pick(TRY_AGAIN));
      setup();
      await L.wait(200);
      L.board.move("d7", "d3");
      await L.wait(700);
      enable();
    }
  }

  async function moduleSmartCapture(L) {
    await teachValues(L);
    await L.wait(300);
    await L.say("Nu ga je slim slaan! Pak stukken die je gratis kunt krijgen, en altijd de sterkste.");
    await captureExercise(L, SMART[0]); await L.wait(300); // slaan met het paard
    await captureExercise(L, SMART[1]); await L.wait(300); // slaan met de dame
    await exStrongest(L); await L.wait(300);                // pak de sterkste
    await exDefended(L); await L.wait(300);                 // verdedigd of niet
    await exRecapture(L);                                   // terugslaan
    L.board.clearGoals();
    L.celebrate();
    await L.say("Wauw! Nu weet je hoeveel de stukken waard zijn, en hoe je slim slaat. Wat ben jij knap geworden!", { mood: "happy" });
    L.done();
  }

  /* ============================ MODULE: MAT OEFENEN ============================ */
  // Vervolg op "Schaak en mat": schaak herkennen, uit schaak komen, matpatronen,
  // pat herkennen, en de en-passant-slag (die nu hier hoort, na schaak en mat).
  // Alle standen vooraf met chess.js gecontroleerd.

  var JANEE = [
    { label: "Ja, schaak!", glyph: "⚠️", cls: "coral", value: true },
    { label: "Nee, veilig", glyph: "🛡️", cls: "green", value: false }
  ];
  var MATPAT = [
    { label: "Schaakmat", glyph: "👑", cls: "coral", value: "mat" },
    { label: "Pat, gelijk", glyph: "🤝", cls: "green", value: "pat" }
  ];

  async function recognizeCheck(L, stand, isSchaak, goed, fout) {
    L.board.setupCustom(PP(stand), "b");
    L.board.setMode("locked");
    await askPick(L, "Kijk naar de zwarte koning. Staat hij schaak?", JANEE, isSchaak, goed, fout);
  }

  async function recognizeMatPat(L, stand, antwoord, goed, fout) {
    L.board.setupCustom(PP(stand), "b");
    L.board.setMode("locked");
    await askPick(L, "Kijk goed. Is dit schaakmat, of pat?", MATPAT, antwoord, goed, fout);
  }

  // uit schaak komen: alleen 'only' beweegbaar, het kind doet de reddende zet
  async function escapeCheck(L, def) {
    function setup() {
      L.board.setupCustom(PP(def.stand), "w");
      L.board.setMode("move");
      L.board.setMovable(function (sq) { return sq === def.only; });
      L.board.showHintFrom(def.attacker);
      L.point(def.point);
    }
    setup();
    await L.say(def.zeg, { mood: "think" });
    // chess.js staat alleen legale (schaak-opheffende) zetten toe, dus elke
    // geaccepteerde zet redt de koning; verkeerde pogingen komen niet door.
    await L.waitMove();
    L.unpoint(); L.cheer(); L.star();
    await L.say(def.goed, { mood: "happy" });
  }

  async function moduleMatePractice(L) {
    await L.say("Je kent al schaak en mat. Nu ga je het echt oefenen. Het wordt een beetje moeilijker!", { mood: "happy" });

    // 1) schaak herkennen
    await recognizeCheck(L, "bke8 wqe2 wka1", true,
      "Ja! De dame valt de koning aan over de lijn. Dat is schaak.",
      "Kijk nog eens. De dame staat op dezelfde lijn als de koning. Dat ís schaak.");
    await recognizeCheck(L, "bke8 wqd2 wka1", false,
      "Klopt! De dame raakt de koning niet. Hij is veilig.",
      "Kijk goed. De dame raakt de koning helemaal niet. Het is geen schaak.");
    await recognizeCheck(L, "bkh8 wbb2 wka1", true,
      "Ja! De loper valt de koning schuin aan. Schaak!",
      "Volg de schuine lijn van de loper. Die komt precies bij de koning. Dat is schaak.");

    // 2) uit schaak komen, de drie manieren (nu doet het kind ze zelf)
    await L.say("Goed! En als JIJ schaak staat? Dan moet je je koning redden. Er zijn drie manieren.");
    await escapeCheck(L, { stand: "wke1 bre8 bka8", only: "e1", attacker: "e8", point: "f2",
      zeg: "Eén: loop weg! Jouw koning staat schaak. Zet hem op een veilig vakje, weg van de lijn.",
      goed: "Knap weggelopen! Je koning is veilig." });
    await escapeCheck(L, { stand: "wke1 bre8 wra4 bka8", only: "a4", attacker: "e8", point: "e4",
      zeg: "Twee: zet er iets voor! Schuif je toren tussen de koning en de aanvaller, als een schildje.",
      goed: "Mooi geblokt! De toren staat er als een schildje voor." });
    await escapeCheck(L, { stand: "wkg1 brg2 wra2 bka8", only: "a2", attacker: "g2", point: "g2",
      zeg: "Drie: sla de aanvaller! Pak het stuk dat jouw koning schaak geeft.",
      goed: "Hebbes! De aanvaller is weg, je koning is veilig." });

    // 3) matpatronen (mat in één)
    await L.say("Top! Nu ga je zelf matzetten. Drie verschillende manieren.");
    await matePuzzle(L, { pieces: PP("bka8 wrg7 wrh1 wke1"), point: "h8", hintFrom: "h1",
      zeg: "Mat met je twee torens! De ene toren bewaakt al een rij. Schuif de andere helemaal naar boven.",
      hint: "Een tipje: schuif je toren op de h-lijn naar boven, naar h8." });
    await L.wait(300);
    await matePuzzle(L, { pieces: PP("bkg8 bpf7 bpg7 bph7 wre1 wka1"), point: "e8", hintFrom: "e1",
      zeg: "De achterste-rij-mat! De koning zit gevangen achter zijn eigen pionnen. Schuif je toren naar de bovenste rij.",
      hint: "Een tipje: schuif je toren naar boven, naar e8." });
    await L.wait(300);
    await matePuzzle(L, { pieces: PP("bkg8 wkg6 wqd7"), point: "g7", hintFrom: "d7",
      zeg: "Damemat met hulp van je koning! Zet je dame vlak naast de zwarte koning. Jouw koning past op de dame.",
      hint: "Een tipje: zet je dame op g7, vlak naast de koning." });
    await L.wait(300);

    // 4) mat of pat?
    await L.say("Pas op! Soms lijkt het mat, maar is het pat. Bij pat kan de koning niet meer zetten, maar staat hij NIET schaak. Dan is het gelijk.");
    await recognizeMatPat(L, "bkh8 wkf7 wqg6", "pat",
      "Goed gezien! De koning kan nergens heen, maar staat niet schaak. Dat is pat, dus gelijkspel.",
      "Kijk: de koning staat niet schaak, en kan niet zetten. Dat is pat, geen mat.");
    await recognizeMatPat(L, "bkh8 wkf7 wqg7", "mat",
      "Precies! De dame geeft schaak en de koning kan niet weg. Schaakmat!",
      "Kijk: de dame valt de koning aan en hij kan niet ontsnappen. Dat is mat.");

    // 5) en passant (bonus, hoort na schaak en mat)
    await L.say("Je bent nu een echte matmeester! Eén bijzondere slag heb je nog niet gezien. Hij heet en passant.");
    await enPassantRound(L);

    L.board.clearGoals();
    L.celebrate();
    await L.say("Wauw! Je herkent schaak, mat en pat, je komt uit schaak, en je kent en passant. Wat ben jij goed!", { mood: "happy" });
    L.done();
  }

  /* ============================ MODULE: SLIM OPENEN ============================ */
  // Vervolg op "De opening": de echte openingsregels, stap voor stap voorgedaan.
  async function moduleOpeningSmart(L) {
    L.board.setFlipped(false);
    L.board.reset();
    L.board.setMode("locked");
    await L.say("Je kent de eerste stappen al. Nu leer je openen als een echte schaker!", { mood: "happy" });

    // begeleid één zet: alleen 'only' beweegbaar, daarna het zwarte antwoord
    async function guide(only, target, zeg, reply, flag) {
      function setup() {
        L.board.setMode("move");
        L.board.setMovable(function (sq) { return sq === only; });
        L.point(target);
      }
      setup();
      await L.say(zeg);
      while (true) {
        var mv = await L.waitMove();
        var goal = flag ? (mv.flags && mv.flags.indexOf(flag) >= 0) : (mv.to === target);
        if (goal) {
          L.unpoint();
          L.blurt(pick(["Mooie zet!", "Goed bezig!", "Knap!"]));
          if (reply) { await L.wait(450); L.board.move(reply[0], reply[1]); await L.wait(300); }
          return;
        }
        await L.say(pick(TRY_AGAIN));
        L.board.undoLast();
        setup();
      }
    }

    await guide("e2", "e4", "Regel één: beheers het centrum. Zet je pion in het midden, twee vakjes vooruit.", ["e7", "e5"]);

    // dame niet te vroeg (keuze met knoppen)
    L.board.setMode("locked");
    await askPick(L, "Een keuze! Wat is slim aan het begin? Je dame ver naar voren, of eerst een stuk ontwikkelen?",
      [{ label: "Dame naar voren", glyph: "♛", cls: "coral", value: "dame" },
       { label: "Paard eruit", glyph: "♞", cls: "green", value: "paard" }],
      "paard",
      "Precies! Haal eerst je stukken eruit. De dame te vroeg wordt opgejaagd, en dan verlies je tijd.",
      "Niet de dame zo vroeg! Die wordt opgejaagd door de kleine stukken. Ontwikkel liever een paard.");

    await guide("g1", "f3", "Goed! Ontwikkel een paard naar buiten. Hij valt meteen de pion in het midden aan.", ["b8", "c6"]);
    await guide("f1", "c4", "Nu je loper naar buiten, naar een actief vakje.", ["f8", "c5"]);
    await guide("b1", "c3", "Ontwikkel je ANDERE stukken, niet steeds hetzelfde stuk. Het tweede paard eruit!", ["g8", "f6"]);
    await guide("e1", "g1", "En het allerbelangrijkste: zet je koning op tijd veilig. Rokeer!", null, "k");

    L.cheer(); L.star();
    L.celebrate();
    await L.say("Wauw! Je beheerst het centrum, al je stukken staan klaar, en je koning is veilig. Zo open je als een kampioen!", { mood: "happy" });
    L.done();
  }

  /* ============================ MODULE: EINDSPEL MATZETTEN ============================ */
  // De kale koning matzetten met dame en toren (de kern die in "Het eindspel"
  // nog ontbrak), plus het vierkant van de pion en promoveren met koningssteun.
  async function moduleEndgameMate(L) {
    await L.say("Nu het belangrijkste eindspel: de kale koning matzetten. Eerst met je dame, dan met je toren!", { mood: "happy" });

    // helper: laat het kind één stuk naar een doelvakje brengen
    async function moveTo(only, target, isPromo) {
      function setup() {
        L.board.setMode("move");
        L.board.setMovable(function (sq) { return sq === only; });
        L.board.showHintFrom(target);
        L.point(target);
      }
      setup();
      while (true) {
        var mv = await L.waitMove();
        var ok = isPromo ? (mv.flags && mv.flags.indexOf("p") >= 0) : (mv.to === target);
        if (ok) { L.unpoint(); L.cheer(); L.star(); return; }
        await L.say(pick(TRY_AGAIN));
        L.board.undoLast();
        setup();
      }
    }

    // 1) mat met de dame (koningen in oppositie, dame op de achterlijn)
    await matePuzzle(L, { pieces: PP("bke8 wke6 wqh1"), point: "h8", hintFrom: "h1",
      zeg: "Mat met de dame! Jouw koning staat al tegenover de zwarte koning. Geef nu mat met je dame op de bovenste rij.",
      hint: "Een tipje: schuif je dame helemaal naar boven, naar h8." });
    await L.wait(300);

    // 2) mat met de toren
    await matePuzzle(L, { pieces: PP("bke8 wke6 wra1"), point: "a8", hintFrom: "a1",
      zeg: "Nu met de toren! Weer staan de koningen tegenover elkaar. Geef mat met je toren op de bovenste rij.",
      hint: "Een tipje: schuif je toren helemaal naar boven, naar a8." });
    await L.wait(300);

    // 3) het vierkant van de pion (herkenning)
    L.board.setupCustom(PP("wph5 bkd5 wke1"), "w");
    L.board.setMode("locked");
    await askPick(L, "De witte pion rent naar boven. Haalt de zwarte koning hem nog in voordat hij dame wordt?",
      [{ label: "Ja, op tijd", glyph: "🏃", cls: "coral", value: "ja" },
       { label: "Nee, te ver", glyph: "👑", cls: "green", value: "nee" }],
      "nee",
      "Klopt! De koning staat te ver weg. De pion wordt dame. Dat heet het vierkant van de pion.",
      "Tel maar mee: de koning staat buiten het vierkant van de pion. Hij is te laat, de pion wordt dame.");

    // 4) promoveren met koningssteun
    L.board.setupCustom(PP("bkd7 wkb6 wpa7"), "w");
    await L.say("Soms hoef je niet eens mat te geven: maak gewoon een nieuwe dame! Jouw koning beschermt de pion. Promoveer hem!", { mood: "think" });
    await moveTo("a7", "a8", true);
    await L.say("De pion is een dame geworden! Met zo'n dame win je makkelijk.", { mood: "happy" });
    await L.wait(300);

    // 5) oppositie gebruiken om door te breken
    L.board.setupCustom(PP("bkd6 wkc4 wpc3"), "w");
    await L.say("Tot slot: gebruik de oppositie om door te breken. Zet je koning recht tegenover de zwarte koning, één vakje ertussen.", { mood: "think" });
    await moveTo("c4", "d4");
    await L.say("Knap! Nu heb jij de oppositie. De zwarte koning moet wijken.", { mood: "happy" });
    await L.wait(300);
    L.board.move("d6", "e6"); // zwart wijkt
    await L.wait(800);
    await L.say("Zie je? Nu is er ruimte. Duw je pion verder naar voren!");
    await moveTo("c3", "c4");

    L.board.clearGoals();
    L.celebrate();
    await L.say("Geweldig! Je kunt nu matzetten met de dame en de toren, en je brengt een pion naar dame. Echt knap!", { mood: "happy" });
    L.done();
  }

  /* ---------- registratie ---------- */
  window.Modules = {
    list: [
      { id: "board",        emoji: "🏁", title: "Het bord",        run: moduleBoard },
      { id: "pieces",       emoji: "♟️", title: "De stukken",       run: modulePieces },
      { id: "capture",      emoji: "💥", title: "Slaan",            run: moduleCapture },
      { id: "smartcapture", emoji: "🎯", title: "Slim slaan",       run: moduleSmartCapture },
      { id: "checkmate",    emoji: "👑", title: "Schaak en mat",    run: moduleCheckmate },
      { id: "matework",     emoji: "⚔️", title: "Mat oefenen",      run: moduleMatePractice },
      { id: "puzzles",      emoji: "🧩", title: "Puzzels",          run: modulePuzzles },
      { id: "opening",      emoji: "🚀", title: "De opening",       run: moduleOpening },
      { id: "openingsmart", emoji: "🧭", title: "Slim openen",      run: moduleOpeningSmart },
      { id: "endgame",      emoji: "🏅", title: "Het eindspel",     run: moduleEndgame },
      { id: "endgamemate",  emoji: "🏰", title: "Mat in het eindspel", run: moduleEndgameMate },
      { id: "play",         emoji: "🏆", title: "Een partijtje",    run: modulePlay }
    ]
  };
})();
