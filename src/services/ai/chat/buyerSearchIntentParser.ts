/** v5.4.8a — deterministic buyer vehicle search intent (foundation; no scoring/cards) */

import {
  detectBuyerAdvisorTopic,
  normalizeBuyerAdvisorMessage,
} from "./chatBuyerAdvisorTemplates";

export interface BuyerSearchIntent {
  isVehicleSearch: boolean;
  budgetMax?: number;
  usageTags?: string[];
  bodyTypeHints?: string[];
  seatsMin?: number;
  financeIntent?: boolean;
  needsClarification?: boolean;
  clarificationQuestion?: string;
}

const EXPLICIT_SEARCH_REQUEST =
  /(?:มี|หา|ค้นหา|ช่วยหา|ช่วยค้นหา).{0,80}(?:ไหม|มั้ย|หรือเปล่า|ให้หน่อย|ให้ที|ได้ไหม)/i;

const SOFT_VEHICLE_WANT =
  /(?:อยากได้|ต้องการ|ขอ|แนะนำ)(?:รถ|คัน)?|หารถ|ค้นหารถ/i;

const VAGUE_ONLY =
  /^(?:ช่วยหน่อย|แนะนำหน่อย|มีอะไรบ้าง|มีอะไรน่าสนใจ(?:บ้าง)?|เอาแบบไหนดี|อยากได้รถ(?:หน่อย)?|หาหน่อย)$/i;

const FINANCE_SEARCH_SIGNAL =
  /(?:มี|หา|แนะนำ|อยากได้).{0,60}(?:ผ่อนเบา|ผ่อน\s*เบา|งวดเบา|ค่างวดเบา|ผ่อน\s*น้อย)/i;

const FINANCE_TOPIC_SIGNAL =
  /ผ่อนเบา|ผ่อน\s*เบา|งวดเบา|ค่างวดเบา|ผ่อน\s*น้อย/i;

/** Advisor-style finance Q&A — not inventory search */
const FINANCE_ADVISOR_BLOCK =
  /(?:ไฟแนนซ์|ผ่อน|ดาวน์)(?:ต้อง|ควร)เตรียม|ดาวน์(?:เท่าไหร่|กี่เปอร์|กี่%|เท่าไร)(?:ดี|เหมาะ|ควร)|ซื้อสด(?:กับ|หรือ)\s*ผ่อน|ผ่อน(?:กับ|หรือ)\s*ซื้อสด/i;

const USAGE_PATTERNS: { tag: string; re: RegExp }[] = [
  {
    tag: "fuelEfficient",
    re: /ประหยัดน้ำมัน|ประหยัด\s*น้ำมัน|น้ำมัน(?:ไม่)?(?:กิน|สิ้นเปลือง)?(?:เยอะ|มาก)|กิน(?:น้ำมัน)?(?:น้อย|เบา)/i,
  },
  { tag: "family", re: /รถครอบครัว|ครอบครัว|ใช้กับครอบครัว/i },
  {
    tag: "firstCar",
    re: /รถ(?:มือสอง)?คันแรก|คันแรก(?:ซื้อ|เลือก)รถ|ซื้อรถคันแรก|เลือกรถคันแรก/i,
  },
  { tag: "city", re: /ใช้(?:งาน)?ในเมือง|รถเมือง|ขับในเมือง|จอดในเมือง/i },
  {
    tag: "easyMaintenance",
    re: /ดูแลง่าย|รถ(?:ที่)?ดูแลง่าย|รถมือสองดูแลง่าย/i,
  },
  {
    tag: "lowMaintenance",
    re: /ไม่จุกจิก|รถ(?:ที่)?ไม่จุกจิก/i,
  },
];

const THAI_WORD_TO_DIGIT: Record<string, string> = {
  หนึ่ง: "1",
  สอง: "2",
  สาม: "3",
  สี่: "4",
  ห้า: "5",
  หก: "6",
  เจ็ด: "7",
  แปด: "8",
  เก้า: "9",
};

