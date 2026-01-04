const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const Game = require('./src/game');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const port = process.env.PORT || 3000;

app.use(express.static('public'));

const game = new Game();
game.setup([]); // Initialize decks and markets
let gameStarted = false;
let currentTurnIndex = 0; // Track whose turn it is
let turnPhase = 'roll'; // Phases: 'roll', 'move', 'cargo'

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    if (gameStarted) {
        console.log('Connection rejected: Game already started.');
        socket.emit('connectionError', 'Game has already started.');
        socket.disconnect();
        return;
    }

    if (game.players.length >= 6) {
        console.log('Connection rejected: Game is full.');
        socket.emit('connectionError', 'Game is full.');
        socket.disconnect();
        return;
    }

    const isHost = game.players.length === 0;

    // Add new player
    const player = game.addPlayer(socket.id, `Player ${game.players.length + 1}`);
    
    // Send initial data
    socket.emit('connectionData', {
        id: socket.id,
        isHost: isHost,
        gameStarted: gameStarted,
        boardState: {
            tiles: game.board.tiles,
            hub: game.board.hub,
            gridScale: game.board.grid.scale
        }
    });

    // Broadcast updated player list
    io.emit('playersUpdate', game.players);

    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
        game.removePlayer(socket.id);
        io.emit('playersUpdate', game.players);
        
        // If host leaves, maybe assign new host? 
        // For now, simple logic: if no players, reset gameStarted?
        if (game.players.length === 0) {
            gameStarted = false;
            // Optionally clear board
            game.board.tiles = [];
        }
    });

    socket.on('click', (data) => {
        io.emit('newShape', data);
    });

    socket.on('startGame', () => {
        if (!gameStarted) {
            console.log('Starting game...');
            io.emit('debugMessage', 'Server: Starting game...');
            try {
                // Capture console.log from board generation
                const originalLog = console.log;
                console.log = function(...args) {
                    originalLog.apply(console, args);
                    io.emit('debugMessage', `Server Log: ${args.join(' ')}`);
                };
                
                console.log("TEST LOG CAPTURE - If you see this, logging works");

                game.start();
                
                // Restore console.log
                console.log = originalLog;

                gameStarted = true;
                
                const tileCount = game.board.tiles.length;
                console.log(`Game started with ${tileCount} tiles and ${game.players.length} players.`);
                io.emit('debugMessage', `Server: Game started with ${tileCount} tiles.`);
                
                io.emit('gameStarted', {
                    tiles: game.board.tiles,
                    hub: game.board.hub,
                    gridScale: game.board.grid.scale
                });
                io.emit('playersUpdate', game.players);
                
                // Start a random player's turn
                currentTurnIndex = Math.floor(Math.random() * game.players.length);
                turnPhase = 'roll';
                if (game.players.length > 0) {
                    console.log(`Random starting player: ${game.players[currentTurnIndex].name} (index ${currentTurnIndex})`);
                    console.log(`Starting player ID: ${game.players[currentTurnIndex].id}`);
                    console.log('All player IDs:', game.players.map(p => ({ name: p.name, id: p.id })));
                    
                    const turnData = {
                        currentPlayerId: game.players[currentTurnIndex].id,
                        currentPlayerName: game.players[currentTurnIndex].name,
                        turnIndex: currentTurnIndex,
                        phase: turnPhase
                    };
                    console.log('Emitting turnChanged:', turnData);
                    io.emit('turnChanged', turnData);
                }
            } catch (error) {
                console.error("Error starting game:", error);
                io.emit('debugMessage', `Server Error: ${error.message}`);
            }
        }
    });

    socket.on('regenerateBoard', () => {
        // Only allow if game started or maybe just for debugging
        console.log('Regenerating board...');
        game.board.generate();
        io.emit('boardState', {
            tiles: game.board.tiles,
            hub: game.board.hub,
            gridScale: game.board.grid.scale
        });
    });

    socket.on('rollDice', () => {
        const player = game.players.find(p => p.id === socket.id);
        
        // Check if it's this player's turn and they're in roll phase
        if (game.players[currentTurnIndex].id !== socket.id) {
            console.log('Not your turn!');
            return;
        }
        
        if (turnPhase !== 'roll') {
            console.log('Not in roll phase!');
            return;
        }
        
        const result = game.rollDice();
        if (player) {
            player.movesLeft = result[0] + result[1];
        }
        io.emit('diceRolled', { playerId: socket.id, result: result });
        io.emit('playersUpdate', game.players);
        
        // Advance to move phase
        turnPhase = 'move';
        io.emit('phaseChanged', { phase: turnPhase });
    });

    socket.on('playFunctionCard', (data) => {
        console.log('playFunctionCard received:', data);
        const player = game.players.find(p => p.id === socket.id);
        
        // Check if it's this player's turn and they're in roll phase
        if (game.players[currentTurnIndex].id !== socket.id) {
            console.log('Not your turn!');
            return;
        }
        
        if (turnPhase !== 'roll') {
            console.log('Not in roll phase!');
            return;
        }
        
        if (player && data.cardIndex >= 0 && data.cardIndex < player.functionCards.length) {
            const card = player.functionCards[data.cardIndex];
            console.log(`Player ${player.name} played function card: ${card.name}`);
            
            // TODO: Implement function card effects
            // For now, just remove the card from player's hand
            player.functionCards.splice(data.cardIndex, 1);
            
            io.emit('playersUpdate', game.players);
            io.emit('functionCardPlayed', { 
                playerId: socket.id, 
                playerName: player.name,
                cardName: card.name 
            });
            
            // Advance to move phase
            turnPhase = 'move';
            console.log('Phase changed to move after function card');
            io.emit('phaseChanged', { phase: turnPhase });
        } else {
            console.log('Invalid card index or no player found. Player:', !!player, 'cardIndex:', data.cardIndex, 'hand size:', player ? player.functionCards.length : 0);
        }
    });

    socket.on('moveShip', (data) => {
        console.log('moveShip received:', data);
        const player = game.players.find(p => p.id === socket.id);
        if (player) {
            console.log(`Player ${player.name} movesLeft: ${player.movesLeft}, cost: ${data.cost}`);
            if (player.movesLeft >= data.cost) {
                player.ship.position = { q: data.q, r: data.r, s: data.s };
                // Set moves to 0 after any move
                player.movesLeft = 0;
                console.log(`Ship moved to ${data.q},${data.r},${data.s}. Moves set to 0.`);
                io.emit('playersUpdate', game.players);
            } else {
                console.log('Not enough moves left');
            }
        } else {
            console.log('Player not found');
        }
    });

    socket.on('endTurn', () => {
        // Check if it's this player's turn
        if (game.players[currentTurnIndex].id !== socket.id) {
            console.log('Not your turn to end!');
            return;
        }
        
        // Move to next player
        currentTurnIndex = (currentTurnIndex + 1) % game.players.length;
        turnPhase = 'roll'; // Reset to roll phase for next player
        
        io.emit('turnChanged', {
            currentPlayerId: game.players[currentTurnIndex].id,
            currentPlayerName: game.players[currentTurnIndex].name,
            turnIndex: currentTurnIndex,
            phase: turnPhase
        });
    });
});

server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port} (v2)`);
});
