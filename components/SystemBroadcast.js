'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { getApiEndpoint } from '../app/utils/apiConfig';
import { DEFAULT_SYSTEM_STATE } from '../lib/systemControl';

const FIREBASE_DB_URL = 'https://troll-setec-chatbot-default-rtdb.asia-southeast1.firebasedatabase.app';

// Helper: Smart readable explanation for casual Latin admin messages so visitors understand instantly
function getReasonExplanation(text) {
  if (!text) return null;
  const s = text.toLowerCase();
  if (
    s.includes('bit mlat') ||
    s.includes('answer user lop') ||
    s.includes('lop pek') ||
    s.includes('ort dea ban develop') ||
    s.includes('develop tor')
  ) {
    return 'បិទសម្រួលប្រព័ន្ធឆ្លើយតបបណ្ដោះអាសន្ន ដើម្បីជួសជុល និងអភិវឌ្ឍមុខងារឱ្យកាន់តែឆ្លាតវៃ និងត្រឹមត្រូវជាងមុន';
  }
  if (s.includes('sleep') || s.includes('kaeng') || s.includes('som kaeng')) {
    return 'ម៉ោងសម្រាកពេលយប់ ដើម្បីសន្សំកូតា API សម្រាប់ដំណើរការរលូននៅពេលថ្ងៃ';
  }
  if (s.includes('jailbreak') || s.includes('security') || s.includes('firewall') || s.includes('patch')) {
    return 'កំពុងដំឡើងកញ្ចប់សុវត្ថិភាព និងច្បាប់ការពារប្រព័ន្ធថ្មី';
  }
  return null;
}

