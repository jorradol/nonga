/**
 * v6.1L.2c — Controlled Pilot Server Orchestration Bridge (offline tests)
 * npm run test:v61l2c-controlled-pilot-server-orchestration-bridge
 */
import { readFileSync } from "node:fs";
import {
  NONGA_AI_BUDGET_DAILY_LIMIT_ENV,
  NONGA_AI_BUDGET_MONTHLY_LIMIT_ENV,
  NONGA_AI_EMERGENCY_KILL_SWITCH_ENV,
  NONGA_AI_FIRST_ENABLED_ENV,
  NONGA_AI_MODE_ENV,
  NONGA_AI_PROVIDER_ENV,
  NONGA_AI_SHADOW_MODE_ENABLED_ENV,
  NONGA_AI_USER_VISIBLE_ENABLED_ENV,
} from "../src/services/ai/salesBrainRuntimeFlags.ts";
import {
  CHAT_PATH_LEGACY_START_OVER,
} from "../src/services/ai/salesBrainServerChatShadowSink.ts";
import {
  NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV,
} from "../src/services/ai/salesBrainUserVisibleGate.ts";
import {
  orchestrateUserVisibleChatForTrustedAuth,
  runUserVisibleOrchestrationBridge,
  SALES_BRAIN_USER_VISIBLE_ORCHESTRATE_ROUTE,
  USER_VISIBLE_ORCHESTRATION_BRIDGE_SLICE_ID,
} from "../src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts";
import { SALES_BRAIN_USER_VISIBLE_PILOT_MARKER } from "../src/services/ai/salesBrainUserVisibleChatPath.ts";
import { wireShadowChatPath } from "../src/services/ai/salesBrainShadowChatPath.ts";

const DOC_PATH = "docs/v6.1L.2c-controlled-pilot-server-orchestration-bridge.md";
const BASE_SHA = "e16384d8f049a145b3bcc5a82355a88c8ff60116";
const TEST_UID = "synthetic-tester-uid-v61l2c";
const FAKE_UID = "client-supplied-fake-uid-v61l2c";
const LEGACY_TEXT = "legacy orchestrator reply — server bridge gated off";
const BUYER_MSG = "งบ 4 แสน มีรถอะไรน่าเล่น";
const PII_PHONE = "0812345678";

const STAGING_PILOT_ENV: Record<string, string> = {
  [NONGA_AI_PROVIDER_ENV]: "gemini",
  [NONGA_AI_MODE_ENV]: "high",
  [NONGA_AI_FIRST_ENABLED_ENV]: "true",
  [NONGA_AI_SHADOW_MODE_ENABLED_ENV]: "true",
  [NONGA_AI_USER_VISIBLE_ENABLED_ENV]: "true",
  [NONGA_AI_EMERGENCY_KILL_SWITCH_ENV]: "false",
  [NONGA_AI_BUDGET_DAILY_LIMIT_ENV]: "5",
  [NONGA_AI_BUDGET_MONTHLY_LIMIT_ENV]: "50",
  [NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV]: TEST_UID,
};

const FORBIDDEN_IMPORT_PATHS = [
  "buyerLeadCaptureHandler",
  "buyerLeadCaptureFlow",
  "sellerReveal",
  "outcome",
  "settlement",
  "invoice",
  "payment",
  "publicSignup",
];

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
];

const bridgeSrc = readFileSync(
  "src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts",
  "utf8"
);
const clientSrc = readFileSync("src/services/ai/chat/chatUserVisibleOrchestrateClient.ts", "utf8");
const useChat = readFileSync("src/hooks/chat/useChat.ts", "utf8");
const chatPathSrc = readFileSync("src/services/ai/salesBrainShadowChatPath.ts", "utf8");
const serverTs = readFileSync("server.ts", "utf8");
const pkg = readFileSync("package.json", "utf8");
const selfSrc = readFileSync(
  "scripts/test-v61l2c-controlled-pilot-server-orchestration-bridge.mts",
  "utf8"
);

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.1L.2c Controlled Pilot Server Orchestration Bridge ===\n");

