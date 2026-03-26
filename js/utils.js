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
  radish:      { bg:'#2A1825', border:'rgba(233,30,99,0.4)' },
  lettuce:     { bg:'#122212', border:'rgba(76,175,80,0.4)' },
  spinach:     { bg:'#121F12', border:'rgba(67,160,71,0.4)' },
  zucchini:    { bg:'#122012', border:'rgba(46,125,50,0.4)' },
  beans:       { bg:'#182212', border:'rgba(139,195,74,0.4)' },
  peas:        { bg:'#162312', border:'rgba(102,187,106,0.4)' },
  cucumber:    { bg:'#112018', border:'rgba(56,142,60,0.4)' },
  beetroot:    { bg:'#241218', border:'rgba(136,14,79,0.4)' },
  carrot:      { bg:'#251A0C', border:'rgba(255,152,0,0.4)' },
  tomato:      { bg:'#280E0E', border:'rgba(244,67,54,0.4)' },
  capsicum:    { bg:'#252000', border:'rgba(255,214,0,0.4)' },
  broccoli:    { bg:'#142014', border:'rgba(85,139,47,0.4)' },
  cabbage:     { bg:'#111F11', border:'rgba(46,125,50,0.4)' },
  cauliflower: { bg:'#1E1E1E', border:'rgba(200,200,200,0.35)' },
  sunflower:   { bg:'#252200', border:'rgba(253,216,53,0.4)' },
  corn:        { bg:'#232100', border:'rgba(249,168,37,0.4)' },
  onion:       { bg:'#1E0E25', border:'rgba(156,39,176,0.4)' },
  potato:      { bg:'#1E1510', border:'rgba(121,85,72,0.4)' },
  pumpkin:     { bg:'#251500', border:'rgba(255,152,0,0.4)' },
  garlic:      { bg:'#1A1520', border:'rgba(189,189,189,0.35)' },
  dragonfruit: { bg:'#270D1F', border:'rgba(233,30,99,0.6)',  exotic:true },
  saffron:     { bg:'#1A0A22', border:'rgba(156,39,176,0.6)', exotic:true },
  vanilla:     { bg:'#1C1408', border:'rgba(255,193,7,0.5)',  exotic:true },
  truffle:     { bg:'#0D0D0D', border:'rgba(255,215,0,0.5)',  exotic:true },
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
export function formatBSV(coins) {
  const bsv = coins * 0.00001;
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
      <ellipse cx="28" cy="14" rx="8" ry="4" fill="#FFEE58"/>`,
    beans: `
      <path d="M18 44 Q14 36 16 26 Q20 18 24 22 Q28 18 30 28 Q32 18 36 22 Q40 18 42 26 Q44 36 40 44 Q36 50 28 52 Q20 50 18 44Z" fill="#558B2F" stroke="#33691E" stroke-width="1.5"/>
      <ellipse cx="22" cy="35" rx="3.5" ry="5" fill="#8BC34A"/>
      <ellipse cx="28" cy="33" rx="3.5" ry="5" fill="#9CCC65"/>
      <ellipse cx="34" cy="35" rx="3.5" ry="5" fill="#8BC34A"/>`,
    peas: `
      <path d="M9 30 Q11 18 21 14 Q37 12 46 22 Q51 30 47 40 Q41 52 28 52 Q15 52 11 42 Q9 37 9 30Z" fill="#4CAF50" stroke="#388E3C" stroke-width="1.5"/>
      <circle cx="19" cy="31" r="5.5" fill="#A5D6A7"/>
      <circle cx="28" cy="29" r="5.5" fill="#A5D6A7"/>
      <circle cx="37" cy="31" r="5.5" fill="#A5D6A7"/>`,
    cucumber: `
      <ellipse cx="28" cy="34" rx="12" ry="21" fill="#388E3C" stroke="#2E7D32" stroke-width="1.5"/>
      <ellipse cx="28" cy="34" rx="9" ry="18" fill="#4CAF50"/>
      <ellipse cx="28" cy="13" rx="6" ry="3.5" fill="#FFEE58"/>`,
    beetroot: `
      <path d="M19 26 Q17 18 21 15 L28 12 L35 15 Q39 18 37 26Z" fill="#4CAF50"/>
      <ellipse cx="21" cy="17" rx="5" ry="9" fill="#388E3C" transform="rotate(-18 21 17)"/>
      <ellipse cx="35" cy="16" rx="5" ry="9" fill="#4CAF50" transform="rotate(14 35 16)"/>
      <ellipse cx="28" cy="38" rx="14" ry="16" fill="#880E4F" stroke="#6A0136" stroke-width="1.5"/>
      <ellipse cx="28" cy="38" rx="10" ry="12" fill="#AD1457"/>`,
    carrot: `
      <rect x="26" y="8" width="4" height="11" rx="2" fill="#388E3C"/>
      <ellipse cx="19" cy="12" rx="7" ry="4" fill="#4CAF50" transform="rotate(-25 19 12)"/>
      <ellipse cx="35" cy="12" rx="7" ry="4" fill="#66BB6A" transform="rotate(25 35 12)"/>
      <path d="M16 22 Q14 36 28 56 Q42 36 40 22 Q34 18 28 19 Q22 18 16 22Z" fill="#FF9800" stroke="#E65100" stroke-width="1.5"/>`,
    tomato: `
      <path d="M28 17 Q32 13 34 17 L36 13 Q38 21 34 21 Q38 27 28 50 Q18 27 22 21 Q18 21 20 13 L22 17 Q24 13 28 17Z" fill="#4CAF50"/>
      <circle cx="28" cy="37" r="15" fill="#F44336" stroke="#C62828" stroke-width="1.5"/>
      <circle cx="28" cy="37" r="10" fill="#EF5350"/>`,
    capsicum: `
      <rect x="25" y="7" width="6" height="10" rx="3" fill="#388E3C"/>
      <path d="M18 28 Q20 15 28 13 Q36 15 38 28 Q40 46 34 53 Q31 55 28 54 Q25 55 22 53 Q16 46 18 28Z" fill="#FFEE58" stroke="#FDD835" stroke-width="1.5"/>`,
    broccoli: `
      <rect x="25" y="37" width="6" height="16" rx="3" fill="#558B2F" stroke="#33691E" stroke-width="1"/>
      <circle cx="20" cy="26" r="9" fill="#2E7D32" stroke="#1B5E20" stroke-width="1"/>
      <circle cx="36" cy="26" r="9" fill="#388E3C" stroke="#2E7D32" stroke-width="1"/>
      <circle cx="28" cy="21" r="11" fill="#4CAF50" stroke="#388E3C" stroke-width="1"/>`,
    cabbage: `
      <ellipse cx="28" cy="36" rx="18" ry="16" fill="#1B5E20"/>
      <ellipse cx="28" cy="34" rx="16" ry="14" fill="#2E7D32"/>
      <ellipse cx="28" cy="30" rx="12" ry="10" fill="#43A047"/>
      <ellipse cx="28" cy="24" rx="6" ry="5" fill="#A5D6A7"/>`,
    cauliflower: `
      <rect x="25" y="38" width="6" height="15" rx="3" fill="#6D4C41" stroke="#5D4037" stroke-width="1"/>
      <circle cx="17" cy="33" r="10" fill="#BDBDBD" stroke="#9E9E9E" stroke-width="1"/>
      <circle cx="39" cy="31" r="10" fill="#BDBDBD" stroke="#9E9E9E" stroke-width="1"/>
      <circle cx="28" cy="26" r="12" fill="#D0D0D0" stroke="#BDBDBD" stroke-width="1"/>
      <circle cx="28" cy="17" r="6" fill="#F5F5F5"/>`,
    sunflower: `
      <circle cx="28" cy="34" r="14" fill="#FDD835" stroke="#F9A825" stroke-width="1.5"/>
      <circle cx="28" cy="34" r="6" fill="#FFD600"/>
      <line x1="28" y1="8" x2="28" y2="2" stroke="#558B2F" stroke-width="2" stroke-linecap="round"/>`,
    corn: `
      <rect x="26" y="8" width="4" height="38" rx="2" fill="#558B2F" stroke="#33691E" stroke-width="1"/>
      <ellipse cx="20" cy="24" rx="7.5" ry="4" fill="#FFEE58" stroke="#FBC02D" stroke-width="0.5"/>
      <ellipse cx="36" cy="24" rx="7.5" ry="4" fill="#FFD600" stroke="#FBC02D" stroke-width="0.5"/>`,
    onion: `
      <path d="M28 12 Q32 9 34 20 Q34 30 28 40 Q22 30 22 20 Q24 9 28 12Z" fill="#9C27B0" stroke="#6A1B9A" stroke-width="1.5"/>
      <ellipse cx="28" cy="34" rx="12" ry="14" fill="#BA68C8"/>
      <ellipse cx="28" cy="34" rx="8" ry="10" fill="#CE93D8"/>`,
    potato: `
      <ellipse cx="28" cy="36" rx="16" ry="18" fill="#A1887F" stroke="#795548" stroke-width="1.5"/>
      <ellipse cx="28" cy="36" rx="13" ry="15" fill="#BCAAA4"/>
      <path d="M28 12 Q29 8 28 3" stroke="#558B2F" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    pumpkin: `
      <path d="M28 18 Q38 18 42 26 Q44 36 40 46 Q32 54 28 54 Q24 54 16 46 Q12 36 14 26 Q18 18 28 18Z" fill="#FF9800" stroke="#E65100" stroke-width="1.5"/>
      <line x1="28" y1="10" x2="28" y2="3" stroke="#558B2F" stroke-width="2" stroke-linecap="round"/>`,
    garlic: `
      <circle cx="22" cy="28" r="8" fill="#E8E8E8" stroke="#BDBDBD" stroke-width="1"/>
      <circle cx="34" cy="28" r="8" fill="#F5F5F5" stroke="#BDBDBD" stroke-width="1"/>
      <circle cx="28" cy="18" r="8" fill="#FAFAFA" stroke="#E0E0E0" stroke-width="1"/>
      <circle cx="28" cy="38" r="8" fill="#E8E8E8" stroke="#BDBDBD" stroke-width="1"/>
      <path d="M28 10 Q27 5 28 2" stroke="#558B2F" stroke-width="1.5" fill="none" stroke-linecap="round"/>`,
    dragonfruit: `
      <circle cx="28" cy="36" r="16" fill="#E91E63" stroke="#7B1FA2" stroke-width="1.5"/>
      <circle cx="28" cy="36" r="12" fill="#F06292"/>
      <path d="M28 12 Q25 7 26 2" stroke="#7B1FA2" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    saffron: `
      <circle cx="28" cy="36" r="14" fill="#FFD700" stroke="#FBC02D" stroke-width="1.5"/>
      <circle cx="28" cy="36" r="10" fill="#FFEE58"/>
      <path d="M28 8 Q22 7 20 2" stroke="#8B008B" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M28 8 Q34 7 36 2" stroke="#8B008B" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    vanilla: `
      <path d="M20 52 Q18 40 20 24 Q22 12 28 10 Q34 12 36 24 Q38 40 36 52" fill="#D4AF37" stroke="#B8860B" stroke-width="1.5"/>
      <ellipse cx="28" cy="28" rx="5" ry="8" fill="#C4A460"/>`,
    truffle: `
      <ellipse cx="28" cy="36" rx="16" ry="18" fill="#1A1A1A" stroke="#FFD700" stroke-width="1.5"/>
      <ellipse cx="28" cy="36" rx="12" ry="14" fill="#2D2D2D"/>
      <ellipse cx="28" cy="28" r="2.5" fill="#FFD700" opacity="0.6"/>`,
  };
  return arts[id] || arts.radish;
}

export function makeCropCardSVG(cropId, w, h) {
  return `<svg width="${w}" height="${h}" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">${cropArt(cropId)}</svg>`;
}

