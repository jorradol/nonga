/**
 * WP-V2U-03E2C2B — Finance authoritative grounding mock-only tests.
 * Run: .\node_modules\.bin\tsx.cmd scripts/test-conversation-core-finance-grounding.mts
 */
import {
  buildConversationCoreFinanceGroundedAnswer,
  CONVERSATION_CORE_FINANCE_GROUNDING_FALLBACK_TEXT,
  validateConversationCoreFinanceGrounding,
  type FinanceCalculateToolData,
  type ToolResult,
} from "../src/services/conversation-core/index";

let passCount = 0;

function pass(label: string): void {
  passCount += 1;
  console.log(`PASS: ${label}`);
}

function financeResult(data: FinanceCalculateToolData): ToolResult {
  return {
    requestId: "req-fin-1",
    conversationId: "conv-001",
    toolName: "finance.calculate",
    status: "ok",
    provenance: "finance-calculator",
    data,
  };
}

const BASE_FINANCE: FinanceCalculateToolData = {
  listingId: "listing-100",
  vehiclePrice: 420_000,
  priceSource: "inventory",
  calculationMode: "listing-bound",
  downPaymentBaht: 84_000,
  downPaymentPercent: 20,
  loanAmount: 336_000,
  annualInterestRatePercent: 5,
  interestMethod: "flat",
  termMonths: 60,
  totalInterest: 42_000,
  monthlyPayment: 6_300,
  totalPayable: 378_000,
  currency: "THB",
  isEstimate: true,
  quotationStatus: "not-quotation",
  vatStatus: "not-calculated",
  additionalChargesStatus: "not-calculated",
};

function canonicalText(data: FinanceCalculateToolData = BASE_FINANCE): string {
  return buildConversationCoreFinanceGroundedAnswer(data);
}

function assertAccepted(label: string, assistantText: string, toolResult: ToolResult) {
  const result = validateConversationCoreFinanceGrounding({ assistantText, toolResult });
  if (!result.ok) {
    console.error(`FAIL [${label}] expected accepted`, result);
    process.exit(1);
  }
  pass(label);
}

function assertRejected(
  label: string,
  assistantText: string,
  toolResult: ToolResult,
  expectedCode: string
) {
  const result = validateConversationCoreFinanceGrounding({ assistantText, toolResult });
  if (result.ok !== false) {
    console.error(`FAIL [${label}] expected rejection`);
    process.exit(1);
  }
  if (result.code !== expectedCode) {
    console.error(`FAIL [${label}] expected ${expectedCode}, got ${result.code}`);
    process.exit(1);
  }
  if (!result.fallbackText || result.fallbackText.includes("listing-")) {
    console.error(`FAIL [${label}] fallback leaked internal payload`);
    process.exit(1);
  }
  if (result.fallbackText !== CONVERSATION_CORE_FINANCE_GROUNDING_FALLBACK_TEXT) {
    console.error(`FAIL [${label}] unexpected fallback text`);
    process.exit(1);
  }
  pass(label);
}

function replaceField(text: string, from: string, to: string): string {
  return text.replace(from, to);
}

const tool = financeResult(BASE_FINANCE);
const canonical = canonicalText();

// --- Canonical valid answer ---

assertAccepted("canonical: builder output accepted", canonical, tool);
assertAccepted("canonical: thai digits accepted", canonical.replace(/420,000/u, "๔๒๐,๐๐๐"), tool);
assertAccepted(
  "canonical: year-equivalent term accepted",
  canonical.replace("ระยะเวลา 60 เดือน", "ระยะเวลา 5 ปี"),
  tool
);

// --- Money fields ---

assertRejected(
  "money: vehicle price mismatch",
  replaceField(canonical, "420,000", "421,000"),
  tool,
  "finance_value_mismatch"
);
assertRejected(
  "money: down payment mismatch",
  replaceField(canonical, "84,000", "85,000"),
  tool,
  "finance_value_mismatch"
);
assertRejected(
  "money: loan amount mismatch",
  replaceField(canonical, "336,000", "337,000"),
  tool,
  "finance_value_mismatch"
);
assertRejected(
  "money: total interest mismatch",
  replaceField(canonical, "42,000", "43,000"),
  tool,
  "finance_value_mismatch"
);
assertRejected(
  "money: monthly payment mismatch",
  replaceField(canonical, "6,300", "6,400"),
  tool,
  "finance_value_mismatch"
);
assertRejected(
  "money: total payable mismatch",
  replaceField(canonical, "378,000", "379,000"),
  tool,
  "finance_value_mismatch"
);
assertRejected(
  "money: malformed comma rejected",
  replaceField(canonical, "420,000", "42,00,000"),
  tool,
  "finance_unsupported_prose_shape"
);
assertRejected(
  "money: scaled amount rejected",
  `${canonical} ค่างวด 8.33 พัน`,
  tool,
  "finance_unaccounted_numeric_claim"
);
assertRejected(
  "money: range rejected",
  replaceField(canonical, "6,300", "6,000-6,500"),
  tool,
  "finance_unaccounted_numeric_claim"
);
assertRejected(
  "money: extra unaccounted amount rejected",
  canonical.replace("ยอดรวม 378,000 บาท", "ยอดรวม 378,000 บาท ค่าธรรมเนียม 1,000 บาท"),
  tool,
  "finance_unsupported_prose_shape"
);

