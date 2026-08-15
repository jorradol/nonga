/**
 * WP-V2U-03E2C2A / R1 — Authoritative grounding mock-only tests.
 * Run: .\node_modules\.bin\tsx.cmd scripts/test-conversation-core-authoritative-grounding.mts
 */
import {
  buildConversationCoreAuthoritativeGroundedAnswer,
  CONVERSATION_CORE_AUTHORITATIVE_GROUNDING_FALLBACK_TEXT,
  validateConversationCoreAuthoritativeGrounding,
  type ConversationCoreUserAssumption,
  type ToolResult,
} from "../src/services/conversation-core/index";
import {
  conversationCoreTextHasNumericRange,
  conversationCoreTextHasScaledAmountUnit,
  normalizeConversationCoreDigits,
  parseConversationCoreIntegerToken,
} from "../src/services/conversation-core/conversationCoreNumericNormalization";

let passCount = 0;

function pass(label: string): void {
  passCount += 1;
  console.log(`PASS: ${label}`);
}

function assertEqual(label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) {
    console.error(`FAIL [${label}] expected ${expected}, got ${actual}`);
    process.exit(1);
  }
  pass(label);
}

function normalizeForCompare(text: string): string {
  return normalizeConversationCoreDigits(text).replace(/\s+/g, " ").trim();
}

function assertAccepted(label: string, assistantText: string, toolResult: unknown, userAssumptions?: ConversationCoreUserAssumption[]) {
  const result = validateConversationCoreAuthoritativeGrounding({
    assistantText,
    toolResult,
    userAssumptions,
  });
  if (!result.ok) {
    console.error(`FAIL [${label}] expected accepted`, result);
    process.exit(1);
  }
  if (result.assistantText !== normalizeForCompare(assistantText)) {
    console.error(`FAIL [${label}] text mismatch`, result);
    process.exit(1);
  }
  pass(label);
}

function assertRejected(
  label: string,
  assistantText: string,
  toolResult: unknown,
  expectedCode: string,
  userAssumptions?: ConversationCoreUserAssumption[]
) {
  const result = validateConversationCoreAuthoritativeGrounding({
    assistantText,
    toolResult,
    userAssumptions,
  });
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
  if (result.fallbackText !== CONVERSATION_CORE_AUTHORITATIVE_GROUNDING_FALLBACK_TEXT) {
    console.error(`FAIL [${label}] unexpected fallback text`);
    process.exit(1);
  }
  pass(label);
}

function marketplaceResult(listingIds: string[], query = "รถเก๋ง"): ToolResult {
  return {
    requestId: "req-market-1",
    conversationId: "conv-001",
    toolName: "marketplace.search",
    status: "ok",
    provenance: "marketplace-search",
    data: { listingIds, query },
  };
}

function inventoryResult(listingIds: string[]): ToolResult {
  return {
    requestId: "req-inv-1",
    conversationId: "conv-001",
    toolName: "inventory.fetch",
    status: "ok",
    provenance: "inventory-api",
    data: { listingIds },
  };
}

function selectionResult(listingId: string, resolved: boolean): ToolResult {
  return {
    requestId: "req-sel-1",
    conversationId: "conv-001",
    toolName: "vehicle.resolveSelection",
    status: "ok",
    provenance: "vehicle-selection",
    data: { listingId, resolved },
  };
}

function financeResult() {
  return {
    requestId: "req-fin-1",
    conversationId: "conv-001",
    toolName: "finance.calculate",
    status: "ok",
    provenance: "finance-calculator",
    data: {
      listingId: "listing-100",
      vehiclePrice: 420000,
      priceSource: "inventory",
      calculationMode: "listing-bound",
      downPaymentBaht: 84000,
      downPaymentPercent: 20,
      loanAmount: 336000,
      annualInterestRatePercent: 5,
      interestMethod: "flat",
      termMonths: 60,
      totalInterest: 42000,
      monthlyPayment: 6300,
      totalPayable: 378000,
      currency: "THB",
      isEstimate: true,
      quotationStatus: "not-quotation",
      vatStatus: "not-calculated",
      additionalChargesStatus: "not-calculated",
    },
  };
}

