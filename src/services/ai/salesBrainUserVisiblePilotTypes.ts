/**
 * v6.1L.2g — Shared pilot orchestration hints (browser-safe, no resolver imports).
 */
import type { PilotGroundedCarCard } from "./chat/chatPilotSessionContext";

export interface UserVisiblePilotOrchestrationHint {
  carCardCount: number;
  hasMoreCars?: boolean;
  /** v6.1L.2g — last shown cards for follow-up compare/refine grounding */
  recentCarCards?: PilotGroundedCarCard[];
  lastSearchBudgetMax?: number;
}
