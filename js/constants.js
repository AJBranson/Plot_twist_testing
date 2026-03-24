// ============================================================
// GAME CONSTANTS AND DATA
// NOTE: This file has NO imports. Callbacks use window.G,
//       window.notify, etc. set up by main.js after init.
// ============================================================

export const SECS_PER_DAY = 3.3;
export const MARKETPLACE_ENABLED = true;

export const CROPS = [
  { id:'radish',      name:'Radish',      days:27,  speed:'Fast',   seedCost:2,  sellPrice:8,  xp:5,   unlockLevel:1 },
  { id:'lettuce',     name:'Lettuce',     days:52,  speed:'Fast',   seedCost:3,  sellPrice:14, xp:8,  unlockLevel:1 },
  { id:'spinach',     name:'Spinach',     days:45,  speed:'Fast',   seedCost:4,  sellPrice:18, xp:7,  unlockLevel:1 },
  { id:'zucchini',    name:'Zucchini',    days:57,  speed:'Fast',   seedCost:3,  sellPrice:14, xp:8,  unlockLevel:1 },
  { id:'beans',       name:'Beans',       days:57,  speed:'Fast',   seedCost:5,  sellPrice:20, xp:9,  unlockLevel:2 },
  { id:'peas',        name:'Peas',        days:65,  speed:'Fast',   seedCost:6,  sellPrice:22, xp:10, unlockLevel:2 },
  { id:'cucumber',    name:'Cucumber',    days:60,  speed:'Fast',   seedCost:4,  sellPrice:16, xp:8,  unlockLevel:2 },
  { id:'beetroot',    name:'Beetroot',    days:70,  speed:'Medium', seedCost:5,  sellPrice:22, xp:12, unlockLevel:3 },
  { id:'carrot',      name:'Carrot',      days:75,  speed:'Medium', seedCost:4,  sellPrice:18, xp:11, unlockLevel:3 },
  { id:'cabbage',     name:'Cabbage',     days:100, speed:'Medium', seedCost:5,  sellPrice:20, xp:14, unlockLevel:3 },
  { id:'tomato',      name:'Tomato',      days:80,  speed:'Medium', seedCost:8,  sellPrice:35, xp:15, unlockLevel:4 },
  { id:'corn',        name:'Corn',        days:85,  speed:'Medium', seedCost:6,  sellPrice:25, xp:16, unlockLevel:4 },
  { id:'broccoli',    name:'Broccoli',    days:90,  speed:'Medium', seedCost:7,  sellPrice:28, xp:18, unlockLevel:4 },
  { id:'capsicum',    name:'Capsicum',    days:80,  speed:'Medium', seedCost:10, sellPrice:42, xp:16, unlockLevel:5 },
  { id:'cauliflower', name:'Cauliflower', days:100, speed:'Medium', seedCost:8,  sellPrice:30, xp:16, unlockLevel:5 },
  { id:'sunflower',   name:'Sunflower',   days:100, speed:'Medium', seedCost:12, sellPrice:50, xp:20, unlockLevel:6 },
  { id:'onion',       name:'Onion',       days:110, speed:'Slow',   seedCost:6,  sellPrice:28, xp:20, unlockLevel:6 },
  { id:'potato',      name:'Potato',      days:105, speed:'Slow',   seedCost:7,  sellPrice:28, xp:20, unlockLevel:6 },
  { id:'pumpkin',     name:'Pumpkin',     days:105, speed:'Slow',   seedCost:8,  sellPrice:32, xp:22, unlockLevel:7 },
  { id:'garlic',      name:'Garlic',      days:150, speed:'Slow',   seedCost:20, sellPrice:90, xp:35, unlockLevel:8 },
];
CROPS.forEach(c => c.gameSecs = Math.round(c.days * SECS_PER_DAY));

export const EXOTIC_CROPS = [
  { id:'dragonfruit', name:'Dragon Fruit', days:200, speed:'Exotic', seedCost:60,  sellPrice:190, xp:48, unlockLevel:99, exotic:true },
  { id:'saffron',     name:'Saffron',      days:240, speed:'Exotic', seedCost:85,  sellPrice:250, xp:60, unlockLevel:99, exotic:true },
  { id:'vanilla',     name:'Vanilla',      days:280, speed:'Exotic', seedCost:115, sellPrice:340, xp:75, unlockLevel:99, exotic:true },
  { id:'truffle',     name:'Truffle',      days:330, speed:'Exotic', seedCost:180, sellPrice:510, xp:95, unlockLevel:99, exotic:true },
];
EXOTIC_CROPS.forEach(c => c.gameSecs = Math.round(c.days * SECS_PER_DAY));

