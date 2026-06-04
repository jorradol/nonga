/** v5.4.8b — deterministic buyer marketplace candidate scoring (no chat UX / no cards) */

import type { BuyerSearchIntent } from "./buyerSearchIntentParser";
import type { ChatInventoryCar } from "./marketplaceChatSearch";
import {
  inferVehicleBodyClass,
  isMpvFamily,
  isSedanFamily,
  isSuvFamily,
  type VehicleBodyClass,
} from "./vehicleBodyClassifier";

export interface BuyerMarketplaceScoredCandidate {
  car: ChatInventoryCar;
  score: number;
  reasons: string[];
  cautions?: string[];
  matchedTags?: string[];
}

export interface BuyerMarketplaceScoringResult {
  candidates: BuyerMarketplaceScoredCandidate[];
  /** Global cautions when matches are sparse or intent is broad */
  cautions?: string[];
}

export interface BuyerMarketplaceScoringOptions {
  /** Default 5, clamped 3–5 */
  limit?: number;
  /** Drop candidates below this score when enough stronger matches exist */
  minScore?: number;
}

const DEFAULT_LIMIT = 5;
const STRONG_MATCH_SCORE = 35;
const SPARSE_MATCH_THRESHOLD = 2;

const POPULAR_MARKET_MODEL =
  /\b(city|vios|yaris|jazz|swift|brio|mazda\s*2|mazda2|almera|civic|altis|corolla|fortuner|cr-v|crv|ertiga|xpander|avanza)\b/i;

const SEVEN_SEAT_HINT = /7\s*ที่นั่ง|เจ็ดที่นั่ง|7\s*seat/i;
const FUEL_DESC_HINT =
  /ประหยัด(?:น้ำมัน)?|กิน(?:น้ำมัน)?(?:น้อย|เบา)|eco|economy/i;
const FAMILY_DESC_HINT = /ครอบครัว|7\s*ที่นั่ง|เจ็ดที่นั่ง/i;
const EASY_MAINT_DESC_HINT = /ดูแลง่าย|อะไหล่หาง่าย|เข้าศูนย์/i;

const FORBIDDEN_REASON_CLAIM =
  /(?:ไม่เคยชน|ไม่เคยน้ำท่วม|ไม่จุกจิกแน่นอน|ไม่เสียแน่นอน|km\/l|กม\.\/ลิตร|กิโลเมตรต่อลิตร)/i;

function isVisibleListing(car: ChatInventoryCar): boolean {
  if (car.isSold) return false;
  if (car.listingStatus === "hidden") return false;
  if (car.saleStatus === "pending_sale" || car.saleStatus === "sold") return false;
  return true;
}

function carTextBlob(car: ChatInventoryCar): string {
  return [
    car.title,
    car.brand,
    car.model,
    car.bodyType,
    car.type,
    car.description,
    car.condition,
  ]
    .filter(Boolean)
    .join(" ");
}

function bodyClassOf(car: ChatInventoryCar): VehicleBodyClass {
  return inferVehicleBodyClass(car);
}

function pushUnique(target: string[], value: string): void {
  if (!target.includes(value)) target.push(value);
}

function scoreBudget(
  car: ChatInventoryCar,
  budgetMax: number
): Pick<BuyerMarketplaceScoredCandidate, "score" | "reasons" | "cautions"> {
  const price = car.price;
  if (price <= budgetMax) {
    return {
      score: 40,
      reasons: ["ราคาอยู่ในงบที่ตั้งไว้"],
      cautions: [],
    };
  }
  const ratio = price / budgetMax;
  if (ratio <= 1.1) {
    return {
      score: 14,
      reasons: [],
      cautions: ["ราคาสูงกว่างบเล็กน้อย ควรพิจารณางบจริงเพิ่ม"],
    };
  }
  if (ratio <= 1.25) {
    return {
      score: 4,
      reasons: [],
      cautions: ["ราคาเกินงบที่ตั้งไว้พอสมควร"],
    };
  }
  return {
    score: -90,
    reasons: [],
    cautions: ["ราคาเกินงบมากกว่าเงื่อนไขที่ตั้ง"],
  };
}

