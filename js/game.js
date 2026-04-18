'use strict';

// ============================================================
// CONFIGURATION
// ============================================================

const COLS = 8;
const ROWS = 8;

// Sprite sheet frame dimensions. Sheets are 768x256.
// Starting assumption: 32x32 frames (24 cols x 8 rows).
const FRAME_W = 32;
const FRAME_H = 32;

// Units stand still on frame 0 (sprite 1) when idle; attack frames play only
// during a strike. Frame indices below are 0-indexed columns on the sheet.
const IDLE_FRAME = { row: 0, col: 0 };
const ATTACK_FRAMES_BY_TYPE = {
    soldier: { row: 0, start: 4,  count: 4, fps: 14 }, // sprites 5-8
    archer:  { row: 0, start: 8,  count: 4, fps: 14 }, // sprites 9-12
    mage:    { row: 0, start: 12, count: 3, fps: 12 }, // sprites 13-15
};

// Terrain types
const GRASS = 0;
const TREE = 1;
const WATER = 2;

// Map layout (8x8). 0 = grass, 1 = tree, 2 = water (impassable).
// Three maps. Each has its own terrain grid + enemy composition.
// Player deploy is always the bottom row (row 7, cols 2-5).
// MAP (below) holds the active map's terrain; it's swapped in at startGame().
const MAPS = {
    audit: {
        name: 'L1 Lounge',
        bias: 'Balanced enemies',
        // A small pond + two scattered trees. Flanks open for the scout.
        terrain: [
            [0,0,0,0,0,0,0,0], // row 0 — enemy deploy
            [0,0,0,0,0,0,0,0], // row 1
            [0,0,0,2,2,0,0,0], // row 2 — pond top
            [0,0,0,0,2,0,0,0], // row 3 — pond tail
            [0,1,0,0,0,0,0,0], // row 4 — scattered tree (left)
            [0,0,0,0,0,0,1,0], // row 5 — scattered tree (right)
            [0,0,0,0,0,0,0,0], // row 6
            [0,0,0,0,0,0,0,0], // row 7 — player deploy
        ],
        enemies: [
            { key: 'minion_arc', x: 1, y: 0 },
            { key: 'director',   x: 3, y: 0 },
            { key: 'ceo',        x: 4, y: 0 },
            { key: 'minion_sol', x: 5, y: 0 },
            { key: 'minion_mag', x: 6, y: 0 },
        ],
    },
    open_season: {
        name: 'L24 Board Room',
        bias: 'Ranged-heavy',
        // Wide open rooftop — just a central tree cluster for cover.
        terrain: [
            [0,0,0,0,0,0,0,0], // row 0 — enemy deploy
            [0,0,0,0,0,0,0,0], // row 1
            [0,0,0,0,0,0,0,0], // row 2
            [0,0,0,1,1,0,0,0], // row 3 — tree cluster (center)
            [0,0,0,1,1,0,0,0], // row 4 — tree cluster (center)
            [0,0,0,0,0,0,0,0], // row 5
            [0,0,0,0,0,0,0,0], // row 6
            [0,0,0,0,0,0,0,0], // row 7 — player deploy
        ],
        enemies: [
            { key: 'minion_arc', x: 1, y: 0 },
            { key: 'director',   x: 3, y: 0 },
            { key: 'ceo',        x: 4, y: 0 },
            { key: 'minion_mag', x: 5, y: 0 },
            { key: 'minion_arc', x: 6, y: 0 },
        ],
    },
    loophole: {
        name: 'L5 Auditorium',
        bias: 'Tank-heavy — choke point',
        // Horizontal river splits rows 3-4 with bridges at cols 2 and 5.
        // Trees flank the bridges so archers can't shoot straight through.
        terrain: [
            [0,0,0,0,0,0,0,0], // row 0 — enemy deploy
            [0,0,0,0,0,0,0,0], // row 1
            [0,1,0,0,1,0,0,1], // row 2 — trees flank bridges
            [2,2,0,2,2,0,2,2], // row 3 — river (bridges at col 2, 5)
            [2,2,0,2,2,0,2,2], // row 4 — river (bridges at col 2, 5)
            [0,0,0,0,0,0,0,0], // row 5
            [0,0,0,0,0,0,0,0], // row 6
            [0,0,0,0,0,0,0,0], // row 7 — player deploy
        ],
        enemies: [
            { key: 'minion_arc', x: 1, y: 0 },
            { key: 'ceo',        x: 4, y: 0 },
            { key: 'director',   x: 5, y: 0 },
            { key: 'minion_sol', x: 2, y: 2 }, // camping left bridge
            { key: 'minion_sol', x: 5, y: 2 }, // camping right bridge
        ],
    },
};

const DEFAULT_MAP_KEY = 'audit';
const MAP_ORDER = ['audit', 'open_season', 'loophole'];

// Active terrain grid. Mutable — reassigned at the start of each battle.
let MAP = MAPS[DEFAULT_MAP_KEY].terrain;

// Class defaults — range, damage type, movement. Stats come from CHARACTERS.
const CLASS_DEFAULTS = {
    soldier: { minRange: 1, maxRange: 1, damageType: 'physical', movement: 2 },
    archer:  { minRange: 2, maxRange: 2, damageType: 'physical', movement: 2 },
    mage:    { minRange: 1, maxRange: 2, damageType: 'magic',    movement: 2 },
};

