'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { getApiEndpoint } from '../app/utils/apiConfig';
import { DEFAULT_SYSTEM_STATE } from '../lib/systemControl';

const FIREBASE_DB_URL = 'https://troll-setec-chatbot-default-rtdb.asia-southeast1.firebasedatabase.app';

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
  const eventSourceRef = useRef(null);

  // Exclude Admin Control Panel from ever seeing maintenance locks or student popups
  const isAdminRoute = pathname?.includes('jam-tic-kapea-1-sin');

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
        const code = window.prompt('Bypass Code:');
        if (code) {
          const trimmed = code.trim().toLowerCase();
          if (
            trimmed === 'rotana' ||
            trimmed === 'rotana2026' ||
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
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
        const code = window.prompt('Bypass Code:');
        if (code) {
          const trimmed = code.trim().toLowerCase();
          if (
            trimmed === 'rotana' ||
            trimmed === 'rotana2026' ||
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

  // Subscribe to Firebase RTDB and fetch initial status
  useEffect(() => {
    if (isAdminRoute || typeof window === 'undefined') return;

    // 1. Fetch initial status via API
    const fetchStatus = async () => {
      try {
        const endpoint = getApiEndpoint('/api/system-status');
        const res = await fetch(endpoint, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data?.state) {
            setSystemState(data.state);
          }
        }
      } catch {}
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

    const pollTimer = setInterval(fetchStatus, 5000);

    return () => {
      clearInterval(pollTimer);
      if (eventSourceRef.current) {
        try { eventSourceRef.current.close(); } catch {}
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
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    សេចក្ដីជូនដំណឹងពីអ្នកគ្រប់គ្រង
                  </h2>
                  <p className="text-xs text-slate-500 font-sans">
                    ផ្ញើដោយ Rotana NOB
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
      {/* 2. SYSTEM MAINTENANCE / RESTING OVERLAY (GRAY MODE / HUMAN) */}
      {/* Only shown when system is actually in Maintenance/Rest   */}
      {/* ========================================================= */}
      {isResting && !isBypassed && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[99999] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 selection:bg-slate-300 selection:text-slate-900 overflow-y-auto"
        >
          <div className="w-full max-w-md bg-white border border-slate-300 rounded-2xl p-6 sm:p-7 shadow-xl relative text-slate-800 text-left my-auto">
            {/* Mascot Section (Different for Sleep Mode vs Maintenance Mode) */}
            <div
              className="flex flex-col items-center text-center mb-4 cursor-pointer select-none active:scale-95 transition-transform"
              onClick={handleSecretTap}
              title="សេចក្ដីជូនដំណឹងពីប្រព័ន្ធ"
            >
              {isNightOnly ? (
                /* 1. SLEEP MODE MASCOT (Cute Sleeping Chibi with Pillow & Nightcap) */
                <>
                  <svg
                    width="115"
                    height="85"
                    viewBox="0 0 115 85"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="overflow-visible"
                  >
                    {/* Floating Zzz */}
                    <path d="M82 16 H90 L84 23 H92" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M94 7 H99 L95 11 H100" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    {/* Soft Pillow */}
                    <rect x="20" y="44" width="75" height="30" rx="12" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="1.5" />
                    {/* Head */}
                    <circle cx="57" cy="38" r="23" fill="#FED7AA" />
                    {/* Nightcap / Sleeping Hat */}
                    <path d="M36 34 C36 18 50 12 62 12 C74 12 80 20 80 34 Z" fill="#475569" />
                    {/* Nightcap tail */}
                    <path d="M76 20 C88 20 92 28 90 35" stroke="#475569" strokeWidth="6" strokeLinecap="round" fill="none" />
                    <circle cx="90" cy="37" r="5" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1" />
                    {/* Closed happy sleeping eyes ⌒ ⌒ */}
                    <path d="M46 41 C48 43.5 51 43.5 53 41" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                    <path d="M61 41 C63 43.5 66 43.5 68 41" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                    {/* Sleeping blush */}
                    <circle cx="43" cy="45" r="3.5" fill="#F87171" opacity="0.4" />
                    <circle cx="71" cy="45" r="3.5" fill="#F87171" opacity="0.4" />
                    {/* Gentle sleeping smile */}
                    <path d="M55 46 C57 48 59 48 61 46" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                    {/* Blanket / Body */}
                    <path d="M28 62 C28 53 40 50 57 50 C74 50 86 53 86 62 Z" fill="#64748B" />
                    {/* Sleeping hands resting */}
                    <ellipse cx="44" cy="56" rx="5.5" ry="4" fill="#FED7AA" stroke="#CBD5E1" strokeWidth="1" />
                    <ellipse cx="70" cy="56" rx="5.5" ry="4" fill="#FED7AA" stroke="#CBD5E1" strokeWidth="1" />
                  </svg>

                  {/* Sleep Mode Placard / Header */}
                  <div className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3 -mt-1 shadow-xs">
                    <span className="inline-block text-[10px] font-bold text-slate-600 uppercase tracking-widest bg-slate-200/90 px-2 py-0.5 rounded-full mb-1">
                      ម៉ោងគេងសម្រាក • SLEEP MODE {String(nightStartH).padStart(2, '0')}:00 ដល់ {String(nightEndH).padStart(2, '0')}:00
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                      "ពេលយប់ជ្រៅហើយ AI សុំគេងសិនហើយបងៗ"
                    </h3>
                  </div>
                </>
              ) : (
                /* 2. MAINTENANCE MASCOT (Chibi Holding Placard) */
                <>
                  <svg
                    width="110"
                    height="85"
                    viewBox="0 0 110 85"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="overflow-visible"
                  >
                    {/* Hair back */}
                    <path d="M30 50 C18 36 22 14 55 14 C88 14 92 36 80 50 Z" fill="#334155" />
                    {/* Face */}
                    <circle cx="55" cy="42" r="25" fill="#FED7AA" />
                    {/* Ears */}
                    <circle cx="30" cy="43" r="5" fill="#FED7AA" />
                    <circle cx="80" cy="43" r="5" fill="#FED7AA" />
                    {/* Bangs / Hair front */}
                    <path d="M32 35 C38 22 48 18 55 22 C62 18 72 22 78 35 C74 29 63 27 55 29 C47 27 36 29 32 35 Z" fill="#1E293B" />
                    {/* Eyes (relatable apologetic curved squint) */}
                    <path d="M44 41 C46 38 49 38 51 41" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M59 41 C61 38 64 38 66 41" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />
                    {/* Blush cheeks */}
                    <circle cx="41" cy="46" r="3.5" fill="#F87171" opacity="0.45" />
                    <circle cx="69" cy="46" r="3.5" fill="#F87171" opacity="0.45" />
                    {/* Gentle apologetic smile */}
                    <path d="M50 47 C53 49 57 49 60 47" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" fill="none" />
                    {/* Sweat drop (relatable funny mood) */}
                    <path d="M72 32 C72 30 75 27 75 27 C75 27 78 30 78 32 C78 34 76.5 35.5 75 35.5 C73.5 35.5 72 34 72 32 Z" fill="#60A5FA" />
                    {/* Shoulders / Shirt */}
                    <path d="M35 72 C35 63 44 60 55 60 C66 60 75 63 75 72 Z" fill="#64748B" />
                    {/* Hands gripping the placard board top */}
                    <ellipse cx="36" cy="74" rx="7" ry="5" fill="#FED7AA" stroke="#CBD5E1" strokeWidth="1.5" />
                    <ellipse cx="74" cy="74" rx="7" ry="5" fill="#FED7AA" stroke="#CBD5E1" strokeWidth="1.5" />
                  </svg>

                  {/* Placard Board held by character */}
                  <div className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3 -mt-2 shadow-xs">
                    <span className="inline-block text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-200/80 px-2 py-0.5 rounded-full mb-1">
                      សារលើកផ្លាកប្រាប់ដំណឹង
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                      "ចាំតិចបងអើយ ញុមរវល់ភ្លេចបើកមើលថែមៗ"
                    </h3>
                  </div>
                </>
              )}
            </div>

            {/* Notice Message Box (Distinct for Sleep Mode vs Maintenance Mode) */}
            {isNightOnly ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 text-left space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider bg-slate-200/90 border border-slate-300 px-2 py-0.5 rounded-md">
                    បញ្ជាក់៖ មិនមែនបិទប្រព័ន្ធ ឬខូច Server ទេ!
                  </span>
                </div>

                <div>
                  <h4 className="text-sm sm:text-base font-sans text-slate-900 font-bold mb-1 leading-snug">
                    ប្រព័ន្ធស្ថិតក្នុងម៉ោងសម្រាក Sleep Mode: {String(nightStartH).padStart(2, '0')}:00 ដល់ {String(nightEndH).padStart(2, '0')}:00
                  </h4>
                  <p className="text-xs sm:text-sm font-sans text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
                    {systemState.nightRestMessage || 'ពេលយប់ជ្រៅហើយ! ប្រព័ន្ធ AI សុំសម្រាកគេងសិន ដើម្បីសន្សំកូតា និងកម្លាំងសម្រាប់ថ្ងៃស្អែក! សូមចូលមកលេងនៅម៉ោង 06:00 ព្រឹកឡើងវិញ!'}
                  </p>
                </div>

                {/* Creative Chill Student Note */}
                <div className="pt-2 border-t border-slate-200/80 text-xs sm:text-sm text-slate-600 leading-relaxed font-sans">
                  យប់ជ្រៅពេកហើយ គេងសិនទៅបងៗ កុំនៅយឺតពេកប្រយ័ត្នខូចភ្នែក! ប្រព័ន្ធនឹងភ្ញាក់មកដំណើរការធម្មតាវិញនៅម៉ោង {String(nightEndH).padStart(2, '0')}:00 ព្រឹក។
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 text-left space-y-2.5">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider mb-1">
                    មូលហេតុបិទប្រព័ន្ធ Server Maintenance Notice
                  </span>
                  <p className="text-sm sm:text-base font-sans text-slate-900 font-semibold leading-relaxed whitespace-pre-wrap break-words">
                    {systemState.maintenanceReason || activeNotice || 'Jam tic nh bit mlat sin srul Kom oy klas kaeng klas chat ban klas ort ban\nសម្រាកប្រហែលជា ៣ ម៉ោងសិន'}
                  </p>
                </div>

                {/* Creative Chill Student Vibe Note */}
                <div className="pt-2 border-t border-slate-200/80 text-xs sm:text-sm text-slate-600 leading-relaxed font-sans">
                  កុំទាន់ស្លន់! Creator កំពុងរៀបចំសម្រួលប្រព័ន្ធឱ្យស្រួលបួលឡើងវិញ តិចទៀតរួចរាល់ហើយ។ អង្គុយ Chill ផឹកកាហ្វេសិនទៅ!
                </div>
              </div>
            )}

            {/* Real-time Status & Phnom Penh Hour */}
            <div className="text-[11px] text-slate-500 mb-4 flex items-center justify-between font-sans px-1">
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                {isNightOnly ? `Sleep Mode ${String(nightStartH).padStart(2, '0')}:00 ដល់ ${String(nightEndH).padStart(2, '0')}:00` : 'Auto-Syncing Real-time'}
              </span>
              <span>ម៉ោងនៅភ្នំពេញ: {String(cambodiaHour).padStart(2, '0')}:00 UTC+7</span>
            </div>

            {/* Auto-reconnect notification box (NO REFRESH BUTTON) */}
            <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-center">
              <p className="text-xs text-slate-700 font-sans font-medium">
                {isNightOnly
                  ? `ប្រព័ន្ធនឹងភ្ញាក់ដំណើរការធម្មតាវិញស្វ័យប្រវត្តិតែម្ដង នៅម៉ោង ${String(nightEndH).padStart(2, '0')}:00 ព្រឹក ពុំបាច់ចុច Refresh ឡើយ`
                  : 'ទំព័រនឹងបើកដំណើរការឡើងវិញស្វ័យប្រវត្តិតែម្ដង នៅពេល Server បើកវិញ ពុំបាច់ចុច Refresh ឡើយ'}
              </p>
            </div>
          </div>
        </div>
      )}

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
