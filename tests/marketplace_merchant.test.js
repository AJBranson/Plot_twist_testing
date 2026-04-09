import { JSDOM } from 'jsdom';
import { SAVE_KEY } from '../js/constants.js';
import { G, loadGame } from '../js/game-state.js';
import { acceptMerchantDeal } from '../js/game-state.js';
import { executePurchase, listSeeds } from '../js/marketplace.js';

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body><div id="merchant-banner"></div><div id="vege-stand-area"></div></body></html>', { url: 'http://localhost' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  return dom;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseSavedState() {
  const raw = localStorage.getItem(SAVE_KEY);
  return raw ? JSON.parse(raw) : null;
}

async function testAcceptMerchantDealSaves() {
  setupDom();
  localStorage.clear();

  loadGame();
  G.coins = 2;
  G.inventory = {};

  window._merchantCanAfford = () => true;
  window._merchantExecute = () => {
    G.coins += 10;
    G.inventory.radish = (G.inventory.radish || 0) + 1;
  };

  acceptMerchantDeal();

  assert(G.coins === 12, 'expect merchant deal execution to modify coins');
  assert(G.inventory.radish === 1, 'expect merchant deal execution to update inventory');
  assert(G._merchantDealsAccepted === 1, 'expect merchant deal counter increment');

  const saved = parseSavedState();
  assert(saved, 'saveGame should have written state for merchant deal');
  assert(saved.coins === 12 || saved._merchantDealsAccepted === 1, 'saved state should include updated merchant values');
}

async function testExecutePurchaseFlow() {
  setupDom();
  localStorage.clear();

  loadGame();
  G.coins = 100;
  G.inventory = {};
  G.walletConnected = true;
  G.walletAddress = 'wallet123';

  window.platformSDK = {
    sendCommand: ({ type, ref, recipients }) => {
      assert(type === 'pay', 'executePurchase should send a pay command');
      assert(ref.startsWith('trade-'), 'payment reference should start with trade-');
      assert(Array.isArray(recipients), 'recipients must be provided');
    }
  };

  window._pendingBuyListing = {
    id: 'test-listing-1',
    crop_id: 'radish',
    seller_address: 'seller1',
    seller_name: 'Farmer',
    qty: 2,
    satoshis: 100,
    heritage: false,
    crop_name: 'Radish'
  };

  window.renderStorage = () => {};
  window.notify = () => {};

  await executePurchase({ disabled:false });

  // Simulate the pay response event for success
  window.dispatchEvent(new window.MessageEvent('message', {
    data: {
      command: 'ninja-app-command',
      type: 'pay-response',
      payload: { ref: 'trade-test-listing-1', success: true }
    }
  }));

  assert(G.inventory.radish === 2, 'inventory should be increased after purchase');
  const saved = parseSavedState();
  assert(saved.inventory && saved.inventory.radish === 2, 'saved state should include purchased seeds');
  assert(window._pendingBuyListing === null, 'pending buy listing should be cleared');
}

async function testListSeedsDefaultPricingUsesSeedBase() {
  setupDom();
  localStorage.clear();

  loadGame();
  G.inventory = { radish: 3 };
  G.standListings = [];
  G.walletConnected = true;
  G.walletAddress = 'wallet123';

  window.renderStorage = () => {};
  window.notify = () => {};

  await listSeeds('radish', 3);

  assert(G.standListings.length === 1, 'listing should be created');
  assert(G.standListings[0].usd_price === 0.03, '3 regular seeds should list for $0.03 at the packet rate');
}

async function runTests() {
  console.log('Running marketplace/merchant tests...');
  await testAcceptMerchantDealSaves();
  console.log('  √ acceptMerchantDeal flow passed');
  await testExecutePurchaseFlow();
  console.log('  √ executePurchase flow passed');
  await testListSeedsDefaultPricingUsesSeedBase();
  console.log('  √ listSeeds default pricing passed');
  console.log('All marketplace/merchant tests passed.');
}

runTests().catch(err => {
  console.error('Test failure:', err);
  process.exit(1);
});