// Character roster. Each character has a class + individual stats + (optional) ability.
// Ability effects are not yet implemented — this table is the source of truth for stats/names.
const CHARACTERS = {
    // --- Player: soldiers ---
    ryan:      { name: 'Ryan Li',          shortName: 'Ryan',      title: 'Investigator',             class: 'soldier', role: 'Scout',     hp: 20, atk: 7,  def: 5, spd: 9, res: 3, ability: { id: 'tax_mobile',    name: 'Tax Mobile of Justice' } },
    sylvester: { name: 'Sylvester Sim',    shortName: 'Sylvester', title: 'Legal Associate',          class: 'soldier', role: 'DPS',       hp: 22, atk: 12, def: 6, spd: 4, res: 2, ability: { id: 'hammer',        name: 'Hammer of Justice' } },
    richmond:  { name: 'Richmond Yeo',     shortName: 'Richmond',  title: 'Auditor',                  class: 'soldier', role: 'Lifesteal', hp: 24, atk: 10, def: 6, spd: 5, res: 2, ability: { id: 'tax_recovery',  name: 'Tax Recovery' } },
    shaun:     { name: 'Shaun Tan',        shortName: 'Shaun',     title: 'Tax Specialist',           class: 'soldier', role: 'Tank',      hp: 28, atk: 7,  def: 10, spd: 2, res: 4, ability: { id: 'sleepless_panda', name: 'Sleepless Panda' } },
    jiawei:    { name: 'Jiawei Tian',      shortName: 'Jiawei',    title: 'Software Developer',       class: 'soldier', role: 'Medic',     hp: 26, atk: 6,  def: 7, spd: 4, res: 5, ability: { id: 'blood_donation', name: 'Blood Donation' } },
    // --- Player: archers ---
    annie:     { name: 'Annie Khoo',       shortName: 'Annie',     title: 'Outreach Officer',         class: 'archer',  role: 'Tank',      hp: 24, atk: 7,  def: 8, spd: 4, res: 5, ability: { id: 'arrow_guard',   name: 'Protection from Arrows' } },
    shane:     { name: 'Shane Soh',        shortName: 'Shane',     title: 'Manager',                  class: 'archer',  role: 'Buffer',    hp: 18, atk: 8,  def: 3, spd: 9, res: 4, ability: { id: 'do_work',       name: 'Do Work!' } },
    jasper:    { name: 'Jasper Samuel',    shortName: 'Jasper',    title: 'Policy Officer',           class: 'archer',  role: 'DPS',       hp: 16, atk: 11, def: 3, spd: 10, res: 3, ability: { id: 'undying',       name: 'Undying Project' } },
    // --- Player: mages ---
    karishma:  { name: 'Karishma Jayakumar', shortName: 'Karishma', title: 'Customer Service Officer', class: 'mage',    role: 'Healer',    hp: 20, atk: 4,  def: 3, spd: 5, res: 10, ability: { id: 'tax_relief',    name: 'Tax Relief' } },
    jade:      { name: 'Jade Chen',        shortName: 'Jade',      title: 'Policy Officer',           class: 'mage',    role: 'Buffer',    hp: 20, atk: 7,  def: 4, spd: 5, res: 7, ability: { id: 'future_ceo',    name: 'Future CEO' } },
    bethany:   { name: 'Bethany Su',       shortName: 'Bethany',   title: 'AI Lead',                  class: 'mage',    role: 'DPS',       hp: 18, atk: 9,  def: 2, spd: 5, res: 8, ability: { id: 'mountain_climbing', name: 'Mountain Climbing' } },

    // --- Enemies ---
    // The CEO: boss archer with range 2-3 and a strong attack aura.
    ceo:       { name: 'The CEO',   class: 'archer',  hp: 30, atk: 11, def: 6, spd: 7, res: 5,
                 minRange: 2, maxRange: 3,
                 ability: { id: 'aura', name: 'Aura' } },
    // Director: the CEO's bodyguard — a beefier soldier minion, no ability.
    director:  { name: 'Director',  class: 'soldier', hp: 28, atk: 7,  def: 9, spd: 3, res: 3 },
    // Generic minions — pure stat blocks, no abilities.
    minion_sol: { name: 'Minion',   class: 'soldier', hp: 18, atk: 7,  def: 5, spd: 4, res: 2 },
    minion_arc: { name: 'Minion',   class: 'archer',  hp: 14, atk: 7,  def: 3, spd: 6, res: 2 },
    minion_mag: { name: 'Minion',   class: 'mage',    hp: 14, atk: 8,  def: 2, spd: 4, res: 5 },
};

// Minimum damage dealt on a successful attack (prevents useless 0-dmg strikes).
const MIN_DAMAGE = 1;

// Sprite sheet keys
const SPRITES = {
    'Archer-Green':  'sprites/Archer-Green.png',
    'Archer-Purple': 'sprites/Archer-Purple.png',
    'Mage-Cyan':     'sprites/Mage-Cyan.png',
    'Mage-Red':      'sprites/Mage-Red.png',
    'Soldier-Blue':  'sprites/Soldier-Blue.png',
    'Soldier-Red':   'sprites/Soldier-Red.png',
    'Tree':          'sprites/Tree.png',
};

// All player-roster characters available in the unit selection screen.
const PLAYER_CHAR_KEYS = [
    'ryan', 'sylvester', 'richmond', 'shaun', 'jiawei',
    'annie', 'shane', 'jasper',
    'karishma', 'jade', 'bethany',
];

const TEAM_SIZE = 4;

// Four deploy slots along the bottom row — middle columns so the squad starts cohesive.
const PLAYER_DEPLOY = [
    { x: 2, y: 7 }, { x: 3, y: 7 }, { x: 4, y: 7 }, { x: 5, y: 7 },
];

// Reference maxima for the selection screen bar chart.
// Stat bars are rendered as 5 tiers so different-magnitude stats (HP ~20 vs RES
// ~6) can be compared at a glance. Tier = where this value sits in the roster's
// range for that stat; top unit = 5 segments, weakest = 1.
const STAT_MIN = {}, STAT_MAX = {};
for (const stat of ['hp', 'atk', 'def', 'spd', 'res']) {
    const vals = PLAYER_CHAR_KEYS.map(k => CHARACTERS[k][stat]);
    STAT_MIN[stat] = Math.min(...vals);
    STAT_MAX[stat] = Math.max(...vals);
}
const STAT_TIER_COUNT = 5;
function statTier(stat, val) {
    const min = STAT_MIN[stat], max = STAT_MAX[stat];
    if (max === min) return STAT_TIER_COUNT;
    const frac = (val - min) / (max - min);
    return Math.max(1, Math.min(STAT_TIER_COUNT, Math.ceil(frac * STAT_TIER_COUNT)));
}

