// ============================================================
// CORE GAME MECHANICS
// ============================================================

import { CROPS, CROP_MAP, PLOT_COSTS, LEVELS, SEED_PHASE_RATIO } from './constants.js';
import { G, saveGame } from './game-state.js';
import { getLevelData, prestigeMultiplier, canUnlockPlot, formatTime } from './utils.js';

// ============================================================
// BSV PRICE HELPERS
// 1 coin = 0.00001 BSV = 1,000 satoshis
// ============================================================
export function coinsToSatoshis(coins) { return coins * 1000; }
export function formatBSV(coins) {
  const bsv = coins * 0.00001;
  // Show up to 5 decimal places, trimming trailing zeros
  return bsv.toFixed(5).replace(/\.?0+$/, '') + ' BSV';
}

// SHOP: toggle the qty picker for a crop card
export function toggleShopCard(cropId) {
  const crop = CROP_MAP[cropId];
  if (!crop) return;
  if (!isCropUnlocked(cropId)) {
    notify('🔒 Reach Level ' + crop.unlockLevel + ' to grow ' + crop.name + '!', 'error');
    return;
  }
  G.shopExpanded = (G.shopExpanded === cropId) ? null : cropId;
  renderShop();
}

// SHOP: stepper +/- buttons inside qty picker
export function shopChangeQty(cropId, delta) {
  const el = document.getElementById('qty-val-' + cropId);
  if (!el) return;
  const crop = CROP_MAP[cropId];
  let val = parseInt(el.textContent) + delta;
  const maxAffordable = Math.max(1, Math.floor(G.coins / crop.seedCost));
  val = Math.max(1, Math.min(10, Math.min(val, maxAffordable)));
  el.textContent = val;
  const totalCoins = crop.seedCost * val;
  const totalEl = document.getElementById('qty-total-' + cropId);
  if (totalEl) totalEl.textContent = '🪙 ' + totalCoins;
  const bsvEl = document.getElementById('qty-bsv-' + cropId);
  if (bsvEl) bsvEl.textContent = formatBSV(totalCoins);
  const buyBtn = document.getElementById('buy-btn-' + cropId);
  if (buyBtn) buyBtn.disabled = G.coins < totalCoins;
  const bsvBtn = document.getElementById('bsv-btn-' + cropId);
  if (bsvBtn) bsvBtn.disabled = !G.walletConnected;
}

// SHOP: purchase seeds — coins deducted, seeds go to storage
export function buySeeds(cropId, qty) {
  const crop = CROP_MAP[cropId];
  if (!crop || qty < 1 || qty > 10) return;
  const total = crop.seedCost * qty;
  if (G.coins < total) {
    notify('🪙 Need ' + total + ' coins for ' + qty + '× ' + crop.name + '!', 'error');
    shakeStat('stat-coins');
    return;
  }
  G.coins -= total;
  G.inventory[cropId] = (G.inventory[cropId] || 0) + qty;
  G.shopExpanded = null;
  saveGame();
  renderAll();
  notify('🛒 Bought ' + qty + '× ' + crop.name + ' seed' + (qty > 1 ? 's' : '') + '! Check storage.', 'unlock');
}

// SHOP: buy seeds with BSV
export function buySeedsBSV(cropId, qty) {
  const crop = CROP_MAP[cropId];
  if (!crop || qty < 1 || qty > 10) return;
  if (!G.walletConnected) {
    notify('🔗 Connect your wallet first to pay with BSV!', 'error');
    return;
  }
  const totalCoins = crop.seedCost * qty;
  const satoshis = coinsToSatoshis(totalCoins);
  const ref = 'seeds-' + cropId + '-' + Date.now();
  const btn = document.getElementById('bsv-btn-' + cropId);
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Paying…'; }
  payWithBSV(satoshis, ref,
    () => {
      // Success
      G.inventory[cropId] = (G.inventory[cropId] || 0) + qty;
      G.shopExpanded = null;
      saveGame();
      renderAll();
      notify('₿ Paid ' + formatBSV(totalCoins) + ' — got ' + qty + '× ' + crop.name + '!', 'unlock');
    },
    (err) => {
      if (btn) { btn.disabled = false; btn.textContent = '₿ ' + formatBSV(totalCoins); }
      notify('₿ BSV payment failed: ' + err, 'error');
    }
  );
}

