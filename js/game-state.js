// ============================================================
// GAME STATE MANAGEMENT
// ============================================================

import { SAVE_KEY, CROP_MAP, EVENT_MIN_GAP, EVENT_MAX_GAP, RANDOM_EVENTS,
         MERCHANT_MIN_GAP, MERCHANT_MAX_GAP, MERCHANT_DURATION, MERCHANT_DEALS } from './constants.js';
import { getLevelData, checkLevelUp, formatTime } from './utils.js';

// ── Deferred UI handlers (avoids circular imports) ──────────
let _notifyFn = null;
let _renderAllFn = null;
let _renderPlotsFn = null;
let _checkAchievementsFn = null;

export function setUIHandlers(notifyFn, renderAllFn, renderPlotsFn, checkAchievementsFn) {
  _notifyFn = notifyFn;
  _renderAllFn = renderAllFn;
  _renderPlotsFn = renderPlotsFn;
  _checkAchievementsFn = checkAchievementsFn;
}

export function notify(msg, type) {
  if (_notifyFn) _notifyFn(msg, type);
  else console.log('[notification]', msg);
}

function renderAll() { if (_renderAllFn) _renderAllFn(); }
function renderPlots() { if (_renderPlotsFn) _renderPlotsFn(); }
function checkAchievements() { if (_checkAchievementsFn) _checkAchievementsFn(); }

// Global event/merchant timers
let _nextEventTime = 0;
let _nextMerchantTime = 0;

export const DEFAULT_STATE = {
  coins: 2,
  totalXP: 0,
  level: 1,
  prestige: 0,
  farmName: 'My Farm',
  farmerName: 'Farmer',
  selectedCrop: null,
  shopExpanded: null,
  inventory: {},
  plots: Array.from({length:20}, (_, i) => ({
    idx: i,
    unlocked: i === 0,
    harvestedCount: 0,
    cropId: null,
    plantedAt: null,
    ready: false,
    fertilised: false,
    seeding: false,
    seedingStartedAt: null,
    seedingDuration: null,
    seedReady: false,
    heritage: false,
  })),
  walletConnected: false,
  walletAddress: null,
  cropHarvests: {},
  totalHarvestCount: 0,
  totalCoinsEarned: 0,
  achievementsEarned: [],
  lastEventTime: 0,
  merchantActive: false,
  merchantDeal: null,
  merchantExpiry: 0,
  wateringCanLastUsed: 0,
  compostCharges: 5,
  compostLastCharged: 0,
  fertiliseMode: false,
  standListings: [],
  standEnabled: true,
  standMaxSlots: 3,
  seedsCollectedTotal: 0,
  exoticMishapsTotal: 0,
  _exoticMishapsFix: 0,
  _exoticNearMisses: 0,
  _heritageCollected: 0,
};

export let G = null;

