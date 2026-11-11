// app/utils/chatSessionLimit.js
// Client & Server Coordinated 30-Minute Live Chat Session & 10-Minute Cooldown Manager
// Enforces strict Anti-Bypass via combined localStorage + Persistent Cookie + Server Sync
// Features Idle/Away auto-reset so opening the app after being away NEVER falsely triggers cooldown!

export const SESSION_LIMIT_SECONDS = 30 * 60; // 30 minutes = 1800 seconds
export const COOLDOWN_SECONDS = 10 * 60;      // 10 minutes = 600 seconds

const STORAGE_KEY = 'setec_live_chat_session_v3';
const COOKIE_NAME = 'setec_live_chat_cooldown_v3';

// Helper to check if a user is the Creator Rotana NOB (Permanent 100% Exemption)
// STRICT: Only genuine Creator Master Key or active verified bypass grants exemption!
// A plain username containing 'rotana' is NEVER enough to bypass.
export function isCreatorUsername(name) {
  if (typeof window !== 'undefined') {
    try {
      const bypass = localStorage.getItem('troll_rotana_bypass');
      const isMasterAuth = localStorage.getItem('troll_rotana_master_authenticated');
      const masterPass = (localStorage.getItem('troll_rotana_master_passcode') || '').toLowerCase();
      if (isMasterAuth === 'true' || bypass === '1' || bypass === 'true') {
        return true;
      }
      if (
        masterPass &&
        (masterPass.includes('jak-sorl') ||
          masterPass.includes('jaksorl') ||
          masterPass.includes('rotana@supreme') ||
          masterPass.includes('rotana#setec'))
      ) {
        return true;
      }
    } catch {}
  }
  return false;
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
  document.cookie = `${name}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

const BYPASS_GRANT_COOKIE = 'setec_live_chat_bypass_v3';
const BYPASS_GRANT_KEY = 'setec_live_chat_bypass_grant_v3';

function getActiveBypassGrant(now = Date.now()) {
  if (typeof window === 'undefined') return null;
  let grant = null;
  try {
    const raw = localStorage.getItem(BYPASS_GRANT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.expiresAt && now < parsed.expiresAt) {
        grant = parsed;
      }
    }
  } catch {}

  if (!grant) {
    try {
      const rawCookie = getCookie(BYPASS_GRANT_COOKIE);
      if (rawCookie) {
        const [gStr, eStr] = rawCookie.split(':');
        const grantedAt = parseInt(gStr, 10);
        const expiresAt = parseInt(eStr, 10);
        if (!isNaN(grantedAt) && !isNaN(expiresAt) && now < expiresAt) {
          grant = { grantedAt, expiresAt };
        }
      }
    } catch {}
  }
  return grant;
}

// Immediately wipe cooldown and grant a fresh persistent 30-minute session across refreshes
export function grantFreshLiveSession(customUsername = '', durationMs = SESSION_LIMIT_SECONDS * 1000) {
  if (typeof window === 'undefined') return freshState();
  const now = Date.now();
  const safeDurationMs = Math.min(SESSION_LIMIT_SECONDS * 1000, Math.max(60000, durationMs));
  const expiresAt = now + safeDurationMs;

  clearLiveSession();
  setCookie(BYPASS_GRANT_COOKIE, `${now}:${expiresAt}`, Math.ceil(safeDurationMs / 1000) + 30);

  const fresh = {
    sessionStart: now,
    lastActive: now,
    cooldownUntil: null,
    grantedAt: now,
    bypassedUntil: expiresAt
  };
  try {
    localStorage.setItem(BYPASS_GRANT_KEY, JSON.stringify({ grantedAt: now, expiresAt }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    localStorage.removeItem('setec_server_cooldown_lock');
  } catch {}

  return {
    ...fresh,
    isLocked: false,
    remainingSessionSec: Math.ceil(safeDurationMs / 1000),
    remainingCooldownSec: 0
  };
}

// Complete session cleanup helper
export function clearLiveSession() {
  if (typeof window === 'undefined') return;
  removeCookie(COOKIE_NAME);
  removeCookie('setec_live_chat_cooldown_v2');
  removeCookie('setec_live_chat_cooldown_v1');
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('setec_server_cooldown_lock');
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

  // 2. Check localStorage & active bypass grant
  let stored = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) stored = JSON.parse(raw);
  } catch {}

  const activeBypass = getActiveBypassGrant(now);
  let sessionStart = stored?.sessionStart || null;
  let lastActive = stored?.lastActive || sessionStart || null;
  let cooldownUntil = stored?.cooldownUntil || null;

  // If user recently bypassed cooldown and a stale cooldown cookie survived, ignore stale lock within grant window
  if (activeBypass && now < activeBypass.expiresAt) {
    const withinSafeGrace = now - activeBypass.grantedAt < 25 * 60 * 1000;
    if (!sessionStart || sessionStart < activeBypass.grantedAt) {
      sessionStart = activeBypass.grantedAt;
      lastActive = Math.max(lastActive || 0, activeBypass.grantedAt);
    }
    if (cooldownUntil && (withinSafeGrace || !stored?.lockedAt || stored.lockedAt <= activeBypass.grantedAt + 15000)) {
      cooldownUntil = null;
      removeCookie(COOKIE_NAME);
    }
    if (cookieCooldown && (withinSafeGrace || !stored?.lockedAt || stored.lockedAt <= activeBypass.grantedAt + 15000)) {
      cookieCooldown = null;
      removeCookie(COOKIE_NAME);
    }
  }

  // Sync cookie with storage if cookie has active cooldown
  if (cookieCooldown) {
    if (!cooldownUntil) {
      cooldownUntil = cookieCooldown;
    } else {
      // Pick the earlier one so cooldown is never unfairly pushed back into the future!
      cooldownUntil = Math.min(cooldownUntil, cookieCooldown);
    }
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
      sessionStart: null,
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
    const sessionLimitMs = SESSION_LIMIT_SECONDS * 1000;
    const elapsedSinceActive = lastActive ? now - lastActive : 0;

    // INACTIVITY / AWAY AUTO-RESET (Evaluated BEFORE 30-min limit):
    // If user was away/inactive for >= 10 minutes (screen locked or switched to other apps),
    // they were NOT actively chatting! DO NOT penalize them with a 10-minute cooldown!
    // Instead, clear the idle session so they get a fresh session!
    if (elapsedSinceActive >= 10 * 60 * 1000) {
      clearLiveSession();
      return freshState();
    }

    // A) 30-minute session elapsed: Trigger 10-minute Cooldown Rest (ម៉ោងសម្រាក)!
    // Only triggers if user was actively engaged without being away
    if (elapsedSinceStart >= sessionLimitMs) {
      const safeCooldownUntil = now + COOLDOWN_SECONDS * 1000;
      setCookie(COOKIE_NAME, String(safeCooldownUntil), COOLDOWN_SECONDS + 60);
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            sessionStart: null,
            lastActive: now,
            cooldownUntil: safeCooldownUntil
          })
        );
      } catch {}
      return {
        sessionStart: null,
        lastActive: now,
        cooldownUntil: safeCooldownUntil,
        isLocked: true,
        remainingSessionSec: 0,
        remainingCooldownSec: COOLDOWN_SECONDS
      };
    }

    // C) SESSION STILL VALID: within 30 minutes and actively engaged
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

  // Session already running: keep sessionStart, update lastActive throttled to every 10s
  if (!state.lastActive || now - state.lastActive >= 10000) {
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
  }

  return {
    ...state,
    lastActive: now
  };
}

// Set cooldown lock directly from server response (Server-Enforced Lockout, clamped to 10 min max)
export function setServerCooldownLock(cooldownUntilMs, customUsername = '', serverLockedAtMs = null) {
  if (typeof window === 'undefined') return;
  if (isCreatorUsername(customUsername)) return; // Creator is never locked

  const now = Date.now();
  const activeBypass = getActiveBypassGrant(now);
  if (activeBypass && now < activeBypass.expiresAt) {
    // Only honor a server lock if the server created that lock well *after* this bypass grant was issued (or near end of 25+ min window)
    if (!serverLockedAtMs || serverLockedAtMs <= activeBypass.grantedAt + 15000 || now - activeBypass.grantedAt < 25 * 60 * 1000) {
      return;
    }
  }

  let safeUntil = cooldownUntilMs || (now + COOLDOWN_SECONDS * 1000);
  if (safeUntil - now > COOLDOWN_SECONDS * 1000) {
    safeUntil = now + COOLDOWN_SECONDS * 1000;
  }

  // Preserve earlier local cooldown if already active: NEVER push the timer backwards or extend it!
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const stored = JSON.parse(raw);
      if (stored?.cooldownUntil && stored.cooldownUntil > now && stored.cooldownUntil < safeUntil) {
        safeUntil = stored.cooldownUntil;
      }
    }
  } catch {}

  const remainingSec = Math.min(COOLDOWN_SECONDS, Math.max(1, Math.ceil((safeUntil - now) / 1000)));

  setCookie(COOKIE_NAME, String(safeUntil), remainingSec + 60);
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ sessionStart: null, lastActive: now, cooldownUntil: safeUntil, lockedAt: now })
    );
  } catch {}
}
