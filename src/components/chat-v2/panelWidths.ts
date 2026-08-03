/**
 * Chat V2 desktop panel width preferences (UX/layout only).
 * Keys are versioned and scoped to /chat-v2 — never theme, conversation, or vehicle selection.
 */
import {
  safeGetItem,
  safeRemoveItem,
  safeSetItem,
} from "../../utils/safeLocalStorage";

export const CHAT_V2_PANEL_WIDTHS_STORAGE_KEY =
  "nonga.chat-v2.panel-widths.v1";

export const CHAT_V2_SIDEBAR_WIDTH_MIN = 72;
export const CHAT_V2_SIDEBAR_WIDTH_MAX = 360;
/** Matches previous lg sidebar column (lg:w-[248px]). */
export const CHAT_V2_SIDEBAR_WIDTH_DEFAULT = 248;

export const CHAT_V2_WORKSPACE_WIDTH_MIN = 320;
export const CHAT_V2_WORKSPACE_WIDTH_MAX = 600;
/** Closest previous default within the new min/max band (xl:w-[320px]). */
export const CHAT_V2_WORKSPACE_WIDTH_DEFAULT = 320;

/** Minimum usable center conversation width on desktop three-region layout. */
export const CHAT_V2_CENTER_MIN_WIDTH = 420;

/** Compact rail width (Tailwind w-14). */
export const CHAT_V2_RAIL_WIDTH = 56;

export const CHAT_V2_RESIZE_STEP_PX = 8;
export const CHAT_V2_RESIZE_STEP_LARGE_PX = 32;

export interface ChatV2PanelWidthPreferences {
  sidebarWidth: number;
  workspaceWidth: number;
}

export interface ChatV2AppliedPanelWidths {
  /** Preferred widths (persisted intent). */
  preferred: ChatV2PanelWidthPreferences;
  /** Widths actually applied after viewport clamp. */
  applied: ChatV2PanelWidthPreferences;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function sanitizeSidebarWidth(value: unknown): number | null {
  if (!isFiniteNumber(value) || value < 0) return null;
  if (value < CHAT_V2_SIDEBAR_WIDTH_MIN || value > CHAT_V2_SIDEBAR_WIDTH_MAX) {
    return null;
  }
  return value;
}

export function sanitizeWorkspaceWidth(value: unknown): number | null {
  if (!isFiniteNumber(value) || value < 0) return null;
  if (
    value < CHAT_V2_WORKSPACE_WIDTH_MIN ||
    value > CHAT_V2_WORKSPACE_WIDTH_MAX
  ) {
    return null;
  }
  return value;
}

/**
 * Parse + validate stored JSON. Rejects malformed / NaN / negative payloads.
 * Out-of-range numbers are clamped into the allowed band.
 */
export function parseStoredPanelWidths(
  raw: string | null
): ChatV2PanelWidthPreferences | null {
  if (raw == null || raw.trim() === "") return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    const record = parsed as Record<string, unknown>;
    const sidebar = sanitizeSidebarWidth(record.sidebarWidth);
    const workspace = sanitizeWorkspaceWidth(record.workspaceWidth);
    if (sidebar == null || workspace == null) return null;
    return { sidebarWidth: sidebar, workspaceWidth: workspace };
  } catch {
    return null;
  }
}

export function defaultPanelWidthPreferences(): ChatV2PanelWidthPreferences {
  return {
    sidebarWidth: CHAT_V2_SIDEBAR_WIDTH_DEFAULT,
    workspaceWidth: CHAT_V2_WORKSPACE_WIDTH_DEFAULT,
  };
}

/**
 * Resolve applied column widths so the center chat stays ≥ CENTER_MIN.
 * Preferred values are kept intact for restore when the viewport grows.
 */
