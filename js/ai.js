// ============================================================
// ENEMY AI — best-reachable-attack scoring + fallback approach
// ============================================================




async function aiTakeTurn(unit) {
    const moveRange = getMovementRange(unit);

    // For each possible move destination, evaluate the best attack.
    let bestPlan = null;
    for (const pos of moveRange) {
        const targets = getAttackableEnemies(unit, pos.x, pos.y);
        for (const target of targets) {
            const savedX = unit.x, savedY = unit.y;
            unit.x = pos.x; unit.y = pos.y;
            const combat = calculateCombat(unit, target);
            unit.x = savedX; unit.y = savedY;

            // Score: huge bonus for kill, then total damage, tie-break on low HP target.
            const totalDmg = combat.atkDmg * (combat.atkDoubles ? 2 : 1);
            const kills = totalDmg >= target.hp;
            const counterDmg = combat.ctrDmg * (combat.ctrDoubles ? 2 : 1);
            const score = (kills ? 1000 : 0) + totalDmg * 10 - counterDmg - target.hp;

            if (!bestPlan || score > bestPlan.score) {
                bestPlan = { pos, target, score };
            }
        }
    }

    if (bestPlan) {
        if (bestPlan.pos.x !== unit.x || bestPlan.pos.y !== unit.y) {
            await animateMovement(unit, bestPlan.pos.x, bestPlan.pos.y);
        }
        await executeCombat(unit, bestPlan.target);
        return;
    }

    // No attack possible — move toward nearest player unit.
    const players = state.units.filter(u => u.team === 'player' && u.alive);
    if (players.length === 0) return;
    let best = null;
    for (const pos of moveRange) {
        let minD = Infinity;
        for (const p of players) {
            const d = Math.abs(pos.x - p.x) + Math.abs(pos.y - p.y);
            if (d < minD) minD = d;
        }
        if (!best || minD < best.d) best = { pos, d: minD };
    }
    if (best && (best.pos.x !== unit.x || best.pos.y !== unit.y)) {
        await animateMovement(unit, best.pos.x, best.pos.y);
    }
}
