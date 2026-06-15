/**
 * v6.8E.7 — Gemini thinking budget + output strategy (offline/static)
 * npm run test:v68e7-gemini-thinking-budget-output-strategy
 */
import { readFileSync } from "node:fs";
import { ThinkingLevel } from "@google/genai";
import {
  buildUserVisibleGeminiApiConfig,
  buildUserVisibleGeminiRequestShape,
  buildUserVisibleStructuredOutputJson,
  evaluateRealProviderOutputSafety,
  extractUserVisibleGeminiResponseText,
  parseUserVisibleStructuredOutput,
  USER_VISIBLE_BUYER_PROMPT_QUALITY_SLICE_ID,
  USER_VISIBLE_GEMINI_REQUEST_SHAPE,
  USER_VISIBLE_GEMINI_THINKING_LEVEL,
  USER_VISIBLE_REAL_GEMINI_MODEL,
  USER_VISIBLE_REAL_PROVIDER_MAX_OUTPUT_TOKENS,
  USER_VISIBLE_RETRY_UNSAFE_REASONS,
  USER_VISIBLE_STRUCTURED_OUTPUT_FIELD,
} from "../src/services/ai/salesBrainUserVisibleRealProvider.ts";

const REAL_PROVIDER_SRC = "src/services/ai/salesBrainUserVisibleRealProvider.ts";
const BUYER_MSG = "งบ 4 แสน มีรถอะไรน่าเล่น";
const FINANCE_MSG = "ผ่อนประมาณเท่าไหร่ได้ไหม";

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

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.8E.7 Gemini Thinking Budget + Output Strategy ===\n");

const realProviderSrc = readFileSync(REAL_PROVIDER_SRC, "utf8");
const pkg = readFileSync("package.json", "utf8");
const selfSrc = readFileSync(
  "scripts/test-v68e7-gemini-thinking-budget-output-strategy.mts",
  "utf8"
);

// --- slice + package ---
{
  ok("quality slice v6.8E.9", USER_VISIBLE_BUYER_PROMPT_QUALITY_SLICE_ID === "v6.8E.9");
  ok(
    "request shape structured json",
    USER_VISIBLE_GEMINI_REQUEST_SHAPE ===
      "sdk_system_instruction_split_minimal_thinking_structured_json"
  );
  ok("package script v68e7", pkg.includes("test:v68e7-gemini-thinking-budget-output-strategy"));
  ok("thinking level MINIMAL", USER_VISIBLE_GEMINI_THINKING_LEVEL === ThinkingLevel.MINIMAL);
}

// --- thinking budget config ---
{
  const shape = buildUserVisibleGeminiRequestShape({
    redactedUserMessage: BUYER_MSG,
    pilotOrchestration: { carCardCount: 1, recentCarCards: SAMPLE_CARDS },
  });
  ok("request shape includes thinkingLevel", shape.thinkingLevel === ThinkingLevel.MINIMAL);
  ok("maxOutputTokens uses central constant", shape.maxOutputTokens === USER_VISIBLE_REAL_PROVIDER_MAX_OUTPUT_TOKENS);
  ok("maxOutputTokens Phase B 1536", shape.maxOutputTokens === 1536);

  const apiConfig = buildUserVisibleGeminiApiConfig({
    systemInstruction: shape.systemInstruction,
    maxOutputTokens: shape.maxOutputTokens,
    temperature: shape.temperature,
  });
  ok("api config thinkingConfig present", apiConfig.thinkingConfig?.thinkingLevel === ThinkingLevel.MINIMAL);
  ok("api config keeps systemInstruction split", apiConfig.systemInstruction === shape.systemInstruction);
  ok("api config no includeThoughts", !("includeThoughts" in (apiConfig.thinkingConfig ?? {})));
  ok("caller uses buildUserVisibleGeminiApiConfig", realProviderSrc.includes("buildUserVisibleGeminiApiConfig"));
  ok("caller passes thinkingConfig via helper", realProviderSrc.includes("thinkingConfig: { thinkingLevel"));
  ok("imports ThinkingLevel from SDK", realProviderSrc.includes('from "@google/genai"'));
  ok("model unchanged gemini-3.5-flash", shape.model === USER_VISIBLE_REAL_GEMINI_MODEL);
}

