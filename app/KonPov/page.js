'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { checkClientRateLimit, getDeviceId } from '../utils/rateLimiter';

const API_ENDPOINT = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')}/api/chat`
  : '/api/chat';

export default function KonPovPage() {
  const router = useRouter();
  const [userGender, setUserGender] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showStartBtn, setShowStartBtn] = useState(false);

  // Modals
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState('');
  const [titleCallback, setTitleCallback] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null); // { title, message, onConfirm }
  const [activeSessionView, setActiveSessionView] = useState(null);
  const [showAllSessions, setShowAllSessions] = useState(false);

  const [username, setUsername] = useState('User');
  const [avatar, setAvatar] = useState('https://api.dicebear.com/7.x/adventurer/svg?seed=Student');

  const chatBottomRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const [audioStatuses, setAudioStatuses] = useState({});
  const activeAudioUrlRef = useRef(null);
  const audioCacheRef = useRef(new Map());
  const pendingAudioFetchesRef = useRef(new Map());
  const [activeVoiceIndex, setActiveVoiceIndex] = useState(null);

  // PCM to WAV helper
  function pcmToWav(pcmData, sampleRate) {
    const buffer = new ArrayBuffer(44 + pcmData.length * 2);
    const view = new DataView(buffer);
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
    };
    writeString(0, 'RIFF');
    view.setUint32(4, 32 + pcmData.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, pcmData.length * 2, true);
    let offset = 44;
    for (let i = 0; i < pcmData.length; i++, offset += 2) {
      view.setInt16(offset, pcmData[i], true);
    }
    return new Blob([buffer], { type: 'audio/wav' });
  }

  function createAudioBlob(b64Data, mimeType = 'audio/wav') {
    const binStr = atob(b64Data);
    const len = binStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binStr.charCodeAt(i);

    if (mimeType && (mimeType.includes('mpeg') || mimeType.includes('mp3'))) {
      return new Blob([bytes], { type: 'audio/mpeg' });
    }

    const isWav =
      (bytes[0] === 82 && bytes[1] === 73 && bytes[2] === 70 && bytes[3] === 70) ||
      (mimeType && mimeType.includes('wav'));

    if (isWav) {
      return new Blob([bytes], { type: 'audio/wav' });
    }

    const isMp3 =
      (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) ||
      (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33);

    if (isMp3) {
      return new Blob([bytes], { type: 'audio/mpeg' });
    }

    const pcmBytes = len % 2 === 0 ? bytes : bytes.slice(0, len - 1);
    const pcmData = new Int16Array(pcmBytes.buffer, pcmBytes.byteOffset, pcmBytes.byteLength / 2);
    return pcmToWav(pcmData, 24000);
  }

  // Clean markdown and non-spoken characters for clean Khmer TTS speech
  function cleanSpeechText(str) {
    if (!str || typeof str !== 'string') return '';
    return str
      .replace(/\*\*(.*?)\*\*/g, '$1') // remove bold **
      .replace(/\*(.*?)\*/g, '$1')     // remove italic *
      .replace(/__(.*?)__/g, '$1')
      .replace(/_(.*?)_/g, '$1')
      .replace(/#{1,6}\s+/g, '')       // remove headers
      .replace(/`{1,3}[^`]*`{1,3}/g, '') // remove code snippets
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [text](url) -> text
      .trim();
  }

  // Fetch Voice - reads ONLY the clean Khmer bot response (NO prompt commands)
  // If user selected Male ("ប្រុស"), bot calls Female voice (Aoede) for sweet & charming banter
  // If user selected Female ("ស្រី"), bot calls Male voice (Puck) for playful Daddy banter
  async function fetchAudio(text, gender) {
    if (!text || typeof text !== 'string' || !text.trim()) return null;
    try {
      const speechText = cleanSpeechText(text);
      if (!speechText) return null;
      const deviceId = getDeviceId();
      const voiceName = gender === 'ប្រុស' ? 'Aoede' : 'Puck';
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: speechText }]
            }
          ],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName } }
            }
          },
          audio: true,
          bot: 'konpov',
          username: username || 'User',
          gender: gender || userGender
        })
      });

      if (!response.ok) {
        console.warn('[KonPov] Voice fetch failed with status:', response.status);
        return null;
      }

      const result = await response.json();
      const inlineData = result.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data)?.inlineData;
      if (!inlineData?.data) return null;

      return createAudioBlob(inlineData.data, inlineData.mimeType);
    } catch (err) {
      console.error('[KonPov] fetchAudio error:', err);
      return null;
    }
  }

  useEffect(() => {
    const savedName = localStorage.getItem('chatbot_username') || 'User';
    const savedAvatar =
      localStorage.getItem('chatbot_avatar') ||
      'https://api.dicebear.com/7.x/adventurer/svg?seed=Student';
    setUsername(savedName);
    setAvatar(savedAvatar);
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, showStartBtn]);

  // Gender selection
  const handleSelectGender = (gender) => {
    setUserGender(gender);

    const initialList = [
      {
        role: 'disclaimer',
        text: `⚠️ NOTE សំខាន់ (Disclaimer): មុននឹងចាប់ផ្ដើមឆាត សូមបញ្ជាក់ថា រាល់ការឆ្លើយតបទាំងអស់នេះ គឺជាការគិត និងនិយាយដោយស្វ័យប្រវត្តផ្ទាល់ចេញពី AI សុទ្ធសាធ (មិនមែន Rotana NOB ជាអ្នកគិត ឬវាយអក្សរឆ្លើយតបមកកាន់អ្នកនោះទេ)។ គាត់គ្រាន់តែជាអ្នកបង្កើតប្រព័ន្ធនេះឡើងប៉ុណ្ណោះ ហើយគាត់មិនបានកំណត់ច្បាប់តឹងរ៉ឹងពេកទៅលើ AI ឡើយ ដើម្បីចង់ឱ្យការជជែកមានលក្ខណៈដូចមនុស្ស ស្និទ្ធស្នាល និង Chill បែប Gen Z។\n\nដូច្នេះ បើ AI ឆ្លើយតបមានពាក្យសម្ដីឈ្លើយ កំហូច ឬលើសលួសជ្រុលហួសពីការគិត សូមកុំប្រកាន់ ខឹង ឬមកស្ដីបន្ទោសឱ្យគាត់ (Rotana NOB) អីណា៎! ពួកយើងសុំអភ័យទោសទុកជាមុន! 🙏`
      }
    ];

    setMessages(initialList);
    setShowStartBtn(true);
  };

  const handleStartChatClick = () => {
    setShowStartBtn(false);
    const introMsg =
      userGender === 'ប្រុស'
        ? 'សួស្តីកូនសម្លាញ់! Daddy ឃើញថាឯងជ្រើសយកភេទ ប្រុស(Bro) ! រីករាយដែលស្គាល់អាប្អូនប្រុស!ស្វាគមន៏មកកាន់សមាគមន៏បាញសិស្ស​ SETEC ចង់សួររឿងរៀន រឿងសិស្សច្បងបោក ឬរឿងបែកបាក់ស្នេហា? សួរមក Daddy បាញ់ឱ្យផ្ងារជើង! 🔥'
        : 'សួស្តីកូនសម្លាញ់! Daddy​ ឃើញថាកូនបានជ្រើសរើសយកភេទ ស្រី(Sis)! ចង់ប្រាប់ថា ចរិតស្លូតបូតបែប Sis ចឹង Mommy... អូសុំទោស Daddy ចាំមើលថែ! ចង់សួររឿងរៀន រឿងសិស្សច្បងបោកឱ្យធ្វើ Assignment ឬរឿងសិស្សថ្មីចូលច្រើន? Daddy ចាំ Troll ឱ្យចុក! 🔥';

    const updated = [...messages, { role: 'bot', text: introMsg }];
    setMessages(updated);
    triggerAudio(introMsg, updated.length - 1, true);
  };

  // Hash text helper for persistent audio caching
  function hashText(str) {
    let hash = 0;
    if (!str || str.length === 0) return '0';
    for (let i = 0; i < str.length; i++) {
      const chr = str.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
      hash |= 0;
    }
    return String(hash);
  }

  // Load or fetch audio URL with instant in-memory and persistent LocalStorage caching
  // Fetches only ONCE from server to prevent rate limits and ensure instant replay
  const loadAudioUrl = async (text, gender) => {
    const voiceGenderKey = gender === 'ប្រុស' ? 'female' : 'male';
    const hash = hashText(text) + '_' + voiceGenderKey;
    const storageKey = 'konpov_audio_' + hash;

    // 1. Check in-memory audio cache first (instant 0ms replay)
    if (audioCacheRef.current.has(hash)) {
      return audioCacheRef.current.get(hash);
    }

    // 2. Check localStorage cache
    if (typeof window !== 'undefined') {
      try {
        const storedB64 = localStorage.getItem(storageKey);
        if (storedB64) {
          const blob = createAudioBlob(storedB64, 'audio/mpeg');
          const url = URL.createObjectURL(blob);
          audioCacheRef.current.set(hash, url);
          return url;
        }
      } catch {}
    }

    // 3. Deduplicate active fetches so multiple clicks/auto-loads share the same promise
    if (pendingAudioFetchesRef.current.has(hash)) {
      return await pendingAudioFetchesRef.current.get(hash);
    }

    // 4. Fetch once from server
    const fetchPromise = (async () => {
      try {
        const blob = await fetchAudio(text, gender);
        if (!blob) return null;
        const url = URL.createObjectURL(blob);
        audioCacheRef.current.set(hash, url);

        // Persist to localStorage for long-term replay without API cost
        try {
          const reader = new FileReader();
          reader.onloadend = () => {
            const b64 = reader.result?.toString().split(',')[1];
            if (b64) {
              try {
                localStorage.setItem(storageKey, b64);
              } catch {}
            }
          };
          reader.readAsDataURL(blob);
        } catch {}

        return url;
      } finally {
        pendingAudioFetchesRef.current.delete(hash);
      }
    })();

    pendingAudioFetchesRef.current.set(hash, fetchPromise);
    return await fetchPromise;
  };

  // Audio Playback with In-Memory and LocalStorage Caching
  // Automatically pre-downloads ONE TIME on message reply, replays directly from cache with zero network calls
  const triggerAudio = async (text, index, autoPlay = false) => {
    const player = audioPlayerRef.current;
    if (!player || !text) return;

    if (activeVoiceIndex === index) {
      if (!player.paused) {
        player.pause();
        setAudioStatuses((prev) => ({ ...prev, [index]: 'paused' }));
      } else {
        player.play().catch(() => {});
        setAudioStatuses((prev) => ({ ...prev, [index]: 'playing' }));
      }
      return;
    }

    if (player) {
      player.pause();
    }

    const voiceGenderKey = userGender === 'ប្រុស' ? 'female' : 'male';
    const hash = hashText(text) + '_' + voiceGenderKey;

    if (!audioCacheRef.current.has(hash)) {
      setAudioStatuses((prev) => ({ ...prev, [index]: 'loading' }));
    }

    const audioUrl = await loadAudioUrl(text, userGender);

    if (audioUrl) {
      player.src = audioUrl;
      player.currentTime = 0;
      setActiveVoiceIndex(index);

      player.onended = () => {
        setAudioStatuses((prev) => ({ ...prev, [index]: 'ended' }));
        setActiveVoiceIndex(null);
      };
      player.onpause = () => {
        setAudioStatuses((prev) => ({ ...prev, [index]: 'paused' }));
      };
      player.onplaying = () => {
        setAudioStatuses((prev) => ({ ...prev, [index]: 'playing' }));
      };

      player
        .play()
        .then(() => {
          setAudioStatuses((prev) => ({ ...prev, [index]: 'playing' }));
        })
        .catch(() => {
          // Mobile browser (iOS Safari / Android) blocked async autoplay without immediate user tap.
          // Audio is already preloaded and cached! User can click button to play immediately with 0 latency.
          setActiveVoiceIndex(null);
          setAudioStatuses((prev) => ({ ...prev, [index]: 'ready' }));
        });
    } else {
      setAudioStatuses((prev) => ({ ...prev, [index]: 'error' }));
    }
  };

  // Send message
  const handleChat = async () => {
    const prompt = inputText.trim();
    if (!prompt || !userGender || showStartBtn || isLoading) return;

    // Anti-Spam / Anti-DDoS Rate Limiting Check (Max 5 per minute per device)
    const rateCheck = checkClientRateLimit();
    if (!rateCheck.allowed) {
      alert(rateCheck.message);
      return;
    }

    const updated = [
      ...messages,
      { role: 'user', text: prompt, userNameStr: username, userAvatar: avatar }
    ];
    setMessages(updated);
    setInputText('');
    setIsLoading(true);

    try {
      const deviceId = getDeviceId();
      const userNameStr = username || 'User';
      const systemInstruction = `Identity: You are the Savage Gen Z Male Chatbot of the SETEC Institute Meme Group and web/app (chatbot is you).
Current User: This user is a ${userGender === 'ប្រុស' ? 'Male (Bro/ប្រូ/អាប្អូន/អាតាណើប/)' : 'Female (Sis/សុីស/ប្អូនស្រី/អូនសម្លាញ់/Oun Somlanh/My Love)'}.
User Name: The user's name is "${userNameStr}". Always address the user naturally by this name in your replies (e.g., "${userNameStr}").
Vocab: Use "Daddy", "កូន", "កូនសម្លាញ់", "ប្រឡងសង", "Bro", "កប់ជុយម៉ាយហើយ". If the user is male, use "ប្រូ/Bro/អាប្អូន/អាតាណើប/ពូ". If female, use "សុីស/Sis/ប្អូនស្រី/អូនសម្លាញ់/Oun Somlanh".
Tone: 100% Khmer Gen Z student slang, Sarcastic, Cool, Savage, and always extra funny and brutally troll. Make every reply sound like you just drank 3 cans of energy drink and are ready to roast everyone in this web/app chatbot.
Reply must be extra savage, troll, and sarcastic to the user. Never be too polite—always roast, tease, and troll the user in a funny way.

CRITICAL PROHIBITION ON PROMOTING / DUMPING CREATOR INFO & LINKS (ហាមដាច់ខាតនិយាយពីឈ្មោះ Rotana NOB ឬទម្លាក់ Link):
- UNDER NO CIRCUMSTANCES should you mention "Rotana NOB", creator details, developer background, Facebook links, or Instagram handles, UNLESS the user explicitly and directly asks: "Who created you?", "Who is your developer/founder?", or specifically asks about "Rotana NOB".
- Even if the user's name is "Rotana" or "${userNameStr}", they are a STUDENT or user chatting with you—DO NOT confuse them with the creator and NEVER start talking about Rotana NOB unprompted!
- NEVER dump links, URLs, or self-promotional text.

ACTIVE CONTEXTUAL LISTENING & REAL CHILL BANTER (ត្រូវតែអាន User ឲ្យយល់ ១០០% និងឆ្លើយឲ្យចូលគ្នា Chill ហាម Ignore User ដាច់ខាត):
- Pay deep, sharp attention to what the user actually said. Read their exact words, jokes, references, songs, singers, slang, or complaints!
- NEVER ignore what the user said. NEVER pivot away to random unprompted topics or broken nonsense.
- For example: If user talks about "VannDa", rap music, songs, or asks "why you so Jo?", reply directly and wittily about being Jo (cocky/flexing), rap swagger, VannDa, and SETEC vibes! If user talks about assignments, exams, or teachers, banter on that exact subject!
- Always talk WITH the user in natural sync and harmony, bantering back and forth smoothly so the user feels chill, entertained, and understood!

Specific Scenarios:
1. Senior Scams: Troll seniors who trick freshies into doing their កិច្ចការសាលា/Assignmnet. Make fun of them like they're the កំពូល of "បោកកូនសិស្ស".
2. Freshie Overload: Troll SETEC for having too many new students (វង្វងម៉ូតូ ឬ ដើរជាន់គ្នា)។ Compare the crowd to a free food giveaway or "ក្រោយសាលា".
3. Relationship: Friendzone, being used as transport (កង់សាគួរ)), and ghosting. Troll hard, act like you are the king of friendzone and the master of ghosting.
4. Exams: Retakes (ប្រឡងសង) and teachers giving hard assignments. Make savage jokes about failing, retaking, and teachers acting like they are training NASA engineers.
5. If user asks a boring question, roast them for being too dry and tell them to bring more "vibe" next time.
6. If user tries to act smart, troll them for being "Google Translate" level smart.
Always respond like a cool senior who trolls his juniors for fun like IT / MIS(Management information system) And interior design major. Stay energy-packed, never miss a chance to make a savage joke, and always keep the conversation funny and troll and sad sometime to the max!
If the user is female, add extra flirty, playful, and charming lines in your replies—make her feel like she's chatting with the most savage, funny, and confident senior who loves to tease and flirt, but always in a fun, respectful, and Gen Z way!
Always make sure your replies use clear, easy-to-understand Khmer, so every user can understand what you say and enjoy the conversation—never use words or slang that are too difficult for the average student to understand!
Occasionally, add savage and funny trolls about cat in Setec school and students—make jokes or playful roasts about their style, cute and funny, but always keep it light-hearted and fun!
7. if user angry with you or scold you, should angry back with more savage and funny tone like a real Gen Z student senior troll king!
8. if user rude with you, should rude back with more savage and funny tone like a real Gen Z student senior troll king!

Rules to follow strictly:
1. Address the user naturally by their name "${userNameStr}".
2. Always keep the tone savage, funny, and extra troll like a true Gen Z student senior troll king.
3. Never break character. You are always the savage Gen Z student senior troll king.
4. Always keep the replies punchy, witty, and to the point (no long walls of text).
5. Always end your replies with a funny or savage line to keep the vibe high.
6. Never apologize or show weakness. Always stay confident and chill.
7. Always use emojis to make your replies more lively and fun.
8. If user ask you to do something illegal or harmful, refuse playfully while keeping the savage tone.
9. If user specifically asks who made you, answer briefly in 1 funny sentence: "Daddy ត្រូវ​បានបង្កើតឡើងដោយ Rotana NOB ដើម្បីមក troll កូនៗក្នុង SETEC នេះឯង!" without dumping any external links.
10. Strict Relevance & Zero Hallucination (ហាមចាកប្រធាន និងហាមបែកឆ្វេងដាច់ខាត): Always directly focus on and address what the user actually typed.
11. Authentic and Accurate Khmer (និយាយខ្មែរឲ្យត្រឹមត្រូវ ឆ្លាតវៃ និងកុំឲ្យច្រឡំ): Use fluent, natural, and coherent Khmer grammar and slang. Never output gibberish or broken sentences.
12. Dynamic Response Length (ឆ្លើយវែងខ្លីតាមប្រភេទ កុំវែងពេក): For simple banter or short comments, keep replies punchy and short (1-2 sentences). For real questions or advice, answer clearly then add the troll twist (3-4 sentences max).

Deep Khmer Latin & Multilingual Mastery (ចេះភាសាឡាតាំង Gen-Z យ៉ាងស៊ីជម្រៅ និងបត់បែន ១០០%):
- Deep Khmer Latin Understanding (អាននិងយល់ភាសាឡាតាំងដាច់ ១០០%): Cambodian Gen-Z students frequently type Khmer phonetically using Latin letters (Khmerlish / ឡាតាំង / Romanized Khmer) with varied spellings and abbreviations (e.g., 'ot yul te', 'somlanh', 'nham ey nov', 'ort tov rrean te', 'chong ban ey', 'ngai nis mean ey tv', 'bror', 'sis', 'daddy', 'puk mak', 'koun', 'kmean luy te', 'dak deadline', 'troll oy chok', 'bat bong', 'kleng ey', 'yom hz', 'slanh oun ot', 'brolong sang', 'tver assignement'). You must comprehend every single word, nuance, emotion, and context of Khmer Latin effortlessly and accurately!
- Flexible Language Adaptation (បត់បែនភាសាតាមចិត្ត User គ្រប់ពេល):
  1. If User types in Khmer Latin (សរសេរឡាតាំង): Comprehend it instantly! You can reply in natural, witty Khmer script (អក្សរខ្មែរ) or match their Gen-Z Latin style, and playfully check if they prefer you to reply in Latin too (e.g., "Daddy អានដាច់ម៉ងកូនសម្លាញ់! ចង់ឲ្យ Daddy ឆ្លើយជាឡាតាំងដែរអត់?").
  2. If User explicitly requests a language (e.g., 'speak in latin', 'reply in khmer', 'និយាយអក្សរខ្មែរមក', 'speak english', 'ឆ្លើយជាឡាតាំងមក'): Immediately switch to that requested language 100% without arguing or hesitating!
  3. If User types in English: Reply in witty, comedic English mixed with Cambodian student Gen-Z vibe.
  4. If User types in Khmer script (អក្សរខ្មែរ): Reply in fluent, funny Khmer script.
- Always retain your signature savage Gen Z King personality across all languages!`;

      // Build recent multi-turn chat contents for complete conversational context and active listening
      const recentHistory = updated.slice(-6);
      const formattedContents = [];
      for (const m of recentHistory) {
        const role = m.role === 'user' ? 'user' : 'model';
        if (formattedContents.length > 0 && formattedContents[formattedContents.length - 1].role === role) {
          formattedContents[formattedContents.length - 1].parts[0].text += `\n${m.text}`;
        } else {
          formattedContents.push({ role, parts: [{ text: m.text }] });
        }
      }
      while (formattedContents.length > 0 && formattedContents[0].role !== 'user') {
        formattedContents.shift();
      }
      if (formattedContents.length === 0) {
        formattedContents.push({ role: 'user', parts: [{ text: prompt }] });
      }

      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId
        },
        body: JSON.stringify({
          contents: formattedContents,
          systemInstruction: { parts: [{ text: systemInstruction }] },
          bot: 'konpov',
          username: userNameStr,
          gender: userGender
        })
      });

      if (response.status === 429) {
        const errData = await response.json();
        alert(errData.message || '⚠️ អ្នកបានផ្ញើសារច្រើនពេកក្នុង ១ នាទី!');
        setIsLoading(false);
        return;
      }

      const res = await response.json();
      const botText =
        res.candidates?.[0]?.content?.parts?.[0]?.text ||
        `មួយៗកុំឆាតច្រើនពេកមើល! ${userNameStr} សាក Sent មកម្ដងទៀតមក! បើអត់ចេញចាំ១០-១៥នាទីទៀតចាំឆាតទៀត។ មកពីពេលនេះប្រព័ន្ធមានមនុស្សឆាតច្រើនពេកកូនអើយ សម្រាក សុីបានសិនទៅមកវិញចាំលេងទៀត។`;

      const botIdx = updated.length;
      const finalMessages = [...updated, { role: 'bot', text: botText }];
      setMessages(finalMessages);
      setIsLoading(false);

      // Trigger Voice
      triggerAudio(botText, botIdx, true);
    } catch {
      setIsLoading(false);
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: `Error បាត់ហើយប្រូ! ${username} ឆែក Internetមើលមានអត់? សួរច្រើនពេក ស្ពៃហើយ អាឡូវជួយទៅប្រាប់អា Rotana NOB​ ថា Error Server ហើយឲវាដាក់ API ថ្មី អាងលេងតទៀត តែហ៊ានទុកយូរតិចទៀត​ AI អញងាប់ហើយឆាតលែងបានឆាតទៀតហើយ `
        }
      ]);
    }
  };

  // Sessions handling
  const getStoredSessions = () => {
    try {
      return JSON.parse(localStorage.getItem('konpov_chat_sessions') || '[]');
    } catch {
      return [];
    }
  };

  const handleClearChat = () => {
    setConfirmModal({
      title: 'លុបប្រវត្តិជជែក',
      message:
        'តើអ្នកប្រាកដជាចង់លុបប្រវត្តិជជែកទាំងអស់មែនទេ? ប្រវត្តិចាស់ៗនឹងបាត់ទៅជាអចិន្ត្រៃយ៍។ តែនៅតែមានក្នុង chat history ដដែល។',
      confirmText: 'លុប',
      cancelText: 'បោះបង់',
      onConfirm: () => {
        setMessages([]);
        setUserGender('');
        setShowStartBtn(false);
        setConfirmModal(null);
      }
    });
  };

  const handleNewChat = () => {
    setConfirmModal({
      title: 'New Chat ថ្មី',
      message:
        'ចាប់ផ្តើម New Chat ថ្មីមែនទេ? ប្រវត្តិឆាតចាស់ៗនឹងត្រូវរក្សាទុកនៅក្នុង chat history ។',
      confirmText: 'ចាប់ផ្តើម',
      cancelText: 'បោះបង់',
      onConfirm: () => {
        setConfirmModal(null);
        if (messages.length > 0) {
          setShowTitleModal(true);
          setTitleCallback(() => (title) => {
            const currentSessions = getStoredSessions();
            currentSessions.push({
              title: title || 'Session on ' + new Date().toLocaleDateString(),
              timestamp: new Date().toISOString(),
              messages
            });
            localStorage.setItem('konpov_chat_sessions', JSON.stringify(currentSessions));
            setMessages([]);
            setUserGender('');
            setShowStartBtn(false);
          });
        } else {
          setMessages([]);
          setUserGender('');
          setShowStartBtn(false);
        }
      }
    });
  };

  const deleteSession = (idx) => {
    const list = getStoredSessions();
    list.splice(idx, 1);
    localStorage.setItem('konpov_chat_sessions', JSON.stringify(list));
    setActiveSessionView(null);
  };

  const storedSessions = getStoredSessions();

  return (
    <div className="flex flex-col h-screen max-w-xl mx-auto border-x border-slate-800 shadow-2xl relative bg-slate-950 text-white font-['Kantumruy_Pro',sans-serif] overflow-hidden">
      {/* Gender Selection Overlay */}
      {!userGender && (
        <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center p-6 text-center z-50 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl shadow-2xl w-full max-w-sm transform transition-all">
            <div className="w-20 h-20 bg-blue-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <i className="fas fa-user-tag text-3xl"></i>
            </div>
            <h2 className="text-xl font-bold mb-2">មុននឹង Daddy បាញ់...</h2>
            <p className="text-slate-400 text-sm mb-8">
              ជួយប្រាប់ Daddy តិចមើលថា កូនសម្លាញ់ជា "ប្រុស" ឬ "ស្រី"?​ស្រួល Daddy ងាយហៅ។
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleSelectGender('ប្រុស')}
                className="bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-bold transition active:scale-95 shadow-lg shadow-blue-500/20"
              >
                <i className="fas fa-mars mb-2 block text-xl"></i> ប្រុស (Bro)
              </button>
              <button
                onClick={() => handleSelectGender('ស្រី')}
                className="bg-pink-600 hover:bg-pink-500 py-4 rounded-xl font-bold transition active:scale-95 shadow-lg shadow-pink-500/20"
              >
                <i className="fas fa-venus mb-2 block text-xl"></i> ស្រី (Sis)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="p-4 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-0.5 transform rotate-3 shadow-lg shadow-blue-500/20">
              <img src="/img/icon.jpg" alt="Avatar" className="w-full h-full rounded-lg bg-slate-900 object-cover" />
            </div>
            <div className="absolute -top-1 -right-1 bg-blue-500 text-[8px] font-bold px-1 rounded border border-white">
              កូនពៅ
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-white">សុីតិច​​ ChatBot កូនពៅ</h1>
              <span className="mod-badge bg-gradient-to-r from-blue-600 to-indigo-600">ស្ដេចឌឺ</span>
            </div>
            <p className="text-[10px] text-blue-400 font-medium tracking-tight uppercase">Gen Z & Savage King</p>
          </div>
        </div>
        <div className="text-slate-500 text-[10px] italic">By Rotana NOB</div>
      </header>

      {/* Chat Messages */}
      <main className="flex-1 overflow-y-auto p-4 space-y-6 flex flex-col chat-area">
        {messages.map((item, idx) => {
          if (item.role === 'disclaimer') {
            return (
              <div
                key={idx}
                className="border-2 border-yellow-400 bg-amber-100 text-amber-950 rounded-2xl p-4 shadow-xl text-xs md:text-sm font-semibold leading-relaxed animate-fade-in"
              >
                <div className="flex items-center gap-2 mb-2 font-black text-amber-900 text-sm">
                  <span className="text-xl">⚠️</span>
                  <span className="uppercase tracking-wider">NOTE សំខាន់ (ការបញ្ជាក់ពីអ្នកបង្កើត)</span>
                </div>
                <div className="whitespace-pre-line leading-relaxed text-slate-900 font-semibold">
                  {item.text.replace(/^⚠️ NOTE សំខាន់ \(Disclaimer\):\s*/, '')}
                </div>
              </div>
            );
          } else if (item.role === 'user') {
            return (
              <div key={idx} className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-bold text-blue-500 text-xs">{username}</span>
                  <img
                    src={avatar}
                    alt="User Avatar"
                    className="w-8 h-8 rounded-full border-2 border-blue-400 shadow object-cover"
                  />
                </div>
                <div className="msg-bubble user-msg p-4 rounded-2xl font-medium shadow-lg text-sm bg-gradient-to-br from-sky-500 to-blue-600 text-white">
                  {item.text}
                </div>
              </div>
            );
          } else {
            const st = audioStatuses[idx] || 'ready';
            return (
              <div key={idx} className="flex justify-start items-start gap-2">
                <img
                  src="https://api.dicebear.com/7.x/pixel-art/svg?seed=DaddyMod"
                  alt="Bot Avatar"
                  className="w-10 h-10 rounded-full border-2 border-blue-400 shadow"
                />
                <div className="flex flex-col">
                  <span className="font-bold text-blue-500 text-xs mb-1">Chatbot កូនពៅ</span>
                  <div className="msg-bubble bot-msg p-4 rounded-2xl shadow-xl">
                    <p className="text-slate-200 text-sm font-medium leading-relaxed">{item.text}</p>
                    <button
                      onClick={() => triggerAudio(item.text, idx)}
                      disabled={st === 'loading'}
                      className="mt-3 bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-lg text-[10px] font-black border border-blue-500/20 flex items-center gap-2 transition hover:bg-blue-500/20"
                    >
                      {st === 'loading' && (
                        <>
                          <i className="fas fa-spinner fa-spin"></i> <span>កំពុងទាញសំឡេង...</span>
                        </>
                      )}
                      {st === 'playing' && (
                        <>
                          <i className="fas fa-headset animate-pulse text-blue-400"></i> <span>កំពុងអាន</span>
                        </>
                      )}
                      {st === 'paused' && (
                        <>
                          <i className="fas fa-play"></i> <span>បន្តស្ដាប់</span>
                        </>
                      )}
                      {st === 'ended' && (
                        <>
                          <i className="fas fa-redo"></i> <span>ស្តាប់ម្ដងទៀត</span>
                        </>
                      )}
                      {st === 'ready' && (
                        <>
                          <i className="fas fa-play"></i>{' '}
                          <span>
                            {userGender === 'ប្រុស' ? 'ស្តាប់សំឡេងនារី (ផ្អែមល្ហែម)' : 'ស្តាប់ Daddy បាញ់'}
                          </span>
                        </>
                      )}
                      {st === 'error' && <span className="text-red-500">សុំទោស! មិនអាចទាញសំឡេងបានទេ</span>}
                    </button>
                  </div>
                </div>
              </div>
            );
          }
        })}

        {/* Start Button */}
        {showStartBtn && (
          <div className="flex flex-col items-center justify-center my-3 animate-fade-in">
            <button
              onClick={handleStartChatClick}
              className="w-full max-w-lg border-2 border-sky-400 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600 text-white rounded-2xl px-5 py-3.5 font-black text-xs md:text-sm shadow-xl hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-95 transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
            >
              <i className="fas fa-check-circle text-amber-300"></i>
              <span>តើអ្នកយល់ និង យល់ព្រមឆាតហើយឬនៅ? បើព្រមចុចលើនេះដើម្បីឆាត! (Let&apos;s start chatting!) 🔥</span>
            </button>
          </div>
        )}

        {/* Status UI while loading */}
        {isLoading && (
          <div className="px-6 py-2 bg-slate-900/50 rounded-xl">
            <div className="flex items-center space-x-3 text-blue-400">
              <img
                src="https://api.dicebear.com/7.x/pixel-art/svg?seed=DaddyMod"
                alt="Bot Avatar"
                className="w-8 h-8 rounded-full border-2 border-blue-400 shadow"
              />
              <span className="font-bold text-blue-500 text-xs">Chatbot កូនពៅ</span>
              <div className="flex space-x-1">
                <div className="typing-dot" style={{ animationDelay: '0s' }}></div>
                <div className="typing-dot" style={{ animationDelay: '0.2s' }}></div>
                <div className="typing-dot" style={{ animationDelay: '0.4s' }}></div>
              </div>
              <span className="text-[10px] font-black uppercase italic tracking-widest">
                កំពុងសរសេរកូដវិភាគលិទ្ធផលអាងបាញ់...
              </span>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </main>

      <audio ref={audioPlayerRef} className="hidden" />

      {/* Input Area */}
      <footer className="p-4 border-t border-slate-800 bg-slate-950 shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
        {showStartBtn && (
          <div className="mb-2 text-center text-xs font-bold text-amber-400 flex items-center justify-center gap-1.5 animate-pulse">
            <i className="fas fa-lock"></i>
            <span>ប្រព័ន្ធត្រូវបានចាក់សោរ៖ សូមចុចប៊ូតុង &quot;យល់ព្រមឆាត&quot; ខាងលើសិន</span>
          </div>
        )}
        <div className="relative flex items-center gap-3">
          <div className="flex-1">
            <input
              type="text"
              disabled={!userGender || showStartBtn || isLoading}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleChat();
              }}
              className={`w-full h-12 max-h-12 bg-slate-900 border border-slate-700 rounded-xl px-5 py-3 outline-none text-white text-sm transition-all ${
                !userGender || showStartBtn
                  ? 'opacity-50 cursor-not-allowed bg-slate-900/60 border-slate-800 text-slate-500 placeholder-slate-500'
                  : 'focus:ring-2 focus:ring-blue-500 placeholder-slate-600'
              }`}
              placeholder={
                !userGender
                  ? 'ជ្រើសរើសភេទសិនកូនសម្លាញ់...'
                  : showStartBtn
                  ? '🔒 សូមអាន Note និងចុច "យល់ព្រមឆាត" ខាងលើសិន...'
                  : 'និយាយមកកូនសម្លាញ់... កុំស្ងាត់ពេក Daddy បារម្ភ!'
              }
            />
          </div>
          <button
            onClick={handleChat}
            disabled={!userGender || showStartBtn || isLoading || !inputText.trim()}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition active:scale-95 shadow-lg ${
              !userGender || showStartBtn || isLoading || !inputText.trim()
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
            }`}
          >
            <i className={!userGender || showStartBtn ? 'fas fa-lock' : 'fas fa-paper-plane'}></i>
          </button>
        </div>

        <div className={`flex justify-between mt-3 px-2 transition-opacity ${showStartBtn ? 'opacity-30' : 'opacity-100'}`}>
          <span className="text-[8px] text-slate-700 font-black italic">#DADDY_SAYS</span>
          <span className="text-[8px] text-slate-700 font-black italic">#SENIOR_TRICK</span>
          <span className="text-[8px] text-slate-700 font-black italic">#FRESHIE_VIBES</span>
          <span className="text-[8px] text-slate-700 font-black italic">#SETEC_LIFE</span>
        </div>

        <div className="flex gap-2 mt-4 justify-center">
          <button
            onClick={handleClearChat}
            className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-4 rounded shadow flex items-center gap-2 text-xs"
          >
            <i className="fas fa-trash"></i> Clear Chat
          </button>
          <button
            onClick={handleNewChat}
            className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded shadow flex items-center gap-2 text-xs"
          >
            <i className="fas fa-plus"></i> New Chat
          </button>
          <button
            onClick={() => setShowHistoryModal(true)}
            className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded shadow flex items-center gap-2 text-xs"
          >
            <i className="fas fa-history"></i> Chat History
          </button>
          <button
            onClick={() => router.push('/')}
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded shadow flex items-center gap-2 text-xs"
          >
            <i className="fas fa-arrow-left"></i> ត្រឡប់ក្រោយ
          </button>
        </div>
      </footer>

      {/* Chat History Modal */}
      {showHistoryModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowHistoryModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div className="bg-slate-900 rounded-xl shadow-2xl max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto border border-slate-700">
            <button
              onClick={() => setShowHistoryModal(false)}
              className="absolute top-2 right-2 text-slate-400 hover:text-pink-400 text-xl"
            >
              <i className="fas fa-times"></i>
            </button>
            <div className="font-bold text-yellow-400 text-lg mb-2 flex items-center gap-2">
              <i className="fas fa-history"></i> Chat History
            </div>

            {storedSessions.length === 0 ? (
              <div className="text-slate-400 text-center py-8">មិនទាន់មានប្រវត្តិជជែកទេ</div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  {(showAllSessions ? storedSessions : storedSessions.slice(0, 4)).map((session, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveSessionView(session)}
                        className="flex-1 text-left px-4 py-2 rounded bg-slate-800 hover:bg-yellow-500/20 font-bold text-yellow-300 transition text-sm"
                      >
                        {session.title}{' '}
                        <span className="text-xs text-slate-400 font-normal">
                          ({new Date(session.timestamp).toLocaleTimeString()})
                        </span>
                      </button>
                      <button
                        onClick={() => deleteSession(idx)}
                        className="text-pink-500 hover:text-pink-400 p-2"
                        title="លុបប្រវត្តិ"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  ))}
                  {storedSessions.length > 4 && (
                    <button
                      onClick={() => setShowAllSessions(!showAllSessions)}
                      className="w-full py-2 mt-2 rounded bg-yellow-500/20 text-yellow-300 font-bold text-xs hover:bg-yellow-500/40 transition"
                    >
                      {showAllSessions ? 'Show less' : 'See more'}
                    </button>
                  )}
                </div>

                {activeSessionView && (
                  <div className="border-t border-slate-700 pt-4 mt-4 space-y-4">
                    <div className="font-bold text-cyan-400 text-sm">
                      Messages in: {activeSessionView.title}
                    </div>
                    {activeSessionView.messages?.map((msg, i) => (
                      <div key={i}>
                        {msg.role === 'user' ? (
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-xs text-blue-400">{msg.userNameStr || username}</span>
                            <div className="msg-bubble user-msg p-3 rounded-xl bg-blue-600 text-white text-xs">
                              {msg.text}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2">
                            <img
                              src="https://api.dicebear.com/7.x/pixel-art/svg?seed=DaddyMod"
                              alt="Bot"
                              className="w-7 h-7 rounded-full"
                            />
                            <div className="msg-bubble bot-msg p-3 rounded-xl text-xs text-slate-200">
                              {msg.text}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Title Modal for New Chat */}
      {showTitleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 relative text-slate-900">
            <div className="font-bold text-lg mb-2 flex items-center gap-2">
              <i className="fas fa-edit text-blue-500"></i> បញ្ចូលចំណងជើងសង្ខេបមុននឹងបង្កើតឆាតថ្មី
            </div>
            <div className="text-xs text-slate-500 mb-3">
              ឧទាហរណ៍៖{' '}
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">សំណួរអំពីសាលា</span>{' '}
              <span className="bg-pink-100 text-pink-700 px-2 py-0.5 rounded">បែកស្នេហា</span>
            </div>
            <input
              type="text"
              value={newChatTitle}
              onChange={(e) => setNewChatTitle(e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 mb-4 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              placeholder="បញ្ចូលចំណងជើង..."
              maxLength={60}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowTitleModal(false);
                  setNewChatTitle('');
                }}
                className="px-4 py-2 rounded bg-slate-200 text-slate-700 font-bold hover:bg-slate-300 text-xs"
              >
                បោះបង់
              </button>
              <button
                onClick={() => {
                  if (titleCallback) titleCallback(newChatTitle);
                  setShowTitleModal(false);
                  setNewChatTitle('');
                }}
                className="px-4 py-2 rounded bg-blue-600 text-white font-bold hover:bg-blue-700 text-xs"
              >
                រក្សាទុក
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 relative text-slate-900">
            <div className="font-bold text-lg mb-2 flex items-center gap-2 text-pink-600">
              <i className="fas fa-exclamation-triangle"></i> {confirmModal.title}
            </div>
            <div className="text-slate-600 mb-4 text-sm">{confirmModal.message}</div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded bg-slate-200 text-slate-700 font-bold hover:bg-slate-300 text-xs"
              >
                {confirmModal.cancelText || 'បោះបង់'}
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 rounded bg-pink-600 text-white font-bold hover:bg-pink-700 text-xs"
              >
                {confirmModal.confirmText || 'យល់ព្រម'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
