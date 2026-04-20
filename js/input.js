// ============================================================
// INPUT — pointer handling, action-button handlers, menu wiring
// ============================================================










function setupInput() {
    canvas.addEventListener('pointerdown', onCanvasPointerDown);

    $('btn-start').addEventListener('click', showMapScreen);
    $('btn-restart').addEventListener('click', showMapScreen);
    $('btn-back-to-map').addEventListener('click', showMapScreen);
    $('btn-menu').addEventListener('click', openMenu);
    $('btn-menu-resume').addEventListener('click', closeMenu);
    $('btn-menu-restart').addEventListener('click', onMenuRestart);
    $('btn-menu-home').addEventListener('click', onMenuHome);
    $('btn-wait').addEventListener('click', onWaitClicked);
    $('btn-cancel').addEventListener('click', onCancelClicked);
    $('btn-end-turn').addEventListener('click', onEndTurnClicked);
    $('btn-fight').addEventListener('click', () => {
        if (state.subPhase === 'abilityPreview') onAbilityConfirmed();
        else onFightConfirmed();
    });
    $('btn-cp-cancel').addEventListener('click', () => {
        if (state.subPhase === 'abilityPreview') onAbilityCancelled();
        else onFightCancelled();
    });
    $('btn-how-to-play').addEventListener('click', openGuide);
    $('btn-guide-close').addEventListener('click', closeGuide);
    $('guide-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'guide-overlay') closeGuide();
    });
}

// ============================================================
// POINTER → TILE
// ============================================================

function onCanvasPointerDown(e) {
    e.preventDefault();
    if (state.inputLocked) return;
    if (state.phase !== 'player' && state.phase !== 'deploy') return;

    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const col = Math.floor(px / (rect.width / COLS));
    const row = Math.floor(py / (rect.height / ROWS));

    if (!inBounds(col, row)) return;
    if (state.phase === 'deploy') {
        handleDeployTap(col, row);
        return;
    }
    handleTileTap(col, row);
}

function handleDeployTap(x, y) {
    const unit = getUnitAt(x, y);
    // Only player units are swappable; anything else clears the selection.
    if (!unit || unit.team !== 'player') {
        state.selectedUnit = null;
        refreshDeployHighlights();
        updateUI();
        return;
    }
    if (state.selectedUnit === unit) {
        state.selectedUnit = null;
    } else if (state.selectedUnit) {
        const a = state.selectedUnit, b = unit;
        const ax = a.x, ay = a.y;
        a.x = b.x; a.y = b.y;
        b.x = ax; b.y = ay;
        a.renderX = a.x; a.renderY = a.y;
        b.renderX = b.x; b.renderY = b.y;
        state.selectedUnit = null;
    } else {
        state.selectedUnit = unit;
    }
    refreshDeployHighlights();
    updateUI();
}

function handleTileTap(x, y) {
    const unit = getUnitAt(x, y);

    if (state.subPhase === 'selectUnit') {
        if (unit && unit.team === 'player' && !unit.acted) {
            selectUnit(unit);
        } else if (unit) {
            // Tapping another unit: just show their info.
            state.selectedUnit = unit;
            updateUI();
        } else if (state.selectedUnit) {
            // Tap on empty tile clears the inspected unit.
            state.selectedUnit = null;
            updateUI();
        }
        return;
    }

    if (state.subPhase === 'selectMove') {
        const sel = state.selectedUnit;
        // Direct attack: tapping an in-range enemy skips the move step entirely.
        if (sel && unit && unit.team !== sel.team && unit.alive) {
            const d = attackDist(unit.x, unit.y, sel.x, sel.y);
            if (d >= sel.minRange && d <= sel.maxRange) {
                state.moveTiles = [];
                state.abilityTiles = [];
                state.attackTiles = getAttackableEnemies(sel, sel.x, sel.y).map(t => ({ x: t.x, y: t.y }));
                state.subPhase = 'selectTarget';
                openCombatPreview(unit);
                return;
            }
        }
        // Direct ability: tapping an in-range ally skips the move step.
        if (sel && unit && unit.team === sel.team && unit.alive && unit !== sel
            && state.abilityTiles.some(t => t.x === unit.x && t.y === unit.y)) {
            state.moveTiles = [];
            state.attackTiles = [];
            openAbilityPreview(unit);
            return;
        }
        const onMoveTile = state.moveTiles.some(t => t.x === x && t.y === y);
        if (onMoveTile) {
            beginMoveToAction(x, y);
        } else if (unit && unit.team === 'player' && !unit.acted && unit !== state.selectedUnit) {
            selectUnit(unit);
        } else {
            clearSelection();
            state.subPhase = 'selectUnit';
            updateUI();
        }
        return;
    }

    if (state.subPhase === 'selectAction') {
        const attacker = state.selectedUnit;
        if (unit && attacker && unit.team !== attacker.team && unit.alive) {
            const d = attackDist(unit.x, unit.y, attacker.x, attacker.y);
            if (d >= attacker.minRange && d <= attacker.maxRange) {
                state.subPhase = 'selectTarget';
                openCombatPreview(unit);
                return;
            }
        }
        if (unit && attacker && unit.team === attacker.team && unit.alive && unit !== attacker
            && state.abilityTiles.some(t => t.x === unit.x && t.y === unit.y)) {
            openAbilityPreview(unit);
            return;
        }
        return;
    }

    if (state.subPhase === 'selectTarget') {
        const attacker = state.selectedUnit;
        const target = unit;
        let isAttackable = false;
        if (target && attacker && target.team !== attacker.team && target.alive) {
            const d = attackDist(target.x, target.y, attacker.x, attacker.y);
            isAttackable = d >= attacker.minRange && d <= attacker.maxRange;
        }
        if (isAttackable) openCombatPreview(target);
        else enterSelectAction();
        return;
    }
}

