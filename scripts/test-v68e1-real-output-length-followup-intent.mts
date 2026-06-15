/**
 * v6.8E.1 — Real output length & natural follow-up intent coverage (offline/static)
 * npm run test:v68e1-real-output-length-followup-intent
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
  isPilotBuyerCardInsightFollowUp,
  isPilotBuyerFollowUpMessage,
} from "../src/services/ai/chat/chatPilotBuyerFollowUp.ts";
import {
  assertRealProviderOutputMinLength,
  buildUserVisibleGeminiCombinedPrompt,
  detectUserVisibleBuyerScenario,
  extractUserVisibleGeminiResponseText,
  looksLikeListingPipeEcho,
  maybeApplyUserVisibleRealProvider,
  resetUserVisibleGeminiCallerForTests,
  setUserVisibleGeminiCallerForTests,
  USER_VISIBLE_BUYER_ANSWER_FORMAT_MARKERS,
  USER_VISIBLE_BUYER_PROMPT_QUALITY_SLICE_ID,
  USER_VISIBLE_MIN_OUTPUT_CHARS,
  USER_VISIBLE_REAL_PROVIDER_MAX_OUTPUT_TOKENS,
  USER_VISIBLE_REAL_GEMINI_MODEL,
} from "../src/services/ai/salesBrainUserVisibleRealProvider.ts";
import { runUserVisibleOrchestrationBridge } from "../src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts";

const DOC_PATH = "docs/v6.8E-buyer-chat-prompt-quality-manual-smoke-checklist.md";
const BRIDGE_SRC = "src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts";
const REAL_PROVIDER_SRC = "src/services/ai/salesBrainUserVisibleRealProvider.ts";
const FOLLOWUP_SRC = "src/services/ai/chat/chatPilotBuyerFollowUp.ts";
const TEST_UID = "synthetic-allowlisted-uid-v68e1";

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
];

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function readEnvFrom(map: Record<string, string>, key: string): string | undefined {
  return map[key];
}

console.log("=== v6.8E.1 Real Output Length & Follow-up Intent ===\n");

const doc = readFileSync(DOC_PATH, "utf8");
const bridgeSrc = readFileSync(BRIDGE_SRC, "utf8");
const realProviderSrc = readFileSync(REAL_PROVIDER_SRC, "utf8");
const followUpSrc = readFileSync(FOLLOWUP_SRC, "utf8");
const pkg = readFileSync("package.json", "utf8");
const selfSrc = readFileSync("scripts/test-v68e1-real-output-length-followup-intent.mts", "utf8");

// --- slice + doc ---
{
  ok("quality slice v6.8E.1", USER_VISIBLE_BUYER_PROMPT_QUALITY_SLICE_ID === "v6.8E.1");
  ok("doc v6.8E PARTIAL noted", /v6\.8E.*PARTIAL|PARTIAL.*v6\.8E/i.test(doc));
  ok("doc min length criteria", /ไม่ควรสั้นผิดปกติ|minimum|อย่างน้อย/i.test(doc));
  ok("doc v6.8E.1 rerun", /v6\.8E\.1|rerun smoke/i.test(doc));
}

// --- follow-up intent coverage ---
{
  ok("summarize intent", isPilotBuyerCardInsightFollowUp("สรุปจุดเด่นของคันนี้ให้หน่อย"));
  ok("highlights intent", isPilotBuyerCardInsightFollowUp("จุดเด่นคันนี้"));
  ok("fit intent", isPilotBuyerCardInsightFollowUp("คันนี้เหมาะกับใคร"));
  ok("fit usage intent", isPilotBuyerCardInsightFollowUp("เหมาะกับการใช้งานแบบไหน"));
  ok("summarize in follow-up", isPilotBuyerFollowUpMessage("สรุปจุดเด่นของคันนี้ให้หน่อย"));
  ok("fit in follow-up", isPilotBuyerFollowUpMessage("คันนี้เหมาะกับใคร"));
  ok("budget not follow-up", !isPilotBuyerFollowUpMessage("งบ 4 แสน มีรถอะไรน่าเล่น"));
  ok("source exports card insight helper", followUpSrc.includes("isPilotBuyerCardInsightFollowUp"));
}

// --- scenario detection ---
{
  ok("budget scenario", detectUserVisibleBuyerScenario("งบ 4 แสน มีรถอะไรน่าเล่น") === "budget");
  ok("finance scenario", detectUserVisibleBuyerScenario("ผ่อนประมาณเท่าไหร่ได้ไหม") === "finance");
  ok("compare scenario", detectUserVisibleBuyerScenario("เทียบคันที่ 1 กับ 2") === "compare");
  ok("summarize scenario", detectUserVisibleBuyerScenario("สรุปจุดเด่นของคันนี้") === "summarize");
  ok("fit scenario", detectUserVisibleBuyerScenario("คันนี้เหมาะกับใคร") === "fit");
}

// --- prompt length guidance ---
{
  const budgetPrompt = buildUserVisibleGeminiCombinedPrompt("งบ 4 แสน มีรถอะไรน่าเล่น", {
    carCardCount: 3,
    recentCarCards: SAMPLE_CARDS,
  });
  for (const marker of USER_VISIBLE_BUYER_ANSWER_FORMAT_MARKERS) {
    ok(`prompt format marker: ${marker}`, budgetPrompt.includes(marker));
  }
  ok("prompt no กระชับ-only", !/ตอบเป็นภาษาไทย กระชับ/.test(budgetPrompt));
  ok("prompt has min chars budget", budgetPrompt.includes(String(USER_VISIBLE_MIN_OUTPUT_CHARS.budget)));
  ok("prompt scenario budget", budgetPrompt.includes("แนะนำรถจาก listing"));

  const financePrompt = buildUserVisibleGeminiCombinedPrompt("ผ่อนประมาณเท่าไหร่ได้ไหม", {
    carCardCount: 1,
    recentCarCards: SAMPLE_CARDS,
  });
  ok("finance scenario guidance", financePrompt.includes("ไฟแนนซ์") || financePrompt.includes("ผ่อน"));

  const summarizePrompt = buildUserVisibleGeminiCombinedPrompt("สรุปจุดเด่นของคันนี้ให้หน่อย", {
    carCardCount: 1,
    recentCarCards: SAMPLE_CARDS,
  });
  ok("summarize scenario guidance", summarizePrompt.includes("สรุปจุดเด่น"));
}

// --- generation config ---
{
  ok("max output tokens raised", USER_VISIBLE_REAL_PROVIDER_MAX_OUTPUT_TOKENS >= 768);
  ok("source uses max output constant", realProviderSrc.includes("USER_VISIBLE_REAL_PROVIDER_MAX_OUTPUT_TOKENS"));
  ok("source extract response helper", realProviderSrc.includes("extractUserVisibleGeminiResponseText"));
}

// --- output guards ---
{
  ok("pipe echo detected", looksLikeListingPipeEcho("| 389,000 THB | 176,570 |"));
  ok("natural text not pipe echo", !looksLikeListingPipeEcho("ประเมินเบื้องต้นจากราคาในระบบครับ ขึ้นอยู่กับเงื่อนไขไฟแนนซ์"));
  ok(
    "min length budget pass",
    assertRealProviderOutputMinLength(
      "งบนี้น้องเอมีรถให้ดูหลายคันครับ คันแรก Toyota Vios ปี 2020 ราคา 350,000 บาท เหมาะกับคนคุมงบ คันที่สอง Honda City ปี 2019 ราคา 380,000 บาท ไมล์ไม่สูงมาก ถ้าชอบคันไหนฝากชื่อเบอร์ได้ครับ",
      "งบ 4 แสน มีรถอะไรน่าเล่น",
      3
    )
  );
  ok(
    "min length budget fail short",
    !assertRealProviderOutputMinLength("สวัสดีครับ งบ 4 แสน", "งบ 4 แสน มีรถอะไรน่าเล่น", 3)
  );
  ok(
    "summarize no cards fail",
    !assertRealProviderOutputMinLength("สรุปจุดเด่นครับ", "สรุปจุดเด่นของคันนี้", 0)
  );

  const extracted = extractUserVisibleGeminiResponseText({
    candidates: [{ content: { parts: [{ text: "ส่วนหนึ่ง" }, { text: "ส่วนสอง" }] } }],
  });
  ok("extract joins candidate parts", extracted === "ส่วนหนึ่งส่วนสอง");
}

// --- bridge prefers pilot session for summarize ---
{
  ok("bridge preferPilotSessionFirst", bridgeSrc.includes("preferPilotSessionFirst"));
  const bridge = runUserVisibleOrchestrationBridge({
    userMessage: "สรุปจุดเด่นของคันนี้ให้หน่อย",
    inventory: [],
    trustedFirebaseUid: TEST_UID,
    userRole: "buyer",
    environment: "staging",
    env: STAGING_PILOT_ENV,
    pilotSessionContext: { recentCarCards: SAMPLE_CARDS },
  });
  ok("summarize bridge pilot active", bridge.payload.pilotPathActive === true);
  ok("summarize bridge has session cards", (bridge.orchestrated?.carCards?.length ?? 0) >= 1);
}

// --- short real output blocked ---
{
  setUserVisibleGeminiCallerForTests(async () => ({
    providerNetworkUsed: true,
    redactedProviderOutput: "สวัสดีครับ",
    requestIdHash: "mockhashv68e1-short",
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
      userVisibleText: bridge.payload.userVisibleText || "น้องเอช่วยหารถในงบที่คุยกันครับ",
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
    pilotOrchestration: { carCardCount: 3 },
  });
  ok("short output blocked", applied.payload.realProviderGateReason === "real_provider_output_unsafe");
  resetUserVisibleGeminiCallerForTests();
}

// --- no real API in test ---
{
  const selfCode = selfSrc.split("// --- no real API ---")[0] ?? selfSrc;
  ok("script no generateContent", !/generateContent\s*\(/.test(selfCode));
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
}

// --- package ---
{
  ok("package v68e1 script", pkg.includes("test:v68e1-real-output-length-followup-intent"));
}

console.log("\nDone v6.8E.1 Real Output Length & Follow-up Intent tests.\n");
if (process.exitCode) process.exit(process.exitCode);
