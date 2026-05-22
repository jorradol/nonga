import React, { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from "lucide-react";

interface FullscreenImageViewerProps {
  isOpen: boolean;
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSelectIndex: (index: number) => void;
}

export default function FullscreenImageViewer({
  isOpen,
  images,
  currentIndex,
  onClose,
  onPrev,
  onNext,
  onSelectIndex,
}: FullscreenImageViewerProps) {
  // Prevent body scrolling when lightbox is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Handle keyboard events (ESC, Left, Right Arrow)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, onPrev, onNext]);

  if (!isOpen) return null;

  const currentImage = images[currentIndex] || "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex flex-col justify-between bg-black/95 backdrop-blur-md select-none touch-none">
        {/* Top Control Bar */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/60 to-transparent relative z-10"
        >
          <div className="text-white font-mono text-xs font-semibold">
            ภาพที่ <span className="text-orange-500 font-bold">{currentIndex + 1}</span> จาก {images.length}
          </div>
          <div className="flex items-center gap-3">
            <a
              href={currentImage}
              target="_blank"
              rel="noreferrer"
              className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all"
              title="ดาวน์โหลดภาพแยก"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-2.5 rounded-full bg-orange-600 hover:bg-orange-700 text-white cursor-pointer hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-lg"
              aria-label="ปิดมุมมองเต็มหน้าจอ"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.header>

        {/* Content Body: Image and Arrow buttons */}
        <div className="relative flex-1 flex items-center justify-center px-4 sm:px-12">
          {/* Left Arrow Button */}
          {images.length > 1 && (
            <button
              onClick={onPrev}
              className="absolute left-4 sm:left-8 z-10 p-3 sm:p-4 rounded-xl bg-white/5 hover:bg-white/10 active:bg-orange-600 border border-white/5 text-white/80 hover:text-white hover:border-orange-500/25 transition-all shadow-xl backdrop-blur"
              aria-label="ย้อนกลับ"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Main Display Image */}
          <div className="relative max-w-full max-h-[75vh] flex items-center justify-center overflow-hidden">
            <motion.img
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              src={currentImage}
              alt="พรีวิวรถยนต์แบบขยายเต็มจอ"
              className="max-w-[92vw] max-h-[72vh] md:max-h-[75vh] object-contain rounded-2xl shadow-2xl border border-white/10"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Right Arrow Button */}
          {images.length > 1 && (
            <button
              onClick={onNext}
              className="absolute right-4 sm:right-8 z-10 p-3 sm:p-4 rounded-xl bg-white/5 hover:bg-white/10 active:bg-orange-600 border border-white/5 text-white/80 hover:text-white hover:border-orange-500/25 transition-all shadow-xl backdrop-blur"
              aria-label="ถัดไป"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Bottom Thumbnail Strip for rapid jumping */}
        <motion.footer
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="py-6 px-4 bg-gradient-to-t from-black/80 to-transparent flex flex-col items-center gap-2"
        >
          <div className="flex items-center gap-2 max-w-full overflow-x-auto no-scrollbar py-2">
            {images.map((imgUrl, idx) => (
              <button
                key={idx}
                onClick={() => onSelectIndex(idx)}
                className={`flex-none w-14 h-10 sm:w-18 sm:h-12 rounded-lg overflow-hidden border-2 transition-all ${
                  currentIndex === idx 
                    ? "border-orange-500 scale-105 shadow-md shadow-orange-600/20" 
                    : "border-transparent opacity-40 hover:opacity-75"
                }`}
              >
                <img
                  src={imgUrl}
                  alt={`Thumbnail ${idx}`}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </button>
            ))}
          </div>
        </motion.footer>
      </div>
    </AnimatePresence>
  );
}
