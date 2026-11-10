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

  // Soundboard via Web Audio API
  const playSoundEffect = (type) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'chuckle') {
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
        const notes = [523.25, 659.25, 783.99, 1046.5];
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
    retakeRoast = 'អបអរសាទរ! រៀនពូកែដូចកូនទេវតា មិនធ្លាក់មួយមុខទេ យកកាតាប ASUS ROG ដើរកាត់បណ្ណាល័យបានយ៉ាងឡូយ!';
  } else if (failedSubjects === 1 || failedSubjects === 2) {
    retakeRoast = `ធ្លាក់ ${failedSubjects} មុខ សាលាមិនទាន់ឱ្យប្រឡងសងទេ! លុះត្រាតែធ្លាក់ ៣ មុខឡើងទើបគេឱ្យសង! ទៅរកធ្លាក់ថែមឱ្យគ្រប់ ៣ មុខសិនទៅអាប្អូន!`;
  } else if (failedSubjects === 3) {
    retakeRoast = `ធ្លាក់ ៣ មុខ x ៤៥ ដុល្លារ = ១៣៥ ដុល្លារ! ស្មើថ្លៃកាតាប ASUS ROG ប្រចាំត្រកូលសិស្សស៊ីតិចមួយបាត់! ត្រៀមលុយហើយឬនៅ?`;
  } else if (failedSubjects === 4) {
    retakeRoast = `ធ្លាក់ ៤ មុខ = ១៨០ ដុល្លារ! រៀបចំកន្ទេលខ្នើយទៅដេកសំពះមុខបន្ទប់គ្រូ MGT ឬគ្រូ C# សុំការយោគយល់ទៅអាប្អូន!`;
  } else {
    retakeRoast = `ធ្លាក់ ${failedSubjects} មុខ = ${totalCost} ដុល្លារ! ម៉ែឪដឹងកាត់កាលចោលហើយ! គេហៅម៉ែឪមកសាលា ប្រយ័ត្នគេបញ្ឈប់ការសិក្សាណា៎អាប្អូន!`;
  }

  // Attendance Status Logic
  let attendanceStatus = { level: 'safe', label: 'ធម្មតា', desc: 'មិនទាន់មានបញ្ហាធ្ងន់ធ្ងរទេ កុំភ្លេចចូលរៀន!' };
  if (absentDays >= 19) {
    attendanceStatus = { level: 'danger', label: 'Blacklist លើកទី ៣ បញ្ឈប់ការសិក្សា', desc: 'ឈប់ឥតច្បាប់លើស ១៩ ដង! លើកទី ១ Blacklist, លើកទី ២ ហៅម៉ែឪ, លើកទី ៣ ត្រូវបញ្ឈប់ការសិក្សា!' };
  } else if (absentDays >= 10) {
    attendanceStatus = { level: 'warning', label: 'ជាប់ Blacklist លើកទី ១ ឬ ២', desc: 'ប្រយ័ត្នសាលាហៅម៉ែឪមកជួបផ្ទាល់!' };
  } else if (absentDays >= 3) {
    attendanceStatus = { level: 'caution', label: 'ត្រៀមគេខលទៅម៉ែឪ!', desc: 'ឈប់ ៣ ថ្ងៃដឹងតែគេខលទៅម៉ែឪហើយអាប្អូន!' };
  }

  const handleShareRetakeToChat = () => {
    if (onSendToChat) {
      const msg = `បងៗ! ខ្ញុំធ្លាក់ ${failedSubjects} មុខ អស់លុយបង់សាលា $${totalCost} ហើយ! ជួយ Roast ខ្ញុំមួយមេឱ្យភ្ញាក់ស្មារតីមើល!`;
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
      className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none animate-fade-in font-['Kantumruy_Pro',sans-serif]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-[#25613e] bg-[#0d3822] text-[#fbf8f2] shadow-2xl shadow-black/80 relative overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1c4d32]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-[#fbf8f2] shadow-sm shrink-0">
              <img
                src="/img/icon.jpg"
                alt="SETEC"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '/img/logo.jpg';
                }}
              />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#fbf8f2]">
                SETEC Survival Suite
              </h3>
              <p className="text-[11px] text-[#d7ccb7]">
                គិតថ្លៃសង ៤៥ ដុល្លារ • វត្តមាន Blacklist • Soundboard
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#14472c] hover:bg-[#1a5535] text-[#d7ccb7] hover:text-[#fbf8f2] flex items-center justify-center transition cursor-pointer border border-[#276a44]"
          >
            <i className="fas fa-times text-xs"></i>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex rounded-xl bg-[#092818] p-1 border border-[#1c4d32] mb-4 text-xs font-bold gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('retake')}
            className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'retake'
                ? 'bg-[#fbf8f2] text-[#0d3822] shadow border border-[#e4d9c4]'
                : 'text-[#d7ccb7] hover:text-[#fbf8f2]'
            }`}
          >
            <i className="fas fa-calculator text-xs"></i>
            <span>ថ្លៃប្រឡងសង</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'attendance'
                ? 'bg-[#fbf8f2] text-[#0d3822] shadow border border-[#e4d9c4]'
                : 'text-[#d7ccb7] hover:text-[#fbf8f2]'
            }`}
          >
            <i className="fas fa-user-xmark text-xs"></i>
            <span>វត្តមាន Blacklist</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('soundboard')}
            className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'soundboard'
                ? 'bg-[#fbf8f2] text-[#0d3822] shadow border border-[#e4d9c4]'
                : 'text-[#d7ccb7] hover:text-[#fbf8f2]'
            }`}
          >
            <i className="fas fa-volume-high text-xs"></i>
            <span>Soundboard</span>
          </button>
        </div>

        {/* TAB 1: RETAKE FEE CALCULATOR */}
        {activeTab === 'retake' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-[#124229] rounded-2xl p-4 border border-[#235e3c]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-[#d7ccb7]">ចំនួនមុខវិជ្ជាដែលធ្លាក់៖</span>
                <span className="text-xl font-bold text-[#fbf8f2]">{failedSubjects} មុខ</span>
              </div>

              {/* Subject Counter Slider & Buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFailedSubjects((p) => Math.max(0, p - 1))}
                  className="w-9 h-9 rounded-xl bg-[#fbf8f2] text-[#0d3822] font-bold text-lg flex items-center justify-center active:scale-95 transition cursor-pointer shadow-xs border border-[#e4d9c4]"
                >
                  -
                </button>
                <input
                  type="range"
                  min="0"
                  max="7"
                  value={failedSubjects}
                  onChange={(e) => setFailedSubjects(parseInt(e.target.value, 10))}
                  className="flex-1 accent-[#fbf8f2] h-2 bg-[#092818] rounded-lg cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setFailedSubjects((p) => Math.min(7, p + 1))}
                  className="w-9 h-9 rounded-xl bg-[#fbf8f2] text-[#0d3822] font-bold text-lg flex items-center justify-center active:scale-95 transition cursor-pointer shadow-xs border border-[#e4d9c4]"
                >
                  +
                </button>
              </div>
            </div>

            {/* Total Cost Display Box */}
            <div className="rounded-2xl p-4 bg-[#faf5ea] text-[#0d3822] border border-[#e4d9c4] text-center shadow-sm">
              <span className="text-[11px] font-bold tracking-wider text-[#1a472d] uppercase">
                តម្លៃសរុបដែលត្រូវបង់ឱ្យសាលា ស៊ីតិច
              </span>
              <div className="text-4xl sm:text-5xl font-bold my-1 text-[#0d3822]">
                ${totalCost} <span className="text-base text-[#1a472d] font-normal">USD</span>
              </div>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold mt-1 bg-[#0d3822] text-[#fbf8f2]">
                {canRetake ? 'គ្រប់ ៣ មុខឡើង ទើបសាលាអនុញ្ញាតឱ្យសង' : 'មិនទាន់គ្រប់ ៣ មុខ សាលាមិនទាន់ឱ្យសងទេ'}
              </span>
            </div>

            {/* Roast Explanation */}
            <div className="bg-[#124229] border border-[#235e3c] rounded-2xl p-3.5 text-xs leading-relaxed text-[#d7ccb7]">
              <i className="fas fa-quote-left text-[#fbf8f2] mr-1.5"></i>
              {retakeRoast}
            </div>

            <button
              type="button"
              onClick={handleShareRetakeToChat}
              className="w-full py-3 rounded-xl bg-[#fbf8f2] hover:bg-[#eee6d5] active:bg-[#e4dbca] text-[#0d3822] font-bold text-xs transition active:scale-95 shadow-md flex items-center justify-center gap-2 cursor-pointer border border-[#e4d9c4]"
            >
              <i className="fas fa-paper-plane text-[#0d3822]"></i>
              <span>ផ្ញើលទ្ធផលទៅកាន់ Chat ភ្លាម</span>
            </button>
          </div>
        )}

        {/* TAB 2: ATTENDANCE & BLACKLIST RADAR */}
        {activeTab === 'attendance' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-[#124229] rounded-2xl p-4 border border-[#235e3c]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-[#d7ccb7]">ចំនួនថ្ងៃឈប់រៀនឥតច្បាប់៖</span>
                <span className="text-xl font-bold text-[#fbf8f2]">{absentDays} ថ្ងៃ</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAbsentDays((p) => Math.max(0, p - 1))}
                  className="w-9 h-9 rounded-xl bg-[#fbf8f2] text-[#0d3822] font-bold text-lg flex items-center justify-center active:scale-95 transition cursor-pointer shadow-xs border border-[#e4d9c4]"
                >
                  -
                </button>
                <input
                  type="range"
                  min="0"
                  max="25"
                  value={absentDays}
                  onChange={(e) => setAbsentDays(parseInt(e.target.value, 10))}
                  className="flex-1 accent-[#fbf8f2] h-2 bg-[#092818] rounded-lg cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setAbsentDays((p) => Math.min(25, p + 1))}
                  className="w-9 h-9 rounded-xl bg-[#fbf8f2] text-[#0d3822] font-bold text-lg flex items-center justify-center active:scale-95 transition cursor-pointer shadow-xs border border-[#e4d9c4]"
                >
                  +
                </button>
              </div>
            </div>

            {/* Severity Card */}
            <div className="rounded-2xl p-4 border border-[#e4d9c4] text-center bg-[#faf5ea] text-[#0d3822] shadow-sm">
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-[#0d3822] text-[#fbf8f2] flex items-center justify-center text-xl">
                <i className={`fas ${
                  attendanceStatus.level === 'danger'
                    ? 'fa-skull'
                    : attendanceStatus.level === 'warning'
                    ? 'fa-triangle-exclamation'
                    : attendanceStatus.level === 'caution'
                    ? 'fa-phone'
                    : 'fa-check'
                }`}></i>
              </div>
              <h4 className="text-base font-bold mb-1 text-[#0d3822]">{attendanceStatus.label}</h4>
              <p className="text-xs text-[#1a472d]">{attendanceStatus.desc}</p>
            </div>

            {/* School Rule Note */}
            <div className="bg-[#124229] border border-[#235e3c] rounded-2xl p-3.5 text-xs text-[#d7ccb7] space-y-1">
              <div className="font-bold text-[#fbf8f2] mb-1">ច្បាប់វត្តមានផ្លូវការ ស៊ីតិច៖</div>
              <div>• ឈប់ ៣ ថ្ងៃ គេខលទៅម៉ែឪភ្លាម</div>
              <div>• ឈប់លើស ១៩ ថ្ងៃ ជាប់ Blacklist លើកទី ១</div>
              <div>• Blacklist លើកទី ២ ហៅម៉ែឪមកសាលាផ្ទាល់</div>
              <div>• Blacklist លើកទី ៣ បញ្ឈប់ការសិក្សា</div>
            </div>

            <button
              type="button"
              onClick={handleShareAttendanceToChat}
              className="w-full py-3 rounded-xl bg-[#fbf8f2] hover:bg-[#eee6d5] active:bg-[#e4dbca] text-[#0d3822] font-bold text-xs transition active:scale-95 shadow-md flex items-center justify-center gap-2 cursor-pointer border border-[#e4d9c4]"
            >
              <i className="fas fa-paper-plane text-[#0d3822]"></i>
              <span>ផ្ញើទៅសុំជំនួយពី Chatbot ភ្លាម</span>
            </button>
          </div>
        )}

        {/* TAB 3: TROLL SOUNDBOARD */}
        {activeTab === 'soundboard' && (
          <div className="space-y-3 animate-fade-in">
            <p className="text-xs text-[#d7ccb7] text-center mb-1">
              ចុចប៊ូតុងដើម្បីស្តាប់សំឡេង Troll លេងជាមួយមិត្តភក្តិ៖
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => playSoundEffect('chuckle')}
                className="p-3.5 rounded-2xl bg-[#124229] hover:bg-[#164a2f] border border-[#235e3c] text-left transition active:scale-95 cursor-pointer flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-[#fbf8f2] text-[#0d3822] flex items-center justify-center text-base shrink-0 shadow-xs">
                  <i className="fas fa-face-laugh-squint"></i>
                </div>
                <div>
                  <div className="text-xs font-bold text-[#fbf8f2]">សើច Troll ហាហា</div>
                  <div className="text-[10px] text-[#d7ccb7]">Chuckle laugh</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => playSoundEffect('slap')}
                className="p-3.5 rounded-2xl bg-[#124229] hover:bg-[#164a2f] border border-[#235e3c] text-left transition active:scale-95 cursor-pointer flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-[#fbf8f2] text-[#0d3822] flex items-center justify-center text-base shrink-0 shadow-xs">
                  <i className="fas fa-hand"></i>
                </div>
                <div>
                  <div className="text-xs font-bold text-[#fbf8f2]">ទះមួយកំភ្លៀង</div>
                  <div className="text-[10px] text-[#d7ccb7]">Punch / Slap SFX</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => playSoundEffect('bell')}
                className="p-3.5 rounded-2xl bg-[#124229] hover:bg-[#164a2f] border border-[#235e3c] text-left transition active:scale-95 cursor-pointer flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-[#fbf8f2] text-[#0d3822] flex items-center justify-center text-base shrink-0 shadow-xs">
                  <i className="fas fa-bell"></i>
                </div>
                <div>
                  <div className="text-xs font-bold text-[#fbf8f2]">ជួងប្ដូរថ្នាក់ស្ទះ</div>
                  <div className="text-[10px] text-[#d7ccb7]">School Bell Chime</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => playSoundEffect('alarm')}
                className="p-3.5 rounded-2xl bg-[#124229] hover:bg-[#164a2f] border border-[#235e3c] text-left transition active:scale-95 cursor-pointer flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-[#fbf8f2] text-[#0d3822] flex items-center justify-center text-base shrink-0 shadow-xs">
                  <i className="fas fa-triangle-exclamation"></i>
                </div>
                <div>
                  <div className="text-xs font-bold text-[#fbf8f2]">ស៊ីរ៉ែន Blacklist</div>
                  <div className="text-[10px] text-[#d7ccb7]">Police Siren Warning</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => playSoundEffect('coffee')}
                className="p-3.5 rounded-2xl bg-[#124229] hover:bg-[#164a2f] border border-[#235e3c] text-left transition active:scale-95 cursor-pointer flex items-center gap-3 col-span-2"
              >
                <div className="w-10 h-10 rounded-xl bg-[#fbf8f2] text-[#0d3822] flex items-center justify-center text-base shrink-0 shadow-xs">
                  <i className="fas fa-mug-hot"></i>
                </div>
                <div>
                  <div className="text-xs font-bold text-[#fbf8f2]">ចាក់កាហ្វេដោះគោទឹកកកមុខសាលា</div>
                  <div className="text-[10px] text-[#d7ccb7]">SETEC Coffee Addiction</div>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
