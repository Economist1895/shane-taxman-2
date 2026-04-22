// ============================================================
// UI — DOM screens, overlays, panels, forecasts, banners
// ============================================================






// ============================================================
// SELECTION SCREEN
// ============================================================

function setupSelectionScreen() {
    const grid = $('select-grid');
    grid.innerHTML = '';
    for (const key of PLAYER_CHAR_KEYS) {
        const c = CHARACTERS[key];
        const sprite = SPRITE_BY_CLASS_TEAM[c.class].player;
        const card = document.createElement('button');
        card.className = 'select-card';
        card.dataset.key = key;
        card.innerHTML =
            '<div class="select-sprite" style="background-image:url(\'' + SPRITES[sprite] + '\')"></div>' +
            '<div class="select-name">' + (c.shortName || c.name).toUpperCase() + '</div>' +
            '<div class="select-role">' + (c.role || '') + '</div>' +
            '<div class="select-check">✓</div>';
        card.addEventListener('click', () => onSelectCardClick(key));
        grid.appendChild(card);
    }
    $('btn-start-battle').addEventListener('click', () => {
        if (state.selectedTeam.length === TEAM_SIZE) showDeployScreen();
    });
}

function showSelectionScreen() {
    state.selectedTeam = [];
    state.previewedChar = PLAYER_CHAR_KEYS[0];
    $('title-screen').classList.add('hidden');
    $('map-select-screen').classList.add('hidden');
    $('gameover-screen').classList.add('hidden');
    $('select-screen').classList.remove('hidden');
    previewChar(state.previewedChar);
    refreshSelectUI();
}

function onSelectCardClick(key) {
    state.previewedChar = key;
    const idx = state.selectedTeam.indexOf(key);
    if (idx >= 0) {
        state.selectedTeam.splice(idx, 1);
    } else if (state.selectedTeam.length < TEAM_SIZE) {
        state.selectedTeam.push(key);
    }
    previewChar(key);
    refreshSelectUI();
}

// Bar length = val / STAT_CAPS[stat] as a continuous fraction. Honest scaling
// across the full roster — the best-in-stat reads near-full, not always pegged.
function statBar(label, val, stat) {
    const pct = (statFrac(stat, val) * 100).toFixed(1) + '%';
    return '<div class="stat-bar">' +
        '<span class="sb-label">' + label + '</span>' +
        '<span class="sb-track">' +
            '<span class="sb-fill sb-fill--' + stat + '" style="width:' + pct + '"></span>' +
        '</span>' +
        '<span class="sb-val">' + val + '</span>' +
        '</div>';
}

function previewChar(key) {
    const c = CHARACTERS[key];
    const cls = CLASS_DEFAULTS[c.class];
    const minR = c.minRange ?? cls.minRange;
    const maxR = c.maxRange ?? cls.maxRange;
    const rngStr = minR === maxR ? String(maxR) : minR + '-' + maxR;
    const move = getCharStat(key, 'mov');

    let ability;
    if (c.ability) {
        const kind = ACTIVE_ABILITY_IDS.has(c.ability.id) ? 'ACTIVE' : 'PASSIVE';
        ability =
            '<div class="select-ability">' +
                '<div class="sa-name">' +
                    '<span class="sa-kind ' + kind.toLowerCase() + '">' + kind + '</span>' +
                    c.ability.name +
                '</div>' +
                '<div class="sa-desc">' + (ABILITY_DESCRIPTIONS[c.ability.id] || '') + '</div>' +
            '</div>';
    } else {
        ability = '<div class="select-ability sa-empty">No special ability.</div>';
    }

    $('select-detail').innerHTML =
        '<div class="sd-header">' +
            '<span class="sd-name">' + c.name.toUpperCase() +
                (c.role ? ' <span class="sd-role">' + c.role.toUpperCase() + '</span>' : '') +
            '</span>' +
            '<span class="sd-class">' + c.class.toUpperCase() + ' · RNG ' + rngStr + ' · MOV ' + move + '</span>' +
        '</div>' +
        (c.title ? '<div class="sd-title">' + c.title + '</div>' : '') +
        '<div class="sd-bars">' +
            statBar('HP',  c.hp,  'hp')  +
            statBar('ATK', c.atk, 'atk') +
            statBar('DEF', c.def, 'def') +
            statBar('SPD', c.spd, 'spd') +
            statBar('RES', c.res, 'res') +
        '</div>' +
        ability;
}

