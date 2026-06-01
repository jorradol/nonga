import type { PublishedMemberListingCardData } from "../../types";
import type { ExtractedCarFields } from "../ai/chat/sellIntentParser";
import type { VisionObservationSummary } from "../ai/chat/chatPrecheckLayer";
import {
  inferThaiCopyStyle,
  pickStableVariant,
  type ThaiCopyStyle,
} from "../ai/chat/thaiSalesCopyVariation";
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
  /ไฟแนนซ์ผ่านง่าย/i,
  /ฟรีดาวน์/i,
];

/** ห้ามแสดงถ้าไม่มี field ยืนยัน — ตัดออกจากข้อความประกาศที่ดึงมาใช้ */
const UNVERIFIED_CLAIM_PATTERNS = [
  /มือเดียว/gi,
  /ไม่เคยชน/gi,
  /ไม่เคยชนจริง/gi,
  /เข้าศูนย์ตลอด/gi,
  /ศูนย์ครบทุกระยะ/gi,
  /ดูแลศูนย์ครบ/gi,
  /ฟรีดาวน์/gi,
  /ไฟแนนซ์ผ่านง่าย/gi,
  /สภาพนางฟ้า/gi,
  /สภาพป้ายแดง/gi,
  /เจ้าของดูแลดี/gi,
  /รถบ้านแท้/gi,
  /ไม่เคยทำสี/gi,
  /ไม่เคยทำความ/gi,
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

const GENERIC_OPENING_BANS = [
  "คันนี้น่าสนใจมากครับ",
  "ใครกำลังมองหารถ",
];

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
  bodyType?: string;
  bodyClassLabel?: string;
  description?: string;
  marketingCopy?: string;
  listingId?: string;
  publicRefCode?: string;
  detailPath?: string;
}

export function countPangPuriyeInText(text: string): number {
  return (text.match(/ปังปุริเย่/g) ?? []).length;
}

export function shareCopySeed(input: SellerShareListingInput): string {
  return (
    input.listingId?.trim() ||
    input.publicRefCode?.trim() ||
    [input.brand, input.model, input.year].filter(Boolean).join("-") ||
    "seller-share"
  );
}

type SellerShareTone = ThaiCopyStyle | "pickup";

export function inferSellerShareStyle(
  input: SellerShareListingInput
): ThaiCopyStyle {
  const tone = resolveSellerShareTone(input);
  return tone === "pickup" ? "urbanWorker" : tone;
}

function resolveSellerShareTone(input: SellerShareListingInput): SellerShareTone {
  const body = `${input.bodyType ?? ""} ${input.bodyClassLabel ?? ""}`.toLowerCase();
  const model = String(input.model ?? "").toLowerCase();
  if (/pickup|กระบะ|hilux|d-max|ranger|revo/i.test(`${body} ${model}`)) {
    return "pickup";
  }
  return inferThaiCopyStyle({
    brand: input.brand,
    model: input.model,
    price: input.price,
    bodyType: input.bodyType,
    bodyClassLabel: input.bodyClassLabel,
    sellerType: "member",
  });
}

