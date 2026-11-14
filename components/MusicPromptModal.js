'use client';

import React, { useState } from 'react';

const ROAST_TOPICS = [
  { id: 'csharp', label: 'ប្រឡងធ្លាក់ C# សង $45', icon: 'fa-code', tag: 'Re-exam $45' },
  { id: 'stairs', label: 'ដើរឡើងជណ្តើរ ៥ ជាន់គ្មានជណ្តើរយន្ត', icon: 'fa-walking', tag: 'Cardio 5 Floors' },
  { id: 'wifi', label: 'WiFi សាលា setec86a គាំងដូចខ្យង', icon: 'fa-wifi', tag: 'Laggy Wi-Fi' },
  { id: 'deadline', label: 'Deadline ម៉ោង 11:59 PM នៅអង្គុយលេង Game', icon: 'fa-clock', tag: 'Procrastination' },
  { id: 'attendance', label: 'គ្រូហៅឈ្មោះឆ្លើយ Present ពេលកំពុងងងុយដេក', icon: 'fa-bed', tag: 'Attendance' },
  { id: 'assignment', label: 'កូដ Copy ពី ChatGPT ត្រូវគ្រូចាប់បាន', icon: 'fa-robot', tag: 'Copied Code' }
];

const GENRES = [
  { id: 'rap', label: 'Hip-Hop Diss Track', bpm: '120 BPM', icon: 'fa-microphone-alt', desc: 'Fast 808 Bass & Rap' },
  { id: 'rock', label: 'Punk Rock Roast', bpm: '140 BPM', icon: 'fa-guitar', desc: 'Distorted Guitars & Energy' },
  { id: 'folk', label: 'Comedy Folk Troll', bpm: '95 BPM', icon: 'fa-music', desc: 'Acoustic Khmer Humor' },
  { id: 'lofi', label: 'Cyber Lo-Fi Diss', bpm: '85 BPM', icon: 'fa-headphones', desc: 'Chillhop & Sarcasm' }
];

export default function MusicPromptModal({
  isOpen,
  onClose,
  onSubmit,
  botPersona = 'កូនទី២',
  isGenerating = false
}) {
  const [selectedTopic, setSelectedTopic] = useState('csharp');
  const [selectedGenre, setSelectedGenre] = useState('rap');
  const [customPrompt, setCustomPrompt] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const finalTopic = customPrompt.trim()
      ? customPrompt.trim()
      : ROAST_TOPICS.find((t) => t.id === selectedTopic)?.label || 'ប្រឡងធ្លាក់ C# សង $45';

    onSubmit({
      prompt: finalTopic,
      topic: selectedTopic,
      genre: selectedGenre
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in font-['Kantumruy_Pro',sans-serif]">
      <div
        className="w-full max-w-lg rounded-2xl sm:rounded-3xl p-5 md:p-6 bg-gradient-to-b from-[#0a2919] via-[#082215] to-[#04140c] border border-[#008744]/60 text-[#fbf8f2] shadow-2xl shadow-emerald-950/80 relative overflow-hidden animate-scale-up max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow ambient background circles */}
        <div className="absolute -top-16 -right-16 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-green-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isGenerating}
          type="button"
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer text-[#d7ccb7] hover:text-white bg-[#124229] hover:bg-[#165032] border border-[#235e3c] disabled:opacity-50"
          title="បិទ"
        >
          <i className="fas fa-times text-xs"></i>
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-[#14472c]">
          <div className="relative shrink-0">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-slate-950 text-xl font-black shadow-lg shadow-emerald-950">
              🎵
            </div>
            <span className="absolute -bottom-1 -right-1 text-[9px] bg-red-600 text-white font-extrabold px-1.5 py-0.2 rounded-full border border-black animate-pulse">
              ROAST
            </span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-emerald-900 bg-emerald-300 px-2 py-0.5 rounded-full">
                AI Roast Music Studio
              </span>
              <span className="text-[10px] font-bold text-zinc-400">
                Lyria 3.5 & Vocal Rap
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-normal mt-0.5">
              បង្កើតភ្លេង Roast ជាមួយ {botPersona}
            </h3>
            <p className="text-[11px] text-[#d7ccb7]">
              ជ្រើសរើសប្រធានបទឌឺដងសិស្ស SETEC និងស្ទាយភ្លេងដែលអ្នកពេញចិត្ត
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Quick Topic Selector */}
          <div>
            <label className="block text-xs font-bold text-emerald-300 mb-2 flex items-center gap-1.5">
              <i className="fas fa-fire-alt text-amber-400"></i>
              <span>១. ជ្រើសរើសប្រធានបទ Roast សិស្ស SETEC</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ROAST_TOPICS.map((t) => {
                const isSelected = selectedTopic === t.id && !customPrompt.trim();
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setSelectedTopic(t.id);
                      setCustomPrompt('');
                    }}
                    className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600/30 border-emerald-400 text-white shadow-md shadow-emerald-950'
                        : 'bg-[#0d3320] hover:bg-[#124229] border-[#1d5236] text-zinc-300'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                        isSelected ? 'bg-emerald-400 text-slate-950 font-bold' : 'bg-[#15462c] text-emerald-300'
                      }`}
                    >
                      <i className={`fas ${t.icon}`}></i>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold truncate leading-tight">{t.label}</div>
                      <div className="text-[9px] text-emerald-400/80 font-mono">{t.tag}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Custom Topic Textarea */}
          <div>
            <label className="block text-xs font-bold text-[#d7ccb7] mb-1.5 flex items-center gap-1.5">
              <i className="fas fa-pen text-emerald-400"></i>
              <span>ឬបញ្ចូលគំនិត Roast ផ្ទាល់ខ្លួន៖</span>
            </label>
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="ឧទាហរណ៍៖ Roast ពួកចូលរៀនម៉ោង ៧ តែមកដល់ម៉ោង ៩..."
              maxLength={120}
              className="w-full px-3 py-2 text-xs rounded-xl bg-[#0d3320] border border-[#1d5236] focus:border-emerald-400 focus:outline-hidden text-white placeholder-zinc-500 transition"
            />
          </div>

          {/* 3. Genre Selector */}
          <div>
            <label className="block text-xs font-bold text-emerald-300 mb-2 flex items-center gap-1.5">
              <i className="fas fa-compact-disc text-emerald-400"></i>
              <span>២. ជ្រើសរើសស្ទាយភ្លេង (Music Genre & Beat)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {GENRES.map((g) => {
                const isSelected = selectedGenre === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelectedGenre(g.id)}
                    className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600/30 border-emerald-400 text-white shadow-md shadow-emerald-950'
                        : 'bg-[#0d3320] hover:bg-[#124229] border-[#1d5236] text-zinc-300'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                        isSelected ? 'bg-emerald-400 text-slate-950 font-bold' : 'bg-[#15462c] text-emerald-300'
                      }`}
                    >
                      <i className={`fas ${g.icon}`}></i>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold truncate leading-tight">{g.label}</div>
                      <div className="text-[9px] text-emerald-400/80 font-mono">{g.bpm}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isGenerating}
              className="w-full py-3 px-4 rounded-xl font-black text-sm bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 hover:from-emerald-400 hover:to-green-400 text-slate-950 shadow-lg shadow-emerald-950/80 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  <span>កំពុងតែងទំនុកច្រៀង និងបង្កើតភ្លេង Roast...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-play-circle text-base"></i>
                  <span>🔥 បង្កើតភ្លេង Roast ឥឡូវនេះ (Drop The Beat)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
