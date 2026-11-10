'use client';

import React, { useRef, useState, useEffect } from 'react';
import { VIRAL_TROLL_QUOTES } from '../app/utils/viralQuotes';

export default function TrollQuoteModal({
  isOpen,
  onClose,
  quoteText = '',
  botPersona = 'កូនទី២',
  botAvatar = '',
  logoUrl = '/img/icon.jpg',
  theme = 'dark'
}) {
  const canvasRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('current');
  const [currentText, setCurrentText] = useState(quoteText || '');
  const [currentDept, setCurrentDept] = useState('');
  const [cardStyle, setCardStyle] = useState('classic'); // 'classic' | 'milk' | 'paper'

  // Helper to clean raw quote text from bot prefixes
  function sanitizeQuote(text) {
    if (!text) return '';
    return text
      .replace(/^\[(?:កូនច្បង|កូនពៅ|កូនទី២|ប្អូនទី២|ចែ|chatbot)[^\]]*\]\s*:\s*/i, '')
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .trim();
  }

  // Determine avatar if not explicitly provided
  const isKandal = botPersona.includes('កូនទី២') || botPersona.includes('ប្អូនទី២');
  const isKonBong = botPersona.includes('កូនច្បង');
  const resolvedBotAvatar =
    botAvatar ||
    (isKandal
      ? 'https://api.dicebear.com/7.x/bottts/svg?seed=KonKandalPolite'
      : isKonBong
      ? 'https://api.dicebear.com/7.x/bottts/svg?seed=SETECbot'
      : 'https://api.dicebear.com/7.x/lorelei/svg?seed=Aneka');

  const resolvedLogoUrl = logoUrl || '/img/icon.jpg';

  useEffect(() => {
    if (quoteText) {
      setCurrentText(sanitizeQuote(quoteText));
      setActiveCategory('current');
      setCurrentDept('');
    } else if (VIRAL_TROLL_QUOTES?.length > 0) {
      const q = VIRAL_TROLL_QUOTES[0];
      setCurrentText(`${q.quoteKh}\n\n${q.quoteEn}\n\n${q.tags.join(' ')}`);
      setCurrentDept(q.department);
      setActiveCategory('it_cs');
    }
  }, [quoteText, isOpen]);

  useEffect(() => {
    if (!isOpen || !currentText) return;
    renderCardToCanvas();
  }, [isOpen, currentText, botPersona, theme, currentDept, cardStyle, resolvedBotAvatar, resolvedLogoUrl]);

  if (!isOpen) return null;

  function loadImage(src) {
    return new Promise((resolve) => {
      if (!src) return resolve(null);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => {
        const fallback = new Image();
        fallback.onload = () => resolve(fallback);
        fallback.onerror = () => resolve(null);
        fallback.src = src;
      };
      img.src = src;
    });
  }

  function tokenizeText(text) {
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      try {
        const segmenter = new Intl.Segmenter('km', { granularity: 'word' });
        return Array.from(segmenter.segment(text)).map((s) => s.segment);
      } catch {
        return text.split(' ');
      }
    }
    return text.split(' ');
  }

  function wrapSingleParagraph(ctx, text, maxWidth, size) {
    ctx.font = `bold ${size}px "Kantumruy Pro", "Battambang", sans-serif`;
    const tokens = tokenizeText(text);
    const lines = [];
    let currentLine = '';

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const testLine = currentLine + token;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine.trim()) {
        lines.push(currentLine.trim());
        currentLine = token;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }
    return lines;
  }

  function autoFitQuoteText(ctx, rawText, maxWidth, maxHeight) {
    const rawParagraphs = rawText
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean);

    if (rawParagraphs.length === 0) {
      return { size: 36, lineHeight: 56, paraGap: 18, lines: [], totalHeight: 0 };
    }

    for (let size = 36; size >= 14; size -= 1) {
      const lineHeight = Math.round(size * 1.58);
      const paraGap = Math.round(size * 0.45);
      const allLines = [];

      for (let pIdx = 0; pIdx < rawParagraphs.length; pIdx++) {
        const para = rawParagraphs[pIdx];
        const pLines = wrapSingleParagraph(ctx, para, maxWidth, size);
        for (let lIdx = 0; lIdx < pLines.length; lIdx++) {
          allLines.push({
            text: pLines[lIdx],
            isNewPara: lIdx === 0 && pIdx > 0
          });
        }
      }

      const totalHeight =
        allLines.length * lineHeight + Math.max(0, rawParagraphs.length - 1) * paraGap;

      if (totalHeight <= maxHeight) {
        return { size, lineHeight, paraGap, lines: allLines, totalHeight };
      }

      if (size === 14) {
        const safeLines = [];
        let accumulatedHeight = 0;
        for (let i = 0; i < allLines.length; i++) {
          const item = allLines[i];
          const extra = item.isNewPara ? paraGap : 0;
          if (accumulatedHeight + lineHeight + extra <= maxHeight - 20) {
            safeLines.push(item);
            accumulatedHeight += lineHeight + extra;
          } else {
            if (safeLines.length > 0) {
              const last = safeLines[safeLines.length - 1];
              last.text = last.text.replace(/[.,!?…\s]+$/, '') + '...';
            }
            break;
          }
        }
        return { size: 14, lineHeight, paraGap, lines: safeLines, totalHeight: accumulatedHeight };
      }
    }

    return { size: 14, lineHeight: 22, paraGap: 8, lines: [], totalHeight: 0 };
  }

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

    // Palette Configurations based on Human Editorial Design
    let bgMain = '#082215';
    let bgSecondary = '#0d3822';
    let textColor = '#fbf8f2';
    let textSub = '#d7ccb7';
    let accentBorder = '#2a6943';
    let goldAccent = '#d4af37';
    let cardFrameColor = 'rgba(212, 175, 55, 0.4)';

    if (cardStyle === 'milk') {
      bgMain = '#fcfaf6';
      bgSecondary = '#f4eee2';
      textColor = '#082215';
      textSub = '#3d5948';
      accentBorder = '#cfc6b4';
      goldAccent = '#8a6e27';
      cardFrameColor = 'rgba(13, 56, 34, 0.25)';
    } else if (cardStyle === 'paper') {
      bgMain = '#f5efe4';
      bgSecondary = '#ebe2d3';
      textColor = '#0a2e1c';
      textSub = '#4a6353';
      accentBorder = '#c5baaa';
      goldAccent = '#997424';
      cardFrameColor = 'rgba(10, 46, 28, 0.3)';
    }

    // 1. Background Fill
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, bgMain);
    bgGrad.addColorStop(1, bgSecondary);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle paper texture effect (human editorial)
    ctx.fillStyle = cardStyle === 'classic' ? 'rgba(255, 255, 255, 0.015)' : 'rgba(0, 0, 0, 0.015)';
    for (let y = 0; y < height; y += 6) {
      ctx.fillRect(0, y, width, 1);
    }

    // 2. Tactile Double Frame Border (Fine Academic Print Style)
    ctx.strokeStyle = cardFrameColor;
    ctx.lineWidth = 3;
    roundRect(ctx, 44, 44, width - 88, height - 88, 24, false, true);

    ctx.strokeStyle = accentBorder;
    ctx.lineWidth = 1;
    roundRect(ctx, 56, 56, width - 112, height - 112, 18, false, true);

    // Corner Ornaments
    ctx.fillStyle = goldAccent;
    const cSize = 6;
    ctx.fillRect(56, 56, cSize, cSize);
    ctx.fillRect(width - 56 - cSize, 56, cSize, cSize);
    ctx.fillRect(56, height - 56 - cSize, cSize, cSize);
    ctx.fillRect(width - 56 - cSize, height - 56 - cSize, cSize, cSize);

    // 3. Preload and Draw SETEC Logo & Chatbot Avatar
    const [logoImg, avatarImg] = await Promise.all([
      loadImage(resolvedLogoUrl),
      loadImage(resolvedBotAvatar)
    ]);

    // Top-Left SETEC Logo Seal
    const logoX = 76;
    const logoY = 74;
    const logoSize = 72;

    ctx.fillStyle = cardStyle === 'classic' ? '#0d3822' : '#f4eee2';
    ctx.strokeStyle = goldAccent;
    ctx.lineWidth = 2;
    roundRect(ctx, logoX, logoY, logoSize, logoSize, 18, true, true);

    if (logoImg) {
      ctx.save();
      ctx.beginPath();
      roundRect(ctx, logoX + 3, logoY + 3, logoSize - 6, logoSize - 6, 15, false, false);
      ctx.clip();
      ctx.drawImage(logoImg, logoX + 3, logoY + 3, logoSize - 6, logoSize - 6);
      ctx.restore();
    }

    // Logo Text Header
    ctx.textAlign = 'left';
    ctx.font = 'bold 22px "Kantumruy Pro", sans-serif';
    ctx.fillStyle = textColor;
    ctx.fillText('SETEC TROLL MEME', logoX + logoSize + 16, logoY + 32);

    ctx.font = 'normal 15px "Kantumruy Pro", sans-serif';
    ctx.fillStyle = textSub;
    ctx.fillText('troll-setec-chatbot.web.app', logoX + logoSize + 16, logoY + 58);

    // Top-Right Seal Badge (Human Editorial)
    const badgeW = 260;
    const badgeH = 42;
    const badgeX = width - 76 - badgeW;
    const badgeY = 86;

    ctx.fillStyle = cardStyle === 'classic' ? 'rgba(13, 56, 34, 0.9)' : 'rgba(235, 226, 211, 0.9)';
    ctx.strokeStyle = goldAccent;
    ctx.lineWidth = 1.5;
    roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 12, true, true);

    ctx.font = 'bold 15px "Kantumruy Pro", sans-serif';
    ctx.fillStyle = goldAccent;
    ctx.textAlign = 'center';
    ctx.fillText('វិទ្យាស្ថានស៊ីតិច • SETEC TROLL', badgeX + badgeW / 2, badgeY + 26);

    // 4. Center Chatbot Avatar Profile Header
    const avatarCenterX = width / 2;
    const avatarCenterY = 226;
    const avatarRadius = 52;

    ctx.save();
    ctx.strokeStyle = goldAccent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(avatarCenterX, avatarCenterY, avatarRadius + 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

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
      ctx.fillStyle = '#0d3822';
      ctx.fillRect(
        avatarCenterX - avatarRadius,
        avatarCenterY - avatarRadius,
        avatarRadius * 2,
        avatarRadius * 2
      );
    }
    ctx.restore();

    // Bot Persona Title (Strictly Zero Parentheses)
    ctx.textAlign = 'center';
    ctx.font = 'bold 32px "Kantumruy Pro", sans-serif';
    ctx.fillStyle = textColor;
    const personaTitle = isKandal
      ? 'ស៊ីតិច Chatbot កូនទី២'
      : isKonBong
      ? 'ស៊ីតិច Roastbot កូនច្បង'
      : 'ស៊ីតិច Roastbot កូនពៅ';
    ctx.fillText(personaTitle, avatarCenterX, 324);

    // Department Pill Badge if exists
    if (currentDept) {
      const deptPillW = 320;
      const deptPillH = 34;
      const deptPillX = avatarCenterX - deptPillW / 2;
      const deptPillY = 344;

      ctx.fillStyle = cardStyle === 'classic' ? 'rgba(212, 175, 55, 0.12)' : 'rgba(138, 110, 39, 0.1)';
      ctx.strokeStyle = goldAccent;
      ctx.lineWidth = 1;
      roundRect(ctx, deptPillX, deptPillY, deptPillW, deptPillH, 17, true, true);

      ctx.font = 'bold 17px "Kantumruy Pro", sans-serif';
      ctx.fillStyle = goldAccent;
      ctx.fillText(currentDept, avatarCenterX, deptPillY + 23);
    }

    // 5. Quotation Mark Accent (Human Typography)
    ctx.font = 'bold 140px Georgia, serif';
    ctx.fillStyle = cardStyle === 'classic' ? 'rgba(212, 175, 55, 0.15)' : 'rgba(13, 56, 34, 0.1)';
    ctx.textAlign = 'left';
    ctx.fillText('“', 88, 470);

    // 6. Main Quote Content Body
    const contentTopLimit = currentDept ? 398 : 360;
    const contentBottomLimit = 870;
    const availableHeight = contentBottomLimit - contentTopLimit;
    const maxWidth = width - 180;

    const fitResult = autoFitQuoteText(ctx, currentText, maxWidth, availableHeight);
    const { size, lineHeight, paraGap, lines, totalHeight } = fitResult;

    const startY = Math.max(
      contentTopLimit + 20,
      contentTopLimit + (availableHeight - totalHeight) / 2
    );

    ctx.font = `bold ${size}px "Kantumruy Pro", "Battambang", sans-serif`;
    ctx.textAlign = 'center';

    let currentY = startY;
    for (let i = 0; i < lines.length; i++) {
      const item = lines[i];
      if (item.isNewPara) currentY += paraGap;

      const trimmed = item.text.trim();
      const isEnglish = /^[A-Za-z0-9#\s.,!?:;"'()|/\\-]+$/.test(trimmed);
      const isTag = trimmed.startsWith('#');

      if (isTag) {
        ctx.fillStyle = goldAccent;
        ctx.font = `bold ${Math.max(14, size - 4)}px "Kantumruy Pro", sans-serif`;
      } else if (isEnglish) {
        ctx.fillStyle = textSub;
        ctx.font = `normal ${Math.max(15, size - 2)}px "Kantumruy Pro", Georgia, sans-serif`;
      } else {
        ctx.fillStyle = textColor;
        ctx.font = `bold ${size}px "Kantumruy Pro", "Battambang", sans-serif`;
      }

      ctx.fillText(trimmed, width / 2, currentY + size * 0.9);
      currentY += lineHeight;
    }

    // 7. Divider Line
    const divY = 896;
    ctx.strokeStyle = accentBorder;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(140, divY);
    ctx.lineTo(width - 140, divY);
    ctx.stroke();

    // 8. Footer Section: Human Editorial Signature
    ctx.font = 'bold 18px "Kantumruy Pro", sans-serif';
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.fillText('វិទ្យាស្ថានស៊ីតិច • SETEC TROLL MEME & ROASTBOT', width / 2, 940);

    ctx.font = 'normal 15px "Kantumruy Pro", sans-serif';
    ctx.fillStyle = textSub;
    ctx.fillText('រៀបចំដោយ Rotana NOB • troll-setec-chatbot.web.app', width / 2, 970);
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
      setCurrentText(sanitizeQuote(quoteText) || '');
      setCurrentDept('');
      return;
    }

    const filtered = VIRAL_TROLL_QUOTES.filter((q) => q.category === catKey);
    if (filtered.length > 0) {
      const randomItem = filtered[Math.floor(Math.random() * filtered.length)];
      setCurrentText(`${randomItem.quoteKh}\n\n${randomItem.quoteEn}\n\n${randomItem.tags.join(' ')}`);
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
    setCurrentText(`${randomItem.quoteKh}\n\n${randomItem.quoteEn}\n\n${randomItem.tags.join(' ')}`);
    setCurrentDept(randomItem.department);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none animate-fade-in font-['Kantumruy_Pro',sans-serif]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md sm:max-w-lg rounded-2xl sm:rounded-3xl p-5 border border-[#25613e] bg-[#0d3822] text-[#fbf8f2] shadow-2xl shadow-black/80 relative overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1c4d32]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl overflow-hidden border-2 border-[#fbf8f2] shadow-sm shrink-0">
              <img
                src={resolvedLogoUrl}
                alt="SETEC"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '/img/logo.jpg';
                }}
              />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-[#fbf8f2] flex items-center gap-1.5">
                <span>កាតសម្រង់សម្ដី Troll ស៊ីតិច</span>
              </h3>
              <p className="text-[10px] text-[#d7ccb7] font-medium">
                រៀបចំជាកាតរូបភាពបែបមនុស្សសម្រាប់ចែករំលែក Story
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

        {/* Preset Category Switcher */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none">
          {quoteText && (
            <button
              type="button"
              onClick={() => selectCategoryQuote('current')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition cursor-pointer flex items-center gap-1 ${
                activeCategory === 'current'
                  ? 'bg-[#fbf8f2] text-[#0d3822] shadow-sm border border-[#e4d9c4]'
                  : 'bg-[#124229] border border-[#235e3c] text-[#d7ccb7] hover:text-[#fbf8f2]'
              }`}
            >
              <i className="fas fa-message text-[10px]"></i>
              <span>សារនេះ</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => selectCategoryQuote('it_cs')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition cursor-pointer flex items-center gap-1 ${
              activeCategory === 'it_cs'
                ? 'bg-[#fbf8f2] text-[#0d3822] shadow-sm border border-[#e4d9c4]'
                : 'bg-[#124229] border border-[#235e3c] text-[#d7ccb7] hover:text-[#fbf8f2]'
            }`}
          >
            <i className="fas fa-laptop-code text-[10px]"></i>
            <span>IT និង CS</span>
          </button>

          <button
            type="button"
            onClick={() => selectCategoryQuote('interior')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition cursor-pointer flex items-center gap-1 ${
              activeCategory === 'interior'
                ? 'bg-[#fbf8f2] text-[#0d3822] shadow-sm border border-[#e4d9c4]'
                : 'bg-[#124229] border border-[#235e3c] text-[#d7ccb7] hover:text-[#fbf8f2]'
            }`}
          >
            <i className="fas fa-couch text-[10px]"></i>
            <span>Interior</span>
          </button>

          <button
            type="button"
            onClick={() => selectCategoryQuote('graphic')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition cursor-pointer flex items-center gap-1 ${
              activeCategory === 'graphic'
                ? 'bg-[#fbf8f2] text-[#0d3822] shadow-sm border border-[#e4d9c4]'
                : 'bg-[#124229] border border-[#235e3c] text-[#d7ccb7] hover:text-[#fbf8f2]'
            }`}
          >
            <i className="fas fa-palette text-[10px]"></i>
            <span>Graphic</span>
          </button>

          <button
            type="button"
            onClick={() => selectCategoryQuote('campus')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition cursor-pointer flex items-center gap-1 ${
              activeCategory === 'campus'
                ? 'bg-[#fbf8f2] text-[#0d3822] shadow-sm border border-[#e4d9c4]'
                : 'bg-[#124229] border border-[#235e3c] text-[#d7ccb7] hover:text-[#fbf8f2]'
            }`}
          >
            <i className="fas fa-graduation-cap text-[10px]"></i>
            <span>ជីវិតស៊ីតិច</span>
          </button>

          <button
            type="button"
            onClick={handleRandomQuote}
            className="px-3 py-1.5 rounded-full text-xs font-bold shrink-0 bg-[#124229] text-[#fbf8f2] hover:bg-[#164a2f] border border-[#235e3c] transition cursor-pointer flex items-center gap-1"
            title="ប្តូរ Quote ចៃដន្យថ្មី"
          >
            <i className="fas fa-dice text-[11px]"></i>
            <span>ចៃដន្យ</span>
          </button>
        </div>

        {/* Visual Style Selector & Live Edit Toggle */}
        <div className="flex items-center justify-between pb-2 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#d7ccb7] font-bold">ពណ៌កាត៖</span>
            <button
              type="button"
              onClick={() => setCardStyle('classic')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                cardStyle === 'classic'
                  ? 'bg-[#fbf8f2] text-[#0d3822] shadow border border-[#e4d9c4]'
                  : 'bg-[#124229] text-[#d7ccb7] hover:text-[#fbf8f2] border border-[#235e3c]'
              }`}
            >
              បៃតងដិត
            </button>
            <button
              type="button"
              onClick={() => setCardStyle('milk')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                cardStyle === 'milk'
                  ? 'bg-[#fbf8f2] text-[#0d3822] shadow border border-[#e4d9c4]'
                  : 'bg-[#124229] text-[#d7ccb7] hover:text-[#fbf8f2] border border-[#235e3c]'
              }`}
            >
              ទឹកដោះគោ
            </button>
            <button
              type="button"
              onClick={() => setCardStyle('paper')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                cardStyle === 'paper'
                  ? 'bg-[#fbf8f2] text-[#0d3822] shadow border border-[#e4d9c4]'
                  : 'bg-[#124229] text-[#d7ccb7] hover:text-[#fbf8f2] border border-[#235e3c]'
              }`}
            >
              ក្រដាសបុរាណ
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="text-[10.5px] font-bold text-[#0d3822] bg-[#fbf8f2] hover:bg-[#eee6d5] flex items-center gap-1 transition px-2.5 py-1 rounded-lg border border-[#e4d9c4] active:scale-95 cursor-pointer shrink-0 shadow-xs"
            title="ចុចដើម្បីកែប្រែពាក្យក្នុង Quote ដោយផ្ទាល់"
          >
            <i className="fas fa-pen-to-square text-[9.5px]"></i>
            <span>{isEditing ? 'បិទការកែ' : 'កែ Caption'}</span>
          </button>
        </div>

        {/* Live Inline Textarea Editor */}
        {isEditing && (
          <div className="mb-3 animate-fade-in">
            <textarea
              value={currentText}
              onChange={(e) => setCurrentText(e.target.value)}
              rows={3}
              className="w-full bg-[#124229] border border-[#235e3c] rounded-xl p-2.5 text-xs text-[#fbf8f2] placeholder-[#8da698] focus:outline-none focus:ring-1 focus:ring-[#fbf8f2] font-sans leading-relaxed"
              placeholder="វាយអត្ថបទ Quote ឬ Caption ផ្ទាល់ខ្លួនរបស់អ្នកនៅទីនេះ..."
            />
          </div>
        )}

        {/* Live Canvas Preview */}
        <div className="w-full aspect-square rounded-2xl overflow-hidden border border-[#235e3c] bg-[#071f13] flex items-center justify-center mb-3 shadow-inner relative group">
          <canvas ref={canvasRef} className="w-full h-full object-contain" />
          <div className="absolute top-2 right-2 px-2.5 py-1 rounded-md bg-[#092818]/90 text-[10px] text-[#fbf8f2] font-bold backdrop-blur-sm pointer-events-none border border-[#1c4d32]">
            1080 x 1080 HD
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleDownload}
            disabled={isGenerating}
            className="flex-1 py-3 rounded-xl bg-[#fbf8f2] hover:bg-[#eee6d5] active:bg-[#e4dbca] text-[#0d3822] font-bold text-xs transition active:scale-95 shadow-md flex items-center justify-center gap-2 cursor-pointer border border-[#e4d9c4]"
          >
            <i className="fas fa-download text-[#0d3822]"></i>
            <span>{isGenerating ? 'កំពុងទាញយក...' : 'ទាញយក PNG កម្រិតច្បាស់'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="px-4 py-3 rounded-xl bg-transparent hover:bg-[#15462c] text-[#fbf8f2] font-bold text-xs transition active:scale-95 border border-[#2d6c46] flex items-center gap-1.5 cursor-pointer"
          >
            <i className={`fas ${copied ? 'fa-check text-[#fbf8f2]' : 'fa-copy'}`}></i>
            <span>{copied ? 'បានចម្លង' : 'Copy Caption'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
