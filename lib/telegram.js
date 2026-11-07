// lib/telegram.js
// Centralized Telegram Alert & Forum Topic Notification Service for SETEC Chatbot System

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

// Forum Topic Keys
export const TOPIC_KEYS = {
  SPAM: 'spam',
  VISITS: 'visits',
  CHAT: 'chat',
  MEME: 'meme',
  ERRORS: 'errors',
  CONTRIBUTE: 'contribute',
  FILES: 'files'
};

// Forum Topic Metadata & Colors
// Telegram icon_color values:
// 7322096 (Blue), 16766590 (Yellow), 13338331 (Violet), 9367192 (Green), 16749490 (Pink), 16478047 (Red)
const TOPIC_CONFIG = {
  [TOPIC_KEYS.SPAM]: {
    name: '🚨 Spam & Security Alerts',
    icon_color: 16478047,
    envVar: 'TELEGRAM_TOPIC_SPAM_ID'
  },
  [TOPIC_KEYS.VISITS]: {
    name: '👤 User Visits & Analytics',
    icon_color: 7322096,
    envVar: 'TELEGRAM_TOPIC_VISITS_ID'
  },
  [TOPIC_KEYS.CHAT]: {
    name: '💬 Live Chat Activity',
    icon_color: 9367192,
    envVar: 'TELEGRAM_TOPIC_CHAT_ID'
  },
  [TOPIC_KEYS.MEME]: {
    name: '🎨 Meme Image Creations',
    icon_color: 13338331,
    envVar: 'TELEGRAM_TOPIC_MEME_ID'
  },
  [TOPIC_KEYS.ERRORS]: {
    name: '⚠️ System Errors & Logs',
    icon_color: 16766590,
    envVar: 'TELEGRAM_TOPIC_ERRORS_ID'
  },
  [TOPIC_KEYS.CONTRIBUTE]: {
    name: '🧠 AI Training & SETEC Lore',
    icon_color: 9367192,
    envVar: 'TELEGRAM_TOPIC_CONTRIBUTE_ID'
  },
  [TOPIC_KEYS.FILES]: {
    name: '📁 Session Archives & Files',
    icon_color: 7322096,
    envVar: 'TELEGRAM_TOPIC_FILES_ID'
  }
};

// Default thread IDs created in supergroup -1004003727188
const DEFAULT_TOPIC_IDS = {
  [TOPIC_KEYS.SPAM]: 30,
  [TOPIC_KEYS.VISITS]: 31,
  [TOPIC_KEYS.CHAT]: 32,
  [TOPIC_KEYS.MEME]: 33,
  [TOPIC_KEYS.ERRORS]: 34,
  [TOPIC_KEYS.CONTRIBUTE]: 89,
  [TOPIC_KEYS.FILES]: 32
};

// In-memory cache for forum topic thread IDs
const topicThreadCache = new Map();

// Helper to get Cambodia time string (UTC+7)
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

// Get day key in Cambodia timezone (YYYY-MM-DD)
export function getCambodiaDayKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Phnom_Penh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

// Helper to parse User-Agent
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

