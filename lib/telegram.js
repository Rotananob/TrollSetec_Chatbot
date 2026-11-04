// lib/telegram.js
// Centralized Telegram Alert & Notification Service for SETEC Chatbot System

const TELEGRAM_BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN || '9061027497:AAFgvslEcPqRlqNfPlKzGyCjQj1G61HXzDk';
const TELEGRAM_CHAT_ID =
  process.env.TELEGRAM_CHAT_ID || '5969566967';

// Get current date/time string in Cambodia Timezone (UTC+7 / Asia/Phnom_Penh)
export function getCambodiaTime(date = new Date()) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Phnom_Penh',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(date);
}

// Get day key in Cambodia timezone (YYYY-MM-DD) for 12:00 AM - 11:59 PM tracking
export function getCambodiaDayKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Phnom_Penh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date); // outputs YYYY-MM-DD
  return parts;
}

// Helper to parse User-Agent into clean device, OS, and browser names
export function parseUserAgent(ua = '') {
  let os = 'Unknown OS';
  let browser = 'Unknown Browser';
  let deviceType = 'Desktop';

  if (/iPhone/i.test(ua)) {
    os = 'iOS (iPhone)';
    deviceType = 'Mobile';
  } else if (/iPad/i.test(ua)) {
    os = 'iPadOS (iPad)';
    deviceType = 'Tablet';
  } else if (/Android/i.test(ua)) {
    os = 'Android';
    deviceType = 'Mobile';
  } else if (/Windows/i.test(ua)) {
    os = 'Windows PC';
    deviceType = 'Desktop';
  } else if (/Macintosh|Mac OS/i.test(ua)) {
    os = 'macOS';
    deviceType = 'Desktop';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
    deviceType = 'Desktop';
  }

  if (/CriOS/i.test(ua)) {
    browser = 'Chrome iOS';
  } else if (/FxiOS/i.test(ua)) {
    browser = 'Firefox iOS';
  } else if (/Chrome|Chromium/i.test(ua) && !/Edge|Edg/i.test(ua)) {
    browser = 'Chrome';
  } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    browser = 'Safari';
  } else if (/Firefox/i.test(ua)) {
    browser = 'Firefox';
  } else if (/Edg/i.test(ua)) {
    browser = 'Edge';
  }

  return { os, browser, deviceType, summary: `${deviceType} • ${os} • ${browser}` };
}

// Send an HTML message to the Telegram Bot (Non-blocking)
export async function sendTelegramMessage(htmlText) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('[Telegram] Token or Chat ID not configured');
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: htmlText,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
    const data = await res.json();
    return data.ok;
  } catch (err) {
    console.error('[Telegram] Failed to send alert:', err.message);
    return false;
  }
}

// 1. Alert: New Visitor Session
export async function alertNewVisitor({ count, path, ip, userAgent, username, screen, referrer }) {
  const time = getCambodiaTime();
  const parsed = parseUserAgent(userAgent);
  const userTag = username && username !== 'Guest' ? `👤 <b>ឈ្មោះ:</b> <b>${escapeHtml(username)}</b>\n` : '';
  const refTag = referrer ? `🔗 <b>Referrer:</b> <code>${escapeHtml(referrer.slice(0, 50))}</code>\n` : '';

  const message =
    `👁️ <b>អ្នកទស្សនាថ្មី (New Visitor Session)</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `🔢 <b>ចំនួនទស្សនាថ្ងៃនេះ:</b> <b>#${count}</b> ដង (12:00 AM - 11:59 PM)\n` +
    `${userTag}` +
    `🌐 <b>Page:</b> <code>${escapeHtml(path || '/')}</code>\n` +
    `📱 <b>Device:</b> ${parsed.summary} ${screen ? `(${screen})` : ''}\n` +
    `🌍 <b>IP:</b> <code>${escapeHtml(ip || 'Unknown')}</code>\n` +
    `${refTag}` +
    `⏰ <b>ម៉ោង:</b> ${time} (Cambodia Time)\n` +
    `━━━━━━━━━━━━━━━━━━`;

  return sendTelegramMessage(message);
}

