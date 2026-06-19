/**
 * v7.2 — Conversational Lead Interest Memory (deterministic, no Gemini).
 *
 * Temporarily remembers the buyer's *interest* from the chat so น้องเอ can keep
 * the conversation going and prepare a smarter lead draft later — WITHOUT sending
 * a lead and WITHOUT touching personal contact data or consent.
 *
 * Hard guarantees (PDPA / lead safety):
 * - Never stores a phone number, name, consent, plate, or interest-queue count.
 * - Never sends a lead and never implies consent. This memory is *interest only*.
 * - "Latest intent wins": when the user changes a dimension (model/area/budget),
 *   that dimension is replaced so we never cling to a stale Yaris/area.
 *
 * Separation of concerns (kept strictly distinct):
 * - interest memory ........ this module
 * - personal contact data .. buyerLeadCaptureFlow (contactPhone/displayName)
 * - consent / confirmation . buyerLeadValidation (consentConfirmed)
 * - submitted lead ......... buyerLeadApi / queue
 */

import { parseBuyerSearchBudgetMax } from "../ai/chat/buyerSearchIntentParser";
import { parseBuyerSearchIntent } from "../ai/chat/buyerSearchIntentParser";

export type ConversationalPurchasePreference = "finance" | "cash" | "undecided";

export type ConversationalLeadIntent =
  | "browsing"
  | "comparing"
  | "not_ready_to_send";

export interface ConversationalLeadInterestMemory {
  /** รุ่นที่สนใจ เช่น Yaris, City (latest intent wins) */
  models?: string[];
  /** ยี่ห้อที่ถามถึง เช่น Toyota, Honda */
  brands?: string[];
  budgetMin?: number;
  budgetMax?: number;
  /** พื้นที่สะดวกดูรถ เช่น ลำลูกกา รังสิต คูคต คลอง 3 ดอนเมือง สายไหม */
  areas?: string[];
  transmission?: "auto" | "manual";
  /** เชื้อเพลิง เช่น เบนซิน ดีเซล ไฮบริด ไฟฟ้า */
  fuelTypes?: string[];
  /** ไม่เอาติดแก๊ส */
  excludeGas?: boolean;
  /** สนใจผ่อนหรือซื้อสด — preference เท่านั้น ไม่ใช่ consent ส่ง lead */
  purchasePreference?: ConversationalPurchasePreference;
  /** รถที่เปรียบเทียบ (สะสม) */
  comparedModels?: string[];
  /** เงื่อนไขที่ไม่ต้องการ */
  unwantedConditions?: string[];
  /** ความตั้งใจ เช่น "ยังไม่ส่ง ขอเปรียบเทียบก่อน" */
  intent?: ConversationalLeadIntent;
  /** usage tags จาก parser เดิม (ครอบครัว/ประหยัดน้ำมัน/รถเมือง ฯลฯ) */
  usageTags?: string[];
  updatedAt: string;
}

/** Subset that a single message can express (no updatedAt). */
export type ParsedConversationalLeadInterest = Omit<
  ConversationalLeadInterestMemory,
  "updatedAt"
>;

const bySession = new Map<string, ConversationalLeadInterestMemory>();

// ---------------------------------------------------------------------------
// Deterministic dictionaries / signals
// ---------------------------------------------------------------------------

const BRAND_ALIASES: Record<string, string> = {
  honda: "Honda",
  toyota: "Toyota",
  mazda: "Mazda",
  nissan: "Nissan",
  isuzu: "Isuzu",
  ford: "Ford",
  mitsubishi: "Mitsubishi",
  suzuki: "Suzuki",
  byd: "BYD",
  tesla: "Tesla",
  ฮอนด้า: "Honda",
  โตโยต้า: "Toyota",
  มาสด้า: "Mazda",
  นิสสัน: "Nissan",
  อีซูซุ: "Isuzu",
  ซูซูกิ: "Suzuki",
  มิตซู: "Mitsubishi",
  มิตซูบิชิ: "Mitsubishi",
};

