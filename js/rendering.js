// rendering.js - UI rendering functions

import { G } from './game-state.js';
import { CROP_MAP, CROPS, EXOTIC_CROPS, LEVELS, PLOT_COSTS, COMPOST_MAX_CHARGES, MARKETPLACE_ENABLED } from './constants.js';
import { CROP_THEME, cropArt, formatTime, formatBSV, getCurrentLevel, getLevelData, calcFarmScore,
         prestigeMultiplier, wateringCanCharge, compostNextChargeSecs, lockSVG, soilSVG, makeCropCardSVG,
         isCropUnlocked, WATERING_CAN_CHARGE_SECS } from './utils.js';
import { ALL_ACHIEVEMENTS, CROP_MILESTONES, _pendingNewAchievements, clearPendingAchievements } from './achievements.js';
import { renderVegeStand, renderMarketTab, renderMarketFilterBar, renderMarketSortBar, renderMarketListings } from './marketplace.js';
import { renderLeaderboardTab, lbUpdateShareBtn } from './leaderboard.js';

// Journal state
let _currentJTab = 'crops';

// ============================================================
// WATERING CAN
// ============================================================
export function renderWateringCan() {
  if (!G) return;
  const btn = document.getElementById('watering-can-btn');
  const fill = document.getElementById('watering-can-bar-fill');
  const status = document.getElementById('watering-can-status');
  if (!btn || !fill || !status) return;

  const charge = wateringCanCharge();
  const isFull = charge >= 1;
  const hasGrowing = G.plots.some(p => p.cropId && p.plantedAt && !p.ready);

  btn.innerHTML = wateringCanSVG(charge);
  btn.disabled = !isFull || !hasGrowing;
  btn.title = isFull
    ? (hasGrowing ? 'Click to water crops (−10% grow time)' : 'No growing crops to water')
    : 'Filling… click when full';

  fill.style.width = (charge * 100).toFixed(1) + '%';
  fill.classList.toggle('full', isFull);

  if (isFull) {
    status.textContent = hasGrowing ? '🚿 Ready! Click to water all crops' : '🪣 Full — plant something first';
    status.style.color = hasGrowing ? 'var(--green-hi)' : 'var(--text-dim)';
  } else {
    const secsLeft = Math.ceil(WATERING_CAN_CHARGE_SECS * (1 - charge));
    status.textContent = '💧 Filling… ' + formatTime(secsLeft) + ' remaining';
    status.style.color = 'var(--text-dim)';
  }
}

function wateringCanSVG(charge) {
  const pct = Math.min(charge, 1);
  const waterColor = pct >= 1 ? '#4FC3F7' : pct >= 0.5 ? '#81C784' : '#E8F5E8';
  const opacity = 0.3 + pct * 0.7;
  return `<svg width="56" height="56" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg">
    <rect x="12" y="18" width="32" height="30" rx="4" fill="#607D8B" stroke="#546E7A" stroke-width="1.5"/>
    ${pct > 0 ? `<rect x="13" y="${48 - Math.round(28*pct)}" width="30" height="${Math.round(28*pct)}" rx="3" fill="${waterColor}" opacity="${opacity}" clip-path="url(#can-clip)"/>` : ''}
    <clipPath id="can-clip"><rect x="13" y="20" width="30" height="28" rx="3"/></clipPath>
    <path d="M44 22 Q50 18 50 25 Q50 32 44 28" fill="none" stroke="#546E7A" stroke-width="3" stroke-linecap="round"/>
    <rect x="8" y="24" width="6" height="8" rx="3" fill="#607D8B" stroke="#546E7A" stroke-width="1"/>
    ${pct >= 1 ? `<circle cx="20" cy="15" r="1.5" fill="${waterColor}" opacity="0.8"/><circle cx="28" cy="12" r="1.2" fill="${waterColor}" opacity="0.6"/><circle cx="36" cy="15" r="1.8" fill="${waterColor}" opacity="0.7"/>` : ''}
  </svg>`;
}

// ============================================================
// COMPOST
// ============================================================
export function renderCompost() {
  if (!G) return;
  const btn = document.getElementById('compost-btn');
  const status = document.getElementById('compost-status');
  const pips = document.getElementById('compost-pips');
  if (!btn || !status || !pips) return;

  btn.innerHTML = compostPileSVG(G.compostCharges);
  const hasCharges = G.compostCharges > 0;
  btn.disabled = !hasCharges;

  pips.innerHTML = Array.from({length: COMPOST_MAX_CHARGES}, (_, i) =>
    `<div class="compost-pip ${i < G.compostCharges ? 'filled' : ''}"></div>`
  ).join('');

  if (G.fertiliseMode) {
    status.textContent = '🌿 Select a plot to fertilise!';
    status.style.color = '#8BC34A';
  } else if (hasCharges) {
    const secsLeft = compostNextChargeSecs();
    const nextInfo = G.compostCharges < COMPOST_MAX_CHARGES ? ' (next in ' + formatTime(secsLeft) + ')' : '';
    status.textContent = G.compostCharges + '/' + COMPOST_MAX_CHARGES + ' charges' + nextInfo;
    status.style.color = 'var(--green-hi)';
  } else {
    status.textContent = '⏳ Recharging… ' + formatTime(compostNextChargeSecs());
    status.style.color = 'var(--text-dim)';
  }
}

