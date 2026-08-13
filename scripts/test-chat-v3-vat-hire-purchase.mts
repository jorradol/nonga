/**
 * WP-V3-14C — VAT / hire-purchase accuracy (offline).
 * Run: npx tsx scripts/test-chat-v3-vat-hire-purchase.mts
 * No Live Gemini. Contract checks only — no exact Gemini sentence lock.
 */
import { detectChatV3AccuracyTopics } from "../src/services/ai/chat-v3/chatV3AutomotiveAccuracyGuidance.ts";
import { buildChatV3FinanceAssumptionBlock } from "../src/services/ai/chat-v3/chatV3AutomotiveFinanceBlock.ts";
import { composeChatV3AutomotiveReasoningBlocks } from "../src/services/ai/chat-v3/chatV3AutomotiveReasoning.ts";
import { buildChatV3SystemInstruction } from "../src/services/ai/chat-v3/chatV3SystemInstruction.ts";
import { validateChatV3FinanceConsistency } from "../src/services/ai/chat-v3/chatV3FinanceConsistency.ts";
import {
  calculateFlatRateFinance,
  formatBaht,
} from "../src/utils/financeCalculator.ts";
import { getChatV3GeminiSdkNetworkCallCount } from "../src/services/ai/chat-v3/chatV3GeminiClient.ts";

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

const CASE_1 = calculateFlatRateFinance({
  carPrice: 600_000,
  downPaymentBaht: 200_000,
  annualFlatRatePercent: 4,
  termMonths: 60,
});

const CASE_2 = calculateFlatRateFinance({
  carPrice: 600_000,
  downPaymentBaht: 150_000,
  annualFlatRatePercent: 4,
  termMonths: 60,
});

const usedCarVatAsk =
  "รถมือสองราคา 600000 ดาวน์ 200000 บาท ผ่อน 60 เดือน ดอกเบี้ย 4% ค่างวด 8000 ต้องบวก VAT 7% เป็น 8560 ไหม";
const newCarVatAsk =
  "รถใหม่ราคา 600000 ค่างวดประมาณ 8000 บาท ต้องไม่คิด VAT หรือต้องบวกเพิ่ม";

const usedInstruction = buildChatV3SystemInstruction("FINANCE", {
  message: usedCarVatAsk,
});
const newInstruction = buildChatV3SystemInstruction("FINANCE", {
  message: newCarVatAsk,
});

console.log("=== WP-V3-14C VAT / hire-purchase ===");

assert(
  detectChatV3AccuracyTopics(usedCarVatAsk).includes("finance_consistency") &&
    detectChatV3AccuracyTopics("ภาษีมูลค่าเพิ่มในสัญญาเช่าซื้อคิดยังไง").includes(
      "finance_consistency"
    ),
  "VAT / hire-purchase cues map to finance_consistency guidance"
);

assert(
  CASE_1.monthlyInstallment === 8_000 &&
    CASE_1.loanAmount === 400_000 &&
    CASE_1.totalInterest === 80_000,
  "trusted case 1 remains 8,000 installment (not 8,560)"
);
assert(
  CASE_2.monthlyInstallment === 9_000 &&
    CASE_2.loanAmount === 450_000 &&
    CASE_2.totalInterest === 90_000,
  "trusted case 2 remains 9,000 installment (not 9,630)"
);

{
  const block1 = buildChatV3FinanceAssumptionBlock({
    message:
      "รถราคา 600000 ดาวน์ 200000 บาท ผ่อน 60 เดือน ดอกเบี้ย 4% ค่างวดเท่าไหร่",
    financeRelevant: true,
  });
  const block2 = buildChatV3FinanceAssumptionBlock({
    message:
      "รถราคา 600000 ดาวน์ 150000 บาท ผ่อน 60 เดือน ดอกเบี้ย 4% ค่างวดเท่าไหร่",
    financeRelevant: true,
  });
  assert(
    block1.status === "complete" &&
      block1.result?.monthlyInstallment === 8_000 &&
      block2.status === "complete" &&
      block2.result?.monthlyInstallment === 9_000,
    "finance block still emits trusted 8,000 and 9,000"
  );
  assert(
    /ห้ามคูณค่างวดในบล็อกนี้ด้วย 1\.07 อัตโนมัติ/.test(block1.instructionText) &&
      /ห้ามใช้รถใหม่หรือรถมือสองเป็นเงื่อนไขตัดสิน VAT/.test(
        block1.instructionText
      ) &&
      !/ค่างวดประมาณการ:.*8,560|คูณ 1\.07 แล้วได้/.test(block1.instructionText),
    "trusted block forbids auto 1.07 markup and does not replace 8,000 with 8,560"
  );
}

