'use client';

import { useState, useEffect } from 'react';
import { getApiEndpoint } from '../app/utils/apiConfig';
import { getDeviceId } from '../app/utils/rateLimiter';

const CATEGORIES = [
  { id: 'cats', label: 'ឆ្មាប្រចាំវិទ្យាស្ថានស៊ីតិច', icon: 'fa-paw' },
  { id: 'assignment', label: 'Assignment និងការប្រឡងសង', icon: 'fa-file-lines' },
  { id: 'funny', label: 'រឿងកំប្លែង និងសិស្សច្បង', icon: 'fa-comments' },
  { id: 'slang', label: 'Slang និងពាក្យឌឺស៊ីតិច', icon: 'fa-bolt' },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#010905]/85 backdrop-blur-md animate-fade-in font-['Kantumruy_Pro',sans-serif]">
      <div
        className="w-full max-w-lg rounded-3xl bg-[#03150d] border border-emerald-500/40 text-emerald-100 shadow-[0_0_50px_rgba(16,185,129,0.22)] overflow-hidden flex flex-col max-h-[90vh] animate-scale-up relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Emerald Glow Effects */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* SPAM COOLDOWN POPUP DIALOG */}
        {showSpamPopup && cooldownRemaining > 0 && (
          <div className="absolute inset-0 z-40 bg-[#020e08]/96 backdrop-blur-md p-5 sm:p-6 flex flex-col items-center justify-center text-center animate-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 border-2 border-emerald-400/50 flex items-center justify-center text-3xl text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] mb-3 animate-pulse">
              <i className="fas fa-shield-halved"></i>
            </div>
            <div className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider mb-2">
              ប្រព័ន្ធសុវត្ថិភាពទិន្នន័យស៊ីតិច
            </div>
            <h4 className="text-base sm:text-lg font-black text-emerald-100 mb-1.5">
              ឧបករណ៍របស់អ្នកបានផ្ញើសំណើលើសពី ៥ ដងក្នុង ១ នាទី
            </h4>
            <p className="text-xs text-emerald-300/80 max-w-sm mb-4 leading-relaxed font-normal">
              ដើម្បីរក្សាតុល្យភាពប្រព័ន្ធ និងទិន្នន័យរបស់ Rotana NOB សូមរង់ចាំមួយភ្លែត
            </p>

            {/* Live Cooldown Countdown Box */}
            <div className="w-full max-w-xs p-4 rounded-2xl bg-[#062417] border border-emerald-500/40 shadow-inner mb-3">
              <div className="text-[11px] font-bold text-emerald-300 mb-1 flex items-center justify-center gap-1.5">
                <i className="fas fa-stopwatch text-emerald-400"></i>
                <span>រយៈពេលរង់ចាំនៅសល់</span>
              </div>
              <div className="text-4xl font-black text-emerald-400 tracking-wider font-mono animate-scale-up">
                {cooldownRemaining} វិនាទី
              </div>
              <div className="text-[10px] text-emerald-400/70 mt-1 font-medium">
                {cooldownStrike === 1 && 'កម្រិត ១ រយៈពេល ៦០ វិនាទី'}
                {cooldownStrike === 2 && 'កម្រិត ២ រយៈពេល ១២០ វិនាទី'}
                {cooldownStrike >= 3 && 'កម្រិត ៣ រយៈពេល ១៨០ វិនាទី'}
              </div>
              {/* Animated Progress Bar */}
              <div className="w-full bg-[#020b06] h-1.5 rounded-full mt-3 overflow-hidden border border-emerald-800/40">
                <div
                  className="bg-emerald-400 h-full transition-all duration-1000 ease-linear shadow-[0_0_10px_#34d399]"
                  style={{
                    width: `${Math.max(4, (cooldownRemaining / (cooldownStrike === 1 ? 60 : cooldownStrike === 2 ? 120 : 180)) * 100)}%`
                  }}
                />
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[#03150d] border border-emerald-800/40 text-[11px] text-emerald-400/80 max-w-xs mb-4">
              បើសិននៅតែបន្តចុចផ្ញើ រយៈពេលពិន័យនឹងកើនឡើង។ ពេលអស់វិនាទីកំណត់ ប្រព័ន្ធនឹងបើកដំណើរការឡើងវិញស្វ័យប្រវត្តិ។
            </div>

            <button
              type="button"
              onClick={() => setShowSpamPopup(false)}
              className="px-5 py-2.5 rounded-xl bg-emerald-900/60 hover:bg-emerald-800/80 text-emerald-200 text-xs font-bold transition border border-emerald-600/40 cursor-pointer active:scale-95"
            >
              រង់ចាំក្នុងទំព័រ
            </button>
          </div>
        )}

        {/* Header (Green Mode & Non-AI Vibe) */}
        <div className="px-5 py-4 border-b border-emerald-500/25 bg-gradient-to-r from-[#072417] via-[#041910] to-[#082b1b] flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.25)] shrink-0">
              <i className="fas fa-layer-group text-base"></i>
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-emerald-200 tracking-wide">
                ចូលរួមចែករំលែកទិន្នន័យស៊ីតិច
              </h3>
              <p className="text-[11px] text-emerald-400/80 font-medium">
                ចែករំលែករឿងរ៉ាវ និងបទពិសោធន៍ក្នុងស៊ីតិចទៅកាន់ Rotana NOB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="w-8 h-8 rounded-full bg-emerald-900/40 hover:bg-emerald-800/70 text-emerald-400 hover:text-white border border-emerald-500/30 flex items-center justify-center transition cursor-pointer active:scale-95 shrink-0"
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
              className="p-3 rounded-2xl bg-[#062417] border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between gap-2 cursor-pointer shadow-md"
            >
              <div className="flex items-center gap-2 min-w-0">
                <i className="fas fa-shield-halved text-emerald-400 text-sm animate-pulse shrink-0"></i>
                <div className="truncate">
                  <span className="font-bold text-white">ប្រព័ន្ធកំពុងកំណត់ពេលរង់ចាំ៖</span>{' '}
                  <span>នៅសល់ {cooldownRemaining} វិនាទី ចុចមើលលម្អិត</span>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-black text-xs shrink-0 border border-emerald-500/30">
                {cooldownRemaining} វិនាទី
              </span>
            </div>
          )}

          {isSuccess ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-3xl animate-bounce text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                <i className="fas fa-check"></i>
              </div>
              <h4 className="text-base sm:text-lg font-black text-emerald-300">
                អរគុណច្រើនសម្រាប់ការចូលរួម
              </h4>
              <p className="text-xs sm:text-sm text-emerald-200/80 leading-relaxed max-w-md mx-auto">
                ទិន្នន័យ និងរឿងរ៉ាវរបស់អ្នកត្រូវបានបញ្ជូនទៅកាន់ <b className="text-emerald-300 font-black">Rotana NOB</b> ដោយជោគជ័យ។ គាត់នឹងយកខ្លឹមសារនេះទៅផ្ទៀងផ្ទាត់ និងបញ្ចូលក្នុងប្រព័ន្ធស៊ីតិចឱ្យកាន់តែសុក្រឹត។
              </p>
              <div className="pt-3 flex gap-2.5 justify-center">
                <button
                  type="button"
                  onClick={handleWriteAnother}
                  className="px-4 py-2 rounded-xl bg-emerald-900/40 hover:bg-emerald-800/60 border border-emerald-600/40 text-xs font-bold text-emerald-200 transition cursor-pointer"
                >
                  <i className="fas fa-pen mr-1.5 text-emerald-400"></i> ចែករំលែករឿងផ្សេងទៀត
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-[0_0_15px_rgba(16,185,129,0.3)] border border-emerald-400/40 transition cursor-pointer"
                >
                  <i className="fas fa-check mr-1.5"></i> រួចរាល់
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username Field */}
              <div>
                <label className="block text-xs font-bold text-emerald-300 mb-1.5 flex items-center gap-1.5">
                  <i className="fas fa-user-tag text-emerald-400 text-xs"></i>
                  <span>ឈ្មោះសម្គាល់</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ឧទាហរណ៍ សិស្ស IT ឆ្នាំ២ ឬ អាប្អូនម៉ៅ"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#020d07] border border-emerald-500/30 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40 text-xs text-emerald-100 placeholder:text-emerald-700 outline-none transition"
                  maxLength={50}
                />
              </div>

              {/* Category Chips (Zero Emojis, Zero Parentheses) */}
              <div>
                <label className="block text-xs font-bold text-emerald-300 mb-2 flex items-center gap-1.5">
                  <i className="fas fa-folder-tree text-emerald-400 text-xs"></i>
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
                        className={`px-3 py-2.5 rounded-xl text-left text-xs font-semibold border transition flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 shadow-[0_0_15px_-3px_rgba(16,185,129,0.35)] font-bold'
                            : 'bg-[#051a10]/80 border-emerald-800/40 text-emerald-400/70 hover:bg-emerald-900/40 hover:text-emerald-200 hover:border-emerald-500/40'
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <i className={`fas ${cat.icon} text-emerald-400 text-xs shrink-0`}></i>
                          <span className="truncate">{cat.label}</span>
                        </span>
                        {isSelected && <i className="fas fa-circle-check text-emerald-400 text-xs ml-1 shrink-0"></i>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Lore / Story Textarea */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <i className="fas fa-file-pen text-emerald-400 text-xs"></i>
                    <span>ខ្លឹមសាររឿងរ៉ាវ ពាក្យឌឺ ឬចំណេះដឹងស៊ីតិច</span>
                  </label>
                  <span className="text-[10px] font-mono text-emerald-500">{content.length} អក្សរ</span>
                </div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="ឧទាហរណ៍ ឆ្មាពណ៌សនៅស៊ីតិចចូលចិត្តដេកមុខបណ្ណាល័យ ឬរឿងប្រឡង re-exam មុខវិជ្ជា C++ ឬពាក្យ Slang ថ្មីៗដែលសិស្សស៊ីតិចនិយមនិយាយ"
                  rows={5}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#020d07] border border-emerald-500/30 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40 text-xs text-emerald-100 placeholder:text-emerald-700 outline-none transition leading-relaxed resize-none"
                  maxLength={2000}
                  required
                />
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                  <i className="fas fa-circle-exclamation text-sm shrink-0"></i>
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit / Cancel Buttons */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#062417] hover:bg-[#0a3522] text-emerald-300 hover:text-white border border-emerald-700/40 text-xs font-bold transition cursor-pointer active:scale-95"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !content.trim() || cooldownRemaining > 0}
                  className={`flex-2 py-2.5 px-4 rounded-xl text-white text-xs font-black shadow-lg transition flex items-center justify-center gap-2 cursor-pointer ${
                    cooldownRemaining > 0
                      ? 'bg-emerald-900/60 border border-emerald-700/50 text-emerald-400 cursor-not-allowed opacity-90'
                      : isSubmitting || !content.trim()
                      ? 'bg-emerald-800/40 border border-emerald-700/30 text-emerald-400/50 cursor-not-allowed opacity-50'
                      : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white active:scale-98 shadow-[0_0_20px_rgba(16,185,129,0.35)] border border-emerald-400/40'
                  }`}
                >
                  {cooldownRemaining > 0 ? (
                    <>
                      <i className="fas fa-lock text-emerald-300"></i>
                      <span>រយៈពេលរង់ចាំ នៅសល់ {cooldownRemaining} វិនាទី</span>
                    </>
                  ) : isSubmitting ? (
                    <>
                      <i className="fas fa-spinner fa-spin text-emerald-300"></i>
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
