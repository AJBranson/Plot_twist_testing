// ============================================================
// UTILITY FUNCTIONS
// ============================================================

import { LEVELS, CROPS, CROP_MAP } from './constants.js';

// ============================================================
// CONSTANTS
// ============================================================
export const WATERING_CAN_CHARGE_SECS = 120;
export const COMPOST_CHARGE_SECS = 4 * 60;
export const COMPOST_MAX_CHARGES = 5;

export const CROP_THEME = {
  radish:      { bg:'#3A1A2A', border:'rgba(233,30,99,0.4)' },
  lettuce:     { bg:'#1A3020', border:'rgba(76,175,80,0.4)' },
  spinach:     { bg:'#1A2D1A', border:'rgba(67,160,71,0.4)' },
  zucchini:    { bg:'#1A2E1A', border:'rgba(46,125,50,0.4)' },
  beans:       { bg:'#223020', border:'rgba(139,195,74,0.4)' },
  peas:        { bg:'#203020', border:'rgba(102,187,106,0.4)' },
  cucumber:    { bg:'#182E22', border:'rgba(56,142,60,0.4)' },
  beetroot:    { bg:'#321822', border:'rgba(136,14,79,0.4)' },
  carrot:      { bg:'#332514', border:'rgba(255,152,0,0.4)' },
  tomato:      { bg:'#381616', border:'rgba(244,67,54,0.4)' },
  capsicum:    { bg:'#332E00', border:'rgba(255,214,0,0.4)' },
  broccoli:    { bg:'#1E2E1E', border:'rgba(85,139,47,0.4)' },
  cabbage:     { bg:'#182D18', border:'rgba(46,125,50,0.4)' },
  cauliflower: { bg:'#2C2C2C', border:'rgba(200,200,200,0.35)' },
  sunflower:   { bg:'#333000', border:'rgba(253,216,53,0.4)' },
  corn:        { bg:'#312F00', border:'rgba(249,168,37,0.4)' },
  onion:       { bg:'#2C1432', border:'rgba(156,39,176,0.4)' },
  potato:      { bg:'#2C2018', border:'rgba(121,85,72,0.4)' },
  pumpkin:     { bg:'#332100', border:'rgba(255,152,0,0.4)' },
  garlic:      { bg:'#28222E', border:'rgba(189,189,189,0.35)' },
  dragonfruit: { bg:'#35122A', border:'rgba(233,30,99,0.6)',  exotic:true },
  saffron:     { bg:'#28102E', border:'rgba(156,39,176,0.6)', exotic:true },
  vanilla:     { bg:'#2A1E0E', border:'rgba(255,193,7,0.5)',  exotic:true },
  truffle:     { bg:'#1A1A18', border:'rgba(255,215,0,0.5)',  exotic:true },
};

// ============================================================
// LEVEL HELPERS
// ============================================================
export function getLevelData(lvl) { return LEVELS[Math.min(lvl - 1, LEVELS.length - 1)]; }
export function getCurrentLevel() { return getLevelData(window.G ? window.G.level : 1); }

// Recalculate level from total XP (mutates window.G.level)
export function checkLevelUp() {
  const G = window.G;
  if (!G) return;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (G.totalXP >= LEVELS[i].xpMin) {
      G.level = LEVELS[i].lvl;
      return;
    }
  }
  G.level = 1;
}

export function getAvailableCrops() {
  return CROPS.filter(c => c.unlockLevel <= window.G.level);
}

export function isCropUnlocked(cropId) {
  const c = CROP_MAP[cropId];
  if (!c) return false;
  if (c.exotic) return (window.G.inventory[cropId] || 0) > 0 || (window.G.inventory[cropId + '_heritage'] || 0) > 0;
  return c.unlockLevel <= window.G.level;
}

export function prestigeMultiplier() {
  return 1 + (window.G.prestige * 0.10);
}

export function calcFarmScore() {
  return Math.floor(Math.pow(window.G.level, 2) * 300 + window.G.coins * 1 + window.G.totalXP * 0.5);
}

