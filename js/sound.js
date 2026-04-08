const SOUND_PREF_KEY = 'plot_twist_sound_enabled';

let audioContext = null;
let masterGain = null;
let soundEnabled = readSoundPreference();
let toggleButtonId = 'sound-toggle-btn';
let unlockInstalled = false;
let noiseBuffer = null;
const activeStops = new Set();

function readSoundPreference() {
  try {
    const saved = localStorage.getItem(SOUND_PREF_KEY);
    return saved === null ? true : saved !== 'off';
  } catch {
    return true;
  }
}

function writeSoundPreference() {
  try {
    localStorage.setItem(SOUND_PREF_KEY, soundEnabled ? 'on' : 'off');
  } catch {
    // Ignore browsers that block storage in embedded contexts.
  }
}

function getAudioContext() {
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return null;
  if (!audioContext) {
    audioContext = new AudioCtor();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 0.8;
    masterGain.connect(audioContext.destination);
  }
  return audioContext;
}

function getOutputNode() {
  const ctx = getAudioContext();
  if (!ctx || !masterGain) return null;
  return masterGain;
}

function registerStop(stopFn) {
  activeStops.add(stopFn);
  return () => activeStops.delete(stopFn);
}

function stopActiveSounds() {
  activeStops.forEach(stopFn => {
    try {
      stopFn();
    } catch {
      // Ignore audio shutdown errors from nodes that already ended.
    }
  });
  activeStops.clear();
}

function getNoiseBuffer(ctx) {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer;
  const length = Math.max(1, Math.floor(ctx.sampleRate * 1.25));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < length; index++) {
    data[index] = (Math.random() * 2 - 1) * 0.7;
  }
  noiseBuffer = buffer;
  return noiseBuffer;
}

function canPlay() {
  return soundEnabled && !!getAudioContext() && !!getOutputNode();
}

function scheduleTone(ctx, output, options) {
  const {
    frequency,
    start,
    duration,
    volume = 0.18,
    type = 'triangle',
    attack = 0.01,
    release = 0.18,
    detune = 0,
  } = options;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.detune.setValueAtTime(detune, start);

  gainNode.gain.setValueAtTime(0.0001, start);
  gainNode.gain.exponentialRampToValueAtTime(volume, start + attack);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration + release);

  oscillator.connect(gainNode);
  gainNode.connect(output);
  oscillator.start(start);
  oscillator.stop(start + duration + release + 0.02);
}

function playSequence(notes) {
  if (!canPlay()) return;
  const ctx = getAudioContext();
  const output = getOutputNode();
  if (!ctx || !output) return;
  if (ctx.state !== 'running') return;

  const baseTime = ctx.currentTime + 0.01;
  notes.forEach(note => {
    scheduleTone(ctx, output, { ...note, start: baseTime + (note.offset || 0) });
  });
}

export function syncSoundToggleButton() {
  const btn = document.getElementById(toggleButtonId);
  if (!btn) return;
  btn.textContent = soundEnabled ? '🔊 Sound On' : '🔇 Sound Off';
  btn.title = soundEnabled ? 'Disable sound effects' : 'Enable sound effects';
  btn.setAttribute('aria-pressed', soundEnabled ? 'true' : 'false');
  btn.classList.toggle('muted', !soundEnabled);
}

export function resumeSound() {
  const ctx = getAudioContext();
  if (!ctx || !soundEnabled || ctx.state === 'running') return;
  ctx.resume().catch(() => {});
}

function installUnlockHandler() {
  if (unlockInstalled) return;
  unlockInstalled = true;

  const unlock = () => resumeSound();
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('touchstart', unlock, { passive: true });
  window.addEventListener('keydown', unlock);
}

export function initSound(buttonId = 'sound-toggle-btn') {
  toggleButtonId = buttonId;
  installUnlockHandler();
  syncSoundToggleButton();
}

