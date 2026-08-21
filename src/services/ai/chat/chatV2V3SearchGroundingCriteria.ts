/**
 * WP-NVB-03B — Deterministic server-directed Search criteria.
 * Parse once per turn. No Gemini. Client-provided normalized criteria are ignored.
 */
export const SEARCH_GROUNDING_PAGE_SIZE = 10;

export const SEARCH_GROUNDING_BODY_CLASSES = [
  "sedan",
  "suv",
  "mpv",
  "hatchback",
  "pickup",
  "van",
  "coupe",
] as const;

export type ServerDirectedSearchBodyClass =
  (typeof SEARCH_GROUNDING_BODY_CLASSES)[number];

export type ServerDirectedSearchTransmission = "auto" | "manual";

export type ServerDirectedSearchFuel = "ev" | "hybrid" | "gasoline" | "diesel";

export interface ServerDirectedSearchHistoryTurn {
  readonly role: "user" | "assistant";
  readonly content: string;
}

export interface ServerDirectedSearchCriteria {
  readonly query: string;
  readonly supported: boolean;
  readonly unsupportedReasons: readonly string[];
  readonly isShowMore: boolean;
  readonly pageIndex: number;
  readonly brand?: string;
  readonly model?: string;
  readonly bodyClass?: ServerDirectedSearchBodyClass;
  readonly transmission?: ServerDirectedSearchTransmission;
  readonly minPrice?: number;
  readonly maxPrice?: number;
  readonly minYear?: number;
  readonly maxYear?: number;
  readonly maxMileage?: number;
  readonly fuel?: ServerDirectedSearchFuel;
}

const BRAND_ALIASES: ReadonlyArray<readonly [RegExp, string]> = [
  [/\btoyota\b|โตโยต้า|โตโยตา/i, "Toyota"],
  [/\bhonda\b|ฮอนด้า/i, "Honda"],
  [/\bmazda\b|มาสด้า/i, "Mazda"],
  [/\bnissan\b|นิสสัน/i, "Nissan"],
  [/\bisuzu\b|อีซูซุ/i, "Isuzu"],
  [/\bford\b|ฟอร์ด/i, "Ford"],
  [/\bmitsubishi\b|มิตซูบิชิ/i, "Mitsubishi"],
  [/\bmercedes(?:-benz)?\b|\bbenz\b|เบนซ์/i, "Mercedes-Benz"],
  [/\bbmw\b/i, "BMW"],
  [/\bbyd\b/i, "BYD"],
  [/\btesla\b|เทสลา/i, "Tesla"],
  [/\bsuzuki\b|ซูซูกิ/i, "Suzuki"],
  [/\bmg\b/i, "MG"],
  [/\bchevrolet\b|\bchevy\b/i, "Chevrolet"],
];

const SHOW_MORE_RE =
  /^(?:ดูเพิ่ม|ขอดูเพิ่ม|ดูต่อ|ขออีก(?:\s*\d+\s*คัน)?|มีอีกไหม|อีก\s*\d+\s*คัน)(?:ครับ|ค่ะ|นะ)?$/i;

const UNSUPPORTED_COLOR_RE =
  /สี(?:ขาว|ดำ|แดง|เทา|เงิน|น้ำเงิน|น้ำตาล|เขียว|เหลือง|ส้ม|ชมพู)/;
const UNSUPPORTED_LOCATION_RE =
  /กรุงเทพ|เชียงใหม่|ภูเก็ต|นนทบุรี|จังหวัด|ในจังหวัด|ที่อยู่/;
const UNSUPPORTED_FEATURE_RE =
  /ซันรูฟ|sunroof|กล้อง\s*360|360\s*กล้อง|หลังคาแก้ว|รางยาว/;

const MODEL_AFTER_BRAND_RE =
  /\b(?:toyota|honda|mazda|nissan|isuzu|ford|mitsubishi|bmw|byd|tesla|suzuki|mg|chevrolet|mercedes(?:-benz)?|benz|โตโยต้า|โตโยตา|ฮอนด้า|มาสด้า|นิสสัน)\s+([A-Za-z0-9][A-Za-z0-9-]{1,24})\b/i;

export function isServerDirectedSearchShowMoreMessage(message: string): boolean {
  return SHOW_MORE_RE.test(String(message ?? "").trim());
}

function parseDigits(raw: string): number {
  return Number(String(raw).replace(/,/g, "").replace(/\s+/g, ""));
}