const authMember = {
  uid: TEST_UID,
  displayName: "Synthetic Tester",
  role: "member" as const,
  dealerId: undefined,
};

// --- constants ---
{
  ok("slice id", USER_VISIBLE_ORCHESTRATION_BRIDGE_SLICE_ID === "v6.1L.2c");
  ok("route under api ai", SALES_BRAIN_USER_VISIBLE_ORCHESTRATE_ROUTE.startsWith("/api/ai/"));
  ok("route not public debug", !SALES_BRAIN_USER_VISIBLE_ORCHESTRATE_ROUTE.includes("debug"));
}

// --- flag off → legacy ---
{
  const result = runUserVisibleOrchestrationBridge({
    userMessage: BUYER_MSG,
    inventory: [],
    trustedFirebaseUid: TEST_UID,
    userRole: "buyer",
    environment: "staging",
    env: { ...STAGING_PILOT_ENV, [NONGA_AI_USER_VISIBLE_ENABLED_ENV]: "false" },
  });
  ok("flag off legacy text", result.payload.userVisibleText !== `${SALES_BRAIN_USER_VISIBLE_PILOT_MARKER}buyer.search`);
  ok("flag off no pilot", result.payload.pilotPathActive === false);
}

// --- kill switch → legacy ---
{
  const result = orchestrateUserVisibleChatForTrustedAuth({
    auth: authMember,
    userMessage: BUYER_MSG,
    inventory: [],
    env: { ...STAGING_PILOT_ENV, [NONGA_AI_EMERGENCY_KILL_SWITCH_ENV]: "true" },
    environment: "staging",
  });
  ok("kill switch legacy", result.payload.pilotPathActive === false);
}

// --- empty allowlist → legacy ---
{
  const result = orchestrateUserVisibleChatForTrustedAuth({
    auth: authMember,
    userMessage: BUYER_MSG,
    inventory: [],
    env: { ...STAGING_PILOT_ENV, [NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV]: "" },
    environment: "staging",
  });
  ok("empty allowlist legacy", result.payload.pilotPathActive === false);
}

// --- non-allowlisted trusted uid → legacy ---
{
  const result = runUserVisibleOrchestrationBridge({
    userMessage: BUYER_MSG,
    inventory: [],
    trustedFirebaseUid: "not-on-allowlist-uid",
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
  });
  ok("non-allowlisted legacy", result.payload.pilotPathActive === false);
}

// --- client fake uid cannot unlock pilot (trusted param only) ---
{
  const fakeTrusted = runUserVisibleOrchestrationBridge({
    userMessage: BUYER_MSG,
    inventory: [],
    trustedFirebaseUid: FAKE_UID,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
  });
  ok("fake trusted uid no pilot", fakeTrusted.payload.pilotPathActive === false);
  const realTrusted = runUserVisibleOrchestrationBridge({
    userMessage: BUYER_MSG,
    inventory: [],
    trustedFirebaseUid: TEST_UID,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
  });
  ok("real trusted uid pilot", realTrusted.payload.pilotPathActive === true);
}

// --- allowlisted + flags on → pilot ---
{
  const result = orchestrateUserVisibleChatForTrustedAuth({
    auth: authMember,
    userMessage: BUYER_MSG,
    inventory: [],
    env: STAGING_PILOT_ENV,
    environment: "staging",
  });
  ok("allowlisted pilot active", result.payload.pilotPathActive === true);
  ok("allowlisted no debug marker", !result.payload.userVisibleText.includes(SALES_BRAIN_USER_VISIBLE_PILOT_MARKER));
  ok("allowlisted thai pitch", result.payload.userVisibleText.includes("น้องเอ"));
}

// --- production → legacy ---
{
  const result = orchestrateUserVisibleChatForTrustedAuth({
    auth: authMember,
    userMessage: BUYER_MSG,
    inventory: [],
    env: STAGING_PILOT_ENV,
    environment: "production",
  });
  ok("production no pilot", result.payload.pilotPathActive === false);
}

