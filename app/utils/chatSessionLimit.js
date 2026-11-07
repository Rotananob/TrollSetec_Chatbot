// app/utils/chatSessionLimit.js
// Client & Server Coordinated 30-Minute Live Chat Session & 10-Minute Cooldown Manager
// Enforces strict Anti-Bypass via combined localStorage + Persistent Cookie + Server Sync
// Features Idle/Away auto-reset so opening the app after being away NEVER falsely triggers cooldown!

export const SESSION_LIMIT_SECONDS = 30 * 60; // 30 minutes = 1800 seconds
export const COOLDOWN_SECONDS = 10 * 60;      // 10 minutes = 600 seconds

const STORAGE_KEY = 'setec_live_chat_session_v3';
const COOKIE_NAME = 'setec_live_chat_cooldown_v3';

// Helper to check if a user is the Creator Rotana NOB (Permanent 100% Exemption)
export function isCreatorUsername(name) {
  if (typeof window !== 'undefined') {
    try {
      const stored = (localStorage.getItem('chatbot_username') || '').toLowerCase();
      const bypass = localStorage.getItem('troll_rotana_bypass');
      if (stored.includes('rotana') || bypass === '1' || bypass === 'true') {
        return true;
      }
    } catch {}
  }
  if (!name || typeof name !== 'string') return false;
  const clean = name.trim().toLowerCase();
  return (
    clean.includes('rotana') ||
    clean === 'rotana nob' ||
    clean === 'rotananob' ||
    clean === 'rotana_nob'
  );
}

// Format seconds into MM:SS
export function formatCountdown(totalSeconds) {
  if (isNaN(totalSeconds) || totalSeconds <= 0) return '00:00';
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Get cookie value
function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[1]) : null;
}

// Set cookie value with long expiration
function setCookie(name, value, maxAgeSeconds) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

// Clear cookie
function removeCookie(name) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

// Complete session cleanup helper
export function clearLiveSession() {
  if (typeof window === 'undefined') return;
  removeCookie(COOKIE_NAME);
  removeCookie('setec_live_chat_cooldown_v2');
  removeCookie('setec_live_chat_cooldown_v1');
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('setec_live_chat_session_v2');
    localStorage.removeItem('setec_live_chat_session_v1');
  } catch {}
}

function freshState() {
  return {
    sessionStart: null,
    lastActive: null,
    cooldownUntil: null,
    isLocked: false,
    remainingSessionSec: SESSION_LIMIT_SECONDS,
    remainingCooldownSec: 0
  };
}