function compostPileSVG(charges) {
  const pct = charges / COMPOST_MAX_CHARGES;
  const pileColor = pct >= 0.8 ? '#6D4C41' : pct >= 0.4 ? '#5D4037' : '#4E342E';
  const steamColor = pct >= 0.6 ? 'rgba(139,195,74,0.6)' : 'rgba(180,180,180,0.3)';
  return `<svg width="56" height="56" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="22" width="36" height="26" rx="4" fill="${pileColor}" stroke="#3E2723" stroke-width="1.5"/>
    ${charges > 0 ? `<rect x="11" y="${48-Math.round(24*pct)}" width="34" height="${Math.round(24*pct)}" rx="3" fill="#558B2F" opacity="0.55" clip-path="url(#bin-clip)"/>` : ''}
    <clipPath id="bin-clip"><rect x="11" y="23" width="34" height="24" rx="3"/></clipPath>
    <rect x="8" y="18" width="40" height="7" rx="3" fill="#4E342E" stroke="#3E2723" stroke-width="1.5"/>
    ${pct >= 0.4 ? `<path d="M20 15 Q18 11 20 8 Q22 5 20 2" fill="none" stroke="${steamColor}" stroke-width="1.5" stroke-linecap="round"/>` : ''}
    ${pct >= 0.6 ? `<path d="M28 14 Q26 10 28 7 Q30 4 28 1" fill="none" stroke="${steamColor}" stroke-width="1.5" stroke-linecap="round"/>` : ''}
  </svg>`;
}

// ============================================================
// MAIN RENDER FUNCTIONS
// ============================================================
export function renderAll() {
  if (!G) return;
  renderStats();
  renderHeading();
  renderPlots();
  renderStorage();
  renderShop();
  renderWateringCan();
  renderCompost();
  if (MARKETPLACE_ENABLED) renderVegeStand();
  lbUpdateShareBtn();
}

export function renderStats() {
  const ld = getCurrentLevel();
  const xpInLevel = G.totalXP - ld.xpMin;
  const xpNeeded = ld.xpMax - ld.xpMin;
  const xpPct = Math.min((xpInLevel / xpNeeded) * 100, 100);

  document.getElementById('stat-coins').textContent = G.coins;
  document.getElementById('stat-level').textContent = G.level;
  document.getElementById('stat-level-title').textContent = ld.title;
  document.getElementById('stat-xp').textContent = G.totalXP;
  document.getElementById('stat-xp-max').textContent = ld.xpMax;
  document.getElementById('xp-fill').style.width = xpPct + '%';
  document.getElementById('stat-score').textContent = calcFarmScore();

  const pp = document.getElementById('prestige-pill');
  if (pp) {
    const p = G.prestige;
    if (p > 0 || G.level >= 10) {
      pp.style.display = 'flex';
      const starsEl = document.getElementById('prestige-stars');
      const bonusEl = document.getElementById('prestige-bonus');
      const starStr = p === 0 ? '⭐ Prestige' : p <= 10 ? '⭐'.repeat(p) : '⭐×' + p;
      if (starsEl) starsEl.textContent = starStr;
      if (bonusEl) bonusEl.textContent = p > 0 ? '+' + (p*10) + '%' : '';
      pp.className = 'prestige-pill';
      if (p >= 50) pp.classList.add('max');
      if (G.level >= 10 && p < 50) pp.classList.add('prestige-ready');
    } else {
      pp.style.display = 'none';
    }
  }

  const bsvStatus = document.getElementById('bsv-status');
  const bsvBtn = document.querySelector('#bsv-pill button');
  if (G.walletConnected) {
    if (bsvStatus) bsvStatus.textContent = '₿ ' + G.walletAddress.substring(0,10) + '…';
    if (bsvBtn) {
      bsvBtn.textContent = 'Connected ✓';
      bsvBtn.style.background = 'var(--green-hi)';
      bsvBtn.style.color = '#0A1F06';
      bsvBtn.disabled = false;
      // Use window globals to avoid circular dep with wallet.js
      bsvBtn.onclick = () => window.disconnectWallet && window.disconnectWallet();
    }
  } else {
    if (bsvStatus) bsvStatus.textContent = 'Wallet: Local Mode';
    if (bsvBtn) {
      bsvBtn.textContent = 'Connect';
      bsvBtn.style.background = '';
      bsvBtn.style.color = '';
      bsvBtn.disabled = false;
      bsvBtn.onclick = () => window.connectWallet && window.connectWallet();
    }
  }
}

