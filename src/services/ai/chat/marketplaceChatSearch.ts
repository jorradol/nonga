/** Marketplace search for Nong A chat — real inventory only */

import {
  collectListingImageCandidates,
  isValidListingImageUrl,
  normalizeListingImageDisplayUrl,
} from "../../../utils/listingImages";
import {
  inferVehicleBodyClass,
  isMpvFamily,
  isSedanFamily,
  isSuvFamily,
  BODY_CLASS_LABEL_TH,
} from "./vehicleBodyClassifier";
import { buildMarketplaceSearchIntroCopy } from "./chatSearchReplyCopy";

export interface ChatInventoryCar {
  id: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  mileage?: number;
  color?: string;
  fuelType?: string;
  transmission?: string;
  type?: string;
  condition?: string;
  bodyType?: string;
  description?: string;
  images?: string[];
  /** Legacy / alternate image fields — same merge order as marketplace */
  imageUrls?: string | string[];
  imageUrl?: string;
  coverImage?: string;
  gallery?: string[];
  primaryImage?: string;
  showroomName?: string;
  ownerName?: string;
  isSold?: boolean;
  listingStatus?: "published" | "hidden" | string;
  saleStatus?: string;
}

export interface ChatSearchCriteria {
  brand?: string;
  model?: string;
  maxPrice?: number;
  minPrice?: number;
  year?: number;
  color?: string;
  suvOnly?: boolean;
  pickupOnly?: boolean;
  familyUse?: boolean;
  sevenSeats?: boolean;
  commercialUse?: boolean;
  limit?: number;
}

export interface ChatCarSummary extends ChatInventoryCar {
  mileage: number;
  image?: string;
  bodyClass: string;
  bodyClassLabel: string;
  hasImage: boolean;
}

export interface MarketplaceSearchResult {
  criteria: ChatSearchCriteria;
  primary: ChatCarSummary[];
  alternatives: ChatCarSummary[];
  introText: string;
}

/** Signals that a message may contain parseable search criteria (not enough alone to show cards) */
const SEARCH_PARSE_SIGNAL =
  /(?:มี|หา|ค้นหา|ช่วยหา|ใน(?:ตลาด|ระบบ)|marketplace|inventory|รถ(?:ใน)?ตลาด|budget|งบ|ราคา|ไม่เกิน|ต่ำกว่า|แสน|ล้าน|SUV|กระบะ|ครอบครัว|7\s*ที่นั่ง|เจ็ดที่นั่ง|pickup|รถบ้าน)/i;

const EXPLICIT_SEARCH_REQUEST =
  /(?:มี|หา|ค้นหา|ช่วยหา|ช่วยค้นหา).{0,80}(?:ไหม|มั้ย|หรือเปล่า|ให้หน่อย|ให้ที|ได้ไหม)/i;

const EXPLICIT_FIND_REQUEST =
  /(?:ช่วย)?(?:หา|ค้นหา).{2,}(?:ให้|หน่อย)/i;

const BRAND_ALIASES: Record<string, string> = {
  honda: "Honda",
  toyota: "Toyota",
  mazda: "Mazda",
  nissan: "Nissan",
  isuzu: "Isuzu",
  ford: "Ford",
  mitsubishi: "Mitsubishi",
  benz: "Mercedes-Benz",
  mercedes: "Mercedes-Benz",
  bmw: "BMW",
  byd: "BYD",
  tesla: "Tesla",
  suzuki: "Suzuki",
  ฮอนด้า: "Honda",
  โตโยต้า: "Toyota",
  มาสด้า: "Mazda",
  นิสสัน: "Nissan",
  อีซูซุ: "Isuzu",
  ซูซูกิ: "Suzuki",
  ferrari: "Ferrari",
  lamborghini: "Lamborghini",
};

const COLOR_ALIASES: Record<string, string> = {
  ดำ: "ดำ",
  ขาว: "ขาว",
  แดง: "แดง",
  เงิน: "เงิน",
  เทา: "เทา",
  น้ำเงิน: "น้ำเงิน",
};