/** Curated common Thai-market models (deterministic; never invents specs). */
const MODEL_PATTERNS: Array<{ canonical: string; re: RegExp }> = [
  { canonical: "Yaris", re: /\byaris\b|ยาริส/i },
  { canonical: "City", re: /\bcity\b|ซิตี้/i },
  { canonical: "Civic", re: /\bcivic\b|ซีวิค/i },
  { canonical: "Vios", re: /\bvios\b|วีออส/i },
  { canonical: "Altis", re: /\baltis\b|อัลติส/i },
  { canonical: "Camry", re: /\bcamry\b|แคมรี่/i },
  { canonical: "Jazz", re: /\bjazz\b|แจ๊ส/i },
  { canonical: "CR-V", re: /\bcr-?v\b|ซีอาร์วี/i },
  { canonical: "HR-V", re: /\bhr-?v\b/i },
  { canonical: "Fortuner", re: /\bfortuner\b|ฟอร์จูนเนอร์/i },
  { canonical: "Mazda2", re: /\bmazda\s?2\b/i },
  { canonical: "CX-5", re: /\bcx-?5\b/i },
  { canonical: "D-Max", re: /\bd-?max\b|ดีแมคซ์/i },
  { canonical: "MU-X", re: /\bmu-?x\b/i },
  { canonical: "Triton", re: /\btriton\b|ไทรทัน/i },
  { canonical: "Ranger", re: /\branger\b|เรนเจอร์/i },
  { canonical: "Almera", re: /\balmera\b|อัลเมร่า/i },
  { canonical: "Ertiga", re: /\bertiga\b/i },
  { canonical: "Xpander", re: /\bxpander\b|เอ็กซ์แพนเดอร์/i },
];

/** Named convenient areas (โซนที่ลุงเด่นระบุ + ที่พบบ่อยในพื้นที่) */
const AREA_PATTERNS: Array<{ canonical: string; re: RegExp }> = [
  { canonical: "คูคต", re: /คูคต/i },
  { canonical: "ลำลูกกา", re: /ลำลูกกา/i },
  { canonical: "รังสิต", re: /รังสิต/i },
  { canonical: "คลอง 3", re: /คลอง\s?(?:3|สาม)/i },
  { canonical: "ดอนเมือง", re: /ดอนเมือง/i },
  { canonical: "สายไหม", re: /สายไหม/i },
];

const COMPARE_SIGNAL =
  /เปรียบเทียบ|เทียบ(?:กับ|ดู|ให้|อีก)?|อีกคัน|คันอื่น|รถคันอื่น|ดูคันอื่น/i;

const HOLD_SIGNAL =
  /ยังไม่ส่ง|ยังไม่ให้เบอร์|ไม่ให้เบอร์|ยังไม่ให้ข้อมูล|เดี๋ยวก่อน|ขอคิดก่อน|ขอดูก่อน|ยังก่อน|ช้าก่อน|ขอเวลา|ไว้ก่อน|ยังไม่พร้อม|ยังไม่ยืนยัน|ขอเปรียบเทียบก่อน/i;

const AUTO_SIGNAL = /เกียร์\s*(?:ออโต้|อัตโนมัติ|auto|at\b)|ออโต้|อัตโนมัติ|\bauto\b|\bat\b/i;
const MANUAL_SIGNAL =
  /เกียร์\s*(?:ธรรมดา|กระปุก|manual|mt\b)|ธรรมดา|กระปุก|\bmanual\b|\bmt\b/i;

const FUEL_PATTERNS: Array<{ canonical: string; re: RegExp }> = [
  { canonical: "เบนซิน", re: /เบนซิน|benzine|\bgasoline\b/i },
  { canonical: "ดีเซล", re: /ดีเซล|\bdiesel\b/i },
  { canonical: "ไฮบริด", re: /ไฮบริด|\bhybrid\b/i },
  { canonical: "ไฟฟ้า", re: /รถไฟฟ้า|พลังงานไฟฟ้า|มอเตอร์ไฟฟ้า|\bev\b|\bbev\b/i },
];

/** "ไม่เอาติดแก๊ส" and friends. */
const EXCLUDE_GAS_SIGNAL =
  /ไม่\s*(?:เอา|อยากได้|ต้องการ)?\s*(?:รถ)?\s*(?:ติด)?\s*แก๊ส|ไม่ติดแก๊ส|ไม่เอา\s*(?:ngv|lpg)|ห้ามติดแก๊ส/i;

