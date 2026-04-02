+:---------------------------------------------------------------------:+
| **🌾 Plot Twist**                                                     |
|                                                                       |
| **Game Design Document --- Version 7.0**                              |
|                                                                       |
| *Includes: Leaderboard (Supabase), Score Sharing, Dev Tool, modular
| JavaScript architecture*                                               |
+-----------------------------------------------------------------------+

**1. Game Overview**

A browser-based idle farming game rebuilt as a modular vanilla JavaScript app.
Separate ES modules handle state, game logic, rendering, wallet integration,
and leaderboard features. localStorage persistence remains in place.

**Core Game Loop**

- Start with 2 coins and 1 plot

- Buy seeds (1--10 at a time) from the Seed Shop --- they go into Seed
  Storage

- Select a seed from Storage, tap an empty plot to plant it

- Wait for the crop to grow; harvest to earn coins and XP

- Use the Watering Can (passive 2-min charge) to cut grow time by 10%

- Apply Compost (passive 4-min/charge, max 5) to a plot for +25% sell
  value

- Unlock new plots and level up to access better crops

- Prestige at Level 10 for a permanent sell bonus (up to 50 prestiges)

- Random events and the Wandering Merchant appear periodically while
  waiting

- Reach 40 Merchant deals to unlock rare ✨ Exotic seed offers

- Exotic crops can be let go to seed instead of harvested --- a gamble
  for new seeds

- Track lifetime progress and earn badges in the Crop Journal

- Share your Farm Score to the 🏆 leaderboard --- see how you rank
  against other farmers

**Technology**

- **Modular vanilla JS ---** `index.html` is the main entrypoint and loads
  separate ES modules from `js/` (`main.js`, `game-state.js`, `game.js`,
  `rendering.js`, etc.). No build step; open in any browser that supports
  ES modules.

- **Speed control ---** const SECS_PER_DAY = 3.3 at top of \<script\>.
  Change to 0.1--1.0 for fast testing.

- **Save key ---** localStorage key: \'idle_farm_v1\'

- **BSV ---** Metanet.page iframe SDK wired. BSV address:
  1LMaShk9VaQSWrsEYUukuoWMEVAJckrxCM

- **Leaderboard ---** Supabase (hosted Postgres). Client initialised
  from LB_CONFIG in the game script.

**2. Game Economy**

**Standard Crops (all 20)**

All 20 crop timers derive from: gameSecs = Math.round(days ×
SECS_PER_DAY). SECS_PER_DAY = 3.3 (design) \| 1.0 (fast test) \| 0.1
(ultra-fast).

  -------------------------------------------------------------------------------------
  **Crop**      **Days**   **Speed**   **Seed   **Sell   **Profit**   **Game   **XP**
                                       🪙**     🪙**                  Time**   
  ------------- ---------- ----------- -------- -------- ------------ -------- --------
  Radish        27         Fast        2        8        6            89s      5

  Lettuce       52         Fast        3        14       11           2m 52s   8

  Spinach       45         Fast        4        18       14           2m 29s   7

  Zucchini      57         Fast        3        14       11           3m 08s   8

  Beans         57         Fast        5        20       15           3m 08s   9

  Peas          65         Fast        6        22       16           3m 35s   10

  Cucumber      60         Fast        4        16       12           3m 18s   8

  Beetroot      70         Medium      5        22       17           3m 51s   12

  Carrot        75         Medium      4        18       14           4m 08s   11

  Cabbage       100        Medium      5        20       15           5m 30s   14

  Tomato        80         Medium      8        35       27           4m 24s   15

  Corn          85         Medium      6        25       19           4m 41s   16

  Broccoli      90         Medium      7        28       21           4m 57s   18

  Capsicum      80         Medium      10       42       32           4m 24s   16

  Cauliflower   100        Medium      8        30       22           5m 30s   16

  Sunflower     100        Medium      12       50       38           5m 30s   20

  Onion         110        Slow        6        28       22           6m 03s   20

  Potato        105        Slow        7        28       21           5m 47s   20

  Pumpkin       105        Slow        8        32       24           5m 47s   22

  Garlic        150        Slow        20       90       70           8m 15s   35
  -------------------------------------------------------------------------------------

**✨ Exotic Crops**

Exotic crops are not sold in the regular Seed Shop. They are obtained
exclusively via the Wandering Merchant after 40 accepted deals (30%
chance per visit once eligible). They cannot be re-purchased --- their
only renewal path is seed-saving.

