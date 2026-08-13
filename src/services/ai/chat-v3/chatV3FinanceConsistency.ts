/**
 * WP-V3-14A — Lightweight finance consistency for Chat V.3.
 * Validates only critical trusted facts. Does not rewrite Gemini prose.
 * Correction, if needed, is a bounded Gemini pass (max 1) owned by the conversation service.
 */
import { formatBaht, type FinanceCalcResult } from "../../../utils/financeCalculator";
import { CHAT_V3_TRUSTED_CALCULATION_MARKER } from "./chatV3AutomotiveFinanceBlock";

export type ChatV3FinanceMismatchKind =
  | "installment"
  | "car_price"
  | "down_payment"
  | "loan_amount"
  | "interest_rate"
  | "term_months"
  | "detail_summary_conflict"
  | "credit_approval_claim";

export interface ChatV3FinanceMismatch {
  kind: ChatV3FinanceMismatchKind;
  expected?: number;
  actual?: number;
}

export interface ChatV3FinanceConsistencyResult {
  ok: boolean;
  mismatches: ChatV3FinanceMismatch[];
}

const CREDIT_APPROVAL_RE =
  /รับรองว่า(?:จะ)?(?:อนุมัติ|ได้สินเชื่อ)|การันตี(?:ว่า)?(?:อนุมัติ|ได้กู้)|อนุมัติสินเชื่อแล้ว|สินเชื่ออนุมัติแล้ว/;

function parseAmountToken(raw: string): number | undefined {
  const digits = String(raw).replace(/[^\d.]/g, "");
  if (!digits) return undefined;
  const n = Number(digits);
  if (!Number.isFinite(n)) return undefined;
  return Math.round(n);
}

function uniqueNumbers(values: number[]): number[] {
  return [...new Set(values)];
}

function extractLabeledAmounts(
  text: string,
  keyword: RegExp,
  options: { skipPercent?: boolean; skipMonths?: boolean; minValue?: number } = {}
): number[] {
  const amounts: number[] = [];
  const minValue = options.minValue ?? 0;
  const re = new RegExp(keyword.source, keyword.flags.includes("g") ? keyword.flags : `${keyword.flags}g`);
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const after = text.slice(match.index + match[0].length);
    if (options.skipPercent && /^\s*%/.test(after)) continue;
    if (options.skipMonths && /^\s*เดือน/.test(after)) continue;
    const token = match[1] ?? match[2];
    if (!token) continue;
    const n = parseAmountToken(token);
    if (n == null || n < minValue) continue;
    amounts.push(n);
  }
  return amounts;
}

function collectMismatchesForLabeled(
  kind: ChatV3FinanceMismatchKind,
  found: number[],
  expected: number
): ChatV3FinanceMismatch[] {
  if (found.length === 0) return [];
  const unique = uniqueNumbers(found);
  const mismatches: ChatV3FinanceMismatch[] = [];
  if (unique.length > 1) {
    mismatches.push({
      kind: "detail_summary_conflict",
      expected,
      actual: unique.find((value) => value !== expected) ?? unique[0],
    });
  }
  for (const value of unique) {
    if (value !== expected) {
      mismatches.push({ kind, expected, actual: value });
    }
  }
  return mismatches;
}

/**
 * Lightweight check of critical finance facts in Gemini's visible reply.
 * Absence of a number is not a failure — only conflicting labeled facts are.
 */
