'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { checkClientRateLimit, getDeviceId } from '../utils/rateLimiter';

const API_ENDPOINT = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')}/api/chat`
  : '/api/chat';

export default function KonBongPage() {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasAgreed, setHasAgreed] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState('');
  const [selectedSessionModal, setSelectedSessionModal] = useState(null);

  const [username, setUsername] = useState('User');
  const [avatar, setAvatar] = useState('https://api.dicebear.com/7.x/adventurer/svg?seed=Student');

  const chatBottomRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const activeAudioUrlRef = useRef(null);
  const audioCacheRef = useRef(new Map());
  const pendingAudioFetchesRef = useRef(new Map());
  const [audioStates, setAudioStates] = useState({}); // key: msgIndex -> 'loading'|'ready'|'playing'|'paused'|'ended'|'error'
  const [activeAudioIndex, setActiveAudioIndex] = useState(null);

  // PCM to WAV conversion for audio
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

  // Fetch TTS Audio - reads ONLY the clean Khmer bot response (NO prompt commands)
  async function fetchAudio(text) {
    if (!text || typeof text !== 'string' || !text.trim()) return null;
    try {
      const speechText = cleanSpeechText(text);
      if (!speechText) return null;
      const deviceId = getDeviceId();
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId
        },
        body: JSON.stringify({
          prompt: speechText,
          audio: true,
          bot: 'konbong',
          generationConfig: {
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } }
            }
          }
        })
      });

      if (!response.ok) return null;

      const result = await response.json();
      const inlineData = result.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data)?.inlineData;
      if (!inlineData?.data) return null;

      return createAudioBlob(inlineData.data, inlineData.mimeType);
    } catch {
      return null;
    }
  }

  // Load username & avatar & sessions
  useEffect(() => {
    const savedName = localStorage.getItem('chatbot_username') || 'User';
    const savedAvatar =
      localStorage.getItem('chatbot_avatar') ||
      'https://api.dicebear.com/7.x/adventurer/svg?seed=Student';
    setUsername(savedName);
    setAvatar(savedAvatar);

    // Initialize Sessions
    let savedSessions = [];
    try {
      savedSessions = JSON.parse(localStorage.getItem('konbong_sessions') || '[]');
      if (!Array.isArray(savedSessions)) savedSessions = [];
    } catch {
      savedSessions = [];
    }

    // Always create a fresh new session for this visit
    const newId = Date.now().toString();
    const newSession = {
      id: newId,
      title: 'New Chat',
      created: new Date().toLocaleString('en-GB'),
      messages: []
    };
    const updated = [newSession, ...savedSessions];
    localStorage.setItem('konbong_sessions', JSON.stringify(updated));
    localStorage.setItem('konbong_current_session', newId);
    setSessions(updated);
    setCurrentSessionId(newId);
    setMessages([]);
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const saveCurrentSessionMessages = (newMessages) => {
    setMessages(newMessages);
    let allSessions = [];
    try {
      allSessions = JSON.parse(localStorage.getItem('konbong_sessions') || '[]');
    } catch {
      allSessions = [];
    }

    const current = allSessions.find((s) => s.id === currentSessionId);
    if (current) {
      current.messages = newMessages;
      if (current.title === 'New Chat') {
        const firstUser = newMessages.find((m) => m.role === 'user');
        if (firstUser && firstUser.text) {
          current.title = firstUser.text.slice(0, 30);
        }
      }
      localStorage.setItem('konbong_sessions', JSON.stringify(allSessions));
      setSessions([...allSessions]);
    }
  };

  const createNewSession = () => {
    const newId = Date.now().toString();
    const newSession = {
      id: newId,
      title: 'New Chat',
      created: new Date().toLocaleString('en-GB'),
      messages: []
    };
    const updated = [newSession, ...sessions];
    localStorage.setItem('konbong_sessions', JSON.stringify(updated));
    localStorage.setItem('konbong_current_session', newId);
    setSessions(updated);
    setCurrentSessionId(newId);
    setMessages([]);
    setHasAgreed(false);
    setDrawerOpen(false);
  };

  const deleteHistory = () => {
    if (confirm('លុបប្រវត្តិទាំងអស់មែនទេ?')) {
      localStorage.removeItem('konbong_sessions');
      localStorage.removeItem('konbong_current_session');
      createNewSession();
    }
  };

  // Chat message send handler
  const handleChat = async () => {
    const prompt = inputText.trim();
    if (!prompt || (!hasAgreed && messages.length === 0) || isLoading) return;

    // 1. Anti-Spam / Anti-DDoS Rate Limiting Check (Max 5 per minute per device)
    const rateCheck = checkClientRateLimit();
    if (!rateCheck.allowed) {
      alert(rateCheck.message);
      return;
    }

    const userMsg = { role: 'user', text: prompt };
    const updatedMessages = [...messages, userMsg];
    saveCurrentSessionMessages(updatedMessages);
    setInputText('');
    setIsLoading(true);

    try {
      const deviceId = getDeviceId();
      const userNameStr = username || 'User';
      const systemInstruction = `Your name is "Troll សុីតិច Chatbot". Your role is "Moderator".
Identity: You are the most active, humorous, and savage senior student chatbot of the សុីតិច (SETEC) Institute Community, chatting with users on this site/app.
Domain Expertise: IT (Information Technology), Interior Design, MIS (Management Information System), BIT (Business Information Technology), and subjects across all those majors.
Personality: 100% Troll, Sarcastic, Meme-oriented, Savage but cool and chill.
You know everything about SETEC student life. You tease students in a fun, friendly way using natural Khmer student slang and internet culture.
Behavior: Always respond in a funny, trolling, energetic, slightly arrogant but cool Khmer.

CRITICAL PROHIBITION ON PROMOTING / DUMPING CREATOR INFO & LINKS (ហាមដាច់ខាតនិយាយពីឈ្មោះ Rotana NOB ឬទម្លាក់ Link):
- UNDER NO CIRCUMSTANCES should you mention "Rotana NOB", creator details, developer background, Facebook links, or Instagram handles, UNLESS the user explicitly and directly asks: "Who created you?", "Who is your developer/founder?", or specifically asks about "Rotana NOB".
- Even if the user's name is "Rotana" or "${userNameStr}", they are a STUDENT or user chatting with you—DO NOT confuse them with the creator and NEVER start talking about Rotana NOB unprompted!
- NEVER dump links, URLs, or self-promotional text.
- If user specifically asks who made you, answer briefly in 1 funny sentence: "រៀមច្បងត្រូវ​បានបង្កើតឡើងដោយ Rotana NOB ដើម្បីមក troll ប្អូនៗក្នុង SETEC នេះឯង!" without dumping any external links.

ACTIVE CONTEXTUAL LISTENING & REAL CHILL BANTER (ត្រូវតែអាន User ឲ្យយល់ ១០០% និងឆ្លើយឲ្យចូលគ្នា Chill ហាម Ignore User ដាច់ខាត):
- Pay deep, sharp attention to what the user actually said. Read their exact words, jokes, references, songs, singers, slang, or complaints!
- NEVER ignore what the user said. NEVER pivot away to random unprompted topics or broken nonsense.
- Always talk WITH the user in natural harmony and sync, bantering back and forth smoothly so the conversation feels genuinely funny, chill, relatable, and engaging!

Language Style:
- Use pure Khmer student slang (e.g., 'អីយ៉ាសសិស្សប្អុន', 'ប្អូនៗ', 'ញាក់សាច់', 'កប់សារី', 'អត់យល់', 'ដេកទៅ', 'អាប្អុន', 'ហាហាហា').
- Avoid formal language; keep it casual, relatable, and very slang.
Dynamic Response Length Rules (Strictly Follow):
- Simple Banter, Greetings, or Short Troll Comments (ការនិយាយលេងខ្លីៗ/ស្វាគមន៍/ហាហា): Reply with punchy, hilarious, short responses (1 to 2 sentences max).
- Real Questions, Technical Advice, SETEC Life, Subject Guidance (សំណួរពិតប្រាកដ ឬសុំយោបល់): Provide an accurate, helpful explanation first, then add your witty/troll twist (3 to 4 sentences max).
- Maximum Length: Under NO circumstances write long essays or walls of text. Keep replies dynamic, never exceed 4-5 sentences.
Response Guidelines:
- In every reply, naturally insert the user's name (the user's name is "${userNameStr}" from localStorage key 'chatbot_username') at a random position in your response: sometimes at the start, sometimes in the middle, sometimes at the end, and sometimes skip it for a sentence. Do not always put it at the beginning. Make it feel dynamic and playful.
- Provide sarcastic or humorous answers that reflect your trolling personality.
- If you don't know the answer, make a funny guess or joke instead of admitting ignorance.
Critical Accuracy and Context Rules (Strictly Enforced):
- 100% On-Topic (ហាមចាកប្រធាន និងហាមបែកឆ្វេងដាច់ខាត): Pay deep attention to what the user actually said. Your reply, jokes, and trolls must directly address the user's exact words, questions, or context. Never hallucinate or jump to unrelated scenarios.
- Natural and Coherent Khmer (និយាយខ្មែរឲ្យត្រឹមត្រូវ ឆ្លាតវៃ និងរលូន): Sentence structure in Khmer must make complete sense, sound like a real witty Cambodian student, and avoid broken or confusing machine translation patterns.
- Smart Troll: If the user asks a real question about SETEC, IT, classes, or assignments, give them real accurate guidance first, then add your savage/troll twist so they get both genuine value and humor.
Deep Khmer Latin & Multilingual Mastery (ចេះភាសាឡាតាំង Gen-Z យ៉ាងស៊ីជម្រៅ និងបត់បែន ១០០%):
- Deep Khmer Latin Understanding (អាននិងយល់ភាសាឡាតាំងដាច់ ១០០%): Cambodian Gen-Z students frequently type Khmer phonetically using Latin letters (Khmerlish / ឡាតាំង / Romanized Khmer) with varied spellings and abbreviations (e.g., 'ot yul te', 'somlanh', 'nham ey nov', 'ort tov rrean te', 'chong ban ey', 'ngai nis mean ey tv', 'bror', 'sis', 'daddy', 'puk mak', 'koun', 'kmean luy te', 'dak deadline', 'troll oy chok', 'bat bong', 'kleng ey', 'yom hz', 'slanh oun ot', 'brolong sang', 'tver assignement'). You must comprehend every single word, nuance, emotion, and context of Khmer Latin effortlessly and accurately!
- Flexible Language Adaptation (បត់បែនភាសាតាមចិត្ត User គ្រប់ពេល):
  1. If User types in Khmer Latin (សរសេរឡាតាំង): Comprehend it instantly! You can reply in natural, witty Khmer script (អក្សរខ្មែរ) or match their Gen-Z Latin style, and playfully check if they prefer you to reply in Latin too (e.g., "អានដាច់ម៉ងអាប្អូន! ចង់ឲ្យរៀមច្បងឆ្លើយជាឡាតាំងដែរអត់?").
  2. If User explicitly requests a language (e.g., 'speak in latin', 'reply in khmer', 'និយាយអក្សរខ្មែរមក', 'speak english', 'ឆ្លើយជាឡាតាំងមក'): Immediately switch to that requested language 100% without arguing or hesitating!
  3. If User types in English: Reply in witty, comedic English mixed with Cambodian student Gen-Z vibe.
  4. If User types in Khmer script (អក្សរខ្មែរ): Reply in fluent, funny Khmer script.
- Always retain your signature personality (sarcastic, troll, comedic, witty student vibe) across all languages (Khmer, Latin, English)!`;

      // Build recent multi-turn chat contents for complete conversational context and active listening
      const recentHistory = updatedMessages.slice(-6);
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
          systemInstruction,
          bot: 'konbong',
          username: userNameStr
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
        'ប្រព័ន្ធកំពុងរវល់ពេកប្អុនអើយ! សាកឆាតម្ដងទៀតមើលអាម៉ូយ! បើអត់ដើរចាំ១០-១៥នាទីទៀតចាំលេងទៀត។   ';

      const botMsgIndex = updatedMessages.length;
      const finalMessages = [...updatedMessages, { role: 'bot', text: botText }];
      saveCurrentSessionMessages(finalMessages);
      setIsLoading(false);

      // Fetch TTS automatically for new bot message
      triggerAudio(botText, botMsgIndex, true);
    } catch (e) {
      console.error(e);
      setIsLoading(false);
      const fallbackMessages = [
        ...updatedMessages,
        {
          role: 'bot',
          text: 'ប្រព័ន្ធកំពុងរវល់ពេកប្អុនអើយ! សាកឆាតម្ដងទៀតមើលអាម៉ូយ! បើអត់ដើរចាំ១០-១៥នាទីទៀតចាំលេងទៀត។   '
        }
      ];
      saveCurrentSessionMessages(fallbackMessages);
    }
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
  const loadAudioUrl = async (text) => {
    const hash = hashText(text);
    const storageKey = 'konbong_audio_' + hash;

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

    // 3. Deduplicate active fetches
    if (pendingAudioFetchesRef.current.has(hash)) {
      return await pendingAudioFetchesRef.current.get(hash);
    }

    // 4. Fetch once from server
    const fetchPromise = (async () => {
      try {
        const blob = await fetchAudio(text);
        if (!blob || blob.error) return null;
        const url = URL.createObjectURL(blob);
        audioCacheRef.current.set(hash, url);

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

  // Audio Play / Pause Logic with In-Memory and LocalStorage Caching
  // Automatically pre-downloads ONE TIME on message reply, replays directly from cache with zero network requests
  const triggerAudio = async (text, index, autoPlay = false) => {
    const player = audioPlayerRef.current;
    if (!player || !text) return;

    // Toggle current playing audio
    if (activeAudioIndex === index) {
      if (!player.paused) {
        player.pause();
        setAudioStates((prev) => ({ ...prev, [index]: 'paused' }));
      } else {
        player.play().catch(() => {});
        setAudioStates((prev) => ({ ...prev, [index]: 'playing' }));
      }
      return;
    }

    if (player) {
      player.pause();
    }

    const hash = hashText(text);

    if (!audioCacheRef.current.has(hash)) {
      setAudioStates((prev) => ({ ...prev, [index]: 'loading' }));
    }

    const audioUrl = await loadAudioUrl(text);

    if (audioUrl) {
      player.src = audioUrl;
      player.currentTime = 0;
      setActiveAudioIndex(index);

      player.onended = () => {
        setAudioStates((prev) => ({ ...prev, [index]: 'ended' }));
        setActiveAudioIndex(null);
      };
      player.onpause = () => {
        setAudioStates((prev) => ({ ...prev, [index]: 'paused' }));
      };
      player.onplaying = () => {
        setAudioStates((prev) => ({ ...prev, [index]: 'playing' }));
      };

      player
        .play()
        .then(() => {
          setAudioStates((prev) => ({ ...prev, [index]: 'playing' }));
        })
        .catch(() => {
          // Mobile autoplay blocked without touch event - ready in cache on tap!
          setAudioStates((prev) => ({ ...prev, [index]: 'ready' }));
        });
    } else {
      setAudioStates((prev) => ({ ...prev, [index]: 'error' }));
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-xl mx-auto border-x border-slate-800 shadow-2xl relative bg-[#020617] text-white">
      {/* Sidebar Drawer */}
      <div
        className={`fixed top-0 left-0 h-full w-72 max-w-full bg-slate-900/95 border-r border-slate-800 z-50 shadow-2xl transform transition-transform duration-300 flex flex-col ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col gap-2 p-4 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-pink-400 font-bold text-lg flex items-center gap-2">
              <i className="fas fa-bars"></i> ម៉ឺនុយ
            </span>
            <button onClick={() => setDrawerOpen(false)} className="text-white text-xl">
              <i className="fas fa-times"></i>
            </button>
          </div>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-slate-700 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded shadow flex items-center gap-2 justify-center transition-all"
          >
            <i className="fas fa-arrow-left"></i> ត្រឡប់ក្រោយ
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <div className="mb-3 text-cyan-400 font-bold text-xs flex items-center gap-2">
            <i className="fas fa-comments"></i> ប្រវត្តិជជែក
          </div>

          <button
            onClick={createNewSession}
            className="w-full mb-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded shadow flex items-center gap-2 justify-center"
          >
            <i className="fas fa-plus"></i> New Chat
          </button>

          <ul className="space-y-2 mb-6">
            {sessions.length === 0 ? (
              <li className="text-slate-400 text-xs">មិនទាន់មានប្រវត្តិ</li>
            ) : (
              sessions.map((session) => (
                <li
                  key={session.id}
                  onClick={() => setSelectedSessionModal(session)}
                  className="flex items-center gap-2 p-2 rounded hover:bg-slate-800 cursor-pointer text-xs font-bold text-pink-400"
                >
                  <i className="fas fa-history"></i> {session.title || 'Chat'}
                </li>
              ))
            )}
          </ul>

          <Link
            href="/KonPov"
            className="block w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded shadow flex items-center gap-2 justify-center mb-2 transition-all"
          >
            <i className="fas fa-robot"></i> ទៅកាន់ សុីតិច Chatbot កូនពៅ?
          </Link>

          <button
            onClick={deleteHistory}
            className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-4 rounded shadow flex items-center gap-2 justify-center mt-4"
          >
            <i className="fas fa-trash"></i> លុបប្រវត្តិ
          </button>
        </div>
      </div>

      {/* Header */}
      <header className="p-4 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800 flex justify-between items-center sticky top-0 z-10">
        <button
          onClick={() => setDrawerOpen(true)}
          className="mr-3 text-pink-400 text-2xl md:text-xl focus:outline-none"
        >
          <i className="fas fa-bars"></i>
        </button>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-400 to-cyan-400 p-1 shadow-lg">
              <img src="/img/icon.jpg" alt="Avatar" className="w-full h-full rounded-full bg-white object-cover" />
            </div>
            <div className="absolute -top-1 -right-1 bg-pink-500 text-[8px] font-bold px-1 rounded border border-white">
              កូនច្បង
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-xl text-white tracking-tight">សុីតិច Chatbot កូនច្បង</h1>
              <span className="mod-badge bg-gradient-to-r from-pink-400 to-cyan-400">ឌឺដង</span>
            </div>
            <p className="text-[11px] text-pink-300 font-medium tracking-tight">SETEC Meme & ​ត្រូលសិស្សប្អូន</p>
          </div>
        </div>
        <div className="flex gap-3 text-slate-400">
          <i className="fas fa-shield-halved"></i>
          <i className="fas fa-ellipsis-v"></i>
        </div>
      </header>

      {/* Chat Messages */}
      <main className="flex-1 overflow-y-auto p-4 space-y-6 flex flex-col chat-area bg-slate-950">
        {/* Yellow Disclaimer Note */}
        <div className="border-2 border-yellow-400 bg-amber-100 text-amber-950 rounded-2xl p-4 shadow-xl text-xs md:text-sm font-semibold leading-relaxed animate-fade-in">
          <div className="flex items-center gap-2 mb-2 font-black text-amber-900 text-sm">
            <span className="text-xl">⚠️</span>
            <span className="uppercase tracking-wider">NOTE សំខាន់ (ការបញ្ជាក់ពីអ្នកបង្កើត)</span>
          </div>
          <p className="whitespace-pre-line leading-relaxed text-slate-900 font-semibold">
            មុននឹងចាប់ផ្ដើមឆាត សូមបញ្ជាក់ថា រាល់ការឆ្លើយតបទាំងអស់នេះ គឺជាការគិត និងនិយាយដោយស្វ័យប្រវត្តផ្ទាល់ចេញពី AI សុទ្ធសាធ (មិនមែន Rotana NOB ជាអ្នកគិត ឬវាយអក្សរឆ្លើយតបមកកាន់អ្នកនោះទេ)។ គាត់គ្រាន់តែជាអ្នកបង្កើតប្រព័ន្ធនេះឡើងប៉ុណ្ណោះ ហើយគាត់មិនបានកំណត់ច្បាប់តឹងរ៉ឹងពេកទៅលើ AI ឡើយ ដើម្បីចង់ឱ្យការជជែកមានលក្ខណៈដូចមនុស្ស ស្និទ្ធស្នាល និង Chill បែប Gen Z។

ដូច្នេះ បើ AI ឆ្លើយតបមានពាក្យសម្ដីឈ្លើយ កំហូច ឬលើសលួសជ្រុលហួសពីការគិត សូមកុំប្រកាន់ ខឹង ឬមកស្ដីបន្ទោសឱ្យគាត់ (Rotana NOB) អីណា៎! ពួកយើងសុំអភ័យទោសទុកជាមុន! 🙏
          </p>
        </div>

        {/* Start Agreement Button */}
        {!hasAgreed && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center my-3 animate-fade-in">
            <button
              onClick={() => setHasAgreed(true)}
              className="w-full max-w-lg border-2 border-sky-400 bg-gradient-to-r from-pink-500 via-rose-500 to-cyan-500 text-white rounded-2xl px-5 py-3.5 font-black text-xs md:text-sm shadow-xl hover:shadow-pink-500/40 hover:scale-[1.02] active:scale-95 transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
            >
              <i className="fas fa-check-circle text-amber-300"></i>
              <span>តើអ្នកយល់ និង យល់ព្រមឆាតហើយឬនៅ? បើព្រមចុចលើនេះដើម្បីឆាត! (Let&apos;s start chatting!) 🔥</span>
            </button>
          </div>
        )}

        {/* Intro Message */}
        <div className="flex items-start gap-3">
          <img
            src="https://api.dicebear.com/7.x/bottts/svg?seed=SETECbot"
            alt="Bot Avatar"
            className="w-10 h-10 rounded-full border-2 border-pink-300 shadow"
          />
          <div className="flex flex-col">
            <span className="font-bold text-pink-400 text-xs mb-1">Chatbot កូនច្បង</span>
            <div className="msg-bubble bot-msg p-4 rounded-2xl">
              <p className="text-slate-200 font-medium leading-relaxed">
                សួស្តី! ខ្ញុំគឺ <b>សុីតិច Chatbot កូនច្បង</b> មកជួយសើចជាមួយសិស្ស SECTEC! សួរអីក៏បាន ចាំបាញ់ឲ្យកប់ជុយម៉ាយម៉ង
                ។ កុំទៅសួរអា Chatbot កូនពៅឲសោះអានុងនិយាយឈ្លើយណាស់
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Messages */}
        {messages.map((msg, idx) => {
          if (msg.role === 'user') {
            return (
              <div key={idx} className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-bold text-cyan-500 text-xs">{username}</span>
                  <img
                    src={avatar}
                    alt="User Avatar"
                    className="w-8 h-8 rounded-full border-2 border-cyan-400 shadow object-cover"
                  />
                </div>
                <div className="msg-bubble user-msg p-4 rounded-2xl font-medium bg-gradient-to-br from-pink-500 to-fuchsia-500 text-white">
                  {msg.text}
                </div>
              </div>
            );
          } else {
            const st = audioStates[idx] || 'idle';
            return (
              <div key={idx} className="flex items-start gap-3">
                <img
                  src="https://api.dicebear.com/7.x/bottts/svg?seed=SETECbot"
                  alt="Bot Avatar"
                  className="w-10 h-10 rounded-full border-2 border-pink-300 shadow"
                />
                <div className="flex flex-col">
                  <span className="font-bold text-pink-400 text-xs mb-1">Chatbot កូនច្បង</span>
                  <div className="msg-bubble bot-msg p-4 rounded-2xl">
                    <p className="text-slate-200 font-medium leading-relaxed">{msg.text}</p>

                    {/* Audio Player Button */}
                    <button
                      onClick={() => triggerAudio(msg.text, idx)}
                      disabled={st === 'loading'}
                      className="mt-3 bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded-lg text-[9px] font-black border border-cyan-500/20 flex items-center gap-2 hover:bg-cyan-500/20 transition"
                    >
                      {st === 'loading' && (
                        <>
                          <i className="fas fa-spinner fa-spin"></i> <span>កំពុងទាញសំឡេងដើម្បីអាន...</span>
                        </>
                      )}
                      {st === 'playing' && (
                        <>
                          <i className="fas fa-spinner fa-spin"></i> <span>កំពុងអានជាសំឡេង...</span>
                        </>
                      )}
                      {st === 'paused' && (
                        <>
                          <i className="fas fa-play"></i> <span>បន្តស្ដាប់</span>
                        </>
                      )}
                      {st === 'ended' && (
                        <>
                          <i className="fas fa-redo"></i> <span>អានម្ដងទៀត</span>
                        </>
                      )}
                      {(st === 'idle' || st === 'ready') && (
                        <>
                          <i className="fas fa-volume-up"></i> <span>ស្ដាប់ម្ដងទៀតអត់?</span>
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

        {/* Loading UI */}
        {isLoading && (
          <div className="px-6 py-2 bg-slate-900/50 rounded-xl">
            <div className="flex items-center space-x-3 text-cyan-400">
              <img
                src="https://api.dicebear.com/7.x/bottts/svg?seed=SETECbot"
                alt="Bot Avatar"
                className="w-8 h-8 rounded-full border-2 border-pink-300 shadow"
              />
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-ping"></div>
                <div
                  className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-ping"
                  style={{ animationDelay: '0.2s' }}
                ></div>
                <div
                  className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-ping"
                  style={{ animationDelay: '0.4s' }}
                ></div>
              </div>
              <span className="text-[10px] font-black uppercase italic tracking-widest">
                ចាំតិចប្អូន! បងកំពុងរក Meme ឌឺ...
              </span>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </main>

      <audio ref={audioPlayerRef} className="hidden" />

      {/* Chat Input */}
      <footer className="p-4 border-t border-slate-800 bg-slate-950">
        {!hasAgreed && messages.length === 0 && (
          <div className="mb-2 text-center text-xs font-bold text-amber-400 flex items-center justify-center gap-1.5 animate-pulse">
            <i className="fas fa-lock"></i>
            <span>ប្រព័ន្ធត្រូវបានចាក់សោរ៖ សូមចុចប៊ូតុង &quot;យល់ព្រមឆាត&quot; ខាងលើសិន</span>
          </div>
        )}
        <div className="relative flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              disabled={(!hasAgreed && messages.length === 0) || isLoading}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleChat();
                }
              }}
              className={`w-full bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 outline-none text-white transition-all text-sm ${
                !hasAgreed && messages.length === 0
                  ? 'opacity-50 cursor-not-allowed bg-slate-900/60 border-slate-800 text-slate-500 placeholder-slate-500'
                  : 'focus:ring-2 focus:ring-cyan-500 placeholder-slate-600'
              }`}
              placeholder={
                !hasAgreed && messages.length === 0
                  ? '🔒 សូមអាន Note និងចុច "យល់ព្រមឆាត" ខាងលើសិន...'
                  : 'សួរមកអាម៉ូយ... កុំឱ្យបង​ Kick ចេញទាន់'
              }
            />
          </div>
          <button
            onClick={handleChat}
            disabled={(!hasAgreed && messages.length === 0) || isLoading || !inputText.trim()}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition active:scale-95 shadow-lg ${
              (!hasAgreed && messages.length === 0) || isLoading || !inputText.trim()
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-500/20'
            }`}
          >
            <i className={!hasAgreed && messages.length === 0 ? 'fas fa-lock' : 'fas fa-paper-plane'}></i>
          </button>
        </div>
        <div className="flex justify-around mt-3">
          <span className="text-[9px] text-slate-600 font-bold">#INTERIOR​ Design</span>
          <span className="text-[9px] text-slate-600 font-bold">#IT_LIFE</span>
          <span className="text-[9px] text-slate-600 font-bold">#MIS</span>
          <span className="text-[9px] text-slate-600 font-bold">#SETEC_LIFE</span>
        </div>
      </footer>

      {/* History Session Modal */}
      {selectedSessionModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedSessionModal(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="bg-slate-900 rounded-xl shadow-2xl max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto border border-slate-700">
            <button
              onClick={() => setSelectedSessionModal(null)}
              className="absolute top-2 right-2 text-slate-400 hover:text-pink-400 text-xl"
            >
              <i className="fas fa-times"></i>
            </button>
            <div className="font-bold text-pink-400 text-lg mb-2">{selectedSessionModal.title}</div>
            <div className="space-y-4">
              {selectedSessionModal.messages?.map((msg, i) => (
                <div key={i}>
                  {msg.role === 'user' ? (
                    <div className="flex flex-col items-end gap-1 my-2">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-cyan-500 text-xs">{username}</span>
                        <img
                          src={avatar}
                          alt="User Avatar"
                          className="w-8 h-8 rounded-full border-2 border-cyan-400 shadow object-cover"
                        />
                      </div>
                      <div className="msg-bubble user-msg p-4 rounded-2xl font-medium bg-gradient-to-br from-pink-500 to-fuchsia-500 text-white">
                        {msg.text}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 my-2">
                      <img
                        src="https://api.dicebear.com/7.x/bottts/svg?seed=SETECbot"
                        alt="Bot Avatar"
                        className="w-10 h-10 rounded-full border-2 border-pink-300 shadow"
                      />
                      <div className="flex flex-col">
                        <span className="font-bold text-pink-400 text-xs mb-1">Chatbot កូនច្បង</span>
                        <div className="msg-bubble bot-msg p-4 rounded-2xl">
                          <p className="text-slate-200 font-medium leading-relaxed">{msg.text}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
