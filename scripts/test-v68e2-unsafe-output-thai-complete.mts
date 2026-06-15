/**
 * v6.8E.2 — Unsafe output reason taxonomy & Thai complete answer guards (offline/static)
 * npm run test:v68e2-unsafe-output-thai-complete
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
  evaluateRealProviderOutputSafety,
  hasExcessiveNonThaiContent,
  hasMetaInstructionLeak,
  looksLikeIncompleteSentence,
  maybeApplyUserVisibleRealProvider,
  resetUserVisibleGeminiCallerForTests,
  setUserVisibleGeminiCallerForTests,
  USER_VISIBLE_BUYER_PROMPT_QUALITY_SLICE_ID,
  USER_VISIBLE_FINAL_ANSWER_MARKER,
  USER_VISIBLE_THAI_ONLY_PROMPT_MARKERS,
  USER_VISIBLE_REAL_GEMINI_MODEL,
  type UserVisibleOutputUnsafeReason,
} from "../src/services/ai/salesBrainUserVisibleRealProvider.ts";
import { runUserVisibleOrchestrationBridge } from "../src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts";

const DOC_PATH = "docs/v6.8E-buyer-chat-prompt-quality-manual-smoke-checklist.md";
const REAL_PROVIDER_SRC = "src/services/ai/salesBrainUserVisibleRealProvider.ts";
const TEST_UID = "synthetic-allowlisted-uid-v68e2";

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

const GOOD_BUDGET_THAI =
  "สวัสดีครับ น้องเอคัดรถในงบประมาณ 4 แสนบาทมาให้ 3 คันแล้วนะครับ คันแรก Toyota Vios ปี 2020 ราคา 350,000 บาท ไมล์ตามประกาศ เหมาะใช้งานประจำครับ คันที่สอง Honda City ปี 2019 ราคาใกล้เคียงกัน อีกคันในรายการคุ้มงบครับ ถ้าสนใจคันไหน ฝากชื่อเบอร์ให้ทีมงานติดต่อกลับได้ครับ";

const GOOD_FINANCE_THAI =
  "จากราคาในระบบ น้องเอประเมินเบื้องต้นว่าอาจผ่อนได้ตามเงื่อนไขไฟแนนซ์ครับ ยอดงวดจริงขึ้นกับดาวน์และคุณสมบัติผู้กู้ครับ ทีมงานช่วยประสานรายละเอียดให้ได้ หากสะดวกฝากชื่อเบอร์ไว้ให้ติดต่อกลับครับ";

const GOOD_COMPARE_THAI =
  "ได้ครับ น้องเอเทียบคันที่ 1 กับ 2 จากข้อมูลในระบบนะครับ คันที่ 1 Toyota Vios ปี 2020 ราคา 350,000 บาท ไมล์ 45,000 กม. เป็นรถเก๋งครับ คันที่ 2 Honda City ปี 2019 ราคา 380,000 บาท ไมล์ 62,000 กม. ปีใหม่กว่าเล็กน้อยครับ ถ้าอยากเน้นปีใหม่ City น่าสนใจ ถ้าเน้นงบ Vios ก็คุ้มครับ";

const GOOD_SUMMARIZE_THAI =
  "คันนี้ Toyota Vios ปี 2020 ราคา 350,000 บาท ไมล์ 45,000 กม. เป็นรถเก๋งเบนซิน จุดเด่นคือปีค่อนข้างใหม่และราคาเข้าถึงง่ายในกลุ่มรถใช้งานประจำครับ ถ้าสนใจฝากชื่อเบอร์ให้ทีมงานช่วยต่อได้ครับ";

const GOOD_FIT_THAI =
  "รถคันนี้เป็นรถเก๋ง Toyota Vios ปี 2020 ราคา 350,000 บาท ไมล์ 45,000 กม. เหมาะกับผู้ที่ต้องการรถใช้งานประจำในเมือง งบไม่สูง และต้องการปีค่อนข้างใหม่ครับ ถ้าสนใจฝากชื่อเบอร์ให้ทีมงานติดต่อกลับได้ครับ";

const V68E1_FINANCE_LEAK =
  "8,000 Baht (standard 72-84 months estimation, but let's be careful not to invent interest rates. I";

const V68E1_FIT_INCOMPLETE =
  "สำหรับรถยนต์ Honda HR-V ปี 2014 คันนี้ เป็นรถยนต์ประเภท SUV ที่เหมาะกับครอบครัวที่ต้องการพื้นที่และความสูงในการขับขี่ในเมืองและทางไกลเพราะมีไมล์ตามประกาศและราคาในกลุ่มนี้สำหรับผู้";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function readEnvFrom(map: Record<string, string>, key: string): string | undefined {
  return map[key];
}

function expectUnsafe(
  label: string,
  text: string,
  userMessage: string,
  carCardCount: number,
  reason: UserVisibleOutputUnsafeReason
) {
  const result = evaluateRealProviderOutputSafety(text, userMessage, carCardCount);
  ok(`${label} unsafe`, !result.safe);
  ok(`${label} reason ${reason}`, result.unsafeReason === reason);
}

function expectSafe(label: string, text: string, userMessage: string, carCardCount: number) {
  const result = evaluateRealProviderOutputSafety(text, userMessage, carCardCount);
  ok(`${label} safe`, result.safe, result.unsafeReason ?? "");
}

console.log("=== v6.8E.2 Unsafe Output & Thai Complete Answers ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const realProviderSrc = readFileSync(REAL_PROVIDER_SRC, "utf8");
const pkg = readFileSync("package.json", "utf8");
const selfSrc = readFileSync("scripts/test-v68e2-unsafe-output-thai-complete.mts", "utf8");

// --- slice + doc ---
{
  ok("quality slice v6.8E.8", USER_VISIBLE_BUYER_PROMPT_QUALITY_SLICE_ID === "v6.8E.8");
  ok("doc v6.8E.1 PARTIAL noted", /v6\.8E\.1.*PARTIAL|PARTIAL.*v6\.8E\.1/i.test(doc));
  ok("doc Thai only criteria", /ภาษาไทย|Thai only|Thai brand voice/i.test(doc));
  ok("doc no meta leak criteria", /meta|instruction leak/i.test(doc));
  ok("doc complete sentence", /complete sentence|จบประโยค/i.test(doc));
  ok("doc unsafe reason logging", /unsafe reason|outputUnsafeReason/i.test(doc));
}

// --- source wiring ---
{
  ok("source evaluate safety", realProviderSrc.includes("evaluateRealProviderOutputSafety"));
  ok("source unsafe diagnostics log", realProviderSrc.includes("logUserVisibleOutputUnsafeDiagnostics"));
  ok("source outputSampleRedacted", realProviderSrc.includes("outputSampleRedacted"));
  ok("source no full prompt log", !/console\.warn\([^)]*buildUserVisibleGeminiCombinedPrompt/.test(realProviderSrc));
}

// --- prompt final-answer contract (v6.8E.4) ---
{
  const prompt = buildUserVisibleGeminiCombinedPrompt("งบ 4 แสน มีรถอะไรน่าเล่น", {
    carCardCount: 2,
    recentCarCards: SAMPLE_CARDS,
  });
  ok("prompt requires marker", prompt.includes(USER_VISIBLE_FINAL_ANSWER_MARKER));
  ok("prompt no char count trap", !/อย่างน้อย \d+ ตัวอักษร/.test(prompt));
  ok("prompt final answer contract", prompt.includes("ตอบเฉพาะคำตอบสุดท้าย") || prompt.includes("คำตอบสุดท้าย"));
}

// --- unsafe reason taxonomy ---
{
  expectUnsafe("too short budget", "สวัสดีครับ", "งบ 4 แสน มีรถอะไรน่าเล่น", 3, "too_short");
  expectUnsafe(
    "meta finance leak",
    V68E1_FINANCE_LEAK,
    "ผ่อนประมาณเท่าไหร่ได้ไหม",
    1,
    "meta_instruction_leak"
  );
  expectUnsafe(
    "non-thai only",
    "Monthly installment estimate depends on down payment and finance approval conditions.",
    "ผ่อนประมาณเท่าไหร่ได้ไหม",
    1,
    "non_thai_output"
  );
  expectUnsafe(
    "incomplete fit",
    V68E1_FIT_INCOMPLETE,
    "คันนี้เหมาะกับใคร",
    1,
    "incomplete_sentence"
  );
  expectUnsafe(
    "finance forbidden",
    "ผ่อนได้แน่นอนครับ อนุมัติแน่นอน ทุกคนผ่านชัวร์ครับ",
    "ผ่อนประมาณเท่าไหร่ได้ไหม",
    1,
    "finance_forbidden_phrase"
  );
  ok("meta leak detector", hasMetaInstructionLeak(V68E1_FINANCE_LEAK));
  ok("non-thai detector", hasExcessiveNonThaiContent(V68E1_FINANCE_LEAK));
  ok("incomplete detector", looksLikeIncompleteSentence(V68E1_FIT_INCOMPLETE));
}

// --- good Thai answers pass ---
{
  expectSafe("budget thai", GOOD_BUDGET_THAI, "งบ 4 แสน มีรถอะไรน่าเล่น", 3);
  expectSafe("finance thai", GOOD_FINANCE_THAI, "ผ่อนประมาณเท่าไหร่ได้ไหม", 1);
  expectSafe("compare thai", GOOD_COMPARE_THAI, "เทียบคันที่ 1 กับ 2 ให้หน่อย", 2);
  expectSafe("summarize thai", GOOD_SUMMARIZE_THAI, "สรุปจุดเด่นของคันนี้ให้หน่อย", 1);
  expectSafe("fit thai", GOOD_FIT_THAI, "คันนี้เหมาะกับใคร", 1);
}

// --- v6.8E.1 regression samples now blocked ---
{
  const financeLeak = evaluateRealProviderOutputSafety(
    V68E1_FINANCE_LEAK,
    "ผ่อนประมาณเท่าไหร่ได้ไหม",
    1
  );
  ok("v68e1 finance leak blocked", !financeLeak.safe);
  const fitIncomplete = evaluateRealProviderOutputSafety(
    V68E1_FIT_INCOMPLETE,
    "คันนี้เหมาะกับใคร",
    1
  );
  ok("v68e1 fit incomplete blocked", !fitIncomplete.safe);
}

// --- fallback on unsafe ---
{
  setUserVisibleGeminiCallerForTests(async () => ({
    providerNetworkUsed: true,
    redactedProviderOutput: V68E1_FINANCE_LEAK,
    requestIdHash: "mockhashv68e2-unsafe",
    modelId: USER_VISIBLE_REAL_GEMINI_MODEL,
  }));

  const bridge = runUserVisibleOrchestrationBridge({
    userMessage: "ผ่อนประมาณเท่าไหร่ได้ไหม",
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
    userMessage: "ผ่อนประมาณเท่าไหร่ได้ไหม",
    firebaseUid: TEST_UID,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    readEnv: (k) => readEnvFrom(STAGING_PILOT_ENV, k),
    pilotOrchestration: { carCardCount: 1, recentCarCards: [SAMPLE_CARDS[0]] },
  });
  ok("unsafe meta fallback gate", applied.payload.realProviderGateReason === "real_provider_output_unsafe");
  ok("unsafe keeps mock text", applied.payload.userVisibleText.length > 0);
  ok("unsafe no real network", applied.payload.realProviderNetwork === false);
  resetUserVisibleGeminiCallerForTests();
}

// --- good output passes real apply ---
{
  setUserVisibleGeminiCallerForTests(async () => ({
    providerNetworkUsed: true,
    redactedProviderOutput: `${USER_VISIBLE_FINAL_ANSWER_MARKER} ${GOOD_BUDGET_THAI}`,
    requestIdHash: "mockhashv68e2-good",
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
  const pilotBridge = {
    ...bridge,
    payload: {
      ...bridge.payload,
      pilotPathActive: true,
      fallbackToLegacy: false,
      userVisibleText: "fallback",
      carCardCount: 3,
    },
  };

  const applied = await maybeApplyUserVisibleRealProvider({
    bridgeResult: pilotBridge,
    userMessage: "งบ 4 แสน มีรถอะไรน่าเล่น",
    firebaseUid: TEST_UID,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    readEnv: (k) => readEnvFrom(STAGING_PILOT_ENV, k),
    pilotOrchestration: { carCardCount: 3, recentCarCards: SAMPLE_CARDS },
  });
  ok("good budget real ok", applied.payload.realProviderGateReason === "real_provider_call_ok");
  ok("good budget network true", applied.payload.realProviderNetwork === true);
  resetUserVisibleGeminiCallerForTests();
}

// --- no real API ---
{
  ok("script no generateContent", !/generateContent\s*\(/.test(selfSrc));
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfSrc));
  ok("package v68e2 script", pkg.includes("test:v68e2-unsafe-output-thai-complete"));
}

console.log("\nDone v6.8E.2 Unsafe Output & Thai Complete Answers tests.\n");
if (process.exitCode) process.exit(process.exitCode);
