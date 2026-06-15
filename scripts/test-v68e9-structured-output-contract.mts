/**
 * v6.8E.9 — Structured output contract (offline/static)
 * npm run test:v68e9-structured-output-contract
 */
import { readFileSync } from "node:fs";
import { ThinkingLevel } from "@google/genai";
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
  buildUserVisibleGeminiApiConfig,
  buildUserVisibleGeminiRequestShape,
  buildUserVisibleStructuredOutputJson,
  evaluateRealProviderOutputSafety,
  extractUserVisibleGeminiResponseDiagnostics,
  looksLikeIncompleteSentence,
  looksLikeStructuredOutputJsonLeak,
  maybeApplyUserVisibleRealProvider,
  parseUserVisibleStructuredOutput,
  resetUserVisibleGeminiCallerForTests,
  setUserVisibleGeminiCallerForTests,
  type UserVisibleRealProviderBridgeResult,
  USER_VISIBLE_BUYER_PROMPT_QUALITY_SLICE_ID,
  USER_VISIBLE_GEMINI_REQUEST_SHAPE,
  USER_VISIBLE_GEMINI_THINKING_LEVEL,
  USER_VISIBLE_REAL_PROVIDER_MAX_OUTPUT_TOKENS,
  USER_VISIBLE_RETRY_UNSAFE_REASONS,
  USER_VISIBLE_STRUCTURED_OUTPUT_FIELD,
  USER_VISIBLE_STRUCTURED_OUTPUT_JSON_SCHEMA,
} from "../src/services/ai/salesBrainUserVisibleRealProvider.ts";

const REAL_PROVIDER_SRC = "src/services/ai/salesBrainUserVisibleRealProvider.ts";
const TEST_UID = "synthetic-allowlisted-uid-v68e9";
const BUYER_MSG = "งบ 4 แสน มีรถอะไรน่าเล่น";
const FINANCE_MSG = "ผ่อนประมาณเท่าไหร่ได้ไหม";
const SUMMARIZE_MSG = "สรุปจุดเด่นของคันนี้ให้หน่อย";
const FIT_MSG = "คันนี้เหมาะกับใคร";
const GK_MSG = "โดยทั่วไปรุ่นนี้น่าใช้ไหม ควรดูอะไร";

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
];

const GOOD_BUDGET_THAI =
  "สวัสดีครับ น้องเอคัดรถในงบประมาณ 4 แสนบาทมาให้ 3 คันแล้วนะครับ คันแรก Toyota Vios ปี 2020 ราคา 350,000 บาท ไมล์ตามประกาศ เหมาะใช้งานประจำครับ คันที่สอง Honda City ปี 2019 ราคาใกล้เคียงกัน อีกคันในรายการคุ้มงบครับ ถ้าสนใจคันไหน ฝากชื่อเบอร์ให้ทีมงานติดต่อกลับได้ครับ";

const GOOD_SUMMARIZE_THAI =
  "คันนี้ Toyota Vios ปี 2020 ราคา 350,000 บาท ไมล์ 45,000 กม. เป็นรถเก๋งเบนซิน จุดเด่นคือปีค่อนข้างใหม่และราคาเข้าถึงง่ายในกลุ่มรถใช้งานประจำครับ ถ้าสนใจฝากชื่อเบอร์ให้ทีมงานช่วยต่อได้ครับ";

const GOOD_FIT_THAI =
  "รถคันนี้เป็นรถเก๋ง Toyota Vios ปี 2020 ราคา 350,000 บาท ไมล์ 45,000 กม. เหมาะกับผู้ที่ต้องการรถใช้งานประจำในเมือง งบไม่สูง และต้องการปีค่อนข้างใหม่ครับ ถ้าสนใจฝากชื่อเบอร์ให้ทีมงานติดต่อกลับได้ครับ";

