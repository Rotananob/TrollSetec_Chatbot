// lib/sessionManager.js
// Dedicated Session Logger & 1-Hour Inactivity Telegram Archive Dispatcher
// Stores 1 file/document per chat session into Firebase Realtime Database (/chat_sessions/<sessionId>.json)
// Captures full identity (IP, deviceId, userAgent, OS, browser, username, gender, timestamps)
// Automatically aggregates and sends finished sessions (after 1 hour inactivity) as JSON documents to Telegram

import { getCambodiaTime, parseUserAgent, sendTelegramDocument, TOPIC_KEYS } from './telegram.js';

const FIREBASE_DB_URL = 'https://troll-setec-chatbot-default-rtdb.asia-southeast1.firebasedatabase.app';
const ONE_HOUR_MS = 60 * 60 * 1000; // 1 hour inactivity threshold

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
      exportedToTelegram: false,
      exportedAt: null,
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
 */
export async function checkAndExportInactiveSessions() {
  const now = Date.now();
  try {
    const listUrl = `${FIREBASE_DB_URL}/chat_sessions.json`;
    const res = await fetch(listUrl, { cache: 'no-store', signal: AbortSignal.timeout(6000) });
    if (!res.ok) return { success: false, exportedCount: 0 };

    const data = await res.json();
    if (!data || typeof data !== 'object') return { success: true, exportedCount: 0 };

    let exportedCount = 0;
    const sessionEntries = Object.entries(data);

    for (const [key, session] of sessionEntries) {
      if (!session || typeof session !== 'object') continue;
      // Already exported
      if (session.exportedToTelegram) continue;

      // Has no messages
      if (!session.messages || !Array.isArray(session.messages) || session.messages.length === 0) continue;

      const lastActive = session.lastActiveAt || session.createdAt || 0;
      const inactiveDuration = now - lastActive;

      // Check if inactive for >= 1 hour (3,600,000 ms)
      if (inactiveDuration >= ONE_HOUR_MS) {
        try {
          const exportSuccess = await exportSingleSessionToTelegram(session);
          if (exportSuccess) {
            // Mark as exported in Firebase RTDB
            await fetch(`${FIREBASE_DB_URL}/chat_sessions/${sanitizeKey(key)}.json`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                exportedToTelegram: true,
                exportedAt: now,
                status: 'archived'
              })
            });
            exportedCount++;
          }
        } catch (exportErr) {
          console.error(`[SessionManager] Error exporting session ${key}:`, exportErr.message);
        }
      }
    }

    return { success: true, exportedCount };
  } catch (err) {
    console.error('[SessionManager] Failed to scan inactive sessions:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Helper to format session JSON file and send via Telegram sendDocument with rich caption
 */
async function exportSingleSessionToTelegram(session) {
  const fileContent = JSON.stringify(session, null, 2);
  const cleanUser = (session.username || 'User').replace(/[^a-zA-Z0-9_\u1780-\u17FF]/g, '_');
  const shortId = (session.sessionId || 'session').slice(0, 10);
  const fileName = `SETEC_Session_${cleanUser}_${shortId}.json`;

  const botTitle = session.bot === 'konpov' ? '🤖 Chatbot កូនពៅ (ចែ / Mommy)' : '🤖 Chatbot កូនច្បង (រៀមច្បង IT)';
  const totalMsgs = session.messages?.length || session.messageCount || 0;
  const violations = session.violationsCount || 0;
  const deviceSum = session.identity?.summary || 'Unknown Device';
  const ip = session.identity?.ip || 'Unknown';
  const startAt = session.createdAtFormatted || getCambodiaTime(new Date(session.createdAt || Date.now()));
  const lastActive = session.lastActiveFormatted || getCambodiaTime(new Date(session.lastActiveAt || Date.now()));

  const caption =
    `📁 <b>របាយការណ៍ Session ចប់ការជជែក (Chat Session Archive - 1h Inactive)</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `👤 <b>អ្នកជជែក:</b> <b>${escapeHtml(session.username || 'User')}</b> (${escapeHtml(session.gender || 'ប្រុស')})\n` +
    `🤖 <b>ដៃគូជជែក:</b> ${botTitle}\n` +
    `💬 <b>ចំនួនសារសរុប:</b> <b>${totalMsgs}</b> សារ\n` +
    `🚨 <b>ការល្មើស / Jailbreak:</b> <b>${violations}</b> ដង\n` +
    `📱 <b>ឧបករណ៍:</b> ${escapeHtml(deviceSum)}\n` +
    `🌍 <b>IP Address:</b> <code>${escapeHtml(ip)}</code>\n` +
    `⏰ <b>ចាប់ផ្តើម:</b> ${startAt}\n` +
    `🏁 <b>សកម្មភាពចុងក្រោយ:</b> ${lastActive}\n` +
    `⏳ <b>ស្ថានភាព:</b> បានបញ្ចប់ និងអសកម្មលើសពី ១ ម៉ោង (1 Hour Inactive - Archived)\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `📎 <i>ឯកសារ Logs ពេញលេញ (.json) នៃ Session នេះត្រូវបានរក្សាទុក និងផ្ញើជូនខាងក្រោម៖</i>`;

  return sendTelegramDocument({
    fileBuffer: Buffer.from(fileContent, 'utf-8'),
    fileName,
    caption,
    topicKey: TOPIC_KEYS.FILES
  });
}
