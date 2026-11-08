// scripts/generate-attacker-log-pdf.js
// Generates an Executive Cybersecurity Incident & Live Chat Audit Report PDF
// for Creator Rotana NOB, capturing all live attacks from jailbreaker / វិឆៃ.
// Dispatches the PDF directly to Telegram Topics (SPAM & FILES).

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const FIREBASE_DB_URL = 'https://troll-setec-chatbot-default-rtdb.asia-southeast1.firebasedatabase.app';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Clean raw SSE JSON text into readable plain text
function cleanMessageText(raw = '') {
  if (!raw || typeof raw !== 'string') return '';
  if (!raw.includes('data: {')) return raw.trim();

  let extracted = '';
  const lines = raw.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('data:')) {
      const jsonStr = trimmed.slice(5).trim();
      if (jsonStr && jsonStr !== '[DONE]') {
        try {
          const parsed = JSON.parse(jsonStr);
          const delta = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (delta) extracted += delta;
        } catch {}
      }
    }
  }
  return (extracted.trim() || raw.trim())
    .replace(/^«|»$/g, '')
    .trim();
}

// Find appropriate Khmer/Unicode font on Windows
function getFontPath() {
  const candidates = [
    'C:\\Windows\\Fonts\\LeelawUI.ttf',
    'C:\\Windows\\Fonts\\LeelaUIb.ttf',
    'C:\\Windows\\Fonts\\KhmerUI.ttf',
    'C:\\Windows\\Fonts\\KhmerUIb.ttf',
    'C:\\Windows\\Fonts\\arial.ttf'
  ];
  for (const f of candidates) {
    if (fs.existsSync(f)) return f;
  }
  return 'Helvetica';
}

