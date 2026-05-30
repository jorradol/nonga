/** Chat session sidebar width prefs (frontend only, /chat view). */

export const CHAT_SIDEBAR_COLLAPSED_KEY = "nonga-chat-sidebar-collapsed";
export const CHAT_SIDEBAR_EXPANDED_WIDTH_KEY = "nonga-chat-sidebar-expanded-width";

/** Collapsed icon rail (px). */
export const CHAT_SIDEBAR_WIDTH_COLLAPSED_PX = 56;

/** Mobile drawer width — Tailwind w-72 (px). */
export const CHAT_SIDEBAR_WIDTH_MOBILE_PX = 288;
export const CHAT_SIDEBAR_WIDTH_MOBILE = "w-72";

/** Resizable expanded sidebar bounds (desktop md+). */
export const CHAT_SIDEBAR_WIDTH_MIN = 208;
export const CHAT_SIDEBAR_WIDTH_DEFAULT = 256;
export const CHAT_SIDEBAR_WIDTH_MAX = 384;

/** @deprecated Use pixel width + CHAT_SIDEBAR_WIDTH_MIN instead. */
export const CHAT_SIDEBAR_WIDTH_EXPANDED = "md:w-52";

/** @deprecated Use CHAT_SIDEBAR_WIDTH_COLLAPSED_PX instead. */
export const CHAT_SIDEBAR_WIDTH_COLLAPSED = "md:w-14";

export function clampChatSidebarExpandedWidth(width: number): number {
  if (!Number.isFinite(width)) return CHAT_SIDEBAR_WIDTH_DEFAULT;
  return Math.min(
    CHAT_SIDEBAR_WIDTH_MAX,
    Math.max(CHAT_SIDEBAR_WIDTH_MIN, Math.round(width))
  );
}

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

export function readChatSidebarExpandedWidth(): number {
  if (typeof window === "undefined") return CHAT_SIDEBAR_WIDTH_DEFAULT;
  try {
    const raw = window.localStorage.getItem(CHAT_SIDEBAR_EXPANDED_WIDTH_KEY);
    if (!raw) return CHAT_SIDEBAR_WIDTH_DEFAULT;
    return clampChatSidebarExpandedWidth(Number.parseInt(raw, 10));
  } catch {
    return CHAT_SIDEBAR_WIDTH_DEFAULT;
  }
}

export function writeChatSidebarExpandedWidth(width: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      CHAT_SIDEBAR_EXPANDED_WIDTH_KEY,
      String(clampChatSidebarExpandedWidth(width))
    );
  } catch {
    /* ignore */
  }
}

export function resolveChatSidebarDesktopWidthPx(
  collapsed: boolean,
  expandedWidth: number
): number {
  return collapsed
    ? CHAT_SIDEBAR_WIDTH_COLLAPSED_PX
    : clampChatSidebarExpandedWidth(expandedWidth);
}
