'use client';

import { useState, useEffect } from 'react';
import { getApiEndpoint } from '../app/utils/apiConfig';
import { getDeviceId } from '../app/utils/rateLimiter';

const CATEGORIES = [
  { id: 'cats', label: '🐱 ឆ្មាប្រចាំស៊ីតិច (Campus Cats)' },
  { id: 'assignment', label: '📚 Assignment & Re-Exam' },
  { id: 'funny', label: '😹 រឿងកំប្លែង & សិស្សច្បង' },
  { id: 'slang', label: '🔥 Slang & ពាក្យឌឺប្រចាំស៊ីតិច' },
  { id: 'campus_life', label: '🏫 ជីវិតក្នុងវិទ្យាស្ថាន ស៊ីតិច' },
  { id: 'other', label: '✨ រឿងរ៉ាវផ្សេងៗ (Other Lore)' }
];

const SPAM_LOCK_KEY = 'setec_lore_spam_lock';
const TIMESTAMPS_KEY = 'setec_lore_timestamps';

export default function ContributeKnowledgeModal({ isOpen, onClose, defaultBot = 'General' }) {
  const [username, setUsername] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].label);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Anti-Spam Cooldown & Strike States (5 requests / 1 min -> 60s -> 120s -> 180s)
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [cooldownStrike, setCooldownStrike] = useState(1);
  const [showSpamPopup, setShowSpamPopup] = useState(false);

  // Restore saved username and existing spam lock
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedUser = localStorage.getItem('chatbot_username') || localStorage.getItem('troll_username') || '';
    if (savedUser) setUsername(savedUser);

    const savedLock = localStorage.getItem(SPAM_LOCK_KEY);
    if (savedLock) {
      try {
        const { lockUntil, strike } = JSON.parse(savedLock);
        const now = Date.now();
        if (lockUntil && lockUntil > now) {
          const rem = Math.ceil((lockUntil - now) / 1000);
          setCooldownRemaining(rem);
          setCooldownStrike(strike || 1);
          setShowSpamPopup(true);
        } else {
          localStorage.removeItem(SPAM_LOCK_KEY);
        }
      } catch {}
    }
  }, [isOpen]);

  // Active Cooldown Countdown Ticker
  useEffect(() => {
    if (cooldownRemaining <= 0) return;

    const timer = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (typeof window !== 'undefined') {
            localStorage.removeItem(SPAM_LOCK_KEY);
            localStorage.removeItem(TIMESTAMPS_KEY);
          }
          setShowSpamPopup(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  if (!isOpen) return null;

  // Escalates spam cooldown when user sends > 5 times in 1 min or continues clicking during lock
  const handleTriggerSpamCooldown = (forcedStrike) => {
    const nextStrike = forcedStrike !== undefined ? forcedStrike : Math.min(3, cooldownStrike + 1);
    const addedSec = nextStrike === 1 ? 60 : nextStrike === 2 ? 120 : 180;
    const newLockUntil = Date.now() + (addedSec * 1000);

    if (typeof window !== 'undefined') {
      localStorage.setItem(SPAM_LOCK_KEY, JSON.stringify({ lockUntil: newLockUntil, strike: nextStrike }));
    }
    setCooldownStrike(nextStrike);
    setCooldownRemaining(addedSec);
    setShowSpamPopup(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. If currently in cooldown, clicking escalates cooldown (60s -> 120s -> 180s)
    if (cooldownRemaining > 0) {
      handleTriggerSpamCooldown();
      return;
    }

    if (!content.trim()) {
      setErrorMessage('សូមសរសេររឿងរ៉ាវ ឬចំណេះដឹងបន្តិចសិន មុននឹងចុចបញ្ជូន!');
      return;
    }

    // 2. Client-side sliding 1-minute window check (Max 5 submissions per 1 minute)
    const now = Date.now();
    let rawTimestamps = [];
    if (typeof window !== 'undefined') {
      try {
        rawTimestamps = JSON.parse(localStorage.getItem(TIMESTAMPS_KEY) || '[]');
      } catch {}
    }
    const validTimestamps = rawTimestamps.filter((t) => now - t < 60 * 1000);

    if (validTimestamps.length >= 5) {
      // Exceeded 5 in 1 minute -> Trigger 60-second cooldown immediately!
      handleTriggerSpamCooldown(1);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const endpoint = getApiEndpoint('/api/track');
      const deviceId = getDeviceId();

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId
        },
        body: JSON.stringify({
          type: 'ai_lore_contribution',
          username: username.trim() || 'Anonymous SETECer',
          category,
          content: content.trim(),
          bot: defaultBot,
          deviceId
        })
      });

      const data = await res.json().catch(() => ({}));

      // Server-side Spam Cooldown Interceptor
      if (res.status === 429 || data.isSpam) {
        const serverSec = data.cooldownSeconds || 60;
        const serverStrike = data.strike || 1;
        const lockUntil = data.lockUntil || (Date.now() + serverSec * 1000);

        if (typeof window !== 'undefined') {
          localStorage.setItem(SPAM_LOCK_KEY, JSON.stringify({ lockUntil, strike: serverStrike }));
        }
        setCooldownStrike(serverStrike);
        setCooldownRemaining(serverSec);
        setShowSpamPopup(true);
        return;
      }

      if (res.ok && data.success) {
        validTimestamps.push(now);
        if (typeof window !== 'undefined') {
          localStorage.setItem(TIMESTAMPS_KEY, JSON.stringify(validTimestamps));
        }
        setIsSuccess(true);
      } else {
        setErrorMessage(data.message || 'មានបញ្ហាបន្តិចបន្តួច សូមព្យាយាមម្ដងទៀត!');
      }
    } catch {
      setErrorMessage('មិនអាចភ្ជាប់ទៅកាន់ Server បានទេ សូមពិនិត្យអ៊ីនធឺណិត!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setContent('');
    setIsSuccess(false);
    setErrorMessage('');
    setShowSpamPopup(false);
    onClose();
  };

  const handleWriteAnother = () => {
    setContent('');
    setIsSuccess(false);
    setErrorMessage('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in font-['Kantumruy_Pro',sans-serif]">
      <div
        className="w-full max-w-lg rounded-3xl bg-slate-900 border border-indigo-500/30 text-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-up relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* SPAM COOLDOWN POPUP DIALOG */}
        {showSpamPopup && cooldownRemaining > 0 && (
          <div className="absolute inset-0 z-40 bg-slate-950/95 backdrop-blur-md p-5 sm:p-6 flex flex-col items-center justify-center text-center animate-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border-2 border-amber-400/50 flex items-center justify-center text-3xl text-amber-400 shadow-xl mb-3 animate-pulse">
              <i className="fas fa-shield-halved"></i>
            </div>
            <div className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider mb-2">
              ប្រព័ន្ធការពារ SPAM • AI Training Dataset
            </div>
            <h4 className="text-base sm:text-lg font-black text-white mb-1.5">
              ឧបករណ៍របស់អ្នកបានផ្ញើរឿងលើសពី ៥ ដងក្នុង ១ នាទី!
            </h4>
            <p className="text-xs text-slate-300 max-w-sm mb-4 leading-relaxed font-normal">
              ដើម្បីការពារកុំឱ្យ Spam គាំងប្រព័ន្ធ និង Dataset របស់បង Rotana NOB សូមរង់ចាំ Cooldown មួយភ្លែតសិនណា៎!
            </p>

            {/* Live Cooldown Countdown Box */}
            <div className="w-full max-w-xs p-4 rounded-2xl bg-amber-500/10 border border-amber-400/40 shadow-inner mb-3">
              <div className="text-[11px] font-bold text-amber-300 mb-1">
                ⏱️ រយៈពេល Cooldown នៅសល់
              </div>
              <div className="text-4xl font-black text-amber-400 tracking-wider font-mono animate-scale-up">
                {cooldownRemaining}s
              </div>
              <div className="text-[10px] text-slate-400 mt-1 font-medium">
                {cooldownStrike === 1 && 'កម្រិត ១ (៦០ វិនាទី)'}
                {cooldownStrike === 2 && 'កម្រិត ២ (១២០ វិនាទី - បន្ត Spam)'}
                {cooldownStrike >= 3 && 'កម្រិត ៣ (៣ នាទី / ១៨០ វិនាទី - Severe Spam)'}
              </div>
              {/* Animated Progress Bar */}
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-amber-400 h-full transition-all duration-1000 ease-linear"
                  style={{
                    width: `${Math.max(4, (cooldownRemaining / (cooldownStrike === 1 ? 60 : cooldownStrike === 2 ? 120 : 180)) * 100)}%`
                  }}
                />
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 max-w-xs mb-4">
              ⚠️ បើសិននៅតែបន្តចុច Spam រយៈពេលពិន័យនឹងកើនដល់ ១២០ វិនាទី និង ៣ នាទី! ពេលអស់វិនាទី (0s) ប្រព័ន្ធនឹងបើកឱ្យផ្ញើធម្មតាវិញដោយស្វ័យប្រវត្តិ។
            </div>

            <button
              type="button"
              onClick={() => setShowSpamPopup(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition border border-slate-700 cursor-pointer"
            >
              បិទផ្ទាំងនេះ (រង់ចាំក្នុងទំព័រ)
            </button>
          </div>
        )}

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-xl shadow-inner text-indigo-300">
              <i className="fas fa-brain"></i>
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-indigo-200">
                ចូលរួមអភិវឌ្ឍន៍ AI ស៊ីតិច (Lore & Training)
              </h3>
              <p className="text-[10.5px] text-slate-400">
                ចែករំលែករឿងរ៉ាវក្នុងស៊ីតិច ដើម្បីឱ្យ Rotana NOB បង្រៀន AI បន្ថែម
              </p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <i className="fas fa-times text-sm"></i>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Active Cooldown Banner if popup was dismissed but countdown is still running */}
          {cooldownRemaining > 0 && !showSpamPopup && (
            <div
              onClick={() => setShowSpamPopup(true)}
              className="p-3 rounded-2xl bg-amber-500/15 border border-amber-400/40 text-amber-200 text-xs flex items-center justify-between gap-2 cursor-pointer shadow-md"
            >
              <div className="flex items-center gap-2 min-w-0">
                <i className="fas fa-shield-halved text-amber-400 text-sm animate-pulse shrink-0"></i>
                <div className="truncate">
                  <span className="font-bold text-white">កំពុងជាប់ Cooldown Spam៖</span>{' '}
                  <span>នៅសល់ {cooldownRemaining} វិនាទី (ចុចមើលលម្អិត)</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-black text-xs shrink-0">
                {cooldownRemaining}s
              </span>
            </div>
          )}

          {isSuccess ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-3xl animate-bounce text-emerald-400">
                <i className="fas fa-check"></i>
              </div>
              <h4 className="text-base sm:text-lg font-black text-emerald-400">
                អរគុណច្រើនសម្រាប់ការចូលរួម!
              </h4>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
                ទិន្នន័យ និងរឿងរ៉ាវរបស់អ្នកត្រូវបានបញ្ជូនទៅកាន់បង <b className="text-indigo-300">Rotana NOB</b> ដោយជោគជ័យហើយ!
                បង Rotana នឹងយកខ្លឹមសារនេះទៅបង្រៀន (Train) AI បន្ថែមដើម្បីឱ្យវាស្គាល់ស៊ីតិចកាន់តែច្បាស់ និងឌឺកាន់តែត្រូវរឿង!
              </p>
              <div className="pt-3 flex gap-2.5 justify-center">
                <button
                  onClick={handleWriteAnother}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition cursor-pointer"
                >
                  <i className="fas fa-pen mr-1"></i> ចែករំលែករឿងផ្សេងទៀត
                </button>
                <button
                  onClick={handleReset}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-black shadow-md transition cursor-pointer"
                >
                  <i className="fas fa-check mr-1"></i> រួចរាល់
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username Field */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <i className="fas fa-user text-indigo-400 text-xs"></i>
                  <span>ឈ្មោះរបស់អ្នក (Username)</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ឧ. សិស្ស IT ឆ្នាំ២, អាប្អូនម៉ៅ..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs text-white outline-none transition"
                  maxLength={50}
                />
              </div>

              {/* Category Chips */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                  <i className="fas fa-tags text-indigo-400 text-xs"></i>
                  <span>ជ្រើសរើសប្រធានបទរឿងរ៉ាវ (Category)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {CATEGORIES.map((cat) => {
                    const isSelected = category === cat.label;
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => setCategory(cat.label)}
                        className={`px-3 py-2 rounded-xl text-left text-[11px] font-semibold border transition flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600/30 border-indigo-400 text-indigo-200 shadow-sm'
                            : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                        }`}
                      >
                        <span className="truncate">{cat.label}</span>
                        {isSelected && <i className="fas fa-check-circle text-indigo-400 text-xs ml-1"></i>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Lore / Story Textarea */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <i className="fas fa-book-open text-indigo-400 text-xs"></i>
                    <span>ខ្លឹមសាររឿងរ៉ាវ / ពាក្យឌឺ / ចំណេះដឹងស៊ីតិច (Content)</span>
                  </label>
                  <span className="text-[10px] text-slate-500">{content.length} អក្សរ</span>
                </div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="ឧទាហរណ៍៖ ឆ្មាពណ៌សនៅស៊ីតិចចូលចិត្តដេកមុខបណ្ណាល័យ ឬរឿងប្រឡង re-exam មុខវិជ្ជា C++... ឬពាក្យ Slang ថ្មីៗដែលសិស្សស៊ីតិចនិយមនិយាយ..."
                  rows={5}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs text-white outline-none transition leading-relaxed resize-none"
                  maxLength={2000}
                  required
                />
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <i className="fas fa-exclamation-circle text-sm shrink-0"></i>
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !content.trim() || cooldownRemaining > 0}
                  className={`flex-2 py-2.5 px-4 rounded-xl text-white text-xs font-black shadow-lg transition flex items-center justify-center gap-2 cursor-pointer ${
                    cooldownRemaining > 0
                      ? 'bg-amber-600/80 cursor-not-allowed opacity-90'
                      : isSubmitting || !content.trim()
                      ? 'bg-indigo-600/50 cursor-not-allowed opacity-50'
                      : 'bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-98 shadow-indigo-500/20'
                  }`}
                >
                  {cooldownRemaining > 0 ? (
                    <>
                      <i className="fas fa-lock text-amber-200"></i>
                      <span>🔒 Cooldown (នៅសល់ {cooldownRemaining}s)...</span>
                    </>
                  ) : isSubmitting ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      <span>កំពុងបញ្ជូនទៅបង Rotana...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane"></i>
                      <span>បញ្ជូនដើម្បីបង្រៀន AI (Submit)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
