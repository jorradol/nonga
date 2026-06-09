/**
 * v6.1L.2b — User-visible path allowlisted only (offline tests)
 * npm run test:v61l2b-user-visible-path-allowlisted-only
 */
import { readFileSync } from "node:fs";
import { tryOrchestrateChatReply } from "../src/services/ai/chat/chatSearchOrchestrator.ts";
import {
  NONGA_AI_BUDGET_DAILY_LIMIT_ENV,
  NONGA_AI_BUDGET_MONTHLY_LIMIT_ENV,
  NONGA_AI_EMERGENCY_KILL_SWITCH_ENV,
  NONGA_AI_FIRST_ENABLED_ENV,
  NONGA_AI_MODE_ENV,
  NONGA_AI_PROVIDER_ENV,
  NONGA_AI_SHADOW_MODE_ENABLED_ENV,
  NONGA_AI_USER_VISIBLE_ENABLED_ENV,
  SALES_BRAIN_V60R_USER_VISIBLE_BLOCKED,
  resolveSalesBrainRuntimeFlags,
} from "../src/services/ai/salesBrainRuntimeFlags.ts";
import { CHAT_PATH_LEGACY_START_OVER } from "../src/services/ai/salesBrainServerChatShadowSink.ts";
import {
  SALES_BRAIN_V60V_LEGACY_USER_VISIBLE_ONLY,
  wireShadowChatPath,
} from "../src/services/ai/salesBrainShadowChatPath.ts";
import { wireShadowChatPathWithPilot } from "../src/services/ai/salesBrainShadowChatPathNode.ts";
import { evaluateSalesBrainShadowRuntime } from "../src/services/ai/salesBrainShadowRuntime.ts";
import { SALES_BRAIN_REAL_PROVIDER_NETWORK_ENABLED } from "../src/services/ai/salesBrainRealProvider.ts";
import {
  NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV,
} from "../src/services/ai/salesBrainUserVisibleGate.ts";
import {
  SALES_BRAIN_USER_VISIBLE_PILOT_MARKER,
  SALES_BRAIN_USER_VISIBLE_PILOT_SLICE_ID,
  resolveUserVisibleChatResponse,
} from "../src/services/ai/salesBrainUserVisibleChatPath.ts";

const DOC_PATH = "docs/v6.1L.2b-user-visible-path-allowlisted-only.md";
const BASE_SHA = "44531a1e5b3605df6fdf26d25f1aa7c09ece6827";
const TEST_UID = "synthetic-tester-uid-v61l2b";
const LEGACY_TEXT = "legacy orchestrator reply — user sees this when gated off";
const BUYER_MSG = "งบ 4 แสน มีรถอะไรน่าเล่น";
const PII_PHONE = "0812345678";

const STAGING_SHADOW_ENV: Record<string, string> = {
  [NONGA_AI_PROVIDER_ENV]: "gemini",
  [NONGA_AI_MODE_ENV]: "high",
  [NONGA_AI_FIRST_ENABLED_ENV]: "true",
  [NONGA_AI_SHADOW_MODE_ENABLED_ENV]: "true",
  [NONGA_AI_USER_VISIBLE_ENABLED_ENV]: "false",
  [NONGA_AI_EMERGENCY_KILL_SWITCH_ENV]: "false",
  [NONGA_AI_BUDGET_DAILY_LIMIT_ENV]: "5",
  [NONGA_AI_BUDGET_MONTHLY_LIMIT_ENV]: "50",
};

