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
  colors: { background: 0x101c31, player: 0x71e8ce, coin: 0xffd166, drone: 0xff657a }
};
