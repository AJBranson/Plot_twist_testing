// ============================================================
// WALLET INTEGRATION
// ============================================================

import { G, saveGame } from './game-state.js';
import { renderAll, notify } from './rendering.js';

export function connectWallet() {
  if (window.platformSDK) {
    window.platformSDK.sendCommand({ type: 'connection', navbg: '#111D0F' });
    window.platformSDK.onCommand((data) => {
      if (data.type === 'connection-response') {
        if (data.payload && !data.payload.anonymous && data.payload.wallet) {
          G.walletConnected = true;
          G.walletAddress = data.payload.wallet.address;
          saveGame();
          renderAll();
          notify('✅ Wallet connected!', 'unlock');
        } else {
          notify('👤 Running anonymously — coins only mode.', 'error');
          setPlayerState('anonymous');
        }
      }
    });
  } else {
    console.log('Dev mode: no Metanet SDK. Running in coins-only mode.');
    notify('🔧 Wallet connection requires Metanet.page environment. Running in coins-only mode.', 'error');
    setPlayerState('anonymous');
  }
}

export function disconnectWallet() {
  G.walletConnected = false;
  G.walletAddress = null;
  saveGame();
  renderAll();
  notify('🔌 Wallet disconnected.', 'error');
}

function setPlayerState(state) {
  if (state === 'anonymous') {
    G.walletConnected = false;
    G.walletAddress = null;
  }
}