// Short flavour text for abilities — shown on the unit selection detail panel.
const ABILITY_DESCRIPTIONS = {
    tax_mobile:        '+1 movement range.',
    hammer:            'Attacks ignore 50% of target DEF.',
    tax_recovery:      'Heal 75% of damage dealt on attack.',
    sleepless_panda:   'Regenerate 3 HP at the start of each turn.',
    blood_donation:    'Heal an adjacent ally for 10 HP.',
    arrow_guard:       'Halves incoming damage from archer attackers.',
    do_work:           'Grant an ally +8 ATK for their next attack.',
    undying:           'Survives lethal damage once at 1 HP.',
    tax_relief:        'Heal an ally within 2 tiles for 10 HP.',
    future_ceo:        '+2 ATK aura to adjacent allies.',
    mountain_climbing: '+1 ATK at the start of each turn (max +3).',
    aura:              '+3 ATK aura to adjacent allies.',
};

// Abilities that replace an attack on the action menu (tap an ally to trigger).
// Everything else is passive.
const ACTIVE_ABILITY_IDS = new Set(['blood_donation', 'tax_relief', 'do_work']);

function createInitialUnits(playerTeam, mapKey) {
    const team = (playerTeam && playerTeam.length === TEAM_SIZE)
        ? playerTeam
        : ['ryan', 'jade', 'annie', 'bethany'];

    const units = team.map((key, i) => {
        const pos = PLAYER_DEPLOY[i];
        return makeUnit(key, 'player', pos.x, pos.y);
    });

    const map = MAPS[mapKey] || MAPS[DEFAULT_MAP_KEY];
    for (const e of map.enemies) {
        units.push(makeUnit(e.key, 'enemy', e.x, e.y));
    }
    return units;
}

// Sprite keys per class + team. All units of the same class share a sheet.
const SPRITE_BY_CLASS_TEAM = {
    soldier: { player: 'Soldier-Blue',  enemy: 'Soldier-Red' },
    archer:  { player: 'Archer-Green',  enemy: 'Archer-Purple' },
    mage:    { player: 'Mage-Cyan',     enemy: 'Mage-Red' },
};

let _unitIdCounter = 0;
function makeUnit(charKey, team, x, y) {
    const c = CHARACTERS[charKey];
    if (!c) throw new Error('Unknown character: ' + charKey);
    const cls = CLASS_DEFAULTS[c.class];
    const sprite = SPRITE_BY_CLASS_TEAM[c.class][team];
    const abilityId = c.ability ? c.ability.id : null;

    // Ryan's Tax Mobile of Justice: +1 movement is baked in at creation time.
    const baseMove = c.movement ?? cls.movement;
    const movement = abilityId === 'tax_mobile' ? baseMove + 1 : baseMove;

    return {
        id: charKey + '_' + (++_unitIdCounter),
        charKey,
        name: c.name,
        shortName: c.shortName || c.name,
        title: c.title || '',
        type: c.class,     // kept as "type" for renderer / animation lookups
        team,
        sprite,
        x, y,
        renderX: x, renderY: y,
        hp: c.hp,
        maxHp: c.hp,
        atk: c.atk, def: c.def, spd: c.spd, res: c.res,
        minRange: c.minRange ?? cls.minRange,
        maxRange: c.maxRange ?? cls.maxRange,
        damageType: cls.damageType,
        movement,
        ability: c.ability || null,
        // --- Ability state ---
        climbStacks: 0,       // Bethany: Mountain Climbing stacks (0..3)
        atkBuff: 0,           // Shane: Do Work! single-use +ATK for next attack
        undyingUsed: false,   // Jasper: Undying Project spent?
        // --- Animation ---
        acted: false,
        alive: true,
        attacking: false,
        attackFrame: 0,
        hitFlash: 0,
    };
}

// ============================================================
// ABILITY HELPERS
// ============================================================

function hasAbility(u, id) {
    return !!(u && u.ability && u.ability.id === id);
}

// Same-team units within Manhattan `maxDist` of (fx,fy). "Adjacent" = maxDist 1
// (the 4 orthogonal neighbours) — matches the Manhattan attack grid.
function alliesWithin(team, fx, fy, maxDist, excludeId) {
    const out = [];
    for (const u of state.units) {
        if (!u.alive || u.team !== team) continue;
        if (excludeId && u.id === excludeId) continue;
        const d = Math.abs(u.x - fx) + Math.abs(u.y - fy);
        if (d > 0 && d <= maxDist) out.push(u);
    }
    return out;
}

// ATK aura if an ally with Future CEO (Jade, +2) or Aura (The CEO, +3) sits
// orthogonally adjacent. Does not stack — take the best single source.
function getAuraAtkBonus(u) {
    const allies = alliesWithin(u.team, u.x, u.y, 1, u.id);
    let best = 0;
    for (const a of allies) {
        if (hasAbility(a, 'aura')) best = Math.max(best, 3);
        else if (hasAbility(a, 'future_ceo')) best = Math.max(best, 2);
    }
    return best;
}

// Definition of active abilities (things that replace an attack on the action menu).
// Returns null for units with no active ability.
function getActiveAbility(u) {
    if (!u.ability) return null;
    const id = u.ability.id;
    if (id === 'blood_donation') return { id, name: u.ability.name, range: 1 };
    if (id === 'tax_relief')     return { id, name: u.ability.name, range: 2 };
    if (id === 'do_work')        return { id, name: u.ability.name, range: 2 };
    return null;
}

