// ============================================================
// CORE GAME MECHANICS
// ============================================================

import { CROPS, CROP_MAP, PLOT_COSTS, LEVELS, SEED_PHASE_RATIO, MISHAP_INSURANCE_COST, MISHAP_INSURANCE_SECS, COMPOST_MAX_CHARGES } from './constants.js';
import { G, saveGame, calcFarmScore } from './game-state.js';
import { getLevelData, prestigeMultiplier, canUnlockPlot, formatTime,
         checkLevelUp, isCropUnlocked, formatUSD, coinsToUSD, seedsToUSD,
         USD_COMPOST_REFILL, USD_SPEED_BOOST } from './utils.js';
import { checkAchievements } from './achievements.js';
import { requestBSVPayment } from './bsv-payments.js';
import { playCompostSound, playEventSound, playHarvestSound, playPlantSound, playPlotUnlockSound, playWateringCanSound } from './sound.js';

// These are set up on window by main.js — avoids circular imports with rendering.js
function notify(msg, type)  { if (window.notify)      window.notify(msg, type); }
function renderAll()        { if (window.renderAll)    window.renderAll(); }
function renderPlots()      { if (window.renderPlots)  window.renderPlots(); }
function renderStorage()    { if (window.renderStorage) window.renderStorage(); }
function shakeStat(id)      { if (window.shakeStat)    window.shakeStat(id); }
function showFloatLabel(t,i){ if (window.showFloatLabel) window.showFloatLabel(t, i); }
function renderCompost()    { if (window.renderCompost) window.renderCompost(); }
function renderWateringCan(){ if (window.renderWateringCan) window.renderWateringCan(); }
function showConfirm(t,d,fn){ if (window.showConfirm)  window.showConfirm(t,d,fn); }

// ── Wallet payment helpers ────────────────────────────────
function payWithBSV(usdAmount, ref, note, onSuccess, onFail) {
  const GAME_BSV_ADDRESS = '1rdvvikhzjLoGsqurQN6Xhz2CtGDzpuQd';
  if (window.platformSDK && G.walletConnected) {
    requestBSVPayment({
      ref,
      recipients: [{ address: GAME_BSV_ADDRESS, fiatValue: usdAmount, fiatvalue: usdAmount, note: 'Plot Twist purchase' }],
      pendingMessage: note || 'Awaiting wallet confirmation…',
    })
      .then(onSuccess)
      .catch((error) => onFail(error.message || 'Payment failed'));
  } else {
    onFail('Wallet not available in dev mode. Use coins instead.');
  }
}

// ── Event modifiers applied on harvest ────────────────────
export function applyEventModifiers(baseCoins) {
  let coins = baseCoins;
  if (G._sunBonus)     { coins = Math.floor(coins * 1.25); G._sunBonus = false; }
  if (G._aphidPenalty) { coins = Math.floor(coins * 0.80); G._aphidPenalty = false; }
  return coins;
}

// ── Resolve random event modal ─────────────────────────────
export function resolveEvent(fix) {
  const { ev, cost } = window._currentEvent || {};
  if (!ev) return;
  if (fix && cost > 0 && G.coins < cost) {
    notify('🪙 Not enough coins!', 'error');
    return;
  }
  clearTimeout(window._eventTimeout);
  window._eventTimeout = null;
  window._currentEvent = null;
  document.getElementById('event-overlay').classList.add('hidden');

  if (fix) {
    if (cost > 0) {
      G.coins -= cost;
      G._eventsFixed = (G._eventsFixed || 0) + 1;
    }
    ev.onFix && ev.onFix();
    playEventSound('resolved');
    saveGame();
    renderAll();
  } else {
    ev.onIgnore && ev.onIgnore();
    playEventSound('ignored');
  }
  checkAchievements();
}

// ── SHOP ──────────────────────────────────────────────────
export function toggleShopCard(cropId) {
  const crop = CROP_MAP[cropId];
  if (!crop) return;
  if (!isCropUnlocked(cropId)) {
    notify('🔒 Reach Level ' + crop.unlockLevel + ' to grow ' + crop.name + '!', 'error');
    return;
  }
  G.shopExpanded = (G.shopExpanded === cropId) ? null : cropId;
  if (window.renderShop) window.renderShop();
}

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
  if (bsvEl) bsvEl.textContent = formatUSD(seedsToUSD(val, crop.seedCost));
  const buyBtn = document.getElementById('buy-btn-' + cropId);
  if (buyBtn) buyBtn.disabled = G.coins < totalCoins;
  const bsvBtn = document.getElementById('bsv-btn-' + cropId);
  if (bsvBtn) bsvBtn.disabled = !G.walletConnected;
}

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

