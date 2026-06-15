/**
 * v6.1L.2h — Pilot user-visible buyer copy grounded on last shown car cards.
 */
import { parseBuyerSearchIntent } from "./chat/buyerSearchIntentParser";
import {
  assertNoZeroInventoryClaim,
  assertPilotFollowUpCopySafe,
  detectBuyerRefinement,
  extractNumberedComparePair,
  isPilotBuyerCardInsightFollowUp,
  isPilotBuyerFinanceFollowUp,
  isPilotBuyerGeneralKnowledgeFollowUp,
  isPilotBuyerFollowUpMessage,
  type BuyerRefinementKind,
} from "./chat/chatPilotBuyerFollowUp";
import type { PilotGroundedCarCard } from "./chat/chatPilotSessionContext";
import { resolveCarCardsFromSessionContext } from "./chat/chatPilotSessionContext";
import { buildListingComparisonInsight } from "./chat/chatSearchReplyCopy";
import { buildPilotRefinementFollowUpReplyCopy } from "./chat/chatRefinementReplyCopy";
import { isCompareIntent } from "../../utils/chatCarContext";

export const USER_VISIBLE_PILOT_BUYER_COPY_SLICE_ID = "v6.1L.2h";

export type { BuyerRefinementKind };

const LISTING_DISCLAIMER =
  "นี่เป็นการแนะนำเบื้องต้นจากข้อมูลประกาศในระบบนะครับ ยังไม่ได้ตรวจสภาพรถจริง และไม่ได้ฟันธงว่าคันไหนเหมาะที่สุดโดยไม่มีข้อมูลเพิ่ม";

const PARTIAL_DATA_NOTE =
  "น้องเอยังมีข้อมูลจากประกาศเท่าที่ระบบแสดงนะครับ ยังฟันธงละเอียดไม่ได้ แต่ช่วยเทียบแนวใช้งานเบื้องต้นให้ก่อนได้ครับ";

/** Safe reply when follow-up compare/refine has no recent cards in context */
export function buildPilotFollowUpNoContextCopy(): string {
  return [
    "น้องเอยังไม่เห็นชุดรถล่าสุดให้เทียบในแชทนี้ครับ",
    "ลองพิมพ์งบหรือเงื่อนไขรถที่อยากได้ก่อน เช่น “งบ 4 แสน มีรถอะไรน่าเล่น” แล้วน้องเอจะคัดรถมาให้",
    "จากนั้นค่อยพิมพ์ “เทียบคันที่ 1 กับ 2” ได้ครับ",
  ].join(" ");
}

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