// Allies that a unit can currently target with its active ability from position (fx,fy).
function getAbilityTargets(u, fx, fy) {
    const ab = getActiveAbility(u);
    if (!ab) return [];
    return alliesWithin(u.team, fx, fy, ab.range, u.id);
}

// Final ATK for combat math: base + Mountain Climbing stacks + Do Work! single-use + aura.
function getEffectiveAtk(u) {
    return u.atk + (u.climbStacks || 0) + (u.atkBuff || 0) + getAuraAtkBonus(u);
}

// ============================================================
// GAME STATE
// ============================================================

const state = {
    phase: 'title',           // 'title', 'player', 'enemy', 'gameover'
    subPhase: 'selectUnit',   // 'selectUnit', 'selectMove', 'selectAction', 'selectTarget', 'combatPreview', 'abilityPreview', 'animating'
    units: [],
    selectedUnit: null,
    selectedOrigin: null,     // {x,y} for cancel-undo
    moveTiles: [],            // [{x,y}]
    attackTiles: [],          // [{x,y}] enemies in attack range (red)
    abilityTiles: [],         // [{x,y}] allies in active-ability range (green)
    pendingAttackTarget: null,
    pendingCombatResult: null,
    pendingAbilityTarget: null,
    floatingTexts: [],        // {text, x, y, age, maxAge, color}
    turnNumber: 1,
    winner: null,
    inputLocked: false,
    selectedTeam: [],         // char keys chosen on the selection screen
    previewedChar: null,      // char key currently previewed on the selection screen
    selectedMap: DEFAULT_MAP_KEY,
};

// ============================================================
// DOM & ASSETS
// ============================================================

const assets = {};
let canvas, ctx;
let tileSize = 48;

const dom = {};

function $(id) { return document.getElementById(id); }

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
// CANVAS SETUP
// ============================================================

function setupCanvas() {
    canvas = $('game-canvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('orientationchange', resizeCanvas);
}

function resizeCanvas() {
    const wrap = $('canvas-wrap');
    const availW = wrap.clientWidth;
    const availH = wrap.clientHeight;

    // Try to fit within container while maintaining aspect ratio
    const sizeByW = Math.floor(availW / COLS);
    const sizeByH = Math.floor(availH / ROWS);
    tileSize = Math.max(20, Math.min(sizeByW, sizeByH));

    canvas.width = tileSize * COLS;
    canvas.height = tileSize * ROWS;
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';

    ctx.imageSmoothingEnabled = false;
}

// ============================================================
// UTILITIES
// ============================================================

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

// ============================================================
// PATHFINDING - movement range (BFS)
// ============================================================

function getMovementRange(unit) {
    const result = [];
    const seen = new Set();
    const queue = [{ x: unit.x, y: unit.y, steps: 0 }];
    seen.add(tileKey(unit.x, unit.y));

    // include current tile as valid "stay" option
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
            if (blocking && blocking.team !== unit.team) {
                // can't pass through enemies
                continue;
            }

            seen.add(k);
            queue.push({ x: nx, y: ny, steps: steps + 1 });

            // Can only STOP on a tile that isn't occupied
            if (!blocking) {
                result.push({ x: nx, y: ny });
            }
        }
    }
    return result;
}

// Tiles within attack range from a position (not filtered by enemy presence)
function getAttackTilesFrom(unit, fx, fy) {
    const tiles = [];
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const d = attackDist(x, y, fx, fy);
            if (d >= unit.minRange && d <= unit.maxRange) {
                tiles.push({ x, y });
            }
        }
    }
    return tiles;
}

function getAttackableEnemies(unit, fx, fy) {
    const targets = [];
    for (const u of state.units) {
        if (!u.alive || u.team === unit.team) continue;
        const d = attackDist(u.x, u.y, fx, fy);
        if (d >= unit.minRange && d <= unit.maxRange) {
            targets.push(u);
        }
    }
    return targets;
}

// ============================================================
// COMBAT
// ============================================================

// Raw damage from a single side of a fight, accounting for:
//   - effective ATK (climb stacks, Do Work! buff, Future CEO / Aura bonuses)
//   - Sylvester's Hammer of Justice (ignores 50% of the relevant DEF stat)
//   - Annie's Protection from Arrows (halves incoming damage from archer attackers)
function computeDamage(attacker, defender) {
    let defStat = attacker.damageType === 'magic' ? defender.res : defender.def;
    if (hasAbility(attacker, 'hammer')) {
        defStat = Math.floor(defStat / 2);
    }
    let dmg = Math.max(MIN_DAMAGE, getEffectiveAtk(attacker) - defStat);
    if (hasAbility(defender, 'arrow_guard') && attacker.type === 'archer') {
        dmg = Math.max(MIN_DAMAGE, Math.floor(dmg / 2));
    }
    return dmg;
}

function calculateCombat(attacker, defender) {
    const atkDmg = computeDamage(attacker, defender);
    const atkDoubles = (attacker.spd - defender.spd) >= 4;

    // Can defender counter from their tile?
    const d = attackDist(attacker.x, attacker.y, defender.x, defender.y);
    const canCounter = d >= defender.minRange && d <= defender.maxRange;

    let ctrDmg = 0, ctrDoubles = false;
    if (canCounter) {
        ctrDmg = computeDamage(defender, attacker);
        ctrDoubles = (defender.spd - attacker.spd) >= 4;
    }

    return { atkDmg, atkDoubles, canCounter, ctrDmg, ctrDoubles };
}

