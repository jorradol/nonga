/**
 * WP-V2U-03B / R1 — Conversation Core server orchestrator tests.
 * Run: .\node_modules\.bin\tsx.cmd scripts/test-conversation-core-orchestrator.mts
 */
import fs from "node:fs";
import path from "node:path";
import {
  CONVERSATION_CORE_POLICY_VERSION,
  validateConversationCoreExecutionContext,
  validateConversationTurnRequest,
  type ConversationCoreExecutionContext,
  type ConversationTurnRequest,
} from "../src/services/conversation-core/index";
import { NONGA_AI_EMERGENCY_KILL_SWITCH_ENV } from "../src/services/ai/salesBrainRuntimeFlags";
import { ServerAuthError, type ServerAuthContext } from "../src/server/serverAuthContext";
import {
  NONGA_CONVERSATION_CORE_ENABLED_ENV,
  failClosedConversationOwnershipVerifier,
  handleConversationCoreTurnPost,
  resolveConversationCoreFeatureFlags,
  runConversationCoreOrchestrator,
  type ConversationCoreOrchestratorResult,
  type ConversationCoreRouteResponse,
  type ConversationOwnershipVerifier,
} from "../src/server/conversation-core";

let passCount = 0;

function pass(label: string): void {
  passCount += 1;
  console.log(`PASS: ${label}`);
}

function assertEqual<T>(label: string, actual: T, expected: T): void {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    console.error(`FAIL [${label}] expected ${expectedJson}, got ${actualJson}`);
    process.exit(1);
  }
  pass(label);
}

function assertTruthy(label: string, value: unknown): void {
  if (!value) {
    console.error(`FAIL [${label}] expected truthy value`);
    process.exit(1);
  }
  pass(label);
}

function assertFalsy(label: string, value: unknown): void {
  if (value) {
    console.error(`FAIL [${label}] expected falsy value`);
    process.exit(1);
  }
  pass(label);
}

const AUTH_UID = "firebase-uid-test-001";
const OTHER_UID = "firebase-uid-other-002";
const CONVERSATION_ID = "conv-orchestrator-001";

function authContext(overrides: Partial<ServerAuthContext> = {}): ServerAuthContext {
  return {
    uid: AUTH_UID,
    email: "buyer@example.com",
    displayName: "Buyer",
    role: "member",
    status: "active",
    memberships: [],
    provider: "firebase",
    verificationMode: "firebase-admin",
    ...overrides,
  };
}

function validTurnBody(overrides: Record<string, unknown> = {}) {
  return {
    conversationId: CONVERSATION_ID,
    messageId: "msg-001",
    userMessage: "อยากได้รถเก๋งราคาไม่เกิน 600000",
    history: [{ role: "user", content: "สวัสดีครับ" }],
    expertMode: "BUYING",
    locale: "th-TH",
    ...overrides,
  };
}

function envReader(values: Record<string, string | undefined>) {
  return (key: string) => values[key];
}

function trustedVerifiedOwnershipMock(ownerActorRef: string): ConversationOwnershipVerifier {
  return {
    async verify() {
      return { status: "verified", ownerActorRef };
    },
  };
}

async function runHandler(
  input: {
    body?: unknown;
    auth?: ServerAuthContext | null;
    authError?: ServerAuthError;
  },
  deps: {
    ownershipVerifier?: ConversationOwnershipVerifier;
    env?: Record<string, string | undefined>;
    validateExecutionContext?: typeof validateConversationCoreExecutionContext;
    orchestrator?: (
      request: ConversationTurnRequest,
      context: ConversationCoreExecutionContext
    ) => ConversationCoreOrchestratorResult;
  } = {}
) {
  return handleConversationCoreTurnPost(
    {
      body: input.body ?? validTurnBody(),
      resolveAuth: async () => {
        if (input.authError) {
          throw input.authError;
        }
        if (!input.auth) {
          throw new ServerAuthError(401, "Authentication required");
        }
        return input.auth;
      },
    },
    {
      ownershipVerifier:
        deps.ownershipVerifier ?? failClosedConversationOwnershipVerifier,
      readEnv: envReader(deps.env ?? {}),
      now: () => 1_700_000_000_000,
      validateExecutionContext: deps.validateExecutionContext,
      orchestrator: deps.orchestrator,
    }
  );
}

