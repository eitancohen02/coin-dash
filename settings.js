// Keep tuning separate from game behaviour so features can be developed independently.
window.COIN_DASH = {
  width: 800,
  height: 500,
  roundSeconds: 45,
  playerSpeed: 240,
  droneSpeed: 105,
  droneCount: 3,
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
