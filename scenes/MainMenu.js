class MainMenu extends Phaser.Scene {
  constructor() {
    super('MainMenu');
  }
  applySettings() {
    const settings = JSON.parse(
      localStorage.getItem('settings_saveThemAll') || '{}'
    );
  
    if (typeof settings.volume === 'number') {
      this.sound.volume = settings.volume;
    }
  
    const brightness = settings.brightness ?? 0.5;
    const cssValue = 0.3 + brightness * 1.2;
    this.game.canvas.style.filter = `brightness(${cssValue})`;
  }
  
  preload() {
    this.load.audio('ui_hover', 'audio/hover.mp3');
    this.load.audio('ui_click', 'audio/button.mp3');
    this.load.audio('ambient_menu', 'audio/ambient.mp3');
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this.add.rectangle(0, 0, W, H, 0x000000).setOrigin(0);

    this.uiHover = this.sound.add('ui_hover', { volume: 0.3 });
    this.uiClick = this.sound.add('ui_click', { volume: 0.45 });

    this.menuAmbient = this.sound.add('ambient_menu', {
      loop: true,
      volume: 0.2
    });

    this.audioCtx = null;
    this.noiseSource = null;
    this.noiseGain = null;

    this.input.once('pointerdown', () => {
      this.startMenuAudio();
    });

    this.events.once('shutdown', () => {
      this.stopProceduralNoise(true);
    });

    const titleY = H * 0.15;

    const glow3 = this.add.text(W / 2, titleY, 'SAVE THEM ALL', {
      font: '64px Arial',
      fill: '#ff1a1a'
    }).setOrigin(0.5).setAlpha(0.08).setScale(1.12);

    const glow2 = this.add.text(W / 2, titleY, 'SAVE THEM ALL', {
      font: '64px Arial',
      fill: '#ff2a2a'
    }).setOrigin(0.5).setAlpha(0.12).setScale(1.07);

    const glow1 = this.add.text(W / 2, titleY, 'SAVE THEM ALL', {
      font: '64px Arial',
      fill: '#ff3a3a'
    }).setOrigin(0.5).setAlpha(0.18).setScale(1.03);

    const title = this.add.text(W / 2, titleY, 'SAVE THEM ALL', {
      font: '64px Arial',
      fill: '#b00000'
    }).setOrigin(0.5);

    this.time.addEvent({
      delay: 3800,
      loop: true,
      callback: () => {
        this.tweens.add({
          targets: [glow1, glow2, glow3],
          duration: 900,
          yoyo: true,
          ease: 'Sine.InOut',
          props: {
            scale: { value: '+=0.04' },
            alpha: { value: '+=0.08' }
          }
        });
      }
    });
       const buttons = [
        {
          text: 'PLAY',
          action: () => this.fadeOutAndStartGame()
        },
        {
          text: 'SETTINGS',
          action: () => {
            this.scene.launch('SettingsScene', { returnScene: 'MainMenu' });
            this.scene.pause();
          }
        },
        {
          text: 'ABOUT',
          action: () => this.showAbout()
        },
        {
          text: 'CREDITS',
          action: () => this.showCredits()
        }
      ];
      

      buttons.forEach((btn, i) => {
        const y = H * 0.38 + i * 64;
      
        const bg = this.add.rectangle(W / 2, y, 300, 52, 0x7a0000)
          .setInteractive({ useHandCursor: true });
      
        this.add.text(W / 2, y, btn.text, {
          font: '22px Arial',
          fill: '#ffffff'
        }).setOrigin(0.5);
      
        bg.on('pointerover', () => {
          bg.setFillStyle(0xaa0000);
          this.uiHover.play();
        });
      
        bg.on('pointerout', () => {
          bg.setFillStyle(0x7a0000);
        });
      
        bg.on('pointerdown', () => {
          this.uiClick.play();
          btn.action();
        });
      });
      
      

    this.stats = [
      { t: 'Worldwide, suicide claims {n} lives every year.', v: 700000, s: 'WHO' },
      { t: 'Across Europe, more than {n} people die by suicide each year.', v: 56000, s: 'WHO / Eurostat' },
      { t: 'In Poland, approximately {n} deaths occur each year.', v: 5000, s: 'GUS / WHO' },
      { t: 'In Poland, this means about {n} people die every day.', v: 14, s: 'Derived statistics' },
      {
        t: 'Since you opened this page, someone may have lost their life — many others survived because someone intervened.',
        v: null,
        s: 'Awareness saves lives'
      }
    ];

    this.statIndex = 0;

    this.statText = this.add.text(W / 2, H - 210, '', {
      font: '32px Arial',
      fill: '#dddddd',
      align: 'center',
      wordWrap: { width: W * 0.85 }
    }).setOrigin(0.5);

    this.statSource = this.add.text(W / 2, H - 165, '', {
      font: '14px Arial',
      fill: '#777777'
    }).setOrigin(0.5);

    this.add.text(
      W / 2,
      H - 120,
      'If you or someone you know needs help: findahelpline.com',
      { font: '14px Arial', fill: '#666666' }
    ).setOrigin(0.5);

    this.showStat(this.stats[0]);

    this.time.addEvent({
      delay: 5000,
      loop: true,
      callback: () => {
        this.statIndex = (this.statIndex + 1) % this.stats.length;
        this.transitionStat(this.stats[this.statIndex]);
      }
    });
    this.applySettings();
    this.events.on('resume', () => {
      this.applySettings();
    });
    
  }

  /* ===================== PROCEDURAL AUDIO ===================== */
  startMenuAudio() {
    this.applySettings();
    if (!this.menuAmbient.isPlaying) {
      this.menuAmbient.play();
    }

    if (this.audioCtx) return;

    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    const buffer = this.audioCtx.createBuffer(
      1,
      this.audioCtx.sampleRate * 3,
      this.audioCtx.sampleRate
    );

    const data = buffer.getChannelData(0);
    let last = 0;

    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.015 * white) / 1.02;
      data[i] = last * 0.35;
    }

    this.noiseSource = this.audioCtx.createBufferSource();
    this.noiseSource.buffer = buffer;
    this.noiseSource.loop = true;

    this.noiseGain = this.audioCtx.createGain();
    this.noiseGain.gain.value = 0.08;

    this.noiseSource
      .connect(this.noiseGain)
      .connect(this.audioCtx.destination);

    this.noiseSource.start();
  }

  stopProceduralNoise(immediate = false) {
    if (!this.noiseGain || !this.noiseSource) return;

    if (immediate) {
      this.noiseSource.stop();
      this.noiseSource.disconnect();
      this.noiseSource = null;
      if (this.audioCtx) {
        this.audioCtx.close();
        this.audioCtx = null;
      }
      return;
    }

    // gentle fade out
    const now = this.audioCtx.currentTime;
    this.noiseGain.gain.cancelScheduledValues(now);
    this.noiseGain.gain.linearRampToValueAtTime(0, now + 0.8);

    setTimeout(() => {
      if (this.noiseSource) {
        this.noiseSource.stop();
        this.noiseSource.disconnect();
        this.noiseSource = null;
      }
      if (this.audioCtx) {
        this.audioCtx.close();
        this.audioCtx = null;
      }
    }, 850);
  }

  fadeOutAndStartGame() {
    this.tweens.add({
      targets: this.menuAmbient,
      volume: 0,
      duration: 800
    });

    this.stopProceduralNoise(false);

    this.time.delayedCall(850, () => {
      this.menuAmbient.stop();
      this.scene.start('GameScene');
    });
  }

  /* ===================== STATS ===================== */
  animateInline(template, value) {
    const o = { v: 0 };
    this.tweens.add({
      targets: o,
      v: value,
      duration: 1800,
      ease: 'Cubic.Out',
      onUpdate: () => {
        this.statText.setText(
          template.replace('{n}', Math.floor(o.v).toLocaleString('en-US'))
        );
      }
    });
  }

  showStat(stat) {
    this.statSource.setText(stat.s);
    if (stat.v === null) {
      this.statText.setText(stat.t);
    } else {
      this.animateInline(stat.t, stat.v);
    }
  }

  transitionStat(stat) {
    this.tweens.add({
      targets: [this.statText, this.statSource],
      alpha: 0,
      y: '+=20',
      duration: 400,
      onComplete: () => {
        this.statText.setY(this.scale.height - 230);
        this.statSource.setY(this.scale.height - 185);
        this.showStat(stat);
        this.tweens.add({
          targets: [this.statText, this.statSource],
          alpha: 1,
          y: '+=20',
          duration: 400
        });
      }
    });
  }

  /* ===================== OVERLAYS ===================== */
  simpleOverlay(titleText, bodyText) {
    const W = this.scale.width;
    const H = this.scale.height;

    const bg = this.add.rectangle(0, 0, W, H, 0x000000, 0.85).setOrigin(0);
    const panel = this.add.rectangle(W / 2, H / 2, 560, 340, 0x111111);

    const text = this.add.text(
      W / 2,
      H / 2 - 20,
      `${titleText}\n\n${bodyText}`,
      { font: '18px Arial', fill: '#dddddd', align: 'center' }
    ).setOrigin(0.5);

    const back = this.add.text(
      W / 2,
      H / 2 + 140,
      'ESC – BACK',
      { font: '14px Arial', fill: '#aaaaaa' }
    ).setOrigin(0.5).setInteractive();

    back.on('pointerover', () => back.setFill('#ffffff'));
    back.on('pointerout', () => back.setFill('#aaaaaa'));

    const close = () => [bg, panel, text, back].forEach(x => x.destroy());
    back.on('pointerdown', close);
    this.input.keyboard.once('keydown-ESC', close);
  }

  showAbout() {
    this.simpleOverlay(
      'ABOUT',
      'This project focuses on prevention, intervention and awareness.\n\nIt is not about numbers.\nIt is about people.'
    );
  }

  showCredits() {
    this.simpleOverlay(
      'CREDITS',
      'Design & Development\nsiwson\n\nData sources:\nWHO, Eurostat, GUS\n\nSupport:\nfindahelpline.com'
    );
  }
}