export function renderPlots() {
  const grid = document.getElementById('plots-grid');
  if (!grid) return;
  const now = Date.now();

  grid.innerHTML = G.plots.map((plot, idx) => {
    const cost = PLOT_COSTS[idx];

    if (!plot.unlocked) {
      const canAfford = G.coins >= cost;
      const canUnlock = idx === 0 || G.plots[idx-1].harvestedCount >= 1;
      const bsvCost = formatBSV(cost);
      return `<div class="plot-tile locked" data-idx="${idx}">
        <div class="plot-visual" style="background:#131310;border:2px solid rgba(255,255,255,0.05)">
          <div class="plot-overlay" style="flex-direction:column;gap:4px">${lockSVG()}</div>
          <div class="plot-label" style="color:${canAfford?'#FFD140':'#888'}">🪙 ${cost}</div>
        </div>
        <div class="plot-footer" style="display:flex;flex-direction:column;gap:3px;padding:5px 6px">
          <span style="font-size:9px;color:var(--text-dim);text-align:center">${!canUnlock?'⚠️ harvest first':'Plot '+(idx+1)}</span>
          ${canUnlock?`<div style="display:flex;gap:4px">
            <button onclick="tryUnlockPlot(${idx})" style="flex:1;background:${canAfford?'rgba(255,209,64,0.15)':'rgba(100,100,100,0.15)'};border:1px solid ${canAfford?'rgba(255,209,64,0.4)':'rgba(100,100,100,0.3)'};border-radius:6px;padding:3px 4px;font-size:9px;font-weight:800;color:${canAfford?'#FFD140':'#888'};cursor:${canAfford?'pointer':'not-allowed'}" ${canAfford?'':'disabled'}>🪙 ${cost}</button>
            <button onclick="unlockPlotBSV(${idx})" style="flex:1;background:${G.walletConnected?'rgba(200,134,10,0.2)':'rgba(100,100,100,0.1)'};border:1px solid ${G.walletConnected?'rgba(200,134,10,0.5)':'rgba(100,100,100,0.2)'};border-radius:6px;padding:3px 4px;font-size:9px;font-weight:800;color:${G.walletConnected?'#F5A623':'#666'};cursor:${G.walletConnected?'pointer':'not-allowed'}" ${G.walletConnected?'':'disabled'}>₿ ${bsvCost}</button>
          </div>`:''}
        </div>
      </div>`;
    }

    if (!plot.cropId) {
      const isTarget = G.selectedCrop !== null && (G.inventory[G.selectedCrop] || 0) > 0;
      const isFertTarget = G.fertiliseMode && !plot.fertilised;
      let overlayContent = isTarget
        ? `<div style="opacity:0.55;transform:scale(0.7)">${makeCropCardSVG(G.selectedCrop, 50, 50)}</div>`
        : isFertTarget ? `<span style="font-size:22px">🌿</span>`
        : `<span class="plus-sign">+</span>`;
      const clickHandler = G.fertiliseMode ? `applyFertiliser(${idx})` : `tryPlant(${idx})`;
      return `<div class="plot-tile empty ${isTarget?'plant-target':''} ${isFertTarget?'fertilise-target':''}" data-idx="${idx}" onclick="${clickHandler}">
        <div class="plot-visual">
          <div class="plot-soil-bg">${soilSVG('100%','100%')}</div>
          <div class="plot-overlay">${overlayContent}</div>
          ${plot.fertilised?'<div class="plot-fertilised-badge">🌿 +25%</div>':''}
        </div>
        <div class="plot-footer">Plot ${idx+1} — ${isFertTarget?'Tap to fertilise':isTarget?'Tap to plant':'Empty'}</div>
      </div>`;
    }

    const crop = CROP_MAP[plot.cropId];

    if (plot.ready) {
      const displayPrice = Math.floor(crop.sellPrice * prestigeMultiplier() * (plot.fertilised?1.25:1));
      if (crop.exotic) {
        return `<div class="plot-tile ready exotic-ready" data-idx="${idx}" onclick="showHarvestFork(${idx})">
          <div class="plot-visual">
            <div class="plot-soil-bg">${soilSVG('100%','100%')}</div>
            <div class="plot-overlay" style="display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px">
              <svg width="52" height="52" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 0 6px rgba(255,215,0,0.5))">${cropArt(plot.cropId)}</svg>
            </div>
            <div style="position:absolute;top:4px;right:4px;font-size:11px">✨</div>
            ${plot.fertilised?'<div class="plot-fertilised-badge">🌿 +25%</div>':''}
          </div>
          <div class="plot-footer"><span style="color:#FFD700;font-weight:800;font-size:11px">✨ Harvest or Seed?</span></div>
        </div>`;
      }
      return `<div class="plot-tile ready" data-idx="${idx}" onclick="harvestCrop(${idx})">
        <div class="plot-visual">
          <div class="plot-soil-bg">${soilSVG('100%','100%')}</div>
          <div class="plot-overlay" style="display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px">
            <svg width="52" height="52" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">${cropArt(plot.cropId)}</svg>
          </div>
          ${plot.fertilised?'<div class="plot-fertilised-badge">🌿 +25%</div>':''}
        </div>
        <div class="plot-footer"><span class="footer-harvest">✨ Harvest! +🪙${displayPrice}</span></div>
      </div>`;
    }

    if (plot.seeding) {
      const elapsedFrac = plot.seedingDuration ? Math.min((now - plot.seedingStartedAt) / plot.seedingDuration, 1) : 0;
      const remaining2 = plot.seedingDuration ? Math.max((plot.seedingDuration - (now - plot.seedingStartedAt)) / 1000, 0) : 0;
      const atRisk = elapsedFrac >= 0.5;
      const r2 = 44, circ2 = 2*Math.PI*r2, offset2 = circ2*(1-elapsedFrac);
      const ringColour = plot.seedReady ? '#FFD700' : atRisk ? '#FF8C00' : '#A78BFA';
      if (plot.seedReady) {
        return `<div class="plot-tile seeding seed-ready" data-idx="${idx}" onclick="collectSeeds(${idx})">
          <div class="plot-visual">
            <div class="plot-soil-bg">${soilSVG('100%','100%')}</div>
            <div class="plot-overlay" style="display:flex;align-items:center;justify-content:center;flex-direction:column;gap:4px">
              <div style="font-size:28px;filter:drop-shadow(0 0 6px gold)">🌱</div>
              <div style="font-size:9px;color:#FFD700;font-weight:800">Seeds Ready!</div>
            </div>
            <svg class="progress-ring-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <circle class="progress-ring-bg" cx="50" cy="50" r="${r2}" stroke-width="5"/>
              <circle class="progress-ring-fill" cx="50" cy="50" r="${r2}" stroke-width="5" stroke="${ringColour}" stroke-dasharray="${circ2.toFixed(2)}" stroke-dashoffset="0"/>
            </svg>
          </div>
          <div class="plot-footer" style="color:#FFD700;font-weight:800;font-size:11px">🌱 Tap to collect seeds</div>
        </div>`;
      }
      return `<div class="plot-tile seeding" data-idx="${idx}">
        <div class="plot-visual">
          <div class="plot-soil-bg">${soilSVG('100%','100%')}</div>
          <div class="plot-overlay" style="display:flex;align-items:center;justify-content:center;flex-direction:column;gap:2px">
            <div style="opacity:0.5;transform:scale(0.7) translateY(4px)"><svg width="52" height="52" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" style="filter:grayscale(60%)">${cropArt(plot.cropId)}</svg></div>
            <div style="font-size:9px;color:${atRisk?'#FF8C00':'#A78BFA'};font-weight:700">${atRisk?'⚠️ At risk':'🌱 Seeding…'}</div>
          </div>
          <svg class="progress-ring-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle class="progress-ring-bg" cx="50" cy="50" r="${r2}" stroke-width="5"/>
            <circle class="progress-ring-fill" cx="50" cy="50" r="${r2}" stroke-width="5" stroke="${ringColour}" stroke-dasharray="${circ2.toFixed(2)}" stroke-dashoffset="${offset2.toFixed(2)}"/>
          </svg>
          ${atRisk?'<span style="position:absolute;top:4px;right:4px;font-size:11px">⚠️</span>':''}
        </div>
        <div class="plot-footer" style="font-size:10px;color:${atRisk?'#FF8C00':'var(--text-dim)'}">${atRisk?`Seeding ⚠️ ${formatTime(remaining2)}`:`Going to seed… ${formatTime(remaining2)}`}</div>
      </div>`;
    }

    // GROWING
    const elapsed = now - plot.plantedAt;
    const progress = Math.min(elapsed / (crop.gameSecs * 1000), 1);
    const remaining = Math.max(crop.gameSecs - elapsed/1000, 0);
    const scale = 0.2 + progress * 0.6;
    const opacity = 0.4 + progress * 0.6;
    const r = 44, circ = 2*Math.PI*r, offset = circ*(1-progress);
    const isFertTarget = G.fertiliseMode && !plot.fertilised;
    const clickHandler2 = G.fertiliseMode ? `applyFertiliser(${idx})` : '';
    return `<div class="plot-tile growing ${isFertTarget?'fertilise-target':''}" data-idx="${idx}" ${clickHandler2?`onclick="${clickHandler2}"`:''}>
      <div class="plot-visual">
        <div class="plot-soil-bg">${soilSVG('100%','100%')}</div>
        <div class="plot-overlay" style="display:flex;align-items:center;justify-content:center;overflow:hidden">
          <div class="crop-art" style="transform:scale(${scale.toFixed(3)}) translateY(${(-(scale*8)).toFixed(1)}px);opacity:${opacity.toFixed(3)};transform-origin:center center">
            <svg width="52" height="52" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">${cropArt(plot.cropId)}</svg>
          </div>
        </div>
        <svg class="progress-ring-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <circle class="progress-ring-bg" cx="50" cy="50" r="${r}" stroke-width="5"/>
          <circle class="progress-ring-fill" cx="50" cy="50" r="${r}" stroke-width="5" stroke-dasharray="${circ.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"/>
        </svg>
        ${plot.fertilised?'<div class="plot-fertilised-badge">🌿 +25%</div>':''}
      </div>
      <div class="plot-footer">${isFertTarget?'🌿 Tap to fertilise':`${crop.name} — ${formatTime(remaining)}`}</div>
    </div>`;
  }).join('');
}

