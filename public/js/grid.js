class Grid {
    constructor(scale) {
        this.scale = scale;
        this.directions = [
            { q: 1, r: 0 }, { q: -1, r: 0 },
            { q: 0, r: 1 }, { q: 0, r: -1 },
            { q: 1, r: -1 }, { q: -1, r: 1 }
        ];
    }

    axialToPixel(q, r) {
        const x = this.scale * (3 / 2 * q);
        const y = this.scale * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);
        return { x, y };
    }

    pixelToAxial(x, y) {
        const q = (2 / 3 * x) / this.scale;
        const r = (-1 / 3 * x + Math.sqrt(3) / 3 * y) / this.scale;
        return { q, r };
    }

    getNeighbors(q, r) {
        return this.directions.map(dir => ({ q: q + dir.q, r: r + dir.r }));
    }
}

// Client-side representation of TileType enum (must match server)
const TileType = {
    HUB: 'HUB',
    TELEPORTATION: 'TELEPORTATION',
    ASTEROID_BELT: 'ASTEROID_BELT',
    LANDING: 'LANDING',
    MOVEMENT: 'MOVEMENT',
    BLACK_HOLE: 'BLACK_HOLE'
};


// For client-side rendering, we need a mapping from TileType to asset image.
// We'll use placeholder images for now.
const TileTypeAssets = {
    [TileType.HUB]: 'hexagon', // Placeholder for HUB
    [TileType.TELEPORTATION]: 'rhombus', // Placeholder
    [TileType.ASTEROID_BELT]: 'star', // Placeholder
    [TileType.LANDING]: 'triangle', // Placeholder
    [TileType.MOVEMENT]: 'hexagon', // Placeholder
    [TileType.BLACK_HOLE]: 'blackhole' // Will need to add 'blackhole.png'
};

module.exports = { Grid, TileType, TileTypeAssets };
