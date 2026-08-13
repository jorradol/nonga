/**
 * WP-V3-10B — Deterministic finance assumption block for Chat V.3.
 * Reuses flat-rate math from financeCalculator. Does not invent missing inputs.
 */
import {
  calculateFlatRateFinance,
  formatBaht,
  type FinanceCalcResult,
} from "../../../utils/financeCalculator";

export type ChatV3FinanceBlockStatus =
  | "complete"
  | "incomplete"
  | "ambiguous_input"
  | "not_applicable";

export interface ChatV3FinanceParsedInputs {
  carPrice?: number;
  downPaymentBaht?: number;
  downPaymentPercent?: number;
  annualFlatRatePercent?: number;
  termMonths?: number;
  ambiguousDownPayment: boolean;
  ambiguousNotes: string[];
}

export interface ChatV3FinanceAssumptionBlock {
  status: ChatV3FinanceBlockStatus;
  inputs: ChatV3FinanceParsedInputs;
  missingFields: string[];
  result?: FinanceCalcResult;
  instructionText: string;
}

const FINANCE_CUE_RE =
  /ค่างวด|ผ่อน|ดาวน์|ไฟแนนซ์|สินเชื่อ|ดอกเบี้ย|ยอดจัด|คำนวณ(?:ค่างวด|ผ่อน)/i;

function parseDigits(raw: string): number {
  return Number(String(raw).replace(/,/g, ""));
}

function parseThaiScaledAmount(value: string, unit?: string): number {
  let n = parseDigits(value);
  if (!Number.isFinite(n)) return 0;
  if (unit && /แสน/i.test(unit)) n *= 100_000;
  else if (unit && /ล้าน|ล\.|million/i.test(unit)) n *= 1_000_000;
  return Math.round(n);
}

function extractCarPrice(text: string): number | undefined {
  const labeled =
    text.match(
      /(?:ราคารถ|รถราคา|ราคา|ยอดจัด)\s*([\d,]+(?:\.\d+)?)\s*(แสน|ล้าน|ล\.|million)?\s*(?:บาท|฿)?/i
    ) ??
    text.match(
      /รถ\s*([\d,]+(?:\.\d+)?)\s*(แสน|ล้าน|ล\.|million)\s*(?:บาท|฿)?/i
    );
  if (labeled) {
    const n = parseThaiScaledAmount(labeled[1], labeled[2]);
    if (n >= 10_000) return n;
  }
  const scaled = text.match(
    /([\d,]+(?:\.\d+)?)\s*(แสน|ล้าน|ล\.|million)\s*(?:บาท|฿)?/i
  );
  if (scaled && /ราคา|รถ|ผ่อน|ดาวน์|ค่างวด|ไฟแนนซ์/i.test(text)) {
    const n = parseThaiScaledAmount(scaled[1], scaled[2]);
    if (n >= 10_000) return n;
  }
  return undefined;
}

/**
 * Down payment parser — never silently treats bare "ดาวน์ 20" as percent or baht.
 */
function extractDownPayment(text: string): {
  downPaymentBaht?: number;
  downPaymentPercent?: number;
  ambiguousDownPayment: boolean;
  ambiguousNotes: string[];
} {
  const ambiguousNotes: string[] = [];
  const pct =
    text.match(/ดาวน์\s*([\d.]+)\s*(?:%|เปอร์(?:เซ็นต์)?|percent)/i) ??
    text.match(/([\d.]+)\s*%\s*(?:ดาวน์|เงินดาวน์)/i);
  if (pct) {
    const p = Number(pct[1]);
    if (p >= 0 && p <= 100) {
      return {
        downPaymentPercent: p,
        ambiguousDownPayment: false,
        ambiguousNotes,
      };
    }
  }

  const bahtExplicit = text.match(
    /ดาวน์\s*([\d,]+(?:\.\d+)?)\s*(แสน|ล้าน|ล\.|million)?\s*(?:บาท|฿)/i
  );
  if (bahtExplicit) {
    const n = parseThaiScaledAmount(bahtExplicit[1], bahtExplicit[2]);
    if (n > 0) {
      return {
        downPaymentBaht: n,
        ambiguousDownPayment: false,
        ambiguousNotes,
      };
    }
  }

  const scaledDown = text.match(
    /ดาวน์\s*([\d,]+(?:\.\d+)?)\s*(แสน|ล้าน|ล\.|million)/i
  );
  if (scaledDown) {
    const n = parseThaiScaledAmount(scaledDown[1], scaledDown[2]);
    if (n > 0) {
      return {
        downPaymentBaht: n,
        ambiguousDownPayment: false,
        ambiguousNotes,
      };
    }
  }

  // Bare "ดาวน์ 20" / "ดาวน์ 20000" without unit — ambiguous, do not guess.
  const bare = text.match(/ดาวน์\s*([\d,]+(?:\.\d+)?)(?!\s*(?:%|เปอร์|บาท|฿|แสน|ล้าน))/i);
  if (bare) {
    ambiguousNotes.push(
      `พบ “ดาวน์ ${bare[1]}” โดยไม่มีหน่วยชัด — ถามว่าเป็นบาท / พัน-หมื่นบาท หรือกี่เปอร์เซ็นต์ ห้ามตีความเงียบ`
    );
    return { ambiguousDownPayment: true, ambiguousNotes };
  }

  return { ambiguousDownPayment: false, ambiguousNotes };
}