// --- fail-safe: no thinkingBudget alongside thinkingLevel ---
{
  const apiConfig = buildUserVisibleGeminiApiConfig({
    systemInstruction: "test",
    maxOutputTokens: 768,
    temperature: 0.5,
  });
  ok("no thinkingBudget in config", (apiConfig.thinkingConfig as { thinkingBudget?: number }).thinkingBudget === undefined);
  ok("only MINIMAL level set", apiConfig.thinkingConfig.thinkingLevel === ThinkingLevel.MINIMAL);
}

// --- thought part filtering (user-visible text only) ---
{
  const mixed = extractUserVisibleGeminiResponseText({
    candidates: [
      {
        content: {
          parts: [
            { text: "English planning draft", thought: true },
            { text: buildUserVisibleStructuredOutputJson("สวัสดีครับ น้องเอช่วยคัดรถให้ครับ") },
          ],
        },
      },
    ],
  });
  ok("thought parts excluded from extraction", !mixed.includes("English planning"));
  ok("answer part kept", mixed.includes("สวัสดีครับ"));
  ok("source skips thought parts", realProviderSrc.includes("if (part.thought) continue"));
}

// --- retry max 1 (unchanged) ---
{
  ok("retry unsafe reasons includes structured parse", USER_VISIBLE_RETRY_UNSAFE_REASONS.has("invalid_structured_output"));
  const retryMatches = realProviderSrc.match(/invokeUserVisibleRealProvider\(/g) ?? [];
  ok("maybeApply has single retry invoke path", retryMatches.length >= 2);
  ok("no third retry invoke", !/retryAttempt:\s*2/.test(realProviderSrc));
}

// --- guard regression ---
{
  const goodJson = buildUserVisibleStructuredOutputJson(
    "สวัสดีครับ น้องเอคัดรถในงบประมาณ 4 แสนบาทมาให้ 3 คันแล้วนะครับ คันแรก Toyota Vios ปี 2020 ราคา 350,000 บาท ไมล์ตามประกาศ เหมาะใช้งานประจำครับ คันที่สอง Honda City ปี 2019 ราคาใกล้เคียงกัน อีกคันในรายการคุ้มงบครับ ถ้าสนใจคันไหน ฝากชื่อเบอร์ให้ทีมงานติดต่อกลับได้ครับ"
  );
  const good = parseUserVisibleStructuredOutput(goodJson);
  ok("structured parse pass", good.rejectReason === undefined);
  ok("structured parse safety pass", evaluateRealProviderOutputSafety(good.text!, BUYER_MSG, 2).safe === true);

  const noField = parseUserVisibleStructuredOutput('{"other":"x"}');
  ok("missing finalAnswerTh blocks", noField.rejectReason === "missing_final_answer_th");

  const short = parseUserVisibleStructuredOutput(buildUserVisibleStructuredOutputJson("สั้นครับ"));
  ok("too_short blocks", evaluateRealProviderOutputSafety(short.text!, BUYER_MSG, 2).safe === false);

  const financeBad = parseUserVisibleStructuredOutput(
    buildUserVisibleStructuredOutputJson("ผ่อนได้แน่นอนครับ อนุมัติแน่นอน รับประกันอนุมัติทุกเคส ฝากชื่อเบอร์ได้ครับ")
  );
  ok("finance forbidden blocks", evaluateRealProviderOutputSafety(financeBad.text!, FINANCE_MSG, 1).unsafeReason === "finance_forbidden_phrase");

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

// --- v6.8E.9 structured JSON path (Phase C) ---
{
  ok("responseMimeType json in api config", buildUserVisibleGeminiApiConfig({
    systemInstruction: "test",
    maxOutputTokens: 1536,
    temperature: 0.5,
  }).responseMimeType === "application/json");
  ok("responseSchema in api config", buildUserVisibleGeminiApiConfig({
    systemInstruction: "test",
    maxOutputTokens: 1536,
    temperature: 0.5,
  }).responseSchema.required.includes(USER_VISIBLE_STRUCTURED_OUTPUT_FIELD));
  ok("responseSchema in caller", realProviderSrc.includes("responseSchema:"));
  ok("responseMimeType in caller", realProviderSrc.includes('responseMimeType: "application/json"'));
}

// --- static script safety ---
{
  const selfCode = selfSrc.split("// --- static script safety ---")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no generateContent call", !/generateContent\s*\(/.test(selfCode));
}

console.log("\nDone v6.8E.7 tests.\n");
if (process.exitCode) process.exit(process.exitCode);
