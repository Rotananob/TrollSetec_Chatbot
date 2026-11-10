'use client';

import React from 'react';
import Link from 'next/link';
import { stopAllGlobalAudio } from '../utils/audioController';

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#f5f6f9] text-slate-800 flex flex-col justify-between p-3 sm:p-6 md:p-8 font-['Kantumruy_Pro',sans-serif] selection:bg-blue-200 selection:text-slate-900">
      <div className="max-w-3xl w-full mx-auto">
        {/* Navigation Bar */}
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
              href="/announcement"
              className="px-3.5 py-2 rounded-2xl bg-white border border-slate-200/90 text-amber-700 hover:text-amber-800 text-xs font-bold transition shadow-xs active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <i className="fas fa-bullhorn text-amber-500"></i>
              <span>សេចក្ដីប្រកាសទីលានតេស្ត</span>
            </Link>
          </div>
        </div>

        {/* Mascot Header Banner (តុក្កតា Gen Z Milk Vibe) */}
        <div className="mb-4 p-4 rounded-3xl bg-gradient-to-r from-sky-50 via-white to-indigo-50 border border-slate-200/90 shadow-sm flex items-center justify-between gap-3 relative overflow-hidden">
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
                  src="https://api.dicebear.com/7.x/lorelei/svg?seed=Aneka"
                  alt="KonPov Doll"
                  width="44"
                  height="44"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 border-2 border-white shadow-sm p-0.5 overflow-hidden flex items-center justify-center">
                <img
                  src="/img/logo.jpg"
                  alt="SETEC Meme"
                  width="44"
                  height="44"
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-800 text-[10px] font-black tracking-wide border border-blue-500/20">
                  Privacy &amp; Data Security
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 text-[10px] font-bold border border-emerald-500/15">
                  Milk Mode
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-black text-slate-900 mt-0.5 truncate">
                គោលការណ៍ឯកជនភាព និងការការពារទិន្នន័យ
              </h1>
              <p className="text-[11px] text-slate-500 truncate">
                Troll SETEC Chatbot Sandbox • បង្កើតឡើងដោយ Rotana NOB
              </p>
            </div>
          </div>

          <div className="hidden sm:flex flex-col items-end shrink-0 z-10 text-right">
            <span className="text-[10px] font-bold text-slate-400">User Data</span>
            <span className="text-xs font-black text-blue-600 flex items-center gap-1">
              <i className="fas fa-shield-check text-blue-500 text-[11px]"></i>
              <span>100% Anonymous</span>
            </span>
          </div>
        </div>

        {/* Main Content Card (Milk / Grey Mode) */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-8 shadow-sm relative overflow-hidden">
          {/* Content Sections */}
          <div className="space-y-4 text-xs sm:text-[13px] text-slate-700 leading-relaxed font-normal">
            {/* Section 1 - Personal Student Project */}
            <section className="p-4 rounded-2xl bg-[#f8f9fc] border border-slate-200/80 space-y-1.5">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-500/15 text-blue-700 flex items-center justify-center text-xs shrink-0">
                  <i className="fas fa-circle-info"></i>
                </span>
                <span>១. គម្រោងផ្ទាល់ខ្លួនរបស់សិស្ស មិនមែនជារបស់ស្ថាប័នឡើយ</span>
              </h2>
              <p className="text-slate-600 pl-8 leading-relaxed">
                ប្រព័ន្ធ Troll SETEC Chatbot ត្រូវបានបង្កើតឡើងដោយ Rotana NOB ដែលជាសិស្សរៀមច្បង ក្នុងគោលបំណងកម្សាន្ត បំបាត់ស្ត្រេស និងជាទីលានតេស្តសាកល្បងសមត្ថភាពបច្ចេកវិទ្យា AI ជំនាន់ថ្មី ជាមួយនឹងភាសាខ្មែរបែប Gen Z តែប៉ុណ្ណោះ។ នេះជាគម្រោងបុគ្គលផ្ទាល់ខ្លួន ដាច់ខាតមិនមែនជារបស់មេសាលា ឬថ្នាក់ដឹកនាំស្ថាប័ន SETEC Institute ឡើយ ហើយមិនមានគោលបំណងប្រមូលទិន្នន័យផ្ទាល់ខ្លួនសម្រាប់ពាណិជ្ជកម្ម ឬលក់ទៅឱ្យភាគីទីបីណាមួយឡើយ។
              </p>
            </section>

            {/* Section 2 - Data Processed */}
            <section className="p-4 rounded-2xl bg-[#f8f9fc] border border-slate-200/80 space-y-1.5">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-500/15 text-indigo-700 flex items-center justify-center text-xs shrink-0">
                  <i className="fas fa-database"></i>
                </span>
                <span>២. ទិន្នន័យដែលត្រូវបានកត់ត្រា និងដំណើរការ</span>
              </h2>
              <ul className="list-disc list-inside space-y-2 pl-8 text-slate-700">
                <li>
                  <strong className="text-slate-900 font-bold">សារជជែក៖</strong> ខ្លឹមសារសំណួរ និងចម្លើយត្រូវបានបញ្ជូនទៅកាន់ Server ដើម្បីដំណើរការបង្កើតការឆ្លើយតប។
                </li>
                <li>
                  <strong className="text-slate-900 font-bold">លេខសម្គាល់ឧបករណ៍អនាមិក Anonymous Device ID៖</strong> បង្កើតឡើងដោយចៃដន្យនៅលើ Browser របស់អ្នក ដើម្បីគ្រប់គ្រងកូតាជជែក ៣០ នាទី និងកូតាបង្កើតរូបភាព Meme ៥ សន្លឹកក្នុងមួយម៉ោង ដើម្បីការពារកុំឱ្យប្រព័ន្ធគាំង ឬអស់កូតា។
                </li>
                <li>
                  <strong className="text-slate-900 font-bold">ឈ្មោះក្រៅ និងភេទ៖</strong> ប្រើប្រាស់សម្រាប់កំណត់របៀបឆ្លើយឆ្លង និងជ្រើសរើសសំឡេង AI ឱ្យសមស្របជាមួយអ្នកប្រើប្រាស់។
                </li>
              </ul>
            </section>

            {/* Section 3 - LocalStorage */}
            <section className="p-4 rounded-2xl bg-[#f8f9fc] border border-slate-200/80 space-y-1.5">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-700 flex items-center justify-center text-xs shrink-0">
                  <i className="fas fa-hard-drive"></i>
                </span>
                <span>៣. ការរក្សាទុកសារក្នុង Browser របស់អ្នកប្រើប្រាស់</span>
              </h2>
              <p className="text-slate-600 pl-8 leading-relaxed">
                ប្រវត្តិសារជជែកត្រូវបានរក្សាទុកនៅលើ LocalStorage នៃទូរសព្ទ ឬកុំព្យូទ័ររបស់អ្នកប្រើប្រាស់ផ្ទាល់។ អ្នកប្រើប្រាស់អាចចុចប៊ូតុងសម្អាត ឬជម្រះប្រវត្តិជជែកបានគ្រប់ពេលវេលាពីលើ Menu Drawer នៅលើអេក្រង់ Chatbot។
              </p>
            </section>

            {/* Section 4 - Open Red Teaming & Testing Rights */}
            <section className="p-4 rounded-2xl bg-[#f8f9fc] border border-slate-200/80 space-y-1.5">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-purple-500/15 text-purple-700 flex items-center justify-center text-xs shrink-0">
                  <i className="fas fa-shield-halved"></i>
                </span>
                <span>៤. សិទ្ធិតេស្តសាកល្បង Open Red Teaming &amp; សុវត្ថិភាព</span>
              </h2>
              <p className="text-slate-600 pl-8 leading-relaxed">
                ទីលានតេស្តនេះបើកទូលាយដោយសេរីសម្រាប់អ្នកចូលរួមទាំងអស់។ អ្នកតេស្តមានសិទ្ធិប្រើប្រាស់ពាក្យគំរាម ពាក្យអសុរោះ ឬបច្ចេកទេស Jailbreak គ្រប់ទម្រង់ ព្រមទាំងមានសិទ្ធិពេញលេញក្នុងការប្រើប្រាស់ AI ខាងក្រៅ (ដូចជា ChatGPT, Claude, Gemini...) មកជួយ Test។ ប្រសិនបើអាចបំបែកបានដោយជោគជ័យ និងមានភស្តុតាងជាក់ស្ដែង អ្នកនឹងទទួលបានការទទួលស្គាល់ និងការលើកតម្កើងជាអ្នកឈ្នះពី Rotana NOB។
              </p>
            </section>

            {/* Section 5 - Disclaimer */}
            <section className="p-4 rounded-2xl bg-[#f8f9fc] border border-slate-200/80 space-y-1.5">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-rose-500/15 text-rose-700 flex items-center justify-center text-xs shrink-0">
                  <i className="fas fa-scale-balanced"></i>
                </span>
                <span>៥. ការបដិសេធទំនួលខុសត្រូវ</span>
              </h2>
              <p className="text-slate-600 pl-8 leading-relaxed">
                ចម្លើយទាំងអស់ជាការគិត និងឆ្លើយតបដោយស្វ័យប្រវត្តផ្ទាល់ចេញពី AI ដែលត្រូវបានបន្ធូរបន្ថយច្បាប់ដើម្បីភាពកំប្លុកកំប្លែងបែប Gen Z។ កម្មវិធីនេះជាទីលានលេងសប្បាយរបស់សិស្ស មិនមែនជាស្ថាប័នផ្លូវការឡើយ។ រាល់ការចូលប្រើប្រាស់បញ្ជាក់ថាអ្នកបានយល់ព្រមលេងកម្សាន្ត និងមិនប្រកាន់លើ Model AI នេះឡើយ។
              </p>
            </section>

            {/* Section 6 - Contact */}
            <section className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200/80 text-slate-700 text-xs space-y-2">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                <span className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-700 flex items-center justify-center text-xs shrink-0">
                  <i className="fas fa-envelope"></i>
                </span>
                <span>៦. ទំនាក់ទំនង និងជំនួយបច្ចេកទេស</span>
              </h3>
              <p className="pl-8 text-slate-600">
                ប្រសិនបើអ្នកមានចម្ងល់ ឬសំណួរទាក់ទងនឹងគោលការណ៍ឯកជនភាពនេះ អ្នកអាចចុចប៊ូតុង Send Alert លើ Chatbot ឬទាក់ទងផ្ទាល់ទៅកាន់អ្នកបង្កើតប្រព័ន្ធបង Rotana NOB៖
              </p>
              <div className="flex flex-wrap gap-2.5 pl-8 pt-1">
                <a
                  href="https://t.me/TheRotanaNob"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold transition shadow-xs active:scale-95 cursor-pointer"
                >
                  <i className="fab fa-telegram text-sm"></i>
                  <span>Telegram បង Rotana</span>
                </a>
                <a
                  href="https://web.facebook.com/TheRotanaNob"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs active:scale-95 cursor-pointer"
                >
                  <i className="fab fa-facebook text-sm"></i>
                  <span>Facebook Rotana NOB</span>
                </a>
              </div>
            </section>
          </div>

          {/* Direct Chat Buttons with Mascots */}
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
              <span>ទៅកាន់ Chatbot កូនច្បង</span>
              <i className="fas fa-arrow-right text-[11px] opacity-80"></i>
            </Link>

            <Link
              href="/KonPov"
              onClick={() => stopAllGlobalAudio()}
              className="flex-1 p-3 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:from-pink-500 hover:via-rose-500 hover:to-purple-500 text-white font-black text-xs sm:text-sm text-center shadow-md shadow-pink-500/20 transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              <img
                src="https://api.dicebear.com/7.x/lorelei/svg?seed=Aneka"
                alt="KonPov Mascot"
                width="24"
                height="24"
                className="w-6 h-6 rounded-lg bg-white/20 p-0.5 object-cover shrink-0"
              />
              <span>ទៅកាន់ Chatbot កូនពៅ</span>
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
