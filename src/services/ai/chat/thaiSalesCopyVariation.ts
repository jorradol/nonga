/** v5.4.4b — deterministic Thai sales copy style & variation (facts-only) */

import type { ChatCarCardData } from "../../../types";
import type { ExtractedCarFields } from "./sellIntentParser";

export type ThaiCopyStyle =
  | "premium"
  | "honestOwner"
  | "valueEase"
  | "familyMpv"
  | "urbanWorker"
  | "dealerPro"
  | "gentleHook";

export interface ThaiCopyStyleInput {
  brand?: string;
  model?: string;
  price?: number;
  bodyClassLabel?: string;
  bodyType?: string;
  showroomName?: string;
  sellerType?: "member" | "dealer";
}

const PREMIUM_MODEL =
  /\b(camry|accord|mercedes|benz|bmw|lexus|e-?class|c-?class|s-?class|series\s*[35])\b/i;
const VALUE_MODEL =
  /\b(city|vios|yaris|almera|march|swift|mazda\s*2|soluto|celerio|mirage|attrage)\b/i;
const FAMILY_BODY = /suv|crossover|mpv|pickup|7\s*ที่นั่ง|อเนกประสงค์/i;
const URBAN_BODY = /sedan|hatchback|compact/i;

export function stableIndex(seed: string, slot: string, length: number): number {
  if (length <= 0) return 0;
  let hash = 2166136261;
  const text = `${seed}::${slot}`;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % length;
}

export function pickStableVariant<T>(
  seed: string,
  slot: string,
  variants: readonly T[]
): T {
  return variants[stableIndex(seed, slot, variants.length)]!;
}

export function inferThaiCopyStyle(input: ThaiCopyStyleInput): ThaiCopyStyle {
  const brandModel = `${input.brand ?? ""} ${input.model ?? ""}`.trim();
  const body = `${input.bodyClassLabel ?? ""} ${input.bodyType ?? ""}`.trim();
  const price = Number(input.price ?? 0);

  if (input.sellerType === "dealer" || input.showroomName?.trim()) {
    return "dealerPro";
  }
  if (PREMIUM_MODEL.test(brandModel) || price >= 1_500_000) {
    return "premium";
  }
  if (FAMILY_BODY.test(body)) {
    return "familyMpv";
  }
  if (VALUE_MODEL.test(brandModel) || (price > 0 && price <= 500_000)) {
    return "valueEase";
  }
  if (URBAN_BODY.test(body)) {
    return "urbanWorker";
  }
  if (price > 0 && price <= 800_000) {
    return "honestOwner";
  }
  return "gentleHook";
}

export function buildStableSeed(
  parts: Array<string | number | undefined | null>
): string {
  return parts.filter((p) => p != null && String(p).trim()).join("|") || "default";
}

export function buildSuitableForOpening(
  car: ChatCarCardData,
  primaryHint: string,
  seed = car.id
): string {
  const style = inferThaiCopyStyle({
    brand: car.brand,
    model: car.model,
    price: car.price,
    bodyClassLabel: car.bodyClassLabel,
    showroomName: car.showroomName,
  });

  const byStyle: Record<ThaiCopyStyle, readonly string[]> = {
    premium: [
      `ถ้ามองในมุมใช้งานจริง คันนี้เหมาะกับคุณพี่ที่มองหา${primaryHint} และอยากได้รถที่ภาพลักษณ์ดูดีตามสเปกในระบบครับ`,
      `จากข้อมูลที่มี ${car.brand} ${car.model} น่าจะตอบโจทย์คุณพี่ที่เน้น${primaryHint} ในงบและสเปกที่ระบุไว้ครับ`,
    ],
    honestOwner: [
      `ถ้าโจทย์ของคุณพี่คือรถที่ใช้งานง่ายและดูแลง่าย คันนี้ถือว่าน่าเก็บไว้พิจารณาครับ — เหมาะกับ${primaryHint}`,
      `คันนี้จุดที่น่าสนใจคือเหมาะกับ${primaryHint} โดยอิงจากสเปกที่ลงประกาศเท่านั้นครับ`,
    ],
    valueEase: [
      `สำหรับคนที่มองหารถใช้งานประจำวันในงบคุ้มค่า คันนี้มีองค์ประกอบที่น่าสนใจหลายจุดครับ — เหมาะกับ${primaryHint}`,
      `ถ้าเน้นใช้งานจริงและคุมงบ คันนี้เหมาะกับ${primaryHint} ตามข้อมูลที่มีตอนนี้ครับ`,
    ],
    familyMpv: [
      `ถ้าใช้กับครอบครัวหรือต้องการพื้นที่ใช้สอย คันนี้เหมาะกับ${primaryHint} จากสเปกในระบบครับ`,
      `มุมครอบครัว/อเนกประสงค์ คันนี้น่าสนใจสำหรับ${primaryHint} ตามข้อมูลประกาศครับ`,
    ],
    urbanWorker: [
      `สำหรับคนทำงานในเมืองที่อยากได้รถขับง่าย คันนี้เหมาะกับ${primaryHint} ตามสเปกที่ระบุครับ`,
      `ถ้ามองในมุมเดินทางประจำวัน คันนี้ตอบโจทย์${primaryHint} จากข้อมูลที่มีครับ`,
    ],
    dealerPro: [
      `จากสต๊อกในระบบ คันนี้เหมาะกับ${primaryHint} โดยอิงจากสเปกที่ลงประกาศครับ`,
      `ทีมงานสรุปจากข้อมูลประกาศว่า คันนี้เหมาะกับ${primaryHint} ครับ`,
    ],
    gentleHook: [
      `จากข้อมูลที่มี คันนี้เหมาะกับคุณพี่ที่มองหา${primaryHint}ครับ`,
      `ต้องบอกแบบตรง ๆ ว่า จากสเปกในระบบ คันนี้เหมาะกับ${primaryHint}ครับ`,
    ],
  };

  return pickStableVariant(seed, "suitableFor.open", byStyle[style]);
}