export function buySeedsBSV(cropId, qty) {
  const crop = CROP_MAP[cropId];
  if (!crop || qty < 1 || qty > 10) return;
  if (!G.walletConnected) { notify('🔗 Connect your wallet first to pay!', 'error'); return; }
  const usdPrice = seedsToUSD(qty, crop.seedCost);
  const ref = 'seeds-' + cropId + '-' + Date.now();
  const btn = document.getElementById('bsv-btn-' + cropId);
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Paying…'; }
  payWithBSV(usdPrice, ref, 'Awaiting wallet confirmation for seed purchase (' + formatUSD(usdPrice) + ' USD)…',
    ({ broadcast }) => {
      G.inventory[cropId] = (G.inventory[cropId] || 0) + qty;
      G.shopExpanded = null;
      if (btn) { btn.disabled = false; btn.textContent = formatUSD(usdPrice); }
      saveGame(); renderAll();
      const txSuffix = broadcast?.txid ? ' Tx ' + broadcast.txid.slice(0, 8) + '…' : '';
      notify('💳 Paid ' + formatUSD(usdPrice) + ' USD — got ' + qty + '× ' + crop.name + '!' + txSuffix, 'unlock');
    },
    (err) => {
      if (btn) { btn.disabled = false; btn.textContent = formatUSD(usdPrice); }
      notify('💳 Wallet payment failed: ' + err, 'error');
    }
  );
}

// ── STORAGE ───────────────────────────────────────────────
export function clearSelectedCrop() {
  G.selectedCrop = null;
  renderPlots(); renderStorage();
  if (window.renderShop) window.renderShop();
}

export function selectFromStorage(cropId) {
  if ((G.inventory[cropId] || 0) <= 0) return;
  G.selectedCrop = (G.selectedCrop === cropId) ? null : cropId;
  renderPlots(); renderStorage();
}

// ── PLOTS ─────────────────────────────────────────────────
export function tryPlant(idx) {
  const plot = G.plots[idx];
  if (!plot.unlocked) { tryUnlockPlot(idx); return; }
  if (plot.cropId) return;
  if (!G.selectedCrop) { notify('🏒 Select a seed from storage below the farm first!', 'error'); return; }

  const count = G.inventory[G.selectedCrop] || 0;
  if (count <= 0) {
    notify('🌱 No ' + CROP_MAP[G.selectedCrop]?.name + ' seeds left!', 'error');
    G.selectedCrop = null; renderAll(); return;
  }

  const isHeritage = G.selectedCrop.endsWith('_heritage');
  const baseCropId = isHeritage ? G.selectedCrop.replace('_heritage', '') : G.selectedCrop;
  const crop = CROP_MAP[baseCropId];

  G.inventory[G.selectedCrop] = count - 1;
  if (G.inventory[G.selectedCrop] <= 0) delete G.inventory[G.selectedCrop];
  plot.cropId = baseCropId;
  plot.plantedAt = Date.now();
  plot.ready = false;
  plot.heritage = isHeritage;

  if (!(G.inventory[G.selectedCrop] > 0)) G.selectedCrop = null;
  saveGame(); renderAll();
  playPlantSound(isHeritage);
  notify('🌱 Planted ' + (isHeritage ? '✨ Heritage ' : '') + crop.name + '! (' + formatTime(crop.gameSecs) + ')', 'harvest');
}

export function tryUnlockPlot(idx) {
  if (G.plots[idx].unlocked) return;
  const cost = PLOT_COSTS[idx];
  if (!canUnlockPlot(idx)) { notify(`⚠️ Harvest from plot ${idx} first!`, 'error'); return; }
  if (G.coins < cost) { notify(`🪙 Need ${cost} coins to unlock plot ${idx + 1}!`, 'error'); shakeStat('stat-coins'); return; }
  G.coins -= cost;
  G.plots[idx].unlocked = true;
  checkAchievements(); saveGame(); renderAll();
  playPlotUnlockSound();
  notify(`🔓 Plot ${idx + 1} unlocked!`, 'unlock');
}

