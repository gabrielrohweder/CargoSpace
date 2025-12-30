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
        // Horizontal spacing between triangle centers: s / 2
        // Every odd (down) triangle is shifted upward by h / 3 so shared edges align.

        const s = this.scale;
        const h = s * Math.sqrt(3) / 2;
        const parity = Math.abs(q + r) % 2; // 0 for up, 1 for down

        const x = q * (s / 2);
        const y = (r * h) - (parity ? h / 3 : 0);

        return { x, y };
    }
}

module.exports = Grid;

