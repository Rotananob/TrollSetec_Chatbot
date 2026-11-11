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

export function getLastHealthResetAt() {
  return lastHealthResetAt;
}

export function syncAiHealthWithRemoteReset(remoteResetAt = 0) {
  const ts = Number(remoteResetAt) || 0;
  if (ts > lastHealthResetAt) {
    keyCooldownMap.clear();
    ttsKeyCooldownMap.clear();
    lastHealthResetAt = ts;
    return true;
  }
  return false;
}

export function getApiKeysHealthSummary() {
  const now = Date.now();
  const configured = getAllConfiguredGeminiKeys();
  let ttsCoolingCount = 0;
  const keys = configured.map((item, idx) => {
    const textExpiry = keyCooldownMap.get(item.key) || 0;
    const ttsExpiry = ttsKeyCooldownMap.get(item.key) || 0;
    if (textExpiry && now > textExpiry) keyCooldownMap.delete(item.key);
    if (ttsExpiry && now > ttsExpiry) ttsKeyCooldownMap.delete(item.key);

    const textCooldownSec = textExpiry > now ? Math.ceil((textExpiry - now) / 1000) : 0;
    const ttsCooldownSec = ttsExpiry > now ? Math.ceil((ttsExpiry - now) / 1000) : 0;
    if (ttsCooldownSec > 0) ttsCoolingCount += 1;
    const masked =
      item.key.length > 10
        ? `${item.key.slice(0, 6)}...${item.key.slice(-4)}`
        : '***';

    return {
      index: idx + 1,
      slot: item.slot,
      label: `Gemini Key ${idx + 1} • ${item.slot}`,
      masked,
      healthy: textCooldownSec === 0,
      coolingDown: textCooldownSec > 0,
      remainingSec: textCooldownSec,
      textCooldownSec,
      ttsCooldownSec
    };
  });

  const healthyCount = keys.filter((k) => k.healthy).length;
  const exhaustedCount = keys.length - healthyCount;
  return {
    totalKeys: keys.length,
    healthyCount,
    readyCount: healthyCount,
    coolingCount: exhaustedCount,
    exhaustedCount,
    ttsCoolingCount,
    lastHealthResetAt,
    lastIncidentTimestamp,
    keys,
    keyHealth: keys
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

export function resetSingleKeyCooldown(keyIndex) {
  const configured = getAllConfiguredGeminiKeys();
  const idx = Number(keyIndex) - 1;
  if (idx >= 0 && idx < configured.length) {
    const item = configured[idx];
    const hadText = keyCooldownMap.delete(item.key);
    const hadTts = ttsKeyCooldownMap.delete(item.key);
    lastHealthResetAt = Date.now();
    return {
      ok: true,
      keyIndex: idx + 1,
      slot: item.slot,
      cleared: hadText || hadTts
    };
  }
  return { ok: false, error: 'Invalid key index' };
}

export async function testSingleGeminiKey(keyIndex, timeoutMs = 8000) {
  const configured = getAllConfiguredGeminiKeys();
  const idx = Number(keyIndex) - 1;
  if (idx < 0 || idx >= configured.length) {
    return { ok: false, error: 'Invalid key index' };
  }
  const item = configured[idx];
  const start = Date.now();
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${item.key}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
        generationConfig: { maxOutputTokens: 2 }
      }),
      signal: AbortSignal.timeout(timeoutMs)
    });
    const latencyMs = Date.now() - start;
    if (res.ok) {
      keyCooldownMap.delete(item.key);
      return {
        ok: true,
        keyIndex: idx + 1,
        slot: item.slot,
        status: 200,
        latencyMs
      };
    }
    const errJson = await res.json().catch(() => ({}));
    return {
      ok: false,
      keyIndex: idx + 1,
      slot: item.slot,
      status: res.status,
      latencyMs,
      error: errJson?.error?.message || `HTTP ${res.status}`
    };
  } catch (err) {
    return {
      ok: false,
      keyIndex: idx + 1,
      slot: item.slot,
      status: 0,
      latencyMs: Date.now() - start,
      error: err.message
    };
  }
}

export async function testAllGeminiKeys(timeoutMs = 8000) {
  const configured = getAllConfiguredGeminiKeys();
  const promises = configured.map((_, i) => testSingleGeminiKey(i + 1, timeoutMs));
  const results = await Promise.all(promises);
  return results;
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

function extractUnlockKeys(identifiers) {
  const keys = new Set();
  if (typeof identifiers === 'string') {
    const clean = sanitizeRtdbKey(identifiers);
    if (clean) keys.add(clean);
  } else if (identifiers && typeof identifiers === 'object') {
    const dev = sanitizeRtdbKey(identifiers.deviceId || '');
    const usr = sanitizeRtdbKey((identifiers.username || '').trim().toLowerCase());
    const ip = sanitizeRtdbKey(identifiers.ip || '');
    if (dev) {
      keys.add(dev);
      keys.add(`dev_${dev}`);
    }
    if (usr && usr !== 'user' && usr !== 'unknown') {
      keys.add(`usr_${usr}`);
    }
    if (ip && ip !== '127_0_0_1' && ip !== 'unknown-ip') {
      keys.add(`ip_${ip}`);
    }
  }
  return Array.from(keys);
}

export async function recordSessionUnlockInRTDB(identifiers, durationMs = 30 * 60 * 1000) {
  const targetKeys = extractUnlockKeys(identifiers);
  if (targetKeys.length === 0) return null;
  const now = Date.now();
  const expiresAt = now + Math.max(60000, durationMs);
  const record = {
    deviceId: targetKeys[0],
    unlockedAt: now,
    expiresAt
  };

  for (const key of targetKeys) {
    recentUnlockCache.set(key, { ...record, cachedAt: now });
  }

  try {
    await Promise.allSettled(
      targetKeys.map((key) =>
        fetch(`${FIREBASE_DB_URL}/session_unlocks/${encodeURIComponent(key)}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record),
          signal: AbortSignal.timeout(3500)
        })
      )
    );
  } catch (e) {
    console.warn('[aiHealth] Failed to persist session unlock:', e?.message);
  }
  return record;
}

export async function checkSessionUnlockFromRTDB(identifiers) {
  const targetKeys = extractUnlockKeys(identifiers);
  if (targetKeys.length === 0) return null;
  const now = Date.now();

  for (const key of targetKeys) {
    const cached = recentUnlockCache.get(key);
    if (cached && now - cached.cachedAt < 2500) {
      if (cached.expiresAt > now) return cached;
    }
  }

  try {
    const results = await Promise.allSettled(
      targetKeys.map(async (key) => {
        const res = await fetch(`${FIREBASE_DB_URL}/session_unlocks/${encodeURIComponent(key)}.json`, {
          cache: 'no-store',
          signal: AbortSignal.timeout(3000)
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (!data || !data.expiresAt || now >= data.expiresAt) {
          recentUnlockCache.delete(key);
          return null;
        }
        const valid = {
          unlockedAt: Number(data.unlockedAt) || now,
          expiresAt: Number(data.expiresAt),
          cachedAt: now
        };
        recentUnlockCache.set(key, valid);
        return valid;
      })
    );

    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        return r.value;
      }
    }
    return null;
  } catch {
    return null;
  }
}