function isVisibleOnMarketplaceChat(car: ChatInventoryCar): boolean {
  if (car.isSold) return false;
  if (car.listingStatus === "hidden") return false;
  // v22.32 — pending_review is not marketplace-public
  if (car.listingStatus === "pending_review") return false;
  if (car.saleStatus === "pending_sale" || car.saleStatus === "sold") return false;
  return true;
}

function normalizeBrand(raw: string): string {
  const key = raw.trim().toLowerCase();
  return BRAND_ALIASES[key] ?? raw.trim();
}

/** Normalize common model aliases (CRV↔CR-V, Altis→Corolla). */
function normalizeSearchModel(raw: string): string {
  const t = raw.trim().replace(/^CRV$/i, "CR-V");
  if (/^altis$/i.test(t)) return "Corolla";
  return t;
}

function parseThaiNumber(raw: string): number {
  return Number(String(raw).replace(/,/g, ""));
}

function resolveListingImage(car: ChatInventoryCar): {
  imageUrl?: string;
  hasImage: boolean;
} {
  const urls = resolveChatListingImageUrls(car);
  if (urls.length > 0) {
    return { imageUrl: urls[0], hasImage: true };
  }
  return { hasImage: false };
}

/**
 * Chat card images — same candidate order + validity rules as marketplace/detail
 * (`collectListingImageCandidates` + `isValidListingImageUrl`), without Unsplash
 * placeholder fallback. Accepts durable Firebase Storage HTTPS URLs even when the
 * object path still references a merged/prior listing id (post-dedup image copy).
 */
export function resolveChatListingImageUrls(car: ChatInventoryCar): string[] {
  const urls: string[] = [];
  for (const raw of collectListingImageCandidates(car)) {
    const url = String(raw ?? "").trim();
    if (!isValidListingImageUrl(url, car.id)) continue;
    const displayUrl = normalizeListingImageDisplayUrl(url);
    if (!urls.includes(displayUrl)) urls.push(displayUrl);
  }
  return urls;
}

/** เกียร์จาก record จริง — ไม่เดา */
export function resolveChatListingTransmission(
  car: ChatInventoryCar
): string | undefined {
  const direct = car.transmission?.trim();
  if (direct) {
    if (direct === "auto") return "อัตโนมัติ";
    if (direct === "manual") return "Manual";
    return direct;
  }
  const condition = car.condition?.trim();
  if (condition && /^(เกียร์|AT|MT|CVT)/i.test(condition)) {
    return condition.startsWith("เกียร์") ? condition : `เกียร์ ${condition}`;
  }
  const desc = car.description?.trim() ?? "";
  const match = desc.match(/เกียร์\s*(AT|MT|CVT|อัตโนมัติ|Manual)/i);
  if (match) return `เกียร์ ${match[1]}`;
  return undefined;
}

