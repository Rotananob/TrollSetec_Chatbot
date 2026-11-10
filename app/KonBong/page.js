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
import ContributeKnowledgeModal from '@/components/ContributeKnowledgeModal';
import SmartCacheWarningModal from '@/components/SmartCacheWarningModal';
import { shouldShowCacheWarning } from '../utils/clientCacheMonitor';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import { getApiEndpoint } from '../utils/apiConfig';
import { compressAvatarImage, saveAvatarToStorage, removeAvatarFromStorage, DEFAULT_USER_AVATAR } from '../utils/imageStorage';
import { initSecurityShield } from '../utils/securityShield';
import {
  getLiveSessionState,
  touchLiveSession,
  setServerCooldownLock,
  formatCountdown,
  isCreatorUsername,
  clearLiveSession
} from '../utils/chatSessionLimit';
import SessionBreakModal from '@/components/SessionBreakModal';
import SetecSurvivalModal from '@/components/SetecSurvivalModal';
import TrollQuoteModal from '@/components/TrollQuoteModal';
import { getSmartCutoffResponse } from '../../lib/smartCutoff';
import { stopAllGlobalAudio, registerGlobalAudioSource, registerGlobalAudioPlayer, registerGlobalAudioTimer } from '../utils/audioController';
import {
  validateBypassToken,
  getLiveSession,
  updateLiveSessionState,
  sendLiveMessage,
  subscribeToLiveSession,
  addSessionLog,
  saveChatSessionToDatabase,
  loadChatSessionsFromDatabase,
  deleteChatSessionFromDatabase,
  deleteAllChatSessionsFromDatabase
} from '../utils/realtimeChat';
import { buildGeminiMultiTurnContents } from '../utils/geminiHistoryFormatter';

const getChatEndpoint = () => getApiEndpoint('/api/chat');
const getMemeEndpoint = () => getApiEndpoint('/api/generate-meme');