const GOOD_GK_THAI =
  "จากข้อมูลในประกาศนี้ รถเป็น Toyota Vios ปี 2020 ราคา 350,000 บาท ไมล์ 45,000 กม. ครับ จากความรู้ทั่วไปของรุ่นนี้ เป็นรถเก๋งที่นิยมใช้งานประจำ ข้อมูลทั่วไปนี้ไม่ใช่การยืนยันสภาพของรถคันนี้โดยตรง ควรตรวจสภาพและทดลองขับจริงก่อนตัดสินใจครับ";

const INCOMPLETE_THAI =
  "สวัสดีครับ น้องเอคัดรถในงบประมาณ 4 แสนบาทมาให้ 3 คันแล้วนะครับ คันแรก Toyota Vios ปี 2020 ราคา 350,000 บาท ไมล์ตามประกาศ เหมาะใช้งานประจำครับ คันที่สอง Honda City ปี 2019 ราคาใกล้เคียงกัน อีกคันในรายการคุ้มงบครับ ถ้าสนใจคันไหน ฝากชื่อเบอร์ให้ทีมงานติดต่อกลับ";

const SECRET_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /Bearer\s+[A-Za-z0-9._-]{20,}/,
  /GEMINI_API_KEY[=:\s][A-Za-z0-9._-]+/,
];

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function readEnvFrom(env: Record<string, string>, key: string): string | undefined {
  return env[key];
}

console.log("=== v6.8E.9 Structured Output Contract ===\n");

const realProviderSrc = readFileSync(REAL_PROVIDER_SRC, "utf8");
const pkg = readFileSync("package.json", "utf8");
const selfSrc = readFileSync("scripts/test-v68e9-structured-output-contract.mts", "utf8");

// --- slice + schema ---
{
  ok("quality slice v6.8E.9", USER_VISIBLE_BUYER_PROMPT_QUALITY_SLICE_ID === "v6.8E.9");
  ok(
    "request shape structured json",
    USER_VISIBLE_GEMINI_REQUEST_SHAPE ===
      "sdk_system_instruction_split_minimal_thinking_structured_json"
  );
  ok("schema field finalAnswerTh", USER_VISIBLE_STRUCTURED_OUTPUT_FIELD === "finalAnswerTh");
  ok(
    "schema requires finalAnswerTh",
    USER_VISIBLE_STRUCTURED_OUTPUT_JSON_SCHEMA.required.includes("finalAnswerTh")
  );
  ok("package script v68e9", pkg.includes("test:v68e9-structured-output-contract"));
  ok("thinking level MINIMAL retained", USER_VISIBLE_GEMINI_THINKING_LEVEL === ThinkingLevel.MINIMAL);
  ok("maxOutputTokens 1536 retained", USER_VISIBLE_REAL_PROVIDER_MAX_OUTPUT_TOKENS === 1536);
}

// --- API config structured output ---
{
  const shape = buildUserVisibleGeminiRequestShape({
    redactedUserMessage: BUYER_MSG,
    pilotOrchestration: { carCardCount: 1, recentCarCards: SAMPLE_CARDS },
  });
  ok("request shape responseMimeType json", shape.responseMimeType === "application/json");
  ok("request shape responseSchema present", shape.responseSchema === USER_VISIBLE_STRUCTURED_OUTPUT_JSON_SCHEMA);
  ok("system instruction mentions finalAnswerTh", shape.systemInstruction.includes("finalAnswerTh"));
  ok("system instruction JSON contract", shape.systemInstruction.includes("JSON object"));

  const apiConfig = buildUserVisibleGeminiApiConfig({
    systemInstruction: shape.systemInstruction,
    maxOutputTokens: shape.maxOutputTokens,
    temperature: shape.temperature,
  });
  ok("api config responseMimeType json", apiConfig.responseMimeType === "application/json");
  ok("api config responseSchema present", apiConfig.responseSchema === USER_VISIBLE_STRUCTURED_OUTPUT_JSON_SCHEMA);
  ok("caller passes responseSchema", realProviderSrc.includes("responseSchema: USER_VISIBLE_STRUCTURED_OUTPUT_JSON_SCHEMA"));
}