export function buildHighlightsOpening(car: ChatCarCardData, seed = car.id): string {
  const style = inferThaiCopyStyle({
    brand: car.brand,
    model: car.model,
    price: car.price,
    bodyClassLabel: car.bodyClassLabel,
  });
  const label = `${car.brand} ${car.model} ปี ${car.year}`.trim();

  const variants: Record<ThaiCopyStyle, readonly string[]> = {
    premium: [
      `ต้องบอกแบบตรง ๆ ว่า จุดเด่นที่เห็นจากข้อมูลตอนนี้ของ ${label} คือ:`,
      `คันนี้จุดที่น่าสนใจจากประกาศ ${label}:`,
    ],
    honestOwner: [
      `ถ้ามองจากข้อมูลประกาศ ${label} จุดที่เห็นได้ชัดคือ:`,
      `จากข้อมูลที่มี ${label} — จุดเด่นที่ระบุไว้คือ:`,
    ],
    valueEase: [
      `มุมคุ้มค่า/ใช้งานจริง จุดที่เห็นจากประกาศ ${label}:`,
      `คันนี้จุดที่น่าสนใจจากข้อมูลในระบบ (${label}):`,
    ],
    familyMpv: [
      `มุมครอบครัว/อเนกประสงค์ จุดเด่นจากประกาศ ${label}:`,
      `ถ้ามองการใช้งานในบ้าน จุดที่เห็นจากข้อมูล ${label}:`,
    ],
    urbanWorker: [
      `มุมใช้งานในเมือง จุดเด่นจากประกาศ ${label}:`,
      `สำหรับคนขับประจำวัน จุดที่เห็นจากข้อมูล ${label}:`,
    ],
    dealerPro: [
      `จากข้อมูลประกาศ ${label} จุดเด่นที่ระบุไว้คือ:`,
      `สรุปจุดเด่นจากสต๊อก (${label}):`,
    ],
    gentleHook: [
      `คันนี้จุดที่น่าสนใจจากข้อมูลประกาศ ${label}:`,
      `ถ้ามองในมุมใช้งานจริง จุดเด่นที่เห็นจาก ${label}:`,
    ],
  };

  return pickStableVariant(seed, "highlights.open", variants[style]);
}

export function buildSummaryOpening(car: ChatCarCardData, seed = car.id): string {
  const label = `${car.brand} ${car.model} ปี ${car.year}`.trim();
  return pickStableVariant(seed, "summary.open", [
    `เดี๋ยวน้องเอช่วยไล่ให้ดูแบบเข้าใจง่ายนะครับ — ${label}`,
    `สรุป ${label} จากข้อมูลในระบบให้ครับ:`,
    `ภาพรวม ${label} ตามที่ลงประกาศไว้:`,
  ] as const);
}

