const Board = require('./board');
const { Deck, CargoCard, FunctionCard, CargoType, CargoColor } = require('./cards');
const Player = require('./player');
const Ship = require('./ship');
const Planet = require('./planet');
const { TileType } = require('./tile');

class Game {
    constructor(movementTiles = 6, asteroidBelts = true) {
        this.board = new Board(movementTiles, asteroidBelts);
        this.players = [];
        this.cargoDeck = null;
        this.functionDeck = null;
        this.discardPile = new Deck();
        this.currentPlayer = null;
        this.movementTiles = movementTiles;
    }

    setup(playerNames) {
        this.board.generate();
        this.setupDecks();
        this.setupPlayers(playerNames);
        this.setupMarkets();
    }

    setupDecks() {
        // Create cargo cards
        const cargoCards = [];
        const types = [CargoType.FOOD, CargoType.ENERGY, CargoType.MATERIAL, CargoType.DATA];
        const colors = [CargoColor.RED, CargoColor.BLUE, CargoColor.GREEN, CargoColor.YELLOW];

        for (const type of types) {
            for (const color of colors) {
                for (let i = 0; i < 3; i++) {
                    cargoCards.push(new CargoCard(type, color));
                }
            }
        }
        for (let i = 0; i < 6; i++) {
            cargoCards.push(new CargoCard(CargoType.WILD, CargoColor.WILD));
        }

        this.cargoDeck = new Deck(cargoCards);
        this.cargoDeck.shuffle();

        // Create function cards
        const functionCards = [];
        const functionCardData = {
            'Repair Bot': 6, 'Mishap': 2, 'Rebound': 2, 'Market Shift': 2, 'Hijack': 2,
            'Upload': 2, 'Impulse': 2, 'Expired license': 2, 'Market Regulation': 2,
            'Free Port': 2, 'Hinder': 2, 'Recall': 2, 'Jammer': 2, 'Jettison': 2,
            'Delivery': 2, 'Warp': 2, 'Stealth': 2, 'Data Switch': 2, 'Jump': 2,
            'Glitch': 2, 'I.D. Fraud': 1, 'Replicator': 1, 'Breakdown': 1, 'Root': 1, 'EMP': 1
        };
        
        const functionCardDescriptions = {
            'Repair Bot': 'Unlock target player\'s cargo',
            'Mishap': 'Lock out target player\'s cargo',
            'Rebound': 'Target player returns to the hub',
            'Market Shift': 'Change market of any planet with top discard card',
            'Hijack': 'Take cargo from player & lock their remaining cargo',
            'Upload': 'Place one cargo onto another player\'s depot',
            'Impulse': 'Target shuffles all function cards into deck',
            'Expired license': 'Target puts all cargo at bottom of depot',
            'Market Regulation': 'Switch any two planetary markets',
            'Free Port': 'Play any cargo card on your current planet',
            'Hinder': 'Place the black hole where you choose',
            'Recall': 'Send player to Hub, fill cargo, no function card',
            'Jammer': 'Lock one cargo for each player (including you)',
            'Jettison': 'Target shuffles one cargo into discard deck',
            'Delivery': 'Target player fills cargo slots from depot',
            'Warp': 'Target player moves to a random planet',
            'Stealth': 'Move 4 spaces, nothing blocks movement',
            'Data Switch': 'Switch cargo cards between any two players',
            'Jump': 'Target jumps to any planet of your choice',
            'Glitch': 'Draw function card, move up to 10 spaces',
            'I.D. Fraud': 'Target loads open cargo slots from your depot',
            'Replicator': 'Reveal & play this as any of your function cards',
            'Breakdown': 'Target player skips their next turn',
            'Root': 'Look at target\'s function cards, play one as your own',
            'EMP': 'All players shuffle function cards into deck'
        };

        for (const name in functionCardData) {
            for (let i = 0; i < functionCardData[name]; i++) {
                functionCards.push(new FunctionCard(name, functionCardDescriptions[name] || ''));
            }
        }

        this.functionDeck = new Deck(functionCards);
        this.functionDeck.shuffle();
    }

