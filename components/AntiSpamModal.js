'use client';

import React, { useState, useEffect } from 'react';

export default function AntiSpamModal({ isOpen, onClose, username, ip, device, retryAfter = 60 }) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-red-950/80 backdrop-blur-md animate-fade-in font-['Kantumruy_Pro',sans-serif]">
      <div className="bg-slate-950 border-2 border-red-500 rounded-3xl shadow-[0_0_60px_rgba(239,68,68,0.5)] p-6 md:p-8 max-w-md w-full text-white text-center relative overflow-hidden animate-bounce-short">
        {/* Top Warning Badge */}
        <div className="w-16 h-16 bg-red-600/20 border border-red-500 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-red-500/30">
          <i className="fas fa-shield-halved text-red-500 text-3xl animate-pulse"></i>
        </div>

        <h3 className="text-lg md:text-xl font-black text-red-400 mb-1 tracking-wide flex items-center justify-center gap-2">
          <i className="fas fa-triangle-exclamation text-red-500"></i>
          <span>SYSTEM SECURITY ALERT</span>
          <i className="fas fa-triangle-exclamation text-red-500"></i>
        </h3>
        <p className="text-xs text-red-300 font-semibold mb-4">
          ប្រព័ន្ធបានចាប់បាននូវការព្យាយាមឆាតលើសពី ៥ ដងក្នុង ១ នាទី!
        </p>

        {/* Captured User Info Box */}
        <div className="bg-red-950/40 border border-red-500/30 rounded-2xl p-4 text-left text-xs font-mono text-red-200 mb-4 space-y-1.5 shadow-inner">
          <div className="flex justify-between items-center pb-1 border-b border-red-500/20 text-[11px] text-red-400 font-bold uppercase">
            <span>Security Snapshot</span>
            <span className="flex items-center gap-1 text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block"></span>
              CAPTURED
            </span>
          </div>
          <div className="truncate flex items-center">
            <span className="text-slate-400 font-sans flex items-center"><i className="fas fa-user text-slate-400 mr-1.5"></i>ឈ្មោះ User:</span>{' '}
            <span className="text-yellow-300 font-bold font-sans ml-1.5">{username || 'Unknown'}</span>
          </div>
          <div className="truncate flex items-center">
            <span className="text-slate-400 font-sans flex items-center"><i className="fas fa-globe text-slate-400 mr-1.5"></i>IP Address:</span>{' '}
            <span className="text-cyan-300 ml-1.5">{ip || '172.20.10.2 / Encrypted'}</span>
          </div>
          <div className="truncate flex items-center">
            <span className="text-slate-400 font-sans flex items-center"><i className="fas fa-mobile-screen text-slate-400 mr-1.5"></i>ឧបករណ៍ Device:</span>{' '}
            <span className="text-slate-300 text-[10px] ml-1.5">{device || 'Mobile Device / Hotspot'}</span>
          </div>
          <div className="truncate flex items-center">
            <span className="text-slate-400 font-sans flex items-center"><i className="fas fa-clock text-slate-400 mr-1.5"></i>ស្ថានភាព:</span>{' '}
            <span className="text-amber-400 font-bold ml-1.5">COOLDOWN ACTIVE - ៥ សារក្នុង ១ នាទី</span>
          </div>
        </div>

        {/* Funny Reassurance Twist requested by User */}
        <div className="bg-slate-900/90 border border-amber-500/40 rounded-xl p-3 text-xs text-amber-200 text-left mb-4 leading-relaxed font-sans shadow-sm">
          <p className="font-semibold text-amber-300 mb-1 flex items-center gap-1.5">
            <i className="fas fa-face-smile-wink text-amber-400"></i>
            <span>កុំទាន់អាលភ័យពេកអាអូន!</span>
          </p>
          <p className="text-[11px] leading-relaxed text-slate-300">
            ព្រោះ <strong className="text-white font-bold">ROTANA NOB</strong> គាត់ជាមនុស្ស <strong>CHILL</strong> ទេ គាត់មិនចេះខឹងអីផ្តេសផ្តាសឡើយ ហើយ SYSTEM ក៏មិនបាន <strong className="text-red-400">ALERT TO TELEGRAM</strong> គាត់ដែរ... <span className="text-amber-300 italic">ឬមួយក៏ Alert រួចបាត់ហើយ?</span>
          </p>
        </div>

        {/* Real-time Countdown Timer */}
        <div className="mb-5 flex flex-col items-center justify-center">
          <span className="text-[11px] text-slate-400 font-sans mb-1">សូមរង់ចាំឱ្យប្រព័ន្ធចុះត្រជាក់សិន៖</span>
          <div className="text-2xl font-black text-amber-400 font-mono tracking-wider bg-slate-900 border border-slate-700 px-5 py-1.5 rounded-xl shadow-inner flex items-center gap-2">
            <i className="fas fa-hourglass-half text-amber-400 text-xl"></i>
            <span>{secondsLeft}</span>
            <span className="text-xs text-slate-400 font-sans">វិនាទី</span>
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={onClose}
          className="w-full bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black py-3 px-4 rounded-xl shadow-lg shadow-red-600/30 transition-all active:scale-95 text-xs md:text-sm flex items-center justify-center gap-2 cursor-pointer"
        >
          <i className="fas fa-times-circle"></i>
          <span>បិទផ្ទាំងនេះ - ខ្ញុំឈប់ Spam ហើយ</span>
        </button>
      </div>
    </div>
  );
}
