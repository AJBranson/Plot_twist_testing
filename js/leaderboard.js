// leaderboard.js - Leaderboard functionality

import { G, calcFarmScore } from './game-state.js';
import { getLevelData, escHtml, timeSince } from './utils.js';

// Uses window.notify to avoid circular dep with rendering.js

const LB_CONFIG = {
  url: 'https://hhisdlawemzihzbxmwkc.supabase.co',
  anonKey: 'sb_publishable__lesBNacxfH92P_zn9Fo9A_XIDtn_3e',
  gameId: 'plot-twist',
};

let _lbClient = null;
let _lbCache = null;
let _lbCacheTime = 0;
const LB_CACHE_TTL = 60000;

export function lbClient() {
  if (_lbClient) return _lbClient;
  if (!window.supabase) return null;
  if (LB_CONFIG.url.includes('YOUR_PROJECT')) return null;
  try {
    _lbClient = window.supabase.createClient(LB_CONFIG.url, LB_CONFIG.anonKey);
  } catch (e) {
    _lbClient = null;
  }
  return _lbClient;
}

export async function lbSubmitScore() {
  const db = lbClient();
  if (!db || !G.walletConnected || !G.walletAddress) return false;

  const score = calcFarmScore();
  const levelDat = getLevelData(G.level);
  const maxRetries = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { error: ue } = await db.from('lb_users').upsert({
        address: G.walletAddress,
        farmer_name: G.farmerName || 'Farmer',
        farm_name: G.farmName || 'My Farm',
        score: score,
        prestige: G.prestige || 0,
        level: G.level,
        level_title: levelDat ? levelDat.title : '',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'address', ignoreDuplicates: false });

      if (ue) throw ue;
      _lbCache = null;
      _lbCacheTime = 0;
      return true;
    } catch (e) {
      lastError = e;
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }
  console.warn('Leaderboard submit failed:', lastError.message);
  return false;
}

export async function lbFetchTop10() {
  const db = lbClient();
  if (!db) return null;

  const now = Date.now();
  if (_lbCache && (now - _lbCacheTime) < LB_CACHE_TTL) return _lbCache;

  const maxRetries = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await db
        .from('lb_users')
        .select('address, farmer_name, farm_name, score, prestige, level, level_title, updated_at')
        .order('score', { ascending: false })
        .limit(10);

      if (error) throw error;
      _lbCache = data || [];
      _lbCacheTime = now;
      return _lbCache;
    } catch (e) {
      lastError = e;
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }
  console.warn('Leaderboard fetch failed:', lastError.message);
  return _lbCache || null;
}

export async function lbShareScore() {
  const btn = document.getElementById('lb-share-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Submitting…'; }

  const ok = await lbSubmitScore();

  if (btn) { btn.disabled = false; btn.textContent = '🏆 Share Score'; }

  if (!ok) {
    if (window.notify) window.notify('⚠️ Leaderboard unavailable — score not submitted.', 'error');
    return;
  }

  if (window.notify) window.notify('🏆 Score submitted to leaderboard!', 'levelup');

  if (window.platformSDK) {
    const scoreCard = lbGenerateScoreCard();
    const score = calcFarmScore();
    const ld = getLevelData(G.level);
    const presStr = G.prestige > 0 ? ` | Prestige ${G.prestige}` : '';
    window.platformSDK.sendCommand({
      type: 'create-post',
      params: {
        headline: `🌾 ${G.farmName} — Farm Score ${score.toLocaleString()}`,
        nftDescription: `🌾 ${G.farmerName} scored ${score.toLocaleString()} points in Plot Twist!`
          + `\n🏅 ${ld ? ld.title : 'Farmer'} (Lv${G.level}${presStr})`
          + `\n\nCan you beat it? Play Plot Twist on Metanet.page!`,
        previewAsset: scoreCard,
        appQuery: { campaign: 'leaderboard-share', tstamp: Date.now() },
      }
    });
  }
}

