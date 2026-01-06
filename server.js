const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const Game = require('./src/game');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const port = process.env.PORT || 5000;
const host = '0.0.0.0';

app.use(express.static('public'));

// Support multiple games
const games = new Map(); // gameId -> game instance
const gameMetadata = new Map(); // gameId -> { name, hostId, maxPlayers, movementTiles, asteroidBelts, playerCount }
const playerToGame = new Map(); // socketId -> gameId

function generateGameId() {
    return 'game_' + Math.random().toString(36).substring(2, 15);
}

function getAvailableGames() {
    const availableGames = [];
    for (const [gameId, metadata] of gameMetadata.entries()) {
        const game = games.get(gameId);
        if (game && !metadata.started) {
            availableGames.push({
                gameId: gameId,
                name: metadata.name,
                playerCount: game.players.length,
                maxPlayers: metadata.maxPlayers,
                movementTiles: metadata.movementTiles,
                asteroidBelts: metadata.asteroidBelts
            });
        }
    }
    return availableGames;
}

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Handle lobby data request
    socket.on('getLobbyData', () => {
        const availableGames = getAvailableGames();
        socket.emit('lobbyData', { availableGames });
    });

    // Handle game creation
    socket.on('createGame', (data) => {
        console.log('Creating game:', data);
        const gameId = generateGameId();
        const movementTiles = data.movementTiles || 6;
        const game = new Game(movementTiles);
        game.setup([]); // Initialize decks and markets
        
        // Add creator as first player
        const player = game.addPlayer(socket.id, data.playerName || 'Host');
        
        // Store game and metadata
        games.set(gameId, game);
        gameMetadata.set(gameId, {
            name: data.gameName || 'Unnamed Game',
            hostId: socket.id,
            maxPlayers: data.maxPlayers || 4,
            movementTiles: data.movementTiles || 6,
            asteroidBelts: data.asteroidBelts || false,
            started: false,
            currentTurnIndex: 0,
            turnPhase: 'roll'
        });
        
        playerToGame.set(socket.id, gameId);
        
        // Join socket room for this game
        socket.join(gameId);
        
        // Send connection data to creator
        socket.emit('connectionData', {
            id: socket.id,
            gameId: gameId,
            isHost: true,
            gameStarted: false,
            playerName: data.playerName,
            boardState: {
                tiles: game.board.tiles,
                hub: game.board.hub,
                gridScale: game.board.grid.scale
            }
        });
        
        // Broadcast updated game list to lobby
        io.emit('lobbyUpdate', { availableGames: getAvailableGames() });
        
        // Send player list to game room
        io.to(gameId).emit('playersUpdate', game.players);
    });

    // Handle joining a game
    socket.on('joinGame', (data) => {
        console.log('Player joining game:', data);
        const gameId = data.gameId;
        const game = games.get(gameId);
        const metadata = gameMetadata.get(gameId);
        
        if (!game || !metadata) {
            socket.emit('connectionError', 'Game not found.');
            return;
        }
        
        if (metadata.started) {
            socket.emit('connectionError', 'Game has already started.');
            return;
        }
        
        if (game.players.length >= metadata.maxPlayers) {
            socket.emit('connectionError', 'Game is full.');
            return;
        }
        
        // Add player to game
        const player = game.addPlayer(socket.id, data.playerName || `Player ${game.players.length}`);
        playerToGame.set(socket.id, gameId);
        
        // Join socket room for this game
        socket.join(gameId);
        
        // Send connection data to joining player
        socket.emit('connectionData', {
            id: socket.id,
            gameId: gameId,
            isHost: false,
            gameStarted: false,
            playerName: data.playerName,
            boardState: {
                tiles: game.board.tiles,
                hub: game.board.hub,
                gridScale: game.board.grid.scale
            }
        });
        
        // Broadcast updated game list to lobby
        io.emit('lobbyUpdate', { availableGames: getAvailableGames() });
        
        // Send updated player list to all players in game
        io.to(gameId).emit('playersUpdate', game.players);
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
        const gameId = playerToGame.get(socket.id);
        
        if (gameId) {
            const game = games.get(gameId);
            const metadata = gameMetadata.get(gameId);
            
            if (game && metadata) {
                game.removePlayer(socket.id);
                
                // If host leaves or no players left, remove the game
                if (socket.id === metadata.hostId || game.players.length === 0) {
                    games.delete(gameId);
                    gameMetadata.delete(gameId);
                    console.log(`Game ${gameId} removed (host left or empty)`);
                } else {
                    // Update remaining players
                    io.to(gameId).emit('playersUpdate', game.players);
                }
                
                playerToGame.delete(socket.id);
                
                // Broadcast updated game list to lobby
                io.emit('lobbyUpdate', { availableGames: getAvailableGames() });
            }
        }
    });

    socket.on('click', (data) => {
        const gameId = playerToGame.get(socket.id);
        if (gameId) {
            io.to(gameId).emit('newShape', data);
        }
    });

    socket.on('startGame', () => {
        const gameId = playerToGame.get(socket.id);
        const game = games.get(gameId);
        const metadata = gameMetadata.get(gameId);
        
        if (!game || !metadata) {
            console.log('Game not found for startGame');
            return;
        }
        
        // Only host can start the game
        if (socket.id !== metadata.hostId) {
            console.log('Only host can start the game. Rejected:', socket.id);
            socket.emit('connectionError', 'Only the host can start the game.');
            return;
        }
        
        if (metadata.started) {
            console.log('Game already started');
            return;
        }
        
        console.log('Starting game...');
        io.to(gameId).emit('debugMessage', 'Server: Starting game...');
        
        try {
            // Capture console.log from board generation
            const originalLog = console.log;
            console.log = function(...args) {
                originalLog.apply(console, args);
                io.to(gameId).emit('debugMessage', `Server Log: ${args.join(' ')}`);
            };
            
            console.log("TEST LOG CAPTURE - If you see this, logging works");

            game.start();
            
            // Restore console.log
            console.log = originalLog;

            metadata.started = true;
            
            const tileCount = game.board.tiles.length;
            console.log(`Game ${gameId} started with ${tileCount} tiles and ${game.players.length} players.`);
            io.to(gameId).emit('debugMessage', `Server: Game started with ${tileCount} tiles.`);
            
            // Debug: Log hub data before sending
            const hubTile = game.board.tiles.find(t => t.type === 'hub');
            console.log('Hub in tiles:', hubTile ? 'YES' : 'NO');
            console.log('Hub occupiedPositions:', hubTile ? hubTile.occupiedPositions : 'N/A');
            
            io.to(gameId).emit('gameStarted', {
                tiles: game.board.tiles,
                hub: game.board.hub,
                gridScale: game.board.grid.scale
            });
            io.to(gameId).emit('playersUpdate', game.players);
            
            // Start a random player's turn
            metadata.currentTurnIndex = Math.floor(Math.random() * game.players.length);
            metadata.turnPhase = 'roll';
            if (game.players.length > 0) {
                console.log(`Random starting player: ${game.players[metadata.currentTurnIndex].name} (index ${metadata.currentTurnIndex})`);
                console.log(`Starting player ID: ${game.players[metadata.currentTurnIndex].id}`);
                console.log('All player IDs:', game.players.map(p => ({ name: p.name, id: p.id })));
                
                const turnData = {
                    currentPlayerId: game.players[metadata.currentTurnIndex].id,
                    currentPlayerName: game.players[metadata.currentTurnIndex].name,
                    turnIndex: metadata.currentTurnIndex,
                    phase: metadata.turnPhase
                };
                console.log('Emitting turnChanged:', turnData);
                io.to(gameId).emit('turnChanged', turnData);
            }
            
            // Broadcast updated game list to lobby (game should now be hidden)
            io.emit('lobbyUpdate', { availableGames: getAvailableGames() });
        } catch (error) {
            console.error("Error starting game:", error);
            io.to(gameId).emit('debugMessage', `Server Error: ${error.message}`);
        }
    });

    socket.on('regenerateBoard', () => {
        const gameId = playerToGame.get(socket.id);
        const game = games.get(gameId);
        const metadata = gameMetadata.get(gameId);
        
        if (!game || !metadata) return;
        
        // Only allow if game hasn't started yet
        if (!metadata.started) {
            console.log('Regenerating board...');
            game.board.generate();
            io.to(gameId).emit('boardState', {
                tiles: game.board.tiles,
                hub: game.board.hub,
                gridScale: game.board.grid.scale
            });
        }
    });

    socket.on('rollDice', () => {
        const gameId = playerToGame.get(socket.id);
        const game = games.get(gameId);
        const metadata = gameMetadata.get(gameId);
        
        if (!game || !metadata) return;
        
        const player = game.players.find(p => p.id === socket.id);
        
        // Check if it's this player's turn and they're in roll phase
        if (game.players[metadata.currentTurnIndex].id !== socket.id) {
            console.log('Not your turn!');
            return;
        }
        
        if (metadata.turnPhase !== 'roll') {
            console.log('Not in roll phase!');
            return;
        }
        
        const result = game.rollDice();
        if (player) {
            player.movesLeft = result[0] + result[1];
        }
        io.to(gameId).emit('diceRolled', { playerId: socket.id, result: result });
        io.to(gameId).emit('playersUpdate', game.players);
        
        // Advance to move phase
        metadata.turnPhase = 'move';
        io.to(gameId).emit('phaseChanged', { phase: metadata.turnPhase });
    });

    socket.on('requestTargetFunctionCards', (data) => {
        console.log('requestTargetFunctionCards received:', data);
        const gameId = playerToGame.get(socket.id);
        const game = games.get(gameId);
        
        if (!game) return;
        
        const targetPlayer = game.players.find(p => p.id === data.targetId);
        if (targetPlayer) {
            // Send target player's function cards back to requester
            socket.emit('targetFunctionCards', {
                targetId: data.targetId,
                targetName: targetPlayer.name,
                functionCards: targetPlayer.functionCards,
                rootCardIndex: data.rootCardIndex
            });
        }
    });

    socket.on('requestTargetCargo', (data) => {
        console.log('requestTargetCargo received:', data);
        const gameId = playerToGame.get(socket.id);
        const game = games.get(gameId);
        
        if (!game) return;
        
        const targetPlayer = game.players.find(p => p.id === data.targetId);
        if (targetPlayer) {
            socket.emit('targetCargo', {
                targetId: data.targetId,
                targetName: targetPlayer.name,
                cargo: targetPlayer.cargo,
                cardIndex: data.cardIndex,
                cardName: data.cardName
            });
        }
    });

    socket.on('playFunctionCard', (data) => {
        console.log('playFunctionCard received:', data);
        const gameId = playerToGame.get(socket.id);
        const game = games.get(gameId);
        const metadata = gameMetadata.get(gameId);
        
        if (!game || !metadata) return;
        
        const player = game.players.find(p => p.id === socket.id);
        const targetPlayer = data.targetId ? game.players.find(p => p.id === data.targetId) : null;
        
        // Check if it's this player's turn and they're in roll phase
        if (game.players[metadata.currentTurnIndex].id !== socket.id) {
            console.log('Not your turn!');
            return;
        }
        
        if (metadata.turnPhase !== 'roll') {
            console.log('Not in roll phase!');
            return;
        }
        
        if (player && data.cardIndex >= 0 && data.cardIndex < player.functionCards.length) {
            const card = player.functionCards[data.cardIndex];
            console.log(`Player ${player.name} played function card: ${card.name} on target: ${targetPlayer ? targetPlayer.name : 'none'}`);
            
            // Implement function card effects
            let effectMessage = '';
            
            switch (card.name) {
                case 'Repair Bot':
                    if (targetPlayer) {
                        targetPlayer.cargo.forEach(c => c.locked = false);
                        effectMessage = `Unlocked ${targetPlayer.name}'s cargo`;
                    }
                    break;
                    
                case 'Mishap':
                    if (targetPlayer) {
                        targetPlayer.cargo.forEach(c => c.locked = true);
                        effectMessage = `Locked out ${targetPlayer.name}'s cargo`;
                    }
                    break;
                    
                case 'Rebound':
                    if (targetPlayer && targetPlayer.ship) {
                        targetPlayer.ship.position = { q: 0, r: 0, s: 3 };
                        effectMessage = `${targetPlayer.name} returned to the hub`;
                    }
                    break;
                    
                case 'Recall':
                    if (targetPlayer && targetPlayer.ship) {
                        targetPlayer.ship.position = { q: 0, r: 0, s: 3 };
                        // Fill empty cargo slots from depot
                        while (targetPlayer.cargo.length < 3 && targetPlayer.depot.length > 0) {
                            targetPlayer.cargo.push(targetPlayer.depot.shift());
                        }
                        targetPlayer.recalled = true;
                        effectMessage = `${targetPlayer.name} sent to Hub and cargo filled`;
                    }
                    break;
                    
                case 'Impulse':
                    if (targetPlayer) {
                        const cardCount = targetPlayer.functionCards.length;
                        if (game.functionDeck) {
                            game.functionDeck.cards.push(...targetPlayer.functionCards);
                            game.functionDeck.shuffle();
                        }
                        targetPlayer.functionCards = [];
                        effectMessage = `${targetPlayer.name} shuffled ${cardCount} function cards back into deck`;
                    }
                    break;
                    
                case 'Expired license':
                    if (targetPlayer) {
                        const cargoCount = targetPlayer.cargo.length;
                        targetPlayer.depot = targetPlayer.depot.concat(targetPlayer.cargo);
                        targetPlayer.cargo = [];
                        effectMessage = `${targetPlayer.name} put ${cargoCount} cargo cards at bottom of depot`;
                    }
                    break;
                    
                case 'Delivery':
                    if (targetPlayer) {
                        while (targetPlayer.cargo.length < 3 && targetPlayer.depot.length > 0) {
                            targetPlayer.cargo.push(targetPlayer.depot.shift());
                        }
                        effectMessage = `${targetPlayer.name} filled cargo from depot`;
                    }
                    break;
                    
                case 'Hijack':
                    if (targetPlayer && targetPlayer.cargo.length > 0) {
                        const stolenCard = targetPlayer.cargo.shift();
                        player.cargo.push(stolenCard);
                        targetPlayer.cargo.forEach(c => c.locked = true);
                        effectMessage = `Stole cargo from ${targetPlayer.name} and locked their remaining cargo`;
                    }
                    break;
                    
                case 'Upload':
                    if (targetPlayer && player.cargo.length > 0) {
                        const uploadedCard = player.cargo.shift();
                        targetPlayer.depot.push(uploadedCard);
                        effectMessage = `Uploaded cargo to ${targetPlayer.name}'s depot`;
                    }
                    break;
                    
                case 'Jettison':
                    if (targetPlayer && targetPlayer.cargo.length > 0) {
                        targetPlayer.cargo.shift();
                        effectMessage = `${targetPlayer.name} jettisoned a cargo card`;
                    }
                    break;
                    
                case 'Breakdown':
                    if (targetPlayer) {
                        targetPlayer.skipNextTurn = true;
                        effectMessage = `${targetPlayer.name} will skip their next turn`;
                    }
                    break;
                    
                case 'I.D. Fraud':
                    if (targetPlayer) {
                        while (targetPlayer.cargo.length < 3 && player.depot.length > 0) {
                            targetPlayer.cargo.push(player.depot.shift());
                        }
                        effectMessage = `${targetPlayer.name} loaded cargo from your depot`;
                    }
                    break;
                    
                case 'Warp':
                    if (targetPlayer && targetPlayer.ship) {
                        const planets = game.board.tiles.filter(t => t.type === 'planet');
                        if (planets.length > 0) {
                            const randomPlanet = planets[Math.floor(Math.random() * planets.length)];
                            targetPlayer.ship.position = { 
                                q: randomPlanet.position.q, 
                                r: randomPlanet.position.r, 
                                s: 3 
                            };
                            effectMessage = `${targetPlayer.name} warped to a random planet`;
                        } else {
                            effectMessage = 'No planets available for warping';
                        }
                    }
                    break;
                    
                case 'Jump':
                    if (targetPlayer && targetPlayer.ship && data.planetId !== undefined) {
                        const planet = game.board.tiles.find(t => t.type === 'planet' && t.id === data.planetId);
                        if (planet) {
                            targetPlayer.ship.position = { 
                                q: planet.position.q, 
                                r: planet.position.r, 
                                s: 3 
                            };
                            effectMessage = `${targetPlayer.name} jumped to ${planet.name || 'a planet'}`;
                        } else {
                            effectMessage = 'Planet not found';
                        }
                    } else if (targetPlayer && targetPlayer.ship) {
                        // Fallback to random planet if no planet selected
                        const planets = game.board.tiles.filter(t => t.type === 'planet');
                        if (planets.length > 0) {
                            const randomPlanet = planets[Math.floor(Math.random() * planets.length)];
                            targetPlayer.ship.position = { 
                                q: randomPlanet.position.q, 
                                r: randomPlanet.position.r, 
                                s: 3 
                            };
                            effectMessage = `${targetPlayer.name} jumped to a planet`;
                        }
                    }
                    break;
                    
                case 'Stealth':
                    player.movesLeft = 4;
                    player.stealth = true;
                    effectMessage = 'Move 4 spaces without obstruction';
                    break;
                    
                case 'Glitch':
                    if (game.functionDeck && game.functionDeck.cards.length > 0) {
                        const newCard = game.functionDeck.draw();
                        if (newCard) player.functionCards.push(newCard);
                    }
                    player.movesLeft = 10;
                    effectMessage = 'Drew a function card and gained 10 moves';
                    break;
                    
                case 'EMP':
                    game.players.forEach(p => {
                        if (game.functionDeck) {
                            game.functionDeck.cards.push(...p.functionCards);
                        }
                        p.functionCards = [];
                    });
                    if (game.functionDeck) {
                        game.functionDeck.shuffle();
                    }
                    effectMessage = 'All players shuffled function cards back into deck';
                    break;
                    
                case 'Jammer':
                    {
                        const jamTarget = data.targetId ? game.players.find(p => p.id === data.targetId) : null;
                        if (jamTarget && data.cargoIndex !== undefined && jamTarget.cargo[data.cargoIndex]) {
                            jamTarget.cargo[data.cargoIndex].locked = true;
                            effectMessage = `Locked ${jamTarget.name}'s cargo`;
                        } else if (jamTarget && jamTarget.cargo.length > 0) {
                            const unlocked = jamTarget.cargo.find(c => !c.locked);
                            if (unlocked) {
                                unlocked.locked = true;
                                effectMessage = `Locked ${jamTarget.name}'s cargo`;
                            } else {
                                effectMessage = `${jamTarget.name} has no unlocked cargo`;
                            }
                        } else {
                            effectMessage = 'No target or cargo to lock';
                        }
                    }
                    break;
                    
                case 'Market Shift':
                    {
                        const planets = game.board.tiles.filter(t => t.type === 'planet');
                        const planetIndex = data.planetIndex !== undefined ? data.planetIndex : Math.floor(Math.random() * planets.length);
                        const planet = planets[planetIndex];
                        if (planet && game.discardPile && game.discardPile.cards.length > 0) {
                            const newMarket = game.discardPile.draw();
                            if (planet.market) {
                                game.discardPile.add(planet.market);
                            }
                            planet.market = newMarket;
                            effectMessage = `Changed market on a planet`;
                        } else if (planet) {
                            effectMessage = 'No cards in discard pile to shift market';
                        } else {
                            effectMessage = 'No planets available';
                        }
                    }
                    break;
                    
                case 'Market Regulation':
                    {
                        const planets = game.board.tiles.filter(t => t.type === 'planet');
                        let planet1 = null;
                        let planet2 = null;
                        
                        if (data.targetId && data.targetId.planet1Id && data.targetId.planet2Id) {
                            planet1 = planets.find(p => p.planetId === data.targetId.planet1Id);
                            planet2 = planets.find(p => p.planetId === data.targetId.planet2Id);
                        }
                        
                        if (planet1 && planet2 && planet1.market && planet2.market) {
                            const temp = planet1.market;
                            planet1.market = planet2.market;
                            planet2.market = temp;
                            effectMessage = `Swapped markets between ${planet1.name || 'planet'} and ${planet2.name || 'planet'}`;
                            
                            const emitMarketUpdate = (planet, market) => {
                                const positions = planet.occupiedPositions || [planet.position];
                                positions.forEach(pos => {
                                    io.to(gameId).emit('marketUpdated', {
                                        planetQ: parseInt(pos.q),
                                        planetR: parseInt(pos.r),
                                        market: market
                                    });
                                });
                            };
                            emitMarketUpdate(planet1, planet1.market);
                            emitMarketUpdate(planet2, planet2.market);
                        } else {
                            effectMessage = 'Could not swap markets - invalid planets';
                        }
                    }
                    break;
                    
                case 'Free Port':
                    {
                        if (data.cargoIndex !== undefined && player.cargo[data.cargoIndex]) {
                            if (!player.cargo[data.cargoIndex].locked) {
                                const cargoCard = player.cargo.splice(data.cargoIndex, 1)[0];
                                if (game.discardPile) {
                                    game.discardPile.add(cargoCard);
                                }
                                effectMessage = `Delivered ${cargoCard.name || 'cargo'} via Free Port`;
                            } else {
                                effectMessage = 'Selected cargo is locked';
                            }
                        } else if (player.cargo.length > 0) {
                            const unlocked = player.cargo.findIndex(c => !c.locked);
                            if (unlocked >= 0) {
                                const cargoCard = player.cargo.splice(unlocked, 1)[0];
                                if (game.discardPile) game.discardPile.add(cargoCard);
                                effectMessage = `Delivered ${cargoCard.name || 'cargo'} via Free Port`;
                            } else {
                                effectMessage = 'All cargo is locked';
                            }
                        } else {
                            effectMessage = 'No cargo to deliver';
                        }
                    }
                    break;
                    
                case 'Hinder':
                    {
                        const movementTiles = game.board.tiles.filter(t => t.type === 'movement');
                        if (movementTiles.length > 0) {
                            const randomTile = movementTiles[Math.floor(Math.random() * movementTiles.length)];
                            randomTile.type = 'black_hole';
                            effectMessage = `Placed black hole on the board`;
                        } else {
                            effectMessage = 'No valid tiles for black hole';
                        }
                    }
                    break;
                    
                case 'Data Switch':
                    {
                        const playersWithCargo = game.players.filter(p => p.cargo.length > 0);
                        if (playersWithCargo.length >= 2) {
                            const p1 = playersWithCargo[0];
                            const p2 = playersWithCargo[1];
                            if (p1.cargo[0] && p2.cargo[0]) {
                                const temp = p1.cargo[0];
                                p1.cargo[0] = p2.cargo[0];
                                p2.cargo[0] = temp;
                                effectMessage = `Switched cargo between ${p1.name} and ${p2.name}`;
                            }
                        } else {
                            effectMessage = 'Not enough players with cargo to switch';
                        }
                    }
                    break;
                    
                case 'Root':
                    if (data.targetId && data.targetId.targetPlayerId && data.targetId.selectedCardIndex !== undefined) {
                        const rootTarget = game.players.find(p => p.id === data.targetId.targetPlayerId);
                        if (rootTarget && rootTarget.functionCards[data.targetId.selectedCardIndex]) {
                            const rootedCard = rootTarget.functionCards[data.targetId.selectedCardIndex];
                            const cardTarget = data.targetId.cardTarget ? game.players.find(p => p.id === data.targetId.cardTarget) : player;
                            
                            switch (rootedCard.name) {
                                case 'Repair Bot':
                                    cardTarget.cargo.forEach(c => c.locked = false);
                                    break;
                                case 'Mishap':
                                    cardTarget.cargo.forEach(c => c.locked = true);
                                    break;
                                case 'Rebound':
                                    if (cardTarget.ship) cardTarget.ship.position = { q: 0, r: 0, s: 3 };
                                    break;
                                case 'Recall':
                                    if (player.ship) player.ship.position = { q: 0, r: 0, s: 3 };
                                    break;
                                case 'Delivery':
                                    while (cardTarget.cargo.length < 3 && cardTarget.depot.length > 0) {
                                        cardTarget.cargo.push(cardTarget.depot.shift());
                                    }
                                    break;
                                case 'Jettison':
                                    if (cardTarget.cargo.length > 0) cardTarget.cargo.pop();
                                    break;
                                case 'Stealth':
                                    player.movesLeft = 4;
                                    player.stealth = true;
                                    break;
                                case 'Glitch':
                                    if (game.functionDeck && game.functionDeck.cards.length > 0) {
                                        const newCard = game.functionDeck.draw();
                                        if (newCard) player.functionCards.push(newCard);
                                    }
                                    player.movesLeft = 10;
                                    break;
                                case 'EMP':
                                    game.players.forEach(p => {
                                        if (game.functionDeck) game.functionDeck.cards.push(...p.functionCards);
                                        p.functionCards = [];
                                    });
                                    if (game.functionDeck) game.functionDeck.shuffle();
                                    break;
                                case 'Impulse':
                                    game.players.forEach(p => {
                                        if (p.functionCards.length > 0) {
                                            const randomIdx = Math.floor(Math.random() * p.functionCards.length);
                                            const shuffledCard = p.functionCards.splice(randomIdx, 1)[0];
                                            if (game.functionDeck) game.functionDeck.cards.push(shuffledCard);
                                        }
                                    });
                                    if (game.functionDeck) game.functionDeck.shuffle();
                                    break;
                                case 'Hijack':
                                    if (cardTarget.functionCards.length > 0 && cardTarget !== player) {
                                        const stolenCard = cardTarget.functionCards.pop();
                                        player.functionCards.push(stolenCard);
                                    }
                                    break;
                                case 'Upload':
                                    if (cardTarget.depot.length > 0 && cardTarget !== player) {
                                        const stolenCargo = cardTarget.depot.shift();
                                        player.depot.push(stolenCargo);
                                    }
                                    break;
                                case 'Warp':
                                    const wPlanets = game.board.tiles.filter(t => t.type === 'planet');
                                    if (wPlanets.length > 0 && cardTarget.ship) {
                                        const wp = wPlanets[Math.floor(Math.random() * wPlanets.length)];
                                        cardTarget.ship.position = { q: wp.position.q, r: wp.position.r, s: 3 };
                                    }
                                    break;
                                case 'Jump':
                                    const jPlanets = game.board.tiles.filter(t => t.type === 'planet');
                                    if (jPlanets.length > 0 && player.ship) {
                                        player.ship.position = { q: jPlanets[0].position.q, r: jPlanets[0].position.r, s: 3 };
                                    }
                                    break;
                            }
                            
                            rootTarget.functionCards.splice(data.targetId.selectedCardIndex, 1);
                            effectMessage = `Used Root to play ${rootedCard.name} from ${rootTarget.name}'s hand`;
                        }
                    } else {
                        effectMessage = 'Root requires target player and card selection';
                    }
                    break;
                    
                case 'Replicator':
                    if (data.replicateIndex !== undefined && player.functionCards[data.replicateIndex]) {
                        const replicatedCard = player.functionCards[data.replicateIndex];
                        const repTarget = data.targetId ? game.players.find(p => p.id === data.targetId) : player;
                        
                        switch (replicatedCard.name) {
                            case 'Repair Bot':
                                repTarget.cargo.forEach(c => c.locked = false);
                                break;
                            case 'Mishap':
                                repTarget.cargo.forEach(c => c.locked = true);
                                break;
                            case 'Rebound':
                                if (repTarget.ship) repTarget.ship.position = { q: 0, r: 0, s: 3 };
                                break;
                            case 'Recall':
                                if (player.ship) player.ship.position = { q: 0, r: 0, s: 3 };
                                break;
                            case 'Delivery':
                                while (repTarget.cargo.length < 3 && repTarget.depot.length > 0) {
                                    repTarget.cargo.push(repTarget.depot.shift());
                                }
                                break;
                            case 'Jettison':
                                if (repTarget.cargo.length > 0) repTarget.cargo.pop();
                                break;
                            case 'Stealth':
                                player.movesLeft = 4;
                                player.stealth = true;
                                break;
                            case 'Glitch':
                                if (game.functionDeck && game.functionDeck.cards.length > 0) {
                                    const newCard = game.functionDeck.draw();
                                    if (newCard) player.functionCards.push(newCard);
                                }
                                player.movesLeft = 10;
                                break;
                            case 'EMP':
                                game.players.forEach(p => {
                                    if (game.functionDeck) game.functionDeck.cards.push(...p.functionCards);
                                    p.functionCards = [];
                                });
                                if (game.functionDeck) game.functionDeck.shuffle();
                                break;
                            case 'Impulse':
                                game.players.forEach(p => {
                                    if (p.functionCards.length > 0) {
                                        const randomIdx = Math.floor(Math.random() * p.functionCards.length);
                                        const shuffledCard = p.functionCards.splice(randomIdx, 1)[0];
                                        if (game.functionDeck) game.functionDeck.cards.push(shuffledCard);
                                    }
                                });
                                if (game.functionDeck) game.functionDeck.shuffle();
                                break;
                            case 'Hijack':
                                if (repTarget.functionCards.length > 0 && repTarget !== player) {
                                    const stolenCard = repTarget.functionCards.pop();
                                    player.functionCards.push(stolenCard);
                                }
                                break;
                            case 'Upload':
                                if (repTarget.depot.length > 0 && repTarget !== player) {
                                    const stolenCargo = repTarget.depot.shift();
                                    player.depot.push(stolenCargo);
                                }
                                break;
                            case 'Warp':
                                const rWPlanets = game.board.tiles.filter(t => t.type === 'planet');
                                if (rWPlanets.length > 0 && repTarget.ship) {
                                    const rwp = rWPlanets[Math.floor(Math.random() * rWPlanets.length)];
                                    repTarget.ship.position = { q: rwp.position.q, r: rwp.position.r, s: 3 };
                                }
                                break;
                            case 'Jump':
                                const rJPlanets = game.board.tiles.filter(t => t.type === 'planet');
                                if (rJPlanets.length > 0 && player.ship) {
                                    player.ship.position = { q: rJPlanets[0].position.q, r: rJPlanets[0].position.r, s: 3 };
                                }
                                break;
                        }
                        
                        effectMessage = `Replicated ${replicatedCard.name}`;
                    } else {
                        effectMessage = 'Replicator requires card selection';
                    }
                    break;
                    
                default:
                    effectMessage = `${card.name} effect not yet implemented`;
                    break;
            }
            
            // Remove the card from player's hand
            player.functionCards.splice(data.cardIndex, 1);
            
            io.to(gameId).emit('playersUpdate', game.players);
            io.to(gameId).emit('functionCardPlayed', { 
                playerId: socket.id, 
                playerName: player.name,
                cardName: card.name,
                effectMessage: effectMessage
            });
            
            // Advance to move phase (unless card gives moves directly)
            if (card.name !== 'Stealth' && card.name !== 'Glitch') {
                metadata.turnPhase = 'move';
                console.log('Phase changed to move after function card');
                io.to(gameId).emit('phaseChanged', { phase: metadata.turnPhase });
            }
        } else {
            console.log('Invalid card index or no player found. Player:', !!player, 'cardIndex:', data.cardIndex, 'hand size:', player ? player.functionCards.length : 0);
        }
    });

    socket.on('moveShip', (data) => {
        console.log('moveShip received:', data);
        const gameId = playerToGame.get(socket.id);
        const game = games.get(gameId);
        
        if (!game) return;
        
        const player = game.players.find(p => p.id === socket.id);
        if (player) {
            console.log(`Player ${player.name} movesLeft: ${player.movesLeft}, cost: ${data.cost}`);
            if (player.movesLeft >= data.cost) {
                player.ship.position = { q: data.q, r: data.r, s: data.s };
                // Set moves to 0 after any move
                player.movesLeft = 0;
                // Reset stealth mode after movement
                player.stealth = false;
                console.log(`Ship moved to ${data.q},${data.r},${data.s}. Moves set to 0.`);
                io.to(gameId).emit('playersUpdate', game.players);
            } else {
                console.log('Not enough moves left');
            }
        } else {
            console.log('Player not found');
        }
    });

    socket.on('endTurn', () => {
        const gameId = playerToGame.get(socket.id);
        const game = games.get(gameId);
        const metadata = gameMetadata.get(gameId);
        
        if (!game || !metadata) return;
        
        // Check if it's this player's turn
        if (game.players[metadata.currentTurnIndex].id !== socket.id) {
            console.log('Not your turn to end!');
            return;
        }
        
        const player = game.players.find(p => p.id === socket.id);
        
        // Check if player is on hub - handle hub arrival
        if (player && game.isPlayerOnHub(player)) {
            const hubResult = game.handleHubArrival(socket.id);
            console.log('Hub arrival result:', hubResult);
            
            if (hubResult.success) {
                io.to(gameId).emit('hubArrival', {
                    playerId: socket.id,
                    playerName: player.name,
                    cardsRefilled: hubResult.cardsRefilled,
                    hadNoCargo: hubResult.hadNoCargo,
                    bonusCard: hubResult.bonusCard ? hubResult.bonusCard.name : null
                });
                
                io.to(gameId).emit('playersUpdate', game.players);
            }
        }
        
        // Move to next player
        metadata.currentTurnIndex = (metadata.currentTurnIndex + 1) % game.players.length;
        metadata.turnPhase = 'roll'; // Reset to roll phase for next player
        
        io.to(gameId).emit('turnChanged', {
            currentPlayerId: game.players[metadata.currentTurnIndex].id,
            currentPlayerName: game.players[metadata.currentTurnIndex].name,
            turnIndex: metadata.currentTurnIndex,
            phase: metadata.turnPhase
        });
    });

    socket.on('deliverCargo', (data) => {
        console.log('deliverCargo received:', data);
        const gameId = playerToGame.get(socket.id);
        const game = games.get(gameId);
        const metadata = gameMetadata.get(gameId);
        
        if (!game || !metadata) return;
        
        const player = game.players.find(p => p.id === socket.id);
        if (!player) return;
        
        // Player must be on a planet to deliver cargo
        const { planetQ, planetR, cargoIndex } = data;
        
        const result = game.deliverCargo(socket.id, planetQ, planetR, cargoIndex);
        
        if (result.success) {
            const planet = game.board.tiles.find(t => {
                if (t.type !== 'planet') return false;
                const occupiedPositions = t.occupiedPositions || [t.position];
                return occupiedPositions.some(pos => 
                    parseInt(pos.q) === parseInt(planetQ) && parseInt(pos.r) === parseInt(planetR)
                );
            });
            
            io.to(gameId).emit('cargoDelivered', {
                playerId: socket.id,
                playerName: player.name,
                planetQ: planetQ,
                planetR: planetR,
                newMarket: result.newMarket,
                exactMatch: result.exactMatch,
                bonusCard: result.bonusCard ? result.bonusCard.name : null
            });
            
            if (planet) {
                const occupiedPositions = planet.occupiedPositions || [planet.position];
                occupiedPositions.forEach(pos => {
                    io.to(gameId).emit('marketUpdated', {
                        planetQ: parseInt(pos.q),
                        planetR: parseInt(pos.r),
                        market: result.newMarket
                    });
                });
            }
            
            io.to(gameId).emit('playersUpdate', game.players);
        } else {
            socket.emit('cargoDeliveryFailed', { error: result.error });
        }
    });

    socket.on('getMarkets', () => {
        const gameId = playerToGame.get(socket.id);
        const game = games.get(gameId);
        
        if (!game) return;
        
        const markets = [];
        game.board.tiles
            .filter(t => t.type === 'planet' && t.market)
            .forEach(t => {
                const occupiedPositions = t.occupiedPositions || [t.position];
                occupiedPositions.forEach(pos => {
                    markets.push({
                        q: parseInt(pos.q),
                        r: parseInt(pos.r),
                        market: t.market
                    });
                });
            });
        
        socket.emit('marketsData', { markets });
    });
});

server.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port} (v2)`);
});