    setupPlayers(playerNames) {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#FFD93D'];
        
        for (let i = 0; i < playerNames.length; i++) {
            const player = new Player(i, playerNames[i], colors[i % colors.length]);
            const ship = new Ship();
            ship.position = this.board.hub.position;
            player.ship = ship;
            this.players.push(player);
        }
    }

    dealInitialCards() {
        // Deal depot cards evenly to players
        const cardsPerPlayer = Math.floor((this.cargoDeck.cards.length - 10) / this.players.length);
        
        for (const player of this.players) {
            // Deal depot cards
            for (let i = 0; i < cardsPerPlayer; i++) {
                const card = this.cargoDeck.draw();
                if (card) {
                    player.depot.push(card);
                }
            }
            
            // Deal initial 3 cargo cards from depot
            for (let i = 0; i < 3; i++) {
                if (player.depot.length > 0) {
                    player.cargo.push(player.depot.shift());
                }
            }
            
            // Deal 2 function cards to each player
            for (let i = 0; i < 2; i++) {
                const functionCard = this.functionDeck.draw();
                if (functionCard) {
                    player.functionCards.push(functionCard);
                }
            }
        }
        
        console.log('[DEBUG] Server Log: Function cards dealt - Player 0 has', this.players[0]?.functionCards.length, 'function cards');
    }

    setupMarkets() {
        const planets = this.board.tiles.filter(tile => tile instanceof Planet);
        for (const planet of planets) {
            const card = this.cargoDeck.draw();
            if (card) {
                planet.market = card;
            }
        }
    }

    addPlayer(socketId, playerName) {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#FFD93D'];
        const playerId = this.players.length;
        const player = new Player(playerId, playerName, colors[playerId % colors.length]);
        player.socketId = socketId;
        const ship = new Ship();
        ship.position = this.board.hub.position;
        player.ship = ship;
        this.players.push(player);
        return player;
    }

    removePlayer(socketId) {
        const playerIndex = this.players.findIndex(p => p.socketId === socketId);
        if (playerIndex !== -1) {
            const removedPlayer = this.players.splice(playerIndex, 1)[0];
            
            // If the removed player was the current player, advance to next player
            if (this.currentPlayer && this.currentPlayer.socketId === socketId && this.players.length > 0) {
                this.currentPlayer = this.players[0];
            } else if (this.players.length === 0) {
                this.currentPlayer = null;
            }
            
            return removedPlayer;
        }
        return null;
    }

    start() {
        this.currentPlayer = this.players[0];
    }

    move(direction) {
        const { q, r } = this.currentPlayer.ship.position;
        const newPosition = { q: q + direction.q, r: r + direction.r };

        // Check if the new position is valid
        const targetTile = this.board.tiles.find(tile => tile.position.q === newPosition.q && tile.position.r === newPosition.r);
        if (targetTile && targetTile.type !== TileType.ASTEROID_BELT && targetTile.type !== TileType.BLACK_HOLE) {
            this.currentPlayer.ship.position = newPosition;
            return true;
        }
        return false;
    }

    movePath(path) {
        // Assuming path is an array of positions
        const lastPosition = path[path.length - 1];
        this.currentPlayer.ship.position = lastPosition;
        return true;
    }

    drawCargoCard() {
        if (this.currentPlayer.cargo.length < this.currentPlayer.ship.cargoCapacity) {
            const card = this.cargoDeck.draw();
            if (card) {
                this.currentPlayer.cargo.push(card);
                return true;
            }
        }
        return false;
    }

    drawFunctionCard() {
        if (!this.currentPlayer.recalled) {
            const card = this.functionDeck.draw();
            if (card) {
                this.currentPlayer.functionCards.push(card);
                return true;
            }
        }
        return false;
    }

    rollDice() {
        const die1 = Math.floor(Math.random() * 6) + 1;
        const die2 = Math.floor(Math.random() * 6) + 1;
        return [die1, die2];
    }

    nextTurn() {
        this.currentPlayer.recalled = false;
        let currentPlayerIndex = this.players.findIndex(p => p.id === this.currentPlayer.id);
        let nextPlayer;
        do {
            const nextPlayerIndex = (currentPlayerIndex + 1) % this.players.length;
            nextPlayer = this.players[nextPlayerIndex];
            currentPlayerIndex = nextPlayerIndex;
        } while (nextPlayer.skipTurn);
        this.currentPlayer = nextPlayer;
        this.currentPlayer.skipTurn = false;
    }

