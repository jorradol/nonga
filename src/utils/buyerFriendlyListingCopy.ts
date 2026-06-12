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
  "ข้อมูลนี้เป็นการเรียบเรียงจากประกาศเดิม ไม่ใช่การยืนยันสภาพรถ ควรตรวจสอบรถจริง เอกสาร และทดลองขับก่อนตัดสินใจ";

const INTERNAL_NOISE_PATTERNS: RegExp[] = [
  /controlled\s*pilot\s*source\s*package/gi,
  /\/?k\s*ต้องตรวจสภาพจริง/gi,
];

const JUNK_SPEC_TOKEN = /^(?:ab\d+|k)$/i;

type SpecCategory =
  | "driving"
  | "access"
  | "entertainment"
  | "parking"
  | "comfort"
  | "other";

const SPEC_CATEGORY_RULES: { category: SpecCategory; patterns: RegExp[] }[] = [
  {
    category: "driving",
    patterns: [
      /cruise control/i,
      /พวงมาลัย/i,
      /ไฟตัดหมอก/i,
      /ไฟเลี้ยว/i,
      /ไฟหน้า/i,
      /ไฟท้าย/i,
    ],
  },
  {
    category: "access",
    patterns: [/engine start/i, /smart keyless/i, /keyless/i, /สตาร์ท/i],
  },
  {
    category: "entertainment",
    patterns: [
      /bluetooth/i,
      /fm\/am/i,
      /วิทยุ/i,
      /\busb\b/i,
      /\bcd\b/i,
      /จอทัช/i,
    ],
  },
  {
    category: "parking",
    patterns: [/กล้อง/i, /เซ็นเซอร์/i, /ถอย/i],
  },
  {
    category: "comfort",
    patterns: [/เบาะ/i, /ฝาท้าย/i, /ล้อแม็ก/i, /หนัง/i],
  },
];

const SPEC_SPLIT = /[+,\n/|]+/;

/** Pure-Thai canonical steering label — no Latin injected into Thai syllables */
export const STEERING_WHEEL_MULTIFUNCTION_DISPLAY =
  "\u0E1E\u0E27\u0E07\u0E21\u0E32\u0E25\u0E31\u0E22\u0E21\u0E31\u0E25\u0E15\u0E34\u0E1F\u0E31\u0E07\u0E01\u0E4C\u0E0A\u0E31\u0E19";

/** Garbled latin-injected steering fragments that must never appear in buyer-facing output. */
export const FORBIDDEN_STEERING_GARBLE_FRAGMENTS = [
  "\u0E1E\u0E27\u0E07\u0E21al\u0E17i",
  "\u0E1E\u0E27\u0E07\u0E21al\u0E17i\u0E21al\u0E17i\u0E1F\u0E31\u0E07\u0E01\u0E4C\u0E0A\u0E31\u0E19",
  "\u0E1E\u0E27\u0E07\u0E21al\u0E17i\u0E21al\u0E15\u0E34\u0E1F\u0E31\u0E07\u0E01\u0E4C\u0E0A\u0E31\u0E19",
] as const;

export function containsForbiddenSteeringGarble(text: string): boolean {
  if (!text.trim()) return false;
  if (FORBIDDEN_STEERING_GARBLE_FRAGMENTS.some((frag) => text.includes(frag))) {
    return true;
  }
  return containsThaiLatinMixedCorruption(text);
}

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
  "พวงมาลัยมัลติฟังก์ชั่น": STEERING_WHEEL_MULTIFUNCTION_DISPLAY,
  "พวงมาลัยมัลติ": STEERING_WHEEL_MULTIFUNCTION_DISPLAY,
  "ฝาท้ายไฟฟ้า": "ฝาท้ายไฟฟ้า",
  "บลูทูธ": "ระบบ Bluetooth",
  "บลูธูท": "ระบบ Bluetooth",
  bluetooth: "ระบบ Bluetooth",
  /** garbled latin-injected steering token → canonical pure Thai */
  "\u0E1E\u0E27\u0E07\u0E21al\u0E17i": STEERING_WHEEL_MULTIFUNCTION_DISPLAY,
  usb: "USB",
  cd: "CD",
  am: "วิทยุ FM/AM",
  "กล้องถอย": "กล้องถอยหลัง",
  "กล้องถอยหลัง": "กล้องถอยหลัง",
  "เซ็นเซอร์ถอย": "เซ็นเซอร์ถอยหลัง",
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