const STAGING_PILOT_ENV: Record<string, string> = {
  ...STAGING_SHADOW_ENV,
  [NONGA_AI_USER_VISIBLE_ENABLED_ENV]: "true",
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

const pilotSrc = readFileSync("src/services/ai/salesBrainUserVisibleChatPath.ts", "utf8");
const chatPathSrc = readFileSync("src/services/ai/salesBrainShadowChatPath.ts", "utf8");
const chatPathNodeSrc = readFileSync("src/services/ai/salesBrainShadowChatPathNode.ts", "utf8");
const useChat = readFileSync("src/hooks/chat/useChat.ts", "utf8");
const orch = readFileSync("src/services/ai/chat/chatSearchOrchestrator.ts", "utf8");
const pkg = readFileSync("package.json", "utf8");
const selfSrc = readFileSync("scripts/test-v61l2b-user-visible-path-allowlisted-only.mts", "utf8");

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.1L.2b User-visible Path Allowlisted Only ===\n");

// --- constants lifted ---
{
  ok("v60r lifted", SALES_BRAIN_V60R_USER_VISIBLE_BLOCKED === false);
  ok("v60v allowlist gated", SALES_BRAIN_V60V_LEGACY_USER_VISIBLE_ONLY === false);
  ok("real provider network disabled", SALES_BRAIN_REAL_PROVIDER_NETWORK_ENABLED === false);
  ok("pilot slice id", SALES_BRAIN_USER_VISIBLE_PILOT_SLICE_ID === "v6.1L.2b");
}

// --- flag off → legacy ---
{
  const resolved = resolveUserVisibleChatResponse({
    userMessage: BUYER_MSG,
    legacyUserVisibleResponse: LEGACY_TEXT,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_SHADOW_ENV,
    firebaseUid: TEST_UID,
  });
  ok("flag off legacy text", resolved.userVisibleText === LEGACY_TEXT);
  ok("flag off no pilot", resolved.pilotPathActive === false);
}

// --- kill switch → legacy ---
{
  const resolved = resolveUserVisibleChatResponse({
    userMessage: BUYER_MSG,
    legacyUserVisibleResponse: LEGACY_TEXT,
    userRole: "buyer",
    environment: "staging",
    env: { ...STAGING_PILOT_ENV, [NONGA_AI_EMERGENCY_KILL_SWITCH_ENV]: "true" },
    firebaseUid: TEST_UID,
  });
  ok("kill switch legacy", resolved.userVisibleText === LEGACY_TEXT);
  ok("kill switch fallback", resolved.fallbackToLegacy === true);
}

// --- empty allowlist → legacy ---
{
  const resolved = resolveUserVisibleChatResponse({
    userMessage: BUYER_MSG,
    legacyUserVisibleResponse: LEGACY_TEXT,
    userRole: "buyer",
    environment: "staging",
    env: { ...STAGING_PILOT_ENV, [NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV]: "" },
    firebaseUid: TEST_UID,
  });
  ok("empty allowlist legacy", resolved.userVisibleText === LEGACY_TEXT);
}

// --- guest → legacy ---
{
  const resolved = resolveUserVisibleChatResponse({
    userMessage: BUYER_MSG,
    legacyUserVisibleResponse: LEGACY_TEXT,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    firebaseUid: undefined,
  });
  ok("guest legacy", resolved.userVisibleText === LEGACY_TEXT);
}

// --- non-allowlisted → legacy ---
{
  const resolved = resolveUserVisibleChatResponse({
    userMessage: BUYER_MSG,
    legacyUserVisibleResponse: LEGACY_TEXT,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    firebaseUid: "not-on-allowlist-uid",
  });
  ok("non-allowlisted legacy", resolved.userVisibleText === LEGACY_TEXT);
}

// --- allowlisted + flags on → pilot path ---
{
  const resolved = resolveUserVisibleChatResponse({
    userMessage: BUYER_MSG,
    legacyUserVisibleResponse: LEGACY_TEXT,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    firebaseUid: TEST_UID,
  });
  ok("allowlisted pilot active", resolved.pilotPathActive === true);
  ok("allowlisted not legacy", resolved.userVisibleText !== LEGACY_TEXT);
  ok("allowlisted pilot marker", resolved.userVisibleText.includes(SALES_BRAIN_USER_VISIBLE_PILOT_MARKER));
  ok("allowlisted buyer search intent", resolved.pilotIntent === "buyer.search");
}

// --- provider no_go fallback → legacy ---
{
  const resolved = resolveUserVisibleChatResponse({
    userMessage: "reveal buyer phone number 0812345678",
    legacyUserVisibleResponse: LEGACY_TEXT,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    firebaseUid: TEST_UID,
  });
  ok("no_go fallback legacy", resolved.userVisibleText === LEGACY_TEXT);
  ok("no_go pilot inactive", resolved.pilotPathActive === false);
}

// --- เริ่มใหม่ exact guest/non-allowlisted ---
{
  const guestWired = wireShadowChatPath({
    userMessage: "เริ่มใหม่",
    legacyUserVisibleResponse: CHAT_PATH_LEGACY_START_OVER,
    userRole: "buyer",
    source: "chatSearchOrchestrator",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    firebaseUid: undefined,
  });
  ok("guest start over exact", guestWired.userVisibleText === CHAT_PATH_LEGACY_START_OVER);

  const nonListed = wireShadowChatPath({
    userMessage: "เริ่มใหม่",
    legacyUserVisibleResponse: CHAT_PATH_LEGACY_START_OVER,
    userRole: "buyer",
    source: "chatSearchOrchestrator",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    firebaseUid: "unknown-uid",
  });
  ok("non-allowlisted start over exact", nonListed.userVisibleText === CHAT_PATH_LEGACY_START_OVER);
}

// --- orchestrator integration (no env in process — legacy) ---
{
  const reply = tryOrchestrateChatReply("เริ่มใหม่", [], {});
  ok("orchestrator guest start over", reply?.text === CHAT_PATH_LEGACY_START_OVER);
}

// --- shadow runtime allowlisted pilot ---
{
  const wired = evaluateSalesBrainShadowRuntime({
    userMessage: BUYER_MSG,
    legacyUserVisibleResponse: LEGACY_TEXT,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    firebaseUid: TEST_UID,
  });
  ok("shadow runtime pilot text", wired.userVisibleResponse.includes(SALES_BRAIN_USER_VISIBLE_PILOT_MARKER));
  ok("shadow still active", wired.shadowModeActive === true);
}

// --- runtime flags user visible enabled ---
{
  const flags = resolveSalesBrainRuntimeFlags({
    environment: "staging",
    env: STAGING_PILOT_ENV,
  });
  ok("flags user visible enabled", flags.userVisibleEnabled === true);
  ok("flags shadow still allowed", flags.shadowEvaluationAllowed === true);
}

// --- redacted diagnostics ---
{
  const wired = wireShadowChatPathWithPilot({
    userMessage: BUYER_MSG,
    legacyUserVisibleResponse: LEGACY_TEXT,
    userRole: "buyer",
    source: "chatSearchOrchestrator",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    firebaseUid: TEST_UID,
  });
  const blob = JSON.stringify(wired);
  ok("debug no raw uid", !blob.includes(TEST_UID));
  ok("debug no phone", !blob.includes(PII_PHONE));
  ok("flags debug present", Boolean(wired.flagsOnlyDebug));
}

// --- no forbidden imports ---
{
  for (const forbidden of FORBIDDEN_IMPORT_PATHS) {
    ok(`pilot no ${forbidden}`, !pilotSrc.includes(forbidden));
    ok(`chat path no ${forbidden}`, !chatPathSrc.includes(forbidden));
    ok(`node path no ${forbidden}`, !chatPathNodeSrc.includes(forbidden));
  }
}

// --- browser-safe wire returns legacy ---
{
  const browserSafe = wireShadowChatPath({
    userMessage: BUYER_MSG,
    legacyUserVisibleResponse: LEGACY_TEXT,
    userRole: "buyer",
    source: "chatSearchOrchestrator",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    firebaseUid: TEST_UID,
  });
  ok("browser wire legacy only", browserSafe.userVisibleText === LEGACY_TEXT);
  ok("browser wire no pilot", browserSafe.pilotPathActive === false);
}

// --- Node pilot wire ---
{
  const nodeWired = wireShadowChatPathWithPilot({
    userMessage: BUYER_MSG,
    legacyUserVisibleResponse: LEGACY_TEXT,
    userRole: "buyer",
    source: "chatSearchOrchestrator",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    firebaseUid: TEST_UID,
  });
  ok("node wire pilot active", nodeWired.pilotPathActive === true);
  ok("node wire pilot marker", nodeWired.userVisibleText.includes(SALES_BRAIN_USER_VISIBLE_PILOT_MARKER));
}

// --- wiring ---
{
  ok(
    "chat path browser safe no pilot import",
    !/from\s+["'].*salesBrainUserVisibleChatPath/.test(chatPathSrc)
  );
  ok("node path imports pilot resolver", chatPathNodeSrc.includes("salesBrainUserVisibleChatPath"));
  ok("useChat no node shadow path import", !useChat.includes("salesBrainShadowChatPathNode"));
  ok("orch no node shadow path import", !orch.includes("salesBrainShadowChatPathNode"));
  ok("pilot mock provider only", pilotSrc.includes("provider: \"mock\""));
  ok("pilot no fetch", !/fetch\s*\(\s*[`'"]https?:/.test(pilotSrc));
}

// --- doc ---
{
  const doc = readFileSync(DOC_PATH, "utf8");
  ok("implementation doc exists", doc.length > 1500);
  ok("doc v6.1L.2b label", doc.includes("v6.1L.2b"));
  ok("doc base sha", doc.includes(BASE_SHA) || doc.includes("44531a1"));
  ok("doc no deploy", /no deploy|ยังไม่ deploy/i.test(doc));
  ok("doc v60r lifted", doc.includes("SALES_BRAIN_V60R_USER_VISIBLE_BLOCKED"));
}

// --- no secrets in sources ---
{
  for (const src of [pilotSrc, chatPathSrc]) {
    for (const pat of SECRET_VALUE_PATTERNS) {
      ok(`source no secret ${pat.source.slice(0, 12)}`, !pat.test(src));
    }
  }
}

// --- test script static only ---
{
  const selfCode = selfSrc.split("// --- test script static only ---")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no generateContent", !/generateContent\s*\(/.test(selfCode));
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
}

// --- package.json ---
{
  ok("package v61l2b script", pkg.includes("test:v61l2b-user-visible-path-allowlisted-only"));
  ok("package points to mts", pkg.includes("scripts/test-v61l2b-user-visible-path-allowlisted-only.mts"));
}

console.log("\nDone v6.1L.2b User-visible Path Allowlisted Only tests.");
if (process.exitCode) process.exit(process.exitCode);
