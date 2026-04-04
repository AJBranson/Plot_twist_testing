// ============================================================
// GAME STATE MANAGEMENT
// ============================================================

import { SAVE_KEY, GUEST_SAVE_KEY, COMPOST_MAX_CHARGES, CROP_MAP, EVENT_MIN_GAP, EVENT_MAX_GAP, RANDOM_EVENTS,
         MERCHANT_MIN_GAP, MERCHANT_MAX_GAP, MERCHANT_DURATION, MERCHANT_DEALS } from './constants.js';
import { getLevelData, checkLevelUp, formatTime } from './utils.js';
import { fetchCloudSave, getWalletCacheKey, isCloudSaveAvailable, upsertCloudSave } from './cloud-save.js';

// ── Deferred UI handlers (avoids circular imports) ──────────
let _notifyFn = null;
let _renderAllFn = null;
let _renderPlotsFn = null;
let _checkAchievementsFn = null;
let _chooseSaveConflictFn = null;

export function setUIHandlers(notifyFn, renderAllFn, renderPlotsFn, checkAchievementsFn, chooseSaveConflictFn = null) {
  _notifyFn = notifyFn;
  _renderAllFn = renderAllFn;
  _renderPlotsFn = renderPlotsFn;
  _checkAchievementsFn = checkAchievementsFn;
  _chooseSaveConflictFn = chooseSaveConflictFn;
}

export function notify(msg, type) {
  if (_notifyFn) _notifyFn(msg, type);
  else console.log('[notification]', msg);
}

function renderAll() { if (_renderAllFn) _renderAllFn(); }
function renderPlots() { if (_renderPlotsFn) _renderPlotsFn(); }
function checkAchievements() { if (_checkAchievementsFn) _checkAchievementsFn(); }

