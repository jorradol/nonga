/** v5.4.3 — deterministic buyer facts-only Q&A from listing fields */

import type { ChatCarCardData } from "../../../types";
import {
  extractSelectedCarId,
  loadChatCarContext,
  loadLastSelectedCarId,
  loadRecentlyViewedCarIds,
} from "../../../utils/chatCarContext";
import { isMarketplaceSearchIntent } from "./marketplaceChatSearch";
import {
  summaryToChatCarCardData,
  toChatCarSummary,
  type ChatInventoryCar,
} from "./marketplaceChatSearch";
import { CHAT_CONFIRM_CREATE_DRAFT_ACTION } from "./chatDraftActions";
import { CHAT_MEMBER_PUBLISH_LISTING_ACTION } from "../../chat/chatSavedMemberListing";
import { CHAT_MEMBER_CONFIRM_PUBLISH_ACTION } from "../../chat/publishMemberListingFromChat";

export type BuyerFactsQuestionKind =
  | "summary"
  | "suitableFor"
  | "priceOutlook"
  | "highlights"
  | "prePurchaseCheck"
  | "imageCount"
  | "specField"
  | "unknownHistory"
  | "none";

export type BuyerFactsSpecField =
  | "transmission"
  | "color"
  | "mileage"
  | "year"
  | "price";

export interface BuyerFactsReplyContext {
  peerCars?: ChatCarCardData[];
  userMessage?: string;
}

export const BUYER_FACTS_NO_DATA =
  "ยังไม่มีข้อมูลนี้ในระบบครับ";

export const BUYER_ASK_SELECT_CAR_FIRST =
  "ลุงช่วยกดดูรายละเอียดรถคันที่สนใจก่อน แล้วถามน้องเออีกครั้งได้เลยครับ";

const SELLER_ACTION_EXACT = new Set([
  CHAT_CONFIRM_CREATE_DRAFT_ACTION,
  CHAT_MEMBER_PUBLISH_LISTING_ACTION,
  CHAT_MEMBER_CONFIRM_PUBLISH_ACTION,
  "บันทึกประกาศ",
  "แก้ไขข้อมูล",
  "เพิ่มรูปภาพ",
  "เริ่มใหม่",
]);

function formatPrice(n: number): string {
  return n.toLocaleString("th-TH");
}

function carLabel(car: ChatCarCardData): string {
  return `${car.brand} ${car.model} ปี ${car.year}`.trim();
}

function imageCount(car: ChatCarCardData): number {
  const urls = (car.imageUrls ?? []).filter((u) => typeof u === "string" && u.trim());
  if (urls.length > 0) return urls.length;
  return car.hasImage && car.imageUrl?.trim() ? 1 : 0;
}

export function detectBuyerFactsSpecField(message: string): BuyerFactsSpecField | null {
  const t = message.trim();
  if (/เกียร์/.test(t)) return "transmission";
  if (/สี(อะไร|เป็น|ยังไง|เท่า)/.test(t) || /(คันนี้|รถคันนี้).*สี/.test(t)) return "color";
  if (/ไมล์/.test(t)) return "mileage";
  if (/ปี(อะไร|เท่า|กี่|เป็น)/.test(t)) return "year";
  if (/ราคา(เท่า|กี่|เท่าไ|เป็น)/.test(t) && !/แรง|ถูก|แพง|คุ้ม|ดีไหม/.test(t)) {
    return "price";
  }
  return null;
}

