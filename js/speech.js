/* =================================================================
   Speech — praat hardop in het Nederlands.

   Twee bronnen, in deze volgorde:
   1. Vooraf opgenomen neurale stem (mp3 in audio/<stem>/).
   2. Web Speech API (SpeechSynthesis) als terugval.

   Extra: een uitleg kan "blokkerend" zijn. Tikt het kind tijdens een
   blokkerende uitleg, dan maakt Hinnik de zin meteen af (skip), zodat
   het kind kan doorgaan maar niet per ongeluk te vroeg een zet doet.
   ================================================================= */
(function () {
  "use strict";

  var synth = window.speechSynthesis || null;
  var synthSupported = !!synth && typeof window.SpeechSynthesisUtterance === "function";

  var AUDIO_BASE = "audio/";
  var SILENT = AUDIO_BASE + "_silent.wav";

  var audioEl = null;
  var previewEl = null; // apart kanaal voor instellingen-geluiden (verstoort de les niet)
  try {
    audioEl = new Audio();
    audioEl.preload = "auto";
    audioEl.src = SILENT;
    if ("preservesPitch" in audioEl) audioEl.preservesPitch = true;
    audioEl.mozPreservesPitch = true;
    audioEl.webkitPreservesPitch = true;
    previewEl = new Audio();
    previewEl.preload = "auto";
    if ("preservesPitch" in previewEl) previewEl.preservesPitch = true;
  } catch (e) { audioEl = audioEl || null; }

  var state = {
    enabled: true,
    useRecorded: true,
    rate: 1.0,
    pitch: 1.12,
    voice: null,
    voiceURI: null,
    voices: [],
    voicePack: "fenna",
    voicePacks: [],
    audioMap: null,
    unlocked: false,
    speaking: false,
    paused: false,       // tijdelijk gepauzeerd (bv. instellingen open)
    usingAudio: false,   // speelt de huidige uitleg via mp3 (true) of synth/timer (false)?
    blocking: false,     // mag het kind deze uitleg overslaan met een tik?
    skipFn: null,        // maakt de huidige uitleg meteen af
    fallbackTimer: null,
    lastMessage: "",
    queue: [],
    token: 0
  };

  var listeners = { start: [], end: [], voices: [], text: [], voicepacks: [] };
  function emit(name, arg) { listeners[name].forEach(function (fn) { try { fn(arg); } catch (e) {} }); }

  function norm(s) { return String(s).replace(/\s+/g, " ").trim().toLowerCase(); }
  function clampRate(r) { return Math.max(0.6, Math.min(1.6, r)); }

  // Uitspraak-correcties: de stem negeert klemtoontekens, dus sommige woorden
  // worden fonetisch gespeld voor het geluid. Op het scherm blijft de gewone
  // spelling staan (de tekstballon gebruikt de originele tekst).
  // LET OP: dezelfde lijst staat in tools/make_voice.py en tools/check_sync.py.
  var PRON = [
    [/\brokeren\b/gi, "rokeeren"]
  ];
  function pronounce(s) {
    var t = String(s);
    for (var i = 0; i < PRON.length; i++) t = t.replace(PRON[i][0], PRON[i][1]);
    return t;
  }

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
    }).catch(function () { });
  }

  function setVoicePack(id) { if (!id) return; state.voicePack = id; loadManifest(); }

  function fileFor(text) {
    if (!state.useRecorded || !state.audioMap || !audioEl) return null;
    return state.audioMap[norm(pronounce(text))] || null;
  }

  /* ---------- stemmen kiezen (terugval) ---------- */
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
      var iv = setInterval(function () { tries++; pickVoice(); if (state.voices.length || tries > 20) clearInterval(iv); }, 250);
    }
  }

  /* ---------- ontgrendelen (iOS) ---------- */
  function unlock() {
    if (state.unlocked) return;
    state.unlocked = true;
    if (audioEl) {
      try {
        audioEl.src = SILENT;
        var p = audioEl.play();
        if (p && p.then) p.then(function () { try { audioEl.pause(); } catch (e) {} }).catch(function () {});
      } catch (e) {}
    }
    if (previewEl) {
      try {
        previewEl.src = SILENT;
        var pp = previewEl.play();
        if (pp && pp.then) pp.then(function () { try { previewEl.pause(); } catch (e) {} }).catch(function () {});
      } catch (e) {}
    }
    if (synthSupported) {
      try { var u = new SpeechSynthesisUtterance(" "); u.volume = 0; synth.speak(u); synth.cancel(); } catch (e) {}
    }
  }

  /* ---------- tekst in stukjes (alleen terugval) ---------- */
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

  /* ---------- spreken ---------- */
  function speak(text, opts) {
    opts = opts || {};
    // een losse opmerking (niet-blokkerend) mag een lopende uitleg niet onderbreken
    if (!opts.block && state.speaking && state.blocking) return;
    if (opts.remember !== false) state.lastMessage = text;
    cancel(true);
    var myToken = ++state.token;
    state.blocking = !!opts.block;
    state.usingAudio = false;
    state.paused = false;

    var finished = false;
    function finish() {
      if (finished || myToken !== state.token) return;
      finished = true;
      if (state.fallbackTimer) { clearTimeout(state.fallbackTimer); state.fallbackTimer = null; }
      stopKeepAlive();
      if (audioEl) { try { audioEl.onended = null; audioEl.onerror = null; audioEl.pause(); } catch (e) {} }
      if (synthSupported) { try { synth.cancel(); } catch (e) {} }
      state.speaking = false;
      state.skipFn = null;
      state.blocking = false;
      state.paused = false;
      state.usingAudio = false;
      emit("text", "");
      emit("end");
      if (typeof opts.onEnd === "function") opts.onEnd();
    }
    state.skipFn = finish;
    state.speaking = true;
    emit("start");
    emit("text", text);

    if (!state.enabled) { timedFallback(text, opts, finish); return; }
    var sayText = pronounce(text); // wat de stem zegt (de ballon toont de originele tekst)
    var file = fileFor(text);
    if (file) { playRecorded(file, sayText, myToken, opts, finish); return; }
    if (synthSupported) { speakSynth(sayText, myToken, opts, finish); return; }
    timedFallback(text, opts, finish);
  }

  // opgenomen mp3
  function playRecorded(file, text, myToken, opts, finish) {
    state.usingAudio = true;
    audioEl.onended = finish;
    audioEl.onerror = function () { if (myToken === state.token) speakSynth(text, myToken, opts, finish); };
    try {
      audioEl.src = packDir() + file;
      audioEl.playbackRate = clampRate(state.rate);
      if ("preservesPitch" in audioEl) audioEl.preservesPitch = true;
      var p = audioEl.play();
      if (p && p.catch) p.catch(function () { if (myToken === state.token) speakSynth(text, myToken, opts, finish); });
    } catch (e) { speakSynth(text, myToken, opts, finish); }
  }

  // terugval: Web Speech API
  function speakSynth(text, myToken, opts, finish) {
    state.usingAudio = false;
    if (!synthSupported) { timedFallback(text, opts, finish); return; }
    var pieces = chunk(text);
    if (!pieces.length) { timedFallback(text, opts, finish); return; }
    state.queue = pieces.slice();
    startKeepAlive();
    function next() {
      if (myToken !== state.token) return;
      if (!state.queue.length) { finish(); return; }
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

  // geen geluid: wel de tekstballon, en de les blijft doorlopen
  function timedFallback(text, opts, finish) {
    state.usingAudio = false;
    var delay = Math.min(6000, Math.max(1200, (text || "").length * 55));
    state.fallbackTimer = setTimeout(finish, delay);
  }

  function replay() {
    // tijdens een uitleg: herstart de huidige zin (de les blijft op zijn plek)
    if (state.speaking && state.usingAudio && audioEl) {
      try { audioEl.currentTime = 0; var p = audioEl.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
      return;
    }
    if (state.speaking) return; // een synth-uitleg loopt nog; laat die gewoon doorgaan
    if (state.lastMessage) speak(state.lastMessage, { remember: false });
  }

  // de huidige (blokkerende) uitleg meteen afmaken
  function skip() {
    if (state.speaking && state.blocking && typeof state.skipFn === "function") state.skipFn();
  }

  // tijdelijk pauzeren (bv. tijdens instellingen) en weer hervatten op dezelfde plek
  function pause() {
    if (!state.speaking || state.paused) return;
    state.paused = true;
    stopKeepAlive();
    if (state.usingAudio && audioEl) { try { audioEl.pause(); } catch (e) {} }
    else if (synthSupported) { try { synth.pause(); } catch (e) {} }
  }
  function resume() {
    if (!state.paused) return;
    state.paused = false;
    if (state.usingAudio && audioEl) { try { var p = audioEl.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {} }
    else if (synthSupported) { try { synth.resume(); startKeepAlive(); } catch (e) {} }
  }

  // geluid voor de instellingen, op een apart kanaal (verstoort de les niet)
  function preview(text) {
    if (!state.enabled) return;
    stopPreview();
    var sayText = pronounce(text);
    var file = (state.useRecorded && state.audioMap) ? state.audioMap[norm(sayText)] : null;
    if (file && previewEl) {
      try {
        previewEl.src = packDir() + file;
        previewEl.playbackRate = clampRate(state.rate);
        if ("preservesPitch" in previewEl) previewEl.preservesPitch = true;
        var pl = previewEl.play();
        if (pl && pl.catch) pl.catch(function () {});
        return;
      } catch (e) {}
    }
    if (synthSupported) {
      try {
        var u = new SpeechSynthesisUtterance(sayText);
        u.lang = (state.voice && state.voice.lang) || "nl-NL";
        if (state.voice) u.voice = state.voice;
        u.rate = Math.max(0.6, Math.min(1.4, state.rate));
        u.pitch = state.pitch;
        synth.speak(u);
      } catch (e) {}
    }
  }
  function stopPreview() { if (previewEl) { try { previewEl.pause(); } catch (e) {} } }

  function cancel(silent) {
    state.token++;
    state.queue = [];
    state.speaking = false;
    state.skipFn = null;
    state.blocking = false;
    state.paused = false;
    state.usingAudio = false;
    if (state.fallbackTimer) { clearTimeout(state.fallbackTimer); state.fallbackTimer = null; }
    stopKeepAlive();
    if (audioEl) { try { audioEl.onended = null; audioEl.onerror = null; audioEl.pause(); } catch (e) {} }
    if (synthSupported) { try { synth.cancel(); } catch (e) {} }
    emit("text", "");
    if (!silent) emit("end");
  }

  /* ---------- instellingen ---------- */
  function setEnabled(on) {
    state.enabled = !!on;
    // niet hard afbreken (dat liet de les hangen): de huidige uitleg netjes afronden
    if (!state.enabled && state.speaking && typeof state.skipFn === "function") state.skipFn();
  }
  function setRate(r) { state.rate = clampRate(Number(r) || 1.0); }
  function setVoiceURI(uri) { state.voiceURI = uri || null; pickVoice(); }
  function setUseRecorded(on) { state.useRecorded = !!on; }

  /* ---------- API ---------- */
  window.Speech = {
    init: init,
    unlock: unlock,
    speak: speak,
    replay: replay,
    skip: skip,
    pause: pause,
    resume: resume,
    preview: preview,
    stopPreview: stopPreview,
    cancel: cancel,
    isSpeaking: function () { return state.speaking; },
    isBlocking: function () { return state.speaking && state.blocking; },
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
