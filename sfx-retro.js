/* global COIN_DASH */
// Retro 8-bit sound effects, generated with the Web Audio API (no audio files).
// game.js calls window.SfxRetro.<hook>() at the right moments; every hook is safe to call
// before audio is unlocked (it just stays silent until the first key press).
(function () {
  let ctx = null;
  let out = null;

  function setting(key, fallback) {
    const c = window.COIN_DASH || {};
    return c[key] === undefined ? fallback : c[key];
  }

  // Step-shaped curve that quantises the signal to a few levels: the "bit-crushed" crunch.
  function crushCurve(bits) {
    const steps = Math.pow(2, bits);
    const curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i++) {
      const x = (i / (curve.length - 1)) * 2 - 1;
      curve[i] = Math.round(x * steps) / steps;
    }
    return curve;
  }

  function ensure() {
    if (!setting('sfxEnabled', true)) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      const crush = ctx.createWaveShaper();
      crush.curve = crushCurve(setting('sfxBitDepth', 3));
      const master = ctx.createGain();
      master.gain.value = setting('sfxVolume', 0.25);
      crush.connect(master).connect(ctx.destination);
      out = crush;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // Browsers block audio until a user gesture: unlock on the first key press or click.
  function unlock() { ensure(); }
  window.addEventListener('keydown', unlock);
  window.addEventListener('pointerdown', unlock);

  // One oscillator note with an optional pitch sweep and a hard-edged volume envelope.
  function tone(type, from, to, start, length, volume) {
    const a = ensure();
    if (!a || a.state !== 'running') return;
    const t = a.currentTime + start;
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, t + length);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.setValueAtTime(volume, t + length * 0.7);
    gain.gain.linearRampToValueAtTime(0, t + length);
    osc.connect(gain).connect(out);
    osc.start(t);
    osc.stop(t + length + 0.02);
  }

  // Short burst of sample-and-hold noise (low sample rate makes it gritty, like an NES noise channel).
  function noise(start, length, volume, hold) {
    const a = ensure();
    if (!a || a.state !== 'running') return;
    const t = a.currentTime + start;
    const frames = Math.floor(a.sampleRate * length);
    const buffer = a.createBuffer(1, frames, a.sampleRate);
    const data = buffer.getChannelData(0);
    let v = 0;
    for (let i = 0; i < frames; i++) {
      if (i % hold === 0) v = Math.random() * 2 - 1;
      data[i] = v * (1 - i / frames);
    }
    const src = a.createBufferSource();
    const gain = a.createGain();
    src.buffer = buffer;
    gain.gain.value = volume;
    src.connect(gain).connect(out);
    src.start(t);
  }

  window.SfxRetro = {
    // Classic two-note "bling": a quick square blip jumping up a fourth.
    coin() {
      tone('square', 988, 988, 0, 0.06, 0.5);
      tone('square', 1319, 1319, 0.06, 0.16, 0.5);
    },
    // Drone hit: crunchy noise explosion over a falling square-wave "zap".
    caught() {
      noise(0, 0.45, 0.8, 24);
      tone('square', 440, 55, 0, 0.5, 0.5);
      tone('triangle', 220, 40, 0.05, 0.55, 0.6);
    },
    // Time up: a descending triangle/square arpeggio, the "round over" jingle.
    timeUp() {
      [784, 659, 523, 392].forEach((f, i) => tone('square', f, f, i * 0.12, 0.11, 0.35));
      tone('triangle', 196, 196, 0.48, 0.4, 0.7);
    },
    // Restart: a fast rising square sweep, like a power-up / "ready" cue.
    restart() {
      tone('square', 220, 880, 0, 0.18, 0.4);
      tone('square', 880, 880, 0.2, 0.08, 0.35);
    },
    // Gun pickup: a quick rising triangle "cha-chick".
    pickup() {
      tone('triangle', 523, 523, 0, 0.05, 0.5);
      tone('square', 784, 1046, 0.06, 0.1, 0.35);
    },
    // Gun shot: a very short falling square "pew".
    shoot() {
      tone('square', 1400, 500, 0, 0.07, 0.25);
    },
    // Bullet hits an enemy that survives: a dull low blip.
    hit() {
      tone('square', 330, 220, 0, 0.06, 0.35);
    },
    // Enemy destroyed: a small noise pop with a falling zap.
    kill() {
      noise(0, 0.2, 0.6, 12);
      tone('square', 660, 110, 0, 0.22, 0.4);
    },
    // Countdown tick for the final seconds: a tiny triangle blip, slightly higher on the last one.
    tick(secondsLeft) {
      const f = secondsLeft <= 1 ? 1760 : 1175;
      tone('triangle', f, f, 0, 0.04, 0.4);
    }
  };
}());
