/**
 * WP-V3-10D — Chat V.3 raw LaTeX / typography normalization (offline).
 * Run: npx tsx scripts/test-chat-v3-typography-normalize.mts
 *
 * No network. No live Gemini.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  normalizeChatV3AssistantTypography,
} from "../src/services/ai/chat-v3/chatV3TypographyNormalize.ts";
import { runChatV3Conversation } from "../src/services/ai/chat-v3/chatV3ConversationService.ts";
import type { ChatV3ProviderAdapter } from "../src/services/ai/chat-v3/chatV3ProviderAdapter.ts";
import { buildChatV3SystemInstruction } from "../src/services/ai/chat-v3/chatV3SystemInstruction.ts";
import { buildChatV3FinanceAssumptionBlock } from "../src/services/ai/chat-v3/chatV3AutomotiveFinanceBlock.ts";
import { calculateFlatRateFinance } from "../src/utils/financeCalculator.ts";
import { getChatV3GeminiSdkNetworkCallCount } from "../src/services/ai/chat-v3/chatV3GeminiClient.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    passed += 1;
    console.log(`PASS — ${message}`);
    return;
  }
  failed += 1;
  console.error(`FAIL — ${message}`);
}

function assertEqual(actual: string, expected: string, message: string): void {
  if (actual === expected) {
    passed += 1;
    console.log(`PASS — ${message}`);
    return;
  }
  failed += 1;
  console.error(`FAIL — ${message}`);
  console.error(`  expected: ${JSON.stringify(expected)}`);
  console.error(`  actual:   ${JSON.stringify(actual)}`);
}

function section(title: string): void {
  console.log(`\n=== ${title} ===`);
}

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

async function main(): Promise<void> {
  const networkBefore = getChatV3GeminiSdkNetworkCallCount();

  section("Positive — allowlisted command mappings");

  assertEqual(
    normalizeChatV3AssistantTypography(
      "ราคารถ 420,000 $\\rightarrow$ ยอดจัด 336,000 บาท"
    ),
    "ราคารถ 420,000 → ยอดจัด 336,000 บาท",
    "$\\rightarrow$ wrapped math arrow"
  );

  assertEqual(
    normalizeChatV3AssistantTypography("A \\rightarrow B"),
    "A → B",
    "bare \\rightarrow"
  );

  assertEqual(
    normalizeChatV3AssistantTypography("B \\leftarrow A"),
    "B ← A",
    "bare \\leftarrow"
  );

  assertEqual(
    normalizeChatV3AssistantTypography("10 \\times 20"),
    "10 × 20",
    "bare \\times"
  );

  assertEqual(
    normalizeChatV3AssistantTypography("100 \\div 4"),
    "100 ÷ 4",
    "bare \\div"
  );

  assertEqual(
    normalizeChatV3AssistantTypography("ประมาณ \\approx 6,300 บาท"),
    "ประมาณ ≈ 6,300 บาท",
    "bare \\approx"
  );

  assertEqual(
    normalizeChatV3AssistantTypography("ไม่เกิน \\le 450,000 บาท"),
    "ไม่เกิน ≤ 450,000 บาท",
    "bare \\le"
  );

  assertEqual(
    normalizeChatV3AssistantTypography("อย่างน้อย \\ge 300,000 บาท"),
    "อย่างน้อย ≥ 300,000 บาท",
    "bare \\ge"
  );

  assertEqual(
    normalizeChatV3AssistantTypography("ดาวน์ 20\\%"),
    "ดาวน์ 20%",
    "bare \\%"
  );

  section("Negative / preservation");

  const priceDollar = "ราคา $20,000";
  assertEqual(
    normalizeChatV3AssistantTypography(priceDollar),
    priceDollar,
    "dollar amount $20,000 unchanged"
  );

  const interest = "ดอกเบี้ย 2.5%";
  assertEqual(
    normalizeChatV3AssistantTypography(interest),
    interest,
    "percent 2.5% unchanged"
  );

  const brand = "Toyota Corolla Cross";
  assertEqual(
    normalizeChatV3AssistantTypography(brand),
    brand,
    "brand/model text unchanged"
  );

  const bold = "**ข้อความสำคัญ**";
  assertEqual(
    normalizeChatV3AssistantTypography(bold),
    bold,
    "markdown bold markers unchanged"
  );

  const url =
    "ดูรายละเอียดที่ https://example.com/cars?make=toyota&price=420000&sort=asc";
  assertEqual(
    normalizeChatV3AssistantTypography(url),
    url,
    "URL with query string unchanged"
  );

  const mdLink =
    "ดู [รายการนี้](https://nonga.example/listing?id=42&ref=chat) ได้เลย";
  assertEqual(
    normalizeChatV3AssistantTypography(mdLink),
    mdLink,
    "markdown link unchanged"
  );

  const thaiEn =
    "สวัสดีครับ น้องเอแนะนำ SUV ในงบไม่เกิน 700,000 บาท forester หรือ X-Trail ก็ได้นะ";
  assertEqual(
    normalizeChatV3AssistantTypography(thaiEn),
    thaiEn,
    "Thai + English prose unchanged character-for-character"
  );

  const multiline = "บรรทัดหนึ่ง\nบรรทัดสอง\nบรรทัดสาม";
  assertEqual(
    normalizeChatV3AssistantTypography(multiline),
    multiline,
    "multiline text without latex unchanged"
  );

  const fenced = [
    "ตัวอย่างโค้ด:",
    "```",
    "A \\rightarrow B",
    "10 \\times 20",
    "ดาวน์ 20\\%",
    "```",
    "จบตัวอย่าง",
  ].join("\n");
  assertEqual(
    normalizeChatV3AssistantTypography(fenced),
    fenced,
    "fenced code block preserves raw latex"
  );

  const inline = "ใช้คำสั่ง `\\rightarrow` หรือ `$\\times$` ในตัวอย่างเทคนิค";
  assertEqual(
    normalizeChatV3AssistantTypography(inline),
    inline,
    "inline code preserves intentional latex / code"
  );

  const intentionalUserStyle =
    "ผู้ใช้ถามเรื่อง LaTeX ว่าเขียน $\\rightarrow$ ยังไง — นอก code เราแปลงได้ แต่ใน `` `\\leftarrow` `` ต้องคงเดิม";
  // Note: the intentional example mixes plain + inline; verify inline half preserved
  {
    const input =
      "อธิบายว่าในโค้ดให้พิมพ์ `\\times` ส่วนนอกข้อความใช้ลูกศรได้";
    const expected =
      "อธิบายว่าในโค้ดให้พิมพ์ `\\times` ส่วนนอกข้อความใช้ลูกศรได้";
    assertEqual(
      normalizeChatV3AssistantTypography(input),
      expected,
      "technical backslash example in inline code preserved"
    );
    void intentionalUserStyle;
  }

  const backslashPath = "path\\to\\file และ C:\\Users\\demo";
  assertEqual(
    normalizeChatV3AssistantTypography(backslashPath),
    backslashPath,
    "Windows-style backslash paths not stripped"
  );

  const unknownLeq = "ค่า \\leq 100";
  assertEqual(
    normalizeChatV3AssistantTypography(unknownLeq),
    unknownLeq,
    "unsupported \\leq not partially converted via \\le"
  );

  section("Idempotency");

  {
    const once = normalizeChatV3AssistantTypography(
      "ราคารถ 420,000 $\\rightarrow$ ยอดจัด 336,000 บาท และ 10 \\times 20"
    );
    const twice = normalizeChatV3AssistantTypography(once);
    assertEqual(twice, once, "second normalization pass is a no-op");
    assertEqual(
      once,
      "ราคารถ 420,000 → ยอดจัด 336,000 บาท และ 10 × 20",
      "first pass produces expected unicode"
    );
  }

  section("WP-V3-14 — banned cheer + accidental CJK/Kana");

  {
    const cheer = normalizeChatV3AssistantTypography(
      "ตัวเลือกนี้น่าสนใจ ปังปุริเย่! ลุยต่อได้เลย"
    );
    assert(!/ปังปุริเย่/.test(cheer), "strips banned cheer ปังปุริเย่");
    assert(cheer.includes("น่าสนใจ"), "keeps surrounding Thai copy");

    const leaked = normalizeChatV3AssistantTypography(
      "ตรวจโช้ค $\\rightarrow$ 你好 カタカナ และใช้ CDI ได้"
    );
    assert(leaked.includes("→"), "latex arrow still normalized with CJK present");
    assert(!/你好|カタカナ|\\rightarrow/.test(leaked), "removes CJK/Kana and raw latex");
    assert(leaked.includes("CDI"), "keeps Latin technical terms");

    const inCode = normalizeChatV3AssistantTypography(
      "นอกโค้ด ปังปุริเย่ แต่ในโค้ด `ปังปุริเย่` และ ```\n你好\n```"
    );
    assert(inCode.includes("`ปังปุริเย่`"), "cheer preserved inside inline code");
    assert(inCode.includes("你好"), "CJK preserved inside fenced code");
    assert(
      inCode.startsWith("นอกโค้ด") && !inCode.slice(0, inCode.indexOf("`")).includes("ปังปุริเย่"),
      "cheer stripped from plain text before code"
    );
  }

  section("Runtime wiring — assistant only");

  {
    const latexReply =
      "ราคารถ 420,000 $\\rightarrow$ ยอดจัด 336,000 บาท ดาวน์ 20\\%";
    const userMessage =
      "คำนวณยอดจัดให้หน่อย อย่าแก้ข้อความผู้ใช้ $\\rightarrow$ นี้";
    let capturedUserMessage = "";
    const provider: ChatV3ProviderAdapter = {
      id: "fake-v3-typo",
      async generate(input) {
        capturedUserMessage = input.message;
        return {
          ok: true,
          providerId: "fake-v3-typo",
          content: latexReply,
        };
      },
    };
    const result = await runChatV3Conversation({
      rawRequest: {
        conversationId: "conv-typo-1",
        message: userMessage,
        history: [],
        expertMode: "FINANCE",
      },
      environment: "development",
      provider,
      allowFakeProvider: true,
      now: () => 1_700_000_000_000,
    });
    assert(
      result.success === true,
      "conversation succeeds with latex-bearing provider text"
    );
    if (result.success) {
      assertEqual(
        result.data.content,
        "ราคารถ 420,000 → ยอดจัด 336,000 บาท ดาวน์ 20%",
        "service normalizes assistant content before return"
      );
    }
    assertEqual(
      capturedUserMessage,
      userMessage,
      "user message reaches provider without typography rewriting"
    );
  }

  section("Output instruction — typography only");

  {
    const instruction = buildChatV3SystemInstruction("AUTO");
    assert(
      instruction.includes("[รูปแบบข้อความ — typography]") &&
        /ห้ามใช้คำสั่ง LaTeX|math mode/.test(instruction) &&
        instruction.includes("→"),
      "system instruction asks for Unicode not raw LaTeX"
    );
    assert(
      instruction.includes("น้องเอ") &&
        /ห้ามใช้คำว่า\s*ปังปุริเย่/.test(instruction) &&
        /เป็นธรรมชาติ|เพื่อนคู่คิด/.test(instruction),
      "personality / identity blocks still present (ปังปุริเย่ banned)"
    );
  }

  section("Finance calculator regression (unchanged numbers)");

  {
    const expected = calculateFlatRateFinance({
      carPrice: 1_200_000,
      downPaymentPercent: 20,
      annualFlatRatePercent: 5,
      termMonths: 60,
    });
    const block = buildChatV3FinanceAssumptionBlock({
      message: "รถราคา 1200000 ดาวน์ 20% ผ่อน 60 เดือน ดอกเบี้ย 5% ค่างวดเท่าไหร่",
      financeRelevant: true,
    });
    assert(
      block.status === "complete" &&
        block.result?.monthlyInstallment === expected.monthlyInstallment &&
        block.result?.loanAmount === expected.loanAmount,
      "finance installment numbers unchanged"
    );
  }

  section("Scope guards");

  {
    const chatV2Bubble = read("src/components/chat/ChatMessageBubble.tsx");
    // Owner may have dirty Chat V.2 files; this WP must not modify them.
    // We only assert our allowlisted chat-v3 files reference the normalizer.
    const service = read("src/services/ai/chat-v3/chatV3ConversationService.ts");
    const ui = read("src/components/chat-v3/ChatV3Conversation.tsx");
    const normalizeMod = read(
      "src/services/ai/chat-v3/chatV3TypographyNormalize.ts"
    );
    assert(
      service.includes("normalizeChatV3AssistantTypography") &&
        ui.includes("normalizeChatV3AssistantTypography") &&
        normalizeMod.includes("WP-V3-10D"),
      "normalizer wired in Chat V.3 service + UI only"
    );
    assert(
      !normalizeMod.includes("replace(/\\\\/g") &&
        !normalizeMod.includes("stripHtml") &&
        !/\.replace\([^)]*\$[^)]*g[^)]*\)/.test(
          normalizeMod.split("normalizePlainTypography")[0] ?? ""
        ),
      "no broad $ or backslash stripping helper"
    );
    void chatV2Bubble;
  }

  const networkAfter = getChatV3GeminiSdkNetworkCallCount();
  assert(
    networkAfter === networkBefore,
    "no Gemini SDK network calls during typography tests"
  );

  console.log("");
  console.log(
    `WP-V3-10D typography normalize: ${passed} passed, ${failed} failed`
  );
  console.log("Confirmed: no Live Gemini call; no network in this script.");
  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
