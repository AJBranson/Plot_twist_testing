// marketplace.js - Marketplace functionality
// Uses window.notify and window.renderStorage to avoid circular dep with rendering.js

import { G, saveGame, ensureVegeStandUnlocked, hasUnlockedVegeStand } from './game-state.js';
import { CROP_MAP } from './constants.js';
import { CROP_THEME, cropArt, escHtml, timeSince } from './utils.js';
import { lbClient } from './leaderboard.js';

let _marketCache = null;
let _marketCacheTime = 0;
const MARKET_CACHE_TTL = 30000;
let _marketFilter = 'all';
let _marketSort = 'newest';

// ============================================================
// VEGE STAND (seller view)
// ============================================================
export function renderVegeStand() {
  const area = document.getElementById('vege-stand-area');
  if (!area) return;

  ensureVegeStandUnlocked();

  if (!hasUnlockedVegeStand()) {
    area.style.display = 'none';
    return;
  }
  area.style.display = '';

  const listings = G.standListings || [];
  const isFull = listings.length >= (G.standMaxSlots || 3);
  const canList = G.walletConnected && !isFull && hasListableSeeds();
  const listingRowsHtml = listings.map(l => {
    const baseCropId = (l.cropId || '').replace('_heritage', '');
    const crop = CROP_MAP[baseCropId] || {};
    const theme = CROP_THEME[baseCropId] || { bg: '#1A1A1A' };
    const nameDisplay = `${l.heritage ? '✨ ' : ''}${crop.name || l.cropId}${l.heritage ? ' H' : ''}`;
    const bsvDisplay = (l.satoshis / 1e8).toFixed(5);
    return `<div class="stand-listing-row" style="display:flex;align-items:center;gap:8px;padding:5px 6px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;margin-bottom:5px">
      <svg width="22" height="22" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" style="background:${theme.bg};border-radius:4px;flex-shrink:0">${cropArt(baseCropId)}</svg>
      <div style="flex:1;min-width:0">
        <div style="font-size:11px;font-weight:800;color:${l.heritage ? '#FFD700' : 'var(--text)'};">${escHtml(nameDisplay)} ×${l.qty}</div>
        <div style="font-size:10px;color:var(--text-dim);">₿ ${bsvDisplay}</div>
      </div>
      <button onclick="cancelListing('${l.id}')" style="background:rgba(255,100,100,0.1);border:1px solid rgba(255,100,100,0.3);border-radius:6px;padding:3px 7px;font-size:10px;color:#FF8A80;cursor:pointer">Cancel</button>
    </div>`;
  }).join('');

  const emptyMsg = listings.length === 0
    ? `<div style="font-size:11px;color:var(--text-dim);font-style:italic;padding:3px 0">Stand is empty — list some seeds!</div>`
    : '';

  const toggleTitle = G.standEnabled ? 'Stand is open — click to close' : 'Stand is closed — click to open';
  const canListSeeds = (G.standListings || []).length < (G.standMaxSlots || 3) && hasListableSeeds();

  area.innerHTML = `
    <div style="display:flex;align-items:center;gap:14px">
      <button id="vege-stand-btn" onclick="toggleStandOpen()" style="background:none;border:none;padding:0;cursor:pointer;flex-shrink:0;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.4));transition:transform 0.15s" title="${toggleTitle}">
        ${vegeSVG(listings.length, G.standEnabled)}
      </button>
      <div id="vege-stand-info" style="flex:1;min-width:0">
        <div style="font-family:var(--ff-head);font-size:14px;color:var(--text);display:flex;align-items:center;gap:7px;margin-bottom:4px">
          🥕 Vege Stand
          <span style="font-size:9px;font-weight:700;background:${G.standEnabled ? 'rgba(111,207,58,0.18)' : 'rgba(100,100,100,0.2)'};color:${G.standEnabled ? 'var(--green-hi)' : 'var(--text-dim)'};border-radius:6px;padding:1px 5px">${G.standEnabled ? 'OPEN' : 'CLOSED'}</span>
          <span style="font-size:10px;color:var(--text-dim);margin-left:2px">${listings.length}/${G.standMaxSlots || 3} slots</span>
        </div>
        <div id="vege-stand-listings">${listingRowsHtml}${emptyMsg}</div>
        <button id="list-seeds-btn" onclick="showListingModal()" style="margin-top:5px;background:${canListSeeds ? 'rgba(255,209,64,0.15)' : 'rgba(100,100,100,0.1)'};border:1px solid ${canListSeeds ? 'rgba(255,209,64,0.4)' : 'rgba(100,100,100,0.2)'};border-radius:8px;padding:5px 12px;font-size:11px;font-weight:800;color:${canListSeeds ? '#FFD700' : '#666'};cursor:${canListSeeds ? 'pointer' : 'not-allowed'}" ${canListSeeds ? '' : 'disabled'} title="${!G.walletConnected ? 'Connect wallet to list seeds for BSV' : (G.standListings || []).length >= (G.standMaxSlots || 3) ? 'Stand is full (3 slots)' : !hasListableSeeds() ? 'No seeds in storage' : 'List seeds for sale'}">
          + List Seeds${!G.walletConnected ? ' (wallet required)' : (G.standListings || []).length >= (G.standMaxSlots || 3) ? ' (full)' : ''}
        </button>
      </div>
    </div>`;
}

