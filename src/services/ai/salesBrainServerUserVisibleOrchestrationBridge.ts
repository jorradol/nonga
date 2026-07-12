/**
 * v6.1L.2c — Server-side user-visible orchestration bridge (auth-trusted UID only).
 * Authenticated route; default-deny; mock pilot path; no client-supplied UID trust.
 */
import type { Express, Request, Response } from "express";
import {
  getServerAuthContext,
  ServerAuthError,
  type ServerAuthContext,
} from "../../server/serverAuthContext";
import {
  tryOrchestrateChatReplyCore,
  type OrchestratedChatReply,
} from "./chat/chatSearchOrchestrator";
import type { ChatInventoryCar } from "./chat/marketplaceChatSearch";
import { mapChatRoleToSalesBrainUserRole } from "./salesBrainShadowChatPath";
import { wireShadowChatPathWithPilot } from "./salesBrainShadowChatPathNode";
import {
  resolveSalesBrainRuntimeEnvironmentFromProcess,
} from "./salesBrainShadowChatPath";
import {
  resolveSalesBrainRuntimeFlags,
  NONGA_AI_USER_VISIBLE_REAL_PROVIDER_ENABLED_ENV,
  type SalesBrainRuntimeEnvironment,
} from "./salesBrainRuntimeFlags";
import type { SalesBrainUserRole } from "./salesBrainTypes";
import type { PilotBuyerSessionContext } from "./chat/chatPilotSessionContext";
import {
  sanitizePilotSessionContext,
  pilotSessionCardsToChatCarCards,
  buildPilotSessionContextFromCarCards,
} from "./chat/chatPilotSessionContext";
import { isPilotBuyerFollowUpMessage } from "./chat/chatPilotBuyerFollowUp";
import {
  isNamedInventoryCompareIntent,
  rehydrateSessionCarsFromInventory,
} from "./chat/inventoryBackedCompare";
import { buildPilotFollowUpNoContextCopy } from "./salesBrainUserVisiblePilotBuyerCopy";
import type { UserVisiblePilotOrchestrationHint } from "./salesBrainUserVisiblePilotTypes";
import {
  AI_USER_VISIBLE_GUARD_POLICY_MARKERS,
  AI_USER_VISIBLE_GUARD_POLICY_VERSION,
  AI_USER_VISIBLE_THAI_UX_TUNING_EVIDENCE_MARKERS,
  maybeApplyUserVisibleRealProvider,
} from "./salesBrainUserVisibleRealProvider";
import {
  evaluateBuyerAiFirstEligibility,
  BUYER_AI_FIRST_CONVERSATION_SLICE_ID,
} from "./buyerAiFirstConversationPath";
import {
  evaluateUserVisibleGate,
  parseUserVisibleAllowlistUids,
  NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV,
} from "./salesBrainUserVisibleGate";

export const SALES_BRAIN_USER_VISIBLE_ORCHESTRATE_ROUTE =
  "/api/ai/chat-user-visible-orchestrate";

export const USER_VISIBLE_ORCHESTRATION_BRIDGE_SLICE_ID = "v6.1L.2c";

const MAX_USER_MESSAGE_LENGTH = 4000;
const MAX_USER_VISIBLE_EVIDENCE_CHARS = 1200;

export interface UserVisibleOrchestrationBridgeInput {
  userMessage: string;
  inventory: ChatInventoryCar[];
  trustedFirebaseUid: string;
  displayName?: string;
  attachedImageCount?: number;
  userRole: SalesBrainUserRole;
  environment?: SalesBrainRuntimeEnvironment;
  env?: Record<string, string | undefined>;
  /** v6.1L.2g — client session last-shown cards (listing fields only) */
  pilotSessionContext?: PilotBuyerSessionContext;
}

