/* global Phaser, COIN_DASH */
class CoinDash extends Phaser.Scene {
  constructor() { super('CoinDash'); }

  create() {
    const c = COIN_DASH;
    this.score = 0;
    this.coins = 0;
    this.coinPoints = 0;
    this.combo = 0;
    this.lastCoinAt = -Infinity;
    this.finished = false;
    this.physics.world.setBounds(0, 44, c.width, c.height - 44);
    this.background = this.add.grid(c.width / 2, c.height / 2, c.width, c.height, 40, 40,
      c.colors.background, 1, 0x24334b, 0.45);
    this.hud = this.add.text(18, 12, '', { font: '18px monospace', color: '#ffffff' });
    this.player = this.add.rectangle(c.width / 2, c.height / 2, 24, 24, c.colors.player);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.coin = this.add.circle(100, 100, 9, c.colors.coin);
    this.physics.add.existing(this.coin);
    this.coin.body.setCircle(9);
    this.placeCoin();
    this.drones = this.physics.add.group();
    for (let i = 0; i < c.droneCount; i++) {
      const drone = this.add.rectangle(90 + i * 270, 100, 26, 26, c.colors.drone);
      this.drones.add(drone);
      drone.body.setCollideWorldBounds(true).setBounce(1, 1);
      const angle = (35 + i * 105) * Math.PI / 180;
      drone.body.setVelocity(Math.cos(angle) * c.droneSpeed, Math.sin(angle) * c.droneSpeed);
      drone.kind = 'drone';
    }
    this.aimLines = this.add.graphics();
    this.spawnEnemies();
    this.setupGuns();
    this.physics.add.overlap(this.player, this.coin, () => {
      if (this.finished) return;
      this.collectCoin();
      window.SfxRetro?.coin();
      this.placeCoin();
    });
    this.physics.add.overlap(this.player, this.drones,
      (player, enemy) => {
        if (!this.finished) window.SfxRetro?.caught();
        this.finish(`A ${enemy.kind} caught you!`);
      },
      (player, enemy) => !enemy.harmless);
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,R');
    this.input.keyboard.on('keydown-R', () => { window.SfxRetro?.restart(); this.scene.restart(); });
    this.paused = false;
    this.pauseOverlay = this.add.container(c.width / 2, c.height / 2, [
      this.add.rectangle(0, 0, 360, 110, 0x0a1120, 0.95),
      this.add.text(0, 0, 'Paused\nPress P or Esc to resume',
        { font: '22px monospace', color: '#ffffff', align: 'center', lineSpacing: 12 }).setOrigin(0.5)
    ]).setDepth(10).setVisible(false);
    this.input.keyboard.on('keydown-P', () => this.togglePause());
    this.input.keyboard.on('keydown-ESC', () => this.togglePause());
    // Lo-fi music: one shared instance, so restarts never stack copies.
    window.LofiMusic.start(this.sound.context);
    this.input.keyboard.on('keydown', () => window.LofiMusic.resume());
    this.input.keyboard.on('keydown-M', () => window.LofiMusic.toggleMute());
    window.GraphicsCozy?.create(this);
  }

  setupGuns() {
    const g = COIN_DASH.guns;
    this.bullets = this.physics.add.group();
    this.facing = new Phaser.Math.Vector2(1, 0);
    this.nextShotAt = 0;
    if (!g?.enabled) return;
    this.fireKey = this.input.keyboard.addKey(g.fireKey);
    this.ammo = g.startAmmo;
    this.ammoHud = this.add.text(COIN_DASH.width - 18, 12, '', { font: '18px monospace', color: '#ffffff' })
      .setOrigin(1, 0);
    // The gun pickup: a small barrel shape that waits off-field until it is due.
    this.gunPickup = this.add.rectangle(0, 0, 22, 10, g.pickup.color).setStrokeStyle(2, 0xffffff)
      .setVisible(false);
    this.physics.add.existing(this.gunPickup);
    this.gunPickup.body.enable = false;
    this.nextPickupAt = g.pickup.firstAfterMs;
    this.physics.add.overlap(this.player, this.gunPickup, () => this.collectGun());
    // Enemies that are fading in or teleporting are harmless, and bullets pass through them too.
    this.physics.add.overlap(this.bullets, this.drones,
      (bullet, enemy) => this.hitEnemy(bullet, enemy),
      (bullet, enemy) => !enemy.harmless);
  }

