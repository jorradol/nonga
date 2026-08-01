/** v5.4.6.3 — deterministic finance calculator in buyer chat (no Gemini) */

import {
  calculateFlatRateFinance,
  compareFlatRateTerms,
  estimateCarPriceFromMaxMonthly,
  formatBaht,
  STANDARD_FINANCE_TERMS_MONTHS,
  type FinanceCalcResult,
} from "../../../utils/financeCalculator";
import { detectBuyerAdvisorTopic } from "./chatBuyerAdvisorTemplates";

export const CHAT_FINANCE_DISCLAIMER =
  "ตัวเลขนี้เป็นการประเมินเบื้องต้น ไม่ใช่ผลอนุมัติไฟแนนซ์ — เงื่อนไขจริงขึ้นกับสถาบันการเงิน รายได้ เอกสาร และเงื่อนไขผู้ให้สินเชื่อครับ";

export interface BuyerFinanceCalculatorReply {
  text: string;
  skipGemini: true;
}

/** Optional trusted inventory list price for the active selected car (baht). */
export interface BuyerFinanceCalculatorOptions {
  trustedSelectedCarPrice?: number;
}

export interface ParsedFinanceQuery {
  carPrice?: number;
  downPaymentBaht?: number;
  downPaymentPercent?: number;
  annualFlatRatePercent?: number;
  termMonths?: number;
  compareTermMonths?: number[];
  maxMonthlyBaht?: number;
  mode: "installment" | "compare" | "downOnly" | "maxPrice";
}

function normalizeFinanceMessage(message: string): string {
  return message.trim().replace(/\s+/g, " ");
}

function parseDigits(raw: string): number {
  return Number(String(raw).replace(/,/g, ""));
}

function parseThaiScaledAmount(
  value: string,
  unit?: string
): number {
  let n = parseDigits(value);
  if (unit && /แสน/i.test(unit)) n *= 100_000;
  else if (unit && /ล้าน|ล\.|million/i.test(unit)) n *= 1_000_000;
  return n;
}

function extractCarPrice(text: string): number | undefined {
  const labeled =
    text.match(
      /(?:ราคารถ|รถราคา|ราคา)\s*([\d,]+(?:\.\d+)?)\s*(แสน|ล้าน|ล\.|million)?\s*(?:บาท|฿)?/i
    ) ??
    text.match(
      /รถ\s*([\d,]+(?:\.\d+)?)\s*(แสน|ล้าน|ล\.|million)?\s*(?:บาท|฿)?/i
    );
  if (labeled) {
    const n = parseThaiScaledAmount(labeled[1], labeled[2]);
    if (n >= 10_000) return Math.round(n);
  }

  const scaled = text.match(/([\d,]+(?:\.\d+)?)\s*(แสน|ล้าน|ล\.|million)/i);
  if (scaled) {
    const n = parseThaiScaledAmount(scaled[1], scaled[2]);
    if (n >= 10_000) return Math.round(n);
  }

  const plain = [...text.matchAll(/([\d,]{5,})(?:\s*(?:บาท|฿))?/gi)];
  for (const m of plain) {
    const n = parseDigits(m[1]);
    if (n >= 10_000) return Math.round(n);
  }
  return undefined;
}

function extractDownPayment(
  text: string,
  carPrice?: number
): { downPaymentBaht?: number; downPaymentPercent?: number } {
  const pct =
    text.match(/ดาวน์\s*([\d.]+)\s*(?:%|เปอร์(?:เซ็นต์)?|percent)/i) ??
    text.match(/([\d.]+)\s*%\s*(?:ดาวน์|เงินดาวน์)/i);
  if (pct) {
    const p = Number(pct[1]);
    if (p >= 0 && p <= 100) return { downPaymentPercent: p };
  }

  const baht = text.match(/ดาวน์\s*([\d,]+(?:\.\d+)?)\s*(?:บาท|฿)?/i);
  if (baht) {
    const n = parseDigits(baht[1]);
    if (n > 0) return { downPaymentBaht: Math.round(n) };
  }

  if (carPrice && /ดาวน์\s*([\d.]+)(?!\s*%)/i.test(text)) {
    const m = text.match(/ดาวน์\s*([\d.]+)(?!\s*%)/i);
    if (m) {
      const n = Number(m[1]);
      if (n > 0 && n <= 100) return { downPaymentPercent: n };
      if (n >= 1_000) return { downPaymentBaht: Math.round(n) };
    }
  }

  return {};
}