export function lbGenerateScoreCard() {
  const canvas = document.createElement('canvas');
  canvas.width = 600; canvas.height = 400;
  const ctx = canvas.getContext('2d');
  const bg = ctx.createLinearGradient(0, 0, 600, 400);
  bg.addColorStop(0, '#0C1A08'); bg.addColorStop(0.5, '#182B14'); bg.addColorStop(1, '#0C1A08');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 600, 400);
  ctx.strokeStyle = 'rgba(255,209,64,0.5)'; ctx.lineWidth = 3; ctx.strokeRect(4, 4, 592, 392);
  ctx.fillStyle = '#6FCF3A'; ctx.shadowColor = '#6FCF3A'; ctx.shadowBlur = 12;
  ctx.font = 'bold 28px Arial, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('🌾 Plot Twist', 300, 60);
  ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(232,245,220,0.7)';
  ctx.font = '20px Arial, sans-serif'; ctx.fillText(G.farmName || 'My Farm', 300, 96);
  ctx.fillStyle = '#FFD140'; ctx.shadowColor = '#FFD140'; ctx.shadowBlur = 20;
  ctx.font = 'bold 72px Arial, sans-serif'; ctx.fillText(calcFarmScore().toLocaleString(), 300, 190);
  ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(232,245,220,0.5)';
  ctx.font = '18px Arial, sans-serif'; ctx.fillText('FARM SCORE', 300, 220);
  const ld = getLevelData(G.level);
  ctx.fillStyle = 'rgba(232,245,220,0.9)'; ctx.font = 'bold 22px Arial, sans-serif';
  ctx.fillText(`${G.farmerName || 'Farmer'} — ${ld ? ld.title : ''} (Lv${G.level})`, 300, 268);
  if (G.prestige > 0) {
    ctx.fillStyle = '#FFD140'; ctx.font = '18px Arial, sans-serif';
    ctx.fillText(`⭐ Prestige ${G.prestige}`, 300, 300);
  }
  ctx.fillStyle = 'rgba(111,207,58,0.5)'; ctx.font = '16px Arial, sans-serif';
  ctx.fillText('Play Plot Twist on Metanet.page', 300, 365);
  const dataURL = canvas.toDataURL('image/jpeg', 0.85);
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  const u8 = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
  const file = new File([u8], `plot-twist-score-${calcFarmScore()}.jpg`, { type: mime });
  return { type: 'image', file, preview: dataURL };
}

export async function renderLeaderboardTab() {
  const panel = document.getElementById('jtab-leaderboard');
  if (!panel) return;
  const db = lbClient();
  const score = calcFarmScore();
  const ld = getLevelData(G.level);
  const myConnected = G.walletConnected && G.walletAddress;
  const presStr = G.prestige > 0 ? ` · Prestige ${G.prestige}` : '';
  const myCardHtml = `
    <div class="lb-my-score-card">
      <div>
        <div class="lb-label">Your Farm Score</div>
        <div class="lb-value">🏆 ${score.toLocaleString()}</div>
        <div class="lb-sub-val">${ld ? ld.title : ''} · Lv${G.level}${presStr}</div>
      </div>
      <div style="text-align:right">
        ${myConnected
          ? `<button class="lb-share-btn" onclick="lbShareScore()" style="margin-left:0">🏆 Share Score</button>`
          : `<div style="font-size:11px;color:var(--text-dim)">Connect wallet to<br>join the leaderboard</div>`
        }
      </div>
    </div>`;
  if (!db) {
    panel.innerHTML = myCardHtml + `<div class="lb-empty">🏗️ Leaderboard not configured yet.</div>`;
    return;
  }
  panel.innerHTML = myCardHtml + `<div class="lb-loading">⏳ Loading leaderboard…</div>`;
  const rows = await lbFetchTop10();
  if (!rows) {
    panel.innerHTML = myCardHtml + `<div class="lb-empty">⚠️ Could not load leaderboard.</div>`;
    return;
  }
  if (rows.length === 0) {
    panel.innerHTML = myCardHtml + `<div class="lb-empty">🌱 No scores yet — be the first!</div>`;
    return;
  }
  const rankEmoji = ['🥇', '🥈', '🥉'];
  const rowsHtml = rows.map((r, i) => {
    const isMine = myConnected && r.address === G.walletAddress;
    const rank = rankEmoji[i] || `<span style="font-size:12px;font-weight:800;color:var(--text-dim)">${i + 1}</span>`;
    const when = r.updated_at ? timeSince(new Date(r.updated_at)) : '';
    const pre = r.prestige > 0 ? ` · ⭐${r.prestige}` : '';
    return `<div class="lb-row ${isMine ? 'lb-mine' : i < 3 ? 'lb-top3' : ''}">
      <div class="lb-rank">${rank}</div>
      <div class="lb-info">
        <div class="lb-name">${escHtml(r.farmer_name)}${isMine ? ' <span style="color:var(--gold);font-size:10px">(you)</span>' : ''}</div>
        <div class="lb-sub">${escHtml(r.farm_name)} · ${r.level_title || ''} Lv${r.level}${pre} · ${when}</div>
      </div>
      <div class="lb-score">${Number(r.score).toLocaleString()}</div>
    </div>`;
  }).join('');
  panel.innerHTML = myCardHtml + `<div class="lb-section-title">🏆 Top 10 Farmers</div>` + rowsHtml;
}

export function lbUpdateShareBtn() {
  const btn = document.getElementById('lb-share-btn');
  if (!btn) return;
  btn.style.display = G.walletConnected ? 'inline-flex' : 'none';
}
