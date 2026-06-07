/**
 * v6.0V — Shadow chat path wiring / user-visible legacy (offline tests)
 * npm run test:v60v-shadow-chat-path-wiring-user-visible-legacy
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
import {
  SALES_BRAIN_V60V_LEGACY_USER_VISIBLE_ONLY,
  mapChatRoleToSalesBrainUserRole,
  wireShadowChatPath,
} from "../src/services/ai/salesBrainShadowChatPath.ts";
import { evaluateSalesBrainShadowRuntime } from "../src/services/ai/salesBrainShadowRuntime.ts";
import { SALES_BRAIN_REAL_PROVIDER_NETWORK_ENABLED } from "../src/services/ai/salesBrainRealProvider.ts";

const LEGACY_TEXT = "legacy orchestrator reply — user sees this only";
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

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
];

const chatPathSrc = readFileSync("src/services/ai/salesBrainShadowChatPath.ts", "utf8");
const useChat = readFileSync("src/hooks/chat/useChat.ts", "utf8");
const orch = readFileSync("src/services/ai/chat/chatSearchOrchestrator.ts", "utf8");
const runtimeSrc = readFileSync("src/services/ai/salesBrainShadowRuntime.ts", "utf8");
const pkg = readFileSync("package.json", "utf8");
const selfSrc = readFileSync(
  "scripts/test-v60v-shadow-chat-path-wiring-user-visible-legacy.mts",
  "utf8"
);

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

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.0V Shadow Chat Path Wiring / User-visible Legacy ===\n");

// --- v60v constants ---
{
  ok("v60v legacy user visible only constant", SALES_BRAIN_V60V_LEGACY_USER_VISIBLE_ONLY === true);
  ok("v60r user visible still blocked", SALES_BRAIN_V60R_USER_VISIBLE_BLOCKED === true);
  ok("real provider network disabled", SALES_BRAIN_REAL_PROVIDER_NETWORK_ENABLED === false);
}

// --- runtime shadow eval (Node) + chat path legacy unchanged ---
{
  const wired = evaluateSalesBrainShadowRuntime({
    userMessage: "งบ 4 แสน มีรถอะไรน่าเล่น",
    legacyUserVisibleResponse: LEGACY_TEXT,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_SHADOW_ENV,
  });
  ok("shadow env legacy text unchanged", wired.userVisibleResponse === LEGACY_TEXT);
  ok("shadow runtime active staging", wired.shadowModeActive === true);
  ok("user visible response remains legacy", wired.userVisibleResponse === LEGACY_TEXT);
  ok("mock provider only", wired.shadowDebugResult?.provider === "mock");

  const chatPath = wireShadowChatPath({
    userMessage: "งบ 4 แสน มีรถอะไรน่าเล่น",
    legacyUserVisibleResponse: LEGACY_TEXT,
    userRole: "buyer",
    source: "chatSearchOrchestrator",
    environment: "staging",
    env: STAGING_SHADOW_ENV,
  });
  ok("chat path returns legacy text", chatPath.legacyUserVisibleText === LEGACY_TEXT);
  ok("chat path flags debug present", Boolean(chatPath.flagsOnlyDebug));
}

// --- kill switch ---
{
  const wired = evaluateSalesBrainShadowRuntime({
    userMessage: "งบ 4 แสน",
    legacyUserVisibleResponse: LEGACY_TEXT,
    userRole: "buyer",
    environment: "staging",
    env: { ...STAGING_SHADOW_ENV, [NONGA_AI_EMERGENCY_KILL_SWITCH_ENV]: "true" },
  });
  ok("kill switch shadow inactive", wired.shadowModeActive === false);
  ok("kill switch legacy unchanged", wired.userVisibleResponse === LEGACY_TEXT);
}

// --- budget missing ---
{
  const wired = evaluateSalesBrainShadowRuntime({
    userMessage: "งบ 4 แสน",
    legacyUserVisibleResponse: LEGACY_TEXT,
    userRole: "buyer",
    environment: "staging",
    env: { ...STAGING_SHADOW_ENV, [NONGA_AI_BUDGET_DAILY_LIMIT_ENV]: "" },
  });
  ok("budget missing shadow inactive", wired.shadowModeActive === false);
  ok("budget missing legacy unchanged", wired.userVisibleResponse === LEGACY_TEXT);
}

// --- user-visible true blocked ---
{
  const flags = resolveSalesBrainRuntimeFlags({
    env: { ...STAGING_SHADOW_ENV, [NONGA_AI_USER_VISIBLE_ENABLED_ENV]: "true" },
    environment: "staging",
  });
  ok("user visible true blocked", flags.shadowEvaluationAllowed === false);
  const wired = evaluateSalesBrainShadowRuntime({
    userMessage: "งบ 4 แสน",
    legacyUserVisibleResponse: LEGACY_TEXT,
    userRole: "buyer",
    environment: "staging",
    env: { ...STAGING_SHADOW_ENV, [NONGA_AI_USER_VISIBLE_ENABLED_ENV]: "true" },
  });
  ok("user visible true shadow skipped", wired.shadowModeActive === false);
  ok("user visible true legacy unchanged", wired.userVisibleResponse === LEGACY_TEXT);
}

// --- production default off ---
{
  const wired = evaluateSalesBrainShadowRuntime({
    userMessage: "งบ 4 แสน",
    legacyUserVisibleResponse: LEGACY_TEXT,
    userRole: "buyer",
    environment: "production",
    env: STAGING_SHADOW_ENV,
  });
  ok("production shadow inactive", wired.shadowModeActive === false);
  ok("production legacy unchanged", wired.userVisibleResponse === LEGACY_TEXT);
}

// --- useChat orchestrated flags-only pass ---
{
  const wired = wireShadowChatPath({
    userMessage: "งบ 4 แสน",
    legacyUserVisibleResponse: LEGACY_TEXT,
    userRole: "buyer",
    source: "useChat.orchestrated",
    shadowAlreadyEvaluated: true,
    environment: "staging",
    env: STAGING_SHADOW_ENV,
  });
  ok("useChat orchestrated flags only", Boolean(wired.flagsOnlyDebug));
  ok("useChat orchestrated legacy unchanged", wired.legacyUserVisibleText === LEGACY_TEXT);
}

// --- gemini fallback flags-only ---
{
  const wired = wireShadowChatPath({
    userMessage: "สวัสดีครับ",
    legacyUserVisibleResponse: "",
    userRole: "buyer",
    source: "useChat.gemini_fallback",
    environment: "staging",
    env: STAGING_SHADOW_ENV,
  });
  ok("gemini fallback flags only", Boolean(wired.flagsOnlyDebug));
  ok("gemini fallback legacy empty unchanged", wired.legacyUserVisibleText === "");
}

// --- no raw PII in shadow result ---
{
  const runtime = evaluateSalesBrainShadowRuntime({
    userMessage: "งบ 4 แสน โทร 0812345678",
    legacyUserVisibleResponse: LEGACY_TEXT,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_SHADOW_ENV,
  });
  ok("phone not in shadow json", !JSON.stringify(runtime).includes("0812345678"));
  ok("phone visible legacy", runtime.userVisibleResponse === LEGACY_TEXT);

  const wired = wireShadowChatPath({
    userMessage: "งบ 4 แสน โทร 0812345678",
    legacyUserVisibleResponse: LEGACY_TEXT,
    userRole: "buyer",
    source: "chatSearchOrchestrator",
    environment: "staging",
    env: STAGING_SHADOW_ENV,
  });
  ok("phone not in chat path flags json", !JSON.stringify(wired).includes("0812345678"));
  ok("phone chat path legacy unchanged", wired.legacyUserVisibleText === LEGACY_TEXT);
}

// --- orchestrator integration ---
{
  const reply = tryOrchestrateChatReply("เริ่มใหม่", [], {});
  ok("orchestrator returns reply", Boolean(reply?.text));
  ok("orchestrator skip gemini", reply?.skipGemini === true);
  ok("orchestrator text unchanged by wiring", reply?.text.includes("ยกเลิกข้อมูลเดิม"));
}

// --- role mapping ---
{
  ok("map admin role", mapChatRoleToSalesBrainUserRole({ role: "member", isAdmin: true }) === "admin");
  ok("map dealer role", mapChatRoleToSalesBrainUserRole({ role: "member", isDealer: true }) === "dealer");
  ok("map buyer default", mapChatRoleToSalesBrainUserRole({ role: "member" }) === "buyer");
}

// --- wiring imports: chat path module only ---
{
  ok("useChat imports shadow chat path", useChat.includes("salesBrainShadowChatPath"));
  ok("useChat imports wireShadowChatPath", useChat.includes("wireShadowChatPath"));
  ok("orchestrator imports shadow chat path", orch.includes("salesBrainShadowChatPath"));
  ok("useChat no direct evaluateSalesBrainShadowRuntime", !useChat.includes("evaluateSalesBrainShadowRuntime"));
  ok("orchestrator no direct evaluateSalesBrainShadowRuntime", !orch.includes("evaluateSalesBrainShadowRuntime"));
  ok("useChat no salesBrainAdapter", !useChat.includes("salesBrainAdapter"));
  ok("orchestrator no salesBrainAdapter", !orch.includes("salesBrainAdapter"));
  ok("chat path no salesBrainAdapter", !chatPathSrc.includes("salesBrainAdapter"));
}

// --- forbidden flow imports untouched ---
{
  for (const forbidden of FORBIDDEN_IMPORT_PATHS) {
    ok(`chat path no ${forbidden} import`, !chatPathSrc.includes(forbidden));
  }
  ok("useChat buyer lead handler still present", useChat.includes("buyerLeadCaptureHandler"));
}

// --- source static: no network / secrets ---
{
  for (const src of [chatPathSrc, runtimeSrc]) {
    ok("source no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(src));
    ok("source no generateContent", !/generateContent\s*\(/.test(src));
  }
  ok("orchestrator no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(orch));
  ok("chat path browser safe flags only", chatPathSrc.includes("flagsOnly: true"));
  ok(
    "chat path no shadow runtime import",
    !/from\s+["']\.\/salesBrainShadowRuntime["']/.test(chatPathSrc)
  );
  ok("chat path legacy only constant", chatPathSrc.includes("SALES_BRAIN_V60V_LEGACY_USER_VISIBLE_ONLY"));
}

// --- no secret values ---
{
  for (const pat of SECRET_VALUE_PATTERNS) {
    ok(`chat path no secret ${pat.source.slice(0, 16)}`, !pat.test(chatPathSrc));
  }
}

// --- test script static only ---
{
  const selfCode = selfSrc.split("// --- test script static only")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no generateContent", !/generateContent\s*\(/.test(selfCode));
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script no spawn gcloud", !/spawn\s*\(\s*[`'"]gcloud/.test(selfCode));
}

// --- package.json ---
{
  ok("package v60v script", pkg.includes("test:v60v-shadow-chat-path-wiring-user-visible-legacy"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v60v-shadow-chat-path-wiring-user-visible-legacy.mts")
  );
}

console.log("\nDone v6.0V Shadow Chat Path Wiring / User-visible Legacy tests.");
if (process.exitCode) process.exit(process.exitCode);