export function parseMarketplaceSearchQuery(
  message: string
): ChatSearchCriteria | null {
  const text = message.trim();
  if (
    !SEARCH_PARSE_SIGNAL.test(text) &&
    !/[A-Za-zก-๙]{2,}\s+[A-Za-z0-9-]{2,}/.test(text)
  ) {
    return null;
  }

  const criteria: ChatSearchCriteria = { limit: 6 };

  for (const [alias, brand] of Object.entries(BRAND_ALIASES)) {
    if (text.toLowerCase().includes(alias.toLowerCase())) {
      criteria.brand = brand;
      break;
    }
  }

  // English brands use \b; Thai brands cannot (JS \b is ASCII-word only).
  const modelMatchEn = text.match(
    /\b(Honda|Toyota|Mazda|Nissan|Isuzu|Ford|Mitsubishi|Mercedes-Benz|BMW|BYD|Tesla|Suzuki)\s+([A-Za-z0-9][A-Za-z0-9-]*)/i
  );
  const modelMatchTh = text.match(
    /(ฮอนด้า|โตโยต้า|มาสด้า|นิสสัน|อีซูซุ|ซูซูกิ)\s+([A-Za-z0-9][A-Za-z0-9-]*)/i
  );
  const modelMatch = modelMatchEn ?? modelMatchTh;
  if (modelMatch) {
    criteria.brand = normalizeBrand(modelMatch[1]);
    criteria.model = normalizeSearchModel(modelMatch[2]);
  } else {
    const soloModel = text.match(
      /\b(CR-V|CRV|Fortuner|City|Civic|Camry|Corolla|Altis|Vios|Yaris|CX-5|MU-X|D-Max|Ertiga|XL7|Xpander|Alphard|Almera|Jazz|Swift)\b/i
    );
    if (soloModel) {
      criteria.model = normalizeSearchModel(soloModel[1]);
    }
  }

  // Parse budget/price queries
  let parsedPrice = 0;

  // 0. Pre-process text to convert Thai word numbers to digits to simplify regex
  let processedText = text;
  const thaiWordToDigit: Record<string, string> = {
    'หนึ่ง': '1', 'สอง': '2', 'สาม': '3', 'สี่': '4', 'ห้า': '5', 'หก': '6', 'เจ็ด': '7', 'แปด': '8', 'เก้า': '9'
  };
  for (const [word, digit] of Object.entries(thaiWordToDigit)) {
    processedText = processedText.replace(new RegExp(word, 'g'), digit);
  }

  // 1. Match explicit "ไม่เกิน", "งบ", "ราคา" with number and optional unit
  const priceUnder = processedText.match(
    /(?:ไม่เกิน|ไม่เกิ|<=|<|ภายใต้|งบ|ราคา|ต่ำกว่า)\s*([\d,]+(?:\.\d+)?)\s*(แสน|ล้าน|ล\.|million)?\s*(?:บาท|฿)?/i
  );
  
  if (priceUnder) {
    parsedPrice = parseThaiNumber(priceUnder[1]);
    if (priceUnder[2]) {
      if (/แสน/i.test(priceUnder[2])) parsedPrice *= 100_000;
      else if (/ล้าน|ล\.|million/i.test(priceUnder[2])) parsedPrice *= 1_000_000;
    } else {
      const remainder = processedText.substring(priceUnder.index! + priceUnder[0].length);
      if (remainder.match(/^\s*(ล้าน|ล\.|million)/i)) parsedPrice *= 1_000_000;
      else if (remainder.match(/^\s*แสน/i)) parsedPrice *= 100_000;
      else if (processedText.match(/ล้าน|ล\.|million/i)) parsedPrice *= 1_000_000;
      else if (processedText.match(/แสน/i)) parsedPrice *= 100_000;
    }
  }

  // 2. Match implicit "ไม่เกิน" like "รถไม่เกิน 1 ล้าน" where the regex above might fail if "ราคา" or "งบ" isn't there
  if (parsedPrice === 0) {
    const implicitUnder = processedText.match(
      /(?:ไม่เกิน|ไม่เกิ|<=|<|ภายใต้|ต่ำกว่า)\s*([\d,]+(?:\.\d+)?)\s*(แสน|ล้าน|ล\.|million)?\s*(?:บาท|฿)?/i
    );
    if (implicitUnder) {
      parsedPrice = parseThaiNumber(implicitUnder[1]);
      if (implicitUnder[2]) {
        if (/แสน/i.test(implicitUnder[2])) parsedPrice *= 100_000;
        else if (/ล้าน|ล\.|million/i.test(implicitUnder[2])) parsedPrice *= 1_000_000;
      } else {
        const remainder = processedText.substring(implicitUnder.index! + implicitUnder[0].length);
        if (remainder.match(/^\s*(ล้าน|ล\.|million)/i)) parsedPrice *= 1_000_000;
        else if (remainder.match(/^\s*แสน/i)) parsedPrice *= 100_000;
        else if (processedText.match(/ล้าน|ล\.|million/i)) parsedPrice *= 1_000_000;
        else if (processedText.match(/แสน/i)) parsedPrice *= 100_000;
      }
    }
  }

  // 3. Match direct mentions like "7 แสน" without "ไม่เกิน"
  if (parsedPrice === 0) {
    const directPrice = processedText.match(/([\d,]+(?:\.\d+)?)\s*(แสน|ล้าน|ล\.|million)\s*(?:บาท|฿)?/i);
    if (directPrice) {
      parsedPrice = parseThaiNumber(directPrice[1]);
      if (/แสน/i.test(directPrice[2])) parsedPrice *= 100_000;
      else if (/ล้าน|ล\.|million/i.test(directPrice[2])) parsedPrice *= 1_000_000;
    }
  }

  // 4. Very aggressive fallback for "1 ล้าน" or "1.2 ล้าน" anywhere in the text if we still don't have a price
  if (parsedPrice === 0) {
    const aggressiveMatch = processedText.match(/([\d,]+(?:\.\d+)?)\s*(แสน|ล้าน|ล\.|million)/i);
    if (aggressiveMatch) {
      parsedPrice = parseThaiNumber(aggressiveMatch[1]);
      if (/แสน/i.test(aggressiveMatch[2])) parsedPrice *= 100_000;
      else if (/ล้าน|ล\.|million/i.test(aggressiveMatch[2])) parsedPrice *= 1_000_000;
    }
  }

  // 5. Check if they wrote the number out in Thai words (e.g. เจ็ดแสน)
  if (parsedPrice === 0) {
    const thaiWordsMatch = text.match(/(?:ไม่เกิน|ไม่เกิ|<=|<|ภายใต้|งบ|ราคา|ต่ำกว่า)?\s*(หนึ่ง|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า)\s*(แสน|ล้าน)/i);
    if (thaiWordsMatch) {
      const wordToNum: Record<string, number> = {
        'หนึ่ง': 1, 'สอง': 2, 'สาม': 3, 'สี่': 4, 'ห้า': 5, 'หก': 6, 'เจ็ด': 7, 'แปด': 8, 'เก้า': 9
      };
      parsedPrice = wordToNum[thaiWordsMatch[1]];
      if (/แสน/i.test(thaiWordsMatch[2])) parsedPrice *= 100_000;
      else if (/ล้าน/i.test(thaiWordsMatch[2])) parsedPrice *= 1_000_000;
    }
  }
  
  // 6. Final fallback for "ล้านนิดๆ"
  if (parsedPrice === 0 && processedText.match(/ล้านนิด\s*ๆ?/i)) {
      // Just set to 1 million if they say "ล้านนิดๆ" to get some results around that price
      parsedPrice = 1_000_000;
  }

  if (parsedPrice > 0) {
    criteria.maxPrice = parsedPrice;
  }

  const yearLabeled = text.match(/(?:ปี|year)\s*(\d{4})/i);
  if (yearLabeled) {
    criteria.year = Number(yearLabeled[1]);
  } else if (criteria.brand || criteria.model) {
    // Bare year next to model/brand: "Corolla 2020", "โตโยต้า Corolla 2020"
    const bareYear = text.match(
      /(?:^|[^\d])(19\d{2}|20[0-3]\d)(?:[^\d]|$)/
    );
    if (bareYear) criteria.year = Number(bareYear[1]);
  }

  for (const [alias, color] of Object.entries(COLOR_ALIASES)) {
    if (text.includes(`สี${alias}`) || text.includes(color)) {
      criteria.color = color;
      break;
    }
  }

  if (/\bsuv\b|อเนกประสงค์|รถใหญ่/i.test(text)) criteria.suvOnly = true;
  if (/กระบะ|pickup|d-max|revo|vigo/i.test(text)) criteria.pickupOnly = true;
  if (/7\s*ที่นั่ง|เจ็ดที่นั่ง/i.test(text)) criteria.sevenSeats = true;
  if (/รถครอบครัว|ครอบครัว|ใช้กับครอบครัว/i.test(text)) criteria.familyUse = true;
  if (/รถค้าขาย|ค้าขาย|รถใช้ทำงาน|ใช้ทำงาน/i.test(text)) criteria.commercialUse = true;

  const exotic = text.match(/\b(Ferrari|Lamborghini|McLaren|Porsche)\b/i);
  if (exotic && !criteria.brand) criteria.brand = normalizeBrand(exotic[1]);

  return criteria;
}

