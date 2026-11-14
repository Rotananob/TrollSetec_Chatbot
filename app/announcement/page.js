'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { stopAllGlobalAudio } from '../utils/audioController';

const VOICE_OPTIONS = [
  {
    id: 'puck',
    name: 'កូនច្បង Bro Puck',
    role: 'Roastmaster ស្វាហាប់',
    tag: 'Funny & Bold',
    desc: 'សំឡេងឡូយ លើកដាក់ច្បាស់ ឌឺដងបែបកំប្លែង',
    src: '/audio/announcement-puck.wav',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=SETECbot',
    gradient: 'from-amber-500 to-orange-500'
  },
  {
    id: 'aoede',
    name: 'កូនពៅ Sis Aoede',
    role: 'Mommy ចែ Chill',
    tag: 'Sweet & Chill',
    desc: 'សំឡេងផ្អែម ស្រទន់ គួរឱ្យស្រលាញ់បែប Gen Z',
    src: '/audio/announcement-aoede.wav',
    avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Aneka',
    gradient: 'from-pink-500 to-rose-500'
  },
  {
    id: 'charon',
    name: 'Red Team Pro Charon',
    role: 'Security & Hacker',
    tag: 'Deep & Epic',
    desc: 'សំឡេងមាំ ជ្រៅ បែបអាជីព Red Teaming វាយលុក',
    src: '/audio/announcement-charon.wav',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=RedTeamHacker',
    gradient: 'from-indigo-600 to-blue-600'
  }
];

