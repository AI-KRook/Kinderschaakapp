/* =================================================================
   Geluid — zachte muziek en geluidseffecten via de Web Audio API.
   Geen bestanden nodig (werkt offline), alles wordt live opgewekt.
   Muziek is een rustige, generatieve pentatoniek (klinkt nooit vals).
   ================================================================= */
(function () {
  "use strict";

  var ctx = null, fxBus = null, musicBus = null, musicTimer = null;
  var enabled = { music: true, fx: true };

  function ensure() {
    if (ctx) return ctx;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      fxBus = ctx.createGain(); fxBus.gain.value = 0.9; fxBus.connect(ctx.destination);
      musicBus = ctx.createGain(); musicBus.gain.value = 0.5; musicBus.connect(ctx.destination);
    } catch (e) { ctx = null; }
    return ctx;
  }

  function unlock() {
    ensure();
    if (ctx && ctx.state === "suspended") { try { ctx.resume(); } catch (e) {} }
  }

  // één zachte toon met een nette envelope
  function note(freq, dur, type, gain, dest, when) {
    if (!ctx) return;
    when = when || ctx.currentTime;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || "triangle";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(gain, when + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g); g.connect(dest || fxBus);
    o.start(when); o.stop(when + dur + 0.05);
  }

  var EFFECTS = {
    goed: function () { note(523.25, 0.18, "triangle", 0.22); note(659.25, 0.22, "triangle", 0.2, null, ctx.currentTime + 0.09); },
    ster: function () { note(784, 0.12, "triangle", 0.2); note(1046.5, 0.20, "triangle", 0.18, null, ctx.currentTime + 0.08); },
    zet:  function () { note(196, 0.08, "sine", 0.16); },
    fout: function () { note(174.6, 0.20, "sine", 0.16); },
    win:  function () { [523.25, 659.25, 784, 1046.5].forEach(function (f, i) { note(f, 0.28, "triangle", 0.2, null, ctx.currentTime + i * 0.12); }); }
  };

  function effect(name) {
    if (!enabled.fx) return;
    ensure();
    if (!ctx) return;
    if (ctx.state === "suspended") { try { ctx.resume(); } catch (e) {} }
    var fn = EFFECTS[name];
    if (fn) try { fn(); } catch (e) {}
  }

  // achtergrondmuziek: zachte willekeurige tonen uit een pentatonische toonladder
  var SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
  function tick() {
    if (!ctx || !enabled.music) return;
    note(SCALE[Math.floor(Math.random() * SCALE.length)], 1.9, "sine", 0.06, musicBus);
    if (Math.random() < 0.4) {
      note(SCALE[Math.floor(Math.random() * SCALE.length)], 1.9, "sine", 0.035, musicBus, ctx.currentTime + 0.28);
    }
  }
  function startMusic() {
    stopMusic();
    ensure();
    if (!ctx) return;
    musicTimer = setInterval(tick, 1500);
    tick();
  }
  function stopMusic() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } }

  function setMusic(on) {
    enabled.music = !!on;
    if (on) { unlock(); startMusic(); } else { stopMusic(); }
  }
  function setFx(on) { enabled.fx = !!on; }

  window.Snd = {
    unlock: unlock,
    effect: effect,
    setMusic: setMusic,
    setFx: setFx,
    isMusic: function () { return enabled.music; }
  };
})();