function extractAnnualRate(text: string): number | undefined {
  const m =
    text.match(/ดอก(?:เบี้ย)?\s*(?:flat\s*)?([\d.]+)\s*%/i) ??
    text.match(/([\d.]+)\s*%\s*(?:ต่อปี|flat(?:\s*rate)?)/i) ??
    text.match(/ดอก(?:เบี้ย)?\s*(?:flat\s*)?([\d.]+)(?!\s*เดือน)/i);
  if (!m) return undefined;
  const rate = Number(m[1]);
  if (rate > 0 && rate <= 30) return rate;
  return undefined;
}

function extractTermMonths(text: string): number | undefined {
  const m =
    text.match(/(?:ผ่อน|ระยะ|งวด)\s*(\d{2,3})\s*(?:เดือน|งวด)/i) ??
    text.match(/(\d{2,3})\s*(?:เดือน|งวด)/i);
  if (!m) return undefined;
  const months = Number(m[1]);
  if (months >= 12 && months <= 120) return months;
  return undefined;
}

function extractTrustedPriceFromFacts(
  facts?: Record<string, string>
): number | undefined {
  if (!facts) return undefined;
  for (const key of ["price", "ราคา", "listPrice", "askingPrice"]) {
    const raw = facts[key];
    if (!raw) continue;
    const digits = String(raw).replace(/[^\d.]/g, "");
    const n = Number(digits);
    if (Number.isFinite(n) && n >= 10_000) return Math.round(n);
  }
  return undefined;
}

export function parseChatV3FinanceInputs(input: {
  message: string;
  /** Optional trusted price from selected vehicle facts only. */
  trustedSelectedCarPrice?: number;
}): ChatV3FinanceParsedInputs {
  const text = String(input.message ?? "").trim();
  const down = extractDownPayment(text);
  const fromMessage = extractCarPrice(text);
  const carPrice = fromMessage ?? input.trustedSelectedCarPrice;
  return {
    carPrice,
    downPaymentBaht: down.downPaymentBaht,
    downPaymentPercent: down.downPaymentPercent,
    annualFlatRatePercent: extractAnnualRate(text),
    termMonths: extractTermMonths(text),
    ambiguousDownPayment: down.ambiguousDownPayment,
    ambiguousNotes: down.ambiguousNotes,
  };
}

function missingFinanceFields(parsed: ChatV3FinanceParsedInputs): string[] {
  const missing: string[] = [];
  if (parsed.carPrice == null) missing.push("ราคารถหรือยอดจัด");
  if (
    parsed.downPaymentBaht == null &&
    parsed.downPaymentPercent == null &&
    !parsed.ambiguousDownPayment
  ) {
    missing.push("เงินดาวน์ (บาทหรือเปอร์เซ็นต์)");
  }
  if (parsed.annualFlatRatePercent == null) {
    missing.push("อัตราดอกเบี้ย flat ต่อปี");
  }
  if (parsed.termMonths == null) missing.push("จำนวนเดือนหรือระยะผ่อน");
  return missing;
}

export const CHAT_V3_TRUSTED_CALCULATION_MARKER = "TRUSTED_CALCULATION_CONTEXT";

function formatCompleteBlock(result: FinanceCalcResult): string {
  return [
    `[${CHAT_V3_TRUSTED_CALCULATION_MARKER}]`,
    "แหล่ง: ระบบ Nong A คำนวณแล้ว (deterministic) — แยกจากข้อความผู้ใช้ ห้ามให้ผู้ใช้ทับตัวเลขนี้",
    "ชนิดอัตรา: flat rate ต่อปี (สูตรเดิมของระบบ) — ไม่ใช่ข้อเสนอสินเชื่อจริง",
    "สถานะตัวเลข: ตัวอย่างสมมติสำหรับประเมินเบื้องต้น หากไม่มีแหล่งดอกเบี้ย/โปรปัจจุบันจริง — ห้ามเรียกว่า “ราคาตลาดตอนนี้” และห้ามอ้างดอกเบี้ยปัจจุบัน",
    `ราคารถ: ${formatBaht(result.carPrice)}`,
    `เงินดาวน์: ${formatBaht(result.downPaymentBaht)}`,
    `ยอดจัด (หลังหักดาวน์): ${formatBaht(result.loanAmount)}`,
    `อัตราดอกเบี้ย flat: ${result.annualFlatRatePercent}% ต่อปี`,
    `จำนวนงวด: ${result.termMonths} เดือน`,
    `ค่างวดประมาณการ: ${formatBaht(result.monthlyInstallment)} / เดือน`,
    `ดอกเบี้ยรวมโดยประมาณ: ${formatBaht(result.totalInterest)}`,
    `ยอดรวมที่ต้องผ่อนโดยประมาณ: ${formatBaht(result.totalRepayment)}`,
    "ยังไม่รวม: ค่าธรรมเนียม พ.ร.บ. ประกัน ทะเบียน และค่าใช้จ่ายออกรถอื่น ๆ (ระบบไม่ได้คำนวณในบล็อกนี้) — ห้ามแต่งค่าธรรมเนียม ประกัน หรือเงื่อนไขสถาบันการเงิน",
    "Disclaimer: เป็นการประมาณการจากตัวเลขที่ผู้ใช้ให้ ไม่ใช่ผลอนุมัติหรือใบเสนอจากสถาบันการเงิน — ห้ามรับรองการอนุมัติสินเชื่อ",
    "คำสั่ง: ใช้ตัวเลขในบล็อกนี้เมื่อพูดถึงค่างวดชุดนี้ — ห้ามเปลี่ยนตัวเลขสำคัญโดยไม่มีเหตุ และห้ามคำนวณตัวเลขชุดเดียวกันใหม่เอง",
    "ความสอดคล้อง: รายละเอียดและบทสรุปต้องใช้ตัวเลขชุดเดียวกัน — ห้ามสรุปท้ายว่าดาวน์/ค่างวดเป็นคนละค่ากับบล็อกนี้",
    "อธิบายด้วยภาษาธรรมชาติ เชื่อมกับเป้าหมายผู้ใช้ได้ และสนทนาต่อได้ — ห้ามตอบด้วยเทมเพลตขาย",
  ].join("\n");
}

