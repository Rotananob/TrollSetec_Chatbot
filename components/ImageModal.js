'use client';

export default function ImageModal({ isOpen, imageUrl, caption, onClose }) {
  if (!isOpen || !imageUrl) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in font-['Kantumruy_Pro',sans-serif]"
    >
      <div className="relative max-w-2xl w-full bg-[#0d3822] border border-[#25613e] rounded-3xl p-4 sm:p-5 shadow-2xl overflow-hidden flex flex-col items-center">
        <button
          onClick={onClose}
          type="button"
          className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-[#14472c] hover:bg-[#1a5535] text-[#d7ccb7] hover:text-[#fbf8f2] border border-[#276a44] flex items-center justify-center text-xs z-10 transition cursor-pointer active:scale-95"
          title="បិទ"
        >
          <i className="fas fa-times"></i>
        </button>

        <div className="w-full max-h-[70vh] flex items-center justify-center overflow-hidden rounded-2xl bg-[#082215] border border-[#1c4d32] mb-3">
          <img
            src={imageUrl}
            alt="Full size view"
            className="max-h-[70vh] max-w-full object-contain rounded-2xl shadow-md"
          />
        </div>

        {caption && (
          <p className="text-[#fbf8f2] text-xs sm:text-sm font-semibold text-center px-4 mb-3">
            {caption}
          </p>
        )}

        <div className="flex items-center gap-3 w-full justify-center">
          <a
            href={imageUrl}
            download="meme.jpg"
            target="_blank"
            rel="noreferrer"
            className="px-5 py-2.5 rounded-xl bg-[#fbf8f2] hover:bg-[#eee6d5] active:bg-[#e4dbca] text-[#0d3822] font-bold text-xs flex items-center gap-2 shadow-md transition border border-[#e4d9c4] cursor-pointer active:scale-95"
          >
            <i className="fas fa-download"></i> <span>ទាញយករូបភាព</span>
          </a>
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2.5 rounded-xl bg-[#14472c] hover:bg-[#1a5535] text-[#fbf8f2] border border-[#276a44] font-bold text-xs transition cursor-pointer active:scale-95"
          >
            បិទ
          </button>
        </div>
      </div>
    </div>
  );
}
