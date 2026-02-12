class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  applySettings() {
    const settings = JSON.parse(
      localStorage.getItem('settings_saveThemAll') || '{}'
    );

    const volume = typeof settings.volume === 'number'
      ? settings.volume
      : 0.5;

    this.sound.volume = volume;

    const brightness = settings.brightness ?? 0.5;
    const cssValue = 0.3 + brightness * 1.2;
    this.game.canvas.style.filter = `brightness(${cssValue})`;
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

    // === INICJALIZACJA ZMIENNYCH WSPINACZKI (MUSI BYĆ NA POCZĄTKU!) ===
    this.isClimbing = false;
    this.climbingLadders = [];
    this.nearLadder = false;
    this.ladderPrompt = null;
    this.climbProgress = 0;
    this.isSlipping = false;
    this.climbingLadder = null;
    this.climbStartY = 0;
    this.hasAttemptedClimb = false; // Śledź czy gracz już próbował wspinaczki na tej drabinie

    // === DRZWI BUDYNKU ===
    this.nearDoor = false;
    this.doorPrompt = null;
    this.buildingDoors = []; // Lista drzwi budynków

    // 2D PLATFORMER - szeroka mapa
    this.mapWidth = W * 3;
    this.mapHeight = H;
    this.groundY = this.mapHeight - 100;
    this.footerY = this.mapHeight - 80;

    // === PIXEL ART TŁO - WIDOK Z BOKU ===
    const bg = this.add.graphics();
    bg.setDepth(0);
    const px = 4;

    // NIEBO - Hiperrealistyczne gradientowe niebo burzowe
    // Gradient od ciemnego fioletu na górze do ciemnego niebieskiego w środku
    for (let y = 0; y < this.groundY; y += 2) {
      const progress = y / this.groundY;
      let r, g, b;
      
      if (progress < 0.3) {
        // Góra - ciemny fiolet
        r = Math.floor(10 + progress * 20);
        g = Math.floor(10 + progress * 15);
        b = Math.floor(25 + progress * 30);
      } else if (progress < 0.7) {
        // Środek - ciemny niebieski z szarością
        r = Math.floor(15 + (progress - 0.3) * 20);
        g = Math.floor(18 + (progress - 0.3) * 22);
        b = Math.floor(35 + (progress - 0.3) * 25);
      } else {
        // Dół - ciemniejszy, przejście do horyzontu
        r = Math.floor(22 + (progress - 0.7) * 15);
        g = Math.floor(25 + (progress - 0.7) * 18);
        b = Math.floor(30 + (progress - 0.7) * 20);
      }
      
      const color = (r << 16) | (g << 8) | b;
      bg.fillStyle(color, 1);
      bg.fillRect(0, y, this.mapWidth, 2);
    }

    // CHMURY BURZOWE - ciemne, wielowarstwowe
    const clouds = [
      { x: 100, y: 40, w: 250, h: 80, darkness: 0.7 },
      { x: 400, y: 60, w: 300, h: 100, darkness: 0.8 },
      { x: 700, y: 30, w: 220, h: 70, darkness: 0.65 },
      { x: 1000, y: 50, w: 280, h: 90, darkness: 0.75 },
      { x: 1350, y: 45, w: 260, h: 85, darkness: 0.7 },
      { x: 1650, y: 35, w: 240, h: 75, darkness: 0.68 },
      { x: 1950, y: 55, w: 290, h: 95, darkness: 0.78 },
      { x: 2300, y: 40, w: 270, h: 80, darkness: 0.72 }
    ];

    clouds.forEach(cloud => {
      // Warstwa główna chmury
      bg.fillStyle(0x1a1a2a, cloud.darkness);
      bg.fillEllipse(cloud.x + cloud.w / 2, cloud.y + cloud.h / 2, cloud.w / 2, cloud.h / 2);
      
      // Dodatkowe "garby" chmury
      bg.fillEllipse(cloud.x + cloud.w * 0.3, cloud.y + cloud.h * 0.4, cloud.w * 0.25, cloud.h * 0.35);
      bg.fillEllipse(cloud.x + cloud.w * 0.7, cloud.y + cloud.h * 0.5, cloud.w * 0.28, cloud.h * 0.4);
      
      // Ciemniejszy dół chmury (deszcz)
      bg.fillStyle(0x0f0f1a, cloud.darkness + 0.1);
      bg.fillRect(cloud.x + cloud.w * 0.2, cloud.y + cloud.h * 0.7, cloud.w * 0.6, cloud.h * 0.4);
      
      // Delikatne rozjaśnienie na brzegach
      bg.fillStyle(0x2a2a3a, cloud.darkness * 0.5);
      bg.fillEllipse(cloud.x + cloud.w * 0.5, cloud.y + cloud.h * 0.3, cloud.w * 0.4, cloud.h * 0.3);
    });

    // MGŁA/DYMKA W ODDALI
    for (let i = 0; i < 5; i++) {
      const fogY = this.groundY * 0.4 + i * 20;
      bg.fillStyle(0x2a2a3a, 0.1 + i * 0.02);
      bg.fillRect(0, fogY, this.mapWidth, 30);
    }

    // GWIAZDY - mniej widoczne przez chmury
    for (let i = 0; i < 150; i++) {
      const x = Math.floor(Math.random() * (this.mapWidth / px)) * px;
      const y = Math.floor(Math.random() * (this.groundY * 0.4 / px)) * px;
      const alpha = Math.random() * 0.4 + 0.2; // Słabsze przez chmury
      bg.fillStyle(0xffffff, alpha);
      bg.fillRect(x, y, px, px);
    }

    // KSIĘŻYC - zasunięty przez chmury
    bg.fillStyle(0xffdd88, 0.6);
    const moonX = this.mapWidth * 0.7;
    const moonY = 80;
    for (let i = -5; i <= 5; i++) {
      for (let j = -5; j <= 5; j++) {
        if (Math.hypot(i, j) <= 5) {
          bg.fillRect(moonX + i * px, moonY + j * px, px, px);
        }
      }
    }
    
    // Halo wokół księżyca
    bg.fillStyle(0xffee99, 0.15);
    for (let i = -8; i <= 8; i++) {
      for (let j = -8; j <= 8; j++) {
        const dist = Math.hypot(i, j);
        if (dist > 5 && dist <= 8) {
          bg.fillRect(moonX + i * px, moonY + j * px, px, px);
        }
      }
    }

    // BUDYNKI W TLE - różne wysokości
    this.buildings = [
      { x: 100, w: 150, h: 200 },
      { x: 300, w: 180, h: 250 },
      { x: 550, w: 120, h: 180 },
      { x: 750, w: 200, h: 280 },
      { x: 1000, w: 140, h: 220 },
      { x: 1200, w: 160, h: 240 },
      { x: 1450, w: 190, h: 260 },
      { x: 1700, w: 130, h: 200 },
      { x: 1900, w: 170, h: 230 },
      { x: 2150, w: 150, h: 210 }
    ];
    
    // Inicjalizuj stany okien (czy świecą)
    this.buildings.forEach(b => {
      const rows = Math.floor(b.h / 40);
      const cols = Math.floor(b.w / 40);
      b.windows = [];
      
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          b.windows.push({
            row: row,
            col: col,
            isLit: Math.random() > 0.75 // Początkowo tylko 25% świeci (noc)
          });
        }
      }
    });
    
    // Timer dla zmian świateł
    this.windowLightTimer = 0;

    this.buildings.forEach(b => {
      const y = this.groundY - b.h;
      
      // CIEŃ BUDYNKU (lewy bok)
      bg.fillStyle(0x050810, 0.6);
      bg.fillRect(b.x - 8, y + 8, 8, b.h);
      
      // GŁÓWNA ŚCIANA - gradient od lewej (ciemniejszej) do prawej (jaśniejszej)
      for (let i = 0; i < b.w; i += 4) {
        const brightness = 0.08 + (i / b.w) * 0.08;
        const r = Math.floor(15 * (1 + brightness));
        const g = Math.floor(20 * (1 + brightness));
        const bl = Math.floor(32 * (1 + brightness));
        const color = (r << 16) | (g << 8) | bl;
        bg.fillStyle(color, 0.85);
        bg.fillRect(b.x + i, y, 4, b.h);
      }
      
      // DACH - ciemniejszy z detalami
      bg.fillStyle(0x0a0f18, 0.9);
      bg.fillRect(b.x - 4, y - 6, b.w + 8, 6);
      
      // Krawędź dachu
      bg.fillStyle(0x151a25, 0.8);
      bg.fillRect(b.x - 4, y - 2, b.w + 8, 2);
      
      // TEKSTURA ŚCIANY - wertykalne linie (beton/fugi)
      bg.fillStyle(0x0a0f18, 0.3);
      for (let i = 0; i < b.w; i += 30) {
        bg.fillRect(b.x + i, y, 1, b.h);
      }
      
      // Horyzontalne linie (piętra)
      for (let j = 0; j < b.h; j += 40) {
        bg.fillRect(b.x, y + j, b.w, 1);
      }
      
      // OKNA - realistyczne z ramami i refleksami
      const rows = Math.floor(b.h / 40);
      const cols = Math.floor(b.w / 40);
      
      // Pozycja wejścia (aby nie rysować okien w tym miejscu)
      const entranceColStart = Math.floor(cols / 2) - 1;
      const entranceColEnd = Math.floor(cols / 2) + 1;
      const minWindowY = this.groundY - 23; // Połowa wysokości drzwi (45/2 ≈ 23)
      
      b.windows.forEach(window => {
        const wx = b.x + 15 + window.col * 40;
        const wy = y + 20 + window.row * 40;
        const light = window.isLit;
        
        // Pomiń okna na parterze w miejscu drzwi (ostatnie 2 rzędy, środkowe kolumny)
        const isEntranceArea = window.row >= rows - 2 && window.col >= entranceColStart && window.col <= entranceColEnd;
        if (isEntranceArea) return;
        
        // Pomiń okna które byłyby poniżej połowy wysokości drzwi
        if (wy > minWindowY) return;
        
        // Rama okna
        bg.fillStyle(0x1a1f2a, 0.9);
        bg.fillRect(wx - 1, wy - 1, 18, 22);
        
        // Szyba
        if (light) {
          // Oświetlone okno - gradient
          bg.fillStyle(0xffee66, 0.8);
          bg.fillRect(wx, wy, 16, 20);
          bg.fillStyle(0xffdd44, 0.6);
          bg.fillRect(wx, wy + 10, 16, 10);
          
          // Podział okna (krzyż)
          bg.fillStyle(0x0a0a0a, 0.8);
          bg.fillRect(wx + 7, wy, 2, 20);
          bg.fillRect(wx, wy + 9, 16, 2);
          
          // Światło wychodzące z okna (blask)
          bg.fillStyle(0xffee66, 0.15);
          bg.fillRect(wx - 2, wy - 2, 20, 24);
        } else {
          // Ciemne okno - refleks nieba
          bg.fillStyle(0x1a2244, 0.7);
          bg.fillRect(wx, wy, 16, 20);
          
          // Refleks księżyca/nieba - TYLKO dla ciemnych okien
          bg.fillStyle(0x2a3355, 0.4);
          bg.fillRect(wx + 2, wy + 2, 6, 8);
          
          // Podział okna (krzyż)
          bg.fillStyle(0x0a0a0a, 0.8);
          bg.fillRect(wx + 7, wy, 2, 20);
          bg.fillRect(wx, wy + 9, 16, 2);
        }
      });
      
      // BALKONY (co drugie piętro, losowo)
      for (let row = 1; row < rows; row += 2) {
        if (Math.random() > 0.5) {
          const balconyX = b.x + Math.floor(Math.random() * (cols - 1)) * 40 + 10;
          const balconyY = y + 15 + row * 40;
          
          // Balustrada
          bg.fillStyle(0x2a2f3a, 0.8);
          bg.fillRect(balconyX, balconyY + 10, 25, 8);
          bg.fillRect(balconyX, balconyY + 10, 2, 8);
          bg.fillRect(balconyX + 23, balconyY + 10, 2, 8);
          
          // Płyta balkonu
          bg.fillStyle(0x1a1f2a, 0.7);
          bg.fillRect(balconyX - 2, balconyY + 18, 29, 3);
        }
      }
      
      // ANTENY/INSTALACJE NA DACHU
      if (Math.random() > 0.4) {
        const antennaX = b.x + b.w / 2;
        bg.fillStyle(0x3a3a3a, 0.9);
        bg.fillRect(antennaX - 1, y - 20, 2, 15);
        bg.fillRect(antennaX - 5, y - 20, 10, 1);
      }
      
      // === HIPERREALISTYCZNE WEJŚCIE DO KLATKI SCHODOWEJ ===
      const entranceX = b.x + b.w / 2 - 14; // Centralnie
      const entranceY = this.groundY - 45; // Na parterze - mniejsze
      const entranceW = 28;
      const entranceH = 45;
      
      // Cień wokół wejścia (wnęka)
      bg.fillStyle(0x000000, 0.5);
      bg.fillRect(entranceX - 2, entranceY - 2, entranceW + 4, entranceH + 4);
      
      // Wnęka wejścia (ciemniejsza przestrzeń)
      bg.fillStyle(0x0a0a0a, 0.8);
      bg.fillRect(entranceX, entranceY, entranceW, entranceH);
      
      // Obramowanie wejścia (kamień/beton)
      bg.fillStyle(0x2a2f35, 0.9);
      bg.fillRect(entranceX - 2, entranceY, 2, entranceH); // Lewa strona
      bg.fillRect(entranceX + entranceW, entranceY, 2, entranceH); // Prawa strona
      bg.fillRect(entranceX - 2, entranceY - 2, entranceW + 4, 2); // Górna belka
      
      // Nadproże (ciemniejsze)
      bg.fillStyle(0x1a1f25, 0.95);
      bg.fillRect(entranceX - 2, entranceY - 2, entranceW + 4, 3);
      
      // STARE DREWNIANE DRZWI - pojedyncze
      const doorX = entranceX + 4;
      const doorY = entranceY + 4;
      const doorW = entranceW - 8;
      const doorH = entranceH - 8;
      
      // Główna powierzchnia drzwi (stare drewno)
      bg.fillStyle(0x3a2a1a, 0.95);
      bg.fillRect(doorX, doorY, doorW, doorH);
      
      // Tekstura drewna (pionowe deski)
      bg.fillStyle(0x2a1a0a, 0.4);
      for (let i = 0; i < doorW; i += 5) {
        bg.fillRect(doorX + i, doorY, 1, doorH);
      }
      
      // Ciemniejsze smugi (stare, zniszczone drewno)
      bg.fillStyle(0x1a1010, 0.3);
      bg.fillRect(doorX + 3, doorY + 5, doorW - 6, 2);
      bg.fillRect(doorX + 2, doorY + doorH / 2, doorW - 4, 1);
      bg.fillRect(doorX + 4, doorY + doorH - 8, doorW - 8, 2);
      
      // Rama drzwi (ciemne drewno)
      bg.fillStyle(0x2a1a0a, 0.95);
      bg.fillRect(doorX, doorY, doorW, 2); // Góra
      bg.fillRect(doorX, doorY + doorH - 2, doorW, 2); // Dół
      bg.fillRect(doorX, doorY, 2, doorH); // Lewa
      bg.fillRect(doorX + doorW - 2, doorY, 2, doorH); // Prawa
      
      // Metalowa klamka (stara, zardzewiała)
      bg.fillStyle(0x4a3a2a, 0.9);
      bg.fillRect(doorX + doorW - 6, doorY + doorH / 2 - 2, 3, 5);
      
      // Domofon obok drzwi (na prawej ścianie)
      bg.fillStyle(0x2a2a2a, 0.9);
      bg.fillRect(entranceX + entranceW + 3, entranceY + 15, 5, 10);
      
      // Ekran domofonu
      bg.fillStyle(0x1a3a4a, 0.8);
      bg.fillRect(entranceX + entranceW + 3.5, entranceY + 16, 4, 3);
      
      // Przyciski domofonu
      bg.fillStyle(0x4a4a4a, 0.8);
      for (let i = 0; i < 3; i++) {
        bg.fillRect(entranceX + entranceW + 4, entranceY + 20 + i * 1.5, 3, 1);
      }
      
      // Numer klatki nad drzwiami
      bg.fillStyle(0x6a7a8a, 0.9);
      bg.fillRect(entranceX + entranceW / 2 - 3, entranceY - 6, 6, 4);
      
      // Oświetlenie nad wejściem (lampa)
      if (Math.random() > 0.3) { // 70% szans że świeci
        bg.fillStyle(0x3a3a3a, 0.9);
        bg.fillRect(entranceX + entranceW / 2 - 2, entranceY - 9, 4, 2);
        
        // Światło z lampy
        bg.fillStyle(0xffee88, 0.4);
        bg.fillRect(entranceX + 3, entranceY - 4, entranceW - 6, 6);
        bg.fillStyle(0xffee88, 0.2);
        bg.fillRect(entranceX - 2, entranceY - 4, entranceW + 4, 10);
      }
      
      // Schody przed wejściem (stopnie)
      bg.fillStyle(0x2a2f35, 0.8);
      bg.fillRect(entranceX - 4, this.groundY - 6, entranceW + 8, 3); // Pierwszy stopień
      bg.fillStyle(0x1a1f25, 0.7);
      bg.fillRect(entranceX - 6, this.groundY - 3, entranceW + 12, 3); // Drugi stopień
      
      // Zapisz pozycję drzwi (tylko pierwsze drzwi!)
      if (this.buildingDoors.length === 0) {
        this.buildingDoors.push({
          x: entranceX + entranceW / 2,
          y: entranceY + entranceH / 2,
          width: entranceW,
          height: entranceH
        });
      }
      
      // KLIMATYZATORY (losowo na ścianach)
      for (let row = 0; row < rows; row++) {
        if (Math.random() > 0.7) {
          const acX = b.x + b.w - 8;
          const acY = y + 25 + row * 40;
          bg.fillStyle(0x2a2a2a, 0.8);
          bg.fillRect(acX, acY, 6, 4);
          bg.fillStyle(0x1a1a1a, 0.6);
          bg.fillRect(acX, acY + 2, 6, 1);
        }
      }
    });

    // === HIPERREALISTYCZNE ELEMENTY MIĘDZY BUDYNKAMI ===
    // Uliczki, rury, śmieci, drabiny, para wodna
    for (let i = 0; i < this.buildings.length - 1; i++) {
      const b1 = this.buildings[i];
      const b2 = this.buildings[i + 1];
      const gapStart = b1.x + b1.w;
      const gapEnd = b2.x;
      const gapWidth = gapEnd - gapStart;
      const gapCenter = gapStart + gapWidth / 2;
      
      if (gapWidth > 30) {
        // RURY PIONOWE (na ścianach budynków)
        const pipeX1 = gapStart + 5;
        const pipeX2 = gapEnd - 10;
        const y1 = this.groundY - b1.h;
        const y2 = this.groundY - b2.h;
        
        // Rura po lewej stronie
        bg.fillStyle(0x2a2a2a, 0.9);
        bg.fillRect(pipeX1, y1 + 20, 6, b1.h - 20);
        bg.fillStyle(0x3a3a3a, 0.7);
        bg.fillRect(pipeX1, y1 + 20, 2, b1.h - 20); // highlight
        // Łączniki rury
        for (let py = y1 + 40; py < this.groundY; py += 50) {
          bg.fillStyle(0x222222, 0.9);
          bg.fillRect(pipeX1 - 2, py, 10, 8);
        }
        
        // Rura po prawej stronie
        bg.fillStyle(0x2a2a2a, 0.9);
        bg.fillRect(pipeX2, y2 + 20, 6, b2.h - 20);
        bg.fillStyle(0x3a3a3a, 0.7);
        bg.fillRect(pipeX2, y2 + 20, 2, b2.h - 20);
        for (let py = y2 + 40; py < this.groundY; py += 50) {
          bg.fillStyle(0x222222, 0.9);
          bg.fillRect(pipeX2 - 2, py, 10, 8);
        }
        
        // DRABINA POŻAROWA (co drugi gap)
        if (i % 2 === 0 && gapWidth > 50) {
          const ladderX = gapCenter - 8;
          const ladderBottom = this.groundY - 30;
          const ladderTop = Math.min(y1, y2) + 40;
          
          // Zapisz pozycję drabiny
          this.climbingLadders.push({
            x: ladderX + 8, // Środek drabiny
            bottomY: ladderBottom,
            topY: ladderTop,
            width: 16
          });
          
          // Boki drabiny
          bg.fillStyle(0x1a1a1a, 0.8);
          bg.fillRect(ladderX, ladderTop, 3, ladderBottom - ladderTop);
          bg.fillRect(ladderX + 13, ladderTop, 3, ladderBottom - ladderTop);
          
          // Szczeble
          for (let ly = ladderTop + 10; ly < ladderBottom; ly += 15) {
            bg.fillStyle(0x222222, 0.8);
            bg.fillRect(ladderX, ly, 16, 3);
          }
          
          // Platforma u góry
          bg.fillStyle(0x0a0a0a, 0.7);
          bg.fillRect(ladderX - 10, ladderTop, 36, 4);
          bg.fillRect(ladderX - 10, ladderTop, 4, 20);
          bg.fillRect(ladderX + 22, ladderTop, 4, 20);
        }
        
        // ŚMIETNIK/DUMPSTER (co trzeci gap)
        if (i % 3 === 1 && gapWidth > 40) {
          const dumpX = gapCenter - 15;
          const dumpY = this.groundY - 25;
          
          // Korpus śmietnika
          bg.fillStyle(0x1a3a1a, 0.9);
          bg.fillRect(dumpX, dumpY, 30, 20);
          
          // Cień
          bg.fillStyle(0x0a1a0a, 0.8);
          bg.fillRect(dumpX, dumpY, 4, 20);
          
          // Pokrywa
          bg.fillStyle(0x2a4a2a, 0.9);
          bg.fillRect(dumpX - 2, dumpY - 3, 34, 4);
          
          // Kółka
          bg.fillStyle(0x0a0a0a, 0.7);
          bg.fillRect(dumpX + 3, this.groundY - 7, 4, 4);
          bg.fillRect(dumpX + 23, this.groundY - 7, 4, 4);
          
          // Śmieci wylewające się
          bg.fillStyle(0x3a3a2a, 0.6);
          bg.fillRect(dumpX + 5, dumpY - 5, 6, 3);
          bg.fillRect(dumpX + 18, dumpY - 4, 4, 3);
        }
        
        // GRAFFITI na ścianach
        if (Math.random() > 0.5 && gapWidth > 35) {
          const graffX = Math.random() > 0.5 ? gapStart + 8 : gapEnd - 20;
          const graffY = this.groundY - 80 - Math.random() * 40;
          
          // Tag graffiti (abstrakcyjny kształt)
          bg.fillStyle(0xff3366, 0.3);
          bg.fillRect(graffX, graffY, 18, 12);
          bg.fillRect(graffX + 3, graffY - 3, 10, 6);
          
          bg.fillStyle(0x33ccff, 0.25);
          bg.fillRect(graffX + 2, graffY + 3, 14, 8);
          
          // Outline/cień
          bg.fillStyle(0x000000, 0.4);
          bg.fillRect(graffX + 1, graffY + 1, 18, 12);
        }
        
        // KABLE/PRZEWODY między budynkami
        if (gapWidth < 150 && Math.random() > 0.3) {
          const cableY = Math.min(y1, y2) + 30 + Math.random() * 50;
          
          bg.lineStyle(2, 0x1a1a1a, 0.6);
          bg.lineBetween(gapStart, cableY, gapEnd, cableY + (Math.random() - 0.5) * 20);
          
          // Drugi kabel niżej
          if (Math.random() > 0.5) {
            bg.lineBetween(gapStart, cableY + 15, gapEnd, cableY + 15 + (Math.random() - 0.5) * 20);
          }
        }
        
        // PUDŁA/SKRZYNKI na ziemi
        if (Math.random() > 0.6 && gapWidth > 40) {
          const boxX = gapStart + 10 + Math.random() * (gapWidth - 30);
          const boxSize = 10 + Math.random() * 8;
          const boxY = this.groundY - boxSize;
          
          bg.fillStyle(0x3a2a1a, 0.8);
          bg.fillRect(boxX, boxY, boxSize, boxSize);
          
          // Cień
          bg.fillStyle(0x1a0a0a, 0.6);
          bg.fillRect(boxX, boxY, 2, boxSize);
          
          // Tekstura drewna
          bg.fillStyle(0x2a1a0a, 0.5);
          bg.fillRect(boxX, boxY + boxSize / 2, boxSize, 1);
          bg.fillRect(boxX + boxSize / 2, boxY, 1, boxSize);
        }
      }
    }

    // === POSTAĆ NA DACHU ===
    this.buildings.forEach(b => {
      const y = this.groundY - b.h;
      
      // Postac na dachu najwyzszego budynku - widoczna tylko gora (siedzi z nogami w dol)
      if (b.h === 280) {
        const personX = b.x + b.w / 2 - px * 2;
        const personY = y - px * 3; // Tylko góra wystaje ponad dach
        
        // Głowa - pochylona w dół, oparta na rękach (smutna)
        bg.fillStyle(0xffccaa, 1);
        bg.fillRect(personX + px * 1, personY, px * 2, px * 2);
        
        // Włosy
        bg.fillStyle(0x442211, 1);
        bg.fillRect(personX + px * 1, personY - px, px * 2, px);
        bg.fillRect(personX, personY, px, px);
        bg.fillRect(personX + px * 3, personY, px, px);
        
        // Oczy - zamknięte lub patrzące w dół (smutne)
        bg.fillStyle(0x000000, 1);
        bg.fillRect(personX + px * 1.25, personY + px * 0.75, px * 0.5, px * 0.25);
        bg.fillRect(personX + px * 2.25, personY + px * 0.75, px * 0.5, px * 0.25);
        
        // Ramiona/górna część bluzy
        bg.fillStyle(0x1a4d7a, 1);
        bg.fillRect(personX + px * 0.5, personY + px * 2, px * 3, px * 1.5);
        
        // Przedramiona zgięte do góry (podtrzymują twarz)
        bg.fillRect(personX + px * 0.5, personY + px * 1, px * 0.75, px * 1.5);
        bg.fillRect(personX + px * 2.75, personY + px * 1, px * 0.75, px * 1.5);
        
        // Dłonie pod twarzą
        bg.fillStyle(0xffccaa, 1);
        bg.fillRect(personX + px * 0.5, personY + px * 0.5, px * 0.75, px * 0.75);
        bg.fillRect(personX + px * 2.75, personY + px * 0.5, px * 0.75, px * 0.75);
      }
    });

    // PODŁOGA
    bg.fillStyle(0x1a1a0f, 1);
    bg.fillRect(0, this.groundY, this.mapWidth, this.mapHeight - this.groundY);
    
    // Tekstura podłogi
    bg.fillStyle(0x2d2d1f, 0.5);
    for (let x = 0; x < this.mapWidth; x += px * 4) {
      for (let y = this.groundY; y < this.mapHeight; y += px * 4) {
        if (Math.random() > 0.6) {
          bg.fillRect(x, y, px * 2, px * 2);
        }
      }
    }

    // PLATFORMY - tylko główna podłoga
    this.platforms = [];
    this.platforms.push({
      left: 0,
      right: this.mapWidth,
      top: this.groundY,
      bottom: this.mapHeight
    });

    // === DŹWIĘK DESZCZU ===
    this.rainAmbient = this.sound.add('ambient_rain', {
      loop: true,
      volume: 1
    });
    this.rainAmbient.play();

    // === HIPERREALISTYCZNY DESZCZ - WIELOWARSTWOWY ===
    // Warstwa tła (daleko, wolno)
    this.rainGraphicsBack = this.add.graphics();
    this.rainGraphicsBack.setDepth(2);
    this.rainDropsBack = [];
    
    for (let i = 0; i < 150; i++) {
      this.rainDropsBack.push({
        x: Math.random() * this.mapWidth,
        y: Math.random() * this.mapHeight,
        speed: 200 + Math.random() * 100,
        angle: 0.1 + Math.random() * 0.08,
        length: 4 + Math.random() * 5,
        thickness: 1,
        layer: 'back'
      });
    }
    
    // Warstwa środkowa (normalna)
    this.rainGraphicsMid = this.add.graphics();
    this.rainGraphicsMid.setDepth(499);
    this.rainDropsMid = [];
    
    for (let i = 0; i < 200; i++) {
      this.rainDropsMid.push({
        x: Math.random() * this.mapWidth,
        y: Math.random() * this.mapHeight,
        speed: 350 + Math.random() * 150,
        angle: 0.15 + Math.random() * 0.1,
        length: 8 + Math.random() * 8,
        thickness: Math.random() > 0.7 ? 2 : 1,
        layer: 'mid'
      });
    }
    
    // Warstwa pierwszego planu (blisko, szybko)
    this.rainGraphicsFront = this.add.graphics();
    this.rainGraphicsFront.setDepth(502);
    this.rainDropsFront = [];
    
    for (let i = 0; i < 100; i++) {
      this.rainDropsFront.push({
        x: Math.random() * this.mapWidth,
        y: Math.random() * this.mapHeight,
        speed: 500 + Math.random() * 200,
        angle: 0.2 + Math.random() * 0.12,
        length: 10 + Math.random() * 10,
        thickness: Math.random() > 0.5 ? 2 : 1,
        layer: 'front'
      });
    }
    
    // Mgła deszczowa (drobne kropelki w powietrzu)
    this.rainMistGraphics = this.add.graphics();
    this.rainMistGraphics.setDepth(1);
    this.rainMist = [];
    
    for (let i = 0; i < 200; i++) {
      this.rainMist.push({
        x: Math.random() * this.mapWidth,
        y: Math.random() * this.mapHeight,
        speed: 50 + Math.random() * 80,
        size: 1 + Math.random() * 2
      });
    }
    
    // Rozpryski (splashes) gdy deszcz uderza w ziemię
    this.rainSplashGraphics = this.add.graphics();
    this.rainSplashGraphics.setDepth(500);
    this.rainSplashes = [];
    
    // Kałuże z falami
    this.puddleGraphics = this.add.graphics();
    this.puddleGraphics.setDepth(1);
    this.puddles = [];
    
    // Tworzymy kilka kałuż
    for (let i = 0; i < 12; i++) {
      this.puddles.push({
        x: 200 + Math.random() * (this.mapWidth - 400),
        y: this.groundY - 2,
        width: 30 + Math.random() * 60,
        height: 8 + Math.random() * 12,
        ripples: [] // Fale na powierzchni
      });
    }
    
    // Wiatr wpływający na deszcz
    this.windStrength = 0;
    this.windTarget = 0;
    this.windTimer = 0;

    // === PIORUNY ===
    this.lightningGraphics = this.add.graphics();
    this.lightningGraphics.setDepth(500);
    this.lightningTimer = 0;
    this.lightningActive = false;
    this.lightningDuration = 0;
    
    // Flash overlay dla błysków
    this.lightningFlash = this.add.rectangle(0, 0, this.mapWidth, this.mapHeight, 0xffffff, 0);
    this.lightningFlash.setOrigin(0, 0);
    this.lightningFlash.setDepth(501);
    this.lightningFlash.setScrollFactor(1, 1);

    // === STATYSTYKI GRACZA ===
    this.hp = 100;
    this.stamina = 100;
    this.battery = 3;
    this.maxHp = 100;
    this.maxStamina = 100;

    // === POZYCJA STARTOWA ===
    let startX = 100;
    let startY = this.groundY - 50;
    
    // Jeśli gracz wraca z budynku, pojawi się w drzwiach
    const exitX = this.registry.get('playerExitX');
    const exitY = this.registry.get('playerExitY');
    if (exitX !== undefined && exitY !== undefined) {
      startX = exitX;
      startY = exitY;
      // Wyczyść registry
      this.registry.set('playerExitX', undefined);
      this.registry.set('playerExitY', undefined);
    }

    this.player = this.add.sprite(startX, startY, 'player');
    this.player.setScale(1.6);
    this.player.setDepth(10);

    // Fizyka 2D platformera
    this.playerVelocityY = 0;
    this.playerVelocityX = 0; // Dodano dla płynnego przyspieszania
    this.gravity = 800;
    this.jumpPower = -200;
    this.isOnGround = false;
    this.facingRight = true;
    
    // Hiperrealistyczny ruch
    this.coyoteTime = 0; // Czas po zejściu z platformy (można skoczyć)
    this.jumpBufferTime = 0; // Bufor skoku (zapamiętuje chęć skoku)
    this.jumpHoldTime = 0; // Czas trzymania przycisku skoku
    this.isJumping = false; // Czy gracz aktualnie skacze
    this.lastInputX = 0; // Ostatni kierunek inputu dla detekcji zmiany kierunku

    this.lastDir = 'side';
    this.flashlightDir = { x: 1, y: 0 };
    this.currentAnimKey = 'idle_side';

    // Kamera śledzi gracza w osi X
    this.cameras.main.setBounds(0, 0, this.mapWidth, this.mapHeight);
    this.cameras.main.startFollow(this.player, false, 0.1, 0);

    // === ANIMACJE - tylko bok (2D platformer) ===
    this.anims.create({
      key: 'walk_side',
      frames: this.anims.generateFrameNumbers('player', { start: 6, end: 7 }),
      frameRate: 8,
      repeat: -1
    });

    this.anims.create({
      key: 'idle_side',
      frames: [{ key: 'player', frame: 6 }]
    });

    this.player.play('idle_side');

    // === INPUT ===
    this.keys = this.input.keyboard.addKeys({
      A: 'A', D: 'D',
      LEFT: 'LEFT', RIGHT: 'RIGHT',
      SHIFT: 'SHIFT', F: 'F', SPACE: 'SPACE', E: 'E'
    });

    this.input.keyboard.on('keydown-ESC', () => {
      if (!this.scene.isActive('PauseMenu')) {
        this.scene.launch('PauseMenu');
        this.scene.pause();
      }
    });

    // === LATARKA ===
    this.flashlightOn = false;
    this.batteryTimer = 0;

    this.input.keyboard.on('keydown-F', () => {
      if (this.battery > 0) {
        this.flashlightOn = !this.flashlightOn;
      } else {
        this.flashlightOn = false;
      }
    });
    
    // === HIPERREALISTYCZNY EKWIPUNEK ===
    this.inventoryOpen = false;
    
    // Przedmioty w ekwipunku
    this.inventoryItems = [
      { name: 'Latarka', icon: 0xffee44, desc: 'Pomaga widzieć w ciemności' },
      { name: 'Baterie', icon: 0x44aa44, desc: `x${this.battery}` },
      { name: 'Apteczka', icon: 0xff3344, desc: 'Leczy obrażenia' },
      { name: 'Napoje', icon: 0x3388ff, desc: 'Regeneruje staminę' },
      { name: 'Mapa', icon: 0xccaa77, desc: 'Pokazuje okolicę' },
      { name: 'Telefon', icon: 0x222222, desc: 'Rozładowany...' }
    ];
    
    // Kontener na UI ekwipunku
    this.inventoryContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(2000).setVisible(false);
    
    this.input.keyboard.on('keydown-E', () => {
      this.inventoryOpen = !this.inventoryOpen;
      
      if (this.inventoryOpen) {
        this.showInventory();
      } else {
        this.hideInventory();
      }
    });
    
    // === HIPERREALISTYCZNY EKWIPUNEK ===
    this.inventoryOpen = false;
    
    // Przedmioty w ekwipunku
    this.inventoryItems = [
      { name: 'Latarka', icon: 0xffee44, desc: 'Pomaga widzieć w ciemności' },
      { name: 'Baterie', icon: 0x44aa44, desc: `x${this.battery}` },
      { name: 'Apteczka', icon: 0xff3344, desc: 'Leczy obrażenia' },
      { name: 'Napoje', icon: 0x3388ff, desc: 'Regeneruje staminę' },
      { name: 'Mapa', icon: 0xccaa77, desc: 'Pokazuje okolicę' },
      { name: 'Telefon', icon: 0x222222, desc: 'Rozładowany...' }
    ];
    
    this.input.keyboard.on('keydown-E', () => {
      this.inventoryOpen = !this.inventoryOpen;
      
      if (this.inventoryOpen) {
        this.showInventory();
      } else {
        this.hideInventory();
      }
    });
    
    // Kontener na UI ekwipunku
    this.inventoryContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(2000).setVisible(false);

    this.flashlightGraphics = this.add.graphics();
    this.flashlightGraphics.setDepth(503);

    this.vignetteGraphics = null; // Inicjalizacja dla efektu wspinaczki
    this.slipperyMessage = null; // Komunikat "za ślisko"

    // === UI ===
    this.add.text(20, 16, 'HP', { font: '12px Arial', fill: '#fff' }).setScrollFactor(0).setDepth(1000);
    this.add.rectangle(50, 16, 104, 14, 0x000000).setOrigin(0).setScrollFactor(0).setDepth(1000);
    this.hpBar = this.add.rectangle(52, 18, 100, 10, 0x22ff66).setOrigin(0).setScrollFactor(0).setDepth(1000);

    this.add.text(20, 36, 'STAMINA', { font: '12px Arial', fill: '#fff' }).setScrollFactor(0).setDepth(1000);
    this.add.rectangle(80, 36, 104, 14, 0x000000).setOrigin(0).setScrollFactor(0).setDepth(1000);
    this.staminaBar = this.add.rectangle(82, 38, 100, 10, 0x3399ff).setOrigin(0).setScrollFactor(0).setDepth(1000);

    this.add.text(20, 58, 'BATTERY', { font: '12px Arial', fill: '#fff' }).setScrollFactor(0).setDepth(1000);

    const bx = 90, by = 58;
    this.add.rectangle(bx - 6, by + 4, 4, 8, 0xffffff).setOrigin(0).setScrollFactor(0).setDepth(1000);
    this.add.rectangle(bx, by, 46, 16, 0x000000).setOrigin(0).setScrollFactor(0).setDepth(1000);

    this.batterySegments = [];
    for (let i = 0; i < 3; i++) {
      const seg = this.add.rectangle(bx + 2 + i * 14, by + 2, 12, 12, 0xffff66)
        .setOrigin(0).setScrollFactor(0).setDepth(1000);
      this.batterySegments.push(seg);
    }

    // === STOPKA NA MAPIE - na środku początkowego ekranu ===
    this.worldFooterTitle = this.add.text(
      W / 2, this.footerY,
      'SAVE THEM ALL', { font: '18px Arial', fill: '#fff' }
    ).setOrigin(0.5).setDepth(100);

    this.worldFooterInfo = this.add.text(
      W / 2, this.footerY + 30,
      'EU: 112  |  PL: 116 123  |  USA: 988  |  findahelpline.com',
      { font: '12px Arial', fill: '#aaa' }
    ).setOrigin(0.5).setDepth(100);

    // === STOPKA W PRAWYM GÓRNYM ROGU (UI) ===
    this.uiFooterTitle = this.add.text(
      W - 20, 16, 'SAVE THEM ALL',
      { font: '14px Arial', fill: '#fff' }
    ).setOrigin(1, 0).setScrollFactor(0).setDepth(1000).setVisible(false);

    this.uiFooterInfo = this.add.text(
      W - 20, 36, 'EU 112 | PL 116 123 | USA 988',
      { font: '11px Arial', fill: '#aaa' }
    ).setOrigin(1, 0).setScrollFactor(0).setDepth(1000).setVisible(false);

    this.uiFooterLink = this.add.text(
      W - 20, 52, 'findahelpline.com',
      { font: '11px Arial', fill: '#777' }
    ).setOrigin(1, 0).setScrollFactor(0).setDepth(1000).setVisible(false);



    this.applySettings();
  }
  
  showInventory() {
    const W = this.scale.width;
    const H = this.scale.height;
    
    this.inventoryContainer.removeAll(true);
    
    const overlay = this.add.rectangle(0, 0, W, H, 0x000000, 0.85).setOrigin(0);
    this.inventoryContainer.add(overlay);
    
    const panelW = 500;
    const panelH = 400;
    const panelX = W / 2 - panelW / 2;
    const panelY = H / 2 - panelH / 2;
    
    const shadowPanel = this.add.rectangle(panelX + 4, panelY + 4, panelW, panelH, 0x000000, 0.5).setOrigin(0);
    this.inventoryContainer.add(shadowPanel);
    
    const mainPanel = this.add.rectangle(panelX, panelY, panelW, panelH, 0x1a1f2a, 1).setOrigin(0);
    this.inventoryContainer.add(mainPanel);
    
    const innerBorder = this.add.rectangle(panelX + 2, panelY + 2, panelW - 4, panelH - 4, 0x2a3544, 1).setOrigin(0);
    this.inventoryContainer.add(innerBorder);
    
    const innerPanel = this.add.rectangle(panelX + 4, panelY + 4, panelW - 8, panelH - 8, 0x151a24, 1).setOrigin(0);
    this.inventoryContainer.add(innerPanel);
    
    const title = this.add.text(W / 2, panelY + 20, 'EKWIPUNEK', {
      font: 'bold 24px Arial',
      fill: '#fff',
      stroke: '#000',
      strokeThickness: 3
    }).setOrigin(0.5);
    this.inventoryContainer.add(title);
    
    const subtitle = this.add.text(W / 2, panelY + 48, 'Naciśnij E aby zamknąć', {
      font: '12px Arial',
      fill: '#888'
    }).setOrigin(0.5);
    this.inventoryContainer.add(subtitle);
    
    const itemSize = 90;
    const itemSpacing = 20;
    const startX = panelX + 50;
    const startY = panelY + 80;
    
    this.inventoryItems.forEach((item, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      
      const itemX = startX + col * (itemSize + itemSpacing);
      const itemY = startY + row * (itemSize + itemSpacing);
      
      const slotShadow = this.add.rectangle(itemX + 2, itemY + 2, itemSize, itemSize, 0x000000, 0.5).setOrigin(0);
      this.inventoryContainer.add(slotShadow);
      
      const slot = this.add.rectangle(itemX, itemY, itemSize, itemSize, 0x0a0f18, 1).setOrigin(0);
      this.inventoryContainer.add(slot);
      
      const slotBorder = this.add.rectangle(itemX + 1, itemY + 1, itemSize - 2, itemSize - 2, 0x1a2533, 1).setOrigin(0);
      this.inventoryContainer.add(slotBorder);
      
      const iconSize = 35;
      const iconCircle = this.add.circle(itemX + itemSize / 2, itemY + iconSize / 2 + 8, iconSize / 2, item.icon, 0.9);
      this.inventoryContainer.add(iconCircle);
      
      const iconGlow = this.add.circle(itemX + itemSize / 2, itemY + iconSize / 2 + 8, iconSize / 2 + 3, item.icon, 0.2);
      this.inventoryContainer.add(iconGlow);
      
      const itemName = this.add.text(itemX + itemSize / 2, itemY + 55, item.name, {
        font: 'bold 11px Arial',
        fill: '#fff',
        align: 'center'
      }).setOrigin(0.5);
      this.inventoryContainer.add(itemName);
      
      const itemDesc = this.add.text(itemX + itemSize / 2, itemY + 72, item.desc, {
        font: '9px Arial',
        fill: '#888',
        align: 'center',
        wordWrap: { width: itemSize - 10 }
      }).setOrigin(0.5);
      this.inventoryContainer.add(itemDesc);
    });
    
    const infoX = startX + 2 * (itemSize + itemSpacing) + 30;
    const infoY = startY;
    
    const infoTitle = this.add.text(infoX, infoY, 'STATUS', {
      font: 'bold 14px Arial',
      fill: '#fff'
    }).setOrigin(0);
    this.inventoryContainer.add(infoTitle);
    
    const infoLines = [
      `HP: ${Math.floor(this.hp)}/${this.maxHp}`,
      `Stamina: ${Math.floor(this.stamina)}/${this.maxStamina}`,
      `Bateria: ${this.battery}/3`,
      '',
      'Latarka: F',
      'Ekwipunek: E'
    ];
    
    infoLines.forEach((line, i) => {
      const text = this.add.text(infoX, infoY + 25 + i * 18, line, {
        font: '11px Arial',
        fill: line === '' ? '#000' : '#aaa'
      }).setOrigin(0);
      this.inventoryContainer.add(text);
    });
    
    this.inventoryContainer.setVisible(true);
  }
  
  hideInventory() {
    this.inventoryContainer.setVisible(false);
  }

  updateRain(delta) {
    const dt = delta / 1000;
    
    // === WIATR (zmienia się stopniowo) ===
    this.windTimer += dt;
    if (this.windTimer > 2 + Math.random() * 3) {
      this.windTarget = -0.3 + Math.random() * 0.6; // -0.3 do 0.3
      this.windTimer = 0;
    }
    // Płynna interpolacja wiatru
    this.windStrength += (this.windTarget - this.windStrength) * dt * 0.5;
    
    // === KAŁUŻE - rysuj podstawę ===
    this.puddleGraphics.clear();
    this.puddles.forEach(puddle => {
      // Główna kałuża (ciemna, refleksyjna)
      this.puddleGraphics.fillStyle(0x1a2233, 0.6);
      this.puddleGraphics.fillEllipse(puddle.x, puddle.y, puddle.width, puddle.height);
      
      // Refleks nieba
      this.puddleGraphics.fillStyle(0x2a3344, 0.3);
      this.puddleGraphics.fillEllipse(puddle.x - 5, puddle.y - 2, puddle.width * 0.6, puddle.height * 0.5);
      
      // Fale (ripples)
      puddle.ripples = puddle.ripples.filter(r => {
        r.radius += r.speed * dt;
        r.alpha -= dt * 2;
        
        if (r.alpha > 0) {
          this.puddleGraphics.lineStyle(1, 0xaabbcc, r.alpha * 0.4);
          this.puddleGraphics.strokeCircle(r.x, r.y, r.radius);
          return true;
        }
        return false;
      });
    });
    
    // === MGŁA DESZCZOWA (tło) ===
    this.rainMistGraphics.clear();
    this.rainMist.forEach(mist => {
      mist.y += mist.speed * dt;
      mist.x += this.windStrength * mist.speed * dt;
      
      if (mist.y > this.groundY) {
        mist.y = -10;
        mist.x = Math.random() * this.mapWidth;
      }
      
      if (mist.y < this.groundY) {
        this.rainMistGraphics.fillStyle(0xaabbcc, 0.08);
        this.rainMistGraphics.fillCircle(mist.x, mist.y, mist.size);
      }
    });
    
    // === DESZCZ - WARSTWA TŁOWA ===
    this.rainGraphicsBack.clear();
    this.updateRainLayer(this.rainDropsBack, this.rainGraphicsBack, dt, 0.3, 0xaabbcc);
    
    // === DESZCZ - WARSTWA ŚRODKOWA ===
    this.rainGraphicsMid.clear();
    this.updateRainLayer(this.rainDropsMid, this.rainGraphicsMid, dt, 0.6, 0xaabbcc);
    
    // === DESZCZ - WARSTWA PIERWSZEGO PLANU ===
    this.rainGraphicsFront.clear();
    this.updateRainLayer(this.rainDropsFront, this.rainGraphicsFront, dt, 0.85, 0xddeeff);
    
    // === ROZPRYSKI ===
    this.rainSplashGraphics.clear();
    this.rainSplashes = this.rainSplashes.filter(splash => {
      splash.life -= dt * 4;
      
      if (splash.life > 0) {
        splash.particles.forEach(p => {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += 400 * dt; // Grawitacja na cząstki
        });
        
        // Rysuj cząstki rozprysku
        splash.particles.forEach(p => {
          this.rainSplashGraphics.fillStyle(0xaabbcc, splash.life * 0.5);
          this.rainSplashGraphics.fillCircle(p.x, p.y, 1);
        });
        
        return true;
      }
      return false;
    });
  }
  
  updateRainLayer(drops, graphics, dt, opacity, color) {
    drops.forEach(drop => {
      // Wpływ wiatru zależny od warstwy
      const windEffect = drop.layer === 'front' ? 1.2 : (drop.layer === 'mid' ? 1.0 : 0.7);
      
      drop.y += drop.speed * dt;
      drop.x += (drop.angle + this.windStrength * windEffect) * drop.speed * dt;
      
      // Resetuj gdy deszcz dotrze do ziemi lub wyjdzie poza mapę
      if (drop.y > this.groundY || drop.x < 0 || drop.x > this.mapWidth) {
        // Stwórz rozprysk przy uderzeniu w ziemię
        if (drop.y >= this.groundY - 5 && drop.x >= 0 && drop.x <= this.mapWidth) {
          this.createRainSplash(drop.x, this.groundY);
        }
        
        drop.y = -20 - Math.random() * 50;
        drop.x = Math.random() * this.mapWidth;
      }
      
      // Rysuj kropę deszczu
      if (drop.y < this.groundY) {
        const actualAngle = drop.angle + this.windStrength * windEffect;
        
        // Główna linia deszczu
        graphics.lineStyle(drop.thickness, color, opacity * 0.8);
        
        const endY = Math.min(drop.y + drop.length, this.groundY);
        const actualLength = endY - drop.y;
        
        graphics.lineBetween(
          drop.x,
          drop.y,
          drop.x + actualAngle * actualLength,
          endY
        );
        
        // Motion blur trail (ślad ruchu)
        graphics.lineStyle(drop.thickness * 0.6, color, opacity * 0.25);
        graphics.lineBetween(
          drop.x,
          drop.y - actualLength * 0.4,
          drop.x + actualAngle * actualLength * 0.4,
          drop.y
        );
        
        // Highlight na kropli (błysk światła)
        if (drop.thickness >= 2 && Math.random() > 0.85) {
          graphics.lineStyle(1, 0xffffff, opacity * 0.4);
          const highlightLen = actualLength * 0.3;
          graphics.lineBetween(
            drop.x,
            drop.y,
            drop.x + actualAngle * highlightLen,
            drop.y + highlightLen
          );
        }
      }
    });
  }
  
  createRainSplash(x, y) {
    // Sprawdź czy trafił w kałużę - jeśli tak, dodaj fale
    this.puddles.forEach(puddle => {
      const dx = x - puddle.x;
      const dy = y - puddle.y;
      const inPuddle = (dx * dx) / (puddle.width * puddle.width) + 
                       (dy * dy) / (puddle.height * puddle.height) < 0.25;
      
      if (inPuddle && Math.random() > 0.7) {
        puddle.ripples.push({
          x: x,
          y: y,
          radius: 2,
          speed: 40,
          alpha: 1
        });
      }
    });
    
    // Dodaj rozprysk (tylko co 3. dla wydajności)
    if (Math.random() > 0.7) {
      const particles = [];
      const particleCount = 3 + Math.floor(Math.random() * 4);
      
      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 20 + Math.random() * 40;
        particles.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 50 // Lekko w górę
        });
      }
      
      this.rainSplashes.push({
        particles: particles,
        life: 1
      });
    }
  }

  createLightning() {
    this.lightningGraphics.clear();
    
    // Losowa pozycja pioruna
    const startX = Math.random() * this.mapWidth;
    const startY = 0;
    let currentX = startX;
    let currentY = startY;
    
    const segments = 8 + Math.floor(Math.random() * 12);
    const points = [{ x: currentX, y: currentY }];
    
    // Generuj zygzakowaty piorun do groundY (ziemi)
    const targetY = this.groundY;
    for (let i = 0; i < segments; i++) {
      currentY += (targetY / segments) + (Math.random() * 30 - 15);
      currentX += (Math.random() * 60 - 30);
      points.push({ x: currentX, y: currentY });
    }
    
    // Rysuj główny piorun
    this.lightningGraphics.lineStyle(3, 0xffffff, 0.9);
    for (let i = 0; i < points.length - 1; i++) {
      this.lightningGraphics.lineBetween(
        points[i].x,
        points[i].y,
        points[i + 1].x,
        points[i + 1].y
      );
    }
    
    // Dodaj świecenie wokół pioruna
    this.lightningGraphics.lineStyle(8, 0xaaddff, 0.3);
    for (let i = 0; i < points.length - 1; i++) {
      this.lightningGraphics.lineBetween(
        points[i].x,
        points[i].y,
        points[i + 1].x,
        points[i + 1].y
      );
    }
    
    // Losowe rozgałęzienia
    for (let i = 2; i < points.length - 2; i += 2) {
      if (Math.random() > 0.5) {
        const branchLength = 3 + Math.floor(Math.random() * 4);
        let bx = points[i].x;
        let by = points[i].y;
        
        this.lightningGraphics.lineStyle(2, 0xffffff, 0.7);
        for (let j = 0; j < branchLength; j++) {
          const nx = bx + (Math.random() * 40 - 20);
          const ny = by + 20 + Math.random() * 20;
          this.lightningGraphics.lineBetween(bx, by, nx, ny);
          bx = nx;
          by = ny;
        }
      }
    }
    
    this.lightningActive = true;
    this.lightningDuration = 0;
    
    // Błysk ekranu
    this.lightningFlash.setAlpha(0.4);
    this.tweens.add({
      targets: this.lightningFlash,
      alpha: 0,
      duration: 150,
      ease: 'Power2'
    });
  }

  getMovementKeys() {
    const settings = JSON.parse(
      localStorage.getItem('settings_saveThemAll') || '{}'
    );
    const scheme = settings.controls || 'WASD';
    
    if (scheme === 'ARROWS') {
      return {
        left: this.keys.LEFT,
        right: this.keys.RIGHT
      };
    } else {
      return {
        left: this.keys.A,
        right: this.keys.D
      };
    }
  }

  update(time, delta) {
    // Jeśli input jest zablokowany (gra sie zakonczyła), nie rób nic z ruchem gracza
    if (this.inputBlocked) {
      return; // Wyświetl ekran Game Over ale nie ruszaj graczem ani nic nie robi
    }

    // === DESZCZ ===
    this.updateRain(delta);
    
    // === DYNAMICZNE ŚWIATŁA W OKNACH ===
    this.windowLightTimer += delta;
    
    // Co 4-10 sekund zmień światło w losowym oknie
    if (this.windowLightTimer > 4000 + Math.random() * 6000) {
      // Wybierz losowy budynek
      const randomBuilding = this.buildings[Math.floor(Math.random() * this.buildings.length)];
      
      // Wybierz losowe okno w tym budynku
      if (randomBuilding.windows && randomBuilding.windows.length > 0) {
        const randomWindow = randomBuilding.windows[Math.floor(Math.random() * randomBuilding.windows.length)];
        
        // Przełącz stan światła
        randomWindow.isLit = !randomWindow.isLit;
      }
      
      this.windowLightTimer = 0;
    }

    // === PIORUNY ===
    this.lightningTimer += delta;
    
    // Co 3-8 sekund losowy piorun
    if (this.lightningTimer > 3000 + Math.random() * 5000) {
      this.createLightning();
      this.lightningTimer = 0;
    }
    
    // Ukryj piorun po krótkim czasie
    if (this.lightningActive) {
      this.lightningDuration += delta;
      if (this.lightningDuration > 100) {
        this.lightningGraphics.clear();
        this.lightningActive = false;
      }
    }

    const dt = delta / 1000;

    // === STAŁE HIPERREALISTYCZNEGO RUCHU ===
    const walkSpeed = 200;
    const runSpeed = 240;
    const acceleration = 2500; // Szybsze przyspieszenie
    const deceleration = 3000; // Szybsze hamowanie
    const airControl = 0.6; // Kontrola w powietrzu (60%)
    const coyoteTimeMax = 0.15; // 150ms po zejściu można skoczyć
    const jumpBufferTimeMax = 0.1; // 100ms bufor skoku
    const jumpStaminaCost = 15; // Koszt staminy za skok
    const minJumpHoldTime = 0.05; // Minimalny czas trzymania dla najniższego skoku
    const maxJumpHoldTime = 0.3; // Maksymalny czas trzymania dla najwyższego skoku

    // === INPUT ===
    const moveKeys = this.getMovementKeys();
    
    let inputX = 0;
    if (moveKeys.left.isDown) inputX = -1;
    if (moveKeys.right.isDown) inputX = 1;

    const isMoving = inputX !== 0;
    const isRunning = this.keys.SHIFT.isDown && this.stamina > 0 && isMoving;
    const targetSpeed = isRunning ? runSpeed : walkSpeed;
    
    // Detekcja zmiany kierunku (zawracanie)
    const isChangingDirection = inputX !== 0 && this.lastInputX !== 0 && 
                                Math.sign(inputX) !== Math.sign(this.lastInputX);
    if (inputX !== 0) this.lastInputX = inputX;

    // === STAMINA / HP ===
    this.stamina += (isRunning ? -30 : 18) * dt;
    this.stamina = Phaser.Math.Clamp(this.stamina, 0, this.maxStamina);

    // === AKTUALIZUJ PASKI UI ===
    if (this.staminaBar) this.staminaBar.width = (this.stamina / this.maxStamina) * 100;
    if (this.hpBar) this.hpBar.width = (this.hp / this.maxHp) * 100;
    if (this.batterySegments) {
      this.batterySegments.forEach((s, i) => {
        s.visible = i < this.battery;
      });
    }

    // === HIPERREALISTYCZNY RUCH POZIOMY Z AKCELERACJĄ (POMIŃ JEŚLI WSPINA SIĘ) ===
    if (!this.isClimbing) {
      const controlFactor = this.isOnGround ? 1.0 : airControl;
      
      if (isMoving) {
        // Natychmiastowy stop przy zawracaniu (anty-ślizg)
        if (isChangingDirection && this.isOnGround) {
          this.playerVelocityX *= 0.3; // Drastyczne zmniejszenie prędkości
        }
        
        // Przyspieszanie w kierunku ruchu
        const targetVelocity = inputX * targetSpeed;
        const accelRate = acceleration * controlFactor;
        
        if (Math.abs(this.playerVelocityX - targetVelocity) < accelRate * dt) {
          this.playerVelocityX = targetVelocity;
        } else {
          this.playerVelocityX += Math.sign(targetVelocity - this.playerVelocityX) * accelRate * dt;
        }
        
        this.facingRight = inputX > 0;
        this.player.setFlipX(!this.facingRight);

        if (this.currentAnimKey !== 'walk_side') {
          this.player.play('walk_side');
          this.currentAnimKey = 'walk_side';
        }
      } else {
        // Hamowanie (decelegracja)
        const decelRate = deceleration * controlFactor;
        
        if (Math.abs(this.playerVelocityX) < decelRate * dt) {
          this.playerVelocityX = 0;
        } else {
          this.playerVelocityX -= Math.sign(this.playerVelocityX) * decelRate * dt;
        }
        
        if (this.currentAnimKey !== 'idle_side') {
          this.player.play('idle_side');
          this.currentAnimKey = 'idle_side';
        }
      }
      
      // Aplikuj prędkość poziomą
      this.player.x += this.playerVelocityX * dt;
    }

    // === COYOTE TIME (można skoczyć krótko po zejściu z platformy) ===
    if (this.isOnGround) {
      this.coyoteTime = coyoteTimeMax;
    } else {
      this.coyoteTime -= dt;
    }
    
    // === JUMP BUFFER (zapamiętuje naciśnięcie skoku - POMIŃ JEŚLI WSPINA SIĘ) ===
    if (!this.isClimbing) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) {
        this.jumpBufferTime = jumpBufferTimeMax;
      } else {
        this.jumpBufferTime -= dt;
      }
    }
    
    // === HIPERREALISTYCZNY SKOK ===
    const canJump = this.coyoteTime > 0 && this.stamina >= jumpStaminaCost;
    
    if (this.jumpBufferTime > 0 && canJump && !this.isJumping) {
      // Rozpocznij skok - odejmij staminę!
      this.stamina -= jumpStaminaCost;
      this.playerVelocityY = this.jumpPower;
      this.isJumping = true;
      this.jumpHoldTime = 0;
      this.coyoteTime = 0;
      this.jumpBufferTime = 0;
    }
    
    // === ZMIENNA WYSOKOŚĆ SKOKU (trzymanie spacji) ===
    if (this.isJumping && this.keys.SPACE.isDown) {
      this.jumpHoldTime += dt;
      
      // Im dłużej trzymamy, tym wyżej (ale z limitem)
      if (this.jumpHoldTime < maxJumpHoldTime && this.playerVelocityY < 0) {
        // Dodatkowa siła wypychająca w górę podczas trzymania
        const holdBoost = -100; // Negatywny = w górę
        this.playerVelocityY += holdBoost * dt;
      }
    }
    
    // Zakończ skok gdy puszczono przycisk
    if (!this.keys.SPACE.isDown && this.isJumping) {
      // Skrócony skok - natychmiastowe zmniejszenie prędkości w górę
      if (this.playerVelocityY < 0) {
        this.playerVelocityY *= 0.5;
      }
      this.isJumping = false;
    }
    
    // === GRAWITACJA ===
    // Lżejsza grawitacja podczas wznoszenia, cięższa przy opadaniu (bardziej realistyczne)
    const gravityMultiplier = this.playerVelocityY < 0 ? 0.85 : 1.15;
    this.playerVelocityY += this.gravity * gravityMultiplier * dt;

    // === RUCH PIONOWY ===
    this.player.y += this.playerVelocityY * dt;

    // === KOLIZJE Z PLATFORMAMI (POMIŃ JEŚLI WSPINA SIĘ) ===
    if (!this.isClimbing) {
      this.isOnGround = false;
      const playerBottom = this.player.y + 16;
      const playerTop = this.player.y - 16;
      const playerLeft = this.player.x - 12;
      const playerRight = this.player.x + 12;

      for (const platform of this.platforms) {
        // Sprawdź czy gracz jest nad platformą
        if (playerRight > platform.left && playerLeft < platform.right) {
          // Kolizja od góry (gracz ląduje na platformie)
          if (this.playerVelocityY >= 0 && playerBottom >= platform.top && playerBottom <= platform.top + 20) {
            this.player.y = platform.top - 16;
            this.playerVelocityY = 0;
            this.isOnGround = true;
            this.isJumping = false; // Reset flagi skoku po lądowaniu
          }
          // Kolizja od dołu (gracz uderza głową)
          else if (this.playerVelocityY < 0 && playerTop <= platform.bottom && playerTop >= platform.bottom - 20) {
            this.player.y = platform.bottom + 16;
            this.playerVelocityY = 0;
            this.isJumping = false; // Koniec skoku przy uderzeniu głową
          }
        }
      }
    }

    // === OGRANICZENIA MAPY ===
    this.player.x = Phaser.Math.Clamp(this.player.x, 20, this.mapWidth - 20);

    // === DETEKACJA BLISKIEJ DRABINY ===
    this.nearLadder = false;
    let closestLadder = null;
    const ladderDetectDistance = 40;
    
    for (const ladder of this.climbingLadders) {
      const distance = Math.abs(this.player.x - ladder.x);
      // Zwiększ zakres Y - może być wyżej lub niżej
      if (distance < ladderDetectDistance && this.player.y >= ladder.topY - 50 && this.player.y <= ladder.bottomY + 20) {
        this.nearLadder = true;
        closestLadder = ladder;
        break;
      }
    }
    
    // === RENDERUJ PROMPT ABY SIĘ WSPINAĆ (TYLKO RAZ) ===
    if (this.nearLadder && !this.isClimbing && !this.ladderPrompt) {
      // Stwórz prompt tylko jeśli go nie ma
      this.ladderPrompt = this.add.text(
        this.player.x,
        this.player.y - 50,
        "PRESS E TO CLIMB",
        {
          font: 'bold 14px Arial',
          fill: '#ffff99',
          stroke: '#000',
          strokeThickness: 2,
          backgroundColor: '#000000aa',
          padding: { x: 8, y: 4 }
        }
      ).setOrigin(0.5);
      this.ladderPrompt.setDepth(2000);
    } else if (!this.nearLadder && this.ladderPrompt) {
      // Usuń prompt jeśli się oddalimy od drabiny
      this.ladderPrompt.destroy();
      this.ladderPrompt = null;
    } else if (this.ladderPrompt && this.nearLadder) {
      // Tylko update pozycji promptu
      this.ladderPrompt.x = this.player.x;
      this.ladderPrompt.y = this.player.y - 50;
    }

    // === DETEKCJA DRZWI BUDYNKU ===
    this.nearDoor = false;
    const doorDetectDistance = 50;
    let closestDoor = null;
    
    this.buildingDoors.forEach(door => {
      const distX = Math.abs(this.player.x - door.x);
      const distY = Math.abs(this.player.y - door.y);
      
      // Czy gracz jest blisko drzwi (X i Y)
      if (distX < doorDetectDistance && distY < 100) {
        this.nearDoor = true;
        closestDoor = door;
      }
    });
    
    // Pokaż/ukryj prompt drzwi
    if (this.nearDoor && closestDoor && !this.doorPrompt) {
      this.doorPrompt = this.add.text(
        this.player.x,
        this.player.y - 50,
        "Press E to enter building",
        {
          font: 'bold 14px Arial',
          fill: '#99ccff',
          stroke: '#000',
          strokeThickness: 2,
          backgroundColor: '#000000aa',
          padding: { x: 8, y: 4 }
        }
      ).setOrigin(0.5);
      this.doorPrompt.setDepth(2000);
    } else if (!this.nearDoor && this.doorPrompt) {
      // Usuń prompt jeśli się oddalimy od drzwi
      this.doorPrompt.destroy();
      this.doorPrompt = null;
    } else if (this.doorPrompt && this.nearDoor) {
      // Tylko update pozycji promptu
      this.doorPrompt.x = this.player.x;
      this.doorPrompt.y = this.player.y - 50;
    }

    
    // === OBSŁUGA WSPINACZKI ===
    if (!this.isClimbing && this.nearLadder && Phaser.Input.Keyboard.JustDown(this.keys.E)) {
      // Pierwsze kliknięcie - pokaż "TOO SLIPPERY" w angielsku
      if (!this.hasAttemptedClimb) {
        if (!this.slipperyMessage) {
          this.slipperyMessage = this.add.text(
            this.player.x,
            this.player.y - 50,
            "TOO SLIPPERY TO CLIMB",
            {
              font: 'bold 12px Arial',
              fill: '#ff5555',
              stroke: '#000',
              strokeThickness: 2
            }
          ).setOrigin(0.5);
          this.slipperyMessage.setDepth(2000);
          
          this.tweens.add({
            targets: this.slipperyMessage,
            alpha: 0,
            y: this.player.y - 70,
            duration: 2000,
            ease: 'Power2',
            onComplete: () => {
              this.slipperyMessage.destroy();
              this.slipperyMessage = null;
            }
          });
        }
        this.hasAttemptedClimb = true; // Oznacz że już próbował
      } else if (closestLadder) {
        // Drugie kliknięcie - próba wspinaczki
        this.isClimbing = true;
        this.climbingLadder = closestLadder;
        this.climbStartY = this.player.y;
        this.climbProgress = 0;
        this.isSlipping = false;
        // Usuń prompt wskazówki
        if (this.ladderPrompt) {
          this.ladderPrompt.destroy();
          this.ladderPrompt = null;
        }
        this.playerVelocityY = 0;
        this.playerVelocityX = 0;
        this.hasAttemptedClimb = false; // Reset dla następnej drabiny
      }
    }

    // === OBSŁUGA WEJŚCIA DO BUDYNKU ===
    if (!this.isClimbing && this.nearDoor && Phaser.Input.Keyboard.JustDown(this.keys.E)) {
      // Zatrzymaj deszcz i wejdź do budynku
      if (this.rainAmbient && this.rainAmbient.isPlaying) {
        this.rainAmbient.stop();
      }
      if (this.doorPrompt) {
        this.doorPrompt.destroy();
        this.doorPrompt = null;
      }
      
      // Przekaż pozycję drzwi do BuildingInterior
      this.registry.set('doorX', closestDoor.x);
      this.registry.set('doorY', closestDoor.y);
      
      this.scene.start('BuildingInterior');
    }
    
    // === ANIMACJA WSPINACZKI ===
    if (this.isClimbing && this.climbingLadder) {
      const climbSpeed = 0.25; // WOLNA wspinaczka
      this.climbProgress += climbSpeed * dt;
      
      // Gracz wspina się na drabinę
      const ladderHeight = this.climbingLadder.bottomY - this.climbingLadder.topY;
      
      if (this.climbProgress < 0.5) {
        // Wspinaczka do 50% (do połowy drabiny) - POWOLI
        this.player.x = this.climbingLadder.x;
        this.player.y = this.climbingLadder.bottomY - (this.climbProgress * ladderHeight);
      } else if (this.climbProgress >= 0.5 && !this.isSlipping) {
        // W połowie drabiny - start ślizgu (tylko raz)
        this.isSlipping = true;
      }
      
      if (this.isSlipping && this.climbProgress > 0.5) {
        // Animacja upadku - spadek do gruntu (SZYBSZY)
        const slipProgress = (this.climbProgress - 0.5) / 0.5; // 0-1 przez drugą część czasu
        const startFallY = this.climbingLadder.bottomY - (0.5 * ladderHeight); // Pozycja po wspinaczce (połowa)
        const fallDistance = (startFallY - this.groundY) * slipProgress * 2.5; // SZYBSZY spadek
        
        this.player.y = startFallY - fallDistance;
        // Ogranicź Y aby nie poniżej gruntu
        if (this.player.y > this.groundY - 16) {
          this.player.y = this.groundY - 16;
        }
      }
      
      // KONIEC WSPINACZKI - gdy gracz dotrze do gruntu
      if (this.isSlipping && this.player.y >= this.groundY - 17) {
        // Gracz uderzył w grunt - Game Over
        this.isClimbing = false;
        this.climbProgress = 0;
        this.isSlipping = false;
        this.playerVelocityY = 0;
        this.playerVelocityX = 0;
        
        // Game Over screen
        this.showGameOverScreen();
      }
    }

    // === HIPERREALISTYCZNA LATARKA Z RADIALNYM GRADIENTEM ===
    this.flashlightGraphics.clear();
    
    if (this.flashlightOn && this.battery > 0) {
      this.batteryTimer += dt;
      if (this.batteryTimer >= 60) {
        this.battery -= 1;
        this.batteryTimer = 0;
        if (this.battery <= 0) {
          this.flashlightOn = false;
        }
      }

      // Latarka świeci bezpośrednio przed graczem
      this.flashlightDir.x = this.facingRight ? 1 : -1;
      this.flashlightDir.y = 0;

      // Subtelne drgańcie
      const shake1 = Math.sin(time * 0.012 + 0.5) * 0.6;
      const shake2 = Math.cos(time * 0.019) * 0.5;
      const shake3 = Math.sin(time * 0.007) * 0.3;
      const shakeX = this.player.x + shake1 + shake3;
      const shakeY = this.player.y + shake2 + shake3 * 0.8;

      // === HIPERREALISTYCZNY STOŻEK ŚWIATŁA ===
      // Parametry stożka - ZNACZNIE MNIEJSZY
      const coneLength = 80; // Krótsza wiązka
      const coneStartWidth = 3; // Wąska u podstawy
      const coneEndWidth = 35; // Mniejsza szerokość na końcu
      
      // Punkty stożka - START Z RĘKI POSTACI
      // Gracz trzyma latarkę w ręce (offset od centrum sprite'a)
      const handOffsetX = this.flashlightDir.x * 8; // Przed graczem
      const handOffsetY = 2; // Trochę niżej (na wysokości ręki)
      
      const startX = shakeX + handOffsetX;
      const startY = shakeY + handOffsetY;
      
      // Rysuj stożek jako serię elips wzdłuż osi - każda z płynnym zanikaniem
      const segments = 30;
      
      for (let i = 0; i < segments; i++) {
        const progress = i / segments;
        const nextProgress = (i + 1) / segments;
        
        // Pozycja wzdłuż stożka
        const posX = startX + this.flashlightDir.x * coneLength * progress;
        
        // Szerokość w tym miejscu (interpolacja)
        const width = coneStartWidth + (coneEndWidth - coneStartWidth) * progress;
        const nextWidth = coneStartWidth + (coneEndWidth - coneStartWidth) * nextProgress;
        
        // Płynne zanikanie - silniejsze na końcu
        const fadeStart = Math.max(0, 1 - Math.pow(progress, 0.8));
        const fadeEnd = Math.max(0, 1 - Math.pow(nextProgress, 0.8));
        
        // Zewnętrzna warstwa
        const alpha1 = fadeStart * 0.3;
        const brightness = Math.floor(255 - progress * 80);
        this.flashlightGraphics.fillStyle(Phaser.Display.Color.GetColor(brightness, brightness - 30, 150), alpha1);
        this.flashlightGraphics.fillEllipse(posX, startY, width * 1.5, width * 0.9);
        
        // Główna wiązka
        if (progress < 0.9) {
          const alpha2 = fadeStart * 0.4;
          const yellow = Math.floor(255 - progress * 20);
          this.flashlightGraphics.fillStyle(Phaser.Display.Color.GetColor(yellow, yellow - 10, 180), alpha2);
          this.flashlightGraphics.fillEllipse(posX, startY, width * 1.0, width * 0.7);
        }
        
        // Jądro - najjaśniejsza część
        if (progress < 0.75) {
          const alpha3 = fadeStart * 0.55;
          this.flashlightGraphics.fillStyle(0xffffee, alpha3);
          this.flashlightGraphics.fillEllipse(posX, startY, width * 0.6, width * 0.5);
        }
      }
      
      // Cząstki kurzu w stożku światła (volumetric scattering) - MNIEJ CZĄSTEK
      for (let i = 0; i < 20; i++) {
        const seed = i * 73.891;
        const particleProgress = (time * 0.0005 + seed) % 1;
        
        // Pozycja wzdłuż stożka
        const distanceAlongCone = particleProgress * coneLength;
        const particleX = startX + this.flashlightDir.x * distanceAlongCone;
        
        // Szerokość stożka w tym miejscu
        const coneWidthHere = coneStartWidth + (coneEndWidth - coneStartWidth) * particleProgress;
        
        // Losowa pozycja w poprzek stożka
        const crossOffset = (Math.sin(seed * 3.7 + time * 0.002) * 0.7) * coneWidthHere;
        const particleY = startY + crossOffset;
        
        // Cząstka widoczna tylko w stożku
        const particleAlpha = 0.25 * (1 - particleProgress) * (1 - Math.abs(crossOffset) / coneWidthHere);
        const particleSize = 0.7 + Math.sin(seed + time * 0.003) * 0.3;
        
        this.flashlightGraphics.fillStyle(0xffffdd, particleAlpha);
        this.flashlightGraphics.fillCircle(particleX, particleY, particleSize);
      }
    }

    // === PRZEŁĄCZANIE STOPKI ===
    // Jeśli stopka na mapie jest poza ekranem, pokaż w UI (prawy górny róg)
    const cam = this.cameras.main;
    const footerLeft = this.worldFooterTitle.x - this.worldFooterTitle.width / 2;
    const footerRight = this.worldFooterTitle.x + this.worldFooterTitle.width / 2;
    const visible = footerRight > cam.worldView.x && footerLeft < cam.worldView.x + cam.width;

    this.uiFooterTitle.setVisible(!visible);
    this.uiFooterInfo.setVisible(!visible);
    this.uiFooterLink.setVisible(!visible);
  }

  createClimbVignette(progress) {
    // Efekt tunelu - czarne paski zamykające się na graczu
    if (!this.vignetteGraphics) {
      this.vignetteGraphics = this.make.graphics({ x: 0, y: 0, add: true });
      this.vignetteGraphics.setDepth(1999);
      this.vignetteGraphics.setScrollFactor(0);
    }
    
    this.vignetteGraphics.clear();
    
    // Rozmiar ekranu
    const screenWidth = 800;
    const screenHeight = 600;
    
    // Pozycja gracza w współrzędnych ekranu
    const cam = this.cameras.main;
    const playerScreenX = this.player.x - cam.scrollX;
    const playerScreenY = this.player.y - cam.scrollY;
    
    // Rozmiar otworu wokół gracza (zmniejsza się)
    const maxHoleSize = 150;
    const minHoleSize = 20;
    const currentHoleSize = maxHoleSize - (progress * (maxHoleSize - minHoleSize));
    
    // Czarne paski - górny
    this.vignetteGraphics.fillStyle(0x000000, 0.95);
    this.vignetteGraphics.fillRect(0, 0, screenWidth, Math.max(0, playerScreenY - currentHoleSize));
    
    // Czarny pasek - dolny
    this.vignetteGraphics.fillRect(0, playerScreenY + currentHoleSize, screenWidth, Math.max(0, screenHeight - (playerScreenY + currentHoleSize)));
    
    // Czarny pasek - lewy
    this.vignetteGraphics.fillRect(0, playerScreenY - currentHoleSize, Math.max(0, playerScreenX - currentHoleSize), currentHoleSize * 2);
    
    // Czarny pasek - prawy
    this.vignetteGraphics.fillRect(playerScreenX + currentHoleSize, playerScreenY - currentHoleSize, Math.max(0, screenWidth - (playerScreenX + currentHoleSize)), currentHoleSize * 2);
  }

  showGameOverScreen() {
    // Nie pauzuj scenę - zamiast tego zablokuj input
    // (Pauzowanie powodowało zacinanie)
    this.inputBlocked = true;
    
    // Zatrzymaj dźwięk deszczu
    if (this.rainAmbient && this.rainAmbient.isPlaying) {
      this.rainAmbient.stop();
    }
    
    // Rzeczywiste rozmiary ekranu
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;
    const centerX = screenWidth / 2;
    const centerY = screenHeight / 2;
    
    // Czarne tło
    const darkBg = this.add.rectangle(
      centerX,
      centerY,
      screenWidth,
      screenHeight,
      0x000000,
      0.7
    );
    darkBg.setScrollFactor(0);
    darkBg.setDepth(3000);
    
    // Tekst "YOU DIED"
    const diedText = this.add.text(
      centerX,
      centerY - 80,
      "YOU DIED",
      {
        font: 'bold 48px Arial',
        fill: '#ff3333',
        stroke: '#000',
        strokeThickness: 4
      }
    );
    diedText.setOrigin(0.5);
    diedText.setScrollFactor(0);
    diedText.setDepth(3001);
    
    // Tekst "all you had to do was help the others!"
    const messageText = this.add.text(
      centerX,
      centerY + 10,
      "all you had to do was help the others!",
      {
        font: '18px Arial',
        fill: '#aabbcc',
        stroke: '#000',
        strokeThickness: 2
      }
    );
    messageText.setOrigin(0.5);
    messageText.setScrollFactor(0);
    messageText.setDepth(3001);
    
    // Przycisk powrotu (dowolny klawisz)
    const anyKeyText = this.add.text(
      centerX,
      centerY + 80,
      "Press ANY KEY to return to main menu",
      {
        font: '14px Arial',
        fill: '#ffff99',
        stroke: '#000',
        strokeThickness: 2
      }
    );
    anyKeyText.setOrigin(0.5);
    anyKeyText.setScrollFactor(0);
    anyKeyText.setDepth(3001);
    
    // Animacja migotania tekstu
    this.tweens.add({
      targets: [diedText, messageText, anyKeyText],
      alpha: 0.5,
      duration: 800,
      yoyo: true,
      repeat: -1
    });
    
    // Obsługa powrotu do menu
    const returnToMenu = () => {
      this.inputBlocked = false;
      this.scene.start('MainMenu');
    };
    
    // Czekaj na dowolny klawisz lub klik myszą aby wrócić do menu
    this.input.keyboard.once('keydown', returnToMenu);
    this.input.once('pointerdown', returnToMenu);
  }
}

