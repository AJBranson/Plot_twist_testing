import { JSDOM } from 'jsdom';
import { GUEST_SAVE_KEY } from '../js/constants.js';
import { loadGame, saveGame, DEFAULT_STATE, getSaveKey, G, syncPersonalBestScore } from '../js/game-state.js';

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
  assert(getSaveKey() === GUEST_SAVE_KEY, 'guest save key consistency check');

  // Should start at default state
  assert(G.coins === DEFAULT_STATE.coins, 'default coins on first load');

  // Modify and save, then verify localStorage entry exists
  G.coins = 99;
  G.personalBestScore = 1234;
  saveGame();
  const raw = localStorage.getItem(GUEST_SAVE_KEY);
  assert(raw && raw.includes('99'), 'saveGame stored updated coins');
  assert(raw && raw.includes('1234'), 'saveGame stored personal best score');

  // Load again and verify persisted value
  G.coins = 0;
  G.personalBestScore = 0;
  loadGame();
  assert(G.coins === 99, 'loadGame roundtrip coins');
  assert(G.personalBestScore === 1234, 'loadGame roundtrip personal best score');
}

async function testCorruptedDataRecovery() {
  setupDom();

  localStorage.setItem(GUEST_SAVE_KEY, '{ invalid json');
  loadGame();

  assert(G.coins === DEFAULT_STATE.coins, 'corrupted data resets to default state');
  assert(localStorage.getItem(GUEST_SAVE_KEY) === null, 'corrupted save entry cleared');
}

async function testPersonalBestDefaultsToCurrentScore() {
  setupDom();

  localStorage.clear();
  loadGame();

  const expectedScore = Math.floor(Math.pow(DEFAULT_STATE.level, 2) * 300 + DEFAULT_STATE.coins + DEFAULT_STATE.totalXP * 0.5);
  assert(G.personalBestScore === expectedScore, 'new game personal best defaults to current score');
}

async function testPersonalBestNeverDrops() {
  setupDom();

  localStorage.clear();
  loadGame();

  G.personalBestScore = 5000;
  G.coins = 2;
  G.totalXP = 0;
  G.level = 1;
  assert(syncPersonalBestScore() === 5000, 'personal best remains when current score is lower');

  G.coins = 10000;
  const raisedBest = syncPersonalBestScore();
  assert(raisedBest > 5000, 'personal best increases when current score is higher');
  assert(G.personalBestScore === raisedBest, 'updated personal best stored on state');
}

async function runTests() {
  console.log('Running save/load tests...');
  await testSaveLoadRoundtrip();
  console.log('  √ roundtrip save/load passed');

  await testCorruptedDataRecovery();
  console.log('  √ corrupted data recovery passed');

  await testPersonalBestDefaultsToCurrentScore();
  console.log('  √ personal best default passed');

  await testPersonalBestNeverDrops();
  console.log('  √ personal best monotonicity passed');

  console.log('All save/load tests passed.');
}

runTests().catch(err => {
  console.error('Test failure:', err);
  process.exit(1);
});
