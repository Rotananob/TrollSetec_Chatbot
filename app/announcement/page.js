'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AnnouncementPage() {
  const [isPlaying, setIsPlaying] = useState(false);

  const announcementText = `មុននឹងចាប់ផ្ដើមឆាត សូមបញ្ជាក់ថា រាល់ការឆ្លើយតបទាំងអស់នេះ គឺជាការគិត និងនិយាយដោយស្វ័យប្រវត្តផ្ទាល់ចេញពី AI សុទ្ធសាធ។ នេះជាទីលានតេស្តបច្ចេកវិទ្យា AI សាកល្បង ដែលបង្កើតឡើងក្នុងគោលបំណង សប្បាយ និងបំបាត់ស្ត្រេសប៉ុណ្ណោះ។ លើសពីនេះ គាត់ថែមទាំងកំណត់ឱ្យ AI អាចរៀនពីជីវិតពិតរបស់មនុស្ស និងរៀនពាក្យស្លោកខ្មែរ ដើម្បីចែករំលែកទៅដូចមនុស្ស ដើម្បីបង្កើតភាពស្និទ្ធស្នាល និង Chill បែប Gen Z។ ដូច្នេះ បើ AI RoastBot នេះ ឆ្លើយតបមានពាក្យសម្ដីខឹង ឈ្លើយ ឬប៉ះពាល់ដល់អារម្មណ៍អ្នកទាំងអស់គ្នា ឬលើសលស់ជ្រុលហួសពីការគិត សូមកុំប្រកាន់ ខឹង ឬមកស្ដីបន្ទោសឱ្យអ្នកបង្កើតអី ព្រោះ AI ប្រាកដណាស់អាចនឹងលេងលើសព្រំដែនដោយសារតែបានបន្ធូរបន្ថយច្បាប់រឹតបន្តឹង ពួកយើងសូមអភ័យទោសទុកជាមុន។ បើសម្រេចចិត្តចូលឆាត នោះមានន័យថាអ្នកយល់ព្រមលេងសប្បាយ និងលែងប្រកាន់លើ Model AI នេះហើយ។`;

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
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-xs font-semibold transition active:scale-95"
          >
            <i className="fas fa-arrow-left"></i>
            <span>ត្រឡប់ទៅទំព័រដើម</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/privacy"
              className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-cyan-400 text-xs font-semibold transition active:scale-95 flex items-center gap-1.5"
            >
              <i className="fas fa-shield-halved text-cyan-400"></i>
              <span>គោលការណ៍ឯកជនភាព</span>
            </Link>
          </div>
        </div>

        {/* Announcement Card */}
        <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 via-slate-900/90 to-slate-900/95 p-5 sm:p-7 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Header */}
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-amber-500/20">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 text-xl shadow-inner shrink-0">
              <i className="fas fa-bullhorn"></i>
            </div>
            <div>
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase tracking-wider mb-1">
                សេចក្ដីប្រកាសផ្លូវការ • AI Testing Field
              </div>
              <h1 className="text-base sm:text-lg font-black text-white">
                សេចក្ដីជូនដំណឹង និងសេចក្ដីប្រកាសអំពីទីលានតេស្ត AI
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Troll SETEC Chatbot Sandbox • បង្កើតឡើងដោយ Rotana NOB
              </p>
            </div>
          </div>

          {/* Audio Player Box */}
          <div className="mb-5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={handleToggleAudio}
                className="w-10 h-10 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center text-base shadow-lg shadow-amber-500/30 transition active:scale-95 shrink-0 cursor-pointer"
                title={isPlaying ? 'ផ្អាកការអាន' : 'ចុចស្ដាប់សំឡេងអានសេចក្ដីជូនដំណឹង'}
              >
                <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-volume-high'}`}></i>
              </button>
              <div className="min-w-0">
                <div className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
                  <span>AI កំពុងអាន Note ជូនអ្នក</span>
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
          <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
            <section className="space-y-1.5">
              <h2 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <i className="fas fa-flask text-xs"></i>
                <span>១. សេចក្ដីប្រកាសអំពីទីលានតេស្តបច្ចេកវិទ្យា AI</span>
              </h2>
              <p>
                ប្រព័ន្ធនេះជាទីលានតេស្តបច្ចេកវិទ្យា AI សាកល្បង Experimental Sandbox ដែលបង្កើតឡើងដោយ Rotana NOB ក្នុងគោលបំណងកម្សាន្ត រៀនសូត្រពីសមត្ថភាព AI ជំនាន់ថ្មី និងបំបាត់ស្ត្រេសប៉ុណ្ណោះ។
              </p>
            </section>

            <section className="space-y-1.5">
              <h2 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <i className="fas fa-building-columns text-xs"></i>
                <span>២. មិនមែនជាស្ថាប័នផ្លូវការ</span>
              </h2>
              <p>
                កម្មវិធីនេះមិនមែនជាទំព័រផ្លូវការរបស់សាលា SETEC Institute ឡើយ ហើយមិនមានចេតនាបង្ខូចកេរ្តិ៍ឈ្មោះ ឬប្រមាថស្ថាប័នណាមួយឡើយ។ ខ្លឹមសារលេងសើចទាំងអស់គឺស្ថិតក្នុងក្របខ័ណ្ឌទីលានតេស្តកម្សាន្ត។
              </p>
            </section>

            <section className="space-y-1.5">
              <h2 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <i className="fas fa-robot text-xs"></i>
                <span>៣. ធម្មជាតិនៃការឆ្លើយតបរបស់ AI RoastBot</span>
              </h2>
              <p>
                រាល់ការឆ្លើយតបគឺជាការគិត និងនិយាយដោយស្វ័យប្រវត្តផ្ទាល់ចេញពី AI សុទ្ធសាធ។ លើសពីនេះ AI ត្រូវបានកំណត់ឱ្យរៀនពីជីវិតពិតរបស់មនុស្ស និងរៀនពាក្យស្លោកខ្មែរ ដើម្បីចែករំលែកទៅដូចមនុស្ស និងបង្កើតភាពស្និទ្ធស្នាលបែប Gen Z។
              </p>
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-100 text-xs leading-relaxed">
                <i className="fas fa-hand-holding-heart mr-1.5 text-amber-400"></i>
                ដូច្នេះ ប្រសិនបើ AI RoastBot នេះ ឆ្លើយតបមានពាក្យសម្ដីខឹង ឈ្លើយ ឬប៉ះពាល់ដល់អារម្មណ៍អ្នកទាំងអស់គ្នា ឬលើសលស់ជ្រុលហួសពីការគិត សូមកុំប្រកាន់ ខឹង ឬមកស្ដីបន្ទោសឱ្យអ្នកបង្កើតអី ព្រោះ AI ប្រាកដណាស់អាចនឹងលេងលើសព្រំដែនដោយសារតែបានបន្ធូរបន្ថយច្បាប់រឹតបន្តឹង ពួកយើងសូមអភ័យទោសទុកជាមុន។
              </div>
            </section>

            <section className="space-y-1.5">
              <h2 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <i className="fas fa-shield-halved text-xs"></i>
                <span>៤. វិន័យ និងសុវត្ថិភាពក្នុងទីលានតេស្ត</span>
              </h2>
              <p>
                ទីលានតេស្តនេះបើកទូលាយសម្រាប់អ្នកលេងទាំងអស់ ប៉ុន្តែសូមកុំព្យាយាម Spam វាយប្រហារបំបែកប្រព័ន្ធ Jailbreak ឬប្រើប្រាស់ពាក្យគំរាមកំហែងដែលបង្កអសន្តិសុខ។
              </p>
            </section>

            <section className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs italic">
              បើសម្រេចចិត្តចូលឆាត នោះមានន័យថាអ្នកយល់ព្រមលេងសប្បាយ និងលែងប្រកាន់លើ Model AI នេះហើយ។
            </section>
          </div>

          {/* Accept & Play Buttons */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col sm:flex-row gap-3">
            <Link
              href="/KonBong"
              className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs sm:text-sm text-center shadow-lg shadow-cyan-600/20 transition flex items-center justify-center gap-2 active:scale-95"
            >
              <i className="fas fa-check-circle"></i>
              <span>យល់ព្រម និងទៅជជែកជាមួយ កូនច្បង</span>
            </Link>
            <Link
              href="/KonPov"
              className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:from-pink-500 hover:via-rose-500 hover:to-purple-500 text-white font-black text-xs sm:text-sm text-center shadow-lg shadow-pink-600/20 transition flex items-center justify-center gap-2 active:scale-95"
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