+-----------------------------------------------------------------------+
| **Key Design Note**                                                   |
|                                                                       |
| Exotic crops are non-proprietary seeds. When harvested, the seed is   |
| consumed like normal --- but the farmer may instead choose to \"Let   |
| Go to Seed\", entering a seed-saving phase to produce 1--3 new seeds  |
| (see Section 9).                                                      |
+-----------------------------------------------------------------------+

  ------------------------------------------------------------------------------------------------------
  **Crop**      **Days**   **Speed**   **Seed   **Sell   **Profit**   **Profit/Day**   **Game   **XP**
                                       🪙**     🪙**                                   Time**   
  ------------- ---------- ----------- -------- -------- ------------ ---------------- -------- --------
  **Dragon      200        Exotic      60       190      130          0.65             11m 00s  48
  Fruit**                                                                                       

  **Saffron**   240        Exotic      85       250      165          0.69             13m 12s  60

  **Vanilla**   280        Exotic      115      340      225          0.80             15m 24s  75

  **Truffle**   330        Exotic      180      510      330          1.00             18m 09s  95
  ------------------------------------------------------------------------------------------------------

For comparison, Garlic (the best standard crop) has a profit/day of
0.47. Truffle reaches exactly 1.00 --- more than double.

**Exotic Inventory Keys**

