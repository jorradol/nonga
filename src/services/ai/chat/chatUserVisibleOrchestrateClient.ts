/**
 * v6.1L.2c — Client bridge to server user-visible orchestration (auth Bearer only).
 * Does not send UID in request body — server derives identity from verified token.
 */
import {
  getFirebaseAuthHeaders,
} from "../../auth/firebaseAuthHeaders";
import type { PilotBuyerSessionContext } from "./chatPilotSessionContext";
import type { ChatCarCardData } from "../../../types";
import type { ExtractedCarFields } from "./sellIntentParser";
import {
  isMonthlyAffordabilityDiscovery,
  isVehicleDiscoveryIntent,
} from "./vehicleDiscoveryCriteriaParser";
import {
  parseServerOwnedChatV3GeneralConversationBrain,
  type ChatV3GeneralConversationBrain,
  type ChatV3GeneralConversationBrainStatus,
} from "./chatV2V3GeneralBridgeClientApply";
import {
  parseServerOwnedChatV3SearchGroundedConversationBrain,
  type ChatV3SearchGroundedConversationBrain,
  type ChatV3SearchGroundedConversationBrainStatus,
} from "./chatV2V3SearchGroundingClientApply";
import { parseBoundedSelectedListingId } from "../../../utils/chatCarContext";

export const CHAT_USER_VISIBLE_ORCHESTRATE_ROUTE = "/api/ai/chat-user-visible-orchestrate";

export interface ChatUserVisibleConversationHistoryTurn {
  role: "user" | "assistant";
  content: string;
}

export const CHAT_USER_VISIBLE_CONVERSATION_HISTORY_MAX_MESSAGES = 12;

export const MANDATORY_VEHICLE_SEARCH_BRIDGE_FAIL_MESSAGE =
  "ขณะนี้เชื่อมต่อระบบค้นหาไม่สำเร็จครับ กรุณารีเฟรชหน้าแล้วลองเข้าสู่ระบบใหม่อีกครั้งนะครับ";

export type BridgeDiagnosticReason =
  | "bridge_attempted"
  | "missing_verified_token"
  | "server_non_pilot"
  | "bridge_http_failure"
  | "bridge_invalid_response"
  | "bridge_success";

