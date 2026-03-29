// marketplace.js - Marketplace functionality
// Uses window.notify and window.renderStorage to avoid circular dep with rendering.js

import { G, saveGame, ensureVegeStandUnlocked } from './game-state.js';
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
  const listings = G.standListings || [];
  const listingCount = listings.length;
  const enabled = G.standEnabled !== false || G.standUnlocked;

  area.innerHTML = `
    <button id="vege-stand-btn" onclick="openVegeStand()"
      style="background:none;border:none;cursor:pointer;padding:0" title="Vege Stand">
      ${vegeSVG(listingCount, enabled)}
    </button>
    <div id="vege-stand-info">
      <div id="vege-stand-label">🥕 Vege Stand
        <span style="font-size:10px;font-weight:700;color:var(--text-dim)">sell exotic seeds</span>
      </div>
      <div id="vege-stand-status" style="font-size:11px;color:var(--text-dim)">
        ${enabled ? (listingCount > 0 ? listingCount + ' listing' + (listingCount!==1?'s':'') + ' active' : 'No active listings') : 'Stand closed'}
      </div>
    </div>`;
}

function vegeSVG(listingCount, enabled) {
  const signColor = enabled ? '#4CAF50' : '#888';
  const signText  = enabled ? 'OPEN' : 'CLOSED';
  return `<svg width="56" height="56" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="20" width="40" height="28" rx="3" fill="#5D4037" stroke="#4E342E" stroke-width="1.5"/>
    <rect x="6" y="16" width="44" height="7" rx="3" fill="#795548" stroke="#4E342E" stroke-width="1"/>
    <rect x="12" y="10" width="32" height="8" rx="2" fill="${signColor}" opacity="0.9"/>
    <text x="28" y="17" text-anchor="middle" font-size="5" font-weight="800" fill="white" font-family="sans-serif">${signText}</text>
    ${listingCount > 0 ? `<circle cx="20" cy="34" r="5" fill="#E57373"/><circle cx="28" cy="32" r="5" fill="#FFB74D"/><circle cx="36" cy="34" r="5" fill="#81C784"/>` : ''}
  </svg>`;
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
    return `<button onclick="setMarketFilter('${f}')" style="font-size:10px;font-weight:800;font-family:var(--ff-body);padding:4px 10px;border-radius:14px;border:1px solid ${active?'var(--xp-purple)':'var(--border)'};background:${active?'var(--xp-purple)':'transparent'};color:${active?'#1A0F2E':'var(--text-dim)'};cursor:pointer">${label}</button>`;
  }).join('') + `<button onclick="refreshMarket()" style="margin-left:auto;font-size:10px;font-weight:700;font-family:var(--ff-body);padding:4px 8px;border-radius:14px;border:1px solid var(--border);background:transparent;color:var(--text-dim);cursor:pointer">↻ Refresh</button>`;
}

