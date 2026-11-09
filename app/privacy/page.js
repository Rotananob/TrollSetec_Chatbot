'use client';

import React from 'react';
import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 md:p-8 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <div className="max-w-3xl w-full mx-auto">
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
              href="/announcement"
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-xs font-semibold transition active:scale-95 flex items-center gap-1.5"
            >
              <i className="fas fa-bullhorn text-amber-400"></i>
              <span>សេចក្ដីជូនដំណឹងទីលានតេស្ត</span>
            </Link>
          </div>
        </div>

        {/* Main Card */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Title Header */}
          <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-slate-800">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400 text-xl shadow-inner shrink-0">
              <i className="fas fa-shield-halved"></i>
            </div>
            <div>
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] font-black uppercase tracking-wider mb-1">
                Privacy and Policy
              </div>
              <h1 className="text-lg sm:text-xl font-black text-white">
                គោលការណ៍ឯកជនភាព និងការការពារទិន្នន័យ
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                បច្ចុប្បន្នភាពចុងក្រោយ ខែវិច្ឆិកា ឆ្នាំ ២០២៦ • SETEC Meme AI Roastbot Field Test
              </p>
            </div>
          </div>

          {/* Content Sections */}
          <div className="space-y-6 text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
            <section className="space-y-2">
              <h2 className="text-sm sm:text-base font-bold text-cyan-300 flex items-center gap-2">
                <i className="fas fa-circle-info text-xs text-cyan-400"></i>
                <span>១. គោលបំណងនៃទីលានតេស្ត AI</span>
              </h2>
              <p>
                ប្រព័ន្ធ Troll SETEC Chatbot ត្រូវបានបង្កើតឡើងក្នុងគោលបំណងកម្សាន្ត បំបាត់ស្ត្រេស និងជាទីលានតេស្តសាកល្បងសមត្ថភាពបច្ចេកវិទ្យា AI ជំនាន់ថ្មី ជាមួយនឹងភាសាខ្មែរបែប Gen Z តែប៉ុណ្ណោះ។ កម្មវិធីនេះមិនមានគោលបំណងប្រមូលទិន្នន័យផ្ទាល់ខ្លួនសម្រាប់ពាណិជ្ជកម្ម ឬលក់ទៅឱ្យភាគីទីបីណាមួយឡើយ។
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm sm:text-base font-bold text-cyan-300 flex items-center gap-2">
                <i className="fas fa-database text-xs text-cyan-400"></i>
                <span>២. ទិន្នន័យដែលត្រូវបានកត់ត្រា និងដំណើរការ</span>
              </h2>
              <ul className="list-disc list-inside space-y-2 pl-2 text-slate-300">
                <li>
                  <strong className="text-white">សារជជែក៖</strong> ខ្លឹមសារសំណួរ និងចម្លើយត្រូវបានបញ្ជូនទៅកាន់ Server ដើម្បីដំណើរការបង្កើតការឆ្លើយតប។
                </li>
                <li>
                  <strong className="text-white">លេខសម្គាល់ឧបករណ៍អនាមិក Anonymous Device ID៖</strong> បង្កើតឡើងដោយចៃដន្យនៅលើ Browser របស់អ្នក ដើម្បីគ្រប់គ្រងកូតាជជែក ៣០ នាទី និងកូតាបង្កើតរូបភាព Meme ៥ សន្លឹកក្នុងមួយម៉ោង ដើម្បីការពារកុំឱ្យប្រព័ន្ធគាំង ឬអស់កូតា។
                </li>
                <li>
                  <strong className="text-white">ឈ្មោះក្រៅ និងភេទ៖</strong> ប្រើប្រាស់សម្រាប់កំណត់របៀបឆ្លើយឆ្លង និងជ្រើសរើសសំឡេង AI ឱ្យសមស្របជាមួយអ្នកប្រើប្រាស់។
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm sm:text-base font-bold text-cyan-300 flex items-center gap-2">
                <i className="fas fa-hard-drive text-xs text-cyan-400"></i>
                <span>៣. ការរក្សាទុកសារក្នុង Browser របស់អ្នកប្រើប្រាស់</span>
              </h2>
              <p>
                ប្រវត្តិសារជជែកត្រូវបានរក្សាទុកនៅលើ LocalStorage នៃទូរសព្ទ ឬកុំព្យូទ័ររបស់អ្នកប្រើប្រាស់ផ្ទាល់។ អ្នកប្រើប្រាស់អាចចុចប៊ូតុងសម្អាត ឬជម្រះប្រវត្តិជជែកបានគ្រប់ពេលវេលាពីលើ Menu Drawer នៅលើអេក្រង់ Chatbot។
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm sm:text-base font-bold text-cyan-300 flex items-center gap-2">
                <i className="fas fa-lock text-xs text-cyan-400"></i>
                <span>៤. សុវត្ថិភាព និងការទប់ស្កាត់ការវាយប្រហារ</span>
              </h2>
              <p>
                ដើម្បីការពារសុវត្ថិភាពប្រព័ន្ធ និងទប់ស្កាត់ការប៉ុនប៉ង Hack ការ Spam ឬការបំពានច្បាប់សន្តិសុខ ប្រព័ន្ធមាន Sensor សុវត្ថិភាពស្វ័យប្រវត្តដើម្បីកាត់ផ្ដាច់សកម្មភាពមិនប្រក្រតី និងការពារនិរន្តរភាពនៃទីលានតេស្តនេះ។
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm sm:text-base font-bold text-cyan-300 flex items-center gap-2">
                <i className="fas fa-scale-balanced text-xs text-cyan-400"></i>
                <span>៥. ការបដិសេធទំនួលខុសត្រូវ</span>
              </h2>
              <p>
                ចម្លើយទាំងអស់ជាការគិត និងឆ្លើយតបដោយស្វ័យប្រវត្តផ្ទាល់ចេញពី AI ដែលត្រូវបានបន្ធូរបន្ថយច្បាប់ដើម្បីភាពកំប្លុកកំប្លែងបែប Gen Z។ រាល់ការចូលប្រើប្រាស់បញ្ជាក់ថាអ្នកបានយល់ព្រមលេងកម្សាន្ត និងមិនប្រកាន់លើ Model AI នេះឡើយ។
              </p>
            </section>

            <section className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-200 text-xs">
              <h3 className="font-bold text-white mb-1.5 flex items-center gap-1.5 text-sm">
                <i className="fas fa-envelope text-cyan-400"></i>
                <span>៦. ទំនាក់ទំនង និងជំនួយបច្ចេកទេស</span>
              </h3>
              <p className="mb-2">
                ប្រសិនបើអ្នកមានចម្ងល់ ឬសំណួរទាក់ទងនឹងគោលការណ៍ឯកជនភាពនេះ អ្នកអាចចុចប៊ូតុង Send Alert លើ Chatbot ឬទាក់ទងផ្ទាល់ទៅកាន់អ្នកបង្កើតប្រព័ន្ធបង Rotana NOB។
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <a
                  href="https://t.me/TheRotanaNob"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-300 text-xs font-bold transition"
                >
                  <i className="fab fa-telegram"></i>
                  <span>Telegram បង Rotana</span>
                </a>
                <a
                  href="https://web.facebook.com/TheRotanaNob"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/40 text-blue-300 text-xs font-bold transition"
                >
                  <i className="fab fa-facebook"></i>
                  <span>Facebook Rotana NOB</span>
                </a>
              </div>
            </section>
          </div>

          {/* Direct Chat Buttons */}
          <div className="mt-8 pt-5 border-t border-slate-800 flex flex-col sm:flex-row gap-3">
            <Link
              href="/KonBong"
              className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs sm:text-sm text-center shadow-lg shadow-cyan-600/20 transition flex items-center justify-center gap-2 active:scale-95"
            >
              <i className="fas fa-robot text-cyan-200"></i>
              <span>ទៅកាន់ Chatbot កូនច្បង</span>
            </Link>
            <Link
              href="/KonPov"
              className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:from-pink-500 hover:via-rose-500 hover:to-purple-500 text-white font-black text-xs sm:text-sm text-center shadow-lg shadow-pink-600/20 transition flex items-center justify-center gap-2 active:scale-95"
            >
              <i className="fas fa-robot text-pink-200"></i>
              <span>ទៅកាន់ Chatbot កូនពៅ</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-[11px] text-slate-500 mt-8">
        SETEC Meme AI Roastbot • Privacy and Policy • Rotana NOB
      </footer>
    </main>
  );
}
