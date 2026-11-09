// app/api/track/route.js
// Visitor Analytics & Session Tracking with Telegram Alerts & Persistent Firebase RTDB Count
export const dynamic = 'force-dynamic';

import {
  alertNewVisitor,
  alertDailyVisitorReport,
  alertPwaInstall,
  alertUserReportedIssue,
  alertDevContribution,
  alertNewChatSession,
  getCambodiaDayKey,
  getCambodiaTime,
  sendTelegramMessage,
  TOPIC_KEYS
} from '../../../lib/telegram';
import {
  checkDDoSFirewall,
  checkTrackLimit,
  getClientIp
} from '../../../lib/rateLimit';
import {
  createServerLiveBypassToken,
  verifyServerLiveBypassToken
} from '../../../lib/masterAuth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-rotana-passcode, x-device-id, x-session-id, x-requested-with',
  'X-Engine': 'setec-telemetry-core-v3',
  'X-Powered-By': 'SETEC Security Gateway v3.8',
  'Server': 'SETEC-Cloud-Gateway'
};

const FIREBASE_DB_URL = 'https://troll-setec-chatbot-default-rtdb.asia-southeast1.firebasedatabase.app';

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

// 5-Minute Window Rule:
// Visits from the same device within 5 minutes do not re-increment.
// If the user leaves for >= 5 minutes and returns, count as a new view (even on the same device).
const FIVE_MINUTES_MS = 5 * 60 * 1000;

// Session map: deviceKey -> lastVisitTimestamp
const sessionMap = new Map();

// Periodic cleanup of session entries older than 15 minutes to keep memory slim
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, timestamp] of sessionMap.entries()) {
      if (now - timestamp > 15 * 60 * 1000) {
        sessionMap.delete(key);
      }
    }
  }, 10 * 60 * 1000);
}

// In-memory fallback state in case of network blips
let currentDayKey = getCambodiaDayKey();
let localDailyVisits = 0;
const localUniqueDevices = new Set();
const localTopPages = new Map();

// Fetch persistent daily stats from Firebase RTDB with in-memory fallback
async function fetchDailyStats(dayKey) {
  try {
    const url = `${FIREBASE_DB_URL}/visitor_stats/${dayKey}.json`;
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object') {
        return {
          totalVisits: Number(data.totalVisits) || 0,
          uniqueDevices: data.uniqueDevices && typeof data.uniqueDevices === 'object' ? data.uniqueDevices : {},
          topPages: data.topPages && typeof data.topPages === 'object' ? data.topPages : {}
        };
      }
    }
  } catch {}

  return {
    totalVisits: localDailyVisits,
    uniqueDevices: {},
    topPages: {}
  };
}

