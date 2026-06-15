/**
 * v6.8E.4 — Final-answer marker recovery, general knowledge routing, EV guard (offline/static)
 * npm run test:v68e4-final-answer-recovery-general-knowledge-ev-guard
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
  extractUserVisibleFinalAnswer,
  hasMetaInstructionLeak,
  hasUnsourcedEvSpeculation,
  listingHasEvBatteryFields,
  maybeApplyUserVisibleRealProvider,
  normalizeUserVisibleProviderOutput,
  resetUserVisibleGeminiCallerForTests,
  setUserVisibleGeminiCallerForTests,
  USER_VISIBLE_BUYER_PROMPT_QUALITY_SLICE_ID,
  USER_VISIBLE_EV_ENGLISH_TERMS,
  USER_VISIBLE_FINAL_ANSWER_MARKER,
  USER_VISIBLE_REAL_GEMINI_MODEL,
  USER_VISIBLE_RETRY_UNSAFE_REASONS,
} from "../src/services/ai/salesBrainUserVisibleRealProvider.ts";
import {
  isPilotBuyerFinanceFollowUp,
  isPilotBuyerGeneralKnowledgeFollowUp,
  isPilotBuyerFollowUpMessage,
} from "../src/services/ai/chat/chatPilotBuyerFollowUp.ts";
import {
  buildBuyerFinancePilotCopy,
  buildBuyerGeneralKnowledgePilotCopy,
  buildBuyerSummarizePilotCopy,
  buildBuyerFitPilotCopy,
  buildPilotBuyerUserVisibleCopy,
} from "../src/services/ai/salesBrainUserVisiblePilotBuyerCopy.ts";
import { runUserVisibleOrchestrationBridge } from "../src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts";

const EXEC_RECORD = "docs/v6.8E.3-manual-quality-smoke-partial-execution-record.md";
const TEST_UID = "synthetic-allowlisted-uid-v68e4";

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

const EV_CARD = {
  index: 1,
  brand: "Nissan",
  model: "Leaf",
  year: 2022,
  price: 650000,
  mileage: 42000,
  fuelType: "electric",
  bodyClassLabel: "Hatchback",
  description: "รถไฟฟ้า สภาพตามประกาศ",
};

const THAI_WITH_MARKER = (body: string) => `${USER_VISIBLE_FINAL_ANSWER_MARKER} ${body}`;

const THAI_LONG =
  "สวัสดีครับ น้องเอคัดรถในงบที่ขอมา 2 คันแล้วครับ คันแรก Honda HR-V ปี 2014 ราคา 389,000 บาท ไมล์ 164,008 กม. เป็น SUV / Crossover เหมาะใช้งานครอบครัวครับ คันที่สอง Toyota Vios 1.5 ปี 2020 ราคา 389,000 บาท เป็น Sedan ปีค่อนข้างใหม่ครับ ถ้าสนใจคันไหน ฝากชื่อเบอร์ให้ทีมงานติดต่อกลับได้ครับ";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
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

console.log("=== v6.8E.4 Final Answer Recovery + General Knowledge + EV Guard ===\n");

const execRecord = readFileSync(EXEC_RECORD, "utf8");
const pkg = readFileSync("package.json", "utf8");

// --- slice + execution record ---
{
  ok("quality slice v6.8E.4", USER_VISIBLE_BUYER_PROMPT_QUALITY_SLICE_ID === "v6.8E.4");
  ok("v6.8E.3 partial record exists", execRecord.includes("v6.8E.3") && execRecord.includes("0/6"));
  ok("package script v68e4", pkg.includes("test:v68e4-final-answer-recovery-general-knowledge-ev-guard"));
}

// --- final-answer marker extraction ---
{
  const withPlanning = `Wait, let's count characters.\n${USER_VISIBLE_FINAL_ANSWER_MARKER} ${THAI_LONG}`;
  const extracted = extractUserVisibleFinalAnswer(withPlanning);
  ok("marker found", extracted.found);
  ok("planning in preamble", extracted.preamble.includes("Wait"));
  ok("answer stripped", extracted.answer.startsWith("สวัสดี"));

  const normalized = normalizeUserVisibleProviderOutput(withPlanning);
  ok("planning before marker blocked", normalized.rejectReason === "meta_instruction_leak");

  const noMarker = normalizeUserVisibleProviderOutput(THAI_LONG);
  ok("missing marker blocked", noMarker.rejectReason === "missing_final_answer_marker");

  const clean = normalizeUserVisibleProviderOutput(THAI_WITH_MARKER(THAI_LONG));
  ok("clean marker passes normalize", !clean.rejectReason);
  ok("marker stripped from user text", !clean.text.includes(USER_VISIBLE_FINAL_ANSWER_MARKER));
}

// --- prompt contract ---
{
  const prompt = buildUserVisibleGeminiCombinedPrompt("งบ 4 แสน มีรถอะไรน่าเล่น", {
    carCardCount: 2,
    recentCarCards: SAMPLE_CARDS,
  });
  ok("prompt requires marker", prompt.includes(USER_VISIBLE_FINAL_ANSWER_MARKER));
  ok("prompt no char count trap", !/อย่างน้อย \d+ ตัวอักษร/.test(prompt));
  ok("prompt has EV rule", /รถไฟฟ้า|EV|kWh/.test(prompt));

  const retry = buildUserVisibleGeminiRetryPrompt(
    "งบ 4 แสน มีรถอะไรน่าเล่น",
    { carCardCount: 2, recentCarCards: SAMPLE_CARDS },
    "missing_final_answer_marker"
  );
  ok("retry repair prompt", retry.includes("คำตอบก่อนหน้าไม่มีคำตอบ:"));
  ok("retry requires marker", retry.includes(USER_VISIBLE_FINAL_ANSWER_MARKER));
}

// --- general knowledge routing ---
{
  const msg =
    "รุ่นนี้โดยทั่วไปน่าใช้ไหม เทียบกับรถในตลาดตอนนี้ควรดูอะไรบ้าง";
  ok("general knowledge follow-up detected", isPilotBuyerGeneralKnowledgeFollowUp(msg));
  ok("finance follow-up detected", isPilotBuyerFinanceFollowUp("ผ่อนประมาณเท่าไหร่ได้ไหม"));
  ok("budget not finance follow-up", !isPilotBuyerFinanceFollowUp("งบ 4 แสน มีรถอะไรน่าเล่น"));
  ok("general in pilot follow-up", isPilotBuyerFollowUpMessage(msg));

  const bridge = runUserVisibleOrchestrationBridge({
    userMessage: msg,
    inventory: [],
    trustedFirebaseUid: TEST_UID,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    pilotSessionContext: { recentCarCards: SAMPLE_CARDS, lastSearchBudgetMax: 400000 },
  });
  ok("general knowledge pilotPathActive", bridge.payload.pilotPathActive === true);

  const noCards = runUserVisibleOrchestrationBridge({
    userMessage: msg,
    inventory: [],
    trustedFirebaseUid: TEST_UID,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
  });
  ok("general knowledge no cards uses no-context copy", noCards.payload.userVisibleText.includes("ยังไม่เห็นชุดรถ"));
}

// --- EV-aware guard ---
{
  ok("EV terms exported", USER_VISIBLE_EV_ENGLISH_TERMS.includes("EV"));
  ok("listing without EV fields", !listingHasEvBatteryFields([EV_CARD]));
  ok("unsourced kWh blocked", hasUnsourcedEvSpeculation("แบตเตอรี่ 40 kWh ระยะวิ่งดีครับ", { carCardCount: 1, recentCarCards: [EV_CARD] }));
  ok("general EV advice allowed", !hasUnsourcedEvSpeculation("ควรตรวจสุขภาพแบตและทดลองขับจริงครับ", { carCardCount: 1, recentCarCards: [EV_CARD] }));

  const evUnsafe = evaluateRealProviderOutputSafety(
    "รถคันนี้ระยะวิ่ง 350 กม. แบต 40 kWh ครับ",
    "รุ่นนี้โดยทั่วไปน่าใช้ไหม",
    1,
    { pilotOrchestration: { carCardCount: 1, recentCarCards: [EV_CARD] } }
  );
  ok("EV speculation output blocked", !evUnsafe.safe);
  ok("EV unsafe reason", evUnsafe.unsafeReason === "unsourced_ev_speculation");
}

// --- finance fallback ---
{
  const financeCopy = buildBuyerFinancePilotCopy(SAMPLE_CARDS);
  ok("finance fallback mentions ผ่อน", financeCopy.includes("ผ่อน"));
  ok("finance fallback no guarantee", !financeCopy.includes("อนุมัติแน่นอน"));
  ok("finance fallback has CTA", /ฝากชื่อ|เบอร์|ทีมงาน/.test(financeCopy));
  ok("finance fallback not generic only", financeCopy.length > 120);

  const financeResult = buildPilotBuyerUserVisibleCopy({
    userMessage: "ผ่อนประมาณเท่าไหร่ได้ไหม",
    intent: "buyer.finance_negotiate",
    carCardCount: 2,
    recentCarCards: SAMPLE_CARDS,
  });
  ok("pilot finance path", financeResult?.text.includes("ประเมินยอดผ่อน") === true);
}

// --- general knowledge fallback ---
{
  const gkCopy = buildBuyerGeneralKnowledgePilotCopy(SAMPLE_CARDS);
  ok("gk fallback listing layer", gkCopy.includes("จากข้อมูลในประกาศนี้"));
  ok("gk fallback general layer", gkCopy.includes("จากความรู้ทั่วไป"));
  ok("gk disclaimer", gkCopy.includes("ไม่ใช่การยืนยันสภาพ"));
}

// --- summarize/fit still separate ---
{
  ok("summarize not compare", !buildBuyerSummarizePilotCopy(SAMPLE_CARDS).startsWith("ได้ครับ น้องเอเทียบ"));
  ok("fit not compare", !buildBuyerFitPilotCopy(SAMPLE_CARDS).startsWith("ได้ครับ น้องเอเทียบ"));
}

// --- retry with marker does not bypass guards ---
{
  let calls = 0;
  setUserVisibleGeminiCallerForTests(async () => {
    calls += 1;
    return {
      providerNetworkUsed: true,
      redactedProviderOutput:
        calls === 1
          ? THAI_WITH_MARKER("สั้นเกินไปครับ")
          : THAI_WITH_MARKER(
              "ผ่อนได้แน่นอนครับ อนุมัติแน่นอน ทุกคนผ่านชัวร์ครับ ทีมงานช่วยได้ครับ ประเมินเบื้องต้นครับ ขึ้นอยู่กับเงื่อนไขไฟแนนซ์ครับ ฝากชื่อเบอร์ได้ครับ"
            ),
      requestIdHash: `mockhashv68e4-finance-${calls}`,
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

  ok("finance retry still blocked", applied.payload.realProviderGateReason === "real_provider_output_unsafe");
  resetUserVisibleGeminiCallerForTests();
}

// --- successful real path with marker ---
{
  let calls = 0;
  setUserVisibleGeminiCallerForTests(async (_input, options) => {
    calls += 1;
    return {
      providerNetworkUsed: true,
      redactedProviderOutput: options.retryContext
        ? THAI_WITH_MARKER(THAI_LONG)
        : THAI_WITH_MARKER("สั้นเกินไปครับ"),
      requestIdHash: `mockhashv68e4-ok-${calls}`,
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

  ok("marker retry real path ok", applied.payload.realProviderGateReason === "real_provider_call_ok");
  ok("user text no marker prefix", !applied.payload.userVisibleText.includes(USER_VISIBLE_FINAL_ANSWER_MARKER));
  ok("meta still blocked", hasMetaInstructionLeak("Wait, let's be careful"));
  ok("retry reasons include marker", USER_VISIBLE_RETRY_UNSAFE_REASONS.has("missing_final_answer_marker"));
  resetUserVisibleGeminiCallerForTests();
}

console.log("\nDone v6.8E.4 tests.\n");
