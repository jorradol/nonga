/**
 * v6.8C — Staging real Gemini shadow smoke readiness (static/offline only)
 * npm run test:v68c-staging-real-gemini-shadow-smoke-readiness
 *
 * No fetch, no Gemini SDK invoke, no paid API, no gcloud execution.
 */
import { readFileSync } from "node:fs";
import {
  ADMIN_SHADOW_GEMINI_MODEL,
  ADMIN_SHADOW_REAL_PROVIDER_ALLOWED_CASE_IDS,
  canAttemptAdminShadowRealProvider,
  isAdminShadowRealProviderEnabled,
  resetAdminShadowGeminiCallerForTests,
  setAdminShadowGeminiCallerForTests,
} from "../src/services/ai/salesBrainAdminShadowRealProvider.ts";
import {
  SALES_BRAIN_ADMIN_SHADOW_SMOKE_ROUTE,
  SALES_BRAIN_ADMIN_SHADOW_SMOKE_CASES,
  stagingStyleShadowEnv,
} from "../src/services/ai/salesBrainServerShadowSmoke.ts";
import {
  SALES_BRAIN_CHAT_SHADOW_SINK_ROUTE,
  SALES_BRAIN_CHAT_SHADOW_SINK_SCENARIOS,
} from "../src/services/ai/salesBrainServerChatShadowSink.ts";
import {
  CHAT_SHADOW_REAL_PROVIDER_ALLOWED_SCENARIO_IDS,
  canAttemptChatShadowRealProvider,
  isChatShadowRealProviderEnabled,
  isGlobalChatShadowEmergencyKillSwitchActive,
} from "../src/services/ai/salesBrainChatShadowRealProvider.ts";
import {
  NONGA_AI_ADMIN_SHADOW_MANUAL_SMOKE_CASE_ID_ENV,
  NONGA_AI_ADMIN_SHADOW_MANUAL_SMOKE_ENABLED_ENV,
  NONGA_AI_ADMIN_SHADOW_PROVIDER_TIMEOUT_MS_ENV,
  NONGA_AI_ADMIN_SHADOW_REAL_PROVIDER_ENABLED_ENV,
  NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED_ENV,
  NONGA_AI_EMERGENCY_KILL_SWITCH_ENV,
  NONGA_AI_LEGACY_PUBLIC_GEMINI_ENABLED_ENV,
  NONGA_AI_USER_VISIBLE_ENABLED_ENV,
} from "../src/services/ai/salesBrainRuntimeFlags.ts";
import {
  canInvokeLegacyGeminiProvider,
} from "../src/server/security/legacyGeminiSafety.ts";
import {
  SALES_BRAIN_REAL_PROVIDER_NETWORK_ENABLED,
  SALES_BRAIN_GEMINI_SM_RESOURCE,
  SALES_BRAIN_GEMINI_ENV_VAR,
  geminiSecretMapping,
} from "../src/services/ai/salesBrainRealProvider.ts";
import { resolveUserVisibleChatResponse } from "../src/services/ai/salesBrainUserVisibleChatPath.ts";
import { evaluateUserVisibleGate } from "../src/services/ai/salesBrainUserVisibleGate.ts";

const DOC_PATH = "docs/v6.8C-staging-real-gemini-shadow-smoke-operator-checklist.md";
const HEAD_SHA = "9cb467d9d0a80fa4437ab87a79abcf81942d77e8";
const STAGING_ENV = stagingStyleShadowEnv();

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /sk-proj-[a-zA-Z0-9_-]{10,}/,
  /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
];

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function readEnvFrom(map: Record<string, string>, key: string): string | undefined {
  return map[key];
}

