'use client';

import React, { useState, useEffect } from 'react';
import { getApiEndpoint } from '../app/utils/apiConfig';
import { initLiveSessionOnDatabase } from '../app/utils/realtimeChat';

export default function ErrorReportModal({
  isOpen,
  onClose,
  defaultUsername = '',
  bot = 'Chatbot',
  initialIssue = '',
  isDark = true,
  sessionId = '',
  recentMessages = [],
  onLiveSessionStarted = null
}) {
  const [name, setName] = useState('');
  const [issue, setIssue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [countdown, setCountdown] = useState(180);

  useEffect(() => {
    if (isOpen) {
      setName(defaultUsername || localStorage.getItem('chatbot_username') || 'User');
      setIssue(initialIssue || '');
      setSentSuccess(false);
      setIsSending(false);
      setCountdown(180);
    }
  }, [isOpen, defaultUsername, initialIssue]);

  useEffect(() => {
    let timer = null;
    if (sentSuccess && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            if (onClose) onClose();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [sentSuccess, countdown, onClose]);

  if (!isOpen) return null;

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim() || 'User';
    const trimmedIssue = issue.trim();

    if (!trimmedIssue) {
      alert('សូមសរសេររៀបរាប់ពីបញ្ហាខ្លីៗជាមុនសិន!');
      return;
    }

    setIsSending(true);

    try {
      const activeSessionId = sessionId || 'session_' + Date.now();
      const botKey = (bot || 'konpov').toLowerCase().includes('bong') ? 'konbong' : 'konpov';

      // 1. Initialize live session in Firebase Realtime Database
      await initLiveSessionOnDatabase(activeSessionId, {
        username: trimmedName,
        bot: botKey,
        issue: trimmedIssue,
        messages: recentMessages || []
      }).catch((err) => console.warn('[Realtime] DB init error:', err));

      // 2. Send Telegram alert with Server-Generated Direct Bypass Button to Rotana NOB
      const endpoint = getApiEndpoint('/api/track');
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'user_report_issue',
          username: trimmedName,
          issue: trimmedIssue,
          bot: botKey,
          sessionId: activeSessionId
        })
      });

      if (onLiveSessionStarted) {
        onLiveSessionStarted({ sessionId: activeSessionId });
      }

      setSentSuccess(true);
    } catch {
      alert('មិនអាចបញ្ជូនបានទេ សូមសាកល្បងម្ដងទៀត!');
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in font-['Kantumruy_Pro',sans-serif]">
      <div
        className={`w-full max-w-md rounded-3xl p-6 shadow-2xl border transition-all relative overflow-hidden ${
          isDark
            ? 'bg-slate-900 border-violet-500/30 text-white shadow-[0_20px_60px_rgba(139,92,246,0.2)]'
            : 'bg-white border-violet-200 text-slate-800 shadow-2xl'
        }`}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer ${
            isDark
              ? 'text-slate-400 hover:text-white hover:bg-slate-800'
              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
          }`}
          title="បិទ"
        >
          <i className="fas fa-times text-sm"></i>
        </button>

        {sentSuccess ? (
          <div className="text-center py-5 animate-fade-in">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl animate-pulse">
              <i className="fas fa-paper-plane"></i>
            </div>
            <h3 className="text-base sm:text-lg font-black mb-1.5 text-emerald-400">
              បានបញ្ជូន Alert ទៅកាន់ Rotana NOB រួចរាល់!
            </h3>
            
            {/* 180s Realtime Countdown Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400 font-black text-sm my-2 shadow-xs">
              <i className="fas fa-stopwatch animate-spin text-xs"></i>
              <span>{formatCountdown(countdown)}</span>
              <span className="text-[10px] font-bold opacity-80">នៅសល់ {countdown} វិនាទី</span>
            </div>

            <div className={`text-xs leading-relaxed max-w-sm mx-auto p-3.5 rounded-2xl mb-4 border text-left space-y-1.5 ${
              isDark ? 'bg-slate-950/80 border-emerald-500/30 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-950'
            }`}>
              <p className="font-bold flex items-center gap-1.5">
                <i className="fas fa-circle-check text-emerald-400 text-xs"></i>
                <span>បន្តិចទៀតនេះ Rotana NOB នឹងបើកតាម Telegram ចូលមកដល់ក្នុង Chat នេះផ្ទាល់!</span>
              </p>
              <p className="text-[11px] opacity-80 pl-4">
                សារ និង Session ត្រូវបាន End-to-End Encryption រួចរាល់ សុវត្ថិភាពកម្រិតខ្ពស់។
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition active:scale-95 inline-flex items-center justify-center gap-2"
            >
              <i className="fas fa-comments"></i>
              <span>ចូលទៅកាន់ Chat ដើម្បីរង់ចាំ Rotana NOB {countdown} វិនាទី</span>
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="text-center mb-5">
              <div className="w-12 h-12 mx-auto mb-2.5 rounded-2xl bg-gradient-to-tr from-violet-600/20 to-indigo-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 text-xl shadow-md">
                <i className="fas fa-paper-plane text-violet-400"></i>
              </div>
              <h3 className="text-base sm:text-lg font-black tracking-tight mb-1 text-white">
                Send Alert ទៅកាន់អ្នកគ្រប់គ្រង (Rotana NOB)
              </h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                ជួបបញ្ហាគាំង ឬ Error មែនទេ? ផ្ញើ Alert ភ្លាមៗទៅបង Rotana ដើម្បីជួយពិនិត្យ និង Bypass ជូន៖
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold mb-1 text-slate-400">
                  ឈ្មោះរបស់អ្នក
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ឧ. សិស្ស SETEC..."
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-hidden focus:ring-2 transition ${
                    isDark
                      ? 'bg-slate-950 border-slate-800 text-white focus:ring-violet-500/50 focus:border-violet-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:ring-violet-400/50 focus:border-violet-400'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold mb-1 text-slate-400">
                  បញ្ហាដែលអ្នកបានជួប
                </label>
                <textarea
                  value={issue}
                  onChange={(e) => setIssue(e.target.value)}
                  placeholder="ឧ. ឆាតទៅ AI មិនឆ្លើយ ឬប្រព័ន្ធកាត់ផ្ដាច់..."
                  rows={3}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-hidden focus:ring-2 transition resize-none ${
                    isDark
                      ? 'bg-slate-950 border-slate-800 text-white focus:ring-violet-500/50 focus:border-violet-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:ring-violet-400/50 focus:border-violet-400'
                  }`}
                  required
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className={`w-1/3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    isDark
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="w-2/3 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-violet-600 via-indigo-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 active:scale-95 shadow-md shadow-violet-600/25 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <i className="fas fa-circle-notch fa-spin"></i>
                      <span>កំពុងផ្ញើ...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane text-amber-300"></i>
                      <span>ផ្ញើ Alert ទៅកាន់ Rotana NOB</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