    playFunctionCard(cardIndex, targetId) {
        const card = this.currentPlayer.functionCards[cardIndex];
        if (card) {
            switch (card.name) {
                case 'Mishap':
                    const targetPlayerMishap = this.players.find(p => p.id === targetId);
                    if (targetPlayerMishap) {
                        targetPlayerMishap.cargo.forEach(c => c.locked = true);
                        this.currentPlayer.functionCards.splice(cardIndex, 1);
                        return true;
                    }
                    break;
                case 'Repair Bot':
                    const targetPlayerRepair = this.players.find(p => p.id === targetId);
                    if (targetPlayerRepair) {
                        targetPlayerRepair.cargo.forEach(c => c.locked = false);
                        this.currentPlayer.functionCards.splice(cardIndex, 1);
                        return true;
                    }
                    break;
                case 'Rebound':
                    const targetPlayerRebound = this.players.find(p => p.id === targetId);
                    if (targetPlayerRebound) {
                        targetPlayerRebound.ship.position = this.board.hub.position;
                        this.currentPlayer.functionCards.splice(cardIndex, 1);
                        return true;
                    }
                    break;
                case 'Market Shift':
                    const planet = this.board.tiles.find(t => t.id === targetId); // Assuming targetId is the planet id
                    if (planet && planet instanceof Planet) {
                        const newMarketCard = this.discardPile.draw();
                        if (newMarketCard) {
                            const oldMarketCard = planet.market;
                            this.discardPile.add(oldMarketCard);
                            planet.market = newMarketCard;
                            this.currentPlayer.functionCards.splice(cardIndex, 1);
                            return true;
                        }
                    }
                    break;
                case 'Hijack':
                    const targetPlayerHijack = this.players.find(p => p.id === targetId.playerId);
                    if (targetPlayerHijack && targetPlayerHijack.cargo[targetId.cardIndex]) {
                        const stolenCard = targetPlayerHijack.cargo.splice(targetId.cardIndex, 1)[0];
                        this.currentPlayer.cargo.push(stolenCard);
                        targetPlayerHijack.cargo.forEach(c => c.locked = true);
                        this.currentPlayer.functionCards.splice(cardIndex, 1);
                        return true;
                    }
                    break;
                case 'Upload':
                    const targetPlayerUpload = this.players.find(p => p.id === targetId.playerId);
                    if (targetPlayerUpload && this.currentPlayer.cargo[targetId.cardIndex]) {
                        const cardToUpload = this.currentPlayer.cargo.splice(targetId.cardIndex, 1)[0];
                        targetPlayerUpload.cargo.push(cardToUpload);
                        this.currentPlayer.functionCards.splice(cardIndex, 1);
                        return true;
                    }
                    break;
                case 'Impulse':
                    const targetPlayerImpulse = this.players.find(p => p.id === targetId);
                    if (targetPlayerImpulse) {
                        this.functionDeck.cards.push(...targetPlayerImpulse.functionCards);
                        targetPlayerImpulse.functionCards = [];
                        this.functionDeck.shuffle();
                        this.currentPlayer.functionCards.splice(cardIndex, 1);
                        return true;
                    }
                    break;
                case 'Expired license':
                    const targetPlayerExpired = this.players.find(p => p.id === targetId);
                    if (targetPlayerExpired) {
                        targetPlayerExpired.cargo.push(...targetPlayerExpired.cargo.splice(0));
                        this.currentPlayer.functionCards.splice(cardIndex, 1);
                        return true;
                    }
                    break;
                case 'Market Regulation':
                    const planet1 = this.board.tiles.find(t => t.id === targetId.planet1Id);
                    const planet2 = this.board.tiles.find(t => t.id === targetId.planet2Id);
                    if (planet1 && planet1 instanceof Planet && planet2 && planet2 instanceof Planet) {
                        const market1 = planet1.market;
                        planet1.market = planet2.market;
                        planet2.market = market1;
                        this.currentPlayer.functionCards.splice(cardIndex, 1);
                        return true;
                    }
                    break;
                case 'Free Port':
                    const currentTile = this.board.tiles.find(t => t.position.q === this.currentPlayer.ship.position.q && t.position.r === this.currentPlayer.ship.position.r);
                    if (currentTile && currentTile instanceof Planet) {
                        const cargoCard = this.currentPlayer.cargo[targetId.cardIndex];
                        if (cargoCard && (cargoCard.type === currentTile.market.type || cargoCard.color === currentTile.market.color)) {
                            this.discardPile.add(this.currentPlayer.cargo.splice(targetId.cardIndex, 1)[0]);
                            this.currentPlayer.score += 1; // Add scoring logic later
                            this.currentPlayer.functionCards.splice(cardIndex, 1);
                            return true;
                        }
                    }
                    break;
                case 'Hinder':
                    const targetTileIndex = this.board.tiles.findIndex(t => t.position.q === targetId.q && t.position.r === targetId.r);
                    if (targetTileIndex !== -1) {
                        const targetTile = this.board.tiles[targetTileIndex];
                        if (targetTile && !(targetTile instanceof Planet) && targetTile.type !== TileType.HUB) {
                            // If the black hole is already on the board, remove it from its current position
                            const blackHoleIndex = this.board.tiles.findIndex(t => t.type === TileType.BLACK_HOLE);
                            if (blackHoleIndex !== -1) {
                                this.board.tiles.splice(blackHoleIndex, 1);
                            }

                            this.board.tiles[targetTileIndex] = this.board.blackHoleTile;
                            this.board.blackHoleTile.position = targetTile.position;
                            this.currentPlayer.functionCards.splice(cardIndex, 1);
                            return true;
                        }
                    }
                    break;
                case 'Recall':
                    const targetPlayerRecall = this.players.find(p => p.id === targetId);
                    if (targetPlayerRecall) {
                        targetPlayerRecall.ship.position = this.board.hub.position;
                        while (targetPlayerRecall.cargo.length < targetPlayerRecall.ship.cargoCapacity) {
                            const card = this.cargoDeck.draw();
                            if (card) {
                                targetPlayerRecall.cargo.push(card);
                            } else {
                                break; // No more cards in the deck
                            }
                        }
                        targetPlayerRecall.recalled = true;
                        this.currentPlayer.functionCards.splice(cardIndex, 1);
                        return true;
                    }
                    break;
                case 'Jammer':
                    for (const playerId in targetId) {
                        const player = this.players.find(p => p.id === parseInt(playerId));
                        const cardIndexToLock = targetId[playerId];
                        if (player && player.cargo[cardIndexToLock]) {
                            player.cargo[cardIndexToLock].locked = true;
                        }
                    }
                    this.currentPlayer.functionCards.splice(cardIndex, 1);
                    return true;
                case 'Jettison':
                    const targetPlayerJettison = this.players.find(p => p.id === targetId.playerId);
                    if (targetPlayerJettison && targetPlayerJettison.cargo[targetId.cardIndex]) {
                        const jettisonedCard = targetPlayerJettison.cargo.splice(targetId.cardIndex, 1)[0];
                        this.discardPile.add(jettisonedCard);
                        this.currentPlayer.functionCards.splice(cardIndex, 1);
                        return true;
                    }
                    break;
                case 'Delivery':
                    const targetPlayerDelivery = this.players.find(p => p.id === targetId);
                    if (targetPlayerDelivery) {
                        while (targetPlayerDelivery.cargo.length < targetPlayerDelivery.ship.cargoCapacity) {
                            const card = this.cargoDeck.draw();
                            if (card) {
                                targetPlayerDelivery.cargo.push(card);
                            } else {
                                break; // No more cards in the deck
                            }
                        }
                        this.currentPlayer.functionCards.splice(cardIndex, 1);
                        return true;
                    }
                    break;
                case 'Warp':
                    const targetPlayerWarp = this.players.find(p => p.id === targetId);
                    if (targetPlayerWarp) {
                        const planets = this.board.tiles.filter(t => t instanceof Planet);
                        if (planets.length > 0) {
                            const randomPlanet = planets[Math.floor(Math.random() * planets.length)];
                            targetPlayerWarp.ship.position = randomPlanet.position;
                            this.currentPlayer.functionCards.splice(cardIndex, 1);
                            return true;
                        }
                    }
                    break;
                case 'Stealth':
                    this.movePath(targetId.path);
                    this.currentPlayer.functionCards.splice(cardIndex, 1);
                    return true;
                case 'Data Switch':
                    const player1 = this.players.find(p => p.id === targetId.player1Id);
                    const player2 = this.players.find(p => p.id === targetId.player2Id);
                    if (player1 && player2 && player1.cargo[targetId.card1Index] && player2.cargo[targetId.card2Index]) {
                        const card1 = player1.cargo[targetId.card1Index];
                        player1.cargo[targetId.card1Index] = player2.cargo[targetId.card2Index];
                        player2.cargo[targetId.card2Index] = card1;
                        this.currentPlayer.functionCards.splice(cardIndex, 1);
                        return true;
                    }
                    break;
                case 'Jump':
                    const targetPlayerJump = this.players.find(p => p.id === targetId.playerId);
                    const planetJump = this.board.tiles.find(t => t.id === targetId.planetId);
                    if (targetPlayerJump && planetJump && planetJump instanceof Planet) {
                        targetPlayerJump.ship.position = planetJump.position;
                        this.currentPlayer.functionCards.splice(cardIndex, 1);
                        return true;
                    }
                    break;
                case 'Glitch':
                    this.drawFunctionCard();
                    this.movePath(targetId.path);
                    this.currentPlayer.functionCards.splice(cardIndex, 1);
                    return true;
                case 'I.D. Fraud':
                    const targetPlayerIdFraud = this.players.find(p => p.id === targetId);
                    if (targetPlayerIdFraud) {
                        while (targetPlayerIdFraud.cargo.length < targetPlayerIdFraud.ship.cargoCapacity && this.currentPlayer.cargo.length > 0) {
                            const card = this.currentPlayer.cargo.pop();
                            if (card) {
                                targetPlayerIdFraud.cargo.push(card);
                            } else {
                                break;
                            }
                        }
                        this.currentPlayer.functionCards.splice(cardIndex, 1);
                        return true;
                    }
                    break;
                case 'Replicator':
                    const replicatedCardIndex = targetId.cardIndex;
                    if (this.currentPlayer.functionCards[replicatedCardIndex]) {
                        // Temporarily remove the replicator card to avoid infinite recursion
                        const replicatorCard = this.currentPlayer.functionCards.splice(cardIndex, 1)[0];
                        const result = this.playFunctionCard(replicatedCardIndex, targetId.targetOfReplicatedCard);
                        // Re-add the replicator card after playing
                        this.currentPlayer.functionCards.splice(cardIndex, 0, replicatorCard);
                        return result;
                    }
                    break;
                case 'Breakdown':
                    const targetPlayerBreakdown = this.players.find(p => p.id === targetId);
                    if (targetPlayerBreakdown) {
                        targetPlayerBreakdown.skipTurn = true;
                        this.currentPlayer.functionCards.splice(cardIndex, 1);
                        return true;
                    }
                    break;
                case 'EMP':
                    for (const player of this.players) {
                        this.functionDeck.cards.push(...player.functionCards);
                        player.functionCards = [];
                    }
                    this.functionDeck.shuffle();
                    this.currentPlayer.functionCards.splice(cardIndex, 1);
                    return true;
                default:
                    return false;
            }
        }
        return false;
    }