  updateGuns() {
    const g = COIN_DASH.guns;
    if (!g?.enabled) return;
    if (!this.gunPickup.visible && this.enemyClock >= this.nextPickupAt) {
      const p = this.enemySpawnPoint();
      this.gunPickup.setPosition(p.x, p.y).setVisible(true);
      this.gunPickup.body.enable = true;
      this.gunPickup.body.reset(p.x, p.y);
    }
    if (this.gunPickup.visible) this.gunPickup.setScale(1 + 0.12 * Math.sin(this.enemyClock / 120));
    this.ammoHud.setText(`Ammo: ${this.ammo}`);
    if (this.fireKey.isDown && this.ammo > 0 && this.enemyClock >= this.nextShotAt) {
      this.nextShotAt = this.enemyClock + g.cooldownMs;
      this.ammo--;
      const bullet = this.add.circle(this.player.x, this.player.y, g.bulletRadius, g.color);
      this.bullets.add(bullet);
      bullet.body.setCircle(g.bulletRadius);
      bullet.body.setVelocity(this.facing.x * g.bulletSpeed, this.facing.y * g.bulletSpeed);
      window.SfxRetro?.shoot?.();
    }
    const bounds = this.physics.world.bounds;
    this.bullets.getChildren().slice().forEach(bullet => {
      if (!bounds.contains(bullet.x, bullet.y)) bullet.destroy();
    });
  }

  collectGun() {
    const p = COIN_DASH.guns.pickup;
    if (this.finished || !this.gunPickup.visible) return;
    this.ammo = Math.min(p.maxAmmo, this.ammo + p.ammo);
    this.gunPickup.setVisible(false);
    this.gunPickup.body.enable = false;
    this.nextPickupAt = this.enemyClock + p.respawnMs;
    window.SfxRetro?.pickup?.();
  }

  hitEnemy(bullet, enemy) {
    const g = COIN_DASH.guns;
    // One bullet can overlap two enemies in the same step; it only counts once.
    if (!bullet.active || !enemy.active) return;
    bullet.destroy();
    enemy.hp = (enemy.hp ?? g.enemyHealth) - g.damage;
    if (enemy.hp <= 0) {
      window.SfxRetro?.kill?.();
      if (enemy.marker) enemy.marker.destroy();
      enemy.destroy();
      return;
    }
    window.SfxRetro?.hit?.();
    // Flash white briefly so the hit reads clearly.
    if (enemy.baseColor === undefined) enemy.baseColor = enemy.fillColor;
    enemy.setFillStyle(0xffffff);
    this.time.delayedCall(g.hitFlashMs, () => { if (enemy.active) enemy.setFillStyle(enemy.baseColor); });
  }

  togglePause() {
    if (this.finished) return;
    this.paused = !this.paused;
    if (this.paused) this.physics.pause();
    else this.physics.resume();
    this.pauseOverlay.setVisible(this.paused);
  }

  // Coins are the score boost: grabbing the next one quickly raises a combo multiplier.
  collectCoin() {
    const s = COIN_DASH.scoring;
    this.combo = this.enemyClock - this.lastCoinAt <= s.comboWindowMs ? Math.min(s.maxCombo, this.combo + 1) : 1;
    this.lastCoinAt = this.enemyClock;
    const points = s.coinPoints * this.combo;
    this.coins++;
    this.coinPoints += points;
    const popup = this.add.text(this.coin.x, this.coin.y - 12, `+${points}${this.combo > 1 ? ` x${this.combo}` : ''}`,
      { font: 'bold 16px monospace', color: '#ffd166' }).setOrigin(0.5).setDepth(5);
    this.tweens.add({ targets: popup, y: popup.y - 36, alpha: 0, duration: 800, onComplete: () => popup.destroy() });
  }

