/**
 * Chat UI Phase D1 — Vehicle Results Panel state (UI-only, no persistence).
 *
 * discoveredVehicles is DERIVED from the active session's message history:
 * the latest AI message that carries real marketplace carCards. Because the
 * source of truth is the per-session message list, New Chat and Logout
 * automatically clear the panel (no cross-session vehicle leak by design).
 *
 * Grounding rules for this panel:
 * - only cards with a stable listing ID are shown
 * - synthetic pilot-session context IDs are excluded (not real listings)
 * - no parsing of AI free text, no mock vehicles, no inventory mutation
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChatCarCardData, ChatMessage } from "../../types";
import { loadLastSelectedCarId } from "../../utils/chatCarContext";

export type VehiclePanelViewState = "idle" | "loading" | "results";

/** Synthetic pilot-session card IDs are context hints, not real listings. */
const SYNTHETIC_PILOT_CARD_ID_PREFIX = "pilot-session-";

export const VEHICLE_PANEL_TRIGGER_NAVBAR_ID = "vehicle-panel-trigger-navbar";
export const VEHICLE_PANEL_TRIGGER_MOBILE_ID = "vehicle-panel-trigger-mobile";

/** Desktop inline-panel breakpoint — matches Tailwind xl used by this layout. */
export const VEHICLE_PANEL_DESKTOP_MEDIA_QUERY = "(min-width: 1280px)";

export function isTrustedVehicleCard(card: ChatCarCardData | undefined | null): card is ChatCarCardData {
  if (!card) return false;
  const id = String(card.id ?? "").trim();
  if (!id) return false;
  if (id.startsWith(SYNTHETIC_PILOT_CARD_ID_PREFIX)) return false;
  return true;
}

export interface DiscoveredVehiclesResult {
  vehicles: ChatCarCardData[];
  /** Message that produced the current result set (identity for auto-open). */
  sourceMessageId: string | null;
  hasMoreCars: boolean;
}

/**
 * Latest AI message with real car cards wins. Cards are deduplicated by
 * listing ID (same rule ChatMessageBubble applies when rendering in-chat).
 */
export function deriveDiscoveredVehicles(
  messages: ChatMessage[]
): DiscoveredVehiclesResult {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (!msg || msg.sender === "user") continue;
    const trusted = (msg.carCards ?? []).filter(isTrustedVehicleCard);
    if (trusted.length === 0) continue;
    const seen = new Set<string>();
    const vehicles: ChatCarCardData[] = [];
    for (const card of trusted) {
      if (seen.has(card.id)) continue;
      seen.add(card.id);
      vehicles.push(card);
    }
    return {
      vehicles,
      sourceMessageId: msg.id,
      hasMoreCars: msg.hasMoreCars === true,
    };
  }
  return { vehicles: [], sourceMessageId: null, hasMoreCars: false };
}

export interface UseVehiclePanelInput {
  activeSessionId: string | null;
  currentMessages: ChatMessage[];
  isGenerating: boolean;
}

export interface UseVehiclePanelResult {
  discoveredVehicles: ChatCarCardData[];
  isVehiclePanelOpen: boolean;
  vehiclePanelViewState: VehiclePanelViewState;
  /**
   * Selected/active vehicle ID, exposed ONLY when it belongs to the current
   * discovered set (guards against the Phase A cross-session sessionStorage
   * leak). Not rendered as an indicator yet — the clear-affordance lifecycle
   * touches the pronoun-resolution context used by frozen Q2–Q4 flows and is
   * deferred to its own micro-scope.
   */
  activeVehicleId: string | null;
  hasMoreDiscoveredCars: boolean;
  openVehiclePanel: () => void;
  closeVehiclePanel: () => void;
}

export function useVehiclePanel(input: UseVehiclePanelInput): UseVehiclePanelResult {
  const { activeSessionId, currentMessages, isGenerating } = input;
  const [isOpen, setIsOpen] = useState(false);
  const lastAutoOpenMessageIdRef = useRef<string | null>(null);

  const { vehicles, sourceMessageId, hasMoreCars } = useMemo(
    () => deriveDiscoveredVehicles(currentMessages),
    [currentMessages]
  );

  // Session switch / New Chat: close panel and forget auto-open history.
  useEffect(() => {
    setIsOpen(false);
    lastAutoOpenMessageIdRef.current = null;
  }, [activeSessionId]);

  // Auto-open only on a NEW result set and only at desktop width where the
  // panel is inline (never auto-open the overlay on tablet/mobile).
  useEffect(() => {
    if (!sourceMessageId || vehicles.length === 0) return;
    if (lastAutoOpenMessageIdRef.current === sourceMessageId) return;
    lastAutoOpenMessageIdRef.current = sourceMessageId;
    if (
      typeof window !== "undefined" &&
      window.matchMedia(VEHICLE_PANEL_DESKTOP_MEDIA_QUERY).matches
    ) {
      setIsOpen(true);
    }
  }, [sourceMessageId, vehicles.length]);

  const openVehiclePanel = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeVehiclePanel = useCallback(() => {
    setIsOpen(false);
    // Return focus to the visible reopen trigger for keyboard users.
    requestAnimationFrame(() => {
      const candidates = [
        document.getElementById(VEHICLE_PANEL_TRIGGER_NAVBAR_ID),
        document.getElementById(VEHICLE_PANEL_TRIGGER_MOBILE_ID),
      ];
      const visible = candidates.find(
        (el): el is HTMLElement => !!el && el.offsetParent !== null
      );
      visible?.focus();
    });
  }, []);

  const vehiclePanelViewState: VehiclePanelViewState = isGenerating
    ? "loading"
    : vehicles.length > 0
      ? "results"
      : "idle";

  const activeVehicleId = useMemo(() => {
    if (vehicles.length === 0) return null;
    const selected = loadLastSelectedCarId();
    if (!selected) return null;
    return vehicles.some((v) => v.id === selected) ? selected : null;
  }, [vehicles]);

  return {
    discoveredVehicles: vehicles,
    // Panel stays closed whenever there are no real results.
    isVehiclePanelOpen: isOpen && vehicles.length > 0,
    vehiclePanelViewState,
    activeVehicleId,
    hasMoreDiscoveredCars: hasMoreCars,
    openVehiclePanel,
    closeVehiclePanel,
  };
}
