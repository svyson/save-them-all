class PauseMenu extends Phaser.Scene {
  constructor() {
    super('PauseMenu');
  }

  create(data) {
    const W = this.scale.width;
    const H = this.scale.height;

    /* =================================================
       BLUR / DIM OVERLAY (ZAMIAST CZARNEGO PROSTOKĄTA)
       ================================================= */

    // delikatne przyciemnienie (pseudo blur)
    this.overlay = this.add.rectangle(0, 0, W, H, 0x000000, 0.55)
      .setOrigin(0)
      .setScrollFactor(0);

    // subtelna animacja fade-in
    this.overlay.alpha = 0;
    this.tweens.add({
      targets: this.overlay,
      alpha: 0.55,
      duration: 300,
      ease: 'Sine.Out'
    });

    /* =================================================
       UI AUDIO (WSPÓLNE Z MAIN MENU)
       ================================================= */

    this.uiHover = this.sound.get('ui_hover');
    this.uiClick = this.sound.get('ui_click');

    /* =================================================
       PANEL
       ================================================= */

    const panel = this.add.rectangle(W / 2, H / 2, 420, 360, 0x111111, 0.95)
      .setScrollFactor(0);

    this.add.text(W / 2, H / 2 - 140, 'PAUSED', {
      font: '32px Arial',
      fill: '#ffffff'
    }).setOrigin(0.5);

    /* =================================================
       BUTTONS
       ================================================= */

    const buttons = [
      {
        text: 'CONTINUE',
        action: () => {
          this.uiClick?.play();
          this.scene.stop();
          this.scene.resume('GameScene');
        }
      },
      {
        text: 'SETTINGS',
        action: () => {
          this.uiClick?.play();
          this.scene.launch('SettingsScene', { returnScene: 'PauseMenu' });
          this.scene.pause();
        }
      },
      {
        text: 'SAVE',
        action: () => {
          this.uiClick?.play();
          console.log('SAVE (placeholder)');
        }
      },
      {
        text: 'BACK TO MAIN MENU',
        action: () => {
          this.uiClick?.play();
          this.scene.stop('GameScene');
          this.scene.stop();
          this.scene.start('MainMenu');
        }
      }
    ];

    buttons.forEach((btn, i) => {
      const y = H / 2 - 60 + i * 60;

      const bg = this.add.rectangle(W / 2, y, 260, 44, 0x7a0000)
        .setInteractive({ useHandCursor: true })
        .setScrollFactor(0);

      const label = this.add.text(W / 2, y, btn.text, {
        font: '18px Arial',
        fill: '#ffffff'
      }).setOrigin(0.5);

      bg.on('pointerover', () => {
        bg.setFillStyle(0xaa0000);
        this.uiHover?.play();
      });

      bg.on('pointerout', () => {
        bg.setFillStyle(0x7a0000);
      });

      bg.on('pointerdown', btn.action);
    });

    /* =================================================
       ESC = CONTINUE
       ================================================= */

    this.input.keyboard.once('keydown-ESC', () => {
      this.uiClick?.play();
      this.scene.stop();
      this.scene.resume('GameScene');
    });
  }
}
