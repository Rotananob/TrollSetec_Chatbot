'use client';

import React, { useState, useEffect } from 'react';

export default function AntiSpamModal({ isOpen, onClose, username, retryAfter = 30, message }) {
  const [secondsLeft, setSecondsLeft] = useState(retryAfter);

  useEffect(() => {
    if (isOpen) {
      setSecondsLeft(retryAfter > 0 ? retryAfter : 30);
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

  const defaultRoast = `«អញជា AI កូនពៅមកទប់ស្កាត់អាមនុស្សអត់ខួរដើរ spam អត់ប្រយោជន៍ដូច ${username || 'ឯង'}! គិតថា server បង Rotana ទុកឱ្យហែងមក spam លេងៗមែន? មុខដូចគីង្គក់ឡើងថ្លុក ឈប់ spam ទៅអាល្ងង់ ហើយចាំ ${secondsLeft} វិនាទីទៀតទៅ! 💀🔥»`;
  const displayRoast = message || defaultRoast;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in font-['Kantumruy_Pro',sans-serif]">
      <div className="bg-gradient-to-b from-slate-900 via-rose-950/35 to-slate-950 border-2 border-rose-500/50 rounded-3xl shadow-2xl shadow-rose-900/40 p-6 sm:p-7 max-w-md w-full text-white text-center relative overflow-hidden animate-bounce-short">
        {/* Top Savage Glowing Badge */}
        <div className="w-16 h-16 bg-gradient-to-tr from-rose-600/30 via-red-500/20 to-amber-500/20 border-2 border-rose-500/60 rounded-2xl mx-auto mb-3.5 flex items-center justify-center shadow-lg shadow-rose-600/30 animate-pulse">
          <i className="fas fa-shield-virus text-rose-400 text-3xl"></i>
        </div>

        {/* Shield Identity */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] font-bold tracking-wide mb-2 uppercase">
          <i className="fas fa-skull text-xs text-rose-400"></i>
          <span>AI កូនពៅ Server Security Shield</span>
        </div>

        <h3 className="text-base sm:text-lg font-black text-rose-200 mb-2 tracking-tight flex items-center justify-center gap-2">
          <span>វាយបកពី Server: ឈប់ Spam ទៅអាល្អិត!</span>
        </h3>

        {/* Server Strike-Back Roast Box */}
        <div className="bg-black/60 border border-rose-500/30 rounded-2xl p-4 mb-4 text-left shadow-inner">
          <div className="flex items-center gap-1.5 mb-1.5 text-rose-400 font-bold text-[11px] uppercase tracking-wider">
            <i className="fas fa-fire text-amber-400"></i>
            <span>សារវាយបកពី Server (AI កូនពៅ Roast)</span>
          </div>
          <p className="text-xs sm:text-sm text-rose-100 font-medium leading-relaxed font-['Kantumruy_Pro',sans-serif]">
            {displayRoast}
          </p>
        </div>

        {/* Real-time Countdown Timer */}
        <div className="mb-4 flex flex-col items-center justify-center">
          <div className="text-xs text-rose-300/80 mb-1.5 font-medium">
            រយៈពេលផ្អាកផ្ញើសារបណ្ដោះអាសន្ន
          </div>
          <div className="text-2xl font-black text-rose-400 font-mono tracking-wider bg-slate-950/90 border border-rose-500/40 px-5 py-2 rounded-2xl shadow-inner flex items-center gap-2">
            <i className="fas fa-clock text-amber-400 text-base animate-spin"></i>
            <span>{secondsLeft}</span>
            <span className="text-xs text-rose-300 font-sans font-medium">វិនាទី</span>
          </div>
        </div>

        {/* Funny Surrender Button */}
        <button
          onClick={onClose}
          className="w-full bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-rose-600/30 transition-all active:scale-95 text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer border border-rose-400/30"
        >
          <i className="fas fa-hand-holding-heart text-amber-300"></i>
          <span>ដឹងកំហុសហើយ ខ្ញុំឈប់ Spam ហើយ 😭</span>
        </button>
      </div>
    </div>
  );
}
