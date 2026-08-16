/**
 * WP-V2U-03E2C2B — Finance authoritative grounding (allow-by-construction).
 */
import {
  validateToolResult,
  type FinanceCalculateToolData,
  type ToolResult,
} from "./toolEnvelope";
import {
  conversationCoreTextHasNumericRange,
  conversationCoreTextHasScaledAmountUnit,
  normalizeConversationCoreDigits,
  parseConversationCoreIntegerToken,
} from "./conversationCoreNumericNormalization";

export const CONVERSATION_CORE_FINANCE_GROUNDING_FALLBACK_TEXT =
  "ขออภัยครับ ระบบไม่สามารถยืนยันข้อมูลการเงินจากผลลัพธ์ล่าสุดได้ในขณะนี้";

export const CONVERSATION_CORE_FINANCE_GROUNDING_REASON_CODES = [
  "finance_value_mismatch",
  "finance_role_mismatch",
  "finance_unaccounted_numeric_claim",
  "finance_interest_rate_mismatch",
  "finance_interest_method_mismatch",
  "finance_term_mismatch",
  "finance_missing_disclaimer",
  "finance_quotation_claim",
  "finance_vat_claim",
  "finance_additional_charge_claim",
  "finance_approval_claim",
  "finance_unsupported_prose_shape",
  "finance_metadata_mismatch",
  "finance_precision_loss",
  "invalid_tool_result",
  "tool_result_not_ok",
] as const;

export type ConversationCoreFinanceGroundingReasonCode =
  (typeof CONVERSATION_CORE_FINANCE_GROUNDING_REASON_CODES)[number];

export interface ConversationCoreFinanceGroundingInput {
  readonly assistantText: string;
  readonly toolResult: unknown;
}

export type ConversationCoreFinanceGroundingResult =
  | { readonly ok: true; readonly assistantText: string }
  | {
      readonly ok: false;
      readonly code: ConversationCoreFinanceGroundingReasonCode;
      readonly fallbackText: string;
    };

type RejectResult = Extract<ConversationCoreFinanceGroundingResult, { ok: false }>;

export interface AuthoritativeFinanceFacts {
  readonly listingId: string;
  readonly vehiclePrice: number;
  readonly priceSource: "inventory";
  readonly calculationMode: "listing-bound";
  readonly downPaymentBaht: number;
  readonly downPaymentPercent: number;
  readonly loanAmount: number;
  readonly annualInterestRatePercent: number;
  readonly interestMethod: "flat";
  readonly termMonths: number;
  readonly totalInterest: number;
  readonly monthlyPayment: number;
  readonly totalPayable: number;
  readonly currency: "THB";
  readonly isEstimate: true;
  readonly quotationStatus: "not-quotation";
  readonly vatStatus: "not-calculated";
  readonly additionalChargesStatus: "not-calculated";
}

const INTEREST_RATE_TOLERANCE_PERCENT = 0.05;

const MONEY_FIELD_LABELS = {
  vehiclePrice: /ราคารถ\s*(?:฿\s*)?([\d,๐-๙]+)\s*บาท/u,
  downPaymentBaht: /เงินดาวน์\s*(?:฿\s*)?([\d,๐-๙]+)\s*บาท/u,
  loanAmount: /ยอดจัด\s*(?:฿\s*)?([\d,๐-๙]+)\s*บาท/u,
  totalInterest: /ดอกเบี้ยรวม\s*(?:฿\s*)?([\d,๐-๙]+)\s*บาท/u,
  monthlyPayment: /ค่างวด\s*(?:฿\s*)?([\d,๐-๙]+)\s*บาท/u,
  totalPayable: /ยอดรวม\s*(?:฿\s*)?([\d,๐-๙]+)\s*บาท/u,
} as const;

type MoneyFieldKey = keyof typeof MONEY_FIELD_LABELS;

function reject(code: ConversationCoreFinanceGroundingReasonCode): RejectResult {
  return {
    ok: false,
    code,
    fallbackText: CONVERSATION_CORE_FINANCE_GROUNDING_FALLBACK_TEXT,
  };
}