// STORAGE: click a seed tile to select it for planting
export function clearSelectedCrop() {
  G.selectedCrop = null;
  renderPlots();
  renderStorage();
  renderShop();
}

export function selectFromStorage(cropId) {
  if ((G.inventory[cropId] || 0) <= 0) return;
  G.selectedCrop = (G.selectedCrop === cropId) ? null : cropId;
  renderPlots();
  renderStorage();
}

// PLOTS: tap an empty plot to plant the selected seed from storage
export function tryPlant(idx) {
  const plot = G.plots[idx];
  if (!plot.unlocked) { tryUnlockPlot(idx); return; }
  if (plot.cropId) return;

  if (!G.selectedCrop) {
    notify('🏒 Select a seed from storage below the farm first!', 'error');
    return;
  }
  const count = G.inventory[G.selectedCrop] || 0;
  if (count <= 0) {
    notify('🌱 No ' + CROP_MAP[G.selectedCrop].name + ' seeds left in storage!', 'error');
    G.selectedCrop = null;
    renderAll();
    return;
  }

  // Determine if this is a heritage seed (key ends in _heritage)
  const isHeritage = G.selectedCrop.endsWith('_heritage');
  const baseCropId = isHeritage ? G.selectedCrop.replace('_heritage', '') : G.selectedCrop;
  const crop = CROP_MAP[baseCropId];

  G.inventory[G.selectedCrop] = count - 1;
  if (G.inventory[G.selectedCrop] <= 0) delete G.inventory[G.selectedCrop];

  plot.cropId = baseCropId;
  plot.plantedAt = Date.now();
  plot.ready = false;
  plot.heritage = isHeritage;

  // Keep selection active if more seeds of this type remain
  if (!(G.inventory[G.selectedCrop] > 0)) G.selectedCrop = null;

  saveGame();
  renderAll();
  notify('🌱 Planted ' + (isHeritage ? '✨ Heritage ' : '') + crop.name + '! (' + formatTime(crop.gameSecs) + ')', 'harvest');
}

export function tryUnlockPlot(idx) {
  if (G.plots[idx].unlocked) return;
  const cost = PLOT_COSTS[idx];
  if (!canUnlockPlot(idx)) {
    notify(`⚠️ Harvest from plot ${idx} first!`, 'error');
    return;
  }
  if (G.coins < cost) {
    notify(`🪙 Need ${cost} coins to unlock plot ${idx + 1}!`, 'error');
    shakeStat('stat-coins');
    return;
  }
  G.coins -= cost;
  G.plots[idx].unlocked = true;
  checkAchievements();
  saveGame();
  renderAll();
  notify(`🔓 Plot ${idx + 1} unlocked!`, 'unlock');
}

export function unlockPlotBSV(idx) {
  if (G.plots[idx].unlocked) return;
  const cost = PLOT_COSTS[idx];
  if (!canUnlockPlot(idx)) {
    notify(`⚠️ Harvest from plot ${idx} first!`, 'error');
    return;
  }
  if (!G.walletConnected) {
    notify('🔗 Connect your wallet first to pay with BSV!', 'error');
    return;
  }
  const satoshis = coinsToSatoshis(cost);
  const ref = 'plot-' + idx + '-' + Date.now();
  notify(`₿ Requesting BSV payment for Plot ${idx + 1}…`, 'harvest');
  payWithBSV(satoshis, ref,
    () => {
      G.plots[idx].unlocked = true;
      checkAchievements();
      saveGame();
      renderAll();
      notify(`🔓 Plot ${idx + 1} unlocked with BSV!`, 'unlock');
    },
    (err) => {
      notify('₿ BSV payment failed: ' + err, 'error');
    }
  );
}

// ============================================================
// EXOTIC SEED-SAVING
// ============================================================

// Returns plots in seed-saving mode with elapsed fraction, sorted oldest-first
export function getSeedingPlotsInfo() {
  const now = Date.now();
  return G.plots
    .filter(p => p.seeding && p.seedingStartedAt && p.seedingDuration)
    .map(p => ({
      plot: p,
      elapsed: (now - p.seedingStartedAt) / p.seedingDuration,
    }))
    .sort((a, b) => b.elapsed - a.elapsed); // highest fraction first = oldest
}

