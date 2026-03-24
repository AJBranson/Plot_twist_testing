// leaderboard.js - Leaderboard functionality for BSV Farm Game

// Leaderboard configuration
const LB_CONFIG = {
  url: 'https://hhisdlawemzihzbxmwkc.supabase.co',
  anonKey: 'sb_publishable__lesBNacxfH92P_zn9Fo9A_XIDtn_3e',
  gameId: 'plot-twist',
};

// Supabase client — initialised lazily so a missing config
// just means leaderboard silently shows "unavailable"
let _lbClient = null;

// Cache — avoid re-fetching while the journal tab is open
let _lbCache = null;          // array of top-10 rows
let _lbCacheTime = 0;         // ms timestamp of last fetch
const LB_CACHE_TTL = 60000;   // 60 seconds

// Import dependencies
import { G, calcFarmScore, getLevelData, notify } from './game-state.js';
import { escHtml, timeSince } from './utils.js';

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

// Upsert the current player's score
export async function lbSubmitScore() {
  const db = lbClient();
  if (!db || !G.walletConnected || !G.walletAddress) return false;

  const score = calcFarmScore();
  const levelDat = getLevelData(G.level);

  // lb_users: upsert by wallet address — update name/score if improved
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

      // Bust the cache so the leaderboard refreshes next open
      _lbCache = null;
      _lbCacheTime = 0;
      return true;
    } catch (e) {
      lastError = e;
      console.warn(`Leaderboard submit attempt ${attempt}/${maxRetries} failed:`, e.message);
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  console.warn('Leaderboard submit failed after all retries:', lastError.message);
  return false;
}

// Fetch top 10
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
      console.warn(`Leaderboard fetch attempt ${attempt}/${maxRetries} failed:`, e.message);
      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  console.warn('Leaderboard fetch failed after all retries:', lastError.message);
  return _lbCache || null; // Return cached data if available, otherwise null
}

// Share Score button handler
export async function lbShareScore() {
  const btn = document.getElementById('lb-share-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Submitting…';
  }

  // 1. Write to Supabase immediately (regardless of post outcome)
  const ok = await lbSubmitScore();

  if (btn) {
    btn.disabled = false;
    btn.textContent = '🏆 Share Score';
  }

  if (!ok) {
    notify('⚠️ Leaderboard unavailable — score not submitted.', 'error');
    return;
  }

  notify('🏆 Score submitted to leaderboard!', 'levelup');

  // 2. Generate score card image and fire create-post
  //    Player can edit, cancel, or post — the score is already recorded.
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

// Generate a 600×400 score card as a previewAsset object
export function lbGenerateScoreCard() {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, 600, 400);
  bg.addColorStop(0, '#0C1A08');
  bg.addColorStop(0.5, '#182B14');
  bg.addColorStop(1, '#0C1A08');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 600, 400);

  // Subtle grid lines
  ctx.strokeStyle = 'rgba(111,207,58,0.07)';
  ctx.lineWidth = 1;
  for (let x = 0; x < 600; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 400);
    ctx.stroke();
  }
  for (let y = 0; y < 400; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(600, y);
    ctx.stroke();
  }

  // Gold border
  ctx.strokeStyle = 'rgba(255,209,64,0.5)';
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, 592, 392);

  // Game title
  ctx.fillStyle = '#6FCF3A';
  ctx.shadowColor = '#6FCF3A';
  ctx.shadowBlur = 12;
  ctx.font = 'bold 28px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🌾 Plot Twist', 300, 60);

  // Farm name
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(232,245,220,0.7)';
  ctx.font = '20px Arial, sans-serif';
  ctx.fillText(G.farmName || 'My Farm', 300, 96);

  // Score
  ctx.fillStyle = '#FFD140';
  ctx.shadowColor = '#FFD140';
  ctx.shadowBlur = 20;
  ctx.font = 'bold 72px Arial, sans-serif';
  ctx.fillText(calcFarmScore().toLocaleString(), 300, 190);

  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(232,245,220,0.5)';
  ctx.font = '18px Arial, sans-serif';
  ctx.fillText('FARM SCORE', 300, 220);

  // Farmer name + level
  const ld = getLevelData(G.level);
  ctx.fillStyle = 'rgba(232,245,220,0.9)';
  ctx.font = 'bold 22px Arial, sans-serif';
  ctx.fillText(`${G.farmerName || 'Farmer'} — ${ld ? ld.title : ''} (Lv${G.level})`, 300, 268);

  // Prestige
  if (G.prestige > 0) {
    ctx.fillStyle = '#FFD140';
    ctx.font = '18px Arial, sans-serif';
    ctx.fillText(`⭐ Prestige ${G.prestige}`, 300, 300);
  }

  // Footer
  ctx.fillStyle = 'rgba(111,207,58,0.5)';
  ctx.font = '16px Arial, sans-serif';
  ctx.fillText('Play Plot Twist on Metanet.page', 300, 365);

  // Convert canvas → File + dataURL (required by create-post previewAsset)
  const dataURL = canvas.toDataURL('image/jpeg', 0.85);
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  const u8 = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
  const file = new File([u8], `plot-twist-score-${calcFarmScore()}.jpg`, { type: mime });
  return { type: 'image', file, preview: dataURL };
}

// Render the leaderboard journal tab
export async function renderLeaderboardTab() {
  const panel = document.getElementById('jtab-leaderboard');
  if (!panel) return;

  const db = lbClient();
  const score = calcFarmScore();
  const ld = getLevelData(G.level);

  // My score card at the top
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
          ? `<button class="lb-share-btn" onclick="lbShareScore()" style="margin-left:0">🏆 Share Score</button>
             <div style="font-size:10px;color:var(--text-dim);margin-top:4px">Submits & posts to feed</div>`
          : `<div style="font-size:11px;color:var(--text-dim)">Connect wallet to<br>join the leaderboard</div>`
        }
      </div>
    </div>`;

  // Not configured yet
  if (!db) {
    panel.innerHTML = myCardHtml + `
      <div class="lb-empty">
        🏗️ Leaderboard not configured yet.<br>
        <span style="font-size:11px;margin-top:6px;display:block">Fill in LB_CONFIG in the game script with your Supabase URL and anon key.</span>
      </div>`;
    return;
  }

  panel.innerHTML = myCardHtml + `<div class="lb-loading">⏳ Loading leaderboard…</div>`;

  const rows = await lbFetchTop10();

  if (!rows) {
    panel.innerHTML = myCardHtml + `<div class="lb-empty">⚠️ Could not load leaderboard. Check your connection.</div>`;
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

  const myRankRow = myConnected ? rows.findIndex(r => r.address === G.walletAddress) : -1;
  const notOnBoard = myConnected && myRankRow === -1 && rows.length >= 10;
  const notOnBoardHtml = notOnBoard
    ? `<div style="font-size:11px;color:var(--text-dim);text-align:center;margin-top:8px">
         Your score of ${score.toLocaleString()} is not in the top 10 yet.
       </div>`
    : '';

  panel.innerHTML = myCardHtml
    + `<div class="lb-section-title">🏆 Top 10 Farmers</div>`
    + rowsHtml
    + notOnBoardHtml;
}

// Show Share Score button once wallet is connected
export function lbUpdateShareBtn() {
  const btn = document.getElementById('lb-share-btn');
  if (!btn) return;
  btn.style.display = G.walletConnected ? 'inline-flex' : 'none';
}