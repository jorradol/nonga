import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { useChatContext } from "../../contexts/chat/ChatContext";
import { useAppStore } from "../../store";
import { useChatStore } from "../../stores/chat/chatStore";
import {
  addRecentlyViewedCarId,
  saveChatCarContext,
  saveLastSelectedCarId,
} from "../../utils/chatCarContext";
import {
  SIDEBAR_NEW_CARS_ROTATE_MS,
  buildSidebarCarCardFromCar,
  buildSidebarNewCarsQueue,
  sidebarCarIntroLine,
} from "../../utils/chatSidebarNewCarsQueue";

interface ChatSidebarNewCarsSliderProps {
  collapsed: boolean;
  onMobileSidebarClose?: () => void;
}

export function ChatSidebarNewCarsSlider({
  collapsed,
  onMobileSidebarClose,
}: ChatSidebarNewCarsSliderProps) {
  const cars = useAppStore((s) => s.cars);
  const slides = useMemo(() => buildSidebarNewCarsQueue(cars), [cars]);
  const [index, setIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    activeSessionId,
    isGenerating,
    createNewChat,
    selectSession,
  } = useChatContext();
  const addMessage = useChatStore((s) => s.addMessage);

  const slideCount = slides.length;
  const safeIndex = slideCount > 0 ? index % slideCount : 0;
  const current = slideCount > 0 ? slides[safeIndex] : null;

  useEffect(() => {
    setIndex(0);
  }, [slideCount]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleTimer = useCallback(() => {
    clearTimer();
    if (slideCount <= 1) return;
    timerRef.current = setInterval(() => {
      setIndex((prev) => (prev + 1) % slideCount);
    }, SIDEBAR_NEW_CARS_ROTATE_MS);
  }, [clearTimer, slideCount]);

  useEffect(() => {
    scheduleTimer();
    return clearTimer;
  }, [scheduleTimer, clearTimer]);

  const goPrev = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      if (slideCount <= 1) return;
      setIndex((prev) => (prev - 1 + slideCount) % slideCount);
      scheduleTimer();
    },
    [slideCount, scheduleTimer]
  );

  const goNext = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      if (slideCount <= 1) return;
      setIndex((prev) => (prev + 1) % slideCount);
      scheduleTimer();
    },
    [slideCount, scheduleTimer]
  );

  const handleSlideClick = useCallback(async () => {
    if (!current || isGenerating) return;
    const car = cars.find((c) => c.id === current.id);
    if (!car) return;

    let sessionId = activeSessionId;
    if (!sessionId) {
      sessionId = await createNewChat();
      selectSession(sessionId);
    }

    const card = buildSidebarCarCardFromCar(car);
    saveChatCarContext([card], sessionId);
    saveLastSelectedCarId(car.id);
    addRecentlyViewedCarId(car.id);

    await addMessage(sessionId, "ai", sidebarCarIntroLine(car), [card]);

    if (typeof window !== "undefined" && window.innerWidth < 768) {
      onMobileSidebarClose?.();
    }
  }, [
    activeSessionId,
    addMessage,
    cars,
    createNewChat,
    current,
    isGenerating,
    onMobileSidebarClose,
    selectSession,
  ]);

  if (!current) return null;

  if (collapsed) {
    return (
      <div
        className="hidden md:flex shrink-0 px-1.5 pb-2 justify-center"
        id="sidebar-new-cars-collapsed"
      >
        <button
          type="button"
          onClick={() => void handleSlideClick()}
          disabled={isGenerating}
          className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-700/80 bg-gradient-to-b from-slate-800/70 to-slate-950 shadow-md shadow-black/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60 disabled:opacity-50"
          title={`${current.brand} ${current.model}`}
          aria-label={`รถเข้าใหม่ ${current.brand} ${current.model}`}
        >
          <img
            src={current.imageUrl}
            alt=""
            className="w-full h-full object-contain object-center"
            loading="lazy"
            decoding="async"
          />
        </button>
      </div>
    );
  }

  return (
    <div
      className="shrink-0 px-2.5 pb-1.5 max-md:pb-1 md:px-2.5 md:pb-2"
      id="sidebar-new-cars-slider"
      data-slide-count={String(slideCount)}
    >
      <p
        className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 px-0.5"
        id="sidebar-new-cars-title"
      >
        รถเข้าใหม่
      </p>
      <div className="relative rounded-xl overflow-hidden border border-slate-700/70 bg-slate-900/60 shadow-lg shadow-black/25">
        <button
          type="button"
          onClick={() => void handleSlideClick()}
          disabled={isGenerating}
          className="block w-full max-md:aspect-[3/2] max-md:max-h-[108px] max-md:bg-gradient-to-b max-md:from-slate-800/60 max-md:to-slate-950 md:aspect-[16/10] md:max-h-[132px] md:bg-slate-900/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500/50 disabled:opacity-50"
          id="sidebar-new-cars-image-btn"
          aria-label={`ดู ${current.brand} ${current.model} ในแชท`}
        >
          <img
            src={current.imageUrl}
            alt={`${current.brand} ${current.model}`}
            className="w-full h-full max-md:object-contain max-md:object-center md:object-cover"
            loading="lazy"
            decoding="async"
          />
        </button>

        {slideCount > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-1 top-1/2 -translate-y-1/2 p-1 rounded-md bg-black/45 text-white/90 hover:bg-black/60 backdrop-blur-sm transition-colors"
              aria-label="รูปก่อนหน้า"
              id="sidebar-new-cars-prev"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={goNext}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-md bg-black/45 text-white/90 hover:bg-black/60 backdrop-blur-sm transition-colors"
              aria-label="รูปถัดไป"
              id="sidebar-new-cars-next"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
