'use client';

export default function ThemeToggle({ theme = 'light', onToggle, className = '' }) {
  const isDark = theme === 'dark';

  return (
    <button
      onClick={onToggle}
      type="button"
      className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all duration-300 text-xs font-bold cursor-pointer select-none shadow-md ${
        isDark
          ? 'bg-slate-900/90 text-amber-300 border-slate-700 hover:border-amber-400/50 hover:bg-slate-800'
          : 'bg-white/95 text-indigo-700 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/80 shadow-indigo-100'
      } ${className}`}
      title={isDark ? 'ប្ដូរទៅ Light Mode' : 'ប្ដូរទៅ Dark Mode'}
      aria-label="Toggle Dark/Light Mode"
    >
      {isDark ? (
        <i className="fas fa-moon text-amber-300 text-sm"></i>
      ) : (
        <i className="fas fa-sun text-amber-500 text-sm"></i>
      )}
      <span className="text-[11px] font-extrabold uppercase tracking-wider">
        {isDark ? 'Dark' : 'Light'}
      </span>
    </button>
  );
}
