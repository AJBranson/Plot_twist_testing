# BSV Farm Game — Project State

## Current state

- The game is a browser-based idle farming game called **Plot Twist**.
- Playable at: https://ajbranson.github.io/Plot_twist/
- Vanilla ES modules, no build step, no frameworks.
- Modular architecture: `index.html` → `js/main.js` → other modules.
- BSV wallet integration via Metanet.page platform SDK.
- Cloud save and leaderboard via Supabase.

## Key files

| File | Responsibility |
|------|---------------|
| `index.html` | Application shell, all UI elements, inline onclick handlers |
| `styles.css` | Game styles (~2100 lines) |
| `js/main.js` | Entrypoint, init(), window.* global wiring, game tick loop |
| `js/game-state.js` | Authoritative state (`G`), save/load (localStorage + cloud), tick logic, events, merchant |
| `js/game.js` | Core actions: plant, harvest, water, compost, prestige, seed-saving, BSV payments |
| `js/rendering.js` | DOM rendering functions, notifications, journal UI, all render* functions |
| `js/constants.js` | Crops (20 standard + 4 exotic), levels, plots, events, merchant deals, config constants |
| `js/utils.js` | Helpers, SVG crop art, prestige flourish SVGs, progress rings, formatters |
| `js/marketplace.js` | Vege Stand (player-to-player seed trading via BSV) |
| `js/achievements.js` | 124 achievements (crop milestones + farm goals) |
| `js/leaderboard.js` | Supabase-backed leaderboard with score sharing |
| `js/wallet.js` | Metanet.page BSV wallet connection/profile switching |
| `js/bsv-payments.js` | BSV payment signing and broadcast helpers |
| `js/cloud-save.js` | Cloud save via Supabase RPC |
| `plot_twist_dev_tool.html` | Standalone dev tool for editing saves (handles guest + wallet profiles) |

## Save system

- **Guest profile**: `idle_farm_v1_guest` (localStorage)
- **Wallet profiles**: `idle_farm_v1_wallet_<address>` (localStorage + Supabase cloud sync)
- Corrupted save detection and recovery
- Cloud save conflict resolution (user chooses cloud vs local)
- `personalBestScore` field — never drops, only increases

## Implemented features

### Core gameplay
- 20 standard crops + 4 exotic crops (Dragon Fruit, Saffron, Vanilla, Truffle)
- 20 unlockable plots with escalating coin/BSV costs
- 10-level progression system with XP
- Plant → grow → harvest loop with visual progress rings
- Hand-drawn SVG crop art for all 24 crops

### Prestige system
- Up to 50 prestiges, resets farm to Lv1 for permanent +10% sell bonus per level
- Requires Level 10 (Master) to prestige
- Exotic seeds in storage preserved through prestige
- **Visual flourishes** at milestones 1, 5, 10, 20, 30, 40, 50 — cumulative enhancements:
  - Locked plots: richer colors, gold borders, rivets, crowns, gems, ornate frames
  - Open/empty plots: warmer soil tint, gold edges, dashed circles, corner dots, concentric rings
  - Crop SVGs: gold borders, corner dots, dashed inner borders, cardinal point dots, dashed circles, ring decorations, ornate corner brackets

### Exotic seed-saving mechanic
- Let exotic crops go to seed instead of harvesting
- Seed phase duration based on crop's grow time × `SEED_PHASE_RATIO`
- Collect 1-3 new seeds (45%/40%/15% distribution)
- Heritage seed variant chance (10% normal, 50% if parent was Heritage)
- Mishap events during seed phase (weevils, frost, wind) — partial or total loss
- Seed-saving counter: `_exoticNearMisses`, `_exoticMishapsFix`, `exoticMishapsTotal`

### Utilities & boosts
- **Watering Can**: −10% grow time, 120s cooldown
- **Compost Pile**: +25% sell value on next harvest, 5 charges, recharges 1 per 4 min
- **Compost BSV Purchase**: When 0 charges + wallet connected, buy 5 charges for ₿0.0002 BSV (confirmation dialog)
- **Mishap Insurance**: 50 coins for 30 minutes protection on all seeding plots (only available when seeding plots exist, confirmation dialog)
- **Speed Boost**: ₿0.01 BSV for 10× farm speed for 20 minutes (tick interval: 3.3s → 0.33s, confirmation dialog)

### Random events
- Events fire every 2-5 minutes (configurable via `EVENT_MIN_GAP` / `EVENT_MAX_GAP`)
- Types: aphids, rain, crows, bees, frost, sun bonus, wandering merchant, seed weevils, late frost, strange wind
- Events have fix (pay coins) and/or ignore options
- **30-second auto-timeout**: events auto-dismiss as "ignored" if user is AFK
- Event tracking: `_eventsEncountered`, `_eventsFixed`, `_sunBonusCount`, `_beeBoostCount`

