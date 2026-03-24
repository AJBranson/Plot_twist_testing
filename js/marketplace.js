// marketplace.js - Marketplace functionality for BSV Farm Game

// Market cache variables
let _marketCache = null;
let _marketCacheTime = 0;
const MARKET_CACHE_TTL = 30000;
let _marketFilter = 'all';
let _marketSort = 'newest';

// Import dependencies
import { G, saveGame, notify, CROP_MAP, CROP_THEME, cropArt, escHtml, timeSince, lbClient } from './game-state.js';

// Vege Stand functions
export function renderVegeStand() {
  const panel = document.getElementById('jtab-vege-stand');
  if (!panel) return;

  const listings = G.standListings || [];
  const inventory = G.inventory || {};

  let html = `
    <div style="margin-bottom:12px">
      <div style="font-family:var(--ff-head);font-size:15px;color:#FFD700;margin-bottom:8px">🌱 Vege Stand</div>
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:10px">List your harvested seeds for sale. Exotic and heritage seeds sell for more!</div>
    </div>`;

  if (listings.length > 0) {
    html += `<div style="margin-bottom:15px"><div style="font-size:12px;font-weight:800;color:var(--text);margin-bottom:6px">Your Listings (${listings.length})</div>`;
    listings.forEach(listing => {
      const baseCropId = (listing.cropId || '').replace('_heritage', '');
      const crop = CROP_MAP[baseCropId] || {};
      const theme = CROP_THEME[baseCropId] || { bg: '#1A1A1A' };
      const isExotic = !!crop.exotic;
      const isHeritage = !!listing.heritage;
      const bsvDisplay = (listing.satoshis / 1e8).toFixed(5);

      html += `
        <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;background:rgba(20,42,16,0.6);border:1px solid ${isHeritage ? 'rgba(255,215,0,0.3)' : 'var(--border)'};margin-bottom:5px">
          <svg width="28" height="28" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" style="background:${theme.bg};border-radius:5px;flex-shrink:0${isExotic ? ';box-shadow:0 0 4px ' + theme.border : ''}">${cropArt(baseCropId)}</svg>
          <div style="flex:1;min-width:0">
            <div style="font-size:11px;font-weight:800;color:${isHeritage ? '#FFD700' : 'var(--text)'}">${escHtml(listing.cropName || '')} ×${listing.qty}</div>
            <div style="font-size:9px;color:var(--text-dim)">₿ ${bsvDisplay}</div>
          </div>
          <button onclick="cancelListing('${listing.id}')" style="background:rgba(255,100,100,0.15);border:1px solid rgba(255,100,100,0.4);border-radius:6px;padding:4px 8px;font-size:10px;font-weight:800;color:#FF6464;cursor:pointer">Cancel</button>
        </div>`;
    });
    html += '</div>';
  }

  // Available seeds to list
  const listableSeeds = [];
  Object.entries(inventory).forEach(([cropId, qty]) => {
    if (qty > 0) {
      const baseCropId = cropId.replace('_heritage', '');
      const crop = CROP_MAP[baseCropId] || {};
      if (crop.name) {
        listableSeeds.push({ cropId, baseCropId, qty, crop, isHeritage: cropId.includes('_heritage') });
      }
    }
  });

  if (listableSeeds.length > 0) {
    html += `<div><div style="font-size:12px;font-weight:800;color:var(--text);margin-bottom:6px">Available Seeds</div>`;
    listableSeeds.forEach(({ cropId, baseCropId, qty, crop, isHeritage }) => {
      const theme = CROP_THEME[baseCropId] || { bg: '#1A1A1A' };
      const isExotic = !!crop.exotic;
      const basePrice = crop.basePrice || 1000;
      const multiplier = isHeritage ? 3 : (isExotic ? 2 : 1);
      const satoshis = Math.floor(basePrice * multiplier * (qty >= 3 ? 0.9 : 1)); // 10% discount for packets
      const bsvDisplay = (satoshis / 1e8).toFixed(5);

      html += `
        <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;background:rgba(20,42,16,0.4);border:1px solid var(--border);margin-bottom:4px">
          <svg width="28" height="28" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" style="background:${theme.bg};border-radius:5px;flex-shrink:0${isExotic ? ';box-shadow:0 0 4px ' + theme.border : ''}">${cropArt(baseCropId)}</svg>
          <div style="flex:1;min-width:0">
            <div style="font-size:11px;font-weight:800;color:${isHeritage ? '#FFD700' : 'var(--text)'}">${escHtml(crop.name)}${isHeritage ? ' ✨' : ''} ×${qty}</div>
            <div style="font-size:9px;color:var(--text-dim)">₿ ${bsvDisplay} each${qty >= 3 ? ' (packet discount)' : ''}</div>
          </div>
          <button onclick="listSeeds('${cropId}', 1)" style="background:rgba(111,207,58,0.15);border:1px solid rgba(111,207,58,0.4);border-radius:6px;padding:4px 8px;font-size:10px;font-weight:800;color:var(--green-hi);cursor:pointer">List 1</button>
          ${qty >= 3 ? `<button onclick="listSeeds('${cropId}', 3)" style="background:rgba(111,207,58,0.15);border:1px solid rgba(111,207,58,0.4);border-radius:6px;padding:4px 8px;font-size:10px;font-weight:800;color:var(--green-hi);cursor:pointer">List 3</button>` : ''}
        </div>`;
    });
    html += '</div>';
  } else {
    html += '<div style="text-align:center;color:var(--text-dim);font-size:12px;padding:20px 0">🌱 No seeds available to list.<br><span style="font-size:10px;opacity:0.7">Harvest some crops first!</span></div>';
  }

  panel.innerHTML = html;
}