export function buildBuyerSummarizePilotCopy(
  cards: PilotGroundedCarCard[],
  cardIndex = 1
): string {
  const selected = resolveCarCardsFromSessionContext(cards, [cardIndex]);
  const card = selected[0] ?? cards[0];
  if (!card) return buildPilotFollowUpNoContextCopy();

  const angle = inferUseAngle(card);
  return [
    `ได้ครับ น้องเอขอสรุปจุดเด่นของคันที่ ${card.index} จากข้อมูลในระบบนะครับ`,
    "",
    formatCarLine(card),
    angle ? `จุดเด่นตามประกาศ: ${angle}` : "",
    card.description ? `รายละเอียดเพิ่มจากประกาศ: ${card.description}` : "",
    "",
    "ถ้าอยากเทียบกับคันอื่น พิมพ์ “เทียบคันที่ 1 กับ 2” ได้ครับ",
    LISTING_DISCLAIMER,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildBuyerFitPilotCopy(
  cards: PilotGroundedCarCard[],
  cardIndex = 1
): string {
  const selected = resolveCarCardsFromSessionContext(cards, [cardIndex]);
  const card = selected[0] ?? cards[0];
  if (!card) return buildPilotFollowUpNoContextCopy();

  const angle = inferUseAngle(card);
  return [
    `จากข้อมูลประกาศของคันที่ ${card.index} น้องเอประเมินว่า`,
    "",
    formatCarLine(card),
    `เหมาะกับผู้ที่มองหารถในกลุ่มนี้ — ${angle}`,
    "",
    "ข้อมูลนี้มาจากประกาศในระบบเท่านั้น ควรดูสภาพจริงก่อนตัดสินใจครับ",
    LISTING_DISCLAIMER,
  ].join("\n");
}

/** v6.8E.4 — safe finance fallback when real provider blocked. */
export function buildBuyerFinancePilotCopy(cards: PilotGroundedCarCard[]): string {
  const card = cards[0];
  if (!card) return buildPilotFollowUpNoContextCopy();

  return [
    `จากข้อมูลประกาศของคันที่ ${card.index} น้องเอยังประเมินยอดผ่อนแน่นอนไม่ได้จากข้อมูลในระบบเท่านั้นครับ`,
    "",
    formatCarLine(card),
    "ยอดผ่อนขึ้นกับราคารถ เงินดาวน์ ระยะผ่อน ดอกเบี้ย และผลอนุมัติไฟแนนซ์ของแต่ละเจ้าครับ",
    "น้องเอช่วยประเมินเบื้องต้นได้ แต่ต้องให้ทีมงานตรวจเงื่อนไขไฟแนนซ์กับคุณลูกค้าอีกครั้งครับ",
    "ถ้าสะดวก ฝากชื่อและเบอร์ติดต่อให้ทีมงานช่วยประสานรายละเอียดได้ครับ",
    LISTING_DISCLAIMER,
  ].join("\n");
}

const GENERAL_KNOWLEDGE_DISCLAIMER =
  "ข้อมูลทั่วไปนี้ไม่ใช่การยืนยันสภาพของรถคันนี้โดยตรง ควรตรวจสภาพและทดลองขับจริงก่อนตัดสินใจครับ";

/** v6.8E.4 — general model knowledge fallback grounded on listing + safe disclaimer. */
export function buildBuyerGeneralKnowledgePilotCopy(
  cards: PilotGroundedCarCard[],
  cardIndex = 1
): string {
  const selected = resolveCarCardsFromSessionContext(cards, [cardIndex]);
  const card = selected[0] ?? cards[0];
  if (!card) return buildPilotFollowUpNoContextCopy();

  const evNote =
    card.fuelType && /electric|ไฟฟ้า|ev|hybrid|ปลั๊กอิน/i.test(card.fuelType)
      ? "จากข้อมูลในประกาศนี้เป็นรถไฟฟ้าหรือไฮบริด — ถ้ายังไม่มีข้อมูลแบตเตอรี่ ระยะวิ่ง หรือหัวชาร์จในระบบ น้องเอจะยังไม่เดาให้ครับ"
      : "";

  return [
    "จากข้อมูลในประกาศนี้",
    "",
    formatCarLine(card),
    card.fuelType ? `เชื้อเพลิง/ระบบขับ: ${card.fuelType}` : "",
    card.description ? `จากประกาศ: ${card.description}` : "",
    evNote,
    "",
    "จากความรู้ทั่วไปของรุ่นนี้ น้องเอแนะนำให้ดูสภาพจริง ประวัติการดูแล ไมล์ และการใช้งานที่ตรงกับคุณลูกค้าครับ",
    "ถ้าต้องการเทียบกับรถในตลาด น้องเอช่วยเทียบจากข้อมูลในระบบก่อนได้ครับ — ข้อมูลตลาดล่าสุดนอกระบบต้องให้ทีมงานตรวจเพิ่มครับ",
    "",
    GENERAL_KNOWLEDGE_DISCLAIMER,
    LISTING_DISCLAIMER,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildBuyerRefinementPilotCopy(
  kind: BuyerRefinementKind,
  cards: PilotGroundedCarCard[]
): string {
  return buildPilotRefinementFollowUpReplyCopy(kind, cards.slice(0, 3));
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

  if (followUp && sessionCount === 0) {
    return {
      text: buildPilotFollowUpNoContextCopy(),
      pilotPathActive: true,
    };
  }

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

  if (isPilotBuyerFinanceFollowUp(input.userMessage) && sessionCount > 0) {
    return {
      text: buildBuyerFinancePilotCopy(sessionCards),
      pilotPathActive: true,
    };
  }

  if (isPilotBuyerGeneralKnowledgeFollowUp(input.userMessage) && sessionCount > 0) {
    return {
      text: buildBuyerGeneralKnowledgePilotCopy(sessionCards),
      pilotPathActive: true,
    };
  }

  if (isPilotBuyerCardInsightFollowUp(input.userMessage) && sessionCount > 0) {
    if (/เหมาะกับใคร|เหมาะ(?:กับ)?(?:การใช้งาน)?แบบไหน/i.test(input.userMessage)) {
      return {
        text: buildBuyerFitPilotCopy(sessionCards),
        pilotPathActive: true,
      };
    }
    return {
      text: buildBuyerSummarizePilotCopy(sessionCards),
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
    if (/เทียบ|เปรียบเทียบ|ช่วยเทียบ/i.test(input.userMessage)) {
      return {
        text: buildBuyerComparePilotCopy({ a: 1, b: Math.min(2, sessionCount) }, sessionCards),
        pilotPathActive: true,
      };
    }
  }

  return null;
}

/** Guard: user-visible pilot text must never contain debug marker */
export function assertNoPilotDebugMarker(text: string): boolean {
  return !text.includes("nonga-pilot:");
}

export function assertPilotCopySafe(
  text: string,
  carCardCount: number,
  userMessage?: string
): boolean {
  if (userMessage && isPilotBuyerFollowUpMessage(userMessage)) {
    return assertPilotFollowUpCopySafe(text, carCardCount);
  }
  return assertNoPilotDebugMarker(text) && assertNoZeroInventoryClaim(text, carCardCount);
}

export {
  detectBuyerRefinement,
  extractNumberedComparePair,
  assertNoZeroInventoryClaim,
  assertPilotFollowUpCopySafe,
  assertNoFollowUpZeroInventoryClaim,
} from "./chat/chatPilotBuyerFollowUp";
