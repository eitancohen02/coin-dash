// Keep tuning separate from game behaviour so features can be developed independently.
window.COIN_DASH = {
  width: 800,
  height: 500,
  playerSpeed: 240,
  droneSpeed: 105,
  droneCount: 3,
  sfxEnabled: true, // retro 8-bit sound effects (sfx-retro.js)
  sfxVolume: 0.25, // master volume, 0..1
  sfxBitDepth: 3, // lower = crunchier bit-crush
  // Extra enemy kinds. They visit (one at a time at first): fade in, stay a while, flicker, then leave.
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
  // The game gets harder: visit settings ease from `enemies.visits` to these values over `rampSeconds`,
  // and an extra drone joins at each listed second.
  difficulty: {
    rampSeconds: 90,
    end: { everyMs: 3500, stayMs: 10000, maxAtOnce: 3 },
    extraDronesAtSeconds: [15, 30, 50, 75]
  },
  // No time limit: play until caught. Surviving earns points steadily, and coins add a boost
  // that multiplies (up to maxCombo) when the next coin is grabbed within comboWindowMs.
  scoring: { pointsPerSecond: 10, coinPoints: 100, comboWindowMs: 4000, maxCombo: 5 },
  colors: { background: 0x101c31, player: 0x71e8ce, coin: 0xffd166, drone: 0xff657a }
};
// Guns: pick up a gun to get a few bullets, then hold the fire key to shoot in the direction you last moved.
// Every enemy takes `enemyHealth` hits. Only one gun pickup is on the field at a time.
window.COIN_DASH.guns = { enabled: true, fireKey: 'SPACE', cooldownMs: 220, bulletSpeed: 520,
  bulletRadius: 4, damage: 1, enemyHealth: 2, hitFlashMs: 80, color: 0xf8f8ff, startAmmo: 0,
  pickup: { ammo: 6, maxAmmo: 12, firstAfterMs: 3000, respawnMs: 8000, color: 0x9be15d } };
// Lo-fi background music (music-lofi.js).
window.COIN_DASH.lofiMusic = { volume: 0.45, bpm: 78, swing: 0.62, muted: false };