export async function listSeeds(cropId, qty) {
  if (!G.walletConnected) {
    notify('🔗 Connect your wallet to list seeds!', 'error');
    return;
  }

  const inventory = G.inventory || {};
  if ((inventory[cropId] || 0) < qty) {
    notify('⚠️ Not enough seeds in storage!', 'error');
    return;
  }

  const baseCropId = cropId.replace('_heritage', '');
  const crop = CROP_MAP[baseCropId] || {};
  const isHeritage = cropId.includes('_heritage');
  const basePrice = crop.basePrice || 1000;
  const multiplier = isHeritage ? 3 : (crop.exotic ? 2 : 1);
  const satoshis = Math.floor(basePrice * multiplier * (qty >= 3 ? 0.9 : 1));

  const listing = {
    id: 'listing-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
    cropId: cropId,
    cropName: crop.name || 'Unknown Crop',
    qty: qty,
    satoshis: satoshis,
    heritage: isHeritage,
    seller_address: G.walletAddress,
    seller_name: G.walletName || 'Anonymous Farmer',
    status: 'active',
    listed_at: new Date().toISOString()
  };

  // Deduct from inventory
  inventory[cropId] -= qty;
  if (inventory[cropId] <= 0) delete inventory[cropId];

  // Add to listings
  G.standListings = G.standListings || [];
  G.standListings.push(listing);
  saveGame();

  // Submit to database
  const db = lbClient();
  if (db) {
    const maxRetries = 3;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await db.from('listings').insert({
          id: listing.id,
          crop_id: cropId,
          crop_name: crop.name || 'Unknown Crop',
          qty: qty,
          satoshis: satoshis,
          heritage: isHeritage,
          seller_address: G.walletAddress,
          seller_name: G.walletName || 'Anonymous Farmer',
          status: 'active',
          listed_at: new Date().toISOString()
        });
        break; // Success, exit retry loop
      } catch (e) {
        lastError = e;
        console.warn(`List seeds attempt ${attempt}/${maxRetries} failed:`, e.message);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    if (lastError) {
      console.warn('List seeds failed after all retries:', lastError.message);
      // Still proceed with local listing - the listing is created locally
    }
  }

  renderVegeStand();
  renderStorage();
  notify('🌱 Listed ' + qty + '× ' + (crop.name || 'seeds') + ' for ₿' + (satoshis / 1e8).toFixed(5) + ' each!', 'unlock');
}