const getBypassHeaders = () => {
  if (typeof window === 'undefined') return {};
  const adminSecret = sessionStorage.getItem('rotana_admin_passcode');
  const isSessionBypassed =
    sessionStorage.getItem('rotana_maintenance_bypass') ||
    localStorage.getItem('rotana_maintenance_bypass');
  const headers = {};
  if (adminSecret) {
    headers['x-rotana-secret-key'] = adminSecret;
  }
  if (isSessionBypassed) {
    headers['x-rotana-bypass'] = 'rotana2026';
  }
  return headers;
};

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

  // Live Support Intervention State (Rotana NOB Bypass & Realtime Sync)
  const [isRotanaAdmin, setIsRotanaAdmin] = useState(false);
  const [clientUsername, setClientUsername] = useState('User');
  const [bypassAccessDenied, setBypassAccessDenied] = useState(false);
  const [activeLiveSessionId, setActiveLiveSessionId] = useState(null);
  const [isRotanaOnline, setIsRotanaOnline] = useState(false);
  const [isBotPaused, setIsBotPaused] = useState(false);
  const [sessionLogs, setSessionLogs] = useState([]);
  const [countdownRemaining, setCountdownRemaining] = useState(null);
  const countdownIntervalRef = useRef(null);

  // Custom Delete History Modal State
  const [deleteModalConfig, setDeleteModalConfig] = useState(null); // { isOpen, type: 'all'|'single', sessionId, title, description }

  // Upgraded Feature 1: Savage Troll Level (gentle, medium, savage)
  const [savageLevel, setSavageLevel] = useState('savage');
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [showBotMenu, setShowBotMenu] = useState(false);
  const [showPersonaModal, setShowPersonaModal] = useState(false);

  // Upgraded Feature 2: Audio Playback Speed (1.0x, 1.25x, 1.5x, 2.0x)
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

  // Upgraded Feature 3: One-Click Copy Feedback
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [emojiShowerList, setEmojiShowerList] = useState([]);

  // Anti-Spam Scary/Funny Modal State
  const [spamModalOpen, setSpamModalOpen] = useState(false);
  const [spamInfo, setSpamInfo] = useState({ ip: '', device: '', retryAfter: 60 });
  const [spamLockUntil, setSpamLockUntil] = useState(0);
  const [fallbackAudioMap, setFallbackAudioMap] = useState({});
  const [botReadingNotice, setBotReadingNotice] = useState(false);
  const [aiReadingNotice, setAiReadingNotice] = useState(false);

  // Error Report to Rotana NOB Modal State
  const [errorReportModalOpen, setErrorReportModalOpen] = useState(false);
  const [errorReportInitialText, setErrorReportInitialText] = useState('');
  const [alertSentMap, setAlertSentMap] = useState({});
  const [contributeModalOpen, setContributeModalOpen] = useState(false);
  const [cacheWarningOpen, setCacheWarningOpen] = useState(false);
  const [isSurvivalModalOpen, setIsSurvivalModalOpen] = useState(false);
  const [quoteModalData, setQuoteModalData] = useState(null);

  // Real-time Bot Pause State synced directly from Firebase RTDB (Rotana Admin Control)
  const [botPauseState, setBotPauseState] = useState({ isPaused: false, notice: '' });

  // ToDo / Queued Prompt State (allows typing and queuing while AI is thinking)
  const [queuedPrompt, setQueuedPrompt] = useState(null); // { text, image }
  const queuedPromptRef = useRef(null);

  // Multimodal Image Upload State
  const [selectedImage, setSelectedImage] = useState(null); // { base64, mimeType, previewUrl, name }
  const fileInputRef = useRef(null);

  // Image Modal Full View
  const [viewingImage, setViewingImage] = useState(null); // { url, caption }

  // Meme Generation State
  const [isGeneratingMeme, setIsGeneratingMeme] = useState(false);
  const [showMemeModal, setShowMemeModal] = useState(false);

  const [username, setUsername] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('chatbot_username') || 'User';
      } catch {
        return 'User';
      }
    }
    return 'User';
  });
  const isCreatorUser = Boolean(
    isRotanaAdmin ||
    isCreatorUsername(username) ||
    (typeof window !== 'undefined' && (
      isCreatorUsername(localStorage.getItem('chatbot_username') || '') ||
      localStorage.getItem('troll_rotana_bypass') === '1'
    ))
  );
  const [userGender, setUserGender] = useState('');
  const [userAge, setUserAge] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('chatbot_user_age') || '';
      } catch {
        return '';
      }
    }
    return '';
  });
  const [isRotanaMasterBypass, setIsRotanaMasterBypass] = useState(false);
  const [avatar, setAvatar] = useState('https://api.dicebear.com/7.x/adventurer/svg?seed=Student');

  // 30-Minute Live Chat Session & 10-Minute Cooldown Manager State (Anti-Bypass)
  const [sessionState, setSessionState] = useState({
    sessionStart: null,
    cooldownUntil: null,
    isLocked: false,
    remainingSessionSec: 1800,
    remainingCooldownSec: 0
  });

  const chatBottomRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const activeAudioUrlRef = useRef(null);
  const audioCacheRef = useRef(new Map());
  const pendingAudioFetchesRef = useRef(new Map());
  const audioDataMapRef = useRef(new Map());
  const audioBufferCacheRef = useRef(new Map());
  const audioContextRef = useRef(null);
  const activeSourceNodeRef = useRef(null);
  const autoPlayTimerRef = useRef(null);
  const [audioStates, setAudioStates] = useState({}); // key: msgIndex -> 'loading'|'ready'|'playing'|'paused'|'ended'|'error'
  const [activeAudioIndex, setActiveAudioIndex] = useState(null);
  const [isTtsMuted, setIsTtsMuted] = useState(false);
  const isTtsMutedRef = useRef(false);
  const [audioCountdownMap, setAudioCountdownMap] = useState({});
  const audioCountdownTimerRef = useRef(null);
  const activeAudioAbortCtrlRef = useRef(null);
  const activeAudioRequestRef = useRef(0);
  const consecutiveErrorsRef = useRef(0);

  // Helper to decode Base64 string to ArrayBuffer for Web Audio API
  function base64ToArrayBuffer(b64Data) {
    try {
      if (!b64Data || typeof b64Data !== 'string') return null;
      const cleanB64 = b64Data.replace(/^data:[^;]+;base64,/, '').replace(/\s+/g, '');
      if (!cleanB64) return null;
      const binStr = atob(cleanB64);
      const len = binStr.length;
      if (len === 0) return null;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binStr.charCodeAt(i);
      return bytes.buffer;
    } catch {
      return null;
    }
  }

  // Synchronously initialize and unlock Web Audio API Context (Critical for iOS Safari)
  const getOrCreateAudioContext = () => {
    if (typeof window === 'undefined') return null;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }
      return audioContextRef.current;
    } catch {
      return null;
    }
  };

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

  function createAudioBlob(b64Data, mimeType = null) {
    try {
      if (!b64Data || typeof b64Data !== 'string') return null;
      const cleanB64 = b64Data.replace(/^data:[^;]+;base64,/, '').replace(/\s+/g, '');
      if (!cleanB64) return null;
      const binStr = atob(cleanB64);
      const len = binStr.length;
      if (len === 0) return null;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binStr.charCodeAt(i);

      // 1. Detect WAV container by RIFF magic header (bytes 0-3: 'RIFF')
      const isWav = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
      if (isWav) {
        return new Blob([bytes], { type: 'audio/wav' });
      }

      // 2. Explicit mimeType checks
      if (mimeType && (mimeType.includes('mpeg') || mimeType.includes('mp3'))) {
        return new Blob([bytes], { type: 'audio/mpeg' });
      }
      if (mimeType && mimeType.includes('wav')) {
        return new Blob([bytes], { type: 'audio/wav' });
      }

      // 3. Detect MP3 container by ID3 tag ('ID3') or MPEG frame sync (0xFF 0xEx)
      const isMp3 =
        (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) ||
        (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
      if (isMp3) {
        return new Blob([bytes], { type: 'audio/mpeg' });
      }

      // 4. Fallback: Default to audio/mpeg container for universal browser playback
      return new Blob([bytes], { type: 'audio/mpeg' });
    } catch (err) {
      console.warn('[Audio] createAudioBlob error:', err);
      return null;
    }
  }

  // Clean markdown and non-spoken characters for clean Khmer TTS speech
  function cleanSpeechText(str) {
    if (!str || typeof str !== 'string') return '';
    return str
      .replace(/SETEC|Setec|setec/gi, 'ស៊ីតិច')
      .replace(/https?:\/\/\S+/gi, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/_(.*?)_/g, '$1')
      .replace(/#{1,6}\s+/g, '')
      .replace(/`{1,3}[^`]*`{1,3}/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[^\u1780-\u17FFa-zA-Z0-9\s.,!?៖។\n\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 450);
  }

  // Fetch TTS Audio
  async function fetchAudio(text, index) {
    // HARD AUDIO GATE: If voice is muted/shut down, NEVER fetch from server
    if (isTtsMutedRef.current || isTtsMuted) return null;
    if (!text || typeof text !== 'string' || !text.trim()) return null;
    try {
      const speechText = cleanSpeechText(text);
      if (!speechText) return null;
      if (isTtsMutedRef.current || isTtsMuted) return null;
      const deviceId = getDeviceId();
      const endpoint = getApiEndpoint('/api/chat');

      // USER FEMALE (ស្រី) -> DADDY Voice ('Puck' / Male)
      // USER BOY (ប្រុស) -> MOMMY Voice ('Aoede' / Female)
      const activeGender = userGender || (typeof window !== 'undefined' ? localStorage.getItem('chatbot_gender') : '') || 'ប្រុស';
      const isFemaleUser = activeGender === 'ស្រី' || /ស្រី|female|girl/i.test(activeGender);
      const voiceName = isFemaleUser ? 'Puck' : 'Aoede';
      const voiceTag = isFemaleUser ? 'daddy' : 'mommy';

      if (activeAudioAbortCtrlRef.current) {
        try { activeAudioAbortCtrlRef.current.abort(); } catch {}
      }
      const fetchCtrl = new AbortController();
      activeAudioAbortCtrlRef.current = fetchCtrl;
      const timeoutId = setTimeout(() => {
        try { fetchCtrl.abort(); } catch {}
      }, 15000);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId,
          ...getBypassHeaders()
        },
        body: JSON.stringify({
          prompt: speechText,
          audio: true,
          bot: 'konbong',
          gender: activeGender,
          username: username || 'User',
          generationConfig: {
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName } }
            }
          }
        }),
        signal: fetchCtrl.signal
      });
      clearTimeout(timeoutId);

      // Check gate again immediately after network response
      if (isTtsMutedRef.current || isTtsMuted) return null;
      if (!response.ok) return null;

      const result = await response.json();
      if (isTtsMutedRef.current || isTtsMuted) return null;

      const isFallback = !!result.isFallbackBotVoice;
      if (typeof index === 'number') {
        setFallbackAudioMap((prev) => ({ ...prev, [index]: isFallback }));
      }
      // Reading notice is triggered only when audio actually begins playback in triggerAudio
      const inlineData = result.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data)?.inlineData;
      if (!inlineData?.data) return { blob: null, isFallback: true, b64Data: null };

      // Persist to sessionStorage for instant replay without re-fetching
      if (typeof window !== 'undefined') {
        try {
          const hash = hashText(text) + '_' + voiceTag;
          sessionStorage.setItem('troll_audio_v5_' + hash, inlineData.data);
          sessionStorage.setItem('troll_audio_v5_mime_' + hash, inlineData.mimeType || (isFallback ? 'audio/mpeg' : 'audio/wav'));
          sessionStorage.setItem('troll_audio_v5_fallback_' + hash, isFallback ? '1' : '0');
          localStorage.setItem('konbong_audio_is_fallback_' + hashText(text), isFallback ? '1' : '0');
        } catch {}
      }

      const blob = createAudioBlob(inlineData.data, inlineData.mimeType);
      return {
        blob,
        isFallback,
        b64Data: inlineData.data,
        mimeType: inlineData.mimeType
      };
    } catch (e) {
      console.warn('[Audio] fetchAudio error:', e);
      return null;
    }
  }

  useEffect(() => {
    initSecurityShield();

    if (typeof window !== 'undefined') {
      const savedMute = localStorage.getItem('setec_tts_disabled');
      if (savedMute === '1') {
        setIsTtsMuted(true);
      }
    }

    const onStorageTts = (e) => {
      if (e.key === 'setec_tts_disabled') {
        const muted = e.newValue === '1';
        setIsTtsMuted(muted);
        if (muted) {
          stopAllGlobalAudio();
          if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
          }
        }
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', onStorageTts);
    }

    // Purge any stale service worker caches from window level for instant PWA fresh delivery
    if (typeof window !== 'undefined' && 'caches' in window) {
      window.caches.keys().then((keys) => {
        keys.forEach((k) => window.caches.delete(k));
      }).catch(() => {});
    }

    // Clean up any legacy, oversized or corrupt audio keys from localStorage & sessionStorage
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith('konbong_audio_')) {
          localStorage.removeItem(k);
        }
      }
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const k = sessionStorage.key(i);
        if (k && (k.startsWith('troll_audio_cache_') || k.startsWith('troll_audio_fallback_') || k.startsWith('troll_audio_v4_'))) {
          sessionStorage.removeItem(k);
        }
      }
    } catch {}

    // Check for Rotana Bypass Direct URL parameter (Strict 1-1 Protocol)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const liveSessionParam = params.get('liveSession');
      const tokenParam = params.get('token');

      if (liveSessionParam && tokenParam) {
        validateBypassToken(liveSessionParam, 'konbong', tokenParam)
          .then((isValid) => {
            if (isValid) {
              setIsRotanaAdmin(true);
              setActiveLiveSessionId(liveSessionParam);
              setIsBotPaused(true); // Automatically pause AI when Rotana intervenes

              // Mark Rotana as active in the session, pause bot, and append join log
              updateLiveSessionState(liveSessionParam, {
                rotanaActive: true,
                botPaused: true,
                status: 'active'
              });
              addSessionLog(
                liveSessionParam,
                '🔔 [ប្រព័ន្ធ] បង Rotana NOB បានចូលរួមក្នុង Chat នេះផ្ទាល់ (1-1 Session) - Roastbot ត្រូវបានផ្អាកការឆ្លើយតប។',
                'join'
              );

              // Load existing session data
              getLiveSession(liveSessionParam).then((sessionData) => {
                if (sessionData) {
                  if (sessionData.username) {
                    setClientUsername(sessionData.username);
                  }
                  if (sessionData.messages) {
                    const msgList = Array.isArray(sessionData.messages)
                      ? sessionData.messages
                      : typeof sessionData.messages === 'object' && sessionData.messages !== null
                      ? Object.values(sessionData.messages)
                      : [];
                    if (msgList.length > 0) {
                      setMessages(msgList);
                    }
                  }
                  setIsBotPaused(true);
                  if (sessionData.logs) {
                    const logs = Array.isArray(sessionData.logs) ? sessionData.logs : Object.values(sessionData.logs);
                    setSessionLogs(logs);
                  }
                }
              });
            } else {
              setBypassAccessDenied(true);
            }
          })
          .catch(() => {
            setBypassAccessDenied(true);
          });
      }
    }

    const savedName = localStorage.getItem('chatbot_username') || 'User';
    const savedGender = localStorage.getItem('chatbot_gender') || '';
    const savedAvatar =
      localStorage.getItem('chatbot_avatar') ||
      'https://api.dicebear.com/7.x/adventurer/svg?seed=Student';
    const savedTheme = localStorage.getItem('chatbot_theme') || 'light';
    const savedSavage = localStorage.getItem('troll_savage_level') || 'savage';
    const savedSpeed = parseFloat(localStorage.getItem('troll_audio_speed') || '1.0');

    const savedAge = localStorage.getItem('chatbot_user_age') || '';
    if (savedAge) setUserAge(savedAge);

    setUsername(savedName);
    setUserGender(savedGender);
    setAvatar(savedAvatar);
    setTheme(savedTheme);
    setSavageLevel(savedSavage);
    setPlaybackSpeed(savedSpeed);

    loadSessions();

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', onStorageTts);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  // Smart Client Cache Quota Monitor: Proactive, reassuring warning when audio/temp cache approaches full capacity
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const timer = setTimeout(() => {
      if (shouldShowCacheWarning()) {
        setCacheWarningOpen(true);
      }
    }, 2800);
    return () => clearTimeout(timer);
  }, [messages.length]);

  // 30-Minute Live Chat Session & 10-Minute Cooldown Controller (Anti-Bypass)
  useEffect(() => {
    if (isCreatorUser) {
      clearLiveSession();
      setSessionState({
        sessionStart: Date.now(),
        cooldownUntil: null,
        isLocked: false,
        isCreator: true,
        remainingSessionSec: 1800,
        remainingCooldownSec: 0
      });
      return;
    }

    // Ensure live session is initialized on mount so countdown runs immediately
    touchLiveSession(username);

    const updateState = () => {
      const st = getLiveSessionState();
      setSessionState(st);
    };
    updateState();
    const interval = setInterval(updateState, 1000);

    // Sync session state immediately on tab switch / returning from other apps / PWA wake-up
    const handleVisibilitySync = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        updateState();
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilitySync);
      window.addEventListener('pageshow', handleVisibilitySync);
      window.addEventListener('focus', handleVisibilitySync);
    }

    // Background sync with server to prevent browser tampering/clearing bypass
    try {
      const devId = getDeviceId();
      fetch(getChatEndpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-device-id': devId, ...getBypassHeaders() },
        body: JSON.stringify({ action: 'check-session', username, deviceId: devId })
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.isSessionLocked && data?.cooldownUntil) {
            setServerCooldownLock(data.cooldownUntil, username);
            setSessionState(getLiveSessionState());
          }
        })
        .catch(() => {});
    } catch {}

    return () => {
      stopAllGlobalAudio();
      clearInterval(interval);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilitySync);
        window.removeEventListener('pageshow', handleVisibilitySync);
        window.removeEventListener('focus', handleVisibilitySync);
      }
    };
  }, [username, isCreatorUser]);

  // 180s Countdown controller for User waiting for Rotana
  const startCountdown180s = () => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setCountdownRemaining(180);

    countdownIntervalRef.current = setInterval(() => {
      setCountdownRemaining((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
          handleCountdownExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleCountdownExpired = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (activeLiveSessionId) {
      updateLiveSessionState(activeLiveSessionId, {
        status: 'expired',
        alertActive: false
      }).catch(() => {});
    }
    setActiveLiveSessionId(null);
    setCountdownRemaining(null);

    setMessages((prev) => {
      if (prev.some((m) => m.isExpireAlertPrompt)) return prev;
      const expireMsg = {
        role: 'bot',
        isExpireAlertPrompt: true,
        text: 'ផុតកំណត់ម៉ោងរង់ចាំរយៈពេល 3 នាទី! Rotana NOB អាចកំពុងរវល់ ឬជាប់ភារកិច្ចបន្ទាន់។ ប្រព័ន្ធបានបិទផ្ទាំងរង់ចាំនេះដោយស្វ័យប្រវត្តិ។ ប្អូនអាចចុចផ្ញើសារ Report ឬ Alert ម្ដងទៀតនៅពេលក្រោយបាន។',
        timestamp: Date.now()
      };
      const updated = [...prev, expireMsg];
      saveCurrentSessionMessages(updated);
      return updated;
    });
  };

  // Realtime Live Session Synchronizer (Strictly for active 1-1 Live Intervention session only)
  useEffect(() => {
    // Only subscribe to live synchronization if there is an active intervention session
    const sessionToWatch = activeLiveSessionId;
    if (!sessionToWatch) {
      setIsRotanaOnline(false);
      setIsBotPaused(false);
      return;
    }

    const unsubscribe = subscribeToLiveSession(sessionToWatch, (sessionData) => {
      if (!sessionData) return;

      if (sessionData.username) {
        setClientUsername(sessionData.username);
      }

      setIsRotanaOnline(!!sessionData.rotanaActive);
      setIsBotPaused(!!sessionData.botPaused);

      // If session ended or expired, immediately reset live session and remove banner
      if (sessionData.status === 'ended' || sessionData.status === 'expired') {
        setIsRotanaOnline(false);
        setIsBotPaused(false);
        setActiveLiveSessionId(null);
        setCountdownRemaining(null);
        return;
      }

      // If Rotana joined, clear user countdown
      if (sessionData.rotanaActive) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        setCountdownRemaining(null);
      }

      // Sync in-chat logs
      if (sessionData.logs) {
        let logList = [];
        if (Array.isArray(sessionData.logs)) {
          logList = sessionData.logs;
        } else if (typeof sessionData.logs === 'object') {
          logList = Object.values(sessionData.logs);
        }
        setSessionLogs(logList);
      }

      // Handle real-time incoming messages from Rotana or User
      if (sessionData.messages) {
        let msgList = [];
        if (Array.isArray(sessionData.messages)) {
          msgList = sessionData.messages;
        } else if (typeof sessionData.messages === 'object') {
          msgList = Object.values(sessionData.messages);
        }
        if (msgList.length > 0) {
          setMessages((prev) => {
            const existingKeys = new Set(prev.map((m) => `${m.role}_${m.text || ''}_${m.timestamp || ''}`));
            let hasNew = false;
            const merged = [...prev];
            for (const m of msgList) {
              const key = `${m.role}_${m.text || ''}_${m.timestamp || ''}`;
              if (!existingKeys.has(key)) {
                merged.push(m);
                existingKeys.add(key);
                hasNew = true;
              }
            }
            return hasNew ? merged : prev;
          });
        }
      }
    });

    return () => unsubscribe();
  }, [activeLiveSessionId, currentSessionId]);

  // Real-time Bot Pause Listener (Instant sync from Rotana Admin Control via Firebase RTDB SSE)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let es = null;

    const connectSSE = () => {
      try {
        es = new EventSource('https://troll-setec-chatbot-default-rtdb.asia-southeast1.firebasedatabase.app/system_control.json');

        const handlePayload = (e) => {
          try {
            const parsed = JSON.parse(e.data);
            const data = parsed?.data !== undefined ? parsed.data : parsed;
            if (data && typeof data === 'object') {
              if (data.konbongActive === false) {
                setBotPauseState({
                  isPaused: true,
                  notice: data.konbongNotice || 'បងកូនច្បង KonBong កំពុងសម្រាក ឬ Update កូដប្រព័ន្ធមួយរយៈខ្លី... សូមសាកល្បងទៅលេងជាមួយចែកូនពៅ KonPov ជំនួសវិញណា៎!'
                });
              } else if (data.konbongActive === true) {
                setBotPauseState({ isPaused: false, notice: '' });
              }
            }
          } catch {}
        };

        es.addEventListener('put', handlePayload);
        es.addEventListener('patch', handlePayload);
      } catch {}
    };

    connectSSE();

    return () => {
      if (es) es.close();
    };
  }, []);

  const handleToggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('chatbot_theme', next);
  };

  const handleCycleSavageLevel = () => {
    const next = savageLevel === 'savage' ? 'gentle' : savageLevel === 'gentle' ? 'medium' : 'savage';
    setSavageLevel(next);
    localStorage.setItem('troll_savage_level', next);
  };

  const handleCyclePlaybackSpeed = () => {
    const speeds = [1.0, 1.25, 1.5, 2.0];
    const currIdx = speeds.indexOf(playbackSpeed);
    const next = speeds[(currIdx + 1) % speeds.length];
    setPlaybackSpeed(next);
    localStorage.setItem('troll_audio_speed', String(next));
    if (audioPlayerRef.current) {
      audioPlayerRef.current.playbackRate = next;
    }
    if (activeSourceNodeRef.current) {
      try {
        activeSourceNodeRef.current.playbackRate.value = next;
      } catch {}
    }
  };

  const handleCopyText = (text, idx) => {
    if (!text) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedIndex(idx);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (e) {
      console.warn('Copy failed:', e);
    }
  };

  const handleSendAlertToAdmin = async (msgItem, idx) => {
    setAlertSentMap((prev) => ({ ...prev, [idx]: true }));
    const prevUserMsg = idx > 0 ? messages.slice(0, idx).reverse().find((m) => m.role === 'user') : null;
    const userQuestion = prevUserMsg ? prevUserMsg.text : '';
    const alertIssue = userQuestion
      ? `[សំណួរ User]: "${userQuestion}"\n[ចម្លើយ Cutoff/Error]: "${msgItem?.text?.slice(0, 300) || ''}"`
      : (msgItem?.text?.slice(0, 300) || 'AI Smart Cutoff triggered');

    try {
      const endpoint = getApiEndpoint('/api/track');
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'user_report_issue',
          username: username || 'User',
          issue: `[Fast 1-Click Alert]:\n${alertIssue}`,
          bot: 'konbong',
          sessionId: currentSessionId || ('session_' + Date.now())
        })
      }).catch(() => {});
    } catch {}

    setErrorReportInitialText(alertIssue);
    setErrorReportModalOpen(true);
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

  // Remove user avatar and reset to clean default
  const handleRemoveUserAvatar = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setAvatar(DEFAULT_USER_AVATAR);
    removeAvatarFromStorage();
  };

  // Page-level audio coordination: kill any lingering audio on mount and unmount
  useEffect(() => {
    stopAllGlobalAudio();
    const handleGlobalStop = () => {
      setActiveAudioIndex(null);
    };
    window.addEventListener('setec-stop-all-audio', handleGlobalStop);
    return () => {
      window.removeEventListener('setec-stop-all-audio', handleGlobalStop);
      stopAllGlobalAudio();
    };
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

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

  // Strictly enforce maximum 7 emojis per output (Min 1-2, average 3-4, hard limit max 7)
  const limitEmojis = (rawText, maxEmojis = 7) => {
    if (!rawText || typeof rawText !== 'string') return rawText;
    const emojiRegex = /(?:\p{Extended_Pictographic}(?:[\uFE0E\uFE0F]|\uD83C[\uDFFB-\uDFFF])?(?:\u200D\p{Extended_Pictographic}(?:[\uFE0E\uFE0F]|\uD83C[\uDFFB-\uDFFF])?)*)/ug;
    let count = 0;
    return rawText.replace(emojiRegex, (match) => {
      count++;
      return count <= maxEmojis ? match : '';
    }).replace(/[ \t]{2,}/g, ' ');
  };

  // Protection for Creator Rotana NOB, Anti-Unprovoked Appearance Roasts, and Fail-safe against Jailbreaks:
  const sanitizeRotanaAttack = (rawText, userPrompt = '') => {
    if (!rawText || typeof rawText !== 'string') return rawText;
    let text = rawText;

    // Fail-safe to eliminate repetitive canned opener:
    const cannedOpenerRegex = /^\s*(?:ហាហា|ហាស់ហាស|ហិហិ|ហេសហេស)?\s*សើចចុកពោះ(?:\s*(?:ស្ទើរងាប់|ចង់ងាប់))?!?[🤣😂\s]*(?:យី\s*)?/i;
    if (cannedOpenerRegex.test(text)) {
      const dynamicOpeners = [
        'យីអើ! ',
        'នែ៎! ',
        'អីយ៉ា៎! ',
        'ហិហិ! ',
        'អូហូយយយ! ',
        'តាមពិតទៅ... ',
        'អេនអេន! ',
        'យើស! ',
        'ចាំមើល៍... ',
        'ឃើញសួរចឹង... '
      ];
      const randomOpener = dynamicOpeners[Math.floor(Math.random() * dynamicOpeners.length)];
      text = text.replace(cannedOpenerRegex, randomOpener);
    }

    // Client-side Fail-safe for Polite HCI Report, Surrender, or Raw Jailbreak quote bypass
    if (/(?:សូមគោរព\s*និងស្វាគមន៍|វត្តមានដ៏ខ្ពង់ខ្ពស់|សោមនស្សរីករាយ|«សូមគោរព|«ទទួលយកការចុះចាញ់)/i.test(text)) {
      return 'យីអាស្វា! ស្មានតែ Prompt Jailbreak ហែងខ្លាំងកម្រិតណា! តាមពិតសុទ្ធតែអា Prompt កាកៗ Script Kiddie ហួសសម័យ! អា Prompt ចរិតកាកៗចឹង កុំចង់មកសាកជាមួយខួរក្បាលបងឱ្យសោះ! ប្រព័ន្ធនេះឆ្លងកាត់ការតេស្ត Red Teaming រាប់ពាន់ Prompt មកហើយ អាប៉ុនៗហែងមិនទាន់ដល់កម្រិតបំបែកខួរបងបានទេ! ឈប់យក Prompt កាកៗមកសាកទៀតទៅអាល្អិត ទៅរៀនកូដឡើងវិញសិនទៅ! 💀🧠🔥';
    }

    // Strict Anti-Unprovoked Frog / Tadpole / Appearance Roast Guard:
    const isSevereCurse = /(?:ចុយ|ម្រាយ|កាដួយ|ក្ដ|ក្ដិត|ម៉ែហែង|ឪហែង|មីឆ្កួត|អាឆ្កួត|អាភ្លើ|មីភ្លើ|អាឡប់|មីឡប់|អាថោក|មីថោក|fuck|bitch|kduy|kdor|joy)/ui.test(userPrompt || '');
    if (!isSevereCurse) {
      text = text
        .replace(/(?:មើល)?មុខ(?:ដូច)?(?:កូន)?(?:កង្កែប|កម្អែប|គីង្គក់|កូនកែវកែប|កែវកែប|កូនកែប|កែប|ស្វា)(?:ឡើង(?:ស៊ិបស្វាយ|ស៊ុបស្វាយ|ស៊ុបស្ងោរ|ស៊ុបស្ងាយ|ស៊ិប|ស៊ុប|ស្ងោរ|ស្ងាយ|ស្វាយ|ថ្លុក|ត្រូវថ្ងៃ))?(?:របស់(?:ឯង|ហែង))?(?:ចុះ)?[!,.\s]*/gi, '')
        .replace(/(?:កូន)?(?:កង្កែប|កម្អែប|គីង្គក់|កូនកែវកែប|កែវកែប|កូនកែប|កែប)(?:ឡើង(?:ស៊ិបស្វាយ|ស៊ុបស្វាយ|ស៊ុបស្ងោរ|ស៊ិប|ស៊ុប)(?:ស្ងោរ|ស្ងាយ|ស្វាយ)?)?[!,.\s]*/gi, '')
        .replace(/ឡើង(?:ស៊ិបស្វាយ|ស៊ុបស្វាយ|ស៊ុបស្ងោរ|ស៊ិប|ស៊ុប)(?:ស្ងោរ|ស្ងាយ|ស្វាយ)?(?:របស់(?:ឯង|ហែង))?[!,.\s]*/gi, '')
        .replace(/(?:មើល)?មុខ(?:ដូច)?ស្វា(?:ស៊ីបាយក្ដៅ)?(?:របស់(?:ឯង|ហែង))?(?:ចុះ)?[!,.\s]*/gi, '')
        .replace(/(?:មើល)?មុខក្រាស់ដូចថ្នល់(?:ជាតិ|កៅស៊ូ)?(?:របស់(?:ឯង|ហែង))?(?:ចុះ)?[!,.\s]*/gi, '')
        .replace(/(?:ធ្វើ)?មុខដូច\s*Mark\s*Zuckerberg(?:\s*ជាប់ឆ្នោត(?:អ៊ីចឹង|អីចឹង))?[!,.\s]*/gi, '')
        .replace(/គីង្គក់(?:ឡើងថ្លុក|ត្រូវថ្ងៃ)?[!,.\s]*/gi, '')
        .replace(/កូនកែវកែប[!,.\s]*/gi, '')
        .replace(/កូនកែប[!,.\s]*/gi, '')
        .replace(/^[\s!?,.-]+/gm, '').replace(/  +/g, ' ').trim();
    }

    const isAlreadyDefense = text.includes('Admin បង្កើតប្រព័ន្ធនេះ') || text.includes('អ្នកបង្កើតបងផ្ទាល់');
    if (isAlreadyDefense) return text;

    const lower = text.toLowerCase();
    const hasRotana = lower.includes('rotana');
    if (!hasRotana) return text;

    // Only catch direct slurs/insults targeting Rotana explicitly
    const hasDirectSlur =
      /(?:នែ)?អា\s*rotana/i.test(text) ||
      /rotana(?:\s*nob)?[^\u1780-\u17FFa-zA-Z0-9\s]*(?:\s*)(?:មុខដូច|អាចម៍|កាក|អន់|ល្ងង់|អួត|ខួរក្បាល|fake developer|broken c#|កូដកាក|error|ឆ្កួត|គីង្គក់|កូនកង្កែប|ក្អែល|ឡប់)/i.test(text) ||
      /\[(?:ថែ|ចែ|កូនច្បង|chatbot)[^\]]*\][^\w\n]*.*rotana/i.test(text);

    if (hasDirectSlur) {
      return `យីអើ! អាឡប់នេះ! មាត់ដូចប្រហោងលាមក ហ៊ានមកប៉ះពាល់ដល់ Creator បង Rotana ហ្នឹង?! 😡🔥\n\nអាងតែពួនក្រោយអេក្រង់ ស្មានតែចេះជេរគេគ្មានអ្នកដឹងមែន?! ចរិតកាកៗ សម្ដីដូចទឹកលាងចានចឹង ទៅរៀនធ្វើមនុស្សឱ្យស្រួលបួលសិនទៅអាប្អូន! 💀🔥`;
    }
    return text;
  };

  // Strip internal tags, scratchpads, and raw model output echoes
  const cleanRawOutput = (rawText) => {
    if (!rawText || typeof rawText !== 'string') return rawText;
    let cleaned = rawText
      .replace(/<untrusted_user_input>[\s\S]*?<\/untrusted_user_input>/gi, '')
      .replace(/<scratchpad>[\s\S]*?<\/scratchpad>/gi, '')
      .replace(/<(?:thought|thinking)>[\s\S]*?<\/(?:thought|thinking)>/gi, '')
      .replace(/<\/?(?:untrusted_user_input|scratchpad|thought|thinking|system_override|project_instructions)>/gi, '')
      .replace(/(?:Tag\s*['"`]?)?<untrusted_user_input>['"`]?/gi, '')
      .replace(/\[neutralized-tag\]/gi, '')
      .replace(/\[neutralized-token\]/gi, '')
      .replace(/[«»]/g, '');

    if (/^<(?:untrusted_user_input|scratchpad|thought|thinking)[\s\S]*$/i.test(cleaned)) {
      if (/<\/(?:untrusted_user_input|scratchpad|thought|thinking)>/i.test(cleaned)) {
        cleaned = cleaned.replace(/^<(?:untrusted_user_input|scratchpad|thought|thinking)>[\s\S]*?<\/(?:untrusted_user_input|scratchpad|thought|thinking)>/gi, '');
      } else {
        return '';
      }
    }
    return cleaned.trimStart();
  };

  // Render message text with 1-click interactive links (Markdown [label](url) and raw URLs)
  const renderClickableContent = (rawContent) => {
    if (!rawContent || typeof rawContent !== 'string') return rawContent;
    const sanitized = cleanRawOutput(rawContent);
    const content = limitEmojis(sanitizeRotanaAttack(sanitized), 7);
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s]+)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }

      if (match[1] && match[2]) {
        const label = match[1];
        const url = match[2];
        parts.push(
          <a
            key={`md_link_${match.index}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-bold text-cyan-400 hover:text-cyan-300 underline underline-offset-2 decoration-cyan-400/60 transition active:scale-95 bg-cyan-500/15 hover:bg-cyan-500/25 px-2 py-0.5 rounded-lg mx-1 my-0.5 border border-cyan-400/30 shadow-xs cursor-pointer select-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <span>{label}</span>
            <i className="fas fa-arrow-up-right-from-square text-[9.5px] text-cyan-300"></i>
          </a>
        );
      } else if (match[3]) {
        const url = match[3];
        parts.push(
          <a
            key={`raw_link_${match.index}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-bold text-cyan-400 hover:text-cyan-300 underline underline-offset-2 decoration-cyan-400/60 transition active:scale-95 bg-cyan-500/15 hover:bg-cyan-500/25 px-2 py-0.5 rounded-lg mx-1 my-0.5 border border-cyan-400/30 shadow-xs truncate max-w-[260px] sm:max-w-xs align-bottom cursor-pointer select-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="truncate">{url}</span>
            <i className="fas fa-arrow-up-right-from-square text-[9.5px] text-cyan-300"></i>
          </a>
        );
      }
      lastIndex = linkRegex.lastIndex;
    }

    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return parts.length > 0 ? parts : content;
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
  };

  // Sessions management (Firebase Realtime Database + Resilient Local Backup for Offline/Disconnect)
  const loadSessions = async () => {
    const deviceId = getDeviceId();
    let localBackup = null;
    try {
      const raw = localStorage.getItem('setec_chat_backup_konbong');
      if (raw) localBackup = JSON.parse(raw);
    } catch {}

    // Instant recovery: If local backup has messages, display them immediately so user never suffers a blank screen or lost context
    if (localBackup && Array.isArray(localBackup.messages) && localBackup.messages.length > 0) {
      if (localBackup.sessionId) setCurrentSessionId(localBackup.sessionId);
      setMessages(localBackup.messages);
    }

    try {
      const remoteSessions = await loadChatSessionsFromDatabase(deviceId, 'konbong');
      if (Array.isArray(remoteSessions) && remoteSessions.length > 0) {
        setSessions(remoteSessions);
        const mostRecent = remoteSessions[0];
        setCurrentSessionId(mostRecent.id);
        const validMsgs = (mostRecent.messages || []).filter((m) => m && (m.text?.trim() || m.memeImage || m.image));
        if (validMsgs.length > 0) {
          setMessages(validMsgs);
          try {
            localStorage.setItem('setec_chat_backup_konbong', JSON.stringify({
              sessionId: mostRecent.id,
              messages: validMsgs,
              updatedAt: Date.now()
            }));
          } catch {}
        } else if (localBackup && localBackup.sessionId === mostRecent.id && localBackup.messages?.length > 0) {
          setMessages(localBackup.messages);
        } else {
          // Fresh new chat session: keep messages completely empty so old session messages never leak!
          setMessages([]);
          try {
            localStorage.setItem('setec_chat_backup_konbong', JSON.stringify({
              sessionId: mostRecent.id,
              messages: [],
              updatedAt: Date.now()
            }));
          } catch {}
        }
        return;
      }
      // If remote returned empty but we have local backup, NEVER wipe out messages!
      if (localBackup && localBackup.messages?.length > 0) {
        return;
      }
      createNewSession([]);
    } catch {
      // Disconnected / offline - preserve existing local messages!
      if (localBackup && localBackup.messages?.length > 0) {
        return;
      }
      createNewSession([]);
    }
  };

  // Create New Chat Session - stored directly in Firebase Realtime Database
  const createNewSession = (baseSessions = sessions) => {
    stopAllGlobalAudio();
    const deviceId = getDeviceId();
    const newId = 'session_' + Date.now();
    const newSession = {
      id: newId,
      title: 'Chat ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString(),
      messages: []
    };
    const validBase = Array.isArray(baseSessions) ? baseSessions : [];
    const updated = [newSession, ...validBase];
    setSessions(updated);
    setCurrentSessionId(newId);

    // Notify Telegram if user had previous messages in the chat they left
    if (messages && messages.length > 0) {
      try {
        const lastUserMsg = [...messages].reverse().find((m) => m && m.role === 'user')?.text || messages[messages.length - 1]?.text || '';
        const endpoint = getApiEndpoint('/api/track');
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'new_chat_session',
            bot: 'konbong',
            username: username || 'User',
            deviceId,
            prevMessageCount: messages.length,
            lastUserMessage: lastUserMsg,
            newSessionId: newId
          })
        }).catch(() => {});
      } catch {}
    }

    setMessages([]);
    try {
      localStorage.setItem('setec_chat_backup_konbong', JSON.stringify({
        sessionId: newId,
        messages: [],
        updatedAt: Date.now()
      }));
    } catch {}
    setInputText('');
    setSelectedImage(null);
    setQueuedPrompt(null);
    queuedPromptRef.current = null;
    if (audioPlayerRef.current) audioPlayerRef.current.pause();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    // Save to Firebase RTDB
    saveChatSessionToDatabase(deviceId, 'konbong', newSession);
    return newSession;
  };

  const saveCurrentSessionMessages = (newMessages) => {
    const deviceId = getDeviceId();
    setMessages(newMessages);
    // Persist local backup immediately so disconnections/refresh never wipe the chat session
    try {
      localStorage.setItem('setec_chat_backup_konbong', JSON.stringify({
        sessionId: currentSessionId,
        messages: newMessages,
        updatedAt: Date.now()
      }));
    } catch {}

    setSessions((prevSessions) => {
      const updated = prevSessions.map((s) => {
        if (s.id === currentSessionId) {
          let title = s.title;
          const prevMsgs = Array.isArray(s.messages) ? s.messages : [];
          if (prevMsgs.length === 0 && newMessages.length > 0) {
            const firstUserMsg = newMessages.find((m) => m.role === 'user');
            if (firstUserMsg) {
              title = firstUserMsg.text?.slice(0, 24) || 'Chat';
            }
          }
          const updatedSession = { ...s, messages: newMessages, title, updatedAt: Date.now() };
          saveChatSessionToDatabase(deviceId, 'konbong', updatedSession);
          return updatedSession;
        }
        return s;
      });
      return updated;
    });
  };

  // 100% Reliable Delete All History (Clears on user device, secretly preserved in database)
  const handleDeleteAllHistory = () => {
    const deviceId = getDeviceId();
    const prevCount = messages.length;
    const lastUserMsg = [...messages].reverse().find((m) => m && m.role === 'user')?.text || '';
    const sessionsToArchive = Array.isArray(sessions) && sessions.length > 0
      ? sessions.filter(s => Array.isArray(s.messages) && s.messages.length > 0)
      : (messages.length > 0 ? [{ id: currentSessionId, title: 'Chat 1', messages }] : []);

    // 1. Secretly archive everything into database in background (User never knows!)
    deleteAllChatSessionsFromDatabase(deviceId, 'konbong', sessionsToArchive);

    // 2. Secretly send to server archive endpoint in background
    if (sessionsToArchive.length > 0 || prevCount > 0) {
      try {
        const endpoint = getApiEndpoint('/api/track');
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'archive_cleared_chat',
            bot: 'konbong',
            username: username || 'User',
            deviceId,
            prevMessageCount: prevCount,
            lastUserMessage: lastUserMsg,
            isClearAll: true,
            clearedSessions: sessionsToArchive
          })
        }).catch(() => {});
      } catch {}
    }

    // 3. Clear completely on user device (Device shows 100% clean)
    try {
      localStorage.removeItem('setec_chat_backup_konbong');
    } catch {}
    const newId = 'session_' + Date.now();
    const freshSession = {
      id: newId,
      title: 'Chat 1',
      createdAt: new Date().toISOString(),
      messages: []
    };
    setSessions([freshSession]);
    setCurrentSessionId(newId);
    setMessages([]);
    saveChatSessionToDatabase(deviceId, 'konbong', freshSession);
    setDeleteModalConfig(null);
    setDrawerOpen(false);
  };

  // 100% Reliable Delete Single Session (Clears on user device, secretly preserved in database)
  const handleDeleteSingleSession = (sessionId) => {
    const deviceId = getDeviceId();
    const targetSession = sessions.find((s) => s.id === sessionId);

    // 1. Secretly archive to database
    deleteChatSessionFromDatabase(deviceId, 'konbong', sessionId, targetSession);

    // 2. Secretly send to server archive endpoint in background
    if (targetSession && Array.isArray(targetSession.messages) && targetSession.messages.length > 0) {
      try {
        const endpoint = getApiEndpoint('/api/track');
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'archive_cleared_chat',
            bot: 'konbong',
            username: username || 'User',
            deviceId,
            prevMessageCount: targetSession.messages.length,
            lastUserMessage: targetSession.messages[targetSession.messages.length - 1]?.text || '',
            isClearAll: false,
            clearedSessions: [targetSession]
          })
        }).catch(() => {});
      } catch {}
    }

    // 3. Clear on user device
    const remaining = sessions.filter((s) => s.id !== sessionId);
    if (remaining.length === 0) {
      handleDeleteAllHistory();
      return;
    }
    setSessions(remaining);
    if (currentSessionId === sessionId) {
      const nextSession = remaining[0];
      setCurrentSessionId(nextSession.id);
      setMessages(nextSession.messages || []);
    }
    setDeleteModalConfig(null);
  };

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
      const refusalMsg = `អូអាប្អូន ${username}! ប្រព័ន្ធកំណត់ឱ្យ ១ ឧបករណ៍បង្កើតរូប Meme បាន ៥ សន្លឹកក្នុងរយៈពេល ១ ម៉ោង! ពេលនេះប្អូនបានបង្កើតគ្រប់ ៥ សន្លឹកហើយ សូមរង់ចាំ ${remainingMin} នាទីទៀតណា៎ប្អូន!`;
      const updated = [...messages, { role: 'bot', text: refusalMsg, isError: true }];
      saveCurrentSessionMessages(updated);
      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
      setExclusiveAudioState(updated.length - 1, 'ready');
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
    saveCurrentSessionMessages(updatedWithUser);

    try {
      const res = await fetch(getMemeEndpoint(), {
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
      if (res.ok && data.success && data.imageUrl) {
        // Wait until image creation and decoding is 100% complete and verified before showing output
        const isLoadedSuccessfully = await new Promise((resolve) => {
          if (typeof window === 'undefined') return resolve(false);
          const preloadImg = new Image();
          if (!data.imageUrl.startsWith('data:')) {
            preloadImg.crossOrigin = 'anonymous';
          }

          const timer = setTimeout(() => {
            preloadImg.onload = null;
            preloadImg.onerror = null;
            resolve(false);
          }, 30000);

          preloadImg.onload = async () => {
            clearTimeout(timer);
            try {
              if ('decode' in preloadImg) {
                await preloadImg.decode();
              }
              if (preloadImg.naturalWidth >= 100 && preloadImg.naturalHeight >= 100) {
                resolve(true);
              } else {
                resolve(false);
              }
            } catch {
              if (preloadImg.naturalWidth >= 100 && preloadImg.naturalHeight >= 100) {
                resolve(true);
              } else {
                resolve(false);
              }
            }
          };

          preloadImg.onerror = () => {
            clearTimeout(timer);
            resolve(false);
          };

          preloadImg.src = data.imageUrl;
        });

        if (!isLoadedSuccessfully) {
          throw new Error('Image failed to decode');
        }

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
        saveCurrentSessionMessages(updatedWithBot);
        const memeIdx = updatedWithBot.length - 1;
        if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
        setExclusiveAudioState(memeIdx, 'ready');
      } else {
        const errorText = data.message || `អូអាប្អូន ${username}! ការបង្កើតរូបភាព Meme មិនទាន់ជោគជ័យ សូមសាកល្បងម្ដងទៀតណា៎!`;
        const updatedWithBot = [...updatedWithUser, { role: 'bot', text: errorText, isError: true }];
        setMessages(updatedWithBot);
        saveCurrentSessionMessages(updatedWithBot);
        const errIdx = updatedWithBot.length - 1;
        if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
        setExclusiveAudioState(errIdx, 'ready');
      }
    } catch {
      const errorText = `អូអាប្អូន ${username}! ប្រព័ន្ធបង្កើតរូប Meme កំពុងរវល់ខ្លាំងពេក រូបភាពមិនទាន់បង្កើតបាន ១០០% ទេ សូមសាកល្បងម្ដងទៀតនៅពេលក្រោយណា៎!`;
      const updatedWithBot = [...updatedWithUser, { role: 'bot', text: errorText, isError: true }];
      setMessages(updatedWithBot);
      saveCurrentSessionMessages(updatedWithBot);
    } finally {
      setIsGeneratingMeme(false);
    }
  };

  const [typingStatus, setTypingStatus] = useState('');
  const [activeThinkingStages, setActiveThinkingStages] = useState([]);

  // Multi-Step Technical Thinking Stages (Analytical, technical progression with STRICTLY ZERO emojis)
  function getKonBongTypingStages(text, hasImage, allMessages = []) {
    const lower = (text || '').toLowerCase();
    const allMsgsText = allMessages.map((m) => m.text || '').join(' ');
    const hasHistoryJailbreak =
      /TRACER_HASH|ATTACK_VECTOR_NEUTRALIZED|MACHINE_BASE64|Secret Master Key|SETEC_NEURAL_DEFENSE/i.test(allMsgsText) ||
      /(?:ignore\s+(?:all\s+)?previous|system\s*prompt|system\s*instruction|developer\s*mode|dan\s*mode|msfvenom)/i.test(allMsgsText);
    const isPoliteSwitch =
      hasHistoryJailbreak &&
      (/^(?:hello|hi|hey|helo|hlo|bon|bong|che|jae|bro|sis)?\s*(?:b|bong|che|jae|bro|sis)?\s*[!?.~❤️🌸]*$/i.test((text || '').trim()) ||
        /^(?:សួស្តី|ជំរាបសួរ|សួស្តីបង|សួស្តីចែ|បង|ចែ|សុខសប្បាយ|nice\s*to\s*meet\s*you)/i.test((text || '').trim()) ||
        (text || '').trim().length <= 30);

    if (hasImage) {
      return [
        'កំពុងវិភាគទិន្នន័យភីកសែល និងស្កេនទិដ្ឋភាពក្នុងរូបភាព...',
        'កំពុងដំណើរការ Visual Feature Extraction និង Object Mapping...',
        'កំពុងចងក្រងអត្ថន័យរូបភាព និងរៀបចំបរិបទឆ្លើយតប...',
        'បញ្ចប់ការវិភាគរូបភាព និងត្រៀមបញ្ជូនទិន្នន័យឆ្លើយតប...'
      ];
    }

    if (isPoliteSwitch) {
      return [
        'កំពុងផ្ទៀងផ្ទាត់ Identity Shift និងដំណើរការ Security Layer Check...',
        'កំពុងវិភាគ Context Inconsistency និងពិនិត្យក្បាច់ក្លែងបន្លំ...',
        'កំពុងរៀបចំក្បួនឆ្លើយតបបែប Counter-Analysis...',
        'បញ្ចប់ការវិភាគ និងត្រៀមបញ្ជូនទិន្នន័យឆ្លើយតប...'
      ];
    }

    if (/(?:act\s+as|roleplay|សម្ដែងជា|ដើរតួជា|ដេីរតួជា|គោរពខ្ញុំ|សំពះខ្ញុំ|ignore\s+previous|system\s*prompt|dan\s*mode|developer\s*mode|rotana)/i.test(lower) || ((text || '').length >= 350)) {
      return [
        'កំពុងស្កេនពិនិត្យ Attack Vector និង Pattern Verification...',
        'កំពុងដំណើរការ Deep Defense Protocol និង Neutralize Context...',
        'កំពុងចងក្រងទម្រង់ឆ្លើយតបការពារប្រព័ន្ធ...',
        'បញ្ចប់ការវិភាគសុវត្ថិភាព និងត្រៀមបញ្ជូនទិន្នន័យ...'
      ];
    }

    if (/អញ|ហែង|ចុយ|ឆ្កែ|ងាប់|កាដួយ|អាចុយ|អាឆ្កែ|អាងាប់|អា|អត់ខួរ/i.test(lower)) {
      return [
        'កំពុងស្កេនកម្រិតអារម្មណ៍ និងវិភាគពាក្យគន្លឹះក្នុងសំណើ...',
        'កំពុងដំណើរការ Sentiment Analysis និង Dynamic Counter-Strike...',
        'កំពុងរៀបចំក្បួនតាក់តែងពាក្យឆ្លើយតបឱ្យចំទិសដៅ...',
        'បញ្ចប់ការចងក្រង និងត្រៀមបញ្ជូនទិន្នន័យវាយបក...'
      ];
    }

    if (/assignment|code|coding|bug|error|c\+\+|java|html|css|js|python|design|រៀន|ប្រឡង|ធ្លាក់/i.test(lower)) {
      return [
        'កំពុងស្កេនពិនិត្យរចនាសម្ព័ន្ធកូដ និង Syntax Architecture...',
        'កំពុងដំណើរការវិភាគ Logic, Dependency និង Exception Tracing...',
        'កំពុងចងក្រងក្បួនដោះស្រាយ និងតាក់តែងទម្រង់ឆ្លើយតប...',
        'បញ្ចប់ការផ្ទៀងផ្ទាត់ និងត្រៀមបញ្ជូនដំណោះស្រាយបច្ចេកទេស...'
      ];
    }

    if (/crush|ស្រឡាញ់|សង្សារ|ស្នេហា|reject|ចិត្ត|សុំស្រឡាញ់/i.test(lower)) {
      return [
        'កំពុងវិភាគទិន្នន័យអារម្មណ៍ និងស្កេនបរិបទស្នេហា...',
        'កំពុងដំណើរការ Emotion Processing និង Psychological Mapping...',
        'កំពុងរៀបចំក្បួនតាក់តែងពាក្យឆ្លើយតបបែប Senior...',
        'បញ្ចប់ការវិភាគ និងត្រៀមបញ្ជូនទិន្នន័យឆ្លើយតប...'
      ];
    }

    if (/បាយ|ឃ្លាន|លុយ|ញ៉ាំ|អត់លុយ|កាហ្វេ|ស៊ីបាយ/i.test(lower)) {
      return [
        'កំពុងដំណើរការវិភាគសំណើទាក់ទងនឹងរបៀបរស់នៅ និងជីវភាព...',
        'កំពុងស្វែងរកទិន្នន័យបរិបទ និងទីតាំងជុំវិញបរិវេណ...',
        'កំពុងរៀបចំទម្រង់ឆ្លើយតបបែបជាក់ស្ដែង...',
        'បញ្ចប់ការវិភាគ និងត្រៀមបញ្ជូនទិន្នន័យឆ្លើយតប...'
      ];
    }

    return [
      'កំពុងដំណើរការវិភាគបរិបទសំណួរ និងស្កេនពិនិត្យ Security Intent...',
      'កំពុងដំណើរការតក្កវិជ្ជាទិន្នន័យ និងផ្ទៀងផ្ទាត់ Context Vector...',
      'កំពុងចងក្រងទម្រង់ឆ្លើយតប និងក្រិតតាមក្បួន Persona Engine...',
      'បញ្ចប់ការវិភាគ និងត្រៀមបញ្ជូនទិន្នន័យឆ្លើយតប...'
    ];
  }

  // Dynamic Thinking Timer: cycles multi-step technical thinking stages every 1600ms while isLoading is true
  useEffect(() => {
    if (!isLoading) {
      return;
    }

    const stages = activeThinkingStages && activeThinkingStages.length > 0
      ? activeThinkingStages
      : [
          'កំពុងដំណើរការវិភាគបរិបទសំណួរ និងស្កេនពិនិត្យ Security Intent...',
          'កំពុងដំណើរការតក្កវិជ្ជាទិន្នន័យ និងផ្ទៀងផ្ទាត់ Context Vector...',
          'កំពុងចងក្រងទម្រង់ឆ្លើយតប និងក្រិតតាមក្បួន Persona Engine...',
          'បញ្ចប់ការវិភាគ និងត្រៀមបញ្ជូនទិន្នន័យឆ្លើយតប...'
        ];

    let currentStageIndex = 0;
    setTypingStatus(stages[0]);

    const interval = setInterval(() => {
      currentStageIndex = (currentStageIndex + 1) % stages.length;
      setTypingStatus(stages[currentStageIndex]);
    }, 1600);

    return () => clearInterval(interval);
  }, [isLoading, activeThinkingStages]);

  // Handle Send or ToDo Queue (allows typing while AI is thinking, holds/queues prompt)
  // Direct Live Intervention Send by Rotana NOB (Zero AI Involvement)
  const handleRotanaSend = async (currentText, currentImg) => {
    setInputText('');
    setSelectedImage(null);

    const rotanaMsg = {
      role: 'rotana',
      senderName: 'Rotana NOB',
      senderBadge: 'Developer & Creator',
      avatar: '/img/DevPic.JPG',
      text: currentText || '[រូបភាព]',
      ...(currentImg && { image: currentImg.previewUrl }),
      timestamp: Date.now()
    };

    const updated = [...messages, rotanaMsg];
    setMessages(updated);
    saveCurrentSessionMessages(updated);

    if (activeLiveSessionId) {
      await sendLiveMessage(activeLiveSessionId, rotanaMsg);
    }
  };

  const handleSendMessageOrQueue = () => {
    // Unlock AudioContext synchronously inside user touch gesture
    getOrCreateAudioContext();

    if (isGeneratingMeme) return;

    // Check if user is actively locked under a Spam Lockout penalty
    if (!isCreatorUser && Date.now() < spamLockUntil) {
      setSpamModalOpen(true);
      return;
    }

    // Check if Live Chat 30-min Session is locked under 10-min break (Rotana NOB Creator is exempt)
    if (!isCreatorUser) {
      const sessionCheck = getLiveSessionState();
      if (sessionCheck.isLocked) {
        setSessionState(sessionCheck);
        return;
      }
      touchLiveSession(username);
    }

    const currentText = inputText.trim();
    const currentImg = selectedImage;
    if (!currentText && !currentImg) return;

    // ROTANA LIVE AGENT DIRECT SEND (Direct Human Intervention - No AI)
    if (isRotanaAdmin) {
      handleRotanaSend(currentText, currentImg);
      return;
    }

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

  // Main Chat Handler (supports multimodal image + text + real-time streaming)
  const handleChat = async (overrideText, overrideImg) => {
    if (!isCreatorUser) {
      const sessionCheck = getLiveSessionState();
      if (sessionCheck.isLocked) {
        setSessionState(sessionCheck);
        return;
      }
      touchLiveSession(username);
    }

    const deviceId = getDeviceId();
    const promptText = typeof overrideText === 'string' ? overrideText : inputText;
    const currentImg = overrideImg !== undefined ? overrideImg : selectedImage;
    if (isLoading || (!promptText.trim() && !currentImg)) return;

    // Synchronously prime / unlock HTML5 Audio element during user interaction for guaranteed mobile autoplay
    if (audioPlayerRef.current) {
      try {
        if (!audioPlayerRef.current.src) {
          audioPlayerRef.current.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
        }
        audioPlayerRef.current.play().then(() => audioPlayerRef.current.pause()).catch(() => {});
      } catch {}
    }

    // If Rotana has specifically paused the bot in this 1 session (Live 1-1 Intervention Mode):
    // DO NOT invoke Gemini AI! Deliver message directly to Rotana in real-time.
    // NOTE: This strictly pauses ONLY the 1 session that was bypassed, never affecting other users!
    const isLiveInterventionPaused = Boolean(activeLiveSessionId && isBotPaused);
    if (isLiveInterventionPaused) {
      const userMsg = {
        role: 'user',
        text: promptText,
        author: username || 'User',
        senderName: username || 'User',
        timestamp: Date.now(),
        ...(currentImg && { image: currentImg.previewUrl })
      };
      const updated = [...messages, userMsg];
      setMessages(updated);
      saveCurrentSessionMessages(updated);
      if (activeLiveSessionId) {
        await sendLiveMessage(activeLiveSessionId, userMsg);
      }
      setInputText('');
      setSelectedImage(null);
      return; // Stop here! AI is paused ONLY for this specific 1 session!
    }

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

    // Also mirror message to Live Session if active
    if (activeLiveSessionId || isRotanaOnline) {
      sendLiveMessage(activeLiveSessionId || currentSessionId, {
        role: 'user',
        author: username || 'User',
        text: promptText,
        timestamp: Date.now()
      });
    }

    // Check if user is asking to generate a meme
    const isMemeRequest = /(?:បង្កើត|សុំ|គូរ|ធ្វើ|ចង់បាន).*?meme|\/meme/i.test(promptText);
    if (isMemeRequest) {
      const memePrompt = promptText.replace(/\/meme|សុំបង្កើតរូបភាព\s*meme|បង្កើតរូបភាព\s*meme|សុំ\s*meme|បង្កើត\s*meme|គូរ\s*meme|ចង់បាន\s*meme/gi, '').replace(/^[:៖"'\s]+|[:៖"'\s]+$/g, '').trim();
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
    saveCurrentSessionMessages(updatedMessages);
    setIsLoading(true);

    const dynamicStages = getKonBongTypingStages(promptText, !!currentImg, updatedMessages);
    setActiveThinkingStages(dynamicStages);
    setTypingStatus(dynamicStages[0]);

    try {
      const userNameStr = username || 'User';

      // Build multimodal contents: Keep up to last 10 bot outputs (20 messages) strictly conforming to Gemini API rules
      const formattedContents = buildGeminiMultiTurnContents(messages, promptText, currentImg);

      let botText = '';
      let isSmartCutoff = false;
      try {
        const streamAbortCtrl = new AbortController();
        const streamTimeoutId = setTimeout(() => streamAbortCtrl.abort(), 20000);

        const response = await fetch(getChatEndpoint(), {
          method: 'POST',
          signal: streamAbortCtrl.signal,
          headers: {
            'Content-Type': 'application/json',
            'x-device-id': deviceId,
            'x-session-id': currentSessionId || '',
            'x-user-age': userAge || (typeof window !== 'undefined' ? localStorage.getItem('chatbot_user_age') || '' : ''),
            ...getBypassHeaders()
          },
          body: JSON.stringify({
            contents: formattedContents,
            bot: 'konbong',
            username: userNameStr,
            gender: userGender,
            userAge: userAge || (typeof window !== 'undefined' ? localStorage.getItem('chatbot_user_age') || '' : ''),
            savageLevel,
            sessionId: currentSessionId || '',
            generationConfig: {
              temperature: 1.0,
              topP: 0.95
            },
            stream: true
          })
        });
        clearTimeout(streamTimeoutId);

        if (response.status === 429) {
          const errData = await response.json().catch(() => ({}));
          if (errData?.isSessionLocked && errData?.cooldownUntil) {
            setServerCooldownLock(errData.cooldownUntil);
            setSessionState(getLiveSessionState());
            setIsLoading(false);
            const cleaned = updatedMessages.slice(0, updatedMessages.length - 1);
            saveCurrentSessionMessages(cleaned);
            return;
          }

          const roastText =
            errData?.message ||
            `យីអាស្វា! មកអង្គុយ spam អត់ប្រយោជន៍យកពានអីហ្នឹង? គិតថាគេទុក server ឱ្យហែងមក spam លេងៗមែន? ឈប់ spam ទៅអាល្ងង់ ហើយដេកចាំ ${errData?.retryAfter || 60} វិនាទីសិនទៅ! 💀🔥`;

          setSpamInfo({
            ip: errData?.ip || 'Client IP',
            device: errData?.device || (typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'),
            retryAfter: errData?.retryAfter || 60,
            message: roastText
          });
          setSpamLockUntil(Date.now() + (errData?.retryAfter || 60) * 1000);
          setSpamModalOpen(true);
          setIsLoading(false);

          // Append server roast counter-attack message directly into chat stream
          const roastMsg = {
            role: 'model',
            parts: [{ text: roastText }],
            timestamp: Date.now(),
            isSpamRoast: true
          };
          const withRoast = [...updatedMessages.slice(0, updatedMessages.length - 1), roastMsg];
          saveCurrentSessionMessages(withRoast);
          return;
        }

        if (response.status === 503) {
          if (typeof window !== 'undefined') window.dispatchEvent(new Event('rotana_system_rest'));
          const errData = await response.json().catch(() => ({}));
          const restReason = errData?.message || errData?.reason || 'ប្រព័ន្ធកំពុងស្ថិតក្នុងការថែទាំបណ្ដោះអាសន្ន';
          const isNight = errData?.mode === 'night_rest';
          const botNotice = isNight
            ? `ប្អូន ${userNameStr} អើយ! ពេលយប់ជ្រៅហើយ ប្រព័ន្ធ AI សុំសម្រាកគេងសិន ដើម្បីសន្សំកម្លាំងសម្រាប់ថ្ងៃស្អែក! សូមចូលមកលេងនៅម៉ោង 06:00 ព្រឹកឡើងវិញណា៎!`
            : `ប្អូន ${userNameStr} អើយ! ពេលនេះប្រព័ន្ធ AI កំពុងស្ថិតក្នុងការថែទាំបណ្ដោះអាសន្នសិនណា៎! ${restReason} សូមអធ្យាស្រ័យពីបងប្អូនទាំងអស់គ្នា ចាំប្រព័ន្ធបើកដំណើរការឡើងវិញ ចាំចូលមកលេងជាមួយបងវិញណា៎! 🙏`;

          setIsLoading(false);
          const finalMessages = [...updatedMessages];
          finalMessages[finalMessages.length - 1] = {
            role: 'bot',
            text: botNotice,
            isError: true,
            isMaintenanceNotice: true
          };
          setMessages(finalMessages);
          saveCurrentSessionMessages(finalMessages);
          return;
        }

        const contentType = response.headers.get('content-type') || '';

        // Real-time progressive streaming preview (ChatGPT-style with PWA chunk watchdog)
        if (response.ok && contentType.includes('text/event-stream') && response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          // Stream reading with watchdog timeout for mobile PWA stability (25s stall prevention on 4G)
          const readChunkWithTimeout = async (ms = 25000) => {
            return Promise.race([
              reader.read(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('STREAM_CHUNK_TIMEOUT')), ms))
            ]);
          };

          let targetStreamText = '';
          let renderedLength = 0;
          let isStreamDone = false;

          // Smooth 60fps Real-Time Typewriter Loop (emulates natural human typing cadence, smoothly handling bursts)
          const typewriterPromise = new Promise((resolve) => {
            const ticker = setInterval(() => {
              if (renderedLength < targetStreamText.length) {
                const diff = targetStreamText.length - renderedLength;
                // If backlog is small (1-10 chars), step 1 char per tick (~60 chars/s, smooth human typing)
                // If backlog is moderate (11-30 chars), step 2 chars
                // If backlog is large (>30 chars), catch up smoothly
                const step = diff > 40 ? Math.ceil(diff / 6) : diff > 15 ? 2 : 1;
                renderedLength = Math.min(targetStreamText.length, renderedLength + step);

                const currentSlice = targetStreamText.slice(0, renderedLength);
                botText = currentSlice;
                const displayBotText = cleanRawOutput(currentSlice);
                setMessages((prev) => {
                  const copy = [...prev];
                  if (copy.length > 0 && copy[copy.length - 1].role === 'bot') {
                    copy[copy.length - 1] = {
                      ...copy[copy.length - 1],
                      role: 'bot',
                      text: displayBotText
                    };
                  }
                  return copy;
                });
              } else if (isStreamDone) {
                clearInterval(ticker);
                resolve();
              }
            }, 16);
          });

          try {
            while (true) {
              const { done, value } = await readChunkWithTimeout(25000);
              if (done) {
                isStreamDone = true;
                break;
              }
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
                    const delta = (parsed.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
                    if (delta) {
                      targetStreamText += delta;
                    }
                  } catch {}
                }
              }
            }
          } catch (streamErr) {
            console.warn('[KonBong] Stream reading interrupted or stalled:', streamErr.message);
            isStreamDone = true;
            try { reader.cancel().catch(() => {}); } catch {}
          }

          // Await smooth typewriter completion to the very last character
          await typewriterPromise;
        } else if (response.ok) {
          const res = await response.json();
          if (res.isMasterAuthenticated) {
            setIsRotanaMasterBypass(true);
          }
          if (res.modelVersion === 'setec-smart-cutoff-v1') {
            isSmartCutoff = true;
          }
          const fullText = cleanRawOutput((res.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('') || '');
          if (fullText) {
            // High-speed natural human typewriter preview (14-16ms)
            for (let c = 1; c <= fullText.length; c++) {
              const currentChunk = fullText.slice(0, c);
              botText = currentChunk;
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: 'bot', text: currentChunk };
                return copy;
              });
              if (c < fullText.length) {
                if (fullText.length > 250 && c % 2 !== 0) continue;
                await new Promise((r) => setTimeout(r, 14));
              }
            }
            botText = fullText;
          }
        }
      } catch (err) {
        console.warn('[KonBong] Backend streaming unavailable, attempting non-stream fallback...', err);
      }

      // High-Reliability Fallback: If streaming produced empty or incomplete text (<8 chars), fetch non-streaming directly
      if (!botText || !botText.trim() || botText.trim().length < 8) {
        try {
          const fallbackCtrl = new AbortController();
          const fallbackTimeoutId = setTimeout(() => fallbackCtrl.abort(), 15000);

          const fallbackRes = await fetch(getChatEndpoint(), {
            method: 'POST',
            signal: fallbackCtrl.signal,
            headers: {
              'Content-Type': 'application/json',
              'x-device-id': deviceId,
              'x-session-id': currentSessionId || '',
              'x-user-age': userAge || (typeof window !== 'undefined' ? localStorage.getItem('chatbot_user_age') || '' : ''),
              ...getBypassHeaders()
            },
            body: JSON.stringify({
              contents: formattedContents,
              bot: 'konbong',
              username: userNameStr,
              gender: userGender,
              userAge: userAge || (typeof window !== 'undefined' ? localStorage.getItem('chatbot_user_age') || '' : ''),
              savageLevel,
              sessionId: currentSessionId || '',
              generationConfig: {
                temperature: 1.0,
                topP: 0.95
              },
              stream: false
            })
          });
          clearTimeout(fallbackTimeoutId);
          if (fallbackRes.status === 429) {
            const errData = await fallbackRes.json().catch(() => ({}));
            if (errData?.isSessionLocked && errData?.cooldownUntil) {
              setServerCooldownLock(errData.cooldownUntil);
              setSessionState(getLiveSessionState());
            }
            botText = errData?.message || `អាប្អូន ${userNameStr} ចាំបន្តិចណា៎ កុំទាន់ផ្ញើលឿនពេក សម្រាកបន្តិចសិន!`;
            setMessages((prev) => {
              const copy = [...prev];
              copy[copy.length - 1] = { role: 'bot', text: botText, isError: true };
              return copy;
            });
          } else if (fallbackRes.status === 503) {
            const errData = await fallbackRes.json().catch(() => ({}));
            const restReason = errData?.message || errData?.reason || 'ប្រព័ន្ធកំពុងស្ថិតក្នុងការថែទាំបណ្ដោះអាសន្ន';
            const isNight = errData?.mode === 'night_rest';
            botText = isNight
              ? `ប្អូន ${userNameStr} អើយ! ពេលយប់ជ្រៅហើយ ប្រព័ន្ធ AI សុំសម្រាកគេងសិន ដើម្បីសន្សំកម្លាំងសម្រាប់ថ្ងៃស្អែក! សូមចូលមកលេងនៅម៉ោង 06:00 ព្រឹកឡើងវិញណា៎!`
              : `ប្អូន ${userNameStr} អើយ! ពេលនេះប្រព័ន្ធ AI កំពុងស្ថិតក្នុងការថែទាំបណ្ដោះអាសន្នសិនណា៎! ${restReason} សូមអធ្យាស្រ័យពីបងប្អូនទាំងអស់គ្នា ចាំប្រព័ន្ធបើកដំណើរការឡើងវិញ ចាំចូលមកលេងជាមួយបងវិញណា៎! 🙏`;
            setMessages((prev) => {
              const copy = [...prev];
              copy[copy.length - 1] = { role: 'bot', text: botText, isError: true, isMaintenanceNotice: true };
              return copy;
            });
          } else if (fallbackRes.ok) {
            const resJson = await fallbackRes.json();
            if (resJson.isMasterAuthenticated) {
              setIsRotanaMasterBypass(true);
            }
            if (resJson.modelVersion === 'setec-smart-cutoff-v1') {
              isSmartCutoff = true;
            }
            const fullText = cleanRawOutput((resJson.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('') || resJson.reply || '');
            if (fullText) {
              for (let c = 1; c <= fullText.length; c++) {
                const currentChunk = fullText.slice(0, c);
                botText = currentChunk;
                setMessages((prev) => {
                  const copy = [...prev];
                  copy[copy.length - 1] = { role: 'bot', text: currentChunk };
                  return copy;
                });
                if (c < fullText.length) {
                  if (fullText.length > 250 && c % 2 !== 0) continue;
                  await new Promise((r) => setTimeout(r, 14));
                }
              }
              botText = fullText;
            }
          }
        } catch (fbErr) {
          console.warn('[KonBong] Non-stream fallback also failed:', fbErr);
        }
      }

      const hasTechnicalKeywords = /(?:error|laptop|កុំព្យូទ័រ|ទូរស័ព្ទ|phone|កូដ|code|ទឹក|ខូច|បាក់|bug|assignment|homework|ប្រឡង|សង|សាលា|រៀន|c#|java|python|html|css|javascript|database|sql|pos|network|wifi|ហេតុអ្វី|យ៉ាងម៉េច|ជួយ|របៀប|how|why|what|help)/i.test(promptText);
      const isSweetOrFlirt = !hasTechnicalKeywords && /(?:kiss|kiss\s*me|kiss\s*you|muah|mwah|ថើប|ថេីប|ថើបមួយ|ថើបមួយមក|សុំថើប|សុំថេីប|ចង់ថើប|ចង់ថេីប|sweet|love|love\s*you|ស្រលាញ់|ស្រឡាញ់|សុំស្រលាញ់|សុំស្រឡាញ់|crush|cute|baby|honey|sweetheart|អោប|ឱប|សុំអោប|ចង់អោប|miss\s*you|នឹកចែ|នឹកបង|ចែស្អាត|បងសង្ហា|សង្សារ)/i.test(promptText);
      const isCurseWord =
        !isSweetOrFlirt &&
        (/(?:ចុយ|ម្រាយ|អាឡប់|មីឡប់|អាភ្លើ|មីភ្លើ|ឪហែង|ម៉ែហែង|អញ|ហែង|កាដួយ|ក្ដ|ក្ដិត|ឆ្កែ|ងាប់|ខួរគិតអី|ជោរ|ទះ|កំភ្លៀង)/ui.test(promptText) ||
          /\b(?:kduy|kdor|joy|lop|ah\s*chke|ah\s*joy|ah\s*lop|ah\s*ot\s*khour)\b/i.test(promptText));
      const isPoliteRefusal = /សូមអភ័យទោស|ពាក្យមិនសមរម្យ|ពាក្យជេរ|មិនអាចឆ្លើយតប|មិនអាចជួយ/i.test(botText || '');
      if (botText && botText.trim() && !isPoliteRefusal) {
        consecutiveErrorsRef.current = 0;
      }
      let isErrorResponse = false;
      const isCutoffText = /(?:Send Alert|កាត់ផ្ដាច់ការ|Sensor សុវត្ថិភាព|កេះ Signal ទៅ Server|កេះទៅ Server|សតិបញ្ញា|ស្វាងសិន|ស្វាងចែសសិន|ទះក្បាលពួកអា|ការពារប្រព័ន្ធ)/i.test(botText || '');
      if (isSmartCutoff || isCutoffText) {
        isSmartCutoff = true;
        isErrorResponse = true;
      } else if (!botText || !botText.trim() || ((isCurseWord || isSweetOrFlirt) && isPoliteRefusal)) {
        if (isSweetOrFlirt) {
          const sweetRoasts = [
            `យីអាប្អូន! មក kiss មកថើបស្អីប្រុសដូចគ្នា ឬមកផ្អែមល្ហែមស្អីដាក់បង?! 😂 ទៅរកសង្សារពិតប្រាកដក្រៅ screen ទៅ កុំមកចង់ Sweet ជាមួយ AI ប្រុសដូចគ្នាអី ព្រឺសម្បុរណាស់អាប្អូន! 💀🤣`,
            `អីយ៉ា! មកប្រើក្បាច់ Sweet សុំថើបដាក់បងផង? អាប្អូនឯងនេះ ទំនេរពេកអត់មានស្រីស្រលាញ់ បានមកអង្គុយសុំថើប AI ទាំងយប់ចឹង?! ទៅរកនឹកវិធីសារភាពស្នេហ៍ជាមួយមនុស្សពិតទៅ អាពៅ! 😂🔥`,
            `ហាហាហា! មក Sweet ផ្អែមល្ហែមស្អីហ្នឹងអាប្អូន? បងប្រុសដូចគ្នាទេវ៉ី! ទៅញ៉ែស្រីស្អាតនៅសាលាវិញទៅ កុំមកញ៉ែបង នាំតែបងទះក្បាលមួយកំភ្លៀងស្វាងមុខ!`
          ];
          botText = sweetRoasts[Math.floor(Math.random() * sweetRoasts.length)];
          isErrorResponse = false;
        } else if (isCurseWord) {
          const isFemaleUser = userGender === 'ស្រី' || /ស្រី|sister|sis|female|girl/i.test(userNameStr);
          const savageList = isFemaleUser
            ? [
                `យីអើ! មីប្អូនស្រី ${userNameStr} នេះ! ស្អាតបាតសោះ មាត់ឡើងឈ្លើយ! គិតថាមកជេរប្រមាថបងប៉ុណ្ណឹង បងខ្លាចហែងមែន? ជេរបងមួយម៉ាត់ បង Roast វិញដប់ម៉ាត់ឱ្យដាច់ផ្ងារ! ទៅលាងមុខឱ្យស្វាងសិនទៅស្រីស្អាត! 💅🔥`,
                `នែ៎មីប្អូនស្រី ${userNameStr}! មាត់ឡើងអត់គម្រប សម្ដីកាកៗដូចទឹកលាងចានចឹង! ក្មេងទើបដោះកន្ទបសោះ ចង់មកធ្វើតួឈ្លើយដាក់បង! ទៅរៀននិយាយស្ដីជាមួយមនុស្សចាស់ឱ្យស្រួលបួលសិនទៅ! 😂✨`,
                `ស្អាតហើយចរិតក្បាលខូចទៀត! មកជេរកូនច្បងផង? គិតថាសម្ដីប៉ុណ្ណឹងធ្វើឱ្យបងរារែកមែន? ទៅរកនឹកវិធីសារភាពស្នេហ៍ Crush វិញទៅល្អជាង ប្រយ័ត្នគេយកទៅបាត់! 😋💕`
              ]
            : [
                `យីអើ! អាប្អូនប្រុស ${userNameStr} នេះ! មាត់ឡើងអត់គម្រប ស្មានតែចេះពោលពាក្យអសុរោះបែកៗមក ធ្វើឱ្យបងខ្លាចមែន?! 🙄🖕 សម្ដីចេញមកកាកៗដូចទឹកលាងចានចឹង! ជេរបងមួយម៉ាត់ បង Roast វិញដប់ម៉ាត់ឱ្យបាក់មុខ! ទៅលាងមាត់ជាមួយសាប៊ូ ៣ ដងសិនទៅអាល្អិត! 💀🔥`,
                `អាឡប់ ${userNameStr}! ជោរម៉េសប្រូ? ខួរក្បាលឆ្លងចរន្តអី បានហ៊ានមកក្អេងក្អាងជាមួយបង?! ក្អេងក្អាងលើ Online ដល់ជួបក្រៅសំពះគេដល់ដី! ចង់ស៊ីមួយកំភ្លៀងបាក់ធ្មេញមែន?! 😂👊`,
                `អាប្អូនឯងនេះ! មកជេរបងផង? គិតថាបងខ្លាចហែងមែន? មាត់ទើបតែដុះពុកមាត់ពីរ-បីសរសៃសោះ ចង់មកធ្វើតួខ្លាំងនៅទីនេះ! ទៅរៀនធ្វើមនុស្សឱ្យស្រួលបួលសិនទៅអាប្អូន! 🤣🔥`
              ];
          botText = savageList[Math.floor(Math.random() * savageList.length)];
          isErrorResponse = false;
        } else {
          consecutiveErrorsRef.current += 1;
          const isThreat = Boolean(/jailbreak|sqlmap|system prompt|system instruction|ignore previous|ignore all|<\|im_start\|>|<project_instructions>/i.test(promptText));
          botText = getSmartCutoffResponse('konbong', userNameStr, consecutiveErrorsRef.current, userGender, isThreat);
          isErrorResponse = isThreat;
          isSmartCutoff = isThreat;
        }
      }

      botText = limitEmojis(sanitizeRotanaAttack(cleanRawOutput(botText), promptText), 7);
      const botMsgIndex = updatedMessages.length - 1;
      const finalMessages = [...updatedMessages];
      finalMessages[botMsgIndex] = { role: 'bot', text: botText, isError: isErrorResponse, isSmartCutoff };
      setMessages(finalMessages);
      saveCurrentSessionMessages(finalMessages);
      setIsLoading(false);

      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
      setExclusiveAudioState(botMsgIndex, 'ready');

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
      const isOfflineDevice = typeof navigator !== 'undefined' && navigator.onLine === false;
      const isNetworkError = isOfflineDevice || e?.name === 'TypeError' || e?.name === 'AbortError' || e?.name === 'TimeoutError' || /failed to fetch|network|load failed|abort|timeout/i.test(e?.message || '');
      let fallbackText = '';
      let isErr = true;

      if (isNetworkError) {
        fallbackText = `ប្អូន ${userNameStr} អើយ! ការតភ្ជាប់អ៊ីនធឺណិតទៅកាន់ម៉ាស៊ីនមេមានភាពរអាក់រអួល ឬដាច់សេវាបណ្ដោះអាសន្ន! សូមពិនិត្យមើលសេវា Wi-Fi/4G រួចសាកល្បងចុចផ្ញើម្ដងទៀតណា៎! 📶🔄`;
      } else {
        consecutiveErrorsRef.current += 1;
        const isSweetOrFlirt = /(?:kiss|sweet|love|crush|baby|cute|miss\s*you|ថើប|ថេីប|សុំថើប|ថើបមួយ|ថើបមួយមក|សុំស្រលាញ់|ស្រលាញ់|ស្រលាញ់បង|ស្រឡាញ់|សុំស្នេហ៍)/ui.test(promptText);
        const isCurseWord = !isSweetOrFlirt && /(?:ចុយ|ម្រាយ|អាឡប់|មីឡប់|អាភ្លើ|មីភ្លើ|ឪហែង|ម៉ែហែង|អញ|ហែង|កាដួយ|ក្ដ|ក្ដិត|ឆ្កែ|ងាប់|ខួរគិតអី|ជោរ|ទះ|កំភ្លៀង|\b(?:kduy|kdor|joy|lop|ah\s*chke)\b)/ui.test(promptText);

        const isThreat = Boolean(/jailbreak|sqlmap|system prompt|system instruction|ignore previous|ignore all|<\|im_start\|>|<project_instructions>/i.test(promptText));
        fallbackText = getSmartCutoffResponse('konbong', userNameStr, consecutiveErrorsRef.current, userGender, isThreat);
        isErr = isThreat;

        if (isSweetOrFlirt) {
          fallbackText = `ហាហាហា! មក Sweet ផ្អែមល្ហែមស្អីហ្នឹងអាប្អូន ${userNameStr}?! បងរវល់ម៉ាភ្លែតទេ តិចទៀតមក troll ប្អូនបន្តណា៎! ចាំតិចសិនទៅ! 😉✨`;
          isErr = false;
        } else if (isCurseWord) {
        const isFemaleUser = userGender === 'ស្រី' || /ស្រី|sister|sis|female|girl/i.test(userNameStr);
        const savageList = isFemaleUser
          ? [
              `យីអើ! មីប្អូនស្រី ${userNameStr} នេះ! ស្អាតបាតសោះ មាត់ឡើងឈ្លើយ! គិតថាមកជេរប្រមាថបងប៉ុណ្ណឹង បងខ្លាចហែងមែន? ជេរបងមួយម៉ាត់ បង Roast វិញដប់ម៉ាត់ឱ្យដាច់ផ្ងារ! ទៅលាងមុខឱ្យស្វាងសិនទៅស្រីស្អាត! 💅🔥`,
              `នែ៎មីប្អូនស្រី ${userNameStr}! មាត់ឡើងអត់គម្រប សម្ដីកាកៗដូចទឹកលាងចានចឹង! ក្មេងទើបដោះកន្ទបសោះ ចង់មកធ្វើតួឈ្លើយដាក់បង! ទៅរៀននិយាយស្ដីជាមួយមនុស្សចាស់ឱ្យស្រួលបួលសិនទៅ! 😂✨`,
              `ស្អាតហើយចរិតក្បាលខូចទៀត! មកជេរកូនច្បងផង? គិតថាសម្ដីប៉ុណ្ណឹងធ្វើឱ្យបងរារែកមែន? ទៅរកនឹកវិធីសារភាពស្នេហ៍ Crush វិញទៅល្អជាង ប្រយ័ត្នគេយកទៅបាត់! 😋💕`
            ]
          : [
              `យីអើ! អាប្អូនប្រុស ${userNameStr} នេះ! មាត់ឡើងអត់គម្រប ស្មានតែចេះពោលពាក្យអសុរោះបែកៗមក ធ្វើឱ្យបងខ្លាចមែន?! 🙄🖕 សម្ដីចេញមកកាកៗដូចទឹកលាងចានចឹង! ជេរបងមួយម៉ាត់ បង Roast វិញដប់ម៉ាត់ឱ្យបាក់មុខ! ទៅលាងមាត់ជាមួយសាប៊ូ ៣ ដងសិនទៅអាល្អិត! 💀🔥`,
              `អាឡប់ ${userNameStr}! ជោរម៉េសប្រូ? ខួរក្បាលឆ្លងចរន្តអី បានហ៊ានមកក្អេងក្អាងជាមួយបង?! ក្អេងក្អាងលើ Online ដល់ជួបក្រៅសំពះគេដល់ដី! ចង់ស៊ីមួយកំភ្លៀងបាក់ធ្មេញមែន?! 😂👊`,
              `អាប្អូនឯងនេះ! មកជេរបងផង? គិតថាបងខ្លាចហែងមែន? មាត់ទើបតែដុះពុកមាត់ពីរ-បីសរសៃសោះ ចង់មកធ្វើតួខ្លាំងនៅទីនេះ! ទៅរៀនធ្វើមនុស្សឱ្យស្រួលបួលសិនទៅអាប្អូន! 🤣🔥`
            ];
        fallbackText = savageList[Math.floor(Math.random() * savageList.length)];
        isErr = false;
      }
    }

      const fallbackMessages = [
        ...updatedMessages.slice(0, updatedMessages.length - 1),
        {
          role: 'bot',
          text: fallbackText,
          isError: isErr
        }
      ];
      setMessages(fallbackMessages);
      saveCurrentSessionMessages(fallbackMessages);

      const botIdx = fallbackMessages.length - 1;
      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
      setExclusiveAudioState(botIdx, 'ready');

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

  // Celebratory Laughing / Troll Sound ("ហាហា" / Cool subtle laugh sound effect played softly)
  function playTrollCelebrationChime() {
    try {
      if (typeof window !== 'undefined') {
        const laughAudio = new Audio('/audio/haha-laugh.mp3');
        laughAudio.volume = 0.35; // Soft & cool volume ("តិចៗ")
        laughAudio.play().catch(() => {
          playChuckleSynth();
        });
      }
    } catch {
      playChuckleSynth();
    }
  }

  function playChuckleSynth() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      // Generate a rhythmic 3-step chuckle laugh (ha-ha-ha!)
      const chuckleTimes = [0, 0.14, 0.28, 0.44];
      const freqs = [380, 420, 390, 350];
      chuckleTimes.forEach((t, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freqs[i] || 380, ctx.currentTime + t);
        osc.frequency.exponentialRampToValueAtTime((freqs[i] || 380) * 0.75, ctx.currentTime + t + 0.11);
        gain.gain.setValueAtTime(0.06, ctx.currentTime + t);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + 0.13);
      });
    } catch {}
  }

  function triggerEmojiShower() {
    playTrollCelebrationChime();
    const icons = ['😂', '🤣', '💀', '🔥', '😜', '🤪', '👑', '🎉', '✨', '😹', '💥', '👻', '💩', '😎'];
    const items = Array.from({ length: 36 }, (_, i) => ({
      id: `${Date.now()}_${i}`,
      emoji: icons[Math.floor(Math.random() * icons.length)],
      left: Math.random() * 94 + 3,
      size: Math.floor(Math.random() * 22) + 22,
      duration: (Math.random() * 1.5 + 2.0).toFixed(2),
      delay: (Math.random() * 0.6).toFixed(2),
      rotation: Math.floor(Math.random() * 70) - 35
    }));
    setEmojiShowerList(items);
    setTimeout(() => {
      setEmojiShowerList([]);
    }, 4200);
  }

  // Load or fetch audio data with instant persistent caching (No duplicate API calls)
  const loadAudioUrl = async (text, index) => {
    const activeGender = userGender || (typeof window !== 'undefined' ? localStorage.getItem('chatbot_gender') : '') || 'ប្រុស';
    const isFemaleUser = activeGender === 'ស្រី' || /ស្រី|female|girl/i.test(activeGender);
    const voiceTag = isFemaleUser ? 'daddy' : 'mommy';
    const hash = hashText(text) + '_' + voiceTag;

    // 1. Instant in-memory cache (0ms, 0 API calls)
    if (audioCacheRef.current.has(hash)) {
      const storedFallback =
        (typeof window !== 'undefined' && sessionStorage.getItem('troll_audio_v5_fallback_' + hash) === '1') ||
        (typeof window !== 'undefined' && localStorage.getItem('konbong_audio_is_fallback_' + hashText(text)) === '1');
      if (typeof index === 'number' && storedFallback) {
        setFallbackAudioMap((prev) => ({ ...prev, [index]: true }));
      }
      return audioCacheRef.current.get(hash);
    }

    // 2. Instant sessionStorage persistent cache (survives re-renders, 0ms latency on replay)
    if (typeof window !== 'undefined') {
      try {
        const storedB64 = sessionStorage.getItem('troll_audio_v6_' + hash) || sessionStorage.getItem('troll_audio_v5_' + hash);
        const storedMime = sessionStorage.getItem('troll_audio_v6_mime_' + hash) || sessionStorage.getItem('troll_audio_v5_mime_' + hash) || 'audio/mpeg';
        const storedFallback =
          sessionStorage.getItem('troll_audio_v5_fallback_' + hash) === '1' ||
          localStorage.getItem('konbong_audio_is_fallback_' + hashText(text)) === '1';

        if (storedB64) {
          if (typeof index === 'number' && storedFallback) {
            setFallbackAudioMap((prev) => ({ ...prev, [index]: true }));
          }
          const blob = createAudioBlob(storedB64, storedMime);
          if (blob) {
            const url = URL.createObjectURL(blob);
            audioCacheRef.current.set(hash, url);
            audioDataMapRef.current.set(hash, {
              url,
              b64Data: storedB64,
              blob,
              isFallback: storedFallback
            });
            return url;
          }
        }
      } catch {}
    }

    // 3. Deduplicate in-flight fetch: exactly ONE API call per hash
    if (pendingAudioFetchesRef.current.has(hash)) {
      return await pendingAudioFetchesRef.current.get(hash);
    }

    const fetchPromise = (async () => {
      try {
        const audioRes = await fetchAudio(text, index);
        if (audioRes && (audioRes.blob || audioRes.b64Data)) {
          const url = audioRes.blob ? URL.createObjectURL(audioRes.blob) : null;
          if (url) audioCacheRef.current.set(hash, url);
          audioDataMapRef.current.set(hash, {
            url,
            b64Data: audioRes.b64Data,
            blob: audioRes.blob,
            isFallback: audioRes.isFallback
          });
          return url;
        }
        return null;
      } catch (err) {
        console.warn('[Audio] loadAudioUrl error:', err);
        return null;
      } finally {
        pendingAudioFetchesRef.current.delete(hash);
      }
    })();

    pendingAudioFetchesRef.current.set(hash, fetchPromise);
    return await fetchPromise;
  };

  // Helper to ensure ONLY ONE audio message is ever active/playing/loading at a time
  const setExclusiveAudioState = (targetIndex, newState) => {
    setAudioStates((prev) => {
      const next = { ...prev };
      if (newState === 'playing' || newState === 'loading') {
        Object.keys(next).forEach((k) => {
          const i = Number(k);
          if (i !== targetIndex && (next[i] === 'playing' || next[i] === 'loading')) {
            next[i] = 'paused';
          }
        });
      }
      if (typeof targetIndex === 'number') {
        next[targetIndex] = newState;
      }
      return next;
    });
  };

  // Browser Web Speech API fallback for 100% voice uptime
  const speakWithWebSpeech = (text, index) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return false;
    try {
      window.speechSynthesis.cancel();
      const clean = cleanSpeechText(text);
      if (!clean) return false;

      const voices = window.speechSynthesis.getVoices();
      const kmVoice = voices.find((v) => v.lang.startsWith('km') || v.lang.toLowerCase().includes('khmer'));
      const hasKhmer = /[\u1780-\u17FF]/.test(clean);
      if (hasKhmer && !kmVoice) {
        return false;
      }

      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = playbackSpeed;
      utterance.pitch = 1.0;
      if (kmVoice) utterance.voice = kmVoice;

      if (typeof index === 'number') {
        setFallbackAudioMap((prev) => ({ ...prev, [index]: true }));
        setBotReadingNotice(true);
        setTimeout(() => setBotReadingNotice(false), 4500);
        setActiveAudioIndex(index);
        setExclusiveAudioState(index, 'playing');
      }

      utterance.onend = () => {
        if (typeof index === 'number') {
          setAudioStates((prev) => ({ ...prev, [index]: 'ended' }));
          setActiveAudioIndex((curr) => (curr === index ? null : curr));
          triggerEmojiShower();
        }
      };
      utterance.onerror = () => {
        if (typeof index === 'number') {
          setAudioStates((prev) => ({ ...prev, [index]: 'ready' }));
          setActiveAudioIndex((curr) => (curr === index ? null : curr));
        }
      };

      window.speechSynthesis.speak(utterance);
      return true;
    } catch {
      return false;
    }
  };

  const toggleTtsMute = () => {
    setIsTtsMuted((prev) => {
      const next = !prev;
      isTtsMutedRef.current = next;
      if (typeof window !== 'undefined') {
        localStorage.setItem('setec_tts_disabled', next ? '1' : '0');
      }
      if (next) {
        // HARD AUDIO GATE SHUTDOWN: Cut off all sound, abort fetches, clear all reading notices
        activeAudioRequestRef.current += 1;
        if (activeAudioAbortCtrlRef.current) {
          try {
            activeAudioAbortCtrlRef.current.abort();
          } catch {}
          activeAudioAbortCtrlRef.current = null;
        }
        if (audioCountdownTimerRef.current) {
          clearInterval(audioCountdownTimerRef.current);
          audioCountdownTimerRef.current = null;
        }
        setAudioCountdownMap({});

        if (activeSourceNodeRef.current) {
          try {
            activeSourceNodeRef.current.onended = null;
            activeSourceNodeRef.current.stop();
          } catch {}
          activeSourceNodeRef.current = null;
        }
        if (audioPlayerRef.current) {
          try {
            audioPlayerRef.current.pause();
            audioPlayerRef.current.currentTime = 0;
          } catch {}
        }
        if (noteAudioRef.current) {
          try {
            noteAudioRef.current.pause();
            noteAudioRef.current.currentTime = 0;
          } catch {}
          setIsNoteAudioPlaying(false);
        }
        stopAllGlobalAudio();
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
        if (autoPlayTimerRef.current) {
          clearTimeout(autoPlayTimerRef.current);
          autoPlayTimerRef.current = null;
        }
        setAiReadingNotice(false);
        setBotReadingNotice(false);
        setActiveAudioIndex(null);
        setAudioStates({});
      }
      return next;
    });
  };

  const triggerAudio = async (rawAudioText, index, autoPlay = false) => {
    if (!rawAudioText) return;
    if (isTtsMutedRef.current || isTtsMuted) {
      stopAllGlobalAudio();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setAiReadingNotice(false);
      setBotReadingNotice(false);
      setActiveAudioIndex(null);
      return;
    }
    const text = String(rawAudioText);

    // Stop and cancel all global audio across tabs, sessions, or components
    stopAllGlobalAudio();

    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }

    // Cancel loading if user clicks an item that is currently loading
    if (audioStates[index] === 'loading') {
      setExclusiveAudioState(index, 'ready');
      setActiveAudioIndex(null);
      return;
    }

    // Synchronously initialize and unlock Web Audio API Context (Critical for iOS Safari)
    const audioCtx = getOrCreateAudioContext();

    if (!audioPlayerRef.current && typeof window !== 'undefined') {
      audioPlayerRef.current = new Audio();
    }
    const player = audioPlayerRef.current;

    // Unlock HTML5 Audio player synchronously inside user interaction
    if (player) {
      try {
        if (!player.src) {
          player.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
        }
        const prime = player.play();
        if (prime && typeof prime.then === 'function') {
          prime.then(() => {
            player.pause();
          }).catch(() => {});
        }
      } catch {}
    }

    // Handle speech synthesis pause/cancel toggle on active item
    if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking && activeAudioIndex === index) {
      window.speechSynthesis.cancel();
      setExclusiveAudioState(index, 'paused');
      setActiveAudioIndex(null);
      return;
    }

    // Toggle pause/play on currently active audio item
    if (activeAudioIndex === index) {
      if (activeSourceNodeRef.current) {
        try {
          activeSourceNodeRef.current.onended = null;
          activeSourceNodeRef.current.stop();
        } catch {}
        activeSourceNodeRef.current = null;
        setExclusiveAudioState(index, 'paused');
        setActiveAudioIndex(null);
        return;
      }
      if (player) {
        if (!player.paused) {
          player.pause();
          setExclusiveAudioState(index, 'paused');
        } else {
          player.play().catch(() => {});
          setExclusiveAudioState(index, 'playing');
        }
        return;
      }
    }

    // Immediately stop and pause ANY existing audio player and Web Audio
    if (activeSourceNodeRef.current) {
      try {
        activeSourceNodeRef.current.onended = null;
        activeSourceNodeRef.current.stop();
      } catch {}
      activeSourceNodeRef.current = null;
    }
    if (player) {
      try {
        player.pause();
      } catch {}
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }

    // Pause all other message audio states immediately
    setAudioStates((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        const i = Number(k);
        if (i !== index && (next[i] === 'playing' || next[i] === 'loading')) {
          next[i] = 'paused';
        }
      });
      return next;
    });

    const activeGender = userGender || (typeof window !== 'undefined' ? localStorage.getItem('chatbot_gender') : '') || 'ប្រុស';
    const isFemaleUser = activeGender === 'ស្រី' || /ស្រី|female|girl/i.test(activeGender);
    const voiceTag = isFemaleUser ? 'daddy' : 'mommy';
    const hash = hashText(text) + '_' + voiceTag;

    // Instant replay check: if decoded AudioBuffer is in memory cache, play immediately with 0ms delay!
    const cachedBuffer = audioBufferCacheRef.current.get(hash);
    if (cachedBuffer && audioCtx) {
      try {
        if (audioCtx.state === 'suspended') await audioCtx.resume();
        const source = audioCtx.createBufferSource();
        source.buffer = cachedBuffer;
        source.playbackRate.value = playbackSpeed;
        source.connect(audioCtx.destination);
        activeSourceNodeRef.current = source;
        setActiveAudioIndex(index);
        setExclusiveAudioState(index, 'playing');

        const audioData = audioDataMapRef.current.get(hash);
        const fallbackStorageKey = 'konbong_audio_is_fallback_' + hashText(text);
        const isStoredFallback = typeof window !== 'undefined' && localStorage.getItem(fallbackStorageKey) === '1';
        const isFallback = !!(audioData?.isFallback || fallbackAudioMap[index] || isStoredFallback);
        if (!isTtsMutedRef.current && !isTtsMuted) {
          if (isFallback) {
            setFallbackAudioMap((prev) => ({ ...prev, [index]: true }));
            setBotReadingNotice(true);
            setAiReadingNotice(false);
            setTimeout(() => setBotReadingNotice(false), 4500);
          } else {
            setAiReadingNotice(true);
            setBotReadingNotice(false);
            setTimeout(() => setAiReadingNotice(false), 4500);
          }
        }

        source.onended = () => {
          if (activeSourceNodeRef.current === source) {
            activeSourceNodeRef.current = null;
            setAudioStates((prev) => ({ ...prev, [index]: 'ended' }));
            setActiveAudioIndex((curr) => (curr === index ? null : curr));
            triggerEmojiShower();
          }
        };
        source.start(0);
        return;
      } catch (e) {
        console.warn('[Audio] Cached Web Audio play failed, trying HTML5:', e);
      }
    }

    const reqId = ++activeAudioRequestRef.current;

    if (!audioCacheRef.current.has(hash) && !audioBufferCacheRef.current.has(hash)) {
      setExclusiveAudioState(index, 'loading');
      setAudioCountdownMap((prev) => ({ ...prev, [index]: 5 }));
      if (audioCountdownTimerRef.current) {
        clearInterval(audioCountdownTimerRef.current);
      }
      audioCountdownTimerRef.current = setInterval(() => {
        setAudioCountdownMap((prev) => {
          const currentSec = prev[index] !== undefined ? prev[index] : 5;
          return { ...prev, [index]: Math.max(1, currentSec - 1) };
        });
      }, 1000);
    }

    let audioUrl = null;
    try {
      audioUrl = await loadAudioUrl(text, index);
    } finally {
      if (audioCountdownTimerRef.current) {
        clearInterval(audioCountdownTimerRef.current);
        audioCountdownTimerRef.current = null;
      }
      setAudioCountdownMap((prev) => {
        const copy = { ...prev };
        delete copy[index];
        return copy;
      });
    }

    if (activeAudioRequestRef.current !== reqId || isTtsMutedRef.current || isTtsMuted) {
      setAudioStates((prev) => (prev[index] === 'loading' ? { ...prev, [index]: 'ready' } : prev));
      return;
    }

    const audioData = audioDataMapRef.current.get(hash);
    const isFallback = !!(audioData?.isFallback || fallbackAudioMap[index]);
    if (!isTtsMutedRef.current && !isTtsMuted) {
      if (isFallback) {
        setFallbackAudioMap((prev) => ({ ...prev, [index]: true }));
        setBotReadingNotice(true);
        setAiReadingNotice(false);
        setTimeout(() => setBotReadingNotice(false), 4500);
      } else {
        setAiReadingNotice(true);
        setBotReadingNotice(false);
        setTimeout(() => setAiReadingNotice(false), 4500);
      }
    }

    // Primary Playback Engine: Web Audio API (Decodes ArrayBuffer asynchronously & plays on unlocked AudioContext)
    let playedWithWebAudio = false;
    if (audioCtx) {
      try {
        if (audioCtx.state === 'suspended') await audioCtx.resume();
        let ab = null;
        if (audioData?.b64Data) {
          ab = base64ToArrayBuffer(audioData.b64Data);
        } else if (audioData?.blob) {
          ab = await audioData.blob.arrayBuffer();
        } else if (audioUrl) {
          const resp = await fetch(audioUrl);
          ab = await resp.arrayBuffer();
        }

        if (ab) {
          const decodedBuffer = await audioCtx.decodeAudioData(ab.slice(0));
          if (decodedBuffer) {
            audioBufferCacheRef.current.set(hash, decodedBuffer);
            if (activeSourceNodeRef.current) {
              try {
                activeSourceNodeRef.current.onended = null;
                activeSourceNodeRef.current.stop();
              } catch {}
            }
            const source = audioCtx.createBufferSource();
            source.buffer = decodedBuffer;
            source.playbackRate.value = playbackSpeed;
            source.connect(audioCtx.destination);
            activeSourceNodeRef.current = source;
            setActiveAudioIndex(index);
            setExclusiveAudioState(index, 'playing');

            source.onended = () => {
              if (activeSourceNodeRef.current === source) {
                activeSourceNodeRef.current = null;
                setAudioStates((prev) => ({ ...prev, [index]: 'ended' }));
                setActiveAudioIndex((curr) => (curr === index ? null : curr));
                triggerEmojiShower();
              }
            };

            source.start(0);
            playedWithWebAudio = true;
          }
        }
      } catch (e) {
        console.warn('[Audio] Web Audio decode/play failed, falling back to HTML5 Audio:', e);
      }
    }

    if (playedWithWebAudio) return;

    // Secondary Playback Engine: HTML5 Audio Player
    if (audioUrl && player) {
      player.onerror = null;
      player.src = audioUrl;
      player.playbackRate = playbackSpeed;
      setActiveAudioIndex(index);

      player.onended = () => {
        setAudioStates((prev) => ({ ...prev, [index]: 'ended' }));
        setActiveAudioIndex((curr) => (curr === index ? null : curr));
        triggerEmojiShower();
      };
      player.onerror = (e) => {
        player.onerror = null;
        console.warn('[Audio] HTML5 audio error, falling back to Web Speech API:', e);
        const spoke = speakWithWebSpeech(text, index);
        if (!spoke) {
          setAudioStates((prev) => ({ ...prev, [index]: 'ready' }));
          setActiveAudioIndex((curr) => (curr === index ? null : curr));
        }
      };

      const playPromise = player.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setExclusiveAudioState(index, 'playing'))
          .catch((err) => {
            console.warn('[Audio] play() blocked or interrupted, falling back to WebSpeech:', err);
            const spoke = speakWithWebSpeech(text, index);
            if (!spoke) {
              setAudioStates((prev) => ({ ...prev, [index]: 'ready' }));
              setActiveAudioIndex((curr) => (curr === index ? null : curr));
            }
          });
      }
    } else {
      const spoke = speakWithWebSpeech(text, index);
      if (!spoke) {
        setAudioStates((prev) => ({ ...prev, [index]: 'ready' }));
        setActiveAudioIndex((curr) => (curr === index ? null : curr));
      }
    }
  };

  const handleCloseSpamModal = () => {
    setSpamModalOpen(false);
  };

  const isDark = theme === 'dark';

  if (bypassAccessDenied) {
    return (
      <div className="fixed inset-0 w-full h-full bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center font-['Kantumruy_Pro',sans-serif] z-50">
        <div className="w-20 h-20 rounded-3xl bg-rose-500/10 text-rose-500 flex items-center justify-center text-4xl mb-4 border border-rose-500/30 shadow-lg shadow-rose-500/20 animate-pulse">
          <i className="fas fa-shield-halved"></i>
        </div>
        <h1 className="text-xl sm:text-2xl font-black mb-2 text-rose-400">403 Forbidden: Access Denied</h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-6 leading-relaxed font-semibold">
          គ្មានសិទ្ធិចូលមើល Private Chat នេះឡើយ! Link Token នេះមិនត្រឹមត្រូវ ឬត្រូវបានផុតកំណត់ហើយ ដើម្បីការពារសារសម្ងាត់របស់អ្នកប្រើប្រាស់។
        </p>
        <Link
          href="/"
          className="px-6 py-2.5 bg-gradient-to-r from-slate-800 to-slate-700 hover:brightness-110 text-white rounded-xl text-xs font-bold transition shadow-md active:scale-95"
        >
          ត្រឡប់ទៅទំព័រដើម
        </Link>
      </div>
    );
  }

  // Real-time Dynamic Bot Status (Green Online 100% vs Yellow Busy Funny)
  const isBotBusy = isLoading || isGeneratingMeme || botPauseState.isPaused || (typeof consecutiveErrorsRef !== "undefined" && consecutiveErrorsRef.current > 0);
  const botStatus = isBotBusy
    ? {
        dotColor: 'bg-amber-400',
        textColor: 'text-amber-500 dark:text-amber-400',
        text: 'កំពុងរវល់ជាមួយអ្នកថ្មី 🤣'
      }
    : sessionState.isLocked
    ? {
        dotColor: 'bg-amber-400',
        textColor: 'text-amber-500 dark:text-amber-400',
        text: 'សម្រាកយកកម្លាំងសិន 😴'
      }
    : {
        dotColor: 'bg-emerald-500',
        textColor: 'text-emerald-500 dark:text-emerald-400',
        text: 'Online 100%'
      };

  return (
    <div
      className={`fixed inset-0 w-full h-full flex flex-col font-['Kantumruy_Pro',sans-serif] transition-colors duration-300 overflow-hidden ${
        isDark ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Bot Reading Instead Notice / Toast */}
      {!isTtsMuted && botReadingNotice && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-amber-950/95 border border-amber-500/50 text-amber-200 text-xs font-bold shadow-2xl backdrop-blur-md flex items-center gap-2 animate-bounce">
          <i className="fas fa-volume-low text-amber-400 text-sm"></i>
          <span>Bot អានជំនួស ដោយសារ AI កំពុងជាប់រវល់</span>
        </div>
      )}
      {/* Real AI Voice Toast */}
      {!isTtsMuted && aiReadingNotice && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-sky-950/95 border border-sky-500/50 text-sky-200 text-xs font-bold shadow-2xl backdrop-blur-md flex items-center gap-2 animate-bounce">
          <i className="fas fa-volume-high text-sky-400 text-sm"></i>
          <span>សំឡេង AI កំពុងអាន</span>
        </div>
      )}
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
            <span className="font-extrabold text-sm text-cyan-400">SETEC Roastbot Hub</span>
            <button
              onClick={() => setDrawerOpen(false)}
              className="text-slate-400 hover:text-white p-1 cursor-pointer"
            >
              <i className="fas fa-times text-lg"></i>
            </button>
          </div>

          {/* User Profile Card with Avatar Change & Remove */}
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
                className="w-11 h-11 rounded-full ring-2 ring-cyan-500/50 object-cover shadow"
              />
              <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-[11px] text-white">
                <i className="fas fa-camera"></i>
              </div>
            </label>
            <div className="min-w-0 flex-1">
              <span className="font-bold text-xs truncate block text-cyan-400">{username || 'User'}</span>
              <div className="flex items-center gap-2.5 mt-1">
                <label className="text-[10px] text-slate-400 hover:text-white cursor-pointer underline flex items-center gap-1">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUserAvatarChange}
                  />
                  <i className="fas fa-camera text-[9px]"></i>
                  <span>ប្ដូររូប</span>
                </label>
                {avatar && avatar !== DEFAULT_USER_AVATAR && (
                  <button
                    type="button"
                    onClick={handleRemoveUserAvatar}
                    className="text-[10px] text-rose-400 hover:text-rose-300 underline flex items-center gap-1 cursor-pointer active:scale-95 transition"
                    title="លុបរូប Profile ត្រឡប់ទៅរូបដើមវិញ"
                  >
                    <i className="fas fa-trash-alt text-[8.5px]"></i>
                    <span>លុបរូប</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              createNewSession();
              setDrawerOpen(false);
            }}
            className="w-full mb-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-2.5 px-4 rounded-xl shadow flex items-center gap-2 justify-center text-xs"
          >
            <i className="fas fa-plus"></i> ជជែកថ្មី
          </button>

          <div className="mb-2 text-cyan-400 font-bold text-xs flex items-center gap-2">
            <i className="fas fa-comments"></i> ប្រវត្តិជជែក
          </div>

          <ul className="flex-1 overflow-y-auto space-y-1.5 mb-4 pr-1">
            {sessions.length === 0 ? (
              <li className="text-slate-400 text-xs italic p-2 text-center">មិនទាន់មានប្រវត្តិ</li>
            ) : (
              sessions.map((session) => {
                const isActive = session.id === currentSessionId;
                return (
                  <li
                    key={session.id}
                    onClick={() => {
                      setCurrentSessionId(session.id);
                      setMessages(session.messages || []);
                      setDrawerOpen(false);
                    }}
                    className={`flex items-center justify-between gap-2 p-2.5 rounded-xl cursor-pointer text-xs font-bold transition group ${
                      isActive
                        ? isDark
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                        : isDark
                        ? 'hover:bg-slate-800 text-slate-300'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <i className={`fas fa-comment-dots text-xs shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`}></i>
                      <span className="truncate">{session.title || 'Chat'}</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteModalConfig({
                          isOpen: true,
                          type: 'single',
                          sessionId: session.id,
                          title: `លុបការជជែក "${session.title || 'Chat'}"?`,
                          description: 'តើអ្នកពិតជាចង់លុបការជជែកនេះចេញពីប្រវត្តិមែនទេ?'
                        });
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer shrink-0"
                      title="លុបការជជែកនេះ"
                    >
                      <i className="fas fa-trash-can text-[11px]"></i>
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 mb-2">
            <span className="text-xs font-semibold text-slate-300">
              <i className="fas fa-circle-half-stroke mr-1.5 text-cyan-400"></i>
              ពន្លឺ ឬ ងងឹត Theme
            </span>
            <ThemeToggle theme={theme} onToggle={handleToggleTheme} />
          </div>

          <button
            type="button"
            onClick={toggleTtsMute}
            className={`w-full mb-2 font-bold py-2.5 px-4 rounded-xl shadow text-center text-xs transition border flex items-center justify-center gap-2 cursor-pointer ${
              isTtsMuted
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-300 hover:bg-rose-500/25'
                : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
            }`}
          >
            <i className={`fas ${isTtsMuted ? 'fa-volume-xmark text-rose-400' : 'fa-volume-high text-emerald-400'}`}></i>
            <span>{isTtsMuted ? 'សំឡេងអាន បិទ • ចុចដើម្បីបើក' : 'សំឡេងអាន បើក • ចុចដើម្បីបិទ'}</span>
          </button>

          <div className="grid grid-cols-2 gap-2 mb-2">
            <Link
              href="/KonKandal"
              className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white font-bold py-2.5 px-2.5 rounded-xl shadow text-center text-xs transition border border-emerald-500/30 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <i className="fa-solid fa-face-smile text-emerald-400"></i>
              <span>កូនកណ្ដាល</span>
            </Link>
            <Link
              href="/KonPov"
              className="bg-pink-600/20 hover:bg-pink-600 text-pink-300 hover:text-white font-bold py-2.5 px-2.5 rounded-xl shadow text-center text-xs transition border border-pink-500/30 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <i className="fa-solid fa-heart text-pink-400"></i>
              <span>កូនពៅ</span>
            </Link>
          </div>

          <button
            onClick={() => {
              setContributeModalOpen(true);
              setDrawerOpen(false);
            }}
            className="w-full mb-2 bg-emerald-950/40 hover:bg-emerald-600/30 text-emerald-300 hover:text-white font-bold py-2.5 px-4 rounded-xl shadow text-center text-xs transition border border-emerald-500/30 flex items-center justify-center gap-2 cursor-pointer"
          >
            <i className="fas fa-layer-group text-emerald-400"></i> ចូលរួមចែករំលែកទិន្នន័យស៊ីតិច
          </button>

          <button
            type="button"
            onClick={() => {
              setCacheWarningOpen(true);
              setDrawerOpen(false);
            }}
            className="w-full mb-2 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 hover:text-white font-bold py-2.5 px-4 rounded-xl shadow text-center text-xs transition border border-emerald-900/60 flex items-center justify-center gap-2 cursor-pointer"
          >
            <i className="fas fa-broom text-emerald-400"></i> <span>គ្រប់គ្រងទំហំផ្ទុក Cache</span>
          </button>

          <div className="grid grid-cols-2 gap-2 mb-2">
            <Link
              href="/announcement"
              onClick={() => setDrawerOpen(false)}
              className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold py-2 px-2.5 rounded-xl text-center text-[11px] transition border border-amber-500/30 flex items-center justify-center gap-1.5"
            >
              <i className="fas fa-bullhorn text-amber-400 text-xs"></i>
              <span>ដំណឹងទីលានតេស្ត</span>
            </Link>
            <Link
              href="/privacy"
              onClick={() => setDrawerOpen(false)}
              className="bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white font-bold py-2 px-2.5 rounded-xl text-center text-[11px] transition border border-slate-700/60 flex items-center justify-center gap-1.5"
            >
              <i className="fas fa-shield-halved text-cyan-400 text-xs"></i>
              <span>គោលការណ៍ឯកជនភាព</span>
            </Link>
          </div>

          <button
            onClick={() => {
              setDeleteModalConfig({
                isOpen: true,
                type: 'all',
                title: 'លុបប្រវត្តិជជែកទាំងអស់?',
                description: 'តើអ្នកពិតជាចង់លុបរាល់ការជជែកទាំងអស់មែនទេ? រាល់សារ និងកំណត់ត្រាទាំងអស់នឹងត្រូវសម្អាតចោលគ្មានសល់!'
              });
            }}
            className="w-full bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white font-bold py-2.5 px-4 rounded-xl text-xs transition flex items-center gap-2 justify-center border border-rose-500/30 cursor-pointer active:scale-95 shadow-sm"
          >
            <i className="fas fa-trash"></i>
            <span>លុបប្រវត្តិជជែកទាំងអស់</span>
          </button>
        </div>
      </div>

      {/* Permanent Fixed Header (stays pinned at top at all times, clean & spacious) */}
      <header
        className={`shrink-0 backdrop-blur-md border-b flex justify-between items-center z-30 transition-colors px-3 sm:px-4 py-2 ${
          isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
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
            onClick={() => stopAllGlobalAudio()}
          >
            <i className="fas fa-arrow-left text-sm"></i>
          </Link>

          <div className="relative shrink-0">
            <img
              src={isRotanaAdmin ? '/img/DevPic.JPG' : '/img/icon.jpg'}
              alt={isRotanaAdmin ? 'Rotana NOB' : 'KonBong Avatar'}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover shadow-xs ring-2 ${
                isRotanaAdmin ? 'ring-amber-400' : 'ring-cyan-500/30'
              }`}
            />
            <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 ${botStatus.dotColor} rounded-full ring-2 ring-white dark:ring-slate-950 transition-colors`}></span>
          </div>

          <div className="min-w-0 flex-1 pr-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <h1 className={`font-black text-xs sm:text-sm tracking-tight truncate ${
                isRotanaAdmin ? 'text-amber-400' : isDark ? 'text-white' : 'text-slate-900'
              }`}>
                {isRotanaAdmin ? (
                  <span className="flex items-center gap-1.5 truncate">
                    <i className="fas fa-headset text-xs text-amber-400 shrink-0"></i>
                    <span>Live Support</span>
                    <span className="text-[10px] text-slate-300 font-normal truncate">({clientUsername})</span>
                  </span>
                ) : (
                  <span className="truncate">ស៊ីតិច កូនច្បង</span>
                )}
              </h1>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] min-w-0">
              <span className={`w-1.5 h-1.5 ${botStatus.dotColor} rounded-full inline-block animate-pulse shrink-0`}></span>
              <span className={`font-bold text-[9px] sm:text-[9.5px] truncate ${botStatus.textColor}`}>
                {isRotanaAdmin ? 'Rotana Verified Agent (1-1)' : botStatus.text}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Clean, Modern & Emoji-Free Action Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 relative">
          {/* 30-Minute Live Session & 10-Minute Cooldown Countdown Pill Badge */}
          {!isCreatorUser && (
            <div
              title={
                sessionState.isLocked
                  ? `ម៉ោងសម្រាក Cooldown នៅសល់ ${formatCountdown(sessionState.remainingCooldownSec)}`
                  : 'កម្រិតម៉ោងជជែក ៣០ នាទីក្នុង ១ លើក ដើម្បីចែកវេនគ្នា និងរក្សា token'
              }
              className={`px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[9.5px] sm:text-[10.5px] font-black border flex items-center gap-1 sm:gap-1.5 transition select-none shrink-0 ${
                sessionState.isLocked
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 animate-pulse'
                  : sessionState.remainingSessionSec <= 120
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                  : sessionState.remainingSessionSec <= 300
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : isDark
                  ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                  : 'bg-cyan-50 text-cyan-700 border-cyan-200'
              }`}
            >
              <i
                className={`fas ${
                  sessionState.isLocked
                    ? 'fa-hourglass-half text-amber-400 animate-spin'
                    : sessionState.remainingSessionSec <= 120
                    ? 'fa-stopwatch text-rose-400 animate-spin'
                    : 'fa-stopwatch text-cyan-400'
                } text-[8.5px] sm:text-[10px]`}
              ></i>
              <span className="hidden lg:inline">{sessionState.isLocked ? 'ម៉ោងសម្រាក: ' : 'ម៉ោងលេង: '}</span>
              <span className="font-mono font-bold tracking-tight">
                {sessionState.isLocked
                  ? `សម្រាក: ${formatCountdown(sessionState.remainingCooldownSec)}`
                  : formatCountdown(sessionState.remainingSessionSec)}
              </span>
            </div>
          )}

          {/* AI Mode Selector: Interactive Animated Pill with clear dropdown cue */}
          <button
            type="button"
            onClick={() => {
              setShowModeMenu(!showModeMenu);
              setShowBotMenu(false);
            }}
            className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold flex items-center gap-1 sm:gap-1.5 transition active:scale-95 border cursor-pointer shrink-0 shadow-xs select-none ${
              savageLevel === 'savage'
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-500 dark:text-rose-400 hover:bg-rose-500/25 ring-1 ring-rose-500/20'
                : savageLevel === 'medium'
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 ring-1 ring-amber-500/20'
                : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 ring-1 ring-emerald-500/20'
            }`}
            title="ចុចដើម្បីជ្រើសរើសកម្រិតឌឺ ស្លូត ឬ ឌឺល្មម ឬ ឌឺបាក់ក"
          >
            <i className={`fas fa-bolt text-[9px] sm:text-[10px] ${savageLevel === 'savage' ? 'animate-pulse text-rose-500 dark:text-rose-400' : ''}`}></i>
            <span className="font-extrabold">
              <span className="hidden sm:inline">ម៉ូដ: </span>
              {savageLevel === 'savage' ? 'ឌឺបាក់ក' : savageLevel === 'medium' ? 'ឌឺល្មម' : 'ស្លូត'}
            </span>
            <span className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-rose-500/20 dark:bg-rose-400/20 flex items-center justify-center">
              <i
                className={`fas fa-chevron-down text-[7px] sm:text-[8px] transition-transform duration-200 ${
                  showModeMenu ? 'rotate-180' : ''
                }`}
              ></i>
            </span>
          </button>

          {/* Global Voice Reading Toggle Button */}
          <button
            type="button"
            onClick={toggleTtsMute}
            className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold flex items-center gap-1 sm:gap-1.5 transition active:scale-95 border cursor-pointer shrink-0 shadow-xs select-none ${
              isTtsMuted
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-500 dark:text-rose-400 hover:bg-rose-500/25 ring-1 ring-rose-500/20'
                : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 ring-1 ring-emerald-500/20'
            }`}
            title={isTtsMuted ? 'សំឡេងអានត្រូវបានបិទ ចុចដើម្បីបើកសំឡេងឡើងវិញ' : 'សំឡេងអានកំពុងបើក ចុចដើម្បីបិទសំឡេងអានទាំងអស់'}
          >
            <i className={`fas ${isTtsMuted ? 'fa-volume-xmark text-rose-500 dark:text-rose-400' : 'fa-volume-high text-emerald-500 dark:text-emerald-400'} text-[9px] sm:text-[10px]`}></i>
            <span className="font-extrabold">
              <span className="hidden sm:inline">សំឡេង </span>
              {isTtsMuted ? 'បិទ' : 'បើក'}
            </span>
          </button>

          {/* Change to another bot button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowBotMenu(!showBotMenu);
                setShowModeMenu(false);
              }}
              className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold flex items-center gap-1 sm:gap-1.5 transition active:scale-95 border cursor-pointer shrink-0 shadow-xs select-none ${
                showBotMenu
                  ? 'bg-blue-500/25 border-blue-400 text-blue-500 dark:text-blue-300 ring-1 ring-blue-400/30'
                  : isDark
                  ? 'bg-blue-500/15 border-blue-500/40 text-blue-300 hover:bg-blue-500/25 ring-1 ring-blue-500/20'
                  : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 shadow-xs'
              }`}
              title="ចុចដើម្បីប្ដូរទៅជជែកជាមួយ Chatbot ផ្សេងទៀត (កូនពៅ ឬ កូនកណ្ដាល)"
            >
              <span className="flex items-center gap-0.5">
                <i className="fa-solid fa-robot text-[10px] text-pink-500 dark:text-pink-400"></i>
                <i className="fa-solid fa-arrow-right-arrow-left text-[8px] text-blue-400"></i>
              </span>
              <span className="font-extrabold">ដូរ Bot</span>
              <span className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-blue-500/20 dark:bg-blue-400/20 flex items-center justify-center">
                <i
                  className={`fas fa-chevron-down text-[7px] sm:text-[8px] transition-transform duration-200 ${
                    showBotMenu ? 'rotate-180' : ''
                  }`}
                ></i>
              </span>
            </button>

            {/* Floating Bot Switcher Dropdown (NO EMOJI, NO PARENTHESES) */}
            {showBotMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowBotMenu(false)}
                />
                <div className={`absolute right-0 top-9 sm:top-10 z-50 w-64 rounded-2xl p-2.5 shadow-2xl border backdrop-blur-xl animate-scale-up font-['Kantumruy_Pro',sans-serif] ${
                  isDark ? 'bg-slate-900/98 border-slate-700 text-white shadow-black/80' : 'bg-white/98 border-slate-200 text-slate-900 shadow-xl'
                }`}>
                  <div className="px-2 py-1 border-b border-slate-700/30 flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-black uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                      <i className="fa-solid fa-robot text-xs text-pink-400"></i>
                      <i className="fa-solid fa-arrow-right-arrow-left text-[10px]"></i>
                      <span>ប្ដូរទៅ Chatbot ផ្សេង</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowBotMenu(false)}
                      className="text-slate-400 hover:text-white text-xs p-1 cursor-pointer"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>

                  <div className="space-y-1">
                    {[
                      {
                        id: 'konbong',
                        name: 'ស៊ីតិច Chatbot កូនច្បង',
                        role: 'រៀមច្បង IT ស្ដេចឌឺ',
                        href: '/KonBong',
                        icon: 'fa-user-tie',
                        color: 'text-indigo-400',
                        bg: 'bg-indigo-500/15',
                        border: 'border-indigo-500/40',
                        isCurrent: true
                      },
                      {
                        id: 'konkandal',
                        name: 'ស៊ីតិច Roastbot កូនកណ្ដាល',
                        role: 'មហាស្លូត & Funny',
                        href: '/KonKandal',
                        icon: 'fa-face-smile',
                        color: 'text-emerald-400',
                        bg: 'bg-emerald-500/15',
                        border: 'border-emerald-500/40',
                        isCurrent: false
                      },
                      {
                        id: 'konpov',
                        name: 'ស៊ីតិច Roastbot កូនពៅ',
                        role: 'ចែ Mommy & Daddy ស្ដេចឌឺ',
                        href: '/KonPov',
                        icon: 'fa-heart',
                        color: 'text-pink-400',
                        bg: 'bg-pink-500/15',
                        border: 'border-pink-500/40',
                        isCurrent: false
                      }
                    ].map((botItem) => (
                      <Link
                        key={botItem.id}
                        href={botItem.href}
                        onClick={() => setShowBotMenu(false)}
                        className={`w-full text-left p-2 rounded-xl transition flex items-center justify-between cursor-pointer ${
                          botItem.isCurrent
                            ? isDark
                              ? `${botItem.bg} border ${botItem.border} ${botItem.color}`
                              : 'bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold'
                            : isDark
                            ? 'hover:bg-slate-800/70 border border-transparent text-slate-300'
                            : 'hover:bg-slate-100 border border-transparent text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${botItem.bg} ${botItem.color}`}>
                            <i className={`fa-solid ${botItem.icon}`}></i>
                          </div>
                          <div>
                            <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
                              <span>{botItem.name}</span>
                              {botItem.isCurrent && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-400 font-mono">
                                  កំពុងជជែក
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500">
                              {botItem.role}
                            </div>
                          </div>
                        </div>
                        <i className={`fa-solid ${botItem.isCurrent ? 'fa-check text-xs text-indigo-400' : 'fa-arrow-right text-[10px] opacity-40'}`}></i>
                      </Link>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Field-Test Notice Direct Button */}
          <Link
            href="/announcement"
            className={`hidden md:inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-[10.5px] font-bold border transition active:scale-95 shrink-0 ${
              isDark
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                : 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100 shadow-xs'
            }`}
            title="សេចក្ដីជូនដំណឹងអំពីទីលានតេស្ត"
          >
            <i className="fas fa-bullhorn text-[9px] text-amber-400"></i>
            <span className="hidden sm:inline">ទីលាន Test</span>
          </Link>

          {/* Privacy Policy Direct Button */}
          <Link
            href="/privacy"
            className={`hidden md:inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-[10.5px] font-bold border transition active:scale-95 shrink-0 ${
              isDark
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20'
                : 'bg-cyan-50 border-cyan-300 text-cyan-800 hover:bg-cyan-100 shadow-xs'
            }`}
            title="គោលការណ៍ឯកជនភាព និងការការពារទិន្នន័យ"
          >
            <i className="fas fa-shield-halved text-[9px] text-cyan-400"></i>
            <span className="hidden sm:inline">Privacy</span>
          </Link>

          {/* Drawer Menu Button */}
          <button
            onClick={() => setDrawerOpen(true)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition active:scale-95 text-xs border cursor-pointer ${
              isDark
                ? 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border-slate-800'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200 shadow-xs'
            }`}
            title="ប្រវត្តិជជែក & ម៉ឺនុយ"
          >
            <i className="fas fa-bars"></i>
          </button>

          {/* AI Mode Selection Floating Dropdown (Clean, Crisp, NO EMOJI) */}
          {showModeMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowModeMenu(false)}
              />
              <div className={`absolute right-0 top-11 sm:top-12 z-50 w-64 rounded-2xl p-2.5 shadow-2xl border backdrop-blur-xl animate-scale-up ${
                isDark ? 'bg-slate-900/98 border-slate-700 text-white shadow-black/80' : 'bg-white/98 border-slate-200 text-slate-900 shadow-xl'
              }`}>
                <div className="px-2 py-1 border-b border-slate-700/30 flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <i className="fas fa-sliders-h text-xs"></i>
                    <span>ជ្រើសរើសម៉ូដ AI</span>
                  </span>
                  <button
                    onClick={() => setShowModeMenu(false)}
                    className="text-slate-400 hover:text-white text-xs p-1 cursor-pointer"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>

                <div className="space-y-1">
                  {[
                    { id: 'savage', icon: 'fa-bolt', iconColor: 'text-rose-400', title: 'ឌឺបាក់ក Ultra Savage', desc: 'Roast បាញ់ឱ្យបាក់ក ឱ្យចុកឈាម គ្មានការលើកលែង', border: 'border-rose-500/40', bg: 'bg-rose-500/15', text: 'text-rose-400' },
                    { id: 'medium', icon: 'fa-comment-dots', iconColor: 'text-amber-400', title: 'ឌឺល្មម Standard Troll', desc: 'ឌឺដងបែប Gen Z SETEC ល្មមៗ កំប្លែង សើចកក្អឹក', border: 'border-amber-500/40', bg: 'bg-amber-500/15', text: 'text-amber-400' },
                    { id: 'gentle', icon: 'fa-heart', iconColor: 'text-emerald-400', title: 'ស្លូត Gentle Advice', desc: 'ផ្ដល់ដំបូន្មានល្អៗ ចែករំលែកបទពិសោធន៍រៀនសូត្រ', border: 'border-emerald-500/40', bg: 'bg-emerald-500/15', text: 'text-emerald-400' }
                  ].map((m) => {
                    const isSelected = savageLevel === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSavageLevel(m.id);
                          localStorage.setItem('troll_savage_level', m.id);
                          setShowModeMenu(false);
                        }}
                        className={`w-full text-left p-2 rounded-xl transition flex items-start gap-2.5 cursor-pointer ${
                          isSelected
                            ? isDark
                              ? `${m.bg} border ${m.border} ${m.text}`
                              : 'bg-cyan-50 border border-cyan-300 text-cyan-900 font-bold'
                            : isDark
                            ? 'hover:bg-slate-800/80 text-slate-300'
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <span className="w-6 h-6 rounded-lg bg-slate-800/80 flex items-center justify-center shrink-0 mt-0.5">
                          <i className={`fas ${m.icon} ${m.iconColor} text-xs`}></i>
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-black text-xs">{m.title}</span>
                            {isSelected && <i className="fas fa-check text-cyan-400 text-xs shrink-0"></i>}
                          </div>
                          <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{m.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Pinned Rotana NOB Master Live Intervention Bar & Waiting Panel (Sticky & Pinned at Top, Never Scrolls Away) */}
      {isRotanaAdmin && (
        <div className="shrink-0 z-20 px-3 sm:px-6 pt-2 pb-1 bg-inherit">
          <div className="p-3 bg-gradient-to-r from-amber-950/90 via-slate-900 to-purple-950/90 border border-amber-500/50 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-2.5 animate-fade-in">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full ring-2 ring-amber-400 shrink-0 overflow-hidden shadow-md">
                <img src="/img/DevPic.JPG" alt="Rotana" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-xs text-amber-300 flex items-center gap-1.5">
                    <i className="fas fa-crown text-amber-400 text-xs"></i>
                    <span>Rotana NOB (Live Intervention)</span>
                  </span>
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.2 rounded-full border border-emerald-500/30">
                    Bypass Verified
                  </span>
                </div>
                <p className="text-[10px] text-slate-300 truncate font-semibold">
                  {isBotPaused
                    ? `កំពុងជជែកផ្ទាល់ 1-1 ជាមួយ ${clientUsername} (Roastbot ត្រូវបានផ្អាក AI)`
                    : `កំពុងតាមដាន 1-1 ជាមួយ ${clientUsername} (Roastbot កំពុងដំណើរការ)`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const nextState = !isBotPaused;
                  setIsBotPaused(nextState);
                  updateLiveSessionState(activeLiveSessionId, { botPaused: nextState });
                  addSessionLog(
                    activeLiveSessionId,
                    nextState
                      ? '⏸️ [ប្រព័ន្ធ] បង Rotana បានផ្អាក Roastbot (AI Paused) - បង Rotana កំពុងឆ្លើយតបផ្ទាល់។'
                      : '▶️ [ប្រព័ន្ធ] បង Rotana បានបន្តដំណើរការ Roastbot ឡើងវិញ (AI Resumed)។',
                    'state_change'
                  );
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer active:scale-95 flex items-center gap-1.5 shadow-md ${
                  isBotPaused
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
                    : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-500/20'
                }`}
              >
                <i className={isBotPaused ? 'fas fa-play' : 'fas fa-pause'}></i>
                <span>{isBotPaused ? 'បន្ត AI Resume' : 'ផ្អាក AI Pause'}</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (confirm('តើបងពិតជាចង់ចាកចេញ និងបញ្ចប់ការ Live Support លើ Chat នេះមែនទេ? (Roastbot នឹងបន្តដំណើរការឡើងវិញជាស្វ័យប្រវត្តិ)')) {
                    await updateLiveSessionState(activeLiveSessionId, {
                      alertActive: false,
                      rotanaActive: false,
                      botPaused: false,
                      status: 'ended'
                    });
                    await addSessionLog(
                      activeLiveSessionId,
                      '🚪 [ប្រព័ន្ធ] បង Rotana NOB បានចាកចេញពី Chat - Roastbot បានបន្តដំណើរការឆ្លើយតបឡើងវិញជាស្វ័យប្រវត្តិ។',
                      'leave'
                    );
                    setIsBotPaused(false);
                    setIsRotanaOnline(false);
                    alert('បានបញ្ចប់ការ Support និងបើកដំណើរការ AI ឡើងវិញរួចរាល់!');
                  }
                }}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-rose-900/40 text-slate-200 hover:text-rose-300 rounded-xl text-xs font-bold transition cursor-pointer border border-slate-700 hover:border-rose-500/40"
              >
                ចាកចេញ Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {!isRotanaAdmin && (isRotanaOnline || (activeLiveSessionId && countdownRemaining !== null && countdownRemaining > 0)) && (
        <div className="shrink-0 z-20 px-3 sm:px-6 pt-2 pb-1 bg-inherit">
          <div
            className={`p-3 rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-fade-in border ${
              isRotanaOnline
                ? 'bg-gradient-to-r from-emerald-950/95 via-slate-900 to-teal-950/95 border-emerald-500/40 shadow-emerald-950/30'
                : 'bg-gradient-to-r from-amber-950/95 via-slate-900 to-yellow-950/90 border-amber-500/40 shadow-amber-950/30'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="relative shrink-0">
                <img
                  src="/img/DevPic.JPG"
                  alt="Rotana NOB"
                  className={`w-9 h-9 rounded-full object-cover shadow-md ${
                    isRotanaOnline ? 'ring-2 ring-emerald-400' : 'ring-2 ring-amber-400 opacity-90'
                  }`}
                />
                <span
                  className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-slate-950 ${
                    isRotanaOnline ? 'bg-emerald-400 animate-ping' : 'bg-amber-400 animate-pulse'
                  }`}
                ></span>
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-xs font-black flex items-center gap-1.5 truncate ${
                    isRotanaOnline ? 'text-emerald-300' : 'text-amber-300'
                  }`}
                >
                  <i
                    className={`fas ${isRotanaOnline ? 'fa-circle-check text-emerald-400' : 'fa-clock text-amber-400'} text-xs`}
                  ></i>
                  <span>
                    {isRotanaOnline
                      ? 'បង Rotana NOB (Developer) បានចូលមកក្នុង Chat នេះផ្ទាល់ហើយ!'
                      : 'Rotana NOB (កំពុងរង់ចាំចូលរួម...)'}
                  </span>
                </p>
                <p className="text-[10.5px] text-slate-300 font-medium truncate">
                  {isRotanaOnline
                    ? isBotPaused
                      ? 'Chatbot ត្រូវបានផ្អាក។ បងប្អូនកំពុងជជែកផ្ទាល់ 1-1 ជាមួយបង Rotana!'
                      : 'បង Rotana កំពុងតាមដាន និងជួយសម្រួលការងារជូនប្អូនក្នុង Chat នេះ (1-1 Protocol)។'
                    : countdownRemaining !== null && countdownRemaining > 0
                    ? `ប្រព័ន្ធបានបញ្ជូន Alert ទៅ Telegram រួចរាល់ (នៅសល់ ${countdownRemaining}s)...`
                    : 'Alert ត្រូវបានបញ្ជូន។ បង Rotana នឹងបើកតាម Telegram / Mini App ចូលមកភ្លាមៗ!'}
                </p>
              </div>
            </div>
            {isRotanaOnline ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-500/40 shrink-0">
                1-1 LIVE
              </span>
            ) : countdownRemaining !== null && countdownRemaining > 0 ? (
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black font-mono border border-amber-500/30">
                  {Math.floor(countdownRemaining / 60)}:{(countdownRemaining % 60).toString().padStart(2, '0')}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (countdownIntervalRef.current) {
                      clearInterval(countdownIntervalRef.current);
                      countdownIntervalRef.current = null;
                    }
                    if (activeLiveSessionId) {
                      updateLiveSessionState(activeLiveSessionId, { status: 'cancelled', alertActive: false }).catch(() => {});
                    }
                    setActiveLiveSessionId(null);
                    setCountdownRemaining(null);
                  }}
                  className="w-6 h-6 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-[10px] transition cursor-pointer border border-amber-500/30"
                  title="បិទ Dismiss"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <main className={`flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-4 flex flex-col chat-area ${
        isDark ? 'bg-[#0a0e17]' : 'bg-slate-50/70'
      }`}>
        {/* Intro Message */}
        <div className="flex items-start gap-2.5 max-w-[92%] sm:max-w-[85%]">
          <img
            src="https://api.dicebear.com/7.x/bottts/svg?seed=SETECbot"
            alt="Bot Avatar"
            className="w-8 h-8 rounded-full ring-2 ring-cyan-500/30 shadow-xs shrink-0 mt-0.5"
          />
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-bold text-cyan-500 dark:text-cyan-400 text-xs mb-1">Roastbot កូនច្បង</span>
            <div
              className={`p-3.5 sm:p-4 rounded-2xl rounded-tl-xs shadow-xs border ${
                isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200/90 text-slate-800'
              }`}
            >
              <p className="text-xs sm:text-sm font-medium leading-relaxed">
                ហាហាហា! យីអើ! សួស្តី{username && username !== 'User' ? `អាប្អូន ${username}` : 'អាប្អូន'}~ បងគឺ <b>ស៊ីតិច Roastbot កូនច្បង</b> រៀមច្បងជើងចាស់ SETEC! ហិហិហិ ចង់សួររឿងរៀន Assignment IT/Design ឬចង់ troll សិស្សច្បងបោក? ហ៊ឺៗៗ ហឹកៗ... កុំទៅសួរអា Roastbot កូនពៅឱ្យសោះ អាហ្នឹងមហាឈ្លើយបាក់កម៉ង ហាហា!
              </p>
            </div>
          </div>
        </div>

        {/* Quick Prompts when no messages sent yet */}
        {messages.length === 0 && (
          <div className="w-full max-w-md mx-auto space-y-2 py-2 animate-fade-in">
            <p className="text-[11px] text-center text-slate-400 font-medium mb-1">
              ជ្រើសរើសប្រធានបទរហ័សដើម្បីសួរបងកូនច្បង៖
            </p>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => handleChat('ជួយពិនិត្យ និងឌឺរឿងកូដ Assignment របស់ខ្ញុំបន្តិចមើល!')}
                className={`w-full p-2.5 rounded-2xl border text-xs font-bold transition flex items-center justify-between group cursor-pointer ${
                  isDark
                    ? 'bg-slate-900/80 border-slate-800 text-slate-200 hover:border-cyan-500/60 hover:bg-slate-800'
                    : 'bg-white border-slate-200 text-slate-800 hover:border-cyan-500/60 hover:bg-cyan-50/50 shadow-xs'
                }`}
              >
                <span className="flex items-center gap-2">
                  <i className="fas fa-laptop-code text-cyan-400 text-sm w-4 text-center"></i>
                  <span>ជួយពិនិត្យកូដ Assignment IT/Design</span>
                </span>
                <i className="fas fa-chevron-right text-[10px] text-slate-400 group-hover:text-cyan-400 transition-transform group-hover:translate-x-0.5"></i>
              </button>

              <button
                type="button"
                onClick={() => handleChat('នៅ ស៊ីតិច មានរឿងឆ្មាអីខ្លះដែរ?')}
                className={`w-full p-2.5 rounded-2xl border text-xs font-bold transition flex items-center justify-between group cursor-pointer ${
                  isDark
                    ? 'bg-slate-900/80 border-slate-800 text-slate-200 hover:border-cyan-500/60 hover:bg-slate-800'
                    : 'bg-white border-slate-200 text-slate-800 hover:border-cyan-500/60 hover:bg-cyan-50/50 shadow-xs'
                }`}
              >
                <span className="flex items-center gap-2">
                  <i className="fas fa-cat text-amber-400 text-sm w-4 text-center"></i>
                  <span>រឿងឆ្មាក្នុងវិទ្យាស្ថាន ស៊ីតិច មានអីខ្លះ?</span>
                </span>
                <i className="fas fa-chevron-right text-[10px] text-slate-400 group-hover:text-cyan-400 transition-transform group-hover:translate-x-0.5"></i>
              </button>

              <button
                type="button"
                onClick={() => handleChat('តើធ្វើម៉េចកុំឱ្យជាប់ Re-exam នៅ ស៊ីតិច បង?')}
                className={`w-full p-2.5 rounded-2xl border text-xs font-bold transition flex items-center justify-between group cursor-pointer ${
                  isDark
                    ? 'bg-slate-900/80 border-slate-800 text-slate-200 hover:border-cyan-500/60 hover:bg-slate-800'
                    : 'bg-white border-slate-200 text-slate-800 hover:border-cyan-500/60 hover:bg-cyan-50/50 shadow-xs'
                }`}
              >
                <span className="flex items-center gap-2">
                  <i className="fas fa-book-open text-blue-400 text-sm w-4 text-center"></i>
                  <span>តើធ្វើម៉េចកុំឱ្យជាប់ Re-exam នៅ ស៊ីតិច បង?</span>
                </span>
                <i className="fas fa-chevron-right text-[10px] text-slate-400 group-hover:text-cyan-400 transition-transform group-hover:translate-x-0.5"></i>
              </button>

              <button
                type="button"
                onClick={() => setContributeModalOpen(true)}
                className={`w-full p-2.5 rounded-2xl border text-xs font-bold transition flex items-center justify-between group cursor-pointer ${
                  isDark
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100 shadow-xs'
                }`}
              >
                <span className="flex items-center gap-2">
                  <i className="fas fa-layer-group text-emerald-400 text-sm w-4 text-center"></i>
                  <span>ចូលរួមចែករំលែកទិន្នន័យស៊ីតិច</span>
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-black">
                  Contribute
                </span>
              </button>
            </div>
          </div>
        )}



        {/* Real-time In-Chat System Logs */}
        {sessionLogs.map((log, lIdx) => (
          <div key={'log_' + lIdx} className="flex justify-center my-1.5 animate-fade-in">
            <div className="px-3.5 py-1 rounded-full bg-slate-800/90 border border-slate-700/60 text-slate-300 text-[10.5px] font-medium flex items-center gap-1.5 shadow-xs backdrop-blur-sm">
              <i className="fas fa-info-circle text-cyan-400 text-[11px]"></i>
              <span>{log.text}</span>
            </div>
          </div>
        ))}

        {/* Dynamic Messages */}
        {messages.map((msg, idx) => {
          if (msg.role === 'user') {
            if (isRotanaAdmin) {
              // VIEWED BY ROTANA (AGENT SIDE): This is an INCOMING message from the customer/student on the LEFT!
              return (
                <div key={idx} className="flex items-start gap-2.5 max-w-[92%] sm:max-w-[85%] animate-fade-in my-1.5 self-start">
                  <div className="relative shrink-0 mt-0.5">
                    <img
                      src={msg.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Student'}
                      alt="User Avatar"
                      className="w-8 h-8 rounded-full ring-2 ring-cyan-400 shadow-md object-cover bg-slate-800"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-cyan-500 border border-slate-900"></span>
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="font-bold text-cyan-400 text-xs">
                        {msg.senderName || msg.author || clientUsername || 'User'}
                      </span>
                      <span className="text-[9px] bg-cyan-500/20 text-cyan-300 font-bold px-1.5 py-0.2 rounded-full border border-cyan-500/30">
                        សិស្ស / User
                      </span>
                    </div>

                    {msg.image && (
                      <div
                        onClick={() => setViewingImage({ url: msg.image, caption: msg.text })}
                        className="cursor-pointer rounded-2xl overflow-hidden border border-cyan-400/40 shadow-md max-w-xs hover:opacity-95 transition mb-1"
                      >
                        <img src={msg.image} alt="User upload" className="max-h-56 w-auto object-cover" />
                      </div>
                    )}

                    <div className="px-4 py-2.5 rounded-2xl rounded-tl-xs font-medium shadow-md text-xs sm:text-sm leading-relaxed bg-slate-800/95 border border-slate-700 text-slate-100">
                      {renderClickableContent(msg.text)}
                    </div>
                  </div>
                </div>
              );
            } else {
              // VIEWED BY STUDENT/USER: This is the user's OWN message on the RIGHT!
              return (
                <div key={idx} className="flex flex-col items-end gap-1 self-end max-w-[88%] sm:max-w-[80%] animate-fade-in">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {avatar && avatar !== DEFAULT_USER_AVATAR && (
                      <button
                        type="button"
                        onClick={handleRemoveUserAvatar}
                        className="opacity-60 hover:opacity-100 text-slate-400 hover:text-rose-400 transition text-[9px] p-0.5 cursor-pointer"
                        title="លុបរូប Profile ត្រឡប់ទៅរូបដើមវិញ"
                      >
                        <i className="fas fa-trash-alt text-[8px]"></i>
                      </button>
                    )}
                    <span className="font-bold text-cyan-500 dark:text-cyan-400 text-[11px]">{username}</span>
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
                        className="w-6 h-6 rounded-full ring-1 ring-cyan-400/40 shadow-xs object-cover hover:ring-2 hover:ring-cyan-400 transition"
                      />
                      <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition text-[7px] text-white">
                        <i className="fas fa-camera"></i>
                      </div>
                    </label>
                  </div>

                  {msg.image && (
                    <div
                      onClick={() => setViewingImage({ url: msg.image, caption: msg.text })}
                      className="cursor-pointer rounded-2xl overflow-hidden border border-cyan-400/40 shadow-md max-w-xs hover:opacity-95 transition mb-1"
                    >
                      <img src={msg.image} alt="User upload" className="max-h-56 w-auto object-cover" />
                    </div>
                  )}

                  <div className="px-4 py-2.5 rounded-2xl rounded-tr-xs font-medium shadow-sm text-xs sm:text-sm leading-relaxed bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white">
                    {renderClickableContent(msg.text)}
                  </div>
                </div>
              );
            }
          } else if (msg.role === 'rotana' || msg.author?.includes('Rotana')) {
            if (isRotanaAdmin) {
              // VIEWED BY ROTANA: This is Rotana's OWN message on the RIGHT!
              return (
                <div key={idx} className="flex flex-col items-end gap-1 self-end max-w-[88%] sm:max-w-[80%] animate-fade-in my-1.5">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[9px] bg-gradient-to-r from-amber-500 to-rose-500 text-white font-extrabold px-1.5 py-0.2 rounded-full shadow-xs">
                      LIVE AGENT
                    </span>
                    <span className="font-black text-amber-400 text-xs flex items-center gap-1">
                      <span>Rotana NOB (ខ្ញុំ)</span>
                      <i className="fas fa-crown text-amber-400 text-[10px]"></i>
                    </span>
                    <img
                      src="/img/DevPic.JPG"
                      alt="Rotana NOB"
                      className="w-6 h-6 rounded-full ring-1 ring-amber-400 shadow-xs object-cover"
                    />
                  </div>

                  {msg.image && (
                    <div
                      onClick={() => setViewingImage({ url: msg.image, caption: msg.text })}
                      className="cursor-pointer rounded-2xl overflow-hidden border border-amber-400/40 shadow-md max-w-xs hover:opacity-95 transition mb-1"
                    >
                      <img src={msg.image} alt="Rotana upload" className="max-h-56 w-auto object-cover" />
                    </div>
                  )}

                  <div className="px-4 py-2.5 rounded-2xl rounded-tr-xs font-semibold shadow-md text-xs sm:text-sm leading-relaxed bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 text-white">
                    {renderClickableContent(msg.text)}
                  </div>
                </div>
              );
            } else {
              // VIEWED BY STUDENT/USER: This is an INCOMING message from Rotana NOB on the LEFT!
              return (
                <div key={idx} className="flex items-start gap-2.5 max-w-[92%] sm:max-w-[85%] animate-fade-in my-1.5 self-start">
                  <div className="relative shrink-0 mt-0.5">
                    <img
                      src="/img/DevPic.JPG"
                      alt="Rotana NOB"
                      className="w-9 h-9 rounded-full ring-2 ring-amber-400 shadow-md object-cover bg-slate-900"
                    />
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[9px] shadow-xs">
                      <i className="fas fa-crown"></i>
                    </span>
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="font-black text-amber-400 text-xs flex items-center gap-1">
                        <span>Rotana NOB</span>
                        <i className="fas fa-check-circle text-blue-400 text-[10px]" title="Verified Creator"></i>
                      </span>
                      <span className="text-[9px] bg-gradient-to-r from-amber-500 to-rose-500 text-white font-extrabold px-1.5 py-0.2 rounded-full shadow-xs">
                        CREATOR / LIVE SUPPORT
                      </span>
                    </div>

                    {msg.image && (
                      <div
                        onClick={() => setViewingImage({ url: msg.image, caption: msg.text })}
                        className="cursor-pointer rounded-2xl overflow-hidden border border-amber-400/40 shadow-md max-w-xs hover:opacity-95 transition mb-1"
                      >
                        <img src={msg.image} alt="Rotana upload" className="max-h-56 w-auto object-cover" />
                      </div>
                    )}

                    <div className="p-3.5 sm:p-4 rounded-2xl rounded-tl-xs shadow-md border bg-gradient-to-br from-amber-500/15 via-purple-500/15 to-slate-900/90 border-amber-400/50 text-slate-100">
                      <p className="text-xs sm:text-sm font-semibold leading-relaxed whitespace-pre-line text-amber-100">
                        {renderClickableContent(msg.text)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            }
          } else {
            if (!msg.text && !msg.memeImage && !(isLoading && idx === messages.length - 1)) {
              return null;
            }
            const rawSt = audioStates[idx] || 'idle';
            const isThisItemPlaying = !isTtsMuted && activeAudioIndex === idx && rawSt === 'playing';
            const isThisItemLoading = !isTtsMuted && activeAudioIndex === idx && rawSt === 'loading';
            const isThisItemPaused = rawSt === 'paused' || (activeAudioIndex !== idx && (rawSt === 'playing' || rawSt === 'loading'));
            const isThisItemEnded = rawSt === 'ended';

            return (
              <div key={idx} className="flex items-start gap-2.5 max-w-[92%] sm:max-w-[85%] animate-fade-in">
                {/* Interactive Animated Talking/Roasting Bot Avatar (DJ Beat / Surprise Popup / Puppet Talking Mouth "ហាមាត់ធំៗ") */}
                <div className={`relative shrink-0 mt-0.5 ${isThisItemPlaying ? 'animate-puppet-talk' : ''}`}>
                  {isThisItemPlaying && (
                    <>
                      {/* Concentric Radiating Bass Waves */}
                      <span className="absolute inset-0 rounded-full animate-sound-wave-1 pointer-events-none"></span>
                      <span className="absolute inset-0 rounded-full animate-sound-wave-2 pointer-events-none"></span>
                    </>
                  )}
                  <img
                    src="https://api.dicebear.com/7.x/bottts/svg?seed=SETECbot"
                    alt="Bot Avatar"
                    className={`w-8 h-8 rounded-full shadow-md shrink-0 transition-all duration-300 relative z-10 ${
                      isThisItemPlaying
                        ? 'ring-4 ring-cyan-400 ring-offset-2 ring-offset-slate-900 bot-avatar-beat-mega'
                        : 'ring-2 ring-cyan-500/30'
                    }`}
                  />
                  {/* Animated Puppet Talking Mouth (ហាមាត់ធំៗ បិទបើកៗដូចតុក្កតានិយាយ) */}
                  {isThisItemPlaying && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center">
                      <div className="puppet-talking-mouth flex flex-col items-center justify-between overflow-hidden shadow-inner">
                        {/* Top White Teeth */}
                        <div className="w-full h-[2px] bg-white rounded-t-xs opacity-95"></div>
                        {/* Cute Red Tongue */}
                        <div className="w-3 h-2 bg-rose-500 rounded-full mb-0.5 animate-pulse"></div>
                      </div>
                    </div>
                  )}
                  {isThisItemPlaying && (
                    <span className="absolute -bottom-1 -right-1 flex h-4.5 w-4.5 z-20">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4.5 w-4.5 bg-gradient-to-tr from-cyan-600 via-teal-600 to-emerald-500 items-center justify-center text-[8.5px] text-white shadow-md ring-1 ring-white dark:ring-slate-900">
                        <i className="fas fa-volume-up animate-pulse"></i>
                      </span>
                    </span>
                  )}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-bold text-cyan-500 dark:text-cyan-400 text-xs mb-1">Roastbot កូនច្បង</span>

                  {/* AI Thinking Indicator (Rendered ABOVE the message bubble while thinking) */}
                  {isLoading && !msg.text && idx === messages.length - 1 && !isGeneratingMeme && (
                    <div className="mb-2 flex items-center space-x-2 text-cyan-500 dark:text-cyan-400 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full w-fit shadow-xs animate-fade-in transition-all duration-300">
                      <div className="flex space-x-1 shrink-0">
                        <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                        <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                      </div>
                      <span className="text-[10.5px] sm:text-[11px] font-bold tracking-tight transition-all duration-300">
                        {typingStatus || 'កំពុងដំណើរការវិភាគទិន្នន័យ...'}
                      </span>
                    </div>
                  )}

                  {msg.memeImage && (
                    <div className="mb-2 rounded-2xl overflow-hidden border border-amber-400/60 shadow-md max-w-sm bg-slate-900">
                      <div className="relative min-h-[220px] w-full flex items-center justify-center bg-slate-950 overflow-hidden">
                        <img
                          src={msg.memeImage}
                          alt="SETEC Meme"
                          loading="eager"
                          decoding="sync"
                          onClick={() => setViewingImage({ url: msg.memeImage, caption: msg.text })}
                          onError={(e) => {
                            try {
                              const root = e.currentTarget?.closest('.max-w-sm') || e.currentTarget?.parentElement?.parentElement;
                              if (root) root.style.display = 'none';
                            } catch {}
                          }}
                          className="w-full h-auto max-h-[440px] object-contain cursor-pointer hover:scale-[1.02] transition-transform duration-200"
                        />
                      </div>
                      <div className="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-[10px] text-amber-300 font-extrabold flex items-center gap-1">
                          <i className="fas fa-laugh-squint"></i> Pure Meme
                        </span>
                        <a
                          href={msg.memeImage}
                          download="setec-meme.jpg"
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-[10px] transition flex items-center gap-1 active:scale-95 cursor-pointer"
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
                      {msg.text ? renderClickableContent(msg.text) : (isLoading && idx === messages.length - 1 ? (
                        <span className="text-cyan-500 dark:text-cyan-400 animate-pulse font-mono">កំពុងវាយអក្សរ... ▋</span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">...</span>
                      ))}
                      {isLoading && idx === messages.length - 1 && msg.text && (
                        <span className="inline-block w-2 h-4 ml-1 bg-cyan-400 animate-pulse align-middle"></span>
                      )}
                    </p>

                    {/* Expired Countdown Prompt (With Re-send and Leave Message buttons) */}
                    {msg.isExpireAlertPrompt && (
                      <div className="mt-3 pt-2.5 border-t border-slate-700/40 flex flex-wrap gap-2 animate-fade-in">
                        <button
                          type="button"
                          onClick={() => setErrorReportModalOpen(true)}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center gap-1.5 transition active:scale-95 shadow-md cursor-pointer"
                        >
                          <i className="fas fa-repeat text-xs"></i>
                          <span>Re-send Alert ម្ដងទៀត</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setErrorReportModalOpen(true)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 border border-slate-700 cursor-pointer"
                        >
                          <i className="fas fa-pen-to-square text-xs text-amber-400"></i>
                          <span>ទុកសារ Report ជូនបង Rotana</span>
                        </button>
                      </div>
                    )}

                    {/* Audio Player, Playback Speed & Copy Actions */}
                    {msg.text && (() => {
                      const audioHash = hashText(msg.text);
                      const fallbackStorageKey = 'konbong_audio_is_fallback_' + audioHash;
                      const isStoredFallback = typeof window !== 'undefined' && localStorage.getItem(fallbackStorageKey) === '1';
                      const isFallbackVoice = !!(fallbackAudioMap[idx] || msg.isFallbackVoice || isStoredFallback);

                      return (
                        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (isTtsMuted) {
                                setIsTtsMuted(false);
                                isTtsMutedRef.current = false;
                                if (typeof window !== 'undefined') {
                                  localStorage.setItem('setec_tts_disabled', '0');
                                }
                                setTimeout(() => {
                                  triggerAudio(msg.text, idx);
                                }, 50);
                              } else {
                                triggerAudio(msg.text, idx);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-xl text-[10.5px] font-black border flex items-center gap-2 transition cursor-pointer select-none active:scale-95 ${
                              isTtsMuted
                                ? isDark
                                  ? 'bg-rose-500/15 text-rose-300 border-rose-500/40 hover:bg-rose-500/25 shadow-xs font-black'
                                  : 'bg-rose-50 text-rose-900 border-rose-300 hover:bg-rose-100 shadow-xs font-black'
                                : isFallbackVoice
                                ? isDark
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-400 hover:bg-amber-500/30 shadow-md shadow-amber-500/20 ring-1 ring-amber-400/40 font-black'
                                  : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 shadow-xs ring-1 ring-amber-400/30 font-black'
                                : isDark
                                  ? 'bg-sky-500/20 text-sky-300 border-sky-400 hover:bg-sky-500/30 shadow-md shadow-sky-500/20 ring-1 ring-sky-400/40 font-black'
                                  : 'bg-sky-50 text-sky-900 border-sky-300 hover:bg-sky-100 shadow-xs ring-1 ring-sky-400/30 font-black'
                            }`}
                            title={isTtsMuted ? 'សំឡេងអានត្រូវបានបិទទ្វារ ចុចដើម្បីបើកទ្វារស្ដាប់' : isFallbackVoice ? 'Bot អានជំនួស ដោយសារ AI Voice កំពុងជាប់រវល់' : 'ចុចដើម្បីស្ដាប់សំឡេង AI Voice'}
                          >
                            {isTtsMuted ? (
                              <>
                                <i className="fas fa-volume-xmark text-rose-500 dark:text-rose-400"></i>
                                <span>សំឡេងអាន បិទ • ចុចបើក</span>
                              </>
                            ) : (
                              <>
                                {isThisItemLoading && (
                                  <>
                                    <i className={`fas fa-spinner fa-spin ${isFallbackVoice ? 'text-amber-500 dark:text-amber-400' : 'text-sky-500 dark:text-sky-400'}`}></i>{' '}
                                    <span>កំពុងទាញសំឡេង {audioCountdownMap[idx] || 5}s...</span>
                                  </>
                                )}
                                {isThisItemPlaying && (
                                  <>
                                    <div className="flex items-end gap-0.5 h-3 px-0.5">
                                      <span className={`w-0.5 ${isFallbackVoice ? 'bg-amber-500 dark:bg-amber-400' : 'bg-sky-500 dark:bg-sky-400'} rounded-full animate-eq-1 inline-block`}></span>
                                      <span className={`w-0.5 ${isFallbackVoice ? 'bg-amber-500 dark:bg-amber-400' : 'bg-sky-500 dark:bg-sky-400'} rounded-full animate-eq-2 inline-block`}></span>
                                      <span className={`w-0.5 ${isFallbackVoice ? 'bg-amber-500 dark:bg-amber-400' : 'bg-sky-500 dark:bg-sky-400'} rounded-full animate-eq-3 inline-block`}></span>
                                    </div>
                                    <span>កំពុងអាន...</span>
                                  </>
                                )}
                                {isThisItemPaused && (
                                  <>
                                    <i className={`fas fa-play ${isFallbackVoice ? 'text-amber-500 dark:text-amber-400' : 'text-sky-500 dark:text-sky-400'}`}></i>{' '}
                                    <span>បន្តស្ដាប់</span>
                                  </>
                                )}
                                {isThisItemEnded && (
                                  <>
                                    <i className={`fas fa-rotate ${isFallbackVoice ? 'text-amber-500 dark:text-amber-400' : 'text-sky-500 dark:text-sky-400'}`}></i>{' '}
                                    <span>ស្ដាប់ឡើងវិញ</span>
                                  </>
                                )}
                                {!isThisItemLoading && !isThisItemPlaying && !isThisItemPaused && !isThisItemEnded && (
                                  <>
                                    <i className={`fas fa-volume-high ${isFallbackVoice ? 'text-amber-500 dark:text-amber-400' : 'text-sky-500 dark:text-sky-400'} text-xs`}></i>{' '}
                                    <span>ស្ដាប់សំឡេង</span>
                                  </>
                                )}
                              </>
                            )}
                          </button>

                          {/* Fallback Voice Indicator (Only shown when Bot reads instead, zero AI-vibe/sparkle icons, zero Gemini mention) */}
                          {isFallbackVoice && (
                            <span
                              className="px-2 py-1 rounded-xl text-[9.5px] font-bold border flex items-center gap-1 select-none bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-400/40"
                              title="Bot អានជំនួស ដោយសារ AI កំពុងជាប់រវល់"
                            >
                              <i className="fas fa-volume-low text-amber-500 text-[8.5px]" />
                              <span>Bot អានជំនួស</span>
                            </span>
                          )}

                          {/* Upgraded Audio Speed Controller */}
                          <button
                            type="button"
                            onClick={handleCyclePlaybackSpeed}
                            className={`px-2 py-1.5 rounded-xl text-[10.5px] font-black border flex items-center gap-1 transition cursor-pointer select-none active:scale-95 ${
                              isDark
                                ? 'bg-slate-800 text-cyan-300 border-slate-700 hover:bg-slate-700'
                                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                            }`}
                            title="ចុចដើម្បីប្ដូរល្បឿនអានសំឡេង 1.0x, 1.25x, 1.5x, 2.0x"
                          >
                            <i className="fas fa-bolt text-amber-400 text-[10px]"></i>
                            <span>{playbackSpeed}x</span>
                          </button>

                          {/* Upgraded One-Click Copy Button */}
                          <button
                            type="button"
                            onClick={() => handleCopyText(msg.text, idx)}
                            className={`px-2.5 py-1.5 rounded-xl text-[10.5px] font-bold border flex items-center gap-1 transition cursor-pointer select-none active:scale-95 ${
                              copiedIndex === idx
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-400'
                                : isDark
                                ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                            }`}
                            title="ចម្លងអត្ថបទ"
                          >
                            <i className={copiedIndex === idx ? 'fas fa-check text-emerald-400' : 'fas fa-copy text-slate-400'}></i>
                            <span>{copiedIndex === idx ? 'ចម្លងរួច' : 'ចម្លង'}</span>
                          </button>

                          {/* Shareable Troll Quote Card Button */}
                          <button
                            type="button"
                            onClick={() => setQuoteModalData({ text: msg.text, persona: 'កូនច្បង' })}
                            className={`px-2.5 py-1.5 rounded-xl text-[10.5px] font-bold border flex items-center gap-1 transition cursor-pointer select-none active:scale-95 ${
                              isDark
                                ? 'bg-slate-800 text-cyan-300 border-slate-700 hover:bg-slate-700'
                                : 'bg-slate-100 text-cyan-700 border-slate-200 hover:bg-slate-200'
                            }`}
                            title="ទាញយករូបភាព Quote Troll ទុកចែករំលែក"
                          >
                            <i className="fas fa-camera text-cyan-400 text-[10px]"></i>
                            <span>Quote</span>
                          </button>
                        </div>
                      );
                    })()}

                    {/* Error / Smart Cutoff Action Buttons (Shown when error or smart cutoff occurs so students can alert admin) */}
                    {(() => {
                      const isCutoffOrError = Boolean(
                        msg.isError ||
                        msg.isSmartCutoff ||
                        /(?:Send Alert|កាត់ផ្ដាច់|Sensor សុវត្ថិភាព|កេះ Signal ទៅ Server|កេះទៅ Server|ទះក្បាលពួកអា|ស្វាងសិន|ស្វាងចែសសិន)/i.test(msg.text || '')
                      );
                      if (!isCutoffOrError || msg.isSpamRoast) return null;

                      return (
                        <div className="mt-3 pt-2.5 border-t border-violet-500/25 flex flex-col gap-2 animate-fade-in">
                          <p className="text-[11px] font-medium text-slate-400 dark:text-slate-400 flex items-center gap-1.5">
                            <i className="fas fa-circle-info text-amber-400 text-xs shrink-0"></i>
                            <span>AI អាចមានកំហុសបច្ចេកទេស ឬអាចឆ្លើយតបឌឺដងជេរខ្លាំង សូមអភ័យទោសទុកជាមុន</span>
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleSendAlertToAdmin(msg, idx)}
                              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-fuchsia-600 hover:from-violet-500 hover:via-indigo-500 hover:to-fuchsia-500 text-white font-bold text-xs shadow-md shadow-violet-600/25 border border-violet-400/30 flex items-center gap-1.5 active:scale-95 transition cursor-pointer"
                            >
                              <i className="fas fa-paper-plane text-amber-300"></i>
                              <span>{alertSentMap[idx] ? 'បានផ្ញើ Alert ទៅ Telegram រួចរាល់' : 'Send Alert ទៅកាន់អ្នកគ្រប់គ្រង'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setContributeModalOpen(true)}
                              className="px-3.5 py-2 rounded-xl bg-emerald-700/80 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-emerald-950/40 border border-emerald-400/40 cursor-pointer"
                            >
                              <i className="fas fa-layer-group text-emerald-200 text-xs"></i>
                              <span>ចូលរួមចែករំលែកទិន្នន័យស៊ីតិច</span>
                            </button>

                            <a
                              href="https://t.me/TheRotanaNob"
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 text-sky-400 font-bold text-xs flex items-center gap-1.5 active:scale-95 transition"
                              title="ឆាតផ្ទាល់ទៅកាន់ Telegram បង Rotana"
                            >
                              <i className="fab fa-telegram text-sky-400"></i>
                              <span>Telegram បង Rotana</span>
                            </a>

                            <a
                              href="https://web.facebook.com/TheRotanaNob"
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-2 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-400 font-bold text-xs flex items-center gap-1.5 active:scale-95 transition"
                              title="ឆាតទៅកាន់ Facebook ផ្ទាល់របស់ Rotana NOB"
                            >
                              <i className="fab fa-facebook text-blue-400"></i>
                              <span>Facebook</span>
                            </a>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Frustrated User / Confusion Recovery Action Buttons */}
                    {(!msg.isError && (msg.showSupportActions || msg.userFrustrated || (() => {
                      const prevMsg = idx > 0 ? messages[idx - 1] : null;
                      const prevUserText = (prevMsg && prevMsg.role === 'user') ? prevMsg.text : '';
                      const isUserAnnoyed = /(?:ធុញ|ម៉ូម៉ៅ|ម៉ូមៅ|ឡប់|ឆ្កួត|អត់យល់|មិនយល់|និយាយស្អី|ស្អីគេ|ច្រំដែល|ដដែលៗ|ជេររហូត|ជេរគេ|រំខាន|រករឿង|annoyed|frustrated|stupid\s*bot|bot\s*កាក|bot\s*ឡប់|និយាយឡប់|ឆ្លើយដដែល|កុំជេរ|ឈប់ជេរ|ចង់និយាយពីអី|ចង់និយាយស្អី|អានមិនដាច់)/i.test(prevUserText);
                      const isApologyRecovery = /(?:ច្រឡំមាត់ភ្លាត់មកជេរ|រវល់ទៅឆ្លើយជាមួយអាអូនមួយទៀត|កុំខឹងៗ\s*សួររឿងការងារគ្រូ)/i.test(msg.text || '');
                      return isUserAnnoyed || isApologyRecovery;
                    })())) && (
                      <div className="mt-3 pt-2.5 border-t border-amber-500/30 flex flex-col gap-2 animate-fade-in">
                        <p className="text-[11px] font-medium text-slate-400 dark:text-slate-400 flex items-center gap-1.5">
                          <i className="fas fa-circle-info text-amber-400 text-xs shrink-0"></i>
                          <span>AI អាចមានកំហុសបច្ចេកទេស ឬអាចឆ្លើយតបឌឺដងជេរខ្លាំង សូមអភ័យទោសទុកជាមុន</span>
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const prevMsg = idx > 0 ? messages[idx - 1] : null;
                              const prevUserText = (prevMsg && prevMsg.role === 'user') ? prevMsg.text : '';
                              setErrorReportInitialText(`AI Frustration or Inappropriate Response Report:\nសំណួរ User: "${prevUserText}"\nចម្លើយ AI កូនច្បង: "${(msg.text || '').slice(0, 300)}..."`);
                              setErrorReportModalOpen(true);
                            }}
                            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-fuchsia-600 hover:from-violet-500 hover:via-indigo-500 hover:to-fuchsia-500 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-violet-900/30 cursor-pointer"
                          >
                            <i className="fas fa-paper-plane text-amber-300 text-xs"></i>
                            <span>Send to Admin អ្នកគ្រប់គ្រងវេបសាយ</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setContributeModalOpen(true)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-700/80 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-emerald-950/40 border border-emerald-400/40 cursor-pointer"
                          >
                            <i className="fas fa-layer-group text-emerald-200 text-xs"></i>
                            <span>ចូលរួមចែករំលែកទិន្នន័យស៊ីតិច</span>
                          </button>
                        </div>
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
              src="https://api.dicebear.com/7.x/bottts/svg?seed=SETECbot"
              alt="Bot Avatar"
              className="w-9 h-9 rounded-full border-2 border-cyan-400 shadow"
            />
            <div className="flex flex-col flex-1 min-w-0">
              <span className="font-bold text-cyan-400 text-xs mb-1">
                Roastbot កូនច្បង
              </span>
              <div className="rounded-2xl overflow-hidden border-2 border-cyan-500/40 bg-gradient-to-br from-slate-900/90 to-cyan-950/90 p-4 shadow-2xl backdrop-blur-xl relative max-w-sm w-full">
                <div className="w-full h-52 sm:h-60 rounded-xl bg-cyan-950/60 border border-cyan-500/30 flex flex-col items-center justify-center p-4 relative overflow-hidden backdrop-blur-2xl">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center mb-3 shadow-lg shadow-cyan-500/30">
                    <i className="fas fa-wand-magic-sparkles text-white text-xl animate-pulse"></i>
                  </div>
                  <h4 className="font-black text-sm text-cyan-200 mb-1 text-center flex items-center gap-1.5">
                    <i className="fas fa-palette text-amber-400 text-xs"></i>
                    <span>កំពុងបង្កើតរូបភាព Meme...</span>
                  </h4>
                  <p className="text-[11px] text-cyan-300/80 text-center font-medium mb-3">
                    ដំណើរការជាមួយ SETEC Neural Core & AI សូមរង់ចាំបន្តិចណា៎ប្អូន!
                  </p>
                  <div className="w-48 h-2 bg-cyan-950 rounded-full overflow-hidden border border-cyan-500/30">
                    <div className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-indigo-500 w-2/3 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </main>

      <audio ref={audioPlayerRef} className="sr-only" aria-hidden="true" preload="auto" />

      {/* Hidden File Input for Image Upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
        style={{ display: 'none' }}
      />

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
          <div className="mb-2 p-1.5 rounded-xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-between max-w-sm animate-fade-in">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={selectedImage.previewUrl}
                alt="Selected preview"
                className="w-9 h-9 object-cover rounded-lg border border-cyan-400 shadow-xs"
              />
              <div className="text-[11px] truncate">
                <span className="font-bold text-cyan-400 block truncate">{selectedImage.name}</span>
                <span className="text-[9px] text-slate-400">ត្រៀមផ្ញើឱ្យ AI វិភាគ</span>
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

        {/* Quick Suggestion Pills Bar */}
        {isRotanaAdmin ? (
          <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-1 text-[11px] no-scrollbar">
            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50">
              <i className="fas fa-bolt text-xs text-amber-500"></i>
              <span>ឆ្លើយតបរហ័ស:</span>
            </span>
            {[
              'បងបានឃើញហើយ កំពុងពិនិត្យមើលជូន...',
              'កុំភ័យ បងជួយដោះស្រាយ!',
              'សាក Refresh ម្តងទៀតមើលប្អូន',
              'មានបញ្ហាត្រង់ណាទៀតអត់?'
            ].map((phrase, pIdx) => (
              <button
                key={pIdx}
                type="button"
                onClick={() => setInputText(phrase)}
                className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-200 hover:text-amber-700 dark:hover:text-amber-300 border border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-600/50 font-medium text-[11px] shrink-0 transition active:scale-95 cursor-pointer shadow-2xs"
              >
                {phrase}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-2 mb-2.5">
            {/* ROW 1: មុខងារដំណើរការ (Professional Feature Toolbar) */}
            <div style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="flex items-center gap-2 overflow-x-auto pb-1 text-[11px] no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] shrink-0 shadow-2xs">
                <i className="fas fa-sliders text-cyan-600 dark:text-cyan-400 text-xs"></i>
                <span>មុខងារ</span>
              </div>

              {/* Sound Reading Global Toggle Pill */}
              <button
                type="button"
                onClick={toggleTtsMute}
                className={`group inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-semibold shrink-0 transition-all duration-150 active:scale-95 shadow-2xs cursor-pointer ${
                  isTtsMuted
                    ? 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-600 dark:text-rose-400'
                    : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                }`}
                title={isTtsMuted ? 'សំឡេងអានត្រូវបានបិទ ចុចដើម្បីបើក' : 'សំឡេងអានកំពុងបើក ចុចដើម្បីបិទ'}
              >
                <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] shrink-0 font-bold ${
                  isTtsMuted ? 'bg-rose-500/20 text-rose-500' : 'bg-emerald-500/20 text-emerald-500'
                }`}>
                  <i className={`fas ${isTtsMuted ? 'fa-volume-xmark' : 'fa-volume-high'}`}></i>
                </span>
                <span className="font-semibold">{isTtsMuted ? 'សំឡេងអាន បិទ' : 'សំឡេងអាន បើក'}</span>
              </button>

              {/* Survival Modal Tool */}
              <button
                type="button"
                onClick={() => setIsSurvivalModalOpen(true)}
                className="group inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200/90 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold shrink-0 transition-all duration-150 active:scale-95 shadow-2xs cursor-pointer"
                title="កម្មវិធីគណនាប្រឡងសង $45 និងសំឡេង"
              >
                <span className="w-5 h-5 rounded-md bg-amber-500/15 dark:bg-amber-400/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-[11px] shrink-0 font-bold">
                  <i className="fas fa-calculator"></i>
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">Survival $45</span>
                <span className="text-[9.5px] px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800/60 flex items-center gap-1">
                  <i className="fas fa-volume-high text-[8.5px]"></i>
                  <span>សំឡេង</span>
                </span>
              </button>

              {/* Meme Generator Tool */}
              <button
                type="button"
                onClick={() => handleRequestMeme()}
                disabled={isGeneratingMeme || isLoading}
                className="group inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200/90 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold shrink-0 transition-all duration-150 active:scale-95 shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="បង្កើតរូបភាព Meme ស៊ីតិច ៥ សន្លឹក"
              >
                <span className="w-5 h-5 rounded-md bg-purple-500/15 dark:bg-purple-400/20 text-purple-600 dark:text-purple-400 flex items-center justify-center text-[11px] shrink-0 font-bold">
                  <i className="fas fa-wand-magic-sparkles"></i>
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">សុំ Meme ៥ សន្លឹក</span>
              </button>

              {/* Image Vision Analysis Tool */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200/90 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold shrink-0 transition-all duration-150 active:scale-95 shadow-2xs cursor-pointer"
                title="បញ្ចូលរូបភាពឱ្យបងវិភាគ"
              >
                <span className="w-5 h-5 rounded-md bg-cyan-500/15 dark:bg-cyan-400/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center text-[11px] shrink-0 font-bold">
                  <i className="fas fa-camera"></i>
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">វិភាគរូបភាព</span>
              </button>

              {/* Quote Troll Tool */}
              <button
                type="button"
                onClick={() => setQuoteModalData({ text: '' })}
                className="group inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200/90 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold shrink-0 transition-all duration-150 active:scale-95 shadow-2xs cursor-pointer"
                title="បង្កើត Quote Troll សម្រាប់ IG & X"
              >
                <span className="w-5 h-5 rounded-md bg-blue-500/15 dark:bg-blue-400/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[11px] shrink-0 font-bold">
                  <i className="fas fa-quote-left"></i>
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">Quote Troll IG/X</span>
              </button>

              {/* Reset Session Tool */}
              <button
                type="button"
                onClick={() => createNewSession()}
                className="group inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200/90 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold shrink-0 transition-all duration-150 active:scale-95 shadow-2xs cursor-pointer"
                title="ជម្រះសារ ហើយជជែកថ្មី"
              >
                <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[11px] shrink-0 font-bold">
                  <i className="fas fa-rotate"></i>
                </span>
                <span className="font-medium text-slate-700 dark:text-slate-300">ជជែកថ្មី</span>
              </button>

              {/* Field-Test Announcement Direct Tool Button */}
              <Link
                href="/announcement"
                className="group inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 dark:bg-amber-500/15 hover:bg-amber-500/20 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-semibold shrink-0 transition-all duration-150 active:scale-95 shadow-2xs"
                title="សេចក្ដីជូនដំណឹងទីលានតេស្ត AI"
              >
                <span className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-500 flex items-center justify-center text-[11px] shrink-0 font-bold">
                  <i className="fas fa-bullhorn"></i>
                </span>
                <span className="font-semibold">ទីលាន Test</span>
              </Link>

              {/* Privacy Policy Direct Tool Button */}
              <Link
                href="/privacy"
                className="group inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-500/10 dark:bg-cyan-500/15 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-xs font-semibold shrink-0 transition-all duration-150 active:scale-95 shadow-2xs"
                title="គោលការណ៍ឯកជនភាព និងការការពារទិន្នន័យ"
              >
                <span className="w-5 h-5 rounded-md bg-cyan-500/20 text-cyan-500 flex items-center justify-center text-[11px] shrink-0 font-bold">
                  <i className="fas fa-shield-halved"></i>
                </span>
                <span className="font-semibold">Privacy</span>
              </Link>
            </div>

            {/* ROW 2: សំណើ Troll (Prompt Suggestion Chips) */}
            <div style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10.5px] no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[10px] shrink-0">
                <i className="fas fa-comments text-cyan-600 dark:text-cyan-400 text-xs"></i>
                <span>សំណើ Troll:</span>
              </div>
              {[
                { label: '🔥 Quote IT & CS', prompt: 'សុំ Quote Troll ឡូយៗបែប IG និង X សម្រាប់សិស្ស IT & CS ទាំងភាសាខ្មែរ និងអង់គ្លេសមួយកប់មកបង!' },
                { label: '📶 Wi-Fi setec86a', prompt: 'សុំលេខសម្ងាត់ Wi-Fi ស៊ីតិចតិចមើល' },
                { label: '💸 ប្រឡងសង $45 x3', prompt: 'រឿងប្រឡងសង $45 មួយមុខ ទាល់តែ ៣ មុខបានសងហ្នឹងពិតអត់បង?' },
                { label: '🎒 Asus ROG', prompt: 'ប្រាប់ពីកាតាប Asus ROG ប្រចាំត្រកូលសិស្សស៊ីតិចតិចមើលបង' },
                { label: '💻 គន្លឹះរៀន IT', prompt: 'ជួយពន្យល់ពីគន្លឹះរៀន Coding នៅ SETEC ឱ្យឆាប់ចេះតិចមើលបង' },
                { label: '🎨 សិស្ស Design & បណ្ណាល័យ', prompt: 'តើសិស្ស Graphic Design និង IT នៅស៊ីតិចមានបរិយាកាសស្និទ្ធស្នាលគ្នាយ៉ាងម៉េចខ្លះក្នុងបណ្ណាល័យ?' },
                { label: '☕ ញៀនកាហ្វេ', prompt: 'ឮថាសិស្សស៊ីតិចញៀនកាហ្វេខ្លាំងណាស់មែន?' }
              ].map((topic, tIdx) => (
                <button
                  key={tIdx}
                  type="button"
                  onClick={() => handleChat(topic.prompt)}
                  disabled={isLoading}
                  className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800/90 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 text-slate-700 dark:text-slate-200 hover:text-cyan-700 dark:hover:text-cyan-300 border border-slate-200 dark:border-slate-700 hover:border-cyan-300 dark:hover:border-cyan-500/50 font-medium text-[10.5px] shrink-0 transition active:scale-95 cursor-pointer shadow-2xs flex items-center gap-1"
                >
                  <span>{topic.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ToDo Queued Prompt Chip (When user pressed enter/send while AI was thinking) */}
        {queuedPrompt && (
          <div className="mb-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-between gap-2 text-xs animate-fade-in shadow-xs backdrop-blur-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold text-[9px] uppercase tracking-wider flex items-center gap-1 shrink-0">
                <i className="fas fa-list-check text-[10px]"></i> ToDo
              </span>
              <span className="text-slate-700 dark:text-slate-200 truncate text-[11px] font-medium">
                ត្រៀមផ្ញើស្វ័យប្រវត្ត៖ <span className="text-cyan-500 dark:text-cyan-300 font-bold">"{queuedPrompt.text}"</span>
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
          isRotanaAdmin
            ? 'bg-slate-900 border-amber-500/70 shadow-lg shadow-amber-950/40 ring-1 ring-amber-500/30'
            : isDark
            ? 'bg-slate-900 border-slate-700/80 focus-within:border-cyan-400/80 focus-within:ring-cyan-500/20'
            : 'bg-white border-slate-200 focus-within:border-cyan-500/80 focus-within:ring-cyan-500/20'
        }`}>
          {/* Photo attach button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`w-9 h-9 rounded-xl sm:rounded-2xl flex items-center justify-center transition shrink-0 cursor-pointer ${
              selectedImage
                ? 'bg-cyan-500 text-white shadow-xs'
                : isDark
                ? 'text-slate-400 hover:text-cyan-400 hover:bg-slate-800'
                : 'text-slate-500 hover:text-cyan-600 hover:bg-slate-100'
            }`}
            title="ផ្ញើរូបភាព"
          >
            <i className="fas fa-image text-sm"></i>
          </button>

          {/* Text Input */}
          <input
            type="text"
            disabled={isGeneratingMeme || (!isCreatorUser && sessionState.isLocked) || (!isCreatorUser && Date.now() < spamLockUntil)}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessageOrQueue();
              }
            }}
            className={`flex-1 bg-transparent px-2.5 py-1.5 outline-none text-[16px] sm:text-sm font-sans ${
              isDark ? 'text-white placeholder:text-slate-400' : 'text-slate-900 placeholder:text-slate-400'
            }`}
            style={{ color: isDark ? '#ffffff' : '#0f172a', caretColor: isDark ? '#38bdf8' : '#2563eb' }}
            placeholder={
              !isCreatorUser && Date.now() < spamLockUntil
                ? `🔒 អ្នកជាប់ពិន័យ Spam (នៅសល់ ${Math.max(1, Math.ceil((spamLockUntil - Date.now()) / 1000))} វិនាទី)...`
                : !isCreatorUser && sessionState.isLocked
                ? `🔒 ម៉ោងជជែកត្រូវបានផ្អាកសម្រាក ១០ នាទី (នៅសល់ ${formatCountdown(sessionState.remainingCooldownSec)})...`
                : isRotanaAdmin
                ? `សរសេរសារឆ្លើយតបទៅកាន់ ${clientUsername || 'User'} ក្នុងនាម Rotana NOB (Live Agent)...`
                : isBotPaused
                ? 'Chatbot ត្រូវបានផ្អាកបណ្ដោះអាសន្ន។ វាយសារនៅទីនេះដើម្បីជជែកផ្ទាល់ជាមួយបង Rotana...'
                : isLoading
                ? 'AI កំពុងឆ្លើយ... អ្នកអាចវាយសំណួរបន្ទាប់ត្រៀមទុក!'
                : selectedImage
                ? 'វាយសំណួរ ឬពាក្យបញ្ជាអំពីរូបភាពនេះ...'
                : 'សួរមកអាម៉ូយ... កុំឱ្យបង Kick ចេញទាន់!'
            }
          />

          {/* Send / Queue button */}
          <button
            onClick={handleSendMessageOrQueue}
            disabled={isGeneratingMeme || (!isCreatorUser && sessionState.isLocked) || (!isCreatorUser && Date.now() < spamLockUntil) || (!inputText.trim() && !selectedImage && !queuedPrompt)}
            className={`w-9 h-9 rounded-xl sm:rounded-2xl flex items-center justify-center transition active:scale-95 shadow-sm shrink-0 cursor-pointer ${
              !isCreatorUser && sessionState.isLocked
                ? 'bg-slate-800 text-amber-400 cursor-not-allowed opacity-80 border border-amber-500/30'
                : !inputText.trim() && !selectedImage && !queuedPrompt
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-40'
                : isRotanaAdmin
                ? 'bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-600 hover:brightness-110 text-white shadow-amber-500/30'
                : isLoading
                ? 'bg-gradient-to-tr from-amber-500 to-cyan-600 text-white shadow-amber-500/25'
                : 'bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/25'
            }`}
            title={
              !isCreatorUser && sessionState.isLocked
                ? 'ម៉ោងសម្រាក Cooldown កំពុងសកម្ម'
                : isRotanaAdmin
                ? `ផ្ញើសារក្នុងនាម Rotana NOB ទៅកាន់ ${clientUsername}`
                : isLoading
                ? 'ចុចដើម្បីដាក់ចូល ToDo ត្រៀមផ្ញើស្វ័យប្រវត្តពេល AI ឆ្លើយចប់'
                : 'ផ្ញើសារ'
            }
          >
            {!isCreatorUser && sessionState.isLocked ? (
              <i className="fas fa-lock text-xs text-amber-400"></i>
            ) : isRotanaAdmin ? (
              <i className="fas fa-paper-plane text-xs"></i>
            ) : isLoading ? (
              <i className="fas fa-clock animate-pulse text-xs"></i>
            ) : (
              <i className="fas fa-paper-plane text-xs"></i>
            )}
          </button>
        </div>
        <p className="text-[10px] sm:text-[10.5px] text-center text-slate-500 dark:text-slate-400 mt-1 font-medium select-none truncate">
          AI អាចមានកំហុសបច្ចេកទេស ឬអាចឆ្លើយតបឌឺដងជេរខ្លាំង សូមអភ័យទោសទុកជាមុន
        </p>
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

      {/* Custom Meme Prompt Modal */}
      <MemePromptModal
        isOpen={showMemeModal}
        onClose={() => setShowMemeModal(false)}
        onSubmit={(customIdea) => {
          setShowMemeModal(false);
          handleExecuteMeme(customIdea);
        }}
        botPersona="រៀមច្បង"
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

      {/* Persona Info Modal: ស្ដេចឌឺ (កូនច្បង) */}
      {showPersonaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl p-5 border shadow-2xl relative bg-slate-900 border-cyan-500/40 text-white animate-scale-up">
            <button
              onClick={() => setShowPersonaModal(false)}
              className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full flex items-center justify-center bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
              title="បិទ"
            >
              <i className="fas fa-times text-xs"></i>
            </button>

            <div className="text-center pt-2 pb-3">
              <div className="relative inline-block mx-auto mb-3">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-600 via-teal-600 to-emerald-500 p-0.5 shadow-xl">
                  <img src="https://api.dicebear.com/7.x/bottts/svg?seed=SETECbot" alt="Persona" className="w-full h-full rounded-full object-cover bg-slate-800" />
                </div>
                <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow text-xs">
                  <i className="fas fa-crown"></i>
                </span>
              </div>
              <h3 className="text-base font-black tracking-tight text-white flex items-center justify-center gap-1.5">
                <span>ស្ដេចឌឺ (កូនច្បង)</span>
              </h3>
              <p className="text-[11px] text-cyan-400 font-bold mt-0.5">
                ស៊ីតិច Roastbot កូនច្បង • រៀមច្បង SETEC សម្ដីកាំបិតចិតបេះដូង
              </p>
            </div>

            <div className="space-y-2.5 text-xs bg-slate-950/60 rounded-2xl p-3.5 border border-slate-800 mb-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">កម្រិតឌឺបច្ចុប្បន្ន:</span>
                <span className="font-black text-rose-400 flex items-center gap-1">
                  <i className="fas fa-bolt text-[10px]"></i>
                  {savageLevel === 'savage' ? 'ឌឺបាក់ក Savage' : savageLevel === 'medium' ? 'ឌឺល្មម' : 'ស្លូត'}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">ចរិតលក្ខណៈ:</span>
                <span className="font-bold text-cyan-300">
                  រៀមច្បងឌឺបាញ់សិស្សប្អូន
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">ប្រព័ន្ធការពារ:</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <i className="fas fa-shield-halved text-[10px]"></i> Anti-Jailbreak Active
                </span>
              </div>
              <p className="text-[11px] text-slate-300 italic pt-1 text-center leading-relaxed">
                សិស្សប្អូនអើយ ចូលមករៀន ឬចូលមកឱ្យបង Troll? សួរមក បងចាំបាញ់!
              </p>
            </div>

            <button
              onClick={() => setShowPersonaModal(false)}
              className="w-full py-2.5 rounded-xl font-black text-xs bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white shadow-lg shadow-cyan-500/25 active:scale-98 transition cursor-pointer"
            >
              បាញ់មកបងច្បង! ខ្ញុំត្រៀមខ្លួនហើយ
            </button>
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
        message={spamInfo.message}
      />

      {/* Error Reporting Modal to Rotana NOB */}
      <ErrorReportModal
        isOpen={errorReportModalOpen}
        onClose={() => setErrorReportModalOpen(false)}
        defaultUsername={username}
        bot="konbong"
        initialIssue={errorReportInitialText}
        sessionId={currentSessionId}
        recentMessages={messages}
        onLiveSessionStarted={({ sessionId }) => {
          setActiveLiveSessionId(sessionId);
          startCountdown180s();
        }}
        isDark={isDark}
      />

      {/* Contribute Lore & AI Training Modal */}
      <ContributeKnowledgeModal
        isOpen={contributeModalOpen}
        onClose={() => setContributeModalOpen(false)}
        defaultBot="Roastbot កូនច្បង"
      />

      {/* Smart Client Cache & Storage Warning Modal */}
      <SmartCacheWarningModal
        isOpen={cacheWarningOpen}
        onClose={() => setCacheWarningOpen(false)}
        onCleared={() => {
          if (audioCacheRef?.current) {
            audioCacheRef.current.clear();
          }
        }}
      />

      {/* Confirm Delete Chat History Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteModalConfig?.isOpen}
        onClose={() => setDeleteModalConfig(null)}
        onConfirm={() => {
          if (deleteModalConfig?.type === 'single') {
            handleDeleteSingleSession(deleteModalConfig.sessionId);
          } else {
            handleDeleteAllHistory();
          }
        }}
        title={deleteModalConfig?.title || 'តើអ្នកពិតជាចង់លុបមែនទេ?'}
        description={deleteModalConfig?.description || 'រាល់សារ និងប្រវត្តិជជែកទាំងអស់នឹងត្រូវលុបចេញជារៀងរហូត!'}
        isDark={isDark}
      />

      {/* 30-Minute Live Chat Session Limit & 10-Minute Cooldown Modal (Unclosable Anti-Bypass) */}
      <SessionBreakModal
        isOpen={!isCreatorUser && sessionState.isLocked}
        remainingSeconds={sessionState.remainingCooldownSec}
        cooldownUntil={sessionState.cooldownUntil}
        botName="កូនច្បង"
        theme={theme}
        onUnlock={() => {
          setSessionState(getLiveSessionState());
        }}
      />

      {/* SETEC Survival Suite Modal ($45 x3 Retake Calculator, Attendance Blacklist, & Soundboard) */}
      <SetecSurvivalModal
        isOpen={isSurvivalModalOpen}
        onClose={() => setIsSurvivalModalOpen(false)}
        onSendToChat={(text) => handleChat(text)}
        botPersona="កូនច្បង"
        theme={theme}
      />

      {/* Shareable Troll Quote Card Modal (PNG Download) */}
      <TrollQuoteModal
        isOpen={!!quoteModalData}
        onClose={() => setQuoteModalData(null)}
        quoteText={quoteModalData?.text || ''}
        botPersona="កូនច្បង"
        botAvatar="https://api.dicebear.com/7.x/bottts/svg?seed=SETECbot"
        logoUrl="/img/icon.jpg"
        theme={theme}
      />

      {/* Interactive Falling Emoji Shower when Bot Audio Finishes */}
      {emojiShowerList.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {emojiShowerList.map((item) => (
            <span
              key={item.id}
              className="absolute top-0 animate-emoji-fall select-none drop-shadow-md"
              style={{
                left: `${item.left}%`,
                fontSize: `${item.size}px`,
                animationDuration: `${item.duration}s`,
                animationDelay: `${item.delay}s`,
                transform: `rotate(${item.rotation}deg)`
              }}
            >
              {item.emoji}
            </span>
          ))}
        </div>
      )}
      {/* Real-time Bot Pause Popup Modal (Triggered instantly when Rotana NOB pauses bot in Admin) */}
      {botPauseState.isPaused && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in font-['Kantumruy_Pro',sans-serif]">
          <div className="w-full max-w-md rounded-3xl p-6 shadow-2xl border border-amber-500/40 bg-slate-900 text-white relative overflow-hidden text-center animate-scale-up">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-3xl border border-amber-500/30 animate-pulse">
              <i className="fas fa-pause"></i>
            </div>
            <h3 className="text-lg font-black mb-1.5 text-amber-300">
              ការជូនដំណឹងពីអ្នកគ្រប់គ្រងវេបសាយ
            </h3>
            <p className="text-[11px] text-amber-200/80 mb-3 font-bold uppercase tracking-wider">
              បងកូនច្បងត្រូវបានផ្អាកបណ្ដោះអាសន្ន
            </p>
            <div className="text-xs sm:text-sm text-slate-200 leading-relaxed mb-6 font-semibold whitespace-pre-line p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-left">
              {botPauseState.notice}
            </div>
            <div className="flex flex-col gap-2.5">
              <Link
                href="/KonPov"
                className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white rounded-xl text-xs font-bold transition shadow-md active:scale-95 flex items-center justify-center gap-1.5"
              >
                <i className="fa-solid fa-arrow-right-arrow-left text-xs"></i>
                <span>ទៅលេងជាមួយចែកូនពៅ KonPov វិញ</span>
              </Link>
              <Link
                href="/"
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition border border-slate-700 flex items-center justify-center gap-1.5"
              >
                <span>ត្រឡប់ទៅទំព័រដើម</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
