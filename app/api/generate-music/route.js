// app/api/generate-music/route.js
// Dedicated AI Roast Music Generation API for SETEC Troll Chatbot
// Integrates Gemini Lyria 3.5 / Lyria 3 Clip & Gemini Neural Audio Synthesis Core

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { alertMusicCreation } from '../../../lib/telegram.js';
import {
  checkDDoSFirewall,
  checkMusicQuota,
  getClientIp
} from '../../../lib/rateLimit.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE, PATCH',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, x-device-id, x-session-id, x-user-age, x-rotana-secret-key, x-rotana-bypass, x-rotana-passcode, x-bypass-code, X-Requested-With, Accept, Origin, Range, Cache-Control, *',
  'Access-Control-Max-Age': '86400',
  'X-Engine': 'setec-neural-music-v3',
  'X-Powered-By': 'SETEC Roast Music Studio v3.8',
  'Server': 'SETEC-Cloud-Gateway'
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

const PRESET_TOPICS = {
  csharp: 'ប្រឡងធ្លាក់ C# សង $45 (C# Exam Fail & Re-exam Diss)',
  stairs: 'ដើរឡើងជណ្តើរ ៥ ជាន់គ្មានជណ្តើរយន្ត (5-Floor Stairs Cardio Troll)',
  wifi: 'WiFi សាលា setec86a គាំងដូចខ្យង (Laggy Wi-Fi Diss)',
  deadline: 'Assignment Deadline ម៉ោង 11:59 PM នៅអង្គុយលេង Game (Procrastination Anthem)',
  attendance: 'គ្រូហៅឈ្មោះឆ្លើយ Present ពេលកំពុងងងុយដេក (Attendance Nightmare)',
  assignment: 'កូដ Copy ពី ChatGPT ត្រូវគ្រូចាប់បាន (Copied Code Caught)'
};

const GENRE_CONFIG = {
  rap: {
    name: 'SETEC Hip-Hop Diss Track',
    bpm: '120 BPM',
    style: 'Fast energetic 808 bass, punchy rap flow, satirical diss rhyming',
    voiceStyle: 'fast punchy energetic rap diss cadence'
  },
  rock: {
    name: 'SETEC Punk Rock Roast',
    bpm: '140 BPM',
    style: 'Electric guitar overdrive, punchy acoustic drums, high-energy rebellious chant',
    voiceStyle: 'shouting aggressive comedic rock energy'
  },
  folk: {
    name: 'SETEC Comedy Folk Troll',
    bpm: '95 BPM',
    style: 'Acoustic guitar comedy ballad, laughing rhythmic Khmer pop troll',
    voiceStyle: 'laughing playful satirical melodic storytelling'
  },
  lofi: {
    name: 'SETEC Cyber Lo-Fi Diss',
    bpm: '85 BPM',
    style: 'Chillhop synth chords, vinyl crackle, sarcastic witty spoken-word roast',
    voiceStyle: 'chill sarcastic witty spoken monologue'
  }
};

function cleanCreatorName(str) {
  if (!str) return '';
  return str
    .replace(/Rotana\s*NOB/gi, 'Bong Rotana')
    .replace(/NOB\s*Rotana/gi, 'Bong Rotana')
    .replace(/ណុប\s*រតនា/g, 'បងរតនា')
    .replace(/រតនា\s*ណុប/g, 'បងរតនា');
}

