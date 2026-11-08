'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { getApiEndpoint } from '../app/utils/apiConfig';

const FIREBASE_DB_URL = 'https://troll-setec-chatbot-default-rtdb.asia-southeast1.firebasedatabase.app';

// Subtle Web Audio Chime for Real-Time Alert Popup
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
    // Pleasant futuristic 2-tone chime (D5 -> A5)
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.14);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.38);
  } catch {}
}

export default function SystemBroadcast() {
  const pathname = usePathname();
  const [systemState, setSystemState] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [dismissedNotice, setDismissedNotice] = useState('');
  const [hideTopBanner, setHideTopBanner] = useState(false);

  // Bypass / Maintenance State
  const [showBypassInput, setShowBypassInput] = useState(false);
  const [bypassCode, setBypassCode] = useState('');
  const [bypassError, setBypassError] = useState('');
  const [isBypassed, setIsBypassed] = useState(false);
  const eventSourceRef = useRef(null);

  // Exclude Admin Control Panel from ever seeing maintenance locks or student popups
  const isAdminRoute = pathname?.includes('jam-tic-kapea-1-sin');

  // Check if Creator Rotana session is already active
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedAdminPass = sessionStorage.getItem('rotana_admin_passcode');
    const savedUser = localStorage.getItem('chatbot_username') || '';
    if (savedAdminPass || savedUser.toLowerCase().includes('rotana')) {
      setIsBypassed(true);
    }

    // Initialize dismissed notice from sessionStorage
    const savedDismissed = sessionStorage.getItem('rotana_dismissed_broadcast') || '';
    if (savedDismissed) {
      setDismissedNotice(savedDismissed);
    }
  }, []);

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

  const isNight =
    systemState.nightScheduleEnabled &&
    (systemState.nightStartHour > systemState.nightEndHour
      ? cambodiaHour >= systemState.nightStartHour || cambodiaHour < systemState.nightEndHour
      : cambodiaHour >= systemState.nightStartHour && cambodiaHour < systemState.nightEndHour);

  const isMaintenance = !systemState.serverOnline || systemState.maintenanceMode;
  const isResting = isMaintenance || isNight;

  const isChatRoute = pathname?.includes('KonBong') || pathname?.includes('KonPov');

  // Verify Bypass Code for Creator Rotana
  const handleVerifyBypass = async (e) => {
    e.preventDefault();
    if (!bypassCode.trim()) return;

    try {
      const endpoint = getApiEndpoint('/api/system-status');
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify-auth', passcode: bypassCode.trim() })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        sessionStorage.setItem('rotana_admin_passcode', bypassCode.trim());
        setIsBypassed(true);
        setShowBypassInput(false);
      } else {
        setBypassError('លេខកូដមិនត្រឹមត្រូវ!');
      }
    } catch {
      setBypassError('កំហុសក្នុងការតភ្ជាប់!');
    }
  };

  return (
    <>
      {/* ========================================================= */}
      {/* 1. REAL-TIME UI ALERT POPUP MODAL (ON SCREEN CENTER)     */}
      {/* ========================================================= */}
      {showPopup && activeNotice && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div className="w-full max-w-lg bg-gradient-to-b from-slate-900 to-slate-950 border border-indigo-500/40 ring-1 ring-indigo-500/20 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-indigo-950/80 relative overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Top Glowing Animated Edge */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-indigo-500 to-sky-400 animate-pulse" />

            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-4 pb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-950/80 border border-indigo-600/50 text-indigo-400 flex items-center justify-center text-xl shadow-lg shadow-indigo-950/50 shrink-0">
                  <i className="fa-solid fa-bullhorn animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white tracking-tight">
                      📢 សារដំណឹងបន្ទាន់ពីស្ថាបនិក Rotana NOB
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-950/80 text-rose-300 border border-rose-800/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                      <span>REAL-TIME LIVE</span>
                    </span>
                    <span className="text-[11px] text-slate-400">SETEC Master Command</span>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={handleDismissPopup}
                className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                title="បិទផ្ទាំងដំណឹង"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            {/* Message Body */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 sm:p-5 mb-5 max-h-[55vh] overflow-y-auto selection:bg-indigo-600 selection:text-white">
              <p className="text-sm sm:text-base font-sans text-slate-100 leading-relaxed whitespace-pre-wrap break-words select-text">
                {activeNotice}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 order-2 sm:order-1">
                <i className="fa-solid fa-shield-check text-emerald-400" />
                <span>សារផ្លូវការចេញពី Admin Portal</span>
              </div>

              <button
                type="button"
                onClick={handleDismissPopup}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer order-1 sm:order-2"
              >
                <i className="fa-solid fa-check" />
                <span>យល់ព្រម / ទទួលដឹងឮ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. PERSISTENT TOP BANNER (WHEN NOTICE ACTIVE)            */}
      {/* ========================================================= */}
      {activeNotice && !hideTopBanner && (
        <div className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-950 text-indigo-100 border-b border-indigo-700/60 px-4 py-2 text-xs relative z-40 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <span className="w-6 h-6 rounded-lg bg-indigo-800/80 border border-indigo-600/50 flex items-center justify-center text-indigo-300 shrink-0 text-xs">
                <i className="fa-solid fa-bullhorn" />
              </span>
              <span className="font-semibold text-white shrink-0 hidden sm:inline">ដំណឹងបន្ទាន់:</span>
              <span className="truncate max-w-md md:max-w-2xl text-slate-200">
                {activeNotice}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowPopup(true)}
                className="px-2.5 py-1 rounded-lg bg-indigo-700/50 hover:bg-indigo-600/60 text-indigo-200 hover:text-white text-[11px] font-medium border border-indigo-500/40 transition-colors flex items-center gap-1 cursor-pointer"
                title="ចុចមើលសារពេញលេញជាផ្ទាំង Popup"
              >
                <i className="fa-solid fa-expand text-[10px]" />
                <span>មើលសារពេញលេញ</span>
              </button>

              <button
                type="button"
                onClick={() => setHideTopBanner(true)}
                className="text-indigo-400 hover:text-white p-1 transition-colors cursor-pointer"
                title="បិទរបារនេះ"
              >
                <i className="fa-solid fa-xmark text-xs" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. FULL-SCREEN RESTING / MAINTENANCE MODAL OVERLAY       */}
      {/* ========================================================= */}
      {isChatRoute && isResting && !isBypassed && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 selection:bg-indigo-600 selection:text-white">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-center">
            <div className={`absolute top-0 left-0 right-0 h-1.5 ${
              isMaintenance
                ? 'bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500'
                : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500'
            }`} />

            {/* Icon */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 text-2xl mb-4 text-indigo-400 shadow-inner">
              <i className={`fa-solid ${isMaintenance ? 'fa-screwdriver-wrench' : 'fa-moon'}`} />
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold text-white mb-2">
              {isMaintenance
                ? 'ប្រព័ន្ធកំពុងស្ថិតក្នុងការថែទាំ (Maintenance)'
                : 'ប្រព័ន្ធកំពុងសម្រាកពេលយប់ (Night Resting)'}
            </h2>

            {/* Explanation Message */}
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6 px-2">
              {isMaintenance
                ? systemState.maintenanceReason || 'ប្រព័ន្ធកំពុងសម្រាកបណ្ដោះអាសន្ន ដើម្បីពង្រឹង Server និងសន្សំកូតា AI សម្រាប់សិស្ស SETEC ទាំងអស់គ្នា!'
                : systemState.nightRestMessage || 'ពេលយប់ជ្រៅហើយ! ប្រព័ន្ធ AI សុំសម្រាកគេងសិន ដើម្បីសន្សំកូតា និងកម្លាំងសម្រាប់ថ្ងៃស្អែក! សូមចូលមកលេងនៅម៉ោង 06:00 ព្រឹកឡើងវិញ!'}
            </p>

            {/* Timers & Schedule Badges */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 mb-6 font-mono">
              <i className="fa-solid fa-clock text-indigo-400" />
              <span>ម៉ោងនៅភ្នំពេញ: {String(cambodiaHour).padStart(2, '0')}:00 &bull; UTC+7</span>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/"
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-house" />
                <span>ត្រឡប់ទៅទំព័រដើម</span>
              </Link>

              <button
                type="button"
                onClick={() => setShowBypassInput(!showBypassInput)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-medium border border-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <i className="fa-solid fa-key text-[10px]" />
                <span>Rotana Creator Bypass</span>
              </button>
            </div>

            {/* Rotana Passcode Input Form */}
            {showBypassInput && (
              <form onSubmit={handleVerifyBypass} className="mt-5 pt-5 border-t border-slate-800/80 text-left">
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  បញ្ចូល Master Passcode ដើម្បី Bypass ចូល Test៖
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={bypassCode}
                    onChange={(e) => setBypassCode(e.target.value)}
                    placeholder="Enter Master Code..."
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  >
                    Bypass
                  </button>
                </div>
                {bypassError && (
                  <p className="text-[11px] text-rose-400 mt-1.5">{bypassError}</p>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
