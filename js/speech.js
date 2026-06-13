/* =================================================================
   Speech — praat hardop in het Nederlands (Web Speech API)
   Houdt rekening met de iOS Safari valkuilen:
   - stemmen laden vertraagd  -> wacht op 'voiceschanged'
   - geluid pas na een tik    -> unlock() bij eerste gebruikersactie
   - lange zinnen worden afgekapt -> knip in korte stukjes
   - duidelijke aan/uit-knop  -> setEnabled + visuele status
   ================================================================= */
(function () {
  "use strict";

  var synth = window.speechSynthesis || null;
  var supported = !!synth && typeof window.SpeechSynthesisUtterance === "function";

  var state = {
    enabled: true,
    rate: 0.9,
    pitch: 1.15,
    voice: null,        // gekozen SpeechSynthesisVoice
    voiceURI: null,     // voorkeur opgeslagen door ouder
    voices: [],
    unlocked: false,
    queue: [],          // resterende stukjes van het huidige bericht
    lastMessage: "",    // voor de "zeg het nog eens"-knop
    speaking: false,
    token: 0            // om oude callbacks te negeren na cancel
  };

  var listeners = { start: [], end: [], voices: [], text: [] };
  function emit(name, arg) { listeners[name].forEach(function (fn) { try { fn(arg); } catch (e) {} }); }

  /* ---------- stemmen kiezen ---------- */
  function pickVoice() {
    if (!supported) return;
    var list = synth.getVoices() || [];
    state.voices = list;
    if (!list.length) return;

    var chosen = null;
    // 1) door ouder gekozen stem
    if (state.voiceURI) chosen = list.find(function (v) { return v.voiceURI === state.voiceURI; });
    // 2) een echte nl-NL stem
    if (!chosen) chosen = list.find(function (v) { return /^nl[-_]NL/i.test(v.lang); });
    // 3) elke nl stem (bv. nl-BE)
    if (!chosen) chosen = list.find(function (v) { return /^nl/i.test(v.lang); });
    // 4) niets Nederlands -> we spreken toch (val terug op default), tekst blijft zichtbaar
    state.voice = chosen || null;
    emit("voices");
  }

  function init() {
    if (!supported) return;
    pickVoice();
    if (typeof synth.addEventListener === "function") {
      synth.addEventListener("voiceschanged", pickVoice);
    } else {
      synth.onvoiceschanged = pickVoice;
    }
    // sommige iOS-versies vullen de lijst pas na een korte poll
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      if (state.voices.length || tries > 20) { clearInterval(iv); pickVoice(); }
      else pickVoice();
    }, 250);
  }

  /* ---------- ontgrendelen (iOS vereist een gebruikersactie) ---------- */
  function unlock() {
    if (!supported || state.unlocked) return;
    state.unlocked = true;
    try {
      // een heel kort, bijna onhoorbaar zinnetje ontgrendelt het audiokanaal
      var u = new SpeechSynthesisUtterance(" ");
      u.volume = 0; u.rate = 1;
      if (state.voice) u.voice = state.voice;
      synth.speak(u);
      synth.cancel();
    } catch (e) {}
  }

  /* ---------- tekst in korte stukjes knippen ---------- */
  function chunk(text) {
    var clean = String(text).replace(/\s+/g, " ").trim();
    if (!clean) return [];
    // splits op zinseinden, daarna lange stukken op komma's
    var rough = clean.match(/[^.!?]+[.!?]*/g) || [clean];
    var out = [];
    rough.forEach(function (s) {
      s = s.trim();
      if (s.length <= 140) { out.push(s); return; }
      var parts = s.split(/,\s*/);
      var buf = "";
      parts.forEach(function (p) {
        if ((buf + " " + p).trim().length > 140) { if (buf) out.push(buf.trim()); buf = p; }
        else buf = (buf ? buf + ", " : "") + p;
      });
      if (buf) out.push(buf.trim());
    });
    return out.filter(Boolean);
  }

  /* ---------- iOS/Chrome bug: spraak valt stil na ~15s -> levend houden ---------- */
  var keepAlive = null;
  function startKeepAlive() {
    stopKeepAlive();
    keepAlive = setInterval(function () {
      if (synth.speaking && !synth.paused) { try { synth.pause(); synth.resume(); } catch (e) {} }
    }, 9000);
  }
  function stopKeepAlive() { if (keepAlive) { clearInterval(keepAlive); keepAlive = null; } }

  /* ---------- het hart: spreek een bericht uit ---------- */
  function speak(text, opts) {
    opts = opts || {};
    var pieces = chunk(text);
    if (opts.remember !== false) state.lastMessage = text;

    // altijd eerst stoppen met wat er nog liep
    cancel(true);

    var myToken = ++state.token;
    state.queue = pieces.slice();

    if (!state.enabled || !supported || pieces.length === 0) {
      // geluid uit of niet ondersteund: toch het verhaal "afspelen" qua timing,
      // zodat de les blijft lopen en de tekstballon zichtbaar is.
      emit("start");
      emit("text", text);
      state.speaking = true;
      var totalChars = (text || "").length;
      var delay = Math.min(6000, Math.max(1200, totalChars * 55));
      setTimeout(function () {
        if (myToken !== state.token) return;
        state.speaking = false;
        emit("text", "");
        emit("end");
        if (typeof opts.onEnd === "function") opts.onEnd();
      }, delay);
      return;
    }

    state.speaking = true;
    emit("start");
    emit("text", text);
    startKeepAlive();

    function next() {
      if (myToken !== state.token) return; // afgebroken
      if (state.queue.length === 0) {
        state.speaking = false;
        stopKeepAlive();
        emit("text", "");
        emit("end");
        if (typeof opts.onEnd === "function") opts.onEnd();
        return;
      }
      var phrase = state.queue.shift();
      var u = new SpeechSynthesisUtterance(phrase);
      u.lang = (state.voice && state.voice.lang) || "nl-NL";
      if (state.voice) u.voice = state.voice;
      u.rate = state.rate;
      u.pitch = state.pitch;
      u.volume = 1;
      u.onend = function () { setTimeout(next, 120); };
      u.onerror = function () { setTimeout(next, 120); };
      try { synth.speak(u); }
      catch (e) { setTimeout(next, 120); }
    }
    // kleine vertraging helpt iOS na een cancel()
    setTimeout(next, 90);
  }

  function replay() {
    if (state.lastMessage) speak(state.lastMessage, { remember: false });
  }

  function cancel(silent) {
    state.token++;
    state.queue = [];
    state.speaking = false;
    stopKeepAlive();
    if (supported) { try { synth.cancel(); } catch (e) {} }
    emit("text", "");
    if (!silent) emit("end");
  }

  /* ---------- instellingen ---------- */
  function setEnabled(on) {
    state.enabled = !!on;
    if (!state.enabled) cancel(true);
  }
  function setRate(r) { state.rate = Math.max(0.5, Math.min(1.3, Number(r) || 0.9)); }
  function setVoiceURI(uri) { state.voiceURI = uri || null; pickVoice(); }

  /* ---------- API ---------- */
  window.Speech = {
    init: init,
    unlock: unlock,
    speak: speak,
    replay: replay,
    cancel: cancel,
    isSpeaking: function () { return state.speaking; },
    isEnabled: function () { return state.enabled; },
    isSupported: function () { return supported; },
    setEnabled: setEnabled,
    setRate: setRate,
    getRate: function () { return state.rate; },
    getVoices: function () { return state.voices.slice(); },
    getVoice: function () { return state.voice; },
    setVoiceURI: setVoiceURI,
    on: function (name, fn) { if (listeners[name]) listeners[name].push(fn); }
  };
})();
