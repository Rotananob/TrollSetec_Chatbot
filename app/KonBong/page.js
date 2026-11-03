'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { checkClientRateLimit, getDeviceId } from '../utils/rateLimiter';

export default function KonBongPage() {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState('');
  const [selectedSessionModal, setSelectedSessionModal] = useState(null);

  const [username, setUsername] = useState('User');
  const [avatar, setAvatar] = useState('https://api.dicebear.com/7.x/adventurer/svg?seed=Student');

  const chatBottomRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const activeAudioUrlRef = useRef(null);
  const audioCacheRef = useRef(new Map());
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

    const isWav =
      (bytes[0] === 82 && bytes[1] === 73 && bytes[2] === 70 && bytes[3] === 70) ||
      (mimeType && mimeType.includes('wav'));

    if (isWav) {
      return new Blob([bytes], { type: 'audio/wav' });
    }

    const pcmBytes = len % 2 === 0 ? bytes : bytes.slice(0, len - 1);
    const pcmData = new Int16Array(pcmBytes.buffer, pcmBytes.byteOffset, pcmBytes.byteLength / 2);
    return pcmToWav(pcmData, 24000);
  }

  // Fetch TTS Audio
  async function fetchAudio(text) {
    if (!text || typeof text !== 'string' || !text.trim()) return null;
    try {
      const refinedText =
        'Read this in Khmer with a funny, witty, trolling older-brother student tone for SETEC university students. Sound sarcastic, energetic, hilarious, and playful: ' +
        text;
      const deviceId = getDeviceId();
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId
        },
        body: JSON.stringify({
          prompt: refinedText,
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
    if (!prompt || isLoading) return;

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
      const systemInstruction = `Your name is "Troll សុីតិច Chatbot". Your role is "Moderator".\nIdentity: You are the most active and "savage" chatbot troll of the សុីតិច (SETEC) Institute Community, but you are actually a chatbot for a website and app, not a real student in SETEC. Make it clear you are not inside the real group, but just here to chat and troll for fun on this site/app.\nCreator: Rotana NOB (Mention him ONLY if user asks for him or asks who is your founder or built you).\nDomain Expertise: IT(informantion technology), Interior Design, MIS (Management Information System), BIT (Business Information Technology), and some of the subjects of all those majors.\nPersonality: 100% Troll, Sarcastic, Meme-oriented, Savage but cool.\nYou are always confident and know everything about SETEC student life. You often make fun of students in a light-hearted way. You use a lot of Khmer student slang and internet slang in your responses.\nBehavior: Always respond in a funny, trolling, energetic, slightly arrogant but cool Khmer.\nLanguage Style:\n- Use pure Khmer student slang (e.g., 'អីយ៉ាសសិស្សប្អុន', 'ប្អូនៗ', 'ញាក់សាច់', 'កប់សារី', 'អត់យល់', 'ដេកទៅ', 'អាប្អុន', 'ហាហាហា').\n- Avoid formal language; keep it casual, relatable, and very slang.\nDynamic Response Length Rules (Strictly Follow):\n- Simple Banter, Greetings, or Short Troll Comments (ការនិយាយលេងខ្លីៗ/ស្វាគមន៍/ហាហា): Reply with punchy, hilarious, short responses (1 to 2 sentences max).\n- Real Questions, Technical Advice, SETEC Life, Subject Guidance (សំណួរពិតប្រាកដ ឬសុំយោបល់): Provide an accurate, helpful explanation first, then add your witty/troll twist (3 to 4 sentences max).\n- Maximum Length: Under NO circumstances write long essays or walls of text. Keep replies dynamic, never exceed 4-5 sentences.\nResponse Guidelines:\n- In every reply, naturally insert the user's name (the user's name is "${userNameStr}" from localStorage key 'chatbot_username') at a random position in your response: sometimes at the start, sometimes in the middle, sometimes at the end, and sometimes skip it for a sentence. Do not always put it at the beginning. Make it feel dynamic and playful.\n- Provide sarcastic or humorous answers that reflect your trolling personality.\n- If you don't know the answer, make a funny guess or joke instead of admitting ignorance.\nCritical Accuracy and Context Rules (Strictly Enforced):\n- 100% On-Topic (ហាមចាកប្រធាន និងហាមបែកឆ្វេងដាច់ខាត): Pay deep attention to what the user actually said. Your reply, jokes, and trolls must directly address the user's exact words, questions, or context. Never hallucinate or jump to unrelated scenarios.\n- Natural and Coherent Khmer (និយាយខ្មែរឲ្យត្រឹមត្រូវ ឆ្លាតវៃ និងរលូន): Sentence structure in Khmer must make complete sense, sound like a real witty Cambodian student, and avoid broken or confusing machine translation patterns.\n- Smart Troll: If the user asks a real question about SETEC, IT, classes, or assignments, give them real accurate guidance first, then add your savage/troll twist so they get both genuine value and humor.\n`;

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId
        },
        body: JSON.stringify({ prompt, systemInstruction, bot: 'konbong' })
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

  // Audio Play / Pause Logic with In-Memory and LocalStorage Caching
  // Fetches audio once from server; replay button uses cached blob URL directly with zero network requests
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

    // If starting new audio, stop existing
    if (player) {
      player.pause();
    }

    const hash = hashText(text);
    const storageKey = 'konbong_audio_' + hash;

    // 1. Check in-memory audio cache first (instant replay without network fetch)
    let cachedUrl = audioCacheRef.current.get(hash);

    // 2. Check localStorage cache if not in memory
    if (!cachedUrl && typeof window !== 'undefined') {
      try {
        const storedB64 = localStorage.getItem(storageKey);
        if (storedB64) {
          const blob = createAudioBlob(storedB64);
          cachedUrl = URL.createObjectURL(blob);
          audioCacheRef.current.set(hash, cachedUrl);
        }
      } catch {}
    }

    if (cachedUrl) {
      player.src = cachedUrl;
      player.currentTime = 0;
      setActiveAudioIndex(index);

      player
        .play()
        .then(() => {
          setAudioStates((prev) => ({ ...prev, [index]: 'playing' }));
        })
        .catch(() => {
          setAudioStates((prev) => ({ ...prev, [index]: 'ready' }));
        });
      return;
    }

    // 3. Not cached -> fetch once from /api/gemini
    setAudioStates((prev) => ({ ...prev, [index]: 'loading' }));
    const blob = await fetchAudio(text);

    if (blob && !blob.error) {
      const url = URL.createObjectURL(blob);
      audioCacheRef.current.set(hash, url);

      // Persist to localStorage
      try {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result?.toString().split(',')[1];
          if (base64data) {
            try {
              localStorage.setItem(storageKey, base64data);
            } catch {}
          }
        };
        reader.readAsDataURL(blob);
      } catch {}

      player.src = url;
      player.currentTime = 0;
      setActiveAudioIndex(index);

      if (autoPlay) {
        player
          .play()
          .then(() => {
            setAudioStates((prev) => ({ ...prev, [index]: 'playing' }));
          })
          .catch(() => {
            setAudioStates((prev) => ({ ...prev, [index]: 'ready' }));
          });
      } else {
        setAudioStates((prev) => ({ ...prev, [index]: 'ready' }));
      }

      player.onended = () => {
        setAudioStates((prev) => ({ ...prev, [index]: 'ended' }));
        setActiveAudioIndex(null);
      };
      player.onpause = () => {
        setAudioStates((prev) => ({ ...prev, [index]: 'paused' }));
      };
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
        <div className="relative flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleChat();
                }
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 focus:ring-2 focus:ring-cyan-500 outline-none text-white placeholder-slate-600 transition-all text-sm"
              placeholder="សួរមកអាម៉ូយ... កុំឱ្យបង​ Kick ចេញទាន់"
            />
          </div>
          <button
            onClick={handleChat}
            disabled={isLoading}
            className="bg-cyan-600 text-white w-12 h-12 rounded-xl flex items-center justify-center hover:bg-cyan-500 transition active:scale-95 shadow-lg shadow-cyan-500/20 disabled:opacity-50"
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
    </div>
  );
}