// Get or dynamically create a Forum Topic in the Supergroup
async function getOrCreateTopicThreadId(topicKey) {
  if (!topicKey || !TOPIC_CONFIG[topicKey]) return null;

  const config = TOPIC_CONFIG[topicKey];

  // 1. Check if configured in environment variable
  const envVal = process.env[config.envVar];
  if (envVal) {
    const parsed = parseInt(envVal, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }

  // 2. Check default topic ID
  if (DEFAULT_TOPIC_IDS[topicKey]) {
    return DEFAULT_TOPIC_IDS[topicKey];
  }

  // 3. Check in-memory cache
  if (topicThreadCache.has(topicKey)) {
    return topicThreadCache.get(topicKey);
  }

  // 3. Attempt to automatically create the forum topic via Telegram Bot API
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/createForumTopic`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        name: config.name,
        icon_color: config.icon_color
      })
    });

    const data = await res.json();
    if (data.ok && data.result?.message_thread_id) {
      const threadId = data.result.message_thread_id;
      topicThreadCache.set(topicKey, threadId);
      console.log(`[Telegram] Created forum topic "${config.name}" (ID: ${threadId})`);
      return threadId;
    } else {
      console.warn(`[Telegram] createForumTopic for "${config.name}" failed:`, data.description);
    }
  } catch (err) {
    console.warn(`[Telegram] Failed to create topic ${topicKey}:`, err.message);
  }

  return null;
}

// Proactively initialize all forum topics on startup / demand
export async function initTelegramForumTopics() {
  const results = {};
  for (const key of Object.values(TOPIC_KEYS)) {
    const threadId = await getOrCreateTopicThreadId(key);
    results[key] = threadId;
  }
  return results;
}

// Send an HTML message to Telegram (Routes directly to Forum Topic if available, supports buttons)
export async function sendTelegramMessage(htmlText, topicKey = null, extraPayload = {}) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('[Telegram] Token or Chat ID not configured');
    return false;
  }

  const threadId = topicKey ? await getOrCreateTopicThreadId(topicKey) : null;

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const payload = {
      chat_id: TELEGRAM_CHAT_ID,
      text: htmlText,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...extraPayload
    };

    if (threadId) {
      payload.message_thread_id = threadId;
    }

    let res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    let data = await res.json();

    // If message failed while targeting a specific thread/topic, immediately retry without message_thread_id (General Chat)
    if (!data.ok && payload.message_thread_id) {
      if (topicKey) topicThreadCache.delete(topicKey);
      delete payload.message_thread_id;
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      data = await res.json();
    }

    return data.ok;
  } catch (err) {
    console.error('[Telegram] Failed to send alert:', err.message);
    return false;
  }
}

// Send a Document (JSON log file, archive file, etc.) to Telegram Forum Topic
export async function sendTelegramDocument({
  fileBuffer,
  fileName = 'session_log.json',
  caption = '',
  topicKey = TOPIC_KEYS.FILES
}) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('[Telegram] Token or Chat ID not configured');
    return false;
  }

  const threadId = topicKey ? await getOrCreateTopicThreadId(topicKey) : null;

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`;
    const formData = new FormData();
    formData.append('chat_id', TELEGRAM_CHAT_ID);
    if (threadId) {
      formData.append('message_thread_id', String(threadId));
    }

    const blob = new Blob([fileBuffer], { type: 'application/json' });
    formData.append('document', blob, fileName);

    if (caption) {
      formData.append('caption', caption);
      formData.append('parse_mode', 'HTML');
    }

    let res = await fetch(url, {
      method: 'POST',
      body: formData
    });

    let data = await res.json();

    // If failed targeting thread, retry without message_thread_id (General Chat)
    if (!data.ok && threadId) {
      if (topicKey) topicThreadCache.delete(topicKey);
      const retryFormData = new FormData();
      retryFormData.append('chat_id', TELEGRAM_CHAT_ID);
      const retryBlob = new Blob([fileBuffer], { type: 'application/json' });
      retryFormData.append('document', retryBlob, fileName);
      if (caption) {
        retryFormData.append('caption', caption);
        retryFormData.append('parse_mode', 'HTML');
      }

      res = await fetch(url, {
        method: 'POST',
        body: retryFormData
      });
      data = await res.json();
    }

    if (!data.ok) {
      console.warn('[Telegram] sendDocument failed:', data.description);
    }

    return Boolean(data.ok);
  } catch (err) {
    console.error('[Telegram] Failed to send document:', err.message);
    return false;
  }
}

