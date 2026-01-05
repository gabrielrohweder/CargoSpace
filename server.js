const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const Game = require('./src/game');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const port = process.env.PORT || 3000;

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
        const game = new Game();
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

    socket.on('playFunctionCard', (data) => {
        console.log('playFunctionCard received:', data);
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
        
        if (player && data.cardIndex >= 0 && data.cardIndex < player.functionCards.length) {
            const card = player.functionCards[data.cardIndex];
            console.log(`Player ${player.name} played function card: ${card.name}`);
            
            // TODO: Implement function card effects
            // For now, just remove the card from player's hand
            player.functionCards.splice(data.cardIndex, 1);
            
            io.to(gameId).emit('playersUpdate', game.players);
            io.to(gameId).emit('functionCardPlayed', { 
                playerId: socket.id, 
                playerName: player.name,
                cardName: card.name 
            });
            
            // Advance to move phase
            metadata.turnPhase = 'move';
            console.log('Phase changed to move after function card');
            io.to(gameId).emit('phaseChanged', { phase: metadata.turnPhase });
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
});

server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port} (v2)`);
});
