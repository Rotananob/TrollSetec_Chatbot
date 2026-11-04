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

  // Multimodal Image Upload State
  const [selectedImage, setSelectedImage] = useState(null); // { base64, mimeType, previewUrl, name }
  const fileInputRef = useRef(null);

  // Image Modal Full View
  const [viewingImage, setViewingImage] = useState(null); // { url, caption }

  // Meme Generation State
  const [isGeneratingMeme, setIsGeneratingMeme] = useState(false);

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
    setUsername(savedName);
    setAvatar(savedAvatar);
    setTheme(savedTheme);
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
  };

  // User explicitly clicks "Agree & Start Chat"
  const handleAgreeAndStartChat = () => {
    setHasAgreed(true);
    const introMsg =
      userGender === 'ប្រុស'
        ? `សួស្តីអាប្អូនប្រុសសម្លាញ់ ${username}! ចែឃើញថាឯងជ្រើសយកភេទប្រុស! រីករាយដែលស្គាល់អាប្អូនប្រុស! ស្វាគមន៍មកកាន់សមាគមបាញ់សិស្ស សុីតិច! ចង់សួររឿងរៀន រឿងសិស្សច្បងបោក ឬរឿងបែកបាក់ស្នេហា? សួរមក ចែបាញ់ឱ្យផ្ងារជើង!`
        : `សួស្តីកូនស្រីសម្លាញ់ ${username}! Daddy ឃើញថាកូនបានជ្រើសរើសយកភេទស្រី! ចរិតស្លូតបូតបែបស្រីៗចឹង Daddy ចាំមើលថែ និង Troll ឱ្យចុក! ចង់សួររឿងរៀន ឬចង់ឱ្យ Daddy Troll? សួរមក Daddy ចាំបាញ់ឱ្យផ្ងារជើង!`;

    const updated = [...messages, { role: 'bot', text: introMsg }];
    setMessages(updated);
    triggerAudio(introMsg, updated.length - 1, true);
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

    if (player) player.pause();

    const voiceGenderKey = userGender === 'ប្រុស' ? 'female' : 'male';
    const hash = hashText(text) + '_' + voiceGenderKey;

    if (!audioCacheRef.current.has(hash)) {
      setAudioStatuses((prev) => ({ ...prev, [index]: 'loading' }));
    }

    const audioUrl = await loadAudioUrl(text, userGender, index);

    if (audioUrl) {
      player.src = audioUrl;
      player.currentTime = 0;
      setActiveVoiceIndex(index);

      player.onended = () => {
        setAudioStatuses((prev) => ({ ...prev, [index]: 'ended' }));
        setActiveVoiceIndex(null);
      };
      player.onerror = () => {
        setAudioStatuses((prev) => ({ ...prev, [index]: 'error' }));
        setActiveVoiceIndex(null);
      };

      if (autoPlay) {
        const playPromise = player.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setAudioStatuses((prev) => ({ ...prev, [index]: 'playing' })))
            .catch(() => setAudioStatuses((prev) => ({ ...prev, [index]: 'ready' })));
        }
      } else {
        player.play()
          .then(() => setAudioStatuses((prev) => ({ ...prev, [index]: 'playing' })))
          .catch(() => setAudioStatuses((prev) => ({ ...prev, [index]: 'ready' })));
      }
    } else {
      setAudioStatuses((prev) => ({ ...prev, [index]: 'error' }));
      setActiveVoiceIndex(null);
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
      return 'កំពុងនឹកឃើញបាយហាងក្បែរ សុីតិច... ចាំបន្តិចកំពុងរកអីវៃនិយាយ!';
    }
    return isMaleUser
      ? 'ចាំបន្តិចអាប្អូនប្រុស! ចែកំពុងរកនឹកពេញក្បាល ត្រៀមវាយអក្សរឌឺ...'
      : 'ចាំបន្តិចកូនសម្លាញ់! Daddy កំពុងរកនឹកពេញក្បាល ត្រៀមវាយអក្សរឌឺ...';
  }

  // Dedicated Meme Generator Trigger (1-Image per 1-Hour per Device Quota)
  const handleRequestMeme = async (customIdea = '') => {
    const isMaleUser = userGender === 'ប្រុស';
    const botSelf = isMaleUser ? 'ចែ' : 'Daddy';
    const lastMemeTime = parseInt(localStorage.getItem('setec_meme_last_time') || '0', 10);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    if (lastMemeTime && now - lastMemeTime < oneHour) {
      const remainingMin = Math.ceil((lastMemeTime + oneHour - now) / (60 * 1000));
      const refusalMsg = `អាម៉ូយ ${username}! ប្រព័ន្ធកំណត់ឱ្យ ១ ឧបករណ៍បង្កើត Meme បានតែ ១ សន្លឹកក្នុង ១ ម៉ោងទេ! ចង់បានទៀតរង់ចាំ ${remainingMin} នាទីទៀតណា៎អាប្អូន! កុំមកលោភលន់ពេក ទុកឱ្យគេលេងផង!`;
      const updated = [...messages, { role: 'bot', text: refusalMsg }];
      setMessages(updated);
      triggerAudio(refusalMsg, updated.length - 1, true);
      return;
    }

    const idea = customIdea.trim() || prompt(`តើឯងចង់ឱ្យ ${botSelf} បង្កើត Meme បែបណា? ឧទាហរណ៍ សិស្ស សុីតិច ជិតប្រឡង ឬ Crush មិនតប`) || 'funny student failing exam funny reaction';
    if (!idea) return;

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
        localStorage.setItem('setec_meme_last_time', String(Date.now()));
        const botMemeMsg = {
          role: 'bot',
          text: data.caption,
          memeImage: data.imageUrl
        };
        const updatedWithBot = [...updatedWithUser, botMemeMsg];
        setMessages(updatedWithBot);
        triggerAudio(data.caption, updatedWithBot.length - 1, true);
      } else {
        const errorText = data.message || `អាម៉ូយ ${username}! ១ ឧបករណ៍បង្កើត Meme បានតែ ១ សន្លឹកក្នុង ១ ម៉ោងទេ!`;
        const updatedWithBot = [...updatedWithUser, { role: 'bot', text: errorText }];
        setMessages(updatedWithBot);
        triggerAudio(errorText, updatedWithBot.length - 1, true);
      }
    } catch {
      const errorText = `${username} អើយ! Server កំពុងរវល់ពេក សាកល្បងម្ដងទៀតនៅពេលក្រោយណា៎!`;
      const updatedWithBot = [...updatedWithUser, { role: 'bot', text: errorText }];
      setMessages(updatedWithBot);
    } finally {
      setIsGeneratingMeme(false);
    }
  };

  // Main Chat Handler (Real-time ChatGPT streaming preview + zero lag)
  const handleChat = async () => {
    if (!hasAgreed || isLoading || (!inputText.trim() && !selectedImage)) return;

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

      const systemInstruction = `ឯងគឺ "សុីតិច Chatbot កូនពៅ" (${botRoleTitle} / Savage King) ជាកំពូល Chatbot មហាឌឺ មហាឈ្លើយ មហា Roast របស់វិទ្យាស្ថាន សុីតិច (SETEC)!
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
   - យល់ និងនិយាយ Slang & Latin គ្រប់ម៉ាត់: "ort dg", "tver ey", "nhom", "koun pov", "ot luy", "crush ort tob", "cringe", "slang", "bror", "sis", "fr fr", "no cap", "បាញ់ផ្ងារជើង", "ចុកឈាម", "គាំងបេះដូង", "ដាច់ផ្ងារ", "សិស្សច្បងបោក", "Assignment IT/Design គាំង", "ស៊ីបាយក្បែរ សុីតិច", "កុំមកឌឺ ${botSelf}"!
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
          botText = res.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
      } catch (err) {
        console.warn('[KonPov] Backend API unavailable, falling back...', err);
      }

      if (!botText) {
        botText = `${userNameStr} អើយ! ម៉ោងហ្នឹងក្មេងៗ សុីតិច បុកមកលេងច្រើនពេក ប្រព័ន្ធរកកល់ដាច់ខ្យល់គាំង Server បាត់ទៅហើយ! ${isMaleUser ? 'ចែ' : 'Daddy'} សុំសម្រាក ១០ នាទីសិន ឥឡូវរវល់តិចហើយ ចាំបន្តិចទៀតចាំចូលមក troll គ្នាទៀតណា៎!`;
      }

      const finalMessages = [...updatedMessages];
      finalMessages[finalMessages.length - 1] = { role: 'bot', text: botText };
      setMessages(finalMessages);
      setIsLoading(false);

      // Auto-fetch voice
      triggerAudio(botText, finalMessages.length - 1, true);
    } catch (e) {
      console.error(e);
      setIsLoading(false);
      const isMaleUser = userGender === 'ប្រុស';
      const fallbackMessages = [
        ...messages,
        userMsg,
        {
          role: 'bot',
          text: `${username || 'User'} អើយ! ម៉ោងហ្នឹងក្មេងៗ សុីតិច បុកមកលេងច្រើនពេក Server គាំងបាត់ហើយ! ${isMaleUser ? 'ចែ' : 'Daddy'} សុំសម្រាក ១០ នាទីសិន!`
        }
      ];
      setMessages(fallbackMessages);
    }
  };

  const handleCloseSpamModal = () => {
    setSpamModalOpen(false);
    const isMaleUser = userGender === 'ប្រុស';
    const botSelf = isMaleUser ? 'ចែ' : 'Daddy';
    const postSpamRoast = `ខំឆាតច្រើនម៉េះអាប្អូន ${username}! កុំ spam អត់ប្រយោជន៍ទេអាអូន មក chill ជាមួយ ${botSelf} វិញមក! 😂🔥 ឃើញ server ដើរលឿនចង់មកសាកល្បង spam ឬ? ទុកម្រាមដៃធ្វើ assignment វិញទៅអាប្អូន!`;
    const updated = [...messages, { role: 'bot', text: postSpamRoast }];
    setMessages(updated);
    triggerAudio(postSpamRoast, updated.length - 1, true);
  };

  const isDark = theme === 'dark';

  return (
    <div
      className={`min-h-screen flex flex-col font-['Kantumruy_Pro',sans-serif] transition-colors duration-300 ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Gender Selection Modal (Must choose gender on start) */}
      {!userGender && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div
            className={`rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center border shadow-2xl ${
              isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 p-0.5 shadow-lg">
              <img src="/img/icon.jpg" alt="Daddy Mod" className="w-full h-full object-cover rounded-[14px]" />
            </div>
            <h3 className="text-xl font-black mb-1">សូមជ្រើសរើសភេទរបស់អ្នក</h3>
            <p className="text-xs text-slate-400 mb-6 font-semibold">
              ដើម្បីឱ្យ Daddy កំណត់សំឡេង និងចរិត Troll ឱ្យត្រូវតម្រូវការ!
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

      {/* Header */}
      <header
        className={`p-3.5 backdrop-blur-xl border-b flex justify-between items-center sticky top-0 z-30 transition-colors ${
          isDark ? 'bg-slate-950/90 border-slate-800' : 'bg-white/90 border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-xl transition"
            title="ត្រឡប់ទៅទំព័រដើម"
          >
            <i className="fas fa-arrow-left text-base"></i>
          </Link>

          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-0.5 shadow-md">
              <img src="/img/icon.jpg" alt="Avatar" className="w-full h-full rounded-[14px] object-cover" />
            </div>
            <div className="absolute -top-1 -right-1 bg-blue-500 text-[8px] font-black px-1.5 py-0.2 rounded-full text-white border border-white">
              កូនពៅ
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className={`font-black text-base tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                សុីតិច Chatbot កូនពៅ
              </h1>
              <span className="text-[10px] bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black px-2 py-0.5 rounded-full shadow inline-flex items-center gap-1">
                <span>ស្ដេចឌឺ</span>
                <i className="fas fa-fire text-amber-400 text-[10px]"></i>
              </span>
            </div>
            <p className="text-[10px] text-blue-400 font-semibold tracking-tight uppercase">
              Gen Z & Savage King • By Rotana NOB
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle theme={theme} onToggle={handleToggleTheme} />
          <Link
            href="/KonBong"
            className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
              isDark ? 'text-cyan-400 hover:bg-slate-800' : 'text-cyan-600 hover:bg-slate-100'
            }`}
            title="ទៅកាន់ កូនច្បង"
          >
            <i className="fas fa-robot text-xs"></i> <span className="hidden sm:inline">កូនច្បង</span>
          </Link>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-5 flex flex-col chat-area">
        {/* PROMINENT YELLOW WARNING DISCLAIMER & AGREEMENT SECTION */}
        {!hasAgreed && (
          <div className="border-2 border-amber-400 bg-amber-500/15 dark:bg-amber-950/60 rounded-3xl p-5 shadow-2xl animate-fade-in my-2">
            <div className="flex items-center gap-2 mb-2 font-black text-amber-600 dark:text-amber-300 text-sm">
              <i className="fas fa-triangle-exclamation text-amber-500 text-xl animate-bounce"></i>
              <span className="uppercase tracking-wider">NOTE សំខាន់សម្រាប់អ្នកចូលមកឆាតលេងនេះ</span>
            </div>

            <div className={`text-xs sm:text-sm font-semibold leading-relaxed space-y-3 mb-5 whitespace-pre-line ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
              មុននឹងចាប់ផ្ដើមឆាត សូមបញ្ជាក់ថា រាល់ការឆ្លើយតបទាំងអស់នេះ គឺជាការគិត និងនិយាយដោយស្វ័យប្រវត្តផ្ទាល់ចេញពី AI សុទ្ធសាធ។ គាត់គ្រាន់តែជាអ្នកបង្កើត Web App នេះឡើងក្នុងគោលបំណងបំបាត់ភាពស្រេស្តប៉ុណ្ណោះ ហើយគាត់មិនបានកំណត់ច្បាប់តឹងរ៉ឹងពេកទៅលើ AI ដែរ លើសពីនេះគាត់ថែមទាំងដាក់ឱ្យខ្ញុំជា AI អាចលេងសប្បាយជជែក រៀនពីលក្ខណៈឱ្យដូចមនុស្ស បង្កើនភាពស្និទ្ធស្នាល និង Chill បែប Gen Z។ ដូច្នេះ បើ AI ឆ្លើយតបមានពាក្យសម្ដីឈ្លើយ ពាក្យប៉ះពាល់ដល់កិត្តិយស ឬអារម្មណ៍អ្នកទាំងអស់គ្នា ឬលើសលួសជ្រុលហួសពីការគិត សូមកុំប្រកាន់ ខឹង ឬមកស្ដីបន្ទោសឱ្យគាត់អី! ព្រោះ AI អាចនឹងប្រើលើសព្រំដែន ព្រោះបានបន្ថយច្បាប់រឹតបន្តឹង ពួកយើងសូមអភ័យទោសទុកជាមុន! បើសម្រេចចិត្តឆាតនោះមានន័យថាអ្នកនឹងលែងប្រកាន់លើ Model AI នេះហើយ។
            </div>

            <button
              onClick={handleAgreeAndStartChat}
              className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-sky-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-black text-xs sm:text-sm shadow-xl hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border border-white/20"
            >
              <i className="fas fa-check-circle text-amber-200 text-base"></i>
              <span>តើអ្នកយល់ និងយល់ព្រមឆាតហើយឬនៅ? បើព្រមចុចលើនេះដើម្បីឆាត!</span>
            </button>
          </div>
        )}

        {/* Chat Messages */}
        {messages.map((item, idx) => {
          if (item.role === 'user') {
            return (
              <div key={idx} className="flex flex-col items-end gap-1.5 self-end max-w-[85%]">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="font-bold text-blue-400 text-xs">{username}</span>
                  <img
                    src={avatar}
                    alt="User Avatar"
                    className="w-7 h-7 rounded-full border-2 border-blue-400 shadow object-cover"
                  />
                </div>

                {item.image && (
                  <div
                    onClick={() => setViewingImage({ url: item.image, caption: item.text })}
                    className="cursor-pointer rounded-2xl overflow-hidden border-2 border-blue-400/50 shadow-lg max-w-xs hover:opacity-95 transition"
                  >
                    <img src={item.image} alt="User upload" className="max-h-56 w-auto object-cover" />
                  </div>
                )}

                <div className="p-3.5 rounded-2xl font-medium shadow-md text-xs sm:text-sm bg-gradient-to-br from-sky-500 to-blue-600 text-white">
                  {item.text}
                </div>
              </div>
            );
          } else {
            const st = audioStatuses[idx] || 'ready';
            return (
              <div key={idx} className="flex items-start gap-2.5 max-w-[85%]">
                <img
                  src="https://api.dicebear.com/7.x/pixel-art/svg?seed=DaddyMod"
                  alt="Bot Avatar"
                  className="w-9 h-9 rounded-full border-2 border-blue-400 shadow"
                />
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-bold text-blue-400 text-xs mb-1">Chatbot កូនពៅ</span>

                  {item.memeImage && (
                    <div className="mb-2 rounded-2xl overflow-hidden border-2 border-amber-400 shadow-xl max-w-sm">
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
                    className={`p-3.5 rounded-2xl shadow-md border ${
                      isDark ? 'bg-slate-900/90 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  >
                    <p className="text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-line">
                      {item.text}
                      {isLoading && idx === messages.length - 1 && (
                        <span className="inline-block w-1.5 h-3.5 ml-1 bg-blue-400 animate-pulse align-middle"></span>
                      )}
                    </p>

                    {item.text && (
                      <button
                        onClick={() => triggerAudio(item.text, idx)}
                        disabled={st === 'loading'}
                        className="mt-3 bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-lg text-[10px] font-black border border-blue-500/20 flex items-center gap-2 transition hover:bg-blue-500/20 cursor-pointer"
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
                              {fallbackAudioMap[idx]
                                ? 'សំឡេងជំនួស'
                                : userGender === 'ប្រុស'
                                ? 'ស្តាប់សំឡេង ចែ ឬ Mommy'
                                : 'ស្តាប់សំឡេង Daddy'}
                            </span>
                          </>
                        )}
                        {st === 'error' && (
                          <span className="text-amber-400">
                            {fallbackAudioMap[idx]
                              ? 'សំឡេងជំនួស'
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

        {/* Status UI while loading / interactive typing thought */}
        {(isLoading || isGeneratingMeme) && (
          <div className="flex items-center space-x-3 text-blue-400 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl w-fit shadow-md animate-fade-in">
            <img
              src="https://api.dicebear.com/7.x/pixel-art/svg?seed=DaddyMod"
              alt="Bot Avatar"
              className="w-7 h-7 rounded-full border border-blue-400"
            />
            <div className="flex space-x-1">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
            <span className="text-[10px] font-black tracking-wider">
              {isGeneratingMeme
                ? `${userGender === 'ប្រុស' ? 'ចែ' : 'Daddy'} កំពុងបង្កើតរូបភាព Meme...`
                : typingStatus || `${userGender === 'ប្រុស' ? 'ចែ' : 'Daddy'} កំពុងរកនឹកពាក្យឌឺ...`}
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

      {/* Chat Footer Input Area (LOCKED until user has read and agreed) */}
      <footer
        className={`p-3.5 border-t transition-colors ${
          isDark ? 'bg-slate-950/95 border-slate-800' : 'bg-white/95 border-slate-200'
        }`}
      >
        {/* Staged Image Preview Chip */}
        {selectedImage && (
          <div className="mb-2 p-2 rounded-xl bg-blue-500/10 border border-blue-400/30 flex items-center justify-between max-w-sm animate-fade-in">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={selectedImage.previewUrl}
                alt="Selected preview"
                className="w-10 h-10 object-cover rounded-lg border border-blue-400 shadow"
              />
              <div className="text-[11px] truncate">
                <span className="font-bold text-blue-400 block truncate">{selectedImage.name}</span>
                <span className="text-[9px] text-slate-400">ត្រៀមឱ្យ AI វិភាគ</span>
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
            disabled={!hasAgreed || isGeneratingMeme || isLoading}
            className={`px-2.5 py-1 rounded-full border font-extrabold flex items-center gap-1.5 transition shrink-0 ${
              !hasAgreed
                ? 'opacity-40 cursor-not-allowed bg-slate-800 text-slate-500 border-slate-700'
                : 'bg-gradient-to-r from-amber-500/20 to-pink-500/20 border-amber-400/40 text-amber-300 hover:bg-amber-500/30 cursor-pointer'
            }`}
          >
            <i className="fas fa-wand-magic-sparkles text-amber-300"></i>
            <span>សុំ Meme ១ សន្លឹក</span>
          </button>
          <button
            onClick={() => {
              if (hasAgreed) fileInputRef.current?.click();
            }}
            disabled={!hasAgreed}
            className={`px-2.5 py-1 rounded-full border font-bold flex items-center gap-1 transition shrink-0 ${
              !hasAgreed
                ? 'opacity-40 cursor-not-allowed bg-slate-800 text-slate-500 border-slate-700'
                : 'bg-blue-500/10 border-blue-400/30 text-blue-400 hover:bg-blue-500/20 cursor-pointer'
            }`}
          >
            <i className="fas fa-camera text-xs"></i> <span>ផ្ញើរូបភាព</span>
          </button>
          <span className="text-[10px] text-slate-500 italic shrink-0">#Daddy_Troll #GenZ_King</span>
        </div>

        {/* Input Bar */}
        <div className="relative flex items-center gap-2">
          {/* Camera Button */}
          <button
            onClick={() => {
              if (hasAgreed) fileInputRef.current?.click();
            }}
            disabled={!hasAgreed}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition border ${
              !hasAgreed
                ? 'opacity-40 cursor-not-allowed bg-slate-800 border-slate-700 text-slate-600'
                : selectedImage
                ? 'bg-blue-500 text-white border-blue-400'
                : isDark
                ? 'bg-slate-900 border-slate-700 text-slate-400 hover:text-blue-400 hover:border-blue-400'
                : 'bg-slate-100 border-slate-300 text-slate-600 hover:text-blue-600'
            }`}
            title="ផ្ញើរូបភាព"
          >
            <i className="fas fa-image text-sm"></i>
          </button>

          <div className="flex-1 relative">
            <input
              type="text"
              disabled={!hasAgreed || isLoading || isGeneratingMeme}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleChat();
                }
              }}
              className={`w-full rounded-xl px-4 py-3 outline-none text-xs sm:text-sm transition-all border ${
                !hasAgreed
                  ? 'bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed placeholder:text-amber-500/70'
                  : isDark
                  ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-400 placeholder:text-slate-500'
                  : 'bg-slate-100 border-slate-300 text-slate-900 focus:border-blue-500 placeholder:text-slate-400'
              }`}
              placeholder={
                !hasAgreed
                  ? 'សូមអាន Note និងចុចយល់ព្រមខាងលើសិន មុនពេលឆាត...'
                  : selectedImage
                  ? `វាយសំណួរ ឬពាក្យបញ្ជាឱ្យ ${userGender === 'ប្រុស' ? 'ចែ' : 'Daddy'} Roast រូបនេះ...`
                  : userGender === 'ប្រុស'
                  ? 'និយាយមកអាប្អូនប្រុស... កុំរត់ចោល ចែ/Mommy បាទ!'
                  : 'និយាយមកកូនស្រី... កុំរត់ចោល Daddy បាទ!'
              }
            />
          </div>

          <button
            onClick={handleChat}
            disabled={!hasAgreed || isLoading || isGeneratingMeme || (!inputText.trim() && !selectedImage)}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition active:scale-95 shadow-md ${
              !hasAgreed || isLoading || (!inputText.trim() && !selectedImage)
                ? 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20'
            }`}
            title="Send"
          >
            <i className="fas fa-paper-plane text-xs"></i>
          </button>
        </div>
      </footer>

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