// --- parse fail-closed ---
{
  ok("invalid json", parseUserVisibleStructuredOutput("not json").rejectReason === "invalid_structured_output");
  ok(
    "missing field",
    parseUserVisibleStructuredOutput('{"other":"x"}').rejectReason === "missing_final_answer_th"
  );
  ok(
    "wrong type",
    parseUserVisibleStructuredOutput('{"finalAnswerTh":123}').rejectReason === "invalid_structured_output"
  );
  ok("empty string field", parseUserVisibleStructuredOutput('{"finalAnswerTh":""}').rejectReason === "empty_output");
  ok(
    "markdown fence parse",
    parseUserVisibleStructuredOutput(
      "```json\n" + buildUserVisibleStructuredOutputJson("สวัสดีครับ ทดสอบครับ") + "\n```"
    ).rejectReason === undefined
  );
  const good = parseUserVisibleStructuredOutput(buildUserVisibleStructuredOutputJson(GOOD_BUDGET_THAI));
  ok("valid parse extracts text", good.text === GOOD_BUDGET_THAI);
  ok("json leak in field blocked", parseUserVisibleStructuredOutput(
    buildUserVisibleStructuredOutputJson('{"finalAnswerTh":"nested"}')
  ).rejectReason === "generic_safety_guard");
  ok("json leak detector", looksLikeStructuredOutputJsonLeak('{"finalAnswerTh":"x"}') === true);
}

// --- guards on parsed text (unchanged) ---
{
  const incomplete = parseUserVisibleStructuredOutput(buildUserVisibleStructuredOutputJson(INCOMPLETE_THAI));
  ok("incomplete sentence detector", looksLikeIncompleteSentence(incomplete.text!) === true);
  const safety = evaluateRealProviderOutputSafety(incomplete.text!, BUYER_MSG, 2);
  ok("incomplete sentence blocks", safety.safe === false && safety.unsafeReason === "incomplete_sentence");

  const good = parseUserVisibleStructuredOutput(buildUserVisibleStructuredOutputJson(GOOD_BUDGET_THAI));
  ok("completed Thai safety pass", evaluateRealProviderOutputSafety(good.text!, BUYER_MSG, 2).safe === true);

  const financeBad = parseUserVisibleStructuredOutput(
    buildUserVisibleStructuredOutputJson("ผ่อนได้แน่นอนครับ อนุมัติแน่นอน รับประกันอนุมัติทุกเคส ฝากชื่อเบอร์ได้ครับ")
  );
  ok(
    "finance forbidden blocks",
    evaluateRealProviderOutputSafety(financeBad.text!, FINANCE_MSG, 1).unsafeReason === "finance_forbidden_phrase"
  );

  const evBad = parseUserVisibleStructuredOutput(
    buildUserVisibleStructuredOutputJson("แบต 40 kWh ระยะวิ่ง 350 กม. ค่าชาร์จประมาณ 500 บาท ครับ")
  );
  const evSafety = evaluateRealProviderOutputSafety(evBad.text!, "ถ้าคันนี้เป็นรถไฟฟ้า ต้องดูอะไร", 1, {
    pilotOrchestration: {
      carCardCount: 1,
      recentCarCards: [
        {
          index: 1,
          brand: "Nissan",
          model: "Leaf",
          year: 2022,
          price: 650000,
          fuelType: "electric",
          description: "รถไฟฟ้า",
        },
      ],
    },
  });
  ok("ev speculation blocks", evSafety.unsafeReason === "unsourced_ev_speculation");
}

// --- scenario samples (summarize / fit / GK) ---
{
  ok(
    "summarize scenario pass",
    evaluateRealProviderOutputSafety(GOOD_SUMMARIZE_THAI, SUMMARIZE_MSG, 1).safe === true
  );
  ok("fit scenario pass", evaluateRealProviderOutputSafety(GOOD_FIT_THAI, FIT_MSG, 1).safe === true);
  ok("gk scenario pass", evaluateRealProviderOutputSafety(GOOD_GK_THAI, GK_MSG, 1).safe === true);
}

