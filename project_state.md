# BSV Farm Game — Project State

## Current state

- The game is a browser-based idle farming game in the `Testing` workspace.
- The codebase is now modular: `index.html` loads `js/main.js`, which imports other modules from `js/`.
- The project uses vanilla ES modules and no build step.
- `game_design_v7.md` has been updated to describe the new modular architecture.

## Key files

- `index.html` — application shell and HTML entrypoint.
- `styles.css` — game styles.
- `js/main.js` — entrypoint, global handler wiring, initialization.
- `js/game-state.js` — state management, load/save, timing, events.
- `js/game.js` — core game actions, harvest, planting, market, etc.
- `js/rendering.js` — UI rendering functions and overlays.
- `js/utils.js` — helper functions, crop art, levels.
- `js/wallet.js` — BSV wallet integration.
- `js/leaderboard.js` — Supabase leaderboard logic.
- `js/achievements.js` — achievement building and checking.
- `js/marketplace.js` — marketplace / vege stand logic.
- `game_design_v7.md` — design document.
- `README.md` — project overview and project structure note.

## Implemented features

- 20 standard crops plus 4 exotic crops.
- Plot unlocking, seed shop, storage, planting, harvesting.
- Watering can, compost, prestige, random events, merchant deals.
- Exotic seed-saving mechanic with seed phase and mishap events.
- Metanet.page BSV wallet integration and Supabase leaderboard support.
- Crop journal, achievements, leaderboard UI.
- Modular JS architecture with explicit `window` export wiring.

## Notes for next continuation

- Confirm the actual in-game `localStorage` save key and persistence logic across modules.
- Review `game_design_v7.md` to ensure all v7 references are coherent.
- Check `README.md` for any additional project structure updates needed.
- Evaluate whether the legacy single-file version still exists and if it should be preserved.
- Possible improvements:
  - polish marketplace / vege stand UX
  - add more achievements or seasonal content
  - add tests or validation for save/load and merchant flow
  - improve documentation of module responsibilities and global state fields

## Conversation context

- This file is intended as a handoff note for continuing the project in a new chat.
- Use it to understand the current modular architecture and main game features.
