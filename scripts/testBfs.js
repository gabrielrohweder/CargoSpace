const occupiedPositions = [
  { q: 0, r: 0 },
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: -1 },
  { q: -1, r: 0 }
];

const tileData = new Map();
const spriteKeyMap = new Map();

function register(sprite, key) {
  if (!spriteKeyMap.has(sprite)) {
    spriteKeyMap.set(sprite, new Set());
  }
  spriteKeyMap.get(sprite).add(key);
}

const hubSprite = { name: 'hub' };
for (const pos of occupiedPositions) {
  for (let s = 0; s < 4; s++) {
    const key = `${pos.q},${pos.r},${s}`;
    tileData.set(key, { type: 'hub', sprite: hubSprite, q: pos.q, r: pos.r, s });
    register(hubSprite, key);
  }
}

const moveSprite = { name: 'move' };
const movePos = { q: 2, r: 0 };
for (let s = 0; s < 4; s++) {
  const key = `${movePos.q},${movePos.r},${s}`;
  tileData.set(key, { type: 'movement', sprite: moveSprite, q: movePos.q, r: movePos.r, s });
  register(moveSprite, key);
}

function getTriangleNeighborsBase(q, r, s) {
  const neighbors = [];
  const isUp = (Math.abs(q + r)) % 2 === 0;

  if (s === 3) {
    neighbors.push({ q, r, s: 0 });
    neighbors.push({ q, r, s: 1 });
    neighbors.push({ q, r, s: 2 });
  } else {
    neighbors.push({ q, r, s: 3 });

    if (isUp) {
      if (s === 0) {
        neighbors.push({ q: q - 1, r: r, s: 2 });
        neighbors.push({ q: q + 1, r: r, s: 1 });
      } else if (s === 1) {
        neighbors.push({ q: q - 1, r: r, s: 0 });
        neighbors.push({ q: q, r: r + 1, s: 1 });
      } else if (s === 2) {
        neighbors.push({ q: q + 1, r: r, s: 0 });
        neighbors.push({ q: q, r: r + 1, s: 2 });
      }
    } else {
      if (s === 0) {
        neighbors.push({ q: q - 1, r: r, s: 2 });
        neighbors.push({ q: q + 1, r: r, s: 1 });
      } else if (s === 1) {
        neighbors.push({ q: q - 1, r: r, s: 0 });
        neighbors.push({ q: q, r: r - 1, s: 1 });
      } else if (s === 2) {
        neighbors.push({ q: q + 1, r: r, s: 0 });
        neighbors.push({ q: q, r: r - 1, s: 2 });
      }
    }
  }

  return neighbors;
}

function getNeighbors(q, r, s) {
  const currentKey = `${q},${r},${s}`;
  const currentTile = tileData.get(currentKey);
  if (!currentTile) {
    return [];
  }

  const results = [];
  const seen = new Set();
  const keysToExplore = [];

  if (currentTile.type === 'movement') {
    keysToExplore.push(currentKey);
  } else {
    const spriteKeys = spriteKeyMap.get(currentTile.sprite);
    if (spriteKeys) {
      spriteKeys.forEach(keyStr => keysToExplore.push(keyStr));
    } else {
      keysToExplore.push(currentKey);
    }
  }

  for (const keyStr of keysToExplore) {
    const [kq, kr, ks] = keyStr.split(',').map(Number);
    const baseNeighbors = getTriangleNeighborsBase(kq, kr, ks);

    for (const neighbor of baseNeighbors) {
      let neighborS = neighbor.s;
      let neighborKey = `${neighbor.q},${neighbor.r},${neighborS}`;
      let neighborTile = tileData.get(neighborKey);

      if (!neighborTile && neighborS !== 3) {
        neighborS = 3;
        neighborKey = `${neighbor.q},${neighbor.r},${neighborS}`;
        neighborTile = tileData.get(neighborKey);
      }

      if (!neighborTile) {
        continue;
      }

      if (neighborTile.sprite === currentTile.sprite && currentTile.type !== 'movement') {
        continue;
      }

      const canonicalS = neighborTile.type === 'movement' ? neighborS : 3;
      const canonicalKey = `${neighborTile.q},${neighborTile.r},${canonicalS}`;

      if (seen.has(canonicalKey)) {
        continue;
      }

      seen.add(canonicalKey);
      results.push({ q: neighborTile.q, r: neighborTile.r, s: canonicalS });
    }
  }

  return results;
}

function bfs(range) {
  const startQ = 0;
  const startR = 0;
  const startS = 3;
  let startKey = `${startQ},${startR},${startS}`;
  let startTile = tileData.get(startKey);
  if (!startTile && startS !== 3) {
    startKey = `${startQ},${startR},3`;
    startTile = tileData.get(startKey);
  }
  const startSCanonical = startTile && startTile.type !== 'movement' ? 3 : startS;
  startKey = `${startQ},${startR},${startSCanonical}`;

  const queue = [{ q: startQ, r: startR, s: startSCanonical, dist: 0 }];
  const bestDistances = new Map();
  bestDistances.set(startKey, 0);

  while (queue.length > 0) {
    queue.sort((a, b) => a.dist - b.dist);
    const current = queue.shift();
    const currentKey = `${current.q},${current.r},${current.s}`;
    const recorded = bestDistances.get(currentKey);

    if (recorded === undefined || current.dist > recorded) {
      continue;
    }

    if (current.dist >= range) {
      continue;
    }

    const currentTileData = tileData.get(currentKey);

    const neighbors = getNeighbors(current.q, current.r, current.s);

    for (const neighbor of neighbors) {
      let neighborS = neighbor.s;
      let key = `${neighbor.q},${neighbor.r},${neighborS}`;
      let tile = tileData.get(key);

      if (!tile && neighborS !== 3) {
        neighborS = 3;
        key = `${neighbor.q},${neighbor.r},${neighborS}`;
        tile = tileData.get(key);
      }

      if (!tile) {
        continue;
      }

      if (tile.type !== 'movement' && neighborS !== 3) {
        neighborS = 3;
        key = `${neighbor.q},${neighbor.r},${neighborS}`;
        tile = tileData.get(key);
        if (!tile) {
          continue;
        }
      }

      let stepCost = 1;

      if (current.q === neighbor.q && current.r === neighbor.r) {
        if (currentTileData && currentTileData.type !== 'movement') {
          stepCost = 0;
        }
      }

      const dist = current.dist + stepCost;

      if (dist > range) {
        continue;
      }

      const prevBest = bestDistances.get(key);
      if (prevBest !== undefined && dist >= prevBest) {
        continue;
      }

      bestDistances.set(key, dist);
      queue.push({ q: neighbor.q, r: neighbor.r, s: neighborS, dist });
    }
  }

  return bestDistances;
}

const best = bfs(2);
for (let s = 0; s < 4; s++) {
  const key = `${movePos.q},${movePos.r},${s}`;
  console.log(key, best.get(key));
}

function neighborsRaw(q, r, s) {
  return getTriangleNeighborsBase(q, r, s).map(n => `${n.q},${n.r},${n.s}`);
}

console.log('forward', neighborsRaw(1, 0, 2));
console.log('reverse', neighborsRaw(2, 0, 0));