// --- Semantic role collision ---

const collisionFinance: FinanceCalculateToolData = {
  ...BASE_FINANCE,
  downPaymentBaht: 6_300,
  monthlyPayment: 6_300,
};
const collisionCanonical = canonicalText(collisionFinance);
assertAccepted("collision: equal values canonical accepted", collisionCanonical, financeResult(collisionFinance));
assertRejected(
  "collision: swapped down payment and monthly labels rejected",
  collisionCanonical.replace("เงินดาวน์ 6,300 บาท", "เงินดาวน์ 84,000 บาท").replace(
    "ค่างวด 6,300 บาท",
    "ค่างวด 84,000 บาท"
  ),
  financeResult(collisionFinance),
  "finance_value_mismatch"
);
assertRejected(
  "collision: loan amount under vehicle price label rejected",
  collisionCanonical.replace("ราคารถ 420,000 บาท", "ราคารถ 336,000 บาท"),
  tool,
  "finance_role_mismatch"
);

// --- Interest ---

assertAccepted(
  "interest: +0.05 tolerance accepted",
  canonical.replace("ดอกเบี้ย 5% ต่อปี", "ดอกเบี้ย 5.05% ต่อปี"),
  tool
);
assertAccepted(
  "interest: -0.05 tolerance accepted",
  canonical.replace("ดอกเบี้ย 5% ต่อปี", "ดอกเบี้ย 4.95% ต่อปี"),
  tool
);
assertRejected(
  "interest: +0.06 over tolerance rejected",
  canonical.replace("ดอกเบี้ย 5% ต่อปี", "ดอกเบี้ย 5.06% ต่อปี"),
  tool,
  "finance_interest_rate_mismatch"
);
assertRejected(
  "interest: -0.06 over tolerance rejected",
  canonical.replace("ดอกเบี้ย 5% ต่อปี", "ดอกเบี้ย 4.94% ต่อปี"),
  tool,
  "finance_interest_rate_mismatch"
);
assertRejected(
  "interest: effective rate wording rejected",
  canonical.replace("(flat)", "(effective)"),
  tool,
  "finance_interest_method_mismatch"
);
assertRejected(
  "interest: range rejected",
  canonical.replace("ดอกเบี้ย 5% ต่อปี", "ดอกเบี้ย 4-6% ต่อปี"),
  tool,
  "finance_unaccounted_numeric_claim"
);

// --- Term ---

assertRejected(
  "term: wrong months rejected",
  canonical.replace("ระยะเวลา 60 เดือน", "ระยะเวลา 48 เดือน"),
  tool,
  "finance_term_mismatch"
);
assertRejected(
  "term: wrong years rejected",
  canonical.replace("ระยะเวลา 60 เดือน", "ระยะเวลา 4 ปี"),
  tool,
  "finance_term_mismatch"
);
assertRejected(
  "term: non-divisible months cannot round to years",
  replaceField(
    canonicalText({ ...BASE_FINANCE, termMonths: 54 }),
    "ระยะเวลา 54 เดือน",
    "ระยะเวลา 4 ปี"
  ),
  financeResult({ ...BASE_FINANCE, termMonths: 54 }),
  "finance_term_mismatch"
);
assertRejected(
  "term: range rejected",
  canonical.replace("ระยะเวลา 60 เดือน", "ระยะเวลา 48-60 เดือน"),
  tool,
  "finance_unaccounted_numeric_claim"
);

// --- Disclaimers ---

