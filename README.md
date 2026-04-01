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
- `index_original.html` — legacy single-file version preserved for reference

No frameworks and no build step required. Run locally by opening `index.html` in a browser or serving the folder with a static server such as:

```bash
python3 -m http.server 8000
```

## Built on

[Metanet.page](https://metanet.page) — BSV blockchain platform

## License

Personal project — all rights reserved.
