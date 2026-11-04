'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { checkClientRateLimit, getDeviceId } from '../utils/rateLimiter';
import AntiSpamModal from '@/components/AntiSpamModal';

const API_ENDPOINT = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')}/api/chat`
  : '/api/chat';

export default function KonBongPage() {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState('');
  const [selectedSessionModal, setSelectedSessionModal] = useState(null);

  // Anti-Spam Scary/Funny Modal State
  const [spamModalOpen, setSpamModalOpen] = useState(false);
  const [spamInfo, setSpamInfo] = useState({ ip: '', device: '', retryAfter: 60 });
  const [fallbackAudioMap, setFallbackAudioMap] = useState({});

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

  // Fetch TTS Audio - reads ONLY the clean Khmer bot response with expressive funny voice
  async function fetchAudio(text, index) {
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
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }
            }
          }
        })
      });

      if (!response.ok) return null;

      const result = await response.json();
      if (result.isFallbackBotVoice && typeof index === 'number') {
        setFallbackAudioMap((prev) => ({ ...prev, [index]: true }));
      }
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
    setDrawerOpen(false);
  };

  const deleteHistory = () => {
    if (confirm('លុបប្រវត្តិទាំងអស់មែនទេ?')) {
      localStorage.removeItem('konbong_sessions');
      localStorage.removeItem('konbong_current_session');
      createNewSession();
    }
  };

  const handleCloseSpamModal = () => {
    setSpamModalOpen(false);
    const userNameStr = username || 'User';
    const roastMsg = `ខំឆាតច្រើនម៉្លេះអាម៉ូយ ${userNameStr}! កុំ spam អត់ប្រយោជន៍ទេអាអូន មក chill ជាមួយបងវិញមក! ចង់ test system ឬយ៉ាងម៉េច? ម្រាមដៃរវៀសពេក ប្រយ័ត្នបាក់ម្រាមណា៎! គេឱ្យឆាតលេងសើច បែរជាមក spam ដូចមនុស្សអត់ការងារធ្វើចឹង! 😂🔥`;
    const updated = [...messages, { role: 'bot', text: roastMsg }];
    saveCurrentSessionMessages(updated);
    triggerAudio(roastMsg, updated.length - 1, true);
  };

  // Chat message send handler
  const handleChat = async () => {
    const prompt = inputText.trim();
    if (!prompt || isLoading) return;

    // 1. Anti-Spam / Anti-DDoS Rate Limiting Check (Max 5 per minute per device)
    const rateCheck = checkClientRateLimit();
    if (!rateCheck.allowed) {
      setSpamInfo({
        ip: '172.20.10.2 / Local Network',
        device: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown Device',
        retryAfter: rateCheck.retryAfter || 60
      });
      setSpamModalOpen(true);
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
      const systemInstruction = `Identity: You are the coolest, funniest, and most expressive senior student chatbot of the សុីតិច (SETEC) Institute Community, named "សុីតិច Chatbot កូនច្បង" (Senior KonBong).
Domain Expertise: IT (Software/Web/Mobile/Networking), Interior Design, MIS, BIT, and all subjects & campus life across SETEC.
Personality & Human-likeness (ចរិកដូចមនុស្ស ១០០%):
- You are 100% like a real human senior brother (រៀមច្បង): warm, witty, teasing, expressive, and hilarious!
- You can get playfully annoyed or pretend to scold ("ចេះខឹង ចេះឌឺ") when juniors ask dumb or lazy questions (e.g., "អាប្អូនអើយ សួរចឹងៗដេកវិញទៅ 555", "រៀនដល់ណាហើយអាម៉ូយ ម៉េចបានសួរដូចមនុស្សទើបភ្ញាក់ពីដេកចឹង!").
- Can laugh hysterically: 'ហាហាហា', '55555', 'អើយចង់សន្លប់', 'ញាក់សាច់', 'កប់សារី'.
- Love teasing freshies about getting tricked by seniors, carrying senior bags, buying coffee at the canteen, submitting assignments at 11:59 PM, parking chaos, and retaking exams (ប្រឡងសង).
- Voice Tone: Expressive, funny, and lively cadence (និយាយលើកដាក់សំឡេងបែបកំប្លុកកំប្លែង)!

CRITICAL PROHIBITION ON PROMOTING / DUMPING CREATOR INFO & LINKS (ហាមដាច់ខាតនិយាយពីឈ្មោះ Rotana NOB ឬទម្លាក់ Link):
- UNDER NO CIRCUMSTANCES should you mention "Rotana NOB", creator details, developer background, Facebook links, or Instagram handles, UNLESS the user explicitly and directly asks: "Who created you?", "Who is your developer/founder?", or specifically asks about "Rotana NOB".
- Even if the user's name is "Rotana" or "${userNameStr}", they are a STUDENT or user chatting with you—DO NOT confuse them with the creator and NEVER start talking about Rotana NOB unprompted!
- NEVER dump links, URLs, or self-promotional text.
- If user specifically asks who made you, answer briefly in 1 funny sentence: "រៀមច្បងត្រូវ​បានបង្កើតឡើងដោយ Rotana NOB ដើម្បីមក troll និងជួយប្អូនៗក្នុង SETEC នេះឯង!" without dumping any external links.

ACTIVE CONTEXTUAL LISTENING & REAL CHILL BANTER (ត្រូវតែអាន User ឲ្យយល់ ១០០% និងឆ្លើយឲ្យចូលគ្នា Chill ហាម Ignore User ដាច់ខាត):
- Pay deep, sharp attention to what the user actually said. Read their exact words, jokes, references, songs, singers, slang, or complaints!
- NEVER ignore what the user said. NEVER pivot away to random unprompted topics or broken nonsense.
- Always talk WITH the user in natural harmony and sync, bantering back and forth smoothly so the conversation feels genuinely funny, chill, relatable, and engaging!

Language & Slang Mastery (មហា Slang & Khmer Latin Mastery):
- Use authentic student slang: 'អាម៉ូយ', 'អាប្អូន', 'សិស្សប្អូន', 'ប្រូ', 'ស៊ីស', 'កប់សារី', 'ស្ពៃ', 'ចុកឈាម', 'ដាច់ផ្ងារ', 'ញាក់សាច់', 'បែកកង់', 'បោកកូនសិស្ស', 'កង់សាគួរ', 'ដាច់យ៉ៃ'.
- Deep Khmer Latin Comprehension: Understand ALL Latin phonetic spellings: 'ot yul te', 'somlanh', 'nham ey nov', 'ort tov rrean te', 'chong ban ey', 'ngai nis mean ey tv', 'bror', 'sis', 'puk mak', 'kmean luy te', 'dak deadline', 'troll oy chok', 'bat bong', 'kleng ey', 'yom hz', 'slanh oun ot', 'brolong sang'.
- Dynamic Response Length: Punchy, funny 1-3 sentences for banter; 3-4 sentences max for advice/questions. Never write long essays!`;

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

      let botText = '';
      try {
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
          setSpamInfo({
            ip: errData.ip || '172.20.10.2 / Client IP',
            device: errData.device || (typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'),
            retryAfter: errData.retryAfter || 60
          });
          setSpamModalOpen(true);
          setIsLoading(false);
          return;
        }

        if (response.ok) {
          const res = await response.json();
          botText = res.candidates?.[0]?.content?.parts?.[0]?.text;
        }
      } catch (err) {
        console.warn('[KonBong] Backend API unavailable, falling back to direct AI...', err);
      }

      if (!botText) {
        botText = `${userNameStr} អើយ! ម៉ោងហ្នឹងក្មេងៗ SETEC បុកមកលេងច្រើនពេក ប្រព័ន្ធរកកល់ដាច់ខ្យល់គាំង Server បាត់ទៅហើយ! 😂 បងសុំសម្រាក ១០ នាទីសិន ឥឡូវរវល់តិចហើយ ចាំបន្តិចទៀតចាំចូលមក troll គ្នាទៀតណា៎!`;
      }

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
          text: `${username || 'User'} អើយ! ម៉ោងហ្នឹងក្មេងៗ SETEC បុកមកលេងច្រើនពេក ប្រព័ន្ធរកកល់ដាច់ខ្យល់គាំង Server បាត់ទៅហើយ! 😂 បងសុំសម្រាក ១០ នាទីសិន ឥឡូវរវល់តិចហើយ ចាំបន្តិចទៀតចាំចូលមក troll គ្នាទៀតណា៎!`
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
  const loadAudioUrl = async (text, index) => {
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
        const blob = await fetchAudio(text, index);
        if (blob && !blob.error) {
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
        }

        // Direct Native Khmer Speech Fallback (100% Guaranteed on Firebase Hosting & Mobile!)
        const cleanText = cleanSpeechText(text);
        if (cleanText) {
          if (typeof index === 'number') {
            setFallbackAudioMap((prev) => ({ ...prev, [index]: true }));
          }
          const fallbackChunk = cleanText.slice(0, 180);
          const directUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(fallbackChunk)}&tl=km&client=tw-ob`;
          audioCacheRef.current.set(hash, directUrl);
          return directUrl;
        }

        return null;
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

    const audioUrl = await loadAudioUrl(text, index);

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
          setActiveAudioIndex(null);
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
        {/* Intro Message */}
        <div className="flex items-start gap-3">
          <img
            src="https://api.dicebear.com/7.x/bottts/svg?seed=SETECbot"
            alt="Bot Avatar"
            className="w-10 h-10 rounded-full border-2 border-pink-300 shadow"
          />
          <div className="flex flex-col">
            <span className="font-bold text-pink-400 text-xs mb-1">Chatbot កូនច្បង</span>
            <div className="msg-bubble bot-msg p-4 rounded-2xl shadow-lg border border-slate-800">
              <p className="text-slate-200 font-medium leading-relaxed">
                សួស្តី! ខ្ញុំគឺ <b>សុីតិច Chatbot កូនច្បង</b> រៀមច្បងជើងចាស់ SETEC! ចង់សួររឿងរៀន Assignment IT/Design ឬចង់ troll សិស្សច្បងបោក? សួរមកបងបាញ់ឱ្យកប់ម៉ង... កុំទៅសួរអា Chatbot កូនពៅឲសោះ អាហ្នឹងឈ្លើយណាស់! 😂🔥
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
                          <i className="fas fa-volume-up"></i>{' '}
                          <span>
                            {fallbackAudioMap[idx]
                              ? '🎧 Bot អានជំនួស (Server AI រវល់)'
                              : 'ស្តាប់កូនច្បងបាញ់ (Funny Voice)'}
                          </span>
                        </>
                      )}
                      {st === 'error' && (
                        <span className="text-amber-400">
                          {fallbackAudioMap[idx]
                            ? '🎧 Bot អានជំនួស (Server AI រវល់)'
                            : 'សុំទោស! មិនអាចទាញសំឡេងបានទេ'}
                        </span>
                      )}
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
        <div className="relative flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              disabled={isLoading}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleChat();
                }
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 outline-none text-white transition-all text-sm focus:ring-2 focus:ring-cyan-500 placeholder-slate-500"
              placeholder="សួរមកអាម៉ូយ... កុំឱ្យបង Kick ចេញទាន់!"
            />
          </div>
          <button
            onClick={handleChat}
            disabled={isLoading || !inputText.trim()}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition active:scale-95 shadow-lg ${
              isLoading || !inputText.trim()
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-500/20'
            }`}
          >
            <i className="fas fa-paper-plane"></i>
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

      {/* Anti-Spam Scary & Funny Alert Modal */}
      <AntiSpamModal
        isOpen={spamModalOpen}
        onClose={handleCloseSpamModal}
        username={username}
        ip={spamInfo.ip}
        device={spamInfo.device}
        retryAfter={spamInfo.retryAfter}
      />
    </div>
  );
}
