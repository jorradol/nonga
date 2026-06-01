import type { PublishedMemberListingCardData } from "../../types";
import type { ExtractedCarFields } from "../ai/chat/sellIntentParser";
import type { VisionObservationSummary } from "../ai/chat/chatPrecheckLayer";
import { pickStableVariant } from "../ai/chat/thaiSalesCopyVariation";
import {
  PUBLIC_NONGA_BASE_URL,
  buildPublicListingDetailUrl,
  resolvePublicMarketplaceUrl,
} from "../../utils/publicNongaUrl";

export { PUBLIC_NONGA_BASE_URL } from "../../utils/publicNongaUrl";

export const SELLER_SHARE_SOFT_DISCLAIMER =
  "โปรดตรวจสอบข้อมูลจริงของรถก่อนตัดสินใจนะครับ";

export const SELLER_SHARE_COPY_SUCCESS_MESSAGE =
  "คัดลอกแล้วครับ คุณพี่นำไปโพสต์ต่อได้เลย";

const FORBIDDEN_PHRASES = [
  /ค่าคอม/i,
  /commission/i,
  /รับประกันขาย/i,
  /รับประกันสภาพรถ/i,
  /ขายได้แน่นอน/i,
  /รับประกันการขาย/i,
  /รับประกันเฮง/i,
  /ซื้อแล้วรวย/i,
  /รวยแน่นอน/i,
  /การันตีเฮง/i,
  /รับประกันโชค/i,
  /โชคลาภแน่นอน/i,
];

const CONTACT_FIELD_KEYS = new Set([
  "ownerPhone",
  "ownerEmail",
  "ownerLine",
  "contactPhone",
  "contactEmail",
  "contactLine",
  "contactName",
  "contactNote",
  "phone",
]);

const PHONE_IN_TEXT =
  /(?:0[689]\d[\s-]?\d{3}[\s-]?\d{4}|0\d[\s-]?\d{3}[\s-]?\d{4})/g;

const MAX_PANG_PURIYE_PER_POST = 1;

/** Fields used to build seller-facing share copy — no contact PII */
export interface SellerShareListingInput {
  brand?: string;
  model?: string;
  year?: number;
  price?: number;
  mileage?: number;
  transmission?: string;
  color?: string;
  fuelType?: string;
  description?: string;
  marketingCopy?: string;
  listingId?: string;
  detailPath?: string;
}

export function countPangPuriyeInText(text: string): number {
  return (text.match(/ปังปุริเย่/g) ?? []).length;
}

function shareCopySeed(input: SellerShareListingInput): string {
  return (
    input.listingId?.trim() ||
    [input.brand, input.model, input.year].filter(Boolean).join("-") ||
    "seller-share"
  );
}

export function pickSellerShareCopySuccessMessage(
  input: SellerShareListingInput
): string {
  return pickStableVariant(shareCopySeed(input), "copy-feedback", [
    SELLER_SHARE_COPY_SUCCESS_MESSAGE,
    "คัดลอกโพสต์เรียบร้อยครับ ขอให้รถคันนี้เจอเจ้าของใหม่ไว ๆ ปังปุริเย่!",
  ] as const);
}

function stripContactFieldsFromRecord(
  record: Record<string, unknown>
): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (CONTACT_FIELD_KEYS.has(key)) continue;
    next[key] = value;
  }
  return next;
}

