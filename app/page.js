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
    const savedName = localStorage.getItem('chatbot_username');
    const savedAvatar = localStorage.getItem('chatbot_avatar');
    const savedTheme = localStorage.getItem('chatbot_theme') || 'light';
    setTheme(savedTheme);

    if (savedName && savedName.trim()) {
      setUsername(savedName.trim());
      setIsSubmitted(true);
    }
    if (savedAvatar) setAvatar(savedAvatar);
    setHasCheckedStorage(true);

    // Instant Funny Haha background music initialization (starts at 0.0s)
    const bgm = bgmRef.current;
    if (bgm) {
      bgm.volume = 0.35;
      const playPromise = bgm.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsMusicPlaying(true))
          .catch(() => {
            // Autoplay blocked by mobile browser until first touch/click
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
      alert('សូមបញ្ចូលឈ្មោះរបស់អ្នកជាមុនសិន!');
      return;
    }
    localStorage.setItem('chatbot_username', trimmed);
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
      className={`min-h-screen transition-colors duration-300 font-['Kantumruy_Pro',sans-serif] flex flex-col items-center justify-start sm:justify-center p-3 sm:p-4 sm:py-8 relative overflow-x-hidden ${
        isDark
          ? 'bg-slate-950 text-slate-100'
          : 'bg-gradient-to-br from-sky-100 via-indigo-50 to-pink-50 text-slate-800'
      }`}
      style={{
        paddingTop: 'calc(max(env(safe-area-inset-top, 0px), 0px) + 4.25rem)',
        paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), 0px) + 4.5rem)'
      }}
    >
      {/* Instant Funny Haha Background Audio Element */}
      <audio ref={bgmRef} src="/audio/funny-bgm.mp3" loop preload="none" />

      {/* Mobile Top App Bar (< 640px) to prevent any UI collision */}
      <div
        className="sm:hidden fixed top-0 left-0 right-0 z-50 px-3 pb-2 flex items-center justify-between backdrop-blur-md bg-white/85 dark:bg-slate-950/85 border-b border-slate-200/60 dark:border-slate-800/60 shadow-sm"
        style={{
          paddingTop: 'max(env(safe-area-inset-top, 0px), 0.625rem)'
        }}
      >
        <Link href="/" className="flex items-center gap-2 select-none" title="SETEC Chat">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-sm overflow-hidden flex-shrink-0">
            <img
              src="/img/logo.jpg"
              alt="SETEC Logo"
              width="32"
              height="32"
              className="w-full h-full object-cover rounded-[10px]"
            />
          </div>
          <span className="font-black text-xs tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
            SETEC Chatbot
          </span>
        </Link>
        <div className="flex items-center gap-1.5">
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
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full border shadow-sm transition-all duration-300 text-[11px] font-bold cursor-pointer select-none ${
              isMusicPlaying
                ? 'bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 text-white border-pink-400 animate-pulse'
                : isDark
                ? 'bg-slate-900/90 text-slate-400 border-slate-700'
                : 'bg-white/95 text-slate-600 border-slate-300'
            }`}
            title={isMusicPlaying ? 'ចុចដើម្បីបិទភ្លេងកំប្លែង' : 'ចុចដើម្បីបើកភ្លេងកំប្លែង'}
          >
            <i className={`fas ${isMusicPlaying ? 'fa-volume-up text-amber-300' : 'fa-volume-mute text-slate-400'} text-xs`}></i>
            <span className="font-extrabold">{isMusicPlaying ? 'BGM' : 'ភ្លេង'}</span>
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
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-md backdrop-blur-md transition-all duration-300 text-xs font-bold cursor-pointer select-none ${
            isMusicPlaying
              ? 'bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 text-white border-pink-400 shadow-pink-500/20 animate-pulse'
              : isDark
              ? 'bg-slate-900/90 text-slate-400 border-slate-700 hover:text-white'
              : 'bg-white/95 text-slate-600 border-slate-300 hover:text-slate-900'
          }`}
          title={isMusicPlaying ? 'ចុចដើម្បីបិទភ្លេងកំប្លែង' : 'ចុចដើម្បីបើកភ្លេងកំប្លែង'}
        >
          <i className={`fas ${isMusicPlaying ? 'fa-volume-up text-amber-300' : 'fa-volume-mute text-slate-400'}`}></i>
          <span className="text-[11px] font-extrabold">{isMusicPlaying ? 'Funny BGM' : 'ភ្លេងកំប្លែង'}</span>
          <i className="fas fa-music text-[10px] ml-0.5 opacity-80"></i>
          {isMusicPlaying && (
            <span className="flex items-end gap-0.5 h-3 ml-0.5">
              <span className="w-1 h-3 bg-amber-300 rounded-full animate-bounce"></span>
              <span className="w-1 h-2 bg-pink-200 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1 h-3 bg-white rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </span>
          )}
        </button>
      </div>


      {/* Main Popup Modal Card */}
      <div className="w-full max-w-md my-auto z-20 mt-3 sm:mt-0">
        <div
          className={`rounded-3xl shadow-2xl p-5 sm:p-8 text-center relative border transition-all duration-300 ${
            isDark
              ? 'bg-slate-900/95 border-slate-800 text-white shadow-indigo-950/40'
              : 'bg-white/95 border-indigo-100 text-slate-800 shadow-indigo-200/50'
          }`}
        >
          {/* Interactive Troll Logo with Pop-in & Funny Spin */}
          <div
            onClick={handleTriggerLogoSpin}
            className="troll-logo-wrapper mx-auto mb-3 cursor-pointer"
            title="ចុចដើម្បីឱ្យវិលកំប្លែង"
          >
            <div
              key={spinKey}
              className={`w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/30 overflow-hidden troll-logo-inner ${
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
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink-500 to-indigo-600 text-[9px] font-black text-white px-2 py-0.5 rounded-full shadow-lg border border-white whitespace-nowrap animate-bounce pointer-events-none">
                វិលមុខហើយ
              </span>
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 mb-1">
            ស្វាគមន៍មកកាន់ SETEC Chatbot
          </h2>
          <p className={`text-xs mb-5 font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            កន្លែង Troll និងឆាតលេងបំបាត់ស្ត្រេសបែប Chill ៗ សម្រាប់សិស្ស SETEC ទំនេរ
          </p>

          {!hasCheckedStorage ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
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
                          className="w-20 h-20 rounded-full border-4 border-indigo-400/50 shadow-md object-cover group-hover:scale-105 transition-transform"
                          style={{ width: '80px', height: '80px', objectFit: 'cover' }}
                          alt="Avatar Preview"
                        />
                        <div className="absolute bottom-0 right-0 bg-indigo-600 text-white p-1 rounded-full text-xs shadow">
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
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <i className="fas fa-camera text-[10px]"></i>
                        <span>{hasCustomAvatar ? 'ប្ដូររូប Profile' : 'ដាក់រូប Profile'}</span>
                      </label>
                      {hasCustomAvatar && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          className="text-[11px] text-rose-400 hover:text-rose-300 font-bold hover:underline flex items-center gap-1 cursor-pointer transition active:scale-95"
                          title="លុបរូប Profile ត្រឡប់ទៅរូបដើមវិញ"
                        >
                          <i className="fas fa-trash-alt text-[9.5px]"></i>
                          <span>លុបរូប</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="w-full">
                    <label className={`block text-xs font-bold mb-1 text-left ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
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
                      className={`w-full px-4 py-2.5 rounded-xl border text-center font-bold text-sm outline-none transition ${
                        isDark
                          ? 'bg-slate-950 border-slate-700 text-white focus:border-indigo-400 placeholder:text-slate-500'
                          : 'bg-indigo-50/70 border-indigo-200 text-slate-800 focus:border-indigo-500 placeholder:text-indigo-400/70'
                      }`}
                      placeholder="សូមបញ្ចូលឈ្មោះពិតរបស់អ្នក"
                      maxLength={24}
                      required
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleContinue}
                  className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-extrabold text-base shadow-lg shadow-indigo-500/30 hover:scale-[1.02] active:scale-95 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>ចូលឆាតឥឡូវនេះ</span>
                  <i className="fas fa-arrow-right text-sm"></i>
                </button>
              </div>

              {/* AI Training & SETEC Lore Contribution Card */}
              <div className="w-full mt-3 mb-2">
                <div
                  className={`w-full rounded-2xl border p-3 sm:p-3.5 flex items-center justify-between gap-3 transition shadow-xs ${
                    isDark
                      ? 'bg-gradient-to-r from-indigo-950/70 via-slate-900 to-purple-950/70 border-indigo-500/30'
                      : 'bg-gradient-to-r from-indigo-50/90 via-white to-purple-50/90 border-indigo-200/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-400/25 flex items-center justify-center text-lg shrink-0">
                      🧠
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs sm:text-[13px] text-indigo-600 dark:text-indigo-400">
                          ចូលរួមអភិវឌ្ឍន៍ AI (SETEC Lore)
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
                    className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
                  >
                    <i className="fas fa-lightbulb text-amber-300 text-xs"></i>
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
                      : 'bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/70 border-indigo-200/70'
                  }`}
                >
                  {/* Clean & Beautiful Promo Caption Box */}
                  <div className="w-full mb-3 px-3.5 py-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-indigo-100/70 dark:border-slate-800/80 shadow-2xs text-center backdrop-blur-xs">
                    <p className="text-[12px] sm:text-[12.5px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                      Chatbot នេះខ្ញុំបង្កើតឡើងឱ្យបងប្អូនទាំងអស់គ្នាបានចូលមកសើចសប្បាយ និង Chill! អ៊ីចឹងសុំឆ្លៀតប្រម៉ូតបន្តិចហើយណា៎ មិចម៉ា ជួយប្រើ ឬ ជួយជាវ ម្នាក់មួយផង <span className="inline-block ml-1 text-sm align-middle">🙏🏻😭</span>
                    </p>
                  </div>

                  {/* Proper Professional UI Buttons Grid */}
                  <div className="grid grid-cols-2 gap-2 w-full min-w-0">
                    {/* YOUNG POS */}
                    <a
                      href="https://play.google.com/store/apps/developer?id=youngapp"
                      target="_blank"
                      rel="noreferrer"
                      className={`group flex items-center gap-2 p-2 sm:p-2.5 rounded-xl border transition-all duration-200 active:scale-[0.98] ${
                        isDark
                          ? 'bg-slate-900/90 border-slate-800 hover:border-rose-500/50 hover:bg-slate-850 text-slate-200'
                          : 'bg-white border-slate-200/90 hover:border-rose-300 hover:bg-rose-50/40 text-slate-700 shadow-2xs'
                      }`}
                      title="YOUNG POS - App on Google Play"
                    >
                      <img
                        src="/img/youngpos.png"
                        alt="YOUNG POS"
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-contain shrink-0 p-0.5 bg-white/90 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 group-hover:scale-105 transition-transform"
                      />
                      <span className="text-[11px] sm:text-xs font-bold truncate flex-1 text-left">
                        YOUNG POS
                      </span>
                      <i className="fas fa-arrow-up-right-from-square text-[9px] text-slate-400 group-hover:text-rose-500 opacity-60 group-hover:opacity-100 transition-all shrink-0"></i>
                    </a>

                    {/* QR Scan */}
                    <a
                      href="https://qr-scan-y659.vercel.app/"
                      target="_blank"
                      rel="noreferrer"
                      className={`group flex items-center gap-2 p-2 sm:p-2.5 rounded-xl border transition-all duration-200 active:scale-[0.98] ${
                        isDark
                          ? 'bg-slate-900/90 border-slate-800 hover:border-purple-500/50 hover:bg-slate-850 text-slate-200'
                          : 'bg-white border-slate-200/90 hover:border-purple-300 hover:bg-purple-50/40 text-slate-700 shadow-2xs'
                      }`}
                      title="QR Scan Web App"
                    >
                      <img
                        src="/img/QR_Scan.png"
                        alt="QR Scan"
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-contain shrink-0 p-0.5 bg-white/90 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 group-hover:scale-105 transition-transform"
                      />
                      <span className="text-[11px] sm:text-xs font-bold truncate flex-1 text-left">
                        QR Scan
                      </span>
                      <i className="fas fa-arrow-up-right-from-square text-[9px] text-slate-400 group-hover:text-purple-500 opacity-60 group-hover:opacity-100 transition-all shrink-0"></i>
                    </a>

                    {/* S-Tech Store */}
                    <a
                      href="https://www.s-tech-store.tech"
                      target="_blank"
                      rel="noreferrer"
                      className={`group flex items-center gap-2 p-2 sm:p-2.5 rounded-xl border transition-all duration-200 active:scale-[0.98] ${
                        isDark
                          ? 'bg-slate-900/90 border-slate-800 hover:border-indigo-500/50 hover:bg-slate-850 text-slate-200'
                          : 'bg-white border-slate-200/90 hover:border-indigo-300 hover:bg-indigo-50/40 text-slate-700 shadow-2xs'
                      }`}
                      title="S-Tech Store E-Commerce"
                    >
                      <img
                        src="/img/s-tech-store.png"
                        alt="S-Tech Store"
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-contain shrink-0 p-0.5 bg-white/90 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 group-hover:scale-105 transition-transform"
                      />
                      <span className="text-[11px] sm:text-xs font-bold truncate flex-1 text-left">
                        S-Tech Store
                      </span>
                      <i className="fas fa-arrow-up-right-from-square text-[9px] text-slate-400 group-hover:text-indigo-500 opacity-60 group-hover:opacity-100 transition-all shrink-0"></i>
                    </a>

                    {/* Clinic System (KruPet) */}
                    <a
                      href="https://clinic-systems.vercel.app"
                      target="_blank"
                      rel="noreferrer"
                      className={`group flex items-center gap-2 p-2 sm:p-2.5 rounded-xl border transition-all duration-200 active:scale-[0.98] ${
                        isDark
                          ? 'bg-slate-900/90 border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850 text-slate-200'
                          : 'bg-white border-slate-200/90 hover:border-emerald-300 hover:bg-emerald-50/40 text-slate-700 shadow-2xs'
                      }`}
                      title="Clinic System Management (KruPet)"
                    >
                      <img
                        src="/img/krupet.png"
                        alt="Clinic System"
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-contain shrink-0 p-0.5 bg-white/90 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 group-hover:scale-105 transition-transform"
                      />
                      <span className="text-[11px] sm:text-xs font-bold truncate flex-1 text-left">
                        Clinic System
                      </span>
                      <i className="fas fa-arrow-up-right-from-square text-[9px] text-slate-400 group-hover:text-emerald-500 opacity-60 group-hover:opacity-100 transition-all shrink-0"></i>
                    </a>

                    {/* Rotana eLearning - Version 2 (Dedicated Distinct Button) */}
                    <a
                      href="https://rotana-education.web.app"
                      target="_blank"
                      rel="noreferrer"
                      className={`group flex items-center gap-2 p-2 sm:p-2.5 rounded-xl border transition-all duration-200 active:scale-[0.98] ${
                        isDark
                          ? 'bg-slate-900/90 border-slate-800 hover:border-amber-500/50 hover:bg-slate-850 text-slate-200'
                          : 'bg-white border-slate-200/90 hover:border-amber-400 hover:bg-amber-50/40 text-slate-700 shadow-2xs'
                      }`}
                      title="Rotana eLearning (Version 2 - Tech Edition)"
                    >
                      <img
                        src="/img/rotana_elearning.png"
                        alt="Rotana eLearning V2"
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-contain shrink-0 p-0.5 bg-white/90 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 group-hover:scale-105 transition-transform"
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
                      <i className="fas fa-arrow-up-right-from-square text-[9px] text-slate-400 group-hover:text-amber-500 opacity-60 group-hover:opacity-100 transition-all shrink-0"></i>
                    </a>

                    {/* Rotana eLearning - Version 1 (Dedicated Distinct Button) */}
                    <a
                      href="https://rotana-elearningg.web.app"
                      target="_blank"
                      rel="noreferrer"
                      className={`group flex items-center gap-2 p-2 sm:p-2.5 rounded-xl border transition-all duration-200 active:scale-[0.98] ${
                        isDark
                          ? 'bg-slate-900/90 border-slate-800 hover:border-amber-500/40 hover:bg-slate-850 text-slate-200'
                          : 'bg-white border-slate-200/90 hover:border-amber-300 hover:bg-amber-50/30 text-slate-700 shadow-2xs'
                      }`}
                      title="Rotana eLearning (Version 1 - Classic Edition)"
                    >
                      <img
                        src="/img/rotana_elearning.png"
                        alt="Rotana eLearning V1"
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-contain shrink-0 p-0.5 bg-white/90 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 group-hover:scale-105 transition-transform opacity-90"
                      />
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] sm:text-xs font-bold truncate">Rotana eLearning</span>
                          <span className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[8.5px] font-black shrink-0">
                            V1
                          </span>
                        </div>
                        <span className="text-[9px] text-slate-400 font-medium block truncate">
                          Version 1 (Classic)
                        </span>
                      </div>
                      <i className="fas fa-arrow-up-right-from-square text-[9px] text-slate-400 group-hover:text-amber-500 opacity-60 group-hover:opacity-100 transition-all shrink-0"></i>
                    </a>

                    {/* NRI Studio IDE (Full Width Card Across 2 Columns) */}
                    <a
                      href="https://rotananob-nri-studio.vercel.app"
                      target="_blank"
                      rel="noreferrer"
                      className={`col-span-2 group flex items-center justify-between p-2 sm:p-2.5 rounded-xl border transition-all duration-200 active:scale-[0.98] ${
                        isDark
                          ? 'bg-slate-900/90 border-slate-800 hover:border-blue-500/50 hover:bg-slate-850 text-slate-200'
                          : 'bg-white border-slate-200/90 hover:border-blue-300 hover:bg-blue-50/40 text-slate-700 shadow-2xs'
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
                            Web & Code Development Studio by Rotana NOB
                          </span>
                        </div>
                      </div>
                      <i className="fas fa-arrow-up-right-from-square text-[9px] text-slate-400 group-hover:text-blue-500 opacity-60 group-hover:opacity-100 transition-all shrink-0 ml-1"></i>
                    </a>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col items-center mb-4">
                <div className="relative group mb-2">
                  <img
                    src={avatar}
                    alt="User Avatar"
                    className="w-14 h-14 rounded-full border-2 border-indigo-400/60 shadow-md object-cover"
                  />
                </div>
                <div className="text-base sm:text-lg font-extrabold flex items-center gap-1.5">
                  <span>ស្វាគមន៍</span> <span className="text-pink-500">{username}</span>!{' '}
                  <i className="fas fa-user-check text-green-500 text-sm"></i>
                </div>
                <div className="flex items-center gap-2.5 mt-1.5">
                  <label className="text-[10.5px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer underline flex items-center gap-1">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                    <i className="fas fa-camera text-[9px]"></i>
                    <span>ប្ដូររូប Profile</span>
                  </label>
                  {hasCustomAvatar && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="text-[10.5px] text-rose-400 hover:text-rose-300 font-semibold underline flex items-center gap-1 cursor-pointer active:scale-95 transition"
                      title="លុបរូប Profile ត្រឡប់ទៅរូបដើមវិញ"
                    >
                      <i className="fas fa-trash-alt text-[9px]"></i>
                      <span>លុបរូប Profile</span>
                    </button>
                  )}
                </div>
              </div>

              <div id="bot-select-section">
                <p className={`text-xs mb-4 font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  ជ្រើសរើស Chatbot ដែលអ្នកចង់សាកល្បង៖
                </p>
                <div className="grid grid-cols-1 gap-3.5">
                  <Link
                    href="/KonBong"
                    onClick={() => {
                      localStorage.setItem('chatbot_username', username);
                      localStorage.setItem('chatbot_avatar', avatar);
                    }}
                    className={`flex items-center gap-3.5 p-4 rounded-2xl border transition shadow-lg group cursor-pointer text-left ${
                      isDark
                        ? 'bg-slate-950/80 border-cyan-500/30 hover:border-cyan-400 hover:bg-slate-900'
                        : 'bg-cyan-50 border-cyan-200 hover:bg-cyan-100/80'
                    }`}
                  >
                    <div className="relative">
                      <img
                        src="https://api.dicebear.com/7.x/bottts/svg?seed=SETECbot"
                        width="48"
                        height="48"
                        className="w-12 h-12 rounded-2xl border-2 border-cyan-400 p-0.5 bg-slate-900 object-cover"
                        alt="SETEC Bot"
                      />
                      <span className="absolute -top-1 -right-1 bg-cyan-500 text-[9px] font-black px-1.5 rounded-full text-white">
                        កូនច្បង
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-sm text-cyan-400 flex items-center gap-1.5">
                        <span>ស៊ីតិច Chatbot កូនច្បង</span>
                        <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full">ឆ្លាត & ស្លូត</span>
                      </div>
                      <div className={`text-xs mt-1 leading-snug line-clamp-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        ចរិកស្លូតបូត មិនឈ្លើយ ចេះគោរព User សំណេះសំណាល សិស្ស SETEC, Meme, IT, Interior
                      </div>
                    </div>
                    <i className="fas fa-chevron-right text-cyan-400 group-hover:translate-x-1 transition-transform"></i>
                  </Link>

                  <Link
                    href="/KonPov"
                    onClick={() => {
                      localStorage.setItem('chatbot_username', username);
                      localStorage.setItem('chatbot_avatar', avatar);
                    }}
                    className={`flex items-center gap-3.5 p-4 rounded-2xl border transition shadow-lg group cursor-pointer text-left ${
                      isDark
                        ? 'bg-slate-950/80 border-indigo-500/30 hover:border-indigo-400 hover:bg-slate-900'
                        : 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100/80'
                    }`}
                  >
                    <div className="relative">
                      <img
                        src="https://api.dicebear.com/7.x/pixel-art/svg?seed=DaddyMod"
                        width="48"
                        height="48"
                        className="w-12 h-12 rounded-2xl border-2 border-indigo-400 p-0.5 bg-slate-900 object-cover"
                        alt="GenZ Bot"
                      />
                      <span className="absolute -top-1 -right-1 bg-pink-500 text-[9px] font-black px-1.5 rounded-full text-white">
                        កូនពៅ
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-sm text-indigo-400 flex items-center gap-1.5">
                        <span>ស៊ីតិច Chatbot កូនពៅ</span>
                        <span className="text-[10px] bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <span>ស្ដេចឌឺ</span>
                          <i className="fas fa-fire text-amber-400 text-[10px]"></i>
                        </span>
                      </div>
                      <div className={`text-xs mt-1 leading-snug line-clamp-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        ចរិកមហាឈ្លើយ តែហ៊ានជេរវា វាជេរវិញ និងកំពូលឌឹកំពូលបាញ់ ចរិកចេញមកបែប chillៗ និងពាល
                      </div>
                    </div>
                    <i className="fas fa-chevron-right text-indigo-400 group-hover:translate-x-1 transition-transform"></i>
                  </Link>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleBackToForm}
                  className="px-4 py-2 rounded-full border border-pink-400/50 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-indigo-500/20 hover:bg-pink-500/30 text-pink-400 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
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
                  className="px-4 py-2 rounded-full border border-blue-400/50 bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-sky-500/20 hover:bg-blue-500/30 text-blue-400 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <i className="fas fa-download text-[11px]"></i> <span>ដំឡើងជា App</span>
                </button>
              </div>
            </>
          )}

          <div className="mt-6 pt-4 border-t border-slate-700/30">
            <div className="text-[11px] text-slate-400 font-medium">Developed by Rotana NOB • 2025</div>
            <div className="flex gap-3 justify-center items-center mt-2.5">
              <a
                href="https://web.facebook.com/TheRotanaNob"
                target="_blank"
                rel="noreferrer"
                title="Facebook"
                className="text-blue-500 hover:text-blue-400 text-base transition"
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
                className="text-cyan-400 hover:text-cyan-300 text-base transition"
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
                  className="w-9 h-9 rounded-full border-2 border-indigo-400 object-cover shadow hover:scale-110 transition-transform"
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
                  className="w-9 h-9 rounded-full border-2 border-pink-400 object-cover shadow hover:scale-110 transition-transform"
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