- **G.inventory\[\"truffle\"\]** = 2 → standard exotic seeds

- **G.inventory\[\"truffle_heritage\"\]** = 1 → heritage variant (+20%
  sell value when grown)

**3. XP & Level System**

  ------------------------------------------------------------------------------
  **Lv**   **Title**    **XP      **XP      **Unlocks**
                        Min**     Max**     
  -------- ------------ --------- --------- ------------------------------------
  1        Seedling     0         150       Radish, Lettuce, Spinach, Zucchini

  2        Sprout       151       500       Beans, Peas, Cucumber

  3        Grower       501       1,000     Beetroot, Carrot, Cabbage

  4        Farmer       1,001     2,000     Tomato, Corn, Broccoli

  5        Cultivator   2,001     3,500     Capsicum, Cauliflower

  6        Harvester    3,501     5,500     Sunflower, Onion, Potato

  7        Keeper       5,501     8,000     Pumpkin

  8        Orchardist   8,001     11,500    Garlic

  9        Elder        11,501    16,000    ---

  10       Master       16,001    Max       Prestige button enabled
  ------------------------------------------------------------------------------

*Farm Score = (Level² × 300) + (Coins × 1) + (XP × 0.5)*

*earnedCoins = applyEventModifiers(floor(sellPrice × fertMult ×
prestigeMult × heritageMult))*

*fertMult = 1.25 if fertilised \| heritageMult = 1.20 if heritage seed
was planted*

**4. Plots & Land Expansion**

  ---------------------------------------------------------------
  **Plot**   **Cost   **Stage**   **Plot**   **Cost   **Stage**
             🪙**                            🪙**     
  ---------- -------- ----------- ---------- -------- -----------
  1          Free     Early       11         1,050    Mid

  2          25       Early       12         1,350    Mid

  3          55       Early       13         1,700    Late

  4          100      Early       14         2,100    Late

  5          160      Early       15         2,600    Late

  6          240      Mid         16         3,200    Late

  7          340      Mid         17         3,900    Endgame

  8          460      Mid         18         4,700    Endgame

  9          620      Mid         19         5,700    Endgame

  10         820      Mid         20         6,800    Endgame
  ---------------------------------------------------------------

- Each locked plot shows two unlock buttons side-by-side: coin price and
  BSV equivalent

- Prerequisite: previous plot must have been harvested at least once

**5. Seed Shop & Seed Storage**

**Buying Seeds**

- Tap a crop card in the sidebar to expand an inline qty picker (1--10
  seeds)

- − / + stepper; caps at what you can currently afford

- Two buy buttons: green \[Buy\] for coins, gold \[₿ X.XXXXX BSV\] for
  BSV payment

- BSV button is disabled if wallet is not connected

- Coins: deducted immediately, seeds go to Seed Storage

- BSV: payment sent via Metanet pay command; seeds only granted after
  pay-response success: true

**Shop Layout**

- 2-column grid layout --- crops shown side-by-side to reduce shop
  height

- Level dividers span both columns as full-width section headers

- Expanded (qty picker open) card spans both columns for readability

- ✨ Exotic Seeds section appears below Garlic, hidden until first
  exotic seed acquired. Display-only cards in a 2×2 grid --- no buy
  button.

**Seed Storage**

- Tile per crop type held, with count badge

- Exotic seeds show a gold ✨ badge and jewel-toned glow on their tile

- Heritage seeds (cropId_heritage) show a gold ✨H badge with a stronger
  gold shimmer

- Tap a tile to select it for planting (green glow); tap again to
  deselect

- Selection stays active across multiple plots while seeds remain

**6. Watering Can**

  -----------------------------------------------------------------------
  **Property**          **Value**
  --------------------- -------------------------------------------------
  Charge time           2 minutes (120 seconds) from last use to full

  Effect                −10% of remaining grow time on all currently
                        growing plots

  Capacity              1 use --- must fully recharge before next use

  Starts                Full on new game (first use is free)

  State field           G.wateringCanLastUsed --- ms timestamp; 0 =
                        starts full
  -----------------------------------------------------------------------

**7. Compost Pile (Plot Fertilising)**

  -----------------------------------------------------------------------
  **Property**          **Value**
  --------------------- -------------------------------------------------
  Max charges           5

  Charge rate           1 charge per 4 minutes (240 seconds), passive

  Effect                +25% sell value on the next harvest from that
                        plot only

  Starts                5 charges on new game / after prestige
  -----------------------------------------------------------------------

**How to Use**

- Click the compost pile bin to enter Fertilise Mode

- All eligible plots (unlocked, not already fertilised, not ready to
  harvest) pulse green

- Tap any highlighted plot to apply one charge --- the 🌿 +25% badge
  appears on the plot

- Press Escape or click the bin again to cancel without using a charge

+-----------------------------------------------------------------------+
| **🐛 Bug Fixed (v5)**                                                 |
|                                                                       |
| compostCharges was not clamped on load in v4, allowing values above   |
| 5. Fixed by clamping on loadGame(): G.compostCharges =                |
| Math.min(saved.compostCharges ?? 5, 5). applyFertiliser() also uses   |
| Math.max(0, charges - 1) to prevent going below zero.                 |
+-----------------------------------------------------------------------+

**8. BSV Wallet Integration**

BSV Address: 1LMaShk9VaQSWrsEYUukuoWMEVAJckrxCM

*Conversion rate: 1 coin = 0.00001 BSV = 1,000 satoshis*

  ------------------------------------------------------------------------
  **Action**               **Coin Cost**           **BSV Equivalent**
  ------------------------ ----------------------- -----------------------
  Buy seeds (qty ×         qty × seedCost coins    qty × seedCost ×
  seedCost)                                        0.00001 BSV

  Unlock plot N            PLOT_COSTS\[N\] coins   PLOT_COSTS\[N\] ×
                                                   0.00001 BSV
  ------------------------------------------------------------------------

**9. Exotic Seed-Saving Mechanism**

  -----------------------------------------------------------------------
  **Option**       **Effect**
  ---------------- ------------------------------------------------------
  🌾 Harvest Now   Collect sell value immediately. Seed is consumed. Coin
                   harvest applies prestige, fertiliser, and heritage
                   multipliers.

  🌱 Let Go to     Forfeit the coin harvest. Plot enters seed-saving mode
  Seed             for \~45% of the original grow time. At the end,
                   collect 1--3 seeds.
  -----------------------------------------------------------------------

**Seed Maturation Phase**

  ------------------------------------------------------------------------
  **Crop**           **Grow Time**     **Seed Phase      **Total**
                                       (45%)**           
  ------------------ ----------------- ----------------- -----------------
  Dragon Fruit       11m 00s           \~5m 00s          \~16m 00s

  Saffron            13m 12s           \~5m 57s          \~19m 09s

  Vanilla            15m 24s           \~6m 57s          \~22m 21s

  Truffle            18m 09s           \~8m 10s          \~26m 19s
  ------------------------------------------------------------------------

**Plot Visual States During Seeding**

  -----------------------------------------------------------------------------
  **Phase**    **Elapsed**   **Visual**               **Footer Text**
  ------------ ------------- ------------------------ -------------------------
  Grace window \<50%         Purple progress ring,    \"Going to seed... \[time
                             greyed crop art, 🌱      remaining\]\"
                             Seeding... label         

  At risk      50--99%       Amber/orange ring, ⚠️    \"Seeding ⚠️ \[time
                             badge, \"At risk\" label remaining\]\"

  Seeds ready  100%          Gold pulsing ring, 🌱    \"🌱 Tap to collect
                             icon, gold glow          seeds\"
  -----------------------------------------------------------------------------

