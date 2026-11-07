'use client';

import React, { useEffect, useState } from 'react';
import { formatCountdown } from '../app/utils/chatSessionLimit';

export default function SessionBreakModal({
  isOpen,
  remainingSeconds = 1200,
  cooldownUntil,
  botName = 'កូនច្បង',
  theme = 'dark',
  onUnlock
}) {
  const [secondsLeft, setSecondsLeft] = useState(remainingSeconds);

  useEffect(() => {
    if (!isOpen) return;

    // Recalculate based on real timestamp to prevent clock manipulation
    const tick = () => {
      const now = Date.now();
      if (cooldownUntil) {
        const diff = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
        setSecondsLeft(diff);
        if (diff <= 0 && onUnlock) {
          onUnlock();
        }
      } else {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            if (onUnlock) onUnlock();
            return 0;
          }
          return prev - 1;
        });
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isOpen, cooldownUntil, onUnlock]);

  if (!isOpen) return null;

  const totalCooldown = 20 * 60; // 1200s
  const progressPercent = Math.min(100, Math.max(0, ((totalCooldown - secondsLeft) / totalCooldown) * 100));
  const isDark = theme === 'dark';

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[99999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none animate-fade-in"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className={`w-full max-w-md rounded-3xl p-6 sm:p-7 border shadow-2xl relative overflow-hidden text-center transition-all animate-scale-up ${
          isDark
            ? 'bg-slate-900/95 border-amber-500/40 text-slate-100 shadow-amber-500/10'
            : 'bg-white border-amber-400 text-slate-800 shadow-xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glowing Top Amber Flare */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1.5 bg-gradient-to-r from-amber-400 via-rose-500 to-amber-400 rounded-full blur-xs"></div>

        {/* Animated Coffee Cup & Sleeping Bot Header */}
        <div className="flex justify-center mb-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 via-rose-500 to-red-600 flex items-center justify-center text-4xl shadow-xl shadow-amber-500/25 ring-4 ring-amber-400/30 animate-bounce">
              ☕
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-6 w-6">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-6 w-6 bg-slate-900 border-2 border-amber-400 items-center justify-center text-[11px] text-amber-300">
                <i className="fas fa-lock"></i>
              </span>
            </span>
          </div>
        </div>

        {/* Badge & Title */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-black tracking-wide mb-2.5">
          <i className="fas fa-stopwatch text-amber-400 animate-spin"></i>
          <span>Live Chat Session Limit (15 នាទីចប់ហើយ)</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-black tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-rose-300 to-amber-200">
          ដល់ម៉ោងសម្រាកហើយអាប្អូន! 😴☕
        </h2>

        {/* Humorous Cambodian Troll Message */}
        <p className="text-xs sm:text-sm font-medium leading-relaxed text-slate-300 dark:text-slate-300 mb-4 px-1">
          ហាហាហា! មួយលើកលេងបានត្រឹម <b>១៥ នាទី</b> ប៉ុណ្ណោះអាប្អូន! ចែកវេនឱ្យសិស្សច្បង សិស្សប្អូន ស៊ីតិច ដទៃគេលេងផង កុំនៅតោង Server ឡើងក្តៅផ្សែងហុយ! 🤣🔥
          <br className="hidden sm:block" />
          ឥឡូវ<b>សម្រាក ២០ នាទីសិនទៅ</b> ទៅរកបាយមាន់ចៀន ឬកាហ្វេដោះគោទឹកកកមុខសាលាញ៉ាំសិន ដល់ម៉ោងចប់ Countdown ចាំត្រឡប់មក troll ជាមួយ <b>Chatbot {botName}</b> ទៀត! ✨
        </p>

        {/* Big Neon Digital Countdown Timer Box */}
        <div className="bg-slate-950/80 border border-amber-500/30 rounded-2xl p-4 sm:p-5 mb-4 shadow-inner relative overflow-hidden">
          <div className="text-[10.5px] font-bold uppercase tracking-widest text-amber-400/90 mb-1 flex items-center justify-center gap-1.5">
            <i className="fas fa-hourglass-half animate-pulse text-amber-400"></i>
            <span>ម៉ោងសម្រាកដែលនៅសល់ (Server Cooldown)</span>
          </div>

          <div className="text-4xl sm:text-5xl font-black font-mono tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-rose-400 to-amber-100 py-1 drop-shadow-md">
            {formatCountdown(secondsLeft)}
          </div>

          {/* Real-time Progress Bar */}
          <div className="w-full bg-slate-800 rounded-full h-2.5 mt-3 overflow-hidden border border-slate-700/60 p-0.5">
            <div
              className="bg-gradient-to-r from-amber-500 via-rose-500 to-emerald-400 h-full rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold mt-1.5 px-0.5">
            <span>សម្រាក 00:00</span>
            <span>{Math.round(progressPercent)}% រួចរាល់</span>
            <span>20:00 នាទី</span>
          </div>
        </div>

        {/* Anti-Bypass Security Assurance Note */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 mb-4 text-[11px] text-amber-300 font-bold flex items-center justify-center gap-2">
          <i className="fas fa-shield-halved text-amber-400 text-sm shrink-0"></i>
          <span>Server Lockout សកម្ម ១០០% (ការ Refresh ឬប្តូរឈ្មោះ មិនអាច Bypass បានឡើយ)</span>
        </div>

        {/* Community & Leisure Links While Waiting */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-2">
          <a
            href="https://www.facebook.com/share/g/19veZzceZM/?mibextid=wwXIfr"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-bold transition flex items-center gap-1.5 active:scale-95"
          >
            <i className="fab fa-facebook"></i>
            <span>ចូលលេង SETEC Troll Meme</span>
          </a>
          <a
            href="https://t.me/rotananob"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 border border-cyan-500/30 text-xs font-bold transition flex items-center gap-1.5 active:scale-95"
          >
            <i className="fab fa-telegram"></i>
            <span>Telegram បង Rotana</span>
          </a>
        </div>
      </div>
    </div>
  );
}