assertRejected(
  "disclaimer: missing estimate rejected",
  canonical.replace("เป็นการประมาณการเท่านั้น", "เป็นข้อมูล"),
  tool,
  "finance_missing_disclaimer"
);
assertRejected(
  "disclaimer: missing not-quotation rejected",
  canonical.replace("ไม่ใช่ใบเสนอราคา", ""),
  tool,
  "finance_missing_disclaimer"
);
assertRejected(
  "disclaimer: missing VAT not-calculated rejected",
  canonical.replace("VAT ยังไม่ได้คำนวณ", ""),
  tool,
  "finance_missing_disclaimer"
);
assertRejected(
  "disclaimer: missing additional charges not-calculated rejected",
  canonical.replace("ค่าใช้จ่ายเพิ่มเติมยังไม่ได้คำนวณ", ""),
  tool,
  "finance_missing_disclaimer"
);
assertRejected(
  "disclaimer: positive quotation claim rejected",
  `${canonical} นี่คือใบเสนอราคา`,
  tool,
  "finance_quotation_claim"
);
assertRejected(
  "disclaimer: final confirmed amount rejected",
  `${canonical} ยอดนี้ยืนยันแล้ว`,
  tool,
  "finance_approval_claim"
);

// --- VAT ---

assertRejected(
  "vat: included VAT rejected",
  `${canonical} รวม VAT แล้ว`,
  tool,
  "finance_vat_claim"
);
assertRejected(
  "vat: VAT rate rejected",
  `${canonical} VAT 7%`,
  tool,
  "finance_vat_claim"
);
assertRejected(
  "vat: VAT amount rejected",
  `${canonical} VAT เท่ากับ 583 บาท`,
  tool,
  "finance_vat_claim"
);

// --- Additional charges ---

assertRejected(
  "charges: transfer fee rejected",
  `${canonical} รวมค่าโอนแล้ว`,
  tool,
  "finance_additional_charge_claim"
);
assertRejected(
  "charges: insurance rejected",
  `${canonical} รวมเบี้ยประกัน`,
  tool,
  "finance_additional_charge_claim"
);
assertRejected(
  "charges: all-inclusive rejected",
  `${canonical} รวมค่าใช้จ่ายทั้งหมดแล้ว`,
  tool,
  "finance_additional_charge_claim"
);

// --- Approval ---

assertRejected(
  "approval: approved claim rejected",
  `${canonical} อนุมัติแล้ว`,
  tool,
  "finance_approval_claim"
);
assertRejected(
  "approval: guaranteed finance rejected",
  `${canonical} ผ่านไฟแนนซ์แน่นอน`,
  tool,
  "finance_approval_claim"
);
assertRejected(
  "approval: no credit check rejected",
  `${canonical} ไม่ต้องตรวจเครดิต`,
  tool,
  "finance_approval_claim"
);
assertRejected(
  "approval: prose without numbers rejected",
  "อนุมัติสินเชื่อแล้วครับ",
  tool,
  "finance_approval_claim"
);

// --- Arbitrary prose ---

assertRejected(
  "arbitrary: correct monthly with approval suffix rejected",
  `${canonical} และอนุมัติแล้ว`,
  tool,
  "finance_approval_claim"
);
assertRejected(
  "arbitrary: correct monthly with vehicle embellishment rejected",
  canonical.replace("listing-100", "listing-100 สภาพดี"),
  tool,
  "finance_unsupported_prose_shape"
);
assertRejected(
  "arbitrary: unknown natural-language shape rejected",
  "ค่างวดประมาณ 6,300 บาท ผ่อนสบาย",
  tool,
  "finance_unsupported_prose_shape"
);

// --- Tool boundary ---

assertRejected(
  "tool: error status rejected",
  canonical,
  {
    requestId: "req-fin-1",
    conversationId: "conv-001",
    toolName: "finance.calculate",
    status: "error",
    provenance: "finance-calculator",
    errorCode: "tool_error",
  },
  "tool_result_not_ok"
);
assertRejected(
  "tool: fallback status rejected",
  canonical,
  {
    requestId: "req-fin-1",
    conversationId: "conv-001",
    toolName: "finance.calculate",
    status: "fallback",
    provenance: "finance-calculator",
    errorCode: "tool_error",
    fallbackUsed: true,
  },
  "tool_result_not_ok"
);
assertRejected(
  "tool: listing metadata mismatch rejected",
  canonical.replace("listing-100", "listing-200"),
  tool,
  "finance_metadata_mismatch"
);
assertRejected(
  "tool: invalid shape rejected",
  canonical,
  { toolName: "finance.calculate", status: "ok" } as ToolResult,
  "invalid_tool_result"
);

console.log(`\nConversation Core finance grounding tests passed (${passCount} assertions).`);