export function classifyBuyerFactsQuestion(message: string): BuyerFactsQuestionKind {
  const t = message.trim();
  if (!t) return "none";
  if (SELLER_ACTION_EXACT.has(t)) return "none";

  if (
    /ชน|ถูกชน|เคยชน|น้ำท่วม|flood|เข้าศูนย์|ศูนย์บริการ|service history|มือ(เดียว|หนึ่ง|แรก)|เจ้าของ(คน|เดียว|แรก)|ประกัน|รับประกัน|ไฟแนนซ์|ผ่อ(น|ได้)|สภาพเครื่อง|เครื่องยนต์(ดี|เงียบ)|ช่วงล่าง(ดี|พัง)/i.test(
      t
    )
  ) {
    return "unknownHistory";
  }

  if (/มีรูปกี่|กี่รูป|รูปกี่/.test(t)) return "imageCount";

  if (/ราคา(แรง|ถูก|แพง|คุ้ม|ดี)(ไหม|มั้ย|หรือ)|แพงไหม|ถูกไหม|คุ้มไหม|ราคาแรง/i.test(t)) {
    return "priceOutlook";
  }

  const spec = detectBuyerFactsSpecField(t);
  if (spec) return "specField";

  if (/จุดเด่น/.test(t)) return "highlights";

  if (/(ควร|ต้อง)(ดู|เช็ค|ตรวจ)|ก่อนซื้อ|ซื้อ(ควร|ต้อง)/.test(t)) {
    return "prePurchaseCheck";
  }

  if (/(ช่วย)?สรุป(คันนี้|รถคันนี้|ให้)|สรุปให้(หน่อย)?/i.test(t)) {
    return "summary";
  }

  if (/เหมาะกับใคร|เหมาะ(กับ)?(ใคร|แบบไหน)/.test(t)) {
    return "suitableFor";
  }

  if (
    isMarketplaceSearchIntent(message) &&
    !/คันนี้|คันนั้น|รถคันนี้/.test(t)
  ) {
    return "none";
  }

  return "none";
}

export function resolveTargetBuyerCar(
  message: string,
  inventory: ChatInventoryCar[],
  contextCars: ChatCarCardData[] = loadChatCarContext()
): ChatCarCardData | null {
  let selectedId = extractSelectedCarId(message);
  if (!selectedId) selectedId = loadLastSelectedCarId();
  if (!selectedId) {
    const viewed = loadRecentlyViewedCarIds();
    if (viewed.length > 0) selectedId = viewed[0];
  }
  if (!selectedId) return null;

  const fromContext = contextCars.find((c) => c.id === selectedId);
  if (fromContext) return fromContext;

  const inv = inventory.find((c) => c.id === selectedId);
  if (inv) return summaryToChatCarCardData(toChatCarSummary(inv), "exact");

  return null;
}

function buildUnknownHistoryReply(): string {
  return [
    `${BUYER_FACTS_NO_DATA}`,
    "ข้อมูลประวัติรถ สภาพจริง หรือการชน/น้ำท่วม ไม่ได้อยู่ในประกาศนี้",
    "แนะนำให้ตรวจเล่มทะเบียน ดูรถจริง และให้ช่างตรวจสภาพก่อนตัดสินใจครับ",
  ].join("\n");
}

function buildPriceOutlookReply(
  car: ChatCarCardData,
  peerCars: ChatCarCardData[]
): string {
  const peers = peerCars.filter(
    (p) =>
      p.id !== car.id &&
      p.brand.toLowerCase() === car.brand.toLowerCase() &&
      p.model.toLowerCase() === car.model.toLowerCase() &&
      p.price > 0
  );

  const header = `${carLabel(car)} ราคา ${formatPrice(car.price)} บาท (จากข้อมูลในระบบ)`;

  if (peers.length === 0) {
    return [
      header,
      "ยังไม่มีข้อมูลเทียบราคาเพียงพอในระบบครับ",
      "น้องเอไม่สามารถฟันธงว่าแพงหรือถูกได้โดยไม่มีรายการเปรียบเทียบในระบบ",
    ].join("\n");
  }

  const prices = peers.map((p) => p.price);
  const minPeer = Math.min(...prices);
  const maxPeer = Math.max(...prices);

  let note = `ในรายการที่มีในระบบตอนนี้ มี ${car.brand} ${car.model} อีก ${peers.length} คัน ราคาประมาณ ${formatPrice(minPeer)}–${formatPrice(maxPeer)} บาท`;
  if (car.price <= minPeer) note += " — คันนี้อยู่ช่วงราคาต่ำกว่าหรือเท่ากับคันอื่นในระบบ";
  else if (car.price >= maxPeer) note += " — คันนี้อยู่ช่วงราคาสูงกว่าหรือเท่ากับคันอื่นในระบบ";
  else note += " — คันนี้อยู่ช่วงกลางเมื่อเทียบกับคันอื่นในระบบ";

  return [
    header,
    note,
    "เป็นการเปรียบเทียบจากข้อมูลประกาศในระบบเท่านั้น ไม่ใช่ราคาตลาดภายนอกครับ",
  ].join("\n");
}

