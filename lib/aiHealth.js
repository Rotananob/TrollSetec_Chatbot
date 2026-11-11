// lib/aiHealth.js
// Shared AI Engine Health, Key Cooldown Tracker, Incident Reporter, and Multi-Instance Session Unlock Sync

const FIREBASE_DB_URL =
  process.env.FIREBASE_DB_URL ||
  'https://troll-setec-chatbot-default-rtdb.asia-southeast1.firebasedatabase.app';

export const KEY_COOLDOWN_MS = 25000; // 25s cooldown when a text key hits 429/401/403
export const TTS_COOLDOWN_MS = 60000; // 60s cooldown when a TTS key hits 429

const keyCooldownMap = new Map();
const ttsKeyCooldownMap = new Map();
const recentUnlockCache = new Map(); // deviceId -> { unlockedAt, expiresAt, cachedAt }

let lastHealthResetAt = 0;
let lastIncidentTimestamp = 0;

function sanitizeRtdbKey(raw = '') {
  return String(raw || '')
    .trim()
    .replace(/[.#$\[\]\/]/g, '_')
    .slice(0, 120);
}

export function markKeyTemporarilyExhausted(key) {
  if (!key) return;
  keyCooldownMap.set(key, Date.now() + KEY_COOLDOWN_MS);
}

export function isKeyCoolingDown(key) {
  const expiry = keyCooldownMap.get(key);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    keyCooldownMap.delete(key);
    return false;
  }
  return true;
}

export function markTtsKeyCoolingDown(key) {
  if (!key) return;
  ttsKeyCooldownMap.set(key, Date.now() + TTS_COOLDOWN_MS);
}

export function isTtsKeyCoolingDown(key) {
  const expiry = ttsKeyCooldownMap.get(key);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    ttsKeyCooldownMap.delete(key);
    return false;
  }
  return true;
}

export function filterAvailableTtsKeys(apiKeys) {
  const valid = Array.isArray(apiKeys) ? apiKeys.filter(Boolean) : [apiKeys].filter(Boolean);
  const avail = valid.filter((k) => !isTtsKeyCoolingDown(k));
  return avail.length > 0 ? avail : valid;
}

export function getAllConfiguredGeminiKeys() {
  const rawList = [
    { slot: 'KONBONG', key: process.env.GEMINI_API_KEY_KONBONG },
    { slot: 'KONPOV', key: process.env.GEMINI_API_KEY_KONPOV },
    { slot: 'KONKANDAL', key: process.env.GEMINI_API_KEY_KONKANDAL },
    { slot: 'PRIMARY', key: process.env.GEMINI_API_KEY },
    { slot: 'RESERVE', key: process.env.GEMINI_API_KEY_RESERVE },
    { slot: 'RESERVE_1', key: process.env.GEMINI_API_KEY_RESERVE_ONE },
    { slot: 'RESERVE_2', key: process.env.GEMINI_API_KEY_RESERVE_TWO },
    { slot: 'RESERVE_3', key: process.env.GEMINI_API_KEY_RESERVE_THREE }
  ].filter((item) => Boolean(item.key));

  const seen = new Set();
  const deduped = [];
  for (const item of rawList) {
    if (!seen.has(item.key)) {
      seen.add(item.key);
      deduped.push(item);
    }
  }
  return deduped;
}

export function getApiKeysHealthSummary() {
  const now = Date.now();
  const configured = getAllConfiguredGeminiKeys();
  const keys = configured.map((item) => {
    const textExpiry = keyCooldownMap.get(item.key) || 0;
    const ttsExpiry = ttsKeyCooldownMap.get(item.key) || 0;
    if (textExpiry && now > textExpiry) keyCooldownMap.delete(item.key);
    if (ttsExpiry && now > ttsExpiry) ttsKeyCooldownMap.delete(item.key);

    const textCooldownSec = textExpiry > now ? Math.ceil((textExpiry - now) / 1000) : 0;
    const ttsCooldownSec = ttsExpiry > now ? Math.ceil((ttsExpiry - now) / 1000) : 0;
    const masked =
      item.key.length > 10
        ? `${item.key.slice(0, 6)}...${item.key.slice(-4)}`
        : '***';

    return {
      slot: item.slot,
      masked,
      healthy: textCooldownSec === 0,
      textCooldownSec,
      ttsCooldownSec
    };
  });

  const healthyCount = keys.filter((k) => k.healthy).length;
  return {
    totalKeys: keys.length,
    healthyCount,
    coolingCount: keys.length - healthyCount,
    lastHealthResetAt,
    lastIncidentTimestamp,
    keys
  };
}

export function resetAllAiEngineHealth() {
  const textKeysCleared = keyCooldownMap.size;
  const ttsKeysCleared = ttsKeyCooldownMap.size;
  keyCooldownMap.clear();
  ttsKeyCooldownMap.clear();
  lastHealthResetAt = Date.now();
  return {
    textKeysCleared,
    ttsKeysCleared,
    resetAt: lastHealthResetAt
  };
}