function parseThaiNumber(raw: string): number {
  return Number(String(raw).replace(/,/g, ""));
}

function preprocessThaiDigits(text: string): string {
  let out = text;
  for (const [word, digit] of Object.entries(THAI_WORD_TO_DIGIT)) {
    out = out.replace(new RegExp(word, "g"), digit);
  }
  return out;
}

/** Parse max budget from Thai buyer messages — no invented specs */
export function parseBuyerSearchBudgetMax(message: string): number | undefined {
  const text = message.trim();
  if (!text) return undefined;

  let processedText = preprocessThaiDigits(text);
  let parsedPrice = 0;

  const priceUnder = processedText.match(
    /(?:ไม่เกิน|ไม่เกิ|<=|<|ภายใต้|งบ(?:ไม่)?(?:เกิน)?|ราคา|ต่ำกว่า|ถูกกว่า|ถูกลง|น้อยกว่า)\s*([\d,]+(?:\.\d+)?)\s*(แสน|ล้าน|ล\.|million)?\s*(?:บาท|฿)?/i
  );

  if (priceUnder) {
    parsedPrice = parseThaiNumber(priceUnder[1]);
    if (priceUnder[2]) {
      if (/แสน/i.test(priceUnder[2])) parsedPrice *= 100_000;
      else if (/ล้าน|ล\.|million/i.test(priceUnder[2])) parsedPrice *= 1_000_000;
    } else {
      const remainder = processedText.substring(priceUnder.index! + priceUnder[0].length);
      if (remainder.match(/^\s*(ล้าน|ล\.|million)/i)) parsedPrice *= 1_000_000;
      else if (remainder.match(/^\s*แสน/i)) parsedPrice *= 100_000;
      else if (processedText.match(/ล้าน|ล\.|million/i)) parsedPrice *= 1_000_000;
      else if (processedText.match(/แสน/i)) parsedPrice *= 100_000;
    }
  }

  if (parsedPrice === 0) {
    const implicitUnder = processedText.match(
      /(?:ไม่เกิน|ไม่เกิ|<=|<|ภายใต้|ต่ำกว่า|ถูกกว่า|ถูกลง|น้อยกว่า)\s*([\d,]+(?:\.\d+)?)\s*(แสน|ล้าน|ล\.|million)?\s*(?:บาท|฿)?/i
    );
    if (implicitUnder) {
      parsedPrice = parseThaiNumber(implicitUnder[1]);
      if (implicitUnder[2]) {
        if (/แสน/i.test(implicitUnder[2])) parsedPrice *= 100_000;
        else if (/ล้าน|ล\.|million/i.test(implicitUnder[2])) parsedPrice *= 1_000_000;
      } else {
        const remainder = processedText.substring(
          implicitUnder.index! + implicitUnder[0].length
        );
        if (remainder.match(/^\s*(ล้าน|ล\.|million)/i)) parsedPrice *= 1_000_000;
        else if (remainder.match(/^\s*แสน/i)) parsedPrice *= 100_000;
        else if (processedText.match(/ล้าน|ล\.|million/i)) parsedPrice *= 1_000_000;
        else if (processedText.match(/แสน/i)) parsedPrice *= 100_000;
      }
    }
  }

  if (parsedPrice === 0) {
    const directPrice = processedText.match(
      /([\d,]+(?:\.\d+)?)\s*(แสน|ล้าน|ล\.|million)\s*(?:บาท|฿)?/i
    );
    if (directPrice) {
      parsedPrice = parseThaiNumber(directPrice[1]);
      if (/แสน/i.test(directPrice[2])) parsedPrice *= 100_000;
      else if (/ล้าน|ล\.|million/i.test(directPrice[2])) parsedPrice *= 1_000_000;
    }
  }

  if (parsedPrice === 0) {
    const thaiWordsMatch = text.match(
      /(?:ไม่เกิน|ไม่เกิ|<=|<|ภายใต้|งบ|ราคา|ต่ำกว่า)?\s*(หนึ่ง|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า)\s*(แสน|ล้าน)/i
    );
    if (thaiWordsMatch) {
      const wordToNum: Record<string, number> = {
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
      parsedPrice = wordToNum[thaiWordsMatch[1]];
      if (/แสน/i.test(thaiWordsMatch[2])) parsedPrice *= 100_000;
      else if (/ล้าน/i.test(thaiWordsMatch[2])) parsedPrice *= 1_000_000;
    }
  }

  if (parsedPrice === 0) {
    // Bare unit after under-budget: "งบไม่เกินล้าน" / "ไม่เกินแสน" → 1 unit
    const bareUnit = processedText.match(
      /(?:ไม่เกิน|ไม่เกิ|<=|<|ภายใต้|งบ(?:ไม่)?(?:เกิน)?|ราคา|ต่ำกว่า|ถูกกว่า|ถูกลง|น้อยกว่า)\s*(ล้าน|ล\.|million|แสน)\s*(?:บาท|฿)?/i
    );
    if (bareUnit) {
      if (/แสน/i.test(bareUnit[1])) parsedPrice = 100_000;
      else parsedPrice = 1_000_000;
    }
  }

  if (parsedPrice === 0) {
    const plainBaht = processedText.match(
      /(?:ไม่เกิน|ไม่เกิ|งบ|ราคา|ต่ำกว่า|ถูกกว่า|ถูกลง|น้อยกว่า)\s*([\d,]{6,})\s*(?:บาท|฿)?/i
    );
    if (plainBaht) parsedPrice = parseThaiNumber(plainBaht[1]);
  }

  return parsedPrice > 0 ? parsedPrice : undefined;
}

function collectUsageTags(text: string): string[] {
  const tags: string[] = [];
  for (const { tag, re } of USAGE_PATTERNS) {
    if (re.test(text) && !tags.includes(tag)) tags.push(tag);
  }
  return tags;
}

function collectBodyTypeHints(text: string, usageTags: string[]): string[] {
  const hints: string[] = [];
  if (/7\s*ที่นั่ง|เจ็ดที่นั่ง/i.test(text) || usageTags.includes("family")) {
    if (!hints.includes("mpv")) hints.push("mpv");
  }
  if (/\bsuv\b|อเนกประสงค์/i.test(text)) {
    if (!hints.includes("suv")) hints.push("suv");
  }
  if (usageTags.includes("city") && hints.length === 0) {
    hints.push("hatchback", "sedan");
  }
  return hints;
}

function parseSeatsMin(text: string): number | undefined {
  if (/7\s*ที่นั่ง|เจ็ดที่นั่ง/i.test(text)) return 7;
  return undefined;
}

function isFinanceSearchIntent(text: string): boolean {
  if (FINANCE_ADVISOR_BLOCK.test(text)) return false;
  return FINANCE_SEARCH_SIGNAL.test(text) || FINANCE_TOPIC_SIGNAL.test(text);
}

function isPureAdvisorWithoutSearch(text: string): boolean {
  const topic = detectBuyerAdvisorTopic(text);
  if (!topic) return false;
  const budget = parseBuyerSearchBudgetMax(text);
  const usage = collectUsageTags(text);
  const seats = parseSeatsMin(text);
  const explicit = EXPLICIT_SEARCH_REQUEST.test(text) || SOFT_VEHICLE_WANT.test(text);
  if (budget != null) return false;
  if (seats != null) return false;
  if (usage.length >= 2) return false;
  if (usage.length === 1 && explicit) return false;
  if (isFinanceSearchIntent(text) && explicit) return false;
  return true;
}

function buildClarificationQuestion(
  text: string,
  usageTags: string[]
): string {
  if (/แนะนำ|อยากได้|เอาแบบ/i.test(text)) {
    return "อยากให้ช่วยจากงบประมาณ ประเภทการใช้งาน หรือยี่ห้อที่สนใจก่อนดีครับ? (เช่น งบไม่เกิน 5 แสน / SUV ครอบครัว)";
  }
  if (usageTags.length > 0) {
    return "ช่วยบอกงบประมาณหรือยี่ห้อ/รุ่นที่สนใจเพิ่มได้ไหมครับ จะได้ค้นจากรถจริงในระบบให้ตรงขึ้น";
  }
  return "ขอรายละเอียดเพิ่มนิดนึงครับ — งบประมาณ ยี่ห้อ/รุ่น หรือประเภทรถที่อยากใช้ (เช่น SUV ครอบครัว รถเมือง)";
}

/**
 * Parse buyer vehicle search intent from chat text.
 * Does not score inventory or emit car cards — foundation for v5.4.8+ search quality.
 */
export function parseBuyerSearchIntent(message: string): BuyerSearchIntent {
  const text = normalizeBuyerAdvisorMessage(message);
  if (!text) {
    return { isVehicleSearch: false };
  }

  if (VAGUE_ONLY.test(text)) {
    return {
      isVehicleSearch: false,
      needsClarification: true,
      clarificationQuestion: buildClarificationQuestion(text, []),
    };
  }

  if (isPureAdvisorWithoutSearch(text)) {
    return { isVehicleSearch: false };
  }

  const budgetMax = parseBuyerSearchBudgetMax(text);
  const usageTags = collectUsageTags(text);
  const bodyTypeHints = collectBodyTypeHints(text, usageTags);
  const seatsMin = parseSeatsMin(text);
  const financeIntent = isFinanceSearchIntent(text);

  const explicitSearch =
    EXPLICIT_SEARCH_REQUEST.test(text) || SOFT_VEHICLE_WANT.test(text);
  const hasUsage = usageTags.length > 0;
  const hasStructure =
    budgetMax != null ||
    seatsMin != null ||
    bodyTypeHints.length > 0 ||
    financeIntent;

  const isVehicleSearch =
    budgetMax != null ||
    seatsMin != null ||
    (hasUsage && (explicitSearch || budgetMax != null || usageTags.length >= 2)) ||
    (financeIntent && explicitSearch) ||
    (explicitSearch &&
      (hasUsage || bodyTypeHints.length > 0) &&
      /รถ/.test(text));

  if (!isVehicleSearch) {
    const softHint =
      hasUsage || /งบ|แสน|ล้าน|รถ(?:ครอบครัว|เมือง)/i.test(text);
    if (softHint && !explicitSearch) {
      return {
        isVehicleSearch: false,
        usageTags: hasUsage ? usageTags : undefined,
        needsClarification: true,
        clarificationQuestion: buildClarificationQuestion(text, usageTags),
      };
    }
    return { isVehicleSearch: false };
  }

  const needsBudgetClarification =
    budgetMax == null &&
    !financeIntent &&
    hasUsage &&
    !/(?:มี|หา).{0,30}(?:ไหม|มั้ย)/i.test(text);

  const result: BuyerSearchIntent = {
    isVehicleSearch: true,
    ...(budgetMax != null ? { budgetMax } : {}),
    ...(hasUsage ? { usageTags } : {}),
    ...(bodyTypeHints.length > 0 ? { bodyTypeHints } : {}),
    ...(seatsMin != null ? { seatsMin } : {}),
    ...(financeIntent ? { financeIntent: true } : {}),
  };

  if (needsBudgetClarification) {
    result.needsClarification = true;
    result.clarificationQuestion = buildClarificationQuestion(text, usageTags);
  }

  return result;
}

/** True when message has parsed buyer search signals (for future gate/scoring hooks). */
export function hasBuyerVehicleSearchSignals(message: string): boolean {
  return parseBuyerSearchIntent(message).isVehicleSearch;
}