export const CROP_MAP = {};
CROPS.forEach(c => CROP_MAP[c.id] = c);
EXOTIC_CROPS.forEach(c => CROP_MAP[c.id] = c);

export const LEVELS = [
  { lvl:1,  title:'Seedling',   xpMin:0,     xpMax:150,   unlocks:['radish','lettuce','spinach','zucchini'] },
  { lvl:2,  title:'Sprout',     xpMin:151,   xpMax:500,   unlocks:['beans','peas','cucumber'] },
  { lvl:3,  title:'Grower',     xpMin:501,   xpMax:1000,  unlocks:['beetroot','carrot','cabbage'] },
  { lvl:4,  title:'Farmer',     xpMin:1001,  xpMax:2000,  unlocks:['tomato','corn','broccoli'] },
  { lvl:5,  title:'Cultivator', xpMin:2001,  xpMax:3500,  unlocks:['capsicum','cauliflower'] },
  { lvl:6,  title:'Harvester',  xpMin:3501,  xpMax:5500,  unlocks:['sunflower','onion','potato'] },
  { lvl:7,  title:'Keeper',     xpMin:5501,  xpMax:8000,  unlocks:['pumpkin'] },
  { lvl:8,  title:'Orchardist', xpMin:8001,  xpMax:11500, unlocks:['garlic'] },
  { lvl:9,  title:'Elder',      xpMin:11501, xpMax:16000, unlocks:[] },
  { lvl:10, title:'Master',     xpMin:16001, xpMax:99999, unlocks:[] },
];

export const PLOT_COSTS = [0,25,55,100,160,240,340,460,620,820,1050,1350,1700,2100,2600,3200,3900,4700,5700,6800];
export const COMPOST_MAX_CHARGES = 5;
export const SAVE_KEY = 'idle_farm_v1';
export const MARKET_CACHE_TTL = 30000;

export const LB_CONFIG = {
  url:     'https://hhisdlawemzihzbxmwkc.supabase.co',
  anonKey: 'sb_publishable__lesBNacxfH92P_zn9Fo9A_XIDtn_3e',
  gameId:  'plot-twist',
};

export const SEED_PHASE_RATIO = 0.45;

export const EVENT_MIN_GAP  = 2 * 60 * 1000;
export const EVENT_MAX_GAP  = 5 * 60 * 1000;

export const MERCHANT_DURATION = 3 * 60 * 1000;
export const MERCHANT_MIN_GAP  = 10 * 60 * 1000;
export const MERCHANT_MAX_GAP  = 15 * 60 * 1000;