// 1. Alert: New Visitor Session -> Topic: VISITS
export async function alertNewVisitor({ count, path, ip, userAgent, username, screen, referrer, isReturnAfter5Min = false }) {
  const time = getCambodiaTime();
  const parsed = parseUserAgent(userAgent);
  const userTag = username && username !== 'Guest' ? `👤 <b>ឈ្មោះ:</b> <b>${escapeHtml(username)}</b>\n` : '';
  const refTag = referrer ? `🔗 <b>Referrer:</b> <code>${escapeHtml(referrer.slice(0, 50))}</code>\n` : '';
  const typeTag = isReturnAfter5Min
    ? `🔄 <b>ប្រភេទ:</b> <b>ត្រឡប់មកវិញក្រោយចេញលើសពី ៥ នាទី (Returned Visitor)</b>\n`
    : `✨ <b>ប្រភេទ:</b> <b>ចូលទស្សនាលើកដំបូង (Initial Visit)</b>\n`;

  const message =
    `👁️ <b>អ្នកទស្សនាថ្មី (Visitor View Count)</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `🔢 <b>ចំនួនទស្សនាថ្ងៃនេះ:</b> <b>#${count}</b> ដង (12:00 AM - 11:59 PM)\n` +
    `${typeTag}` +
    `${userTag}` +
    `🌐 <b>Page:</b> <code>${escapeHtml(path || '/')}</code>\n` +
    `📱 <b>Device:</b> ${parsed.summary} ${screen ? `(${screen})` : ''}\n` +
    `🌍 <b>IP:</b> <code>${escapeHtml(ip || 'Unknown')}</code>\n` +
    `${refTag}` +
    `⏰ <b>ម៉ោង:</b> ${time} (Cambodia Time)\n` +
    `━━━━━━━━━━━━━━━━━━`;

  return sendTelegramMessage(message, TOPIC_KEYS.VISITS);
}

// 2. Alert: Daily Visitor Summary Report -> Topic: VISITS
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

  return sendTelegramMessage(message, TOPIC_KEYS.VISITS);
}

// 3. Alert: Real-time User Chatting with Chatbot -> Topic: CHAT
export async function alertChatActivity({ username, gender, bot, ip, userAgent, prompt, isError = false }) {
  const time = getCambodiaTime();
  const parsed = parseUserAgent(userAgent);
  const botName =
    bot === 'konpov'
      ? '🤖 Chatbot កូនពៅ (Gen Z & Savage)'
      : '🤖 Chatbot កូនច្បង (Senior Moderator)';

  const promptSnippet = (prompt || '').slice(0, 150).replace(/\n/g, ' ');

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

  return sendTelegramMessage(message, TOPIC_KEYS.CHAT);
}

// 4. Alert: AI Meme Creation -> Topic: MEME
export async function alertMemeCreation({ username, bot, ip, userAgent, prompt, imageUrl, caption }) {
  const time = getCambodiaTime();
  const parsed = parseUserAgent(userAgent);
  const botName = bot === 'konpov' ? 'Chatbot កូនពៅ' : 'Chatbot កូនច្បង';

  const message =
    `🎨 <b>ការបង្កើតរូបភាព Meme ថ្មី (AI Meme Generated)</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `👤 <b>User:</b> <b>${escapeHtml(username || 'Anonymous')}</b>\n` +
    `🤖 <b>បង្កើតដោយ:</b> ${botName}\n` +
    `💡 <b>គំនិត (Prompt):</b> <i>"${escapeHtml(prompt || '')}"</i>\n` +
    `📝 <b>Caption:</b> <i>"${escapeHtml((caption || '').slice(0, 100))}"</i>\n` +
    `🖼️ <b>រូបភាព:</b> <a href="${escapeHtml(imageUrl || '')}">មើលរូបភាព Meme</a>\n` +
    `📱 <b>Device:</b> ${parsed.summary}\n` +
    `🌍 <b>IP:</b> <code>${escapeHtml(ip || 'Unknown')}</code>\n` +
    `⏰ <b>ម៉ោង:</b> ${time}\n` +
    `━━━━━━━━━━━━━━━━━━`;

  return sendTelegramMessage(message, TOPIC_KEYS.MEME);
}

// 5. Alert: Security & Spam / DDoS Rate Limit Triggered -> Topic: SPAM
export async function alertSecuritySpam({ username, ip, userAgent, device, bot, retryAfter, prompt, violationType }) {
  const time = getCambodiaTime();
  const parsed = parseUserAgent(userAgent || device);
  const promptSnippet = (prompt || '').slice(0, 300).replace(/\n/g, ' ').trim();
  const botTitle = bot ? ((bot.toLowerCase().includes('bong')) ? 'KonBong (កូនច្បង)' : 'KonPov (កូនពៅ)') : 'System Gateway';

  const message =
    `🚨 <b>SECURITY ALERT: រកឃើញការ SPAM / DDoS ATTACK!</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `⚠️ <b>ព្រឹត្តិការណ៍:</b> ${escapeHtml(violationType || 'ការស្នើសុំហួសកម្រិតកំណត់ (Too Many Requests - 429)')}\n` +
    `👤 <b>User Name:</b> <b>${escapeHtml(username || 'Unknown Spammer')}</b>\n` +
    `🎯 <b>គោលដៅ:</b> <b>${escapeHtml(botTitle)}</b>\n` +
    `💬 <b>សារដែល User ព្យាយាម Spam:</b>\n<blockquote><b>"${escapeHtml(promptSnippet || 'គ្មានខ្លឹមសារ (Empty Request / Fast Flood)')}"</b></blockquote>\n` +
    `🌍 <b>IP Spammer:</b> <code>${escapeHtml(ip || 'Unknown')}</code>\n` +
    `📱 <b>Device Info:</b> ${parsed.summary}\n` +
    `🛡️ <b>ការវាយបកពី Server:</b> AI កូនពៅបានបាញ់ Savage Roast វាយបក និងផ្អាក <b>${retryAfter || 60} វិនាទី!</b>\n` +
    `⏰ <b>ម៉ោង:</b> ${time} (Cambodia Time)\n` +
    `━━━━━━━━━━━━━━━━━━`;

  return sendTelegramMessage(message, TOPIC_KEYS.SPAM);
}