// ============================================================
// UNIT SELECTION + ACTION FLOW
// ============================================================

function selectUnit(unit) {
    state.selectedUnit = unit;
    state.selectedOrigin = { x: unit.x, y: unit.y };
    state.moveTiles = getMovementRange(unit);
    // Highlight enemies / ally targets already in range so the player can act without moving.
    state.attackTiles = getAttackableEnemies(unit, unit.x, unit.y).map(t => ({ x: t.x, y: t.y }));
    state.abilityTiles = getAbilityTargets(unit, unit.x, unit.y).map(t => ({ x: t.x, y: t.y }));
    state.subPhase = 'selectMove';
    updateUI();
}

async function beginMoveToAction(x, y) {
    const unit = state.selectedUnit;
    state.subPhase = 'animating';
    state.moveTiles = [];
    state.attackTiles = [];
    state.abilityTiles = [];
    updateUI();
    await animateMovement(unit, x, y);
    enterSelectAction();
}

function enterSelectAction() {
    const unit = state.selectedUnit;
    state.moveTiles = [];
    state.attackTiles = unit
        ? getAttackableEnemies(unit, unit.x, unit.y).map(t => ({ x: t.x, y: t.y }))
        : [];
    state.abilityTiles = unit
        ? getAbilityTargets(unit, unit.x, unit.y).map(t => ({ x: t.x, y: t.y }))
        : [];
    state.subPhase = 'selectAction';
    updateUI();
}

function onWaitClicked() {
    const unit = state.selectedUnit;
    if (!unit) return;
    unit.acted = true;
    clearSelection();
    state.subPhase = 'selectUnit';
    checkPhaseEnd();
    updateUI();
}

function onCancelClicked() {
    if (state.subPhase === 'selectMove') {
        clearSelection();
        state.subPhase = 'selectUnit';
        updateUI();
    } else if (state.subPhase === 'selectAction') {
        // Return the unit to origin.
        const unit = state.selectedUnit;
        if (!unit) {
            clearSelection();
            state.subPhase = 'selectUnit';
            updateUI();
            return;
        }
        if (state.selectedOrigin) {
            unit.x = state.selectedOrigin.x;
            unit.y = state.selectedOrigin.y;
            unit.renderX = unit.x;
            unit.renderY = unit.y;
        }
        selectUnit(unit);
    } else if (state.subPhase === 'selectTarget') {
        enterSelectAction();
    }
}

function onEndTurnClicked() {
    if (state.phase !== 'player') return;
    clearSelection();
    endPlayerPhase();
}

// ============================================================
// COMBAT PREVIEW HANDLERS
// ============================================================

function openCombatPreview(target) {
    const attacker = state.selectedUnit;
    const result = calculateCombat(attacker, target);
    state.pendingAttackTarget = target;
    state.pendingCombatResult = result;
    state.subPhase = 'combatPreview';
    showCombatPreview(attacker, target, result);
}

async function onFightConfirmed() {
    hideCombatPreview();
    const attacker = state.selectedUnit;
    const target = state.pendingAttackTarget;
    if (!attacker || !target) return;
    state.subPhase = 'animating';
    state.attackTiles = [];
    state.abilityTiles = [];
    updateUI();
    await executeCombat(attacker, target);
    if (attacker.alive) attacker.acted = true;
    if (checkGameOver()) return;
    clearSelection();
    state.subPhase = 'selectUnit';
    checkPhaseEnd();
    updateUI();
}

