// Standard Web API Response is used natively in Next.js Route Handlers

// In-memory sliding window rate limiter
// Max 5 messages per 1 minute (60 seconds) per device/IP
const rateLimitMap = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 5;

// Clean up old rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, history] of rateLimitMap.entries()) {
    const valid = history.filter((time) => now - time < WINDOW_MS);
    if (valid.length === 0) {
      rateLimitMap.delete(key);
    } else {
      rateLimitMap.set(key, valid);
    }
  }
}, 5 * 60 * 1000);

function checkRateLimit(key) {
  const now = Date.now();
  const history = (rateLimitMap.get(key) || []).filter((time) => now - time < WINDOW_MS);
  if (history.length >= MAX_REQUESTS) {
    const oldestTime = history[0];
    const retryAfter = Math.max(1, Math.ceil((oldestTime + WINDOW_MS - now) / 1000));
    return { allowed: false, retryAfter };
  }
  history.push(now);
  rateLimitMap.set(key, history);
  return { allowed: true };
}

// Active models with automated fallback to guarantee 100% uptime
const TEXT_MODELS = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-flash-latest'];
const AUDIO_MODELS = [
  'gemini-2.5-flash-preview-tts',
  'gemini-3.8-flash-lite-tts',
  'gemini-3.8-flash-tts',
  'gemini-3.1-flash-tts-preview',
  'gemini-2.5-pro-preview-tts'
];

async function callModelWithFallback(models, apiKey, payload) {
  let lastError = null;
  let lastData = null;
  let lastStatus = 500;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        return { ok: true, data, status: res.status };
      }
      lastStatus = res.status;
      lastData = data;
    } catch (err) {
      lastError = err;
    }
  }

  return { ok: false, data: lastData, error: lastError?.message, status: lastStatus };
}

// Sanitize response to conceal upstream provider & model names in Network devtools
function sanitizeResponse(data) {
  if (!data || typeof data !== 'object') return data;
  const clone = { ...data };
  if (clone.modelVersion) {
    clone.modelVersion = 'setec-troll-engine-v2';
  }
  if (clone.responseId) {
    delete clone.responseId;
  }
  return clone;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { prompt, systemInstruction, audio, contents, generationConfig, bot } = body;

    // 1. Anti-Spam / Anti-DDoS Rate Limiting
    // Enforces strict maximum 5 chat messages per minute per device/IP
    // Internal audio synthesis requests do not consume the chat message quota
    if (!audio) {
      const forwardedFor = req.headers.get('x-forwarded-for') || '';
      const ip = forwardedFor.split(',')[0].trim() || 'unknown-ip';
      const deviceId = req.headers.get('x-device-id') || req.headers.get('user-agent') || 'default-device';
      const rateLimitKey = `${ip}_${deviceId}`;

      const rateResult = checkRateLimit(rateLimitKey);
      if (!rateResult.allowed) {
        return Response.json(
          {
            error: 'Too Many Requests',
            message: `⚠️ ប្រព័ន្ធសុវត្ថិភាព Anti-Spam / Anti-DDoS:\nឧបករណ៍របស់អ្នកបានផ្ញើសារលើសពី ៥ ដងក្នុង ១ នាទី! សូមរង់ចាំ ${rateResult.retryAfter} វិនាទីទៀតមុនពេលសាកល្បងម្ដងទៀត ដើម្បីការពារ Server ពីការ Spam។`
          },
          {
            status: 429,
            headers: { 'Retry-After': String(rateResult.retryAfter) }
          }
        );
      }
    }

    // 2. Select API Key according to the Bot (KonPov vs KonBong)
    let apiKey = process.env.GEMINI_API_KEY;
    if (bot === 'konpov' && process.env.GEMINI_API_KEY_KONPOV) {
      apiKey = process.env.GEMINI_API_KEY_KONPOV;
    } else if (bot === 'konbong' && process.env.GEMINI_API_KEY_KONBONG) {
      apiKey = process.env.GEMINI_API_KEY_KONBONG;
    } else {
      apiKey =
        process.env.GEMINI_API_KEY_KONBONG ||
        process.env.GEMINI_API_KEY_KONPOV ||
        process.env.GEMINI_API_KEY;
    }

    if (!apiKey) {
      return Response.json(
        { error: 'AI engine key is not configured in server environment' },
        { status: 500 }
      );
    }

    // 3. Format payload
    let requestPayload;
    if (audio) {
      // Clean speech text: Remove any prompt prefixes so the voice reads ONLY the clean message text
      let speechText = prompt || '';
      if (contents && contents[0]?.parts?.[0]?.text) {
        speechText = contents[0].parts[0].text;
      }
      speechText = speechText
        .replace(/^(?:Say|Speak|Read)\s+this[\s\S]*?(?:Text:\s*|:\s*)/i, '')
        .replace(/^["']|["']$/g, '')
        .trim();

      const audioContents = [{ parts: [{ text: speechText }] }];
      const voiceName =
        generationConfig?.speechConfig?.voiceConfig?.prebuiltVoiceConfig?.voiceName ||
        (bot === 'konpov' ? 'Puck' : 'Charon');
      const audioGenConfig = {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName
            }
          }
        }
      };
      requestPayload = {
        contents: audioContents,
        generationConfig: audioGenConfig
      };
      const result = await callModelWithFallback(AUDIO_MODELS, apiKey, requestPayload);
      if (result.ok) {
        return Response.json(sanitizeResponse(result.data), { status: 200 });
      }
      return Response.json(sanitizeResponse(result.data) || { error: result.error }, { status: result.status });
    } else {
      const textContents = contents || [{ parts: [{ text: prompt }] }];
      const formattedSystemInstruction = systemInstruction
        ? typeof systemInstruction === 'string'
          ? { parts: [{ text: systemInstruction }] }
          : systemInstruction
        : undefined;

      requestPayload = {
        contents: textContents,
        ...(formattedSystemInstruction && { systemInstruction: formattedSystemInstruction })
      };
      const result = await callModelWithFallback(TEXT_MODELS, apiKey, requestPayload);
      if (result.ok) {
        return Response.json(sanitizeResponse(result.data), { status: 200 });
      }
      return Response.json(sanitizeResponse(result.data) || { error: result.error }, { status: result.status });
    }
  } catch (error) {
    console.error('Chat API proxy error:', error);
    return Response.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
