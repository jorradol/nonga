/**
 * Chat Experience V2 — presentation adapter (V2-1).
 *
 * Read-only translation of existing chat state (ChatProvider/useChatContext)
 * into V2 view models. Hard rules:
 * - no message content mutation, no history edits, no payload changes
 * - no extra provider calls, no inventory fetches
 * - vehicles come ONLY from structured ChatMessage.carCards (same trusted
 *   derivation contract as Phase D1: deriveDiscoveredVehicles)
 * - vehicle selection uses canonical ChatCarCardData.id via chatCarContext
 *   (session-scoped); no new identifier scheme
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChatContext } from "../../../contexts/chat/ChatContext";
import {
  deriveDiscoveredVehicles,
  isTrustedVehicleCard,
} from "../../../hooks/chat/useVehiclePanel";
import type { ChatCarCardData } from "../../../types";
import {
  clearLastSelectedCarId,
  loadActiveSelectedCarIdForUi,
  saveLastSelectedCarId,
} from "../../../utils/chatCarContext";

/**
 * Desktop / large-tablet breakpoint (Tailwind `lg`): at and above this width
 * the three regions (Sidebar · Conversation · Vehicle Workspace) are
 * persistent inline columns — never overlays.
 */
export const CHAT_V2_DESKTOP_MEDIA_QUERY = "(min-width: 1024px)";
/** Below this width the conversation sidebar becomes a drawer. */
export const CHAT_V2_SIDEBAR_INLINE_MEDIA_QUERY = "(min-width: 1024px)";

export const CHAT_V2_WORKSPACE_TRIGGER_HEADER_ID =
  "chat-v2-workspace-trigger-header";
export const CHAT_V2_WORKSPACE_TRIGGER_COMPOSER_ID =
  "chat-v2-workspace-trigger-composer";

export type ChatV2ActivityStatus =
  | { kind: "idle"; label: null }
  | { kind: "thinking" | "answering"; label: string };

/**
 * Honest AI activity status — derived strictly from real generation state.
 * We can only distinguish "no visible output yet" from "reply streaming";
 * finer stages are not observable from the existing contract, so no fake
 * step labels are invented.
 */
export function deriveChatV2ActivityStatus(input: {
  isGenerating: boolean;
  streamedReply: string;
}): ChatV2ActivityStatus {
  if (!input.isGenerating) return { kind: "idle", label: null };
  if (input.streamedReply.trim().length > 0) {
    return { kind: "answering", label: "กำลังเตรียมคำตอบ..." };
  }
  return { kind: "thinking", label: "กำลังคิด..." };
}

export interface ChatV2WorkspaceState {
  vehicles: ChatCarCardData[];
  hasMoreCars: boolean;
  /** Identity of the message that produced the current result set. */
  sourceMessageId: string | null;
  /** Desktop inline column collapsed to a compact rail. */
  isCollapsed: boolean;
  /** Overlay sheet open (tablet/mobile widths only). */
  isSheetOpen: boolean;
  toggleCollapsed: () => void;
  openSheet: () => void;
  closeSheet: () => void;
}

export interface ChatV2Presentation {
  workspace: ChatV2WorkspaceState;
  status: ChatV2ActivityStatus;
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setMatches(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [query]);
  return matches;
}

export function useChatV2IsDesktop(): boolean {
  return useMediaQuery(CHAT_V2_DESKTOP_MEDIA_QUERY);
}

/**
 * Shared selection revision so Desktop workspace + Mobile sheet (sibling
 * mounts of ChatV2WorkspaceBody) stay in sync without editing ChatV2Shell.
 */
let selectionRevision = 0;
const selectionListeners = new Set<() => void>();

function bumpSelectionRevision(): void {
  selectionRevision += 1;
  selectionListeners.forEach((listener) => listener());
}

function resolveTrustedSelectedId(
  sessionId: string | null,
  vehicles: ChatCarCardData[]
): string | null {
  if (!sessionId || vehicles.length === 0) return null;
  const raw = loadActiveSelectedCarIdForUi(sessionId);
  if (!raw) return null;
  const match = vehicles.find((v) => v.id === raw);
  if (!match || !isTrustedVehicleCard(match)) return null;
  return match.id;
}

export interface ChatV2VehicleSelection {
  selectedVehicleId: string | null;
  selectVehicle: (listingId: string) => void;
  clearVehicleSelection: () => void;
}

/**
 * Single-vehicle selection for the V2 workspace. Canonical id = listing
 * ChatCarCardData.id. Rejects synthetic / stale ids. Persists via
 * session-scoped chatCarContext so next-message “คันนี้” uses the existing
 * orchestrator + inventory re-resolution path (no user-visible marker).
 */
