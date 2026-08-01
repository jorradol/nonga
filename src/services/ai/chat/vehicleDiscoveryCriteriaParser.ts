/**
 * WP-VD01 — Parse / normalize Thai natural-language into VehicleDiscoveryCriteria.
 * Composes existing budget/brand parsers; adds transmission, age, monthly, refine.
 */

import {
  parseBuyerSearchBudgetMax,
  parseBuyerSearchIntent,
} from "./buyerSearchIntentParser";
import { parseMarketplaceSearchQuery } from "./marketplaceChatSearch";
import { estimateCarPriceFromMaxMonthly } from "../../../utils/financeCalculator";
import {
  DEFAULT_DISCOVERY_FINANCE_ASSUMPTIONS,
  type VehicleDiscoveryBodyHint,
  type VehicleDiscoveryContext,
  type VehicleDiscoveryCriteria,
  type VehicleDiscoveryRefineKind,
  type VehicleDiscoverySort,
  type VehicleDiscoveryTransmission,
} from "./vehicleDiscoveryTypes";

const THAI_WORD_TO_NUM: Record<string, number> = {
  หนึ่ง: 1,
  สอง: 2,
  สาม: 3,
  สี่: 4,
  ห้า: 5,
  หก: 6,
  เจ็ด: 7,
  แปด: 8,
  เก้า: 9,
};

function parseDigits(raw: string): number {
  return Number(String(raw).replace(/,/g, ""));
}

function pushUnique(arr: string[], value: string): void {
  if (!arr.includes(value)) arr.push(value);
}

function detectRefineKind(message: string): VehicleDiscoveryRefineKind | null {
  const t = message.trim();
  if (/ถูกกว่า(?:นี้|เดิม)?|ถูกลง|ราคา(?:ถูก|ต่ำ)กว่า|งบ(?:น้อย|ต่ำ)กว่า/i.test(t)) {
    return "cheaper";
  }
  if (/ปีใหม่กว่า(?:นี้|เดิม)?|ใหม่กว่า(?:นี้)?|รุ่นใหม่กว่า|อายุน้อยกว่า/i.test(t)) {
    return "newer";
  }
  if (
    /เอาเฉพาะ|เฉพาะ(?:ยี่ห้อ)?|แบรนด์เดียว|ยี่ห้อเดียว/i.test(t) ||
    /เอาเฉพาะ\s*(toyota|honda|mazda|nissan|isuzu|suzuki|โตโยต้า|ฮอนด้า)/i.test(t)
  ) {
    return "brandOnly";
  }
  if (
    /ใหญ่ขึ้น|รถใหญ่กว่า|ตัวถังใหญ่|ขอ(?:รถ)?ใหญ่|SUV\s*กว่า|อเนกประสงค์กว่า/i.test(
      t
    )
  ) {
    return "larger";
  }
  if (/ดูเพิ่ม|ขอดูเพิ่ม|ดูต่อ|ขออีก(?:\s*\d+\s*คัน)?|มีอีกไหม|อีก\s*\d+\s*คัน/i.test(t)) {
    return "showMore";
  }
  return null;
}

/** Monthly installment search cue — not selected-car finance calculator. */
export function parseDiscoveryMonthlyMax(message: string): number | undefined {
  const t = message.trim().replace(/\s+/g, " ");
  const patterns = [
    /ผ่อน(?:ประมาณ)?(?:เดือน)?ละ\s*(?:ไม่เกิน|ไม่เกิ)?\s*([\d,]+)/i,
    /ค่างวด(?:ประมาณ)?(?:ไม่เกิน|ไม่เกิ|เดือนละ)?\s*([\d,]+)/i,
    /เดือนละ\s*(?:ประมาณ\s*)?(?:ไม่เกิน\s*)?([\d,]+)\s*(?:บาท|฿)?/i,
    /งบผ่อน\s*(?:ไม่เกิน|ประมาณ)?\s*([\d,]+)/i,
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (!m) continue;
    const n = parseDigits(m[1]);
    // Installment ranges are typically thousands, not full car prices
    if (n >= 1_000 && n <= 200_000) return Math.round(n);
  }
  return undefined;
}