// Plots past the 50% grace window — eligible for mishap loss
export function getSeedingPlotsAtRisk() {
  return getSeedingPlotsInfo().filter(info => info.elapsed >= 0.5);
}

// The single most-at-risk plot (highest elapsed fraction beyond 50%)
export function getOldestSeedingPlot() {
  const atRisk = getSeedingPlotsAtRisk();
  return atRisk.length > 0 ? atRisk[0].plot : null;
}

// Called when farmer chooses "Let Go to Seed" on a ready exotic plot
export function startSeedSaving(idx) {
  const plot = G.plots[idx];
  const crop = CROP_MAP[plot.cropId];
  if (!crop || !crop.exotic || !plot.ready) return;

  plot.ready = false;
  plot.seeding = true;
  plot.seedingStartedAt = Date.now();
  plot.seedingDuration = Math.round(crop.gameSecs * SEED_PHASE_RATIO * 1000);
  plot.seedReady = false;

  // Close the harvest-fork overlay — must use .remove() because the overlay
  // was created with display:flex as an inline style; classList cannot override it.
  const overlay = document.getElementById('harvest-fork-overlay');
  if (overlay) overlay.remove();

  saveGame();
  renderPlots();
  notify(`🌱 ${crop.name} is going to seed… check back in ${formatTime(Math.round(crop.gameSecs * SEED_PHASE_RATIO))}`, 'harvest');
}

// Collect seeds from a ready seed-saving plot
export function collectSeeds(idx) {
  const plot = G.plots[idx];
  const crop = CROP_MAP[plot.cropId];
  if (!plot.seedReady || !crop) return;

  // Roll yield: 45% = 1 seed, 45% = 2 seeds, 10% = 3 seeds
  const roll = Math.random();
  let qty = roll < 0.45 ? 1 : roll < 0.90 ? 2 : 3;

  // Heritage check: 10% chance
  const isHeritage = Math.random() < 0.10;
  const inventoryKey = isHeritage ? crop.id + '_heritage' : crop.id;

  G.inventory[inventoryKey] = (G.inventory[inventoryKey] || 0) + qty;
  G.seedsCollectedTotal = (G.seedsCollectedTotal || 0) + 1;
  if (isHeritage) G._heritageCollected = (G._heritageCollected || 0) + 1;

  // Reset plot
  plot.cropId = null;
  plot.plantedAt = null;
  plot.ready = false;
  plot.seeding = false;
  plot.seedingStartedAt = null;
  plot.seedingDuration = null;
  plot.seedReady = false;
  plot.fertilised = false;
  plot.heritage = false;

  checkAchievements();
  saveGame();
  renderAll();

  const heritageMsg = isHeritage ? ' ✨ Heritage seed!' : '';
  const bumperMsg = qty === 3 ? ' Bumper crop!' : '';
  notify(`🌱 Collected ${qty}× ${crop.name} seed${qty !== 1 ? 's' : ''}!${bumperMsg}${heritageMsg}`, 'levelup');
}

// Called from tick() — advances seed phase, marks ready when done
export function tickSeedSaving() {
  const now = Date.now();
  let changed = false;
  G.plots.forEach(plot => {
    if (plot.seeding && !plot.seedReady && plot.seedingStartedAt && plot.seedingDuration) {
      if ((now - plot.seedingStartedAt) >= plot.seedingDuration) {
        plot.seedReady = true;
        changed = true;
        const crop = CROP_MAP[plot.cropId];
        notify(`🌱 ${crop ? crop.name : 'Exotic'} seeds are ready to collect!`, 'harvest');
      }
    }
  });
  if (changed) { saveGame(); renderPlots(); }
}

// Mishap: destroy the single oldest at-risk seeding plot's seeds
export function applyMishapPartial() {
  const plot = getOldestSeedingPlot();
  if (!plot) return;
  const crop = CROP_MAP[plot.cropId];
  const name = crop ? crop.name : 'Exotic crop';
  plot.cropId = null;
  plot.plantedAt = null;
  plot.ready = false;
  plot.seeding = false;
  plot.seedingStartedAt = null;
  plot.seedingDuration = null;
  plot.seedReady = false;
  plot.fertilised = false;
  plot.heritage = false;
  G.exoticMishapsTotal = (G.exoticMishapsTotal || 0) + 1;
  saveGame();
  renderAll();
  notify(`💔 Lost the ${name} seeds to the mishap!`, 'error');
}

