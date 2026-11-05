'use client';

import React, { useState, useEffect } from 'react';

export default function AntiSpamModal({ isOpen, onClose, username, retryAfter = 30 }) {
  const [secondsLeft, setSecondsLeft] = useState(retryAfter);

  useEffect(() => {
    if (isOpen) {
      setSecondsLeft(retryAfter > 0 ? retryAfter : 15);
      const timer = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isOpen, retryAfter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in font-['Kantumruy_Pro',sans-serif]">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl p-6 sm:p-8 max-w-sm w-full text-white text-center relative overflow-hidden animate-bounce-short">
        {/* Friendly Top Icon */}
        <div className="w-14 h-14 bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-400/40 rounded-2xl mx-auto mb-3.5 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <i className="fas fa-hourglass-half text-cyan-400 text-2xl animate-pulse"></i>
        </div>

        <h3 className="text-base sm:text-lg font-black text-cyan-200 mb-1 tracking-tight flex items-center justify-center gap-2">
          <span>សូមរង់ចាំបន្តិចណា៎!</span>
        </h3>
        <p className="text-xs text-slate-300 font-medium leading-relaxed mb-4">
          អាម៉ូយ <span className="text-cyan-300 font-bold">{username || 'User'}</span> ផ្ញើសារញាប់ពេកហើយ! សូមរង់ចាំមួយភ្លែត ដើម្បីឱ្យ Chatbot ឆ្លើយតបបានរលូន និងកុំឱ្យ Server ឡើងកម្ដៅ។
        </p>

        {/* Real-time Countdown Timer */}
        <div className="mb-5 flex flex-col items-center justify-center">
          <div className="text-2xl font-black text-cyan-400 font-mono tracking-wider bg-slate-950 border border-cyan-500/30 px-5 py-2 rounded-2xl shadow-inner flex items-center gap-2">
            <i className="fas fa-clock text-cyan-400 text-lg"></i>
            <span>{secondsLeft}</span>
            <span className="text-xs text-slate-400 font-sans font-medium">វិនាទី</span>
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={onClose}
          className="w-full bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-cyan-500/25 transition-all active:scale-95 text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
        >
          <i className="fas fa-check"></i>
          <span>យល់ព្រម</span>
        </button>
      </div>
    </div>
  );
}
