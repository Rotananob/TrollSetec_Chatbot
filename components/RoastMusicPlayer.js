'use client';

import React, { useState, useRef, useEffect } from 'react';

export default function RoastMusicPlayer({
  audioUrl,
  title = 'SETEC Roast Track',
  genre = 'SETEC Hip-Hop Diss Track',
  bpm = '120 BPM',
  lyrics = '',
  engine = '',
  bot = 'konkandal'
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showLyrics, setShowLyrics] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime || 0);
    const updateDuration = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        // Pause any other playing audio on the page
        document.querySelectorAll('audio').forEach((el) => {
          if (el !== audio) el.pause();
        });
        await audio.play();
        setIsPlaying(true);
      }
    } catch {
      setIsPlaying(false);
    }
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio) return;
    const seekTime = parseFloat(e.target.value);
    audio.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Bot Theme Badges
  const isBong = bot === 'konbong';
  const isKandal = bot === 'konkandal';
  const badgeColor = isBong
    ? 'bg-blue-600/30 text-blue-300 border-blue-500/50'
    : isKandal
    ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50'
    : 'bg-amber-600/30 text-amber-300 border-amber-500/50';

  const botName = isBong ? 'កូនច្បង AI' : isKandal ? 'កូនទី២ AI' : 'កូនពៅ AI';

  return (
    <div className="w-full max-w-md my-2 rounded-2xl overflow-hidden border border-[#008744]/40 bg-gradient-to-br from-slate-950 via-[#071c12] to-slate-900 shadow-xl shadow-black/60 font-['Kantumruy_Pro',sans-serif]">
      {/* Hidden Native Audio Element */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Top Banner: Disc & Track Info */}
      <div className="p-3.5 sm:p-4 flex items-center gap-3.5 border-b border-[#14472c]/60 relative overflow-hidden">
        {/* Animated Spinning Disc Vinyl */}
        <div className="relative shrink-0 w-13 h-13 sm:w-15 sm:h-15">
          <div
            className={`w-full h-full rounded-full bg-gradient-to-tr from-slate-950 via-zinc-800 to-slate-950 border-2 border-emerald-500/60 shadow-lg flex items-center justify-center relative ${
              isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''
            }`}
          >
            {/* Vinyl Grooves */}
            <div className="absolute inset-2 rounded-full border border-zinc-700/40 pointer-events-none"></div>
            <div className="absolute inset-4 rounded-full border border-zinc-700/40 pointer-events-none"></div>
            {/* Center Label */}
            <div className="w-5 h-5 rounded-full bg-[#008744] flex items-center justify-center text-[8px] font-black text-white shadow-xs">
              🎵
            </div>
          </div>
          {/* Pulsing Play Badge */}
          {isPlaying && (
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
            </span>
          )}
        </div>

        {/* Track Metadata */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${badgeColor}`}>
              🎤 {botName}
            </span>
            <span className="text-[10px] font-semibold text-emerald-300/80 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full">
              ⚡ {bpm}
            </span>
          </div>

          <h4 className="text-xs sm:text-sm font-bold text-white truncate leading-snug tracking-tight">
            {title}
          </h4>
          <p className="text-[11px] text-emerald-400/80 truncate mt-0.5 flex items-center gap-1.5">
            <i className="fas fa-compact-disc text-[10px]"></i>
            <span>{genre}</span>
          </p>
        </div>
      </div>

      {/* Audio Controls Bar */}
      <div className="p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs flex flex-col gap-2.5">
        {/* Play/Pause & Scrubber */}
        <div className="flex items-center gap-3">
          {/* Big Play/Pause Button */}
          <button
            type="button"
            onClick={togglePlay}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-slate-950 flex items-center justify-center font-black shadow-md shadow-emerald-900/40 transition active:scale-95 cursor-pointer shrink-0"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play ml-0.5'} text-sm`}></i>
          </button>

          {/* Time Scrubber */}
          <div className="flex-1 flex flex-col gap-1 min-w-0">
            <input
              type="range"
              min={0}
              max={duration || 30}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400 hover:accent-emerald-300 transition"
            />
            <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 px-0.5">
              <span>{formatTime(currentTime)}</span>
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                {isPlaying ? (
                  <span className="flex gap-0.5 items-end h-2.5">
                    <span className="w-0.5 h-1.5 bg-emerald-400 animate-pulse"></span>
                    <span className="w-0.5 h-3 bg-emerald-400 animate-pulse delay-75"></span>
                    <span className="w-0.5 h-2 bg-emerald-400 animate-pulse delay-150"></span>
                  </span>
                ) : null}
                {formatTime(duration || 30)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Row: Lyrics Toggle & Download */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => setShowLyrics(!showLyrics)}
            className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-emerald-300 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <i className="fas fa-scroll text-[10px]"></i>
            <span>{showLyrics ? 'លាក់ទំនុកច្រៀង' : '📝 មើលទំនុកច្រៀង Roast'}</span>
          </button>

          <a
            href={audioUrl}
            download={`setec-roast-${title.replace(/[^a-zA-Z0-9\u1780-\u17FF]/g, '_')}.wav`}
            className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="ទាញយកបទចម្រៀង"
          >
            <i className="fas fa-download text-[10px]"></i>
            <span>ទាញយក MP3</span>
          </a>
        </div>
      </div>

      {/* Expandable Lyrics Drawer */}
      {showLyrics && lyrics && (
        <div className="p-3.5 sm:p-4 bg-slate-950 border-t border-[#1c4d32] text-xs text-zinc-300 leading-relaxed max-h-60 overflow-y-auto animate-fade-in whitespace-pre-wrap font-sans selection:bg-emerald-800 selection:text-white">
          <div className="flex items-center gap-1.5 mb-2 text-emerald-400 font-bold text-[11px]">
            <i className="fas fa-microphone-alt"></i>
            <span>ទំនុកច្រៀងពេញ (Roast Lyrics):</span>
          </div>
          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-zinc-200 text-[11px]">
            {lyrics}
          </div>
          {engine && (
            <div className="mt-2 text-[9px] text-zinc-500 flex items-center gap-1 justify-end font-mono">
              <i className="fas fa-robot text-[8px]"></i>
              <span>Generated with {engine}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
