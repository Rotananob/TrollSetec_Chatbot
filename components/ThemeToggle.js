'use client';

export default function ThemeToggle({ theme = 'light', onToggle, className = '' }) {
  const isDark = theme === 'dark';

  return (
    <button
      onClick={onToggle}
      type="button"
      className={`relative inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full border transition-all duration-300 font-bold cursor-pointer select-none active:scale-95 shadow-xs ${
        isDark
          ? 'bg-slate-900/90 text-amber-300 border-slate-700/80 hover:bg-slate-800 hover:border-amber-400/50 shadow-amber-500/10'
          : 'bg-white/95 text-amber-500 border-slate-200/90 hover:bg-slate-50 hover:border-amber-400/50 shadow-slate-200/50'
      } ${className}`}
      title={isDark ? 'ប្ដូរទៅ Light Mode' : 'ប្ដូរទៅ Dark Mode'}
      aria-label="Toggle Dark/Light Mode"
    >
      {isDark ? (
        <i className="fas fa-moon text-amber-300 text-xs sm:text-sm transition-transform duration-300 hover:rotate-12"></i>
      ) : (
        <i className="fas fa-sun text-amber-500 text-xs sm:text-sm transition-transform duration-300 hover:rotate-45"></i>
      )}
    </button>
  );
}
