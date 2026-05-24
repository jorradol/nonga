import { useCallback, useEffect, useRef } from "react";

/** สูงบรรทัดเดียวกับ textarea (leading + py-2) */
export const CHAT_TEXTAREA_LINE_HEIGHT_PX = 22;
const PADDING_Y_PX = 16;
const MAX_LINES = 3;

export const CHAT_TEXTAREA_MIN_HEIGHT_PX =
  CHAT_TEXTAREA_LINE_HEIGHT_PX + PADDING_Y_PX;
export const CHAT_TEXTAREA_MAX_HEIGHT_PX =
  CHAT_TEXTAREA_LINE_HEIGHT_PX * MAX_LINES + PADDING_Y_PX;

export function useChatTextareaAutosize(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const adjust = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = `${CHAT_TEXTAREA_MIN_HEIGHT_PX}px`;
    const scrollH = el.scrollHeight;
    const next = Math.min(
      Math.max(scrollH, CHAT_TEXTAREA_MIN_HEIGHT_PX),
      CHAT_TEXTAREA_MAX_HEIGHT_PX
    );
    el.style.height = `${next}px`;
    el.style.overflowY =
      scrollH > CHAT_TEXTAREA_MAX_HEIGHT_PX ? "auto" : "hidden";
  }, []);

  useEffect(() => {
    adjust();
  }, [value, adjust]);

  const reset = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = `${CHAT_TEXTAREA_MIN_HEIGHT_PX}px`;
    el.style.overflowY = "hidden";
  }, []);

  return { ref, adjust, reset };
}