export function unlockPlotBSV(idx) {
  if (G.plots[idx].unlocked) return;
  const cost = PLOT_COSTS[idx];
  const usdPrice = coinsToUSD(cost);
  if (!canUnlockPlot(idx)) { notify(`⚠️ Harvest from plot ${idx} first!`, 'error'); return; }
  if (!G.walletConnected) { notify('🔗 Connect your wallet first to pay!', 'error'); return; }
  const ref = 'plot-' + idx + '-' + Date.now();
  notify(`💳 Requesting wallet payment for Plot ${idx + 1} (${formatUSD(usdPrice)} USD)…`, 'harvest');
  payWithBSV(usdPrice, ref, `Awaiting wallet confirmation for Plot ${idx + 1} (${formatUSD(usdPrice)} USD)…`,
    ({ broadcast }) => {
      G.plots[idx].unlocked = true;
      checkAchievements();
      saveGame();
      renderAll();
      playPlotUnlockSound();
      const txSuffix = broadcast?.txid ? ' Tx ' + broadcast.txid.slice(0, 8) + '…' : '';
      notify(`🔓 Plot ${idx + 1} unlocked for ${formatUSD(usdPrice)} USD!` + txSuffix, 'unlock');
    },
    (err) => { notify('💳 Wallet payment failed: ' + err, 'error'); }
  );
}

export function buyCompostBSV() {
  if (!G.walletConnected) { notify('🔗 Connect your wallet first to buy compost!', 'error'); return; }
  if (G.compostCharges > 0) { notify('🌿 Compost pile still has charges!', 'info'); return; }
  const ref = 'compost-' + Date.now();
  showConfirm(
    '🌿 Buy Compost',
    'Instantly refill your compost pile to 5 charges for ' + formatUSD(USD_COMPOST_REFILL) + ' USD?',
    () => {
      const btn = document.getElementById('compost-buy-btn');
      if (btn) { btn.disabled = true; btn.textContent = '⏳ Processing…'; }
      payWithBSV(USD_COMPOST_REFILL, ref, 'Awaiting wallet confirmation for compost purchase (' + formatUSD(USD_COMPOST_REFILL) + ' USD)…',
        ({ broadcast }) => {
          G.compostCharges = COMPOST_MAX_CHARGES;
          G.compostLastCharged = Date.now();
          saveGame(); renderAll();
          const txSuffix = broadcast?.txid ? ' Tx ' + broadcast.txid.slice(0, 8) + '…' : '';
          notify('🌿 Compost pile refilled for ' + formatUSD(USD_COMPOST_REFILL) + ' USD!' + txSuffix, 'unlock');
        },
        (err) => {
          if (btn) { btn.disabled = false; btn.textContent = formatUSD(USD_COMPOST_REFILL); }
          notify('💳 Wallet payment failed: ' + err, 'error');
        }
      );
    }
  );
}

// ── HARVEST ───────────────────────────────────────────────
export function harvestCrop(idx) {
  const plot = G.plots[idx];
  if (!plot.ready) {
    const stale = document.getElementById('harvest-fork-overlay');
    if (stale) stale.remove();
    return;
  }
  const crop = CROP_MAP[plot.cropId];
  const baseSell = Math.floor(crop.sellPrice * prestigeMultiplier() * (plot.fertilised ? 1.25 : 1) * (plot.heritage ? 1.20 : 1));
  const earnedCoins = applyEventModifiers(baseSell);
  const wasFertilised = plot.fertilised;
  const wasHeritage = plot.heritage;
  G.coins += earnedCoins;
  G.totalXP += crop.xp;
  plot.harvestedCount++;
  G.cropHarvests[crop.id] = (G.cropHarvests[crop.id] || 0) + 1;
  G.totalHarvestCount++;
  G.totalCoinsEarned += earnedCoins;
  const prevLevel = G.level;
  checkLevelUp();
  checkAchievements();
  plot.cropId = null; plot.plantedAt = null; plot.ready = false;
  plot.fertilised = false; plot.heritage = false;
  saveGame(); renderAll();
  playHarvestSound({ fertilised: wasFertilised, heritage: wasHeritage });
  showFloatLabel(`+🪙${earnedCoins}`, idx);
  notify(`✨ Harvested ${crop.name}! +🪙${earnedCoins}${wasFertilised ? ' 🌿+25%' : ''} +${crop.xp}XP`, 'harvest');
  if (G.level > prevLevel) {
    const ld = getLevelData(G.level);
    setTimeout(() => notify(`🎉 Level Up! You're now ${ld.title} (Lv${G.level})!`, 'levelup'), 300);
    if (ld.unlocks.length > 0) setTimeout(() => notify(`🆕 Unlocked: ${ld.unlocks.map(id => CROP_MAP[id].name).join(', ')}!`, 'unlock'), 700);
  }
}