**Seed Yield & Heritage**

  ------------------------------------------------------------------------
  **Outcome**                    **Probability**      **Seeds**
  ------------------------------ -------------------- --------------------
  1 seed                         45%                  1

  2 seeds                        45%                  2

  Bumper crop (3 seeds)          10%                  3
  ------------------------------------------------------------------------

Heritage seeds: 10% chance on collection. Stored under cropId_heritage
key. Grant +20% sell value when grown. 10% chance of producing Heritage
offspring when seed-saved.

**Farm-Wide Mishap System**

  -----------------------------------------------------------------------------
  **Mishap Event**       **Icon**   **On Ignore: Outcome Distribution**
  ---------------------- ---------- -------------------------------------------
  Seed Weevil            🐛         5% total loss \| 20% partial loss \| 75%
  Infestation                       near miss

  Late Frost Warning     ❄️         5% total loss \| 20% partial loss \| 75%
                                    near miss

  Crow Raid on Seed      🦅         5% total loss \| 20% partial loss \| 75%
  Heads                             near miss

  Fungal Spore Drift     🍄         5% total loss \| 20% partial loss \| 75%
                                    near miss

  Strange Wind (Near     💨         Always near miss --- no loss possible. Free
  Miss)                             acknowledgement.
  -----------------------------------------------------------------------------

Fix cost: Math.max(10, atRiskCount × 8) coins. The 50% elapsed cutoff
determines which plots are at risk --- plots in the first half of their
seed phase are immune. Partial loss always destroys the single oldest
at-risk plot.

**10. Prestige System**

- Available at Level 10; max 50 prestiges

- Resets: coins → 2, XP → 0, level → 1, all plots locked (except plot
  1), inventory cleared, compostCharges → 5

- Keeps: farm name, farmer name, lifetime journal stats, achievements,
  exotic seed-saving counters

- Bonus: each harvest earns × (1 + prestige × 0.10) --- Prestige 10 =
  ×2.0, Prestige 50 = ×6.0

**11. Random Events**

Fire every 2--5 minutes. Modal requires player decision. Will not
overlap with merchant or each other.

**Standard Events (6)**

  ------------------------------------------------------------------------
  **Event**        **Trigger**   **Fix Cost**  **Ignore Result**
  ---------------- ------------- ------------- ---------------------------
  🐛 Aphid         Crops growing Lv×2 coins    −20% on next harvest
  Outbreak                       (min 2)       

  🌧️ Surprise Rain Crops growing Free (auto)   All growing crops +15%
                                               speed

  🐦 Crow Raid     Seeds in      Lv×1.5 (min   \~30% of a seed type stolen
                   storage       3)            

  ☀️ Bumper Sun    Crops growing Free (auto)   Next harvest +25%
  Day                                          

  🐇 Rabbit        Crops growing Lv coins (min One crop +30s delay
                                 2)            

  🐝 Wild Bee      Crops growing Free (auto)   All growing crops +20%
  Swarm                                        speed
  ------------------------------------------------------------------------

**✨ Exotic Mishap Events (5)**

Only trigger when at least one seeding plot has elapsed \> 50% of its
seed phase.

  ------------------------------------------------------------------------------
  **Event**           **Icon**   **Fix Cost**  **On Ignore**
  ------------------- ---------- ------------- ---------------------------------
  Seed Weevil         🐛         atRisk×8 (min 5% total / 20% partial / 75% near
  Infestation                    10)           miss

  Late Frost Warning  ❄️         atRisk×8 (min 5% total / 20% partial / 75% near
                                 10)           miss

  Crow Raid on Seed   🦅         atRisk×8 (min 5% total / 20% partial / 75% near
  Heads                          10)           miss

  Fungal Spore Drift  🍄         atRisk×8 (min 5% total / 20% partial / 75% near
                                 10)           miss

  Strange Wind (Near  💨         Free (auto)   Always near miss --- no loss
  Miss)                                        
  ------------------------------------------------------------------------------

**12. Wandering Merchant**

