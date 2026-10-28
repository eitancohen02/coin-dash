/* global COIN_DASH */
// Procedural lo-fi hip-hop background music, built with the Web Audio API.
// One shared instance (window.LofiMusic) so scene restarts never stack copies.
(function () {
  const BAR_STEPS = 8;            // eighth notes per bar
  const LOOP_BARS = 4;            // ii - V - I - vi, then loop
  const LOOKAHEAD = 0.12;         // seconds of audio scheduled ahead
  const TICK_MS = 25;             // how often the scheduler wakes up

  // Rootless jazzy voicings (MIDI notes) with their bass roots.
  const CHORDS = [
    { notes: [53, 57, 60, 64], bass: 38 }, // Dm9   (F A C E over D)
    { notes: [53, 59, 64, 69], bass: 43 }, // G13   (F B E A over G)
    { notes: [52, 55, 59, 62], bass: 36 }, // Cmaj9 (E G B D over C)
    { notes: [55, 60, 64, 71], bass: 45 }  // Am9   (G C E B over A)
  ];
  const KICK = [1, 0, 0, 0.7, 0, 1, 0, 0];      // lazy boom-bap
  const SNARE = [0, 0, 1, 0, 0, 0, 1, 0];
  const HAT = [0.9, 0.5, 0.8, 0.5, 0.9, 0.5, 0.8, 0.6];
  const BASS = [1, 0, 0, 0.8, 0, 0, 0.7, 0];    // root, and-of-2, fifth on beat 4

  const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const cfg = () => Object.assign({ volume: 0.45, bpm: 78, swing: 0.62, muted: false },
    (window.COIN_DASH && COIN_DASH.lofiMusic) || {});

  const music = {
    ctx: null, out: null, filter: null, bus: null, noise: null, crackle: null,
    timer: null, step: 0, nextTime: 0, muted: false, ducked: false,

    // Start (or resume) the music. Safe to call on every scene create.
    start(ctx) {
      if (!this.ctx) this.build(ctx || new (window.AudioContext || window.webkitAudioContext)());
      this.resume();
      this.ducked = false;
      this.applyLevel(0.8);
      if (this.timer) return;
      this.step = 0;
      this.nextTime = this.ctx.currentTime + 0.1;
      this.timer = setInterval(() => this.schedule(), TICK_MS);
    },

    // Browsers keep the context suspended until a user gesture.
    resume() {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },

    // Game over: muffle and quieten the music instead of cutting it.
    duck() {
      this.ducked = true;
      this.applyLevel(1.5);
    },

    toggleMute() {
      this.muted = !this.muted;
      this.applyLevel(0.3);
      return this.muted;
    },

    stop() {
      clearInterval(this.timer);
      this.timer = null;
      if (this.out) this.out.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
    },

    applyLevel(fade) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const vol = this.muted ? 0 : cfg().volume * (this.ducked ? 0.35 : 1);
      this.out.gain.cancelScheduledValues(t);
      this.out.gain.setTargetAtTime(vol, t, fade / 3);
      this.filter.frequency.cancelScheduledValues(t);
      this.filter.frequency.setTargetAtTime(this.ducked ? 650 : 2200, t, fade / 3);
    },

    build(ctx) {
      this.ctx = ctx;
      this.muted = !!cfg().muted;
      this.out = ctx.createGain();
      this.out.gain.value = 0;
      this.filter = ctx.createBiquadFilter();   // the warm "lo-fi" low-pass
      this.filter.type = 'lowpass';
      this.filter.frequency.value = 2200;
      this.filter.Q.value = 0.7;
      this.bus = ctx.createGain();
      this.bus.connect(this.filter).connect(this.out).connect(ctx.destination);

      // Shared white-noise buffer for drums.
      const len = ctx.sampleRate;
      this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

      // Looping vinyl crackle: faint hiss plus sparse random pops.
      const clen = ctx.sampleRate * 4;
      const cbuf = ctx.createBuffer(1, clen, ctx.sampleRate);
      const c = cbuf.getChannelData(0);
      for (let i = 0; i < clen; i++) {
        c[i] = (Math.random() * 2 - 1) * 0.012;
        if (Math.random() < 0.0006) {
          const amp = (Math.random() * 0.5 + 0.2) * (Math.random() < 0.5 ? -1 : 1);
          for (let k = 0; k < 40 && i + k < clen; k++) c[i + k] += amp * Math.exp(-k / 6);
        }
      }
      this.crackle = ctx.createBufferSource();
      this.crackle.buffer = cbuf;
      this.crackle.loop = true;
      const cf = ctx.createBiquadFilter();
      cf.type = 'bandpass';
      cf.frequency.value = 3000;
      cf.Q.value = 0.5;
      const cg = ctx.createGain();
      cg.gain.value = 0.35;
      this.crackle.connect(cf).connect(cg).connect(this.out);
      this.crackle.start();
    },

    schedule() {
      const { bpm, swing } = cfg();
      const beat = 60 / bpm;
      // After a throttled background tab, skip ahead rather than burst-play missed notes.
      if (this.nextTime < this.ctx.currentTime - 0.2) this.nextTime = this.ctx.currentTime + 0.05;
      while (this.nextTime < this.ctx.currentTime + LOOKAHEAD) {
        this.playStep(this.step, this.nextTime, beat);
        // Swing: the first eighth of each beat is longer than the second.
        const onBeat = this.step % 2 === 0;
        this.nextTime += beat * (onBeat ? swing : 1 - swing);
        this.step = (this.step + 1) % (BAR_STEPS * LOOP_BARS);
      }
    },

    playStep(step, t, beat) {
      const s = step % BAR_STEPS;
      const chord = CHORDS[Math.floor(step / BAR_STEPS)];
      const human = () => 0.85 + Math.random() * 0.15;
      if (KICK[s]) this.kick(t, KICK[s] * human());
      if (SNARE[s]) this.snare(t + 0.012, human());   // snare drags a touch behind
      if (HAT[s]) this.hat(t, HAT[s] * human());
      if (BASS[s]) {
        const note = s === 6 ? chord.bass + 7 : chord.bass;
        this.bass(t, midiHz(note), BASS[s], s === 0 ? beat * 1.4 : beat * 0.8);
      }
      // Electric-piano chord on the downbeat, a softer stab on the and-of-3.
      if (s === 0) this.chord(chord.notes, t, 1, beat * 3.2);
      if (s === 5) this.chord(chord.notes, t, 0.45, beat * 1.2);
    },

    env(g, t, peak, attack, decay) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    },

    // Soft Rhodes-like tone: sine fundamental + quiet bell partial, gently strummed.
    chord(notes, t, vel, dur) {
      notes.forEach((m, i) => {
        const at = t + i * 0.018;
        const f = midiHz(m);
        const g = this.ctx.createGain();
        this.env(g, at, 0.055 * vel, 0.012, dur);
        const o1 = this.ctx.createOscillator();
        o1.type = 'sine';
        o1.frequency.value = f;
        o1.detune.value = (Math.random() - 0.5) * 8;   // tape wobble
        const o2 = this.ctx.createOscillator();
        o2.type = 'sine';
        o2.frequency.value = f * 4;
        const g2 = this.ctx.createGain();
        g2.gain.value = 0.12;
        o1.connect(g);
        o2.connect(g2).connect(g);
        g.connect(this.bus);
        o1.start(at); o2.start(at);
        o1.stop(at + dur + 0.1); o2.stop(at + dur + 0.1);
      });
    },

    bass(t, f, vel, dur) {
      const o = this.ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 400;
      const g = this.ctx.createGain();
      this.env(g, t, 0.22 * vel, 0.02, dur);
      o.connect(lp).connect(g).connect(this.bus);
      o.start(t);
      o.stop(t + dur + 0.1);
    },

    kick(t, vel) {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(110, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
      const g = this.ctx.createGain();
      this.env(g, t, 0.5 * vel, 0.004, 0.32);
      o.connect(g).connect(this.bus);
      o.start(t);
      o.stop(t + 0.4);
    },

    noiseHit(t, type, freq, q, peak, decay) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noise;
      const f = this.ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      const g = this.ctx.createGain();
      this.env(g, t, peak, 0.003, decay);
      src.connect(f).connect(g).connect(this.bus);
      src.start(t, Math.random() * 0.5);
      src.stop(t + decay + 0.05);
    },

    snare(t, vel) {
      this.noiseHit(t, 'bandpass', 1800, 0.8, 0.2 * vel, 0.18);
      const o = this.ctx.createOscillator();   // a little body under the noise
      o.type = 'triangle';
      o.frequency.setValueAtTime(190, t);
      const g = this.ctx.createGain();
      this.env(g, t, 0.06 * vel, 0.003, 0.08);
      o.connect(g).connect(this.bus);
      o.start(t);
      o.stop(t + 0.12);
    },

    hat(t, vel) {
      this.noiseHit(t, 'highpass', 7000, 0.7, 0.045 * vel, 0.04);
    }
  };

  window.LofiMusic = music;
}());