function parseBudgetBound(
  message: string,
  kind: "max" | "min"
): number | undefined {
  const text = message.trim();
  if (kind === "max") {
    const unit = text.match(
      /(?:ราคา|งบ(?:ประมาณ)?)?(?:ไม่เกิน|ไม่เกิ|ต่ำกว่า|ถูกกว่า|ภายใต้)\s*([\d,]+(?:\.\d+)?)\s*(แสน|ล้าน)?\s*(บาท|฿)?(?!\s*ปี)/i
    );
    if (unit) {
      let n = parseDigits(unit[1]);
      if (unit[2]) {
        if (/แสน/i.test(unit[2])) n *= 100_000;
        else n *= 1_000_000;
      }
      if (!unit[2] && n < 10_000 && !unit[3]) {
        return undefined;
      }
      if (n > 0) return Math.round(n);
    }
    const plain = text.match(
      /(?:ราคา|งบ)?(?:ไม่เกิน|ไม่เกิ)\s*([\d,]{5,})\s*(?:บาท|฿)?/i
    );
    if (plain) {
      const n = parseDigits(plain[1]);
      if (n > 0) return Math.round(n);
    }
  }
  if (kind === "min") {
    const m = text.match(
      /(?:ตั้งแต่|ขั้นต่ำ|งบ(?:อย่างน้อย|ขั้นต่ำ)|ราคา(?:ตั้งแต่|ขั้นต่ำ))\s*([\d,]+(?:\.\d+)?)\s*(แสน|ล้าน)?/i
    );
    if (!m) return undefined;
    let n = parseDigits(m[1]);
    if (m[2]) {
      if (/แสน/i.test(m[2])) n *= 100_000;
      else n *= 1_000_000;
    }
    return n > 0 ? Math.round(n) : undefined;
  }
  return undefined;
}

function parseBrand(message: string): string | undefined {
  for (const [pattern, brand] of BRAND_ALIASES) {
    if (pattern.test(message)) {
      return brand;
    }
  }
  return undefined;
}

function parseModel(message: string, brand: string | undefined): string | undefined {
  const match = message.match(MODEL_AFTER_BRAND_RE);
  if (!match) return undefined;
  const raw = match[1].trim();
  if (!raw) return undefined;
  if (/^(at|mt|ev|suv|mpv)$/i.test(raw)) return undefined;
  if (brand && raw.toLowerCase() === brand.toLowerCase()) return undefined;
  if (/^altis$/i.test(raw)) return "Corolla";
  if (/^crv$/i.test(raw)) return "CR-V";
  return raw;
}

function parseBodyClass(message: string): ServerDirectedSearchBodyClass | undefined {
  const t = message;
  if (/กระบะ|pickup|pick-up/i.test(t)) return "pickup";
  if (/\bsuv\b|อเนกประสงค์/i.test(t)) return "suv";
  if (/7\s*ที่นั่ง|เจ็ดที่นั่ง|\bmpv\b/i.test(t)) return "mpv";
  if (/แวน|\bvan\b/i.test(t)) return "van";
  if (/\bcoupe\b|คูเป้/i.test(t)) return "coupe";
  if (/แฮทช์|hatchback|รถ(?:คัน)?เล็ก/i.test(t)) return "hatchback";
  if (/เก๋ง|ซีดาน|\bsedan\b/i.test(t)) return "sedan";
  return undefined;
}

function parseTransmission(message: string): ServerDirectedSearchTransmission | undefined {
  if (/เกียร์(?:ออโต้|อัตโนมัติ)|ออโต้(?:เกียร์)?|\bAT\b|automatic/i.test(message)) {
    return "auto";
  }
  if (/เกียร์(?:ธรรมดา|แมนนวล)|ธรรมดา|\bMT\b|manual/i.test(message)) {
    return "manual";
  }
  return undefined;
}

function parseFuel(message: string): ServerDirectedSearchFuel | undefined {
  if (/รถไฟฟ้า|ยานยนต์ไฟฟ้า|\bev\b|ไฟฟ้า(?:ล้วน)?/i.test(message)) return "ev";
  if (/ไฮบริด|hybrid/i.test(message)) return "hybrid";
  if (/ดีเซล|diesel/i.test(message)) return "diesel";
  if (/เบนซิน|gasoline|petrol/i.test(message)) return "gasoline";
  return undefined;
}

function parseYearBounds(
  message: string,
  nowYear: number
): { minYear?: number; maxYear?: number } {
  const range = message.match(/ปี\s*(20\d{2})\s*(?:[-–]|ถึง)\s*(20\d{2})/i);
  if (range) {
    const a = Number(range[1]);
    const b = Number(range[2]);
    if (a >= 1980 && b >= 1980) {
      return { minYear: Math.min(a, b), maxYear: Math.max(a, b) };
    }
  }
  const exact = message.match(/ปี\s*(20\d{2})/i);
  if (exact) {
    const year = Number(exact[1]);
    if (year >= 1980 && year <= nowYear + 1) {
      return { minYear: year, maxYear: year };
    }
  }
  const maxAge = message.match(
    /(?:ไม่เกิน|ภายใน|อายุ(?:รถ)?(?:ไม่เกิน)?|รถ(?:อายุ)?ไม่เกิน)\s*(\d+)\s*ปี/i
  );
  if (maxAge) {
    const years = Number(maxAge[1]);
    if (years >= 1 && years <= 30) {
      return { minYear: nowYear - years };
    }
  }
  return {};
}

