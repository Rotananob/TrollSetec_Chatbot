// lib/sessionManager.js
// Dedicated Session Logger & 1-Hour Inactivity Telegram Archive Dispatcher
// Stores 1 file/document per chat session into Firebase Realtime Database (/chat_sessions/<sessionId>.json)
// Captures full identity: IP, deviceId, userAgent, OS, browser, username, gender, timestamps
// Automatically aggregates and sends finished sessions (after 1 hour inactivity) as JSON documents to Telegram
// Distributed lock and anti-spam controls prevent duplicate files, overlapping runs, and trivial message spam
// Strictly ZERO parentheses and ZERO brackets in all Khmer text!

import { getCambodiaTime, parseUserAgent, sendTelegramDocument, TOPIC_KEYS } from './telegram.js';

const FIREBASE_DB_URL = 'https://troll-setec-chatbot-default-rtdb.asia-southeast1.firebasedatabase.app';
const ONE_HOUR_MS = 60 * 60 * 1000; // 1 hour inactivity threshold
const GLOBAL_SCAN_COOLDOWN_MS = 15 * 60 * 1000; // Rate limit global scans to once per 15 minutes across ALL containers
const LOCK_TTL_MS = 3 * 60 * 1000; // 3 minutes lock lease
const MAX_EXPORTS_PER_RUN = 3; // Maximum 3 session documents per run to prevent Telegram flood/spam
const INTER_DOC_DELAY_MS = 2500; // 2.5 seconds pause between sending consecutive files

let isExportRunningLocal = false;
let lastExportRunTimeLocal = 0;
const exportingSessionKeys = new Set();