export function hasSufficientSearchCriteria(
  criteria: ChatSearchCriteria,
  message: string
): boolean {
  const t = message.trim().replace(/\s+/g, " ");
  if (criteria.maxPrice != null && criteria.maxPrice > 0) return true;
  if (criteria.minPrice != null && criteria.minPrice > 0) return true;
  if (criteria.brand?.trim()) return true;
  if (criteria.model?.trim()) return true;
  if (criteria.year != null) return true;
  if (criteria.color?.trim()) return true;
  if (criteria.suvOnly) return true;
  if (criteria.pickupOnly) return true;
  if (criteria.familyUse) return true;
  if (criteria.sevenSeats) return true;
  if (criteria.commercialUse) return true;
  if (EXPLICIT_SEARCH_REQUEST.test(t) && (criteria.brand || criteria.model)) {
    return true;
  }
  if (EXPLICIT_FIND_REQUEST.test(t)) {
    const subject = t
      .replace(/^(?:ช่วย)?(?:หา|ค้นหา)\s*/i, "")
      .replace(/(?:ให้|หน่อย)(?:ครับ|ค่ะ|นะ)?\s*$/i, "")
      .trim();
    if (subject.length >= 3) return true;
  }
  if (
    /(?:มี|หา).{0,40}(?:SUV|กระบะ|7\s*ที่นั่ง|ครอบครัว|รถครอบครัว|รถค้าขาย|รถใช้ทำงาน)/i.test(
      t
    )
  ) {
    return true;
  }
  if (/รถ(?:บ้าน)?งบ\s*[\dก-๙]/.test(t)) return true;
  return false;
}