export function renderPlotsOnly() {
  const grid = document.getElementById('plots-grid');
  if (!grid) return;
  const now = Date.now();
  G.plots.forEach((plot, idx) => {
    const tile = grid.querySelector(`[data-idx="${idx}"]`);
    if (!tile || !plot.cropId || plot.ready || !plot.plantedAt || plot.seeding) return;
    const crop = CROP_MAP[plot.cropId];
    const elapsed = now - plot.plantedAt;
    const progress = Math.min(elapsed / (crop.gameSecs * 1000), 1);
    const remaining = Math.max(crop.gameSecs - elapsed/1000, 0);
    const scale = 0.2 + progress * 0.6;
    const opacity = 0.4 + progress * 0.6;
    const artEl = tile.querySelector('.crop-art');
    if (artEl) {
      artEl.style.transform = `scale(${scale.toFixed(3)}) translateY(${(-(scale*8)).toFixed(1)}px)`;
      artEl.style.opacity = opacity.toFixed(3);
    }
    const ringFill = tile.querySelector('.progress-ring-fill');
    if (ringFill) {
      const r = 44, circ = 2*Math.PI*r;
      ringFill.setAttribute('stroke-dashoffset', (circ*(1-progress)).toFixed(2));
    }
    const footer = tile.querySelector('.plot-footer');
    if (footer) footer.textContent = `${crop.name} — ${formatTime(remaining)}`;
  });
}

