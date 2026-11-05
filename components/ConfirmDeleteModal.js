'use client';

import React from 'react';

export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'តើអ្នកពិតជាចង់លុបមែនទេ?',
  description = 'រាល់សារ និងប្រវត្តិជជែកទាំងអស់នឹងត្រូវលុបចេញជារៀងរហូត មិនអាចទាញយកមកវិញបានឡើយ!',
  confirmText = 'លុបចេញភ្លាម',
  cancelText = 'ទុកសិន (កុំទាន់លុប)',
  isDark = true
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in font-['Kantumruy_Pro',sans-serif]">
      <div
        className={`border rounded-3xl shadow-2xl p-6 sm:p-7 max-w-sm w-full text-center relative overflow-hidden animate-bounce-short ${
          isDark
            ? 'bg-slate-900 border-rose-500/30 text-white'
            : 'bg-white border-rose-200 text-slate-900'
        }`}
      >
        {/* Animated Trash / Warning Icon */}
        <div className="w-14 h-14 bg-gradient-to-tr from-rose-500/20 to-red-500/20 border border-rose-400/40 rounded-2xl mx-auto mb-3.5 flex items-center justify-center shadow-lg shadow-rose-500/20">
          <i className="fas fa-trash-can text-rose-500 text-2xl animate-pulse"></i>
        </div>

        <h3 className="text-base sm:text-lg font-black text-rose-500 mb-1 tracking-tight">
          {title}
        </h3>

        <p
          className={`text-xs font-medium leading-relaxed mb-4 ${
            isDark ? 'text-slate-300' : 'text-slate-600'
          }`}
        >
          {description}
        </p>

        {/* Troll tip note */}
        <div
          className={`text-[10px] p-2.5 rounded-xl border mb-5 font-semibold text-center leading-normal ${
            isDark
              ? 'bg-slate-950/60 border-slate-800 text-slate-400'
              : 'bg-rose-50/70 border-rose-100 text-rose-700'
          }`}
        >
          <i className="fas fa-triangle-exclamation mr-1 text-amber-400"></i>
          លុបហើយមិនអាចយកមកវិញបានទេណា៎! បើចង់ជជែកថ្មីក៏អាចបង្កើត New Chat បានដែរ។
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className={`py-2.5 px-3 rounded-xl font-bold text-xs transition cursor-pointer active:scale-95 border ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
            }}
            className="py-2.5 px-3 rounded-xl font-bold text-xs transition cursor-pointer active:scale-95 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-md shadow-rose-600/30 border border-rose-400/40 flex items-center justify-center gap-1.5"
          >
            <i className="fas fa-trash text-[11px]"></i>
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