export function buildPrePurchaseOpening(car: ChatCarCardData, seed = car.id): string {
  const label = `${car.brand} ${car.model} ปี ${car.year}`.trim();
  return pickStableVariant(seed, "prePurchase.open", [
    `ก่อนตัดสินใจซื้อ ${label} จุดที่ควรเช็กเพิ่มคือ:`,
    `ถ้าสนใจ ${label} จริง ๆ แนะนำเช็กเพิ่มตามนี้ครับ:`,
    `สำหรับ ${label} ข้อมูลเหล่านี้ยังต้องตรวจจริงเพิ่มครับ:`,
  ] as const);
}

export function buildUnknownHistoryReply(seed: string): string {
  const opener = pickStableVariant(seed, "unknownHistory.open", [
    "ข้อมูลเรื่องประวัติชนยังไม่มีในระบบครับ",
    "ข้อมูลส่วนนี้ระบบยังไม่มีนะครับ — เรื่องประวัติชน/อุบัติเหตุ",
    "ต้องบอกตรง ๆ ว่า ระบบยังไม่มีข้อมูลประวัติชนครับ",
  ] as const);
  const caution = pickStableVariant(seed, "unknownHistory.caution", [
    "น้องเอยังไม่อยากฟันธงเกินข้อมูลที่มีนะครับ",
    "น้องเอไม่สามารถยืนยันประวัติที่ไม่มีใน record ครับ",
  ] as const);
  const advice = pickStableVariant(seed, "unknownHistory.advice", [
    "แนะนำให้ตรวจเล่ม ประวัติเคลม จุดเชื่อมตัวถัง และให้ช่างช่วยดูอีกชั้น จะปลอดภัยกว่าครับ",
    "แนะนำให้ดูรถจริงหรือให้ช่างช่วยเช็กอีกชั้น จะอุ่นใจกว่าครับ",
  ] as const);
  return [opener, caution, advice].join("\n");
}

export function buildNoDataPhrase(seed: string, slot: string): string {
  return pickStableVariant(seed, slot, [
    "ข้อมูลส่วนนี้ระบบยังไม่มีนะครับ",
    "ยังไม่มีข้อมูลนี้ในระบบครับ",
    "ตอนนี้ระบบยังไม่มีข้อมูลส่วนนี้ครับ",
  ] as const);
}