function buildSuitableForReply(car: ChatCarCardData): string {
  const hints: string[] = [];
  const body = car.bodyClassLabel || "รถ";

  if (/SUV|Crossover|MPV|Pickup/i.test(body)) {
    hints.push("ครอบครัวหรือคนที่ต้องการพื้นที่/ที่นั่งหลายที่นั่ง");
  } else if (/Sedan/i.test(body)) {
    hints.push("ใช้งานในเมือง/ทำงานประจำ เน้นขับสะดวก");
  } else {
    hints.push(`ผู้ที่มองหา${body} ตามสเปกในระบบ`);
  }

  if (car.price > 0 && car.price <= 500_000) hints.push("ผู้ที่ควบคุมงบ");
  if (car.mileage > 0 && car.mileage < 50_000) hints.push("ผู้ที่อยากได้เลขไมล์ไม่สูง (ตามที่ระบุในระบบ)");
  if (car.year >= new Date().getFullYear() - 4) hints.push("ผู้ที่อยากได้ปีค่อนข้างใหม่ (ตามที่ระบุในระบบ)");
  if (car.transmission?.includes("AT") || car.transmission?.includes("ออโต")) {
    hints.push("ผู้ที่ชอบขับเกียร์อัตโนมัติ (ตามที่ระบุในระบบ)");
  }

  return [
    `จากข้อมูลที่มีในระบบ ${carLabel(car)} (${body})`,
    `เหมาะกับ: ${hints.join(", ")}`,
    "เป็นการสรุปจากสเปกที่ลงประกาศเท่านั้น ไม่ได้ประเมินสภาพหรือประวัติรถจริงครับ",
  ].join("\n");
}

function buildHighlightsReply(car: ChatCarCardData): string {
  const lines: string[] = [`จุดที่เห็นได้จากข้อมูลประกาศของ ${carLabel(car)}:`];

  if (car.description?.trim()) {
    lines.push(`จากรายละเอียดประกาศ: ${car.description.trim().slice(0, 400)}`);
  }

  const facts: string[] = [];
  if (car.price > 0) facts.push(`ราคา ${formatPrice(car.price)} บาท`);
  if (car.mileage > 0) facts.push(`เลขไมล์ ${formatPrice(car.mileage)} กม.`);
  if (car.year) facts.push(`ปี ${car.year}`);
  if (car.transmission) facts.push(car.transmission);
  if (car.color) facts.push(`สี${car.color}`);
  if (car.bodyClassLabel) facts.push(car.bodyClassLabel);
  const imgs = imageCount(car);
  if (imgs > 0) facts.push(`มีรูปในระบบ ${imgs} รูป`);

  if (facts.length > 0) {
    lines.push(`ข้อมูลสเปก: ${facts.join(" · ")}`);
  }

  if (!car.description?.trim() && facts.length === 0) {
    return BUYER_FACTS_NO_DATA;
  }

  lines.push("น้องเอไม่อ้างสภาพดีหรือประวัติดี เพราะไม่มีในระบบครับ");
  return lines.join("\n");
}

function buildPrePurchaseReply(car: ChatCarCardData): string {
  return [
    `ก่อนตัดสินใจซื้อ ${carLabel(car)} แนะนำตรวจเพิ่มเติม (ข้อมูลเหล่านี้ยังไม่มีในประกาศ ต้องตรวจเอง):`,
    "• เล่มทะเบียนและเอกสารโอน",
    "• เลขไมล์และความสอดคล้องกับสภาพรถ",
    "• สภาพเครื่องยนต์ ช่วงล่าง และสนิม",
    "• ประวัติซ่อม/เข้าศูนย์ (ถ้ามีเอกสาร)",
    "• ทดลองขับและตรวจสภาพกับช่าง",
    `ข้อมูลในระบบตอนนี้: ราคา ${car.price > 0 ? `${formatPrice(car.price)} บาท` : BUYER_FACTS_NO_DATA}${car.mileage > 0 ? ` · ไมล์ ${formatPrice(car.mileage)} กม.` : ""}`,
  ].join("\n");
}

