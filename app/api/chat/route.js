// Standard Web API Response is used natively in Next.js Route Handlers

import {
  alertChatActivity,
  alertSecuritySpam,
  alertSystemError
} from '../../../lib/telegram';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-device-id',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

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

// Active models with automated fallback to guarantee 100% uptime (including vision & audio)
const TEXT_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-exp',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-flash-latest'
];
const AUDIO_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-exp',
  'gemini-1.5-flash'
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

// Fast streaming with SSE fallback for real-time ChatGPT-like preview
async function callStreamingModelWithFallback(models, apiKey, payload) {
  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok && res.body) {
        return { ok: true, stream: res.body };
      }
    } catch (err) {
      console.warn(`[Stream] Fallback from ${model}:`, err.message);
    }
  }
  return { ok: false };
}

// High-performance fallback Khmer Speech Synthesis for 100% audio uptime on mobile & web
async function fetchKhmerSpeechFallback(text) {
  try {
    if (!text || typeof text !== 'string') return null;
    const cleanText = text
      .replace(/[*_#`~[\]()]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleanText) return null;

    // Split text into chunks <= 180 chars at natural sentence/phrase boundaries
    const chunks = [];
    let remaining = cleanText;
    while (remaining.length > 0) {
      if (remaining.length <= 180) {
        chunks.push(remaining);
        break;
      }
      let splitIdx = -1;
      const separators = ['។', '?', '!', '\n', ' ', '，', ','];
      for (const sep of separators) {
        const idx = remaining.lastIndexOf(sep, 180);
        if (idx > splitIdx && idx > 30) {
          splitIdx = idx;
        }
      }
      if (splitIdx === -1) splitIdx = 180;
      chunks.push(remaining.slice(0, splitIdx + 1).trim());
      remaining = remaining.slice(splitIdx + 1).trim();
    }

    const buffers = [];
    for (const chunk of chunks) {
      if (!chunk) continue;
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=km&client=tw-ob`;
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      if (res.ok) {
        const buf = await res.arrayBuffer();
        buffers.push(Buffer.from(buf));
      }
    }

    if (buffers.length === 0) return null;
    const combined = Buffer.concat(buffers);
    return combined.toString('base64');
  } catch (err) {
    console.error('Khmer TTS fallback error:', err);
    return null;
  }
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
  let reqBot = '';
  let reqUsername = '';
  let clientIp = 'unknown-ip';
  let clientUserAgent = 'Unknown';

  try {
    const forwardedFor = req.headers.get('x-forwarded-for') || '';
    clientIp = forwardedFor.split(',')[0].trim() || 'unknown-ip';
    clientUserAgent = req.headers.get('user-agent') || 'Unknown';

    const body = await req.json();
    const { prompt, systemInstruction, audio, contents, generationConfig, bot, username, gender } = body;
    reqBot = bot;
    reqUsername = username;

    // 1. Anti-Spam / Anti-DDoS Rate Limiting
    // Enforces strict maximum 5 chat messages per minute per device/IP
    // Internal audio synthesis requests do not consume the chat message quota
    if (!audio) {
      const deviceId = req.headers.get('x-device-id') || req.headers.get('user-agent') || 'default-device';
      const rateLimitKey = `${clientIp}_${deviceId}`;

      const rateResult = checkRateLimit(rateLimitKey);
      if (!rateResult.allowed) {
        // High-priority Telegram Security Spam Alert
        const userPrompt = prompt || contents?.[contents.length - 1]?.parts?.[0]?.text || '';
        alertSecuritySpam({
          username: username || 'Unknown',
          ip: clientIp,
          userAgent: clientUserAgent,
          bot: bot || 'Unknown',
          retryAfter: rateResult.retryAfter,
          prompt: userPrompt
        }).catch((e) => console.error('[Telegram] Alert spam error:', e));

        return Response.json(
          {
            error: 'Too Many Requests',
            ip: clientIp,
            device: clientUserAgent,
            retryAfter: rateResult.retryAfter,
            message: `⚠️ ប្រព័ន្ធសុវត្ថិភាព Anti-Spam / Anti-DDoS:\nឧបករណ៍របស់អ្នកបានផ្ញើសារលើសពី ៥ ដងក្នុង ១ នាទី! សូមរង់ចាំ ${rateResult.retryAfter} វិនាទីទៀតមុនពេលសាកល្បងម្ដងទៀត ដើម្បីការពារ Server ពីការ Spam។`
          },
          {
            status: 429,
            headers: { ...corsHeaders, 'Retry-After': String(rateResult.retryAfter) }
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
      alertSystemError({
        type: 'Missing API Key Config',
        username,
        bot,
        ip: clientIp,
        userAgent: clientUserAgent,
        errorMessage: 'AI engine key is not configured in server environment'
      }).catch((e) => console.error('[Telegram] API key error alert:', e));

      return Response.json(
        { error: 'AI engine key is not configured in server environment' },
        { status: 500, headers: corsHeaders }
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

      // Provide expressive vocal instruction so Gemini's voice sounds ultra-funny, smug, and full of life
      const voicePrompt =
        bot === 'konpov'
          ? `Read this aloud in an ultra-expressive, funny, cheeky, sarcastic, and energetic Khmer Gen Z tone with playful swagger and laughter: "${speechText}"`
          : `Read this aloud clearly, warmly, and playfully in Khmer: "${speechText}"`;

      const audioContents = [{ parts: [{ text: voicePrompt }] }];
      const voiceName =
        generationConfig?.speechConfig?.voiceConfig?.prebuiltVoiceConfig?.voiceName ||
        (bot === 'konpov'
          ? (gender === 'ប្រុស' ? 'Aoede' : 'Puck')
          : 'Puck');
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
      if (result.ok && result.data?.candidates?.[0]?.content?.parts?.some((p) => p.inlineData?.data)) {
        return Response.json(sanitizeResponse(result.data), { status: 200, headers: corsHeaders });
      }

      // Seamless fallback to high-uptime Khmer speech synthesis when AI TTS quota is exhausted
      const fallbackAudioB64 = await fetchKhmerSpeechFallback(speechText);
      if (fallbackAudioB64) {
        return Response.json(
          {
            isFallbackBotVoice: true,
            candidates: [
              {
                content: {
                  parts: [
                    {
                      inlineData: {
                        mimeType: 'audio/mpeg',
                        data: fallbackAudioB64
                      }
                    }
                  ]
                }
              }
            ],
            modelVersion: 'setec-troll-engine-v2-speech'
          },
          { status: 200, headers: corsHeaders }
        );
      }

      // If both AI TTS and fallback speech synthesis fail, alert Telegram
      alertSystemError({
        type: 'Voice Synthesis Failure',
        username,
        bot,
        ip: clientIp,
        userAgent: clientUserAgent,
        errorMessage: result.error || 'Audio generation failed',
        details: { textLength: speechText.length }
      }).catch((e) => console.error('[Telegram] Audio error alert:', e));

      return Response.json(
        sanitizeResponse(result.data) || { error: result.error || 'Audio generation failed' },
        { status: result.status, headers: corsHeaders }
      );
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
      // Determine user prompt text for alert logging
      const lastPart = textContents?.[textContents.length - 1]?.parts || [];
      const hasImg = lastPart.some((p) => p.inlineData);
      const textFound = lastPart.find((p) => p.text)?.text || prompt || '';
      const userPrompt = (hasImg ? '🖼️ [រូបភាព] ' : '') + textFound;

      // Real-time ChatGPT-like Streaming Mode (SSE)
      if (body.stream) {
        const streamResult = await callStreamingModelWithFallback(TEXT_MODELS, apiKey, requestPayload);
        if (streamResult.ok) {
          alertChatActivity({
            username: username || 'Unknown',
            gender,
            bot,
            ip: clientIp,
            userAgent: clientUserAgent,
            prompt: userPrompt,
            isError: false
          }).catch((e) => console.error('[Telegram] Chat alert error:', e));

          return new Response(streamResult.stream, {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'text/event-stream; charset=utf-8',
              'Cache-Control': 'no-cache, no-transform',
              'Connection': 'keep-alive',
              'X-Accel-Buffering': 'no'
            }
          });
        }
      }

      // Standard Non-streaming Response
      const result = await callModelWithFallback(TEXT_MODELS, apiKey, requestPayload);
      if (result.ok) {
        alertChatActivity({
          username: username || 'Unknown',
          gender,
          bot,
          ip: clientIp,
          userAgent: clientUserAgent,
          prompt: userPrompt,
          isError: false
        }).catch((e) => console.error('[Telegram] Chat alert error:', e));

        return Response.json(sanitizeResponse(result.data), { status: 200, headers: corsHeaders });
      }

      // AI Generation Failure alert to Telegram
      alertSystemError({
        type: 'AI Generation Failure',
        username,
        bot,
        ip: clientIp,
        userAgent: clientUserAgent,
        errorMessage: result.error || 'Failed to generate response',
        details: { status: result.status }
      }).catch((e) => console.error('[Telegram] AI error alert:', e));

      return Response.json(sanitizeResponse(result.data) || { error: result.error }, { status: result.status, headers: corsHeaders });
    }
  } catch (error) {
    console.error('Chat API proxy error:', error);
    alertSystemError({
      type: 'Internal Server Error / Bad Request',
      username: reqUsername,
      bot: reqBot,
      ip: clientIp,
      userAgent: clientUserAgent,
      errorMessage: error.message
    }).catch((e) => console.error('[Telegram] Catch error alert:', e));

    return Response.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