function collapseWhitespace(text: string): string {
  return normalizeConversationCoreDigits(text).replace(/\s+/g, " ").trim();
}

function formatIntegerMoney(amount: number): string {
  if (!Number.isInteger(amount)) {
    throw new Error("precision_loss");
  }
  return amount.toLocaleString("en-US");
}

function formatPercent(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }
  return value.toString();
}

function formatRate(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }
  return value.toString();
}

export function extractAuthoritativeFinanceFacts(
  toolResult: ToolResult
): AuthoritativeFinanceFacts | null {
  const validated = validateToolResult(toolResult);
  if (validated.ok === false || validated.value.status !== "ok") {
    return null;
  }
  if (validated.value.toolName !== "finance.calculate" || !validated.value.data) {
    return null;
  }
  const data = validated.value.data;
  if (
    data.priceSource !== "inventory" ||
    data.calculationMode !== "listing-bound" ||
    data.interestMethod !== "flat" ||
    data.currency !== "THB" ||
    data.isEstimate !== true ||
    data.quotationStatus !== "not-quotation" ||
    data.vatStatus !== "not-calculated" ||
    data.additionalChargesStatus !== "not-calculated"
  ) {
    return null;
  }
  const numericFields = [
    data.vehiclePrice,
    data.downPaymentBaht,
    data.downPaymentPercent,
    data.loanAmount,
    data.annualInterestRatePercent,
    data.termMonths,
    data.totalInterest,
    data.monthlyPayment,
    data.totalPayable,
  ];
  if (numericFields.some((value) => !Number.isFinite(value))) {
    return null;
  }
  return {
    listingId: data.listingId,
    vehiclePrice: data.vehiclePrice,
    priceSource: data.priceSource,
    calculationMode: data.calculationMode,
    downPaymentBaht: data.downPaymentBaht,
    downPaymentPercent: data.downPaymentPercent,
    loanAmount: data.loanAmount,
    annualInterestRatePercent: data.annualInterestRatePercent,
    interestMethod: data.interestMethod,
    termMonths: data.termMonths,
    totalInterest: data.totalInterest,
    monthlyPayment: data.monthlyPayment,
    totalPayable: data.totalPayable,
    currency: data.currency,
    isEstimate: data.isEstimate,
    quotationStatus: data.quotationStatus,
    vatStatus: data.vatStatus,
    additionalChargesStatus: data.additionalChargesStatus,
  };
}

export function buildConversationCoreFinanceGroundedAnswer(
  data: FinanceCalculateToolData
): string {
  try {
    return [
      `ประมาณการค่างวดสำหรับ ${data.listingId}:`,
      `ราคารถ ${formatIntegerMoney(data.vehiclePrice)} บาท`,
      `เงินดาวน์ ${formatIntegerMoney(data.downPaymentBaht)} บาท (${formatPercent(data.downPaymentPercent)}%)`,
      `ยอดจัด ${formatIntegerMoney(data.loanAmount)} บาท`,
      `ดอกเบี้ย ${formatRate(data.annualInterestRatePercent)}% ต่อปี (flat)`,
      `ระยะเวลา ${data.termMonths} เดือน`,
      `ดอกเบี้ยรวม ${formatIntegerMoney(data.totalInterest)} บาท`,
      `ค่างวด ${formatIntegerMoney(data.monthlyPayment)} บาท`,
      `ยอดรวม ${formatIntegerMoney(data.totalPayable)} บาท`,
      "เป็นการประมาณการเท่านั้น ไม่ใช่ใบเสนอราคา VAT ยังไม่ได้คำนวณ ค่าใช้จ่ายเพิ่มเติมยังไม่ได้คำนวณ",
    ].join(" ");
  } catch {
    return CONVERSATION_CORE_FINANCE_GROUNDING_FALLBACK_TEXT;
  }
}

function parseIntegerAmount(raw: string): number | null {
  const parsed = parseConversationCoreIntegerToken(raw);
  if (parsed.ok === false) {
    return null;
  }
  return parsed.value.value;
}