export async function cancelListing(listingId) {
  const listings = G.standListings || [];
  const idx = listings.findIndex(l => l.id === listingId);
  if (idx === -1) {
    notify('⚠️ Listing not found!', 'error');
    return;
  }
  const listing = listings[idx];

  const inventoryKey = listing.heritage ? listing.cropId + '_heritage' : listing.cropId;
  G.inventory[inventoryKey] = (G.inventory[inventoryKey] || 0) + listing.qty;
  G.standListings.splice(idx, 1);
  saveGame();

  const db = lbClient();
  if (db) {
    const maxRetries = 3;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await db.from('listings').update({ status: 'cancelled' }).eq('id', listingId);
        break; // Success, exit retry loop
      } catch (e) {
        lastError = e;
        console.warn(`Cancel listing attempt ${attempt}/${maxRetries} failed:`, e.message);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    if (lastError) {
      console.warn('Cancel listing failed after all retries:', lastError.message);
      // Still proceed with local cancellation - the listing is removed locally
    }
  }

  renderVegeStand();
  renderStorage();
  notify('↩️ Listing cancelled — ' + listing.qty + '× ' + listing.cropName + ' returned to storage.', 'harvest');
}

// Market Browse functions
export async function fetchActiveListings(forceRefresh) {
  const db = lbClient();
  if (!db) return [];
  const now = Date.now();
  if (!forceRefresh && _marketCache && (now - _marketCacheTime) < MARKET_CACHE_TTL) return _marketCache;

  const maxRetries = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await db.from('listings').select('*')
        .in('status', ['active', 'paused'])
        .order('listed_at', { ascending: false }).limit(50);
      if (error) throw error;

      _marketCache = data || [];
      _marketCacheTime = now;
      return _marketCache;
    } catch (e) {
      lastError = e;
      console.warn(`Market fetch attempt ${attempt}/${maxRetries} failed:`, e.message);
      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  console.warn('Market fetch failed after all retries:', lastError.message);
  return _marketCache || []; // Return cached data if available, otherwise empty array
}

export function setMarketFilter(f) {
  _marketFilter = f;
  renderMarketFilterBar();
  renderMarketListings(_marketCache || []);
}

export function setMarketSort(s) {
  _marketSort = s;
  renderMarketSortBar();
  renderMarketListings(_marketCache || []);
}

export async function refreshMarket() {
  const c = document.getElementById('market-listings-container');
  if (c) c.innerHTML = '<div style="text-align:center;color:var(--text-dim);font-size:12px;padding:20px 0">⏳ Refreshing…</div>';
  renderMarketListings(await fetchActiveListings(true));
}

export function renderMarketFilterBar() {
  const bar = document.getElementById('market-filter-bar');
  if (!bar) return;
  const labels = { all: 'All', standard: 'Standard', exotic: 'Exotic', heritage: 'Heritage' };
  bar.innerHTML = Object.entries(labels).map(([f, label]) => {
    const active = _marketFilter === f;
    return `<button onclick="setMarketFilter('${f}')" style="font-size:10px;font-weight:800;font-family:var(--ff-body);padding:4px 10px;border-radius:14px;border:1px solid ${active ? 'var(--xp-purple)' : 'var(--border)'};background:${active ? 'var(--xp-purple)' : 'transparent'};color:${active ? '#1A0F2E' : 'var(--text-dim)'};cursor:pointer">${label}</button>`;
  }).join('') + `<button onclick="refreshMarket()" style="margin-left:auto;font-size:10px;font-weight:700;font-family:var(--ff-body);padding:4px 8px;border-radius:14px;border:1px solid var(--border);background:transparent;color:var(--text-dim);cursor:pointer">↻ Refresh</button>`;
}

export function renderMarketSortBar() {
  const bar = document.getElementById('market-sort-bar');
  if (!bar) return;
  const sorts = [['newest', 'Newest'], ['price_asc', 'Price ↑'], ['price_desc', 'Price ↓'], ['qty', 'Qty']];
  bar.innerHTML = `<span style="font-size:10px;color:var(--text-dim)">Sort:</span>` +
    sorts.map(([v, l]) => {
      const active = _marketSort === v;
      return `<button onclick="setMarketSort('${v}')" style="font-size:10px;font-family:var(--ff-body);padding:3px 8px;border-radius:10px;border:1px solid ${active ? 'var(--green-hi)' : 'var(--border)'};background:${active ? 'rgba(111,207,58,0.15)' : 'transparent'};color:${active ? 'var(--green-hi)' : 'var(--text-dim)'};cursor:pointer">${l}</button>`;
    }).join('');
}

