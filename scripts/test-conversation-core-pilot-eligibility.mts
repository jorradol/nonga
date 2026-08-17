/**
 * WP-V2U-03E2D2C2C2C-R1 — Conversation Core pilot eligibility + spoof resistance.
 * Run: .\node_modules\.bin\tsx.cmd scripts/test-conversation-core-pilot-eligibility.mts
 */
import { readFileSync } from "node:fs";
import { INTERNAL_TESTER_UIDS } from "../src/config/ai-first-allowlist";
import { NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV } from "../src/services/ai/salesBrainRuntimeFlags";
import { ServerAuthError, type ServerAuthContext } from "../src/server/serverAuthContext";
import {
  CONVERSATION_TURN_CLIENT_FORBIDDEN_KEYS,
  validateConversationTurnRequest,
} from "../src/services/conversation-core/index";
import {
  evaluateConversationCorePilotEligibility,
  failClosedConversationOwnershipVerifier,
  handleConversationCoreTurnPost,
  NONGA_CONVERSATION_CORE_ENABLED_ENV,
  NONGA_CONVERSATION_CORE_PILOT_UIDS_ENV,
  type ConversationCoreRouteResponse,
  type ConversationOwnershipVerifier,
} from "../src/server/conversation-core";

const AUTH_UID = "firebase-uid-test-001";
const OTHER_UID = "firebase-uid-other-002";
const CONVERSATION_ID = "conv-pilot-eligibility-001";

let passCount = 0;

function pass(label: string): void {
  passCount += 1;
  console.log(`PASS: ${label}`);
}

