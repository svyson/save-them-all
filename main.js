const config = {
  type: Phaser.AUTO,
  width: window.innerWidth - 20,
  height: window.innerHeight - 40,
  backgroundColor: '#000000',
  scene: [
    MainMenu,
    GameScene,
    BuildingInterior,
    PauseMenu,
    SettingsScene
  ],
  render: {
    pixelArt: true,
    antialias: false
  }
};

new Phaser.Game(config);
