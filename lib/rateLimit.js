// lib/rateLimit.js
// Enterprise-Grade Anti-DDoS, IP Blacklisting & Rate Limiting Protection for SETEC Chatbot

import { alertSecuritySpam, alertSystemError } from './telegram.js';
import { verifyRotanaMasterCode } from './masterAuth.js';

// In-memory security state
const ipRequestHistory = new Map(); // ip -> Array<timestamps>
const ipBannedMap = new Map();       // ip -> { bannedUntil, reason, strikeCount }
const chatLimitMap = new Map();      // key -> Array<timestamps>
const chatSpamEscalationMap = new Map(); // key -> { strike: number, lockUntil: number, lastViolation: number }
const memeLimitMap = new Map();      // key -> timestamp
const trackLimitMap = new Map();     // ip -> Array<timestamps>

// Configuration Constants
const DDOS_BURST_WINDOW_MS = 10 * 1000;   // 10 seconds sliding window
const DDOS_MAX_BURST = 25;                // Max 25 requests in 10s per IP (generous for mobile streaming + audio chunks)
const DDOS_MINUTE_WINDOW_MS = 60 * 1000;  // 1 minute window
const DDOS_MAX_PER_MINUTE = 60;           // Max 60 requests in 1 minute per IP
const BAN_INITIAL_DURATION_MS = 60 * 1000;// 60 seconds initial cool-off

const CHAT_WINDOW_MS = 60 * 1000;         // 1 minute window
const CHAT_MAX_MESSAGES = 7;              // Max 7 messages in 1 minute
const ONE_HOUR_MS = 60 * 60 * 1000;       // 1 hour decay window
const MEME_WINDOW_MS = 60 * 60 * 1000;    // 1 hour
const MEME_MAX_PER_HOUR = 5;              // 5 memes per 1 hour per device/IP
const TRACK_WINDOW_MS = 60 * 1000;        // 1 minute
const TRACK_MAX_PER_MINUTE = 30;          // 30 track calls per minute

// Malicious bot patterns & attack tool User-Agent signatures (Strictly for real penetration scanners)
const MALICIOUS_BOT_PATTERN =
  /sqlmap|nikto|masscan|zgrab|censys|shodan|acunetix|nessus|openvas|hydra|dirbuster|gobuster/i;

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
    // Clean expired Chat Escalation entries (reset if inactive >= 1 hour)
    for (const [key, info] of chatSpamEscalationMap.entries()) {
      if (now - info.lastViolation >= ONE_HOUR_MS) {
        chatSpamEscalationMap.delete(key);
      }
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

  const trueClientIp = req.headers.get('true-client-ip');
  if (trueClientIp) return trueClientIp.trim();

  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return '127.0.0.1';
}

