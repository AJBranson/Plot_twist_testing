// ============================================================
// CLOUD SAVE CLIENT
// ============================================================

import { LB_CONFIG, CLOUD_SAVE_SCHEMA_VERSION, WALLET_SAVE_CACHE_PREFIX } from './constants.js';

let _saveClient = null;

export function cloudSaveClient() {
  if (_saveClient) return _saveClient;
  if (!window.supabase) return null;
  if (!LB_CONFIG.url || LB_CONFIG.url.includes('YOUR_PROJECT')) return null;
  try {
    _saveClient = window.supabase.createClient(LB_CONFIG.url, LB_CONFIG.anonKey);
  } catch (e) {
    _saveClient = null;
  }
  return _saveClient;
}

export function isCloudSaveAvailable() {
  return !!cloudSaveClient();
}

export function getWalletCacheKey(address) {
  return WALLET_SAVE_CACHE_PREFIX + String(address || '').trim().toLowerCase();
}

export async function fetchCloudSave(walletAddress) {
  const db = cloudSaveClient();
  if (!db || !walletAddress) return { data: null, error: null };

  try {
    const { data, error } = await db.rpc('get_game_save', {
      p_game_id: LB_CONFIG.gameId,
      p_wallet_address: walletAddress,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? (data[0] || null) : (data || null);
    return { data: row, error: null };
  } catch (error) {
    console.warn('Cloud save fetch failed:', error);
    return { data: null, error };
  }
}

export async function upsertCloudSave({ walletAddress, farmerName, farmName, saveData }) {
  const db = cloudSaveClient();
  if (!db || !walletAddress || !saveData) return { data: null, error: null };

  try {
    const { data, error } = await db.rpc('upsert_game_save', {
      p_game_id: LB_CONFIG.gameId,
      p_wallet_address: walletAddress,
      p_farmer_name: farmerName || 'Farmer',
      p_farm_name: farmName || 'My Farm',
      p_schema_version: CLOUD_SAVE_SCHEMA_VERSION,
      p_save_data: saveData,
    });
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.warn('Cloud save upsert failed:', error);
    return { data: null, error };
  }
}