class LobbyScene extends Phaser.Scene {
    constructor() {
        super({ key: "LobbyScene" });
    }

    create(data) {
        try {
            this.socket = data && data.socket ? data.socket : socket;
            console.log(
                "LobbyScene created with socket id:",
                this.socket ? this.socket.id : "NO SOCKET",
            );

            this.cameras.main.setBackgroundColor("#1a1a2e");

            // Title
            const width = this.cameras.main.width;
            const height = this.cameras.main.height;

            // Responsive sizing
            this.isMobile = width < 768;
            const titleFontSize = this.isMobile ? 28 : 48;
            const buttonFontSize = this.isMobile ? 18 : 24;
            const buttonWidth = this.isMobile ? 160 : 200;
            const buttonHeight = this.isMobile ? 50 : 60;

            const titleText = this.add
                .text(
                    width / 2,
                    this.isMobile ? 30 : 40,
                    "CargoSpace - Game Lobby",
                    {
                        font: `bold ${titleFontSize}px Arial`,
                        fill: "#ffffff",
                    },
                )
                .setOrigin(0.5);

            // Listen for lobby updates
            if (this.socket) {
                this.socket.on("lobbyData", (data) => {
                    this.updateGameList(data.availableGames);
                });

                this.socket.on("lobbyUpdate", (data) => {
                    this.updateGameList(data.availableGames);
                });
            }

            // Create Game button
            const createBtn = this.add
                .rectangle(
                    width / 2,
                    height - 40,
                    buttonWidth,
                    buttonHeight,
                    0x2a9d8f,
                )
                .setInteractive();
            createBtn.on("pointerdown", () => this.showCreateGamePopup());
            createBtn.on("pointerover", () => (createBtn.fillColor = 0x3bb5a3));
            createBtn.on("pointerout", () => (createBtn.fillColor = 0x2a9d8f));

            const btnText = this.add
                .text(width / 2, height - 40, "Create Game", {
                    font: `bold ${buttonFontSize}px Arial`,
                    fill: "#ffffff",
                })
                .setOrigin(0.5);

            // Container for game list
            this.gameListContainer = this.add.container(
                0,
                this.isMobile ? 80 : 120,
            );

            // Request initial lobby data
            if (this.socket) {
                this.socket.emit("getLobbyData");
            }

            // Show initial message
            const statusText = this.add
                .text(width / 2, height / 2, "Loading games...", {
                    font: `bold ${buttonFontSize}px Arial`,
                    fill: "#ffffff",
                })
                .setOrigin(0.5);
        } catch (error) {
            console.error("Error creating LobbyScene:", error);
        }
    }

    updateGameList(games) {
        // Clear existing games
        this.gameListContainer.removeAll(true);

        const width = this.cameras.main.width;
        const fontSize = this.isMobile ? 16 : 20;
        const detailFontSize = this.isMobile ? 12 : 16;
        const rowHeight = this.isMobile ? 50 : 70;
        const btnWidth = this.isMobile ? 80 : 150;
        const btnHeight = this.isMobile ? 36 : 50;

        if (games.length === 0) {
            const noGamesText = this.add
                .text(
                    width / 2,
                    this.isMobile ? 100 : 200,
                    "No games available. Create one!",
                    {
                        font: `${fontSize}px Arial`,
                        fill: "#888888",
                    },
                )
                .setOrigin(0.5);
            this.gameListContainer.add(noGamesText);
            return;
        }

        let yPos = 0;
        games.forEach((game, index) => {
            const gameLabel = this.add.text(
                20,
                yPos,
                `${game.name} (${game.playerCount}/${game.maxPlayers})`,
                {
                    font: `bold ${fontSize}px Arial`,
                    fill: "#ffffff",
                },
            );

            const gameDetails = this.add.text(
                20,
                yPos + (this.isMobile ? 20 : 30),
                `Tiles: ${game.movementTiles} | Asteroids: ${game.asteroidBelts ? "Yes" : "No"}`,
                {
                    font: `${detailFontSize}px Arial`,
                    fill: "#aaaaaa",
                },
            );

            const joinBtn = this.add
                .rectangle(
                    width - (this.isMobile ? 60 : 100),
                    yPos + 20,
                    btnWidth,
                    btnHeight,
                    0x264653,
                )
                .setInteractive();
            joinBtn.on("pointerdown", () => {
                // Show popup to get player name
                this.showJoinGamePopup(game.gameId);
            });
            joinBtn.on("pointerover", () => (joinBtn.fillColor = 0x2a5a7f));
            joinBtn.on("pointerout", () => (joinBtn.fillColor = 0x264653));

            const joinBtnText = this.add
                .text(width - (this.isMobile ? 60 : 100), yPos + 20, "Join", {
                    font: `bold ${this.isMobile ? 14 : 16}px Arial`,
                    fill: "#ffffff",
                })
                .setOrigin(0.5);

            this.gameListContainer.add([
                gameLabel,
                gameDetails,
                joinBtn,
                joinBtnText,
            ]);
            yPos += rowHeight;
        });
    }

    showCreateGamePopup() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Responsive popup sizing
        const popupWidth = this.isMobile ? Math.min(width - 40, 350) : 600;
        const popupHeight = this.isMobile ? Math.min(height - 80, 450) : 550;
        const titleFontSize = this.isMobile ? 24 : 32;
        const labelFontSize = this.isMobile ? 14 : 16;
        const inputWidth = this.isMobile ? "150px" : "200px";

        // Create popup background
        const popupBg = this.add
            .rectangle(
                width / 2,
                height / 2,
                popupWidth,
                popupHeight,
                0x000000,
                0.9,
            )
            .setInteractive();
        popupBg.setStrokeStyle(4, 0xffffff);
        popupBg.setScrollFactor(0).setDepth(3000);

        const popupContainer = this.add
            .container(width / 2, height / 2)
            .setScrollFactor(0)
            .setDepth(3000);

        // Title
        const popupTitle = this.add
            .text(0, -popupHeight / 2 + 30, "Create Game", {
                font: `bold ${titleFontSize}px Arial`,
                fill: "#ffffff",
            })
            .setOrigin(0.5);

        let yOffset = -popupHeight / 2 + 70;
        const rowSpacing = this.isMobile ? 40 : 50;
        const labelX = -popupWidth / 2 + 20;

        // Player Name input
        const playerNameLabel = this.add.text(labelX, yOffset, "Your Name:", {
            font: `bold ${labelFontSize}px Arial`,
            fill: "#ffffff",
        });

        const playerNameInput = document.createElement("input");
        playerNameInput.type = "text";
        playerNameInput.placeholder = "Your Player Name";
        playerNameInput.style.position = "fixed";
        playerNameInput.style.left = width / 2 + "px";
        playerNameInput.style.top = height / 2 + yOffset - 15 + "px";
        playerNameInput.style.width = inputWidth;
        playerNameInput.style.height = "30px";
        playerNameInput.style.fontSize = `${labelFontSize}px`;
        document.body.appendChild(playerNameInput);

        yOffset += rowSpacing;

        // Game Name input
        const nameLabel = this.add.text(labelX, yOffset, "Game Name:", {
            font: `bold ${labelFontSize}px Arial`,
            fill: "#ffffff",
        });

        const nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.placeholder = "My Game";
        nameInput.style.position = "fixed";
        nameInput.style.left = width / 2 + "px";
        nameInput.style.top = height / 2 + yOffset - 15 + "px";
        nameInput.style.width = inputWidth;
        nameInput.style.height = "30px";
        nameInput.style.fontSize = `${labelFontSize}px`;
        document.body.appendChild(nameInput);

        yOffset += rowSpacing;

        // Movement Tiles
        const tilesLabel = this.add.text(labelX, yOffset, "Board Size:", {
            font: `bold ${labelFontSize}px Arial`,
            fill: "#ffffff",
        });

        const tilesContainer = document.createElement("div");
        tilesContainer.style.position = "fixed";
        tilesContainer.style.left = width / 2 + "px";
        tilesContainer.style.top = height / 2 + yOffset - 15 + "px";
        tilesContainer.style.display = "flex";
        tilesContainer.style.alignItems = "center";
        tilesContainer.style.gap = this.isMobile ? "5px" : "10px";

        const smallLabel = document.createElement("span");
        smallLabel.textContent = "Small";
        smallLabel.style.color = "#ffffff";
        smallLabel.style.fontSize = `${this.isMobile ? 12 : 14}px`;

        const tilesInput = document.createElement("input");
        tilesInput.type = "range";
        tilesInput.value = "90";
        tilesInput.min = "20";
        tilesInput.max = "200";
        tilesInput.style.width = this.isMobile ? "80px" : "150px";
        tilesInput.style.height = "20px";

        const largeLabel = document.createElement("span");
        largeLabel.textContent = "Large";
        largeLabel.style.color = "#ffffff";
        largeLabel.style.fontSize = `${this.isMobile ? 12 : 14}px`;

        tilesContainer.appendChild(smallLabel);
        tilesContainer.appendChild(tilesInput);
        tilesContainer.appendChild(largeLabel);
        document.body.appendChild(tilesContainer);

        yOffset += rowSpacing;

        // Asteroid Belts
        const asteroidsLabel = this.add.text(
            labelX,
            yOffset,
            "Asteroid Belts:",
            {
                font: `bold ${labelFontSize}px Arial`,
                fill: "#ffffff",
            },
        );

        const asteroidsCheckbox = document.createElement("input");
        asteroidsCheckbox.type = "checkbox";
        asteroidsCheckbox.style.position = "fixed";
        asteroidsCheckbox.style.left = width / 2 + "px";
        asteroidsCheckbox.style.top = height / 2 + yOffset + "px";
        asteroidsCheckbox.style.width = "20px";
        asteroidsCheckbox.style.height = "20px";
        document.body.appendChild(asteroidsCheckbox);

        yOffset += rowSpacing;

        // Max Players
        const playersLabel = this.add.text(labelX, yOffset, "Max Players:", {
            font: `bold ${labelFontSize}px Arial`,
            fill: "#ffffff",
        });

        const playersInput = document.createElement("input");
        playersInput.type = "number";
        playersInput.value = "4";
        playersInput.min = "2";
        playersInput.max = "6";
        playersInput.style.position = "fixed";
        playersInput.style.left = width / 2 + "px";
        playersInput.style.top = height / 2 + yOffset - 15 + "px";
        playersInput.style.width = inputWidth;
        playersInput.style.height = "30px";
        playersInput.style.fontSize = `${labelFontSize}px`;
        document.body.appendChild(playersInput);

        yOffset += rowSpacing + 20;

        // Create button
        const btnWidth = this.isMobile ? 120 : 150;
        const btnHeight = this.isMobile ? 40 : 50;
        const createBtn = this.add
            .rectangle(0, yOffset, btnWidth, btnHeight, 0x2a9d8f)
            .setInteractive();
        createBtn.on("pointerdown", () => {
            const playerName = playerNameInput.value || "Player";
            const gameName = nameInput.value || "Unnamed Game";
            const movementTiles = parseInt(tilesInput.value) || 50;
            const asteroidBelts = asteroidsCheckbox.checked;
            const maxPlayers = parseInt(playersInput.value) || 4;

            this.socket.emit("createGame", {
                playerName: playerName,
                gameName: gameName,
                movementTiles: movementTiles,
                asteroidBelts: asteroidBelts,
                maxPlayers: maxPlayers,
            });

            // Clean up HTML inputs
            document.body.removeChild(playerNameInput);
            document.body.removeChild(nameInput);
            document.body.removeChild(tilesContainer);
            document.body.removeChild(asteroidsCheckbox);
            document.body.removeChild(playersInput);

            popupBg.destroy();
            popupContainer.destroy();

            // Wait for connectionData event, then start game
            this.socket.once("connectionData", (connectionData) => {
                console.log(
                    "LobbyScene: Received connectionData, starting GameScene",
                );
                this.scene.start("GameScene", {
                    socket: this.socket,
                    gameId: connectionData.gameId,
                    connectionData: connectionData,
                });
            });
        });
        createBtn.on("pointerover", () => (createBtn.fillColor = 0x3bb5a3));
        createBtn.on("pointerout", () => (createBtn.fillColor = 0x2a9d8f));

        const createBtnText = this.add
            .text(0, yOffset, "Create", {
                font: "bold 20px Arial",
                fill: "#ffffff",
            })
            .setOrigin(0.5);

        // Cancel button
        const cancelBtn = this.add
            .rectangle(0, yOffset + 70, 150, 50, 0xe76f51)
            .setInteractive();
        cancelBtn.on("pointerdown", () => {
            // Clean up HTML inputs
            document.body.removeChild(playerNameInput);
            document.body.removeChild(nameInput);
            document.body.removeChild(tilesContainer);
            document.body.removeChild(asteroidsCheckbox);
            document.body.removeChild(playersInput);

            popupBg.destroy();
            popupContainer.destroy();
        });
        cancelBtn.on("pointerover", () => (cancelBtn.fillColor = 0xf4a261));
        cancelBtn.on("pointerout", () => (cancelBtn.fillColor = 0xe76f51));

        const cancelBtnText = this.add
            .text(0, yOffset + 70, "Cancel", {
                font: "bold 20px Arial",
                fill: "#ffffff",
            })
            .setOrigin(0.5);

        popupContainer.add([
            popupTitle,
            nameLabel,
            tilesLabel,
            asteroidsLabel,
            playersLabel,
            createBtn,
            createBtnText,
            cancelBtn,
            cancelBtnText,
        ]);
    }

    showJoinGamePopup(gameId) {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Create popup background
        const popupBg = this.add
            .rectangle(width / 2, height / 2, 500, 300, 0x000000, 0.9)
            .setInteractive();
        popupBg.setStrokeStyle(4, 0xffffff);
        popupBg.setScrollFactor(0).setDepth(3000);

        const popupContainer = this.add
            .container(width / 2, height / 2)
            .setScrollFactor(0)
            .setDepth(3000);

        // Title
        const popupTitle = this.add
            .text(0, -100, "Join Game", {
                font: "bold 32px Arial",
                fill: "#ffffff",
            })
            .setOrigin(0.5);

        // Player Name input
        const playerNameLabel = this.add.text(-200, -40, "Your Name:", {
            font: "bold 16px Arial",
            fill: "#ffffff",
        });

        const playerNameInput = document.createElement("input");
        playerNameInput.type = "text";
        playerNameInput.placeholder = "Your Player Name";
        playerNameInput.style.position = "fixed";
        playerNameInput.style.left = width / 2 + "px";
        playerNameInput.style.top = height / 2 - 40 + "px";
        playerNameInput.style.width = "200px";
        playerNameInput.style.height = "30px";
        playerNameInput.style.fontSize = "16px";
        document.body.appendChild(playerNameInput);

        // Join button
        const joinBtn = this.add
            .rectangle(0, 60, 150, 50, 0x264653)
            .setInteractive();
        joinBtn.on("pointerdown", () => {
            const playerName = playerNameInput.value || "Player";
            this.socket.emit("joinGame", {
                gameId: gameId,
                playerName: playerName,
            });

            // Wait for connectionData before starting game
            this.socket.once("connectionData", (connectionData) => {
                console.log(
                    "LobbyScene: Received connectionData after join, starting GameScene",
                );
                document.body.removeChild(playerNameInput);
                popupBg.destroy();
                popupContainer.destroy();
                this.scene.start("GameScene", {
                    socket: this.socket,
                    connectionData: connectionData,
                });
            });
        });
        joinBtn.on("pointerover", () => (joinBtn.fillColor = 0x2a5a7f));
        joinBtn.on("pointerout", () => (joinBtn.fillColor = 0x264653));

        const joinBtnText = this.add
            .text(0, 60, "Join", {
                font: "bold 20px Arial",
                fill: "#ffffff",
            })
            .setOrigin(0.5);

        // Cancel button
        const cancelBtn = this.add
            .rectangle(0, 130, 150, 50, 0xe76f51)
            .setInteractive();
        cancelBtn.on("pointerdown", () => {
            document.body.removeChild(playerNameInput);
            popupBg.destroy();
            popupContainer.destroy();
        });
        cancelBtn.on("pointerover", () => (cancelBtn.fillColor = 0xf4a261));
        cancelBtn.on("pointerout", () => (cancelBtn.fillColor = 0xe76f51));

        const cancelBtnText = this.add
            .text(0, 130, "Cancel", {
                font: "bold 20px Arial",
                fill: "#ffffff",
            })
            .setOrigin(0.5);

        popupContainer.add([
            popupTitle,
            playerNameLabel,
            joinBtn,
            joinBtnText,
            cancelBtn,
            cancelBtnText,
        ]);
    }
}

