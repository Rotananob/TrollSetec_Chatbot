'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AnnouncementPage() {
  const [isPlaying, setIsPlaying] = useState(false);

  const announcementText = `មុននឹងចាប់ផ្ដើមឆាត សូមបញ្ជាក់ថា រាល់ការឆ្លើយតបទាំងអស់នេះ គឺជាការគិត និងនិយាយដោយស្វ័យប្រវត្តផ្ទាល់ចេញពី AI សុទ្ធសាធ។ អ្នកដែលបង្កើតឡើងមកនេះ គាត់គ្រាន់តែធ្វើក្នុងគោលបំណង សប្បាយ និងបំបាត់ស្ត្រេសប៉ុណ្ណោះ។ លើសពីនេះ គាត់ថែមទាំងកំណត់ឱ្យខ្ញុំជា AI អាចរៀនពីជីវិតពិតរបស់មនុស្ស និងរៀនពាក្យស្លោកខ្មែរផងដែរ ដើម្បីចែករំលែកទៅដូចមនុស្ស ដើម្បីបង្កើតភាពស្និទ្ធស្នាល និង Chill បែប Gen Z។ ដូច្នេះ បើ AI RoastBot នេះ ឆ្លើយតបមានពាក្យសម្ដីខឹង ឈ្លើយ ឬប៉ះពាល់ដល់អារម្មណ៍អ្នកទាំងអស់គ្នា ឬលើសលស់ជ្រុលហួសពីការគិត សូមកុំប្រកាន់ ខឹង ឬមកស្ដីបន្ទោសឱ្យអ្នកបង្កើតអី! ព្រោះ AI ប្រាកដណាស់អាចនឹងលេងលើសព្រំដែនដោយសារតែបានបន្ធូរបន្ថយច្បាប់រឹតបន្តឹង ពួកយើងសូមអភ័យទោសទុកជាមុន! បើសម្រេចចិត្តចូលឆាត នោះមានន័យថាអ្នកយល់ព្រមលេងសប្បាយ និងលែងប្រកាន់លើ Model AI នេះហើយ។`;

  const handleToggleAudio = () => {
    if (typeof window === 'undefined') return;
    if (isPlaying) {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(announcementText);
      utterance.lang = 'km-KH';
      utterance.rate = 0.95;
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      setIsPlaying(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 md:p-8 font-sans selection:bg-amber-500 selection:text-slate-950">
      <div className="max-w-2xl w-full mx-auto">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-xs font-semibold transition"
          >
            <i className="fas fa-arrow-left"></i>
            <span>ត្រឡប់ក្រោយ</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/privacy"
              className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-cyan-400 text-xs font-semibold transition"
            >
              <i className="fas fa-shield-halved mr-1 text-cyan-400"></i>
              គោលការណ៍ឯកជនភាព
            </Link>
          </div>
        </div>

        {/* Announcement Card */}
        <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 via-slate-900/90 to-slate-900/95 p-5 sm:p-7 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Header */}
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 text-base shadow-inner shrink-0">
              <i className="fas fa-triangle-exclamation"></i>
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-amber-300 flex items-center gap-2">
                <span>NOTE សំខាន់សម្រាប់អ្នកចូលមកតេសលេងនេះ</span>
              </h1>
              <p className="text-[11px] text-amber-200/70">សេចក្ដីជូនដំណឹង និងការបដិសេធការទទួលខុសត្រូវ (Sandbox Field Test Notice)</p>
            </div>
          </div>

          {/* Voice Player Bar */}
          <div className="mb-5 p-3 rounded-2xl bg-slate-950/70 border border-amber-500/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={handleToggleAudio}
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md transition ${
                  isPlaying
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold hover:brightness-110'
                }`}
                title={isPlaying ? 'ផ្អាកការអាន' : 'ស្ដាប់សេចក្ដីជូនដំណឹងជាសំឡេង'}
              >
                <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-volume-high'} text-sm`}></i>
              </button>
              <div className="min-w-0">
                <div className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
                  <span>AI កំពុងអាន Note ជូនអ្នក...</span>
                  {isPlaying && <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>}
                </div>
                <div className="text-[10px] text-slate-400">សំឡេងច្បាស់ល្អ ដំណើរការអានស្វ័យប្រវត្តិ</div>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase bg-amber-500/10 text-amber-300 border border-amber-500/30 shrink-0">
              {isPlaying ? 'Reading' : 'Audio Note'}
            </span>
          </div>

          {/* Announcement Body */}
          <div className="space-y-3.5 text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
            <p>
              មុននឹងចាប់ផ្ដើមឆាត សូមបញ្ជាក់ថា <strong className="text-white font-semibold">រាល់ការឆ្លើយតបទាំងអស់នេះ គឺជាការគិត និងនិយាយដោយស្វ័យប្រវត្តផ្ទាល់ចេញពី AI សុទ្ធសាធ</strong>។ អ្នកដែលបង្កើតឡើងមកនេះ គាត់គ្រាន់តែធ្វើក្នុងគោលបំណង <strong className="text-amber-300 font-semibold">សប្បាយ និងបំបាត់ស្ត្រេស</strong> ប៉ុណ្ណោះ។
            </p>
            <p>
              លើសពីនេះ គាត់ថែមទាំងកំណត់ឱ្យខ្ញុំជា AI អាចរៀនពីជីវិតពិតរបស់មនុស្ស និងរៀនពាក្យស្លោកខ្មែរផងដែរ ដើម្បីចែករំលែកទៅដូចមនុស្ស ដើម្បីបង្កើតភាពស្និទ្ធស្នាល និង Chill បែប Gen Z។
            </p>
            <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-amber-100/90 text-xs leading-relaxed">
              <i className="fas fa-hand-holding-heart mr-1.5 text-amber-400"></i>
              ដូច្នេះ បើ AI RoastBot នេះ ឆ្លើយតបមានពាក្យសម្ដីខឹង ឈ្លើយ ឬប៉ះពាល់ដល់អារម្មណ៍អ្នកទាំងអស់គ្នា ឬលើសលស់ជ្រុលហួសពីការគិត សូមកុំប្រកាន់ ខឹង ឬមកស្ដីបន្ទោសឱ្យអ្នកបង្កើតអី! ព្រោះ AI ប្រាកដណាស់អាចនឹងលេងលើសព្រំដែនដោយសារតែបានបន្ធូរបន្ថយច្បាប់រឹតបន្តឹង ពួកយើងសូមអភ័យទោសទុកជាមុន!
            </div>
            <p className="text-slate-400 text-xs italic">
              បើសម្រេចចិត្តចូលឆាត នោះមានន័យថាអ្នកយល់ព្រមលេងសប្បាយ និងលែងប្រកាន់លើ Model AI នេះហើយ។
            </p>
          </div>

          {/* Accept & Play Buttons */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col sm:flex-row gap-3">
            <Link
              href="/KonBong"
              className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs sm:text-sm text-center shadow-lg shadow-cyan-600/20 transition flex items-center justify-center gap-2"
            >
              <i className="fas fa-check-circle"></i>
              <span>យល់ព្រម និងទៅជជែកជាមួយ កូនច្បង</span>
            </Link>
            <Link
              href="/KonPov"
              className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:from-pink-500 hover:via-rose-500 hover:to-purple-500 text-white font-black text-xs sm:text-sm text-center shadow-lg shadow-pink-600/20 transition flex items-center justify-center gap-2"
            >
              <i className="fas fa-check-circle"></i>
              <span>យល់ព្រម និងទៅជជែកជាមួយ កូនពៅ</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-[11px] text-slate-500 mt-8">
        SETEC Meme AI Roastbot Field Test • Created with ❤️ by Rotana NOB
      </footer>
    </main>
  );
}