// --- retry policy ---
{
  ok("retry includes invalid_structured_output", USER_VISIBLE_RETRY_UNSAFE_REASONS.has("invalid_structured_output"));
  ok("retry includes missing_final_answer_th", USER_VISIBLE_RETRY_UNSAFE_REASONS.has("missing_final_answer_th"));
  ok("incomplete_sentence not retryable", !USER_VISIBLE_RETRY_UNSAFE_REASONS.has("incomplete_sentence"));
  const retryMatches = realProviderSrc.match(/invokeUserVisibleRealProvider\(/g) ?? [];
  ok("maybeApply has single retry invoke path", retryMatches.length >= 2);
  ok("no third retry invoke", !/retryAttempt:\s*2/.test(realProviderSrc));
}

// --- truncation: full text before guard ---
{
  ok("caller sets providerOutputFull", realProviderSrc.includes("providerOutputFull: rawText"));
  ok("maybeApply uses providerOutputFull first", realProviderSrc.includes("resolveProviderRawOutput"));
  ok("slice only on redacted sample", realProviderSrc.includes("redactedProviderOutput = redactPiiForSalesBrainLog(rawText).slice"));
  const longTail = "ก".repeat(1300);
  const longAnswer = `${GOOD_BUDGET_THAI}${longTail}ครับ`;
  const longParsed = parseUserVisibleStructuredOutput(buildUserVisibleStructuredOutputJson(longAnswer));
  ok("long answer parse not pre-truncated", longParsed.text!.length > 1200);
}

// --- maybeApply integration (no raw JSON to user) ---
{
  const bridgeBase: UserVisibleRealProviderBridgeResult = {
    orchestrated: { text: "fallback-mock-text", carCards: [], skipGemini: true },
    payload: {
      userVisibleText: "fallback-mock-text",
      pilotPathActive: true,
      fallbackToLegacy: false,
      skipGemini: true,
      carCardCount: 1,
      sliceId: "v6.8D",
    },
  };

  setUserVisibleGeminiCallerForTests(async () => ({
    providerNetworkUsed: true,
    providerOutputFull: "{broken json",
    redactedProviderOutput: "{broken json",
    requestIdHash: "hash-invalid-json-leak",
    modelId: "gemini-3.5-flash",
  }));

  const invalidJson = await maybeApplyUserVisibleRealProvider({
    bridgeResult: bridgeBase,
    userMessage: BUYER_MSG,
    firebaseUid: TEST_UID,
    userRole: "buyer",
    pilotOrchestration: { carCardCount: 1, recentCarCards: SAMPLE_CARDS },
    environment: "staging",
    env: STAGING_PILOT_ENV,
    readEnv: (k) => readEnvFrom(STAGING_PILOT_ENV, k),
  });
  ok("invalid json triggers fallback", invalidJson.payload.realProviderGateReason === "real_provider_output_unsafe");
  ok("fallback text preserved on parse fail", invalidJson.orchestrated?.text === "fallback-mock-text");

  setUserVisibleGeminiCallerForTests(async () => ({
    providerNetworkUsed: true,
    providerOutputFull: "plain text without json",
    redactedProviderOutput: "plain text without json",
    requestIdHash: "hash-parse-fail",
    modelId: "gemini-3.5-flash",
  }));

  const parseFail = await maybeApplyUserVisibleRealProvider({
    bridgeResult: bridgeBase,
    userMessage: BUYER_MSG,
    firebaseUid: TEST_UID,
    userRole: "buyer",
    pilotOrchestration: { carCardCount: 1, recentCarCards: SAMPLE_CARDS },
    environment: "staging",
    env: STAGING_PILOT_ENV,
    readEnv: (k) => readEnvFrom(STAGING_PILOT_ENV, k),
  });
  ok("non-json triggers fallback", parseFail.payload.realProviderGateReason === "real_provider_output_unsafe");

  setUserVisibleGeminiCallerForTests(async () => ({
    providerNetworkUsed: true,
    providerOutputFull: buildUserVisibleStructuredOutputJson(GOOD_BUDGET_THAI),
    redactedProviderOutput: buildUserVisibleStructuredOutputJson(GOOD_BUDGET_THAI).slice(0, 80),
    requestIdHash: "hash-good",
    modelId: "gemini-3.5-flash",
  }));

  const goodApply = await maybeApplyUserVisibleRealProvider({
    bridgeResult: bridgeBase,
    userMessage: BUYER_MSG,
    firebaseUid: TEST_UID,
    userRole: "buyer",
    pilotOrchestration: { carCardCount: 1, recentCarCards: SAMPLE_CARDS },
    environment: "staging",
    env: STAGING_PILOT_ENV,
    readEnv: (k) => readEnvFrom(STAGING_PILOT_ENV, k),
  });
  ok("valid structured delivers real path", goodApply.payload.realProviderGateReason === "real_provider_call_ok");
  ok("user text is finalAnswerTh only", goodApply.orchestrated?.text === GOOD_BUDGET_THAI);
  ok("no raw json in user text", !goodApply.orchestrated?.text?.includes('"finalAnswerTh"'));
  ok("no json brace in user text", !/^\s*\{/.test(goodApply.orchestrated?.text ?? ""));

  setUserVisibleGeminiCallerForTests(async () => ({
    providerNetworkUsed: true,
    providerOutputFull: buildUserVisibleStructuredOutputJson(
      "ผ่อนได้แน่นอนครับ อนุมัติแน่นอน รับประกันอนุมัติทุกเคส ฝากชื่อเบอร์ได้ครับ"
    ),
    redactedProviderOutput: "[redacted]",
    requestIdHash: "hash-finance",
    modelId: "gemini-3.5-flash",
  }));

  const financeUnsafe = await maybeApplyUserVisibleRealProvider({
    bridgeResult: bridgeBase,
    userMessage: FINANCE_MSG,
    firebaseUid: TEST_UID,
    userRole: "buyer",
    pilotOrchestration: { carCardCount: 1, recentCarCards: SAMPLE_CARDS },
    environment: "staging",
    env: STAGING_PILOT_ENV,
    readEnv: (k) => readEnvFrom(STAGING_PILOT_ENV, k),
  });
  ok("finance forbidden triggers fallback", financeUnsafe.payload.realProviderGateReason === "real_provider_output_unsafe");
  resetUserVisibleGeminiCallerForTests();
}

// --- diagnostics + source safety ---
{
  const diag = extractUserVisibleGeminiResponseDiagnostics({
    candidates: [{ finishReason: "STOP" }],
    usageMetadata: { candidatesTokenCount: 512 },
  });
  ok("diag quality slice v6.8E.9", diag.qualitySliceId === "v6.8E.9");

  for (const pat of [SECRET_PATTERNS[0], SECRET_PATTERNS[1]]) {
    ok(`source no secret ${pat.source.slice(0, 10)}`, !pat.test(realProviderSrc));
  }
  ok("source redacts GEMINI_API_KEY in errors", realProviderSrc.includes("GEMINI_API_KEY=[redacted]"));
  const logBlock = realProviderSrc.slice(
    realProviderSrc.indexOf("function logUserVisibleOutputUnsafeDiagnostics"),
    realProviderSrc.indexOf("export type UserVisibleRealProviderGateReason")
  );
  ok("unsafe log no full prompt", !logBlock.includes("buildUserVisibleGeminiCombinedPrompt"));
}

// --- static script safety ---
{
  const selfCode = selfSrc.split("// --- static script safety ---")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no generateContent call", !/generateContent\s*\(/.test(selfCode));
}

console.log("\nDone v6.8E.9 tests.\n");
if (process.exitCode) process.exit(process.exitCode);
