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
  isPilotBuyerDirectCompareFollowUp,
  isPilotBuyerEvFollowUp,
  isPilotBuyerFinanceFollowUp,
  isPilotBuyerGeneralKnowledgeFollowUp,
  isPilotBuyerMileageFollowUp,
  isPilotBuyerFollowUpMessage,
  type BuyerRefinementKind,
} from "./chat/chatPilotBuyerFollowUp";
import type { PilotGroundedCarCard } from "./chat/chatPilotSessionContext";
import { resolveCarCardsFromSessionContext } from "./chat/chatPilotSessionContext";
import { buildListingComparisonInsight } from "./chat/chatSearchReplyCopy";
import { buildPilotRefinementFollowUpReplyCopy } from "./chat/chatRefinementReplyCopy";
import {
  buildGeneralModelContextBlock,
  assertNoHallucinatedVehicleClaim,
} from "./chat/vehicleModelContext";
import {
  buildMileageEvaluationReply,
  buildAmbiguousMileageClarification,
  extractStatedMileageFromMessage,
  resolveCarsByMileageFact,
} from "./chat/chatBuyerFactsQa";
import type { ChatCarCardData } from "../../types";

export const USER_VISIBLE_PILOT_BUYER_COPY_SLICE_ID = "v6.1L.2h";

export type { BuyerRefinementKind };

const LISTING_DISCLAIMER =
  "นี่เป็นการแนะนำเบื้องต้นจากข้อมูลประกาศในระบบนะครับ ยังไม่ได้ตรวจสภาพรถจริง และไม่ได้ฟันธงว่าคันไหนเหมาะที่สุดโดยไม่มีข้อมูลเพิ่ม";

const PARTIAL_DATA_NOTE =
  "น้องเอยังมีข้อมูลจากประกาศเท่าที่ระบบแสดงนะครับ ยังฟันธงละเอียดไม่ได้ แต่ช่วยเทียบแนวใช้งานเบื้องต้นให้ก่อนได้ครับ";

const SOFT_VIEWING_CTA =
  "ถ้าสนใจคันไหน น้องเอช่วยประสานนัดดูรถ ทดลองขับ หรือคุยไฟแนนซ์เบื้องต้นกับผู้ขายให้ต่อได้ครับ";

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

function pilotUsageAngle(card: PilotGroundedCarCard): string {
  const body = String(card.bodyClassLabel ?? "");
  if (/SUV|Crossover/i.test(body)) {
    return "เป็น SUV/Crossover ใช้งานครอบครัวได้ดี เหมาะกับคนที่อยากได้รถนั่งสบาย พื้นที่เยอะ และภาพลักษณ์ดี";
  }
  if (/MPV/i.test(body)) {
    return "เป็น MPV / รถครอบครัว เหมาะกับคนที่ต้องการที่นั่งเยอะและการใช้งานอเนกประสงค์";
  }
  if (/Sedan|ซีดาน/i.test(body)) {
    return "เป็นซีดานขับสบาย นั่งหลังสบาย ภาพลักษณ์ดี และดูเป็นผู้ใหญ่กว่ารถเล็กทั่วไป";
  }
  if (/Hatchback/i.test(body)) {
    return "เป็น Hatchback กะทัดรัด เหมาะกับขับในเมืองและใช้งานประจำวัน";
  }
  if (/Pickup|กระบะ/i.test(body)) {
    return "เป็นกระบะ เหมาะกับการบรรทุกและใช้งานหนัก";
  }
  return inferUseAngle(card);
}