export interface RedactedUserVisibleOrchestrationPayload {
  sliceId: string;
  userVisibleText: string;
  pilotPathActive: boolean;
  fallbackToLegacy: boolean;
  skipGemini: boolean;
  carCardCount: number;
  hasMoreCars?: boolean;
  isDraftPreview?: boolean;
  /** v6.8D — redacted real-provider diagnostics (no secret values) */
  realProviderNetwork?: boolean;
  realProviderGateReason?: string;
  /** v13.15N-N — masked allowlist diagnostics (no raw UID / token / secret). */
  userVisibleGateDiagnostic?: {
    blockedReason: string;
    requestUidMasked: string;
    allowlistMasked: string[];
    allowlistMatch: boolean;
    allowlistCount: number;
  };
  /** v13.15N-W — runtime status-only diagnostics for pilot-path mismatch analysis. */
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

export interface UserVisibleOrchestrationBridgeResult {
  orchestrated: OrchestratedChatReply | null;
  payload: RedactedUserVisibleOrchestrationPayload;
}

function mapAuthToSalesBrainRole(auth: ServerAuthContext): SalesBrainUserRole {
  return mapChatRoleToSalesBrainUserRole({
    role: auth.role,
    isAdmin: auth.role === "admin" || auth.role === "superadmin",
    isDealer: auth.role === "dealer" || Boolean(auth.dealerId),
  });
}

function resolveBridgeEnvironment(
  override?: SalesBrainRuntimeEnvironment
): SalesBrainRuntimeEnvironment {
  if (override) {
    return override;
  }
  return resolveSalesBrainRuntimeEnvironmentFromProcess();
}

function buildRedactedPayload(
  orchestrated: OrchestratedChatReply | null,
  userVisibleText: string,
  pilotPathActive: boolean,
  fallbackToLegacy: boolean
): RedactedUserVisibleOrchestrationPayload {
  return {
    sliceId: USER_VISIBLE_ORCHESTRATION_BRIDGE_SLICE_ID,
    userVisibleText,
    pilotPathActive,
    fallbackToLegacy,
    skipGemini: orchestrated?.skipGemini ?? false,
    carCardCount: orchestrated?.carCards?.length ?? 0,
    hasMoreCars: orchestrated?.hasMoreCars,
    isDraftPreview: orchestrated?.isDraftPreview,
  };
}

function sanitizeUserVisibleEvidenceText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, MAX_USER_VISIBLE_EVIDENCE_CHARS);
}

function maskUid(uid: string | undefined | null): string {
  const value = String(uid ?? "").trim();
  if (!value) return "***";
  if (value.length <= 6) return "***";
  return `${value.slice(0, 3)}...${value.slice(-3)}`;
}