export function renderMarketSortBar() {
  const bar = document.getElementById('market-sort-bar');
  if (!bar) return;
  const sorts = [['newest','Newest'],['price_asc','Price ↑'],['price_desc','Price ↓'],['qty','Qty']];
  bar.innerHTML = `<span style="font-size:10px;color:var(--text-dim)">Sort:</span>` +
    sorts.map(([v,l]) => {
      const active = _marketSort === v;
      return `<button onclick="setMarketSort('${v}')" style="font-size:10px;font-family:var(--ff-body);padding:3px 8px;border-radius:10px;border:1px solid ${active?'var(--green-hi)':'var(--border)'};background:${active?'rgba(111,207,58,0.15)':'transparent'};color:${active?'var(--green-hi)':'var(--text-dim)'};cursor:pointer">${l}</button>`;
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
    container.innerHTML = '<div style="text-align:center;color:var(--text-dim);font-size:13px;padding:30px 0">🌱 No listings found.</div>';
    return;
  }
  window._marketListings = {};
  filtered.forEach(l => { window._marketListings[l.id] = l; });
  const rowsHtml = filtered.map(l => {
    const baseCropId = (l.crop_id||'').replace('_heritage','');
    const crop = CROP_MAP[baseCropId] || {};
    const theme = CROP_THEME[baseCropId] || { bg:'#1A1A1A' };
    const isExotic = !!crop.exotic, isHeritage = !!l.heritage;
    const isOwn = G.walletAddress && l.seller_address === G.walletAddress;
    const bsvDisplay = (l.satoshis / 1e8).toFixed(5);
    const buyCell = isOwn
      ? `<span style="font-size:10px;color:var(--text-dim);font-style:italic">Your listing</span>`
      : G.walletConnected
        ? `<button class="market-buy-btn" data-id="${l.id}" style="background:rgba(255,209,64,0.15);border:1px solid rgba(255,209,64,0.4);border-radius:8px;padding:5px 10px;font-size:11px;font-weight:800;color:#FFD700;cursor:pointer;white-space:nowrap">Buy ₿${bsvDisplay}</button>`
        : `<span style="font-size:10px;color:var(--text-dim)">Wallet needed</span>`;
    return `<div class="market-listing-row" style="display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:9px;background:rgba(20,42,16,0.6);border:1px solid ${isHeritage?'rgba(255,215,0,0.3)':isOwn?'rgba(111,207,58,0.3)':'var(--border)'};margin-bottom:6px">
      <svg width="32" height="32" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" style="background:${theme.bg};border-radius:6px;flex-shrink:0">${cropArt(baseCropId)}</svg>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:800;color:${isHeritage?'#FFD700':'var(--text)'}">${escHtml(l.crop_name||'')} ×${l.qty}</div>
        <div style="font-size:10px;color:var(--text-dim);margin-top:1px">${escHtml(l.seller_name||'Farmer')} · ${l.listed_at?timeSince(new Date(l.listed_at)):'recently'}</div>
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
    <div style="background:linear-gradient(160deg,#182B14 0%,#111D0F 100%);border:1.5px solid rgba(255,209,64,0.4);border-radius:18px;padding:22px 20px 18px;max-width:320px;width:100%;text-align:center">
      <div style="margin-bottom:10px"><svg width="52" height="52" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" style="background:${theme.bg};border-radius:10px">${cropArt(baseCropId)}</svg></div>
      <div style="font-family:var(--ff-head);font-size:17px;color:#FFD700;margin-bottom:4px">Confirm Purchase</div>
      <div style="font-size:13px;color:var(--text);margin-bottom:4px;font-weight:800">${escHtml(listing.crop_name||'')} ×${listing.qty}</div>
      <div style="font-size:20px;font-weight:800;color:#FFD700;margin:10px 0">₿ ${bsvDisplay}</div>
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

export async function listSeeds(cropId, qty) {
  if (!G.walletConnected) { if (window.notify) window.notify('🔗 Connect your wallet to list seeds!', 'error'); return; }
  if ((G.inventory[cropId]||0) < qty) { if (window.notify) window.notify('⚠️ Not enough seeds in storage!', 'error'); return; }
  const baseCropId = cropId.replace('_heritage','');
  const crop = CROP_MAP[baseCropId] || {};
  const isHeritage = cropId.includes('_heritage');
  const basePrice = crop.seedCost ? crop.seedCost * 100 : 1000;
  const multiplier = isHeritage ? 3 : (crop.exotic ? 2 : 1);
  const satoshis = Math.floor(basePrice * multiplier * (qty >= 3 ? 0.9 : 1));
  const listing = { id:'listing-'+Date.now()+'-'+Math.random().toString(36).substr(2,9), cropId, cropName:crop.name||'Unknown', qty, satoshis, heritage:isHeritage, seller_address:G.walletAddress, seller_name:G.farmerName||'Farmer', status:'active', listed_at:new Date().toISOString() };
  G.inventory[cropId] -= qty;
  if (G.inventory[cropId] <= 0) delete G.inventory[cropId];
  G.standListings = G.standListings || [];
  G.standListings.push(listing);
  saveGame();
  const db = lbClient();
  if (db) { try { await db.from('listings').insert({ ...listing, crop_id:cropId, crop_name:crop.name||'Unknown' }); } catch(e) {} }
  renderVegeStand();
  if (window.renderStorage) window.renderStorage();
  if (window.notify) window.notify('🌱 Listed '+qty+'× '+(crop.name||'seeds')+' for ₿'+(satoshis/1e8).toFixed(5)+'!', 'unlock');
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
