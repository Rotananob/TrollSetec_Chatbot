import { sendTelegramMessage, TOPIC_KEYS, getCambodiaTime } from '../../../lib/telegram';

const FIREBASE_DB_URL = 'https://troll-setec-chatbot-default-rtdb.asia-southeast1.firebasedatabase.app';

function generateHashedVipCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ROTANA-VIP-${rand}`;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const requestId = searchParams.get('req');
  const action = (searchParams.get('action') || 'approve').toLowerCase();
  const rawCode = searchParams.get('code');
  const username = searchParams.get('user') || 'User';

  if (!requestId) {
    return new Response(renderHtml('⚠️ បញ្ហាទិន្នន័យ', 'មិនមាន Request ID ត្រឹមត្រូវឡើយ!', false), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  const cambodiaTime = getCambodiaTime();

  // Handle REJECT Action
  if (action === 'reject') {
    try {
      await fetch(`${FIREBASE_DB_URL}/bypass_requests/${encodeURIComponent(requestId)}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'rejected',
          rejectedAt: Date.now(),
          rejectedBy: 'Rotana NOB (Telegram)'
        })
      });

      // Send confirmation to Telegram
      sendTelegramMessage(
        [
          `❌ <b>[PROMO REQUEST REJECTED]</b>`,
          ``,
          `👤 <b>User:</b> <code>${username}</code>`,
          `🆔 <b>Request ID:</b> <code>${requestId}</code>`,
          `⏱️ <b>កាលបរិច្ឆេទ:</b> ${cambodiaTime}`,
          `🚫 <i>បង Rotana បានបដិសេធសំណើសុំ Bypass របស់ User នេះ។</i>`
        ].join('\n'),
        TOPIC_KEYS.SPAM
      ).catch(() => {});

      return new Response(
        renderHtml('❌ បានបដិសេធសំណើ', `សំណើរបស់ <b>${username}</b> (ID: <code>${requestId}</code>) ត្រូវបានបដិសេធរួចរាល់!`, false),
        { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    } catch (err) {
      return new Response(renderHtml('⚠️ Error', 'មានបញ្ហាក្នុងការបដិសេធ៖ ' + err.message, false), {
        status: 500,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }
  }

  // Handle APPROVE Action
  const finalCode = (rawCode || generateHashedVipCode()).trim().toUpperCase();

  try {
    // 1. Update bypass request in RTDB to approved
    await fetch(`${FIREBASE_DB_URL}/bypass_requests/${encodeURIComponent(requestId)}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'approved',
        code: finalCode,
        approvedAt: Date.now(),
        approvedBy: 'Rotana NOB (Telegram Quick Action)'
      })
    });

    // 2. Register the promo code in RTDB so it validates instantly
    await fetch(`${FIREBASE_DB_URL}/bypass_codes/${encodeURIComponent(finalCode)}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: finalCode,
        durationMinutes: 30,
        maxUses: 1,
        usedCount: 0,
        active: true,
        createdAt: Date.now(),
        createdBy: 'Rotana NOB (Telegram Quick Action)'
      })
    });

    // 3. Send Telegram confirmation
    sendTelegramMessage(
      [
        `✅ <b>[PROMO CODE GRANTED & APPROVED]</b>`,
        ``,
        `👤 <b>User:</b> <code>${username}</code>`,
        `🎟️ <b>Promo Code:</b> <code>${finalCode}</code> (+30 នាទី)`,
        `🆔 <b>Request ID:</b> <code>${requestId}</code>`,
        `⏱️ <b>កាលបរិច្ឆេទ:</b> ${cambodiaTime}`,
        ``,
        `🚀 <i>កូដនេះត្រូវបានបាញ់បញ្ជូនទៅកាន់អេក្រង់ User លើគេហទំព័រភ្លាមៗរួចរាល់ហើយ!</i>`
      ].join('\n'),
      TOPIC_KEYS.SPAM
    ).catch(() => {});

    return new Response(
      renderHtml(
        '✅ អនុម័ត & ផ្ដល់ Promo Code ជោគជ័យ!',
        `បានផ្ដល់កូដ <span class="code-badge">${finalCode}</span> ជូន <b>${username}</b> រួចរាល់!<br/><br/>ប្រព័ន្ធបានបញ្ជូនកូដនេះទៅកាន់អេក្រង់ User លើគេហទំព័រភ្លាមៗ។`,
        true,
        finalCode
      ),
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  } catch (err) {
    return new Response(renderHtml('⚠️ Error', 'មានបញ្ហាក្នុងការផ្ដល់កូដ៖ ' + err.message, false), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
}

function renderHtml(title, message, isSuccess = true, code = '') {
  return `<!DOCTYPE html>
<html lang="km">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - SETEC Chatbot</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@400;600;700;800&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #090d16;
      color: #f1f5f9;
      font-family: 'Kantumruy Pro', sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: #0f172a;
      border: 1px solid ${isSuccess ? 'rgba(245, 158, 11, 0.4)' : 'rgba(239, 68, 68, 0.4)'};
      border-radius: 24px;
      padding: 28px 24px;
      max-width: 440px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.6);
    }
    .icon {
      font-size: 48px;
      margin-bottom: 12px;
    }
    h1 {
      font-size: 20px;
      font-weight: 800;
      color: ${isSuccess ? '#fbbf24' : '#f87171'};
      margin-bottom: 12px;
    }
    p {
      font-size: 14px;
      color: #cbd5e1;
      line-height: 1.6;
      margin-bottom: 20px;
    }
    .code-badge {
      display: inline-block;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 800;
      font-size: 18px;
      letter-spacing: 2px;
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.4);
      color: #fbbf24;
      padding: 8px 16px;
      border-radius: 12px;
      margin: 10px 0;
    }
    .btn {
      display: inline-block;
      width: 100%;
      padding: 12px 20px;
      border-radius: 14px;
      background: linear-gradient(135deg, #f59e0b, #ef4444);
      color: #ffffff;
      font-weight: 700;
      font-size: 14px;
      text-decoration: none;
      transition: all 0.2s ease;
      box-shadow: 0 4px 14px rgba(245, 158, 11, 0.3);
    }
    .btn:hover { opacity: 0.95; transform: translateY(-1px); }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${isSuccess ? '🎉' : '❌'}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    ${code ? `<div><span class="code-badge">${code}</span></div><p style="font-size:12px;color:#94a3b8;margin-top:4px;">សុពលភាព៖ +30 នាទី (1 Time Use)</p>` : ''}
    <a href="/jam-tic-kapea-1-sin?tab=promo" class="btn">ចូលទៅកាន់ Admin Panel</a>
  </div>
</body>
</html>`;
}