export function toggleSound() {
  soundEnabled = !soundEnabled;
  writeSoundPreference();
  syncSoundToggleButton();
  if (!soundEnabled) stopActiveSounds();
  if (soundEnabled) {
    resumeSound();
    playSequence([
      { frequency: 660, offset: 0.00, duration: 0.05, volume: 0.09, type: 'triangle' },
      { frequency: 880, offset: 0.06, duration: 0.08, volume: 0.10, type: 'triangle' },
    ]);
  }
  return soundEnabled;
}

export function playHarvestSound(options = {}) {
  const { fertilised = false, heritage = false } = options;
  const accent = heritage ? 1.18 : 1;
  const volume = fertilised ? 0.18 : 0.14;
  playSequence([
    { frequency: 392 * accent, offset: 0.00, duration: 0.06, volume, type: 'triangle' },
    { frequency: 494 * accent, offset: 0.07, duration: 0.07, volume: volume + 0.02, type: 'triangle' },
    { frequency: 588 * accent, offset: 0.14, duration: 0.09, volume: volume + 0.03, type: heritage ? 'sine' : 'triangle' },
  ]);
}

export function playPlantSound(isHeritage = false) {
  const accent = isHeritage ? 1.14 : 1;
  playSequence([
    { frequency: 261.63 * accent, offset: 0.00, duration: 0.05, volume: 0.11, type: 'triangle' },
    { frequency: 329.63 * accent, offset: 0.05, duration: 0.07, volume: 0.12, type: 'triangle' },
    { frequency: 392.00 * accent, offset: 0.11, duration: 0.08, volume: 0.10, type: isHeritage ? 'sine' : 'triangle' },
  ]);
}

export function playWateringCanSound(durationMs = 1000) {
  if (!canPlay()) return;
  const ctx = getAudioContext();
  const output = getOutputNode();
  if (!ctx || !output || ctx.state !== 'running') return;

  const seconds = Math.max(0.2, durationMs / 1000);
  const start = ctx.currentTime + 0.01;
  const end = start + seconds;

  const source = ctx.createBufferSource();
  source.buffer = getNoiseBuffer(ctx);
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1280, start);
  filter.Q.setValueAtTime(0.8, start);

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0.0001, start);
  gainNode.gain.exponentialRampToValueAtTime(0.05, start + 0.06);
  gainNode.gain.exponentialRampToValueAtTime(0.035, start + Math.max(seconds - 0.18, 0.12));
  gainNode.gain.exponentialRampToValueAtTime(0.0001, end);

  source.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(output);

  const stop = () => {
    try {
      source.stop();
    } catch {
      // Ignore stop on completed sources.
    }
    source.disconnect();
    filter.disconnect();
    gainNode.disconnect();
  };
  const unregister = registerStop(stop);

  source.onended = () => {
    unregister();
    try {
      source.disconnect();
      filter.disconnect();
      gainNode.disconnect();
    } catch {
      // Ignore cleanup errors after automatic stop.
    }
  };

  source.start(start);
  source.stop(end + 0.03);

  playSequence([
    { frequency: 1046.5, offset: 0.02, duration: 0.03, volume: 0.025, type: 'sine' },
    { frequency: 932.33, offset: 0.18, duration: 0.03, volume: 0.022, type: 'sine' },
    { frequency: 1174.66, offset: 0.36, duration: 0.03, volume: 0.02, type: 'sine' },
    { frequency: 987.77, offset: 0.58, duration: 0.03, volume: 0.018, type: 'sine' },
  ]);
}

export function playPlotUnlockSound() {
  playSequence([
    { frequency: 293.66, offset: 0.00, duration: 0.06, volume: 0.11, type: 'triangle' },
    { frequency: 392.00, offset: 0.08, duration: 0.08, volume: 0.13, type: 'triangle' },
    { frequency: 523.25, offset: 0.18, duration: 0.11, volume: 0.15, type: 'triangle' },
    { frequency: 698.46, offset: 0.30, duration: 0.15, volume: 0.13, type: 'sine' },
  ]);
}

