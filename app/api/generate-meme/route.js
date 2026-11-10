import { alertMemeCreation } from '../../../lib/telegram';
import {
  checkDDoSFirewall,
  checkMemeQuota,
  getClientIp
} from '../../../lib/rateLimit';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE, PATCH',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-device-id, x-session-id, x-user-age, x-rotana-secret-key, x-rotana-bypass, x-rotana-passcode, x-bypass-code, X-Requested-With, Accept, Origin, Range, Cache-Control, *',
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
    if (
      !ua ||
      ua.length < 5 ||
      /(^|[^a-z0-9])(curl|wget|python|aiohttp|httpx|httpie|urllib|requests|scrapy|postman|postmanruntime|insomnia|go-http-client|axios|node-fetch|undici|got|superagent|libwww|scapy|sqlmap|nikto|masscan|nmap|zgrab|censys|shodan|headless|phantomjs|selenium|puppeteer|playwright|cypress|wrk|vegeta|locust|apachebench|ab\/|restsharp|okhttp|dart|httpclient|apache-httpclient|powershell|invoke-webrequest|invoke-restmethod)($|[^a-z0-9])/i.test(
        ua
      )
    ) {
      return Response.json({ success: false, error: 'Forbidden: Bot or cURL blocked' }, { status: 403, headers: corsHeaders });
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

    // 2. Primary Engine: Gemini Nano Banana 2.1 via Google GenAI REST Interactions
    for (const key of candidateKeys) {
      if (imageUrl) break;
      try {
        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/interactions`, {
          method: 'POST',
          headers: {
            'x-goog-api-key': key,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gemini-nano-banana-2.1',
            input: [{ type: 'text', text: `Generate a high-definition hilarious viral meme: ${memePrompt}` }]
          }),
          signal: AbortSignal.timeout(4000)
        });

        if (geminiRes.status === 429) {
          // Free tier has 0 quota for nano-banana-2.1, don't waste time retrying 5 keys
          break;
        }

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const b64 = geminiData.output_image?.data;
          if (b64 && typeof b64 === 'string' && b64.length > 500) {
            imageUrl = `data:image/jpeg;base64,${b64}`;
            engineUsed = 'Gemini Nano Banana 2.1 (Google GenAI)';
            break;
          }
        }
      } catch (err) {
        console.warn('[Gemini Nano Banana 2.1] Generation attempt skipped:', err.message);
        break;
      }
    }

    // 3. Ultra-HD Fallback Engine: Fast Parallel Fetch (Pollinations Turbo/Flux with Verified Magic Bytes)
    if (!imageUrl) {
      const seed = Math.floor(Math.random() * 9000000) + 1000000;
      const candidateEngines = [
        {
          name: 'Neural Turbo Fast Core (768x768 Base64)',
          url: `https://image.pollinations.ai/prompt/${encodeURIComponent(memePrompt)}?width=768&height=768&model=turbo&seed=${seed}&nologo=true`,
          timeoutMs: 14000
        },
        {
          name: 'Neural Turbo Fast Core Alternative (512x512 Base64)',
          url: `https://image.pollinations.ai/prompt/${encodeURIComponent(memePrompt)}?width=512&height=512&model=turbo&seed=${seed + 1}&nologo=true`,
          timeoutMs: 14000
        },
        {
          name: 'Nano Banana Neural Flux Core (1024x1024 HD Base64)',
          url: `https://image.pollinations.ai/prompt/${encodeURIComponent(memePrompt)}?width=1024&height=1024&model=flux&seed=${seed}&nologo=true`,
          timeoutMs: 18000
        }
      ];

      const fetchCandidate = async (candidate) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), candidate.timeoutMs);
        try {
          const imgRes = await fetch(candidate.url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
            },
            signal: controller.signal
          });
          clearTimeout(timer);

          if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status}`);
          const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
          if (!contentType.includes('image')) throw new Error('Not an image content type');

          const arrayBuffer = await imgRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          if (buffer.length < 8000) throw new Error('Image buffer too small');

          // Strictly verify binary magic bytes (JPEG: FF D8 FF, PNG: 89 50 4E 47, WEBP: RIFF...WEBP)
          const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
          const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
          const isWebp = buffer.toString('utf8', 0, 4) === 'RIFF' && buffer.toString('utf8', 8, 12) === 'WEBP';

          if (!isJpeg && !isPng && !isWebp) throw new Error('Invalid image magic bytes');

          const cleanType = isJpeg ? 'image/jpeg' : isPng ? 'image/png' : 'image/webp';
          return {
            imageUrl: `data:${cleanType};base64,${buffer.toString('base64')}`,
            engine: candidate.name
          };
        } catch (err) {
          clearTimeout(timer);
          throw err;
        }
      };

      try {
        const fastestSuccess = await Promise.any(candidateEngines.map((c) => fetchCandidate(c)));
        if (fastestSuccess?.imageUrl) {
          imageUrl = fastestSuccess.imageUrl;
          engineUsed = fastestSuccess.engine;
        }
      } catch (raceErr) {
        console.warn('[MemeEngine] Parallel fetch failed, falling back to sequential fetch:', raceErr.message);
        for (const candidate of candidateEngines) {
          if (imageUrl) break;
          try {
            const res = await fetchCandidate(candidate);
            if (res?.imageUrl) {
              imageUrl = res.imageUrl;
              engineUsed = res.engine;
              break;
            }
          } catch {}
        }
      }
    }

    if (!imageUrl) {
      return Response.json(
        {
          success: false,
          error: 'Generation Failed',
          message:
            bot === 'konpov'
              ? `អាម៉ូយ ${username}! ប្រព័ន្ធគូសរូបកំពុងរវល់ខ្លាំង មិនទាន់អាចបង្កើតរូបភាពបាន ១០០% ទេ សូមចុចសាកល្បងម្ដងទៀតណា៎!`
              : `អូអាប្អូន ${username}! ប្រព័ន្ធកំពុងមមាញឹកខ្លាំង មិនទាន់អាចបង្កើតរូបភាពបាន ១០០% ទេ សូមប្អូនចុចសាកល្បងម្ដងទៀតណា៎!`
        },
        { status: 502, headers: corsHeaders }
      );
    }

    // Record quota ONLY after successful 100% verified image creation
    quotaResult.record();

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