const CASH_SIGNAL = /ซื้อสด|เงินสด|จ่ายสด|จ่ายเต็ม/i;
const FINANCE_SIGNAL = /ผ่อน|ไฟแนนซ์|จัดไฟแนนซ์|ดาวน์|ค่างวด|กี่งวด/i;

/** Generic "ไม่เอา X" capture for unwanted conditions (excludes "ไม่เอาคันนี้"). */
const UNWANTED_CAPTURE = /ไม่เอา\s*([ก-๙a-zA-Z0-9 ]{2,30})/giu;

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values.filter((v) => v && v.trim().length > 0)));
}

function extractModels(text: string): string[] {
  const found: string[] = [];
  for (const { canonical, re } of MODEL_PATTERNS) {
    if (re.test(text)) found.push(canonical);
  }
  return dedupe(found);
}

function extractBrands(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const [alias, brand] of Object.entries(BRAND_ALIASES)) {
    if (lower.includes(alias.toLowerCase())) found.push(brand);
  }
  return dedupe(found);
}

function extractAreas(text: string): string[] {
  const found: string[] = [];
  for (const { canonical, re } of AREA_PATTERNS) {
    if (re.test(text)) found.push(canonical);
  }
  return dedupe(found);
}

function extractFuelTypes(text: string): string[] {
  const found: string[] = [];
  for (const { canonical, re } of FUEL_PATTERNS) {
    if (re.test(text)) found.push(canonical);
  }
  return dedupe(found);
}

function extractTransmission(text: string): "auto" | "manual" | undefined {
  // Prefer manual when explicitly stated; both rarely co-occur as a request.
  if (MANUAL_SIGNAL.test(text) && !AUTO_SIGNAL.test(text)) return "manual";
  if (AUTO_SIGNAL.test(text) && !MANUAL_SIGNAL.test(text)) return "auto";
  return undefined;
}

function extractPurchasePreference(
  text: string
): ConversationalPurchasePreference | undefined {
  const cash = CASH_SIGNAL.test(text);
  const finance = FINANCE_SIGNAL.test(text);
  if (cash && !finance) return "cash";
  if (finance && !cash) return "finance";
  if (cash && finance) return "undecided";
  return undefined;
}

function extractUnwantedConditions(text: string, excludeGas: boolean): string[] {
  const out: string[] = [];
  if (excludeGas) out.push("ไม่เอาติดแก๊ส");
  let m: RegExpExecArray | null;
  UNWANTED_CAPTURE.lastIndex = 0;
  while ((m = UNWANTED_CAPTURE.exec(text)) != null) {
    const phrase = `ไม่เอา${m[1].trim()}`.slice(0, 40);
    // "ไม่เอาคันนี้" is a reject-current signal, not a standing condition.
    if (/คันนี้|อันนี้|แล้ว$/.test(m[1].trim())) continue;
    if (/แก๊ส/.test(m[1])) continue; // already covered by excludeGas
    out.push(phrase);
  }
  return dedupe(out);
}

function extractIntent(text: string): ConversationalLeadIntent | undefined {
  if (HOLD_SIGNAL.test(text)) return "not_ready_to_send";
  if (COMPARE_SIGNAL.test(text)) return "comparing";
  return undefined;
}

/**
 * Parse a single buyer message into the interest dimensions it expresses.
 * Pure function — never stores phone/name/consent.
 */