async function executeCombat(attacker, defender) {
    const result = calculateCombat(attacker, defender);
    state.inputLocked = true;

    // Order: A hits, D counters (if can), A doubles (if spd), D doubles counter (if spd & can)
    await doHit(attacker, defender, result.atkDmg);
    if (defender.alive && result.canCounter) {
        await doHit(defender, attacker, result.ctrDmg);
    }
    if (attacker.alive && defender.alive && result.atkDoubles) {
        await doHit(attacker, defender, result.atkDmg);
    }
    if (attacker.alive && defender.alive && result.canCounter && result.ctrDoubles) {
        await doHit(defender, attacker, result.ctrDmg);
    }

    // Shane's Do Work! buff is single-use: consumed by any unit that actually
    // swung this round. The attacker always swung; the defender only if they
    // could counter — otherwise the buff is preserved for their next turn.
    attacker.atkBuff = 0;
    if (result.canCounter) defender.atkBuff = 0;

    state.inputLocked = false;
}

async function doHit(attacker, defender, damage) {
    // Lunge animation (attacker slides toward defender briefly) +
    // play the attacker's attack-frame animation for the same duration.
    const dx = Math.sign(defender.x - attacker.x);
    const dy = Math.sign(defender.y - attacker.y);
    const lungeDist = 0.3;

    attacker.attacking = true;
    attacker.attackFrame = 0;
    await animate(280, t => {
        const pulse = Math.sin(t * Math.PI);
        attacker.renderX = attacker.x + dx * lungeDist * pulse;
        attacker.renderY = attacker.y + dy * lungeDist * pulse;
    });
    attacker.renderX = attacker.x;
    attacker.renderY = attacker.y;
    attacker.attacking = false;
    attacker.attackFrame = 0;

    // Apply damage
    const hpBefore = defender.hp;
    defender.hp = Math.max(0, defender.hp - damage);
    defender.hitFlash = 1;

    // Jasper — Undying Project: the first time he would die, he survives at 1 HP.
    if (defender.hp <= 0 && hasAbility(defender, 'undying') && !defender.undyingUsed) {
        defender.hp = 1;
        defender.undyingUsed = true;
        spawnFloatingText('UNDYING', defender.x, defender.y - 0.4, '#ffd36e');
    }

    const dealt = hpBefore - defender.hp;
    spawnFloatingText('-' + dealt, defender.x, defender.y, '#ff6666');

    // Richmond — Tax Recovery: heal 75% of damage dealt, minimum 1 when it procs.
    if (hasAbility(attacker, 'tax_recovery') && dealt > 0 && attacker.alive) {
        const heal = Math.max(1, Math.floor(dealt * 0.75));
        const hpAfter = Math.min(attacker.maxHp, attacker.hp + heal);
        const gained = hpAfter - attacker.hp;
        attacker.hp = hpAfter;
        if (gained > 0) spawnFloatingText('+' + gained, attacker.x, attacker.y - 0.4, '#7effb0');
    }

    await delay(400);

    if (defender.hp <= 0) {
        defender.alive = false;
        await animate(350, t => { defender.hitFlash = 1 - t; });
    }
}

// ============================================================
// FLOATING TEXT
// ============================================================

function spawnFloatingText(text, gx, gy, color) {
    state.floatingTexts.push({
        text, gx, gy, age: 0, maxAge: 900, color: color || '#ffffff'
    });
}

// ============================================================
// ANIMATION SYSTEM
// ============================================================

// Promise-based animation that updates each frame
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

async function animateMovement(unit, destX, destY) {
    // Straight-line interpolation (Manhattan but animate through steps for smoothness)
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

// BFS path from unit position to target (treats allies as passable, enemies blocked)
function findPath(unit, tx, ty) {
    const startKey = tileKey(unit.x, unit.y);
    const targetKey = tileKey(tx, ty);
    if (startKey === targetKey) return [{x: unit.x, y: unit.y}];

    const parent = new Map();
    const queue = [{x: unit.x, y: unit.y}];
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
            parent.set(k, {x: cur.x, y: cur.y});
            queue.push({x: nx, y: ny});
        }
    }

    // Reconstruct
    if (!parent.has(targetKey)) return [{x: unit.x, y: unit.y}, {x: tx, y: ty}];
    const path = [];
    let cur = {x: tx, y: ty};
    while (cur) {
        path.unshift(cur);
        cur = parent.get(tileKey(cur.x, cur.y));
    }
    return path;
}

// ============================================================
// ENEMY AI
// ============================================================

async function runEnemyPhase() {
    state.phase = 'enemy';
    state.subPhase = 'animating';
    clearSelection();
    updateUI();

    await showBanner('Enemy Phase');

    const enemies = state.units.filter(u => u.team === 'enemy' && u.alive);
    for (const unit of enemies) {
        if (!unit.alive) continue;
        await delay(200);
        await aiTakeTurn(unit);
        if (checkGameOver()) return;
    }

    // Back to player phase. Advance the turn counter here so the display
    // reads "Turn N" for the whole of round N (player + enemy), not only
    // for the enemy phase.
    state.turnNumber++;
    startPlayerPhase();
}