export function validateChatV3FinanceConsistency(
  assistantContent: string,
  trusted: FinanceCalcResult
): ChatV3FinanceConsistencyResult {
  const text = String(assistantContent ?? "");
  const mismatches: ChatV3FinanceMismatch[] = [];

  const installments = extractLabeledAmounts(
    text,
    /ค่างวด[^0-9]{0,40}([\d,]+)|ผ่อน(?:ประมาณ|เดือนละ|ละ)?[^0-9]{0,24}([\d,]+)/gi,
    { skipMonths: true, minValue: 500 }
  );
  mismatches.push(
    ...collectMismatchesForLabeled(
      "installment",
      installments,
      trusted.monthlyInstallment
    )
  );

  const prices = extractLabeledAmounts(
    text,
    /ราคารถ[^0-9]{0,24}([\d,]+)|รถราคา[^0-9]{0,24}([\d,]+)/gi,
    { minValue: 10_000 }
  );
  mismatches.push(
    ...collectMismatchesForLabeled("car_price", prices, trusted.carPrice)
  );

  const downs = extractLabeledAmounts(
    text,
    /(?:เงิน)?ดาวน์[^0-9%]{0,24}([\d,]+)/gi,
    { skipPercent: true, minValue: 1_000 }
  );
  mismatches.push(
    ...collectMismatchesForLabeled("down_payment", downs, trusted.downPaymentBaht)
  );

  const loans = extractLabeledAmounts(
    text,
    /ยอดจัด[^0-9]{0,24}([\d,]+)/gi,
    { minValue: 1_000 }
  );
  mismatches.push(
    ...collectMismatchesForLabeled("loan_amount", loans, trusted.loanAmount)
  );

  const rateMatch = text.match(/ดอกเบี้ย[^%]{0,32}([\d.]+)\s*%/);
  if (rateMatch) {
    const rate = Number(rateMatch[1]);
    if (Number.isFinite(rate) && Math.abs(rate - trusted.annualFlatRatePercent) > 0.05) {
      mismatches.push({
        kind: "interest_rate",
        expected: trusted.annualFlatRatePercent,
        actual: rate,
      });
    }
  }

  const termMatches = [...text.matchAll(/(\d{2,3})\s*เดือน/g)].map((match) =>
    Number(match[1])
  );
  const uniqueTerms = uniqueNumbers(termMatches.filter((n) => n >= 12 && n <= 120));
  if (
    uniqueTerms.length > 0 &&
    uniqueTerms.some((term) => term !== trusted.termMonths)
  ) {
    mismatches.push({
      kind: "term_months",
      expected: trusted.termMonths,
      actual: uniqueTerms.find((term) => term !== trusted.termMonths),
    });
  }

  if (CREDIT_APPROVAL_RE.test(text)) {
    mismatches.push({ kind: "credit_approval_claim" });
  }

  return { ok: mismatches.length === 0, mismatches };
}

export function buildChatV3FinanceCorrectionInstruction(input: {
  result: FinanceCalcResult;
  mismatches: ChatV3FinanceMismatch[];
}): string {
  const result = input.result;
  const mismatchNotes = input.mismatches
    .map((item) => {
      if (item.kind === "credit_approval_claim") {
        return "- พบถ้อยคำรับรองสินเชื่อ — ลบออก และห้ามรับรองการอนุมัติ";
      }
      if (item.expected != null && item.actual != null) {
        return `- ${item.kind}: ใช้ ${item.expected} ไม่ใช่ ${item.actual}`;
      }
      return `- ${item.kind}`;
    })
    .join("\n");

  return [
    `[${CHAT_V3_TRUSTED_CALCULATION_MARKER} — แก้เฉพาะตัวเลข]`,
    "คำตอบก่อนหน้ามีตัวเลขหรือถ้อยคำไม่ตรงกับผลการคำนวณที่ระบบยืนยันแล้ว",
    "คงน้ำเสียง โครง และความเป็นบทสนทนาเดิม — แก้เฉพาะจุดที่ผิด",
    "ใช้ตัวเลขต่อไปนี้เท่านั้น:",
    `- ราคารถ: ${formatBaht(result.carPrice)}`,
    `- เงินดาวน์: ${formatBaht(result.downPaymentBaht)}`,
    `- ยอดจัด: ${formatBaht(result.loanAmount)}`,
    `- ค่างวดประมาณการ: ${formatBaht(result.monthlyInstallment)} / เดือน`,
    `- อัตราดอกเบี้ย flat: ${result.annualFlatRatePercent}% ต่อปี`,
    `- จำนวนงวด: ${result.termMonths} เดือน`,
    "ตัวเลขนี้เป็นตัวอย่างสมมติสำหรับประเมินเบื้องต้น ไม่ใช่ดอกเบี้ยปัจจุบัน และไม่ใช่การอนุมัติสินเชื่อ",
    "ห้ามเปลี่ยนตัวเลขสำคัญ ห้ามรับรองสินเชื่อ ห้ามแต่งค่าธรรมเนียม",
    mismatchNotes ? `จุดที่ต้องแก้:\n${mismatchNotes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Exceptional user-visible notice when a correction pass still conflicts. */
export const CHAT_V3_FINANCE_RECALC_NOTICE =
  "ตัวเลขค่างวดในคำตอบยังไม่สอดคล้องกับผลการคำนวณที่ระบบยืนยันได้ จึงยังไม่แสดงตัวเลขชุดนั้นนะ ช่วยยืนยันราคารถ เงินดาวน์ อัตราดอกเบี้ย และระยะผ่อนอีกครั้ง แล้วให้น้องเอคำนวณใหม่ให้ชัด ๆ";

export const CHAT_V3_FINANCE_CONSISTENCY_PROVIDER_ID = "chat-v3-finance-consistency";
