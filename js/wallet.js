// ============================================================
// WALLET INTEGRATION
// ============================================================

import { G, saveGame } from './game-state.js';

// Uses window.notify and window.renderAll set up by main.js
// to avoid circular dependency with rendering.js

let _walletListenerRegistered = false;

function notifyWallet(message, type = 'info') {
  if (window.notify) window.notify(message, type);
  else console.log('[wallet]', message);
}

function updateWalletState(connected, address = null, notifyMessage = null, notifyType = 'info') {
  if (!G) {
    console.warn('Wallet state update attempted before game state was initialized.');
    return;
  }

  G.walletConnected = connected;
  G.walletAddress = address;
  saveGame();
  if (window.renderAll) window.renderAll();
  if (notifyMessage) notifyWallet(notifyMessage, notifyType);
}

export function isWalletAvailable() {
  return !!(window.platformSDK && typeof window.platformSDK.sendCommand === 'function' && typeof window.platformSDK.onCommand === 'function');
}

function handleConnectionResponse(data) {
  if (!data || data.type !== 'connection-response') return;

  const payload = data.payload || {};
  const wallet = payload.wallet;

  if (payload.error) {
    updateWalletState(false, null, `⚠️ Wallet connection failed: ${payload.error}`, 'error');
    return;
  }

  if (wallet && !payload.anonymous) {
    updateWalletState(true, wallet.address, '✅ Wallet connected!', 'unlock');
    return;
  }

  updateWalletState(false, null, '👤 Running anonymously — coins only mode.', 'warning');
}

export function connectWallet() {
  if (!window.platformSDK) {
    console.log('Dev mode: no Metanet SDK. Running in coins-only mode.');
    updateWalletState(false, null, '🔧 Wallet requires Metanet.page. Running in coins-only mode.', 'warning');
    return;
  }

  if (typeof window.platformSDK.sendCommand !== 'function') {
    notifyWallet('⚠️ Wallet SDK is unavailable in this environment.', 'error');
    return;
  }

  if (typeof window.platformSDK.onCommand !== 'function') {
    notifyWallet('⚠️ Wallet SDK does not support event callbacks.', 'error');
    return;
  }

  if (!_walletListenerRegistered) {
    try {
      window.platformSDK.onCommand(handleConnectionResponse);
      _walletListenerRegistered = true;
    } catch (e) {
      console.warn('Failed to register wallet command listener:', e);
      notifyWallet('⚠️ Unable to register wallet event listener.', 'error');
      return;
    }
  }

  try {
    window.platformSDK.sendCommand({ type: 'connection', navbg: '#111D0F' });
  } catch (e) {
    console.warn('Wallet connection command failed:', e);
    notifyWallet('⚠️ Wallet connection request failed. Please retry.', 'error');
  }
}

export function disconnectWallet() {
  if (!G) {
    console.warn('disconnectWallet called before game state initialization.');
    return;
  }

  G.walletConnected = false;
  G.walletAddress = null;
  saveGame();
  if (window.renderAll) window.renderAll();
  notifyWallet('🔌 Wallet disconnected.', 'info');
}
