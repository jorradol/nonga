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
} from "./chat/chatPilotSessionContext";
import { isPilotBuyerFollowUpMessage } from "./chat/chatPilotBuyerFollowUp";
import { buildPilotFollowUpNoContextCopy } from "./salesBrainUserVisiblePilotBuyerCopy";
import type { UserVisiblePilotOrchestrationHint } from "./salesBrainUserVisiblePilotTypes";
import { maybeApplyUserVisibleRealProvider } from "./salesBrainUserVisibleRealProvider";
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
    pilotContextPresentServer: boolean;
    serverRecentCarCardsCount: number;
    followUpMessage: boolean;
    pilotInactiveReason: string;
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
}): RedactedUserVisibleOrchestrationPayload {
  const resolvedEnvironment = resolveBridgeEnvironment(input.environment);
  const runtimeFlags = resolveSalesBrainRuntimeFlags({
    environment: resolvedEnvironment,
    env: input.env,
  });
  const serverRecentCarCardsCount = input.pilotSessionContext?.recentCarCards?.length ?? 0;
  const pilotContextPresentServer = serverRecentCarCardsCount > 0;
  const followUpMessage = isPilotBuyerFollowUpMessage(input.userMessage);

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
      pilotContextPresentServer,
      serverRecentCarCardsCount,
      followUpMessage,
      pilotInactiveReason,
    },
  };
}

function tryOrchestratedReplyFromPilotSession(
  message: string,
  pilotSessionContext?: PilotBuyerSessionContext
): OrchestratedChatReply | null {
  const sessionCards = pilotSessionContext?.recentCarCards ?? [];
  if (sessionCards.length === 0 || !isPilotBuyerFollowUpMessage(message)) {
    return null;
  }
  return {
    text: "",
    carCards: pilotSessionCardsToChatCarCards(sessionCards),
    skipGemini: true,
  };
}

export function resolvePilotOrchestrationHint(
  orchestrated: OrchestratedChatReply,
  pilotSessionContext?: PilotBuyerSessionContext
): UserVisiblePilotOrchestrationHint {
  const sessionCards = pilotSessionContext?.recentCarCards ?? [];
  const orchestratedCount = orchestrated.carCards?.length ?? 0;
  const sessionCount = sessionCards.length;
  const useSession = sessionCount > 0 && (sessionCount >= orchestratedCount || orchestratedCount === 0);

  return {
    carCardCount: useSession ? sessionCount : orchestratedCount,
    hasMoreCars: orchestrated.hasMoreCars,
    ...(useSession ? { recentCarCards: sessionCards } : {}),
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
      sessionCards.length > 0
        ? pilotSessionCardsToChatCarCards(sessionCards)
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
  const sessionCards = input.pilotSessionContext?.recentCarCards ?? [];
  const preferPilotSessionFirst =
    sessionCards.length > 0 && isPilotBuyerFollowUpMessage(input.userMessage);

  let orchestrated = preferPilotSessionFirst
    ? null
    : tryOrchestrateChatReplyCore(input.userMessage, input.inventory, {
        attachedImageCount: input.attachedImageCount,
        displayName: input.displayName,
      });

  if (!orchestrated && input.pilotSessionContext) {
    orchestrated = tryOrchestratedReplyFromPilotSession(
      input.userMessage,
      input.pilotSessionContext
    );
  }

  if (!orchestrated) {
    const followUp = runPilotFollowUpBridgeWhenNoOrchestrator(input, environment);
    if (followUp) {
      return followUp;
    }
    return {
      orchestrated: null,
      payload: buildRedactedPayload(null, "", false, true),
    };
  }

  const legacyText = orchestrated.text;
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
    const pilotOrchestration: UserVisiblePilotOrchestrationHint | undefined =
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

    const pilotOrchestrationForRealProvider =
      pilotOrchestration ??
      (result.orchestrated
        ? resolvePilotOrchestrationHint(result.orchestrated, pilotSessionContext)
        : undefined);

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
