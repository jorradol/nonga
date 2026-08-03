/**
 * Chat V2 column resize handle — desktop three-region layout only.
 * Pointer + keyboard accessible separator; no external resize libraries.
 */
import {
  useCallback,
  useRef,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

export type ChatV2ResizeEdge = "sidebar" | "workspace";

export interface ChatV2ResizeHandleProps {
  edge: ChatV2ResizeEdge;
  value: number;
  min: number;
  max: number;
  label: string;
  onValueChange: (next: number) => void;
  step?: number;
  largeStep?: number;
  disabled?: boolean;
}

export function ChatV2ResizeHandle({
  edge,
  value,
  min,
  max,
  label,
  onValueChange,
  step = 8,
  largeStep = 32,
  disabled = false,
}: ChatV2ResizeHandleProps) {
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startValueRef = useRef(0);
  const valueRef = useRef(value);
  const pointerIdRef = useRef<number | null>(null);
  valueRef.current = value;

  const clamp = useCallback(
    (n: number) => Math.min(max, Math.max(min, n)),
    [min, max]
  );

  const applyDelta = useCallback(
    (clientX: number) => {
      const delta = clientX - startXRef.current;
      // Sidebar handle sits on the right edge: drag right → wider.
      // Workspace handle sits on the left edge: drag left → wider.
      const signed = edge === "sidebar" ? delta : -delta;
      onValueChange(clamp(startValueRef.current + signed));
    },
    [clamp, edge, onValueChange]
  );

  const endDrag = useCallback((target: HTMLElement, pointerId: number) => {
    draggingRef.current = false;
    pointerIdRef.current = null;
    target.classList.remove("is-dragging");
    document.body.style.removeProperty("cursor");
    document.body.style.removeProperty("user-select");
    try {
      target.releasePointerCapture(pointerId);
    } catch {
      /* already released */
    }
  }, []);

  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (disabled || e.button !== 0) return;
      e.preventDefault();
      draggingRef.current = true;
      pointerIdRef.current = e.pointerId;
      startXRef.current = e.clientX;
      startValueRef.current = value;
      e.currentTarget.setPointerCapture(e.pointerId);
      e.currentTarget.classList.add("is-dragging");
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [disabled, value]
  );

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current || pointerIdRef.current !== e.pointerId) return;
      e.preventDefault();
      applyDelta(e.clientX);
    },
    [applyDelta]
  );

  const onPointerUp = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (pointerIdRef.current !== e.pointerId) return;
      endDrag(e.currentTarget, e.pointerId);
    },
    [endDrag]
  );

  const onPointerCancel = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (pointerIdRef.current !== e.pointerId) return;
      endDrag(e.currentTarget, e.pointerId);
    },
    [endDrag]
  );

  const onLostPointerCapture = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      pointerIdRef.current = null;
      e.currentTarget.classList.remove("is-dragging");
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
    },
    []
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      const amount = e.shiftKey ? largeStep : step;
      let next: number | null = null;

      if (edge === "sidebar") {
        if (e.key === "ArrowRight") next = valueRef.current + amount;
        else if (e.key === "ArrowLeft") next = valueRef.current - amount;
      } else {
        // Workspace handle on the left edge: ArrowLeft widens toward chat.
        if (e.key === "ArrowLeft") next = valueRef.current + amount;
        else if (e.key === "ArrowRight") next = valueRef.current - amount;
      }

      if (next == null) return;
      e.preventDefault();
      const capped = clamp(next);
      valueRef.current = capped;
      onValueChange(capped);
    },
    [clamp, disabled, edge, largeStep, onValueChange, step]
  );

  if (disabled) return null;

  const positionClass =
    edge === "sidebar"
      ? "right-0 translate-x-1/2"
      : "left-0 -translate-x-1/2";

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      data-testid={
        edge === "sidebar"
          ? "chat-v2-sidebar-resize-handle"
          : "chat-v2-workspace-resize-handle"
      }
      data-edge={edge}
      className={`chat-v2-resize-handle absolute top-0 bottom-0 z-20 w-3 ${positionClass} flex items-stretch justify-center cursor-col-resize touch-none select-none outline-none group/resize nonga-focus-ring rounded-sm focus-visible:ring-2 focus-visible:ring-orange-500/70 focus-visible:ring-offset-1 focus-visible:ring-offset-(--nonga-bg-app)`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onLostPointerCapture={onLostPointerCapture}
      onKeyDown={onKeyDown}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none my-auto h-10 w-0.5 rounded-full bg-(--nonga-border-strong) opacity-40 transition-opacity motion-reduce:transition-none group-hover/resize:opacity-90 group-hover/resize:bg-orange-500/70 group-focus-visible/resize:opacity-100 group-focus-visible/resize:bg-orange-500 [.is-dragging_&]:opacity-100 [.is-dragging_&]:bg-orange-500"
      />
    </div>
  );
}
