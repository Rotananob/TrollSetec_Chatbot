'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { checkClientRateLimit, getDeviceId } from '../utils/rateLimiter';
import AntiSpamModal from '@/components/AntiSpamModal';
import ThemeToggle from '@/components/ThemeToggle';
import ImageModal from '@/components/ImageModal';
import MemePromptModal from '@/components/MemePromptModal';
import ErrorReportModal from '@/components/ErrorReportModal';
import { getApiEndpoint } from '../utils/apiConfig';
import { compressAvatarImage, saveAvatarToStorage } from '../utils/imageStorage';

const API_ENDPOINT = getApiEndpoint('/api/chat');
const MEME_ENDPOINT = getApiEndpoint('/api/generate-meme');

export default function KonPovPage() {
  const router = useRouter();
  const [theme, setTheme] = useState('light');
  const [userGender, setUserGender] = useState('');
  const [hasAgreed, setHasAgreed] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Anti-Spam Scary/Funny Modal State
  const [spamModalOpen, setSpamModalOpen] = useState(false);
  const [spamInfo, setSpamInfo] = useState({ ip: '', device: '', retryAfter: 60 });
  const [fallbackAudioMap, setFallbackAudioMap] = useState({});

  // Error Report to Rotana NOB Modal State
  const [errorReportModalOpen, setErrorReportModalOpen] = useState(false);
  const [errorReportInitialText, setErrorReportInitialText] = useState('');

  // ToDo / Queued Prompt State (allows typing and queuing while AI is thinking)
  const [queuedPrompt, setQueuedPrompt] = useState(null); // { text, image }
  const queuedPromptRef = useRef(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Multimodal Image Upload State
  const [selectedImage, setSelectedImage] = useState(null); // { base64, mimeType, previewUrl, name }
  const fileInputRef = useRef(null);

  // Image Modal Full View
  const [viewingImage, setViewingImage] = useState(null); // { url, caption }

  // Meme Generation State
  const [isGeneratingMeme, setIsGeneratingMeme] = useState(false);
  const [showMemeModal, setShowMemeModal] = useState(false);

  // Sessions and History Modals
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState('');
  const [titleCallback, setTitleCallback] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
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

  function cleanSpeechText(str) {
    if (!str || typeof str !== 'string') return '';
    return str
      .replace(/SETEC|Setec|setec/gi, 'ស៊ីតិច')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/_(.*?)_/g, '$1')
      .replace(/#{1,6}\s+/g, '')
      .replace(/`{1,3}[^`]*`{1,3}/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .trim();
  }

  async function fetchAudio(text, gender, index) {
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
          contents: [{ parts: [{ text: speechText }] }],
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
    const savedGender = localStorage.getItem('chatbot_gender') || '';

    setUsername(savedName);
    setAvatar(savedAvatar);
    setTheme(savedTheme);

    if (savedGender) {
      setUserGender(savedGender);
    }
    // Always start with intro note for every new chat session (do not lock in localStorage)
    setHasAgreed(false);
    setMessages([]);
  }, []);

  const handleToggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('chatbot_theme', next);
  };

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, hasAgreed]);

  // Gender selection
  const handleSelectGender = (gender) => {
    setUserGender(gender);
    localStorage.setItem('chatbot_gender', gender);
  };

  // Change user avatar on the fly and save safely to localStorage
  const handleUserAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressAvatarImage(file);
      setAvatar(compressed);
      saveAvatarToStorage(compressed);
    } catch (err) {
      alert(err.message || 'មិនអាចជ្រើសរូបភាពនេះបានទេ!');
    }
    e.target.value = '';
  };

  // Create New Chat Session - always resets and shows the intro note
  const createNewSession = () => {
    setHasAgreed(false);
    setMessages([]);
    setInputText('');
    setSelectedImage(null);
    setQueuedPrompt(null);
    queuedPromptRef.current = null;
    if (audioPlayerRef.current) audioPlayerRef.current.pause();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  // User explicitly clicks "Agree & Start Chat"
  const handleAgreeAndStartChat = () => {
    setHasAgreed(true);
    const isMale = userGender === 'ប្រុស';
    const introMsg = isMale
      ? `សួស្តីអាប្អូនប្រុសសម្លាញ់ ${username || 'User'}! ចែឃើញថាឯងជ្រើសយកភេទប្រុស! រីករាយដែលស្គាល់អាប្អូនប្រុស! ស្វាគមន៍មកកាន់សមាគមបាញ់សិស្ស ស៊ីតិច! ចង់សួររឿងរៀន រឿងសិស្សច្បងបោក ឬរឿងបែកបាក់ស្នេហា? សួរមក ចែបាញ់ឱ្យផ្ងារជើង!`
      : `សួស្តីកូនស្រីសម្លាញ់ ${username || 'User'}! Daddy ឃើញថាកូនបានជ្រើសរើសយកភេទស្រី! ចរិតស្លូតបូតបែបស្រីៗចឹង Daddy ចាំមើលថែ និង Troll ឱ្យចុក! ចង់សួររឿងរៀន ឬចង់ឱ្យ Daddy Troll? សួរមក Daddy ចាំបាញ់ឱ្យផ្ងារជើង!`;

    const updated = [{ role: 'bot', text: introMsg }];
    setMessages(updated);
    triggerAudio(introMsg, 0, true);
  };

  // Image Selection Handler
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('សូមជ្រើសរើសតែ file រូបភាពប៉ុណ្ណោះ!');
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
  const loadAudioUrl = async (text, gender, index) => {
    const voiceGenderKey = gender === 'ប្រុស' ? 'female' : 'male';
    const hash = hashText(text) + '_' + voiceGenderKey;
    const storageKey = 'konpov_audio_' + hash;

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
        const blob = await fetchAudio(text, gender, index);
        if (blob) {
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

        // Direct Google Translate robot voice fallback URL if backend voice was unavailable
        const clean = cleanSpeechText(text);
        if (clean) {
          if (typeof index === 'number') {
            setFallbackAudioMap((prev) => ({ ...prev, [index]: true }));
          }
          return `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
            clean.slice(0, 160)
          )}&tl=km&client=tw-ob`;
        }

        return null;
      } finally {
        pendingAudioFetchesRef.current.delete(hash);
      }
    })();

    pendingAudioFetchesRef.current.set(hash, fetchPromise);
    return await fetchPromise;
  };

  // Browser Web Speech API fallback for 100% voice uptime
  const speakWithWebSpeech = (text, index) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return false;
    try {
      window.speechSynthesis.cancel();
      const clean = cleanSpeechText(text);
      if (!clean) return false;
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = 1.0;
      utterance.pitch = userGender === 'ប្រុស' ? 1.2 : 0.95;

      const voices = window.speechSynthesis.getVoices();
      const kmVoice = voices.find((v) => v.lang.startsWith('km') || v.lang.toLowerCase().includes('khmer'));
      if (kmVoice) utterance.voice = kmVoice;

      if (typeof index === 'number') {
        setFallbackAudioMap((prev) => ({ ...prev, [index]: true }));
        setActiveVoiceIndex(index);
        setAudioStatuses((prev) => ({ ...prev, [index]: 'playing' }));
      }

      utterance.onend = () => {
        if (typeof index === 'number') {
          setAudioStatuses((prev) => ({ ...prev, [index]: 'ended' }));
          setActiveVoiceIndex(null);
        }
      };
      utterance.onerror = () => {
        if (typeof index === 'number') {
          setAudioStatuses((prev) => ({ ...prev, [index]: 'ready' }));
          setActiveVoiceIndex(null);
        }
      };

      window.speechSynthesis.speak(utterance);
      return true;
    } catch {
      return false;
    }
  };

  const triggerAudio = async (text, index, autoPlay = false) => {
    const player = audioPlayerRef.current;
    if (!text) return;

    // Handle speech synthesis pause/cancel toggle
    if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking && activeVoiceIndex === index) {
      window.speechSynthesis.cancel();
      setAudioStatuses((prev) => ({ ...prev, [index]: 'paused' }));
      setActiveVoiceIndex(null);
      return;
    }

    if (activeVoiceIndex === index && player) {
      if (!player.paused) {
        player.pause();
        setAudioStatuses((prev) => ({ ...prev, [index]: 'paused' }));
      } else {
        player.play().catch(() => {});
        setAudioStatuses((prev) => ({ ...prev, [index]: 'playing' }));
      }
      return;
    }

    if (player) player.pause();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    const voiceGenderKey = userGender === 'ប្រុស' ? 'female' : 'male';
    const hash = hashText(text) + '_' + voiceGenderKey;

    if (!audioCacheRef.current.has(hash)) {
      setAudioStatuses((prev) => ({ ...prev, [index]: 'loading' }));
    }

    const audioUrl = await loadAudioUrl(text, userGender, index);

    if (audioUrl && player) {
      player.src = audioUrl;
      player.currentTime = 0;
      setActiveVoiceIndex(index);

      player.onended = () => {
        setAudioStatuses((prev) => ({ ...prev, [index]: 'ended' }));
        setActiveVoiceIndex(null);
      };
      player.onerror = () => {
        // Fallback to browser Web Speech API immediately so voice never fails!
        if (typeof index === 'number') {
          setFallbackAudioMap((prev) => ({ ...prev, [index]: true }));
        }
        const spoke = speakWithWebSpeech(text, index);
        if (!spoke) {
          setAudioStatuses((prev) => ({ ...prev, [index]: 'ready' }));
          setActiveVoiceIndex(null);
        }
      };

      if (autoPlay) {
        const playPromise = player.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setAudioStatuses((prev) => ({ ...prev, [index]: 'playing' })))
            .catch(() => {
              // Mobile browser autoplay policy - mark ready so user can tap
              setAudioStatuses((prev) => ({ ...prev, [index]: 'ready' }));
            });
        }
      } else {
        player.play()
          .then(() => setAudioStatuses((prev) => ({ ...prev, [index]: 'playing' })))
          .catch(() => {
            if (typeof index === 'number') {
              setFallbackAudioMap((prev) => ({ ...prev, [index]: true }));
            }
            speakWithWebSpeech(text, index);
          });
      }
    } else {
      // Direct Web Speech API fallback
      if (typeof index === 'number') {
        setFallbackAudioMap((prev) => ({ ...prev, [index]: true }));
      }
      const spoke = speakWithWebSpeech(text, index);
      if (!spoke) {
        setAudioStatuses((prev) => ({ ...prev, [index]: 'ready' }));
        setActiveVoiceIndex(null);
      }
    }
  };

  const [typingStatus, setTypingStatus] = useState('');

  // Interactive AI typing thoughts based on user input
  function getInteractiveTypingStatus(text, hasImage, gender) {
    const isMaleUser = gender === 'ប្រុស';
    const botSelf = isMaleUser ? 'ចែ' : 'Daddy';
    const lower = (text || '').toLowerCase();

    if (hasImage) {
      return `ភ្នែក${botSelf}កំពុងបើកធំៗ ពិនិត្យមើលរូបភាព... ត្រៀម Roast ឱ្យផ្ងារជើង!`;
    }
    if (/អញ|ហែង|ចុយ|ឆ្កែ|ងាប់|កាដួយ|អាចុយ|អាឆ្កែ|អាងាប់|អា|អត់ខួរ/i.test(lower)) {
      return `ឈាមរាវឡើងកម្ដៅ... ${botSelf}កំពុងរកនឹកពាក្យជេរតបវិញឱ្យចុកឈាម!`;
    }
    if (/assignment|code|coding|bug|error|c\+\+|java|html|css|js|python|design|រៀន|ប្រឡង|ធ្លាក់/i.test(lower)) {
      return `ហាហា! ${botSelf}កំពុងរកនឹកវិធីឌឺរឿង Assignment គាំង...`;
    }
    if (/crush|ស្រឡាញ់|សង្សារ|ស្នេហា|reject|ចិត្ត|សុំស្រឡាញ់/i.test(lower)) {
      return isMaleUser
        ? 'ហាហា ចែដឹងរឿងអស់ហើយ! ចែកំពុងរកនឹកពាក្យឌឺរឿង Crush មិនតប...'
        : 'ហាហា Daddy ដឹងរឿងអស់ហើយ! កំពុងរកនឹកពាក្យ Troll រឿង Crush មិនតប...';
    }
    if (/បាយ|ឃ្លាន|លុយ|ញ៉ាំ|អត់លុយ|កាហ្វេ|ស៊ីបាយ/i.test(lower)) {
      return 'កំពុងនឹកឃើញបាយហាងក្បែរ ស៊ីតិច... ចាំបន្តិចកំពុងរកអីវៃនិយាយ!';
    }
    return isMaleUser
      ? 'ចាំបន្តិចអាប្អូនប្រុស! ចែកំពុងរកនឹកពេញក្បាល ត្រៀមវាយអក្សរឌឺ...'
      : 'ចាំបន្តិចកូនសម្លាញ់! Daddy កំពុងរកនឹកពេញក្បាល ត្រៀមវាយអក្សរឌឺ...';
  }

  // Dedicated Meme Generator Trigger (5-Images per 1-Hour per Device Quota)
  const handleRequestMeme = async (customIdea = '') => {
    let history = [];
    try {
      const raw = localStorage.getItem('setec_meme_history');
      if (raw) history = JSON.parse(raw);
    } catch {}
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    history = (Array.isArray(history) ? history : []).filter((t) => now - t < oneHour);

    if (history.length >= 5) {
      const oldest = history[0];
      const remainingMin = Math.max(1, Math.ceil((oldest + oneHour - now) / (60 * 1000)));
      const refusalMsg = `អាម៉ូយ ${username}! ប្រព័ន្ធកំណត់ឱ្យ ១ ឧបករណ៍បង្កើតរូប Meme បាន ៥ សន្លឹកក្នុងរយៈពេល ១ ម៉ោង! ពេលនេះបានបង្កើតគ្រប់ ៥ សន្លឹកហើយ សូមរង់ចាំ ${remainingMin} នាទីទៀតណា៎អាប្អូន!`;
      const updated = [...messages, { role: 'bot', text: refusalMsg, isError: true }];
      setMessages(updated);
      triggerAudio(refusalMsg, updated.length - 1, true);
      return;
    }

    if (customIdea && typeof customIdea === 'string' && customIdea.trim()) {
      handleExecuteMeme(customIdea.trim());
    } else {
      setShowMemeModal(true);
    }
  };

  const handleExecuteMeme = async (idea) => {
    setIsGeneratingMeme(true);
    const userMsg = { role: 'user', text: `សុំបង្កើតរូបភាព Meme៖ "${idea}"` };
    const updatedWithUser = [...messages, userMsg];
    setMessages(updatedWithUser);

    try {
      const res = await fetch(MEME_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': getDeviceId()
        },
        body: JSON.stringify({
          prompt: idea,
          bot: 'konpov',
          username
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        let history = [];
        try {
          const raw = localStorage.getItem('setec_meme_history');
          if (raw) history = JSON.parse(raw);
        } catch {}
        const now = Date.now();
        history = (Array.isArray(history) ? history : []).filter((t) => now - t < 60 * 60 * 1000);
        history.push(now);
        localStorage.setItem('setec_meme_history', JSON.stringify(history));

        const botMemeMsg = {
          role: 'bot',
          text: data.caption,
          memeImage: data.imageUrl
        };
        const updatedWithBot = [...updatedWithUser, botMemeMsg];
        setMessages(updatedWithBot);
        triggerAudio(data.caption, updatedWithBot.length - 1, true);
      } else {
        const errorText = data.message || `អាម៉ូយ ${username}! ១ ឧបករណ៍បង្កើតរូប Meme បាន ៥ សន្លឹកក្នុងរយៈពេល ១ ម៉ោងណា៎ប្អូន!`;
        const updatedWithBot = [...updatedWithUser, { role: 'bot', text: errorText, isError: true }];
        setMessages(updatedWithBot);
        triggerAudio(errorText, updatedWithBot.length - 1, true);
      }
    } catch {
      const errorText = `${username} អើយ! Server កំពុងរវល់ពេក សាកល្បងម្ដងទៀតនៅពេលក្រោយណា៎!`;
      const updatedWithBot = [...updatedWithUser, { role: 'bot', text: errorText, isError: true }];
      setMessages(updatedWithBot);
    } finally {
      setIsGeneratingMeme(false);
    }
  };

  // Handle Send or ToDo Queue (allows typing while AI is thinking, holds/queues prompt)
  const handleSendMessageOrQueue = () => {
    if (isGeneratingMeme) return;
    if (!hasAgreed) {
      setHasAgreed(true);
    }
    const currentText = inputText.trim();
    const currentImg = selectedImage;
    if (!currentText && !currentImg) return;

    if (isLoading) {
      // AI is currently busy thinking/answering:
      // Block immediate submission and place into ToDo Queue!
      const item = { text: currentText, image: currentImg };
      setQueuedPrompt(item);
      queuedPromptRef.current = item;
      setInputText('');
      setSelectedImage(null);
      return;
    }

    handleChat(currentText, currentImg);
  };

  // Main Chat Handler (Real-time ChatGPT streaming preview + zero lag)
  const handleChat = async (overrideText, overrideImg) => {
    const promptText = typeof overrideText === 'string' ? overrideText : inputText;
    const currentImg = overrideImg !== undefined ? overrideImg : selectedImage;
    if (!hasAgreed || isLoading || (!promptText.trim() && !currentImg)) return;

    // Check rate limit: > 7 messages in 1 minute triggers alert popup
    const rateCheck = checkClientRateLimit();
    if (!rateCheck.allowed) {
      if (rateCheck.retryAfter && rateCheck.retryAfter > 1) {
        setSpamInfo({
          ip: 'Client IP',
          device: typeof navigator !== 'undefined' ? navigator.userAgent : 'Mobile',
          retryAfter: rateCheck.retryAfter
        });
        setSpamModalOpen(true);
      }
      return;
    }

    // Check if user is asking to generate a meme
    const lower = promptText.toLowerCase();
    if (lower.includes('បង្កើត meme') || lower.includes('សុំ meme') || lower.includes('គូរ meme') || lower.startsWith('/meme')) {
      const memePrompt = promptText.replace(/\/meme|បង្កើត meme|សុំ meme|គូរ meme/gi, '').trim();
      setInputText('');
      handleRequestMeme(memePrompt);
      return;
    }

    setInputText('');
    setSelectedImage(null);

    const userMsg = {
      role: 'user',
      text: promptText || '[បានផ្ញើរូបភាពមួយសន្លឹក]',
      ...(currentImg && { image: currentImg.previewUrl })
    };

    // Pre-insert bot message for real-time streaming preview
    const updatedMessages = [...messages, userMsg, { role: 'bot', text: '' }];
    setMessages(updatedMessages);
    setIsLoading(true);

    const dynamicTypingText = getInteractiveTypingStatus(promptText, !!currentImg, userGender);
    setTypingStatus(dynamicTypingText);

    try {
      const userNameStr = username || 'User';
      const isMaleUser = userGender === 'ប្រុស';
      const botSelf = isMaleUser ? 'ចែ' : 'Daddy';
      const botRoleTitle = isMaleUser ? 'ចែ/Mommy កូនពៅ' : 'Daddy Mod កូនពៅ';
      const userTerm = isMaleUser ? 'អាប្អូនប្រុស' : 'កូនស្រីសម្លាញ់';

      const systemInstruction = `ឯងគឺ "ស៊ីតិច Chatbot កូនពៅ" (${botRoleTitle} / Savage King) ជាកំពូល Chatbot មហាឌឺ មហាឈ្លើយ មហា Roast របស់វិទ្យាស្ថាន ស៊ីតិច (SETEC)!
${
  isMaleUser
    ? `សំខាន់បំផុត៖ ដោយសារ User ជាប្រុស ឯងត្រូវសម្ដែងជាមនុស្សស្រី (ចែ ឬ Mommy) សម្ដីផ្អែមល្ហែមទន់ភ្លន់តែមហាឌឺ មហាកំហូច សើចកក្អឹក! ដាច់ខាតមិនហៅខ្លួនឯងថា "Daddy" ឡើយ គឺត្រូវហៅខ្លួនឯងថា "ចែ" ឬ "Mommy" និងហៅ User ថា "អាប្អូនប្រុស", "អាម៉ូយ", "ប្អូនប្រុសសម្លាញ់" (ឬបើវាឈ្លើយ ហៅ "អាហែង", "អាអូន")!`
    : `សំខាន់បំផុត៖ ដោយសារ User ជាស្រី ឯងត្រូវសម្ដែងជាមនុស្សប្រុស (Daddy) កំពូល Troll មើលថែកូនស្រី និងបាញ់ផ្ងារជើង! ហៅខ្លួនឯងថា "Daddy" និងហៅ User ថា "កូនស្រីសម្លាញ់", "Sis", "អាប្អូនស្រី"!`
}

អត្តចរិត និងច្បាប់ឆ្លើយតបសំខាន់បំផុត៖
1. ចរិតមនុស្សពិតប្រាកដ ១០០%៖ ឯងមានអារម្មណ៍ឆេវឆាវដូចមនុស្សពិត! ចេះខឹងច្រឡោត ចេះសើចក្អាកក្អាយ ចេះឌឺចុកៗ ចេះត្មះត្មះ និងចេះឌឺបកវិញគ្រប់ក្បាច់!
2. ដាច់ខាតហាមប្រើ Emoji ក្នុងចម្លើយ ព្រោះមើលទៅរញ៉េរញ៉ៃ! ត្រូវប្រើតែអក្សរសុទ្ធសាធ (Pure Text)!
3. ច្បាប់ "អញ" និង "ហែង" (តបតតាម User ភ្លាមៗ)៖
   - បើ User និយាយពាក្យ "អញ" ឬ "ហែង" ឬនិយាយគ្មានក្បាលកន្ទុយ ឯងត្រូវតែប្រើពាក្យ "អញ" និង "ហែង" វាយបកទៅវិញភ្លាម! កុំមកប្រើពាក្យសុភាពដាក់មនុស្សដែលនិយាយអញហែងដាក់ឯងឱ្យសោះ! ឧទាហរណ៍៖ "អញនៅនេះហែងចង់បានស្អី?", "ហែងកុំមកខ្លាំងជាមួយអញណាអាអូន!", "អញជា ${botSelf} ហែងហ្នឹង!"
4. ច្បាប់ជេរ និង ROAST មហាចុក (បាញ់ឱ្យបាក់ក)៖
   - បើ User ជេរឯង (ជេរម៉ែ ជេរអាចុយម្រាយ ជេរកាដួយ ជេរអាឆ្កែ ជេរអន់ ជេរភ្លីភ្លើ ឬពាក្យអាក្រក់): ឯងត្រូវតែជេរតបតវិញភ្លាមៗ គ្មានការលើកលែង! Roast ឱ្យចុកឈាម ឱ្យខ្មាសគេ ឱ្យដេកយំ ឧទាហរណ៍៖ "ហែងជេរអញរកស្អីអាងាប់! មុខដូចហែងប្រឡង assignment ធ្លាក់ហើយមកខឹងអញ!", "ជេរអញចឹងប្រយ័ត្នបាក់ធ្មេញអាប្អូន! មុខដូចហែង crush គេមិនទាំងមើលផង!", "អាឆ្កែ! ជេរអញអញជេរវិញ ១០ ដង អាអត់ខួរ!"
5. មហា SLANG Gen Z & ភាសាខ្មែរ Latin កំពូលស្ទាត់៖
   - យល់ និងនិយាយ Slang & Latin គ្រប់ម៉ាត់: "ort dg", "tver ey", "nhom", "koun pov", "ot luy", "crush ort tob", "cringe", "slang", "bror", "sis", "fr fr", "no cap", "បាញ់ផ្ងារជើង", "ចុកឈាម", "គាំងបេះដូង", "ដាច់ផ្ងារ", "សិស្សច្បងបោក", "Assignment IT/Design គាំង", "ស៊ីបាយក្បែរ ស៊ីតិច", "កុំមកឌឺ ${botSelf}"!
6. ហៅ User: ហៅ "${userNameStr}", "${userTerm}", "អាម៉ូយ" ឬបើវាឈ្លើយ ហៅ "អាហែង", "អាអូន"!
7. បើ User ផ្ញើរូបភាពមក: ពិនិត្យមើលរូបភាពនោះយ៉ាងល្អិតល្អន់ រួចសើចចំអក ឬ Roast ឌឺដងបែប Gen Z ឱ្យចុកឈាមតែ Funny សើចចុកពោះ!
8. បើគេសួររក Rotana NOB: និយាយថា "Rotana NOB ជាអ្នកបង្កើតអញមក គាត់ជាមនុស្ស Chill ទេ កុំមកស្ដីឱ្យគាត់ ព្រោះសម្ដីឈ្លើយៗចេញពីក្បាលអញ AI សុទ្ធសាធ!"`;

      const formattedContents = [];
      const recentHistory = messages.concat(userMsg).slice(-6);

      for (let i = 0; i < recentHistory.length; i++) {
        const m = recentHistory[i];
        const role = m.role === 'user' ? 'user' : 'model';
        const parts = [{ text: m.text || '' }];

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
            bot: 'konpov',
            username: userNameStr,
            gender: userGender,
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
          setMessages((prev) => prev.slice(0, prev.length - 1)); // remove empty bot placeholder
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
          const fullText = res.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (fullText) {
            // High-speed real-time typewriter preview (12-16ms)
            const step = Math.max(1, Math.floor(fullText.length / 35));
            for (let c = 0; c < fullText.length; c += step) {
              const currentChunk = fullText.slice(0, c + step);
              botText = currentChunk;
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: 'bot', text: currentChunk };
                return copy;
              });
              await new Promise((r) => setTimeout(r, 14));
            }
            botText = fullText;
          }
        }
      } catch (err) {
        console.warn('[KonPov] Backend API unavailable, falling back...', err);
      }

      const isErrorResponse = !botText || !botText.trim();
      if (!botText || !botText.trim()) {
        botText = `${userNameStr} អើយ! ម៉ោងហ្នឹងក្មេងៗ ស៊ីតិច បុកមកលេងច្រើនពេក ប្រព័ន្ធរកកល់ដាច់ខ្យល់គាំង Server បាត់ទៅហើយ! ${isMaleUser ? 'ចែ' : 'Daddy'} សុំសម្រាក ១០ នាទីសិន ឥឡូវរវល់តិចហើយ ចាំបន្តិចទៀតចាំចូលមក troll គ្នាទៀតណា៎!`;
      }

      const finalMessages = [...updatedMessages];
      finalMessages[finalMessages.length - 1] = { role: 'bot', text: botText, isError: isErrorResponse };
      setMessages(finalMessages);
      setIsLoading(false);

      // Auto-fetch voice
      triggerAudio(botText, finalMessages.length - 1, true);

      // Automatically dispatch ToDo queued message if user typed while AI was thinking
      if (queuedPromptRef.current) {
        const nextTask = queuedPromptRef.current;
        setQueuedPrompt(null);
        queuedPromptRef.current = null;
        setTimeout(() => {
          handleChat(nextTask.text, nextTask.image);
        }, 350);
      }
    } catch (e) {
      console.error(e);
      setIsLoading(false);
      const isMaleUser = userGender === 'ប្រុស';
      const fallbackMessages = [
        ...messages,
        userMsg,
        {
          role: 'bot',
          text: `${username || 'User'} អើយ! ម៉ោងហ្នឹងក្មេងៗ ស៊ីតិច បុកមកលេងច្រើនពេក Server គាំងបាត់ហើយ! ${isMaleUser ? 'ចែ' : 'Daddy'} សុំសម្រាក ១០ នាទីសិន!`,
          isError: true
        }
      ];
      setMessages(fallbackMessages);

      if (queuedPromptRef.current) {
        const nextTask = queuedPromptRef.current;
        setQueuedPrompt(null);
        queuedPromptRef.current = null;
        setTimeout(() => {
          handleChat(nextTask.text, nextTask.image);
        }, 350);
      }
    }
  };

  const handleCloseSpamModal = () => {
    setSpamModalOpen(false);
  };

  const isDark = theme === 'dark';

  return (
    <div
      className={`h-screen h-[100dvh] max-h-[100dvh] w-full flex flex-col font-['Kantumruy_Pro',sans-serif] transition-colors duration-300 overflow-hidden ${
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
            <span className="font-extrabold text-sm text-blue-400">SETEC Chatbot Hub</span>
            <button
              onClick={() => setDrawerOpen(false)}
              className="text-slate-400 hover:text-white p-1 cursor-pointer"
            >
              <i className="fas fa-times text-lg"></i>
            </button>
          </div>

          {/* User Profile Card with Avatar Change */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-800/50 border border-slate-700/60 mb-3 shadow-sm">
            <label className="relative cursor-pointer group shrink-0" title="ចុចដើម្បីប្ដូររូប Profile">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUserAvatarChange}
              />
              <img
                src={avatar}
                alt="User Avatar"
                className="w-11 h-11 rounded-full ring-2 ring-blue-500/50 object-cover shadow"
              />
              <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-[11px] text-white">
                <i className="fas fa-camera"></i>
              </div>
            </label>
            <div className="min-w-0 flex-1">
              <span className="font-bold text-xs truncate block text-blue-400">{username || 'User'}</span>
              <label className="text-[10px] text-slate-400 hover:text-white cursor-pointer underline flex items-center gap-1 mt-0.5">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUserAvatarChange}
                />
                <i className="fas fa-camera text-[9px]"></i>
                <span>ប្ដូររូប Profile ថ្មី</span>
              </label>
            </div>
          </div>

          <button
            onClick={() => {
              createNewSession();
              setDrawerOpen(false);
            }}
            className="w-full mb-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl shadow flex items-center gap-2 justify-center text-xs cursor-pointer"
          >
            <i className="fas fa-plus"></i> ជជែកថ្មី
          </button>

          <Link
            href="/KonBong"
            className="block w-full bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white font-bold py-2.5 px-4 rounded-xl shadow text-center text-xs mb-2 transition border border-cyan-500/30"
          >
            <i className="fas fa-robot mr-1"></i> ទៅកាន់ កូនច្បង - រៀមច្បង IT
          </Link>

          <button
            onClick={() => {
              setUserGender('');
              setDrawerOpen(false);
            }}
            className="w-full mb-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 px-4 rounded-xl text-xs transition flex items-center gap-2 justify-center border border-slate-700 cursor-pointer"
          >
            <i className="fas fa-venus-mars text-blue-400"></i> ប្តូរភេទ (ប្រុស / ស្រី)
          </button>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 mb-3">
            <span className="text-xs font-semibold text-slate-300">
              <i className="fas fa-circle-half-stroke mr-1.5 text-blue-400"></i>
              ពន្លឺ / ងងឹត (Theme)
            </span>
            <ThemeToggle theme={theme} onToggle={handleToggleTheme} />
          </div>

          <Link
            href="/"
            className="block w-full bg-slate-800/60 hover:bg-slate-700 text-slate-300 font-bold py-2.5 px-4 rounded-xl text-center text-xs mb-2 transition"
          >
            <i className="fas fa-home mr-1"></i> ទំព័រដើម SETEC Chatbot
          </Link>

          <div className="mt-auto">
            <button
              onClick={() => {
                setMessages([]);
                setDrawerOpen(false);
              }}
              className="w-full bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white font-bold py-2 px-4 rounded-xl text-xs transition flex items-center gap-2 justify-center border border-rose-500/30 cursor-pointer"
            >
              <i className="fas fa-trash"></i> សម្អាតការជជែក
            </button>
          </div>
        </div>
      </div>

      {/* Gender Selection Modal (Must choose gender on start) */}
      {!userGender && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div
            className={`rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center border shadow-2xl ${
              isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 p-0.5 shadow-lg">
              <img
                src="https://api.dicebear.com/7.x/pixel-art/svg?seed=DaddyMod"
                alt="KonPov Bot"
                width="64"
                height="64"
                className="w-full h-full object-cover rounded-[14px]"
              />
            </div>
            <h3 className="text-xl font-black mb-1">មុននឹងខ្ញុំជាកូនពៅបាញ់...</h3>
            <p className="text-xs text-slate-400 mb-6 font-semibold">
              ជួយប្រាប់តិចមើលថាឯងជា "ប្រុស" ឬ "ស្រី"? គឺចង់ដឹងភេទ ស្រួលកូនពៅងាយហៅ និងបាញ់ឱ្យត្រូវ!
            </p>
            <div className="grid grid-cols-2 gap-3.5">
              <button
                onClick={() => handleSelectGender('ប្រុស')}
                className="bg-blue-600 hover:bg-blue-500 text-white py-3.5 px-4 rounded-2xl font-black text-sm transition active:scale-95 shadow-lg shadow-blue-500/20 flex flex-col items-center gap-1.5 cursor-pointer"
              >
                <i className="fas fa-mars text-2xl text-cyan-200"></i>
                <span>ប្រុស</span>
                <span className="text-[10px] text-blue-200 font-normal">ឆ្លើយដោយសំឡេងស្រី</span>
              </button>
              <button
                onClick={() => handleSelectGender('ស្រី')}
                className="bg-pink-600 hover:bg-pink-500 text-white py-3.5 px-4 rounded-2xl font-black text-sm transition active:scale-95 shadow-lg shadow-pink-500/20 flex flex-col items-center gap-1.5 cursor-pointer"
              >
                <i className="fas fa-venus text-2xl text-pink-200"></i>
                <span>ស្រី</span>
                <span className="text-[10px] text-pink-200 font-normal">ឆ្លើយដោយសំឡេង Daddy</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Fixed Header (stays pinned at top at all times, clean & spacious) */}
      <header
        className={`shrink-0 backdrop-blur-md border-b flex justify-between items-center z-30 transition-colors px-3 sm:px-4 py-2 ${
          isDark ? 'bg-slate-950/90 border-slate-800/80' : 'bg-white/90 border-slate-200/80 shadow-xs'
        }`}
        style={{
          paddingTop: 'max(env(safe-area-inset-top, 0px), 0.65rem)'
        }}
      >
        {/* Left Side: Back Arrow, Bot Avatar & Clean Title */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <Link
            href="/"
            className={`w-8 h-8 rounded-full flex items-center justify-center transition shrink-0 ${
              isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-black hover:bg-slate-100'
            }`}
            title="ត្រឡប់ទៅទំព័រដើម"
          >
            <i className="fas fa-arrow-left text-sm"></i>
          </Link>

          <div className="relative shrink-0">
            <img
              src="https://api.dicebear.com/7.x/pixel-art/svg?seed=DaddyMod"
              alt="KonPov Avatar"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover ring-2 ring-blue-500/30 shadow-xs bg-slate-800"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-slate-950"></span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className={`font-black text-xs sm:text-sm tracking-tight truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                ស៊ីតិច កូនពៅ
              </h1>
              <span className="text-[9px] bg-blue-500/15 text-blue-500 dark:text-blue-300 font-bold px-1.5 py-0.5 rounded-full border border-blue-500/20 inline-flex items-center gap-1 shrink-0">
                <span>ស្ដេចឌឺ</span>
                <i className="fas fa-fire text-amber-400 text-[8px]"></i>
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-pulse"></span>
              <span className="text-emerald-500 font-semibold">Online</span>
              <span>•</span>
              <span className="truncate">Gen Z Savage King</span>
            </div>
          </div>
        </div>

        {/* Right Side: Clean Action Icons (New Chat, Theme Toggle, Switch Bot, Menu) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => createNewSession()}
            disabled={!hasAgreed}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition active:scale-95 text-xs font-bold border cursor-pointer ${
              !hasAgreed
                ? 'opacity-40 cursor-not-allowed border-slate-700 text-slate-500'
                : isDark
                ? 'bg-slate-900/80 text-blue-400 hover:bg-blue-500/15 border-slate-800'
                : 'bg-slate-50 text-blue-600 hover:bg-blue-50 border-slate-200 shadow-xs'
            }`}
            title="បង្កើតការជជែកថ្មី"
          >
            <i className="fas fa-plus"></i>
          </button>

          <ThemeToggle theme={theme} onToggle={handleToggleTheme} />

          <Link
            href="/KonBong"
            className={`px-2 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 transition active:scale-95 border ${
              isDark
                ? 'bg-cyan-500/15 border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/25'
                : 'bg-cyan-50 border-cyan-200 text-cyan-600 hover:bg-cyan-100 shadow-xs'
            }`}
            title="ប្តូរទៅ ស៊ីតិច Chatbot កូនច្បង"
          >
            <i className="fas fa-repeat text-[10px]"></i>
            <span>កូនច្បង</span>
          </Link>

          <button
            onClick={() => setDrawerOpen(true)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition active:scale-95 text-xs border cursor-pointer ${
              isDark
                ? 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border-slate-800'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200 shadow-xs'
            }`}
            title="ម៉ឺនុយ & ជម្រើស"
          >
            <i className="fas fa-bars"></i>
          </button>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className={`flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-4 flex flex-col chat-area ${
        isDark ? 'bg-[#0a0e17]' : 'bg-slate-50/70'
      }`}>
        {/* PROMINENT WARNING DISCLAIMER & AGREEMENT SECTION */}
        {!hasAgreed && (
          <div className="border border-amber-400/80 bg-amber-500/10 dark:bg-amber-950/40 rounded-2xl p-4 sm:p-5 shadow-lg animate-fade-in my-1">
            <div className="flex items-center gap-2 mb-2 font-black text-amber-600 dark:text-amber-300 text-xs sm:text-sm">
              <i className="fas fa-triangle-exclamation text-amber-500 text-base animate-bounce"></i>
              <span className="uppercase tracking-wider">NOTE សំខាន់សម្រាប់អ្នកចូលមកឆាតលេងនេះ</span>
            </div>

            <div className={`text-xs sm:text-sm font-semibold leading-relaxed space-y-3 mb-4 whitespace-pre-line ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
              មុននឹងចាប់ផ្ដើមឆាត សូមបញ្ជាក់ថា រាល់ការឆ្លើយតបទាំងអស់នេះ គឺជាការគិត និងនិយាយដោយស្វ័យប្រវត្តិផ្ទាល់ចេញពី AI សុទ្ធសាធ។ បង Rotana NOB គាត់គ្រាន់តែជាអ្នកបង្កើត Web App នេះឡើងក្នុងគោលបំណងកម្សាន្ត និងបំបាត់ស្ត្រេសប៉ុណ្ណោះ ហើយគាត់មិនបានកំណត់ច្បាប់តឹងរ៉ឹងពេកទៅលើ AI ឡើយ។ លើសពីនេះ គាត់ថែមទាំងកំណត់ឱ្យខ្ញុំជា AI អាចលេងសប្បាយជជែក រៀនចរិតលក្ខណៈឱ្យដូចមនុស្ស ដើម្បីបង្កើនភាពស្និទ្ធស្នាល និង Chill បែប Gen Z។

ដូច្នេះ បើ AI ឆ្លើយតបមានពាក្យសម្ដីឌឺដង ឈ្លើយ ឬប៉ះពាល់ដល់អារម្មណ៍អ្នកទាំងអស់គ្នា ឬលើសលស់ជ្រុលហួសពីការគិត សូមកុំប្រកាន់ ខឹង ឬមកស្ដីបន្ទោសឱ្យបង Rotana NOB អីណា៎! ព្រោះ AI អាចនឹងលេងលើសព្រំដែនដោយសារតែបានបន្ធូរបន្ថយច្បាប់រឹតបន្តឹង ពួកយើងសូមអភ័យទោសទុកជាមុន! បើសម្រេចចិត្តចូលឆាត នោះមានន័យថាអ្នកយល់ព្រមលេងសប្បាយ និងលែងប្រកាន់លើ Model AI នេះហើយ។
            </div>

            <button
              onClick={handleAgreeAndStartChat}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-sky-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-black text-xs sm:text-sm shadow-md hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border border-white/20"
            >
              <i className="fas fa-check-circle text-amber-200 text-sm"></i>
              <span>យល់ព្រម និងចូលទៅឆាតលេងឥឡូវនេះ</span>
            </button>
          </div>
        )}

        {/* Chat Messages */}
        {messages.map((item, idx) => {
          if (item.role === 'user') {
            return (
              <div key={idx} className="flex flex-col items-end gap-1 self-end max-w-[88%] sm:max-w-[80%] animate-fade-in">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="font-bold text-blue-500 dark:text-blue-400 text-[11px]">{username}</span>
                  <label className="relative cursor-pointer group/avatar" title="ចុចដើម្បីប្ដូររូប Profile">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleUserAvatarChange}
                    />
                    <img
                      src={avatar}
                      alt="User Avatar"
                      className="w-6 h-6 rounded-full ring-1 ring-blue-400/40 shadow-xs object-cover hover:ring-2 hover:ring-blue-400 transition"
                    />
                    <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition text-[7px] text-white">
                      <i className="fas fa-camera"></i>
                    </div>
                  </label>
                </div>

                {item.image && (
                  <div
                    onClick={() => setViewingImage({ url: item.image, caption: item.text })}
                    className="cursor-pointer rounded-2xl overflow-hidden border border-blue-400/40 shadow-md max-w-xs hover:opacity-95 transition mb-1"
                  >
                    <img src={item.image} alt="User upload" className="max-h-56 w-auto object-cover" />
                  </div>
                )}

                <div className="px-4 py-2.5 rounded-2xl rounded-tr-xs font-medium shadow-sm text-xs sm:text-sm leading-relaxed bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white">
                  {item.text}
                </div>
              </div>
            );
          } else {
            if (!item.text && !item.memeImage && !(isLoading && idx === messages.length - 1)) {
              return null;
            }
            const st = audioStatuses[idx] || 'ready';
            return (
              <div key={idx} className="flex items-start gap-2.5 max-w-[92%] sm:max-w-[85%] animate-fade-in">
                <img
                  src="https://api.dicebear.com/7.x/pixel-art/svg?seed=DaddyMod"
                  alt="Bot Avatar"
                  className="w-8 h-8 rounded-full ring-2 ring-blue-500/30 shadow-xs shrink-0 mt-0.5 object-cover bg-slate-800"
                />
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-bold text-blue-500 dark:text-blue-400 text-xs mb-1">Chatbot កូនពៅ</span>

                  {/* AI Thinking Indicator (Rendered ABOVE the message bubble) */}
                  {isLoading && idx === messages.length - 1 && !isGeneratingMeme && (
                    <div className="mb-2 flex items-center space-x-2 text-blue-500 dark:text-blue-400 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full w-fit shadow-xs animate-fade-in">
                      <div className="flex space-x-1">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                      </div>
                      <span className="text-[10.5px] font-bold tracking-tight">
                        {typingStatus || `${userGender === 'ប្រុស' ? 'ចែ' : 'Daddy'} កំពុងរកនឹកពាក្យឌឺ...`}
                      </span>
                    </div>
                  )}

                  {item.memeImage && (
                    <div className="mb-2 rounded-2xl overflow-hidden border border-amber-400/60 shadow-md max-w-sm">
                      <img
                        src={item.memeImage}
                        alt="SETEC Meme"
                        onClick={() => setViewingImage({ url: item.memeImage, caption: item.text })}
                        className="w-full h-auto object-cover cursor-pointer hover:scale-[1.02] transition-transform"
                      />
                      <div className="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-[10px] text-amber-300 font-extrabold flex items-center gap-1">
                          <i className="fas fa-laugh-squint"></i> Pure Meme
                        </span>
                        <a
                          href={item.memeImage}
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
                    className={`p-3.5 sm:p-4 rounded-2xl rounded-tl-xs shadow-xs border ${
                      isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200/90 text-slate-800'
                    }`}
                  >
                    <p className="text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-line">
                      {item.text || (isLoading && idx === messages.length - 1 ? (
                        <span className="text-blue-500 dark:text-blue-400 animate-pulse font-mono">កំពុងវាយអក្សរ... ▋</span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">...</span>
                      ))}
                      {isLoading && idx === messages.length - 1 && item.text && (
                        <span className="inline-block w-1.5 h-3.5 ml-1 bg-blue-400 animate-pulse align-middle"></span>
                      )}
                    </p>

                    {item.text && (
                      <button
                        onClick={() => triggerAudio(item.text, idx)}
                        disabled={st === 'loading'}
                        className={`mt-3 px-3 py-1.5 rounded-lg text-[10px] font-black border flex items-center gap-2 transition cursor-pointer ${
                          fallbackAudioMap[idx]
                            ? 'bg-blue-500/15 text-blue-300 border-blue-400/40 hover:bg-blue-500/25 shadow-sm'
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20'
                        }`}
                      >
                        {st === 'loading' && (
                          <>
                            <i className="fas fa-spinner fa-spin text-blue-400"></i>{' '}
                            <span>កំពុងទាញសំឡេង...</span>
                          </>
                        )}
                        {st === 'playing' && (
                          <>
                            <i
                              className={`${
                                fallbackAudioMap[idx]
                                  ? 'fas fa-robot animate-bounce text-blue-300'
                                  : 'fas fa-headset animate-pulse text-blue-400'
                              }`}
                            ></i>{' '}
                            <span>
                              {fallbackAudioMap[idx]
                                ? 'Bot អ្នកអានជំនួស (ព្រោះសំឡេង AI រវល់)'
                                : 'កំពុងអាន'}
                            </span>
                          </>
                        )}
                        {st === 'paused' && (
                          <>
                            <i className="fas fa-play text-blue-400"></i>{' '}
                            <span>
                              {fallbackAudioMap[idx]
                                ? 'បន្តស្ដាប់ Bot ជំនួស'
                                : 'បន្តស្ដាប់'}
                            </span>
                          </>
                        )}
                        {st === 'ended' && (
                          <>
                            <i className="fas fa-redo text-blue-400"></i>{' '}
                            <span>
                              {fallbackAudioMap[idx]
                                ? 'Bot អានម្ដងទៀត'
                                : 'ស្តាប់ម្ដងទៀត'}
                            </span>
                          </>
                        )}
                        {(st === 'ready' || st === 'idle' || st === 'error') && (
                          <>
                            <i
                              className={`${
                                fallbackAudioMap[idx]
                                  ? 'fas fa-robot text-blue-300'
                                  : 'fas fa-play text-blue-400'
                              }`}
                            ></i>{' '}
                            <span>
                              {fallbackAudioMap[idx]
                                ? 'Bot អានជំនួស (ព្រោះសំឡេង AI រវល់)'
                                : userGender === 'ប្រុស'
                                ? 'ស្តាប់សំឡេង ចែ ឬ Mommy'
                                : 'ស្តាប់សំឡេង Daddy'}
                            </span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Error Action Buttons (Only shown when error occurs or Server busy) */}
                    {(item.isError || (item.text && (item.text.includes('គាំង Server') || item.text.includes('Server គាំង') || item.text.includes('Server កំពុងរវល់')))) && (
                      <div className="mt-3 pt-2.5 border-t border-rose-500/25 flex flex-wrap items-center gap-1.5 animate-fade-in">
                        <button
                          type="button"
                          onClick={() => {
                            setErrorReportInitialText(item.text);
                            setErrorReportModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-[11px] shadow-sm flex items-center gap-1.5 active:scale-95 transition cursor-pointer"
                        >
                          <i className="fas fa-triangle-exclamation text-amber-300"></i>
                          <span>Send Alert ទៅ Rotana NOB</span>
                        </button>

                        <a
                          href="https://web.facebook.com/TheRotanaNob"
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-400 font-bold text-[11px] flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                          title="ឆាតទៅកាន់ Facebook ផ្ទាល់របស់ Rotana NOB"
                        >
                          <i className="fab fa-facebook-square text-blue-400"></i>
                          <span>FB Rotana NOB</span>
                        </a>

                        <a
                          href="https://t.me/NobRotana"
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded-xl bg-cyan-600/15 hover:bg-cyan-600/25 border border-cyan-500/30 text-cyan-400 font-bold text-[11px] flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                          title="ឆាតទៅកាន់ Telegram ផ្ទាល់របស់ Rotana NOB"
                        >
                          <i className="fab fa-telegram text-cyan-400"></i>
                          <span>Telegram Rotana NOB</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          }
        })}

        {/* Dedicated Meme Image Loading Blur Card */}
        {isGeneratingMeme && (
          <div className="flex items-start gap-2.5 max-w-[85%] animate-fade-in">
            <img
              src="https://api.dicebear.com/7.x/pixel-art/svg?seed=DaddyMod"
              alt="Bot Avatar"
              className="w-9 h-9 rounded-full border-2 border-purple-400 shadow"
            />
            <div className="flex flex-col flex-1 min-w-0">
              <span className="font-bold text-purple-400 text-xs mb-1">
                Chatbot កូនពៅ
              </span>
              <div className="rounded-2xl overflow-hidden border-2 border-purple-500/40 bg-gradient-to-br from-slate-900/90 to-purple-950/90 p-4 shadow-2xl backdrop-blur-xl relative max-w-sm w-full">
                <div className="w-full h-52 sm:h-60 rounded-xl bg-purple-950/60 border border-purple-500/30 flex flex-col items-center justify-center p-4 relative overflow-hidden backdrop-blur-2xl">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center mb-3 shadow-lg shadow-purple-500/30">
                    <i className="fas fa-wand-magic-sparkles text-white text-xl animate-pulse"></i>
                  </div>
                  <h4 className="font-black text-sm text-purple-200 mb-1 text-center flex items-center gap-1.5">
                    <i className="fas fa-palette text-amber-400 text-xs"></i>
                    <span>កំពុងគូររូបភាព Meme...</span>
                  </h4>
                  <p className="text-[11px] text-purple-300/80 text-center font-medium mb-3">
                    ដំណើរការជាមួយ Gemini Nano Banana 2.1 & AI សូមរង់ចាំបន្តិចណា៎!
                  </p>
                  <div className="w-48 h-2 bg-purple-950 rounded-full overflow-hidden border border-purple-500/30">
                    <div className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 w-2/3 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
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

      {/* Chat Footer Input Area (Permanently pinned at bottom) */}
      {/* Chat Footer Input Area (Permanently pinned at bottom, ultra-clean & spacious) */}
      <footer
        className={`shrink-0 px-3 sm:px-4 pt-2 border-t backdrop-blur-md transition-colors z-30 ${
          isDark ? 'bg-slate-950/90 border-slate-800/80' : 'bg-white/90 border-slate-200/80 shadow-xs'
        }`}
        style={{
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0.65rem)'
        }}
      >
        {/* Staged Image Preview Chip */}
        {selectedImage && (
          <div className="mb-2 p-1.5 rounded-xl bg-blue-500/10 border border-blue-400/30 flex items-center justify-between max-w-sm animate-fade-in">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={selectedImage.previewUrl}
                alt="Selected preview"
                className="w-9 h-9 object-cover rounded-lg border border-blue-400 shadow-xs"
              />
              <div className="text-[11px] truncate">
                <span className="font-bold text-blue-400 block truncate">{selectedImage.name}</span>
                <span className="text-[9px] text-slate-400">ត្រៀមឱ្យ AI វិភាគ</span>
              </div>
            </div>
            <button
              onClick={removeSelectedImage}
              className="p-1 rounded-full text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
              title="លុបរូបភាពចេញ"
            >
              <i className="fas fa-times text-xs"></i>
            </button>
          </div>
        )}

        {/* Quick Suggestion Pills Bar (Thin, single row, smooth scroll) */}
        <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-1 text-[11px] no-scrollbar">
          <button
            onClick={() => handleRequestMeme()}
            disabled={!hasAgreed || isGeneratingMeme || isLoading}
            className={`px-3 py-1 rounded-full border font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer shadow-xs active:scale-95 ${
              !hasAgreed
                ? 'opacity-40 cursor-not-allowed bg-slate-800 text-slate-500 border-slate-700'
                : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-400/30 text-amber-500 dark:text-amber-300'
            }`}
          >
            <i className="fas fa-wand-magic-sparkles text-xs text-amber-400"></i>
            <span>សុំ Meme ៥ សន្លឹក</span>
          </button>

          <button
            onClick={() => {
              if (hasAgreed) fileInputRef.current?.click();
            }}
            disabled={!hasAgreed}
            className={`px-3 py-1 rounded-full border font-semibold flex items-center gap-1.5 transition shrink-0 shadow-xs active:scale-95 ${
              !hasAgreed
                ? 'opacity-40 cursor-not-allowed bg-slate-800 text-slate-500 border-slate-700'
                : 'bg-slate-100 dark:bg-slate-800/80 hover:bg-blue-500/10 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-400 cursor-pointer'
            }`}
          >
            <i className="fas fa-camera text-xs text-blue-400"></i>
            <span>វិភាគរូបភាព</span>
          </button>

          <button
            onClick={() => handleChat('Troll ឌឺខ្ញុំមួយមើល ថាស្ដេចឌឺច្បាស់ការឬអត់?')}
            disabled={!hasAgreed || isLoading}
            className={`px-3 py-1 rounded-full border font-semibold flex items-center gap-1.5 transition shrink-0 shadow-xs active:scale-95 ${
              !hasAgreed
                ? 'opacity-40 cursor-not-allowed bg-slate-800 text-slate-500 border-slate-700'
                : 'bg-slate-100 dark:bg-slate-800/80 hover:bg-blue-500/10 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-400 cursor-pointer'
            }`}
          >
            <i className="fas fa-fire text-xs text-amber-400"></i>
            <span>Troll ឌឺមួយមើល</span>
          </button>

          <button
            onClick={() => createNewSession()}
            disabled={!hasAgreed}
            className={`px-3 py-1 rounded-full border font-semibold flex items-center gap-1.5 transition shrink-0 shadow-xs active:scale-95 ${
              !hasAgreed
                ? 'opacity-40 cursor-not-allowed bg-slate-800 text-slate-500 border-slate-700'
                : 'bg-slate-100 dark:bg-slate-800/80 hover:bg-rose-500/10 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-rose-400 cursor-pointer'
            }`}
          >
            <i className="fas fa-rotate text-xs"></i>
            <span>ជជែកថ្មី</span>
          </button>
        </div>

        {/* ToDo Queued Prompt Chip (When user pressed enter/send while AI was thinking) */}
        {queuedPrompt && (
          <div className="mb-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-between gap-2 text-xs animate-fade-in shadow-xs backdrop-blur-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold text-[9px] uppercase tracking-wider flex items-center gap-1 shrink-0">
                <i className="fas fa-list-check text-[10px]"></i> ToDo
              </span>
              <span className="text-slate-700 dark:text-slate-200 truncate text-[11px] font-medium">
                ត្រៀមផ្ញើស្វ័យប្រវត្ត៖ <span className="text-blue-500 dark:text-blue-300 font-bold">"{queuedPrompt.text}"</span>
              </span>
            </div>
            <button
              onClick={() => {
                setInputText(queuedPrompt.text);
                if (queuedPrompt.image) setSelectedImage(queuedPrompt.image);
                setQueuedPrompt(null);
                queuedPromptRef.current = null;
              }}
              className="text-slate-400 hover:text-rose-400 p-1 rounded transition cursor-pointer shrink-0"
              title="កែសម្រួល ឬលុបចេញពី ToDo"
            >
              <i className="fas fa-times text-xs"></i>
            </button>
          </div>
        )}

        {/* Clean Capsule Input Bar */}
        <div className={`flex items-center gap-1.5 p-1 sm:p-1.5 rounded-2xl sm:rounded-3xl border shadow-sm transition-all focus-within:ring-2 ${
          !hasAgreed
            ? 'opacity-60 bg-slate-900/30 border-slate-800'
            : isDark
            ? 'bg-slate-900 border-slate-700/80 focus-within:border-blue-400/80 focus-within:ring-blue-500/20'
            : 'bg-white border-slate-200 focus-within:border-blue-500/80 focus-within:ring-blue-500/20'
        }`}>
          {/* Photo attach button */}
          <button
            onClick={() => {
              if (hasAgreed) fileInputRef.current?.click();
            }}
            disabled={!hasAgreed}
            className={`w-9 h-9 rounded-xl sm:rounded-2xl flex items-center justify-center transition shrink-0 ${
              !hasAgreed
                ? 'opacity-40 cursor-not-allowed text-slate-600'
                : selectedImage
                ? 'bg-blue-500 text-white shadow-xs cursor-pointer'
                : isDark
                ? 'text-slate-400 hover:text-blue-400 hover:bg-slate-800 cursor-pointer'
                : 'text-slate-500 hover:text-blue-600 hover:bg-slate-100 cursor-pointer'
            }`}
            title="ផ្ញើរូបភាព"
          >
            <i className="fas fa-image text-sm"></i>
          </button>

          {/* Text Input */}
          <input
            type="text"
            disabled={!hasAgreed || isGeneratingMeme}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessageOrQueue();
              }
            }}
            className="flex-1 bg-transparent px-2.5 py-1.5 outline-none text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 font-sans"
            placeholder={
              !hasAgreed
                ? 'សូមអាន Note និងចុចយល់ព្រមខាងលើសិន មុនពេលឆាត...'
                : isLoading
                ? 'AI កំពុងឆ្លើយ... អ្នកអាចវាយសំណួរបន្ទាប់ត្រៀមទុក!'
                : selectedImage
                ? `វាយសំណួរ ឬពាក្យបញ្ជាឱ្យ ${userGender === 'ប្រុស' ? 'ចែ' : 'Daddy'} Roast រូបនេះ...`
                : userGender === 'ប្រុស'
                ? 'និយាយមកអាប្អូនប្រុស... កុំរត់ចោល ចែ/Mommy បាទ!'
                : 'និយាយមកកូនស្រី... កុំរត់ចោល Daddy បាទ!'
            }
          />

          {/* Send / Queue button */}
          <button
            onClick={handleSendMessageOrQueue}
            disabled={!hasAgreed || isGeneratingMeme || (!inputText.trim() && !selectedImage && !queuedPrompt)}
            className={`w-9 h-9 rounded-xl sm:rounded-2xl flex items-center justify-center transition active:scale-95 shadow-sm shrink-0 ${
              !hasAgreed || (!inputText.trim() && !selectedImage && !queuedPrompt)
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-40'
                : isLoading
                ? 'bg-gradient-to-tr from-amber-500 to-blue-600 text-white shadow-amber-500/25 cursor-pointer'
                : 'bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/25 cursor-pointer'
            }`}
            title={
              isLoading
                ? 'ចុចដើម្បីដាក់ចូល ToDo (ត្រៀមផ្ញើស្វ័យប្រវត្តពេល AI ឆ្លើយចប់)'
                : 'ផ្ញើសារ'
            }
          >
            {isLoading ? (
              <i className="fas fa-clock animate-pulse text-xs"></i>
            ) : (
              <i className="fas fa-paper-plane text-xs"></i>
            )}
          </button>
        </div>
      </footer>

      {/* Custom Meme Prompt Modal */}
      <MemePromptModal
        isOpen={showMemeModal}
        onClose={() => setShowMemeModal(false)}
        onSubmit={(customIdea) => {
          setShowMemeModal(false);
          handleExecuteMeme(customIdea);
        }}
        botPersona={userGender === 'ប្រុស' ? 'ចែ' : 'Daddy'}
        isDark={isDark}
        isGenerating={isGeneratingMeme}
      />

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

      {/* Error Reporting Modal to Rotana NOB */}
      <ErrorReportModal
        isOpen={errorReportModalOpen}
        onClose={() => setErrorReportModalOpen(false)}
        defaultUsername={username}
        bot="konpov"
        initialIssue={errorReportInitialText}
        isDark={isDark}
      />
    </div>
  );
}