export function pickSellerShareCopySuccessMessage(
  input: SellerShareListingInput
): string {
  return pickStableVariant(shareCopySeed(input), "copy-feedback", [
    SELLER_SHARE_COPY_SUCCESS_MESSAGE,
    "คัดลอกโพสต์เรียบร้อยครับ นำไปโพสต์ต่อได้เลยครับ",
    "คัดลอกแล้วครับ ขอให้รถคันนี้เจอเจ้าของใหม่ไว ๆ",
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
  for (const pattern of UNVERIFIED_CLAIM_PATTERNS) {
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
  for (const pattern of UNVERIFIED_CLAIM_PATTERNS) {
    if (pattern.test(text)) {
      throw new Error(`share copy contains unverified claim: ${pattern}`);
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

function formatTransmissionShort(transmission?: string): string | null {
  const raw = String(transmission ?? "").trim();
  if (!raw) return null;
  if (/auto|at|ออโต/i.test(raw)) return "ออโต้";
  if (/manual|mt|ธรรมด/i.test(raw)) return "ธรรมดา";
  return raw.replace(/^เกียร์/i, "").trim() || null;
}

function formatTransmissionDisplay(transmission?: string): string | null {
  const short = formatTransmissionShort(transmission);
  if (!short) return null;
  if (/^เกียร์/i.test(short)) return short;
  return `เกียร์${short}`;
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

function colorPhrase(input: SellerShareListingInput): string {
  const color = input.color?.trim();
  return color ? ` สี${color}` : "";
}

function pickBodyText(input: SellerShareListingInput): string {
  const marketing = sanitizeSellerShareText(input.marketingCopy ?? "");
  const description = sanitizeSellerShareText(input.description ?? "");
  if (marketing && description && marketing !== description) {
    return `${marketing}\n\n${description}`.trim();
  }
  return marketing || description || "";
}

function buildSpecBulletLines(input: SellerShareListingInput): string[] {
  const lines: string[] = [];
  if (input.year != null && Number.isFinite(Number(input.year))) {
    lines.push(`• ปี: ${input.year}`);
  }
  const price = formatPrice(input.price);
  if (price) lines.push(`• ราคา: ${price}`);
  const mileage = formatMileage(input.mileage);
  if (mileage) lines.push(`• เลขไมล์: ${mileage}`);
  const gear = formatTransmissionShort(input.transmission);
  if (gear) lines.push(`• เกียร์: ${gear}`);
  if (input.color?.trim()) lines.push(`• สี: ${input.color.trim()}`);
  const fuel = formatFuelTypeThai(input.fuelType);
  if (fuel) lines.push(`• เชื้อเพลิง: ${fuel}`);
  return lines;
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

function pickDisclaimer(seed: string, withViewing = false): string {
  if (withViewing) {
    return pickStableVariant(seed, "disclaimer-view", [
      "โปรดตรวจสอบข้อมูลจริงของรถและนัดดูรถก่อนตัดสินใจนะครับ",
      "แนะนำตรวจสอบสภาพรถจริงและเอกสารก่อนตัดสินใจครับ",
      "ข้อมูลตามประกาศ แนะนำนัดดูรถและตรวจสอบรายละเอียดก่อนตัดสินใจครับ",
    ] as const);
  }
  return pickStableVariant(seed, "disclaimer", [
    SELLER_SHARE_SOFT_DISCLAIMER,
    "โปรดตรวจสอบข้อมูลจริงของรถก่อนตัดสินใจนะครับ",
    "ข้อมูลตามประกาศ แนะนำตรวจสอบรายละเอียดจริงก่อนตัดสินใจครับ",
  ] as const);
}

function headlineVariants(
  input: SellerShareListingInput,
  style: SellerShareTone
): readonly string[] {
  const title = brandModelLine(input);
  const color = colorPhrase(input);
  const gear = formatTransmissionShort(input.transmission);
  const gearBit = gear ? ` ${gear}` : "";

  const byStyle: Record<SellerShareTone, readonly string[]> = {
    premium: [
      `🚗 ${title}${color} — ซีดานหรู ขับสบาย ภาพลักษณ์ดี พร้อมใช้งาน`,
      `${title}${color} — มุมรถใช้งานที่ดูมีระดับ ขับสบายทุกวัน`,
      `มองหารถซีดานมือสองที่ดูภูมิฐาน? ${title}${color} น่าดูครับ`,
      `${title}${color} — โทนเรียบหรู ใช้ได้ทั้งงานและครอบครัว`,
    ],
    valueEase: [
      `🚗 ${title}${color} — คล่องตัว ใช้งานง่าย งบอ่านง่าย`,
      `${title}${color} — รถใช้งานจริงในเมือง ประหยัดพื้นที่จอด`,
      `คันนี้สายใช้งานประจำวัน — ${title}${color} ราคาเข้าถึงง่าย`,
      `${title}${color} — เหมาะคนอยากได้รถคุ้มค่า${gearBit}`,
    ],
    familyMpv: [
      `🚗 ${title}${color} — มุมครอบครัว เดินทางสบาย อเนกประสงค์`,
      `${title}${color} — พื้นที่ใช้สอยดี เหมาะทริปครอบครัว`,
      `รถครอบครัวที่น่าดู — ${title}${color} ข้อมูลครบในโพสต์เดียว`,
      `${title}${color} — ใช้ได้ทั้งในเมืองและทริปไกล`,
    ],
    urbanWorker: [
      `🚗 ${title}${color} — ขับง่ายในเมือง ใช้งานทุกวันได้จริง`,
      `${title}${color} — รถทำงานที่ดูดี จอดง่าย ขับสบาย`,
      `สายเดินทางประจำวัน — ${title}${color} น่าจับตามอง`,
      `${title}${color} — มุมใช้งานจริง อ่านสเปกแล้วนัดดูได้`,
    ],
    honestOwner: [
      `รถบ้านน่าใช้ — ${title}${color} โพสต์เดียวดูข้อมูลครบ`,
      `${title}${color} — ลงประกาศตรง ๆ ให้ผู้สนใจตรวจสอบก่อนตัดสินใจ`,
      `🚗 ${title}${color} — รถมือสองที่เปิดรายละเอียดชัดเจน`,
      `คันนี้สายใช้งานจริง — ${title}${color} ดูรายละเอียดก่อนนัดได้ครับ`,
    ],
    dealerPro: [
      `${title}${color} — ประกาศขายรถมือสอง ข้อมูลครบตามที่ลงไว้`,
      `🚗 ${title}${color} — สเปกอ่านง่าย พร้อมให้ตรวจสอบต่อ`,
      `${title}${color} — มุมรถใช้งาน รายละเอียดตามประกาศ`,
    ],
    gentleHook: [
      `มองหารถใช้งานดูดี ขับสบายทุกวัน? ${title}${color} น่าดูครับ`,
      `${title}${color} — คันนี้สายใช้งานจริง ปีดี ราคาอ่านง่าย`,
      `🚗 ${title}${color} — รถมือสองที่ควรเปิดดูรายละเอียดก่อนตัดสินใจ`,
      `รถครอบครัวขับง่าย — ${title}${color} ข้อมูลเบื้องต้นครบในโพสต์นี้`,
    ],
    pickup: [
      `🚗 ${title}${color} — มุมทำงาน ค้าขาย บรรทุกของ ใช้ลุยงานได้จริง`,
      `${title}${color} — กระบะมือสองสายใช้งานหนัก อ่านสเปกแล้วนัดดูได้`,
      `สายลุยงานและค้าขาย — ${title}${color} น่าจับตามองครับ`,
      `${title}${color} — รถกระบะที่เปิดรายละเอียดชัดก่อนตัดสินใจ`,
    ],
  };

  return byStyle[style] ?? byStyle.gentleHook;
}

function openingVariants(
  input: SellerShareListingInput,
  style: SellerShareTone
): readonly string[] {
  const title = brandModelLine(input);
  const color = input.color?.trim() ? `สี${input.color.trim()} ` : "";

  const byStyle: Record<SellerShareTone, readonly string[]> = {
    premium: [
      `ใครกำลังมองหารถซีดานมือสองที่ดูภูมิฐาน ขับสบาย และใช้งานได้ทั้งในเมืองกับเดินทางไกล ${title} ${color}น่าสนใจมากครับ`,
      `ถ้าคุณพี่อยากได้รถที่ดูดีมีระดับ แต่ยังขับสบายในชีวิตประจำวัน ${title} ${color}เป็นอีกทางเลือกที่ควรเปิดดูครับ`,
      `มุมรถซีดานที่ภาพลักษณ์ดูเรียบหรู ${title} ${color}เหมาะกับงาน ครอบครัว หรือใช้รับรองลูกค้าแบบดูดีครับ`,
      `${title} ${color}ให้ฟีลรถมือสองที่ดูน่าเชื่อถือ อ่านสเปกแล้วนัดตรวจสอบต่อได้ครับ`,
    ],
    valueEase: [
      `ถ้าต้องการรถขับง่ายในเมือง ประหยัดพื้นที่ และยังดูเป็นมืออาชีพเวลาใช้งาน ${title} ${color}น่าจับตามองครับ`,
      `${title} ${color}เหมาะกับคนที่อยากได้รถใช้งานจริงทุกวัน โดยไม่ต้องยัดเยียดคำโฆษณาเกินจริงครับ`,
      `มุมรถคุ้มค่าในงบที่อ่านง่าย — ${title} ${color}เปิดรายละเอียดให้ดูก่อนตัดสินใจครับ`,
      `สำหรับสายใช้รถในเมือง ${title} ${color}เป็นตัวเลือกที่ลงตัวกับงบและสเปกที่ระบุไว้ครับ`,
    ],
    familyMpv: [
      `ครอบครัวหรือสายเดินทางบ่อย ๆ มักมองหารถที่นั่งสบายและใช้งานได้หลายแบบ — ${title} ${color}น่าดูครับ`,
      `${title} ${color}เหมาะกับคนที่อยากได้รถอเนกประสงค์ ทั้งรับลูก ทั้งขนของ ทั้งทริปไกลครับ`,
      `มุมรถครอบครัวที่อ่านสเปกแล้วเข้าใจง่าย ${title} ${color}พร้อมให้ผู้สนใจตรวจสอบต่อครับ`,
      `ถ้าอยากได้รถที่รองรับทั้งใช้งานประจำวันและทริปสั้น ๆ ${title} ${color}เป็นอีกทางเลือกครับ`,
    ],
    urbanWorker: [
      `สายทำงานในเมืองมักอยากได้รถขับง่าย จอดสะดวก และดูดีเวลาไปพบลูกค้า — ${title} ${color}ตอบโจทย์ครับ`,
      `${title} ${color}เหมาะกับคนที่ใช้รถทุกวัน ต้องการความคล่องตัวและภาพลักษณ์ที่ดูเป็นระเบียบครับ`,
      `มุมรถใช้งานจริงในเมือง ${title} ${color}ลงรายละเอียดชัด ให้ตัดสินใจจากข้อมูลจริงครับ`,
      `ถ้ามองหารถที่ช่วยให้วันทำงานลื่นขึ้น ${title} ${color}น่าพิจารณาครับ`,
    ],
    honestOwner: [
      `${title} ${color}ลงประกาศแบบตรงไปตรงมา ให้ผู้สนใจอ่านสเปกแล้วติดต่อตามช่องทางที่คุณพี่กำหนดเองครับ`,
      `รถบ้านมือสองที่เปิดข้อมูลชัดเจน — ${title} ${color}แนะนำอ่านรายละเอียดก่อนนัดดูคันจริงครับ`,
      `ถ้าอยากได้รถที่ไม่โอเวอร์เว่อร์เกินจริง ${title} ${color}เป็นโพสต์ที่ควรเปิดดูครับ`,
      `${title} ${color}เหมาะกับคนที่อยากตัดสินใจจากข้อมูลจริง ไม่ใช่คำโฆษณาเกินจริงครับ`,
    ],
    dealerPro: [
      `ประกาศขายรถมือสอง ${title} ${color}— สรุปสเปกให้อ่านง่าย พร้อมลิงก์ดูรายละเอียดบน Nong A ครับ`,
      `${title} ${color}ลงข้อมูลตามที่มีในระบบ แนะนำตรวจสอบรถจริงก่อนตัดสินใจครับ`,
    ],
    gentleHook: [
      `ถ้าคุณพี่กำลังเปรียบเทียบรถหลายคัน ${title} ${color}เป็นอีกตัวเลือกที่ควรเก็บไว้ในลิสต์ครับ`,
      `${title} ${color}อ่านแล้วเห็นภาพการใช้งานชัด ก่อนตัดสินใจนัดดูรถจริงครับ`,
      `มุมรถมือสองที่ลงรายละเอียดครบในโพสต์เดียว — ${title} ${color}น่าดูครับ`,
    ],
    pickup: [
      `สายงานค้าขาย ขนของ หรือใช้ลุยงานนอกสถานที่ มักมองหากระบะที่ใช้ได้จริง — ${title} ${color}น่าดูครับ`,
      `${title} ${color}เหมาะกับคนที่ต้องการรถทำงานที่อ่านสเปกแล้วตัดสินใจต่อได้ชัดเจนครับ`,
      `มุมรถกระบะมือสอง ${title} ${color}ลงข้อมูลตรง ๆ ให้ผู้สนใจตรวจสอบก่อนซื้อครับ`,
    ],
  };

  return byStyle[style] ?? byStyle.gentleHook;
}

function overviewVariants(
  input: SellerShareListingInput,
  style: SellerShareTone
): readonly string[] {
  const title = brandModelLine(input);
  const color = input.color?.trim() ? `สี${input.color.trim()} ` : "";

  const byStyle: Record<SellerShareTone, readonly string[]> = {
    premium: [
      `${title} ${color}ให้ภาพลักษณ์เรียบหรู ใช้งานได้ทั้งในเมืองและเดินทางไกล เหมาะกับคนที่อยากได้รถซีดานขับสบายและดูมีระดับครับ`,
      `จากสเปกที่ลงไว้ ${title} ${color}เหมาะกับงานประจำ ครอบครัว หรือใช้รับรองลูกค้าแบบดูดีไม่เว่อร์ครับ`,
    ],
    valueEase: [
      `${title} ${color}เหมาะกับคนที่อยากได้รถคล่องตัว ขับง่าย และยังดูเป็นระเบียบเวลาใช้งานประจำวันครับ`,
      `มุมรถคุ้มค่า — ${title} ${color}อ่านราคาและสเปกแล้วตัดสินใจต่อได้สบาย ๆ ครับ`,
    ],
    familyMpv: [
      `${title} ${color}เหมาะกับครอบครัวหรือคนที่ต้องการพื้นที่และความสบายเวลาเดินทางครับ`,
      `จากข้อมูลประกาศ ${title} ${color}เป็นอีกทางเลือกสำหรับสายเดินทางและใช้งานหลายแบบในคันเดียวครับ`,
    ],
    urbanWorker: [
      `${title} ${color}เหมาะกับคนทำงานในเมืองที่ต้องการรถขับง่าย ดูดี และใช้ได้จริงทุกวันครับ`,
      `มุมใช้งานประจำวัน — ${title} ${color}ช่วยให้การเดินทางไปงานดูเป็นระบบมากขึ้นครับ`,
    ],
    honestOwner: [
      `${title} ${color}ลงประกาศให้เห็นข้อมูลหลักครบ ก่อนผู้สนใจจะนัดดูและตัดสินใจครับ`,
      `รถบ้านที่เปิดสเปกชัด — ${title} ${color}เหมาะกับคนที่อยากตรวจสอบจริงก่อนซื้อครับ`,
    ],
    dealerPro: [
      `${title} ${color}สรุปข้อมูลตามประกาศ ให้ผู้สนใจอ่านและติดตามต่อได้สะดวกครับ`,
    ],
    gentleHook: [
      `${title} ${color}เป็นรถมือสองที่ควรเปิดดูรายละเอียดก่อนตัดสินใจ — สเปกหลักอยู่ด้านล่างครับ`,
    ],
    pickup: [
      `${title} ${color}เหมาะกับงานขนของ งานค้าขาย และการใช้งานนอกสถานที่ที่ต้องการความทนทานครับ`,
      `จากสเปกที่ลงไว้ ${title} ${color}เป็นอีกทางเลือกสำหรับสายรถกระบะใช้งานจริงครับ`,
    ],
  };

  return byStyle[style] ?? byStyle.gentleHook;
}

function buildDataDrivenHighlights(input: SellerShareListingInput): string[] {
  const seed = shareCopySeed(input);
  const style = resolveSellerShareTone(input);
  const bullets: string[] = [];
  const price = Number(input.price ?? 0);
  const mileage = Number(input.mileage ?? 0);
  const year = Number(input.year ?? 0);
  const currentYear = new Date().getFullYear();

  const styleBullets: Record<SellerShareTone, readonly string[]> = {
    premium: [
      "ทรงซีดานให้ภาพลักษณ์เรียบหรู นั่งสบาย เหมาะทั้งงานและใช้ส่วนตัว",
      "มุมรถที่ดูมีระดับ เหมาะกับคนที่อยากได้รถขับสบายและดูดีในทุกวัน",
      "ภาพลักษณ์ดี เหมาะทั้งใช้ในเมืองและเดินทางไกล",
    ],
    valueEase: [
      "มุมรถคล่องตัว ขับง่ายในเมือง ใช้งานประจำวันได้จริง",
      "ราคาและสเปกอ่านง่าย เหมาะกับคนที่อยากได้รถคุ้มค่า",
      "เหมาะกับสายใช้รถทุกวันโดยไม่ต้องยกโทษรถใหญ่เกินจำเป็น",
    ],
    familyMpv: [
      "มุมครอบครัวและการเดินทาง — พื้นที่ใช้สอยและความสบายน่าพิจารณา",
      "เหมาะกับคนที่ต้องการรถอเนกประสงค์ทั้งในเมืองและทริปสั้น ๆ",
      "อ่านสเปกแล้วเห็นภาพการใช้งานแบบหลายบทบาทในคันเดียว",
    ],
    urbanWorker: [
      "เหมาะกับคนทำงานในเมืองที่ต้องการรถขับง่ายและดูเป็นระเบียบ",
      "มุมใช้งานประจำวัน — จอดง่าย ขับสบาย ดูดีเวลาไปพบลูกค้า",
      "สเปกที่ลงไว้ช่วยให้ตัดสินใจจากข้อมูลจริงก่อนนัดดูรถ",
    ],
    honestOwner: [
      "ลงประกาศตรง ๆ ให้ผู้สนใจอ่านสเปกแล้วติดต่อตามช่องทางที่คุณกำหนด",
      "เหมาะกับคนที่อยากตรวจสอบรถจริงก่อนตัดสินใจ",
      "ข้อมูลหลักครบในโพสต์เดียว อ่านแล้วนัดดูต่อได้",
    ],
    dealerPro: [
      "สเปกอ่านง่าย รายละเอียดตามที่ลงประกาศไว้",
      "เหมาะกับผู้ซื้อที่อยากเปรียบเทียบก่อนตัดสินใจ",
    ],
    gentleHook: [
      "รายละเอียดอ่านง่าย พร้อมให้ผู้สนใจตรวจสอบต่อ",
      "มุมรถใช้งานจริง — ดูสเปกแล้วตัดสินใจได้สบายขึ้น",
    ],
    pickup: [
      "มุมรถทำงาน — เหมาะกับงานขนของ ค้าขาย และใช้นอกสถานที่",
      "สเปกอ่านง่าย ช่วยให้ตัดสินใจก่อนนัดดูรถจริง",
      "เหมาะกับคนที่ต้องการกระบะใช้งานจริงมากกว่าคำโฆษณาเกินจริง",
    ],
  };

  const pool = [...(styleBullets[style] ?? styleBullets.gentleHook)];
  if (price > 0 && price <= 500_000) {
    pool.push("ราคาอยู่ในเกณฑ์ที่เข้าถึงง่ายสำหรับรถใช้งานจริง");
  }
  if (mileage > 0 && mileage <= 60_000) {
    pool.push("เลขไมล์ที่ลงไว้อ่านง่าย — แนะนำตรวจสอบจริงก่อนตัดสินใจ");
  }
  if (year >= currentYear - 4) {
    pool.push("ปีค่อนข้างใหม่เมื่อเทียบกับตลาดมือสองทั่วไป");
  }
  if (formatTransmissionShort(input.transmission)) {
    pool.push(`ระบุเกียร์${formatTransmissionShort(input.transmission)!} ในรายละเอียดประกาศ`);
  }

  const picked: string[] = [];
  const slots = ["hl-a", "hl-b", "hl-c", "hl-d"];
  for (const slot of slots) {
    if (picked.length >= 3) break;
    const line = pickStableVariant(seed, slot, pool);
    if (!picked.includes(line)) picked.push(line);
  }

  if (picked.length === 0) {
    return [
      "ข้อมูลเบื้องต้นจากประกาศมีตามนี้ แนะนำตรวจสอบรายละเอียดจริงกับผู้ขายก่อนตัดสินใจครับ",
    ];
  }
  return picked;
}

function buildCtaLine(seed: string): string {
  return pickStableVariant(seed, "cta", [
    "ถ้าสนใจ แนะนำเปิดดูรายละเอียดบน Nong A แล้วนัดตรวจสอบรถจริงก่อนตัดสินใจครับ",
    "ผู้สนใจสามารถอ่านรายละเอียดเพิ่มและติดตามต่อได้จากลิงก์ด้านล่างครับ",
    "ลองเปิดดูประกาศเต็มบน Nong A แล้วคุยรายละเอียดเพิ่มก่อนตัดสินใจครับ",
  ] as const);
}

function buildWarmClosingFull(seed: string): string {
  return pickStableVariant(seed, "closing-full", [
    "ขอให้รถคันนี้ได้เจอเจ้าของใหม่ที่ถูกใจ เดินทางปลอดภัย ปังปุริเย่!",
    "ขอให้คันนี้พาเจ้าของใหม่ไปเจอโอกาสดี ๆ การงานการค้าราบรื่น ปังปุริเย่!",
    "ขอให้เป็นรถที่พาไปทั้งงาน ทั้งครอบครัว และเส้นทางดี ๆ ข้างหน้าครับ ปังปุริเย่!",
    "ขอให้รถคันนี้ได้ไปต่อกับเจ้าของใหม่ที่ดูแลกันอย่างดีครับ",
    "ขอให้รถคันนี้พาเจ้าของใหม่ไปเจอโอกาสดี ๆ หน้าที่การงานราบรื่น เดินทางปลอดภัย ปังปุริเย่!",
  ] as const);
}

function buildWarmClosingShort(seed: string): string {
  return pickStableVariant(seed, "closing-short", [
    "ขอให้เจอเจ้าของใหม่ไว ๆ ครับ",
    "ขอให้เจอเจ้าของใหม่ไว ๆ ปังปุริเย่!",
    "ลองเปิดดูรายละเอียดก่อนตัดสินใจนะครับ",
    "ขอให้รถคันนี้ได้เจอมือที่สองที่ใช่ครับ",
  ] as const);
}

function buildListingNotesSection(body: string): string[] {
  if (!body || body.length < 12) return [];
  const lines = body.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  return ["รายละเอียดจากประกาศ:", ...lines.map((l) => (l.startsWith("•") ? l : `• ${l}`)), ""];
}

/** Full post — โครงสร้างมืออาชีพ + variation ตามรถ */
export function generateSellerFullPost(input: SellerShareListingInput): string {
  const seed = shareCopySeed(input);
  const style = resolveSellerShareTone(input);
  const body = pickBodyText(input);
  const specLines = buildSpecBulletLines(input);
  const highlights = buildDataDrivenHighlights(input);

  const lines: string[] = [
    pickStableVariant(seed, "headline", headlineVariants(input, style)),
    "",
    pickStableVariant(seed, "opening", openingVariants(input, style)),
    "",
    pickStableVariant(seed, "overview", overviewVariants(input, style)),
    "",
  ];

  const notes = buildListingNotesSection(body);
  if (notes.length > 0) {
    lines.push(...notes);
  } else if (specLines.length === 0) {
    lines.push(
      "ข้อมูลเบื้องต้นจากประกาศมีตามนี้ หากสนใจแนะนำตรวจสอบรายละเอียดเพิ่มเติมกับผู้ขายก่อนตัดสินใจครับ",
      ""
    );
  }

  if (specLines.length > 0) {
    lines.push("รายละเอียดเบื้องต้น:", ...specLines, "");
  }

  lines.push("จุดที่น่าสนใจ:", ...highlights.map((h) => `• ${h}`), "", buildCtaLine(seed), "");

  const detailUrl = buildDetailUrl(input);
  if (detailUrl) {
    lines.push("ดูประกาศบน Nong A:", detailUrl, "");
  }

  lines.push(pickDisclaimer(seed, true), "", buildWarmClosingFull(seed));

  let text = lines.join("\n").trim();
  for (const banned of GENERIC_OPENING_BANS) {
    if (text.split("\n").filter((l) => l === banned).length > 1) {
      text = text.replace(banned, "");
    }
  }
  text = sanitizeSellerShareText(text);

  assertSellerShareCopySafe(text, { allowPangPuriye: true, maxPangPuriye: 1 });
  return text;
}

function shortCaptionVariants(
  input: SellerShareListingInput,
  style: SellerShareTone
): readonly string[] {
  const title = brandModelLine(input);
  const color = colorPhrase(input);

  const byStyle: Record<SellerShareTone, readonly string[]> = {
    premium: [
      `ซีดานขับสบาย ภาพลักษณ์ดี ใช้งานได้ทั้งครอบครัวและงานประจำ`,
      `มุมรถที่ดูมีระดับ ขับสบายทุกวัน`,
    ],
    valueEase: [
      `รถคล่องตัว ใช้งานง่ายในเมือง งบอ่านง่าย`,
      `สายใช้งานจริงทุกวัน คุ้มค่าในงบที่กำหนด`,
    ],
    familyMpv: [
      `มุมครอบครัว เดินทางสบาย อเนกประสงค์`,
      `พื้นที่ใช้สอยดี เหมาะทริปครอบครัว`,
    ],
    urbanWorker: [
      `ขับง่ายในเมือง ดูดีเวลาใช้งานทุกวัน`,
      `เหมาะสายทำงาน จอดสะดวก ขับสบาย`,
    ],
    honestOwner: [
      `รถบ้านน่าใช้ โพสต์เดียวดูข้อมูลครบ`,
      `ลงประกาศตรง ๆ อ่านแล้วนัดดูต่อได้`,
    ],
    dealerPro: [`สเปกครบตามประกาศ อ่านง่าย`, `มุมรถใช้งาน รายละเอียดชัด`],
    gentleHook: [
      `รถมือสองน่าดู อ่านสเปกก่อนตัดสินใจ`,
      `คันนี้สายใช้งานจริง ปีดี ราคาอ่านง่าย`,
    ],
    pickup: [
      `มุมทำงาน ค้าขาย บรรทุกของ ใช้ลุยงานได้จริง`,
      `กระบะมือสองสายใช้งานหนัก อ่านสเปกก่อนตัดสินใจ`,
    ],
  };

  const tagline = pickStableVariant(
    shareCopySeed(input),
    "short-tagline",
    byStyle[style] ?? byStyle.gentleHook
  );

  return [
    `🚗 ${title}${color}`,
    tagline,
  ] as const;
}

/** Short caption — Facebook / LINE group */
export function generateSellerShortPost(input: SellerShareListingInput): string {
  const seed = shareCopySeed(input);
  const style = resolveSellerShareTone(input);
  const [line1, line2] = shortCaptionVariants(input, style);

  const facts: string[] = [];
  const price = formatPrice(input.price);
  if (price) facts.push(price);
  const mileage = formatMileage(input.mileage);
  if (mileage) facts.push(`ไมล์ ${mileage}`);
  const gear = formatTransmissionShort(input.transmission);
  if (gear) facts.push(`เกียร์ ${gear}`);

  const lines: string[] = [line1, line2];
  if (facts.length > 0) {
    lines.push("", facts.join(" | "));
  }

  const detailUrl = buildDetailUrl(input);
  if (detailUrl) {
    lines.push("", "ดูประกาศบน Nong A:", detailUrl);
  }

  lines.push("", pickDisclaimer(seed, false), buildWarmClosingShort(seed));

  const text = sanitizeSellerShareText(lines.join("\n").trim());
  assertSellerShareCopySafe(text, { allowPangPuriye: true, maxPangPuriye: 1 });
  return text;
}

/** Bullet spec list — เรียบ ชัด ไม่ขายมาก */
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
  const gearShort = formatTransmissionShort(input.transmission);
  if (gearShort) items.push(`• เกียร์: ${gearShort}`);
  if (input.color?.trim()) items.push(`• สี: ${input.color.trim()}`);
  const fuel = formatFuelTypeThai(input.fuelType);
  if (fuel) items.push(`• เชื้อเพลิง: ${fuel}`);

  if (items.length === 0) {
    items.push(`• ${brandModelLine(input)}`);
  }

  const detailUrl = buildDetailUrl(input);
  const lines = ["สเปกรถเบื้องต้น", ...items];
  if (detailUrl) {
    lines.push("", "ลิงก์ประกาศ:", detailUrl);
  }
  lines.push("", pickDisclaimer(shareCopySeed(input), false));

  const text = sanitizeSellerShareText(lines.join("\n").trim());
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
    bodyType: vision?.bodyType,
    description:
      typeof fields.description === "string" ? fields.description : undefined,
    marketingCopy: card.marketingCopy,
    listingId: card.listingId,
    publicRefCode: card.publicRefCode,
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
