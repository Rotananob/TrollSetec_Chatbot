'use client';

import React, { useState, useEffect } from 'react';

export default function PwaInstallPrompt({ isDark = true }) {
  const [isStandalone, setIsStandalone] = useState(false);
  const [deviceType, setDeviceType] = useState('desktop'); // 'ios' | 'android' | 'desktop'
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // 1. Check if already installed & running in standalone mode
    const standaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    if (standaloneMode) {
      setIsStandalone(true);
      return;
    }

    // 2. Detect User Device OS
    const ua = window.navigator.userAgent || '';
    let detected = 'desktop';
    if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) {
      detected = 'ios';
    } else if (/Android/.test(ua)) {
      detected = 'android';
    }
    setDeviceType(detected);

    // 3. Listen for Android/Chrome beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 4. Check if dismissed within last 24 hours
    const lastDismissed = parseInt(localStorage.getItem('setec_pwa_dismissed') || '0', 10);
    const oneDay = 24 * 60 * 60 * 1000;
    const now = Date.now();

    if (now - lastDismissed > oneDay) {
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 2500);
      return () => clearTimeout(timer);
    }

    const handleOpenInstall = () => setShowModal(true);
    window.addEventListener('open-pwa-install', handleOpenInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('open-pwa-install', handleOpenInstall);
    };
  }, []);

  // Handle native install click for Android / Chrome
  const handleNativeInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowModal(false);
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } else {
      setShowModal(true);
    }
  };

  const handleDismissBanner = () => {
    setShowBanner(false);
    localStorage.setItem('setec_pwa_dismissed', String(Date.now()));
  };

  // If already running inside standalone installed PWA, do not show any prompts
  if (isStandalone) return null;

  return (
    <>
      {/* Floating Bottom Install Banner for Mobile & Web */}
      {showBanner && !showModal && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-40 animate-fade-in font-['Kantumruy_Pro',sans-serif]">
          <div
            className={`rounded-2xl p-3.5 shadow-2xl border flex items-center justify-between gap-3 backdrop-blur-xl ${
              isDark
                ? 'bg-slate-900/95 border-blue-500/30 text-white shadow-blue-500/20'
                : 'bg-white/95 border-blue-200 text-slate-800 shadow-xl'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-0.5 shadow shrink-0 overflow-hidden">
                <img
                  src="/img/icon.jpg"
                  alt="App Icon"
                  className="w-full h-full object-cover rounded-[10px]"
                />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black tracking-tight truncate flex items-center gap-1.5">
                  <span>ដំឡើង SETEC Chat ជា App</span>
                  <span className="text-[9px] bg-blue-500/20 text-blue-400 font-bold px-1.5 py-0.2 rounded-full">PWA</span>
                </div>
                <p className={`text-[11px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  លេងលឿន មិនរអាក់រអួល ស្រួលប្រើ
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => {
                  if (deviceType === 'android' && deferredPrompt) {
                    handleNativeInstall();
                  } else {
                    setShowModal(true);
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-extrabold shadow-md transition active:scale-95 flex items-center gap-1 cursor-pointer"
              >
                <i className="fas fa-download text-[11px]"></i>
                <span>ដំឡើង</span>
              </button>
              <button
                onClick={handleDismissBanner}
                className={`p-1.5 rounded-lg text-xs transition ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                }`}
                title="ពេលក្រោយ"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header/Floating Button Trigger (Allows reopening anytime) */}
      <button
        onClick={() => {
          if (deviceType === 'android' && deferredPrompt) {
            handleNativeInstall();
          } else {
            setShowModal(true);
          }
        }}
        className={`fixed top-3.5 left-20 z-30 hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-extrabold transition shadow-sm backdrop-blur-md cursor-pointer ${
          isDark
            ? 'bg-slate-900/80 border-blue-500/30 text-blue-300 hover:bg-blue-500/20'
            : 'bg-white/80 border-blue-200 text-blue-600 hover:bg-blue-50'
        }`}
        title="ដំឡើងកម្មវិធីនៅលើឧបករណ៍របស់អ្នក"
      >
        <i className="fas fa-cloud-arrow-down text-blue-400"></i>
        <span>ដំឡើង App</span>
      </button>

      {/* Full Step-by-Step Onboarding Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in font-['Kantumruy_Pro',sans-serif]">
          <div
            className={`w-full max-w-md rounded-3xl p-6 shadow-2xl border transition-all relative overflow-hidden ${
              isDark
                ? 'bg-slate-900 border-blue-500/30 text-white shadow-[0_20px_60px_rgba(59,130,246,0.2)]'
                : 'bg-white border-blue-200 text-slate-800 shadow-2xl'
            }`}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowModal(false)}
              className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition ${
                isDark
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
              title="បិទ"
            >
              <i className="fas fa-times text-sm"></i>
            </button>

            {/* Modal Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 p-0.5 shadow-lg shadow-blue-500/30 overflow-hidden">
                <img
                  src="/img/icon.jpg"
                  alt="SETEC Chat"
                  className="w-full h-full object-cover rounded-[14px]"
                />
              </div>
              <h3 className="text-lg sm:text-xl font-black tracking-tight mb-1">
                ដំឡើង SETEC Chatbot លើទូរស័ព្ទ
              </h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                លេងស្រួលជាងមុន មិនរអាក់រអួល និងចូលបានភ្លាមៗពី Home Screen
              </p>
            </div>

            {/* Targeted Guidance for iOS (iPhone / iPad) */}
            {deviceType === 'ios' && (
              <div className="space-y-3.5 mb-6 text-left">
                <div className={`p-3 rounded-2xl border flex items-start gap-3 ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-blue-50/60 border-blue-100'
                }`}>
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 font-black text-sm">
                    <i className="fas fa-arrow-up-from-bracket"></i>
                  </div>
                  <div>
                    <span className="font-extrabold text-xs block mb-0.5">ជំហានទី ១</span>
                    <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      ចុចលើប៊ូតុង <strong className="text-blue-400">Share</strong> នៅរបារខាងក្រោមនៃ Safari។
                    </p>
                  </div>
                </div>

                <div className={`p-3 rounded-2xl border flex items-start gap-3 ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-blue-50/60 border-blue-100'
                }`}>
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 font-black text-sm">
                    <i className="fas fa-plus-square"></i>
                  </div>
                  <div>
                    <span className="font-extrabold text-xs block mb-0.5">ជំហានទី ២</span>
                    <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      អូសចុះក្រោមបន្តិច រួចចុចពាក្យ <strong className="text-indigo-400">«បន្ថែមទៅទំព័រដើម»</strong>។
                    </p>
                  </div>
                </div>

                <div className={`p-3 rounded-2xl border flex items-start gap-3 ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-blue-50/60 border-blue-100'
                }`}>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-black text-sm">
                    <i className="fas fa-check"></i>
                  </div>
                  <div>
                    <span className="font-extrabold text-xs block mb-0.5">ជំហានទី ៣</span>
                    <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      ចុចពាក្យ <strong className="text-emerald-400">«បន្ថែម»</strong> នៅជ្រុងស្ដាំខាងលើ ជាការស្រេច!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Targeted Guidance for Android */}
            {deviceType === 'android' && (
              <div className="space-y-4 mb-6 text-left">
                {deferredPrompt ? (
                  <button
                    onClick={handleNativeInstall}
                    className="w-full py-3.5 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 hover:brightness-110 active:scale-95 shadow-lg shadow-blue-500/30 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <i className="fas fa-download"></i>
                    <span>ចុចដំឡើង App លើទូរស័ព្ទឥឡូវនេះ</span>
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className={`p-3 rounded-2xl border flex items-start gap-3 ${
                      isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-blue-50/60 border-blue-100'
                    }`}>
                      <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 font-black text-sm">
                        <i className="fas fa-ellipsis-vertical"></i>
                      </div>
                      <div>
                        <span className="font-extrabold text-xs block mb-0.5">ជំហានទី ១</span>
                        <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                          ចុចលើសញ្ញាចុចបី <strong className="text-blue-400">Menu</strong> នៅជ្រុងស្ដាំខាងលើនៃ Chrome។
                        </p>
                      </div>
                    </div>

                    <div className={`p-3 rounded-2xl border flex items-start gap-3 ${
                      isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-blue-50/60 border-blue-100'
                    }`}>
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-black text-sm">
                        <i className="fas fa-mobile-screen"></i>
                      </div>
                      <div>
                        <span className="font-extrabold text-xs block mb-0.5">ជំហានទី ២</span>
                        <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                          ជ្រើសរើសយក <strong className="text-emerald-400">«ដំឡើងកម្មវិធី»</strong> ឬ <strong className="text-emerald-400">«បន្ថែមទៅអេក្រង់ដើម»</strong>។
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Targeted Guidance for Desktop / PC */}
            {deviceType === 'desktop' && (
              <div className="space-y-3 mb-6 text-left">
                {deferredPrompt ? (
                  <button
                    onClick={handleNativeInstall}
                    className="w-full py-3.5 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 hover:brightness-110 active:scale-95 shadow-lg shadow-blue-500/30 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <i className="fas fa-download"></i>
                    <span>ដំឡើងកម្មវិធីលើ Desktop</span>
                  </button>
                ) : (
                  <div className={`p-3 rounded-2xl border flex items-start gap-3 ${
                    isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-blue-50/60 border-blue-100'
                  }`}>
                    <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 font-black text-sm">
                      <i className="fas fa-desktop"></i>
                    </div>
                    <div>
                      <span className="font-extrabold text-xs block mb-0.5">របៀបដំឡើងលើកុំព្យូទ័រ</span>
                      <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        ចុចលើ Icon ដំឡើង នៅជ្រុងស្ដាំនៃ Address bar របស់ Google Chrome ឬ Microsoft Edge។
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Footer Done Button */}
            <div className="flex justify-center">
              <button
                onClick={() => setShowModal(false)}
                className={`w-full py-3 rounded-xl font-extrabold text-xs transition ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                ខ្ញុំយល់ហើយ
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
