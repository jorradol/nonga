/**
 * v6.8E.3 — Thai brand voice, vehicle English allowlist, real output recovery (offline/static)
 * npm run test:v68e3-thai-brand-voice-vehicle-english-recovery
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
  buildUserVisibleGeminiCombinedPrompt,
  buildUserVisibleGeminiRetryPrompt,
  evaluateRealProviderOutputSafety,
  extractVehicleEnglishAllowlistFromPilotOrchestration,
  hasExcessiveNonThaiContent,
  hasForbiddenBrandVoiceTerm,
  hasGuessedCustomerAddressTerm,
  hasMetaInstructionLeak,
  maybeApplyUserVisibleRealProvider,
  resetUserVisibleGeminiCallerForTests,
  setUserVisibleGeminiCallerForTests,
  stripAllowedVehicleEnglishForThaiCheck,
  USER_VISIBLE_BUYER_PERSONA_MARKERS,
  USER_VISIBLE_BUYER_PROMPT_QUALITY_SLICE_ID,
  USER_VISIBLE_FINAL_ANSWER_MARKER,
  USER_VISIBLE_GENERAL_KNOWLEDGE_DISCLAIMER_MARKERS,
  USER_VISIBLE_RETRY_UNSAFE_REASONS,
  USER_VISIBLE_THAI_ONLY_PROMPT_MARKERS,
  USER_VISIBLE_TWO_LAYER_KNOWLEDGE_MARKERS,
  USER_VISIBLE_VEHICLE_ENGLISH_ALLOWED_MARKERS,
  USER_VISIBLE_REAL_GEMINI_MODEL,
} from "../src/services/ai/salesBrainUserVisibleRealProvider.ts";
import {
  buildBuyerFitPilotCopy,
  buildBuyerSummarizePilotCopy,
  buildPilotBuyerUserVisibleCopy,
} from "../src/services/ai/salesBrainUserVisiblePilotBuyerCopy.ts";
import { runUserVisibleOrchestrationBridge } from "../src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts";

const DOC_PATH = "docs/v6.8E-buyer-chat-prompt-quality-manual-smoke-checklist.md";
const EXEC_RECORD = "docs/v6.8E.2-manual-quality-smoke-partial-execution-record.md";
const REAL_PROVIDER_SRC = "src/services/ai/salesBrainUserVisibleRealProvider.ts";
const PILOT_COPY_SRC = "src/services/ai/salesBrainUserVisiblePilotBuyerCopy.ts";
const TEST_UID = "synthetic-allowlisted-uid-v68e3";

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
    brand: "Honda",
    model: "HR-V",
    year: 2014,
    price: 389000,
    mileage: 164008,
    fuelType: "เบนซิน",
    bodyClassLabel: "SUV / Crossover",
    description: "สภาพตามประกาศ",
  },
  {
    index: 2,
    brand: "Toyota",
    model: "Vios",
    year: 2020,
    price: 389000,
    mileage: 176579,
    fuelType: "เบนซิน",
    bodyClassLabel: "Sedan",
    description: "เลขไมล์ตามประกาศ",
  },
];

const THAI_WITH_VEHICLE_ENGLISH =
  "สวัสดีครับ น้องเอคัดรถในงบที่ขอมา 2 คันแล้วครับ คันแรก Honda HR-V ปี 2014 ราคา 389,000 บาท ไมล์ 164,008 กม. เป็น SUV / Crossover เหมาะใช้งานครอบครัวครับ คันที่สอง Toyota Vios 1.5 ปี 2020 ราคา 389,000 บาท เป็น Sedan ปีค่อนข้างใหม่ครับ ถ้าสนใจคันไหน ฝากชื่อเบอร์ให้ทีมงานติดต่อกลับได้ครับ";

const withMarker = (text: string) => `${USER_VISIBLE_FINAL_ANSWER_MARKER} ${text}`;

const ENGLISH_META = "Wait, Sentence 1 — let's be careful not to invent listing data as an AI.";

const ENGLISH_FULL_SENTENCE =
  "This vehicle is a great choice for daily commuting and offers excellent fuel economy for urban drivers.";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.8E.3 Thai Brand Voice & Vehicle English Recovery ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const execRecord = readFileSync(EXEC_RECORD, "utf8");
const realProviderSrc = readFileSync(REAL_PROVIDER_SRC, "utf8");
const pilotCopySrc = readFileSync(PILOT_COPY_SRC, "utf8");
const pkg = readFileSync("package.json", "utf8");
const selfSrc = readFileSync("scripts/test-v68e3-thai-brand-voice-vehicle-english-recovery.mts", "utf8");

// --- slice + docs ---
{
  ok("quality slice v6.8E.4", USER_VISIBLE_BUYER_PROMPT_QUALITY_SLICE_ID === "v6.8E.4");
  ok("v68e2 execution record exists", execRecord.includes("v6.8E.2") && execRecord.includes("too_short"));
  ok("doc v6.8E.3 section", /v6\.8E\.3|Thai brand voice|vehicle English/i.test(doc));
  ok("package script v68e3", pkg.includes("test:v68e3-thai-brand-voice-vehicle-english-recovery"));
}

// --- prompt persona + two-layer knowledge ---
{
  const prompt = buildUserVisibleGeminiCombinedPrompt("งบ 4 แสน มีรถอะไรน่าเล่น", {
    carCardCount: 2,
    recentCarCards: SAMPLE_CARDS,
  });
  ok("prompt requires final answer marker", prompt.includes(USER_VISIBLE_FINAL_ANSWER_MARKER));
  ok("prompt final answer contract", /ตอบเฉพาะคำตอบสุดท้าย|คำตอบสุดท้าย/.test(prompt));
  ok("prompt no char count trap", !/อย่างน้อย \d+ ตัวอักษร/.test(prompt));
  ok("prompt persona น้องเอ", prompt.includes("น้องเอ"));
  ok("prompt persona คุณลูกค้า", prompt.includes("คุณลูกค้า"));
  ok("prompt no guessed address rule", /ห้ามเดา|ลุง\/ป้า/.test(prompt));
  ok("prompt two-layer listing", prompt.includes("จากข้อมูลในประกาศนี้"));
  ok("prompt two-layer general", prompt.includes("จากความรู้ทั่วไป"));
  ok("prompt vehicle English example", /Honda HR-V|Hybrid|CVT/.test(prompt));
}

// --- vehicle English allowlist ---
{
  const terms = extractVehicleEnglishAllowlistFromPilotOrchestration({
    carCardCount: 2,
    recentCarCards: SAMPLE_CARDS,
  });
  ok("allowlist includes Honda", terms.includes("Honda"));
  ok("allowlist includes HR-V", terms.includes("HR-V"));
  ok("allowlist includes Vios", terms.includes("Vios"));
  const stripped = stripAllowedVehicleEnglishForThaiCheck(THAI_WITH_VEHICLE_ENGLISH, terms);
  ok("strip vehicle tokens reduces latin", stripped.length < THAI_WITH_VEHICLE_ENGLISH.length);
  ok("Thai with Honda HR-V passes non-thai guard", !hasExcessiveNonThaiContent(THAI_WITH_VEHICLE_ENGLISH, terms));
  ok("English meta still blocked", hasMetaInstructionLeak(ENGLISH_META));
  ok("English full sentence blocked", hasExcessiveNonThaiContent(ENGLISH_FULL_SENTENCE, terms));
  const vehicleSafe = evaluateRealProviderOutputSafety(
    THAI_WITH_VEHICLE_ENGLISH,
    "งบ 4 แสน มีรถอะไรน่าเล่น",
    2,
    { allowedVehicleTerms: terms }
  );
  ok("Thai + vehicle names safe", vehicleSafe.safe, vehicleSafe.unsafeReason ?? "");
}

// --- customer address + brand voice guards ---
{
  ok("block ลุง address", hasGuessedCustomerAddressTerm("ลุงครับ รถคันนี้น่าสนใจครับ"));
  ok("block เฮีย address", hasGuessedCustomerAddressTerm("เฮียครับ ลองดูคันนี้"));
  ok("allow คุณลูกค้า", !hasGuessedCustomerAddressTerm("คุณลูกค้าสนใจคันไหนครับ"));
  ok("block ปังปุริเย่", hasForbiddenBrandVoiceTerm("รถคันนี้ปังปุริเย่มากครับ"));
  const addressUnsafe = evaluateRealProviderOutputSafety(
    "ลุงครับ รถคันนี้ Honda HR-V ปี 2014 ราคา 389,000 บาท เหมาะใช้งานครอบครัวจากข้อมูลในระบบครับ ถ้าสนใจฝากชื่อเบอร์ให้ทีมงานติดต่อกลับได้ครับ",
    "งบ 4 แสน มีรถอะไรน่าเล่น",
    2
  );
  ok("guessed address blocked", !addressUnsafe.safe);
  ok("address reason", addressUnsafe.unsafeReason === "customer_address_term");
}

// --- general knowledge disclaimer in prompt ---
{
  const prompt = buildUserVisibleGeminiCombinedPrompt("คันนี้เหมาะกับใคร", {
    carCardCount: 1,
    recentCarCards: [SAMPLE_CARDS[0]!],
  });
  for (const marker of USER_VISIBLE_GENERAL_KNOWLEDGE_DISCLAIMER_MARKERS) {
    ok(`disclaimer marker: ${marker}`, prompt.includes(marker) || prompt.includes("ไม่ใช่การยืนยันสภาพ"));
  }
}

// --- fallback routing summarize/fit ---
{
  const summarizeCopy = buildBuyerSummarizePilotCopy(SAMPLE_CARDS);
  const fitCopy = buildBuyerFitPilotCopy(SAMPLE_CARDS);
  ok("summarize fallback mentions สรุป", summarizeCopy.includes("สรุป"));
  ok("summarize fallback not compare lead", !summarizeCopy.startsWith("ได้ครับ น้องเอเทียบ"));
  ok("fit fallback mentions เหมาะ", fitCopy.includes("เหมาะ"));
  ok("fit fallback not compare lead", !fitCopy.startsWith("ได้ครับ น้องเอเทียบ"));

  const summarizeResult = buildPilotBuyerUserVisibleCopy({
    userMessage: "สรุปจุดเด่นของคันนี้ให้หน่อย",
    intent: "buyer.followup",
    carCardCount: 2,
    recentCarCards: SAMPLE_CARDS,
  });
  ok("pilot copy summarize path", summarizeResult?.text.includes("สรุป") === true);
  ok("pilot copy summarize not compare", !summarizeResult?.text.includes("เทียบจาก 2 คัน"));

  const fitResult = buildPilotBuyerUserVisibleCopy({
    userMessage: "คันนี้เหมาะกับใคร",
    intent: "buyer.followup",
    carCardCount: 2,
    recentCarCards: SAMPLE_CARDS,
  });
  ok("pilot copy fit path", fitResult?.text.includes("เหมาะ") === true);
  ok("pilot copy fit not compare", !fitResult?.text.includes("เทียบจาก 2 คัน"));
  ok("source summarize builder", pilotCopySrc.includes("buildBuyerSummarizePilotCopy"));
  ok("source fit builder", pilotCopySrc.includes("buildBuyerFitPilotCopy"));
}

// --- retry strategy wiring ---
{
  ok("retry unsafe reasons set", USER_VISIBLE_RETRY_UNSAFE_REASONS.has("too_short"));
  ok("retry unsafe reasons non-thai", USER_VISIBLE_RETRY_UNSAFE_REASONS.has("non_thai_output"));
  ok("source retry prompt", realProviderSrc.includes("buildUserVisibleGeminiRetryPrompt"));
  ok("source retry in maybeApply", realProviderSrc.includes("retryContext"));
  ok("source retryAttempt log", realProviderSrc.includes("retryAttempt"));
  const retryPrompt = buildUserVisibleGeminiRetryPrompt("งบ 4 แสน มีรถอะไรน่าเล่น", {
    carCardCount: 2,
    recentCarCards: SAMPLE_CARDS,
  }, "too_short");
  ok("retry prompt requires marker", retryPrompt.includes(USER_VISIBLE_FINAL_ANSWER_MARKER));
  ok("retry prompt repair only", /retry|ตอบใหม่|เขียนใหม่/.test(retryPrompt));
}

function readEnvFrom(map: Record<string, string>, key: string): string | undefined {
  return map[key];
}

function buildPilotBridge(
  bridge: ReturnType<typeof runUserVisibleOrchestrationBridge>,
  overrides: { carCardCount: number; userVisibleText?: string }
) {
  return {
    ...bridge,
    payload: {
      ...bridge.payload,
      pilotPathActive: true,
      fallbackToLegacy: false,
      userVisibleText: overrides.userVisibleText ?? bridge.payload.userVisibleText,
      carCardCount: overrides.carCardCount,
    },
  };
}

// --- retry does not bypass finance guard ---
{
  let callCount = 0;
  setUserVisibleGeminiCallerForTests(async () => {
    callCount += 1;
    return {
      providerNetworkUsed: true,
      redactedProviderOutput:
        callCount === 1
          ? withMarker("สั้นเกินไปครับ")
          : withMarker(
              "ผ่อนได้แน่นอนครับ อนุมัติแน่นอน ทุกคนผ่านชัวร์ครับ ทีมงานช่วยได้ครับ ประเมินเบื้องต้นครับ"
            ),
      requestIdHash: `mockhashv68e3-retry-${callCount}`,
      modelId: USER_VISIBLE_REAL_GEMINI_MODEL,
    };
  });

  const bridge = runUserVisibleOrchestrationBridge({
    userMessage: "ผ่อนประมาณเท่าไหร่ได้ไหม",
    inventory: [],
    trustedFirebaseUid: TEST_UID,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    pilotSessionContext: { recentCarCards: [SAMPLE_CARDS[0]!] },
  });

  const applied = await maybeApplyUserVisibleRealProvider({
    bridgeResult: buildPilotBridge(bridge, { carCardCount: 1 }),
    userMessage: "ผ่อนประมาณเท่าไหร่ได้ไหม",
    firebaseUid: TEST_UID,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    readEnv: (k) => readEnvFrom(STAGING_PILOT_ENV, k),
    pilotOrchestration: { recentCarCards: [SAMPLE_CARDS[0]!], carCardCount: 1 },
  });

  ok("finance retry blocked", applied.payload.realProviderGateReason === "real_provider_output_unsafe");
  ok("finance retry attempted", callCount === 2);
  resetUserVisibleGeminiCallerForTests();
}

// --- meta leak still blocked without retry ---
{
  setUserVisibleGeminiCallerForTests(async () => ({
    providerNetworkUsed: true,
    redactedProviderOutput: ENGLISH_META,
    requestIdHash: "mockhashv68e3-meta",
    modelId: USER_VISIBLE_REAL_GEMINI_MODEL,
  }));

  const bridge = runUserVisibleOrchestrationBridge({
    userMessage: "งบ 4 แสน มีรถอะไรน่าเล่น",
    inventory: [],
    trustedFirebaseUid: TEST_UID,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
  });

  const applied = await maybeApplyUserVisibleRealProvider({
    bridgeResult: buildPilotBridge(bridge, { carCardCount: 2, userVisibleText: "fallback" }),
    userMessage: "งบ 4 แสน มีรถอะไรน่าเล่น",
    firebaseUid: TEST_UID,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    readEnv: (k) => readEnvFrom(STAGING_PILOT_ENV, k),
    pilotOrchestration: { recentCarCards: SAMPLE_CARDS, carCardCount: 2 },
  });

  ok("meta leak no real path", applied.payload.realProviderGateReason === "real_provider_output_unsafe");
  resetUserVisibleGeminiCallerForTests();
}

// --- successful retry path ---
{
  const SHORT = "สวัสดีครับ น้องเอมีรถให้ดูครับ";
  const LONG = THAI_WITH_VEHICLE_ENGLISH;
  let calls = 0;
  setUserVisibleGeminiCallerForTests(async (_input, options) => {
    calls += 1;
    return {
      providerNetworkUsed: true,
      redactedProviderOutput: options.retryContext ? withMarker(THAI_WITH_VEHICLE_ENGLISH) : withMarker(SHORT),
      requestIdHash: `mockhashv68e3-ok-${calls}`,
      modelId: USER_VISIBLE_REAL_GEMINI_MODEL,
    };
  });

  const bridge = runUserVisibleOrchestrationBridge({
    userMessage: "งบ 4 แสน มีรถอะไรน่าเล่น",
    inventory: [],
    trustedFirebaseUid: TEST_UID,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
  });

  const applied = await maybeApplyUserVisibleRealProvider({
    bridgeResult: buildPilotBridge(bridge, { carCardCount: 2, userVisibleText: "fallback" }),
    userMessage: "งบ 4 แสน มีรถอะไรน่าเล่น",
    firebaseUid: TEST_UID,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    readEnv: (k) => readEnvFrom(STAGING_PILOT_ENV, k),
    pilotOrchestration: { recentCarCards: SAMPLE_CARDS, carCardCount: 2 },
  });

  ok("retry success real path", applied.payload.realProviderGateReason === "real_provider_call_ok");
  ok("retry success network", applied.payload.realProviderNetwork === true);
  ok("retry invoked once", calls === 2);
  resetUserVisibleGeminiCallerForTests();
}

console.log("\nDone v6.8E.3 Thai Brand Voice & Vehicle English Recovery tests.\n");
