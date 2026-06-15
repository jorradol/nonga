/**
 * v6.8D — Real Gemini user-visible allowlist pilot (static/offline)
 * npm run test:v68d-real-user-visible-allowlist-pilot
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
  NONGA_AI_USER_VISIBLE_REAL_PROVIDER_ENABLED_ENV,
} from "../src/services/ai/salesBrainRuntimeFlags.ts";
import { NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV } from "../src/services/ai/salesBrainUserVisibleGate.ts";
import {
  evaluateUserVisibleRealProviderEligibility,
  maybeApplyUserVisibleRealProvider,
  resetUserVisibleGeminiCallerForTests,
  setUserVisibleGeminiCallerForTests,
  USER_VISIBLE_REAL_GEMINI_MODEL,
  USER_VISIBLE_FINAL_ANSWER_MARKER,
  USER_VISIBLE_REAL_PROVIDER_SLICE_ID,
} from "../src/services/ai/salesBrainUserVisibleRealProvider.ts";
import {
  runUserVisibleOrchestrationBridge,
  SALES_BRAIN_USER_VISIBLE_ORCHESTRATE_ROUTE,
} from "../src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts";
import { resolveUserVisibleChatResponse } from "../src/services/ai/salesBrainUserVisibleChatPath.ts";

const DOC_PATH = "docs/v6.8D-staging-real-gemini-user-visible-allowlist-pilot-checklist.md";
const TEST_UID = "synthetic-allowlisted-uid-v68d";
const LEGACY = "legacy orchestrator reply";
const BUYER_MSG = "งบ 4 แสน มีรถอะไรน่าเล่น";

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
  [NONGA_AI_USER_VISIBLE_REAL_PROVIDER_ENABLED_ENV]: "true",
  GEMINI_API_KEY: "mounted-secret-present",
};

const SECRET_VALUE_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /sk-[a-zA-Z0-9]{20,}/,
  /GEMINI_API_KEY\s*=\s*['"][^'"]{8,}['"]/i,
];

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function readEnvFrom(map: Record<string, string>, key: string): string | undefined {
  return map[key];
}

console.log("=== v6.8D Real User-visible Allowlist Pilot ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const realProviderSrc = readFileSync("src/services/ai/salesBrainUserVisibleRealProvider.ts", "utf8");
const bridgeSrc = readFileSync("src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts", "utf8");
const pilotSrc = readFileSync("src/services/ai/salesBrainUserVisibleChatPath.ts", "utf8");
const pkg = readFileSync("package.json", "utf8");
const selfSrc = readFileSync("scripts/test-v68d-real-user-visible-allowlist-pilot.mts", "utf8");

// --- doc ---
{
  ok("checklist doc exists", doc.length > 1500);
  ok("doc v6.8D label", doc.includes("v6.8D"));
  ok("doc allowlist pilot", /allowlist pilot/i.test(doc));
  ok("doc real provider flag", doc.includes("NONGA_AI_USER_VISIBLE_REAL_PROVIDER_ENABLED"));
  ok("doc rollback", /rollback/i.test(doc));
  ok("doc no production", /production.*not|not production/i.test(doc));
}

// --- wiring ---
{
  ok("slice id v6.8D", USER_VISIBLE_REAL_PROVIDER_SLICE_ID === "v6.8D");
  ok("bridge imports maybeApply", bridgeSrc.includes("maybeApplyUserVisibleRealProvider"));
  ok("bridge route constant", bridgeSrc.includes(SALES_BRAIN_USER_VISIBLE_ORCHESTRATE_ROUTE));
  ok("real provider isolated module", realProviderSrc.includes("USER_VISIBLE_REAL_PROVIDER_SLICE_ID"));
  ok("pilot path still mock default", pilotSrc.includes('provider: "mock"'));
  ok("real provider not in pilot path file", !pilotSrc.includes("GoogleGenAI"));
  ok("real model constant", realProviderSrc.includes(USER_VISIBLE_REAL_GEMINI_MODEL));
}

// --- eligibility: allowlisted + flags ---
{
  const e = evaluateUserVisibleRealProviderEligibility({
    firebaseUid: TEST_UID,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    readEnv: (k) => readEnvFrom(STAGING_PILOT_ENV, k),
  });
  ok("allowlisted eligible", e.eligible === true);
  ok("allowlisted gate reason", e.gateReason === "real_provider_eligible");
}

// --- kill switch ---
{
  const e = evaluateUserVisibleRealProviderEligibility({
    firebaseUid: TEST_UID,
    userRole: "buyer",
    environment: "staging",
    env: { ...STAGING_PILOT_ENV, [NONGA_AI_EMERGENCY_KILL_SWITCH_ENV]: "true" },
    readEnv: (k) => readEnvFrom({ ...STAGING_PILOT_ENV, [NONGA_AI_EMERGENCY_KILL_SWITCH_ENV]: "true" }, k),
  });
  ok("kill switch blocked", !e.eligible);
  ok("kill switch reason", e.gateReason === "emergency_kill_switch");
}

// --- real flag off ---
{
  const e = evaluateUserVisibleRealProviderEligibility({
    firebaseUid: TEST_UID,
    userRole: "buyer",
    environment: "staging",
    env: { ...STAGING_PILOT_ENV, [NONGA_AI_USER_VISIBLE_REAL_PROVIDER_ENABLED_ENV]: "false" },
    readEnv: (k) =>
      readEnvFrom({ ...STAGING_PILOT_ENV, [NONGA_AI_USER_VISIBLE_REAL_PROVIDER_ENABLED_ENV]: "false" }, k),
  });
  ok("real flag off blocked", !e.eligible);
  ok("real flag off reason", e.gateReason === "real_provider_flag_off");
}

// --- guest ---
{
  const e = evaluateUserVisibleRealProviderEligibility({
    firebaseUid: undefined,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    readEnv: (k) => readEnvFrom(STAGING_PILOT_ENV, k),
  });
  ok("guest blocked", !e.eligible);
  ok("guest reason", e.gateReason === "guest_uid_missing");
}

// --- non-allowlisted ---
{
  const e = evaluateUserVisibleRealProviderEligibility({
    firebaseUid: "not-on-list",
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    readEnv: (k) => readEnvFrom(STAGING_PILOT_ENV, k),
  });
  ok("non-allowlisted blocked", !e.eligible);
  ok("non-allowlisted reason", e.gateReason === "uid_not_allowlisted");
}

// --- production ---
{
  const e = evaluateUserVisibleRealProviderEligibility({
    firebaseUid: TEST_UID,
    userRole: "buyer",
    environment: "production",
    env: STAGING_PILOT_ENV,
    readEnv: (k) => readEnvFrom(STAGING_PILOT_ENV, k),
  });
  ok("production blocked", !e.eligible);
  ok("production reason", e.gateReason === "production_environment");
}

// --- missing key ---
{
  const envNoKey = { ...STAGING_PILOT_ENV };
  delete envNoKey.GEMINI_API_KEY;
  const e = evaluateUserVisibleRealProviderEligibility({
    firebaseUid: TEST_UID,
    userRole: "buyer",
    environment: "staging",
    env: envNoKey,
    readEnv: (k) => readEnvFrom(envNoKey, k),
  });
  ok("missing key blocked", !e.eligible);
  ok("missing key reason", e.gateReason === "missing_gemini_key");
}

// --- dealer role ---
{
  const e = evaluateUserVisibleRealProviderEligibility({
    firebaseUid: TEST_UID,
    userRole: "dealer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    readEnv: (k) => readEnvFrom(STAGING_PILOT_ENV, k),
  });
  ok("dealer role blocked", !e.eligible);
  ok("dealer role reason", e.gateReason === "user_role_not_buyer");
}

// --- mock path unchanged when real flag off ---
{
  const mock = resolveUserVisibleChatResponse({
    userMessage: BUYER_MSG,
    legacyUserVisibleResponse: LEGACY,
    userRole: "buyer",
    environment: "staging",
    env: { ...STAGING_PILOT_ENV, [NONGA_AI_USER_VISIBLE_REAL_PROVIDER_ENABLED_ENV]: "false" },
    firebaseUid: TEST_UID,
  });
  ok("mock path active without real flag", mock.pilotPathActive === true);
  ok("mock path thai copy", mock.userVisibleText.includes("น้องเอ"));
}

// --- maybeApply with test caller success ---
{
  setUserVisibleGeminiCallerForTests(async () => ({
    providerNetworkUsed: true,
    redactedProviderOutput: `${USER_VISIBLE_FINAL_ANSWER_MARKER} สวัสดีครับ น้องเอคัดรถในงบประมาณ 4 แสนบาทมาให้ 3 คันแล้วนะครับ คันแรก Toyota Vios ปี 2020 ราคา 350,000 บาท ไมล์ตามประกาศ เหมาะใช้งานประจำครับ คันที่สอง Honda City ปี 2019 ราคาใกล้เคียงกัน อีกคันในรายการคุ้มงบครับ ถ้าสนใจคันไหน ฝากชื่อเบอร์ให้ทีมงานติดต่อกลับได้ครับ`,
    requestIdHash: "mockhashv68d",
    modelId: USER_VISIBLE_REAL_GEMINI_MODEL,
  }));

  const bridge = runUserVisibleOrchestrationBridge({
    userMessage: BUYER_MSG,
    inventory: [],
    trustedFirebaseUid: TEST_UID,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
  });

  const pilotBridge = {
    ...bridge,
    payload: {
      ...bridge.payload,
      pilotPathActive: true,
      fallbackToLegacy: false,
      userVisibleText: bridge.payload.userVisibleText || "น้องเอช่วยหารถในงบที่คุยกันครับ",
      carCardCount: 2,
    },
  };

  const applied = await maybeApplyUserVisibleRealProvider({
    bridgeResult: pilotBridge,
    userMessage: BUYER_MSG,
    firebaseUid: TEST_UID,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    readEnv: (k) => readEnvFrom(STAGING_PILOT_ENV, k),
    pilotOrchestration: { carCardCount: 2 },
  });

  ok("real apply network true", applied.payload.realProviderNetwork === true);
  ok("real apply gate ok", applied.payload.realProviderGateReason === "real_provider_call_ok");
  ok("real apply text from provider", applied.payload.userVisibleText.includes("น้องเอคัดรถ"));

  resetUserVisibleGeminiCallerForTests();
}

// --- maybeApply provider error fallback ---
{
  setUserVisibleGeminiCallerForTests(async () => {
    throw new Error("simulated provider failure");
  });

  const bridge = runUserVisibleOrchestrationBridge({
    userMessage: BUYER_MSG,
    inventory: [],
    trustedFirebaseUid: TEST_UID,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
  });

  const pilotBridge = {
    ...bridge,
    payload: {
      ...bridge.payload,
      pilotPathActive: true,
      fallbackToLegacy: false,
      userVisibleText: bridge.payload.userVisibleText || "น้องเอช่วยหารถในงบที่คุยกันครับ",
      carCardCount: 2,
    },
  };

  const applied = await maybeApplyUserVisibleRealProvider({
    bridgeResult: pilotBridge,
    userMessage: BUYER_MSG,
    firebaseUid: TEST_UID,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    readEnv: (k) => readEnvFrom(STAGING_PILOT_ENV, k),
  });

  ok("provider error keeps mock text", applied.payload.userVisibleText.includes("น้องเอ"));
  ok("provider error network false", applied.payload.realProviderNetwork === false);
  ok("provider error gate reason", applied.payload.realProviderGateReason === "real_provider_call_failed");

  resetUserVisibleGeminiCallerForTests();
}

// --- no secrets ---
{
  for (const src of [doc, realProviderSrc, bridgeSrc, pilotSrc]) {
    for (const pat of SECRET_VALUE_PATTERNS) {
      ok(`no secret pattern ${pat.source.slice(0, 12)}`, !pat.test(src));
    }
  }
}

// --- static test script ---
{
  const selfCode = selfSrc.split("// --- static test script ---")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no execSync gcloud", !/execSync\s*\(\s*[`'"]gcloud/.test(selfCode));
  ok("script uses readFileSync", selfCode.includes("readFileSync"));
}

// --- package ---
{
  ok("package v68d script", pkg.includes("test:v68d-real-user-visible-allowlist-pilot"));
}

console.log("\nDone v6.8D Real User-visible Allowlist Pilot tests.\n");
if (process.exitCode) process.exit(process.exitCode);