/** Rich inventory summary when pilot path is active — uses safe card fields only. */
function buildRichBuyerSearchFromCards(
  cards: PilotGroundedCarCard[],
  options: { budgetLead: string; hasMoreCars?: boolean }
): string {
  const shown = cards.slice(0, 3);
  if (shown.length === 0) return "";

  if (shown.length === 1) {
    const c = shown[0]!;
    const mileage =
      c.mileage != null && c.mileage > 0
        ? ` ไมล์ ${formatPrice(c.mileage)} กม.`
        : "";
    const modelCtx = buildGeneralModelContextBlock({
      brand: c.brand,
      model: c.model,
      year: c.year,
      bodyClassLabel: c.bodyClassLabel,
    });
    const text = [
      `${options.budgetLead}มีครับ เจอ ${c.brand} ${c.model} ปี ${c.year} อยู่ 1 คันในตลาดตอนนี้ครับ`,
      `คันนี้${pilotUsageAngle(c)}`,
      `จากข้อมูลประกาศ — ราคา ${formatPrice(c.price)} บาท${mileage}`,
      modelCtx,
      "น้องเอแนบการ์ดรถไว้ให้แล้ว พร้อมราคา ไมล์ รูป และจุดเด่นจากประกาศครับ",
      SOFT_VIEWING_CTA,
      LISTING_DISCLAIMER,
    ]
      .filter(Boolean)
      .join("\n\n");
    assertNoHallucinatedVehicleClaim(text);
    return text;
  }

  const label = `${shown[0]!.brand} ${shown[0]!.model}`;
  const lines = shown.map((c, i) => {
    const mileage =
      c.mileage != null && c.mileage > 0
        ? ` ไมล์ ${formatPrice(c.mileage)} กม.`
        : "";
    return `${i + 1}. ${c.brand} ${c.model} ปี ${c.year} — ราคา ${formatPrice(c.price)} บาท${mileage}`;
  });
  const moreHint =
    options.hasMoreCars || cards.length > 3
      ? " ถ้ายังไม่ถูกใจ บอกเงื่อนไขเพิ่มได้ครับ"
      : "";
  const modelCtx = buildGeneralModelContextBlock({
    brand: shown[0]!.brand,
    model: shown[0]!.model,
    year: shown[0]!.year,
    bodyClassLabel: shown[0]!.bodyClassLabel,
  });

  const text = [
    `${options.budgetLead}มีครับ เจอ ${label} อยู่ ${cards.length} คันในตลาดตอนนี้ครับ`,
    modelCtx || `โดยรุ่นนี้${pilotUsageAngle(shown[0]!)}`,
    lines.join("\n"),
    `จากข้อมูลประกาศ น้องเอช่วยเทียบให้ต่อได้ว่าแต่ละคันต่างกันที่ราคา ไมล์ และจุดเด่นอะไรบ้าง ถ้าคุณเน้นคุ้มสุด ไมล์น้อยสุด ครอบครัว หรือนั่งสบาย น้องเอช่วยคัดให้ได้ครับ${moreHint}`,
    SOFT_VIEWING_CTA,
    LISTING_DISCLAIMER,
  ]
    .filter(Boolean)
    .join("\n\n");
  assertNoHallucinatedVehicleClaim(text);
  return text;
}