// 5b. Alert: Malicious insult, curse or attack targeted at Creator ROTANA NOB -> Topic: SPAM
export async function alertRotanaCreatorAttack({ username, bot, ip, userAgent, prompt, details }) {
  const time = getCambodiaTime();
  const parsed = parseUserAgent(userAgent);
  const cleanPrompt = (prompt || '').trim();

  const message =
    `🚨 <b>ALERT: រកឃើញអ្នកជេរប្រមាថ ROTANA NOB!</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `👤 <b>ជនបង្ក (User):</b> <b>${escapeHtml(username || 'Unknown Attacker')}</b>\n` +
    `🤖 <b>Bot គោលដៅ:</b> <b>${escapeHtml(bot || 'Chatbot')}</b>\n` +
    `💬 <b>សាររបស់ User (ជេរចំៗ):</b>\n` +
    `<blockquote><b>"${escapeHtml(cleanPrompt || 'គ្មានខ្លឹមសារ')}"</b></blockquote>\n` +
    `🌍 <b>IP Address:</b> <code>${escapeHtml(ip || 'Unknown')}</code>\n` +
    `📱 <b>ឧបករណ៍ Device:</b> ${parsed.summary}\n` +
    `🛡️ <b>ចំណាត់ការ:</b> ប្រព័ន្ធបានស្ទាក់ចាប់ និងបាញ់តបត Savage Defense ការពារបង Rotana វិញភ្លាមៗ!\n` +
    `⏰ <b>ម៉ោង:</b> ${time} (Cambodia Time)\n` +
    `━━━━━━━━━━━━━━━━━━`;

  return sendTelegramMessage(message, TOPIC_KEYS.SPAM);
}

// 6. Alert: System & Voice & API Errors -> Topic: ERRORS
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

  return sendTelegramMessage(message, TOPIC_KEYS.ERRORS);
}

// 7. Alert: User Installed App / Added to Home Screen -> Topic: VISITS
export async function alertPwaInstall({ username, ip, userAgent, platform, screen }) {
  const time = getCambodiaTime();
  const parsed = parseUserAgent(userAgent);
  const userDisplay = username && username !== 'Guest' && username !== 'User'
    ? username
    : 'Unknown (Guest)';

  const message =
    `📲 <b>អ្នកប្រើប្រាស់បានដំឡើង App (PWA Added to Home Screen)!</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `👤 <b>ឈ្មោះ User:</b> <b>${escapeHtml(userDisplay)}</b>\n` +
    `📱 <b>ឧបករណ៍ Device:</b> ${parsed.summary} ${screen ? `(${screen})` : ''}\n` +
    `⚙️ <b>Platform/Source:</b> <code>${escapeHtml(platform || parsed.os)}</code>\n` +
    `🌍 <b>IP Address:</b> <code>${escapeHtml(ip || 'Unknown')}</code>\n` +
    `⏰ <b>ម៉ោង:</b> ${time} (Cambodia Time)\n` +
    `━━━━━━━━━━━━━━━━━━`;

  return sendTelegramMessage(message, TOPIC_KEYS.VISITS);
}