export type ChatUserVisibleBridgeResult =
  | {
      status: "success";
      diagnostic: "bridge_success" | "server_non_pilot";
      data: ChatUserVisibleOrchestrateData;
    }
  | {
      status: "failure";
      diagnostic:
        | "missing_verified_token"
        | "bridge_http_failure"
        | "bridge_invalid_response";
    };

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
  realProviderNetwork?: boolean;
  realProviderGateReason?: string;
  /**
   * WP-NVB-02E / WP-NVB-03B — accepted only when Server sent exact literals.
   * Malformed values are stripped and ignored.
   */
  conversationBrain?: ChatV3GeneralConversationBrain | ChatV3SearchGroundedConversationBrain;
  conversationBrainStatus?:
    | ChatV3GeneralConversationBrainStatus
    | ChatV3SearchGroundedConversationBrainStatus;
  userVisibleRuntimeDiagnostic?: {
    runtimeMode: string;
    provider: string;
    userVisibleEnabled: boolean;
    realProviderEnabled: boolean;
    ownerControlledUxEnabled: boolean;
    aiFirstEnabled: boolean;
    aiFirstPathActive: boolean;
    aiFirstSliceId: string;
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

/** Hosting discovery / scored-search copy that must not be replaced by stale bridge. */
function isDeterministicDiscoverySearchReply(text: string): boolean {
  return (
    /เข้าใจเงื่อนไข/.test(text) ||
    /พบรถที่ตรงเงื่อนไข/.test(text) ||
    /ไม่พบรถที่ตรง/.test(text)
  );
}

/** Stale Cloud Run facts path asking buyer to tap a car card first. */
function isAskSelectOrWhichCarBridge(text: string): boolean {
  return (
    /กดดูรายละเอียดรถคันที่สนใจ/.test(text) ||
    /หมายถึงรถคันไหน/.test(text)
  );
}

function emitBridgeDiagnostic(reason: BridgeDiagnosticReason): void {
  if (typeof window === "undefined") return;
  try {
  const prod =
    typeof import.meta !== "undefined" &&
    (import.meta as { env?: { PROD?: boolean } }).env?.PROD === true;
    if (prod) return;
    console.debug("[chat-user-visible-bridge]", { reason });
  } catch {
    // Fail-open: diagnostics must never block chat.
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Normalize HeadersInit from getFirebaseAuthHeaders into fetch-ready string headers. */
function normalizeFirebaseAuthHeadersForFetch(
  headersInit: HeadersInit
): Record<string, string> {
  const headers = new Headers(headersInit);
  const normalized: Record<string, string> = {
    "Content-Type": headers.get("Content-Type") ?? "application/json",
  };
  const authorization = headers.get("Authorization");
  if (authorization) {
    normalized.Authorization = authorization;
  }
  return normalized;
}

async function acquireVerifiedAuthHeaders(): Promise<Record<string, string>> {
  let normalized = normalizeFirebaseAuthHeadersForFetch(
    await getFirebaseAuthHeaders({ forceRefresh: false })
  );
  if (normalized.Authorization) return normalized;
  await sleep(250);
  normalized = normalizeFirebaseAuthHeadersForFetch(
    await getFirebaseAuthHeaders({ forceRefresh: true })
  );
  if (normalized.Authorization) return normalized;
  await sleep(500);
  return normalizeFirebaseAuthHeadersForFetch(
    await getFirebaseAuthHeaders({ forceRefresh: true })
  );
}

export type ChatUserVisibleBridgeDeps = {
  getAuthHeaders?: () => Promise<Record<string, string>>;
  fetchImpl?: typeof fetch;
};

function classifyServerBridgeDiagnostic(
  data: ChatUserVisibleOrchestrateData
): "bridge_success" | "server_non_pilot" {
  const runtime = data.userVisibleRuntimeDiagnostic;
  if (data.pilotPathActive || data.realProviderNetwork || runtime?.aiFirstPathActive) {
    return "bridge_success";
  }
  if (data.fallbackToLegacy || !data.pilotPathActive) {
    return "server_non_pilot";
  }
  return "bridge_success";
}

/** Accept only exact Server-owned V.3 General Bridge or Search Grounding literals. */
function withSanitizedConversationBrain(
  data: ChatUserVisibleOrchestrateData
): ChatUserVisibleOrchestrateData {
  const searchParsed = parseServerOwnedChatV3SearchGroundedConversationBrain(data);
  const generalParsed = parseServerOwnedChatV3GeneralConversationBrain(data);
  const {
    conversationBrain: _ignoredBrain,
    conversationBrainStatus: _ignoredStatus,
    ...rest
  } = data;
  if (searchParsed) {
    return {
      ...rest,
      conversationBrain: searchParsed.conversationBrain,
      conversationBrainStatus: searchParsed.conversationBrainStatus,
    };
  }
  if (!generalParsed) {
    return rest;
  }
  return {
    ...rest,
    conversationBrain: generalParsed.conversationBrain,
    conversationBrainStatus: generalParsed.conversationBrainStatus,
  };
}

function buildOrchestrateRequestBody(input: {
  userMessage: string;
  attachedImageCount?: number;
  pilotSessionContext?: PilotBuyerSessionContext;
  conversationHistory?: readonly ChatUserVisibleConversationHistoryTurn[];
  selectedListingId?: string | null;
}): Record<string, unknown> {
  const body: Record<string, unknown> = { userMessage: input.userMessage };
  if (input.attachedImageCount !== undefined) {
    body.attachedImageCount = input.attachedImageCount;
  }
  if (input.pilotSessionContext?.recentCarCards?.length) {
    body.pilotSessionContext = input.pilotSessionContext;
  }
  if (input.conversationHistory && input.conversationHistory.length > 0) {
    body.conversationHistory = input.conversationHistory.map((turn) => ({
      role: turn.role,
      content: turn.content,
    }));
  }
  const selectedListingId = parseBoundedSelectedListingId(input.selectedListingId);
  if (selectedListingId) {
    body.selectedListingId = selectedListingId;
  }
  return body;
}

/**
 * Build bounded untrusted conversation history from current-session messages only.
 * Server re-sanitizes; client must not send system/tool roles or auth metadata.
 */
export function buildConversationHistoryForGeneralBridge(input: {
  messages: ReadonlyArray<{ sender: string; text: string }>;
  currentUserMessage: string;
}): ChatUserVisibleConversationHistoryTurn[] {
  const turns: ChatUserVisibleConversationHistoryTurn[] = [];
  for (const message of input.messages) {
    const content = String(message.text ?? "").trim();
    if (!content) continue;
    const sender = String(message.sender ?? "").trim().toLowerCase();
    if (sender === "user") {
      turns.push({ role: "user", content });
    } else if (sender === "ai" || sender === "assistant") {
      turns.push({ role: "assistant", content });
    }
  }

  const normalizedCurrent = String(input.currentUserMessage ?? "").trim();
  while (turns.length > 0) {
    const last = turns[turns.length - 1];
    if (last.role === "user" && last.content === normalizedCurrent) {
      turns.pop();
    } else {
      break;
    }
  }

  return turns.slice(-CHAT_USER_VISIBLE_CONVERSATION_HISTORY_MAX_MESSAGES);
}

/**
 * v22.73 — signed-in bridge precedence guard:
 * keep deterministic client text when bridge contradicts refusal/continuity intent.
 * WP-VD01A — also keep Hosting discovery/search when stale bridge asks to select a car.
 */
export function shouldApplyBridgeUserVisibleText(
  input: BridgeTextPrecedenceInput
): boolean {
  const orchestrated = input.orchestratedText.trim();
  const bridged = input.bridgedText.trim();
  if (!orchestrated || !bridged) return false;

  // WP-VD01A — Hosting has discovery; Cloud Run without WP-VD01A may ask-select on "เกียร์".
  if (isAskSelectOrWhichCarBridge(bridged)) {
    if (isDeterministicDiscoverySearchReply(orchestrated)) return false;
    const userMessage = input.userMessage.trim();
    if (
      userMessage &&
      (isMonthlyAffordabilityDiscovery(userMessage) ||
        isVehicleDiscoveryIntent(userMessage))
    ) {
      return false;
    }
  }

  const deterministicRefusalOrContinuity = hasRefusalOrUsageContinuity(orchestrated);
  if (!deterministicRefusalOrContinuity) return true;

  // Guard narrow conflict only: legacy bridge text reintroduces budget ask/examples.
  if (hasBudgetReaskOrExamples(bridged)) return false;

  return true;
}

/**
 * WP-V2U-04K — bounded token acquisition + explicit bridge result for mandatory Search.
 */
export async function resolveChatUserVisibleBridgeResult(
  input: {
    userMessage: string;
    attachedImageCount?: number;
    pilotSessionContext?: PilotBuyerSessionContext;
    conversationHistory?: readonly ChatUserVisibleConversationHistoryTurn[];
    selectedListingId?: string | null;
  },
  deps: ChatUserVisibleBridgeDeps = {}
): Promise<ChatUserVisibleBridgeResult> {
  emitBridgeDiagnostic("bridge_attempted");
  const getAuthHeaders = deps.getAuthHeaders ?? acquireVerifiedAuthHeaders;
  const fetchImpl = deps.fetchImpl ?? fetch;
  const headers = await getAuthHeaders();
  if (!headers.Authorization) {
    emitBridgeDiagnostic("missing_verified_token");
    return { status: "failure", diagnostic: "missing_verified_token" };
  }

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };
  const body = buildOrchestrateRequestBody(input);

  try {
    const res = await fetchImpl(CHAT_USER_VISIBLE_ORCHESTRATE_ROUTE, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify(body),
    });
    if (res.status === 401 || res.status === 403 || !res.ok) {
      emitBridgeDiagnostic("bridge_http_failure");
      return { status: "failure", diagnostic: "bridge_http_failure" };
    }
    const json = (await res.json()) as ChatUserVisibleOrchestrateResponse;
    if (!json.success || !json.data) {
      emitBridgeDiagnostic("bridge_invalid_response");
      return { status: "failure", diagnostic: "bridge_invalid_response" };
    }
    if (!json.data.userVisibleText?.trim()) {
      emitBridgeDiagnostic("bridge_invalid_response");
      return { status: "failure", diagnostic: "bridge_invalid_response" };
    }
    const data = withSanitizedConversationBrain(json.data);
    const diagnostic = classifyServerBridgeDiagnostic(data);
    emitBridgeDiagnostic(diagnostic);
    return { status: "success", diagnostic, data };
  } catch {
    emitBridgeDiagnostic("bridge_http_failure");
    return { status: "failure", diagnostic: "bridge_http_failure" };
  }
}

/**
 * Request server orchestration bridge — returns null when unauthenticated or on transport error.
 */
export async function fetchChatUserVisibleOrchestrate(input: {
  userMessage: string;
  attachedImageCount?: number;
  pilotSessionContext?: PilotBuyerSessionContext;
  conversationHistory?: readonly ChatUserVisibleConversationHistoryTurn[];
  selectedListingId?: string | null;
}): Promise<ChatUserVisibleOrchestrateData | null> {
  const result = await resolveChatUserVisibleBridgeResult(input);
  if (result.status === "failure") {
    return null;
  }
  return result.data;
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
  conversationHistory?: readonly ChatUserVisibleConversationHistoryTurn[];
  selectedListingId?: string | null;
}): Promise<{
  userVisibleText: string;
  pilotPathActive: boolean;
  realProviderNetwork?: boolean;
  realProviderGateReason?: string;
  carCards?: ChatCarCardData[];
  conversationBrain?: ChatV3GeneralConversationBrain | ChatV3SearchGroundedConversationBrain;
  conversationBrainStatus?:
    | ChatV3GeneralConversationBrainStatus
    | ChatV3SearchGroundedConversationBrainStatus;
} | null> {
  const data = await fetchChatUserVisibleOrchestrate({
    userMessage: input.userMessage,
    attachedImageCount: input.attachedImageCount,
    pilotSessionContext: input.pilotSessionContext,
    conversationHistory: input.conversationHistory,
    selectedListingId: input.selectedListingId,
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
    realProviderNetwork: data.realProviderNetwork,
    realProviderGateReason: data.realProviderGateReason,
    ...(Array.isArray(data.carCards) && data.carCards.length > 0
      ? { carCards: data.carCards }
      : {}),
    ...(data.conversationBrain
      ? {
          conversationBrain: data.conversationBrain,
          conversationBrainStatus: data.conversationBrainStatus,
        }
      : {}),
  };
}