function extractAnnualRate(text: string): number | undefined {
  const m =
    text.match(/ดอก(?:เบี้ย)?\s*(?:flat\s*)?([\d.]+)\s*%?/i) ??
    text.match(/([\d.]+)\s*%\s*(?:ต่อปี|flat(?:\s*rate)?)/i);
  if (!m) return undefined;
  const rate = Number(m[1]);
  if (rate > 0 && rate <= 30) return rate;
  return undefined;
}

function extractTermMonths(text: string): number | undefined {
  const m =
    text.match(/(?:ผ่อน|ระยะ|งวด)\s*(\d{2,3})\s*(?:เดือน|งวด)?/i) ??
    text.match(/(\d{2,3})\s*(?:เดือน|งวด)/i);
  if (!m) return undefined;
  const months = Number(m[1]);
  if (months >= 12 && months <= 120) return months;
  return undefined;
}

function extractCompareTerms(text: string): number[] {
  const found = new Set<number>();
  for (const m of text.matchAll(/\b(48|60|72|84)\b/g)) {
    found.add(Number(m[1]));
  }
  const list = [...found].sort((a, b) => a - b);
  return list.length >= 2 ? list : [];
}

function extractMaxMonthly(text: string): number | undefined {
  const m =
    text.match(
      /(?:งวด|เดือน)(?:ละ)?\s*(?:ไม่เกิน|ไม่เกิ|<=|สูงสุด)\s*([\d,]+)/i
    ) ??
    text.match(/ผ่อน(?:เดือน)?ละ\s*(?:ไม่เกิน|ไม่เกิ)\s*([\d,]+)/i) ??
    text.match(/ค่างวด(?:ไม่เกิน|ไม่เกิ)\s*([\d,]+)/i);
  if (!m) return undefined;
  const n = parseDigits(m[1]);
  return n > 0 ? Math.round(n) : undefined;
}

const DOWN_PAYMENT_ADVICE_ONLY =
  /ดาวน์(?:เท่าไหร่|กี่เปอร์|กี่%|เท่าไร)(?:ดี|เหมาะ|ควร)/i;

const FINANCE_PREP =
  /ไฟแนนซ์(?:ต้อง|ควร)เตรียม|จัดไฟแนนซ์(?:ต้อง|ควร)เตรียม|เตรียม(?:เอกสาร|อะไร).*ไฟแนนซ์/i;

/** Real vehicle-history cues — must not steal the finance path. */
const HISTORY_NOT_FINANCE =
  /ชน|อุบัติเหตุ|น้ำท่วม|เคลม|เข้าศูนย์|ประวัติ(?:ซ่อม|เคลม|ชน|น้ำท่วม)/i;

function resolveTrustedSelectedCarPrice(
  options?: BuyerFinanceCalculatorOptions
): number | undefined {
  const n = options?.trustedSelectedCarPrice;
  if (n == null || !Number.isFinite(n)) return undefined;
  const rounded = Math.round(n);
  return rounded >= 10_000 ? rounded : undefined;
}

/**
 * Selected-car / installment finance cues (may omit price when a trusted
 * selected listing price is supplied by the orchestrator).
 */