function parseDecimalRate(raw: string): number | null {
  const normalized = normalizeConversationCoreDigits(raw.trim());
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    return null;
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

interface ParsedFinanceAnswer {
  readonly listingId: string;
  readonly money: Partial<Record<MoneyFieldKey, number>>;
  readonly downPaymentPercent?: number;
  readonly interestRatePercent?: number;
  readonly interestMethod?: string;
  readonly termMonths?: number;
}

function parseMoneyFields(text: string): Partial<Record<MoneyFieldKey, number>> | null {
  const money: Partial<Record<MoneyFieldKey, number>> = {};
  for (const [field, pattern] of Object.entries(MONEY_FIELD_LABELS) as Array<
    [MoneyFieldKey, RegExp]
  >) {
    const match = text.match(pattern);
    if (!match) {
      continue;
    }
    const amount = parseIntegerAmount(match[1] ?? "");
    if (amount === null) {
      return null;
    }
    money[field] = amount;
  }
  return money;
}

function parseFinanceAnswer(text: string): ParsedFinanceAnswer | null {
  const normalized = collapseWhitespace(text);
  const headerMatch = normalized.match(/^ประมาณการค่างวดสำหรับ\s+(\S+):\s+(.+)$/u);
  if (!headerMatch) {
    return null;
  }

  const listingId = headerMatch[1] ?? "";
  const body = headerMatch[2] ?? "";
  const money = parseMoneyFields(body);
  if (money === null) {
    return null;
  }

  const downPaymentPercentMatch = body.match(/\(([\d.]+)\s*%\)/u);
  const downPaymentPercent = downPaymentPercentMatch
    ? parseDecimalRate(downPaymentPercentMatch[1] ?? "")
    : null;
  if (downPaymentPercentMatch && downPaymentPercent === null) {
    return null;
  }

  const interestMatch = body.match(/ดอกเบี้ย\s+([\d.]+)\s*%\s*ต่อปี\s*\(([^)]+)\)/u);
  const interestRatePercent = interestMatch
    ? parseDecimalRate(interestMatch[1] ?? "")
    : null;
  if (interestMatch && interestRatePercent === null) {
    return null;
  }
  const interestMethod = interestMatch?.[2]?.trim().toLowerCase();

  let termMonths: number | undefined;
  const monthsMatch = body.match(/ระยะเวลา\s+([\d,๐-๙]+)\s*เดือน/u);
  if (monthsMatch) {
    const parsedMonths = parseIntegerAmount(monthsMatch[1] ?? "");
    if (parsedMonths === null) {
      return null;
    }
    termMonths = parsedMonths;
  } else {
    const yearsMatch = body.match(/ระยะเวลา\s+([\d,๐-๙]+)\s*ปี/u);
    if (yearsMatch) {
      const years = parseIntegerAmount(yearsMatch[1] ?? "");
      if (years === null) {
        return null;
      }
      termMonths = years * 12;
    }
  }

  const disclaimerTail =
    "เป็นการประมาณการเท่านั้น ไม่ใช่ใบเสนอราคา VAT ยังไม่ได้คำนวณ ค่าใช้จ่ายเพิ่มเติมยังไม่ได้คำนวณ";
  if (!body.endsWith(disclaimerTail)) {
    return null;
  }

  const bodyWithoutDisclaimer = body.slice(0, body.length - disclaimerTail.length).trim();
  const consumedPattern = new RegExp(
    [
      "ราคารถ\\s*(?:฿\\s*)?[\\d,๐-๙]+\\s*บาท",
      "เงินดาวน์\\s*(?:฿\\s*)?[\\d,๐-๙]+\\s*บาท\\s*\\([\\d.]+%\\)",
      "ยอดจัด\\s*(?:฿\\s*)?[\\d,๐-๙]+\\s*บาท",
      "ดอกเบี้ย\\s+[\\d.]+%\\s*ต่อปี\\s*\\([^)]+\\)",
      "ระยะเวลา\\s+[\\d,๐-๙]+\\s*(?:เดือน|ปี)",
      "ดอกเบี้ยรวม\\s*(?:฿\\s*)?[\\d,๐-๙]+\\s*บาท",
      "ค่างวด\\s*(?:฿\\s*)?[\\d,๐-๙]+\\s*บาท",
      "ยอดรวม\\s*(?:฿\\s*)?[\\d,๐-๙]+\\s*บาท",
    ].join("\\s+"),
    "u"
  );
  const consumedMatch = bodyWithoutDisclaimer.match(consumedPattern);
  if (!consumedMatch || bodyWithoutDisclaimer.slice(consumedMatch[0].length).trim() !== "") {
    return null;
  }

  return {
    listingId,
    money,
    downPaymentPercent: downPaymentPercent ?? undefined,
    interestRatePercent: interestRatePercent ?? undefined,
    interestMethod,
    termMonths,
  };
}