function sanitizeKey(key = '') {
  return String(key || 'session').replace(/[.#$[\]/]/g, '_');
}

function escapeHtml(text = '') {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Record turn-by-turn chat message into an isolated session JSON file/doc in Firebase RTDB
 */
export async function recordSessionTurn({
  sessionId,
  username = 'User',
  gender = 'ប្រុស',
  bot = 'konpov',
  ip = 'Unknown',
  deviceId = 'Unknown',
  userAgent = '',
  userPrompt = '',
  botResponse = '',
  isViolation = false,
  violationType = null
}) {
  const finalSessionId = sanitizeKey(sessionId || `ses_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const now = Date.now();
  const timeFormatted = getCambodiaTime(new Date(now));
  const parsedUA = parseUserAgent(userAgent);

  try {
    // 1. Fetch current session data if already exists
    const getUrl = `${FIREBASE_DB_URL}/chat_sessions/${finalSessionId}.json`;
    const res = await fetch(getUrl, { cache: 'no-store', signal: AbortSignal.timeout(3500) });
    let existing = null;
    if (res.ok) {
      existing = await res.json();
    }

    const prevMessages = (existing && Array.isArray(existing.messages)) ? existing.messages : [];
    const prevTurn = prevMessages.length > 0 ? (prevMessages[prevMessages.length - 1].turn || 1) + 1 : 1;

    const newMessages = [
      ...prevMessages,
      {
        turn: prevTurn,
        sender: 'user',
        text: userPrompt,
        timestamp: now,
        time: timeFormatted
      },
      {
        turn: prevTurn,
        sender: 'bot',
        text: botResponse,
        timestamp: now,
        time: timeFormatted,
        isViolation: Boolean(isViolation),
        violationType: isViolation ? violationType : null
      }
    ];

    // If session was previously exported, only re-enable export if there are substantial new turns
    const wasAlreadyExported = existing?.exportedToTelegram === true || existing?.status === 'archived';
    const lastExportedCount = existing?.lastExportedMessageCount || existing?.messageCount || 0;
    const hasSubstantialNewTurns = (newMessages.length - lastExportedCount) >= 4;

    const sessionPayload = {
      sessionId: finalSessionId,
      username: username || existing?.username || 'User',
      gender: gender || existing?.gender || 'ប្រុស',
      bot: bot || existing?.bot || 'konpov',
      identity: {
        ip: ip || existing?.identity?.ip || 'Unknown',
        deviceId: deviceId || existing?.identity?.deviceId || 'Unknown',
        userAgent: userAgent || existing?.identity?.userAgent || '',
        os: parsedUA.os,
        browser: parsedUA.browser,
        deviceType: parsedUA.deviceType,
        summary: parsedUA.summary
      },
      createdAt: existing?.createdAt || now,
      createdAtFormatted: existing?.createdAtFormatted || timeFormatted,
      lastActiveAt: now,
      lastActiveFormatted: timeFormatted,
      messageCount: newMessages.length,
      violationsCount: (existing?.violationsCount || 0) + (isViolation ? 1 : 0),
      lastViolation: isViolation ? violationType : (existing?.lastViolation || null),
      status: 'active',
      exportedToTelegram: wasAlreadyExported && !hasSubstantialNewTurns,
      exportedAt: wasAlreadyExported && !hasSubstantialNewTurns ? existing.exportedAt : null,
      lastExportedMessageCount: existing?.lastExportedMessageCount || (wasAlreadyExported ? existing.messageCount : 0),
      messages: newMessages
    };

    // Store in Firebase as 1 file/document per session
    await fetch(`${FIREBASE_DB_URL}/chat_sessions/${finalSessionId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionPayload)
    });

    return sessionPayload;
  } catch (err) {
    console.error('[SessionManager] Failed to record turn:', err.message);
    return null;
  }
}

/**
 * Scan all sessions and export any session that has been inactive for >= 1 hour to Telegram topic
 * Thread-safe and distributed:
 * 1. Distributed lock in Firebase prevents multi-container race conditions and duplicate files
 * 2. Minimum message threshold prevents sending spammy 1-message or empty sessions
 * 3. Human-readable unique chronological file names prevent collisions
 * 4. Throttled batch export prevents Telegram flooding
 */
export async function checkAndExportInactiveSessions() {
  const now = Date.now();

  // In-process rate-limit check
  if (isExportRunningLocal || (now - lastExportRunTimeLocal < GLOBAL_SCAN_COOLDOWN_MS)) {
    return { success: true, exportedCount: 0, skipped: true, reason: 'local_cooldown' };
  }

  isExportRunningLocal = true;
  lastExportRunTimeLocal = now;

  let hasAcquiredDistributedLock = false;
  const workerId = Math.random().toString(36).slice(2, 10);

  try {
    // 1. Check distributed global cooldown in Firebase RTDB
    const lastScanRes = await fetch(`${FIREBASE_DB_URL}/system_locks/last_session_archive_scan.json`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(4000)
    }).catch(() => null);

    if (lastScanRes && lastScanRes.ok) {
      const lastScanData = await lastScanRes.json().catch(() => null);
      if (lastScanData && typeof lastScanData.timestamp === 'number') {
        if (now - lastScanData.timestamp < GLOBAL_SCAN_COOLDOWN_MS) {
          return { success: true, exportedCount: 0, skipped: true, reason: 'global_rtdb_cooldown' };
        }
      }
    }

    // 2. Check and acquire distributed lock in Firebase RTDB
    const lockCheckRes = await fetch(`${FIREBASE_DB_URL}/system_locks/session_archive_lock.json`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(4000)
    }).catch(() => null);

    if (lockCheckRes && lockCheckRes.ok) {
      const currentLock = await lockCheckRes.json().catch(() => null);
      if (currentLock && typeof currentLock.lockedAt === 'number') {
        if (now - currentLock.lockedAt < LOCK_TTL_MS) {
          return { success: true, exportedCount: 0, skipped: true, reason: 'lock_held_by_another_worker' };
        }
      }
    }

    // Acquire lock
    await fetch(`${FIREBASE_DB_URL}/system_locks/session_archive_lock.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lockedAt: now, workerId }),
      signal: AbortSignal.timeout(4000)
    }).catch(() => null);
    hasAcquiredDistributedLock = true;

    // 3. Scan sessions from Firebase RTDB
    const listUrl = `${FIREBASE_DB_URL}/chat_sessions.json`;
    const res = await fetch(listUrl, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (!res.ok) return { success: false, exportedCount: 0 };

    const data = await res.json();
    if (!data || typeof data !== 'object') return { success: true, exportedCount: 0 };

    let exportedCount = 0;
    let silentlyArchivedCount = 0;
    const sessionEntries = Object.entries(data);

    for (const [key, session] of sessionEntries) {
      if (!session || typeof session !== 'object') continue;

      // Skip if already exported, archived, or currently processing
      if (session.exportedToTelegram || session.status === 'archived' || exportingSessionKeys.has(key)) {
        continue;
      }

      const totalMsgs = Array.isArray(session.messages) ? session.messages.length : (session.messageCount || 0);
      const violations = session.violationsCount || 0;

      // Skip sessions with zero messages
      if (totalMsgs === 0) {
        continue;
      }

      const lastActive = session.lastActiveAt || session.createdAt || 0;
      const inactiveDuration = now - lastActive;

      // Only process sessions inactive for >= 1 hour
      if (inactiveDuration >= ONE_HOUR_MS) {
        exportingSessionKeys.add(key);

        try {
          // ANTI-SPAM FILTER:
          // If session has fewer than 3 messages (e.g. 1 user turn, 1 bot turn) and ZERO violations,
          // archive it silently in the database WITHOUT spamming Telegram with tiny useless log files!
          const isTrivialSession = totalMsgs < 3 && violations === 0;

          if (isTrivialSession) {
            await fetch(`${FIREBASE_DB_URL}/chat_sessions/${sanitizeKey(key)}.json`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                status: 'archived',
                exportedToTelegram: true,
                exportedAt: now,
                archiveType: 'silent_trivial'
              })
            });
            silentlyArchivedCount++;
            continue;
          }

          // If reached max exports for this batch, stop to prevent Telegram notification spam
          if (exportedCount >= MAX_EXPORTS_PER_RUN) {
            break;
          }

          // Atomically pre-reserve this session in Firebase RTDB before sending to Telegram
          // This eliminates race conditions across different workers
          const patchRes = await fetch(`${FIREBASE_DB_URL}/chat_sessions/${sanitizeKey(key)}.json`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: 'archived',
              exportedToTelegram: true,
              exportedAt: now,
              archiveType: 'telegram_document'
            })
          });

          if (!patchRes.ok) {
            continue;
          }

          // Export full JSON log file to Telegram
          const exportSuccess = await exportSingleSessionToTelegram(session);
          if (exportSuccess) {
            exportedCount++;
            // Pause 2.5 seconds between documents to prevent Telegram rate limit or message spam
            await sleep(INTER_DOC_DELAY_MS);
          }
        } catch (exportErr) {
          console.error(`[SessionManager] Error exporting session ${key}:`, exportErr.message);
        } finally {
          exportingSessionKeys.delete(key);
        }
      }
    }

    // Record last global scan timestamp
    await fetch(`${FIREBASE_DB_URL}/system_locks/last_session_archive_scan.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: now,
        exportedCount,
        silentlyArchivedCount
      })
    }).catch(() => null);

    return { success: true, exportedCount, silentlyArchivedCount };
  } catch (err) {
    console.error('[SessionManager] Failed to scan inactive sessions:', err.message);
    return { success: false, error: err.message };
  } finally {
    // Release distributed lock
    if (hasAcquiredDistributedLock) {
      await fetch(`${FIREBASE_DB_URL}/system_locks/session_archive_lock.json`, {
        method: 'DELETE'
      }).catch(() => null);
    }
    isExportRunningLocal = false;
  }
}

