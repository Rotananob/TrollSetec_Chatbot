'use client';

import { useEffect, useState } from 'react';

export default function ErrorBoundary({ error, reset }) {
  const [details, setDetails] = useState('');

  useEffect(() => {
    console.error('Captured Page Error:', error);
    setDetails(error?.stack || error?.message || String(error));
  }, [error]);

  const handleHardReset = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.clear();
        sessionStorage.clear();
        if ('caches' in window) {
          caches.keys().then((names) => {
            names.forEach((name) => caches.delete(name));
          });
        }
      } catch {}
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-white font-['Kantumruy_Pro',sans-serif]">
      <div className="max-w-lg w-full bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 text-center shadow-[0_0_50px_rgba(16,185,129,0.2)]">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-400 flex items-center justify-center text-3xl mb-4">
          <i className="fas fa-shield-halved"></i>
        </div>
        
        <h2 className="text-lg font-black text-emerald-200 mb-2">
          ប្រព័ន្ធកំពុងសម្រួលទិន្នន័យ (System Refresh)
        </h2>
        
        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          កម្មវិធីបានជួបប្រទះបញ្ហាក្នុងការផ្ទុកទិន្នន័យចាស់ សូមចុចប៊ូតុងខាងក្រោមដើម្បីសម្អាត Cache និងផ្ទុកទំព័រឡើងវិញ៖
        </p>

        {details && (
          <div className="mb-5 text-left p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400/80 overflow-x-auto max-h-40">
            {details}
          </div>
        )}

        <div className="flex gap-2.5 justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer active:scale-95"
          >
            ព្យាយាមម្ដងទៀត
          </button>
          
          <button
            type="button"
            onClick={handleHardReset}
            className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition cursor-pointer shadow-lg shadow-emerald-900/30 active:scale-95"
          >
            សម្អាត Cache & Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
