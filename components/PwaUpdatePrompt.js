'use client';

import { useState, useEffect, useRef } from 'react';

export default function PwaUpdatePrompt() {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const clientBuildTimeRef = useRef(null);
  const registrationRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const fetchInitialVersion = async () => {
        try {
          const res = await fetch(`/version.json?_t=${Date.now()}`, { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            if (data && data.buildTime) {
              clientBuildTimeRef.current = data.buildTime;
            }
          }
        } catch {}
      };

      fetchInitialVersion();

      const checkForUpdate = async () => {
        try {
          const res = await fetch(`/version.json?_t=${Date.now()}`, { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            if (
              data &&
              data.buildTime &&
              clientBuildTimeRef.current &&
              data.buildTime > clientBuildTimeRef.current
            ) {
              setHasUpdate(true);
            }
          }
        } catch {}

        if (registrationRef.current) {
          registrationRef.current.update().catch(() => {});
        }
      };

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').then((reg) => {
          registrationRef.current = reg;
          if (reg.waiting) {
            setHasUpdate(true);
          }
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setHasUpdate(true);
                }
              });
            }
          });
        }).catch(() => {});
      }

      const intervalTimer = setInterval(checkForUpdate, 45000);
      return () => clearInterval(intervalTimer);
    }
  }, []);

  const handleAutoUpdate = () => {
    setIsUpdating(true);
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        if ('caches' in window) {
          caches.keys().then((names) => {
            names.forEach((name) => caches.delete(name));
          });
        }
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then((regs) => {
            return Promise.all(regs.map((r) => r.unregister()));
          }).catch(() => {}).finally(() => {
            window.location.href = window.location.pathname + '?_upd=' + Date.now();
          });
        } else {
          window.location.href = window.location.pathname + '?_upd=' + Date.now();
        }
      }
    }, 300);
  };

  if (!hasUpdate || isDismissed) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-[99999] max-w-sm w-[calc(100%-2rem)] sm:w-96 bg-[#0d3822] text-[#fbf8f2] rounded-2xl p-4 shadow-2xl border border-[#25613e] font-['Kantumruy_Pro',sans-serif]"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#fbf8f2] shrink-0" />
          <h3 className="text-xs sm:text-sm font-bold text-[#fbf8f2] tracking-tight">
            មានការអាប់ដេតកំណែថ្មី
          </h3>
        </div>

        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="text-[#d7ccb7] hover:text-[#fbf8f2] transition-colors p-1 -mr-1 -mt-1 cursor-pointer"
          title="បិទ"
        >
          <i className="fa-solid fa-xmark text-xs" />
        </button>
      </div>

      {/* Description */}
      <p className="text-xs text-[#d7ccb7] leading-relaxed mb-3">
        ប្រព័ន្ធទើបតែមានការអាប់ដេតកំណែថ្មី សូមចុចប៊ូតុងខាងក្រោមដើម្បីផ្ទុកទម្រង់ថ្មីបំផុត
      </p>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleAutoUpdate}
          disabled={isUpdating}
          className="flex-1 py-2.5 px-3 rounded-xl bg-[#fbf8f2] hover:bg-[#eee6d5] active:bg-[#e4dbca] text-[#0d3822] text-xs font-bold shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 border border-[#e4d9c4]"
        >
          {isUpdating ? (
            <>
              <i className="fa-solid fa-rotate fa-spin text-[11px]" />
              <span>កំពុងផ្ទុក...</span>
            </>
          ) : (
            <>
              <i className="fa-solid fa-rotate-right text-[11px]" />
              <span>អាប់ដេតឥឡូវនេះ</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="py-2.5 px-3 rounded-xl bg-transparent hover:bg-[#15462c] text-[#fbf8f2] text-xs font-bold border border-[#2d6c46] transition-colors cursor-pointer"
        >
          ពេលក្រោយ
        </button>
      </div>
    </div>
  );
}
