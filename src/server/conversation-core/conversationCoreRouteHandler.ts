/**
 * WP-V2U-03B / R1 — Authenticated Conversation Core turn route handler.
 */
import type { Express, Request, Response } from "express";
import {
  CONVERSATION_CORE_POLICY_VERSION,
  validateConversationCoreExecutionContext,
  validateConversationTurnRequest,
  type ConversationCoreExecutionContext,
  type ConversationCoreResult,
  type ConversationTurnRequest,
  type ValidationResult,
} from "../../services/conversation-core/index";
import {
  getServerAuthContext,
  ServerAuthError,
  type ServerAuthContext,
} from "../serverAuthContext";
import type { InventoryRepository } from "../repositories/inventoryRepository";
import type { AuthRole } from "../../utils/rbac";
import { resolveConversationCoreFeatureFlags } from "./conversationCoreFeatureFlags";
import { evaluateConversationCorePilotEligibility } from "./conversationCorePilotEligibility";
import {
  resolveConversationCoreLiveServerActivation,
  type ConversationCoreLiveServerActivationInput,
} from "./conversationCoreLiveServerActivation";
import {
  runConversationCoreOrchestrator,
  type ConversationCoreOrchestratorActivation,
  type ConversationCoreOrchestratorResult,
} from "./conversationCoreOrchestrator";

export const CONVERSATION_CORE_TURN_ROUTE = "/api/ai/conversation-core/turn";

export type ConversationCoreHonestUnavailableCode =
  | "ownership-unverified"
  | "ownership-unavailable"
  | "core-not-ready"
  | "internal-error";

export type ConversationCoreRouteResponse =
  | {
      route: "legacy-delegate";
      reason: "core-disabled" | "emergency-kill-switch";
    }
  | {
      route: "honest-unavailable";
      error: { code: ConversationCoreHonestUnavailableCode };
    }
  | {
      route: "completed";
      result: ConversationCoreResult;
    };

export type ConversationOwnershipVerifyResult =
  | { status: "verified"; ownerActorRef: string }
  | { status: "denied" }
  | { status: "unavailable" };

export interface ConversationOwnershipVerifier {
  verify(input: {
    conversationId: string;
    authenticatedActorRef: string;
  }): ConversationOwnershipVerifyResult | Promise<ConversationOwnershipVerifyResult>;
}

export const failClosedConversationOwnershipVerifier: ConversationOwnershipVerifier = {
  async verify() {
    return { status: "unavailable" };
  },
};

export interface ConversationCoreRouteHandlerDeps {
  ownershipVerifier: ConversationOwnershipVerifier;
  readEnv: (key: string) => string | undefined;
  now?: () => number;
  orchestrator?: (
    request: ConversationTurnRequest,
    context: ConversationCoreExecutionContext
  ) => ConversationCoreOrchestratorResult | Promise<ConversationCoreOrchestratorResult>;
  orchestratorActivation?: ConversationCoreOrchestratorActivation;
  inventoryRepository?: InventoryRepository | null;
  createSdkSeam?: ConversationCoreLiveServerActivationInput["createSdkSeam"];
  createInventoryRepository?: ConversationCoreLiveServerActivationInput["createInventoryRepository"];
  validateTurnRequest?: (raw: unknown) => ValidationResult<ConversationTurnRequest>;
  validateExecutionContext?: (
    raw: unknown
  ) => ValidationResult<ConversationCoreExecutionContext>;
}

function mapAuthRoleToActorScopeRole(
  role: AuthRole
): "client" | "dealer" | "admin" {
  if (role === "admin" || role === "superadmin") {
    return "admin";
  }
  if (role === "dealer") {
    return "dealer";
  }
  return "client";
}

function invalidRequestResponse(): { status: 400; body: { success: false; message: string } } {
  return {
    status: 400,
    body: { success: false, message: "Invalid conversation turn request" },
  };
}

function mapOrchestratorResultToRouteResponse(
  result: ConversationCoreOrchestratorResult
): ConversationCoreRouteResponse {
  if (result.route === "completed") {
    return {
      route: "completed",
      result: result.result,
    };
  }
  return {
    route: "honest-unavailable",
    error: { code: result.error.code },
  };
}

function authFailureResponse(
  err: ServerAuthError
): { status: 401 | 403; body: { success: false; message: string } } {
  const status: 401 | 403 = err.status === 403 ? 403 : 401;
  return {
    status,
    body: {
      success: false,
      message: status === 403 ? "Access denied" : "Authentication required",
    },
  };
}

export async function handleConversationCoreTurnPost(
  input: {
    body: unknown;
    resolveAuth: () => Promise<ServerAuthContext>;
  },
  deps: ConversationCoreRouteHandlerDeps
): Promise<
  | { status: number; body: ConversationCoreRouteResponse }
  | { status: 400 | 401 | 403; body: { success: false; message: string } }