export function formatTime(secs) {
  if (secs <= 0) return 'Ready!';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function canUnlockPlot(idx) {
  if (idx === 0) return true;
  return window.G.plots[idx - 1].harvestedCount >= 1;
}

// ============================================================
// STRING HELPERS
// ============================================================
export function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

export function timeSince(date) {
  const secs = Math.floor((Date.now() - date) / 1000);
  if (secs < 60)    return 'just now';
  if (secs < 3600)  return Math.floor(secs / 60) + 'm ago';
  if (secs < 86400) return Math.floor(secs / 3600) + 'h ago';
  return Math.floor(secs / 86400) + 'd ago';
}

// ============================================================
// WATERING CAN
// ============================================================
export function wateringCanCharge() {
  if (window.G.wateringCanLastUsed === 0) return 1;
  const elapsed = (Date.now() - window.G.wateringCanLastUsed) / 1000;
  return Math.min(elapsed / WATERING_CAN_CHARGE_SECS, 1);
}

// ============================================================
// COMPOST
// ============================================================
export function compostNextChargeSecs() {
  if (window.G.compostCharges >= COMPOST_MAX_CHARGES) return 0;
  if (window.G.compostLastCharged === 0) return COMPOST_CHARGE_SECS;
  const elapsed = (Date.now() - window.G.compostLastCharged) / 1000;
  return Math.max(0, COMPOST_CHARGE_SECS - elapsed);
}

// ============================================================
// BSV FORMATTING
// ============================================================
export const USD_PER_COIN = 0.01;
export const USD_PER_SEED = 0.01;
export const USD_COMPOST_REFILL = 0.20;
export const USD_SPEED_BOOST = 1.00;

export function formatUSD(amount) {
  return '$' + Number(amount || 0).toFixed(2);
}

export function coinsToUSD(coins) {
  return Number(coins || 0) * USD_PER_COIN;
}

export function seedsToUSD(qty, seedCost) {
  if (seedCost !== undefined) return Number(qty || 0) * Number(seedCost || 0) * USD_PER_COIN;
  return Number(qty || 0) * USD_PER_SEED;
}

export function formatBSV(coins) {
  const bsv = coins * USD_PER_COIN / 50;
  return bsv.toFixed(5).replace(/\.?0+$/, '') + ' BSV';
}

// ============================================================
// CROP ART / SVG HELPERS
// ============================================================
export function cropArt(id) {
  const arts = {
    radish: `
      <rect x="27" y="8" width="3" height="10" rx="1.5" fill="#2E7D32"/>
      <ellipse cx="19" cy="14" rx="7" ry="4" fill="#4CAF50" transform="rotate(-30 19 14)"/>
      <ellipse cx="33" cy="13" rx="7" ry="4" fill="#66BB6A" transform="rotate(25 33 13)"/>
      <ellipse cx="28" cy="9" rx="5" ry="4" fill="#A5D6A7"/>
      <ellipse cx="28" cy="38" rx="13" ry="15" fill="#E91E63" stroke="#C2185B" stroke-width="1.5"/>
      <ellipse cx="24" cy="33" rx="5" ry="7" fill="#F48FB1" opacity="0.45"/>
      <path d="M28 52 Q30 56 28 59" stroke="#AD1457" stroke-width="1.5" fill="none" stroke-linecap="round"/>`,
    lettuce: `
      <ellipse cx="28" cy="46" rx="15" ry="9" fill="#1B5E20"/>
      <ellipse cx="28" cy="42" rx="15" ry="10" fill="#2E7D32"/>
      <ellipse cx="28" cy="37" rx="14" ry="9" fill="#388E3C"/>
      <ellipse cx="28" cy="32" rx="13" ry="8" fill="#43A047"/>
      <ellipse cx="28" cy="28" rx="11" ry="8" fill="#4CAF50"/>
      <ellipse cx="28" cy="23" rx="9" ry="7" fill="#66BB6A"/>
      <ellipse cx="28" cy="19" rx="7" ry="5" fill="#81C784"/>
      <ellipse cx="28" cy="16" rx="5" ry="4" fill="#C8E6C9"/>`,
    spinach: `
      <ellipse cx="17" cy="40" rx="10" ry="14" fill="#2E7D32" transform="rotate(-18 17 40)"/>
      <ellipse cx="38" cy="38" rx="10" ry="14" fill="#388E3C" transform="rotate(14 38 38)"/>
      <ellipse cx="28" cy="36" rx="9" ry="13" fill="#43A047"/>
      <ellipse cx="19" cy="24" rx="8" ry="11" fill="#4CAF50" transform="rotate(-8 19 24)"/>
      <ellipse cx="36" cy="22" rx="8" ry="11" fill="#66BB6A" transform="rotate(8 36 22)"/>
      <ellipse cx="28" cy="17" rx="7" ry="9" fill="#81C784"/>`,
    zucchini: `
      <ellipse cx="28" cy="36" rx="10" ry="22" fill="#2E7D32" stroke="#1B5E20" stroke-width="1"/>
      <ellipse cx="28" cy="36" rx="7" ry="19" fill="#4CAF50"/>
      <line x1="22" y1="20" x2="22" y2="50" stroke="#2E7D32" stroke-width="1" opacity="0.5"/>
      <line x1="34" y1="20" x2="34" y2="50" stroke="#2E7D32" stroke-width="1" opacity="0.5"/>
      <ellipse cx="28" cy="14" rx="8" ry="4" fill="#FFEE58"/>
      <path d="M23 13 Q21 9 23 7" stroke="#4CAF50" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <path d="M33 13 Q35 9 33 7" stroke="#4CAF50" stroke-width="1.5" fill="none" stroke-linecap="round"/>`,
    beans: `
      <path d="M18 44 Q14 36 16 26 Q20 18 24 22 Q28 18 30 28 Q32 18 36 22 Q40 18 42 26 Q44 36 40 44 Q36 50 28 52 Q20 50 18 44Z" fill="#558B2F" stroke="#33691E" stroke-width="1.5"/>
      <ellipse cx="22" cy="35" rx="3.5" ry="5" fill="#8BC34A"/>
      <ellipse cx="28" cy="33" rx="3.5" ry="5" fill="#9CCC65"/>
      <ellipse cx="34" cy="35" rx="3.5" ry="5" fill="#8BC34A"/>
      <path d="M28 20 Q29 13 31 9" stroke="#4CAF50" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    peas: `
      <path d="M9 30 Q11 18 21 14 Q37 12 46 22 Q51 30 47 40 Q41 52 28 52 Q15 52 11 42 Q9 37 9 30Z" fill="#4CAF50" stroke="#388E3C" stroke-width="1.5"/>
      <circle cx="19" cy="31" r="5.5" fill="#A5D6A7"/>
      <circle cx="28" cy="29" r="5.5" fill="#A5D6A7"/>
      <circle cx="37" cy="31" r="5.5" fill="#A5D6A7"/>
      <path d="M37 12 Q44 6 48 9" stroke="#388E3C" stroke-width="1.5" fill="none" stroke-linecap="round"/>`,
    cucumber: `
      <ellipse cx="28" cy="34" rx="12" ry="21" fill="#388E3C" stroke="#2E7D32" stroke-width="1.5"/>
      <ellipse cx="28" cy="34" rx="9" ry="18" fill="#4CAF50"/>
      <ellipse cx="22" cy="27" r="2.5" fill="#2E7D32" opacity="0.65"/>
      <ellipse cx="34" cy="29" r="2.5" fill="#2E7D32" opacity="0.65"/>
      <ellipse cx="21" cy="37" r="2.5" fill="#2E7D32" opacity="0.65"/>
      <ellipse cx="35" cy="39" r="2.5" fill="#2E7D32" opacity="0.65"/>
      <ellipse cx="26" cy="45" r="2.5" fill="#2E7D32" opacity="0.65"/>
      <ellipse cx="28" cy="13" rx="6" ry="3.5" fill="#FFEE58"/>
      <path d="M22 13 Q20 9 22 7" stroke="#4CAF50" stroke-width="1.5" fill="none" stroke-linecap="round"/>`,
    beetroot: `
      <path d="M19 26 Q17 18 21 15 L28 12 L35 15 Q39 18 37 26Z" fill="#4CAF50"/>
      <ellipse cx="21" cy="17" rx="5" ry="9" fill="#388E3C" transform="rotate(-18 21 17)"/>
      <ellipse cx="35" cy="16" rx="5" ry="9" fill="#4CAF50" transform="rotate(14 35 16)"/>
      <ellipse cx="28" cy="38" rx="14" ry="16" fill="#880E4F" stroke="#6A0136" stroke-width="1.5"/>
      <ellipse cx="28" cy="38" rx="10" ry="12" fill="#AD1457"/>
      <ellipse cx="23" cy="33" rx="4" ry="6" fill="#C2185B" opacity="0.4"/>
      <path d="M28 53 Q29 57 28 59" stroke="#6A0136" stroke-width="1.5" fill="none" stroke-linecap="round"/>`,
    carrot: `
      <rect x="26" y="8" width="4" height="11" rx="2" fill="#388E3C"/>
      <ellipse cx="19" cy="12" rx="7" ry="4" fill="#4CAF50" transform="rotate(-25 19 12)"/>
      <ellipse cx="35" cy="12" rx="7" ry="4" fill="#66BB6A" transform="rotate(25 35 12)"/>
      <ellipse cx="28" cy="8" rx="5" ry="4" fill="#81C784"/>
      <path d="M16 22 Q14 36 28 56 Q42 36 40 22 Q34 18 28 19 Q22 18 16 22Z" fill="#FF9800" stroke="#E65100" stroke-width="1.5"/>
      <path d="M20 25 Q19 40 28 54" stroke="#E65100" stroke-width="1" opacity="0.3" fill="none"/>
      <path d="M36 25 Q37 40 28 54" stroke="#E65100" stroke-width="1" opacity="0.3" fill="none"/>`,
    tomato: `
      <path d="M28 17 Q32 13 34 17 L36 13 Q38 21 34 21 Q38 27 28 50 Q18 27 22 21 Q18 21 20 13 L22 17 Q24 13 28 17Z" fill="#4CAF50"/>
      <circle cx="28" cy="37" r="15" fill="#F44336" stroke="#C62828" stroke-width="1.5"/>
      <circle cx="28" cy="37" r="10" fill="#EF5350"/>
      <ellipse cx="23" cy="32" rx="4" ry="5" fill="#E53935" opacity="0.5"/>`,
    capsicum: `
      <rect x="25" y="7" width="6" height="10" rx="3" fill="#388E3C"/>
      <path d="M10 28 Q10 17 18 15 L24 15 L24 18 Q19 20 18 28 Q16 42 22 50 Q25 54 28 53Z" fill="#FFD600" stroke="#F9A825" stroke-width="1"/>
      <path d="M46 28 Q46 17 38 15 L32 15 L32 18 Q37 20 38 28 Q40 42 34 50 Q31 54 28 53Z" fill="#FFD600" stroke="#F9A825" stroke-width="1"/>
      <path d="M18 28 Q20 15 28 13 Q36 15 38 28 Q40 46 34 53 Q31 55 28 54 Q25 55 22 53 Q16 46 18 28Z" fill="#FFEE58" stroke="#FDD835" stroke-width="1.5"/>
      <ellipse cx="24" cy="32" rx="3" ry="5" fill="#FFF9C4" opacity="0.7"/>`,
    broccoli: `
      <rect x="25" y="37" width="6" height="16" rx="3" fill="#558B2F" stroke="#33691E" stroke-width="1"/>
      <path d="M22 39 Q16 35 16 27 Q16 19 22 17 L28 17Z" fill="#2E7D32"/>
      <path d="M34 39 Q40 35 40 27 Q40 19 34 17 L28 17Z" fill="#388E3C"/>
      <circle cx="20" cy="26" r="9" fill="#2E7D32" stroke="#1B5E20" stroke-width="1"/>
      <circle cx="36" cy="26" r="9" fill="#388E3C" stroke="#2E7D32" stroke-width="1"/>
      <circle cx="28" cy="21" r="11" fill="#4CAF50" stroke="#388E3C" stroke-width="1"/>
      <circle cx="22" cy="19" r="5.5" fill="#43A047"/>
      <circle cx="34" cy="19" r="5.5" fill="#66BB6A"/>
      <circle cx="28" cy="15" r="5" fill="#81C784"/>`,
    cabbage: `
      <ellipse cx="28" cy="36" rx="18" ry="16" fill="#1B5E20"/>
      <ellipse cx="28" cy="34" rx="16" ry="14" fill="#2E7D32"/>
      <ellipse cx="28" cy="32" rx="14" ry="12" fill="#388E3C"/>
      <ellipse cx="28" cy="30" rx="12" ry="10" fill="#43A047"/>
      <ellipse cx="28" cy="28" rx="10" ry="8.5" fill="#4CAF50"/>
      <ellipse cx="28" cy="26" rx="8" ry="7" fill="#66BB6A"/>
      <ellipse cx="28" cy="24" rx="6" ry="5" fill="#A5D6A7"/>
      <path d="M11 38 Q9 31 14 27 Q9 34 11 40Z" fill="#1B5E20"/>
      <path d="M45 38 Q47 31 42 27 Q47 34 45 40Z" fill="#1B5E20"/>`,
    cauliflower: `
      <path d="M13 43 Q11 36 15 30 Q11 35 14 43Z" fill="#4CAF50"/>
      <path d="M43 43 Q45 36 41 30 Q45 35 42 43Z" fill="#4CAF50"/>
      <ellipse cx="28" cy="45" rx="18" ry="9" fill="#4CAF50"/>
      <circle cx="20" cy="32" r="9" fill="#F5F5F5" stroke="#E0E0E0" stroke-width="1"/>
      <circle cx="36" cy="32" r="9" fill="#FAFAFA" stroke="#E0E0E0" stroke-width="1"/>
      <circle cx="28" cy="28" r="11" fill="#FAFAFA" stroke="#E0E0E0" stroke-width="1"/>
      <circle cx="21" cy="25" r="6" fill="#F5F5F5"/>
      <circle cx="35" cy="25" r="6" fill="#FAFAFA"/>
      <circle cx="28" cy="21" r="7" fill="#FFFFFF" stroke="#E0E0E0" stroke-width="0.5"/>
      <circle cx="17" cy="29" r="5.5" fill="#F5F5F5"/>
      <circle cx="39" cy="29" r="5.5" fill="#FAFAFA"/>`,
    sunflower: `
      <rect x="26" y="38" width="4" height="17" rx="2" fill="#558B2F"/>
      <ellipse cx="21" cy="43" rx="6" ry="4" fill="#4CAF50" transform="rotate(-30 21 43)"/>
      <ellipse cx="35" cy="45" rx="6" ry="4" fill="#66BB6A" transform="rotate(20 35 45)"/>
      <circle cx="28" cy="24" r="14" fill="#FDD835" stroke="#FBC02D" stroke-width="2"/>
      <circle cx="28" cy="24" r="7" fill="#5D4037" stroke="#4E342E" stroke-width="1"/>
      <circle cx="26" cy="22" r="1.5" fill="#795548"/>
      <circle cx="30" cy="22" r="1.5" fill="#795548"/>
      <circle cx="28" cy="26" r="1.5" fill="#795548"/>
      <line x1="28" y1="8" x2="28" y2="12" stroke="#FDD835" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="28" y1="36" x2="28" y2="40" stroke="#FDD835" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="12" y1="24" x2="16" y2="24" stroke="#FDD835" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="40" y1="24" x2="44" y2="24" stroke="#FDD835" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="17" y1="13" x2="20" y2="16" stroke="#FDD835" stroke-width="2" stroke-linecap="round"/>
      <line x1="39" y1="13" x2="36" y2="16" stroke="#FDD835" stroke-width="2" stroke-linecap="round"/>
      <line x1="17" y1="35" x2="20" y2="32" stroke="#FDD835" stroke-width="2" stroke-linecap="round"/>
      <line x1="39" y1="35" x2="36" y2="32" stroke="#FDD835" stroke-width="2" stroke-linecap="round"/>`,
    corn: `
      <ellipse cx="28" cy="36" rx="12" ry="21" fill="#F9A825" stroke="#F57F17" stroke-width="1.5"/>
      <ellipse cx="28" cy="36" rx="9" ry="18" fill="#FFD54F"/>
      <rect x="14" y="16" width="10" height="37" rx="3" fill="#4CAF50" transform="rotate(-14 14 16)"/>
      <rect x="36" y="16" width="10" height="37" rx="3" fill="#66BB6A" transform="rotate(14 36 16)"/>
      <circle cx="23" cy="27" r="2.2" fill="#FFF176"/>
      <circle cx="28" cy="27" r="2.2" fill="#FFF176"/>
      <circle cx="33" cy="27" r="2.2" fill="#FFF176"/>
      <circle cx="23" cy="33" r="2.2" fill="#FFF176"/>
      <circle cx="28" cy="33" r="2.2" fill="#FFF176"/>
      <circle cx="33" cy="33" r="2.2" fill="#FFF176"/>
      <circle cx="23" cy="39" r="2.2" fill="#FFF176"/>
      <circle cx="28" cy="39" r="2.2" fill="#FFF176"/>
      <circle cx="33" cy="39" r="2.2" fill="#FFF176"/>
      <circle cx="23" cy="45" r="2.2" fill="#FFD54F"/>
      <circle cx="28" cy="45" r="2.2" fill="#FFD54F"/>
      <circle cx="33" cy="45" r="2.2" fill="#FFD54F"/>
      <path d="M28 15 Q30 10 29 7 Q33 5 35 9" stroke="#A1887F" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    onion: `
      <rect x="25" y="8" width="6" height="11" rx="3" fill="#7CB342"/>
      <path d="M23 10 Q19 5 21 3" stroke="#9CCC65" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <path d="M33 10 Q37 5 35 3" stroke="#9CCC65" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <ellipse cx="28" cy="37" rx="17" ry="19" fill="#7B1FA2" stroke="#6A1B9A" stroke-width="1.5"/>
      <ellipse cx="28" cy="37" rx="12" ry="15" fill="#9C27B0"/>
      <ellipse cx="28" cy="37" rx="8" ry="11" fill="#BA68C8"/>
      <ellipse cx="28" cy="37" rx="4" ry="7" fill="#E1BEE7"/>
      <path d="M19 24 Q28 20 37 24" stroke="#6A1B9A" stroke-width="1" fill="none" opacity="0.5"/>`,
    potato: `
      <ellipse cx="28" cy="36" rx="19" ry="17" fill="#795548" stroke="#5D4037" stroke-width="1.5"/>
      <ellipse cx="28" cy="34" rx="16" ry="14" fill="#8D6E63"/>
      <ellipse cx="21" cy="29" rx="4.5" ry="3.5" fill="#6D4C41" opacity="0.7"/>
      <ellipse cx="37" cy="31" rx="3.5" ry="3" fill="#6D4C41" opacity="0.7"/>
      <ellipse cx="24" cy="43" rx="3.5" ry="3" fill="#6D4C41" opacity="0.7"/>
      <ellipse cx="35" cy="44" rx="4" ry="3" fill="#6D4C41" opacity="0.7"/>
      <ellipse cx="19" cy="37" rx="2.5" ry="3.5" fill="#6D4C41" opacity="0.5"/>
      <path d="M20 28 Q18 23 21 21" stroke="#A5D6A7" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <path d="M38 28 Q40 23 38 21" stroke="#A5D6A7" stroke-width="1.5" fill="none" stroke-linecap="round"/>`,
    pumpkin: `
      <ellipse cx="28" cy="39" rx="17" ry="15" fill="#FF8F00" stroke="#E65100" stroke-width="1.5"/>
      <ellipse cx="14" cy="39" rx="8" ry="13" fill="#FFA000" stroke="#E65100" stroke-width="1"/>
      <ellipse cx="28" cy="39" rx="9" ry="15" fill="#FFB300" stroke="#E65100" stroke-width="1"/>
      <ellipse cx="42" cy="39" rx="8" ry="13" fill="#FFA000" stroke="#E65100" stroke-width="1"/>
      <ellipse cx="28" cy="35" rx="16" ry="12" fill="#FFCA28" opacity="0.4"/>
      <rect x="25" y="21" width="6" height="10" rx="3" fill="#558B2F"/>
      <path d="M31 24 Q38 17 43 21" fill="none" stroke="#66BB6A" stroke-width="2" stroke-linecap="round"/>`,
    garlic: `
      <path d="M25 47 Q28 44 28 38 Q28 44 31 47 Q29 53 28 55 Q27 53 25 47Z" fill="#E0E0E0" stroke="#9E9E9E" stroke-width="0.5"/>
      <ellipse cx="28" cy="35" rx="13" ry="15" fill="#FAFAFA" stroke="#BDBDBD" stroke-width="1"/>
      <ellipse cx="21" cy="33" rx="5.5" ry="8" fill="#F5F5F5" stroke="#BDBDBD" stroke-width="0.5"/>
      <ellipse cx="35" cy="33" rx="5.5" ry="8" fill="#F5F5F5" stroke="#BDBDBD" stroke-width="0.5"/>
      <ellipse cx="28" cy="29" rx="5.5" ry="8" fill="#EEEEEE" stroke="#BDBDBD" stroke-width="0.5"/>
      <path d="M23 31 Q25 29 27 31 M29 31 Q31 29 33 31" stroke="#9E9E9E" stroke-width="1" fill="none"/>
      <rect x="25" y="18" width="6" height="13" rx="3" fill="#558B2F"/>`,
    dragonfruit: `
      <path d="M13 34 Q8 27 11 21 Q15 29 20 33Z" fill="#4CAF50"/>
      <path d="M43 34 Q48 27 45 21 Q41 29 36 33Z" fill="#66BB6A"/>
      <path d="M15 44 Q9 41 12 36 Q17 38 20 41Z" fill="#4CAF50"/>
      <path d="M41 44 Q47 41 44 36 Q39 38 36 41Z" fill="#66BB6A"/>
      <path d="M19 48 Q14 48 15 44 Q19 45 22 46Z" fill="#388E3C"/>
      <path d="M37 48 Q42 48 41 44 Q37 45 34 46Z" fill="#388E3C"/>
      <ellipse cx="28" cy="36" rx="14" ry="17" fill="#E91E63" stroke="#C2185B" stroke-width="1.5"/>
      <ellipse cx="28" cy="36" rx="9" ry="12" fill="#F48FB1"/>
      <circle cx="24" cy="30" r="1.8" fill="#212121"/>
      <circle cx="32" cy="29" r="1.8" fill="#212121"/>
      <circle cx="22" cy="38" r="1.8" fill="#212121"/>
      <circle cx="34" cy="37" r="1.8" fill="#212121"/>
      <circle cx="28" cy="44" r="1.8" fill="#212121"/>
      <path d="M20 22 Q22 15 28 12 Q34 15 36 22" fill="#E91E63" stroke="#C2185B" stroke-width="1"/>
      <path d="M23 21 Q25 13 28 10" stroke="#4CAF50" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M33 21 Q31 13 28 10" stroke="#66BB6A" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    saffron: `
      <path d="M17 55 Q16 44 21 36" stroke="#558B2F" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M28 55 Q28 45 28 37" stroke="#4CAF50" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M39 55 Q40 44 35 36" stroke="#558B2F" stroke-width="3" fill="none" stroke-linecap="round"/>
      <ellipse cx="22" cy="30" rx="6" ry="10" fill="#7B1FA2" transform="rotate(-20 22 30)" stroke="#6A1B9A" stroke-width="0.5"/>
      <ellipse cx="34" cy="30" rx="6" ry="10" fill="#8E24AA" transform="rotate(20 34 30)" stroke="#6A1B9A" stroke-width="0.5"/>
      <ellipse cx="28" cy="26" rx="6" ry="10" fill="#9C27B0" stroke="#6A1B9A" stroke-width="0.5"/>
      <ellipse cx="28" cy="30" rx="4" ry="6" fill="#F3E5F5" opacity="0.55"/>
      <line x1="25" y1="26" x2="23" y2="10" stroke="#FF8F00" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="28" y1="24" x2="28" y2="8" stroke="#FF6F00" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="31" y1="26" x2="33" y2="10" stroke="#FF8F00" stroke-width="2.5" stroke-linecap="round"/>
      <ellipse cx="23" cy="9" rx="2.5" ry="3.5" fill="#F44336"/>
      <ellipse cx="28" cy="7" rx="2.5" ry="3.5" fill="#EF5350"/>
      <ellipse cx="33" cy="9" rx="2.5" ry="3.5" fill="#F44336"/>`,
    vanilla: `
      <path d="M28 55 Q28 44 30 36 Q32 28 29 20" stroke="#5D4037" stroke-width="2.5" fill="none"/>
      <path d="M30 37 Q39 31 40 22 Q37 15 32 19" stroke="#795548" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <ellipse cx="20" cy="44" rx="3.5" ry="13" fill="#4E342E" stroke="#3E2723" stroke-width="1" transform="rotate(-6 20 44)"/>
      <ellipse cx="36" cy="46" rx="3.5" ry="13" fill="#5D4037" stroke="#3E2723" stroke-width="1" transform="rotate(9 36 46)"/>
      <ellipse cx="21" cy="16" rx="6" ry="9" fill="#FFFDE7" stroke="#FFF9C4" stroke-width="0.5" transform="rotate(-30 21 16)"/>
      <ellipse cx="35" cy="16" rx="6" ry="9" fill="#FFFDE7" stroke="#FFF9C4" stroke-width="0.5" transform="rotate(30 35 16)"/>
      <ellipse cx="28" cy="13" rx="6" ry="8" fill="#FFF9C4" stroke="#FFEE58" stroke-width="0.5"/>
      <ellipse cx="28" cy="15" rx="3.5" ry="4.5" fill="#FFCC02"/>
      <ellipse cx="28" cy="15" rx="2" ry="3" fill="#FF8F00"/>
      <circle cx="27" cy="13" r="1" fill="#FFD740" opacity="0.8"/>`,
    truffle: `
      <path d="M14 55 Q13 50 16 47" stroke="#6D4C41" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <path d="M28 55 Q28 51 27 48" stroke="#5D4037" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <path d="M42 55 Q43 50 40 47" stroke="#6D4C41" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <ellipse cx="28" cy="44" rx="22" ry="5" fill="#5C3210" stroke="#4A2510" stroke-width="1"/>
      <ellipse cx="28" cy="34" rx="19" ry="16" fill="#1A1A1A" stroke="#111" stroke-width="1.5"/>
      <ellipse cx="20" cy="29" rx="6" ry="5" fill="#242424"/>
      <ellipse cx="35" cy="27" rx="6" ry="5" fill="#2C2C2C"/>
      <ellipse cx="27" cy="38" rx="6" ry="5" fill="#222"/>
      <ellipse cx="17" cy="38" rx="5" ry="4" fill="#2C2C2C"/>
      <ellipse cx="39" cy="37" rx="5" ry="4" fill="#242424"/>`
  };
  return arts[id] || arts.radish;
}

export function makeCropCardSVG(cropId, w, h) {
  return `<svg width="${w}" height="${h}" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">${cropArt(cropId)}</svg>`;
}

export function soilSVG(w, h) {
  return `<svg width="${w}" height="${h}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" fill="#4A2008"/>
    <rect width="100" height="100" fill="#7A4422" opacity="0.45"/>
    <!-- Horizontal furrow rows (tilled-field look) -->
    <rect x="0" y="9"  width="100" height="3.5" fill="#3A1606" opacity="0.55"/>
    <rect x="0" y="22" width="100" height="3"   fill="#3A1606" opacity="0.50"/>
    <rect x="0" y="35" width="100" height="3.5" fill="#3A1606" opacity="0.55"/>
    <rect x="0" y="48" width="100" height="3"   fill="#3A1606" opacity="0.50"/>
    <rect x="0" y="61" width="100" height="3.5" fill="#3A1606" opacity="0.50"/>
    <rect x="0" y="74" width="100" height="3"   fill="#3A1606" opacity="0.45"/>
    <rect x="0" y="87" width="100" height="3"   fill="#3A1606" opacity="0.40"/>
    <!-- Faint vertical column dividers -->
    <line x1="25" y1="0" x2="25" y2="100" stroke="#8B5A2B" stroke-width="1" opacity="0.18"/>
    <line x1="50" y1="0" x2="50" y2="100" stroke="#8B5A2B" stroke-width="1" opacity="0.18"/>
    <line x1="75" y1="0" x2="75" y2="100" stroke="#8B5A2B" stroke-width="1" opacity="0.18"/>
    <!-- Scattered pebbles / clods (varied size & opacity) -->
    <ellipse cx="18" cy="18" rx="4.5" ry="2.5" fill="#8B5A2B" opacity="0.65"/>
    <ellipse cx="68" cy="10" rx="3"   ry="2"   fill="#9A6535" opacity="0.55"/>
    <ellipse cx="38" cy="56" rx="5"   ry="3"   fill="#7A4A22" opacity="0.60"/>
    <ellipse cx="80" cy="45" rx="3.5" ry="2"   fill="#8B5A2B" opacity="0.55"/>
    <ellipse cx="12" cy="72" rx="4"   ry="2.5" fill="#9A6535" opacity="0.55"/>
    <ellipse cx="55" cy="83" rx="3"   ry="2"   fill="#7A4A22" opacity="0.50"/>
    <circle  cx="88" cy="30" r="2.5"            fill="#8B5A2B" opacity="0.50"/>
    <circle  cx="45" cy="92" r="2"              fill="#7A4A22" opacity="0.45"/>
    <circle  cx="92" cy="74" r="2"              fill="#9A6535" opacity="0.40"/>
    <circle  cx="30" cy="31" r="1.5"            fill="#9A6535" opacity="0.45"/>
    <ellipse cx="62" cy="66" rx="3"   ry="1.8" fill="#8B5A2B" opacity="0.45"/>
    <!-- Subtle top-light / bottom-shadow strips for depth -->
    <rect width="100" height="5" fill="#9A6028" opacity="0.18"/>
    <rect y="95"  width="100" height="5" fill="#2A1204" opacity="0.22"/>
  </svg>`;
}

export function soilSVGWithPrestige(w, h, prestige) {
  const tier = getPrestigeTier(prestige);
  const base = soilSVG(w, h);

  if (tier === 0) return base;

  const soilTints = [
    '',
    '<rect width="100" height="100" fill="#5A3010" opacity="0.15"/>',
    '<rect width="100" height="100" fill="#6A3A15" opacity="0.20"/>',
    '<rect width="100" height="100" fill="#7A4418" opacity="0.25"/>',
    '<rect width="100" height="100" fill="#8A4E1B" opacity="0.30"/>',
    '<rect width="100" height="100" fill="#9A5820" opacity="0.35"/>',
    '<rect width="100" height="100" fill="#AA6225" opacity="0.40"/>',
    '<rect width="100" height="100" fill="#BA6C2A" opacity="0.45"/>',
  ];

  let extras = soilTints[tier];

  if (tier >= 2) {
    extras += `<rect x="0" y="0" width="100" height="2" fill="#8B7355" opacity="0.3"/>`;
    extras += `<rect x="0" y="98" width="100" height="2" fill="#8B7355" opacity="0.3"/>`;
  }
  if (tier >= 3) {
    extras += `<ellipse cx="50" cy="50" rx="30" ry="30" fill="none" stroke="#9A8060" stroke-width="0.5" opacity="0.25" stroke-dasharray="3,4"/>`;
  }
  if (tier >= 4) {
    extras += `<circle cx="10" cy="10" r="1.5" fill="#FFD700" opacity="0.2"/>`;
    extras += `<circle cx="90" cy="10" r="1.5" fill="#FFD700" opacity="0.2"/>`;
    extras += `<circle cx="10" cy="90" r="1.5" fill="#FFD700" opacity="0.2"/>`;
    extras += `<circle cx="90" cy="90" r="1.5" fill="#FFD700" opacity="0.2"/>`;
  }
  if (tier >= 5) {
    extras += `<line x1="0" y1="0" x2="100" y2="100" stroke="#B8A882" stroke-width="0.3" opacity="0.15"/>`;
    extras += `<line x1="100" y1="0" x2="0" y2="100" stroke="#B8A882" stroke-width="0.3" opacity="0.15"/>`;
  }
  if (tier >= 6) {
    extras += `<rect x="2" y="2" width="96" height="96" rx="4" fill="none" stroke="#D4C5A9" stroke-width="0.8" opacity="0.2"/>`;
  }
  if (tier >= 7) {
    extras += `<circle cx="50" cy="50" r="40" fill="none" stroke="#FFD700" stroke-width="0.5" opacity="0.15" stroke-dasharray="5,3"/>`;
    extras += `<circle cx="50" cy="50" r="35" fill="none" stroke="#FFD700" stroke-width="0.3" opacity="0.1" stroke-dasharray="2,5"/>`;
  }

  return base.replace('</svg>', extras + '</svg>');
}

export function seedlingSVG(progress) {
  const stemTop = 58 - 8 - progress * 26;
  const lo = 0.35 + progress * 0.65;
  const ls = 0.4 + progress * 0.6;
  const ll1x = 30 - ls * 14, ll1cy = stemTop + 16;
  const lr1x = 30 + ls * 14, lr1cy = stemTop + 16;
  const upLo = Math.max(0, (progress - 0.35) / 0.65);
  const ll2x = 30 - ls * 9,  ll2cy = stemTop + 6;
  const lr2x = 30 + ls * 9,  lr2cy = stemTop + 6;
  const moundRx = 13 + progress * 4;

  return `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="30" cy="57.5" rx="${moundRx.toFixed(1)}" ry="4" fill="#5C3210" opacity="0.7"/>
    <path d="M30 58 Q${(28 + progress*3).toFixed(1)} ${(stemTop + 14).toFixed(1)} 30 ${stemTop.toFixed(1)}"
      fill="none" stroke="#2D6B20" stroke-width="3" stroke-linecap="round"/>
    <path d="M30 ${(stemTop+14).toFixed(1)} Q${(ll1x-4).toFixed(1)} ${(ll1cy-8).toFixed(1)} ${ll1x.toFixed(1)} ${(ll1cy+3).toFixed(1)} Q${(ll1x+6).toFixed(1)} ${(ll1cy+8).toFixed(1)} 30 ${(stemTop+18).toFixed(1)}Z"
      fill="#4CAF50" opacity="${lo.toFixed(2)}"/>
    <path d="M30 ${(stemTop+14).toFixed(1)} Q${(lr1x+4).toFixed(1)} ${(lr1cy-8).toFixed(1)} ${lr1x.toFixed(1)} ${(lr1cy+3).toFixed(1)} Q${(lr1x-6).toFixed(1)} ${(lr1cy+8).toFixed(1)} 30 ${(stemTop+18).toFixed(1)}Z"
      fill="#66BB6A" opacity="${lo.toFixed(2)}"/>
    ${upLo > 0 ? `<path d="M30 ${(stemTop+5).toFixed(1)} Q${(ll2x-2).toFixed(1)} ${(ll2cy-6).toFixed(1)} ${ll2x.toFixed(1)} ${(ll2cy+2).toFixed(1)} Q${(ll2x+5).toFixed(1)} ${(ll2cy+6).toFixed(1)} 30 ${(stemTop+8).toFixed(1)}Z"
      fill="#388E3C" opacity="${(upLo * lo).toFixed(2)}"/>` : ''}
    ${upLo > 0 ? `<path d="M30 ${(stemTop+5).toFixed(1)} Q${(lr2x+2).toFixed(1)} ${(lr2cy-6).toFixed(1)} ${lr2x.toFixed(1)} ${(lr2cy+2).toFixed(1)} Q${(lr2x-5).toFixed(1)} ${(lr2cy+6).toFixed(1)} 30 ${(stemTop+8).toFixed(1)}Z"
      fill="#81C784" opacity="${(upLo * lo * 0.85).toFixed(2)}"/>` : ''}
    <ellipse cx="30" cy="${stemTop.toFixed(1)}" rx="2" ry="${(2.5 - progress*1.5).toFixed(1)}" fill="#1B5E20" opacity="${(lo*0.8).toFixed(2)}"/>
  </svg>`;
}

export function progressRingSVG(progress) {
  const r = 44;
  const cx = 50, cy = 50;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - progress);
  const ringColor = progress < 0.35 ? '#F59E0B'  // amber  — early
                  : progress < 0.70 ? '#84CC16'  // lime   — mid 
                  : '#6FCF3A';                   // green  — nearly ready
  return `<svg class="progress-ring-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle class="progress-ring-bg" cx="${cx}" cy="${cy}" r="${r}" stroke-width="7"/>
    <circle class="progress-ring-fill" cx="${cx}" cy="${cy}" r="${r}"
      style="stroke:${ringColor}"
      stroke-width="7"
      stroke-dasharray="${circ.toFixed(2)}"
      stroke-dashoffset="${offset.toFixed(2)}"/>
  </svg>`;
}

export const PRESTIGE_MILESTONES = [1, 5, 10, 20, 30, 40, 50];

export function getPrestigeTier(prestige) {
  let tier = 0;
  for (let i = 0; i < PRESTIGE_MILESTONES.length; i++) {
    if (prestige >= PRESTIGE_MILESTONES[i]) tier = i + 1;
  }
  return tier;
}

export function lockSVG() {
  return `<svg width="32" height="38" viewBox="0 0 32 38" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="16" width="24" height="20" rx="4" fill="#3A3A3A" stroke="#555" stroke-width="1.5"/>
    <path d="M9 16 V11 Q9 3 16 3 Q23 3 23 11 V16" fill="none" stroke="#555" stroke-width="3" stroke-linecap="round"/>
    <circle cx="16" cy="25" r="4" fill="#666" stroke="#888" stroke-width="1"/>
    <rect x="14.5" y="25" width="3" height="5" rx="1.5" fill="#666"/>
  </svg>`;
}

export function lockSVGWithPrestige(prestige) {
  const tier = getPrestigeTier(prestige);
  if (tier === 0) return lockSVG();

  const borderColors = { 1:'#6B5B3A', 2:'#8B7355', 3:'#A0926B', 4:'#B8A882', 5:'#C9B896', 6:'#D4C5A9', 7:'#E8D9BE' };
  const bodyColors  = { 1:'#4A4030', 2:'#5A4A38', 3:'#6A5540', 4:'#7A6048', 5:'#8A6B50', 6:'#9A7658', 7:'#AA8160' };
  const shackleClr  = { 1:'#8B7B5A', 2:'#A0906A', 3:'#B5A57A', 4:'#CABA8A', 5:'#DFCF9A', 6:'#E5D5AA', 7:'#EBDBBA' };
  const keyholeClr   = { 1:'#888866', 2:'#999977', 3:'#AAAA88', 4:'#BBBB99', 5:'#CCCCAA', 6:'#DDBBCC', 7:'#EEDDCC' };

  let extras = '';
  if (tier >= 2) {
    extras += `<rect x="2" y="14" width="28" height="24" rx="5" fill="none" stroke="${borderColors[tier]}" stroke-width="1" opacity="0.6"/>`;
  }
  if (tier >= 3) {
    extras += `<circle cx="8" cy="20" r="1.5" fill="#FFD700" opacity="0.5"/>`;
    extras += `<circle cx="24" cy="20" r="1.5" fill="#FFD700" opacity="0.5"/>`;
  }
  if (tier >= 4) {
    extras += `<path d="M16 10 L18 14 L16 13 L14 14 Z" fill="#FFD700" opacity="0.4"/>`;
  }
  if (tier >= 5) {
    extras += `<rect x="6" y="30" width="20" height="3" rx="1" fill="${shackleClr[tier]}" opacity="0.3"/>`;
    extras += `<line x1="10" y1="31.5" x2="22" y2="31.5" stroke="${shackleClr[tier]}" stroke-width="0.5" opacity="0.4"/>`;
  }
  if (tier >= 6) {
    extras += `<circle cx="16" cy="8" r="2" fill="none" stroke="#FFD700" stroke-width="0.8" opacity="0.5"/>`;
    extras += `<circle cx="16" cy="8" r="0.8" fill="#FFD700" opacity="0.6"/>`;
  }
  if (tier >= 7) {
    extras += `<line x1="4" y1="16" x2="4" y2="36" stroke="#FFD700" stroke-width="0.5" opacity="0.3"/>`;
    extras += `<line x1="28" y1="16" x2="28" y2="36" stroke="#FFD700" stroke-width="0.5" opacity="0.3"/>`;
    extras += `<rect x="4" y="16" width="24" height="20" rx="4" fill="none" stroke="#FFD700" stroke-width="0.8" opacity="0.25"/>`;
  }

  return `<svg width="32" height="38" viewBox="0 0 32 38" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="16" width="24" height="20" rx="4" fill="${bodyColors[tier]}" stroke="${borderColors[tier]}" stroke-width="1.5"/>
    ${extras}
    <path d="M9 16 V11 Q9 3 16 3 Q23 3 23 11 V16" fill="none" stroke="${shackleClr[tier]}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="16" cy="25" r="4" fill="${keyholeClr[tier]}" stroke="${borderColors[tier]}" stroke-width="1"/>
    <rect x="14.5" y="25" width="3" height="5" rx="1.5" fill="${bodyColors[tier]}"/>
  </svg>`;
}

export function cropArtWithPrestige(cropId, prestige) {
  const tier = getPrestigeTier(prestige);
  const base = cropArt(cropId);

  if (tier === 0) return base;

  let extras = '';
  if (tier >= 1) {
    extras += `<rect x="1" y="1" width="58" height="58" rx="4" fill="none" stroke="rgba(139,115,85,0.3)" stroke-width="0.5"/>`;
  }
  if (tier >= 2) {
    extras += `<circle cx="5" cy="5" r="1" fill="#FFD700" opacity="0.3"/>`;
    extras += `<circle cx="55" cy="5" r="1" fill="#FFD700" opacity="0.3"/>`;
    extras += `<circle cx="5" cy="55" r="1" fill="#FFD700" opacity="0.3"/>`;
    extras += `<circle cx="55" cy="55" r="1" fill="#FFD700" opacity="0.3"/>`;
  }
  if (tier >= 3) {
    extras += `<rect x="3" y="3" width="54" height="54" rx="3" fill="none" stroke="rgba(180,160,120,0.2)" stroke-width="0.5" stroke-dasharray="2,3"/>`;
  }
  if (tier >= 4) {
    extras += `<circle cx="30" cy="2" r="1.5" fill="#FFD700" opacity="0.35"/>`;
    extras += `<circle cx="30" cy="58" r="1.5" fill="#FFD700" opacity="0.35"/>`;
    extras += `<circle cx="2" cy="30" r="1.5" fill="#FFD700" opacity="0.35"/>`;
    extras += `<circle cx="58" cy="30" r="1.5" fill="#FFD700" opacity="0.35"/>`;
  }
  if (tier >= 5) {
    extras += `<circle cx="30" cy="30" r="28" fill="none" stroke="rgba(212,197,169,0.15)" stroke-width="0.5" stroke-dasharray="4,3"/>`;
  }
  if (tier >= 6) {
    extras += `<circle cx="10" cy="10" r="2" fill="none" stroke="#FFD700" stroke-width="0.5" opacity="0.25"/>`;
    extras += `<circle cx="50" cy="10" r="2" fill="none" stroke="#FFD700" stroke-width="0.5" opacity="0.25"/>`;
    extras += `<circle cx="10" cy="50" r="2" fill="none" stroke="#FFD700" stroke-width="0.5" opacity="0.25"/>`;
    extras += `<circle cx="50" cy="50" r="2" fill="none" stroke="#FFD700" stroke-width="0.5" opacity="0.25"/>`;
    extras += `<circle cx="10" cy="10" r="0.8" fill="#FFD700" opacity="0.3"/>`;
    extras += `<circle cx="50" cy="10" r="0.8" fill="#FFD700" opacity="0.3"/>`;
    extras += `<circle cx="10" cy="50" r="0.8" fill="#FFD700" opacity="0.3"/>`;
    extras += `<circle cx="50" cy="50" r="0.8" fill="#FFD700" opacity="0.3"/>`;
  }
  if (tier >= 7) {
    extras += `<rect x="0" y="0" width="60" height="60" rx="5" fill="none" stroke="rgba(255,215,0,0.2)" stroke-width="1"/>`;
    extras += `<line x1="0" y1="0" x2="10" y2="0" stroke="#FFD700" stroke-width="1.5" opacity="0.3"/>`;
    extras += `<line x1="50" y1="0" x2="60" y2="0" stroke="#FFD700" stroke-width="1.5" opacity="0.3"/>`;
    extras += `<line x1="0" y1="60" x2="10" y2="60" stroke="#FFD700" stroke-width="1.5" opacity="0.3"/>`;
    extras += `<line x1="50" y1="60" x2="60" y2="60" stroke="#FFD700" stroke-width="1.5" opacity="0.3"/>`;
    extras += `<line x1="0" y1="0" x2="0" y2="10" stroke="#FFD700" stroke-width="1.5" opacity="0.3"/>`;
    extras += `<line x1="60" y1="0" x2="60" y2="10" stroke="#FFD700" stroke-width="1.5" opacity="0.3"/>`;
    extras += `<line x1="0" y1="50" x2="0" y2="60" stroke="#FFD700" stroke-width="1.5" opacity="0.3"/>`;
    extras += `<line x1="60" y1="50" x2="60" y2="60" stroke="#FFD700" stroke-width="1.5" opacity="0.3"/>`;
  }

  return `<svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">${base}${extras}</svg>`;
}