// Mishap: destroy all at-risk seeding plots (elapsed > 50%)
export function applyMishapTotal() {
  const atRisk = getSeedingPlotsAtRisk().map(info => info.plot);
  const names = [];
  atRisk.forEach(plot => {
    const crop = CROP_MAP[plot.cropId];
    if (crop) names.push(crop.name);
    plot.cropId = null;
    plot.plantedAt = null;
    plot.ready = false;
    plot.seeding = false;
    plot.seedingStartedAt = null;
    plot.seedingDuration = null;
    plot.seedReady = false;
    plot.fertilised = false;
    plot.heritage = false;
    G.exoticMishapsTotal = (G.exoticMishapsTotal || 0) + 1;
  });
  saveGame();
  renderAll();
  if (names.length > 0) notify(`💔 Lost all seeding plots to the mishap: ${names.join(', ')}!`, 'error');
}

// Show the harvest-fork overlay for an exotic ready plot
export function showHarvestFork(idx) {
  const plot = G.plots[idx];
  const crop = CROP_MAP[plot.cropId];
  if (!crop) return;

  // Guard: if already seeding (e.g. player taps rapidly), do nothing
  if (plot.seeding || !plot.ready) return;

  // Remove any existing fork overlay
  const existing = document.getElementById('harvest-fork-overlay');
  if (existing) existing.remove();

  const seedTime = formatTime(Math.round(crop.gameSecs * SEED_PHASE_RATIO));
  const overlay = document.createElement('div');
  overlay.id = 'harvest-fork-overlay';
  overlay.style.cssText = `
    position:fixed;top:0;left:0;right:0;bottom:0;
    background:rgba(0,0,0,0.75);z-index:300;
    display:flex;align-items:center;justify-content:center;padding:16px;
  `;
  const displayPrice = Math.floor(crop.sellPrice * (1 + G.prestige * 0.10) * (plot.fertilised ? 1.25 : 1));
  overlay.innerHTML = `
    <div style="background:var(--bg-panel);border:2px solid rgba(255,215,0,0.4);border-radius:16px;padding:20px;max-width:320px;width:100%;text-align:center">
      <div style="margin-bottom:8px">
        <svg width="52" height="52" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" style="background:${(CROP_THEME[crop.id]||{bg:'#1A1A1A'}).bg};border-radius:8px;box-shadow:0 0 10px rgba(255,215,0,0.3)">${cropArt(crop.id)}</svg>
      </div>
      <div style="font-family:var(--ff-head);font-size:17px;color:#FFD700;margin-bottom:4px">✨ ${crop.name} Ready!</div>
      <div style="font-size:12px;color:var(--text-dim);margin-bottom:16px">This is an exotic crop — what will you do?</div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <button onclick="harvestCrop(${idx});document.getElementById('harvest-fork-overlay').remove()"
          style="background:rgba(45,107,32,0.3);border:1px solid var(--green-mid);border-radius:10px;padding:12px;cursor:pointer;text-align:left">
          <div style="font-weight:800;color:var(--green-hi);font-size:13px">🌾 Harvest Now</div>
          <div style="font-size:11px;color:var(--text-dim);margin-top:2px">Earn 🪙${displayPrice} immediately. Seed consumed.</div>
        </button>
        <button onclick="startSeedSaving(${idx});const _o=document.getElementById('harvest-fork-overlay');if(_o)_o.remove();"
          style="background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.4);border-radius:10px;padding:12px;cursor:pointer;text-align:left">
          <div style="font-weight:800;color:#FFD700;font-size:13px">🌱 Let Go to Seed</div>
          <div style="font-size:11px;color:var(--text-dim);margin-top:2px">Wait ~${seedTime} more. Gamble for 1–3 new seeds. No coin harvest.</div>
        </button>
      </div>
      <button onclick="document.getElementById('harvest-fork-overlay').remove()"
        style="margin-top:12px;background:transparent;border:none;color:var(--text-dim);font-size:12px;cursor:pointer">Cancel</button>
    </div>
  `;
  document.body.appendChild(overlay);
}

