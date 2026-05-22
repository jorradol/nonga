import React, { useState, useRef, useCallback } from "react";
import { motion } from "motion/react";
import { Maximize2, Sparkles, Image as ImageIcon } from "lucide-react";
import FullscreenImageViewer from "./FullscreenImageViewer";

interface HeroGalleryProps {
  images: string[];
  title: string;
  brand: string;
  isEv?: boolean;
}

export default function HeroGallery({ images, title, brand, isEv = false }: HeroGalleryProps) {
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollYRef = useRef(0);

  // Absolute fallback in case images is empty
  const galleryList = images && images.length > 0 
    ? images 
    : ["https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=1200"];

  const handleOpenFullscreen = (index: number) => {
    scrollYRef.current = window.scrollY;
    setCurrentIndex(index);
    setFullscreenOpen(true);
  };

  const handleCloseFullscreen = useCallback(() => {
    setFullscreenOpen(false);
    const y = scrollYRef.current;
    requestAnimationFrame(() => {
      window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior });
    });
  }, []);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? galleryList.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === galleryList.length - 1 ? 0 : prev + 1));
  };

  // Construct gorgeous layouts based on count
  const renderGalleryGrid = () => {
    const mainImg = galleryList[0];
    const isSingleImage = galleryList.length === 1;

    if (isSingleImage) {
      return (
        <div className="relative aspect-[16/9] w-full rounded-3xl overflow-hidden border border-white/[0.08] shadow-2xl bg-slate-950 group">
          <img
            src={mainImg}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-103"
            referrerPolicy="no-referrer"
            loading="eager"
          />
          {/* Accent Overlays */}
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-end p-6" />
          <button
            onClick={() => handleOpenFullscreen(0)}
            className="absolute bottom-6 right-6 flex items-center gap-2 px-4.5 py-2.5 bg-black/75 hover:bg-orange-600 hover:text-white border border-white/10 text-slate-200 rounded-xl text-xs font-semibold shadow-xl backdrop-blur transition-all duration-300 transform group-hover:translate-y-[-2px] hover:scale-105 active:scale-95"
          >
            <Maximize2 className="w-3.5 h-3.5 text-orange-500" />
            <span>ขยายรูปขนาดเต็ม</span>
          </button>
        </div>
      );
    }

    const secondaryImgs = galleryList.slice(1, 4); // Show up to 3 thumbnails on the right
    const remainingCount = galleryList.length - 4;

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 aspect-[16/9] md:aspect-[21/9] w-full">
        {/* Large Primary Image Hero Anchor */}
        <div className="md:col-span-3 relative rounded-3xl overflow-hidden border border-white/[0.08] bg-slate-950 shadow-xl group cursor-pointer" onClick={() => handleOpenFullscreen(0)}>
          <img
            src={mainImg}
            alt={`${title} - ภาพมุมหน้าหลัก`}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-102"
            referrerPolicy="no-referrer"
            loading="eager"
          />
          <div className="absolute top-4 left-4 flex gap-2">
            <span className="px-3 py-1 rounded-xl text-[10px] font-bold bg-orange-600 border border-orange-500/30 text-white flex items-center gap-1 shadow-md">
              <Sparkles className="w-3 h-3 animate-pulse" /> RECOMMENDED
            </span>
            {isEv && (
              <span className="px-3 py-1 rounded-xl text-[10px] font-bold bg-black/60 border border-teal-500/30 text-teal-400 flex items-center gap-1 shadow-md">
                ⚡ ELECTRIC VEHICLE
              </span>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleOpenFullscreen(0);
            }}
            className="absolute bottom-5 right-5 flex items-center gap-1.5 px-3.5 py-2.5 bg-black/70 border border-white/10 text-slate-200 rounded-xl text-xs font-semibold backdrop-blur hover:bg-orange-600 transition-all duration-300"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ดูภาพขนาดเต็ม</span>
          </button>
        </div>

        {/* Thumbnail grid stacks on right */}
        <div className="hidden md:flex flex-col gap-4 justify-between h-full col-span-1">
          {secondaryImgs.map((imgUrl, index) => {
            const actualIndex = index + 1;
            const isLastThumbnail = index === 2 && remainingCount > 0;

            return (
              <div
                key={actualIndex}
                onClick={() => handleOpenFullscreen(actualIndex)}
                className="relative flex-1 rounded-2xl overflow-hidden border border-white/[0.08] cursor-pointer bg-slate-900 group hover:border-orange-500/40 transition-all duration-300"
              >
                <img
                  src={imgUrl}
                  alt={`${title} - ภาพมุม ${actualIndex}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                
                {isLastThumbnail ? (
                  <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center text-white/90">
                    <span className="font-display font-black text-lg text-orange-500">+{remainingCount}</span>
                    <span className="text-[9px] uppercase tracking-wider font-semibold opacity-80">รูปภาพเพิ่มเติม</span>
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <span className="text-[9.5px] font-mono text-white/90 bg-orange-600/90 rounded px-1.5 py-0.5">ภาพ #{actualIndex + 1}</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Quick Stats Summary Strip */}
          {galleryList.length < 4 && (
            <div className="flex-1 rounded-2xl bg-white/[0.01] border border-dashed border-white/10 flex flex-col items-center justify-center p-3 text-center text-slate-500">
              <ImageIcon className="w-5 h-5 text-slate-650 mb-1" />
              <span className="text-[10px] font-sans font-medium line-clamp-1">กล้องคู่ใจรอบคัน สภาพ 5 ดาว</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      {renderGalleryGrid()}

      {/* Fullscreen Viewer Portal */}
      <FullscreenImageViewer
        isOpen={fullscreenOpen}
        images={galleryList}
        currentIndex={currentIndex}
        onClose={handleCloseFullscreen}
        closeLabel="กลับไปหน้ารายละเอียดรถ"
        onPrev={handlePrev}
        onNext={handleNext}
        onSelectIndex={setCurrentIndex}
      />
    </div>
  );
}
