const config = {
  type: Phaser.WEBGL,
  width: window.innerWidth - 20,
  height: window.innerHeight - 40,
  backgroundColor: '#000000',
  scene: [
    MainMenu,
    GameScene,
    PauseMenu,
    SettingsScene
  ]
};

new Phaser.Game(config);