function scoreFuelEfficient(
  car: ChatInventoryCar,
  blob: string,
  body: VehicleBodyClass
): { score: number; reasons: string[]; matched: boolean } {
  let score = 0;
  const reasons: string[] = [];
  if (body === "sedan" || body === "hatchback") {
    score += 22;
    pushUnique(reasons, "ตัวถังขนาดกะทัดรัด เหมาะมุมประหยัดน้ำมัน");
  }
  if (FUEL_DESC_HINT.test(blob)) {
    score += 18;
    pushUnique(
      reasons,
      "คำอธิบายประกาศเน้นแนวประหยัด — ควรทดลองขับและเทียบการใช้งานจริง"
    );
  }
  if (body === "suv" || body === "pickup" || body === "mpv") {
    score -= 8;
  }
  return { score, reasons, matched: score > 0 };
}

function scoreFamily(
  car: ChatInventoryCar,
  blob: string,
  body: VehicleBodyClass,
  seatsMin?: number
): { score: number; reasons: string[]; matched: boolean } {
  let score = 0;
  const reasons: string[] = [];
  if (body === "mpv" || body === "suv") {
    score += 24;
    pushUnique(
      reasons,
      "ตัวถังและโจทย์ใกล้เคียงกับการใช้งานครอบครัว"
    );
  }
  if (FAMILY_DESC_HINT.test(blob) || SEVEN_SEAT_HINT.test(blob)) {
    score += 12;
    pushUnique(reasons, "รายละเอียดประกาศสอดคล้องกับการใช้งานครอบครัว");
  }
  if (seatsMin != null && seatsMin >= 7) {
    if (body === "mpv") score += 16;
    else if (body === "suv") score += 10;
    else score -= 6;
  }
  return { score, reasons, matched: score > 0 };
}

function scoreFirstCar(
  car: ChatInventoryCar,
  body: VehicleBodyClass
): { score: number; reasons: string[]; matched: boolean } {
  let score = 0;
  const reasons: string[] = [];
  if (car.price <= 650_000) score += 12;
  if (body === "sedan" || body === "hatchback") score += 10;
  if (POPULAR_MARKET_MODEL.test(carTextBlob(car))) score += 8;
  if (body === "pickup" || (body === "suv" && car.price > 900_000)) {
    score -= 10;
  }
  if (score > 0) {
    pushUnique(
      reasons,
      "เหมาะกับการพิจารณาเป็นรถคันแรก แต่ควรตรวจประวัติดูแลรักษาเพิ่มเติม"
    );
  }
  return { score, reasons, matched: score > 0 };
}

function scoreCity(
  car: ChatInventoryCar,
  body: VehicleBodyClass
): { score: number; reasons: string[]; matched: boolean } {
  let score = 0;
  const reasons: string[] = [];
  if (body === "sedan" || body === "hatchback") {
    score += 20;
    pushUnique(reasons, "ขนาดตัวถังเหมาะกับการใช้งานในเมือง");
  }
  if (car.price <= 700_000) score += 8;
  if (body === "suv" && car.price > 1_000_000) score -= 8;
  return { score, reasons, matched: score > 0 };
}

function scoreMaintenance(
  car: ChatInventoryCar,
  blob: string
): { score: number; reasons: string[]; matched: boolean } {
  let score = 0;
  const reasons: string[] = [];
  if (POPULAR_MARKET_MODEL.test(blob)) {
    score += 14;
    pushUnique(
      reasons,
      "รุ่นที่พบได้บ่อยในตลาด — มักหาอะไหล่และช่างได้ง่ายขึ้น"
    );
  }
  if (EASY_MAINT_DESC_HINT.test(blob)) {
    score += 10;
    pushUnique(
      reasons,
      "รายละเอียดประกาศเน้นการดูแล — ควรตรวจสภาพจริงก่อนตัดสินใจ"
    );
  }
  return { score, reasons, matched: score > 0 };
}

