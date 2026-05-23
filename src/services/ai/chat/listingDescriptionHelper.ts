/** Template-based listing description helper — Chat First Phase 1 */

export interface ListingDescriptionInput {
  brand?: string;
  model?: string;
  year?: number;
  price?: number;
  mileage?: number;
  color?: string;
  fuelType?: string;
  condition?: string;
  rawSpecs?: string;
  features?: string[];
}

const DESCRIPTION_INTENT =
  /ช่วยเขียน|แต่งประกาศ|ทำโพสต์|คำอธิบายขาย|แต่งโพสต์|สรุปจุดเด่น|ปรับข้อความ|เขียนประกาศ|facebook|เฟซบุ๊ก|โพสต์ขาย/i;

const RAW_SPEC_HINT =
  /(?:^|[\s+])(?:บ\.|เบาะ|จอ|พวงมาลัย|ฝาท้าย|บลูทูธ|bluetooth|ไฟ(?:หน้า|ท้าย)?\s*led|ล้อแม็ก|\/k\b|มัลติ)/i;

const SPEC_SPLIT = /[+,\n/|]+/;

const SPEC_MAP: Record<string, string> = {
  "บ.หนัง": "เบาะหนัง",
  "เบาะหนัง": "เบาะหนัง",
  "หนังปรับไฟฟ้า": "เบาะหนังปรับไฟฟ้า",
  "จอทัชสกรีน": "จอทัชสกรีน",
  "จอทัช": "จอทัชสกรีน",
  "พวงมาลัยมัลติฟังก์ชั่น": "พวงมาลัยมัลติฟังก์ชัน",
  "พวงมาลัยมัลติ": "พวงมาลัยมัลติฟังก์ชัน",
  "ฝาท้ายไฟฟ้า": "ฝาท้ายไฟฟ้า",
  "บลูทูธ": "ระบบ Bluetooth",
  bluetooth: "ระบบ Bluetooth",
  "ไฟหน้aled": "ไฟหน้า LED",
  "ไฟท้ายled": "ไฟท้าย LED",
  "ล้อแม็ก": "ล้อแม็ก",
};

export function isListingDescriptionIntent(message: string): boolean {
  return DESCRIPTION_INTENT.test(message.trim());
}

export function looksLikeRawSpecText(text: string): boolean {
  const t = text.trim();
  if (t.length < 8) return false;
  if (DESCRIPTION_INTENT.test(t)) return true;
  return RAW_SPEC_HINT.test(t);
}

export function parseSpecTokens(raw: string): string[] {
  return raw
    .split(SPEC_SPLIT)
    .map((s) => s.trim().replace(/^\/k$/i, "").trim())
    .filter((s) => s.length > 1)
    .map((token) => {
      const key = token.toLowerCase().replace(/\s+/g, "");
      for (const [k, v] of Object.entries(SPEC_MAP)) {
        if (key.includes(k.toLowerCase().replace(/\s+/g, ""))) return v;
      }
      return token.replace(/\s+/g, " ");
    });
}

function uniqueSpecs(specs: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of specs) {
    const n = s.trim();
    if (!n || seen.has(n.toLowerCase())) continue;
    seen.add(n.toLowerCase());
    out.push(n);
  }
  return out;
}

function formatPrice(price?: number): string {
  if (!price || price <= 0) return "";
  return ` ราคา ${price.toLocaleString("th-TH")} บาท`;
}

function formatMileage(mileage?: number): string {
  if (mileage == null || mileage <= 0) return "";
  return ` ไมล์ ${mileage.toLocaleString("th-TH")} กม.`;
}

/** สร้างคำอธิบายขายรถแบบ template — ไม่เรียก Gemini */
export function buildListingDescriptionFromSpecs(
  input: ListingDescriptionInput
): string {
  const specs = uniqueSpecs([
    ...parseSpecTokens(input.rawSpecs ?? ""),
    ...(input.features ?? []),
  ]);

  const hasCarIdentity = Boolean(input.brand?.trim() && input.model?.trim());
  const headline = hasCarIdentity
    ? `${input.brand} ${input.model}${input.year ? ` ปี ${input.year}` : ""}`
    : "รถคันนี้";

  const intro = hasCarIdentity
    ? `${headline} มาพร้อมสภาพพร้อมใช้งาน ออปชันครบสำหรับการใช้งานจริงทั้งในเมืองและเดินทางไกล`
    : "รถคันนี้มาพร้อมออปชันครบ ใช้งานสะดวกทั้งในเมืองและเดินทางไกล";

  const specSentence =
    specs.length > 0
      ? `ภายในและอุปกรณ์เด่น ได้แก่ ${specs.join(" ")}`
      : "รายละเอียดอุปกรณ์และสภาพรถสามารถสอบถามเพิ่มเติมได้";

  const detailParts = [
    input.color ? `สี${input.color}` : "",
    formatMileage(input.mileage).trim(),
    formatPrice(input.price).trim(),
  ].filter(Boolean);

  const detail =
    detailParts.length > 0
      ? ` ${detailParts.join(" ")}`
      : "";

  const closing =
    "เหมาะสำหรับผู้ที่มองหารถใช้งานจริง ออปชันครบ คุ้มค่า พร้อมใช้งานครับ";

  return `${intro}${detail ? ` —${detail}` : ""} ${specSentence} ช่วยเพิ่มความสะดวกสบายและความมั่นใจในการขับขี่ ${closing}`.replace(
    /\s+/g,
    " "
  );
}

export function buildListingDescriptionReply(
  input: ListingDescriptionInput,
  options?: { withClosing?: boolean }
): string {
  const body = buildListingDescriptionFromSpecs(input);
  const withClosing = options?.withClosing !== false;
  if (!withClosing) return body;
  return `${body}\n\n(น้องเอช่วยร่างจากข้อมูล/สเปกที่มี — กรุณาตรวจสอบอีกครั้งก่อนลงประกาศนะครับ)\n\nพร้อมนำไปขายได้เลยครับ ปังปุริเย่!`;
}

export const LISTING_DESCRIPTION_SKILL_PROMPT = `
[SKILL: ช่วยเขียนคำอธิบายขายรถ — Phase 1]
เมื่อผู้ใช้ขอช่วยเขียนประกาศ/โพสต์/คำอธิบายขายรถ หรือส่งสเปกดิบ:
- แปลงสเปกดิบเป็นภาษาขายที่อ่านง่าย ดึงจุดเด่น ไม่โอเวอร์ ไม่ใส่ข้อมูลที่ไม่มี
- ห้ามวางสเปกดิบต่อกันอย่างเดียว
- ถ้าไม่รู้ยี่ห้อ/รุ่น/ปี/ราคา ให้เขียนแบบกลางหรือถามเพิ่มอย่างสุภาพ
- บอกผู้ใช้ให้ตรวจสอบก่อนลงประกาศ
- ใส่ "ปังปุริเย่!" เมื่อสรุปงานช่วยเขียนเสร็จเท่านั้น ไม่ใส่ทุกประโยค
`;
