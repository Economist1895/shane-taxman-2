# Shane the Taxman 2

A mobile-friendly, browser-based turn-based tactics game in the spirit of *Fire Emblem* and *Advance Wars*. Pick a squad of four, deploy onto an 8×8 grid, and take down The CEO and their minions.

Built as a single static site — pure HTML, CSS, and vanilla JavaScript, no build step and no dependencies.

## Play

**Live demo:** _(update with your GitHub Pages URL once deployed)_

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
```

No build, no bundler, no package manager. Open `index.html` in a browser and it runs.

## Running locally

Because the game loads sprite sheets via `<img>`, it needs to be served over HTTP (not `file://`). Any static server works:

```bash
# Python
python3 -m http.server 8000

# Node
npx serve .
```

Then open <http://localhost:8000>.

## Deploying to GitHub Pages

1. Push this repo to GitHub.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
4. Choose the branch (e.g. `main`) and the `/ (root)` folder, then **Save**.
5. After a minute, the site will be live at `https://<username>.github.io/<repo>/`.

No build step or GitHub Action is required — the whole site is static.

## Credits

- Sprites from the [Tiny Swords](https://pixelfrog-assets.itch.io/tiny-swords) pack by Pixel Frog.
- Font: [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P).
