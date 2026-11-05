'use client';

import React, { useState, useEffect } from 'react';
import { getApiEndpoint } from '../app/utils/apiConfig';
import { generateBypassToken, initLiveSessionOnDatabase } from '../app/utils/realtimeChat';

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

  useEffect(() => {
    if (isOpen) {
      setName(defaultUsername || localStorage.getItem('chatbot_username') || 'User');
      setIssue(initialIssue || '');
      setSentSuccess(false);
      setIsSending(false);
    }
  }, [isOpen, defaultUsername, initialIssue]);

  if (!isOpen) return null;

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

      // 1. Generate encrypted direct bypass token (Only created when user explicitly alerts)
      const token = generateBypassToken(activeSessionId, botKey);

      // 2. Initialize live session in Firebase Realtime Database
      await initLiveSessionOnDatabase(activeSessionId, {
        username: trimmedName,
        bot: botKey,
        issue: trimmedIssue,
        messages: recentMessages || [],
        token
      }).catch((err) => console.warn('[Realtime] DB init error:', err));

      // 3. Send Telegram alert with Direct Bypass Button to Rotana NOB
      const endpoint = getApiEndpoint('/api/track');
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'user_report_issue',
          username: trimmedName,
          issue: trimmedIssue,
          bot: botKey,
          sessionId: activeSessionId,
          bypassToken: token
        })
      });

      if (onLiveSessionStarted) {
        onLiveSessionStarted({ sessionId: activeSessionId, token });
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
            ? 'bg-slate-900 border-rose-500/30 text-white shadow-[0_20px_60px_rgba(244,63,94,0.2)]'
            : 'bg-white border-rose-200 text-slate-800 shadow-2xl'
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
          <div className="text-center py-6 animate-fade-in">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-3xl animate-bounce">
              <i className="fas fa-satellite-dish"></i>
            </div>
            <h3 className="text-base sm:text-lg font-black mb-2 text-emerald-400">
              បាន Alert ទៅកាន់ Telegram បង Rotana NOB រួចរាល់!
            </h3>
            <div className={`text-xs leading-relaxed max-w-sm mx-auto p-3.5 rounded-2xl mb-4 border ${
              isDark ? 'bg-slate-950/80 border-emerald-500/30 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-950'
            }`}>
              <p className="font-bold mb-1">
                ⚡ &ldquo;សូមប្អូនចាំបន្តិច! ខ្ញុំ Rotana NOB នឹងចូលមកភ្លាមក្នុង Chat Window នេះផ្ទាល់...&rdquo;
              </p>
              <p className="text-[11px] opacity-80">
                Link Bypass មាន Encryption សុវត្ថិភាពខ្ពស់បំផុតត្រូវបានបញ្ជូនទៅកាន់ Telegram បង Rotana រួចហើយ!
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:brightness-110 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-500/20 cursor-pointer transition active:scale-95 inline-flex items-center gap-2"
            >
              <i className="fas fa-comments"></i>
              <span>ចូលទៅកាន់ Chat ដើម្បីរង់ចាំ Rotana NOB</span>
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="text-center mb-5">
              <div className="w-14 h-14 mx-auto mb-2.5 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 p-0.5 shadow-lg shadow-rose-500/30 flex items-center justify-center text-white text-2xl">
                <i className="fas fa-triangle-exclamation"></i>
              </div>
              <h3 className="text-base sm:text-lg font-black tracking-tight mb-1">
                រាយការណ៍បញ្ហាទៅកាន់ Rotana NOB
              </h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                ជួបបញ្ហាគាំង ឬ Error មែនទេ? សូមរៀបរាប់ខ្លីៗខាងក្រោម៖
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold mb-1 text-slate-400">
                  ឈ្មោះរបស់អ្នក (Name)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ឧ. Rotana, Kru..."
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-hidden focus:ring-2 transition ${
                    isDark
                      ? 'bg-slate-950 border-slate-800 text-white focus:ring-rose-500/50 focus:border-rose-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:ring-rose-400/50 focus:border-rose-400'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold mb-1 text-slate-400">
                  បញ្ហាដែលអ្នកបានជួប (Issue Description)
                </label>
                <textarea
                  value={issue}
                  onChange={(e) => setIssue(e.target.value)}
                  placeholder="ឧ. ឆាតទៅ AI មិនឆ្លើយ ឬសំឡេងមិនចេញ..."
                  rows={3}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-hidden focus:ring-2 transition resize-none ${
                    isDark
                      ? 'bg-slate-950 border-slate-800 text-white focus:ring-rose-500/50 focus:border-rose-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:ring-rose-400/50 focus:border-rose-400'
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
                  className="w-2/3 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 hover:brightness-110 active:scale-95 shadow-md shadow-rose-500/20 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <i className="fas fa-circle-notch fa-spin"></i>
                      <span>កំពុងផ្ញើ...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane"></i>
                      <span>ផ្ញើរាយការណ៍ភ្លាមៗ</span>
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
