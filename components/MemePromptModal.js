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
  isDark = true,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in font-['Kantumruy_Pro',sans-serif]">
      <div
        className={`w-full max-w-lg rounded-3xl p-5 md:p-6 shadow-2xl border transition-all relative overflow-hidden ${
          isDark
            ? 'bg-slate-900 border-purple-500/30 text-white shadow-[0_20px_60px_rgba(168,85,247,0.2)]'
            : 'bg-white border-purple-200 text-slate-800 shadow-[0_20px_50px_rgba(168,85,247,0.15)]'
        }`}
      >
        {/* Top Glow Accent */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-24 bg-gradient-to-r from-purple-500/20 to-pink-500/20 blur-2xl pointer-events-none rounded-full"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isGenerating}
          className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition ${
            isDark
              ? 'text-slate-400 hover:text-white hover:bg-slate-800'
              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
          }`}
          title="បិទ"
        >
          <i className="fas fa-times text-sm"></i>
        </button>

        {/* Modal Header */}
        <div className="text-center mb-5">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-400 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <i className="fas fa-wand-magic-sparkles text-white text-2xl animate-pulse"></i>
          </div>
          <h3 className="text-lg md:text-xl font-black tracking-tight mb-1">
            តើចង់ឱ្យ {botPersona} បង្កើត Meme បែបណា?
          </h3>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            ជ្រើសរើសប្រធានបទកំប្លែងៗខាងក្រោម ឬបញ្ចូលគំនិតផ្ទាល់ខ្លួនរបស់អ្នក
          </p>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="mb-4">
          <label className={`block text-[11px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${
            isDark ? 'text-purple-300' : 'text-purple-600'
          }`}>
            <i className="fas fa-lightbulb text-xs"></i>
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
                  className={`text-xs px-3 py-1.5 rounded-xl border text-left transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-500/30 scale-[1.02]'
                      : isDark
                      ? 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border-slate-700/70 hover:border-purple-500/50'
                      : 'bg-purple-50/70 hover:bg-purple-100/70 text-slate-700 border-purple-200 hover:border-purple-300'
                  }`}
                >
                  <i className={`fas fa-sparkles text-[10px] ${isSelected ? 'text-amber-300' : 'text-purple-400'}`}></i>
                  <span>{item}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Prompt Input */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5 ${
              isDark ? 'text-slate-300' : 'text-slate-700'
            }`}>
              <i className="fas fa-pen text-xs text-purple-400"></i>
              <span>បញ្ចូលគំនិតរូបភាពតាមការស្រមើស្រមៃ</span>
            </label>
            <div className="relative">
              <textarea
                rows={3}
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="ឧទាហរណ៍៖ សិស្សម្នាក់កំពុងអង្គុយកូដដល់ម៉ោង ៣ យប់ ភ្នែកឡើងក្រហម..."
                className={`w-full text-xs md:text-sm p-3 rounded-2xl border outline-none transition resize-none ${
                  isDark
                    ? 'bg-slate-950/70 border-slate-700 focus:border-purple-400 text-white placeholder-slate-500'
                    : 'bg-slate-50 border-slate-300 focus:border-purple-500 text-slate-900 placeholder-slate-400'
                }`}
              />
              {promptInput && (
                <button
                  type="button"
                  onClick={() => setPromptInput('')}
                  className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-1"
                  title="លុប"
                >
                  <i className="fas fa-times-circle"></i>
                </button>
              )}
            </div>
          </div>

          {/* Device Limit Notification */}
          <div className={`p-2.5 rounded-xl text-[11px] flex items-center gap-2 mb-5 border ${
            isDark
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            <i className="fas fa-clock text-amber-500 text-xs shrink-0"></i>
            <span>កំណត់ ១ ឧបករណ៍អាចបង្កើតបាន ១ សន្លឹកក្នុងរយៈពេល ១ ម៉ោង</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              បោះបង់
            </button>
            <button
              type="submit"
              disabled={!promptInput.trim() || isGenerating}
              className="px-5 py-2.5 rounded-xl font-black text-xs text-white bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25 transition flex items-center gap-2 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <i className="fas fa-circle-notch fa-spin text-xs"></i>
                  <span>កំពុងបង្កើត...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-wand-magic-sparkles text-xs"></i>
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