export function parseConversationalLeadInterest(
  message: string
): ParsedConversationalLeadInterest {
  const text = message.trim();
  const parsed: ParsedConversationalLeadInterest = {};
  if (!text) return parsed;

  const models = extractModels(text);
  if (models.length > 0) parsed.models = models;

  const brands = extractBrands(text);
  if (brands.length > 0) parsed.brands = brands;

  const budgetMax = parseBuyerSearchBudgetMax(text);
  if (budgetMax != null) parsed.budgetMax = budgetMax;

  const areas = extractAreas(text);
  if (areas.length > 0) parsed.areas = areas;

  const transmission = extractTransmission(text);
  if (transmission) parsed.transmission = transmission;

  const fuelTypes = extractFuelTypes(text);
  if (fuelTypes.length > 0) parsed.fuelTypes = fuelTypes;

  const excludeGas = EXCLUDE_GAS_SIGNAL.test(text);
  if (excludeGas) parsed.excludeGas = true;

  const purchasePreference = extractPurchasePreference(text);
  if (purchasePreference) parsed.purchasePreference = purchasePreference;

  const unwanted = extractUnwantedConditions(text, excludeGas);
  if (unwanted.length > 0) parsed.unwantedConditions = unwanted;

  const intent = extractIntent(text);
  if (intent) parsed.intent = intent;

  // reuse existing usage tag parser (family/fuel-efficient/city ...)
  const usageTags = parseBuyerSearchIntent(text).usageTags;
  if (usageTags && usageTags.length > 0) parsed.usageTags = usageTags;

  // Compared models accumulate only when a compare signal is present.
  if (COMPARE_SIGNAL.test(text) && models.length > 0) {
    parsed.comparedModels = models;
  }

  return parsed;
}

// ---------------------------------------------------------------------------
// Merge (latest intent wins) + store
// ---------------------------------------------------------------------------

/**
 * Merge a freshly parsed message into existing memory.
 * "Latest intent wins": any dimension expressed in the new message REPLACES the
 * prior value for that dimension; dimensions not mentioned are preserved.
 * comparedModels and unwantedConditions accumulate (union).
 */
export function mergeConversationalLeadInterest(
  prev: ConversationalLeadInterestMemory | null,
  parsed: ParsedConversationalLeadInterest
): ConversationalLeadInterestMemory {
  const base: ConversationalLeadInterestMemory = prev
    ? { ...prev }
    : { updatedAt: new Date(0).toISOString() };

  if (parsed.models) base.models = parsed.models;
  if (parsed.brands) base.brands = parsed.brands;
  if (parsed.budgetMax != null) base.budgetMax = parsed.budgetMax;
  if (parsed.budgetMin != null) base.budgetMin = parsed.budgetMin;
  if (parsed.areas) base.areas = parsed.areas;
  if (parsed.transmission) base.transmission = parsed.transmission;
  if (parsed.fuelTypes) base.fuelTypes = parsed.fuelTypes;
  if (parsed.excludeGas != null) base.excludeGas = parsed.excludeGas;
  if (parsed.purchasePreference) base.purchasePreference = parsed.purchasePreference;
  if (parsed.usageTags) base.usageTags = parsed.usageTags;
  if (parsed.intent) base.intent = parsed.intent;

  if (parsed.comparedModels) {
    base.comparedModels = dedupe([
      ...(base.comparedModels ?? []),
      ...parsed.comparedModels,
    ]);
  }
  if (parsed.unwantedConditions) {
    base.unwantedConditions = dedupe([
      ...(base.unwantedConditions ?? []),
      ...parsed.unwantedConditions,
    ]);
  }

  base.updatedAt = new Date().toISOString();
  return base;
}

/**
 * Record interest from the latest buyer message into session memory.
 * Returns the updated memory, or the existing memory unchanged when the message
 * expresses no interest dimension. Never sends a lead.
 */
export function updateConversationalLeadMemory(
  sessionId: string,
  message: string
): ConversationalLeadInterestMemory | null {
  const sid = sessionId?.trim();
  if (!sid) return null;
  const parsed = parseConversationalLeadInterest(message);
  if (Object.keys(parsed).length === 0) {
    return bySession.get(sid) ?? null;
  }
  const merged = mergeConversationalLeadInterest(bySession.get(sid) ?? null, parsed);
  bySession.set(sid, merged);
  return merged;
}

export function getConversationalLeadMemory(
  sessionId: string
): ConversationalLeadInterestMemory | null {
  return bySession.get(sessionId?.trim() ?? "") ?? null;
}

export function clearConversationalLeadMemory(sessionId: string): void {
  bySession.delete(sessionId?.trim() ?? "");
}

/**
 * PDPA guard — interest memory must never carry personal contact data, consent,
 * plate numbers, or any interest-queue count. Returns true when clean.
 */
