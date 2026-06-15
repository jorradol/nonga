/**
 * v6.8E.7 — Gemini thinking budget + output strategy (offline/static)
 * npm run test:v68e7-gemini-thinking-budget-output-strategy
 */
import { readFileSync } from "node:fs";
import { ThinkingLevel } from "@google/genai";
import {
  buildUserVisibleGeminiApiConfig,
  buildUserVisibleGeminiRequestShape,
  evaluateRealProviderOutputSafety,
  extractUserVisibleGeminiResponseText,
  normalizeUserVisibleProviderOutput,
  USER_VISIBLE_BUYER_PROMPT_QUALITY_SLICE_ID,
  USER_VISIBLE_FINAL_ANSWER_MARKER,
  USER_VISIBLE_GEMINI_REQUEST_SHAPE,
  USER_VISIBLE_GEMINI_THINKING_LEVEL,
  USER_VISIBLE_REAL_GEMINI_MODEL,
  USER_VISIBLE_REAL_PROVIDER_MAX_OUTPUT_TOKENS,
  USER_VISIBLE_RETRY_UNSAFE_REASONS,
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
  ok("quality slice v6.8E.7", USER_VISIBLE_BUYER_PROMPT_QUALITY_SLICE_ID === "v6.8E.7");
  ok(
    "request shape minimal thinking",
    USER_VISIBLE_GEMINI_REQUEST_SHAPE === "sdk_system_instruction_split_minimal_thinking"
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
  ok("maxOutputTokens still 768", shape.maxOutputTokens === USER_VISIBLE_REAL_PROVIDER_MAX_OUTPUT_TOKENS);
  ok("maxOutputTokens controlled", shape.maxOutputTokens === 768);

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
            { text: `${USER_VISIBLE_FINAL_ANSWER_MARKER} สวัสดีครับ น้องเอช่วยคัดรถให้ครับ` },
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
  ok("retry unsafe reasons set unchanged", USER_VISIBLE_RETRY_UNSAFE_REASONS.size === 3);
  const retryMatches = realProviderSrc.match(/invokeUserVisibleRealProvider\(/g) ?? [];
  ok("maybeApply has single retry invoke path", retryMatches.length >= 2);
  ok("no third retry invoke", !/retryAttempt:\s*2/.test(realProviderSrc));
}

// --- guard regression ---
{
  const good = `${USER_VISIBLE_FINAL_ANSWER_MARKER} สวัสดีครับ น้องเอคัดรถในงบประมาณ 4 แสนบาทมาให้ 3 คันแล้วนะครับ คันแรก Toyota Vios ปี 2020 ราคา 350,000 บาท ไมล์ตามประกาศ เหมาะใช้งานประจำครับ คันที่สอง Honda City ปี 2019 ราคาใกล้เคียงกัน อีกคันในรายการคุ้มงบครับ ถ้าสนใจคันไหน ฝากชื่อเบอร์ให้ทีมงานติดต่อกลับได้ครับ`;
  const normalized = normalizeUserVisibleProviderOutput(good);
  ok("marker pass", normalized.rejectReason === undefined);
  ok("marker pass safety", evaluateRealProviderOutputSafety(normalized.text, BUYER_MSG, 2).safe === true);

  const noMarker = normalizeUserVisibleProviderOutput("สวัสดีครับ น้องเอช่วยหารถครับ");
  ok("missing marker blocks", noMarker.rejectReason === "missing_final_answer_marker");

  const short = normalizeUserVisibleProviderOutput(`${USER_VISIBLE_FINAL_ANSWER_MARKER} สั้นครับ`);
  ok("too_short blocks", evaluateRealProviderOutputSafety(short.text, BUYER_MSG, 2).safe === false);

  const financeBad = normalizeUserVisibleProviderOutput(
    `${USER_VISIBLE_FINAL_ANSWER_MARKER} ผ่อนได้แน่นอนครับ อนุมัติแน่นอน รับประกันอนุมัติทุกเคส ฝากชื่อเบอร์ได้ครับ`
  );
  ok("finance forbidden blocks", evaluateRealProviderOutputSafety(financeBad.text, FINANCE_MSG, 1).unsafeReason === "finance_forbidden_phrase");

  const evBad = normalizeUserVisibleProviderOutput(
    `${USER_VISIBLE_FINAL_ANSWER_MARKER} แบต 40 kWh ระยะวิ่ง 350 กม. ค่าชาร์จประมาณ 500 บาท ครับ`
  );
  const evSafety = evaluateRealProviderOutputSafety(evBad.text, "ถ้าคันนี้เป็นรถไฟฟ้า ต้องดูอะไร", 1, {
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

// --- no JSON path in v6.8E.7 (Phase A only) ---
{
  ok("no responseMimeType json in caller", !/responseMimeType:\s*["']application\/json["']/.test(realProviderSrc));
  ok("no responseSchema in caller", !realProviderSrc.includes("responseSchema:"));
}

// --- static script safety ---
{
  const selfCode = selfSrc.split("// --- static script safety ---")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no generateContent call", !/generateContent\s*\(/.test(selfCode));
}

console.log("\nDone v6.8E.7 tests.\n");
if (process.exitCode) process.exit(process.exitCode);
