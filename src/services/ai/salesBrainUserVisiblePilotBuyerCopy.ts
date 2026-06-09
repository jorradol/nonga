/**
 * v6.1L.2f — Pilot user-visible buyer recommendation copy (mock path, น้องเอ tone).
 * No debug markers, no overpromise, disclaimer on listing data only.
 */
import { parseBuyerSearchIntent } from "./chat/buyerSearchIntentParser";
import { isCompareIntent } from "../../utils/chatCarContext";

export const USER_VISIBLE_PILOT_BUYER_COPY_SLICE_ID = "v6.1L.2f";

const LISTING_DISCLAIMER =
  "นี่เป็นการแนะนำเบื้องต้นจากข้อมูลประกาศในระบบนะครับ ยังไม่ได้ตรวจสภาพรถจริง และไม่ได้ฟันธงว่าคันไหนเหมาะที่สุดโดยไม่มีข้อมูลเพิ่ม";

export interface PilotBuyerCopyInput {
  userMessage: string;
  intent: string;
  carCardCount: number;
  hasMoreCars?: boolean;
}

export interface PilotBuyerCopyResult {
  text: string;
  pilotPathActive: true;
}

function formatBudgetPhrase(budgetMax?: number): string {
  if (budgetMax == null || budgetMax <= 0) return "";
  if (budgetMax % 1_000_000 === 0 && budgetMax >= 1_000_000) {
    const millions = budgetMax / 1_000_000;
    return `งบประมาณ ${Number.isInteger(millions) ? millions : millions.toFixed(1)} ล้าน `;
  }
  if (budgetMax % 100_000 === 0 && budgetMax >= 100_000) {
    return `งบประมาณ ${budgetMax / 100_000} แสน `;
  }
  return `งบประมาณ ${budgetMax.toLocaleString("th-TH")} บาท `;
}