export function buildSellerMarketingPostCopy(
  fields: ExtractedCarFields,
  refCode: string,
  vision?: { brand?: string; model?: string; color?: string; bodyType?: string }
): string {
  const brand = fields.brand?.trim() || vision?.brand?.trim() || "";
  const model = fields.model?.trim() || vision?.model?.trim() || "";
  const year =
    fields.year != null && Number.isFinite(Number(fields.year))
      ? String(fields.year)
      : "";
  const color = (fields.color?.trim() || vision?.color?.trim())
    ?.replace(/\s*\([^)]*\)\s*/g, " ")
    .trim();
  const bodyType = vision?.bodyType?.trim();
  const mileage =
    fields.mileage != null && Number.isFinite(Number(fields.mileage))
      ? `${Number(fields.mileage).toLocaleString("th-TH")} กม.`
      : "-";
  const price =
    fields.price != null && Number(fields.price) > 0
      ? `${Number(fields.price).toLocaleString("th-TH")} บาท`
      : "-";
  const gear = fields.transmission?.trim()
    ? fields.transmission.replace(/^เกียร์\s*/i, "").trim()
      ? `เกียร์${fields.transmission.replace(/^เกียร์\s*/i, "").trim()}`
      : fields.transmission
    : undefined;

  const seed = buildStableSeed([refCode, brand, model, year]);
  const style = inferThaiCopyStyle({
    brand,
    model,
    price: fields.price,
    bodyType,
    sellerType: "member",
  });

  const nameLine = [brand, model].filter(Boolean).join(" ");
  const detailParts = [
    nameLine || null,
    year ? `ปี ${year}` : null,
    color ? `สี${color}` : null,
    mileage !== "-" ? `เลขไมล์ ${mileage}` : null,
    gear ?? null,
    price !== "-" ? `ราคา ${price}` : null,
  ].filter(Boolean);

  const hooks: Record<ThaiCopyStyle, readonly string[]> = {
    premium: [
      `เปิดตัว ${nameLine || "รถคันนี้"} จากข้อมูลที่ลงประกาศ — สเปกและราคาตามที่ระบุในระบบครับ`,
      `${nameLine || "รถคันนี้"} มาในงบและสเปกที่ลงไว้ชัดเจน น่าดูต่อสำหรับคนที่มองหารถใช้งานจริงครับ`,
    ],
    honestOwner: [
      `ขายตรงจากข้อมูลจริงครับ — ${nameLine || "รถคันนี้"} ตามสเปกที่ระบุ`,
      `ประกาศนี้สรุปจากข้อมูลที่เจ้าของรถให้ไว้ ไม่แต่งเกินจริงครับ`,
    ],
    valueEase: [
      `มุมคุ้มค่า/ใช้งานง่าย — ${nameLine || "รถคันนี้"} ตามข้อมูลในระบบ`,
      `ถ้ามองรถใช้งานประจำวันในงบนี้ ${nameLine || "คันนี้"} น่าดูต่อจากสเปกที่ลงไว้ครับ`,
      `${nameLine || "รถคันนี้"} มุมใช้งานจริงในงบนี้ ตามสเปกที่ระบุครับ`,
      `รถใช้งานประจำวัน — ${nameLine || "คันนี้"} จากข้อมูลประกาศ`,
      `ในงบนี้ ${nameLine || "คันนี้"} เป็นตัวเลือกที่น่าดูต่อจากสเปกในระบบครับ`,
    ],
    familyMpv: [
      `มุมครอบครัว/อเนกประสงค์ — ${nameLine || "รถคันนี้"} จากข้อมูลประกาศ`,
      `เหมาะกับคนที่มองหารถใช้งานหลายแบบ ${nameLine || "คันนี้"} ตามสเปกในระบบครับ`,
    ],
    urbanWorker: [
      `มุมคนเมือง/วัยทำงาน — ${nameLine || "รถคันนี้"} ขับง่ายตามสเปกที่ระบุ`,
      `สำหรับเดินทางประจำวัน ${nameLine || "คันนี้"} ตามข้อมูลที่ลงประกาศครับ`,
    ],
    dealerPro: [
      `จากสต๊อกในระบบ — ${nameLine || "รถคันนี้"} ข้อมูลตามประกาศ`,
      `ทีมงานแนะนำ ${nameLine || "รถคันนี้"} จากข้อมูลที่ลงไว้ในระบบครับ`,
    ],
    gentleHook: [
      `คันนี้น่าดูต่อจากข้อมูลที่ลงประกาศ — ${nameLine || "รถคันนี้"}`,
      `ถ้ามองในมุมใช้งานจริง ${nameLine || "คันนี้"} มีสเปกที่น่าสนใจตามที่ระบุครับ`,
    ],
  };

  const closers: Record<ThaiCopyStyle, readonly string[]> = {
    premium: [
      "เหมาะกับคนที่มองหารถใช้งานจริงในงบและสเปกนี้ แนะนำดูรายละเอียดเพิ่มก่อนตัดสินใจครับ",
      "แนะนำสอบถามรายละเอียดเพิ่มและดูรถจริงเพื่อความมั่นใจครับ",
    ],
    honestOwner: [
      "ข้อมูลตามที่ลงประกาศ แนะนำดูรถจริงและตรวจเอกสารก่อนตัดสินใจครับ",
      "สนใจสอบถามเพิ่มได้ ข้อมูลตามที่ระบุในระบบครับ",
    ],
    valueEase: [
      "มุมคุ้มค่า/ใช้งานจริง แนะนำเทียบสเปกและดูรถจริงก่อนตัดสินใจครับ",
      "เหมาะกับคนคุมงบ แนะนำดูรายละเอียดเพิ่มครับ",
    ],
    familyMpv: [
      "เหมาะกับครอบครัวหรือใช้งานหลายแบบ แนะนำดูพื้นที่และทดลองขับครับ",
      "แนะนำดูรูป/สเปกเพิ่มและนัดดูรถจริงครับ",
    ],
    urbanWorker: [
      "เหมาะกับเดินทางประจำวัน แนะนำทดลองขับและเช็กสภาพจริงครับ",
      "แนะนำดูรายละเอียดเพิ่มตามความต้องการใช้งานครับ",
    ],
    dealerPro: [
      "สอบถามรายละเอียดเพิ่มได้ ข้อมูลตามที่ลงในระบบครับ",
      "ทีมงานพร้อมให้ข้อมูลตามประกาศ แนะนำดูรถจริงครับ",
    ],
    gentleHook: [
      "น่าดูต่อจากสเปกที่ลงไว้ แนะนำสอบถามเพิ่มครับ",
      "แนะนำดูรายละเอียดและตรวจรถจริงก่อนตัดสินใจครับ",
    ],
  };

  const hook = pickStableVariant(seed, "seller.hook", hooks[style]);
  const details = detailParts.length > 0 ? detailParts.join(" · ") : "รายละเอียดตามประกาศ";
  const closer = pickStableVariant(seed, "seller.closer", closers[style]);

  const blocks: string[] = [`${hook} ${details}.`, closer];

  if (fields.description?.trim()) {
    const extras = fields.description
      .split(/[,·]/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (extras.length > 0) {
      blocks.push(
        "",
        "จุดเสริมจากข้อมูลที่ให้มา:",
        ...extras.map((item) => `• ${item}`)
      );
    }
  }

  blocks.push("", `สอบถามกับน้องเอ รหัสรถ: ${refCode}`);
  return blocks.join("\n");
}

