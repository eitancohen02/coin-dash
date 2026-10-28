/* global Phaser, COIN_DASH */
// Cozy pastel / soft cartoon graphics for Coin Dash.
// Everything is drawn at runtime into canvas textures (no image files). The game's own shapes keep
// their physics bodies, so hitboxes and behaviour are unchanged; they are only hidden, and cute
// sprites follow them every frame. game.js calls GraphicsCozy.create() and GraphicsCozy.finish().
(function () {
  const R = 2; // textures are drawn at 2x and shown at half scale, so they stay crisp when scaled up
  const FONT = '"Trebuchet MS", "Segoe UI", Verdana, sans-serif';
  const DEFAULTS = {
    enabled: true,
    palette: {
      cream: 0xfbf3e4, ink: 0x6b4f45, meadow: 0xcfe2bd, accent: 0xf2a98a, player: 0x8fd3c1,
      coin: 0xffd36e, drone: 0xf4958c, chaser: 0xffb877, dasher: 0xc7aef0, blinker: 0xa9d8f2, orbiter: 0xffadc8
    },
    squash: 0.14
  };
  const settings = () => {
    const s = (window.COIN_DASH && COIN_DASH.cozy) || {};
    return Object.assign({}, DEFAULTS, s, { palette: Object.assign({}, DEFAULTS.palette, s.palette) });
  };

  // ---------- colour helpers ----------
  const mix = (a, b, t) => {
    const ch = (n, s) => (n >> s) & 255;
    const m = s => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * t) << s;
    return m(16) | m(8) | m(0);
  };
  const css = (n, alpha = 1) => `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
  const hexStr = n => '#' + n.toString(16).padStart(6, '0');
  const light = (n, t) => mix(n, 0xffffff, t);
  const dark = (n, t) => mix(n, 0x000000, t);
  function seeded(seed) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- canvas texture helpers ----------
  function tex(scene, key, w, h, draw) {
    if (scene.textures.exists(key)) return key;
    const t = scene.textures.createCanvas(key, w * R, h * R);
    const ctx = t.getContext();
    ctx.scale(R, R);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    draw(ctx, w, h);
    t.refresh();
    return key;
  }

  function roundPoly(ctx, pts, r) {
    const n = pts.length;
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const start = mid(pts[n - 1], pts[0]);
    ctx.beginPath();
    ctx.moveTo(start[0], start[1]);
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      const m = mid(p, pts[(i + 1) % n]);
      ctx.arcTo(p[0], p[1], m[0], m[1], r);
    }
    ctx.closePath();
  }

  // Soft gradient fill, warm ink outline and a glossy highlight.
  function paint(ctx, path, base, ink, cx, cy, size) {
    const g = ctx.createRadialGradient(cx - size * 0.3, cy - size * 0.35, 1, cx, cy, size * 1.1);
    g.addColorStop(0, css(light(base, 0.55)));
    g.addColorStop(0.55, css(base));
    g.addColorStop(1, css(dark(base, 0.08)));
    path();
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    path();
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.ellipse(cx - size * 0.38, cy - size * 0.45, size * 0.28, size * 0.16, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    path();
    ctx.lineWidth = 2;
    ctx.strokeStyle = css(ink);
    ctx.stroke();
  }

  function eyes(ctx, ink, pts, r) {
    pts.forEach(([x, y]) => {
      ctx.fillStyle = css(ink);
      ctx.beginPath(); ctx.ellipse(x, y, r, r * 1.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(x + r * 0.35, y - r * 0.45, r * 0.38, 0, Math.PI * 2); ctx.fill();
    });
  }
  function cheeks(ctx, pts, rx = 2.8) {
    ctx.fillStyle = 'rgba(244,140,150,0.55)';
    pts.forEach(([x, y]) => { ctx.beginPath(); ctx.ellipse(x, y, rx, rx * 0.62, 0, 0, Math.PI * 2); ctx.fill(); });
  }
  function stroke(ctx, ink, width, fn) {
    ctx.strokeStyle = css(ink);
    ctx.lineWidth = width;
    ctx.beginPath();
    fn();
    ctx.stroke();
  }
  function heart(ctx, x, y, s, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.9);
    ctx.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.6, y - s * 1.2, x, y - s * 0.35);
    ctx.bezierCurveTo(x + s * 0.6, y - s * 1.2, x + s * 1.4, y - s * 0.1, x, y + s * 0.9);
    ctx.fill();
  }

  // ---------- all textures ----------
  function makeTextures(scene, p) {
    const ink = p.ink;
    const W = COIN_DASH.width, H = COIN_DASH.height;

    tex(scene, 'cozy-bg', W, H, ctx => drawBackground(ctx, W, H, p));

    tex(scene, 'cozy-shadow', 40, 16, ctx => {
      ctx.save();
      ctx.translate(20, 8);
      ctx.scale(1, 0.4);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 20);
      g.addColorStop(0, css(ink, 0.34));
      g.addColorStop(0.6, css(ink, 0.18));
      g.addColorStop(1, css(ink, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });

    // Player: a round mint blob with a leaf sprout, rosy cheeks and a smile. Eyes are separate.
    tex(scene, 'cozy-player', 40, 42, ctx => {
      stroke(ctx, ink, 2, () => { ctx.moveTo(20, 9); ctx.quadraticCurveTo(19, 5, 21, 2.5); });
      ctx.save();
      ctx.translate(23.5, 3.5); ctx.rotate(-0.5);
      ctx.beginPath(); ctx.ellipse(0, 0, 4.2, 2.2, 0, 0, Math.PI * 2);
      ctx.fillStyle = css(mix(p.meadow, 0x5a9a5a, 0.45)); ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = css(ink); ctx.stroke();
      ctx.restore();
      const body = () => {
        ctx.beginPath();
        ctx.moveTo(20, 8);
        ctx.bezierCurveTo(31, 8, 36, 17, 35.5, 26);
        ctx.bezierCurveTo(35, 34, 28, 37, 20, 37);
        ctx.bezierCurveTo(12, 37, 5, 34, 4.5, 26);
        ctx.bezierCurveTo(4, 17, 9, 8, 20, 8);
        ctx.closePath();
      };
      paint(ctx, body, p.player, ink, 20, 23, 16);
      cheeks(ctx, [[11, 28], [29, 28]]);
      stroke(ctx, ink, 1.6, () => ctx.arc(20, 27.5, 2.6, 0.15 * Math.PI, 0.85 * Math.PI));
    });
    tex(scene, 'cozy-eye', 8, 10, ctx => eyes(ctx, ink, [[4, 5]], 2.6));
    tex(scene, 'cozy-eye-x', 8, 10, ctx => stroke(ctx, ink, 1.6, () => {
      ctx.moveTo(1.8, 2.8); ctx.lineTo(6.2, 7.2); ctx.moveTo(6.2, 2.8); ctx.lineTo(1.8, 7.2);
    }));
    tex(scene, 'cozy-eye-happy', 8, 10, ctx => stroke(ctx, ink, 1.6, () => ctx.arc(4, 6.5, 2.6, 1.1 * Math.PI, 1.9 * Math.PI)));

    // Coin: a buttery coin with a heart, rim and shine.
    tex(scene, 'cozy-coin', 28, 28, ctx => {
      const circle = () => { ctx.beginPath(); ctx.arc(14, 14, 10.5, 0, Math.PI * 2); };
      paint(ctx, circle, p.coin, ink, 14, 14, 11);
      ctx.strokeStyle = css(dark(p.coin, 0.22), 0.7);
      ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.arc(14, 14, 7.2, 0, Math.PI * 2); ctx.stroke();
      heart(ctx, 14, 14.3, 3.4, css(mix(p.coin, p.accent, 0.75)));
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(14, 14, 8.6, 1.08 * Math.PI, 1.38 * Math.PI); ctx.stroke();
    });

    // Drone: a grumpy little rounded box with an antenna.
    tex(scene, 'cozy-drone', 36, 44, ctx => {
      stroke(ctx, ink, 1.8, () => { ctx.moveTo(18, 8); ctx.lineTo(18, 3.5); });
      ctx.fillStyle = css(p.accent);
      ctx.beginPath(); ctx.arc(18, 3.2, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 1.4; ctx.strokeStyle = css(ink); ctx.stroke();
      const box = () => { ctx.beginPath(); ctx.roundRect(4, 8, 28, 28, 9); };
      paint(ctx, box, p.drone, ink, 18, 22, 15);
      stroke(ctx, ink, 1.8, () => {
        ctx.moveTo(9, 17.5); ctx.lineTo(15, 20);
        ctx.moveTo(27, 17.5); ctx.lineTo(21, 20);
      });
      eyes(ctx, ink, [[12.8, 23], [23.2, 23]], 2);
      cheeks(ctx, [[9.5, 28], [26.5, 28]], 2.4);
      stroke(ctx, ink, 1.7, () => ctx.arc(18, 33, 3.6, 1.2 * Math.PI, 1.8 * Math.PI));
    });

    // Chaser: an eager rounded triangle with sparkly eyes and an open happy mouth.
    tex(scene, 'cozy-chaser', 36, 36, ctx => {
      const tri = () => roundPoly(ctx, [[18, 3], [33.5, 31], [2.5, 31]], 6);
      paint(ctx, tri, p.chaser, ink, 18, 20, 15);
      eyes(ctx, ink, [[13.6, 20], [22.4, 20]], 2.5);
      ctx.fillStyle = '#ffffff';
      [[12.8, 21.4], [21.6, 21.4]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 0.6, 0, Math.PI * 2); ctx.fill(); });
      ctx.fillStyle = css(ink);
      ctx.beginPath(); ctx.arc(18, 24.5, 3.4, 0, Math.PI); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f48c9c';
      ctx.beginPath(); ctx.arc(18, 26.6, 1.6, 0, Math.PI); ctx.fill();
      cheeks(ctx, [[9.5, 25], [26.5, 25]], 2.3);
    });

    // Dasher: a lavender sparkle-star with a determined, focused face.
    tex(scene, 'cozy-dasher', 40, 40, ctx => {
      const pts = [];
      for (let i = 0; i < 8; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 4;
        const r = i % 2 ? 11 : 18;
        pts.push([20 + Math.cos(a) * r, 20 + Math.sin(a) * r]);
      }
      paint(ctx, () => roundPoly(ctx, pts, 3.5), p.dasher, ink, 20, 20, 15);
      stroke(ctx, ink, 1.7, () => {
        ctx.moveTo(12.5, 16); ctx.lineTo(17.5, 18);
        ctx.moveTo(27.5, 16); ctx.lineTo(22.5, 18);
      });
      ctx.fillStyle = css(ink);
      [[15.5, 20.5], [24.5, 20.5]].forEach(([x, y]) => {
        ctx.beginPath(); ctx.ellipse(x, y, 2.1, 1.6, 0, 0, Math.PI * 2); ctx.fill();
      });
      stroke(ctx, ink, 1.6, () => { ctx.moveTo(17.5, 25); ctx.quadraticCurveTo(20, 26.5, 23, 24.2); });
      cheeks(ctx, [[13, 24], [27, 24]], 2);
    });

    // Blinker: a sleepy little cloud puff.
    tex(scene, 'cozy-blinker', 40, 36, ctx => {
      const puffs = [[11, 21, 7.5], [20, 13.5, 9], [29, 21, 7.5], [20, 23, 10], [14.5, 15.5, 6], [25.5, 15.5, 6]];
      ctx.fillStyle = css(ink);
      puffs.forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r + 1, 0, Math.PI * 2); ctx.fill(); });
      const g = ctx.createRadialGradient(14, 11, 1, 20, 19, 18);
      g.addColorStop(0, css(light(p.blinker, 0.65)));
      g.addColorStop(0.6, css(p.blinker));
      g.addColorStop(1, css(dark(p.blinker, 0.06)));
      ctx.fillStyle = g;
      puffs.forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r - 1, 0, Math.PI * 2); ctx.fill(); });
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath(); ctx.ellipse(16, 9.5, 4, 2, -0.4, 0, Math.PI * 2); ctx.fill();
      stroke(ctx, ink, 1.6, () => {
        ctx.moveTo(13.4, 20); ctx.arc(15.5, 20, 2.1, Math.PI, 0, true);
        ctx.moveTo(22.4, 20); ctx.arc(24.5, 20, 2.1, Math.PI, 0, true);
      });
      ctx.fillStyle = css(ink);
      ctx.beginPath(); ctx.ellipse(20, 25.5, 1.4, 1.8, 0, 0, Math.PI * 2); ctx.fill();
      cheeks(ctx, [[11.5, 24], [28.5, 24]], 2.2);
    });

    // Orbiter: a round pink fluff with little wings that guards the coin.
    tex(scene, 'cozy-orbiter', 40, 32, ctx => {
      [[-1, 7.5], [1, 32.5]].forEach(([side, x]) => {
        ctx.save();
        ctx.translate(x, 12); ctx.rotate(side * 0.5);
        ctx.beginPath(); ctx.ellipse(0, 0, 6, 3.6, 0, 0, Math.PI * 2);
        ctx.fillStyle = css(light(p.cream, 0.4)); ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = css(ink); ctx.stroke();
        ctx.restore();
      });
      paint(ctx, () => { ctx.beginPath(); ctx.arc(20, 16, 11.5, 0, Math.PI * 2); }, p.orbiter, ink, 20, 16, 12);
      eyes(ctx, ink, [[16, 15], [24, 15]], 2.1);
      stroke(ctx, ink, 1.4, () => {
        ctx.moveTo(17.6, 20); ctx.quadraticCurveTo(18.8, 21.6, 20, 20.2); ctx.quadraticCurveTo(21.2, 21.6, 22.4, 20);
      });
      heart(ctx, 12.2, 19.2, 1.7, 'rgba(240,110,140,0.65)');
      heart(ctx, 27.8, 19.2, 1.7, 'rgba(240,110,140,0.65)');
    });

    // Effects.
    tex(scene, 'cozy-sparkle', 16, 16, ctx => {
      const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
      g.addColorStop(0, 'rgba(255,255,240,0.9)');
      g.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#fffbe8';
      ctx.beginPath();
      ctx.moveTo(8, 0.5); ctx.quadraticCurveTo(8.9, 7.1, 15.5, 8); ctx.quadraticCurveTo(8.9, 8.9, 8, 15.5);
      ctx.quadraticCurveTo(7.1, 8.9, 0.5, 8); ctx.quadraticCurveTo(7.1, 7.1, 8, 0.5);
      ctx.fill();
    });
    tex(scene, 'cozy-heart', 12, 12, ctx => heart(ctx, 6, 6.5, 4, css(light(p.accent, 0.1))));
    tex(scene, 'cozy-ring', 48, 48, ctx => {
      ctx.strokeStyle = css(light(p.coin, 0.5));
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(24, 24, 20, 0, Math.PI * 2); ctx.stroke();
    });
    tex(scene, 'cozy-marker', 40, 40, ctx => {
      ctx.fillStyle = css(p.blinker, 0.22);
      ctx.beginPath(); ctx.arc(20, 20, 16, 0, Math.PI * 2); ctx.fill();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = css(dark(p.blinker, 0.25));
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(20, 20, 16, 0, Math.PI * 2); ctx.stroke();
    });
  }

  // A soft meadow on paper: mown stripes, clover patches, grass tufts, tiny flowers and a vignette.
  function drawBackground(ctx, w, h, p) {
    const rnd = seeded(20261028);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, css(light(p.meadow, 0.3)));
    g.addColorStop(1, css(p.meadow));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    for (let x = -h; x < w; x += 90) {
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.lineTo(x + 45, 0); ctx.lineTo(x + 45 + h * 0.45, h); ctx.lineTo(x + h * 0.45, h);
      ctx.fill();
    }
    ctx.fillStyle = css(dark(p.meadow, 0.1), 0.09);
    for (let i = 0; i < 16; i++) {
      ctx.beginPath();
      ctx.ellipse(rnd() * w, 60 + rnd() * (h - 60), 30 + rnd() * 40, 20 + rnd() * 20, rnd() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 3000; i++) {
      ctx.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.12)' : css(p.ink, 0.04);
      ctx.fillRect(rnd() * w, rnd() * h, 1.2, 1.2);
    }
    const grass = dark(p.meadow, 0.22);
    for (let i = 0; i < 80; i++) {
      const x = rnd() * w, y = 60 + rnd() * (h - 66);
      ctx.strokeStyle = css(grass, 0.75);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x - 3, y); ctx.quadraticCurveTo(x - 3.5, y - 4, x - 5.5, y - 6);
      ctx.moveTo(x, y); ctx.quadraticCurveTo(x, y - 5, x + 0.5, y - 8);
      ctx.moveTo(x + 3, y); ctx.quadraticCurveTo(x + 3.5, y - 4, x + 5.5, y - 5.5);
      ctx.stroke();
    }
    const petals = [0xfffaf0, 0xf9c4d2, 0xd7c8f2, 0xf9d2b0];
    for (let i = 0; i < 38; i++) {
      const x = rnd() * w, y = 62 + rnd() * (h - 70);
      const col = petals[Math.floor(rnd() * petals.length)];
      ctx.fillStyle = css(col, 0.95);
      for (let k = 0; k < 5; k++) {
        const a = k * Math.PI * 2 / 5 + rnd();
        ctx.beginPath(); ctx.arc(x + Math.cos(a) * 2.4, y + Math.sin(a) * 2.4, 1.9, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#f5c75b';
      ctx.beginPath(); ctx.arc(x, y, 1.3, 0, Math.PI * 2); ctx.fill();
    }
    const v = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.65);
    v.addColorStop(0, css(p.ink, 0));
    v.addColorStop(1, css(p.ink, 0.16));
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
    // Scalloped cream awning behind the HUD.
    ctx.fillStyle = css(p.ink, 0.1);
    for (let x = 0; x <= w + 16; x += 16) { ctx.beginPath(); ctx.arc(x, 41, 8, 0, Math.PI); ctx.fill(); }
    ctx.fillStyle = css(p.cream);
    ctx.fillRect(0, 0, w, 39);
    for (let x = 0; x <= w + 16; x += 16) { ctx.beginPath(); ctx.arc(x, 38.5, 8, 0, Math.PI); ctx.fill(); }
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = css(p.accent, 0.8);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, 36); ctx.lineTo(w, 36); ctx.stroke();
    ctx.setLineDash([]);
  }

  // ---------- UI ----------
  function panel(scene, w, h, p) {
    const g = scene.add.graphics();
    g.fillStyle(p.ink, 0.12).fillRoundedRect(-w / 2 + 2, -h / 2 + 6, w, h, 22);
    g.fillStyle(p.cream, 0.98).fillRoundedRect(-w / 2, -h / 2, w, h, 22);
    g.lineStyle(3, light(p.accent, 0.2), 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 22);
    g.lineStyle(1.5, p.accent, 0.6).strokeRoundedRect(-w / 2 + 7, -h / 2 + 7, w - 14, h - 14, 16);
    return g;
  }
  const textStyle = (p, size, extra) => Object.assign({
    fontFamily: FONT, fontSize: size + 'px', fontStyle: 'bold', color: hexStr(p.ink), align: 'center'
  }, extra);

  function pill(scene, p) {
    const g = scene.add.graphics();
    const draw = (w, fill) => {
      g.clear();
      g.fillStyle(p.ink, 0.1).fillRoundedRect(1, 3, w, 28, 14);
      g.fillStyle(fill, 1).fillRoundedRect(0, 0, w, 28, 14);
      g.lineStyle(2, light(p.accent, 0.25), 1).strokeRoundedRect(0, 0, w, 28, 14);
    };
    return { g, draw };
  }

  function makeHud(scene, st, p) {
    const W = COIN_DASH.width;
    const hud = scene.add.container(0, 0).setDepth(8);
    const left = pill(scene, p);
    left.draw(118, light(p.cream, 0.5));
    left.g.setPosition(14, 5);
    const coinIcon = scene.add.image(33, 19, 'cozy-coin').setScale(0.42);
    const coins = scene.add.text(50, 19, '0', textStyle(p, 18)).setOrigin(0, 0.5);
    const right = pill(scene, p);
    right.g.setPosition(W - 14 - 118, 5);
    right.draw(118, light(p.cream, 0.5));
    const clock = scene.add.graphics();
    clock.lineStyle(2, p.ink, 1).fillStyle(0xffffff, 1);
    clock.fillCircle(0, 0, 8).strokeCircle(0, 0, 8);
    clock.lineBetween(0, 0, 0, -5).lineBetween(0, 0, 3.5, 1.5);
    clock.setPosition(W - 14 - 118 + 19, 19);
    const timeText = scene.add.text(W - 14 - 118 + 34, 19, '', textStyle(p, 18)).setOrigin(0, 0.5);
    const title = scene.add.text(W / 2, 18, 'coin dash', textStyle(p, 17, { color: hexStr(dark(p.accent, 0.12)) }))
      .setOrigin(0.5);
    hud.add([left.g, coinIcon, coins, right.g, clock, timeText, title]);
    st.hud = { coins, timeText, coinIcon, right, clock, title, lastCoins: -1 };
    // Guns keep their own ammo text in the top-right corner; show it in a pill beside the timer instead.
    if (scene.ammoHud) {
      scene.ammoHud.setVisible(false);
      const ammo = pill(scene, p);
      ammo.g.setPosition(W - 14 - 118 - 10 - 104, 5);
      ammo.draw(104, light(p.cream, 0.5));
      st.hud.ammo = scene.add.text(W - 14 - 118 - 10 - 52, 19, '', textStyle(p, 17)).setOrigin(0.5);
      hud.add([ammo.g, st.hud.ammo]);
    }
  }

  function updateHud(scene, st, p, time) {
    const m = /Coins:\s*(\d+).*Time:\s*(\d+)s/.exec(scene.hud.text || '');
    const coins = m ? +m[1] : scene.coins;
    const secs = m ? +m[2] : 0;
    const h = st.hud;
    h.coins.setText(String(coins));
    h.title.setText(`score ${scene.score} · best ${Math.max(scene.bestScore(), scene.score)}`);
    h.timeText.setText(secs + 's');
    if (h.ammo) h.ammo.setText('ammo ' + scene.ammo);
    if (coins !== h.lastCoins && h.lastCoins >= 0) {
      scene.tweens.add({ targets: h.coinIcon, scale: { from: 0.62, to: 0.42 }, duration: 260, ease: 'Back.easeOut' });
    }
    h.lastCoins = coins;
  }

  function restylePause(scene, p) {
    const o = scene.pauseOverlay;
    if (!o) return;
    const [rect, text] = o.list;
    rect.setVisible(false);
    o.addAt(scene.add.rectangle(0, 0, COIN_DASH.width, COIN_DASH.height, p.cream, 0.45), 0);
    o.addAt(panel(scene, 360, 128, p), 1);
    text.setStyle(textStyle(p, 21, { lineSpacing: 10 }));
  }

  // ---------- coin pickup pop ----------
  function pop(scene, x, y, p) {
    const ring = scene.add.image(x, y, 'cozy-ring').setScale(0.12).setDepth(6);
    scene.tweens.add({ targets: ring, scale: 0.7, alpha: 0, duration: 380, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.random() * 0.4;
      const d = 24 + Math.random() * 14;
      const s = scene.add.image(x, y, i % 2 ? 'cozy-sparkle' : 'cozy-heart').setScale(0.2).setDepth(6);
      scene.tweens.add({
        targets: s, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, scale: 0.6, angle: 90,
        alpha: { from: 1, to: 0 }, duration: 520, ease: 'Quad.easeOut', onComplete: () => s.destroy()
      });
    }
    const t = scene.add.text(x, y - 12, '+1', textStyle(p, 18, {
      color: hexStr(dark(p.accent, 0.15)), stroke: '#fffaf0', strokeThickness: 4
    })).setOrigin(0.5).setDepth(7);
    scene.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 750, ease: 'Sine.easeOut', onComplete: () => t.destroy() });
  }

  // ---------- followers ----------
  const SPEC = {
    drone: { key: 'cozy-drone', oy: 22 / 44, shadowY: 15, shadowW: 0.8 },
    chaser: { key: 'cozy-chaser', oy: 20 / 36, shadowY: 13, shadowW: 0.75 },
    dasher: { key: 'cozy-dasher', oy: 0.5, shadowY: 15, shadowW: 0.8 },
    blinker: { key: 'cozy-blinker', oy: 19 / 36, shadowY: 17, shadowW: 0.8 },
    orbiter: { key: 'cozy-orbiter', oy: 0.5, shadowY: 13, shadowW: 0.6 }
  };

  function makeFollowers(scene, st) {
    const shadow = (w) => scene.add.image(0, 0, 'cozy-shadow').setScale(w / R, 1 / R).setDepth(1);
    // Player.
    scene.player.setVisible(false);
    const body = scene.add.image(0, 0, 'cozy-player').setOrigin(0.5, 23 / 42).setScale(1 / R);
    const eyeL = scene.add.image(-5.5, -2, 'cozy-eye').setScale(1 / R);
    const eyeR = scene.add.image(5.5, -2, 'cozy-eye').setScale(1 / R);
    st.player = {
      c: scene.add.container(scene.player.x, scene.player.y, [body, eyeL, eyeR]).setDepth(4),
      eyeL, eyeR, shadow: shadow(0.85),
      sx: 1, sy: 1, vx: 0, vy: 0, hop: 0, lookX: 0, lookY: 0, blinkAt: 1500, blinkUntil: 0
    };
    // Coin.
    scene.coin.setVisible(false);
    st.coin = {
      img: scene.add.image(scene.coin.x, scene.coin.y, 'cozy-coin').setScale(1 / R).setDepth(2),
      sparkle: scene.add.image(0, 0, 'cozy-sparkle').setDepth(2.1),
      shadow: shadow(0.6), appear: 0, lastX: scene.coin.x, lastY: scene.coin.y
    };
    // Enemies.
    scene.aimLines.setVisible(false);
    st.aim = scene.add.graphics().setDepth(1.6);
    st.enemies = [];
    st.followed = 0;
    scene.drones.getChildren().forEach(shape => followEnemy(scene, st, shape));
  }

  // Enemies come and go during the round (visitors, extra drones), so each one gets a follower when first seen.
  function followEnemy(scene, st, shape) {
    const spec = SPEC[shape.kind] || SPEC.drone;
    shape.setVisible(false);
    // The game flickers leaving enemies with setVisible; keep the plain shape hidden and pass that on to the sprite.
    shape.cozyShown = true;
    shape.setVisible = v => { shape.cozyShown = v; return shape; };
    const img = scene.add.image(0, 0, spec.key).setOrigin(0.5, spec.oy).setScale(1 / R);
    const f = {
      shape, spec, img, phase: st.followed++ * 1.7,
      c: scene.add.container(shape.x, shape.y, [img]).setDepth(3),
      shadow: scene.add.image(0, 0, 'cozy-shadow').setScale(spec.shadowW / R, 1 / R).setDepth(1)
    };
    if (shape.marker) {
      shape.marker.setAlpha(0);
      f.marker = scene.add.image(0, 0, 'cozy-marker').setScale(1 / R).setDepth(1.5).setVisible(false);
    }
    shape.cozy = f;
    st.enemies.push(f);
  }

  function spring(st, axis, target, dt) {
    const v = axis + 'v';
    const cur = st[v] || 0;
    st[v] = cur + ((target - st[axis]) * 320 - cur * 13) * dt;
    st[axis] += st[v] * dt;
  }

  function syncPlayer(scene, st, cfg, time, dt) {
    const f = st.player;
    const pb = scene.player.body;
    const active = !scene.paused && !scene.finished;
    const speed = Math.hypot(pb.velocity.x, pb.velocity.y);
    const moving = active && speed > 5;
    const nx = moving ? pb.velocity.x / speed : 0;
    const ny = moving ? pb.velocity.y / speed : 0;
    const k = moving ? cfg.squash : 0;
    let tx = 1 + k * (Math.abs(nx) - Math.abs(ny) * 0.6);
    let ty = 1 + k * (Math.abs(ny) - Math.abs(nx) * 0.6);
    if (moving) f.hop += dt * 15; else f.hop = 0;
    const hop = moving ? Math.abs(Math.sin(f.hop)) : 0;
    if (!moving) { const b = 0.025 * Math.sin(time / 420); tx -= b; ty += b; }
    spring(f, 'sx', tx, dt);
    spring(f, 'sy', ty, dt);
    f.c.setPosition(scene.player.x, scene.player.y + 1 - hop * 3.5);
    f.c.setScale(f.sx, f.sy);
    f.shadow.setPosition(scene.player.x, scene.player.y + 14).setScale((0.85 - hop * 0.15) / R, 1 / R);
    // Eyes look where the blob is heading; when idle they glance at the coin.
    let lx = nx, ly = ny;
    if (!moving && active) {
      const a = Phaser.Math.Angle.Between(scene.player.x, scene.player.y, scene.coin.x, scene.coin.y);
      lx = Math.cos(a) * 0.6; ly = Math.sin(a) * 0.6;
    }
    const t = Math.min(1, dt * 12);
    f.lookX += (lx - f.lookX) * t;
    f.lookY += (ly - f.lookY) * t;
    f.eyeL.setPosition(-5.5 + f.lookX * 2.6, -2 + f.lookY * 2.2);
    f.eyeR.setPosition(5.5 + f.lookX * 2.6, -2 + f.lookY * 2.2);
    if (!f.mood) {
      if (time > f.blinkAt) { f.blinkUntil = time + 120; f.blinkAt = time + 2200 + Math.random() * 2600; }
      const blink = time < f.blinkUntil ? 0.15 : 1;
      f.eyeL.setScale(1 / R, blink / R);
      f.eyeR.setScale(1 / R, blink / R);
    }
  }

  function syncCoin(scene, st, p, time) {
    const f = st.coin;
    const x = scene.coin.x, y = scene.coin.y;
    if (scene.coins !== st.coins) {
      // The coin was collected and has already jumped: celebrate where it was.
      pop(scene, f.lastX, f.lastY, p);
      st.player.sxv = (st.player.sxv || 0) + 5;
      st.player.syv = (st.player.syv || 0) - 5;
      f.appear = time;
      st.coins = scene.coins;
    }
    f.lastX = x; f.lastY = y;
    const grow = f.appear ? Phaser.Math.Easing.Back.Out(Math.min(1, (time - f.appear) / 320)) : 1;
    const bob = Math.sin(time / 320) * 2.5;
    f.img.setPosition(x, y - 2 + bob).setScale((0.84 + 0.16 * Math.cos(time / 280)) * grow / R, grow / R);
    f.shadow.setPosition(x, y + 11).setScale((0.6 - bob * 0.02) * grow / R, 1 / R);
    const tw = Math.max(0, Math.sin(time / 380));
    f.sparkle.setPosition(x + 7, y - 9 + bob).setScale(tw * 0.7 * grow / R).setAngle(time / 12);
  }

  function syncEnemies(scene, st, time, dt) {
    const e = COIN_DASH.enemies;
    st.aim.clear();
    scene.drones.getChildren().forEach(shape => { if (!shape.cozy) followEnemy(scene, st, shape); });
    st.enemies = st.enemies.filter(f => {
      if (f.shape.active) return true;
      f.c.destroy();
      f.shadow.destroy();
      if (f.marker) f.marker.destroy();
      return false;
    });
    st.enemies.forEach(f => {
      const s = f.shape;
      const v = s.body.velocity;
      const t = time / 1000 + f.phase;
      let ox = 0, oy = 0, rot = 0, sx = 1, sy = 1;
      if (s.kind === 'drone') {
        oy = Math.sin(t * 3.2) * 2;
        rot = Phaser.Math.Clamp(v.x / 600, -0.18, 0.18);
      } else if (s.kind === 'chaser') {
        const hop = Math.abs(Math.sin(t * 11));
        oy = -hop * 3;
        sy = 0.94 + hop * 0.08; sx = 2 - sy;
        rot = Phaser.Math.Clamp(v.x / 300, -0.3, 0.3);
      } else if (s.kind === 'dasher') {
        if (s.state === 'windup') {
          ox = (Math.random() - 0.5) * 3;
          sx = sy = 1.08 + 0.05 * Math.sin(time / 40);
          if (s.target) {
            const col = e.dasher.color;
            const dist = Phaser.Math.Distance.Between(s.x, s.y, s.target.x, s.target.y);
            const ang = Phaser.Math.Angle.Between(s.x, s.y, s.target.x, s.target.y);
            st.aim.fillStyle(col, 0.55);
            for (let d = 22; d < dist; d += 12) st.aim.fillCircle(s.x + Math.cos(ang) * d, s.y + Math.sin(ang) * d, 2.4);
            st.aim.lineStyle(2, col, 0.7).strokeCircle(s.target.x, s.target.y, 9 + 2 * Math.sin(time / 60));
          }
        } else if (s.state === 'dash') {
          const sp = Math.hypot(v.x, v.y) || 1;
          const ax = Math.abs(v.x) / sp, ay = Math.abs(v.y) / sp;
          sx = 1 + 0.3 * ax - 0.15 * ay; sy = 1 + 0.3 * ay - 0.15 * ax;
        } else {
          sy = 1 + 0.04 * Math.sin(t * 4); sx = 2 - sy;
        }
      } else if (s.kind === 'blinker') {
        oy = Math.sin(t * 2.2) * 3;
        rot = Math.sin(t * 1.3) * 0.08;
        if (f.marker) {
          f.marker.setVisible(s.marker.visible);
          if (s.marker.visible) {
            f.marker.setPosition(s.marker.x, s.marker.y).setScale(s.marker.scaleX / R).setAngle(time / 8);
          }
        }
      } else if (s.kind === 'orbiter') {
        oy = Math.sin(t * 5) * 1.5;
        sy = 1 + 0.06 * Math.sin(t * 30);
      }
      // Guns flash a hit enemy white through its plain shape's fill colour.
      if (s.baseColor !== undefined && s.fillColor === 0xffffff) f.img.setTintFill(0xffffff); else f.img.clearTint();
      f.c.setPosition(s.x + ox, s.y + oy).setRotation(rot).setScale(sx, sy).setAlpha(s.alpha).setVisible(s.cozyShown);
      f.shadow.setPosition(s.x, s.y + f.spec.shadowY).setAlpha(s.alpha).setVisible(s.cozyShown)
        .setScale(f.spec.shadowW * (1 - oy * 0.03) / R, 1 / R);
    });
  }

  function injectPageStyle(p) {
    if (document.getElementById('cozy-style')) return;
    const s = document.createElement('style');
    s.id = 'cozy-style';
    s.textContent = `
      body { background: ${hexStr(light(p.cream, 0))}; color: ${hexStr(p.ink)}; }
      header > p:first-child { color: ${hexStr(dark(p.accent, 0.1))}; }
      #game { border: 3px solid ${hexStr(light(p.accent, 0.45))}; border-radius: 20px;
        box-shadow: 0 10px 30px ${css(p.ink, 0.18)}; }`;
    document.head.appendChild(s);
  }

  window.GraphicsCozy = {
    create(scene) {
      const cfg = settings();
      if (!cfg.enabled) return;
      const p = cfg.palette;
      injectPageStyle(p);
      makeTextures(scene, p);
      if (scene.background) scene.background.setVisible(false);
      scene.add.image(0, 0, 'cozy-bg').setOrigin(0).setScale(1 / R).setDepth(-10);
      scene.hud.setVisible(false);
      const st = scene.cozy = { coins: scene.coins };
      makeHud(scene, st, p);
      makeFollowers(scene, st);
      restylePause(scene, p);
      const onPost = (time, delta) => {
        const dt = delta > 0 ? Math.min(0.05, delta / 1000) : 1 / 60;
        syncPlayer(scene, st, cfg, time, dt);
        syncCoin(scene, st, p, time);
        syncEnemies(scene, st, time, dt);
        updateHud(scene, st, p, time);
      };
      scene.events.on('postupdate', onPost);
      scene.events.once('shutdown', () => scene.events.off('postupdate', onPost));
    },

    // Swap the plain game-over box for a rounded cream panel, and give the blob a matching face.
    finish(scene, reason) {
      const st = scene.cozy;
      if (!st) return;
      const p = settings().palette;
      const caught = /caught/i.test(reason || '');
      const f = st.player;
      f.mood = caught ? 'dizzy' : 'happy';
      [f.eyeL, f.eyeR].forEach(e => e.setTexture(caught ? 'cozy-eye-x' : 'cozy-eye-happy').setScale(1 / R));
      if (caught) scene.cameras.main.shake(180, 0.006);
      const W = COIN_DASH.width, H = COIN_DASH.height;
      scene.add.rectangle(W / 2, H / 2, W, H, p.cream, 0.4).setDepth(19);
      const box = panel(scene, 480, 196, p).setPosition(W / 2, H / 2).setDepth(20);
      if (scene.finishPanel) scene.finishPanel.setVisible(false);
      if (scene.finishText) scene.finishText.setStyle(textStyle(p, 22, { lineSpacing: 10 })).setDepth(21);
      box.setScale(0.6);
      scene.tweens.add({ targets: box, scale: 1, duration: 320, ease: 'Back.easeOut' });
    }
  };
}());