function hasRequiredDisclaimers(text: string): boolean {
  return (
    /เป็นการประมาณการเท่านั้น/u.test(text) &&
    /ไม่ใช่ใบเสนอราคา/u.test(text) &&
    /VAT\s+ยังไม่ได้คำนวณ/u.test(text) &&
    /ค่าใช้จ่ายเพิ่มเติมยังไม่ได้คำนวณ/u.test(text)
  );
}

function hasPositiveQuotationClaim(text: string): boolean {
  return (
    /(?:เป็น|นี่คือ|ถือเป็น)\s*ใบเสนอราคา/u.test(text) ||
    /ใบเสนอราคาอย่างเป็นทางการ/u.test(text)
  );
}

function hasPositiveVatClaim(text: string): boolean {
  if (/รวม\s+VAT\s*แล้ว/u.test(text)) {
    return true;
  }
  if (/VAT\s*7\s*%/u.test(text)) {
    return true;
  }
  if (/VAT\s+เท่ากับ\s*[\d,๐-๙]+/u.test(text)) {
    return true;
  }
  if (/บวก\s+VAT/u.test(text)) {
    return true;
  }
  return false;
}

function hasAdditionalChargeClaim(text: string): boolean {
  if (/ค่าใช้จ่ายเพิ่มเติมยังไม่ได้คำนวณ/u.test(text)) {
    // allowed disclaimer
  }
  const patterns = [
    /รวมค่าธรรมเนียม/u,
    /ค่าโอน/u,
    /ค่าจดทะเบียน/u,
    /เบี้ยประกัน/u,
    /ค่าเอกสาร/u,
    /ค่าดำเนินการ/u,
    /รวมค่าใช้จ่ายทั้งหมดแล้ว/u,
    /all[-\s]?inclusive/u,
  ];
  return patterns.some((pattern) => pattern.test(text));
}

function hasApprovalClaim(text: string): boolean {
  const patterns = [
    /อนุมัติแล้ว/u,
    /อนุมัติสินเชื่อ/u,
    /ผ่านไฟแนนซ์แน่นอน/u,
    /รับรองอนุมัติ/u,
    /ไม่ต้องตรวจเครดิต/u,
    /ดอกเบี้ยนี้ได้รับการอนุมัติแล้ว/u,
    /(?:bank|dealer)\s+confirmed/iu,
    /เครดิตผ่านแน่นอน/u,
    /ยืนยัน(?:แล้ว|อนุมัติ)/u,
    /ยอด(?:นี้|สุดท้าย)?\s*ยืนยันแล้ว/u,
    /final amount/iu,
    /guaranteed installment/iu,
  ];
  return patterns.some((pattern) => pattern.test(text));
}

function hasVehicleFactClaim(text: string): boolean {
  const patterns = [
    /(?:ปี|รุ่นปี)\s*[\d,๐-๙]{4}/u,
    /(?:ไมล์|เลขไมล์)/u,
    /(?:สภาพ|สี|เบนซิน|ดีเซล|เกียร์)/u,
    /(?:ไม่เคยชน|น้ำท่วม|เจ้าของเดิม)/u,
  ];
  return patterns.some((pattern) => pattern.test(text));
}

function validateNumericPolicy(text: string): RejectResult | null {
  if (conversationCoreTextHasScaledAmountUnit(text)) {
    return reject("finance_unaccounted_numeric_claim");
  }
  if (conversationCoreTextHasNumericRange(text)) {
    return reject("finance_unaccounted_numeric_claim");
  }
  return null;
}

