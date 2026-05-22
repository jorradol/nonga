import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ChevronLeft, ChevronRight, Download } from "lucide-react";

interface FullscreenImageViewerProps {
  isOpen: boolean;
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSelectIndex: (index: number) => void;
  /** ข้อความปุ่มปิด — ไม่ navigate ออกจากหน้า detail */
  closeLabel?: string;
}

export default function FullscreenImageViewer({
  isOpen,
  images,
  currentIndex,
  onClose,
  onPrev,
  onNext,
  onSelectIndex,
  closeLabel = "กลับไปหน้ารายละเอียดรถ",
}: FullscreenImageViewerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      closeButtonRef.current?.focus();
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, onPrev, onNext]);

  const currentImage =
    images[currentIndex] ||
    "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800";

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="ดูรูปขยาย"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-md select-none"
          onClick={onClose}
        >
          {/* Top bar — ปิดชัดเจน */}
          <motion.header
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="relative z-20 flex items-center justify-between gap-3 px-3 py-3 sm:px-6 sm:py-4 bg-gradient-to-b from-black/80 to-transparent shrink-0"
            onClick={stop}
          >
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="flex items-center justify-center gap-2 min-h-[44px] px-4 sm:px-5 py-2.5 rounded-xl bg-white/15 hover:bg-orange-600 active:bg-orange-700 border border-white/25 text-white font-bold text-sm sm:text-[15px] shadow-lg transition-colors touch-manipulation"
              aria-label={closeLabel}
            >
              <X className="w-5 h-5 shrink-0" strokeWidth={2.5} />
              <span className="max-w-[52vw] sm:max-w-none truncate sm:whitespace-nowrap">
                {closeLabel}
              </span>
            </button>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <span className="text-white/90 font-mono text-xs font-semibold tabular-nums">
                <span className="text-orange-400">{currentIndex + 1}</span>
                <span className="text-white/50"> / </span>
                {images.length}
              </span>
              <a
                href={currentImage}
                target="_blank"
                rel="noreferrer"
                onClick={stop}
                className="flex items-center justify-center min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 transition-colors touch-manipulation"
                title="เปิดรูปในแท็บใหม่"
                aria-label="ดาวน์โหลดหรือเปิดรูป"
              >
                <Download className="w-5 h-5" />
              </a>
            </div>
          </motion.header>

          {/* รูปหลัก — คลิกพื้นที่มืดรอบรูปเพื่อปิด */}
          <div className="relative flex-1 flex items-center justify-center px-2 sm:px-12 min-h-0">
            {images.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  stop(e);
                  onPrev();
                }}
                className="absolute left-2 sm:left-6 z-20 flex items-center justify-center min-h-[48px] min-w-[48px] p-3 rounded-xl bg-black/50 hover:bg-orange-600 border border-white/15 text-white transition-colors touch-manipulation"
                aria-label="รูปก่อนหน้า"
              >
                <ChevronLeft className="w-7 h-7" />
              </button>
            )}

            <div
              className="relative z-10 flex items-center justify-center max-w-full max-h-full p-2"
              onClick={stop}
            >
              <motion.img
                key={currentIndex}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                src={currentImage}
                alt="รูปรถขยาย"
                className="max-w-[min(92vw,100%)] max-h-[min(68vh,100%)] sm:max-h-[72vh] object-contain rounded-xl sm:rounded-2xl shadow-2xl border border-white/10 pointer-events-none"
                referrerPolicy="no-referrer"
                draggable={false}
              />
            </div>

            {images.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  stop(e);
                  onNext();
                }}
                className="absolute right-2 sm:right-6 z-20 flex items-center justify-center min-h-[48px] min-w-[48px] p-3 rounded-xl bg-black/50 hover:bg-orange-600 border border-white/15 text-white transition-colors touch-manipulation"
                aria-label="รูปถัดไป"
              >
                <ChevronRight className="w-7 h-7" />
              </button>
            )}
          </div>

          {/* แถบล่าง + ปุ่มปิดซ้ำบนมือถือ */}
          <motion.footer
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="relative z-20 shrink-0 py-4 px-3 sm:px-4 bg-gradient-to-t from-black/90 to-transparent flex flex-col items-center gap-3"
            onClick={stop}
          >
            <p className="text-[11px] text-white/50 text-center sm:hidden">
              แตะพื้นหลังมืดหรือกด ESC เพื่อปิด
            </p>
            <button
              type="button"
              onClick={onClose}
              className="sm:hidden w-full max-w-sm min-h-[48px] flex items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-bold text-sm shadow-lg touch-manipulation"
            >
              <X className="w-5 h-5" />
              {closeLabel}
            </button>

            {images.length > 1 && (
              <div className="flex items-center gap-2 max-w-full overflow-x-auto no-scrollbar py-1">
                {images.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSelectIndex(idx)}
                    className={`flex-none w-16 h-11 sm:w-20 sm:h-12 rounded-lg overflow-hidden border-2 transition-all touch-manipulation ${
                      currentIndex === idx
                        ? "border-orange-500 scale-105 shadow-md shadow-orange-600/30"
                        : "border-transparent opacity-45 hover:opacity-80"
                    }`}
                    aria-label={`ดูรูปที่ ${idx + 1}`}
                    aria-current={currentIndex === idx ? "true" : undefined}
                  >
                    <img
                      src={imgUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </button>
                ))}
              </div>
            )}
          </motion.footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
