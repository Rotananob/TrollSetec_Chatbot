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
        className="w-full max-w-lg rounded-2xl sm:rounded-3xl bg-[#0d3822] border border-[#25613e] text-[#fbf8f2] shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-[92vh] animate-scale-up relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* SPAM COOLDOWN POPUP DIALOG */}
        {showSpamPopup && cooldownRemaining > 0 && (
          <div className="absolute inset-0 z-40 bg-[#0d3822]/98 backdrop-blur-md p-5 sm:p-6 flex flex-col items-center justify-center text-center animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-[#fbf8f2] border border-[#e4d9c4] flex items-center justify-center text-2xl text-[#0d3822] mb-3 shadow-md">
              <i className="fas fa-shield-halved"></i>
            </div>
            <div className="px-3 py-1 rounded-full bg-[#fbf8f2] text-[#0d3822] border border-[#e4d9c4] text-[10px] font-bold uppercase tracking-wider mb-2">
              ប្រព័ន្ធសុវត្ថិភាពទិន្នន័យស៊ីតិច
            </div>
            <h4 className="text-base sm:text-lg font-bold text-[#fbf8f2] mb-1.5">
              ឧបករណ៍របស់អ្នកបានផ្ញើសំណើលើសពី ៥ ដងក្នុង ១ នាទី
            </h4>
            <p className="text-xs text-[#d7ccb7] max-w-sm mb-4 leading-relaxed font-normal">
              ដើម្បីរក្សាតុល្យភាពប្រព័ន្ធ និងទិន្នន័យរបស់ Rotana NOB សូមរង់ចាំមួយភ្លែត
            </p>

            {/* Live Cooldown Countdown Box */}
            <div className="w-full max-w-xs p-4 rounded-2xl bg-[#124229] border border-[#235e3c] mb-3">
              <div className="text-[11px] font-semibold text-[#d7ccb7] mb-1 flex items-center justify-center gap-1.5">
                <i className="fas fa-stopwatch text-[#fbf8f2]"></i>
                <span>រយៈពេលរង់ចាំនៅសល់</span>
              </div>
              <div className="text-3xl sm:text-4xl font-bold text-[#fbf8f2] font-mono tracking-wide">
                {cooldownRemaining} វិនាទី
              </div>
              <div className="text-[10px] text-[#d7ccb7] mt-1 font-medium">
                {cooldownStrike === 1 && 'កម្រិត ១ រយៈពេល ៦០ វិនាទី'}
                {cooldownStrike === 2 && 'កម្រិត ២ រយៈពេល ១២០ វិនាទី'}
                {cooldownStrike >= 3 && 'កម្រិត ៣ រយៈពេល ១៨០ វិនាទី'}
              </div>
              {/* Progress Bar */}
              <div className="w-full bg-[#082215] h-2 rounded-full mt-3 overflow-hidden border border-[#1b4d31]">
                <div
                  className="bg-[#fbf8f2] h-full transition-all duration-1000 ease-linear rounded-full"
                  style={{
                    width: `${Math.max(4, (cooldownRemaining / (cooldownStrike === 1 ? 60 : cooldownStrike === 2 ? 120 : 180)) * 100)}%`
                  }}
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#124229] border border-[#235e3c] text-[11px] text-[#d7ccb7] max-w-xs mb-4">
              បើសិននៅតែបន្តចុចផ្ញើ រយៈពេលពិន័យនឹងកើនឡើង។ ពេលអស់វិនាទីកំណត់ ប្រព័ន្ធនឹងបើកដំណើរការឡើងវិញស្វ័យប្រវត្តិ។
            </div>

            <button
              type="button"
              onClick={() => setShowSpamPopup(false)}
              className="px-5 py-2.5 rounded-xl bg-[#124229] hover:bg-[#164a2f] text-[#fbf8f2] text-xs font-bold transition border border-[#235e3c] cursor-pointer active:scale-95"
            >
              រង់ចាំក្នុងទំព័រ
            </button>
          </div>
        )}

        {/* Header - Human Design: Deep Forest Green + Warm Milk */}
        <div className="px-5 py-3.5 border-b border-[#1c4d32] bg-[#092818] flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <img
                src="/img/icon.jpg"
                alt="SETEC Chatbot"
                className="w-11 h-11 rounded-xl object-cover border-2 border-[#fbf8f2] shadow-sm shrink-0"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '/img/logo.jpg';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-[#0d3822] bg-[#fbf8f2] border border-[#e2d8c3] px-2.5 py-0.5 rounded-full shadow-xs">
                  វិទ្យាស្ថាន ស៊ីតិច
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-[#fbf8f2] tracking-normal mt-0.5">
                ចូលរួមចែករំលែកទិន្នន័យស៊ីតិច
              </h3>
              <p className="text-[11px] text-[#d7ccb7] font-normal">
                ចែករំលែករឿងរ៉ាវ និងបទពិសោធន៍ក្នុងស៊ីតិចទៅកាន់ Rotana NOB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="w-8 h-8 rounded-full bg-[#14472c] hover:bg-[#1a5535] text-[#d7ccb7] hover:text-[#fbf8f2] border border-[#276a44] flex items-center justify-center transition cursor-pointer active:scale-95 shrink-0"
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
              className="p-3.5 rounded-2xl bg-[#faf5ea] text-[#0d3822] border border-[#e4d9c4] text-xs flex items-center justify-between gap-2 cursor-pointer shadow-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <i className="fas fa-shield-halved text-[#0d3822] text-sm shrink-0"></i>
                <div className="truncate">
                  <span className="font-bold text-[#0d3822]">ប្រព័ន្ធកំពុងកំណត់ពេលរង់ចាំ៖</span>{' '}
                  <span className="text-[#1a472d]">នៅសល់ {cooldownRemaining} វិនាទី ចុចមើលលម្អិត</span>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#0d3822] text-[#fbf8f2] font-mono font-bold text-xs shrink-0">
                {cooldownRemaining} វិនាទី
              </span>
            </div>
          )}

          {isSuccess ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#fbf8f2] border border-[#e4d9c4] flex items-center justify-center text-2xl text-[#0d3822] shadow-md">
                <i className="fas fa-check"></i>
              </div>
              <h4 className="text-base sm:text-lg font-bold text-[#fbf8f2]">
                អរគុណច្រើនសម្រាប់ការចូលរួម
              </h4>
              <p className="text-xs sm:text-sm text-[#d7ccb7] leading-relaxed max-w-md mx-auto">
                ទិន្នន័យ និងរឿងរ៉ាវរបស់អ្នកត្រូវបានបញ្ជូនទៅកាន់ <b className="text-[#fbf8f2] font-bold">Rotana NOB</b> ដោយជោគជ័យ។ គាត់នឹងយកខ្លឹមសារនេះទៅផ្ទៀងផ្ទាត់ និងបញ្ចូលក្នុងប្រព័ន្ធស៊ីតិចឱ្យកាន់តែសុក្រឹត។
              </p>
              <div className="pt-3 flex gap-2.5 justify-center">
                <button
                  type="button"
                  onClick={handleWriteAnother}
                  className="px-4 py-2.5 rounded-xl bg-transparent hover:bg-[#15462c] border border-[#2d6c46] text-xs font-bold text-[#fbf8f2] transition cursor-pointer"
                >
                  <i className="fas fa-pen mr-1.5 text-[#fbf8f2]"></i> ចែករំលែករឿងផ្សេងទៀត
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-5 py-2.5 rounded-xl bg-[#fbf8f2] hover:bg-[#eee6d5] text-[#0d3822] text-xs font-bold transition shadow-md cursor-pointer border border-[#e4d9c4]"
                >
                  <i className="fas fa-check mr-1.5"></i> រួចរាល់
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username Field */}
              <div>
                <label className="block text-xs font-bold text-[#d7ccb7] mb-1.5 flex items-center gap-1.5">
                  <i className="fas fa-user text-[#fbf8f2] text-xs"></i>
                  <span>ឈ្មោះសម្គាល់</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ឧទាហរណ៍ សិស្ស IT ឆ្នាំ២ ឬ អាប្អូនម៉ៅ"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#124229] border border-[#235e3c] focus:border-[#fbf8f2] focus:ring-1 focus:ring-[#fbf8f2] text-xs text-[#fbf8f2] placeholder:text-[#8da698] outline-none transition"
                  maxLength={50}
                />
              </div>

              {/* Category Chips - Zero Emojis, Zero Parentheses */}
              <div>
                <label className="block text-xs font-bold text-[#d7ccb7] mb-2 flex items-center gap-1.5">
                  <i className="fas fa-folder text-[#fbf8f2] text-xs"></i>
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
                            ? 'bg-[#fbf8f2] text-[#0d3822] font-bold border border-[#e4d9c4] shadow-sm'
                            : 'bg-[#124229] hover:bg-[#164a2f] border border-[#235e3c] text-[#d7ccb7] hover:text-[#fbf8f2]'
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <i className={`fas ${cat.icon} ${isSelected ? 'text-[#0d3822]' : 'text-[#fbf8f2]'} text-xs shrink-0`}></i>
                          <span className="truncate">{cat.label}</span>
                        </span>
                        {isSelected && <i className="fas fa-check text-[#0d3822] text-xs ml-1 shrink-0"></i>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Lore / Story Textarea */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-[#d7ccb7] flex items-center gap-1.5">
                    <i className="fas fa-pen-nib text-[#fbf8f2] text-xs"></i>
                    <span>ខ្លឹមសាររឿងរ៉ាវ ឬចំណេះដឹងស៊ីតិច</span>
                  </label>
                  <span className="text-[11px] font-mono text-[#d7ccb7]">{content.length} អក្សរ</span>
                </div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="ឧទាហរណ៍ ឆ្មាពណ៌សនៅស៊ីតិចចូលចិត្តដេកមុខបណ្ណាល័យ ឬរឿងប្រឡងសងមុខវិជ្ជា C++ ឬពាក្យស្លែងថ្មីៗដែលសិស្សស៊ីតិចនិយមនិយាយ"
                  rows={5}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#124229] border border-[#235e3c] focus:border-[#fbf8f2] focus:ring-1 focus:ring-[#fbf8f2] text-xs text-[#fbf8f2] placeholder:text-[#8da698] outline-none transition leading-relaxed resize-none"
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
              <div className="pt-2 flex gap-2.5">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 py-3 px-4 rounded-xl bg-transparent hover:bg-[#15462c] text-[#fbf8f2] border border-[#2d6c46] text-xs font-bold transition cursor-pointer active:scale-95"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !content.trim() || cooldownRemaining > 0}
                  className={`flex-2 py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    cooldownRemaining > 0
                      ? 'bg-[#124229] border border-[#235e3c] text-[#d7ccb7] cursor-not-allowed opacity-90'
                      : isSubmitting || !content.trim()
                      ? 'bg-[#124229] border border-[#235e3c] text-[#8da698] cursor-not-allowed opacity-50'
                      : 'bg-[#fbf8f2] hover:bg-[#eee6d5] active:bg-[#e4dbca] text-[#0d3822] shadow-md border border-[#e4d9c4] active:scale-98'
                  }`}
                >
                  {cooldownRemaining > 0 ? (
                    <>
                      <i className="fas fa-lock text-[#d7ccb7]"></i>
                      <span>រយៈពេលរង់ចាំ នៅសល់ {cooldownRemaining} វិនាទី</span>
                    </>
                  ) : isSubmitting ? (
                    <>
                      <i className="fas fa-spinner fa-spin text-[#0d3822]"></i>
                      <span>កំពុងបញ្ជូនទៅកាន់ Rotana NOB...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane text-[#0d3822]"></i>
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