function assertEqual<T>(label: string, actual: T, expected: T): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    console.error(`FAIL [${label}] expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    process.exit(1);
  }
  pass(label);
}

function assertTruthy(label: string, value: unknown): void {
  if (!value) {
    console.error(`FAIL [${label}] expected truthy`);
    process.exit(1);
  }
  pass(label);
}

function assertFalsy(label: string, value: unknown): void {
  if (value) {
    console.error(`FAIL [${label}] expected falsy`);
    process.exit(1);
  }
  pass(label);
}

function read(rel: string): string {
  return readFileSync(rel, "utf8");
}

function authContext(uid = AUTH_UID): ServerAuthContext {
  return {
    uid,
    email: "redacted@example.test",
    displayName: "Redacted",
    role: "member",
    status: "active",
    memberships: [],
    provider: "firebase",
    verificationMode: "firebase-admin",
  };
}

function validTurnBody(): Record<string, unknown> {
  return {
    conversationId: CONVERSATION_ID,
    messageId: "msg-pilot-001",
    userMessage: "สวัสดีครับ",
    history: [{ role: "user", content: "สวัสดีครับ" }],
  };
}

function trustedVerifiedOwnershipMock(ownerActorRef: string): ConversationOwnershipVerifier {
  return {
    async verify() {
      return { status: "verified", ownerActorRef };
    },
  };
}

async function runHandler(input: {
  body?: unknown;
  auth?: ServerAuthContext | null;
  env?: Record<string, string | undefined>;
  ownershipVerifier?: ConversationOwnershipVerifier;
}) {
  return handleConversationCoreTurnPost(
    {
      body: input.body ?? validTurnBody(),
      resolveAuth: async () => {
        if (!input.auth) {
          throw new ServerAuthError(401, "Authentication required");
        }
        return input.auth;
      },
    },
    {
      ownershipVerifier:
        input.ownershipVerifier ?? failClosedConversationOwnershipVerifier,
      readEnv: (key) => (input.env ?? {})[key],
      now: () => 1_700_000_000_000,
    }
  );
}

const eligibilitySource = read("src/server/conversation-core/conversationCorePilotEligibility.ts");
const routeSource = read("src/server/conversation-core/conversationCoreRouteHandler.ts");

assertTruthy(
  "source: eligibility uses canonical allowlist evaluator",
  eligibilitySource.includes("evaluateAiFirstAllowlist")
);
assertTruthy(
  "source: eligibility uses dedicated Core allowlist env",
  eligibilitySource.includes("NONGA_CONVERSATION_CORE_PILOT_UIDS")
);
assertTruthy(
  "source: eligibility stays production-strict",
  eligibilitySource.includes('environment: "production"')
);
assertFalsy("source: eligibility has no console.log", /console\.log/.test(eligibilitySource));
assertFalsy("source: eligibility has no console.error", /console\.error/.test(eligibilitySource));
assertFalsy("source: eligibility has no fetch", /\bfetch\(/.test(eligibilitySource));
assertFalsy(
  "source: eligibility does not read client body",
  eligibilitySource.includes("req.body") || eligibilitySource.includes("userMessage")
);
assertFalsy(
  "source: eligibility does not import Gemini",
  /conversationCoreGemini/.test(eligibilitySource)
);
assertTruthy(
  "source: route wires eligibility after flags",
  routeSource.includes("evaluateConversationCorePilotEligibility")
);

const defaultEligibility = evaluateConversationCorePilotEligibility({
  authenticatedActorRef: AUTH_UID,
  readEnv: () => undefined,
});
assertEqual("default empty allowlist is not eligible", defaultEligibility.eligible, false);
assertEqual("default empty reason", defaultEligibility.reason, "allowlist-empty");
assertFalsy(
  "eligibility result has no uid field",
  Object.prototype.hasOwnProperty.call(defaultEligibility, "uid") ||
    Object.prototype.hasOwnProperty.call(defaultEligibility, "authenticatedActorRef")
);
assertFalsy(
  "serialized eligibility has no actor uid",
  JSON.stringify(defaultEligibility).includes(AUTH_UID)
);

const allowlisted = evaluateConversationCorePilotEligibility({
  authenticatedActorRef: AUTH_UID,
  readEnv: (key) =>
    ({ [NONGA_CONVERSATION_CORE_PILOT_UIDS_ENV]: AUTH_UID })[key],
});
assertEqual("allowlisted authenticated uid is eligible", allowlisted.eligible, true);

const otherUid = evaluateConversationCorePilotEligibility({
  authenticatedActorRef: AUTH_UID,
  readEnv: (key) =>
    ({ [NONGA_CONVERSATION_CORE_PILOT_UIDS_ENV]: OTHER_UID })[key],
});
assertEqual("non-matching uid is not eligible", otherUid.eligible, false);
assertEqual("non-matching reason", otherUid.reason, "not-allowlisted");

const userVisibleOnly = evaluateConversationCorePilotEligibility({
  authenticatedActorRef: AUTH_UID,
  readEnv: (key) =>
    ({ [NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV]: AUTH_UID })[key],
});
assertEqual(
  "user-visible allowlist does not enroll Conversation Core",
  userVisibleOnly.eligible,
  false
);

const ownerAdminEnv = evaluateConversationCorePilotEligibility({
  authenticatedActorRef: AUTH_UID,
  readEnv: (key) =>
    ({
      NONGA_TEST_ADMIN_UID: AUTH_UID,
      NONGA_STAGING_ADMIN_UID: AUTH_UID,
    })[key],
});
assertEqual("owner/admin env keys do not enroll Core", ownerAdminEnv.eligible, false);

const synthetic = evaluateConversationCorePilotEligibility({
  authenticatedActorRef: INTERNAL_TESTER_UIDS[0],
  readEnv: () => undefined,
});
assertEqual("committed synthetic tester is not auto-eligible", synthetic.eligible, false);

const missingActor = evaluateConversationCorePilotEligibility({
  authenticatedActorRef: "   ",
  readEnv: (key) =>
    ({ [NONGA_CONVERSATION_CORE_PILOT_UIDS_ENV]: AUTH_UID })[key],
});
assertEqual("blank actor is not eligible", missingActor.eligible, false);
assertEqual("blank actor reason", missingActor.reason, "unauthenticated");

const commaList = evaluateConversationCorePilotEligibility({
  authenticatedActorRef: AUTH_UID,
  readEnv: (key) =>
    ({
      [NONGA_CONVERSATION_CORE_PILOT_UIDS_ENV]: ` ${OTHER_UID} , ${AUTH_UID} `,
    })[key],
});
assertEqual("comma-separated allowlist matches authenticated uid", commaList.eligible, true);

assertTruthy(
  "client cannot send userAuthScope",
  (CONVERSATION_TURN_CLIENT_FORBIDDEN_KEYS as readonly string[]).includes("userAuthScope")
);

for (const spoofKey of ["uid", "firebaseUid", "allowlist", "pilotUids", "actorRef"]) {
  const spoof = validateConversationTurnRequest({
    ...validTurnBody(),
    [spoofKey]: AUTH_UID,
  });
  assertEqual(`client spoof ${spoofKey} is rejected`, spoof.ok, false);
}

let ownershipWhenEmptyAllowlist = 0;
const emptyAllowlistRoute = await runHandler({
  auth: authContext(),
  env: { [NONGA_CONVERSATION_CORE_ENABLED_ENV]: "true" },
  ownershipVerifier: {
    async verify() {
      ownershipWhenEmptyAllowlist += 1;
      return { status: "verified", ownerActorRef: AUTH_UID };
    },
  },
});
assertEqual("flags on + empty allowlist status", emptyAllowlistRoute.status, 200);
assertEqual(
  "flags on + empty allowlist route",
  (emptyAllowlistRoute.body as ConversationCoreRouteResponse).route,
  "legacy-delegate"
);
assertEqual(
  "flags on + empty allowlist reason",
  (emptyAllowlistRoute.body as ConversationCoreRouteResponse & { reason?: string }).reason,
  "core-disabled"
);
assertEqual("empty allowlist does not call ownership", ownershipWhenEmptyAllowlist, 0);

let ownershipWhenOtherUid = 0;
const otherUidRoute = await runHandler({
  auth: authContext(),
  env: {
    [NONGA_CONVERSATION_CORE_ENABLED_ENV]: "true",
    [NONGA_CONVERSATION_CORE_PILOT_UIDS_ENV]: OTHER_UID,
  },
  ownershipVerifier: {
    async verify() {
      ownershipWhenOtherUid += 1;
      return { status: "verified", ownerActorRef: AUTH_UID };
    },
  },
});
assertEqual("flags on + other uid status", otherUidRoute.status, 200);
assertEqual(
  "flags on + other uid is legacy-delegate",
  (otherUidRoute.body as ConversationCoreRouteResponse).route,
  "legacy-delegate"
);
assertEqual("other uid does not call ownership", ownershipWhenOtherUid, 0);

const eligibleRoute = await runHandler({
  auth: authContext(),
  env: {
    [NONGA_CONVERSATION_CORE_ENABLED_ENV]: "true",
    [NONGA_CONVERSATION_CORE_PILOT_UIDS_ENV]: AUTH_UID,
  },
  ownershipVerifier: trustedVerifiedOwnershipMock(AUTH_UID),
});
assertEqual("flags on + allowlisted uid continues past eligibility", eligibleRoute.status, 503);
assertEqual(
  "allowlisted uid is not legacy-delegate",
  (eligibleRoute.body as ConversationCoreRouteResponse).route,
  "honest-unavailable"
);

const spoofBodyRoute = await runHandler({
  auth: authContext(),
  body: { ...validTurnBody(), uid: AUTH_UID, allowlist: AUTH_UID },
  env: { [NONGA_CONVERSATION_CORE_ENABLED_ENV]: "true" },
});
assertEqual("client spoof body is 400", spoofBodyRoute.status, 400);

const serializedEmpty = JSON.stringify(emptyAllowlistRoute.body);
assertFalsy("route body does not leak actor uid", serializedEmpty.includes(AUTH_UID));
assertFalsy("route body does not leak other uid", serializedEmpty.includes(OTHER_UID));
assertFalsy("route body does not leak email", serializedEmpty.includes("redacted@example.test"));

console.log(`PASS COUNT: ${passCount}`);
