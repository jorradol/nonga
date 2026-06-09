/**
 * v6.1L.2g — Pilot user-visible buyer copy grounded on last shown car cards.
 */
import { parseBuyerSearchIntent } from "./chat/buyerSearchIntentParser";
import {
  assertNoZeroInventoryClaim,
  detectBuyerRefinement,
  extractNumberedComparePair,
  isPilotBuyerFollowUpMessage,
  type BuyerRefinementKind,
} from "./chat/chatPilotBuyerFollowUp";
import type { PilotGroundedCarCard } from "./chat/chatPilotSessionContext";
import { resolveCarCardsFromSessionContext } from "./chat/chatPilotSessionContext";
import { buildListingComparisonInsight } from "./chat/chatSearchReplyCopy";
import { isCompareIntent } from "../../utils/chatCarContext";

export const USER_VISIBLE_PILOT_BUYER_COPY_SLICE_ID = "v6.1L.2g";

export type { BuyerRefinementKind };

const LISTING_DISCLAIMER =
  "นี่เป็นการแนะนำเบื้องต้นจากข้อมูลประกาศในระบบนะครับ ยังไม่ได้ตรวจสภาพรถจริง และไม่ได้ฟันธงว่าคันไหนเหมาะที่สุดโดยไม่มีข้อมูลเพิ่ม";

const PARTIAL_DATA_NOTE =
  "น้องเอยังมีข้อมูลจากประกาศเท่าที่ระบบแสดงนะครับ ยังฟันธงละเอียดไม่ได้ แต่ช่วยเทียบแนวใช้งานเบื้องต้นให้ก่อนได้ครับ";

export interface PilotBuyerCopyInput {
  userMessage: string;
  intent: string;
  carCardCount: number;
  hasMoreCars?: boolean;
  recentCarCards?: PilotGroundedCarCard[];
  lastSearchBudgetMax?: number;
}

export interface PilotBuyerCopyResult {
  text: string;
  pilotPathActive: true;
}

