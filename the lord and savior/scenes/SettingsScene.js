class SettingsScene extends Phaser.Scene {
  constructor() {
    super('SettingsScene');
  }

  init(data) {
    this.returnScene = data.returnScene; // 'MainMenu' lub 'PauseMenu'
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // overlay
    this.overlay = this.add.rectangle(0, 0, W, H, 0x000000, 0.85)
      .setOrigin(0)
      .setDepth(100);

    this.panel = this.add.rectangle(W / 2, H / 2, 520, 300, 0x111111)
      .setDepth(101);

    this.title = this.add.text(
      W / 2,
      H / 2 - 120,
      'SETTINGS',
      { font: '32px Arial', fill: '#ffffff' }
    ).setOrigin(0.5).setDepth(102);

    const saved = JSON.parse(
      localStorage.getItem('settings_saveThemAll') || '{}'
    );

    this.volume = saved.volume ?? 0.5;
    this.brightness = saved.brightness ?? 0.5;

    this.volText = this.add.text(
      W / 2,
      H / 2 - 20,
      '',
      { font: '20px Arial', fill: '#dddddd' }
    ).setOrigin(0.5).setDepth(102);

    this.briText = this.add.text(
      W / 2,
      H / 2 + 30,
      '',
      { font: '20px Arial', fill: '#dddddd' }
    ).setOrigin(0.5).setDepth(102);

    this.updateTexts();

    // sterowanie
    this.input.keyboard.on('keydown-LEFT',  () => { this.volume = Math.max(0, this.volume - 0.05); this.save(); });
    this.input.keyboard.on('keydown-RIGHT', () => { this.volume = Math.min(1, this.volume + 0.05); this.save(); });
    this.input.keyboard.on('keydown-DOWN',  () => { this.brightness = Math.max(0, this.brightness - 0.05); this.save(); });
    this.input.keyboard.on('keydown-UP',    () => { this.brightness = Math.min(1, this.brightness + 0.05); this.save(); });

    // back
    this.back = this.add.text(
      W / 2,
      H / 2 + 120,
      'ESC – BACK',
      { font: '14px Arial', fill: '#aaaaaa' }
    ).setOrigin(0.5).setDepth(102).setInteractive();

    this.back.on('pointerover', () => this.back.setFill('#ffffff'));
    this.back.on('pointerout',  () => this.back.setFill('#aaaaaa'));

    const close = () => this.close();

    this.back.on('pointerdown', close);
    this.input.keyboard.once('keydown-ESC', close);
  }

  updateTexts() {
    this.volText.setText(`VOLUME: ${Math.round(this.volume * 100)}%`);
    this.briText.setText(`BRIGHTNESS: ${Math.round(this.brightness * 100)}%`);
  }

  save() {
    this.updateTexts();
    localStorage.setItem(
      'settings_saveThemAll',
      JSON.stringify({
        volume: this.volume,
        brightness: this.brightness
      })
    );
  }

  close() {
    this.tweens.add({
      targets: [this.overlay, this.panel, this.title, this.volText, this.briText, this.back],
      alpha: 0,
      duration: 150,
      onComplete: () => {
        this.scene.stop();

        // wracamy dokładnie tam, skąd przyszliśmy
        this.scene.resume(this.returnScene);
      }
    });
  }
}
