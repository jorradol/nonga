/**
 * v6.3B — Buyer-friendly listing copy (deterministic/template only)
 * Pure functions — no AI, no network, no DB. Input whitelist public-safe fields.
 */

export interface BuyerFriendlyListingCopyInput {
  description?: string;
  brand?: string;
  model?: string;
  year?: number;
  price?: number;
  mileage?: number;
  color?: string;
  fuelType?: string;
  condition?: string;
  features?: string[];
  tags?: string[];
  transmission?: string;
  drivetrain?: string;
  bodyType?: string;
  province?: string;
  sellerType?: "private" | "dealer" | "agent";
  showroomName?: string;
}

export type BuyerFriendlyCopySource =
  | "template-rich"
  | "template-structured"
  | "fallback-minimal"
  | "fallback-original"
  | "empty";

export interface BuyerFriendlyListingCopyResult {
  text: string;
  source: BuyerFriendlyCopySource;
  guardPass: boolean;
  warnings: string[];
}

export const BUYER_FRIENDLY_SAFETY_DISCLAIMER =
  "จากข้อมูลประกาศ — ควรตรวจสอบสภาพรถจริง เอกสาร และทดลองขับก่อนตัดสินใจซื้อ";

const SPEC_SPLIT = /[+,\n/|]+/;

/** Duplicated from listingDescriptionHelper — avoid shared refactor in v6.3B */
const SPEC_MAP: Record<string, string> = {
  smartkeyless: "ระบบ Smart Keyless (กุญแจอัจฉริยะ)",
  keyless: "ระบบ Keyless",
  cruisecontrol: "ระบบ Cruise Control (ควบคุมความเร็วคงที่)",
  enginestart: "ปุ่ม Engine Start (สตาร์ทเครื่องยนต์)",
  "บ.": "เบาะหนัง",
  "บ.หนัง": "เบาะหนัง",
  "เบาะหนัง": "เบาะหนัง",
  "หนังปรับไฟฟ้า": "เบาะหนังปรับไฟฟ้า",
  "จอทัชสกรีน": "จอทัชสกรีน",
  "จอทัชกรีน": "จอทัชสกรีน",
  "จอทัช": "จอทัชสกรีน",
  "ไฟตัดหมอก": "ไฟตัดหมอก",
  "ไฟ.ลกข": "ไฟเลี้ยวข้าง",
  "ไฟลกข": "ไฟเลี้ยวข้าง",
  "ไฟเลี้ยวข้าง": "ไฟเลี้ยวข้าง",
  "วิทยุfm/am": "วิทยุ FM/AM",
  "วิทยุfm": "วิทยุ FM/AM",
  "พวงมาลัยมัลติฟังก์ชั่น": "พวงมาลัยมัลติฟังก์ชัน",
  "พวงมาลัยมัลติ": "พวงมาลัยมัลติฟังก์ชัน",
  "ฝาท้ายไฟฟ้า": "ฝาท้ายไฟฟ้า",
  "บลูทูธ": "ระบบ Bluetooth",
  "บลูธูท": "ระบบ Bluetooth",
  bluetooth: "ระบบ Bluetooth",
  "ไฟหน้aled": "ไฟหน้า LED",
  "ไฟท้ายled": "ไฟท้าย LED",
  "ล้อแม็ก": "ล้อแม็ก",
};

const SPEC_MAP_ENTRIES = Object.entries(SPEC_MAP).sort(
  ([a], [b]) => b.length - a.length
);

const OVERCLAIM_PATTERNS: RegExp[] = [
  /ไม่เคยช(?:น|นห(?:นัก|า))/gi,
  /ไม่เคยท(?:ำ)?สี/gi,
  /ไมล์แท้(?:\s*100\s*%|\s*100%)?/gi,
  /เลขไมล์(?:แท้|จริง)(?:\s*100\s*%|\s*100%)?/gi,
  /ประหยัดแน่(?:นอ|น)/gi,
  /สภาพนางฟ้า/gi,
  /สภาพป้ายแดง/gi,
  /รับประก(?:ัน|ัน\d+\s*(?:เดือน|ปี|วัน))/gi,
  /warranty/gi,
  /ฟรีด(?:าว|าวน์)/gi,
  /ผ่อน\s*0\s*%/gi,
  /(?:^|\s)\d+(?:\.\d+)?\s*km\/l/gi,
  /(?:^|\s)\d+(?:\.\d+)?\s*ก(?:ิ|ิโ)โล(?:ลitre)?\s*\/\s*ล(?:ิ|ิต)/gi,
];

