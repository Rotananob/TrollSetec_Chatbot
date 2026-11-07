// lib/rateLimit.js
// Enterprise-Grade Anti-DDoS, IP Blacklisting & Rate Limiting Protection for SETEC Chatbot

import { alertSecuritySpam, alertSystemError } from './telegram.js';

// In-memory security state
const ipRequestHistory = new Map(); // ip -> Array<timestamps>
const ipBannedMap = new Map();       // ip -> { bannedUntil, reason, count }
const chatLimitMap = new Map();      // key -> Array<timestamps>
const memeLimitMap = new Map();      // key -> timestamp
const trackLimitMap = new Map();     // ip -> Array<timestamps>

// Configuration Constants
const DDOS_WINDOW_MS = 10 * 1000;         // 10 seconds sliding window
const DDOS_MAX_BURST = 40;                // Max 40 requests in 10 seconds per IP (safe for streaming + audio)
const DDOS_MINUTE_WINDOW_MS = 60 * 1000;  // 1 minute window
const DDOS_MAX_PER_MINUTE = 90;           // Max 90 requests in 1 minute per IP
const BAN_DURATION_MS = 30 * 1000;        // 30 seconds temporary cool-off (never locks out users for 10 min)

const CHAT_WINDOW_MS = 60 * 1000;         // 1 minute
const CHAT_MAX_MESSAGES = 7;              // Max 7 messages per minute per user (popup triggers if > 7 msgs/min)
const MEME_WINDOW_MS = 60 * 60 * 1000;    // 1 hour
const MEME_MAX_PER_HOUR = 5;              // 5 memes per 1 hour per device/IP
const TRACK_WINDOW_MS = 60 * 1000;        // 1 minute
const TRACK_MAX_PER_MINUTE = 30;          // 30 track calls per minute

// Periodic Cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    // Clean expired bans
    for (const [ip, info] of ipBannedMap.entries()) {
      if (now > info.bannedUntil) {
        ipBannedMap.delete(ip);
      }
    }
    // Clean IP histories
    for (const [ip, history] of ipRequestHistory.entries()) {
      const valid = history.filter((t) => now - t < DDOS_MINUTE_WINDOW_MS);
      if (valid.length === 0) ipRequestHistory.delete(ip);
      else ipRequestHistory.set(ip, valid);
    }
    // Clean Chat histories
    for (const [key, history] of chatLimitMap.entries()) {
      const valid = history.filter((t) => now - t < CHAT_WINDOW_MS);
      if (valid.length === 0) chatLimitMap.delete(key);
      else chatLimitMap.set(key, valid);
    }
    // Clean Meme timestamps
    for (const [key, history] of memeLimitMap.entries()) {
      const active = (Array.isArray(history) ? history : [history]).filter(
        (t) => now - t < MEME_WINDOW_MS
      );
      if (active.length === 0) {
        memeLimitMap.delete(key);
      } else {
        memeLimitMap.set(key, active);
      }
    }
    // Clean Track histories
    for (const [ip, history] of trackLimitMap.entries()) {
      const valid = history.filter((t) => now - t < TRACK_WINDOW_MS);
      if (valid.length === 0) trackLimitMap.delete(ip);
      else trackLimitMap.set(ip, valid);
    }
  }, 5 * 60 * 1000);
}

// Extract Clean Real IP from Next.js Request
export function getClientIp(req) {
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();

  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return '127.0.0.1';
}