function refreshSelectUI() {
    const cards = document.querySelectorAll('.select-card');
    cards.forEach(card => {
        const key = card.dataset.key;
        card.classList.toggle('selected', state.selectedTeam.includes(key));
        card.classList.toggle('previewing', key === state.previewedChar);
    });
    $('select-count').textContent = state.selectedTeam.length + '/' + TEAM_SIZE;
    const ready = state.selectedTeam.length === TEAM_SIZE;
    const btn = $('btn-start-battle');
    btn.disabled = !ready;
    btn.classList.toggle('ready', ready);
}

// ============================================================
// DEPLOY SCREEN
// ============================================================

function setupDeployScreen(onStart, onBack) {
    $('btn-deploy-start').addEventListener('click', onStart);
    $('btn-deploy-back').addEventListener('click', onBack);
}

// Places units on the battlefield for preview and lets the player tap two of
// their own units to swap positions before committing to battle.
function showDeployScreen() {
    const mapKey = MAPS[state.selectedMap] ? state.selectedMap : DEFAULT_MAP_KEY;
    setMap(MAPS[mapKey].terrain);
    state.deployOrder = state.selectedTeam.slice();
    state.units = createInitialUnits(state.selectedTeam, mapKey);
    state.turnNumber = 1;
    state.winner = null;
    state.phase = 'deploy';
    state.subPhase = 'deploySwap';
    state.selectedUnit = null;
    state.moveTiles = [];
    state.attackTiles = [];
    state.abilityTiles = [];
    $('title-screen').classList.add('hidden');
    $('map-select-screen').classList.add('hidden');
    $('select-screen').classList.add('hidden');
    $('gameover-screen').classList.add('hidden');
    refreshDeployHighlights();
    updateUI();
}

// Green tiles on every swappable ally (or on the 3 other allies when one is
// selected) — makes it obvious which tiles accept a tap during deploy.
function refreshDeployHighlights() {
    const targets = state.units.filter(u =>
        u.team === 'player' && u.alive && u !== state.selectedUnit
    );
    state.abilityTiles = targets.map(u => ({ x: u.x, y: u.y }));
}

// ============================================================
// MAP SCREEN
// ============================================================

function setupMapScreen(onMapSelected) {
    const grid = $('map-grid');
    grid.innerHTML = '';
    for (const key of MAP_ORDER) {
        const m = MAPS[key];
        const card = document.createElement('button');
        card.className = 'map-card';
        card.dataset.key = key;
        card.innerHTML =
            '<div class="mc-name">' + m.name.toUpperCase() + '</div>' +
            '<div class="mc-bias">' + m.bias + '</div>';
        card.addEventListener('click', () => onMapSelected(key));
        grid.appendChild(card);
    }
}

function showMapScreen() {
    $('title-screen').classList.add('hidden');
    $('select-screen').classList.add('hidden');
    $('gameover-screen').classList.add('hidden');
    $('map-select-screen').classList.remove('hidden');
}

// ============================================================
// MENU / GUIDE OVERLAYS
// ============================================================

function openMenu() {
    if (state.phase === 'gameover') return;
    $('menu-overlay').classList.remove('hidden');
}

function closeMenu() {
    $('menu-overlay').classList.add('hidden');
}

function openGuide()  { $('guide-overlay').classList.remove('hidden'); }
function closeGuide() { $('guide-overlay').classList.add('hidden'); }

// ============================================================
// UPDATE UI — panels, buttons, turn info
// ============================================================