// ── WATERING CAN ──────────────────────────────────────────
export function useWateringCan() {
  const charge = window._wateringCanCharge ? window._wateringCanCharge() : 1;
  if (charge < 1) {
    const secsLeft = Math.ceil(120 * (1 - charge));
    notify('💧 Watering can still filling! Ready in ' + formatTime(secsLeft), 'error');
    return;
  }
  const growing = G.plots.filter(p => p.cropId && p.plantedAt && !p.ready);
  if (growing.length === 0) { notify('🌵 No growing crops to water!', 'error'); return; }
  growing.forEach(p => {
    const crop = CROP_MAP[p.cropId];
    const elapsed = Date.now() - p.plantedAt;
    const remaining = Math.max(0, crop.gameSecs * 1000 - elapsed);
    p.plantedAt -= Math.floor(remaining * 0.10);
  });
  G.wateringCanLastUsed = Date.now();
  saveGame(); renderPlots(); renderWateringCan();
  playWateringCanSound(1500);
  const btn = document.getElementById('watering-can-btn');
  if (btn) { btn.classList.add('can-splashing'); setTimeout(() => btn.classList.remove('can-splashing'), 500); }
  notify('💧 Watered ' + growing.length + ' crop' + (growing.length !== 1 ? 's' : '') + '! −10% grow time each.', 'harvest');
}

// ── COMPOST / FERTILISE ───────────────────────────────────
export function toggleFertiliseMode() {
  if (G.compostCharges <= 0) { notify('🌿 No compost charges! Wait for the pile to regenerate.', 'error'); return; }
  G.fertiliseMode = !G.fertiliseMode;
  renderPlots(); renderCompost();
}

export function applyFertiliser(idx) {
  const plot = G.plots[idx];
  const COMPOST_MAX = 5;
  if (!plot.unlocked) { notify('🔒 Unlock this plot first!', 'error'); return; }
  if (G.compostCharges <= 0) { notify('🌿 No compost charges left!', 'error'); G.fertiliseMode = false; renderPlots(); renderCompost(); return; }
  if (plot.fertilised) { notify('🌿 Plot already fertilised!', 'error'); return; }
  if (plot.ready) { notify('🌿 Harvest first — fertiliser applies before harvest!', 'error'); return; }
  plot.fertilised = true;
  G.compostCharges = Math.max(0, G.compostCharges - 1);
  if (G.compostCharges < COMPOST_MAX && G.compostLastCharged === 0) G.compostLastCharged = Date.now();
  G.fertiliseMode = false;
  saveGame(); renderPlots(); renderCompost();
  playCompostSound();
  notify('🌿 Plot ' + (idx + 1) + ' fertilised! Next harvest +25% coins.', 'harvest');
}

// ── EXOTIC SEED-SAVING ────────────────────────────────────
export function getSeedingPlotsInfo() {
  const now = Date.now();
  return G.plots.filter(p => p.seeding && p.seedingStartedAt && p.seedingDuration)
    .map(p => ({ plot: p, elapsed: (now - p.seedingStartedAt) / p.seedingDuration }))
    .sort((a, b) => b.elapsed - a.elapsed);
}

export function getSeedingPlotsAtRisk() {
  return getSeedingPlotsInfo().filter(info => info.elapsed >= 0.5);
}

export function getOldestSeedingPlot() {
  const atRisk = getSeedingPlotsAtRisk();
  return atRisk.length > 0 ? atRisk[0].plot : null;
}