export function soilSVG(w, h) {
  return `<svg width="${w}" height="${h}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" fill="#5C3210"/>
    <rect width="100" height="100" fill="#7A4422" opacity="0.5"/>
    <line x1="16" y1="8" x2="16" y2="92" stroke="#4A2510" stroke-width="3" opacity="0.45"/>
    <line x1="32" y1="8" x2="32" y2="92" stroke="#4A2510" stroke-width="3" opacity="0.45"/>
    <line x1="48" y1="8" x2="48" y2="92" stroke="#4A2510" stroke-width="3" opacity="0.45"/>
    <line x1="64" y1="8" x2="64" y2="92" stroke="#4A2510" stroke-width="3" opacity="0.45"/>
    <line x1="80" y1="8" x2="80" y2="92" stroke="#4A2510" stroke-width="3" opacity="0.45"/>
    <ellipse cx="24" cy="42" rx="5" ry="3" fill="#8B5A2B" opacity="0.5"/>
    <ellipse cx="55" cy="65" rx="4" ry="2.5" fill="#8B5A2B" opacity="0.4"/>
  </svg>`;
}

export function lockSVG() {
  return `<svg width="32" height="38" viewBox="0 0 32 38" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="16" width="24" height="20" rx="4" fill="#3A3A3A" stroke="#555" stroke-width="1.5"/>
    <path d="M9 16 V11 Q9 3 16 3 Q23 3 23 11 V16" fill="none" stroke="#555" stroke-width="3" stroke-linecap="round"/>
    <circle cx="16" cy="25" r="4" fill="#666" stroke="#888" stroke-width="1"/>
    <rect x="14.5" y="25" width="3" height="5" rx="1.5" fill="#666"/>
  </svg>`;
}