assert(
  /ห้ามนำค่างวดที่ระบบคำนวณได้ไปคูณ 1\.07 อัตโนมัติ/.test(usedInstruction) &&
    /ไม่ใช่ข้อยืนยันว่าต้องจ่าย 8,560 จริง/.test(usedInstruction) &&
    !/ค่างวดจริงคือ 8,560|ให้คูณค่างวดด้วย 1\.07 แล้วใช้เป็นยอดชำระ/.test(
      usedInstruction
    ),
  "used-car 8,000 path forbids converting the installment to 8,560"
);

assert(
  /ห้ามเหมารวมว่ารถมือสองต้องบวก VAT 7% เสมอ/.test(usedInstruction) &&
    /ห้ามเหมารวมว่ารถใหม่ไม่ต้องพิจารณา VAT/.test(newInstruction) &&
    /ห้ามตัดสินว่าต้องบวก VAT เพิ่มจากค่างวดเพียงเพราะเป็นรถใหม่หรือรถมือสอง/.test(
      usedInstruction
    ),
  "new vs used is not a blanket VAT decision"
);

assert(
  /ใบเสนอราคา|สัญญา/.test(usedInstruction) &&
    /ราคารถรวม VAT|ค่างวดที่แจ้งรวม VAT/.test(usedInstruction),
  "when quote/contract VAT treatment is unknown, instruction asks to inspect the documents"
);

assert(
  /ห้ามแต่งตัวเลข VAT หรือยอดชำระจริง/.test(usedInstruction) &&
    /เป็นเพียงคณิตศาสตร์ ไม่ใช่ข้อยืนยันว่าต้องจ่าย 8,560 จริง/.test(
      usedInstruction
    ),
  "system must not invent VAT or actual payable amounts"
);

{
  const consistent = `รายละเอียด: ราคารถ ${formatBaht(600_000)} ดาวน์ ${formatBaht(200_000)} ค่างวดประมาณ ${formatBaht(8_000)} บาท\nสรุป ค่างวดประมาณ ${formatBaht(8_000)} เป็นตัวอย่างสมมติสำหรับประเมินเบื้องต้น`;
  const check = validateChatV3FinanceConsistency(consistent, CASE_1);
  assert(check.ok, "existing finance consistency validation still passes for 8,000");

  const autoVat = `ค่างวดประมาณ 8,560 บาทต่อเดือน`;
  const vatConflict = validateChatV3FinanceConsistency(autoVat, CASE_1);
  assert(
    !vatConflict.ok &&
      vatConflict.mismatches.some((item) => item.kind === "installment"),
    "presenting 8,560 as the installment still conflicts with trusted 8,000"
  );
}

{
  const composed = composeChatV3AutomotiveReasoningBlocks({
    message:
      "รถมือสองราคา 600000 ดาวน์ 200000 บาท ผ่อน 60 เดือน ดอกเบี้ย 4% ค่างวดเท่าไหร่ บวก VAT ด้วยไหม",
  });
  assert(
    composed.analysis.financeBlock.result?.monthlyInstallment === 8_000 &&
      composed.turnAddendum.includes(formatBaht(8_000)) &&
      /1\.07 อัตโนมัติ/.test(composed.turnAddendum),
    "turn addendum keeps trusted 8,000 and carries VAT non-auto-markup guidance"
  );
}

assert(
  getChatV3GeminiSdkNetworkCallCount() === 0,
  "no Gemini SDK network calls"
);

console.log("");
console.log(`WP-V3-14C VAT hire-purchase: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
