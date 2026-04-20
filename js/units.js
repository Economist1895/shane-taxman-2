// ============================================================
// UNITS — construction, abilities, effective stats
// ============================================================




let _unitIdCounter = 0;

function makeUnit(charKey, team, x, y) {
    const c = CHARACTERS[charKey];
    if (!c) throw new Error('Unknown character: ' + charKey);
    const cls = CLASS_DEFAULTS[c.class];
    const sprite = SPRITE_BY_CLASS_TEAM[c.class][team];
    const abilityId = c.ability ? c.ability.id : null;

    // Ryan's Tax Mobile of Justice: +2 movement is baked in at creation time.
    const baseMove = c.movement ?? cls.movement;
    const movement = abilityId === 'tax_mobile' ? baseMove + 2 : baseMove;

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

function createInitialUnits(playerTeam, mapKey) {
    const team = (playerTeam && playerTeam.length === TEAM_SIZE)
        ? playerTeam
        : ['ryan', 'jade', 'annie', 'bethany'];
    const order = (state.deployOrder && state.deployOrder.length === TEAM_SIZE)
        ? state.deployOrder
        : team;

    const units = order.map((key, i) => {
        const pos = PLAYER_DEPLOY[i];
        return makeUnit(key, 'player', pos.x, pos.y);
    });

    const map = MAPS[mapKey] || MAPS[DEFAULT_MAP_KEY];
    for (const e of map.enemies) {
        units.push(makeUnit(e.key, 'enemy', e.x, e.y));
    }
    return units;
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

// ATK aura if an ally with Future CEO (Jade) or Aura (The CEO) sits orthogonally
// adjacent. Does not stack — take the best single source.
function getAuraAtkBonus(u) {
    const allies = alliesWithin(u.team, u.x, u.y, 1, u.id);
    let best = 0;
    for (const a of allies) {
        if (hasAbility(a, 'aura')) best = Math.max(best, 3);
        else if (hasAbility(a, 'future_ceo')) best = Math.max(best, 3);
    }
    return best;
}

// Active abilities (things that replace an attack on the action menu).
// Returns null for units with no active ability.
function getActiveAbility(u) {
    if (!u.ability) return null;
    const id = u.ability.id;
    if (id === 'blood_donation') return { id, name: u.ability.name, range: 1 };
    if (id === 'tax_relief')     return { id, name: u.ability.name, range: 2 };
    if (id === 'do_work')        return { id, name: u.ability.name, range: 2 };
    return null;
}

// Allies that a unit can currently target with its active ability from (fx,fy).
function getAbilityTargets(u, fx, fy) {
    const ab = getActiveAbility(u);
    if (!ab) return [];
    return alliesWithin(u.team, fx, fy, ab.range, u.id);
}

// Final ATK for combat math: base + Mountain Climbing + Do Work! + aura.
function getEffectiveAtk(u) {
    return u.atk + (u.climbStacks || 0) + (u.atkBuff || 0) + getAuraAtkBonus(u);
}

// Triggered once per unit at the start of its team's phase.
// Covers Shaun (Sleepless Panda regen) and Bethany (Mountain Climbing stack).
function applyTurnStartAbilities(u) {
    if (!u.alive) return;
    if (hasAbility(u, 'sleepless_panda')) {
        const before = u.hp;
        u.hp = Math.min(u.maxHp, u.hp + 4);
        if (u.hp > before) spawnFloatingText('+' + (u.hp - before), u.x, u.y - 0.4, '#7effb0');
    }
    if (hasAbility(u, 'mountain_climbing')) {
        if (u.climbStacks < 3) {
            u.climbStacks += 1;
            spawnFloatingText('+1 ATK', u.x, u.y - 0.4, '#ffd36e');
        }
    }
}