async function aiTakeTurn(unit) {
    const moveRange = getMovementRange(unit);

    // For each possible move destination, evaluate the best attack
    let bestPlan = null;
    for (const pos of moveRange) {
        // Position temporarily
        const targets = getAttackableEnemiesFromPos(unit, pos.x, pos.y);
        for (const target of targets) {
            const savedX = unit.x, savedY = unit.y;
            unit.x = pos.x; unit.y = pos.y;
            const combat = calculateCombat(unit, target);
            unit.x = savedX; unit.y = savedY;

            // Score: huge bonus for kill, then total damage, tie-break on low HP target
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
    } else {
        // No attack possible. Move toward nearest player unit.
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
}

function getAttackableEnemiesFromPos(unit, fx, fy) {
    const targets = [];
    for (const u of state.units) {
        if (!u.alive || u.team === unit.team) continue;
        const d = attackDist(u.x, u.y, fx, fy);
        if (d >= unit.minRange && d <= unit.maxRange) targets.push(u);
    }
    return targets;
}

// ============================================================
// GAME FLOW
// ============================================================

async function startGame() {
    const mapKey = MAPS[state.selectedMap] ? state.selectedMap : DEFAULT_MAP_KEY;
    MAP = MAPS[mapKey].terrain;
    state.units = createInitialUnits(state.selectedTeam, mapKey);
    state.turnNumber = 1;
    state.winner = null;
    state.phase = 'player';
    $('title-screen').classList.add('hidden');
    $('map-select-screen').classList.add('hidden');
    $('select-screen').classList.add('hidden');
    $('gameover-screen').classList.add('hidden');
    await startPlayerPhase();
}

// ============================================================
// UNIT SELECTION SCREEN
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
        if (state.selectedTeam.length === TEAM_SIZE) startGame();
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

function setupMapScreen() {
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

function onMapSelected(key) {
    state.selectedMap = key;
    showSelectionScreen();
}

function openMenu() {
    if (state.phase === 'gameover') return;
    $('menu-overlay').classList.remove('hidden');
}

function closeMenu() {
    $('menu-overlay').classList.add('hidden');
}

function onMenuRestart() {
    closeMenu();
    startGame();
}

function onMenuHome() {
    closeMenu();
    state.phase = 'title';
    $('top-bar').classList.add('hidden');
    showMapScreen();
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

function statBar(label, val, stat) {
    const tier = statTier(stat, val);
    let segs = '';
    for (let i = 1; i <= STAT_TIER_COUNT; i++) {
        segs += '<span class="sb-seg' + (i <= tier ? ' filled' : '') + '"></span>';
    }
    return '<div class="stat-bar">' +
        '<span class="sb-label">' + label + '</span>' +
        '<span class="sb-track">' + segs + '</span>' +
        '<span class="sb-val">' + val + '</span>' +
        '</div>';
}

function previewChar(key) {
    const c = CHARACTERS[key];
    const cls = CLASS_DEFAULTS[c.class];
    const minR = c.minRange ?? cls.minRange;
    const maxR = c.maxRange ?? cls.maxRange;
    const rngStr = minR === maxR ? String(maxR) : minR + '-' + maxR;
    const move = c.movement ?? cls.movement;

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

async function startPlayerPhase() {
    state.phase = 'player';
    state.subPhase = 'selectUnit';
    clearSelection();
    // Reset acted state + apply turn-start ability effects
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

// Triggered once per unit at the start of its team's phase.
// Currently covers Shaun (Sleepless Panda regen) and Bethany (Mountain Climbing stack).
function applyTurnStartAbilities(u) {
    if (!u.alive) return;
    if (hasAbility(u, 'sleepless_panda')) {
        const before = u.hp;
        u.hp = Math.min(u.maxHp, u.hp + 3);
        if (u.hp > before) spawnFloatingText('+' + (u.hp - before), u.x, u.y - 0.4, '#7effb0');
    }
    if (hasAbility(u, 'mountain_climbing')) {
        if (u.climbStacks < 3) {
            u.climbStacks += 1;
            spawnFloatingText('+1 ATK', u.x, u.y - 0.4, '#ffd36e');
        }
    }
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

function showGameOver(text, defeat) {
    const el = $('gameover-screen');
    el.classList.remove('hidden');
    el.classList.toggle('defeat', defeat);
    $('gameover-text').textContent = text;
}

function showBanner(text) {
    const banner = $('phase-banner');
    banner.textContent = text;
    banner.classList.remove('hidden');
    return new Promise(resolve => {
        // Slide in
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

function clearSelection() {
    state.selectedUnit = null;
    state.selectedOrigin = null;
    state.moveTiles = [];
    state.attackTiles = [];
    state.abilityTiles = [];
    state.pendingAttackTarget = null;
    state.pendingCombatResult = null;
}

// ============================================================
// INPUT HANDLING
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

function openGuide()  { $('guide-overlay').classList.remove('hidden'); }
function closeGuide() { $('guide-overlay').classList.add('hidden'); }

function onCanvasPointerDown(e) {
    e.preventDefault();
    if (state.inputLocked) return;
    if (state.phase !== 'player') return;

    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const col = Math.floor(px / (rect.width / COLS));
    const row = Math.floor(py / (rect.height / ROWS));

    if (!inBounds(col, row)) return;
    handleTileTap(col, row);
}

function handleTileTap(x, y) {
    const unit = getUnitAt(x, y);

    if (state.subPhase === 'selectUnit') {
        if (unit && unit.team === 'player' && !unit.acted) {
            selectUnit(unit);
        } else if (unit) {
            // Tapping another unit: just show their info
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
            // Cancel selection
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
        if (isAttackable) {
            openCombatPreview(target);
        } else {
            enterSelectAction();
        }
        return;
    }

}

function selectUnit(unit) {
    state.selectedUnit = unit;
    state.selectedOrigin = { x: unit.x, y: unit.y };
    state.moveTiles = getMovementRange(unit);
    // Highlight enemies already in range so the player can attack without moving.
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
        const heal = 10;
        const before = target.hp;
        target.hp = Math.min(target.maxHp, target.hp + heal);
        const gained = target.hp - before;
        if (gained > 0) spawnFloatingText('+' + gained, target.x, target.y - 0.4, '#7effb0');
        target.hitFlash = 0.6;
    } else if (ab.id === 'tax_relief') {
        const heal = 10;
        const before = target.hp;
        target.hp = Math.min(target.maxHp, target.hp + heal);
        const gained = target.hp - before;
        if (gained > 0) spawnFloatingText('+' + gained, target.x, target.y - 0.4, '#7effb0');
        target.hitFlash = 0.6;
    } else if (ab.id === 'do_work') {
        target.atkBuff = 8;
        spawnFloatingText('+8 ATK', target.x, target.y - 0.4, '#ffd36e');
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
        // Move the unit back to origin
        const unit = state.selectedUnit;
        if (unit && state.selectedOrigin) {
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

function openCombatPreview(target) {
    const attacker = state.selectedUnit;
    const result = calculateCombat(attacker, target);
    state.pendingAttackTarget = target;
    state.pendingCombatResult = result;
    state.subPhase = 'combatPreview';
    showCombatPreview(attacker, target, result);
}

async function onFightConfirmed() {
    $('combat-preview').classList.add('hidden');
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
    $('combat-preview').classList.add('hidden');
    state.pendingAttackTarget = null;
    state.pendingCombatResult = null;
    state.subPhase = 'selectTarget';
    updateUI();
}

// Preview an active ability — the healing/buff equivalent of the combat forecast.
function openAbilityPreview(target) {
    const caster = state.selectedUnit;
    if (!caster || !target) return;
    state.pendingAbilityTarget = target;
    state.subPhase = 'abilityPreview';
    showAbilityPreview(caster, target);
    updateUI();
}

function describeAbilityEffect(caster, target) {
    const ab = getActiveAbility(caster);
    if (!ab) return { label: '', detail: '' };
    if (ab.id === 'blood_donation' || ab.id === 'tax_relief') {
        const heal = 10;
        const after = Math.min(target.maxHp, target.hp + heal);
        const gained = after - target.hp;
        if (gained === 0) return { label: 'FULL HP', detail: 'NO EFFECT' };
        return { label: '+' + gained + ' HP', detail: 'HP → ' + after + '/' + target.maxHp };
    }
    if (ab.id === 'do_work') {
        if (target.atkBuff > 0) return { label: 'ALREADY BUFFED', detail: 'NO EFFECT' };
        return { label: '+8 ATK', detail: 'NEXT ATTACK' };
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

async function onAbilityConfirmed() {
    $('combat-preview').classList.add('hidden');
    $('btn-fight').textContent = 'FIGHT';
    const caster = state.selectedUnit;
    const target = state.pendingAbilityTarget;
    state.pendingAbilityTarget = null;
    if (!caster || !target) return;
    await applyActiveAbility(caster, target);
}

function onAbilityCancelled() {
    $('combat-preview').classList.add('hidden');
    $('btn-fight').textContent = 'FIGHT';
    state.pendingAbilityTarget = null;
    enterSelectAction();
}

function checkPhaseEnd() {
    const anyLeft = state.units.some(u => u.team === 'player' && u.alive && !u.acted);
    if (!anyLeft) {
        endPlayerPhase();
    }
}

// ============================================================
// UI MANAGEMENT
// ============================================================

let _lastChromeHidden = null;
function updateUI() {
    // Top bar + info/action panels — hide on title / gameover screens
    const hideChrome = state.phase === 'title' || state.phase === 'gameover';
    $('top-bar').classList.toggle('hidden', hideChrome);
    $('info-panel').classList.toggle('hidden', hideChrome);
    $('action-panel').classList.toggle('hidden', hideChrome);
    // Chrome visibility changed → canvas-wrap size just changed → re-fit the
    // canvas so the map uses the available space. Only fires on transitions,
    // not every UI update (resizeCanvas clears the canvas).
    if (_lastChromeHidden !== hideChrome) {
        _lastChromeHidden = hideChrome;
        requestAnimationFrame(resizeCanvas);
    }
    if (hideChrome) {
        // Skip the rest — nothing to update while those panels are hidden.
        return;
    }
    $('turn-info').textContent = 'Turn ' + state.turnNumber;
    $('phase-label').textContent =
        state.phase === 'player' ? 'Player Phase' :
        state.phase === 'enemy' ? 'Enemy Phase' : '';

    // Unit info
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
        infoEl.innerHTML = '<span class="hint">Select a unit</span>';
    }

    // Action buttons visibility
    const showWait = state.subPhase === 'selectAction';
    const showCancel =
        state.subPhase === 'selectMove' ||
        state.subPhase === 'selectAction' ||
        state.subPhase === 'selectTarget';
    const showEndTurn = state.phase === 'player' && state.subPhase === 'selectUnit';

    toggle($('btn-wait'), showWait);
    toggle($('btn-cancel'), showCancel);
    toggle($('btn-end-turn'), showEndTurn);
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

// ============================================================
// RENDERING
// ============================================================

function render(dt) {
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawTerrain();
    drawHighlights();
    drawUnits(dt);
    drawFloatingTexts(dt);
    drawGridOverlay();
}

// Pre-generated 16x16 pixel-art tile textures. Two variants per terrain so the
// board still has the light/dark checker rhythm without looking flat.
const TILE_TEX_SIZE = 16;
const terrainTiles = { grassLight: null, grassDark: null, waterLight: null, waterDark: null };

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

function makeTileTexture(palette, seed) {
    const c = document.createElement('canvas');
    c.width = TILE_TEX_SIZE;
    c.height = TILE_TEX_SIZE;
    const tctx = c.getContext('2d');
    const rand = mulberry32(seed);
    const img = tctx.createImageData(TILE_TEX_SIZE, TILE_TEX_SIZE);
    for (let i = 0; i < TILE_TEX_SIZE * TILE_TEX_SIZE; i++) {
        const color = palette[Math.floor(rand() * palette.length)];
        img.data[i*4  ] = color[0];
        img.data[i*4+1] = color[1];
        img.data[i*4+2] = color[2];
        img.data[i*4+3] = 255;
    }
    tctx.putImageData(img, 0, 0);
    return c;
}

function buildTerrainTextures() {
    // Weighted palettes: repeat the base color so it dominates and accents are sparse.
    const grassLightPal = [
        [90,138,60],[90,138,60],[90,138,60],[90,138,60],
        [104,150,68],[78,124,52],[118,160,74],[70,112,44],
    ];
    const grassDarkPal = [
        [74,122,44],[74,122,44],[74,122,44],[74,122,44],
        [88,136,56],[62,106,36],[100,148,64],[54,96,30],
    ];
    const waterLightPal = [
        [58,106,168],[58,106,168],[58,106,168],[58,106,168],
        [74,124,188],[46,92,150],[90,142,204],[38,82,138],
    ];
    const waterDarkPal = [
        [48,90,148],[48,90,148],[48,90,148],[48,90,148],
        [62,108,168],[38,78,130],[78,128,186],[32,68,118],
    ];
    terrainTiles.grassLight = makeTileTexture(grassLightPal, 0x51a55);
    terrainTiles.grassDark  = makeTileTexture(grassDarkPal,  0x1eafb);
    terrainTiles.waterLight = makeTileTexture(waterLightPal, 0x9ade5);
    terrainTiles.waterDark  = makeTileTexture(waterDarkPal,  0x0ce4f);
}

function drawTerrain() {
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const light = (x + y) % 2 === 0;
            const tex = MAP[y][x] === WATER
                ? (light ? terrainTiles.waterLight : terrainTiles.waterDark)
                : (light ? terrainTiles.grassLight : terrainTiles.grassDark);
            ctx.drawImage(tex, 0, 0, TILE_TEX_SIZE, TILE_TEX_SIZE,
                          x * tileSize, y * tileSize, tileSize, tileSize);
        }
    }
    // Draw trees on top of grass
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (MAP[y][x] === TREE && assets['Tree']) {
                // Tree sprite is 16x16. Scale to tile.
                ctx.drawImage(
                    assets['Tree'], 0, 0, 16, 16,
                    x * tileSize, y * tileSize, tileSize, tileSize
                );
            }
        }
    }
}

function drawHighlights() {
    // Movement tiles (blue)
    for (const t of state.moveTiles) {
        ctx.fillStyle = 'rgba(80, 140, 255, 0.4)';
        ctx.fillRect(t.x * tileSize, t.y * tileSize, tileSize, tileSize);
    }
    // Enemy attack tiles (red)
    for (const t of state.attackTiles) {
        ctx.fillStyle = 'rgba(255, 60, 60, 0.45)';
        ctx.fillRect(t.x * tileSize, t.y * tileSize, tileSize, tileSize);
    }
    // Ability target tiles (green)
    for (const t of state.abilityTiles) {
        ctx.fillStyle = 'rgba(80, 220, 120, 0.45)';
        ctx.fillRect(t.x * tileSize, t.y * tileSize, tileSize, tileSize);
    }
    // Selected unit tile (yellow ring)
    const u = state.selectedUnit;
    if (u) {
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = Math.max(2, Math.floor(tileSize / 16));
        ctx.strokeRect(
            u.renderX * tileSize + 1,
            u.renderY * tileSize + 1,
            tileSize - 2,
            tileSize - 2
        );
    }
}

function drawGridOverlay() {
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= COLS; x++) {
        ctx.beginPath();
        ctx.moveTo(x * tileSize + 0.5, 0);
        ctx.lineTo(x * tileSize + 0.5, ROWS * tileSize);
        ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * tileSize + 0.5);
        ctx.lineTo(COLS * tileSize, y * tileSize + 0.5);
        ctx.stroke();
    }
}

function drawUnits(dt) {
    // Sort by y for a small depth effect
    const sorted = state.units.filter(u => u.alive).slice().sort((a,b) => a.renderY - b.renderY);
    for (const u of sorted) {
        drawUnit(u, dt);
    }
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
    const py = u.renderY * tileSize;

    // Gray out acted units
    if (u.acted) ctx.globalAlpha = 0.55;

    // Hit flash via tint: draw sprite, then white overlay
    ctx.drawImage(
        sheet, sx, sy, FRAME_W, FRAME_H,
        px, py, tileSize, tileSize
    );

    if (u.hitFlash > 0) {
        ctx.globalAlpha = 0.6 * u.hitFlash;
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px, py, tileSize, tileSize);
        ctx.globalCompositeOperation = 'source-over';
        u.hitFlash = Math.max(0, u.hitFlash - dt * 0.005);
    }

    ctx.globalAlpha = 1;

    // HP bar
    drawHpBar(u, px, py);

    // Team indicator: tiny colored square
    ctx.fillStyle = u.team === 'player' ? '#6eebff' : '#e94560';
    const isz = Math.max(3, Math.floor(tileSize / 10));
    ctx.fillRect(px + 2, py + 2, isz, isz);
}

function drawHpBar(u, px, py) {
    const barW = Math.floor(tileSize * 0.8);
    const barH = Math.max(3, Math.floor(tileSize / 12));
    const bx = px + Math.floor((tileSize - barW) / 2);
    const by = py + tileSize - barH - 2;

    // Background
    ctx.fillStyle = '#000000';
    ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
    ctx.fillStyle = '#5a1a1a';
    ctx.fillRect(bx, by, barW, barH);

    // Fill
    const pct = u.hp / u.maxHp;
    let color = '#4caf50';
    if (pct <= 0.25) color = '#f44336';
    else if (pct <= 0.5) color = '#ffeb3b';
    ctx.fillStyle = color;
    ctx.fillRect(bx, by, Math.floor(barW * pct), barH);
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
        ctx.font = 'bold ' + Math.floor(tileSize / 3) + 'px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#000000';
        ctx.strokeText(f.text, px, py);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, px, py);
        ctx.restore();
    }
}

// ============================================================
// MAIN LOOP
// ============================================================

let lastFrame = 0;
function gameLoop(now) {
    const dt = lastFrame ? (now - lastFrame) : 16;
    lastFrame = now;
    render(dt);
    requestAnimationFrame(gameLoop);
}

// ============================================================
// INIT
// ============================================================

async function init() {
    dom.canvas = $('game-canvas');
    setupCanvas();
    setupInput();
    setupSelectionScreen();
    setupMapScreen();
    buildTerrainTextures();
    updateUI();

    try {
        await loadAssets();
    } catch (err) {
        console.error('Asset load failed:', err);
    }

    state.units = [];
    requestAnimationFrame(gameLoop);
}

window.addEventListener('DOMContentLoaded', init);
