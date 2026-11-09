'use client';

import React, { useState } from 'react';

// SETEC Survival Suite: Retake Fee Calculator ($45 x3), Absence Blacklist Tracker, & Web Audio Troll Soundboard
export default function SetecSurvivalModal({
  isOpen,
  onClose,
  onSendToChat,
  botPersona = 'កូនច្បង',
  theme = 'dark'
}) {
  const [activeTab, setActiveTab] = useState('retake'); // 'retake' | 'attendance' | 'soundboard'

  // Retake Calculator State
  const [failedSubjects, setFailedSubjects] = useState(3);
  const costPerSubject = 45;

  // Attendance State
  const [absentDays, setAbsentDays] = useState(3);

  if (!isOpen) return null;

  const isDark = theme === 'dark';

  // Soundboard via Web Audio API (100% offline, 0ms latency, zero missing mp3 files)
  const playSoundEffect = (type) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'chuckle') {
        // Laugh Chuckle (Ha-ha-ha!)
        const times = [0, 0.13, 0.26, 0.4];
        const freqs = [420, 460, 430, 390];
        times.forEach((t, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freqs[i], ctx.currentTime + t);
          osc.frequency.exponentialRampToValueAtTime(freqs[i] * 0.7, ctx.currentTime + t + 0.1);
          gain.gain.setValueAtTime(0.12, ctx.currentTime + t);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.11);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + t);
          osc.stop(ctx.currentTime + t + 0.12);
        });
      } else if (type === 'slap') {
        // Cartoon Slap / Punch
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.18);
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.22);
      } else if (type === 'bell') {
        // School Recess / Class Change Bell (ជួងប្ដូរថ្នាក់)
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const t = ctx.currentTime + idx * 0.18;
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0.2, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.65);
        });
      } else if (type === 'alarm') {
        // Blacklist Warning Siren
        for (let i = 0; i < 3; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const t = ctx.currentTime + i * 0.25;
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(750, t);
          osc.frequency.linearRampToValueAtTime(980, t + 0.12);
          osc.frequency.linearRampToValueAtTime(750, t + 0.24);
          gain.gain.setValueAtTime(0.18, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.25);
        }
      } else if (type === 'coffee') {
        // Pouring / Bubble Coffee Synth
        for (let i = 0; i < 6; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const t = ctx.currentTime + i * 0.08;
          osc.type = 'sine';
          osc.frequency.setValueAtTime(600 + Math.random() * 400, t);
          gain.gain.setValueAtTime(0.08, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.08);
        }
      }
    } catch {}
  };

  // Retake Calculation Logic
  const canRetake = failedSubjects >= 3;
  const totalCost = failedSubjects * costPerSubject;

  let retakeRoast = '';
  if (failedSubjects === 0) {
    retakeRoast = 'អបអរសាទរ! រៀនពូកែដូចកូនទេវតា មិនធ្លាក់មួយមុខទេ យកកាតាប ASUS ROG ដើរកាត់បណ្ណាល័យបានយ៉ាងឡូយ! 🎒✨';
  } else if (failedSubjects === 1 || failedSubjects === 2) {
    retakeRoast = `ធ្លាក់ ${failedSubjects} មុខ សាលាមិនទាន់ឱ្យប្រឡងសងទេ! លុះត្រាតែធ្លាក់ ៣ មុខឡើងទើបគេឱ្យសង! ទៅរកធ្លាក់ថែមឱ្យគ្រប់ ៣ មុខសិនទៅអាប្អូន! 🤣💀`;
  } else if (failedSubjects === 3) {
    retakeRoast = `ធ្លាក់ ៣ មុខ x $45 = $135! ស្មើថ្លៃកាតាប ASUS ROG ប្រចាំត្រកូលសិស្សស៊ីតិចមួយបាត់! ត្រៀមលុយហើយឬនៅ? 💸😭`;
  } else if (failedSubjects === 4) {
    retakeRoast = `ធ្លាក់ ៤ មុខ = $180! រៀបចំកន្ទេលខ្នើយទៅដេកសំពះមុខបន្ទប់គ្រូ MGT ឬគ្រូ C# សុំការយោគយល់ទៅអាប្អូន! 💀🔥`;
  } else {
    retakeRoast = `ធ្លាក់ ${failedSubjects} មុខ = $${totalCost}! ម៉ែឪដឹងកាត់កាលចោលហើយ! គេហៅម៉ែឪមកសាលា ដេញក្បាលចោលហើយអាប្អូន! 🤣💣`;
  }

  // Attendance Status Logic
  let attendanceStatus = { level: 'safe', label: 'ធម្មតា', desc: 'មិនទាន់មានបញ្ហាធ្ងន់ធ្ងរទេ កុំភ្លេចចូលរៀន!' };
  if (absentDays >= 19) {
    attendanceStatus = { level: 'danger', label: 'Blacklist លើកទី ៣ (ដេញក្បាលចោល!)', desc: 'ឈប់ឥតច្បាប់លើស ១៩ ដង! លើកទី ១ Blacklist, លើកទី ២ ហៅម៉ែឪ, លើកទី ៣ ដេញក្បាលចោលតែម្តង! 💀' };
  } else if (absentDays >= 10) {
    attendanceStatus = { level: 'warning', label: 'ជាប់ Blacklist លើកទី ១/២', desc: 'ប្រយ័ត្នសាលាហៅម៉ែឪមកជួបផ្ទាល់!' };
  } else if (absentDays >= 3) {
    attendanceStatus = { level: 'caution', label: 'ត្រៀមគេខលទៅម៉ែឪ!', desc: 'ឈប់ ៣ ថ្ងៃដឹងតែគេខលទៅម៉ែឪហើយអាប្អូន!' };
  }

  const handleShareRetakeToChat = () => {
    if (onSendToChat) {
      const msg = canRetake
        ? `បងៗ! ខ្ញុំទើបតែគណនាថ្លៃប្រឡងសងនៅ ស៊ីតិច ឃើញថាខ្ញុំធ្លាក់ ${failedSubjects} មុខ អស់សរុប $${totalCost} ដុល្លារ! ជួយ Roast ខ្ញុំមួយប្រយោគមើលបង!`
        : `បងៗ! ខ្ញុំធ្លាក់តែ ${failedSubjects} មុខទេ តែសាលាមិនឱ្យសងព្រោះមិនទាន់គ្រប់ ៣ មុខ! ជួយប្រាប់តិចត្រូវធ្វើយ៉ាងម៉េច?`;
      onSendToChat(msg);
      onClose();
    }
  };

  const handleShareAttendanceToChat = () => {
    if (onSendToChat) {
      const msg = `បងៗ! ខ្ញុំឈប់រៀនឥតច្បាប់អស់ ${absentDays} ថ្ងៃហើយ ត្រៀមគេខលទៅម៉ែឪហើយ! ជួយផ្តល់គន្លឹះដោះស្រាយតិចមើល!`;
      onSendToChat(msg);
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none animate-fade-in"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-lg rounded-3xl p-5 sm:p-6 border shadow-2xl relative overflow-hidden transition-all animate-scale-up ${
          isDark
            ? 'bg-slate-900 border-cyan-500/30 text-slate-100 shadow-cyan-500/10'
            : 'bg-white border-cyan-400 text-slate-800 shadow-xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Flare */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-cyan-400 via-amber-400 to-rose-500 rounded-full"></div>

        {/* Modal Top Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-500 text-white flex items-center justify-center text-base shadow-md">
              🎒
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-amber-200">
                SETEC Survival Suite
              </h3>
              <p className="text-[10.5px] text-slate-400 font-semibold">
                ម៉ាស៊ីនគិតថ្លៃសង ($45 x3) • វត្តមាន Blacklist • Troll Soundboard
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <i className="fas fa-times text-xs"></i>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex rounded-2xl bg-slate-950/70 p-1 border border-slate-800 mb-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('retake')}
            className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'retake'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <i className="fas fa-calculator text-amber-300"></i>
            <span>ថ្លៃប្រឡងសង ($45)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'attendance'
                ? 'bg-gradient-to-r from-amber-600 to-rose-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <i className="fas fa-user-xmark text-rose-300"></i>
            <span>វត្តមាន Blacklist</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('soundboard')}
            className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'soundboard'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <i className="fas fa-music text-yellow-300"></i>
            <span>Soundboard</span>
          </button>
        </div>

        {/* TAB 1: RETAKE FEE CALCULATOR */}
        {activeTab === 'retake' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-300">ចំនួនមុខវិជ្ជាដែលធ្លាក់:</span>
                <span className="text-xl font-black text-amber-400 font-mono">{failedSubjects} មុខ</span>
              </div>

              {/* Subject Counter Slider & Buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFailedSubjects((p) => Math.max(0, p - 1))}
                  className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-lg flex items-center justify-center active:scale-95 transition cursor-pointer"
                >
                  -
                </button>
                <input
                  type="range"
                  min="0"
                  max="7"
                  value={failedSubjects}
                  onChange={(e) => setFailedSubjects(parseInt(e.target.value, 10))}
                  className="flex-1 accent-cyan-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setFailedSubjects((p) => Math.min(7, p + 1))}
                  className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-lg flex items-center justify-center active:scale-95 transition cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Total Cost Display Box */}
            <div className="rounded-2xl p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-amber-500/30 text-center relative overflow-hidden">
              <span className="text-[10.5px] uppercase font-bold tracking-widest text-slate-400">
                តម្លៃសរុបដែលត្រូវបង់ឱ្យសាលា ស៊ីតិច
              </span>
              <div className="text-4xl sm:text-5xl font-black font-mono my-1 text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-rose-400 to-amber-200">
                ${totalCost} <span className="text-base text-slate-400 font-medium">USD</span>
              </div>
              <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-black mt-1 ${
                canRetake ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {canRetake ? '✅ គ្រប់ ៣ មុខឡើង ទើបសាលាអនុញ្ញាតឱ្យសង!' : '⚠️ មិនទាន់គ្រប់ ៣ មុខ សាលាមិនទាន់ឱ្យសងទេ!'}
              </span>
            </div>

            {/* Roast Explanation */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs leading-relaxed text-amber-200 font-medium">
              <i className="fas fa-quote-left text-amber-400 mr-1.5"></i>
              {retakeRoast}
            </div>

            <button
              type="button"
              onClick={handleShareRetakeToChat}
              className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-black text-xs transition active:scale-95 shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <i className="fas fa-paper-plane"></i>
              <span>ផ្ញើលទ្ធផលទៅឱ្យ Roastbot {botPersona} Roast ភ្លាម!</span>
            </button>
          </div>
        )}

        {/* TAB 2: ATTENDANCE & BLACKLIST RADAR */}
        {activeTab === 'attendance' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-300">ចំនួនថ្ងៃឈប់រៀនឥតច្បាប់:</span>
                <span className="text-xl font-black text-rose-400 font-mono">{absentDays} ថ្ងៃ</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAbsentDays((p) => Math.max(0, p - 1))}
                  className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-lg flex items-center justify-center active:scale-95 transition cursor-pointer"
                >
                  -
                </button>
                <input
                  type="range"
                  min="0"
                  max="25"
                  value={absentDays}
                  onChange={(e) => setAbsentDays(parseInt(e.target.value, 10))}
                  className="flex-1 accent-rose-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setAbsentDays((p) => Math.min(25, p + 1))}
                  className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-lg flex items-center justify-center active:scale-95 transition cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Severity Card */}
            <div className={`rounded-2xl p-4 border text-center transition-all ${
              attendanceStatus.level === 'danger'
                ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                : attendanceStatus.level === 'warning'
                ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                : attendanceStatus.level === 'caution'
                ? 'bg-yellow-950/40 border-yellow-500/50 text-yellow-200'
                : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
            }`}>
              <div className="text-3xl mb-1">
                {attendanceStatus.level === 'danger' ? '💀' : attendanceStatus.level === 'warning' ? '🚨' : attendanceStatus.level === 'caution' ? '📞' : '✅'}
              </div>
              <h4 className="text-base font-black mb-1">{attendanceStatus.label}</h4>
              <p className="text-xs opacity-90">{attendanceStatus.desc}</p>
            </div>

            {/* School Rule Note */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-400 space-y-1">
              <div className="font-bold text-slate-300">📋 ច្បាប់វត្តមានផ្លូវការ ស៊ីតិច:</div>
              <div>• ឈប់ ៣ ថ្ងៃ: គេខលទៅម៉ែឪភ្លាម!</div>
              <div>• ឈប់លើស ១៩ ថ្ងៃ: ជាប់ Blacklist លើកទី ១</div>
              <div>• Blacklist លើកទី ២: ហៅម៉ែឪមកសាលាផ្ទាល់</div>
              <div>• Blacklist លើកទី ៣: ដេញក្បាលចោលតែម្តង! 🤣</div>
            </div>

            <button
              type="button"
              onClick={handleShareAttendanceToChat}
              className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-xs transition active:scale-95 shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <i className="fas fa-triangle-exclamation"></i>
              <span>ផ្ញើទៅសុំជំនួយពី Roastbot {botPersona} ភ្លាម!</span>
            </button>
          </div>
        )}

        {/* TAB 3: TROLL SOUNDBOARD */}
        {activeTab === 'soundboard' && (
          <div className="space-y-3 animate-fade-in">
            <p className="text-xs text-slate-400 text-center mb-1">
              ចុចប៊ូតុងដើម្បីស្តាប់សំឡេង Troll លេងជាមួយមិត្តភក្តិ (ដំណើរការ 100% គ្មាន lag):
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => playSoundEffect('chuckle')}
                className="p-3.5 rounded-2xl bg-slate-950/70 hover:bg-amber-500/20 border border-slate-800 hover:border-amber-400/40 text-left transition active:scale-95 cursor-pointer flex items-center gap-3"
              >
                <span className="text-2xl">🤣</span>
                <div>
                  <div className="text-xs font-black text-white">សើច Troll ហាហា</div>
                  <div className="text-[10px] text-amber-400">Chuckle laugh</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => playSoundEffect('slap')}
                className="p-3.5 rounded-2xl bg-slate-950/70 hover:bg-rose-500/20 border border-slate-800 hover:border-rose-400/40 text-left transition active:scale-95 cursor-pointer flex items-center gap-3"
              >
                <span className="text-2xl">💥</span>
                <div>
                  <div className="text-xs font-black text-white">ទះមួយកំភ្លៀង</div>
                  <div className="text-[10px] text-rose-400">Punch / Slap SFX</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => playSoundEffect('bell')}
                className="p-3.5 rounded-2xl bg-slate-950/70 hover:bg-cyan-500/20 border border-slate-800 hover:border-cyan-400/40 text-left transition active:scale-95 cursor-pointer flex items-center gap-3"
              >
                <span className="text-2xl">🔔</span>
                <div>
                  <div className="text-xs font-black text-white">ជួងប្ដូរថ្នាក់ស្ទះ</div>
                  <div className="text-[10px] text-cyan-400">School Bell Chime</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => playSoundEffect('alarm')}
                className="p-3.5 rounded-2xl bg-slate-950/70 hover:bg-red-500/20 border border-slate-800 hover:border-red-400/40 text-left transition active:scale-95 cursor-pointer flex items-center gap-3"
              >
                <span className="text-2xl">🚨</span>
                <div>
                  <div className="text-xs font-black text-white">ស៊ីរ៉ែន Blacklist</div>
                  <div className="text-[10px] text-red-400">Police Siren Warning</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => playSoundEffect('coffee')}
                className="p-3.5 rounded-2xl bg-slate-950/70 hover:bg-emerald-500/20 border border-slate-800 hover:border-emerald-400/40 text-left transition active:scale-95 cursor-pointer flex items-center gap-3 col-span-2"
              >
                <span className="text-2xl">☕</span>
                <div>
                  <div className="text-xs font-black text-white">ចាក់កាហ្វេដោះគោទឹកកកមុខសាលា</div>
                  <div className="text-[10px] text-emerald-400">SETEC Coffee Addiction</div>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
