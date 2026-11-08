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
  const [isBypassed, setIsBypassed] = useState(false);
  const eventSourceRef = useRef(null);

  // Exclude Admin Control Panel from ever seeing maintenance locks or student popups
  const isAdminRoute = pathname?.includes('jam-tic-kapea-1-sin');

  // Check if Creator Rotana session is already active from admin login
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

  return (
    <>
      {/* ========================================================= */}
      {/* 1. REAL-TIME UI ALERT POPUP MODAL (ON SCREEN CENTER)     */}
      {/* ========================================================= */}
      {showPopup && activeNotice && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div className="w-full max-w-lg bg-gray-100 border border-gray-300 rounded-2xl p-6 sm:p-7 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-150 text-gray-900">
            {/* Top Gray Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gray-400" />

            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-gray-300">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
                  សេចក្ដីជូនដំណឹងពីអ្នកគ្រប់គ្រង (Rotana NOB)
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  ការជូនដំណឹងពីប្រព័ន្ធ
                </p>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={handleDismissPopup}
                className="w-8 h-8 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-900 transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                title="បិទ"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            {/* Message Body */}
            <div className="bg-white border border-gray-300 rounded-xl p-4 sm:p-5 mb-5 max-h-[55vh] overflow-y-auto shadow-sm">
              <p className="text-sm sm:text-base font-sans text-gray-800 leading-relaxed whitespace-pre-wrap break-words select-text font-medium">
                {activeNotice}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={handleDismissPopup}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-900 text-white font-medium text-xs sm:text-sm shadow transition-all flex items-center justify-center cursor-pointer"
              >
                យល់ព្រម
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. PERSISTENT TOP BANNER (WHEN NOTICE ACTIVE)            */}
      {/* ========================================================= */}
      {activeNotice && !hideTopBanner && (
        <div className="bg-gray-200 text-gray-800 border-b border-gray-300 px-4 py-2 text-xs relative z-40 shadow-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="font-semibold text-gray-900 shrink-0">ដំណឹង:</span>
              <span className="truncate max-w-md md:max-w-2xl text-gray-700 font-medium">
                {activeNotice}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowPopup(true)}
                className="px-2.5 py-1 rounded-lg bg-gray-300 hover:bg-gray-400 text-gray-800 text-[11px] font-medium transition-colors cursor-pointer"
                title="ចុចមើលសារពេញលេញជាផ្ទាំង Popup"
              >
                មើលសារពេញលេញ
              </button>

              <button
                type="button"
                onClick={() => setHideTopBanner(true)}
                className="text-gray-500 hover:text-gray-800 p-1 transition-colors cursor-pointer"
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
      {isChatRoute && isResting && (
        <div className="fixed inset-0 z-50 bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-gray-100 border border-gray-300 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-center text-gray-900">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gray-400" />

            {/* Title */}
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
              {isMaintenance
                ? 'ប្រព័ន្ធកំពុងស្ថិតក្នុងការជួសជុល និងថែទាំ'
                : 'ប្រព័ន្ធកំពុងសម្រាកពេលយប់'}
            </h2>

            {/* Explanation Message */}
            <div className="bg-white border border-gray-300 rounded-xl p-4 sm:p-5 mb-5 text-left shadow-sm">
              <p className="text-sm sm:text-base text-gray-800 leading-relaxed whitespace-pre-wrap break-words font-medium">
                {isMaintenance
                  ? systemState.maintenanceReason || 'ប្រព័ន្ធកំពុងសម្រាកបណ្ដោះអាសន្ន ដើម្បីជួសជុល និងថែទាំ Server'
                  : systemState.nightRestMessage || 'ពេលយប់ជ្រៅហើយ! ប្រព័ន្ធ AI សុំសម្រាកគេងសិន ដើម្បីសន្សំកូតា និងកម្លាំងសម្រាប់ថ្ងៃស្អែក! សូមចូលមកលេងនៅម៉ោង 06:00 ព្រឹកឡើងវិញ!'}
              </p>
            </div>

            {/* Timers & Schedule Info */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-200 border border-gray-300 text-xs text-gray-600 mb-6 font-mono">
              <i className="fa-solid fa-clock text-gray-500" />
              <span>ម៉ោងនៅកម្ពុជា: {String(cambodiaHour).padStart(2, '0')}:00 (UTC+7)</span>
            </div>

            {/* Actions (NO Bypass Creator button) */}
            <div className="flex items-center justify-center">
              <Link
                href="/"
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-900 text-white text-xs sm:text-sm font-medium shadow transition-all flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-house" />
                <span>ត្រឡប់ទៅទំព័រដើម</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