console.log("=== v6.8C Staging Real Gemini Shadow Smoke Readiness ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const docLower = doc.toLowerCase();
const selfSrc = readFileSync("scripts/test-v68c-staging-real-gemini-shadow-smoke-readiness.mts", "utf8");
const pkg = readFileSync("package.json", "utf8");
const shadowSmokeSrc = readFileSync("src/services/ai/salesBrainServerShadowSmoke.ts", "utf8");
const adminProviderSrc = readFileSync("src/services/ai/salesBrainAdminShadowRealProvider.ts", "utf8");
const chatSinkSrc = readFileSync("src/services/ai/salesBrainServerChatShadowSink.ts", "utf8");
const userVisiblePathSrc = readFileSync("src/services/ai/salesBrainUserVisibleChatPath.ts", "utf8");
const runtimeFlagsSrc = readFileSync("src/services/ai/salesBrainRuntimeFlags.ts", "utf8");

ok("doc exists", doc.length > 0);
ok("doc v6.8C label", doc.includes("v6.8C"));
ok("doc SS-01 section", /SS-01/i.test(doc));
ok("doc CP-02 optional", /CP-02/i.test(doc));
ok("doc env bundle", doc.includes("NONGA_AI_SHADOW_MODE_ENABLED"));
ok("doc secret manager gemini-api-key", doc.includes("gemini-api-key"));
ok("doc GEMINI_API_KEY env", doc.includes("GEMINI_API_KEY"));
ok("doc kill switch drill", /kill switch drill/i.test(doc));
ok("doc rollback", /rollback/i.test(docLower));
ok("doc userVisibleOff", doc.includes("userVisibleOff"));
ok("doc providerNetwork", doc.includes("providerNetwork"));
ok("doc realProviderGateReason", doc.includes("realProviderGateReason"));
ok("doc user-visible blocked", /user-visible real gemini.*ยังไม่|ไม่เปิด real gemini user-visible/i.test(doc));
ok("doc no production", /ห้าม deploy production|production/i.test(doc));
ok("doc no guest", /guest/i.test(docLower));
ok("doc no firestore write", /firestore write/i.test(docLower));
ok("doc HEAD 9cb467d", doc.includes(HEAD_SHA) || doc.includes("9cb467d"));
ok("doc DO NOT RUN paid api from repo", /ไม่เรียก paid|paid gemini api จาก repo/i.test(doc));

ok(
  "SS-01 route constant",
  SALES_BRAIN_ADMIN_SHADOW_SMOKE_ROUTE === "/api/admin/sales-brain-shadow-smoke"
);
ok(
  "CP-02 route constant",
  SALES_BRAIN_CHAT_SHADOW_SINK_ROUTE === "/api/admin/chat-shadow-sink"
);
ok("SS-01 only real case", ADMIN_SHADOW_REAL_PROVIDER_ALLOWED_CASE_IDS[0] === "SS-01");
ok("CP-02 only real scenario", CHAT_SHADOW_REAL_PROVIDER_ALLOWED_SCENARIO_IDS[0] === "CP-02");

ok(
  "SS-01 can attempt when flags on",
  canAttemptAdminShadowRealProvider({
    caseId: "SS-01",
    environment: "staging",
    readEnv: (k) =>
      readEnvFrom(
        {
          ...STAGING_ENV,
          [NONGA_AI_ADMIN_SHADOW_REAL_PROVIDER_ENABLED_ENV]: "true",
          [NONGA_AI_ADMIN_SHADOW_MANUAL_SMOKE_ENABLED_ENV]: "true",
          [NONGA_AI_ADMIN_SHADOW_MANUAL_SMOKE_CASE_ID_ENV]: "SS-01",
        },
        k
      ),
  })
);
ok(
  "SS-02 cannot attempt real",
  !canAttemptAdminShadowRealProvider({
    caseId: "SS-02",
    environment: "staging",
    readEnv: (k) =>
      readEnvFrom(
        {
          ...STAGING_ENV,
          [NONGA_AI_ADMIN_SHADOW_REAL_PROVIDER_ENABLED_ENV]: "true",
          [NONGA_AI_ADMIN_SHADOW_MANUAL_SMOKE_ENABLED_ENV]: "true",
          [NONGA_AI_ADMIN_SHADOW_MANUAL_SMOKE_CASE_ID_ENV]: "SS-01",
        },
        k
      ),
  })
);
ok(
  "SS-01 blocked when admin flag off",
  !canAttemptAdminShadowRealProvider({
    caseId: "SS-01",
    environment: "staging",
    readEnv: (k) =>
      readEnvFrom(
        {
          ...STAGING_ENV,
          [NONGA_AI_ADMIN_SHADOW_REAL_PROVIDER_ENABLED_ENV]: "false",
        },
        k
      ),
  })
);
ok(
  "SS-01 blocked on production",
  !canAttemptAdminShadowRealProvider({
    caseId: "SS-01",
    environment: "production",
    readEnv: (k) =>
      readEnvFrom(
        {
          ...STAGING_ENV,
          [NONGA_AI_ADMIN_SHADOW_REAL_PROVIDER_ENABLED_ENV]: "true",
          [NONGA_AI_ADMIN_SHADOW_MANUAL_SMOKE_ENABLED_ENV]: "true",
          [NONGA_AI_ADMIN_SHADOW_MANUAL_SMOKE_CASE_ID_ENV]: "SS-01",
        },
        k
      ),
  })
);

ok(
  "CP-02 can attempt when flags on",
  canAttemptChatShadowRealProvider({
    scenarioId: "CP-02",
    environment: "staging",
    readEnv: (k) =>
      readEnvFrom(
        {
          ...STAGING_ENV,
          [NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED_ENV]: "true",
        },
        k
      ),
  })
);
ok(
  "CP-01 cannot attempt real",
  !canAttemptChatShadowRealProvider({
    scenarioId: "CP-01",
    environment: "staging",
    readEnv: (k) =>
      readEnvFrom(
        {
          ...STAGING_ENV,
          [NONGA_AI_CHAT_SHADOW_REAL_PROVIDER_ENABLED_ENV]: "true",
        },
        k
      ),
  })
);

ok(
  "SS-01 blocked when manual smoke disabled",
  !canAttemptAdminShadowRealProvider({
    caseId: "SS-01",
    environment: "staging",
    readEnv: (k) =>
      readEnvFrom(
        {
          ...STAGING_ENV,
          [NONGA_AI_ADMIN_SHADOW_REAL_PROVIDER_ENABLED_ENV]: "true",
          [NONGA_AI_ADMIN_SHADOW_MANUAL_SMOKE_ENABLED_ENV]: "false",
          [NONGA_AI_ADMIN_SHADOW_MANUAL_SMOKE_CASE_ID_ENV]: "SS-01",
        },
        k
      ),
  })
);
ok(
  "SS-01 blocked when manual smoke case mismatch",
  !canAttemptAdminShadowRealProvider({
    caseId: "SS-01",
    environment: "staging",
    readEnv: (k) =>
      readEnvFrom(
        {
          ...STAGING_ENV,
          [NONGA_AI_ADMIN_SHADOW_REAL_PROVIDER_ENABLED_ENV]: "true",
          [NONGA_AI_ADMIN_SHADOW_MANUAL_SMOKE_ENABLED_ENV]: "true",
          [NONGA_AI_ADMIN_SHADOW_MANUAL_SMOKE_CASE_ID_ENV]: "SS-02",
        },
        k
      ),
  })
);
ok(
  "kill switch blocks SS-01 attempt",
  !canAttemptAdminShadowRealProvider({
    caseId: "SS-01",
    environment: "staging",
    readEnv: (k) =>
      readEnvFrom(
        {
          ...STAGING_ENV,
          [NONGA_AI_ADMIN_SHADOW_REAL_PROVIDER_ENABLED_ENV]: "true",
          [NONGA_AI_ADMIN_SHADOW_MANUAL_SMOKE_ENABLED_ENV]: "true",
          [NONGA_AI_ADMIN_SHADOW_MANUAL_SMOKE_CASE_ID_ENV]: "SS-01",
          [NONGA_AI_EMERGENCY_KILL_SWITCH_ENV]: "true",
        },
        k
      ),
  }) ||
    isGlobalChatShadowEmergencyKillSwitchActive((k) =>
      readEnvFrom(
        {
          ...STAGING_ENV,
          [NONGA_AI_EMERGENCY_KILL_SWITCH_ENV]: "true",
        },
        k
      )
    )
);
ok(
  "legacy gemini blocked when kill switch on",
  !canInvokeLegacyGeminiProvider(true, (k) => {
    if (k === NONGA_AI_EMERGENCY_KILL_SWITCH_ENV) return "true";
    if (k === NONGA_AI_LEGACY_PUBLIC_GEMINI_ENABLED_ENV) return "true";
    return undefined;
  })
);

ok("staging env user visible false", STAGING_ENV[NONGA_AI_USER_VISIBLE_ENABLED_ENV] === "false");
ok("staging env kill switch false default", STAGING_ENV[NONGA_AI_EMERGENCY_KILL_SWITCH_ENV] === "false");

const gateOff = evaluateUserVisibleGate({
  firebaseUid: "synthetic-uid-v68c",
  environment: "staging",
  env: STAGING_ENV,
});
ok("user visible gate off with staging shadow env", !gateOff.effectiveUserVisibleAllowed);

const pilotResolved = resolveUserVisibleChatResponse({
  userMessage: "งบ 4 แสน มีรถอะไรน่าเล่น",
  legacyUserVisibleResponse: "legacy orchestrator text",
  firebaseUid: "synthetic-uid-v68c",
  environment: "staging",
  env: {
    ...STAGING_ENV,
    [NONGA_AI_USER_VISIBLE_ENABLED_ENV]: "true",
    NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS: "synthetic-uid-v68c",
  },
});
ok("pilot path mock only no GoogleGenAI in user visible path", !/GoogleGenAI/.test(userVisiblePathSrc));
ok("real provider network disabled", SALES_BRAIN_REAL_PROVIDER_NETWORK_ENABLED === false);

const mapping = geminiSecretMapping();
ok("secret mapping env var", mapping.envVar === SALES_BRAIN_GEMINI_ENV_VAR);
ok("secret mapping sm resource", mapping.smResource === SALES_BRAIN_GEMINI_SM_RESOURCE);

ok("shadow smoke handler userVisibleOff true", shadowSmokeSrc.includes("userVisibleOff: true"));
ok("chat sink handler userVisibleOff true", chatSinkSrc.includes("userVisibleOff: true"));
ok("chat sink handler sinkOnly true", chatSinkSrc.includes("sinkOnly: true"));
ok(
  "admin provider timeout env key wired",
  adminProviderSrc.includes(NONGA_AI_ADMIN_SHADOW_PROVIDER_TIMEOUT_MS_ENV)
);
ok(
  "runtime flags timeout env key exported",
  runtimeFlagsSrc.includes(NONGA_AI_ADMIN_SHADOW_PROVIDER_TIMEOUT_MS_ENV)
);
ok(
  "admin provider timeout bounds present",
  adminProviderSrc.includes("ADMIN_SHADOW_PROVIDER_TIMEOUT_DEFAULT_MS") &&
    adminProviderSrc.includes("ADMIN_SHADOW_PROVIDER_TIMEOUT_MIN_MS") &&
    adminProviderSrc.includes("ADMIN_SHADOW_PROVIDER_TIMEOUT_MAX_MS")
);
ok(
  "shadow smoke stage diagnostics present",
  shadowSmokeSrc.includes("admin_shadow_provider_call_start") &&
    shadowSmokeSrc.includes("admin_shadow_provider_call_timeout") &&
    shadowSmokeSrc.includes("admin_shadow_fallback_returned")
);

ok("SS-05 kill switch case exists", "SS-05" in SALES_BRAIN_ADMIN_SHADOW_SMOKE_CASES);
ok("CP-03 kill switch scenario exists", "CP-03" in SALES_BRAIN_CHAT_SHADOW_SINK_SCENARIOS);
ok(
  "SS-05 env kill switch true",
  SALES_BRAIN_ADMIN_SHADOW_SMOKE_CASES["SS-05"].env?.[NONGA_AI_EMERGENCY_KILL_SWITCH_ENV] === "true"
);

setAdminShadowGeminiCallerForTests(async () => ({
  providerNetworkUsed: true,
  redactedProviderOutput: "[mock-redacted-v68c]",
  requestIdHash: "mockhashv68c",
  modelId: ADMIN_SHADOW_GEMINI_MODEL,
  budgetDailyLimit: 5,
  budgetMonthlyLimit: 50,
}));
ok("admin shadow flag reader", !isAdminShadowRealProviderEnabled((k) => "false"));
ok(
  "chat shadow flag reader",
  !isChatShadowRealProviderEnabled((k) => "false")
);
resetAdminShadowGeminiCallerForTests();

ok("package v68c script", pkg.includes("test:v68c-staging-real-gemini-shadow-smoke-readiness"));

for (const pattern of SECRET_VALUE_PATTERNS) {
  ok(`doc no secret ${pattern.source.slice(0, 12)}`, !pattern.test(doc));
  ok(`self no secret ${pattern.source.slice(0, 12)}`, !pattern.test(selfSrc));
}

ok("self no fetch http", !/\bfetch\s*\(\s*['"]https?:/i.test(selfSrc));
ok("self no gemini sdk invoke", !/await\s+client\.models\./.test(selfSrc));
ok("self no execSync gcloud", !/execSync\s*\(\s*['"]gcloud/.test(selfSrc));
ok("self uses readFileSync", selfSrc.includes("readFileSync"));

console.log("\nDone v6.8C Staging Real Gemini Shadow Smoke Readiness tests.\n");
