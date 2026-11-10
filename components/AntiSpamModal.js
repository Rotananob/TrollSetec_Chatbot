'use client';

import React, { useState, useEffect } from 'react';

export default function AntiSpamModal({ isOpen, onClose, username, retryAfter = 60, message }) {
  const [secondsLeft, setSecondsLeft] = useState(retryAfter);

  useEffect(() => {
    if (isOpen) {
      setSecondsLeft(retryAfter > 0 ? retryAfter : 60);
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

  const formatTime = (totalSeconds) => {
    if (isNaN(totalSeconds) || totalSeconds <= 0) return '00:00';
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const defaultRoast = `ប្រព័ន្ធមកទប់ស្កាត់ការផ្ញើសារញឹកញាប់ពេកពី ${username || 'អ្នក'}។ សូមរង់ចាំចំនួន ${secondsLeft} វិនាទីទៀតសិនមុននឹងបន្តជជែក!`;
  const displayRoast = (message || defaultRoast).replace(/[()💀🔥😭]/g, '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in font-['Kantumruy_Pro',sans-serif]">
      <div className="bg-[#0d3822] border border-[#25613e] rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-7 max-w-md w-full text-[#fbf8f2] text-center relative overflow-hidden animate-scale-up">
        {/* Shield Icon */}
        <div className="w-14 h-14 bg-[#fbf8f2] border border-[#e4d9c4] rounded-2xl mx-auto mb-3.5 flex items-center justify-center shadow-md text-[#0d3822]">
          <i className="fas fa-shield-halved text-2xl"></i>
        </div>

        {/* Shield Identity */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fbf8f2] text-[#0d3822] border border-[#e4d9c4] text-[10px] font-bold tracking-wide mb-2 uppercase">
          <i className="fas fa-lock text-xs"></i>
          <span>ប្រព័ន្ធសុវត្ថិភាពទិន្នន័យស៊ីតិច</span>
        </div>

        <h3 className="text-base sm:text-lg font-bold text-[#fbf8f2] mb-2 tracking-tight">
          សូមរង់ចាំមួយភ្លែតសិន
        </h3>

        {/* Message Box */}
        <div className="bg-[#faf5ea] text-[#0d3822] border border-[#e4d9c4] rounded-2xl p-4 mb-4 text-left shadow-sm">
          <div className="flex items-center gap-1.5 mb-1.5 text-[#0d3822] font-bold text-xs">
            <i className="fas fa-info-circle"></i>
            <span>ការណែនាំពីប្រព័ន្ធ</span>
          </div>
          <p className="text-xs text-[#1a472d] font-normal leading-relaxed">
            {displayRoast}
          </p>
        </div>

        {/* Real-time Countdown Timer */}
        <div className="mb-4 flex flex-col items-center justify-center">
          <div className="text-xs text-[#d7ccb7] mb-1.5 font-normal">
            រយៈពេលផ្អាកផ្ញើសារបណ្ដោះអាសន្ន
          </div>
          <div className="text-3xl font-bold text-[#fbf8f2] font-mono tracking-wider bg-[#124229] border border-[#235e3c] px-6 py-2.5 rounded-2xl shadow-inner flex items-center gap-2">
            <i className="fas fa-clock text-[#d7ccb7] text-base"></i>
            <span>{formatTime(secondsLeft)}</span>
            <span className="text-xs text-[#d7ccb7] font-sans font-normal">{secondsLeft} វិនាទី</span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full bg-[#fbf8f2] hover:bg-[#eee6d5] active:bg-[#e4dbca] text-[#0d3822] font-bold py-3 px-4 rounded-xl shadow-md transition-all active:scale-98 text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer border border-[#e4d9c4]"
        >
          <i className="fas fa-check text-[#0d3822]"></i>
          <span>យល់ព្រមរង់ចាំ</span>
        </button>
      </div>
    </div>
  );
}