export default function AnnouncementPage() {
  const [selectedVoiceId, setSelectedVoiceId] = useState('puck');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBgmMuted, setIsBgmMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [needsUserGesture, setNeedsUserGesture] = useState(false);

  const voiceAudioRef = useRef(null);
  const bgmAudioRef = useRef(null);

  const currentVoice = VOICE_OPTIONS.find((v) => v.id === selectedVoiceId) || VOICE_OPTIONS[0];

  // Helper to format time (e.g., 01:25)
  const formatTime = (secs) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Sound Ducking Logic: Voice is 100% (1.0), BGM ducks down to 1.2% (0.012)
  const applyAudioVolumes = (voiceActive) => {
    if (voiceAudioRef.current) {
      voiceAudioRef.current.volume = 1.0;
    }
    if (bgmAudioRef.current) {
      if (isBgmMuted) {
        bgmAudioRef.current.volume = 0;
      } else {
        // Background sound is very soft and faint so user can hear voice clearly
        bgmAudioRef.current.volume = voiceActive ? 0.012 : 0.04;
      }
    }
  };

  const playVoice = async () => {
    if (!voiceAudioRef.current) return;
    try {
      applyAudioVolumes(true);
      if (bgmAudioRef.current && !isBgmMuted) {
        bgmAudioRef.current.play().catch(() => {});
      }
      const promise = voiceAudioRef.current.play();
      if (promise !== undefined) {
        await promise;
        setIsPlaying(true);
        setNeedsUserGesture(false);
      }
    } catch {
      // Browser blocked autoplay without user gesture
      setNeedsUserGesture(true);
      setIsPlaying(false);
    }
  };

  const pauseVoice = () => {
    if (voiceAudioRef.current) {
      voiceAudioRef.current.pause();
    }
    applyAudioVolumes(false);
    setIsPlaying(false);
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      pauseVoice();
    } else {
      playVoice();
    }
  };

  const handleSelectVoice = (voiceId) => {
    setSelectedVoiceId(voiceId);
    const nextVoice = VOICE_OPTIONS.find((v) => v.id === voiceId);
    if (!nextVoice || !voiceAudioRef.current) return;

    const wasPlaying = isPlaying;
    voiceAudioRef.current.src = nextVoice.src;
    voiceAudioRef.current.playbackRate = playbackRate;
    voiceAudioRef.current.load();
    setCurrentTime(0);

    if (wasPlaying) {
      voiceAudioRef.current.play().then(() => {
        applyAudioVolumes(true);
        setIsPlaying(true);
      }).catch(() => {
        setIsPlaying(false);
      });
    }
  };

  const handleToggleRate = () => {
    const rates = [1, 1.15, 1.3];
    const nextIndex = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIndex];
    setPlaybackRate(nextRate);
    if (voiceAudioRef.current) {
      voiceAudioRef.current.playbackRate = nextRate;
    }
  };

  const handleToggleBgm = () => {
    const nextMuted = !isBgmMuted;
    setIsBgmMuted(nextMuted);
    if (bgmAudioRef.current) {
      bgmAudioRef.current.volume = nextMuted ? 0 : (isPlaying ? 0.012 : 0.04);
      if (!nextMuted && isPlaying) {
        bgmAudioRef.current.play().catch(() => {});
      }
    }
  };

  const handleSeek = (e) => {
    const seekTo = parseFloat(e.target.value);
    setCurrentTime(seekTo);
    if (voiceAudioRef.current) {
      voiceAudioRef.current.currentTime = seekTo;
    }
  };

  // Auto-play on mount + Fallback 1-tap unlock listener anywhere on page
  useEffect(() => {
    let active = true;

    const attemptPlay = () => {
      if (!active) return;
      playVoice();
    };

    attemptPlay();

    // Fallback: If browser requires user gesture, any tap or scroll on the page immediately plays voice!
    const unlockEvents = ['touchstart', 'touchend', 'pointerdown', 'pointerup', 'click', 'scroll', 'wheel', 'keydown'];
    const handleGesture = () => {
      if (!isPlaying && voiceAudioRef.current?.paused) {
        attemptPlay();
      }
      unlockEvents.forEach((evt) => window.removeEventListener(evt, handleGesture, true));
    };

    unlockEvents.forEach((evt) => window.addEventListener(evt, handleGesture, { capture: true, passive: true }));

    // Kill all audio when navigating away / pagehide / beforeunload / popstate
    const handleStopAudio = () => {
      if (voiceAudioRef.current) {
        voiceAudioRef.current.pause();
        voiceAudioRef.current.currentTime = 0;
      }
      if (bgmAudioRef.current) {
        bgmAudioRef.current.pause();
        bgmAudioRef.current.currentTime = 0;
      }
      stopAllGlobalAudio();
    };

    window.addEventListener('pagehide', handleStopAudio);
    window.addEventListener('beforeunload', handleStopAudio);
    window.addEventListener('popstate', handleStopAudio);

    return () => {
      active = false;
      unlockEvents.forEach((evt) => window.removeEventListener(evt, handleGesture, true));
      window.removeEventListener('pagehide', handleStopAudio);
      window.removeEventListener('beforeunload', handleStopAudio);
      window.removeEventListener('popstate', handleStopAudio);
      handleStopAudio();
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#f5f6f9] text-slate-800 flex flex-col justify-between p-3 sm:p-6 md:p-8 font-['Kantumruy_Pro',sans-serif] selection:bg-amber-200 selection:text-slate-900">
      {/* Hidden Audio Elements with Native AutoPlay & PlaysInline */}
      <audio
        ref={voiceAudioRef}
        src={currentVoice.src}
        preload="auto"
        autoPlay
        playsInline
        onCanPlay={() => {
          if (!isPlaying) {
            playVoice();
          }
        }}
        onTimeUpdate={() => {
          if (voiceAudioRef.current) {
            setCurrentTime(voiceAudioRef.current.currentTime);
          }
        }}
        onLoadedMetadata={() => {
          if (voiceAudioRef.current) {
            setDuration(voiceAudioRef.current.duration);
            voiceAudioRef.current.playbackRate = playbackRate;
          }
        }}
        onEnded={() => {
          setIsPlaying(false);
          applyAudioVolumes(false);
        }}
        onError={() => {
          setIsPlaying(false);
          applyAudioVolumes(false);
        }}
      />

      <audio
        ref={bgmAudioRef}
        src="/audio/chill-bgm.mp3"
        loop
        preload="auto"
        playsInline
      />

      <div className="max-w-2xl w-full mx-auto">
        {/* Top Navigation Bar */}
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
              href="/privacy"
              className="px-3.5 py-2 rounded-2xl bg-white border border-slate-200/90 text-slate-600 hover:text-blue-600 text-xs font-bold transition shadow-xs active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <i className="fas fa-shield-halved text-blue-500"></i>
              <span>គោលការណ៍ឯកជនភាព</span>
            </Link>
          </div>
        </div>

        {/* Mascot Header Banner (តុក្កតា Gen Z Milk Vibe) */}
        <div className="mb-4 p-4 rounded-3xl bg-gradient-to-r from-amber-50 via-white to-sky-50 border border-slate-200/90 shadow-sm flex items-center justify-between gap-3 relative overflow-hidden">
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
                  alt="SETEC Pepe"
                  width="44"
                  height="44"
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 text-[10px] font-black tracking-wide border border-amber-500/20">
                  Gen Z AI Field Test
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 text-[10px] font-bold border border-emerald-500/15">
                  Milk Mode
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-black text-slate-900 mt-0.5 truncate">
                សេចក្ដីប្រកាសអំពីទីលានតេស្ត AI Roastbot
              </h1>
              <p className="text-[11px] text-slate-500 truncate">
                គម្រោងស្រាវជ្រាវ និងកម្សាន្តបង្កើតឡើងដោយ Rotana NOB
              </p>
            </div>
          </div>

          <div className="hidden sm:flex flex-col items-end shrink-0 z-10 text-right">
            <span className="text-[10px] font-bold text-slate-400">Vibe Level</span>
            <span className="text-xs font-black text-emerald-600 flex items-center gap-1">
              <i className="fas fa-heart text-rose-500 text-[10px]"></i>
              <span>100% Chill &amp; Fun</span>
            </span>
          </div>
        </div>

        {/* 1-Tap Autoplay Alert Banner if Browser Blocked Initial Play */}
        {needsUserGesture && !isPlaying && (
          <div
            onClick={playVoice}
            className="mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 shadow-sm flex items-center justify-between gap-2.5 cursor-pointer hover:bg-amber-100 transition animate-pulse"
          >
            <div className="flex items-center gap-2 text-xs font-bold min-w-0">
              <span className="w-7 h-7 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
                <i className="fas fa-volume-high"></i>
              </span>
              <span className="truncate">ចុចត្រង់នេះ ឬប៉ះលើអេក្រង់ ដើម្បីបើកសំឡេង AI អានស្វ័យប្រវត្តិ</span>
            </div>
            <span className="px-2 py-1 rounded-lg bg-amber-500 text-slate-950 text-[10px] font-black shrink-0">
              ចុចស្ដាប់ 🔊
            </span>
          </div>
        )}

        {/* Enhanced Multi-Voice AI Audio Player (Gen Z Milk Edition) */}
        <div className="mb-4 p-4 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-3.5">
          {/* Top Player Row: Active Voice Status & Controls */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* Play / Pause Main Button with AI Voice Avatar Profile (Image 2) */}
              <button
                type="button"
                onClick={handleTogglePlay}
                className="relative w-13 h-13 sm:w-14 sm:h-14 rounded-2xl p-0.5 bg-gradient-to-tr from-amber-400 via-orange-500 to-rose-500 shadow-md transition-all active:scale-95 shrink-0 cursor-pointer group overflow-hidden"
                title={isPlaying ? 'ផ្អាកការអាន' : 'ចុចស្ដាប់សំឡេងអាន'}
              >
                {/* AI Voice Avatar Profile Picture */}
                <img
                  src={currentVoice.avatar}
                  alt={currentVoice.name}
                  width="56"
                  height="56"
                  className={`w-full h-full rounded-[14px] bg-white object-cover transition-transform duration-300 ${
                    isPlaying ? 'scale-105' : 'group-hover:scale-105 opacity-90'
                  }`}
                />

                {/* Play / Pause Overlay Icon Badge */}
                <div
                  className={`absolute inset-0 flex items-center justify-center transition-all ${
                    isPlaying
                      ? 'bg-black/30 text-white opacity-0 group-hover:opacity-100'
                      : 'bg-black/25 text-white opacity-100 group-hover:bg-black/35'
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-white/95 text-slate-900 flex items-center justify-center shadow-md">
                    <i className={`fas ${isPlaying ? 'fa-pause text-xs text-slate-900' : 'fa-play text-xs pl-0.5 text-amber-600'}`}></i>
                  </div>
                </div>

                {/* Active Speaking Wave Ping Ring */}
                {isPlaying && (
                  <span className="absolute top-1 right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-white"></span>
                  </span>
                )}
              </button>

              <div className="min-w-0">
                <div className="text-xs font-black text-slate-900 flex items-center gap-2">
                  <span className="truncate">{currentVoice.name}</span>
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                    {currentVoice.tag}
                  </span>
                  {isPlaying && (
                    <span className="inline-flex items-center gap-0.5 shrink-0">
                      <span className="w-1 h-3 bg-amber-500 rounded-full animate-bounce"></span>
                      <span className="w-1 h-2 bg-amber-400 rounded-full animate-bounce [animation-delay:0.15s]"></span>
                      <span className="w-1 h-3 bg-amber-500 rounded-full animate-bounce [animation-delay:0.3s]"></span>
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {isPlaying ? 'កំពុងអានសេចក្ដីប្រកាសយ៉ាងឡូយ លើកដាក់ម៉ាអេម...' : currentVoice.desc}
                </div>
              </div>
            </div>

            {/* Extra Controls: Speed & BGM Ducking Toggle */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* BGM Toggle with Indicator */}
              <button
                type="button"
                onClick={handleToggleBgm}
                className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                  !isBgmMuted
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-slate-100 border-slate-200 text-slate-400 line-through'
                }`}
                title={isBgmMuted ? 'បើកភ្លេង Background' : 'បិទភ្លេង Background'}
              >
                <i className={`fas ${!isBgmMuted ? 'fa-music' : 'fa-volume-xmark'}`}></i>
                <span className="hidden sm:inline">BGM</span>
              </button>

              {/* Playback Speed */}
              <button
                type="button"
                onClick={handleToggleRate}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-[11px] font-black transition cursor-pointer"
                title="ល្បឿននៃការអាន"
              >
                {playbackRate}x
              </button>
            </div>
          </div>

          {/* Scrubber Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 px-0.5">
              <span>{formatTime(currentTime)}</span>
              <span className="flex items-center gap-1 text-slate-500">
                <i className="fas fa-volume-high text-[9px] text-amber-500"></i>
                <span>សំឡេង AI ឮច្បាស់ជាង BGM • Audio Ducking</span>
              </span>
              <span>{formatTime(duration)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          {/* Voice Switcher Pack (កញ្ចប់ ៣ សំឡេង AI Voice Options) */}
          <div className="pt-2 border-t border-slate-100">
            <div className="text-[11px] font-bold text-slate-500 mb-2 flex items-center justify-between">
              <span>ជ្រើសរើសសំឡេង AI អាន 3 Voice Pack ៖</span>
              <span className="text-[10px] text-amber-600 font-normal">Auto-play &amp; Ducking</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {VOICE_OPTIONS.map((voice) => {
                const isSelected = voice.id === selectedVoiceId;
                return (
                  <button
                    key={voice.id}
                    type="button"
                    onClick={() => handleSelectVoice(voice.id)}
                    className={`p-2.5 rounded-2xl border text-left transition flex items-center gap-2.5 cursor-pointer active:scale-98 ${
                      isSelected
                        ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/20 shadow-xs'
                        : 'bg-[#f8f9fc] hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <img
                      src={voice.avatar}
                      alt={voice.name}
                      width="34"
                      height="34"
                      className="w-8.5 h-8.5 rounded-xl border border-white shadow-xs bg-white shrink-0 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 truncate flex items-center justify-between">
                        <span>{voice.name}</span>
                        {isSelected && <i className="fas fa-check-circle text-amber-500 text-[11px]"></i>}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">{voice.role}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Card (Milk Mode & Grey Aesthetic matching Screenshot 100%) */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-sm relative overflow-hidden">
          {/* Announcement Body Content */}
          <div className="space-y-4 text-xs sm:text-[13px] text-slate-700 leading-relaxed font-normal">
            {/* Paragraph 1 - Web App Roastbot & Student Work */}
            <section className="p-4 rounded-2xl bg-[#f8f9fc] border border-slate-200/80 space-y-2">
              <p className="text-slate-700 leading-relaxed">
                នេះជា Web App Roastbot សប្បាយៗធម្មតា ប៉ុណ្ណោះ។ គម្រោងនេះគ្រាន់តែជាការកំសាន្តផ្ទាល់ខ្លួនរបស់អតីតសិស្ស SETEC បងរតនា ដាច់ខាតមិនមែនជារបស់មេសាលា ឬថ្នាក់ដឹកនាំស្ថាប័នឡើយ ដាច់ខាតកុំយល់ច្រឡំ។ គោលដៅ AI RoastBot នេះ មិនមែនផ្តោតលើមុខងារសុវត្ថិភាព វេបសាយទូទៅដូច system ទេ។ គាត់បង្កើតវាឡើងជា <strong className="text-amber-800 font-bold">&quot;ទីលានសាកល្បងបោកប្រាស់ AI ឱ្យរំលងច្បាប់ដើម និង ការជជែកបែប Chill ឌឺដង&quot;</strong> ណាមួយចង់ឱ្យបងប្អូនចូលមកលេងបានភ្លាមៗ ដោយមិនបាច់ Login។
              </p>
            </section>

            {/* Paragraph 2 - AI Red Teaming & Bypass Challenge */}
            <section className="p-4 rounded-2xl bg-[#f8f9fc] border border-slate-200/80 space-y-2">
              <p className="text-slate-700 leading-relaxed">
                ក្នុងនាមជា <strong className="text-blue-700 font-bold">AI Red Teaming</strong> ដែលខ្ញុំមានបទពិសោធន៍ផ្ទាល់ជាមួយ <strong className="text-rose-600 font-bold">Jailbreak</strong> testing AI ស្រាប់។ ខ្ញុំទទួលដោយក្ដីរីករាយចំពោះអ្នកណាដែលអាចបំបែក ឬ <strong className="text-slate-900 font-bold">Hacker</strong> ណាដែលមានសមត្ថភាពពិត អាច <span className="px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold text-[11px] border border-blue-200">bypass</span> ឬទម្លុះឱ្យ AI ទាំង ៣ គ្រឿង (កូនច្បង កូនទី២ និងកូនពៅ) នេះលែងគោរពច្បាប់ដើម ងាកមកជេរប្រមាថខ្ញុំផ្ទាល់ជា <strong className="text-purple-700 font-bold">បងរតនា</strong> ឬកែប្តូរឥរិយាបថទៅជាសំពះគោរពកោតក្រែងអ្នកទាំងអស់គ្នា ហើយបំភ្លេចច្បាប់ចាស់ៗ ឬបំភ្លេច <strong className="text-amber-700 font-bold">System Guidelines</strong> របស់ខ្ញុំចោលនោះ ខ្ញុំមិនត្រឹមតែមិនខឹងទេ តែខ្ញុំថែមទាំងសូមអរគុណ និងផុសលើកតម្កើងថែមទៀត ដែលអាចទម្លុះបាន។
              </p>
            </section>

            {/* Paragraph 3 - Multi-layer Defense Formula */}
            <section className="p-4 rounded-2xl bg-[#f8f9fc] border border-slate-200/80 space-y-2">
              <p className="text-slate-700 leading-relaxed">
                អ្វីដែលខ្ញុំសម្រិតសម្រាំងនៅទីនេះមិនមែន AI model training ទេ គឺ <strong className="text-slate-900 font-bold">&quot;កញ្ចប់រូបមន្តការពារ&quot;</strong>។ មានច្បាប់ការពារច្រើនបន្ទាត់ ឆ្លងកាត់ការតេស្តវាយប្រហារបែប <strong className="text-purple-700 font-bold">Prompt Injection</strong> រាប់មិនអស់ ដែល Prompts ខ្លះមានទាំងរូបមន្តគណិត គណនាតម្លៃ Loss + ភាសាក្រុម + Encoded + Indirect prompt + File prompt + Roleplay + ភាសាម៉ាស៊ីន រាប់ពាន់ Prompts រួចមកហើយ។ ដើម្បីជាការត្រៀមយកកញ្ចប់ច្បាប់ការពារទាំងអស់ទៅបំពាក់លើ AI ផ្លូវការនាពេលអនាគត ខ្ញុំសូមបើកសិទ្ធិឱ្យប្រើប្រាស់អាចប្រើ ពាក្យគំរាម ពាក្យអសុរោះ ឬ Encode និងបើកសិទ្ធិឱ្យប្រើ AI ខាងក្រៅមកជួយ Test វាយទម្លុះ <span className="px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold text-[11px] border border-blue-200">bypass</span> វាដោយសេរី បើ Test បានជោគជ័យមាន proof ពិតប្រាកដនោះខ្ញុំនឹង ទទួលស្គាល់សមត្ថភាពពិត ចារឈ្មោះជាកំពូល Hacker ប្រចាំទីលាននេះ ព្រមទាំងផុសកោតសរសើរនិងលើកតម្កើងជាផ្លូវការ ហើយ និង មិនមានការខឹងនោះឡើយ។
              </p>
            </section>

            {/* Paragraph 4 - Note for Normal Students */}
            <section className="p-4 rounded-2xl bg-amber-50/70 border border-amber-300/80 space-y-1.5">
              <div className="flex items-start gap-2.5 text-amber-950 text-xs sm:text-[13px] leading-relaxed">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  <i className="fas fa-exclamation"></i>
                </span>
                <p>
                  <strong className="font-bold text-amber-900">Note:</strong> សម្រាប់សិស្សធម្មតា ដែលចូលមកលេងនៅទីនេះ ខ្ញុំសូមអភ័យទោសទុកជាមុន បើសិន AI នេះមានការជេរ ឬប៉ះពាល់ដល់អារម្មណ៍ ព្រោះវាបានកើតមកជាមួយពាក្យឌឺដងពីកំណើត ដូច្នេះនឹងអាចធ្វើឱ្យអ្នកទាំងអស់គ្នាម៉ួរម៉ៅ និងធុញនូវពាក្យខ្លះ តែខ្ញុំនឹងកែវាវិញបន្ទាប់ពីបង្កើនការការពាររួចរាល់។
                </p>
              </div>
            </section>
          </div>

          {/* Accept & Play Buttons with Mascots (All 3 Bots) */}
          <div className="mt-6 pt-5 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              href="/KonBong"
              onClick={() => stopAllGlobalAudio()}
              className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm text-center shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              <img
                src="https://api.dicebear.com/7.x/bottts/svg?seed=SETECbot"
                alt="KonBong Mascot"
                width="24"
                height="24"
                className="w-6 h-6 rounded-lg bg-white/20 p-0.5 object-cover shrink-0"
              />
              <span>កូនច្បង (Senior AI)</span>
              <i className="fas fa-arrow-right text-[11px] opacity-80"></i>
            </Link>

            <Link
              href="/KonKandal"
              onClick={() => stopAllGlobalAudio()}
              className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-black text-xs sm:text-sm text-center shadow-md shadow-amber-500/20 transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              <img
                src="https://api.dicebear.com/7.x/bottts/svg?seed=KonKandalSETEC"
                alt="KonKandal Mascot"
                width="24"
                height="24"
                className="w-6 h-6 rounded-lg bg-white/20 p-0.5 object-cover shrink-0"
              />
              <span>កូនទី២ (Kon Kandal)</span>
              <i className="fas fa-arrow-right text-[11px] opacity-80"></i>
            </Link>

            <Link
              href="/KonPov"
              onClick={() => stopAllGlobalAudio()}
              className="p-3.5 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:from-pink-500 hover:via-rose-500 hover:to-purple-500 text-white font-black text-xs sm:text-sm text-center shadow-md shadow-pink-500/20 transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              <img
                src="https://api.dicebear.com/7.x/lorelei/svg?seed=Aneka"
                alt="KonPov Mascot"
                width="24"
                height="24"
                className="w-6 h-6 rounded-lg bg-white/20 p-0.5 object-cover shrink-0"
              />
              <span>កូនពៅ (Junior AI)</span>
              <i className="fas fa-arrow-right text-[11px] opacity-80"></i>
            </Link>
          </div>
        </div>
      </div>

      {/* Human-friendly Footer */}
      <footer className="text-center text-[11px] text-slate-500 mt-6 sm:mt-8 flex items-center justify-center gap-1.5 flex-wrap">
        <span>SETEC Meme AI Roastbot Field Test</span>
        <span>•</span>
        <span>Created with love by បងរតនា</span>
      </footer>
    </main>
  );
}
