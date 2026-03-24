// ============================================================
// WALLET INTEGRATION
// ============================================================

import { G, saveGame } from './game-state.js';

// Uses window.notify and window.renderAll set up by main.js
// to avoid circular dependency with rendering.js

export function connectWallet() {
  if (window.platformSDK) {
    window.platformSDK.sendCommand({ type: 'connection', navbg: '#111D0F' });
    window.platformSDK.onCommand((data) => {
      if (data.type === 'connection-response') {
        if (data.payload && !data.payload.anonymous && data.payload.wallet) {
          G.walletConnected = true;
          G.walletAddress = data.payload.wallet.address;
          saveGame();
          if (window.renderAll) window.renderAll();
          if (window.notify) window.notify('✅ Wallet connected!', 'unlock');
        } else {
          if (window.notify) window.notify('👤 Running anonymously — coins only mode.', 'error');
          G.walletConnected = false;
          G.walletAddress = null;
        }
      }
    });
  } else {
    console.log('Dev mode: no Metanet SDK. Running in coins-only mode.');
    if (window.notify) window.notify('🔧 Wallet requires Metanet.page. Running in coins-only mode.', 'error');
    G.walletConnected = false;
    G.walletAddress = null;
  }
}

export function disconnectWallet() {
  G.walletConnected = false;
  G.walletAddress = null;
  saveGame();
  if (window.renderAll) window.renderAll();
  if (window.notify) window.notify('🔌 Wallet disconnected.', 'error');
}
