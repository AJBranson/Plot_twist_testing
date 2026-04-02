# 🌾 Plot Twist

A browser-based idle farming game rebuilt as a modular vanilla JavaScript app.

Plant seeds, wait for crops to grow, harvest them for coins, 
and build your farm from a single plot into a thriving estate.
Random events, a wandering merchant, daily scratch cards, and 
a prestige system keep every session feeling fresh.

## Play the Game

👉 [Play Plot Twist](https://ajbranson.github.io/Plot_twist/)

## Features

- 20 crops with hand-drawn SVG art — no external image files
- 20 unlockable plots with escalating costs
- 10 levels of progression unlocking new crops
- Prestige system — reset for a permanent sell bonus (up to 50×)
- Random farm events every few minutes
- Wandering Merchant with rotating deals
- Daily scratch card with streak rewards
- Crop Journal with 124 achievements
- BSV (Bitcoin SV) wallet integration via Metanet.page

## Project structure

This repository now uses a modular file layout:
- `index.html` — main app shell
- `styles.css` — game styles
- `js/` — modular game logic, rendering, state management, marketplace, and utilities

### Module responsibilities
- `js/game-state.js` — authoritative game state (`G`), save/load, timers, random events, merchant lifecycle
- `js/game.js` — core player actions (planting, harvesting, water, compost, prestige, events)
- `js/rendering.js` — DOM rendering and UI overlays; called by `main.js` and state changes
- `js/marketplace.js` — vege stand, seed swapping/trading, merchant purchases
- `js/achievements.js` — achievement definitions and check hooks
- `js/leaderboard.js` — Supabase score submission and retrieval
- `js/wallet.js` — Metanet.page wallet connection and transaction state
- `js/utils.js` — shared helpers (levels, crop stats, sus
- `js/constants.js` — gameplay constants including `SAVE_KEY` for persistence

### Persistence details
- `localStorage` key: `idle_farm_v1`
- Save data includes coins, inventory, plots, progression, events, merchant data, and achievement state.
- Corrupted data recovery: the game detects invalid JSON and resets to default state, clearing stale localStorage entry.

No frameworks and no build step required. Run locally by opening `index.html` in a browser or serving the folder with a static server such as:

```bash
python3 -m http.server 8000
```

## Testing

A lightweight test harness is included in `tests/save_load.test.js`.

- Install dependencies:

```bash
npm install jsdom
```

- Run tests:

```bash
node --experimental-vm-modules tests/save_load.test.js
```

`save_load` covers:
- localStorage roundtrip behavior
- corrupted save detection and recovery
- SAVE_KEY consistency

## Built on

[Metanet.page](https://metanet.page) — BSV blockchain platform

## License

Personal project — all rights reserved.
