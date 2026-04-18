# Shane the Taxman 2

A mobile-friendly, browser-based turn-based tactics game. Pick a map, draft a squad of four from an 11-hero roster, and take down The CEO and their minions across an 8×8 grid.

Built as a single static site — pure HTML, CSS, and vanilla JavaScript, no build step and no dependencies.

## Play

https://economist1895.github.io/shane-taxman-2/

1. **TAP TO START**, then choose one of three maps.
2. Pick four heroes on the squad-select screen. Tap any card to preview stats and abilities.
3. New to the game? Tap **HOW TO PLAY** on the map screen for a full rules/stats primer.
4. In battle: **tap a unit** to see movement (blue), attack (red), and ability (green) tiles. **Tap a blue tile** to move. **Tap a red enemy** to attack. **Tap a green ally** to use an active ability.
5. Every attack and ability opens a **forecast panel** showing the expected outcome — confirm or cancel.
6. Wipe out all enemies to win. Lose your whole squad and it's game over.

## Features

- **11 unique heroes** across three classes (Soldier, Archer, Mage), each with individual stats, a gameplay role, and a named ability.
- **3 maps** with distinct terrain and enemy compositions — a balanced opener (*L1 Lounge*), a ranged-heavy rooftop (*L24 Board Room*), and a tank-heavy choke point over a river (*L5 Auditorium*).
- **8 passive + 3 active abilities** on the player roster — healing, lifesteal, buffs, damage mitigation, auras, and an undying clutch — plus The CEO's own +3 ATK aura.
- **Class-based combat**: physical vs. magic damage, SPD-based double attacks, counter-attacks, and terrain-blocked movement.
- **Enemy AI** that scores every reachable position for the best kill/damage trade.
- **Combat *and* ability forecast panels** so you always know what a tap will do.
- **In-game guide** (HOW TO PLAY button on the map screen) covering the turn flow, combat math, all seven stats, classes, terrain, and tips.
- **Pixel-art sprites** with idle + attack animations, floating damage numbers, hit flashes, and procedurally generated pixelated terrain.
- **Responsive canvas** that rescales for phones, tablets, and desktops.

## Roster highlights

- **Ryan Li** (Investigator) — Scout soldier with +1 movement (*Tax Mobile of Justice*).
- **Sylvester Sim** (Legal Associate) — DPS soldier whose *Hammer of Justice* ignores half the target's DEF.
- **Richmond Yeo** (Auditor) — Lifesteal soldier who heals 75% of damage dealt (*Tax Recovery*).
- **Shaun Tan** (Tax Specialist) — Tank that regenerates 3 HP per turn (*Sleepless Panda*).
- **Jiawei Tian** (Software Developer) — Medic soldier with active heal *Blood Donation* (+10 HP to an adjacent ally).
- **Annie Khoo** (Outreach Officer) — Archer tank with *Protection from Arrows* (halves damage from archer attackers).
- **Shane Soh** (Manager) — Buffer archer whose *Do Work!* grants an ally +8 ATK on their next attack.
- **Jasper Samuel** (Policy Officer) — Glass-cannon archer who survives lethal damage once at 1 HP (*Undying Project*).
- **Karishma Jayakumar** (Customer Service Officer) — Ranged healer with *Tax Relief* (+10 HP to an ally within 2 tiles).
- **Jade Chen** (Policy Officer) — Buffer mage with a +2 ATK adjacency aura (*Future CEO*).
- **Bethany Su** (AI Lead) — DPS mage who gains +1 ATK at the start of each turn, capping at +3 (*Mountain Climbing*).

The enemy team is led by **The CEO** (a boss archer with range 2-3 and a +3 ATK aura) and their bodyguard, the **Director**, plus a rotating cast of soldier / archer / mage minions.

## Stats at a glance

| Stat | Meaning |
| --- | --- |
| **HP**  | Health. At 0 the unit falls. |
| **ATK** | Attack power — raw damage before defense. |
| **DEF** | Reduces physical damage (soldiers, archers). |
| **RES** | Reduces magic damage (mages). |
| **SPD** | A 4+ SPD lead lets you strike twice in one exchange. |
| **RNG** | Attack range in tiles. Soldier 1, Archer 2, Mage 1-2, The CEO 2-3. |
| **MOV** | Tiles moved per turn (2 by default, 3 for Ryan). |

Trees and water block **movement** — no one can step on them — but ranged attacks fly over both.

## Project structure

```
.
├── index.html      # markup + UI layout (title, map select, squad select, HUD, modals)
├── styles.css      # all styling (pixel UI, responsive layout)
├── js/
│   └── game.js     # game logic, combat, AI, rendering
└── sprites/        # PNG sprite sheets (soldier / archer / mage, tree)
```

## Running locally

No build step. Serve the folder with any static file server, for example:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```