function buildSummaryReply(car: ChatCarCardData): string {
  const parts = [
    `สรุปจากข้อมูลในระบบ: ${carLabel(car)}`,
    car.price > 0 ? `ราคา ${formatPrice(car.price)} บาท` : null,
    car.mileage > 0 ? `เลขไมล์ ${formatPrice(car.mileage)} กม.` : null,
    car.color ? `สี${car.color}` : null,
    car.transmission ?? null,
    car.bodyClassLabel ? `ประเภท ${car.bodyClassLabel}` : null,
    imageCount(car) > 0 ? `มีรูป ${imageCount(car)} รูปในระบบ` : "ยังไม่มีรูปในระบบ",
    car.showroomName ? `จาก ${car.showroomName}` : null,
  ].filter(Boolean);

  return [
    parts.join(" · "),
    car.description?.trim()
      ? `รายละเอียดประกาศ: ${car.description.trim().slice(0, 350)}`
      : null,
    "สรุปจากข้อมูลที่ลงประกาศเท่านั้น ไม่ได้ประเมินสภาพหรือประวัติรถจริงครับ",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildSpecFieldReply(
  car: ChatCarCardData,
  field: BuyerFactsSpecField | null
): string {
  if (!field) return BUYER_FACTS_NO_DATA;

  switch (field) {
    case "transmission":
      return car.transmission
        ? `${carLabel(car)} — เกียร์: ${car.transmission} (จากข้อมูลในระบบ)`
        : BUYER_FACTS_NO_DATA;
    case "color":
      return car.color
        ? `${carLabel(car)} — สี: ${car.color} (จากข้อมูลในระบบ)`
        : BUYER_FACTS_NO_DATA;
    case "mileage":
      return car.mileage > 0
        ? `${carLabel(car)} — เลขไมล์ ${formatPrice(car.mileage)} กม. (จากข้อมูลในระบบ)`
        : BUYER_FACTS_NO_DATA;
    case "year":
      return car.year
        ? `${carLabel(car)} — ปี ${car.year} (จากข้อมูลในระบบ)`
        : BUYER_FACTS_NO_DATA;
    case "price":
      return car.price > 0
        ? `${carLabel(car)} — ราคา ${formatPrice(car.price)} บาท (จากข้อมูลในระบบ)`
        : BUYER_FACTS_NO_DATA;
    default:
      return BUYER_FACTS_NO_DATA;
  }
}

export function buildBuyerFactsReply(
  car: ChatCarCardData,
  kind: Exclude<BuyerFactsQuestionKind, "none">,
  context: BuyerFactsReplyContext = {}
): string {
  const peerCars = context.peerCars ?? [];

  switch (kind) {
    case "summary":
      return buildSummaryReply(car);
    case "suitableFor":
      return buildSuitableForReply(car);
    case "priceOutlook":
      return buildPriceOutlookReply(car, peerCars);
    case "highlights":
      return buildHighlightsReply(car);
    case "prePurchaseCheck":
      return buildPrePurchaseReply(car);
    case "imageCount": {
      const count = imageCount(car);
      return count > 0
        ? `${carLabel(car)} — มีรูปในระบบ ${count} รูป`
        : `${carLabel(car)} — ยังไม่มีรูปในระบบ`;
    }
    case "specField":
      return buildSpecFieldReply(
        car,
        detectBuyerFactsSpecField(context.userMessage ?? "")
      );
    case "unknownHistory":
      return buildUnknownHistoryReply();
    default:
      return BUYER_FACTS_NO_DATA;
  }
}
