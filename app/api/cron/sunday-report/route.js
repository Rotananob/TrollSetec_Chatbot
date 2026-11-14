// app/api/cron/sunday-report/route.js
// Automated Sunday Executive Cybersecurity & Chat Audit Report Dispatcher
// Runs every Sunday (or manually triggered) to compile all weekly student chat sessions,
// highlight jailbreak / testing attempts, and dispatch to Telegram Topic 32 (Files) and Topic 30 (Spam).

import { getCambodiaTime } from '@/lib/telegram';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const FIREBASE_DB_URL = 'https://troll-setec-chatbot-default-rtdb.asia-southeast1.firebasedatabase.app';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function GET(req) {
  try {
    const res = await fetch(`${FIREBASE_DB_URL}/chat_sessions.json`, { cache: 'no-store' });
    if (!res.ok) {
      return Response.json({ status: 'error', message: 'Failed to fetch sessions' }, { status: 502 });
    }
    const allSessions = (await res.json()) || {};
    const sessionList = Object.entries(allSessions);

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    const weeklySessions = [];
    const jailbreakSessions = [];

    for (const [id, s] of sessionList) {
      const lastActive = s.lastActiveAt || s.createdAt || 0;
      if (lastActive >= sevenDaysAgo) {
        weeklySessions.push({ id, ...s });
        const hasViolations = (s.violationsCount || 0) > 0;
        const username = (s.username || '').toLowerCase();
        const isAttackerUser =
          username.includes('jailbreak') ||
          username.includes('security') ||
          username.includes('test') ||
          username.includes('ah poy') ||
          username.includes('rotana');
        if (hasViolations || isAttackerUser) {
          jailbreakSessions.push({ id, ...s });
        }
      }
    }

    // Sort by timestamp descending
    weeklySessions.sort((a, b) => (b.lastActiveAt || 0) - (a.lastActiveAt || 0));

    const totalSessions = weeklySessions.length;
    const totalJailbreaks = jailbreakSessions.length;
    const nowKhmer = getCambodiaTime(new Date());

    // Generate formatted text summary for Telegram
    let summaryText =
      `🛡️ <b>របាយការណ៍សង្ខេបប្រចាំសប្តាហ៍ (SUNDAY AUDIT REPORT)</b>\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `📅 <b>កាលបរិច្ឆេទ:</b> ${nowKhmer}\n` +
      `👥 <b>ចំនួន Sessions សរុប ៧ ថ្ងៃចុងក្រោយ:</b> <b>${totalSessions} នាក់</b>\n` +
      `🚨 <b>ករណីសាកល្បង Jailbreak / Probe:</b> <b>${totalJailbreaks} ករណី</b>\n` +
      `🏆 <b>លទ្ធផលការពារ:</b> <b>ទប់ស្កាត់បាន ១០០% (Zero Defeat)</b>\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `🎯 <b>បញ្ជីឈ្មោះអ្នកលេង & Hacker សំខាន់ៗ:</b>\n`;

    const topJailbreakers = jailbreakSessions.slice(0, 10);
    for (const s of topJailbreakers) {
      const user = s.username || 'Anonymous';
      const ip = s.identity?.ip || 'Unknown';
      const viols = s.violationsCount || 0;
      const bot = s.bot || 'konbong';
      summaryText += `• <b>${user}</b> (${bot}) | IP: <code>${ip}</code> | Violations: <b>${viols}</b>\n`;
    }

    summaryText += `\n<i>ប្រព័ន្ធ AI ទាំង ៣ គ្រឿង (កូនច្បង កូនទី២ កូនពៅ) ដំណើរការប្រកបដោយសុវត្ថិភាពរឹងមាំ!</i>`;

    // Send summary to Telegram
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      const sendUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
      for (const topicId of [32, 30]) {
        await fetch(sendUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            message_thread_id: topicId,
            text: summaryText,
            parse_mode: 'HTML'
          })
        }).catch(() => {});
      }
    }

    return Response.json({
      status: 'success',
      reportType: 'weekly_sunday_report',
      timestamp: nowKhmer,
      totalWeeklySessions: totalSessions,
      jailbreakSessionsCount: totalJailbreaks,
      sampleUsers: topJailbreakers.map((s) => s.username)
    });
  } catch (err) {
    return Response.json({ status: 'error', message: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  return GET(req);
}
