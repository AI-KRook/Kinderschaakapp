/* =================================================================
   Bot — de computer-tegenstander
   Niveau 1: doet een willekeurige legale zet (het kind kan altijd winnen).
   Niveau 2: pakt gratis stukken en zet mat als het kan, maar blijft mild.
   ================================================================= */
(function () {
  "use strict";

  var VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

  function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  // kies een zet voor de partij; game = chess.js instance, level = 1 of 2
  function chooseMove(game, level) {
    var moves = game.moves({ verbose: true });
    if (!moves.length) return null;

    if (level <= 1) return pickRandom(moves);

    // niveau 2: eerst mat, dan gratis materiaal, anders rustig willekeurig
    for (var i = 0; i < moves.length; i++) {
      game.move(moves[i]);
      var mate = game.in_checkmate();
      game.undo();
      if (mate) return moves[i];
    }

    var best = [];
    var bestScore = 0;
    moves.forEach(function (m) {
      var score = m.captured ? VALUE[m.captured] || 0 : 0;
      if (score > bestScore) { bestScore = score; best = [m]; }
      else if (score === bestScore && score > 0) best.push(m);
    });

    // pak gratis materiaal maar lang niet altijd, zodat het kind kan winnen
    if (best.length && Math.random() < 0.75) return pickRandom(best);
    return pickRandom(moves);
  }

  window.Bot = { chooseMove: chooseMove };
})();
