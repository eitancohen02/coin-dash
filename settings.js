// Keep tuning separate from game behaviour so features can be developed independently.
window.COIN_DASH = {
  width: 800,
  height: 500,
  roundSeconds: 45,
  playerSpeed: 240,
  droneSpeed: 105,
  droneCount: 3,
  sfxEnabled: true, // retro 8-bit sound effects (sfx-retro.js)
  sfxVolume: 0.25, // master volume, 0..1
  sfxBitDepth: 3, // lower = crunchier bit-crush
  sfxTickSeconds: 5, // countdown tick during the last N seconds (0 = off)
  // Extra enemy kinds. They visit one at a time: fade in, stay a while, flicker, then leave.
  enemies: {
    spawnMinDistance: 200,
    // Remove a kind from `kinds` to switch it off.
    visits: { kinds: ['chaser', 'dasher', 'blinker', 'orbiter'], firstAfterMs: 5000, everyMs: 9000,
      stayMs: 6000, arriveMs: 700, leaveWarnMs: 1200, maxAtOnce: 1 },
    // Steers towards the player with a little lag, so sharp turns shake it off.
    chaser: { speed: 80, turnRate: 2.2, color: 0xff9f43 },
    // Rests, telegraphs an aim line, then lunges in a straight line.
    dasher: { restMs: 1600, windupMs: 700, dashMs: 450, dashSpeed: 520, color: 0xc56cf0 },
    // Drifts slowly and teleports; a ring marks where it will reappear.
    blinker: { speed: 45, blinkEveryMs: 3200, warnMs: 900, color: 0x48dbfb },
    // Circles the coin to guard it.
    orbiter: { radius: 62, angularSpeed: 2.4, maxSpeed: 260, color: 0xff6b9d }
  },
  colors: { background: 0x101c31, player: 0x71e8ce, coin: 0xffd166, drone: 0xff657a }
};
// Lo-fi background music (music-lofi.js).
window.COIN_DASH.lofiMusic = { volume: 0.45, bpm: 78, swing: 0.62, muted: false };