Appears every 10--15 minutes as a slide-up banner. 3-minute window with
countdown.

  -----------------------------------------------------------------------
  **Deal**      **What It Offers**                **Availability**
  ------------- --------------------------------- -----------------------
  🛒 Seed       3--5 seeds of a random unlocked   Always
  Discount      crop at 20--40% off               

  🍀 Lucky      Pay a smaller coin amount;        Always
  Charm         receive a larger amount back      

  📚 Ancient    Pay coins for an immediate XP     Always
  Almanac       grant                             

  🧪 Growth     Pay coins; all growing crops      Requires growing crops
  Tonic         −15--25% remaining time           

  ✨ Exotic     1--2 seeds of a random exotic     ≥40 deals accepted AND
  Seed          crop at full shop price           30% roll
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **🐛 Bug Fixed (v5)**                                                 |
|                                                                       |
| \_merchantDealsAccepted, \_eventsEncountered, \_eventsFixed,          |
| \_sunBonusCount, and \_beeBoostCount were not saved to localStorage   |
| in v4. Fixed in v5 --- all five counters now persist correctly.       |
+-----------------------------------------------------------------------+

**13. Layout & Metanet Integration**

- Main game area: max-width 980px, margin 0 auto

- padding-top: 70px on #game --- Metanet nav overlays the top 70px of
  the iframe

- body::before pseudo-element fills the 70px strip with matching
  background colour

- logo.jpeg + cover.jpeg required by Metanet.page for the app card
  thumbnail and cover

- confirm() / alert() / prompt() are BLOCKED by Metanet sandbox --- use
  notify() toasts instead

**14. Crop Journal & Achievements**

**Structure**

- 96 per-crop achievements (24 crops × 4 milestones) --- includes 4
  exotic crops

- 24 Farm tab achievements across 7 groups

- 26 Events tab achievements across 5 groups

- 146 total. Lifetime stats survive prestige resets.

**Journal Tabs (4)**

  -----------------------------------------------------------------------------
  **Tab**         **Contents**
  --------------- -------------------------------------------------------------
  Crops           One row per crop (standard + exotic) --- harvest counts and
                  milestone badges

  Farm            Harvest milestones, coins earned, plots, levels, diversity,
                  specialist, prestige

  Events          Random events, Wandering Merchant, Weather Blessings, ✨
                  Exotic Farming

  🏆              Live top-10 leaderboard + personal score card + Share Score
  (Leaderboard)   button
  -----------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Design Note: Old Friends Achievement**                              |
|                                                                       |
| Old Friends (40 deals) is the key milestone --- its description hints |
| at rare exotic seed offers, creating a discoverable long-term goal    |
| for dedicated players.                                                |
+-----------------------------------------------------------------------+

**15. Leaderboard**

A live top-10 Farm Score leaderboard backed by Supabase (hosted
Postgres). No custom server required --- the Supabase JS client runs
directly in the browser via the public anon key.

**Architecture**

  -----------------------------------------------------------------------
  **Component**         **Detail**
  --------------------- -------------------------------------------------
  Database              Supabase hosted Postgres --- free tier

  Client library        \@supabase/supabase-js v2 loaded from CDN
                        (jsdelivr)

  Table                 lb_users --- one row per wallet address (personal
                        best score)

  Project URL           https://hhisdlawemzihzbxmwkc.supabase.co

  Config constant       LB_CONFIG in the game script --- baked in, no
                        placeholder
  -----------------------------------------------------------------------

**Database Schema**

One table only. One row per player, keyed by wallet address. Score is
always the most recently shared value (not all-time peak).

+-----------------------------------------------------------------------+
| **SQL --- Run once in Supabase SQL Editor**                           |
|                                                                       |
| create table lb_users (                                               |
|                                                                       |
| address text primary key,                                             |
|                                                                       |
| farmer_name text not null default \'Farmer\',                         |
|                                                                       |
| farm_name text not null default \'My Farm\',                          |
|                                                                       |
| score integer not null default 0,                                     |
|                                                                       |
| prestige integer not null default 0,                                  |
|                                                                       |
| level integer not null default 1,                                     |
|                                                                       |
| level_title text not null default \'Seedling\',                       |
|                                                                       |
| updated_at timestamptz not null default now()                         |
|                                                                       |
| );                                                                    |
|                                                                       |
| alter table lb_users enable row level security;                       |
|                                                                       |
| create policy \"Public read\" on lb_users for select using (true);    |
|                                                                       |
| create policy \"Player insert\" on lb_users for insert with check     |
| (true);                                                               |
|                                                                       |
| create policy \"Player update\" on lb_users for update using (true);  |
|                                                                       |
| create index lb_users_score_idx on lb_users (score desc);             |
+-----------------------------------------------------------------------+

