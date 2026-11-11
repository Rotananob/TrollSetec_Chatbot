'use client';

import React, { useState, useEffect } from 'react';
import { getApiEndpoint } from '../app/utils/apiConfig';
import { initLiveSessionOnDatabase } from '../app/utils/realtimeChat';

export default function ErrorReportModal({
  isOpen,
  onClose,
  defaultUsername = '',
  bot = 'Roastbot',
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
      alert('សូមសរសេររៀបរាប់ពីបញ្ហាខ្លីៗជាមុនសិន');
      return;
    }

    setIsSending(true);

    try {
      const activeSessionId = sessionId || 'session_' + Date.now();
      const lowerBot = (bot || 'konpov').toLowerCase();
      const botKey = lowerBot.includes('kandal')
        ? 'konkandal'
        : lowerBot.includes('bong')
        ? 'konbong'
        : 'konpov';

      // 1. Initialize live session in Firebase Realtime Database
      await initLiveSessionOnDatabase(activeSessionId, {
        username: trimmedName,
        bot: botKey,
        issue: trimmedIssue,
        status: 'waiting',
        messages: recentMessages.slice(-12),
        recentHistory: recentMessages.slice(-6)
      });

      // 2. Notify parent to start live sync listener
      if (typeof onLiveSessionStarted === 'function') {
        onLiveSessionStarted(activeSessionId);
      }

      // 3. Dispatch alert webhook to Admin Telegram (Generates signed Bypass token & direct-to-chat button)
      const endpoint = getApiEndpoint('/api/track');
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'user_report_issue',
          username: trimmedName,
          bot: botKey,
          issue: trimmedIssue,
          sessionId: activeSessionId
        })
      });

      setSentSuccess(true);
    } catch (err) {
      console.error('Error reporting alert:', err);
      alert('មិនអាចបញ្ជូនសារបានទេ សូមពិនិត្យអ៊ីនធឺណិត');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none animate-fade-in font-['Kantumruy_Pro',sans-serif]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl sm:rounded-3xl p-6 bg-[#0d3822] border border-[#25613e] text-[#fbf8f2] shadow-2xl shadow-black/80 relative overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer text-[#d7ccb7] hover:text-[#fbf8f2] bg-[#14472c] hover:bg-[#1a5535] border border-[#276a44]"
          title="បិទ"
        >
          <i className="fas fa-times text-xs"></i>
        </button>

        {sentSuccess ? (
          <div className="text-center py-2 animate-fade-in space-y-3">
            <div className="flex items-center justify-center gap-3">
              <div className="relative">
                <img
                  src="/img/DevPic.JPG"
                  alt="Rotana NOB"
                  className="w-12 h-12 rounded-full object-cover border-2 border-[#fbf8f2] shadow-md"
                />
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0d3822]"></span>
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-[#fbf8f2]">Rotana NOB</p>
                <p className="text-[11px] text-[#d7ccb7]">បានបញ្ជូនទៅ Telegram បង Rotana NOB រួចរាល់</p>
              </div>
            </div>

            {/* 180s Realtime Countdown Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#124229] border border-[#235e3c] text-[#fbf8f2] font-bold text-xs shadow-xs">
              <i className="fas fa-stopwatch text-[#d7ccb7]"></i>
              <span className="font-mono">{formatCountdown(countdown)}</span>
              <span className="text-[11px] text-[#d7ccb7]">នៅសល់ {countdown} វិនាទី រង់ចាំបង Rotana ចូលឆាត</span>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <a
                href="https://t.me/TheRotanaNob"
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 bg-[#fbf8f2] hover:bg-[#eee6d5] active:bg-[#e4dbca] text-[#0d3822] rounded-xl text-xs font-bold shadow-md cursor-pointer transition active:scale-95 inline-flex items-center justify-center gap-2 border border-[#e4d9c4]"
              >
                <i className="fab fa-telegram text-sm text-[#0d3822]"></i>
                <span>ឆាត Telegram ទៅបង Rotana NOB ផ្ទាល់</span>
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-[#124229] hover:bg-[#15462c] text-[#fbf8f2] border border-[#2d6c46] rounded-xl text-xs font-bold shadow-xs cursor-pointer transition active:scale-95 inline-flex items-center justify-center gap-1.5"
                >
                  <i className="fas fa-comments"></i>
                  <span>រង់ចាំក្នុង Chat</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-transparent hover:bg-[#15462c] text-[#d7ccb7] hover:text-[#fbf8f2] border border-[#2d6c46] rounded-xl text-xs font-bold cursor-pointer transition active:scale-95 inline-flex items-center justify-center gap-1"
                >
                  <i className="fas fa-times"></i>
                  <span>បិទ</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="text-center mb-5">
              <div className="w-12 h-12 mx-auto mb-2.5 rounded-full overflow-hidden bg-[#fbf8f2] border-2 border-[#e4d9c4] shadow-md">
                <img src="/img/DevPic.JPG" alt="Rotana NOB" className="w-full h-full object-cover" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#fbf8f2] mb-1">
                ផ្ញើ Alert ទៅ Telegram បង Rotana NOB
              </h3>
              <p className="text-xs text-[#d7ccb7]">
                ជួបបញ្ហាគាំង ឬ Error មែនទេ ផ្ញើ Alert ភ្លាមៗទៅកាន់បង Rotana NOB ដើម្បីចូលជួយដោះស្រាយផ្ទាល់
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold mb-1.5 text-[#d7ccb7]">
                  ឈ្មោះរបស់អ្នក
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ឧទាហរណ៍ សិស្ស SETEC"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#235e3c] bg-[#124229] text-[#fbf8f2] placeholder:text-[#8da698] text-xs font-semibold focus:outline-none focus:border-[#fbf8f2] transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5 text-[#d7ccb7]">
                  បញ្ហាដែលអ្នកបានជួប
                </label>
                <textarea
                  value={issue}
                  onChange={(e) => setIssue(e.target.value)}
                  placeholder="ឧទាហរណ៍ ឆាតទៅ AI មិនឆ្លើយ ឬប្រព័ន្ធកាត់ផ្ដាច់"
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#235e3c] bg-[#124229] text-[#fbf8f2] placeholder:text-[#8da698] text-xs font-semibold focus:outline-none focus:border-[#fbf8f2] transition resize-none leading-relaxed"
                  required
                />
              </div>

              <div className="pt-2 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl text-xs font-bold transition cursor-pointer bg-transparent hover:bg-[#15462c] text-[#fbf8f2] border border-[#2d6c46] active:scale-95"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="flex-2 py-3 rounded-xl text-xs font-bold text-[#0d3822] bg-[#fbf8f2] hover:bg-[#eee6d5] active:bg-[#e4dbca] active:scale-98 shadow-md border border-[#e4d9c4] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <i className="fas fa-spinner fa-spin text-[#0d3822]"></i>
                      <span>កំពុងផ្ញើ...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane text-[#0d3822]"></i>
                      <span>ផ្ញើសារទៅកាន់អ្នកគ្រប់គ្រង</span>
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
