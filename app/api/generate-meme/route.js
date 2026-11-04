import { alertChatActivity } from '../../../lib/telegram';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-device-id',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

// In-memory sliding window rate limiter: 1 image per 1 hour (3600 seconds) per device/IP
const memeCooldownMap = new Map();
const MEME_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour cooldown

// Periodically clean up entries older than 1 hour
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of memeCooldownMap.entries()) {
    if (now - timestamp > MEME_COOLDOWN_MS) {
      memeCooldownMap.delete(key);
    }
  }
}, 10 * 60 * 1000);

export async function POST(req) {
  try {
    const forwardedFor = req.headers.get('x-forwarded-for') || '';
    const clientIp = forwardedFor.split(',')[0].trim() || 'unknown-ip';
    const clientUserAgent = req.headers.get('user-agent') || 'Unknown';
    const deviceId = req.headers.get('x-device-id') || clientIp;

    const body = await req.json();
    const { prompt, bot = 'konpov', username = 'User' } = body;

    // Strict 1-image per 1-hour per device quota check
    const quotaKey = `${clientIp}_${deviceId}`;
    const now = Date.now();
    const lastGeneratedTime = memeCooldownMap.get(quotaKey);

    if (lastGeneratedTime && now - lastGeneratedTime < MEME_COOLDOWN_MS) {
      const remainingMs = lastGeneratedTime + MEME_COOLDOWN_MS - now;
      const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));

      return Response.json(
        {
          success: false,
          quotaExceeded: true,
          remainingMinutes,
          message:
            bot === 'konpov'
              ? `អាម៉ូយ ${username}! ប្រព័ន្ធកំណត់ឱ្យ ១ ឧបករណ៍បង្កើត Meme បានតែ ១ សន្លឹកក្នុង ១ ម៉ោងប៉ុណ្ណោះ! សូមរង់ចាំ ${remainingMinutes} នាទីទៀតណា៎! 😂🔥`
              : `អូអាប្អូន ${username}! ១ ឧបករណ៍អាចបង្កើតរូប Meme បាន ១ សន្លឹកក្នុងរយៈពេល ១ ម៉ោង! សូមរង់ចាំ ${remainingMinutes} នាទីទៀតណា៎ប្អូន! 😄✨`
        },
        { status: 429, headers: corsHeaders }
      );
    }

    // Record generation timestamp
    memeCooldownMap.set(quotaKey, now);

    const userIdea = (prompt || 'SETEC student trying to pass exam without studying').trim();

    // Expert meme prompt focusing strictly on pure comedic troll meme humor
    const memePrompt = `hilarious viral internet meme caricature, pure comedy humor, exaggerated funny facial expression, comic meme format, funny situation about ${userIdea}, vibrant funny cartoon colors, witty comedic masterpiece, masterpiece meme, bold meme text vibe`;

    const seed = Math.floor(Math.random() * 9000000) + 1000000;
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(memePrompt)}?width=768&height=768&model=flux&seed=${seed}&nologo=true`;

    const funnyCaption =
      bot === 'konpov'
        ? `ហាហា! រូប Meme តាមបញ្ជាឯងចេញមកហើយអាម៉ូយ ${username}! 🤣🤣 មើលមុខក្នុងរូបទៅដូចឯងពេលប្រឡងបាក់ឌុបចឹង! ចាំ ១ ម៉ោងទៀតចាំមក generate រូបថ្មីទៀតណា៎! 🔥`
        : `រូបភាព Meme តាមការចង់បានរបស់ប្អូន ${username} ត្រូវបានបង្កើតរួចរាល់ហើយ! 😂✨ សង្ឃឹមថាប្អូននឹងចូលចិត្ត! (បញ្ជាក់៖ ១ ម៉ោងទៀតទើបប្អូនអាចបង្កើតរូបថ្មីបានម្ដងទៀតណា៎!)`;

    // Alert Telegram of meme generation
    alertChatActivity({
      username,
      bot,
      ip: clientIp,
      userAgent: clientUserAgent,
      prompt: `🎨 [បង្កើត Meme Pure]: "${userIdea}" -> ${imageUrl}`,
      isError: false
    }).catch((e) => console.error('[Telegram] Meme alert error:', e));

    return Response.json(
      {
        success: true,
        imageUrl,
        memePrompt,
        caption: funnyCaption
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error('Meme generation error:', err);
    return Response.json(
      { success: false, error: err.message || 'Meme generation failed' },
      { status: 500, headers: corsHeaders }
    );
  }
}
