import { alertMemeCreation } from '../../../lib/telegram';
import {
  checkDDoSFirewall,
  checkMemeQuota,
  getClientIp
} from '../../../lib/rateLimit';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE, PATCH',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400',
  'X-Engine': 'setec-neural-vision-v3',
  'X-Powered-By': 'SETEC Vision Core v3.8',
  'Server': 'SETEC-Cloud-Gateway'
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(req) {
  try {
    // Anti-Bot / Anti-cURL
    const ua = (req.headers.get('user-agent') || '').toLowerCase();
    if (!ua || /curl|wget|python-requests|aiohttp|scrapy|urllib|postmanruntime|insomnia|go-http-client|node-fetch|libwww|httpclient|java\/|apache-httpclient/i.test(ua)) {
      return Response.json({ success: false, error: 'Forbidden' }, { status: 403, headers: corsHeaders });
    }

    // 0a. Payload Size Guard
    const contentLength = parseInt(req.headers.get('content-length') || '0', 10);
    if (contentLength > 1 * 1024 * 1024) {
      return Response.json(
        { success: false, error: 'Payload Too Large' },
        { status: 413, headers: corsHeaders }
      );
    }

    const clientIp = getClientIp(req);
    const clientUserAgent = req.headers.get('user-agent') || 'Unknown';
    const deviceId = req.headers.get('x-device-id') || clientIp;

    // 0b. Anti-DDoS and Burst Flooding Firewall
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

    // 1. Strict 5-images per 1-hour per device quota check
    const quotaResult = checkMemeQuota(clientIp, deviceId);
    if (!quotaResult.allowed) {
      return Response.json(
        {
          success: false,
          quotaExceeded: true,
          remainingMinutes: quotaResult.remainingMinutes,
          message:
            bot === 'konpov'
              ? `អាម៉ូយ ${username}! ប្រព័ន្ធកំណត់ឱ្យ ១ ឧបករណ៍បង្កើត Meme បាន ៥ សន្លឹកក្នុង ១ ម៉ោង! ពេលនេះឯងបានបង្កើតគ្រប់ ៥ សន្លឹកហើយ សូមរង់ចាំ ${quotaResult.remainingMinutes} នាទីទៀតណា៎!`
              : `អូអាប្អូន ${username}! ១ ឧបករណ៍អាចបង្កើតរូប Meme បាន ៥ សន្លឹកក្នុងរយៈពេល ១ ម៉ោង! ពេលនេះប្អូនបានបង្កើតគ្រប់ ៥ សន្លឹកហើយ សូមរង់ចាំ ${quotaResult.remainingMinutes} នាទីទៀតណា៎ប្អូន!`
        },
        { status: 429, headers: corsHeaders }
      );
    }

    // Record generation timestamp
    quotaResult.record();

    const userIdea = (prompt || 'SETEC student trying to pass exam without studying').trim();

    // Expert meme prompt focusing strictly on pure comedic troll meme humor
    const memePrompt = `hilarious viral internet meme caricature, comedic masterpiece, expressive funny face, 3D animated comic style, vibrant colors, funny scene: ${userIdea}, masterpiece, trending on Instagram and X, high definition 4K render, cinematic comedy lighting, bold meme vibe`;

    let imageUrl = null;
    let engineUsed = 'Gemini Nano Banana 2.1';

    const candidateKeys = Array.from(new Set([
      (bot === 'konpov' ? process.env.GEMINI_API_KEY_KONPOV : process.env.GEMINI_API_KEY_KONBONG),
      process.env.GEMINI_API_KEY,
      process.env.GEMINI_API_KEY_RESERVE,
      process.env.GEMINI_API_KEY_RESERVE_ONE,
      process.env.GEMINI_API_KEY_RESERVE_TWO,
      (bot === 'konpov' ? process.env.GEMINI_API_KEY_KONBONG : process.env.GEMINI_API_KEY_KONPOV)
    ].filter(Boolean)));

    // 2. Primary Engine: Gemini Nano Banana 2.1 & Nano Banana Pro (Official Google GenAI Image Generation)
    const nanoBananaModels = ['models/gemini-nano-banana-2.1', 'models/nano-banana-pro-preview', 'models/gemini-2.5-flash-image'];

    for (const key of candidateKeys) {
      if (imageUrl) break;
      for (const model of nanoBananaModels) {
        if (imageUrl) break;
        try {
          const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${key}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `Generate an image: ${memePrompt}` }] }],
              generationConfig: {
                responseModalities: ['IMAGE', 'TEXT']
              }
            })
          });

          if (geminiRes.ok) {
            const geminiData = await geminiRes.json();
            const parts = geminiData.candidates?.[0]?.content?.parts || [];
            const imgPart = parts.find((p) => p.inlineData && p.inlineData.data);
            if (imgPart) {
              const mime = imgPart.inlineData.mimeType || 'image/jpeg';
              imageUrl = `data:${mime};base64,${imgPart.inlineData.data}`;
              engineUsed = 'Gemini Nano Banana 2.1 (Google GenAI)';
              break;
            }
          }
        } catch (err) {
          console.warn(`[${model}] Generation attempt skipped:`, err.message);
        }
      }
    }

    // 3. Ultra-HD Fallback Engine: Flux Caricature with randomized seed and enhanced styling
    if (!imageUrl) {
      const seed = Math.floor(Math.random() * 9000000) + 1000000;
      imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(memePrompt)}?width=1024&height=1024&model=flux&seed=${seed}&nologo=true`;
      engineUsed = 'Nano Banana Neural Flux Core (1024x1024 HD)';
    }

    const funnyCaption =
      bot === 'konpov'
        ? `ហាហា! រូប Meme តាមបញ្ជាឯងចេញមកហើយអាម៉ូយ ${username}! មើលមុខក្នុងរូបទៅដូចឯងពេលប្រឡងបាក់ឌុបចឹង! ក្នុង ១ ម៉ោងឯងអាចបង្កើតបានរហូតដល់ ៥ សន្លឹកឯណោះណា៎!`
        : `រូបភាព Meme តាមការចង់បានរបស់ប្អូន ${username} ត្រូវបានបង្កើតរួចរាល់ហើយ! សង្ឃឹមថាប្អូននឹងចូលចិត្ត! បញ្ជាក់៖ ១ ឧបករណ៍អាចបង្កើតបានរហូតដល់ ៥ សន្លឹកក្នុង ១ ម៉ោងណា៎!`;

    // Alert Telegram of meme generation -> Topic: MEME
    alertMemeCreation({
      username,
      bot,
      ip: clientIp,
      userAgent: clientUserAgent,
      prompt: `${userIdea} (Engine: ${engineUsed})`,
      imageUrl: imageUrl.startsWith('data:') ? 'Gemini Nano Banana 2.1 Base64 Image' : imageUrl,
      caption: funnyCaption
    }).catch((e) => console.error('[Telegram] Meme alert error:', e));

    return Response.json(
      {
        success: true,
        imageUrl,
        caption: funnyCaption,
        prompt: userIdea,
        engine: 'SETEC Neural Vision v3.8 (Quantum Core)'
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
