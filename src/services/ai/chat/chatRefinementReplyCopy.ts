/**
 * v6.2E.4 — Grounded refine follow-up copy from recent car cards (no invented fuel stats).
 */
import type { ChatCarCardData } from "../../../types";
import type { BuyerRefinementKind } from "./chatPilotBuyerFollowUp";
import type { PilotGroundedCarCard } from "./chatPilotSessionContext";

const LISTING_DISCLAIMER =
  "นี่เป็นการแนะนำเบื้องต้นจากข้อมูลประกาศในระบบนะครับ ยังไม่ได้ตรวจสภาพรถจริง และไม่ได้ฟันธงว่าคันไหนเหมาะที่สุดโดยไม่มีข้อมูลเพิ่ม";

const FUEL_DESC_HINT =
  /ประหยัด(?:น้ำมัน)?|กิน(?:น้ำมัน)?(?:น้อย|เบา)|eco|economy/i;

/** Positive-only fuel claims — used in tests, not runtime guard (negated copy is allowed). */
export const FORBIDDEN_POSITIVE_FUEL_CLAIM =
  /(?:\d+\s*(?:km\/l|กม\.\/ลิตร)|(?<!ไม่)ประหยัดแน่นอน(?!\s*จาก)|กินน้ำมันน้อยแน่นอน)/i;

function formatPrice(n: number): string {
  return n.toLocaleString("th-TH");
}

function carLine(c: ChatCarCardData): string {
  const mileage =
    c.mileage > 0 ? ` ไมล์ ${formatPrice(c.mileage)} กม.` : "";
  const body = c.bodyClassLabel ? ` (${c.bodyClassLabel})` : "";
  return `${c.brand} ${c.model} ปี ${c.year} — ราคา ${formatPrice(c.price)} บาท${mileage}${body}`;
}

function cardBlob(c: ChatCarCardData): string {
  return [c.brand, c.model, c.bodyClassLabel, c.fuelType, c.condition, c.description]
    .filter(Boolean)
    .join(" ");
}

function isCompactBody(label: string): boolean {
  return /sedan|hatchback|hatch/i.test(label);
}

function isHeavyBody(label: string): boolean {
  return /suv|mpv|pickup|กระบะ|ครอส|crossover/i.test(label);
}

interface FuelRefineRank {
  card: ChatCarCardData;
  score: number;
  reason: string;
}

export function scoreFuelRefineCandidate(card: ChatCarCardData): FuelRefineRank {
  let score = 0;
  const reasons: string[] = [];
  const label = card.bodyClassLabel ?? "";
  const fuel = String(card.fuelType ?? "").toLowerCase();
  const blob = cardBlob(card);

  if (isCompactBody(label)) {
    score += 22;
    reasons.push("ตัวถังขนาดกะทัดรัด เหมาะมุมประหยัดน้ำมันเมื่อเทียบในชุดนี้");
  }
  if (/hybrid|electric|ev|ไฮบริด|ไฟฟ้า/.test(fuel)) {
    score += 20;
    reasons.push("ประกาศระบุระบบขับที่มักนำมาพิจารณามุมประหยัด — ควรดูรายละเอียดในการ์ด");
  }
  if (FUEL_DESC_HINT.test(blob)) {
    score += 16;
    reasons.push("คำอธิบายประกาศเน้นแนวประหยัด — ควรทดลองขับและเทียบการใช้งานจริง");
  }
  if (card.mileage > 0 && card.mileage < 80_000) {
    score += 6;
    reasons.push("เลขไมล์ตามประกาศไม่สูงเมื่อเทียบในชุดนี้");
  }
  if (isHeavyBody(label)) {
    score -= 10;
    reasons.push("ตัวถังใหญ่กว่าในชุดนี้ — มุมประหยัดน้ำมันอาจไม่เด่นเท่าคันกะทัดรัด");
  }

  if (reasons.length === 0) {
    reasons.push("ดูต่อจากประเภทรถ ปี เลขไมล์ และรายละเอียดในการ์ด");
  }

  return {
    card,
    score,
    reason: reasons[0],
  };
}

export function hasFuelListingSignals(cards: ChatCarCardData[]): boolean {
  return cards.some((c) => scoreFuelRefineCandidate(c).score > 8);
}

export function buildRefinementNoContextCopy(kind?: BuyerRefinementKind): string {
  if (kind === "fuel") {
    return [
      "น้องเอยังไม่เห็นชุดรถล่าสุดให้เทียบมุมประหยัดน้ำมันในแชทนี้ครับ",
      "ลองพิมพ์งบหรือเงื่อนไขรถที่อยากได้ก่อน เช่น “งบ 4 แสน มีรถอะไรน่าเล่น”",
      "จากนั้นค่อยพิมพ์ “เอาประหยัดน้ำมัน” หรือ “เทียบคันที่ 1 กับ 2” ได้ครับ",
    ].join("\n");
  }
  return [
    "น้องเอยังไม่เห็นชุดรถล่าสุดให้เทียบในแชทนี้ครับ",
    "ลองพิมพ์งบหรือเงื่อนไขรถที่อยากได้ก่อน เช่น “งบ 4 แสน มีรถอะไรน่าเล่น”",
    "จากนั้นค่อยพิมพ์ “เทียบคันที่ 1 กับ 2” ได้ครับ",
  ].join("\n");
}

