'use client';

import React, { useRef, useState, useEffect } from 'react';
import { VIRAL_TROLL_QUOTES } from '../app/prompts/communityLore';

export default function TrollQuoteModal({
  isOpen,
  onClose,
  quoteText = '',
  botPersona = 'កូនច្បង',
  theme = 'dark'
}) {
  const canvasRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeCategory, setActiveCategory] = useState('current');
  const [currentText, setCurrentText] = useState(quoteText || '');
  const [currentDept, setCurrentDept] = useState('');

  useEffect(() => {
    if (quoteText) {
      setCurrentText(quoteText);
      setActiveCategory('current');
      setCurrentDept('');
    } else if (VIRAL_TROLL_QUOTES?.length > 0) {
      const q = VIRAL_TROLL_QUOTES[0];
      setCurrentText(`${q.quoteKh}\n\n${q.quoteEn}\n${q.tags.join(' ')}`);
      setCurrentDept(q.department);
      setActiveCategory('it_cs');
    }
  }, [quoteText, isOpen]);

  useEffect(() => {
    if (!isOpen || !currentText) return;
    renderCardToCanvas();
  }, [isOpen, currentText, botPersona, theme, currentDept]);

  if (!isOpen) return null;

  // Helper to wrap text into canvas lines
  function wrapText(ctx, text, maxWidth) {
    const paragraphs = text.split('\n');
    const lines = [];

    paragraphs.forEach((para) => {
      const trimmed = para.trim();
      if (!trimmed) {
        lines.push('');
        return;
      }
      const words = trimmed.split(' ');
      let currentLine = '';

      for (let i = 0; i < words.length; i++) {
        const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = words[i];
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);
    });

    return lines;
  }

  const renderCardToCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1080;
    const height = 1080;
    canvas.width = width;
    canvas.height = height;

    // Background Gradient (Dark Cyber SETEC style)
    const isKonBong = botPersona.includes('កូនច្បង');
    const grad = ctx.createLinearGradient(0, 0, width, height);
    if (isKonBong) {
      grad.addColorStop(0, '#060d1a');
      grad.addColorStop(0.5, '#0a1628');
      grad.addColorStop(1, '#020610');
    } else {
      grad.addColorStop(0, '#190615');
      grad.addColorStop(0.5, '#22081c');
      grad.addColorStop(1, '#0c020d');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Decorative Glowing Neon Border
    ctx.strokeStyle = isKonBong ? 'rgba(6, 182, 212, 0.45)' : 'rgba(236, 72, 153, 0.45)';
    ctx.lineWidth = 12;
    ctx.strokeRect(36, 36, width - 72, height - 72);

    // Subtle Corner Accents
    ctx.fillStyle = isKonBong ? '#22d3ee' : '#f472b6';
    const accentLen = 48;
    ctx.fillRect(36, 36, accentLen, 12);
    ctx.fillRect(36, 36, 12, accentLen);
    ctx.fillRect(width - 36 - accentLen, 36, accentLen, 12);
    ctx.fillRect(width - 48, 36, 12, accentLen);
    ctx.fillRect(36, height - 48, accentLen, 12);
    ctx.fillRect(36, height - 36 - accentLen, 12, accentLen);
    ctx.fillRect(width - 36 - accentLen, height - 48, accentLen, 12);
    ctx.fillRect(width - 48, height - 36 - accentLen, 12, accentLen);

    // Header Badge: "SETEC TROLL CHATBOT • PUNCHLINE"
    ctx.font = 'bold 24px "Kantumruy Pro", sans-serif';
    ctx.fillStyle = isKonBong ? '#38bdf8' : '#f472b6';
    ctx.textAlign = 'center';
    ctx.fillText(`⚡ SETEC TROLL CHATBOT • IG & X QUOTE ⚡`, width / 2, 125);

    // Persona Name & Department Tag
    ctx.font = '900 44px "Kantumruy Pro", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`ស្ដេចឌឺ (${botPersona})`, width / 2, 190);

    if (currentDept) {
      ctx.font = 'bold 24px "Kantumruy Pro", sans-serif';
      ctx.fillStyle = isKonBong ? '#22d3ee' : '#f472b6';
      ctx.fillText(currentDept, width / 2, 235);
    }

    // Big Decorative Quotation Mark
    ctx.font = 'bold 160px serif';
    ctx.fillStyle = isKonBong ? 'rgba(56, 189, 248, 0.14)' : 'rgba(244, 114, 182, 0.14)';
    ctx.fillText('“', 140, 360);

    // Quote Content (Wrapped)
    ctx.font = 'bold 36px "Kantumruy Pro", "Battambang", sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';

    const maxLineWidth = 860;
    const lines = wrapText(ctx, currentText, maxLineWidth);
    const lineHeight = 58;
    const totalTextHeight = lines.length * lineHeight;
    const startY = Math.max(330, 520 - totalTextHeight / 2);

    lines.slice(0, 8).forEach((line, idx) => {
      if (line.startsWith('#')) {
        ctx.fillStyle = isKonBong ? '#38bdf8' : '#f472b6';
        ctx.font = 'bold 28px "Kantumruy Pro", sans-serif';
      } else {
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 36px "Kantumruy Pro", "Battambang", sans-serif';
      }
      ctx.fillText(line, width / 2, startY + idx * lineHeight);
    });

    // Divider Line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(180, 880);
    ctx.lineTo(width - 180, 880);
    ctx.stroke();

    // Footer Watermark & Links
    ctx.font = 'bold 24px "Kantumruy Pro", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.fillText('🌐 troll-setec-chatbot.web.app • Facebook: SETEC Troll Meme', width / 2, 935);

    ctx.font = 'bold 20px "Kantumruy Pro", sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('បង្កើតឡើងដោយ Rotana NOB (Creator)', width / 2, 975);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsGenerating(true);
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `SETEC_Troll_Quote_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.warn('Canvas download error:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(currentText);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const selectCategoryQuote = (catKey) => {
    setActiveCategory(catKey);
    if (catKey === 'current') {
      setCurrentText(quoteText || '');
      setCurrentDept('');
      return;
    }

    const filtered = VIRAL_TROLL_QUOTES.filter((q) => q.category === catKey);
    if (filtered.length > 0) {
      const randomItem = filtered[Math.floor(Math.random() * filtered.length)];
      setCurrentText(`${randomItem.quoteKh}\n\n${randomItem.quoteEn}\n${randomItem.tags.join(' ')}`);
      setCurrentDept(randomItem.department);
    }
  };

  const handleRandomQuote = () => {
    const list = activeCategory === 'current'
      ? VIRAL_TROLL_QUOTES
      : VIRAL_TROLL_QUOTES.filter((q) => q.category === activeCategory);
    const pool = list.length > 0 ? list : VIRAL_TROLL_QUOTES;
    const randomItem = pool[Math.floor(Math.random() * pool.length)];
    setCurrentText(`${randomItem.quoteKh}\n\n${randomItem.quoteEn}\n${randomItem.tags.join(' ')}`);
    setCurrentDept(randomItem.department);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md sm:max-w-lg rounded-3xl p-5 border border-cyan-500/30 bg-slate-900 text-white shadow-2xl relative overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm">
              📸
            </span>
            <h3 className="font-black text-sm sm:text-base text-cyan-200">
              Quote Troll IG & X (Story / Post)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <i className="fas fa-times text-xs"></i>
          </button>
        </div>

        {/* Preset Category Switcher */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2.5 scrollbar-none">
          {quoteText && (
            <button
              type="button"
              onClick={() => selectCategoryQuote('current')}
              className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 transition cursor-pointer ${
                activeCategory === 'current'
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              💬 សារនេះ
            </button>
          )}

          <button
            type="button"
            onClick={() => selectCategoryQuote('it_cs')}
            className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 transition cursor-pointer ${
              activeCategory === 'it_cs'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            💻 IT & CS
          </button>

          <button
            type="button"
            onClick={() => selectCategoryQuote('interior')}
            className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 transition cursor-pointer ${
              activeCategory === 'interior'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            🏛️ Interior
          </button>

          <button
            type="button"
            onClick={() => selectCategoryQuote('graphic')}
            className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 transition cursor-pointer ${
              activeCategory === 'graphic'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            🎨 Graphic
          </button>

          <button
            type="button"
            onClick={handleRandomQuote}
            className="px-2.5 py-1 rounded-full text-xs font-bold shrink-0 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 transition cursor-pointer flex items-center gap-1"
            title="ប្តូរ Quote ចៃដន្យថ្មី"
          >
            <i className="fas fa-dice"></i>
            <span>ចៃដន្យ</span>
          </button>
        </div>

        {/* Live Canvas Preview */}
        <div className="w-full aspect-square rounded-2xl overflow-hidden border border-slate-700/60 bg-black flex items-center justify-center mb-3 shadow-inner">
          <canvas
            ref={canvasRef}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={isGenerating}
            className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-black text-xs transition active:scale-95 shadow-lg flex items-center justify-center gap-2 cursor-pointer"
          >
            <i className="fas fa-download"></i>
            <span>{isGenerating ? 'កំពុងទាញយក...' : 'ទាញយក PNG (1080x1080)'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition active:scale-95 border border-slate-700 flex items-center gap-1.5 cursor-pointer"
          >
            <i className={`fas ${copied ? 'fa-check text-emerald-400' : 'fa-copy'}`}></i>
            <span>{copied ? 'បានចម្លង!' : 'Copy Caption'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