export function isJunkSpecToken(token: string): boolean {
  const t = token.trim();
  if (!t || t.length <= 1) return true;
  if (JUNK_SPEC_TOKEN.test(t)) return true;
  if (/controlled\s*pilot|source\s*package/i.test(t)) return true;
  if (/^[a-z]{1,2}$/i.test(t) && !/^(am|cd)$/i.test(t)) return true;
  return false;
}

export function isDisplayableProvince(province?: string): boolean {
  const p = province?.trim();
  if (!p || p.length < 3) return false;
  const thaiLetters = (p.match(/[ก-ฮ]/g) ?? []).length;
  if (thaiLetters < 2) return false;
  if (/^ขฐ$/.test(p) || /^[^\s]{1,2}$/.test(p)) return false;
  return true;
}

/** Latin letters injected into a Thai spec token (charset corruption). */
export function isCorruptedMixedThaiLatinSpecLabel(label: string): boolean {
  const compact = label.trim().replace(/\s+/g, "");
  if (!compact) return false;
  if (/^(?:cruisecontrol|enginestart|smartkeyless|keyless|bluetooth|usb|cd|am|fm\/am)$/i.test(compact)) {
    return false;
  }
  if (/^[a-z0-9\s()./-]+$/i.test(compact) && !/[ก-ฮ]/.test(compact)) return false;
  if (/[ก-ฮ][a-z]{1,4}[ก-ฮ]/i.test(compact)) return true;
  if (/^[\u0E1E\u0E27\u0E07\u0E21][a-z]{1,4}/i.test(compact)) return true;
  return false;
}

/** True when sales copy output contains Thai/Latin charset corruption. */
export function containsThaiLatinMixedCorruption(text: string): boolean {
  if (!text.trim()) return false;
  return (
    /[\u0E00-\u0E7F][a-z]{1,4}[\u0E00-\u0E7F]/i.test(text) ||
    /[\u0E1E\u0E27\u0E07\u0E21][a-z]{1,4}/i.test(text)
  );
}

/** Displayable spec label — pure Thai or known English product names only. */
export function isDisplayableSpecLabel(label: string): boolean {
  const t = label.trim();
  if (!t) return false;
  return !isCorruptedMixedThaiLatinSpecLabel(t);
}

function repairSteeringWheelSpecLabel(label: string): string | null {
  const compact = label.trim().replace(/\s+/g, "");
  if (!/[\u0E1E\u0E27\u0E07\u0E21]|พวงม/i.test(compact)) return null;
  if (/^[\u0E1E\u0E27\u0E07\u0E21][a-z]{1,4}/i.test(compact)) {
    return STEERING_WHEEL_MULTIFUNCTION_DISPLAY;
  }
  if (
    isCorruptedMixedThaiLatinSpecLabel(label) &&
    /[\u0E1E\u0E27\u0E07\u0E21]|พวงม/i.test(compact)
  ) {
    return STEERING_WHEEL_MULTIFUNCTION_DISPLAY;
  }
  return null;
}

function categorizeSpec(label: string): SpecCategory {
  for (const rule of SPEC_CATEGORY_RULES) {
    if (rule.patterns.some((pat) => pat.test(label))) return rule.category;
  }
  return "other";
}

function consolidateEntertainmentLabels(labels: string[]): string[] {
  const hasTouch = labels.some((s) => /จอทัช/i.test(s));
  const hasRadio = labels.some((s) => /fm\/am|วิทยุ/i.test(s));
  const hasBt = labels.some((s) => /bluetooth/i.test(s));
  const hasUsb = labels.some((s) => /\busb\b/i.test(s));
  const parts: string[] = [];
  if (hasTouch) parts.push("จอทัชสกรีน");
  if (hasRadio) parts.push("วิทยุ FM/AM");
  if (hasBt) parts.push("Bluetooth");
  if (hasUsb) parts.push("USB");
  if (parts.length > 0) return [parts.join(" ")];
  return labels.filter((s) => !/^(AM|CD|USB|วิทยุ FM\/AM)$/i.test(s));
}

function groupSpecsForSalesCopy(specs: string[]): Map<SpecCategory, string[]> {
  const grouped = new Map<SpecCategory, string[]>();
  for (const spec of specs) {
    const normalized = normalizeSpecLabel(spec);
    if (!normalized || isJunkSpecToken(normalized) || !isDisplayableSpecLabel(normalized)) {
      continue;
    }
    const category = categorizeSpec(normalized);
    const list = grouped.get(category) ?? [];
    if (!list.some((s) => s.toLowerCase() === normalized.toLowerCase())) {
      list.push(normalized);
    }
    grouped.set(category, list);
  }
  const entertainment = grouped.get("entertainment");
  if (entertainment?.length) {
    grouped.set("entertainment", consolidateEntertainmentLabels(entertainment));
  }
  return grouped;
}

