// ============================================================
// GAME STATE — shared singletons (state, canvas refs, active map, assets)
// ============================================================


// Central mutable state consumed by rendering, input, and game flow.
// phase values:   'title' | 'deploy' | 'player' | 'enemy' | 'gameover'
// subPhase:       'selectUnit' | 'selectMove' | 'selectAction' | 'selectTarget'
//               | 'combatPreview' | 'abilityPreview' | 'animating' | 'deploySwap'
const state = {
    phase: 'title',
    subPhase: 'selectUnit',
    units: [],
    selectedUnit: null,
    selectedOrigin: null,     // {x,y} for cancel-undo
    moveTiles: [],            // [{x,y}]
    attackTiles: [],          // [{x,y}] enemies in attack range (red)
    abilityTiles: [],         // [{x,y}] allies in active-ability range (green)
    pendingAttackTarget: null,
    pendingCombatResult: null,
    pendingAbilityTarget: null,
    floatingTexts: [],        // {text, gx, gy, age, maxAge, color}
    particles: [],            // {gx, gy, vx, vy, age, maxAge, color, size}
    shake: { magnitude: 0, duration: 0, age: 0 },
    turnNumber: 1,
    winner: null,
    inputLocked: false,
    selectedTeam: [],         // char keys chosen on the selection screen
    previewedChar: null,
    selectedMap: DEFAULT_MAP_KEY,
    deployOrder: [],          // char keys in deploy-slot order (matches PLAYER_DEPLOY)
};

// Sprite-image cache, populated by loadAssets().
const assets = {};

// Canvas + context + current tile size. Written by render.setupCanvas / resizeCanvas.
// Exported as `let` so importers see live updates on reassignment.
let canvas = null;
let ctx = null;
let tileSize = 48;

// Active terrain grid. Reassigned at the start of each battle / deploy preview.
let MAP = MAPS[DEFAULT_MAP_KEY].terrain;

function setCanvas(c) { canvas = c; }
function setCtx(c) { ctx = c; }
function setTileSize(s) { tileSize = s; }
function setMap(m) { MAP = m; }

function clearSelection() {
    state.selectedUnit = null;
    state.selectedOrigin = null;
    state.moveTiles = [];
    state.attackTiles = [];
    state.abilityTiles = [];
    state.pendingAttackTarget = null;
    state.pendingCombatResult = null;
}
