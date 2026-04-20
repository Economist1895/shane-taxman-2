// ============================================================
// PARTICLES, SCREEN SHAKE, FLOATING TEXT — visual feedback buffers + draw
// ============================================================


function spawnFloatingText(text, gx, gy, color) {
    state.floatingTexts.push({
        text, gx, gy, age: 0, maxAge: 900, color: color || '#ffffff'
    });
}

function spawnSparks(gx, gy, color, count) {
    const n = count != null ? count : 7;
    for (let i = 0; i < n; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.0018 + Math.random() * 0.0028; // tiles per ms
        state.particles.push({
            gx, gy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 0.0012, // slight upward bias
            age: 0,
            maxAge: 260 + Math.random() * 180,
            color: color || '#ffd166',
        });
    }
}

// Re-triggers replace the current shake (don't stack).
function triggerShake(mag, durMs) {
    state.shake.magnitude = mag;
    state.shake.duration = durMs;
    state.shake.age = 0;
}

function drawParticles(dt) {
    const size = Math.max(2, Math.floor(tileSize / 12));
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.age += dt;
        if (p.age >= p.maxAge) { state.particles.splice(i, 1); continue; }
        p.gx += p.vx * dt;
        p.gy += p.vy * dt;
        p.vy += 0.000009 * dt; // gravity
        const t = p.age / p.maxAge;
        ctx.save();
        ctx.globalAlpha = 1 - t;
        ctx.fillStyle = p.color;
        ctx.fillRect(
            Math.floor(p.gx * tileSize) - Math.floor(size / 2),
            Math.floor(p.gy * tileSize) - Math.floor(size / 2),
            size, size
        );
        ctx.restore();
    }
}

function drawFloatingTexts(dt) {
    for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
        const f = state.floatingTexts[i];
        f.age += dt;
        const t = f.age / f.maxAge;
        if (t >= 1) { state.floatingTexts.splice(i, 1); continue; }

        const rise = t * tileSize * 0.7;
        const px = f.gx * tileSize + tileSize / 2;
        const py = f.gy * tileSize + tileSize / 2 - rise;

        ctx.save();
        ctx.globalAlpha = 1 - t;
        // Pop in for the first 20% of life, then settle.
        const scale = t < 0.2 ? 1 + (0.2 - t) * 1.5 : 1;
        const fontPx = Math.floor(tileSize / 3.4 * scale);
        ctx.font = fontPx + 'px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = Math.max(2, Math.floor(fontPx / 5));
        ctx.strokeStyle = '#000000';
        ctx.strokeText(f.text, px, py);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, px, py);
        ctx.restore();
    }
}
