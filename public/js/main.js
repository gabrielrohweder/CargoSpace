class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene' });
    }

    create(data) {
        this.socket = data.socket;
        this.otherPlayersGroup = this.add.group();
        this.currentPlayerGroup = this.add.group();
        
        // Left Panel Background
        const leftPanelWidth = 250;
        const leftPanelHeight = this.cameras.main.height;
        this.leftPanelGraphics = this.add.graphics();
        this.leftPanelGraphics.fillStyle(0x000000, 0.5);
        this.leftPanelGraphics.fillRect(0, 0, leftPanelWidth, leftPanelHeight);
        
        this.add.text(10, 10, 'Other Players', { font: '20px Arial', fill: '#ffffff' });

        // Bottom Panel Background
        const bottomPanelHeight = 300;
        const bottomPanelY = this.cameras.main.height - bottomPanelHeight;
        this.bottomPanelGraphics = this.add.graphics();
        this.bottomPanelGraphics.fillStyle(0x222222, 0.9);
        this.bottomPanelGraphics.fillRect(0, bottomPanelY, this.cameras.main.width, bottomPanelHeight);

        this.socket.on('playersUpdate', (players) => {
            this.players = players;
            this.renderUI(players);
            // this.updateStartButton(); // Start button is in GameScene, not UIScene
        });

        this.socket.on('diceRolled', (data) => {
            this.showDiceResult(data);
        });

        this.scale.on('resize', this.resize, this);
    }

    showDiceResult(data) {
        const resultString = Array.isArray(data.result) ? data.result.join(' + ') : data.result;
        const sum = Array.isArray(data.result) ? data.result.reduce((a, b) => a + b, 0) : data.result;
        
        const text = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, `Player rolled: ${resultString} = ${sum}`, {
            font: '48px Arial',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);
        
        this.tweens.add({
            targets: text,
            y: this.cameras.main.height / 2 - 100,
            alpha: 0,
            duration: 2000,
            ease: 'Power2',
            onComplete: () => {
                text.destroy();
            }
        });
    }

    resize(gameSize) {
        const width = gameSize.width;
        const height = gameSize.height;
        const bottomPanelHeight = 300;

        this.cameras.main.setSize(width, height);
        
        this.leftPanelGraphics.clear();
        this.leftPanelGraphics.fillStyle(0x000000, 0.5);
        this.leftPanelGraphics.fillRect(0, 0, 250, height - bottomPanelHeight);

        this.bottomPanelGraphics.clear();
        this.bottomPanelGraphics.fillStyle(0x222222, 0.9);
        this.bottomPanelGraphics.fillRect(0, height - bottomPanelHeight, width, bottomPanelHeight);
        
        if (this.lastPlayersData) {
            this.renderUI(this.lastPlayersData);
        }
    }

    renderUI(players) {
        this.lastPlayersData = players;
        this.otherPlayersGroup.clear(true, true);
        this.currentPlayerGroup.clear(true, true);

        const currentPlayer = players.find(p => p.id === this.socket.id);
        const otherPlayers = players.filter(p => p.id !== this.socket.id);

        this.renderOtherPlayers(otherPlayers);
        if (currentPlayer) {
            this.renderCurrentPlayer(currentPlayer);
        }
    }

    renderOtherPlayers(players) {
        let y = 50;
        const startX = 10;

        players.forEach(player => {
            // Player Name
            const nameText = this.add.text(startX, y, player.name, { 
                font: '16px Arial', 
                fill: player.color 
            });
            this.otherPlayersGroup.add(nameText);
            y += 25;

            // Cargo Cards (3 slots)
            for (let i = 0; i < 3; i++) {
                const cardX = startX + (i * 35);
                const cardY = y;
                
                const card = this.add.rectangle(cardX + 15, cardY + 20, 30, 40, 0xffffff);
                card.setStrokeStyle(1, 0x000000);
                this.otherPlayersGroup.add(card);

                if (player.cargo[i]) {
                    const c = this.getColorHex(player.cargo[i].color);
                    card.fillColor = c;
                } else {
                    card.fillColor = 0x333333;
                }
            }

            // Depot Stack
            const depotX = startX + 150;
            const depotY = y + 20;
            const depotCard = this.add.rectangle(depotX, depotY, 30, 40, 0x888888);
            depotCard.setStrokeStyle(1, 0x000000);
            this.otherPlayersGroup.add(depotCard);

            const countText = this.add.text(depotX - 5, depotY - 10, player.depot.length.toString(), {
                font: '14px Arial',
                fill: '#000000'
            });
            this.otherPlayersGroup.add(countText);

            y += 60;
        });
    }

    renderCurrentPlayer(player) {
        const bottomPanelHeight = 300;
        const panelY = this.cameras.main.height - bottomPanelHeight;
        const centerY = panelY + (bottomPanelHeight / 2);
        const screenWidth = this.cameras.main.width;

        // Calculate total width to center content
        // Cargo (3 cards) + Spacing + Depot (1 card) + Spacing + Function Cards (N cards)
        const cardWidth = 100;
        const cardHeight = 150;
        const spacing = 20;
        const sectionSpacing = 60;

        const cargoSectionWidth = (3 * cardWidth) + (2 * spacing);
        const depotSectionWidth = cardWidth;
        const funcSectionWidth = (player.functionCards.length * cardWidth) + ((player.functionCards.length - 1) * spacing);
        
        const totalWidth = cargoSectionWidth + sectionSpacing + depotSectionWidth + sectionSpacing + (funcSectionWidth > 0 ? funcSectionWidth : 100);
        
        let currentX = (screenWidth - totalWidth) / 2;

        // Section Title: Cargo
        this.currentPlayerGroup.add(this.add.text(currentX, panelY + 20, 'My Cargo', { font: '24px Arial', fill: '#ffffff' }));
        
        // Render Cargo Cards (Larger)
        for (let i = 0; i < 3; i++) {
            const cardX = currentX + (cardWidth / 2) + (i * (cardWidth + spacing));
            const cardY = centerY + 20;
            
            const card = this.add.rectangle(cardX, cardY, cardWidth, cardHeight, 0xffffff);
            card.setStrokeStyle(2, 0x000000);
            this.currentPlayerGroup.add(card);

            if (player.cargo[i]) {
                const c = this.getColorHex(player.cargo[i].color);
                card.fillColor = c;
                const typeText = this.add.text(cardX - 40, cardY - 20, player.cargo[i].type, { font: '16px Arial', fill: '#000000' });
                this.currentPlayerGroup.add(typeText);
            } else {
                card.fillColor = 0x333333;
            }
        }

        currentX += cargoSectionWidth + sectionSpacing;

        // Section Title: Depot
        this.currentPlayerGroup.add(this.add.text(currentX, panelY + 20, 'My Depot', { font: '24px Arial', fill: '#ffffff' }));
        
        const depotCardX = currentX + (cardWidth / 2);
        const depotCardY = centerY + 20;
        const depotCard = this.add.rectangle(depotCardX, depotCardY, cardWidth, cardHeight, 0x888888);
        depotCard.setStrokeStyle(2, 0x000000);
        this.currentPlayerGroup.add(depotCard);
        
        const depotCount = this.add.text(depotCardX - 15, depotCardY - 15, player.depot.length.toString(), { font: '32px Arial', fill: '#000000' });
        this.currentPlayerGroup.add(depotCount);

        currentX += depotSectionWidth + sectionSpacing;

        // Section Title: Function Cards
        this.currentPlayerGroup.add(this.add.text(currentX, panelY + 20, 'Function Cards', { font: '24px Arial', fill: '#ffffff' }));

        player.functionCards.forEach((card, index) => {
            const cardX = currentX + (cardWidth / 2) + (index * (cardWidth + spacing));
            const cardY = centerY + 20;
            
            const cardRect = this.add.rectangle(cardX, cardY, cardWidth, cardHeight, 0xAA00AA);
            cardRect.setStrokeStyle(2, 0x000000);
            this.currentPlayerGroup.add(cardRect);

            const nameText = this.add.text(cardX - 45, cardY - 30, card.name, { 
                font: '14px Arial', 
                fill: '#ffffff',
                wordWrap: { width: 90 }
            });
            this.currentPlayerGroup.add(nameText);
        });

        // Roll Dice Button (Right side of bottom panel)
        const btnX = screenWidth - 100;
        const btnY = centerY - 20;
        const btn = this.add.rectangle(btnX, btnY, 120, 50, 0x444444).setInteractive();
        btn.setStrokeStyle(2, 0xffffff);
        this.currentPlayerGroup.add(btn);
        
        const btnText = this.add.text(btnX, btnY, 'Roll Dice', { font: '20px Arial', fill: '#ffffff' }).setOrigin(0.5);
        this.currentPlayerGroup.add(btnText);

        // Moves Text
        const movesText = this.add.text(btnX, btnY + 40, `Moves: ${player.movesLeft || 0}`, { 
            font: '18px Arial', 
            fill: '#ffffff' 
        }).setOrigin(0.5);
        this.currentPlayerGroup.add(movesText);

        btn.on('pointerdown', () => {
            this.socket.emit('rollDice');
        });
        
        btn.on('pointerover', () => btn.fillColor = 0x666666);
        btn.on('pointerout', () => btn.fillColor = 0x444444);
    }

    getColorHex(colorName) {
        const colorMap = {
            'red': 0xff0000,
            'blue': 0x0000ff,
            'green': 0x00ff00,
            'yellow': 0xffff00,
            'wild': 0xffffff
        };
        return colorMap[colorName] || 0x888888;
    }
}

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        this.load.image('triangle', 'assets/images/triangle.png');
        this.load.image('rhombus', 'assets/images/rhombus.png');
        this.load.image('hexagon', 'assets/images/hexagon.png');
        this.load.image('star', 'assets/images/star.png');
        // Load planet textures
        this.load.image('planet0', 'assets/images/planet0.png');
        this.load.image('planet1', 'assets/images/planet1.png');
        this.load.image('planet2', 'assets/images/planet2.png');
        this.load.image('planet3', 'assets/images/planet3.png');
        this.load.image('planet4', 'assets/images/planet4.png');
        this.load.image('planet5', 'assets/images/planet5.png');
        // Load the animated GIF as a spritesheet
        // Note: Phaser doesn't natively support animated GIFs, we'll need to handle this differently
        this.load.image('teleporter', 'assets/images/teleporter.gif');
    }

    create() {
        // Create Starfield
        this.createStarTexture('stars1', 400, 1, 0.3);
        this.createStarTexture('stars2', 200, 2, 0.6);
        this.createStarTexture('stars3', 100, 3, 1.0);

        const width = this.scale.width;
        const height = this.scale.height;

        this.starfield1 = this.add.tileSprite(0, 0, width, height, 'stars1').setOrigin(0, 0).setScrollFactor(0).setDepth(-3);
        this.starfield2 = this.add.tileSprite(0, 0, width, height, 'stars2').setOrigin(0, 0).setScrollFactor(0).setDepth(-2);
        this.starfield3 = this.add.tileSprite(0, 0, width, height, 'stars3').setOrigin(0, 0).setScrollFactor(0).setDepth(-1);
        
        this.scale.on('resize', this.resize, this);

        // Create debug text for tile info
        this.debugText = this.add.text(10, 10, '', {
            font: '14px Arial',
            fill: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        }).setScrollFactor(0).setDepth(1000);

        // Connect to Socket.io server
        this.socket = io();
        this.boardGroup = this.add.group();
        this.boardOffset = { x: 0, y: 0 };
        this.players = []; // Initialize empty
        this.tileData = new Map();
        this.highlightedTiles = [];

        // Launch UI Scene
        this.scene.launch('UIScene', { socket: this.socket });

        this.socket.on('connect', () => {
            console.log('Connected to server!');
        });

        this.socket.on('connectionData', (data) => {
            this.isHost = data.isHost;
            this.gameStarted = data.gameStarted;
            
            if (this.gameStarted) {
                this.renderBoard(data.boardState);
            } else if (this.isHost) {
                this.showStartButton();
            } else {
                this.showWaitingMessage();
            }
        });

        this.socket.on('gameStarted', (data) => {
            this.gameStarted = true;
            if (this.startButton) {
                this.startButton.destroy();
                this.startButton = null;
            }
            if (this.waitingText) {
                this.waitingText.destroy();
                this.waitingText = null;
            }
            this.renderBoard(data);
        });

        this.socket.on('boardState', (data) => {
            this.renderBoard(data);
        });

        this.socket.on('playersUpdate', (players) => {
            this.players = players;
            this.renderShips(players);
            this.updateStartButton();
        });

        this.socket.on('debugMessage', (msg) => {
            console.log('[DEBUG]', msg);
        });

        // Add camera controls
        this.input.on('pointermove', (pointer) => {
            if (pointer.isDown) {
                this.cameras.main.scrollX -= (pointer.x - pointer.prevPosition.x) / this.cameras.main.zoom;
                this.cameras.main.scrollY -= (pointer.y - pointer.prevPosition.y) / this.cameras.main.zoom;
            }
        });

        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            const newZoom = this.cameras.main.zoom - (deltaY * 0.001);
            this.cameras.main.zoom = Phaser.Math.Clamp(newZoom, 0.1, 2);
        });

        // Clear highlights on background click
        this.input.on('pointerdown', (pointer, gameObjects) => {
            if (gameObjects.length === 0) {
                this.clearHighlights();
            }
        });
    }

    showStartButton() {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        this.startButton = this.add.container(centerX, centerY);

        const bg = this.add.rectangle(0, 0, 200, 80, 0x555555).setInteractive(); // Default to disabled color
        bg.setStrokeStyle(4, 0xffffff);
        
        const text = this.add.text(0, 0, 'START GAME', {
            font: '28px Arial',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.startButton.add([bg, text]);

        bg.on('pointerdown', () => {
            // Only emit if enabled (checked by color/alpha or logic)
            if (this.startButton.alpha === 1) {
                this.socket.emit('startGame');
            }
        });

        bg.on('pointerover', () => {
            if (this.startButton.alpha === 1) bg.fillColor = 0x00cc00;
        });
        bg.on('pointerout', () => {
            if (this.startButton.alpha === 1) bg.fillColor = 0x00aa00;
        });
        
        this.updateStartButton();
    }

    updateStartButton() {
        if (this.startButton && this.startButton.active && this.players) {
            const canStart = this.players.length >= 1;
            // Check if children exist
            if (this.startButton.list.length > 0) {
                const bg = this.startButton.getAt(0);
                if (bg) {
                    if (canStart) {
                        bg.setInteractive();
                        bg.fillColor = 0x00aa00;
                        this.startButton.alpha = 1;
                    } else {
                        bg.disableInteractive();
                        bg.fillColor = 0x555555;
                        this.startButton.alpha = 0.5;
                    }
                }
            }
        }
    }

    showWaitingMessage() {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        this.waitingText = this.add.text(centerX, centerY, 'Waiting for host to start...', {
            font: '32px Arial',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
    }

    renderBoard(data) {
        console.log(`[DEBUG] renderBoard called with ${data.tiles.length} tiles.`);
        this.boardGroup.clear(true, true);
        this.tileData.clear();
        this.teleportTiles = []; 
        this.gridScale = data.gridScale || 100;
        const scale = this.gridScale;
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        let offsetX = 0;
        let offsetY = 0;

        const hubTile = data.tiles.find(t => t.type === 'hub');
        if (hubTile) {
            const hubPositions = (hubTile.occupiedPositions && hubTile.occupiedPositions.length > 0)
                ? hubTile.occupiedPositions
                : [{ q: hubTile.position.q, r: hubTile.position.r }];
            if (hubPositions.length > 0) {
                let hx = 0;
                let hy = 0;
                hubPositions.forEach(pos => {
                    const { x: hxPos, y: hyPos } = this.axialToPixel(parseInt(pos.q), parseInt(pos.r), scale);
                    hx += hxPos;
                    hy += hyPos;
                });
                offsetX = -(hx / hubPositions.length);
                offsetY = -(hy / hubPositions.length);
            }
        }

        this.boardOffset = { x: offsetX, y: offsetY };

        data.tiles.forEach(tile => {
            const q = parseInt(tile.position.q);
            const r = parseInt(tile.position.r);
            const { x, y } = this.axialToPixel(q, r, scale);
            const isUp = (Math.abs(q + r)) % 2 === 0;

            // Determine base texture, tint and rotation for this tile
            let texture = 'triangle';
            let tint = 0xffffff;
            let rotation = isUp ? 0 : Math.PI;

            if (tile.type === 'hub') {
                texture = 'hexagon';
                tint = 0xcccccc;
                rotation = 0;
            } else if (tile.type === 'landing') {
                texture = 'triangle';
                tint = 0x00ff00;
            } else if (tile.type === 'asteroid_belt') {
                texture = 'triangle';
                tint = 0x555555;
            } else if (tile.type === 'teleportation') {
                texture = 'triangle';
                tint = 0x00ffff; // Cyan color for teleporters
            } else if (tile.type === 'black_hole') {
                texture = 'triangle';
                tint = 0x000000;
            } else if (tile.type === 'planet') {
                // Use unique texture for each planet
                texture = `planet${tile.planetId % 6}`;
                tint = 0xffffff; // No tint needed, texture has color
            }

            const positions = (tile.occupiedPositions && tile.occupiedPositions.length > 0)
                ? tile.occupiedPositions
                : [{ q, r }];
            const positionPixels = positions.map(pos => {
                const pq = parseInt(pos.q);
                const pr = parseInt(pos.r);
                return this.axialToPixel(pq, pr, scale);
            });

            // If this tile spans multiple occupied positions (hub, planet, etc.), compute its centroid
            // by averaging the pixel coordinates of all occupiedPositions so the main sprite is centered.
            let anchorX = x;
            let anchorY = y;
            if (positionPixels.length > 0) {
                const sum = positionPixels.reduce((acc, pos) => {
                    acc.x += pos.x;
                    acc.y += pos.y;
                    return acc;
                }, { x: 0, y: 0 });
                anchorX = sum.x / positionPixels.length;
                anchorY = sum.y / positionPixels.length;
            }

            if (tile.type === 'planet' && positionPixels.length === 2) {
                // Get the pixel positions of both triangles
                const [p0, p1] = positionPixels;
                
                // Calculate the angle of the vector connecting the two triangle centers
                const dx = p1.x - p0.x;
                const dy = p1.y - p0.y;
                const centerAngle = Math.atan2(dy, dx);
                
                // The rhombus sprite has width=s, height=s*sqrt(3) (vertically oriented by default)
                // When two triangles share an edge, the rhombus should be rotated so its long axis
                // aligns with the line connecting the two centers.
                // Since the sprite is already vertical (long axis at 90°), we need to rotate it
                // to align its long axis with the centerAngle direction.
                // The long axis of the rhombus is perpendicular to its short axis.
                // At 0 rotation, the rhombus is vertical (long axis at 90° from horizontal).
                // To align the long axis with centerAngle, rotate by (centerAngle - 90°).
                rotation = centerAngle - Math.PI / 2;
            }

            // Create the main sprite for this tile (may be destroyed later for movement tiles)
            const spriteX = Math.round(centerX + anchorX + offsetX);
            const spriteY = Math.round(centerY + anchorY + offsetY);
            const roundedSpriteX = Math.round(spriteX);
            const roundedSpriteY = Math.round(spriteY);
            const sprite = this.add.sprite(roundedSpriteX, roundedSpriteY, texture);
            sprite.setDepth(1);
            this.boardGroup.add(sprite);
            sprite.setTint(tint);

            // Debug: log a few sprite positions for inspection
            if (tile.type === 'hub' || tile.type === 'planet' || tile.type === 'movement') {
                console.log(`[DEBUG] tile main sprite (${tile.type}) at`, { q, r, spriteX: sprite.x, spriteY: sprite.y });
            }

            // Size & rotation adjustments per texture
            const s = scale;
            if (texture === 'triangle') {
                sprite.setDisplaySize(s, s * Math.sqrt(3) / 2);
                sprite.setRotation(rotation);
                sprite.setOrigin(0.5, 2/3);
            } else if (texture === 'hexagon') {
                sprite.setDisplaySize(2 * s, Math.sqrt(3) * s);
                sprite.setRotation(rotation);
                sprite.setOrigin(0.5, 0.5);
            } else if (texture === 'rhombus') {
                sprite.setDisplaySize(s, s * Math.sqrt(3));
                sprite.setRotation(rotation);
                sprite.setOrigin(0.5, 0.5);
            }

            // The server sends 'occupiedPositions' for planets and multi-cell tiles.
            // We can render movement tiles as subdivided triangles; other tiles keep the main sprite.

            // If this is a movement tile, subdivide each triangular position into 4 sub-triangles.
            // Teleportation tiles are NOT subdivided (they count as one tile like hub/planet)
            if (tile.type === 'movement') {
                // For movement tiles create one container per triangular position containing four small triangles
                positions.forEach(pos => {
                    const pq = parseInt(pos.q);
                    const pr = parseInt(pos.r);
                    const pIsUp = (Math.abs(pq + pr)) % 2 === 0;
                    const { x: px, y: py } = this.axialToPixel(pq, pr, scale);
                    const subScale = scale / 2;
                    const sSide = scale;
                    const H = sSide * Math.sqrt(3) / 2;
                    const topCentroidY = -H / 3;
                    const cornerCentroidY = H / 6;
                    const leftX = -sSide / 4;
                    const rightX = sSide / 4;

                    // Create a container at the axial pixel for this position (rounded)
                    const containerX = Math.round(centerX + px + offsetX);
                    const containerY = Math.round(centerY + py + offsetY);
                    const container = this.add.container(containerX, containerY);
                    container.setDepth(2); // Higher than planet tiles so sub-triangles receive clicks

                    // Create 4 triangle children placed relative to container
                    const triangles = [];
                    const subHitAreas = []; // Store hit areas for each sub-triangle
                    for (let si = 0; si < 4; si++) {
                        let subX = 0, subY = 0, subRotation = 0;
                        if (pIsUp) {
                            if (si === 0) { subX = 0; subY = topCentroidY; subRotation = 0; }
                            else if (si === 1) { subX = leftX; subY = cornerCentroidY; subRotation = 0; }
                            else if (si === 2) { subX = rightX; subY = cornerCentroidY; subRotation = 0; }
                            else { subX = 0; subY = 0; subRotation = Math.PI; }
                        } else {
                            if (si === 0) { subX = 0; subY = -topCentroidY; subRotation = Math.PI; }
                            else if (si === 1) { subX = leftX; subY = -cornerCentroidY; subRotation = Math.PI; }
                            else if (si === 2) { subX = rightX; subY = -cornerCentroidY; subRotation = Math.PI; }
                            else { subX = 0; subY = 0; subRotation = 0; }
                        }

                        const tSprite = this.add.sprite(subX, subY, 'triangle');
                        tSprite.setDisplaySize(subScale, subScale * Math.sqrt(3) / 2);
                        tSprite.setOrigin(0.5, 2/3);
                        tSprite.setRotation(subRotation);
                        tSprite.setInteractive(); // Make each sub-triangle interactive
                        container.add(tSprite);
                        triangles.push(tSprite);
                        
                        // Store reference to this sub-triangle with its index
                        subHitAreas.push({ sprite: tSprite, subIndex: si });
                    }

                    // Add container to board group so it's managed similarly
                    this.boardGroup.add(container);

                    // Debug: report container position
                    console.log('[DEBUG] movement container at', { pq, pr, containerX, containerY });

                    // Wrapper object so existing code can call setTint/on/off/setInteractive
                    const wrapper = {
                        container: container,
                        triangles: triangles,
                        subHitAreas: subHitAreas,
                        setTint: (color) => { triangles.forEach(t => t.setTint(color)); },
                        setInteractive: () => { /* sub-triangles are already interactive */ },
                        disableInteractive: () => { /* managed per sub-triangle */ },
                        on: (ev, cb) => { 
                            // Add event to all sub-triangles
                            triangles.forEach(t => t.on(ev, cb));
                        },
                        off: (ev) => { 
                            // Remove event from all sub-triangles
                            triangles.forEach(t => t.off(ev));
                        },
                        destroy: () => { triangles.forEach(t=>{try{t.destroy();}catch(e){}}); try { container.destroy(); } catch(e){} }
                    };

                    // Default tint
                    let tint = 0xffffff;
                    if (tile.type === 'hub') tint = 0xcccccc;
                    else if (tile.type === 'landing') tint = 0x00ff00;
                    else if (tile.type === 'asteroid_belt') tint = 0x555555;
                    else if (tile.type === 'teleportation') tint = 0x0000ff;
                    else if (tile.type === 'black_hole') tint = 0x000000;
                    else if (tile.type === 'planet') tint = 0xff00ff;

                    // Apply initial tint to visible triangles
                    wrapper.setTint(tint);

                    // Add debug hover/click handlers to each sub-triangle
                    subHitAreas.forEach(hit => {
                        hit.sprite.on('pointermove', () => {
                            const hasHandler = hit.sprite.clickHandler ? 'YES' : 'NO';
                            this.debugText.setText(`Hover: Type=${tile.type}, Q=${pq}, R=${pr}, S=${hit.subIndex}, Handler=${hasHandler}`);
                        });
                        hit.sprite.on('pointerout', () => {
                            this.debugText.setText('');
                        });
                        
                        // Debug raw clicks
                        hit.sprite.on('pointerdown', () => {
                            if (!hit.sprite.clickHandler) {
                                console.warn(`[CLICK] No handler on sub-triangle ${pq},${pr},${hit.subIndex}`);
                            }
                        });
                    });

                    // Register all four sub-keys to point to the same wrapper so movement logic still uses s
                    for (let si = 0; si < 4; si++) {
                        const key = `${pq},${pr},${si}`;
                        this.tileData.set(key, {
                            type: tile.type,
                            sprite: wrapper,
                            defaultTint: tint,
                            q: pq, r: pr, s: si
                        });
                    }

                    // Teleport canonical
                    if (tile.type === 'teleportation') {
                        const canonical = `${pq},${pr},3`;
                        if (!this.teleportTiles.includes(canonical)) this.teleportTiles.push(canonical);
                    }
                });

                // Destroy the large main sprite for this tile so only sub-triangles remain visually
                if (sprite && sprite.destroy) {
                    sprite.destroy();
                }
            } else {
                // Non-movement tiles: keep the single main sprite and register all 4 sub-positions
                // This ensures ships can be placed on any sub-position and neighbors work correctly
                positions.forEach(pos => {
                    const pq = parseInt(pos.q);
                    const pr = parseInt(pos.r);
                    
                    // Register all 4 sub-positions (0, 1, 2, 3) for this tile
                    for (let si = 0; si < 4; si++) {
                        const key = `${pq},${pr},${si}`;
                        this.tileData.set(key, {
                            type: tile.type,
                            sprite: sprite,
                            defaultTint: tint,
                            q: pq, r: pr, s: si
                        });
                    }

                    // Add debug hover/click handlers to the sprite
                    if (sprite.setInteractive) {
                        sprite.setInteractive();
                        
                        sprite.on('pointermove', () => {
                            this.debugText.setText(`Hover: Type=${tile.type}, Q=${pq}, R=${pr}, PlanetId=${tile.planetId || 'N/A'}`);
                        });
                        
                        sprite.on('pointerout', () => {
                            this.debugText.setText('');
                        });
                    }

                    if (tile.type === 'teleportation') {
                        const canonical = `${pq},${pr},3`;
                        if (!this.teleportTiles.includes(canonical)) this.teleportTiles.push(canonical);
                    }
                });
            }
        });
        console.log(`[DEBUG] tileData populated. Size: ${this.tileData.size}`);
    }

    getNeighbors(q, r, s) {
        const neighbors = [];
        const isUp = (Math.abs(q + r)) % 2 === 0;

        // Internal connections
        if (s === 3) {
            // Center connects to all corners
            neighbors.push({ q, r, s: 0 });
            neighbors.push({ q, r, s: 1 });
            neighbors.push({ q, r, s: 2 });
        } else {
            // Corners connect to Center
            neighbors.push({ q, r, s: 3 });
            
            // External connections
            if (isUp) {
                if (s === 0) { // Top
                    neighbors.push({ q: q - 1, r: r, s: 2 }); // Left Neighbor TR
                    neighbors.push({ q: q + 1, r: r, s: 1 }); // Right Neighbor TL
                } else if (s === 1) { // BL
                    neighbors.push({ q: q - 1, r: r, s: 0 }); // Left Neighbor Bottom
                    neighbors.push({ q: q, r: r + 1, s: 1 }); // Bottom Neighbor TL
                } else if (s === 2) { // BR
                    neighbors.push({ q: q + 1, r: r, s: 0 }); // Right Neighbor Bottom
                    neighbors.push({ q: q, r: r + 1, s: 2 }); // Bottom Neighbor TR
                }
            } else { // Down Tile
                if (s === 0) { // Bottom
                    neighbors.push({ q: q - 1, r: r, s: 2 }); // Left Neighbor BR (Up Sub 2)
                    neighbors.push({ q: q + 1, r: r, s: 1 }); // Right Neighbor BL (Up Sub 1)
                } else if (s === 1) { // TL
                    neighbors.push({ q: q - 1, r: r, s: 0 }); // Left Neighbor Top (Up Sub 0)
                    neighbors.push({ q: q, r: r - 1, s: 1 }); // Top Neighbor BL (Up Sub 1)
                } else if (s === 2) { // TR
                    neighbors.push({ q: q + 1, r: r, s: 0 }); // Right Neighbor Top (Up Sub 0)
                    neighbors.push({ q: q, r: r - 1, s: 2 }); // Top Neighbor BR (Up Sub 2)
                }
            }
        }
        return neighbors;
    }

    highlightReachableTiles(startQ, startR, startS, range) {
        console.log(`Highlighting tiles from ${startQ},${startR},${startS} range ${range}`);
        console.log('Teleport tiles:', this.teleportTiles);
        this.clearHighlights();
        
        if (range <= 0) return;

        // Identify occupied tiles
        const occupiedTiles = new Set();
        this.players.forEach(p => {
            if (p.id !== this.socket.id && p.ship) {
                // Default s to 3 (Center) if not present, though it should be present now
                const s = p.ship.position.s !== undefined ? p.ship.position.s : 3;
                occupiedTiles.add(`${p.ship.position.q},${p.ship.position.r},${s}`);
            }
        });

        const q = parseInt(startQ);
        const r = parseInt(startR);
        const s = parseInt(startS);

        const queue = [{ q, r, s, dist: 0 }];
        const visited = new Set();
        visited.add(`${q},${r},${s}`);

        while (queue.length > 0) {
            const current = queue.shift();
            
            // Teleportation Logic
            const currentKey = `${current.q},${current.r},${current.s}`;
            const currentTileData = this.tileData.get(currentKey);
            
            if (currentTileData && currentTileData.type === 'teleportation') {
                for (const teleKey of this.teleportTiles) {
                    if (teleKey !== currentKey && !visited.has(teleKey)) {
                        const [tq, tr, ts] = teleKey.split(',').map(Number);
                        visited.add(teleKey);
                        // Add to queue with SAME distance (instant travel)
                        queue.push({ q: tq, r: tr, s: ts, dist: current.dist });
                        
                        // Only highlight if the teleport destination itself costs at least 1 move
                        // (don't highlight if we're starting on the teleporter)
                        if (current.dist >= 1) {
                            // Highlight the destination teleport tile
                            const teleTile = this.tileData.get(teleKey);
                            if (teleTile) {
                                const spr = teleTile.sprite;
                                
                                // Check if already highlighted
                                const alreadyHighlighted = this.highlightedTiles.find(ht => ht.sprite === spr);
                                
                                if (!alreadyHighlighted) {
                                    // Highlight
                                    if (spr.setTint) {
                                        spr.setTint(0xffff00);
                                    }
                                    
                                    // Make interactive
                                    if (spr.setInteractive) {
                                        spr.setInteractive();
                                    }
                                    
                                    this.highlightedTiles.push(teleTile);
                                    
                                    // Add ONE click handler for the teleporter
                                    const handler = (() => {
                                        const qtele = tq;
                                        const rtele = tr;
                                        const stele = ts;
                                        const dcost = current.dist;
                                        return () => {
                                            console.log(`CLICKED TELEPORT: To Q=${qtele}, R=${rtele}, S=${stele}, Cost=${dcost}`);
                                            this.debugText.setText(`CLICKED TELEPORT: Q=${qtele}, R=${rtele}, S=${stele}, Cost=${dcost}`);
                                            this.socket.emit('moveShip', { q: qtele, r: rtele, s: stele, cost: dcost });
                                            this.clearHighlights();
                                        };
                                    })();
                                    
                                    if (!teleTile.clickHandlers) {
                                        teleTile.clickHandlers = [];
                                    }
                                    teleTile.clickHandlers.push(handler);
                                    
                                    if (spr.on) {
                                        spr.on('pointerdown', handler);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if (current.dist < range) {
                const neighbors = this.getNeighbors(current.q, current.r, current.s);
                // console.log(`[DEBUG] Neighbors of ${current.q},${current.r},${current.s}:`, JSON.stringify(neighbors));
                
                for (const neighbor of neighbors) {
                    const key = `${neighbor.q},${neighbor.r},${neighbor.s}`;
                    if (!visited.has(key)) {
                        const tile = this.tileData.get(key);
                        // console.log(`[DEBUG] Checking ${key}. Tile found: ${!!tile}`);
                        
                        if (!tile) {
                            visited.add(key);
                            continue;
                        }
                        
                        // Check for obstacles: Asteroids, Black Holes
                        const isBlocked = tile.type === 'asteroid_belt' || tile.type === 'black_hole';
                        
                        // Check if occupied by another player
                        const isOccupied = occupiedTiles.has(key);
                        
                        // Mark as visited
                        visited.add(key);
                        
                        // If blocked or occupied, don't continue pathfinding through this tile
                        if (isBlocked || isOccupied) {
                            continue;
                        }
                        
                        // Calculate step cost
                        let stepCost = 1;
                        const currentTile = this.tileData.get(currentKey);
                        
                        // Check if moving internally within the same tile (same q,r but different s)
                        if (current.q === neighbor.q && current.r === neighbor.r) {
                            // Internal movement within a tile is free
                            if (currentTile && currentTile.type !== 'movement') {
                                stepCost = 0;
                            }
                        } else {
                            // Moving to a different tile (different q,r)
                            // For hub, planet, and teleportation tiles, check if we're entering from another part of the same multi-tile
                            if (tile.type === 'hub' || tile.type === 'planet' || tile.type === 'teleportation') {
                                // Check if current position is also part of the same tile
                                if (currentTile && currentTile.type === tile.type) {
                                    // Both positions might be part of the same multi-position tile
                                    // For hub: all 6 positions share the same sprite
                                    // For planet: 2 positions share the same sprite
                                    // For teleportation: single position but registered with multiple sub-keys
                                    if (currentTile.sprite === tile.sprite) {
                                        // Moving between different positions of the same multi-tile (e.g., within hub)
                                        stepCost = 0;
                                    }
                                }
                            }
                        }

                        const dist = current.dist + stepCost;
                        
                        // Add to queue for continued pathfinding
                        queue.push({ q: neighbor.q, r: neighbor.r, s: neighbor.s, dist: dist });
                        
                        // Only highlight tiles that cost at least 1 move (don't highlight internal moves or starting position)
                        if (dist > 0 && stepCost > 0) {
                            const spr = tile.sprite;
                            
                            // Check if this sprite was already highlighted (for non-movement tiles with shared sprites)
                            const alreadyHighlighted = this.highlightedTiles.find(ht => ht.sprite === spr);
                            
                            if (!alreadyHighlighted) {
                                // Highlight the tile (wrapper has setTint method for movement tiles)
                                if (spr.setTint) {
                                    spr.setTint(0xffff00);
                                }
                                
                                // Make interactive (wrapper has setInteractive method)
                                if (spr.setInteractive) {
                                    spr.setInteractive();
                                }
                                
                                this.highlightedTiles.push(tile);
                            }
                            
                            // For movement tiles with sub-triangles, attach handler directly to the specific sub-triangle
                            // For other tiles, attach to the main sprite
                            if (tile.type === 'movement' && spr.subHitAreas && spr.subHitAreas.length > 0) {
                                // Find the specific sub-triangle for this neighbor.s
                                const subHit = spr.subHitAreas.find(sh => sh.subIndex === neighbor.s);
                                if (subHit) {
                                    const subSprite = subHit.sprite;
                                    
                                    // Highlight this specific sub-triangle
                                    subSprite.setTint(0xffff00);
                                    
                                    // Always remove old handler before adding new one
                                    if (subSprite.clickHandler) {
                                        subSprite.off('pointerdown', subSprite.clickHandler);
                                        subSprite.clickHandler = null;
                                    }
                                    
                                    // Store move data
                                    subSprite.moveData = {
                                        q: neighbor.q,
                                        r: neighbor.r,
                                        s: neighbor.s,
                                        dist: dist
                                    };
                                    
                                    // Create and attach handler for this specific sub-triangle
                                    const handler = (() => {
                                        const moveQ = neighbor.q;
                                        const moveR = neighbor.r;
                                        const moveS = neighbor.s;
                                        const moveDist = dist;
                                        return () => {
                                            console.log(`CLICKED SUB-TRIANGLE S=${moveS}: Moving to Q=${moveQ}, R=${moveR}, S=${moveS}, Cost=${moveDist}`);
                                            this.debugText.setText(`CLICKED: Q=${moveQ}, R=${moveR}, S=${moveS}, Cost=${moveDist}`);
                                            this.socket.emit('moveShip', { q: moveQ, r: moveR, s: moveS, cost: moveDist });
                                            this.clearHighlights();
                                        };
                                    })();
                                    
                                    subSprite.on('pointerdown', handler);
                                    subSprite.clickHandler = handler; // Store for cleanup
                                    
                                    // Add to highlighted tiles if not already there
                                    if (!alreadyHighlighted) {
                                        this.highlightedTiles.push(tile);
                                    }
                                    
                                    console.log(`[HIGHLIGHT] Added handler to sub-triangle ${neighbor.q},${neighbor.r},${neighbor.s} at dist ${dist}`);
                                } else {
                                    console.warn(`[HIGHLIGHT] Could not find subHit for s=${neighbor.s} at ${neighbor.q},${neighbor.r}. Available indices:`, spr.subHitAreas.map(sh => sh.subIndex));
                                }
                            } else {
                                // For non-movement tiles (hub, planet, etc.)
                                // Only process if we haven't already highlighted this sprite
                                if (!alreadyHighlighted) {
                                    // Add this move option
                                    if (!tile.moveOptions) {
                                        tile.moveOptions = [];
                                    }
                                    tile.moveOptions.push({
                                        q: neighbor.q,
                                        r: neighbor.r,
                                        s: neighbor.s,
                                        dist: dist,
                                        type: tile.type
                                    });
                                    
                                    // Add ONE click handler for the sprite
                                    const handler = () => {
                                        // When clicked, use the move option with the lowest cost
                                        if (tile.moveOptions && tile.moveOptions.length > 0) {
                                            // Sort by distance and pick the first (lowest cost)
                                            tile.moveOptions.sort((a, b) => a.dist - b.dist);
                                            const bestMove = tile.moveOptions[0];
                                            console.log(`CLICKED NON-MOVEMENT: Moving to Q=${bestMove.q}, R=${bestMove.r}, S=${bestMove.s}, Cost=${bestMove.dist}, Type=${bestMove.type}`);
                                            this.debugText.setText(`CLICKED: Q=${bestMove.q}, R=${bestMove.r}, S=${bestMove.s}, Cost=${bestMove.dist}, Type=${bestMove.type}`);
                                            this.socket.emit('moveShip', { q: bestMove.q, r: bestMove.r, s: bestMove.s, cost: bestMove.dist });
                                            this.clearHighlights();
                                        }
                                    };
                                    
                                    // Store the handler for cleanup
                                    if (!tile.clickHandlers) {
                                        tile.clickHandlers = [];
                                    }
                                    tile.clickHandlers.push(handler);
                                    
                                    // Add the handler
                                    if (spr.on) {
                                        spr.on('pointerdown', handler);
                                    }
                                    
                                    console.log(`[HIGHLIGHT] Added handler to non-movement tile ${neighbor.q},${neighbor.r},${neighbor.s} at dist ${dist}`);
                                } else {
                                    // Already highlighted, just add this as another move option
                                    if (!tile.moveOptions) {
                                        tile.moveOptions = [];
                                    }
                                    tile.moveOptions.push({
                                        q: neighbor.q,
                                        r: neighbor.r,
                                        s: neighbor.s,
                                        dist: dist,
                                        type: tile.type
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    clearHighlights() {
        this.highlightedTiles.forEach(tile => {
            const spr = tile.sprite;
            
            // For movement tiles with sub-triangles, clean up each sub-sprite individually
            if (tile.type === 'movement' && spr.subHitAreas && spr.subHitAreas.length > 0) {
                spr.subHitAreas.forEach(subHit => {
                    const subSprite = subHit.sprite;
                    
                    // Reset tint to default
                    subSprite.setTint(tile.defaultTint);
                    
                    // Remove click handler
                    if (subSprite.clickHandler) {
                        subSprite.off('pointerdown', subSprite.clickHandler);
                        delete subSprite.clickHandler;
                    }
                    if (subSprite.moveData) {
                        delete subSprite.moveData;
                    }
                    // Keep sub-triangles interactive for hover events
                });
            } else {
                // For non-movement tiles, reset tint and remove handlers
                if (spr.setTint) {
                    spr.setTint(tile.defaultTint);
                }
                
                // Remove click handlers and disable interactivity
                if (tile.clickHandlers && spr.off) {
                    tile.clickHandlers.forEach(handler => {
                        spr.off('pointerdown', handler);
                    });
                    tile.clickHandlers = [];
                }
                
                // Clear move options
                if (tile.moveOptions) {
                    tile.moveOptions = [];
                }
                
                // Disable interactivity for non-movement tiles
                if (spr.disableInteractive) {
                    spr.disableInteractive();
                }
            }
        });
        this.highlightedTiles = [];
    }

    renderShips(players) {
        console.log('Rendering ships. Players:', players.length);
        if (!this.shipsGroup) {
            this.shipsGroup = this.add.group();
        }
        this.shipsGroup.clear(true, true);

        const scale = this.gridScale || 100; // Should match grid scale
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;
        const offsetX = this.boardOffset ? this.boardOffset.x : 0;
        const offsetY = this.boardOffset ? this.boardOffset.y : 0;

        this.myPlayer = players.find(p => p.id === this.socket.id);
        if (this.myPlayer) {
            console.log('My Player found. Moves Left:', this.myPlayer.movesLeft);
        } else {
            console.log('My Player NOT found. Socket ID:', this.socket.id);
        }

        players.forEach(player => {
            if (player.ship) {
                const q = parseInt(player.ship.position.q);
                const r = parseInt(player.ship.position.r);
                const s = player.ship.position.s !== undefined ? parseInt(player.ship.position.s) : 3;
                
                const { x, y } = this.axialToPixel(q, r, scale);
                
                // Calculate sub-tile offset
                let subX = 0;
                let subY = 0;
                const isUp = (Math.abs(q + r)) % 2 === 0;
                
                // Use the same centroid math as renderBoard so ships align with sub-triangles.
                const sSide = scale;
                const H = sSide * Math.sqrt(3) / 2;
                const topCentroidY = -H / 3;
                const cornerCentroidY = H / 6;
                const leftX = -sSide / 4;
                const rightX = sSide / 4;

                if (isUp) {
                    if (s === 0) { // Top
                        subX = 0; subY = topCentroidY;
                    } else if (s === 1) { // Bottom-left
                        subX = leftX; subY = cornerCentroidY;
                    } else if (s === 2) { // Bottom-right
                        subX = rightX; subY = cornerCentroidY;
                    } else { // center
                        subX = 0; subY = 0;
                    }
                } else {
                    if (s === 0) { // Bottom
                        subX = 0; subY = -topCentroidY;
                    } else if (s === 1) { // Top-left
                        subX = leftX; subY = -cornerCentroidY;
                    } else if (s === 2) { // Top-right
                        subX = rightX; subY = -cornerCentroidY;
                    } else { // center
                        subX = 0; subY = 0;
                    }
                }

                // Draw ship as a circle for now
                const shipGraphics = this.add.graphics();
                shipGraphics.fillStyle(parseInt(player.color.replace('#', '0x')), 1);
                shipGraphics.fillCircle(0, 0, 10); // Smaller ship for sub-tiles
                shipGraphics.lineStyle(2, 0xffffff);
                shipGraphics.strokeCircle(0, 0, 10);
                
                const shipX = Math.round(centerX + x + subX + offsetX);
                const shipY = Math.round(centerY + y + subY + offsetY);
                const container = this.add.container(shipX, shipY, [shipGraphics]);
                this.shipsGroup.add(container);
                container.setDepth(3); // Above tiles (depth 2) but allow click-through
                
                // Add player name above ship
                const nameText = this.add.text(0, -20, player.name, {
                    font: '10px Arial',
                    fill: '#ffffff',
                    stroke: '#000000',
                    strokeThickness: 2
                }).setOrigin(0.5);
                container.add(nameText);

                // Make my ship interactive but allow events to pass through to tiles below
                if (this.myPlayer && player.id === this.myPlayer.id) {
                    console.log('Making my ship interactive');
                    const hitArea = new Phaser.Geom.Circle(0, 0, 20);
                    container.setInteractive(hitArea, Phaser.Geom.Circle.Contains);
                    
                    // Stop event propagation so ship click doesn't also trigger tile clicks
                    container.on('pointerdown', (pointer, localX, localY, event) => {
                        console.log('Pointer down on ship. Moves:', this.myPlayer.movesLeft);
                        event.stopPropagation(); // Prevent tile clicks when clicking ship
                        if (this.myPlayer.movesLeft > 0) {
                            this.highlightReachableTiles(q, r, s, this.myPlayer.movesLeft);
                        }
                    });
                    
                    // Add hover event that doesn't block tile hovers
                    container.on('pointermove', (pointer, localX, localY, event) => {
                        // Don't stop propagation for hover - let tiles underneath show their info too
                    });
                }
            }
        });
    }

    areNeighbors(pos1, pos2) {
        const dq = pos1.q - pos2.q;
        const dr = pos1.r - pos2.r;
        const isUp = (Math.abs(pos1.q + pos1.r)) % 2 === 0;

        if (Math.abs(dq) === 1 && dr === 0) return true; // Left/Right
        if (dq === 0) {
            if (isUp && dr === -1) return true; // Bottom (L is Up, P is r+1 -> dr = -1)
            if (!isUp && dr === 1) return true; // Top (L is Down, P is r-1 -> dr = 1)
        }
        return false;
    }

    createStarTexture(key, count, size, alpha) {
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });
        graphics.fillStyle(0xffffff, alpha);
        for (let i = 0; i < count; i++) {
            const x = Phaser.Math.Between(0, 2048);
            const y = Phaser.Math.Between(0, 2048);
            const s = Phaser.Math.FloatBetween(size * 0.5, size * 1.5);
            graphics.fillCircle(x, y, s);
        }
        graphics.generateTexture(key, 2048, 2048);
    }

    resize(gameSize) {
        const width = gameSize.width;
        const height = gameSize.height;
        this.cameras.main.setSize(width, height);
        if (this.starfield1) this.starfield1.setSize(width, height);
        if (this.starfield2) this.starfield2.setSize(width, height);
        if (this.starfield3) this.starfield3.setSize(width, height);
    }

    update() {
        if (this.starfield1) {
            this.starfield1.tilePositionX = this.cameras.main.scrollX * 0.05;
            this.starfield1.tilePositionY = this.cameras.main.scrollY * 0.05;
        }
        if (this.starfield2) {
            this.starfield2.tilePositionX = this.cameras.main.scrollX * 0.1;
            this.starfield2.tilePositionY = this.cameras.main.scrollY * 0.1;
        }
        if (this.starfield3) {
            this.starfield3.tilePositionX = this.cameras.main.scrollX * 0.2;
            this.starfield3.tilePositionY = this.cameras.main.scrollY * 0.2;
        }
    }

    axialToPixel(q, r, scale) {
        // Matches src/grid.js logic (triangular grid with parity offset)
        const s = scale;
        const h = s * Math.sqrt(3) / 2;
        const parity = Math.abs(q + r) % 2; // 0 for up, 1 for down

        const x = q * (s / 2);
        const y = (r * h) - (parity ? h / 3 : 0);

        return { x, y };
    }
}

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    scene: [GameScene, UIScene],
    backgroundColor: '#1a1a1a',
    dom: {
        createContainer: true
    },
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

const game = new Phaser.Game(config);