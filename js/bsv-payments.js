// ============================================================
// BSV PAYMENT + BROADCAST HELPERS
// ============================================================

import { ec as EC } from 'https://esm.sh/elliptic@6.6.1?bundle';
import SHA256 from 'https://esm.sh/crypto-js@4.2.0/sha256?bundle';
import { G } from './game-state.js';
import { getWalletBroadcastAuth } from './wallet.js';

const METANET_BROADCAST_URL = 'https://api.metanet.ninja/data/api';
const BSV_PAYMENT_SOURCE = 'plot-twist';
const ecInstance = new EC('secp256k1');

function notifyPayment(message, type = 'info') {
  if (window.notify) window.notify(message, type);
  else console.log('[bsv-payment]', message);
}

function waitForPayResponse(ref) {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      window.removeEventListener('message', handleResponse);
      reject(new Error('Payment response timed out.'));
    }, 90000);

    const handleResponse = (event) => {
      const data = event.data;
      if (!data || data.command !== 'ninja-app-command') return;
      if (data.type !== 'pay-response' || data.payload?.ref !== ref) return;
      window.clearTimeout(timeout);
      window.removeEventListener('message', handleResponse);
      resolve(data.payload || {});
    };

    window.addEventListener('message', handleResponse);
  });
}

async function broadcastRawTransaction(rawTxHex) {
  const auth = getWalletBroadcastAuth();
  if (!auth?.genericUseSeed) {
    throw new Error('Wallet broadcast credentials are missing. Please reconnect your wallet.');
  }

  const payload = {
    data: {
      action: 'broadcastTransactions',
      raws: [rawTxHex],
      params: {
        source: BSV_PAYMENT_SOURCE,
        timestamp: Date.now(),
      },
    },
  };

  const canonicalPayloadStr = JSON.stringify(payload);
  const keyPair = ecInstance.keyFromPrivate(auth.genericUseSeed);
  const publicKeyHex = keyPair.getPublic(true, 'hex');
  const hashHex = SHA256(canonicalPayloadStr).toString();
  const hashBytes = new TextEncoder().encode(hashHex);
  const signature = keyPair.sign(hashBytes, { canonical: true }).toDER('hex');

  const response = await fetch(METANET_BROADCAST_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-signature': signature,
      'x-pubkey': publicKeyHex,
    },
    body: canonicalPayloadStr,
  });

  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(result?.error || ('Broadcast failed with HTTP ' + response.status));
  }
  if (!result?.success) {
    throw new Error(result?.error || 'Broadcast request failed.');
  }

  const first = Array.isArray(result.data) ? result.data[0] : null;
  if (!first?.success) {
    throw new Error(first?.error?.message || first?.error || 'Transaction was not accepted for broadcast.');
  }

  return {
    txid: first.txid || null,
    result,
  };
}

export async function requestBSVPayment({ ref, recipients, pendingMessage = '₿ Awaiting wallet confirmation…' }) {
  if (!window.platformSDK || !G?.walletConnected) {
    throw new Error('Wallet not available in this environment.');
  }

  notifyPayment(pendingMessage, 'harvest');
  const responsePromise = waitForPayResponse(ref);

  window.platformSDK.sendCommand({
    type: 'pay',
    ref,
    recipients,
  });

  const payload = await responsePromise;
  if (!payload.success) {
    throw new Error(payload.message || 'Payment failed.');
  }
  if (!payload.rawTxHex) {
    throw new Error('Payment succeeded but no signed transaction was returned.');
  }

  notifyPayment('₿ Payment signed. Broadcasting transaction…', 'harvest');
  const broadcast = await broadcastRawTransaction(payload.rawTxHex);
  return {
    payment: payload,
    broadcast,
  };
}