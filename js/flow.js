// ============================================================
// GAME FLOW — phase transitions, turn bookkeeping, game-over check
// ============================================================








async function startGame() {
    const mapKey = MAPS[state.selectedMap] ? state.selectedMap : DEFAULT_MAP_KEY;
    setMap(MAPS[mapKey].terrain);
    state.units = createInitialUnits(state.selectedTeam, mapKey);
    state.turnNumber = 1;
    state.winner = null;
    state.phase = 'player';
    state.floatingTexts = [];
    state.particles = [];
    state.shake = { magnitude: 0, duration: 0, age: 0 };
    state.pendingAbilityTarget = null;
    state.inputLocked = false;
    clearSelection();
    $('title-screen').classList.add('hidden');
    $('map-select-screen').classList.add('hidden');
    $('select-screen').classList.add('hidden');
    $('gameover-screen').classList.add('hidden');
    $('combat-preview').classList.add('hidden');
    await startPlayerPhase();
}

async function startPlayerPhase() {
    state.phase = 'player';
    state.subPhase = 'selectUnit';
    clearSelection();
    // Reset acted state + apply turn-start ability effects.
    for (const u of state.units) {
        if (u.team === 'player') {
            u.acted = false;
            applyTurnStartAbilities(u);
        }
    }
    updateUI();
    await showBanner('Player Phase');
    state.subPhase = 'selectUnit';
    updateUI();
}

function endPlayerPhase() {
    for (const u of state.units) {
        if (u.team === 'enemy') {
            u.acted = false;
            applyTurnStartAbilities(u);
        }
    }
    runEnemyPhase();
}

async function runEnemyPhase() {
    state.phase = 'enemy';
    state.subPhase = 'animating';
    clearSelection();
    updateUI();

    await showBanner('Enemy Phase');
    // A menu RESTART or HOME mid-phase swaps out state.units; stop iterating
    // stale refs so they can't bleed animations / damage into the next battle.
    if (state.phase !== 'enemy') return;

    const enemies = state.units.filter(u => u.team === 'enemy' && u.alive);
    for (const unit of enemies) {
        if (state.phase !== 'enemy') return;
        if (!unit.alive) continue;
        await delay(200);
        if (state.phase !== 'enemy') return;
        await aiTakeTurn(unit);
        if (state.phase !== 'enemy') return;
        if (checkGameOver()) return;
    }

    // Advance the turn counter here so the display reads "Turn N" for the
    // whole of round N (player + enemy), not only for the enemy phase.
    state.turnNumber++;
    startPlayerPhase();
}

function checkGameOver() {
    const playerAlive = state.units.some(u => u.team === 'player' && u.alive);
    const enemyAlive = state.units.some(u => u.team === 'enemy' && u.alive);
    // Check enemy wipe first so a simultaneous KO (player kills last enemy,
    // counter kills last player) still reads as VICTORY.
    if (!enemyAlive) {
        state.phase = 'gameover';
        state.winner = 'player';
        showGameOver('VICTORY', false);
        return true;
    }
    if (!playerAlive) {
        state.phase = 'gameover';
        state.winner = 'enemy';
        showGameOver('DEFEAT', true);
        return true;
    }
    return false;
}

function checkPhaseEnd() {
    const anyLeft = state.units.some(u => u.team === 'player' && u.alive && !u.acted);
    if (!anyLeft) endPlayerPhase();
}