export function useChatV2VehicleSelection(
  vehicles: ChatCarCardData[]
): ChatV2VehicleSelection {
  const { activeSessionId } = useChatContext();
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const onBump = () => setRevision(selectionRevision);
    selectionListeners.add(onBump);
    return () => {
      selectionListeners.delete(onBump);
    };
  }, []);

  const selectedVehicleId = useMemo(
    () => resolveTrustedSelectedId(activeSessionId, vehicles),
    [activeSessionId, vehicles, revision]
  );

  // Stale / untrusted id still in storage but not in discovered set → clear.
  useEffect(() => {
    if (!activeSessionId) return;
    const raw = loadActiveSelectedCarIdForUi(activeSessionId);
    if (!raw) return;
    const stillTrusted = vehicles.some(
      (v) => v.id === raw && isTrustedVehicleCard(v)
    );
    if (!stillTrusted) {
      clearLastSelectedCarId(activeSessionId);
      bumpSelectionRevision();
    }
  }, [activeSessionId, vehicles]);

  const selectVehicle = useCallback(
    (listingId: string) => {
      if (!activeSessionId) return;
      const id = String(listingId ?? "").trim();
      if (!id) return;
      const match = vehicles.find((v) => v.id === id);
      if (!match || !isTrustedVehicleCard(match)) return;
      saveLastSelectedCarId(match.id, activeSessionId);
      bumpSelectionRevision();
    },
    [activeSessionId, vehicles]
  );

  const clearVehicleSelection = useCallback(() => {
    if (!activeSessionId) return;
    clearLastSelectedCarId(activeSessionId);
    bumpSelectionRevision();
  }, [activeSessionId]);

  return {
    selectedVehicleId,
    selectVehicle,
    clearVehicleSelection,
  };
}

export function useChatV2Presentation(): ChatV2Presentation {
  const { activeSessionId, currentMessages, isGenerating, streamedReply } =
    useChatContext();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const sheetReturnFocusRef = useRef<HTMLElement | null>(null);
  // Tracks which result set we already auto-expanded for (mirrors D1 panel).
  // User collapse is respected until a NEW sourceMessageId arrives.
  const lastAutoExpandMessageIdRef = useRef<string | null>(null);

  // discoveredVehicles = structured carCards of the CURRENT conversation only.
  // Reuses the D1 trusted derivation (stable listing IDs, dedupe, latest AI
  // message wins). Switching to a session without results clears the list.
  const { vehicles, hasMoreCars, sourceMessageId } = useMemo(
    () => deriveDiscoveredVehicles(currentMessages),
    [currentMessages]
  );

  // Session switch / New Chat: close the overlay sheet (no cross-room leak)
  // and forget auto-expand history so the next room can open fresh.
  useEffect(() => {
    setIsSheetOpen(false);
    setIsCollapsed(false);
    lastAutoExpandMessageIdRef.current = null;
  }, [activeSessionId]);

  // Auto-expand the desktop column when a NEW trusted result set arrives.
  // Empty → results: panel must appear without a refresh.
  // User-collapsed + same result set: stay collapsed (rail remains reachable).
  // User-collapsed + NEW result set: expand so new cars are visible.
  useEffect(() => {
    if (!sourceMessageId || vehicles.length === 0) return;
    if (lastAutoExpandMessageIdRef.current === sourceMessageId) return;
    lastAutoExpandMessageIdRef.current = sourceMessageId;
    setIsCollapsed(false);
  }, [sourceMessageId, vehicles.length]);

  const status = useMemo(
    () => deriveChatV2ActivityStatus({ isGenerating, streamedReply }),
    [isGenerating, streamedReply]
  );

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  const openSheet = useCallback(() => {
    // Desktop / large tablet: the workspace is a persistent inline column —
    // never open the overlay sheet; expand the column if it was collapsed.
    if (window.matchMedia(CHAT_V2_DESKTOP_MEDIA_QUERY).matches) {
      setIsCollapsed(false);
      return;
    }
    sheetReturnFocusRef.current =
      (document.activeElement as HTMLElement | null) ?? null;
    setIsSheetOpen(true);
  }, []);

  const closeSheet = useCallback(() => {
    setIsSheetOpen(false);
    // Focus returns to the trigger that is visible at the current width.
    requestAnimationFrame(() => {
      const candidates = [
        sheetReturnFocusRef.current,
        document.getElementById(CHAT_V2_WORKSPACE_TRIGGER_HEADER_ID),
        document.getElementById(CHAT_V2_WORKSPACE_TRIGGER_COMPOSER_ID),
      ];
      const visible = candidates.find(
        (el): el is HTMLElement => !!el && el.offsetParent !== null
      );
      visible?.focus();
    });
  }, []);

  return {
    workspace: {
      vehicles,
      hasMoreCars,
      sourceMessageId,
      isCollapsed,
      isSheetOpen,
      toggleCollapsed,
      openSheet,
      closeSheet,
    },
    status,
  };
}
