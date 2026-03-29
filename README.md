# 🌾 Plot Twist

A browser-based idle farming game with a twist.

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
- Crop Journal with 118 achievements
- BSV (Bitcoin SV) wallet integration via Metanet.page

## Technology

Modern vanilla web stack with a modular file structure:
- `index.html` for the page shell
- `styles.css` for styles
- `js/` modules for game logic, rendering, marketplace, state, and utilities

No frameworks and no build step required. Run locally by opening `index.html` in a browser or serving the folder with a static server such as:

```bash
python3 -m http.server 8000
```

## Built on

[Metanet.page](https://metanet.page) — BSV blockchain platform

## License

Personal project — all rights reserved.
