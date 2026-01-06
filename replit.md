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
- Implemented complete function card system with all 24 card types
- Added visual notification system that displays card effects when played
- Root and Replicator cards now execute target card effects for major cards
- Complex cards (Market Shift, Market Regulation, Free Port, Hinder, Data Switch) use auto-selection for playability
- Fixed movement positioning bugs with correct hub position (s: 3)
- Added reusable cargo selection modal UI for cards that target cargo
- Jammer now lets player select target player then choose which cargo to lock
- Free Port now shows player's own cargo and lets them choose which to deliver
- Replicator now shows your function cards and lets you select which one to copy

### Planet Market System (January 2026)
- Each planet now has a market card that determines what cargo can be delivered
- Markets are dealt from the cargo deck when the game starts
- Delivery rules: matching color OR type allows delivery
- Exact match (both color AND type) awards a bonus function card
- Delivered cargo becomes the new market card for that planet
- Visual market badges displayed above planets showing current market requirements
- Cargo cards in the player UI highlight green when deliverable, gold for exact match
- Wild cards can substitute for missing attributes but require at least one concrete match
- Socket events: deliverCargo, getMarkets, marketUpdated, cargoDelivered

### Hub Arrival Mechanics (January 2026)
- When a player ends their turn on the hub, they refill cargo slots from their depot (up to 3 cards)
- If they had NO cargo when ending on the hub, they also receive a bonus function card
- hubArrival socket event notifies all players of the refill with visual notification

### Function Card Updates (January 2026)
- Market Regulation: Shows a popup where player selects two planets to swap their markets

### Movement System Updates (January 2026)
- Hub now has only one central movement marker (instead of one per hex)
- Hub and planet tiles allow multiple players to land simultaneously
- All other tiles (movement, teleportation, etc.) only allow one player at a time
- All occupied positions properly registered for pathfinding