export function renderStorage() {
  const grid = document.getElementById('storage-grid');
  const badge = document.getElementById('storage-count-badge');
  if (!grid) return;
  const entries = Object.entries(G.inventory).filter(([,qty]) => qty > 0);
  entries.sort((a, b) => {
    const ai = CROPS.findIndex(c => c.id===a[0]), bi = CROPS.findIndex(c => c.id===b[0]);
    const aei = EXOTIC_CROPS.findIndex(c => c.id===a[0]), bei = EXOTIC_CROPS.findIndex(c => c.id===b[0]);
    return (ai>=0?ai:1000+aei) - (bi>=0?bi:1000+bei);
  });
  if (badge) {
    if (entries.length===0) { badge.textContent='empty'; }
    else { const total=entries.reduce((s,[,q])=>s+q,0); badge.textContent=entries.length+' type'+(entries.length!==1?'s':'')+', '+total+' seed'+(total!==1?'s':''); }
  }
  if (entries.length===0) { grid.innerHTML='<div class="storage-empty">No seeds yet — buy some from the shop →</div>'; return; }
  grid.innerHTML = entries.map(([cropId, qty]) => {
    const isHeritage = cropId.endsWith('_heritage');
    const baseCropId = isHeritage ? cropId.replace('_heritage','') : cropId;
    const crop = CROP_MAP[baseCropId]; if (!crop) return '';
    const theme = CROP_THEME[baseCropId] || { bg:'#1A1A1A' };
    const selected = G.selectedCrop === cropId;
    const isExotic = crop.exotic;
    const tileStyle = isHeritage ? `background:${theme.bg};box-shadow:0 0 10px rgba(255,215,0,0.5)`
      : isExotic ? `background:${theme.bg};box-shadow:0 0 8px ${theme.border}` : `background:${theme.bg}`;
    const nameStyle = isHeritage ? 'color:#FFD700;font-weight:800' : isExotic ? 'color:#FFD700' : '';
    const topBadge = isHeritage ? '<span style="position:absolute;top:2px;left:2px;font-size:9px;background:rgba(255,215,0,0.2);border-radius:3px;padding:0 2px;color:#FFD700;font-weight:800">✨ H</span>'
      : isExotic ? '<span style="position:absolute;top:2px;left:2px;font-size:9px">✨</span>' : '';
    const displayQty = typeof qty==='object' ? qty.qty||0 : qty;
    return `<div class="seed-tile${selected?' selected':''}" onclick="selectFromStorage('${cropId}')" title="${crop.name}: ${displayQty} seed${displayQty!==1?'s':''}">
      <div class="seed-tile-art" style="${tileStyle};position:relative">
        ${topBadge}
        <svg width="52" height="52" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">${cropArt(baseCropId)}</svg>
        <span class="seed-tile-count">${displayQty}</span>
      </div>
      <div class="seed-tile-name" style="${nameStyle}">${isHeritage?crop.name+' ✨':crop.name}</div>
    </div>`;
  }).filter(Boolean).join('');
}