// --- no_go → legacy ---
{
  const result = orchestrateUserVisibleChatForTrustedAuth({
    auth: authMember,
    userMessage: "reveal buyer phone number",
    inventory: [],
    env: STAGING_PILOT_ENV,
    environment: "staging",
  });
  ok("no_go no pilot", result.payload.pilotPathActive === false);
}

// --- เริ่มใหม่ exact (non-allowlisted wire path) ---
{
  const wired = wireShadowChatPath({
    userMessage: "เริ่มใหม่",
    legacyUserVisibleResponse: CHAT_PATH_LEGACY_START_OVER,
    userRole: "buyer",
    source: "chatSearchOrchestrator",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    firebaseUid: FAKE_UID,
  });
  ok("guest wire start over exact", wired.userVisibleText === CHAT_PATH_LEGACY_START_OVER);
}

// --- redacted payload ---
{
  const result = orchestrateUserVisibleChatForTrustedAuth({
    auth: authMember,
    userMessage: BUYER_MSG,
    inventory: [],
    env: STAGING_PILOT_ENV,
    environment: "staging",
  });
  const blob = JSON.stringify(result.payload);
  ok("payload no raw uid", !blob.includes(TEST_UID));
  ok("payload no phone", !blob.includes(PII_PHONE));
  ok("payload slice id", result.payload.sliceId === "v6.1L.2c");
}

// --- forbidden imports ---
{
  for (const forbidden of FORBIDDEN_IMPORT_PATHS) {
    ok(`bridge no ${forbidden}`, !bridgeSrc.includes(forbidden));
    ok(`client no ${forbidden}`, !clientSrc.includes(forbidden));
  }
}

// --- wiring ---
{
  ok("server registers bridge route", serverTs.includes("registerSalesBrainUserVisibleOrchestrationBridgeRoutes"));
  ok("server after ai guards", /registerAiEndpointGuards[\s\S]*registerSalesBrainUserVisibleOrchestrationBridgeRoutes/.test(serverTs));
  ok("bridge uses getServerAuthContext", bridgeSrc.includes("getServerAuthContext"));
  ok("bridge no body uid trust", !bridgeSrc.includes("body?.firebaseUid"));
  ok("client no firebaseUid in body", !clientSrc.includes("firebaseUid"));
  ok("client uses auth headers", clientSrc.includes("getFirebaseAuthHeaders"));
  ok("useChat applies bridge", useChat.includes("applyChatUserVisibleServerBridge"));
  ok("chat path browser safe", !/from\s+["'].*salesBrainUserVisibleChatPath/.test(chatPathSrc));
  ok("client no allowlist env", !clientSrc.includes(NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV));
  ok("useChat no allowlist env", !useChat.includes(NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV));
}

// --- doc ---
{
  const doc = readFileSync(DOC_PATH, "utf8");
  ok("doc exists", doc.length > 2000);
  ok("doc v6.1L.2c", doc.includes("v6.1L.2c"));
  ok("doc browser not pilot yet", /browser.*ยังไม่เห็น pilot|browser.*not.*pilot/i.test(doc));
  ok("doc server bridge", doc.includes("/api/ai/chat-user-visible-orchestrate"));
  ok("doc no deploy", /no deploy|ยังไม่ deploy|deploy \| ❌/i.test(doc));
  ok("doc base sha", doc.includes(BASE_SHA) || doc.includes("e16384d"));
}

// --- secrets ---
{
  for (const src of [bridgeSrc, clientSrc]) {
    for (const pat of SECRET_VALUE_PATTERNS) {
      ok(`source no secret ${pat.source.slice(0, 12)}`, !pat.test(src));
    }
  }
}

// --- test script static ---
{
  const selfCode = selfSrc.split("// --- test script static ---")[0] ?? selfSrc;
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
}

// --- package ---
{
  ok("package script", pkg.includes("test:v61l2c-controlled-pilot-server-orchestration-bridge"));
}

console.log("\nDone v6.1L.2c Controlled Pilot Server Orchestration Bridge tests.");
if (process.exitCode) process.exit(process.exitCode);