export function isMarketplaceSearchIntent(message: string): boolean {
  const criteria = parseMarketplaceSearchQuery(message);
  if (!criteria) return false;
  return hasSufficientSearchCriteria(criteria, message);
}

function matchesBaseCriteria(
  car: ChatInventoryCar,
  criteria: ChatSearchCriteria
): boolean {
  if (criteria.brand && !car.brand.toLowerCase().includes(criteria.brand.toLowerCase())) {
    return false;
  }
  if (criteria.model) {
    const m = criteria.model.toLowerCase().replace("-", "");
    const cm = car.model.toLowerCase().replace("-", "");
    if (!cm.includes(m)) return false;
  }
  if (criteria.maxPrice != null && car.price > criteria.maxPrice) return false;
  if (criteria.minPrice != null && car.price < criteria.minPrice) return false;
  if (criteria.year != null && car.year !== criteria.year) return false;
  if (criteria.color && !(car.color ?? "").includes(criteria.color)) return false;
  return true;
}

export function toChatCarSummary(car: ChatInventoryCar): ChatCarSummary {
  const bodyClass = inferVehicleBodyClass(car);
  const img = resolveListingImage(car);
  return {
    ...car,
    mileage: car.mileage ?? 0,
    image: img.imageUrl,
    hasImage: img.hasImage,
    bodyClass,
    bodyClassLabel: BODY_CLASS_LABEL_TH[bodyClass],
  };
}

function dedupeById(cars: ChatCarSummary[]): ChatCarSummary[] {
  const seen = new Set<string>();
  const out: ChatCarSummary[] = [];
  for (const c of cars) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    out.push(c);
  }
  return out;
}

function sortChatCandidates(a: ChatCarSummary, b: ChatCarSummary): number {
  if (a.hasImage !== b.hasImage) return a.hasImage ? -1 : 1;
  if (a.price !== b.price) return a.price - b.price;
  if (a.mileage !== b.mileage) return a.mileage - b.mileage;
  return b.year - a.year;
}