export function renderShop() {
  const list = document.getElementById('shop-crops-list');
  const banner = document.getElementById('selected-banner');
  if (!list) return;

  if (G.selectedCrop) {
    const sc = CROP_MAP[G.selectedCrop];
    const qty = G.inventory[G.selectedCrop] || 0;
    banner.innerHTML = `<div class="selected-indicator">
      <svg width="18" height="18" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">${cropArt(G.selectedCrop)}</svg>
      ${sc.name} ×${qty} ready to plant
      <button onclick="event.stopPropagation();clearSelectedCrop()">✕</button>
    </div>`;
  } else { banner.innerHTML = ''; }

  const grouped = {};
  CROPS.forEach(c => { if (!grouped[c.unlockLevel]) grouped[c.unlockLevel]=[]; grouped[c.unlockLevel].push(c); });
  const sortedLevels = Object.keys(grouped).map(Number).sort((a,b)=>a-b);

  const regularHtml = sortedLevels.map(lvl => {
    const ld = getLevelData(lvl);
    const cropsHtml = grouped[lvl].map(crop => {
      const unlocked = isCropUnlocked(crop.id);
      const expanded = G.shopExpanded === crop.id;
      const theme = CROP_THEME[crop.id] || { bg:'#1A1A1A', border:'rgba(255,255,255,0.2)' };
      const inStock = G.inventory[crop.id] || 0;
      let classes = 'crop-card' + (expanded?' expanded':'') + (!unlocked?' locked-crop':'');
      const artSvg = `<svg width="36" height="36" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" style="background:${theme.bg};border-radius:6px">${cropArt(crop.id)}</svg>`;
      const stockBadge = inStock>0 ? `<span style="font-size:9px;background:rgba(111,207,58,0.2);color:var(--green-hi);border-radius:6px;padding:1px 4px;margin-left:3px;font-weight:800">×${inStock}</span>` : '';
      const lockBadge = !unlocked ? `<span class="crop-lock-badge">Lv${crop.unlockLevel}</span>` : '';
      const mainRow = `<div class="crop-card-main" style="display:flex;align-items:center;gap:7px">
        <div class="crop-card-icon">${artSvg}</div>
        <div class="crop-card-info">
          <div class="crop-card-name">${crop.name}${stockBadge}</div>
          <div class="crop-card-stats"><span class="crop-stat-coin">🪙${crop.seedCost}</span><span class="crop-stat-sell">→${crop.sellPrice}</span></div>
          <div class="crop-card-stats" style="margin-top:1px"><span class="crop-stat-time">${formatTime(crop.gameSecs)}</span></div>
        </div>${lockBadge}
      </div>`;
      let qtyPicker = '';
      if (expanded && unlocked) {
        const initQty = Math.min(1, Math.max(1, Math.floor(G.coins/crop.seedCost)));
        const totalCoins = crop.seedCost * initQty;
        qtyPicker = `<div class="crop-card-qty">
          <button class="qty-btn" onclick="event.stopPropagation();shopChangeQty('${crop.id}',-1)">−</button>
          <span class="qty-display" id="qty-val-${crop.id}">${initQty}</span>
          <button class="qty-btn" onclick="event.stopPropagation();shopChangeQty('${crop.id}',1)">+</button>
          <span class="qty-total" id="qty-total-${crop.id}">🪙 ${totalCoins}</span>
          <button class="buy-btn" id="buy-btn-${crop.id}" onclick="event.stopPropagation();buySeeds('${crop.id}',parseInt(document.getElementById('qty-val-${crop.id}').textContent))" ${G.coins>=crop.seedCost?'':'disabled'}>Buy</button>
        </div>
        <div style="display:flex;justify-content:flex-end;padding:4px 0 2px;border-top:1px solid rgba(255,209,64,0.15);margin-top:4px">
          <button class="bsv-buy-btn" id="bsv-btn-${crop.id}" onclick="event.stopPropagation();buySeedsBSV('${crop.id}',parseInt(document.getElementById('qty-val-${crop.id}').textContent))" ${G.walletConnected?'':'disabled'} title="${G.walletConnected?'Pay with BSV':'Connect wallet to pay with BSV'}">₿ <span id="qty-bsv-${crop.id}">${formatBSV(totalCoins)}</span></button>
        </div>`;
      }
      return `<div class="${classes}" onclick="toggleShopCard('${crop.id}')">${mainRow}${qtyPicker}</div>`;
    }).join('');
    return `<div class="shop-level-divider" style="${lvl>G.level?'opacity:0.35':''}">Level ${lvl} — ${ld.title}</div>${cropsHtml}`;
  }).join('');

  const ownedExotics = EXOTIC_CROPS.filter(c => (G.inventory[c.id]||0)>0 || (G.cropHarvests[c.id]||0)>0);
  let exoticHtml = '';
  if (ownedExotics.length > 0) {
    const exoticCards = EXOTIC_CROPS.map(crop => {
      const inInventory = G.inventory[crop.id]||0;
      if (inInventory===0 && !(G.cropHarvests[crop.id]||0)>0) return '';
      const theme = CROP_THEME[crop.id]||{bg:'#1A1A1A',border:'rgba(255,255,255,0.2)'};
      const expanded = G.shopExpanded===crop.id;
      const stockBadge = inInventory>0 ? `<span style="font-size:9px;background:rgba(255,215,0,0.2);color:#FFD700;border-radius:6px;padding:1px 4px;margin-left:3px;font-weight:800">×${inInventory}</span>` : '';
      const artSvg = `<svg width="36" height="36" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" style="background:${theme.bg};border-radius:6px;box-shadow:0 0 6px ${theme.border}">${cropArt(crop.id)}</svg>`;
      let qtyPicker = expanded ? `<div style="padding:6px 0 2px;font-size:11px;color:var(--text-dim);text-align:center">${inInventory>0?'Seeds obtained via Wandering Merchant only':'No seeds — find the Wandering Merchant!'}</div>` : '';
      return `<div class="crop-card${expanded?' expanded':''}" onclick="toggleShopCard('${crop.id}')" style="border-color:${theme.border}">
        <div class="crop-card-main" style="display:flex;align-items:center;gap:7px">
          <div class="crop-card-icon">${artSvg}</div>
          <div class="crop-card-info">
            <div class="crop-card-name" style="color:#FFD700">${crop.name}${stockBadge}</div>
            <div class="crop-card-stats"><span class="crop-stat-coin">🪙${crop.seedCost}</span><span class="crop-stat-sell">→${crop.sellPrice}</span></div>
            <div class="crop-card-stats" style="margin-top:1px"><span class="crop-stat-time">${formatTime(crop.gameSecs)}</span><span style="font-size:9px;color:#FFD700;opacity:0.8">✨ Exotic</span></div>
          </div>
        </div>${qtyPicker}
      </div>`;
    }).filter(Boolean).join('');
    exoticHtml = `<div class="shop-level-divider" style="background:linear-gradient(90deg,rgba(255,215,0,0.12),rgba(255,215,0,0.04));border-color:rgba(255,215,0,0.3);color:#FFD700">✨ Exotic Seeds</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:4px;grid-column:1/-1">${exoticCards}</div>`;
  }
  list.innerHTML = regularHtml + exoticHtml;
}

