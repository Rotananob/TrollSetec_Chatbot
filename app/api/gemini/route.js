import { NextResponse } from 'next/server';

// In-memory sliding window rate limiter
// 5 messages per 1 minute per device/IP
const rateLimitMap = new Map();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 5;

// Clean up old rate limit entries every 5 minutes to avoid memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, history] of rateLimitMap.entries()) {
    const valid = history.filter(time => now - time < WINDOW_MS);
    if (valid.length === 0) {
      rateLimitMap.delete(key);
    } else {
      rateLimitMap.set(key, valid);
    }
  }
}, 5 * 60 * 1000);

function checkRateLimit(key) {
  const now = Date.now();
  const history = (rateLimitMap.get(key) || []).filter(time => now - time < WINDOW_MS);
  if (history.length >= MAX_REQUESTS) {
    const oldestTime = history[0];
    const retryAfter = Math.max(1, Math.ceil((oldestTime + WINDOW_MS - now) / 1000));
    return { allowed: false, retryAfter };
  }
  history.push(now);
  rateLimitMap.set(key, history);
  return { allowed: true };
}

export async function POST(req) {
  try {
    // 1. Anti-Spam / Anti-DDoS Rate Limiting
    const forwardedFor = req.headers.get('x-forwarded-for') || '';
    const ip = forwardedFor.split(',')[0].trim() || 'unknown-ip';
    const deviceId = req.headers.get('x-device-id') || req.headers.get('user-agent') || 'default-device';
    const rateLimitKey = `${ip}_${deviceId}`;

    const rateResult = checkRateLimit(rateLimitKey);
    if (!rateResult.allowed) {
      return NextResponse.json(
        {
          error: 'Too Many Requests',
          message: `⚠️ ប្រព័ន្ធសុវត្ថិភាព Anti-Spam / Anti-DDoS:\nឧបករណ៍របស់អ្នកបានផ្ញើសារលើសពី ៥ ដងក្នុង ១ នាទី! សូមរង់ចាំ ${rateResult.retryAfter} វិនាទីទៀតមុនពេលសាកល្បងម្ដងទៀត ដើម្បីការពារ Server ពីការ Spam។`
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateResult.retryAfter)
          }
        }
      );
    }

    // 2. Secret Gemini API Key strictly read from process.env (never exposed to client)
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured in server environment (.env.local)' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { prompt, systemInstruction, audio, contents, generationConfig } = body;

    // Gemini API Endpoints
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
    const GEMINI_API_AUDIO_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const targetUrl = audio ? GEMINI_API_AUDIO_URL : GEMINI_API_URL;

    // Format request body compatible with both KonBong and KonPov
    let requestPayload;

    if (audio) {
      const audioContents = contents || [{ parts: [{ text: prompt }] }];
      const audioGenConfig = generationConfig || {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } }
      };
      requestPayload = {
        contents: audioContents,
        generationConfig: audioGenConfig
      };
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
    }

    const geminiRes = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestPayload)
    });

    const data = await geminiRes.json();
    return NextResponse.json(data, { status: geminiRes.status });
  } catch (error) {
    console.error('Gemini API proxy error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