function parseMaxAgeYears(message: string): number | undefined {
  const t = message.trim();
  const digit = t.match(
    /(?:ไม่เกิน|ภายใน|อายุ(?:รถ)?(?:ไม่เกิน)?|รถ(?:อายุ)?ไม่เกิน)\s*(\d+)\s*ปี/i
  );
  if (digit) {
    const n = Number(digit[1]);
    if (n >= 1 && n <= 30) return n;
  }
  const thai = t.match(
    /(?:ไม่เกิน|ภายใน|อายุ(?:รถ)?(?:ไม่เกิน)?)\s*(หนึ่ง|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า)\s*ปี/i
  );
  if (thai) {
    const n = THAI_WORD_TO_NUM[thai[1]];
    if (n != null && n >= 1 && n <= 30) return n;
  }
  // "ขอรถไม่เกิน 5 ปี" without อายุ prefix
  const bare = t.match(/รถไม่เกิน\s*(\d+)\s*ปี/i);
  if (bare) {
    const n = Number(bare[1]);
    if (n >= 1 && n <= 30) return n;
  }
  return undefined;
}

function parseTransmission(
  message: string
): VehicleDiscoveryTransmission | undefined {
  const t = message;
  if (/เกียร์(?:ออโต้|อัตโนมัติ)|ออโต้(?:เกียร์)?|\bAT\b|automatic/i.test(t)) {
    return "auto";
  }
  if (/เกียร์(?:ธรรมดา|แมนนวล)|ธรรมดา|\bMT\b|manual/i.test(t)) {
    return "manual";
  }
  return undefined;
}

function parseSort(message: string): VehicleDiscoverySort | undefined {
  const t = message;
  if (/เรียง(?:จาก)?ราคา(?:ถูก|ต่ำ)|ราคาถูกสุด|ถูกที่สุด/i.test(t)) return "priceAsc";
  if (/ราคาแพง|แพงสุด/i.test(t)) return "priceDesc";
  if (/ปีใหม่สุด|ใหม่ที่สุด|เรียง(?:ตาม)?ปี/i.test(t)) return "yearDesc";
  if (/ปีเก่า/i.test(t)) return "yearAsc";
  return undefined;
}

function parseBudgetMin(message: string): number | undefined {
  const processed = message.trim();
  const m = processed.match(
    /(?:ตั้งแต่|ขั้นต่ำ|งบ(?:อย่างน้อย|ขั้นต่ำ)|ราคา(?:ตั้งแต่|ขั้นต่ำ))\s*([\d,]+(?:\.\d+)?)\s*(แสน|ล้าน)?/i
  );
  if (!m) return undefined;
  let n = parseDigits(m[1]);
  if (m[2]) {
    if (/แสน/i.test(m[2])) n *= 100_000;
    else if (/ล้าน/i.test(m[2])) n *= 1_000_000;
  }
  return n > 0 ? n : undefined;
}

function collectBodyHints(
  message: string,
  usageTags: string[]
): VehicleDiscoveryBodyHint[] {
  const hints: VehicleDiscoveryBodyHint[] = [];
  const t = message;
  if (/\bsuv\b|อเนกประสงค์/i.test(t)) hints.push("suv");
  if (/กระบะ|pickup/i.test(t)) hints.push("pickup");
  if (/ซีดาน|sedan/i.test(t)) hints.push("sedan");
  if (/แฮทช์|hatchback|รถ(?:คัน)?เล็ก|รถเล็ก/i.test(t)) hints.push("hatchback");
  if (/7\s*ที่นั่ง|เจ็ดที่นั่ง|mpv/i.test(t) || usageTags.includes("family")) {
    if (!hints.includes("mpv")) hints.push("mpv");
  }
  if (usageTags.includes("city") && hints.length === 0) {
    hints.push("hatchback", "sedan");
  }
  if (
    (usageTags.includes("firstCar") || /มือใหม่|ผู้เริ่มต้น/i.test(t)) &&
    hints.length === 0
  ) {
    hints.push("hatchback", "sedan");
  }
  return hints;
}

