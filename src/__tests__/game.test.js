const Game = require('../game');

describe('Game', () => {
    it('should create a new game', () => {
        const game = new Game();
        expect(game).toBeDefined();
    });

    it('should setup the game with players', () => {
        const game = new Game();
        game.setup([]); // Setup decks and markets
        game.addPlayer('id1', 'Player 1');
        game.addPlayer('id2', 'Player 2');
        game.start(); // Generate board and initialize players

        expect(game.players.length).toBe(2);
        expect(game.players[0].name).toBe('Player 1');
        expect(game.players[1].name).toBe('Player 2');
        expect(game.board.tiles.length).toBeGreaterThan(0);
        expect(game.cargoDeck.cards.length).toBeGreaterThan(0);
        expect(game.functionDeck.cards.length).toBeGreaterThan(0);
    });
});