export function buildBuyerSearchPilotCopy(input: {
  userMessage: string;
  carCardCount: number;
  hasMoreCars?: boolean;
  budgetMax?: number;
  /** When present, summarize matched cars (signed-in pilot path). */
  recentCarCards?: PilotGroundedCarCard[];
}): string {
  const budgetLead = formatBudgetPhrase(input.budgetMax);
  const cards = (input.recentCarCards ?? []).slice(0, 5);
  const count = Math.max(0, cards.length > 0 ? cards.length : input.carCardCount);

  if (count === 0) {
    return `${budgetLead}ตอนนี้ยังไม่เจอรุ่นนี้ในตลาดครับ แต่ถ้ารับรุ่นใกล้เคียงได้ น้องเอช่วยหาแบรนด์ใกล้กัน ปีใกล้กัน งบใกล้กัน หรือรถประเภทเดียวกันให้ได้ครับ\n\n${LISTING_DISCLAIMER}`;
  }

  if (cards.length > 0) {
    return buildRichBuyerSearchFromCards(cards, {
      budgetLead,
      hasMoreCars: input.hasMoreCars,
    });
  }

  // Count-only fallback (no card fields available) — still avoid shallow UI CTAs.
  if (count === 1) {
    return `${budgetLead}มีครับ เจอรถที่ตรงเงื่อนไขอยู่ 1 คันในตลาดตอนนี้ครับ น้องเอแนบการ์ดไว้ให้แล้ว พร้อมราคา ไมล์ รูป และจุดเด่นจากประกาศครับ ${SOFT_VIEWING_CTA}\n\n${LISTING_DISCLAIMER}`;
  }

  if (count === 2) {
    return `${budgetLead}มีครับ เจอรถที่ตรงเงื่อนไขอยู่ 2 คันในตลาดตอนนี้ครับ น้องเอแนบการ์ดให้เทียบกันแล้ว ถ้าคุณเน้นคุ้มสุด ไมล์น้อยสุด ครอบครัว หรือนั่งสบาย น้องเอช่วยคัดให้ได้ครับ ${SOFT_VIEWING_CTA}\n\n${LISTING_DISCLAIMER}`;
  }

  const shown = Math.min(count, 3);
  const moreHint =
    input.hasMoreCars || count > 3
      ? " ถ้ายังไม่ถูกใจ บอกเงื่อนไขเพิ่มได้ครับ"
      : "";

  return `${budgetLead}มีครับ เจอรถที่ตรงเงื่อนไขอยู่ ${shown} คันในตลาดตอนนี้ครับ น้องเอแนบการ์ดให้เทียบกันแล้ว ถ้าอยากได้ใช้งานคุ้ม ๆ หรือเน้นไมล์น้อย น้องเอช่วยเทียบให้ทีละคันได้ครับ${moreHint} ${SOFT_VIEWING_CTA}\n\n${LISTING_DISCLAIMER}`;
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

function pilotCardToChatCarCard(card: PilotGroundedCarCard): ChatCarCardData {
  return {
    id: `pilot-${card.index}-${card.brand}-${card.model}-${card.year}`,
    brand: card.brand,
    model: card.model,
    year: card.year,
    price: card.price,
    mileage: card.mileage ?? 0,
    bodyClass: card.bodyClassLabel ?? "",
    bodyClassLabel: card.bodyClassLabel ?? "",
    description: card.description,
    fuelType: card.fuelType,
    hasImage: false,
    detailPath: "",
    matchKind: "exact",
  };
}

/** v22.56 — deterministic mileage judgment from grounded session cards. */
export function buildBuyerMileageEvaluationPilotCopy(
  cards: PilotGroundedCarCard[],
  userMessage: string
): string {
  if (cards.length === 0) return buildPilotFollowUpNoContextCopy();

  const asChat = cards.map(pilotCardToChatCarCard);
  const stated = extractStatedMileageFromMessage(userMessage);
  if (stated != null) {
    const byMileage = resolveCarsByMileageFact(stated, asChat);
    if (byMileage.length > 1) {
      return buildAmbiguousMileageClarification(byMileage);
    }
    if (byMileage.length === 1) {
      return [
        buildMileageEvaluationReply(byMileage[0]!, { statedMileage: stated }),
        "",
        LISTING_DISCLAIMER,
      ].join("\n");
    }
  }

  const card = cards[0]!;
  return [
    buildMileageEvaluationReply(pilotCardToChatCarCard(card), {
      statedMileage: stated,
    }),
    "",
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
    "ถ้าสนใจคันนี้ เดี๋ยวน้องเอพาไปขั้นตอนยืนยันความสนใจอย่างปลอดภัย โดยคุณลูกค้าเป็นคนกรอกข้อมูลติดต่อเองในขั้นตอนนั้นครับ",
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

function cardListingHasEvBatteryFields(card: PilotGroundedCarCard): boolean {
  const blob = `${card.description ?? ""} ${card.fuelType ?? ""}`;
  return /\d+\s*kWh|ระยะวิ่ง\s*\d+|ประกันแบต|หัวชาร์จ|CCS2|Type\s*2|Wallbox/i.test(blob);
}

/** v6.8E.5 — EV follow-up fallback when real provider blocked; no unsourced kWh/range guesses. */
export function buildBuyerEvPilotCopy(
  cards: PilotGroundedCarCard[],
  cardIndex = 1
): string {
  const selected = resolveCarCardsFromSessionContext(cards, [cardIndex]);
  const card = selected[0] ?? cards[0];
  if (!card) return buildPilotFollowUpNoContextCopy();

  const hasEvFields = cardListingHasEvBatteryFields(card);
  const lines = [
    "จากข้อมูลในประกาศนี้",
    "",
    formatCarLine(card),
    card.fuelType ? `เชื้อเพลิง/ระบบขับ: ${card.fuelType}` : "",
  ];

  if (!hasEvFields) {
    lines.push(
      "ระบบยังไม่มีข้อมูลแบตเตอรี่ ระยะวิ่ง หัวชาร์จ หรือประกันแบตของคันนี้ในรายละเอียดประกาศครับ — น้องเอจะไม่เดา kWh ระยะวิ่ง ค่าชาร์จ หรือเงื่อนไขประกันแบตให้"
    );
  }

  lines.push(
    "",
    "จากความรู้ทั่วไปสำหรับรถไฟฟ้า/EV แนะนำตรวจสุขภาพแบต ประวัติการชาร์จ ระบบชาร์จ (AC/DC, CCS2, Type 2) และทดลองขับจริงครับ",
    "ข้อมูลนี้ไม่ใช่การยืนยันสภาพของรถคันนี้โดยตรง ควรตรวจสภาพและทดลองขับจริงก่อนตัดสินใจครับ",
    "",
    LISTING_DISCLAIMER
  );

  return lines.filter(Boolean).join("\n");
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

  if (isPilotBuyerEvFollowUp(input.userMessage) && sessionCount > 0) {
    return {
      text: buildBuyerEvPilotCopy(sessionCards),
      pilotPathActive: true,
    };
  }

  if (isPilotBuyerDirectCompareFollowUp(input.userMessage) && sessionCount >= 2) {
    const pair = comparePair ?? { a: 1, b: 2 };
    return {
      text: buildBuyerComparePilotCopy(pair, sessionCards),
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

  if (isPilotBuyerMileageFollowUp(input.userMessage) && sessionCount > 0) {
    return {
      text: buildBuyerMileageEvaluationPilotCopy(sessionCards, input.userMessage),
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
        recentCarCards: sessionCards,
      }),
      pilotPathActive: true,
    };
  }

  if (followUp && sessionCount > 0 && isPilotBuyerDirectCompareFollowUp(input.userMessage)) {
    return {
      text: buildBuyerComparePilotCopy(
        comparePair ?? { a: 1, b: Math.min(2, sessionCount) },
        sessionCards
      ),
      pilotPathActive: true,
    };
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