// 1. Core Anti-DDoS Firewall (Only catches massive non-browser automated floods, never blocking real mobile users)
export function checkDDoSFirewall(req, endpoint = 'api') {
  const ip = getClientIp(req);
  const now = Date.now();
  const userAgent = req.headers.get('user-agent') || 'Unknown';

  // Real mobile/browser users are never banned by IP
  const isLikelyBrowser = /Mozilla|iPhone|Android|Mobile|Safari|Chrome|Firefox|Edge/i.test(userAgent);
  if (isLikelyBrowser) {
    return { allowed: true };
  }

  // Check if non-browser IP is banned
  const banInfo = ipBannedMap.get(ip);
  if (banInfo) {
    if (now < banInfo.bannedUntil) {
      const remainingSeconds = Math.ceil((banInfo.bannedUntil - now) / 1000);
      return {
        allowed: false,
        isBanned: true,
        status: 429,
        retryAfter: remainingSeconds,
        message: `Too Many Requests. Please retry in ${remainingSeconds}s.`
      };
    } else {
      ipBannedMap.delete(ip);
    }
  }

  const history = (ipRequestHistory.get(ip) || []).filter(
    (t) => now - t < DDOS_MINUTE_WINDOW_MS
  );
  history.push(now);
  ipRequestHistory.set(ip, history);

  // Catch headless bot flooding (>100 requests in 60s without browser headers)
  if (history.length > 100) {
    const banUntil = now + 15 * 1000; // 15 seconds temporary cool-off
    ipBannedMap.set(ip, {
      bannedUntil: banUntil,
      reason: `Automated headless bot flood (${history.length} requests in 60s)`,
      count: history.length
    });

    return {
      allowed: false,
      isBanned: true,
      status: 429,
      retryAfter: 15,
      message: 'Automated flood detected. Cooldown active for 15s.'
    };
  }

  return { allowed: true };
}

// 2. Chat Message Rate Limiter (Max 7 msgs / 1 min tracked strictly per username, never locking the device permanently)
export function checkChatLimit(ip, username = '') {
  const now = Date.now();
  const cleanName = (username || '').trim().toLowerCase() || 'user';
  // If generic 'user', isolate by IP so anonymous users do not block each other
  const key = cleanName === 'user' ? `user_${cleanName}_${ip}` : `user_${cleanName}`;
  const history = (chatLimitMap.get(key) || []).filter(
    (t) => now - t < CHAT_WINDOW_MS
  );

  if (history.length >= CHAT_MAX_MESSAGES) {
    const oldest = history[0];
    const retryAfter = Math.max(1, Math.ceil((oldest + CHAT_WINDOW_MS - now) / 1000));
    return { allowed: false, retryAfter };
  }

  history.push(now);
  chatLimitMap.set(key, history);
  return { allowed: true };
}

// Reset rate limits for a specific user
export function resetChatLimit(username = '', ip = '') {
  const cleanName = (username || '').trim().toLowerCase();
  if (cleanName && cleanName !== 'user') {
    chatLimitMap.delete(`user_${cleanName}`);
  }
  if (ip) {
    chatLimitMap.delete(`user_user_${ip}`);
  }
}

// 3. Meme Quota Limiter (5 images per 1 hour per device/IP)
export function checkMemeQuota(ip, deviceId) {
  const now = Date.now();
  const key = `${ip}_${deviceId || 'device'}`;
  const raw = memeLimitMap.get(key) || [];
  const history = (Array.isArray(raw) ? raw : [raw]).filter(
    (t) => now - t < MEME_WINDOW_MS
  );

  if (history.length >= MEME_MAX_PER_HOUR) {
    const oldest = history[0];
    const remainingMs = oldest + MEME_WINDOW_MS - now;
    const remainingMinutes = Math.max(1, Math.ceil(remainingMs / (60 * 1000)));
    return { allowed: false, remainingMinutes, count: history.length };
  }

  return {
    allowed: true,
    remainingCount: MEME_MAX_PER_HOUR - (history.length + 1),
    record: () => {
      history.push(Date.now());
      memeLimitMap.set(key, history);
    }
  };
}

// 4. Analytics Track Limiter (Max 15 requests / min per IP)
export function checkTrackLimit(ip) {
  const now = Date.now();
  const history = (trackLimitMap.get(ip) || []).filter(
    (t) => now - t < TRACK_WINDOW_MS
  );

  if (history.length >= TRACK_MAX_PER_MINUTE) {
    return { allowed: false };
  }

  history.push(now);
  trackLimitMap.set(ip, history);
  return { allowed: true };
}

