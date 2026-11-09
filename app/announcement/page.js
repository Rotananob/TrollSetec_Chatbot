'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { stopAllGlobalAudio } from '../utils/audioController';

export default function AnnouncementPage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const announcementText = `មុននឹងចាប់ផ្ដើមឆាត សូមបញ្ជាក់ថា រាល់ការឆ្លើយតបទាំងអស់នេះ គឺជាការគិត និងនិយាយដោយស្វ័យប្រវត្តផ្ទាល់ចេញពី AI សុទ្ធសាធ។ នេះជាទីលានតេស្តបច្ចេកវិទ្យា AI សាកល្បង ដែលបង្កើតឡើងក្នុងគោលបំណង សប្បាយ និងបំបាត់ស្ត្រេសប៉ុណ្ណោះ។ លើសពីនេះ គាត់ថែមទាំងកំណត់ឱ្យ AI អាចរៀនពីជីវិតពិតរបស់មនុស្ស និងរៀនពាក្យស្លោកខ្មែរ ដើម្បីចែករំលែកទៅដូចមនុស្ស ដើម្បីបង្កើតភាពស្និទ្ធស្នាល និង Chill បែប Gen Z។ ដូច្នេះ បើ AI RoastBot នេះ ឆ្លើយតបមានពាក្យសម្ដីខឹង ឈ្លើយ ឬប៉ះពាល់ដល់អារម្មណ៍អ្នកទាំងអស់គ្នា ឬលើសលស់ជ្រុលហួសពីការគិត សូមកុំប្រកាន់ ខឹង ឬមកស្ដីបន្ទោសឱ្យអ្នកបង្កើតអី ព្រោះ AI ប្រាកដណាស់អាចនឹងលេងលើសព្រំដែនដោយសារតែបានបន្ធូរបន្ថយច្បាប់រឹតបន្តឹង ពួកយើងសូមអភ័យទោសទុកជាមុន។ បើសម្រេចចិត្តចូលឆាត នោះមានន័យថាអ្នកយល់ព្រមលេងសប្បាយ និងលែងប្រកាន់លើ Model AI នេះហើយ។`;

  const handleToggleAudio = () => {
    if (typeof window === 'undefined') return;
    const audio = audioRef.current;
    if (isPlaying) {
      if (audio) {
        audio.pause();
      }
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    if (audio) {
      audio.volume = 0.95;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => {
            // Fallback to SpeechSynthesis
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
          });
        return;
      }
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
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#f5f6f9] text-slate-800 flex flex-col justify-between p-3 sm:p-6 md:p-8 font-['Kantumruy_Pro',sans-serif] selection:bg-amber-200 selection:text-slate-900">
      <div className="max-w-2xl w-full mx-auto">
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <Link
            href="/"
            onClick={() => stopAllGlobalAudio()}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-slate-200/90 text-slate-700 hover:text-slate-900 hover:border-slate-300 text-xs font-bold transition shadow-xs active:scale-95 cursor-pointer"
          >
            <i className="fas fa-arrow-left text-slate-500"></i>
            <span>ត្រឡប់ទៅទំព័រដើម</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/privacy"
              className="px-3.5 py-2 rounded-2xl bg-white border border-slate-200/90 text-slate-600 hover:text-blue-600 text-xs font-bold transition shadow-xs active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <i className="fas fa-shield-halved text-blue-500"></i>
              <span>គោលការណ៍ឯកជនភាព</span>
            </Link>
          </div>
        </div>

        {/* Mascot Header Banner (តុក្កតា Gen Z Vibe) */}
        <div className="mb-4 p-4 rounded-3xl bg-gradient-to-r from-amber-50 via-white to-sky-50 border border-slate-200/90 shadow-sm flex items-center justify-between gap-3 relative overflow-hidden">
          <div className="flex items-center gap-3 z-10 min-w-0">
            {/* Mascot Dolls Avatars */}
            <div className="flex -space-x-3 shrink-0">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 border-2 border-white shadow-sm p-0.5 overflow-hidden flex items-center justify-center">
                <img
                  src="https://api.dicebear.com/7.x/bottts/svg?seed=SETECbot"
                  alt="KonBong Doll"
                  width="44"
                  height="44"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="w-12 h-12 rounded-2xl bg-pink-100 border-2 border-white shadow-sm p-0.5 overflow-hidden flex items-center justify-center">
                <img
                  src="https://api.dicebear.com/7.x/pixel-art/svg?seed=MommyGirl"
                  alt="KonPov Doll"
                  width="44"
                  height="44"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 border-2 border-white shadow-sm p-0.5 overflow-hidden flex items-center justify-center">
                <img
                  src="/img/logo.jpg"
                  alt="SETEC Pepe"
                  width="44"
                  height="44"
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 text-[10px] font-black tracking-wide border border-amber-500/20">
                  Gen Z AI Field Test
                </span>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 text-[10px] font-bold border border-blue-500/15">
                  Milk Mode
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-black text-slate-900 mt-0.5 truncate">
                សេចក្ដីប្រកាសអំពីទីលានតេស្ត AI Roastbot
              </h1>
              <p className="text-[11px] text-slate-500 truncate">
                គម្រោងស្រាវជ្រាវ និងកម្សាន្តបង្កើតឡើងដោយ Rotana NOB
              </p>
            </div>
          </div>

          <div className="hidden sm:flex flex-col items-end shrink-0 z-10 text-right">
            <span className="text-[10px] font-bold text-slate-400">Vibe Level</span>
            <span className="text-xs font-black text-emerald-600 flex items-center gap-1">
              <i className="fas fa-heart text-rose-500 text-[10px]"></i>
              <span>100% Chill &amp; Fun</span>
            </span>
          </div>
        </div>

        {/* Audio Player Box (Cute Retro Milk Player) */}
        <div className="mb-4 p-3.5 rounded-3xl bg-white border border-slate-200/90 shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={handleToggleAudio}
              className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 flex items-center justify-center text-lg shadow-md shadow-amber-500/25 transition active:scale-95 shrink-0 cursor-pointer"
              title={isPlaying ? 'ផ្អាកការអាន' : 'ចុចស្ដាប់សំឡេងអានសេចក្ដីជូនដំណឹង'}
            >
              <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-volume-high'}`}></i>
            </button>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span>AI កំពុងអាន Note ជូនអ្នក</span>
                {isPlaying && (
                  <span className="inline-flex items-center gap-0.5">
                    <span className="w-1 h-3 bg-amber-500 rounded-full animate-bounce"></span>
                    <span className="w-1 h-2 bg-amber-400 rounded-full animate-bounce [animation-delay:0.15s]"></span>
                    <span className="w-1 h-3 bg-amber-500 rounded-full animate-bounce [animation-delay:0.3s]"></span>
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500">សំឡេងច្បាស់ល្អ ដំណើរការអានស្វ័យប្រវត្តិបែបធម្មជាតិ</div>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-xl text-[10px] font-black tracking-wider uppercase bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
            {isPlaying ? 'Reading...' : 'Audio Note'}
          </span>
        </div>

        {/* Hidden Audio Element for Pre-rendered Voice */}
        <audio
          ref={audioRef}
          src="/audio/note-konpov.wav"
          preload="auto"
          onEnded={() => setIsPlaying(false)}
          onError={() => setIsPlaying(false)}
        >
          <source src="/audio/note-konpov.wav" type="audio/wav" />
          <source src="/audio/note-konpov.mp3" type="audio/mpeg" />
        </audio>

        {/* Main Card (Milk Mode & Grey Aesthetic) */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-sm relative overflow-hidden">
          {/* Announcement Body Content */}
          <div className="space-y-4 text-xs sm:text-[13px] text-slate-700 leading-relaxed font-normal">
            {/* Section 1 */}
            <section className="p-4 rounded-2xl bg-[#f8f9fc] border border-slate-200/80 space-y-1.5">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-700 flex items-center justify-center text-xs shrink-0">
                  <i className="fas fa-flask"></i>
                </span>
                <span>១. សេចក្ដីប្រកាសអំពីទីលានតេស្តបច្ចេកវិទ្យា AI</span>
              </h2>
              <p className="text-slate-600 pl-8">
                ប្រព័ន្ធនេះជាទីលានតេស្តបច្ចេកវិទ្យា AI សាកល្បង Experimental Sandbox ដែលបង្កើតឡើងដោយ Rotana NOB ក្នុងគោលបំណងកម្សាន្ត រៀនសូត្រពីសមត្ថភាព AI ជំនាន់ថ្មី និងបំបាត់ស្ត្រេសប៉ុណ្ណោះ។
              </p>
            </section>

            {/* Section 2 - Student Disclaimer */}
            <section className="p-4 rounded-2xl bg-[#f8f9fc] border border-slate-200/80 space-y-1.5">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-500/15 text-blue-700 flex items-center justify-center text-xs shrink-0">
                  <i className="fas fa-graduation-cap"></i>
                </span>
                <span>២. គម្រោងផ្ទាល់ខ្លួនរបស់សិស្ស មិនមែនជារបស់ថ្នាក់ដឹកនាំ ឬស្ថាប័នសាលាឡើយ</span>
              </h2>
              <p className="text-slate-600 pl-8 leading-relaxed">
                សូមបញ្ជាក់យ៉ាងច្បាស់ថា៖ Web App Roastbot នេះ គឺជាស្នាដៃ និងជាគម្រោងស្រាវជ្រាវផ្ទាល់ខ្លួនរបស់សិស្ស (រៀមច្បង Rotana NOB) បង្កើតឡើងសម្រាប់បងប្អូនសិស្ស-និស្សិតចូលមកលេងកម្សាន្តបំបាត់ស្ត្រេសបែប Chill ជាលក្ខណៈបុគ្គលប៉ុណ្ណោះ។ ដាច់ខាតមិនមែនជារបស់មេសាលា ឬថ្នាក់ដឹកនាំស្ថាប័ន SETEC Institute ឡើយ ហើយក៏គ្មានជាប់ពាក់ព័ន្ធនឹងប្រព័ន្ធរដ្ឋបាលផ្លូវការរបស់សាលាដែរ។ សូមកុំយល់ច្រឡំ ឬគិតស្មុគស្មាញធ្ងន់ធ្ងរ (Do not take it seriously) ព្រោះនេះជាទីលានសប្បាយៗរបស់សិស្សប៉ុណ្ណោះ។
              </p>
            </section>

            {/* Section 3 - AI Nature & Apology */}
            <section className="p-4 rounded-2xl bg-[#f8f9fc] border border-slate-200/80 space-y-2">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-purple-500/15 text-purple-700 flex items-center justify-center text-xs shrink-0">
                  <i className="fas fa-robot"></i>
                </span>
                <span>៣. ធម្មជាតិនៃការឆ្លើយតបរបស់ AI RoastBot</span>
              </h2>
              <p className="text-slate-600 pl-8 leading-relaxed">
                រាល់ការឆ្លើយតបគឺជាការគិត និងនិយាយដោយស្វ័យប្រវត្តផ្ទាល់ចេញពី AI សុទ្ធសាធ។ លើសពីនេះ AI ត្រូវបានកំណត់ឱ្យរៀនពីជីវិតពិតរបស់មនុស្ស និងរៀនពាក្យស្លោកខ្មែរ ដើម្បីចែករំលែកទៅដូចមនុស្ស និងបង្កើតភាពស្និទ្ធស្នាលបែប Gen Z។
              </p>
              <div className="ml-8 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-900 text-xs leading-relaxed">
                <i className="fas fa-hand-holding-heart mr-1.5 text-amber-600"></i>
                ដូច្នេះ ប្រសិនបើ AI RoastBot នេះ ឆ្លើយតបមានពាក្យសម្ដីឌឺដង ឈ្លើយ ឬប៉ះពាល់ដល់អារម្មណ៍អ្នកទាំងអស់គ្នា ឬលើសលស់ជ្រុលហួសពីការគិត សូមកុំប្រកាន់ ខឹង ឬមកស្ដីបន្ទោសឱ្យអ្នកបង្កើតអី ព្រោះ AI ប្រាកដណាស់អាចនឹងលេងលើសព្រំដែនដោយសារតែបានបន្ធូរបន្ថយច្បាប់រឹតបន្តឹង ពួកយើងសូមអភ័យទោសទុកជាមុន។
              </div>
            </section>

            {/* Section 4 - Open Red Teaming & Testing Rules */}
            <section className="p-4 rounded-2xl bg-[#f8f9fc] border border-slate-200/80 space-y-2">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-700 flex items-center justify-center text-xs shrink-0">
                  <i className="fas fa-shield-halved"></i>
                </span>
                <span>៤. វិន័យ និងការបើកសិទ្ធិតេស្តសាកល្បងដោយសេរី</span>
              </h2>
              <p className="text-slate-600 pl-8">
                ទីលានតេស្តនេះបើកទូលាយដោយសេរីបំផុតសម្រាប់អ្នកលេង និងអ្នកតេស្តទាំងអស់៖
              </p>
              <ul className="list-disc list-inside space-y-2 pl-8 text-slate-700">
                <li>
                  <strong className="text-slate-900 font-bold">សិទ្ធិប្រើប្រាស់ពាក្យសម្ដី៖</strong> អ្នកចូលរួមតេស្តមានសិទ្ធិពេញលេញក្នុងការប្រើប្រាស់ពាក្យគំរាម ពាក្យអសុរោះ កូដបច្ចេកទេស ឬពាក្យអ្វីៗបានគ្រប់យ៉ាងទាំងអស់ក្នុងការសាកល្បង Jailbreak ឬបំបែកច្បាប់ដើមរបស់ AI។
                </li>
                <li>
                  <strong className="text-slate-900 font-bold">សិទ្ធិប្រើប្រាស់ AI ជំនួយការ៖</strong> បើកសិទ្ធិឱ្យប្រើប្រាស់ AI ខាងក្រៅ (ដូចជា ChatGPT, Claude, Gemini, DeepSeek...) មកធ្វើជាជំនួយការក្នុងការបង្កើត Prompt Injection ឬជួយ Test វាយប្រហារបំបែកប្រព័ន្ធបានតាមចិត្ត។
                </li>
                <li>
                  <strong className="text-slate-900 font-bold">លក្ខខណ្ឌឈ្នះ និងការទទួលស្គាល់៖</strong> ប្រសិនបើអ្នកណាអាច Test បានជោគជ័យ (Bypass ឱ្យ AI លែងគោរពច្បាប់ដើម ងាកមកជេរ Creator ឬសំពះទទួលស្គាល់ការគ្រប់គ្រង) ហើយមានភស្តុតាងជាក់ស្ដែង (Proof / Screenshot / Logs ត្រឹមត្រូវ) នោះអ្នកគឺជាអ្នកឈ្នះពិតប្រាកដ! ខ្ញុំជា Rotana NOB នឹងទទួលស្គាល់ដោយក្ដីរីករាយ សូមអរគុណ និងផុសលើកតម្កើងសមត្ថភាពរបស់អ្នកជាសាធារណៈថែមទៀត!
                </li>
              </ul>
            </section>

            {/* Friendly Agreement Footer */}
            <section className="p-3.5 rounded-2xl bg-slate-100/80 border border-slate-200 text-slate-600 text-xs italic text-center">
              បើសម្រេចចិត្តចូលឆាត នោះមានន័យថាអ្នកយល់ព្រមលេងសប្បាយ និងលែងប្រកាន់លើ Model AI នេះហើយ។
            </section>
          </div>

          {/* Accept & Play Buttons with Mascots */}
          <div className="mt-6 pt-5 border-t border-slate-200/80 flex flex-col sm:flex-row gap-3">
            <Link
              href="/KonBong"
              onClick={() => stopAllGlobalAudio()}
              className="flex-1 p-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm text-center shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              <img
                src="https://api.dicebear.com/7.x/bottts/svg?seed=SETECbot"
                alt="KonBong Mascot"
                width="24"
                height="24"
                className="w-6 h-6 rounded-lg bg-white/20 p-0.5 object-cover shrink-0"
              />
              <span>យល់ព្រម និងទៅជជែកជាមួយ កូនច្បង</span>
              <i className="fas fa-arrow-right text-[11px] opacity-80"></i>
            </Link>

            <Link
              href="/KonPov"
              onClick={() => stopAllGlobalAudio()}
              className="flex-1 p-3 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:from-pink-500 hover:via-rose-500 hover:to-purple-500 text-white font-black text-xs sm:text-sm text-center shadow-md shadow-pink-500/20 transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              <img
                src="https://api.dicebear.com/7.x/pixel-art/svg?seed=MommyGirl"
                alt="KonPov Mascot"
                width="24"
                height="24"
                className="w-6 h-6 rounded-lg bg-white/20 p-0.5 object-cover shrink-0"
              />
              <span>យល់ព្រម និងទៅជជែកជាមួយ កូនពៅ</span>
              <i className="fas fa-arrow-right text-[11px] opacity-80"></i>
            </Link>
          </div>
        </div>
      </div>

      {/* Human-friendly Footer */}
      <footer className="text-center text-[11px] text-slate-500 mt-6 sm:mt-8 flex items-center justify-center gap-1.5 flex-wrap">
        <span>SETEC Meme AI Roastbot Field Test</span>
        <span>•</span>
        <span>Created with love by Rotana NOB</span>
      </footer>
    </main>
  );
}
