const Board = require('./board');
const { Deck, CargoCard, FunctionCard, CargoType, CargoColor } = require('./cards');
const Player = require('./player');
const Ship = require('./ship');
const Planet = require('./planet');
const { TileType } = require('./tile');

class Game {
    constructor(movementTiles = 6) {
        this.board = new Board(movementTiles);
        this.players = [];
        this.cargoDeck = null;
        this.functionDeck = null;
        this.discardPile = new Deck();
        this.currentPlayer = null;
        this.movementTiles = movementTiles;
        this.availableColors = ['#0000FF', '#00FF00', '#FFFF00', '#FF0000', '#FFA500', '#800080']; // Blue, Green, Yellow, Red, Orange, Purple
    }

    addPlayer(id, name) {
        const color = this.availableColors.shift() || '#FFFFFF';
        const player = new Player(id, name, color);
        this.players.push(player);
        return player;
    }

    initializePlayer(player) {
        player.ship = new Ship();
        
        if (this.cargoDeck) {
            // 3 Cargo
            for(let i=0; i<3; i++) {
                const card = this.cargoDeck.draw();
                if(card) player.cargo.push(card);
            }
            // 5 Depot cards (dummy count)
            for(let i=0; i<5; i++) {
                const card = this.cargoDeck.draw();
                if(card) player.depot.push(card);
            }
        }
        
        // Deal 2 function cards to each player
        if (this.functionDeck) {
            for(let i=0; i<2; i++) {
                const card = this.functionDeck.draw();
                if(card) player.functionCards.push(card);
            }
        }
    }

    start() {
        console.log("Game.start() called");
        if (!this.board) {
            console.error("Board is undefined!");
            return;
        }
        this.board.generate();
        console.log("Board generation finished");
        
        this.setupMarkets();
        console.log("Markets initialized on planets");
        
        for (const player of this.players) {
            this.initializePlayer(player);
        }
        if (this.players.length > 0) {
            this.currentPlayer = this.players[0];
        }
    }
    
    canDeliverCargo(player, planet, cargoCard) {
        if (!player || !planet || !cargoCard) return { valid: false, reason: 'Invalid parameters' };
        if (cargoCard.locked) return { valid: false, reason: 'Cargo is locked' };
        if (!planet.market) return { valid: false, reason: 'Planet has no market' };
        
        const shipPos = player.ship.position;
        const occupiedPositions = planet.occupiedPositions || [planet.position];
        const isOnPlanet = occupiedPositions.some(pos => 
            parseInt(pos.q) === parseInt(shipPos.q) && parseInt(pos.r) === parseInt(shipPos.r)
        );
        if (!isOnPlanet) {
            return { valid: false, reason: 'Player is not on this planet' };
        }
        
        const market = planet.market;
        
        const cargoColorWild = cargoCard.color === 'wild';
        const cargoTypeWild = cargoCard.type === 'wild';
        const marketColorWild = market.color === 'wild';
        const marketTypeWild = market.type === 'wild';
        
        const colorExactMatch = cargoCard.color === market.color && !cargoColorWild && !marketColorWild;
        const typeExactMatch = cargoCard.type === market.type && !cargoTypeWild && !marketTypeWild;
        
        const colorMatchViaWild = cargoColorWild || marketColorWild;
        const typeMatchViaWild = cargoTypeWild || marketTypeWild;
        
        const hasColorMatch = colorExactMatch || colorMatchViaWild;
        const hasTypeMatch = typeExactMatch || typeMatchViaWild;
        
        const hasConcreteMatch = colorExactMatch || typeExactMatch;
        
        if (!hasConcreteMatch && !hasColorMatch && !hasTypeMatch) {
            return { valid: false, reason: 'Cargo does not match market (need same color OR same type)' };
        }
        
        if (!hasConcreteMatch) {
            return { valid: false, reason: 'Wild cards require at least one matching attribute' };
        }
        
        const exactMatch = colorExactMatch && typeExactMatch;
        return { valid: true, exactMatch };
    }
    
    deliverCargo(playerId, planetQ, planetR, cargoIndex) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return { success: false, error: 'Player not found' };
        
