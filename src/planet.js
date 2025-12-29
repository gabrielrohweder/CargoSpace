const { Tile, TileType } = require('./tile');

class Planet extends Tile {
    constructor() {
        super(TileType.PLANET);
        this.market = null;
    }
}

module.exports = Planet;