function hasListableSeeds() {
  return Object.entries(G.inventory || {}).some(([key, qty]) => {
    const count = typeof qty === 'object' ? (qty.qty || 0) : qty;
    return count > 0;
  });
}

function calcSuggestedPrice(baseCropId, isHeritage, qty) {
  const crop = CROP_MAP[baseCropId];
  if (!crop) return 0.00001;
  const base = crop.seedCost * 0.00001;
  let mult = isHeritage ? 1.5 : 1.0;
  if (qty >= 3) mult = isHeritage ? 4.0 : 2.8;
  return Math.round(base * mult * qty * 100000) / 100000;
}

export async function toggleStandOpen() {
  // Guard: only allow toggle if stand is actually unlocked
  if (!hasUnlockedVegeStand()) {
    notify('🔒 Unlock the vege stand by collecting exotic crops or accepting 40+ merchant deals.', 'error');
    return;
  }

  G.standEnabled = !G.standEnabled;
  saveGame();
  renderVegeStand();

  const db = lbClient();
  if (!db || !G.walletAddress) return;
  const myListingIds = (G.standListings || []).map(l => l.id);
  if (myListingIds.length === 0) return;

  const newStatus = G.standEnabled ? 'active' : 'paused';
  try {
    await db.from('listings').update({ status: newStatus }).in('id', myListingIds);
    notify(G.standEnabled
      ? '🥕 Stand reopened — your seeds are visible to buyers again.'
      : '🥕 Stand closed — your listings are hidden until you reopen.',
      'harvest');
    _marketCache = null; _marketCacheTime = 0;
  } catch(e) {
    console.warn('Stand toggle error:', e);
  }
}

