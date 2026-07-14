/**
 * v6.1L.1 — User-visible allowlist gate (static + unit tests)
 * npm run test:v61l1-user-visible-allowlist-gate
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
} from "../src/services/ai/salesBrainRuntimeFlags.ts";
import {
  CHAT_PATH_LEGACY_START_OVER,
} from "../src/services/ai/salesBrainServerChatShadowSink.ts";
import {
  evaluateSalesBrainShadowRuntime,
} from "../src/services/ai/salesBrainShadowRuntime.ts";
import {
  SALES_BRAIN_V60V_LEGACY_USER_VISIBLE_ONLY,
  wireShadowChatPath,
} from "../src/services/ai/salesBrainShadowChatPath.ts";
import {
  evaluateUserVisibleGate,
  isUidAllowlistedForUserVisible,
  NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV,
  parseUserVisibleAllowlistUids,
  USER_VISIBLE_GATE_SLICE_ID,
} from "../src/services/ai/salesBrainUserVisibleGate.ts";

const DOC_PATH = "docs/v6.1L.1-user-visible-allowlist-gate.md";
const HEAD_SHA = "0cdc4f9d1ced8b6fc1b9d0f0029fd806834083ea";
const TEST_UID = "synthetic-tester-uid-v61l1";
const OTHER_UID = "synthetic-other-uid-v61l1";
const PII_PHONE = "0812345678";
const PII_EMAIL = "customer.real@example.com";

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

const STAGING_USER_VISIBLE_ENV: Record<string, string> = {
  ...STAGING_SHADOW_ENV,
  [NONGA_AI_USER_VISIBLE_ENABLED_ENV]: "true",
  [NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV]: `${TEST_UID},${OTHER_UID}`,
};

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
];

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

const gateSrc = readFileSync("src/services/ai/salesBrainUserVisibleGate.ts", "utf8");
const chatPathSrc = readFileSync("src/services/ai/salesBrainShadowChatPath.ts", "utf8");
const useChat = readFileSync("src/hooks/chat/useChat.ts", "utf8");
const orch = readFileSync("src/services/ai/chat/chatSearchOrchestrator.ts", "utf8");
const pkg = readFileSync("package.json", "utf8");
const selfSrc = readFileSync("scripts/test-v61l1-user-visible-allowlist-gate.mts", "utf8");

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.1L.1 User-visible Allowlist Gate ===\n");

// --- constants ---
{
  ok("v60r lifted v61l2b", SALES_BRAIN_V60R_USER_VISIBLE_BLOCKED === false);
  ok("v60v allowlist gated", SALES_BRAIN_V60V_LEGACY_USER_VISIBLE_ONLY === false);
  ok("gate slice id", USER_VISIBLE_GATE_SLICE_ID === "v6.1L.1");
}

// --- parse allowlist ---
{
  ok("parse empty absent", parseUserVisibleAllowlistUids(undefined).length === 0);
  ok("parse empty string", parseUserVisibleAllowlistUids("").length === 0);
  ok("parse trims commas", parseUserVisibleAllowlistUids(` ${TEST_UID} , ${OTHER_UID} `).length === 2);
  ok("isUid false when missing", isUidAllowlistedForUserVisible(undefined, (k) => STAGING_USER_VISIBLE_ENV[k], "staging") === false);
  ok("isUid false guest", isUidAllowlistedForUserVisible("", (k) => STAGING_USER_VISIBLE_ENV[k], "staging") === false);
  ok("isUid true internal tester on staging empty env allowlist", isUidAllowlistedForUserVisible(TEST_UID, (k) => STAGING_SHADOW_ENV[k], "staging") === true);
  ok("isUid true when listed", isUidAllowlistedForUserVisible(TEST_UID, (k) => STAGING_USER_VISIBLE_ENV[k], "staging") === true);
  ok("isUid false when not listed on production", isUidAllowlistedForUserVisible("unknown-uid-not-in-list", (k) => STAGING_USER_VISIBLE_ENV[k], "production") === false);
}

// --- gate default deny ---
{
  const gate = evaluateUserVisibleGate({
    environment: "staging",
    env: STAGING_SHADOW_ENV,
    firebaseUid: TEST_UID,
  });
  ok("not requested blocks", gate.blockedReason === "user_visible_not_requested");
  ok("not requested fallback legacy", gate.fallbackToLegacy === true);
  ok("not requested effective false", gate.effectiveUserVisibleAllowed === false);
}

// --- guest deny ---
{
  const gate = evaluateUserVisibleGate({
    environment: "staging",
    env: STAGING_USER_VISIBLE_ENV,
    firebaseUid: undefined,
  });
  ok("guest blocked reason", gate.blockedReason === "guest_uid_missing");
  ok("guest fallback legacy", gate.fallbackToLegacy === true);
}

// --- staging expanded allowlist (internal tester / any authenticated on staging) ---
{
  const gate = evaluateUserVisibleGate({
    environment: "staging",
    env: { ...STAGING_USER_VISIBLE_ENV, [NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV]: "" },
    firebaseUid: TEST_UID,
  });
  ok("staging internal tester allowed despite empty env allowlist", gate.effectiveUserVisibleAllowed === true);
  ok("staging internal tester allowed reason", gate.blockedReason === "user_visible_allowed");
}

// --- production non-allowlisted deny ---
{
  const gate = evaluateUserVisibleGate({
    environment: "production",
    env: STAGING_USER_VISIBLE_ENV,
    firebaseUid: "not-on-allowlist-uid",
  });
  ok("production non-allowlisted reason", gate.blockedReason === "production_default_off");
  ok("production non-allowlisted fallback", gate.fallbackToLegacy === true);
}

// --- allowlisted effective allow (v60r lifted) ---
{
  const gate = evaluateUserVisibleGate({
    environment: "staging",
    env: STAGING_USER_VISIBLE_ENV,
    firebaseUid: TEST_UID,
  });
  ok("allowlisted would allow", gate.wouldAllowWithoutV60rBlock === true);
  ok("allowlisted effective allowed", gate.effectiveUserVisibleAllowed === true);
  ok("allowlisted allowed reason", gate.blockedReason === "user_visible_allowed");
  ok("allowlisted no fallback", gate.fallbackToLegacy === false);
}

// --- kill switch ---
{
  const gate = evaluateUserVisibleGate({
    environment: "staging",
    env: {
      ...STAGING_USER_VISIBLE_ENV,
      [NONGA_AI_EMERGENCY_KILL_SWITCH_ENV]: "true",
    },
    firebaseUid: TEST_UID,
  });
  ok("kill switch reason", gate.blockedReason === "emergency_kill_switch");
  ok("kill switch fallback", gate.fallbackToLegacy === true);
}

// --- redacted diagnostics ---
{
  const gate = evaluateUserVisibleGate({
    environment: "staging",
    env: STAGING_USER_VISIBLE_ENV,
    firebaseUid: TEST_UID,
  });
  const diagJson = JSON.stringify(gate.redactedDiagnostics);
  ok("diag no raw uid", !diagJson.includes(TEST_UID));
  ok("diag allowlist count only", gate.redactedDiagnostics.allowlistEntryCount === 2);
  ok("diag uid allowlisted flag", gate.redactedDiagnostics.uidAllowlisted === true);
  ok("diag slice id", gate.redactedDiagnostics.sliceId === "v6.1L.1");
  ok("diag no phone", !diagJson.includes(PII_PHONE));
  ok("diag no email", !diagJson.includes(PII_EMAIL));
}

// --- shadow runtime legacy unchanged ---
{
  const legacy = "legacy orchestrator reply";
  const wired = evaluateSalesBrainShadowRuntime({
    userMessage: "งบ 4 แสน",
    legacyUserVisibleResponse: legacy,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_USER_VISIBLE_ENV,
    firebaseUid: TEST_UID,
  });
  ok("shadow runtime pilot text", wired.userVisibleResponse.includes("น้องเอ"));
  ok("shadow runtime gate diagnostics", Boolean(wired.userVisibleGateDiagnostics));
  ok("shadow runtime gate allowed", wired.userVisibleGateDiagnostics?.blockedReason === "user_visible_allowed");

  const guestWired = evaluateSalesBrainShadowRuntime({
    userMessage: "งบ 4 แสน",
    legacyUserVisibleResponse: legacy,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_USER_VISIBLE_ENV,
    firebaseUid: undefined,
  });
  ok("shadow guest legacy", guestWired.userVisibleResponse === legacy);
  ok("shadow guest gate reason", guestWired.userVisibleBlockedReason === "guest_uid_missing");
}

// --- chat path legacy unchanged ---
{
  const legacy = CHAT_PATH_LEGACY_START_OVER;
  const wired = wireShadowChatPath({
    userMessage: "เริ่มใหม่",
    legacyUserVisibleResponse: legacy,
    userRole: "buyer",
    source: "chatSearchOrchestrator",
    environment: "staging",
    env: STAGING_USER_VISIBLE_ENV,
    firebaseUid: TEST_UID,
  });
  ok("chat path legacy preserved", wired.legacyUserVisibleText === legacy);
  ok("chat path user visible exact start over", wired.userVisibleText === legacy);
  ok("chat path flags debug present", Boolean(wired.flagsOnlyDebug));
  ok("chat path debug no raw uid", !wired.flagsOnlyDebug!.includes(TEST_UID));
  ok("chat path debug has gate slice", wired.flagsOnlyDebug!.includes("v6.1L.1"));
}

// --- orchestrator เริ่มใหม่ exact ---
{
  const reply = tryOrchestrateChatReply("เริ่มใหม่", [], { firebaseUid: TEST_UID });
  ok("orchestrator start over reply", Boolean(reply?.text));
  ok("orchestrator start over exact", reply?.text === CHAT_PATH_LEGACY_START_OVER);
  ok("orchestrator skip gemini", reply?.skipGemini === true);
}

// --- no forbidden imports in gate module ---
{
  for (const forbidden of FORBIDDEN_IMPORT_PATHS) {
    ok(`gate no ${forbidden}`, !gateSrc.includes(forbidden));
  }
  ok("chat path no buyer lead handler import", !chatPathSrc.includes("buyerLeadCaptureHandler"));
  ok("useChat buyer lead handler still present", useChat.includes("buyerLeadCaptureHandler"));
}

// --- no hardcoded uids in client ---
{
  ok("useChat no hardcoded allowlist env", !useChat.includes(NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV));
  ok("orch no hardcoded allowlist env", !orch.includes(NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV));
  ok("chat path no allowlist env literal", !chatPathSrc.includes(NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV));
}

// --- wiring ---
{
  ok("useChat passes firebaseUid", useChat.includes("firebaseUid: user?.uid"));
  ok("chat path imports gate", chatPathSrc.includes("salesBrainUserVisibleGate"));
  ok(
    "chat path browser safe no pilot import",
    !/from\s+["'].*salesBrainUserVisibleChatPath/.test(chatPathSrc)
  );
  ok("chat path v60v constant present", chatPathSrc.includes("SALES_BRAIN_V60V_LEGACY_USER_VISIBLE_ONLY"));
}

// --- doc record ---
{
  const doc = readFileSync(DOC_PATH, "utf8");
  ok("implementation doc exists", doc.length > 2000);
  ok("doc v6.1L.1 label", doc.includes("v6.1L.1"));
  ok("doc HEAD 0cdc4f9", doc.includes(HEAD_SHA) || doc.includes("0cdc4f9"));
  ok("doc no deploy", /no deploy|ไม่ deploy/i.test(doc));
  ok("doc v60r not lifted", /ไม่ lift|not lift/i.test(doc));
}

// --- no secret values in sources ---
{
  for (const src of [gateSrc, chatPathSrc]) {
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
  ok("script uses readFileSync", selfCode.includes("readFileSync"));
}

// --- package.json ---
{
  ok("package v61l1 script", pkg.includes("test:v61l1-user-visible-allowlist-gate"));
  ok("package points to mts", pkg.includes("scripts/test-v61l1-user-visible-allowlist-gate.mts"));
}

console.log("\nDone v6.1L.1 User-visible Allowlist Gate tests.");
if (process.exitCode) process.exit(process.exitCode);