// NOTE: Callbacks access game state via window.G, window.notify, etc.
// These are set up by main.js after initialization.
export const MERCHANT_DEALS = [
  {
    id: 'seed_discount',
    title: '🧙 Wandering Merchant',
    makeOffer: () => {
      const G = window.G;
      const unlocked = CROPS.filter(c => c.unlockLevel <= G.level);
      const crop = unlocked[Math.floor(Math.random() * unlocked.length)];
      const qty = Math.floor(Math.random() * 3) + 3;
      const fullPrice = crop.seedCost * qty;
      const discountPct = [20, 25, 30, 40][Math.floor(Math.random() * 4)];
      const dealPrice = Math.max(1, Math.floor(fullPrice * (1 - discountPct / 100)));
      return {
        typeId: 'seed_discount', cropId: crop.id, qty, fullPrice, dealPrice, discountPct,
        offerText: qty + '× ' + crop.name + ' seeds for 🪙' + dealPrice + ' (was ' + fullPrice + ', −' + discountPct + '%)',
        btnText: 'Buy 🪙' + dealPrice,
        canAfford: () => window.G.coins >= dealPrice,
        execute: () => {
          window.G.coins -= dealPrice;
          window.G.inventory[crop.id] = (window.G.inventory[crop.id] || 0) + qty;
          window.notify('🛒 Got ' + qty + '× ' + crop.name + ' at −' + discountPct + '%!', 'unlock');
        },
      };
    },
  },
  {
    id: 'buy_coins',
    title: '🧙 Wandering Merchant',
    makeOffer: () => {
      const bonus = (Math.floor(Math.random() * 4) + 2) * 5;
      const cost = Math.max(3, Math.floor(bonus * 0.6));
      return {
        typeId: 'buy_coins', cost, bonus,
        offerText: 'Lucky charm! Pay 🪙' + cost + ' now, receive 🪙' + bonus + ' back instantly.',
        btnText: 'Buy 🪙' + cost,
        canAfford: () => window.G.coins >= cost,
        execute: () => {
          window.G.coins += (bonus - cost);
          window.notify('🍀 Lucky charm! +🪙' + (bonus - cost) + ' net gain!', 'unlock');
        },
      };
    },
  },
  {
    id: 'xp_boost',
    title: '🧙 Wandering Merchant',
    makeOffer: () => {
      const xpGain = (Math.floor(Math.random() * 4) + 2) * 10;
      const cost = Math.max(4, Math.floor(xpGain * 0.4));
      return {
        typeId: 'xp_boost', cost, xpGain,
        offerText: 'Ancient almanac! Pay 🪙' + cost + ' for +' + xpGain + ' XP immediately.',
        btnText: 'Study (🪙' + cost + ')',
        canAfford: () => window.G.coins >= cost,
        execute: () => {
          window.G.coins -= cost;
          window.G.totalXP += xpGain;
          const prev = window.G.level;
          window.checkLevelUp();
          window.notify('📚 +' + xpGain + ' XP from the almanac!', 'harvest');
          if (window.G.level > prev) {
            const ld = window.getLevelData(window.G.level);
            setTimeout(() => window.notify('🎉 Level Up! ' + ld.title + ' (Lv' + window.G.level + ')!', 'levelup'), 300);
          }
        },
      };
    },
  },
  {
    id: 'speed_tonic',
    title: '🧙 Wandering Merchant',
    makeOffer: () => {
      const G = window.G;
      const pct = [15, 20, 25][Math.floor(Math.random() * 3)];
      const growingCount = G.plots.filter(p => p.cropId && !p.ready).length;
      const cost = Math.max(5, growingCount * 3);
      return {
        typeId: 'speed_tonic', cost, pct,
        offerText: 'Growth tonic! Pay 🪙' + cost + ' to speed all growing crops up by ' + pct + '% instantly.',
        btnText: 'Buy tonic (🪙' + cost + ')',
        canAfford: () => window.G.coins >= cost,
        execute: () => {
          window.G.coins -= cost;
          let boosted = 0;
          window.G.plots.forEach(p => {
            if (p.cropId && p.plantedAt && !p.ready) {
              const crop = CROP_MAP[p.cropId];
              const elapsed = Date.now() - p.plantedAt;
              const remaining = Math.max(0, crop.gameSecs * 1000 - elapsed);
              p.plantedAt -= Math.floor(remaining * (pct / 100));
              boosted++;
            }
          });
          window.saveGame(); window.renderPlots();
          window.notify('🧪 Tonic boosted ' + boosted + ' crop' + (boosted !== 1 ? 's' : '') + ' by ' + pct + '%!', 'harvest');
        },
      };
    },
    canTrigger: () => window.G && window.G.plots.some(p => p.cropId && !p.ready),
  },
  {
    id: 'exotic_seed',
    title: '🧙 Wandering Merchant',
    canTrigger: () => window.G && (window.G._merchantDealsAccepted || 0) >= 40 && Math.random() < 0.30,
    makeOffer: () => {
      const crop = EXOTIC_CROPS[Math.floor(Math.random() * EXOTIC_CROPS.length)];
      const qty = Math.floor(Math.random() * 2) + 1;
      const dealPrice = crop.seedCost * qty;
      return {
        typeId: 'exotic_seed', cropId: crop.id, qty, dealPrice,
        offerText: '✨ Rare find! ' + qty + '× ' + crop.name + ' seed' + (qty > 1 ? 's' : '') + ' for 🪙' + dealPrice + ' — not sold in any shop!',
        btnText: 'Buy ✨🪙' + dealPrice,
        canAfford: () => window.G.coins >= dealPrice,
        execute: () => {
          window.G.coins -= dealPrice;
          window.G.inventory[crop.id] = (window.G.inventory[crop.id] || 0) + qty;
          window.notify('✨ Got ' + qty + '× ' + crop.name + ' exotic seed' + (qty > 1 ? 's' : '') + '! Check your storage!', 'levelup');
        },
      };
    },
  },
];