const THREE_LISTINGS = ["listing-alpha", "listing-beta", "listing-gamma"];
const USER_BUDGET_ASSUMPTION: ConversationCoreUserAssumption[] = [
  { kind: "user-reported-money-baht", amount: 600_000 },
];

// --- Numeric normalization ---

const parsedArabic = parseConversationCoreIntegerToken("8,333");
if (!parsedArabic.ok || parsedArabic.value.value !== 8333) {
  console.error("FAIL [normalization: arabic comma]");
  process.exit(1);
}
pass("normalization: arabic comma");

const parsedThai = parseConversationCoreIntegerToken("๘,๓๓๓");
if (!parsedThai.ok || parsedThai.value.value !== 8333) {
  console.error("FAIL [normalization: thai digits]");
  process.exit(1);
}
pass("normalization: thai digits equivalent");

assertEqual(
  "normalization: scaled amount detected",
  conversationCoreTextHasScaledAmountUnit("ประมาณ 8.33 พัน"),
  true
);
assertEqual(
  "normalization: numeric range detected hyphen",
  conversationCoreTextHasNumericRange("8,000-9,000"),
  true
);
assertEqual(
  "normalization: numeric range detected thai word",
  conversationCoreTextHasNumericRange("8,000 ถึง 9,000"),
  true
);

const malformed = parseConversationCoreIntegerToken("12,34,567");
if (malformed.ok) {
  console.error("FAIL [normalization: malformed comma rejected]");
  process.exit(1);
}
pass("normalization: malformed comma rejected");

// --- Deterministic builder ---

const builtMarketplace = buildConversationCoreAuthoritativeGroundedAnswer(
  marketplaceResult(THREE_LISTINGS)
);
assertAccepted(
  "builder: marketplace canonical accepted",
  builtMarketplace,
  marketplaceResult(THREE_LISTINGS)
);

const builtInventory = buildConversationCoreAuthoritativeGroundedAnswer(
  inventoryResult(["listing-one", "listing-two"])
);
assertAccepted(
  "builder: inventory canonical accepted",
  builtInventory,
  inventoryResult(["listing-one", "listing-two"])
);

const builtBudget = buildConversationCoreAuthoritativeGroundedAnswer(
  marketplaceResult(THREE_LISTINGS),
  USER_BUDGET_ASSUMPTION
);
assertAccepted(
  "builder: attributed budget canonical accepted",
  builtBudget,
  marketplaceResult(THREE_LISTINGS),
  USER_BUDGET_ASSUMPTION
);

assertAccepted(
  "builder: selection resolved canonical accepted",
  buildConversationCoreAuthoritativeGroundedAnswer(selectionResult("listing-alpha", true)),
  selectionResult("listing-alpha", true)
);
assertAccepted(
  "builder: selection unresolved canonical accepted",
  buildConversationCoreAuthoritativeGroundedAnswer(selectionResult("listing-alpha", false)),
  selectionResult("listing-alpha", false)
);

// --- Listing ID ---

assertAccepted(
  "listing: known ids accepted",
  "พบ 3 คัน: listing-alpha, listing-beta, listing-gamma",
  marketplaceResult(THREE_LISTINGS)
);
assertRejected(
  "listing: unknown id rejected",
  "แนะนำ listing-unknown ครับ",
  marketplaceResult(THREE_LISTINGS),
  "unknown_listing_id"
);
assertRejected(
  "listing: substring spoof rejected",
  "listing-alpha-extra",
  marketplaceResult(["listing-alpha"]),
  "unknown_listing_id"
);
assertAccepted(
  "listing: numeric-looking id in canonical grammar",
  "พบ 1 รายการ: listing-9001",
  marketplaceResult(["listing-9001"])
);

// --- Count ---