function safeParseJSON(raw, fallback = null) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function isStorageAvailable() {
  try {
    const testKey = '__pt_save_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

// Global event/merchant timers
let _nextEventTime = 0;
let _nextMerchantTime = 0;
let _cloudSaveTimer = null;
let _cloudSavePayload = null;
let _cloudSaveInFlight = false;
let _cloudSaveQueued = false;
let _activeProfile = 'guest';
let _lastCloudSaveAt = 0;
let _lastCloudSaveError = null;
let _lastCloudLoadError = null;
const SAVE_CONFLICT_CHOICE_PREFIX = SAVE_KEY + '_conflict_choice_';

export const DEFAULT_STATE = {
  coins: 2,
  totalXP: 0,
  level: 1,
  prestige: 0,
  personalBestScore: 0,
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
  compostCharges: COMPOST_MAX_CHARGES,
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
  standUnlocked: false,
};

export function hasUnlockedVegeStand() {
  if (!G) return false;
  const exoticInStorage = Object.keys(G.inventory || {}).some(key => {
    const count = G.inventory[key] || 0;
    if (count <= 0) return false;
    const baseKey = key.replace(/_heritage$/, '');
    return CROP_MAP[baseKey]?.exotic;
  });
  return G.standUnlocked || exoticInStorage || ((G._merchantDealsAccepted || 0) >= 40);
}

export function ensureVegeStandUnlocked() {
  if (!G) return;
  const shouldUnlock = hasUnlockedVegeStand();
  if (shouldUnlock && !G.standUnlocked) {
    G.standUnlocked = true;
    saveGame();
  }
}

export let G = null;

function freshState() {
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

function safeLocalGet(key) {
  if (!isStorageAvailable()) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalSet(key, value) {
  if (!isStorageAvailable()) return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeLocalRemove(key) {
  if (!isStorageAvailable()) return;
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore storage cleanup failures
  }
}

function getSaveConflictChoiceKey(address) {
  return SAVE_CONFLICT_CHOICE_PREFIX + String(address || '').trim().toLowerCase();
}

function readSaveConflictChoice(address) {
  const raw = safeLocalGet(getSaveConflictChoiceKey(address));
  return raw === 'cloud' || raw === 'local' ? raw : null;
}

function writeSaveConflictChoice(address, choice) {
  if (!address || (choice !== 'cloud' && choice !== 'local')) return;
  safeLocalSet(getSaveConflictChoiceKey(address), choice);
}

function calcStateScore(state) {
  if (!state) return 0;
  return Math.floor(Math.pow(state.level || 1, 2) * 300 + (state.coins || 0) + (state.totalXP || 0) * 0.5);
}

function normalizeSaveForCompare(saved) {
  if (!saved) return null;
  const normalized = JSON.parse(JSON.stringify(saved));
  delete normalized.walletConnected;
  delete normalized.walletAddress;
  return normalized;
}

function savesDiffer(a, b) {
  return JSON.stringify(normalizeSaveForCompare(a)) !== JSON.stringify(normalizeSaveForCompare(b));
}

async function chooseSaveConflict() {
  if (!_chooseSaveConflictFn) return 'cloud';
  return _chooseSaveConflictFn(
    'Choose Save To Use',
    'We found both a cloud save for this wallet and a local save on this device. Pick which farm should become your wallet save. This choice will be remembered for this wallet on this device.',
    'Use Cloud Save',
    'Use This Device Save'
  );
}

function buildSaveData(state = G) {
  if (!state) return null;
  return {
    coins: state.coins,
    totalXP: state.totalXP,
    level: state.level,
    prestige: state.prestige,
    personalBestScore: state.personalBestScore,
    farmName: state.farmName,
    farmerName: state.farmerName,
    inventory: state.inventory,
    plots: state.plots.map(p => ({
      idx: p.idx,
      unlocked: p.unlocked,
      harvestedCount: p.harvestedCount,
      cropId: p.cropId,
      plantedAt: p.plantedAt,
      ready: p.ready,
      fertilised: p.fertilised,
      seeding: p.seeding || false,
      seedingStartedAt: p.seedingStartedAt || null,
      seedingDuration: p.seedingDuration || null,
      seedReady: p.seedReady || false,
      heritage: p.heritage || false,
    })),
    walletConnected: state.walletConnected,
    walletAddress: state.walletAddress,
    cropHarvests: state.cropHarvests,
    totalHarvestCount: state.totalHarvestCount,
    totalCoinsEarned: state.totalCoinsEarned,
    achievementsEarned: state.achievementsEarned,
    lastEventTime: state.lastEventTime,
    merchantExpiry: state.merchantExpiry,
    merchantDeal: state.merchantDeal,
    _merchantDealsAccepted: state._merchantDealsAccepted || 0,
    _eventsEncountered: state._eventsEncountered || 0,
    _eventsFixed: state._eventsFixed || 0,
    _sunBonusCount: state._sunBonusCount || 0,
    _beeBoostCount: state._beeBoostCount || 0,
    wateringCanLastUsed: state.wateringCanLastUsed,
    compostCharges: Math.min(state.compostCharges, COMPOST_MAX_CHARGES),
    compostLastCharged: state.compostLastCharged,
    seedsCollectedTotal: state.seedsCollectedTotal || 0,
    exoticMishapsTotal: state.exoticMishapsTotal || 0,
    _exoticMishapsFix: state._exoticMishapsFix || 0,
    _exoticNearMisses: state._exoticNearMisses || 0,
    _heritageCollected: state._heritageCollected || 0,
    standListings: state.standListings || [],
    standEnabled: state.standEnabled !== false,
    standUnlocked: state.standUnlocked !== false,
    standMaxSlots: state.standMaxSlots || 3,
  };
}

function applySaveData(saved, { walletConnected = false, walletAddress = null } = {}) {
  const next = freshState();
  if (!saved) {
    next.walletConnected = walletConnected;
    next.walletAddress = walletAddress;
    G = next;
    syncPersonalBestScore({ notifyOnChange: false, queueEffects: false });
    return G;
  }

  next.coins = saved.coins ?? next.coins;
  next.totalXP = saved.totalXP ?? next.totalXP;
  next.level = saved.level ?? next.level;
  next.prestige = saved.prestige ?? 0;
  next.personalBestScore = saved.personalBestScore ?? 0;
  next.farmName = saved.farmName ?? 'My Farm';
  next.farmerName = saved.farmerName ?? 'Farmer';
  next.inventory = saved.inventory ?? {};
  next.walletConnected = walletConnected;
  next.walletAddress = walletAddress;
  next.cropHarvests = saved.cropHarvests ?? {};
  next.totalHarvestCount = saved.totalHarvestCount ?? 0;
  next.totalCoinsEarned = saved.totalCoinsEarned ?? 0;
  next.achievementsEarned = saved.achievementsEarned ?? [];
  next.lastEventTime = saved.lastEventTime ?? 0;
  next.merchantExpiry = saved.merchantExpiry ?? 0;
  next.merchantDeal = saved.merchantDeal ?? null;
  next.merchantActive = !!(saved.merchantDeal && saved.merchantExpiry > Date.now());
  next._merchantDealsAccepted = saved._merchantDealsAccepted ?? 0;
  next._eventsEncountered = saved._eventsEncountered ?? 0;
  next._eventsFixed = saved._eventsFixed ?? 0;
  next._sunBonusCount = saved._sunBonusCount ?? 0;
  next._beeBoostCount = saved._beeBoostCount ?? 0;
  next.wateringCanLastUsed = saved.wateringCanLastUsed ?? 0;
  next.compostCharges = Math.min(saved.compostCharges ?? COMPOST_MAX_CHARGES, COMPOST_MAX_CHARGES);
  next.compostLastCharged = saved.compostLastCharged ?? 0;
  next.seedsCollectedTotal = saved.seedsCollectedTotal ?? 0;
  next.exoticMishapsTotal = saved.exoticMishapsTotal ?? 0;
  next._exoticMishapsFix = saved._exoticMishapsFix ?? 0;
  next._exoticNearMisses = saved._exoticNearMisses ?? 0;
  next._heritageCollected = saved._heritageCollected ?? 0;
  next.standListings = saved.standListings ?? [];
  next.standEnabled = saved.standEnabled !== false;
  next.standUnlocked = saved.standUnlocked !== false;
  next.standMaxSlots = Number.isInteger(saved.standMaxSlots) ? saved.standMaxSlots : 3;
  next.fertiliseMode = false;

  if (Array.isArray(saved.plots)) {
    saved.plots.forEach((sp, i) => {
      if (next.plots[i]) {
        Object.assign(next.plots[i], {
          ...sp,
          fertilised: sp.fertilised ?? false,
          seeding: sp.seeding ?? false,
          seedingStartedAt: sp.seedingStartedAt ?? null,
          seedingDuration: sp.seedingDuration ?? null,
          seedReady: sp.seedReady ?? false,
          heritage: sp.heritage ?? false,
        });
      }
    });
  }

  G = next;
  syncPersonalBestScore({ notifyOnChange: false, queueEffects: false });
  return G;
}

function loadLocalSnapshot(primaryKey, fallbackKey = null) {
  const raw = safeLocalGet(primaryKey) || (fallbackKey ? safeLocalGet(fallbackKey) : null);
  if (!raw) return null;
  const parsed = safeParseJSON(raw);
  if (!parsed) {
    safeLocalRemove(primaryKey);
    if (fallbackKey) safeLocalRemove(fallbackKey);
    return null;
  }
  return parsed;
}

function writeGuestSnapshot(saveData) {
  if (!saveData) return;
  safeLocalSet(GUEST_SAVE_KEY, JSON.stringify(saveData));
}

function writeWalletCache(address, saveData) {
  if (!address || !saveData) return;
  safeLocalSet(getWalletCacheKey(address), JSON.stringify(saveData));
}

function readWalletCache(address) {
  if (!address) return null;
  return loadLocalSnapshot(getWalletCacheKey(address));
}

function hasMeaningfulProgress(state = G) {
  if (!state) return false;
  if ((state.coins ?? 0) > DEFAULT_STATE.coins) return true;
  if ((state.totalXP ?? 0) > DEFAULT_STATE.totalXP) return true;
  if ((state.level ?? 1) > DEFAULT_STATE.level) return true;
  if ((state.totalHarvestCount ?? 0) > 0) return true;
  if ((state.personalBestScore ?? 0) > calcStateScore(state)) return true;
  return state.plots.some((plot, idx) => idx > 0 && (plot.unlocked || plot.harvestedCount > 0 || plot.cropId));
}

function scheduleCloudSave() {
  if (_cloudSaveTimer) clearTimeout(_cloudSaveTimer);
  _cloudSaveTimer = setTimeout(flushCloudSave, 900);
}

async function flushCloudSave() {
  _cloudSaveTimer = null;
  if (_cloudSaveInFlight || !_cloudSavePayload || !G?.walletConnected || !G?.walletAddress) return;

  _cloudSaveInFlight = true;
  const payload = _cloudSavePayload;
  _cloudSavePayload = null;

  const { error } = await upsertCloudSave(payload);
  _cloudSaveInFlight = false;

  if (error) {
    _lastCloudSaveError = error.message || 'Cloud save failed.';
    notify('⚠️ Cloud save unavailable. Progress remains cached on this device.', 'warning');
  } else {
    _lastCloudSaveError = null;
    _lastCloudSaveAt = Date.now();
  }

  if (_cloudSaveQueued && _cloudSavePayload) {
    _cloudSaveQueued = false;
    scheduleCloudSave();
  }
}

function queueCloudSave(saveData) {
  if (!G?.walletConnected || !G?.walletAddress || !isCloudSaveAvailable()) return;
  _cloudSavePayload = {
    walletAddress: G.walletAddress,
    farmerName: G.farmerName,
    farmName: G.farmName,
    saveData,
  };
  if (_cloudSaveInFlight) {
    _cloudSaveQueued = true;
    return;
  }
  _cloudSaveQueued = false;
  scheduleCloudSave();
}

export function getSaveKey() {
  return GUEST_SAVE_KEY;
}

export function getPersistenceProfile() {
  return _activeProfile;
}

export function getPersistenceSummary() {
  if (G?.walletConnected && G?.walletAddress) {
    if (_lastCloudSaveError) return 'Cloud sync paused';
    if (_lastCloudSaveAt > 0) return 'Cloud save active';
    return 'Cloud save starting';
  }
  return 'Local save only';
}

// ============================================================
// PERSISTENCE
// ============================================================
export function saveGame() {
  if (!G) {
    console.warn('saveGame called before state was initialized.');
    return;
  }
  syncPersonalBestScore({ notifyOnChange: false, queueEffects: true });
  if (!isStorageAvailable()) {
    notify('⚠️ Browser storage unavailable; progress cannot be saved.', 'error');
    return;
  }

  try {
    const saveData = buildSaveData();
    if (G.walletConnected && G.walletAddress) {
      _activeProfile = 'wallet';
      writeWalletCache(G.walletAddress, saveData);
      queueCloudSave(saveData);
    } else {
      _activeProfile = 'guest';
      writeGuestSnapshot(saveData);
    }
  } catch(e) {
    console.warn('Save failed:', e);
    notify('⚠️ Game save failed. Check your browser storage settings.', 'error');
  }
}

export function loadGame() {
  if (!isStorageAvailable()) {
    notify('⚠️ Browser storage unavailable; progress cannot be loaded.', 'error');
    G = freshState();
    _activeProfile = 'guest';
    syncPersonalBestScore({ notifyOnChange: false, queueEffects: false });
    return;
  }

  try {
    const guestSave = loadLocalSnapshot(GUEST_SAVE_KEY, SAVE_KEY);
    if (guestSave) {
      applySaveData(guestSave, { walletConnected: false, walletAddress: null });
      _activeProfile = 'guest';
      return;
    }
  } catch(e) {
    console.warn('Load failed:', e);
    notify('⚠️ Could not load saved game. Starting fresh.', 'error');
  }

  G = freshState();
  _activeProfile = 'guest';
  syncPersonalBestScore({ notifyOnChange: false, queueEffects: false });
}

export async function switchToWalletProfile(walletAddress) {
  if (!walletAddress) return false;

  const liveGuestSnapshot = (!G?.walletConnected && _activeProfile === 'guest') ? buildSaveData(G) : null;
  const cachedWalletSave = readWalletCache(walletAddress);
  const { data: cloudRow, error: cloudError } = await fetchCloudSave(walletAddress);
  _lastCloudLoadError = cloudError ? (cloudError.message || 'Cloud load failed.') : null;

  const hasLocalGuestConflict = !!(cloudRow?.save_data && liveGuestSnapshot && hasMeaningfulProgress(liveGuestSnapshot) && savesDiffer(cloudRow.save_data, liveGuestSnapshot));
  if (hasLocalGuestConflict) {
    let choice = readSaveConflictChoice(walletAddress);
    if (!choice) {
      const selected = await chooseSaveConflict();
      choice = selected === 'local' ? 'local' : selected === 'secondary' ? 'local' : 'cloud';
      writeSaveConflictChoice(walletAddress, choice);
    }

    if (choice === 'local') {
      applySaveData(liveGuestSnapshot, { walletConnected: true, walletAddress });
      _activeProfile = 'wallet';
      writeWalletCache(walletAddress, buildSaveData());
      queueCloudSave(buildSaveData());
      notify('☁️ Using this device farm for your wallet save.', 'unlock');
      return true;
    }
  }

  if (cloudRow?.save_data) {
    applySaveData(cloudRow.save_data, { walletConnected: true, walletAddress });
    writeWalletCache(walletAddress, buildSaveData());
    _activeProfile = 'wallet';
    _lastCloudSaveError = null;
    _lastCloudSaveAt = Date.now();
    return true;
  }

  if (cachedWalletSave) {
    applySaveData(cachedWalletSave, { walletConnected: true, walletAddress });
    _activeProfile = 'wallet';
    queueCloudSave(buildSaveData());
    return true;
  }

  if (liveGuestSnapshot && hasMeaningfulProgress(G)) {
    applySaveData(liveGuestSnapshot, { walletConnected: true, walletAddress });
    _activeProfile = 'wallet';
    writeWalletCache(walletAddress, buildSaveData());
    queueCloudSave(buildSaveData());
    notify('☁️ Guest farm linked to your wallet and queued for cloud save.', 'unlock');
    return true;
  }

  applySaveData(null, { walletConnected: true, walletAddress });
  _activeProfile = 'wallet';
  writeWalletCache(walletAddress, buildSaveData());
  queueCloudSave(buildSaveData());
  return true;
}

export function switchToGuestProfile() {
  const guestSave = loadLocalSnapshot(GUEST_SAVE_KEY, SAVE_KEY);
  applySaveData(guestSave, { walletConnected: false, walletAddress: null });
  _activeProfile = 'guest';
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
    if (G.compostCharges < COMPOST_MAX_CHARGES && G.compostLastCharged > 0) {
      const elapsed = (now - G.compostLastCharged) / 1000;
      if (elapsed >= 4 * 60) {
        G.compostCharges = Math.min(G.compostCharges + 1, COMPOST_MAX_CHARGES);
        G.compostLastCharged = G.compostCharges < COMPOST_MAX_CHARGES ? now : 0;
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

export function getPersonalBestScore() {
  if (!G) return 0;
  return Math.max(G.personalBestScore || 0, calcFarmScore());
}

export function syncPersonalBestScore(options = {}) {
  if (!G) return 0;
  const { notifyOnChange = false, queueEffects = true } = options;
  const previousBest = G.personalBestScore || 0;
  const best = getPersonalBestScore();
  G.personalBestScore = best;
  if (best > previousBest && queueEffects) {
    G._personalBestPulseToken = (G._personalBestPulseToken || 0) + 1;
    G._personalBestPendingNotify = true;
  }
  if (notifyOnChange && G._personalBestPendingNotify) {
    notify('🏆 New personal best: ' + best.toLocaleString() + '!', 'levelup');
    G._personalBestPendingNotify = false;
  }
  return best;
}
