// ============================================================
// RENDERING — canvas setup, terrain textures, units, highlights
// ============================================================





// ============================================================
// CANVAS SETUP
// ============================================================

function setupCanvas() {
    const c = $('game-canvas');
    setCanvas(c);
    setCtx(c.getContext('2d'));
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('orientationchange', resizeCanvas);
}

function resizeCanvas() {
    const wrap = $('canvas-wrap');
    const availW = wrap.clientWidth;
    const availH = wrap.clientHeight;

    const sizeByW = Math.floor(availW / COLS);
    const sizeByH = Math.floor(availH / ROWS);
    const size = Math.max(20, Math.min(sizeByW, sizeByH));
    setTileSize(size);

    canvas.width = size * COLS;
    canvas.height = size * ROWS;
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';

    ctx.imageSmoothingEnabled = false;
}

// ============================================================
// ASSETS
// ============================================================

function loadAssets() {
    const promises = Object.entries(SPRITES).map(([key, src]) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => { assets[key] = img; resolve(); };
            img.onerror = () => reject(new Error('Failed to load ' + src));
            img.src = src;
        });
    });
    return Promise.all(promises);
}

// ============================================================
// PROCEDURAL TERRAIN TEXTURES
// ============================================================

const TILE_TEX_SIZE = 16;
const terrainTiles = { grassLight: null, grassDark: null, waterLight: [], waterDark: [] };

