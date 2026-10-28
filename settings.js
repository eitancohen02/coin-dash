// Keep tuning separate from game behaviour so features can be developed independently.
window.COIN_DASH = {
  width: 800,
  height: 500,
  roundSeconds: 45,
  playerSpeed: 240,
  droneSpeed: 105,
  droneCount: 3,
  colors: { background: 0x101c31, player: 0x71e8ce, coin: 0xffd166, drone: 0xff657a }
};
// Lo-fi background music (music-lofi.js).
window.COIN_DASH.lofiMusic = { volume: 0.45, bpm: 78, swing: 0.62, muted: false };
