'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';

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
  const bgmRef = useRef(null);

  const handleTriggerLogoSpin = () => {
    setIsLogoSpinning(true);
    setSpinKey((prev) => prev + 1);
    setTimeout(() => {
      setIsLogoSpinning(false);
    }, 850);
  };

  useEffect(() => {
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

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const result = evt.target.result;
        setAvatar(result);
        localStorage.setItem('chatbot_avatar', result);
      };
      reader.readAsDataURL(file);
    }
  };

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
    localStorage.setItem('chatbot_avatar', avatar);
    setIsSubmitted(true);
  };

  const handleBackToForm = () => {
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
            កន្លែង Troll និងឆាតលេងបំបាត់ស្ត្រេសបែប Chill ៗ សម្រាប់ក្មេង SETEC
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
                    <span className="text-[11px] text-indigo-400 mt-1 font-bold group-hover:underline">
                      ដាក់ ឬប្ដូររូប Profile
                    </span>
                    <input
                      type="file"
                      id="avatar-input"
                      accept="image/*"
                      className="hidden"
                      style={{ display: 'none' }}
                      onChange={handleAvatarChange}
                    />
                  </label>

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

              {/* Other Websites Section */}
              <div id="other-websites-section" className="flex flex-col items-center mt-3 mb-3">
                <div
                  className={`w-full rounded-2xl border p-3 flex flex-col items-center transition ${
                    isDark
                      ? 'bg-slate-950/70 border-slate-800'
                      : 'bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200'
                  }`}
                >
                  <span className="text-indigo-400 font-bold text-[11px] mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                    <i className="fas fa-globe-asia text-sm text-indigo-400"></i> Our Ecosystem & Websites
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 w-full min-w-0">
                    <a
                      href="https://www.s-tech-store.tech"
                      target="_blank"
                      rel="noreferrer"
                      className={`flex flex-col items-center p-1.5 rounded-xl border text-[10px] font-semibold transition ${
                        isDark
                          ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                          : 'bg-white border-indigo-100 text-indigo-700 hover:bg-indigo-100/60'
                      }`}
                    >
                      <i className="fas fa-store text-indigo-500 text-sm mb-0.5"></i>
                      <span className="truncate">S-Tech Store</span>
                    </a>
                    <a
                      href="https://clinic-systems.vercel.app"
                      target="_blank"
                      rel="noreferrer"
                      className={`flex flex-col items-center p-1.5 rounded-xl border text-[10px] font-semibold transition ${
                        isDark
                          ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                          : 'bg-white border-emerald-100 text-emerald-700 hover:bg-emerald-100/60'
                      }`}
                    >
                      <i className="fas fa-clinic-medical text-emerald-500 text-sm mb-0.5"></i>
                      <span className="truncate">Clinic System</span>
                    </a>
                    <a
                      href="https://rotananob-nri-studio.vercel.app"
                      target="_blank"
                      rel="noreferrer"
                      className={`flex flex-col items-center p-1.5 rounded-xl border text-[10px] font-semibold transition ${
                        isDark
                          ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                          : 'bg-white border-blue-100 text-blue-700 hover:bg-blue-100/60'
                      }`}
                    >
                      <i className="fas fa-laptop-code text-blue-500 text-sm mb-0.5"></i>
                      <span className="truncate">NRI Studio IDE</span>
                    </a>
                    <div
                      className={`flex flex-col items-center p-1.5 rounded-xl border text-[10px] font-semibold ${
                        isDark ? 'bg-slate-900 border-amber-500/30 text-amber-300' : 'bg-white border-amber-200 text-amber-700'
                      }`}
                    >
                      <div className="flex items-center gap-1 mb-0.5">
                        <i className="fas fa-graduation-cap text-amber-500 text-xs"></i>
                        <span className="font-bold text-[10px] truncate">Rotana Education</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 w-full">
                        <a
                          href="https://rotana-elearningg.web.app"
                          target="_blank"
                          rel="noreferrer"
                          className="text-center py-0.5 px-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-[9px] font-bold transition"
                          title="Rotana E-Learning V1"
                        >
                          V1
                        </a>
                        <a
                          href="https://rotana-education.web.app"
                          target="_blank"
                          rel="noreferrer"
                          className="text-center py-0.5 px-1 rounded bg-amber-500 hover:bg-amber-600 text-white text-[9px] font-bold transition"
                          title="Rotana Education V2"
                        >
                          V2 Tech
                        </a>
                      </div>
                    </div>
                    <a
                      href="https://qr-scan-y659.vercel.app/"
                      target="_blank"
                      rel="noreferrer"
                      className={`flex flex-col items-center p-1.5 rounded-xl border text-[10px] font-semibold transition ${
                        isDark
                          ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                          : 'bg-white border-purple-100 text-purple-700 hover:bg-purple-100/60'
                      }`}
                    >
                      <i className="fas fa-qrcode text-purple-500 text-sm mb-0.5"></i>
                      <span className="truncate">QR Scan</span>
                    </a>
                    <a
                      href="https://play.google.com/store/apps/developer?id=youngapp"
                      target="_blank"
                      rel="noreferrer"
                      className={`flex flex-col items-center p-1.5 rounded-xl border text-[10px] font-semibold transition ${
                        isDark
                          ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                          : 'bg-white border-red-100 text-red-700 hover:bg-red-100/60'
                      }`}
                    >
                      <i className="fas fa-cash-register text-red-500 text-sm mb-0.5"></i>
                      <span className="truncate">YOUNG POS</span>
                    </a>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="text-lg sm:text-xl font-extrabold mb-3">
                ស្វាគមន៍ <span className="text-pink-500">{username}</span>!{' '}
                <i className="fas fa-user-check text-green-500"></i>
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
    </div>
  );
}