class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: "UIScene" });
    }

    create(data) {
        this.socket = data && data.socket ? data.socket : socket;
        console.log(
            "UIScene created with socket id:",
            this.socket ? this.socket.id : "NO SOCKET",
        );
        this.otherPlayersGroup = this.add.group();
        this.currentPlayerGroup = this.add.group();
        this.players = [];
        this.currentDiceData = null;
        this.currentTurnPlayerId = null;
        this.turnPopup = null;
        this.turnIndicatorText = null;
        this.turnPhase = "roll"; // Track current phase

        // Calculate responsive panel sizes
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        this.isMobile = width < 768;
        this.leftPanelWidth = this.isMobile ? 0 : Math.min(250, width * 0.2);
        this.bottomPanelHeight = this.isMobile
            ? Math.min(200, height * 0.35)
            : Math.min(300, height * 0.4);

        // Left Panel Background (hidden on mobile)
        this.leftPanelGraphics = this.add.graphics();
        if (this.leftPanelWidth > 0) {
            this.leftPanelGraphics.fillStyle(0x000000, 0.5);
            this.leftPanelGraphics.fillRect(
                0,
                0,
                this.leftPanelWidth,
                height - this.bottomPanelHeight,
            );

            this.otherPlayersLabel = this.add.text(10, 10, "Other Players", {
                font: "20px Arial",
                fill: "#ffffff",
            });
        }

        // Bottom Panel Background
        const bottomPanelY = height - this.bottomPanelHeight;
        this.bottomPanelGraphics = this.add.graphics();
        this.bottomPanelGraphics.fillStyle(0x222222, 0.9);
        this.bottomPanelGraphics.fillRect(
            0,
            bottomPanelY,
            width,
            this.bottomPanelHeight,
        );

        this.createDiceDisplay();
        this.createDebugButton();

        // Set up socket listeners
        this.setupSocketListeners();
    }

    setupSocketListeners() {
        if (!this.socket) {
            console.error(
                "UIScene: No socket available in setupSocketListeners!",
            );
            return;
        }

        console.log(
            "UIScene: Setting up socket listeners with socket:",
            this.socket.id,
        );

        this.socket.on("playersUpdate", (players) => {
            console.log(
                "UIScene received playersUpdate:",
                players.length,
                "players",
            );
            this.players = players;
            // Only render if gameListContainer exists (UI is fully initialized)
            if (this.otherPlayersGroup && this.currentPlayerGroup) {
                console.log("UIScene: Rendering players");
                this.renderUI(players);
            } else {
                console.log("UIScene: UI not ready, skipping render");
            }
            if (this.currentDiceData) {
                this.updateDiceDisplay(this.currentDiceData);
            }
        });

        this.socket.on("diceRolled", (data) => {
            this.updateDiceDisplay(data);
            this.showDiceResult(data);
        });

        this.socket.on("turnChanged", (data) => {
            console.log("UIScene received turnChanged:", data);
            this.currentTurnPlayerId = data.currentPlayerId;
            this.turnPhase = data.phase || "roll";
            this.handleTurnChange(data);

            // Re-render UI to show End Turn button now that currentTurnPlayerId is set
            if (this.lastPlayersData) {
                console.log(
                    "Re-rendering UI after turnChanged to show End Turn button",
                );
                this.renderUI(this.lastPlayersData);
            }
        });

        this.socket.on("phaseChanged", (data) => {
            console.log("[PHASE DEBUG] Phase changed to:", data.phase);
            this.turnPhase = data.phase;

            // Clear movement markers when phase changes to 'roll'
            if (data.phase === "roll") {
                console.log(
                    "[PHASE DEBUG] Clearing highlights due to roll phase",
                );
                this.clearHighlights();
            }

            // Destroy popup when phase changes away from 'roll'
            if (data.phase !== "roll" && this.turnPopup) {
                console.log(
                    "Phase changed to",
                    data.phase,
                    "- destroying popup",
                );
                try {
                    // Make it invisible immediately
                    this.turnPopup.setVisible(false);
                    // Manually destroy all children
                    if (this.turnPopup.list) {
                        this.turnPopup.list.forEach((child) => {
                            try {
                                child.destroy();
                            } catch (e) {
                                console.warn("Error destroying child:", e);
                            }
                        });
                    }
                    this.turnPopup.destroy();
                } catch (e) {
                    console.error("Error destroying popup on phase change:", e);
                }
                this.turnPopup = null;
            }
        });

        this.socket.on("gameStarted", () => {
            // Hide start button and waiting message when game starts
            this.hideStartButton();
            this.hideWaitingMessage();

            // Give a moment for everything to initialize, then check if popup needed
            setTimeout(() => {
                if (
                    this.currentTurnPlayerId === this.socket.id &&
                    this.turnPhase === "roll"
                ) {
                    console.log("Showing popup after gameStarted");
                    this.showYourTurnPopup();
                }
            }, 100);
        });

        this.socket.on("targetFunctionCards", (data) => {
            console.log("Received target function cards:", data);
            this.showRootCardSelectionPopup(data);
        });

        this.socket.on("targetCargo", (data) => {
            console.log("Received target cargo:", data);
            this.showCargoSelectionDialog({
                title: `Select cargo to lock on ${data.targetName}`,
                cargo: data.cargo,
                targetPlayerId: data.targetId,
                cardIndex: data.cardIndex,
                cardName: data.cardName,
                allowLocked: false,
            });
        });

        this.socket.on("functionCardPlayed", (data) => {
            console.log("Function card played:", data);
            this.showFunctionCardNotification(data);
        });

        this.scale.on("resize", this.resize, this);
    }

    showDiceResult(data) {
        const name = this.resolvePlayerName(data.playerId) || "Player";
        const resultString = Array.isArray(data.result)
            ? data.result.join(" + ")
            : data.result;
        const sum = Array.isArray(data.result)
            ? data.result.reduce((a, b) => a + b, 0)
            : data.result;

        const text = this.add
            .text(
                this.cameras.main.width / 2,
                this.cameras.main.height / 2,
                `${name} rolled: ${resultString} = ${sum}`,
                {
                    font: "48px Arial",
                    fill: "#ffffff",
                    stroke: "#000000",
                    strokeThickness: 6,
                },
            )
            .setOrigin(0.5);

        this.tweens.add({
            targets: text,
            y: this.cameras.main.height / 2 - 100,
            alpha: 0,
            duration: 2000,
            ease: "Power2",
            onComplete: () => {
                text.destroy();
            },
        });
    }

    showFunctionCardNotification(data) {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2 - 50;

        const container = this.add.container(centerX, centerY).setDepth(3000);

        const bg = this.add.rectangle(0, 0, 500, 120, 0x000000, 0.9);
        bg.setStrokeStyle(3, 0xaa00aa);

        const titleText = this.add
            .text(0, -30, `${data.playerName} played ${data.cardName}`, {
                font: "bold 24px Arial",
                fill: "#AA00AA",
            })
            .setOrigin(0.5);

        const effectText = this.add
            .text(0, 15, data.effectMessage, {
                font: "18px Arial",
                fill: "#ffffff",
                wordWrap: { width: 450 },
            })
            .setOrigin(0.5);

        container.add([bg, titleText, effectText]);

        this.tweens.add({
            targets: container,
            y: centerY - 80,
            alpha: 0,
            duration: 3000,
            ease: "Power2",
            onComplete: () => {
                container.destroy();
            },
        });
    }

    createDiceDisplay() {
        const width = 260;
        const height = 130;
        this.diceDisplaySize = { width, height };
        this.diceContainer = this.add
            .container(0, 0)
            .setScrollFactor(0)
            .setDepth(1000);
        this.diceBackground = this.add.rectangle(
            0,
            0,
            width,
            height,
            0x000000,
            0.6,
        );
        this.diceBackground.setStrokeStyle(2, 0xffffff, 0.4);
        const textMarginX = 14;
        const titleY = -height / 2 + 14;
        const totalY = titleY + 26;
        this.diceTitleText = this.add.text(
            -width / 2 + textMarginX,
            titleY,
            "Dice Roll",
            {
                font: "18px Arial",
                fill: "#ffffff",
            },
        );
        this.diceTotalText = this.add.text(
            -width / 2 + textMarginX,
            totalY,
            "",
            {
                font: "16px Arial",
                fill: "#cccccc",
            },
        );
        const dieOffsetY = 34;
        const dieGap = 70;
        const dieScale = 52;
        const spriteLeft = this.add.image(-dieGap, dieOffsetY, "die1");
        const spriteRight = this.add.image(dieGap, dieOffsetY, "die1");
        spriteLeft.setDisplaySize(dieScale, dieScale);
        spriteRight.setDisplaySize(dieScale, dieScale);
        spriteLeft.setVisible(false);
        spriteRight.setVisible(false);
        this.diceSprites = [spriteLeft, spriteRight];
        this.diceContainer.add([
            this.diceBackground,
            this.diceTitleText,
            this.diceTotalText,
            spriteLeft,
            spriteRight,
        ]);
        this.diceContainer.setVisible(false);
        this.positionDiceDisplay();
    }

    createDebugButton() {
        const btnWidth = 100;
        const btnHeight = 40;
        const margin = 20;

        const debugBtn = this.add.rectangle(
            margin + btnWidth / 2,
            margin + btnHeight / 2,
            btnWidth,
            btnHeight,
            0xff0000,
            0.8,
        );
        debugBtn.setStrokeStyle(2, 0xffffff);
        debugBtn.setInteractive();
        debugBtn.setScrollFactor(0);
        debugBtn.setDepth(1000);

        const debugText = this.add
            .text(margin + btnWidth / 2, margin + btnHeight / 2, "DEBUG", {
                font: "bold 16px Arial",
                fill: "#ffffff",
            })
            .setOrigin(0.5);
        debugText.setScrollFactor(0);
        debugText.setDepth(1001);

        debugBtn.on("pointerover", () => {
            debugBtn.setFillStyle(0xff3333, 1);
        });

        debugBtn.on("pointerout", () => {
            debugBtn.setFillStyle(0xff0000, 0.8);
        });

        debugBtn.on("pointerdown", () => {
            this.showDebugPanel();
        });

        this.debugButton = debugBtn;
        this.debugButtonText = debugText;
    }

    showDebugPanel() {
        if (this.debugPanel) {
            return; // Panel already open
        }

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const panelWidth = Math.min(900, width - 100);
        const panelHeight = Math.min(700, height - 100);

        this.debugPanel = this.add.container(width / 2, height / 2);
        this.debugPanel.setScrollFactor(0);
        this.debugPanel.setDepth(4000);

        // Background overlay
        const overlay = this.add.rectangle(
            0,
            0,
            width * 2,
            height * 2,
            0x000000,
            0.7,
        );
        overlay.setInteractive();

        // Panel background
        const panelBg = this.add.rectangle(
            0,
            0,
            panelWidth,
            panelHeight,
            0x1a1a2e,
        );
        panelBg.setStrokeStyle(4, 0xffffff);

        // Title
        const title = this.add
            .text(0, -panelHeight / 2 + 30, "Debug: Add Function Cards", {
                font: "bold 32px Arial",
                fill: "#ffffff",
            })
            .setOrigin(0.5);

        // Close button
        const closeBtn = this.add.rectangle(
            panelWidth / 2 - 40,
            -panelHeight / 2 + 30,
            60,
            40,
            0xff0000,
        );
        closeBtn.setInteractive();
        closeBtn.on("pointerdown", () => {
            this.debugPanel.destroy();
            this.debugPanel = null;
        });
        closeBtn.on("pointerover", () => closeBtn.setFillStyle(0xff3333));
        closeBtn.on("pointerout", () => closeBtn.setFillStyle(0xff0000));

        const closeText = this.add
            .text(panelWidth / 2 - 40, -panelHeight / 2 + 30, "X", {
                font: "bold 24px Arial",
                fill: "#ffffff",
            })
            .setOrigin(0.5);

        this.debugPanel.add([overlay, panelBg, title, closeBtn, closeText]);

        // All function cards with descriptions
        const functionCards = [
            { name: "Repair Bot", description: "Unlock target player's cargo" },
            { name: "Mishap", description: "Lock out target player's cargo" },
            {
                name: "Rebound",
                description: "Target player returns to the hub",
            },
            {
                name: "Market Shift",
                description:
                    "Change market of any planet with top discard card",
            },
            {
                name: "Hijack",
                description:
                    "Take cargo from player & lock their remaining cargo",
            },
            {
                name: "Upload",
                description: "Place one cargo onto another player's depot",
            },
            {
                name: "Impulse",
                description: "Target shuffles all function cards into deck",
            },
            {
                name: "Expired license",
                description: "Target puts all cargo at bottom of depot",
            },
            {
                name: "Market Regulation",
                description: "Switch any two planetary markets",
            },
            {
                name: "Free Port",
                description: "Play any cargo card on your current planet",
            },
            {
                name: "Hinder",
                description: "Place the black hole where you choose",
            },
            {
                name: "Recall",
                description: "Send player to Hub, fill cargo, no function card",
            },
            {
                name: "Jammer",
                description: "Lock one cargo for each player (including you)",
            },
            {
                name: "Jettison",
                description: "Target shuffles one cargo into discard deck",
            },
            {
                name: "Delivery",
                description: "Target player fills cargo slots from depot",
            },
            {
                name: "Warp",
                description: "Target player moves to a random planet",
            },
            {
                name: "Stealth",
                description: "Move 4 spaces, nothing blocks movement",
            },
            {
                name: "Data Switch",
                description: "Switch cargo cards between any two players",
            },
            {
                name: "Jump",
                description: "Target jumps to any planet of your choice",
            },
            {
                name: "Glitch",
                description: "Draw function card, move up to 10 spaces",
            },
            {
                name: "I.D. Fraud",
                description: "Target loads open cargo slots from your depot",
            },
            {
                name: "Replicator",
                description: "Reveal & play this as any of your function cards",
            },
            {
                name: "Breakdown",
                description: "Target player skips their next turn",
            },
            {
                name: "Root",
                description:
                    "Look at target's function cards, play one as your own",
            },
            {
                name: "EMP",
                description: "All players shuffle function cards into deck",
            },
        ];

        // Create scrollable area with cards
        const cardWidth = 140;
        const cardHeight = 100;
        const cardsPerRow = 5;
        const cardSpacing = 10;
        const startY = -panelHeight / 2 + 80;

        functionCards.forEach((card, index) => {
            const row = Math.floor(index / cardsPerRow);
            const col = index % cardsPerRow;
            const x =
                -((cardsPerRow - 1) * (cardWidth + cardSpacing)) / 2 +
                col * (cardWidth + cardSpacing);
            const y = startY + row * (cardHeight + cardSpacing);

            // Card background
            const cardBg = this.add.rectangle(
                x,
                y,
                cardWidth,
                cardHeight,
                0x663399,
            );
            cardBg.setStrokeStyle(2, 0xaa55dd);
            cardBg.setInteractive();

            // Card name
            const cardName = this.add
                .text(x, y - 30, card.name, {
                    font: "bold 14px Arial",
                    fill: "#ffffff",
                    wordWrap: { width: cardWidth - 10 },
                })
                .setOrigin(0.5);

            // Card description
            const cardDesc = this.add
                .text(x, y + 10, card.description, {
                    font: "10px Arial",
                    fill: "#cccccc",
                    wordWrap: { width: cardWidth - 10 },
                    align: "center",
                })
                .setOrigin(0.5);

            // Click handler
            cardBg.on("pointerdown", () => {
                console.log("Adding function card:", card.name);
                this.socket.emit("debugAddFunctionCard", {
                    cardName: card.name,
                    cardDescription: card.description,
                });

                // Show feedback
                const feedback = this.add
                    .text(x, y, "Added!", {
                        font: "bold 16px Arial",
                        fill: "#00ff00",
                    })
                    .setOrigin(0.5);
                feedback.setScrollFactor(0);
                feedback.setDepth(4001);
                this.debugPanel.add(feedback);

                this.tweens.add({
                    targets: feedback,
                    alpha: 0,
                    y: y - 30,
                    duration: 1000,
                    onComplete: () => feedback.destroy(),
                });
            });

            cardBg.on("pointerover", () => cardBg.setFillStyle(0x8844bb));
            cardBg.on("pointerout", () => cardBg.setFillStyle(0x663399));

            this.debugPanel.add([cardBg, cardName, cardDesc]);
        });
    }

    positionDiceDisplay() {
        if (!this.diceContainer || !this.diceDisplaySize) return;
        const margin = 20;
        const x =
            this.cameras.main.width - margin - this.diceDisplaySize.width / 2;
        const y = margin + this.diceDisplaySize.height / 2;
        this.diceContainer.setPosition(x, y);
    }

    resolvePlayerName(id) {
        if (!this.players) return "";
        const player = this.players.find((p) => p.id === id);
        return player ? player.name : "";
    }

    updateDiceDisplay(data) {
        if (!data || !this.diceContainer) return;
        if (!Array.isArray(data.result)) {
            data.result = [data.result];
        }
        this.currentDiceData = data;
        const name = this.resolvePlayerName(data.playerId) || "Player";
        const total = data.result.reduce((sum, value) => sum + value, 0);
        this.diceTitleText.setText(`${name} rolled`);
        this.diceTotalText.setText(`Total: ${total}`);
        data.result
            .slice(0, this.diceSprites.length)
            .forEach((value, index) => {
                const sprite = this.diceSprites[index];
                if (!sprite) return;
                const faceIndex = Phaser.Math.Clamp(Number(value) || 1, 1, 6);
                sprite.setTexture(`die${faceIndex}`);
                sprite.setVisible(true);
            });
        for (let i = data.result.length; i < this.diceSprites.length; i++) {
            const sprite = this.diceSprites[i];
            if (sprite) sprite.setVisible(false);
        }
        this.diceContainer.setVisible(true);
    }

    resize(gameSize) {
        const width = gameSize.width;
        const height = gameSize.height;

        const isMobile = width < 768;
        const leftPanelWidth = isMobile ? 0 : Math.min(250, width * 0.2);
        const bottomPanelHeight = isMobile
            ? Math.min(200, height * 0.35)
            : Math.min(300, height * 0.4);

        this.isMobile = isMobile;
        this.leftPanelWidth = leftPanelWidth;
        this.bottomPanelHeight = bottomPanelHeight;

        this.cameras.main.setSize(width, height);

        this.leftPanelGraphics.clear();
        if (leftPanelWidth > 0) {
            this.leftPanelGraphics.fillStyle(0x000000, 0.5);
            this.leftPanelGraphics.fillRect(
                0,
                0,
                leftPanelWidth,
                height - bottomPanelHeight,
            );
        }

        this.bottomPanelGraphics.clear();
        this.bottomPanelGraphics.fillStyle(0x222222, 0.9);
        this.bottomPanelGraphics.fillRect(
            0,
            height - bottomPanelHeight,
            width,
            bottomPanelHeight,
        );

        this.positionDiceDisplay();

        if (this.lastPlayersData) {
            this.renderUI(this.lastPlayersData);
        }
    }

    renderUI(players) {
        this.lastPlayersData = players;
        this.otherPlayersGroup.clear(true, true);
        this.currentPlayerGroup.clear(true, true);

        console.log("renderUI called with players:", players);
        console.log("My socket.id:", this.socket.id);
        console.log(
            "Players socketIds:",
            players.map((p) => ({
                name: p.name,
                id: p.id,
                socketId: p.socketId,
            })),
        );

        const currentPlayer = players.find(
            (p) => p.socketId === this.socket.id,
        );
        const otherPlayers = players.filter(
            (p) => p.socketId !== this.socket.id,
        );

        console.log("Current player found:", !!currentPlayer);
        if (currentPlayer) {
            console.log("Current player cargo:", currentPlayer.cargo);
            console.log(
                `[CLIENT DEBUG] Cargo count: ${currentPlayer.cargo.length}, items:`,
                currentPlayer.cargo.map((c) =>
                    c ? `${c.type}-${c.color}` : "empty",
                ),
            );
            console.log("Current player depot:", currentPlayer.depot);
            console.log(
                "Current player functionCards:",
                currentPlayer.functionCards,
            );
        }

        this.renderOtherPlayers(otherPlayers);
        if (currentPlayer) {
            this.renderCurrentPlayer(currentPlayer);
        } else {
            console.warn("No current player found to render!");
        }
    }

    renderOtherPlayers(players) {
        let y = 50;
        const startX = 10;

        players.forEach((player) => {
            // Player Name
            const nameText = this.add.text(startX, y, player.name, {
                font: "16px Arial",
                fill: player.color,
            });
            this.otherPlayersGroup.add(nameText);
            y += 25;

            // Cargo Cards (3 slots)
            for (let i = 0; i < 3; i++) {
                const cardX = startX + i * 35;
                const cardY = y;

                const card = this.add.rectangle(
                    cardX + 15,
                    cardY + 20,
                    30,
                    40,
                    0xffffff,
                );
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
            const depotCard = this.add.rectangle(
                depotX,
                depotY,
                30,
                40,
                0x888888,
            );
            depotCard.setStrokeStyle(1, 0x000000);
            this.otherPlayersGroup.add(depotCard);

            const countText = this.add.text(
                depotX - 5,
                depotY - 10,
                player.depot.length.toString(),
                {
                    font: "14px Arial",
                    fill: "#000000",
                },
            );
            this.otherPlayersGroup.add(countText);

            y += 60;
        });
    }

    renderCurrentPlayer(player) {
        const bottomPanelHeight = this.bottomPanelHeight || 300;
        const panelY = this.cameras.main.height - bottomPanelHeight;
        const centerY = panelY + bottomPanelHeight / 2;
        const screenWidth = this.cameras.main.width;

        // Responsive card sizing
        const scaleFactor = this.isMobile ? 0.6 : 1;
        const cardWidth = 100 * scaleFactor;
        const cardHeight = 150 * scaleFactor;
        const spacing = 15 * scaleFactor;
        const sectionSpacing = 40 * scaleFactor;

        const cargoSectionWidth = 3 * cardWidth + 2 * spacing;
        const depotSectionWidth = cardWidth;
        const funcCardWidth = cardWidth * 1.5; // Function cards are scaled by 1.5
        const funcSectionWidth =
            player.functionCards.length * funcCardWidth +
            (player.functionCards.length - 1) * spacing;

        const totalWidth =
            cargoSectionWidth +
            sectionSpacing +
            depotSectionWidth +
            sectionSpacing +
            (funcSectionWidth > 0 ? funcSectionWidth : 100);

        let currentX = (screenWidth - totalWidth) / 2;

        // Check if player is on a planet
        const gameScene = this.scene.get("GameScene");
        let isOnPlanet = false;
        let currentPlanetMarket = null;
        let playerPlanetQ = null;
        let playerPlanetR = null;

        if (
            player.ship &&
            gameScene &&
            gameScene.tileData &&
            gameScene.planetMarkets
        ) {
            const { q, r } = player.ship.position;
            const posKey = `${q},${r}`;

            if (gameScene.planetMarkets.has(posKey)) {
                isOnPlanet = true;
                playerPlanetQ = q;
                playerPlanetR = r;
                currentPlanetMarket = gameScene.planetMarkets.get(posKey);
            }
        }

        // Section Title: Cargo
        const cargoTitle = isOnPlanet
            ? "My Cargo (Click to Deliver)"
            : "My Cargo";
        this.currentPlayerGroup.add(
            this.add.text(currentX, panelY + 20, cargoTitle, {
                font: "24px Arial",
                fill: isOnPlanet ? "#00ff00" : "#ffffff",
            }),
        );

        // Render Cargo Cards (Larger)
        for (let i = 0; i < 3; i++) {
            const cardX = currentX + cardWidth / 2 + i * (cardWidth + spacing);
            const cardY = centerY + 20;

            const card = this.add.rectangle(
                cardX,
                cardY,
                cardWidth,
                cardHeight,
                0xffffff,
            );
            card.setStrokeStyle(2, 0x000000);
            this.currentPlayerGroup.add(card);

            if (player.cargo[i]) {
                const cargoCard = player.cargo[i];
                const c = this.getColorHex(cargoCard.color);
                card.fillColor = c;
                const typeText = this.add.text(
                    cardX - 40,
                    cardY - 20,
                    cargoCard.type,
                    { font: "16px Arial", fill: "#000000" },
                );
                this.currentPlayerGroup.add(typeText);

                if (cargoCard.locked) {
                    const lockIcon = this.add
                        .text(cardX, cardY + 40, "LOCKED", {
                            font: "bold 12px Arial",
                            fill: "#ff0000",
                        })
                        .setOrigin(0.5);
                    this.currentPlayerGroup.add(lockIcon);
                }

                if (isOnPlanet && !cargoCard.locked && currentPlanetMarket) {
                    const market = currentPlanetMarket;
                    const colorMatch =
                        cargoCard.color === market.color ||
                        cargoCard.color === "wild" ||
                        market.color === "wild";
                    const typeMatch =
                        cargoCard.type === market.type ||
                        cargoCard.type === "wild" ||
                        market.type === "wild";
                    const canDeliver = colorMatch || typeMatch;
                    const exactMatch =
                        cargoCard.color === market.color &&
                        cargoCard.type === market.type;

                    if (canDeliver) {
                        card.setInteractive();
                        card.setStrokeStyle(
                            4,
                            exactMatch ? 0xffd700 : 0x00ff00,
                        );

                        const deliverText = this.add
                            .text(
                                cardX,
                                cardY + 55,
                                exactMatch ? "EXACT!" : "Deliver",
                                {
                                    font: "bold 14px Arial",
                                    fill: exactMatch ? "#FFD700" : "#00FF00",
                                },
                            )
                            .setOrigin(0.5);
                        this.currentPlayerGroup.add(deliverText);

                        const cargoIndex = i;
                        card.on("pointerdown", () => {
                            this.socket.emit("deliverCargo", {
                                planetQ: playerPlanetQ,
                                planetR: playerPlanetR,
                                cargoIndex: cargoIndex,
                            });
                        });

                        card.on("pointerover", () =>
                            card.setStrokeStyle(6, 0xffffff),
                        );
                        card.on("pointerout", () =>
                            card.setStrokeStyle(
                                4,
                                exactMatch ? 0xffd700 : 0x00ff00,
                            ),
                        );
                    }
                }
            } else {
                card.fillColor = 0x333333;
            }
        }

        if (isOnPlanet && currentPlanetMarket) {
            const marketInfoX = currentX + cargoSectionWidth / 2;
            const marketInfoY = panelY + 55;
            const colorMap = {
                red: 0xff0000,
                blue: 0x0000ff,
                green: 0x00ff00,
                yellow: 0xffff00,
                wild: 0xffffff,
            };
            const marketColor = colorMap[currentPlanetMarket.color] || 0xffffff;

            const marketBg = this.add.rectangle(
                marketInfoX,
                marketInfoY,
                200,
                30,
                0x000000,
                0.7,
            );
            marketBg.setStrokeStyle(2, marketColor);
            this.currentPlayerGroup.add(marketBg);

            const marketText = this.add
                .text(
                    marketInfoX,
                    marketInfoY,
                    `Market: ${currentPlanetMarket.type} / ${currentPlanetMarket.color}`,
                    {
                        font: "14px Arial",
                        fill: "#ffffff",
                    },
                )
                .setOrigin(0.5);
            this.currentPlayerGroup.add(marketText);
        }

        currentX += cargoSectionWidth + sectionSpacing;

        // Section Title: Depot
        this.currentPlayerGroup.add(
            this.add.text(currentX, panelY + 20, "My Depot", {
                font: "24px Arial",
                fill: "#ffffff",
            }),
        );

        const depotCardX = currentX + cardWidth / 2;
        const depotCardY = centerY + 20;
        const depotCard = this.add.rectangle(
            depotCardX,
            depotCardY,
            cardWidth,
            cardHeight,
            0x888888,
        );
        depotCard.setStrokeStyle(2, 0x000000);
        this.currentPlayerGroup.add(depotCard);

        const depotCount = this.add.text(
            depotCardX - 15,
            depotCardY - 15,
            player.depot.length.toString(),
            { font: "32px Arial", fill: "#000000" },
        );
        this.currentPlayerGroup.add(depotCount);

        currentX += depotSectionWidth + sectionSpacing;

        // Section Title: Function Cards
        this.currentPlayerGroup.add(
            this.add.text(currentX, panelY + 20, "Function Cards", {
                font: "24px Arial",
                fill: "#ffffff",
            }),
        );

        player.functionCards.forEach((card, index) => {
            // Determine if this card requires a target player
            const cardsRequiringTarget = [
                "Repair Bot",
                "Mishap",
                "Rebound",
                "Recall",
                "Impulse",
                "Expired license",
                "Delivery",
                "Hijack",
                "Upload",
                "Warp",
                "Jump",
                "Breakdown",
                "I.D. Fraud",
                "Data Switch",
                "Jettison",
                "Jammer",
            ];
            card.requiresTarget = cardsRequiringTarget.includes(card.name);

            const funcCardWidth = cardWidth * 1.5;
            const cardX =
                currentX +
                funcCardWidth / 2 +
                index * (funcCardWidth + spacing);
            const cardY = centerY + 20;

            // Use function_card.png as background
            const cardImage = this.add
                .image(cardX, cardY, "function_card")
                .setInteractive();
            cardImage.setDisplaySize(cardWidth * 1.5, cardHeight * 1.5);
            this.currentPlayerGroup.add(cardImage);

            // Add title in the top box
            const nameText = this.add
                .text(cardX, cardY - 52, card.name, {
                    font: "bold 14px Arial",
                    fill: "#ffffff",
                    wordWrap: { width: 128 },
                    align: "center",
                })
                .setOrigin(0.5);
            this.currentPlayerGroup.add(nameText);

            // Add hover popup with title and description
            let hoverPopup = null;
            let hoverLine = null;
            cardImage.on("pointerover", () => {
                // Show popup even without description (just show card name)
                const popupWidth = 200;
                const popupHeight = card.description ? 120 : 60;
                const popupX = cardX;
                const popupY =
                    cardY - (cardHeight * 1.5) / 2 - popupHeight / 2 - 30;

                hoverPopup = this.add.container(popupX, popupY);

                // Background
                const bg = this.add.rectangle(
                    0,
                    0,
                    popupWidth,
                    popupHeight,
                    0x000000,
                    0.95,
                );
                bg.setStrokeStyle(3, 0xffffff);
                hoverPopup.add(bg);

                // Title
                const titleText = this.add
                    .text(
                        0,
                        card.description ? -popupHeight / 2 + 15 : 0,
                        card.name,
                        {
                            font: "bold 16px Arial",
                            fill: "#FFD700",
                            wordWrap: { width: popupWidth - 20 },
                            align: "center",
                        },
                    )
                    .setOrigin(0.5);
                hoverPopup.add(titleText);

                // Description (if it exists)
                if (card.description) {
                    const descText = this.add
                        .text(0, -popupHeight / 2 + 45, card.description, {
                            font: "14px Arial",
                            fill: "#ffffff",
                            wordWrap: { width: popupWidth - 20 },
                            align: "center",
                        })
                        .setOrigin(0.5, 0);
                    hoverPopup.add(descText);
                }

                hoverPopup.setDepth(3000);
                this.currentPlayerGroup.add(hoverPopup);

                // Draw line from popup to card
                hoverLine = this.add.graphics();
                hoverLine.lineStyle(2, 0xffffff, 1);
                hoverLine.beginPath();
                hoverLine.moveTo(popupX, popupY + popupHeight / 2);
                hoverLine.lineTo(cardX, cardY - (cardHeight * 1.5) / 2);
                hoverLine.strokePath();
                hoverLine.setDepth(2999);
                this.currentPlayerGroup.add(hoverLine);
            });
            cardImage.on("pointerout", () => {
                if (hoverPopup) {
                    hoverPopup.destroy();
                    hoverPopup = null;
                }
                if (hoverLine) {
                    hoverLine.destroy();
                    hoverLine = null;
                }
            });
        });

        // Moves Text (Right side of bottom panel)
        const btnX = screenWidth - 100;
        const btnY = centerY - 20;

        const movesText = this.add
            .text(btnX, btnY, `Moves: ${player.movesLeft || 0}`, {
                font: "18px Arial",
                fill: "#ffffff",
            })
            .setOrigin(0.5);
        this.currentPlayerGroup.add(movesText);

        // End Turn Button (only show if it's this player's turn)
        console.log("[END TURN BUTTON DEBUG] Checking conditions:");
        console.log("  this.currentTurnPlayerId:", this.currentTurnPlayerId);
        console.log("  this.socket.id:", this.socket.id);
        console.log("  Match?", this.currentTurnPlayerId === this.socket.id);

        if (this.currentTurnPlayerId === this.socket.id) {
            console.log("[END TURN BUTTON] Creating End Turn button");
            const endTurnBtn = this.add
                .rectangle(btnX, btnY + 50, 120, 50, 0x884444)
                .setInteractive();
            endTurnBtn.setStrokeStyle(2, 0xffffff);
            this.currentPlayerGroup.add(endTurnBtn);

            const endTurnText = this.add
                .text(btnX, btnY + 50, "End Turn", {
                    font: "20px Arial",
                    fill: "#ffffff",
                })
                .setOrigin(0.5);
            this.currentPlayerGroup.add(endTurnText);

            endTurnBtn.on("pointerdown", () => {
                this.socket.emit("endTurn");
            });

            endTurnBtn.on(
                "pointerover",
                () => (endTurnBtn.fillColor = 0xaa6666),
            );
            endTurnBtn.on(
                "pointerout",
                () => (endTurnBtn.fillColor = 0x884444),
            );
        } else {
            console.log("[END TURN BUTTON] Not my turn, skipping button");
        }
    }

    getColorHex(colorName) {
        const colorMap = {
            red: 0xff0000,
            blue: 0x0000ff,
            green: 0x00ff00,
            yellow: 0xffff00,
            wild: 0xffffff,
        };
        return colorMap[colorName] || 0x888888;
    }

    handleTurnChange(data) {
        const isMyTurn = data.currentPlayerId === this.socket.id;
        console.log(
            "handleTurnChange - isMyTurn:",
            isMyTurn,
            "my id:",
            this.socket.id,
            "current:",
            data.currentPlayerId,
        );

        // Destroy existing turn popup if any
        if (this.turnPopup) {
            this.turnPopup.destroy();
            this.turnPopup = null;
        }

        // Destroy existing turn indicator if any
        if (this.turnIndicatorText) {
            this.turnIndicatorText.destroy();
            this.turnIndicatorText = null;
        }

        if (isMyTurn) {
            console.log("Calling showYourTurnPopup");
            this.showYourTurnPopup();
        } else {
            this.showTurnIndicator(data.currentPlayerName);
        }
    }

    showYourTurnPopup() {
        console.log("showYourTurnPopup called, phase:", this.turnPhase);
        // Only show popup if in roll phase
        if (this.turnPhase !== "roll") {
            console.log("Not showing popup - not in roll phase");
            return;
        }

        // Don't create a new popup if one already exists
        if (this.turnPopup) {
            console.log("Popup already exists, not creating a new one");
            return;
        }

        console.log("Creating popup!");
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        // Get current player's function cards
        const myPlayer = this.players.find(
            (p) => p.socketId === this.socket.id,
        );
        const functionCards = myPlayer ? myPlayer.functionCards : [];

        // Calculate popup height based on whether there are function cards
        const popupHeight = functionCards.length > 0 ? 450 : 300;

        // Calculate popup width based on number of function cards
        const baseWidth = 600;
        const cardTotalWidth =
            functionCards.length > 0 ? functionCards.length * 110 + 40 : 0; // 100 card + 10 spacing
        const popupWidth = Math.max(baseWidth, cardTotalWidth);

        this.turnPopup = this.add
            .container(centerX, centerY)
            .setScrollFactor(0)
            .setDepth(2000);

        // Background - non-interactive so clicks pass through to buttons/cards
        const bg = this.add.rectangle(
            0,
            0,
            popupWidth,
            popupHeight,
            0x000000,
            0.9,
        );
        bg.setStrokeStyle(4, 0xffffff);
        // Don't make background interactive - let clicks go to the buttons/cards

        // Title text
        const titleText = this.add
            .text(0, -popupHeight / 2 + 40, "Your Turn!", {
                font: "bold 48px Arial",
                fill: "#ffffff",
            })
            .setOrigin(0.5);

        // Roll Dice Button
        const btnY = functionCards.length > 0 ? -80 : 20;
        const btn = this.add
            .rectangle(0, btnY, 200, 80, 0x444444)
            .setInteractive();
        btn.setStrokeStyle(3, 0xffffff);

        const btnText = this.add
            .text(0, btnY, "Roll Dice", {
                font: "bold 32px Arial",
                fill: "#ffffff",
            })
            .setOrigin(0.5);

        btn.on("pointerdown", () => {
            console.log(
                "Roll Dice button clicked, popup exists:",
                !!this.turnPopup,
            );
            // Disable the button immediately to prevent double-clicks
            btn.setInteractive(false);
            if (this.turnPopup) {
                console.log("Attempting to destroy popup");
                // Make popup invisible immediately
                this.turnPopup.setVisible(false);
                try {
                    // Manually destroy all children
                    if (this.turnPopup.list) {
                        this.turnPopup.list.forEach((child) => {
                            try {
                                child.destroy();
                            } catch (e) {
                                console.warn("Error destroying child:", e);
                            }
                        });
                    }
                    this.turnPopup.destroy();
                    console.log(
                        "Popup and all children destroyed successfully",
                    );
                } catch (e) {
                    console.error("Error destroying popup:", e);
                }
                this.turnPopup = null;
            } else {
                console.warn("turnPopup was null when trying to destroy");
            }
            this.socket.emit("rollDice");
        });

        btn.on("pointerover", () => (btn.fillColor = 0x666666));
        btn.on("pointerout", () => (btn.fillColor = 0x444444));

        const elements = [bg, titleText, btn, btnText];

        // Add all elements to the container
        elements.forEach((el) => this.turnPopup.add(el));

        // Add function cards if any
        if (functionCards.length > 0) {
            const orText = this.add
                .text(0, 20, "- OR -", {
                    font: "bold 24px Arial",
                    fill: "#888888",
                })
                .setOrigin(0.5);
            this.turnPopup.add(orText);

            const cardLabel = this.add
                .text(0, 60, "Play a Function Card:", {
                    font: "20px Arial",
                    fill: "#ffffff",
                })
                .setOrigin(0.5);
            this.turnPopup.add(cardLabel);

            const cardWidth = 100;
            const cardHeight = 120;
            const cardSpacing = 10;
            const totalWidth =
                functionCards.length * (cardWidth + cardSpacing) - cardSpacing;
            const startX = -totalWidth / 2 + cardWidth / 2;

            console.log(
                "Rendering function cards in popup:",
                functionCards.length,
                "cards, startX:",
                startX,
                "totalWidth:",
                totalWidth,
            );

            functionCards.forEach((card, index) => {
                try {
                    const cardX = startX + index * (cardWidth + cardSpacing);
                    const cardY = 150;
                    console.log(
                        "Card",
                        index,
                        card.name,
                        "at position",
                        cardX,
                        cardY,
                    );

                    // Use function_card.png as background
                    const cardImage = this.add
                        .image(cardX, cardY, "function_card")
                        .setInteractive();
                    cardImage.setDisplaySize(cardWidth, cardHeight);
                    this.turnPopup.add(cardImage);
                    console.log("Card", index, "image added to container");

                    // Add title in the top box
                    const nameText = this.add
                        .text(cardX, cardY - 35, card.name, {
                            font: "bold 12px Arial",
                            fill: "#ffffff",
                            wordWrap: { width: 85 },
                            align: "center",
                        })
                        .setOrigin(0.5);
                    this.turnPopup.add(nameText);

                    // Add hover popup with title and description
                    let hoverPopup = null;
                    let hoverLine = null;
                    cardImage.on("pointerover", () => {
                        if (card.description) {
                            // Create popup container
                            const popupWidth = 220;
                            const popupHeight = 130;
                            const popupX = cardX;
                            const popupY =
                                cardY - cardHeight / 2 - popupHeight / 2 - 20;

                            hoverPopup = this.add.container(popupX, popupY);

                            // Background
                            const bg = this.add.rectangle(
                                0,
                                0,
                                popupWidth,
                                popupHeight,
                                0x000000,
                                0.95,
                            );
                            bg.setStrokeStyle(3, 0xffffff);
                            hoverPopup.add(bg);

                            // Title
                            const titleText = this.add
                                .text(0, -popupHeight / 2 + 15, card.name, {
                                    font: "bold 16px Arial",
                                    fill: "#FFD700",
                                    wordWrap: { width: popupWidth - 20 },
                                    align: "center",
                                })
                                .setOrigin(0.5, 0);
                            hoverPopup.add(titleText);

                            // Description
                            const descText = this.add
                                .text(
                                    0,
                                    -popupHeight / 2 + 45,
                                    card.description,
                                    {
                                        font: "14px Arial",
                                        fill: "#ffffff",
                                        wordWrap: { width: popupWidth - 20 },
                                        align: "center",
                                    },
                                )
                                .setOrigin(0.5, 0);
                            hoverPopup.add(descText);

                            hoverPopup.setDepth(6000);
                            this.turnPopup.add(hoverPopup);

                            // Draw line from popup to card
                            hoverLine = this.add.graphics();
                            hoverLine.lineStyle(2, 0xffffff, 1);
                            hoverLine.beginPath();
                            hoverLine.moveTo(popupX, popupY + popupHeight / 2);
                            hoverLine.lineTo(cardX, cardY - cardHeight / 2);
                            hoverLine.strokePath();
                            hoverLine.setDepth(5999);
                            this.turnPopup.add(hoverLine);
                        }
                    });
                    cardImage.on("pointerout", () => {
                        if (hoverPopup) {
                            hoverPopup.destroy();
                            hoverPopup = null;
                        }
                        if (hoverLine) {
                            hoverLine.destroy();
                            hoverLine = null;
                        }
                    });

                    cardImage.on("pointerdown", () => {
                        console.log(
                            "Function card clicked:",
                            card.name,
                            "index:",
                            index,
                            "requires target:",
                            card.requiresTarget,
                        );
                        // Disable the card immediately to prevent double-clicks
                        cardImage.setInteractive(false);

                        // Check if this card requires a target
                        if (card.requiresTarget) {
                            // Show player selection dialog
                            this.showPlayerSelectionDialog(card, index);
                        } else if (card.name === "Free Port") {
                            // Free Port needs cargo selection from own cargo and must be on a planet
                            const gameScene = this.scene.get("GameScene");
                            const myPlayer =
                                gameScene && gameScene.players
                                    ? gameScene.players.find(
                                          (p) => p.socketId === this.socket.id,
                                      )
                                    : null;

                            // Check if player is on a planet
                            if (
                                !myPlayer ||
                                !myPlayer.ship ||
                                !myPlayer.ship.position
                            ) {
                                this.showNotification(
                                    "Free Port can only be played when on a planet",
                                    0xff0000,
                                );
                                return;
                            }

                            const playerPos = myPlayer.ship.position;
                            const posKey = `${playerPos.q},${playerPos.r}`;
                            const isOnPlanet =
                                gameScene.planetSprites &&
                                gameScene.planetSprites.has(posKey);

                            if (!isOnPlanet) {
                                this.showNotification(
                                    "Free Port can only be played when on a planet",
                                    0xff0000,
                                );
                                return;
                            }

                            if (this.turnPopup) {
                                this.turnPopup.setVisible(false);
                                try {
                                    if (this.turnPopup.list) {
                                        this.turnPopup.list.forEach((child) => {
                                            try {
                                                child.destroy();
                                            } catch (e) {}
                                        });
                                    }
                                    this.turnPopup.destroy();
                                } catch (e) {}
                                this.turnPopup = null;
                            }

                            if (myPlayer.cargo && myPlayer.cargo.length > 0) {
                                this.showCargoSelectionDialog({
                                    title: "Select cargo to deliver via Free Port",
                                    cargo: myPlayer.cargo,
                                    targetPlayerId: this.socket.id,
                                    cardIndex: index,
                                    cardName: card.name,
                                    allowLocked: false,
                                });
                            } else {
                                this.socket.emit("playFunctionCard", {
                                    cardIndex: index,
                                    targetId: null,
                                });
                            }
                        } else if (card.name === "Replicator") {
                            // Replicator needs to select one of your own function cards to copy
                            if (this.turnPopup) {
                                this.turnPopup.setVisible(false);
                                try {
                                    if (this.turnPopup.list) {
                                        this.turnPopup.list.forEach((child) => {
                                            try {
                                                child.destroy();
                                            } catch (e) {}
                                        });
                                    }
                                    this.turnPopup.destroy();
                                } catch (e) {}
                                this.turnPopup = null;
                            }
                            this.showReplicatorCardSelection(index);
                        } else if (card.name === "Market Regulation") {
                            // Market Regulation needs to select two planets to swap markets
                            if (this.turnPopup) {
                                this.turnPopup.setVisible(false);
                                try {
                                    if (this.turnPopup.list) {
                                        this.turnPopup.list.forEach((child) => {
                                            try {
                                                child.destroy();
                                            } catch (e) {}
                                        });
                                    }
                                    this.turnPopup.destroy();
                                } catch (e) {}
                                this.turnPopup = null;
                            }
                            this.showMarketRegulationSelection(index);
                        } else {
                            // Play the card immediately without target
                            if (this.turnPopup) {
                                console.log("Attempting to destroy popup");
                                this.turnPopup.setVisible(false);
                                try {
                                    if (this.turnPopup.list) {
                                        this.turnPopup.list.forEach((child) => {
                                            try {
                                                child.destroy();
                                            } catch (e) {
                                                console.warn(
                                                    "Error destroying child:",
                                                    e,
                                                );
                                            }
                                        });
                                    }
                                    this.turnPopup.destroy();
                                    console.log(
                                        "Popup and all children destroyed successfully",
                                    );
                                } catch (e) {
                                    console.error("Error destroying popup:", e);
                                }
                                this.turnPopup = null;
                            }
                            this.socket.emit("playFunctionCard", {
                                cardIndex: index,
                                targetId: null,
                            });
                        }
                    });
                } catch (error) {
                    console.error(
                        "Error creating function card",
                        index,
                        ":",
                        error,
                    );
                }
            });
        }
    }

    showPlayerSelectionDialog(card, cardIndex) {
        // Close the turn popup first
        if (this.turnPopup) {
            this.turnPopup.setVisible(false);
            try {
                if (this.turnPopup.list) {
                    this.turnPopup.list.forEach((child) => {
                        try {
                            child.destroy();
                        } catch (e) {
                            console.warn("Error destroying child:", e);
                        }
                    });
                }
                this.turnPopup.destroy();
            } catch (e) {
                console.error("Error destroying popup:", e);
            }
            this.turnPopup = null;
        }

        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        this.playerSelectionPopup = this.add.container(centerX, centerY);

        const bg = this.add.rectangle(0, 0, 500, 400, 0x000000, 0.9);
        bg.setStrokeStyle(4, 0xffffff);

        const titleText = this.add
            .text(0, -160, `Playing: ${card.name}`, {
                font: "bold 28px Arial",
                fill: "#ffffff",
            })
            .setOrigin(0.5);

        const descText = this.add
            .text(0, -120, card.description, {
                font: "16px Arial",
                fill: "#aaaaaa",
                wordWrap: { width: 450 },
                align: "center",
            })
            .setOrigin(0.5);

        const selectText = this.add
            .text(0, -60, "Select Target Player:", {
                font: "bold 20px Arial",
                fill: "#ffffff",
            })
            .setOrigin(0.5);

        const elements = [bg, titleText, descText, selectText];

        // Get all players from gameScene
        const gameScene = this.scene.get("GameScene");
        const players = gameScene ? gameScene.players : [];

        // Display player buttons
        const buttonWidth = 200;
        const buttonHeight = 50;
        const startY = -20;
        const spacing = 10;

        players.forEach((player, index) => {
            const btnY = startY + index * (buttonHeight + spacing);
            const isMe = player.id === this.socket.id;
            const btnColor = isMe ? 0x4444aa : 0x444444;

            const playerBtn = this.add
                .rectangle(0, btnY, buttonWidth, buttonHeight, btnColor)
                .setInteractive();
            playerBtn.setStrokeStyle(2, 0xffffff);

            // Add colored pawn indicator next to player name
            const pawnSize = 12;
            const pawnX = -buttonWidth / 2 + 20;
            const playerColor = player.color
                ? parseInt(player.color.substring(1), 16)
                : 0xff6b6b;
            const pawnGraphics = this.add.graphics();
            pawnGraphics.fillStyle(playerColor, 1);
            pawnGraphics.fillCircle(pawnX, btnY, pawnSize);
            pawnGraphics.lineStyle(2, 0xffffff);
            pawnGraphics.strokeCircle(pawnX, btnY, pawnSize);

            const playerText = this.add
                .text(
                    pawnX + 25,
                    btnY,
                    `${player.name}${isMe ? " (You)" : ""}`,
                    {
                        font: "18px Arial",
                        fill: "#ffffff",
                    },
                )
                .setOrigin(0, 0.5);

            playerBtn.on("pointerdown", () => {
                console.log("Target player selected:", player.name, player.id);
                // Close the player selection popup
                if (this.playerSelectionPopup) {
                    this.playerSelectionPopup.destroy();
                    this.playerSelectionPopup = null;
                }

                // Special handling for Root card
                if (card.name === "Root") {
                    // Request target player's function cards
                    this.socket.emit("requestTargetFunctionCards", {
                        targetId: player.id,
                        rootCardIndex: cardIndex,
                    });
                } else if (card.name === "Jammer") {
                    // Request target player's cargo for Jammer
                    this.socket.emit("requestTargetCargo", {
                        targetId: player.id,
                        cardIndex: cardIndex,
                        cardName: card.name,
                    });
                } else {
                    // Play the card with the selected target
                    this.socket.emit("playFunctionCard", {
                        cardIndex: cardIndex,
                        targetId: player.id,
                    });
                }
            });

            playerBtn.on(
                "pointerover",
                () => (playerBtn.fillColor = isMe ? 0x6666cc : 0x666666),
            );
            playerBtn.on("pointerout", () => (playerBtn.fillColor = btnColor));

            elements.push(playerBtn, playerText, pawnGraphics);
        });

        // Add cancel button
        const cancelBtn = this.add
            .rectangle(
                0,
                startY + players.length * (buttonHeight + spacing) + 20,
                150,
                40,
                0x884444,
            )
            .setInteractive();
        cancelBtn.setStrokeStyle(2, 0xffffff);
        const cancelText = this.add
            .text(
                0,
                startY + players.length * (buttonHeight + spacing) + 20,
                "Cancel",
                {
                    font: "18px Arial",
                    fill: "#ffffff",
                },
            )
            .setOrigin(0.5);

        cancelBtn.on("pointerdown", () => {
            if (this.playerSelectionPopup) {
                this.playerSelectionPopup.destroy();
                this.playerSelectionPopup = null;
            }
            // Re-show the turn popup
            this.showYourTurnPopup();
        });

        cancelBtn.on("pointerover", () => (cancelBtn.fillColor = 0xaa6666));
        cancelBtn.on("pointerout", () => (cancelBtn.fillColor = 0x884444));

        elements.push(cancelBtn, cancelText);

        this.playerSelectionPopup.add(elements);
        this.playerSelectionPopup.setDepth(6000);
    }

    showCargoSelectionDialog(options) {
        const {
            title,
            cargo,
            targetPlayerId,
            cardIndex,
            cardName,
            onSelect,
            allowLocked = true,
        } = options;

        if (this.cargoSelectionPopup) {
            this.cargoSelectionPopup.destroy();
            this.cargoSelectionPopup = null;
        }

        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        this.cargoSelectionPopup = this.add.container(centerX, centerY);

        const popupHeight = Math.max(300, 150 + cargo.length * 70);
        const bg = this.add.rectangle(0, 0, 450, popupHeight, 0x000000, 0.95);
        bg.setStrokeStyle(4, 0x00aaff);

        const titleText = this.add
            .text(0, -popupHeight / 2 + 30, title, {
                font: "bold 24px Arial",
                fill: "#00AAFF",
            })
            .setOrigin(0.5);

        const elements = [bg, titleText];

        if (cargo.length === 0) {
            const noCargoText = this.add
                .text(0, 0, "No cargo available", {
                    font: "18px Arial",
                    fill: "#888888",
                })
                .setOrigin(0.5);
            elements.push(noCargoText);
        } else {
            const cardWidth = 380;
            const cardHeight = 50;
            const startY = -popupHeight / 2 + 80;
            const spacing = 10;

            cargo.forEach((cargoCard, index) => {
                const cardY = startY + index * (cardHeight + spacing);
                const isLocked = cargoCard.locked;
                const isSelectable = allowLocked || !isLocked;
                const cardColor = isLocked ? 0x664444 : 0x446644;

                const cargoRect = this.add.rectangle(
                    0,
                    cardY,
                    cardWidth,
                    cardHeight,
                    cardColor,
                );
                if (isSelectable) {
                    cargoRect.setInteractive();
                }
                cargoRect.setStrokeStyle(2, isLocked ? 0xff4444 : 0x44ff44);

                const cargoName =
                    cargoCard.name || cargoCard.type || `Cargo ${index + 1}`;
                const lockStatus = isLocked ? " [LOCKED]" : "";
                const cargoText = this.add
                    .text(0, cardY, `${cargoName}${lockStatus}`, {
                        font: "16px Arial",
                        fill: isSelectable ? "#ffffff" : "#888888",
                    })
                    .setOrigin(0.5);

                if (isSelectable) {
                    cargoRect.on("pointerdown", () => {
                        console.log(
                            "Cargo selected:",
                            index,
                            "targetPlayerId:",
                            targetPlayerId,
                            "cardIndex:",
                            cardIndex,
                        );
                        if (this.cargoSelectionPopup) {
                            this.cargoSelectionPopup.destroy();
                            this.cargoSelectionPopup = null;
                        }
                        if (onSelect) {
                            onSelect(index, cargoCard);
                        } else {
                            console.log(
                                "Emitting playFunctionCard with targetId:",
                                targetPlayerId,
                                "cargoIndex:",
                                index,
                            );
                            this.socket.emit("playFunctionCard", {
                                cardIndex: cardIndex,
                                targetId: targetPlayerId,
                                cargoIndex: index,
                            });
                        }
                    });

                    cargoRect.on(
                        "pointerover",
                        () =>
                            (cargoRect.fillColor = isLocked
                                ? 0x885555
                                : 0x558855),
                    );
                    cargoRect.on(
                        "pointerout",
                        () => (cargoRect.fillColor = cardColor),
                    );
                }

                elements.push(cargoRect, cargoText);
            });
        }

        const cancelY = popupHeight / 2 - 40;
        const cancelBtn = this.add
            .rectangle(0, cancelY, 150, 40, 0x884444)
            .setInteractive();
        cancelBtn.setStrokeStyle(2, 0xffffff);
        const cancelText = this.add
            .text(0, cancelY, "Cancel", {
                font: "18px Arial",
                fill: "#ffffff",
            })
            .setOrigin(0.5);

        cancelBtn.on("pointerdown", () => {
            if (this.cargoSelectionPopup) {
                this.cargoSelectionPopup.destroy();
                this.cargoSelectionPopup = null;
            }
            this.showYourTurnPopup();
        });

        cancelBtn.on("pointerover", () => (cancelBtn.fillColor = 0xaa6666));
        cancelBtn.on("pointerout", () => (cancelBtn.fillColor = 0x884444));

        elements.push(cancelBtn, cancelText);

        this.cargoSelectionPopup.add(elements);
        this.cargoSelectionPopup.setDepth(7000);
    }

    showReplicatorCardSelection(replicatorCardIndex) {
        const gameScene = this.scene.get("GameScene");
        const myPlayer =
            gameScene && gameScene.players
                ? gameScene.players.find((p) => p.socketId === this.socket.id)
                : null;

        if (
            !myPlayer ||
            !myPlayer.functionCards ||
            myPlayer.functionCards.length <= 1
        ) {
            this.socket.emit("playFunctionCard", {
                cardIndex: replicatorCardIndex,
                targetId: null,
            });
            return;
        }

        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        if (this.replicatorPopup) {
            this.replicatorPopup.destroy();
            this.replicatorPopup = null;
        }

        this.replicatorPopup = this.add.container(centerX, centerY);

        const otherCards = myPlayer.functionCards.filter(
            (c, i) => i !== replicatorCardIndex,
        );
        const popupHeight = Math.max(350, 180 + otherCards.length * 70);

        const bg = this.add.rectangle(0, 0, 500, popupHeight, 0x000000, 0.95);
        bg.setStrokeStyle(4, 0x00ff00);

        const titleText = this.add
            .text(0, -popupHeight / 2 + 30, "Replicator: Select Card to Copy", {
                font: "bold 24px Arial",
                fill: "#00FF00",
            })
            .setOrigin(0.5);

        const descText = this.add
            .text(
                0,
                -popupHeight / 2 + 60,
                "Choose one of your cards to replicate its effect",
                {
                    font: "14px Arial",
                    fill: "#aaaaaa",
                },
            )
            .setOrigin(0.5);

        const elements = [bg, titleText, descText];

        const cardWidth = 420;
        const cardHeight = 55;
        const startY = -popupHeight / 2 + 100;
        const spacing = 10;

        otherCards.forEach((card, displayIndex) => {
            const originalIndex = myPlayer.functionCards.indexOf(card);
            const cardY = startY + displayIndex * (cardHeight + spacing);

            const cardRect = this.add
                .rectangle(0, cardY, cardWidth, cardHeight, 0x226622)
                .setInteractive();
            cardRect.setStrokeStyle(2, 0x44ff44);

            const nameText = this.add
                .text(-cardWidth / 2 + 15, cardY - 10, card.name, {
                    font: "bold 16px Arial",
                    fill: "#ffffff",
                })
                .setOrigin(0, 0.5);

            const descCardText = this.add
                .text(-cardWidth / 2 + 15, cardY + 10, card.description || "", {
                    font: "12px Arial",
                    fill: "#aaaaaa",
                    wordWrap: { width: cardWidth - 30 },
                })
                .setOrigin(0, 0.5);

            cardRect.on("pointerdown", () => {
                console.log(
                    "Replicator selected card:",
                    card.name,
                    "originalIndex:",
                    originalIndex,
                );
                if (this.replicatorPopup) {
                    this.replicatorPopup.destroy();
                    this.replicatorPopup = null;
                }

                if (card.requiresTarget) {
                    this.showReplicatorTargetSelection(
                        replicatorCardIndex,
                        originalIndex,
                        card,
                    );
                } else {
                    this.socket.emit("playFunctionCard", {
                        cardIndex: replicatorCardIndex,
                        replicateIndex: originalIndex,
                        targetId: null,
                    });
                }
            });

            cardRect.on("pointerover", () => (cardRect.fillColor = 0x338833));
            cardRect.on("pointerout", () => (cardRect.fillColor = 0x226622));

            elements.push(cardRect, nameText, descCardText);
        });

        const cancelY = popupHeight / 2 - 40;
        const cancelBtn = this.add
            .rectangle(0, cancelY, 150, 40, 0x884444)
            .setInteractive();
        cancelBtn.setStrokeStyle(2, 0xffffff);
        const cancelText = this.add
            .text(0, cancelY, "Cancel", {
                font: "18px Arial",
                fill: "#ffffff",
            })
            .setOrigin(0.5);

        cancelBtn.on("pointerdown", () => {
            if (this.replicatorPopup) {
                this.replicatorPopup.destroy();
                this.replicatorPopup = null;
            }
            this.showYourTurnPopup();
        });

        cancelBtn.on("pointerover", () => (cancelBtn.fillColor = 0xaa6666));
        cancelBtn.on("pointerout", () => (cancelBtn.fillColor = 0x884444));

        elements.push(cancelBtn, cancelText);

        this.replicatorPopup.add(elements);
        this.replicatorPopup.setDepth(7000);
    }

    showMarketRegulationSelection(cardIndex) {
        const gameScene = this.scene.get("GameScene");

        if (
            !gameScene ||
            !gameScene.planetSprites ||
            !gameScene.planetMarkets
        ) {
            this.socket.emit("playFunctionCard", {
                cardIndex: cardIndex,
                targetId: null,
            });
            return;
        }

        const planets = [];
        const seenPlanetIds = new Set();

        gameScene.planetSprites.forEach((planetData, key) => {
            if (
                planetData.tile &&
                planetData.tile.planetId &&
                !seenPlanetIds.has(planetData.tile.planetId)
            ) {
                seenPlanetIds.add(planetData.tile.planetId);

                // Get market - try the current key first, then check all occupied positions
                let market = gameScene.planetMarkets.get(key);
                if (!market && planetData.tile.occupiedPositions) {
                    // Try all occupied positions to find the market
                    for (const pos of planetData.tile.occupiedPositions) {
                        const posKey = `${parseInt(pos.q)},${parseInt(pos.r)}`;
                        market = gameScene.planetMarkets.get(posKey);
                        if (market) break;
                    }
                }

                // If still no market, use the tile's market directly
                if (!market && planetData.tile.market) {
                    market = planetData.tile.market;
                }

                planets.push({
                    id: planetData.tile.planetId,
                    name:
                        planetData.tile.name ||
                        `Planet ${planetData.tile.planetId + 1}`,
                    market: market,
                    posKey: key,
                });
            }
        });

        if (planets.length < 2) {
            this.showNotification(
                "Not enough planets to swap markets",
                0xff0000,
            );
            return;
        }

        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        if (this.marketRegPopup) {
            this.marketRegPopup.destroy();
            this.marketRegPopup = null;
        }

        this.selectedPlanetsForSwap = [];
        this.marketRegPopup = this.add.container(centerX, centerY);

        const popupHeight = Math.max(400, 200 + planets.length * 55);
        const bg = this.add.rectangle(0, 0, 500, popupHeight, 0x000000, 0.95);
        bg.setStrokeStyle(4, 0x00aaff);

        const titleText = this.add
            .text(0, -popupHeight / 2 + 30, "Market Regulation", {
                font: "bold 24px Arial",
                fill: "#00AAFF",
            })
            .setOrigin(0.5);

        const descText = this.add
            .text(
                0,
                -popupHeight / 2 + 60,
                "Select two planets to swap their markets",
                {
                    font: "14px Arial",
                    fill: "#aaaaaa",
                },
            )
            .setOrigin(0.5);

        const elements = [bg, titleText, descText];

        const buttonWidth = 420;
        const buttonHeight = 45;
        const startY = -popupHeight / 2 + 100;
        const spacing = 8;

        const planetButtons = [];

        planets.forEach((planet, index) => {
            const btnY = startY + index * (buttonHeight + spacing);

            const marketInfo = planet.market
                ? `${planet.market.color || "wild"} ${planet.market.type || "wild"}`
                : "No market";

            const planetBtn = this.add
                .rectangle(0, btnY, buttonWidth, buttonHeight, 0x333366)
                .setInteractive();
            planetBtn.setStrokeStyle(2, 0x6666cc);
            planetBtn.planetData = planet;
            planetBtn.isSelected = false;

            const planetText = this.add
                .text(
                    -buttonWidth / 2 + 15,
                    btnY,
                    `${planet.name}: ${marketInfo}`,
                    {
                        font: "16px Arial",
                        fill: "#ffffff",
                    },
                )
                .setOrigin(0, 0.5);

            planetBtn.on("pointerdown", () => {
                if (planetBtn.isSelected) {
                    planetBtn.isSelected = false;
                    planetBtn.setStrokeStyle(2, 0x6666cc);
                    planetBtn.fillColor = 0x333366;
                    this.selectedPlanetsForSwap =
                        this.selectedPlanetsForSwap.filter(
                            (p) => p.id !== planet.id,
                        );
                } else {
                    if (this.selectedPlanetsForSwap.length >= 2) {
                        return;
                    }
                    planetBtn.isSelected = true;
                    planetBtn.setStrokeStyle(3, 0xffd700);
                    planetBtn.fillColor = 0x555588;
                    this.selectedPlanetsForSwap.push(planet);

                    if (this.selectedPlanetsForSwap.length === 2) {
                        if (this.marketRegPopup) {
                            this.marketRegPopup.destroy();
                            this.marketRegPopup = null;
                        }
                        this.socket.emit("playFunctionCard", {
                            cardIndex: cardIndex,
                            targetId: {
                                planet1Id: this.selectedPlanetsForSwap[0].id,
                                planet2Id: this.selectedPlanetsForSwap[1].id,
                            },
                        });
                        this.selectedPlanetsForSwap = [];
                    }
                }
            });

            planetBtn.on("pointerover", () => {
                if (!planetBtn.isSelected) {
                    planetBtn.fillColor = 0x444477;
                }
            });
            planetBtn.on("pointerout", () => {
                if (!planetBtn.isSelected) {
                    planetBtn.fillColor = 0x333366;
                }
            });

            planetButtons.push(planetBtn);
            elements.push(planetBtn, planetText);
        });

        const cancelY = popupHeight / 2 - 40;
        const cancelBtn = this.add
            .rectangle(0, cancelY, 150, 40, 0x884444)
            .setInteractive();
        cancelBtn.setStrokeStyle(2, 0xffffff);
        const cancelText = this.add
            .text(0, cancelY, "Cancel", {
                font: "18px Arial",
                fill: "#ffffff",
            })
            .setOrigin(0.5);

        cancelBtn.on("pointerdown", () => {
            if (this.marketRegPopup) {
                this.marketRegPopup.destroy();
                this.marketRegPopup = null;
            }
            this.selectedPlanetsForSwap = [];
            this.showYourTurnPopup();
        });

        cancelBtn.on("pointerover", () => (cancelBtn.fillColor = 0xaa6666));
        cancelBtn.on("pointerout", () => (cancelBtn.fillColor = 0x884444));

        elements.push(cancelBtn, cancelText);

        this.marketRegPopup.add(elements);
        this.marketRegPopup.setDepth(7000);
    }

    showReplicatorTargetSelection(replicatorCardIndex, replicateIndex, card) {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        if (this.replicatorPopup) {
            this.replicatorPopup.destroy();
            this.replicatorPopup = null;
        }

        this.replicatorPopup = this.add.container(centerX, centerY);

        const bg = this.add.rectangle(0, 0, 500, 400, 0x000000, 0.95);
        bg.setStrokeStyle(4, 0x00ff00);

        const titleText = this.add
            .text(0, -160, `Replicating: ${card.name}`, {
                font: "bold 24px Arial",
                fill: "#00FF00",
            })
            .setOrigin(0.5);

        const selectText = this.add
            .text(0, -120, "Select Target Player:", {
                font: "bold 18px Arial",
                fill: "#ffffff",
            })
            .setOrigin(0.5);

        const elements = [bg, titleText, selectText];

        const gameScene = this.scene.get("GameScene");
        const players = gameScene ? gameScene.players : [];

        const buttonWidth = 200;
        const buttonHeight = 50;
        const startY = -60;
        const spacing = 10;

        players.forEach((player, index) => {
            const btnY = startY + index * (buttonHeight + spacing);
            const isMe = player.id === this.socket.id;
            const btnColor = isMe ? 0x224488 : 0x444444;

            const playerBtn = this.add
                .rectangle(0, btnY, buttonWidth, buttonHeight, btnColor)
                .setInteractive();
            playerBtn.setStrokeStyle(2, 0xffffff);

            const playerText = this.add
                .text(0, btnY, `${player.name}${isMe ? " (You)" : ""}`, {
                    font: "18px Arial",
                    fill: "#ffffff",
                })
                .setOrigin(0.5);

            playerBtn.on("pointerdown", () => {
                console.log("Replicator target selected:", player.name);
                if (this.replicatorPopup) {
                    this.replicatorPopup.destroy();
                    this.replicatorPopup = null;
                }
                this.socket.emit("playFunctionCard", {
                    cardIndex: replicatorCardIndex,
                    replicateIndex: replicateIndex,
                    targetId: player.id,
                });
            });

            playerBtn.on(
                "pointerover",
                () => (playerBtn.fillColor = isMe ? 0x3366aa : 0x666666),
            );
            playerBtn.on("pointerout", () => (playerBtn.fillColor = btnColor));

            elements.push(playerBtn, playerText);
        });

        const cancelY = 150;
        const cancelBtn = this.add
            .rectangle(0, cancelY, 150, 40, 0x884444)
            .setInteractive();
        cancelBtn.setStrokeStyle(2, 0xffffff);
        const cancelText = this.add
            .text(0, cancelY, "Cancel", {
                font: "18px Arial",
                fill: "#ffffff",
            })
            .setOrigin(0.5);

        cancelBtn.on("pointerdown", () => {
            if (this.replicatorPopup) {
                this.replicatorPopup.destroy();
                this.replicatorPopup = null;
            }
            this.showYourTurnPopup();
        });

        cancelBtn.on("pointerover", () => (cancelBtn.fillColor = 0xaa6666));
        cancelBtn.on("pointerout", () => (cancelBtn.fillColor = 0x884444));

        elements.push(cancelBtn, cancelText);

        this.replicatorPopup.add(elements);
        this.replicatorPopup.setDepth(7000);
    }

    showTurnIndicator(playerName) {
        const centerX = this.cameras.main.width / 2;

        const phaseText = this.getPhaseDisplayText();
        this.turnIndicatorText = this.add
            .text(centerX, 30, `${playerName}'s turn - ${phaseText}`, {
                font: "bold 32px Arial",
                fill: "#ffffff",
                stroke: "#000000",
                strokeThickness: 4,
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(2000);
    }

    getPhaseDisplayText() {
        switch (this.turnPhase) {
            case "roll":
                return "Roll/Play Card";
            case "move":
                return "Move Ship";
            case "cargo":
                return "Play Cargo Cards";
            default:
                return "";
        }
    }

    showStartButton(socket) {
        console.log(
            "UIScene.showStartButton called with socket:",
            socket ? socket.id : "NO SOCKET",
        );
        console.log(
            "UIScene.this.socket:",
            this.socket ? this.socket.id : "NO SOCKET",
        );

        // Don't show button if it already exists
        if (this.startButton) {
            console.log("Start button already exists, skipping creation");
            return;
        }

        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        this.startButton = this.add.container(centerX, centerY);

        const bg = this.add.rectangle(0, 0, 200, 80, 0x555555).setInteractive(); // Default to disabled color
        bg.setStrokeStyle(4, 0xffffff);

        const text = this.add
            .text(0, 0, "START GAME", {
                font: "28px Arial",
                fill: "#ffffff",
                fontStyle: "bold",
            })
            .setOrigin(0.5);

        this.startButton.add([bg, text]);

        bg.on("pointerdown", () => {
            console.log("Start Game button pointerdown event fired");
            console.log("this.startButton.alpha:", this.startButton.alpha);
            // Only emit if enabled (checked by alpha)
            if (this.startButton.alpha === 1) {
                console.log(
                    "Start Game button clicked, emitting startGame to socket:",
                    this.socket ? this.socket.id : "NO SOCKET",
                );
                this.socket.emit("startGame");
                // Immediately hide the button to prevent multiple clicks
                this.hideStartButton();
            } else {
                console.log(
                    "Button disabled (alpha=" + this.startButton.alpha + ")",
                );
            }
        });

        bg.on("pointerover", () => {
            if (this.startButton.alpha === 1) bg.fillColor = 0x00cc00;
        });
        bg.on("pointerout", () => {
            if (this.startButton.alpha === 1) bg.fillColor = 0x00aa00;
        });

        this.updateStartButton();
    }

    updateStartButton(players) {
        // Don't update if button doesn't exist or has been destroyed
        if (!this.startButton) {
            return;
        }
        if (this.startButton && this.startButton.active) {
            const canStart = !players || players.length >= 1;
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

    hideStartButton() {
        console.log(
            "hideStartButton called, startButton exists:",
            !!this.startButton,
        );
        if (this.startButton) {
            console.log("Destroying start button");
            this.startButton.setVisible(false);
            this.startButton.destroy(true);
            this.startButton = null;
        }
    }

    showWaitingMessage() {
        console.log(
            "UIScene.showWaitingMessage called, waitingText already exists:",
            !!this.waitingText,
        );
        // Don't create multiple waiting messages
        if (this.waitingText) {
            console.log("Waiting message already exists, not creating another");
            return;
        }
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        this.waitingText = this.add
            .text(centerX, centerY, "Waiting for host to start...", {
                font: "32px Arial",
                fill: "#ffffff",
                fontStyle: "bold",
            })
            .setOrigin(0.5)
            .setDepth(5000);
        console.log("Waiting message created");
    }

    hideWaitingMessage() {
        console.log(
            "UIScene.hideWaitingMessage called, waitingText exists:",
            !!this.waitingText,
        );
        if (this.waitingText) {
            try {
                this.waitingText.destroy();
            } catch (e) {
                console.error("Error destroying waiting text:", e);
            }
            this.waitingText = null;
        }
    }

    showRootCardSelectionPopup(data) {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        this.playerSelectionPopup = this.add.container(centerX, centerY);

        const bg = this.add.rectangle(0, 0, 600, 500, 0x000000, 0.95);
        bg.setStrokeStyle(4, 0xffaa00);

        const titleText = this.add
            .text(0, -220, `Root: ${data.targetName}'s Function Cards`, {
                font: "bold 28px Arial",
                fill: "#ffaa00",
            })
            .setOrigin(0.5);

        const instructionText = this.add
            .text(0, -180, "Select a card to play from their hand:", {
                font: "18px Arial",
                fill: "#ffffff",
            })
            .setOrigin(0.5);

        const elements = [bg, titleText, instructionText];

        // Display function cards
        if (data.functionCards.length === 0) {
            const noCardsText = this.add
                .text(0, -100, "Target has no function cards", {
                    font: "20px Arial",
                    fill: "#ff6666",
                })
                .setOrigin(0.5);
            elements.push(noCardsText);
        } else {
            const cardWidth = 250;
            const cardHeight = 80;
            const startY = -120;
            const spacing = 10;

            data.functionCards.forEach((card, index) => {
                const cardY = startY + index * (cardHeight + spacing);

                const cardRect = this.add
                    .rectangle(0, cardY, cardWidth, cardHeight, 0x2a2a2a)
                    .setInteractive();
                cardRect.setStrokeStyle(3, 0x888888);

                const nameText = this.add
                    .text(0, cardY - 20, card.name, {
                        font: "bold 20px Arial",
                        fill: "#ffffff",
                    })
                    .setOrigin(0.5);

                const descText = this.add
                    .text(0, cardY + 15, card.description, {
                        font: "14px Arial",
                        fill: "#cccccc",
                        wordWrap: { width: cardWidth - 20 },
                        align: "center",
                    })
                    .setOrigin(0.5);

                cardRect.on("pointerdown", () => {
                    console.log(
                        "Selected card from target:",
                        card.name,
                        "at index",
                        index,
                    );

                    // Close popup
                    if (this.playerSelectionPopup) {
                        this.playerSelectionPopup.destroy();
                        this.playerSelectionPopup = null;
                    }

                    // Check if the selected card requires a target
                    if (card.requiresTarget) {
                        // Show player selection for the selected card
                        this.showPlayerSelectionForRootCard(data, index, card);
                    } else {
                        // Play the card directly
                        this.socket.emit("playFunctionCard", {
                            cardIndex: data.rootCardIndex,
                            targetId: {
                                targetPlayerId: data.targetId,
                                selectedCardIndex: index,
                                cardTarget: null,
                            },
                        });
                    }
                });

                cardRect.on("pointerover", () => {
                    cardRect.fillColor = 0x3a3a3a;
                    cardRect.setStrokeStyle(3, 0xffaa00);
                });
                cardRect.on("pointerout", () => {
                    cardRect.fillColor = 0x2a2a2a;
                    cardRect.setStrokeStyle(3, 0x888888);
                });

                elements.push(cardRect, nameText, descText);
            });
        }

        // Add cancel button
        const cancelBtn = this.add
            .rectangle(0, 200, 150, 40, 0x884444)
            .setInteractive();
        cancelBtn.setStrokeStyle(2, 0xffffff);
        const cancelText = this.add
            .text(0, 200, "Cancel", {
                font: "18px Arial",
                fill: "#ffffff",
            })
            .setOrigin(0.5);

        cancelBtn.on("pointerdown", () => {
            if (this.playerSelectionPopup) {
                this.playerSelectionPopup.destroy();
                this.playerSelectionPopup = null;
            }
            this.showYourTurnPopup();
        });

        cancelBtn.on("pointerover", () => (cancelBtn.fillColor = 0xaa6666));
        cancelBtn.on("pointerout", () => (cancelBtn.fillColor = 0x884444));

        elements.push(cancelBtn, cancelText);

        this.playerSelectionPopup.add(elements);
        this.playerSelectionPopup.setDepth(6000);
    }

    showPlayerSelectionForRootCard(rootData, selectedCardIndex, selectedCard) {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        this.playerSelectionPopup = this.add.container(centerX, centerY);

        const bg = this.add.rectangle(0, 0, 500, 400, 0x000000, 0.9);
        bg.setStrokeStyle(4, 0xffffff);

        const titleText = this.add
            .text(0, -160, `Playing: ${selectedCard.name}`, {
                font: "bold 28px Arial",
                fill: "#ffffff",
            })
            .setOrigin(0.5);

        const descText = this.add
            .text(0, -120, selectedCard.description, {
                font: "16px Arial",
                fill: "#aaaaaa",
                wordWrap: { width: 450 },
                align: "center",
            })
            .setOrigin(0.5);

        const selectText = this.add
            .text(0, -60, "Select Target Player:", {
                font: "bold 20px Arial",
                fill: "#ffffff",
            })
            .setOrigin(0.5);

        const elements = [bg, titleText, descText, selectText];

        // Get all players from gameScene
        const gameScene = this.scene.get("GameScene");
        const players = gameScene ? gameScene.players : [];

        const buttonWidth = 200;
        const buttonHeight = 50;
        const startY = -20;
        const spacing = 10;

        players.forEach((player, index) => {
            const btnY = startY + index * (buttonHeight + spacing);
            const isMe = player.id === this.socket.id;
            const btnColor = isMe ? 0x4444aa : 0x444444;

            const playerBtn = this.add
                .rectangle(0, btnY, buttonWidth, buttonHeight, btnColor)
                .setInteractive();
            playerBtn.setStrokeStyle(2, 0xffffff);

            const playerText = this.add
                .text(0, btnY, `${player.name}${isMe ? " (You)" : ""}`, {
                    font: "18px Arial",
                    fill: "#ffffff",
                })
                .setOrigin(0.5);

            playerBtn.on("pointerdown", () => {
                console.log(
                    "Target player selected for rooted card:",
                    player.name,
                    player.id,
                );

                if (this.playerSelectionPopup) {
                    this.playerSelectionPopup.destroy();
                    this.playerSelectionPopup = null;
                }

                // Play the rooted card with this target
                this.socket.emit("playFunctionCard", {
                    cardIndex: rootData.rootCardIndex,
                    targetId: {
                        targetPlayerId: rootData.targetId,
                        selectedCardIndex: selectedCardIndex,
                        cardTarget: player.id,
                    },
                });
            });

            playerBtn.on(
                "pointerover",
                () => (playerBtn.fillColor = isMe ? 0x6666cc : 0x666666),
            );
            playerBtn.on("pointerout", () => (playerBtn.fillColor = btnColor));

            elements.push(playerBtn, playerText);
        });

        // Add cancel button
        const cancelBtn = this.add
            .rectangle(
                0,
                startY + players.length * (buttonHeight + spacing) + 20,
                150,
                40,
                0x884444,
            )
            .setInteractive();
        cancelBtn.setStrokeStyle(2, 0xffffff);
        const cancelText = this.add
            .text(
                0,
                startY + players.length * (buttonHeight + spacing) + 20,
                "Cancel",
                {
                    font: "18px Arial",
                    fill: "#ffffff",
                },
            )
            .setOrigin(0.5);

        cancelBtn.on("pointerdown", () => {
            if (this.playerSelectionPopup) {
                this.playerSelectionPopup.destroy();
                this.playerSelectionPopup = null;
            }
            // Go back to showing target's cards
            this.showRootCardSelectionPopup(rootData);
        });

        cancelBtn.on("pointerover", () => (cancelBtn.fillColor = 0xaa6666));
        cancelBtn.on("pointerout", () => (cancelBtn.fillColor = 0x884444));

        elements.push(cancelBtn, cancelText);

        this.playerSelectionPopup.add(elements);
        this.playerSelectionPopup.setDepth(6000);
    }
}

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: "GameScene" });
    }

    preload() {
        this.load.image("triangle", "assets/images/triangle.png");
        this.load.image("rhombus", "assets/images/rhombus.png");
        this.load.image("hexagon", "assets/images/hexagon.png");
        this.load.image("star", "assets/images/star.png");
        this.load.image("asteroids", "assets/images/asteroids.png");
        this.load.image("die1", "assets/images/1_dot.png");
        this.load.image("die2", "assets/images/2_dots.png");
        this.load.image("die3", "assets/images/3_dots.png");
        this.load.image("die4", "assets/images/4_dots.png");
        this.load.image("die5", "assets/images/5_dots.png");
        this.load.image("die6", "assets/images/6_dots.png");
        // Load planet textures
        this.load.image("planet0", "assets/images/planet0.png");
        this.load.image("planet1", "assets/images/planet1.png");
        this.load.image("planet2", "assets/images/planet2.png");
        this.load.image("planet3", "assets/images/planet3.png");
        this.load.image("planet4", "assets/images/planet4.png");
        this.load.image("planet5", "assets/images/planet5.png");
        // Load function card image
        this.load.image("function_card", "assets/images/function_card.png");
        // Load splash screen
        this.load.image("splash_screen", "assets/images/splash_screen.png");
    }

    create(data) {
        // Get socket from data passed from LobbyScene or use global socket
        this.socket = data && data.socket ? data.socket : socket;
        this.gameId = data && data.gameId ? data.gameId : null;

        // Create Starfield
        this.createStarTexture("stars1", 400, 1, 0.3);
        this.createStarTexture("stars2", 200, 2, 0.6);
        this.createStarTexture("stars3", 100, 3, 1.0);

        // Create glow particle texture for teleporter effects
        this.createGlowParticleTexture();

        const width = this.scale.width;
        const height = this.scale.height;

        this.starfield1 = this.add
            .tileSprite(0, 0, width, height, "stars1")
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(-3);
        this.starfield2 = this.add
            .tileSprite(0, 0, width, height, "stars2")
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(-2);
        this.starfield3 = this.add
            .tileSprite(0, 0, width, height, "stars3")
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(-1);

        this.scale.on("resize", this.resize, this);

        // Create debug text for tile info
        this.debugText = this.add
            .text(10, 10, "", {
                font: "14px Arial",
                fill: "#ffffff",
                backgroundColor: "#000000",
                padding: { x: 10, y: 5 },
            })
            .setScrollFactor(0)
            .setDepth(1000);

        this.boardGroup = this.add.group();
        this.teleporterLayer = this.add.container(0, 0); // Separate layer for teleporter effects
        this.teleporterLayer.setDepth(2); // Above board tiles but below ships
        this.boardOffset = { x: 0, y: 0 };
        this.players = []; // Initialize empty
        this.tileData = new Map();
        this.highlightedTiles = [];
        this.highlightMarkers = [];
        this.waitingForMovementMarkers = false; // Flag for auto-showing movement markers
        this.teleporterEffects = []; // Track teleporter effects for cleanup

        // Register cleanup handlers for scene shutdown/destroy
        this.events.on("shutdown", this.cleanupTeleporterEffects, this);
        this.events.on("destroy", this.cleanupTeleporterEffects, this);

        // Create splash screen overlay (bottom right quadrant)
        const splashWidth = width / 2;
        const splashHeight = height / 2;
        const splashX = width - splashWidth / 2;
        const splashY = height - splashHeight / 2;

        this.splashScreen = this.add
            .image(splashX, splashY, "splash_screen")
            .setOrigin(0.5, 0.5)
            .setScrollFactor(0)
            .setDepth(50); // Below UI layer (which is typically 100+)

        // Scale to fit quadrant while maintaining aspect ratio
        const imgWidth = this.splashScreen.width;
        const imgHeight = this.splashScreen.height;
        const scaleX = splashWidth / imgWidth;
        const scaleY = splashHeight / imgHeight;
        const scale = Math.min(scaleX, scaleY); // Use smaller scale to fit within quadrant
        this.splashScreen.setScale(scale);

        // Initially hide it, will show when appropriate
        this.splashScreen.setVisible(false);

        this.socket.on("connect", () => {
            console.log("Connected to server!");
        });

        this.socket.on("connectionData", (data) => {
            console.log("GameScene received connectionData:", data);
            this.handleConnectionData(data);
        });

        // Register socket listeners only once
        this.socket.once("gameStarted", (data) => {
            this.gameStarted = true;
            const uiScene = this.scene.get("UIScene");
            if (uiScene) {
                uiScene.hideStartButton();
                uiScene.hideWaitingMessage();
            }
            // Hide splash screen when game starts
            if (this.splashScreen) {
                this.splashScreen.setVisible(false);
            }
            this.renderBoard(data);
        });

        this.socket.on("boardState", (data) => {
            this.renderBoard(data);
        });

        this.socket.on("playersUpdate", (players) => {
            console.log(
                "GameScene received playersUpdate:",
                players.length,
                "players",
            );
            console.log(
                "[CLIENT DEBUG] Player colors received:",
                players.map((p) => ({ name: p.name, color: p.color })),
            );
            console.log("TEST: Code is executing after playersUpdate log");
            this.players = players;

            // Forward to UIScene FIRST before renderShips (in case renderShips has errors)
            const uiScene = this.scene.get("UIScene");
            console.log("GameScene: uiScene exists?", !!uiScene);
            console.log(
                "GameScene: uiScene.renderUI exists?",
                uiScene ? !!uiScene.renderUI : "N/A",
            );

            // Forward playersUpdate to UIScene to render UI
            if (uiScene && uiScene.renderUI) {
                console.log("GameScene: Forwarding playersUpdate to UIScene");
                uiScene.renderUI(players);
            } else {
                console.warn(
                    "GameScene: Cannot forward to UIScene -",
                    uiScene ? "renderUI missing" : "uiScene not found",
                );
            }

            // Only update start button if game hasn't started yet
            if (uiScene && !this.gameStarted) {
                uiScene.updateStartButton(players);
            }

            // Render ships (wrapped in try-catch to prevent UI failures)
            try {
                this.renderShips(players);
            } catch (error) {
                console.error("Error in renderShips:", error);
            }

            // Check if we should auto-show movement markers after dice roll
            if (this.waitingForMovementMarkers) {
                const myPlayer = players.find(
                    (p) => p.socketId === this.socket.id,
                );
                console.log(
                    "[MARKERS DEBUG] waitingForMovementMarkers=true, myPlayer:",
                    !!myPlayer,
                    "movesLeft:",
                    myPlayer?.movesLeft,
                    "turnPhase:",
                    this.turnPhase,
                );
                if (
                    myPlayer &&
                    myPlayer.movesLeft > 0 &&
                    myPlayer.ship &&
                    this.turnPhase === "move"
                ) {
                    console.log(
                        "Auto-showing movement markers after playersUpdate",
                    );
                    const { q, r, s } = myPlayer.ship.position;
                    this.highlightReachableTiles(q, r, s, myPlayer.movesLeft);
                    this.waitingForMovementMarkers = false;
                } else {
                    console.log("[MARKERS DEBUG] Condition failed:", {
                        hasPlayer: !!myPlayer,
                        movesLeft: myPlayer?.movesLeft,
                        hasShip: !!myPlayer?.ship,
                        phase: this.turnPhase,
                        needsMove: this.turnPhase === "move",
                    });
                }
            }
        });

        this.socket.on("phaseChanged", (data) => {
            console.log(
                "[GAMESCENE PHASE DEBUG] Phase changed to:",
                data.phase,
            );
            this.turnPhase = data.phase;

            // Clear movement markers when phase changes to 'roll'
            if (data.phase === "roll") {
                console.log(
                    "[GAMESCENE] Clearing highlights and resetting flag due to roll phase",
                );
                this.clearHighlights();
                this.waitingForMovementMarkers = false;
            }

            // Show movement markers when phase changes to 'move' and player has moves
            if (
                data.phase === "move" &&
                this.waitingForMovementMarkers &&
                this.players
            ) {
                const myPlayer = this.players.find(
                    (p) => p.socketId === this.socket.id,
                );
                if (
                    myPlayer &&
                    myPlayer.movesLeft > 0 &&
                    myPlayer.ship &&
                    myPlayer.ship.position
                ) {
                    console.log(
                        "[GAMESCENE] Phase changed to move, showing movement markers now",
                    );
                    const { q, r, s } = myPlayer.ship.position;
                    this.highlightReachableTiles(q, r, s, myPlayer.movesLeft);
                    this.waitingForMovementMarkers = false;
                }
            }
        });

        this.socket.on("diceRolled", (data) => {
            // Auto-show movement markers when the current player rolls
            if (data.playerId === this.socket.id) {
                console.log(
                    "[DICE DEBUG] Setting waitingForMovementMarkers=true",
                );
                this.waitingForMovementMarkers = true;
            }
        });

        this.socket.on("debugMessage", (msg) => {
            console.log("[DEBUG]", msg);
        });

        this.socket.on("marketsData", (data) => {
            console.log("Received marketsData:", data);
            this.planetMarkets = new Map();
            data.markets.forEach((m) => {
                const key = `${m.q},${m.r}`;
                this.planetMarkets.set(key, m.market);
            });
            this.updateMarketBadges();
        });

        this.socket.on("marketUpdated", (data) => {
            console.log("Market updated:", data);
            const key = `${data.planetQ},${data.planetR}`;
            if (!this.planetMarkets) this.planetMarkets = new Map();
            this.planetMarkets.set(key, data.market);

            // Also update the tile.market in planetSprites so popup shows correct data
            const planetSpriteData = this.planetSprites.get(key);
            if (planetSpriteData && planetSpriteData.tile) {
                planetSpriteData.tile.market = data.market;
            }

            this.updateMarketBadge(data.planetQ, data.planetR, data.market);
        });

        this.socket.on("cargoDelivered", (data) => {
            console.log("Cargo delivered:", data);
            const message = data.exactMatch
                ? `${data.playerName} delivered cargo for exact match! Bonus function card: ${data.bonusCard}`
                : `${data.playerName} delivered cargo to planet`;
            const uiScene = this.scene.get("UIScene");
            if (uiScene && uiScene.showNotification) {
                uiScene.showNotification(
                    message,
                    data.exactMatch ? 0xffd700 : 0x00ff00,
                );
            }
        });

        this.socket.on("cargoDeliveryFailed", (data) => {
            console.log("Cargo delivery failed:", data.error);
            const uiScene = this.scene.get("UIScene");
            if (uiScene && uiScene.showNotification) {
                uiScene.showNotification(
                    `Delivery failed: ${data.error}`,
                    0xff0000,
                );
            }
        });

        this.socket.on("hubArrival", (data) => {
            console.log("Hub arrival:", data);
            let message = `${data.playerName} refilled ${data.cardsRefilled} cargo at the hub`;
            if (data.hadNoCargo && data.bonusCard) {
                message += ` and received bonus: ${data.bonusCard}`;
            }
            const uiScene = this.scene.get("UIScene");
            if (uiScene && uiScene.showNotification) {
                uiScene.showNotification(
                    message,
                    data.bonusCard ? 0xffd700 : 0x00bfff,
                );
            }
        });

        // Launch UI Scene AFTER registering socket handlers
        this.scene.launch("UIScene", { socket: this.socket });

        // Add camera controls
        this.lastPinchDistance = 0;
        this.isPinching = false;

        this.input.on("pointermove", (pointer) => {
            const pointer1 = this.input.pointer1;
            const pointer2 = this.input.pointer2;

            if (pointer1.isDown && pointer2.isDown) {
                const dist = Phaser.Math.Distance.Between(
                    pointer1.x,
                    pointer1.y,
                    pointer2.x,
                    pointer2.y,
                );

                if (this.lastPinchDistance > 0) {
                    const zoomDelta = (dist - this.lastPinchDistance) * 0.005;
                    const newZoom = this.cameras.main.zoom + zoomDelta;
                    this.cameras.main.zoom = Phaser.Math.Clamp(newZoom, 0.3, 2);
                }
                this.lastPinchDistance = dist;
                this.isPinching = true;
            } else if (pointer.isDown && !this.isPinching) {
                this.cameras.main.scrollX -=
                    (pointer.x - pointer.prevPosition.x) /
                    this.cameras.main.zoom;
                this.cameras.main.scrollY -=
                    (pointer.y - pointer.prevPosition.y) /
                    this.cameras.main.zoom;
            }
        });

        this.input.on("pointerup", () => {
            this.lastPinchDistance = 0;
            this.isPinching = false;
        });

        this.input.on(
            "wheel",
            (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
                const newZoom = this.cameras.main.zoom - deltaY * 0.001;
                this.cameras.main.zoom = Phaser.Math.Clamp(newZoom, 0.3, 2);
            },
        );

        // If connectionData was passed from LobbyScene, handle it after UIScene is ready
        if (data && data.connectionData) {
            console.log(
                "GameScene: Using connectionData passed from LobbyScene",
            );
            // Wait for UIScene to be ready before calling handleConnectionData
            this.time.delayedCall(100, () => {
                this.handleConnectionData(data.connectionData);
            });
        }
    }

    handleConnectionData(data) {
        console.log("GameScene.handleConnectionData:", data);
        this.isHost = data.isHost;
        this.gameStarted = data.gameStarted;
        this.gameId = data.gameId;

        console.log(
            "GameScene: isHost=" +
                this.isHost +
                ", gameStarted=" +
                this.gameStarted,
        );

        // Store game context in localStorage so player can rejoin if they refresh
        localStorage.setItem(
            "gameContext",
            JSON.stringify({
                gameId: this.gameId,
                playerName:
                    data.playerName ||
                    `Player ${Math.floor(Math.random() * 1000)}`,
                timestamp: Date.now(),
            }),
        );

        if (this.gameStarted) {
            // Game already started - hide waiting message, splash screen, and show board
            if (this.splashScreen) {
                this.splashScreen.setVisible(false);
            }
            const uiScene = this.scene.get("UIScene");
            if (uiScene && uiScene.scene.isActive()) {
                uiScene.hideWaitingMessage();
                uiScene.hideStartButton();
            } else {
                // Retry if UIScene not ready
                this.time.delayedCall(100, () => {
                    const uiScene = this.scene.get("UIScene");
                    if (uiScene) {
                        uiScene.hideWaitingMessage();
                        uiScene.hideStartButton();
                    }
                });
            }
            if (data.boardState && data.boardState.tiles) {
                this.renderBoard(data.boardState);
            }
        } else if (this.isHost) {
            // Show splash screen while waiting
            if (this.splashScreen) {
                this.splashScreen.setVisible(true);
            }
            console.log("GameScene: Signaling UIScene to show start button");
            const uiScene = this.scene.get("UIScene");
            if (uiScene && uiScene.scene.isActive()) {
                uiScene.showStartButton(this.socket);
            } else {
                console.log("GameScene: UIScene not ready yet, retrying...");
                this.time.delayedCall(100, () => {
                    const uiScene = this.scene.get("UIScene");
                    if (uiScene) {
                        uiScene.showStartButton(this.socket);
                    }
                });
            }
        } else {
            // Show splash screen while waiting
            if (this.splashScreen) {
                this.splashScreen.setVisible(true);
            }
            console.log("GameScene: Signaling UIScene to show waiting message");
            const uiScene = this.scene.get("UIScene");
            if (uiScene && uiScene.scene.isActive()) {
                uiScene.showWaitingMessage();
            } else {
                console.log("GameScene: UIScene not ready yet, retrying...");
                this.time.delayedCall(100, () => {
                    const uiScene = this.scene.get("UIScene");
                    if (uiScene) {
                        uiScene.showWaitingMessage();
                    }
                });
            }
        }
    }

    renderBoard(data) {
        console.log(
            `[DEBUG] renderBoard called with ${data.tiles.length} tiles.`,
        );
        // Store board data for re-rendering on resize
        this.lastBoardData = data;
        // Clean up teleporter effects before clearing
        this.cleanupTeleporterEffects();

        this.boardGroup.clear(true, true);
        this.tileData.clear();
        this.teleportTiles = [];
        this.spriteKeyMap = new Map();
        this.teleporterMap = new Map();
        this.planetSprites = new Map();
        this.gridScale = data.gridScale || 100;
        const scale = this.gridScale;
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        let offsetX = 0;
        let offsetY = 0;

        const hubTile = data.tiles.find((t) => t.type === "hub");
        if (hubTile) {
            const hubPositions =
                hubTile.occupiedPositions &&
                hubTile.occupiedPositions.length > 0
                    ? hubTile.occupiedPositions
                    : [{ q: hubTile.position.q, r: hubTile.position.r }];
            if (hubPositions.length > 0) {
                let hx = 0;
                let hy = 0;
                hubPositions.forEach((pos) => {
                    const { x: hxPos, y: hyPos } = this.axialToPixel(
                        parseInt(pos.q),
                        parseInt(pos.r),
                        scale,
                    );
                    hx += hxPos;
                    hy += hyPos;
                });
                offsetX = -(hx / hubPositions.length);
                offsetY = -(hy / hubPositions.length);
            }
        }

        this.boardOffset = { x: offsetX, y: offsetY };

        data.tiles.forEach((tile) => {
            const q = parseInt(tile.position.q);
            const r = parseInt(tile.position.r);
            const { x, y } = this.axialToPixel(q, r, scale);
            const isUp = Math.abs(q + r) % 2 === 0;

            // Determine base texture, tint and rotation for this tile
            let texture = "triangle";
            let tint = 0xffffff;
            let rotation = isUp ? 0 : Math.PI;

            if (tile.type === "hub") {
                texture = "hexagon";
                tint = 0xcccccc;
                rotation = 0;
            } else if (tile.type === "landing") {
                texture = "triangle";
                tint = 0x00ff00;
            } else if (tile.type === "asteroid_belt") {
                texture = "asteroids";
                tint = 0xffffff;
            } else if (tile.type === "teleportation") {
                texture = "triangle";
                tint = 0x00ffff; // Cyan color for teleporters
            } else if (tile.type === "black_hole") {
                texture = "triangle";
                tint = 0x000000;
            } else if (tile.type === "planet") {
                // Use unique texture for each planet
                texture = `planet${tile.planetId % 6}`;
                tint = 0xffffff; // No tint needed, texture has color
            }

            const positions =
                tile.occupiedPositions && tile.occupiedPositions.length > 0
                    ? tile.occupiedPositions
                    : [{ q, r }];
            const positionPixels = positions.map((pos) => {
                const pq = parseInt(pos.q);
                const pr = parseInt(pos.r);
                return this.axialToPixel(pq, pr, scale);
            });

            // If this tile spans multiple occupied positions (hub, planet, etc.), compute its centroid
            // by averaging the pixel coordinates of all occupiedPositions so the main sprite is centered.
            let anchorX = x;
            let anchorY = y;
            if (positionPixels.length > 0) {
                const sum = positionPixels.reduce(
                    (acc, pos) => {
                        acc.x += pos.x;
                        acc.y += pos.y;
                        return acc;
                    },
                    { x: 0, y: 0 },
                );
                anchorX = sum.x / positionPixels.length;
                anchorY = sum.y / positionPixels.length;
            }

            if (tile.type === "planet" && positionPixels.length === 2) {
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
            const sprite = this.add.sprite(
                roundedSpriteX,
                roundedSpriteY,
                texture,
            );
            sprite.setDepth(1);
            this.boardGroup.add(sprite);
            sprite.setTint(tint);

            // Debug: log a few sprite positions for inspection
            if (
                tile.type === "hub" ||
                tile.type === "planet" ||
                tile.type === "movement"
            ) {
                console.log(`[DEBUG] tile main sprite (${tile.type}) at`, {
                    q,
                    r,
                    spriteX: sprite.x,
                    spriteY: sprite.y,
                });
            }

            // Size & rotation adjustments per texture
            const s = scale;
            if (texture === "triangle") {
                sprite.setDisplaySize(s, (s * Math.sqrt(3)) / 2);
                sprite.setRotation(rotation);
                sprite.setOrigin(0.5, 2 / 3);
            } else if (texture === "hexagon") {
                sprite.setDisplaySize(2 * s, Math.sqrt(3) * s);
                sprite.setRotation(rotation);
                sprite.setOrigin(0.5, 0.5);
            } else if (texture === "rhombus") {
                sprite.setDisplaySize(s, s * Math.sqrt(3));
                sprite.setRotation(rotation);
                sprite.setOrigin(0.5, 0.5);
            } else if (texture === "asteroids") {
                sprite.setDisplaySize(s, (s * Math.sqrt(3)) / 2);
                sprite.setRotation(rotation);
                sprite.setOrigin(0.5, 2 / 3);
            } else if (tile.type === "planet") {
                sprite.setDisplaySize(s, s * Math.sqrt(3));
                sprite.setRotation(rotation);
                sprite.setOrigin(0.5, 0.5);

                const occupiedPositions = tile.occupiedPositions || [{ q, r }];
                occupiedPositions.forEach((pos) => {
                    const posKey = `${parseInt(pos.q)},${parseInt(pos.r)}`;
                    this.planetSprites.set(posKey, {
                        x: sprite.x,
                        y: sprite.y,
                        sprite: sprite,
                        tile: tile,
                    });

                    if (tile.market) {
                        if (!this.planetMarkets) this.planetMarkets = new Map();
                        this.planetMarkets.set(posKey, tile.market);
                    }
                });
            }

            // The server sends 'occupiedPositions' for planets and multi-cell tiles.
            // We can render movement tiles as subdivided triangles; other tiles keep the main sprite.

            // If this is a movement tile, subdivide each triangular position into 4 sub-triangles.
            // Teleportation tiles are NOT subdivided (they count as one tile like hub/planet)
            if (tile.type === "movement") {
                // For movement tiles create one container per triangular position containing four small triangles
                positions.forEach((pos) => {
                    const pq = parseInt(pos.q);
                    const pr = parseInt(pos.r);
                    const pIsUp = Math.abs(pq + pr) % 2 === 0;
                    const { x: px, y: py } = this.axialToPixel(pq, pr, scale);
                    const subScale = scale / 2;
                    const sSide = scale;
                    const H = (sSide * Math.sqrt(3)) / 2;
                    const topCentroidY = -H / 3;
                    const cornerCentroidY = H / 6;
                    const leftX = -sSide / 4;
                    const rightX = sSide / 4;

                    // Create a container at the axial pixel for this position (rounded)
                    const containerX = Math.round(centerX + px + offsetX);
                    const containerY = Math.round(centerY + py + offsetY);
                    const container = this.add.container(
                        containerX,
                        containerY,
                    );
                    container.setDepth(2); // Higher than planet tiles so sub-triangles receive clicks

                    // Create 4 triangle children placed relative to container
                    const triangles = [];
                    const subHitAreas = []; // Store hit areas for each sub-triangle
                    for (let si = 0; si < 4; si++) {
                        let subX = 0,
                            subY = 0,
                            subRotation = 0;
                        if (pIsUp) {
                            if (si === 0) {
                                subX = 0;
                                subY = topCentroidY;
                                subRotation = 0;
                            } else if (si === 1) {
                                subX = leftX;
                                subY = cornerCentroidY;
                                subRotation = 0;
                            } else if (si === 2) {
                                subX = rightX;
                                subY = cornerCentroidY;
                                subRotation = 0;
                            } else {
                                subX = 0;
                                subY = 0;
                                subRotation = Math.PI;
                            }
                        } else {
                            if (si === 0) {
                                subX = 0;
                                subY = -topCentroidY;
                                subRotation = Math.PI;
                            } else if (si === 1) {
                                subX = leftX;
                                subY = -cornerCentroidY;
                                subRotation = Math.PI;
                            } else if (si === 2) {
                                subX = rightX;
                                subY = -cornerCentroidY;
                                subRotation = Math.PI;
                            } else {
                                subX = 0;
                                subY = 0;
                                subRotation = 0;
                            }
                        }

                        const tSprite = this.add.sprite(subX, subY, "triangle");
                        tSprite.setDisplaySize(
                            subScale,
                            (subScale * Math.sqrt(3)) / 2,
                        );
                        tSprite.setOrigin(0.5, 2 / 3);
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
                    console.log("[DEBUG] movement container at", {
                        pq,
                        pr,
                        containerX,
                        containerY,
                    });

                    // Wrapper object so existing code can call setTint/on/off/setInteractive
                    const wrapper = {
                        container: container,
                        triangles: triangles,
                        subHitAreas: subHitAreas,
                        setTint: (color) => {
                            triangles.forEach((t) => t.setTint(color));
                        },
                        setInteractive: () => {
                            /* sub-triangles are already interactive */
                        },
                        disableInteractive: () => {
                            /* managed per sub-triangle */
                        },
                        on: (ev, cb) => {
                            // Add event to all sub-triangles
                            triangles.forEach((t) => t.on(ev, cb));
                        },
                        off: (ev) => {
                            // Remove event from all sub-triangles
                            triangles.forEach((t) => t.off(ev));
                        },
                        destroy: () => {
                            triangles.forEach((t) => {
                                try {
                                    t.destroy();
                                } catch (e) {}
                            });
                            try {
                                container.destroy();
                            } catch (e) {}
                        },
                    };

                    // Default tint
                    let tint = 0xffffff;
                    if (tile.type === "hub") tint = 0xcccccc;
                    else if (tile.type === "landing") tint = 0x00ff00;
                    else if (tile.type === "asteroid_belt") tint = 0x555555;
                    else if (tile.type === "teleportation") tint = 0x0000ff;
                    else if (tile.type === "black_hole") tint = 0x000000;
                    else if (tile.type === "planet") tint = 0xff00ff;

                    // Apply initial tint to visible triangles
                    wrapper.setTint(tint);

                    // Add debug hover/click handlers to each sub-triangle
                    subHitAreas.forEach((hit) => {
                        hit.sprite.on("pointermove", () => {
                            const hasHandler = hit.sprite.clickHandler
                                ? "YES"
                                : "NO";
                            this.debugText.setText(
                                `Hover: Type=${tile.type}, Q=${pq}, R=${pr}, S=${hit.subIndex}, Handler=${hasHandler}`,
                            );
                        });
                        hit.sprite.on("pointerout", () => {
                            this.debugText.setText("");
                        });

                        // Debug raw clicks
                        hit.sprite.on("pointerdown", () => {
                            if (!hit.sprite.clickHandler) {
                                console.warn(
                                    `[CLICK] No handler on sub-triangle ${pq},${pr},${hit.subIndex}`,
                                );
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
                            q: pq,
                            r: pr,
                            s: si,
                        });
                        this.registerTileKey(wrapper, key);
                    }

                    // Teleport canonical
                    if (tile.type === "teleportation") {
                        const canonical = `${pq},${pr},3`;
                        if (!this.teleportTiles.includes(canonical))
                            this.teleportTiles.push(canonical);
                    }
                });

                // Destroy the large main sprite for this tile so only sub-triangles remain visually
                if (sprite && sprite.destroy) {
                    sprite.destroy();
                }
            } else {
                // Non-movement tiles: register positions in tileData for pathfinding
                const firstPos = positions[0];
                const pq = parseInt(firstPos.q);
                const pr = parseInt(firstPos.r);
                console.log(
                    `[NON-MOVEMENT TILE] type=${tile.type} at ${pq},${pr}`,
                );

                // For hub: only register ONE canonical center position (0,0) for movement destination
                // For planets and other tiles: register all positions
                if (tile.type === "hub") {
                    // Hub always occupies these 6 hexes (hardcoded for reliability)
                    const hubPositions = [
                        { q: 0, r: 0 },
                        { q: 1, r: 0 },
                        { q: 1, r: -1 },
                        { q: 0, r: -1 },
                        { q: -1, r: -1 },
                        { q: -1, r: 0 },
                    ];

                    // Hub uses single central position for movement marker
                    const hubCenterKey = `0,0,3`;
                    console.log(
                        `[HUB REGISTRATION] Hub positions:`,
                        hubPositions,
                    );
                    this.tileData.set(hubCenterKey, {
                        type: tile.type,
                        sprite: sprite,
                        defaultTint: tint,
                        q: 0,
                        r: 0,
                        s: 3,
                        occupiedPositions: hubPositions,
                    });

                    // Register ALL hub positions in spriteKeyMap for neighbor discovery
                    hubPositions.forEach((pos) => {
                        const posQ = parseInt(pos.q);
                        const posR = parseInt(pos.r);
                        for (let s = 0; s <= 3; s++) {
                            const posKey = `${posQ},${posR},${s}`;
                            this.registerTileKey(sprite, posKey);
                        }
                    });
                    console.log(
                        `[HUB REGISTRATION] Registered ${hubPositions.length * 4} keys in spriteKeyMap`,
                    );
                } else {
                    // For planets and other non-movement tiles: register ONE canonical position
                    // but register ALL positions in spriteKeyMap for neighbor discovery
                    const canonicalPos = positions[0];
                    const canonicalQ = parseInt(canonicalPos.q);
                    const canonicalR = parseInt(canonicalPos.r);
                    const canonicalKey = `${canonicalQ},${canonicalR},3`;

                    this.tileData.set(canonicalKey, {
                        type: tile.type,
                        sprite: sprite,
                        defaultTint: tint,
                        q: canonicalQ,
                        r: canonicalR,
                        s: 3,
                        occupiedPositions: positions,
                        planetId: tile.planetId,
                    });

                    // Register ALL positions in spriteKeyMap for neighbor discovery
                    positions.forEach((pos) => {
                        const posQ = parseInt(pos.q);
                        const posR = parseInt(pos.r);
                        for (let s = 0; s <= 3; s++) {
                            const posKey = `${posQ},${posR},${s}`;
                            this.registerTileKey(sprite, posKey);
                        }
                    });
                }

                // Add debug hover/click handlers to the sprite
                if (sprite.setInteractive) {
                    sprite.setInteractive();

                    sprite.on("pointermove", () => {
                        this.debugText.setText(
                            `Hover: Type=${tile.type}, Q=${pq}, R=${pr}, PlanetId=${tile.planetId || "N/A"}`,
                        );
                    });

                    sprite.on("pointerout", () => {
                        this.debugText.setText("");
                    });
                }

                if (tile.type === "teleportation") {
                    const canonical = `${pq},${pr},3`;
                    if (!this.teleportTiles.includes(canonical))
                        this.teleportTiles.push(canonical);

                    // Save sprite position
                    const spriteX = sprite.x;
                    const spriteY = sprite.y;

                    console.log(
                        `[TELEPORTER] Processing teleporter at ${pq},${pr} - hiding sprite at (${spriteX},${spriteY})`,
                    );

                    // Hide the original sprite but DON'T destroy it (tileData needs the reference)
                    sprite.setVisible(false);
                    sprite.setAlpha(0);
                    sprite.setDepth(-1000);

                    // Add animated teleporter effect to dedicated layer (NOT boardGroup)
                    const isUp = Math.abs(pq + pr) % 2 === 0;
                    const teleporterEffect = this.createTeleporterEffect(
                        spriteX,
                        spriteY,
                        scale,
                        isUp,
                    );
                    this.teleporterLayer.add(teleporterEffect);

                    // Store reference for cleanup
                    if (!this.teleporterEffects) this.teleporterEffects = [];
                    this.teleporterEffects.push(teleporterEffect);
                    console.log(
                        `[TELEPORTER] Effect created for teleporter at ${pq},${pr}`,
                    );
                }
            }
        });
        console.log(`[DEBUG] tileData populated. Size: ${this.tileData.size}`);
        this.buildTeleporterMap();

        this.socket.emit("getMarkets");

        this.time.delayedCall(100, () => {
            this.updateMarketBadges();
        });
    }

    registerTileKey(sprite, key) {
        if (!sprite) {
            return;
        }
        if (!this.spriteKeyMap) {
            this.spriteKeyMap = new Map();
        }
        if (!this.spriteKeyMap.has(sprite)) {
            this.spriteKeyMap.set(sprite, new Set());
        }
        this.spriteKeyMap.get(sprite).add(key);
    }

    getWorldPositionForSlot(q, r, s) {
        const scale = this.gridScale || 100;
        const offsetX = this.boardOffset ? this.boardOffset.x : 0;
        const offsetY = this.boardOffset ? this.boardOffset.y : 0;
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        const { x, y } = this.axialToPixel(q, r, scale);

        let subX = 0;
        let subY = 0;

        if (s !== 3) {
            const isUp = Math.abs(q + r) % 2 === 0;
            const sSide = scale;
            const H = (sSide * Math.sqrt(3)) / 2;
            const topCentroidY = -H / 3;
            const cornerCentroidY = H / 6;
            const leftX = -sSide / 4;
            const rightX = sSide / 4;

            if (isUp) {
                if (s === 0) {
                    subX = 0;
                    subY = topCentroidY;
                } else if (s === 1) {
                    subX = leftX;
                    subY = cornerCentroidY;
                } else if (s === 2) {
                    subX = rightX;
                    subY = cornerCentroidY;
                }
            } else {
                if (s === 0) {
                    subX = 0;
                    subY = -topCentroidY;
                } else if (s === 1) {
                    subX = leftX;
                    subY = -cornerCentroidY;
                } else if (s === 2) {
                    subX = rightX;
                    subY = -cornerCentroidY;
                }
            }
        }

        return {
            x: Math.round(centerX + x + subX + offsetX),
            y: Math.round(centerY + y + subY + offsetY),
        };
    }

    addHighlightMarker(q, r, s) {
        const { x, y } = this.getWorldPositionForSlot(q, r, s);
        // getWorldPositionForSlot already returns world coordinates (including boardOffset)
        // so we don't need to add centerX/centerY again
        const marker = this.add.circle(x, y, 12, 0x808080, 0.6);
        marker.setStrokeStyle(2, 0xffffff, 0.3);
        marker.setDepth(2.5);
        this.highlightMarkers.push(marker);
        return marker;
    }

    buildTeleporterMap() {
        this.teleporterMap = new Map();
        if (!this.teleportTiles || this.teleportTiles.length === 0) {
            return;
        }

        this.teleportTiles.forEach((fromKey, index) => {
            const destinations = [];
            this.teleportTiles.forEach((candidateKey, candidateIndex) => {
                if (candidateIndex !== index) {
                    destinations.push(candidateKey);
                }
            });

            if (destinations.length > 0) {
                this.teleporterMap.set(fromKey, destinations);
            }
        });
    }

    getHexNeighbors(q, r) {
        // Returns the 6 adjacent hex coordinates
        return [
            { q: q + 1, r: r },
            { q: q + 1, r: r - 1 },
            { q: q, r: r - 1 },
            { q: q - 1, r: r },
            { q: q - 1, r: r + 1 },
            { q: q, r: r + 1 },
        ];
    }

    getTriangleNeighborsBase(q, r, s) {
        const neighbors = [];
        const isUp = Math.abs(q + r) % 2 === 0;

        if (s === 3) {
            neighbors.push({ q, r, s: 0 });
            neighbors.push({ q, r, s: 1 });
            neighbors.push({ q, r, s: 2 });
        } else {
            neighbors.push({ q, r, s: 3 });

            if (isUp) {
                if (s === 0) {
                    neighbors.push({ q: q - 1, r: r, s: 2 });
                    neighbors.push({ q: q + 1, r: r, s: 1 });
                } else if (s === 1) {
                    neighbors.push({ q: q - 1, r: r, s: 0 });
                    neighbors.push({ q: q, r: r + 1, s: 1 });
                } else if (s === 2) {
                    neighbors.push({ q: q + 1, r: r, s: 0 });
                    neighbors.push({ q: q, r: r + 1, s: 2 });
                }
            } else {
                if (s === 0) {
                    neighbors.push({ q: q - 1, r: r, s: 2 });
                    neighbors.push({ q: q + 1, r: r, s: 1 });
                } else if (s === 1) {
                    neighbors.push({ q: q - 1, r: r, s: 0 });
                    neighbors.push({ q: q, r: r - 1, s: 1 });
                } else if (s === 2) {
                    neighbors.push({ q: q + 1, r: r, s: 0 });
                    neighbors.push({ q: q, r: r - 1, s: 2 });
                }
            }
        }

        return neighbors;
    }

    getNeighbors(q, r, s) {
        const currentKey = `${q},${r},${s}`;
        let currentTile = this.tileData.get(currentKey);

        // If not found directly, check if this position is part of a multi-hex tile (hub/planet)
        if (!currentTile) {
            // Check if this is part of the hub
            const hubTile = this.tileData.get("0,0,3");
            if (hubTile && hubTile.type === "hub" && hubTile.sprite) {
                const hubKeys = this.spriteKeyMap.get(hubTile.sprite);
                if (hubKeys && hubKeys.has(currentKey)) {
                    currentTile = hubTile;
                }
            }
        }

        if (!currentTile) {
            return [];
        }

        const results = [];
        const seen = new Set();
        const keysToExplore = [];
        const currentSpriteKeys = this.spriteKeyMap.get(currentTile.sprite);

        if (currentTile.type === "movement") {
            keysToExplore.push(currentKey);
        } else {
            // For non-movement tiles that occupy multiple hexes (hub, planets),
            // check all neighboring hexes from edge positions only
            const occupiedHexes = new Set();

            // Get occupied positions from the tile data
            const occupiedPositions = currentTile.occupiedPositions || [
                { q, r },
            ];

            // Collect all occupied hex positions
            occupiedPositions.forEach((pos) => {
                occupiedHexes.add(`${parseInt(pos.q)},${parseInt(pos.r)}`);
            });

            // For hub: only use the 3 edge hexes (indices 1, 3, 5) for neighbor discovery
            // These correspond to NORTH, EAST, WEST edges of the triangular hub
            // Hub occupiedPositions: [(0,0), (1,0), (1,-1), (0,-1), (-1,-1), (-1,0)]
            // Edge hexes: index 1=(1,0), index 3=(0,-1), index 5=(-1,0)
            let edgeHexes;
            if (currentTile.type === "hub" && occupiedPositions.length === 6) {
                edgeHexes = [
                    occupiedPositions[1], // (1, 0) - EAST edge
                    occupiedPositions[3], // (0, -1) - NORTH edge
                    occupiedPositions[5], // (-1, 0) - WEST edge
                ];
            } else {
                // For other non-movement tiles (planets), use all positions
                edgeHexes = occupiedPositions;
            }

            // Get neighbors from edge hexes only
            edgeHexes.forEach((pos) => {
                const hq = parseInt(pos.q);
                const hr = parseInt(pos.r);
                const hexNeighbors = this.getHexNeighbors(hq, hr);

                hexNeighbors.forEach((hexNbr) => {
                    const nbrHexKey = `${hexNbr.q},${hexNbr.r}`;
                    if (occupiedHexes.has(nbrHexKey)) {
                        return; // Skip if neighbor is part of current tile
                    }

                    // Try all sub-positions for this neighboring hex
                    for (let s = 0; s <= 3; s++) {
                        const nbrKey = `${hexNbr.q},${hexNbr.r},${s}`;
                        let nbrTile = this.tileData.get(nbrKey);
                        let canonicalS = s;

                        // If not found in tileData, check spriteKeyMap for multi-hex tiles
                        if (!nbrTile) {
                            const checkKey = `${hexNbr.q},${hexNbr.r},3`;
                            for (const [
                                sprite,
                                keys,
                            ] of this.spriteKeyMap.entries()) {
                                if (keys.has(checkKey)) {
                                    // Find the canonical tile entry for this sprite
                                    for (const [
                                        tileKey,
                                        tileEntry,
                                    ] of this.tileData.entries()) {
                                        if (tileEntry.sprite === sprite) {
                                            nbrTile = tileEntry;
                                            canonicalS = 3; // Non-movement tiles use s=3
                                            break;
                                        }
                                    }
                                    if (nbrTile) break;
                                }
                            }
                        }

                        if (nbrTile) {
                            // Use canonical s value (3 for non-movement, actual s for movement)
                            const finalS = nbrTile.type === "movement" ? s : 3;
                            results.push({
                                q: hexNbr.q,
                                r: hexNbr.r,
                                s: finalS,
                            });
                        }
                    }
                });
            });

            const deduped = Array.from(
                new Map(
                    results.map((r) => [`${r.q},${r.r},${r.s}`, r]),
                ).values(),
            );
            return deduped;
        }

        for (const keyStr of keysToExplore) {
            const [kq, kr, ks] = keyStr.split(",").map(Number);
            const baseNeighbors = this.getTriangleNeighborsBase(kq, kr, ks);

            for (const neighbor of baseNeighbors) {
                const neighborOriginalS = neighbor.s;
                let neighborS = neighborOriginalS;
                let neighborKey = `${neighbor.q},${neighbor.r},${neighborS}`;
                let neighborTile = this.tileData.get(neighborKey);

                if (!neighborTile && neighborS !== 3) {
                    neighborS = 3;
                    neighborKey = `${neighbor.q},${neighbor.r},${neighborS}`;
                    neighborTile = this.tileData.get(neighborKey);
                }

                // Check if this position is part of the hub (hub only registered at 0,0,3)
                if (!neighborTile) {
                    const checkKey = `${neighbor.q},${neighbor.r},3`;
                    const hubTile = this.tileData.get("0,0,3");
                    if (hubTile && hubTile.type === "hub" && hubTile.sprite) {
                        const hubKeys = this.spriteKeyMap.get(hubTile.sprite);
                        if (hubKeys && hubKeys.has(checkKey)) {
                            // This neighbor is part of the hub
                            // Create a virtual tile entry for this hub hex so BFS can traverse it
                            neighborTile = {
                                type: "hub",
                                sprite: hubTile.sprite,
                                q: neighbor.q,
                                r: neighbor.r,
                                s: 3,
                                occupiedPositions: hubTile.occupiedPositions,
                            };
                            neighborKey = checkKey;
                            neighborS = 3;
                        }
                    }
                }
                
                // Also check for other multi-hex tiles in spriteKeyMap
                if (!neighborTile) {
                    const checkKey = `${neighbor.q},${neighbor.r},3`;
                    for (const [sprite, keys] of this.spriteKeyMap.entries()) {
                        if (keys.has(checkKey)) {
                            for (const [tileKey, tileEntry] of this.tileData.entries()) {
                                if (tileEntry.sprite === sprite) {
                                    neighborTile = tileEntry;
                                    neighborKey = checkKey;
                                    neighborS = 3;
                                    break;
                                }
                            }
                            if (neighborTile) break;
                        }
                    }
                }

                if (!neighborTile) {
                    continue;
                }

                if (
                    neighborTile.type === "movement" &&
                    neighborS !== neighborOriginalS
                ) {
                    continue;
                }

                // Back-edge validation: check if neighbor connects back to current tile
                let hasBackEdge = false;
                
                if (neighborTile.type === "hub" || neighborTile.type === "planet" || neighborTile.type === "landing") {
                    // For non-movement tiles (hub, planet), use hex-level adjacency
                    // Check if any of the neighbor's occupied hexes are adjacent to current hex
                    const neighborOccupiedPositions = neighborTile.occupiedPositions || [{ q: neighbor.q, r: neighbor.r }];
                    const [currentQ, currentR] = [kq, kr];
                    
                    hasBackEdge = neighborOccupiedPositions.some((neighborPos) => {
                        const hexNeighbors = this.getHexNeighbors(parseInt(neighborPos.q), parseInt(neighborPos.r));
                        return hexNeighbors.some((hn) => hn.q === currentQ && hn.r === currentR);
                    });
                } else {
                    // For movement tiles, use triangle-level back-edge validation
                    const backNeighbors = this.getTriangleNeighborsBase(
                        neighbor.q,
                        neighbor.r,
                        neighborOriginalS,
                    );
                    hasBackEdge = backNeighbors.some((back) => {
                        const backKey = `${back.q},${back.r},${back.s}`;
                        if (currentTile.type === "movement") {
                            return backKey === keyStr;
                        }
                        return currentSpriteKeys && currentSpriteKeys.has(backKey);
                    });
                }
                
                if (!hasBackEdge) {
                    continue;
                }

                // Allow traversal through hub and landing tiles even if they share the same sprite
                // Only skip same-sprite neighbors for planet tiles
                if (
                    neighborTile.sprite === currentTile.sprite &&
                    currentTile.type !== "movement" &&
                    currentTile.type !== "hub" &&
                    currentTile.type !== "landing"
                ) {
                    continue;
                }

                const canonicalS =
                    neighborTile.type === "movement" ? neighborS : 3;
                const canonicalKey = `${neighborTile.q},${neighborTile.r},${canonicalS}`;

                if (seen.has(canonicalKey)) {
                    continue;
                }

                let canonicalTile = this.tileData.get(canonicalKey);
                if (!canonicalTile) {
                    canonicalTile = {
                        q: neighborTile.q,
                        r: neighborTile.r,
                        s: canonicalS,
                        type: neighborTile.type,
                        sprite: neighborTile.sprite,
                    };
                }

                seen.add(canonicalKey);
                results.push({
                    q: canonicalTile.q,
                    r: canonicalTile.r,
                    s: canonicalS,
                });
            }
        }

        return results;
    }

    highlightReachableTiles(
        startQ,
        startR,
        startS,
        range,
        stealthMode = false,
    ) {
        this.clearHighlights();

        if (range <= 0) return;

        try {
            // Identify occupied tiles so we do not path through ships (unless stealth mode)
            const occupiedTiles = new Set();
            if (!stealthMode) {
                this.players.forEach((p) => {
                    if (p.id !== this.socket.id && p.ship) {
                        const sPos =
                            p.ship.position.s !== undefined
                                ? p.ship.position.s
                                : 3;
                        let occKey = `${p.ship.position.q},${p.ship.position.r},${sPos}`;
                        let occTile = this.tileData.get(occKey);
                        if (!occTile && sPos !== 3) {
                            occKey = `${p.ship.position.q},${p.ship.position.r},3`;
                            occTile = this.tileData.get(occKey);
                        }
                        if (occTile && occTile.type !== "movement") {
                            occKey = `${p.ship.position.q},${p.ship.position.r},3`;
                        }
                        // Only add to occupied set if the tile doesn't allow multiple players
                        // Hub and planets allow multiple players, so don't block pathfinding
                        if (
                            occTile &&
                            occTile.type !== "hub" &&
                            occTile.type !== "planet"
                        ) {
                            occupiedTiles.add(occKey);
                        }
                    }
                });
            }

            const q = parseInt(startQ);
            const r = parseInt(startR);
            const s = parseInt(startS);
            let startKey = `${q},${r},${s}`;
            let startTile = this.tileData.get(startKey);
            if (!startTile && s !== 3) {
                startKey = `${q},${r},${3}`;
                startTile = this.tileData.get(startKey);
            }

            // Check if this position is part of the hub (even if not the center hex)
            if (!startTile) {
                const hubTile = this.tileData.get("0,0,3");
                if (hubTile && hubTile.type === "hub" && hubTile.sprite) {
                    const hubKeys = this.spriteKeyMap.get(hubTile.sprite);
                    const checkKey = `${q},${r},3`;
                    if (hubKeys && hubKeys.has(checkKey)) {
                        startTile = hubTile;
                    }
                }
            }

            const startSCanonical =
                startTile && startTile.type !== "movement" ? 3 : s;
            startKey = `${q},${r},${startSCanonical}`;

            // For hub/planet tiles, we need to start BFS from ALL occupied hexes
            const queue = [];
            const bestDistances = new Map();

            if (
                startTile &&
                startTile.occupiedPositions &&
                startTile.occupiedPositions.length > 1
            ) {
                // Add all occupied positions to the initial queue with distance 0
                startTile.occupiedPositions.forEach((pos) => {
                    const initKey = `${parseInt(pos.q)},${parseInt(pos.r)},${startSCanonical}`;
                    if (!bestDistances.has(initKey)) {
                        queue.push({
                            q: parseInt(pos.q),
                            r: parseInt(pos.r),
                            s: startSCanonical,
                            dist: 0,
                        });
                        bestDistances.set(initKey, 0);
                    }
                });
            } else {
                queue.push({ q, r, s: startSCanonical, dist: 0 });
                bestDistances.set(startKey, 0);
            }

            let iterations = 0;
            const maxIterations = 1000;

            while (queue.length > 0 && iterations < maxIterations) {
                iterations++;
                // Process the lowest-cost entry first (queue is small, so sort on-demand)
                queue.sort((a, b) => a.dist - b.dist);
                const current = queue.shift();
                const currentKey = `${current.q},${current.r},${current.s}`;
                const recorded = bestDistances.get(currentKey);

                if (recorded === undefined || current.dist > recorded) {
                    continue;
                }

                if (current.dist > range) {
                    continue;
                }

                let currentTileData = this.tileData.get(currentKey);

                // Check if current position is part of the hub (hub only registered at 0,0,3)
                if (!currentTileData) {
                    const hubTile = this.tileData.get("0,0,3");
                    if (hubTile && hubTile.type === "hub" && hubTile.sprite) {
                        const hubKeys = this.spriteKeyMap.get(hubTile.sprite);
                        const checkKey = `${current.q},${current.r},3`;
                        if (hubKeys && hubKeys.has(checkKey)) {
                            currentTileData = hubTile;
                        }
                    }
                }

                // Also check for other multi-hex tiles via spriteKeyMap
                if (!currentTileData) {
                    const checkKey = `${current.q},${current.r},3`;
                    for (const [sprite, keys] of this.spriteKeyMap.entries()) {
                        if (keys.has(checkKey)) {
                            for (const [
                                tileKey,
                                tileEntry,
                            ] of this.tileData.entries()) {
                                if (tileEntry.sprite === sprite) {
                                    currentTileData = tileEntry;
                                    break;
                                }
                            }
                            if (currentTileData) break;
                        }
                    }
                }

                const currentSpriteKeys = currentTileData
                    ? this.spriteKeyMap.get(currentTileData.sprite)
                    : null;

                if (
                    currentTileData &&
                    currentTileData.type === "teleportation"
                ) {
                    const destinations = this.teleporterMap
                        ? this.teleporterMap.get(currentKey)
                        : null;
                    if (destinations && destinations.length > 0) {
                        destinations.forEach((destKey) => {
                            const destTile = this.tileData.get(destKey);
                            if (!destTile) {
                                return;
                            }

                            // Teleportation costs 1 move
                            const teleportDist = current.dist + 1;
                            if (teleportDist > range) {
                                return;
                            }

                            const occupancyKey =
                                destTile.type === "movement"
                                    ? destKey
                                    : `${destTile.q},${destTile.r},3`;
                            const blocked =
                                !stealthMode &&
                                (destTile.type === "asteroid_belt" ||
                                    destTile.type === "black_hole");
                            const destAllowsMultiple =
                                destTile.type === "hub" ||
                                destTile.type === "planet";
                            if (
                                blocked ||
                                (!stealthMode &&
                                    !destAllowsMultiple &&
                                    occupiedTiles.has(occupancyKey))
                            ) {
                                return;
                            }

                            const existingTeleDist = bestDistances.get(destKey);
                            if (
                                existingTeleDist !== undefined &&
                                existingTeleDist <= teleportDist
                            ) {
                                return;
                            }

                            bestDistances.set(destKey, teleportDist);
                            const [tq, tr, ts] = destKey.split(",").map(Number);
                            queue.push({
                                q: tq,
                                r: tr,
                                s: ts,
                                dist: teleportDist,
                            });
                        });
                    }
                }

                if (current.dist >= range) {
                    continue;
                }

                const neighbors = this.getNeighbors(
                    current.q,
                    current.r,
                    current.s,
                );

                for (const neighbor of neighbors) {
                    let neighborS = neighbor.s;
                    let key = `${neighbor.q},${neighbor.r},${neighborS}`;
                    let tile = this.tileData.get(key);

                    if (!tile && neighborS !== 3) {
                        neighborS = 3;
                        key = `${neighbor.q},${neighbor.r},${neighborS}`;
                        tile = this.tileData.get(key);
                    }

                    // Check if this position is part of a multi-hex tile (hub, planet, asteroid, etc.)
                    // These tiles only have one entry in tileData but all positions in spriteKeyMap
                    if (!tile) {
                        const checkKey = `${neighbor.q},${neighbor.r},3`;

                        // Check hub first
                        const hubTile = this.tileData.get("0,0,3");
                        if (
                            hubTile &&
                            hubTile.type === "hub" &&
                            hubTile.sprite
                        ) {
                            const hubKeys = this.spriteKeyMap.get(
                                hubTile.sprite,
                            );
                            if (hubKeys && hubKeys.has(checkKey)) {
                                tile = hubTile;
                                // Keep the actual neighbor position for multi-hex tiles
                                key = checkKey;
                                neighborS = 3;
                            }
                        }

                        // If not hub, check all other tiles via spriteKeyMap (planets, asteroids, black holes, etc.)
                        if (!tile) {
                            for (const [
                                sprite,
                                keys,
                            ] of this.spriteKeyMap.entries()) {
                                if (keys.has(checkKey)) {
                                    // Find this sprite's canonical tileData entry
                                    for (const [
                                        tileKey,
                                        tileEntry,
                                    ] of this.tileData.entries()) {
                                        if (tileEntry.sprite === sprite) {
                                            tile = tileEntry;
                                            // Keep the actual neighbor position for multi-hex tiles
                                            key = checkKey;
                                            neighborS = 3;
                                            break;
                                        }
                                    }
                                    if (tile) break;
                                }
                            }
                        }
                    }

                    if (!tile) {
                        continue;
                    }

                    if (tile.type === "movement" && neighborS !== neighbor.s) {
                        continue;
                    }

                    // Back-edge validation
                    let hasBackEdge = false;

                    if (tile.type === "movement") {
                        // Neighbor is a movement tile - use triangle-level back-edge validation
                        const backNeighbors = this.getTriangleNeighborsBase(
                            neighbor.q,
                            neighbor.r,
                            neighborS,
                        );

                        if (
                            currentTileData &&
                            currentTileData.type === "movement"
                        ) {
                            // Movement to movement: exact position match
                            hasBackEdge = backNeighbors.some((back) => {
                                const backKey = `${back.q},${back.r},${back.s}`;
                                return backKey === currentKey;
                            });
                        } else if (
                            currentTileData &&
                            currentTileData.occupiedPositions
                        ) {
                            // Non-movement (hub/planet) to movement: check if back-neighbor hex is in bestDistances
                            // Since we now track each hex position separately, check if any back-neighbor hex
                            // with s=3 (the canonical s for non-movement tiles) is in bestDistances
                            hasBackEdge = backNeighbors.some((back) => {
                                const backHexKey = `${back.q},${back.r},3`;
                                return bestDistances.has(backHexKey);
                            });
                        } else {
                            // Fallback to spriteKeyMap
                            const backNeighbors = this.getTriangleNeighborsBase(
                                neighbor.q,
                                neighbor.r,
                                neighborS,
                            );
                            hasBackEdge = backNeighbors.some((back) => {
                                const backKey = `${back.q},${back.r},${back.s}`;
                                return (
                                    currentSpriteKeys &&
                                    currentSpriteKeys.has(backKey)
                                );
                            });
                        }
                    } else {
                        // Neighbor is a non-movement tile (planet, hub, etc.) - use hex-level validation
                        // Check if current tile's hex is adjacent to neighbor's hex(es)
                        const [currentQ, currentR] = [current.q, current.r];
                        const neighborOccupiedPositions =
                            tile.occupiedPositions || [
                                { q: neighbor.q, r: neighbor.r },
                            ];

                        // For non-movement tiles, check hex adjacency
                        hasBackEdge = neighborOccupiedPositions.some(
                            (neighborPos) => {
                                const hexNeighbors = this.getHexNeighbors(
                                    neighborPos.q,
                                    neighborPos.r,
                                );
                                return hexNeighbors.some(
                                    (hn) =>
                                        hn.q === currentQ && hn.r === currentR,
                                );
                            },
                        );
                    }

                    if (!hasBackEdge) {
                        continue;
                    }

                    // Every movement costs 1
                    let stepCost = 1;

                    const occupancyKey =
                        tile.type === "movement"
                            ? key
                            : `${tile.q},${tile.r},3`;
                    const isBlocked =
                        !stealthMode &&
                        (tile.type === "asteroid_belt" ||
                            tile.type === "black_hole");
                    const allowsMultiplePlayers =
                        tile.type === "hub" || tile.type === "planet";
                    const isOccupied =
                        !stealthMode &&
                        !allowsMultiplePlayers &&
                        occupiedTiles.has(occupancyKey);

                    // Blocked tiles (asteroids, black holes) cannot be traversed at all
                    // This prevents pathfinding through them to reach tiles beyond
                    if (isBlocked || isOccupied) {
                        continue;
                    }

                    // Teleporters offer optional teleportation but don't block normal movement
                    // Teleportation is free - walking to teleporter costs 1, then you appear at destination
                    if (tile.type === "teleportation") {
                        const teleporterKey = key;
                        const destinations = this.teleporterMap
                            ? this.teleporterMap.get(teleporterKey)
                            : null;

                        if (destinations && destinations.length > 0) {
                            const distAfterStep = current.dist + stepCost; // No extra cost for teleporting
                            if (distAfterStep <= range) {
                                destinations.forEach((destKey) => {
                                    const destTile = this.tileData.get(destKey);
                                    if (!destTile) {
                                        return;
                                    }

                                    const destOccupancyKey =
                                        destTile.type === "movement"
                                            ? destKey
                                            : `${destTile.q},${destTile.r},3`;
                                    const blocked =
                                        !stealthMode &&
                                        (destTile.type === "asteroid_belt" ||
                                            destTile.type === "black_hole");
                                    const destAllowsMultiple =
                                        destTile.type === "hub" ||
                                        destTile.type === "planet";
                                    if (
                                        blocked ||
                                        (!stealthMode &&
                                            !destAllowsMultiple &&
                                            occupiedTiles.has(destOccupancyKey))
                                    ) {
                                        return;
                                    }

                                    const prevBestTele =
                                        bestDistances.get(destKey);
                                    if (
                                        prevBestTele !== undefined &&
                                        distAfterStep >= prevBestTele
                                    ) {
                                        return;
                                    }

                                    bestDistances.set(destKey, distAfterStep);
                                    const [dq, dr, ds] = destKey
                                        .split(",")
                                        .map(Number);
                                    queue.push({
                                        q: dq,
                                        r: dr,
                                        s: ds,
                                        dist: distAfterStep,
                                    });
                                });
                            }
                        }
                        // Don't continue - allow normal movement through teleporter
                    }

                    const dist = current.dist + stepCost;

                    if (dist > range) {
                        continue;
                    }

                    // For multi-hex tiles (hub, planets), use canonical key so only one entry is created
                    // This ensures only one marker and allows BFS to continue through the tile
                    let canonicalKey = key;
                    let queueQ = neighbor.q;
                    let queueR = neighbor.r;
                    let queueS = neighborS;
                    
                    if (tile.type === "hub" || tile.type === "planet" || tile.type === "landing") {
                        // Use the tile's registered position as canonical key
                        canonicalKey = `${tile.q},${tile.r},3`;
                        queueQ = tile.q;
                        queueR = tile.r;
                        queueS = 3;
                    }

                    const prevBest = bestDistances.get(canonicalKey);
                    if (prevBest !== undefined && dist >= prevBest) {
                        continue;
                    }

                    bestDistances.set(canonicalKey, dist);
                    queue.push({
                        q: queueQ,
                        r: queueR,
                        s: queueS,
                        dist,
                    });
                }
            }

            let highlightCount = 0;

            for (const [key, dist] of bestDistances.entries()) {
                if (dist <= 0 || dist > range) {
                    continue;
                }

                highlightCount++;

                let tile = this.tileData.get(key);
                
                // If not found directly, check for multi-hex tiles (hub, planets) via spriteKeyMap
                if (!tile) {
                    const checkKey = key.endsWith(",3") ? key : key.replace(/,\d+$/, ",3");
                    
                    // Check hub first
                    const hubTile = this.tileData.get("0,0,3");
                    if (hubTile && hubTile.type === "hub" && hubTile.sprite) {
                        const hubKeys = this.spriteKeyMap.get(hubTile.sprite);
                        if (hubKeys && hubKeys.has(checkKey)) {
                            tile = hubTile;
                        }
                    }
                    
                    // Check other multi-hex tiles via spriteKeyMap
                    if (!tile) {
                        for (const [sprite, keys] of this.spriteKeyMap.entries()) {
                            if (keys.has(checkKey)) {
                                for (const [tileKey, tileEntry] of this.tileData.entries()) {
                                    if (tileEntry.sprite === sprite) {
                                        tile = tileEntry;
                                        break;
                                    }
                                }
                                if (tile) break;
                            }
                        }
                    }
                }
                
                if (!tile) {
                    continue;
                }

                // Skip asteroids and black holes as landing spots (even in stealth mode)
                if (
                    tile.type === "asteroid_belt" ||
                    tile.type === "black_hole"
                ) {
                    continue;
                }

                const [moveQ, moveR, moveS] = key.split(",").map(Number);
                const spr = tile.sprite;

                if (
                    tile.type === "movement" &&
                    spr.subHitAreas &&
                    spr.subHitAreas.length > 0
                ) {
                    let highlightRecord = this.highlightedTiles.find(
                        (ht) => ht.sprite === spr,
                    );

                    if (!highlightRecord) {
                        highlightRecord = tile;
                        this.highlightedTiles.push(highlightRecord);
                    }

                    const subHit = spr.subHitAreas.find(
                        (sh) => sh.subIndex === moveS,
                    );
                    if (!subHit) {
                        console.warn(
                            `[HIGHLIGHT] Could not find subHit for s=${moveS} at ${moveQ},${moveR}. Available indices:`,
                            spr.subHitAreas.map((sh) => sh.subIndex),
                        );
                        continue;
                    }

                    const subSprite = subHit.sprite;

                    if (subSprite.clickHandler) {
                        subSprite.off("pointerdown", subSprite.clickHandler);
                        subSprite.clickHandler = null;
                    }

                    subSprite.moveData = { q: moveQ, r: moveR, s: moveS, dist };

                    const handler = (() => {
                        const targetQ = moveQ;
                        const targetR = moveR;
                        const targetS = moveS;
                        const cost = dist;
                        return () => {
                            console.log(
                                `CLICKED SUB-TRIANGLE S=${targetS}: Moving to Q=${targetQ}, R=${targetR}, S=${targetS}, Cost=${cost}`,
                            );
                            this.debugText.setText(
                                `CLICKED: Q=${targetQ}, R=${targetR}, S=${targetS}, Cost=${cost}`,
                            );
                            this.socket.emit("moveShip", {
                                q: targetQ,
                                r: targetR,
                                s: targetS,
                                cost,
                            });
                            this.clearHighlights();
                        };
                    })();

                    subSprite.on("pointerdown", handler);
                    subSprite.clickHandler = handler;

                    const marker = this.addHighlightMarker(moveQ, moveR, moveS);
                    if (marker) {
                        marker.moveData = {
                            q: moveQ,
                            r: moveR,
                            s: moveS,
                            dist,
                        };
                        marker.setInteractive({ useHandCursor: true });
                        const markerHandler = () => {
                            this.debugText.setText(
                                `CLICKED: Q=${moveQ}, R=${moveR}, S=${moveS}, Cost=${dist}`,
                            );
                            this.socket.emit("moveShip", {
                                q: moveQ,
                                r: moveR,
                                s: moveS,
                                cost: dist,
                            });
                            this.clearHighlights();
                        };
                        marker.on("pointerdown", markerHandler);
                        marker.clickHandler = markerHandler;
                    }

                    console.log(
                        `[HIGHLIGHT] Added handler to sub-triangle ${moveQ},${moveR},${moveS} at dist ${dist}`,
                    );
                } else {
                    let highlightRecord = this.highlightedTiles.find(
                        (ht) => ht.sprite === spr,
                    );

                    if (!highlightRecord) {
                        if (spr.setInteractive) {
                            spr.setInteractive();
                        }

                        highlightRecord = tile;
                        highlightRecord.moveOptions = [];
                        highlightRecord.clickHandlers = [];

                        const handler = () => {
                            if (
                                highlightRecord.moveOptions &&
                                highlightRecord.moveOptions.length > 0
                            ) {
                                highlightRecord.moveOptions.sort(
                                    (a, b) => a.dist - b.dist,
                                );
                                const bestMove = highlightRecord.moveOptions[0];
                                console.log(
                                    `CLICKED NON-MOVEMENT: Moving to Q=${bestMove.q}, R=${bestMove.r}, S=${bestMove.s}, Cost=${bestMove.dist}, Type=${bestMove.type}`,
                                );
                                this.debugText.setText(
                                    `CLICKED: Q=${bestMove.q}, R=${bestMove.r}, S=${bestMove.s}, Cost=${bestMove.dist}, Type=${bestMove.type}`,
                                );
                                this.socket.emit("moveShip", {
                                    q: bestMove.q,
                                    r: bestMove.r,
                                    s: bestMove.s,
                                    cost: bestMove.dist,
                                });
                                this.clearHighlights();
                            }
                        };

                        highlightRecord.clickHandlers.push(handler);
                        if (spr.on) {
                            spr.on("pointerdown", handler);
                        }

                        this.highlightedTiles.push(highlightRecord);
                    }

                    if (!highlightRecord.moveOptions) {
                        highlightRecord.moveOptions = [];
                    }

                    highlightRecord.moveOptions.push({
                        q: moveQ,
                        r: moveR,
                        s: moveS,
                        dist,
                        type: tile.type,
                    });

                    const marker = this.addHighlightMarker(moveQ, moveR, moveS);
                    if (marker) {
                        marker.moveData = {
                            q: moveQ,
                            r: moveR,
                            s: moveS,
                            dist,
                        };
                        marker.setInteractive({ useHandCursor: true });
                        const markerHandler = () => {
                            if (
                                highlightRecord.moveOptions &&
                                highlightRecord.moveOptions.length > 0
                            ) {
                                highlightRecord.moveOptions.sort(
                                    (a, b) => a.dist - b.dist,
                                );
                                const bestMove = highlightRecord.moveOptions[0];
                                this.debugText.setText(
                                    `CLICKED: Q=${bestMove.q}, R=${bestMove.r}, S=${bestMove.s}, Cost=${bestMove.dist}, Type=${bestMove.type}`,
                                );
                                this.socket.emit("moveShip", {
                                    q: bestMove.q,
                                    r: bestMove.r,
                                    s: bestMove.s,
                                    cost: bestMove.dist,
                                });
                                this.clearHighlights();
                            }
                        };
                        marker.on("pointerdown", markerHandler);
                        marker.clickHandler = markerHandler;
                    }

                    console.log(
                        `[HIGHLIGHT] Added handler to non-movement tile ${moveQ},${moveR},${moveS} at dist ${dist}`,
                    );
                }
            }
        } catch (error) {
            console.error("Error in highlightReachableTiles:", error);
        }
    }

    clearHighlights() {
        this.highlightedTiles.forEach((tile) => {
            const spr = tile.sprite;

            // For movement tiles with sub-triangles, clean up each sub-sprite individually
            if (
                tile.type === "movement" &&
                spr.subHitAreas &&
                spr.subHitAreas.length > 0
            ) {
                spr.subHitAreas.forEach((subHit) => {
                    const subSprite = subHit.sprite;

                    // Remove click handler
                    if (subSprite.clickHandler) {
                        subSprite.off("pointerdown", subSprite.clickHandler);
                        delete subSprite.clickHandler;
                    }
                    if (subSprite.moveData) {
                        delete subSprite.moveData;
                    }
                    // Keep sub-triangles interactive for hover events
                });
            } else {
                // For non-movement tiles, reset tint and remove handlers
                // Remove click handlers and disable interactivity
                if (tile.clickHandlers && spr.off) {
                    tile.clickHandlers.forEach((handler) => {
                        spr.off("pointerdown", handler);
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

        if (this.highlightMarkers && this.highlightMarkers.length > 0) {
            this.highlightMarkers.forEach((marker) => {
                if (marker && marker.destroy) {
                    if (marker.clickHandler && marker.off) {
                        marker.off("pointerdown", marker.clickHandler);
                        delete marker.clickHandler;
                    }
                    marker.destroy();
                }
            });
            this.highlightMarkers = [];
        }
    }

    renderShips(players) {
        console.log("Rendering ships. Players:", players.length);
        console.log("GameScene renderShips - this.socket:", this.socket);
        console.log(
            "GameScene renderShips - this.socket.id:",
            this.socket ? this.socket.id : "NO SOCKET",
        );
        if (!this.shipsGroup) {
            this.shipsGroup = this.add.group();
        }
        this.shipsGroup.clear(true, true);

        const scale = this.gridScale || 100; // Should match grid scale
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;
        const offsetX = this.boardOffset ? this.boardOffset.x : 0;
        const offsetY = this.boardOffset ? this.boardOffset.y : 0;

        const socketId = this.socket ? this.socket.id : null;
        this.myPlayer = players.find((p) => p.socketId === socketId);
        if (this.myPlayer) {
            console.log(
                "My Player found. Moves Left:",
                this.myPlayer.movesLeft,
            );
            console.log("My Player ship:", this.myPlayer.ship);
        } else {
            console.log("My Player NOT found. Socket ID:", socketId);
        }

        players.forEach((player) => {
            console.log(
                `Rendering player ${player.name}: has ship?`,
                !!player.ship,
            );
            if (player.ship) {
                console.log(`  Ship position:`, player.ship.position);
                const q = parseInt(player.ship.position.q);
                const r = parseInt(player.ship.position.r);
                const s =
                    player.ship.position.s !== undefined
                        ? parseInt(player.ship.position.s)
                        : 3;

                const { x, y } = this.axialToPixel(q, r, scale);

                // Calculate sub-tile offset
                let subX = 0;
                let subY = 0;
                const isUp = Math.abs(q + r) % 2 === 0;

                // Use the same centroid math as renderBoard so ships align with sub-triangles.
                const sSide = scale;
                const H = (sSide * Math.sqrt(3)) / 2;
                const topCentroidY = -H / 3;
                const cornerCentroidY = H / 6;
                const leftX = -sSide / 4;
                const rightX = sSide / 4;

                if (isUp) {
                    if (s === 0) {
                        // Top
                        subX = 0;
                        subY = topCentroidY;
                    } else if (s === 1) {
                        // Bottom-left
                        subX = leftX;
                        subY = cornerCentroidY;
                    } else if (s === 2) {
                        // Bottom-right
                        subX = rightX;
                        subY = cornerCentroidY;
                    } else {
                        // center
                        subX = 0;
                        subY = 0;
                    }
                } else {
                    if (s === 0) {
                        // Bottom
                        subX = 0;
                        subY = -topCentroidY;
                    } else if (s === 1) {
                        // Top-left
                        subX = leftX;
                        subY = -cornerCentroidY;
                    } else if (s === 2) {
                        // Top-right
                        subX = rightX;
                        subY = -cornerCentroidY;
                    } else {
                        // center
                        subX = 0;
                        subY = 0;
                    }
                }

                // Draw ship as a circle for now
                const shipX = Math.round(centerX + x + subX + offsetX);
                const shipY = Math.round(centerY + y + subY + offsetY);
                console.log(
                    `[SHIP RENDER] Drawing ship for ${player.name} at (${shipX}, ${shipY}) color: ${player.color}`,
                );

                const shipGraphics = this.add.graphics();
                const colorHex = player.color
                    ? parseInt(player.color.substring(1), 16)
                    : 0xff6b6b;
                console.log(
                    `[SHIP RENDER] Converted color from ${player.color} to ${colorHex.toString(16)}`,
                );
                shipGraphics.fillStyle(colorHex, 1);
                shipGraphics.fillCircle(0, 0, 10); // Smaller ship for sub-tiles
                shipGraphics.lineStyle(2, 0xffffff);
                shipGraphics.strokeCircle(0, 0, 10);

                console.log(
                    `[SHIP RENDER] Creating container at (${shipX}, ${shipY})`,
                );
                const container = this.add.container(shipX, shipY, [
                    shipGraphics,
                ]);
                this.shipsGroup.add(container);
                container.setDepth(3); // Above tiles (depth 2) but allow click-through
                console.log(
                    `[SHIP RENDER] Container created, depth: ${container.depth}`,
                );

                // Add player name above ship
                const nameText = this.add
                    .text(0, -20, player.name, {
                        font: "10px Arial",
                        fill: "#ffffff",
                        stroke: "#000000",
                        strokeThickness: 2,
                    })
                    .setOrigin(0.5);
                container.add(nameText);

                // Make my ship interactive but allow events to pass through to tiles below
                if (
                    this.myPlayer &&
                    player.socketId === this.myPlayer.socketId
                ) {
                    console.log(
                        "Making my ship interactive for player:",
                        player.name,
                    );
                    const hitArea = new Phaser.Geom.Circle(0, 0, 20);
                    container.setInteractive(
                        hitArea,
                        Phaser.Geom.Circle.Contains,
                    );

                    // Stop event propagation so ship click doesn't also trigger tile clicks
                    container.on(
                        "pointerdown",
                        (pointer, localX, localY, event) => {
                            console.log(
                                "Pointer down on ship. Moves:",
                                this.myPlayer.movesLeft,
                                "Phase:",
                                this.turnPhase,
                            );
                            event.stopPropagation(); // Prevent tile clicks when clicking ship
                            if (
                                this.myPlayer.movesLeft > 0 &&
                                this.turnPhase === "move"
                            ) {
                                const stealthMode =
                                    this.myPlayer.stealth || false;
                                this.highlightReachableTiles(
                                    q,
                                    r,
                                    s,
                                    this.myPlayer.movesLeft,
                                    stealthMode,
                                );
                            }
                        },
                    );

                    // Add hover event that doesn't block tile hovers
                    container.on(
                        "pointermove",
                        (pointer, localX, localY, event) => {
                            // Don't stop propagation for hover - let tiles underneath show their info too
                        },
                    );
                }
            }
        });
    }

    areNeighbors(pos1, pos2) {
        const dq = pos1.q - pos2.q;
        const dr = pos1.r - pos2.r;
        const isUp = Math.abs(pos1.q + pos1.r) % 2 === 0;

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

    createGlowParticleTexture() {
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });
        const size = 32;
        const center = size / 2;

        for (let r = center; r > 0; r--) {
            const alpha = (1 - r / center) * 0.8;
            graphics.fillStyle(0xff0000, alpha);
            graphics.fillCircle(center, center, r);
        }
        graphics.generateTexture("glowParticle", size, size);
        graphics.destroy();
    }

    createTeleporterEffect(x, y, scale, isUp) {
        const container = this.add.container(x, y);

        const side = scale;
        const H = (side * Math.sqrt(3)) / 2;

        let p1, p2, p3;
        if (isUp) {
            p1 = { x: 0, y: (-H * 2) / 3 };
            p2 = { x: -side / 2, y: H / 3 };
            p3 = { x: side / 2, y: H / 3 };
        } else {
            p1 = { x: 0, y: (H * 2) / 3 };
            p2 = { x: -side / 2, y: -H / 3 };
            p3 = { x: side / 2, y: -H / 3 };
        }

        const maskGraphics = this.make.graphics({ x: x, y: y, add: false });
        maskGraphics.fillStyle(0xffffff);
        maskGraphics.beginPath();
        maskGraphics.moveTo(p1.x, p1.y);
        maskGraphics.lineTo(p2.x, p2.y);
        maskGraphics.lineTo(p3.x, p3.y);
        maskGraphics.closePath();
        maskGraphics.fillPath();

        const mask = maskGraphics.createGeometryMask();

        const bgGraphics = this.add.graphics();
        bgGraphics.fillStyle(0x000000, 1.0);
        bgGraphics.beginPath();
        bgGraphics.moveTo(p1.x, p1.y);
        bgGraphics.lineTo(p2.x, p2.y);
        bgGraphics.lineTo(p3.x, p3.y);
        bgGraphics.closePath();
        bgGraphics.fillPath();
        container.add(bgGraphics);

        const glowGraphics = this.add.graphics();
        container.add(glowGraphics);

        const drawGlow = (phase) => {
            glowGraphics.clear();
            const pulseAlpha = 0.4 + 0.4 * Math.sin(phase);

            // Draw 11 triangular rings from outer edge (1.0) to center (0.0)
            for (let i = 0; i <= 10; i++) {
                // Factor goes from 1.0 (outer edge) to 0.0 (center)
                const factor = 1.0 - i / 10;
                const alpha = pulseAlpha * (0.2 + 0.8 * factor);
                glowGraphics.lineStyle(2, 0xff0000, alpha);
                glowGraphics.beginPath();
                glowGraphics.moveTo(p1.x * factor, p1.y * factor);
                glowGraphics.lineTo(p2.x * factor, p2.y * factor);
                glowGraphics.lineTo(p3.x * factor, p3.y * factor);
                glowGraphics.closePath();
                glowGraphics.strokePath();
            }
        };

        let phase = Math.random() * Math.PI * 2;
        const updateGlow = () => {
            phase += 0.05;
            drawGlow(phase);
        };

        drawGlow(phase);

        const glowTimer = this.time.addEvent({
            delay: 50,
            callback: updateGlow,
            loop: true,
        });

        container.setMask(mask);
        container.setDepth(1);

        container.teleporterCleanup = () => {
            try {
                glowTimer.remove();
                bgGraphics.destroy();
                glowGraphics.destroy();
                maskGraphics.destroy();
                if (mask && mask.destroy) mask.destroy();
            } catch (e) {
                console.warn("Teleporter cleanup error:", e);
            }
        };

        return container;
    }

    cleanupTeleporterEffects() {
        if (this.teleporterEffects) {
            this.teleporterEffects.forEach((effect) => {
                try {
                    if (effect.teleporterCleanup) {
                        effect.teleporterCleanup();
                    }
                    if (effect.destroy) {
                        effect.destroy();
                    }
                } catch (e) {
                    console.warn("Teleporter effect cleanup error:", e);
                }
            });
            this.teleporterEffects = [];
        }
        // Clear the teleporter layer
        if (this.teleporterLayer) {
            this.teleporterLayer.removeAll(true);
        }
    }

    resize(gameSize) {
        const width = gameSize.width;
        const height = gameSize.height;
        this.cameras.main.setSize(width, height);
        if (this.starfield1) this.starfield1.setSize(width, height);
        if (this.starfield2) this.starfield2.setSize(width, height);
        if (this.starfield3) this.starfield3.setSize(width, height);

        // Update splash screen position and size for bottom right quadrant
        if (this.splashScreen) {
            const splashWidth = width / 2;
            const splashHeight = height / 2;
            const splashX = width - splashWidth / 2;
            const splashY = height - splashHeight / 2;
            this.splashScreen.setPosition(splashX, splashY);

            // Scale to fit quadrant while maintaining aspect ratio
            const imgWidth = this.splashScreen.texture.source[0].width;
            const imgHeight = this.splashScreen.texture.source[0].height;
            const scaleX = splashWidth / imgWidth;
            const scaleY = splashHeight / imgHeight;
            const scale = Math.min(scaleX, scaleY);
            this.splashScreen.setScale(scale);
        }

        // Re-render board and ships with new camera dimensions to fix positioning
        if (this.lastBoardData) {
            this.renderBoard(this.lastBoardData);
            if (this.players) {
                this.renderShips(this.players);

                // Re-highlight movement markers if current player has moves AND in move phase
                const myPlayer = this.players.find(
                    (p) => p.socketId === this.socket.id,
                );
                if (
                    myPlayer &&
                    myPlayer.movesLeft > 0 &&
                    myPlayer.ship &&
                    myPlayer.ship.position &&
                    this.turnPhase === "move"
                ) {
                    const pos = myPlayer.ship.position;
                    const stealthMode = myPlayer.stealth || false;
                    this.highlightReachableTiles(
                        pos.q,
                        pos.r,
                        pos.s,
                        myPlayer.movesLeft,
                        stealthMode,
                    );
                }
            }
        }
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
        const h = (s * Math.sqrt(3)) / 2;
        const parity = Math.abs(q + r) % 2; // 0 for up, 1 for down

        const x = q * (s / 2);
        const y = r * h - (parity ? h / 3 : 0);

        return { x, y };
    }

    updateMarketBadges() {
        if (!this.planetMarkets) return;
        this.planetMarkets.forEach((market, key) => {
            const [q, r] = key.split(",").map(Number);
            this.updateMarketBadge(q, r, market);
        });
    }

    updateMarketBadge(q, r, market) {
        if (!this.planetSprites) return;
        const key = `${q},${r}`;
        const planetData = this.planetSprites.get(key);
        if (!planetData) return;

        if (planetData.marketBadge) {
            planetData.marketBadge.destroy();
        }

        const { x: spriteX, y: spriteY } = planetData;
        const colorMap = {
            red: 0xff0000,
            blue: 0x0000ff,
            green: 0x00ff00,
            yellow: 0xffff00,
            wild: 0xffffff,
        };
        const typeSymbols = {
            food: "F",
            energy: "E",
            material: "M",
            data: "D",
            wild: "*",
        };

        const badgeContainer = this.add.container(spriteX, spriteY - 40);
        badgeContainer.setDepth(5);

        const badgeBg = this.add.rectangle(0, 0, 50, 25, 0x000000, 0.8);
        badgeBg.setStrokeStyle(2, colorMap[market.color] || 0xffffff);
        badgeContainer.add(badgeBg);

        const typeText = this.add
            .text(0, 0, typeSymbols[market.type] || "?", {
                font: "bold 14px Arial",
                fill: "#ffffff",
            })
            .setOrigin(0.5);
        badgeContainer.add(typeText);

        const colorDot = this.add.circle(
            -15,
            0,
            6,
            colorMap[market.color] || 0xffffff,
        );
        badgeContainer.add(colorDot);

        planetData.marketBadge = badgeContainer;
        this.boardGroup.add(badgeContainer);
    }

    getColorHex(colorName) {
        const colorMap = {
            red: 0xff0000,
            blue: 0x0000ff,
            green: 0x00ff00,
            yellow: 0xffff00,
            wild: 0xffffff,
        };
        return colorMap[colorName] || 0xffffff;
    }
}

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: "game-container",
    scene: [LobbyScene, GameScene, UIScene],
    backgroundColor: "#1a1a1a",
    dom: {
        createContainer: true,
    },
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
};

// Create the game immediately
const game = new Phaser.Game(config);

// Start the lobby scene and pass socket when it's ready
socket.on("connect", () => {
    console.log("Connected to server with socket ID:", socket.id);

    // Check if player was in a game before refresh
    const gameContext = localStorage.getItem("gameContext");
    if (gameContext) {
        try {
            const context = JSON.parse(gameContext);
            console.log("Found game context in localStorage:", context);

            let rejoinSucceeded = false;

            // Listen for rejoin success
            const handleConnectionData = (connectionData) => {
                console.log("Reconnected to game, starting GameScene");
                rejoinSucceeded = true;
                socket.removeListener("error", handleRejoinError);
                game.scene.start("GameScene", {
                    socket: socket,
                    connectionData: connectionData,
                });
            };

            // Listen for rejoin failure
            const handleRejoinError = (errorMsg) => {
                console.warn("Rejoin failed:", errorMsg);
                socket.removeListener("connectionData", handleConnectionData);
                localStorage.removeItem("gameContext");
                // Stop UIScene and GameScene if they were started
                if (game.scene.isActive("UIScene")) {
                    game.scene.stop("UIScene");
                }
                if (game.scene.isActive("GameScene")) {
                    game.scene.stop("GameScene");
                }
                game.scene.start("LobbyScene", { socket: socket });
            };

            socket.once("connectionData", handleConnectionData);
            socket.once("error", handleRejoinError);

            // Try to rejoin the game
            socket.emit("rejoinGame", {
                gameId: context.gameId,
                playerName: context.playerName,
            });

            // Timeout after 5 seconds - if rejoin fails, go to lobby
            setTimeout(() => {
                if (
                    !rejoinSucceeded &&
                    game.scene.isActive("LobbyScene") === false &&
                    game.scene.isActive("GameScene") === false
                ) {
                    console.log("Rejoin timeout, starting LobbyScene");
                    socket.removeListener(
                        "connectionData",
                        handleConnectionData,
                    );
                    socket.removeListener("error", handleRejoinError);
                    localStorage.removeItem("gameContext");
                    // Stop UIScene and GameScene if they were started
                    if (game.scene.isActive("UIScene")) {
                        game.scene.stop("UIScene");
                    }
                    if (game.scene.isActive("GameScene")) {
                        game.scene.stop("GameScene");
                    }
                    game.scene.start("LobbyScene", { socket: socket });
                }
            }, 5000);
        } catch (e) {
            console.error("Error parsing game context:", e);
            localStorage.removeItem("gameContext");
            game.scene.start("LobbyScene", { socket: socket });
        }
    } else {
        // No game context, start with lobby
        game.scene.start("LobbyScene", { socket: socket });
    }
});
