import { JSDOM } from 'jsdom';
import { SAVE_KEY } from '../js/constants.js';
import { loadGame, saveGame, DEFAULT_STATE, getSaveKey, G } from '../js/game-state.js';

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  return dom;
}

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

async function testSaveLoadRoundtrip() {
  setupDom();

  // Reset any previous state and ensure empty localStorage
  localStorage.clear();

  loadGame();
  assert(getSaveKey() === SAVE_KEY, 'SAVE_KEY consistency check');

  // Should start at default state
  assert(G.coins === DEFAULT_STATE.coins, 'default coins on first load');

  // Modify and save, then verify localStorage entry exists
  G.coins = 99;
  saveGame();
  const raw = localStorage.getItem(SAVE_KEY);
  assert(raw && raw.includes('99'), 'saveGame stored updated coins');

  // Load again and verify persisted value
  G.coins = 0;
  loadGame();
  assert(G.coins === 99, 'loadGame roundtrip coins');
}

async function testCorruptedDataRecovery() {
  setupDom();

  localStorage.setItem(SAVE_KEY, '{ invalid json');
  loadGame();

  assert(G.coins === DEFAULT_STATE.coins, 'corrupted data resets to default state');
  assert(localStorage.getItem(SAVE_KEY) === null, 'corrupted save entry cleared');
}

async function runTests() {
  console.log('Running save/load tests...');
  await testSaveLoadRoundtrip();
  console.log('  √ roundtrip save/load passed');

  await testCorruptedDataRecovery();
  console.log('  √ corrupted data recovery passed');

  console.log('All save/load tests passed.');
}

runTests().catch(err => {
  console.error('Test failure:', err);
  process.exit(1);
});