function scoreBodyHints(
  body: VehicleBodyClass,
  hints: string[]
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  for (const hint of hints) {
    if (hint === "mpv" && body === "mpv") {
      score += 10;
      pushUnique(reasons, "ตรงแนวตัวถังที่สนใจ (MPV)");
    }
    if (hint === "suv" && body === "suv") {
      score += 10;
      pushUnique(reasons, "ตรงแนวตัวถังที่สนใจ (SUV)");
    }
    if (
      (hint === "sedan" || hint === "hatchback") &&
      (body === "sedan" || body === "hatchback")
    ) {
      score += 8;
      pushUnique(reasons, "ตรงแนวตัวถังที่สนใจ (รถขนาดกะทัดรัด)");
    }
  }
  return { score, reasons };
}

function scoreFinanceIntent(
  car: ChatInventoryCar,
  budgetMax?: number
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  if (budgetMax != null && car.price <= budgetMax) {
    score += 6;
    pushUnique(reasons, "ราคาไม่เกินงบ — ช่วยลดภาระค่างวดเบื้องต้น (ไม่ใช่ใบเสนอไฟแนนซ์)");
  } else if (car.price <= 500_000) {
    score += 4;
    pushUnique(
      reasons,
      "ราคาจับต้องได้ — อาจช่วยเรื่องค่างวดเบื้องต้น ควรเช็กกับไฟแนนซ์จริง"
    );
  }
  return { score, reasons };
}

/** Score one listing against buyer intent — uses only fields on the car record */
export function scoreBuyerMarketplaceCandidate(
  intent: BuyerSearchIntent,
  car: ChatInventoryCar
): BuyerMarketplaceScoredCandidate {
  const blob = carTextBlob(car);
  const body = bodyClassOf(car);
  let score = 0;
  const reasons: string[] = [];
  const cautions: string[] = [];
  const matchedTags: string[] = [];

  const usage = new Set(intent.usageTags ?? []);

  if (intent.budgetMax != null) {
    const budget = scoreBudget(car, intent.budgetMax);
    score += budget.score;
    reasons.push(...budget.reasons);
    cautions.push(...(budget.cautions ?? []));
  }

  if (usage.has("fuelEfficient")) {
    const fuel = scoreFuelEfficient(car, blob, body);
    score += fuel.score;
    reasons.push(...fuel.reasons);
    if (fuel.matched) matchedTags.push("fuelEfficient");
  }

  if (usage.has("family") || intent.seatsMin != null) {
    const family = scoreFamily(car, blob, body, intent.seatsMin);
    score += family.score;
    reasons.push(...family.reasons);
    if (family.matched) matchedTags.push("family");
  }

  if (intent.seatsMin != null && intent.seatsMin >= 7) {
    if (isMpvFamily(car) || SEVEN_SEAT_HINT.test(blob)) {
      score += 12;
      pushUnique(matchedTags, "seats7");
      if (!reasons.some((r) => /7\s*ที่นั่ง|MPV/i.test(r))) {
        pushUnique(reasons, "แนว 7 ที่นั่ง / MPV ใกล้เคียงโจทย์");
      }
    } else if (!isSuvFamily(car)) {
      cautions.push("อาจไม่ครบ 7 ที่นั่งตามโจทย์ — ควรยืนยันที่นั่งจริงจากรถคันนั้น");
    }
  }

  if (usage.has("firstCar")) {
    const first = scoreFirstCar(car, body);
    score += first.score;
    reasons.push(...first.reasons);
    if (first.matched) matchedTags.push("firstCar");
  }

  if (usage.has("city")) {
    const city = scoreCity(car, body);
    score += city.score;
    reasons.push(...city.reasons);
    if (city.matched) matchedTags.push("city");
  }

  if (usage.has("easyMaintenance") || usage.has("lowMaintenance")) {
    const maint = scoreMaintenance(car, blob);
    score += maint.score;
    reasons.push(...maint.reasons);
    if (maint.matched) {
      matchedTags.push(
        usage.has("easyMaintenance") ? "easyMaintenance" : "lowMaintenance"
      );
    }
  }

  if (intent.bodyTypeHints && intent.bodyTypeHints.length > 0) {
    const hintScore = scoreBodyHints(body, intent.bodyTypeHints);
    score += hintScore.score;
    reasons.push(...hintScore.reasons);
  }

  if (intent.financeIntent) {
    const fin = scoreFinanceIntent(car, intent.budgetMax);
    score += fin.score;
    reasons.push(...fin.reasons);
    if (fin.score > 0) matchedTags.push("financeIntent");
  }

  const uniqueReasons = reasons.filter(Boolean);
  const uniqueCautions = cautions.filter(Boolean);
  const uniqueTags = [...new Set(matchedTags)];

  return {
    car,
    score,
    reasons: uniqueReasons,
    ...(uniqueCautions.length > 0 ? { cautions: uniqueCautions } : {}),
    ...(uniqueTags.length > 0 ? { matchedTags: uniqueTags } : {}),
  };
}