export function renderHeading() {
  const fn = document.getElementById('farm-name-display');
  const fr = document.getElementById('farmer-name-display');
  if (fn) fn.textContent = '🌿 ' + (G.farmName || 'My Farm');
  if (fr) fr.textContent = G.farmerName || 'Farmer';
}

// ============================================================
// NOTIFICATIONS
// ============================================================
export function notify(msg, type='harvest') {
  const container = document.getElementById('notif-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `notif ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => { el.classList.add('leaving'); setTimeout(() => el.remove(), 350); }, 2800);
}

export function shakeStat(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.parentElement.classList.add('shake');
  setTimeout(() => el.parentElement.classList.remove('shake'), 450);
}

export function showFloatLabel(text, plotIdx) {
  const grid = document.getElementById('plots-grid');
  if (!grid) return;
  const tile = grid.querySelector(`[data-idx="${plotIdx}"]`);
  if (!tile) return;
  const rect = tile.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'float-label';
  el.textContent = text;
  el.style.left = (rect.left + rect.width/2 - 20) + 'px';
  el.style.top  = rect.top + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 950);
}

// ============================================================
// JOURNAL
// ============================================================
export function openJournal() {
  const mtb = document.getElementById('market-tab-btn');
  if (mtb) mtb.style.display = MARKETPLACE_ENABLED ? '' : 'none';
  clearPendingAchievements();   // replaces direct reassignment of imported binding
  const dot = document.getElementById('journal-new-badge');
  if (dot) dot.style.display = 'none';
  renderJournal();
  document.getElementById('journal-overlay').classList.remove('hidden');
}

export function closeJournal() {
  document.getElementById('journal-overlay').classList.add('hidden');
}

export function showJTab(tab) {
  _currentJTab = tab;
  document.querySelectorAll('.jtab').forEach(b => {
    const btnTab = b.getAttribute('onclick')?.match(/showJTab\('(\w+)'\)/)?.[1] || '';
    b.classList.toggle('active', btnTab === tab);
  });
  document.querySelectorAll('.jtab-panel').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('jtab-' + tab);
  if (el) el.classList.add('active');
  renderJournal();
}

export function renderJournal() {
  const earned = new Set(G.achievementsEarned);
  const total = ALL_ACHIEVEMENTS.length;
  const done = earned.size;
  document.getElementById('journal-summary').textContent = done + ' / ' + total + ' achievements earned';
  if (_currentJTab==='crops') renderCropsTab(earned);
  else if (_currentJTab==='farm') renderFarmTab(earned);
  else if (_currentJTab==='events') renderEventsTab(earned);
  else if (_currentJTab==='tips') renderTipsTab();
  else if (_currentJTab==='leaderboard') renderLeaderboardTab();
  else if (_currentJTab==='market') renderMarketTab();
}

