// rendering.js - UI rendering functions for BSV Farm Game

import { G } from './game-state.js';

import {
  CROP_MAP,
  CROPS,
  EXOTIC_CROPS,
  LEVELS,
  PLOT_COSTS,
  COMPOST_MAX_CHARGES,
  MARKETPLACE_ENABLED,
} from './constants.js';

import {
  CROP_THEME,
  cropArt,
  formatTime,
  formatBSV,
  getCurrentLevel,
  getLevelData,
  calcFarmScore,
  prestigeMultiplier,
  wateringCanCharge,
  compostNextChargeSecs,
  lockSVG,
  soilSVG,
  makeCropCardSVG
} from './utils.js';

import {
  ALL_ACHIEVEMENTS,
  CROP_MILESTONES,
  _pendingNewAchievements,
  checkAchievements
} from './achievements.js';

// Watering Can rendering
export function renderWateringCan() {
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
    <!-- Can body -->
    <rect x="12" y="18" width="32" height="30" rx="4" fill="#607D8B" stroke="#546E7A" stroke-width="1.5"/>
    <!-- Water level -->
    ${pct > 0 ? `<rect x="13" y="${48 - Math.round(28 * pct)}" width="30" height="${Math.round(28 * pct)}" rx="3"
      fill="${waterColor}" opacity="${opacity}" clip-path="url(#can-clip)"/>` : ''}
    <clipPath id="can-clip"><rect x="13" y="20" width="30" height="28" rx="3"/></clipPath>
    <!-- Handle -->
    <path d="M44 22 Q50 18 50 25 Q50 32 44 28" fill="none" stroke="#546E7A" stroke-width="3" stroke-linecap="round"/>
    <!-- Spout -->
    <rect x="8" y="24" width="6" height="8" rx="3" fill="#607D8B" stroke="#546E7A" stroke-width="1"/>
    <!-- Water droplets when full -->
    ${pct >= 1 ? `<circle cx="20" cy="15" r="1.5" fill="${waterColor}" opacity="0.8"/>
                   <circle cx="28" cy="12" r="1.2" fill="${waterColor}" opacity="0.6"/>
                   <circle cx="36" cy="15" r="1.8" fill="${waterColor}" opacity="0.7"/>` : ''}
    <!-- Lid -->
    <circle cx="13" cy="27" r="0.8" fill="#B0BEC5"/>
  </svg>`;
}

// Compost rendering
export function renderCompost() {
  const btn = document.getElementById('compost-btn');
  const status = document.getElementById('compost-status');
  const pips = document.getElementById('compost-pips');
  if (!btn || !status || !pips) return;

  btn.innerHTML = compostPileSVG(G.compostCharges);

  const hasCharges = G.compostCharges > 0;
  btn.disabled = !hasCharges;
  btn.title = G.fertiliseMode
    ? 'Click a plot to fertilise it (or click here to cancel)'
    : hasCharges ? 'Click to enter fertilise mode — then tap a plot (+25% sell)'
                 : 'Recharging… wait for compost to be ready';

  // Charge pips
  pips.innerHTML = Array.from({length: COMPOST_MAX_CHARGES}, (_, i) =>
    `<div class="compost-pip ${i < G.compostCharges ? 'filled' : ''}" title="${i < G.compostCharges ? 'Charge available' : 'Recharging'}"></div>`
  ).join('');

  if (G.fertiliseMode) {
    status.textContent = '🌿 Select a plot to fertilise!';
    status.style.color = '#8BC34A';
  } else if (hasCharges) {
    const secsLeft = compostNextChargeSecs();
    const nextInfo = G.compostCharges < COMPOST_MAX_CHARGES
      ? ' (next in ' + formatTime(secsLeft) + ')' : '';
    status.textContent = G.compostCharges + '/' + COMPOST_MAX_CHARGES + ' charges' + nextInfo;
    status.style.color = 'var(--green-hi)';
  } else {
    const secsLeft = compostNextChargeSecs();
    status.textContent = '⏳ Recharging… ' + formatTime(secsLeft);
    status.style.color = 'var(--text-dim)';
  }
}

function compostPileSVG(charges) {
  const pct = charges / COMPOST_MAX_CHARGES;
  // Colour shifts from dull brown → rich earthy green as charges fill
  const pileColor = pct >= 0.8 ? '#6D4C41' : pct >= 0.4 ? '#5D4037' : '#4E342E';
  const steamColor = pct >= 0.6 ? 'rgba(139,195,74,0.6)' : 'rgba(180,180,180,0.3)';
  return `<svg width="56" height="56" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg">
    <!-- Bin body -->
    <rect x="10" y="22" width="36" height="26" rx="4" fill="${pileColor}" stroke="#3E2723" stroke-width="1.5"/>
    <!-- Bin slats -->
    <line x1="19" y1="22" x2="19" y2="48" stroke="#3E2723" stroke-width="1" opacity="0.5"/>
    <line x1="28" y1="22" x2="28" y2="48" stroke="#3E2723" stroke-width="1" opacity="0.5"/>
    <line x1="37" y1="22" x2="37" y2="48" stroke="#3E2723" stroke-width="1" opacity="0.5"/>
    <!-- Contents / fill level -->
    ${charges > 0 ? `<rect x="11" y="${48 - Math.round(24 * pct)}" width="34" height="${Math.round(24 * pct)}" rx="3"
      fill="#558B2F" opacity="0.55" clip-path="url(#bin-clip)"/>` : ''}
    <clipPath id="bin-clip"><rect x="11" y="23" width="34" height="24" rx="3"/></clipPath>
    <!-- Lid -->
    <rect x="8" y="18" width="40" height="7" rx="3" fill="#4E342E" stroke="#3E2723" stroke-width="1.5"/>
    <rect x="20" y="15" width="16" height="5" rx="2" fill="#4E342E" stroke="#3E2723" stroke-width="1"/>
    <!-- Steam wisps when charged -->
    ${pct >= 0.4 ? `<path d="M20 15 Q18 11 20 8 Q22 5 20 2" fill="none" stroke="${steamColor}" stroke-width="1.5" stroke-linecap="round"/>` : ''}
    ${pct >= 0.6 ? `<path d="M28 14 Q26 10 28 7 Q30 4 28 1" fill="none" stroke="${steamColor}" stroke-width="1.5" stroke-linecap="round"/>` : ''}
    ${pct >= 0.8 ? `<path d="M36 15 Q34 11 36 8 Q38 5 36 2" fill="none" stroke="${steamColor}" stroke-width="1.5" stroke-linecap="round"/>` : ''}
    <!-- Leaf decoration -->
    <ellipse cx="16" cy="25" rx="4" ry="2.5" fill="#8BC34A" opacity="${0.3 + pct * 0.5}" transform="rotate(-20 16 25)"/>
    <ellipse cx="40" cy="26" rx="3.5" ry="2" fill="#7CB342" opacity="${0.2 + pct * 0.4}" transform="rotate(15 40 26)"/>
  </svg>`;
}

// Main rendering functions
export function renderAll() {
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
  const nextLd = LEVELS[Math.min(G.level, LEVELS.length - 1)];
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

  // Prestige pill
  const pp = document.getElementById('prestige-pill');
  if (pp) {
    const p = G.prestige;
    if (p > 0 || G.level >= 10) {
      pp.style.display = 'flex';
      const starsEl = document.getElementById('prestige-stars');
      const bonusEl = document.getElementById('prestige-bonus');
      // Stars: filled star per prestige, show up to 5 then show number
      let starStr = '';
      if (p === 0) {
        starStr = '⭐ Prestige';
      } else if (p <= 10) {
        starStr = '⭐'.repeat(p);
      } else {
        starStr = '⭐×' + p;
      }
      if (starsEl) starsEl.textContent = starStr;
      if (bonusEl) bonusEl.textContent = p > 0 ? '+' + (p*10) + '%' : '';
      pp.className = 'prestige-pill';
      if (p >= 50) pp.classList.add('max');
      if (G.level >= 10 && p < 50) pp.classList.add('prestige-ready');
    } else {
      pp.style.display = 'none';
    }
  }

  // BSV status
  const bsvStatus = document.getElementById('bsv-status');
  const bsvBtn = document.querySelector('#bsv-pill button');
  if (G.walletConnected) {
    bsvStatus.textContent = '₿ ' + G.walletAddress.substring(0,10) + '…';
    if (bsvBtn) {
      bsvBtn.textContent = 'Connected ✓';
      bsvBtn.style.background = 'var(--green-hi)';
      bsvBtn.style.color = '#0A1F06';
      bsvBtn.disabled = false;
      bsvBtn.title = 'Click to disconnect wallet';
      bsvBtn.onclick = disconnectWallet;
    }
  } else {
    bsvStatus.textContent = 'Wallet: Local Mode';
    if (bsvBtn) {
      bsvBtn.textContent = 'Connect';
      bsvBtn.style.background = '';
      bsvBtn.style.color = '';
      bsvBtn.disabled = false;
      bsvBtn.title = '';
      bsvBtn.onclick = connectWallet;
    }
  }
}

export function renderPlotsOnly() {
  const grid = document.getElementById('plots-grid');
  if (!grid) return;
  const now = Date.now();
  G.plots.forEach((plot, idx) => {
    const tile = grid.querySelector(`[data-idx="${idx}"]`);
    if (!tile) return;
    if (plot.cropId && !plot.ready && plot.plantedAt && !plot.seeding) {
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

      // Update progress ring
      const ringFill = tile.querySelector('.progress-ring-fill');
      if (ringFill) {
        const r = 44;
        const circ = 2 * Math.PI * r;
        ringFill.setAttribute('stroke-dashoffset', (circ * (1 - progress)).toFixed(2));
      }

      // Footer time
      const footer = tile.querySelector('.plot-footer');
      if (footer) footer.textContent = `${crop.name} — ${formatTime(remaining)}`;
    }
  });
}

export function renderPlots() {
  const grid = document.getElementById('plots-grid');
  if (!grid) return;
  const now = Date.now();

  grid.innerHTML = G.plots.map((plot, idx) => {
    const cost = PLOT_COSTS[idx];

    // LOCKED
    if (!plot.unlocked) {
      const canAfford = G.coins >= cost;
      const prevHarvested = idx === 0 || G.plots[idx-1].harvestedCount >= 1;
      const bsvCost = formatBSV(cost);
      const canUnlock = prevHarvested;
      return `<div class="plot-tile locked" data-idx="${idx}">
        <div class="plot-visual" style="background:#131310;border:2px solid rgba(255,255,255,0.05)">
          <div class="plot-overlay" style="flex-direction:column;gap:4px">
            ${lockSVG()}
          </div>
          <div class="plot-label" style="color:${canAfford?'#FFD140':'#888'}">🪙 ${cost}</div>
        </div>
        <div class="plot-footer" style="display:flex;flex-direction:column;gap:3px;padding:5px 6px">
          <span style="font-size:9px;color:var(--text-dim);text-align:center">${!canUnlock ? '⚠️ harvest first' : 'Plot ' + (idx+1)}</span>
          ${canUnlock ? `<div style="display:flex;gap:4px">
            <button onclick="tryUnlockPlot(${idx})" style="flex:1;background:${canAfford?'rgba(255,209,64,0.15)':'rgba(100,100,100,0.15)'};border:1px solid ${canAfford?'rgba(255,209,64,0.4)':'rgba(100,100,100,0.3)'};border-radius:6px;padding:3px 4px;font-size:9px;font-weight:800;color:${canAfford?'#FFD140':'#888'};cursor:${canAfford?'pointer':'not-allowed'}" ${canAfford?'':'disabled'}>🪙 ${cost}</button>
            <button onclick="unlockPlotBSV(${idx})" style="flex:1;background:${G.walletConnected?'rgba(200,134,10,0.2)':'rgba(100,100,100,0.1)'};border:1px solid ${G.walletConnected?'rgba(200,134,10,0.5)':'rgba(100,100,100,0.2)'};border-radius:6px;padding:3px 4px;font-size:9px;font-weight:800;color:${G.walletConnected?'#F5A623':'#666'};cursor:${G.walletConnected?'pointer':'not-allowed'}" ${G.walletConnected?'':'disabled'} title="${G.walletConnected?'Pay with BSV':'Connect wallet'}">₿ ${bsvCost}</button>
          </div>` : ''}
        </div>
      </div>`;
    }

    // EMPTY
    if (!plot.cropId) {
      const isTarget = G.selectedCrop !== null && (G.inventory[G.selectedCrop] || 0) > 0;
      const isFertTarget = G.fertiliseMode && !plot.fertilised;
      let overlayContent = '';
      if (isTarget) {
        overlayContent = `<div style="opacity:0.55;transform:scale(0.7)">${makeCropCardSVG(G.selectedCrop, 50, 50)}</div>`;
      } else if (isFertTarget) {
        overlayContent = `<span style="font-size:22px">🌿</span>`;
      } else {
        overlayContent = `<span class="plus-sign">+</span>`;
      }
      const fertBadge = plot.fertilised ? `<div class="plot-fertilised-badge">🌿 +25%</div>` : '';
      const clickHandler = G.fertiliseMode ? `applyFertiliser(${idx})` : `tryPlant(${idx})`;
      return `<div class="plot-tile empty ${isTarget?'plant-target':''} ${isFertTarget?'fertilise-target':''}" data-idx="${idx}" onclick="${clickHandler}">
        <div class="plot-visual">
          <div class="plot-soil-bg">${soilSVG('100%','100%')}</div>
          <div class="plot-overlay">${overlayContent}</div>
          ${fertBadge}
        </div>
        <div class="plot-footer">Plot ${idx+1} — ${isFertTarget ? 'Tap to fertilise' : isTarget ? 'Tap to plant' : 'Empty'}</div>
      </div>`;
    }

    const crop = CROP_MAP[plot.cropId];

    // READY — exotic crops show a fork; regular crops harvest directly
    if (plot.ready) {
      const fertBadge = plot.fertilised ? `<div class="plot-fertilised-badge">🌿 +25%</div>` : '';
      const displayPrice = Math.floor(crop.sellPrice * prestigeMultiplier() * (plot.fertilised ? 1.25 : 1));
      const isExotic = crop.exotic;
      if (isExotic) {
        const theme = CROP_THEME[crop.id] || { bg:'#1A1A1A', border:'rgba(255,215,0,0.4)' };
        return `<div class="plot-tile ready exotic-ready" data-idx="${idx}" onclick="showHarvestFork(${idx})">
          <div class="plot-visual" style="box-shadow:0 0 14px rgba(255,215,0,0.25)">
            <div class="plot-soil-bg">${soilSVG('100%','100%')}</div>
            <div class="plot-overlay" style="display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px">
              <svg width="52" height="52" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 0 6px rgba(255,215,0,0.5))">${cropArt(plot.cropId)}</svg>
            </div>
            <div style="position:absolute;top:4px;right:4px;font-size:11px">✨</div>
            ${fertBadge}
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
          ${fertBadge}
        </div>
        <div class="plot-footer"><span class="footer-harvest">✨ Harvest! +🪙${displayPrice}</span></div>
      </div>`;
    }

    // SEEDING — exotic crop going to seed
    if (plot.seeding) {
      const crop2 = CROP_MAP[plot.cropId];
      const theme = CROP_THEME[plot.cropId] || { bg:'#1A1A1A', border:'rgba(255,215,0,0.4)' };
      const now2 = Date.now();
      const elapsedFrac = plot.seedingDuration
        ? Math.min((now2 - plot.seedingStartedAt) / plot.seedingDuration, 1)
        : 0;
      const remaining2 = plot.seedingDuration
        ? Math.max((plot.seedingDuration - (now2 - plot.seedingStartedAt)) / 1000, 0)
        : 0;
      const atRisk = elapsedFrac >= 0.5;
      const r2 = 44;
      const circ2 = 2 * Math.PI * r2;
      const offset2 = circ2 * (1 - elapsedFrac);
      const ringColour = plot.seedReady ? '#FFD700' : atRisk ? '#FF8C00' : '#A78BFA';

      if (plot.seedReady) {
        return `<div class="plot-tile seeding seed-ready" data-idx="${idx}" onclick="collectSeeds(${idx})">
          <div class="plot-visual" style="box-shadow:0 0 12px rgba(255,215,0,0.3)">
            <div class="plot-soil-bg">${soilSVG('100%','100%')}</div>
            <div class="plot-overlay" style="display:flex;align-items:center;justify-content:center;flex-direction:column;gap:4px">
              <div style="font-size:28px;filter:drop-shadow(0 0 6px gold)">🌱</div>
              <div style="font-size:9px;color:#FFD700;font-weight:800;text-align:center">Seeds Ready!</div>
            </div>
            <svg class="progress-ring-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <circle class="progress-ring-bg" cx="50" cy="50" r="${r2}" stroke-width="5"/>
              <circle class="progress-ring-fill" cx="50" cy="50" r="${r2}" stroke-width="5" stroke="${ringColour}" stroke-dasharray="${circ2.toFixed(2)}" stroke-dashoffset="0"/>
            </svg>
          </div>
          <div class="plot-footer" style="color:#FFD700;font-weight:800;font-size:11px">🌱 Tap to collect seeds</div>
        </div>`;
      }

      const warnIcon = atRisk ? '<span title="At risk from mishap events" style="position:absolute;top:4px;right:4px;font-size:11px">⚠️</span>' : '';
      const footerText = elapsedFrac < 0.5
        ? `Going to seed… ${formatTime(remaining2)}`
        : `Seeding ⚠️ ${formatTime(remaining2)}`;
      return `<div class="plot-tile seeding" data-idx="${idx}">
        <div class="plot-visual">
          <div class="plot-soil-bg">${soilSVG('100%','100%')}</div>
          <div class="plot-overlay" style="display:flex;align-items:center;justify-content:center;flex-direction:column;gap:2px">
            <div style="opacity:0.5;transform:scale(0.7) translateY(4px)">
              <svg width="52" height="52" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" style="filter:grayscale(60%)">${cropArt(plot.cropId)}</svg>
            </div>
            <div style="font-size:9px;color:${atRisk ? '#FF8C00' : '#A78BFA'};font-weight:700">${atRisk ? '⚠️ At risk' : '🌱 Seeding…'}</div>
          </div>
          <svg class="progress-ring-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle class="progress-ring-bg" cx="50" cy="50" r="${r2}" stroke-width="5"/>
            <circle class="progress-ring-fill" cx="50" cy="50" r="${r2}" stroke-width="5" stroke="${ringColour}" stroke-dasharray="${circ2.toFixed(2)}" stroke-dashoffset="${offset2.toFixed(2)}"/>
          </svg>
          ${warnIcon}
        </div>
        <div class="plot-footer" style="font-size:10px;color:${atRisk ? '#FF8C00' : 'var(--text-dim)'}">${footerText}</div>
      </div>`;
    }

    // GROWING
    const elapsed = now - plot.plantedAt;
    const progress = Math.min(elapsed / (crop.gameSecs * 1000), 1);
    const remaining = Math.max(crop.gameSecs - elapsed/1000, 0);
    const scale = 0.2 + progress * 0.6;
    const opacity = 0.4 + progress * 0.6;
    const r = 44;
    const circ = 2 * Math.PI * r;
    const offset = circ * (1 - progress);
    const fertBadge = plot.fertilised ? `<div class="plot-fertilised-badge">🌿 +25%</div>` : '';
    const isFertTarget = G.fertiliseMode && !plot.fertilised;
    const clickHandler = G.fertiliseMode ? `applyFertiliser(${idx})` : '';

    return `<div class="plot-tile growing ${isFertTarget ? 'fertilise-target' : ''}" data-idx="${idx}" ${clickHandler ? `onclick="${clickHandler}"` : ''}>
      <div class="plot-visual">
        <div class="plot-soil-bg">${soilSVG('100%','100%')}</div>
        <div class="plot-overlay" style="display:flex;align-items:center;justify-content:center;overflow:hidden">
          <div class="crop-art" style="transform:scale(${scale.toFixed(3)}) translateY(${(-(scale*8)).toFixed(1)}px);opacity:${opacity.toFixed(3)};transform-origin:center center">
            <svg width="52" height="52" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">${cropArt(plot.cropId)}</svg>
          </div>
        </div>
        <svg class="progress-ring-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <circle class="progress-ring-bg" cx="50" cy="50" r="${r}" stroke-width="5"/>
          <circle class="progress-ring-fill" cx="50" cy="50" r="${r}"
            stroke-width="5"
            stroke-dasharray="${circ.toFixed(2)}"
            stroke-dashoffset="${offset.toFixed(2)}"/>
        </svg>
        ${fertBadge}
      </div>
      <div class="plot-footer">${isFertTarget ? '🌿 Tap to fertilise' : `${crop.name} — ${formatTime(remaining)}`}</div>
    </div>`;
  }).join('');
}

export function renderStorage() {
  const grid = document.getElementById('storage-grid');
  const badge = document.getElementById('storage-count-badge');
  if (!grid) return;

  const entries = Object.entries(G.inventory).filter(([,qty]) => qty > 0);
  // Sort by crop order (regular crops first in their order, then exotic)
  entries.sort((a, b) => {
    const ai = CROPS.findIndex(c => c.id === a[0]);
    const bi = CROPS.findIndex(c => c.id === b[0]);
    const aei = EXOTIC_CROPS.findIndex(c => c.id === a[0]);
    const bei = EXOTIC_CROPS.findIndex(c => c.id === b[0]);
    const aIdx = ai >= 0 ? ai : 1000 + aei;
    const bIdx = bi >= 0 ? bi : 1000 + bei;
    return aIdx - bIdx;
  });

  if (badge) {
    if (entries.length === 0) {
      badge.textContent = 'empty';
    } else {
      const total = entries.reduce((s, [,q]) => s + q, 0);
      badge.textContent = entries.length + ' type' + (entries.length !== 1 ? 's' : '') + ', ' + total + ' seed' + (total !== 1 ? 's' : '');
    }
  }

  if (entries.length === 0) {
    grid.innerHTML = '<div class="storage-empty">No seeds yet — buy some from the shop →</div>';
    return;
  }

  grid.innerHTML = entries.map(([cropId, qty]) => {
    const isHeritage = cropId.endsWith('_heritage');
    const baseCropId = isHeritage ? cropId.replace('_heritage', '') : cropId;
    const crop = CROP_MAP[baseCropId];
    if (!crop) return '';
    const theme = CROP_THEME[baseCropId] || { bg: '#1A1A1A' };
    const selected = G.selectedCrop === cropId;
    const isExotic = crop.exotic;
    const tileStyle = isHeritage
      ? `background:${theme.bg};box-shadow:0 0 10px rgba(255,215,0,0.5),inset 0 0 6px rgba(255,215,0,0.12)`
      : isExotic
        ? `background:${theme.bg};box-shadow:0 0 8px ${theme.border},inset 0 0 4px rgba(255,215,0,0.08)`
        : `background:${theme.bg}`;
    const nameStyle = isHeritage ? 'color:#FFD700;font-weight:800' : isExotic ? 'color:#FFD700' : '';
    const topBadge = isHeritage
      ? '<span style="position:absolute;top:2px;left:2px;font-size:9px;background:rgba(255,215,0,0.2);border-radius:3px;padding:0 2px;color:#FFD700;font-weight:800">✨ H</span>'
      : isExotic
        ? '<span style="position:absolute;top:2px;left:2px;font-size:9px">✨</span>'
        : '';
    const displayName = isHeritage ? crop.name + ' ✨' : crop.name;
    const displayQty = typeof qty === 'object' ? qty.qty || 0 : qty;
    return `<div class="seed-tile${selected ? ' selected' : ''}" onclick="selectFromStorage('${cropId}')" title="${displayName}: ${displayQty} seed${displayQty !== 1 ? 's' : ''}${isHeritage ? ' (Heritage — +20% sell value)' : isExotic ? ' (Exotic)' : ''}">
      <div class="seed-tile-art" style="${tileStyle};position:relative">
        ${topBadge}
        <svg width="52" height="52" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">${cropArt(baseCropId)}</svg>
        <span class="seed-tile-count">${displayQty}</span>
      </div>
      <div class="seed-tile-name" style="${nameStyle}">${displayName}</div>
    </div>`;
  }).filter(Boolean).join('');
}

export function renderShop() {
  const list = document.getElementById('shop-crops-list');
  const banner = document.getElementById('selected-banner');
  if (!list) return;

  // Show which seed is selected for planting (pulled from storage)
  if (G.selectedCrop) {
    const sc = CROP_MAP[G.selectedCrop];
    const qty = G.inventory[G.selectedCrop] || 0;
    banner.innerHTML = `<div class="selected-indicator">
      <svg width="18" height="18" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">${cropArt(G.selectedCrop)}</svg>
      ${sc.name} ×${qty} ready to plant
      <button onclick="event.stopPropagation();clearSelectedCrop()">✕</button>
    </div>`;
  } else {
    banner.innerHTML = '';
  }

  // Group crops by unlock level
  const grouped = {};
  CROPS.forEach(c => {
    if (!grouped[c.unlockLevel]) grouped[c.unlockLevel] = [];
    grouped[c.unlockLevel].push(c);
  });
  const sortedLevels = Object.keys(grouped).map(Number).sort((a, b) => a - b);

  const regularHtml = sortedLevels.map(lvl => {
    const ld = getLevelData(lvl);
    const cropsHtml = grouped[lvl].map(crop => {
      const unlocked = isCropUnlocked(crop.id);
      const affordable = G.coins >= crop.seedCost;
      const expanded = G.shopExpanded === crop.id;
      const theme = CROP_THEME[crop.id] || { bg: '#1A1A1A', border: 'rgba(255,255,255,0.2)' };
      const inStock = G.inventory[crop.id] || 0;

      let classes = 'crop-card';
      if (expanded) classes += ' expanded';
      if (!unlocked) classes += ' locked-crop';

      const artSvg = `<svg width="36" height="36" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" style="background:${theme.bg};border-radius:6px">${cropArt(crop.id)}</svg>`;

      // Stock badge (seeds in storage)
      const stockBadge = inStock > 0
        ? `<span style="font-size:9px;background:rgba(111,207,58,0.2);color:var(--green-hi);border-radius:6px;padding:1px 4px;margin-left:3px;font-weight:800">×${inStock}</span>`
        : '';

      // Lock / level badge
      const lockBadge = !unlocked
        ? `<span class="crop-lock-badge">Lv${crop.unlockLevel}</span>`
        : '';

      // Compact card: icon + name/stats as a flex row (works well at ~120px width)
      const mainRow = `<div class="crop-card-main" style="display:flex;align-items:center;gap:7px">
        <div class="crop-card-icon">${artSvg}</div>
        <div class="crop-card-info">
          <div class="crop-card-name">${crop.name}${stockBadge}</div>
          <div class="crop-card-stats">
            <span class="crop-stat-coin">🪙${crop.seedCost}</span>
            <span class="crop-stat-sell">→${crop.sellPrice}</span>
          </div>
          <div class="crop-card-stats" style="margin-top:1px">
            <span class="crop-stat-time">${formatTime(crop.gameSecs)}</span>
          </div>
        </div>
        ${lockBadge}
      </div>`;

      let qtyPicker = '';
      if (expanded && unlocked) {
        const initQty = Math.min(1, Math.max(1, Math.floor(G.coins / crop.seedCost)));
        const totalCoins = crop.seedCost * initQty;
        const canAfford = G.coins >= crop.seedCost;
        qtyPicker = `<div class="crop-card-qty">
          <button class="qty-btn" onclick="event.stopPropagation();shopChangeQty('${crop.id}',-1)">−</button>
          <span class="qty-display" id="qty-val-${crop.id}">${initQty}</span>
          <button class="qty-btn" onclick="event.stopPropagation();shopChangeQty('${crop.id}',1)">+</button>
          <span class="qty-total" id="qty-total-${crop.id}">🪙 ${totalCoins}</span>
          <button class="buy-btn" id="buy-btn-${crop.id}"
            onclick="event.stopPropagation();buySeeds('${crop.id}',parseInt(document.getElementById('qty-val-${crop.id}').textContent))"
            ${canAfford ? '' : 'disabled'}>Buy</button>
        </div>
        <div style="display:flex;justify-content:flex-end;padding:4px 0 2px;border-top:1px solid rgba(255,209,64,0.15);margin-top:4px">
          <button class="bsv-buy-btn" id="bsv-btn-${crop.id}"
            onclick="event.stopPropagation();buySeedsBSV('${crop.id}',parseInt(document.getElementById('qty-val-${crop.id}').textContent))"
            ${G.walletConnected ? '' : 'disabled'}
            title="${G.walletConnected ? 'Pay with BSV' : 'Connect wallet to pay with BSV'}">
            ₿ <span id="qty-bsv-${crop.id}">${formatBSV(totalCoins)}</span>
          </button>
        </div>`;
      }

      return `<div class="${classes}" onclick="toggleShopCard('${crop.id}')">
        ${mainRow}
        ${qtyPicker}
      </div>`;
    }).join('');

    const dimmed = lvl > G.level ? 'opacity:0.35' : '';
    return `<div class="shop-level-divider" style="${dimmed}">Level ${lvl} — ${ld.title}</div>${cropsHtml}`;
  }).join('');

  // ── Exotic seeds section (hidden until farmer owns at least one) ────
  const ownedExotics = EXOTIC_CROPS.filter(c => (G.inventory[c.id] || 0) > 0 || (G.cropHarvests[c.id] || 0) > 0);
  let exoticHtml = '';
  if (ownedExotics.length > 0) {
    const exoticCards = EXOTIC_CROPS.map(crop => {
      const inInventory = G.inventory[crop.id] || 0;
      const everHad = (G.cropHarvests[crop.id] || 0) > 0;
      // Show card if player has seeds now OR has ever grown this crop
      if (inInventory === 0 && !everHad) return '';

      const theme = CROP_THEME[crop.id] || { bg: '#1A1A1A', border: 'rgba(255,255,255,0.2)' };
      const expanded = G.shopExpanded === crop.id;
      const affordable = G.coins >= crop.seedCost;
      const stockBadge = inInventory > 0
        ? `<span style="font-size:9px;background:rgba(255,215,0,0.2);color:#FFD700;border-radius:6px;padding:1px 4px;margin-left:3px;font-weight:800">×${inInventory}</span>`
        : '';
      const artSvg = `<svg width="36" height="36" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" style="background:${theme.bg};border-radius:6px;box-shadow:0 0 6px ${theme.border}">${cropArt(crop.id)}</svg>`;

      let classes = 'crop-card';
      if (expanded) classes += ' expanded';

      const mainRow = `<div class="crop-card-main" style="display:flex;align-items:center;gap:7px">
        <div class="crop-card-icon">${artSvg}</div>
        <div class="crop-card-info">
          <div class="crop-card-name" style="color:#FFD700">${crop.name}${stockBadge}</div>
          <div class="crop-card-stats">
            <span class="crop-stat-coin">🪙${crop.seedCost}</span>
            <span class="crop-stat-sell">→${crop.sellPrice}</span>
          </div>
          <div class="crop-card-stats" style="margin-top:1px">
            <span class="crop-stat-time">${formatTime(crop.gameSecs)}</span>
            <span style="font-size:9px;color:#FFD700;opacity:0.8">✨ Exotic</span>
          </div>
        </div>
      </div>`;

      let qtyPicker = '';
      if (expanded && inInventory > 0) {
        const initQty = 1;
        const totalCoins = crop.seedCost * initQty;
        qtyPicker = `<div style="padding:6px 0 2px;font-size:11px;color:var(--text-dim);text-align:center">Seeds obtained via Wandering Merchant only</div>`;
      } else if (expanded && inInventory === 0) {
        qtyPicker = `<div style="padding:6px 0 2px;font-size:11px;color:var(--text-dim);text-align:center">No seeds in storage — find the Wandering Merchant!</div>`;
      }

      return `<div class="${classes}" onclick="toggleShopCard('${crop.id}')" style="border-color:${theme.border};box-shadow:0 0 8px ${theme.border}">
        ${mainRow}
        ${qtyPicker}
      </div>`;
    }).filter(Boolean).join('');

    exoticHtml = `
      <div class="shop-level-divider" style="background:linear-gradient(90deg,rgba(255,215,0,0.12),rgba(255,215,0,0.04));border-color:rgba(255,215,0,0.3);color:#FFD700">
        ✨ Exotic Seeds
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:4px;grid-column:1 / -1">${exoticCards}</div>
    `;
  }

  list.innerHTML = regularHtml + exoticHtml;
}

