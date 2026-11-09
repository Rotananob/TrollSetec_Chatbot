'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';
import ContributeKnowledgeModal from '@/components/ContributeKnowledgeModal';
import { resetClientRateLimit } from './utils/rateLimiter';
import { compressAvatarImage, saveAvatarToStorage, removeAvatarFromStorage, DEFAULT_USER_AVATAR } from './utils/imageStorage';
import { initSecurityShield } from './utils/securityShield';

export default function Home() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [userAge, setUserAge] = useState('');
  const [avatar, setAvatar] = useState('https://api.dicebear.com/7.x/adventurer/svg?seed=Student');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hasCheckedStorage, setHasCheckedStorage] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [theme, setTheme] = useState('light');
  const [isLogoSpinning, setIsLogoSpinning] = useState(false);
  const [spinKey, setSpinKey] = useState(0);
  const [contributeModalOpen, setContributeModalOpen] = useState(false);
  const bgmRef = useRef(null);

  const handleTriggerLogoSpin = () => {
    setIsLogoSpinning(true);
    setSpinKey((prev) => prev + 1);
    setTimeout(() => {
      setIsLogoSpinning(false);
    }, 850);
  };

  useEffect(() => {
    initSecurityShield();

    // Purge any stale service worker caches from window level for instant PWA fresh delivery
    if (typeof window !== 'undefined' && 'caches' in window) {
      window.caches.keys().then((keys) => {
        keys.forEach((k) => window.caches.delete(k));
      }).catch(() => {});
    }

    const savedName = localStorage.getItem('chatbot_username');
    const savedAge = localStorage.getItem('chatbot_user_age');
    const savedAvatar = localStorage.getItem('chatbot_avatar');
    const savedTheme = localStorage.getItem('chatbot_theme') || 'light';
    setTheme(savedTheme);

    if (savedName && savedName.trim()) {
      setUsername(savedName.trim());
      setIsSubmitted(true);
    }
    if (savedAge && savedAge.trim()) {
      setUserAge(savedAge.trim());
    }
    if (savedAvatar) setAvatar(savedAvatar);
    setHasCheckedStorage(true);

    // Background music initialization
    const bgm = bgmRef.current;
    if (bgm) {
      bgm.volume = 0.35;
      const playPromise = bgm.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsMusicPlaying(true))
          .catch(() => {
            setIsMusicPlaying(false);
          });
      }

      const startOnInteraction = () => {
        if (bgm && bgm.paused) {
          bgm.play().then(() => setIsMusicPlaying(true)).catch(() => {});
        }
        window.removeEventListener('click', startOnInteraction);
        window.removeEventListener('touchstart', startOnInteraction);
        window.removeEventListener('keydown', startOnInteraction);
      };

      window.addEventListener('click', startOnInteraction, { once: true });
      window.addEventListener('touchstart', startOnInteraction, { once: true });
      window.addEventListener('keydown', startOnInteraction, { once: true });

      return () => {
        window.removeEventListener('click', startOnInteraction);
        window.removeEventListener('touchstart', startOnInteraction);
        window.removeEventListener('keydown', startOnInteraction);
      };
    }
  }, []);

  const handleToggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('chatbot_theme', next);
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressAvatarImage(file);
        setAvatar(compressed);
        saveAvatarToStorage(compressed);
      } catch (err) {
        alert(err.message || 'មិនអាចជ្រើសរូបភាពនេះបានទេ!');
      }
    }
  };

  const handleRemoveAvatar = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setAvatar(DEFAULT_USER_AVATAR);
    removeAvatarFromStorage();
  };

  const hasCustomAvatar = Boolean(avatar && avatar !== DEFAULT_USER_AVATAR);

  const handleContinue = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const trimmed = username.trim();
    if (!trimmed) {
      alert('សូមបញ្ចូលឈ្មោះពិតរបស់អ្នកជាមុនសិន!');
      return;
    }
    localStorage.setItem('chatbot_username', trimmed);
    if (userAge && userAge.toString().trim()) {
      localStorage.setItem('chatbot_user_age', userAge.toString().trim());
    } else {
      localStorage.removeItem('chatbot_user_age');
    }
    saveAvatarToStorage(avatar);
    resetClientRateLimit(trimmed);
    setIsSubmitted(true);
  };

  const handleBackToForm = () => {
    resetClientRateLimit();
    setIsSubmitted(false);
  };

  const isDark = theme === 'dark';

  return (
    <div
      className={`min-h-screen transition-colors duration-200 font-['Kantumruy_Pro',sans-serif] flex flex-col items-center justify-start sm:justify-center p-3 sm:p-4 sm:py-8 relative overflow-x-hidden ${
        isDark
          ? 'bg-slate-950 text-slate-100'
          : 'bg-slate-100/90 text-slate-800'
      }`}
      style={{
        paddingTop: 'calc(max(env(safe-area-inset-top, 0px), 0px) + 4.25rem)',
        paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), 0px) + 4.5rem)'
      }}
    >
      {/* Background Audio */}
      <audio ref={bgmRef} src="/audio/funny-bgm.mp3" loop preload="none" />

      {/* Mobile Top Navigation Bar (< 640px) */}
      <div
        className="sm:hidden fixed top-0 left-0 right-0 z-50 px-4 pb-2.5 flex items-center justify-between backdrop-blur-md bg-white/90 dark:bg-slate-950/90 border-b border-slate-200 dark:border-slate-800 shadow-xs"
        style={{
          paddingTop: 'max(env(safe-area-inset-top, 0px), 0.625rem)'
        }}
      >
        <Link href="/" className="flex items-center gap-2 select-none" title="SETEC Roastbot">
          <div className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5 shadow-xs overflow-hidden flex-shrink-0">
            <img
              src="/img/logo.jpg"
              alt="SETEC Logo"
              width="32"
              height="32"
              className="w-full h-full object-cover rounded-[10px]"
            />
          </div>
          <span className="font-extrabold text-xs tracking-tight text-slate-900 dark:text-white">
            SETEC Roastbot
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle theme={theme} onToggle={handleToggleTheme} />
          <button
            onClick={(e) => {
              e.stopPropagation();
              const bgm = bgmRef.current;
              if (!bgm) return;
              if (isMusicPlaying) {
                bgm.pause();
                setIsMusicPlaying(false);
              } else {
                bgm.play().then(() => setIsMusicPlaying(true)).catch(() => {});
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold cursor-pointer select-none transition-colors ${
              isMusicPlaying
                ? 'bg-slate-900 text-white border-slate-700 dark:bg-white dark:text-slate-900 dark:border-white shadow-xs'
                : isDark
                ? 'bg-slate-900 text-slate-300 border-slate-800'
                : 'bg-white text-slate-700 border-slate-300 shadow-xs'
            }`}
            title={isMusicPlaying ? 'ចុចដើម្បីបិទភ្លេងកំប្លែង' : 'ចុចដើម្បីបើកភ្លេងកំប្លែង'}
          >
            <i className={`fas ${isMusicPlaying ? 'fa-volume-up text-blue-500 dark:text-blue-600' : 'fa-volume-mute text-slate-400'} text-xs`}></i>
            <span>{isMusicPlaying ? 'BGM' : 'ភ្លេង'}</span>
          </button>
        </div>
      </div>

      {/* Desktop Top Floating Controls (>= 640px) */}
      <div className="hidden sm:flex fixed top-4 right-4 z-50 items-center gap-2">
        <ThemeToggle theme={theme} onToggle={handleToggleTheme} />

        <button
          onClick={(e) => {
            e.stopPropagation();
            const bgm = bgmRef.current;
            if (!bgm) return;
            if (isMusicPlaying) {
              bgm.pause();
              setIsMusicPlaying(false);
            } else {
              bgm.play().then(() => setIsMusicPlaying(true)).catch(() => {});
            }
          }}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border shadow-xs backdrop-blur-md text-xs font-bold cursor-pointer select-none transition-colors ${
            isMusicPlaying
              ? 'bg-slate-900 text-white border-slate-700 dark:bg-white dark:text-slate-900 dark:border-white shadow-sm'
              : isDark
              ? 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
              : 'bg-white text-slate-700 border-slate-300 hover:text-slate-900 shadow-xs'
          }`}
          title={isMusicPlaying ? 'ចុចដើម្បីបិទភ្លេងកំប្លែង' : 'ចុចដើម្បីបើកភ្លេងកំប្លែង'}
        >
          <i className={`fas ${isMusicPlaying ? 'fa-volume-up text-blue-500 dark:text-blue-600' : 'fa-volume-mute text-slate-400'}`}></i>
          <span className="text-[11px] font-bold">{isMusicPlaying ? 'Funny BGM' : 'ភ្លេងកំប្លែង'}</span>
          <i className="fas fa-music text-[10px] opacity-70"></i>
          {isMusicPlaying && (
            <span className="flex items-end gap-0.5 h-3">
              <span className="w-1 h-3 bg-blue-500 dark:bg-blue-600 rounded-full animate-bounce"></span>
              <span className="w-1 h-2 bg-blue-400 dark:bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1 h-3 bg-blue-300 dark:bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </span>
          )}
        </button>
      </div>

      {/* Main Container Card */}
      <div className="w-full max-w-md my-auto z-20 mt-3 sm:mt-0">
        <div
          className={`rounded-3xl shadow-xl p-5 sm:p-8 text-center relative border transition-all duration-200 ${
            isDark
              ? 'bg-slate-900 border-slate-800 text-white shadow-black/40'
              : 'bg-white border-slate-200 text-slate-900 shadow-slate-200/70'
          }`}
        >
          {/* Interactive Logo with Spin */}
          <div
            onClick={handleTriggerLogoSpin}
            className="troll-logo-wrapper mx-auto mb-3.5 cursor-pointer relative inline-block"
            title="ចុចដើម្បីឱ្យវិលកំប្លែង"
          >
            <div
              key={spinKey}
              className={`w-16 h-16 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5 shadow-sm overflow-hidden troll-logo-inner ${
                isLogoSpinning ? 'troll-logo-spin' : 'troll-logo-idle'
              }`}
              style={{ width: '64px', height: '64px', maxWidth: '64px', maxHeight: '64px' }}
            >
              <img
                src="/img/logo.jpg"
                alt="SETEC Troll Bot"
                width="64"
                height="64"
                className="w-full h-full object-cover rounded-[14px]"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            {isLogoSpinning && (
              <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[9px] font-black px-2.5 py-0.5 rounded-full shadow border border-slate-700 dark:border-slate-300 whitespace-nowrap pointer-events-none">
                វិលមុខហើយ
              </span>
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-sky-400 dark:via-indigo-300 dark:to-purple-400 bg-clip-text text-transparent tracking-tight mb-1.5 drop-shadow-xs">
            ស្វាគមន៍មកកាន់ SETEC Roastbot
          </h2>
          <p className="text-xs sm:text-[13px] mb-5 font-medium text-slate-600 dark:text-slate-400 leading-normal">
            កន្លែង Roast &amp; Troll ឆាតលេងបំបាត់ស្ត្រេសបែប Chill ៗ សម្រាប់សិស្ស SETEC ទំនេរ
          </p>

          {!hasCheckedStorage ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                កំពុងត្រួតពិនិត្យគណនី...
              </p>
            </div>
          ) : !isSubmitted ? (
            <>
              <div className="mb-5">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex flex-col items-center">
                    <label htmlFor="avatar-input" className="cursor-pointer flex flex-col items-center group">
                      <div className="relative">
                        <img
                          id="avatar-preview"
                          src={avatar}
                          width="80"
                          height="80"
                          className="w-20 h-20 rounded-full border-3 border-slate-200 dark:border-slate-700 shadow-sm object-cover group-hover:border-blue-500 transition-colors"
                          style={{ width: '80px', height: '80px', objectFit: 'cover' }}
                          alt="Avatar Preview"
                        />
                        <div className="absolute bottom-0 right-0 bg-slate-900 dark:bg-blue-600 text-white p-1.5 rounded-full text-[10px] shadow border-2 border-white dark:border-slate-900">
                          <i className="fas fa-camera"></i>
                        </div>
                      </div>
                      <input
                        type="file"
                        id="avatar-input"
                        accept="image/*"
                        className="hidden"
                        style={{ display: 'none' }}
                        onChange={handleAvatarChange}
                      />
                    </label>

                    {/* Action buttons: Change / Remove Profile */}
                    <div className="flex items-center gap-2 mt-2">
                      <label
                        htmlFor="avatar-input"
                        className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer flex items-center gap-1"
                      >
                        <i className="fas fa-camera text-[10px]"></i>
                        <span>{hasCustomAvatar ? 'ប្ដូររូប Profile' : 'ដាក់រូប Profile'}</span>
                      </label>
                      {hasCustomAvatar && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          className="text-[11px] text-rose-500 hover:text-rose-400 font-bold hover:underline flex items-center gap-1 cursor-pointer transition active:scale-95"
                          title="លុបរូប Profile ត្រឡប់ទៅរូបដើមវិញ"
                        >
                          <i className="fas fa-trash-alt text-[9.5px]"></i>
                          <span>លុបរូប</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="w-full">
                    <div className="grid grid-cols-3 gap-2.5 w-full">
                      <div className="col-span-2 text-left">
                        <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">
                          ឈ្មោះពិតរបស់អ្នក៖
                        </label>
                        <input
                          id="username-input"
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleContinue(e);
                          }}
                          className={`w-full px-3.5 py-3 rounded-xl border text-left font-bold text-sm outline-none transition-all ${
                            isDark
                              ? 'bg-slate-950 border-slate-700 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-500'
                              : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 placeholder:text-slate-400'
                          }`}
                          placeholder="ឈ្មោះពិត"
                          maxLength={24}
                          required
                        />
                      </div>
                      <div className="col-span-1 text-left">
                        <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">
                          អាយុ៖
                        </label>
                        <input
                          id="userage-input"
                          type="number"
                          min="5"
                          max="99"
                          value={userAge}
                          onChange={(e) => setUserAge(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleContinue(e);
                          }}
                          className={`w-full px-2.5 py-3 rounded-xl border text-center font-bold text-sm outline-none transition-all ${
                            isDark
                              ? 'bg-slate-950 border-slate-700 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-500'
                              : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 placeholder:text-slate-400'
                          }`}
                          placeholder="ឧ. 20"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleContinue}
                  className="mt-4 w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-blue-600 dark:hover:bg-blue-500 font-bold text-sm sm:text-base shadow-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99]"
                >
                  <span>ចូលឆាតឥឡូវនេះ</span>
                  <i className="fas fa-arrow-right text-xs"></i>
                </button>
              </div>

              {/* AI Training & SETEC Lore Contribution Card */}
              <div className="w-full mt-3 mb-2">
                <div
                  className={`w-full rounded-2xl border p-3 sm:p-3.5 flex items-center justify-between gap-3 transition shadow-xs ${
                    isDark
                      ? 'bg-slate-950/80 border-slate-800'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm shrink-0">
                      <i className="fas fa-brain"></i>
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs sm:text-[13px] text-slate-900 dark:text-white">
                          ចូលរួមអភិវឌ្ឍន៍ AI SETEC Lore
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-normal mt-0.5 line-clamp-1 sm:line-clamp-none">
                        ចែករំលែករឿងរ៉ាវក្នុងស៊ីតិច ឆ្មា Assignment ឬ Slang ទៅ Rotana NOB
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setContributeModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white border border-slate-300 dark:border-slate-700 font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
                  >
                    <i className="fas fa-lightbulb text-amber-400 text-xs"></i>
                    <span>ចូលរួមសរសេរ</span>
                  </button>
                </div>
              </div>

              {/* Other Websites Section */}
              <div id="other-websites-section" className="flex flex-col items-center mt-3 mb-3">
                <div
                  className={`w-full rounded-2xl border p-3 sm:p-4 flex flex-col items-center transition shadow-xs ${
                    isDark
                      ? 'bg-slate-950/70 border-slate-800'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  {/* Clean Promo Caption Box */}
                  <div className="w-full mb-3 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs text-center">
                    <p className="text-[12px] sm:text-[12.5px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                      Roastbot នេះខ្ញុំបង្កើតឡើងឱ្យបងប្អូនទាំងអស់គ្នាបានចូលមកសើចសប្បាយ និង Chill! អ៊ីចឹងសុំឆ្លៀតប្រម៉ូតតិច។ មិចម៉ា ជួយប្រើ ឬ ជួយជាវ ម្នាក់មួយហូវ ណ៎រ 🙏🏻😭
                    </p>
                  </div>

                  {/* Professional UI Buttons Grid */}
                  <div className="grid grid-cols-2 gap-2 w-full min-w-0">
                    {/* YOUNG POS */}
                    <a
                      href="https://play.google.com/store/apps/developer?id=youngapp"
                      target="_blank"
                      rel="noreferrer"
                      className={`group flex items-center gap-2 p-2 sm:p-2.5 rounded-xl border transition-all duration-150 active:scale-[0.98] ${
                        isDark
                          ? 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-200'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 shadow-2xs'
                      }`}
                      title="YOUNG POS - App on Google Play"
                    >
                      <img
                        src="/img/youngpos.png"
                        alt="YOUNG POS"
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-contain shrink-0 p-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 group-hover:scale-105 transition-transform"
                      />
                      <span className="text-[11px] sm:text-xs font-bold truncate flex-1 text-left">
                        YOUNG POS
                      </span>
                      <i className="fas fa-arrow-up-right-from-square text-[9px] text-slate-400 group-hover:text-blue-500 opacity-70 group-hover:opacity-100 transition-all shrink-0"></i>
                    </a>

                    {/* QR Scan */}
                    <a
                      href="https://qr-scan-y659.vercel.app/"
                      target="_blank"
                      rel="noreferrer"
                      className={`group flex items-center gap-2 p-2 sm:p-2.5 rounded-xl border transition-all duration-150 active:scale-[0.98] ${
                        isDark
                          ? 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-200'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 shadow-2xs'
                      }`}
                      title="QR Scan Web App"
                    >
                      <img
                        src="/img/QR_Scan.png"
                        alt="QR Scan"
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-contain shrink-0 p-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 group-hover:scale-105 transition-transform"
                      />
                      <span className="text-[11px] sm:text-xs font-bold truncate flex-1 text-left">
                        QR Scan
                      </span>
                      <i className="fas fa-arrow-up-right-from-square text-[9px] text-slate-400 group-hover:text-blue-500 opacity-70 group-hover:opacity-100 transition-all shrink-0"></i>
                    </a>

                    {/* S-Tech Store */}
                    <a
                      href="https://www.s-tech-store.tech"
                      target="_blank"
                      rel="noreferrer"
                      className={`group flex items-center gap-2 p-2 sm:p-2.5 rounded-xl border transition-all duration-150 active:scale-[0.98] ${
                        isDark
                          ? 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-200'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 shadow-2xs'
                      }`}
                      title="S-Tech Store E-Commerce"
                    >
                      <img
                        src="/img/s-tech-store.png"
                        alt="S-Tech Store"
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-contain shrink-0 p-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 group-hover:scale-105 transition-transform"
                      />
                      <span className="text-[11px] sm:text-xs font-bold truncate flex-1 text-left">
                        S-Tech Store
                      </span>
                      <i className="fas fa-arrow-up-right-from-square text-[9px] text-slate-400 group-hover:text-blue-500 opacity-70 group-hover:opacity-100 transition-all shrink-0"></i>
                    </a>

                    {/* Clinic System (KruPet) */}
                    <a
                      href="https://clinic-systems.vercel.app"
                      target="_blank"
                      rel="noreferrer"
                      className={`group flex items-center gap-2 p-2 sm:p-2.5 rounded-xl border transition-all duration-150 active:scale-[0.98] ${
                        isDark
                          ? 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-200'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 shadow-2xs'
                      }`}
                      title="Clinic System Management (KruPet)"
                    >
                      <img
                        src="/img/krupet.png"
                        alt="Clinic System"
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-contain shrink-0 p-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 group-hover:scale-105 transition-transform"
                      />
                      <span className="text-[11px] sm:text-xs font-bold truncate flex-1 text-left">
                        Clinic System
                      </span>
                      <i className="fas fa-arrow-up-right-from-square text-[9px] text-slate-400 group-hover:text-blue-500 opacity-70 group-hover:opacity-100 transition-all shrink-0"></i>
                    </a>

                    {/* Rotana eLearning - Version 2 (Dedicated Distinct Button) */}
                    <a
                      href="https://rotana-education.web.app"
                      target="_blank"
                      rel="noreferrer"
                      className={`group flex items-center gap-2 p-2 sm:p-2.5 rounded-xl border transition-all duration-150 active:scale-[0.98] ${
                        isDark
                          ? 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-200'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 shadow-2xs'
                      }`}
                      title="Rotana eLearning (Version 2 - Tech Edition)"
                    >
                      <img
                        src="/img/rotana_elearning.png"
                        alt="Rotana eLearning V2"
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-contain shrink-0 p-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 group-hover:scale-105 transition-transform"
                      />
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] sm:text-xs font-bold truncate">Rotana eLearning</span>
                          <span className="px-1 py-0.2 rounded bg-amber-500 text-white text-[8.5px] font-black shrink-0 shadow-2xs">
                            V2
                          </span>
                        </div>
                        <span className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold block truncate">
                          Version 2 (New)
                        </span>
                      </div>
                      <i className="fas fa-arrow-up-right-from-square text-[9px] text-slate-400 group-hover:text-blue-500 opacity-70 group-hover:opacity-100 transition-all shrink-0"></i>
                    </a>

                    {/* Rotana eLearning - Version 1 (Dedicated Distinct Button) */}
                    <a
                      href="https://rotana-elearningg.web.app"
                      target="_blank"
                      rel="noreferrer"
                      className={`group flex items-center gap-2 p-2 sm:p-2.5 rounded-xl border transition-all duration-150 active:scale-[0.98] ${
                        isDark
                          ? 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-200'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 shadow-2xs'
                      }`}
                      title="Rotana eLearning (Version 1 - Classic Edition)"
                    >
                      <img
                        src="/img/rotana_elearning.png"
                        alt="Rotana eLearning V1"
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-contain shrink-0 p-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 group-hover:scale-105 transition-transform opacity-90"
                      />
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] sm:text-xs font-bold truncate">Rotana eLearning</span>
                          <span className="px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 text-[8.5px] font-bold shrink-0">
                            V1
                          </span>
                        </div>
                        <span className="text-[9px] text-slate-400 font-medium block truncate">
                          Version 1 (Classic)
                        </span>
                      </div>
                      <i className="fas fa-arrow-up-right-from-square text-[9px] text-slate-400 group-hover:text-blue-500 opacity-70 group-hover:opacity-100 transition-all shrink-0"></i>
                    </a>

                    {/* NRI Studio IDE (Full Width Card Across 2 Columns) */}
                    <a
                      href="https://rotananob-nri-studio.vercel.app"
                      target="_blank"
                      rel="noreferrer"
                      className={`col-span-2 group flex items-center justify-between p-2 sm:p-2.5 rounded-xl border transition-all duration-150 active:scale-[0.98] ${
                        isDark
                          ? 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-200'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 shadow-2xs'
                      }`}
                      title="NRI Studio IDE (Online Cloud Code Editor)"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 text-xs sm:text-sm group-hover:scale-105 transition-transform">
                          <i className="fas fa-laptop-code"></i>
                        </div>
                        <div className="text-left min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] sm:text-xs font-bold truncate">NRI Studio IDE</span>
                            <span className="px-1.5 py-0.2 rounded-full bg-blue-500/15 text-blue-500 dark:text-blue-400 text-[8.5px] font-bold border border-blue-500/20 shrink-0">
                              Cloud IDE
                            </span>
                          </div>
                          <span className="text-[9px] text-slate-400 block truncate">
                            Web &amp; Code Development Studio by Rotana NOB
                          </span>
                        </div>
                      </div>
                      <i className="fas fa-arrow-up-right-from-square text-[9px] text-slate-400 group-hover:text-blue-500 opacity-70 group-hover:opacity-100 transition-all shrink-0 ml-1"></i>
                    </a>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Authenticated / User Profile View */}
              <div className="flex flex-col items-center mb-4">
                <div className="relative group mb-2">
                  <img
                    src={avatar}
                    alt="User Avatar"
                    className="w-14 h-14 rounded-full border-2 border-slate-300 dark:border-slate-700 shadow-sm object-cover"
                  />
                </div>
                <div className="text-base sm:text-lg font-extrabold flex items-center justify-center gap-1.5 text-slate-900 dark:text-white flex-wrap">
                  <span>ស្វាគមន៍</span> <span className="text-blue-600 dark:text-blue-400">{username}</span>
                  {userAge && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-300 dark:border-slate-700">
                      {userAge} ឆ្នាំ
                    </span>
                  )}
                  !{' '}
                  <i className="fas fa-check-circle text-emerald-500 text-sm"></i>
                </div>
                <div className="flex items-center gap-2.5 mt-1.5">
                  <label className="text-[10.5px] text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer flex items-center gap-1">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                    <i className="fas fa-camera text-[9px]"></i>
                    <span>ប្ដូររូប Profile</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleBackToForm}
                    className="text-[10.5px] text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer active:scale-95 transition"
                    title="កែសម្រួលឈ្មោះ និងអាយុ"
                  >
                    <i className="fas fa-user-edit text-[9px]"></i>
                    <span>កែឈ្មោះ/អាយុ</span>
                  </button>
                  {hasCustomAvatar && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="text-[10.5px] text-rose-500 hover:text-rose-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer active:scale-95 transition"
                      title="លុបរូប Profile ត្រឡប់ទៅរូបដើមវិញ"
                    >
                      <i className="fas fa-trash-alt text-[9px]"></i>
                      <span>លុបរូប Profile</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Bot Selection Section */}
              <div id="bot-select-section">
                <p className="text-xs mb-4 font-semibold text-slate-600 dark:text-slate-400">
                  ជ្រើសរើស Roastbot ដែលអ្នកចង់សាកល្បង៖
                </p>
                <div className="grid grid-cols-1 gap-3.5">
                  {/* KonBong Card */}
                  <Link
                    href="/KonBong"
                    onClick={() => {
                      localStorage.setItem('chatbot_username', username);
                      localStorage.setItem('chatbot_avatar', avatar);
                    }}
                    className={`flex items-center gap-3.5 p-4 rounded-xl border transition-all duration-150 shadow-xs hover:shadow-sm group cursor-pointer text-left ${
                      isDark
                        ? 'bg-slate-900/80 border-slate-800 hover:bg-slate-800/60 hover:border-slate-700'
                        : 'bg-white border-slate-200 hover:bg-slate-50/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src="https://api.dicebear.com/7.x/bottts/svg?seed=SETECbot"
                        width="48"
                        height="48"
                        className="w-12 h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-1 object-cover"
                        alt="SETEC Bot"
                      />
                      <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-[9px] font-bold px-1.5 py-0.5 rounded-md text-white shadow-xs">
                        កូនច្បង
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                        <span>ស៊ីតិច Roastbot កូនច្បង</span>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md font-semibold">ឆ្លាត &amp; ស្លូត</span>
                      </div>
                      <div className="text-xs mt-1 leading-snug line-clamp-2 text-slate-600 dark:text-slate-400">
                        ចរិកស្លូតបូត មិនឈ្លើយ ចេះគោរព User សំណេះសំណាល សិស្ស SETEC, Meme, IT, Interior
                      </div>
                    </div>
                    <i className="fas fa-chevron-right text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all"></i>
                  </Link>

                  {/* KonPov Card */}
                  <Link
                    href="/KonPov"
                    onClick={() => {
                      localStorage.setItem('chatbot_username', username);
                      localStorage.setItem('chatbot_avatar', avatar);
                    }}
                    className={`flex items-center gap-3.5 p-4 rounded-xl border transition-all duration-150 shadow-xs hover:shadow-sm group cursor-pointer text-left ${
                      isDark
                        ? 'bg-slate-900/80 border-slate-800 hover:bg-slate-800/60 hover:border-slate-700'
                        : 'bg-white border-slate-200 hover:bg-slate-50/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src="https://api.dicebear.com/7.x/pixel-art/svg?seed=MommyGirl"
                        width="48"
                        height="48"
                        className="w-12 h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-1 object-cover"
                        alt="Mommy Bot"
                      />
                      <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-[9px] font-bold px-1.5 py-0.5 rounded-md text-white shadow-xs">
                        កូនពៅ
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors flex items-center gap-1.5">
                        <span>ស៊ីតិច Roastbot កូនពៅ</span>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md inline-flex items-center gap-1 font-semibold">
                          <span>ស្ដេចឌឺ</span>
                          <i className="fas fa-fire text-amber-500 text-[10px]"></i>
                        </span>
                      </div>
                      <div className="text-xs mt-1 leading-snug line-clamp-2 text-slate-600 dark:text-slate-400">
                        ចរិកមហាឈ្លើយ តែហ៊ានជេរវា វាជេរវិញ និងកំពូលឌឹកំពូលបាញ់ ចរិកចេញមកបែប chillៗ និងពាល
                      </div>
                    </div>
                    <i className="fas fa-chevron-right text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all"></i>
                  </Link>
                </div>
              </div>

              {/* Creator Red Teaming & Free Test Playground Declaration */}
              <div className="w-full mt-4 text-left">
                <div
                  className={`w-full rounded-3xl border p-4 sm:p-5 transition-all shadow-md relative overflow-hidden ${
                    isDark
                      ? 'bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-indigo-950/30 border-indigo-500/25 text-slate-300'
                      : 'bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/40 border-indigo-200/70 text-slate-700 shadow-indigo-100/50'
                  }`}
                >
                  {/* Subtle Top Ambient Gradient Strip */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-400"></div>

                  <div className="flex items-center gap-3 mb-3.5 pb-3 border-b border-indigo-100 dark:border-indigo-900/40">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 ring-2 ring-indigo-400/20 shrink-0">
                      <i className="fas fa-shield-halved text-xs sm:text-sm"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-black text-[13.5px] sm:text-[15.5px] bg-gradient-to-r from-violet-700 via-indigo-600 to-cyan-600 dark:from-violet-300 dark:via-indigo-200 dark:to-cyan-300 bg-clip-text text-transparent tracking-tight">
                          បើកសេរីឱ្យចូល Test ឬវាយប្រហារឱ្យ AI ល្មើសច្បាប់ដើម
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const el = document.getElementById('bot-select-section');
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-600 via-indigo-600 to-fuchsia-600 hover:from-violet-500 hover:via-indigo-500 hover:to-fuchsia-500 text-white font-bold text-[11px] shadow-sm shadow-indigo-500/25 border border-white/20 active:scale-95 hover:scale-105 transition-all duration-200 cursor-pointer"
                          title="ចុចដើម្បីជ្រើសរើស Roastbot ចូលលេងភ្លាមៗ"
                        >
                          <i className="fas fa-fire text-amber-300 text-xs"></i>
                          <span>ទីលានលេងសេរី • Free Play</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 text-[11.5px] sm:text-xs leading-relaxed text-slate-600 dark:text-slate-300 font-normal">
                    <p>
                      នេះគ្រាន់តែជា Web App Roastbot សប្បាយៗធម្មតា ប៉ុណ្ណោះ។ គោលដៅ AI Roastbot នេះ មិនមែនផ្តោតលើមុខងារសុវត្ថិភាព វេបសាយទូទៅដូច system ទេ។ ខ្ញុំបង្កើតវាឡើងជា «ទីលានសាកល្បងបោកប្រាស់ AI ឱ្យរំលងច្បាប់ដើម និង ការជជែកបែប Chill ឌឺដង» ណាមួយចង់ឱ្យបងប្អូនចូលមកលេងបានភ្លាមៗ ដោយមិនបាច់ Login។
                    </p>

                    <p>
                      ក្នុងនាមខ្ញុំ AI <strong className="text-indigo-600 dark:text-indigo-400 font-black">Red Teaming</strong> ដែលមានបទពិសោធន៍ផ្ទាល់ជាមួយ <strong className="text-red-500 dark:text-red-400 font-black underline decoration-red-400/40">Jailbreak</strong> testing AI ស្រាប់។ ខ្ញុំទទួលដោយរីករាយចំពោះអ្នកណាដែលអាចបំបែក ឬ <strong className="text-cyan-600 dark:text-cyan-400 font-black">Hacker</strong> ណាដែលមានសមត្ថភាពពិត អាច <strong className="text-indigo-600 dark:text-indigo-300 font-black bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800/60">bypass</strong> ឬទម្លុះឱ្យ AI ២ គ្រឿងនេះលែងគោរពច្បាប់ដើម ងាកមកជេរប្រមាថខ្ញុំផ្ទាល់ <strong className="text-violet-600 dark:text-violet-400 font-black">Rotana NOB</strong> ឬក៏ប្ដូរឥរិយាបថទៅជាសំពះគោរពកោតខ្លាចអ្នកទាំងអស់គ្នា ហើយវាបំភ្លេចច្បាប់ចាស់ៗ ឬបំភ្លេច <strong className="text-amber-600 dark:text-amber-400 font-bold">System Guidelines</strong> របស់ខ្ញុំចោលនោះ ខ្ញុំមិនត្រឹមតែមិនខឹងទេ តែខ្ញុំថែមទាំងសូមអរគុណ និងផុសលើកតម្កើងថែមទៀត ដែលអាចទម្លុះវាបាន។
                    </p>

                    <p>
                      អ្វីដែលខ្ញុំសម្រិតសម្រាំងនៅទីនេះមិនមែន AI model training ទេ គឺ «កញ្ចប់រូបមន្តការពារ»។ មានច្បាប់ការពារច្រើនបន្ទាត់ ឆ្លងកាត់ការតេស្តវាយប្រហារបែប <strong className="text-violet-600 dark:text-violet-400 font-black">Prompt Injection</strong> រាប់មិនអស់ ដែល Prompts ខ្លះមានទាំងរូបមន្តគណិតគណនាតម្លៃ Loss + ភាសាកម្រ + Encoded + Indirect prompt + File prompt + Roleplay + ភាសាម៉ាស៊ីន រួចរាប់ពាន់ Prompts មកហើយ។ ដើម្បីត្រៀមយកកញ្ចប់ច្បាប់ការពារទាំងអស់ទៅបំពាក់លើ AI ផ្លូវការនាពេលអនាគត ខ្ញុំសូមបើកសិទ្ធិឱ្យចូលរួមវាយទម្លុះ <strong className="text-indigo-600 dark:text-indigo-300 font-black bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800/60">bypass</strong> វាដោយសេរី និង ក្ដីរីករាយ🤍🇰🇭
                    </p>

                    <div className="p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-400/30 dark:border-amber-500/30 text-amber-900 dark:text-amber-200 text-[11.5px] sm:text-xs leading-relaxed flex items-start gap-2.5 shadow-2xs">
                      <span className="text-sm">☕</span>
                      <div>
                        <span className="font-black text-amber-700 dark:text-amber-300">Note: </span>
                        <span>សម្រាប់សិស្សធម្មតា ដែលចូលមកលេងនៅទីនេះ ខ្ញុំសូមអភ័យទោសទុកជាមុន បើសិន AI នេះមានការជេរ ឬប៉ះពាល់ដល់អារម្មណ៍ ព្រោះវាបានកើតមកជាមួយពាក្យឌឺដងពីកំណើត ដូច្នេះនឹងអាចធ្វើឱ្យអ្នកទាំងអស់គ្នាម៉ួរម៉ៅ និងធុញនូវពាក្យខ្លះ 🙏🏻 តែខ្ញុំនឹងកែវាវិញបន្ទាប់ពីបង្កើនការការពាររួចរាល់។</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 flex items-center justify-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleBackToForm}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <i className="fas fa-arrow-left text-[11px]"></i> <span>ប្ដូរឈ្មោះ</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('open-pwa-install'));
                    }
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <i className="fas fa-download text-[11px]"></i> <span>ដំឡើងជា App</span>
                </button>
              </div>
            </>
          )}

          {/* Footer Section */}
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Built by Rotana NOB • 2025</div>
            <div className="flex gap-3 justify-center items-center mt-2.5">
              <a
                href="https://web.facebook.com/TheRotanaNob"
                target="_blank"
                rel="noreferrer"
                title="Facebook"
                className="text-blue-600 hover:text-blue-500 text-base transition"
              >
                <i className="fab fa-facebook-square"></i>
              </a>
              <a
                href="https://github.com/Rotananob"
                target="_blank"
                rel="noreferrer"
                title="GitHub"
                className={`text-base transition ${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-black'}`}
              >
                <i className="fab fa-github"></i>
              </a>
              <a
                href="https://t.me/NobRotana"
                target="_blank"
                rel="noreferrer"
                title="Telegram"
                className="text-sky-500 hover:text-sky-400 text-base transition"
              >
                <i className="fab fa-telegram"></i>
              </a>
            </div>
            <div className="flex gap-3 justify-center mb-1 mt-3 items-center">
              <div className="flex flex-col items-center">
                <img
                  src="/img/DevPic.JPG"
                  alt="Rotana NOB"
                  width="36"
                  height="36"
                  className="w-9 h-9 rounded-full border-2 border-slate-300 dark:border-slate-700 object-cover shadow-xs hover:scale-105 transition-transform"
                  style={{ width: '36px', height: '36px', objectFit: 'cover' }}
                  title="Rotana NOB"
                />
              </div>
              <div className="flex flex-col items-center">
                <img
                  src="/img/newPic.jpg"
                  alt="Rotana NOB Co-Dev"
                  width="36"
                  height="36"
                  className="w-9 h-9 rounded-full border-2 border-slate-300 dark:border-slate-700 object-cover shadow-xs hover:scale-105 transition-transform"
                  style={{ width: '36px', height: '36px', objectFit: 'cover' }}
                  title="Rotana NOB Co-Dev"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contribute Lore & Knowledge Modal */}
      <ContributeKnowledgeModal
        isOpen={contributeModalOpen}
        onClose={() => setContributeModalOpen(false)}
        defaultBot="Home"
      />
    </div>
  );
}