function parseTruthy(raw: string | undefined): boolean {
  const v = String(raw ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

function withMaskedUserVisibleGateDiagnostic(input: {
  payload: RedactedUserVisibleOrchestrationPayload;
  firebaseUid: string;
  environment?: SalesBrainRuntimeEnvironment;
  env?: Record<string, string | undefined>;
}): RedactedUserVisibleOrchestrationPayload {
  const gate = evaluateUserVisibleGate({
    firebaseUid: input.firebaseUid,
    environment: input.environment,
    env: input.env,
  });
  const allowlist = parseUserVisibleAllowlistUids(
    input.env?.[NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV]
  );
  return {
    ...input.payload,
    userVisibleGateDiagnostic: {
      blockedReason: gate.blockedReason,
      requestUidMasked: maskUid(input.firebaseUid),
      allowlistMasked: allowlist.map((uid) => maskUid(uid)),
      allowlistMatch: gate.redactedDiagnostics.uidAllowlisted,
      allowlistCount: allowlist.length,
    },
  };
}

function withSafeUserVisibleRuntimeDiagnostic(input: {
  payload: RedactedUserVisibleOrchestrationPayload;
  userMessage: string;
  pilotSessionContext?: PilotBuyerSessionContext;
  environment?: SalesBrainRuntimeEnvironment;
  env?: Record<string, string | undefined>;
  firebaseUid?: string;
}): RedactedUserVisibleOrchestrationPayload {
  const resolvedEnvironment = resolveBridgeEnvironment(input.environment);
  const runtimeFlags = resolveSalesBrainRuntimeFlags({
    environment: resolvedEnvironment,
    env: input.env,
  });
  const serverRecentCarCardsCount = input.pilotSessionContext?.recentCarCards?.length ?? 0;
  const pilotContextPresentServer = serverRecentCarCardsCount > 0;
  const followUpMessage = isPilotBuyerFollowUpMessage(input.userMessage);
  const aiFirst = evaluateBuyerAiFirstEligibility({
    firebaseUid: input.firebaseUid,
    userRole: "buyer",
    environment: resolvedEnvironment,
    env: input.env,
  });

  let pilotInactiveReason = "pilot_active";
  if (!input.payload.pilotPathActive) {
    if (!runtimeFlags.userVisibleEnabled) {
      pilotInactiveReason = "user_visible_disabled";
    } else if (
      typeof input.payload.realProviderGateReason === "string" &&
      input.payload.realProviderGateReason === "pilot_path_inactive"
    ) {
      pilotInactiveReason = "real_provider_gate_pilot_path_inactive";
    } else if (!followUpMessage) {
      pilotInactiveReason = "message_not_followup";
    } else if (!pilotContextPresentServer) {
      pilotInactiveReason = "pilot_context_missing_or_dropped";
    } else {
      pilotInactiveReason = "pilot_resolution_fallback";
    }
  }

  return {
    ...input.payload,
    userVisibleRuntimeDiagnostic: {
      runtimeMode: runtimeFlags.mode,
      provider: runtimeFlags.provider,
      userVisibleEnabled: runtimeFlags.userVisibleEnabled,
      realProviderEnabled: parseTruthy(
        input.env?.[NONGA_AI_USER_VISIBLE_REAL_PROVIDER_ENABLED_ENV]
      ),
      ownerControlledUxEnabled: runtimeFlags.ownerOnlyControlledUxEnabled,
      aiFirstEnabled: runtimeFlags.aiFirstEnabled,
      aiFirstPathActive: aiFirst.aiFirstPathActive,
      aiFirstSliceId: BUYER_AI_FIRST_CONVERSATION_SLICE_ID,
      pilotContextPresentServer,
      serverRecentCarCardsCount,
      followUpMessage,
      pilotInactiveReason,
      guardPolicyVersion: AI_USER_VISIBLE_GUARD_POLICY_VERSION,
      thaiUxTuningSliceId: AI_USER_VISIBLE_THAI_UX_TUNING_EVIDENCE_MARKERS.thaiUxTuningSliceId,
      thaiUxTuningActive: AI_USER_VISIBLE_THAI_UX_TUNING_EVIDENCE_MARKERS.thaiUxTuningActive,
      targetAnswerLengthGuidance:
        AI_USER_VISIBLE_THAI_UX_TUNING_EVIDENCE_MARKERS.targetAnswerLengthGuidance,
      leadPiiCueGuardActive: AI_USER_VISIBLE_THAI_UX_TUNING_EVIDENCE_MARKERS.leadPiiCueGuardActive,
      phoneEchoGuardActive: AI_USER_VISIBLE_THAI_UX_TUNING_EVIDENCE_MARKERS.phoneEchoGuardActive,
      safeConfirmationStepWordingActive:
        AI_USER_VISIBLE_THAI_UX_TUNING_EVIDENCE_MARKERS.safeConfirmationStepWordingActive,
    },
  };
}

function tryOrchestratedReplyFromPilotSession(
  message: string,
  pilotSessionContext?: PilotBuyerSessionContext,
  inventory: ChatInventoryCar[] = []
): OrchestratedChatReply | null {
  const sessionCards = pilotSessionContext?.recentCarCards ?? [];
  if (sessionCards.length === 0 || !isPilotBuyerFollowUpMessage(message)) {
    return null;
  }
  // v22.59 — rehydrate from inventory so follow-up cards keep public images
  // (pilot session serialization intentionally omits image URLs).
  const rawCards = pilotSessionCardsToChatCarCards(sessionCards);
  const carCards =
    inventory.length > 0
      ? rehydrateSessionCarsFromInventory(rawCards, inventory)
      : rawCards;
  return {
    text: "",
    carCards,
    skipGemini: true,
  };
}

export function resolvePilotOrchestrationHint(
  orchestrated: OrchestratedChatReply,
  pilotSessionContext?: PilotBuyerSessionContext
): UserVisiblePilotOrchestrationHint {
  const sessionCards = pilotSessionContext?.recentCarCards ?? [];
  const orchestratedCards = orchestrated.carCards ?? [];
  const orchestratedCount = orchestratedCards.length;
  const sessionCount = sessionCards.length;
  // Prefer freshly orchestrated cards for inventory answers so pilot copy can
  // summarize make/model/price/mileage — not only a count-based template.
  const useOrchestratedCards = orchestratedCount > 0;
  const useSession =
    !useOrchestratedCards &&
    sessionCount > 0 &&
    (sessionCount >= orchestratedCount || orchestratedCount === 0);
  const recentCarCards = useOrchestratedCards
    ? buildPilotSessionContextFromCarCards(orchestratedCards)?.recentCarCards
    : useSession
      ? sessionCards
      : undefined;

  return {
    carCardCount: useOrchestratedCards
      ? orchestratedCount
      : useSession
        ? sessionCount
        : orchestratedCount,
    hasMoreCars: orchestrated.hasMoreCars,
    ...(recentCarCards && recentCarCards.length > 0
      ? { recentCarCards }
      : {}),
    ...(pilotSessionContext?.lastSearchBudgetMax != null
      ? { lastSearchBudgetMax: pilotSessionContext.lastSearchBudgetMax }
      : {}),
  };
}

/** v6.1L.2j — pilot follow-up when orchestrator returns null (no-context safe copy). */
function runPilotFollowUpBridgeWhenNoOrchestrator(
  input: UserVisibleOrchestrationBridgeInput,
  environment: SalesBrainRuntimeEnvironment
): UserVisibleOrchestrationBridgeResult | null {
  if (!isPilotBuyerFollowUpMessage(input.userMessage)) {
    return null;
  }

  const sessionCards = input.pilotSessionContext?.recentCarCards ?? [];
  const rawSessionCards =
    sessionCards.length > 0 ? pilotSessionCardsToChatCarCards(sessionCards) : [];
  const hydratedSessionCards =
    rawSessionCards.length > 0
      ? rehydrateSessionCarsFromInventory(rawSessionCards, input.inventory)
      : [];
  const pilotOrchestration: UserVisiblePilotOrchestrationHint =
    sessionCards.length > 0
      ? {
          carCardCount: sessionCards.length,
          recentCarCards: sessionCards,
          ...(input.pilotSessionContext?.lastSearchBudgetMax != null
            ? { lastSearchBudgetMax: input.pilotSessionContext.lastSearchBudgetMax }
            : {}),
        }
      : { carCardCount: 0 };

  const wired = wireShadowChatPathWithPilot({
    userMessage: input.userMessage,
    legacyUserVisibleResponse: "",
    userRole: input.userRole,
    flowContext: { attachedImageCount: input.attachedImageCount },
    source: "useChat.orchestrated",
    environment,
    env: input.env,
    firebaseUid: input.trustedFirebaseUid,
    pilotOrchestration,
  });

  const text = wired.userVisibleText?.trim()
    ? wired.userVisibleText
    : buildPilotFollowUpNoContextCopy();

  const orchestrated: OrchestratedChatReply = {
    text,
    carCards:
      hydratedSessionCards.length > 0
        ? hydratedSessionCards
        : rawSessionCards.length > 0
          ? rawSessionCards
          : [],
    skipGemini: true,
  };

  return {
    orchestrated,
    payload: buildRedactedPayload(
      orchestrated,
      text,
      wired.pilotPathActive,
      !wired.pilotPathActive
    ),
  };
}

/**
 * Run orchestration + allowlist-gated pilot on server (trusted UID from auth only).
 */
export function runUserVisibleOrchestrationBridge(
  input: UserVisibleOrchestrationBridgeInput
): UserVisibleOrchestrationBridgeResult {
  const environment = resolveBridgeEnvironment(input.environment);
  const aiFirst = evaluateBuyerAiFirstEligibility({
    firebaseUid: input.trustedFirebaseUid,
    userRole: input.userRole,
    environment,
    env: input.env,
  });
  const sessionCards = input.pilotSessionContext?.recentCarCards ?? [];
  // v22.58 — server has no sessionStorage; inject rehydrated pilot cards so
  // named inventory compare resolves the same canonical pair as the client.
  const contextCarsOverride =
    sessionCards.length > 0
      ? rehydrateSessionCarsFromInventory(
          pilotSessionCardsToChatCarCards(sessionCards),
          input.inventory
        )
      : undefined;
  // v22.57 — named inventory compare needs orchestrator + inventory; do not
  // short-circuit to session-only cards (that caused Corolla 2020 vs itself).
  const preferPilotSessionFirst =
    sessionCards.length > 0 &&
    isPilotBuyerFollowUpMessage(input.userMessage) &&
    !isNamedInventoryCompareIntent(input.userMessage);

  let orchestrated = preferPilotSessionFirst
    ? null
    : tryOrchestrateChatReplyCore(input.userMessage, input.inventory, {
        attachedImageCount: input.attachedImageCount,
        displayName: input.displayName,
        ...(contextCarsOverride && contextCarsOverride.length > 0
          ? { contextCarsOverride }
          : {}),
      });

  if (!orchestrated && input.pilotSessionContext) {
    orchestrated = tryOrchestratedReplyFromPilotSession(
      input.userMessage,
      input.pilotSessionContext,
      input.inventory
    );
  }

  if (!orchestrated) {
    const followUp = runPilotFollowUpBridgeWhenNoOrchestrator(input, environment);
    if (followUp) {
      return followUp;
    }
    if (aiFirst.aiFirstPathActive) {
      const rawSessionCards =
        sessionCards.length > 0 ? pilotSessionCardsToChatCarCards(sessionCards) : [];
      const hydratedSessionCards =
        rawSessionCards.length > 0
          ? rehydrateSessionCarsFromInventory(rawSessionCards, input.inventory)
          : [];
      const groundingShell: OrchestratedChatReply = {
        text: "",
        carCards: hydratedSessionCards,
        skipGemini: false,
      };
      return {
        orchestrated: groundingShell,
        payload: buildRedactedPayload(groundingShell, "", true, false),
      };
    }
    return {
      orchestrated: null,
      payload: buildRedactedPayload(null, "", false, true),
    };
  }

  const legacyText = orchestrated.text;

  if (aiFirst.skipMockPilotCopy) {
    return {
      orchestrated: { ...orchestrated, text: legacyText },
      payload: buildRedactedPayload(orchestrated, legacyText, true, false),
    };
  }

  const wired = wireShadowChatPathWithPilot({
    userMessage: input.userMessage,
    legacyUserVisibleResponse: legacyText,
    userRole: input.userRole,
    flowContext: { attachedImageCount: input.attachedImageCount },
    source: "useChat.orchestrated",
    environment,
    env: input.env,
    firebaseUid: input.trustedFirebaseUid,
    pilotOrchestration: resolvePilotOrchestrationHint(orchestrated, input.pilotSessionContext),
  });

  orchestrated.text = wired.userVisibleText;

  return {
    orchestrated,
    payload: buildRedactedPayload(
      orchestrated,
      wired.userVisibleText,
      wired.pilotPathActive,
      wired.fallbackToLegacy
    ),
  };
}

export interface OrchestrateForTrustedAuthInput {
  auth: Pick<ServerAuthContext, "uid" | "displayName" | "role" | "dealerId">;
  userMessage: string;
  attachedImageCount?: number;
  inventory: ChatInventoryCar[];
  env?: Record<string, string | undefined>;
  environment?: SalesBrainRuntimeEnvironment;
  pilotSessionContext?: PilotBuyerSessionContext;
}

export function orchestrateUserVisibleChatForTrustedAuth(
  input: OrchestrateForTrustedAuthInput
): UserVisibleOrchestrationBridgeResult {
  const environment = resolveBridgeEnvironment(input.environment);
  if (environment === "production") {
    const orchestrated = tryOrchestrateChatReplyCore(input.userMessage, input.inventory, {
      attachedImageCount: input.attachedImageCount,
      displayName: input.auth.displayName,
    });
    const legacyText = orchestrated?.text ?? "";
    if (orchestrated) {
      orchestrated.text = legacyText;
    }
    return {
      orchestrated,
      payload: buildRedactedPayload(orchestrated, legacyText, false, true),
    };
  }

  return runUserVisibleOrchestrationBridge({
    userMessage: input.userMessage,
    inventory: input.inventory,
    trustedFirebaseUid: input.auth.uid,
    displayName: input.auth.displayName,
    attachedImageCount: input.attachedImageCount,
    userRole: mapAuthToSalesBrainRole(input.auth as ServerAuthContext),
    environment,
    env: input.env,
    pilotSessionContext: input.pilotSessionContext,
  });
}

function parseOrchestrateBody(body: Record<string, unknown> | undefined): {
  userMessage: string;
  attachedImageCount?: number;
  pilotSessionContext?: PilotBuyerSessionContext;
} | { error: string } {
  const userMessage = String(body?.userMessage ?? "").trim();
  if (!userMessage) {
    return { error: "userMessage is required" };
  }
  if (userMessage.length > MAX_USER_MESSAGE_LENGTH) {
    return { error: "userMessage too long" };
  }
  let attachedImageCount: number | undefined;
  if (body?.attachedImageCount !== undefined && body?.attachedImageCount !== null) {
    const n = Number(body.attachedImageCount);
    if (Number.isFinite(n) && n >= 0) {
      attachedImageCount = Math.min(Math.floor(n), 32);
    }
  }
  const pilotSessionContext = sanitizePilotSessionContext(body?.pilotSessionContext);
  return {
    userMessage,
    attachedImageCount,
    ...(pilotSessionContext ? { pilotSessionContext } : {}),
  };
}

function isParseError(
  parsed: ReturnType<typeof parseOrchestrateBody>
): parsed is { error: string } {
  return "error" in parsed;
}

export async function handleChatUserVisibleOrchestratePost(
  req: Request,
  res: Response,
  deps: { loadChatInventory: () => Promise<ChatInventoryCar[]> }
): Promise<void> {
  try {
    const auth = await getServerAuthContext(req);
    const parsed = parseOrchestrateBody(req.body as Record<string, unknown> | undefined);
    if (isParseError(parsed)) {
      res.status(400).json({ success: false, message: parsed.error });
      return;
    }
    const { userMessage, attachedImageCount, pilotSessionContext } = parsed;
    const inventory = await deps.loadChatInventory();
    const pilotOrchestrationFromSession: UserVisiblePilotOrchestrationHint | undefined =
      pilotSessionContext?.recentCarCards?.length
        ? {
            carCardCount: pilotSessionContext.recentCarCards.length,
            recentCarCards: pilotSessionContext.recentCarCards,
            ...(pilotSessionContext.lastSearchBudgetMax != null
              ? { lastSearchBudgetMax: pilotSessionContext.lastSearchBudgetMax }
              : {}),
          }
        : undefined;

    let result = orchestrateUserVisibleChatForTrustedAuth({
      auth,
      userMessage,
      attachedImageCount,
      inventory,
      env: process.env as Record<string, string | undefined>,
      pilotSessionContext,
    });

    const orchestratedHint = result.orchestrated
      ? resolvePilotOrchestrationHint(result.orchestrated, pilotSessionContext)
      : undefined;
    // v22.57 — prefer freshly orchestrated compare/search cards over stale
    // single-card session context when grounding Gemini.
    const orchestratedCardCount = orchestratedHint?.recentCarCards?.length ?? 0;
    const sessionCardCount = pilotOrchestrationFromSession?.recentCarCards?.length ?? 0;
    const preferOrchestratedGrounding =
      orchestratedCardCount >= 2 ||
      (orchestratedCardCount > 0 && orchestratedCardCount >= sessionCardCount) ||
      isNamedInventoryCompareIntent(userMessage);

    const pilotOrchestrationForRealProvider = preferOrchestratedGrounding
      ? orchestratedHint ?? pilotOrchestrationFromSession
      : pilotOrchestrationFromSession ?? orchestratedHint;

    result = await maybeApplyUserVisibleRealProvider({
      bridgeResult: result,
      userMessage,
      firebaseUid: auth.uid,
      userRole: mapAuthToSalesBrainRole(auth),
      pilotOrchestration: pilotOrchestrationForRealProvider,
      env: process.env as Record<string, string | undefined>,
    });

    const payloadWithMaskedGate = withMaskedUserVisibleGateDiagnostic({
      payload: result.payload,
      firebaseUid: auth.uid,
      env: process.env as Record<string, string | undefined>,
    });
    const payloadWithRuntimeDiagnostic = withSafeUserVisibleRuntimeDiagnostic({
      payload: payloadWithMaskedGate,
      userMessage,
      pilotSessionContext,
      env: process.env as Record<string, string | undefined>,
      firebaseUid: auth.uid,
    });
    const sanitizedUserVisibleText = sanitizeUserVisibleEvidenceText(
      payloadWithRuntimeDiagnostic.userVisibleText
    );
    const missingUserVisibleText = sanitizedUserVisibleText.length === 0;
    const evidenceCapturedAt = new Date().toISOString();

    res.json({
      success: true,
      data: {
        ...payloadWithRuntimeDiagnostic,
        sanitizedUserVisibleText,
        missingUserVisibleText,
        ...(missingUserVisibleText
          ? { missingUserVisibleTextReason: "missing_or_empty_user_visible_text" }
          : {}),
        evidenceCapturedAt,
        carCards: result.orchestrated?.carCards ?? [],
        hasMoreCars: result.orchestrated?.hasMoreCars,
        isDraftPreview: result.orchestrated?.isDraftPreview,
        draftFields: result.orchestrated?.draftFields,
      },
    });
  } catch (err) {
    if (err instanceof ServerAuthError) {
      res.status(err.status).json({ success: false, message: err.message });
      return;
    }
    console.error("[chat-user-visible-orchestrate] failed:", err);
    res.status(500).json({ success: false, message: "Orchestration bridge failed" });
  }
}

export function registerSalesBrainUserVisibleOrchestrationBridgeRoutes(
  app: Express,
  deps: { loadChatInventory: () => Promise<ChatInventoryCar[]> }
): void {
  app.post(SALES_BRAIN_USER_VISIBLE_ORCHESTRATE_ROUTE, (req, res) =>
    handleChatUserVisibleOrchestratePost(req, res, deps)
  );
}