// --- Source structure: no prohibited capability surface ---
const orchestratorSource = fs.readFileSync(
  path.join(process.cwd(), "src/server/conversation-core/conversationCoreOrchestrator.ts"),
  "utf8"
);
assertFalsy(
  "structure: orchestrator has no route-handler import",
  orchestratorSource.includes("conversationCoreRouteHandler")
);
assertFalsy(
  "structure: orchestrator has no prohibited legacy callback",
  orchestratorSource.includes("callLegacy")
);
assertFalsy(
  "structure: orchestrator has no prohibited provider callback",
  orchestratorSource.includes("callProvider")
);
assertFalsy(
  "structure: orchestrator has no prohibited tool callback",
  orchestratorSource.includes("callTools")
);
assertFalsy(
  "structure: orchestrator has no prohibited persistence callback",
  orchestratorSource.includes("persistMessage")
);
assertFalsy(
  "structure: orchestrator source cannot emit legacy-delegate",
  orchestratorSource.includes('"legacy-delegate"')
);

// --- Feature flags ---
const flagsMissing = resolveConversationCoreFeatureFlags({ readEnv: envReader({}) });
assertFalsy("flags: missing master flag => core OFF", flagsMissing.coreEnabled);
assertEqual(
  "flags: missing master flag => legacy core-disabled",
  flagsMissing.legacyDelegateReason,
  "core-disabled"
);

const flagsFalse = resolveConversationCoreFeatureFlags({
  readEnv: envReader({ [NONGA_CONVERSATION_CORE_ENABLED_ENV]: "false" }),
});
assertFalsy("flags: explicit false => core OFF", flagsFalse.coreEnabled);

const flagsMalformed = resolveConversationCoreFeatureFlags({
  readEnv: envReader({ [NONGA_CONVERSATION_CORE_ENABLED_ENV]: "maybe" }),
});
assertFalsy("flags: malformed value => core OFF", flagsMalformed.coreEnabled);

const flagsTrue = resolveConversationCoreFeatureFlags({
  readEnv: envReader({ [NONGA_CONVERSATION_CORE_ENABLED_ENV]: "true" }),
});
assertTruthy("flags: explicit true => core ON", flagsTrue.coreEnabled);
assertEqual("flags: core ON snapshot has coreEnabled true", flagsTrue.featureFlagSnapshot.coreEnabled, true);
assertFalsy("flags: gemini OFF in 03B", flagsTrue.featureFlagSnapshot.geminiEnabled);
assertFalsy("flags: tools OFF in 03B", flagsTrue.featureFlagSnapshot.toolsEnabled);
assertFalsy(
  "flags: workspace actions OFF in 03B",
  flagsTrue.featureFlagSnapshot.workspaceActionsEnabled
);

const flagsKill = resolveConversationCoreFeatureFlags({
  readEnv: envReader({
    [NONGA_CONVERSATION_CORE_ENABLED_ENV]: "true",
    [NONGA_AI_EMERGENCY_KILL_SWITCH_ENV]: "true",
  }),
});
assertFalsy("flags: emergency kill switch => core OFF", flagsKill.coreEnabled);
assertEqual(
  "flags: emergency kill => legacy emergency-kill-switch",
  flagsKill.legacyDelegateReason,
  "emergency-kill-switch"
);
assertFalsy(
  "flags: emergency kill overrides core even when core requested",
  flagsKill.coreEnabled
);

// --- Auth disclosure ---
const missingAuth = await runHandler({ auth: null });
assertEqual("auth: missing auth => 401", missingAuth.status, 401);
assertEqual(
  "auth: missing auth generic message",
  (missingAuth.body as { message?: string }).message,
  "Authentication required"
);

const sensitive401 = await runHandler({
  authError: new ServerAuthError(401, "sensitive-token-detail"),
});
assertEqual("auth disclosure: invalid auth => 401", sensitive401.status, 401);
assertEqual(
  "auth disclosure: 401 generic message",
  (sensitive401.body as { message?: string }).message,
  "Authentication required"
);
assertFalsy(
  "auth disclosure: 401 does not leak sensitive detail",
  JSON.stringify(sensitive401.body).includes("sensitive-token-detail")
);

const sensitive403 = await runHandler({
  authError: new ServerAuthError(403, "sensitive-membership-detail"),
});
assertEqual("auth disclosure: forbidden auth => 403", sensitive403.status, 403);
assertEqual(
  "auth disclosure: 403 generic message",
  (sensitive403.body as { message?: string }).message,
  "Access denied"
);
assertFalsy(
  "auth disclosure: 403 does not leak sensitive detail",
  JSON.stringify(sensitive403.body).includes("sensitive-membership-detail")
);