export function buildFuelEconomyRefineReplyCopy(cards: ChatCarCardData[]): string {
  if (cards.length === 0) {
    return buildRefinementNoContextCopy("fuel");
  }

  const ranked = [...cards]
    .map(scoreFuelRefineCandidate)
    .sort((a, b) => b.score - a.score || a.card.price - b.card.price);

  const listingLines = ranked.map(
    (r, i) => `${i + 1}. ${carLine(r.card)} — ${r.reason}`
  );

  const hasSignals = hasFuelListingSignals(cards);
  const insufficientNote = hasSignals
    ? ""
    : "ข้อมูลประกาศยังไม่พอสำหรับฟันธงเรื่องอัตราสิ้นเปลือง — แนะนำตรวจข้อมูลอัตราสิ้นเปลืองจริงก่อนตัดสินใจครับ";

  const body = [
    "ถ้าเน้นประหยัดน้ำมัน น้องเอขอเทียบจากข้อมูลประกาศที่มีตอนนี้ก่อนนะครับ",
    "",
    `จาก ${cards.length} คันที่เพิ่งแสดงอยู่ น้องเอช่วยจัดแนวจากสิ่งที่ประกาศระบุได้เท่านั้น:`,
    "",
    ...listingLines,
    "",
    insufficientNote,
    "น้องเอไม่แต่งตัวเลขอัตรากินน้ำมัน และไม่ฟันธงว่าคันไหนประหยัดแน่นอนจากข้อมูลนี้คนเดียว",
    "ลองกดดูการ์ดด้านล่าง หรือพิมพ์ “เทียบคันที่ 1 กับ 2” ถ้าอยากให้น้องเอช่วยเทียบให้ชัดขึ้นครับ",
    "",
    LISTING_DISCLAIMER,
  ]
    .filter((line) => line !== "")
    .join("\n");

  return body;
}

function pilotToChatCard(c: PilotGroundedCarCard): ChatCarCardData {
  return {
    id: `pilot-refine-${c.index}`,
    brand: c.brand,
    model: c.model,
    year: c.year,
    price: c.price,
    mileage: c.mileage ?? 0,
    fuelType: c.fuelType,
    bodyClassLabel: c.bodyClassLabel ?? "",
    color: "",
    condition: "",
    transmission: "",
    bodyClass: "",
    imageUrl: "",
    imageUrls: [],
    hasImage: false,
    detailPath: "",
    matchKind: "exact",
    ...(c.description ? { description: c.description } : {}),
  };
}

export function buildFamilyRefineReplyCopy(cards: ChatCarCardData[]): string {
  if (cards.length === 0) return buildRefinementNoContextCopy("family");
  const lines = cards.slice(0, 3).map((c, i) => `${i + 1}. ${carLine(c)}`);
  return [
    "ถ้าเน้นรถครอบครัว น้องเอขอเทียบจากข้อมูลประกาศที่มีตอนนี้ก่อนนะครับ",
    "",
    ...lines,
    "",
    "แนะนำดูประเภทรถ จำนวนที่นั่ง และเลขไมล์เทียบปีจากข้อมูลประกาศครับ",
    "ลองกดดูการ์ดด้านล่าง หรือพิมพ์ “เทียบคันที่ 1 กับ 2” ได้ครับ",
    "",
    LISTING_DISCLAIMER,
  ].join("\n");
}

export function buildInstallmentRefineReplyCopy(cards: ChatCarCardData[]): string {
  if (cards.length === 0) return buildRefinementNoContextCopy("installment");
  const lines = cards.slice(0, 3).map((c, i) => `${i + 1}. ${carLine(c)}`);
  return [
    "ถ้าเน้นผ่อนเบื้องต้น น้องเอขอเทียบจากราคาในการ์ดที่เพิ่งแสดงก่อนนะครับ",
    "",
    ...lines,
    "",
    "ค่างวดจริงขึ้นกับดาวน์ ระยะผ่อน และเงื่อนไขไฟแนนซ์ — น้องเอไม่ฟันธงค่างวดโดยไม่มีข้อมูลครบ",
    "",
    LISTING_DISCLAIMER,
  ].join("\n");
}

export function buildRefinementFollowUpReplyCopy(
  kind: BuyerRefinementKind,
  cards: ChatCarCardData[]
): string {
  if (kind === "fuel") return buildFuelEconomyRefineReplyCopy(cards);
  if (kind === "family") return buildFamilyRefineReplyCopy(cards);
  return buildInstallmentRefineReplyCopy(cards);
}

export function buildPilotFuelEconomyRefineReplyCopy(
  cards: PilotGroundedCarCard[]
): string {
  return buildFuelEconomyRefineReplyCopy(cards.map(pilotToChatCard));
}

export function buildPilotRefinementFollowUpReplyCopy(
  kind: BuyerRefinementKind,
  cards: PilotGroundedCarCard[]
): string {
  return buildRefinementFollowUpReplyCopy(kind, cards.map(pilotToChatCard));
}
