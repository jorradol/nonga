import { useCallback, useEffect, useRef } from "react";

const LINE_HEIGHT_PX = 22;
const VERTICAL_PADDING_PX = 32;
const MAX_LINES = 3;

export function useChatTextareaAutosize(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const adjust = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const maxHeight = LINE_HEIGHT_PX * MAX_LINES + VERTICAL_PADDING_PX;
    const next = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, []);

  useEffect(() => {
    adjust();
  }, [value, adjust]);

  const reset = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.overflowY = "hidden";
  }, []);

  return { ref, adjust, reset };
}