function onFightCancelled() {
    hideCombatPreview();
    state.pendingAttackTarget = null;
    state.pendingCombatResult = null;
    state.subPhase = 'selectTarget';
    updateUI();
}

// ============================================================
// ABILITY PREVIEW / EXECUTION
// ============================================================

function openAbilityPreview(target) {
    const caster = state.selectedUnit;
    if (!caster || !target) return;
    state.pendingAbilityTarget = target;
    state.subPhase = 'abilityPreview';
    showAbilityPreview(caster, target);
    updateUI();
}

async function onAbilityConfirmed() {
    hideCombatPreview();
    const caster = state.selectedUnit;
    const target = state.pendingAbilityTarget;
    state.pendingAbilityTarget = null;
    if (!caster || !target) return;
    await applyActiveAbility(caster, target);
}

function onAbilityCancelled() {
    hideCombatPreview();
    state.pendingAbilityTarget = null;
    enterSelectAction();
}

// Apply the caster's active ability to `target`. One-shot — caster is marked acted
// afterwards and the turn advances.
async function applyActiveAbility(caster, target) {
    const ab = getActiveAbility(caster);
    if (!ab) return;
    state.subPhase = 'animating';
    state.attackTiles = [];
    state.abilityTiles = [];
    state.moveTiles = [];
    updateUI();

    // Brief lunge toward target for visual feedback.
    caster.attacking = true;
    caster.attackFrame = 0;
    const dx = Math.sign(target.x - caster.x);
    const dy = Math.sign(target.y - caster.y);
    await animate(260, t => {
        const pulse = Math.sin(t * Math.PI);
        caster.renderX = caster.x + dx * 0.3 * pulse;
        caster.renderY = caster.y + dy * 0.3 * pulse;
    });
    caster.renderX = caster.x;
    caster.renderY = caster.y;
    caster.attacking = false;
    caster.attackFrame = 0;

    if (ab.id === 'blood_donation') {
        const heal = 14;
        const before = target.hp;
        target.hp = Math.min(target.maxHp, target.hp + heal);
        const gained = target.hp - before;
        if (gained > 0) spawnFloatingText('+' + gained, target.x, target.y - 0.4, '#7effb0');
        target.hitFlash = 0.6;
    } else if (ab.id === 'tax_relief') {
        const heal = 12;
        const before = target.hp;
        target.hp = Math.min(target.maxHp, target.hp + heal);
        const gained = target.hp - before;
        if (gained > 0) spawnFloatingText('+' + gained, target.x, target.y - 0.4, '#7effb0');
        target.hitFlash = 0.6;
    } else if (ab.id === 'do_work') {
        target.atkBuff = 6;
        spawnFloatingText('+6 ATK', target.x, target.y - 0.4, '#ffd36e');
        target.hitFlash = 0.6;
    }

    await delay(420);

    caster.acted = true;
    if (checkGameOver()) return;
    clearSelection();
    state.subPhase = 'selectUnit';
    checkPhaseEnd();
    updateUI();
}

// ============================================================
// DEPLOY SCREEN HANDLERS (wired into setupDeployScreen)
// ============================================================

async function beginBattleFromDeploy() {
    // deployOrder reflects the current slot order; rebuild from actual unit
    // positions so any mid-deploy swaps are honoured.
    const deployed = [];
    for (const slot of PLAYER_DEPLOY) {
        const u = getUnitAt(slot.x, slot.y);
        if (u && u.team === 'player') deployed.push(u.charKey);
    }
    if (deployed.length === TEAM_SIZE) state.deployOrder = deployed;

    state.phase = 'player';
    state.subPhase = 'selectUnit';
    state.selectedUnit = null;
    state.moveTiles = [];
    state.attackTiles = [];
    state.abilityTiles = [];
    await startPlayerPhase();
}

function backFromDeploy() {
    state.phase = 'title';
    state.units = [];
    state.selectedUnit = null;
    state.moveTiles = [];
    state.attackTiles = [];
    state.abilityTiles = [];
    $('select-screen').classList.remove('hidden');
    updateUI();
}

// ============================================================
// MAP + MENU HANDLERS
// ============================================================

function onMapSelected(key) {
    state.selectedMap = key;
    showSelectionScreen();
}

function onMenuRestart() {
    closeMenu();
    startGame();
}

function onMenuHome() {
    closeMenu();
    state.phase = 'title';
    $('top-bar').classList.add('hidden');
    // Dismiss any combat forecast that was up when the user hit HOME; otherwise
    // it stays floating over the map-select screen.
    $('combat-preview').classList.add('hidden');
    showMapScreen();
}