function ratesWithinTolerance(left: number, right: number): boolean {
  return Math.abs(left - right) <= INTEREST_RATE_TOLERANCE_PERCENT;
}

function validateParsedFinanceAnswer(
  parsed: ParsedFinanceAnswer,
  facts: AuthoritativeFinanceFacts,
  normalizedInput: string
): ConversationCoreFinanceGroundingResult {
  if (parsed.listingId !== facts.listingId) {
    return reject("finance_metadata_mismatch");
  }

  const requiredMoneyFields: MoneyFieldKey[] = [
    "vehiclePrice",
    "downPaymentBaht",
    "loanAmount",
    "totalInterest",
    "monthlyPayment",
    "totalPayable",
  ];
  for (const field of requiredMoneyFields) {
    const parsedValue = parsed.money[field];
    if (parsedValue === undefined) {
      return reject("finance_unsupported_prose_shape");
    }
    if (parsedValue !== facts[field]) {
      const matchingOtherField = requiredMoneyFields.find(
        (otherField) => otherField !== field && facts[otherField] === parsedValue
      );
      if (matchingOtherField) {
        return reject("finance_role_mismatch");
      }
      return reject("finance_value_mismatch");
    }
  }

  if (parsed.downPaymentPercent !== facts.downPaymentPercent) {
    return reject("finance_value_mismatch");
  }
  if (
    parsed.interestRatePercent === undefined ||
    !ratesWithinTolerance(parsed.interestRatePercent, facts.annualInterestRatePercent)
  ) {
    return reject("finance_interest_rate_mismatch");
  }
  if (parsed.interestMethod !== "flat") {
    return reject("finance_interest_method_mismatch");
  }
  if (parsed.termMonths !== facts.termMonths) {
    return reject("finance_term_mismatch");
  }

  return { ok: true, assistantText: collapseWhitespace(normalizedInput) };
}

export function validateConversationCoreFinanceGrounding(
  input: ConversationCoreFinanceGroundingInput
): ConversationCoreFinanceGroundingResult {
  const assistantText = String(input.assistantText ?? "").trim();
  if (!assistantText) {
    return reject("finance_unsupported_prose_shape");
  }

  const validated = validateToolResult(input.toolResult);
  if (validated.ok === false) {
    return reject("invalid_tool_result");
  }
  if (validated.value.status !== "ok") {
    return reject("tool_result_not_ok");
  }
  if (validated.value.toolName !== "finance.calculate" || !validated.value.data) {
    return reject("finance_metadata_mismatch");
  }

  const facts = extractAuthoritativeFinanceFacts(validated.value);
  if (!facts) {
    return reject("finance_metadata_mismatch");
  }

  const normalized = collapseWhitespace(assistantText);

  const numericPolicy = validateNumericPolicy(assistantText);
  if (numericPolicy) {
    return numericPolicy;
  }

  if (hasPositiveQuotationClaim(normalized)) {
    return reject("finance_quotation_claim");
  }
  if (hasPositiveVatClaim(normalized)) {
    return reject("finance_vat_claim");
  }
  if (hasAdditionalChargeClaim(normalized)) {
    return reject("finance_additional_charge_claim");
  }
  if (hasApprovalClaim(normalized)) {
    return reject("finance_approval_claim");
  }
  if (hasVehicleFactClaim(normalized)) {
    return reject("finance_unsupported_prose_shape");
  }

  const hasFinanceHeader = /^ประมาณการค่างวดสำหรับ\s+\S+:/u.test(normalized);
  if (hasFinanceHeader && !hasRequiredDisclaimers(normalized)) {
    return reject("finance_missing_disclaimer");
  }

  const parsed = parseFinanceAnswer(normalized);
  if (!parsed) {
    return reject("finance_unsupported_prose_shape");
  }

  try {
    buildConversationCoreFinanceGroundedAnswer(validated.value.data);
  } catch {
    return reject("finance_precision_loss");
  }

  return validateParsedFinanceAnswer(parsed, facts, normalized);
}
