/**
 * v6.8E.6 — Gemini systemInstruction split + real output diagnostics (offline/static)
 * npm run test:v68e6-gemini-call-shape-diagnostics-system-instruction
 */
import { readFileSync } from "node:fs";
import {
  buildUserVisibleGeminiCombinedPrompt,
  buildUserVisibleGeminiContents,
  buildUserVisibleGeminiRequestShape,
  buildUserVisibleGeminiRetryContents,
  buildUserVisibleGeminiRetryPrompt,
  evaluateRealProviderOutputSafety,
  extractUserVisibleGeminiResponseDiagnostics,
  extractUserVisibleGeminiResponseText,
  hasMetaInstructionLeak,
  normalizeUserVisibleProviderOutput,
  USER_VISIBLE_BUYER_PROMPT_QUALITY_SLICE_ID,
  USER_VISIBLE_FINAL_ANSWER_MARKER,
  USER_VISIBLE_GEMINI_REQUEST_SHAPE,
  USER_VISIBLE_REAL_GEMINI_MODEL,
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

const SECRET_PATTERNS = [
  /AIza[Sy][a-zA-Z0-9_-]{20,}/,
  /Bearer\s+[A-Za-z0-9._-]{20,}/,
  /GEMINI_API_KEY[=:\s][A-Za-z0-9._-]+/,
];

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

console.log("=== v6.8E.6 Gemini Call Shape + Diagnostics ===\n");

const realProviderSrc = readFileSync(REAL_PROVIDER_SRC, "utf8");
const pkg = readFileSync("package.json", "utf8");
const selfSrc = readFileSync(
  "scripts/test-v68e6-gemini-call-shape-diagnostics-system-instruction.mts",
  "utf8"
);

// --- slice + package ---
{
  ok("quality slice v6.8E.7", USER_VISIBLE_BUYER_PROMPT_QUALITY_SLICE_ID === "v6.8E.7");
  ok("request shape split constant", USER_VISIBLE_GEMINI_REQUEST_SHAPE === "sdk_system_instruction_split_minimal_thinking");
  ok("package script v68e6", pkg.includes("test:v68e6-gemini-call-shape-diagnostics-system-instruction"));
}

// --- systemInstruction split shape ---
{
  const shape = buildUserVisibleGeminiRequestShape({
    redactedUserMessage: BUYER_MSG,
    pilotOrchestration: { carCardCount: 2, recentCarCards: SAMPLE_CARDS },
  });
  ok("caller uses systemInstruction field", realProviderSrc.includes("systemInstruction: requestShape.systemInstruction"));
  ok("caller uses contents text part", realProviderSrc.includes("contents: [{ text: requestShape.contentsText }]"));
  ok("systemInstruction has persona", shape.systemInstruction.includes("น้องเอ"));
  ok("systemInstruction has output contract marker", shape.systemInstruction.includes(USER_VISIBLE_FINAL_ANSWER_MARKER));
  ok("systemInstruction has slice id", shape.systemInstruction.includes("v6.8E.7"));
  ok("systemInstruction no listing card data", !shape.systemInstruction.includes("Toyota Vios"));
  ok("systemInstruction no user message", !shape.systemInstruction.includes(BUYER_MSG));
  ok("contents has listing context", shape.contentsText.includes("ข้อมูล listing:"));
  ok("contents has listing card", shape.contentsText.includes("Toyota Vios"));
  ok("contents has user message", shape.contentsText.includes(BUYER_MSG));
  ok("contents no persona contract duplication required", !shape.contentsText.includes("[สัญญาคำตอบ]"));
  ok("model id", shape.model === USER_VISIBLE_REAL_GEMINI_MODEL);
  ok("max tokens 768", shape.maxOutputTokens === 768);
  ok("first call temperature 0.5", shape.temperature === 0.5);
}

// --- retry symmetry ---
{
  const first = buildUserVisibleGeminiRequestShape({
    redactedUserMessage: BUYER_MSG,
    pilotOrchestration: { carCardCount: 2, recentCarCards: SAMPLE_CARDS },
  });
  const retry = buildUserVisibleGeminiRequestShape({
    redactedUserMessage: BUYER_MSG,
    pilotOrchestration: { carCardCount: 2, recentCarCards: SAMPLE_CARDS },
    retryContext: {
      priorUnsafeReason: "missing_final_answer_marker",
      redactedUserMessage: BUYER_MSG,
    },
  });
  ok("retry same systemInstruction", retry.systemInstruction === first.systemInstruction);
  ok("retry keeps output contract in systemInstruction", retry.systemInstruction.includes(USER_VISIBLE_FINAL_ANSWER_MARKER));
  ok("retry contents has repair note", retry.contentsText.includes("retry"));
  ok("retry contents still has listing", retry.contentsText.includes("Honda HR-V"));
  ok("retry contents still has user message", retry.contentsText.includes(BUYER_MSG));
  ok("retry temperature 0.35", retry.temperature === 0.35);
  ok("retry not slim prompt only", retry.contentsText.length > 80);
  ok(
    "retry helper reuses system instruction builder",
    realProviderSrc.includes("buildUserVisibleGeminiRequestShape")
  );

  const legacyRetry = buildUserVisibleGeminiRetryPrompt(
    BUYER_MSG,
    { carCardCount: 2, recentCarCards: SAMPLE_CARDS },
    "too_short"
  );
  ok("legacy retry combined still has contract", legacyRetry.includes(USER_VISIBLE_FINAL_ANSWER_MARKER));
  ok("legacy retry combined still has listing", legacyRetry.includes("Toyota Vios"));
}

// --- diagnostics extraction ---
{
  const diag = extractUserVisibleGeminiResponseDiagnostics({
    candidates: [
      {
        finishReason: "STOP",
        content: {
          parts: [{ text: "คำตอบ: สวัสดีครับ" }, { text: " extra", thought: true }],
        },
      },
    ],
    usageMetadata: {
      candidatesTokenCount: 42,
      thoughtsTokenCount: 7,
    },
  });
  ok("diag quality slice", diag.qualitySliceId === "v6.8E.7");
  ok("diag finishReason", diag.finishReason === "STOP");
  ok("diag outputTokenCount", diag.outputTokenCount === 42);
  ok("diag thoughtsTokenCount", diag.thoughtsTokenCount === 7);
  ok("diag partCount", diag.partCount === 2);
  ok("diag hasThoughtParts", diag.hasThoughtParts === true);

  const sparse = extractUserVisibleGeminiResponseDiagnostics({ candidates: [] });
  ok("sparse diag no finishReason", sparse.finishReason === undefined);
  ok("sparse diag slice only", sparse.qualitySliceId === "v6.8E.7");

  const text = extractUserVisibleGeminiResponseText({
    candidates: [{ content: { parts: [{ text: `${USER_VISIBLE_FINAL_ANSWER_MARKER} ทดสอบครับ` }] } }],
  });
  ok("text extraction from parts", text.includes("ทดสอบครับ"));

  ok("source logs response diagnostics on unsafe", realProviderSrc.includes("firstAttemptResponseDiagnostics"));
  ok("source logs retry unsafe reason", realProviderSrc.includes("retryUnsafeReason"));
  ok("source exports diagnostics extractor", realProviderSrc.includes("extractUserVisibleGeminiResponseDiagnostics"));
}

// --- diagnostics redaction ---
{
  const logBlock = realProviderSrc.slice(
    realProviderSrc.indexOf("function logUserVisibleOutputUnsafeDiagnostics"),
    realProviderSrc.indexOf("export type UserVisibleRealProviderGateReason")
  );
  ok("unsafe log no full prompt", !logBlock.includes("buildUserVisibleGeminiCombinedPrompt"));
  ok("unsafe log no raw provider output field", !/redactedProviderOutput/.test(logBlock));
  ok("unsafe log helper present", logBlock.includes("logUserVisibleOutputUnsafeDiagnostics"));
  ok("maybeApply uses output sample redaction", realProviderSrc.includes("redactOutputSampleForDiagnostics"));
  ok("caller no prompt console log", !/console\.(log|warn|error)\([^)]*prompt/.test(realProviderSrc));

  for (const pat of [SECRET_PATTERNS[0], SECRET_PATTERNS[1]]) {
    ok(`source no secret ${pat.source.slice(0, 10)}`, !pat.test(realProviderSrc));
  }
  ok("source redacts GEMINI_API_KEY in errors", realProviderSrc.includes('GEMINI_API_KEY=[redacted]'));
}

// --- guard regression (offline) ---
{
  const good = `${USER_VISIBLE_FINAL_ANSWER_MARKER} สวัสดีครับ น้องเอคัดรถในงบประมาณ 4 แสนบาทมาให้ 3 คันแล้วนะครับ คันแรก Toyota Vios ปี 2020 ราคา 350,000 บาท ไมล์ตามประกาศ เหมาะใช้งานประจำครับ คันที่สอง Honda City ปี 2019 ราคาใกล้เคียงกัน อีกคันในรายการคุ้มงบครับ ถ้าสนใจคันไหน ฝากชื่อเบอร์ให้ทีมงานติดต่อกลับได้ครับ`;
  const normalized = normalizeUserVisibleProviderOutput(good);
  ok("marker pass extracts answer", normalized.rejectReason === undefined);
  ok("marker pass safety", evaluateRealProviderOutputSafety(normalized.text, BUYER_MSG, 2).safe === true);

  const noMarker = normalizeUserVisibleProviderOutput("สวัสดีครับ น้องเอช่วยหารถครับ");
  ok("missing marker blocks", noMarker.rejectReason === "missing_final_answer_marker");

  const meta = normalizeUserVisibleProviderOutput(
    `Let's be careful. ${USER_VISIBLE_FINAL_ANSWER_MARKER} สวัสดีครับ`
  );
  ok("meta leak blocks", meta.rejectReason === "meta_instruction_leak");
  ok("meta leak detector", hasMetaInstructionLeak("Let's be careful about this"));

  const short = normalizeUserVisibleProviderOutput(`${USER_VISIBLE_FINAL_ANSWER_MARKER} สั้นครับ`);
  const shortSafety = evaluateRealProviderOutputSafety(short.text, BUYER_MSG, 2);
  ok("too_short blocks", shortSafety.safe === false && shortSafety.unsafeReason === "too_short");

  const financeBad = normalizeUserVisibleProviderOutput(
    `${USER_VISIBLE_FINAL_ANSWER_MARKER} ผ่อนได้แน่นอนครับ อนุมัติแน่นอน รับประกันอนุมัติทุกเคส ฝากชื่อเบอร์ได้ครับ`
  );
  const financeSafety = evaluateRealProviderOutputSafety(financeBad.text, FINANCE_MSG, 1);
  ok("finance forbidden blocks", financeSafety.unsafeReason === "finance_forbidden_phrase");

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

// --- contents/system builders exported ---
{
  const contents = buildUserVisibleGeminiContents(BUYER_MSG, {
    carCardCount: 2,
    recentCarCards: SAMPLE_CARDS,
  });
  ok("contents builder listing only block", contents.startsWith("ข้อมูล listing:"));

  const retryContents = buildUserVisibleGeminiRetryContents(
    BUYER_MSG,
    { carCardCount: 2, recentCarCards: SAMPLE_CARDS },
    "non_thai_output"
  );
  ok("retry contents references system instruction", retryContents.includes("system instruction"));

  const combined = buildUserVisibleGeminiCombinedPrompt(BUYER_MSG, {
    carCardCount: 2,
    recentCarCards: SAMPLE_CARDS,
  });
  ok("combined offline test still works", combined.includes("น้องเอ") && combined.includes(BUYER_MSG));
}

// --- static script safety ---
{
  const selfCode = selfSrc.split("// --- static script safety ---")[0] ?? selfSrc;
  ok("script no fetch http", !/fetch\s*\(\s*[`'"]https?:/.test(selfCode));
  ok("script no generateContent call", !/generateContent\s*\(/.test(selfCode));
  ok("script uses readFileSync", selfCode.includes("readFileSync"));
}

console.log("\nDone v6.8E.6 tests.\n");
if (process.exitCode) process.exit(process.exitCode);
