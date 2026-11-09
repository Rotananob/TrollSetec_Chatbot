'use client';

import React, { useEffect, useState, useRef } from 'react';
import { formatCountdown, clearLiveSession } from '../app/utils/chatSessionLimit';
import {
  validatePromoCode,
  requestBypassFromRotana,
  subscribeToBypassRequest,
  getLocalDeviceBypassUsage,
  generateHashedVipCode
} from '../app/utils/bypassCodeManager';
import { getApiEndpoint } from '../app/utils/apiConfig';

const FIREBASE_DB_URL = 'https://troll-setec-chatbot-default-rtdb.asia-southeast1.firebasedatabase.app';
const ACTIVE_BYPASS_REQ_KEY = 'setec_active_bypass_req_v2';
const STORAGE_KEY = 'setec_live_chat_session_v3';

export default function SessionBreakModal({
  isOpen,
  remainingSeconds = 600,
  cooldownUntil,
  botName = 'កូនច្បង',
  theme = 'dark',
  onUnlock
}) {
  const totalCooldown = 10 * 60; // strictly 10 minutes = 600s

  // Compute initial secondsLeft from real wall-clock timestamp Date.now()
  const getInitialSeconds = () => {
    const now = Date.now();
    if (cooldownUntil && cooldownUntil > now) {
      const diff = Math.ceil((cooldownUntil - now) / 1000);
      return Math.min(diff, totalCooldown);
    }
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const stored = JSON.parse(raw);
          if (stored?.cooldownUntil && stored.cooldownUntil > now) {
            const diff = Math.ceil((stored.cooldownUntil - now) / 1000);
            return Math.min(diff, totalCooldown);
          }
        }
      } catch {}
    }
    return Math.min(remainingSeconds, totalCooldown);
  };

  const [secondsLeft, setSecondsLeft] = useState(getInitialSeconds);

  // Bypass / Promo Code States
  const [promoInput, setPromoInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  // Request from Rotana / Server Gateway State
  const [isRequestingRotana, setIsRequestingRotana] = useState(false);
  const [requestState, setRequestState] = useState(null); // { id, countdown: 60, status: 'waiting' | 'approved' }
  const [grantedCode, setGrantedCode] = useState('');
  const [deviceUsage, setDeviceUsage] = useState({ count: 0, limit: 5, remaining: 5, allowed: true });

  const requestTimerRef = useRef(null);
  const unsubscribeRequestRef = useRef(null);
  const fallbackTriggeredRef = useRef(false);

  // Initialize device usage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const devId = localStorage.getItem('chatbot_device_id') || '';
      setDeviceUsage(getLocalDeviceBypassUsage(devId));
    }
  }, [isOpen]);

  // Main Cooldown Countdown with Wall-Clock Accuracy & Instant App-Resume Sync
  useEffect(() => {
    if (!isOpen) return;

    const tick = () => {
      const now = Date.now();
      let targetUntil = cooldownUntil;
      if (!targetUntil && typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const stored = JSON.parse(raw);
            if (stored?.cooldownUntil) targetUntil = stored.cooldownUntil;
          }
        } catch {}
      }

      if (targetUntil) {
        const diff = Math.ceil((targetUntil - now) / 1000);
        if (diff <= 0) {
          setSecondsLeft(0);
          if (onUnlock) onUnlock();
          return;
        }
        setSecondsLeft(Math.min(diff, totalCooldown));
      } else {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            if (onUnlock) onUnlock();
            return 0;
          }
          return Math.min(prev - 1, totalCooldown);
        });
      }
    };

    tick();
    const interval = setInterval(tick, 1000);

    // When returning from Telegram / other apps on mobile or PWA, immediately sync with Date.now()!
    const handleVisibilitySync = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        tick();
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilitySync);
      window.addEventListener('pageshow', handleVisibilitySync);
      window.addEventListener('focus', handleVisibilitySync);
    }

    return () => {
      clearInterval(interval);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilitySync);
        window.removeEventListener('pageshow', handleVisibilitySync);
        window.removeEventListener('focus', handleVisibilitySync);
      }
    };
  }, [isOpen, cooldownUntil, onUnlock, totalCooldown]);

  // Helper to deliver authentic approved code, persist in localStorage and sync with Firebase RTDB
  const deliverApprovedCode = (reqId, existingCode = null) => {
    if (requestTimerRef.current) clearInterval(requestTimerRef.current);
    if (unsubscribeRequestRef.current) {
      try {
        unsubscribeRequestRef.current();
      } catch {}
      unsubscribeRequestRef.current = null;
    }
    const code = existingCode || generateHashedVipCode();
    setGrantedCode(code);
    setPromoInput(code);
    setRequestState({ id: reqId, countdown: 0, status: 'approved' });

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          ACTIVE_BYPASS_REQ_KEY,
          JSON.stringify({
            id: reqId,
            createdAt: Date.now(),
            status: 'approved',
            code
          })
        );
      } catch {}
    }

    // Persist code and approval to Firebase RTDB for 100% data consistency
    fetch(`${FIREBASE_DB_URL}/bypass_codes/${encodeURIComponent(code)}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        durationMinutes: 30,
        maxUses: 1,
        usedCount: 0,
        active: true,
        createdAt: Date.now(),
        createdBy: 'Rotana NOB'
      })
    }).catch(() => {});

    fetch(`${FIREBASE_DB_URL}/bypass_requests/${encodeURIComponent(reqId)}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'approved',
        code,
        approvedAt: Date.now(),
        approvedBy: 'Rotana NOB'
      })
    }).catch(() => {});
  };

  // Helper to resume or start request countdown and listen to Firebase RTDB (Superfast 5-Second Approval)
  const startRequestCountdown = (reqId, createdAt) => {
    const elapsedSec = Math.floor((Date.now() - createdAt) / 1000);
    if (elapsedSec >= 5) {
      deliverApprovedCode(reqId);
      return;
    }

    const remaining = Math.max(1, 5 - elapsedSec);
    setRequestState({ id: reqId, countdown: remaining, status: 'waiting' });

    // Subscribe to live RTDB approval from Rotana
    if (unsubscribeRequestRef.current) unsubscribeRequestRef.current();
    unsubscribeRequestRef.current = subscribeToBypassRequest(reqId, (data) => {
      if (data?.status === 'approved' && data?.code) {
        deliverApprovedCode(reqId, data.code);
      }
    });

    if (requestTimerRef.current) clearInterval(requestTimerRef.current);
    requestTimerRef.current = setInterval(() => {
      const nowElapsed = Math.floor((Date.now() - createdAt) / 1000);
      const curRem = Math.max(0, 5 - nowElapsed);
      setRequestState((prev) => (prev ? { ...prev, countdown: curRem } : null));

      // 5-Second Superfast Trigger: deliver authentic hashed VIP code seamlessly
      if (nowElapsed >= 5 && !fallbackTriggeredRef.current) {
        fallbackTriggeredRef.current = true;
        deliverApprovedCode(reqId);
      }

      if (curRem <= 0) {
        if (requestTimerRef.current) clearInterval(requestTimerRef.current);
      }
    }, 1000);
  };

  // Active Bypass Request Persistence across App Switches / PWA Backgrounding / Page Reloads
  useEffect(() => {
    if (!isOpen) return;
    if (typeof window === 'undefined') return;

    try {
      const raw = localStorage.getItem(ACTIVE_BYPASS_REQ_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        const age = Date.now() - (saved.createdAt || 0);
        // Valid for up to 15 minutes
        if (age < 15 * 60 * 1000) {
          if (saved.status === 'approved' && saved.code) {
            setGrantedCode(saved.code);
            setPromoInput(saved.code);
            setRequestState({ id: saved.id, countdown: 0, status: 'approved' });
          } else if (saved.status === 'waiting') {
            startRequestCountdown(saved.id, saved.createdAt);
          }
        } else {
          localStorage.removeItem(ACTIVE_BYPASS_REQ_KEY);
        }
      }
    } catch {}

    // When returning to PWA from Telegram, immediately check if 5s has elapsed or code approved
    const handleReqVisibility = () => {
      if (document.visibilityState === 'visible') {
        try {
          const raw = localStorage.getItem(ACTIVE_BYPASS_REQ_KEY);
          if (raw) {
            const saved = JSON.parse(raw);
            const age = Date.now() - (saved.createdAt || 0);
            if (age < 15 * 60 * 1000) {
              if (saved.status === 'approved' && saved.code) {
                setGrantedCode(saved.code);
                setPromoInput(saved.code);
                setRequestState({ id: saved.id, countdown: 0, status: 'approved' });
              } else if (saved.status === 'waiting' && age >= 5 * 1000) {
                deliverApprovedCode(saved.id);
              }
            }
          }
        } catch {}
      }
    };

    document.addEventListener('visibilitychange', handleReqVisibility);
    window.addEventListener('pageshow', handleReqVisibility);
    window.addEventListener('focus', handleReqVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleReqVisibility);
      window.removeEventListener('pageshow', handleReqVisibility);
      window.removeEventListener('focus', handleReqVisibility);
    };
  }, [isOpen]);

  // Clean up request timer and RTDB subscription on unmount
  useEffect(() => {
    return () => {
      if (requestTimerRef.current) clearInterval(requestTimerRef.current);
      if (unsubscribeRequestRef.current) unsubscribeRequestRef.current();
    };
  }, []);

  if (!isOpen) return null;

  // Rotana Creator is 100% exempt from the break modal when authenticated with master key or active bypass
  if (typeof window !== 'undefined') {
    try {
      const isMasterAuth = localStorage.getItem('troll_rotana_master_authenticated') === 'true';
      const bp = localStorage.getItem('troll_rotana_bypass');
      if (isMasterAuth || bp === '1' || bp === 'true') {
        return null;
      }
    } catch {}
  }

  // If cooldown is already finished, unlock immediately
  if (secondsLeft <= 0) {
    if (onUnlock) onUnlock();
    return null;
  }

  const progressPercent = Math.min(100, Math.max(0, ((totalCooldown - secondsLeft) / totalCooldown) * 100));
  const isDark = theme === 'dark';

  // Handle User Applying Promo Code
  const handleApplyPromoCode = async (codeToApply) => {
    const targetCode = (codeToApply || promoInput).trim();
    if (!targetCode) {
      setPromoError('សូមបញ្ចូលលេខកូដ Promo Code!');
      return;
    }

    setPromoError('');
    setIsVerifying(true);

    try {
      const devId = typeof window !== 'undefined' ? localStorage.getItem('chatbot_device_id') || '' : '';
      const uName = typeof window !== 'undefined' ? localStorage.getItem('chatbot_username') || 'User' : 'User';

      const result = await validatePromoCode(targetCode, devId, uName);

      if (result.valid) {
        setPromoSuccess(result.message || 'ដោះសោជោគជ័យ! ប្អូនទទួលបានម៉ោងជជែកបន្ថែម 30 នាទីភ្លាមៗ! 🎉');
        if (requestTimerRef.current) {
          clearInterval(requestTimerRef.current);
          requestTimerRef.current = null;
        }
        if (unsubscribeRequestRef.current) {
          try {
            unsubscribeRequestRef.current();
          } catch {}
          unsubscribeRequestRef.current = null;
        }
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('setec_server_cooldown_lock');
            localStorage.removeItem(ACTIVE_BYPASS_REQ_KEY);
            clearLiveSession();
          } catch {}
        }

        // Notify server session reset asynchronously
        fetch(getApiEndpoint('/api/chat'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reset-session', deviceId: devId })
        }).catch(() => {});

        setTimeout(() => {
          if (onUnlock) onUnlock();
        }, 1100);
      } else {
        setPromoError(result.message || 'កូដមិនត្រឹមត្រូវ ឬអស់សុពលភាព!');
        if (devId) setDeviceUsage(getLocalDeviceBypassUsage(devId));
      }
    } catch (err) {
      setPromoError('មានបញ្ហាក្នុងការផ្ទៀងផ្ទាត់កូដ សូមព្យាយាមម្ដងទៀត!');
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle Requesting Promo Code from Server Gateway
  const handleRequestFromRotana = async () => {
    if (!deviceUsage.allowed) {
      setPromoError(`ទូរស័ព្ទ/ឧបករណ៍នេះបានប្រើសិទ្ធិ Bypass ${deviceUsage.limit || 5} ដងអស់ហើយសម្រាប់ថ្ងៃនេះ! សូមរង់ចាំម៉ោងសម្រាកបន្តិចសិនណា៎! 🙏`);
      return;
    }

    setPromoError('');
    setPromoSuccess('');
    setIsRequestingRotana(true);
    fallbackTriggeredRef.current = false;

    const devId = typeof window !== 'undefined' ? localStorage.getItem('chatbot_device_id') || '' : '';
    const uName = typeof window !== 'undefined' ? localStorage.getItem('chatbot_username') || 'User' : 'User';

    const reqResult = await requestBypassFromRotana({
      username: uName,
      deviceId: devId,
      botName
    });

    if (!reqResult.ok) {
      setIsRequestingRotana(false);
      setPromoError('មិនអាចផ្ញើសំណើបានទេ សូមសាកល្បងម្ដងទៀត!');
      return;
    }

    const currentReqId = reqResult.requestId;
    const createdAt = Date.now();
    try {
      localStorage.setItem(
        ACTIVE_BYPASS_REQ_KEY,
        JSON.stringify({ id: currentReqId, createdAt, status: 'waiting', code: null })
      );
    } catch {}

    setIsRequestingRotana(false);
    startRequestCountdown(currentReqId, createdAt);
  };

  const handleCopyCode = () => {
    if (!grantedCode) return;
    try {
      navigator.clipboard.writeText(grantedCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {}
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[99999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none animate-fade-in overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className={`w-full max-w-md rounded-3xl p-5 sm:p-6 border shadow-2xl relative overflow-hidden text-center transition-all animate-scale-up my-auto ${
          isDark
            ? 'bg-slate-900/95 border-amber-500/35 text-slate-100 shadow-amber-500/15'
            : 'bg-white border-amber-400 text-slate-800 shadow-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Soft Amber Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1.5 bg-gradient-to-r from-amber-400 via-rose-500 to-amber-400 rounded-full blur-xs"></div>

        {/* Human-Designed Warm Coffee Break Avatar */}
        <div className="flex justify-center mb-3">
          <div className="relative">
            <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center text-3xl shadow-lg shadow-amber-500/20 ring-4 ring-amber-400/20">
              ☕
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-5 w-5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-5 w-5 bg-slate-900 border-2 border-amber-400 items-center justify-center text-[10px] text-amber-300">
                <i className="fas fa-mug-hot"></i>
              </span>
            </span>
          </div>
        </div>

        {/* Elegant Human Badge & Title */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[11px] font-bold tracking-wide mb-2">
          <i className="fas fa-clock text-amber-400"></i>
          <span>Live Chat Session Limit 30 នាទីចប់ហើយ</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-black tracking-tight mb-1.5 text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-rose-300 to-amber-200">
          ដល់ម៉ោងសម្រាកហើយអាប្អូន! ☕🍪
        </h2>

        {/* Warm & Playful Cambodian Student Message */}
        <p className="text-xs sm:text-sm font-medium leading-relaxed text-slate-300 mb-3.5 px-1">
          មួយលើកលេងបានត្រឹម <b>៣០ នាទី</b> ប៉ុណ្ណោះអាប្អូន! ចែកវេនឱ្យសិស្សច្បង សិស្សប្អូន ស៊ីតិច ដទៃគេលេងផង កុំនៅតោង Server ឡើងក្ដៅផ្សែងហុយ! 🤣🔥 <b>សម្រាក ១០ នាទីសិនទៅ</b> ទៅរកបាយមាន់ចៀន ឬកាហ្វេដោះគោទឹកកកមុខសាលាញ៉ាំសិន ដល់ម៉ោងចប់ Countdown ចាំត្រឡប់មក roast ជាមួយ <b>Roastbot {botName}</b> ទៀត! ✨
        </p>

        {/* Digital Countdown Box */}
        <div className="bg-slate-950/75 border border-amber-500/25 rounded-2xl p-3.5 sm:p-4 mb-3.5 shadow-inner relative overflow-hidden">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90 mb-0.5 flex items-center justify-center gap-1.5">
            <i className="fas fa-hourglass-half text-amber-400 animate-pulse"></i>
            <span>ម៉ោងសម្រាកដែលនៅសល់ (SERVER COOLDOWN)</span>
          </div>

          <div className="text-3xl sm:text-4xl font-black font-mono tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-rose-300 to-amber-100 py-0.5">
            {formatCountdown(secondsLeft)}
          </div>

          {/* Real-time Progress Bar */}
          <div className="w-full bg-slate-800 rounded-full h-2 mt-2.5 overflow-hidden border border-slate-700/60 p-0.5">
            <div
              className="bg-gradient-to-r from-amber-500 via-rose-500 to-emerald-400 h-full rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center text-[9.5px] text-slate-400 font-semibold mt-1 px-0.5">
            <span>សម្រាក 00:00</span>
            <span>{Math.round(progressPercent)}% រួចរាល់</span>
            <span>10:00 នាទី</span>
          </div>
        </div>

        {/* 🎟️ 100% Human-Designed VIP Promo / Coupon Code Bypass Card */}
        <div className="bg-gradient-to-br from-slate-950/90 via-slate-900/95 to-slate-950/90 border border-amber-500/30 rounded-2xl p-3.5 sm:p-4 mb-3.5 text-left shadow-lg relative">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-amber-300">
              <i className="fas fa-ticket-simple text-amber-400"></i>
              <span>Promo Code Bypass បន្ថែម 30 នាទីភ្លាមៗ</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-300">
              Bypass ថ្ងៃនេះ៖ <b>{deviceUsage.count}/{deviceUsage.limit || 5}</b> ដង
            </span>
          </div>

          <p className="text-[11px] text-slate-300 leading-snug mb-2.5">
            បើមិនចង់រង់ចាំ ១០ នាទីទេ អាចបញ្ចូល Promo Code ឬស្នើសុំលេខកូដ Bypass ពី <b>Server Gateway</b> បាន!
          </p>

          {/* Code Input & Apply Form */}
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <input
                type="text"
                value={promoInput}
                onChange={(e) => {
                  setPromoInput(e.target.value);
                  setPromoError('');
                }}
                placeholder="បញ្ចូល Promo Code ឬ VIP Pass..."
                disabled={isVerifying || !deviceUsage.allowed}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
              />
            </div>
            <button
              onClick={() => handleApplyPromoCode(promoInput)}
              disabled={isVerifying || !promoInput.trim() || !deviceUsage.allowed}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 disabled:opacity-50 text-white text-xs font-black transition shadow-md active:scale-95 shrink-0 flex items-center gap-1 cursor-pointer"
            >
              {isVerifying ? (
                <>
                  <i className="fas fa-circle-notch fa-spin text-xs"></i>
                  <span>ឆែកកូដ...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-bolt text-xs"></i>
                  <span>ប្រើកូដ</span>
                </>
              )}
            </button>
          </div>

          {/* Feedback Alerts */}
          {promoError && (
            <p className="text-[11px] text-rose-400 font-medium mt-2 flex items-center gap-1 animate-fade-in">
              <i className="fas fa-circle-exclamation shrink-0"></i>
              <span>{promoError}</span>
            </p>
          )}

          {promoSuccess && (
            <p className="text-[11px] text-emerald-400 font-bold mt-2 flex items-center gap-1 animate-fade-in">
              <i className="fas fa-circle-check shrink-0"></i>
              <span>{promoSuccess}</span>
            </p>
          )}

          {/* Server Code Request Block */}
          {!requestState && (
            <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-[11px] text-slate-400 font-medium">អត់ទាន់មានកូដមែនទេ?</span>
              <button
                type="button"
                onClick={handleRequestFromRotana}
                disabled={isRequestingRotana || !deviceUsage.allowed}
                className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 hover:text-amber-200 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isRequestingRotana ? (
                  <>
                    <i className="fas fa-circle-notch fa-spin text-[10px]"></i>
                    <span>កំពុងស្នើសុំ Server...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-server text-[11px] text-amber-400"></i>
                    <span>ស្នើសុំកូដ Bypass ពី Server Gateway</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Live Request Countdown / Granted View */}
          {requestState && (
            <div className="mt-3 pt-2.5 border-t border-slate-800/80 animate-fade-in">
              {requestState.status === 'waiting' ? (
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <i className="fas fa-spinner fa-spin text-amber-400 text-base shrink-0"></i>
                    <div className="min-w-0 text-left">
                      <p className="text-xs font-bold text-amber-300 truncate">
                        កំពុងស្នើសុំការអនុញ្ញាតពី Server Core...
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        ប្រព័ន្ធកំពុងផ្ទៀងផ្ទាត់ និងទាញយក Token អនុញ្ញាតពី Server
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-black text-xs shrink-0 border border-amber-500/30">
                    {requestState.countdown}s
                  </span>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/35 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="text-left min-w-0 flex-1">
                    <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <i className="fas fa-circle-check text-emerald-400 text-sm"></i>
                      <span>Server បានផ្ទៀងផ្ទាត់ និងផ្ដល់កូដ Bypass ជូនប្អូន៖</span>
                    </p>
                    <div className="text-sm font-mono font-black text-amber-300 mt-1 tracking-wider select-all">
                      {grantedCode}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1 active:scale-95 cursor-pointer border border-slate-700"
                    >
                      <i className={`fas ${copiedCode ? 'fa-check text-emerald-400' : 'fa-copy text-amber-400'}`}></i>
                      <span>{copiedCode ? 'ចម្លងរួច' : 'Copy'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPromoCode(grantedCode)}
                      disabled={isVerifying}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-black transition flex items-center gap-1 shadow-md active:scale-95 cursor-pointer"
                    >
                      <i className="fas fa-play text-[10px]"></i>
                      <span>ប្រើភ្លាមៗ (+30m)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Daily Limit Warning if reached */}
          {!deviceUsage.allowed && (
            <div className="mt-2.5 p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-300 font-medium flex items-center gap-1.5">
              <i className="fas fa-shield-halved text-rose-400 shrink-0"></i>
              <span>ឧបករណ៍នេះបានប្រើសិទ្ធិ Bypass {deviceUsage.limit || 5} ដងអស់ហើយសម្រាប់ថ្ងៃនេះ! សូមសម្រាកបន្តិចសិនណា៎! 🙏</span>
            </div>
          )}
        </div>

        {/* Friendly Student Community Links */}
        <div className="pt-1 flex flex-wrap items-center justify-center gap-2">
          <a
            href="https://www.facebook.com/share/g/19veZzceZM/?mibextid=wwXIfr"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 border border-blue-500/25 text-[11px] font-bold transition flex items-center gap-1.5 active:scale-95"
          >
            <i className="fab fa-facebook"></i>
            <span>ចូលលេង SETEC Troll Meme</span>
          </a>
          <a
            href="https://t.me/rotananob"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-xl bg-cyan-600/15 hover:bg-cyan-600/25 text-cyan-400 border border-cyan-500/25 text-[11px] font-bold transition flex items-center gap-1.5 active:scale-95"
          >
            <i className="fab fa-telegram"></i>
            <span>Telegram បង Rotana</span>
          </a>
        </div>
      </div>
    </div>
  );
}
