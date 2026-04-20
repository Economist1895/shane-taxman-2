// ============================================================
// UTILITIES — grid math, DOM helpers, animation primitive
// ============================================================



function $(id) { return document.getElementById(id); }

function inBounds(x, y) {
    return x >= 0 && x < COLS && y >= 0 && y < ROWS;
}

function getUnitAt(x, y) {
    return state.units.find(u => u.alive && u.x === x && u.y === y) || null;
}

function manhattan(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

// Attack range uses Manhattan distance so diagonals count as 2.
function attackDist(ax, ay, bx, by) {
    return Math.abs(ax - bx) + Math.abs(ay - by);
}

function tileKey(x, y) { return x + ',' + y; }

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// Promise-based animation that updates each frame.
function animate(durationMs, onUpdate) {
    return new Promise(resolve => {
        const start = performance.now();
        function step(now) {
            const t = Math.min(1, (now - start) / durationMs);
            onUpdate(t);
            if (t < 1) requestAnimationFrame(step);
            else resolve();
        }
        requestAnimationFrame(step);
    });
}