export function isSelectedCarFinanceIntent(message: string): boolean {
  const t = normalizeFinanceMessage(message);
  if (!t) return false;
  if (FINANCE_PREP.test(t)) return false;
  if (HISTORY_NOT_FINANCE.test(t)) return false;
  const advisor = detectBuyerAdvisorTopic(t);
  if (
    advisor === "cashVsFinance" ||
    advisor === "financePrep" ||
    advisor === "monthlyBudget" ||
    advisor === "downPayment"
  ) {
    return false;
  }
  if (DOWN_PAYMENT_ADVICE_ONLY.test(t) && !/ผ่อน|ดอก|ค่างวด|คำนวณ|เปรียบเทียบ/i.test(t)) {
    return false;
  }
  if (/ผ่อน|ค่างวด|ยอดจัด|จัดไฟแนนซ์|ไฟแนนซ์/i.test(t)) return true;
  if (/ดาวน์/.test(t) && /ผ่อน|เดือน|งวด|ค่างวด/i.test(t)) return true;
  return false;
}

export function isFinanceCalculatorIntent(
  message: string,
  options?: BuyerFinanceCalculatorOptions
): boolean {
  const t = normalizeFinanceMessage(message);
  if (!t) return false;
  if (FINANCE_PREP.test(t)) return false;
  if (detectBuyerAdvisorTopic(t) === "cashVsFinance") return false;
  if (DOWN_PAYMENT_ADVICE_ONLY.test(t) && !/ผ่อน|ดอก|ค่างวด|คำนวณ|เปรียบเทียบ/i.test(t)) {
    return false;
  }

  const trustedPrice = resolveTrustedSelectedCarPrice(options);
  const compareTerms = extractCompareTerms(t);
  const hasCompare =
    compareTerms.length >= 2 ||
    (/เปรียบเทียบ|ต่างกัน/.test(t) && /\b(48|60|72|84)\b/.test(t));
  const hasMaxMonthly = extractMaxMonthly(t) != null;
  const hasPrice = extractCarPrice(t) != null || trustedPrice != null;
  const downOnly =
    hasPrice &&
    /ดาวน์/.test(t) &&
    /(?:ใช้เงิน|เท่าไหร่|กี่บาท|ต้องจ่าย)/i.test(t) &&
    !/ผ่อน(?:เท่าไหร่|เท่าไร)/i.test(t);
  const calcSignals =
    /ผ่อน(?:เท่าไหร่|เท่าไร|กี่บาท)?|ค่างวด|คำนวณ|ยอดจัด|ดอก(?:เบี้ย)?/i.test(t);

  if (hasCompare && hasPrice) return true;
  if (hasMaxMonthly) return true;
  if (downOnly) return true;
  if (hasPrice && calcSignals) return true;
  if (calcSignals && /ดาวน์|ไฟแนนซ์|จัดไฟแนนซ์/i.test(t) && hasPrice) {
    return true;
  }
  // Selected listing price + finance cue (e.g. คันนี้ผ่อน / คันนี้จัดไฟแนนซ์ได้ไหม)
  if (trustedPrice != null && isSelectedCarFinanceIntent(t)) return true;
  return false;
}