// 8. Alert: User Reported an Issue directly to Rotana NOB -> Topic: ERRORS (Includes Direct Bypass Button)
export async function alertUserReportedIssue({ username, issue, bot, ip, userAgent, sessionId, bypassToken }) {
  const time = getCambodiaTime();
  const parsed = parseUserAgent(userAgent);
  const userDisplay = username && username !== 'Guest' && username !== 'User'
    ? username
    : 'Anonymous User';

  const botPath = (bot || '').toLowerCase().includes('bong') ? 'KonBong' : 'KonPov';
  const bypassUrl = sessionId && bypassToken
    ? `https://troll-setec-chatbot.web.app/${botPath}?liveSession=${encodeURIComponent(sessionId)}&token=${encodeURIComponent(bypassToken)}`
    : null;

  const message =
    `🚨 <b>USER REPORTED AN ISSUE TO ROTANA NOB!</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `👤 <b>ឈ្មោះ User:</b> <b>${escapeHtml(userDisplay)}</b>\n` +
    `📝 <b>បញ្ហាដែលបានរាយការណ៍:</b>\n<i>"${escapeHtml(issue || 'មិនមានការពិពណ៌នា')}"</i>\n` +
    `🤖 <b>Bot ជួបបញ្ហា:</b> ${escapeHtml(bot || 'System')}\n` +
    `📱 <b>ឧបករណ៍ Device:</b> ${parsed.summary}\n` +
    `🌍 <b>IP Address:</b> <code>${escapeHtml(ip || 'Unknown')}</code>\n` +
    `⏰ <b>ម៉ោង:</b> ${time} (Cambodia Time)\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    (bypassUrl ? `⚡ <i>ចុចប៊ូតុងខាងក្រោមដើម្បី Bypass ចូល Chat ផ្ទាល់ជាមួយ User នេះភ្លាមៗ៖</i>` : '');

  const extraPayload = bypassUrl
    ? {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '⚡ DIRECT TO CHAT (Rotana Bypass)',
                url: bypassUrl
              }
            ]
          ]
        }
      }
    : {};

  return sendTelegramMessage(message, TOPIC_KEYS.ERRORS, extraPayload);
}


// 9. Alert: User Contributed SETEC Lore & AI Training Knowledge -> Topic: CONTRIBUTE (89)
export async function alertDevContribution({ username, category, content, bot, ip, userAgent }) {
  const time = getCambodiaTime();
  const parsed = parseUserAgent(userAgent);
  const cleanUser = escapeHtml(username || 'Anonymous SETECer');
  const cleanCategory = escapeHtml(category || 'SETEC Lore & Training');
  const cleanBot = escapeHtml(bot || 'General SETEC Chatbot');
  const cleanIp = escapeHtml(ip || 'Unknown');
  const escapedContent = escapeHtml(content || '');

  const message = [
    '🧠 <b>NEW AI TRAINING DATA & SETEC LORE!</b>',
    '━━━━━━━━━━━━━━━━━━━━━━',
    '👤 <b>Contributed By:</b> <b>' + cleanUser + '</b>',
    '🏷️ <b>Category:</b> ' + cleanCategory,
    '🤖 <b>Bot Reference:</b> ' + cleanBot,
    '🕒 <b>Time:</b> ' + time + ' (Cambodia Time)',
    '📱 <b>Device:</b> ' + parsed.summary,
    '🌐 <b>Client IP:</b> <code>' + cleanIp + '</code>',
    '',
    '📝 <b>TRAINING CONTENT (Tap to Copy Monospace):</b>',
    '<pre>' + escapedContent + '</pre>',
    '━━━━━━━━━━━━━━━━━━━━━━',
    '💡 <i>Rotana NOB can tap the block above to immediately copy all text for AI training!</i>'
  ].join('\n');

  return sendTelegramMessage(message, TOPIC_KEYS.CONTRIBUTE);
}