// Tiny seeded PRNG so textures are stable across reloads.
function mulberry32(seed) {
    return function() {
        seed = (seed + 0x6D2B79F5) | 0;
        let t = seed;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function pxSet(img, x, y, c) {
    if (x < 0 || y < 0 || x >= TILE_TEX_SIZE || y >= TILE_TEX_SIZE) return;
    const i = (y * TILE_TEX_SIZE + x) * 4;
    img.data[i  ] = c[0];
    img.data[i+1] = c[1];
    img.data[i+2] = c[2];
    img.data[i+3] = 255;
}

function makeGrassTexture(base, lightAccent, darkAccent, edge, seed) {
    const c = document.createElement('canvas');
    c.width = TILE_TEX_SIZE;
    c.height = TILE_TEX_SIZE;
    const tctx = c.getContext('2d');
    const rand = mulberry32(seed);
    const img = tctx.createImageData(TILE_TEX_SIZE, TILE_TEX_SIZE);
    for (let y = 0; y < TILE_TEX_SIZE; y++) {
        for (let x = 0; x < TILE_TEX_SIZE; x++) {
            const r = rand();
            let col = base;
            if (r < 0.08) col = darkAccent;
            else if (r < 0.18) col = lightAccent;
            pxSet(img, x, y, col);
        }
    }
    // A few 2-pixel blade tufts for silhouette interest.
    for (let i = 0; i < 4; i++) {
        const bx = Math.floor(rand() * (TILE_TEX_SIZE - 2));
        const by = 2 + Math.floor(rand() * (TILE_TEX_SIZE - 4));
        pxSet(img, bx,   by,   lightAccent);
        pxSet(img, bx,   by-1, lightAccent);
        pxSet(img, bx+1, by,   darkAccent);
    }
    // 1px darker edge along bottom + right → implicit grid without an overlay.
    for (let x = 0; x < TILE_TEX_SIZE; x++) pxSet(img, x, TILE_TEX_SIZE - 1, edge);
    for (let y = 0; y < TILE_TEX_SIZE; y++) pxSet(img, TILE_TEX_SIZE - 1, y, edge);
    tctx.putImageData(img, 0, 0);
    return c;
}

function makeWaterTexture(base, ripple, highlight, edge, seed, phase) {
    const c = document.createElement('canvas');
    c.width = TILE_TEX_SIZE;
    c.height = TILE_TEX_SIZE;
    const tctx = c.getContext('2d');
    const rand = mulberry32(seed);
    const img = tctx.createImageData(TILE_TEX_SIZE, TILE_TEX_SIZE);
    for (let y = 0; y < TILE_TEX_SIZE; y++) {
        for (let x = 0; x < TILE_TEX_SIZE; x++) {
            pxSet(img, x, y, base);
        }
    }
    // Two horizontal ripple bands that shift with phase.
    for (let x = 0; x < TILE_TEX_SIZE; x++) {
        const y1 = 3 + Math.round(Math.sin((x + phase) * 0.7) * 1.3);
        const y2 = 10 + Math.round(Math.cos((x * 0.8 + phase * 1.3)) * 1.3);
        pxSet(img, x, y1, ripple);
        pxSet(img, x, y2, ripple);
    }
    // Scattered bright specks that drift with phase.
    for (let i = 0; i < 3; i++) {
        const hx = (Math.floor(rand() * TILE_TEX_SIZE) + phase * 2) % TILE_TEX_SIZE;
        const hy = Math.floor(rand() * TILE_TEX_SIZE);
        pxSet(img, hx, hy, highlight);
    }
    for (let x = 0; x < TILE_TEX_SIZE; x++) pxSet(img, x, TILE_TEX_SIZE - 1, edge);
    for (let y = 0; y < TILE_TEX_SIZE; y++) pxSet(img, TILE_TEX_SIZE - 1, y, edge);
    tctx.putImageData(img, 0, 0);
    return c;
}

function buildTerrainTextures() {
    // Grass — warmer, slightly desaturated so characters pop.
    const grassBase      = [86, 134, 58];
    const grassBaseDark  = [72, 118, 46];
    const grassLightAcc  = [124, 174, 84];
    const grassDarkAcc   = [58, 100, 38];
    const grassEdge      = [44, 80, 28];
    terrainTiles.grassLight = makeGrassTexture(grassBase,     grassLightAcc, grassDarkAcc, grassEdge, 0x51a55);
    terrainTiles.grassDark  = makeGrassTexture(grassBaseDark, grassLightAcc, grassDarkAcc, grassEdge, 0x1eafb);

    // Water — 3 animated frames each, cycled by waterTime.
    const waterBase      = [58, 110, 172];
    const waterBaseDark  = [48, 92, 150];
    const waterRipple    = [108, 168, 216];
    const waterRippleDk  = [90, 148, 198];
    const waterHighlight = [180, 222, 246];
    const waterEdge      = [28, 60, 104];
    terrainTiles.waterLight = [];
    terrainTiles.waterDark = [];
    for (let i = 0; i < 3; i++) {
        terrainTiles.waterLight.push(
            makeWaterTexture(waterBase, waterRipple, waterHighlight, waterEdge, 0x9ade5 + i*31, i * 3)
        );
        terrainTiles.waterDark.push(
            makeWaterTexture(waterBaseDark, waterRippleDk, waterHighlight, waterEdge, 0x0ce4f + i*31, i * 3 + 1)
        );
    }
}

// ============================================================
// DRAW LAYERS
// ============================================================

let animTime = 0;
let waterTime = 0;

function drawTerrain() {
    const wf = Math.floor(waterTime / 420) % 3;
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const light = (x + y) % 2 === 0;
            let tex;
            if (MAP[y][x] === WATER) {
                tex = light ? terrainTiles.waterLight[wf] : terrainTiles.waterDark[wf];
            } else {
                tex = light ? terrainTiles.grassLight : terrainTiles.grassDark;
            }
            ctx.drawImage(tex, 0, 0, TILE_TEX_SIZE, TILE_TEX_SIZE,
                          x * tileSize, y * tileSize, tileSize, tileSize);
        }
    }
    // Soft drop shadow beneath each tree for depth.
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (MAP[y][x] === TREE) {
                ctx.save();
                ctx.globalAlpha = 0.3;
                ctx.fillStyle = '#000';
                ctx.beginPath();
                const cx = x * tileSize + tileSize / 2;
                const cy = y * tileSize + tileSize * 0.82;
                ctx.ellipse(cx, cy, tileSize * 0.34, tileSize * 0.12, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
    }
    // Draw trees on top of grass.
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (MAP[y][x] === TREE && assets['Tree']) {
                ctx.drawImage(
                    assets['Tree'], 0, 0, 16, 16,
                    x * tileSize, y * tileSize, tileSize, tileSize
                );
            }
        }
    }
}

