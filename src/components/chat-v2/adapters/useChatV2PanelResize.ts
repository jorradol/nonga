/**
 * Chat V2 desktop panel width state — preferred + viewport-clamped applied widths.
 * Persistence lives in panelWidths.ts (not Shell / presentation adapter).
 */
import { useCallback, useEffect, useState } from "react";
import {
  CHAT_V2_CENTER_MIN_WIDTH,
  CHAT_V2_RAIL_WIDTH,
  CHAT_V2_RESIZE_STEP_LARGE_PX,
  CHAT_V2_RESIZE_STEP_PX,
  CHAT_V2_SIDEBAR_WIDTH_DEFAULT,
  CHAT_V2_SIDEBAR_WIDTH_MAX,
  CHAT_V2_SIDEBAR_WIDTH_MIN,
  CHAT_V2_WORKSPACE_WIDTH_DEFAULT,
  CHAT_V2_WORKSPACE_WIDTH_MAX,
  CHAT_V2_WORKSPACE_WIDTH_MIN,
  clearChatV2PanelWidths,
  clampNumber,
  defaultPanelWidthPreferences,
  loadChatV2PanelWidths,
  maxSidebarWhileDragging,
  maxWorkspaceWhileDragging,
  resolveAppliedPanelWidths,
  saveChatV2PanelWidths,
  type ChatV2PanelWidthPreferences,
} from "../panelWidths";
import { useChatV2IsDesktop } from "./useChatV2Presentation";

function readViewportWidth(): number {
  if (typeof window === "undefined") return 1440;
  return window.innerWidth;
}

export interface ChatV2PanelResizeApi {
  isDesktop: boolean;
  preferred: ChatV2PanelWidthPreferences;
  appliedSidebarWidth: number;
  appliedWorkspaceWidth: number;
  sidebarResizeMax: number;
  workspaceResizeMax: number;
  setSidebarWidth: (next: number) => void;
  setWorkspaceWidth: (next: number) => void;
  resetPanelWidths: () => void;
  resizeStep: number;
  resizeLargeStep: number;
  sidebarMin: number;
  sidebarMax: number;
  workspaceMin: number;
  workspaceMax: number;
  centerMin: number;
}

export function useChatV2PanelResize(input: {
  sidebarCollapsed: boolean;
  workspaceCollapsed: boolean;
}): ChatV2PanelResizeApi {
  const isDesktop = useChatV2IsDesktop();
  const [preferred, setPreferred] = useState<ChatV2PanelWidthPreferences>(() =>
    loadChatV2PanelWidths()
  );
  const [viewportWidth, setViewportWidth] = useState(readViewportWidth);

  useEffect(() => {
    const onResize = () => setViewportWidth(readViewportWidth());
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const resolved = resolveAppliedPanelWidths({
    preferred,
    viewportWidth,
    sidebarCollapsed: input.sidebarCollapsed,
    workspaceCollapsed: input.workspaceCollapsed,
  });

  const workspaceOccupied = input.workspaceCollapsed
    ? CHAT_V2_RAIL_WIDTH
    : resolved.applied.workspaceWidth;
  const sidebarOccupied = input.sidebarCollapsed
    ? CHAT_V2_RAIL_WIDTH
    : resolved.applied.sidebarWidth;

  const sidebarResizeMax = maxSidebarWhileDragging(
    viewportWidth,
    workspaceOccupied
  );
  const workspaceResizeMax = maxWorkspaceWhileDragging(
    viewportWidth,
    sidebarOccupied
  );

  const persist = useCallback((next: ChatV2PanelWidthPreferences) => {
    setPreferred(next);
    saveChatV2PanelWidths(next);
  }, []);

  const setSidebarWidth = useCallback(
    (next: number) => {
      const capped = clampNumber(
        next,
        CHAT_V2_SIDEBAR_WIDTH_MIN,
        sidebarResizeMax
      );
      persist({
        ...preferred,
        sidebarWidth: capped,
      });
    },
    [persist, preferred, sidebarResizeMax]
  );

  const setWorkspaceWidth = useCallback(
    (next: number) => {
      const capped = clampNumber(
        next,
        CHAT_V2_WORKSPACE_WIDTH_MIN,
        workspaceResizeMax
      );
      persist({
        ...preferred,
        workspaceWidth: capped,
      });
    },
    [persist, preferred, workspaceResizeMax]
  );

  const resetPanelWidths = useCallback(() => {
    clearChatV2PanelWidths();
    const defaults = defaultPanelWidthPreferences();
    setPreferred(defaults);
  }, []);

  return {
    isDesktop,
    preferred: resolved.preferred,
    appliedSidebarWidth: input.sidebarCollapsed
      ? CHAT_V2_RAIL_WIDTH
      : resolved.applied.sidebarWidth,
    appliedWorkspaceWidth: input.workspaceCollapsed
      ? CHAT_V2_RAIL_WIDTH
      : resolved.applied.workspaceWidth,
    sidebarResizeMax,
    workspaceResizeMax,
    setSidebarWidth,
    setWorkspaceWidth,
    resetPanelWidths,
    resizeStep: CHAT_V2_RESIZE_STEP_PX,
    resizeLargeStep: CHAT_V2_RESIZE_STEP_LARGE_PX,
    sidebarMin: CHAT_V2_SIDEBAR_WIDTH_MIN,
    sidebarMax: CHAT_V2_SIDEBAR_WIDTH_MAX,
    workspaceMin: CHAT_V2_WORKSPACE_WIDTH_MIN,
    workspaceMax: CHAT_V2_WORKSPACE_WIDTH_MAX,
    centerMin: CHAT_V2_CENTER_MIN_WIDTH,
  };
}

export {
  CHAT_V2_SIDEBAR_WIDTH_DEFAULT,
  CHAT_V2_WORKSPACE_WIDTH_DEFAULT,
};
