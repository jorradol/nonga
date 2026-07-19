/**
 * Chat Experience V2 — minimal focus trap for modal sheets/drawers.
 * Keyboard: Tab cycles inside the container, Escape closes.
 */
import { useEffect, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function collectFocusable(container: HTMLElement): HTMLElement[] {
  const nodes = container.querySelectorAll(FOCUSABLE_SELECTOR);
  const focusables: HTMLElement[] = [];
  nodes.forEach((node) => {
    if (node instanceof HTMLElement && node.offsetParent !== null) {
      focusables.push(node);
    }
  });
  return focusables;
}

export function useChatV2FocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  isOpen: boolean,
  onClose: () => void
): void {
  useEffect(() => {
    if (!isOpen) return;
    const container = containerRef.current;
    if (!container) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = collectFocusable(container);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !container.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !container.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [containerRef, isOpen, onClose]);
}