// ============================================================
// PERSISTENCE
// ============================================================
export function saveGame() {
  try {
    const saveData = {
      coins: G.coins, totalXP: G.totalXP, level: G.level, prestige: G.prestige,
      farmName: G.farmName, farmerName: G.farmerName, inventory: G.inventory,
      plots: G.plots.map(p => ({
        idx: p.idx, unlocked: p.unlocked, harvestedCount: p.harvestedCount,
        cropId: p.cropId, plantedAt: p.plantedAt, ready: p.ready,
        fertilised: p.fertilised, seeding: p.seeding || false,
        seedingStartedAt: p.seedingStartedAt || null,
        seedingDuration: p.seedingDuration || null,
        seedReady: p.seedReady || false, heritage: p.heritage || false,
      })),
      walletConnected: G.walletConnected, walletAddress: G.walletAddress,
      cropHarvests: G.cropHarvests, totalHarvestCount: G.totalHarvestCount,
      totalCoinsEarned: G.totalCoinsEarned, achievementsEarned: G.achievementsEarned,
      lastEventTime: G.lastEventTime, merchantExpiry: G.merchantExpiry,
      merchantDeal: G.merchantDeal,
      _merchantDealsAccepted: G._merchantDealsAccepted || 0,
      _eventsEncountered: G._eventsEncountered || 0,
      _eventsFixed: G._eventsFixed || 0,
      _sunBonusCount: G._sunBonusCount || 0,
      _beeBoostCount: G._beeBoostCount || 0,
      wateringCanLastUsed: G.wateringCanLastUsed,
      compostCharges: G.compostCharges, compostLastCharged: G.compostLastCharged,
      seedsCollectedTotal: G.seedsCollectedTotal || 0,
      exoticMishapsTotal: G.exoticMishapsTotal || 0,
      _exoticMishapsFix: G._exoticMishapsFix || 0,
      _exoticNearMisses: G._exoticNearMisses || 0,
      _heritageCollected: G._heritageCollected || 0,
      standListings: G.standListings || [],
      standEnabled: G.standEnabled !== false, standMaxSlots: G.standMaxSlots || 3,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
  } catch(e) {
    console.warn('Save failed:', e);
    notify('⚠️ Game save failed. Check your browser storage settings.', 'error');
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      G = JSON.parse(JSON.stringify(DEFAULT_STATE));
      G.coins = saved.coins ?? G.coins;
      G.totalXP = saved.totalXP ?? G.totalXP;
      G.level = saved.level ?? G.level;
      G.prestige = saved.prestige ?? 0;
      G.farmName = saved.farmName ?? 'My Farm';
      G.farmerName = saved.farmerName ?? 'Farmer';
      G.inventory = saved.inventory ?? {};
      G.walletConnected = saved.walletConnected ?? false;
      G.walletAddress = saved.walletAddress ?? null;
      G.cropHarvests = saved.cropHarvests ?? {};
      G.totalHarvestCount = saved.totalHarvestCount ?? 0;
      G.totalCoinsEarned = saved.totalCoinsEarned ?? 0;
      G.achievementsEarned = saved.achievementsEarned ?? [];
      G.lastEventTime = saved.lastEventTime ?? 0;
      G.merchantExpiry = saved.merchantExpiry ?? 0;
      G.merchantDeal = saved.merchantDeal ?? null;
      G.merchantActive = (saved.merchantDeal && saved.merchantExpiry > Date.now());
      G._merchantDealsAccepted = saved._merchantDealsAccepted ?? 0;
      G._eventsEncountered = saved._eventsEncountered ?? 0;
      G._eventsFixed = saved._eventsFixed ?? 0;
      G._sunBonusCount = saved._sunBonusCount ?? 0;
      G._beeBoostCount = saved._beeBoostCount ?? 0;
      G.wateringCanLastUsed = saved.wateringCanLastUsed ?? 0;
      G.compostCharges = Math.min(saved.compostCharges ?? 5, 5);
      G.compostLastCharged = saved.compostLastCharged ?? 0;
      G.seedsCollectedTotal = saved.seedsCollectedTotal ?? 0;
      G.exoticMishapsTotal = saved.exoticMishapsTotal ?? 0;
      G._exoticMishapsFix = saved._exoticMishapsFix ?? 0;
      G._exoticNearMisses = saved._exoticNearMisses ?? 0;
      G._heritageCollected = saved._heritageCollected ?? 0;
      G.standListings = saved.standListings ?? [];
      G.standEnabled = saved.standEnabled !== false;
      G.standMaxSlots = saved.standMaxSlots ?? 3;
      G.fertiliseMode = false;
      if (saved.plots) {
        saved.plots.forEach((sp, i) => {
          if (G.plots[i]) Object.assign(G.plots[i], {
            ...sp,
            fertilised: sp.fertilised ?? false,
            seeding: sp.seeding ?? false,
            seedingStartedAt: sp.seedingStartedAt ?? null,
            seedingDuration: sp.seedingDuration ?? null,
            seedReady: sp.seedReady ?? false,
            heritage: sp.heritage ?? false,
          });
        });
      }
      G.selectedCrop = null;
      G.shopExpanded = null;
      return;
    }
  } catch(e) {
    console.warn('Load failed:', e);
    notify('⚠️ Could not load saved game. Starting fresh.', 'error');
  }
  G = JSON.parse(JSON.stringify(DEFAULT_STATE));
}

// ============================================================
// MARKETPLACE STUB
// ============================================================
export function returnStandSeedsToStorage() {
  if (!G || !G.standListings || G.standListings.length === 0) return;
  G.standListings.forEach(listing => {
    const key = listing.heritage ? listing.cropId + '_heritage' : listing.cropId;
    G.inventory[key] = (G.inventory[key] || 0) + listing.qty;
  });
  G.standListings = [];
  saveGame();
}

