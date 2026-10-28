/* global Phaser, COIN_DASH */
class CoinDash extends Phaser.Scene {
  constructor() { super('CoinDash'); }

  create() {
    const c = COIN_DASH;
    this.score = 0;
    this.finished = false;
    this.deadline = this.time.now + c.roundSeconds * 1000;
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
    this.physics.add.overlap(this.player, this.coin, () => {
      if (this.finished) return;
      this.score++;
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

  togglePause() {
    if (this.finished) return;
    this.paused = !this.paused;
    if (this.paused) {
      this.pausedAt = this.time.now;
      this.physics.pause();
    } else {
      // Push the deadline back so paused time does not count against the round.
      this.deadline += this.time.now - this.pausedAt;
      this.physics.resume();
    }
    this.pauseOverlay.setVisible(this.paused);
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
    const e = COIN_DASH.enemies;
    // Enemy timers run on their own clock, which stops while the game is paused.
    this.enemyClock = 0;
    const now = 0;
    const add = (kind, shape) => {
      this.drones.add(shape);
      shape.kind = kind;
      shape.body.setCollideWorldBounds(true);
      return shape;
    };
    for (let i = 0; i < e.chaser.count; i++) {
      const p = this.enemySpawnPoint();
      add('chaser', this.add.triangle(p.x, p.y, 0, 24, 12, 0, 24, 24, e.chaser.color));
    }
    for (let i = 0; i < e.dasher.count; i++) {
      const p = this.enemySpawnPoint();
      const dasher = add('dasher', this.add.star(p.x, p.y, 4, 6, 15, e.dasher.color));
      dasher.state = 'rest';
      dasher.nextAt = now + e.dasher.restMs * (1 + i * 0.5);
    }
    for (let i = 0; i < e.blinker.count; i++) {
      const p = this.enemySpawnPoint();
      const blinker = add('blinker', this.add.star(p.x, p.y, 6, 8, 14, e.blinker.color));
      blinker.body.setBounce(1, 1);
      this.physics.velocityFromAngle(Phaser.Math.Between(0, 359), e.blinker.speed, blinker.body.velocity);
      blinker.nextAt = now + e.blinker.blinkEveryMs;
      blinker.marker = this.add.circle(0, 0, 16).setStrokeStyle(2, e.blinker.color).setVisible(false);
    }
    for (let i = 0; i < e.orbiter.count; i++) {
      const orbiter = add('orbiter', this.add.circle(this.coin.x, this.coin.y, 10, e.orbiter.color));
      orbiter.body.setCircle(10).setCollideWorldBounds(false);
      orbiter.angle0 = (i / e.orbiter.count) * Math.PI * 2;
    }
  }

  updateEnemies(delta) {
    const e = COIN_DASH.enemies;
    const time = (this.enemyClock += delta);
    const dt = delta / 1000;
    this.aimLines.clear();
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
      } else if (enemy.kind === 'blinker') {
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
    this.updateEnemies(delta);
    const seconds = Math.max(0, Math.ceil((this.deadline - this.time.now) / 1000));
    this.hud.setText(`Coins: ${this.score}                       Time: ${seconds}s`);
    if (seconds !== this.lastSecond && seconds > 0 && seconds <= (COIN_DASH.sfxTickSeconds ?? 0)) window.SfxRetro?.tick(seconds);
    this.lastSecond = seconds;
    if (seconds === 0) { window.SfxRetro?.timeUp(); this.finish('Time is up!'); }
  }

  finish(reason) {
    if (this.finished) return;
    this.finished = true;
    this.physics.pause();
    window.LofiMusic.duck();
    const c = COIN_DASH;
    this.finishPanel = this.add.rectangle(c.width / 2, c.height / 2, 460, 150, 0x0a1120, 0.95);
    this.finishText = this.add.text(c.width / 2, c.height / 2,
      `${reason}\n${this.score} coins collected\nPress R to try again`,
      { font: '24px monospace', color: '#ffffff', align: 'center', lineSpacing: 12 }
    ).setOrigin(0.5);
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