// Show seed collection confirmation overlay on a ready plot tile
export function showSeedCollectOverlay(idx) {
  const existing = document.getElementById('seed-collect-overlay-' + idx);
  if (existing) { existing.remove(); return; } // toggle off

  const plot = G.plots[idx];
  const crop = CROP_MAP[plot.cropId];
  if (!crop) return;

  const overlay = document.createElement('div');
  overlay.id = 'seed-collect-overlay-' + idx;
  overlay.style.cssText = `
    position:fixed;top:0;left:0;right:0;bottom:0;
    background:rgba(0,0,0,0.75);z-index:300;
    display:flex;align-items:center;justify-content:center;padding:16px;
  `;
  overlay.innerHTML = `
    <div style="background:var(--bg-panel);border:2px solid rgba(255,215,0,0.5);border-radius:16px;padding:20px;max-width:300px;width:100%;text-align:center">
      <div style="font-size:28px;margin-bottom:6px">🌱</div>
      <div style="font-family:var(--ff-head);font-size:16px;color:#FFD700;margin-bottom:4px">${crop.name} Seeds Ready!</div>
      <div style="font-size:12px;color:var(--text-dim);margin-bottom:4px">Yield: 1–2 seeds (10% chance of 3)</div>
      <div style="font-size:12px;color:var(--text-dim);margin-bottom:16px">✨ 10% chance of a Heritage seed (+20% sell value when grown)</div>
      <div style="display:flex;gap:10px;justify-content:center">
        <button onclick="collectSeeds(${idx})"
          style="background:rgba(255,215,0,0.15);border:1px solid rgba(255,215,0,0.5);border-radius:8px;padding:10px 18px;cursor:pointer;color:#FFD700;font-weight:800;font-size:13px">
          🌱 Collect Seeds
        </button>
        <button onclick="document.getElementById('seed-collect-overlay-${idx}').remove()"
          style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:10px 18px;cursor:pointer;color:var(--text-dim);font-size:13px">
          Cancel
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

export function harvestCrop(idx) {
  const plot = G.plots[idx];
  if (!plot.ready) {
    // Close any stale overlay that might still be showing
    const stale = document.getElementById('harvest-fork-overlay');
    if (stale) stale.remove();
    return;
  }
  const crop = CROP_MAP[plot.cropId];

  const baseSell = Math.floor(crop.sellPrice * prestigeMultiplier() * (plot.fertilised ? 1.25 : 1) * (plot.heritage ? 1.20 : 1));
  const earnedCoins = applyEventModifiers(baseSell);
  const wasFertilised = plot.fertilised;
  G.coins += earnedCoins;
  G.totalXP += crop.xp;
  plot.harvestedCount++;
  // Lifetime tracking (survives prestige)
  G.cropHarvests[crop.id] = (G.cropHarvests[crop.id] || 0) + 1;
  G.totalHarvestCount++;
  G.totalCoinsEarned += earnedCoins;
  const prevLevel = G.level;
  checkLevelUp();
  checkAchievements();
  plot.cropId = null;
  plot.plantedAt = null;
  plot.ready = false;
  plot.fertilised = false;
  plot.heritage = false;
  saveGame();
  renderAll();

  showFloatLabel(`+🪙${earnedCoins}`, idx);
  notify(`✨ Harvested ${crop.name}! +🪙${earnedCoins}${wasFertilised ? ' 🌿+25%' : ''} +${crop.xp}XP`, 'harvest');

  if (G.level > prevLevel) {
    const ld = getLevelData(G.level);
    setTimeout(() => notify(`🎉 Level Up! You're now ${ld.title} (Lv${G.level})!`, 'levelup'), 300);
    if (ld.unlocks.length > 0) {
      setTimeout(() => notify(`🆕 Unlocked: ${ld.unlocks.map(id => CROP_MAP[id].name).join(', ')}!`, 'unlock'), 700);
    }
  }
}

export function checkLevelUp() {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (G.totalXP >= LEVELS[i].xpMin) {
      G.level = LEVELS[i].lvl;
      return;
    }
  }
  G.level = 1;
}