/**
 * Helper to format session JSON file and send via Telegram sendDocument with rich caption
 * Uses unique chronological file names so identical file names never collide or duplicate
 * Strictly ZERO parentheses and ZERO brackets in all Khmer text!
 */
async function exportSingleSessionToTelegram(session) {
  const fileContent = JSON.stringify(session, null, 2);
  const cleanUser = (session.username || 'User').replace(/[^a-zA-Z0-9_\u1780-\u17FF]/g, '_');

  // Human-readable date and time in Cambodia timezone YYYYMMDD_HHmm
  const sessionDate = new Date(session.createdAt || session.lastActiveAt || Date.now());
  const datePart = sessionDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Phnom_Penh' }).replace(/-/g, '');
  const timePart = sessionDate.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Phnom_Penh',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  }).replace(':', '');

  // 6-character unique suffix from sessionId to guarantee absolute filename uniqueness
  const rawId = String(session.sessionId || '').replace(/[^a-zA-Z0-9]/g, '');
  const uniqueHash = rawId.length >= 6 ? rawId.slice(-6) : Math.random().toString(36).slice(2, 8);
  const fileName = `SETEC_Session_${cleanUser}_${datePart}_${timePart}_${uniqueHash}.json`;

  const botTitle =
    session.bot === 'konpov'
      ? '🤖 Chatbot កូនពៅ ចែ Mommy'
      : session.bot === 'konkandal'
      ? '🤖 Chatbot កូនកណ្ដាល ប្អូនទី២'
      : '🤖 Chatbot កូនច្បង រៀមច្បង IT';

  const totalMsgs = session.messages?.length || session.messageCount || 0;
  const violations = session.violationsCount || 0;
  const deviceSum = session.identity?.summary || 'Unknown Device';
  const ip = session.identity?.ip || 'Unknown';
  const startAt = session.createdAtFormatted || getCambodiaTime(new Date(session.createdAt || Date.now()));
  const lastActive = session.lastActiveFormatted || getCambodiaTime(new Date(session.lastActiveAt || Date.now()));

  const caption =
    `📁 <b>របាយការណ៍ Session ចប់ការជជែក Chat Session Archive 1h Inactive</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `👤 <b>អ្នកជជែក:</b> <b>${escapeHtml(session.username || 'User')}</b> ភេទ ${escapeHtml(session.gender || 'ប្រុស')}\n` +
    `🤖 <b>ដៃគូជជែក:</b> ${botTitle}\n` +
    `💬 <b>ចំនួនសារសរុប:</b> <b>${totalMsgs}</b> សារ\n` +
    `🚨 <b>ការល្មើស / Jailbreak:</b> <b>${violations}</b> ដង\n` +
    `📱 <b>ឧបករណ៍:</b> ${escapeHtml(deviceSum)}\n` +
    `🌍 <b>IP Address:</b> <code>${escapeHtml(ip)}</code>\n` +
    `⏰ <b>ចាប់ផ្តើម:</b> ${startAt}\n` +
    `🏁 <b>សកម្មភាពចុងក្រោយ:</b> ${lastActive}\n` +
    `⏳ <b>ស្ថានភាព:</b> បានបញ្ចប់ និងអសកម្មលើសពី ១ ម៉ោង 1 Hour Inactive Archived\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `📎 <i>ឯកសារ Logs ពេញលេញ .json នៃ Session នេះត្រូវបានរក្សាទុក និងផ្ញើជូនខាងក្រោម៖</i>`;

  return sendTelegramDocument({
    fileBuffer: Buffer.from(fileContent, 'utf-8'),
    fileName,
    caption,
    topicKey: TOPIC_KEYS.FILES
  });
}