let _lastChromeHidden = null;
function updateUI() {
    const hideChrome = state.phase === 'title' || state.phase === 'gameover';
    $('top-bar').classList.toggle('hidden', hideChrome);
    $('info-panel').classList.toggle('hidden', hideChrome);
    $('action-panel').classList.toggle('hidden', hideChrome);
    // Chrome visibility changed → canvas-wrap size just changed → re-fit the
    // canvas so the map uses the available space.
    if (_lastChromeHidden !== hideChrome) {
        _lastChromeHidden = hideChrome;
        requestAnimationFrame(resizeCanvas);
    }
    if (hideChrome) return;

    $('turn-info').textContent = state.phase === 'deploy' ? 'Deploy' : 'Turn ' + state.turnNumber;
    $('phase-label').textContent =
        state.phase === 'player' ? 'Player Phase' :
        state.phase === 'enemy' ? 'Enemy Phase' :
        state.phase === 'deploy' ? 'Position Squad' : '';
    // Menu would offer Restart (skips deploy) / Home, both confusing mid-deploy.
    toggle($('btn-menu'), state.phase !== 'deploy');

    const infoEl = $('unit-info');
    const u = state.selectedUnit;
    if (u) {
        infoEl.classList.remove('empty');
        let abilityBlock = '';
        if (u.ability) {
            const kind = ACTIVE_ABILITY_IDS.has(u.ability.id) ? 'ACTIVE' : 'PASSIVE';
            const desc = ABILITY_DESCRIPTIONS[u.ability.id] || '';
            abilityBlock =
                '<div class="ability-row">' +
                    '<span class="ability-kind ' + kind.toLowerCase() + '">' + kind + '</span>' +
                    '<em>' + u.ability.name + '</em>' +
                '</div>' +
                '<div class="ability-desc">' + desc + '</div>';
        }
        infoEl.innerHTML =
            '<div class="name-row">' +
                '<span>' + (u.shortName || u.name).toUpperCase() +
                    (u.title ? ' <span class="unit-title">' + u.title + '</span>' : '') +
                '</span>' +
                '<span class="team ' + u.team + '">' + (u.team === 'player' ? 'ALLY' : 'FOE') + '</span>' +
            '</div>' +
            '<div class="hp-row">HP ' + u.hp + '/' + u.maxHp + '</div>' +
            '<div class="stat-row">' +
                '<span>ATK <strong>' + formatAtk(u) + '</strong></span>' +
                '<span>DEF <strong>' + u.def + '</strong></span>' +
                '<span>SPD <strong>' + u.spd + '</strong></span>' +
                '<span>RES <strong>' + u.res + '</strong></span>' +
                '<span>RNG <strong>' + (u.minRange === u.maxRange ? u.maxRange : u.minRange + '-' + u.maxRange) + '</strong></span>' +
            '</div>' +
            abilityBlock;
    } else {
        infoEl.classList.add('empty');
        const hint = state.phase === 'deploy'
            ? 'Tap an ally to pick them up, then tap another to swap'
            : 'Select a unit';
        infoEl.innerHTML = '<span class="hint">' + hint + '</span>';
    }

    const showWait = state.subPhase === 'selectAction';
    const showCancel =
        state.subPhase === 'selectMove' ||
        state.subPhase === 'selectAction' ||
        state.subPhase === 'selectTarget';
    const showEndTurn = state.phase === 'player' && state.subPhase === 'selectUnit';
    const showDeployBtns = state.phase === 'deploy';

    toggle($('btn-wait'), showWait);
    toggle($('btn-cancel'), showCancel);
    toggle($('btn-end-turn'), showEndTurn);
    toggle($('btn-deploy-back'), showDeployBtns);
    toggle($('btn-deploy-start'), showDeployBtns);
}

function toggle(el, show) {
    el.classList.toggle('hidden', !show);
}

// Display ATK as "base (effective)" when bonuses apply, so Bethany's climb stacks,
// Shane's Do Work! buff, and Jade/CEO aura are all visible at a glance.
function formatAtk(u) {
    const eff = getEffectiveAtk(u);
    if (eff === u.atk) return String(u.atk);
    return u.atk + ' (' + eff + ')';
}

// ============================================================
// BANNERS / GAME OVER
// ============================================================

function showBanner(text) {
    const banner = $('phase-banner');
    banner.textContent = text;
    banner.classList.remove('hidden');
    return new Promise(resolve => {
        requestAnimationFrame(() => banner.classList.add('show'));
        setTimeout(() => {
            banner.classList.remove('show');
            setTimeout(() => {
                banner.classList.add('hidden');
                resolve();
            }, 300);
        }, 900);
    });
}

