/* =================================================================
   Mascotte — "Hinnik" het pratende schaakpaardje
   Tekent het figuurtje (SVG), praat via Speech en beweegt mee.
   Modules praten met Paardje.say(...) en krijgen een Promise terug
   die klaar is zodra het zinnetje is uitgesproken.
   ================================================================= */
(function () {
  "use strict";

  // Een vriendelijk, warm paardenkopje. Onderdelen hebben ids/classes
  // zodat de CSS ze kan laten praten, knipperen en juichen.
  function svgMarkup() {
    return '' +
'<svg class="mascot-svg" viewBox="0 0 240 230" xmlns="http://www.w3.org/2000/svg">' +
  '<g class="mascot-body">' +
    // sterretjes voor het juichen
    '<g fill="#ffd65c">' +
      '<path class="m-spark s1" d="M40 40 l5 12 12 5 -12 5 -5 12 -5 -12 -12 -5 12 -5z"/>' +
      '<path class="m-spark s2" d="M205 55 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4z"/>' +
      '<path class="m-spark s3" d="M195 150 l4 9 9 4 -9 4 -4 9 -4 -9 -9 -4 9 -4z"/>' +
    '</g>' +
    // manen achter de kop
    '<path d="M70 60 q-22 -6 -26 18 q-16 4 -10 26 q-16 10 -4 28 q-10 16 8 22 l40 -20 z" fill="#c9863f"/>' +
    // oren
    '<path d="M78 52 q-6 -34 18 -40 q10 18 4 44 z" fill="#e6a866"/>' +
    '<path d="M150 50 q12 -32 34 -30 q2 22 -16 42 z" fill="#e6a866"/>' +
    '<path d="M84 54 q-3 -22 11 -28 q5 12 2 28 z" fill="#f4a6a0"/>' +
    '<path d="M152 52 q9 -20 24 -20 q0 14 -12 28 z" fill="#f4a6a0"/>' +
    // kop (groot, rond, warm)
    '<path d="M70 92 q4 -56 62 -56 q58 0 58 58 q0 30 -16 50 q-10 38 -46 38 q-30 0 -42 -28 q-18 -28 -16 -62 z" fill="#eaab68"/>' +
    // snuit (lichter)
    '<path d="M92 150 q4 34 36 34 q34 0 40 -34 q-2 -22 -38 -22 q-34 0 -38 22 z" fill="#f6d3ad"/>' +
    // wangen-blos
    '<circle cx="92" cy="148" r="11" fill="#f7a6a0" opacity=".7"/>' +
    '<circle cx="170" cy="146" r="11" fill="#f7a6a0" opacity=".7"/>' +
    // ogen
    '<g>' +
      '<ellipse cx="106" cy="106" rx="15" ry="17" fill="#fff"/>' +
      '<ellipse cx="156" cy="104" rx="15" ry="17" fill="#fff"/>' +
      '<circle cx="109" cy="109" r="8" fill="#3a2a1e"/>' +
      '<circle cx="158" cy="107" r="8" fill="#3a2a1e"/>' +
      '<circle cx="112" cy="106" r="2.6" fill="#fff"/>' +
      '<circle cx="161" cy="104" r="2.6" fill="#fff"/>' +
      // ooglid voor het knipperen
      '<rect class="m-eye-lid" x="91" y="89" width="30" height="20" rx="9" fill="#eaab68"/>' +
      '<rect class="m-eye-lid" x="141" y="87" width="30" height="20" rx="9" fill="#eaab68"/>' +
    '</g>' +
    // neusgaten
    '<ellipse cx="118" cy="156" rx="4.5" ry="6" fill="#b5743f"/>' +
    '<ellipse cx="146" cy="155" rx="4.5" ry="6" fill="#b5743f"/>' +
    // mond (beweegt tijdens het praten)
    '<ellipse class="m-mouth" cx="132" cy="172" rx="17" ry="9" fill="#9a4b3b"/>' +
    '<ellipse class="m-mouth" cx="132" cy="170" rx="9" ry="4" fill="#f4a6a0" opacity=".8"/>' +
    // voorlokje
    '<path d="M120 40 q-10 14 -2 30 q10 -8 18 -2 q-2 -18 -16 -28z" fill="#c9863f"/>' +
    // ===== accessoires (verkleedspullen) — standaard verborgen, CSS toont de gekozen =====
    '<g class="m-accessory">' +
      // kroon
      '<g class="acc acc-kroon">' +
        '<path d="M88 50 L96 22 L114 42 L131 16 L148 42 L166 22 L174 50 Q131 60 88 50 Z" fill="#ffcf5c" stroke="#e0951f" stroke-width="3" stroke-linejoin="round"/>' +
        '<circle cx="96" cy="24" r="4" fill="#ff7a59"/>' +
        '<circle cx="131" cy="18" r="5" fill="#ef5b3c"/>' +
        '<circle cx="166" cy="24" r="4" fill="#ff7a59"/>' +
      '</g>' +
      // strik
      '<g class="acc acc-strik">' +
        '<path d="M131 42 L104 30 L104 56 Z" fill="#ff7a59" stroke="#ef5b3c" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<path d="M131 42 L158 30 L158 56 Z" fill="#ff7a59" stroke="#ef5b3c" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<circle cx="131" cy="43" r="7" fill="#ef5b3c"/>' +
      '</g>' +
      // bril
      '<g class="acc acc-bril" fill="none" stroke="#3a2a1e" stroke-width="4">' +
        '<circle cx="106" cy="106" r="20"/>' +
        '<circle cx="156" cy="105" r="20"/>' +
        '<path d="M126 104 q5 -5 10 0"/>' +
        '<path d="M86 103 l-12 -5"/>' +
        '<path d="M176 102 l12 -4"/>' +
      '</g>' +
      // feesthoed
      '<g class="acc acc-feesthoed">' +
        '<path d="M131 4 L106 54 L156 54 Z" fill="#5cb8ff" stroke="#2b8fd6" stroke-width="3" stroke-linejoin="round"/>' +
        '<circle cx="131" cy="7" r="6" fill="#ffcf5c"/>' +
        '<circle cx="124" cy="34" r="3.5" fill="#fff"/>' +
        '<circle cx="137" cy="45" r="3.5" fill="#fff"/>' +
      '</g>' +
      // bloem
      '<g class="acc acc-bloem">' +
        '<g fill="#ff9ec7">' +
          '<circle cx="84" cy="32" r="8"/><circle cx="72" cy="42" r="8"/><circle cx="96" cy="42" r="8"/><circle cx="78" cy="54" r="8"/><circle cx="90" cy="54" r="8"/>' +
        '</g>' +
        '<circle cx="84" cy="44" r="7" fill="#ffd65c"/>' +
      '</g>' +
      // toverhoed
      '<g class="acc acc-toverhoed">' +
        '<ellipse cx="131" cy="52" rx="44" ry="9" fill="#6b4fa0"/>' +
        '<path d="M131 4 L112 52 L150 52 Z" fill="#7d5fc0" stroke="#5a3f95" stroke-width="3" stroke-linejoin="round"/>' +
        '<path d="M128 24 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" fill="#ffd65c"/>' +
      '</g>' +
    '</g>' +
  '</g>' +
'</svg>';
  }

  function Mascotte() {
    this.roots = [];      // alle DOM-plekken waar het paardje getoond wordt
    this.active = null;   // het paardje in het dok (de prater)
    this.boardForPoint = null;
    this._cheerTimer = null;
    this._nudgeTimer = null;
    this.outfit = "";     // welk accessoire Hinnik draagt
  }

  Mascotte.prototype.mount = function (el, isActive) {
    if (!el) return;
    el.innerHTML = svgMarkup();
    var svg = el.querySelector(".mascot-svg");
    if (this.outfit) svg.classList.add("wear-" + this.outfit);
    this.roots.push(svg);
    if (isActive) this.active = svg;
  };

  // Hinnik een accessoire opzetten (of "" voor niets). Werkt op alle plekken.
  Mascotte.prototype.setOutfit = function (id) {
    this.outfit = id || "";
    var want = this.outfit ? "wear-" + this.outfit : null;
    this._eachSvg(function (svg) {
      var remove = [];
      svg.classList.forEach(function (c) { if (c.indexOf("wear-") === 0) remove.push(c); });
      remove.forEach(function (c) { svg.classList.remove(c); });
      if (want) svg.classList.add(want);
    });
  };
  Mascotte.prototype.getOutfit = function () { return this.outfit; };

  Mascotte.prototype._eachSvg = function (cb) { this.roots.forEach(cb); };

  Mascotte.prototype.bindSpeech = function () {
    var self = this;
    Speech.on("start", function () { self._setTalking(true); });
    Speech.on("end", function () { self._setTalking(false); });
  };

  Mascotte.prototype._setTalking = function (on) {
    this._eachSvg(function (svg) { svg.classList.toggle("talking", on); });
  };

  // say(): spreekt uit én geeft een Promise terug die klaar is bij het einde.
  Mascotte.prototype.say = function (text, opts) {
    opts = opts || {};
    var self = this;
    if (opts.mood === "happy") this.cheer();
    if (opts.mood === "think") this.nudge();
    return new Promise(function (resolve) {
      Speech.speak(text, {
        remember: opts.remember !== false,
        onEnd: function () { resolve(); }
      });
    });
  };

  Mascotte.prototype.replay = function () { Speech.replay(); };

  Mascotte.prototype.cheer = function () {
    var self = this;
    if (window.Snd) Snd.effect("goed");
    if (this._cheerTimer) clearTimeout(this._cheerTimer);
    this._eachSvg(function (svg) { svg.classList.remove("cheer"); void svg.offsetWidth; svg.classList.add("cheer"); });
    this._cheerTimer = setTimeout(function () {
      self._eachSvg(function (svg) { svg.classList.remove("cheer"); });
    }, 800);
  };

  Mascotte.prototype.nudge = function () {
    var self = this;
    if (this._nudgeTimer) clearTimeout(this._nudgeTimer);
    this._eachSvg(function (svg) { svg.classList.remove("nudge"); void svg.offsetWidth; svg.classList.add("nudge"); });
    this._nudgeTimer = setTimeout(function () {
      self._eachSvg(function (svg) { svg.classList.remove("nudge"); });
    }, 750);
  };

  // wijzen naar een vakje: het bord toont een stuiterende hand op dat veld.
  Mascotte.prototype.point = function (square) {
    if (window.Board) window.Board.pointAt(square);
    this.nudge();
  };
  Mascotte.prototype.stopPointing = function () {
    if (window.Board) window.Board.clearPointer();
  };

  window.Paardje = new Mascotte();
})();
