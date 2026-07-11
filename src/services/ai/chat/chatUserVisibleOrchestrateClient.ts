/**
 * v6.1L.2c — Client bridge to server user-visible orchestration (auth Bearer only).
 * Does not send UID in request body — server derives identity from verified token.
 */
import { getFirebaseAuthHeaders } from "../../auth/firebaseAuthHeaders";
import type { PilotBuyerSessionContext } from "./chatPilotSessionContext";
import type { ChatCarCardData } from "../../../types";
import type { ExtractedCarFields } from "./sellIntentParser";

export const CHAT_USER_VISIBLE_ORCHESTRATE_ROUTE = "/api/ai/chat-user-visible-orchestrate";

export interface ChatUserVisibleOrchestrateData {
  sliceId: string;
  userVisibleText: string;
  sanitizedUserVisibleText?: string;
  missingUserVisibleText?: boolean;
  missingUserVisibleTextReason?: string;
  evidenceCapturedAt?: string;
  pilotPathActive: boolean;
  fallbackToLegacy: boolean;
  skipGemini: boolean;
  carCardCount: number;
  hasMoreCars?: boolean;
  isDraftPreview?: boolean;
  carCards: ChatCarCardData[];
  draftFields?: ExtractedCarFields;
  userVisibleRuntimeDiagnostic?: {
    runtimeMode: string;
    provider: string;
    userVisibleEnabled: boolean;
    realProviderEnabled: boolean;
    ownerControlledUxEnabled: boolean;
    aiFirstEnabled: boolean;
    pilotContextPresentServer: boolean;
    serverRecentCarCardsCount: number;
    followUpMessage: boolean;
    pilotInactiveReason: string;
    guardPolicyVersion: string;
    thaiUxTuningSliceId: string;
    thaiUxTuningActive: boolean;
    targetAnswerLengthGuidance: string;
    leadPiiCueGuardActive: boolean;
    phoneEchoGuardActive: boolean;
    safeConfirmationStepWordingActive: boolean;
  };
}

export interface ChatUserVisibleOrchestrateResponse {
  success: boolean;
  data?: ChatUserVisibleOrchestrateData;
  message?: string;
}

export interface BridgeTextPrecedenceInput {
  userMessage: string;
  orchestratedText: string;
  bridgedText: string;
}

const BUDGET_REASK_RE =
  /(?:งบประมาณ|ดูจากงบประมาณ|สะดวกบอกงบ).{0,20}(?:ไหม|มั้ย|ก่อนได้ไหม)|(?:งบไม่เกิน\s*\d)|(?:\d+\s*[–-]\s*\d+\s*แสน)/i;
const BUDGET_REFUSAL_RE =
  /ยังไม่อยากบอกงบ|ไม่อยากบอกงบ|ไม่สะดวกบอกงบ|งบ.*ไว้ก่อน|แนะนำจากการใช้งาน/i;
const USAGE_CONTINUITY_RE =
  /ใช้ขับไปทำงาน|จากการใช้งานที่มีก่อน|ใช้งานที่บอกมา|แนวรถเก๋งขับง่าย|นั่งสูงแบบ\s*SUV/i;

function hasBudgetReaskOrExamples(text: string): boolean {
  return BUDGET_REASK_RE.test(text);
}

function hasRefusalOrUsageContinuity(text: string): boolean {
  return BUDGET_REFUSAL_RE.test(text) || USAGE_CONTINUITY_RE.test(text);
}

/**
 * v22.73 — signed-in bridge precedence guard:
 * keep deterministic client text when bridge contradicts refusal/continuity intent.
 */
export function shouldApplyBridgeUserVisibleText(
  input: BridgeTextPrecedenceInput
): boolean {
  const orchestrated = input.orchestratedText.trim();
  const bridged = input.bridgedText.trim();
  if (!orchestrated || !bridged) return false;

  const deterministicRefusalOrContinuity = hasRefusalOrUsageContinuity(orchestrated);
  if (!deterministicRefusalOrContinuity) return true;

  // Guard narrow conflict only: legacy bridge text reintroduces budget ask/examples.
  if (hasBudgetReaskOrExamples(bridged)) return false;

  return true;
}

/**
 * Request server orchestration bridge — returns null when unauthenticated or on transport error.
 */
export async function fetchChatUserVisibleOrchestrate(input: {
  userMessage: string;
  attachedImageCount?: number;
  pilotSessionContext?: PilotBuyerSessionContext;
}): Promise<ChatUserVisibleOrchestrateData | null> {
  const headers = await getFirebaseAuthHeaders();
  if (!("Authorization" in headers)) {
    return null;
  }

  const body: Record<string, unknown> = { userMessage: input.userMessage };
  if (input.attachedImageCount !== undefined) {
    body.attachedImageCount = input.attachedImageCount;
  }
  if (input.pilotSessionContext?.recentCarCards?.length) {
    body.pilotSessionContext = input.pilotSessionContext;
  }

  try {
    const res = await fetch(CHAT_USER_VISIBLE_ORCHESTRATE_ROUTE, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (res.status === 401 || res.status === 403) {
      return null;
    }
    if (!res.ok) {
      return null;
    }
    const json = (await res.json()) as ChatUserVisibleOrchestrateResponse;
    if (!json.success || !json.data) {
      return null;
    }
    if (!json.data.userVisibleText?.trim()) {
      return null;
    }
    return json.data;
  } catch {
    return null;
  }
}

/**
 * Apply server bridge text to an existing orchestrated reply (legacy fallback on null).
 * v22.58 — also return server carCards so UI cards and text share one canonical set.
 */
export async function applyChatUserVisibleServerBridge(input: {
  userMessage: string;
  attachedImageCount?: number;
  orchestratedText: string;
  pilotSessionContext?: PilotBuyerSessionContext;
}): Promise<{
  userVisibleText: string;
  pilotPathActive: boolean;
  carCards?: ChatCarCardData[];
} | null> {
  const data = await fetchChatUserVisibleOrchestrate({
    userMessage: input.userMessage,
    attachedImageCount: input.attachedImageCount,
    pilotSessionContext: input.pilotSessionContext,
  });
  if (!data) {
    return null;
  }
  if (!data.userVisibleText?.trim()) {
    return null;
  }
  return {
    userVisibleText: data.userVisibleText,
    pilotPathActive: data.pilotPathActive,
    ...(Array.isArray(data.carCards) && data.carCards.length > 0
      ? { carCards: data.carCards }
      : {}),
  };
}