// --- Request validation ---
const invalidBody = await runHandler({
  auth: authContext(),
  body: { conversationId: CONVERSATION_ID },
});
assertEqual("request: invalid body => 400", invalidBody.status, 400);
assertFalsy(
  "request: invalid body does not echo raw value",
  JSON.stringify(invalidBody.body).includes("conversationId")
);

const forbiddenField = await runHandler({
  auth: authContext(),
  body: validTurnBody({ featureFlags: { coreEnabled: true } }),
});
assertEqual("request: forbidden server-owned field => 400", forbiddenField.status, 400);
assertFalsy(
  "request: forbidden field response does not echo raw value",
  JSON.stringify(forbiddenField.body).includes("coreEnabled")
);

// --- Ownership ---
let trustedVerifierCalls = 0;
const trustedVerifiedOwnershipVerifier: ConversationOwnershipVerifier = {
  async verify(input) {
    trustedVerifierCalls += 1;
    return { status: "verified", ownerActorRef: input.authenticatedActorRef };
  },
};

const trustedVerifiedPath = await runHandler(
  {
    auth: authContext(),
    body: validTurnBody(),
  },
  {
    ownershipVerifier: trustedVerifiedOwnershipVerifier,
    env: { [NONGA_CONVERSATION_CORE_ENABLED_ENV]: "true" },
  }
);
assertEqual(
  "ownership: trusted verified mock routes through server verifier",
  trustedVerifiedPath.status,
  503
);
assertEqual(
  "ownership: trusted verified path returns honest-unavailable",
  (trustedVerifiedPath.body as ConversationCoreRouteResponse).route,
  "honest-unavailable"
);
assertEqual(
  "ownership: trusted verified path error code core-not-ready",
  (trustedVerifiedPath.body as ConversationCoreRouteResponse & { error?: { code: string } }).error
    ?.code,
  "core-not-ready"
);
assertTruthy("ownership: trusted verifier invoked for core ON path", trustedVerifierCalls > 0);

let executionContextValidated = false;
const validatedPath = await runHandler(
  {
    auth: authContext(),
    body: validTurnBody(),
  },
  {
    ownershipVerifier: trustedVerifiedOwnershipMock(AUTH_UID),
    env: { [NONGA_CONVERSATION_CORE_ENABLED_ENV]: "true" },
    validateExecutionContext: (raw) => {
      executionContextValidated = true;
      return validateConversationCoreExecutionContext(raw);
    },
  }
);
assertTruthy(
  "ownership: execution context validation called on verified path",
  executionContextValidated
);
assertEqual("ownership: verified ownership => 503 core-not-ready", validatedPath.status, 503);

let contextValidateCallsOnUnavailable = 0;
await runHandler(
  {
    auth: authContext(),
    body: validTurnBody(),
  },
  {
    ownershipVerifier: failClosedConversationOwnershipVerifier,
    env: { [NONGA_CONVERSATION_CORE_ENABLED_ENV]: "true" },
    validateExecutionContext: (raw) => {
      contextValidateCallsOnUnavailable += 1;
      return validateConversationCoreExecutionContext(raw);
    },
  }
);
assertEqual(
  "ownership: context validator not called when ownership unavailable",
  contextValidateCallsOnUnavailable,
  0
);

const mismatch = await runHandler(
  {
    auth: authContext(),
    body: validTurnBody(),
  },
  {
    ownershipVerifier: trustedVerifiedOwnershipMock(OTHER_UID),
    env: { [NONGA_CONVERSATION_CORE_ENABLED_ENV]: "true" },
  }
);
assertEqual("ownership: actor mismatch => 403", mismatch.status, 403);
assertEqual(
  "ownership: mismatch code ownership-unverified",
  (mismatch.body as ConversationCoreRouteResponse & { error?: { code: string } }).error?.code,
  "ownership-unverified"
);

const denied = await runHandler(
  {
    auth: authContext(),
    body: validTurnBody(),
  },
  {
    ownershipVerifier: { async verify() { return { status: "denied" }; } },
    env: { [NONGA_CONVERSATION_CORE_ENABLED_ENV]: "true" },
  }
);
assertEqual("ownership: denied => 403", denied.status, 403);

const unavailable = await runHandler(
  {
    auth: authContext(),
    body: validTurnBody(),
  },
  {
    ownershipVerifier: failClosedConversationOwnershipVerifier,
    env: { [NONGA_CONVERSATION_CORE_ENABLED_ENV]: "true" },
  }
);
assertEqual("ownership: default fail-closed verifier => 503", unavailable.status, 503);
assertEqual(
  "ownership: unavailable code ownership-unavailable",
  (unavailable.body as ConversationCoreRouteResponse & { error?: { code: string } }).error?.code,
  "ownership-unavailable"
);

