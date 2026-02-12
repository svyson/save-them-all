class SettingsScene extends Phaser.Scene {
  constructor() {
    super('SettingsScene');
  }
  
  
  init(data) {
    this.returnScene = data.returnScene;
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    /* ===== OVERLAY ===== */
    this.overlay = this.add.rectangle(0, 0, W, H, 0x000000, 0.85)
      .setOrigin(0);

    this.panel = this.add.rectangle(W / 2, H / 2, 600, 440, 0x111111);

    this.add.text(W / 2, H / 2 - 180, 'SETTINGS', {
      font: '32px Arial',
      fill: '#ffffff'
    }).setOrigin(0.5);

    /* ===== LOAD SETTINGS ===== */
    const saved = JSON.parse(
      localStorage.getItem('settings_saveThemAll') || '{}'
    );

    this.settings = {
      volume: saved.volume ?? 0.5,
      brightness: saved.brightness ?? 0.5,
      controls: saved.controls ?? 'WASD',
      fullscreen: saved.fullscreen ?? false
    };

    this.options = [
      { key: 'volume', label: 'VOLUME', min: 0, max: 1, step: 0.05 },
      { key: 'brightness', label: 'BRIGHTNESS', min: 0, max: 1, step: 0.05 },
      { key: 'controls', label: 'CONTROLS', values: ['WASD', 'ARROWS'] },
      { key: 'fullscreen', label: 'FULLSCREEN', values: ['OFF', 'ON'] }
    ];

    this.selectedIndex = 0;
    this.rows = [];

    const startY = H / 2 - 90;

    this.options.forEach((opt, i) => {
      const y = startY + i * 70;

      const label = this.add.text(W / 2 - 240, y, opt.label, {
        font: '20px Arial',
        fill: '#aaaaaa'
      }).setOrigin(0, 0.5);

      let valueText;
      let slider = null;

      if (!opt.values) {
        const line = this.add.rectangle(W / 2, y + 18, 280, 4, 0x333333);

        const knob = this.add.rectangle(
          W / 2 - 140 + this.settings[opt.key] * 280,
          y + 18,
          14,
          20,
          0xffffff
        ).setInteractive({ draggable: true });

        this.input.setDraggable(knob);

        knob.on('drag', (_, dragX) => {
          dragX = Phaser.Math.Clamp(dragX, W / 2 - 140, W / 2 + 140);
          knob.x = dragX;

          this.settings[opt.key] =
            (dragX - (W / 2 - 140)) / 280;

          this.updateUI();
          this.save();
        });

        valueText = this.add.text(W / 2 + 230, y, '', {
          font: '20px Arial',
          fill: '#dddddd'
        }).setOrigin(1, 0.5);

        slider = { line, knob };
      } else {
        valueText = this.add.text(W / 2 + 230, y, '', {
          font: '20px Arial',
          fill: '#dddddd'
        })
          .setOrigin(1, 0.5)
          .setInteractive({ useHandCursor: true });

        valueText.on('pointerdown', () => {
          this.selectedIndex = i;
          this.changeValue(1);
        });
      }

      this.rows.push({ opt, label, valueText, slider });
    });

    /* ===== RESET BUTTON ===== */
    this.resetBtn = this.add.text(
      W / 2,
      H / 2 + 150,
      'RESET TO DEFAULTS',
      { font: '16px Arial', fill: '#aa4444' }
    ).setOrigin(0.5).setInteractive();

    this.resetBtn.on('pointerover', () => this.resetBtn.setFill('#ff6666'));
    this.resetBtn.on('pointerout', () => this.resetBtn.setFill('#aa4444'));
    this.resetBtn.on('pointerdown', () => this.resetDefaults());

    /* ===== BACK ===== */
    this.back = this.add.text(
      W / 2,
      H / 2 + 190,
      'ESC – BACK',
      { font: '14px Arial', fill: '#aaaaaa' }
    ).setOrigin(0.5).setInteractive();

    this.back.on('pointerover', () => this.back.setFill('#ffffff'));
    this.back.on('pointerout', () => this.back.setFill('#aaaaaa'));
    this.back.on('pointerdown', () => this.close());

    /* ===== INPUT ===== */
    this.input.keyboard.on('keydown-UP', () => {
      this.selectedIndex = Phaser.Math.Wrap(this.selectedIndex - 1, 0, this.options.length);
      this.updateUI();
    });

    this.input.keyboard.on('keydown-DOWN', () => {
      this.selectedIndex = Phaser.Math.Wrap(this.selectedIndex + 1, 0, this.options.length);
      this.updateUI();
    });

    this.input.keyboard.on('keydown-LEFT', () => this.changeValue(-1));
    this.input.keyboard.on('keydown-RIGHT', () => this.changeValue(1));
    this.input.keyboard.once('keydown-ESC', () => this.close());

    this.updateUI();
  }

  changeValue(dir) {
    const row = this.rows[this.selectedIndex];
    const opt = row.opt;

    if (opt.values) {
      if (opt.key === 'fullscreen') {
        this.settings.fullscreen = !this.settings.fullscreen;
        if (this.settings.fullscreen) {
          this.scale.startFullscreen();
        } else {
          this.scale.stopFullscreen();
        }
      } else {
        const idx = opt.values.indexOf(this.settings[opt.key]);
        this.settings[opt.key] =
          opt.values[(idx + dir + opt.values.length) % opt.values.length];
      }
    } else {
      this.settings[opt.key] = Phaser.Math.Clamp(
        this.settings[opt.key] + dir * opt.step,
        opt.min,
        opt.max
      );
    }

    this.updateUI();
    this.save();
  }

  updateUI() {
    this.rows.forEach((row, i) => {
      const active = i === this.selectedIndex;

      row.label.setFill(active ? '#ffffff' : '#aaaaaa');
      row.valueText.setFill(active ? '#ffffff' : '#dddddd');

      if (row.opt.values) {
        if (row.opt.key === 'fullscreen') {
          row.valueText.setText(this.settings.fullscreen ? 'ON' : 'OFF');
        } else {
          row.valueText.setText(this.settings[row.opt.key]);
        }
      } else {
        row.valueText.setText(`${Math.round(this.settings[row.opt.key] * 100)}%`);
        row.slider.knob.x =
          this.scale.width / 2 - 140 +
          this.settings[row.opt.key] * 280;
      }
    });
  }

  resetDefaults() {
    if (this.scale.isFullscreen) {
      this.scale.stopFullscreen();
    }
    this.settings = {
      volume: 0.5,
      brightness: 0.5,
      controls: 'WASD',
      fullscreen: false
    };
  
    this.updateUI();
    this.save();
  }
  

  save() {
    localStorage.setItem(
      'settings_saveThemAll',
      JSON.stringify(this.settings)
    );
    
    // Apply volume changes in real-time to all active scenes
    this.game.scene.scenes.forEach(scene => {
      if (scene.sound) {
        scene.sound.volume = this.settings.volume;
      }
    });
    
    // Apply brightness via CSS filter in real-time
    const cssValue = 0.3 + this.settings.brightness * 1.2;
    this.game.canvas.style.filter = `brightness(${cssValue})`;
  }
  

  close() {
    this.scene.stop();
    this.scene.resume(this.returnScene);
  }
}
