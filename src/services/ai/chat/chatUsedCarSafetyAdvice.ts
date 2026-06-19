/**
 * v7.5 — Thai used-car market context + safety advice layer (deterministic, no Gemini).
 *
 * Two light, woven layers for buyer replies:
 *  - market context note: a SHORT, general framing line (hidden costs / budget /
 *    city-vs-upcountry) appended to a search reply only when there is a real
 *    budget/finance signal. Never claims a specific car's market price/condition.
 *  - safety nudge: a SINGLE natural reminder, emitted ONLY when the message shows
 *    a payment/scam trigger (โอน/มัดจำ/จอง/นัดดูรถ). Returns null otherwise so the
 *    answer never gets long or stiff.
 *
 * Hard rules:
 *  - General advice only — never invents car facts (mileage/fuel/history/claim/
 *    finance approval/specific market price) and never guarantees condition.
 *  - Display-only. Never sends a lead, never implies consent, no PII, no queue.
 */

import type { BuyerSearchIntent } from "./buyerSearchIntentParser";
import { buildStableSeed, pickStableVariant } from "./thaiSalesCopyVariation";

/**
 * Forbidden over-claims for the advice layer: guaranteeing a specific car's
 * condition, finance approval, or a concrete market price. Kept separate from the
 * pitch guard so advice copy gets its own explicit safety net.
 */
// NOTE: guarantee verbs (การันตี/รับประกัน) are only forbidden as POSITIVE claims.
// Negated, honest disclaimers like "น้องเอไม่ได้การันตีสภาพ…" must stay allowed,
// so the verbs use a negative lookbehind for ไม่ / ไม่ได้.
export const USED_CAR_ADVICE_OVERCLAIM_FORBIDDEN =
  /(?:สภาพ(?:ดี|เยี่ยม|สวย)(?:แน่นอน|ชัวร์|100|ร้อยเปอร์)|ไม่มีปัญหาแน่นอน|ผ่อนผ่านแน่นอน|อนุมัติแน่นอน|ไฟแนนซ์ผ่านชัวร์|(?<!ไม่)(?<!ไม่ได้)การันตี(?:สภาพ|ผ่าน|ราคา)|ราคาตลาด(?:รุ่นนี้|คันนี้)?(?:คือ|อยู่ที่|เท่ากับ)\s*\d|ถูกที่สุดในตลาด|คุ้มที่สุด(?:แน่นอน)?|(?<!ไม่)(?<!ไม่ได้)รับประกัน(?:สภาพ|ว่าผ่าน))/i;

export function assertUsedCarAdviceSafe(text: string): void {
  if (USED_CAR_ADVICE_OVERCLAIM_FORBIDDEN.test(text)) {
    throw new Error(`Forbidden used-car advice over-claim: ${text.slice(0, 100)}`);
  }
}

// ---------------------------------------------------------------------------
// Safety nudge (trigger-only, single line)
// ---------------------------------------------------------------------------

/** Payment / scam signals that warrant a single safety reminder. */
const SAFETY_TRIGGER =
  /โอน(?:เงิน|ก่อน|มัดจำ)?|มัดจำ|วางเงิน|วางมัดจำ|จอง(?:รถ|ก่อน)?|นัดดู(?:รถ)?|โดน(?:โกง|หลอก)|ถูกโกง|มิจฉาชีพ|หลอก(?:ขาย|โอน)?/i;

export function hasUsedCarSafetyTrigger(message: string): boolean {
  return SAFETY_TRIGGER.test(message);
}

/**
 * One short, non-scary safety reminder — returns null when there is no payment/
 * scam trigger in the message (keeps replies concise).
 */
export function buildUsedCarSafetyNudge(message: string): string | null {
  if (!hasUsedCarSafetyTrigger(message)) return null;
  const seed = buildStableSeed([message, "usedCarSafety"]);
  const nudge = pickStableVariant(seed, "safety.nudge", [
    "ก่อนโอนเงินหรือวางมัดจำ แนะนำให้เห็นรถจริง ตรวจเล่มทะเบียนและตัวรถก่อนนะครับ จะปลอดภัยกว่า",
    "แนะนำนัดดูรถจริงและตรวจเอกสารให้ครบก่อนโอนเงินหรือมัดจำทุกครั้งนะครับ เพื่อความปลอดภัย",
    "เพื่อความสบายใจ ควรเห็นรถจริงและเช็กเอกสารให้ตรงกับผู้ขายก่อนวางมัดจำหรือโอนเงินครับ",
  ] as const);
  assertUsedCarAdviceSafe(nudge);
  return nudge;
}

// ---------------------------------------------------------------------------
// Market context note (conditional, single line, woven into search replies)
// ---------------------------------------------------------------------------

/**
 * A short, general market-context line for a search reply — emitted only when the
 * buyer signalled a budget or finance interest. Frames hidden costs / budget; it
 * never states a specific car's market price or guarantees finance.
 * Returns null when there is no useful signal.
 */
export function buildMarketContextNote(
  intent: BuyerSearchIntent,
  seedExtra?: string
): string | null {
  const hasBudget = intent.budgetMax != null && intent.budgetMax > 0;
  const hasFinance = intent.financeIntent === true;
  if (!hasBudget && !hasFinance) return null;

  const seed = buildStableSeed([
    seedExtra,
    "marketContext",
    String(intent.budgetMax ?? ""),
    hasFinance ? "fin" : "",
  ]);

  let note: string;
  if (hasFinance) {
    note = pickStableVariant(seed, "market.finance", [
      "เผื่องบสำหรับค่าใช้จ่ายแฝงด้วยนะครับ เช่น พรบ./ประกัน/ต่อภาษี และค่าบำรุงตามระยะ — ค่างวดจริงขึ้นกับดาวน์และไฟแนนซ์ที่เลือก",
      "นอกจากค่างวด อย่าลืมเผื่อ พรบ./ประกัน/ภาษี และค่าดูแลตามระยะด้วยนะครับ จะวางแผนงบได้ชัดขึ้น",
    ] as const);
  } else {
    note = pickStableVariant(seed, "market.budget", [
      "เผื่องบสำหรับค่าใช้จ่ายแฝงด้วยนะครับ เช่น พรบ./ประกัน/ต่อภาษี และค่าบำรุงตามระยะ จะได้ไม่เกินงบที่ตั้งไว้",
      "นอกจากราคารถ แนะนำเผื่อ พรบ./ประกัน/ภาษี และค่าดูแลเบื้องต้นไว้ในงบด้วยนะครับ",
    ] as const);
  }

  assertUsedCarAdviceSafe(note);
  return note;
}
