// main.js - Main initialization and game loop for BSV Farm Game

import { MARKETPLACE_ENABLED } from './constants.js';

import {
  G,
  loadGame,
  saveGame,
  setUIHandlers,
  // returnStandSeedsToStorage,
  // scheduleNextEvent,
  // scheduleNextMerchant,
  // restoreMerchantIfActive,
  tick
} from './game-state.js';

import { connectWallet, disconnectWallet } from './wallet.js';
import { buildAllAchievements, checkAchievements } from './achievements.js';

import {
  renderAll,
  renderPlots,
  renderCompost,
  closeJournal,
  notify
} from './rendering.js';

// Initialization function
function init() {
  // Wire up UI handlers to avoid circular dependencies
  setUIHandlers(notify, renderAll, renderPlots);
  
  loadGame();

  // Try to connect wallet if platform SDK present
  if (window.platformSDK) {
    connectWallet();
  }

  // TODO: buildAllAchievements();
  // TODO: checkAchievements(); // evaluate on load (for returning players)

  // TODO: Return escrowed stand seeds if marketplace is disabled
  // if (!MARKETPLACE_ENABLED) {
  //   returnStandSeedsToStorage();
  // } else {
    // Show stand area
    const standArea = document.getElementById('vege-stand-area');
    if (standArea) standArea.style.display = '';
  // }

  renderAll();

  // TODO: Schedule first event and merchant
  // scheduleNextEvent();
  // scheduleNextMerchant();
  // restoreMerchantIfActive();

  // Close journal on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeJournal();
      document.getElementById('event-overlay').classList.add('hidden');
      const hf = document.getElementById('harvest-fork-overlay');
      if (hf) hf.remove();
      if (G.fertiliseMode) {
        G.fertiliseMode = false;
        renderPlots();
        renderCompost();
      }
    }
  });

  // ── Pinch-zoom stuck overlay fix ────────────────────────────
  // Pinch gestures fire resize and can accidentally trigger a tap
  // on a market listing row, creating a buy-confirm overlay that
  // then sits invisibly blocking all further interaction.
  // Two defences:
  //   1. Track active touch count — if >1 fingers are down, flag
  //      a brief suppression window so the subsequent click is ignored.
  //   2. On any resize (which pinch-zoom always fires), dismiss any
  //      orphaned buy-confirm overlay and clear pending state.

  let _touchCount = 0;
  let _suppressNextClick = false;

  document.addEventListener('touchstart', e => {
    _touchCount = e.touches.length;
    if (_touchCount > 1) {
      _suppressNextClick = true;
    }
  }, { passive: true });

  document.addEventListener('touchend', e => {
    _touchCount = e.touches.length;
    // Keep suppression active for 400ms after pinch ends
    if (_suppressNextClick) {
      setTimeout(() => { _suppressNextClick = false; }, 400);
    }
  }, { passive: true });

  // Intercept clicks on market listing buy buttons during/after pinch
  document.addEventListener('click', e => {
    if (_suppressNextClick && e.target.closest && e.target.closest('.market-buy-btn')) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }, true);

  // On resize (fired by pinch-zoom), dismiss any stuck buy overlay
  window.addEventListener('resize', () => {
    const overlay = document.getElementById('buy-confirm-overlay');
    if (overlay) {
      overlay.remove();
      window._pendingBuyListing = null;
    }
  });

  // Tick every second
  setInterval(tick, 1000);

  // Also re-render shop when coins change (handled in renderAll already)
}

// Run initialization
init();

// Export for potential use by other modules
export { init };