        const planet = this.board.tiles.find(t => {
            if (!(t instanceof Planet)) return false;
            const occupiedPositions = t.occupiedPositions || [t.position];
            return occupiedPositions.some(pos => 
                parseInt(pos.q) === parseInt(planetQ) && parseInt(pos.r) === parseInt(planetR)
            );
        });
        if (!planet) return { success: false, error: 'Planet not found' };
        
        const cargoCard = player.cargo[cargoIndex];
        if (!cargoCard) return { success: false, error: 'Cargo card not found' };
        
        const validation = this.canDeliverCargo(player, planet, cargoCard);
        if (!validation.valid) return { success: false, error: validation.reason };
        
        const oldMarket = planet.market;
        if (oldMarket) {
            this.discardPile.add(oldMarket);
        }
        
        player.cargo.splice(cargoIndex, 1);
        planet.market = cargoCard;
        
        let bonusCard = null;
        if (validation.exactMatch) {
            bonusCard = this.functionDeck.draw();
            if (bonusCard) {
                player.functionCards.push(bonusCard);
            }
        }
        
        return { 
            success: true, 
            exactMatch: validation.exactMatch,
            bonusCard: bonusCard,
            newMarket: cargoCard
        };
    }

    removePlayer(id) {
        const index = this.players.findIndex(p => p.id === id);
        if (index !== -1) {
            const player = this.players[index];
            // Return color to pool
            this.availableColors.unshift(player.color);
            this.players.splice(index, 1);
        }
    }

    setup(playerNames) {
        // Board generation is now triggered manually via startGame
        // this.board.generate(); 
        this.setupDecks();
        // this.setupPlayers(playerNames); // Deprecated in favor of dynamic addPlayer
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

        // Create function cards with descriptions
        const functionCards = [];
        const functionCardData = {
            'Repair Bot': { count: 6, description: 'Unlock target player\'s cargo', requiresTarget: true },
            'Mishap': { count: 2, description: 'Lockout target player\'s cargo', requiresTarget: true },
            'Rebound': { count: 2, description: 'Target player returns to the hub', requiresTarget: true },
            'Market Shift': { count: 2, description: 'Change the market of any one planet by putting the top discard pile card on that planet\'s market', requiresTarget: false },
            'Hijack': { count: 2, description: 'You take a cargo card from a player and that player must lock out their remaining cargo', requiresTarget: true },
            'Upload': { count: 2, description: 'Place one of your cargo cards onto another player\'s depot', requiresTarget: true },
            'Impulse': { count: 2, description: 'Target player must shuffle all of their function cards back into the deck', requiresTarget: true },
            'Expired license': { count: 2, description: 'Target player must put all their cargo cards at the bottom of their depot', requiresTarget: true },
            'Market Regulation': { count: 2, description: 'Switch any two planetary markets with each other', requiresTarget: false },
            'Free Port': { count: 2, description: 'Play any one cargo card on your current Planet if it is open', requiresTarget: false },
            'Hinder': { count: 2, description: 'Place the black hole where you choose', requiresTarget: false },
            'Recall': { count: 2, description: 'Send any player to the Hub. They must fill all empty cargo slots and cannot draw a Function card', requiresTarget: true },
            'Jammer': { count: 2, description: 'Choose one cargo unit for each player to lock down, including yourself', requiresTarget: false },
            'Jettison': { count: 2, description: 'Target player shuffles one cargo card of your choice into the Discard deck', requiresTarget: true },
            'Delivery': { count: 2, description: 'Target player fills their cargo slots from their depot', requiresTarget: true },
            'Warp': { count: 2, description: 'Target player moves to a random planet', requiresTarget: true },
            'Stealth': { count: 2, description: 'Move four spaces. Nothing can block your movement (No asteroids, players or black holes can block movement)', requiresTarget: false },
            'Data Switch': { count: 2, description: 'Switch one cargo card belonging to any player for another player\'s cargo card', requiresTarget: false },
            'Jump': { count: 2, description: 'Target player jumps to any planet of card player\'s choice', requiresTarget: true },
            'Glitch': { count: 2, description: 'Draw a new function card. Move your ship any number of spaces, up to 10', requiresTarget: false },
            'I.D. Fraud': { count: 1, description: 'Target player loads their open cargo slots from your depot', requiresTarget: true },
            'Replicator': { count: 1, description: 'Reveal one of your function cards to all players. Play replicator as if it were that card', requiresTarget: false },
            'Breakdown': { count: 1, description: 'Target player skips their next turn', requiresTarget: true },
            'Root': { count: 1, description: 'Look at target player\'s function cards. You must play one of those cards as your own', requiresTarget: true },
            'EMP': { count: 1, description: 'All players shuffle their function cards back into the deck. Including you', requiresTarget: false }
        };

        for (const name in functionCardData) {
            const { count, description, requiresTarget } = functionCardData[name];
            for (let i = 0; i < count; i++) {
                const card = new FunctionCard(name, description);
                card.requiresTarget = requiresTarget;
                functionCards.push(card);
            }
        }

        this.functionDeck = new Deck(functionCards);
        this.functionDeck.shuffle();
    }

    setupPlayers(playerNames) {
        for (let i = 0; i < playerNames.length; i++) {
            const player = new Player(i, playerNames[i]);
            const ship = new Ship();
            // Default to Hub center (0,0) sub-index 3 (Center)
            ship.position = { q: 0, r: 0, s: 3 };
            player.ship = ship;
            this.players.push(player);
        }
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
                case 'Root':
                    // Root card is handled separately - first show target's cards, then play selected card
                    // targetId should contain: { targetPlayerId, selectedCardIndex }
                    if (targetId && targetId.selectedCardIndex !== undefined) {
                        const targetPlayerRoot = this.players.find(p => p.id === targetId.targetPlayerId);
                        if (targetPlayerRoot && targetPlayerRoot.functionCards[targetId.selectedCardIndex]) {
                            // Play the selected card from target's hand as if current player played it
                            const success = this.playFunctionCard(targetId.selectedCardIndex, targetId.cardTarget);
                            if (success) {
                                // Remove the Root card from current player's hand
                                this.currentPlayer.functionCards.splice(cardIndex, 1);
                                return true;
                            }
                        }
                    }
                    return false;
                default:
                    return false;
            }
        }
        return false;
    }

    rollDice() {
        const die1 = Math.floor(Math.random() * 6) + 1;
        const die2 = Math.floor(Math.random() * 6) + 1;
        return [die1, die2];
    }

    isPlayerOnHub(player) {
        if (!player || !player.ship || !this.board || !this.board.hub) return false;
        
        const shipPos = player.ship.position;
        const hubPositions = this.board.hub.occupiedPositions || [{ q: 0, r: 0 }];
        
        return hubPositions.some(pos => 
            parseInt(pos.q) === parseInt(shipPos.q) && parseInt(pos.r) === parseInt(shipPos.r)
        );
    }

    refillCargoFromDepot(player, maxCargo = 3) {
        if (!player) return { cardsDrawn: 0, newCargo: [] };
        
        const cardsDrawn = [];
        while (player.cargo.length < maxCargo && player.depot.length > 0) {
            const card = player.depot.shift();
            player.cargo.push(card);
            cardsDrawn.push(card);
        }
        
        return { cardsDrawn: cardsDrawn.length, newCargo: cardsDrawn };
    }

    handleHubArrival(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return { success: false, error: 'Player not found' };
        
        if (!this.isPlayerOnHub(player)) {
            return { success: false, error: 'Player is not on hub' };
        }
        
        const hadNoCargo = player.cargo.length === 0;
        const refillResult = this.refillCargoFromDepot(player);
        
        let bonusCard = null;
        if (hadNoCargo && this.functionDeck) {
            bonusCard = this.functionDeck.draw();
            if (bonusCard) {
                player.functionCards.push(bonusCard);
            }
        }
        
        return {
            success: true,
            hadNoCargo: hadNoCargo,
            cardsRefilled: refillResult.cardsDrawn,
            newCargo: refillResult.newCargo,
            bonusCard: bonusCard
        };
    }
}

module.exports = Game;