export async function reportAiIncidentToRTDB({
  type = 'AI Error',
  bot = 'konbong',
  username = 'User',
  prompt = '',
  errorMessage = '',
  ip = '',
  statusCode = 500,
  source = 'server'
} = {}) {
  const now = Date.now();
  lastIncidentTimestamp = now;
  const incidentId = `inc_${now}_${Math.random().toString(36).slice(2, 7)}`;

  const payload = {
    id: incidentId,
    type: String(type || 'AI Error').slice(0, 80),
    bot: String(bot || 'konbong').slice(0, 40),
    username: String(username || 'User').slice(0, 60),
    prompt: String(prompt || '').slice(0, 260),
    errorMessage: String(errorMessage || 'Unknown AI Error').slice(0, 320),
    ip: String(ip || '').slice(0, 60),
    statusCode: Number(statusCode) || 500,
    source: String(source || 'server').slice(0, 30),
    status: 'active',
    createdAt: now
  };

  try {
    await fetch(`${FIREBASE_DB_URL}/ai_incidents/${encodeURIComponent(incidentId)}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(4000)
    });
  } catch (e) {
    console.warn('[aiHealth] Failed to log incident to RTDB:', e?.message);
  }

  return payload;
}

export async function fetchAiIncidentsFromRTDB(limit = 35) {
  try {
    const res = await fetch(`${FIREBASE_DB_URL}/ai_incidents.json`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(4500)
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data || typeof data !== 'object') return [];

    const list = Object.keys(data)
      .map((id) => ({ id, ...data[id] }))
      .filter((item) => item && item.createdAt)
      .sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (a.status !== 'active' && b.status === 'active') return 1;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });

    return list.slice(0, limit);
  } catch (e) {
    console.warn('[aiHealth] Failed to fetch incidents:', e?.message);
    return [];
  }
}

export async function resolveAllAiIncidentsInRTDB(targetId = null) {
  const now = Date.now();
  try {
    const list = await fetchAiIncidentsFromRTDB(80);
    const activeItems = list.filter(
      (item) => item.status === 'active' && (!targetId || item.id === targetId)
    );
    if (activeItems.length === 0) {
      return { resolvedCount: 0 };
    }

    const patchBody = {};
    for (const item of activeItems) {
      patchBody[`${item.id}/status`] = 'resolved';
      patchBody[`${item.id}/resolvedAt`] = now;
      patchBody[`${item.id}/resolvedBy`] = 'Rotana NOB';
    }

    await fetch(`${FIREBASE_DB_URL}/ai_incidents.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patchBody),
      signal: AbortSignal.timeout(4500)
    });

    return { resolvedCount: activeItems.length };
  } catch (e) {
    console.warn('[aiHealth] Failed to resolve incidents:', e?.message);
    return { resolvedCount: 0 };
  }
}

export async function clearResolvedAiIncidentsInRTDB() {
  try {
    const list = await fetchAiIncidentsFromRTDB(100);
    const toDelete = list.filter((item) => item.status !== 'active');
    if (toDelete.length === 0) return { deletedCount: 0 };

    const patchBody = {};
    for (const item of toDelete) {
      patchBody[item.id] = null;
    }

    await fetch(`${FIREBASE_DB_URL}/ai_incidents.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patchBody),
      signal: AbortSignal.timeout(4500)
    });

    return { deletedCount: toDelete.length };
  } catch (e) {
    console.warn('[aiHealth] Failed to clear resolved incidents:', e?.message);
    return { deletedCount: 0 };
  }
}

export async function recordSessionUnlockInRTDB(deviceId, durationMs = 30 * 60 * 1000) {
  const cleanId = sanitizeRtdbKey(deviceId);
  if (!cleanId) return null;
  const now = Date.now();
  const expiresAt = now + Math.max(60000, durationMs);
  const record = {
    deviceId: cleanId,
    unlockedAt: now,
    expiresAt
  };
  recentUnlockCache.set(cleanId, { ...record, cachedAt: now });

  try {
    await fetch(`${FIREBASE_DB_URL}/session_unlocks/${encodeURIComponent(cleanId)}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
      signal: AbortSignal.timeout(3500)
    });
  } catch (e) {
    console.warn('[aiHealth] Failed to persist session unlock:', e?.message);
  }
  return record;
}

export async function checkSessionUnlockFromRTDB(deviceId) {
  const cleanId = sanitizeRtdbKey(deviceId);
  if (!cleanId) return null;
  const now = Date.now();

  const cached = recentUnlockCache.get(cleanId);
  if (cached && now - cached.cachedAt < 2500) {
    return cached.expiresAt > now ? cached : null;
  }

  try {
    const res = await fetch(`${FIREBASE_DB_URL}/session_unlocks/${encodeURIComponent(cleanId)}.json`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(3000)
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.expiresAt || now >= data.expiresAt) {
      recentUnlockCache.delete(cleanId);
      return null;
    }
    const valid = {
      unlockedAt: Number(data.unlockedAt) || now,
      expiresAt: Number(data.expiresAt),
      cachedAt: now
    };
    recentUnlockCache.set(cleanId, valid);
    return valid;
  } catch {
    return null;
  }
}