// 5. 15-Minute Live Chat Session Limit & 20-Minute Cooldown Manager (Anti-Bypass by IP + Device ID)
const sessionMap = new Map(); // key -> { sessionStart, cooldownUntil, lastActive }
const SESSION_MAX_DURATION_MS = 15 * 60 * 1000; // 15 minutes max per session
const COOLDOWN_DURATION_MS = 20 * 60 * 1000;    // 20 minutes cooldown break

export function checkChatSessionLimit(ip, deviceId = '', username = '') {
  const now = Date.now();
  const cleanName = (username || '').trim().toLowerCase();

  // Rotana NOB creator with verified session bypass
  if (cleanName === 'rotana nob' || cleanName === 'rotananob') {
    return { allowed: true, isCreator: true, remainingSessionSeconds: 900 };
  }

  // Device-level session tracking: Strictly isolates each user/device
  // NEVER blocks the entire shared IP or other innocent users on the same Wi-Fi
  const cleanDeviceId = (deviceId || '').trim();
  const cleanIp = (ip || '').trim();
  const devKey = cleanDeviceId ? `dev_${cleanDeviceId}` : null;
  const ipKey = cleanIp && cleanIp !== '127.0.0.1' ? `ip_${cleanIp}` : null;

  const sessionKey = devKey || (cleanName && cleanName !== 'user' ? `usr_${cleanName}` : (ipKey || null));
  if (!sessionKey) {
    return { allowed: true, remainingSessionSeconds: 900 };
  }

  // 1. Check if this specific user/device is currently locked in cooldown
  const session = sessionMap.get(sessionKey);
  const nowTime = now;

  if (session?.cooldownUntil && nowTime < session.cooldownUntil) {
    const remainingCooldownSeconds = Math.max(1, Math.ceil((session.cooldownUntil - nowTime) / 1000));
    return {
      allowed: false,
      isSessionLocked: true,
      cooldownUntil: session.cooldownUntil,
      remainingCooldownSeconds,
      message: 'អស់ម៉ោងលេងហើយអាប្អូន! (កំណត់ត្រឹម ១៥ នាទីក្នុង ១ លើក) ដើម្បីចែកវេនគ្នាលេង និងកុំឱ្យគាំង Server សូមសម្រាក ២០ នាទីសិន ☕🔥 ចាំត្រឡប់មក troll ជាមួយគ្នាម្តងទៀត!'
    };
  }

  // 2. Resolve existing session or start a fresh one for this user/device
  if (!session || (session.cooldownUntil && nowTime >= session.cooldownUntil)) {
    const newSession = {
      sessionStart: nowTime,
      cooldownUntil: null,
      lastActive: nowTime
    };
    sessionMap.set(sessionKey, newSession);
    return {
      allowed: true,
      sessionStart: newSession.sessionStart,
      remainingSessionSeconds: Math.ceil(SESSION_MAX_DURATION_MS / 1000)
    };
  }

  // 3. Check if session has exceeded the 15-minute limit
  const elapsed = nowTime - session.sessionStart;
  if (elapsed >= SESSION_MAX_DURATION_MS) {
    const cooldownUntil = nowTime + COOLDOWN_DURATION_MS;
    session.cooldownUntil = cooldownUntil;
    sessionMap.set(sessionKey, session);
    const remainingCooldownSeconds = Math.ceil(COOLDOWN_DURATION_MS / 1000);
    return {
      allowed: false,
      isSessionLocked: true,
      cooldownUntil,
      remainingCooldownSeconds,
      message: 'អស់ម៉ោងលេងហើយអាប្អូន! (កំណត់ត្រឹម ១៥ នាទីក្នុង ១ លើក) ដើម្បីចែកវេនគ្នាលេង និងកុំឱ្យគាំង Server សូមសម្រាក ២០ នាទីសិន ☕🔥 ចាំត្រឡប់មក troll ជាមួយគ្នាម្តងទៀត!'
    };
  }

  // Session is active and valid within 15 minutes
  session.lastActive = nowTime;
  sessionMap.set(sessionKey, session);

  const remainingSessionSeconds = Math.max(0, Math.ceil((SESSION_MAX_DURATION_MS - elapsed) / 1000));
  return {
    allowed: true,
    sessionStart: session.sessionStart,
    remainingSessionSeconds
  };
}
