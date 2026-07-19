/**
 * Chat Experience V2 — Vehicle Workspace as an overlay sheet (below xl).
 * Tablet: right side sheet (capped width). Mobile: full-width/full-height
 * sheet with safe-area padding. Accessibility: dialog semantics, Escape,
 * backdrop close, focus trap, focus return handled by the adapter.
 */
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { ChatCarCardData } from "../../types";
import { useChatV2FocusTrap } from "./adapters/useChatV2FocusTrap";
import {
  CHAT_V2_WORKSPACE_EMPTY_TITLE,
  CHAT_V2_WORKSPACE_RESULTS_TITLE,
  ChatV2WorkspaceBody,
} from "./ChatV2VehicleWorkspace";

interface ChatV2MobileVehicleSheetProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: ChatCarCardData[];
  hasMoreCars: boolean;
  isLoading: boolean;
}

export function ChatV2MobileVehicleSheet({
  isOpen,
  onClose,
  vehicles,
  hasMoreCars,
  isLoading,
}: ChatV2MobileVehicleSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useChatV2FocusTrap(sheetRef, isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => closeButtonRef.current?.focus());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const count = vehicles.length;
  const title =
    count > 0
      ? `${CHAT_V2_WORKSPACE_RESULTS_TITLE} ${count.toLocaleString("th-TH")} คัน`
      : CHAT_V2_WORKSPACE_EMPTY_TITLE;

  return (
    <div className="xl:hidden" data-testid="chat-v2-vehicle-sheet-root">
      <div
        className="fixed inset-0 z-[45] bg-black/60"
        onClick={onClose}
        aria-hidden="true"
        data-testid="chat-v2-vehicle-sheet-backdrop"
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed top-0 bottom-0 right-0 z-50 w-full sm:max-w-[420px] max-h-[100dvh] pb-[env(safe-area-inset-bottom)] bg-(--nonga-bg-app) border-l border-(--nonga-border) shadow-2xl flex flex-col min-h-0 transition-transform duration-200 ease-out motion-reduce:transition-none"
        data-testid="chat-v2-vehicle-sheet"
      >
        <div className="h-12 px-3 border-b border-(--nonga-border) flex items-center justify-between gap-2 shrink-0">
          <h3 className="text-[13px] font-bold nonga-text-primary truncate">{title}</h3>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="min-w-11 min-h-11 p-2 rounded-lg nonga-text-secondary hover:bg-(--nonga-bg-subtle) hover:text-orange-600 dark:hover:text-orange-400 transition-colors motion-reduce:transition-none cursor-pointer nonga-focus-ring"
            aria-label="ปิดพื้นที่เลือกรถ"
            title="ปิดพื้นที่เลือกรถ"
            data-testid="chat-v2-vehicle-sheet-close"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
        <ChatV2WorkspaceBody
          vehicles={vehicles}
          hasMoreCars={hasMoreCars}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
