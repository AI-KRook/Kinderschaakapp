/* =================================================================
   Bot — de computer-tegenstander, in vier niveaus.
   De getallen ELO 100 / 350 / 700 zijn een richtlijn voor het gevoel,
   geen gemeten waarde. Op niveau 1 tot 3 kan het kind altijd winnen.

   Niveau 1 (~100): doet willekeurige zetten.
   Niveau 2 (~350): pakt soms gratis stukken en zet mat als het kan.
   Niveau 3 (~700): pakt materiaal, past op zijn eigen stukken en geeft
                    soms schaak, maar blundert af en toe expres.
   Niveau 4: de zwakste stand van Stockfish (echt sterk; bedoeld voor
             grotere kinderen of een ouder, het kind wint hier zelden).
   chooseMove geeft altijd een Promise terug.
   ================================================================= */
(function () {
  "use strict";

  var VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

  function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  // mat-in-één: vind een zet die meteen mat geeft
  function findMate(game, moves) {
    for (var i = 0; i < moves.length; i++) {
      game.move(moves[i]);
      var mate = game.in_checkmate();
      game.undo();
      if (mate) return moves[i];
    }
    return null;
  }

  // niveau 1: zwak maar verstandig. Kiest zetten die niets gratis weggeven en
  // geeft rustige (niet-slaande) zetten de voorkeur, zodat het kind makkelijk
  // wint en het spel logisch oogt. Staat de bot zelf schaak, dan reageert hij
  // wel verstandig (de aanvaller slaan of de koning veilig zetten).
  function chooseLevel1(game) {
    var moves = game.moves({ verbose: true });
    if (!moves.length) return null;
    var scored = moves.map(function (m) {
      game.move(m);
      var threat = 0;
      game.moves({ verbose: true }).forEach(function (r) {
        var c = r.captured ? (VALUE[r.captured] || 0) : 0;
        if (c > threat) threat = c;
      });
      game.undo();
      // risico (wat de tegenstander hierna gratis kan pakken) + kleine voorkeur
      // voor rustige zetten, zodat de bot niet zomaar stukken van het kind pakt.
      return { m: m, score: threat + (m.captured ? 0.3 : 0) };
    });
    var min = Infinity;
    scored.forEach(function (s) { if (s.score < min) min = s.score; });
    var best = scored.filter(function (s) { return s.score === min; }).map(function (s) { return s.m; });
    return pickRandom(best);
  }

  // niveau 2: mat, anders soms gratis materiaal, anders rustig willekeurig
  function chooseLevel2(game) {
    var moves = game.moves({ verbose: true });
    if (!moves.length) return null;
    var mate = findMate(game, moves);
    if (mate) return mate;

    var best = [], bestScore = 0;
    moves.forEach(function (m) {
      var score = m.captured ? VALUE[m.captured] || 0 : 0;
      if (score > bestScore) { bestScore = score; best = [m]; }
      else if (score === bestScore && score > 0) best.push(m);
    });
    if (best.length && Math.random() < 0.75) return pickRandom(best);
    return pickRandom(moves);
  }

  // niveau 3: kijkt één zet vooruit. Pakt materiaal, vermijdt het
  // weggeven van eigen stukken en geeft graag schaak, maar blundert ~1 op 4.
  function chooseLevel3(game) {
    var moves = game.moves({ verbose: true });
    if (!moves.length) return null;

    var mate = findMate(game, moves);
    if (mate) return mate;

    // af en toe een fout, zodat het kind kansen houdt
    if (Math.random() < 0.25) return pickRandom(moves);

    var scored = moves.map(function (m) {
      var gain = m.captured ? (VALUE[m.captured] || 0) : 0;
      game.move(m);
      var givesCheck = game.in_check();
      // het zwaarste stuk dat de tegenstander hierna gratis kan terugpakken
      var replies = game.moves({ verbose: true });
      var threat = 0;
      for (var j = 0; j < replies.length; j++) {
        var c = replies[j].captured ? (VALUE[replies[j].captured] || 0) : 0;
        if (c > threat) threat = c;
      }
      game.undo();
      return { m: m, val: gain - threat + (givesCheck ? 0.5 : 0) };
    });

    var top = -Infinity;
    scored.forEach(function (s) { if (s.val > top) top = s.val; });
    var bestMoves = scored.filter(function (s) { return s.val === top; }).map(function (s) { return s.m; });
    return pickRandom(bestMoves);
  }

  // niveau 4: de zwakste stand van Stockfish (valt terug op niveau 3 als
  // de engine niet beschikbaar is)
  function chooseLevel4(game) {
    if (!window.Engine || !window.Engine.isAvailable()) {
      return Promise.resolve(chooseLevel3(game));
    }
    return window.Engine.bestMove(game.fen(), { elo: 1350, movetime: 150, timeout: 4000 })
      .then(function (mv) { return mv || chooseLevel3(game); });
  }

  // chooseMove(game, level) -> Promise<{from,to,...}|null>
  function chooseMove(game, level) {
    level = level || 1;
    if (level >= 4) return chooseLevel4(game);
    if (level === 3) return Promise.resolve(chooseLevel3(game));
    if (level === 2) return Promise.resolve(chooseLevel2(game));
    return Promise.resolve(chooseLevel1(game));
  }

  window.Bot = { chooseMove: chooseMove };
})();