export function resolveAppliedPanelWidths(input: {
  preferred: ChatV2PanelWidthPreferences;
  viewportWidth: number;
  sidebarCollapsed: boolean;
  workspaceCollapsed: boolean;
}): ChatV2AppliedPanelWidths {
  const preferred = {
    sidebarWidth:
      sanitizeSidebarWidth(input.preferred.sidebarWidth) ??
      CHAT_V2_SIDEBAR_WIDTH_DEFAULT,
    workspaceWidth:
      sanitizeWorkspaceWidth(input.preferred.workspaceWidth) ??
      CHAT_V2_WORKSPACE_WIDTH_DEFAULT,
  };

  const viewport = Math.max(0, input.viewportWidth);
  const sidebarOccupied = input.sidebarCollapsed
    ? CHAT_V2_RAIL_WIDTH
    : preferred.sidebarWidth;
  const workspaceOccupied = input.workspaceCollapsed
    ? CHAT_V2_RAIL_WIDTH
    : preferred.workspaceWidth;

  let appliedSidebar = sidebarOccupied;
  let appliedWorkspace = workspaceOccupied;

  const budget = Math.max(0, viewport - CHAT_V2_CENTER_MIN_WIDTH);
  const total = appliedSidebar + appliedWorkspace;

  if (total > budget && budget > 0) {
    // Shrink expanded panels only; rails stay fixed.
    const sidebarFlexible = !input.sidebarCollapsed;
    const workspaceFlexible = !input.workspaceCollapsed;

    if (sidebarFlexible && workspaceFlexible) {
      const overflow = total - budget;
      // Prefer keeping both usable: take from the wider panel first.
      if (appliedSidebar >= appliedWorkspace) {
        const takeFromSidebar = Math.min(
          overflow,
          Math.max(0, appliedSidebar - CHAT_V2_SIDEBAR_WIDTH_MIN)
        );
        appliedSidebar -= takeFromSidebar;
        const remaining = overflow - takeFromSidebar;
        appliedWorkspace = Math.max(
          CHAT_V2_WORKSPACE_WIDTH_MIN,
          appliedWorkspace - remaining
        );
      } else {
        const takeFromWorkspace = Math.min(
          overflow,
          Math.max(0, appliedWorkspace - CHAT_V2_WORKSPACE_WIDTH_MIN)
        );
        appliedWorkspace -= takeFromWorkspace;
        const remaining = overflow - takeFromWorkspace;
        appliedSidebar = Math.max(
          CHAT_V2_SIDEBAR_WIDTH_MIN,
          appliedSidebar - remaining
        );
      }
      // Final hard clamp if mins still overflow (very narrow desktop).
      const after = appliedSidebar + appliedWorkspace;
      if (after > budget) {
        const scale = budget / after;
        appliedSidebar = Math.max(
          CHAT_V2_SIDEBAR_WIDTH_MIN,
          Math.floor(appliedSidebar * scale)
        );
        appliedWorkspace = Math.max(
          CHAT_V2_WORKSPACE_WIDTH_MIN,
          budget - appliedSidebar
        );
      }
    } else if (sidebarFlexible) {
      appliedSidebar = clampNumber(
        budget - appliedWorkspace,
        CHAT_V2_SIDEBAR_WIDTH_MIN,
        CHAT_V2_SIDEBAR_WIDTH_MAX
      );
    } else if (workspaceFlexible) {
      appliedWorkspace = clampNumber(
        budget - appliedSidebar,
        CHAT_V2_WORKSPACE_WIDTH_MIN,
        CHAT_V2_WORKSPACE_WIDTH_MAX
      );
    }
  }

  if (!input.sidebarCollapsed) {
    appliedSidebar = clampNumber(
      appliedSidebar,
      CHAT_V2_SIDEBAR_WIDTH_MIN,
      CHAT_V2_SIDEBAR_WIDTH_MAX
    );
  }
  if (!input.workspaceCollapsed) {
    appliedWorkspace = clampNumber(
      appliedWorkspace,
      CHAT_V2_WORKSPACE_WIDTH_MIN,
      CHAT_V2_WORKSPACE_WIDTH_MAX
    );
  }

  return {
    preferred,
    applied: {
      sidebarWidth: appliedSidebar,
      workspaceWidth: appliedWorkspace,
    },
  };
}

/** Max width a panel may take while dragging, given the other panel's occupied width. */
export function maxSidebarWhileDragging(
  viewportWidth: number,
  workspaceOccupied: number
): number {
  return clampNumber(
    viewportWidth - CHAT_V2_CENTER_MIN_WIDTH - workspaceOccupied,
    CHAT_V2_SIDEBAR_WIDTH_MIN,
    CHAT_V2_SIDEBAR_WIDTH_MAX
  );
}

export function maxWorkspaceWhileDragging(
  viewportWidth: number,
  sidebarOccupied: number
): number {
  return clampNumber(
    viewportWidth - CHAT_V2_CENTER_MIN_WIDTH - sidebarOccupied,
    CHAT_V2_WORKSPACE_WIDTH_MIN,
    CHAT_V2_WORKSPACE_WIDTH_MAX
  );
}

export function loadChatV2PanelWidths(): ChatV2PanelWidthPreferences {
  const parsed = parseStoredPanelWidths(
    safeGetItem(CHAT_V2_PANEL_WIDTHS_STORAGE_KEY)
  );
  return parsed ?? defaultPanelWidthPreferences();
}

export function saveChatV2PanelWidths(
  prefs: ChatV2PanelWidthPreferences
): void {
  const sidebar =
    sanitizeSidebarWidth(prefs.sidebarWidth) ?? CHAT_V2_SIDEBAR_WIDTH_DEFAULT;
  const workspace =
    sanitizeWorkspaceWidth(prefs.workspaceWidth) ??
    CHAT_V2_WORKSPACE_WIDTH_DEFAULT;
  safeSetItem(
    CHAT_V2_PANEL_WIDTHS_STORAGE_KEY,
    JSON.stringify({ sidebarWidth: sidebar, workspaceWidth: workspace })
  );
}

/** Clears only Chat V2 panel-width preference — not theme or conversation data. */
export function clearChatV2PanelWidths(): void {
  safeRemoveItem(CHAT_V2_PANEL_WIDTHS_STORAGE_KEY);
}

export function centerWidthFor(
  viewportWidth: number,
  sidebarOccupied: number,
  workspaceOccupied: number
): number {
  return Math.max(
    0,
    viewportWidth - sidebarOccupied - workspaceOccupied
  );
}