// Persist and increment visit count in Firebase RTDB
async function recordVisitInFirebase(dayKey, deviceId, path) {
  try {
    const current = await fetchDailyStats(dayKey);
    const newTotal = (current.totalVisits || 0) + 1;

    const cleanDevKey = (deviceId || 'anon').replace(/[.#$[\]/]/g, '_');
    const updatedDevices = { ...current.uniqueDevices, [cleanDevKey]: Date.now() };

    const safePath = (path || '/').replace(/[.#$[\]/]/g, '_');
    const updatedTopPages = {
      ...current.topPages,
      [safePath]: ((current.topPages && current.topPages[safePath]) || 0) + 1
    };

    const payload = {
      dayKey,
      totalVisits: newTotal,
      uniqueDevicesCount: Object.keys(updatedDevices).length,
      uniqueDevices: updatedDevices,
      topPages: updatedTopPages,
      lastUpdated: Date.now()
    };

    const url = `${FIREBASE_DB_URL}/visitor_stats/${dayKey}.json`;
    await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3000)
    });

    localDailyVisits = newTotal;
    return {
      totalVisits: newTotal,
      uniqueCount: Object.keys(updatedDevices).length
    };
  } catch (err) {
    localDailyVisits++;
    if (deviceId) localUniqueDevices.add(deviceId);
    return {
      totalVisits: localDailyVisits,
      uniqueCount: localUniqueDevices.size
    };
  }
}

// Helper to check and handle day rollover (12:00 AM to 11:59 PM Cambodia Time)
async function checkDayRollover() {
  const todayKey = getCambodiaDayKey();
  if (todayKey !== currentDayKey) {
    const prevDate = currentDayKey;

    try {
      const prevStats = await fetchDailyStats(prevDate);
      const prevTotal = prevStats.totalVisits || localDailyVisits;
      const prevDevices = Object.keys(prevStats.uniqueDevices || {}).length || localUniqueDevices.size;
      const prevTopPages = Object.entries(prevStats.topPages || {})
        .map(([p, count]) => ({ path: p.replace(/_/g, '/'), count }))
        .sort((a, b) => b.count - a.count);

      if (prevTotal > 0) {
        await alertDailyVisitorReport({
          dateStr: prevDate,
          totalVisits: prevTotal,
          uniqueDevices: prevDevices,
          topPages: prevTopPages
        }).catch((e) => console.error('[Track] Daily report error:', e));
      }
    } catch {}

    currentDayKey = todayKey;
    localDailyVisits = 0;
    localUniqueDevices.clear();
    localTopPages.clear();
  }
}

export async function POST(req) {
  try {
    // 0a. Payload Size Guard
    const contentLength = parseInt(req.headers.get('content-length') || '0', 10);
    if (contentLength > 512 * 1024) {
      return Response.json(
        { counted: false, reason: 'payload_too_large' },
        { status: 413, headers: corsHeaders }
      );
    }

    const ip = getClientIp(req);
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    // 0b. Anti-DDoS and Burst Flooding Firewall
    const ddosCheck = checkDDoSFirewall(req, 'track');
    if (!ddosCheck.allowed) {
      return Response.json(
        { counted: false, reason: 'rate_limited' },
        { status: 429, headers: corsHeaders }
      );
    }

    if (!checkTrackLimit(ip).allowed) {
      return Response.json(
        { counted: false, reason: 'track_rate_limit' },
        { status: 429, headers: corsHeaders }
      );
    }

    await checkDayRollover();

    const body = await req.json().catch(() => ({}));
    const { deviceId, pathname, screen, referrer, username, type, action, platform, isReturnAfter5Min } = body;

    // Handle PWA Installation Alert (Only when user explicitly added to Home Screen)
    if (type === 'pwa_install' || action === 'pwa_install') {
      await alertPwaInstall({
        username,
        ip,
        userAgent,
        platform,
        screen
      }).catch((e) => console.error('[Track] PWA install alert error:', e));

      return Response.json(
        { success: true, alerted: true, message: 'PWA install recorded and alerted to Telegram' },
        { status: 200, headers: corsHeaders }
      );
    }

    // Handle User Issue Report directly to Rotana NOB
    if (type === 'user_report_issue' || action === 'user_report_issue') {
      const activeSessionId = body.sessionId || `session_${Date.now()}`;
      const botKey = (body.bot || 'konpov').toLowerCase().includes('bong') ? 'konbong' : 'konpov';
      // Securely generate server-signed bypass token using Server Master Passcode
      const secureBypassToken = createServerLiveBypassToken(activeSessionId, botKey);

      await alertUserReportedIssue({
        username,
        issue: body.issue || body.message || 'បញ្ហាទូទៅលើ Chatbot',
        bot: botKey,
        ip,
        userAgent,
        sessionId: activeSessionId,
        bypassToken: secureBypassToken
      }).catch((e) => console.error('[Report] User issue alert error:', e));

      return Response.json(
        {
          success: true,
          sessionId: activeSessionId,
          message: 'Issue reported to Rotana NOB successfully with direct bypass alert'
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // Verify Live Bypass Token securely on the server (Zero Client Secret Leakage)
    if (type === 'verify_live_token' || action === 'verify_live_token') {
      const targetSessionId = body.sessionId || '';
      const targetBot = (body.bot || 'konpov').toLowerCase().includes('bong') ? 'konbong' : 'konpov';
      const targetToken = body.token || '';
      const isValid = verifyServerLiveBypassToken(targetSessionId, targetBot, targetToken);

      return Response.json(
        { valid: isValid },
        { status: 200, headers: corsHeaders }
      );
    }

    // Handle User Contributed SETEC Lore & AI Training Knowledge
    if (type === 'ai_lore_contribution' || action === 'ai_lore_contribution') {
      await alertDevContribution({
        username: body.username || 'Anonymous SETECer',
        category: body.category || 'SETEC Lore & Training',
        content: body.content || '',
        bot: body.bot || 'General Chatbot',
        ip,
        userAgent
      }).catch((e) => console.error('[Track] Lore contribution alert error:', e));

      return Response.json(
        { success: true, message: 'Contribution submitted successfully to Rotana NOB' },
        { status: 200, headers: corsHeaders }
      );
    }

    // Handle User Starting a New Chat (Leaving or resetting old chat) -> Alert Telegram TOPIC CHAT
    if (type === 'new_chat_session' || action === 'new_chat_session') {
      await alertNewChatSession({
        username: username || body.username || 'User',
        bot: body.bot || 'chatbot',
        ip,
        userAgent,
        prevMessageCount: body.prevMessageCount || 0,
        lastUserMessage: body.lastUserMessage || '',
        isClearAll: !!body.isClearAll,
        newSessionId: body.newSessionId
      }).catch((e) => console.error('[Track] New chat session alert error:', e));

      return Response.json(
        { success: true, message: 'New chat session notified to Rotana NOB' },
        { status: 200, headers: corsHeaders }
      );
    }

    // Handle User Requesting Bypass Promo Code from Rotana NOB -> Alert Telegram
    if (type === 'request_bypass_code' || action === 'request_bypass_code') {
      const targetUser = username || body.username || 'User';
      const targetBot = body.bot || 'chatbot';
      const requestId = body.requestId || `req_${Date.now()}`;
      const baseUrl = 'https://troll-setec-chatbot.web.app';
      const adminUrl = `${baseUrl}/jam-tic-kapea-1-sin?tab=promo&req=${encodeURIComponent(requestId)}`;
      const approveUrl = `${baseUrl}/api/bypass-approve?req=${encodeURIComponent(requestId)}&user=${encodeURIComponent(targetUser)}&action=approve`;
      const rejectUrl = `${baseUrl}/api/bypass-approve?req=${encodeURIComponent(requestId)}&user=${encodeURIComponent(targetUser)}&action=reject`;

      const cambodiaTime = getCambodiaTime();
      const message = [
        `🎟️ <b>[សំណើសុំ PROMO CODE BYPASS ពីបង ROTANA]</b>`,
        ``,
        `👤 <b>អ្នកប្រើប្រាស់:</b> <code>${targetUser}</code>`,
        `🤖 <b>Bot:</b> <code>${targetBot}</code>`,
        `📱 <b>Device ID:</b> <code>${deviceId || 'N/A'}</code>`,
        `🌐 <b>IP Address:</b> <code>${ip}</code>`,
        `⏱️ <b>កាលបរិច្ឆេទ:</b> ${cambodiaTime}`,
        `🆔 <b>Request ID:</b> <code>${requestId}</code>`,
        ``,
        `👇 <b>សូមជ្រើសរើសជម្រើសខាងក្រោម៖</b>`
      ].join('\n');

      const extraPayload = {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✍️ បញ្ចូលកូដផ្ទាល់ដៃ (Admin Page)', url: adminUrl }
            ],
            [
              { text: '⚡ Quick Approve (+30 នាទី)', url: approveUrl },
              { text: '❌ បដិសេធ (Reject)', url: rejectUrl }
            ]
          ]
        }
      };

      sendTelegramMessage(message, TOPIC_KEYS.SPAM, extraPayload).catch((e) =>
        console.error('[Track] Bypass request Telegram error:', e)
      );

      return Response.json(
        { success: true, message: 'Bypass request alerted to Rotana NOB' },
        { status: 200, headers: corsHeaders }
      );
    }

    // Isolate by deviceId so multiple students on the same Wi-Fi are never conflated
    const sessionKey = deviceId ? `dev_${deviceId}` : `ip_${ip}`;
    const now = Date.now();
    const lastSession = sessionMap.get(sessionKey);

    // 5-Minute Exit & Return Rule:
    // If visited within 5 minutes without having left, do not re-count
    // If returning after >= 5 minutes of exit/inactivity, count as a brand new view!
    if (lastSession && now - lastSession < FIVE_MINUTES_MS && !isReturnAfter5Min) {
      return Response.json(
        {
          counted: false,
          reason: 'active_session_under_5_minutes',
          dailyVisits: localDailyVisits,
          dayKey: currentDayKey
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // Update active session time
    sessionMap.set(sessionKey, now);

    const path = pathname || '/';
    const recordResult = await recordVisitInFirebase(currentDayKey, deviceId, path);
    const countedTotal = recordResult.totalVisits;

    // Send real-time Telegram alert
    alertNewVisitor({
      count: countedTotal,
      path,
      ip,
      userAgent,
      username,
      screen,
      referrer,
      isReturnAfter5Min: !!isReturnAfter5Min
    }).catch((e) => console.error('[Track] Telegram alert error:', e));

    return Response.json(
      {
        counted: true,
        dailyVisits: countedTotal,
        dayKey: currentDayKey,
        isReturnAfter5Min: !!isReturnAfter5Min
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error('[Track] Error:', err);
    return Response.json(
      { error: err.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function GET(req) {
  await checkDayRollover();
  const url = new URL(req.url);

  const stats = await fetchDailyStats(currentDayKey);

  // Manual trigger for Daily Report
  if (url.searchParams.get('report') === 'daily') {
    const topPages = Object.entries(stats.topPages || {})
      .map(([p, count]) => ({ path: p.replace(/_/g, '/'), count }))
      .sort((a, b) => b.count - a.count);

    await alertDailyVisitorReport({
      dateStr: currentDayKey,
      totalVisits: stats.totalVisits,
      uniqueDevices: Object.keys(stats.uniqueDevices || {}).length,
      topPages
    });

    return Response.json({ success: true, message: 'Daily report sent' }, { headers: corsHeaders });
  }

  return Response.json(
    {
      dayKey: currentDayKey,
      dailyVisits: stats.totalVisits,
      uniqueDevices: Object.keys(stats.uniqueDevices || {}).length,
      activeSessions: sessionMap.size
    },
    { status: 200, headers: corsHeaders }
  );
}