    isPlayerOnHub(player) {
        if (!player || !player.ship) {
            console.log('[isPlayerOnHub] Player or ship missing');
            return false;
        }
        const hubPos = this.board.hub.position;
        const shipPos = player.ship.position;
        console.log('[isPlayerOnHub] Comparing - Hub:', hubPos, 'Ship:', shipPos);
        const onHub = shipPos.q === hubPos.q && shipPos.r === hubPos.r;
        console.log('[isPlayerOnHub] Result:', onHub);
        return onHub;
    }

    handleHubArrival(socketId) {
        const player = this.players.find(p => p.socketId === socketId);
        if (!player) return { success: false, message: 'Player not found' };

        const hadNoCargo = player.cargo.length === 0;
        console.log(`[handleHubArrival] Player ${player.name} - hadNoCargo: ${hadNoCargo}, cargo: ${player.cargo.length}, depot: ${player.depot.length}`);

        // Fill cargo to capacity from depot
        while (player.cargo.length < player.ship.cargoCapacity && player.depot.length > 0) {
            player.cargo.push(player.depot.shift());
        }

        // Only draw 1 function card if they had NO cargo when they arrived
        if (hadNoCargo) {
            const card = this.functionDeck.draw();
            if (card) {
                player.functionCards.push(card);
                console.log(`[handleHubArrival] Player ${player.name} had no cargo, gave 1 function card: ${card.name}`);
            }
        } else {
            console.log(`[handleHubArrival] Player ${player.name} had cargo, no function card given`);
        }

        return {
            success: true,
            message: hadNoCargo 
                ? `${player.name} arrived at the hub! Cargo refilled and received 1 function card.`
                : `${player.name} arrived at the hub! Cargo refilled.`,
            cargoCount: player.cargo.length,
            functionCardCount: player.functionCards.length,
            hadNoCargo: hadNoCargo
        };
    }

