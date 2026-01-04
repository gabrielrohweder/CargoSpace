const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const Game = require('./src/game');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const port = process.env.PORT || 3000;

app.use(express.static('public'));

// Store all games: gameId -> { game, status, config, players, turn info }
const games = new Map();
let nextGameId = 1;

// Helper to generate unique game IDs
function generateGameId() {
    return `game_${nextGameId++}`;
}

// Track which game each player is in
const playerGameMap = new Map(); // playerId -> gameId

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Send list of available games to the new player
    const availableGames = Array.from(games.values())
        .filter(g => g.status === 'waiting')
        .map(g => ({
            gameId: g.gameId,
            name: g.config.gameName,
            playerCount: g.game.players.length,
            maxPlayers: g.config.maxPlayers,
            movementTiles: g.config.movementTiles,
            asteroidBelts: g.config.asteroidBelts
        }));
    
    socket.emit('lobbyData', { availableGames });

    socket.on('getLobbyData', () => {
        const availableGames = Array.from(games.values())
            .filter(g => g.status === 'waiting')
            .map(g => ({
                gameId: g.gameId,
                name: g.config.gameName,
                playerCount: g.game.players.length,
                maxPlayers: g.config.maxPlayers,
                movementTiles: g.config.movementTiles,
                asteroidBelts: g.config.asteroidBelts
            }));
        
        socket.emit('lobbyData', { availableGames });
    });

    socket.on('rejoinGame', (data) => {
        const gameId = data.gameId;
        const playerName = data.playerName;
        
        console.log(`Player ${socket.id} attempting to rejoin game ${gameId} as ${playerName}`);
        
        if (!games.has(gameId)) {
            socket.emit('error', 'Game not found');
            return;
        }
        
        const gameData = games.get(gameId);
        
        // Find player by name in the game
        const player = gameData.game.players.find(p => p.name === playerName);
        
        if (!player) {
            console.log(`Player ${playerName} not found in game ${gameId}`);
            socket.emit('error', 'Player not found in game');
            return;
        }
        
        console.log(`Player ${playerName} successfully rejoined game ${gameId}`);
        
        // Update the player's socket ID (they have a new one after refresh)
        player.id = socket.id;
        playerGameMap.set(socket.id, gameId);
        
        // Join the socket to the game room
        socket.join(gameId);
        
        // Send connection data to the rejoining player
        socket.emit('connectionData', {
            id: socket.id,
            gameId: gameId,
            isHost: gameData.game.players[0].id === socket.id,
            gameStarted: gameData.status === 'in-progress',
            playerName: player.name,
            boardState: {
                tiles: gameData.game.board.tiles,
                hub: gameData.game.board.hub,
                gridScale: gameData.game.board.grid.scale
            }
        });
        
        // Broadcast updated player list to this game
        io.to(gameId).emit('playersUpdate', gameData.game.players);
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
        const gameId = playerGameMap.get(socket.id);
        if (gameId && games.has(gameId)) {
            const gameData = games.get(gameId);
            gameData.game.removePlayer(socket.id);
            playerGameMap.delete(socket.id);
            
            // If game has no players, delete it
            if (gameData.game.players.length === 0) {
                games.delete(gameId);
                console.log(`Game ${gameId} deleted (no players left)`);
            } else {
                // Notify remaining players
                io.to(gameId).emit('playersUpdate', gameData.game.players);
            }
        }
    });

    socket.on('createGame', (data) => {
        const gameId = generateGameId();
        const gameInstance = new Game(data.movementTiles || 6);
        gameInstance.setup([]); // Initialize decks and markets
        
        const gameData = {
            gameId: gameId,
            game: gameInstance,
            status: 'waiting', // 'waiting', 'in-progress', 'finished'
            config: {
                gameName: data.gameName || gameId,
                movementTiles: data.movementTiles || 6,
                asteroidBelts: data.asteroidBelts || false,
                maxPlayers: data.maxPlayers || 4
            },
            currentTurnIndex: 0,
            turnPhase: 'roll'
        };
        
        games.set(gameId, gameData);
        
        // Add the creator as the first player with provided name
        const isHost = true;
        const playerName = data.playerName || 'Player 1';
        const player = gameInstance.addPlayer(socket.id, playerName);
        playerGameMap.set(socket.id, gameId);
        
        // Join the socket to a room with the game ID
        socket.join(gameId);
        
        console.log(`Game created: ${gameId} by ${socket.id} (${playerName})`);
        
        // Send connection data to the creator
        socket.emit('connectionData', {
            id: socket.id,
            gameId: gameId,
            isHost: isHost,
            gameStarted: false,
            playerName: player.name,
            boardState: {
                tiles: gameInstance.board.tiles,
                hub: gameInstance.board.hub,
                gridScale: gameInstance.board.grid.scale
            }
        });
        
        // Broadcast updated player list to this game
        io.to(gameId).emit('playersUpdate', gameInstance.players);
        
        // Update lobby for all players
        broadcastLobbyUpdate();
    });

    socket.on('joinGame', (data) => {
        const gameId = data.gameId;
        const playerName = data.playerName || 'Player';
        
        if (!games.has(gameId)) {
            socket.emit('error', 'Game not found');
            return;
        }
        
        const gameData = games.get(gameId);
        
        if (gameData.status !== 'waiting') {
            socket.emit('error', 'Game has already started');
            return;
        }
        
        if (gameData.game.players.length >= gameData.config.maxPlayers) {
            socket.emit('error', 'Game is full');
            return;
        }
        
        // Add player to game with provided name
        const player = gameData.game.addPlayer(socket.id, playerName);
        playerGameMap.set(socket.id, gameId);
        
        // Join the socket to the game room
        socket.join(gameId);
        
        console.log(`Player ${socket.id} (${playerName}) joined game ${gameId}`);
        
        // Send connection data to the joining player
        socket.emit('connectionData', {
            id: socket.id,
            gameId: gameId,
            isHost: false,
            gameStarted: false,
            playerName: player.name,
            boardState: {
                tiles: gameData.game.board.tiles,
                hub: gameData.game.board.hub,
                gridScale: gameData.game.board.grid.scale
            }
        });
        
        // Broadcast updated player list to this game
        io.to(gameId).emit('playersUpdate', gameData.game.players);
        
        // Update lobby for all players
        broadcastLobbyUpdate();
    });

    socket.on('click', (data) => {
        const gameId = playerGameMap.get(socket.id);
        if (gameId) {
            io.to(gameId).emit('newShape', data);
        }
    });

    socket.on('startGame', () => {
        const gameId = playerGameMap.get(socket.id);
        if (!gameId || !games.has(gameId)) {
            socket.emit('error', 'Game not found');
            return;
        }
        
        const gameData = games.get(gameId);
        if (gameData.status !== 'waiting') {
            socket.emit('error', 'Game has already started');
            return;
        }
        
        // Only host can start the game (first player)
        const isHost = gameData.game.players[0].id === socket.id;
        if (!isHost) {
            socket.emit('error', 'Only the host can start the game');
            return;
        }
        
        console.log('Starting game:', gameId);
        io.to(gameId).emit('debugMessage', 'Server: Starting game...');
        
        try {
            gameData.game.start();
            gameData.status = 'in-progress';
            
            const tileCount = gameData.game.board.tiles.length;
            console.log(`Game ${gameId} started with ${tileCount} tiles and ${gameData.game.players.length} players.`);
            
            io.to(gameId).emit('gameStarted', {
                tiles: gameData.game.board.tiles,
                hub: gameData.game.board.hub,
                gridScale: gameData.game.board.grid.scale
            });
            io.to(gameId).emit('playersUpdate', gameData.game.players);
            
            // Start a random player's turn
            gameData.currentTurnIndex = Math.floor(Math.random() * gameData.game.players.length);
            gameData.turnPhase = 'roll';
            
            if (gameData.game.players.length > 0) {
                const turnData = {
                    currentPlayerId: gameData.game.players[gameData.currentTurnIndex].id,
                    currentPlayerName: gameData.game.players[gameData.currentTurnIndex].name,
                    turnIndex: gameData.currentTurnIndex,
                    phase: gameData.turnPhase
                };
                io.to(gameId).emit('turnChanged', turnData);
            }
        } catch (error) {
            console.error("Error starting game:", error);
            io.to(gameId).emit('debugMessage', `Server Error: ${error.message}`);
        }
        
        // Update lobby for all players
        broadcastLobbyUpdate();
    });

    socket.on('regenerateBoard', () => {
        const gameId = playerGameMap.get(socket.id);
        if (gameId && games.has(gameId)) {
            const gameData = games.get(gameId);
            console.log('Regenerating board for game:', gameId);
            gameData.game.board.generate();
            io.to(gameId).emit('boardState', {
                tiles: gameData.game.board.tiles,
                hub: gameData.game.board.hub,
                gridScale: gameData.game.board.grid.scale
            });
        }
    });

    socket.on('rollDice', () => {
        const gameId = playerGameMap.get(socket.id);
        if (!gameId || !games.has(gameId)) return;
        
        const gameData = games.get(gameId);
        const player = gameData.game.players.find(p => p.id === socket.id);
        
        // Check if it's this player's turn and they're in roll phase
        if (gameData.game.players[gameData.currentTurnIndex].id !== socket.id) {
            console.log('Not your turn!');
            return;
        }
        
        if (gameData.turnPhase !== 'roll') {
            console.log('Not in roll phase!');
            return;
        }
        
        const result = gameData.game.rollDice();
        if (player) {
            player.movesLeft = result[0] + result[1];
        }
        io.to(gameId).emit('diceRolled', { playerId: socket.id, result: result });
        io.to(gameId).emit('playersUpdate', gameData.game.players);
        
        // Advance to move phase
        gameData.turnPhase = 'move';
        io.to(gameId).emit('phaseChanged', { phase: gameData.turnPhase });
    });

    socket.on('playFunctionCard', (data) => {
        const gameId = playerGameMap.get(socket.id);
        if (!gameId || !games.has(gameId)) return;
        
        const gameData = games.get(gameId);
        const player = gameData.game.players.find(p => p.id === socket.id);
        
        // Check if it's this player's turn and they're in roll phase
        if (gameData.game.players[gameData.currentTurnIndex].id !== socket.id) {
            console.log('Not your turn!');
            return;
        }
        
        if (gameData.turnPhase !== 'roll') {
            console.log('Not in roll phase!');
            return;
        }
        
        if (player && data.cardIndex >= 0 && data.cardIndex < player.functionCards.length) {
            const card = player.functionCards[data.cardIndex];
            console.log(`Player ${player.name} played function card: ${card.name}`);
            
            // TODO: Implement function card effects
            player.functionCards.splice(data.cardIndex, 1);
            
            io.to(gameId).emit('playersUpdate', gameData.game.players);
            io.to(gameId).emit('functionCardPlayed', { 
                playerId: socket.id, 
                playerName: player.name,
                cardName: card.name 
            });
            
            // Advance to move phase
            gameData.turnPhase = 'move';
            io.to(gameId).emit('phaseChanged', { phase: gameData.turnPhase });
        }
    });

    socket.on('moveShip', (data) => {
        const gameId = playerGameMap.get(socket.id);
        if (!gameId || !games.has(gameId)) return;
        
        const gameData = games.get(gameId);
        const player = gameData.game.players.find(p => p.id === socket.id);
        
        if (player) {
            if (player.movesLeft >= data.cost) {
                player.ship.position = { q: data.q, r: data.r, s: data.s };
                player.movesLeft = 0;
                io.to(gameId).emit('playersUpdate', gameData.game.players);
            } else {
                console.log('Not enough moves left');
            }
        }
    });

    socket.on('endTurn', () => {
        const gameId = playerGameMap.get(socket.id);
        if (!gameId || !games.has(gameId)) return;
        
        const gameData = games.get(gameId);
        
        // Check if it's this player's turn
        if (gameData.game.players[gameData.currentTurnIndex].id !== socket.id) {
            console.log('Not your turn to end!');
            return;
        }
        
        // Move to next player
        gameData.currentTurnIndex = (gameData.currentTurnIndex + 1) % gameData.game.players.length;
        gameData.turnPhase = 'roll'; // Reset to roll phase for next player
        
        io.to(gameId).emit('turnChanged', {
            currentPlayerId: gameData.game.players[gameData.currentTurnIndex].id,
            currentPlayerName: gameData.game.players[gameData.currentTurnIndex].name,
            turnIndex: gameData.currentTurnIndex,
            phase: gameData.turnPhase
        });
    });
});

// Helper function to broadcast lobby update to all connected clients
function broadcastLobbyUpdate() {
    const availableGames = Array.from(games.values())
        .filter(g => g.status === 'waiting')
        .map(g => ({
            gameId: g.gameId,
            name: g.config.gameName,
            playerCount: g.game.players.length,
            maxPlayers: g.config.maxPlayers,
            movementTiles: g.config.movementTiles,
            asteroidBelts: g.config.asteroidBelts
        }));
    
    io.emit('lobbyUpdate', { availableGames });
}

server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port} (v2)`);
});
