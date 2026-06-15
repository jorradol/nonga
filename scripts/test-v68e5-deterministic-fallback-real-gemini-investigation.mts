/**
 * v6.8E.5 — Deterministic fallback fixes + real Gemini prompt investigation (offline/static)
 * npm run test:v68e5-deterministic-fallback-real-gemini-investigation
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
  detectUserVisibleBuyerScenario,
  evaluateRealProviderOutputSafety,
  hasExcessiveNonThaiContent,
  hasUnsourcedEvSpeculation,
  USER_VISIBLE_BUYER_PROMPT_QUALITY_SLICE_ID,
  USER_VISIBLE_STRUCTURED_OUTPUT_FIELD,
  USER_VISIBLE_FINAL_ANSWER_MARKER,
  USER_VISIBLE_GEMINI_REQUEST_SHAPE,
  USER_VISIBLE_REAL_GEMINI_MODEL,
} from "../src/services/ai/salesBrainUserVisibleRealProvider.ts";
import {
  isPilotBuyerDirectCompareFollowUp,
  isPilotBuyerEvFollowUp,
  isPilotBuyerFinanceFollowUp,
  isPilotBuyerGeneralKnowledgeFollowUp,
  isPilotBuyerFollowUpMessage,
} from "../src/services/ai/chat/chatPilotBuyerFollowUp.ts";
import {
  buildBuyerEvPilotCopy,
  buildBuyerFinancePilotCopy,
  buildBuyerGeneralKnowledgePilotCopy,
  buildPilotBuyerUserVisibleCopy,
} from "../src/services/ai/salesBrainUserVisiblePilotBuyerCopy.ts";
import { resolveUserVisibleChatResponse } from "../src/services/ai/salesBrainUserVisibleChatPath.ts";
import { runUserVisibleOrchestrationBridge } from "../src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts";

const EXEC_RECORD = "docs/v6.8E.4-manual-quality-smoke-partial-execution-record.md";
const TEST_UID = "synthetic-allowlisted-uid-v68e5";

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

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.8E.5 Deterministic Fallback + Real Gemini Investigation ===\n");

const execRecord = readFileSync(EXEC_RECORD, "utf8");
const pkg = readFileSync("package.json", "utf8");
const realProviderSrc = readFileSync("src/services/ai/salesBrainUserVisibleRealProvider.ts", "utf8");

// --- slice + execution record ---
{
  ok("quality slice v6.8E.8", USER_VISIBLE_BUYER_PROMPT_QUALITY_SLICE_ID === "v6.8E.9");
  ok("v6.8E.4 partial record exists", execRecord.includes("v6.8E.4") && execRecord.includes("0/6"));
  ok("v6.8E.4 record next v6.8E.5", execRecord.includes("v6.8E.5"));
  ok("package script v68e5", pkg.includes("test:v68e5-deterministic-fallback-real-gemini-investigation"));
}

// --- finance fallback beats askFollowUp ---
{
  const resolved = resolveUserVisibleChatResponse({
    userMessage: "ผ่อนประมาณเท่าไหร่ได้ไหม",
    legacyUserVisibleResponse: "legacy fallback",
    userRole: "buyer",
    firebaseUid: TEST_UID,
    environment: "staging",
    env: STAGING_PILOT_ENV,
    pilotOrchestration: { carCardCount: 2, recentCarCards: SAMPLE_CARDS },
  });
  ok("finance pilotPathActive", resolved.pilotPathActive === true);
  ok("finance not generic askFollowUp", !resolved.userVisibleText.includes("สนใจรถคันไหนครับ"));
  ok("finance fallback copy", resolved.userVisibleText.includes("ประเมินยอดผ่อน"));
  ok("finance no guarantee", !resolved.userVisibleText.includes("อนุมัติแน่นอน"));
  ok("finance not short generic", resolved.userVisibleText.length > 120);

  const financeCopy = buildBuyerFinancePilotCopy(SAMPLE_CARDS);
  ok("finance builder has CTA", /ฝากชื่อ|เบอร์|ทีมงาน/.test(financeCopy));
}

// --- general knowledge beats compare ---
{
  const msg =
    "รุ่นนี้โดยทั่วไปน่าใช้ไหม เทียบกับรถในตลาดตอนนี้ควรดูอะไรบ้าง";
  ok("GK detected", isPilotBuyerGeneralKnowledgeFollowUp(msg));
  ok("GK not direct compare", !isPilotBuyerDirectCompareFollowUp(msg));

  const gkResult = buildPilotBuyerUserVisibleCopy({
    userMessage: msg,
    intent: "buyer.general",
    carCardCount: 2,
    recentCarCards: SAMPLE_CARDS,
  });
  ok("GK fallback not compare template", !gkResult?.text.startsWith("ได้ครับ น้องเอเทียบ"));
  ok("GK listing layer", gkResult?.text.includes("จากข้อมูลในประกาศนี้") === true);
  ok("GK general layer", gkResult?.text.includes("จากความรู้ทั่วไป") === true);
  ok("GK disclaimer", gkResult?.text.includes("ไม่ใช่การยืนยันสภาพ") === true);

  const compareResult = buildPilotBuyerUserVisibleCopy({
    userMessage: "เทียบคันที่ 1 กับ 2",
    intent: "buyer.compare",
    carCardCount: 2,
    recentCarCards: SAMPLE_CARDS,
  });
  ok("numbered compare still compare", compareResult?.text.includes("เทียบจาก") === true);
}

// --- EV follow-up routing + fallback ---
{
  const evMsg = "ถ้าคันนี้เป็นรถไฟฟ้า ต้องดูอะไรเป็นพิเศษบ้าง";
  ok("EV follow-up detected", isPilotBuyerEvFollowUp(evMsg));
  ok("EV in pilot follow-up", isPilotBuyerFollowUpMessage(evMsg));
  ok("EV scenario", detectUserVisibleBuyerScenario(evMsg) === "ev");

  const bridge = runUserVisibleOrchestrationBridge({
    userMessage: evMsg,
    inventory: [],
    trustedFirebaseUid: TEST_UID,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    pilotSessionContext: { recentCarCards: [EV_CARD] },
  });
  ok("EV bridge pilotPathActive", bridge.payload.pilotPathActive === true);

  const evCopy = buildBuyerEvPilotCopy([EV_CARD]);
  ok("EV fallback no kWh guess", !/\d+\s*kWh/.test(evCopy));
  ok("EV fallback no range guess", !/ระยะวิ่ง\s*\d+/.test(evCopy));
  ok("EV fallback missing data note", evCopy.includes("ยังไม่มีข้อมูล"));
  ok("EV terms allowed in copy", /EV|แบต|ชาร์จ/.test(evCopy));
  ok(
    "EV terms not blocked as non-Thai",
    !hasExcessiveNonThaiContent(
      "ควรตรวจสุขภาพแบต EV และระบบชาร์จ AC/DC CCS2 Type 2 Wallbox Battery Range kWh ก่อนตัดสินใจครับ"
    )
  );
  ok(
    "unsourced kWh still blocked",
    hasUnsourcedEvSpeculation("แบต 40 kWh ระยะวิ่ง 350 กม. ครับ", {
      carCardCount: 1,
      recentCarCards: [EV_CARD],
    })
  );
}

// --- real Gemini investigation / minimal prompt patch ---
{
  ok("request shape system instruction split", USER_VISIBLE_GEMINI_REQUEST_SHAPE === "sdk_system_instruction_split_minimal_thinking_structured_json");
  ok("model id set", USER_VISIBLE_REAL_GEMINI_MODEL === "gemini-3.5-flash");
  ok("extraction uses response.text path", realProviderSrc.includes("response.text"));
  ok("extraction uses candidates parts fallback", realProviderSrc.includes("candidate.content?.parts"));
  ok("systemInstruction split in caller", realProviderSrc.includes("systemInstruction: requestShape.systemInstruction"));
  ok("response diagnostics extractor", realProviderSrc.includes("extractUserVisibleGeminiResponseDiagnostics"));

  const prompt = buildUserVisibleGeminiCombinedPrompt("งบ 4 แสน มีรถอะไรน่าเล่น", {
    carCardCount: 2,
    recentCarCards: SAMPLE_CARDS,
  });
  ok("prompt requires finalAnswerTh", prompt.includes(USER_VISIBLE_STRUCTURED_OUTPUT_FIELD));
  ok("prompt no sentence count trap", !/3[–-]6\s*ประโยค/.test(prompt));
  ok("prompt no char count trap", !/อย่างน้อย \d+ ตัวอักษร/.test(prompt));
  ok("prompt slice v6.8E.9", prompt.includes("v6.8E.9"));

  const retry = buildUserVisibleGeminiRetryPrompt(
    "งบ 4 แสน มีรถอะไรน่าเล่น",
    { carCardCount: 2, recentCarCards: SAMPLE_CARDS },
    "missing_final_answer_marker"
  );
  ok("retry no sentence count trap", !/3[–-]6\s*ประโยค/.test(retry));
  ok("retry requires finalAnswerTh via system instruction", retry.includes(USER_VISIBLE_STRUCTURED_OUTPUT_FIELD));
}

// --- summarize/fit regression ---
{
  const summarize = buildPilotBuyerUserVisibleCopy({
    userMessage: "สรุปจุดเด่นของคันนี้",
    intent: "buyer.search",
    carCardCount: 2,
    recentCarCards: SAMPLE_CARDS,
  });
  ok("summarize not compare", !summarize?.text.startsWith("ได้ครับ น้องเอเทียบ"));
}

console.log("\nDone v6.8E.5 tests.\n");