export function startSeedSaving(idx) {
  const plot = G.plots[idx];
  const crop = CROP_MAP[plot.cropId];
  if (!crop || !crop.exotic || !plot.ready) return;
  plot.ready = false; plot.seeding = true;
  plot.seedingStartedAt = Date.now();
  plot.seedingDuration = Math.round(crop.gameSecs * SEED_PHASE_RATIO * 1000);
  plot.seedReady = false;
  document.getElementById('harvest-fork-overlay')?.remove();
  saveGame(); renderPlots();
  notify(`🌱 ${crop.name} is going to seed… check back in ${formatTime(Math.round(crop.gameSecs * SEED_PHASE_RATIO))}`, 'harvest');
}

export function collectSeeds(idx) {
  const plot = G.plots[idx];
  const crop = CROP_MAP[plot.cropId];
  if (!plot.seedReady || !crop) return;
  const roll = Math.random();
  const qty = roll < 0.45 ? 1 : roll < 0.90 ? 2 : 3;
  const heritageChance = plot.heritage ? 0.50 : 0.10;
  const isHeritage = Math.random() < heritageChance;
  const inventoryKey = isHeritage ? crop.id + '_heritage' : crop.id;
  G.inventory[inventoryKey] = (G.inventory[inventoryKey] || 0) + qty;
  G.seedsCollectedTotal = (G.seedsCollectedTotal || 0) + 1;
  if (isHeritage) G._heritageCollected = (G._heritageCollected || 0) + 1;
  plot.cropId = null; plot.plantedAt = null; plot.ready = false;
  plot.seeding = false; plot.seedingStartedAt = null;
  plot.seedingDuration = null; plot.seedReady = false;
  plot.fertilised = false; plot.heritage = false;
  checkAchievements(); saveGame(); renderAll();
  notify(`🌱 Collected ${qty}× ${crop.name} seed${qty !== 1 ? 's' : ''}!${qty===3?' Bumper crop!':''}${isHeritage?' ✨ Heritage seed!':''}`, 'levelup');
}

export function applyMishapPartial() {
  const plot = getOldestSeedingPlot();
  if (!plot) return;
  const name = CROP_MAP[plot.cropId]?.name || 'Exotic crop';
  Object.assign(plot, { cropId:null, plantedAt:null, ready:false, seeding:false, seedingStartedAt:null, seedingDuration:null, seedReady:false, fertilised:false, heritage:false });
  G.exoticMishapsTotal = (G.exoticMishapsTotal || 0) + 1;
  saveGame(); renderAll();
  notify(`💔 Lost the ${name} seeds to the mishap!`, 'error');
}

export function applyMishapTotal() {
  const atRisk = getSeedingPlotsAtRisk().map(i => i.plot);
  const names = [];
  atRisk.forEach(plot => {
    names.push(CROP_MAP[plot.cropId]?.name || '?');
    Object.assign(plot, { cropId:null, plantedAt:null, ready:false, seeding:false, seedingStartedAt:null, seedingDuration:null, seedReady:false, fertilised:false, heritage:false });
    G.exoticMishapsTotal = (G.exoticMishapsTotal || 0) + 1;
  });
  saveGame(); renderAll();
  if (names.length > 0) notify(`💔 Lost all seeding plots: ${names.join(', ')}!`, 'error');
}

// ── MISHAP INSURANCE ──────────────────────────────────────
export function isMishapInsured() {
  return G._mishapInsuranceExpiry > Date.now();
}

export function getMishapInsuranceRemaining() {
  if (!isMishapInsured()) return 0;
  return Math.ceil((G._mishapInsuranceExpiry - Date.now()) / 1000);
}

