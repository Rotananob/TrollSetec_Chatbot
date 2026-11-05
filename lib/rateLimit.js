// lib/rateLimit.js
// Enterprise-Grade Anti-DDoS, IP Blacklisting & Rate Limiting Protection for SETEC Chatbot

import { alertSecuritySpam, alertSystemError } from './telegram';

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
const MEME_COOLDOWN_MS = 60 * 60 * 1000;  // 1 hour
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
    for (const [key, t] of memeLimitMap.entries()) {
      if (now - t > MEME_COOLDOWN_MS) memeLimitMap.delete(key);
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

// 2. Chat Message Rate Limiter (Max 25 msgs / 1 min tracked by username, never locking the device permanently)
export function checkChatLimit(ip, username = '') {
  const now = Date.now();
  const cleanName = (username || '').trim().toLowerCase() || 'user';
  const key = `user_${cleanName}`;
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
export function resetChatLimit(username = '') {
  const cleanName = (username || '').trim().toLowerCase();
  if (cleanName) {
    chatLimitMap.delete(`user_${cleanName}`);
  }
}

// 3. Meme Quota Limiter (1 image per 1 hour per device/IP)
export function checkMemeQuota(ip, deviceId) {
  const now = Date.now();
  const key = `${ip}_${deviceId || 'device'}`;
  const lastTime = memeLimitMap.get(key);

  if (lastTime && now - lastTime < MEME_COOLDOWN_MS) {
    const remainingMs = lastTime + MEME_COOLDOWN_MS - now;
    const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
    return { allowed: false, remainingMinutes };
  }

  return { allowed: true, record: () => memeLimitMap.set(key, Date.now()) };
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