export const RANDOM_EVENTS = [
  {
    id: 'aphids', icon: '🐛', title: 'Aphid Outbreak!',
    desc: 'A swarm of aphids is attacking your crops! Spend {cost} coins on pesticide to protect your harvest, or risk losing 20% yield on your next harvest.',
    cost: (lvl) => Math.max(2, lvl * 2),
    fixLabel: (cost) => 'Spray (🪙' + cost + ')',
    onFix: () => { window.notify('🐛 Aphids defeated! Crops safe.', 'harvest'); },
    onIgnore: () => { window.G._aphidPenalty = true; window.notify('🐛 Aphids munching… next harvest reduced!', 'error'); },
    canTrigger: () => window.G && window.G.plots.some(p => p.cropId && !p.ready),
  },
  {
    id: 'rain', icon: '🌧️', title: 'Surprise Rain!',
    desc: 'A warm summer shower rolls through! All growing crops get a 15% speed boost — no action needed.',
    cost: () => 0,
    fixLabel: () => 'Great!',
    onFix: () => {
      let boosted = 0;
      window.G.plots.forEach(p => {
        if (p.cropId && p.plantedAt && !p.ready) {
          const crop = CROP_MAP[p.cropId];
          const elapsed = Date.now() - p.plantedAt;
          const remaining = Math.max(0, crop.gameSecs * 1000 - elapsed);
          p.plantedAt -= Math.floor(remaining * 0.15);
          boosted++;
        }
      });
      if (boosted) { window.saveGame(); window.renderPlots(); }
      window.notify('🌧️ Rain boosted ' + boosted + ' crop' + (boosted !== 1 ? 's' : '') + ' by 15%!', 'harvest');
    },
    onIgnore: null,
    canTrigger: () => window.G && window.G.plots.some(p => p.cropId && !p.ready),
  },
  {
    id: 'crow', icon: '🐦', title: 'Crows in the Storage!',
    desc: 'A flock of crows has raided your seed storage and stolen some seeds! Spend {cost} coins on a scarecrow to protect the rest, or lose {steal} seeds.',
    cost: (lvl) => Math.max(3, Math.floor(lvl * 1.5)),
    fixLabel: (cost) => 'Scarecrow (🪙' + cost + ')',
    onFix: () => { window.notify('🐦 Scarecrow deployed! Seeds safe.', 'harvest'); },
    onIgnore: () => {
      const ids = Object.keys(window.G.inventory);
      if (ids.length > 0) {
        const target = ids[Math.floor(Math.random() * ids.length)];
        const stolen = Math.min(window.G.inventory[target], Math.ceil(window.G.inventory[target] * 0.3) || 1);
        window.G.inventory[target] -= stolen;
        if (window.G.inventory[target] <= 0) delete window.G.inventory[target];
        window.saveGame(); window.renderStorage();
        window.notify('🐦 Crows stole ' + stolen + ' ' + CROP_MAP[target].name + ' seed' + (stolen !== 1 ? 's' : '') + '!', 'error');
      } else {
        window.notify('🐦 Crows found nothing to steal. Lucky!', 'harvest');
      }
    },
    canTrigger: () => window.G && Object.keys(window.G.inventory).length > 0,
  },
  {
    id: 'sun', icon: '☀️', title: 'Bumper Sun Day!',
    desc: 'The sun is blazing! Your next harvest will earn +25% bonus coins. No action needed — enjoy the warmth!',
    cost: () => 0,
    fixLabel: () => 'Wonderful!',
    onFix: () => { window.G._sunBonus = true; window.notify('☀️ Sun bonus active! Next harvest +25%!', 'unlock'); },
    onIgnore: null,
    canTrigger: () => window.G && window.G.plots.some(p => p.cropId && !p.ready),
  },
  {
    id: 'rabbit', icon: '🐇', title: 'Rabbit on the Loose!',
    desc: 'A hungry rabbit has hopped into your farm. Pay {cost} coins to shoo it away, or it will delay one of your crops by 30 seconds.',
    cost: (lvl) => Math.max(2, lvl),
    fixLabel: (cost) => 'Shoo it! (🪙' + cost + ')',
    onFix: () => { window.notify('🐇 Rabbit chased off! All clear.', 'harvest'); },
    onIgnore: () => {
      const targets = window.G.plots.filter(p => p.cropId && p.plantedAt && !p.ready);
      if (targets.length > 0) {
        const t = targets[Math.floor(Math.random() * targets.length)];
        t.plantedAt += 30000;
        window.saveGame(); window.renderPlots();
        window.notify('🐇 Rabbit delayed a crop by 30 seconds!', 'error');
      }
    },
    canTrigger: () => window.G && window.G.plots.some(p => p.cropId && !p.ready),
  },
  {
    id: 'bees', icon: '🐝', title: 'Wild Bee Swarm!',
    desc: 'A wild bee colony has settled nearby and is pollinating your crops! All growing crops finish 20% faster. No action needed!',
    cost: () => 0,
    fixLabel: () => 'Buzz-tastic!',
    onFix: () => {
      let boosted = 0;
      window.G.plots.forEach(p => {
        if (p.cropId && p.plantedAt && !p.ready) {
          const crop = CROP_MAP[p.cropId];
          const elapsed = Date.now() - p.plantedAt;
          const remaining = Math.max(0, crop.gameSecs * 1000 - elapsed);
          p.plantedAt -= Math.floor(remaining * 0.20);
          boosted++;
        }
      });
      if (boosted) { window.saveGame(); window.renderPlots(); }
      window.notify('🐝 Bees boosted ' + boosted + ' crop' + (boosted !== 1 ? 's' : '') + ' by 20%!', 'harvest');
    },
    onIgnore: null,
    canTrigger: () => window.G && window.G.plots.some(p => p.cropId && !p.ready),
  },
  {
    id: 'mishap_weevil', icon: '🐛', title: 'Seed Weevil Infestation!',
    desc: 'Weevils have got into your exotic seed-bearing plots! Pay {cost} coins to fumigate or risk losing your oldest seeding plot\'s seeds.',
    cost: () => Math.max(10, (window.getSeedingPlotsAtRisk ? window.getSeedingPlotsAtRisk().length : 0) * 8),
    fixLabel: (cost) => `Fumigate (🪙${cost})`,
    onFix: () => { window.G._exoticMishapsFix = (window.G._exoticMishapsFix || 0) + 1; window.notify('🐛 Weevils fumigated! Exotic seeds safe.', 'harvest'); },
    onIgnore: () => {
      const roll = Math.random();
      if (roll < 0.05) { window.applyMishapTotal && window.applyMishapTotal(); }
      else if (roll < 0.25) { window.applyMishapPartial && window.applyMishapPartial(); }
      else { window.G._exoticNearMisses = (window.G._exoticNearMisses || 0) + 1; window.notify('🐛 Weevils caused some damage but your seeds survived this time!', 'error'); }
    },
    canTrigger: () => window.getSeedingPlotsAtRisk && window.getSeedingPlotsAtRisk().length > 0,
  },
  {
    id: 'mishap_frost', icon: '❄️', title: 'Late Frost Warning!',
    desc: 'An unexpected frost threatens your seed-bearing exotic crops! Pay {cost} coins to cover them or risk losing your oldest seeding plot\'s seeds.',
    cost: () => Math.max(10, (window.getSeedingPlotsAtRisk ? window.getSeedingPlotsAtRisk().length : 0) * 8),
    fixLabel: (cost) => `Cover crops (🪙${cost})`,
    onFix: () => { window.G._exoticMishapsFix = (window.G._exoticMishapsFix || 0) + 1; window.notify('❄️ Crops covered in time! Seeds protected.', 'harvest'); },
    onIgnore: () => {
      const roll = Math.random();
      if (roll < 0.05) { window.applyMishapTotal && window.applyMishapTotal(); }
      else if (roll < 0.25) { window.applyMishapPartial && window.applyMishapPartial(); }
      else { window.G._exoticNearMisses = (window.G._exoticNearMisses || 0) + 1; window.notify('❄️ The frost was light — seeds survived!', 'error'); }
    },
    canTrigger: () => window.getSeedingPlotsAtRisk && window.getSeedingPlotsAtRisk().length > 0,
  },
  {
    id: 'mishap_wind', icon: '💨', title: 'Strange Wind Rattles the Seed Heads!',
    desc: 'A sudden gust swept across your farm — luckily no seeds were lost this time. Nothing to pay; just a close call.',
    cost: () => 0,
    fixLabel: () => 'Phew!',
    onFix: () => { window.G._exoticNearMisses = (window.G._exoticNearMisses || 0) + 1; window.notify('💨 Close call! Your seeds survived the wind.', 'harvest'); },
    onIgnore: null,
    canTrigger: () => window.getSeedingPlotsAtRisk && window.getSeedingPlotsAtRisk().length > 0,
  },
];