export function searchMarketplaceForChat(
  cars: ChatInventoryCar[],
  criteria: ChatSearchCriteria
): { primary: ChatCarSummary[]; alternatives: ChatCarSummary[] } {
  const active = cars.filter(isVisibleOnMarketplaceChat);
  const limit = criteria.limit ?? 20; // Increased limit to support pagination
  const priceMatched = active
    .filter((car) => matchesBaseCriteria(car, criteria))
    .map(toChatCarSummary)
    .sort(sortChatCandidates);

  // Exact model+year: if none, offer same-model nearby years as alternatives.
  if (criteria.model?.trim() && criteria.year != null) {
    if (priceMatched.length > 0) {
      return {
        primary: dedupeById(priceMatched).slice(0, limit),
        alternatives: [],
      };
    }
    const nearbyCriteria: ChatSearchCriteria = { ...criteria, year: undefined };
    const nearby = active
      .filter((car) => matchesBaseCriteria(car, nearbyCriteria))
      .map(toChatCarSummary)
      .sort((a, b) => {
        const da = Math.abs(a.year - criteria.year!);
        const db = Math.abs(b.year - criteria.year!);
        if (da !== db) return da - db;
        return sortChatCandidates(a, b);
      });
    return {
      primary: [],
      alternatives: dedupeById(nearby).slice(0, limit),
    };
  }

  if (criteria.pickupOnly) {
    const pickups = priceMatched.filter((c) => c.bodyClass === "pickup");
    if (pickups.length > 0) {
      return {
        primary: dedupeById(pickups).slice(0, limit),
        alternatives: [],
      };
    }
  }

  if (criteria.familyUse || criteria.sevenSeats) {
    const family = priceMatched.filter((c) => isSuvFamily(c) || isMpvFamily(c));
    if (family.length > 0) {
      return {
        primary: dedupeById(family).slice(0, limit),
        alternatives: [],
      };
    }
  }

  if (!criteria.suvOnly) {
    return {
      primary: dedupeById(priceMatched).slice(0, limit),
      alternatives: [],
    };
  }

  const suvMatches = priceMatched.filter((c) => isSuvFamily(c));
  if (suvMatches.length > 0) {
    return {
      primary: dedupeById(suvMatches).slice(0, limit),
      alternatives: [],
    };
  }

  const mpvAlternatives = priceMatched.filter(
    (c) => isMpvFamily(c) && !isSedanFamily(c)
  );
  return {
    primary: [],
    alternatives: dedupeById(mpvAlternatives).slice(0, limit),
  };
}

export function formatCarDetailPath(carId: string): string {
  return `/cars/${carId}`;
}

function formatPrice(n: number): string {
  return n.toLocaleString("th-TH");
}

function formatMileage(n: number): string {
  if (n <= 0) return "";
  return `${n.toLocaleString("th-TH")} กม.`;
}

function describeCarLine(c: ChatCarSummary, index?: number): string {
  const prefix = index != null ? `${index}. ` : "";
  const mileage = formatMileage(c.mileage);
  const color = c.color ? ` สี${c.color}` : "";
  const showroom = c.showroomName ? ` (${c.showroomName})` : "";
  const parts = [
    `${prefix}${c.brand} ${c.model} ปี ${c.year}`,
    `ราคา ${formatPrice(c.price)} บาท`,
    mileage ? `ไมล์ ${mileage}` : "",
    color,
    `ประเภท ${c.bodyClassLabel}`,
    showroom,
  ].filter(Boolean);
  return parts.join(" ");
}

export function buildMarketplaceSearchIntro(
  result: Pick<MarketplaceSearchResult, "criteria" | "primary" | "alternatives">
): string {
  return buildMarketplaceSearchIntroCopy(result);
}

export function runMarketplaceChatSearch(
  message: string,
  cars: ChatInventoryCar[]
): MarketplaceSearchResult | null {
  const criteria = parseMarketplaceSearchQuery(message);
  if (!criteria) return null;

  const { primary, alternatives } = searchMarketplaceForChat(cars, criteria);
  const introText = buildMarketplaceSearchIntro({ criteria, primary, alternatives });
  return { criteria, primary, alternatives, introText };
}