function showGameOver(text, defeat) {
    const el = $('gameover-screen');
    el.classList.remove('hidden');
    el.classList.toggle('defeat', defeat);
    $('gameover-text').textContent = text;
    $('gameover-flavor').textContent = defeat
        ? 'Disappointing — PG 1 for you.'
        : 'Amazing — PG 5 for you.';
    clearSelection();
    state.pendingAbilityTarget = null;
    $('combat-preview').classList.add('hidden');
    updateUI();
}

// ============================================================
// COMBAT / ABILITY FORECAST PANELS
// ============================================================

function showCombatPreview(attacker, defender, result) {
    $('combat-preview').querySelector('.cp-header').textContent = 'COMBAT FORECAST';
    $('btn-fight').textContent = 'FIGHT';
    const atkHits = result.atkDoubles ? 'x2 HITS' : '1 HIT';
    const ctrLabel = result.canCounter ? (result.ctrDoubles ? 'x2 HITS' : '1 HIT') : 'NO COUNTER';

    const aEl = $('cp-attacker');
    aEl.querySelector('.cp-name').textContent = (attacker.shortName || attacker.name).toUpperCase();
    aEl.querySelector('.cp-hp').textContent = 'HP ' + attacker.hp + '/' + attacker.maxHp;
    aEl.querySelector('.cp-dmg').textContent = 'DMG ' + result.atkDmg;
    aEl.querySelector('.cp-hits').textContent = atkHits;

    const dEl = $('cp-defender');
    dEl.querySelector('.cp-name').textContent = (defender.shortName || defender.name).toUpperCase();
    dEl.querySelector('.cp-hp').textContent = 'HP ' + defender.hp + '/' + defender.maxHp;
    dEl.querySelector('.cp-dmg').textContent = 'DMG ' + (result.canCounter ? result.ctrDmg : '-');
    dEl.querySelector('.cp-hits').textContent = ctrLabel;

    $('combat-preview').classList.remove('hidden');
}

function describeAbilityEffect(caster, target) {
    const ab = getActiveAbility(caster);
    if (!ab) return { label: '', detail: '' };
    if (ab.id === 'blood_donation' || ab.id === 'tax_relief') {
        const heal = ab.id === 'blood_donation' ? 14 : 12;
        const after = Math.min(target.maxHp, target.hp + heal);
        const gained = after - target.hp;
        if (gained === 0) return { label: 'FULL HP', detail: 'NO EFFECT' };
        return { label: '+' + gained + ' HP', detail: 'HP → ' + after + '/' + target.maxHp };
    }
    if (ab.id === 'do_work') {
        if (target.atkBuff > 0) return { label: 'ALREADY BUFFED', detail: 'NO EFFECT' };
        return { label: '+6 ATK', detail: 'NEXT ATTACK' };
    }
    return { label: '', detail: '' };
}

function showAbilityPreview(caster, target) {
    const ab = getActiveAbility(caster);
    const effect = describeAbilityEffect(caster, target);

    $('combat-preview').querySelector('.cp-header').textContent =
        ab ? ab.name.toUpperCase() : 'ABILITY';

    const aEl = $('cp-attacker');
    aEl.querySelector('.cp-name').textContent = (caster.shortName || caster.name).toUpperCase();
    aEl.querySelector('.cp-hp').textContent = 'HP ' + caster.hp + '/' + caster.maxHp;
    aEl.querySelector('.cp-dmg').textContent = 'CASTER';
    aEl.querySelector('.cp-hits').textContent = '';

    const dEl = $('cp-defender');
    dEl.querySelector('.cp-name').textContent = (target.shortName || target.name).toUpperCase();
    dEl.querySelector('.cp-hp').textContent = 'HP ' + target.hp + '/' + target.maxHp;
    dEl.querySelector('.cp-dmg').textContent = effect.label;
    dEl.querySelector('.cp-hits').textContent = effect.detail;

    $('btn-fight').textContent = 'CONFIRM';
    $('combat-preview').classList.remove('hidden');
}

function hideCombatPreview() {
    $('combat-preview').classList.add('hidden');
    $('btn-fight').textContent = 'FIGHT';
}
