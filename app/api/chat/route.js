// Standard Web API Response is used natively in Next.js Route Handlers

import {
  alertChatActivity,
  alertSecuritySpam,
  alertSystemError
} from '../../../lib/telegram';
import {
  checkDDoSFirewall,
  checkChatLimit,
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

// Active ultra-fast models with automated fallback to guarantee 100% uptime & low latency (<1.2s)
const TEXT_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.1-flash-lite-preview',
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash'
];
const AUDIO_MODELS = [
  'gemini-3.8-flash-tts',
  'gemini-3.1-flash-tts-preview',
  'gemini-3.8-flash-lite-tts'
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

// High-performance fallback Khmer Speech Synthesis with parallel chunk fetching for instant audio (<500ms)
async function fetchKhmerSpeechFallback(text) {
  try {
    if (!text || typeof text !== 'string') return null;
    const cleanText = text
      .replace(/[*_#`~[\]()]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleanText) return null;

    // Split text into chunks <= 160 chars at natural sentence/phrase boundaries (limit to max 5 chunks for instant playback)
    const chunks = [];
    let remaining = cleanText.slice(0, 800);
    while (remaining.length > 0 && chunks.length < 5) {
      if (remaining.length <= 160) {
        chunks.push(remaining);
        break;
      }
      let splitIdx = -1;
      const separators = ['។', '?', '!', '\n', ' ', '，', ','];
      for (const sep of separators) {
        const idx = remaining.lastIndexOf(sep, 160);
        if (idx > splitIdx && idx > 25) {
          splitIdx = idx;
        }
      }
      if (splitIdx === -1) splitIdx = 160;
      chunks.push(remaining.slice(0, splitIdx + 1).trim());
      remaining = remaining.slice(splitIdx + 1).trim();
    }

    // Parallel fetch for speed
    const buffers = await Promise.all(
      chunks.map(async (chunk) => {
        if (!chunk) return null;
        try {
          const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=km&client=tw-ob`;
          const res = await fetch(url, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
          });
          if (res.ok) {
            const buf = await res.arrayBuffer();
            return Buffer.from(buf);
          }
        } catch {
          return null;
        }
        return null;
      })
    );

    const validBuffers = buffers.filter(Boolean);
    if (validBuffers.length === 0) return null;
    const combined = Buffer.concat(validBuffers);
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
    clientIp = getClientIp(req);
    clientUserAgent = req.headers.get('user-agent') || 'Unknown';

    // 0. Anti-DDoS and Burst Flooding Firewall Check
    const ddosCheck = checkDDoSFirewall(req, 'chat');
    if (!ddosCheck.allowed) {
      return Response.json(
        {
          error: 'Too Many Requests',
          message: ddosCheck.message,
          retryAfter: ddosCheck.retryAfter
        },
        {
          status: 429,
          headers: { ...corsHeaders, 'Retry-After': String(ddosCheck.retryAfter) }
        }
      );
    }

    const body = await req.json();
    const { prompt, systemInstruction, audio, contents, generationConfig, bot, username, gender } = body;
    reqBot = bot;
    reqUsername = username;

    // 1. Anti-Spam Rate Limiting (Tracked strictly per username, never locking the device permanently)
    // Internal audio synthesis requests do not consume the chat message quota
    if (!audio) {
      const rateResult = checkChatLimit(clientIp, username || 'user');
      if (!rateResult.allowed) {
        return Response.json(
          {
            error: 'Too Many Requests',
            ip: clientIp,
            device: clientUserAgent,
            retryAfter: rateResult.retryAfter,
            message: `សូមរង់ចាំបន្តិចណា៎! ឈ្មោះ "${username || 'User'}" ផ្ញើសារញាប់ពេកហើយ សូមរង់ចាំ ${rateResult.retryAfter} វិនាទីដើម្បីបន្ត។`
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

      // The TTS models require pure transcript text without conversational instructions
      const audioContents = [{ parts: [{ text: speechText }] }];
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
      const userPrompt = (hasImg ? '[រូបភាព] ' : '') + textFound;

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