// Natural Gentle Web Audio Bell for Real-Time Administrator Notification
function playBroadcastChime() {
  try {
    if (typeof window === 'undefined') return;
    if (typeof navigator !== 'undefined' && navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(523.25, now); // Gentle C5 tone
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  } catch {}
}

export default function SystemBroadcast() {
  const pathname = usePathname();
  const [systemState, setSystemState] = useState(DEFAULT_SYSTEM_STATE);
  const [showPopup, setShowPopup] = useState(false);
  const [dismissedNotice, setDismissedNotice] = useState('');
  const [hideTopBanner, setHideTopBanner] = useState(false);
  const [isBypassed, setIsBypassed] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [cambodiaClock, setCambodiaClock] = useState('');
  const eventSourceRef = useRef(null);
  const lastStatusFetchRef = useRef(0);
  const isFetchingStatusRef = useRef(false);

  // Exclude Admin Control Panel from ever seeing maintenance locks or student popups
  const isAdminRoute = pathname?.includes('jam-tic-kapea-1-sin');

  // Unified Creator Rotana Bypass Prompt
  const handlePromptBypass = useCallback(() => {
    if (typeof window === 'undefined') return;
    const code = window.prompt('Bypass Code / Creator Key:');
    if (code) {
      const trimmed = code.trim().toLowerCase();
      if (
        trimmed === 'rotana' ||
        trimmed === 'rotana2026' ||
        trimmed === 'nob' ||
        trimmed === 'rotanabypass' ||
        trimmed === 'bypass2026' ||
        trimmed.includes('rotana')
      ) {
        sessionStorage.setItem('rotana_maintenance_bypass', 'rotana2026');
        localStorage.setItem('rotana_maintenance_bypass', 'rotana2026');
        sessionStorage.setItem('rotana_admin_passcode', 'rotana2026');
        setIsBypassed(true);
        alert('Bypass ជោគជ័យ! Mode Test ត្រូវបានបើកដំណើរការ។');
      } else {
        alert('លេខកូដមិនត្រឹមត្រូវ!');
      }
    }
  }, []);

  // Live ticking Phnom Penh clock (HH:mm:ss UTC+7)
  useEffect(() => {
    const updateTime = () => {
      try {
        const timeStr = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Phnom_Penh',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hourCycle: 'h23'
        }).format(new Date());
        setCambodiaClock(timeStr);
      } catch {
        const d = new Date();
        const h = String((d.getUTCHours() + 7) % 24).padStart(2, '0');
        const m = String(d.getUTCMinutes()).padStart(2, '0');
        const s = String(d.getUTCSeconds()).padStart(2, '0');
        setCambodiaClock(`${h}:${m}:${s}`);
      }
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Check if Creator Rotana session is already active from admin login or secret bypass
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Direct Secret URL Param / Hash Bypass (e.g. ?bypass=rotana, ?bypass=2026, ?rotana=1, #rotana)
    try {
      const url = new URL(window.location.href);
      const bypassParam = (url.searchParams.get('bypass') || url.searchParams.get('rotana') || url.searchParams.get('code') || '').toLowerCase().trim();
      const hash = url.hash.toLowerCase().trim();
      if (
        bypassParam === 'rotana' ||
        bypassParam === 'rotana2026' ||
        bypassParam === 'nob' ||
        bypassParam === '1' ||
        bypassParam === 'true' ||
        hash === '#bypass' ||
        hash === '#rotana'
      ) {
        sessionStorage.setItem('rotana_maintenance_bypass', 'rotana2026');
        localStorage.setItem('rotana_maintenance_bypass', 'rotana2026');
        sessionStorage.setItem('rotana_admin_passcode', 'rotana2026');
        setIsBypassed(true);

        // Quietly remove bypass params from address bar so no onlooker notices
        url.searchParams.delete('bypass');
        url.searchParams.delete('rotana');
        url.searchParams.delete('code');
        const cleanPath = url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : '');
        window.history.replaceState({}, document.title, cleanPath);
      }
    } catch {}

    // 2. Check saved session bypass or admin passcode
    const savedBypass = sessionStorage.getItem('rotana_maintenance_bypass') || localStorage.getItem('rotana_maintenance_bypass');
    const savedAdminPass = sessionStorage.getItem('rotana_admin_passcode');
    const savedUser = localStorage.getItem('chatbot_username') || '';
    if (savedBypass || savedAdminPass || savedUser.toLowerCase().includes('rotana')) {
      setIsBypassed(true);
    }

    // Initialize dismissed notice from sessionStorage
    const savedDismissed = sessionStorage.getItem('rotana_dismissed_broadcast') || '';
    if (savedDismissed) {
      setDismissedNotice(savedDismissed);
    }
  }, []);

  // Secret Hotkey Listener (Ctrl+Shift+B, Alt+B, Cmd+Shift+B)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleKeyDown = (e) => {
      if (
        (e.ctrlKey && e.shiftKey && (e.key === 'B' || e.key === 'b')) ||
        (e.metaKey && e.shiftKey && (e.key === 'B' || e.key === 'b')) ||
        (e.altKey && (e.key === 'b' || e.key === 'B'))
      ) {
        e.preventDefault();
        handlePromptBypass();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePromptBypass]);

  // Secret Multi-Tap Trigger for Mobile Safari (Tap mascot / placard 5 times in 3 seconds)
  const tapCountRef = useRef(0);
  const lastTapRef = useRef(0);
  const handleSecretTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current > 3000) {
      tapCountRef.current = 1;
    } else {
      tapCountRef.current += 1;
      if (tapCountRef.current >= 5) {
        tapCountRef.current = 0;
        handlePromptBypass();
        return;
      }
    }
    lastTapRef.current = now;
  };

  // Update State safely from SSE Event
  const handleSsePayload = useCallback((rawData) => {
    try {
      const payload = JSON.parse(rawData);
      if (!payload) return;

      if (payload.path === '/' && payload.data && typeof payload.data === 'object') {
        setSystemState((prev) => ({ ...(prev || {}), ...payload.data }));
      } else if (payload.path && payload.path.startsWith('/')) {
        const key = payload.path.slice(1).split('/')[0];
        if (key) {
          setSystemState((prev) => ({ ...(prev || {}), [key]: payload.data }));
        }
      } else if (payload.data && typeof payload.data === 'object') {
        setSystemState((prev) => ({ ...(prev || {}), ...payload.data }));
      }
    } catch {}
  }, []);

  // Subscribe to Firebase RTDB and fetch initial status with clean 3.5s - 4s interval (Zero Spam)
  useEffect(() => {
    if (isAdminRoute || typeof window === 'undefined') return;

    // 1. Fetch status via API with strict anti-spam throttle (min 3.5 seconds)
    const fetchStatus = async () => {
      const now = Date.now();
      if (isFetchingStatusRef.current || now - lastStatusFetchRef.current < 3500) {
        return;
      }
      isFetchingStatusRef.current = true;
      lastStatusFetchRef.current = now;

      try {
        const endpoint = getApiEndpoint('/api/system-status');
        const res = await fetch(endpoint, {
          headers: { Accept: 'application/json' },
          cache: 'no-store'
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.state) {
            setSystemState(data.state);
          }
        }
      } catch {} finally {
        isFetchingStatusRef.current = false;
      }
    };

    fetchStatus();

    // 2. Real-time Firebase RTDB SSE subscription
    try {
      const sseUrl = `${FIREBASE_DB_URL}/system_control.json`;
      const es = new EventSource(sseUrl);
      eventSourceRef.current = es;

      es.addEventListener('put', (e) => handleSsePayload(e.data));
      es.addEventListener('patch', (e) => handleSsePayload(e.data));
    } catch {}

    // Clean controlled polling every 3.5 to 4 seconds (Zero spam)
    const pollTimer = setInterval(fetchStatus, 3500);

    const handleSystemRestEvent = () => {
      fetchStatus();
    };
    window.addEventListener('rotana_system_rest', handleSystemRestEvent);

    return () => {
      clearInterval(pollTimer);
      window.removeEventListener('rotana_system_rest', handleSystemRestEvent);
      if (eventSourceRef.current) {
        try {
          eventSourceRef.current.close();
        } catch {}
        eventSourceRef.current = null;
      }
    };
  }, [isAdminRoute, handleSsePayload]);

  // Real-time Trigger for Alert Popup Modal
  const activeNotice = systemState?.broadcastNotice ? String(systemState.broadcastNotice).trim() : '';

  useEffect(() => {
    if (!activeNotice) {
      setShowPopup(false);
      return;
    }

    if (typeof window !== 'undefined') {
      const savedDismissed = sessionStorage.getItem('rotana_dismissed_broadcast') || '';
      if (activeNotice !== savedDismissed) {
        setShowPopup(true);
        setHideTopBanner(false);
        playBroadcastChime();
      }
    }
  }, [activeNotice]);

  // Handle Dismissing the Popup Modal
  const handleDismissPopup = () => {
    setShowPopup(false);
    if (activeNotice && typeof window !== 'undefined') {
      sessionStorage.setItem('rotana_dismissed_broadcast', activeNotice);
      setDismissedNotice(activeNotice);
    }
  };

  if (isAdminRoute || !systemState) {
    return null;
  }

  // Calculate Phnom Penh hour (UTC+7)
  let cambodiaHour = 0;
  try {
    const hourStr = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Phnom_Penh',
      hour: 'numeric',
      hourCycle: 'h23'
    }).format(new Date());
    cambodiaHour = parseInt(hourStr, 10);
  } catch {
    cambodiaHour = (new Date().getUTCHours() + 7) % 24;
  }

  const nightStartH = systemState.nightStartHour ?? 2;
  const nightEndH = systemState.nightEndHour ?? 6;
  const isNight =
    systemState.nightScheduleEnabled &&
    (nightStartH > nightEndH
      ? cambodiaHour >= nightStartH || cambodiaHour < nightEndH
      : cambodiaHour >= nightStartH && cambodiaHour < nightEndH);

  const isMaintenance = !systemState.serverOnline || systemState.maintenanceMode;
  const isNightOnly = !isMaintenance && isNight;
  const isResting = isMaintenance || isNight;

  // Individual Bot Pause Status & Real-time Alert
  const isKonBongPage = pathname ? pathname.toLowerCase().includes('konbong') : false;
  const isKonPovPage = pathname ? pathname.toLowerCase().includes('konpov') : false;

  const isCurrentBotDisabled =
    (isKonBongPage && systemState.konbongActive === false) ||
    (isKonPovPage && systemState.konpovActive === false);

  const disabledBotName = isKonBongPage ? 'បងកូនច្បង (KonBong)' : 'ចែកូនពៅ (KonPov)';
  const alternateBotName = isKonBongPage ? 'ចែកូនពៅ (KonPov)' : 'បងកូនច្បង (KonBong)';
  const alternateBotPath = isKonBongPage ? '/KonPov' : '/KonBong';
  const disabledNotice = isKonBongPage
    ? (systemState.konbongNotice || 'បងកូនច្បង KonBong កំពុងសម្រាកបណ្ដោះអាសន្នតាមការកំណត់របស់អ្នកគ្រប់គ្រង។ សូមអញ្ជើញទៅជជែកជាមួយចែកូនពៅជំនួសវិញ!')
    : (systemState.konpovNotice || 'ចែកូនពៅ KonPov កំពុងសម្រាកបណ្ដោះអាសន្នតាមការកំណត់របស់អ្នកគ្រប់គ្រង។ សូមអញ្ជើញទៅជជែកជាមួយបងកូនច្បងជំនួសវិញ!');

  const [dismissedBotPause, setDismissedBotPause] = useState(false);

  useEffect(() => {
    setDismissedBotPause(false);
  }, [systemState.konbongActive, systemState.konpovActive, disabledNotice]);

  const prevBotDisabledRef = useRef(false);
  useEffect(() => {
    if (isCurrentBotDisabled && !prevBotDisabledRef.current && !isBypassed) {
      playBroadcastChime();
    }
    prevBotDisabledRef.current = isCurrentBotDisabled;
  }, [isCurrentBotDisabled, isBypassed]);

  // Pause audio when system is resting/under maintenance
  useEffect(() => {
    if (isResting && typeof document !== 'undefined') {
      try {
        const audios = document.querySelectorAll('audio');
        audios.forEach((a) => a.pause());
      } catch {}
    }
  }, [isResting]);

  return (
    <>
      {/* ========================================================= */}
      {/* 1. REAL-TIME ADMIN ALERT POPUP MODAL (LIGHT / NON-AI)    */}
      {/* Pops up on screen when Admin sends a live notice         */}
      {/* ========================================================= */}
      {!isResting && showPopup && activeNotice && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[99999] bg-black/40 flex items-center justify-center p-4 selection:bg-slate-300 selection:text-slate-900"
          onClick={handleDismissPopup}
        >
          <div
            className="w-full max-w-lg bg-white border border-slate-300 rounded-xl p-6 sm:p-7 shadow-xl relative text-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-3 mb-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700 shrink-0">
                  <i className="fa-solid fa-bullhorn text-sm" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight font-['Kantumruy_Pro',sans-serif]">
                    សេចក្ដីជូនដំណឹងពីអ្នកគ្រប់គ្រង
                  </h2>
                  <p className="text-xs text-slate-500 font-sans">
                    សេចក្ដីជូនដំណឹងផ្លូវការ
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDismissPopup}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                title="បិទ"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            {/* Message Body */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 sm:p-5 mb-5 text-left">
              <p className="text-sm sm:text-base font-sans text-slate-800 leading-relaxed whitespace-pre-wrap break-words select-text">
                {activeNotice}
              </p>
            </div>

            {/* Footer / Actions */}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleDismissPopup}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-black text-white text-xs sm:text-sm font-medium transition-colors cursor-pointer shadow-sm"
              >
                យល់ព្រម និងបិទសារ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1.5 REAL-TIME BOT PAUSED POPUP MODAL (KonBong or KonPov)   */}
      {/* Appears when visitor is on a bot's page while it's paused */}
      {/* ========================================================= */}
      {!isResting && isCurrentBotDisabled && !isBypassed && !dismissedBotPause && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[99998] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 selection:bg-slate-300 selection:text-slate-900 animate-in fade-in duration-200"
          onClick={() => setDismissedBotPause(true)}
        >
          <div
            className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-2xl relative text-slate-900 text-center flex flex-col items-center font-['Kantumruy_Pro',sans-serif]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Close Button to view old chat history */}
            <button
              type="button"
              onClick={() => setDismissedBotPause(true)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="បិទផ្ទាំង"
            >
              <i className="fa-solid fa-xmark text-sm" />
            </button>

            {/* Mascot / Icon Badge */}
            <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shadow-xs mb-3.5 relative">
              <i className={`fa-solid ${isKonBongPage ? 'fa-user-tie text-indigo-600' : 'fa-robot text-pink-600'} text-2xl`} />
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white text-[10px] shadow-xs">
                <i className="fa-solid fa-pause" />
              </span>
            </div>

            {/* Pill status */}
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-800 uppercase tracking-widest bg-amber-50 border border-amber-200 px-3.5 py-1 rounded-full shadow-2xs font-sans mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>ផ្អាកដំណើរការបណ្ដោះអាសន្ន • BOT PAUSED</span>
            </span>

            {/* Headline */}
            <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-1 leading-snug">
              {disabledBotName} កំពុងសម្រាក
            </h2>
            <p className="text-xs text-slate-500 font-sans mb-4">
              អ្នកគ្រប់គ្រងប្រព័ន្ធបានផ្អាកដំណើរការ {disabledBotName} មួយរយៈ
            </p>

            {/* Admin Custom Message Box */}
            <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-4 mb-4 text-left">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 pb-1.5 mb-1.5 border-b border-slate-200/80">
                <i className="fa-solid fa-bullhorn text-indigo-500 text-xs" />
                <span>សារជូនដំណឹងពីអ្នកកាន់ប្រព័ន្ធ៖</span>
              </div>
              <p className="text-xs sm:text-sm font-sans text-slate-800 font-medium leading-relaxed whitespace-pre-wrap break-words">
                {disabledNotice}
              </p>
            </div>

            {/* Navigation Switch Buttons */}
            <div className="w-full flex flex-col sm:flex-row items-center gap-2.5 mb-2.5">
              <Link
                href={alternateBotPath}
                className={`w-full py-2.5 px-4 rounded-xl text-white text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-sm ${
                  isKonBongPage
                    ? 'bg-pink-600 hover:bg-pink-700 shadow-pink-600/20'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                }`}
              >
                <i className="fa-solid fa-arrow-right-arrow-left text-xs" />
                <span>ទៅជជែកជាមួយ {alternateBotName}</span>
              </Link>
              <Link
                href="/"
                className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <i className="fa-solid fa-house text-xs" />
                <span>ទំព័រដើម</span>
              </Link>
            </div>

            {/* Read Old Chat link */}
            <button
              type="button"
              onClick={() => setDismissedBotPause(true)}
              className="text-xs text-slate-400 hover:text-slate-600 underline cursor-pointer transition-colors"
            >
              អានប្រវត្តិសារចាស់ (View Past Chat)
            </button>
          </div>
        </div>
      )}

      {/* Floating Top Banner when modal is dismissed */}
      {!isResting && isCurrentBotDisabled && !isBypassed && dismissedBotPause && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[99990] bg-slate-900/90 border border-amber-500/40 text-amber-300 px-4 py-2 rounded-full shadow-xl text-xs font-medium flex items-center gap-2.5 backdrop-blur-md font-['Kantumruy_Pro',sans-serif] animate-in fade-in">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>{disabledBotName} កំពុងសម្រាក</span>
          <button
            type="button"
            onClick={() => setDismissedBotPause(false)}
            className="underline text-[11px] text-white hover:text-amber-200 cursor-pointer ml-1 font-semibold"
          >
            មើលសារជូនដំណឹង
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. SYSTEM MAINTENANCE / RESTING OVERLAY (LIGHT / GRAY MODE) */}
      {/* Clean, Human-made, Gen Z Vibe, No AI Brackets, No Dark Mode */}
      {/* ========================================================= */}
      {isResting && !isBypassed && (() => {
        const displayReason = isNightOnly
          ? (systemState.nightRestMessage || 'ពេលយប់ជ្រៅហើយ! ប្រព័ន្ធ AI សុំសម្រាកគេងសិន ដើម្បីសន្សំកូតា និងកម្លាំងសម្រាប់ថ្ងៃស្អែក! សូមចូលមកលេងនៅម៉ោង 06:00 ព្រឹកឡើងវិញ!')
          : (systemState.maintenanceReason || activeNotice || 'កំពុងកែលម្អ និង Update ប្រព័ន្ធឆ្លើយតបបណ្ដោះអាសន្ន');
        const reasonExplanation = !isNightOnly ? getReasonExplanation(displayReason) : null;

        return (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[999999] w-screen h-screen min-h-screen bg-slate-900/35 backdrop-blur-xs text-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto select-none"
          >
            {/* Central Unified Light / Gray Card */}
            <div className="w-full max-w-md sm:max-w-lg relative z-10 flex flex-col items-center text-center my-auto py-4 sm:py-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-full rounded-3xl bg-white border border-slate-200/90 shadow-xl p-6 sm:p-8 flex flex-col items-center text-center relative overflow-hidden font-['Kantumruy_Pro',sans-serif]">
                {/* Mascot Avatar with Secret 5-Tap Bypass for Mobile Safari */}
                <div
                  className="relative mb-3.5 cursor-pointer select-none active:scale-95 transition-transform"
                  onClick={handleSecretTap}
                  title="សេចក្ដីជូនដំណឹងពីប្រព័ន្ធ"
                >
                  <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center shadow-xs">
                    {isNightOnly ? (
                      /* SLEEP MODE MASCOT */
                      <svg
                        width="72"
                        height="58"
                        viewBox="0 0 115 85"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="overflow-visible"
                      >
                        <path d="M82 16 H90 L84 23 H92" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M94 7 H99 L95 11 H100" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <rect x="20" y="44" width="75" height="30" rx="12" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="1.5" />
                        <circle cx="57" cy="38" r="23" fill="#FED7AA" />
                        <path d="M36 34 C36 18 50 12 62 12 C74 12 80 20 80 34 Z" fill="#64748B" />
                        <path d="M76 20 C88 20 92 28 90 35" stroke="#64748B" strokeWidth="6" strokeLinecap="round" fill="none" />
                        <circle cx="90" cy="37" r="5" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1" />
                        <path d="M46 41 C48 43.5 51 43.5 53 41" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                        <path d="M61 41 C63 43.5 66 43.5 68 41" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                        <circle cx="43" cy="45" r="3.5" fill="#F87171" opacity="0.45" />
                        <circle cx="71" cy="45" r="3.5" fill="#F87171" opacity="0.45" />
                        <path d="M55 46 C57 48 59 48 61 46" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                        <path d="M28 62 C28 53 40 50 57 50 C74 50 86 53 86 62 Z" fill="#475569" />
                        <ellipse cx="44" cy="56" rx="5.5" ry="4" fill="#FED7AA" stroke="#CBD5E1" strokeWidth="1" />
                        <ellipse cx="70" cy="56" rx="5.5" ry="4" fill="#FED7AA" stroke="#CBD5E1" strokeWidth="1" />
                      </svg>
                    ) : (
                      /* MAINTENANCE MASCOT */
                      <svg
                        width="72"
                        height="58"
                        viewBox="0 0 110 85"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="overflow-visible"
                      >
                        <path d="M30 50 C18 36 22 14 55 14 C88 14 92 36 80 50 Z" fill="#334155" />
                        <circle cx="55" cy="42" r="25" fill="#FED7AA" />
                        <circle cx="30" cy="43" r="5" fill="#FED7AA" />
                        <circle cx="80" cy="43" r="5" fill="#FED7AA" />
                        <path d="M32 35 C38 22 48 18 55 22 C62 18 72 22 78 35 C74 29 63 27 55 29 C47 27 36 29 32 35 Z" fill="#1E293B" />
                        <path d="M44 41 C46 38 49 38 51 41" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />
                        <path d="M59 41 C61 38 64 38 66 41" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />
                        <circle cx="41" cy="46" r="3.5" fill="#F87171" opacity="0.45" />
                        <circle cx="69" cy="46" r="3.5" fill="#F87171" opacity="0.45" />
                        <path d="M50 47 C53 49 57 49 60 47" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" fill="none" />
                        <path d="M72 32 C72 30 75 27 75 27 C75 27 78 30 78 32 C78 34 76.5 35.5 75 35.5 C73.5 35.5 72 34 72 32 Z" fill="#60A5FA" />
                        <path d="M35 72 C35 63 44 60 55 60 C66 60 75 63 75 72 Z" fill="#64748B" />
                        <ellipse cx="36" cy="74" rx="7" ry="5" fill="#FED7AA" stroke="#CBD5E1" strokeWidth="1.5" />
                        <ellipse cx="74" cy="74" rx="7" ry="5" fill="#FED7AA" stroke="#CBD5E1" strokeWidth="1.5" />
                      </svg>
                    )}
                  </div>

                  {/* Top-Right Badge */}
                  <span
                    className={`absolute -top-1.5 -right-1.5 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-xl ${
                      isNightOnly
                        ? 'bg-indigo-100 border border-indigo-300 text-indigo-700'
                        : 'bg-slate-200 border border-slate-300 text-slate-800'
                    } text-xs shadow-xs`}
                  >
                    <i className={`fa-solid ${isNightOnly ? 'fa-moon' : 'fa-screwdriver-wrench'} text-[10px] sm:text-xs`} />
                  </span>
                </div>

                {/* Status Pill Badge (Gray Mode / Gen Z Minimal) */}
                <div className="mb-2.5">
                  {isNightOnly ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-800 uppercase tracking-widest bg-indigo-50 border border-indigo-200 px-3.5 py-1 rounded-full shadow-2xs font-sans">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                      <span>ម៉ោងគេងសម្រាក • SLEEP MODE</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-800 uppercase tracking-widest bg-slate-100 border border-slate-300 px-3.5 py-1 rounded-full shadow-2xs font-sans">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      <span>ការថែទាំប្រព័ន្ធ • SYSTEM MAINTENANCE</span>
                    </span>
                  )}
                </div>

                {/* Primary Headline (STRICTLY NO AI BRACKETS « ») */}
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug mb-1 tracking-tight font-['Kantumruy_Pro',sans-serif]">
                  {isNightOnly ? 'ពេលយប់ជ្រៅហើយ AI សុំគេងសាកថ្មបន្តិចណា៎' : 'សូមអភ័យទោស! ប្រព័ន្ធកំពុងកែលម្អមុខងារថ្មី'}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 font-sans leading-relaxed mb-4">
                  {isNightOnly
                    ? `ប្រព័ន្ធសម្រាកចន្លោះពីម៉ោង ${String(nightStartH).padStart(2, '0')}:00 ដល់ ${String(nightEndH).padStart(2, '0')}:00 ព្រឹក (មិនមែនបិទប្រព័ន្ធទេ)`
                    : 'អ្នកអភិវឌ្ឍន៍កំពុង Update ប្រព័ន្ធឱ្យឆ្លើយតបកាន់តែរលូន និងឆ្លាតវៃ'}
                </p>

                {/* Notice & Reason Card (Clean Typography & Legible) */}
                <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 text-left mb-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 font-['Kantumruy_Pro',sans-serif]">
                      <i className={`fa-solid ${isNightOnly ? 'fa-moon text-indigo-500' : 'fa-bullhorn text-slate-600'} text-xs`} />
                      <span>{isNightOnly ? 'មូលហេតុនៃការសម្រាក' : 'សេចក្ដីជូនដំណឹងពីអ្នកកាន់ប្រព័ន្ធ'}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Live Notice
                    </span>
                  </div>

                  {/* Highlighted Message Box */}
                  <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs">
                    <p className="text-xs sm:text-sm font-sans text-slate-900 font-medium leading-relaxed whitespace-pre-wrap break-words">
                      {displayReason}
                    </p>
                    {reasonExplanation && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-600 font-sans flex items-start gap-1.5">
                        <span className="font-bold text-slate-800 shrink-0">អានយល់៖</span>
                        <span className="leading-relaxed">{reasonExplanation}</span>
                      </div>
                    )}
                  </div>

                  {/* Reassuring Friendly Community Note (NO EMOJIS, GEN Z VIBE) */}
                  <div className="text-xs text-slate-600 font-sans leading-relaxed pt-0.5">
                    <strong className="text-slate-800 font-semibold">កុំទាន់ស្លន់!</strong>{' '}
                    {isNightOnly
                      ? `យប់ជ្រៅហើយ គេងសិនទៅបងៗ កុំនៅយឺតពេក! ប្រព័ន្ធនឹងភ្ញាក់មកដំណើរការធម្មតាវិញនៅម៉ោង ${String(nightEndH).padStart(2, '0')}:00 ព្រឹក។`
                      : 'គណនី និងទិន្នន័យរបស់អ្នកមានសុវត្ថិភាព ១០០%។ អ្នកកាន់ប្រព័ន្ធកំពុងរៀបចំសម្រួលប្រព័ន្ធឱ្យរលូនឡើងវិញ តិចទៀតរួចរាល់ហើយ អង្គុយ Chill សិនណា៎!'}
                  </div>
                </div>

                {/* Real-time Status & Live Phnom Penh Clock Bar */}
                <div className="w-full flex items-center justify-between text-xs font-sans px-1 py-1 mb-3 text-slate-600">
                  <span className="flex items-center gap-1.5 font-medium text-emerald-700">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                    </span>
                    <span>Auto-Sync Real-time</span>
                  </span>
                  <span className="text-slate-500 font-mono text-[11px] sm:text-xs">
                    ម៉ោងនៅភ្នំពេញ: <strong className="text-slate-800">{cambodiaClock || `${String(cambodiaHour).padStart(2, '0')}:00`}</strong> (UTC+7)
                  </span>
                </div>

                {/* Auto-reconnect Notification Chip */}
                <div className="w-full p-3 rounded-xl bg-slate-100 border border-slate-200 text-center mb-4">
                  <p className="text-xs text-slate-700 font-sans font-medium leading-relaxed">
                    {isNightOnly
                      ? `ប្រព័ន្ធនឹងភ្ញាក់ដំណើរការធម្មតាវិញស្វ័យប្រវត្តិតែម្ដង នៅម៉ោង ${String(nightEndH).padStart(2, '0')}:00 ព្រឹក (ពុំបាច់ចុច Refresh ទេ)`
                      : 'ទំព័រនឹងបើកដំណើរការឡើងវិញស្វ័យប្រវត្តិតែម្ដង នៅពេល Server ដំណើរការធម្មតា (ពុំបាច់ចុច Refresh ទេ)'}
                  </p>
                </div>

                {/* Action Buttons: Only Home Link, NO Refresh, NO Passcode Button */}
                <div className="flex items-center justify-center w-full">
                  <Link
                    href="/"
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs sm:text-sm font-semibold transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    <i className="fa-solid fa-house text-xs text-slate-300" />
                    <span>ត្រឡប់ទៅទំព័រដើម</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================= */}
      {/* 3. PERSISTENT TOP ANNOUNCEMENT BANNER (LIGHT / NON-AI)    */}
      {/* ========================================================= */}
      {!isResting && activeNotice && !hideTopBanner && (
        <div className="bg-slate-100 text-slate-800 border-b border-slate-300 px-4 py-2 text-xs relative z-40 shadow-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="font-bold text-slate-900 shrink-0 px-2 py-0.5 rounded bg-slate-200 border border-slate-300 text-[11px]">
                ដំណឹង
              </span>
              <span className="truncate max-w-md md:max-w-2xl text-slate-700 font-sans font-medium">
                {activeNotice}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowPopup(true)}
                className="px-2.5 py-1 rounded bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-[11px] font-medium transition-colors cursor-pointer"
                title="ចុចមើលសារពេញលេញជាផ្ទាំង Popup"
              >
                មើលសារពេញលេញ
              </button>

              <button
                type="button"
                onClick={() => setHideTopBanner(true)}
                className="text-slate-400 hover:text-slate-700 p-1 transition-colors cursor-pointer"
                title="បិទរបារនេះ"
              >
                <i className="fa-solid fa-xmark text-xs" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Covert Bypass Mode Status Dot (Creator Rotana Only) */}
      {isBypassed && (
        <button
          type="button"
          onClick={() => {
            if (confirm('តើអ្នកចង់ចាកចេញពី Bypass Mode វិញមែនទេ?')) {
              sessionStorage.removeItem('rotana_maintenance_bypass');
              localStorage.removeItem('rotana_maintenance_bypass');
              setIsBypassed(false);
            }
          }}
          aria-label="Bypass Mode Status"
          className="fixed bottom-1 left-1 z-[99999] w-2 h-2 rounded-full bg-emerald-500/50 hover:bg-emerald-500 opacity-20 hover:opacity-100 transition-opacity cursor-pointer"
          title="Bypass Mode Active"
        />
      )}
    </>
  );
}