function resolveLimit(options?: BuyerMarketplaceScoringOptions): number {
  const raw = options?.limit ?? DEFAULT_LIMIT;
  return Math.min(5, Math.max(3, raw));
}

/**
 * Rank marketplace listings for buyer search intent.
 * Does not call Gemini or mutate inventory — scoring only.
 */
export function scoreBuyerMarketplaceCandidates(
  intent: BuyerSearchIntent,
  inventory: ChatInventoryCar[],
  options?: BuyerMarketplaceScoringOptions
): BuyerMarketplaceScoringResult {
  if (!intent.isVehicleSearch) {
    return { candidates: [] };
  }

  const visible = inventory.filter(isVisibleListing);
  const scored = visible.map((car) => scoreBuyerMarketplaceCandidate(intent, car));

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.car.price - b.car.price;
  });

  const strongCount = scored.filter((s) => s.score >= STRONG_MATCH_SCORE).length;
  const globalCautions: string[] = [];
  if (
    scored.length > 0 &&
    strongCount < SPARSE_MATCH_THRESHOLD &&
    (intent.usageTags?.length ?? 0) > 0
  ) {
    globalCautions.push(
      "ตัวเลือกตรงเงื่อนไขยังมีไม่มาก — น้องเอเรียงจากรถที่ใกล้เคียงที่สุดในระบบให้ก่อน"
    );
  }

  const limit = resolveLimit(options);
  let candidates = scored.slice(0, limit);

  const minScore = options?.minScore;
  if (minScore != null && scored.filter((s) => s.score >= minScore).length >= limit) {
    candidates = scored.filter((s) => s.score >= minScore).slice(0, limit);
  }

  if (intent.budgetMax != null) {
    const withinBudget = candidates.filter((c) => c.car.price <= intent.budgetMax!);
    if (withinBudget.length === 0 && candidates.length > 0) {
      globalCautions.push(
        "ยังไม่มีรถในงบที่ตั้งไว้มากนัก — ลองปรับงบหรือดูตัวเลือกใกล้เคียงด้านล่าง"
      );
    }
  }

  for (const c of candidates) {
    for (const r of c.reasons) {
      if (FORBIDDEN_REASON_CLAIM.test(r)) {
        throw new Error(`Forbidden claim in scoring reason: ${r}`);
      }
    }
  }

  return {
    candidates,
    ...(globalCautions.length > 0 ? { cautions: globalCautions } : {}),
  };
}
