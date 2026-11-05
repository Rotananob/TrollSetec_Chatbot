// app/api/track/route.js
// Visitor Analytics & Session Tracking with Telegram Alerts

import {
  alertNewVisitor,
  alertDailyVisitorReport,
  alertPwaInstall,
  alertUserReportedIssue,
  alertDevContribution,
  getCambodiaDayKey
} from '../../../lib/telegram';
import {
  checkDDoSFirewall,
  checkTrackLimit,
  getClientIp
} from '../../../lib/rateLimit';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-device-id',
  'X-Engine': 'setec-telemetry-core-v3',
  'X-Powered-By': 'SETEC Security Gateway v3.8',
  'Server': 'SETEC-Cloud-Gateway'
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

// In-memory state for visitor tracking
// Resets every day at 12:00 AM midnight (Cambodia Timezone UTC+7)
let currentDayKey = getCambodiaDayKey();
let dailyVisits = 0;
const uniqueDeviceSet = new Set();
const topPageMap = new Map();

// Session map: deviceKey -> lastVisitTimestamp
// 1-Hour window: visits from the same device within 1 hour do not re-increment
const sessionMap = new Map();
const ONE_HOUR_MS = 60 * 60 * 1000;

// Periodic cleanup of session entries older than 2 hours to prevent memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of sessionMap.entries()) {
    if (now - timestamp > 2 * ONE_HOUR_MS) {
      sessionMap.delete(key);
    }
  }
}, 30 * 60 * 1000);

// Helper to check and handle day rollover (12:00 AM to 11:59 PM everyday)
async function checkDayRollover() {
  const todayKey = getCambodiaDayKey();
  if (todayKey !== currentDayKey) {
    const prevDate = currentDayKey;
    const prevTotal = dailyVisits;
    const prevDevices = uniqueDeviceSet.size;
    const prevTopPages = Array.from(topPageMap.entries())
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count);

    // Send daily summary report before resetting
    if (prevTotal > 0) {
      await alertDailyVisitorReport({
        dateStr: prevDate,
        totalVisits: prevTotal,
        uniqueDevices: prevDevices,
        topPages: prevTopPages
      }).catch((e) => console.error('[Track] Daily report error:', e));
    }

    // Reset for new day
    currentDayKey = todayKey;
    dailyVisits = 0;
    uniqueDeviceSet.clear();
    topPageMap.clear();
  }
}

export async function POST(req) {
  try {
    const ip = getClientIp(req);
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    // 0. Anti-DDoS and Burst Flooding Firewall
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
    const { deviceId, pathname, screen, referrer, username, type, action, platform } = body;

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

    // Handle User Issue Report directly to Rotana NOB (With Direct Bypass Support)
    if (type === 'user_report_issue' || action === 'user_report_issue') {
      await alertUserReportedIssue({
        username,
        issue: body.issue || body.message || 'បញ្ហាទូទៅលើ Chatbot',
        bot: body.bot || 'System',
        ip,
        userAgent,
        sessionId: body.sessionId,
        bypassToken: body.bypassToken
      }).catch((e) => console.error('[Report] User issue alert error:', e));

      return Response.json(
        {
          success: true,
          sessionId: body.sessionId,
          message: 'Issue reported to Rotana NOB successfully with direct bypass alert'
        },
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

    const sessionKey = `${ip}_${deviceId || 'anon'}`;
    const now = Date.now();
    const lastSession = sessionMap.get(sessionKey);

    // 1-Hour Session Rule:
    // If entered within 1 hour, do not count again (even across 2 or 3 pages)
    // If entered after 1 hour, count as a new visit even if same device/IP
    if (lastSession && now - lastSession < ONE_HOUR_MS) {
      return Response.json(
        {
          counted: false,
          reason: 'active_session_under_1_hour',
          dailyVisits,
          dayKey: currentDayKey
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // New valid visit session
    sessionMap.set(sessionKey, now);
    dailyVisits++;
    if (deviceId) uniqueDeviceSet.add(deviceId);

    const path = pathname || '/';
    topPageMap.set(path, (topPageMap.get(path) || 0) + 1);

    // Send real-time Telegram alert
    alertNewVisitor({
      count: dailyVisits,
      path,
      ip,
      userAgent,
      username,
      screen,
      referrer
    }).catch((e) => console.error('[Track] Telegram alert error:', e));

    return Response.json(
      {
        counted: true,
        dailyVisits,
        dayKey: currentDayKey
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

  // Manual trigger for Daily Report
  if (url.searchParams.get('report') === 'daily') {
    const topPages = Array.from(topPageMap.entries())
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count);

    await alertDailyVisitorReport({
      dateStr: currentDayKey,
      totalVisits: dailyVisits,
      uniqueDevices: uniqueDeviceSet.size,
      topPages
    });

    return Response.json({ success: true, message: 'Daily report sent' }, { headers: corsHeaders });
  }

  return Response.json(
    {
      dayKey: currentDayKey,
      dailyVisits,
      uniqueDevices: uniqueDeviceSet.size,
      activeSessions: sessionMap.size
    },
    { status: 200, headers: corsHeaders }
  );
}