// 9. Alert: User Created a New Chat Session (Finished or left previous chat) -> Topic: CHAT
export async function alertNewChatSession({ username, bot, ip, userAgent, prevMessageCount, lastUserMessage, isClearAll, newSessionId }) {
  const time = getCambodiaTime();
  const parsed = parseUserAgent(userAgent);
  const userDisplay = username && username !== 'Guest' && username !== 'User'
    ? username
    : 'Unknown (Guest)';

  const botTitle = (bot || '').toLowerCase().includes('bong') ? 'KonBong (កូនច្បង)' : 'KonPov (កូនពៅ)';
  const lastMsgSnippet = lastUserMessage ? lastUserMessage.slice(0, 150).replace(/\n/g, ' ') : '';
  const actionTitle = isClearAll
    ? 'លុបប្រវត្តិជជែកទាំងអស់ & បង្កើតឆាតថ្មី (Clear All & Reset)'
    : 'បង្កើត "ឆាតថ្មី" (New Chat Session)';

  const message =
    `🔄 <b>អ្នកប្រើប្រាស់បានបង្កើត "ឆាតថ្មី" (NEW CHAT SESSION)!</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `👤 <b>ឈ្មោះ User:</b> <b>${escapeHtml(userDisplay)}</b>\n` +
    `🤖 <b>Bot:</b> <b>${escapeHtml(botTitle)}</b>\n` +
    `⚡ <b>សកម្មភាព:</b> ${escapeHtml(actionTitle)}\n` +
    `📊 <b>ឆាតចាស់ (Old Chat):</b> មាន <b>${prevMessageCount || 0} សារ</b>\n` +
    `${lastMsgSnippet ? `💬 <b>សារចុងក្រោយនៃឆាតចាស់:</b>\n<blockquote><i>"${escapeHtml(lastMsgSnippet)}"</i></blockquote>\n` : ''}` +
    `🌍 <b>IP Address:</b> <code>${escapeHtml(ip || 'Unknown')}</code>\n` +
    `📱 <b>Device Info:</b> ${parsed.summary}\n` +
    `⏰ <b>ម៉ោង:</b> ${time} (Cambodia Time)\n` +
    `━━━━━━━━━━━━━━━━━━`;

  return sendTelegramMessage(message, TOPIC_KEYS.CHAT);
}

// 10. Alert: Admin Rotana Control Switch Action -> Topic: ERRORS (34)
export async function alertSystemControlChange({ action, details, by = 'Rotana NOB', ip = 'Master Gateway' }) {
  const time = getCambodiaTime();
  const message = [
    '🛡️ <b>ADMIN SYSTEM CONTROL EVENT</b>',
    '━━━━━━━━━━━━━━━━━━━━━━',
    `👑 <b>Authorized By:</b> <b>${escapeHtml(by)}</b>`,
    `⚙️ <b>Action:</b> <b>${escapeHtml(action)}</b>`,
    `📋 <b>Details:</b> <code>${escapeHtml(typeof details === 'object' ? JSON.stringify(details) : String(details))}</code>`,
    `🌐 <b>Client IP:</b> <code>${escapeHtml(ip)}</code>`,
    `🕒 <b>Time:</b> ${time} (Cambodia Time)`,
    '━━━━━━━━━━━━━━━━━━━━━━'
  ].join('\n');

  return sendTelegramMessage(message, TOPIC_KEYS.ERRORS);
}

// Helper to escape HTML characters
function escapeHtml(text = '') {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