// ============================================================
// GAME TICK
// ============================================================
export function tick() {
  if (!G) return;
  try {
    let changed = false;
    const now = Date.now();

    // Advance growing plots
    G.plots.forEach(plot => {
      if (plot.cropId && plot.plantedAt && !plot.ready && !plot.seeding) {
        const crop = CROP_MAP[plot.cropId];
        if (crop && (now - plot.plantedAt) >= crop.gameSecs * 1000) {
          plot.ready = true;
          changed = true;
        }
      }
    });

    // Advance seeding plots
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

    // Compost recharge
    if (G.compostCharges < 5 && G.compostLastCharged > 0) {
      const elapsed = (now - G.compostLastCharged) / 1000;
      if (elapsed >= 4 * 60) {
        G.compostCharges = Math.min(G.compostCharges + 1, 5);
        G.compostLastCharged = G.compostCharges < 5 ? now : 0;
        changed = true;
      }
    }

    checkRandomEvent();
    checkMerchant();

    if (changed) {
      saveGame();
      renderAll();
    }
  } catch(e) {
    console.error('Game tick error:', e);
  }
}

// ============================================================
// RANDOM EVENTS
// ============================================================
export function scheduleNextEvent() {
  const gap = EVENT_MIN_GAP + Math.random() * (EVENT_MAX_GAP - EVENT_MIN_GAP);
  _nextEventTime = Date.now() + gap;
}

export function checkRandomEvent() {
  if (!G) return;
  if (Date.now() < _nextEventTime) return;
  const overlay = document.getElementById('event-overlay');
  if (!overlay || !overlay.classList.contains('hidden')) return;
  if (G.merchantActive) return;

  const eligible = RANDOM_EVENTS.filter(e => e.canTrigger && e.canTrigger());
  if (eligible.length === 0) { scheduleNextEvent(); return; }

  const ev = eligible[Math.floor(Math.random() * eligible.length)];
  showEventModal(ev);
  scheduleNextEvent();
}

function showEventModal(ev) {
  const cost = ev.cost(G.level);
  const canAfford = G.coins >= cost;
  const descText = ev.desc.replace('{cost}', cost).replace('{steal}', '30%');

  document.getElementById('event-icon').textContent  = ev.icon;
  document.getElementById('event-title').textContent = ev.title;
  document.getElementById('event-desc').textContent  = descText;

  const btns = document.getElementById('event-btns');
  const fixLabel = ev.fixLabel(cost);
  let html = '<button class="event-btn-primary" id="ev-fix-btn"'
    + ((!canAfford && cost > 0) ? ' disabled' : '')
    + ' onclick="resolveEvent(true)">' + fixLabel + '</button>';
  if (ev.onIgnore !== null) {
    html += '<button class="event-btn-secondary" onclick="resolveEvent(false)">Ignore</button>';
  }
  btns.innerHTML = html;
  document.getElementById('event-overlay').classList.remove('hidden');
  G._eventsEncountered = (G._eventsEncountered || 0) + 1;
  window._currentEvent = { ev, cost };
}

// ============================================================
// MERCHANT SYSTEM
// ============================================================
export function scheduleNextMerchant() {
  const gap = MERCHANT_MIN_GAP + Math.random() * (MERCHANT_MAX_GAP - MERCHANT_MIN_GAP);
  _nextMerchantTime = Date.now() + gap;
}

export function checkMerchant() {
  const now = Date.now();
  if (G.merchantActive) {
    const remaining = Math.max(0, G.merchantExpiry - now);
    const timerEl = document.getElementById('merchant-timer');
    if (timerEl) timerEl.textContent = 'Leaves in ' + formatTime(remaining / 1000);
    if (remaining <= 0) { dismissMerchant(); return; }
    const dealBtn = document.getElementById('merchant-deal-btn');
    if (dealBtn && window._merchantCanAfford) {
      dealBtn.disabled = !window._merchantCanAfford();
    }
    return;
  }
  if (now < _nextMerchantTime) return;
  const overlay = document.getElementById('event-overlay');
  if (!overlay || !overlay.classList.contains('hidden')) return;
  spawnMerchant();
}

function spawnMerchant() {
  const available = MERCHANT_DEALS.filter(d => !d.canTrigger || d.canTrigger());
  if (available.length === 0) { scheduleNextMerchant(); return; }

  const dealType = available[Math.floor(Math.random() * available.length)];
  const deal = dealType.makeOffer();

  G.merchantActive = true;
  G.merchantDeal = { ...deal, execute: null };
  G.merchantExpiry = Date.now() + MERCHANT_DURATION;
  window._merchantExecute = deal.execute;
  window._merchantCanAfford = deal.canAfford;

  document.getElementById('merchant-title').textContent = dealType.title;
  document.getElementById('merchant-offer').textContent = deal.offerText;
  const dealBtn = document.getElementById('merchant-deal-btn');
  dealBtn.textContent = deal.btnText;
  dealBtn.disabled = !deal.canAfford();
  document.getElementById('merchant-banner').classList.remove('hidden');
  saveGame();
  scheduleNextMerchant();
}