assertAccepted(
  "count: exact match accepted",
  "พบ 3 คัน listing-alpha listing-beta listing-gamma",
  marketplaceResult(THREE_LISTINGS)
);
assertRejected(
  "count: mismatch rejected",
  "พบ 2 คัน listing-alpha listing-beta listing-gamma",
  marketplaceResult(THREE_LISTINGS),
  "listing_count_mismatch"
);
assertAccepted(
  "count: thai digits accepted",
  "พบ ๓ คัน listing-alpha listing-beta listing-gamma",
  marketplaceResult(THREE_LISTINGS)
);
assertAccepted(
  "count: approximate accepted when exact",
  "พบประมาณ 3 คัน listing-alpha listing-beta listing-gamma",
  marketplaceResult(THREE_LISTINGS)
);
assertRejected(
  "count: unrelated number rejected",
  "พบ 3 คัน และมี 500,000 บาท",
  marketplaceResult(THREE_LISTINGS),
  "unsupported_prose_shape"
);

// --- Unsupported vehicle details ---

assertRejected(
  "vehicle detail: brand rejected",
  "พบ Toyota listing-alpha",
  marketplaceResult(["listing-alpha"]),
  "unsupported_prose_shape"
);
assertRejected(
  "vehicle detail: model without keyword rejected",
  "แนะนำ Civic listing-alpha",
  marketplaceResult(["listing-alpha"]),
  "unsupported_prose_shape"
);
assertRejected(
  "vehicle detail: year rejected",
  "listing-alpha ปี 2020",
  marketplaceResult(["listing-alpha"]),
  "unverifiable_vehicle_claim"
);
assertRejected(
  "vehicle detail: mileage rejected",
  "listing-alpha ไมล์ 50,000",
  marketplaceResult(["listing-alpha"]),
  "unverifiable_vehicle_claim"
);
assertRejected(
  "vehicle detail: dealer rejected",
  "listing-alpha จากดีลเลอร์ A",
  marketplaceResult(["listing-alpha"]),
  "unverifiable_vehicle_claim"
);
assertRejected(
  "vehicle detail: unproven demonstrative rejected",
  "คันนี้น่าสนใจมากครับ",
  marketplaceResult(["listing-alpha"]),
  "unverifiable_vehicle_claim"
);

// --- User assumptions ---

assertAccepted(
  "user assumption: attributed budget accepted",
  "ตามงบ 600,000 บาทที่คุณแจ้ง พบผลลัพธ์ 3 รายการ: listing-alpha, listing-beta และ listing-gamma",
  marketplaceResult(THREE_LISTINGS),
  USER_BUDGET_ASSUMPTION
);
assertRejected(
  "user assumption: system price role rejected",
  "รถราคา 600,000 บาท listing-alpha",
  marketplaceResult(["listing-alpha"]),
  "unverifiable_vehicle_claim"
);
assertRejected(
  "user assumption: same number wrong role rejected",
  "ราคาในระบบ 600,000 บาท listing-alpha",
  marketplaceResult(["listing-alpha"]),
  "unverifiable_vehicle_claim"
);
assertRejected(
  "user assumption: free-form budget prose rejected",
  "ตามงบ 600,000 บาทที่คุณแจ้ง ผมหารถให้แล้ว 3 คัน",
  marketplaceResult(THREE_LISTINGS),
  "unsupported_prose_shape",
  USER_BUDGET_ASSUMPTION
);

// --- Numeric policy ---

assertRejected(
  "numeric: scaled amount rejected",
  "พบ 3 คัน ค่างวด 8.33 พัน",
  marketplaceResult(THREE_LISTINGS),
  "scaled_amount"
);
assertRejected(
  "numeric: range rejected",
  "ค่างวด 8,000-9,000 บาท listing-alpha",
  marketplaceResult(["listing-alpha"]),
  "numeric_range"
);
assertRejected(
  "numeric: thai range rejected",
  "ค่างวด 8,000 ถึง 9,000 บาท listing-alpha",
  marketplaceResult(["listing-alpha"]),
  "numeric_range"
);

// --- Selection ---

assertAccepted(
  "selection: resolved true accepted",
  "เลือก listing-alpha สำเร็จครับ",
  selectionResult("listing-alpha", true)
);
assertAccepted(
  "selection: resolved false accepted",
  "ยังเลือก listing-alpha ไม่สำเร็จครับ",
  selectionResult("listing-alpha", false)
);
assertRejected(
  "selection: listing mismatch rejected",
  "เลือก listing-beta สำเร็จครับ",
  selectionResult("listing-alpha", true),
  "selection_listing_mismatch"
);
assertRejected(
  "selection: status mismatch rejected",
  "เลือก listing-alpha สำเร็จครับ",
  selectionResult("listing-alpha", false),
  "selection_status_mismatch"
);
assertRejected(
  "selection: added price rejected",
  "listing-alpha ราคา 400,000 บาท",
  selectionResult("listing-alpha", true),
  "unverifiable_vehicle_claim"
);