export function buyMishapInsurance() {
  if (getSeedingPlotsAtRisk().length === 0 && !G.plots.some(p => p.seeding)) { notify('⚠️ No seeding plots to insure!', 'error'); return; }
  if (G.coins < MISHAP_INSURANCE_COST) { notify('⚠️ Not enough coins! Need 🪙' + MISHAP_INSURANCE_COST, 'error'); return; }
  if (isMishapInsured()) { notify('🛡️ Already insured! ' + formatTime(getMishapInsuranceRemaining()) + ' remaining.', 'info'); return; }
  showConfirm(
    '🛡️ Mishap Insurance',
    'Protect all seeding plots from mishap loss for 30 minutes for 🪙' + MISHAP_INSURANCE_COST + ' coins?',
    () => {
      G.coins -= MISHAP_INSURANCE_COST;
      G._mishapInsuranceExpiry = Date.now() + MISHAP_INSURANCE_SECS * 1000;
      saveGame(); renderAll();
      notify('🛡️ Mishap Insurance purchased! All seeding plots protected for 30 minutes.', 'unlock');
    }
  );
}

export function buySpeedBoost() {
  if (!G.walletConnected) { notify('🔗 Connect your wallet first to buy speed boost!', 'error'); return; }
  if (G._speedBoostExpiry > Date.now()) { notify('⚡ Speed boost already active!', 'info'); return; }
  const ref = 'speed-' + Date.now();
  showConfirm(
    '⚡ Speed Boost',
    'Speed up your farm 10× for 20 minutes! Crops grow, seed, and recharge 10× faster. Cost: ' + formatUSD(USD_SPEED_BOOST) + ' USD?',
    () => {
      const btn = document.getElementById('speed-boost-btn');
      if (btn) { btn.disabled = true; btn.innerHTML = '⏳'; }
      payWithBSV(USD_SPEED_BOOST, ref, 'Awaiting wallet confirmation for speed boost (' + formatUSD(USD_SPEED_BOOST) + ' USD)…',
        ({ broadcast }) => {
          G._speedBoostExpiry = Date.now() + 20 * 60 * 1000;
          saveGame();
          if (window._restartTick) window._restartTick();
          renderAll();
          const txSuffix = broadcast?.txid ? ' Tx ' + broadcast.txid.slice(0, 8) + '…' : '';
          notify('⚡ Speed Boost activated for ' + formatUSD(USD_SPEED_BOOST) + ' USD! 10× farm speed for 20 minutes!' + txSuffix, 'levelup');
        },
        (err) => {
          if (btn) { btn.disabled = false; }
          notify('💳 Wallet payment failed: ' + err, 'error');
        }
      );
    }
  );
}

export function showHarvestFork(idx) {
  const plot = G.plots[idx];
  const crop = CROP_MAP[plot.cropId];
  if (!crop || plot.seeding || !plot.ready) return;
  document.getElementById('harvest-fork-overlay')?.remove();
  const seedTime = formatTime(Math.round(crop.gameSecs * SEED_PHASE_RATIO));
  const displayPrice = Math.floor(crop.sellPrice * (1 + G.prestige * 0.10) * (plot.fertilised ? 1.25 : 1));
  const overlay = document.createElement('div');
  overlay.id = 'harvest-fork-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.75);z-index:300;display:flex;align-items:center;justify-content:center;padding:16px';
  const bgCol = (window._CROP_THEME?.[crop.id]||{bg:'#1A1A1A'}).bg;
  overlay.innerHTML = `
    <div style="background:var(--bg-panel);border:2px solid rgba(255,215,0,0.4);border-radius:16px;padding:20px;max-width:320px;width:100%;text-align:center">
      <div style="margin-bottom:8px">
        <svg width="52" height="52" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" style="background:${bgCol};border-radius:8px;box-shadow:0 0 10px rgba(255,215,0,0.3)">${window._cropArtWithPrestige?.(crop.id, G.prestige)||''}</svg>
      </div>
      <div style="font-family:var(--ff-head);font-size:17px;color:#FFD700;margin-bottom:4px">✨ ${crop.name} Ready!</div>
      <div style="font-size:12px;color:var(--text-dim);margin-bottom:16px">This is an exotic crop — what will you do?</div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <button onclick="harvestCrop(${idx});document.getElementById('harvest-fork-overlay').remove()"
          style="background:rgba(45,107,32,0.3);border:1px solid var(--green-mid);border-radius:10px;padding:12px;cursor:pointer;text-align:left">
          <div style="font-weight:800;color:var(--green-hi);font-size:13px">🌾 Harvest Now</div>
          <div style="font-size:11px;color:var(--text-dim);margin-top:2px">Earn 🪙${displayPrice} immediately.</div>
        </button>
        <button onclick="startSeedSaving(${idx})"
          style="background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.4);border-radius:10px;padding:12px;cursor:pointer;text-align:left">
          <div style="font-weight:800;color:#FFD700;font-size:13px">🌱 Let Go to Seed</div>
          <div style="font-size:11px;color:var(--text-dim);margin-top:2px">Wait ~${seedTime} more. Get 1–3 new seeds.</div>
        </button>
      </div>
      <button onclick="document.getElementById('harvest-fork-overlay').remove()"
        style="margin-top:12px;background:transparent;border:none;color:var(--text-dim);font-size:12px;cursor:pointer">Cancel</button>
    </div>`;
  document.body.appendChild(overlay);
}

