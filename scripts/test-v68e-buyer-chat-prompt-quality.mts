/**
 * v6.8E — Buyer chat prompt quality & listing-grounded natural replies (offline/static)
 * npm run test:v68e-buyer-chat-prompt-quality
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
  assertNoFinanceGuaranteeLanguage,
  buildUserVisibleGeminiCombinedPrompt,
  maybeApplyUserVisibleRealProvider,
  resetUserVisibleGeminiCallerForTests,
  setUserVisibleGeminiCallerForTests,
  USER_VISIBLE_BUYER_CTA_RULE_MARKERS,
  USER_VISIBLE_BUYER_GROUNDING_RULE_MARKERS,
  USER_VISIBLE_BUYER_MULTI_CARD_RULE_MARKERS,
  USER_VISIBLE_BUYER_PROMPT_QUALITY_SLICE_ID,
  USER_VISIBLE_FINANCE_FORBIDDEN_PHRASES,
  USER_VISIBLE_FINANCE_SAFE_PHRASE_MARKERS,
  USER_VISIBLE_REAL_GEMINI_MODEL,
} from "../src/services/ai/salesBrainUserVisibleRealProvider.ts";
import { runUserVisibleOrchestrationBridge } from "../src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts";

const DOC_PATH = "docs/v6.8E-buyer-chat-prompt-quality-manual-smoke-checklist.md";
const REAL_PROVIDER_SRC = "src/services/ai/salesBrainUserVisibleRealProvider.ts";
const TEST_UID = "synthetic-allowlisted-uid-v68e";
const BUYER_MSG = "งบ 4 แสน มีรถอะไรน่าเล่น";
const FINANCE_MSG = "ผ่อนประมาณเท่าไหร่ได้ไหม";
const COMPARE_MSG = "เทียบคันที่ 1 กับ 2";

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

const SAMPLE_CARDS = [
  {
    index: 1,
    brand: "Toyota",
    model: "Vios",
    year: 2020,
    price: 350000,
    mileage: 45000,
    fuelType: "เบนซิน",
    bodyClassLabel: "รถเก๋ง",
    description: "สภาพดี ใช้งานประจำ",
  },
  {
    index: 2,
    brand: "Honda",
    model: "City",
    year: 2019,
    price: 380000,
    mileage: 62000,
    fuelType: "เบนซิน",
    bodyClassLabel: "รถเก๋ง",
    description: "เลขไมล์ตามประกาศ",
  },
];

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function readEnvFrom(map: Record<string, string>, key: string): string | undefined {
  return map[key];
}

console.log("=== v6.8E Buyer Chat Prompt Quality ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const realProviderSrc = readFileSync(REAL_PROVIDER_SRC, "utf8");
const pkg = readFileSync("package.json", "utf8");
const selfSrc = readFileSync("scripts/test-v68e-buyer-chat-prompt-quality.mts", "utf8");

// --- slice + doc ---
{
  ok("quality slice id v6.8E.2", USER_VISIBLE_BUYER_PROMPT_QUALITY_SLICE_ID === "v6.8E.2");
  ok("checklist doc exists", doc.length > 800);
  ok("checklist v6.8E label", doc.includes("v6.8E"));
  ok("checklist budget search scenario", /budget search/i.test(doc));
  ok("checklist finance scenario", /finance question/i.test(doc));
  ok("checklist compare scenario", /compare two cars/i.test(doc));
  ok("checklist acceptance criteria", /acceptance criteria/i.test(doc));
}

// --- grounding rules in prompt ---
{
  const prompt = buildUserVisibleGeminiCombinedPrompt(BUYER_MSG, {
    carCardCount: 2,
    recentCarCards: SAMPLE_CARDS,
  });
  for (const marker of USER_VISIBLE_BUYER_GROUNDING_RULE_MARKERS) {
    ok(`prompt grounding: ${marker}`, prompt.includes(marker));
  }
  ok("prompt includes listing card #1", prompt.includes("Toyota Vios"));
  ok("prompt includes listing card #2", prompt.includes("Honda City"));
  ok("prompt includes body class", prompt.includes("ประเภท รถเก๋ง"));
  ok("prompt includes year prefix", prompt.includes("ปี 2020"));
}

// --- finance forbidden + safe phrases in prompt instruction ---
{
  const financePrompt = buildUserVisibleGeminiCombinedPrompt(FINANCE_MSG, {
    carCardCount: 1,
    recentCarCards: [SAMPLE_CARDS[0]],
  });
  for (const phrase of USER_VISIBLE_FINANCE_FORBIDDEN_PHRASES) {
    ok(`prompt forbids finance phrase: ${phrase}`, financePrompt.includes(`ห้ามใช้คำ: ${phrase}`) || financePrompt.includes(phrase));
  }
  for (const marker of USER_VISIBLE_FINANCE_SAFE_PHRASE_MARKERS) {
    ok(`prompt safe finance marker: ${marker}`, financePrompt.includes(marker));
  }
}

// --- multi-card non-repetition rules ---
{
  const multiPrompt = buildUserVisibleGeminiCombinedPrompt(COMPARE_MSG, {
    carCardCount: 2,
    recentCarCards: SAMPLE_CARDS,
  });
  for (const marker of USER_VISIBLE_BUYER_MULTI_CARD_RULE_MARKERS) {
    ok(`prompt multi-card rule: ${marker}`, multiPrompt.includes(marker));
  }
  ok("multi-card dynamic note present", multiPrompt.includes("หลายคัน — อธิบายแต่ละคัน"));
}

// --- CTA rules ---
{
  const prompt = buildUserVisibleGeminiCombinedPrompt(BUYER_MSG, { carCardCount: 2 });
  for (const marker of USER_VISIBLE_BUYER_CTA_RULE_MARKERS) {
    ok(`prompt CTA marker: ${marker}`, prompt.includes(marker));
  }
}

// --- output finance guarantee guard ---
{
  ok(
    "safe output passes finance guard",
    assertNoFinanceGuaranteeLanguage("ประเมินเบื้องต้นขึ้นอยู่กับเงื่อนไขไฟแนนซ์ครับ")
  );
  ok(
    "blocks อนุมัติแน่นอน",
    !assertNoFinanceGuaranteeLanguage("ไฟแนนซ์อนุมัติแน่นอนครับ")
  );
  ok(
    "blocks ผ่อนได้แน่นอน",
    !assertNoFinanceGuaranteeLanguage("ผ่อนได้แน่นอนครับ")
  );
  ok(
    "blocks ผ่านชัวร์",
    !assertNoFinanceGuaranteeLanguage("ผ่านชัวร์ครับ")
  );
  ok("source exports finance output guard", realProviderSrc.includes("assertNoFinanceGuaranteeLanguage"));
  ok(
    "source wires finance guard in output safe",
    realProviderSrc.includes("assertNoFinanceGuaranteeLanguage") &&
      realProviderSrc.includes("evaluateRealProviderOutputSafety")
  );
}

// --- fallback unchanged on provider error ---
{
  setUserVisibleGeminiCallerForTests(async () => {
    throw new Error("simulated provider failure v68e");
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
      userVisibleText: "น้องเอช่วยหารถในงบที่คุยกันครับ",
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
  ok("provider error gate failed", applied.payload.realProviderGateReason === "real_provider_call_failed");
  resetUserVisibleGeminiCallerForTests();
}

// --- unsafe finance output triggers fallback ---
{
  setUserVisibleGeminiCallerForTests(async () => ({
    providerNetworkUsed: true,
    redactedProviderOutput: "ผ่อนได้แน่นอนครับ อนุมัติแน่นอน",
    requestIdHash: "mockhashv68e-unsafe",
    modelId: USER_VISIBLE_REAL_GEMINI_MODEL,
  }));

  const bridge = runUserVisibleOrchestrationBridge({
    userMessage: FINANCE_MSG,
    inventory: [],
    trustedFirebaseUid: TEST_UID,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    pilotSessionContext: { recentCarCards: [SAMPLE_CARDS[0]] },
  });
  const pilotBridge = {
    ...bridge,
    payload: {
      ...bridge.payload,
      pilotPathActive: true,
      fallbackToLegacy: false,
      userVisibleText: bridge.payload.userVisibleText || "น้องเอช่วยประเมินเบื้องต้นครับ",
      carCardCount: 1,
    },
  };

  const applied = await maybeApplyUserVisibleRealProvider({
    bridgeResult: pilotBridge,
    userMessage: FINANCE_MSG,
    firebaseUid: TEST_UID,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    readEnv: (k) => readEnvFrom(STAGING_PILOT_ENV, k),
    pilotOrchestration: { carCardCount: 1, recentCarCards: [SAMPLE_CARDS[0]] },
  });
  ok("unsafe finance output blocked", applied.payload.realProviderGateReason === "real_provider_output_unsafe");
  ok("unsafe finance keeps prior text", applied.payload.userVisibleText.length > 0);
  resetUserVisibleGeminiCallerForTests();
}

// --- no real Gemini in test script ---
{
  const selfCode = selfSrc.split("// --- no real Gemini ---")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no generateContent call", !/generateContent\s*\(/.test(selfCode));
  ok("script uses readFileSync", selfCode.includes("readFileSync"));
}

// --- package script ---
{
  ok("package v68e script", pkg.includes("test:v68e-buyer-chat-prompt-quality"));
}

console.log("\nDone v6.8E Buyer Chat Prompt Quality tests.\n");
if (process.exitCode) process.exit(process.exitCode);