// Get current live chat session & cooldown state
export function getLiveSessionState() {
  if (typeof window === 'undefined') {
    return freshState();
  }

  // Creator Rotana NOB is ALWAYS 100% exempt from any lockout
  if (isCreatorUsername()) {
    return {
      sessionStart: Date.now(),
      lastActive: Date.now(),
      cooldownUntil: null,
      isLocked: false,
      isCreator: true,
      remainingSessionSec: SESSION_LIMIT_SECONDS,
      remainingCooldownSec: 0
    };
  }

  const now = Date.now();

  // Clean up legacy v1 and v2 keys from earlier sessions to immediately clear false locks
  try {
    removeCookie('setec_live_chat_cooldown_v1');
    removeCookie('setec_live_chat_cooldown_v2');
    localStorage.removeItem('setec_live_chat_session_v1');
    localStorage.removeItem('setec_live_chat_session_v2');
  } catch {}

  // 1. Check persistent cookie first (Anti-Bypass: persists even if localStorage is cleared)
  let cookieCooldown = null;
  try {
    const rawCookie = getCookie(COOKIE_NAME);
    if (rawCookie) {
      const parsed = parseInt(rawCookie, 10);
      if (!isNaN(parsed) && parsed > now) {
        cookieCooldown = parsed;
      }
    }
  } catch {}

  // 2. Check localStorage
  let stored = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) stored = JSON.parse(raw);
  } catch {}

  let sessionStart = stored?.sessionStart || null;
  let lastActive = stored?.lastActive || sessionStart || null;
  let cooldownUntil = stored?.cooldownUntil || null;

  // Sync cookie with storage if cookie has active cooldown
  if (cookieCooldown && (!cooldownUntil || cookieCooldown > cooldownUntil)) {
    cooldownUntil = cookieCooldown;
  }

  // Hard clamp cooldown to strict 10 minutes maximum (COOLDOWN_SECONDS)
  if (cooldownUntil && cooldownUntil - now > COOLDOWN_SECONDS * 1000) {
    cooldownUntil = now + COOLDOWN_SECONDS * 1000;
  }

  // 3. Cooldown Active Check: Is user legitimately in the 10-minute cooldown?
  if (cooldownUntil && now < cooldownUntil) {
    const remainingCooldownSec = Math.min(
      COOLDOWN_SECONDS,
      Math.max(1, Math.ceil((cooldownUntil - now) / 1000))
    );
    // Ensure cookie is synced
    setCookie(COOKIE_NAME, String(cooldownUntil), remainingCooldownSec + 60);
    return {
      sessionStart,
      lastActive,
      cooldownUntil,
      isLocked: true,
      remainingSessionSec: 0,
      remainingCooldownSec
    };
  }

  // 4. Cooldown Expired: If cooldown was active and has now elapsed, reset completely!
  if (cooldownUntil && now >= cooldownUntil) {
    clearLiveSession();
    return freshState();
  }

  // 5. Active Session Time Check
  if (sessionStart) {
    const elapsedSinceStart = now - sessionStart;
    const elapsedSinceActive = lastActive ? now - lastActive : 0;

    // A) INACTIVITY CHECK: If user was away/inactive for >= 2 minutes (120s),
    // or if >= 30 minutes elapsed since session began without an active lockout,
    // they were not chatting continuously — reset to a fresh session immediately!
    const sessionLimitMs = SESSION_LIMIT_SECONDS * 1000;
    if (
      elapsedSinceActive >= 2 * 60 * 1000 ||
      elapsedSinceStart >= sessionLimitMs
    ) {
      clearLiveSession();
      return freshState();
    }

    // B) SESSION STILL VALID: within 30 minutes and actively engaged
    const remainingSessionSec = Math.max(0, Math.ceil((sessionLimitMs - elapsedSinceStart) / 1000));
    return {
      sessionStart,
      lastActive,
      cooldownUntil: null,
      isLocked: false,
      remainingSessionSec,
      remainingCooldownSec: 0
    };
  }

  // 6. Fresh session not yet started
  return freshState();
}

// Start or touch active live chat session (called when user enters chat or types message)
export function touchLiveSession(customUsername = '') {
  if (typeof window === 'undefined') return freshState();

  if (isCreatorUsername(customUsername)) {
    return {
      sessionStart: Date.now(),
      lastActive: Date.now(),
      cooldownUntil: null,
      isLocked: false,
      isCreator: true,
      remainingSessionSec: SESSION_LIMIT_SECONDS,
      remainingCooldownSec: 0
    };
  }

  const state = getLiveSessionState();
  if (state.isLocked) return state;

  const now = Date.now();
  if (!state.sessionStart) {
    const newState = {
      sessionStart: now,
      lastActive: now,
      cooldownUntil: null
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    } catch {}
    return {
      ...newState,
      isLocked: false,
      remainingSessionSec: SESSION_LIMIT_SECONDS,
      remainingCooldownSec: 0
    };
  }

  // Session already running: keep sessionStart, update lastActive
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        sessionStart: state.sessionStart,
        lastActive: now,
        cooldownUntil: null
      })
    );
  } catch {}

  return {
    ...state,
    lastActive: now
  };
}

// Set cooldown lock directly from server response (Server-Enforced Lockout, clamped to 10 min max)
export function setServerCooldownLock(cooldownUntilMs, customUsername = '') {
  if (typeof window === 'undefined') return;
  if (isCreatorUsername(customUsername)) return; // Creator is never locked

  const now = Date.now();
  let safeUntil = cooldownUntilMs || (now + COOLDOWN_SECONDS * 1000);
  if (safeUntil - now > COOLDOWN_SECONDS * 1000) {
    safeUntil = now + COOLDOWN_SECONDS * 1000;
  }
  const remainingSec = Math.min(COOLDOWN_SECONDS, Math.max(1, Math.ceil((safeUntil - now) / 1000)));

  setCookie(COOKIE_NAME, String(safeUntil), remainingSec + 60);
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ sessionStart: null, lastActive: now, cooldownUntil: safeUntil })
    );
  } catch {}
}