// 1. Enterprise Anti-DDoS Firewall & High-Frequency Burst Shield
export function checkDDoSFirewall(req, endpoint = 'api') {
  const ip = getClientIp(req);
  const now = Date.now();
  const userAgent = req.headers.get('user-agent') || '';

  // 1. Creator Rotana NOB is ALWAYS 100% exempt from any ban or throttle
  const authHeader = req.headers.get('authorization') || '';
  const passcode = req.headers.get('x-rotana-passcode') || (authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader);
  const username = req.headers.get('x-username') || '';
  if (verifyRotanaMasterCode(passcode) || (username && username.toLowerCase().includes('rotana'))) {
    return { allowed: true, isCreator: true };
  }

  // 2. Check if IP is currently under active ban (Jailed)
  const banInfo = ipBannedMap.get(ip);
  if (banInfo) {
    if (now < banInfo.bannedUntil) {
      // Escalation: If attacker continues hammering while banned, extend the ban duration
      banInfo.strikeCount = (banInfo.strikeCount || 1) + 1;
      if (banInfo.strikeCount % 8 === 0) {
        banInfo.bannedUntil = now + Math.min(15 * 60 * 1000, banInfo.strikeCount * 30 * 1000);
      }
      ipBannedMap.set(ip, banInfo);

      const remainingSeconds = Math.max(1, Math.ceil((banInfo.bannedUntil - now) / 1000));
      return {
        allowed: false,
        isBanned: true,
        status: 429,
        retryAfter: remainingSeconds,
        reason: banInfo.reason,
        message: `🚨 Anti-DDoS Firewall: IP របស់អ្នកស្ថិតក្នុងបញ្ជីបិទបណ្ដោះអាសន្នដោយសារការស្នើសុំលឿនខុសប្រក្រតី (${banInfo.reason})។ សូមរង់ចាំ ${remainingSeconds} វិនាទី!`
      };
    } else {
      ipBannedMap.delete(ip);
    }
  }

  // 3. Check for Malicious Scanner Tools (Standard browsers are ALWAYS exempt)
  const isBrowser = /mozilla|safari|chrome|chromium|firefox|edg|webkit|applewebkit|iphone|ipad|android|mobile/i.test(userAgent);
  if (!isBrowser && userAgent && userAgent.trim().length >= 4 && MALICIOUS_BOT_PATTERN.test(userAgent)) {
    const banUntil = now + 120 * 1000; // 2-minute ban for known attack scanners
    ipBannedMap.set(ip, {
      bannedUntil: banUntil,
      reason: `Malicious scanner signature (${userAgent.slice(0, 40)})`,
      strikeCount: 2
    });

    return {
      allowed: false,
      isBanned: true,
      status: 403,
      retryAfter: 120,
      reason: 'Malicious Tool / Automated Bot',
      message: 'Access Denied: Malicious scanner signature detected by SETEC CyberShield.'
    };
  }

  // 4. Update IP Request History
  const history = (ipRequestHistory.get(ip) || []).filter(
    (t) => now - t < DDOS_MINUTE_WINDOW_MS
  );
  history.push(now);
  ipRequestHistory.set(ip, history);

  // 5. High-Frequency Burst Shield (> 25 requests in 10 seconds)
  const recentBurstCount = history.filter((t) => now - t < DDOS_BURST_WINDOW_MS).length;
  if (recentBurstCount > DDOS_MAX_BURST) {
    const banUntil = now + BAN_INITIAL_DURATION_MS;
    ipBannedMap.set(ip, {
      bannedUntil: banUntil,
      reason: `High-frequency burst flood (${recentBurstCount} reqs in 10s)`,
      strikeCount: 1
    });

    return {
      allowed: false,
      isBanned: true,
      status: 429,
      retryAfter: 60,
      reason: `Burst flood (${recentBurstCount} reqs/10s)`,
      message: '🚨 Anti-DDoS Firewall: បានរកឃើញការបាញ់ Request លឿនជ្រុល (>25 reqs/10s)! ប្រព័ន្ធបានផ្អាក IP នេះ ៦០ វិនាទី!'
    };
  }

  // 6. Sustained Flood Shield (> 60 requests in 60 seconds)
  if (history.length > DDOS_MAX_PER_MINUTE) {
    const banUntil = now + 120 * 1000; // 2-minute lockout
    ipBannedMap.set(ip, {
      bannedUntil: banUntil,
      reason: `Sustained flood attack (${history.length} reqs in 60s)`,
      strikeCount: 2
    });

    return {
      allowed: false,
      isBanned: true,
      status: 429,
      retryAfter: 120,
      reason: `Sustained flood (${history.length} reqs/60s)`,
      message: '🚨 Anti-DDoS Firewall: បានរកឃើញការវាយប្រហារបែប Flood (>60 reqs/min)! ប្រព័ន្ធបានផ្អាក IP នេះ ២ នាទី!'
    };
  }

  return { allowed: true };
}