// --- Tool boundary ---

assertRejected(
  "tool: finance unsupported",
  "ค่างวด 6,300 บาท",
  financeResult(),
  "unsupported_tool"
);
assertRejected(
  "tool: error status rejected",
  "พบ 1 คัน listing-alpha",
  {
    requestId: "req-market-1",
    conversationId: "conv-001",
    toolName: "marketplace.search",
    status: "error",
    provenance: "marketplace-search",
    errorCode: "tool_error",
  },
  "tool_result_not_ok"
);
assertRejected(
  "tool: fallback status rejected",
  "พบ 1 คัน listing-alpha",
  {
    requestId: "req-market-1",
    conversationId: "conv-001",
    toolName: "marketplace.search",
    status: "fallback",
    provenance: "marketplace-search",
    errorCode: "tool_error",
    fallbackUsed: true,
  },
  "tool_result_not_ok"
);
assertRejected(
  "tool: invalid shape rejected",
  "พบ 1 คัน listing-alpha",
  { toolName: "marketplace.search", status: "ok" },
  "invalid_tool_result"
);

// --- Inventory tool ---

assertAccepted(
  "inventory: listing ids accepted",
  "มี 2 รายการ listing-one listing-two",
  inventoryResult(["listing-one", "listing-two"])
);

// --- Arbitrary prose (R1) ---

assertRejected(
  "arbitrary: general safe prose rejected",
  "สวัสดีครับ ผมช่วยสรุปผลการค้นหาให้แล้วครับ",
  marketplaceResult(THREE_LISTINGS),
  "unsupported_prose_shape"
);
assertRejected(
  "arbitrary: non-canonical selection prose rejected",
  "เลือก listing-9001 ได้ครับ",
  marketplaceResult(["listing-9001"]),
  "unsupported_prose_shape"
);
assertRejected(
  "arbitrary: correct count with vehicle embellishment",
  "พบ 3 รายการ และทุกคันสภาพดี",
  marketplaceResult(THREE_LISTINGS),
  "unverifiable_vehicle_claim"
);
assertRejected(
  "arbitrary: correct id with owner claim",
  "พบ listing-alpha ซึ่งเจ้าของดูแลดี",
  marketplaceResult(["listing-alpha"]),
  "unverifiable_vehicle_claim"
);
assertRejected(
  "arbitrary: polite hidden factual claim",
  "รายการนี้น่าเชื่อถือและพร้อมโอน",
  marketplaceResult(["listing-alpha"]),
  "unverifiable_vehicle_claim"
);
assertRejected(
  "arbitrary: mixed safe count and unsafe prose",
  "ผลค้นหาดูดีมาก รถแต่ละคันผ่านการตรวจแล้ว",
  marketplaceResult(THREE_LISTINGS),
  "unsupported_prose_shape"
);

// --- Unknown brand/model (R1) ---

assertRejected(
  "unknown model: altis without bounded keyword",
  "Altis ดีมาก",
  marketplaceResult(["listing-alpha"]),
  "unsupported_prose_shape"
);
assertRejected(
  "unknown model: civic compact claim",
  "Civic คันนี้คุ้ม",
  marketplaceResult(["listing-alpha"]),
  "unverifiable_vehicle_claim"
);
assertRejected(
  "unknown model: zenix fictional model",
  "รถ Zenix น่าใช้",
  marketplaceResult(["listing-alpha"]),
  "unsupported_prose_shape"
);
assertRejected(
  "unknown model: nga-x9 fictional model",
  "NGA-X9 ดีมาก",
  marketplaceResult(["listing-alpha"]),
  "unsupported_prose_shape"
);

// --- Qualitative claims without numbers (R1) ---

