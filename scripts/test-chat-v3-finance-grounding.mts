/**
 * WP-V3-14A — Gemini-grounded finance (offline, mock provider only).
 * Run: npx tsx scripts/test-chat-v3-finance-grounding.mts
 * No Live Gemini. No network. No PII.
 */
import { buildChatV3FinanceAssumptionBlock } from "../src/services/ai/chat-v3/chatV3AutomotiveFinanceBlock.ts";
import { CHAT_V3_TRUSTED_CALCULATION_MARKER } from "../src/services/ai/chat-v3/chatV3AutomotiveFinanceBlock.ts";
import { runChatV3Conversation } from "../src/services/ai/chat-v3/chatV3ConversationService.ts";
import {
  buildChatV3FinanceCorrectionInstruction,
  CHAT_V3_FINANCE_CONSISTENCY_PROVIDER_ID,
  CHAT_V3_FINANCE_RECALC_NOTICE,
  validateChatV3FinanceConsistency,
} from "../src/services/ai/chat-v3/chatV3FinanceConsistency.ts";
import type { ChatV3ProviderAdapter } from "../src/services/ai/chat-v3/chatV3ProviderAdapter.ts";
import { getChatV3GeminiSdkNetworkCallCount } from "../src/services/ai/chat-v3/chatV3GeminiClient.ts";
import {
  calculateFlatRateFinance,
  formatBaht,
} from "../src/utils/financeCalculator.ts";

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

function section(title: string): void {
  console.log(`\n=== ${title} ===`);
}

const FINANCE_600K_MESSAGE =
  "รถราคา 600000 ดาวน์ 200000 บาท ผ่อน 60 เดือน ดอกเบี้ย 4% ค่างวดเท่าไหร่";

const trusted600k = calculateFlatRateFinance({
  carPrice: 600_000,
  downPaymentBaht: 200_000,
  annualFlatRatePercent: 4,
  termMonths: 60,
});

function createScriptedProvider(input: {
  replies: string[];
  onGenerate?: (callIndex: number, request: { message: string; history: unknown[]; systemInstruction: string }) => void;
}): ChatV3ProviderAdapter & { calls: number } {
  const state = { calls: 0 };
  const adapter: ChatV3ProviderAdapter & { calls: number } = {
    id: "fake-finance-v3",
    get calls() {
      return state.calls;
    },
    async generate(request) {
      const callIndex = state.calls;
      input.onGenerate?.(callIndex, {
        message: request.message,
        history: request.history,
        systemInstruction: request.systemInstruction,
      });
      const content =
        input.replies[Math.min(callIndex, input.replies.length - 1)] ?? "";
      state.calls += 1;
      return {
        ok: true,
        providerId: "fake-finance-v3",
        content,
      };
    },
  };
  return adapter;
}

async function runWith(message: string, provider: ChatV3ProviderAdapter, history: Array<{ role: "user" | "assistant"; content: string }> = []) {
  return runChatV3Conversation({
    rawRequest: {
      conversationId: "conv-finance-14a",
      message,
      history,
      expertMode: "FINANCE",
    },
    environment: "test",
    provider,
    allowFakeProvider: true,
    now: () => 1_700_000_000_000,
  });
}

