'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { getApiEndpoint } from '../app/utils/apiConfig';

const FIREBASE_DB_URL = 'https://troll-setec-chatbot-default-rtdb.asia-southeast1.firebasedatabase.app';

export default function SystemBroadcast() {
  const pathname = usePathname();
  const [systemState, setSystemState] = useState(null);
  const [dismissBroadcast, setDismissBroadcast] = useState(false);
  const [showBypassInput, setShowBypassInput] = useState(false);
  const [bypassCode, setBypassCode] = useState('');
  const [bypassError, setBypassError] = useState('');
  const [isBypassed, setIsBypassed] = useState(false);
  const eventSourceRef = useRef(null);

  // Exclude Admin Control Panel from ever seeing maintenance locks
  const isAdminRoute = pathname?.includes('jam-tic-kapea-1-sin');

  // Check if Creator Rotana session is already active
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedAdminPass = sessionStorage.getItem('rotana_admin_passcode');
    const savedUser = localStorage.getItem('chatbot_username') || '';
    if (savedAdminPass || savedUser.toLowerCase().includes('rotana')) {
      setIsBypassed(true);
    }
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

      es.addEventListener('put', (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload?.data && typeof payload.data === 'object') {
            setSystemState((prev) => ({ ...(prev || {}), ...payload.data }));
          }
        } catch {}
      });

      es.addEventListener('patch', (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload?.data) {
            setSystemState((prev) => ({ ...(prev || {}), ...payload.data }));
          }
        } catch {}
      });
    } catch {}

    const pollTimer = setInterval(fetchStatus, 8000);

    return () => {
      clearInterval(pollTimer);
      if (eventSourceRef.current) {
        try { eventSourceRef.current.close(); } catch {}
      }
    };
  }, [isAdminRoute]);

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
      {/* 1. Live Broadcast Announcement Banner */}
      {systemState.broadcastNotice && !dismissBroadcast && (
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-900 text-indigo-100 border-b border-indigo-700/60 px-4 py-2 text-xs relative z-50 shadow-md">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <span className="w-6 h-6 rounded-lg bg-indigo-700/60 flex items-center justify-center text-indigo-300 shrink-0 text-xs">
                <i className="fa-solid fa-bullhorn" />
              </span>
              <span className="font-semibold text-white shrink-0 hidden sm:inline">ដំណឹងបន្ទាន់:</span>
              <span className="truncate">{systemState.broadcastNotice}</span>
            </div>
            <button
              onClick={() => setDismissBroadcast(true)}
              className="text-indigo-300 hover:text-white p-1 shrink-0"
              title="បិទដំណឹង"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Full-Screen Resting / Maintenance Modal Overlay on Chat Pages */}
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
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-medium border border-slate-700 transition-colors flex items-center justify-center gap-2"
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
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors"
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