### Wandering Merchant
- Appears every 10-15 minutes for 3 minutes
- Rotating deals: discounts, XP boosts, speed tonics, exotic seeds
- `_merchantDealsAccepted` counter — at 40 deals, exotic seeds may appear and Vege Stand unlocks

### Player marketplace (Vege Stand)
- Unlocks at 40 merchant deals or when exotic seeds are in storage
- List seeds for sale in BSV, buy from other farmers
- Bypasses level restrictions for buyers
- Supabase-backed listing storage

### BSV wallet integration
- Metanet.page SDK via `window.platformSDK`
- Connection → payment → post creation flow
- Profile switching: guest ↔ wallet (separate save data)
- BSV payments: sign via wallet, broadcast via Metanet API
- Used for: plot unlocks, seed purchases, compost refills, speed boost

### Achievements & journal
- 124 achievements across categories: crops, farm, events
- Crop milestones: First Harvest (1), Seasoned (10), Veteran (50), Master Grower (200) per crop
- Farm achievements: harvest counts, coin earnings, plot unlocks, levels, prestige, diversity
- Event achievements: first event, merchant deals, heritage seeds
- Journal UI with tabs: crops, achievements, leaderboard

### Leaderboard
- Supabase-backed (`lb_users` table)
- Farm Score = level² × 300 + coins + totalXP × 0.5
- Top 10 display with personal best tracking
- Share score as generated image card via Metanet posts

### Dev tool
- `plot_twist_dev_tool.html` — standalone save editor
- Handles both guest and wallet save profiles with profile switcher
- Quick actions: coins, XP, prestige, inventory, plots, merchant, events
- Field editor for all major state fields
- Raw JSON editor with format/copy/write
- Auto-refresh every 5 seconds

## Key constants

| Constant | Value | Notes |
|----------|-------|-------|
| `SECS_PER_DAY` | 3.3 | Real seconds per game day (1 game year ≈ 20 min) |
| `SECS_PER_DAY` (speed boost) | 0.33 | 10× faster during active boost |
| `COMPOST_MAX_CHARGES` | 5 | |
| `COMPOST_CHARGE_SECS` | 240 | 4 minutes per charge |
| `WATERING_CAN_CHARGE_SECS` | 120 | 2 minutes |
| `MISHAP_INSURANCE_COST` | 50 | Coins |
| `MISHAP_INSURANCE_SECS` | 1800 | 30 minutes |
| `EVENT_MIN_GAP` | 120000 | 2 min |
| `EVENT_MAX_GAP` | 300000 | 5 min |
| `MERCHANT_DURATION` | 180000 | 3 min |
| `MERCHANT_MIN_GAP` | 600000 | 10 min |
| `MERCHANT_MAX_GAP` | 900000 | 15 min |
| `PRESTIGE_MILESTONES` | [1,5,10,20,30,40,50] | Visual flourish tiers |

## State fields (G object)

### Core
`coins`, `totalXP`, `level`, `prestige`, `personalBestScore`, `farmName`, `farmerName`, `inventory`

### Plots (array of 20)
`idx`, `unlocked`, `harvestedCount`, `cropId`, `plantedAt`, `ready`, `fertilised`, `seeding`, `seedingStartedAt`, `seedingDuration`, `seedReady`, `heritage`

### Tracking
`cropHarvests`, `totalHarvestCount`, `totalCoinsEarned`, `achievementsEarned`

### Events & merchant
`lastEventTime`, `merchantActive`, `merchantDeal`, `merchantExpiry`, `_merchantDealsAccepted`, `_eventsEncountered`, `_eventsFixed`, `_sunBonusCount`, `_beeBoostCount`

### Utilities
`wateringCanLastUsed`, `compostCharges`, `compostLastCharged`, `fertiliseMode`

### Exotic seeds
`seedsCollectedTotal`, `exoticMishapsTotal`, `_exoticMishapsFix`, `_exoticNearMisses`, `_heritageCollected`

### Marketplace
`standListings`, `standEnabled`, `standUnlocked`, `standMaxSlots`

### Boosts & insurance
`_mishapInsuranceExpiry` — timestamp when insurance expires
`_speedBoostExpiry` — timestamp when speed boost expires

### Wallet
`walletConnected`, `walletAddress`

## Module wiring pattern

`js/main.js` imports all module functions and assigns them to `window.*` for inline `onclick` handlers. Some functions are prefixed with `_` for internal use by other modules (e.g., `window._cropArt`, `window._restartTick`).

## Testing

- `tests/save_load.test.js` — roundtrip save/load, corrupted data recovery, personal best defaults
- `tests/marketplace_merchant.test.js` — merchant deal execution, BSV purchase flow
- Run: `node --experimental-vm-modules tests/*.test.js`
- Note: marketplace test fails in Node due to esm.sh imports (browser-only)

## Possible improvements

- Polish marketplace / vege stand UX
- Add more achievements or seasonal content
- Add visual indicator on plots when speed boost is active
- Add sound effects for events, harvests, achievements
- Improve mobile responsiveness for smaller screens
- Add export/import save functionality