export function renderHeading() {
  const fn = document.getElementById('farm-name-display');
  const fr = document.getElementById('farmer-name-display');
  if (fn) fn.textContent = '🌿 ' + (G.farmName || 'My Farm');
  if (fr) fr.textContent = G.farmerName || 'Farmer';
}

// Notification system
export function notify(msg, type='harvest') {
  const container = document.getElementById('notif-container');
  const el = document.createElement('div');
  el.className = `notif ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 350);
  }, 2800);
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
  el.style.top = (rect.top) + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 950);
}

// Journal rendering functions
export function renderJournal() {
  const earned = new Set(G.achievementsEarned);
  const total = ALL_ACHIEVEMENTS.length;
  const done = earned.size;

  document.getElementById('journal-summary').textContent =
    done + ' / ' + total + ' achievements earned';

  if (_currentJTab === 'crops') renderCropsTab(earned);
  else if (_currentJTab === 'farm') renderFarmTab(earned);
  else if (_currentJTab === 'events') renderEventsTab(earned);
  else if (_currentJTab === 'leaderboard') renderLeaderboardTab();
  else if (_currentJTab === 'market') renderMarketTab();
}

export function renderCropsTab(earned) {
  const panel = document.getElementById('jtab-crops');
  if (!panel) return;

  // One row per crop showing harvest count + milestone badges
  let html = '<div style="margin-bottom:10px">';
  CROPS.forEach(crop => {
    const count = G.cropHarvests[crop.id] || 0;
    const theme = CROP_THEME[crop.id] || { bg:'#1A1A1A' };
    const artSvg = '<svg width="36" height="36" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"'
      + ' style="background:' + theme.bg + ';border-radius:7px">' + cropArt(crop.id) + '</svg>';

    // Badge state for each milestone
    const badges = CROP_MILESTONES.map(m => {
      const achId = 'crop_' + crop.id + '_' + m.key;
      const isEarned = earned.has(achId);
      let cls = 'crop-badge';
      if (m.key === 'master' && isEarned) cls += ' platinum';
      else if (m.key === 'veteran' && isEarned) cls += ' gold';
      else if (isEarned) cls += ' earned';
      const tip = m.label + ' (' + m.count + '×)';
      return '<div class="' + cls + '" title="' + tip + '">' + (isEarned ? m.icon : '·') + '</div>';
    }).join('');

    const unlocked = crop.unlockLevel <= G.level || G.prestige > 0 || count > 0;
    const dimStyle = unlocked ? '' : 'opacity:0.35';
    html += `<div class="crop-row" style="${dimStyle}">
      <div class="crop-row-left">
        ${artSvg}
        <div class="crop-row-info">
          <div class="crop-row-name">${crop.name}</div>
          <div class="crop-row-count">${count} harvest${count !== 1 ? 's' : ''}</div>
        </div>
      </div>
      <div class="crop-row-badges">${badges}</div>
    </div>`;
  });
  html += '</div>';

  panel.innerHTML = html;
}

export function renderAchSection(title, achs, earned) {
  let html = `<div class="ach-section-title">${title}</div>`;
  achs.forEach(ach => {
    const isEarned = earned.has(ach.id);
    const result = ach.check(G);
    const progressPct = Math.min(result.progress * 100, 100);
    const progressText = result.progressLabel || '';
    const isNew = _pendingNewAchievements.includes(ach.id);

    html += `<div class="ach-row ${isEarned ? 'earned' : ''} ${isNew ? 'new' : ''}">
      <div class="ach-icon">${ach.icon}</div>
      <div class="ach-info">
        <div class="ach-name">${ach.name}</div>
        <div class="ach-desc">${ach.desc}</div>
        ${!isEarned && progressText ? `<div class="ach-progress">${progressText}</div>` : ''}
      </div>
      ${!isEarned ? `<div class="ach-progress-bar"><div class="ach-progress-fill" style="width:${progressPct}%"></div></div>` : ''}
    </div>`;
  });
  return html;
}

export function renderFarmTab(earned) {
  const panel = document.getElementById('jtab-farm');
  if (!panel) return;

  const farmAchs = ALL_ACHIEVEMENTS.filter(a => a.category === 'farm');
  panel.innerHTML = renderAchSection('🏠 Farm Achievements', farmAchs, earned);
}

export function renderEventsTab(earned) {
  const panel = document.getElementById('jtab-events');
  if (!panel) return;

  const eventAchs = ALL_ACHIEVEMENTS.filter(a => a.category === 'events');
  panel.innerHTML = renderAchSection('📢 Event Achievements', eventAchs, earned);
}

// Import other functions that need to be available
import { renderVegeStand, renderMarketTab } from './marketplace.js';
import { renderLeaderboardTab, lbUpdateShareBtn } from './leaderboard.js';

// Journal variables
let _currentJTab = 'crops';

export { _currentJTab };

// Journal functions
export function openJournal() {
  // Show/hide market tab based on MARKETPLACE_ENABLED
  const mtb = document.getElementById('market-tab-btn');
  if (mtb) mtb.style.display = MARKETPLACE_ENABLED ? '' : 'none';
  // Clear the new-badge dot
  _pendingNewAchievements = [];
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
    const btnTab = b.getAttribute('onclick').match(/showJTab\('(\w+)'\)/)?.[1] || '';
    b.classList.toggle('active', btnTab === tab);
  });
  document.querySelectorAll('.jtab-panel').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('jtab-' + tab);
  if (el) el.classList.add('active');
  renderJournal();
}