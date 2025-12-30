const { Tile, TileType } = require('./tile');
const Grid = require('./grid');
const Planet = require('./planet');

class Board {
    constructor() {
        this.hub = null;
        this.tiles = [];
        this.unplacedTiles = [];
        this.planetTiles = [];
        this.blackHoleTile = null;
        this.grid = new Grid(100); // Set a scale for the grid
        this.lastPlacedTile = null;
    }

    generate() {
        let success = false;
        let attempts = 0;
        const maxRestarts = 100;

        console.log("Starting board generation...");

        while (!success && attempts < maxRestarts) {
            attempts++;
            // Reset board state
            this.tiles = [];
            this.unplacedTiles = [];
            this.planetTiles = [];
            this.lastPlacedTile = null;

            // Create the hub
            this.hub = new Tile(TileType.HUB);
            this.hub.occupiedPositions = [
                { q: 0, r: 0 },
                { q: 1, r: 0 },
                { q: 1, r: -1 },
                { q: 0, r: -1 },
                { q: -1, r: -1 },
                { q: -1, r: 0 }
            ];
            this.placeTile(this.hub, 0, 0); 
            this.lastPlacedTile = this.hub;

            // Create the triangular tiles
            const tileCounts = {
                [TileType.TELEPORTATION]: 2,
                [TileType.ASTEROID_BELT]: 2,
                [TileType.LANDING]: 6,
                [TileType.MOVEMENT]: 28
            };

            for (const type in tileCounts) {
                for (let i = 0; i < tileCounts[type]; i++) {
                    this.unplacedTiles.push(new Tile(type));
                }
            }

            // Create the planet tiles with unique IDs
            for (let i = 0; i < 6; i++) {
                const planet = new Planet();
                planet.planetId = i;
                this.planetTiles.push(planet);
            }

            // Create the black hole tile
            this.blackHoleTile = new Tile(TileType.BLACK_HOLE);

            // Shuffle the tiles
            this.unplacedTiles.sort(() => Math.random() - 0.5);

            // Place the tiles
            this.placeTiles();

            // Check if all tiles were placed
            if (this.unplacedTiles.length === 0 && this.planetTiles.length === 0) {
                this.prune();
                success = true;
                console.log(`Board generated successfully after ${attempts} attempts.`);
            } else {
                // console.log(`Board generation failed (stuck). Retrying... (Attempt ${attempts})`);
                // If failed, clear tiles so we don't send partial board
                if (attempts === maxRestarts) {
                    console.log("Max restarts reached. Generating fallback board.");
                    this.generateFallbackBoard();
                    success = true;
                }
            }
        }

        if (!success) {
            console.error("Failed to generate a valid board after maximum restarts.");
            // Do NOT clear tiles here, let's see what we have.
            // this.tiles = []; 
        }
    }

    generateFallbackBoard() {
        console.log("Generating fallback board...");
        // Create a simple hexagonal grid of tiles
        this.tiles = [];
        this.hub = new Tile(TileType.HUB);
        this.hub.occupiedPositions = [{q:0,r:0}, {q:1,r:0}, {q:1,r:-1}, {q:0,r:-1}, {q:-1,r:-1}, {q:-1,r:0}];
        this.placeTile(this.hub, 0, 0);

        const allTiles = [];
        // Re-create tiles
        const tileCounts = {
            [TileType.TELEPORTATION]: 2,
            [TileType.ASTEROID_BELT]: 2,
            [TileType.LANDING]: 6,
            [TileType.MOVEMENT]: 28
        };
        for (const type in tileCounts) {
            for (let i = 0; i < tileCounts[type]; i++) {
                allTiles.push(new Tile(type));
            }
        }
        allTiles.sort(() => Math.random() - 0.5);

        this.unplacedTiles = allTiles;
        this.planetTiles = []; 
        
        let forceAttempts = 0;
        while(this.unplacedTiles.length > 0 && forceAttempts < 10000) {
             const available = this.getValidPlacements(); 
             if(available.length > 0) {
                 const pos = available[Math.floor(Math.random() * available.length)];
                 const tile = this.unplacedTiles.shift();
                 this.placeTile(tile, pos.q, pos.r);
             } else {
                 // If no valid placements, break to avoid infinite loop
                 // But wait, if we have tiles left, we should try harder?
                 // No, if getValidPlacements returns empty, we are truly stuck.
                 console.log("Fallback stuck: No valid placements.");
                 break;
             }
             forceAttempts++;
        }
        console.log(`Fallback board generated with ${this.tiles.length} tiles.`);
    }

    placeTile(tile, q, r) {
        tile.position = { q, r };
        this.tiles.push(tile);
        this.lastPlacedTile = tile;
    }

