// ============================================================
// COMBAT — damage math, hit resolution, combat sequence
// ============================================================






// Raw damage from a single side of a fight, accounting for:
//   - effective ATK (climb stacks, Do Work! buff, aura)
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

    // Order: A hits, D counters (if able), A doubles (if spd), D doubles counter.
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

    if (damage > 0) {
        const sparkColor = attacker.type === 'mage' ? '#c79cff' : '#ffd166';
        spawnSparks(defender.x + 0.5, defender.y + 0.5, sparkColor, 8);
        const mag = damage >= 10 ? 4 : damage >= 5 ? 3 : 2;
        triggerShake(mag, 200);
    }

    // Jasper — Undying Project: first lethal hit survives at 1 HP.
    if (defender.hp <= 0 && hasAbility(defender, 'undying') && !defender.undyingUsed) {
        defender.hp = 1;
        defender.undyingUsed = true;
        spawnFloatingText('UNDYING', defender.x, defender.y - 0.4, '#ffd36e');
    }

    const dealt = hpBefore - defender.hp;
    spawnFloatingText('-' + dealt, defender.x, defender.y, '#ff6666');

    // Richmond — Tax Recovery: heal 100% of damage dealt.
    if (hasAbility(attacker, 'tax_recovery') && dealt > 0 && attacker.alive) {
        const heal = dealt;
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