export interface ListingDescriptionInputLike {
  brand?: string;
  model?: string;
  year?: number;
  price?: number;
}

export function buildListingDescriptionIntro(
  input: ListingDescriptionInputLike,
  seed: string
): string {
  const style = inferThaiCopyStyle({
    brand: input.brand,
    model: input.model,
    price: input.price,
  });
  const headline =
    input.brand && input.model
      ? `${input.brand} ${input.model}${input.year ? ` ปี ${input.year}` : ""}`
      : "รถคันนี้";

  const intros: Record<ThaiCopyStyle, readonly string[]> = {
    premium: [
      `${headline} — สรุปจากสเปกที่มี เน้นข้อมูลจริงตามที่ระบุ`,
      `${headline} จากข้อมูลที่ให้มา อ่านง่ายและตรงประเด็นครับ`,
    ],
    honestOwner: [
      `${headline} ขายตรงจากข้อมูลที่มี ไม่แต่งเกินจริง`,
      `${headline} — ร่างจากสเปกจริงที่ให้ไว้ครับ`,
    ],
    valueEase: [
      `${headline} มุมคุ้มค่า/ใช้งานง่าย ตามข้อมูลที่มี`,
      `${headline} — เหมาะกับคนหารถใช้งานประจำวันครับ`,
    ],
    familyMpv: [
      `${headline} มุมครอบครัว/อเนกประสงค์ จากข้อมูลที่มี`,
      `${headline} — สรุปสเปกสำหรับใช้งานหลายแบบครับ`,
    ],
    urbanWorker: [
      `${headline} มุมคนเมือง/วัยทำงาน ตามสเปกที่ระบุ`,
      `${headline} — เน้นใช้งานประจำวันจากข้อมูลจริง`,
    ],
    dealerPro: [
      `${headline} จากสต๊อก/ข้อมูลในระบบ ตามที่ลงประกาศ`,
      `${headline} — สรุปสเปกตาม record ครับ`,
    ],
    gentleHook: [
      `${headline} น่าดูต่อจากข้อมูลที่มี`,
      `${headline} — ร่างจากสเปกที่ให้ไว้ครับ`,
    ],
  };

  return pickStableVariant(seed, "listing.intro", intros[style]);
}

export function buildDraftPreviewIntro(seed: string): string {
  return pickStableVariant(seed, "draftPreview.intro", [
    "น้องเอสรุปข้อมูลเบื้องต้นให้แล้วครับ:",
    "เดี๋ยวน้องเอไล่ข้อมูลที่ได้รับให้ดูก่อนนะครับ:",
    "จากข้อมูลที่คุณให้มา สรุปเบื้องต้นได้ดังนี้ครับ:",
  ] as const);
}

