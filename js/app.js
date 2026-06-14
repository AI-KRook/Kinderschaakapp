/* =================================================================
   App — knoopt alles aan elkaar: schermen, geluidsknop, ouder-
   instellingen, voortgang en het verloop van elke les.
   ================================================================= */
(function () {
  "use strict";

  var App = {
    settings: { sound: true, recorded: true, music: true, voicePack: "fenna", rate: 1.0, difficulty: 1, voiceURI: null },
    progress: {},
    _runToken: 0,
    _run: null
  };
  window.App = App;

  var $ = function (id) { return document.getElementById(id); };

  /* ---------- opslag ---------- */
  function loadStore() {
    try {
      var s = JSON.parse(localStorage.getItem("hinnik_settings") || "{}");
      Object.assign(App.settings, s);
    } catch (e) {}
    try { App.progress = JSON.parse(localStorage.getItem("hinnik_progress") || "{}"); } catch (e) { App.progress = {}; }
  }
  function saveSettings() { try { localStorage.setItem("hinnik_settings", JSON.stringify(App.settings)); } catch (e) {} }
  function saveProgress() { try { localStorage.setItem("hinnik_progress", JSON.stringify(App.progress)); } catch (e) {} }

  // sterren verzamelen (spel-element dat het kind motiveert te blijven spelen)
  function addStar() {
    App.progress.stars = (App.progress.stars || 0) + 1;
    saveProgress();
    updateStarCount();
    if (window.Snd) Snd.effect("ster");
    // net genoeg sterren voor een nieuw verkleedspulletje? vier het!
    if (typeof OUTFITS !== "undefined" && OUTFITS.some(function (o) { return o.cost === App.progress.stars; })) {
      celebrate();
      if (window.Paardje) Paardje.cheer();
      Speech.speak("Hoera! Je hebt iets nieuws verdiend voor de verkleedkast!", { remember: false });
    }
  }
  function updateStarCount() {
    var el = $("star-count");
    if (el) el.textContent = String(App.progress.stars || 0);
  }

  /* ---------- verkleedkast: Hinnik aankleden met gespaarde sterren ---------- */
  var OUTFITS = [
    { id: "kroon",     naam: "Kroon",     emoji: "👑", cost: 3 },
    { id: "strik",     naam: "Strik",     emoji: "🎀", cost: 6 },
    { id: "bril",      naam: "Bril",      emoji: "🤓", cost: 10 },
    { id: "feesthoed", naam: "Feesthoed", emoji: "🎉", cost: 15 },
    { id: "bloem",     naam: "Bloem",     emoji: "🌸", cost: 22 },
    { id: "toverhoed", naam: "Toverhoed", emoji: "🧙", cost: 30 }
  ];
  var _wardrobeMounted = false;

  function openWardrobe() {
    buildWardrobe();
    var w = $("wardrobe");
    w.classList.add("is-open");
    w.setAttribute("aria-hidden", "false");
  }
  function closeWardrobe() {
    Speech.stopPreview();
    var w = $("wardrobe");
    w.classList.remove("is-open");
    w.setAttribute("aria-hidden", "true");
  }
  function buildWardrobe() {
    var prev = $("wardrobe-mascot");
    if (prev && !_wardrobeMounted) { Paardje.mount(prev, false); _wardrobeMounted = true; }
    Paardje.setOutfit(App.progress.outfit || "");
    var grid = $("wardrobe-grid");
    if (!grid) return;
    grid.innerHTML = "";
    var stars = App.progress.stars || 0;
    var current = App.progress.outfit || "";
    grid.appendChild(makeWearItem({ id: "", naam: "Niets", emoji: "🚫", cost: 0 }, true, current === ""));
    OUTFITS.forEach(function (o) {
      grid.appendChild(makeWearItem(o, stars >= o.cost, current === o.id));
    });
  }
  function makeWearItem(o, unlocked, on) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "wear-item" + (on ? " is-on" : "") + (unlocked ? "" : " locked");
    b.innerHTML = '<span class="wi-emoji">' + o.emoji + '</span>' +
      '<span>' + o.naam + '</span>' +
      (unlocked ? "" : '<span class="wi-cost">⭐ ' + o.cost + '</span>');
    b.addEventListener("click", function () {
      if (!unlocked) { Speech.preview("Spaar nog meer sterren, dan mag je deze op!"); return; }
      equipOutfit(o.id);
    });
    return b;
  }
  function equipOutfit(id) {
    App.progress.outfit = id;
    saveProgress();
    Paardje.setOutfit(id);
    Paardje.cheer();
    buildWardrobe();
    if (id) Speech.preview("Kijk eens, wat zie ik er mooi uit!");
  }

  /* ---------- voortgang & tips voor de ouder ---------- */
  var LESSON_INFO = {
    board:     { leert: "Kennismaken met de 64 vakjes van het bord.", tip: "Laat je kind gerust een paar keer tikken; herhaling helpt." },
    pieces:    { leert: "Hoe elk stuk loopt: toren, loper, paard, dame, koning en pion.", tip: "Vraag thuis: hoe loopt de toren? Zo blijft het hangen." },
    capture:   { leert: "Stukken van de tegenstander pakken, ook de bijzondere en-passant-slag.", tip: "Speel een slag na met echte stukken op tafel." },
    smartcapture: { leert: "Hoe sterk elk stuk is (de stukwaarden) en slim slaan: gratis stukken pakken, het sterkste kiezen, en terugslaan.", tip: "Vraag thuis: wat is meer waard, de toren of de loper?" },
    checkmate: { leert: "De koning aanvallen (schaak), vangen (mat), de drie manieren om uit schaak te komen, en rokeren.", tip: "Wijs samen aan waar de koning nog naartoe kan." },
    matework:  { leert: "Schaak herkennen, zelf uit schaak komen, matpatronen (twee torens, achterste rij, dame), pat herkennen, en de en-passant-slag.", tip: "Vraag: staat de koning schaak? En hoe kom je eruit?" },
    opening:   { leert: "Goed beginnen: een pion in het midden, je stukken naar buiten, en rokeren.", tip: "Laat je kind elke partij zo beginnen." },
    openingsmart: { leert: "Slim openen: het centrum beheersen, alle stukken ontwikkelen, niet hetzelfde stuk twee keer, de dame niet te vroeg, en op tijd rokeren.", tip: "Vraag waarom je de dame niet meteen ver naar voren zet." },
    endgame:   { leert: "De koning sterk gebruiken in het eindspel: de oppositie, een actieve koning, en een pion naar de overkant brengen.", tip: "Oefen samen het allerlaatste zetje." },
    endgamemate: { leert: "De kale koning matzetten met de dame en met de toren, het vierkant van de pion, en een pion naar dame brengen met koningssteun.", tip: "Oefen samen het matzetje met dame of toren." },
    puzzles:   { leert: "Slimme zetten herkennen: gratis stuk pakken, de vork, de spies, aftrekschaak en mat in één.", tip: "Eén puzzel per keer is genoeg; vier elk sterretje." },
    play:      { leert: "Een hele partij spelen tegen de computer, met of zonder hints.", tip: "Begin op het makkelijkste niveau, zodat je kind kan winnen." }
  };
  function rankName(done) {
    if (done >= 12) return "Schaakkampioen";
    if (done >= 9) return "Schaakridder";
    if (done >= 6) return "Torenwachter";
    if (done >= 3) return "Pionnetje";
    return "Net begonnen";
  }
  function buildParentInfo() {
    var total = Modules.list.length;
    var done = Modules.list.filter(function (m) { return App.progress[m.id]; }).length;
    var stars = App.progress.stars || 0;
    $("parentinfo-summary").innerHTML =
      '<div class="pi-stat"><span class="pi-big">' + done + " / " + total + '</span><span class="pi-cap">lessen gedaan</span></div>' +
      '<div class="pi-stat"><span class="pi-big">' + stars + '</span><span class="pi-cap">sterren</span></div>' +
      '<div class="pi-stat"><span class="pi-big">' + rankName(done) + '</span><span class="pi-cap">niveau</span></div>';
    var list = $("parentinfo-list");
    list.innerHTML = "";
    Modules.list.forEach(function (m) {
      var info = LESSON_INFO[m.id] || { leert: "", tip: "" };
      var d = !!App.progress[m.id];
      var row = document.createElement("div");
      row.className = "pi-row" + (d ? " done" : "");
      row.innerHTML =
        '<div class="pi-head"><span class="pi-emoji">' + m.emoji + '</span>' +
        '<span class="pi-title">' + m.title + '</span>' +
        '<span class="pi-check">' + (d ? "⭐" : "") + '</span></div>' +
        '<p class="pi-leert">' + info.leert + '</p>' +
        '<p class="pi-tip">Tip: ' + info.tip + '</p>';
      list.appendChild(row);
    });
  }
  function openParentInfo() {
    buildParentInfo();
    var w = $("parentinfo");
    w.classList.add("is-open");
    w.setAttribute("aria-hidden", "false");
  }
  function closeParentInfo() {
    var w = $("parentinfo");
    w.classList.remove("is-open");
    w.setAttribute("aria-hidden", "true");
  }

  /* ---------- schermen ---------- */
  function showScreen(name) {
    ["screen-start", "screen-menu", "screen-lesson"].forEach(function (id) {
      $(id).classList.toggle("is-active", id === "screen-" + name);
    });
    $("dock").classList.toggle("is-visible", name !== "start");
  }

  /* ---------- menu opbouwen ---------- */
  function buildMenu() {
    var grid = $("menu-grid");
    grid.innerHTML = "";
    // de huidige halte = de eerste les die nog niet gedaan is
    var currentIdx = Modules.list.findIndex(function (m) { return !App.progress[m.id]; });
    Modules.list.forEach(function (mod, i) {
      var done = !!App.progress[mod.id];
      var node = document.createElement("button");
      node.type = "button";
      node.className = "path-node" + (done ? " done" : "") + (i === currentIdx ? " current" : "");
      node.setAttribute("aria-label", mod.title + (done ? ", klaar" : ""));
      node.innerHTML =
        '<span class="path-dot"><span class="path-emoji">' + mod.emoji + '</span></span>' +
        '<span class="path-label">' + mod.title + '</span>';
      node.addEventListener("click", function () { startModule(mod); });
      grid.appendChild(node);
    });
    updateStarCount();
    // naar de huidige halte scrollen, zodat het kind ziet waar het gebleven is
    if (currentIdx >= 2) {
      var cur = grid.querySelector(".path-node.current");
      if (cur) requestAnimationFrame(function () {
        try { cur.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) { cur.scrollIntoView(); }
      });
    }
    maybeShowParentHint();
  }

  // eenmalige hint voor de ouder (waar de instellingen zitten)
  function maybeShowParentHint() {
    var el = $("parent-hint");
    if (!el) return;
    var seen = false;
    try { seen = localStorage.getItem("hinnik_parenthint") === "1"; } catch (e) {}
    if (seen) { el.classList.add("hidden"); return; }
    el.classList.remove("hidden");
    try { localStorage.setItem("hinnik_parenthint", "1"); } catch (e) {}
    setTimeout(function () { el.classList.add("hidden"); }, 8000);
  }

  /* ---------- de "L"-helper voor modules (met netjes afbreken) ---------- */
  function makeL(run, mod) {
    function tracked(executor) {
      return new Promise(function (resolve, reject) {
        if (run.cancelled) { reject({ cancelled: true }); return; }
        run.pending.push(reject);
        executor(function (v) { if (!run.cancelled) resolve(v); }, reject);
      });
    }
    return {
      board: window.Board,
      paardje: window.Paardje,
      say: function (text, opts) {
        opts = opts || {};
        if (opts.mood === "happy") Paardje.cheer();
        if (opts.mood === "think") Paardje.nudge();
        return tracked(function (resolve) {
          Speech.speak(text, { remember: opts.remember !== false, block: true, onEnd: resolve });
        });
      },
      blurt: function (text) { Speech.speak(text, { remember: false }); },
      wait: function (ms) { return tracked(function (resolve) { setTimeout(resolve, ms); }); },
      waitMove: function (filter) { return Board.waitForUserMove(filter); },
      waitTap: function (filter) { return Board.waitForTap(filter); },
      point: function (sq) { Paardje.point(sq); },
      unpoint: function () { Paardje.stopPointing(); },
      cheer: function () { Paardje.cheer(); },
      celebrate: function () { celebrate(); },
      star: function () { addStar(); },
      alive: function () { return !run.cancelled; },
      done: function () { onModuleDone(mod); }
    };
  }

  function cancelRun() {
    var run = App._run;
    if (run) {
      run.cancelled = true;
      run.pending.forEach(function (r) { try { r({ cancelled: true }); } catch (e) {} });
      run.pending = [];
    }
    Board.cancelWaits();
    Speech.cancel();
    Paardje.stopPointing();
  }

  function startModule(mod) {
    cancelRun();
    showScreen("lesson");
    $("lesson-title").textContent = mod.emoji + " " + mod.title;
    clearLessonActions();
    Board.clearGoals();
    Board.clearHighlights();
    Board.setFlipped(false); // standaard wit onder; alleen het partijtje draait eventueel
    // begin altijd met een leeg bord, zodat de stand van de vorige les nooit even
    // blijft staan terwijl de nieuwe module zijn intro al uitspreekt
    Board.setupCustom([], "w");
    var run = { id: ++App._runToken, cancelled: false, pending: [] };
    App._run = run;
    var L = makeL(run, mod);
    Promise.resolve().then(function () { return mod.run(L); })
      .catch(function (err) { if (!(err && err.cancelled)) console.error("Module-fout:", err); });
  }

  /* ---------- einde van een les ---------- */
  function onModuleDone(mod) {
    App.progress[mod.id] = true;
    saveProgress();
    var idx = Modules.list.findIndex(function (m) { return m.id === mod.id; });
    var next = Modules.list[idx + 1];

    var actions = $("lesson-actions");
    actions.innerHTML = "";

    var againBtn = document.createElement("button");
    againBtn.type = "button";
    againBtn.className = "big-action coral";
    againBtn.innerHTML = '<span class="ba-emoji">🔁</span> Nog een keer';
    againBtn.addEventListener("click", function () { startModule(mod); });
    actions.appendChild(againBtn);

    if (next) {
      var nextBtn = document.createElement("button");
      nextBtn.type = "button";
      nextBtn.className = "big-action green";
      nextBtn.innerHTML = '<span class="ba-emoji">▶</span> Verder';
      nextBtn.addEventListener("click", function () { startModule(next); });
      actions.appendChild(nextBtn);
    } else {
      var homeBtn = document.createElement("button");
      homeBtn.type = "button";
      homeBtn.className = "big-action sun";
      homeBtn.innerHTML = '<span class="ba-emoji">🏠</span> Naar het menu';
      homeBtn.addEventListener("click", function () { goMenu(); });
      actions.appendChild(homeBtn);
    }

    setTimeout(function () {
      if (next) Speech.speak("Tik op het groene pijltje voor het volgende spelletje. Of op de oranje knop om dit nog eens te doen.", { remember: false });
      else Speech.speak("Je hebt alles gedaan! Wat knap, zeg! Tik op het huisje om terug te gaan.", { remember: false });
    }, 900);
  }

  function clearLessonActions() { $("lesson-actions").innerHTML = ""; }

  function goMenu() {
    cancelRun();
    clearLessonActions();
    showScreen("menu");
    buildMenu();
    Speech.speak("Wat wil je nu doen? Kies maar een plaatje!", { remember: false });
  }

  /* ---------- feest / confetti ---------- */
  function celebrate() {
    if (window.Snd) Snd.effect("win");
    var layer = $("board-confetti");
    if (!layer) return;
    var colors = ["#ff7a59", "#ffcf5c", "#7fd1a6", "#9b7ede", "#5cb8ff", "#ff9ec7"];
    for (var i = 0; i < 60; i++) {
      var c = document.createElement("span");
      c.className = "confetti";
      c.style.left = Math.random() * 100 + "%";
      c.style.background = colors[Math.floor(Math.random() * colors.length)];
      c.style.animationDuration = (1.1 + Math.random() * 1.1) + "s";
      c.style.animationDelay = (Math.random() * 0.4) + "s";
      c.style.transform = "rotate(" + (Math.random() * 360) + "deg)";
      layer.appendChild(c);
      (function (el) { setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 2600); })(c);
    }
  }

  /* ---------- geluid aan/uit ---------- */
  function refreshSoundUI() {
    var muted = !App.settings.sound;
    ["sound-btn-menu", "sound-btn-lesson"].forEach(function (id) {
      var b = $(id); if (b) b.classList.toggle("is-muted", muted);
    });
    var t = $("set-sound");
    if (t) t.setAttribute("aria-pressed", String(!muted));
  }
  function setSound(on) {
    App.settings.sound = !!on;
    Speech.setEnabled(App.settings.sound);
    if (window.Snd) Snd.setFx(App.settings.sound);
    refreshSoundUI();
    saveSettings();
  }
  function toggleSound() {
    setSound(!App.settings.sound);
    if (App.settings.sound) Speech.preview("Het geluid staat weer aan!");
  }

  /* ---------- ouder-instellingen ---------- */
  function openSettings() {
    Speech.pause(); // pauzeer de lopende uitleg; bij sluiten gaat hij verder
    populateVoices();
    populateVoicePacks();
    $("set-rate").value = App.settings.rate;
    $("set-recorded").setAttribute("aria-pressed", String(App.settings.recorded !== false));
    $("set-music").setAttribute("aria-pressed", String(App.settings.music !== false));
    refreshSoundUI();
    refreshDifficultyUI();
    $("settings").classList.add("is-open");
    $("settings").setAttribute("aria-hidden", "false");
  }
  function closeSettings() {
    Speech.stopPreview();
    $("settings").classList.remove("is-open");
    $("settings").setAttribute("aria-hidden", "true");
    Speech.resume(); // ga verder met de uitleg waar hij gebleven was
  }
  function refreshDifficultyUI() {
    var wrap = $("set-difficulty");
    Array.prototype.forEach.call(wrap.querySelectorAll(".seg-btn"), function (b) {
      b.classList.toggle("is-on", Number(b.dataset.level) === App.settings.difficulty);
    });
  }
  // simpele, leesbare naam voor een toestel-stem (geen technische codes)
  function friendlyVoiceName(v) {
    var n = (v.name || "").replace(/\s*\([^)]*\)\s*/g, " ").replace(/nl[-_]?(NL|BE)/ig, " ").trim();
    if (/^nl-BE/i.test(v.lang)) n = (n ? n + " " : "") + "(Vlaams)";
    return n || v.name || "Stem";
  }

  function populateVoices() {
    var sel = $("set-voice"), row = $("voice-row");
    if (!sel) return;
    // alleen Nederlandse (en Vlaamse) stemmen tonen
    var voices = (Speech.getVoices() || []).filter(function (v) { return /^nl/i.test(v.lang); });
    if (!voices.length) {
      // geen Nederlandse stem op dit toestel: rij verbergen (de mooie stem werkt gewoon)
      if (row) row.style.display = "none";
      sel.innerHTML = "";
      return;
    }
    if (row) row.style.display = "";
    sel.innerHTML = "";
    var def = document.createElement("option");
    def.value = ""; def.textContent = "Standaard";
    sel.appendChild(def);
    voices.forEach(function (v) {
      var o = document.createElement("option");
      o.value = v.voiceURI;
      o.textContent = friendlyVoiceName(v);
      if (App.settings.voiceURI === v.voiceURI) o.selected = true;
      sel.appendChild(o);
    });
  }

  function populateVoicePacks() {
    var sel = $("set-voicepack"), row = $("voicepack-row");
    if (!sel) return;
    var packs = Speech.getVoicePacks();
    if (!packs.length) { if (row) row.style.display = "none"; return; }
    if (row) row.style.display = "";
    var current = App.settings.voicePack || Speech.getVoicePack();
    sel.innerHTML = "";
    packs.forEach(function (p) {
      var o = document.createElement("option");
      o.value = p.id;
      o.textContent = p.naam || p.id;
      if (current === p.id) o.selected = true;
      sel.appendChild(o);
    });
  }

  /* ---------- ouder-knop: lang ingedrukt houden ---------- */
  function setupParentButton() {
    var HOLD = 1200;
    Array.prototype.forEach.call(document.querySelectorAll(".parent-btn"), function (btn) {
      var fill = btn.querySelector(".parent-ring-fill");
      var raf = null, startT = 0;
      function frame(now) {
        var p = Math.min(1, (now - startT) / HOLD);
        if (fill) fill.style.setProperty("--p", (p * 360) + "deg");
        if (p >= 1) { stop(); openSettings(); return; }
        raf = requestAnimationFrame(frame);
      }
      function start(e) {
        e.preventDefault();
        btn.classList.add("holding");
        startT = performance.now();
        raf = requestAnimationFrame(frame);
      }
      function stop() {
        if (raf) cancelAnimationFrame(raf); raf = null;
        btn.classList.remove("holding");
        if (fill) fill.style.setProperty("--p", "0deg");
      }
      btn.addEventListener("pointerdown", start);
      btn.addEventListener("pointerup", stop);
      btn.addEventListener("pointerleave", stop);
      btn.addEventListener("pointercancel", stop);
    });
  }

  // laat het ballonnetje netjes passen: het groeit omhoog tot vlak onder de
  // knoppen (als die in beeld staan) en de lettergrootte wordt zo gekozen dat
  // de hele zin past. Zo wordt tekst nooit afgekapt en loopt de ballon nooit
  // over de knoppen (verder, ja/nee, kies-kleur, hint) heen.
  function fitSpeechBubble(bubble) {
    var rect = bubble.getBoundingClientRect();
    var maxH = 200; // standaard maximale hoogte
    // staan er knoppen in beeld (verder, ja/nee, kies-kleur, hint)? bereken
    // dan de vrije ruimte tussen die knoppen en de onderkant van de ballon,
    // zodat de ballon er nooit overheen groeit. Werkt met relatieve posities,
    // dus ongevoelig voor een rare viewport.
    var actions = document.getElementById("lesson-actions");
    if (actions && actions.children.length) {
      var ar = actions.getBoundingClientRect();
      if (ar.height > 0 && ar.bottom < rect.bottom) {
        maxH = Math.min(maxH, rect.bottom - ar.bottom - 12);
      }
    }
    maxH = Math.max(48, Math.round(maxH));
    bubble.style.maxHeight = maxH + "px";

    var MAX = 18, MIN = 11, size = MAX;
    bubble.style.fontSize = MAX + "px";
    while (size > MIN && bubble.scrollHeight > bubble.clientHeight) {
      size -= 1;
      bubble.style.fontSize = size + "px";
    }
  }

  /* ---------- alle knoppen koppelen ---------- */
  function wireEvents() {
    $("start-button").addEventListener("click", onStart);

    $("home-btn").addEventListener("click", goMenu);
    $("replay-btn").addEventListener("click", function () { Paardje.replay(); });

    $("sound-btn-menu").addEventListener("click", toggleSound);
    $("sound-btn-lesson").addEventListener("click", toggleSound);

    // verkleedkast
    $("wardrobe-btn").addEventListener("click", openWardrobe);
    $("wardrobe-close").addEventListener("click", closeWardrobe);
    $("wardrobe").addEventListener("click", function (e) { if (e.target === $("wardrobe")) closeWardrobe(); });

    // voortgang & tips voor de ouder
    $("set-parentinfo").addEventListener("click", openParentInfo);
    $("parentinfo-close").addEventListener("click", closeParentInfo);
    $("parentinfo").addEventListener("click", function (e) { if (e.target === $("parentinfo")) closeParentInfo(); });

    $("parent-hint").addEventListener("click", function () { this.classList.add("hidden"); });

    setupParentButton();

    // instellingen
    $("set-close").addEventListener("click", closeSettings);
    $("settings").addEventListener("click", function (e) { if (e.target === $("settings")) closeSettings(); });
    $("set-sound").addEventListener("click", function () {
      setSound(!App.settings.sound);
      if (App.settings.sound) Speech.preview("Het geluid staat weer aan!");
    });
    $("set-music").addEventListener("click", function () {
      var on = !(App.settings.music !== false);
      App.settings.music = on;
      if (window.Snd) Snd.setMusic(on);
      $("set-music").setAttribute("aria-pressed", String(on));
      saveSettings();
    });
    $("set-recorded").addEventListener("click", function () {
      App.settings.recorded = !App.settings.recorded;
      Speech.setUseRecorded(App.settings.recorded);
      $("set-recorded").setAttribute("aria-pressed", String(App.settings.recorded));
      saveSettings();
      Speech.preview(App.settings.recorded ? "Hoi! Ik ben Hinnik het paardje. Zullen we samen leren schaken?" : "Zo klinkt de stem van het toestel.");
    });
    $("set-rate").addEventListener("input", function () { App.settings.rate = Number(this.value); Speech.setRate(App.settings.rate); });
    $("set-rate").addEventListener("change", function () { saveSettings(); Speech.preview("Zo klink ik nu."); });
    $("set-difficulty").addEventListener("click", function (e) {
      var b = e.target.closest(".seg-btn"); if (!b) return;
      App.settings.difficulty = Number(b.dataset.level);
      refreshDifficultyUI(); saveSettings();
    });
    $("set-voice").addEventListener("change", function () {
      App.settings.voiceURI = this.value || null;
      Speech.setVoiceURI(App.settings.voiceURI);
      saveSettings();
      Speech.preview("Hoi! Zo klink ik.");
    });
    $("set-test").addEventListener("click", function () { Speech.preview("Hoi! Ik ben Hinnik het paardje. Zullen we samen leren schaken?"); });
    $("set-reset").addEventListener("click", function () {
      App.progress = {}; saveProgress(); buildMenu();
      Speech.preview("Klaar! We kunnen weer helemaal opnieuw beginnen.");
    });

    $("set-voicepack").addEventListener("change", function () {
      App.settings.voicePack = this.value;
      Speech.setVoicePack(this.value);
      saveSettings();
      // laat de nieuwe stem horen op het preview-kanaal (de les blijft gepauzeerd)
      setTimeout(function () { Speech.preview("Hoi! Ik ben Hinnik het paardje. Zullen we samen leren schaken?"); }, 350);
    });

    Speech.on("voices", populateVoices);
    Speech.on("voicepacks", populateVoicePacks);

    // tekstballon meeschrijven met wat Hinnik zegt (steun voor de ouder)
    Speech.on("text", function (text) {
      var bubble = $("speech-bubble"), span = $("speech-text");
      if (!bubble || !span) return;
      if (text) { span.textContent = text; bubble.classList.add("show"); fitSpeechBubble(bubble); }
      else { bubble.classList.remove("show"); }
    });
  }

  /* ---------- start (ontgrendelt geluid) ---------- */
  function onStart() {
    document.body.classList.add("app-started"); // verberg de SEO-tekst tijdens het spelen
    Speech.unlock();
    Speech.setEnabled(App.settings.sound);
    Speech.setRate(App.settings.rate);
    if (window.Snd) { Snd.unlock(); Snd.setFx(App.settings.sound); Snd.setMusic(App.settings.music !== false); }
    showScreen("menu");
    buildMenu();
    // korte testzin: ontgrendelt en verwelkomt
    setTimeout(function () {
      Speech.speak("Hoi! Ik ben Hinnik, het schaakpaardje. Wat leuk dat je er bent! Kies maar een plaatje. Dan gaan we samen schaken leren.", { remember: false });
    }, 250);
  }

  /* ---------- opstarten ---------- */
  function init() {
    loadStore();

    Paardje.mount($("start-mascot"), false);
    Paardje.mount($("dock-mascot"), true);
    Paardje.bindSpeech();
    Paardje.setOutfit(App.progress.outfit || ""); // bewaarde verkleedspullen tonen

    Board.mount($("board"));

    Speech.init();
    Speech.setEnabled(App.settings.sound);
    Speech.setUseRecorded(App.settings.recorded !== false);
    Speech.setVoicePack(App.settings.voicePack || "fenna");
    Speech.setRate(App.settings.rate);
    if (App.settings.voiceURI) Speech.setVoiceURI(App.settings.voiceURI);

    wireEvents();
    refreshSoundUI();
    showScreen("start");

    // service worker voor offline gebruik
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("sw.js").catch(function () {});
      });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