function formatPrice(n: number): string {
  return n.toLocaleString("th-TH");
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

function formatCarLine(card: PilotGroundedCarCard): string {
  const mileage =
    card.mileage != null && card.mileage > 0
      ? ` ไมล์ ${formatPrice(card.mileage)} กม.`
      : "";
  const body = card.bodyClassLabel ? ` (${card.bodyClassLabel})` : "";
  return `${card.brand} ${card.model} ปี ${card.year} — ราคา ${formatPrice(card.price)} บาท${mileage}${body}`;
}

function inferUseAngle(card: PilotGroundedCarCard): string {
  const parts: string[] = [];
  if (card.price > 0 && card.price <= 450_000) parts.push("มุมคุ้มงบ");
  if (card.mileage != null && card.mileage > 0 && card.mileage < 80_000) {
    parts.push("เลขไมล์ไม่สูงตามประกาศ");
  }
  if (card.year >= new Date().getFullYear() - 5) parts.push("ปีค่อนข้างใหม่ตามที่ระบุ");
  if (card.bodyClassLabel && /MPV|SUV/i.test(card.bodyClassLabel)) {
    parts.push("เหมาะใช้งานครอบครัวจากประเภทรถในระบบ");
  }
  if (card.fuelType && /hybrid|electric/i.test(card.fuelType)) {
    parts.push("มีข้อมูลเชื้อเพลิง/ระบบขับที่ควรดูต่อในการ์ด");
  }
  if (parts.length === 0) return "ดูต่อจากราคา ปี และเลขไมล์ในการ์ด";
  return parts.slice(0, 2).join(" และ ");
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

export function buildBuyerComparePilotCopy(
  pair: { a: number; b: number },
  cards: PilotGroundedCarCard[]
): string {
  const selected = resolveCarCardsFromSessionContext(cards, [pair.a, pair.b]);
  if (selected.length < 2) {
    return `${PARTIAL_DATA_NOTE}\n\nลองเปิดดูการ์ดที่เพิ่งแสดงก่อน แล้วพิมพ์ “เทียบคันที่ 1 กับ 2” อีกครั้ง หรือบอกว่าอยากเน้นมุมไหน เช่น ประหยัดน้ำมัน ครอบครัว หรือผ่อนเบื้องต้นครับ\n\n${LISTING_DISCLAIMER}`;
  }

  const [carA, carB] = selected;
  const insight = buildListingComparisonInsight(
    selected.map((c) => ({
      id: String(c.index),
      brand: c.brand,
      model: c.model,
      year: c.year,
      price: c.price,
      mileage: c.mileage ?? 0,
      bodyClassLabel: c.bodyClassLabel ?? "",
    }))
  );

  const lead =
    selected.length === 2
      ? `ได้ครับ น้องเอเทียบจาก 2 คันที่เพิ่งคัดให้ก่อนนะครับ`
      : `ได้ครับ น้องเอช่วยเทียบจากรถที่เพิ่งแสดงให้ก่อนครับ`;

  const body = [
    lead,
    "",
    `คันที่ ${pair.a} (${formatCarLine(carA)}) — ${inferUseAngle(carA)}`,
    `คันที่ ${pair.b} (${formatCarLine(carB)}) — ${inferUseAngle(carB)}`,
    insight ? `\n${insight}` : "",
    "",
    "ถ้าอยากเน้นมุมใดเป็นพิเศษ เช่น ประหยัดน้ำมัน ครอบครัว หรือผ่อนเบื้องต้น บอกน้องเอได้ครับ",
    "แต่ยังเป็นการเทียบจากข้อมูลประกาศในระบบนะครับ ก่อนตัดสินใจควรดูสภาพจริง เลขไมล์ เอกสาร และประวัติการดูแลอีกครั้งครับ",
    "",
    LISTING_DISCLAIMER,
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  return body;
}

export function buildBuyerRefinementPilotCopy(
  kind: BuyerRefinementKind,
  cards: PilotGroundedCarCard[]
): string {
  const shown = cards.slice(0, 3);
  const listingLines = shown.map(
    (c, i) => `${i + 1}. ${formatCarLine(c)}`
  );

  const lead = `จาก ${shown.length} คันที่เพิ่งแสดงอยู่ น้องเอช่วยคัดแนวให้จากข้อมูลประกาศในระบบก่อนนะครับ`;

  if (kind === "fuel") {
    return [
      lead,
      "",
      ...listingLines,
      "",
      "ถ้าเน้นประหยัดน้ำมัน แนะนำดูเลขไมล์ ปีรถ ประเภทรถ และคำอธิบายประกาศที่พูดถึงการใช้งานจริงก่อนครับ น้องเอไม่แนะนำรุ่นทั่วไปนอกจากรถที่แสดงในการ์ด",
      "",
      "ลองกดดูคันที่สนใจก่อน หรือพิมพ์ “เทียบคันที่ 1 กับ 2” ถ้าอยากให้น้องเอช่วยเทียบให้ชัดขึ้นครับ",
      "",
      LISTING_DISCLAIMER,
    ].join("\n");
  }

  if (kind === "family") {
    return [
      lead,
      "",
      ...listingLines,
      "",
      "ถ้าเน้นรถครอบครัว แนะนำดูประเภทรถ จำนวนที่นั่ง และเลขไมล์เทียบปีจากข้อมูลประกาศครับ",
      "",
      "ลองกดดูคันที่ถูกใจก่อน หรือพิมพ์ “เทียบคันที่ 1 กับ 2” เดี๋ยวน้องเอช่วยสรุปข้อดี-ข้อควรเช็กให้ครับ",
      "",
      LISTING_DISCLAIMER,
    ].join("\n");
  }

  return [
    lead,
    "",
    ...listingLines,
    "",
    "ถ้าเน้นผ่อนเบื้องต้น น้องเอช่วยดูจากราคาในการ์ดได้ครับ แต่ค่างวดจริงขึ้นกับดาวน์ ระยะผ่อน และเงื่อนไขไฟแนนซ์ น้องเอไม่ฟันธงค่างวดโดยไม่มีข้อมูลครบ",
    "",
    "ลองกดดูคันที่สนใจก่อน แล้วถามต่อว่า “ช่วยประเมินผ่อนเบื้องต้น” ได้ครับ",
    "",
    LISTING_DISCLAIMER,
  ].join("\n");
}

function effectiveCarCards(input: PilotBuyerCopyInput): PilotGroundedCarCard[] {
  if (input.recentCarCards && input.recentCarCards.length > 0) {
    return input.recentCarCards;
  }
  return [];
}

function effectiveCarCount(input: PilotBuyerCopyInput): number {
  const cards = effectiveCarCards(input);
  if (cards.length > 0) return cards.length;
  return Math.max(0, input.carCardCount);
}

export function buildPilotBuyerUserVisibleCopy(
  input: PilotBuyerCopyInput
): PilotBuyerCopyResult | null {
  const sessionCards = effectiveCarCards(input);
  const sessionCount = effectiveCarCount(input);
  const comparePair = extractNumberedComparePair(input.userMessage);
  const refinement = detectBuyerRefinement(input.userMessage);
  const followUp = isPilotBuyerFollowUpMessage(input.userMessage);

  if (comparePair && sessionCount >= 2) {
    return {
      text: buildBuyerComparePilotCopy(comparePair, sessionCards),
      pilotPathActive: true,
    };
  }

  if (
    (isCompareIntent(input.userMessage) || /ช่วยเทียบ|เทียบคันที่/i.test(input.userMessage)) &&
    sessionCount >= 2
  ) {
    return {
      text: buildBuyerComparePilotCopy({ a: 1, b: 2 }, sessionCards),
      pilotPathActive: true,
    };
  }

  if (refinement && sessionCount > 0) {
    return {
      text: buildBuyerRefinementPilotCopy(refinement, sessionCards),
      pilotPathActive: true,
    };
  }

  if (followUp && sessionCount > 0 && comparePair) {
    return {
      text: buildBuyerComparePilotCopy(comparePair, sessionCards),
      pilotPathActive: true,
    };
  }

  if (input.intent === "buyer.search") {
    const intent = parseBuyerSearchIntent(input.userMessage);
    if (refinement && sessionCount > 0) {
      return {
        text: buildBuyerRefinementPilotCopy(refinement, sessionCards),
        pilotPathActive: true,
      };
    }
    return {
      text: buildBuyerSearchPilotCopy({
        userMessage: input.userMessage,
        carCardCount: sessionCount,
        hasMoreCars: input.hasMoreCars,
        budgetMax: intent.budgetMax ?? input.lastSearchBudgetMax,
      }),
      pilotPathActive: true,
    };
  }

  if (followUp && sessionCount > 0) {
    return {
      text: buildBuyerComparePilotCopy({ a: 1, b: Math.min(2, sessionCount) }, sessionCards),
      pilotPathActive: true,
    };
  }

  return null;
}

/** Guard: user-visible pilot text must never contain debug marker */
export function assertNoPilotDebugMarker(text: string): boolean {
  return !text.includes("nonga-pilot:");
}

export function assertPilotCopySafe(text: string, carCardCount: number): boolean {
  return assertNoPilotDebugMarker(text) && assertNoZeroInventoryClaim(text, carCardCount);
}

export { detectBuyerRefinement, extractNumberedComparePair, assertNoZeroInventoryClaim };
