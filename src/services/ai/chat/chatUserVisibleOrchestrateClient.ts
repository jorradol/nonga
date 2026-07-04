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
 */
export async function applyChatUserVisibleServerBridge(input: {
  userMessage: string;
  attachedImageCount?: number;
  orchestratedText: string;
  pilotSessionContext?: PilotBuyerSessionContext;
}): Promise<{ userVisibleText: string; pilotPathActive: boolean } | null> {
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
  };
}
