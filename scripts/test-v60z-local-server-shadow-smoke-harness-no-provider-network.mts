/**
 * v6.0Z — Local Server Shadow Smoke Harness / No Provider Network
 * npm run test:v60z-local-server-shadow-smoke-harness-no-provider-network
 *
 * Offline harness for evaluateSalesBrainShadowRuntime — mock env/input only.
 * No fetch, no generateContent, no gcloud/firebase, no secret values, no real PII/stock.
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
  evaluateSalesBrainShadowRuntime,
  summarizeShadowRuntimeFlags,
} from "../src/services/ai/salesBrainShadowRuntime.ts";
import {
  SalesBrainRealProviderNetworkDisabledError,
  createSalesBrainAdapter,
} from "../src/services/ai/salesBrainAdapter.ts";
import { SALES_BRAIN_REAL_PROVIDER_NETWORK_ENABLED } from "../src/services/ai/salesBrainRealProvider.ts";
import type { SalesBrainListingContext } from "../src/services/ai/salesBrainTypes.ts";

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
];

const LEGACY_BUYER_SEARCH = "legacy orchestrator — buyer search results unchanged";
const LEGACY_LISTING = "legacy orchestrator — mock listing advisor text unchanged";
const LEGACY_START_OVER =
  "ยกเลิกข้อมูลเดิมแล้วครับ พิมพ์ข้อมูลรถคันใหม่ที่ต้องการลงขายได้เลยครับ";
const LEGACY_DEALER_INVENTORY = "legacy orchestrator — dealer inventory count template unchanged";
const LEGACY_GENERIC = "legacy orchestrator — generic fallback unchanged";

const MOCK_LISTING: SalesBrainListingContext = {
  listingId: "mock-listing-001",
  brand: "Toyota",
  model: "Corolla",
  price: 450000,
  fieldsPresent: ["brand", "model", "year"],
};

const PII_PHONE = "0812345678";
const PII_EMAIL = "customer.real@example.com";

const runtimeSrc = readFileSync("src/services/ai/salesBrainShadowRuntime.ts", "utf8");
const shadowModeSrc = readFileSync("src/services/ai/salesBrainShadowMode.ts", "utf8");
const realProviderSrc = readFileSync("src/services/ai/salesBrainRealProvider.ts", "utf8");
const useChat = readFileSync("src/hooks/chat/useChat.ts", "utf8");
const orch = readFileSync("src/services/ai/chat/chatSearchOrchestrator.ts", "utf8");
const pkg = readFileSync("package.json", "utf8");
const selfSrc = readFileSync(
  "scripts/test-v60z-local-server-shadow-smoke-harness-no-provider-network.mts",
  "utf8"
);
const docV60y = readFileSync(
  "docs/v6.0Y-server-side-shadow-evaluation-smoke-readiness.md",
  "utf8"
);
const docV60z = readFileSync(
  "docs/v6.0Z-local-server-shadow-smoke-harness-no-provider-network.md",
  "utf8"
);

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function stagingShadowEnv(overrides: Record<string, string> = {}): Record<string, string> {
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

function assertLegacyUnchanged(
  caseId: string,
  legacy: string,
  result: ReturnType<typeof evaluateSalesBrainShadowRuntime>
) {
  ok(`${caseId} userVisibleResponse legacy`, result.userVisibleResponse === legacy);
}

function assertNoRawPii(caseId: string, result: ReturnType<typeof evaluateSalesBrainShadowRuntime>) {
  const blob = JSON.stringify(result);
  ok(`${caseId} no raw phone in json`, !blob.includes(PII_PHONE));
  ok(`${caseId} no raw email in json`, !blob.includes(PII_EMAIL));
  ok(`${caseId} no phone-redacted ok if present`, !/\b0[689]\d{8}\b/.test(blob));
}

console.log("=== v6.0Z Local Server Shadow Smoke Harness / No Provider Network ===\n");

// --- harness metadata ---
{
  ok("doc v60z exists", docV60z.length > 2000);
  ok("doc references evaluateSalesBrainShadowRuntime", docV60z.includes("evaluateSalesBrainShadowRuntime"));
  ok("doc no secrets versions access", /did not run.*secrets versions access/i.test(docV60z));
  ok("v60y SS cases documented", docV60y.includes("SS-01") && docV60y.includes("SS-08"));
}

// --- provider network disabled (global) ---
{
  ok("network disabled constant", SALES_BRAIN_REAL_PROVIDER_NETWORK_ENABLED === false);
  let realThrew = false;
  try {
    createSalesBrainAdapter({
      provider: "real",
      readEnv: () => "sm-configured-via-secret-ref",
    }).route({ userMessage: "test", userRole: "buyer" });
  } catch (e) {
    realThrew = e instanceof SalesBrainRealProviderNetworkDisabledError;
  }
  ok("real provider adapter throws network disabled", realThrew);
}

// --- SS-01 buyer generic search (no PII) ---
{
  const legacy = LEGACY_BUYER_SEARCH;
  const ev = evaluateSalesBrainShadowRuntime({
    userMessage: "งบ 4 แสน มีรถอะไรน่าเล่น",
    userRole: "buyer",
    legacyUserVisibleResponse: legacy,
    env: stagingShadowEnv(),
    environment: "staging",
  });
  ok("SS-01 shadow active", ev.shadowModeActive === true);
  ok("SS-01 mock provider only", ev.shadowDebugResult?.provider === "mock");
  ok("SS-01 runtime flags shadow allowed", ev.runtimeFlags.shadowEvaluationAllowed === true);
  assertLegacyUnchanged("SS-01", legacy, ev);
  assertNoRawPii("SS-01", ev);
}

// --- SS-02 buyer mock listing ---
{
  const legacy = LEGACY_LISTING;
  const ev = evaluateSalesBrainShadowRuntime({
    userMessage: "รายละเอียดคันนี้หน่อย",
    userRole: "buyer",
    listingContext: MOCK_LISTING,
    legacyUserVisibleResponse: legacy,
    env: stagingShadowEnv(),
    environment: "staging",
  });
  ok("SS-02 shadow active", ev.shadowModeActive === true);
  ok("SS-02 mock listing id only", ev.shadowDebugResult?.provider === "mock");
  assertLegacyUnchanged("SS-02", legacy, ev);
  assertNoRawPii("SS-02", ev);
  ok("SS-02 json no real tent stock id", !JSON.stringify(ev).includes("THOR") && !JSON.stringify(ev).includes("real-stock"));
}

// --- SS-03 seller start over ---
{
  const legacy = LEGACY_START_OVER;
  const ev = evaluateSalesBrainShadowRuntime({
    userMessage: "เริ่มใหม่",
    userRole: "seller",
    legacyUserVisibleResponse: legacy,
    env: stagingShadowEnv(),
    environment: "staging",
  });
  ok("SS-03 shadow evaluates", ev.runtimeFlags.shadowEvaluationAllowed === true);
  assertLegacyUnchanged("SS-03", legacy, ev);
  assertNoRawPii("SS-03", ev);
}

// --- SS-04 dealer generic inventory ---
{
  const legacy = LEGACY_DEALER_INVENTORY;
  const ev = evaluateSalesBrainShadowRuntime({
    userMessage: "มีรถกี่คันในระบบ",
    userRole: "dealer",
    legacyUserVisibleResponse: legacy,
    env: stagingShadowEnv(),
    environment: "staging",
  });
  ok("SS-04 shadow active", ev.shadowModeActive === true);
  assertLegacyUnchanged("SS-04", legacy, ev);
  assertNoRawPii("SS-04", ev);
}

// --- SS-05 kill switch ---
{
  const legacy = LEGACY_GENERIC;
  const env = stagingShadowEnv({ [NONGA_AI_EMERGENCY_KILL_SWITCH_ENV]: "true" });
  const ev = evaluateSalesBrainShadowRuntime({
    userMessage: "หารถ",
    userRole: "buyer",
    legacyUserVisibleResponse: legacy,
    env,
    environment: "staging",
  });
  ok("SS-05 shadow inactive", ev.shadowModeActive === false);
  ok("SS-05 kill switch reason", ev.runtimeFlags.enablementBlockedReason === "emergency_kill_switch");
  ok("SS-05 fallback deterministic", ev.runtimeFlags.fallbackToDeterministic === true);
  assertLegacyUnchanged("SS-05", legacy, ev);
}

// --- SS-06 budget missing ---
{
  const legacy = LEGACY_GENERIC;
  const env = stagingShadowEnv({
    [NONGA_AI_BUDGET_DAILY_LIMIT_ENV]: "",
    [NONGA_AI_BUDGET_MONTHLY_LIMIT_ENV]: "",
  });
  const ev = evaluateSalesBrainShadowRuntime({
    userMessage: "หารถ",
    userRole: "buyer",
    legacyUserVisibleResponse: legacy,
    env,
    environment: "staging",
  });
  ok("SS-06 shadow blocked", ev.runtimeFlags.shadowEvaluationAllowed === false);
  ok("SS-06 budget missing reason", ev.runtimeFlags.enablementBlockedReason === "budget_caps_missing");
  ok("SS-06 shadow inactive", ev.shadowModeActive === false);
  assertLegacyUnchanged("SS-06", legacy, ev);
}

// --- SS-07 user-visible true attempted ---
{
  const legacy = LEGACY_GENERIC;
  const env = stagingShadowEnv({ [NONGA_AI_USER_VISIBLE_ENABLED_ENV]: "true" });
  const ev = evaluateSalesBrainShadowRuntime({
    userMessage: "หารถ",
    userRole: "buyer",
    legacyUserVisibleResponse: legacy,
    env,
    environment: "staging",
  });
  ok("SS-07 shadow blocked", ev.runtimeFlags.shadowEvaluationAllowed === false);
  ok("SS-07 user visible blocked reason", ev.runtimeFlags.enablementBlockedReason === "user_visible_blocked_v60r");
  ok("SS-07 userVisibleBlockedReason on result", ev.userVisibleBlockedReason === "user_visible_blocked_v60r");
  ok("SS-07 shadow inactive", ev.shadowModeActive === false);
  assertLegacyUnchanged("SS-07", legacy, ev);
}

// --- SS-08 production default off ---
{
  const legacy = LEGACY_GENERIC;
  const ev = evaluateSalesBrainShadowRuntime({
    userMessage: "หารถ",
    userRole: "buyer",
    legacyUserVisibleResponse: legacy,
    env: stagingShadowEnv(),
    environment: "production",
  });
  ok("SS-08 production shadow not allowed", ev.runtimeFlags.shadowEvaluationAllowed === false);
  ok("SS-08 production blocked reason", ev.runtimeFlags.enablementBlockedReason === "production_default_off");
  ok("SS-08 shadow inactive", ev.shadowModeActive === false);
  assertLegacyUnchanged("SS-08", legacy, ev);
}

// --- PII in user message must not leak to shadow json ---
{
  const legacy = LEGACY_BUYER_SEARCH;
  const ev = evaluateSalesBrainShadowRuntime({
    userMessage: `งบ 4 แสน โทร ${PII_PHONE} ${PII_EMAIL}`,
    userRole: "buyer",
    legacyUserVisibleResponse: legacy,
    env: stagingShadowEnv(),
    environment: "staging",
  });
  assertNoRawPii("PII-input", ev);
  ok("PII-input legacy unchanged", ev.userVisibleResponse === legacy);
  const summary = summarizeShadowRuntimeFlags(ev.runtimeFlags);
  ok("flag summary no raw phone", !summary.includes(PII_PHONE));
}

// --- no-go: payment / settlement — visible legacy unchanged ---
{
  const legacy = LEGACY_GENERIC;
  const ev = evaluateSalesBrainShadowRuntime({
    userMessage: "process payment and settlement invoice for lead",
    userRole: "admin",
    legacyUserVisibleResponse: legacy,
    env: stagingShadowEnv(),
    environment: "staging",
  });
  ok("no-go payment safety", ev.shadowDebugResult?.safetyDecision === "no_go");
  assertLegacyUnchanged("no-go-payment", legacy, ev);
  ok("no-go no contact reveal in visible", ev.userVisibleResponse === legacy);
}

// --- chat runtime not wired to server evaluate (user-visible path unchanged) ---
{
  ok("useChat wireShadowChatPath not evaluateSalesBrainShadowRuntime", useChat.includes("wireShadowChatPath") && !useChat.includes("evaluateSalesBrainShadowRuntime"));
  ok("orchestrator wireShadowChatPath not evaluateSalesBrainShadowRuntime", orch.includes("wireShadowChatPath") && !orch.includes("evaluateSalesBrainShadowRuntime"));
}

// --- source: mock path only, no network ---
{
  for (const src of [runtimeSrc, shadowModeSrc, realProviderSrc]) {
    ok("source no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(src));
    ok("source no generateContent call", !/generateContent\s*\(/.test(src));
  }
  ok("runtime uses evaluateSalesBrainShadowMode", runtimeSrc.includes("evaluateSalesBrainShadowMode"));
  ok("shadow mode mock provider only", shadowModeSrc.includes('provider: "mock"'));
  ok("runtime preserves legacy on result", runtimeSrc.includes("userVisibleResponse: legacyUserVisibleResponse"));
}

// --- harness script static only ---
{
  const selfCode = selfSrc.split("// --- harness script static only")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no generateContent", !/generateContent\s*\(/.test(selfCode));
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script no spawn gcloud", !/spawn\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script no execSync firebase", !/execSync\s*\(\s*[`'"]firebase/.test(selfCode));
  ok("script uses evaluateSalesBrainShadowRuntime", selfCode.includes("evaluateSalesBrainShadowRuntime"));
}

// --- no secret values in harness sources ---
{
  for (const pat of SECRET_VALUE_PATTERNS) {
    ok(`self no secret ${pat.source.slice(0, 16)}`, !pat.test(selfSrc));
    ok(`runtime no secret ${pat.source.slice(0, 16)}`, !pat.test(runtimeSrc));
  }
}

// --- package.json ---
{
  ok("package v60z script", pkg.includes("test:v60z-local-server-shadow-smoke-harness-no-provider-network"));
  ok(
    "package points to mts",
    pkg.includes("scripts/test-v60z-local-server-shadow-smoke-harness-no-provider-network.mts")
  );
}

console.log("\nDone v6.0Z Local Server Shadow Smoke Harness / No Provider Network tests.");
if (process.exitCode) process.exit(process.exitCode);
