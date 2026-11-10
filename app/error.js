'use client';

import { useEffect, useState } from 'react';

export default function ErrorBoundary({ error, reset }) {
  const [details, setDetails] = useState('');

  useEffect(() => {
    console.error('Captured Page Error:', error);
    const errText = `${error?.name || 'Error'}: ${error?.message || ''}\n${error?.stack || String(error)}`;
    setDetails(errText);

    // Auto-heal ChunkLoadError or dynamic import mismatch after new deployments
    if (typeof window !== 'undefined') {
      const isChunkError = /chunk|loading|import|failed to fetch|dynamically imported/i.test(errText);
      const lastRetry = parseInt(sessionStorage.getItem('setec_chunk_auto_retry') || '0', 10);
      const now = Date.now();
      if (isChunkError && (!lastRetry || now - lastRetry > 15000)) {
        sessionStorage.setItem('setec_chunk_auto_retry', String(now));
        const target = `${window.location.pathname}?v=${now}`;
        window.location.replace(target);
      }
    }
  }, [error]);

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

        {details && (
          <div className="text-left p-3.5 rounded-xl bg-[#092818] border border-[#1c4d32] text-[10px] font-mono text-[#d7ccb7] overflow-x-auto max-h-28 whitespace-pre-wrap break-all leading-normal">
            {details}
          </div>
        )}

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
