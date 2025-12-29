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

        // Connect to Socket.io server
        this.socket = io();
        this.boardGroup = this.add.group();
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
        this.teleportTiles = []; // Reset teleport tiles list
        this.gridScale = data.gridScale || 100;
        const scale = this.gridScale;
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        data.tiles.forEach(tile => {
            // Ensure coordinates are numbers
            const q = parseInt(tile.position.q);
            const r = parseInt(tile.position.r);
            
            // Use the new coordinate system logic
            const { x, y } = this.axialToPixel(q, r, scale);
            let texture = 'triangle';
            let tint = 0xffffff;
            let rotation = 0;

            // Determine orientation based on grid coordinates
            // (q + r) % 2 === 0 ? UP : DOWN
            const isUp = (Math.abs(q + r)) % 2 === 0;
            rotation = isUp ? 0 : Math.PI;

            if (tile.type === 'hub') {
                texture = 'hexagon';
                tint = 0xcccccc;
                rotation = 0; // Assume flat-topped hexagon image or handle via size
            } else if (tile.type === 'landing') {
                texture = 'triangle';
                tint = 0x00ff00;
            } else if (tile.type === 'asteroid_belt') {
                texture = 'triangle';
                tint = 0x555555;
            } else if (tile.type === 'teleportation') {
                texture = 'triangle';
                tint = 0x0000ff;
                // Store teleport tile key for BFS
                this.teleportTiles.push(`${q},${r}`);
            } else if (tile.type === 'black_hole') {
                texture = 'triangle';
                tint = 0x000000;
            } else if (tile.type === 'planet') { 
                texture = 'rhombus';
                // Determine rotation based on P1 and P2
                // P1 is tile.position. P2 is the other occupied position.
                // We need to find P2 from the tile data.
                // The server sends 'occupiedPositions' for the planet tile.
                // Let's assume data.tiles includes occupiedPositions for planets.
                
                let p2 = null;
                if (tile.occupiedPositions && tile.occupiedPositions.length === 2) {
                    // Find the one that is NOT tile.position
                    p2 = tile.occupiedPositions.find(p => parseInt(p.q) !== q || parseInt(p.r) !== r);
                }

                if (p2) {
                    const p2q = parseInt(p2.q);
                    const p2r = parseInt(p2.r);
                    const dq = p2q - q;
                    
                    // Calculate pixel positions
                    const p1Pix = this.axialToPixel(q, r, scale);
                    const p2Pix = this.axialToPixel(p2q, p2r, scale);

                    // Midpoint
                    const midX = (p1Pix.x + p2Pix.x) / 2;
                    const midY = (p1Pix.y + p2Pix.y) / 2;

                    // Override x and y for sprite placement
                    // We'll set sprite position directly later.
                    
                    if (dq === 0) {
                        // Vertical Rhombus (Stacked Up/Down)
                        rotation = 0; 
                    } else {
                        // Slanted Rhombus (Side-by-side)
                        // Determine slope.
                        // If P1 is Left of P2 (dq=1).
                        // P1(Down) -> P2(Up) ?
                        // Or P1(Up) -> P2(Down) ?
                        // Let's check P1 orientation.
                        const isP1Up = (Math.abs(q + r)) % 2 === 0;
                        
                        // If P1 is Up. P2 must be Down.
                        // If P2 is Right (dq=1). P1(Up) -> P2(Down). Slope \. Rotation 60.
                        // If P2 is Left (dq=-1). P1(Up) -> P2(Down). Slope /. Rotation -60.
                        
                        // If P1 is Down. P2 must be Up.
                        // If P2 is Right (dq=1). P1(Down) -> P2(Up). Slope /. Rotation -60.
                        // If P2 is Left (dq=-1). P1(Down) -> P2(Up). Slope \. Rotation 60.
                        
                        const sign = isP1Up ? 1 : -1;
                        rotation = sign * dq * (Math.PI / 3);
                    }
                    
                    // Store midpoint for later use
                    tile.midX = midX;
                    tile.midY = midY;
                }
            } else if (tile.type === 'movement') {
                texture = 'triangle';
            }

            const sprite = this.add.sprite(centerX + x, centerY + y, texture);
            sprite.setDepth(1);
            this.boardGroup.add(sprite);
            sprite.setTint(tint);
            
            // this.tileData.set(`${q},${r}`, {
            //     type: tile.type,
            //     sprite: sprite,
            //     defaultTint: tint
            // });
            
            const s = scale; // Side length matches scale in new grid
            
            if (texture === 'triangle') {
                sprite.setDisplaySize(s, s * Math.sqrt(3) / 2);
                sprite.setRotation(rotation);
            } else if (texture === 'hexagon') {
                // Hub occupies 6 triangles.
                // Center is at (0,0) in pixel space (relative to board center).
                // Size should cover the 6 triangles.
                // Width = 2 * s. Height = sqrt(3) * s.
                sprite.setDisplaySize(2 * s, Math.sqrt(3) * s);
                sprite.setRotation(rotation); 
                
                // Adjust position: The Hub sprite is drawn at (0,0) but the geometric center 
                // of the 6 triangles is shifted up by half a triangle height.
                // h = s * sqrt(3) / 2.
                // Shift y by -h/2.
                const h = s * Math.sqrt(3) / 2;
                sprite.y -= h / 2;
            } else if (texture === 'rhombus') {
                sprite.setDisplaySize(s, s * Math.sqrt(3)); 
                sprite.setRotation(rotation);
                
                if (tile.midX !== undefined && tile.midY !== undefined) {
                    sprite.x = centerX + tile.midX;
                    sprite.y = centerY + tile.midY;
                }
            } else {
                sprite.setDisplaySize(s, s);
            }

            if (tile.occupiedPositions && tile.occupiedPositions.length > 0) {
                tile.occupiedPositions.forEach(pos => {
                    const pq = parseInt(pos.q);
                    const pr = parseInt(pos.r);
                    this.tileData.set(`${pq},${pr}`, {
                        type: tile.type,
                        sprite: sprite,
                        defaultTint: tint
                    });
                });
            } else {
                this.tileData.set(`${q},${r}`, {
                    type: tile.type,
                    sprite: sprite,
                    defaultTint: tint
                });
            }
        });
        console.log(`[DEBUG] tileData populated. Size: ${this.tileData.size}`);
    }

    getNeighbors(q, r) {
        const neighbors = [
            { q: q - 1, r: r }, // Left
            { q: q + 1, r: r }  // Right
        ];
        
        if ((q + r) % 2 === 0) {
            // Up triangle pointing up
            neighbors.push({ q: q, r: r + 1 }); // Bottom
        } else {
            // Down triangle pointing down
            neighbors.push({ q: q, r: r - 1 }); // Top
        }
        
        return neighbors;
    }

    highlightReachableTiles(startQ, startR, range) {
        console.log(`Highlighting tiles from ${startQ},${startR} range ${range}`);
        this.clearHighlights();
        
        if (range <= 0) return;

        // Identify occupied tiles
        const occupiedTiles = new Set();
        this.players.forEach(p => {
            if (p.id !== this.socket.id && p.ship) {
                occupiedTiles.add(`${p.ship.position.q},${p.ship.position.r}`);
            }
        });

        const q = parseInt(startQ);
        const r = parseInt(startR);

        const queue = [{ q: q, r: r, dist: 0 }];
        const visited = new Set();
        visited.add(`${q},${r}`);

        while (queue.length > 0) {
            const current = queue.shift();
            
            // Teleportation Logic
            const currentKey = `${current.q},${current.r}`;
            const currentTileData = this.tileData.get(currentKey);
            
            if (currentTileData && currentTileData.type === 'teleportation') {
                for (const teleKey of this.teleportTiles) {
                    if (teleKey !== currentKey && !visited.has(teleKey)) {
                        const [tq, tr] = teleKey.split(',').map(Number);
                        visited.add(teleKey);
                        // Add to queue with SAME distance (instant travel)
                        queue.push({ q: tq, r: tr, dist: current.dist });
                        
                        // Highlight the destination teleport tile
                        const teleTile = this.tileData.get(teleKey);
                        if (teleTile) {
                            teleTile.sprite.setTint(0xffff00);
                            teleTile.sprite.setInteractive();
                            teleTile.sprite.off('pointerdown');
                            teleTile.sprite.on('pointerdown', () => {
                                console.log(`Teleporting to ${tq},${tr} cost ${current.dist}`);
                                this.socket.emit('moveShip', { q: tq, r: tr, cost: current.dist });
                                this.clearHighlights();
                            });
                            this.highlightedTiles.push(teleTile);
                        }
                    }
                }
            }

            if (current.dist < range) {
                const neighbors = this.getNeighbors(current.q, current.r);
                console.log(`[DEBUG] Neighbors of ${current.q},${current.r}:`, JSON.stringify(neighbors));
                
                for (const neighbor of neighbors) {
                    const key = `${neighbor.q},${neighbor.r}`;
                    if (!visited.has(key)) {
                        const tile = this.tileData.get(key);
                        console.log(`[DEBUG] Checking ${key}. Tile found: ${!!tile}`);
                        // Check for obstacles: Asteroids, Black Holes, AND Occupied Tiles
                        const isOccupied = occupiedTiles.has(key);
                        
                        if (tile && tile.type !== 'asteroid_belt' && tile.type !== 'black_hole' && !isOccupied) {
                            console.log(`Highlighting tile ${key}`);
                            visited.add(key);
                            const dist = current.dist + 1;
                            queue.push({ q: neighbor.q, r: neighbor.r, dist: dist });
                            
                            // Highlight
                            tile.sprite.setTint(0xffff00);
                            tile.sprite.setInteractive();
                            // Remove existing listeners to avoid duplicates if logic changes
                            tile.sprite.off('pointerdown'); 
                            tile.sprite.on('pointerdown', () => {
                                console.log(`Moving to ${neighbor.q},${neighbor.r} cost ${dist}`);
                                this.socket.emit('moveShip', { q: neighbor.q, r: neighbor.r, cost: dist });
                                this.clearHighlights();
                            });
                            this.highlightedTiles.push(tile);
                        }
                    }
                }
            }
        }
    }

    clearHighlights() {
        this.highlightedTiles.forEach(tile => {
            tile.sprite.setTint(tile.defaultTint);
            tile.sprite.disableInteractive();
            tile.sprite.off('pointerdown');
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

        this.myPlayer = players.find(p => p.id === this.socket.id);
        if (this.myPlayer) {
            console.log('My Player found. Moves Left:', this.myPlayer.movesLeft);
        } else {
            console.log('My Player NOT found. Socket ID:', this.socket.id);
        }

        players.forEach(player => {
            if (player.ship) {
                const { x, y } = this.axialToPixel(player.ship.position.q, player.ship.position.r, scale);
                
                // Draw ship as a circle for now
                const shipGraphics = this.add.graphics();
                shipGraphics.fillStyle(parseInt(player.color.replace('#', '0x')), 1);
                shipGraphics.fillCircle(0, 0, 20);
                shipGraphics.lineStyle(2, 0xffffff);
                shipGraphics.strokeCircle(0, 0, 20);
                
                const container = this.add.container(centerX + x, centerY + y, [shipGraphics]);
                this.shipsGroup.add(container);
                container.setDepth(10);
                
                // Add player name above ship
                const nameText = this.add.text(0, -30, player.name, {
                    font: '14px Arial',
                    fill: '#ffffff',
                    stroke: '#000000',
                    strokeThickness: 3
                }).setOrigin(0.5);
                container.add(nameText);

                // Make my ship interactive
                if (this.myPlayer && player.id === this.myPlayer.id) {
                    console.log('Making my ship interactive');
                    const hitArea = new Phaser.Geom.Circle(0, 0, 20);
                    container.setInteractive(hitArea, Phaser.Geom.Circle.Contains);
                    
                    container.on('pointerdown', () => {
                        console.log('Pointer down on ship. Moves:', this.myPlayer.movesLeft);
                        if (this.myPlayer.movesLeft > 0) {
                            this.highlightReachableTiles(player.ship.position.q, player.ship.position.r, this.myPlayer.movesLeft);
                        }
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
        // Matches src/grid.js logic
        const s = scale;
        const h = s * Math.sqrt(3) / 2;
        const w = s;

        const x = q * (w / 2);
        const y = r * h;

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
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

const game = new Phaser.Game(config);