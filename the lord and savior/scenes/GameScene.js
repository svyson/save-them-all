class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  preload() {
    this.load.spritesheet(
      'player',
      'sprite.png',
      { frameWidth: 32, frameHeight: 32 }
    );

    this.load.audio('ambient_rain', 'audio/rain.mp3');
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    /* ================= MAP ================= */
    this.mapWidth = W * 2;
    this.mapHeight = H * 2;

    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a0a, 1);
    bg.fillRect(0, 0, this.mapWidth, this.mapHeight);

    for (let i = 0; i < 140; i++) {
      bg.fillStyle(0x151515, 1);
      bg.fillRect(
        Phaser.Math.Between(0, this.mapWidth),
        Phaser.Math.Between(0, this.mapHeight),
        Phaser.Math.Between(60, 140),
        Phaser.Math.Between(60, 140)
      );
    }

    bg.lineStyle(10, 0x0f0f0f, 1);
    for (let i = 0; i < 25; i++) {
      bg.strokeLineShape(
        new Phaser.Geom.Line(
          0,
          Phaser.Math.Between(0, this.mapHeight),
          this.mapWidth,
          Phaser.Math.Between(0, this.mapHeight)
        )
      );
    }

    /* ================= LIGHTS ================= */
    this.lights.enable();
    this.lights.setAmbientColor(0x050505);

    /* ================= STATS ================= */
    this.hp = 100;
    this.stamina = 100;
    this.battery = 3;
    this.maxHp = 100;
    this.maxStamina = 100;

    this.footerY = this.mapHeight - 140;

    /* ================= LOAD SAVE ================= */
    let startX = this.mapWidth / 2;
    let startY = this.footerY - 120;

    const saved = localStorage.getItem('save_saveThemAll');
    if (saved) {
      try {
        const d = JSON.parse(saved);
        startX = d.x ?? startX;
        startY = d.y ?? startY;
        this.hp = d.hp ?? this.hp;
        this.stamina = d.stamina ?? this.stamina;
        this.battery = d.battery ?? this.battery;
      } catch {}
    }

    /* ================= PLAYER ================= */
    this.player = this.add.sprite(startX, startY, 'player');
    this.player.setScale(1.3);
    this.player.setTint(0x666666);
    this.player.setPipeline('Light2D');

    this.lastDir = 'down'; // 🔥 KLUCZ DO STABILNOŚCI

    /* ================= CAMERA ================= */
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setBounds(0, 0, this.mapWidth, this.mapHeight);

    /* ================= ANIMATIONS ================= */
    this.anims.create({
      key: 'walk_up',
      frames: this.anims.generateFrameNumbers('player', { start: 0, end: 2 }),
      frameRate: 8,
      repeat: -1
    });

    this.anims.create({
      key: 'walk_down',
      frames: this.anims.generateFrameNumbers('player', { start: 3, end: 5 }),
      frameRate: 8,
      repeat: -1
    });

    this.anims.create({
      key: 'walk_side',
      frames: this.anims.generateFrameNumbers('player', { start: 6, end: 8 }),
      frameRate: 8,
      repeat: -1
    });

    this.anims.create({
      key: 'idle',
      frames: [{ key: 'player', frame: 4 }]
    });

    this.player.play('idle');

    /* ================= INPUT ================= */
    this.keys = this.input.keyboard.addKeys({
      W: 'W', A: 'A', S: 'S', D: 'D', SHIFT: 'SHIFT'
    });

    this.input.keyboard.on('keydown-ESC', () => {
      if (!this.scene.isActive('PauseMenu')) {
        this.scene.launch('PauseMenu');
        this.scene.pause();
      }
    });

    /* ================= LIGHT ================= */
    this.light = this.lights.addLight(this.player.x, this.player.y, 260);
    this.light.setIntensity(2.2);

    /* ================= UI ================= */
    this.add.text(20, 16, 'HP', { font: '12px Arial', fill: '#fff' }).setScrollFactor(0);
    this.add.rectangle(50, 16, 104, 14, 0x000000).setOrigin(0).setScrollFactor(0);
    this.hpBar = this.add.rectangle(52, 18, 100, 10, 0x22ff66).setOrigin(0).setScrollFactor(0);

    this.add.text(20, 36, 'STAMINA', { font: '12px Arial', fill: '#fff' }).setScrollFactor(0);
    this.add.rectangle(80, 36, 104, 14, 0x000000).setOrigin(0).setScrollFactor(0);
    this.staminaBar = this.add.rectangle(82, 38, 100, 10, 0x3399ff).setOrigin(0).setScrollFactor(0);

    this.add.text(20, 58, 'BATTERY', { font: '12px Arial', fill: '#fff' }).setScrollFactor(0);

    const bx = 90, by = 58;
    this.add.rectangle(bx - 6, by + 4, 4, 8, 0xffffff).setOrigin(0).setScrollFactor(0);
    this.add.rectangle(bx, by, 46, 16, 0x000000).setOrigin(0).setScrollFactor(0);

    this.batterySegments = [];
    for (let i = 0; i < 3; i++) {
      const seg = this.add.rectangle(bx + 2 + i * 14, by + 2, 12, 12, 0xffff66)
        .setOrigin(0).setScrollFactor(0);
      this.batterySegments.push(seg);
    }

    /* ================= FOOTERS ================= */
    this.worldFooterTitle = this.add.text(
      this.mapWidth / 2, this.footerY,
      'SAVE THEM ALL', { font: '18px Arial', fill: '#fff' }
    ).setOrigin(0.5);

    this.worldFooterInfo = this.add.text(
      this.mapWidth / 2, this.footerY + 30,
      'EU: 112  |  PL: 116 123  |  USA: 988  |  findahelpline.com',
      { font: '12px Arial', fill: '#aaa' }
    ).setOrigin(0.5);

    this.uiFooterTitle = this.add.text(
      W - 20, 16, 'SAVE THEM ALL',
      { font: '14px Arial', fill: '#fff' }
    ).setOrigin(1, 0).setScrollFactor(0).setVisible(false);

    this.uiFooterInfo = this.add.text(
      W - 20, 36, 'EU 112 | PL 116 123 | USA 988',
      { font: '11px Arial', fill: '#aaa' }
    ).setOrigin(1, 0).setScrollFactor(0).setVisible(false);

    this.uiFooterLink = this.add.text(
      W - 20, 52, 'findahelpline.com',
      { font: '11px Arial', fill: '#777' }
    ).setOrigin(1, 0).setScrollFactor(0).setVisible(false);

    /* ================= 🌧️ AMBIENT ================= */
    this.rainAmbient = this.sound.add('ambient_rain', {
      loop: true,
      volume: 0.18
    });
    this.rainAmbient.play();
  }

  update(time, delta) {
    const walkSpeed = 150;
    const runSpeed = 260;

    let vx = 0, vy = 0;
    if (this.keys.A.isDown) vx -= 1;
    if (this.keys.D.isDown) vx += 1;
    if (this.keys.W.isDown) vy -= 1;
    if (this.keys.S.isDown) vy += 1;

    const isMoving = vx !== 0 || vy !== 0;
    const isRunning = this.keys.SHIFT.isDown && this.stamina > 0 && isMoving;
    const speed = isRunning ? runSpeed : walkSpeed;

    this.stamina += (isRunning ? -30 : 18) * (delta / 1000);
    this.stamina = Phaser.Math.Clamp(this.stamina, 0, this.maxStamina);

    this.staminaBar.width = (this.stamina / this.maxStamina) * 100;
    this.hpBar.width = (this.hp / this.maxHp) * 100;
    this.batterySegments.forEach((s, i) => s.visible = i < this.battery);

    if (isMoving) {
      const len = Math.hypot(vx, vy);
      vx /= len; vy /= len;

      this.player.x += vx * speed * (delta / 1000);
      this.player.y += vy * speed * (delta / 1000);

      if (Math.abs(vx) > Math.abs(vy)) {
        this.lastDir = 'side';
        this.player.setFlipX(vx < 0);
      } else if (vy < 0) {
        this.lastDir = 'up';
      } else {
        this.lastDir = 'down';
      }

      if (this.lastDir === 'side') this.player.play('walk_side', true);
      else if (this.lastDir === 'up') this.player.play('walk_up', true);
      else this.player.play('walk_down', true);

    } else {
      this.player.play('idle', true);
    }

    this.player.y = Phaser.Math.Clamp(this.player.y, 16, this.mapHeight - 180);

    this.light.x = this.player.x;
    this.light.y = this.player.y;

    const flicker = Math.sin(time * 0.005);
    this.light.intensity = isRunning
      ? 2.2 + Math.sin(time * 0.02) * 0.8
      : 2.2 + flicker * 0.15;

    this.rainAmbient.volume = Phaser.Math.Linear(
      this.rainAmbient.volume,
      isRunning ? 0.24 : 0.18,
      0.05
    );

    const cam = this.cameras.main;
    const top = this.worldFooterTitle.y - this.worldFooterTitle.height / 2;
    const bottom = this.worldFooterInfo.y + this.worldFooterInfo.height / 2;
    const visible = bottom > cam.worldView.y && top < cam.worldView.y + cam.height;

    this.uiFooterTitle.setVisible(!visible);
    this.uiFooterInfo.setVisible(!visible);
    this.uiFooterLink.setVisible(!visible);
  }
}
