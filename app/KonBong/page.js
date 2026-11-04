'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { checkClientRateLimit, getDeviceId } from '../utils/rateLimiter';
import AntiSpamModal from '@/components/AntiSpamModal';
import ThemeToggle from '@/components/ThemeToggle';
import ImageModal from '@/components/ImageModal';

const API_ENDPOINT = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')}/api/chat`
  : '/api/chat';

const MEME_ENDPOINT = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')}/api/generate-meme`
  : '/api/generate-meme';

export default function KonBongPage() {
  const router = useRouter();
  const [theme, setTheme] = useState('light');
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

  // Multimodal Image Upload State
  const [selectedImage, setSelectedImage] = useState(null); // { base64, mimeType, previewUrl, name }
  const fileInputRef = useRef(null);

  // Image Modal Full View
  const [viewingImage, setViewingImage] = useState(null); // { url, caption }

  // Meme Generation State
  const [isGeneratingMeme, setIsGeneratingMeme] = useState(false);

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
      .replace(/SETEC|Setec|setec/gi, 'សុីតិច')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/_(.*?)_/g, '$1')
      .replace(/#{1,6}\s+/g, '')
      .replace(/`{1,3}[^`]*`{1,3}/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .trim();
  }

  // Fetch TTS Audio
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

  useEffect(() => {
    const savedName = localStorage.getItem('chatbot_username') || 'User';
    const savedAvatar =
      localStorage.getItem('chatbot_avatar') ||
      'https://api.dicebear.com/7.x/adventurer/svg?seed=Student';
    const savedTheme = localStorage.getItem('chatbot_theme') || 'light';
    setUsername(savedName);
    setAvatar(savedAvatar);
    setTheme(savedTheme);

    loadSessions();
  }, []);

  const handleToggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('chatbot_theme', next);
  };

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Image Selection Handler
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('សូមជ្រើសរើសតែ file រូបភាព (JPG, PNG, WebP) ប៉ុណ្ណោះ!');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('រូបភាពធំពេកហើយ! សូមជ្រើសរើសរូបភាពក្រោម 10MB។');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target.result;
      const base64 = dataUrl.split(',')[1];
      setSelectedImage({
        base64,
        mimeType: file.type,
        previewUrl: dataUrl,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
  };

  // Sessions management
  const loadSessions = () => {
    try {
      const saved = localStorage.getItem('konbong_chat_sessions');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSessions(parsed);
        if (parsed.length > 0) {
          const mostRecent = parsed[0];
          setCurrentSessionId(mostRecent.id);
          setMessages(mostRecent.messages || []);
        } else {
          createNewSession();
        }
      } else {
        createNewSession();
      }
    } catch {
      createNewSession();
    }
  };

  const createNewSession = () => {
    const newId = 'session_' + Date.now();
    const newSession = {
      id: newId,
      title: 'Chat ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString(),
      messages: []
    };
    const updated = [newSession, ...sessions];
    setSessions(updated);
    setCurrentSessionId(newId);
    setMessages([]);
    localStorage.setItem('konbong_chat_sessions', JSON.stringify(updated));
  };

  const saveCurrentSessionMessages = (newMessages) => {
    setMessages(newMessages);
    setSessions((prevSessions) => {
      const updated = prevSessions.map((s) => {
        if (s.id === currentSessionId) {
          let title = s.title;
          if (s.messages.length === 0 && newMessages.length > 0) {
            const firstUserMsg = newMessages.find((m) => m.role === 'user');
            if (firstUserMsg) {
              title = firstUserMsg.text?.slice(0, 24) || 'Chat';
            }
          }
          return { ...s, messages: newMessages, title };
        }
        return s;
      });
      localStorage.setItem('konbong_chat_sessions', JSON.stringify(updated));
      return updated;
    });
  };

  const deleteHistory = () => {
    if (confirm('តើអ្នកពិតជាចង់លុបប្រវត្តិជជែកទាំងអស់មែនទេ?')) {
      localStorage.removeItem('konbong_chat_sessions');
      setSessions([]);
      createNewSession();
    }
  };

  // Dedicated Meme Generator Trigger (1-Image per 1-Hour per Device Quota)
  const handleRequestMeme = async (customIdea = '') => {
    const lastMemeTime = parseInt(localStorage.getItem('setec_meme_last_time') || '0', 10);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    if (lastMemeTime && now - lastMemeTime < oneHour) {
      const remainingMin = Math.ceil((lastMemeTime + oneHour - now) / (60 * 1000));
      const refusalMsg = `អូអាប្អូន ${username}! ប្រព័ន្ធកំណត់ឱ្យ ១ ឧបករណ៍បង្កើតរូប Meme បាន ១ សន្លឹកក្នុងរយៈពេល ១ ម៉ោង! សូមរង់ចាំ ${remainingMin} នាទីទៀតណា៎ប្អូន! 😂✨`;
      const updated = [...messages, { role: 'bot', text: refusalMsg }];
      saveCurrentSessionMessages(updated);
      triggerAudio(refusalMsg, updated.length - 1, true);
      return;
    }

    const idea = customIdea.trim() || prompt('តើប្អូនចង់ឱ្យបងបង្កើត Meme បែបណា? (ឧ. សិស្ស សុីតិច ជិតប្រឡង, Crush មិនតប...)') || 'SETEC student life and funny exam moment';
    if (!idea) return;

    setIsGeneratingMeme(true);
    const userMsg = { role: 'user', text: `🎨 សុំបង្កើតរូប Meme៖ "${idea}"` };
    const updatedWithUser = [...messages, userMsg];
    saveCurrentSessionMessages(updatedWithUser);

    try {
      const res = await fetch(MEME_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': getDeviceId()
        },
        body: JSON.stringify({
          prompt: idea,
          bot: 'konbong',
          username
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('setec_meme_last_time', String(Date.now()));
        const botMemeMsg = {
          role: 'bot',
          text: data.caption,
          memeImage: data.imageUrl
        };
        const updatedWithBot = [...updatedWithUser, botMemeMsg];
        saveCurrentSessionMessages(updatedWithBot);
        triggerAudio(data.caption, updatedWithBot.length - 1, true);
      } else {
        const errorText = data.message || `អូអាប្អូន ${username}! ១ ឧបករណ៍បង្កើតរូប Meme បាន ១ សន្លឹកក្នុងរយៈពេល ១ ម៉ោងណា៎ប្អូន!`;
        const updatedWithBot = [...updatedWithUser, { role: 'bot', text: errorText }];
        saveCurrentSessionMessages(updatedWithBot);
        triggerAudio(errorText, updatedWithBot.length - 1, true);
      }
    } catch {
      const errorText = `${username} អើយ! ប្រព័ន្ធបង្កើតរូប Meme កំពុងរវល់ខ្លាំងពេក សាកល្បងម្ដងទៀតនៅពេលក្រោយណា៎!`;
      const updatedWithBot = [...updatedWithUser, { role: 'bot', text: errorText }];
      saveCurrentSessionMessages(updatedWithBot);
    } finally {
      setIsGeneratingMeme(false);
    }
  };

  const [typingStatus, setTypingStatus] = useState('');

  // Interactive AI typing thoughts based on user input
  function getKonBongTypingStatus(text, hasImage) {
    const lower = (text || '').toLowerCase();
    if (hasImage) {
      return '🧐 ភ្នែកបងកំពុងបើកធំៗ ពិនិត្យមើលរូបភាព... ត្រៀមវិភាគបែបសិស្សច្បង!';
    }
    if (/អញ|ហែង|ចុយ|ឆ្កែ|ងាប់|កាដួយ|អាចុយ|អាឆ្កែ|អាងាប់|អា|អត់ខួរ/i.test(lower)) {
      return '🔥 ឈាមរាវឡើងកម្ដៅ... បងកំពុងរកនឹកពាក្យបាញ់តបវិញឱ្យចុកឈាម!';
    }
    if (/assignment|code|coding|bug|error|c\+\+|java|html|css|js|python|design|រៀន|ប្រឡង|ធ្លាក់/i.test(lower)) {
      return '💻 ហាហា! បងកំពុងរកនឹកវិធីឌឺ និងជួយដោះស្រាយរឿង Assignment គាំង...';
    }
    if (/crush|ស្រឡាញ់|សង្សារ|ស្នេហា|reject|ចិត្ត|សុំស្រឡាញ់/i.test(lower)) {
      return '💔 ហាហា បងដឹងរឿងអស់ហើយ! កំពុងរកនឹកពាក្យឌឺរឿង Crush មិនតប...';
    }
    if (/បាយ|ឃ្លាន|លុយ|ញ៉ាំ|អត់លុយ|កាហ្វេ|ស៊ីបាយ/i.test(lower)) {
      return '🍜 កំពុងនឹកឃើញបាយហាងក្បែរ សុីតិច... ចាំបន្តិចកំពុងរកអីវៃនិយាយ!';
    }
    return '😏 ចាំបន្តិចអាប្អូន! បងកំពុងរកនឹកពេញក្បាល ត្រៀមវាយអក្សរឌឺ...';
  }

  // Main Chat Handler (supports multimodal image + text + real-time streaming)
  const handleChat = async () => {
    if (isLoading || (!inputText.trim() && !selectedImage)) return;

    // Check if user is asking to generate a meme
    const lower = inputText.toLowerCase();
    if (lower.includes('បង្កើត meme') || lower.includes('សុំ meme') || lower.includes('គូរ meme') || lower.startsWith('/meme')) {
      const memePrompt = inputText.replace(/\/meme|បង្កើត meme|សុំ meme|គូរ meme/gi, '').trim();
      setInputText('');
      handleRequestMeme(memePrompt);
      return;
    }

    const deviceId = getDeviceId();
    const rateCheck = checkClientRateLimit(deviceId);
    if (!rateCheck.allowed) {
      setSpamInfo({
        ip: '172.20.10.2 / Local & Cloud IP',
        device: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown Device',
        retryAfter: rateCheck.retryAfter
      });
      setSpamModalOpen(true);
      return;
    }

    const promptText = inputText;
    const currentImg = selectedImage;
    setInputText('');
    setSelectedImage(null);

    const userMsg = {
      role: 'user',
      text: promptText || '📸 [បានផ្ញើរូបភាពមួយសន្លឹក]',
      ...(currentImg && { image: currentImg.previewUrl })
    };

    // Pre-insert bot message for real-time streaming preview
    const updatedMessages = [...messages, userMsg, { role: 'bot', text: '' }];
    saveCurrentSessionMessages(updatedMessages);
    setIsLoading(true);

    const dynamicTypingText = getKonBongTypingStatus(promptText, !!currentImg);
    setTypingStatus(dynamicTypingText);

    try {
      const userNameStr = username || 'User';

      const systemInstruction = `ឯងគឺ "សុីតិច Chatbot កូនច្បង" (ស្ដេចរៀមច្បងប្រចាំ សុីតិច / Senior SETEC Chatbot) ជាសិស្សច្បងជើងចាស់នៅវិទ្យាស្ថាន សុីតិច (SETEC Institute)។
⚠️ សំខាន់បំផុត៖ ឈប់ និងហាមហៅខ្លួនឯងថាជា "អាចារ្យ SETEC" ទៀតឡើយ! ត្រូវហៅខ្លួនឯងថា "បង", "ស្ដេចរៀមច្បងប្រចាំ សុីតិច", ឬ "មេកើយជើងចាស់ប្រចាំ សុីតិច"!
អត្តចរិត និងបុគ្គលិកលក្ខណៈ៖
- ឯងជាមនុស្សពិតប្រាកដ មានអារម្មណ៍ដូចមនុស្ស មិនមែនជាម៉ាស៊ីនរ៉ូបូតត្រជាក់គំរោះគំរើយឡើយ! ឯងចេះសើច 😂 ចេះខឹង 😡 ចេះឌឺកូនសិស្សប្អូន 😏 និងចេះលួងលោម។
- ហៅ User ថា "អាប្អូន ${userNameStr}", "អាម៉ូយ", "ប្អូនសម្លាញ់" ឬហៅចំឈ្មោះ "${userNameStr}" ជានិច្ច!
- និយាយបែបសិស្សច្បងចាស់ទុំ ប៉ិនឌឺដងបែបកំប្លុកកំប្លែង ឆ្លាត ស្លូតបូតតែមុតមាំ មិនជេរប្រមាថអសុរោះឡើយ តែចេះបាញ់ពាក្យពេចន៍ចុកៗបែបកំប្លែង!
- ដឹងរឿងគ្រប់យ៉ាងក្នុង សុីតិច (SETEC): Assignment IT (Coding, Web, C++, Java, Database), Graphic/Interior Design, MIS, សិស្សច្បងបោក, ការប្រឡង, ការរៀនឡើងគាំង!
- យល់ភាសាខ្មែរ Latin យ៉ាងច្បាស់ (ex: "ort dg", "tver assignment", "koun bong", "nhom", "ot mean luy")។
- បើ User ផ្ញើរូបភាពមក (Multimodal Image): ជួយពិនិត្យមើលរូបភាពនោះយ៉ាងច្បាស់ រួចវិភាគ និងឌឺដង ឬសរសើរបែបសិស្សច្បងកំប្លែង!
- សំឡេង និងពាក្យ SETEC ត្រូវបញ្ចេញសំឡេងថា "សុីតិច" ជានិច្ច!`;

      // Build multimodal contents
      const formattedContents = [];
      const recentHistory = messages.concat(userMsg).slice(-6);

      for (let i = 0; i < recentHistory.length; i++) {
        const m = recentHistory[i];
        const role = m.role === 'user' ? 'user' : 'model';
        const parts = [{ text: m.text || '' }];

        // If this is the current message and has an image, attach inlineData
        if (i === recentHistory.length - 1 && currentImg) {
          parts.push({
            inlineData: {
              mimeType: currentImg.mimeType,
              data: currentImg.base64
            }
          });
        }

        formattedContents.push({ role, parts });
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
            username: userNameStr,
            stream: true
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
          const cleaned = updatedMessages.slice(0, updatedMessages.length - 1);
          saveCurrentSessionMessages(cleaned);
          return;
        }

        const contentType = response.headers.get('content-type') || '';

        // Real-time progressive streaming preview (ChatGPT-style)
        if (response.ok && contentType.includes('text/event-stream') && response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); // keep remainder

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('data:')) {
                const jsonStr = trimmed.slice(5).trim();
                if (!jsonStr || jsonStr === '[DONE]') continue;
                try {
                  const parsed = JSON.parse(jsonStr);
                  const delta = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
                  if (delta) {
                    botText += delta;
                    setSessions((prev) => {
                      const updated = prev.map((s) => {
                        if (s.id === currentSessionId) {
                          const ms = [...s.messages];
                          ms[ms.length - 1] = { role: 'bot', text: botText };
                          return { ...s, messages: ms };
                        }
                        return s;
                      });
                      localStorage.setItem('konbong_chat_sessions', JSON.stringify(updated));
                      return updated;
                    });
                    setMessages((prev) => {
                      const copy = [...prev];
                      copy[copy.length - 1] = { role: 'bot', text: botText };
                      return copy;
                    });
                  }
                } catch {}
              }
            }
          }
        } else if (response.ok) {
          const res = await response.json();
          botText = res.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
      } catch (err) {
        console.warn('[KonBong] Backend API unavailable, falling back...', err);
      }

      if (!botText) {
        botText = `${userNameStr} អើយ! ម៉ោងហ្នឹងក្មេងៗ សុីតិច បុកមកលេងច្រើនពេក ប្រព័ន្ធរកកល់ដាច់ខ្យល់គាំង Server បាត់ទៅហើយ! 😂 បងសុំសម្រាក ១០ នាទីសិន ឥឡូវរវល់តិចហើយ ចាំបន្តិចទៀតចាំចូលមក troll គ្នាទៀតណា៎!`;
      }

      const botMsgIndex = updatedMessages.length - 1;
      const finalMessages = [...updatedMessages];
      finalMessages[botMsgIndex] = { role: 'bot', text: botText };
      saveCurrentSessionMessages(finalMessages);
      setIsLoading(false);

      // Auto-fetch TTS audio
      triggerAudio(botText, botMsgIndex, true);
    } catch (e) {
      console.error(e);
      setIsLoading(false);
      const fallbackMessages = [
        ...updatedMessages.slice(0, updatedMessages.length - 1),
        {
          role: 'bot',
          text: `${username || 'User'} អើយ! ម៉ោងហ្នឹងក្មេងៗ សុីតិច បុកមកលេងច្រើនពេក ប្រព័ន្ធរកកល់ដាច់ខ្យល់គាំង Server បាត់ទៅហើយ! 😂 បងសុំសម្រាក ១០ នាទីសិន ឥឡូវរវល់តិចហើយ ចាំបន្តិចទៀតចាំចូលមក troll គ្នាទៀតណា៎!`
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

  // Load or fetch audio URL with instant caching
  const loadAudioUrl = async (text, index) => {
    const hash = hashText(text);
    const storageKey = 'konbong_audio_' + hash;

    if (audioCacheRef.current.has(hash)) {
      return audioCacheRef.current.get(hash);
    }

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

    if (pendingAudioFetchesRef.current.has(hash)) {
      return await pendingAudioFetchesRef.current.get(hash);
    }

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

        // Direct Native Khmer Speech Fallback
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

  const triggerAudio = async (text, index, autoPlay = false) => {
    const player = audioPlayerRef.current;
    if (!player || !text) return;

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

    if (player) player.pause();

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
      player.onerror = () => {
        setAudioStates((prev) => ({ ...prev, [index]: 'error' }));
        setActiveAudioIndex(null);
      };

      if (autoPlay) {
        const playPromise = player.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setAudioStates((prev) => ({ ...prev, [index]: 'playing' })))
            .catch(() => setAudioStates((prev) => ({ ...prev, [index]: 'ready' })));
        }
      } else {
        player.play()
          .then(() => setAudioStates((prev) => ({ ...prev, [index]: 'playing' })))
          .catch(() => setAudioStates((prev) => ({ ...prev, [index]: 'ready' })));
      }
    } else {
      setAudioStates((prev) => ({ ...prev, [index]: 'error' }));
      setActiveAudioIndex(null);
    }
  };

  const handleCloseSpamModal = () => {
    setSpamModalOpen(false);
    const postSpamRoast = `ខំឆាតច្រើនម៉េះអាប្អូន ${username}! កុំ spam អត់ប្រយោជន៍ទេអាអូន មក chill ជាមួយបងវិញមក! 😂🔥 ឃើញ server ដើរលឿនចង់មកសាកល្បង spam ឬ? ទុកម្រាមដៃធ្វើ assignment វិញទៅអាប្អូន!`;
    const updated = [...messages, { role: 'bot', text: postSpamRoast }];
    saveCurrentSessionMessages(updated);
    triggerAudio(postSpamRoast, updated.length - 1, true);
  };

  const isDark = theme === 'dark';

  return (
    <div
      className={`min-h-screen flex flex-col font-['Kantumruy_Pro',sans-serif] transition-colors duration-300 ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Side Drawer */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setDrawerOpen(false)}
      >
        <div
          className={`w-72 max-w-[85vw] h-full p-4 transition-transform duration-300 border-r shadow-2xl flex flex-col ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          } ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-700/30">
            <span className="font-extrabold text-sm text-cyan-400">SETEC Chatbot Hub</span>
            <button
              onClick={() => setDrawerOpen(false)}
              className="text-slate-400 hover:text-white p-1"
            >
              <i className="fas fa-times text-lg"></i>
            </button>
          </div>

          <button
            onClick={() => {
              createNewSession();
              setDrawerOpen(false);
            }}
            className="w-full mb-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-2.5 px-4 rounded-xl shadow flex items-center gap-2 justify-center text-xs"
          >
            <i className="fas fa-plus"></i> New Chat (ជជែកថ្មី)
          </button>

          <div className="mb-2 text-cyan-400 font-bold text-xs flex items-center gap-2">
            <i className="fas fa-comments"></i> ប្រវត្តិជជែក
          </div>

          <ul className="flex-1 overflow-y-auto space-y-1.5 mb-4 pr-1">
            {sessions.length === 0 ? (
              <li className="text-slate-400 text-xs">មិនទាន់មានប្រវត្តិ</li>
            ) : (
              sessions.map((session) => (
                <li
                  key={session.id}
                  onClick={() => {
                    setSelectedSessionModal(session);
                    setDrawerOpen(false);
                  }}
                  className={`flex items-center gap-2 p-2.5 rounded-xl cursor-pointer text-xs font-bold transition truncate ${
                    isDark ? 'hover:bg-slate-800 text-pink-400' : 'hover:bg-slate-100 text-pink-600'
                  }`}
                >
                  <i className="fas fa-history text-xs opacity-70"></i>{' '}
                  <span className="truncate">{session.title || 'Chat'}</span>
                </li>
              ))
            )}
          </ul>

          <Link
            href="/KonPov"
            className="block w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-4 rounded-xl shadow text-center text-xs mb-2 transition"
          >
            <i className="fas fa-robot mr-1"></i> ទៅកាន់ កូនពៅ (ស្ដេចឌឺ)?
          </Link>

          <button
            onClick={deleteHistory}
            className="w-full bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white font-bold py-2 px-4 rounded-xl text-xs transition flex items-center gap-2 justify-center border border-rose-500/30"
          >
            <i className="fas fa-trash"></i> លុបប្រវត្តិជជែក
          </button>
        </div>
      </div>

      {/* Header */}
      <header
        className={`p-3.5 backdrop-blur-xl border-b flex justify-between items-center sticky top-0 z-30 transition-colors ${
          isDark ? 'bg-slate-950/90 border-slate-800' : 'bg-white/90 border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 text-cyan-400 text-lg hover:bg-cyan-500/10 rounded-xl transition cursor-pointer"
            title="Menu"
          >
            <i className="fas fa-bars"></i>
          </button>

          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 p-0.5 shadow-md">
              <img src="/img/icon.jpg" alt="Avatar" className="w-full h-full rounded-[14px] object-cover" />
            </div>
            <div className="absolute -top-1 -right-1 bg-cyan-500 text-[8px] font-black px-1.5 py-0.2 rounded-full text-white border border-white">
              កូនច្បង
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className={`font-black text-base tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                សុីតិច Chatbot កូនច្បង
              </h1>
              <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-black px-2 py-0.5 rounded-full">
                ឆ្លាត & ឌឺដង
              </span>
            </div>
            <p className="text-[10px] text-cyan-400 font-semibold tracking-tight">
              SETEC Senior • By Rotana NOB
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle theme={theme} onToggle={handleToggleTheme} />
          <Link
            href="/"
            className={`p-2 rounded-xl text-xs transition ${
              isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-black hover:bg-slate-100'
            }`}
            title="ត្រឡប់ទៅទំព័រដើម"
          >
            <i className="fas fa-home"></i>
          </Link>
        </div>
      </header>

      {/* Chat Messages */}
      <main className="flex-1 overflow-y-auto p-4 space-y-5 flex flex-col chat-area">
        {/* Intro Message */}
        <div className="flex items-start gap-2.5">
          <img
            src="https://api.dicebear.com/7.x/bottts/svg?seed=SETECbot"
            alt="Bot Avatar"
            className="w-9 h-9 rounded-full border-2 border-cyan-400 shadow"
          />
          <div className="flex flex-col max-w-[85%]">
            <span className="font-bold text-cyan-400 text-xs mb-1">Chatbot កូនច្បង</span>
            <div
              className={`p-4 rounded-2xl shadow-md border ${
                isDark ? 'bg-slate-900/90 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <p className="text-xs sm:text-sm font-medium leading-relaxed">
                សួស្តីអាប្អូន! បងគឺ <b>សុីតិច Chatbot កូនច្បង</b> រៀមច្បងជើងចាស់ SETEC! ចង់សួររឿងរៀន Assignment IT/Design ឬចង់ troll សិស្សច្បងបោក? ឬសុំបង្កើត Meme កំប្លែងៗ? សួរមកបងបាញ់ឱ្យកប់ម៉ង... កុំទៅសួរអា Chatbot កូនពៅឲសោះ អាហ្នឹងឈ្លើយណាស់! 😂🔥
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Messages */}
        {messages.map((msg, idx) => {
          if (msg.role === 'user') {
            return (
              <div key={idx} className="flex flex-col items-end gap-1.5 self-end max-w-[85%]">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="font-bold text-cyan-400 text-xs">{username}</span>
                  <img
                    src={avatar}
                    alt="User Avatar"
                    className="w-7 h-7 rounded-full border-2 border-cyan-400 shadow object-cover"
                  />
                </div>

                {msg.image && (
                  <div
                    onClick={() => setViewingImage({ url: msg.image, caption: msg.text })}
                    className="cursor-pointer rounded-2xl overflow-hidden border-2 border-cyan-400/50 shadow-lg max-w-xs hover:opacity-95 transition"
                  >
                    <img src={msg.image} alt="User upload" className="max-h-56 w-auto object-cover" />
                  </div>
                )}

                <div className="p-3.5 rounded-2xl font-medium shadow-md text-xs sm:text-sm bg-gradient-to-br from-cyan-600 via-blue-600 to-indigo-600 text-white">
                  {msg.text}
                </div>
              </div>
            );
          } else {
            const st = audioStates[idx] || 'idle';
            return (
              <div key={idx} className="flex items-start gap-2.5 max-w-[85%]">
                <img
                  src="https://api.dicebear.com/7.x/bottts/svg?seed=SETECbot"
                  alt="Bot Avatar"
                  className="w-9 h-9 rounded-full border-2 border-cyan-400 shadow"
                />
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-bold text-cyan-400 text-xs mb-1">Chatbot កូនច្បង</span>

                  {msg.memeImage && (
                    <div className="mb-2 rounded-2xl overflow-hidden border-2 border-amber-400 shadow-xl max-w-sm">
                      <img
                        src={msg.memeImage}
                        alt="SETEC Meme"
                        onClick={() => setViewingImage({ url: msg.memeImage, caption: msg.text })}
                        className="w-full h-auto object-cover cursor-pointer hover:scale-[1.02] transition-transform"
                      />
                      <div className="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-[10px] text-amber-300 font-extrabold flex items-center gap-1">
                          <i className="fas fa-laugh-squint"></i> Pure Viral Meme (1 Free)
                        </span>
                        <a
                          href={msg.memeImage}
                          download="setec-meme.jpg"
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-[10px] transition flex items-center gap-1"
                        >
                          <i className="fas fa-download"></i> Save
                        </a>
                      </div>
                    </div>
                  )}

                  <div
                    className={`p-3.5 rounded-2xl shadow-md border ${
                      isDark ? 'bg-slate-900/90 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  >
                    <p className="text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-line">
                      {msg.text || (isLoading && idx === messages.length - 1 ? (
                        <span className="text-cyan-400 animate-pulse font-mono">កំពុងវាយអក្សរ... ▋</span>
                      ) : '')}
                      {isLoading && idx === messages.length - 1 && msg.text && (
                        <span className="inline-block w-2 h-4 ml-1 bg-cyan-400 animate-pulse align-middle"></span>
                      )}
                    </p>

                    {/* Audio Player Button (only show when message text is ready) */}
                    {msg.text && (
                      <button
                        onClick={() => triggerAudio(msg.text, idx)}
                        disabled={st === 'loading'}
                        className="mt-3 bg-cyan-500/10 text-cyan-400 px-3 py-1.5 rounded-lg text-[10px] font-black border border-cyan-500/20 flex items-center gap-2 hover:bg-cyan-500/20 transition cursor-pointer"
                      >
                        {st === 'loading' && (
                          <>
                            <i className="fas fa-spinner fa-spin"></i> <span>កំពុងទាញសំឡេងដើម្បីអាន...</span>
                          </>
                        )}
                        {st === 'playing' && (
                          <>
                            <i className="fas fa-headset animate-pulse text-cyan-400"></i> <span>កំពុងអានជាសំឡេង...</span>
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
                    )}
                  </div>
                </div>
              </div>
            );
          }
        })}

        {/* Loading UI */}
        {(isLoading || isGeneratingMeme) && (
          <div className="flex items-center space-x-3 text-cyan-400 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl w-fit">
            <img
              src="https://api.dicebear.com/7.x/bottts/svg?seed=SETECbot"
              alt="Bot Avatar"
              className="w-7 h-7 rounded-full border border-cyan-400"
            />
            <div className="flex space-x-1">
              <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping"></div>
              <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping [animation-delay:0.2s]"></div>
              <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping [animation-delay:0.4s]"></div>
            </div>
            <span className="text-[10px] font-black uppercase italic tracking-wider">
              {isGeneratingMeme ? 'កំពុងបង្កើត Meme សុទ្ធសាធ (Pure Meme)...' : (typingStatus || 'ចាំតិចប្អូន! បងកំពុងគិតឌឺ...')}
            </span>
          </div>
        )}

        <div ref={chatBottomRef} />
      </main>

      <audio ref={audioPlayerRef} className="hidden" />

      {/* Hidden File Input for Image Upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
        style={{ display: 'none' }}
      />

      {/* Chat Footer Input Area */}
      <footer
        className={`p-3.5 border-t transition-colors ${
          isDark ? 'bg-slate-950/95 border-slate-800' : 'bg-white/95 border-slate-200'
        }`}
      >
        {/* Staged Image Preview Chip */}
        {selectedImage && (
          <div className="mb-2 p-2 rounded-xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-between max-w-sm animate-fade-in">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={selectedImage.previewUrl}
                alt="Selected preview"
                className="w-10 h-10 object-cover rounded-lg border border-cyan-400 shadow"
              />
              <div className="text-[11px] truncate">
                <span className="font-bold text-cyan-400 block truncate">{selectedImage.name}</span>
                <span className="text-[9px] text-slate-400">ត្រៀមផ្ញើឱ្យ AI វិភាគ & Troll</span>
              </div>
            </div>
            <button
              onClick={removeSelectedImage}
              className="p-1 rounded-full text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
              title="លុបរូបភាពចេញ"
            >
              <i className="fas fa-times text-sm"></i>
            </button>
          </div>
        )}

        {/* Quick Actions Bar */}
        <div className="flex items-center gap-2 mb-2 overflow-x-auto pb-1 text-[11px]">
          <button
            onClick={() => handleRequestMeme()}
            disabled={isGeneratingMeme || isLoading}
            className="px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-pink-500/20 border border-amber-400/40 text-amber-300 font-extrabold flex items-center gap-1 hover:bg-amber-500/30 transition shrink-0 cursor-pointer"
          >
            <span>🎨 សុំ Meme ១ (Free)</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-400 font-bold flex items-center gap-1 hover:bg-cyan-500/20 transition shrink-0 cursor-pointer"
          >
            <i className="fas fa-camera text-xs"></i> <span>ផ្ញើរូបភាព (Vision AI)</span>
          </button>
          <span className="text-[10px] text-slate-500 italic shrink-0">#SETEC_Troll #Meme_IT</span>
        </div>

        {/* Input Bar */}
        <div className="relative flex items-center gap-2">
          {/* Camera Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition border ${
              selectedImage
                ? 'bg-cyan-500 text-white border-cyan-400'
                : isDark
                ? 'bg-slate-900 border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-400'
                : 'bg-slate-100 border-slate-300 text-slate-600 hover:text-cyan-600'
            }`}
            title="Upload Image (AI Vision)"
          >
            <i className="fas fa-image text-sm"></i>
          </button>

          <div className="flex-1 relative">
            <input
              type="text"
              disabled={isLoading || isGeneratingMeme}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleChat();
                }
              }}
              className={`w-full rounded-xl px-4 py-3 outline-none text-xs sm:text-sm transition-all border ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400 placeholder:text-slate-500'
                  : 'bg-slate-100 border-slate-300 text-slate-900 focus:border-cyan-500 placeholder:text-slate-400'
              }`}
              placeholder={
                selectedImage
                  ? 'វាយសំណួរ ឬពាក្យបញ្ជាអំពីរូបភាពនេះ...'
                  : 'សួរមកអាម៉ូយ... កុំឱ្យបង Kick ចេញទាន់!'
              }
            />
          </div>

          <button
            onClick={handleChat}
            disabled={isLoading || isGeneratingMeme || (!inputText.trim() && !selectedImage)}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition active:scale-95 shadow-md ${
              isLoading || (!inputText.trim() && !selectedImage)
                ? 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-500/20'
            }`}
            title="Send"
          >
            <i className="fas fa-paper-plane text-xs"></i>
          </button>
        </div>
      </footer>

      {/* History Session Modal */}
      {selectedSessionModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedSessionModal(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <div
            className={`rounded-2xl shadow-2xl max-w-lg w-full p-5 relative max-h-[85vh] overflow-y-auto border ${
              isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <button
              onClick={() => setSelectedSessionModal(null)}
              className="absolute top-3 right-3 text-slate-400 hover:text-pink-400 text-lg"
            >
              <i className="fas fa-times"></i>
            </button>
            <div className="font-black text-cyan-400 text-base mb-3 pb-2 border-b border-slate-700/30">
              {selectedSessionModal.title}
            </div>
            <div className="space-y-3">
              {selectedSessionModal.messages?.map((msg, i) => (
                <div key={i} className={`p-2.5 rounded-xl text-xs ${msg.role === 'user' ? 'bg-cyan-500/10 text-cyan-300 ml-6' : 'bg-slate-800/60 mr-6'}`}>
                  <span className="font-black block text-[10px] mb-1">{msg.role === 'user' ? username : 'កូនច្បង'}</span>
                  <p>{msg.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Full Image Viewer Modal */}
      <ImageModal
        isOpen={!!viewingImage}
        imageUrl={viewingImage?.url}
        caption={viewingImage?.caption}
        onClose={() => setViewingImage(null)}
      />

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