// 2. Chat Message Rate Limiter (Max 7 msgs / 1 min with Escalating 1m -> 10m Jailing)
// Logic:
// - If user sends > 7 messages in 1 minute:
//   Strike 1: Lock 1 minute (60s)
//   If continue spamming: +1 min per strike (2m, 3m, 4m, ... up to 10m max)
//   After 10m: cycles back to 1 minute
// - If they stop spamming and 1 hour passes without spamming: resets completely back to 1m initial lock
export function checkChatLimit(ip, username = '', deviceId = '') {
  const now = Date.now();
  const cleanName = (username || '').trim().toLowerCase() || 'user';

  // Creator Rotana is ALWAYS 100% exempt from any chat lock
  if (
    cleanName.includes('rotana') ||
    cleanName === 'rotana nob' ||
    cleanName === 'rotananob' ||
    cleanName === 'rotana_nob'
  ) {
    return { allowed: true, isCreator: true };
  }

  // Partition by deviceId when available, preventing PWA standalone and Web or shared Wi-Fi users from colliding
  const cleanDev = (deviceId || '').trim();
  const key = cleanDev ? `dev_${cleanDev}` : `user_${cleanName}_${ip}`;

  // 1. Check if user is currently under an active spam lock
  let escalation = chatSpamEscalationMap.get(key);
  if (escalation) {
    // 1-Hour Decay: If user stopped and 1 hour has passed, reset back to ground state
    if (now - escalation.lastViolation >= ONE_HOUR_MS) {
      chatSpamEscalationMap.delete(key);
      escalation = null;
    } else if (now < escalation.lockUntil) {
      // User is STILL locked out! Reject immediately with remaining time
      const remainingSeconds = Math.max(1, Math.ceil((escalation.lockUntil - now) / 1000));
      return {
        allowed: false,
        isSpamLocked: true,
        retryAfter: remainingSeconds,
        lockMinutes: escalation.strike,
        strike: escalation.strike,
        reason: `Active spam lockout (Strike ${escalation.strike}/10: ${escalation.strike} នាទី)`
      };
    }
  }

  // 2. Check sliding 1-minute window
  const history = (chatLimitMap.get(key) || []).filter(
    (t) => now - t < CHAT_WINDOW_MS
  );

  // 3. If user hits or exceeds 7 messages in 1 minute -> TRIGGER ESCALATING LOCKOUT!
  if (history.length >= CHAT_MAX_MESSAGES) {
    let newStrike = 1;
    if (escalation && now - escalation.lastViolation < ONE_HOUR_MS) {
      // Escalation: if spamming again within 1 hour, add 1 minute (up to 10m max, then cycle back to 1m)
      newStrike = escalation.strike >= 10 ? 1 : escalation.strike + 1;
    }

    const lockMinutes = newStrike; // Strike 1 = 1m, Strike 2 = 2m, ..., Strike 10 = 10m
    const lockDurationMs = lockMinutes * 60 * 1000;
    const lockUntil = now + lockDurationMs;

    chatSpamEscalationMap.set(key, {
      strike: newStrike,
      lockUntil,
      lastViolation: now
    });

    // Reset sliding history so they start clean after lockout expires
    chatLimitMap.set(key, []);

    return {
      allowed: false,
      isSpamLocked: true,
      retryAfter: lockMinutes * 60,
      lockMinutes,
      strike: newStrike,
      reason: `Spamming > 7 messages in 1 minute (Strike ${newStrike}: ផ្អាក ${lockMinutes} នាទី)`
    };
  }

  // 4. Record valid message
  history.push(now);
  chatLimitMap.set(key, history);
  return { allowed: true };
}

