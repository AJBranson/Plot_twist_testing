// ============================================================
// WALLET INTEGRATION
// ============================================================

import { G, saveGame, switchToGuestProfile, switchToWalletProfile } from './game-state.js';

// Uses window.notify and window.renderAll set up by main.js
// to avoid circular dependency with rendering.js

let _walletListenerRegistered = false;
let _walletBroadcastAuth = {
  address: null,
  publicKeyHex: null,
  genericUseSeed: null,
};

function notifyWallet(message, type = 'info') {
  if (window.notify) window.notify(message, type);
  else console.log('[wallet]', message);
}

async function updateWalletState(connected, address = null, notifyMessage = null, notifyType = 'info') {
  if (!G) {
    console.warn('Wallet state update attempted before game state was initialized.');
    return;
  }

  if (connected && address) {
    await switchToWalletProfile(address);
  } else {
    switchToGuestProfile();
    saveGame();
  }
  if (window.renderAll) window.renderAll();
  if (notifyMessage) notifyWallet(notifyMessage, notifyType);
}

export function isWalletAvailable() {
  return !!(window.platformSDK && typeof window.platformSDK.sendCommand === 'function' && typeof window.platformSDK.onCommand === 'function');
}

export function getWalletBroadcastAuth() {
  return { ..._walletBroadcastAuth };
}

function handleConnectionResponse(data) {
  if (!data || data.type !== 'connection-response') return;

  const payload = data.payload || {};
  const wallet = payload.wallet;
  const genericUseSeed = data.genericUseSeed || data.detail?.genericUseSeed || payload.genericUseSeed || null;
  const publicKeyHex = wallet?.publicKeyHex || data.wallet?.publicKeyHex || null;

  if (payload.error) {
    _walletBroadcastAuth = { address: null, publicKeyHex: null, genericUseSeed: null };
    updateWalletState(false, null, `⚠️ Wallet connection failed: ${payload.error}`, 'error');
    return;
  }

  if (wallet && !payload.anonymous) {
    _walletBroadcastAuth = {
      address: wallet.address || null,
      publicKeyHex,
      genericUseSeed,
    };
    if (!genericUseSeed) {
      console.warn('Metanet connection response did not include genericUseSeed; BSV broadcast will not work until this is provided.');
    }
    updateWalletState(true, wallet.address, '✅ Wallet connected! Cloud save enabled for this wallet.', 'unlock');
    return;
  }

  _walletBroadcastAuth = { address: null, publicKeyHex: null, genericUseSeed: null };
  updateWalletState(false, null, '👤 Running in guest mode — progress stays on this device until you connect a wallet.', 'warning');
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

  _walletBroadcastAuth = { address: null, publicKeyHex: null, genericUseSeed: null };
  updateWalletState(false, null, '🔌 Wallet disconnected. Guest farm restored on this device.', 'info');
}
