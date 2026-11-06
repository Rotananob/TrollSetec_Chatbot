// app/utils/realtimeChat.js
// Firebase Realtime Database Live Support & Rotana NOB Encrypted Direct Bypass System

const FIREBASE_DB_URL = 'https://troll-setec-chatbot-default-rtdb.asia-southeast1.firebasedatabase.app';
const BYPASS_SALT = 'rotana_nob_master_secret_key_2026_setec';

// Simple deterministic signature helper for browser/server parity
function generateSignature(sessionId, bot, ts) {
  const raw = `${sessionId}|${bot}|${ts}|${BYPASS_SALT}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

// Generate Encrypted Bypass Token (ONLY allowed upon user-initiated alert)
export function generateBypassToken(sessionId, bot) {
  const ts = Date.now();
  const sig = generateSignature(sessionId, bot, ts);
  const payload = {
    s: sessionId,
    b: bot,
    t: ts,
    sig
  };
  return btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Validate Encrypted Bypass Token (Strict 1-1 Protocol)
export function validateBypassToken(sessionId, bot, token) {
  if (!token) return false;
  try {
    let base64 = token.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    const parsed = JSON.parse(atob(base64));

    if (parsed.s !== sessionId) return false;
    // Allow up to 48 hours for Rotana to intervene
    if (Date.now() - parsed.t > 48 * 60 * 60 * 1000) return false;

    const expectedSig = generateSignature(sessionId, bot || parsed.b, parsed.t);
    return parsed.sig === expectedSig;
  } catch {
    return false;
  }
}

// 1. Initialize Live Intervention Session in Firebase Realtime Database
export async function initLiveSessionOnDatabase(sessionId, { username, bot, issue, messages, token }) {
  try {
    const url = `${FIREBASE_DB_URL}/live_sessions/${encodeURIComponent(sessionId)}.json`;
    const initialLog = {
      id: 'log_' + Date.now(),
      type: 'alert_sent',
      text: `User "${username || 'User'}" បានចុច Send Alert ទៅកាន់បង Rotana NOB រួចរាល់។ កំពុងរង់ចាំ (180 វិនាទី)...`,
      timestamp: Date.now()
    };

    const payload = {
      sessionId,
      username: username || 'User',
      bot: bot || 'konpov',
      issue: issue || '',
      alertActive: true,
      botPaused: false,
      rotanaActive: false,
      countdownStartedAt: Date.now(),
      status: 'waiting', // 'waiting' (yellow) | 'active' (green) | 'timeout' | 'ended'
      createdAt: Date.now(),
      updatedAt: Date.now(),
      bypassToken: token,
      messages: Array.isArray(messages) ? messages.slice(-20) : [],
      logs: [initialLog]
    };

    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return res.ok;
  } catch (err) {
    console.error('[RealtimeChat] Init session error:', err);
    return false;
  }
}

// 2. Fetch Active Session
export async function getLiveSession(sessionId) {
  if (!sessionId) return null;
  try {
    const url = `${FIREBASE_DB_URL}/live_sessions/${encodeURIComponent(sessionId)}.json`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// 3. Update Session State (e.g. Rotana activates, pauses bot, or ends session)
export async function updateLiveSessionState(sessionId, patchData) {
  if (!sessionId) return false;
  try {
    const url = `${FIREBASE_DB_URL}/live_sessions/${encodeURIComponent(sessionId)}.json`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...patchData,
        updatedAt: Date.now()
      })
    });
    return res.ok;
  } catch {
    return false;
  }
}

// 4. Append In-Chat Action Log (e.g. Rotana entered, paused AI, resumed AI, or left)
export async function addSessionLog(sessionId, text, type = 'info') {
  if (!sessionId || !text) return false;
  try {
    const url = `${FIREBASE_DB_URL}/live_sessions/${encodeURIComponent(sessionId)}/logs.json`;
    const logItem = {
      id: 'log_' + Date.now(),
      type,
      text,
      timestamp: Date.now()
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logItem)
    });
    return res.ok;
  } catch {
    return false;
  }
}

// 5. Send a Message into the Live Session (Used by Rotana or User)
export async function sendLiveMessage(sessionId, message) {
  if (!sessionId || !message) return false;
  try {
    const url = `${FIREBASE_DB_URL}/live_sessions/${encodeURIComponent(sessionId)}/messages.json`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...message,
        timestamp: Date.now()
      })
    });
    return res.ok;
  } catch {
    return false;
  }
}

// 6. Realtime Subscription via Server-Sent Events (SSE / EventSource)
export function subscribeToLiveSession(sessionId, onUpdate) {
  if (typeof window === 'undefined' || !window.EventSource || !sessionId) {
    return () => {};
  }

  const url = `${FIREBASE_DB_URL}/live_sessions/${encodeURIComponent(sessionId)}.json`;
  let eventSource = null;
  let pollingInterval = null;
  let isClosed = false;
  let sessionState = {};

  const handleUpdate = (updatedObj) => {
    if (isClosed || !updatedObj) return;
    sessionState = { ...sessionState, ...updatedObj };
    onUpdate(sessionState);
  };

  try {
    eventSource = new EventSource(url);

    eventSource.addEventListener('put', (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (isClosed) return;
        if (payload?.path === '/') {
          if (payload.data && typeof payload.data === 'object') {
            sessionState = payload.data;
            onUpdate(sessionState);
          }
        } else if (payload?.path) {
          const cleanKey = payload.path.replace(/^\//, '');
          if (cleanKey === 'botPaused') {
            sessionState.botPaused = payload.data;
          } else if (cleanKey === 'rotanaActive') {
            sessionState.rotanaActive = payload.data;
          } else if (cleanKey.startsWith('messages') || cleanKey.startsWith('logs')) {
            getLiveSession(sessionId).then((s) => {
              if (s && !isClosed) {
                sessionState = s;
                onUpdate(sessionState);
              }
            });
            return;
          } else {
            sessionState[cleanKey] = payload.data;
          }
          onUpdate(sessionState);
        }
      } catch {}
    });

    eventSource.addEventListener('patch', (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload?.data && !isClosed) {
          handleUpdate(payload.data);
        }
      } catch {}
    });

    eventSource.onerror = () => {
      if (!pollingInterval && !isClosed) {
        pollingInterval = setInterval(async () => {
          if (isClosed) return;
          const session = await getLiveSession(sessionId);
          if (session && !isClosed) {
            sessionState = session;
            onUpdate(session);
          }
        }, 2000);
      }
    };
  } catch {
    pollingInterval = setInterval(async () => {
      if (isClosed) return;
      const session = await getLiveSession(sessionId);
      if (session && !isClosed) {
        sessionState = session;
        onUpdate(session);
      }
    }, 2000);
  }

  // Initial fetch for instant display
  getLiveSession(sessionId).then((session) => {
    if (session && !isClosed) {
      sessionState = session;
      onUpdate(session);
    }
  });

  return () => {
    isClosed = true;
    if (eventSource) {
      try {
        eventSource.close();
      } catch {}
    }
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
  };
}

// 7. REAL-TIME DATABASE CHAT STORAGE (STRICTLY NO LOCALSTORAGE FOR CHAT SESSIONS)
export async function saveChatSessionToDatabase(deviceId, bot, session) {
  if (!deviceId || !bot || !session?.id) return false;
  try {
    // Sanitize session to prevent clogging / lag: limit stored messages to last 40 items per session
    const cleanSession = {
      id: session.id,
      title: session.title || 'Chat',
      createdAt: session.createdAt || new Date().toISOString(),
      updatedAt: Date.now(),
      messages: Array.isArray(session.messages)
        ? session.messages.slice(-40).map((m) => ({
            role: m.role || 'user',
            text: m.text || '',
            author: m.author || undefined,
            memeImage: m.memeImage || undefined,
            image: m.image ? (m.image.length > 500000 ? '[រូបភាពធំ]' : m.image) : undefined,
            timestamp: m.timestamp || Date.now()
          }))
        : []
    };

    const url = `${FIREBASE_DB_URL}/chat_sessions/${encodeURIComponent(deviceId)}/${encodeURIComponent(bot)}/${encodeURIComponent(session.id)}.json`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanSession)
    });
    return res.ok;
  } catch (e) {
    console.warn('[RealtimeChat] saveChatSession error:', e);
    return false;
  }
}

export async function loadChatSessionsFromDatabase(deviceId, bot) {
  if (!deviceId || !bot) return [];
  try {
    const url = `${FIREBASE_DB_URL}/chat_sessions/${encodeURIComponent(deviceId)}/${encodeURIComponent(bot)}.json`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data || typeof data !== 'object') return [];

    const list = Object.values(data).filter((s) => s && s.id);
    // Sort descending by createdAt
    list.sort((a, b) => {
      const ta = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const tb = new Date(b.createdAt || b.updatedAt || 0).getTime();
      return tb - ta;
    });
    return list;
  } catch (e) {
    console.warn('[RealtimeChat] loadChatSessions error:', e);
    return [];
  }
}

export async function deleteChatSessionFromDatabase(deviceId, bot, sessionId) {
  if (!deviceId || !bot || !sessionId) return false;
  try {
    const url = `${FIREBASE_DB_URL}/chat_sessions/${encodeURIComponent(deviceId)}/${encodeURIComponent(bot)}/${encodeURIComponent(sessionId)}.json`;
    const res = await fetch(url, { method: 'DELETE' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteAllChatSessionsFromDatabase(deviceId, bot) {
  if (!deviceId || !bot) return false;
  try {
    const url = `${FIREBASE_DB_URL}/chat_sessions/${encodeURIComponent(deviceId)}/${encodeURIComponent(bot)}.json`;
    const res = await fetch(url, { method: 'DELETE' });
    return res.ok;
  } catch {
    return false;
  }
}
