import { alertMemeCreation } from '../../../lib/telegram';
import {
  checkDDoSFirewall,
  checkMemeQuota,
  getClientIp
} from '../../../lib/rateLimit';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-device-id',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(req) {
  try {
    const clientIp = getClientIp(req);
    const clientUserAgent = req.headers.get('user-agent') || 'Unknown';
    const deviceId = req.headers.get('x-device-id') || clientIp;

    // 0. Anti-DDoS and Burst Flooding Firewall
    const ddosCheck = checkDDoSFirewall(req, 'generate-meme');
    if (!ddosCheck.allowed) {
      return Response.json(
        {
          success: false,
          error: 'Too Many Requests',
          message: ddosCheck.message,
          retryAfter: ddosCheck.retryAfter
        },
        { status: 429, headers: { ...corsHeaders, 'Retry-After': String(ddosCheck.retryAfter) } }
      );
    }

    const body = await req.json();
    const { prompt, bot = 'konpov', username = 'User' } = body;

    // 1. Strict 1-image per 1-hour per device quota check
    const quotaResult = checkMemeQuota(clientIp, deviceId);
    if (!quotaResult.allowed) {
      return Response.json(
        {
          success: false,
          quotaExceeded: true,
          remainingMinutes: quotaResult.remainingMinutes,
          message:
            bot === 'konpov'
              ? `អាម៉ូយ ${username}! ប្រព័ន្ធកំណត់ឱ្យ ១ ឧបករណ៍បង្កើត Meme បានតែ ១ សន្លឹកក្នុង ១ ម៉ោងប៉ុណ្ណោះ! សូមរង់ចាំ ${quotaResult.remainingMinutes} នាទីទៀតណា៎!`
              : `អូអាប្អូន ${username}! ១ ឧបករណ៍អាចបង្កើតរូប Meme បាន ១ សន្លឹកក្នុងរយៈពេល ១ ម៉ោង! សូមរង់ចាំ ${quotaResult.remainingMinutes} នាទីទៀតណា៎ប្អូន!`
        },
        { status: 429, headers: corsHeaders }
      );
    }

    // Record generation timestamp
    quotaResult.record();

    const userIdea = (prompt || 'SETEC student trying to pass exam without studying').trim();

    // Expert meme prompt focusing strictly on pure comedic troll meme humor
    const memePrompt = `hilarious viral internet meme caricature, pure comedy humor, exaggerated funny facial expression, comic meme format, funny situation about ${userIdea}, vibrant funny cartoon colors, witty comedic masterpiece, masterpiece meme, bold meme text vibe`;

    const seed = Math.floor(Math.random() * 9000000) + 1000000;
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(memePrompt)}?width=768&height=768&model=flux&seed=${seed}&nologo=true`;

    const funnyCaption =
      bot === 'konpov'
        ? `ហាហា! រូប Meme តាមបញ្ជាឯងចេញមកហើយអាម៉ូយ ${username}! មើលមុខក្នុងរូបទៅដូចឯងពេលប្រឡងបាក់ឌុបចឹង! ចាំ ១ ម៉ោងទៀតចាំមក generate រូបថ្មីទៀតណា៎!`
        : `រូបភាព Meme តាមការចង់បានរបស់ប្អូន ${username} ត្រូវបានបង្កើតរួចរាល់ហើយ! សង្ឃឹមថាប្អូននឹងចូលចិត្ត! បញ្ជាក់៖ ១ ម៉ោងទៀតទើបប្អូនអាចបង្កើតរូបថ្មីបានម្ដងទៀតណា៎!`;

    // Alert Telegram of meme generation -> Topic: MEME
    alertMemeCreation({
      username,
      bot,
      ip: clientIp,
      userAgent: clientUserAgent,
      prompt: userIdea,
      imageUrl,
      caption: funnyCaption
    }).catch((e) => console.error('[Telegram] Meme alert error:', e));

    return Response.json(
      {
        success: true,
        imageUrl,
        caption: funnyCaption,
        prompt: userIdea
      },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('Error generating meme:', err);
    return Response.json(
      { success: false, message: 'Server កំពុងរវល់ខ្លាំងពេក សូមព្យាយាមម្ដងទៀតនៅពេលក្រោយ!' },
      { status: 500, headers: corsHeaders }
    );
  }
}