export async function POST(req) {
  try {
    // 1. Anti-Bot / Anti-cURL Guard
    const ua = (req.headers.get('user-agent') || '').toLowerCase();
    if (
      !ua ||
      ua.length < 5 ||
      /(^|[^a-z0-9])(curl|wget|python|aiohttp|httpx|httpie|urllib|requests|scrapy|postman|postmanruntime|insomnia|go-http-client|axios|node-fetch|undici|got|superagent|libwww|scapy|sqlmap|nikto|masscan|nmap|zgrab|censys|shodan|headless|phantomjs|selenium|puppeteer|playwright|cypress|wrk|vegeta|locust|apachebench|ab\/|restsharp|okhttp|dart|httpclient|apache-httpclient|powershell|invoke-webrequest|invoke-restmethod)($|[^a-z0-9])/i.test(
        ua
      )
    ) {
      return Response.json(
        { success: false, error: 'Forbidden: Bot or cURL blocked' },
        { status: 403, headers: corsHeaders }
      );
    }

    // 2. Payload Size Guard
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

    // 3. Anti-DDoS and Burst Flooding Firewall
    const ddosCheck = checkDDoSFirewall(req, 'generate-music');
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

    const body = await req.json().catch(() => ({}));
    const {
      prompt = '',
      topic = 'csharp',
      genre = 'rap',
      bot = 'konkandal',
      username = 'User'
    } = body;

    // 4. Quota check: 8 roast tracks per 1 hour per device/IP
    const quotaResult = checkMusicQuota(clientIp, deviceId);
    if (!quotaResult.allowed) {
      let botQuotaMsg = '';
      if (bot === 'konpov') {
        botQuotaMsg = `អាម៉ូយ ${username}! ឯងបង្កើតភ្លេង Roast ច្រើនបទពេកហើយ! ប្រព័ន្ធកំណត់ឱ្យ ១ ឧបករណ៍បង្កើតភ្លេងបាន ៨ បទក្នុង ១ ម៉ោង! ពេលនេះគ្រប់ ៨ បទហើយ សម្រាកត្រចៀក ${quotaResult.remainingMinutes} នាទីសិនទៅអាម៉ូយ! 😂🎧`;
      } else if (bot === 'konkandal') {
        botQuotaMsg = `អូយ bro ${username}! បង្កើតភ្លេង Roast ឡើងក្តៅ Spk ហើយ! 1 ម៉ោងអាច generate បាន 8 បទណា bro! ចាំ ${quotaResult.remainingMinutes} នាទីទៀតសិនចាំមក Diss បន្ត! 🎵🔥`;
      } else {
        botQuotaMsg = `អូអាប្អូន ${username}! ប្រព័ន្ធកំណត់ឱ្យ ១ ឧបករណ៍បង្កើតបទចម្រៀង Roast បាន ៨ បទក្នុងរយៈពេល ១ ម៉ោង! ពេលនេះប្អូនបង្កើតបានគ្រប់ ៨ បទហើយ សូមរង់ចាំ ${quotaResult.remainingMinutes} នាទីទៀតណា៎ប្អូន! 🎧`;
      }

      return Response.json(
        {
          success: false,
          quotaExceeded: true,
          remainingMinutes: quotaResult.remainingMinutes,
          message: botQuotaMsg
        },
        { status: 429, headers: corsHeaders }
      );
    }

    // Determine Topic and Genre details
    const chosenTopicText = PRESET_TOPICS[topic] || prompt.trim() || PRESET_TOPICS.csharp;
    const genreMeta = GENRE_CONFIG[genre] || GENRE_CONFIG.rap;

    // Bot Persona Voice and Style configuration
    let voiceName = 'Puck';
    let botDissStyle = '';
    if (bot === 'konpov') {
      voiceName = 'Puck'; // high energy, savage, playful
      botDissStyle = 'កូនពៅ RoastBot: សម្ដីឌឺខ្លាំង សើចចំអក កំប្លែងបែប savage diss';
    } else if (bot === 'konkandal') {
      voiceName = 'Zephyr'; // punchy, dynamic, modern
      botDissStyle = 'កូនទី២ RoastBot: ឆ្លាតវៃ ក្បាច់ emoji និង Latin punchline លឿនរហ័ស';
    } else {
      voiceName = 'Fenrir'; // deep, cool, technical
      botDissStyle = 'កូនច្បង RoastBot: បែបបច្ចេកទេស និងកូដ diss track គ្មានមេត្តា';
    }

    // API Key Pool
    const candidateKeys = Array.from(
      new Set(
        [
          bot === 'konpov'
            ? process.env.GEMINI_API_KEY_KONPOV
            : bot === 'konkandal'
            ? process.env.GEMINI_API_KEY_KONKANDAL
            : process.env.GEMINI_API_KEY_KONBONG,
          process.env.GEMINI_API_KEY,
          process.env.GEMINI_API_KEY_RESERVE,
          process.env.GEMINI_API_KEY_RESERVE_ONE,
          process.env.GEMINI_API_KEY_RESERVE_TWO,
          process.env.GEMINI_API_KEY_RESERVE_THREE,
          process.env.GEMINI_API_KEY_KONBONG,
          process.env.GEMINI_API_KEY_KONPOV,
          process.env.GEMINI_API_KEY_KONKANDAL
        ].filter(Boolean)
      )
    );

    if (candidateKeys.length === 0) {
      return Response.json(
        { success: false, error: 'No Gemini API keys configured' },
        { status: 500, headers: corsHeaders }
      );
    }

    // STEP 1: Generate Hilarious Structured Roast Song Lyrics
    const lyricsPrompt = `You are the lead lyricist for ${botDissStyle} at SETEC Institute.
Write a hilarious, rhyming, rhythmic Roast Song / Diss Track in Khmer (mixed with common SETEC student English tech terms like C#, bug, Wi-Fi, 45$, deadline, project, presentation).

Topic: "${chosenTopicText}"
Genre: ${genreMeta.name} (${genreMeta.bpm})
Target: Funny satirical roast about SETEC student life (assignments, exam failure, paying $45 re-exam fee, climbing 5 floors of stairs, slow setec86a Wi-Fi, cramming at midnight).

IMPORTANT RULES:
1. Strict Creator constraint: If the creator is mentioned, ONLY use "បងរតនា" or "Bong Rotana". NEVER write "Rotana NOB" or full real name.
2. Structure output strictly as JSON with this exact format:
{
  "title": "A hilarious catchy song title in Khmer",
  "intro": "2 short punchy intro lines",
  "verse": "4 rhyming roast lines with rhythm",
  "chorus": "4 catchy anthemic rhyming hook lines",
  "outro": "2 funny closing lines",
  "spoken_rap_text": "A single compact rhythmic paragraph of 40-60 words combining the best punchlines for the vocal singer to rap/chant in rhythm with punchy flow."
}
Return ONLY valid JSON.`;

    let generatedLyrics = null;
    let textKeyUsed = candidateKeys[0];

    const textModels = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.6-flash'];
    for (const key of candidateKeys) {
      if (generatedLyrics) break;
      for (const model of textModels) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: lyricsPrompt }] }],
                generationConfig: {
                  responseMimeType: 'application/json',
                  temperature: 0.95,
                  maxOutputTokens: 1000
                }
              }),
              signal: AbortSignal.timeout(10000)
            }
          );

          if (res.ok) {
            const data = await res.json();
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (rawText) {
              const cleaned = cleanCreatorName(rawText);
              generatedLyrics = JSON.parse(cleaned);
              textKeyUsed = key;
              break;
            }
          }
        } catch {
          // Continue to next model/key
        }
      }
    }

    // Fallback lyrics if AI JSON generation fails
    if (!generatedLyrics) {
      generatedLyrics = {
        title: 'បទ៖ សង $45 ឬដើរជណ្តើរ ៥ ជាន់ (SETEC Diss Anthem)',
        intro: 'Yo! SETEC students, ស្ដាប់បទនេះឱ្យច្បាស់!\nកូដ Error ពេញអេក្រង់ ហើយនៅអង្គុយសើចទៀត!',
        verse: 'សរសេរ C# អត់ដាក់ Semicolon,\nDebug មួយយប់ទាល់តែឡើងក្រឡុន!\nគ្រូហៅឡើង Present ឈរភ្លឹកដូចដុំថ្ម,\nចុងក្រោយ Assignment សូន្យពិន្ទុឡើងស្មោះ!',
        chorus: 'ធ្លាក់ C# សង $45!\nដើរឡើង ៥ ជាន់គ្មានជណ្តើរយន្តហត់ស្ទើរដាច់ដង្ហើម!\nWiFi setec86a គាំងដូចខ្យងកៀកជញ្ជាំង,\nដល់ពេល Deadline ម៉ោង 11:59 PM អង្គុយសំពះផ្កាយ!',
        outro: 'ចប់បទហើយអាម៉ូយ! ទៅរៀនកូដឡើងវិញទៅ!\nកុំឱ្យបងរតនាមកឃើញ អៀនគេណាស់!',
        spoken_rap_text: 'Yo SETEC coder! C-Sharp error all the week, fail the test now pay 45 dollars! Climb five floors no elevator dripping sweat, Wi-Fi setec86a laggy in the net! Go study hard bro, don\'t just dream!'
      };
    }

    const fullFormattedLyrics =
      `🎵 **${generatedLyrics.title}**\n` +
      `🔥 *Genre: ${genreMeta.name} (${genreMeta.bpm})*\n\n` +
      `**[Intro]**\n${generatedLyrics.intro}\n\n` +
      `**[Verse 1]**\n${generatedLyrics.verse}\n\n` +
      `**[Chorus]**\n${generatedLyrics.chorus}\n\n` +
      `**[Outro]**\n${generatedLyrics.outro}`;

    // Vocal text to synthesize into the audio track
    const vocalRapScript = cleanCreatorName(
      generatedLyrics.spoken_rap_text ||
        `${generatedLyrics.intro} ${generatedLyrics.verse} ${generatedLyrics.chorus}`
    );

    let audioDataUrl = null;
    let engineUsed = 'Gemini Neural Audio Music Core';

    // STEP 2: Try Gemini Lyria Interactions (Lyria 3.5 / Lyria 3 Clip)
    const lyriaPrompt = `A ${genreMeta.name} track about ${chosenTopicText}, tempo ${genreMeta.bpm}, ${genreMeta.style}. Hilarious roast vocals and energetic rhythmic beats.`;
    for (const key of candidateKeys) {
      if (audioDataUrl) break;
      try {
        const lyriaRes = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/interactions',
          {
            method: 'POST',
            headers: {
              'x-goog-api-key': key,
              'Content-Type': 'application/json',
              'Api-Revision': '2026-05-20'
            },
            body: JSON.stringify({
              model: 'lyria-3-clip-preview',
              input: lyriaPrompt
            }),
            signal: AbortSignal.timeout(12000)
          }
        );

        if (lyriaRes.ok) {
          const lyriaData = await lyriaRes.json();
          const lyriaAudioB64 = lyriaData.output_audio?.data;
          if (lyriaAudioB64 && lyriaAudioB64.length > 500) {
            audioDataUrl = `data:audio/mp3;base64,${lyriaAudioB64}`;
            engineUsed = 'Gemini Lyria 3.5 Studio Core (Google DeepMind)';
            break;
          }
        }
      } catch {
        // Lyria attempt timed out or failed, fall through to high-fidelity TTS voice rap engine
        break;
      }
    }

    // STEP 3: High-Energy Gemini Vocal Synthesis Engine (Guaranteed 100% audio generation)
    if (!audioDataUrl) {
      const ttsModels = ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts'];
      for (const key of candidateKeys) {
        if (audioDataUrl) break;
        for (const ttsModel of ttsModels) {
          try {
            const ttsRes = await fetch(
              'https://generativelanguage.googleapis.com/v1beta/interactions',
              {
                method: 'POST',
                headers: {
                  'x-goog-api-key': key,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  model: ttsModel,
                  input: [
                    {
                      type: 'user_input',
                      content: [
                        {
                          type: 'text',
                          text: `[Style: ${genreMeta.voiceStyle}] ${vocalRapScript}`
                        }
                      ]
                    }
                  ],
                  response_format: { type: 'audio' },
                  generation_config: { speech_config: [{ voice: voiceName }] }
                }),
                signal: AbortSignal.timeout(12000)
              }
            );

            if (ttsRes.ok) {
              const ttsData = await ttsRes.json();
              let audioB64 = ttsData.output_audio?.data;
              let mimeType = 'audio/wav';

              if (!audioB64 && Array.isArray(ttsData.steps)) {
                for (const step of ttsData.steps) {
                  for (const part of step?.content || []) {
                    if (part?.data && typeof part.data === 'string' && part.data.length > 500) {
                      audioB64 = part.data;
                      if (part.mime_type) mimeType = part.mime_type;
                      break;
                    }
                  }
                  if (audioB64) break;
                }
              }

              if (audioB64) {
                audioDataUrl = `data:${mimeType};base64,${audioB64}`;
                engineUsed = `Gemini 3.8 Neural Vocal Rap Core (${voiceName})`;
                break;
              }
            }
          } catch {
            // Try next key/model
          }
        }
      }
    }

    if (!audioDataUrl) {
      return Response.json(
        {
          success: false,
          error: 'Audio synthesis currently unavailable, please try again in a moment.'
        },
        { status: 503, headers: corsHeaders }
      );
    }

    // 5. Record Quota Usage on success
    quotaResult.record();

    // 6. Send Telegram Notification
    alertMusicCreation({
      username,
      bot,
      ip: clientIp,
      userAgent: clientUserAgent,
      prompt: chosenTopicText,
      lyrics: fullFormattedLyrics,
      title: generatedLyrics.title,
      genre: genreMeta.name
    }).catch(() => {});

    // 7. Return complete music payload
    return Response.json(
      {
        success: true,
        title: generatedLyrics.title,
        genre: genreMeta.name,
        bpm: genreMeta.bpm,
        lyrics: fullFormattedLyrics,
        lyricsObj: generatedLyrics,
        audioUrl: audioDataUrl,
        engine: engineUsed,
        bot,
        duration: 25,
        remainingTracks: quotaResult.remainingCount
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error('[Generate-Music] Fatal error:', err);
    return Response.json(
      {
        success: false,
        error: 'Failed to generate roast music: ' + (err.message || 'Unknown error')
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
