# Shane the Taxman 2

A mobile-friendly, browser-based turn-based tactics game. Pick a squad of four, deploy onto an 8×8 grid, and take down The CEO and their minions.

Built as a single static site — pure HTML, CSS, and vanilla JavaScript, no build step and no dependencies.

## Play

https://economist1895.github.io/shane-taxman-2/

Tap **TAP TO START**, choose four heroes from the roster, then:

1. **Tap a unit** to see their movement range (blue), attack range (red), and ability range (green).
2. **Tap a blue tile** to move. **Tap a red enemy** to attack. **Tap a green ally** to use an active ability.
3. Every attack and ability opens a **forecast panel** showing the expected outcome — confirm or cancel.
4. Wipe out all enemies to win. Lose all your units and it's game over.

## Features

- 11 unique player characters across 3 classes (Soldier, Archer, Mage), each with stats, a role, and often a named ability.
- Class-based combat: physical vs. magic damage, SPD-based double attacks, counter-attacks, terrain-blocked movement.
- 7 passive and 3 active abilities — healing, lifesteal, buffs, damage mitigation, auras, and an undying clutch.
- Enemy AI that scores every reachable position for the best kill/damage trade.
- Combat **and** ability forecast panels so you always know what a tap will do.
- Pixel-art sprites with idle + attack animations, floating damage numbers, hit flashes, and procedurally generated pixelated terrain.
- Responsive canvas that rescales for phones, tablets, and desktops.

## Roster highlights

- **Ryan** — Scout soldier with +1 movement (*Tax Mobile of Justice*).
- **Sylvester** — DPS soldier whose *Hammer of Justice* ignores half the target's DEF.
- **Shaun** — Tank that regenerates 3 HP per turn.
- **Jiawei / Karishma** — Healers with *Blood Donation* / *Tax Relief* (active, +10 HP).
- **Annie** — Archer with *Protection from Arrows* (halves archer damage).
- **Shane** — Buffer archer whose *Do Work!* grants an ally +6 ATK on their next attack.
- **Jasper** — Glass-cannon archer who survives lethal damage once at 1 HP.
- **Jade / Bethany** — Mages with aura and ramping attack.

The enemy team is led by **The CEO** (a boss archer with a +3 ATK aura) and their bodyguard, the **Director**, plus minions.

## Project structure

```
.
├── index.html      # markup + UI layout
├── styles.css      # all styling (pixel UI, responsive layout)
├── js/
│   └── game.js     # game logic, combat, AI, rendering
└── sprites/        # PNG sprite sheets (soldier / archer / mage, tree)