export async function renderMarketTab() {
  const panel = document.getElementById('jtab-market');
  if (!panel) return;

  panel.innerHTML = `
    <div style="margin-bottom:10px">
      <div id="market-filter-bar" style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:7px;align-items:center"></div>
      <div id="market-sort-bar" style="display:flex;gap:5px;flex-wrap:wrap;align-items:center"></div>
    </div>
    ${!G.walletConnected ? '<div style="font-size:11px;color:var(--text-dim);background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;padding:7px 10px;margin-bottom:10px">🔗 Connect your wallet to buy seeds from other farmers.</div>' : ''}
    <div id="market-listings-container"><div style="text-align:center;color:var(--text-dim);font-size:12px;padding:20px 0">⏳ Loading listings…</div></div>`;
  renderMarketFilterBar();
  renderMarketSortBar();

  renderMarketListings(await fetchActiveListings(false));
}

export function renderMarketListings(listings) {
  const container = document.getElementById('market-listings-container');
  if (!container) return;

  // Filter
  let filtered = listings.filter(l => {
    if (_marketFilter === 'heritage') return l.heritage;
    if (_marketFilter === 'exotic') {
      const base = (l.crop_id || '').replace('_heritage', '');
      return CROP_MAP[base] && CROP_MAP[base].exotic;
    }
    if (_marketFilter === 'standard') {
      const base = (l.crop_id || '').replace('_heritage', '');
      return CROP_MAP[base] && !CROP_MAP[base].exotic;
    }
    return true;
  });

  // Sort
  filtered = [...filtered].sort((a, b) => {
    if (_marketSort === 'price_asc') return a.satoshis - b.satoshis;
    if (_marketSort === 'price_desc') return b.satoshis - a.satoshis;
    if (_marketSort === 'qty') return b.qty - a.qty;
    return new Date(b.listed_at || 0) - new Date(a.listed_at || 0);
  });

  if (filtered.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:var(--text-dim);font-size:13px;padding:30px 0">🌱 No listings found.<br><span style="font-size:11px;opacity:0.7">Open the Vege Stand to list your exotic seeds!</span></div>';
    return;
  }

  // Store listings for buy buttons
  window._marketListings = {};
  filtered.forEach(l => { window._marketListings[l.id] = l; });

  const rowsHtml = filtered.map(l => {
    const baseCropId = (l.crop_id || '').replace('_heritage', '');
    const crop = CROP_MAP[baseCropId] || {};
    const theme = CROP_THEME[baseCropId] || { bg: '#1A1A1A' };
    const isExotic = !!crop.exotic;
    const isHeritage = !!l.heritage;
    const isPacket = l.qty >= 3;
    const isOwn = G.walletAddress && l.seller_address === G.walletAddress;
    const bsvDisplay = (l.satoshis / 1e8).toFixed(5);

    const badges = [
      isHeritage ? `<span style="font-size:9px;background:rgba(255,215,0,0.2);color:#FFD700;border-radius:4px;padding:1px 4px;font-weight:800">✨ Heritage</span>` : '',
      isExotic && !isHeritage ? `<span style="font-size:9px;background:rgba(167,139,250,0.15);color:var(--xp-purple);border-radius:4px;padding:1px 4px;font-weight:800">Exotic</span>` : '',
      isPacket ? `<span style="font-size:9px;background:rgba(111,207,58,0.15);color:var(--green-hi);border-radius:4px;padding:1px 4px;font-weight:800">🌱 Packet</span>` : '',
    ].filter(Boolean).join(' ');

    const isPaused = l.status === 'paused';
    const buyCell = isPaused
      ? `<span style="font-size:10px;color:var(--text-dim);font-style:italic;background:rgba(100,100,100,0.15);border:1px solid rgba(100,100,100,0.3);border-radius:8px;padding:4px 8px;white-space:nowrap">🚫 Shop Closed</span>`
      : isOwn
        ? `<span style="font-size:10px;color:var(--text-dim);font-style:italic">Your listing</span>`
        : G.walletConnected
          ? `<button class="market-buy-btn" data-id="${l.id}" style="background:rgba(255,209,64,0.15);border:1px solid rgba(255,209,64,0.4);border-radius:8px;padding:5px 10px;font-size:11px;font-weight:800;color:#FFD700;cursor:pointer;white-space:nowrap">Buy ₿${bsvDisplay}</button>`
          : `<span style="font-size:10px;color:var(--text-dim)">Wallet needed</span>`;

    return `<div class="market-listing-row" style="display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:9px;background:rgba(20,42,16,0.6);border:1px solid ${isHeritage ? 'rgba(255,215,0,0.3)' : isOwn ? 'rgba(111,207,58,0.3)' : 'var(--border)'};margin-bottom:6px;${isOwn ? 'opacity:0.7' : ''}">
      <svg width="32" height="32" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" style="background:${theme.bg};border-radius:6px;flex-shrink:0${isExotic ? ';box-shadow:0 0 4px ' + theme.border : ''}">${cropArt(baseCropId)}</svg>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:800;color:${isHeritage ? '#FFD700' : 'var(--text)'}">${escHtml(l.crop_name || '')} ×${l.qty}</div>
        <div style="font-size:10px;color:var(--text-dim);margin-top:1px">${escHtml(l.seller_name || 'Farmer')} · ${l.listed_at ? timeSince(new Date(l.listed_at)) : 'recently'}</div>
        ${badges ? `<div style="margin-top:3px;display:flex;gap:3px;flex-wrap:wrap">${badges}</div>` : ''}
      </div>
      ${buyCell}
    </div>`;
  }).join('');

  container.innerHTML = rowsHtml +
    `<div style="text-align:center;font-size:10px;color:var(--text-dim);margin-top:8px">Cached 30s · ${filtered.length} listing${filtered.length !== 1 ? 's' : ''} shown</div>`;

  // Wire buy buttons
  container.querySelectorAll('.market-buy-btn').forEach(btn => {
    btn.onclick = () => {
      const listing = window._marketListings[btn.dataset.id];
      if (listing) showBuyConfirm(listing);
    };
  });
}

