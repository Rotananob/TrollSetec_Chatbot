'use client';

import React from 'react';

export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'តើអ្នកពិតជាចង់លុបមែនទេ?',
  description = 'រាល់សារ និងប្រវត្តិជជែកទាំងអស់នឹងត្រូវលុបចេញជារៀងរហូត មិនអាចទាញយកមកវិញបានឡើយ',
  confirmText = 'លុបចេញភ្លាម',
  cancelText = 'ទុកសិន មិនទាន់លុប',
  isDark = true
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in font-['Kantumruy_Pro',sans-serif]">
      <div className="border border-[#25613e] rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-7 max-w-sm w-full text-center relative overflow-hidden animate-scale-up bg-[#0d3822] text-[#fbf8f2]">
        {/* Warning Icon */}
        <div className="w-14 h-14 bg-[#fbf8f2] border border-[#e4d9c4] rounded-2xl mx-auto mb-3.5 flex items-center justify-center shadow-md text-[#0d3822]">
          <i className="fas fa-trash-can text-2xl"></i>
        </div>

        <h3 className="text-base sm:text-lg font-bold text-[#fbf8f2] mb-1">
          {title}
        </h3>

        <p className="text-xs font-normal leading-relaxed mb-4 text-[#d7ccb7]">
          {description}
        </p>

        {/* Note */}
        <div className="text-[11px] p-3 rounded-xl border border-[#235e3c] mb-5 font-normal text-center leading-relaxed bg-[#124229] text-[#d7ccb7]">
          <i className="fas fa-circle-exclamation mr-1.5 text-[#fbf8f2]"></i>
          លុបហើយមិនអាចយកមកវិញបានទេណា៎ បើចង់ជជែកថ្មីក៏អាចបង្កើត New Chat បានដែរ
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="py-3 px-3 rounded-xl font-bold text-xs transition cursor-pointer active:scale-95 border border-[#2d6c46] bg-transparent hover:bg-[#15462c] text-[#fbf8f2]"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
            }}
            className="py-3 px-3 rounded-xl font-bold text-xs transition cursor-pointer active:scale-95 bg-[#fbf8f2] hover:bg-[#eee6d5] active:bg-[#e4dbca] text-[#0d3822] shadow-md border border-[#e4d9c4] flex items-center justify-center gap-1.5"
          >
            <i className="fas fa-trash text-[11px]"></i>
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
