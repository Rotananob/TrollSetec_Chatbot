'use client';

import { useState, useEffect, useRef } from 'react';

export default function PwaUpdatePrompt() {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const clientBuildTimeRef = useRef(null);
  const registrationRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Fetch initial version stamp to establish baseline for this session
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

    // 2. Check for new version by comparing build timestamp
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

      // Also trigger service worker background update check
      if (registrationRef.current) {
        registrationRef.current.update().catch(() => {});
      }
    };

    // 3. Register Service Worker with active update listeners
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        registrationRef.current = reg;

        // Check if there is already a waiting worker
        if (reg.waiting) {
          setHasUpdate(true);
        }

        // Listen for new worker installation
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

    // 4. Polling for updates every 45 seconds
    const intervalTimer = setInterval(checkForUpdate, 45000);

    // 5. Check when user switches back to the tab / resumes PWA
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdate();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', checkForUpdate);

    return () => {
      clearInterval(intervalTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', checkForUpdate);
    };
  }, []);

  // Handle User Clicking "Auto Update"
  const handleAutoUpdate = async () => {
    setIsUpdating(true);

    try {
      // 1. Purge all CacheStorage caches
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((k) => caches.delete(k)));
      }

      // 2. Notify Service Worker to skip waiting
      if (registrationRef.current && registrationRef.current.waiting) {
        registrationRef.current.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      // 3. Force registration update
      if (registrationRef.current) {
        await registrationRef.current.update().catch(() => {});
      }
    } catch {}

    // 4. Hard reload page to fetch fresh HTML & JS bundles
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };

  if (!hasUpdate || isDismissed) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-[99999] max-w-sm w-[calc(100%-2rem)] sm:w-96 bg-gray-900/95 backdrop-blur-md text-white rounded-2xl p-4 sm:p-4.5 shadow-2xl border border-gray-700/80 animate-in slide-in-from-bottom-5 duration-200"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight">
            មានកំណែ Update ថ្មី (New Version)
          </h3>
        </div>

        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="text-gray-400 hover:text-white transition-colors p-1 -mr-1 -mt-1 cursor-pointer"
          title="បិទ"
        >
          <i className="fa-solid fa-xmark text-xs" />
        </button>
      </div>

      {/* Description */}
      <p className="text-xs text-gray-300 leading-relaxed mb-3">
        ប្រព័ន្ធទើបតែមានការ Update មុខងារថ្មី! សូមចុចប៊ូតុងខាងក្រោមដើម្បី Update ដោយស្វ័យប្រវត្តិ។
      </p>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleAutoUpdate}
          disabled={isUpdating}
          className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:scale-[0.98] text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
        >
          {isUpdating ? (
            <>
              <i className="fa-solid fa-rotate fa-spin text-[11px]" />
              <span>កំពុង Update...</span>
            </>
          ) : (
            <>
              <i className="fa-solid fa-rotate-right text-[11px]" />
              <span>Update ភ្លាមៗ (Auto Update)</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="py-2 px-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium transition-colors cursor-pointer"
        >
          ពេលក្រោយ
        </button>
      </div>
    </div>
  );
}