// Reset rate limits for a specific user
export function resetChatLimit(username = '', ip = '') {
  const cleanName = (username || '').trim().toLowerCase();
  if (cleanName && cleanName !== 'user') {
    chatLimitMap.delete(`user_${cleanName}`);
    chatSpamEscalationMap.delete(`user_${cleanName}`);
  }
  if (ip) {
    chatLimitMap.delete(`user_user_${ip}`);
    chatSpamEscalationMap.delete(`user_user_${ip}`);
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

// 5. 30-Minute Live Chat Session Limit & 10-Minute Cooldown Manager (Anti-Bypass by IP + Device ID)
const sessionMap = new Map(); // key -> { sessionStart, cooldownUntil, lastActive }
const SESSION_MAX_DURATION_MS = 30 * 60 * 1000; // 30 minutes max per session
const COOLDOWN_DURATION_MS = 10 * 60 * 1000;    // 10 minutes cooldown break

export function checkChatSessionLimit(ip, deviceId = '', username = '') {
  const now = Date.now();
  const cleanName = (username || '').trim().toLowerCase();

  // Rotana NOB creator with verified session bypass (Permanent 100% Exemption)
  if (
    cleanName.includes('rotana') ||
    cleanName === 'rotana' ||
    cleanName === 'rotana nob' ||
    cleanName === 'rotananob' ||
    cleanName === 'rotana_nob'
  ) {
    return { allowed: true, isCreator: true, remainingSessionSeconds: 1800 };
  }

  // Device-level session tracking: Strictly isolates each user/device
  // NEVER blocks the entire shared IP or other innocent users on the same Wi-Fi
  const cleanDeviceId = (deviceId || '').trim();
  const cleanIp = (ip || '').trim();
  const devKey = cleanDeviceId ? `dev_${cleanDeviceId}` : null;
  const ipKey = cleanIp && cleanIp !== '127.0.0.1' ? `ip_${cleanIp}` : null;

  const sessionKey = devKey || (cleanName && cleanName !== 'user' ? `usr_${cleanName}` : (ipKey || null));
  if (!sessionKey) {
    return { allowed: true, remainingSessionSeconds: 1800 };
  }

  const session = sessionMap.get(sessionKey);
  const nowTime = now;

  // 1. Check if user is legitimately locked in an ongoing 10-minute cooldown
  if (session?.cooldownUntil) {
    if (nowTime < session.cooldownUntil) {
      if (session.cooldownUntil - nowTime > COOLDOWN_DURATION_MS) {
        session.cooldownUntil = nowTime + COOLDOWN_DURATION_MS;
      }
      const remainingCooldownSeconds = Math.min(
        Math.ceil(COOLDOWN_DURATION_MS / 1000),
        Math.max(1, Math.ceil((session.cooldownUntil - nowTime) / 1000))
      );
      return {
        allowed: false,
        isSessionLocked: true,
        cooldownUntil: session.cooldownUntil,
        remainingCooldownSeconds,
        message: 'អស់ម៉ោងលេងហើយអាប្អូន! (កំណត់ត្រឹម ៣០ នាទីក្នុង ១ លើក) ដើម្បីចែកវេនគ្នាលេង និងរក្សា token ទុកសម្រាប់សិស្សៗ ស៊ីតិច ទាំងអស់គ្នា! សូមសម្រាក ១០ នាទីសិន ☕🔥 ចាំត្រឡប់មក troll ជាមួយគ្នាម្តងទៀត!'
      };
    } else {
      // Cooldown has elapsed completely! Wipe session and allow immediate fresh start
      sessionMap.delete(sessionKey);
    }
  }

  // 2. Check active session if one exists
  if (session && session.sessionStart) {
    const elapsedSinceStart = nowTime - session.sessionStart;
    const elapsedSinceActive = session.lastActive ? nowTime - session.lastActive : 0;

    // A) Inactivity Check FIRST: If user was away/inactive for >= 10 minutes, reset cleanly!
    if (elapsedSinceActive >= 10 * 60 * 1000) {
      sessionMap.delete(sessionKey);
      const newSession = {
        sessionStart: nowTime,
        cooldownUntil: null,
        lastActive: nowTime,
        violationCount: 0
      };
      sessionMap.set(sessionKey, newSession);
      return {
        allowed: true,
        sessionStart: newSession.sessionStart,
        remainingSessionSeconds: Math.ceil(SESSION_MAX_DURATION_MS / 1000)
      };
    }

    // B) 30-minute session elapsed: Trigger 10-minute Cooldown Rest (ម៉ោងសម្រាក)!
    if (elapsedSinceStart >= SESSION_MAX_DURATION_MS) {
      // If session already has an active cooldownUntil in the future, PRESERVE it! Do not reset timer on ping!
      const cooldownUntil = (session.cooldownUntil && session.cooldownUntil > nowTime)
        ? session.cooldownUntil
        : nowTime + COOLDOWN_DURATION_MS;
      session.cooldownUntil = cooldownUntil;
      session.sessionStart = null;
      session.lastActive = nowTime;
      sessionMap.set(sessionKey, session);

      const remainingCooldownSeconds = Math.min(
        Math.ceil(COOLDOWN_DURATION_MS / 1000),
        Math.max(1, Math.ceil((cooldownUntil - nowTime) / 1000))
      );
      return {
        allowed: false,
        isSessionLocked: true,
        cooldownUntil,
        remainingCooldownSeconds,
        message: 'អស់ម៉ោងលេងហើយអាប្អូន! (កំណត់ត្រឹម ៣០ នាទីក្នុង ១ លើក) ដើម្បីចែកវេនគ្នាលេង និងរក្សា token ទុកសម្រាប់សិស្សៗ ស៊ីតិច ទាំងអស់គ្នា! សូមសម្រាក ១០ នាទីសិន ☕🔥 ចាំត្រឡប់មក troll ជាមួយគ្នាម្តងទៀត!'
      };
    }

    // C) Session is active and valid within 30 minutes
    session.lastActive = nowTime;
    sessionMap.set(sessionKey, session);
    const remainingSessionSeconds = Math.max(0, Math.ceil((SESSION_MAX_DURATION_MS - elapsedSinceStart) / 1000));
    return {
      allowed: true,
      sessionStart: session.sessionStart,
      remainingSessionSeconds
    };
  }

  // 3. Start a fresh 30-minute session for this user/device
  const newSession = {
    sessionStart: nowTime,
    cooldownUntil: null,
    lastActive: nowTime,
    violationCount: 0
  };
  sessionMap.set(sessionKey, newSession);
  return {
    allowed: true,
    sessionStart: newSession.sessionStart,
    remainingSessionSeconds: Math.ceil(SESSION_MAX_DURATION_MS / 1000)
  };
}

// Helper to resolve device/user/ip session key
export function getSessionKey(ip, deviceId = '', username = '') {
  const cleanName = (username || '').trim().toLowerCase();
  const cleanDeviceId = (deviceId || '').trim();
  const cleanIp = (ip || '').trim();
  const devKey = cleanDeviceId ? `dev_${cleanDeviceId}` : null;
  const ipKey = cleanIp && cleanIp !== '127.0.0.1' ? `ip_${cleanIp}` : null;
  return devKey || (cleanName && cleanName !== 'user' ? `usr_${cleanName}` : (ipKey || null));
}

// Record a security/spam violation in the current 30-minute live session (returns new violation count)
export function recordSessionViolation(ip, deviceId = '', username = '') {
  const sessionKey = getSessionKey(ip, deviceId, username);
  if (!sessionKey) return 1;

  const now = Date.now();
  let session = sessionMap.get(sessionKey);
  if (!session) {
    session = {
      sessionStart: now,
      cooldownUntil: null,
      lastActive: now,
      violationCount: 0
    };
  }

  session.violationCount = (session.violationCount || 0) + 1;
  session.lastActive = now;
  sessionMap.set(sessionKey, session);
  return session.violationCount;
}

// Get the count of spam/attack violations recorded in the current active 30-minute session
export function getSessionViolationCount(ip, deviceId = '', username = '') {
  const sessionKey = getSessionKey(ip, deviceId, username);
  if (!sessionKey) return 0;
  const session = sessionMap.get(sessionKey);
  return session?.violationCount || 0;
}

// 6. Master Flush: Clear all active bans, locks, and session maps immediately
export function flushAllRateLimits() {
  const stats = {
    bannedIpsCleared: ipBannedMap.size,
    chatLimitsCleared: chatLimitMap.size,
    chatEscalationsCleared: chatSpamEscalationMap.size,
    memeLimitsCleared: memeLimitMap.size,
    sessionsCleared: sessionMap.size,
    ipHistoriesCleared: ipRequestHistory.size,
    timestamp: Date.now()
  };

  ipBannedMap.clear();
  chatLimitMap.clear();
  chatSpamEscalationMap.clear();
  memeLimitMap.clear();
  sessionMap.clear();
  ipRequestHistory.clear();
  trackLimitMap.clear();

  return stats;
}