const PRIVACY_STRIP_PATTERNS: RegExp[] = [
  /\b0[689]\d[-\s]?\d{3}[-\s]?\d{4}\b/g,
  /\b0[689]\d{8}\b/g,
  /@[a-z0-9._-]{2,}/gi,
  /line\.me\/[^\s]+/gi,
  /https?:\/\/[^\s]+/gi,
  /firebasestorage\.googleapis\.com[^\s]*/gi,
  /storage\.googleapis\.com[^\s]*/gi,
  /[ก-ฮ]{2}\s?\d{1,4}(?:\s?[ก-ฮ]{1,2})?/g,
  /AIza[Sy][a-zA-Z0-9_-]{20,}/g,
  /sk-[a-zA-Z0-9]{20,}/g,
  /wholesale|ราคาส่ง|ราคาหน้าเต็นท์/gi,
];

const OUTPUT_FORBIDDEN_PATTERNS: RegExp[] = [
  ...PRIVACY_STRIP_PATTERNS,
  /ไม่เคยช(?:น|นห(?:นัก|า))/i,
  /ไมล์แท้/i,
  /ประหยัดแน่(?:นอ|น)/i,
  /(?:^|\s)\d+(?:\.\d+)?\s*km\/l/i,
  /รับประก(?:ัน|ัน\d+)/i,
  /warranty/i,
  /ฟรีด(?:าว|าวน์)/i,
];

const RICH_DESCRIPTION_MIN = 24;

const FUEL_LABELS: Record<string, string> = {
  petrol: "เบนซิน",
  diesel: "ดีเซล",
  electric: "ไฟฟ้า",
  hybrid: "ไฮบริด",
  "plug-in-hybrid": "ปลั๊กอินไฮบริด",
};

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
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

export function parseBuyerSpecTokens(raw: string): string[] {
  return raw
    .split(SPEC_SPLIT)
    .map((s) => s.trim().replace(/^\/k$/i, "").trim())
    .filter((s) => s.length > 1)
    .map((token) => {
      const key = token.toLowerCase().replace(/\s+/g, "");
      for (const [k, v] of SPEC_MAP_ENTRIES) {
        if (key.includes(k.toLowerCase().replace(/\s+/g, ""))) return v;
      }
      return token.replace(/\s+/g, " ");
    });
}

export function sanitizeListingCopyText(text: string): string {
  let out = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (const pat of PRIVACY_STRIP_PATTERNS) {
    out = out.replace(pat, " ");
  }
  return collapseWhitespace(out);
}

export function softenOmitOverclaims(text: string): {
  text: string;
  omitted: boolean;
} {
  let out = text;
  let omitted = false;
  for (const pat of OVERCLAIM_PATTERNS) {
    const next = out.replace(pat, " ");
    if (next !== out) omitted = true;
    out = next;
  }
  return { text: collapseWhitespace(out), omitted };
}

export function passesOutputGuard(text: string): {
  pass: boolean;
  reason?: string;
} {
  for (const pat of OUTPUT_FORBIDDEN_PATTERNS) {
    if (pat.test(text)) {
      return { pass: false, reason: pat.source.slice(0, 40) };
    }
  }
  return { pass: true };
}

function formatPrice(price?: number): string {
  if (!price || price <= 0) return "";
  return `ราคา ${price.toLocaleString("th-TH")} บาท`;
}

function formatMileage(mileage?: number): string {
  if (mileage == null || mileage <= 0) return "";
  return `ไมล์ ${mileage.toLocaleString("th-TH")} กม.`;
}

function formatFuel(fuelType?: string): string {
  if (!fuelType?.trim()) return "";
  const key = fuelType.trim().toLowerCase();
  return FUEL_LABELS[key] ?? fuelType.trim();
}

function buildIdentityLine(input: BuyerFriendlyListingCopyInput): string {
  const parts = [input.brand?.trim(), input.model?.trim()].filter(Boolean);
  if (input.year && input.year > 0) parts.push(String(input.year));
  return parts.join(" ");
}

