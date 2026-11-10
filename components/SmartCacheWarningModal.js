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
        className="w-full max-w-md rounded-2xl sm:rounded-3xl bg-[#0d3822] border border-[#25613e] text-[#fbf8f2] shadow-2xl shadow-black/80 overflow-hidden flex flex-col animate-scale-up relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Human Design: Deep Forest Green + Warm Milk */}
        <div className="px-5 py-4 border-b border-[#1c4d32] bg-[#092818] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <img
                src="/img/icon.jpg"
                alt="SETEC"
                className="w-11 h-11 rounded-xl object-cover border-2 border-[#fbf8f2] shadow-sm"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '/img/logo.jpg';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-[#0d3822] bg-[#fbf8f2] border border-[#e2d8c3] px-2.5 py-0.5 rounded-full shadow-xs">
                  វិទ្យាស្ថាន ស៊ីតិច
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-[#fbf8f2] mt-1">
                ការគ្រប់គ្រងទិន្នន័យចាស់
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="w-8 h-8 rounded-full bg-[#14472c] hover:bg-[#1a5535] text-[#d7ccb7] hover:text-[#fbf8f2] border border-[#276a44] flex items-center justify-center transition cursor-pointer active:scale-95 shrink-0"
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
              <div className="w-14 h-14 mx-auto rounded-full bg-[#fbf8f2] border border-[#e4d9c4] flex items-center justify-center text-2xl text-[#0d3822] shadow-md">
                <i className="fas fa-check"></i>
              </div>
              <h4 className="text-base sm:text-lg font-bold text-[#fbf8f2]">
                បានសម្អាតរួចរាល់ដោយជោគជ័យ
              </h4>
              <p className="text-xs text-[#d7ccb7] leading-relaxed max-w-sm mx-auto">
                ប្រព័ន្ធបានសម្អាតឯកសារសំឡេងចាស់ៗចំនួន <b className="text-[#fbf8f2] font-bold">{cleanResult.cleanedCount} ឯកសារ</b> រួចរាល់។ ពេលនេះឧបករណ៍របស់អ្នកស្រាល និងដំណើរការរលូនល្អដូចដើមវិញហើយ។
              </p>
              <div className="p-3.5 rounded-2xl bg-[#124229] border border-[#235e3c] text-xs text-[#d7ccb7] flex items-center justify-between">
                <span>ទំហំដែលបានរំដោះរួច៖</span>
                <span className="font-bold text-[#fbf8f2] text-sm">{cleanResult.freedMB} MB</span>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 px-4 rounded-xl bg-[#fbf8f2] hover:bg-[#eee6d5] active:bg-[#e4dbca] text-[#0d3822] text-xs font-bold transition shadow-md cursor-pointer border border-[#e4d9c4]"
                >
                  <i className="fas fa-check mr-1.5"></i> រួចរាល់
                </button>
              </div>
            </div>
          ) : (
            /* Warning / Recommendation State */
            <>
              {/* Warm Milk Notice Card - ទឹកដោះគោ Card inside បៃតងដិត Container */}
              <div className="p-4 rounded-2xl bg-[#faf5ea] text-[#0d3822] border border-[#e4d9c4] shadow-sm space-y-2">
                <div className="flex items-center gap-2 text-[#0d3822] text-xs font-bold">
                  <span className="w-5 h-5 rounded-full bg-[#0d3822] text-[#fbf8f2] flex items-center justify-center text-[10px] shrink-0">
                    <i className="fas fa-info"></i>
                  </span>
                  <span>ប្រព័ន្ធបានពិនិត្យឃើញទិន្នន័យចាស់ៗកើនឡើង</span>
                </div>
                <p className="text-xs text-[#1a472d] leading-relaxed font-normal">
                  ដោយសារប្រព័ន្ធចាប់យកសំឡេង AI ដាក់ក្នុងទំហំផ្ទុកបណ្ដោះអាសន្នដើម្បីឱ្យចាក់ឡើងវិញបានរហ័ស ពេលនេះទិន្នន័យចាស់ៗបានកើនឡើងច្រើន។ ដើម្បីជៀសវាងបញ្ហាគាំង ឬរអាក់រអួលនៅពេលសន្ទនាទៅមុខទៀត សូមណែនាំឱ្យសម្អាតឯកសារចាស់ៗទាំងនោះចេញ។
                </p>
              </div>

              {/* Storage Metrics Cards */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3.5 rounded-2xl bg-[#124229] border border-[#235e3c]">
                  <span className="text-[11px] text-[#d7ccb7] block mb-1">ទំហំផ្ទុកបណ្ដោះអាសន្ន</span>
                  <div className="text-lg font-bold text-[#fbf8f2]">
                    {metrics.totalMB} <span className="text-xs font-normal text-[#d7ccb7]">MB</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#124229] border border-[#235e3c]">
                  <span className="text-[11px] text-[#d7ccb7] block mb-1">ឯកសារសំឡេងចាស់ៗ</span>
                  <div className="text-lg font-bold text-[#fbf8f2]">
                    {metrics.audioCount} <span className="text-xs font-normal text-[#d7ccb7]">ឯកសារ</span>
                  </div>
                </div>
              </div>

              {/* Progress Usage Bar */}
              <div className="p-3.5 rounded-2xl bg-[#124229] border border-[#235e3c] space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#d7ccb7]">ស្ថានភាពទំហំផ្ទុក</span>
                  <span className="font-bold text-[#fbf8f2]">{metrics.percentUsed}%</span>
                </div>
                <div className="w-full bg-[#082215] h-3 rounded-full overflow-hidden border border-[#1b4d31] p-0.5">
                  <div
                    className="h-full rounded-full transition-all duration-500 bg-[#fbf8f2]"
                    style={{ width: `${Math.max(6, Math.min(100, metrics.percentUsed))}%` }}
                  />
                </div>
              </div>

              {/* Safety Guarantee Point */}
              <div className="flex items-start gap-2.5 text-xs text-[#d7ccb7] bg-[#124229]/80 p-3 rounded-2xl border border-[#235e3c] leading-relaxed">
                <i className="fas fa-shield-halved text-[#fbf8f2] text-xs mt-0.5 shrink-0"></i>
                <span>
                  ការសម្អាតនេះមានសុវត្ថិភាពខ្ពស់ ដោយមិនប៉ះពាល់ដល់ឈ្មោះគណនី ការកំណត់ផ្ទាល់ខ្លួន ឬប្រវត្តិសារដែលអ្នកកំពុងជជែកឡើយ។
                </span>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex gap-2.5">
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="flex-1 py-3 px-3 rounded-xl bg-transparent hover:bg-[#15462c] text-[#fbf8f2] border border-[#2d6c46] text-xs font-bold transition cursor-pointer active:scale-95"
                >
                  ទុកពេលក្រោយ
                </button>
                <button
                  type="button"
                  onClick={handleCleanNow}
                  disabled={isCleaning}
                  className="flex-2 py-3 px-4 rounded-xl bg-[#fbf8f2] hover:bg-[#eee6d5] active:bg-[#e4dbca] text-[#0d3822] text-xs font-bold transition shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50 border border-[#e4d9c4]"
                >
                  {isCleaning ? (
                    <>
                      <i className="fas fa-spinner fa-spin text-[#0d3822]"></i>
                      <span>កំពុងសម្អាតទិន្នន័យ...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-broom text-[#0d3822]"></i>
                      <span>សម្អាតទិន្នន័យចាស់ឥឡូវនេះ</span>
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