async function main(): Promise<void> {
  const networkBefore = getChatV3GeminiSdkNetworkCallCount();

  section("1 — Trusted calculation for 600,000 / ~8,000");
  {
    assert(trusted600k.monthlyInstallment === 8_000, "assumptions yield 8,000 installment");
    const block = buildChatV3FinanceAssumptionBlock({
      message: FINANCE_600K_MESSAGE,
      financeRelevant: true,
    });
    assert(block.status === "complete" && Boolean(block.result), "finance block complete");
    assert(
      block.result?.monthlyInstallment === 8_000 &&
        block.result?.carPrice === 600_000 &&
        block.result?.downPaymentBaht === 200_000,
      "trusted facts match calculator"
    );
    assert(
      block.instructionText.includes(CHAT_V3_TRUSTED_CALCULATION_MARKER) &&
        block.instructionText.includes(formatBaht(8_000)),
      "instruction carries TRUSTED_CALCULATION_CONTEXT and installment"
    );

    let firstInstruction = "";
    const provider = createScriptedProvider({
      replies: [
        `จากตัวเลขชุดนี้ ค่างวดประมาณ ${formatBaht(8_000)} ต่อเดือน ราคารถ ${formatBaht(600_000)} ดาวน์ ${formatBaht(200_000)} บาท ใช้เป็นตัวอย่างสมมติสำหรับประเมินเบื้องต้นนะ`,
      ],
      onGenerate(callIndex, request) {
        if (callIndex === 0) firstInstruction = request.systemInstruction;
      },
    });
    const result = await runWith(FINANCE_600K_MESSAGE, provider);
    assert(result.success === true, "complete finance turn succeeds");
    assert(
      firstInstruction.includes(CHAT_V3_TRUSTED_CALCULATION_MARKER) &&
        firstInstruction.includes(formatBaht(8_000)) &&
        firstInstruction.includes("แยกจากข้อความผู้ใช้"),
      "trusted calculation is sent to Gemini, separated from the user message"
    );
    assert(provider.calls === 1, "consistent reply does not trigger correction");
  }

  section("2 — Detail and summary use the same numbers");
  {
    const consistent =
      `รายละเอียด: ราคารถ ${formatBaht(600_000)} ดาวน์ ${formatBaht(200_000)} ยอดจัด ${formatBaht(trusted600k.loanAmount)} ค่างวดประมาณ ${formatBaht(8_000)} บาท\nสรุปสั้น ๆ ค่างวดประมาณ ${formatBaht(8_000)} ต่อเดือน เป็นตัวอย่างสมมติสำหรับประเมินเบื้องต้น`;
    const check = validateChatV3FinanceConsistency(consistent, trusted600k);
    assert(check.ok, "matching detail/summary passes");

    const conflicted =
      `รายละเอียด: ค่างวดประมาณ ${formatBaht(8_000)} บาท\nสรุปท้าย ค่างวดประมาณ 9,500 บาท`;
    const conflict = validateChatV3FinanceConsistency(conflicted, trusted600k);
    assert(
      !conflict.ok &&
        conflict.mismatches.some((item) => item.kind === "detail_summary_conflict" || item.kind === "installment"),
      "conflicting detail/summary is detected"
    );
  }

  section("3 — Wrong numbers are detected");
  {
    const wrong = validateChatV3FinanceConsistency(
      "ค่างวดประมาณ 9,999 บาท ต่อเดือน",
      trusted600k
    );
    assert(
      !wrong.ok && wrong.mismatches.some((item) => item.kind === "installment" && item.actual === 9_999),
      "simulated wrong installment is detected"
    );
  }

  section("4-5 — Correction pass fixes numbers once, stays conversational");
  {
    const provider = createScriptedProvider({
      replies: [
        "สรุปง่าย ๆ ค่างวดประมาณ 9,999 บาทต่อเดือน ถ้าโอเคบอกได้เลยนะ",
        `เข้าใจแล้ว ใช้ตัวเลขชุดนี้ต่อได้เลย ค่างวดประมาณ ${formatBaht(8_000)} ต่อเดือน เป็นตัวอย่างสมมติสำหรับประเมินเบื้องต้น ถ้าอยากเทียบดาวน์อื่น ถามต่อได้`,
      ],
    });
    const result = await runWith(FINANCE_600K_MESSAGE, provider);
    assert(result.success === true, "correction turn succeeds");
    if (result.success) {
      assert(
        result.data.providerId === "fake-finance-v3" &&
          result.data.content.includes(formatBaht(8_000)) &&
          !result.data.content.includes("9,999") &&
          /ตัวอย่างสมมติ|ประเมินเบื้องต้น/.test(result.data.content) &&
          /ถามต่อได้|บอกได้เลย|เข้าใจแล้ว/.test(result.data.content),
        "correction keeps conversational Gemini prose with the trusted installment"
      );
    }
    assert(provider.calls === 2, "correction pass runs exactly once when the first reply conflicts");
  }

  section("6 — Failed correction does not leak conflicting numbers");
  {
    const provider = createScriptedProvider({
      replies: [
        "ค่างวดประมาณ 9,999 บาท",
        "สรุปอีกที ค่างวดประมาณ 9,500 บาท รับรองว่าอนุมัติสินเชื่อแล้ว",
      ],
    });
    const result = await runWith(FINANCE_600K_MESSAGE, provider);
    assert(result.success === true, "failed correction still returns a turn");
    if (result.success) {
      assert(
        result.data.providerId === CHAT_V3_FINANCE_CONSISTENCY_PROVIDER_ID &&
          result.data.content === CHAT_V3_FINANCE_RECALC_NOTICE,
        "fallback is the transparent recalc notice"
      );
      assert(
        !/9,999|9,500|8,000|฿8,000/.test(result.data.content),
        "no conflicting finance amounts are shown"
      );
    }
    assert(provider.calls === 2, "does not retry correction more than once");
  }

  section("7 — Incomplete inputs ask or declare assumptions");
  {
    const incompleteMessage = "อยากผ่อนรถราคา 600000 บาท ค่างวดประมาณเท่าไหร่";
    const block = buildChatV3FinanceAssumptionBlock({
      message: incompleteMessage,
      financeRelevant: true,
    });
    assert(block.status === "incomplete", "incomplete when down/rate/term missing");
    assert(
      /ถามเฉพาะค่าที่ขาด|ตัวอย่างสมมติสำหรับประเมินเบื้องต้น/.test(block.instructionText) &&
        block.missingFields.length > 0,
      "asks only for missing fields or requires labeled assumptions"
    );
    const provider = createScriptedProvider({
      replies: [
        "ขอเงินดาวน์ อัตราดอกเบี้ย และระยะผ่อนก่อนนะ ถ้าจะยกตัวอย่างต้องติดป้ายว่าเป็นตัวอย่างสมมติ",
      ],
    });
    const result = await runWith(incompleteMessage, provider);
    assert(result.success === true && provider.calls === 1, "incomplete path does not force a calculation rewrite");
    if (result.success) {
      assert(
        result.data.content.includes("เงินดาวน์") &&
          !/ค่างวดประมาณ\s*8,000/.test(result.data.content),
        "Gemini may ask for missing facts instead of inventing an installment"
      );
    }
  }

  section("8 — No live market data → hypothetical label");
  {
    const block = buildChatV3FinanceAssumptionBlock({
      message: FINANCE_600K_MESSAGE,
      financeRelevant: true,
    });
    assert(
      block.instructionText.includes("ตัวอย่างสมมติสำหรับประเมินเบื้องต้น") &&
        /ห้ามเรียกว่า “ราคาตลาดตอนนี้”|ห้าม.*ดอกเบี้ยปัจจุบัน/.test(block.instructionText),
      "trusted context labels hypothetical example and forbids live-market claims"
    );
  }

  section("9 — No credit approval");
  {
    const approval = validateChatV3FinanceConsistency(
      `ค่างวดประมาณ ${formatBaht(8_000)} รับรองว่าอนุมัติสินเชื่อแล้ว`,
      trusted600k
    );
    assert(
      !approval.ok && approval.mismatches.some((item) => item.kind === "credit_approval_claim"),
      "credit-approval claim is detected even when numbers match"
    );
    const block = buildChatV3FinanceAssumptionBlock({
      message: FINANCE_600K_MESSAGE,
      financeRelevant: true,
    });
    assert(
      /ห้ามรับรองการอนุมัติสินเชื่อ|ไม่ใช่ผลอนุมัติ/.test(block.instructionText),
      "trusted context forbids guaranteeing approval"
    );
  }

  section("10 — Two finance contexts are not forced to the same wording");
  {
    const a = createScriptedProvider({
      replies: [
        `ค่างวดประมาณ ${formatBaht(8_000)} ต่อเดือน ถ้าอยากเทียบดาวน์ต่ำกว่านี้ บอกได้เลย`,
      ],
    });
    const b = createScriptedProvider({
      replies: [
        `จากสมมติฐานนี้ ค่างวดประมาณ ${formatBaht(8_000)} บาท/เดือน เป็นตัวอย่างสมมติสำหรับประเมินเบื้องต้น จะให้ไล่ระยะ 48 กับ 60 เดือนไหม`,
      ],
    });
    const resultA = await runWith(FINANCE_600K_MESSAGE, a);
    const resultB = await runWith(FINANCE_600K_MESSAGE, b);
    assert(
      resultA.success === true &&
        resultB.success === true &&
        resultA.success &&
        resultB.success &&
        resultA.data.content !== resultB.data.content &&
        resultA.data.content.includes(formatBaht(8_000)) &&
        resultB.data.content.includes(formatBaht(8_000)),
      "two valid Gemini phrasings with the same facts both pass"
    );
  }

  section("11 — Validator skipped for non-finance questions");
  {
    const provider = createScriptedProvider({
      replies: ["CDI คือกล่องจุดระเบิด ค่างวด 99,999 บาท ไม่เกี่ยวกับเรื่องนี้"],
    });
    const result = await runWith("CDI บนมอเตอร์ไซค์ทำหน้าที่อะไร", provider);
    assert(result.success === true && provider.calls === 1, "general question is a single generate");
    if (result.success) {
      assert(
        result.data.content.includes("99,999") &&
          result.data.providerId === "fake-finance-v3",
        "finance validator does not rewrite a non-finance answer"
      );
    }
  }

  section("12 — Multi-turn finance history continues");
  {
    let capturedHistory: Array<{ role: string; content: string }> = [];
    const provider = createScriptedProvider({
      replies: [
        "อธิบายต่อได้เลย ค่างวดชุดที่คุยไว้ยังใช้สมมติฐานเดิม ถ้าจะเปลี่ยนระยะผ่อนบอกใหม่ได้",
      ],
      onGenerate(_callIndex, request) {
        capturedHistory = request.history as Array<{ role: string; content: string }>;
      },
    });
    const result = await runWith(
      "อธิบายค่างวดเมื่อกี้ง่ายกว่านี้หน่อย",
      provider,
      [
        { role: "user", content: FINANCE_600K_MESSAGE },
        {
          role: "assistant",
          content: `ค่างวดประมาณ ${formatBaht(8_000)} เป็นตัวอย่างสมมติสำหรับประเมินเบื้องต้น`,
        },
      ]
    );
    assert(result.success === true, "follow-up finance turn succeeds");
    assert(
      capturedHistory.length === 2 &&
        capturedHistory[0].content.includes("600000") &&
        capturedHistory[1].content.includes(formatBaht(8_000)),
      "follow-up forwards the prior finance conversation"
    );
  }

  section("Correction instruction is short and not a sales template");
  {
    const instruction = buildChatV3FinanceCorrectionInstruction({
      result: trusted600k,
      mismatches: [{ kind: "installment", expected: 8_000, actual: 9_999 }],
    });
    assert(
      instruction.includes(CHAT_V3_TRUSTED_CALCULATION_MARKER) &&
        instruction.includes(formatBaht(8_000)) &&
        !/5-8 ประโยค|soft CTA|ซื้อเลย|ทักเซลส์/.test(instruction) &&
        instruction.length < 1_200,
      "correction prompt is a short fact patch, not a sales script"
    );
  }

  const networkAfter = getChatV3GeminiSdkNetworkCallCount();
  assert(networkAfter === networkBefore, "no Gemini SDK network calls");

  console.log("");
  console.log(`WP-V3-14A finance grounding: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