function collectSpecs(
  input: BuyerFriendlyListingCopyInput,
  softenedDescription: string
): string[] {
  return uniqueSpecs([
    ...parseBuyerSpecTokens(softenedDescription),
    ...(input.features ?? []),
    ...(input.tags ?? []),
  ]);
}

function buildStructuredDetailParts(
  input: BuyerFriendlyListingCopyInput
): string[] {
  const parts: string[] = [];
  if (input.color?.trim()) parts.push(`สี${input.color.trim()}`);
  const mileage = formatMileage(input.mileage);
  if (mileage) parts.push(mileage);
  const price = formatPrice(input.price);
  if (price) parts.push(price);
  const fuel = formatFuel(input.fuelType);
  if (fuel) parts.push(`เชื้อเพลิง${fuel}`);
  if (input.transmission?.trim()) {
    parts.push(`เกียร์ ${input.transmission.trim()}`);
  }
  if (input.province?.trim()) parts.push(`จังหวัด${input.province.trim()}`);
  if (input.condition?.trim()) {
    const { text: cond } = softenOmitOverclaims(
      sanitizeListingCopyText(input.condition)
    );
    if (cond) parts.push(`สภาพ ${cond}`);
  }
  return parts;
}

function buildUseCaseLine(input: BuyerFriendlyListingCopyInput): string {
  const body = (input.bodyType ?? "").toLowerCase();
  if (/suv|คร(?:อ|o)บครัว|7.?ที่/i.test(body)) {
    return "เหมาะสำหรับผู้ที่มองหารถใช้งานครอบครัวตามสเปกที่แจ้ง";
  }
  if (/pickup|กระบะ/i.test(body)) {
    return "เหมาะสำหรับผู้ที่มองหารถใช้งานและขนส่งตามสเปกที่แจ้ง";
  }
  return "เหมาะสำหรับผู้ที่มองหารถใช้งานตามสเปกที่แจ้ง";
}

function buildHighlightsBlock(specs: string[]): string {
  if (specs.length === 0) return "";
  const bullets = specs.map((s) => `- ${s}`).join("\n");
  return `จุดเด่น\n${bullets}`;
}

type Richness = "empty" | "minimal" | "structured" | "rich";

function classifyRichness(
  input: BuyerFriendlyListingCopyInput,
  sanitizedDescription: string,
  specs: string[]
): Richness {
  const hasIdentity = Boolean(input.brand?.trim() && input.model?.trim());
  const hasPartialIdentity = Boolean(input.brand?.trim() || input.model?.trim());
  const descLen = sanitizedDescription.length;
  const structuredParts = buildStructuredDetailParts(input);

  if (
    !hasPartialIdentity &&
    descLen === 0 &&
    specs.length === 0 &&
    structuredParts.length === 0
  ) {
    return "empty";
  }
  if (descLen >= RICH_DESCRIPTION_MIN && (hasIdentity || specs.length > 0)) {
    return "rich";
  }
  if (hasIdentity || structuredParts.length > 0 || specs.length > 0) {
    return "structured";
  }
  return "minimal";
}