export function showBuyConfirm(listing) {
  const existing = document.getElementById('buy-confirm-overlay');
  if (existing) existing.remove();

  window._pendingBuyListing = listing;

  const baseCropId = (listing.crop_id || '').replace('_heritage', '');
  const crop = CROP_MAP[baseCropId] || {};
  const theme = CROP_THEME[baseCropId] || { bg: '#1A1A1A' };
  const bsvDisplay = (listing.satoshis / 1e8).toFixed(5);

  const overlay = document.createElement('div');
  overlay.id = 'buy-confirm-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:510;display:flex;align-items:center;justify-content:center;padding:16px;animation:fade-in 0.2s ease';
  overlay.innerHTML = `
    <div style="background:linear-gradient(160deg,#182B14 0%,#111D0F 100%);border:1.5px solid rgba(255,209,64,0.4);border-radius:18px;padding:22px 20px 18px;max-width:320px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.8);animation:card-pop 0.25s cubic-bezier(0.34,1.56,0.64,1)">
      <div style="margin-bottom:10px">
        <svg width="52" height="52" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" style="background:${theme.bg};border-radius:10px">${cropArt(baseCropId)}</svg>
      </div>
      <div style="font-family:var(--ff-head);font-size:17px;color:#FFD700;margin-bottom:4px">Confirm Purchase</div>
      <div style="font-size:13px;color:var(--text);margin-bottom:4px;font-weight:800">${escHtml(listing.crop_name || '')} ×${listing.qty}</div>
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:4px">Seller: ${escHtml(listing.seller_name || 'Farmer')}</div>
      <div style="font-size:20px;font-weight:800;color:#FFD700;margin:10px 0">₿ ${bsvDisplay}</div>
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:16px">Seeds added to storage on payment success. Bypasses level restrictions.</div>
      <div style="display:flex;gap:8px;justify-content:center">
        <button id="buy-confirm-btn" onclick="executePurchase(this)" style="flex:1;background:rgba(255,209,64,0.2);border:1px solid rgba(255,209,64,0.5);border-radius:10px;padding:10px;font-size:13px;font-weight:800;color:#FFD700;cursor:pointer">
          Confirm Buy
        </button>
        <button onclick="document.getElementById('buy-confirm-overlay').remove()" style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:10px;padding:10px 16px;font-size:13px;color:var(--text-dim);cursor:pointer">
          Cancel
        </button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

export async function executePurchase(btnEl) {
  const listing = window._pendingBuyListing;
  if (!listing) return;
  if (!G.walletConnected) {
    notify('🔗 Connect your wallet to buy!', 'error');
    return;
  }

  if (btnEl) {
    btnEl.disabled = true;
    btnEl.textContent = '⏳ Paying…';
  }

  const ref = 'trade-' + listing.id;

  if (window.platformSDK && G.walletConnected) {
    window.platformSDK.sendCommand({
      type: 'pay',
      ref: ref,
      recipients: [{
        address: listing.seller_address,
        value: listing.satoshis,
        note: 'Plot Twist Vege Stand: ' + (listing.crop_name || '')
      }],
    });

    // One-time listener — removes itself after handling the matching response
    const _payHandler = async (event) => {
      const data = event.data;
      if (!data || data.command !== 'ninja-app-command') return;
      if (data.type !== 'pay-response' || data.payload.ref !== ref) return;
      window.removeEventListener('message', _payHandler);
      if (data.payload.success) {
        const baseCropId = (listing.crop_id || '').replace('_heritage', '');
        const inventoryKey = listing.heritage ? baseCropId + '_heritage' : baseCropId;
        G.inventory[inventoryKey] = (G.inventory[inventoryKey] || 0) + listing.qty;
        saveGame();
        renderStorage();
        const overlay = document.getElementById('buy-confirm-overlay');
        if (overlay) overlay.remove();
        window._pendingBuyListing = null;
        const db = lbClient();
        if (db) {
          const maxRetries = 3;
          let updateSuccess = false;
          let insertSuccess = false;
          let lastError;

          // Update listing status
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              await db.from('listings').update({
                status: 'sold',
                sold_at: new Date().toISOString(),
                buyer_address: G.walletAddress,
              }).eq('id', listing.id);
              updateSuccess = true;
              break;
            } catch (e) {
              lastError = e;
              console.warn(`Purchase update attempt ${attempt}/${maxRetries} failed:`, e.message);
              if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
              }
            }
          }

          // Insert purchase record
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              await db.from('purchases').insert({
                id: 'purchase-' + Date.now(),
                listing_id: listing.id,
                seller_address: listing.seller_address,
                buyer_address: G.walletAddress,
                crop_id: listing.crop_id,
                crop_name: listing.crop_name,
                qty: listing.qty,
                satoshis: listing.satoshis,
              });
              insertSuccess = true;
              break;
            } catch (e) {
              lastError = e;
              console.warn(`Purchase insert attempt ${attempt}/${maxRetries} failed:`, e.message);
              if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
              }
            }
          }

          if (!updateSuccess || !insertSuccess) {
            console.warn('Purchase database operations failed:', lastError.message);
            // Still proceed with local inventory update - the purchase was successful
          }
        }
        _marketCache = null;
        _marketCacheTime = 0;
        notify('🥕 Purchased ' + listing.qty + '× ' + (listing.crop_name || '') + '! Check your storage.', 'unlock');
        const panel = document.getElementById('jtab-market');
        if (panel && panel.classList.contains('active')) renderMarketTab();
      } else {
        if (btnEl) {
          btnEl.disabled = false;
          btnEl.textContent = 'Confirm Buy';
        }
        notify('₿ Purchase failed: ' + (data.payload.message || 'Payment failed'), 'error');
      }
    };
    window.addEventListener('message', _payHandler);
  } else {
    if (btnEl) {
      btnEl.disabled = false;
      btnEl.textContent = 'Confirm Buy';
    }
    notify('₿ Open inside Metanet.page to buy seeds.', 'error');
  }
}