class Player {
    constructor(id, name, color) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.ship = null;
        this.cargo = [];
        this.depot = []; // Cards in the depot
        this.functionCards = [];
        this.score = 0;
        this.recalled = false;
        this.skipTurn = false;
        this.movesLeft = 0;
    }
}

module.exports = Player;



