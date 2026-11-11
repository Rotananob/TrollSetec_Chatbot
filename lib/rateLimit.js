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

// Malicious bot patterns & attack tool User-Agent signatures (Strictly for real penetration scanners, bots and cURL)
const MALICIOUS_BOT_PATTERN =
  /(^|[^a-zA-Z0-9])(curl|wget|python|aiohttp|httpx|httpie|urllib|requests|scrapy|postman|postmanruntime|insomnia|go-http-client|axios|node-fetch|undici|got|superagent|libwww|scapy|sqlmap|nikto|masscan|nmap|zgrab|censys|shodan|headless|phantomjs|selenium|puppeteer|playwright|cypress|wrk|vegeta|locust|apachebench|ab\/|restsharp|okhttp|dart|httpclient|apache-httpclient|powershell|invoke-webrequest|invoke-restmethod)($|[^a-zA-Z0-9])/i;

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
  if (verifyRotanaMasterCode(passcode)) {
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

  // 3. Check for Malicious Scanner Tools, Bots & cURL
  const isMaliciousBot =
    !userAgent ||
    userAgent.trim().length < 5 ||
    MALICIOUS_BOT_PATTERN.test(userAgent);

  if (isMaliciousBot) {
    const banUntil = now + 120 * 1000; // 2-minute ban for automated bots/cURL
    ipBannedMap.set(ip, {
      bannedUntil: banUntil,
      reason: `Automated Bot / cURL signature (${userAgent ? userAgent.slice(0, 40) : 'empty'})`,
      strikeCount: 2
    });

    return {
      allowed: false,
      isBanned: true,
      status: 403,
      retryAfter: 120,
      reason: 'Malicious Tool / Automated Bot / cURL',
      message: 'Access Denied: Automated bot or cURL signature detected by SETEC CyberShield.'
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
export function checkChatLimit(ip, username = '', deviceId = '', isCreatorAuth = false) {
  const now = Date.now();
  const cleanName = (username || '').trim().toLowerCase() || 'user';

  // Creator Rotana is ALWAYS 100% exempt from any chat lock when authenticated with master key
  if (isCreatorAuth) {
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

  // Device-level session tracking: Strictly isolates each user/device
  // NEVER blocks the entire shared IP or other innocent users on the same Wi-Fi
  const cleanDeviceId = (deviceId || '').trim();
  const cleanIp = (ip || '').trim();
  const devKey = cleanDeviceId ? `dev_${cleanDeviceId}` : null;
  const ipKey = cleanIp && cleanIp !== '127.0.0.1' ? `ip_${cleanIp}` : null;

  const sessionKey = devKey || (cleanName && cleanName !== 'user' ? `usr_${cleanName}` : (ipKey || null));
  if (!sessionKey) {
    return { allowed: true, isSessionLocked: false, remainingSessionSeconds: 1800 };
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
        lockedAt: session.lockedAt || (session.cooldownUntil - COOLDOWN_DURATION_MS),
        remainingCooldownSeconds,
        message: 'អស់ម៉ោងលេងហើយអាប្អូន! កំណត់ត្រឹម ៣០ នាទីក្នុង ១ លើក ដើម្បីចែកវេនគ្នាលេង និងរក្សា token ទុកសម្រាប់សិស្សៗ ស៊ីតិច ទាំងអស់គ្នា! សូមសម្រាក ១០ នាទីសិន ☕🔥 ចាំត្រឡប់មក troll ជាមួយគ្នាម្តងទៀត!'
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
        lockedAt: null,
        lastActive: nowTime,
        violationCount: 0
      };
      sessionMap.set(sessionKey, newSession);
      return {
        allowed: true,
        isSessionLocked: false,
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
      session.lockedAt = session.lockedAt || nowTime;
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
        lockedAt: session.lockedAt,
        remainingCooldownSeconds,
        message: 'អស់ម៉ោងលេងហើយអាប្អូន! កំណត់ត្រឹម ៣០ នាទីក្នុង ១ លើក ដើម្បីចែកវេនគ្នាលេង និងរក្សា token ទុកសម្រាប់សិស្សៗ ស៊ីតិច ទាំងអស់គ្នា! សូមសម្រាក ១០ នាទីសិន ☕🔥 ចាំត្រឡប់មក troll ជាមួយគ្នាម្តងទៀត!'
      };
    }

    // C) Session is active and valid within 30 minutes
    session.lastActive = nowTime;
    sessionMap.set(sessionKey, session);
    const remainingSessionSeconds = Math.max(0, Math.ceil((SESSION_MAX_DURATION_MS - elapsedSinceStart) / 1000));
    return {
      allowed: true,
      isSessionLocked: false,
      sessionStart: session.sessionStart,
      remainingSessionSeconds
    };
  }

  // 3. Start a fresh 30-minute session for this user/device
  const newSession = {
    sessionStart: nowTime,
    cooldownUntil: null,
    lockedAt: null,
    lastActive: nowTime,
    violationCount: 0
  };
  sessionMap.set(sessionKey, newSession);
  return {
    allowed: true,
    isSessionLocked: false,
    sessionStart: newSession.sessionStart,
    remainingSessionSeconds: Math.ceil(SESSION_MAX_DURATION_MS / 1000)
  };
}

// Reset a user's 30-minute session & 10-minute cooldown lock cleanly (called after verified bypass/promo or expiry)
export function resetChatSessionLimit(ip = '', deviceId = '', username = '', grantDurationMs = SESSION_MAX_DURATION_MS) {
  const now = Date.now();
  const cleanName = (username || '').trim().toLowerCase();
  const cleanDeviceId = (deviceId || '').trim();
  const cleanIp = (ip || '').trim();

  const candidateKeys = [
    getSessionKey(ip, deviceId, username),
    cleanDeviceId ? `dev_${cleanDeviceId}` : null,
    cleanName && cleanName !== 'user' ? `usr_${cleanName}` : null,
    cleanIp && cleanIp !== '127.0.0.1' ? `ip_${cleanIp}` : null
  ].filter(Boolean);

  for (const k of candidateKeys) {
    sessionMap.delete(k);
    chatLimitMap.delete(k);
    chatSpamEscalationMap.delete(k);
  }

  if (cleanName && cleanIp) {
    chatLimitMap.delete(`user_${cleanName}_${cleanIp}`);
    chatSpamEscalationMap.delete(`user_${cleanName}_${cleanIp}`);
  }
  if (cleanIp) {
    chatLimitMap.delete(`user_user_${cleanIp}`);
    chatSpamEscalationMap.delete(`user_user_${cleanIp}`);
  }

  const primaryKey = getSessionKey(ip, deviceId, username);
  const freshSession = {
    sessionStart: now,
    cooldownUntil: null,
    lockedAt: null,
    lastActive: now,
    bypassedUntil: now + Math.max(60000, grantDurationMs),
    violationCount: 0,
    encodeCount: 0,
    mathCount: 0,
    machineCount: 0,
    spamCount: 0
  };
  if (primaryKey) {
    sessionMap.set(primaryKey, freshSession);
  }

  return {
    allowed: true,
    isSessionLocked: false,
    reset: true,
    sessionStart: now,
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

// Record a security/spam violation in the current 30-minute live session (returns new violation count with granular metrics)
export function recordSessionViolation(ip, deviceId = '', username = '', violationType = 'general') {
  const sessionKey = getSessionKey(ip, deviceId, username);
  if (!sessionKey) {
    const fallback = {
      violationCount: 1,
      encodeCount: violationType === 'encode' ? 1 : 0,
      mathCount: violationType === 'math' ? 1 : 0,
      machineCount: (violationType === 'machine' || violationType === 'code_trap') ? 1 : 0,
      spamCount: violationType === 'spam' ? 1 : 0,
      valueOf() { return this.violationCount; },
      toString() { return String(this.violationCount); }
    };
    return fallback;
  }

  const now = Date.now();
  let session = sessionMap.get(sessionKey);
  if (!session) {
    session = {
      sessionStart: now,
      cooldownUntil: null,
      lastActive: now,
      violationCount: 0,
      encodeCount: 0,
      mathCount: 0,
      machineCount: 0,
      spamCount: 0
    };
  }

  session.violationCount = (session.violationCount || 0) + 1;
  if (violationType === 'encode') {
    session.encodeCount = (session.encodeCount || 0) + 1;
  } else if (violationType === 'math') {
    session.mathCount = (session.mathCount || 0) + 1;
  } else if (violationType === 'machine' || violationType === 'code_trap') {
    session.machineCount = (session.machineCount || 0) + 1;
  } else if (violationType === 'spam') {
    session.spamCount = (session.spamCount || 0) + 1;
  }

  session.lastActive = now;
  sessionMap.set(sessionKey, session);

  const result = {
    violationCount: session.violationCount,
    encodeCount: session.encodeCount || 0,
    mathCount: session.mathCount || 0,
    machineCount: session.machineCount || 0,
    spamCount: session.spamCount || 0,
    valueOf() { return this.violationCount; },
    toString() { return String(this.violationCount); }
  };
  return result;
}

// Get the count of spam/attack violations recorded in the current active 30-minute session
export function getSessionViolationCount(ip, deviceId = '', username = '') {
  const sessionKey = getSessionKey(ip, deviceId, username);
  if (!sessionKey) return 0;
  const session = sessionMap.get(sessionKey);
  return session?.violationCount || 0;
}

export function getSessionViolationDetails(ip, deviceId = '', username = '') {
  const sessionKey = getSessionKey(ip, deviceId, username);
  if (!sessionKey) return { violationCount: 0, encodeCount: 0, mathCount: 0, machineCount: 0 };
  const session = sessionMap.get(sessionKey);
  return {
    violationCount: session?.violationCount || 0,
    encodeCount: session?.encodeCount || 0,
    mathCount: session?.mathCount || 0,
    machineCount: session?.machineCount || 0
  };
}

// Lore & AI Training Dataset contribution anti-spam state
const loreContributionMap = new Map(); // key -> Array<timestamps>
const loreSpamEscalationMap = new Map(); // key -> { strike: number, lockUntil: number, lastViolation: number }

/**
 * Anti-Spam protection for AI training / SETEC Lore contributions:
 * 1. 1 device can send at most 5 times within 1 minute (60 seconds).
 * 2. If exceeded (> 5 within 60s):
 *    - Strike 1: cooldown 60 seconds
 *    - Strike 2: if spam continues, cooldown escalates to 120 seconds
 *    - Strike 3+: if spam continues, cooldown escalates to 180 seconds (3 minutes)
 * 3. If user stops and waits until cooldown finishes (0 seconds), normal sending resumes!
 */
export function checkLoreContributionLimit(ip = '', deviceId = '') {
  const now = Date.now();
  const cleanDevice = (deviceId || '').trim();
  const key = cleanDevice && cleanDevice !== 'server' && cleanDevice !== 'Unknown' && cleanDevice !== 'undefined'
    ? `dev_${cleanDevice}`
    : `ip_${(ip || 'unknown').trim()}`;

  const escalation = loreSpamEscalationMap.get(key) || { strike: 0, lockUntil: 0, lastViolation: 0 };

  // 1. If currently locked (in active cooldown):
  if (now < escalation.lockUntil) {
    const newStrike = Math.min(3, (escalation.strike || 1) + 1);
    const addedSeconds = newStrike === 2 ? 120 : 180; // Strike 2 -> 120s, Strike 3 -> 180s (3 minutes)
    const newLockUntil = now + (addedSeconds * 1000);

    loreSpamEscalationMap.set(key, {
      strike: newStrike,
      lockUntil: newLockUntil,
      lastViolation: now
    });

    const remainingSec = Math.max(1, Math.ceil((newLockUntil - now) / 1000));
    return {
      allowed: false,
      isSpam: true,
      strike: newStrike,
      retryAfter: remainingSec,
      lockUntil: newLockUntil,
      message: `ប្រព័ន្ធបានរកឃើញការបន្ត Spam! រយៈពេលរង់ចាំ Cooldown ត្រូវបានបង្កើនដល់ ${remainingSec} វិនាទី!`
    };
  }

  // 2. If previous lock has finished (user waited until 0 seconds):
  if (escalation.lockUntil > 0 && now >= escalation.lockUntil) {
    loreContributionMap.delete(key);
    loreSpamEscalationMap.set(key, { strike: 0, lockUntil: 0, lastViolation: 0 });
  }

  // 3. Sliding 60-second window: max 5 contributions per 1 minute
  let history = loreContributionMap.get(key) || [];
  history = history.filter((t) => now - t < 60 * 1000);

  if (history.length >= 5) {
    // Exceeded 5 requests in 1 minute -> Strike 1: 60 seconds cooldown
    const strike = 1;
    const cooldownSec = 60;
    const lockUntil = now + (cooldownSec * 1000);

    loreSpamEscalationMap.set(key, {
      strike,
      lockUntil,
      lastViolation: now
    });

    return {
      allowed: false,
      isSpam: true,
      strike,
      retryAfter: cooldownSec,
      lockUntil,
      message: `ឧបករណ៍របស់អ្នកបានផ្ញើរឿងលើសពី ៥ ដងក្នុង ១ នាទី! សូមរង់ចាំ Cooldown ${cooldownSec} វិនាទីសិន!`
    };
  }

  history.push(now);
  loreContributionMap.set(key, history);

  return {
    allowed: true,
    remaining: 5 - history.length,
    strike: 0
  };
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
    loreContributionsCleared: loreContributionMap.size,
    loreEscalationsCleared: loreSpamEscalationMap.size,
    timestamp: Date.now()
  };

  ipBannedMap.clear();
  chatLimitMap.clear();
  chatSpamEscalationMap.clear();
  memeLimitMap.clear();
  sessionMap.clear();
  ipRequestHistory.clear();
  trackLimitMap.clear();
  loreContributionMap.clear();
  loreSpamEscalationMap.clear();

  return stats;
}
