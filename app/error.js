'use client';

import { useEffect } from 'react';

export default function ErrorBoundary({ error, reset }) {
  useEffect(() => {
    if (!error) return;
    console.error('[Auto-Recovered Error]:', error);

    // Auto-heal ALL runtime errors silently without showing error box to user
    if (typeof window !== 'undefined') {
      try {
        reset();
      } catch {
        window.location.replace(`${window.location.pathname}?retry=${Date.now()}`);
      }
    }
  }, [error, reset]);

  const handleHardRefresh = () => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.clear();
        if ('caches' in window) {
          caches.keys().then((names) => {
            names.forEach((name) => caches.delete(name));
          });
        }
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then((registrations) => {
            registrations.forEach((r) => r.unregister());
          });
        }
      } catch {}
      window.location.replace(`${window.location.pathname}?refresh=${Date.now()}`);
    }
  };

  const handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.replace(`/?fresh=${Date.now()}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#082215] text-[#fbf8f2] font-['Kantumruy_Pro',sans-serif]">
      <div className="max-w-md w-full bg-[#0d3822] border border-[#25613e] rounded-2xl sm:rounded-3xl p-6 text-center shadow-2xl shadow-black/80 space-y-4">
        {/* App Logo */}
        <div className="relative w-14 h-14 mx-auto">
          <img
            src="/img/icon.jpg"
            alt="SETEC"
            className="w-14 h-14 rounded-2xl object-cover border-2 border-[#fbf8f2] shadow-md mx-auto"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/img/logo.jpg';
            }}
          />
        </div>

        <div>
          <div className="inline-block px-3 py-0.5 rounded-full bg-[#fbf8f2] border border-[#e4d9c4] text-[10px] font-bold text-[#0d3822] mb-2 shadow-xs">
            វិទ្យាស្ថាន ស៊ីតិច
          </div>
          <h2 className="text-base sm:text-lg font-bold text-[#fbf8f2]">
            ប្រព័ន្ធកំពុងសម្រួលទិន្នន័យ
          </h2>
          <p className="text-xs text-[#d7ccb7] mt-1 leading-relaxed">
            កម្មវិធីត្រូវការផ្ទុកកំណែទម្រង់ថ្មីចុងក្រោយ សូមចុចប៊ូតុងខាងក្រោមដើម្បីផ្ទុកទំព័រឡើងវិញ
          </p>
        </div>



        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={handleGoHome}
            className="flex-1 py-3 px-3 rounded-xl bg-transparent hover:bg-[#15462c] text-[#fbf8f2] border border-[#2d6c46] text-xs font-bold transition cursor-pointer active:scale-95"
          >
            ទៅទំព័រដើម
          </button>
          <button
            type="button"
            onClick={handleHardRefresh}
            className="flex-2 py-3 px-4 rounded-xl bg-[#fbf8f2] hover:bg-[#eee6d5] active:bg-[#e4dbca] text-[#0d3822] text-xs font-bold transition shadow-md cursor-pointer active:scale-98 border border-[#e4d9c4]"
          >
            ផ្ទុកទំព័រឡើងវិញ
          </button>
        </div>
      </div>
    </div>
  );
}
