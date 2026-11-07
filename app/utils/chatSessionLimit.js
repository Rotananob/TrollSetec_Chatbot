// app/utils/chatSessionLimit.js
// Client & Server Coordinated 30-Minute Live Chat Session & 10-Minute Cooldown Manager
// Enforces strict Anti-Bypass via combined localStorage + Persistent Cookie + Server Sync

export const SESSION_LIMIT_SECONDS = 30 * 60; // 30 minutes = 1800 seconds
export const COOLDOWN_SECONDS = 10 * 60;      // 10 minutes = 600 seconds

const STORAGE_KEY = 'setec_live_chat_session_v2';
const COOKIE_NAME = 'setec_live_chat_cooldown_v2';

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

// Get current live chat session & cooldown state
export function getLiveSessionState() {
  if (typeof window === 'undefined') {
    return {
      sessionStart: null,
      cooldownUntil: null,
      isLocked: false,
      remainingSessionSec: SESSION_LIMIT_SECONDS,
      remainingCooldownSec: 0
    };
  }

  const now = Date.now();

  // Clean up legacy v1 keys from previous 20-minute config if present
  try {
    removeCookie('setec_live_chat_cooldown_v1');
    localStorage.removeItem('setec_live_chat_session_v1');
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
  let cooldownUntil = stored?.cooldownUntil || null;

  // Sync cookie with storage if cookie has active cooldown
  if (cookieCooldown && (!cooldownUntil || cookieCooldown > cooldownUntil)) {
    cooldownUntil = cookieCooldown;
  }

  // Hard clamp cooldown to strict 10 minutes maximum (COOLDOWN_SECONDS)
  if (cooldownUntil && cooldownUntil - now > COOLDOWN_SECONDS * 1000) {
    cooldownUntil = now + COOLDOWN_SECONDS * 1000;
  }

  // 3. Cooldown Active Check
  if (cooldownUntil && now < cooldownUntil) {
    const remainingCooldownSec = Math.min(
      COOLDOWN_SECONDS,
      Math.max(1, Math.ceil((cooldownUntil - now) / 1000))
    );
    // Ensure cookie is synced
    setCookie(COOKIE_NAME, String(cooldownUntil), remainingCooldownSec + 60);
    return {
      sessionStart,
      cooldownUntil,
      isLocked: true,
      remainingSessionSec: 0,
      remainingCooldownSec
    };
  }

  // 4. Cooldown Expired: Reset and allow new session
  if (cooldownUntil && now >= cooldownUntil) {
    cooldownUntil = null;
    sessionStart = null;
    removeCookie(COOKIE_NAME);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    return {
      sessionStart: null,
      cooldownUntil: null,
      isLocked: false,
      remainingSessionSec: SESSION_LIMIT_SECONDS,
      remainingCooldownSec: 0
    };
  }

  // 5. Active Session Time Check
  if (sessionStart) {
    const elapsedMs = now - sessionStart;
    const sessionLimitMs = SESSION_LIMIT_SECONDS * 1000;

    if (elapsedMs >= sessionLimitMs) {
      // 30-minute session expired! Trigger 10-minute cooldown immediately
      const newCooldownUntil = now + COOLDOWN_SECONDS * 1000;
      setCookie(COOKIE_NAME, String(newCooldownUntil), COOLDOWN_SECONDS + 60);
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ sessionStart, cooldownUntil: newCooldownUntil })
        );
      } catch {}

      return {
        sessionStart,
        cooldownUntil: newCooldownUntil,
        isLocked: true,
        remainingSessionSec: 0,
        remainingCooldownSec: COOLDOWN_SECONDS
      };
    }

    const remainingSessionSec = Math.max(0, Math.ceil((sessionLimitMs - elapsedMs) / 1000));
    return {
      sessionStart,
      cooldownUntil: null,
      isLocked: false,
      remainingSessionSec,
      remainingCooldownSec: 0
    };
  }

  // Fresh session not yet started
  return {
    sessionStart: null,
    cooldownUntil: null,
    isLocked: false,
    remainingSessionSec: SESSION_LIMIT_SECONDS,
    remainingCooldownSec: 0
  };
}

// Start or touch active live chat session (called when user enters chat or types message)
export function touchLiveSession() {
  if (typeof window === 'undefined') return getLiveSessionState();

  const state = getLiveSessionState();
  if (state.isLocked) return state;

  const now = Date.now();
  if (!state.sessionStart) {
    const newState = {
      sessionStart: now,
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

  return state;
}

// Set cooldown lock directly from server response (Server-Enforced Lockout, clamped to 10 min max)
export function setServerCooldownLock(cooldownUntilMs) {
  if (typeof window === 'undefined') return;
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
      JSON.stringify({ sessionStart: null, cooldownUntil: safeUntil })
    );
  } catch {}
}