export function summaryToChatCarCardData(
  c: ChatCarSummary,
  matchKind: "exact" | "alternative"
): import("../../../types").ChatCarCardData {
  const imageUrls = resolveChatListingImageUrls(c);
  const heroUrl = imageUrls[0];
  const transmission = resolveChatListingTransmission(c);
  const description = c.description?.trim() || "";
  // Omit undefined optional fields so Firestore chat history writes succeed.
  return {
    id: c.id,
    brand: c.brand,
    model: c.model,
    year: c.year,
    price: c.price,
    mileage: c.mileage,
    ...(c.color ? { color: c.color } : {}),
    ...(c.fuelType ? { fuelType: c.fuelType } : {}),
    ...(c.condition ? { condition: c.condition } : {}),
    ...(transmission ? { transmission } : {}),
    ...(description ? { description } : {}),
    bodyClass: c.bodyClass,
    bodyClassLabel: c.bodyClassLabel,
    ...(c.showroomName ? { showroomName: c.showroomName } : {}),
    ...(heroUrl ? { imageUrl: heroUrl } : {}),
    ...(imageUrls.length > 0 ? { imageUrls } : {}),
    hasImage: imageUrls.length > 0,
    detailPath: formatCarDetailPath(c.id),
    matchKind,
  };
}

export function summariesToCarCards(
  primary: ChatCarSummary[],
  alternatives: ChatCarSummary[]
): import("../../../types").ChatCarCardData[] {
  return [
    ...primary.map((c) => summaryToChatCarCardData(c, "exact")),
    ...alternatives.map((c) => summaryToChatCarCardData(c, "alternative")),
  ];
}

export function buildMarketplaceSearchContext(
  result: MarketplaceSearchResult
): string {
  const all = [...result.primary, ...result.alternatives];
  if (all.length === 0) {
    return (
      `[ผลค้นหา Marketplace จริง]\n` +
      `เงื่อนไข: ${JSON.stringify(result.criteria)}\n` +
      `ผลลัพธ์: 0 คัน\n` +
      `กฎ: ตอบว่าไม่พบ ห้ามแต่งรถขึ้นมา`
    );
  }

  return (
    `[ผลค้นหา Marketplace จริง — ใช้เฉพาะรายการนี้]\n` +
    `เงื่อนไข: ${JSON.stringify(result.criteria)}\n` +
    `รายการ (${all.length} คัน):\n` +
    JSON.stringify(
      all.map((c) => ({
        id: c.id,
        brand: c.brand,
        model: c.model,
        year: c.year,
        price: c.price,
        mileage: c.mileage,
        color: c.color,
        fuelType: c.fuelType,
        condition: c.condition,
        bodyClassLabel: c.bodyClassLabel,
        showroomName: c.showroomName,
        detailUrl: formatCarDetailPath(c.id),
        matchKind: result.primary.some((p) => p.id === c.id) ? "exact" : "alternative",
      }))
    )
  );
}

export const MARKETPLACE_SEARCH_SKILL_PROMPT = `
[SKILL: ค้นรถจริงจาก Marketplace — Phase 2]
เมื่อผู้ใช้ถามหารถในตลาด:
- ใช้เฉพาะข้อมูลจาก [ผลค้นหา Marketplace จริง]
- ห้ามแต่งรถ ห้ามอ้างสภาพ/ของแถม/บริการที่ไม่มีใน JSON
- SUV: ห้ามเสนอ Sedan เป็น SUV — ถ้าเป็น MPV ต้องบอกว่าเป็นทางเลือกใกล้เคียง
- ถ้าไม่พบ ตอบตรงว่าไม่พบ
`;

/** @deprecated use buildMarketplaceSearchContext */
export function formatMarketplaceSearchReply(
  cars: ChatCarSummary[],
  queryLabel: string
): string {
  return buildMarketplaceSearchIntro({
    criteria: { limit: 8 },
    primary: cars,
    alternatives: [],
  });
}