export function showListingModal() {
  if (!hasUnlockedVegeStand()) { notify('🔒 Unlock the vege stand by collecting exotic crops or accepting 40+ merchant deals.', 'error'); return; }
  if (!G.walletConnected) { notify('🔗 Connect your wallet to list seeds!', 'error'); return; }
  if ((G.standListings || []).length >= (G.standMaxSlots || 3)) { notify('🥕 Stand is full — cancel a listing first.', 'error'); return; }

  const available = Object.entries(G.inventory || {})
    .map(([key, qty]) => {
      const count = typeof qty === 'object' ? (qty.qty || 0) : qty;
      if (count <= 0) return null;
      const isHeritage = key.endsWith('_heritage');
      const baseCropId = isHeritage ? key.replace('_heritage', '') : key;
      const crop = CROP_MAP[baseCropId];
      return crop ? { key, count, isHeritage, baseCropId, crop } : null;
    })
    .filter(Boolean);

  if (available.length === 0) { notify('🌱 No seeds in storage to list!', 'error'); return; }

  const existing = document.getElementById('listing-modal-overlay');
  if (existing) existing.remove();

  const first = available[0];
  const suggested = calcSuggestedPrice(first.baseCropId, first.isHeritage, 1);
  const optionsHtml = available.map(e =>
    `<option value="${e.key}" data-max="${e.count}" data-heritage="${e.isHeritage}" data-cropid="${e.baseCropId}" data-seedcost="${e.crop.seedCost}">
      ${e.isHeritage ? '✨ Heritage ' : ''}${e.crop.name} (×${e.count})
    </option>`
  ).join('');

  const overlay = document.createElement('div');
  overlay.id = 'listing-modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:450;display:flex;align-items:center;justify-content:center;padding:16px;animation:fade-in 0.2s ease';
  overlay.innerHTML = `
    <div style="background:linear-gradient(160deg,#182B14 0%,#111D0F 100%);border:1.5px solid rgba(255,209,64,0.3);border-radius:18px;padding:22px 20px 18px;max-width:340px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.7);animation:card-pop 0.25s cubic-bezier(0.34,1.56,0.64,1)">
      <div style="font-family:var(--ff-head);font-size:18px;color:#FFD700;margin-bottom:14px;text-align:center">🥕 List Seeds for Sale</div>
      <div style="margin-bottom:10px">
        <label style="font-size:11px;font-weight:700;color:var(--text-dim);display:block;margin-bottom:4px">Crop</label>
        <select id="listing-crop-select" onchange="updateListingModal()" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:7px 10px;font-size:12px;font-family:var(--ff-body)">
          ${optionsHtml}
        </select>
      </div>
      <div style="margin-bottom:10px">
        <label style="font-size:11px;font-weight:700;color:var(--text-dim);display:block;margin-bottom:4px">Quantity (max: <span id="listing-qty-max">${first.count}</span>)</label>
        <div style="display:flex;align-items:center;gap:8px">
          <button onclick="changeListingQty(-1)" style="width:28px;height:28px;border-radius:6px;background:rgba(255,255,255,0.08);color:var(--text);font-size:16px;cursor:pointer;border:1px solid var(--border)">−</button>
          <span id="listing-qty-val" style="min-width:30px;text-align:center;font-size:14px;font-weight:800;color:var(--text)">1</span>
          <button onclick="changeListingQty(1)" style="width:28px;height:28px;border-radius:6px;background:rgba(255,255,255,0.08);color:var(--text);font-size:16px;cursor:pointer;border:1px solid var(--border)">+</button>
          <span id="listing-packet-badge" style="display:none;font-size:9px;background:rgba(111,207,58,0.15);color:var(--green-hi);border-radius:4px;padding:1px 5px;font-weight:800">🌱 Packet</span>
        </div>
      </div>
      <div style="margin-bottom:10px">
        <label style="font-size:11px;font-weight:700;color:var(--text-dim);display:block;margin-bottom:4px">Price (BSV)</label>
        <input id="listing-price-input" type="number" step="0.00001" min="0.00001" value="${suggested.toFixed(5)}" style="width:100%;background:rgba(255,255,255,0.06);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:7px 10px;font-size:12px;font-family:var(--ff-body)" />
        <div id="listing-price-hint" style="font-size:10px;color:var(--text-dim);margin-top:3px">Suggested: ₿ ${suggested.toFixed(5)}</div>
      </div>
      <div style="display:flex;gap:8px;justify-content:center;margin-top:14px">
        <button onclick="confirmListing()" style="flex:1;background:rgba(255,209,64,0.2);border:1px solid rgba(255,209,64,0.5);border-radius:10px;padding:10px;font-size:13px;font-weight:800;color:#FFD700;cursor:pointer">List for Sale</button>
        <button onclick="document.getElementById('listing-modal-overlay').remove()" style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:10px;padding:10px 16px;font-size:13px;color:var(--text-dim);cursor:pointer">Cancel</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  updateListingModal();
}

export function updateListingModal() {
  const select = document.getElementById('listing-crop-select');
  if (!select) return;
  const qtyVal = document.getElementById('listing-qty-val');
  const qtyMax = document.getElementById('listing-qty-max');
  const priceInput = document.getElementById('listing-price-input');
  const hint = document.getElementById('listing-price-hint');
  const packetBadge = document.getElementById('listing-packet-badge');
  const selected = select.options[select.selectedIndex];
  const max = Number(selected.dataset.max || 1);
  const isHeritage = selected.dataset.heritage === 'true';
  const baseCropId = selected.dataset.cropid;
  if (qtyVal && qtyMax) {
    if (Number(qtyVal.textContent) > max) qtyVal.textContent = String(max);
    qtyMax.textContent = String(max);
  }
  if (priceInput && hint) {
    const qty = Math.max(1, Math.min(max, Number(qtyVal.textContent) || 1));
    const suggested = calcSuggestedPrice(baseCropId, isHeritage, qty);
    hint.textContent = `Suggested: ₿ ${suggested.toFixed(5)}${qty >= 3 ? ' (Packet rate)' : ''}`;
    priceInput.value = suggested.toFixed(5);
  }
  if (packetBadge) packetBadge.style.display = Number(qtyVal?.textContent || 1) >= 3 ? '' : 'none';
}

export function changeListingQty(delta) {
  const qtyVal = document.getElementById('listing-qty-val');
  const qtyMax = document.getElementById('listing-qty-max');
  if (!qtyVal || !qtyMax) return;
  let qty = Number(qtyVal.textContent) || 1;
  const max = Number(qtyMax.textContent) || 1;
  qty = Math.min(max, Math.max(1, qty + delta));
  qtyVal.textContent = String(qty);
  updateListingModal();
}

export async function confirmListing() {
  const select = document.getElementById('listing-crop-select');
  const qtyVal = document.getElementById('listing-qty-val');
  const priceInput = document.getElementById('listing-price-input');
  if (!select || !qtyVal || !priceInput) return;
  const cropId = select.value;
  const qty = Math.max(1, Math.min(Number(select.options[select.selectedIndex].dataset.max || 1), Number(qtyVal.textContent) || 1));
  const satoshis = Math.max(1, Math.floor((Number(priceInput.value) || 0) * 1e8));
  await listSeeds(cropId, qty, satoshis);
  document.getElementById('listing-modal-overlay')?.remove();
}

function vegeSVG(listingCount, enabled) {
  const signColor = enabled ? '#4CAF50' : '#888';
  const signText  = enabled ? 'OPEN' : 'CLOSED';
  const itemDots  = listingCount > 0
    ? ['#E57373','#FFB74D','#81C784']
        .slice(0, Math.min(listingCount, 3))
        .map((c, i) => `<circle cx="${22 + i * 8}" cy="24" r="5" fill="${c}" stroke="rgba(0,0,0,0.3)" stroke-width="0.5"/>`)
        .join('')
    : '';
  return `<svg width="56" height="56" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="28" width="44" height="5" rx="2" fill="#8D6E63" stroke="#6D4C41" stroke-width="1"/>
    <rect x="10" y="33" width="4" height="16" rx="2" fill="#795548" stroke="#6D4C41" stroke-width="1"/>
    <rect x="42" y="33" width="4" height="16" rx="2" fill="#795548" stroke="#6D4C41" stroke-width="1"/>
    <line x1="14" y1="42" x2="42" y2="38" stroke="#6D4C41" stroke-width="1.5" stroke-linecap="round"/>
    <rect x="26" y="14" width="2" height="16" rx="1" fill="#795548"/>
    <rect x="14" y="8" width="26" height="10" rx="3" fill="${signColor}" stroke="rgba(0,0,0,0.2)" stroke-width="0.5"/>
    <text x="27" y="16.5" text-anchor="middle" font-size="6" font-weight="bold" fill="white" font-family="Arial">${signText}</text>
    ${itemDots}
    <text x="46" y="30" font-size="10">🥕</text>
  </svg>`;
}

export function openVegeStand() {
  ensureVegeStandUnlocked();
  if (window.openJournal) window.openJournal();
  if (window.showJTab) window.showJTab('market');
  renderMarketTab();
}

// ============================================================
// MARKET BROWSE (buyer view)
// ============================================================
export async function fetchActiveListings(forceRefresh) {
  const db = lbClient();
  if (!db) return [];
  const now = Date.now();
  if (!forceRefresh && _marketCache && (now - _marketCacheTime) < MARKET_CACHE_TTL) return _marketCache;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { data, error } = await db.from('listings').select('*')
        .in('status', ['active', 'paused'])
        .order('listed_at', { ascending: false }).limit(50);
      if (error) throw error;
      _marketCache = data || [];
      _marketCacheTime = now;
      return _marketCache;
    } catch (e) {
      if (attempt < 3) await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  }
  return _marketCache || [];
}

export function setMarketFilter(f) { _marketFilter = f; renderMarketFilterBar(); renderMarketListings(_marketCache || []); }
export function setMarketSort(s)   { _marketSort   = s; renderMarketSortBar();   renderMarketListings(_marketCache || []); }

export async function refreshMarket() {
  const c = document.getElementById('market-listings-container');
  if (c) c.innerHTML = '<div style="text-align:center;color:var(--text-dim);font-size:12px;padding:20px 0">⏳ Refreshing…</div>';
  renderMarketListings(await fetchActiveListings(true));
}

export function renderMarketFilterBar() {
  const bar = document.getElementById('market-filter-bar');
  if (!bar) return;
  const labels = { all:'All', standard:'Standard', exotic:'Exotic', heritage:'Heritage' };
  bar.innerHTML = Object.entries(labels).map(([f, label]) => {
    const active = _marketFilter === f;
    return `<button class="market-filter-btn${active ? ' active' : ''}" onclick="setMarketFilter('${f}')">${label}</button>`;
  }).join('') + `<button class="market-filter-btn refresh active" onclick="refreshMarket()">↻ Refresh</button>`;
}

export function renderMarketSortBar() {
  const bar = document.getElementById('market-sort-bar');
  if (!bar) return;
  const sorts = [['newest','Newest'],['price_asc','Price ↑'],['price_desc','Price ↓'],['qty','Qty']];
  bar.innerHTML = `<span style="font-size:10px;color:var(--text-dim)">Sort:</span>` +
    sorts.map(([v,l]) => {
      const active = _marketSort === v;
      return `<button class="market-sort-btn${active ? ' active' : ''}" onclick="setMarketSort('${v}')">${l}</button>`;
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
  let filtered = listings.filter(l => {
    if (_marketFilter === 'heritage') return l.heritage;
    if (_marketFilter === 'exotic') { const base=(l.crop_id||'').replace('_heritage',''); return CROP_MAP[base]&&CROP_MAP[base].exotic; }
    if (_marketFilter === 'standard') { const base=(l.crop_id||'').replace('_heritage',''); return CROP_MAP[base]&&!CROP_MAP[base].exotic; }
    return true;
  });
  filtered = [...filtered].sort((a,b) => {
    if (_marketSort==='price_asc') return a.satoshis - b.satoshis;
    if (_marketSort==='price_desc') return b.satoshis - a.satoshis;
    if (_marketSort==='qty') return b.qty - a.qty;
    return new Date(b.listed_at||0) - new Date(a.listed_at||0);
  });
  if (filtered.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:var(--text-dim);font-size:13px;padding:30px 0">🌱 No listings found.<br><span style="font-size:11px;opacity:0.7">Open the Vege Stand to list your exotic seeds!</span></div>';
    return;
  }

  window._marketListings = {};
  filtered.forEach(l => { window._marketListings[l.id] = l; });

  const rowsHtml = filtered.map(l => {
    const baseCropId  = (l.crop_id||'').replace('_heritage','');
    const crop        = CROP_MAP[baseCropId] || {};
    const theme       = CROP_THEME[baseCropId] || { bg:'#1A1A1A' };
    const isExotic    = !!crop.exotic;
    const isHeritage  = !!l.heritage;
    const isPacket    = l.qty >= 3;
    const isOwn       = G.walletAddress && l.seller_address === G.walletAddress;
    const isPaused    = l.status === 'paused';
    const bsvDisplay  = (l.satoshis / 1e8).toFixed(5);

    const badges = [
      isHeritage ? `<span style="font-size:9px;background:rgba(255,215,0,0.2);color:#FFD700;border-radius:4px;padding:1px 4px;font-weight:800">✨ Heritage</span>` : '',
      isExotic && !isHeritage ? `<span style="font-size:9px;background:rgba(167,139,250,0.15);color:var(--xp-purple);border-radius:4px;padding:1px 4px;font-weight:800">Exotic</span>` : '',
      isPacket ? `<span style="font-size:9px;background:rgba(111,207,58,0.15);color:var(--green-hi);border-radius:4px;padding:1px 4px;font-weight:800">🌱 Packet</span>` : '',
    ].filter(Boolean).join(' ');

    const buyCell = isPaused
      ? `<span style="font-size:10px;color:var(--text-dim);font-style:italic;background:rgba(100,100,100,0.15);border:1px solid rgba(100,100,100,0.3);border-radius:8px;padding:4px 8px;white-space:nowrap">🚫 Shop Closed</span>`
      : isOwn
        ? `<span style="font-size:10px;color:var(--text-dim);font-style:italic">Your listing</span>`
        : G.walletConnected
          ? `<button class="market-buy-btn" data-id="${l.id}" style="background:rgba(255,209,64,0.15);border:1px solid rgba(255,209,64,0.4);border-radius:8px;padding:5px 10px;font-size:11px;font-weight:800;color:#FFD700;cursor:pointer;white-space:nowrap">Buy ₿${bsvDisplay}</button>`
          : `<span style="font-size:10px;color:var(--text-dim)">Wallet needed</span>`;

    return `<div class="market-listing-row" style="display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:9px;background:rgba(20,42,16,0.6);border:1px solid ${isHeritage ? 'rgba(255,215,0,0.3)' : isOwn ? 'rgba(111,207,58,0.3)' : 'var(--border)'};margin-bottom:6px;${isOwn ? 'opacity:0.7' : ''}">
      <svg width="32" height="32" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" style="background:${theme.bg};border-radius:6px;flex-shrink:0${isExotic ? ';box-shadow:0 0 4px '+(theme.border||'#79C271') : ''}">${cropArt(baseCropId)}</svg>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:800;color:${isHeritage ? '#FFD700' : 'var(--text)'}">${escHtml(l.crop_name||'')} ×${l.qty}</div>
        <div style="font-size:10px;color:var(--text-dim);margin-top:1px">${escHtml(l.seller_name||'Farmer')} · ${l.listed_at ? timeSince(new Date(l.listed_at)) : 'recently'}</div>
        ${badges ? `<div style="margin-top:3px;display:flex;gap:3px;flex-wrap:wrap">${badges}</div>` : ''}
      </div>
      ${buyCell}
    </div>`;
  }).join('');

  container.innerHTML = rowsHtml + `<div style="text-align:center;font-size:10px;color:var(--text-dim);margin-top:8px">Cached 30s · ${filtered.length} listing${filtered.length!==1?'s':''} shown</div>`;
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
  const baseCropId = (listing.crop_id||'').replace('_heritage','');
  const theme = CROP_THEME[baseCropId] || { bg:'#1A1A1A' };
  const bsvDisplay = (listing.satoshis / 1e8).toFixed(5);
  const overlay = document.createElement('div');
  overlay.id = 'buy-confirm-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:510;display:flex;align-items:center;justify-content:center;padding:16px';
  overlay.innerHTML = `
    <div style="background:linear-gradient(160deg,#182B14 0%,#111D0F 100%);border:1.5px solid rgba(255,209,64,0.4);border-radius:18px;padding:22px 20px 18px;max-width:320px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.8)">
      <div style="margin-bottom:10px"><svg width="52" height="52" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" style="background:${theme.bg};border-radius:10px">${cropArt(baseCropId)}</svg></div>
      <div style="font-family:var(--ff-head);font-size:17px;color:#FFD700;margin-bottom:4px">Confirm Purchase</div>
      <div style="font-size:13px;color:var(--text);margin-bottom:4px;font-weight:800">${escHtml(listing.crop_name||'')} ×${listing.qty}</div>
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:4px">Seller: ${escHtml(listing.seller_name||'Farmer')}</div>
      <div style="font-size:20px;font-weight:800;color:#FFD700;margin:10px 0">₿ ${bsvDisplay}</div>
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:16px">Seeds added to storage on payment success. Bypasses level restrictions.</div>
      <div style="display:flex;gap:8px;justify-content:center">
        <button id="buy-confirm-btn" onclick="executePurchase(this)" style="flex:1;background:rgba(255,209,64,0.2);border:1px solid rgba(255,209,64,0.5);border-radius:10px;padding:10px;font-size:13px;font-weight:800;color:#FFD700;cursor:pointer">Confirm Buy</button>
        <button onclick="document.getElementById('buy-confirm-overlay').remove()" style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:10px;padding:10px 16px;font-size:13px;color:var(--text-dim);cursor:pointer">Cancel</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

export async function executePurchase(btnEl) {
  const listing = window._pendingBuyListing;
  if (!listing) return;
  if (!G.walletConnected) { if (window.notify) window.notify('🔗 Connect your wallet to buy!', 'error'); return; }
  if (btnEl) { btnEl.disabled = true; btnEl.textContent = '⏳ Paying…'; }
  const ref = 'trade-' + listing.id;
  if (window.platformSDK && G.walletConnected) {
    window.platformSDK.sendCommand({ type:'pay', ref, recipients:[{ address:listing.seller_address, value:listing.satoshis, note:'Plot Twist Vege Stand: '+(listing.crop_name||'') }] });
    const _payHandler = async (event) => {
      const data = event.data;
      if (!data || data.command !== 'ninja-app-command') return;
      if (data.type !== 'pay-response' || data.payload.ref !== ref) return;
      window.removeEventListener('message', _payHandler);
      if (data.payload.success) {
        const baseCropId = (listing.crop_id||'').replace('_heritage','');
        const inventoryKey = listing.heritage ? baseCropId+'_heritage' : baseCropId;
        G.inventory[inventoryKey] = (G.inventory[inventoryKey]||0) + listing.qty;
        saveGame();
        if (window.renderStorage) window.renderStorage();
        document.getElementById('buy-confirm-overlay')?.remove();
        window._pendingBuyListing = null;
        _marketCache = null; _marketCacheTime = 0;
        if (window.notify) window.notify('🥕 Purchased '+listing.qty+'× '+(listing.crop_name||'')+' — check storage.', 'unlock');
        const db = lbClient();
        if (db) {
          try { await db.from('listings').update({ status:'sold', sold_at:new Date().toISOString(), buyer_address:G.walletAddress }).eq('id', listing.id); } catch(e) {}
        }
        const panel = document.getElementById('jtab-market');
        if (panel && panel.classList.contains('active')) renderMarketTab();
      } else {
        if (btnEl) { btnEl.disabled=false; btnEl.textContent='Confirm Buy'; }
        if (window.notify) window.notify('₿ Purchase failed: '+(data.payload.message||'Payment failed'), 'error');
      }
    };
    window.addEventListener('message', _payHandler);
  } else {
    if (btnEl) { btnEl.disabled=false; btnEl.textContent='Confirm Buy'; }
    if (window.notify) window.notify('₿ Open inside Metanet.page to buy seeds.', 'error');
  }
}

export async function listSeeds(cropId, qty, satoshis = null) {
  if (!G.walletConnected) { if (window.notify) window.notify('🔗 Connect your wallet to list seeds!', 'error'); return; }
  if ((G.inventory[cropId]||0) < qty) { if (window.notify) window.notify('⚠️ Not enough seeds in storage!', 'error'); return; }
  const baseCropId = cropId.replace('_heritage','');
  const crop = CROP_MAP[baseCropId] || {};
  const isHeritage = cropId.includes('_heritage');
  const basePrice = crop.seedCost ? crop.seedCost * 100 : 1000;
  const multiplier = isHeritage ? 3 : (crop.exotic ? 2 : 1);
  const defaultSatoshis = Math.floor(basePrice * multiplier * (qty >= 3 ? 0.9 : 1));
  const finalSatoshis = satoshis !== null ? Math.max(1, Math.floor(satoshis)) : defaultSatoshis;
  const listing = { id:'listing-'+Date.now()+'-'+Math.random().toString(36).substr(2,9), cropId, cropName:crop.name||'Unknown', qty, satoshis: finalSatoshis, heritage:isHeritage, seller_address:G.walletAddress, seller_name:G.farmerName||'Farmer', status:'active', listed_at:new Date().toISOString() };
  G.inventory[cropId] -= qty;
  if (G.inventory[cropId] <= 0) delete G.inventory[cropId];
  G.standListings = G.standListings || [];
  G.standListings.push(listing);
  saveGame();
  const db = lbClient();
  if (db) { try { await db.from('listings').insert({ ...listing, crop_id:cropId, crop_name:crop.name||'Unknown' }); } catch(e) {} }
  renderVegeStand();
  if (window.renderStorage) window.renderStorage();
  if (window.notify) window.notify('🌱 Listed '+qty+'× '+(crop.name||'seeds')+' for ₿'+(finalSatoshis/1e8).toFixed(5)+'!', 'unlock');
}

export async function cancelListing(listingId) {
  const listings = G.standListings || [];
  const idx = listings.findIndex(l => l.id === listingId);
  if (idx === -1) { if (window.notify) window.notify('⚠️ Listing not found!', 'error'); return; }
  const listing = listings[idx];
  const inventoryKey = listing.heritage ? listing.cropId+'_heritage' : listing.cropId;
  G.inventory[inventoryKey] = (G.inventory[inventoryKey]||0) + listing.qty;
  G.standListings.splice(idx, 1);
  saveGame();
  const db = lbClient();
  if (db) { try { await db.from('listings').update({ status:'cancelled' }).eq('id', listingId); } catch(e) {} }
  renderVegeStand();
  if (window.renderStorage) window.renderStorage();
  if (window.notify) window.notify('↩️ Listing cancelled — '+listing.qty+'× '+listing.cropName+' returned to storage.', 'harvest');
}