function extractComparePair(message: string): { a: number; b: number } | null {
  const match =
    message.match(/เทียบคันที่\s*(\d+)\s*กับ\s*(\d+)/i) ??
    message.match(/เปรียบเทียบคันที่\s*(\d+)\s*กับ\s*(\d+)/i);
  if (!match) return null;
  const a = Number(match[1]);
  const b = Number(match[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a < 1 || b < 1) return null;
  return { a, b };
}

export type BuyerRefinementKind = "fuel" | "family" | "installment";

export function detectBuyerRefinement(message: string): BuyerRefinementKind | null {
  if (
    /ประหยัดน้ำมัน|ประหยัด\s*น้ำมัน|น้ำมัน(?:ไม่)?(?:กิน|สิ้นเปลือง)?(?:เยอะ|มาก)|กิน(?:น้ำมัน)?(?:น้อย|เบา)/i.test(
      message
    )
  ) {
    return "fuel";
  }
  if (/รถครอบครัว|ครอบครัว|ใช้กับครอบครัว/i.test(message)) {
    return "family";
  }
  if (/ผ่อนถูก|งวดเบา|ค่างวด(?:เบา|ถูก|น้อย)|ผ่อน\s*น้อย/i.test(message)) {
    return "installment";
  }
  return null;
}

export function buildBuyerSearchPilotCopy(input: {
  userMessage: string;
  carCardCount: number;
  hasMoreCars?: boolean;
  budgetMax?: number;
}): string {
  const budgetLead = formatBudgetPhrase(input.budgetMax);
  const count = Math.max(0, input.carCardCount);

  if (count === 0) {
    return `${budgetLead}ตอนนี้น้องเอยังไม่เจอรถที่ตรงเงื่อนไขครบในระบบครับ ลองบอกยี่ห้อ รุ่น ปี หรือสไตล์การใช้งานเพิ่มได้ เช่น “เอาประหยัดน้ำมัน” หรือ “เอารถครอบครัว” น้องเอจะช่วยคัดให้ใหม่ครับ\n\n${LISTING_DISCLAIMER}`;
  }

  if (count === 1) {
    return `${budgetLead}น้องเอคัดมาให้ 1 คันที่น่าดูต่อก่อนครับ ลองกดดูรายละเอียดในการ์ดด้านล่างก่อน แล้วถามต่อได้เลย เช่น “สรุปจุดดึงของคันนี้” หรือ “ช่วยดูว่าผ่อนเบื้องต้นประมาณไหน”\n\n${LISTING_DISCLAIMER}`;
  }

  if (count === 2) {
    return `${budgetLead}น้องเอคัดมาให้ 2 คันที่น่าเล่นก่อนครับ แต่ละคันเหมาะคนละแนว ลองกดดูคันที่ถูกใจก่อน หรือพิมพ์ว่า “เทียบคันที่ 1 กับ 2” เดี๋ยวน้องเอช่วยสรุปข้อดีและข้อควรเช็กให้ครับ\n\n${LISTING_DISCLAIMER}`;
  }

  const shown = Math.min(count, 3);
  const moreHint =
    input.hasMoreCars || count > 3
      ? " ถ้ายังไม่ถูกใจ กดดูเพิ่มหรือบอกเงื่อนไขใหม่ได้ครับ"
      : "";

  return `${budgetLead}น้องเอคัดมาให้ ${shown} คันที่น่าเล่นก่อนนะครับ แต่ละคันเหมาะคนละสไตล์ ถ้าอยากได้ใช้งานคุ้ม ๆ ดูแลง่าย ให้เริ่มดูคันแรกก่อน แต่ถ้าเน้นความสด/ความสวย/ความคุ้มราคา น้องเอช่วยเทียบให้ทีละคันได้ครับ\n\nลองกดดูคันที่ถูกใจที่สุดก่อน หรือพิมพ์ว่า “เทียบคันที่ 1 กับ 2” เดี๋ยวน้องเอช่วยสรุปข้อดี-ข้อควรเช็ก และแนะนำคันที่น่าไปต่อให้ครับ${moreHint}\n\n${LISTING_DISCLAIMER}`;
}

export function buildBuyerComparePilotCopy(pair: { a: number; b: number }): string {
  return `น้องเอช่วยเทียบคันที่ ${pair.a} กับ ${pair.b} จากข้อมูลประกาศในระบบให้ครับ ลองเปิดดูการ์ดทั้งสองคันก่อน แล้วน้องเอจะสรุปให้ว่าคันไหนน่าไปต่อในมุมราคา ปี เลขไมล์ และจุดที่ควรเช็กเพิ่ม\n\nถ้าอยากให้เน้นมุมใดเป็นพิเศษ เช่น ประหยัดน้ำมัน รถครอบครัว หรือผ่อนเบื้องต้น บอกน้องเอได้เลยครับ\n\n${LISTING_DISCLAIMER}`;
}

export function buildBuyerRefinementPilotCopy(
  kind: BuyerRefinementKind,
  carCardCount: number
): string {
  const countNote =
    carCardCount > 0
      ? `จาก ${Math.min(carCardCount, 3)} คันที่แสดงอยู่ `
      : "จากรายการที่คัดไว้ ";

  if (kind === "fuel") {
    return `${countNote}น้องเอแนะนำให้ดูเลขไมล์ ปีรถ และคำอธิบายประกาศที่พูดถึงการใช้งานจริงก่อนครับ รถที่ประหยัดน้ำมันมักต้องเทียบกับสไตล์การขับและการดูแลต่อเนื่อง ไม่ใช่ดูแค่บรรทัดเดียว\n\nลองกดดูคันที่สนใจก่อน หรือพิมพ์ “เทียบคันที่ 1 กับ 2” ถ้าอยากให้น้องเอช่วยเทียบให้ชัดขึ้นครับ\n\n${LISTING_DISCLAIMER}`;
  }

  if (kind === "family") {
    return `${countNote}น้องเอแนะนำให้ดูจำนวนที่นั่ง ความกว้าง/ท้ายรถ และเลขไมล์เทียบปีรถจากข้อมูลประกาศครับ รถครอบครัวควรเลือกจากการใช้งานจริง ไม่ใช่ดูแค่รูปอย่างเดียว\n\nลองกดดูคันที่ถูกใจก่อน หรือพิมพ์ “เทียบคันที่ 1 กับ 2” เดี๋ยวน้องเอช่วยสรุปข้อดี-ข้อควรเช็กให้ครับ\n\n${LISTING_DISCLAIMER}`;
  }

  return `${countNote}น้องเอช่วยดูเบื้องต้นได้จากราคาในการ์ดครับ แต่ค่างวดจริงขึ้นกับดาวน์ ระยะผ่อน และเงื่อนไขไฟแนนซ์ น้องเอไม่ฟันธงค่างวดให้โดยไม่มีข้อมูลครบ\n\nลองกดดูคันที่สนใจก่อน แล้วถามต่อว่า “ช่วยประเมินผ่อนเบื้องต้น” ได้ครับ\n\n${LISTING_DISCLAIMER}`;
}

export function buildPilotBuyerUserVisibleCopy(
  input: PilotBuyerCopyInput
): PilotBuyerCopyResult | null {
  const comparePair = extractComparePair(input.userMessage);
  if (comparePair && (isCompareIntent(input.userMessage) || /เทียบคันที่/i.test(input.userMessage))) {
    return { text: buildBuyerComparePilotCopy(comparePair), pilotPathActive: true };
  }

  const refinement = detectBuyerRefinement(input.userMessage);
  if (refinement && input.carCardCount > 0 && input.intent !== "buyer.search") {
    return {
      text: buildBuyerRefinementPilotCopy(refinement, input.carCardCount),
      pilotPathActive: true,
    };
  }

  if (input.intent === "buyer.search") {
    const intent = parseBuyerSearchIntent(input.userMessage);
    if (refinement && input.carCardCount > 0) {
      return {
        text: buildBuyerRefinementPilotCopy(refinement, input.carCardCount),
        pilotPathActive: true,
      };
    }
    return {
      text: buildBuyerSearchPilotCopy({
        userMessage: input.userMessage,
        carCardCount: input.carCardCount,
        hasMoreCars: input.hasMoreCars,
        budgetMax: intent.budgetMax,
      }),
      pilotPathActive: true,
    };
  }

  if (refinement && input.carCardCount > 0) {
    return {
      text: buildBuyerRefinementPilotCopy(refinement, input.carCardCount),
      pilotPathActive: true,
    };
  }

  if (isCompareIntent(input.userMessage) && input.carCardCount >= 2) {
    return {
      text: buildBuyerComparePilotCopy({ a: 1, b: 2 }),
      pilotPathActive: true,
    };
  }

  return null;
}

/** Guard: user-visible pilot text must never contain debug marker */
export function assertNoPilotDebugMarker(text: string): boolean {
  return !text.includes("nonga-pilot:");
}