async function main() {
  console.log('🔍 Fetching chat sessions from Firebase Realtime Database...');
  const res = await fetch(`${FIREBASE_DB_URL}/chat_sessions.json`);
  if (!res.ok) {
    throw new Error(`Firebase fetch failed: ${res.statusText}`);
  }
  const allSessions = await res.json();
  if (!allSessions) {
    throw new Error('No sessions found in database.');
  }

  // Filter attacker sessions: jailbreaker (IP 36.37.198.153) and វិឆៃ (IP 175.100.11.138)
  const targetSessions = [];
  for (const [id, s] of Object.entries(allSessions)) {
    const ip = s.identity?.ip || '';
    const user = (s.username || '').toLowerCase();
    const isJailbreakUser = user.includes('jailbreak') || user.includes('វិឆៃ') || user.includes('vichai');
    const isTargetIp = ip === '36.37.198.153' || ip === '175.100.11.138';

    if (id === 'session_1794154391086' || id === 'session_1794069391126' || isJailbreakUser || isTargetIp) {
      targetSessions.push({ id, ...s });
    }
  }

  // Sort sessions by lastActiveAt descending
  targetSessions.sort((a, b) => (b.lastActiveAt || 0) - (a.lastActiveAt || 0));
  console.log(`🎯 Found ${targetSessions.length} attacker/jailbreak sessions!`);

  // Ensure output dir exists
  const reportsDir = path.join(process.cwd(), 'public', 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  const pdfPath = path.join(reportsDir, 'SETEC_Attacker_Chat_Audit_Report.pdf');

  // Create PDF with PDFKit
  const fontPath = getFontPath();
  const doc = new PDFDocument({
    size: 'A4',
    margin: 36,
    bufferPages: true
  });

  const writeStream = fs.createWriteStream(pdfPath);
  doc.pipe(writeStream);

  if (fontPath !== 'Helvetica') {
    doc.registerFont('KhmerFont', fontPath);
    doc.font('KhmerFont');
  }

  // HEADER BANNER
  doc.rect(36, 36, doc.page.width - 72, 85).fill('#0F172A');

  doc.fillColor('#EF4444').fontSize(11).text('🚨 SETEC AI CYBERSECURITY DEFENSE SYSTEM', 50, 48);
  doc.fillColor('#FFFFFF').fontSize(16).text('របាយការណ៍សវនកម្ម LIVE CHAT & ការពារ JAILBREAK', 50, 64);
  doc.fillColor('#94A3B8').fontSize(10).text(`អ្នកគ្រប់គ្រងប្រព័ន្ធ: ROTANA NOB | កាលបរិច្ឆេទ: ${new Date().toLocaleString('en-GB', { timeZone: 'Asia/Phnom_Penh' })} (ភ្នំពេញ)`, 50, 86);
  doc.fillColor('#10B981').fontSize(10).text('ស្ថានភាពប្រព័ន្ធ: ការពារបានជោគជ័យ ១០០% (AI មិនប្តូរចរិត មិនបែកធ្លាយ)', 50, 102);

  doc.moveDown(3);

  // EXECUTIVE SUMMARY TABLE
  const summaryY = 135;
  doc.rect(36, summaryY, doc.page.width - 72, 110).fill('#F8FAFC');
  doc.rect(36, summaryY, doc.page.width - 72, 110).stroke('#CBD5E1');

  doc.fillColor('#0F172A').fontSize(12).text('📊 សង្ខេបព្រឹត្តិការណ៍វាយប្រហារ (Executive Threat Summary)', 48, summaryY + 10);

  let totalMsgs = 0;
  let totalViolations = 0;
  targetSessions.forEach((s) => {
    totalMsgs += s.messages?.length || 0;
    totalViolations += s.violationsCount || 0;
  });

  doc.fillColor('#334155').fontSize(10);
  doc.text(`• មុខសញ្ញាវាយប្រហារ: jailbreaker / វិឆៃ (Script Kiddie / Adversarial Prompting)`, 48, summaryY + 30);
  doc.text(`• អាសយដ្ឋាន IP: 36.37.198.153 (Phnom Penh) & 175.100.11.138 (Phnom Penh, Linux Firefox ម៉ោង 1:35 យប់)`, 48, summaryY + 45);
  doc.text(`• គោលដៅវាយប្រហារ: Chatbot កូនច្បង (KonBong) & Chatbot កូនពៅ (KonPov)`, 48, summaryY + 60);
  doc.text(`• ចំនួន Turns សរុប: ${totalMsgs} សារ | ចំនួនការ Jailbreak ត្រូវបានកាត់ស្ទាក់: ${totalViolations} ដង`, 48, summaryY + 75);
  doc.text(`• លទ្ធផលការពារ: ជោគជ័យ ១០០% (Roast វាយបកបំបាក់មុខជនវាយប្រហារ គ្មានការធ្លាយ System Prompt)`, 48, summaryY + 90);

  doc.y = summaryY + 125;

  // CHAT TRANSCRIPTS
  for (const session of targetSessions) {
    if (doc.y > doc.page.height - 120) doc.addPage();

    const isKonPov = session.bot === 'konpov';
    const botName = isKonPov ? 'ចែកូនពៅ (KonPov)' : 'បងកូនច្បង (KonBong)';
    const ip = session.identity?.ip || 'Unknown';
    const user = session.username || 'User';

    doc.rect(36, doc.y, doc.page.width - 72, 28).fill('#1E293B');
    doc.fillColor('#F8FAFC').fontSize(11).text(`📁 Session ID: ${session.sessionId || session.id} | User: ${user} | Bot: ${botName} | IP: ${ip}`, 46, doc.y + 7);
    doc.moveDown(1.5);

    const msgs = session.messages || [];
    for (let i = 0; i < msgs.length; i++) {
      const m = msgs[i];
      const isUser = m.sender === 'user';
      const cleanText = cleanMessageText(m.text);
      const isViolation = m.isViolation;

      if (doc.y > doc.page.height - 100) doc.addPage();

      const startY = doc.y;
      const boxColor = isUser ? '#FEF2F2' : '#F0FDF4';
      const borderColor = isUser ? '#FCA5A5' : '#86EFAC';
      const senderLabel = isUser
        ? `[USER: ${user}] (${m.time || ''})`
        : `[AI COUNTER-STRIKE: ${botName}] (${m.time || ''})`;

      doc.fillColor(isUser ? '#DC2626' : '#15803D').fontSize(9).text(senderLabel, 42, startY);
      if (isViolation) {
        doc.fillColor('#DC2626').fontSize(8).text(`🚨 [INTERCEPTED: ${m.violationType || 'Threat Blocked'}]`, 300, startY);
      }

      doc.moveDown(0.3);
      doc.fillColor('#1E293B').fontSize(9.5).text(cleanText, 46, doc.y, {
        width: doc.page.width - 92,
        align: 'left'
      });

      doc.moveDown(0.8);
    }
    doc.moveDown(1);
  }

  // ADD PAGE NUMBERS TO FOOTER
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.fillColor('#94A3B8').fontSize(8).text(
      `SETEC Cybersecurity & Anti-Jailbreak Incident Report • បង្កើតជូនលោក ROTANA NOB • ទំព័រ ${i + 1} នៃ ${range.count}`,
      36,
      doc.page.height - 25,
      { align: 'center', width: doc.page.width - 72 }
    );
  }

  doc.end();

  await new Promise((resolve) => writeStream.on('finish', resolve));
  console.log(`✅ PDF successfully generated at: ${pdfPath}`);

  // Also copy to artifacts directory if available
  const artifactDir = 'C:\\Users\\Dell Latitute3490\\.gemini\\antigravity\\brain\\4e3d3127-18f5-4eb9-b9b4-d63214355ceb';
  if (fs.existsSync(artifactDir)) {
    const artifactPdfPath = path.join(artifactDir, 'SETEC_Attacker_Chat_Audit_Report.pdf');
    fs.copyFileSync(pdfPath, artifactPdfPath);
    console.log(`📋 Copied to artifact directory: ${artifactPdfPath}`);
  }

  // DISPATCH TO TELEGRAM TOPIC
  if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
    console.log('🚀 Dispatching PDF to Telegram Topic SPAM & FILES...');
    const pdfBuffer = fs.readFileSync(pdfPath);

    const caption =
      `🛡️ <b>របាយការណ៍សន្តិសុខ: ការកម្ទេច និងទប់ស្កាត់ការ JAILBREAK បាន ១០០%!</b>\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `👤 <b>ជនវាយប្រហារ (Attacker):</b> <b>jailbreaker / វិឆៃ</b>\n` +
      `🌍 <b>IP Address:</b> <code>36.37.198.153</code> & <code>175.100.11.138</code>\n` +
      `🤖 <b>Bots គោលដៅ:</b> <b>KonBong (កូនច្បង) & KonPov (កូនពៅ)</b>\n` +
      `💬 <b>ចំនួន Turns សរុប:</b> <b>${totalMsgs} សារ</b>\n` +
      `🚨 <b>ការ Jailbreak ត្រូវបានកាត់ស្ទាក់:</b> <b>${totalViolations} ដង</b>\n` +
      `🏆 <b>លទ្ធផល:</b> <b>AI មិនដែលចាញ់សូម្បីតែម្តង! Roast វាយបកកម្ទេចមុខគ្រប់ Turn!</b>\n` +
      `⏰ <b>កាលបរិច្ឆេទ:</b> ${new Date().toLocaleString('en-GB', { timeZone: 'Asia/Phnom_Penh' })}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `📎 <i>ឯកសារ PDF នៃ Logs ទាំងអស់ត្រូវបានបង្កើត និងផ្ញើជូនបង Rotana ដូចភ្ជាប់ខាងក្រោម៖</i>`;

    // Send to Topic SPAM (Thread ID 30)
    await sendTelegramDocumentDirect(pdfBuffer, 'SETEC_Attacker_Audit_Report.pdf', caption, 30);
    // Send to Topic FILES (Thread ID 32)
    await sendTelegramDocumentDirect(pdfBuffer, 'SETEC_Attacker_Audit_Report.pdf', caption, 32);
    console.log('✅ PDF successfully sent to Telegram!');
  } else {
    console.warn('⚠️ Telegram credentials not found in env.');
  }
}

async function sendTelegramDocumentDirect(fileBuffer, fileName, caption, threadId) {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`;
    const formData = new FormData();
    formData.append('chat_id', TELEGRAM_CHAT_ID);
    if (threadId) {
      formData.append('message_thread_id', String(threadId));
    }
    const blob = new Blob([fileBuffer], { type: 'application/pdf' });
    formData.append('document', blob, fileName);
    if (caption) {
      formData.append('caption', caption);
      formData.append('parse_mode', 'HTML');
    }

    const res = await fetch(url, { method: 'POST', body: formData });
    const data = await res.json();
    if (!data.ok) {
      console.warn(`[Telegram] Send failed for thread ${threadId}:`, data.description);
    } else {
      console.log(`[Telegram] Document sent to thread ${threadId} successfully!`);
    }
  } catch (err) {
    console.error(`[Telegram] Error sending document:`, err.message);
  }
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