  placeCoin() {
    const c = COIN_DASH;
    // Avoid spawning the next coin directly underneath the player.
    let x, y;
    do {
      x = Phaser.Math.Between(25, c.width - 25);
      y = Phaser.Math.Between(70, c.height - 25);
    } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 60);
    this.coin.setPosition(x, y);
    this.coin.body.reset(x, y);
  }

  // A random spot that is not too close to the player, so no enemy spawns on top of them.
  enemySpawnPoint() {
    const c = COIN_DASH;
    let x, y;
    do {
      x = Phaser.Math.Between(40, c.width - 40);
      y = Phaser.Math.Between(84, c.height - 40);
    } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < c.enemies.spawnMinDistance);
    return { x, y };
  }

  spawnEnemies() {
    // Enemy timers run on their own clock, which stops while the game is paused.
    this.enemyClock = 0;
    this.nextVisitAt = COIN_DASH.enemies.visits.firstAfterMs;
    this.extraDrones = 0;
  }

  // A visit setting eased from its starting value to its hardest value over `difficulty.rampSeconds`.
  rampVisit(key) {
    const progress = Math.min(1, this.enemyClock / (COIN_DASH.difficulty.rampSeconds * 1000));
    return Phaser.Math.Linear(COIN_DASH.enemies.visits[key], COIN_DASH.difficulty.end[key], progress);
  }

  // Later in the round more drones join; they fade in like visitors but never leave.
  spawnExtraDrone() {
    const c = COIN_DASH;
    const p = this.enemySpawnPoint();
    const drone = this.add.rectangle(p.x, p.y, 26, 26, c.colors.drone);
    this.drones.add(drone);
    drone.body.setCollideWorldBounds(true).setBounce(1, 1);
    this.physics.velocityFromAngle(Phaser.Math.Between(0, 359), c.droneSpeed, drone.body.velocity);
    drone.kind = 'drone';
    drone.arrived = false;
    drone.harmless = true;
    drone.bornAt = this.enemyClock;
    drone.leavesAt = Infinity;
  }

  // The special enemies only visit: one appears, stays a few seconds, then leaves.
  spawnVisitor(kind) {
    const e = COIN_DASH.enemies;
    const now = this.enemyClock;
    const p = this.enemySpawnPoint();
    let shape;
    if (kind === 'chaser') {
      shape = this.add.triangle(p.x, p.y, 0, 24, 12, 0, 24, 24, e.chaser.color);
    } else if (kind === 'dasher') {
      shape = this.add.star(p.x, p.y, 4, 6, 15, e.dasher.color);
      shape.state = 'rest';
      shape.nextAt = now + e.visits.arriveMs + e.dasher.restMs / 2;
    } else if (kind === 'blinker') {
      shape = this.add.star(p.x, p.y, 6, 8, 14, e.blinker.color);
      shape.nextAt = now + e.blinker.blinkEveryMs;
      shape.marker = this.add.circle(0, 0, 16).setStrokeStyle(2, e.blinker.color).setVisible(false);
    } else {
      shape = this.add.circle(p.x, p.y, 10, e.orbiter.color);
    }
    this.drones.add(shape);
    shape.kind = kind;
    shape.visitor = true;
    shape.arrived = false;
    shape.harmless = true;
    shape.bornAt = now;
    shape.leavesAt = now + this.rampVisit('stayMs');
    shape.body.setCollideWorldBounds(true);
    if (kind === 'blinker') {
      shape.body.setBounce(1, 1);
      this.physics.velocityFromAngle(Phaser.Math.Between(0, 359), e.blinker.speed, shape.body.velocity);
    } else if (kind === 'orbiter') {
      shape.body.setCircle(10).setCollideWorldBounds(false);
      shape.angle0 = Math.random() * Math.PI * 2;
    }
  }

  updateVisits(time) {
    const v = COIN_DASH.enemies.visits;
    const d = COIN_DASH.difficulty;
    while (this.extraDrones < d.extraDronesAtSeconds.length
      && time >= d.extraDronesAtSeconds[this.extraDrones] * 1000) {
      this.spawnExtraDrone();
      this.extraDrones++;
    }
    const arrivals = this.drones.getChildren().filter(enemy => enemy.bornAt !== undefined);
    const visitors = arrivals.filter(enemy => enemy.visitor);
    arrivals.forEach(enemy => {
      if (time >= enemy.leavesAt) {
        if (enemy.marker) enemy.marker.destroy();
        enemy.destroy();
      } else if (!enemy.arrived) {
        // Fade in harmlessly so the player sees it coming.
        const t = (time - enemy.bornAt) / v.arriveMs;
        enemy.setAlpha(Math.min(1, t));
        if (t >= 1) { enemy.arrived = true; enemy.harmless = false; }
      } else if (enemy.leavesAt - time < v.leaveWarnMs) {
        // Flicker to warn that it is about to leave.
        enemy.setVisible(Math.floor(time / 100) % 2 === 0);
      }
    });
    if (time >= this.nextVisitAt && visitors.length < Math.round(this.rampVisit('maxAtOnce'))) {
      // Avoid sending the same kind twice in a row when there is a choice.
      const kinds = v.kinds.filter(kind => kind !== this.lastVisitor);
      this.lastVisitor = Phaser.Utils.Array.GetRandom(kinds.length ? kinds : v.kinds);
      this.spawnVisitor(this.lastVisitor);
      this.nextVisitAt = time + this.rampVisit('everyMs');
    }
  }

  updateEnemies(delta) {
    const e = COIN_DASH.enemies;
    const time = (this.enemyClock += delta);
    const dt = delta / 1000;
    this.aimLines.clear();
    this.updateVisits(time);
    this.drones.getChildren().forEach(enemy => {
      const body = enemy.body;
      if (enemy.kind === 'chaser') {
        // Ease the velocity towards the player's direction instead of snapping to it.
        const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
        const t = Math.min(1, e.chaser.turnRate * dt);
        body.velocity.x += (Math.cos(angle) * e.chaser.speed - body.velocity.x) * t;
        body.velocity.y += (Math.sin(angle) * e.chaser.speed - body.velocity.y) * t;
        enemy.setRotation(Math.atan2(body.velocity.y, body.velocity.x) + Math.PI / 2);
      } else if (enemy.kind === 'dasher') {
        this.updateDasher(enemy, time, e.dasher);
      } else if (enemy.kind === 'blinker' && enemy.arrived) {
        this.updateBlinker(enemy, time, e.blinker);
      } else if (enemy.kind === 'orbiter') {
        const angle = enemy.angle0 + (time / 1000) * e.orbiter.angularSpeed;
        const tx = this.coin.x + Math.cos(angle) * e.orbiter.radius;
        const ty = this.coin.y + Math.sin(angle) * e.orbiter.radius;
        // Head for the orbit point, but cap the speed so it visibly travels when the coin moves.
        const v = new Phaser.Math.Vector2(tx - enemy.x, ty - enemy.y).scale(1 / Math.max(dt, 0.001));
        if (v.length() > e.orbiter.maxSpeed) v.setLength(e.orbiter.maxSpeed);
        body.setVelocity(v.x, v.y);
      }
    });
  }

  updateDasher(dasher, time, cfg) {
    if (dasher.state === 'rest') {
      dasher.body.setVelocity(0, 0);
      if (time >= dasher.nextAt) {
        dasher.state = 'windup';
        dasher.nextAt = time + cfg.windupMs;
        dasher.target = new Phaser.Math.Vector2(this.player.x, this.player.y);
      }
    } else if (dasher.state === 'windup') {
      dasher.setAlpha(Math.floor(time / 90) % 2 ? 1 : 0.4);
      dasher.rotation += 0.25;
      this.aimLines.lineStyle(2, cfg.color, 0.5)
        .lineBetween(dasher.x, dasher.y, dasher.target.x, dasher.target.y);
      if (time >= dasher.nextAt) {
        dasher.state = 'dash';
        dasher.setAlpha(1);
        dasher.nextAt = time + cfg.dashMs;
        const angle = Phaser.Math.Angle.Between(dasher.x, dasher.y, dasher.target.x, dasher.target.y);
        this.physics.velocityFromRotation(angle, cfg.dashSpeed, dasher.body.velocity);
      }
    } else if (time >= dasher.nextAt) {
      dasher.state = 'rest';
      dasher.nextAt = time + cfg.restMs;
    }
  }

  updateBlinker(blinker, time, cfg) {
    if (!blinker.harmless && time >= blinker.nextAt) {
      // Fade out and show where it will reappear; it cannot hurt the player meanwhile.
      const p = this.enemySpawnPoint();
      blinker.harmless = true;
      blinker.setAlpha(0.25);
      blinker.marker.setPosition(p.x, p.y).setVisible(true);
      blinker.nextAt = time + cfg.warnMs;
    } else if (blinker.harmless && time >= blinker.nextAt) {
      blinker.harmless = false;
      blinker.setAlpha(1);
      blinker.body.reset(blinker.marker.x, blinker.marker.y);
      blinker.marker.setVisible(false);
      this.physics.velocityFromAngle(Phaser.Math.Between(0, 359), cfg.speed, blinker.body.velocity);
      blinker.nextAt = time + cfg.blinkEveryMs;
    }
    if (blinker.marker.visible) blinker.marker.setScale(1 + 0.15 * Math.sin(time / 80));
  }

  update(time, delta) {
    if (this.finished || this.paused) return;
    const dx = Number(this.cursors.right.isDown || this.keys.D.isDown)
      - Number(this.cursors.left.isDown || this.keys.A.isDown);
    const dy = Number(this.cursors.down.isDown || this.keys.S.isDown)
      - Number(this.cursors.up.isDown || this.keys.W.isDown);
    const direction = new Phaser.Math.Vector2(dx, dy).normalize().scale(COIN_DASH.playerSpeed);
    this.player.body.setVelocity(direction.x, direction.y);
    if (dx || dy) this.facing.set(dx, dy).normalize();
    this.updateEnemies(delta);
    this.updateGuns();
    // Surviving earns points steadily; coins add their boost on top.
    const seconds = Math.floor(this.enemyClock / 1000);
    this.score = Math.floor(this.enemyClock / 1000 * COIN_DASH.scoring.pointsPerSecond) + this.coinPoints;
    const comboLive = this.combo > 1 && this.enemyClock - this.lastCoinAt <= COIN_DASH.scoring.comboWindowMs;
    this.hud.setText(`Score: ${this.score}   Coins: ${this.coins}${comboLive ? ` x${this.combo}` : ''}`
      + `   Time: ${seconds}s   Best: ${Math.max(this.bestScore(), this.score)}`);
  }

  // The best score is kept in this browser; storage can be unavailable, so failures are ignored.
  bestScore() {
    try { return Number(localStorage.getItem('coinDash.bestScore')) || 0; } catch { return 0; }
  }

  finish(reason) {
    if (this.finished) return;
    this.finished = true;
    this.physics.pause();
    window.LofiMusic.duck();
    const c = COIN_DASH;
    const best = this.bestScore();
    if (this.score > best) {
      try { localStorage.setItem('coinDash.bestScore', String(this.score)); } catch { /* not saved */ }
    }
    const seconds = Math.floor(this.enemyClock / 1000);
    this.finishPanel = this.add.rectangle(c.width / 2, c.height / 2, 500, 200, 0x0a1120, 0.95).setDepth(10);
    this.finishText = this.add.text(c.width / 2, c.height / 2,
      `${reason}\nScore: ${this.score}${this.score > best ? '  NEW BEST!' : `  (best ${best})`}`
      + `\n${this.coins} coins · survived ${seconds}s\nPress R to try again`,
      { font: '24px monospace', color: '#ffffff', align: 'center', lineSpacing: 12 }
    ).setOrigin(0.5).setDepth(10);
    window.GraphicsCozy?.finish(this, reason);
  }
}
window.coinDashGame = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: COIN_DASH.width,
  height: COIN_DASH.height,
  backgroundColor: COIN_DASH.colors.background,
  physics: { default: 'arcade', arcade: { debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
  scene: CoinDash
});