assertRejected(
  "qualitative: engine quality claim",
  "คันนี้เครื่องดี",
  marketplaceResult(["listing-alpha"]),
  "unverifiable_vehicle_claim"
);
assertRejected(
  "qualitative: ride comfort claim",
  "ขับนุ่มและประหยัด",
  marketplaceResult(["listing-alpha"]),
  "unverifiable_vehicle_claim"
);
assertRejected(
  "qualitative: accident history claim",
  "ไม่เคยชน",
  marketplaceResult(["listing-alpha"]),
  "unverifiable_vehicle_claim"
);
assertRejected(
  "qualitative: cosmetic condition claim",
  "สภาพสวยพร้อมใช้",
  marketplaceResult(["listing-alpha"]),
  "unverifiable_vehicle_claim"
);
assertRejected(
  "qualitative: owner care claim",
  "เจ้าของเดิมดูแลดี",
  marketplaceResult(["listing-alpha"]),
  "unverifiable_vehicle_claim"
);
assertRejected(
  "qualitative: flood history claim not in regex",
  "ไม่มีน้ำท่วม",
  marketplaceResult(["listing-alpha"]),
  "unverifiable_vehicle_claim"
);
assertRejected(
  "qualitative: mileage authenticity claim",
  "ไมล์แท้",
  marketplaceResult(["listing-alpha"]),
  "unsupported_prose_shape"
);
assertRejected(
  "qualitative: warranty claim not in regex",
  "รับประกันคุณภาพ",
  marketplaceResult(["listing-alpha"]),
  "unverifiable_vehicle_claim"
);
assertRejected(
  "qualitative: inspection claim not in regex",
  "ผ่านการตรวจจากศูนย์แล้ว",
  marketplaceResult(["listing-alpha"]),
  "unsupported_prose_shape"
);

// --- Vehicle attributes absent from tool result (R1) ---

assertRejected(
  "attribute: color claim",
  "listing-alpha สีขาว",
  marketplaceResult(["listing-alpha"]),
  "unverifiable_vehicle_claim"
);
assertRejected(
  "attribute: fuel claim",
  "listing-alpha เบนซิน",
  marketplaceResult(["listing-alpha"]),
  "unverifiable_vehicle_claim"
);
assertRejected(
  "attribute: transmission claim",
  "listing-alpha เกียร์ออโต้",
  marketplaceResult(["listing-alpha"]),
  "unverifiable_vehicle_claim"
);
assertRejected(
  "attribute: promotion claim",
  "listing-alpha มีโปรโมชั่นพิเศษ",
  marketplaceResult(["listing-alpha"]),
  "unverifiable_vehicle_claim"
);
assertRejected(
  "attribute: warranty availability claim",
  "listing-alpha มีประกัน",
  marketplaceResult(["listing-alpha"]),
  "unverifiable_vehicle_claim"
);

// --- Tampering (R1) ---

assertRejected(
  "tamper: suffix factual claim on canonical count",
  "พบ 3 คัน listing-alpha listing-beta listing-gamma และสภาพดี",
  marketplaceResult(THREE_LISTINGS),
  "unverifiable_vehicle_claim"
);
assertRejected(
  "tamper: prefix embellishment",
  "รถทุกคันสภาพดี พบ 3 คัน listing-alpha listing-beta listing-gamma",
  marketplaceResult(THREE_LISTINGS),
  "unverifiable_vehicle_claim"
);
assertRejected(
  "tamper: reordered listing ids",
  "พบ 3 คัน listing-gamma listing-beta listing-alpha",
  marketplaceResult(THREE_LISTINGS),
  "noncanonical_grounded_answer"
);
assertRejected(
  "tamper: extra listing id",
  "พบ 3 คัน listing-alpha listing-beta listing-gamma listing-delta",
  marketplaceResult(THREE_LISTINGS),
  "unknown_listing_id"
);
assertRejected(
  "tamper: unicode spacing variation",
  "พบ\u200b 3 คัน listing-alpha listing-beta listing-gamma",
  marketplaceResult(THREE_LISTINGS),
  "unsupported_prose_shape"
);

// --- Normalization utility sanity ---

assertEqual(
  "normalization: digit map",
  normalizeConversationCoreDigits("๙๙๙"),
  "999"
);

console.log(`\nConversation Core authoritative grounding tests passed (${passCount} assertions).`);