export function sanitizeSellerShareText(text: string): string {
  let out = String(text ?? "").trim();
  for (const pattern of FORBIDDEN_PHRASES) {
    out = out.replace(pattern, "");
  }
  out = out.replace(PHONE_IN_TEXT, "");
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

export function assertSellerShareCopySafe(
  text: string,
  options?: { allowPangPuriye?: boolean; maxPangPuriye?: number }
): void {
  const allowPang = options?.allowPangPuriye ?? false;
  const maxPang = options?.maxPangPuriye ?? (allowPang ? MAX_PANG_PURIYE_PER_POST : 0);
  const pangCount = countPangPuriyeInText(text);
  if (pangCount > maxPang) {
    throw new Error(`share copy has too many ปังปุริเย่ (${pangCount} > ${maxPang})`);
  }

  for (const key of CONTACT_FIELD_KEYS) {
    if (new RegExp(`${key}\\s*[:=]`, "i").test(text)) {
      throw new Error(`share copy must not include contact field ${key}`);
    }
  }
  for (const pattern of FORBIDDEN_PHRASES) {
    if (pattern.test(text)) {
      throw new Error(`share copy contains forbidden phrase: ${pattern}`);
    }
  }
  if (PHONE_IN_TEXT.test(text)) {
    throw new Error("share copy must not include phone numbers");
  }
  if (/ส่ง lead|lead จริง/i.test(text)) {
    throw new Error("share copy must not reference lead system");
  }
}

function formatPrice(price?: number): string | null {
  if (price == null || !Number.isFinite(Number(price)) || Number(price) <= 0) {
    return null;
  }
  return `${Number(price).toLocaleString("th-TH")} บาท`;
}

function formatMileage(mileage?: number): string | null {
  if (mileage == null || !Number.isFinite(Number(mileage))) return null;
  return `${Number(mileage).toLocaleString("th-TH")} กม.`;
}

function formatFuelTypeThai(fuelType?: string): string | null {
  const raw = String(fuelType ?? "").trim().toLowerCase();
  if (!raw) return null;
  if (raw === "petrol" || raw.includes("benz")) return "เบนซิน";
  if (raw === "diesel") return "ดีเซล";
  if (raw === "electric" || raw === "ev") return "ไฟฟ้า";
  if (raw.includes("hybrid")) return "ไฮบริด";
  return raw;
}

function formatTransmissionDisplay(transmission?: string): string | null {
  const raw = String(transmission ?? "").trim();
  if (!raw) return null;
  if (/^เกียร์/i.test(raw)) return raw;
  if (/auto|at|ออโต/i.test(raw)) return "เกียร์ออโต้";
  if (/manual|mt|ธรรมด/i.test(raw)) return "เกียร์ธรรมดา";
  return `เกียร์${raw}`;
}

function brandModelLine(input: SellerShareListingInput): string {
  const parts = [input.brand, input.model].filter(Boolean).join(" ").trim();
  const year =
    input.year != null && Number.isFinite(Number(input.year))
      ? String(input.year)
      : "";
  if (parts && year) return `${parts} ปี ${year}`;
  return parts || year || "รถมือสอง";
}

function pickBodyText(input: SellerShareListingInput): string {
  const marketing = sanitizeSellerShareText(input.marketingCopy ?? "");
  const description = sanitizeSellerShareText(input.description ?? "");
  if (marketing && description && marketing !== description) {
    return `${marketing}\n\n${description}`;
  }
  return marketing || description || "";
}

function buildSpecBulletLines(input: SellerShareListingInput): string[] {
  const lines: string[] = [];
  if (input.year != null && Number.isFinite(Number(input.year))) {
    lines.push(`• ปี ${input.year}`);
  }
  const price = formatPrice(input.price);
  if (price) lines.push(`• ราคา ${price}`);
  const mileage = formatMileage(input.mileage);
  if (mileage) lines.push(`• เลขไมล์ ${mileage}`);
  const gear = formatTransmissionDisplay(input.transmission);
  if (gear) lines.push(`• ${gear}`);
  if (input.color?.trim()) lines.push(`• สี${input.color.trim()}`);
  const fuel = formatFuelTypeThai(input.fuelType);
  if (fuel) lines.push(`• เชื้อเพลิง ${fuel}`);
  return lines;
}

function buildAttractiveHeadline(input: SellerShareListingInput): string {
  const title = brandModelLine(input);
  const color = input.color?.trim();
  const seed = shareCopySeed(input);
  const colorBit = color ? ` สี${color}` : "";
  return pickStableVariant(seed, "headline", [
    `${title}${colorBit} — รถมือสองที่น่าจับตามองครับ`,
    `ปล่อยต่อ ${title}${colorBit} คันนี้มีเสน่ห์ ขับสบาย น่าใช้งานจริงครับ`,
    `🚗 ${title}${colorBit} พร้อมให้เจ้าของใหม่ต่อยอดความมั่นใจบนถนน`,
  ] as const);
}

function buildIntroParagraph(
  input: SellerShareListingInput,
  bodyText: string
): string | null {
  if (bodyText.length > 280) return null;
  const title = brandModelLine(input);
  const color = input.color?.trim();
  const seed = shareCopySeed(input);
  const colorPhrase = color ? `สี${color} ` : "";
  return pickStableVariant(seed, "intro", [
    `${title} ${colorPhrase}เหมาะกับคนที่มองหารถใช้งานจริง ดูดีในทุกวัน ขับสบาย และยังมีสไตล์ในคันเดียวครับ`,
    `${title} ${colorPhrase}ภาพลักษณ์ดูดี เหมาะทั้งใช้ในเมืองและเดินทางไกล ใครชอบรถที่ดูมีระดับแต่ยังใช้งานได้จริง คันนี้น่าสนใจครับ`,
    `${title} ${colorPhrase}เป็นอีกทางเลือกที่น่าจับตามองสำหรับคนที่อยากได้รถที่ดูน่าเชื่อถือและดูแลง่ายครับ`,
  ] as const);
}

function buildPitchLine(input: SellerShareListingInput): string {
  const seed = shareCopySeed(input);
  return pickStableVariant(seed, "pitch", [
    "คันนี้เหมาะกับคนที่มองหารถใช้งานจริง ดูดี ขับง่าย และยังมีสไตล์ในคันเดียวครับ",
    "ถ้าคุณพี่กำลังมองหารถที่ใช้ได้จริงทุกวัน ลองอ่านรายละเอียดและนัดดูรถจริงเพิ่มได้ครับ",
    "รถคันนี้เหมาะกับครอบครัวหรือคนทำงานที่อยากได้คันที่ดูดีและขับสบายในงบที่จับต้องได้ครับ",
  ] as const);
}

function buildWarmClosingFull(seed: string): string {
  return pickStableVariant(seed, "closing-full", [
    "ขอให้รถคันนี้ได้เจอเจ้าของใหม่ที่ถูกใจ พาไปเจอโอกาสดี ๆ เดินทางปลอดภัย การงานการค้าราบรื่นครับ",
    "ขอให้รถคันนี้พาเจ้าของใหม่ไปเจอโอกาสดี ๆ หน้าที่การงานราบรื่น การค้าขายเจริญรุ่งเรือง เดินทางปลอดภัย ปังปุริเย่!",
    "ขอให้รถคันนี้ไปต่อกับคนที่ใช่ การเดินทางราบรื่น งานการค้าดี ๆ ปังปุริเย่!",
    "ขอให้รถคันนี้ได้เจอมือที่สองที่รักและดูแลต่อ ทุกเส้นทางปลอดภัยครับ",
  ] as const);
}

function buildWarmClosingShort(seed: string): string {
  return pickStableVariant(seed, "closing-short", [
    "คันนี้พร้อมให้เจ้าของใหม่พาไปลุยต่อครับ",
    "คันนี้พร้อมให้เจ้าของใหม่พาไปลุยต่อครับ ปังปุริเย่!",
    "ลองทักมาคุยรายละเอียดเพิ่มได้ครับ ขอให้เจอคนที่ใช่เร็ว ๆ",
  ] as const);
}

function buildDetailUrl(input: SellerShareListingInput): string | null {
  if (input.detailPath?.trim()) {
    return resolvePublicMarketplaceUrl(input.detailPath);
  }
  if (input.listingId?.trim()) {
    return buildPublicListingDetailUrl(input.listingId);
  }
  return null;
}

/** Full post for Facebook / กลุ่มซื้อขาย — โทนนักการตลาดรถมือสองไทย */
export function generateSellerFullPost(input: SellerShareListingInput): string {
  const seed = shareCopySeed(input);
  const body = pickBodyText(input);
  const lines: string[] = [buildAttractiveHeadline(input), ""];

  const intro = buildIntroParagraph(input, body);
  if (intro) lines.push(intro, "");

  const specLines = buildSpecBulletLines(input);
  if (specLines.length > 0) {
    lines.push("รายละเอียดเบื้องต้น:", ...specLines, "");
  }

  if (body) {
    lines.push(body, "");
  }

  lines.push(buildPitchLine(input), "");

  const detailUrl = buildDetailUrl(input);
  if (detailUrl) {
    lines.push(`ดูประกาศบน Nong A: ${detailUrl}`, "");
  }

  lines.push(SELLER_SHARE_SOFT_DISCLAIMER, "", buildWarmClosingFull(seed));

  const text = lines.join("\n").trim();
  assertSellerShareCopySafe(text, { allowPangPuriye: true, maxPangPuriye: 1 });
  return text;
}

/** Short caption-style post */
export function generateSellerShortPost(input: SellerShareListingInput): string {
  const seed = shareCopySeed(input);
  const title = brandModelLine(input);
  const hooks = [
    `🔥 ปล่อย ${title} คันนี้น่าใช้ ราคาคุ้ม น่าจับตามองครับ`,
    `ขาย ${title} — รถมือสองที่ดูดี ขับง่าย ลงโพสต์ไวให้คนที่สนใจครับ`,
  ];
  const opener = pickStableVariant(seed, "short-hook", hooks);

  const chunks: string[] = [opener];
  const price = formatPrice(input.price);
  if (price) chunks.push(price);
  const mileage = formatMileage(input.mileage);
  if (mileage) chunks.push(`ไมล์ ${mileage}`);

  const marketing = sanitizeSellerShareText(input.marketingCopy ?? "");
  if (marketing) {
    const snippet = marketing.split(/[.!?\n]/)[0]?.trim();
    if (snippet && snippet.length <= 80) chunks.push(snippet);
  }

  const text = [
    chunks.filter(Boolean).join(" | "),
    "",
    SELLER_SHARE_SOFT_DISCLAIMER,
    buildWarmClosingShort(seed),
  ]
    .join("\n")
    .trim();

  assertSellerShareCopySafe(text, { allowPangPuriye: true, maxPangPuriye: 1 });
  return text;
}

/** Bullet spec list — ตรง ชัด ไม่เน้นอารมณ์ */
export function generateSellerSpecsText(input: SellerShareListingInput): string {
  const items: string[] = [];
  if (input.brand?.trim()) items.push(`• ยี่ห้อ: ${input.brand.trim()}`);
  if (input.model?.trim()) items.push(`• รุ่น: ${input.model.trim()}`);
  if (input.year != null && Number.isFinite(Number(input.year))) {
    items.push(`• ปี: ${input.year}`);
  }
  const price = formatPrice(input.price);
  if (price) items.push(`• ราคา: ${price}`);
  const mileage = formatMileage(input.mileage);
  if (mileage) items.push(`• เลขไมล์: ${mileage}`);
  const gear = formatTransmissionDisplay(input.transmission);
  if (gear) items.push(`• ${gear}`);
  if (input.color?.trim()) items.push(`• สี: ${input.color.trim()}`);

  if (items.length === 0) {
    items.push(`• ${brandModelLine(input)}`);
  }

  const text = [...items, "", SELLER_SHARE_SOFT_DISCLAIMER].join("\n").trim();
  assertSellerShareCopySafe(text, { allowPangPuriye: false, maxPangPuriye: 0 });
  return text;
}

export function buildSellerShareInputFromPublishedCard(
  card: PublishedMemberListingCardData
): SellerShareListingInput {
  const rawFields = stripContactFieldsFromRecord(
    (card.fields ?? {}) as Record<string, unknown>
  );
  const fields = rawFields as ExtractedCarFields;
  const vision = card.visionSummary as VisionObservationSummary | undefined;

  return {
    brand: fields.brand || vision?.brand,
    model: fields.model || vision?.model,
    year: fields.year,
    price: fields.price,
    mileage: fields.mileage,
    transmission: fields.transmission,
    color: fields.color || vision?.color,
    fuelType: fields.fuelType,
    description:
      typeof fields.description === "string" ? fields.description : undefined,
    marketingCopy: card.marketingCopy,
    listingId: card.listingId,
    detailPath: card.listingId ? `/cars/${card.listingId}` : undefined,
  };
}

export type SellerShareCopyKind = "full" | "short" | "specs";

export function generateSellerShareCopy(
  kind: SellerShareCopyKind,
  input: SellerShareListingInput
): string {
  switch (kind) {
    case "full":
      return generateSellerFullPost(input);
    case "short":
      return generateSellerShortPost(input);
    case "specs":
      return generateSellerSpecsText(input);
    default:
      return generateSellerFullPost(input);
  }
}
