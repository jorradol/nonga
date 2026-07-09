/**
 * v22.25 — Safe general model-level context for inventory chat answers.
 * Framed as typical model knowledge only — never vehicle-specific claims.
 */

export interface ModelContextInput {
  brand?: string;
  model?: string;
  year?: number;
  bodyClassLabel?: string;
}

const HALLUCINATION_BAN =
  /(?:ไม่เคยชน|ไร้ประวัติชน|ไม่เคยน้ำท่วม|ไม่จมน้ำ|ไม่เคยทำสี|เจ้าของเดียว|มือเดียว|ยางใหม่|แบตใหม่|รับประกัน|การันตี|อนุมัติแน่นอน|ผ่อนได้แน่นอน|\d+\s*กม\.?\s*\/\s*ลิตร|km\/l)/i;

/** Normalize brand+model for lookup (CRV ↔ CR-V). */
export function normalizeModelKey(brand?: string, model?: string): string {
  const b = String(brand ?? "")
    .trim()
    .toLowerCase();
  const m = String(model ?? "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "")
    .replace(/\s+/g, "");
  return `${b}|${m}`;
}

/**
 * Curated general positioning for common Thai used-car models.
 * Keep short, practical, and free of vehicle-specific guarantees.
 */
const MODEL_GENERAL_CONTEXT: Record<string, string> = {
  "honda|crv":
    "โดยทั่วไป Honda CR-V เป็น SUV ครอบครัวที่นั่งสบาย พื้นที่ห้องโดยสารและท้ายกว้าง เหมาะกับใช้งานประจำวันและพาครอบครัว — ควรตรวจสอบรายละเอียดกับผู้ขายอีกครั้ง",
  "honda|cr-v":
    "โดยทั่วไป Honda CR-V เป็น SUV ครอบครัวที่นั่งสบาย พื้นที่ห้องโดยสารและท้ายกว้าง เหมาะกับใช้งานประจำวันและพาครอบครัว — ควรตรวจสอบรายละเอียดกับผู้ขายอีกครั้ง",
  "toyota|camry":
    "โดยทั่วไป Toyota Camry เป็นซีดานนั่งสบาย ภาพลักษณ์สุภาพ เหมาะกับใช้งานเมืองและคนที่อยากได้รถนั่งหลังสบาย — ควรตรวจสอบรายละเอียดกับผู้ขายอีกครั้ง",
  "toyota|corolla":
    "โดยทั่วไป Toyota Corolla เป็นซีดานใช้งานจริง ดูแลง่ายในภาพรวม เหมาะกับขับประจำวัน — ควรตรวจสอบรายละเอียดกับผู้ขายอีกครั้ง",
  "toyota|fortuner":
    "โดยทั่วไป Toyota Fortuner เป็น SUV ตัวใหญ่ เหมาะกับครอบครัวและงานที่ต้องการพื้นที่/ความมั่นใจบนท้องถนน — ควรตรวจสอบรายละเอียดกับผู้ขายอีกครั้ง",
  "honda|civic":
    "โดยทั่วไป Honda Civic เป็นซีดาน/แฮทช์ที่ขับคล่อง เหมาะกับใช้งานเมืองและคนที่อยากได้รถขับสนุกในงบสมเหตุสมผล — ควรตรวจสอบรายละเอียดกับผู้ขายอีกครั้ง",
  "honda|city":
    "โดยทั่วไป Honda City เป็นซีดานกะทัดรัด เหมาะกับใช้งานเมืองและคุมงบ — ควรตรวจสอบรายละเอียดกับผู้ขายอีกครั้ง",
  "toyota|vios":
    "โดยทั่วไป Toyota Vios เป็นซีดานเล็กใช้งานง่าย เหมาะกับรถคันแรกหรือขับในเมือง — ควรตรวจสอบรายละเอียดกับผู้ขายอีกครั้ง",
  "mazda|cx5":
    "โดยทั่วไป Mazda CX-5 เป็น SUV นั่งสบาย ภาพลักษณ์ดี เหมาะกับครอบครัวและใช้งานประจำวัน — ควรตรวจสอบรายละเอียดกับผู้ขายอีกครั้ง",
  "mazda|cx-5":
    "โดยทั่วไป Mazda CX-5 เป็น SUV นั่งสบาย ภาพลักษณ์ดี เหมาะกับครอบครัวและใช้งานประจำวัน — ควรตรวจสอบรายละเอียดกับผู้ขายอีกครั้ง",
  "toyota|yaris":
    "โดยทั่วไป Toyota Yaris เป็นรถกะทัดรัด เหมาะกับขับในเมืองและใช้งานประจำวัน — ควรตรวจสอบรายละเอียดกับผู้ขายอีกครั้ง",
  "isuzu|mux":
    "โดยทั่วไป Isuzu MU-X เป็น SUV ครอบครัวที่เน้นพื้นที่และความอเนกประสงค์ — ควรตรวจสอบรายละเอียดกับผู้ขายอีกครั้ง",
  "isuzu|mu-x":
    "โดยทั่วไป Isuzu MU-X เป็น SUV ครอบครัวที่เน้นพื้นที่และความอเนกประสงค์ — ควรตรวจสอบรายละเอียดกับผู้ขายอีกครั้ง",
  "mitsubishi|xpander":
    "โดยทั่วไป Mitsubishi Xpander เป็น MPV ครอบครัว ที่นั่งเยอะ เหมาะกับพาคนในบ้าน — ควรตรวจสอบรายละเอียดกับผู้ขายอีกครั้ง",
  "toyota|alphard":
    "โดยทั่วไป Toyota Alphard เป็น MPV พรีเมียม นั่งสบาย เหมาะกับครอบครัวที่เน้นความสะดวกสบาย — ควรตรวจสอบรายละเอียดกับผู้ขายอีกครั้ง",
};

function bodyFallbackContext(bodyClassLabel?: string): string {
  const body = String(bodyClassLabel ?? "");
  if (/SUV|Crossover/i.test(body)) {
    return "โดยทั่วไปรุ่นในกลุ่ม SUV/Crossover เหมาะกับครอบครัวที่อยากได้นั่งสบายและพื้นที่ใช้สอย — ควรตรวจสอบรายละเอียดกับผู้ขายอีกครั้ง";
  }
  if (/MPV/i.test(body)) {
    return "โดยทั่วไปรุ่นในกลุ่ม MPV เหมาะกับครอบครัวที่ต้องการที่นั่งเยอะและการใช้งานอเนกประสงค์ — ควรตรวจสอบรายละเอียดกับผู้ขายอีกครั้ง";
  }
  if (/Sedan|ซีดาน/i.test(body)) {
    return "โดยทั่วไปซีดานรุ่นนี้เหมาะกับคนที่เน้นนั่งสบาย ภาพลักษณ์สุภาพ และใช้งานเมือง — ควรตรวจสอบรายละเอียดกับผู้ขายอีกครั้ง";
  }
  if (/Hatchback/i.test(body)) {
    return "โดยทั่วไปแฮทช์แบ็กกะทัดรัด เหมาะกับขับในเมืองและใช้งานประจำวัน — ควรตรวจสอบรายละเอียดกับผู้ขายอีกครั้ง";
  }
  if (/Pickup|กระบะ/i.test(body)) {
    return "โดยทั่วไปกระบะเหมาะกับงานบรรทุกและใช้งานหนัก — ควรตรวจสอบรายละเอียดกับผู้ขายอีกครั้ง";
  }
  return "";
}

/**
 * General model-level context only. Empty when unknown.
 * Always framed with โดยทั่วไป / ควรตรวจสอบ — never invents this-car facts.
 */
export function buildGeneralModelContext(input: ModelContextInput): string {
  const key = normalizeModelKey(input.brand, input.model);
  const altKey = key.replace(/\|/, "|"); // already normalized
  const known =
    MODEL_GENERAL_CONTEXT[key] ??
    MODEL_GENERAL_CONTEXT[altKey] ??
    MODEL_GENERAL_CONTEXT[key.replace("crv", "cr-v")] ??
    "";

  const text = known || bodyFallbackContext(input.bodyClassLabel);
  if (!text) return "";
  if (HALLUCINATION_BAN.test(text)) return "";
  return text;
}

/** Prefix line for inventory answers — clearly general, not this-car fact. */
export function buildGeneralModelContextBlock(input: ModelContextInput): string {
  const ctx = buildGeneralModelContext(input);
  if (!ctx) return "";
  return `ข้อมูลทั่วไปของรุ่น (ไม่ใช่การยืนยันสภาพคันนี้): ${ctx}`;
}

export function assertNoHallucinatedVehicleClaim(text: string): void {
  if (HALLUCINATION_BAN.test(text)) {
    throw new Error(`Hallucinated vehicle claim: ${text.slice(0, 120)}`);
  }
}
