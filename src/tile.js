const TileType = {
    HUB: 'hub',
    TELEPORTATION: 'teleportation',
    ASTEROID_BELT: 'asteroid_belt',
    LANDING: 'landing',
    MOVEMENT: 'movement',
    BLACK_HOLE: 'black_hole',
    PLANET: 'planet'
};

let tileIdCounter = 0;

class Tile {
    constructor(type) {
        this.id = tileIdCounter++;
        this.type = type;
        this.position = { x: 0, y: 0 };
        this.edges = [];
    }
}

module.exports = { Tile, TileType };


