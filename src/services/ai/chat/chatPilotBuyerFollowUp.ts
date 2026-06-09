/**
 * v6.1L.2g — Shared buyer follow-up intent detection (compare / refine from last cards).
 */
import { isCompareIntent } from "../../../utils/chatCarContext";

export type BuyerRefinementKind = "fuel" | "family" | "installment";

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

export function isPilotBuyerFollowUpMessage(message: string): boolean {
  if (extractNumberedComparePair(message)) return true;
  if (detectBuyerRefinement(message)) return true;
  if (isCompareIntent(message) && /คันที่\s*\d+|คันแรก|2\s*คัน/i.test(message)) return true;
  if (/ช่วยเทียบ|เทียบคันที่|เปรียบเทียบคันที่/i.test(message)) return true;
  return false;
}

/** User-visible text must not claim zero inventory when cards exist in session */
export function assertNoZeroInventoryClaim(text: string, carCardCount: number): boolean {
  if (carCardCount <= 0) return true;
  return !/(?:ในระบบ(?:มี|เหลือ)?\s*0\s*คัน|ผลลัพธ์:\s*0\s*คัน|ไม่มีรถ(?:ใน(?:ระบบ|ตลาด))?|0\s*คัน(?:\s|$))/i.test(
    text
  );
}