// --- Route ownership ---
const coreOff = await runHandler({
  auth: authContext(),
  body: validTurnBody(),
});
assertEqual("routing: core OFF => 200", coreOff.status, 200);
assertEqual(
  "routing: core OFF => legacy-delegate",
  (coreOff.body as ConversationCoreRouteResponse).route,
  "legacy-delegate"
);
assertEqual(
  "routing: core OFF reason core-disabled",
  (coreOff.body as ConversationCoreRouteResponse & { reason?: string }).reason,
  "core-disabled"
);

let verifyCallsWhenCoreOff = 0;
await runHandler(
  {
    auth: authContext(),
    body: validTurnBody(),
  },
  {
    ownershipVerifier: {
      async verify() {
        verifyCallsWhenCoreOff += 1;
        return { status: "unavailable" };
      },
    },
  }
);
assertEqual(
  "routing: ownership verifier not called when core OFF",
  verifyCallsWhenCoreOff,
  0
);

const emergencyKill = await runHandler(
  {
    auth: authContext(),
    body: validTurnBody(),
  },
  {
    env: {
      [NONGA_CONVERSATION_CORE_ENABLED_ENV]: "true",
      [NONGA_AI_EMERGENCY_KILL_SWITCH_ENV]: "1",
    },
  }
);
assertEqual("routing: emergency kill => 200 legacy-delegate", emergencyKill.status, 200);
assertEqual(
  "routing: emergency kill reason",
  (emergencyKill.body as ConversationCoreRouteResponse & { reason?: string }).reason,
  "emergency-kill-switch"
);

let verifyCallsWhenEmergencyKill = 0;
await runHandler(
  {
    auth: authContext(),
    body: validTurnBody(),
  },
  {
    ownershipVerifier: {
      async verify() {
        verifyCallsWhenEmergencyKill += 1;
        return { status: "unavailable" };
      },
    },
    env: {
      [NONGA_CONVERSATION_CORE_ENABLED_ENV]: "true",
      [NONGA_AI_EMERGENCY_KILL_SWITCH_ENV]: "yes",
    },
  }
);
assertEqual(
  "routing: ownership verifier not called when emergency kill active",
  verifyCallsWhenEmergencyKill,
  0
);

const coreOnVerified = await runHandler(
  {
    auth: authContext(),
    body: validTurnBody(),
  },
  {
    ownershipVerifier: trustedVerifiedOwnershipMock(AUTH_UID),
    env: { [NONGA_CONVERSATION_CORE_ENABLED_ENV]: "true" },
  }
);
assertEqual("routing: core ON verified => 503", coreOnVerified.status, 503);
assertEqual(
  "routing: core ON does not legacy-delegate",
  (coreOnVerified.body as ConversationCoreRouteResponse).route,
  "honest-unavailable"
);

const turnFixture = validateConversationTurnRequest(validTurnBody());
if (!turnFixture.ok) {
  throw new Error("fixture invalid");
}
const contextFixture = validateConversationCoreExecutionContext({
  conversationId: CONVERSATION_ID,
  actorScope: { kind: "authenticated", actorRef: AUTH_UID, role: "client" },
  conversationOwnership: { ownerActorRef: AUTH_UID, bindingVerified: true },
  featureFlags: {
    coreEnabled: true,
    geminiEnabled: false,
    toolsEnabled: false,
    workspaceActionsEnabled: false,
  },
  toolAllowlist: [],
  receivedAtMs: 1,
  policyVersion: CONVERSATION_CORE_POLICY_VERSION,
});
if (!contextFixture.ok) {
  throw new Error("fixture invalid");
}

const orchestratorOnly: ConversationCoreOrchestratorResult = runConversationCoreOrchestrator(
  turnFixture.value,
  contextFixture.value
);
assertEqual(
  "orchestrator boundary: skeleton route is honest-unavailable",
  orchestratorOnly.route,
  "honest-unavailable"
);
assertEqual(
  "orchestrator boundary: skeleton error code core-not-ready",
  orchestratorOnly.error.code,
  "core-not-ready"
);
pass("orchestrator boundary: result type excludes legacy-delegate at compile time");

console.log(`\nConversation Core orchestrator tests passed (${passCount} assertions).`);