export function buildSearchFoundOpener(
  style: ThaiCopyStyle,
  seed: string,
  slot: "single" | "multi",
  payload: {
    count?: number;
    label?: string;
    budgetPart?: string;
    typeHint?: string;
  }
): string {
  // Neutral buyer-facing openers only — no UI CTAs, no default "ลุง".
  // Rich car summaries are appended by chatSearchReplyCopy (not in this opener).
  if (slot === "single") {
    return pickStableVariant(seed, "search.single", [
      `มีครับ เจอ ${payload.label ?? "รถที่ตรงเงื่อนไข"} อยู่ 1 คันในตลาดตอนนี้ครับ`.trim(),
      `มีครับ เจอ ${payload.label ?? "รถที่ตรงเงื่อนไข"} ในตลาดตอนนี้ 1 คันครับ`.trim(),
      `มีครับ — ${payload.label ?? "รถที่ตรงเงื่อนไข"} ตอนนี้มี 1 คันในตลาดครับ`.trim(),
    ] as const);
  }

  const count = payload.count ?? "";
  const budgetPart = payload.budgetPart ?? "";
  const typeHint = payload.typeHint ?? "รถ";
  const multiByStyle: Record<ThaiCopyStyle, readonly string[]> = {
    premium: [
      `มีครับ เจอ ${typeHint}${budgetPart} อยู่ ${count} คันในตลาดตอนนี้ครับ`,
      `มีครับ ตอนนี้มี ${count} คัน${budgetPart} ตามเงื่อนไขที่ค้นครับ`,
    ],
    honestOwner: [
      `มีครับ เจอ ${count} คัน${budgetPart} จากข้อมูลจริงในตลาดตอนนี้ครับ`,
      `มีครับ เจอ ${count} คัน${budgetPart} ในตลาดตอนนี้ครับ`,
    ],
    valueEase: [
      `มีครับ ในงบ${budgetPart ? budgetPart.replace(/^ใน/, "") : ""} มี ${count} คันที่น่าดูต่อครับ`,
      `มีครับ เจอ ${count} คันคุ้มค่า${budgetPart} ตามข้อมูลในระบบครับ`,
    ],
    familyMpv: [
      `มีครับ เจอ ${typeHint} ${count} คัน${budgetPart} ที่น่าสนใจครับ`,
      typeHint === "หลายแนว"
        ? `มีครับ เจอ ${count} คัน${budgetPart} มีหลายแนวให้เลือกครับ`
        : `มีครับ เจอ ${count} คัน${budgetPart} สำหรับมุมครอบครัว/อเนกประสงค์ครับ`,
    ],
    urbanWorker: [
      `มีครับ เจอตัวเลือก ${count} คัน${budgetPart} สำหรับใช้งานประจำวันครับ`,
      `มีครับ เจอ ${count} คัน${budgetPart} ตามเงื่อนไขครับ`,
    ],
    dealerPro: [
      `มีครับ ในระบบมี ${count} คัน${budgetPart} ตามเงื่อนไขครับ`,
      `มีครับ พบ ${count} รายการ${budgetPart} จากข้อมูลในระบบครับ`,
    ],
    gentleHook: [
      `มีครับ เจอทั้งหมด ${count} คัน${budgetPart} ครับ`,
      `มีครับ เจอ ${typeHint} ${count} คัน${budgetPart} ที่เข้าเงื่อนไขครับ`,
    ],
  };

  return pickStableVariant(seed, "search.multi", multiByStyle[style]);
}

export function buildSelectedCarOpening(car: ChatCarCardData, seed = car.id): string {
  const style = inferThaiCopyStyle({
    brand: car.brand,
    model: car.model,
    price: car.price,
    bodyClassLabel: car.bodyClassLabel,
  });
  const label = `${car.brand} ${car.model} ปี ${car.year}`;
  const variants: Record<ThaiCopyStyle, readonly string[]> = {
    premium: [`จากข้อมูลที่มี คันนี้คือ ${label}`, `สรุปจากประกาศ — ${label}`],
    honestOwner: [`คันนี้คือ ${label} ตามข้อมูลในระบบ`, `จาก record ในระบบ: ${label}`],
    valueEase: [`มุมคุ้มค่า — ${label} ตามข้อมูลที่มี`, `คันนี้คือ ${label} จากข้อมูลประกาศ`],
    familyMpv: [`มุมครอบครัว/อเนกประสงค์ — ${label}`, `จากข้อมูลที่มี ${label}`],
    urbanWorker: [`มุมใช้งานประจำวัน — ${label}`, `จากข้อมูลในระบบ ${label}`],
    dealerPro: [`จากสต๊อกในระบบ — ${label}`, `ข้อมูลประกาศ: ${label}`],
    gentleHook: [`จากข้อมูลที่มี คันนี้คือ ${label}`, `คันนี้คือ ${label} ตามที่ลงประกาศ`],
  };
  return pickStableVariant(seed, "selected.open", variants[style]);
}

export function openingFingerprint(text: string): string {
  return text.trim().slice(0, 48);
}