function drawHighlightTile(t, fill, border, borderPx) {
    const x = t.x * tileSize;
    const y = t.y * tileSize;
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, tileSize, tileSize);
    ctx.fillStyle = border;
    ctx.fillRect(x, y, tileSize, borderPx);
    ctx.fillRect(x, y + tileSize - borderPx, tileSize, borderPx);
    ctx.fillRect(x, y, borderPx, tileSize);
    ctx.fillRect(x + tileSize - borderPx, y, borderPx, tileSize);
}

function drawHighlights() {
    const borderPx = Math.max(2, Math.floor(tileSize / 18));
    const pulse = 0.78 + 0.22 * Math.sin(animTime * 0.006);

    ctx.save();
    ctx.globalAlpha = pulse;
    for (const t of state.moveTiles) {
        drawHighlightTile(t, 'rgba(80, 140, 255, 0.28)', 'rgba(150, 205, 255, 0.85)', borderPx);
    }
    for (const t of state.attackTiles) {
        drawHighlightTile(t, 'rgba(233, 69, 96, 0.32)', 'rgba(255, 150, 170, 0.9)', borderPx);
    }
    for (const t of state.abilityTiles) {
        drawHighlightTile(t, 'rgba(80, 220, 120, 0.30)', 'rgba(170, 255, 190, 0.9)', borderPx);
    }
    ctx.restore();

    // Selected unit ring — independent pulse, gold, on top of highlights.
    const u = state.selectedUnit;
    if (u) {
        const selPulse = 0.7 + 0.3 * Math.sin(animTime * 0.01);
        ctx.save();
        ctx.globalAlpha = selPulse;
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = Math.max(2, Math.floor(tileSize / 14));
        const inset = Math.max(2, Math.floor(tileSize / 24));
        ctx.strokeRect(
            u.renderX * tileSize + inset,
            u.renderY * tileSize + inset,
            tileSize - inset * 2,
            tileSize - inset * 2
        );
        ctx.restore();
    }
}

function drawUnits(dt) {
    // Sort by y for a small depth effect.
    const sorted = state.units.filter(u => u.alive).slice().sort((a,b) => a.renderY - b.renderY);
    for (const u of sorted) drawUnit(u, dt);
}

