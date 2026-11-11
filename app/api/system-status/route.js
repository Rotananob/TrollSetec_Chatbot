// app/api/system-status/route.js
// Real-time System Status & Admin Control Switch API
export const dynamic = 'force-dynamic';

import {
  getSystemControlState,
  updateSystemControlState,
  evaluateSystemRest,
  getCambodiaHour
} from '../../../lib/systemControl.js';
import { verifyRotanaMasterCode, verifySessionBypassCode } from '../../../lib/masterAuth.js';
import { flushAllRateLimits, getClientIp } from '../../../lib/rateLimit.js';
import {
  resetAllAiEngineHealth,
  getApiKeysHealthSummary,
  fetchAiIncidentsFromRTDB,
  resolveAllAiIncidentsInRTDB,
  clearResolvedAiIncidentsInRTDB
} from '../../../lib/aiHealth.js';
import { alertSystemControlChange, alertSecuritySpam } from '../../../lib/telegram.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE, PATCH',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-device-id, x-session-id, x-user-age, x-rotana-secret-key, x-rotana-bypass, x-rotana-passcode, x-bypass-code, X-Requested-With, Accept, Origin, Range, Cache-Control, *',
  'Access-Control-Max-Age': '86400',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'X-Engine': 'setec-control-core-v3',
  'X-Powered-By': 'SETEC Cloud Gateway'
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET(req) {
  try {
    const ua = (req.headers.get('user-agent') || '').toLowerCase();
    if (
      !ua ||
      ua.length < 5 ||
      /(^|[^a-z0-9])(curl|wget|python|aiohttp|httpx|httpie|urllib|requests|scrapy|postman|postmanruntime|insomnia|go-http-client|axios|node-fetch|undici|got|superagent|libwww|scapy|sqlmap|nikto|masscan|nmap|zgrab|censys|shodan|headless|phantomjs|selenium|puppeteer|playwright|cypress|wrk|vegeta|locust|apachebench|ab\/|restsharp|okhttp|dart|httpclient|apache-httpclient|powershell|invoke-webrequest|invoke-restmethod)($|[^a-z0-9])/i.test(
        ua
      )
    ) {
      return Response.json(
        { ok: false, error: 'Forbidden: Bot or cURL blocked' },
        { status: 403, headers: corsHeaders }
      );
    }

    const { searchParams } = new URL(req.url);
    const forceFresh = searchParams.get('fresh') === 'true';
    const state = await getSystemControlState(forceFresh);
    const evaluation = evaluateSystemRest(state);
    const cambodiaHour = getCambodiaHour();

    const adminPass = (req.headers.get('x-rotana-passcode') || '').trim();
    const isAdminCaller = adminPass ? verifyRotanaMasterCode(adminPass) : false;

    const payload = {
      ok: true,
      state,
      evaluation,
      cambodiaHour,
      serverTime: Date.now()
    };

    if (isAdminCaller) {
      payload.aiEngineHealth = getApiKeysHealthSummary();
      payload.aiIncidents = await fetchAiIncidentsFromRTDB(35);
    }

    return Response.json(payload, { status: 200, headers: corsHeaders });
  } catch (error) {
    return Response.json(
      { ok: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(req) {
  const clientIp = getClientIp(req);

  try {
    const body = await req.json().catch(() => ({}));
    const authHeader = req.headers.get('authorization') || '';
    const passcodeHeader = req.headers.get('x-rotana-passcode') || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

    // Action: Public Maintenance Bypass Verification (Used by Maintenance Screen)
    if (body.action === 'verify-bypass') {
      const candidateCode = String(body.code || '').trim();
      const state = await getSystemControlState();
      const configuredBypass = state?.maintenanceBypassCode || 'rotana2026';
      const isValid =
        verifySessionBypassCode(candidateCode, configuredBypass) ||
        (configuredBypass && candidateCode.toLowerCase() === configuredBypass.toLowerCase());

      return Response.json(
        {
          ok: true,
          valid: !!isValid,
          message: isValid ? 'Bypass code verified successfully.' : 'Invalid bypass code.'
        },
        { status: 200, headers: corsHeaders }
      );
    }

    const candidatePasscode = String(
      body.passcode || body.code || passcodeHeader || bearerToken || ''
    ).trim();

    // Verify Master Authentication against Rotana secret code
    if (!verifyRotanaMasterCode(candidatePasscode)) {
      alertSecuritySpam({
        username: 'Admin Intruder Attempt',
        ip: clientIp,
        userAgent: req.headers.get('user-agent') || 'Unknown',
        bot: 'Admin Control Gateway (/jam-tic-kapea-1-sin)',
        retryAfter: 300,
        prompt: `Attempted Passcode: "${candidatePasscode.slice(0, 3)}***"`,
        violationType: '🚨 Unauthorized Admin Login Breach Attempt'
      }).catch((e) => console.error('[Telegram] Alert error:', e));

      return Response.json(
        {
          ok: false,
          error: 'Unauthorized',
          message: 'Invalid Master Passcode. Access Restricted to Creator Rotana NOB.'
        },
        { status: 401, headers: corsHeaders }
      );
    }

    const { action, patch } = body;

    // Action 1: Flush All Rate Limits and Session Lockouts
    if (action === 'flush-limits') {
      const stats = flushAllRateLimits();
      alertSystemControlChange({
        action: 'Flushed All Rate Limits & Session Lockouts',
        details: stats,
        by: 'Rotana NOB',
        ip: clientIp
      }).catch((e) => console.error('[Telegram] Alert error:', e));

      return Response.json(
        {
          ok: true,
          message: 'All IP bans, rate limits, and chat session lockouts flushed successfully.',
          stats
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // Action 1b: 1-Click Fix AI Engine (Reset Key Cooldowns + Flush Locks + Resolve Incidents + Broadcast Recovery)
    if (action === 'fix-ai-engine') {
      const aiReset = resetAllAiEngineHealth();
      const limitStats = flushAllRateLimits();
      const incidentResult = await resolveAllAiIncidentsInRTDB(body.incidentId || null);
      const current = await getSystemControlState(true);
      const nextRecoveryVersion = (Number(current?.aiRecoveryVersion) || 1) + 1;
      const updatedState = await updateSystemControlState(
        {
          serverOnline: true,
          maintenanceMode: false,
          konbongActive: true,
          konpovActive: true,
          aiRecoveryVersion: nextRecoveryVersion,
          lastAiRecoveryAt: Date.now()
        },
        'Rotana NOB'
      );

      const aiEngineHealth = getApiKeysHealthSummary();
      const aiIncidents = await fetchAiIncidentsFromRTDB(35);

      alertSystemControlChange({
        action: '1-Click Fix AI Engine (Reset Keys, Flush Locks, Resume Chat)',
        details: { aiReset, limitStats, incidentResult, aiRecoveryVersion: nextRecoveryVersion },
        by: 'Rotana NOB',
        ip: clientIp
      }).catch((e) => console.error('[Telegram] Alert error:', e));

      return Response.json(
        {
          ok: true,
          message: 'ប្រព័ន្ធ AI Key Cooldowns និង Session Locks ត្រូវបានជួសជុល និងស្ដារឡើងវិញភ្លាមៗ!',
          aiReset,
          limitStats,
          incidentResult,
          aiEngineHealth,
          aiIncidents,
          state: updatedState,
          evaluation: evaluateSystemRest(updatedState)
        },
        { status: 200, headers: corsHeaders }
      );
    }

    if (action === 'resolve-incident') {
      const incidentResult = await resolveAllAiIncidentsInRTDB(body.incidentId || null);
      const aiIncidents = await fetchAiIncidentsFromRTDB(35);
      return Response.json(
        {
          ok: true,
          incidentResult,
          aiIncidents,
          aiEngineHealth: getApiKeysHealthSummary()
        },
        { status: 200, headers: corsHeaders }
      );
    }

    if (action === 'clear-incidents') {
      const clearResult = await clearResolvedAiIncidentsInRTDB();
      const aiIncidents = await fetchAiIncidentsFromRTDB(35);
      return Response.json(
        {
          ok: true,
          clearResult,
          aiIncidents
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // Action 2: Update System Control State (Toggles, Schedules, Broadcasts)
    const allowedKeys = [
      'serverOnline',
      'maintenanceMode',
      'maintenanceReason',
      'maintenanceBypassCode',
      'nightScheduleEnabled',
      'nightStartHour',
      'nightEndHour',
      'nightRestMessage',
      'konbongActive',
      'konpovActive',
      'sessionLimitActive',
      'broadcastNotice',
      'aiRecoveryVersion',
      'lastAiRecoveryAt'
    ];

    const cleanPatch = {};
    const inputPatch = patch || body;

    for (const key of allowedKeys) {
      if (inputPatch[key] !== undefined) {
        cleanPatch[key] = inputPatch[key];
      }
    }

    const updatedState = await updateSystemControlState(cleanPatch, 'Rotana NOB');
    const evaluation = evaluateSystemRest(updatedState);

    alertSystemControlChange({
      action: action || 'Updated System Control Parameters',
      details: cleanPatch,
      by: 'Rotana NOB',
      ip: clientIp
    }).catch((e) => console.error('[Telegram] Alert error:', e));

    return Response.json(
      {
        ok: true,
        message: 'System state updated successfully.',
        state: updatedState,
        evaluation,
        cambodiaHour: getCambodiaHour(),
        serverTime: Date.now()
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[SystemStatus API Error]:', error);
    return Response.json(
      { ok: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