function collectUsageTags(message: string): string[] {
  const intent = parseBuyerSearchIntent(message);
  const tags = [...(intent.usageTags ?? [])];
  if (/มือใหม่|ผู้เริ่มต้น|มือใหม่หัดขับ/i.test(message)) {
    pushUnique(tags, "firstCar");
  }
  if (/ไปทำงาน|ขับ(?:ไป)?ทำงาน|เดินทางไปทำงาน/i.test(message)) {
    pushUnique(tags, "city");
  }
  return tags;
}

function buildAppliedLabels(c: VehicleDiscoveryCriteria): string[] {
  const labels: string[] = [];
  if (c.budgetMax != null) {
    labels.push(`งบไม่เกิน ${c.budgetMax.toLocaleString("th-TH")} บาท`);
  }
  if (c.budgetMin != null) {
    labels.push(`งบขั้นต่ำ ${c.budgetMin.toLocaleString("th-TH")} บาท`);
  }
  if (c.estimatedMonthlyMax != null) {
    labels.push(
      `ค่างวดประมาณไม่เกิน ${c.estimatedMonthlyMax.toLocaleString("th-TH")} บาท/เดือน`
    );
  }
  if (c.brand) labels.push(`ยี่ห้อ ${c.brand}`);
  if (c.model) labels.push(`รุ่น ${c.model}`);
  if (c.yearExact != null) labels.push(`ปี ${c.yearExact}`);
  if (c.minYear != null) labels.push(`ปีตั้งแต่ ${c.minYear}`);
  if (c.maxAgeYears != null) labels.push(`อายุไม่เกิน ${c.maxAgeYears} ปี`);
  if (c.bodyHints?.length) labels.push(`ประเภท ${c.bodyHints.join("/")}`);
  if (c.transmission === "auto") labels.push("เกียร์ออโต้");
  if (c.transmission === "manual") labels.push("เกียร์ธรรมดา");
  if (c.fuelEfficient) labels.push("เน้นประหยัดน้ำมัน");
  if (c.usageTags?.length) {
    const map: Record<string, string> = {
      family: "ครอบครัว",
      city: "ไปทำงาน/ในเมือง",
      firstCar: "มือใหม่/คันแรก",
      fuelEfficient: "ประหยัดน้ำมัน",
      easyMaintenance: "ดูแลง่าย",
      lowMaintenance: "ไม่จุกจิก",
    };
    for (const tag of c.usageTags) {
      labels.push(map[tag] ?? tag);
    }
  }
  if (c.refineKind === "cheaper") labels.push("ถูกกว่าคันอ้างอิง");
  if (c.refineKind === "newer") labels.push("ปีใหม่กว่าคันอ้างอิง");
  if (c.refineKind === "larger") labels.push("ตัวถังใหญ่ขึ้น");
  return [...new Set(labels)];
}

function applyRefineToCriteria(
  base: VehicleDiscoveryCriteria,
  refine: VehicleDiscoveryRefineKind,
  context: VehicleDiscoveryContext
): VehicleDiscoveryCriteria {
  const next: VehicleDiscoveryCriteria = {
    ...base,
    isDiscovery: true,
    refineKind: refine,
  };

  const selectedId = context.selectedListingId;
  const refCar =
    (selectedId &&
      context.contextCars?.find((c) => c.id === selectedId)) ||
    context.contextCars?.[0];

  if (refine === "cheaper" && refCar && refCar.price > 0) {
    next.budgetMax = Math.max(0, refCar.price - 1);
    pushUnique(
      (next.appliedLabels ??= []),
      `ถูกกว่า ${refCar.brand} ${refCar.model} (${refCar.price.toLocaleString("th-TH")} บาท)`
    );
  }
  if (refine === "newer" && refCar && refCar.year > 0) {
    next.minYear = refCar.year + 1;
    pushUnique(
      (next.appliedLabels ??= []),
      `ปีใหม่กว่า ${refCar.year}`
    );
  }
  if (refine === "larger") {
    next.bodyHints = ["suv", "mpv", "pickup"];
  }
  if (refine === "brandOnly" && refCar?.brand) {
    next.brand = refCar.brand;
  }
  return next;
}

