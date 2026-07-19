/**
 * Chat UI Phase D1 — responsive Vehicle Results Panel.
 *
 * - xl and up: inline right column beside the conversation
 * - below xl: right side sheet (full width on phones, capped on tablet)
 *   with backdrop, Escape-to-close, and safe-area padding
 *
 * Cards reuse the existing ChatCarCard presentation. No dealer-contact or
 * lead actions are added; data comes only from real marketplace carCards
 * already attached to the conversation.
 */
import { useEffect, useRef } from "react";
import { Car, Sparkles, X } from "lucide-react";
import type { ChatCarCardData } from "../../types";
import type { VehiclePanelViewState } from "../../hooks/chat/useVehiclePanel";
import { ChatCarCard } from "./ChatCarCard";

interface ChatVehiclePanelProps {
  vehicles: ChatCarCardData[];
  viewState: VehiclePanelViewState;
  hasMoreCars: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export function ChatVehiclePanel({
  vehicles,
  viewState,
  hasMoreCars,
  isOpen,
  onClose,
}: ChatVehiclePanelProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Escape closes the panel (drawer/sheet convention below xl; harmless inline).
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  // Move focus into the panel when it opens (screen reader / keyboard entry).
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => closeButtonRef.current?.focus());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const countLabel = `${vehicles.length.toLocaleString("th-TH")} คัน`;

  return (
    <>
      {/* Backdrop for the overlay modes below xl only */}
      <div
        className="fixed inset-0 z-[45] bg-black/60 backdrop-blur-xs xl:hidden"
        onClick={onClose}
        aria-hidden="true"
        id="vehicle-panel-overlay"
      />
      <aside
        role="complementary"
        aria-label={`รถที่พบ ${countLabel}`}
        id="chat-vehicle-panel"
        data-testid="chat-vehicle-panel"
        data-view-state={viewState}
        className="max-xl:fixed max-xl:top-0 max-xl:bottom-0 max-xl:right-0 max-xl:z-50 max-xl:w-full sm:max-xl:max-w-[420px] max-xl:max-h-[100dvh] max-xl:pb-[env(safe-area-inset-bottom)] max-xl:shadow-2xl xl:static xl:shrink-0 xl:w-[340px] 2xl:w-[380px] xl:h-full border-l border-(--nonga-border)/80 bg-(--nonga-bg-app)/95 backdrop-blur-xl flex flex-col min-h-0 transition-transform duration-300 ease-in-out motion-reduce:transition-none"
      >
        <div
          className="h-12 md:h-14 px-3 border-b border-(--nonga-border)/80 flex items-center justify-between gap-2 shrink-0"
          id="vehicle-panel-header"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Car className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" aria-hidden="true" />
            <h3 className="text-sm font-bold nonga-text-primary truncate">รถที่พบ</h3>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/30 shrink-0"
              data-testid="vehicle-panel-count"
            >
              {countLabel}
            </span>
            {viewState === "loading" && (
              <span
                className="flex items-center gap-1 text-[10px] nonga-text-muted shrink-0"
                data-testid="vehicle-panel-loading"
                role="status"
              >
                <Sparkles className="w-3 h-3 animate-spin motion-reduce:animate-none text-orange-500" aria-hidden="true" />
                กำลังค้นหา...
              </span>
            )}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="nonga-text-secondary hover:text-slate-900 hover:bg-slate-200 dark:hover:text-white dark:hover:bg-slate-800 min-w-9 min-h-9 p-1.5 rounded-lg transition-colors shrink-0 nonga-focus-ring cursor-pointer"
            aria-label="ปิดแผงรถที่พบ"
            title="ปิดแผงรถที่พบ"
            data-testid="vehicle-panel-close"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-3 scrollbar-thin"
          id="chat-vehicle-panel-list"
        >
          {vehicles.map((car) => (
            <div key={car.id} className="w-full min-w-0 max-w-full">
              <ChatCarCard car={car} />
            </div>
          ))}

          {hasMoreCars && (
            <p
              className="text-[11px] nonga-text-muted rounded-lg border border-(--nonga-border) bg-(--nonga-bg-surface)/60 px-2.5 py-2 leading-relaxed"
              data-testid="vehicle-panel-has-more-hint"
            >
              ยังมีรถเพิ่มเติมในผลค้นหา — พิมพ์ “ดูเพิ่ม” ในแชทเพื่อดูรายการถัดไปครับ
            </p>
          )}

          <p className="text-[10px] nonga-text-muted leading-relaxed px-0.5">
            ข้อมูลจากประกาศจริงในระบบ ราคาและสถานะอาจเปลี่ยนแปลงได้ ตรวจสอบล่าสุดได้จากหน้ารายละเอียดรถ
          </p>
        </div>
      </aside>
    </>
  );
}
