/* =================================================================
   App — knoopt alles aan elkaar: schermen, geluidsknop, ouder-
   instellingen, voortgang en het verloop van elke les.
   ================================================================= */
(function () {
  "use strict";

  var App = {
    settings: { sound: true, recorded: true, voicePack: "fenna", rate: 1.0, difficulty: 1, voiceURI: null },
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
    Modules.list.forEach(function (mod, i) {
      var card = document.createElement("button");
      card.type = "button";
      card.className = "menu-card"
        + (mod.id === "play" ? " wide play-card" : "")
        + (mod.id === "puzzles" ? " wide puzzle-card" : "");
      if (App.progress[mod.id]) card.classList.add("done");
      card.innerHTML =
        '<span class="card-num">' + (i + 1) + '</span>' +
        '<span class="card-emoji">' + mod.emoji + '</span>' +
        '<span class="card-label">' + mod.title + '</span>';
      card.addEventListener("click", function () { startModule(mod); });
      grid.appendChild(card);
    });
    updateStarCount();
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

    setupParentButton();

    // instellingen
    $("set-close").addEventListener("click", closeSettings);
    $("settings").addEventListener("click", function (e) { if (e.target === $("settings")) closeSettings(); });
    $("set-sound").addEventListener("click", function () {
      setSound(!App.settings.sound);
      if (App.settings.sound) Speech.preview("Het geluid staat weer aan!");
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
      if (text) { span.textContent = text; bubble.classList.add("show"); }
      else { bubble.classList.remove("show"); }
    });
  }

  /* ---------- start (ontgrendelt geluid) ---------- */
  function onStart() {
    document.body.classList.add("app-started"); // verberg de SEO-tekst tijdens het spelen
    Speech.unlock();
    Speech.setEnabled(App.settings.sound);
    Speech.setRate(App.settings.rate);
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
