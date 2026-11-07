'use client';

import React, { useRef, useState, useEffect } from 'react';
import { VIRAL_TROLL_QUOTES } from '../app/prompts/communityLore';

export default function TrollQuoteModal({
  isOpen,
  onClose,
  quoteText = '',
  botPersona = 'កូនច្បង',
  botAvatar = '',
  logoUrl = '/img/icon.jpg',
  theme = 'dark'
}) {
  const canvasRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeCategory, setActiveCategory] = useState('current');
  const [currentText, setCurrentText] = useState(quoteText || '');
  const [currentDept, setCurrentDept] = useState('');
  const [cardStyle, setCardStyle] = useState('cyber'); // 'cyber' | 'neon' | 'oled'

  // Determine avatar if not explicitly provided
  const resolvedBotAvatar =
    botAvatar ||
    (botPersona.includes('កូនច្បង')
      ? 'https://api.dicebear.com/7.x/bottts/svg?seed=SETECbot'
      : 'https://api.dicebear.com/7.x/pixel-art/svg?seed=MommyGirl');

  const resolvedLogoUrl = logoUrl || '/img/icon.jpg';

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
  }, [isOpen, currentText, botPersona, theme, currentDept, cardStyle, resolvedBotAvatar, resolvedLogoUrl]);

  if (!isOpen) return null;

  // Helper to load image safely without throwing or blocking
  function loadImage(src) {
    return new Promise((resolve) => {
      if (!src) return resolve(null);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => {
        // Fallback without crossOrigin (for local domain assets)
        const fallback = new Image();
        fallback.onload = () => resolve(fallback);
        fallback.onerror = () => resolve(null);
        fallback.src = src;
      };
      img.src = src;
    });
  }

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

  // Draw rounded rectangle helper
  function roundRect(ctx, x, y, width, height, radius, fill = true, stroke = false) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  const renderCardToCanvas = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1080;
    const height = 1080;
    canvas.width = width;
    canvas.height = height;

    const isKonBong = botPersona.includes('កូនច្បង');
    const primaryColor = isKonBong ? '#06b6d4' : '#ec4899'; // Cyan or Pink
    const secondaryColor = isKonBong ? '#38bdf8' : '#f472b6';
    const accentGold = '#fbbf24';

    // 1. Background Style Rendering (Gemini Nano Banana Cyber / Neon / OLED)
    if (cardStyle === 'cyber') {
      // Cyber Dark with radial ambient glow
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      if (isKonBong) {
        bgGrad.addColorStop(0, '#040d1a');
        bgGrad.addColorStop(0.5, '#07162c');
        bgGrad.addColorStop(1, '#020611');
      } else {
        bgGrad.addColorStop(0, '#160515');
        bgGrad.addColorStop(0.5, '#260a22');
        bgGrad.addColorStop(1, '#09020a');
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Ambient radial glow behind the center text
      const radialGlow = ctx.createRadialGradient(540, 560, 60, 540, 560, 480);
      radialGlow.addColorStop(0, isKonBong ? 'rgba(6, 182, 212, 0.22)' : 'rgba(236, 72, 153, 0.22)');
      radialGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = radialGlow;
      ctx.fillRect(0, 0, width, height);

      // Subtle tech scanline effect
      ctx.fillStyle = 'rgba(255, 255, 255, 0.012)';
      for (let y = 0; y < height; y += 8) {
        ctx.fillRect(0, y, width, 2);
      }
    } else if (cardStyle === 'neon') {
      // Vibrant Neon Party Wave
      const neonGrad = ctx.createLinearGradient(0, 0, width, height);
      if (isKonBong) {
        neonGrad.addColorStop(0, '#0f172a');
        neonGrad.addColorStop(0.5, '#082f49');
        neonGrad.addColorStop(1, '#0284c7');
      } else {
        neonGrad.addColorStop(0, '#1e1b4b');
        neonGrad.addColorStop(0.5, '#500724');
        neonGrad.addColorStop(1, '#831843');
      }
      ctx.fillStyle = neonGrad;
      ctx.fillRect(0, 0, width, height);
    } else {
      // OLED Pitch Black Luxury
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, width, height);

      const subtleGlow = ctx.createRadialGradient(540, 540, 100, 540, 540, 500);
      subtleGlow.addColorStop(0, 'rgba(251, 191, 36, 0.08)');
      subtleGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = subtleGlow;
      ctx.fillRect(0, 0, width, height);
    }

    // 2. High-Tech Cyber Framing & Glowing Corner Brackets
    ctx.strokeStyle = isKonBong ? 'rgba(6, 182, 212, 0.4)' : 'rgba(236, 72, 153, 0.4)';
    ctx.lineWidth = 4;
    roundRect(ctx, 42, 42, width - 84, height - 84, 28, false, true);

    // Glowing Tech Corner Accents ⌜ ⌝ ⌞ ⌟
    ctx.fillStyle = primaryColor;
    const bLen = 56;
    const bThick = 8;
    // Top-Left
    ctx.fillRect(42, 42, bLen, bThick);
    ctx.fillRect(42, 42, bThick, bLen);
    // Top-Right
    ctx.fillRect(width - 42 - bLen, 42, bLen, bThick);
    ctx.fillRect(width - 42 - bThick, 42, bThick, bLen);
    // Bottom-Left
    ctx.fillRect(42, height - 42 - bThick, bLen, bThick);
    ctx.fillRect(42, height - 42 - bLen, bThick, bLen);
    // Bottom-Right
    ctx.fillRect(width - 42 - bLen, height - 42 - bThick, bLen, bThick);
    ctx.fillRect(width - 42 - bThick, height - 42 - bLen, bThick, bLen);

    // 3. Preload and Draw SETEC Troll Logo & Chatbot Avatar
    const [logoImg, avatarImg] = await Promise.all([
      loadImage(resolvedLogoUrl),
      loadImage(resolvedBotAvatar)
    ]);

    // Draw Top-Left SETEC Troll Logo
    const logoX = 72;
    const logoY = 68;
    const logoSize = 78;

    // Logo Outer Glow & Frame
    ctx.save();
    ctx.shadowColor = primaryColor;
    ctx.shadowBlur = 18;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 3;
    roundRect(ctx, logoX, logoY, logoSize, logoSize, 20, true, true);
    ctx.restore();

    if (logoImg) {
      ctx.save();
      ctx.beginPath();
      roundRect(ctx, logoX + 3, logoY + 3, logoSize - 6, logoSize - 6, 17, false, false);
      ctx.clip();
      ctx.drawImage(logoImg, logoX + 3, logoY + 3, logoSize - 6, logoSize - 6);
      ctx.restore();
    } else {
      // Logo Vector Fallback
      ctx.font = 'bold 36px sans-serif';
      ctx.fillStyle = accentGold;
      ctx.textAlign = 'center';
      ctx.fillText('⚡', logoX + logoSize / 2, logoY + 52);
    }

    // Logo Text Header
    ctx.textAlign = 'left';
    ctx.font = '900 24px "Kantumruy Pro", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('SETEC TROLL MEME', logoX + logoSize + 18, logoY + 36);

    ctx.font = 'bold 18px "Kantumruy Pro", sans-serif';
    ctx.fillStyle = secondaryColor;
    ctx.fillText('troll-setec-chatbot.web.app', logoX + logoSize + 18, logoY + 64);

    // Top-Right Nano Banana 2.1 AI Engine Badge
    const badgeW = 270;
    const badgeH = 46;
    const badgeX = width - 72 - badgeW;
    const badgeY = 82;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
    ctx.lineWidth = 2;
    roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 23, true, true);
    ctx.restore();

    ctx.font = '900 16px "Kantumruy Pro", sans-serif';
    ctx.fillStyle = '#fde047';
    ctx.textAlign = 'center';
    ctx.fillText('🍌 NANO BANANA 2.1 • AI', badgeX + badgeW / 2, badgeY + 29);

    // 4. Center Chatbot Avatar Profile Header
    const avatarCenterX = width / 2;
    const avatarCenterY = 230;
    const avatarRadius = 56;

    // Glowing Outer Circle Ring
    ctx.save();
    ctx.shadowColor = primaryColor;
    ctx.shadowBlur = 24;
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(avatarCenterX, avatarCenterY, avatarRadius + 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Draw Avatar Image or Vector Fallback
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarCenterX, avatarCenterY, avatarRadius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    if (avatarImg) {
      ctx.drawImage(
        avatarImg,
        avatarCenterX - avatarRadius,
        avatarCenterY - avatarRadius,
        avatarRadius * 2,
        avatarRadius * 2
      );
    } else {
      ctx.fillStyle = isKonBong ? '#0891b2' : '#be185d';
      ctx.fillRect(
        avatarCenterX - avatarRadius,
        avatarCenterY - avatarRadius,
        avatarRadius * 2,
        avatarRadius * 2
      );
      ctx.font = '48px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(isKonBong ? '🤖' : '💅', avatarCenterX, avatarCenterY + 16);
    }
    ctx.restore();

    // Verified Checkmark Badge on Avatar
    const checkX = avatarCenterX + 40;
    const checkY = avatarCenterY + 40;
    ctx.save();
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(checkX, checkY, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.font = '900 16px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('✓', checkX, checkY + 6);
    ctx.restore();

    // Bot Persona Title
    ctx.textAlign = 'center';
    ctx.font = '900 36px "Kantumruy Pro", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`ស្ដេចឌឺ (${botPersona})`, avatarCenterX, 332);

    // Department Pill Badge (if exists)
    if (currentDept) {
      const deptPillW = 340;
      const deptPillH = 38;
      const deptPillX = avatarCenterX - deptPillW / 2;
      const deptPillY = 352;

      ctx.save();
      ctx.fillStyle = isKonBong ? 'rgba(6, 182, 212, 0.15)' : 'rgba(236, 72, 153, 0.15)';
      ctx.strokeStyle = isKonBong ? 'rgba(6, 182, 212, 0.5)' : 'rgba(236, 72, 153, 0.5)';
      ctx.lineWidth = 1.5;
      roundRect(ctx, deptPillX, deptPillY, deptPillW, deptPillH, 19, true, true);
      ctx.restore();

      ctx.font = 'bold 20px "Kantumruy Pro", sans-serif';
      ctx.fillStyle = secondaryColor;
      ctx.fillText(currentDept, avatarCenterX, deptPillY + 26);
    }

    // 5. Large Decorative Quotation Mark Watermark
    ctx.font = '900 180px serif';
    ctx.fillStyle = isKonBong ? 'rgba(56, 189, 248, 0.12)' : 'rgba(244, 114, 182, 0.12)';
    ctx.textAlign = 'left';
    ctx.fillText('“', 90, 480);

    // 6. Main Quote Content Body (Auto-wrapped and dynamically scaled)
    const maxLineWidth = 880;
    const textLength = currentText.length;
    let fontSize = 36;
    let lineHeight = 58;

    if (textLength > 300) {
      fontSize = 28;
      lineHeight = 46;
    } else if (textLength > 180) {
      fontSize = 32;
      lineHeight = 52;
    }

    ctx.font = `bold ${fontSize}px "Kantumruy Pro", "Battambang", sans-serif`;
    const lines = wrapText(ctx, currentText, maxLineWidth);
    const totalTextHeight = lines.length * lineHeight;
    const startY = Math.max(450, 610 - totalTextHeight / 2);

    ctx.textAlign = 'center';
    lines.slice(0, 8).forEach((line, idx) => {
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 12;

      if (line.startsWith('#')) {
        ctx.fillStyle = secondaryColor;
        ctx.font = `900 ${Math.max(22, fontSize - 6)}px "Kantumruy Pro", sans-serif`;
      } else {
        ctx.fillStyle = '#f8fafc';
        ctx.font = `bold ${fontSize}px "Kantumruy Pro", "Battambang", sans-serif`;
      }
      ctx.fillText(line, width / 2, startY + idx * lineHeight);
      ctx.restore();
    });

    // 7. Divider Line with Center Glowing Diamond
    const divY = 890;
    const divGrad = ctx.createLinearGradient(120, divY, width - 120, divY);
    divGrad.addColorStop(0, 'transparent');
    divGrad.addColorStop(0.5, isKonBong ? 'rgba(6, 182, 212, 0.6)' : 'rgba(236, 72, 153, 0.6)');
    divGrad.addColorStop(1, 'transparent');

    ctx.strokeStyle = divGrad;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(120, divY);
    ctx.lineTo(width - 120, divY);
    ctx.stroke();

    // Center Diamond
    ctx.save();
    ctx.translate(width / 2, divY);
    ctx.rotate((45 * Math.PI) / 180);
    ctx.fillStyle = primaryColor;
    ctx.fillRect(-7, -7, 14, 14);
    ctx.restore();

    // 8. Footer Section: Social Links, Creator & Nano Banana Powered
    ctx.font = '900 23px "Kantumruy Pro", sans-serif';
    ctx.fillStyle = '#e2e8f0';
    ctx.textAlign = 'center';
    ctx.fillText('👑 បង្កើតឡើងដោយ Rotana NOB (SETEC Troll Creator)', width / 2, 945);

    ctx.font = 'bold 19px "Kantumruy Pro", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('🔥 គ្រុបហ្វេសប៊ុក: SETEC Troll Meme (30K នាក់) • ⚡ Powered by Gemini Nano Banana', width / 2, 985);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsGenerating(true);
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `SETEC_Troll_Quote_NanoBanana_${Date.now()}.png`;
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
    const list =
      activeCategory === 'current'
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
            <span className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm shadow-inner">
              🍌
            </span>
            <div>
              <h3 className="font-black text-sm sm:text-base text-cyan-200 flex items-center gap-1.5">
                <span>Quote Troll (Gemini Nano Banana 2.1)</span>
              </h3>
              <p className="text-[10px] text-cyan-400/80 font-medium">
                មាន Logo SETEC Troll + Avatar Bot + Full 1080x1080 HD Card
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

        {/* Preset Category Switcher */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none">
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

        {/* Visual Style Selector (Nano Banana Cyber, Neon Party, OLED Dark) */}
        <div className="flex items-center gap-1.5 pb-2 mb-2">
          <span className="text-[10px] text-slate-400 font-bold">Style:</span>
          <button
            type="button"
            onClick={() => setCardStyle('cyber')}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
              cardStyle === 'cyber'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            ⚡ Cyber
          </button>
          <button
            type="button"
            onClick={() => setCardStyle('neon')}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
              cardStyle === 'neon'
                ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            ✨ Neon
          </button>
          <button
            type="button"
            onClick={() => setCardStyle('oled')}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
              cardStyle === 'oled'
                ? 'bg-slate-950 text-amber-300 border border-amber-500/40 shadow'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            🖤 OLED
          </button>
        </div>

        {/* Live Canvas Preview */}
        <div className="w-full aspect-square rounded-2xl overflow-hidden border border-slate-700/60 bg-black flex items-center justify-center mb-3 shadow-inner relative group">
          <canvas ref={canvasRef} className="w-full h-full object-contain" />
          <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-black/60 text-[10px] text-slate-300 font-bold backdrop-blur-sm pointer-events-none">
            1080 x 1080 HD
          </div>
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
