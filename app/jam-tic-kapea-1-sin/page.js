'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { getApiEndpoint } from '../utils/apiConfig';

const FIREBASE_DB_URL = 'https://troll-setec-chatbot-default-rtdb.asia-southeast1.firebasedatabase.app';

export default function JamTicKapeaAdminPage() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // System State
  const [systemState, setSystemState] = useState({
    serverOnline: true,
    maintenanceMode: false,
    maintenanceReason: 'ប្រព័ន្ធកំពុងសម្រាកបណ្ដោះអាសន្ន ដើម្បីពង្រឹង Server និងសន្សំកូតា AI សម្រាប់សិស្ស SETEC ទាំងអស់គ្នា!',
    nightScheduleEnabled: true,
    nightStartHour: 23,
    nightEndHour: 6,
    nightRestMessage: 'ពេលយប់ជ្រៅហើយ! ប្រព័ន្ធ AI សុំសម្រាកគេងសិន ដើម្បីសន្សំកូតា និងកម្លាំងសម្រាប់ថ្ងៃស្អែក! សូមចូលមកលេងនៅម៉ោង 06:00 ព្រឹកឡើងវិញ!',
    konbongActive: true,
    konpovActive: true,
    sessionLimitActive: true,
    broadcastNotice: '',
    lastUpdated: Date.now(),
    updatedBy: 'Rotana NOB'
  });

  const [evaluation, setEvaluation] = useState({
    isResting: false,
    mode: 'online',
    title: 'ប្រព័ន្ធដំណើរការធម្មតា (Online)'
  });

  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });
  const [cambodiaTime, setCambodiaTime] = useState('');
  const [cambodiaHour, setCambodiaHour] = useState(23);
  const [rtdbConnected, setRtdbConnected] = useState(true);
  const [activeTab, setActiveTab] = useState('master'); // 'master' | 'schedule' | 'bots' | 'broadcast'

  // Editable form fields
  const [editMaintenanceReason, setEditMaintenanceReason] = useState('');
  const [editNightMessage, setEditNightMessage] = useState('');
  const [editBroadcastNotice, setEditBroadcastNotice] = useState('');
  const [editNightStart, setEditNightStart] = useState(23);
  const [editNightEnd, setEditNightEnd] = useState(6);

  const eventSourceRef = useRef(null);

  // Clock Update Effect (UTC+7 Phnom Penh Time)
  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date();
        const khFormatter = new Intl.DateTimeFormat('km-KH', {
          timeZone: 'Asia/Phnom_Penh',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hourCycle: 'h23'
        });
        setCambodiaTime(khFormatter.format(now));

        const hourPart = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Phnom_Penh',
          hour: 'numeric',
          hourCycle: 'h23'
        }).format(now);
        setCambodiaHour(parseInt(hourPart, 10));
      } catch {
        const fallback = new Date(Date.now() + 7 * 3600 * 1000);
        setCambodiaTime(fallback.toISOString().replace('T', ' ').slice(0, 19));
      }
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Current State from API
  const fetchState = useCallback(async (token = null) => {
    try {
      const activeToken = token || passcode || (typeof window !== 'undefined' ? sessionStorage.getItem('rotana_admin_passcode') : '');
      const endpoint = getApiEndpoint('/api/system-status?fresh=true');
      const res = await fetch(endpoint, {
        headers: {
          'x-rotana-passcode': activeToken || ''
        },
        cache: 'no-store'
      });

      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.state) {
          setSystemState(data.state);
          if (data.evaluation) setEvaluation(data.evaluation);
          if (data.cambodiaHour !== undefined) setCambodiaHour(data.cambodiaHour);

          setEditMaintenanceReason(data.state.maintenanceReason || '');
          setEditNightMessage(data.state.nightRestMessage || '');
          setEditBroadcastNotice(data.state.broadcastNotice || '');
          setEditNightStart(data.state.nightStartHour ?? 23);
          setEditNightEnd(data.state.nightEndHour ?? 6);
          setRtdbConnected(true);
        }
      }
    } catch (err) {
      console.warn('[Admin] Failed to fetch state:', err);
    } finally {
      setIsLoading(false);
    }
  }, [passcode]);

  // Initial Auth Check from SessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPass = sessionStorage.getItem('rotana_admin_passcode');
      if (savedPass) {
        setPasscode(savedPass);
        setIsAuthenticated(true);
        fetchState(savedPass);
      } else {
        setIsLoading(false);
      }
    }
  }, [fetchState]);

  // Real-time Firebase RTDB Subscription via EventSource
  useEffect(() => {
    if (!isAuthenticated || typeof window === 'undefined') return;

    const sseUrl = `${FIREBASE_DB_URL}/system_control.json`;
    let es = null;

    try {
      es = new EventSource(sseUrl);
      eventSourceRef.current = es;

      es.addEventListener('put', (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload && payload.data && typeof payload.data === 'object') {
            setSystemState((prev) => ({ ...prev, ...payload.data }));
            setRtdbConnected(true);
          }
        } catch {}
      });

      es.addEventListener('patch', (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload && payload.data) {
            setSystemState((prev) => ({ ...prev, ...payload.data }));
            setRtdbConnected(true);
          }
        } catch {}
      });

      es.onerror = () => {
        setRtdbConnected(false);
      };
    } catch {
      setRtdbConnected(false);
    }

    // Fallback polling interval every 6 seconds
    const interval = setInterval(() => {
      fetchState();
    }, 6000);

    return () => {
      clearInterval(interval);
      if (es) {
        try { es.close(); } catch {}
      }
    };
  }, [isAuthenticated, fetchState]);

  // Handle Login Authentication
  const handleAuthenticate = async (e) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setAuthError('សូមបញ្ចូលលេខកូដសម្ងាត់ Master Passcode របស់អ្នក!');
      return;
    }

    setIsVerifying(true);
    setAuthError('');

    try {
      const endpoint = getApiEndpoint('/api/system-status');
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-rotana-passcode': passcode.trim()
        },
        body: JSON.stringify({
          action: 'verify-auth',
          passcode: passcode.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setIsAuthenticated(true);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('rotana_admin_passcode', passcode.trim());
        }
        if (data.state) {
          setSystemState(data.state);
          if (data.evaluation) setEvaluation(data.evaluation);
        }
        setStatusMessage({ text: 'ផ្ទៀងផ្ទាត់សិទ្ធិជោគជ័យ! សូមស្វាគមន៍មកកាន់មជ្ឈមណ្ឌលគ្រប់គ្រងប្រព័ន្ធ។', type: 'success' });
      } else {
        setAuthError(data.message || 'លេខកូដសម្ងាត់មិនត្រឹមត្រូវ! សិទ្ធិចូលដំណើរការត្រូវបានបដិសេធ។');
      }
    } catch {
      setAuthError('មានបញ្ហាក្នុងការតភ្ជាប់ទៅកាន់ម៉ាស៊ីនមេ! សូមព្យាយាមម្ដងទៀត។');
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('rotana_admin_passcode');
    }
    setIsAuthenticated(false);
    setPasscode('');
  };

  // Perform Server State Update via API
  const sendUpdate = async (patch, actionDescription = 'Update System Parameters') => {
    setIsSubmitting(true);
    setStatusMessage({ text: 'កំពុងបញ្ជូនទិន្នន័យបញ្ជា...', type: 'info' });

    try {
      const endpoint = getApiEndpoint('/api/system-status');
      const activePasscode = passcode || (typeof window !== 'undefined' ? sessionStorage.getItem('rotana_admin_passcode') : '');

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-rotana-passcode': activePasscode || ''
        },
        body: JSON.stringify({
          action: actionDescription,
          passcode: activePasscode,
          patch
        })
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setSystemState(data.state);
        if (data.evaluation) setEvaluation(data.evaluation);
        setStatusMessage({ text: `ប្រតិបត្តិការជោគជ័យ: ${actionDescription}`, type: 'success' });
        setTimeout(() => setStatusMessage({ text: '', type: '' }), 5000);
      } else {
        setStatusMessage({ text: `បរាជ័យ: ${data.message || 'កំហុសបច្ចេកទេស'}`, type: 'error' });
      }
    } catch (err) {
      setStatusMessage({ text: `កំហុសក្នុងការតភ្ជាប់: ${err.message}`, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Action Handlers
  const handleToggleServer = () => {
    const nextState = !systemState.serverOnline;
    sendUpdate(
      {
        serverOnline: nextState,
        maintenanceMode: !nextState
      },
      nextState ? 'បើកដំណើរការ Server ឡើងវិញ (Resume Server)' : 'បិទ Server ដាក់ថែទាំភ្លាមៗ (Emergency Stop / Maintenance)'
    );
  };

  const handleToggleNightSchedule = () => {
    const nextState = !systemState.nightScheduleEnabled;
    sendUpdate(
      { nightScheduleEnabled: nextState },
      nextState ? 'បើកកាលវិភាគសម្រាកពេលយប់ (Enable Night Schedule)' : 'ផ្អាកកាលវិភាគសម្រាកពេលយប់ (Disable Night Schedule)'
    );
  };

  const handleToggleKonBong = () => {
    const nextState = !systemState.konbongActive;
    sendUpdate(
      { konbongActive: nextState },
      nextState ? 'បើកដំណើរការបងកូនច្បង (Activate KonBong)' : 'ផ្អាកបងកូនច្បង (Deactivate KonBong)'
    );
  };

  const handleToggleKonPov = () => {
    const nextState = !systemState.konpovActive;
    sendUpdate(
      { konpovActive: nextState },
      nextState ? 'បើកដំណើរការចែកូនពៅ (Activate KonPov)' : 'ផ្អាកចែកូនពៅ (Deactivate KonPov)'
    );
  };

  const handleToggleSessionLimit = () => {
    const nextState = !systemState.sessionLimitActive;
    sendUpdate(
      { sessionLimitActive: nextState },
      nextState ? 'បើកប្រព័ន្ធកំណត់ពេល 30 នាទី (Enable Session Limit)' : 'បិទប្រព័ន្ធកំណត់ពេល 30 នាទី (Unlimited Play)'
    );
  };

  const handleFlushRateLimits = async () => {
    if (!confirm('តើអ្នកពិតជាចង់សម្អាត Rate Limits, Cooldowns និង IP Bans ទាំងអស់មែនទេ? សិស្សដែលជាប់គាំងទាំងអស់នឹងអាចចូលលេងបានវិញភ្លាមៗ។')) {
      return;
    }

    setIsSubmitting(true);
    setStatusMessage({ text: 'កំពុងសម្អាតទិន្នន័យចាក់សោទាំងអស់...', type: 'info' });

    try {
      const endpoint = getApiEndpoint('/api/system-status');
      const activePasscode = passcode || (typeof window !== 'undefined' ? sessionStorage.getItem('rotana_admin_passcode') : '');

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-rotana-passcode': activePasscode || ''
        },
        body: JSON.stringify({
          action: 'flush-limits',
          passcode: activePasscode
        })
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setStatusMessage({ text: 'បានសម្អាតទិន្នន័យចាក់សោនិង Cooldown ទាំងអស់ជោគជ័យ!', type: 'success' });
        setTimeout(() => setStatusMessage({ text: '', type: '' }), 5000);
      } else {
        setStatusMessage({ text: `បរាជ័យ: ${data.message || 'កំហុសបច្ចេកទេស'}`, type: 'error' });
      }
    } catch (err) {
      setStatusMessage({ text: `កំហុសក្នុងការតភ្ជាប់: ${err.message}`, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveScheduleConfig = (e) => {
    e.preventDefault();
    sendUpdate(
      {
        nightStartHour: parseInt(editNightStart, 10),
        nightEndHour: parseInt(editNightEnd, 10),
        nightRestMessage: editNightMessage.trim()
      },
      'រក្សាទុកការកំណត់ម៉ោងសម្រាកពេលយប់'
    );
  };

  const handleSaveMaintenanceConfig = (e) => {
    e.preventDefault();
    sendUpdate(
      {
        maintenanceReason: editMaintenanceReason.trim()
      },
      'កែប្រែសារជូនដំណឹងពេលថែទាំ Server'
    );
  };

  const handleSaveBroadcast = (e) => {
    e.preventDefault();
    sendUpdate(
      {
        broadcastNotice: editBroadcastNotice.trim()
      },
      editBroadcastNotice.trim() ? 'ផ្សាយសារដំណឹងបន្ទាន់ទៅកាន់អេក្រង់សិស្សទាំងអស់' : 'លុបសារផ្សាយដំណឹងបន្ទាន់'
    );
  };

  // Current system resting calculation
  const isCurrentlyNight = cambodiaHour >= (systemState.nightStartHour ?? 23) || cambodiaHour < (systemState.nightEndHour ?? 6);
  const isEffectivelyResting = !systemState.serverOnline || systemState.maintenanceMode || (systemState.nightScheduleEnabled && isCurrentlyNight);

  // Authentication Card Screen
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 selection:bg-indigo-600 selection:text-white">
        <div className="w-full max-w-md">
          {/* Top Brand Indicator */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-900 to-slate-900 border border-indigo-500/30 text-indigo-400 text-2xl shadow-xl shadow-indigo-950/50 mb-4">
              <i className="fa-solid fa-shield-halved" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              មជ្ឈមណ្ឌលគ្រប់គ្រងម៉ាស៊ីនមេ
            </h1>
            <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-wider">
              SETEC Neural Core &bull; Supreme Access Control
            </p>
          </div>

          {/* Authentication Panel */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-sky-500 to-indigo-500" />

            <div className="flex items-center gap-3 pb-5 mb-6 border-b border-slate-800/80">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
                <i className="fa-solid fa-key" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-200">ផ្ទៀងផ្ទាត់អត្តសញ្ញាណ Master</h2>
                <p className="text-xs text-slate-400">កំណត់សិទ្ធិផ្តាច់មុខសម្រាប់ Creator Rotana NOB</p>
              </div>
            </div>

            {authError && (
              <div className="mb-5 p-3 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2.5">
                <i className="fa-solid fa-circle-exclamation mt-0.5 text-rose-400" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleAuthenticate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  លេខកូដសម្ងាត់ Master Passcode
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="បញ្ចូល Secret Passcode..."
                    className="w-full px-4 py-3 bg-slate-950/80 border border-slate-700/80 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                    autoFocus
                    required
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                    <i className="fa-solid fa-lock text-xs" />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isVerifying ? (
                  <>
                    <i className="fa-solid fa-rotate fa-spin" />
                    <span>កំពុងផ្ទៀងផ្ទាត់...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-arrow-right-to-bracket" />
                    <span>ចូលទៅកាន់ផ្ទាំងបញ្ជា</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
              <Link
                href="/"
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center gap-1.5"
              >
                <i className="fa-solid fa-arrow-left" />
                <span>ត្រឡប់ទៅទំព័រដើម</span>
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Authenticated Control Center Dashboard
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-600 selection:text-white">
      {/* Top Professional App Header */}
      <header className="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-900 to-slate-800 border border-indigo-500/40 text-indigo-400 flex items-center justify-center text-lg shadow-md">
              <i className="fa-solid fa-server" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  SETEC Master Command Center
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800">
                  v3.8 Quantum
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <span>មហាសិទ្ធគ្រប់គ្រងម៉ាស៊ីនមេ &bull; Rotana NOB</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Clock Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
              <i className="fa-solid fa-clock text-indigo-400" />
              <span className="font-mono">{cambodiaTime || 'UTC+7'}</span>
            </div>

            {/* RTDB Sync Indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
              <span className={`w-2 h-2 rounded-full ${rtdbConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
              <span className="text-[11px] text-slate-300 hidden md:inline">
                {rtdbConnected ? 'Firebase Realtime Active' : 'Disconnected'}
              </span>
            </div>

            {/* Test Link Button */}
            <Link
              href="/KonBong"
              target="_blank"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
              <span className="hidden sm:inline">សាកល្បង Chatbot</span>
            </Link>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 text-xs font-medium transition-colors flex items-center gap-1.5"
              title="ចាកចេញ"
            >
              <i className="fa-solid fa-arrow-right-from-bracket" />
              <span className="hidden sm:inline">ចាកចេញ</span>
            </button>
          </div>
        </div>
      </header>

      {/* Status Alert Notification Bar */}
      {statusMessage.text && (
        <div
          className={`px-4 py-2.5 text-xs font-medium flex items-center justify-between transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-300 border-b border-emerald-800'
              : statusMessage.type === 'error'
              ? 'bg-rose-950/90 text-rose-300 border-b border-rose-800'
              : 'bg-indigo-950/90 text-indigo-300 border-b border-indigo-800'
          }`}
        >
          <div className="max-w-7xl mx-auto w-full flex items-center gap-2">
            <i
              className={`fa-solid ${
                statusMessage.type === 'success'
                  ? 'fa-circle-check text-emerald-400'
                  : statusMessage.type === 'error'
                  ? 'fa-triangle-exclamation text-rose-400'
                  : 'fa-circle-info text-indigo-400'
              }`}
            />
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage({ text: '', type: '' })}
            className="text-slate-400 hover:text-white ml-2"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
        {/* Top Status Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Card 1: Master Server Status */}
          <div className={`p-5 rounded-2xl border backdrop-blur-sm transition-all ${
            systemState.serverOnline && !systemState.maintenanceMode
              ? 'bg-emerald-950/20 border-emerald-500/30'
              : 'bg-rose-950/30 border-rose-500/40'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400">ស្ថានភាពម៉ាស៊ីនមេ</span>
              <span className={`w-2.5 h-2.5 rounded-full ${
                systemState.serverOnline && !systemState.maintenanceMode
                  ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50'
                  : 'bg-rose-500 shadow-lg shadow-rose-500/50'
              }`} />
            </div>
            <div className="text-xl font-bold text-white mb-1">
              {systemState.serverOnline && !systemState.maintenanceMode ? 'Online (ដំណើរការ)' : 'Maintenance (ថែទាំ)'}
            </div>
            <p className="text-xs text-slate-400">
              {systemState.serverOnline && !systemState.maintenanceMode
                ? 'Server កំពុងទទួលចរាចរណ៍សិស្សធម្មតា'
                : 'Server កំពុងផ្អាកទទួលសំណើជាសាធារណៈ'}
            </p>
          </div>

          {/* Card 2: Current Rest Mode Evaluation */}
          <div className={`p-5 rounded-2xl border backdrop-blur-sm transition-all ${
            isEffectivelyResting
              ? 'bg-amber-950/20 border-amber-500/30'
              : 'bg-slate-900/60 border-slate-800'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400">របៀបសម្រាកជាក់ស្ដែង</span>
              <i className={`fa-solid ${
                isEffectivelyResting ? 'fa-moon text-amber-400' : 'fa-sun text-emerald-400'
              }`} />
            </div>
            <div className="text-xl font-bold text-white mb-1">
              {isEffectivelyResting ? 'Resting (សម្រាក)' : 'Active (សកម្ម)'}
            </div>
            <p className="text-xs text-slate-400">
              {isEffectivelyResting
                ? (!systemState.serverOnline || systemState.maintenanceMode ? 'សម្រាកដោយ Manual' : 'សម្រាកតាមម៉ោងយប់')
                : 'សិស្សអាច Chat បានគ្រប់ពេលវេលា'}
            </p>
          </div>

          {/* Card 3: Bots Status */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400">សេវា Chatbot ទាំងពីរ</span>
              <i className="fa-solid fa-robot text-indigo-400" />
            </div>
            <div className="text-sm font-semibold text-white mb-1 flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${systemState.konbongActive ? 'bg-indigo-400' : 'bg-slate-600'}`} />
                <span>កូនច្បង: {systemState.konbongActive ? 'ON' : 'OFF'}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${systemState.konpovActive ? 'bg-pink-400' : 'bg-slate-600'}`} />
                <span>កូនពៅ: {systemState.konpovActive ? 'ON' : 'OFF'}</span>
              </span>
            </div>
            <p className="text-xs text-slate-400">
              គ្រប់គ្រងការបិទបើក Bot នីមួយៗដាច់ដោយឡែក
            </p>
          </div>

          {/* Card 4: Night Schedule Window */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400">ម៉ោងសម្រាកពេលយប់</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                systemState.nightScheduleEnabled ? 'bg-indigo-950 text-indigo-300' : 'bg-slate-800 text-slate-400'
              }`}>
                {systemState.nightScheduleEnabled ? 'បើកស្វ័យប្រវត្តិ' : 'បិទ'}
              </span>
            </div>
            <div className="text-xl font-bold text-white mb-1 font-mono">
              {String(systemState.nightStartHour ?? 23).padStart(2, '0')}:00 &rarr; {String(systemState.nightEndHour ?? 6).padStart(2, '0')}:00
            </div>
            <p className="text-xs text-slate-400">
              ម៉ោងបច្ចុប្បន្ននៅភ្នំពេញ: {String(cambodiaHour).padStart(2, '0')}:00
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('master')}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'master'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <i className="fa-solid fa-power-off" />
            <span>មហាសិទ្ធបិទបើក Server</span>
          </button>

          <button
            onClick={() => setActiveTab('schedule')}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'schedule'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <i className="fa-solid fa-moon" />
            <span>កាលវិភាគសម្រាកពេលយប់</span>
          </button>

          <button
            onClick={() => setActiveTab('bots')}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'bots'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <i className="fa-solid fa-sliders" />
            <span>បិទបើក Bot &amp; Session Cooldown</span>
          </button>

          <button
            onClick={() => setActiveTab('broadcast')}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'broadcast'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <i className="fa-solid fa-bullhorn" />
            <span>ផ្សាយដំណឹងបន្ទាន់ទៅកាន់សិស្ស</span>
          </button>
        </div>

        {/* TAB 1: MASTER SERVER CONTROLS */}
        {activeTab === 'master' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Master Kill Switch Card */}
            <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-start justify-between gap-4 mb-6 pb-5 border-b border-slate-800">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <i className="fa-solid fa-power-off text-indigo-400" />
                    <span>Master Kill Switch &bull; បិទ/បើក Server ភ្លាមៗ</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    នៅពេលបិទ Server សិស្សទាំងអស់នឹងឃើញសារថែទាំភ្លាមៗ (Creator Rotana NOB នៅតែអាច Bypass និង Test បានជានិច្ច)
                  </p>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  systemState.serverOnline && !systemState.maintenanceMode
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-rose-950 text-rose-300 border border-rose-800'
                }`}>
                  {systemState.serverOnline && !systemState.maintenanceMode ? 'SERVER ONLINE' : 'MAINTENANCE MODE'}
                </span>
              </div>

              {/* Toggle Action Button */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <div className="text-sm font-semibold text-white">
                    {systemState.serverOnline && !systemState.maintenanceMode
                      ? 'Server កំពុងដំណើរការជាសាធារណៈ'
                      : 'Server កំពុងស្ថិតក្នុងរបៀបថែទាំ'}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    ចុចប៊ូតុងខាងស្ដាំដើម្បីផ្លាស់ប្តូរស្ថានភាព Server ក្នុងពេល Real-time ភ្លាមៗ
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleServer}
                  disabled={isSubmitting}
                  className={`px-6 py-3.5 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-lg transition-all whitespace-nowrap ${
                    systemState.serverOnline && !systemState.maintenanceMode
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                  } disabled:opacity-50`}
                >
                  <i className={`fa-solid ${
                    systemState.serverOnline && !systemState.maintenanceMode ? 'fa-power-off' : 'fa-play'
                  }`} />
                  <span>
                    {systemState.serverOnline && !systemState.maintenanceMode
                      ? 'បិទ Server (ដាក់ Maintenance ឥឡូវ)'
                      : 'បើកដំណើរការ Server ឡើងវិញ'}
                  </span>
                </button>
              </div>

              {/* Maintenance Notice Editor */}
              <form onSubmit={handleSaveMaintenanceConfig} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    សារជូនដំណឹងពេលថែទាំ Server (បង្ហាញលើផ្ទាំង Chat របស់សិស្ស)
                  </label>
                  <textarea
                    rows={3}
                    value={editMaintenanceReason}
                    onChange={(e) => setEditMaintenanceReason(e.target.value)}
                    placeholder="បញ្ចូលសារពន្យល់ពីការថែទាំ..."
                    className="w-full px-4 py-3 bg-slate-950/80 border border-slate-700/80 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-sans"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    សារនេះនឹងបង្ហាញប្រាប់សិស្ស SETEC ពេលពួកគេព្យាយាមចូលលេងកំឡុងពេលថែទាំ។
                  </p>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-2"
                  >
                    <i className="fa-solid fa-floppy-disk" />
                    <span>រក្សាទុកសារថែទាំ</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Right 1 Col: Quick Control & Diagnostic Panel */}
            <div className="space-y-6">
              {/* Emergency Cache & Rate Limit Flush */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <i className="fa-solid fa-rotate-left text-amber-400" />
                  <span>សម្អាត Cooldown &amp; Bans</span>
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  ប្រសិនបើសិស្សបុកមកលេងច្រើន ហើយជាប់ Lockout 30 នាទី ឬចៃដន្យជាប់ Rate Limit អ្នកអាច Flush សម្អាតចោលភ្លាមៗ។
                </p>

                <button
                  type="button"
                  onClick={handleFlushRateLimits}
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-800/80 text-xs font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-trash-can" />
                  <span>សម្អាត Session Locks &amp; Cooldown ទាំងអស់</span>
                </button>
              </div>

              {/* System Architecture Diagnostic */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <i className="fa-solid fa-gauge-high text-indigo-400" />
                  <span>ព័ត៌មានបច្ចេកទេស Gateway</span>
                </h3>

                <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Cloud Provider</span>
                  <span className="text-slate-200 font-medium">Vercel Serverless Edge</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Database Engine</span>
                  <span className="text-slate-200 font-medium">Firebase RTDB (Singapore)</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">AI Model Protocol</span>
                  <span className="text-slate-200 font-medium">Gemini 3.5 / 3.8 Flash Fallback</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1.5">
                  <span className="text-slate-400">ការធ្វើបច្ចុប្បន្នភាពចុងក្រោយ</span>
                  <span className="text-slate-200 font-medium font-mono">
                    {systemState.lastUpdated ? new Date(systemState.lastUpdated).toLocaleTimeString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: NIGHT REST SCHEDULE */}
        {activeTab === 'schedule' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-start justify-between gap-4 mb-6 pb-5 border-b border-slate-800">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <i className="fa-solid fa-moon text-indigo-400" />
                    <span>កាលវិភាគសម្រាកពេលយប់ (Automated Night Rest)</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    កំណត់ម៉ោងឱ្យ Server និងកូតា AI សម្រាកស្វ័យប្រវត្តិកំឡុងពេលយប់ ដើម្បីកុំឱ្យសិស្សលេងអស់ Quota ឬរំខាន
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleToggleNightSchedule}
                  disabled={isSubmitting}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                    systemState.nightScheduleEnabled
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  <i className={`fa-solid ${systemState.nightScheduleEnabled ? 'fa-toggle-on' : 'fa-toggle-off'}`} />
                  <span>{systemState.nightScheduleEnabled ? 'កាលវិភាគ: បើក' : 'កាលវិភាគ: ផ្អាក'}</span>
                </button>
              </div>

              {/* Schedule Form */}
              <form onSubmit={handleSaveScheduleConfig} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      ម៉ោងចាប់ផ្ដើមសម្រាក (Phnom Penh Hour)
                    </label>
                    <select
                      value={editNightStart}
                      onChange={(e) => setEditNightStart(parseInt(e.target.value, 10))}
                      className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                    >
                      {[...Array(24).keys()].map((h) => (
                        <option key={h} value={h}>
                          {String(h).padStart(2, '0')}:00 {h >= 12 ? 'ល្ងាច/យប់ (PM)' : 'ព្រឹក (AM)'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      ម៉ោងបញ្ចប់ការសម្រាក (Phnom Penh Hour)
                    </label>
                    <select
                      value={editNightEnd}
                      onChange={(e) => setEditNightEnd(parseInt(e.target.value, 10))}
                      className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                    >
                      {[...Array(24).keys()].map((h) => (
                        <option key={h} value={h}>
                          {String(h).padStart(2, '0')}:00 {h >= 12 ? 'រសៀល/យប់ (PM)' : 'ព្រឹក (AM)'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    សារពន្យល់ពេលយប់ (បង្ហាញដល់សិស្សកំឡុងពេលសម្រាក)
                  </label>
                  <textarea
                    rows={3}
                    value={editNightMessage}
                    onChange={(e) => setEditNightMessage(e.target.value)}
                    placeholder="បញ្ចូលសារពន្យល់ពេលយប់..."
                    className="w-full px-4 py-3 bg-slate-950/80 border border-slate-700/80 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-sans"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
                  >
                    <i className="fa-solid fa-floppy-disk" />
                    <span>រក្សាទុកកាលវិភាគ</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Schedule Details Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-circle-info text-indigo-400" />
                <span>របៀបដំណើរការកាលវិភាគ</span>
              </h3>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2 text-indigo-300 font-semibold">
                  <i className="fa-solid fa-bell" />
                  <span>ស្វ័យប្រវត្តិនឹងបិទចរាចរណ៍សាធារណៈ</span>
                </div>
                <p className="text-slate-400">
                  នៅពេលម៉ោងក្នុងប្រទេសកម្ពុជាឈានចូលដល់ {String(systemState.nightStartHour ?? 23).padStart(2, '0')}:00 ប្រព័ន្ធនឹងដាក់ AI ឱ្យសម្រាកគេងរហូតដល់ម៉ោង {String(systemState.nightEndHour ?? 6).padStart(2, '0')}:00 ព្រឹក។
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                  <i className="fa-solid fa-shield-check" />
                  <span>Rotana NOB Bypass 100%</span>
                </div>
                <p className="text-slate-400">
                  ទោះបីជាស្ថិតក្នុងម៉ោងសម្រាកពេលយប់ក៏ដោយ ក៏ Creator Rotana NOB នៅតែអាចចូល Chat និង Debugging បានជាធម្មតាដោយស្វ័យប្រវត្តិ។
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BOTS & SESSION LIMITS */}
        {activeTab === 'bots' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* KonBong Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-950 border border-indigo-700/60 text-indigo-400 flex items-center justify-center text-xl">
                    <i className="fa-solid fa-robot" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">បងកូនច្បង (KonBong)</h3>
                    <p className="text-xs text-slate-400">Male AI Troll Specialist &bull; Voice Puck</p>
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  systemState.konbongActive
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {systemState.konbongActive ? 'ACTIVE' : 'DISABLED'}
                </span>
              </div>

              <p className="text-xs text-slate-400 mb-6">
                នៅពេលបិទបងកូនច្បង សិស្សដែលចូលទៅកាន់ /KonBong នឹងត្រូវបានណែនាំឱ្យទៅលេងជាមួយចែកូនពៅវិញ។
              </p>

              <button
                type="button"
                onClick={handleToggleKonBong}
                disabled={isSubmitting}
                className={`w-full py-3 rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition-all ${
                  systemState.konbongActive
                    ? 'bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/80'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                }`}
              >
                <i className={`fa-solid ${systemState.konbongActive ? 'fa-pause' : 'fa-play'}`} />
                <span>{systemState.konbongActive ? 'ផ្អាកបងកូនច្បង (Deactivate)' : 'បើកបងកូនច្បងឡើងវិញ (Activate)'}</span>
              </button>
            </div>

            {/* KonPov Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-pink-950 border border-pink-700/60 text-pink-400 flex items-center justify-center text-xl">
                    <i className="fa-solid fa-robot" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">ចែកូនពៅ (KonPov)</h3>
                    <p className="text-xs text-slate-400">Female AI Troll Specialist &bull; Voice Aoede</p>
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  systemState.konpovActive
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {systemState.konpovActive ? 'ACTIVE' : 'DISABLED'}
                </span>
              </div>

              <p className="text-xs text-slate-400 mb-6">
                នៅពេលបិទចែកូនពៅ សិស្សដែលចូលទៅកាន់ /KonPov នឹងត្រូវបានណែនាំឱ្យទៅលេងជាមួយបងកូនច្បងវិញ។
              </p>

              <button
                type="button"
                onClick={handleToggleKonPov}
                disabled={isSubmitting}
                className={`w-full py-3 rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition-all ${
                  systemState.konpovActive
                    ? 'bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/80'
                    : 'bg-pink-600 hover:bg-pink-500 text-white shadow-lg shadow-pink-600/30'
                }`}
              >
                <i className={`fa-solid ${systemState.konpovActive ? 'fa-pause' : 'fa-play'}`} />
                <span>{systemState.konpovActive ? 'ផ្អាកចែកូនពៅ (Deactivate)' : 'បើកចែកូនពៅឡើងវិញ (Activate)'}</span>
              </button>
            </div>

            {/* 30-Minute Session Limiter Card */}
            <div className="md:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold text-white">ប្រព័ន្ធកំណត់ពេល 30 នាទីក្នុង 1 លើក (Session Limiter)</h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    systemState.sessionLimitActive ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {systemState.sessionLimitActive ? 'ENFORCED' : 'OFF (UNLIMITED)'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 max-w-xl">
                  ប្រសិនបើបើក: សិស្សលេងបានត្រឹម 30 នាទីក្នុង 1 លើក រួចត្រូវសម្រាក 10 នាទីដើម្បីចែកវេនគ្នា។ ប្រសិនបើបិទ: សិស្សអាច Chat បានដោយសេរីគ្មានដែនកំណត់ពេលវេលា។
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleSessionLimit}
                disabled={isSubmitting}
                className={`px-5 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                  systemState.sessionLimitActive
                    ? 'bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                }`}
              >
                <i className={`fa-solid ${systemState.sessionLimitActive ? 'fa-lock' : 'fa-lock-open'}`} />
                <span>{systemState.sessionLimitActive ? 'បិទការកំណត់ពេល (Allow Unlimited)' : 'បើកការកំណត់ពេល 30 នាទី'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: BROADCAST ANNOUNCEMENT */}
        {activeTab === 'broadcast' && (
          <div className="max-w-3xl bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="mb-6 pb-5 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-bullhorn text-indigo-400" />
                <span>ផ្សាយសារដំណឹងបន្ទាន់ទៅកាន់សិស្សទាំងអស់ (Live Broadcast Banner)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                សារនេះនឹងបង្ហាញលើកំពូលអេក្រង់ Chat របស់សិស្សទាំងអស់ក្នុងពេល Real-time ភ្លាមៗ
              </p>
            </div>

            <form onSubmit={handleSaveBroadcast} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  ខ្លឹមសារនៃសារផ្សាយដំណឹង
                </label>
                <input
                  type="text"
                  value={editBroadcastNotice}
                  onChange={(e) => setEditBroadcastNotice(e.target.value)}
                  placeholder="ឧទាហរណ៍: Server នឹង Update ក្នុងរយៈពេល ១០ នាទីទៀត..."
                  className="w-full px-4 py-3 bg-slate-950/80 border border-slate-700/80 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  ទុកប្រអប់នេះឱ្យនៅទទេ រួចចុច Save ប្រសិនបើអ្នកចង់បិទ ឬលុបសារផ្សាយដំណឹងនេះចេញវិញ។
                </p>
              </div>

              {/* Preview */}
              {editBroadcastNotice.trim() && (
                <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-700/40 text-indigo-200 text-xs flex items-center gap-2">
                  <i className="fa-solid fa-bullhorn text-indigo-400" />
                  <span className="font-semibold">គំរូ Preview:</span>
                  <span>{editBroadcastNotice.trim()}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                {editBroadcastNotice.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditBroadcastNotice('');
                      sendUpdate({ broadcastNotice: '' }, 'លុបសារផ្សាយដំណឹងបន្ទាន់');
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1.5"
                  >
                    <i className="fa-solid fa-trash-can" />
                    <span>លុបសារផ្សាយចេញ</span>
                  </button>
                )}

                <div className="ml-auto">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
                  >
                    <i className="fa-solid fa-paper-plane" />
                    <span>ផ្សាយដំណឹងឥឡូវនេះ</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
        SETEC Neural Core &bull; Supreme Master Command &bull; Engineered by Rotana NOB &bull; {new Date().getFullYear()}
      </footer>
    </main>
  );
}