**Share Score Flow**

- A 🏆 Share Score button appears in the farm heading whenever a wallet
  is connected

- Tapping it calls lbShareScore() which immediately upserts the score to
  Supabase

- After writing to the database, create-post fires with a generated
  600×400 score card image

- The player may edit, post, or cancel the Metanet post --- the
  leaderboard entry is already recorded either way

- This matches the behaviour observed in other Metanet.page games
  (GameVault pattern)

+-----------------------------------------------------------------------+
| **Important: Post vs Leaderboard**                                    |
|                                                                       |
| The score is written to Supabase before create-post is sent.          |
| Cancelling the Metanet post editor does not undo the leaderboard      |
| entry. This is intentional --- the leaderboard reflects               |
| participation, not social posting.                                    |
+-----------------------------------------------------------------------+

**Score Card Image**

lbGenerateScoreCard() draws a 600×400 JPEG to an offscreen canvas and
returns a previewAsset object for create-post. Contents: game title,
farm name, score (large), farmer name, level title, prestige count,
footer branding.

**Leaderboard Tab (🏆)**

- Accessible via the 🏆 tab in the Crop Journal --- tap Journal then tap
  🏆

- Any player can view the leaderboard --- wallet connection is not
  required to read it

- Results are cached for 60 seconds (LB_CACHE_TTL) to avoid repeat
  fetches

- The current player\'s row is highlighted gold if they appear in the
  top 10

- If the player is connected but not in the top 10, a note shows their
  current score vs the board

- If Supabase is unreachable, a friendly error message is shown ---
  leaderboard failure never affects gameplay

**Key Leaderboard Functions**

  --------------------------------------------------------------------------
  **Function**             **Purpose**
  ------------------------ -------------------------------------------------
  lbClient()               Lazy-initialises the Supabase JS client from
                           LB_CONFIG. Returns null if config missing or SDK
                           not loaded.

  lbSubmitScore()          Upserts current player score to lb_users. Called
                           from lbShareScore(). Returns bool.

  lbFetchTop10()           Fetches top 10 rows ordered by score desc.
                           60-second in-memory cache.

  lbShareScore()           Main handler: writes score, fires create-post
                           with score card. Called from the Share Score
                           button.

  lbGenerateScoreCard()    Draws score card to canvas, returns { type, file,
                           preview } previewAsset object.

  renderLeaderboardTab()   Renders the 🏆 journal tab --- personal score
                           card + top-10 list. Async.

  lbUpdateShareBtn()       Shows/hides the Share Score button based on
                           G.walletConnected. Called from renderAll().

  timeSince(date)          Formats a Date as \"2h ago\" style relative time
                           for leaderboard row timestamps.
  --------------------------------------------------------------------------

**16. Coding Notes**

**State Object (G) --- Key Fields**

  ------------------------------------------------------------------------
  **Field**                 **Purpose**
  ------------------------- ----------------------------------------------
  coins, totalXP, level,    Core stats --- reset on prestige (except
  prestige                  prestige)

  farmName, farmerName      Editable strings (max 15 chars); survive
                            prestige

  selectedCrop              cropId (or cropId_heritage) selected from
                            storage; null if none

  inventory                 { cropId: count, cropId_heritage: count } ---
                            clears on prestige

  plots\[\]                 Array of 20 plot objects --- see per-plot
                            fields below

  walletConnected,          BSV wallet state; persisted
  walletAddress             

  wateringCanLastUsed       ms timestamp; 0 = starts full

  compostCharges            0--5 current compost charges. Clamped to max
                            on load.

  compostLastCharged        ms timestamp of last charge tick

  fertiliseMode             bool; session-only, resets to false on load

  cropHarvests,             Lifetime totals, survive prestige
  totalHarvestCount,        
  totalCoinsEarned          

  achievementsEarned        Array of earned achievement ids, survives
                            prestige

  merchantDeal              typeId + raw numeric params for reload
                            reconstruction

  \_merchantDealsAccepted   Lifetime merchant deals accepted --- persisted
                            (v5 fix)

  \_eventsEncountered,      Lifetime event counters --- persisted (v5 fix)
  \_eventsFixed             

  seedsCollectedTotal       Lifetime seed-saving collections --- survives
                            prestige

  exoticMishapsTotal        Lifetime plots lost to mishaps --- survives
                            prestige

  \_exoticMishapsFix        Mishap fix payments --- for Vigilant Farmer
                            achievement

  \_exoticNearMisses        Near-miss mishap count --- for Lucky Escape
                            achievement

  \_heritageCollected       Heritage seeds ever collected --- for Golden
                            Lineage achievement
  ------------------------------------------------------------------------

