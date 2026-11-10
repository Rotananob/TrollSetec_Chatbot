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
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#07130c] text-slate-100 font-['Kantumruy_Pro',sans-serif]">
      <div className="max-w-md w-full bg-[#0a1611] border border-emerald-900/60 rounded-2xl sm:rounded-3xl p-6 text-center shadow-2xl shadow-black/80 space-y-4">
        {/* App Logo */}
        <div className="relative w-14 h-14 mx-auto">
          <img
            src="/img/icon.jpg"
            alt="SETEC"
            className="w-14 h-14 rounded-2xl object-cover border border-emerald-700/60 shadow-md mx-auto"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/img/logo.jpg';
            }}
          />
        </div>

        <div>
          <div className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800/60 text-[10px] font-semibold text-emerald-300 mb-2">
            SETEC System Recovery
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white">
            ប្រព័ន្ធកំពុងសម្រួលទិន្នន័យ
          </h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            កម្មវិធីត្រូវការផ្ទុកកំណែទម្រង់ថ្មីចុងក្រោយ សូមចុចប៊ូតុងខាងក្រោមដើម្បីផ្ទុកទំព័រឡើងវិញ
          </p>
        </div>

        {details && (
          <div className="text-left p-3 rounded-xl bg-[#05110a] border border-emerald-950 text-[10px] font-mono text-slate-400 overflow-x-auto max-h-28 whitespace-pre-wrap break-all leading-normal">
            {details}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={handleGoHome}
            className="flex-1 py-2.5 px-3 rounded-xl bg-transparent hover:bg-emerald-950/50 text-slate-300 hover:text-white border border-emerald-900/60 text-xs font-semibold transition cursor-pointer active:scale-95"
          >
            ទៅទំព័រដើម
          </button>
          <button
            type="button"
            onClick={handleHardRefresh}
            className="flex-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold transition shadow-sm cursor-pointer active:scale-98"
          >
            ផ្ទុកទំព័រឡើងវិញ
          </button>
        </div>
      </div>
    </div>
  );
}
