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
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-xs font-semibold transition"
          >
            <i className="fas fa-arrow-left"></i>
            <span>ត្រឡប់ក្រោយ</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/announcement"
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-xs font-semibold transition"
            >
              <i className="fas fa-bullhorn mr-1 text-amber-400"></i>
              សេចក្ដីជូនដំណឹងតេស្ត
            </Link>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-56 h-56 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Title Header */}
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400 text-lg shadow-inner shrink-0">
              <i className="fas fa-shield-halved"></i>
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-white">
                គោលការណ៍ឯកជនភាព និងការការពារទិន្នន័យ (Privacy Policy)
              </h1>
              <p className="text-xs text-slate-400">កាលបរិច្ឆេទធ្វើបច្ចុប្បន្នភាពចុងក្រោយ៖ ខែវិច្ឆិកា ឆ្នាំ ២០២៦</p>
            </div>
          </div>

          {/* Content Sections */}
          <div className="space-y-6 text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
            <section className="space-y-2">
              <h2 className="text-sm sm:text-base font-bold text-cyan-300 flex items-center gap-2">
                <i className="fas fa-circle-info text-xs"></i>
                <span>១. គោលបំណងនៃកម្មវិធី (Purpose of Service)</span>
              </h2>
              <p>
                ប្រព័ន្ធ AI Troll SETEC Chatbot ត្រូវបានបង្កើតឡើងក្នុងគោលបំណងកម្សាន្ត បំបាត់ស្ត្រេស និងជាទីលានតេស្តសាកល្បងសមត្ថភាព AI ជំនាន់ថ្មី ជាមួយនឹងភាសាខ្មែរបែប Gen Z តែប៉ុណ្ណោះ។ កម្មវិធីនេះមិនមានគោលបំណងប្រមូលទិន្នន័យផ្ទាល់ខ្លួនសម្រាប់ពាណិជ្ជកម្ម ឬលក់ទៅឱ្យភាគីទីបីណាមួយឡើយ។
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm sm:text-base font-bold text-cyan-300 flex items-center gap-2">
                <i className="fas fa-database text-xs"></i>
                <span>២. ទិន្នន័យដែលត្រូវបានកត់ត្រា (Data Collection)</span>
              </h2>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-300">
                <li><strong className="text-white">ទិន្នន័យជជែក (Chat Messages):</strong> ខ្លឹមសារសារដែលអ្នកផ្ញើ និងការឆ្លើយតបរបស់ AI ដើម្បីដំណើរការការសន្ទនាបន្តបន្ទាប់។</li>
                <li><strong className="text-white">លេខសម្គាល់ឧបករណ៍អនាមិក (Anonymous Device ID):</strong> បង្កើតឡើងដោយចៃដន្យនៅលើ Browser របស់លោកអ្នក ដើម្បីគ្រប់គ្រងកូតាជជែក (Session Limit) និងកូតាបង្កើតរូបភាព Meme។</li>
                <li><strong className="text-white">ឈ្មោះក្រៅ និងភេទ (Nickname & Gender):</strong> ប្រើប្រាស់សម្រាប់សម្រួលរបៀបឆ្លើយឆ្លង និងជ្រើសរើសសំឡេង AI ឱ្យត្រូវជាមួយអ្នកប្រើប្រាស់។</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm sm:text-base font-bold text-cyan-300 flex items-center gap-2">
                <i className="fas fa-lock text-xs"></i>
                <span>៣. សុវត្ថិភាព និងការរក្សាទុកទិន្នន័យ (Data Security & Ghost Persistence)</span>
              </h2>
              <p>
                ដើម្បីការពារសុវត្ថិភាពប្រព័ន្ធ និងទប់ស្កាត់ការប៉ុនប៉ង Hack ការ Spam ឬការបំពានច្បាប់សន្តិសុខ ប្រព័ន្ធរក្សាកំណត់ត្រាសវនកម្មសុវត្ថិភាពនៅលើ Cloud Database។ នៅពេលអ្នកប្រើប្រាស់ចុចជម្រះសារចេញពីឧបករណ៍ (Clear Chat History) ទិន្នន័យនៅលើអេក្រង់ និងអង្គចងចាំនៃទូរស័ព្ទរបស់លោកអ្នកនឹងត្រូវសម្អាតភ្លាមៗ ប៉ុន្តែកំណត់ត្រាសុវត្ថិភាពអនាមិកត្រូវបានរក្សាទុកដោយស្វ័យប្រវត្តិដើម្បីធានានិរន្តរភាព និងការអភិវឌ្ឍប្រព័ន្ធ។
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm sm:text-base font-bold text-cyan-300 flex items-center gap-2">
                <i className="fas fa-user-shield text-xs"></i>
                <span>៤. សិទ្ធិ និងជម្រើសរបស់អ្នកប្រើប្រាស់ (User Rights)</span>
              </h2>
              <p>
                អ្នកប្រើប្រាស់អាចជ្រើសរើសជម្រះទិន្នន័យ LocalStorage ឬ Cache របស់ Browser នៅពេលណាក៏បាន។ ដោយសារកម្មវិធីនេះជាទីលានតេស្តសាកល្បងសេរី (Experimental Field Test) រាល់ការចូលប្រើប្រាស់បញ្ជាក់ថាអ្នកបានយល់ព្រមលើការលេងកម្សាន្ត និងការបដិសេធទំនួលខុសត្រូវនៃចម្លើយស្វ័យប្រវត្តិរបស់ AI។
              </p>
            </section>

            <section className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-200 text-xs">
              <h3 className="font-bold text-white mb-1 flex items-center gap-1.5">
                <i className="fas fa-envelope text-cyan-400"></i>
                <span>ទំនាក់ទំនង និងជំនួយបច្ចេកទេស (Contact)</span>
              </h3>
              <p>
                ប្រសិនបើអ្នកមានចម្ងល់ ឬសំណួរទាក់ទងនឹងគោលការណ៍ឯកជនភាពនេះ អ្នកអាចចុចប៊ូតុង Send Alert លើ Chatbot ឬទាក់ទងផ្ទាល់ទៅកាន់អ្នកគ្រប់គ្រងប្រព័ន្ធបង Rotana NOB។
              </p>
            </section>
          </div>

          {/* Back to Chat buttons */}
          <div className="mt-8 pt-5 border-t border-slate-800 flex flex-col sm:flex-row gap-3">
            <Link
              href="/KonBong"
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs text-center transition flex items-center justify-center gap-2"
            >
              <i className="fas fa-robot text-cyan-400"></i>
              <span>ទៅកាន់ Roastbot កូនច្បង</span>
            </Link>
            <Link
              href="/KonPov"
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs text-center transition flex items-center justify-center gap-2"
            >
              <i className="fas fa-robot text-pink-400"></i>
              <span>ទៅកាន់ Roastbot កូនពៅ</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-[11px] text-slate-500 mt-8">
        SETEC Meme AI Roastbot • Privacy & Policy • Rotana NOB
      </footer>
    </main>
  );
}
