class Grid {
    constructor(scale) {
        this.scale = scale;
    }

    // Coordinate system:
    // q: column
    // r: row
    // Orientation: (q + r) % 2 === 0 ? UP : DOWN
    // UP triangle neighbors: (q-1, r), (q+1, r), (q, r+1)
    // DOWN triangle neighbors: (q-1, r), (q+1, r), (q, r-1)

    isUp(q, r) {
        return (Math.abs(q + r)) % 2 === 0;
    }

    getNeighbors(q, r) {
        const neighbors = [
            { q: q - 1, r: r }, // Left
            { q: q + 1, r: r }  // Right
        ];

        if (this.isUp(q, r)) {
            neighbors.push({ q: q, r: r + 1 }); // Bottom
        } else {
            neighbors.push({ q: q, r: r - 1 }); // Top
        }

        return neighbors;
    }

    axialToPixel(q, r) {
        // Side length s = scale
        // Height h = s * sqrt(3) / 2
        // Width w = s
        // Horizontal spacing: w / 2
        // Vertical spacing: h
        
        const s = this.scale;
        const h = s * Math.sqrt(3) / 2;
        const w = s;

        const x = q * (w / 2);
        const y = r * h;

        return { x, y };
    }
}

module.exports = Grid;

