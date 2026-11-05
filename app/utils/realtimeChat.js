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

// Validate Encrypted Bypass Token
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
    const payload = {
      sessionId,
      username: username || 'User',
      bot: bot || 'konpov',
      issue: issue || '',
      alertActive: true,
      botPaused: false,
      rotanaActive: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      bypassToken: token,
      messages: Array.isArray(messages) ? messages.slice(-15) : []
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

// 4. Send a Message into the Live Session (Used by Rotana or User)
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

// 5. Realtime Subscription via Server-Sent Events (SSE / EventSource)
// Native browser support with zero dependencies and instant synchronization
export function subscribeToLiveSession(sessionId, onUpdate) {
  if (typeof window === 'undefined' || !window.EventSource || !sessionId) {
    return () => {};
  }

  const url = `${FIREBASE_DB_URL}/live_sessions/${encodeURIComponent(sessionId)}.json`;
  let eventSource = null;
  let pollingInterval = null;
  let isClosed = false;

  try {
    eventSource = new EventSource(url);

    eventSource.addEventListener('put', (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload?.data && !isClosed) {
          onUpdate(payload.data);
        }
      } catch {}
    });

    eventSource.addEventListener('patch', (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload?.data && !isClosed) {
          onUpdate(payload.data);
        }
      } catch {}
    });

    eventSource.onerror = () => {
      // If SSE disconnects, fall back to lightweight polling every 2.5s
      if (!pollingInterval && !isClosed) {
        pollingInterval = setInterval(async () => {
          if (isClosed) return;
          const session = await getLiveSession(sessionId);
          if (session && !isClosed) onUpdate(session);
        }, 2500);
      }
    };
  } catch {
    // Immediate fallback to polling
    pollingInterval = setInterval(async () => {
      if (isClosed) return;
      const session = await getLiveSession(sessionId);
      if (session && !isClosed) onUpdate(session);
    }, 2500);
  }

  // Initial fetch for instant display
  getLiveSession(sessionId).then((session) => {
    if (session && !isClosed) onUpdate(session);
  });

  // Cleanup unsubscriber
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
