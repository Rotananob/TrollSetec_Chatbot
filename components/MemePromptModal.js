'use client';

import React, { useState } from 'react';

const SUGGESTIONS = [
  'សិស្ស ស៊ីតិច ជិតដល់ថ្ងៃប្រឡង',
  'Crush មិនតបសារតែឃើញគេ Like រូបអ្នកផ្សេង',
  'កូដ Error ពេញមួយយប់ព្រឹកឡើងត្រូវ Present',
  'អង្គុយរៀនងងុយដេកត្រូវគ្រូដេញទាន់',
  'ដាច់លុយចាយចុងខែនៅ ស៊ីតិច',
  'សិស្សច្បងថាស្រួលទេដល់រៀនមែនទែនវិលមុខ'
];

export default function MemePromptModal({
  isOpen,
  onClose,
  onSubmit,
  botPersona = 'កូនពៅ',
  isGenerating = false
}) {
  const [promptInput, setPromptInput] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const finalPrompt = promptInput.trim();
    if (!finalPrompt) return;
    onSubmit(finalPrompt);
  };

  const handleSelectSuggestion = (text) => {
    setPromptInput(text);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in font-['Kantumruy_Pro',sans-serif]">
      <div
        className="w-full max-w-lg rounded-2xl sm:rounded-3xl p-5 md:p-6 bg-[#0d3822] border border-[#25613e] text-[#fbf8f2] shadow-2xl shadow-black/80 relative overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isGenerating}
          type="button"
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer text-[#d7ccb7] hover:text-[#fbf8f2] bg-[#14472c] hover:bg-[#1a5535] border border-[#276a44] disabled:opacity-50"
          title="បិទ"
        >
          <i className="fas fa-times text-xs"></i>
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-[#1c4d32]">
          <div className="relative shrink-0">
            <img
              src="/img/icon.jpg"
              alt="SETEC Chatbot"
              className="w-12 h-12 rounded-xl object-cover border-2 border-[#fbf8f2] shadow-sm shrink-0"
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
            <h3 className="text-sm sm:text-base font-bold text-[#fbf8f2] tracking-normal mt-0.5">
              តើចង់ឱ្យ {botPersona} បង្កើតរូបភាព Meme បែបណា?
            </h3>
            <p className="text-[11px] text-[#d7ccb7] font-normal">
              ជ្រើសរើសប្រធានបទកំប្លែងៗខាងក្រោម ឬបញ្ចូលគំនិតផ្ទាល់ខ្លួនរបស់អ្នក
            </p>
          </div>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-[#d7ccb7] mb-2 flex items-center gap-1.5">
            <i className="fas fa-lightbulb text-[#fbf8f2] text-xs"></i>
            <span>គំនិតពេញនិយមសម្រាប់សិស្ស ស៊ីតិច</span>
          </label>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1">
            {SUGGESTIONS.map((item, idx) => {
              const isSelected = promptInput === item;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSuggestion(item)}
                  className={`text-xs px-3 py-1.5 rounded-xl border text-left transition flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-[#fbf8f2] text-[#0d3822] border-[#fbf8f2] font-bold shadow-sm'
                      : 'bg-[#124229] hover:bg-[#164a2f] text-[#fbf8f2] border-[#235e3c]'
                  }`}
                >
                  <i className={`fas fa-sparkles text-[10px] ${isSelected ? 'text-[#0d3822]' : 'text-[#d7ccb7]'}`}></i>
                  <span>{item}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Prompt Input */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-xs font-bold text-[#d7ccb7] mb-1.5 flex items-center gap-1.5">
              <i className="fas fa-pen text-xs text-[#fbf8f2]"></i>
              <span>បញ្ចូលគំនិតរូបភាពតាមការស្រមើស្រមៃ</span>
            </label>
            <div className="relative">
              <textarea
                rows={3}
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="ឧទាហរណ៍ សិស្សម្នាក់កំពុងអង្គុយកូដដល់ម៉ោង ៣ យប់ ភ្នែកឡើងក្រហម"
                className="w-full text-xs sm:text-sm p-3.5 rounded-2xl border border-[#235e3c] bg-[#124229] text-[#fbf8f2] placeholder:text-[#8da698] font-medium outline-none focus:border-[#fbf8f2] transition resize-none leading-relaxed"
              />
              {promptInput && (
                <button
                  type="button"
                  onClick={() => setPromptInput('')}
                  className="absolute top-3 right-3 text-[#d7ccb7] hover:text-[#fbf8f2] text-xs p-1 cursor-pointer"
                  title="លុប"
                >
                  <i className="fas fa-times-circle"></i>
                </button>
              )}
            </div>
          </div>

          {/* Device Limit Notification - Warm Milk Card */}
          <div className="p-3 rounded-2xl text-xs flex items-center gap-2.5 mb-5 bg-[#faf5ea] text-[#0d3822] border border-[#e4d9c4] shadow-sm">
            <i className="fas fa-clock text-[#0d3822] text-sm shrink-0"></i>
            <span className="font-medium">កំណត់ ១ ឧបករណ៍អាចបង្កើតបាន ៥ សន្លឹកក្នុងរយៈពេល ១ ម៉ោង</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-[#14472c] hover:bg-[#1a5535] text-[#fbf8f2] border border-[#276a44] transition cursor-pointer active:scale-95 disabled:opacity-50"
            >
              បោះបង់
            </button>
            <button
              type="submit"
              disabled={!promptInput.trim() || isGenerating}
              className="px-5 py-2.5 rounded-xl font-bold text-xs text-[#0d3822] bg-[#fbf8f2] hover:bg-[#eee6d5] active:bg-[#e4dbca] border border-[#e4d9c4] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <i className="fas fa-circle-notch fa-spin text-xs text-[#0d3822]"></i>
                  <span>កំពុងបង្កើត...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-wand-magic-sparkles text-xs text-[#0d3822]"></i>
                  <span>បង្កើត Meme ឥឡូវនេះ</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
