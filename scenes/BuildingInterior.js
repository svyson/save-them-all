class BuildingInterior extends Phaser.Scene {
  constructor() {
    super('BuildingInterior');
    this.doorPosition = { x: 0, y: 0 };
  }

  create() {
    // Get door position from scene data
    const doorX = this.registry.get('doorX') || 0;
    const doorY = this.registry.get('doorY') || 0;
    this.doorPosition = { x: doorX, y: doorY };

    const W = this.scale.width;
    const viewH = this.scale.height;
    const worldH = viewH * 2.5; // więcej wysokości na zabudowaną klatkę
    this.worldH = worldH;

    // === BACKGROUND - SZARE ŚCIANY BUDYNKU ===
    const bg = this.add.graphics();
    bg.setDepth(0);

    // Pełna szara ściana na całą wysokość świata (zabudowana klatka)
    const buildingHeight = worldH;
    const wallTop = 0;

    for (let y = wallTop; y < worldH; y += 1) {
      const localY = y - wallTop;
      const brightness = 0.45 + (localY / buildingHeight) * 0.08;
      const r = Math.floor(110 * brightness);
      const g = Math.floor(110 * brightness);
      const b = Math.floor(110 * brightness);
      const color = (r << 16) | (g << 8) | b;
      bg.fillStyle(color, 1);
      bg.fillRect(0, y, W, 1);
    }

    // === TEKSTURA ŚCIAN - RYSY I LINIE ===
    bg.fillStyle(0x6a6a6a, 0.25);
    for (let i = 0; i < W; i += 100) {
      bg.fillRect(i, wallTop, 1, buildingHeight);
    }
    for (let i = wallTop; i < worldH; i += 80) {
      bg.fillRect(0, i, W, 1);
    }

    // === OŚWIETLENIE - LAMPY NA SUFICIE ===
    const lights = [W * 0.2, W * 0.5, W * 0.8];
    lights.forEach(lightX => {
      const lightY = wallTop + 30;
      // Oprawka
      bg.fillStyle(0x5a5a5a, 0.9);
      bg.fillRect(lightX - 20, lightY, 40, 12);
      
      // Żarówka
      bg.fillStyle(0xffffaa, 0.9);
      bg.fillCircle(lightX, lightY + 6, 4);
      
      // Halo światła
      bg.fillStyle(0xffffaa, 0.12);
      bg.fillCircle(lightX, lightY + 120, 140);
    });

    // Boki klatki (zabudowane ściany)
    bg.fillStyle(0x444444, 0.7);
    bg.fillRect(0, 0, 30, worldH);
    bg.fillRect(W - 30, 0, 30, worldH);

    // === SCHODY - BIEGNĄCE DO GÓRY ===
    const groundLevel = worldH - 80;
    
    // PIERWSZY BIEG - Z PRAWEJ NA LEWĄ (PRAWO -> LEWO NA PARTER)
    const stair1StartX = W * 0.75;
    const stair1StartY = groundLevel;
    const stair1EndX = W * 0.15;
    const stepWidth = 55;
    const stepHeight = 12;
    
    // Pierwszy bieg schodów (z prawej do lewej)
    for (let i = 0; i < 7; i++) {
      const x = stair1StartX - i * stepWidth;
      const y = stair1StartY - i * stepHeight;
      
      // Bieżnik (góra)
      bg.fillStyle(0x808080, 1);
      bg.fillRect(x, y, stepWidth, stepHeight);

      // Podstopnica (front) dla realizmu
      bg.fillStyle(0x6b6b6b, 1);
      bg.fillRect(x, y + stepHeight - 2, stepWidth, 8);

      // Tekstura bieżnika
      bg.fillStyle(0x6a6a6a, 0.35);
      for (let j = 2; j < stepHeight; j += 3) {
        bg.fillRect(x + 5, y + j, stepWidth - 10, 1);
      }

      // Cień miękki
      bg.fillStyle(0x2f2f2f, 0.35);
      bg.fillRect(x, y + stepHeight - 1, stepWidth, 3);
    }

    // Pochwyt pierwszego biegu (lewy bok)
    bg.fillStyle(0x7a8a8a, 0.85);
    bg.fillRect(stair1EndX - 12, stair1StartY - 8, 3, 30);
    
    // Wsporniki pierwszego biegu
    for (let i = 0; i < 7; i++) {
      const x = stair1StartX - i * stepWidth;
      bg.fillRect(x - 12, stair1StartY + stepHeight - 1, 12, 2);
    }

    // DRZWI PARTER - KONIEC PIERWSZEGO BIEGU
    const doorW = 50;
    const doorH = 65;
    const door1X = stair1EndX - 35;
    const door1Y = groundLevel - doorH;

    // Rama drzwi
    bg.fillStyle(0x3a2a1a, 0.9);
    bg.fillRect(door1X - 2, door1Y - 2, doorW + 4, doorH + 4);

    // Drewno
    bg.fillStyle(0x4a3a2a, 0.95);
    bg.fillRect(door1X, door1Y, doorW, doorH);

    // Tekstura
    bg.fillStyle(0x3a2a1a, 0.3);
    for (let j = 0; j < doorH; j += 6) {
      bg.fillRect(door1X, door1Y + j, doorW, 1);
    }

    // Numer
    this.add.text(door1X + doorW / 2, door1Y - 12, "1", {
      font: 'bold 10px Arial',
      fill: '#aabbcc'
    }).setOrigin(0.5);

    // DRUGI BIEG - Z LEWEJ W PRAWO W GÓRĘ (PARTER -> PARTER+1)
    const stair2StartX = stair1EndX - 60;
    const stair2StartY = groundLevel - 120;
    const midLevelY = stair2StartY - 120; // wyżej, by klatka szła do góry
    
    for (let i = 0; i < 7; i++) {
      const x = stair2StartX + i * stepWidth;
      const y = stair2StartY - i * stepHeight;
      
      // Bieżnik
      bg.fillStyle(0x808080, 1);
      bg.fillRect(x, y, stepWidth, stepHeight);

      // Podstopnica
      bg.fillStyle(0x6b6b6b, 1);
      bg.fillRect(x, y + stepHeight - 2, stepWidth, 8);

      // Tekstura
      bg.fillStyle(0x6a6a6a, 0.35);
      for (let j = 2; j < stepHeight; j += 3) {
        bg.fillRect(x + 5, y + j, stepWidth - 10, 1);
      }

      // Cień
      bg.fillStyle(0x2f2f2f, 0.35);
      bg.fillRect(x, y + stepHeight - 1, stepWidth, 3);
    }

    // Pochwyt drugiego biegu (prawy bok)
    bg.fillStyle(0x7a8a8a, 0.85);
    bg.fillRect(stair2StartX + stepWidth * 6 + 10, stair2StartY - 8, 3, 90);
    
    // Wsporniki drugiego biegu
    for (let i = 0; i < 7; i++) {
      const x = stair2StartX + i * stepWidth;
      bg.fillRect(x + stepWidth, stair2StartY - i * stepHeight + stepHeight - 1, 12, 2);
    }

    // TRZECI BIEG - Z PRAWEJ W LEWĄ W GÓRĘ (PARTER+1 -> PARTER+2)
    const stair3StartX = stair2StartX + stepWidth * 7 + 20;
    const stair3StartY = midLevelY - 20;
    const topLevelY = stair3StartY - 140; // wyżej

    // Segmenty schodów do ruchu 2D (bez chodzenia po ścianach)
    this.stairSegments = [
      { x1: stair1StartX, y1: stair1StartY, x2: stair1EndX, y2: stair1StartY - stepHeight * 6 },
      { x1: stair2StartX, y1: stair2StartY, x2: stair2StartX + stepWidth * 6, y2: stair2StartY - stepHeight * 6 },
      { x1: stair3StartX, y1: stair3StartY, x2: stair3StartX - stepWidth * 6, y2: stair3StartY - stepHeight * 6 },
    ];
    
    for (let i = 0; i < 7; i++) {
      const x = stair3StartX - i * stepWidth;
      const y = stair3StartY - i * stepHeight;
      
      // Bieżnik
      bg.fillStyle(0x808080, 1);
      bg.fillRect(x, y, stepWidth, stepHeight);

      // Podstopnica
      bg.fillStyle(0x6b6b6b, 1);
      bg.fillRect(x, y + stepHeight - 2, stepWidth, 8);

      // Tekstura
      bg.fillStyle(0x6a6a6a, 0.35);
      for (let j = 2; j < stepHeight; j += 3) {
        bg.fillRect(x + 5, y + j, stepWidth - 10, 1);
      }

      // Cień
      bg.fillStyle(0x2f2f2f, 0.35);
      bg.fillRect(x, y + stepHeight - 1, stepWidth, 3);
    }

    // Pochwyt trzeciego biegu (lewy bok)
    bg.fillStyle(0x7a8a8a, 0.85);
    bg.fillRect(stair3StartX - stepWidth * 6 - 12, stair3StartY - 8, 3, 90);
    
    // Wsporniki trzeciego biegu
    for (let i = 0; i < 7; i++) {
      const x = stair3StartX - i * stepWidth;
      bg.fillRect(x - 12, stair3StartY - i * stepHeight + stepHeight - 1, 12, 2);
    }

    // DRZWI PIĘTRO 1 - KONIEC TRZECIEGO BIEGU
    const door2X = stair3StartX - stepWidth * 6 - 50;
    const door2Y = topLevelY + 20;

    // Rama drzwi
    bg.fillStyle(0x3a2a1a, 0.9);
    bg.fillRect(door2X - 2, door2Y - 2, doorW + 4, doorH + 4);

    // Drewno
    bg.fillStyle(0x4a3a2a, 0.95);
    bg.fillRect(door2X, door2Y, doorW, doorH);

    // Tekstura
    bg.fillStyle(0x3a2a1a, 0.3);
    for (let j = 0; j < doorH; j += 6) {
      bg.fillRect(door2X, door2Y + j, doorW, 1);
    }

    // Numer
    this.add.text(door2X + doorW / 2, door2Y - 12, "2", {
      font: 'bold 10px Arial',
      fill: '#aabbcc'
    }).setOrigin(0.5);

    // === WINDA - PO PRAWEJ STRONIE ===
    const elevX = W * 0.85;
    const elevY = groundLevel + 8; // bliżej gruntu
    const elevW = 60;
    const elevH = 70;

    // Obudowa windy (stalowa)
    bg.fillStyle(0x2a2a3a, 0.95);
    bg.fillRect(elevX - 2, elevY - elevH - 2, elevW + 4, elevH + 4);

    // Lewa połowa drzwi
    bg.fillStyle(0x4a4a5a, 0.9);
    bg.fillRect(elevX, elevY - elevH, elevW, elevH);

    // Szczelina w środku (cień)
    bg.fillStyle(0x3a3a4a, 0.6);
    for (let i = 1; i < 4; i++) {
      bg.fillRect(elevX, elevY - elevH + (elevH / 4) * i, elevW, 1);
      bg.fillRect(elevX + (elevW / 4) * i, elevY - elevH, 1, elevH);
    }

    // Lustro na drzwiach
    const doorGapX = 5;
    bg.fillStyle(0x5a5a6a, 0.95);
    bg.fillRect(elevX + doorGapX, elevY - elevH + 15, elevW / 2 - 6, elevH - 20);
    bg.fillRect(elevX + elevW / 2 + 3, elevY - elevH + 15, elevW / 2 - 8, elevH - 20);

    // Pochwyty na drzwiach


  bg.fillStyle(0xffff00, 0.3);
  bg.fillCircle(elevX + elevW / 2, elevY - elevH - 15, 25);

    // === PODŁOGA ===
    bg.fillStyle(0x5a5a5a, 1);
    bg.fillRect(0, groundLevel + 20, W, 60);

    // Tekstura podłogi
    bg.fillStyle(0x4a4a4a, 0.3);
    for (let i = 0; i < W; i += 60) {
      bg.fillRect(i, groundLevel + 20, 2, 60);
    }

    // === INSTRUKCJE ===
    this.add.text(
      W / 2,
      viewH - 20,
      "Press E to exit building | Use ARROW/WASD to move (stairs scroll)",
      {
        font: 'bold 12px Arial',
        fill: '#aabbcc',
        stroke: '#000',
        strokeThickness: 2
      }
    ).setOrigin(0.5).setScrollFactor(0);

    // === DŹWIĘK DESZCZU ===
    this.rainAmbient = this.sound.add('ambient_rain', {
      loop: true,
      volume: 0.2
    });
    this.rainAmbient.play();

    // === PLAYER ===
    this.player = this.add.sprite(W / 2, groundLevel - 10, 'player');
    this.player.setScale(1.6);
    this.player.setDepth(500);
    this.player.play('idle', true);

    // Kamera podąża za graczem (pionowy scroll klatki)
    this.cameras.main.setBounds(0, 0, W, worldH);
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setDeadzone(W * 0.4, viewH * 0.4);

    // === PHYSICS ===
    this.playerVelocityX = 0;
    this.moveSpeed = 150;

    // === INPUT ===
    this.keys = this.input.keyboard.addKeys({
      LEFT: Phaser.Input.Keyboard.KeyCodes.LEFT,
      RIGHT: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      A: 'A',
      D: 'D',
      E: 'E'
    });

    // === EXIT - GRACZ POJAWIA SIĘ W DRZWIACH ===
    this.input.keyboard.on('keydown-E', () => {
      this.rainAmbient.stop();
      
      // Zapisz pozycję drzwi dla GameScene
      this.registry.set('playerExitX', this.doorPosition.x);
      this.registry.set('playerExitY', this.doorPosition.y);
      
      this.scene.start('GameScene');
    });
  }

  update(time, delta) {
    const dt = delta / 1000;

    // Movement tylko w osi X; Y zależy od przebiegu schodów
    let moveX = 0;
    let moveY = 0; // używane tylko do animacji (brak wolnego ruchu Y)
    if (this.keys.LEFT.isDown || this.keys.A.isDown) moveX = -1;
    if (this.keys.RIGHT.isDown || this.keys.D.isDown) moveX = 1;

    this.player.x += moveX * this.moveSpeed * dt;
    this.player.x = Phaser.Math.Clamp(this.player.x, 40, this.scale.width - 40);

    const limitH = this.worldH || this.scale.height;
    let targetY = this.groundLevel ? this.groundLevel - 10 : limitH - 90;
    for (const seg of this.stairSegments || []) {
      const minX = Math.min(seg.x1, seg.x2);
      const maxX = Math.max(seg.x1, seg.x2);
      if (this.player.x >= minX && this.player.x <= maxX) {
        const t = (this.player.x - seg.x1) / (seg.x2 - seg.x1);
        targetY = Phaser.Math.Linear(seg.y1, seg.y2, t) - 10;
        break;
      }
    }
    this.player.y = Phaser.Math.Clamp(targetY, 40, limitH - 40);

    if (moveX < 0) this.player.setFlipX(true);
    else if (moveX > 0) this.player.setFlipX(false);

    if (moveX !== 0 || moveY !== 0) {
      if (this.player.anims.currentAnim?.key !== 'walk_side') {
        this.player.play('walk_side');
      }
    } else {
      if (this.player.anims.currentAnim?.key !== 'idle') {
        this.player.play('idle', true);
      }
    }
  }
}