function joinThaiList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} และ ${items[1]}`;
  return `${items.slice(0, -1).join(" ")} และ ${items[items.length - 1]}`;
}

function normalizeSpecLabel(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return "";

  const steering = repairSteeringWheelSpecLabel(trimmed);
  if (steering && isDisplayableSpecLabel(steering)) return steering;

  const key = trimmed.toLowerCase().replace(/\s+/g, "");
  for (const [k, v] of SPEC_MAP_ENTRIES) {
    if (key.includes(k.toLowerCase().replace(/\s+/g, ""))) {
      return isDisplayableSpecLabel(v) ? v : "";
    }
  }

  if (isCorruptedMixedThaiLatinSpecLabel(trimmed)) return "";

  const compact = trimmed.replace(/\s+/g, "");
  if (
    (/[\u0E1E\u0E27\u0E07\u0E21]/.test(compact) || /พวงม/i.test(compact)) &&
    /[a-z0-9]/i.test(compact.replace(/[\u0E00-\u0E7F]/g, ""))
  ) {
    return "";
  }

  const finalLabel = trimmed;
  return isDisplayableSpecLabel(finalLabel) ? finalLabel : "";
}

function buildSalesFeatureParagraphs(grouped: Map<SpecCategory, string[]>): string[] {
  const paragraphs: string[] = [];
  const driving = grouped.get("driving") ?? [];
  const access = grouped.get("access") ?? [];
  const comfort = grouped.get("comfort") ?? [];
  const entertainment = grouped.get("entertainment") ?? [];
  const parking = grouped.get("parking") ?? [];
  const other = grouped.get("other") ?? [];

  const drivingComfort = [...comfort, ...driving];
  if (drivingComfort.length > 0) {
    paragraphs.push(
      `จุดเด่นด้านความสะดวกในการขับ มี${joinThaiList(drivingComfort)} ช่วยให้ขับสบายและใช้งานในชีวิตประจำวันสะดวกขึ้น`
    );
  }

  if (access.length > 0) {
    paragraphs.push(
      `การเข้าใช้งานสะดวกขึ้นด้วย${joinThaiList(access)} ช่วยลดขั้นตอนตอนเริ่มใช้งานรถ`
    );
  }

  if (entertainment.length > 0) {
    paragraphs.push(
      `${joinThaiList(entertainment)} ช่วยให้การเดินทางและการเชื่อมต่อมือถือใช้งานง่ายขึ้น`
    );
  }

  if (parking.length > 0) {
    paragraphs.push(
      `${joinThaiList(parking)} ช่วยให้การจอดและถอยรถใช้งานง่ายขึ้น`
    );
  }

  if (other.length > 0) {
    const safeOther = other.filter((s) => isDisplayableSpecLabel(s));
    if (safeOther.length > 0) {
      paragraphs.push(
        `จากข้อมูลประกาศ ยังมี${joinThaiList(safeOther)} ที่ช่วยเสริมการใช้งานตามที่ระบุ`
      );
    }
  }

  return paragraphs;
}

/** v6.3B.5 — compact in-chat sales weave input (public-safe fields only) */
export interface CompactInChatSalesWeaveInput {
  description?: string;
  fuelType?: string;
  bodyClassLabel?: string;
}

export interface CompactInChatSalesWeaveResult {
  text: string;
  guardPass: boolean;
  warnings: string[];
}

const IN_CHAT_WEAVE_MAX_CHARS = 220;
const IN_CHAT_WEAVE_MIN_SPECS = 2;
const IN_CHAT_WEAVE_MAX_SPECS = 6;

const IN_CHAT_WEAVE_SPEC_ORDER: SpecCategory[] = [
  "comfort",
  "driving",
  "access",
  "entertainment",
  "parking",
];

function buildInChatWeaveLead(bodyClassLabel?: string, fuelType?: string): string {
  const body = bodyClassLabel?.trim();
  const fuel = formatFuel(fuelType);
  if (body && fuel) {
    return `เป็น ${body} ${fuel} ที่เหมาะกับการใช้งานประจำวัน`;
  }
  if (body) {
    return `เป็น ${body} ที่เหมาะกับการใช้งานประจำวัน`;
  }
  if (fuel) {
    return `เป็นรถ${fuel} ที่เหมาะกับการใช้งานประจำวัน`;
  }
  return "";
}

function pickSpecsForInChatWeave(specs: string[]): string[] {
  const byCategory = new Map<SpecCategory, string[]>();
  for (const raw of specs) {
    const normalized = normalizeSpecLabel(raw);
    if (!normalized || isJunkSpecToken(normalized) || !isDisplayableSpecLabel(normalized)) {
      continue;
    }
    const category = categorizeSpec(normalized);
    if (category === "other") continue;
    const list = byCategory.get(category) ?? [];
    if (!list.some((s) => s.toLowerCase() === normalized.toLowerCase())) {
      list.push(normalized);
    }
    byCategory.set(category, list);
  }

  const entertainment = byCategory.get("entertainment");
  if (entertainment?.length) {
    byCategory.set("entertainment", consolidateEntertainmentLabels(entertainment));
  }

  const picked: string[] = [];
  for (const category of IN_CHAT_WEAVE_SPEC_ORDER) {
    for (const label of byCategory.get(category) ?? []) {
      if (picked.length >= IN_CHAT_WEAVE_MAX_SPECS) return picked;
      if (!picked.some((s) => s.toLowerCase() === label.toLowerCase())) {
        picked.push(label);
      }
    }
  }
  return picked;
}

function composeInChatWeaveSentence(
  lead: string,
  features: string[]
): string {
  const featureList = joinThaiList(features);
  if (lead) {
    return `${lead} มีอุปกรณ์ช่วยให้ขับสบายขึ้น เช่น ${featureList}`;
  }
  return `มีอุปกรณ์ช่วยให้ขับสบายขึ้น เช่น ${featureList}`;
}

function trimInChatWeaveToMax(lead: string, features: string[]): string {
  const working = [...features];
  while (working.length >= IN_CHAT_WEAVE_MIN_SPECS) {
    const text = composeInChatWeaveSentence(lead, working);
    if (text.length <= IN_CHAT_WEAVE_MAX_CHARS) return text;
    working.pop();
  }
  return "";
}

/**
 * v6.3B.5 — one compact sales-tone paragraph for in-chat curated analysis.
 * Omits entirely when specs insufficient or guards fail.
 */
export function buildCompactInChatSalesWeave(
  input: CompactInChatSalesWeaveInput
): CompactInChatSalesWeaveResult {
  const warnings: string[] = [];
  const rawDesc = input.description ?? "";
  const sanitized = sanitizeListingCopyText(rawDesc);
  const { text: softenedDesc, omitted } = softenOmitOverclaims(sanitized);
  if (omitted) warnings.push("seller-overclaim-omitted");

  const specs = uniqueSpecs(parseBuyerSpecTokens(softenedDesc));
  const features = pickSpecsForInChatWeave(specs);
  if (features.length < IN_CHAT_WEAVE_MIN_SPECS) {
    return { text: "", guardPass: true, warnings };
  }

  const lead = buildInChatWeaveLead(input.bodyClassLabel, input.fuelType);
  const text = trimInChatWeaveToMax(lead, features);
  if (!text) {
    warnings.push("weave-length-trim-failed");
    return { text: "", guardPass: true, warnings };
  }

  const guard = passesOutputGuard(text);
  if (!guard.pass) {
    warnings.push(`output-guard-failed:${guard.reason ?? "unknown"}`);
    return { text: "", guardPass: false, warnings };
  }
  if (containsThaiLatinMixedCorruption(text)) {
    warnings.push("mixed-script-corruption-in-output");
    return { text: "", guardPass: false, warnings };
  }

  return { text, guardPass: true, warnings };
}

export function parseBuyerSpecTokens(raw: string): string[] {
  return raw
    .split(SPEC_SPLIT)
    .map((s) => s.trim().replace(/^\/k$/i, "").trim())
    .filter((s) => s.length > 1)
    .map((token) => {
      const normalized = normalizeSpecLabel(token.replace(/\s+/g, " "));
      if (!normalized || isJunkSpecToken(normalized) || !isDisplayableSpecLabel(normalized)) {
        return "";
      }
      return normalized;
    })
    .filter(Boolean);
}

export function sanitizeListingCopyText(text: string): string {
  let out = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (const pat of INTERNAL_NOISE_PATTERNS) {
    out = out.replace(pat, " ");
  }
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
  if (containsThaiLatinMixedCorruption(text)) {
    return { pass: false, reason: "mixed-script-corruption" };
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
  const fromFeatures = (input.features ?? [])
    .map((f) => sanitizeListingCopyText(f))
    .filter((f) => f && !isJunkSpecToken(f));
  const fromTags = (input.tags ?? [])
    .map((t) => sanitizeListingCopyText(t))
    .filter((t) => t && !isJunkSpecToken(t));
  return uniqueSpecs([
    ...parseBuyerSpecTokens(softenedDescription),
    ...fromFeatures,
    ...fromTags,
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
  if (isDisplayableProvince(input.province)) {
    parts.push(`จังหวัด${input.province!.trim()}`);
  }
  if (input.condition?.trim()) {
    const { text: cond } = softenOmitOverclaims(
      sanitizeListingCopyText(input.condition)
    );
    if (cond) parts.push(`สภาพ ${cond}`);
  }
  return parts;
}

function buildBodyTypeHint(input: BuyerFriendlyListingCopyInput): string {
  const body = `${input.bodyType ?? ""} ${input.model ?? ""}`.toLowerCase();
  const fuel = formatFuel(input.fuelType);
  if (/suv|คร(?:อ|o)บครัว|7.?ที่/i.test(body)) {
    return fuel ? `SUV ${fuel} ใช้งานประจำวัน` : "SUV ใช้งานประจำวัน";
  }
  if (/pickup|กระบะ/i.test(body)) {
    return fuel ? `รถกระบะ ${fuel}` : "รถกระบะใช้งานและขนส่ง";
  }
  if (fuel) return `รถ${fuel} ใช้งานประจำวัน`;
  return "รถใช้งานประจำวัน";
}

function buildUseCaseLine(input: BuyerFriendlyListingCopyInput): string {
  const hint = buildBodyTypeHint(input);
  return `เหมาะสำหรับผู้ที่มองหา ${hint} ที่อยากได้ความสะดวกจากอุปกรณ์ตามที่ระบุในประกาศ`;
}

function buildIntroParagraph(
  input: BuyerFriendlyListingCopyInput,
  hasSpecs: boolean
): string {
  const identity = buildIdentityLine(input);
  const hint = buildBodyTypeHint(input);
  let intro = identity
    ? `จากข้อมูลประกาศ ${identity} คันนี้`
    : "จากข้อมูลประกาศ คันนี้";
  intro += `เหมาะกับคนที่มองหา ${hint}`;
  if (hasSpecs) {
    intro += " และมีอุปกรณ์ช่วยให้ใช้งานในชีวิตประจำวันสะดวกขึ้น";
  }
  return `${intro}.`;
}

function buildSummarySentence(input: BuyerFriendlyListingCopyInput): string {
  const details = buildStructuredDetailParts(input);
  if (details.length === 0) return "";
  return `ข้อมูลสรุปจากประกาศ: ${details.join(" ")}.`;
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
  const grouped = groupSpecsForSalesCopy(specs);
  const intro = buildIntroParagraph(input, specs.length > 0);
  const featureParagraphs = buildSalesFeatureParagraphs(grouped);
  const summary = buildSummarySentence(input);
  const safeDesc =
    sanitizedDescription.length > 0 &&
    !looksLikeRawSpecOnly(sanitizedDescription)
      ? sanitizedDescription
      : "";
  const useCase = buildUseCaseLine(input);

  return [
    intro,
    ...featureParagraphs,
    safeDesc,
    summary,
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
  const grouped = groupSpecsForSalesCopy(specs);
  const intro = buildIntroParagraph(input, specs.length > 0);
  const featureParagraphs = buildSalesFeatureParagraphs(grouped);
  const summary = buildSummarySentence(input);
  const fallbackLine =
    specs.length === 0
      ? "รายละเอียดอุปกรณ์และสภาพรถสามารถสอบถามเพิ่มเติมได้"
      : "";
  const useCase = buildUseCaseLine(input);

  return [
    intro,
    ...featureParagraphs,
    fallbackLine,
    summary,
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

  if (guard.pass && !containsThaiLatinMixedCorruption(composed.text)) {
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

  const safeFallback =
    fallbackGuard.pass && !containsThaiLatinMixedCorruption(fallbackText)
      ? fallbackText
      : BUYER_FRIENDLY_SAFETY_DISCLAIMER;

  return {
    text: safeFallback,
    source: "fallback-original",
    guardPass: false,
    warnings,
  };
}