/**
 * Parse Thai buyer message into structured discovery criteria.
 * Does not invent listing fields — unverifiable asks go into unverifiableConstraints.
 */
export function parseVehicleDiscoveryCriteria(
  message: string,
  context: VehicleDiscoveryContext = {}
): VehicleDiscoveryCriteria {
  const text = message.trim();
  if (!text) {
    return { isDiscovery: false };
  }

  const refineKind = detectRefineKind(text);
  const prior = context.priorCriteria;

  // Show-more is pagination, not a new criteria parse
  if (refineKind === "showMore") {
    return {
      ...(prior ?? {}),
      isDiscovery: true,
      refineKind: "showMore",
    };
  }

  const buyerIntent = parseBuyerSearchIntent(text);
  const market = parseMarketplaceSearchQuery(text);
  const usageTags = collectUsageTags(text);
  const bodyHints = collectBodyHints(text, usageTags);
  const transmission = parseTransmission(text);
  const maxAgeYears = parseMaxAgeYears(text);
  const monthlyMax = parseDiscoveryMonthlyMax(text);
  const budgetMin = parseBudgetMin(text);
  const sort = parseSort(text);
  const referenceYear = context.referenceYear ?? new Date().getFullYear();

  let budgetMax =
    buyerIntent.budgetMax ??
    market?.maxPrice ??
    parseBuyerSearchBudgetMax(text);

  const financeAssumptions = { ...DEFAULT_DISCOVERY_FINANCE_ASSUMPTIONS };
  if (monthlyMax != null && budgetMax == null) {
    const estimated = estimateCarPriceFromMaxMonthly({
      maxMonthlyBaht: monthlyMax,
      termMonths: financeAssumptions.termMonths,
      annualFlatRatePercent: financeAssumptions.annualFlatRatePercent,
      downPaymentPercent: financeAssumptions.downPaymentPercent,
    });
    if (estimated != null && estimated > 0) {
      budgetMax = estimated;
    }
  }

  const unverifiable: string[] = [];
  // Fuel economy numeric claims cannot be verified from listings
  if (/กม\.?\s*\/\s*ลิตร|km\/l|กินน้ำมันกี่/i.test(text)) {
    unverifiable.push("อัตรากินน้ำมันเป็นตัวเลข (กม./ลิตร) — ยังตรวจจากข้อมูลรถไม่ได้");
  }
  if (/ไม่เคยชน|ประวัติซ่อม|เลขไมล์จริง/i.test(text)) {
    unverifiable.push("ประวัติการชน/ซ่อมแบบรับประกัน — ยังตรวจจากข้อมูลรถไม่ได้");
  }

  const brand = market?.brand?.trim() || undefined;
  const model = market?.model?.trim() || undefined;
  const yearExact = market?.year;

  let minYear: number | undefined;
  if (maxAgeYears != null) {
    minYear = referenceYear - maxAgeYears;
  }

  const fuelEfficient =
    usageTags.includes("fuelEfficient") ||
    /ประหยัดน้ำมัน|ประหยัด\s*น้ำมัน/i.test(text);

  const hasStructure =
    budgetMax != null ||
    budgetMin != null ||
    monthlyMax != null ||
    Boolean(brand) ||
    Boolean(model) ||
    yearExact != null ||
    maxAgeYears != null ||
    bodyHints.length > 0 ||
    transmission != null ||
    usageTags.length > 0 ||
    fuelEfficient ||
    refineKind != null;

  const softWant =
    /(?:อยากได้|ต้องการ|ขอ|แนะนำ|มี|หา|ค้นหา).{0,80}(?:รถ|คัน|ไหม|มั้ย)/i.test(
      text
    ) || /หารถ|ค้นหารถ/i.test(text);

  const isDiscovery =
    hasStructure &&
    (softWant ||
      buyerIntent.isVehicleSearch ||
      refineKind != null ||
      Boolean(brand) ||
      Boolean(model) ||
      budgetMax != null ||
      monthlyMax != null ||
      maxAgeYears != null ||
      transmission != null);

  if (!isDiscovery && buyerIntent.needsClarification) {
    return {
      isDiscovery: false,
      needsClarification: true,
      clarificationQuestion: buyerIntent.clarificationQuestion,
      usageTags: usageTags.length ? usageTags : undefined,
    };
  }

  if (!isDiscovery) {
    return { isDiscovery: false };
  }

  let criteria: VehicleDiscoveryCriteria = {
    isDiscovery: true,
    ...(budgetMax != null ? { budgetMax } : {}),
    ...(budgetMin != null ? { budgetMin } : {}),
    ...(monthlyMax != null
      ? {
          estimatedMonthlyMax: monthlyMax,
          financeAssumptions,
        }
      : {}),
    ...(brand ? { brand } : {}),
    ...(model ? { model } : {}),
    ...(yearExact != null ? { yearExact } : {}),
    ...(minYear != null ? { minYear } : {}),
    ...(maxAgeYears != null ? { maxAgeYears, referenceYear } : {}),
    ...(bodyHints.length ? { bodyHints } : {}),
    ...(transmission ? { transmission } : {}),
    ...(usageTags.length ? { usageTags } : {}),
    ...(fuelEfficient ? { fuelEfficient: true } : {}),
    ...(sort ? { sort } : {}),
    ...(unverifiable.length ? { unverifiableConstraints: unverifiable } : {}),
    limit: 5,
  };

  // Merge prior criteria for refine follow-ups
  if (refineKind && prior?.isDiscovery) {
    criteria = {
      ...prior,
      ...criteria,
      isDiscovery: true,
      // Prefer newly stated overrides; keep prior budget/brand when not restated
      budgetMax: criteria.budgetMax ?? prior.budgetMax,
      budgetMin: criteria.budgetMin ?? prior.budgetMin,
      brand: criteria.brand ?? prior.brand,
      model: criteria.model ?? prior.model,
      usageTags: criteria.usageTags?.length
        ? criteria.usageTags
        : prior.usageTags,
      bodyHints: criteria.bodyHints?.length
        ? criteria.bodyHints
        : prior.bodyHints,
    };
    criteria = applyRefineToCriteria(criteria, refineKind, context);
  } else if (refineKind) {
    criteria = applyRefineToCriteria(criteria, refineKind, context);
  }

  // Brand-only refine from message brand when no selected car brand
  if (refineKind === "brandOnly" && !criteria.brand && brand) {
    criteria.brand = brand;
  }

  criteria.appliedLabels = buildAppliedLabels(criteria);

  if (
    !criteria.budgetMax &&
    !criteria.brand &&
    !criteria.model &&
    !criteria.bodyHints?.length &&
    !criteria.usageTags?.length &&
    !criteria.transmission &&
    !criteria.maxAgeYears &&
    !criteria.estimatedMonthlyMax &&
    !refineKind
  ) {
    criteria.needsClarification = true;
    criteria.clarificationQuestion =
      "ช่วยบอกงบประมาณ ยี่ห้อ หรือประเภทรถที่สนใจเพิ่มได้ไหมครับ จะได้ค้นจากรถจริงในระบบให้ตรงขึ้น";
  }

  return criteria;
}

export function isVehicleDiscoveryIntent(
  message: string,
  context: VehicleDiscoveryContext = {}
): boolean {
  return parseVehicleDiscoveryCriteria(message, context).isDiscovery;
}

/**
 * True when message is inventory search by monthly affordability —
 * must not be stolen by generic finance calculator (no selected car / no car price).
 */
export function isMonthlyAffordabilityDiscovery(message: string): boolean {
  const monthly = parseDiscoveryMonthlyMax(message);
  if (monthly == null) return false;
  if (/คันนี้|รถคันนี้|คันนั้น/i.test(message)) return false;
  if (/ราคารถ|รถราคา|ราคา\s*[\d,]{5,}/i.test(message)) return false;
  return (
    /(?:มี|หา|ขอ|อยากได้|แนะนำ).{0,60}(?:รถ|คัน|มือสอง)/i.test(message) ||
    /รถ.{0,40}ผ่อน/i.test(message)
  );
}