export function playMerchantDealSound() {
  playSequence([
    { frequency: 392.00, offset: 0.00, duration: 0.05, volume: 0.11, type: 'triangle' },
    { frequency: 493.88, offset: 0.06, duration: 0.06, volume: 0.12, type: 'triangle' },
    { frequency: 587.33, offset: 0.13, duration: 0.07, volume: 0.13, type: 'triangle' },
    { frequency: 783.99, offset: 0.22, duration: 0.13, volume: 0.15, type: 'sine' },
  ]);
}

export function playCompostSound() {
  playSequence([
    { frequency: 196.00, offset: 0.00, duration: 0.05, volume: 0.10, type: 'triangle' },
    { frequency: 246.94, offset: 0.05, duration: 0.06, volume: 0.10, type: 'triangle' },
    { frequency: 329.63, offset: 0.11, duration: 0.09, volume: 0.11, type: 'sine' },
  ]);
}

export function playAchievementSound(count = 1) {
  const lift = Math.min(Math.max(count, 1), 4) * 18;
  playSequence([
    { frequency: 523.25, offset: 0.00, duration: 0.09, volume: 0.16, type: 'triangle' },
    { frequency: 659.25, offset: 0.08, duration: 0.10, volume: 0.17, type: 'triangle' },
    { frequency: 783.99, offset: 0.17, duration: 0.14, volume: 0.19, type: 'sine', detune: lift },
    { frequency: 1046.5, offset: 0.28, duration: 0.18, volume: 0.14, type: 'sine', detune: lift },
  ]);
}

export function playEventSound(kind = 'alert') {
  switch (kind) {
    case 'positive':
      playSequence([
        { frequency: 523.25, offset: 0.00, duration: 0.05, volume: 0.12, type: 'triangle' },
        { frequency: 659.25, offset: 0.06, duration: 0.07, volume: 0.13, type: 'triangle' },
        { frequency: 880.00, offset: 0.14, duration: 0.10, volume: 0.15, type: 'sine' },
      ]);
      break;
    case 'negative':
      playSequence([
        { frequency: 329.63, offset: 0.00, duration: 0.07, volume: 0.13, type: 'sawtooth' },
        { frequency: 261.63, offset: 0.08, duration: 0.08, volume: 0.11, type: 'triangle' },
        { frequency: 196.00, offset: 0.18, duration: 0.11, volume: 0.10, type: 'triangle' },
      ]);
      break;
    case 'resolved':
      playSequence([
        { frequency: 440, offset: 0.00, duration: 0.06, volume: 0.14, type: 'triangle' },
        { frequency: 554.37, offset: 0.07, duration: 0.08, volume: 0.15, type: 'triangle' },
        { frequency: 659.25, offset: 0.15, duration: 0.10, volume: 0.17, type: 'sine' },
      ]);
      break;
    case 'ignored':
      playSequence([
        { frequency: 246.94, offset: 0.00, duration: 0.09, volume: 0.13, type: 'sawtooth' },
        { frequency: 196.00, offset: 0.10, duration: 0.12, volume: 0.10, type: 'triangle' },
      ]);
      break;
    case 'merchant':
      playSequence([
        { frequency: 523.25, offset: 0.00, duration: 0.05, volume: 0.12, type: 'triangle' },
        { frequency: 659.25, offset: 0.05, duration: 0.06, volume: 0.12, type: 'triangle' },
        { frequency: 783.99, offset: 0.11, duration: 0.08, volume: 0.13, type: 'sine' },
      ]);
      break;
    case 'merchantDeal':
      playSequence([
        { frequency: 392.00, offset: 0.00, duration: 0.06, volume: 0.12, type: 'triangle' },
        { frequency: 523.25, offset: 0.06, duration: 0.07, volume: 0.14, type: 'triangle' },
        { frequency: 698.46, offset: 0.13, duration: 0.11, volume: 0.15, type: 'sine' },
      ]);
      break;
    default:
      playSequence([
        { frequency: 349.23, offset: 0.00, duration: 0.08, volume: 0.12, type: 'triangle' },
        { frequency: 293.66, offset: 0.10, duration: 0.08, volume: 0.10, type: 'triangle' },
      ]);
      break;
  }
}