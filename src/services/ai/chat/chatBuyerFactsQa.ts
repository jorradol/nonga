/** v5.4.3 — deterministic buyer facts-only Q&A from listing fields */

import type { ChatCarCardData } from "../../../types";
import {
  extractSelectedCarId,
  loadChatCarContext,
  loadRecentlyViewedCarIds,
  resolveSelectedCarIdState,
} from "../../../utils/chatCarContext";
import { detectBuyerAdvisorTopic } from "./chatBuyerAdvisorTemplates";
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

/** v22.56 — judgment about mileage (high/ok?) vs bare "เลขไมล์เท่าไหร่" lookup. */
export function isBuyerMileageEvaluationQuestion(message: string): boolean {
  const t = message.trim();
  if (!t) return false;
  if (
    /(?:ไมล์|เลขไมล์|วิ่ง).{0,40}(?:เยอะ|น้อย|สูง|ต่ำ|มาก|โอเค|ok|น่ากลัว|ผิดปกติ|พอดี|เหมาะสม)/i.test(
      t
    )
  ) {
    return true;
  }
  if (
    /(?:เยอะ|น้อย|สูง).{0,10}(?:ไหม|มั้ย|หรือเปล่า|ไปไหม)/i.test(t) &&
    /(?:ไมล์|เลขไมล์|วิ่ง|กม\.?)/i.test(t)
  ) {
    return true;
  }
  if (/เลขไมล์คันนี้|คันนี้วิ่ง|วิ่งเยอะ|ไมล์เท่านี|ไมล์(?:คันนี้)?โอเค/i.test(t)) {
    return true;
  }
  return false;
}

const THAI_DIGIT_MAP: Record<string, string> = {
  "๐": "0",
  "๑": "1",
  "๒": "2",
  "๓": "3",
  "๔": "4",
  "๕": "5",
  "๖": "6",
  "๗": "7",
  "๘": "8",
  "๙": "9",
};

const THAI_MILEAGE_WORDS: Array<{ re: RegExp; value: number }> = [
  { re: /หนึ่งแสน|แสนหนึ่ง|1\s*แสน/, value: 100_000 },
  { re: /เก้าหมื่น|9\s*หมื่น/, value: 90_000 },
  { re: /แปดหมื่น|8\s*หมื่น/, value: 80_000 },
  { re: /เจ็ดหมื่น|7\s*หมื่น/, value: 70_000 },
  { re: /หกหมื่น|6\s*หมื่น/, value: 60_000 },
  { re: /ห้าหมื่น|5\s*หมื่น/, value: 50_000 },
  { re: /สี่หมื่น|4\s*หมื่น/, value: 40_000 },
  { re: /สามหมื่น|3\s*หมื่น/, value: 30_000 },
  { re: /สองหมื่น|2\s*หมื่น/, value: 20_000 },
  { re: /หนึ่งหมื่น|หมื่นหนึ่ง|1\s*หมื่น/, value: 10_000 },
];

function normalizeDigits(raw: string): string {
  return raw.replace(/[๐-๙]/g, (ch) => THAI_DIGIT_MAP[ch] ?? ch).replace(/,/g, "");
}

/** Extract a stated mileage figure from Thai buyer follow-ups (comma / Thai digits / หมื่น). */
export function extractStatedMileageFromMessage(message: string): number | null {
  const t = message.trim();
  if (!t) return null;
  for (const { re, value } of THAI_MILEAGE_WORDS) {
    if (re.test(t)) return value;
  }
  const withUnit = t.match(
    /(?:ไมล์|เลขไมล์|วิ่ง|กม\.?)\s*[:=]?\s*([0-9๐-๙][0-9๐-๙,]{2,})/i
  );
  if (withUnit) {
    const n = Number(normalizeDigits(withUnit[1]));
    if (Number.isFinite(n) && n >= 1000) return Math.round(n);
  }
  const bare = t.match(/\b([0-9๐-๙]{1,3}(?:,[0-9๐-๙]{3})+)\b/);
  if (bare) {
    const n = Number(normalizeDigits(bare[1]));
    if (Number.isFinite(n) && n >= 1000) return Math.round(n);
  }
  const plain = t.match(/(?:ไมล์|วิ่ง)\s*([0-9๐-๙]{4,7})/i);
  if (plain) {
    const n = Number(normalizeDigits(plain[1]));
    if (Number.isFinite(n) && n >= 1000) return Math.round(n);
  }
  return null;
}