    placeTiles() {
        let attempts = 0;
        const maxAttempts = 5000; // Increased from 1000

        while (this.unplacedTiles.length > 0 && attempts < maxAttempts) {
            const availablePositions = this.getValidPlacements();
            if (availablePositions.length === 0) {
                console.error("No available positions to place tile! Retrying generation...");
                // Simple retry strategy: Backtrack? Or just stop?
                // For now, let's just break.
                break;
            }
            const randomPosition = availablePositions[Math.floor(Math.random() * availablePositions.length)];
            const tileToPlace = this.unplacedTiles.shift();
            this.placeTile(tileToPlace, randomPosition.q, randomPosition.r);

            if (tileToPlace.type === TileType.LANDING) {
                this.placePlanetTile(tileToPlace);
            }
            attempts++;
        }
    }

    placePlanetTile(landingTile) {
        if (this.planetTiles.length === 0) return;
        const planetTile = this.planetTiles[0]; // Peek first
        
        const availablePairs = this.getAvailablePlanetPairs(landingTile);
        if (availablePairs.length > 0) {
            const randomPair = availablePairs[Math.floor(Math.random() * availablePairs.length)];
            
            planetTile.occupiedPositions = [randomPair.p1, randomPair.p2];
            // planetId is preserved from planet creation
            this.placeTile(planetTile, randomPair.p1.q, randomPair.p1.r);
            
            this.planetTiles.shift(); // Remove only on success
        }
    }

    getAvailablePlanetPairs(landingTile) {
        const availablePairs = [];
        const occupiedPositions = this.getOccupiedPositions();
        const forbiddenPositions = this.getForbiddenPositions();

        // Get neighbors of Landing tile (candidates for P1)
        const p1Candidates = this.grid.getNeighbors(landingTile.position.q, landingTile.position.r);

        for (const p1 of p1Candidates) {
            const p1Str = JSON.stringify(p1);
            if (!occupiedPositions.has(p1Str) && !forbiddenPositions.has(p1Str)) {
                
                // P1 must only touch Landing tile (and P2 later)
                const p1Neighbors = this.grid.getNeighbors(p1.q, p1.r);
                let p1OccupiedCount = 0;
                for (const n of p1Neighbors) {
                    if (occupiedPositions.has(JSON.stringify(n))) {
                        p1OccupiedCount++;
                    }
                }
                // It should only touch the Landing tile (count === 1)
                if (p1OccupiedCount !== 1) continue;

                // Now find P2 candidates (neighbors of P1)
                const p2Candidates = this.grid.getNeighbors(p1.q, p1.r);
                for (const p2 of p2Candidates) {
                    const p2Str = JSON.stringify(p2);
                    
                    // P2 cannot be Landing tile (already checked by occupied check, but explicit is safe)
                    if (p2.q === landingTile.position.q && p2.r === landingTile.position.r) continue;

                    if (!occupiedPositions.has(p2Str) && !forbiddenPositions.has(p2Str)) {
                        // P2 must be isolated (only touch P1)
                        const p2Neighbors = this.grid.getNeighbors(p2.q, p2.r);
                        let p2OccupiedCount = 0;
                        for (const n of p2Neighbors) {
                            if (occupiedPositions.has(JSON.stringify(n))) {
                                p2OccupiedCount++;
                            }
                        }
                        // P2 should touch NO occupied tiles (P1 is not occupied yet)
                        if (p2OccupiedCount === 0) {
                            availablePairs.push({ p1, p2 });
                        }
                    }
                }
            }
        }
        return availablePairs;
    }