export function parseFinanceQuery(
  message: string,
  options?: BuyerFinanceCalculatorOptions
): ParsedFinanceQuery | null {
  if (!isFinanceCalculatorIntent(message, options)) return null;
  const t = normalizeFinanceMessage(message);
  // Explicit price in the message wins; otherwise use trusted selected inventory.
  const carPrice =
    extractCarPrice(t) ?? resolveTrustedSelectedCarPrice(options);
  const down = extractDownPayment(t, carPrice);
  const annualFlatRatePercent = extractAnnualRate(t);
  const termMonths = extractTermMonths(t);
  const compareTermMonths = extractCompareTerms(t);
  const maxMonthlyBaht = extractMaxMonthly(t);

  if (maxMonthlyBaht != null) {
    return {
      mode: "maxPrice",
      maxMonthlyBaht,
      carPrice,
      ...down,
      annualFlatRatePercent,
      termMonths,
    };
  }

  if (
    carPrice &&
    (down.downPaymentBaht != null || down.downPaymentPercent != null) &&
    /(?:ใช้เงิน|เท่าไหร่|กี่บาท|ต้องจ่าย)/i.test(t) &&
    !/ผ่อน(?:เท่าไหร่|เท่าไร)/i.test(t) &&
    compareTermMonths.length === 0
  ) {
    return {
      mode: "downOnly",
      carPrice,
      ...down,
      annualFlatRatePercent,
      termMonths,
    };
  }

  if (
    compareTermMonths.length >= 2 &&
    (/เปรียบเทียบ|ต่างกัน|ต่างกันเท่าไหร่/i.test(t) ||
      compareTermMonths.length >= 3)
  ) {
    return {
      mode: "compare",
      carPrice,
      ...down,
      annualFlatRatePercent,
      termMonths,
      compareTermMonths,
    };
  }

  return {
    mode: "installment",
    carPrice,
    ...down,
    annualFlatRatePercent,
    termMonths,
    compareTermMonths,
  };
}

function buildMissingFieldsFollowUp(
  missing: string[],
  knownPrice?: number
): string {
  const hints: string[] = [];
  if (missing.includes("price")) {
    hints.push("ราคารถที่อยากลองคำนวณ (เช่น 500,000 บาท)");
  }
  if (missing.includes("down")) {
    hints.push("เงินดาวน์เป็นบาทหรือเปอร์เซ็นต์ (เช่น ดาวน์ 20% หรือ ดาวน์ 100,000)");
  }
  if (missing.includes("term")) {
    hints.push("ระยะผ่อนกี่เดือน (เช่น 60 เดือน)");
  }
  if (missing.includes("rate")) {
    hints.push("อัตราดอกเบี้ย flat ต่อปี (เช่น ดอก 5%)");
  }
  const lines = [
    "ได้ครับคุณพี่ น้องเอช่วยคำนวณค่างวดเบื้องต้นให้ได้ครับ",
  ];
  if (
    knownPrice != null &&
    knownPrice >= 10_000 &&
    !missing.includes("price")
  ) {
    lines.push(`จากราคารถในระบบ ${formatBaht(knownPrice)}`);
  }
  lines.push(`ขอ${hints.join(" ")} และ "ดอกเบี้ย %" ด้วยนะครับ`);
  lines.push(
    missing.includes("price")
      ? "ตัวอย่าง: รถราคา 500,000 ดาวน์ 20% ผ่อน 60 เดือน ดอก 5%"
      : "ตัวอย่าง: ดาวน์ 20% ผ่อน 60 เดือน ดอก 5%"
  );
  lines.push(CHAT_FINANCE_DISCLAIMER);
  return lines.join("\n");
}

function formatPercentDown(carPrice: number, downBaht: number): string {
  const pct = carPrice > 0 ? Math.round((downBaht / carPrice) * 1000) / 10 : 0;
  return `${formatBaht(downBaht)} (${pct}%)`;
}

function formatSingleResult(result: FinanceCalcResult): string[] {
  const downLine =
    result.downPaymentBaht > 0
      ? `เงินดาวน์ ${formatBaht(result.downPaymentBaht)}`
      : "ไม่ระบุเงินดาวน์ (ยอดจัดเต็มราคารถ)";
  return [
    `ราคารถ ${formatBaht(result.carPrice)}`,
    downLine,
    `ยอดจัดประมาณ ${formatBaht(result.loanAmount)}`,
    `ดอกเบี้ย flat ${result.annualFlatRatePercent}% ต่อปี ระยะ ${result.termMonths} เดือน`,
    `ดอกเบี้ยรวมโดยประมาณ ${formatBaht(result.totalInterest)}`,
    `ยอดรวมที่ต้องผ่อนประมาณ ${formatBaht(result.totalRepayment)}`,
    `ค่างวดโดยประมาณ ${formatBaht(result.monthlyInstallment)}/เดือน`,
  ];
}

