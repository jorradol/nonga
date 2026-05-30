/** Chat session sidebar width prefs (frontend only, /chat view). */

export const CHAT_SIDEBAR_COLLAPSED_KEY = "nonga-chat-sidebar-collapsed";

/** Expanded width on md+ (Tailwind w-52 = 13rem / 208px). */
export const CHAT_SIDEBAR_WIDTH_EXPANDED = "md:w-52";

/** Collapsed icon rail on md+ (Tailwind w-14 = 3.5rem / 56px). */
export const CHAT_SIDEBAR_WIDTH_COLLAPSED = "md:w-14";

/** Mobile drawer width when open (unchanged overlay behavior). */
export const CHAT_SIDEBAR_WIDTH_MOBILE = "w-72";

export function readChatSidebarCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(CHAT_SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeChatSidebarCollapsed(collapsed: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CHAT_SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    /* ignore quota / private mode */
  }
}
