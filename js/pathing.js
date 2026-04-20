// ============================================================
// PATHING — movement BFS, attack-range queries, move animation
// ============================================================




function getMovementRange(unit) {
    const result = [];
    const seen = new Set();
    const queue = [{ x: unit.x, y: unit.y, steps: 0 }];
    seen.add(tileKey(unit.x, unit.y));

    // include current tile as a valid "stay" option
    result.push({ x: unit.x, y: unit.y });

    while (queue.length) {
        const { x, y, steps } = queue.shift();
        if (steps >= unit.movement) continue;

        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
            const nx = x + dx, ny = y + dy;
            const k = tileKey(nx, ny);
            if (!inBounds(nx, ny) || seen.has(k)) continue;
            if (MAP[ny][nx] !== GRASS) continue;

            const blocking = getUnitAt(nx, ny);
            if (blocking && blocking.team !== unit.team) continue; // can't pass enemies

            seen.add(k);
            queue.push({ x: nx, y: ny, steps: steps + 1 });

            // Can only STOP on a tile that isn't occupied
            if (!blocking) result.push({ x: nx, y: ny });
        }
    }
    return result;
}

// Tiles within attack range from a position (not filtered by enemy presence).
function getAttackTilesFrom(unit, fx, fy) {
    const tiles = [];
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const d = attackDist(x, y, fx, fy);
            if (d >= unit.minRange && d <= unit.maxRange) tiles.push({ x, y });
        }
    }
    return tiles;
}

function getAttackableEnemies(unit, fx, fy) {
    const targets = [];
    for (const u of state.units) {
        if (!u.alive || u.team === unit.team) continue;
        const d = attackDist(u.x, u.y, fx, fy);
        if (d >= unit.minRange && d <= unit.maxRange) targets.push(u);
    }
    return targets;
}

// BFS path from unit position to target (treats allies as passable, enemies blocked).
function findPath(unit, tx, ty) {
    const startKey = tileKey(unit.x, unit.y);
    const targetKey = tileKey(tx, ty);
    if (startKey === targetKey) return [{ x: unit.x, y: unit.y }];

    const parent = new Map();
    const queue = [{ x: unit.x, y: unit.y }];
    parent.set(startKey, null);

    while (queue.length) {
        const cur = queue.shift();
        if (cur.x === tx && cur.y === ty) break;

        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
            const nx = cur.x + dx, ny = cur.y + dy;
            const k = tileKey(nx, ny);
            if (!inBounds(nx, ny) || parent.has(k)) continue;
            if (MAP[ny][nx] !== GRASS) continue;
            const blocking = getUnitAt(nx, ny);
            if (blocking && blocking.team !== unit.team) continue;
            parent.set(k, { x: cur.x, y: cur.y });
            queue.push({ x: nx, y: ny });
        }
    }

    // Reconstruct
    if (!parent.has(targetKey)) return [{ x: unit.x, y: unit.y }, { x: tx, y: ty }];
    const path = [];
    let cur = { x: tx, y: ty };
    while (cur) {
        path.unshift(cur);
        cur = parent.get(tileKey(cur.x, cur.y));
    }
    return path;
}

async function animateMovement(unit, destX, destY) {
    const path = findPath(unit, destX, destY);
    state.inputLocked = true;
    for (let i = 1; i < path.length; i++) {
        const from = path[i-1], to = path[i];
        await animate(140, t => {
            unit.renderX = from.x + (to.x - from.x) * t;
            unit.renderY = from.y + (to.y - from.y) * t;
        });
    }
    unit.x = destX;
    unit.y = destY;
    unit.renderX = destX;
    unit.renderY = destY;
    state.inputLocked = false;
}