export function acceptMerchantDeal() {
  if (!window._merchantExecute) return;
  if (window._merchantCanAfford && !window._merchantCanAfford()) {
    notify('🪙 Not enough coins for this deal!', 'error');
    return;
  }
  G._merchantDealsAccepted = (G._merchantDealsAccepted || 0) + 1;
  window._merchantExecute();
  window._merchantExecute = null;
  window._merchantCanAfford = null;
  G.merchantActive = false;
  G.merchantDeal = null;
  checkAchievements();
  saveGame();
  renderAll();
  document.getElementById('merchant-banner').classList.add('hidden');
}

export function dismissMerchant() {
  G.merchantActive = false;
  G.merchantDeal = null;
  window._merchantExecute = null;
  window._merchantCanAfford = null;
  document.getElementById('merchant-banner').classList.add('hidden');
  saveGame();
}

export function restoreMerchantIfActive() {
  if (!G.merchantActive || !G.merchantDeal || Date.now() >= G.merchantExpiry) {
    G.merchantActive = false;
    return;
  }
  const d = G.merchantDeal;
  switch (d.typeId) {
    case 'seed_discount':
      window._merchantCanAfford = () => G.coins >= d.dealPrice;
      window._merchantExecute = () => {
        G.coins -= d.dealPrice;
        G.inventory[d.cropId] = (G.inventory[d.cropId] || 0) + d.qty;
        notify('🛒 Got ' + d.qty + '× ' + CROP_MAP[d.cropId].name + ' at −' + d.discountPct + '%!', 'unlock');
      };
      break;
    case 'buy_coins':
      window._merchantCanAfford = () => G.coins >= d.cost;
      window._merchantExecute = () => {
        G.coins += (d.bonus - d.cost);
        notify('🍀 Lucky charm! +🪙' + (d.bonus - d.cost) + ' net gain!', 'unlock');
      };
      break;
    case 'xp_boost':
      window._merchantCanAfford = () => G.coins >= d.cost;
      window._merchantExecute = () => {
        G.coins -= d.cost;
        G.totalXP += d.xpGain;
        const prev = G.level;
        checkLevelUp();
        notify('📚 +' + d.xpGain + ' XP from the almanac!', 'harvest');
        if (G.level > prev) {
          const ld = getLevelData(G.level);
          setTimeout(() => notify('🎉 Level Up! ' + ld.title + ' (Lv' + G.level + ')!', 'levelup'), 300);
        }
      };
      break;
    case 'speed_tonic':
      window._merchantCanAfford = () => G.coins >= d.cost;
      window._merchantExecute = () => {
        G.coins -= d.cost;
        let boosted = 0;
        G.plots.forEach(p => {
          if (p.cropId && p.plantedAt && !p.ready) {
            const crop = CROP_MAP[p.cropId];
            const elapsed = Date.now() - p.plantedAt;
            const remaining = Math.max(0, crop.gameSecs * 1000 - elapsed);
            p.plantedAt -= Math.floor(remaining * (d.pct / 100));
            boosted++;
          }
        });
        saveGame(); renderPlots();
        notify('🧪 Tonic boosted ' + boosted + ' crop' + (boosted !== 1 ? 's' : '') + ' by ' + d.pct + '%!', 'harvest');
      };
      break;
    case 'exotic_seed':
      window._merchantCanAfford = () => G.coins >= d.dealPrice;
      window._merchantExecute = () => {
        G.coins -= d.dealPrice;
        G.inventory[d.cropId] = (G.inventory[d.cropId] || 0) + d.qty;
        notify('✨ Got ' + d.qty + '× ' + CROP_MAP[d.cropId].name + ' exotic seed' + (d.qty > 1 ? 's' : '') + '!', 'levelup');
      };
      break;
    default:
      window._merchantExecute = null;
      window._merchantCanAfford = null;
  }
  document.getElementById('merchant-title').textContent = '🧙 Wandering Merchant';
  document.getElementById('merchant-offer').textContent = d.offerText || 'Special offer available!';
  const dealBtn = document.getElementById('merchant-deal-btn');
  dealBtn.textContent = d.btnText || 'Take Deal';
  dealBtn.disabled = !window._merchantCanAfford || !window._merchantCanAfford();
  document.getElementById('merchant-banner').classList.remove('hidden');
}

// ============================================================
// FARM SCORE (also exported for leaderboard)
// ============================================================
export function calcFarmScore() {
  return Math.floor(Math.pow(G.level, 2) * 300 + G.coins * 1 + G.totalXP * 0.5);
}
