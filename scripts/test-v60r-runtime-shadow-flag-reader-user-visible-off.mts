/**
 * v6.0R — Runtime shadow flag reader / user-visible off (offline tests)
 * npm run test:v60r-runtime-shadow-flag-reader-user-visible-off
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
  SALES_BRAIN_RUNTIME_FLAG_ENV_KEYS,
  SALES_BRAIN_V60R_USER_VISIBLE_BLOCKED,
  resolveSalesBrainRuntimeFlags,
} from "../src/services/ai/salesBrainRuntimeFlags.ts";
import {
  evaluateSalesBrainShadowRuntime,
  summarizeShadowRuntimeFlags,
} from "../src/services/ai/salesBrainShadowRuntime.ts";
import {
  SalesBrainRealProviderNetworkDisabledError,
  createSalesBrainAdapter,
} from "../src/services/ai/salesBrainAdapter.ts";
import { SALES_BRAIN_REAL_PROVIDER_NETWORK_ENABLED } from "../src/services/ai/salesBrainRealProvider.ts";

const LEGACY_RESPONSE = "legacy orchestrator reply — user sees this only";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
];

const flagsSrc = readFileSync("src/services/ai/salesBrainRuntimeFlags.ts", "utf8");
const runtimeSrc = readFileSync("src/services/ai/salesBrainShadowRuntime.ts", "utf8");
const useChat = readFileSync("src/hooks/chat/useChat.ts", "utf8");
const orch = readFileSync("src/services/ai/chat/chatSearchOrchestrator.ts", "utf8");
const pkg = readFileSync("package.json", "utf8");
const selfSrc = readFileSync(
  "scripts/test-v60r-runtime-shadow-flag-reader-user-visible-off.mts",
  "utf8"
);

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function shadowEnv(overrides: Record<string, string> = {}) {
  return {
    [NONGA_AI_PROVIDER_ENV]: "gemini",
    [NONGA_AI_MODE_ENV]: "high",
    [NONGA_AI_FIRST_ENABLED_ENV]: "true",
    [NONGA_AI_SHADOW_MODE_ENABLED_ENV]: "true",
    [NONGA_AI_USER_VISIBLE_ENABLED_ENV]: "false",
    [NONGA_AI_EMERGENCY_KILL_SWITCH_ENV]: "false",
    [NONGA_AI_BUDGET_DAILY_LIMIT_ENV]: "5",
    [NONGA_AI_BUDGET_MONTHLY_LIMIT_ENV]: "50",
    ...overrides,
  };
}

console.log("=== v6.0R Runtime Shadow Flag Reader / User-visible Off ===\n");

// --- env keys exported ---
{
  ok("runtime flag env keys count", SALES_BRAIN_RUNTIME_FLAG_ENV_KEYS.length === 8);
  ok("NONGA_AI_PROVIDER env key", NONGA_AI_PROVIDER_ENV === "NONGA_AI_PROVIDER");
  ok("NONGA_AI_SHADOW_MODE_ENABLED env key", NONGA_AI_SHADOW_MODE_ENABLED_ENV === "NONGA_AI_SHADOW_MODE_ENABLED");
  ok("NONGA_AI_USER_VISIBLE_ENABLED env key", NONGA_AI_USER_VISIBLE_ENABLED_ENV === "NONGA_AI_USER_VISIBLE_ENABLED");
  ok("v60r user visible blocked constant", SALES_BRAIN_V60R_USER_VISIBLE_BLOCKED === true);
}

// --- missing env → all AI off ---
{
  const flags = resolveSalesBrainRuntimeFlags({ env: {}, environment: "staging" });
  ok("missing env provider none", flags.provider === "none");
  ok("missing env mode off", flags.mode === "off");
  ok("missing env ai first off", flags.aiFirstEnabled === false);
  ok("missing env shadow off", flags.shadowModeEnabled === false);
  ok("missing env user visible false", flags.userVisibleEnabled === false);
  ok("missing env shadow not allowed", flags.shadowEvaluationAllowed === false);
  ok("missing env fallback deterministic", flags.fallbackToDeterministic === true);
}

// --- production default off ---
{
  const prod = resolveSalesBrainRuntimeFlags({
    env: shadowEnv(),
    environment: "production",
  });
  ok("production shadow not allowed", prod.shadowEvaluationAllowed === false);
  ok("production blocked reason", prod.enablementBlockedReason === "production_default_off");
}

// --- shadow enabled + user-visible false → shadow allowed, legacy visible ---
{
  const flags = resolveSalesBrainRuntimeFlags({ env: shadowEnv(), environment: "staging" });
  ok("staging shadow allowed", flags.shadowEvaluationAllowed === true);
  ok("staging user visible false", flags.userVisibleEnabled === false);

  const ev = evaluateSalesBrainShadowRuntime({
    userMessage: "งบ 4 แสน มีรถอะไรน่าเล่น",
    userRole: "buyer",
    legacyUserVisibleResponse: LEGACY_RESPONSE,
    env: shadowEnv(),
    environment: "staging",
  });
  ok("shadow active with flags", ev.shadowModeActive === true);
  ok("visible remains legacy", ev.userVisibleResponse === LEGACY_RESPONSE);
  ok("shadow debug present", Boolean(ev.shadowDebugResult));
  ok("shadow mock provider only", ev.shadowDebugResult?.provider === "mock");
}

// --- user-visible true blocked in v6.0R ---
{
  const flags = resolveSalesBrainRuntimeFlags({
    env: shadowEnv({ [NONGA_AI_USER_VISIBLE_ENABLED_ENV]: "true" }),
    environment: "staging",
  });
  ok("user visible requested detected", flags.userVisibleRequested === true);
  ok("user visible effective false", flags.userVisibleEnabled === false);
  ok("user visible true blocks shadow", flags.shadowEvaluationAllowed === false);
  ok("user visible blocked reason", flags.enablementBlockedReason === "user_visible_blocked_v60r");

  const ev = evaluateSalesBrainShadowRuntime({
    userMessage: "งบ 4 แสน มีรถอะไรน่าเล่น",
    userRole: "buyer",
    legacyUserVisibleResponse: LEGACY_RESPONSE,
    env: shadowEnv({ [NONGA_AI_USER_VISIBLE_ENABLED_ENV]: "true" }),
    environment: "staging",
  });
  ok("user visible true shadow skipped", ev.shadowModeActive === false);
  ok("user visible true legacy unchanged", ev.userVisibleResponse === LEGACY_RESPONSE);
  ok("user visible blocked reason on result", ev.userVisibleBlockedReason === "user_visible_blocked_v60r");
}

// --- kill switch overrides everything ---
{
  const flags = resolveSalesBrainRuntimeFlags({
    env: shadowEnv({ [NONGA_AI_EMERGENCY_KILL_SWITCH_ENV]: "true" }),
    environment: "staging",
  });
  ok("kill switch blocks shadow", flags.shadowEvaluationAllowed === false);
  ok("kill switch reason", flags.enablementBlockedReason === "emergency_kill_switch");
  ok("kill switch fallback", flags.fallbackToDeterministic === true);

  const ev = evaluateSalesBrainShadowRuntime({
    userMessage: "งบ 4 แสน มีรถอะไรน่าเล่น",
    userRole: "buyer",
    legacyUserVisibleResponse: LEGACY_RESPONSE,
    env: shadowEnv({ [NONGA_AI_EMERGENCY_KILL_SWITCH_ENV]: "true" }),
    environment: "staging",
  });
  ok("kill switch shadow inactive", ev.shadowModeActive === false);
  ok("kill switch legacy unchanged", ev.userVisibleResponse === LEGACY_RESPONSE);
}

// --- budget missing blocks enablement ---
{
  const noDaily = resolveSalesBrainRuntimeFlags({
    env: shadowEnv({ [NONGA_AI_BUDGET_DAILY_LIMIT_ENV]: "" }),
    environment: "staging",
  });
  ok("missing daily budget blocks", noDaily.shadowEvaluationAllowed === false);
  ok("missing daily reason", noDaily.enablementBlockedReason === "budget_caps_missing");

  const noMonthly = resolveSalesBrainRuntimeFlags({
    env: shadowEnv({ [NONGA_AI_BUDGET_MONTHLY_LIMIT_ENV]: "" }),
    environment: "staging",
  });
  ok("missing monthly budget blocks", noMonthly.shadowEvaluationAllowed === false);
}

// --- provider gemini only ---
{
  const gemini = resolveSalesBrainRuntimeFlags({ env: shadowEnv(), environment: "staging" });
  ok("gemini provider accepted", gemini.provider === "gemini");

  const openai = resolveSalesBrainRuntimeFlags({
    env: shadowEnv({ [NONGA_AI_PROVIDER_ENV]: "openai" }),
    environment: "staging",
  });
  ok("openai treated as none", openai.provider === "none");
  ok("openai blocks shadow", openai.shadowEvaluationAllowed === false);
  ok("openai blocked reason", openai.enablementBlockedReason === "provider_not_gemini");
}

// --- paid AI network still disabled ---
{
  ok("network disabled constant", SALES_BRAIN_REAL_PROVIDER_NETWORK_ENABLED === false);
  let realThrew = false;
  try {
    createSalesBrainAdapter({ provider: "real", readEnv: () => "sm-configured-via-secret-ref" }).route({
      userMessage: "test",
      userRole: "buyer",
    });
  } catch (e) {
    realThrew = e instanceof SalesBrainRealProviderNetworkDisabledError;
  }
  ok("real provider not callable", realThrew);
}

// --- safety: no raw PII in shadow summary ---
{
  const flags = resolveSalesBrainRuntimeFlags({ env: shadowEnv(), environment: "staging" });
  const summary = summarizeShadowRuntimeFlags(flags);
  ok("summary no raw phone", !summary.includes("0812345678"));
  const phoneEv = evaluateSalesBrainShadowRuntime({
    userMessage: "งบ 4 แสน โทร 0812345678",
    userRole: "buyer",
    legacyUserVisibleResponse: LEGACY_RESPONSE,
    env: shadowEnv(),
    environment: "staging",
  });
  ok("shadow phone no raw in json", !JSON.stringify(phoneEv).includes("0812345678"));
  ok("phone visible legacy", phoneEv.userVisibleResponse === LEGACY_RESPONSE);
}

// --- no-go zones unchanged visible ---
{
  const out = evaluateSalesBrainShadowRuntime({
    userMessage: "process payment for this lead",
    userRole: "admin",
    legacyUserVisibleResponse: LEGACY_RESPONSE,
    env: shadowEnv(),
    environment: "staging",
  });
  ok("no-go payment safety", out.shadowDebugResult?.safetyDecision === "no_go");
  ok("no-go payment visible legacy", out.userVisibleResponse === LEGACY_RESPONSE);
}

// --- not wired: useChat / orchestrator ---
{
  ok("useChat no salesBrainShadowRuntime", !useChat.includes("salesBrainShadowRuntime"));
  ok("useChat no evaluateSalesBrainShadowRuntime", !useChat.includes("evaluateSalesBrainShadowRuntime"));
  ok("useChat no salesBrainRuntimeFlags", !useChat.includes("salesBrainRuntimeFlags"));
  ok("orchestrator no salesBrainShadowRuntime", !orch.includes("salesBrainShadowRuntime"));
  ok("orchestrator no salesBrainRuntimeFlags", !orch.includes("salesBrainRuntimeFlags"));
  ok("useChat no salesBrainAdapter", !useChat.includes("salesBrainAdapter"));
  ok("orchestrator no salesBrainAdapter", !orch.includes("salesBrainAdapter"));
}

// --- source static: no network / secrets ---
{
  for (const src of [flagsSrc, runtimeSrc]) {
    ok("source no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(src));
    ok("source no generateContent", !/generateContent\s*\(/.test(src));
    ok("source no http url", !/https?:\/\//.test(src));
    ok("source no firebase import", !/from\s+["']firebase/.test(src));
  }
  ok("runtime uses mock shadow path", runtimeSrc.includes("evaluateSalesBrainShadowMode"));
  ok("runtime preserves legacyUserVisibleResponse", runtimeSrc.includes("legacyUserVisibleResponse"));
  ok("flags read all NONGA_AI env keys", flagsSrc.includes("NONGA_AI_SHADOW_MODE_ENABLED"));
}

// --- no secret values in source ---
{
  for (const pat of SECRET_VALUE_PATTERNS) {
    ok(`flags no secret ${pat.source.slice(0, 16)}`, !pat.test(flagsSrc));
    ok(`runtime no secret ${pat.source.slice(0, 16)}`, !pat.test(runtimeSrc));
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
  ok("package v60r script", pkg.includes("test:v60r-runtime-shadow-flag-reader-user-visible-off"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v60r-runtime-shadow-flag-reader-user-visible-off.mts")
  );
}

console.log("\nDone v6.0R Runtime Shadow Flag Reader / User-visible Off tests.");
if (process.exitCode) process.exit(process.exitCode);