// 2. Alert: Daily Visitor Summary Report (Sent at midnight or on-demand)
export async function alertDailyVisitorReport({ dateStr, totalVisits, uniqueDevices, topPages }) {
  const time = getCambodiaTime();
  const pageList = (topPages || [])
    .slice(0, 5)
    .map((p, i) => `  ${i + 1}. <code>${escapeHtml(p.path)}</code>: ${p.count} ដង`)
    .join('\n');

  const message =
    `📊 <b>របាយការណ៍សរុបប្រចាំថ្ងៃ (Daily Visitor Summary)</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `📅 <b>កាលបរិច្ឆេទ:</b> ${dateStr}\n` +
    `📈 <b>ចំនួនអ្នកទស្សនាសរុប:</b> <b>${totalVisits}</b> ដង\n` +
    `📱 <b>ឧបករណ៍ផ្សេងគ្នា (Unique Devices):</b> <b>${uniqueDevices}</b> គ្រឿង\n` +
    `📄 <b>ទំព័រដែលមានអ្នកចូលច្រើន:</b>\n${pageList || '  (ទំព័រដើម)'}\n` +
    `🔄 <b>កំណត់ឡើងវិញ:</b> ចំនួនរាប់បាន Reset មក 0 សម្រាប់ថ្ងៃថ្មី!\n` +
    `⏰ <b>ម៉ោងបញ្ជូន:</b> ${time}\n` +
    `━━━━━━━━━━━━━━━━━━`;

  return sendTelegramMessage(message);
}

// 3. Alert: Real-time User Chatting with Chatbot
export async function alertChatActivity({ username, gender, bot, ip, userAgent, prompt, isError = false }) {
  const time = getCambodiaTime();
  const parsed = parseUserAgent(userAgent);
  const botName =
    bot === 'konpov'
      ? '🤖 Chatbot កូនពៅ (Gen Z Male/Daddy)'
      : '🤖 Chatbot កូនច្បង (Senior Moderator)';

  const promptSnippet = (prompt || '').slice(0, 100).replace(/\n/g, ' ');

  const message =
    `💬 <b>សកម្មភាពឆាតថ្មី (User Chatting)</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `👤 <b>User:</b> <b>${escapeHtml(username || 'Anonymous')}</b> ${gender ? `(${gender})` : ''}\n` +
    `🤖 <b>Bot:</b> ${botName}\n` +
    `💭 <b>សារ User:</b> <i>"${escapeHtml(promptSnippet)}"</i>\n` +
    `📱 <b>Device:</b> ${parsed.summary}\n` +
    `🌍 <b>IP:</b> <code>${escapeHtml(ip || 'Unknown')}</code>\n` +
    `⚡ <b>Status:</b> ${isError ? '❌ Error' : '✅ ដំណើរការជោគជ័យ'}\n` +
    `⏰ <b>ម៉ោង:</b> ${time}\n` +
    `━━━━━━━━━━━━━━━━━━`;

  return sendTelegramMessage(message);
}

// 4. Alert: Security & Spam / DDoS Rate Limit Triggered
export async function alertSecuritySpam({ username, ip, userAgent, bot, retryAfter, prompt }) {
  const time = getCambodiaTime();
  const parsed = parseUserAgent(userAgent);
  const promptSnippet = (prompt || '').slice(0, 100).replace(/\n/g, ' ');

  const message =
    `🚨 <b>SECURITY ALERT: រកឃើញការ SPAM / RATE LIMIT!</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `⚠️ <b>ព្រឹត្តិការណ៍:</b> ផ្ញើសារលើសកម្រិតកំណត់ (Too Many Requests - 429)\n` +
    `👤 <b>User Name:</b> <b>${escapeHtml(username || 'Unknown')}</b>\n` +
    `🤖 <b>Chatbot គោលដៅ:</b> ${bot || 'Unknown'}\n` +
    `💬 <b>សារដែល Spam:</b> <i>"${escapeHtml(promptSnippet)}"</i>\n` +
    `🌍 <b>IP Spammer:</b> <code>${escapeHtml(ip || 'Unknown')}</code>\n` +
    `📱 <b>Device Info:</b> ${parsed.summary}\n` +
    `🛑 <b>ចំណាត់ការ:</b> ប្រព័ន្ធបាន Block រយៈពេល <b>${retryAfter} វិនាទី</b>!\n` +
    `⏰ <b>ម៉ោង:</b> ${time}\n` +
    `━━━━━━━━━━━━━━━━━━`;

  return sendTelegramMessage(message);
}

// 5. Alert: System & Voice & API Errors
export async function alertSystemError({ type, username, bot, ip, userAgent, errorMessage, details }) {
  const time = getCambodiaTime();
  const parsed = parseUserAgent(userAgent);

  const message =
    `💥 <b>SYSTEM ERROR DETECTED!</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `⚠️ <b>ប្រភេទ Error:</b> <b>${escapeHtml(type || 'Unknown Error')}</b>\n` +
    `👤 <b>User:</b> <b>${escapeHtml(username || 'Unknown')}</b>\n` +
    `🤖 <b>Bot:</b> ${bot || 'N/A'}\n` +
    `📝 <b>សារ Error:</b> <code>${escapeHtml((errorMessage || '').slice(0, 200))}</code>\n` +
    `🌍 <b>IP:</b> <code>${escapeHtml(ip || 'Unknown')}</code>\n` +
    `📱 <b>Device:</b> ${parsed.summary}\n` +
    `${details ? `🔍 <b>Details:</b> <code>${escapeHtml(JSON.stringify(details).slice(0, 150))}</code>\n` : ''}` +
    `⏰ <b>ម៉ោង:</b> ${time}\n` +
    `━━━━━━━━━━━━━━━━━━`;

  return sendTelegramMessage(message);
}

// Helper to escape HTML characters for Telegram HTML format
function escapeHtml(text = '') {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
