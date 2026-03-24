// ============================================================
// ACHIEVEMENT SYSTEM
// ============================================================

import { CROPS, EXOTIC_CROPS } from './constants.js';
import { G, saveGame } from './game-state.js';

export const CROP_MILESTONES = [
  { key: 'first',    count: 1,   icon: '🌱', label: 'First Harvest' },
  { key: 'seasoned', count: 10,  icon: '🌿', label: 'Seasoned' },
  { key: 'veteran',  count: 50,  icon: '🥇', label: 'Veteran' },
  { key: 'master',   count: 200, icon: '👑', label: 'Master Grower' },
];

function buildCropAchievements() {
  const out = [];
  [...CROPS, ...EXOTIC_CROPS].forEach(crop => {
    CROP_MILESTONES.forEach(m => {
      out.push({
        id: 'crop_' + crop.id + '_' + m.key,
        icon: crop.exotic ? '✨' : m.icon,
        name: crop.name + ': ' + m.label,
        desc: 'Harvest ' + crop.name + ' ' + m.count + ' time' + (m.count > 1 ? 's' : ''),
        category: 'crops',
        cropId: crop.id,
        milestone: m,
        check: (G) => {
          const n = G.cropHarvests[crop.id] || 0;
          return { earned: n >= m.count, progress: Math.min(n / m.count, 1), progressLabel: n + ' / ' + m.count };
        },
      });
    });
  });
  return out;
}