export function conversationalLeadMemoryHasNoContactOrConsent(
  mem: ConversationalLeadInterestMemory | Record<string, unknown> | null | undefined
): boolean {
  if (!mem) return true;
  const forbidden = [
    "contactPhone",
    "phone",
    "mobile",
    "tel",
    "displayName",
    "name",
    "consent",
    "consentConfirmed",
    "plate",
    "licensePlate",
    "queue",
    "queueCount",
    "interestCount",
  ];
  return !forbidden.some((k) => {
    const v = (mem as Record<string, unknown>)[k];
    if (typeof v === "string") return v.trim().length > 0;
    return v != null;
  });
}

// ---------------------------------------------------------------------------
// v7.3 — Natural lead preview context (DISPLAY-ONLY)
// ---------------------------------------------------------------------------

/**
 * A read-only, human-readable summary of remembered interest, for enriching the
 * lead *preview* shown to the same buyer. This NEVER becomes the submitted lead
 * payload and NEVER implies consent — it only helps the conversation feel
 * natural ("จากที่คุยกันไว้: ..."). Contains no phone/name/consent/plate/queue.
 */
export interface LeadPreviewMemoryContext {
  /** Short bullet highlights for display (e.g. "รุ่นที่สนใจ: Yaris"). */
  highlights: string[];
  /** One-line natural summary for display. */
  summary: string;
}

const PURCHASE_PREFERENCE_LABEL: Record<ConversationalPurchasePreference, string> = {
  finance: "สนใจผ่อน/ไฟแนนซ์",
  cash: "สนใจซื้อสด",
  undecided: "ยังไม่แน่ใจผ่อนหรือสด",
};

/**
 * Build display-only preview context from interest memory.
 * Returns null when there is nothing useful to show. Pure function.
 */
export function buildLeadPreviewContextFromMemory(
  mem: ConversationalLeadInterestMemory | null | undefined
): LeadPreviewMemoryContext | null {
  if (!mem) return null;
  const highlights: string[] = [];

  if (mem.models && mem.models.length > 0) {
    highlights.push(`รุ่นที่สนใจ: ${mem.models.join(", ")}`);
  } else if (mem.brands && mem.brands.length > 0) {
    highlights.push(`ยี่ห้อที่สนใจ: ${mem.brands.join(", ")}`);
  }
  if (mem.budgetMax != null && mem.budgetMax > 0) {
    highlights.push(`งบประมาณ: ไม่เกิน ${mem.budgetMax.toLocaleString("th-TH")} บาท`);
  } else if (mem.budgetMin != null && mem.budgetMin > 0) {
    highlights.push(`งบประมาณ: ประมาณ ${mem.budgetMin.toLocaleString("th-TH")} บาท`);
  }
  if (mem.areas && mem.areas.length > 0) {
    highlights.push(`พื้นที่สะดวกดูรถ: ${mem.areas.join(", ")}`);
  }
  if (mem.transmission) {
    highlights.push(`เกียร์: ${mem.transmission === "auto" ? "อัตโนมัติ" : "ธรรมดา"}`);
  }
  if (mem.fuelTypes && mem.fuelTypes.length > 0) {
    highlights.push(`เชื้อเพลิง: ${mem.fuelTypes.join(", ")}`);
  }
  if (mem.purchasePreference) {
    highlights.push(PURCHASE_PREFERENCE_LABEL[mem.purchasePreference]);
  }
  if (mem.unwantedConditions && mem.unwantedConditions.length > 0) {
    highlights.push(`เงื่อนไขที่ไม่ต้องการ: ${mem.unwantedConditions.join(", ")}`);
  }

  if (highlights.length === 0) return null;

  return {
    highlights,
    summary: `จากที่คุยกันไว้ — ${highlights.join(" · ")}`,
  };
}

/** Test helper — seed a memory directly. */
export function setConversationalLeadMemoryForTest(
  sessionId: string,
  mem: ConversationalLeadInterestMemory
): void {
  bySession.set(sessionId.trim(), mem);
}

/** Test helper — clear all sessions. */
export function resetConversationalLeadMemoryForTests(): void {
  bySession.clear();
}
