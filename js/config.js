// ============================================================
// CONFIGURATION — static data: grid, characters, maps, abilities
// ============================================================

const COLS = 8;
const ROWS = 8;

// Sprite sheet frame dimensions. Sheets are 768x256.
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

// Three maps. Each has its own terrain grid + enemy composition.
// Player deploy is always the bottom row (row 7, cols 2-5).
const MAPS = {
    audit: {
        name: 'L1 Lounge',
        bias: 'Balanced enemies',
        terrain: [
            [0,0,0,0,0,0,0,0], // row 0 — enemy deploy
            [0,0,0,0,0,0,0,0],
            [0,0,0,2,2,0,0,0], // pond top
            [0,0,0,0,2,0,0,0], // pond tail
            [0,1,0,0,0,0,0,0], // scattered tree (left)
            [0,0,0,0,0,0,1,0], // scattered tree (right)
            [0,0,0,0,0,0,0,0],
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
        terrain: [
            [0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0],
            [0,0,0,1,1,0,0,0], // tree cluster
            [0,0,0,1,1,0,0,0],
            [0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0],
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
        terrain: [
            [0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0],
            [0,1,0,0,1,0,0,1], // trees flank bridges
            [2,2,0,2,2,0,2,2], // river (bridges at col 2, 5)
            [2,2,0,2,2,0,2,2],
            [0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0],
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

// Class defaults — range, damage type, movement. Stats come from CHARACTERS.
const CLASS_DEFAULTS = {
    soldier: { minRange: 1, maxRange: 1, damageType: 'physical', movement: 2 },
    archer:  { minRange: 2, maxRange: 2, damageType: 'physical', movement: 2 },
    mage:    { minRange: 1, maxRange: 2, damageType: 'magic',    movement: 2 },
};

// Character roster. Stats + (optional) ability; class brings range + damage type.
const CHARACTERS = {
    // --- Player: soldiers ---
    ryan:      { name: 'Ryan Li',          shortName: 'Ryan',      title: 'Investigator',             class: 'soldier', role: 'Scout',     hp: 22, atk: 9,  def: 5, spd: 9, res: 3, ability: { id: 'tax_mobile',    name: 'Tax Mobile of Justice' } },
    sylvester: { name: 'Sylvester Sim',    shortName: 'Sylvester', title: 'Legal Associate',          class: 'soldier', role: 'DPS',       hp: 22, atk: 12, def: 6, spd: 4, res: 2, ability: { id: 'hammer',        name: 'Hammer of Justice' } },
    richmond:  { name: 'Richmond Yeo',     shortName: 'Richmond',  title: 'Auditor',                  class: 'soldier', role: 'Lifesteal', hp: 24, atk: 10, def: 6, spd: 5, res: 2, ability: { id: 'tax_recovery',  name: 'Tax Recovery' } },
    shaun:     { name: 'Shaun Tan',        shortName: 'Shaun',     title: 'Tax Specialist',           class: 'soldier', role: 'Tank',      hp: 28, atk: 8,  def: 10, spd: 2, res: 4, ability: { id: 'sleepless_panda', name: 'Sleepless Panda' } },
    jiawei:    { name: 'Jiawei Tian',      shortName: 'Jiawei',    title: 'Software Developer',       class: 'soldier', role: 'Medic',     hp: 26, atk: 8,  def: 7, spd: 4, res: 5, ability: { id: 'blood_donation', name: 'Blood Donation' } },
    // --- Player: archers ---
    annie:     { name: 'Annie Khoo',       shortName: 'Annie',     title: 'Outreach Officer',         class: 'archer',  role: 'Tank',      hp: 24, atk: 9,  def: 8, spd: 4, res: 5, ability: { id: 'arrow_guard',   name: 'Protection from Arrows' } },
    shane:     { name: 'Shane Soh',        shortName: 'Shane',     title: 'Manager',                  class: 'archer',  role: 'Buffer',    hp: 20, atk: 8,  def: 3, spd: 9, res: 4, ability: { id: 'do_work',       name: 'Do Work!' } },
    jasper:    { name: 'Jasper Samuel',    shortName: 'Jasper',    title: 'Policy Officer',           class: 'archer',  role: 'DPS',       hp: 16, atk: 11, def: 3, spd: 10, res: 3, ability: { id: 'undying',       name: 'Undying Project' } },
    // --- Player: mages ---
    karishma:  { name: 'Karishma Jayakumar', shortName: 'Karishma', title: 'Customer Service Officer', class: 'mage',    role: 'Healer',    hp: 20, atk: 7,  def: 3, spd: 5, res: 10, ability: { id: 'tax_relief',    name: 'Tax Relief' } },
    jade:      { name: 'Jade Chen',        shortName: 'Jade',      title: 'Policy Officer',           class: 'mage',    role: 'Buffer',    hp: 20, atk: 7,  def: 4, spd: 5, res: 7, ability: { id: 'future_ceo',    name: 'Future CEO' } },
    bethany:   { name: 'Bethany Su',       shortName: 'Bethany',   title: 'AI Lead',                  class: 'mage',    role: 'DPS',       hp: 18, atk: 9,  def: 2, spd: 5, res: 8, ability: { id: 'mountain_climbing', name: 'Mountain Climbing' } },

    // --- Enemies ---
    ceo:       { name: 'The CEO',   class: 'archer',  hp: 30, atk: 11, def: 6, spd: 7, res: 5,
                 minRange: 2, maxRange: 3,
                 ability: { id: 'aura', name: 'Aura' } },
    director:  { name: 'Director',  class: 'soldier', hp: 28, atk: 7,  def: 9, spd: 3, res: 3 },
    minion_sol: { name: 'Minion',   class: 'soldier', hp: 18, atk: 7,  def: 5, spd: 4, res: 2 },
    minion_arc: { name: 'Minion',   class: 'archer',  hp: 14, atk: 7,  def: 3, spd: 6, res: 2 },
    minion_mag: { name: 'Minion',   class: 'mage',    hp: 14, atk: 8,  def: 2, spd: 4, res: 5 },
};

const MIN_DAMAGE = 1;

const SPRITES = {
    'Archer-Green':  'sprites/Archer-Green.png',
    'Archer-Purple': 'sprites/Archer-Purple.png',
    'Mage-Cyan':     'sprites/Mage-Cyan.png',
    'Mage-Red':      'sprites/Mage-Red.png',
    'Soldier-Blue':  'sprites/Soldier-Blue.png',
    'Soldier-Red':   'sprites/Soldier-Red.png',
    'Tree':          'sprites/Tree.png',
};

// Sprite keys per class + team. All units of the same class share a sheet.
const SPRITE_BY_CLASS_TEAM = {
    soldier: { player: 'Soldier-Blue',  enemy: 'Soldier-Red' },
    archer:  { player: 'Archer-Green',  enemy: 'Archer-Purple' },
    mage:    { player: 'Mage-Cyan',     enemy: 'Mage-Red' },
};

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

// Stat bars scale against fixed per-stat caps so the visual length is an honest
// fraction of a meaningful max — not a roster-relative tier that exaggerates
// small differences. Caps sit slightly above the top roster value so the best
// in class reads near-full (not always pegged) and differences stay readable.
const STAT_CAPS = {
    hp:  28,
    atk: 12,
    def: 12,
    spd: 12,
    res: 12,
    mov: 4,
    rng: 2,
};

function statFrac(stat, val) {
    const cap = STAT_CAPS[stat];
    if (!cap) return 0;
    return Math.max(0, Math.min(1, val / cap));
}

// Resolve a display-time stat value for a roster character, including
// ability-derived bumps (Ryan's +2 MOV) and class-default fallbacks for
// MOV and RNG. Returns a plain number.
function getCharStat(charKey, stat) {
    const c = CHARACTERS[charKey];
    if (!c) return 0;
    if (stat === 'mov') {
        const base = c.movement ?? CLASS_DEFAULTS[c.class].movement;
        return c.ability && c.ability.id === 'tax_mobile' ? base + 2 : base;
    }
    if (stat === 'rng') {
        return c.maxRange ?? CLASS_DEFAULTS[c.class].maxRange;
    }
    return c[stat] ?? 0;
}

// Short flavour text for abilities — shown on the unit selection detail panel.
const ABILITY_DESCRIPTIONS = {
    tax_mobile:        '+2 movement range.',
    hammer:            'Attacks ignore 50% of target DEF.',
    tax_recovery:      'Heal 100% of damage dealt on attack.',
    sleepless_panda:   'Regenerate 3 HP at the start of each turn.',
    blood_donation:    'Heal an adjacent ally for 14 HP.',
    arrow_guard:       'Halves incoming damage from archer attackers.',
    do_work:           'Grant an ally +6 ATK for their next attack.',
    undying:           'Survives lethal damage once at 1 HP.',
    tax_relief:        'Heal an ally within 2 tiles for 12 HP.',
    future_ceo:        '+3 ATK aura to allies within 2 tiles.',
    mountain_climbing: '+1 ATK at the start of each turn (max +3).',
    aura:              '+3 ATK aura to allies within 2 tiles.',
};

// Abilities that replace an attack on the action menu (tap an ally to trigger).
const ACTIVE_ABILITY_IDS = new Set(['blood_donation', 'tax_relief', 'do_work']);