export const FARM_ACHIEVEMENTS = [
  { id:'total_10',   icon:'🌾', name:'Budding Farmer',    category:'farm', desc:'Harvest 10 crops total',
    check: G => ({ earned: G.totalHarvestCount>=10,  progress: Math.min(G.totalHarvestCount/10,1),  progressLabel: G.totalHarvestCount+'/10' }) },
  { id:'total_50',   icon:'🌾', name:'Productive Plot',   category:'farm', desc:'Harvest 50 crops total',
    check: G => ({ earned: G.totalHarvestCount>=50,  progress: Math.min(G.totalHarvestCount/50,1),  progressLabel: G.totalHarvestCount+'/50' }) },
  { id:'total_100',  icon:'🌾', name:'Hundred Harvests',  category:'farm', desc:'Harvest 100 crops total',
    check: G => ({ earned: G.totalHarvestCount>=100, progress: Math.min(G.totalHarvestCount/100,1), progressLabel: G.totalHarvestCount+'/100' }) },
  { id:'total_500',  icon:'🌾', name:'Harvest Legend',    category:'farm', desc:'Harvest 500 crops total',
    check: G => ({ earned: G.totalHarvestCount>=500, progress: Math.min(G.totalHarvestCount/500,1), progressLabel: G.totalHarvestCount+'/500' }) },
  { id:'total_1000', icon:'🌾', name:'Legendary Farmer',  category:'farm', desc:'Harvest 1,000 crops total',
    check: G => ({ earned: G.totalHarvestCount>=1000,progress: Math.min(G.totalHarvestCount/1000,1),progressLabel: G.totalHarvestCount+'/1,000' }) },
  { id:'coins_100',   icon:'🪙', name:'First Purse',      category:'farm', desc:'Earn 100 coins from harvests',
    check: G => ({ earned: G.totalCoinsEarned>=100,   progress: Math.min(G.totalCoinsEarned/100,1),   progressLabel: G.totalCoinsEarned+'/100' }) },
  { id:'coins_500',   icon:'🪙', name:'Coin Collector',   category:'farm', desc:'Earn 500 coins from harvests',
    check: G => ({ earned: G.totalCoinsEarned>=500,   progress: Math.min(G.totalCoinsEarned/500,1),   progressLabel: G.totalCoinsEarned+'/500' }) },
  { id:'coins_2000',  icon:'🪙', name:'Prosperous Farm',  category:'farm', desc:'Earn 2,000 coins from harvests',
    check: G => ({ earned: G.totalCoinsEarned>=2000,  progress: Math.min(G.totalCoinsEarned/2000,1),  progressLabel: G.totalCoinsEarned+'/2,000' }) },
  { id:'coins_10000', icon:'🪙', name:'Coin Hoarder',     category:'farm', desc:'Earn 10,000 coins from harvests',
    check: G => ({ earned: G.totalCoinsEarned>=10000, progress: Math.min(G.totalCoinsEarned/10000,1), progressLabel: G.totalCoinsEarned+'/10,000' }) },
  { id:'plots_5',  icon:'🟫', name:'Room to Grow',   category:'farm', desc:'Unlock 5 plots',
    check: G => { const n=G.plots.filter(p=>p.unlocked).length; return { earned:n>=5,  progress:Math.min(n/5,1),  progressLabel:n+'/5' }; } },
  { id:'plots_10', icon:'🟫', name:'Sprawling Farm', category:'farm', desc:'Unlock 10 plots',
    check: G => { const n=G.plots.filter(p=>p.unlocked).length; return { earned:n>=10, progress:Math.min(n/10,1), progressLabel:n+'/10' }; } },
  { id:'plots_20', icon:'🟫', name:'Full Estate',    category:'farm', desc:'Unlock all 20 plots',
    check: G => { const n=G.plots.filter(p=>p.unlocked).length; return { earned:n>=20, progress:Math.min(n/20,1), progressLabel:n+'/20' }; } },
  { id:'level_5',  icon:'🏅', name:'Cultivator',   category:'farm', desc:'Reach Level 5',
    check: G => ({ earned: G.level>=5  || G.prestige>0, progress: G.level>=5||G.prestige>0?1:G.level/5,   progressLabel:'Lv '+G.level }) },
  { id:'level_10', icon:'🏅', name:'Master Farmer', category:'farm', desc:'Reach Level 10',
    check: G => ({ earned: G.level>=10 || G.prestige>0, progress: G.level>=10||G.prestige>0?1:G.level/10, progressLabel:'Lv '+G.level }) },
  { id:'diverse_5',  icon:'🌈', name:'Mixed Planting',    category:'farm', desc:'Harvest 5 different crop types',
    check: G => { const n=Object.keys(G.cropHarvests).length; return { earned:n>=5,  progress:Math.min(n/5,1),  progressLabel:n+'/5 types' }; } },
  { id:'diverse_10', icon:'🌈', name:'Diverse Portfolio',  category:'farm', desc:'Harvest 10 different crop types',
    check: G => { const n=Object.keys(G.cropHarvests).length; return { earned:n>=10, progress:Math.min(n/10,1), progressLabel:n+'/10 types' }; } },
  { id:'diverse_20', icon:'🌈', name:'Complete Collection', category:'farm', desc:'Harvest all 20 crop types',
    check: G => { const n=Object.keys(G.cropHarvests).length; return { earned:n>=20, progress:Math.min(n/20,1), progressLabel:n+'/20 types' }; } },
  { id:'prestige_1',  icon:'⭐', name:'Reborn',          category:'farm', desc:'Reach Prestige 1',
    check: G => ({ earned: G.prestige>=1,  progress: Math.min(G.prestige/1,1),  progressLabel:'Prestige '+G.prestige }) },
  { id:'prestige_5',  icon:'⭐', name:'Veteran Grower',  category:'farm', desc:'Reach Prestige 5',
    check: G => ({ earned: G.prestige>=5,  progress: Math.min(G.prestige/5,1),  progressLabel:'Prestige '+G.prestige }) },
  { id:'prestige_10', icon:'⭐', name:'Elite Farmer',    category:'farm', desc:'Reach Prestige 10',
    check: G => ({ earned: G.prestige>=10, progress: Math.min(G.prestige/10,1), progressLabel:'Prestige '+G.prestige }) },
  { id:'ev_first_event', icon:'📢', name:'Eventful Day', category:'events', desc:'Encounter your first random event',
    check: G => ({ earned: (G._eventsEncountered||0)>=1, progress:(G._eventsEncountered||0)>=1?1:0, progressLabel:'' }) },
  { id:'ev_events_10',   icon:'📢', name:'Old Hand',     category:'events', desc:'Encounter 10 random events',
    check: G => ({ earned: (G._eventsEncountered||0)>=10, progress:Math.min((G._eventsEncountered||0)/10,1), progressLabel:(G._eventsEncountered||0)+'/10' }) },
  { id:'ev_merchant',    icon:'🧙', name:'Deal Maker',    category:'events', desc:'Accept a deal from the Wandering Merchant',
    check: G => ({ earned: (G._merchantDealsAccepted||0)>=1, progress:(G._merchantDealsAccepted||0)>=1?1:0, progressLabel:'' }) },
  { id:'ev_merchant_5',  icon:'🧙', name:'Regular Customer', category:'events', desc:'Accept 5 deals from the Wandering Merchant',
    check: G => ({ earned: (G._merchantDealsAccepted||0)>=5, progress:Math.min((G._merchantDealsAccepted||0)/5,1), progressLabel:(G._merchantDealsAccepted||0)+'/5' }) },
  { id:'ev_merchant_40', icon:'✨', name:'Old Friends', category:'events', desc:'Accept 40 deals — rare exotic seeds may now appear',
    check: G => ({ earned: (G._merchantDealsAccepted||0)>=40, progress:Math.min((G._merchantDealsAccepted||0)/40,1), progressLabel:(G._merchantDealsAccepted||0)+'/40' }) },
  { id:'ev_fix_event', icon:'🛡️', name:'Defender', category:'events', desc:'Fix a random event',
    check: G => ({ earned: (G._eventsFixed||0)>=1, progress:(G._eventsFixed||0)>=1?1:0, progressLabel:'' }) },
  { id:'ev_first_seed',    icon:'🌱', name:'Seed Keeper',    category:'events', desc:'Collect seeds via seed-saving for the first time',
    check: G => ({ earned: (G.seedsCollectedTotal||0)>=1, progress:(G.seedsCollectedTotal||0)>=1?1:0, progressLabel:'' }) },
  { id:'ev_heritage_first',icon:'✨', name:'Golden Lineage', category:'events', desc:'Collect a Heritage seed for the first time',
    check: G => ({ earned: (G._heritageCollected||0)>=1, progress:(G._heritageCollected||0)>=1?1:0, progressLabel:'' }) },
];

export let ALL_ACHIEVEMENTS = [];

export function buildAllAchievements() {
  ALL_ACHIEVEMENTS = [...buildCropAchievements(), ...FARM_ACHIEVEMENTS];
}

// Pending new achievements — cleared when journal opens
export let _pendingNewAchievements = [];

export function clearPendingAchievements() {
  _pendingNewAchievements = [];
}

export function checkAchievements() {
  let anyNew = false;
  ALL_ACHIEVEMENTS.forEach(ach => {
    if (G.achievementsEarned.includes(ach.id)) return;
    const result = ach.check(G);
    if (result.earned) {
      G.achievementsEarned.push(ach.id);
      _pendingNewAchievements.push(ach.id);
      anyNew = true;
    }
  });
  if (anyNew) {
    saveGame();
    const dot = document.getElementById('journal-new-badge');
    if (dot) dot.style.display = 'inline-block';
  }
}