function buildInstallmentReply(parsed: ParsedFinanceQuery): string | null {
  const missing: string[] = [];
  if (!parsed.carPrice) missing.push("price");
  if (parsed.downPaymentBaht == null && parsed.downPaymentPercent == null) {
    missing.push("down");
  }
  if (!parsed.termMonths) missing.push("term");
  if (parsed.annualFlatRatePercent == null) missing.push("rate");
  if (missing.length > 0) {
    return buildMissingFieldsFollowUp(missing, parsed.carPrice);
  }

  const result = calculateFlatRateFinance({
    carPrice: parsed.carPrice!,
    downPaymentBaht: parsed.downPaymentBaht,
    downPaymentPercent: parsed.downPaymentPercent,
    annualFlatRatePercent: parsed.annualFlatRatePercent!,
    termMonths: parsed.termMonths!,
  });

  return [
    "คำนวณเบื้องต้นให้นะครับคุณพี่",
    ...formatSingleResult(result),
    CHAT_FINANCE_DISCLAIMER,
  ].join("\n");
}

function buildCompareReply(parsed: ParsedFinanceQuery): string | null {
  const missing: string[] = [];
  if (!parsed.carPrice) missing.push("price");
  if (parsed.downPaymentBaht == null && parsed.downPaymentPercent == null) {
    missing.push("down");
  }
  if (parsed.annualFlatRatePercent == null) missing.push("rate");
  if (missing.length > 0) {
    return buildMissingFieldsFollowUp(missing, parsed.carPrice);
  }

  const terms = parsed.compareTermMonths ?? [];
  const results = compareFlatRateTerms(
    {
      carPrice: parsed.carPrice!,
      downPaymentBaht: parsed.downPaymentBaht,
      downPaymentPercent: parsed.downPaymentPercent,
      annualFlatRatePercent: parsed.annualFlatRatePercent!,
    },
    terms
  );

  const lines = results.map(
    (r) =>
      `• ${r.termMonths} เดือน: ประมาณ ${formatBaht(r.monthlyInstallment)}/เดือน (รวมผ่อนประมาณ ${formatBaht(r.totalRepayment)})`
  );

  return [
    "คำนวณเปรียบเทียบเบื้องต้นให้นะครับคุณพี่",
    `ราคารถ ${formatBaht(parsed.carPrice!)} ดอกเบี้ย flat ${parsed.annualFlatRatePercent}% ต่อปี`,
    ...lines,
    CHAT_FINANCE_DISCLAIMER,
  ].join("\n");
}

function buildDownOnlyReply(parsed: ParsedFinanceQuery): string | null {
  if (!parsed.carPrice) return buildMissingFieldsFollowUp(["price", "down"]);
  if (parsed.downPaymentBaht == null && parsed.downPaymentPercent == null) {
    return buildMissingFieldsFollowUp(["down"]);
  }

  const { downPaymentBaht } = calculateFlatRateFinance({
    carPrice: parsed.carPrice,
    downPaymentBaht: parsed.downPaymentBaht,
    downPaymentPercent: parsed.downPaymentPercent,
    annualFlatRatePercent: 0,
    termMonths: 60,
  });

  return [
    "คำนวณเงินดาวน์เบื้องต้นให้นะครับคุณพี่",
    `ราคารถ ${formatBaht(parsed.carPrice)}`,
    `เงินดาวน์ประมาณ ${formatPercentDown(parsed.carPrice, downPaymentBaht)}`,
    `ยอดจัดประมาณ ${formatBaht(parsed.carPrice - downPaymentBaht)}`,
    CHAT_FINANCE_DISCLAIMER,
    "ถ้าอยากรู้ค่างวด บอกระยะผ่อนกับดอกเบี้ย % มาได้ครับ เช่น ผ่อน 60 เดือน ดอก 5%",
  ].join("\n");
}