function drawUnit(u, dt) {
    const sheet = assets[u.sprite];
    if (!sheet) return;

    // Pick frame: idle = sprite 1 (col 0); attack = animated frames per type.
    let frameCol = IDLE_FRAME.col;
    let frameRow = IDLE_FRAME.row;
    if (u.attacking) {
        const atk = ATTACK_FRAMES_BY_TYPE[u.type];
        if (atk) {
            u.attackFrame += dt * atk.fps * 0.001;
            frameCol = atk.start + Math.min(atk.count - 1, Math.floor(u.attackFrame));
            frameRow = atk.row;
        }
    }
    const sx = frameCol * FRAME_W;
    const sy = frameRow * FRAME_H;

    const px = u.renderX * tileSize;
    let py = u.renderY * tileSize;

    // Subtle idle bob — only for living, un-acted, non-attacking units.
    // Stagger per-unit with a hash of position so squadmates don't breathe in sync.
    if (u.alive && !u.attacking && !u.acted) {
        const phase = (u.x * 37 + u.y * 53) * 0.4;
        py += Math.sin(animTime * 0.004 + phase) * Math.max(1, tileSize * 0.03);
    }

    // Drop shadow — placed at the real tile position so it stays put during bob.
    ctx.save();
    ctx.globalAlpha = u.acted ? 0.22 : 0.38;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    const shX = u.renderX * tileSize + tileSize / 2;
    const shY = u.renderY * tileSize + tileSize * 0.86;
    ctx.ellipse(shX, shY, tileSize * 0.32, tileSize * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Team-tinted bloom beneath sprite.
    ctx.save();
    const teamColor = u.team === 'player' ? 'rgba(110, 235, 255, 0.22)' : 'rgba(233, 69, 96, 0.22)';
    ctx.fillStyle = teamColor;
    const pad = Math.floor(tileSize * 0.14);
    ctx.fillRect(px + pad, py + pad, tileSize - pad * 2, tileSize - pad * 2);
    ctx.restore();

    if (u.acted) ctx.globalAlpha = 0.55;

    ctx.drawImage(
        sheet, sx, sy, FRAME_W, FRAME_H,
        px, py, tileSize, tileSize
    );

    // White-tint hit flash.
    if (u.hitFlash > 0) {
        ctx.globalAlpha = 0.6 * u.hitFlash;
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px, py, tileSize, tileSize);
        ctx.globalCompositeOperation = 'source-over';
        u.hitFlash = Math.max(0, u.hitFlash - dt * 0.005);
    }

    ctx.globalAlpha = 1;

    drawHpBar(u, u.renderX * tileSize, u.renderY * tileSize);

    // Tiny team chip top-left so it's legible even on bloomed mobile-sized tiles.
    const chipSize = Math.max(3, Math.floor(tileSize / 11));
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(px + 1, py + 1, chipSize + 2, chipSize + 2);
    ctx.fillStyle = u.team === 'player' ? '#6eebff' : '#e94560';
    ctx.fillRect(px + 2, py + 2, chipSize, chipSize);
}

function drawHpBar(u, px, py) {
    // Segmented pips — one per ~4 HP, capped at 7 to fit mobile tiles.
    const segs = Math.min(7, Math.max(2, Math.ceil(u.maxHp / 4)));
    const barW = Math.floor(tileSize * 0.84);
    const barH = Math.max(3, Math.floor(tileSize / 11));
    const bx = px + Math.floor((tileSize - barW) / 2);
    const by = py + tileSize - barH - 3;
    const segW = Math.floor((barW - (segs - 1)) / segs);
    const actualW = segW * segs + (segs - 1);

    // Frame
    ctx.fillStyle = '#000';
    ctx.fillRect(bx - 1, by - 1, actualW + 2, barH + 2);

    // Color shifts with pct, team-agnostic (team shown by bloom + chip).
    const pct = u.hp / u.maxHp;
    let color = '#7fe77f';
    if (pct <= 0.33) color = '#e94560';
    else if (pct <= 0.66) color = '#ffd166';
    const empty = '#3a1a2a';

    // Fraction of pips to fill — round up so 1 HP still shows a pip.
    const filled = pct > 0 ? Math.max(1, Math.ceil(segs * pct)) : 0;
    for (let i = 0; i < segs; i++) {
        const sx = bx + i * (segW + 1);
        ctx.fillStyle = i < filled ? color : empty;
        ctx.fillRect(sx, by, segW, barH);
    }
}

// ============================================================
// MAIN RENDER
// ============================================================

function render(dt) {
    if (!ctx) return;

    animTime += dt;
    waterTime += dt;

    // Clear with the body bg — shake translate will never reveal other colors.
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Screen-shake offset (damped over duration).
    let shakeX = 0, shakeY = 0;
    const sh = state.shake;
    if (sh.duration > 0 && sh.age < sh.duration) {
        sh.age += dt;
        const t = 1 - sh.age / sh.duration;
        const m = sh.magnitude * t;
        shakeX = (Math.random() - 0.5) * 2 * m;
        shakeY = (Math.random() - 0.5) * 2 * m;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    drawTerrain();
    drawHighlights();
    drawUnits(dt);
    drawParticles(dt);
    drawFloatingTexts(dt);

    ctx.restore();
}