function composeRichTemplate(
  input: BuyerFriendlyListingCopyInput,
  sanitizedDescription: string,
  specs: string[]
): string {
  const identity = buildIdentityLine(input);
  const intro = identity
    ? `จากข้อมูลประกาศ ${identity}`
    : "จากข้อมูลประกาศ";
  const highlights = buildHighlightsBlock(specs);
  const details = buildStructuredDetailParts(input);
  const detailLine =
    details.length > 0 ? `ข้อมูลสรุป: ${details.join(" ")}` : "";
  const safeDesc =
    sanitizedDescription.length > 0 &&
    !looksLikeRawSpecOnly(sanitizedDescription)
      ? sanitizedDescription
      : "";
  const useCase = buildUseCaseLine(input);

  return [
    intro,
    highlights,
    safeDesc,
    detailLine,
    useCase,
    BUYER_FRIENDLY_SAFETY_DISCLAIMER,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function composeStructuredTemplate(
  input: BuyerFriendlyListingCopyInput,
  specs: string[]
): string {
  const identity = buildIdentityLine(input);
  const intro = identity
    ? `จากข้อมูลประกาศ ${identity}`
    : "จากข้อมูลประกาศ";
  const highlights =
    specs.length > 0
      ? `จุดเด่นตามสเปกที่ระบุ: ${specs.join(" ")}`
      : "รายละเอียดอุปกรณ์และสภาพรถสามารถสอบถามเพิ่มเติมได้";
  const details = buildStructuredDetailParts(input);
  const detailLine =
    details.length > 0 ? `ข้อมูลสรุป: ${details.join(" ")}` : "";
  const useCase = buildUseCaseLine(input);

  return [
    intro,
    highlights,
    detailLine,
    useCase,
    BUYER_FRIENDLY_SAFETY_DISCLAIMER,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function composeMinimalTemplate(input: BuyerFriendlyListingCopyInput): string {
  const identity = buildIdentityLine(input);
  const details = buildStructuredDetailParts(input);
  const intro = identity
    ? `จากข้อมูลประกาศ ${identity}`
    : "จากข้อมูลประกาศ";
  const detailLine =
    details.length > 0
      ? `ข้อมูลที่มี: ${details.join(" ")}`
      : "ข้อมูลประกาศยังมีจำกัด — สามารถสอบถามรายละเอียดเพิ่มเติมได้";

  return [intro, detailLine, BUYER_FRIENDLY_SAFETY_DISCLAIMER]
    .filter(Boolean)
    .join("\n\n");
}

function looksLikeRawSpecOnly(text: string): boolean {
  const t = text.trim();
  if (t.length < 8) return false;
  const tokens = parseBuyerSpecTokens(t);
  const joined = tokens.join(" ").toLowerCase().replace(/\s+/g, "");
  const compact = t.toLowerCase().replace(/[\s+./|,-]+/g, "");
  return joined.length > 0 && compact.length <= joined.length + 6;
}

function composeFallbackOriginal(sanitizedDescription: string): string {
  if (!sanitizedDescription) {
    return BUYER_FRIENDLY_SAFETY_DISCLAIMER;
  }
  return `${sanitizedDescription}\n\n${BUYER_FRIENDLY_SAFETY_DISCLAIMER}`;
}

function composeByRichness(
  richness: Richness,
  input: BuyerFriendlyListingCopyInput,
  sanitizedDescription: string,
  specs: string[]
): { text: string; source: BuyerFriendlyCopySource } {
  switch (richness) {
    case "rich":
      return {
        text: composeRichTemplate(input, sanitizedDescription, specs),
        source: "template-rich",
      };
    case "structured":
      return {
        text: composeStructuredTemplate(input, specs),
        source: "template-structured",
      };
    case "minimal":
      return {
        text: composeMinimalTemplate(input),
        source: "fallback-minimal",
      };
    default:
      return { text: "", source: "empty" };
  }
}

/** สร้าง buyer-friendly copy แบบ deterministic — ไม่เรียก AI */
export function buildBuyerFriendlyListingCopy(
  input: BuyerFriendlyListingCopyInput
): BuyerFriendlyListingCopyResult {
  const warnings: string[] = [];

  const rawDesc = input.description ?? "";
  const sanitized = sanitizeListingCopyText(rawDesc);
  const { text: softenedDesc, omitted } = softenOmitOverclaims(sanitized);
  if (omitted) warnings.push("seller-overclaim-omitted");

  const specs = collectSpecs(input, softenedDesc);
  const richness = classifyRichness(input, softenedDesc, specs);

  if (richness === "empty") {
    return { text: "", source: "empty", guardPass: true, warnings };
  }

  const composed = composeByRichness(richness, input, softenedDesc, specs);
  const guard = passesOutputGuard(composed.text);

  if (guard.pass) {
    return {
      text: composed.text,
      source: composed.source,
      guardPass: true,
      warnings,
    };
  }

  warnings.push(`output-guard-failed:${guard.reason ?? "unknown"}`);
  const fallbackText = composeFallbackOriginal(softenedDesc);
  const fallbackGuard = passesOutputGuard(fallbackText);

  return {
    text: fallbackGuard.pass
      ? fallbackText
      : BUYER_FRIENDLY_SAFETY_DISCLAIMER,
    source: "fallback-original",
    guardPass: false,
    warnings,
  };
}
