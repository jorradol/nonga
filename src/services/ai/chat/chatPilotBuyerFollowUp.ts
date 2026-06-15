/**
 * v6.1L.2h — Shared buyer follow-up intent detection (compare / refine from last cards).
 */
import { isCompareIntent } from "../../../utils/chatCarContext";

export type BuyerRefinementKind = "fuel" | "family" | "installment";

const ZERO_INVENTORY_PATTERN =
  /(?:ในระบบ(?:มี|เหลือ)?\s*0\s*คัน|ผลลัพธ์:\s*0\s*คัน|ไม่มีรถ(?:ใน(?:ระบบ|ตลาด))?|ตลาด(?:มี|เหลือ)?\s*0\s*คัน|0\s*คัน(?:\s|$))/i;

export const FORBIDDEN_PILOT_FOLLOWUP_PHRASES: RegExp[] = [
  /nonga-pilot:/,
  /คุณพี่คร้าบ/,
  /กราบขออภัยอย่างสูง/,
  /ดีลสุดคุ้ม\s*คุ้มค่าเงินทุกบาทแน่นอน/,
  /(?:^|\s)หนู(?:\s|$)/,
];

export function extractNumberedComparePair(message: string): { a: number; b: number } | null {
  const match =
    message.match(/(?:ช่วย)?(?:เปรียบเทียบ|เทียบ)(?:คันที่)?\s*(\d+)\s*(?:กับ|และ)\s*(\d+)/i) ??
    message.match(/เทียบคันที่\s*(\d+)\s*กับ\s*(\d+)/i) ??
    message.match(/เปรียบเทียบคันที่\s*(\d+)\s*กับ\s*(\d+)/i);
  if (!match) return null;
  const a = Number(match[1]);
  const b = Number(match[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a < 1 || b < 1) return null;
  return { a, b };
}

export function detectBuyerRefinement(message: string): BuyerRefinementKind | null {
  if (
    /(?:^|\s)เอา(?:แบบ|)?(?:ประหยัดน้ำมัน|ประหยัด\s*น้ำมัน)|ประหยัดน้ำมัน|ประหยัด\s*น้ำมัน|น้ำมัน(?:ไม่)?(?:กิน|สิ้นเปลือง)?(?:เยอะ|มาก)|กิน(?:น้ำมัน)?(?:น้อย|เบา)/i.test(
      message
    )
  ) {
    return "fuel";
  }
  if (/(?:^|\s)เอา(?:แบบ|)?(?:รถ)?ครอบครัว|รถครอบครัว|ครอบครัว|ใช้กับครอบครัว/i.test(message)) {
    return "family";
  }
  if (/(?:^|\s)เอา(?:แบบ|)?ผ่อนถูก|ผ่อนถูก|งวดเบา|ค่างวด(?:เบา|ถูก|น้อย)|ผ่อน\s*น้อย/i.test(
    message
  )) {
    return "installment";
  }
  return null;
}

export function isPilotBuyerCardInsightFollowUp(message: string): boolean {
  const t = message.trim();
  if (/สรุป(?:จุดเด่น|จุดดึง)|จุดเด่น(?:ของ)?(?:คัน|รถ)/i.test(t)) return true;
  if (
    /คันนี้เหมาะกับใคร|เหมาะกับใคร|เหมาะ(?:กับ)?(?:การใช้งาน)?แบบไหน/i.test(
      t
    )
  ) {
    return true;
  }
  return false;
}

/** v6.8E.4 — finance follow-up when session cards exist (not initial budget search). */
export function isPilotBuyerFinanceFollowUp(message: string): boolean {
  const t = message.trim();
  if (/งบ|งบประมาณ|มีรถอะไร|หารถ/i.test(t) && !/ผ่อน|ไฟแนนซ์|งวด|ดาวน์/i.test(t)) {
    return false;
  }
  return /ผ่อน|ไฟแนนซ์|งวด|ดาวน์/i.test(t);
}

/** v6.8E.4 — general model knowledge follow-up (requires session cards for real path). */
export function isPilotBuyerGeneralKnowledgeFollowUp(message: string): boolean {
  const t = message.trim();
  if (/โดยทั่วไป|รุ่นนี้.*น่าใช้|เทียบกับรถในตลาด|ควรดูอะไร|ข้อควรระวังของรุ่น|จุดเด่นทั่วไป/i.test(t)) {
    return true;
  }
  if (/ตลาดตอนนี้/i.test(t) && /รุ่นนี้|คันนี้/i.test(t)) return true;
  return false;
}

export function isPilotBuyerFollowUpMessage(message: string): boolean {
  if (extractNumberedComparePair(message)) return true;
  if (detectBuyerRefinement(message)) return true;
  if (isPilotBuyerCardInsightFollowUp(message)) return true;
  if (isPilotBuyerFinanceFollowUp(message)) return true;
  if (isPilotBuyerGeneralKnowledgeFollowUp(message)) return true;
  if (isCompareIntent(message) && /คันที่\s*\d+|คันแรก|2\s*คัน/i.test(message)) return true;
  if (/ช่วยเทียบ|เทียบคันที่|เปรียบเทียบคันที่/i.test(message)) return true;
  return false;
}

/** User-visible text must not claim zero inventory when cards exist in session */
export function assertNoZeroInventoryClaim(text: string, carCardCount: number): boolean {
  if (carCardCount <= 0) return true;
  return !ZERO_INVENTORY_PATTERN.test(text);
}

/** Follow-up replies must never claim zero inventory even without cards */
export function assertNoFollowUpZeroInventoryClaim(text: string): boolean {
  return !ZERO_INVENTORY_PATTERN.test(text);
}

export function assertNoPilotDebugMarker(text: string): boolean {
  return !text.includes("nonga-pilot:");
}

export function assertPilotFollowUpCopySafe(text: string, carCardCount: number): boolean {
  if (!assertNoPilotDebugMarker(text)) return false;
  if (!assertNoFollowUpZeroInventoryClaim(text)) return false;
  for (const pattern of FORBIDDEN_PILOT_FOLLOWUP_PHRASES) {
    if (pattern.test(text)) return false;
  }
  if (carCardCount > 0 && !assertNoZeroInventoryClaim(text, carCardCount)) return false;
  return true;
}
