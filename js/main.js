// ============================================================
// MAIN — initialization and window global wiring
// ============================================================
// The HTML uses onclick="functionName()" inline handlers.
// ES modules are scoped, so every function the HTML calls
// must be explicitly assigned to window here.
// ============================================================

import { MARKETPLACE_ENABLED } from './constants.js';
import { G, loadGame, saveGame, setUIHandlers, scheduleNextEvent,
         scheduleNextMerchant, restoreMerchantIfActive, tick,
         acceptMerchantDeal, dismissMerchant } from './game-state.js';
import { connectWallet, disconnectWallet } from './wallet.js';
import { buildAllAchievements, checkAchievements } from './achievements.js';
import { cropArt, CROP_THEME, wateringCanCharge, getLevelData, checkLevelUp } from './utils.js';

import {
  renderAll, renderPlots, renderPlotsOnly, renderStorage, renderShop, renderCompost,
  renderHeading, renderWateringCan, notify, shakeStat, showFloatLabel,
  openJournal, closeJournal, showJTab, closeConfirm, showConfirm,
} from './rendering.js';

import {
  toggleShopCard, shopChangeQty, buySeeds, buySeedsBSV,
  clearSelectedCrop, selectFromStorage, tryPlant, tryUnlockPlot,
  unlockPlotBSV, harvestCrop, useWateringCan, toggleFertiliseMode,
  applyFertiliser, startSeedSaving, collectSeeds, showHarvestFork,
  doPrestige, startEditName, resolveEvent, applyMishapPartial, applyMishapTotal,
  getSeedingPlotsAtRisk,
} from './game.js';

import { lbShareScore } from './leaderboard.js';
import { setMarketFilter, setMarketSort, refreshMarket, executePurchase,
         listSeeds, cancelListing, showBuyConfirm, openVegeStand,
         toggleStandOpen, showListingModal, updateListingModal, changeListingQty, confirmListing } from './marketplace.js';

// ── Expose window globals ─────────────────────────────────
// Rendering helpers (used by game.js via window.*)
window.notify          = notify;
window.renderAll       = renderAll;
window.renderPlots     = renderPlots;
window.renderStorage   = renderStorage;
window.renderShop      = renderShop;
window.renderCompost   = renderCompost;
window.renderHeading   = renderHeading;
window.renderWateringCan = renderWateringCan;
window.shakeStat       = shakeStat;
window.showFloatLabel  = showFloatLabel;
window.showConfirm     = showConfirm;
window.closeConfirm    = closeConfirm;

// Game state
window.G               = null;   // set after loadGame below
window.saveGame        = saveGame;
window.getLevelData    = getLevelData;
window.checkLevelUp    = checkLevelUp;

// Crop art helpers (used by game.js for harvest-fork overlay)
window._cropArt        = cropArt;
window._CROP_THEME     = CROP_THEME;
window._wateringCanCharge = wateringCanCharge;

// Wallet
window.connectWallet   = connectWallet;
window.disconnectWallet= disconnectWallet;

// Journal / UI
window.openJournal     = openJournal;
window.closeJournal    = closeJournal;
window.showJTab        = showJTab;

// Shop
window.toggleShopCard  = toggleShopCard;
window.shopChangeQty   = shopChangeQty;
window.buySeeds        = buySeeds;
window.buySeedsBSV     = buySeedsBSV;

// Storage / planting
window.clearSelectedCrop = clearSelectedCrop;
window.selectFromStorage = selectFromStorage;
window.tryPlant          = tryPlant;
window.tryUnlockPlot     = tryUnlockPlot;
window.unlockPlotBSV     = unlockPlotBSV;

// Harvest / farm
window.harvestCrop       = harvestCrop;
window.useWateringCan    = useWateringCan;
window.toggleFertiliseMode = toggleFertiliseMode;
window.applyFertiliser   = applyFertiliser;
window.doPrestige        = doPrestige;
window.startEditName     = startEditName;
window.resolveEvent      = resolveEvent;

// Seed saving
window.startSeedSaving   = startSeedSaving;
window.collectSeeds      = collectSeeds;
window.showHarvestFork   = showHarvestFork;
window.applyMishapPartial = applyMishapPartial;
window.applyMishapTotal   = applyMishapTotal;
window.getSeedingPlotsAtRisk = getSeedingPlotsAtRisk;

// Merchant / events
window.acceptMerchantDeal = acceptMerchantDeal;
window.dismissMerchant    = dismissMerchant;

// Leaderboard
window.lbShareScore       = lbShareScore;

// Marketplace
window.setMarketFilter    = setMarketFilter;
window.setMarketSort      = setMarketSort;
window.refreshMarket      = refreshMarket;
window.executePurchase    = executePurchase;
window.listSeeds          = listSeeds;
window.cancelListing      = cancelListing;
window.showBuyConfirm     = showBuyConfirm;
window.openVegeStand      = openVegeStand;
window.toggleStandOpen    = toggleStandOpen;
window.showListingModal   = showListingModal;
window.updateListingModal = updateListingModal;
window.changeListingQty   = changeListingQty;
window.confirmListing     = confirmListing;
// ── Initialization ────────────────────────────────────────
function init() {
  // Wire deferred UI handlers (breaks circular game-state ↔ rendering)
  setUIHandlers(notify, renderAll, renderPlots, checkAchievements);

  loadGame();

  // Now G is populated — expose on window for constants.js callbacks
  window.G = G;

  // Build achievement list
  buildAllAchievements();

  // Connect wallet if inside Metanet.page
  if (window.platformSDK) connectWallet();

  // Show / hide vege stand
  const standArea = document.getElementById('vege-stand-area');
  if (standArea) standArea.style.display = MARKETPLACE_ENABLED ? '' : 'none';

  // First render
  renderAll();

  // Check achievements for returning players
  checkAchievements();

  // Start events & merchant scheduling
  scheduleNextEvent();
  scheduleNextMerchant();
  restoreMerchantIfActive();

  // ── Keyboard shortcuts ──────────────────────────────────
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeJournal();
      document.getElementById('event-overlay')?.classList.add('hidden');
      document.getElementById('confirm-overlay')?.classList.add('hidden');
      document.getElementById('harvest-fork-overlay')?.remove();
      if (G.fertiliseMode) {
        G.fertiliseMode = false;
        renderPlots();
        renderCompost();
      }
    }
  });

  // ── Pinch-zoom stuck overlay fix ────────────────────────
  let _touchCount = 0;
  let _suppressNextClick = false;

  document.addEventListener('touchstart', e => {
    _touchCount = e.touches.length;
    if (_touchCount > 1) _suppressNextClick = true;
  }, { passive: true });

  document.addEventListener('touchend', e => {
    _touchCount = e.touches.length;
    if (_suppressNextClick) setTimeout(() => { _suppressNextClick = false; }, 400);
  }, { passive: true });

  document.addEventListener('click', e => {
    if (_suppressNextClick && e.target.closest?.('.market-buy-btn')) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }, true);

  window.addEventListener('resize', () => {
    const overlay = document.getElementById('buy-confirm-overlay');
    if (overlay) { overlay.remove(); window._pendingBuyListing = null; }
  });

  // ── Game tick (1 s) ─────────────────────────────────────
  setInterval(() => {
    if (!G) return;   // guard: G not yet initialized
    window.G = G;     // keep window.G in sync with module-level G
    tick();
    renderPlotsOnly();
    renderWateringCan();
    renderCompost();
  }, 1000);
}

init();
