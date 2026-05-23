/** Marketplace search for Nong A chat — real inventory only */

import {
  isLocalListingImageUrl,
  isValidListingImageUrl,
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
  type?: string;
  condition?: string;
  bodyType?: string;
  description?: string;
  images?: string[];
  showroomName?: string;
  ownerName?: string;
  isSold?: boolean;
  listingStatus?: "published" | "hidden" | string;
}

export interface ChatSearchCriteria {
  brand?: string;
  model?: string;
  maxPrice?: number;
  minPrice?: number;
  year?: number;
  color?: string;
  suvOnly?: boolean;
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

const SEARCH_INTENT =
  /(?:มี|หา|ค้นหา|แนะนำ|ใน(?:ตลาด|ระบบ)|marketplace|inventory|รถ(?:ใน)?ตลาด|น่าสนใจ|budget|งบ)/i;

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
  return true;
}

function normalizeBrand(raw: string): string {
  const key = raw.trim().toLowerCase();
  return BRAND_ALIASES[key] ?? raw.trim();
}

function parseThaiNumber(raw: string): number {
  return Number(String(raw).replace(/,/g, ""));
}

function resolveListingImage(car: ChatInventoryCar): {
  imageUrl?: string;
  hasImage: boolean;
} {
  const list = car.images ?? [];
  for (const raw of list) {
    const url = String(raw ?? "").trim();
    if (isValidListingImageUrl(url, car.id) && isLocalListingImageUrl(url)) {
      return { imageUrl: url, hasImage: true };
    }
  }
  return { hasImage: false };
}

export function parseMarketplaceSearchQuery(
  message: string
): ChatSearchCriteria | null {
  const text = message.trim();
  if (
    !SEARCH_INTENT.test(text) &&
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

  const modelMatch = text.match(
    /\b(Honda|Toyota|Mazda|Nissan|Isuzu|Ford|Mitsubishi|Mercedes-Benz|BMW|BYD|Tesla|Suzuki|ฮอนด้า|โตโยต้า|ซูซูกิ)\s+([A-Za-z0-9][A-Za-z0-9-]*)/i
  );
  if (modelMatch) {
    criteria.brand = normalizeBrand(modelMatch[1]);
    criteria.model = modelMatch[2];
  } else {
    const soloModel = text.match(
      /\b(CR-V|CRV|Fortuner|City|Civic|Camry|Yaris|CX-5|MU-X|D-Max|Ertiga|XL7|Xpander)\b/i
    );
    if (soloModel) criteria.model = soloModel[1].replace("CRV", "CR-V");
  }

  const priceUnder = text.match(
    /(?:ไม่เกิน|ไม่เกิ|<=|<|ภายใต้|งบ|ราคา)\s*([\d,]+(?:\.\d+)?)\s*(?:ล้าน|ล\.|million)?\s*(?:บาท|฿)?/i
  );
  if (priceUnder) {
    let n = parseThaiNumber(priceUnder[1]);
    if (/ล้าน|ล\.|million/i.test(priceUnder[0])) n *= 1_000_000;
    if (n > 0) criteria.maxPrice = n;
  }

  const yearMatch = text.match(/(?:ปี|year)\s*(\d{4})/i);
  if (yearMatch) criteria.year = Number(yearMatch[1]);

  for (const [alias, color] of Object.entries(COLOR_ALIASES)) {
    if (text.includes(`สี${alias}`) || text.includes(color)) {
      criteria.color = color;
      break;
    }
  }

  if (/\bsuv\b|อเนกประสงค์|รถใหญ่/i.test(text)) criteria.suvOnly = true;

  const exotic = text.match(/\b(Ferrari|Lamborghini|McLaren|Porsche)\b/i);
  if (exotic && !criteria.brand) criteria.brand = normalizeBrand(exotic[1]);

  return criteria;
}

export function isMarketplaceSearchIntent(message: string): boolean {
  return parseMarketplaceSearchQuery(message) != null;
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

export function searchMarketplaceForChat(
  cars: ChatInventoryCar[],
  criteria: ChatSearchCriteria
): { primary: ChatCarSummary[]; alternatives: ChatCarSummary[] } {
  const active = cars.filter(isVisibleOnMarketplaceChat);
  const limit = criteria.limit ?? 20; // Increased limit to support pagination
  const priceMatched = active
    .filter((car) => matchesBaseCriteria(car, criteria))
    .map(toChatCarSummary)
    .sort((a, b) => {
      // 1. Has image
      if (a.hasImage !== b.hasImage) return a.hasImage ? -1 : 1;
      // 2. Price
      if (a.price !== b.price) return a.price - b.price;
      // 3. Mileage
      if (a.mileage !== b.mileage) return a.mileage - b.mileage;
      // 4. Year
      return b.year - a.year;
    });

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

export function summariesToCarCards(
  primary: ChatCarSummary[],
  alternatives: ChatCarSummary[]
): import("../../../types").ChatCarCardData[] {
  const mapOne = (c: ChatCarSummary, matchKind: "exact" | "alternative") => ({
    id: c.id,
    brand: c.brand,
    model: c.model,
    year: c.year,
    price: c.price,
    mileage: c.mileage,
    color: c.color,
    fuelType: c.fuelType,
    condition: c.condition,
    bodyClass: c.bodyClass,
    bodyClassLabel: c.bodyClassLabel,
    showroomName: c.showroomName,
    imageUrl: c.hasImage ? c.image : undefined,
    hasImage: c.hasImage,
    detailPath: formatCarDetailPath(c.id),
    matchKind,
  });

  return [
    ...primary.map((c) => mapOne(c, "exact")),
    ...alternatives.map((c) => mapOne(c, "alternative")),
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
