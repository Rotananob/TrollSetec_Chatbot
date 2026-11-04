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
const DDOS_MAX_BURST = 12;                // Max 12 requests in 10 seconds per IP
const DDOS_MINUTE_WINDOW_MS = 60 * 1000;  // 1 minute window
const DDOS_MAX_PER_MINUTE = 35;           // Max 35 requests in 1 minute per IP
const BAN_DURATION_MS = 10 * 60 * 1000;   // 10 minutes temporary ban for attackers

const CHAT_WINDOW_MS = 60 * 1000;         // 1 minute
const CHAT_MAX_MESSAGES = 5;              // 5 messages per minute
const MEME_COOLDOWN_MS = 60 * 60 * 1000;  // 1 hour
const TRACK_WINDOW_MS = 60 * 1000;        // 1 minute
const TRACK_MAX_PER_MINUTE = 15;          // 15 track calls per minute

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

// 1. Core Anti-DDoS & Burst Flooding Firewall
export function checkDDoSFirewall(req, endpoint = 'api') {
  const ip = getClientIp(req);
  const now = Date.now();
  const userAgent = req.headers.get('user-agent') || 'Unknown';

  // Check if IP is already banned
  const banInfo = ipBannedMap.get(ip);
  if (banInfo) {
    if (now < banInfo.bannedUntil) {
      const remainingSeconds = Math.ceil((banInfo.bannedUntil - now) / 1000);
      return {
        allowed: false,
        isBanned: true,
        status: 429,
        retryAfter: remainingSeconds,
        message: `🚫 IP របស់អ្នកត្រូវបានចាក់សោរបណ្ដោះអាសន្នរយៈពេល ${Math.ceil(remainingSeconds / 60)} នាទី ដោយសាររកឃើញសកម្មភាពវាយប្រហារ DDoS ឬបាញ់ Request ញឹកញាប់ហួសកម្រិត!`
      };
    } else {
      ipBannedMap.delete(ip); // Ban expired
    }
  }

  // Update request history for this IP
  const history = (ipRequestHistory.get(ip) || []).filter(
    (t) => now - t < DDOS_MINUTE_WINDOW_MS
  );
  history.push(now);
  ipRequestHistory.set(ip, history);

  // Check 1: Ultra-rapid burst check (more than 12 reqs in 10s)
  const recentBurst = history.filter((t) => now - t < DDOS_WINDOW_MS);
  if (recentBurst.length > DDOS_MAX_BURST) {
    const banUntil = now + BAN_DURATION_MS;
    ipBannedMap.set(ip, {
      bannedUntil: banUntil,
      reason: `Burst flood attack (${recentBurst.length} requests in 10s)`,
      count: recentBurst.length
    });

    // Fire high priority Telegram alert
    alertSecuritySpam({
      username: '🚨 DDoS ATTACKER BLOCKED',
      ip,
      userAgent,
      bot: `Firewall (${endpoint})`,
      retryAfter: Math.ceil(BAN_DURATION_MS / 1000),
      prompt: `Burst flood: ${recentBurst.length} requests / 10s on ${endpoint}. Auto-banned for 10 minutes.`
    }).catch((e) => console.error('[DDoS Alert Error]', e));

    return {
      allowed: false,
      isBanned: true,
      status: 429,
      retryAfter: Math.ceil(BAN_DURATION_MS / 1000),
      message: '🚨 ប្រព័ន្ធការពារ Anti-DDoS បានចាប់បានការវាយប្រហារ Burst Flood! IP របស់អ្នកត្រូវបាន Block រយៈពេល 10 នាទី!'
    };
  }

  // Check 2: High frequency per minute check (more than 35 reqs in 60s)
  if (history.length > DDOS_MAX_PER_MINUTE) {
    const banUntil = now + BAN_DURATION_MS;
    ipBannedMap.set(ip, {
      bannedUntil: banUntil,
      reason: `Minute rate limit flood (${history.length} requests in 60s)`,
      count: history.length
    });

    alertSecuritySpam({
      username: '🚨 RATE LIMIT FLOOD BLOCKED',
      ip,
      userAgent,
      bot: `Firewall (${endpoint})`,
      retryAfter: Math.ceil(BAN_DURATION_MS / 1000),
      prompt: `High-frequency flood: ${history.length} requests / 60s on ${endpoint}. Auto-banned for 10 minutes.`
    }).catch((e) => console.error('[DDoS Alert Error]', e));

    return {
      allowed: false,
      isBanned: true,
      status: 429,
      retryAfter: Math.ceil(BAN_DURATION_MS / 1000),
      message: '🚨 ប្រព័ន្ធសុវត្ថិភាពបានចាប់បានការស្នើសុំលើសកម្រិតកំណត់ក្នុង 1 នាទី! IP របស់អ្នកត្រូវបាន Block រយៈពេល 10 នាទី!'
    };
  }

  return { allowed: true };
}

// 2. Chat Message Rate Limiter (Max 5 msgs / 1 min per device/IP)
export function checkChatLimit(ip, deviceId) {
  const now = Date.now();
  const key = `${ip}_${deviceId || 'device'}`;
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
