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
import type { SalesBrainRuntimeEnvironment } from "./salesBrainRuntimeFlags";
import type { SalesBrainUserRole } from "./salesBrainTypes";

export const SALES_BRAIN_USER_VISIBLE_ORCHESTRATE_ROUTE =
  "/api/ai/chat-user-visible-orchestrate";

export const USER_VISIBLE_ORCHESTRATION_BRIDGE_SLICE_ID = "v6.1L.2c";

const MAX_USER_MESSAGE_LENGTH = 4000;

export interface UserVisibleOrchestrationBridgeInput {
  userMessage: string;
  inventory: ChatInventoryCar[];
  trustedFirebaseUid: string;
  displayName?: string;
  attachedImageCount?: number;
  userRole: SalesBrainUserRole;
  environment?: SalesBrainRuntimeEnvironment;
  env?: Record<string, string | undefined>;
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

/**
 * Run orchestration + allowlist-gated pilot on server (trusted UID from auth only).
 */
export function runUserVisibleOrchestrationBridge(
  input: UserVisibleOrchestrationBridgeInput
): UserVisibleOrchestrationBridgeResult {
  const environment = resolveBridgeEnvironment(input.environment);
  const orchestrated = tryOrchestrateChatReplyCore(input.userMessage, input.inventory, {
    attachedImageCount: input.attachedImageCount,
    displayName: input.displayName,
  });

  if (!orchestrated) {
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
    pilotOrchestration: {
      carCardCount: orchestrated.carCards?.length ?? 0,
      hasMoreCars: orchestrated.hasMoreCars,
    },
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
  });
}

function parseOrchestrateBody(body: Record<string, unknown> | undefined): {
  userMessage: string;
  attachedImageCount?: number;
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
  return { userMessage, attachedImageCount };
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
    const { userMessage, attachedImageCount } = parsed;
    const inventory = await deps.loadChatInventory();
    const result = orchestrateUserVisibleChatForTrustedAuth({
      auth,
      userMessage,
      attachedImageCount,
      inventory,
      env: process.env as Record<string, string | undefined>,
    });

    res.json({
      success: true,
      data: {
        ...result.payload,
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