const MILEAGE_FACT_TOLERANCE_KM = 1500;

/** Match grounded cars whose listing mileage uniquely equals a stated figure. */
export function resolveCarsByMileageFact(
  statedMileage: number,
  cars: ChatCarCardData[],
  toleranceKm = MILEAGE_FACT_TOLERANCE_KM
): ChatCarCardData[] {
  if (!Number.isFinite(statedMileage) || statedMileage <= 0) return [];
  return cars.filter(
    (c) =>
      typeof c.mileage === "number" &&
      c.mileage > 0 &&
      Math.abs(c.mileage - statedMileage) <= toleranceKm
  );
}

export function detectBuyerFactsSpecField(message: string): BuyerFactsSpecField | null {
  const t = message.trim();
  if (/เกียร์/.test(t)) return "transmission";
  if (/สี(อะไร|เป็น|ยังไง|เท่า)/.test(t) || /(คันนี้|รถคันนี้).*สี/.test(t)) return "color";
  // v22.56 — evaluation questions are not bare mileage lookups
  if (/ไมล์/.test(t) && !isBuyerMileageEvaluationQuestion(t)) return "mileage";
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
  if (detectBuyerAdvisorTopic(t)) return "none";

  // History / condition cues only — finance/installment (ไฟแนนซ์|ผ่อน) must NOT
  // land here; those route via the selected-car finance calculator path.
  if (
    /ชน|ถูกชน|เคยชน|อุบัติเหตุ|น้ำท่วม|flood|เข้าศูนย์|ศูนย์บริการ|service history|ประวัติ(?:เคลม|เข้าศูนย์|ชน)|เคลม|มือ(เดียว|หนึ่ง|แรก)|เจ้าของ(คน|เดียว|แรก)|จำนวนเจ้าของ|ประกัน|รับประกัน|สภาพเครื่อง|เครื่องยนต์(ดี|เงียบ)|ช่วงล่าง(ดี|พัง)/i.test(
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
    !/ซื้อรถมือสอง(?:ต้อง|ควร)ดู|ซื้อมือสอง(?:ต้อง|ควร)(?:ดู|เช็ค)/i.test(t)
  ) {
    if (!/คันนี้|รถคันนี้|คันนั้น|\[SELECTED_CAR_ID:/i.test(t)) {
      return "none";
    }
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

function messageAllowsSessionCarFallback(message: string): boolean {
  if (extractSelectedCarId(message)) return true;
  if (isBuyerMileageEvaluationQuestion(message)) return true;
  return /คันนี้|รถคันนี้|คันนั้น|\[SELECTED_CAR_ID:/i.test(message);
}

export type ResolveTargetBuyerCarResult = {
  car: ChatCarCardData | null;
  /** Multiple grounded cars share the stated mileage — ask clarification. */
  ambiguousMileageMatches?: ChatCarCardData[];
};

export function resolveTargetBuyerCarDetailed(
  message: string,
  inventory: ChatInventoryCar[],
  contextCars: ChatCarCardData[] = loadChatCarContext(),
  options?: { allowSessionFallback?: boolean }
): ResolveTargetBuyerCarResult {
  const allowSession =
    options?.allowSessionFallback ?? messageAllowsSessionCarFallback(message);

  const statedMileage = extractStatedMileageFromMessage(message);
  if (statedMileage != null && contextCars.length > 0) {
    const byMileage = resolveCarsByMileageFact(statedMileage, contextCars);
    if (byMileage.length === 1) {
      return { car: byMileage[0] };
    }
    if (byMileage.length > 1) {
      return { car: null, ambiguousMileageMatches: byMileage };
    }
  }

  let selectedId = extractSelectedCarId(message);
  if (!selectedId && allowSession) {
    const selection = resolveSelectedCarIdState();
    if (selection.kind === "cleared") return { car: null };
    if (selection.kind === "selected") selectedId = selection.id;
  }
  if (!selectedId && allowSession) {
    const viewed = loadRecentlyViewedCarIds();
    if (viewed.length > 0) selectedId = viewed[0];
  }
  if (!selectedId && allowSession && contextCars.length > 0) {
    selectedId = contextCars[0].id;
  }
  if (!selectedId) return { car: null };

  const fromContext = contextCars.find((c) => c.id === selectedId);
  if (fromContext) return { car: fromContext };

  const inv = inventory.find((c) => c.id === selectedId);
  if (inv) {
    return { car: summaryToChatCarCardData(toChatCarSummary(inv), "exact") };
  }

  return { car: null };
}

export function resolveTargetBuyerCar(
  message: string,
  inventory: ChatInventoryCar[],
  contextCars: ChatCarCardData[] = loadChatCarContext(),
  options?: { allowSessionFallback?: boolean }
): ChatCarCardData | null {
  return resolveTargetBuyerCarDetailed(message, inventory, contextCars, options).car;
}

/** Deterministic grounded mileage judgment (Gemini language overlay may replace). */
export function buildMileageEvaluationReply(
  car: ChatCarCardData,
  options?: { statedMileage?: number | null; referenceYear?: number }
): string {
  const listingMileage = car.mileage > 0 ? car.mileage : 0;
  const stated = options?.statedMileage;
  const mileage = listingMileage > 0 ? listingMileage : stated && stated > 0 ? stated : 0;
  const refYear = options?.referenceYear ?? new Date().getFullYear();
  const year = car.year > 1980 ? car.year : 0;

  if (mileage <= 0) {
    return [
      `จากข้อมูลประกาศของ ${carLabel(car)} ระบบยังไม่มีเลขไมล์ให้ประเมินครับ`,
      "แนะนำตรวจเลขไมล์จริง สมุดเช็กระยะ และสภาพรถก่อนตัดสินใจครับ",
    ].join("\n");
  }

  const conflictNote =
    stated != null &&
    listingMileage > 0 &&
    Math.abs(stated - listingMileage) > MILEAGE_FACT_TOLERANCE_KM
      ? `คุณพี่กล่าวถึงไมล์ประมาณ ${formatPrice(stated)} กม. แต่ตามประกาศคันนี้ระบุ ${formatPrice(listingMileage)} กม. — น้องเอใช้ตัวเลขจากประกาศเป็นหลักครับ`
      : null;

  const ageYears = year > 0 ? Math.max(1, refYear - year) : 0;
  const annualEst = ageYears > 0 ? Math.round(mileage / ageYears) : 0;

  let band =
    "ถือว่าอยู่ในระดับที่ควรดูประกอบกับอายุรถและประวัติการใช้งาน";
  if (annualEst > 0 && annualEst < 10_000) {
    band = "ถือว่าวิ่งไม่มากเมื่อเทียบอายุโดยประมาณ";
  } else if (annualEst > 25_000) {
    band = "ถือว่าใช้งานค่อนข้างหนักเมื่อเทียบอายุโดยประมาณ";
  } else if (annualEst > 0) {
    band = "ถือว่าอยู่ในระดับที่พบได้ทั่วไปสำหรับรถใช้งาน";
  }

  const annualLine =
    annualEst > 0
      ? `ถ้าประมาณจากปีรถถึงปีอ้างอิง ${refYear} (ประมาณ ${ageYears} ปี — ไม่ใช่วันจดทะเบียนจริง) เฉลี่ยราว ${formatPrice(annualEst)} กม. ต่อปี ซึ่งเป็นค่าประมาณเท่านั้น`
      : null;

  return [
    conflictNote,
    `ไมล์ ${formatPrice(mileage)} กม. สำหรับ ${carLabel(car)} ${band}ครับ`,
    annualLine,
    "เลขไมล์อย่างเดียวพิสูจน์สภาพไม่ได้ครับ ควรตรวจสมุดเช็กระยะ ประวัติซ่อม สภาพเครื่องยนต์ ช่วงล่าง และความสอดคล้องของเลขไมล์ก่อนตัดสินใจครับ",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildAmbiguousMileageClarification(
  matches: ChatCarCardData[]
): string {
  const lines = matches.slice(0, 4).map((c, i) => {
    const mileage =
      c.mileage > 0 ? `ไมล์ ${formatPrice(c.mileage)} กม.` : "ไมล์ไม่ระบุ";
    return `${i + 1}. ${carLabel(c)} — ${mileage}`;
  });
  return [
    "ตอนนี้มีรถในบริบทหลายคันที่เลขไมล์ใกล้เคียงกันครับ ช่วยระบุคันที่หมายถึงหน่อยนะครับ",
    ...lines,
    "พิมพ์ยี่ห้อ/รุ่น/ปี หรือกดดูรายละเอียดคันที่สนใจแล้วถามต่อได้เลยครับ",
  ].join("\n");
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