> {
  let auth: ServerAuthContext;
  try {
    auth = await input.resolveAuth();
  } catch (err) {
    if (err instanceof ServerAuthError) {
      return authFailureResponse(err);
    }
    return {
      status: 401,
      body: { success: false, message: "Authentication required" },
    };
  }

  const validateTurn = deps.validateTurnRequest ?? validateConversationTurnRequest;
  const turnValidation = validateTurn(input.body);
  if (!turnValidation.ok) {
    return invalidRequestResponse();
  }
  const turnRequest = turnValidation.value;

  const flags = resolveConversationCoreFeatureFlags({ readEnv: deps.readEnv });
  if (!flags.coreEnabled) {
    return {
      status: 200,
      body: {
        route: "legacy-delegate",
        reason: flags.legacyDelegateReason ?? "core-disabled",
      },
    };
  }

  const pilotEligibility = evaluateConversationCorePilotEligibility({
    authenticatedActorRef: auth.uid,
    readEnv: deps.readEnv,
  });
  if (!pilotEligibility.eligible) {
    return {
      status: 200,
      body: {
        route: "legacy-delegate",
        reason: "core-disabled",
      },
    };
  }

  const ownership = await deps.ownershipVerifier.verify({
    conversationId: turnRequest.conversationId,
    authenticatedActorRef: auth.uid,
  });

  if (ownership.status === "unavailable") {
    return {
      status: 503,
      body: {
        route: "honest-unavailable",
        error: { code: "ownership-unavailable" },
      },
    };
  }

  if (ownership.status === "denied") {
    return {
      status: 403,
      body: {
        route: "honest-unavailable",
        error: { code: "ownership-unverified" },
      },
    };
  }

  if (ownership.ownerActorRef !== auth.uid) {
    return {
      status: 403,
      body: {
        route: "honest-unavailable",
        error: { code: "ownership-unverified" },
      },
    };
  }

  const validateContext = deps.validateExecutionContext ?? validateConversationCoreExecutionContext;
  const executionContextCandidate = {
    conversationId: turnRequest.conversationId,
    actorScope: {
      kind: "authenticated" as const,
      actorRef: auth.uid,
      role: mapAuthRoleToActorScopeRole(auth.role),
    },
    conversationOwnership: {
      ownerActorRef: ownership.ownerActorRef,
      bindingVerified: true as const,
    },
    featureFlags: flags.featureFlagSnapshot,
    toolAllowlist: [] as const,
    receivedAtMs: deps.now?.() ?? Date.now(),
    policyVersion: CONVERSATION_CORE_POLICY_VERSION,
  };

  const contextValidation = validateContext(executionContextCandidate);
  if (!contextValidation.ok) {
    return {
      status: 503,
      body: {
        route: "honest-unavailable",
        error: { code: "internal-error" },
      },
    };
  }

  const activation =
    typeof deps.orchestrator === "function"
      ? deps.orchestratorActivation
      : (deps.orchestratorActivation ??
        resolveConversationCoreLiveServerActivation({
          readEnv: deps.readEnv,
          inventoryRepository: deps.inventoryRepository,
          createSdkSeam: deps.createSdkSeam,
          createInventoryRepository: deps.createInventoryRepository,
          expertMode: turnRequest.expertMode ?? "AUTO",
        }));
  const orchestrator =
    deps.orchestrator ??
    ((request, context) => runConversationCoreOrchestrator(request, context, activation));
  const orchestratorResult = await orchestrator(turnRequest, contextValidation.value);

  const body = mapOrchestratorResultToRouteResponse(orchestratorResult);
  return {
    status: body.route === "completed" ? 200 : 503,
    body,
  };
}

export interface RegisterConversationCoreRoutesOptions {
  ownershipVerifier?: ConversationOwnershipVerifier;
  readEnv?: (key: string) => string | undefined;
  inventoryRepository?: InventoryRepository | null;
}

export function registerConversationCoreRoutes(
  app: Express,
  options: RegisterConversationCoreRoutesOptions = {}
): void {
  const handlerDeps: ConversationCoreRouteHandlerDeps = {
    ownershipVerifier:
      options.ownershipVerifier ?? failClosedConversationOwnershipVerifier,
    readEnv: options.readEnv ?? ((key) => process.env[key]),
    inventoryRepository: options.inventoryRepository,
  };

  app.post(CONVERSATION_CORE_TURN_ROUTE, async (req: Request, res: Response) => {
    try {
      const result = await handleConversationCoreTurnPost(
        {
          body: req.body,
          resolveAuth: () => getServerAuthContext(req),
        },
        handlerDeps
      );
      return res.status(result.status).json(result.body);
    } catch (err) {
      if (err instanceof ServerAuthError) {
        const status: 401 | 403 = err.status === 403 ? 403 : 401;
        return res.status(status).json({
          success: false,
          message: status === 403 ? "Access denied" : "Authentication required",
        });
      }
      console.error("[conversation-core-turn] internal failure");
      return res.status(503).json({
        route: "honest-unavailable",
        error: { code: "internal-error" },
      });
    }
  });
}