// ── FARM NAMING ───────────────────────────────────────────
export function startEditName(which) {
  const isF = which === 'farm';
  const displayId = isF ? 'farm-name-display' : 'farmer-name-display';
  const displayEl = document.getElementById(displayId);
  if (!displayEl) return;
  if (displayEl.parentElement.querySelector('.name-input')) return;
  const current = isF ? G.farmName : G.farmerName;
  const input = document.createElement('input');
  input.className = 'name-input';
  input.maxLength = 15;
  input.value = current;
  input.style.fontSize = isF ? '16px' : '14px';
  displayEl.style.display = 'none';
  displayEl.parentElement.insertBefore(input, displayEl);
  input.focus(); input.select();
  function commit() {
    const val = input.value.trim().slice(0, 15) || (isF ? 'My Farm' : 'Farmer');
    if (isF) G.farmName = val; else G.farmerName = val;
    saveGame();
    if (window.renderHeading) window.renderHeading();
    input.remove(); displayEl.style.display = '';
  }
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { input.remove(); displayEl.style.display = ''; }
  });
}

// ── PRESTIGE ──────────────────────────────────────────────
function preserveExoticInventory() {
  const preserved = {};
  Object.entries(G.inventory || {}).forEach(([key, qty]) => {
    if (!qty) return;
    const baseKey = key.replace(/_heritage$/, '');
    if (CROP_MAP[baseKey] && CROP_MAP[baseKey].exotic) {
      preserved[key] = qty;
    }
  });
  return preserved;
}

export function doPrestige() {
  if (G.level < 10) { notify('⚠️ Reach Level 10 (Master) to prestige!', 'error'); return; }
  if (G.prestige >= 50) { notify('✨ Maximum prestige (50) already reached!', 'error'); return; }

  const nextPrestige = G.prestige + 1;
  const bonus = Math.round(nextPrestige * 10);
  const exoticProgressCount = G.plots.filter(plot => plot.cropId && CROP_MAP[plot.cropId]?.exotic && (!plot.ready || plot.seeding)).length;
  const warningText = exoticProgressCount > 0
    ? `This will reset your farm to level 1 with 2 coins, but EXOTIC crops currently growing or going-to-seed (${exoticProgressCount}) will be lost. Exotic seeds already in storage will be preserved. Market listings are not affected. All harvest coins will permanently earn +${bonus}% more.`
    : `This resets your farm to level 1 with 2 coins, but ALL harvest coins will permanently earn +${bonus}% more. Exotic seeds already in storage will be preserved. Market listings are not affected.`;

  showConfirm(
    `Prestige ${nextPrestige}/50`,
    warningText,
    () => {
      const exoticInventory = preserveExoticInventory();
      G.prestige = nextPrestige;
      G.coins = 2; G.totalXP = 0; G.level = 1;
      G.selectedCrop = null; G.shopExpanded = null; G.fertiliseMode = false;
      G.compostCharges = 5; G.compostLastCharged = 0; G.inventory = exoticInventory;
      G.plots = Array.from({length:20}, (_, i) => ({
        idx:i, unlocked:i===0, harvestedCount:0, cropId:null,
        plantedAt:null, ready:false, fertilised:false, seeding:false,
        seedingStartedAt:null, seedingDuration:null, seedReady:false, heritage:false,
      }));
      checkAchievements(); saveGame(); renderAll();
      notify('⭐ Prestige ' + nextPrestige + ' achieved! Sell bonus: +' + bonus + '%', 'levelup');
    }
  );
}
