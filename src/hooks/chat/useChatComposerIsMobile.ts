import { useEffect, useState } from "react";

const MOBILE_COMPOSER_MQ = "(max-width: 767px)";

export function useChatComposerIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(MOBILE_COMPOSER_MQ).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_COMPOSER_MQ);
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return isMobile;
}
