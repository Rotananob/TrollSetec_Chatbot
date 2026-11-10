'use client';

import { useState, useEffect } from 'react';
import {
  getStorageMetrics,
  clearOldClientCache,
  recordCacheWarningDismissed
} from '../app/utils/clientCacheMonitor';

export default function SmartCacheWarningModal({
  isOpen,
  onClose,
  onCleared
}) {
  const [metrics, setMetrics] = useState({
    totalBytes: 0,
    totalMB: '0.00',
    audioBytes: 0,
    audioMB: '0.00',
    audioCount: 0,
    percentUsed: 0,
    isNearFull: false,
    isCritical: false
  });
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanResult, setCleanResult] = useState(null);

  // Refresh metrics when opened
  useEffect(() => {
    if (isOpen) {
      setMetrics(getStorageMetrics());
      setCleanResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDismiss = () => {
    recordCacheWarningDismissed();
    onClose();
  };

  const handleCleanNow = () => {
    setIsCleaning(true);
    setTimeout(() => {
      try {
        const res = clearOldClientCache();
        setCleanResult(res);
        setMetrics(getStorageMetrics());
        if (typeof onCleared === 'function') {
          onCleared(res);
        }
      } catch (err) {
        console.warn('Error clearing cache:', err);
      } finally {
        setIsCleaning(false);
      }
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in font-['Kantumruy_Pro',sans-serif]">
      <div
        className="w-full max-w-md rounded-2xl sm:rounded-3xl bg-[#0a1611] border border-emerald-900/60 text-slate-100 shadow-2xl shadow-black/80 overflow-hidden flex flex-col animate-scale-up relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Human-Designed Green Mode with Official SETEC Icon */}
        <div className="px-5 py-4 border-b border-emerald-900/60 bg-[#0e2118] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <img
                src="/img/icon.jpg"
                alt="SETEC Chatbot"
                className="w-11 h-11 rounded-xl object-cover border border-emerald-700/60 shadow-sm"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '/img/logo.jpg';
                }}
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0e2118]"></span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                  SETEC Storage Optimization
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-100 mt-0.5">
                ការគ្រប់គ្រងទិន្នន័យ Cache
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="w-8 h-8 rounded-full bg-emerald-950/50 hover:bg-emerald-900/80 text-slate-400 hover:text-white border border-emerald-800/50 flex items-center justify-center transition cursor-pointer active:scale-95 shrink-0"
            title="បិទផ្ទាំង"
          >
            <i className="fas fa-times text-xs"></i>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {cleanResult ? (
            /* Success State */
            <div className="py-4 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-900/40 border border-emerald-500/60 flex items-center justify-center text-2xl text-emerald-400 shadow-sm">
                <i className="fas fa-check"></i>
              </div>
              <h4 className="text-base sm:text-lg font-bold text-white">
                បានសម្អាតរួចរាល់ដោយជោគជ័យ
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                ប្រព័ន្ធបានសម្អាតឯកសារសំឡេងចាស់ៗចំនួន <b className="text-emerald-300 font-semibold">{cleanResult.cleanedCount} ឯកសារ</b> រួចរាល់។ ពេលនេះឧបករណ៍របស់អ្នកស្រាល និងដំណើរការរលូនល្អដូចដើមវិញហើយ។
              </p>
              <div className="p-3 rounded-xl bg-[#06120c] border border-emerald-900/70 text-xs text-slate-300 flex items-center justify-between">
                <span>ទំហំដែលបានរំដោះរួច៖</span>
                <span className="font-mono font-bold text-emerald-400">{cleanResult.freedMB} MB</span>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  <i className="fas fa-check mr-1.5"></i> រួចរាល់
                </button>
              </div>
            </div>
          ) : (
            /* Warning / Recommendation State */
            <>
              {/* Professional Reassurance Notice */}
              <div className="p-3.5 rounded-xl bg-[#06140d] border border-emerald-900/70 space-y-2">
                <div className="flex items-center gap-2 text-emerald-300 text-xs font-semibold">
                  <i className="fas fa-circle-info text-emerald-400 text-sm shrink-0"></i>
                  <span>ប្រព័ន្ធបានពិនិត្យឃើញទិន្នន័យ Cache កំពុងកើនឡើង</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-normal">
                  ដោយសារប្រព័ន្ធចាប់យកសំឡេង AI ដាក់ក្នុង Cache បណ្ដោះអាសន្នដើម្បីឱ្យចាក់ឡើងវិញលឿន ពេលនេះទិន្នន័យចាស់ៗបានកើនឡើងច្រើន។ ដើម្បីជៀសវាងបញ្ហាគាំង ឬរអាក់រអួលនៅពេលសន្ទនាទៅមុខទៀត សូមណែនាំឱ្យសម្អាតឯកសារចាស់ៗទាំងនោះចេញ។
                </p>
              </div>

              {/* Storage Metrics Cards */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-[#06120c] border border-emerald-900/70">
                  <span className="text-[10.5px] text-slate-400 block mb-1">ទំហំ Cache បណ្ដោះអាសន្ន</span>
                  <div className="text-lg font-bold text-emerald-400 font-mono">
                    {metrics.totalMB} <span className="text-xs text-slate-400 font-sans">MB</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#06120c] border border-emerald-900/70">
                  <span className="text-[10.5px] text-slate-400 block mb-1">ឯកសារសំឡេងចាស់ៗ</span>
                  <div className="text-lg font-bold text-emerald-400 font-mono">
                    {metrics.audioCount} <span className="text-xs text-slate-400 font-sans">ឯកសារ</span>
                  </div>
                </div>
              </div>

              {/* Progress Usage Bar */}
              <div className="p-3 rounded-xl bg-[#06120c] border border-emerald-900/70 space-y-1.5">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">ស្ថានភាពទំហំផ្ទុក Cache៖</span>
                  <span className="font-mono font-semibold text-emerald-300">{metrics.percentUsed}%</span>
                </div>
                <div className="w-full bg-[#030906] h-2 rounded-full overflow-hidden border border-emerald-950">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      metrics.isCritical
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.max(6, Math.min(100, metrics.percentUsed))}%` }}
                  />
                </div>
              </div>

              {/* Safety Guarantee Point */}
              <div className="flex items-start gap-2 text-[11px] text-slate-400 bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-900/40">
                <i className="fas fa-shield-halved text-emerald-400 text-xs mt-0.5 shrink-0"></i>
                <span>
                  ការសម្អាតនេះមានសុវត្ថិភាពខ្ពស់ ដោយមិនប៉ះពាល់ដល់ឈ្មោះគណនី ការកំណត់ផ្ទាល់ខ្លួន ឬប្រវត្តិសារដែលអ្នកកំពុងជជែកឡើយ។
                </span>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-transparent hover:bg-emerald-950/50 text-slate-300 hover:text-white border border-emerald-900/60 text-xs font-semibold transition cursor-pointer active:scale-95"
                >
                  ទុកពេលក្រោយ
                </button>
                <button
                  type="button"
                  onClick={handleCleanNow}
                  disabled={isCleaning}
                  className="flex-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold transition shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  {isCleaning ? (
                    <>
                      <i className="fas fa-spinner fa-spin text-emerald-200"></i>
                      <span>កំពុងសម្អាត Cache...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-broom text-emerald-200"></i>
                      <span>សម្អាត Cache ឥឡូវនេះ</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