    deliverCargo(socketId, planetQ, planetR, cargoIndex) {
        const player = this.players.find(p => p.socketId === socketId);
        if (!player) return { success: false, message: 'Player not found' };

        // Find the planet at the given position
        const planet = this.board.tiles.find(tile => 
            tile instanceof Planet && tile.position.q === planetQ && tile.position.r === planetR
        );

        if (!planet) return { success: false, message: 'No planet at this location' };
        if (!planet.market) return { success: false, message: 'This planet has no market' };

        const cargoCard = player.cargo[cargoIndex];
        if (!cargoCard) return { success: false, message: 'No cargo at this index' };
        if (cargoCard.locked) return { success: false, message: 'This cargo is locked' };

        const market = planet.market;
        const colorMatch = cargoCard.color === market.color || cargoCard.color === 'wild' || market.color === 'wild';
        const typeMatch = cargoCard.type === market.type || cargoCard.type === 'wild' || market.type === 'wild';
        
        if (!colorMatch && !typeMatch) {
            return { success: false, message: 'Cargo does not match market requirements' };
        }

        // Exact match only if BOTH color and type match (no wildcards)
        const exactMatch = cargoCard.color === market.color && cargoCard.type === market.type && 
                          cargoCard.color !== 'wild' && market.color !== 'wild' && 
                          cargoCard.type !== 'wild' && market.type !== 'wild';
        const points = exactMatch ? 2 : 1;

        console.log(`[deliverCargo] Cargo: ${cargoCard.type}-${cargoCard.color}, Market: ${market.type}-${market.color}, Exact Match: ${exactMatch}`);
        console.log(`[deliverCargo] BEFORE: Player ${player.name} has ${player.cargo.length} cargo cards`);

        // Remove cargo from player's hand
        player.cargo.splice(cargoIndex, 1);
        player.score = (player.score || 0) + points;
        
        console.log(`[deliverCargo] AFTER: Player ${player.name} has ${player.cargo.length} cargo cards`);

        // If exact match (both type and color), award a function card
        let bonusFunctionCard = null;
        if (exactMatch && this.functionCardDeck && this.functionCardDeck.cards.length > 0) {
            bonusFunctionCard = this.functionCardDeck.draw();
            if (bonusFunctionCard) {
                player.functionCards.push(bonusFunctionCard);
                console.log(`[deliverCargo] Awarded bonus function card: ${bonusFunctionCard.name} to ${player.name}`);
            }
        }

        // The delivered cargo card becomes the new market
        // Old market goes to discard pile
        if (this.discardPile) {
            this.discardPile.add(planet.market);
        }
        planet.market = cargoCard;

        return {
            success: true,
            message: `Delivered cargo for ${points} point${points > 1 ? 's' : ''}!${exactMatch ? ' Bonus function card awarded!' : ''}`,
            points: points,
            exactMatch: exactMatch,
            bonusFunctionCard: bonusFunctionCard,
            newScore: player.score,
            newMarket: planet.market
        };
    }
}

module.exports = Game;


