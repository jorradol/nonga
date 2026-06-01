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
import {
  buildHighlightsOpening,
  buildNoDataPhrase,
  buildPrePurchaseOpening,
  buildSuitableForOpening,
  buildSummaryOpening,
  buildUnknownHistoryReply,
} from "./thaiSalesCopyVariation";
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
  "ข้อมูลส่วนนี้ระบบยังไม่มีนะครับ";

export const BUYER_ASK_SELECT_CAR_FIRST =
  "ช่วยกดดูรายละเอียดรถคันที่สนใจในแชทก่อนนะครับ แล้วถามน้องเออีกครั้งได้เลยครับ";

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

  if (
    /(ควร|ต้อง)(ดู|เช็ค|ตรวจ)|ก่อนซื้อ/.test(t) &&
    !/ซื้อรถมือสอง(?:ต้อง|ควร)ดู|ซื้อมือสอง(?:ต้อง|ควร)เช็ค/i.test(t)
  ) {
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

function buildUnknownHistoryReplyForCar(car: ChatCarCardData): string {
  return buildUnknownHistoryReply(car.id);
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

  const factParts = [
    car.price > 0 ? `ราคา ${formatPrice(car.price)} บาท` : null,
    car.year ? `ปี ${car.year}` : null,
    car.mileage > 0 ? `เลขไมล์ ${formatPrice(car.mileage)} กม.` : null,
  ].filter(Boolean);

  if (peers.length === 0) {
    return [
      "ตอนนี้ระบบยังไม่มีข้อมูลเทียบราคาตลาดมากพอให้ฟันธงว่าถูกหรือแพงครับ",
      factParts.length > 0
        ? `จากข้อมูลคันนี้ ${factParts.join(" · ")}`
        : `${carLabel(car)} (จากข้อมูลในระบบ)`,
      "ถ้าจะประเมินให้แม่นขึ้น ควรเทียบกับรุ่น ปี และเลขไมล์ใกล้เคียงอีก 2–3 คันครับ",
      "น้องเอยังไม่อยากฟันธงเกินข้อมูลที่มีครับ",
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
    factParts.length > 0
      ? `จากข้อมูลที่มี ${carLabel(car)} — ${factParts.join(" · ")}`
      : `${carLabel(car)} (จากข้อมูลในระบบ)`,
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
    hints.push("ใช้งานประจำวัน ขับง่าย และดูแลง่าย");
  } else {
    hints.push(`ผู้ที่มองหา${body} ตามสเปกในระบบ`);
  }

  if (car.price > 0 && car.price <= 500_000) hints.push("ผู้ที่ควบคุมงบ");
  if (car.mileage > 0 && car.mileage < 50_000) {
    hints.push("ผู้ที่อยากได้เลขไมล์ไม่สูง (ตามที่ระบุในระบบ)");
  }
  if (car.year >= new Date().getFullYear() - 4) {
    hints.push("ผู้ที่อยากได้ปีค่อนข้างใหม่ (ตามที่ระบุในระบบ)");
  }
  if (car.transmission?.includes("AT") || car.transmission?.includes("ออโต")) {
    hints.push("ผู้ที่ชอบขับเกียร์อัตโนมัติ (ตามที่ระบุในระบบ)");
  }

  const specNotes: string[] = [];
  if (car.year) specNotes.push(`ปี ${car.year}`);
  if (car.price > 0) specNotes.push(`ราคา ${formatPrice(car.price)} บาท`);
  if (car.mileage > 0) specNotes.push(`เลขไมล์ ${formatPrice(car.mileage)} กม.`);
  if (car.transmission) specNotes.push(car.transmission);

  return [
    buildSuitableForOpening(car, hints[0] ?? "รถตามสเปกในระบบ"),
    hints.length > 1 ? `มุมใช้งานเพิ่มเติม: ${hints.slice(1).join(", ")}` : null,
    specNotes.length > 0
      ? `จุดที่น่าสนใจจากประกาศ: ${specNotes.join(" · ")} (${body})`
      : null,
    "แต่ข้อมูลเรื่องประวัติซ่อม อุบัติเหตุ หรือน้ำท่วม ระบบยังไม่มีนะครับ",
    "ถ้าสนใจจริง แนะนำให้ตรวจเอกสารกับดูรถจริงอีกชั้น จะอุ่นใจกว่าครับ",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildHighlightsReply(car: ChatCarCardData): string {
  const lines: string[] = [buildHighlightsOpening(car)];

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

  lines.push("น้องเอยังไม่อ้างสภาพดีหรือประวัติดี เพราะไม่มีในระบบครับ");
  return lines.join("\n");
}

function buildPrePurchaseReply(car: ChatCarCardData): string {
  return [
    buildPrePurchaseOpening(car),
    "• เล่มทะเบียนและเอกสารโอน",
    "• เลขไมล์และความสอดคล้องกับสภาพรถ",
    "• สภาพเครื่องยนต์ ช่วงล่าง และสนิม",
    "• ประวัติซ่อม/เข้าศูนย์ (ถ้ามีเอกสาร)",
    "• ทดลองขับและตรวจสภาพกับช่าง",
    "ข้อมูลเหล่านี้ยังไม่มีในประกาศ ต้องตรวจเพิ่มเติมครับ",
    `จากข้อมูลในระบบตอนนี้: ราคา ${car.price > 0 ? `${formatPrice(car.price)} บาท` : BUYER_FACTS_NO_DATA}${car.mileage > 0 ? ` · ไมล์ ${formatPrice(car.mileage)} กม.` : ""}`,
    "แนะนำให้ดูรถจริงหรือให้ช่างช่วยเช็กอีกชั้น จะอุ่นใจกว่าครับ",
  ].join("\n");
}

function buildSummaryReply(car: ChatCarCardData): string {
  const facts = [
    car.price > 0 ? `ราคา ${formatPrice(car.price)} บาท` : null,
    car.mileage > 0 ? `เลขไมล์ ${formatPrice(car.mileage)} กม.` : null,
    car.color ? `สี${car.color}` : null,
    car.transmission ?? null,
    car.bodyClassLabel ? `ประเภท ${car.bodyClassLabel}` : null,
    imageCount(car) > 0 ? `มีรูป ${imageCount(car)} รูปในระบบ` : "ยังไม่มีรูปในระบบ",
    car.showroomName ? `จาก ${car.showroomName}` : null,
  ].filter(Boolean);

  return [
    buildSummaryOpening(car),
    facts.length > 0 ? facts.join(" · ") : null,
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
  const noData = buildNoDataPhrase(car.id, "spec.missing");
  if (!field) return noData;

  switch (field) {
    case "transmission":
      return car.transmission
        ? `จากข้อมูลที่มี ${carLabel(car)} — เกียร์ ${car.transmission} ครับ`
        : noData;
    case "color":
      return car.color
        ? `จากข้อมูลที่มี ${carLabel(car)} — สี${car.color} ครับ`
        : noData;
    case "mileage":
      return car.mileage > 0
        ? `จากข้อมูลที่มี ${carLabel(car)} — เลขไมล์ ${formatPrice(car.mileage)} กม. ครับ`
        : noData;
    case "year":
      return car.year
        ? `จากข้อมูลที่มี ${carLabel(car)} — ปี ${car.year} ครับ`
        : noData;
    case "price":
      return car.price > 0
        ? `จากข้อมูลที่มี ${carLabel(car)} — ราคา ${formatPrice(car.price)} บาท ครับ`
        : noData;
    default:
      return noData;
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
        ? [
            `คันนี้มีรูปในระบบ ${count} รูปครับ`,
            "กดดูรายละเอียดในแชทเพื่อไล่ดูภาพประกอบได้เลย",
            "ถ้าสนใจจริง แนะนำให้ขอรูปจุดสำคัญเพิ่ม เช่น ห้องเครื่อง ภายใน ช่วงล่าง และเล่มทะเบียนประกอบการตัดสินใจครับ",
          ].join("\n")
        : `${carLabel(car)} — ยังไม่มีรูปในระบบครับ`;
    }
    case "specField":
      return buildSpecFieldReply(
        car,
        detectBuyerFactsSpecField(context.userMessage ?? "")
      );
    case "unknownHistory":
      return buildUnknownHistoryReplyForCar(car);
    default:
      return BUYER_FACTS_NO_DATA;
  }
}
