// ============================================================
// DAILY WHEEL — highlight-chase reward spinner
// 16 sections, stationary wheel, cycling highlight
// ============================================================

import { CROPS, CROP_MAP } from './constants.js';
import { CROP_THEME, cropArt } from './utils.js';
import { saveGame } from './game-state.js';
import { playAchievementSound } from './sound.js';

const SECTION_COUNT = 16;
const SPIN_DURATION_MS = 5000;
const FIRST_DAY_MS = 24 * 60 * 60 * 1000;

const PRIZES = buildPrizes();

function buildPrizes() {
  const seedCrops = ['cucumber', 'tomato', 'radish', 'lettuce', 'carrot', 'spinach', 'beans', 'peas'];
  const prizes = [];
  for (let i = 0; i < seedCrops.length; i++) {
    const id = seedCrops[i];
    prizes.push({ type: 'seeds', cropId: id, qty: 5 });
    if (i < 6) prizes.push({ type: 'seeds', cropId: id, qty: 15 });
  }
  prizes.push({ type: 'coins', qty: 100 });
  prizes.push({ type: 'coins', qty: 500 });
  return prizes;
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function G() { return window.G; }

export function canSpinDailyWheel() {
  const g = G();
  if (!g || !g.firstPlayedAt) return false;
  return g.lastDailyWheelSpin !== todayKey();
}

export function isEligibleForDailyWheel() {
  const g = G();
  if (!g || !g.firstPlayedAt) return false;
  return (Date.now() - g.firstPlayedAt) >= FIRST_DAY_MS;
}

export function showDailyWheel() {
  if (!canSpinDailyWheel()) return;
  const overlay = document.getElementById('wheel-overlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');
  buildWheelDOM();
  highlightSection(-1);
  const spinBtn = document.getElementById('wheel-spin-btn');
  if (spinBtn) { spinBtn.disabled = false; spinBtn.style.display = ''; }
  const closeBtn = document.getElementById('wheel-close-btn');
  if (closeBtn) closeBtn.style.display = 'none';
  const resultEl = document.getElementById('wheel-result');
  if (resultEl) resultEl.innerHTML = '';
}

export function closeDailyWheel() {
  const overlay = document.getElementById('wheel-overlay');
  if (overlay) overlay.classList.add('hidden');
}

function buildWheelDOM() {
  const container = document.getElementById('wheel-sections');
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < SECTION_COUNT; i++) {
    const prize = PRIZES[i];
    const theme = prize.type === 'seeds' ? (CROP_THEME[prize.cropId] || { bg: '#1A1A1A' }) : { bg: '#2A2510' };
    const crop = prize.type === 'seeds' ? CROP_MAP[prize.cropId] : null;
    const section = document.createElement('div');
    section.className = 'wheel-section';
    section.dataset.index = i;
    const label = prize.type === 'seeds'
      ? `<span class="wheel-section-icon"><svg width="28" height="28" viewBox="0 0 56 56">${cropArt(prize.cropId)}</svg></span><span class="wheel-section-qty">×${prize.qty}</span>`
      : `<span class="wheel-section-icon">🪙</span><span class="wheel-section-qty">${prize.qty}</span>`;
    section.innerHTML = `<span class="wheel-section-name">${crop ? crop.name : 'Coins'}</span>${label}`;
    section.style.background = theme.bg;
    container.appendChild(section);
  }
}

function highlightSection(index) {
  const sections = document.querySelectorAll('.wheel-section');
  sections.forEach((s, i) => {
    s.classList.toggle('wheel-highlight', i === index);
  });
}

function playTickSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 600 + Math.random() * 200;
    gain.gain.value = 0.06;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch {}
}

let _spinning = false;

export function spinDailyWheel() {
  if (_spinning) return;
  if (!canSpinDailyWheel()) return;
  _spinning = true;
  const spinBtn = document.getElementById('wheel-spin-btn');
  if (spinBtn) spinBtn.disabled = true;

  const winnerIndex = Math.floor(Math.random() * SECTION_COUNT);
  const startTime = performance.now();
  let currentSection = -1;

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / SPIN_DURATION_MS, 1);
    const easedProgress = 1 - Math.pow(1 - progress, 3);

    const totalSteps = SECTION_COUNT * 4 + winnerIndex;
    const stepIdx = Math.floor(easedProgress * totalSteps);
    const section = stepIdx % SECTION_COUNT;

    if (section !== currentSection) {
      currentSection = section;
      highlightSection(currentSection);
      playTickSound();
    }

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      highlightSection(winnerIndex);
      _spinning = false;
      awardPrize(PRIZES[winnerIndex]);
    }
  }

  requestAnimationFrame(step);
}

function awardPrize(prize) {
  const g = G();
  g.lastDailyWheelSpin = todayKey();
  if (prize.type === 'seeds') {
    g.inventory[prize.cropId] = (g.inventory[prize.cropId] || 0) + prize.qty;
  } else {
    g.coins += prize.qty;
    g.totalCoinsEarned += prize.qty;
  }
  if (window.saveGame) window.saveGame(); else saveGame();

  const crop = prize.type === 'seeds' ? CROP_MAP[prize.cropId] : null;
  const name = crop ? crop.name : 'Coins';
  const qtyStr = prize.type === 'seeds' ? `×${prize.qty} ${name} seeds` : `🪙 ${prize.qty} coins`;

  const resultEl = document.getElementById('wheel-result');
  if (resultEl) {
    resultEl.innerHTML = `<div class="wheel-prize-announcement">🎉 You won ${qtyStr}!</div>`;
  }

  const spinBtn = document.getElementById('wheel-spin-btn');
  if (spinBtn) spinBtn.style.display = 'none';
  const closeBtn = document.getElementById('wheel-close-btn');
  if (closeBtn) closeBtn.style.display = '';

  playAchievementSound();
  if (window.renderAll) window.renderAll();
}

export function scheduleDailyWheel() {
  if (!isEligibleForDailyWheel()) return;
  if (!canSpinDailyWheel()) return;
  const delay = 5000 + Math.random() * 55000;
  setTimeout(() => {
    if (canSpinDailyWheel()) showDailyWheel();
  }, delay);
}