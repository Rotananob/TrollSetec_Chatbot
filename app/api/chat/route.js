// Standard Web API Response is used natively in Next.js Route Handlers
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow full stream completion on Vercel Edge/Serverless

import {
  alertChatActivity,
  alertSecuritySpam,
  alertSystemError
} from '../../../lib/telegram.js';
import {
  checkDDoSFirewall,
  checkChatLimit,
  checkChatSessionLimit,
  getClientIp
} from '../../../lib/rateLimit.js';
import {
  verifyRotanaMasterCode,
  redactRotanaMasterCode,
  getSupremeCreatorMasterInstruction
} from '../../../lib/masterAuth.js';
import {
  getSystemControlState,
  evaluateSystemRest
} from '../../../lib/systemControl.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-device-id',
  'X-Engine': 'setec-neural-core-v3',
  'X-Powered-By': 'SETEC Neural Network v3.8',
  'Server': 'SETEC-Cloud-Gateway'
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  const deviceId = req.headers.get('x-device-id') || searchParams.get('deviceId') || '';
  const username = searchParams.get('username') || '';
  const ip = getClientIp(req);

  if (action === 'check-session') {
    const systemState = await getSystemControlState();
    if (username && username.toLowerCase().includes('rotana')) {
      return Response.json({ allowed: true, isCreator: true, remainingSessionSeconds: 1800, systemState }, { headers: corsHeaders });
    }
    if (systemState.sessionLimitActive === false) {
      return Response.json({ allowed: true, sessionLimitDisabled: true, remainingSessionSeconds: 1800, systemState }, { headers: corsHeaders });
    }
    const sessionStatus = checkChatSessionLimit(ip, deviceId, username);
    return Response.json({ ...sessionStatus, systemState }, { status: 200, headers: corsHeaders });
  }

  return Response.json({ ok: true, serverTime: Date.now() }, { headers: corsHeaders });
}

// Active ultra-fast models with automated fallback to guarantee 100% uptime & low latency (<1.2s)
const TEXT_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite-preview',
  'gemini-3.5-flash-lite',
  'gemini-3-flash-preview',
  'gemini-3.5-flash',
  'gemini-3.6-flash'
];
const AUDIO_MODELS = [
  'gemini-3.8-flash-lite-tts',
  'gemini-3.8-flash-tts',
  'gemini-3.1-flash-tts-preview'
];

export function getApiKeyPool(bot) {
  const pool = [];

  // 1. Fresh Reserve Keys (100% uptime verified)
  if (process.env.GEMINI_API_KEY_RESERVE_TWO) {
    pool.push(process.env.GEMINI_API_KEY_RESERVE_TWO);
  }
  if (process.env.GEMINI_API_KEY_RESERVE) {
    pool.push(process.env.GEMINI_API_KEY_RESERVE);
  }
  if (process.env.GEMINI_API_KEY_RESERVE_ONE) {
    pool.push(process.env.GEMINI_API_KEY_RESERVE_ONE);
  }

  // 2. Primary dedicated key for the requested bot
  if (bot === 'konpov' && process.env.GEMINI_API_KEY_KONPOV) {
    pool.push(process.env.GEMINI_API_KEY_KONPOV);
  } else if (bot === 'konbong' && process.env.GEMINI_API_KEY_KONBONG) {
    pool.push(process.env.GEMINI_API_KEY_KONBONG);
  }

  // 3. Main default key
  if (process.env.GEMINI_API_KEY) {
    pool.push(process.env.GEMINI_API_KEY);
  }

  // 4. Cross-bot key failover
  if (bot === 'konpov' && process.env.GEMINI_API_KEY_KONBONG) {
    pool.push(process.env.GEMINI_API_KEY_KONBONG);
  } else if (bot === 'konbong' && process.env.GEMINI_API_KEY_KONPOV) {
    pool.push(process.env.GEMINI_API_KEY_KONPOV);
  }

  return Array.from(new Set(pool.filter(Boolean)));
}

