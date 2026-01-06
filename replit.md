# CargoSpace

## Overview
CargoSpace is an online multiplayer board game built with Node.js, Express, Socket.IO, and Phaser 3 for the game client.

## Project Structure
- `server.js` - Express + Socket.IO server handling game logic and multiplayer connections
- `public/` - Static frontend files served by Express
  - `index.html` - Main HTML entry point
  - `js/main.js` - Phaser game client
  - `js/grid.js` - Grid utilities
  - `js/phaser.min.js` - Phaser 3 game framework
  - `assets/` - Game images and sprites
- `src/` - Server-side game logic modules
  - `game.js` - Main game class
  - `board.js` - Board management
  - `player.js` - Player management
  - `ship.js` - Ship logic
  - `cards.js` - Card deck logic
  - `tile.js` - Tile definitions
  - `planet.js` - Planet logic
  - `grid.js` - Hexagonal grid utilities
- `Doc/` - Documentation files

## Tech Stack
- **Backend**: Node.js, Express, Socket.IO
- **Frontend**: Phaser 3 (game engine), Socket.IO client
- **Port**: 5000 (bound to 0.0.0.0)

## Running the Project
```bash
npm install
npm start
```

## Recent Changes
- Configured to run on port 5000 with host 0.0.0.0 for Replit environment
- Added CORS configuration for Socket.IO to allow all origins
