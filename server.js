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
        const result = game.rollDice();
        const player = game.players.find(p => p.id === socket.id);
        if (player) {
            player.movesLeft = result[0] + result[1];
        }
        io.emit('diceRolled', { playerId: socket.id, result: result });
        io.emit('playersUpdate', game.players);
    });

    socket.on('moveShip', (data) => {
        const player = game.players.find(p => p.id === socket.id);
        if (player && player.movesLeft >= data.cost) {
            player.ship.position = { q: data.q, r: data.r };
            player.movesLeft = 0; // Reset moves to 0 after moving
            io.emit('playersUpdate', game.players);
        }
    });
});

server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port} (v2)`);
});