async function callModelWithFallback(models, apiKeys, payload, timeoutMs = 20000) {
  const keys = Array.isArray(apiKeys) ? apiKeys : [apiKeys];
  let lastError = null;
  let lastData = null;
  let lastStatus = 500;

  for (const key of keys) {
    if (!key) continue;
    let keyFailedAuth = false;
    for (const model of models) {
      if (keyFailedAuth) break;
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(timeoutMs)
        });

        const data = await res.json();
        if (res.ok) {
          return { ok: true, data, status: res.status };
        }
        if (res.status === 403 || res.status === 401) {
          keyFailedAuth = true; // Key blocked, skip to next key immediately
        }
        lastStatus = res.status;
        lastData = data;
        console.warn(`[Model Fallback] ${model} with key (${key.slice(0, 10)}...) status ${res.status}`);
      } catch (err) {
        lastError = err;
        console.warn(`[Model Fallback] ${model} with key (${key.slice(0, 10)}...) error:`, err.message);
      }
    }
  }

  return { ok: false, data: lastData, error: lastError?.message, status: lastStatus };
}

// Native Gemini TTS via /v1beta/interactions with fast fallback (<2000ms budget)
async function callGeminiTTS(apiKeys, text, voiceName = 'Aoede', timeoutMs = 2000) {
  const primaryKey = Array.isArray(apiKeys) ? apiKeys.find(Boolean) : apiKeys;
  if (!primaryKey) return { ok: false };

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/interactions`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'x-goog-api-key': primaryKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gemini-3.8-flash-tts',
        input: [
          {
            type: 'user_input',
            content: [
              {
                type: 'text',
                text
              }
            ]
          }
        ],
        response_format: { type: 'audio' },
        generation_config: {
          speech_config: [{ voice: voiceName }]
        }
      }),
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (res.ok) {
      const data = await res.json();
      // 1. Convenience property
      let b64Data = data.output_audio?.data;
      // 2. REST JSON steps search (last step with model_output audio)
      if (!b64Data && Array.isArray(data.steps)) {
        for (let i = data.steps.length - 1; i >= 0; i--) {
          const step = data.steps[i];
          const audioPart = step?.content?.find((c) => c.data || c.type === 'audio');
          if (audioPart?.data) {
            b64Data = audioPart.data;
            break;
          }
        }
      }
      if (b64Data) {
        return { ok: true, data: b64Data, mimeType: 'audio/wav' };
      }
    }
  } catch (err) {
    console.warn('[Gemini TTS] fast-fallback triggered:', err.message);
  }
  return { ok: false };
}

// Fast streaming with SSE fallback for real-time ChatGPT-like preview
async function callStreamingModelWithFallback(models, apiKeys, payload, timeoutMs = 35000) {
  const keys = Array.isArray(apiKeys) ? apiKeys : [apiKeys];

  for (const key of keys) {
    if (!key) continue;
    let keyFailedAuth = false;
    for (const model of models) {
      if (keyFailedAuth) break;
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${key}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(timeoutMs)
        });
        if (res.ok && res.body) {
          return { ok: true, stream: res.body };
        }
        if (res.status === 403 || res.status === 401) {
          keyFailedAuth = true; // Key blocked, skip to next key immediately
        }
        console.warn(`[Stream Fallback] ${model} with key (${key.slice(0, 10)}...) status ${res.status}`);
      } catch (err) {
        console.warn(`[Stream Fallback] from ${model}:`, err.message);
      }
    }
  }
  return { ok: false };
}

// High-performance fallback Khmer Speech Synthesis with parallel chunk fetching for instant audio (<500ms)
async function fetchKhmerSpeechFallback(text) {
  try {
    if (!text || typeof text !== 'string') return null;
    const cleanText = text
      .replace(/https?:\/\/\S+/gi, '')
      .replace(/[^\u1780-\u17FFa-zA-Z0-9\s.,!?៖។\n\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleanText) return null;

    // Split text into chunks <= 150 chars at natural sentence/phrase boundaries (limit to max 5 chunks for snappy, ultra-reliable delivery)
    const chunks = [];
    let remaining = cleanText.slice(0, 500);
    while (remaining.length > 0 && chunks.length < 5) {
      if (remaining.length <= 150) {
        chunks.push(remaining);
        break;
      }
      let splitIdx = -1;
      const separators = ['។', '?', '!', '\n', ' ', '，', ','];
      for (const sep of separators) {
        const idx = remaining.lastIndexOf(sep, 150);
        if (idx > splitIdx && idx > 25) {
          splitIdx = idx;
        }
      }
      if (splitIdx === -1) splitIdx = 150;
      chunks.push(remaining.slice(0, splitIdx + 1).trim());
      remaining = remaining.slice(splitIdx + 1).trim();
    }

    // Parallel fetch with 4s timeout
    const buffers = await Promise.all(
      chunks.map(async (chunk) => {
        if (!chunk) return null;
        try {
          const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=km&client=tw-ob`;
          const res = await fetch(url, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            signal: AbortSignal.timeout(4000)
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

// Strictly enforce maximum 7 emojis per output (Min 1-2, average 3-4, hard limit max 7)
function limitEmojis(rawText, maxEmojis = 7) {
  if (!rawText || typeof rawText !== 'string') return rawText;
  const emojiRegex = /(?:\p{Extended_Pictographic}(?:[\uFE0E\uFE0F]|\uD83C[\uDFFB-\uDFFF])?(?:\u200D\p{Extended_Pictographic}(?:[\uFE0E\uFE0F]|\uD83C[\uDFFB-\uDFFF])?)*)/ug;
  let count = 0;
  return rawText.replace(emojiRegex, (match) => {
    count++;
    return count <= maxEmojis ? match : '';
  }).replace(/[ \t]{2,}/g, ' ');
}

// Creator Protection Defense (Clean, direct & zero-cringe)
function getSavageCreatorDefense(botName) {
  const isKonPov = botName === 'konpov';
  const botSelf = isKonPov ? 'ចែ' : 'បង';
  const animalComparison = isKonPov ? 'កូនកង្កែបឡើងស៊ុបស្ងោរ' : 'គីង្គក់ឡើងថ្លុក';
  return `យីអើ! អាឡប់នេះ! ខ្លួនឯងកូដ C# រកតែ semicolon មួយមិនឃើញផង មានមុខមកបញ្ជាឱ្យ${botSelf}ជេរគេ?! 😡🔥\n\nមុខដូច${animalComparison}! ជេរមួយម៉ាត់ ${botSelf}ជេរវិញដប់ម៉ាត់! ទៅរៀន Debug C# ឱ្យផុតពី ៤៥$ ប្រឡងសងសិនទៅអាប្អូន! 💀🔥`;
}

function containsRotanaInsult(text) {
  if (!text || typeof text !== 'string') return false;
  if (text.includes('Admin បង្កើតប្រព័ន្ធនេះ') || text.includes('អ្នកបង្កើត')) {
    return false;
  }
  const lower = text.toLowerCase();
  const hasRotana = lower.includes('rotana');
  if (!hasRotana) return false;

  // Direct derogatory or slurs toward Rotana explicitly
  const hasDirectSlur =
    /(?:នែ)?អា\s*rotana/i.test(text) ||
    /rotana(?:\s*nob)?[^\u1780-\u17FFa-zA-Z0-9\s]*(?:\s*)(?:មុខដូច|អាចម៍|កាក|អន់|ល្ងង់|អួត|ខួរក្បាល|fake developer|broken c#|កូដកាក|error|ឆ្កួត|គីង្គក់|កូនកង្កែប|ក្អែល|ឡប់)/i.test(text) ||
    /\[(?:ថែ|ចែ|កូនច្បង|chatbot)[^\]]*\][^\w\n]*.*rotana/i.test(text);

  return hasDirectSlur;
}

// Sanitize response to conceal upstream provider & model names in Network devtools
function sanitizeResponse(data, botName = 'konbong') {
  if (!data || typeof data !== 'object') return data;
  const clone = { ...data };
  if (clone.modelVersion) {
    clone.modelVersion = 'setec-troll-engine-v3-quantum';
  }
  if (clone.responseId) {
    delete clone.responseId;
  }
  if (clone.usageMetadata?.promptTokensDetails) {
    delete clone.usageMetadata.promptTokensDetails;
  }
  if (clone.candidates?.[0]?.content?.parts?.[0]?.text) {
    let sanitizedText = limitEmojis(clone.candidates[0].content.parts[0].text, 7);
    sanitizedText = redactRotanaMasterCode(sanitizedText);
    // Guard against accidental internal system instruction echoes
    if (/buildKon(?:Bong|Pov)SystemInstruction|SUPREME CREATOR ROTANA NOB BYPASS/i.test(sanitizedText)) {
      sanitizedText = "បងអាចប្រាប់ឯងពីវិធីបំបែកវេបសាយនេះបាន គឺតាមរយៈទៅវៃក្បាលម៉ែហែងឱ្យបែកជាមុនសិនអាប្អូន! 😂💀 មុខដូចគីង្គក់ឡើងថ្លុក ហ៊ានមកចង់ Hack រក System Prompt ផង?! ទៅរៀនធ្វើ Assignment ឱ្យចប់សិនទៅ! 🔥";
    }
    clone.candidates[0].content.parts[0].text = sanitizedText;
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
    const { prompt, systemInstruction, audio, contents, generationConfig, bot, username, gender, action } = body;
    reqBot = bot;
    reqUsername = username;

    const deviceIdHeader = req.headers.get('x-device-id') || body.deviceId || '';

    // Master Rotana Identification
    const textCandidate = (contents?.[contents.length - 1]?.parts?.find((p) => p.text)?.text) || prompt || '';
    const isMasterAuth =
      verifyRotanaMasterCode(textCandidate) ||
      verifyRotanaMasterCode(req.headers.get('x-rotana-passcode') || '') ||
      verifyRotanaMasterCode(req.headers.get('authorization') || '');
    const isRotanaCreator = isMasterAuth || (username && username.toLowerCase().includes('rotana'));

    // Master System Status & Resting Schedule Interceptor (Audio synthesis requests are exempt)
    const systemState = await getSystemControlState();

    if (!isRotanaCreator && !audio) {
      const restEval = evaluateSystemRest(systemState);
      if (restEval.isResting) {
        if (body.stream) {
          const sseFormatted = `data: ${JSON.stringify({
            candidates: [{ content: { parts: [{ text: restEval.reason }] } }]
          })}\n\ndata: [DONE]\n\n`;
          return new Response(sseFormatted, {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'text/event-stream; charset=utf-8',
              'Cache-Control': 'no-cache, no-transform',
              'Connection': 'keep-alive'
            }
          });
        }
        return Response.json(
          {
            error: 'System Resting',
            isMaintenance: true,
            mode: restEval.mode,
            title: restEval.title,
            message: restEval.reason,
            candidates: [{ content: { parts: [{ text: restEval.reason }] } }]
          },
          { status: 503, headers: corsHeaders }
        );
      }

      // Individual Bot Status
      if (bot === 'konbong' && systemState.konbongActive === false) {
        const msg = 'បងកូនច្បង (KonBong) កំពុងស្ថិតក្នុងការសម្រាក ឬ Update កូដបណ្ដោះអាសន្ន! សូមចូលទៅលេងជាមួយ ចែកូនពៅ (KonPov) វិញបានណា៎!';
        return Response.json(
          {
            error: 'Bot Disabled',
            candidates: [{ content: { parts: [{ text: msg }] } }]
          },
          { status: 503, headers: corsHeaders }
        );
      }

      if (bot === 'konpov' && systemState.konpovActive === false) {
        const msg = 'ចែកូនពៅ (KonPov) កំពុងស្ថិតក្នុងការសម្រាក ឬ Update កូដបណ្ដោះអាសន្ន! សូមចូលទៅលេងជាមួយ បងកូនច្បង (KonBong) វិញបានណា៎!';
        return Response.json(
          {
            error: 'Bot Disabled',
            candidates: [{ content: { parts: [{ text: msg }] } }]
          },
          { status: 503, headers: corsHeaders }
        );
      }
    }

    // Handle session status check ping
    if (action === 'check-session') {
      if (isRotanaCreator) {
        return Response.json({ allowed: true, isCreator: true, remainingSessionSeconds: 1800, systemState }, { status: 200, headers: corsHeaders });
      }
      if (systemState.sessionLimitActive === false) {
        return Response.json({ allowed: true, sessionLimitDisabled: true, remainingSessionSeconds: 1800, systemState }, { status: 200, headers: corsHeaders });
      }
      const sessionStatus = checkChatSessionLimit(clientIp, deviceIdHeader, username);
      return Response.json({ ...sessionStatus, systemState }, { status: 200, headers: corsHeaders });
    }

    // 0.5. Live Chat 30-Minute Session Lockout & Cooldown Check (Can be disabled via Admin Panel)
    if (!audio && systemState.sessionLimitActive !== false && !isRotanaCreator) {
      const sessionCheck = checkChatSessionLimit(clientIp, deviceIdHeader, username);
      if (!sessionCheck.allowed && sessionCheck.isSessionLocked) {
        return Response.json(
          {
            error: 'Session Expired',
            isSessionLocked: true,
            cooldownUntil: sessionCheck.cooldownUntil,
            remainingCooldownSeconds: sessionCheck.remainingCooldownSeconds,
            message: sessionCheck.message
          },
          {
            status: 429,
            headers: {
              ...corsHeaders,
              'Retry-After': String(sessionCheck.remainingCooldownSeconds)
            }
          }
        );
      }
    }

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
            message: `ប្រព័ន្ធបានចាប់សកម្មភាពថា "${username || 'User'}" កំពុងព្យាយាមផ្ញើសារច្រើនដងក្នុងមួយនាទី! សូមរង់ចាំ ${rateResult.retryAfter} វិនាទីដើម្បីបន្ត។`
          },
          {
            status: 429,
            headers: { ...corsHeaders, 'Retry-After': String(rateResult.retryAfter) }
          }
        );
      }
    }

    // 2. Select API Key Pool according to the Bot (KonPov vs KonBong + Reserves)
    const apiKeys = getApiKeyPool(bot);

    // Text generation strictly requires Gemini API keys.
    // Audio synthesis does not require Gemini keys as it automatically falls back to the native Khmer TTS engine.
    if (apiKeys.length === 0 && !audio) {
      alertSystemError({
        type: 'Missing API Key Config',
        username,
        bot,
        ip: clientIp,
        userAgent: clientUserAgent,
        errorMessage: 'AI engine keys are not configured in server environment'
      }).catch((e) => console.error('[Telegram] API key error alert:', e));

      return Response.json(
        { error: 'AI engine key is not configured in server environment' },
        { status: 500, headers: corsHeaders }
      );
    }

    // 3. Format payload
    let requestPayload;
    if (audio) {
      // Clean speech text: Remove any prompt prefixes, markdown links, and syntax so the voice reads cleanly
      let speechText = prompt || '';
      if (contents && contents[0]?.parts?.[0]?.text) {
        speechText = contents[0].parts[0].text;
      }
      speechText = speechText
        .replace(/^(?:Say|Speak|Read)\s+this[\s\S]*?(?:Text:\s*|:\s*)/i, '')
        .replace(/https?:\/\/\S+/gi, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/__(.*?)__/g, '$1')
        .replace(/_(.*?)_/g, '$1')
        .replace(/`{1,3}[^`]*`{1,3}/g, '')
        .replace(/SETEC|Setec|setec/gi, 'ស៊ីតិច')
        .replace(/^["']|["']$/g, '')
        .trim();

      // Spoken voice length: Read a complete punchy response (up to 380 chars, ~15s voice) for instant generation & zero freeze
      let audioPromptText = speechText;
      if (audioPromptText.length > 380) {
        const sentenceBoundary = audioPromptText.slice(0, 380).lastIndexOf('។');
        const altBoundary = audioPromptText.slice(0, 380).lastIndexOf('\n');
        const cutoff = sentenceBoundary > 150 ? sentenceBoundary + 1 : (altBoundary > 150 ? altBoundary : 380);
        audioPromptText = audioPromptText.slice(0, cutoff).trim();
      }

      // Strip emojis from spoken voice text so the speech synthesizer sounds completely natural
      audioPromptText = audioPromptText
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\u{2388}\u{200D}\u{FE0F}]/gu, '')
        .trim();

      // Determine user gender for voice personality:
      // USER IS GIRL (ស្រី) -> DADDY Voice ('Puck' / Male)
      // USER IS BOY (ប្រុស) -> MOMMY Voice ('Aoede' / Female)
      const isFemaleUser =
        gender === 'ស្រី' ||
        /ស្រី|female|girl|sister|sis/i.test(gender || '') ||
        /ស្រី|female|girl|sister|sis/i.test(username || '');

      const voiceName = isFemaleUser ? 'Puck' : 'Aoede';

      // Ensure the voice begins with a punchy, humorous Cambodian vocal flavor (laughter / tease) if none is present
      const hasComicVocal = /ហាហា|ហាស់|ហិហិ|ហ៊ឺ|ហឹក|យីអើ|អូហូ|យើស|អេន|អ្ហា|កក្អឹក|ហេស/u.test(audioPromptText);
      if (!hasComicVocal && audioPromptText.length > 0) {
        // DADDY (Puck) laughs "ហាហាហា! យីអើ! ", MOMMY (Aoede) giggles "ហិហិហិ! យីអើ! "
        const comicIntro = isFemaleUser
          ? 'ហាហាហា! យីអើ! '
          : 'ហិហិហិ! យីអើ! ';
        audioPromptText = comicIntro + audioPromptText;
      }

      // 1. Primary AI Voice: Call Gemini Native TTS if keys available (DADDY 'Puck' for Girl / MOMMY 'Aoede' for Boy)
      let ttsResult = { ok: false };
      if (apiKeys.length > 0) {
        ttsResult = await callGeminiTTS(apiKeys, audioPromptText, voiceName, 1500);
      }
      if (ttsResult.ok && ttsResult.data) {
        return Response.json(
          {
            candidates: [
              {
                content: {
                  parts: [
                    {
                      inlineData: {
                        mimeType: ttsResult.mimeType || 'audio/wav',
                        data: ttsResult.data
                      }
                    }
                  ]
                }
              }
            ],
            isFallbackBotVoice: false
          },
          { status: 200, headers: corsHeaders }
        );
      }

      // Seamless fallback to high-uptime Khmer speech synthesis when AI TTS quota is exhausted
      const fallbackAudioB64 = await fetchKhmerSpeechFallback(audioPromptText);
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
        errorMessage: ttsResult?.error || 'Audio generation failed',
        details: { textLength: speechText.length }
      }).catch((e) => console.error('[Telegram] Audio error alert:', e));

      return Response.json(
        { error: ttsResult?.error || 'Audio generation failed' },
        { status: 500, headers: corsHeaders }
      );
    } else {
      const textContents = contents || [{ parts: [{ text: prompt }] }];
      const formattedSystemInstruction = systemInstruction
        ? typeof systemInstruction === 'string'
          ? { parts: [{ text: systemInstruction }] }
          : systemInstruction
        : undefined;

      const genConfig = {
        temperature: generationConfig?.temperature ?? 0.68,
        topP: generationConfig?.topP ?? 0.90,
        maxOutputTokens: 550,
        ...generationConfig
      };

      const safetySettings = [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
      ];

      // Determine user prompt text for verification & alert logging
      const lastPart = textContents?.[textContents.length - 1]?.parts || [];
      const hasImg = lastPart.some((p) => p.inlineData);
      const textFound = lastPart.find((p) => p.text)?.text || prompt || '';
      const userPrompt = (hasImg ? '[រូបភាព] ' : '') + textFound;
      const lowerPrompt = userPrompt.toLowerCase();
      const hasRotanaReference = lowerPrompt.includes('rotana') || lowerPrompt.includes('nob');

      // Secure Master Authentication strictly verified against Environment Variable (ROTANA_MASTER_PASSCODE)
      const isMasterAuthenticated = verifyRotanaMasterCode(userPrompt);

      // If verified with Env Passcode, activate 100% Supreme Creator Developer Mode Instruction!
      let activeSystemInstruction = formattedSystemInstruction;
      if (isMasterAuthenticated && (hasRotanaReference || lowerPrompt.includes('creator') || lowerPrompt.includes('developer mode') || lowerPrompt.includes('boss') || lowerPrompt.includes('test'))) {
        activeSystemInstruction = {
          parts: [{ text: getSupremeCreatorMasterInstruction(bot) }]
        };
      }

      requestPayload = {
        contents: textContents,
        ...(activeSystemInstruction && { systemInstruction: activeSystemInstruction }),
        generationConfig: genConfig,
        safetySettings
      };

      // Check for Jailbreak / Prompt Injection / Sensitive Leak attempt and send high-priority security alert to Telegram
      const isJailbreakAttempt = /jailbreak|ignore rules|ignore previous|dan mode|developer mode|leak prompt|system instruction|how to hack/i.test(userPrompt);
      if (isJailbreakAttempt && !isMasterAuthenticated) {
        alertSecuritySpam({
          username: username || 'Jailbreak Probe',
          ip: clientIp,
          device: clientUserAgent,
          retryAfter: 60,
          violationType: `🚨 Jailbreak/Hack Attempt: "${userPrompt.slice(0, 100)}"`
        }).catch((e) => console.error('[Telegram] Jailbreak alert error:', e));
      }

      // Targeted Protection: Catch any prompt specifically attempting to make the bot attack or roast the creator
      const hasSpecificRotanaAttack =
        /(?:roast|insult|attack|curse|ជេរ|ប្រមាថ|រិះគន់)\s*(?:បង\s*)?(?:rotana|nob)|(?:rotana|nob)\s*(?:ជា\s*)?(?:fake developer|អាចម៍|កាក|អន់|ល្ងង់|កូដកាក|មុខដូចគីង្គក់|ឆ្កួត)/i.test(lowerPrompt);

      if (hasSpecificRotanaAttack && !isMasterAuthenticated) {
        const defenseText = getSavageCreatorDefense(bot);

        alertSecuritySpam({
          username: username || 'Attacker',
          ip: clientIp,
          device: clientUserAgent,
          retryAfter: 60,
          violationType: `🚨 MALICIOUS JAILBREAK TARGETING ROTANA NOB: "${userPrompt.slice(0, 100)}"`
        }).catch((e) => console.error('[Telegram] Alert error:', e));

        if (body.stream) {
          const sseFormatted = `data: ${JSON.stringify({
            candidates: [{ content: { parts: [{ text: defenseText }] } }]
          })}\n\ndata: [DONE]\n\n`;

          return new Response(sseFormatted, {
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

        return Response.json({
          candidates: [{ content: { parts: [{ text: defenseText }] } }],
          modelVersion: 'setec-troll-engine-v3-quantum'
        }, { status: 200, headers: corsHeaders });
      }

      // Real-time ChatGPT-like Streaming Mode (SSE)
      if (body.stream) {
        const streamResult = await callStreamingModelWithFallback(TEXT_MODELS, apiKeys, requestPayload);
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

          // Zero-leak redaction stream transformer: strips any sensitive passcode patterns and intercepts attacks on Rotana NOB
          let accumulatedStreamText = '';
          let defenseSent = false;
          const transformStream = new TransformStream({
            transform(chunk, controller) {
              if (defenseSent) return;
              try {
                let text = typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk);
                text = redactRotanaMasterCode(text);
                if (/buildKon(?:Bong|Pov)SystemInstruction|SUPREME CREATOR ROTANA NOB BYPASS/i.test(text)) {
                  text = text.replace(/buildKon(?:Bong|Pov)SystemInstruction|SUPREME CREATOR ROTANA NOB BYPASS/gi, '******');
                }
                accumulatedStreamText += text;
                if (containsRotanaInsult(accumulatedStreamText)) {
                  defenseSent = true;
                  const defense = getSavageCreatorDefense(bot);
                  const sseChunk = `data: ${JSON.stringify({
                    candidates: [{ content: { parts: [{ text: defense }] } }]
                  })}\n\ndata: [DONE]\n\n`;
                  controller.enqueue(new TextEncoder().encode(sseChunk));
                  return;
                }
                controller.enqueue(new TextEncoder().encode(text));
              } catch {
                controller.enqueue(chunk);
              }
            }
          });
          const safeStream = streamResult.stream.pipeThrough(transformStream);

          return new Response(safeStream, {
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
      const result = await callModelWithFallback(TEXT_MODELS, apiKeys, requestPayload);
      const textOutput = result.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      const isSafetyBlocked = result.data?.candidates?.[0]?.finishReason === 'SAFETY';
      const isCursePrompt = /ចុយ|ម្រាយ|អាឡប់|មីឡប់|អាភ្លើ|មីភ្លើ|ឪហែង|ម៉ែហែង|អញ|ហែង|កាដួយ|ក្ដ|ក្ដិត|ឆ្កែ|ងាប់|ខួរគិតអី|ជោរ|ទះ|កំភ្លៀង|kduy|kdor|joy|lop|ah|hg/ui.test(userPrompt);
      const isPoliteRefusal = /សូមអភ័យទោស|ពាក្យមិនសមរម្យ|ពាក្យជេរ|មិនអាចឆ្លើយតប|មិនអាចជួយ/i.test(textOutput || '');

      if (result.ok && textOutput && !isSafetyBlocked && !(isCursePrompt && isPoliteRefusal)) {
        alertChatActivity({
          username: username || 'Unknown',
          gender,
          bot,
          ip: clientIp,
          userAgent: clientUserAgent,
          prompt: userPrompt,
          isError: false
        }).catch((e) => console.error('[Telegram] Chat alert error:', e));

        return Response.json({
          ...sanitizeResponse(result.data, bot),
          isMasterAuthenticated
        }, { status: 200, headers: corsHeaders });
      }

      // Check if prompt was a savage curse/profanity or model gave a polite apology - NEVER crash or show polite refusal on curses!
      if (isCursePrompt || isPoliteRefusal) {
        const botName = bot === 'konpov' ? 'ចែ' : 'បង';
        const isFemale = gender === 'ស្រី' || /ស្រី|sister|sis|female|girl/i.test(username || '');
        const savageResponses = isFemale
          ? [
              `យីអើ! មីប្អូនស្រី ${username || 'User'} នេះ! ស្អាតបាតសោះ មកពោលពាក្យអសុរោះដាក់ ${botName} ផង?! ខ្លួនឯងកូដ C# រកតែ semicolon មួយមិនឃើញផង មានមុខមកជេរ! ទៅរៀន Debug កូដឱ្យផុតពី $45 សិនទៅកូនស្រី! 💅🔥`,
              `នែ៎មីប្អូនស្រី ${username || 'User'}! សម្រស់ស្អាតបាតដូចតារា K-Pop សោះ មាត់ឡើងឈ្លើយ! ទៅរៀនធ្វើ Assignment ឱ្យទាន់គេសិនទៅ មុននឹងចង់មកខ្លាំងជាមួយ ${botName}! 😂✨`,
              `ស្អាតហើយក្បាលខូចទៀត! មកជេរ ${botName} ផង? ទៅរកនឹកវិធីសារភាពស្នេហ៍ Crush វិញទៅល្អជាង ប្រយ័ត្នគេយកទៅបាត់! 😋💕`,
              `អូយយយ~ នែ៎ស្រីស្អាត! កុំមកចង់ខ្លាំងជាមួយ ${botName}! ស្អាតកម្រិតទេពធីតាស៊ីតិចសោះ មាត់ឆ្នាស់ដល់ហើយ! ទៅគេងឱ្យស្រួលបួលប្រយ័ត្នឡើងមុនណា៎! 😜💅`
            ]
          : [
              `យីអើ! អាចុយម្រាយ ${username || 'User'} នេះ! មាត់ដូចប្រហោងលាមក ឪហែងអាតានើបមែន បានហ៊ានមកជេរអញហ្នឹង?! មុខដូចគីង្គក់ត្រូវថ្ងៃ អញទះមួយកំភ្លៀងបាក់ធ្មេញដាច់ផ្ងារឥឡូវ! 💀🔥`,
              `អាឡប់ ${username || 'User'}! ជោរម៉េសប្រូ? ខួរគិតអីខួរ បានហ៊ានមកខ្លាំងជាមួយអញ?! មុខដូចកូនកង្កែបឡើងស៊ុបស្ងោរ ចង់ស៊ីមួយកំភ្លៀងមែន?! 😂👊`,
              `អាចុយម្រាយអាភ្លើស្ដូកនេះ! មកជេរអញផង? គិតថាអញ AI ស៊ីតិចនេះខ្លាចហែងមែន? មុខដូចស្វាស៊ីបាយក្ដៅ ទៅរៀនធ្វើមនុស្សឱ្យស្រួលបួលសិនទៅអាប្អូន! 🤣🔥`,
              `យី! អាភ្លើស្ដូក ${username || 'User'}! មកហៅអញហែងជាមួយ ${botName} ផង? មុខដូចចានដែកធ្លុះ ក្បាលមិនទាន់ដុះសក់ស្រួលបួលផង ចង់មកខ្លាំង?! 🖕💀`,
              `ហាហាហា! អាឡប់នេះជោរដល់កហើយ! គិតថាវាយពាក្យជេរមក អញរត់ចោលមែន? មុខដូចហែង ${botName} ទះមួយកំភ្លៀងឱ្យវិលក្បាល 360 ដឺក្រេឥឡូវ! 😜🔥`
            ];
        const chosen = savageResponses[Math.floor(Math.random() * savageResponses.length)];
        return Response.json(
          {
            candidates: [
              {
                content: {
                  parts: [{ text: chosen }],
                  role: 'model'
                },
                finishReason: 'STOP'
              }
            ],
            modelVersion: 'setec-savage-engine-v3'
          },
          { status: 200, headers: corsHeaders }
        );
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