function buildMaxPriceReply(parsed: ParsedFinanceQuery): string | null {
  const missing: string[] = [];
  if (!parsed.maxMonthlyBaht) missing.push("term");
  if (!parsed.termMonths) missing.push("term");
  if (parsed.annualFlatRatePercent == null) missing.push("rate");
  if (parsed.downPaymentBaht == null && parsed.downPaymentPercent == null) {
    missing.push("down");
  }
  if (missing.length > 0) {
    return [
      "ได้ครับคุณพี่ ถ้าอยากประเมินว่าควรดูรถราคาประมาณเท่าไหร่จากค่างวดที่สบาย",
      "ช่วยบอก ค่างวดสูงสุดต่อเดือน ระยะผ่อน (เช่น 60 เดือน) ดอกเบี้ย % และเงินดาวน์ที่คิดจะใส่ด้วยนะครับ",
      "ตัวอย่าง: ผ่อนเดือนละไม่เกิน 10,000 ผ่อน 60 เดือน ดาวน์ 20% ดอก 5%",
      CHAT_FINANCE_DISCLAIMER,
    ].join("\n");
  }

  const estimated = estimateCarPriceFromMaxMonthly({
    maxMonthlyBaht: parsed.maxMonthlyBaht!,
    termMonths: parsed.termMonths!,
    annualFlatRatePercent: parsed.annualFlatRatePercent!,
    downPaymentBaht: parsed.downPaymentBaht,
    downPaymentPercent: parsed.downPaymentPercent,
  });

  if (estimated == null) {
    return [
      "ขออภัยครับคุณพี่ ยังประเมินจากตัวเลขที่ให้มาไม่ได้ชัดเจน",
      "ลองระบุค่างวมสูงสุด ระยะผ่อน ดอก % และเงินดาวน์ใหม่ได้ครับ",
      CHAT_FINANCE_DISCLAIMER,
    ].join("\n");
  }

  return [
    "ประเมินเบื้องต้นจากค่างวดที่สบายนะครับคุณพี่",
    `ค่างวดไม่เกิน ${formatBaht(parsed.maxMonthlyBaht!)}/เดือน ระยะ ${parsed.termMonths} เดือน ดอก flat ${parsed.annualFlatRatePercent}%`,
    `ราคารถโดยประมาณที่ลองได้อยู่ที่ประมาณ ${formatBaht(estimated)} (ก่อนค่าใช้จ่ายอื่น)`,
    CHAT_FINANCE_DISCLAIMER,
    "ถ้าคุณพี่บอกยี่ห้อหรืองบที่สนใจ น้องเอช่วยค้นรถในระบบให้ได้ครับ",
  ].join("\n");
}

export function buildBuyerFinanceCalculatorReply(
  message: string,
  options?: BuyerFinanceCalculatorOptions
): string | null {
  const parsed = parseFinanceQuery(message, options);
  if (!parsed) return null;

  switch (parsed.mode) {
    case "compare":
      return buildCompareReply(parsed);
    case "downOnly":
      return buildDownOnlyReply(parsed);
    case "maxPrice":
      return buildMaxPriceReply(parsed);
    case "installment":
    default:
      if (parsed.compareTermMonths && parsed.compareTermMonths.length >= 2) {
        return buildCompareReply({
          ...parsed,
          mode: "compare",
          compareTermMonths: parsed.compareTermMonths,
        });
      }
      return buildInstallmentReply(parsed);
  }
}

export function tryBuyerFinanceCalculatorReply(
  message: string,
  options?: BuyerFinanceCalculatorOptions
): BuyerFinanceCalculatorReply | null {
  const text = buildBuyerFinanceCalculatorReply(message, options);
  if (!text) return null;
  return { text, skipGemini: true };
}