**Per-Plot Fields**

  -----------------------------------------------------------------------------
  **Field**          **Type**       **Purpose**
  ------------------ -------------- -------------------------------------------
  cropId             string\|null   Planted crop base ID (never includes
                                    \_heritage suffix)

  plantedAt          number\|null   ms timestamp of planting

  ready              bool           True when grow phase complete --- shows
                                    harvest fork for exotic

  fertilised         bool           True when compost applied --- cleared after
                                    harvest

  heritage           bool           True if planted from a \_heritage seed ---
                                    grants ×1.20 sell bonus

  seeding            bool           True when exotic plot is in seed-saving
                                    mode

  seedingStartedAt   number\|null   ms timestamp when seed phase began

  seedingDuration    number\|null   Total ms duration of seed phase (45% of
                                    gameSecs × 1000)

  seedReady          bool           True when seed phase complete --- tap to
                                    collect
  -----------------------------------------------------------------------------

**Key Function Relationships**

tick() → tickCompost() → (auto-grants charge, notifies when full)

tick() → tickSeedSaving() → (marks seedReady, notifies when phase
complete)

tick() → checkRandomEvent() → showEventModal() → resolveEvent()

tick() → checkMerchant() → spawnMerchant() → acceptMerchantDeal()

harvestCrop() → applyEventModifiers(floor(sellPrice × prestigeMult ×
fertMult × heritageMult))

renderAll() → renderStats / Heading / Plots / Storage / Shop /
WateringCan / Compost / lbUpdateShareBtn

lbShareScore() → lbSubmitScore() \[Supabase upsert\] → create-post
\[Metanet feed\]

**17. Future Ideas (not yet built)**

  -----------------------------------------------------------------------
  **Feature**        **Description**
  ------------------ ----------------------------------------------------
  Vege Stand         Player-to-player seed marketplace using Metanet
  Marketplace        posts as discovery. Full design in
                     plot_twist_marketplace_design_v1.docx. Seed packets
                     (bundles of 3+ exotic seeds) would be a premium
                     product.

  Seasonal Windows   Some crops only plantable in certain months (new
                     Date().getMonth())

  Weather System     Persistent states (sunny/cloudy/rainy) affecting
                     growth speed

  Cooperative        Share a plot or storage with a friend via BSV wallet
  Farming            address

  Prestige Cosmetics Unlock visual themes / plot appearances at Prestige
                     5, 10, 25

  Plot Fertilising   Allow BSV payment for compost charges (instant
  BSV                top-up)

  Mishap Insurance   Spend coins to protect seeding plots from mishap
                     loss for a period

  Heritage Lineage   Journal entry showing full heritage seed family tree
  Tracker            for a crop

  All-Time Peak      Currently leaderboard stores last shared score.
  Score              Option to track personal best separately.

  Leaderboard        Notify the player when they are knocked off the top
  Notifications      10
  -----------------------------------------------------------------------

**18. Developer Handoff Notes**

**Current State Summary (v7.0)**

- Fully working modular vanilla JavaScript idle farming game

- All 20 standard crops + 4 exotic crops (Dragon Fruit, Saffron,
  Vanilla, Truffle) with SVG art

- Seed Shop: 2-column layout, dual coin/BSV buy buttons, hidden ✨
  Exotic section

- BSV wallet: connect/disconnect, seed purchases, plot unlocks --- all
  wired end-to-end

- Watering Can: 2-min passive charge, −10% grow time on all growing
  crops

- Compost Pile: 5 charges at 4 min/charge, +25% sell value per plot (pip
  bug fixed v5)

- Random events (6 standard + 5 exotic mishap types), Wandering Merchant
  (5 deal types inc. exotic seeds, all reload-safe)