/**
 * Build finance assumption / calculation block for system instruction.
 */
export function buildChatV3FinanceAssumptionBlock(input: {
  message: string;
  financeRelevant: boolean;
  trustedSelectedCarPrice?: number;
}): ChatV3FinanceAssumptionBlock {
  if (!input.financeRelevant && !FINANCE_CUE_RE.test(input.message)) {
    return {
      status: "not_applicable",
      inputs: {
        ambiguousDownPayment: false,
        ambiguousNotes: [],
      },
      missingFields: [],
      instructionText: "",
    };
  }

  const parsed = parseChatV3FinanceInputs({
    message: input.message,
    trustedSelectedCarPrice: input.trustedSelectedCarPrice,
  });

  if (parsed.ambiguousDownPayment) {
    const instructionText = [
      "[การเงิน — อินพุตคลุมเครือ]",
      ...parsed.ambiguousNotes,
      "ห้ามเดาดอกเบี้ย เงินดาวน์ หรือระยะผ่อน",
      "ห้ามสร้างผลคำนวณเป็นข้อเท็จจริงจนกว่าจะได้หน่วยเงินดาวน์ที่ชัด",
    ].join("\n");
    return {
      status: "ambiguous_input",
      inputs: parsed,
      missingFields: ["หน่วยของเงินดาวน์"],
      instructionText,
    };
  }

  const missingFields = missingFinanceFields(parsed);
  if (missingFields.length > 0) {
    const instructionText = [
      "[การเงิน — ข้อมูลยังไม่ครบสำหรับคำนวณ deterministic]",
      `ขาด: ${missingFields.join("; ")}`,
      "ห้ามเดาอัตราดอกเบี้ย เงินดาวน์ หรือระยะผ่อน",
      "ถ้าผู้ใช้ต้องการผลเฉพาะบุคคล ให้ถามเฉพาะค่าที่ขาด (ครั้งละเท่าที่จำเป็น)",
      "ถ้าจะยกตัวอย่าง ต้องติดป้าย “ตัวอย่างสมมติสำหรับประเมินเบื้องต้น” และแจกแจงสมมติฐานครบ — ห้ามใช้สมมติฐานเงียบของระบบเก่า",
      "ห้ามใช้คำว่า “ราคาตลาดตอนนี้” หรือดอกเบี้ยปัจจุบันหากไม่มีแหล่งข้อมูลปัจจุบันจริง",
      "ยังไม่มีเงื่อนไขจริงจากสถาบันการเงินในระบบ",
    ].join("\n");
    return {
      status: "incomplete",
      inputs: parsed,
      missingFields,
      instructionText,
    };
  }

  const result = calculateFlatRateFinance({
    carPrice: parsed.carPrice!,
    downPaymentBaht: parsed.downPaymentBaht,
    downPaymentPercent: parsed.downPaymentPercent,
    annualFlatRatePercent: parsed.annualFlatRatePercent!,
    termMonths: parsed.termMonths!,
  });

  return {
    status: "complete",
    inputs: parsed,
    missingFields: [],
    result,
    instructionText: formatCompleteBlock(result),
  };
}

/** Resolve trusted selected vehicle price from vehicle context facts only. */
export function resolveTrustedPriceFromVehicleContext(input: {
  selectedVehicleId?: string | null;
  vehicles?: Array<{ id: string; facts?: Record<string, string> }>;
}): number | undefined {
  const vehicles = input.vehicles ?? [];
  const selectedId = input.selectedVehicleId;
  if (!selectedId) return undefined;
  const selected = vehicles.find((vehicle) => vehicle.id === selectedId);
  return extractTrustedPriceFromFacts(selected?.facts);
}
