'use client';

import { useState, useEffect } from 'react';
import { getApiEndpoint } from '../app/utils/apiConfig';
import { getDeviceId } from '../app/utils/rateLimiter';

const CATEGORIES = [
  { id: 'cats', label: 'ឆ្មាប្រចាំវិទ្យាស្ថានស៊ីតិច', icon: 'fa-paw' },
  { id: 'assignment', label: 'Assignment និងការប្រឡងសង', icon: 'fa-file-lines' },
  { id: 'funny', label: 'រឿងកំប្លែង និងសិស្សច្បង', icon: 'fa-comments' },
  { id: 'slang', label: 'ពាក្យស្លែង និងពាក្យឌឺស៊ីតិច', icon: 'fa-bolt' },
  { id: 'campus_life', label: 'ជីវិតក្នុងវិទ្យាស្ថានស៊ីតិច', icon: 'fa-building-columns' },
  { id: 'other', label: 'រឿងរ៉ាវស៊ីតិចផ្សេងៗ', icon: 'fa-compass' }
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

  // Anti-Spam Cooldown & Strike States: 5 requests / 1 min -> 60s -> 120s -> 180s
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

    if (cooldownRemaining > 0) {
      handleTriggerSpamCooldown();
      return;
    }

    if (!content.trim()) {
      setErrorMessage('សូមសរសេររឿងរ៉ាវ ឬចំណេះដឹងបន្តិចសិន មុននឹងចុចបញ្ជូន');
      return;
    }

    const now = Date.now();
    let rawTimestamps = [];
    if (typeof window !== 'undefined') {
      try {
        rawTimestamps = JSON.parse(localStorage.getItem(TIMESTAMPS_KEY) || '[]');
      } catch {}
    }
    const validTimestamps = rawTimestamps.filter((t) => now - t < 60 * 1000);

    if (validTimestamps.length >= 5) {
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
        setErrorMessage(data.message || 'មានបញ្ហាបន្តិចបន្តួច សូមព្យាយាមម្ដងទៀត');
      }
    } catch {
      setErrorMessage('មិនអាចភ្ជាប់ទៅកាន់ Server បានទេ សូមពិនិត្យអ៊ីនធឺណិត');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in font-['Kantumruy_Pro',sans-serif]">
      <div
        className="w-full max-w-lg rounded-2xl sm:rounded-3xl bg-[#0a1611] border border-emerald-900/60 text-slate-100 shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-[92vh] animate-scale-up relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* SPAM COOLDOWN POPUP DIALOG */}
        {showSpamPopup && cooldownRemaining > 0 && (
          <div className="absolute inset-0 z-40 bg-[#0a1611]/98 backdrop-blur-md p-5 sm:p-6 flex flex-col items-center justify-center text-center animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-emerald-900/40 border border-emerald-700/60 flex items-center justify-center text-2xl text-emerald-400 mb-3">
              <i className="fas fa-shield-halved"></i>
            </div>
            <div className="px-3 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/60 text-[10px] font-bold uppercase tracking-wider mb-2">
              ប្រព័ន្ធសុវត្ថិភាពទិន្នន័យស៊ីតិច
            </div>
            <h4 className="text-base sm:text-lg font-bold text-slate-100 mb-1.5">
              ឧបករណ៍របស់អ្នកបានផ្ញើសំណើលើសពី ៥ ដងក្នុង ១ នាទី
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mb-4 leading-relaxed font-normal">
              ដើម្បីរក្សាតុល្យភាពប្រព័ន្ធ និងទិន្នន័យរបស់ Rotana NOB សូមរង់ចាំមួយភ្លែត
            </p>

            {/* Live Cooldown Countdown Box */}
            <div className="w-full max-w-xs p-4 rounded-xl bg-[#06120c] border border-emerald-900/70 mb-3">
              <div className="text-[11px] font-semibold text-emerald-300/90 mb-1 flex items-center justify-center gap-1.5">
                <i className="fas fa-stopwatch text-emerald-400"></i>
                <span>រយៈពេលរង់ចាំនៅសល់</span>
              </div>
              <div className="text-3xl sm:text-4xl font-bold text-emerald-400 font-mono tracking-wide">
                {cooldownRemaining} វិនាទី
              </div>
              <div className="text-[10px] text-slate-400 mt-1 font-medium">
                {cooldownStrike === 1 && 'កម្រិត ១ រយៈពេល ៦០ វិនាទី'}
                {cooldownStrike === 2 && 'កម្រិត ២ រយៈពេល ១២០ វិនាទី'}
                {cooldownStrike >= 3 && 'កម្រិត ៣ រយៈពេល ១៨០ វិនាទី'}
              </div>
              {/* Progress Bar */}
              <div className="w-full bg-[#030906] h-1.5 rounded-full mt-3 overflow-hidden border border-emerald-950">
                <div
                  className="bg-emerald-500 h-full transition-all duration-1000 ease-linear rounded-full"
                  style={{
                    width: `${Math.max(4, (cooldownRemaining / (cooldownStrike === 1 ? 60 : cooldownStrike === 2 ? 120 : 180)) * 100)}%`
                  }}
                />
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[#06120c] border border-emerald-900/40 text-[11px] text-slate-400 max-w-xs mb-4">
              បើសិននៅតែបន្តចុចផ្ញើ រយៈពេលពិន័យនឹងកើនឡើង។ ពេលអស់វិនាទីកំណត់ ប្រព័ន្ធនឹងបើកដំណើរការឡើងវិញស្វ័យប្រវត្តិ។
            </div>

            <button
              type="button"
              onClick={() => setShowSpamPopup(false)}
              className="px-5 py-2.5 rounded-xl bg-emerald-900/50 hover:bg-emerald-800/70 text-emerald-200 text-xs font-semibold transition border border-emerald-700/50 cursor-pointer active:scale-95"
            >
              រង់ចាំក្នុងទំព័រ
            </button>
          </div>
        )}

        {/* Header - Human-Designed Green Mode with SETEC App Logo */}
        <div className="px-5 py-3.5 border-b border-emerald-900/60 bg-[#0e2118] flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <img
                src="/img/icon.jpg"
                alt="SETEC Chatbot"
                className="w-11 h-11 rounded-xl object-cover border border-emerald-700/60 shadow-sm shrink-0"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '/img/logo.jpg';
                }}
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0e2118]"></span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                  SETEC Community
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-100 tracking-normal mt-0.5">
                ចូលរួមចែករំលែកទិន្នន័យស៊ីតិច
              </h3>
              <p className="text-[11px] text-slate-400 font-normal">
                ចែករំលែករឿងរ៉ាវ និងបទពិសោធន៍ក្នុងស៊ីតិចទៅកាន់ Rotana NOB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="w-8 h-8 rounded-full bg-emerald-950/50 hover:bg-emerald-900/80 text-slate-400 hover:text-white border border-emerald-800/50 flex items-center justify-center transition cursor-pointer active:scale-95 shrink-0"
            title="បិទផ្ទាំង"
          >
            <i className="fas fa-times text-xs"></i>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 relative z-10">
          {/* Active Cooldown Banner */}
          {cooldownRemaining > 0 && !showSpamPopup && (
            <div
              onClick={() => setShowSpamPopup(true)}
              className="p-3 rounded-xl bg-[#06140d] border border-emerald-900/70 text-slate-200 text-xs flex items-center justify-between gap-2 cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <i className="fas fa-shield-halved text-emerald-400 text-sm shrink-0"></i>
                <div className="truncate">
                  <span className="font-semibold text-white">ប្រព័ន្ធកំពុងកំណត់ពេលរង់ចាំ៖</span>{' '}
                  <span className="text-slate-300">នៅសល់ {cooldownRemaining} វិនាទី ចុចមើលលម្អិត</span>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-mono font-bold text-xs shrink-0 border border-emerald-800/60">
                {cooldownRemaining} វិនាទី
              </span>
            </div>
          )}

          {isSuccess ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-900/40 border border-emerald-500/60 flex items-center justify-center text-2xl text-emerald-400 shadow-sm">
                <i className="fas fa-check"></i>
              </div>
              <h4 className="text-base sm:text-lg font-bold text-white">
                អរគុណច្រើនសម្រាប់ការចូលរួម
              </h4>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
                ទិន្នន័យ និងរឿងរ៉ាវរបស់អ្នកត្រូវបានបញ្ជូនទៅកាន់ <b className="text-emerald-300 font-semibold">Rotana NOB</b> ដោយជោគជ័យ។ គាត់នឹងយកខ្លឹមសារនេះទៅផ្ទៀងផ្ទាត់ និងបញ្ចូលក្នុងប្រព័ន្ធស៊ីតិចឱ្យកាន់តែសុក្រឹត។
              </p>
              <div className="pt-3 flex gap-2.5 justify-center">
                <button
                  type="button"
                  onClick={handleWriteAnother}
                  className="px-4 py-2 rounded-xl bg-[#06140d] hover:bg-[#0c2217] border border-emerald-900/70 text-xs font-semibold text-slate-200 transition cursor-pointer"
                >
                  <i className="fas fa-pen mr-1.5 text-emerald-400"></i> ចែករំលែករឿងផ្សេងទៀត
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  <i className="fas fa-check mr-1.5"></i> រួចរាល់
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center gap-1.5">
                  <i className="fas fa-user text-emerald-400 text-xs"></i>
                  <span>ឈ្មោះសម្គាល់</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ឧទាហរណ៍ សិស្ស IT ឆ្នាំ២ ឬ អាប្អូនម៉ៅ"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#06120c] border border-emerald-900/70 focus:border-emerald-500/80 focus:ring-2 focus:ring-emerald-500/20 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition"
                  maxLength={50}
                />
              </div>

              {/* Category Chips - Zero Emojis, Zero Parentheses */}
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-2 flex items-center gap-1.5">
                  <i className="fas fa-folder text-emerald-400 text-xs"></i>
                  <span>ជ្រើសរើសប្រធានបទរឿងរ៉ាវ</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {CATEGORIES.map((cat) => {
                    const isSelected = category === cat.label;
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => setCategory(cat.label)}
                        className={`px-3 py-2.5 rounded-xl text-left text-xs transition flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-900/60 border border-emerald-500 text-white font-medium shadow-xs'
                            : 'bg-[#081710] hover:bg-[#0d2218] border border-emerald-950/80 text-slate-300 hover:text-white'
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <i className={`fas ${cat.icon} text-emerald-400 text-xs shrink-0`}></i>
                          <span className="truncate">{cat.label}</span>
                        </span>
                        {isSelected && <i className="fas fa-check text-emerald-400 text-xs ml-1 shrink-0"></i>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Lore / Story Textarea */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <i className="fas fa-pen-nib text-emerald-400 text-xs"></i>
                    <span>ខ្លឹមសាររឿងរ៉ាវ ឬចំណេះដឹងស៊ីតិច</span>
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">{content.length} អក្សរ</span>
                </div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="ឧទាហរណ៍ ឆ្មាពណ៌សនៅស៊ីតិចចូលចិត្តដេកមុខបណ្ណាល័យ ឬរឿងប្រឡងសងមុខវិជ្ជា C++ ឬពាក្យស្លែងថ្មីៗដែលសិស្សស៊ីតិចនិយមនិយាយ"
                  rows={5}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#06120c] border border-emerald-900/70 focus:border-emerald-500/80 focus:ring-2 focus:ring-emerald-500/20 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition leading-relaxed resize-none"
                  maxLength={2000}
                  required
                />
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-200 text-xs flex items-center gap-2">
                  <i className="fas fa-circle-exclamation text-sm shrink-0 text-rose-400"></i>
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit / Cancel Buttons */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-transparent hover:bg-emerald-950/50 text-slate-300 hover:text-white border border-emerald-900/60 text-xs font-semibold transition cursor-pointer active:scale-95"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !content.trim() || cooldownRemaining > 0}
                  className={`flex-2 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    cooldownRemaining > 0
                      ? 'bg-emerald-950/70 border border-emerald-900/60 text-emerald-400 cursor-not-allowed opacity-90'
                      : isSubmitting || !content.trim()
                      ? 'bg-emerald-950/50 border border-emerald-900/40 text-slate-500 cursor-not-allowed opacity-50'
                      : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-sm active:scale-98'
                  }`}
                >
                  {cooldownRemaining > 0 ? (
                    <>
                      <i className="fas fa-lock text-emerald-300"></i>
                      <span>រយៈពេលរង់ចាំ នៅសល់ {cooldownRemaining} វិនាទី</span>
                    </>
                  ) : isSubmitting ? (
                    <>
                      <i className="fas fa-spinner fa-spin text-emerald-200"></i>
                      <span>កំពុងបញ្ជូនទៅកាន់ Rotana NOB...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane text-emerald-200"></i>
                      <span>បញ្ជូនទិន្នន័យ</span>
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
