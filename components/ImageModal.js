'use client';

export default function ImageModal({ isOpen, imageUrl, caption, onClose }) {
  if (!isOpen || !imageUrl) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in"
    >
      <div className="relative max-w-2xl w-full bg-slate-900 border border-slate-700 rounded-3xl p-4 shadow-2xl overflow-hidden flex flex-col items-center">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center text-lg z-10 transition"
          title="បិទ"
        >
          <i className="fas fa-times"></i>
        </button>

        <div className="w-full max-h-[70vh] flex items-center justify-center overflow-hidden rounded-2xl bg-black/40 mb-3">
          <img
            src={imageUrl}
            alt="Full size view"
            className="max-h-[70vh] max-w-full object-contain rounded-2xl shadow-lg"
          />
        </div>

        {caption && (
          <p className="text-slate-200 text-xs sm:text-sm font-semibold text-center px-4 mb-3">
            {caption}
          </p>
        )}

        <div className="flex items-center gap-3 w-full justify-center">
          <a
            href={imageUrl}
            download="meme.jpg"
            target="_blank"
            rel="noreferrer"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition"
          >
            <i className="fas fa-download"></i> <span>ទាញយករូបភាព (Download)</span>
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
          >
            បិទ
          </button>
        </div>
      </div>
    </div>
  );
}
