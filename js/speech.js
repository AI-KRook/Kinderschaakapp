/* =================================================================
   Speech — praat hardop in het Nederlands.

   Twee bronnen, in deze volgorde:
   1. Vooraf opgenomen neurale stem (mp3 in audio/, zie audio/manifest.json).
      Mooie, natuurlijke Nederlandse stem. Volledig offline, geen tracking.
   2. Web Speech API (SpeechSynthesis) als terugval voor zinnen zonder opname
      of als de ouder de toestel-stem verkiest.

   Houdt rekening met de iOS Safari valkuilen:
   - geluid pas na een tik   -> unlock() bij de eerste gebruikersactie
   - stemmen laden vertraagd  -> wacht op 'voiceschanged' (voor de terugval)
   - lange zinnen afgekapt     -> knip in stukjes (alleen bij de terugval)
   - duidelijke aan/uit-knop  -> setEnabled + visuele status
   ================================================================= */
(function () {
  "use strict";

  var synth = window.speechSynthesis || null;
  var synthSupported = !!synth && typeof window.SpeechSynthesisUtterance === "function";

  var AUDIO_BASE = "audio/";
  var SILENT = AUDIO_BASE + "_silent.wav";

  var audioEl = null;
  try {
    audioEl = new Audio();
    audioEl.preload = "auto";
    audioEl.src = SILENT;       // alvast klaarzetten voor het ontgrendelen
    if ("preservesPitch" in audioEl) audioEl.preservesPitch = true;
    audioEl.mozPreservesPitch = true;
    audioEl.webkitPreservesPitch = true;
  } catch (e) { audioEl = null; }

  var state = {
    enabled: true,
    useRecorded: true,
    rate: 1.0,
    pitch: 1.12,
    voice: null,
    voiceURI: null,
    voices: [],
    voicePack: "fenna",   // gekozen opgenomen stem
    voicePacks: [],       // beschikbare opgenomen stemmen (uit voices.json)
    audioMap: null,       // { genormaliseerde tekst: bestandsnaam }
    unlocked: false,
    speaking: false,
    lastMessage: "",
    queue: [],
    token: 0
  };

  var listeners = { start: [], end: [], voices: [], text: [], voicepacks: [] };
  function emit(name, arg) { listeners[name].forEach(function (fn) { try { fn(arg); } catch (e) {} }); }

  function norm(s) { return String(s).replace(/\s+/g, " ").trim().toLowerCase(); }

  /* ---------- opgenomen stemmen laden ---------- */
  function packDir() { return AUDIO_BASE + state.voicePack + "/"; }

  function loadVoices() {
    fetch(AUDIO_BASE + "voices.json").then(function (r) {
      return r.ok ? r.json() : null;
    }).then(function (list) {
      if (Array.isArray(list) && list.length) {
        state.voicePacks = list;
        if (!list.some(function (v) { return v.id === state.voicePack; })) state.voicePack = list[0].id;
      }
      emit("voicepacks");
      loadManifest();
    }).catch(function () { loadManifest(); });
  }

  function loadManifest() {
    state.audioMap = null;
    fetch(packDir() + "manifest.json").then(function (r) {
      return r.ok ? r.json() : null;
    }).then(function (map) {
      if (map && typeof map === "object") state.audioMap = map;
    }).catch(function () { /* geen opnames: we vallen terug op de toestel-stem */ });
  }

  function setVoicePack(id) {
    if (!id) return;
    state.voicePack = id;
    loadManifest();
  }

  function fileFor(text) {
    if (!state.useRecorded || !state.audioMap || !audioEl) return null;
    return state.audioMap[norm(text)] || null;
  }

  /* ---------- stemmen kiezen (voor de terugval) ---------- */
  function pickVoice() {
    if (!synthSupported) return;
    var list = synth.getVoices() || [];
    state.voices = list;
    if (!list.length) return;
    var chosen = null;
    if (state.voiceURI) chosen = list.find(function (v) { return v.voiceURI === state.voiceURI; });
    if (!chosen) chosen = list.find(function (v) { return /^nl[-_]NL/i.test(v.lang); });
    if (!chosen) chosen = list.find(function (v) { return /^nl/i.test(v.lang); });
    state.voice = chosen || null;
    emit("voices");
  }

  function init() {
    loadVoices();
    if (synthSupported) {
      pickVoice();
      if (typeof synth.addEventListener === "function") synth.addEventListener("voiceschanged", pickVoice);
      else synth.onvoiceschanged = pickVoice;
      var tries = 0;
      var iv = setInterval(function () {
        tries++;
        pickVoice();
        if (state.voices.length || tries > 20) clearInterval(iv);
      }, 250);
    }
  }

  /* ---------- ontgrendelen (iOS vereist een gebruikersactie) ---------- */
  function unlock() {
    if (state.unlocked) return;
    state.unlocked = true;
    // het audio-element ontgrendelen met een kort stil fragment
    if (audioEl) {
      try {
        audioEl.src = SILENT;
        var p = audioEl.play();
        if (p && p.then) p.then(function () { try { audioEl.pause(); } catch (e) {} }).catch(function () {});
      } catch (e) {}
    }
    // ook de SpeechSynthesis ontgrendelen
    if (synthSupported) {
      try {
        var u = new SpeechSynthesisUtterance(" ");
        u.volume = 0;
        synth.speak(u); synth.cancel();
      } catch (e) {}
    }
  }

  /* ---------- tekst in stukjes knippen (alleen voor de terugval) ---------- */
  function chunk(text) {
    var clean = norm(text);
    if (!clean) return [];
    var rough = String(text).replace(/\s+/g, " ").trim().match(/[^.!?]+[.!?]*/g) || [text];
    var out = [];
    rough.forEach(function (s) {
      s = s.trim();
      if (!s) return;
      if (s.length <= 140) { out.push(s); return; }
      var buf = "";
      s.split(/,\s*/).forEach(function (p) {
        if ((buf + " " + p).trim().length > 140) { if (buf) out.push(buf.trim()); buf = p; }
        else buf = (buf ? buf + ", " : "") + p;
      });
      if (buf) out.push(buf.trim());
    });
    return out.filter(Boolean);
  }

  var keepAlive = null;
  function startKeepAlive() {
    stopKeepAlive();
    keepAlive = setInterval(function () {
      if (synth && synth.speaking && !synth.paused) { try { synth.pause(); synth.resume(); } catch (e) {} }
    }, 9000);
  }
  function stopKeepAlive() { if (keepAlive) { clearInterval(keepAlive); keepAlive = null; } }

  /* ---------- het hart: spreek een bericht uit ---------- */
  function speak(text, opts) {
    opts = opts || {};
    if (opts.remember !== false) state.lastMessage = text;
    cancel(true);
    var myToken = ++state.token;

    if (!state.enabled) { timedFallback(text, myToken, opts); return; }

    var file = fileFor(text);
    if (file) { playRecorded(file, text, myToken, opts); return; }
    if (synthSupported) { speakSynth(text, myToken, opts); return; }
    timedFallback(text, myToken, opts);
  }

  // 1) opgenomen mp3 afspelen
  function playRecorded(file, text, myToken, opts) {
    state.speaking = true;
    emit("start"); emit("text", text);
    var done = function () {
      if (myToken !== state.token) return;
      audioEl.onended = null; audioEl.onerror = null;
      state.speaking = false;
      emit("text", ""); emit("end");
      if (typeof opts.onEnd === "function") opts.onEnd();
    };
    audioEl.onended = done;
    audioEl.onerror = function () { if (myToken === state.token) speakSynth(text, myToken, opts); };
    try {
      audioEl.src = packDir() + file;
      audioEl.playbackRate = Math.max(0.6, Math.min(1.6, state.rate));
      if ("preservesPitch" in audioEl) audioEl.preservesPitch = true;
      var p = audioEl.play();
      if (p && p.catch) p.catch(function () { if (myToken === state.token) speakSynth(text, myToken, opts); });
    } catch (e) {
      speakSynth(text, myToken, opts);
    }
  }

  // 2) terugval: Web Speech API (in stukjes)
  function speakSynth(text, myToken, opts) {
    if (!synthSupported) { timedFallback(text, myToken, opts); return; }
    var pieces = chunk(text);
    if (!pieces.length) { timedFallback(text, myToken, opts); return; }
    state.queue = pieces.slice();
    state.speaking = true;
    emit("start"); emit("text", text);
    startKeepAlive();
    function next() {
      if (myToken !== state.token) return;
      if (!state.queue.length) {
        state.speaking = false; stopKeepAlive();
        emit("text", ""); emit("end");
        if (typeof opts.onEnd === "function") opts.onEnd();
        return;
      }
      var u = new SpeechSynthesisUtterance(state.queue.shift());
      u.lang = (state.voice && state.voice.lang) || "nl-NL";
      if (state.voice) u.voice = state.voice;
      u.rate = Math.max(0.6, Math.min(1.4, state.rate));
      u.pitch = state.pitch;
      u.onend = function () { setTimeout(next, 110); };
      u.onerror = function () { setTimeout(next, 110); };
      try { synth.speak(u); } catch (e) { setTimeout(next, 110); }
    }
    setTimeout(next, 90);
  }

  // 3) geen geluid (gedempt of niets beschikbaar): wel de tekstballon, en de les laten doorlopen
  function timedFallback(text, myToken, opts) {
    emit("start"); emit("text", text);
    state.speaking = true;
    var delay = Math.min(6000, Math.max(1200, (text || "").length * 55));
    setTimeout(function () {
      if (myToken !== state.token) return;
      state.speaking = false;
      emit("text", ""); emit("end");
      if (typeof opts.onEnd === "function") opts.onEnd();
    }, delay);
  }

  function replay() { if (state.lastMessage) speak(state.lastMessage, { remember: false }); }

  function cancel(silent) {
    state.token++;
    state.queue = [];
    state.speaking = false;
    stopKeepAlive();
    if (audioEl) { try { audioEl.onended = null; audioEl.onerror = null; audioEl.pause(); } catch (e) {} }
    if (synthSupported) { try { synth.cancel(); } catch (e) {} }
    emit("text", "");
    if (!silent) emit("end");
  }

  /* ---------- instellingen ---------- */
  function setEnabled(on) { state.enabled = !!on; if (!state.enabled) cancel(true); }
  function setRate(r) { state.rate = Math.max(0.6, Math.min(1.4, Number(r) || 1.0)); }
  function setVoiceURI(uri) { state.voiceURI = uri || null; pickVoice(); }
  function setUseRecorded(on) { state.useRecorded = !!on; }

  /* ---------- API ---------- */
  window.Speech = {
    init: init,
    unlock: unlock,
    speak: speak,
    replay: replay,
    cancel: cancel,
    isSpeaking: function () { return state.speaking; },
    isEnabled: function () { return state.enabled; },
    isSupported: function () { return synthSupported || !!state.audioMap; },
    hasRecorded: function () { return !!state.audioMap; },
    isUsingRecorded: function () { return state.useRecorded && !!state.audioMap; },
    setUseRecorded: setUseRecorded,
    getVoicePacks: function () { return state.voicePacks.slice(); },
    getVoicePack: function () { return state.voicePack; },
    setVoicePack: setVoicePack,
    setEnabled: setEnabled,
    setRate: setRate,
    getRate: function () { return state.rate; },
    getVoices: function () { return state.voices.slice(); },
    getVoice: function () { return state.voice; },
    setVoiceURI: setVoiceURI,
    on: function (name, fn) { if (listeners[name]) listeners[name].push(fn); }
  };
})();