export function renderCropsTab(earned) {
  const panel = document.getElementById('jtab-crops');
  if (!panel) return;
  let html = '<div style="margin-bottom:10px">';
  CROPS.forEach(crop => {
    const count = G.cropHarvests[crop.id] || 0;
    const theme = CROP_THEME[crop.id] || { bg:'#1A1A1A' };
    const artSvg = `<svg width="36" height="36" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" style="background:${theme.bg};border-radius:7px">${cropArt(crop.id)}</svg>`;
    const badges = CROP_MILESTONES.map(m => {
      const achId = 'crop_'+crop.id+'_'+m.key;
      const isEarned = earned.has(achId);
      let cls = 'crop-badge';
      if (m.key==='master' && isEarned) cls+=' platinum';
      else if (m.key==='veteran' && isEarned) cls+=' gold';
      else if (isEarned) cls+=' earned';
      return `<div class="${cls}" title="${m.label} (${m.count}×)">${isEarned?m.icon:'·'}</div>`;
    }).join('');
    const unlocked = crop.unlockLevel<=G.level || G.prestige>0 || count>0;
    html += `<div class="crop-journal-row" style="${unlocked?'':'opacity:0.35'}">
      <div class="crop-journal-art">${artSvg}</div>
      <div class="crop-journal-info"><div class="crop-journal-name">${crop.name}</div><div class="crop-journal-count">${count} harvest${count!==1?'s':''}</div></div>
      <div class="crop-journal-badges">${badges}</div>
    </div>`;
  });
  html += '</div>';
  panel.innerHTML = html;
}

function renderAchSection(title, achs, earned) {
  let html = `<div class="ach-section-title">${title}</div>`;
  achs.forEach(ach => {
    const isEarned = earned.has(ach.id);
    const result = ach.check(G);
    const progressPct = Math.min(result.progress * 100, 100);
    const isNew = _pendingNewAchievements.includes(ach.id);
    html += `<div class="ach-row ${isEarned?'earned':''} ${isNew?'new':''}">
      <div class="ach-icon">${ach.icon}</div>
      <div class="ach-info">
        <div class="ach-name">${ach.name}</div>
        <div class="ach-desc">${ach.desc}</div>
        ${!isEarned && result.progressLabel ? `<div class="ach-progress">${result.progressLabel}</div>` : ''}
      </div>
      ${!isEarned ? `<div class="ach-progress-bar"><div class="ach-progress-fill" style="width:${progressPct}%"></div></div>` : ''}
    </div>`;
  });
  return html;
}

export function renderFarmTab(earned) {
  const panel = document.getElementById('jtab-farm');
  if (!panel) return;
  panel.innerHTML = renderAchSection('🏠 Farm Achievements', ALL_ACHIEVEMENTS.filter(a=>a.category==='farm'), earned);
}

export function renderEventsTab(earned) {
  const panel = document.getElementById('jtab-events');
  if (!panel) return;
  panel.innerHTML = renderAchSection('📢 Event Achievements', ALL_ACHIEVEMENTS.filter(a=>a.category==='events'), earned);
}

export function renderTipsTab() {
  const panel = document.getElementById('jtab-tips');
  if (!panel) return;

  let html = '<div style="margin-bottom:18px">';
  html += '<div style="font-size:14px;font-weight:700;color:#FFD140;margin-bottom:8px">Market & Exotic Farming Tips</div>';
  html += '<div style="font-size:12px;color:#D7E9B9;line-height:1.6;">Watch the Vege Stand and merchant offers closely. Exotic seeds are scarce, so buy or collect them only when you can plant them promptly.</div>';
  html += '</div>';

  html += '<div style="margin-bottom:18px">';
  html += '<div style="font-size:14px;font-weight:700;color:#A78BFA;margin-bottom:8px">Exotic Seed Strategy</div>';
  html += '<div style="font-size:12px;color:#D7E9B9;line-height:1.6;">Dragon Fruit and Saffron are great late-game crops. Preserve exotic seeds across prestiges and avoid planting them unless you can complete their full grow cycle.</div>';
  html += '</div>';

  html += '<div style="margin-bottom:18px">';
  html += '<div style="font-size:14px;font-weight:700;color:#6FCF3A;margin-bottom:8px">Prestige & Progress</div>';
  html += '<div style="font-size:12px;color:#D7E9B9;line-height:1.6;">Use prestige after you have strong crop momentum and several high-value harvests. Prestige boosts future progress while letting exotic seeds survive.</div>';
  html += '</div>';

  html += '<div style="margin-bottom:6px">';
  html += '<div style="font-size:14px;font-weight:700;color:#60A5FA;margin-bottom:8px">Quick Play Tips</div>';
  html += '<div style="font-size:12px;color:#D7E9B9;line-height:1.6;">Keep plots busy, use compost and watering bonuses. Active play speeds up unlocks and merchant events.</div>';
  html += '<div style="font-size:12px;color:#D7E9B9;line-height:1.6;">Try to keep at least a small stash of coins, you never know when an unexpected event might occur.</div>';
  html += '</div>';

  panel.innerHTML = html;
}

// Confirm modal (replaces native confirm() blocked in iframes)
export function showConfirm(title, desc, onOk) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-desc').textContent  = desc;
  document.getElementById('confirm-ok').onclick = () => { closeConfirm(); onOk(); };
  document.getElementById('confirm-overlay').classList.remove('hidden');
}

export function closeConfirm() {
  document.getElementById('confirm-overlay').classList.add('hidden');
}