function parseMaxMileage(message: string): number | undefined {
  const a = message.match(
    /(?:ไมล์|เลขไมล์|mileage).{0,16}ไม่เกิน\s*([\d,]+)/i
  );
  if (a) {
    const n = parseDigits(a[1]);
    if (n > 0) return n;
  }
  const b = message.match(/ไม่เกิน\s*([\d,]+)\s*(?:กม\.?|กิโลเมตร)/i);
  if (b) {
    const n = parseDigits(b[1]);
    if (n > 0) return n;
  }
  return undefined;
}

function collectUnsupportedReasons(message: string): string[] {
  const reasons: string[] = [];
  if (UNSUPPORTED_COLOR_RE.test(message)) reasons.push("color");
  if (UNSUPPORTED_LOCATION_RE.test(message)) reasons.push("location");
  if (UNSUPPORTED_FEATURE_RE.test(message)) reasons.push("unverified-feature");
  return reasons;
}

function parseOneMessage(
  message: string,
  nowYear: number
): Omit<ServerDirectedSearchCriteria, "pageIndex" | "isShowMore"> & {
  isShowMore: boolean;
} {
  const query = String(message ?? "").trim();
  if (isServerDirectedSearchShowMoreMessage(query)) {
    return {
      query,
      supported: false,
      unsupportedReasons: ["show-more"],
      isShowMore: true,
    };
  }

  const unsupportedReasons = collectUnsupportedReasons(query);
  const brand = parseBrand(query);
  const model = parseModel(query, brand);
  const bodyClass = parseBodyClass(query);
  const transmission = parseTransmission(query);
  const maxPrice = parseBudgetBound(query, "max");
  const minPrice = parseBudgetBound(query, "min");
  const yearBounds = parseYearBounds(query, nowYear);
  const maxMileage = parseMaxMileage(query);
  const fuel = parseFuel(query);

  const hasSupportedCriterion = Boolean(
    brand ||
      model ||
      bodyClass ||
      transmission ||
      maxPrice != null ||
      minPrice != null ||
      yearBounds.minYear != null ||
      yearBounds.maxYear != null ||
      maxMileage != null ||
      fuel
  );

  const supported = unsupportedReasons.length === 0 && hasSupportedCriterion;

  return {
    query,
    supported,
    unsupportedReasons: supported
      ? []
      : unsupportedReasons.length > 0
        ? unsupportedReasons
        : hasSupportedCriterion
          ? []
          : ["no-supported-criterion"],
    isShowMore: false,
    ...(brand ? { brand } : {}),
    ...(model ? { model } : {}),
    ...(bodyClass ? { bodyClass } : {}),
    ...(transmission ? { transmission } : {}),
    ...(minPrice != null ? { minPrice } : {}),
    ...(maxPrice != null ? { maxPrice } : {}),
    ...(yearBounds.minYear != null ? { minYear: yearBounds.minYear } : {}),
    ...(yearBounds.maxYear != null ? { maxYear: yearBounds.maxYear } : {}),
    ...(maxMileage != null ? { maxMileage } : {}),
    ...(fuel ? { fuel } : {}),
  };
}

function countTrailingShowMoreUserTurns(
  history: readonly ServerDirectedSearchHistoryTurn[]
): number {
  let count = 0;
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const turn = history[index];
    if (turn.role === "assistant") continue;
    if (turn.role === "user" && isServerDirectedSearchShowMoreMessage(turn.content)) {
      count += 1;
      continue;
    }
    break;
  }
  return count;
}

function findLastSubstantiveSearch(
  history: readonly ServerDirectedSearchHistoryTurn[],
  nowYear: number
): ServerDirectedSearchCriteria | null {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const turn = history[index];
    if (turn.role !== "user") continue;
    const parsed = parseOneMessage(turn.content, nowYear);
    if (parsed.isShowMore) continue;
    if (!parsed.supported) continue;
    return {
      ...parsed,
      pageIndex: 0,
      isShowMore: false,
    };
  }
  return null;
}

export function hasPriorSubstantiveServerDirectedSearch(
  history: readonly ServerDirectedSearchHistoryTurn[],
  nowYear = new Date().getFullYear()
): boolean {
  return findLastSubstantiveSearch(history, nowYear) != null;
}

/**
 * Parse once per turn. Show-more reuses the last substantive Search criteria
 * from sanitized history and advances pageIndex.
 */
export function parseServerDirectedSearchCriteria(
  message: string,
  history: readonly ServerDirectedSearchHistoryTurn[] = [],
  nowYear = new Date().getFullYear()
): ServerDirectedSearchCriteria {
  const current = parseOneMessage(message, nowYear);
  if (!current.isShowMore) {
    return {
      ...current,
      pageIndex: 0,
      isShowMore: false,
    };
  }

  const prior = findLastSubstantiveSearch(history, nowYear);
  if (!prior) {
    return {
      query: current.query,
      supported: false,
      unsupportedReasons: ["show-more-without-prior"],
      isShowMore: true,
      pageIndex: 0,
    };
  }

  return {
    ...prior,
    isShowMore: true,
    pageIndex: countTrailingShowMoreUserTurns(history) + 1,
  };
}