    prune() {
        // 1. Build a map of position string -> Tile for quick lookup
        const posToTile = new Map();
        for (const tile of this.tiles) {
            if (tile.occupiedPositions) {
                for (const pos of tile.occupiedPositions) {
                    posToTile.set(JSON.stringify(pos), tile);
                }
            } else {
                posToTile.set(JSON.stringify(tile.position), tile);
            }
        }

        // 2. Build adjacency graph (Tile -> Set<Tile>)
        const adjacency = new Map();
        for (const tile of this.tiles) {
            const neighbors = new Set();
            const positions = tile.occupiedPositions || [tile.position];
            
            for (const pos of positions) {
                const gridNeighbors = this.grid.getNeighbors(pos.q, pos.r);
                for (const nPos of gridNeighbors) {
                    const neighborTile = posToTile.get(JSON.stringify(nPos));
                    if (neighborTile && neighborTile !== tile) {
                        neighbors.add(neighborTile);
                    }
                }
            }
            adjacency.set(tile, neighbors);
        }

        // 3. BFS from Hub to build parent map
        const parentMap = new Map();
        const visited = new Set();
        const queue = [this.hub];
        visited.add(this.hub);

        while (queue.length > 0) {
            const current = queue.shift();
            const neighbors = adjacency.get(current) || new Set();
            
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    parentMap.set(neighbor, current);
                    queue.push(neighbor);
                }
            }
        }

        // 4. Identify Keepers (Trace back from Targets)
        const keepers = new Set();
        keepers.add(this.hub); // Always keep the hub

        const targets = this.tiles.filter(t => 
            t.type === TileType.PLANET || 
            t.type === TileType.TELEPORTATION
        );

        for (const target of targets) {
            let current = target;
            // Trace back until we hit a node already in keepers (which eventually leads to Hub)
            // or we run out of parents (shouldn't happen if connected)
            while (current && !keepers.has(current)) {
                keepers.add(current);
                current = parentMap.get(current);
            }
            // If current is in keepers, we are connected to the main trunk.
        }

        // 5. Remove tiles not in keepers
        const originalCount = this.tiles.length;
        this.tiles = this.tiles.filter(t => keepers.has(t));
        const newCount = this.tiles.length;
        console.log(`Pruned board: Removed ${originalCount - newCount} tiles.`);
    }

    getForbiddenPositions() {
        return new Set([
            JSON.stringify({ q: 0, r: 1 }),
            JSON.stringify({ q: 2, r: -1 }),
            JSON.stringify({ q: -2, r: -1 })
        ]);
    }

    getOccupiedPositions() {
        const occupied = new Set();
        for (const tile of this.tiles) {
            if ((tile.type === TileType.HUB || tile.type === TileType.PLANET) && tile.occupiedPositions) {
                for (const pos of tile.occupiedPositions) {
                    occupied.add(JSON.stringify(pos));
                }
            } else {
                occupied.add(JSON.stringify(tile.position));
            }
        }
        return occupied;
    }

    getValidPlacements() {
        const availablePositions = [];
        const occupiedPositions = this.getOccupiedPositions();
        const visitedNeighbors = new Set();
        const forbiddenPositions = this.getForbiddenPositions();

        // Rule: No tile can touch a Planet tile (except the Landing tile it is attached to).
        // We add all neighbors of all Planet tiles to the forbidden set.
        for (const tile of this.tiles) {
            if (tile.type === TileType.PLANET && tile.occupiedPositions) {
                for (const pos of tile.occupiedPositions) {
                    const neighbors = this.grid.getNeighbors(pos.q, pos.r);
                    for (const n of neighbors) {
                        // Note: One of these neighbors is the Landing tile, which is already occupied.
                        // Adding it to forbiddenPositions is fine because it's also in occupiedPositions.
                        forbiddenPositions.add(JSON.stringify(n));
                    }
                }
            }
        }

        // Rule: Place next to the last placed tile OR one of the allowed Hub edges.
        // Allow building off ANY placed tile, not just the last one.
        // This prevents getting stuck in a dead end.
        const sources = this.tiles;

        for (const tile of sources) {
            let neighbors = [];
            if (tile.type === TileType.HUB && tile.occupiedPositions) {
                 // Hub restriction: Only allow placement on specific edges (indices 1, 3, 5)
                 const activeIndices = [1, 3, 5];
                 for (const index of activeIndices) {
                     const pos = tile.occupiedPositions[index];
                     const allNeighbors = this.grid.getNeighbors(pos.q, pos.r);
                     for (const n of allNeighbors) {
                         const isInHub = tile.occupiedPositions.some(p => p.q === n.q && p.r === n.r);
                         if (!isInHub) {
                             neighbors.push(n);
                         }
                     }
                 }
            } else {
                neighbors = this.grid.getNeighbors(tile.position.q, tile.position.r);
            }

            for (const neighbor of neighbors) {
                const neighborStr = JSON.stringify(neighbor);
                if (!occupiedPositions.has(neighborStr) && 
                    !visitedNeighbors.has(neighborStr) &&
                    !forbiddenPositions.has(neighborStr)) { // Check forbidden
                    
                    // Rule: New tile can only share an edge with ONE other tile.
                    // Check how many occupied neighbors this candidate position has.
                    const candidateNeighbors = this.grid.getNeighbors(neighbor.q, neighbor.r);
                    let occupiedNeighborCount = 0;
                    for (const cn of candidateNeighbors) {
                        if (occupiedPositions.has(JSON.stringify(cn))) {
                            occupiedNeighborCount++;
                        }
                    }

                    // Relaxed rule: Allow touching 1 or 2 tiles.
                    // If we are in fallback mode (no planets), we can be even more relaxed?
                    // But getValidPlacements doesn't know about fallback mode.
                    // Let's just stick to >= 1.
                    if (occupiedNeighborCount >= 1) {
                        availablePositions.push(neighbor);
                        visitedNeighbors.add(neighborStr);
                    }
                }
            }
        }
        return availablePositions;
    }
}

module.exports = Board;






