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
  // Extra enemy kinds. Set a count to 0 to switch a kind off.
  enemies: {
    spawnMinDistance: 200,
    // Steers towards the player with a little lag, so sharp turns shake it off.
    chaser: { count: 1, speed: 80, turnRate: 2.2, color: 0xff9f43 },
    // Rests, telegraphs an aim line, then lunges in a straight line.
    dasher: { count: 1, restMs: 1600, windupMs: 700, dashMs: 450, dashSpeed: 520, color: 0xc56cf0 },
    // Drifts slowly and teleports; a ring marks where it will reappear.
    blinker: { count: 1, speed: 45, blinkEveryMs: 3200, warnMs: 900, color: 0x48dbfb },
    // Circles the coin to guard it.
    orbiter: { count: 1, radius: 62, angularSpeed: 2.4, maxSpeed: 260, color: 0xff6b9d }
  },
  colors: { background: 0x101c31, player: 0x71e8ce, coin: 0xffd166, drone: 0xff657a }
};
// Lo-fi background music (music-lofi.js).
window.COIN_DASH.lofiMusic = { volume: 0.45, bpm: 78, swing: 0.62, muted: false };
// Cozy pastel graphics (graphics-cozy.js). Set enabled: false to get the plain shapes back.
window.COIN_DASH.cozy = {
  enabled: true,
  palette: { cream: 0xfbf3e4, ink: 0x6b4f45, meadow: 0xcfe2bd, accent: 0xf2a98a, player: 0x8fd3c1,
    coin: 0xffd36e, drone: 0xf4958c, chaser: 0xffb877, dasher: 0xc7aef0, blinker: 0xa9d8f2, orbiter: 0xffadc8 },
  squash: 0.14 // how far the blob stretches while moving
};
