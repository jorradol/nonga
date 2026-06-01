import { useEffect } from "react";

const CSS_VAR = "--chat-vv-bottom-inset";
const MOBILE_MQ = "(max-width: 767px)";

/**
 * Sets --chat-vv-bottom-inset from Visual Viewport API so fixed mobile composer
 * stays above the on-screen keyboard (iOS Safari / Chrome Android).
 */
export function useChatMobileViewportInset(): void {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const vv = window.visualViewport;
    const mq = window.matchMedia(MOBILE_MQ);
    if (!vv) return;

    const sync = () => {
      if (!mq.matches) {
        document.documentElement.style.removeProperty(CSS_VAR);
        return;
      }
      const inset = Math.max(
        0,
        Math.round(window.innerHeight - vv.height - vv.offsetTop)
      );
      document.documentElement.style.setProperty(CSS_VAR, `${inset}px`);
    };

    const onChange = () => sync();

    sync();
    vv.addEventListener("resize", onChange);
    vv.addEventListener("scroll", onChange);
    window.addEventListener("orientationchange", onChange);
    mq.addEventListener("change", onChange);

    return () => {
      vv.removeEventListener("resize", onChange);
      vv.removeEventListener("scroll", onChange);
      window.removeEventListener("orientationchange", onChange);
      mq.removeEventListener("change", onChange);
      document.documentElement.style.removeProperty(CSS_VAR);
    };
  }, []);
}
