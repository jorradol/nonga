/**
 * v6.8E.8 — Gemini output token budget Phase B (offline/static)
 * npm run test:v68e8-gemini-output-token-budget-phase-b
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
  evaluateRealProviderOutputSafety,
  extractUserVisibleGeminiResponseDiagnostics,
  looksLikeIncompleteSentence,
  maybeApplyUserVisibleRealProvider,
  normalizeUserVisibleProviderOutput,
  setUserVisibleGeminiCallerForTests,
  resetUserVisibleGeminiCallerForTests,
  type UserVisibleRealProviderBridgeResult,
  USER_VISIBLE_BUYER_PROMPT_QUALITY_SLICE_ID,
  USER_VISIBLE_FINAL_ANSWER_MARKER,
  USER_VISIBLE_GEMINI_THINKING_LEVEL,
  USER_VISIBLE_REAL_PROVIDER_MAX_OUTPUT_TOKENS,
  USER_VISIBLE_RETRY_UNSAFE_REASONS,
} from "../src/services/ai/salesBrainUserVisibleRealProvider.ts";

const REAL_PROVIDER_SRC = "src/services/ai/salesBrainUserVisibleRealProvider.ts";
const TEST_UID = "synthetic-allowlisted-uid-v68e8";
const BUYER_MSG = "งบ 4 แสน มีรถอะไรน่าเล่น";
const FINANCE_MSG = "ผ่อนประมาณเท่าไหร่ได้ไหม";

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

function readEnvFrom(env: Record<string, string>, key: string): string | undefined {
  return env[key];
}

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

const SECRET_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /Bearer\s+[A-Za-z0-9._-]{20,}/,
  /GEMINI_API_KEY[=:\s][A-Za-z0-9._-]+/,
];

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.8E.8 Gemini Output Token Budget Phase B ===\n");

const realProviderSrc = readFileSync(REAL_PROVIDER_SRC, "utf8");
const pkg = readFileSync("package.json", "utf8");
const selfSrc = readFileSync(
  "scripts/test-v68e8-gemini-output-token-budget-phase-b.mts",
  "utf8"
);

// --- slice + central constant ---
{
  ok("quality slice v6.8E.8", USER_VISIBLE_BUYER_PROMPT_QUALITY_SLICE_ID === "v6.8E.8");
  ok("maxOutputTokens constant 1536", USER_VISIBLE_REAL_PROVIDER_MAX_OUTPUT_TOKENS === 1536);
  ok("package script v68e8", pkg.includes("test:v68e8-gemini-output-token-budget-phase-b"));
  ok("thinking level MINIMAL retained", USER_VISIBLE_GEMINI_THINKING_LEVEL === ThinkingLevel.MINIMAL);
}

// --- first attempt + retry both use 1536 ---
{
  const first = buildUserVisibleGeminiRequestShape({
    redactedUserMessage: BUYER_MSG,
    pilotOrchestration: { carCardCount: 1, recentCarCards: SAMPLE_CARDS },
  });
  ok("first attempt maxOutputTokens 1536", first.maxOutputTokens === 1536);
  ok("first attempt uses central constant", first.maxOutputTokens === USER_VISIBLE_REAL_PROVIDER_MAX_OUTPUT_TOKENS);
  ok("first attempt thinkingLevel MINIMAL", first.thinkingLevel === ThinkingLevel.MINIMAL);

  const retry = buildUserVisibleGeminiRequestShape({
    redactedUserMessage: BUYER_MSG,
    pilotOrchestration: { carCardCount: 1, recentCarCards: SAMPLE_CARDS },
    retryContext: {
      priorUnsafeReason: "too_short",
      redactedUserMessage: BUYER_MSG,
    },
  });
  ok("retry maxOutputTokens 1536", retry.maxOutputTokens === 1536);
  ok("retry uses central constant", retry.maxOutputTokens === USER_VISIBLE_REAL_PROVIDER_MAX_OUTPUT_TOKENS);
  ok("retry thinkingLevel MINIMAL", retry.thinkingLevel === ThinkingLevel.MINIMAL);

  const apiConfig = buildUserVisibleGeminiApiConfig({
    systemInstruction: first.systemInstruction,
    maxOutputTokens: first.maxOutputTokens,
    temperature: first.temperature,
  });
  ok("api config maxOutputTokens 1536", apiConfig.maxOutputTokens === 1536);
  ok("api config thinkingConfig MINIMAL", apiConfig.thinkingConfig?.thinkingLevel === ThinkingLevel.MINIMAL);
  ok("caller uses requestShape.maxOutputTokens", realProviderSrc.includes("maxOutputTokens: requestShape.maxOutputTokens"));
}

// --- retry max 1 unchanged ---
{
  ok("retry unsafe reasons set unchanged", USER_VISIBLE_RETRY_UNSAFE_REASONS.size === 3);
  const retryMatches = realProviderSrc.match(/invokeUserVisibleRealProvider\(/g) ?? [];
  ok("maybeApply has single retry invoke path", retryMatches.length >= 2);
  ok("no third retry invoke", !/retryAttempt:\s*2/.test(realProviderSrc));
}

// --- incomplete sentence guard still blocks ---
{
  const incomplete = `${USER_VISIBLE_FINAL_ANSWER_MARKER} สวัสดีครับ น้องเอคัดรถในงบประมาณ 4 แสนบาทมาให้ 3 คันแล้วนะครับ คันแรก Toyota Vios ปี 2020 ราคา 350,000 บาท ไมล์ตามประกาศ เหมาะใช้งานประจำครับ คันที่สอง Honda City ปี 2019 ราคาใกล้เคียงกัน อีกคันในรายการคุ้มงบครับ ถ้าสนใจคันไหน ฝากชื่อเบอร์ให้ทีมงานติดต่อกลับ`;
  const normalized = normalizeUserVisibleProviderOutput(incomplete);
  ok("incomplete sentence detector", looksLikeIncompleteSentence(normalized.text) === true);
  const safety = evaluateRealProviderOutputSafety(normalized.text, BUYER_MSG, 2);
  ok("incomplete sentence blocks delivery", safety.safe === false && safety.unsafeReason === "incomplete_sentence");
}

// --- valid completed Thai output can pass ---
{
  const good = `${USER_VISIBLE_FINAL_ANSWER_MARKER} สวัสดีครับ น้องเอคัดรถในงบประมาณ 4 แสนบาทมาให้ 3 คันแล้วนะครับ คันแรก Toyota Vios ปี 2020 ราคา 350,000 บาท ไมล์ตามประกาศ เหมาะใช้งานประจำครับ คันที่สอง Honda City ปี 2019 ราคาใกล้เคียงกัน อีกคันในรายการคุ้มงบครับ ถ้าสนใจคันไหน ฝากชื่อเบอร์ให้ทีมงานติดต่อกลับได้ครับ`;
  const normalized = normalizeUserVisibleProviderOutput(good);
  ok("completed Thai marker pass", normalized.rejectReason === undefined);
  ok("completed Thai safety pass", evaluateRealProviderOutputSafety(normalized.text, BUYER_MSG, 2).safe === true);
}

// --- fallback on unsafe (no raw Gemini leak) ---
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
    redactedProviderOutput: '{"candidates":[{"content":{"parts":[{"text":"raw json leak"}]}}]}',
    requestIdHash: "hash-test",
    modelId: "gemini-3.5-flash",
    responseDiagnostics: extractUserVisibleGeminiResponseDiagnostics({
      candidates: [{ finishReason: "STOP" }],
      usageMetadata: { candidatesTokenCount: 12 },
    }),
  }));

  const unsafe = await maybeApplyUserVisibleRealProvider({
    bridgeResult: bridgeBase,
    userMessage: BUYER_MSG,
    firebaseUid: TEST_UID,
    userRole: "buyer",
    pilotOrchestration: { carCardCount: 1, recentCarCards: SAMPLE_CARDS },
    environment: "staging",
    env: STAGING_PILOT_ENV,
    readEnv: (k) => readEnvFrom(STAGING_PILOT_ENV, k),
  });
  ok("unsafe output triggers fallback", unsafe.payload.realProviderGateReason === "real_provider_output_unsafe");
  ok("raw json not delivered", unsafe.orchestrated?.text === "fallback-mock-text");
  ok("real provider network off on unsafe", unsafe.payload.realProviderNetwork === false);

  setUserVisibleGeminiCallerForTests(async () => ({
    providerNetworkUsed: true,
    redactedProviderOutput: `${USER_VISIBLE_FINAL_ANSWER_MARKER} ผ่อนได้แน่นอนครับ อนุมัติแน่นอน รับประกันอนุมัติทุกเคส ฝากชื่อเบอร์ได้ครับ`,
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

// --- diagnostics redacted ---
{
  const diag = extractUserVisibleGeminiResponseDiagnostics({
    candidates: [
      {
        finishReason: "STOP",
        content: { parts: [{ text: "คำตอบ: สวัสดีครับ" }] },
      },
    ],
    usageMetadata: {
      candidatesTokenCount: 512,
      thoughtsTokenCount: 0,
    },
  });
  ok("diag quality slice v6.8E.8", diag.qualitySliceId === "v6.8E.8");
  ok("diag finishReason logged", diag.finishReason === "STOP");
  ok("diag outputTokenCount logged", diag.outputTokenCount === 512);
  ok("diag thoughtsTokenCount logged", diag.thoughtsTokenCount === 0);

  const maybeApplyBlock = realProviderSrc.slice(
    realProviderSrc.indexOf("export async function maybeApplyUserVisibleRealProvider"),
    realProviderSrc.indexOf("export function assertNoFinanceGuaranteeLanguage")
  );
  ok("source logs response diagnostics on unsafe", realProviderSrc.includes("firstAttemptResponseDiagnostics"));
  ok("source logs firstAttemptUnsafeReason", realProviderSrc.includes("firstAttemptUnsafeReason"));
  ok("source logs retryUnsafeReason", realProviderSrc.includes("retryUnsafeReason"));
  ok("source logs unsafe diagnostics helper", realProviderSrc.includes("logUserVisibleOutputUnsafeDiagnostics"));
  const logBlock = realProviderSrc.slice(
    realProviderSrc.indexOf("function logUserVisibleOutputUnsafeDiagnostics"),
    realProviderSrc.indexOf("export type UserVisibleRealProviderGateReason")
  );
  ok("unsafe log no full prompt", !logBlock.includes("buildUserVisibleGeminiCombinedPrompt"));
  ok("unsafe log no raw provider output field", !/redactedProviderOutput/.test(logBlock));

  for (const pat of [SECRET_PATTERNS[0], SECRET_PATTERNS[1]]) {
    ok(`source no secret ${pat.source.slice(0, 10)}`, !pat.test(realProviderSrc));
  }
  ok("source redacts GEMINI_API_KEY in errors", realProviderSrc.includes('GEMINI_API_KEY=[redacted]'));
}

// --- v6.8E.7 thinking config regression (Phase A preserved) ---
{
  ok("v6.8E.7 thinkingLevel MINIMAL in source", realProviderSrc.includes("ThinkingLevel.MINIMAL"));
  ok("v6.8E.7 thought part filter in source", realProviderSrc.includes("if (part.thought) continue"));
  ok("v6.8E.7 buildUserVisibleGeminiApiConfig in caller", realProviderSrc.includes("buildUserVisibleGeminiApiConfig"));
}

// --- static script safety ---
{
  const selfCode = selfSrc.split("// --- static script safety ---")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no generateContent call", !/generateContent\s*\(/.test(selfCode));
}

console.log("\nDone v6.8E.8 tests.\n");
if (process.exitCode) process.exit(process.exitCode);