- Exotic seed-saving: harvest fork, seed phase with grace window, 1--3
  yield, 10% heritage, farm-wide mishap events

- Crop Journal: 146 achievements, lifetime stats survive prestige,
  exotic crop section hidden until discovered

- 🏆 Leaderboard: Supabase-backed top-10 Farm Score board, Share Score
  button, score card via create-post

- Metanet.page layout: 980px centred, 70px nav padding, no
  confirm/alert/prompt

**Architecture Reminders**

- JS is split across multiple ES modules in `js/`. `index.html` loads
  `main.js` as the entrypoint and exposes window-facing handlers for the
  HTML UI.

- G is the global game state object. Always call saveGame() after
  mutating G.

- saveGame()/loadGame() now verify browser storage availability and
  recover safely from corrupted save data before falling back to defaults.

- Wallet integration validates Metanet SDK APIs before sending a
  connection request and registers the platform event listener only once.

- CROP_MAP contains both CROPS and EXOTIC_CROPS. Inventory keys for
  heritage seeds end in \_heritage.

- renderAll() calls all render functions including lbUpdateShareBtn()
  --- shows/hides the Share Score button.

- renderPlotsOnly() is cheap per-second timer update --- never use it to
  change plot state.

- buildAllAchievements() must be called once in init() before
  checkAchievements().

- tickCompost() and tickSeedSaving() are both called each second from
  tick().

- Leaderboard calls are all async and wrapped in try/catch --- failure
  is always silent to the player.

- LB_CONFIG is baked in with the real Supabase URL and anon key. Do not
  commit placeholder values.

**Known Gotchas**

- confirm/alert/prompt blocked in Metanet sandbox --- use notify()
  toasts instead.

- Merchant execute() cannot be serialised. Save typeId + params;
  reconstruct on load via restoreMerchantIfActive() --- exotic_seed case
  is included.

- fertiliseMode is session-only (not saved). Resets to false on load.

- SECS_PER_DAY = 3.3 is production. Always reset before committing after
  testing.

- Heritage seeds use cropId_heritage as both inventory key AND the
  selectedCrop value. tryPlant() detects this and strips the suffix to
  get the base cropId for the plot.

- Supabase free tier pauses after 1 week of inactivity. First
  leaderboard fetch after a pause may take a few seconds while the
  database wakes up. This is expected behaviour on the free tier.

- The Supabase RLS update policy uses \"using (true)\" --- any wallet
  can overwrite any row. Acceptable for a casual leaderboard; do not
  store sensitive data in lb_users.

**Quick Test Checklist**

- Set SECS_PER_DAY = 0.1, open in Chrome

- Buy seeds (coins) → plant → grow → harvest

- Connect wallet → BSV buttons activate → Share Score button appears →
  tap → confirm score card post opens → cancel post → check Supabase
  dashboard shows the row

- Open Journal → tap 🏆 tab → confirm top-10 renders, own row
  highlighted gold

- Use compost → confirm pip count matches charges → use all 5 → confirm
  0 pips → recharges correctly

- Wait 2 min → water can ready → use → confirm crop time reduced

- Reach 40 merchant deals → wait for exotic seed offer → buy → confirm
  ✨ tile in storage

- Plant exotic seed → grow → tap → confirm harvest fork modal appears

- Choose \"Let Go to Seed\" → confirm plot shows purple ring → wait to
  50% → confirm ⚠️ badge → wait to 100% → tap → confirm seed collection
  overlay → collect → confirm seeds in storage

- Wait for mishap event with seeding plot past 50% → Test fix → Test
  ignore

- Plant heritage seed → harvest → confirm +20% sell value in notify
  toast

- Reach Level 10 → prestige → confirm stats reset, journal data
  survives, exotic counters survive

- Set SECS_PER_DAY back to 3.3 before committing

**File Delivery Checklist**

- index.html --- main entrypoint for the modular game (no bundler or
  external dependencies)

- farming_game_design_v6.docx --- this document

- seed_saving_design_v1.docx --- exotic seed-saving feature design
  (companion doc)

- plot_twist_marketplace_design_v1.docx --- Vege Stand marketplace
  design (companion doc)

- plot_twist_dev_tool.html --- localStorage dev tool for testing (same
  folder as index.html)

- logo.jpeg + cover.jpeg --- required by Metanet.page before deployment

*Plot Twist --- Game Design Document v7.0*
