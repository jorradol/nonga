/** v5.4.8c+ — warm buyer car pitch copy from scored listings (deterministic) */

import type { BuyerSearchIntent } from "./buyerSearchIntentParser";
import type { BuyerMarketplaceScoredCandidate } from "./buyerMarketplaceScoring";
import type { BuyerMarketplaceScoringResult } from "./buyerMarketplaceScoring";
import { buildStableSeed, pickStableVariant } from "./thaiSalesCopyVariation";

const RANK_LABELS = ["คันแรก", "คันที่สอง", "คันที่สาม"] as const;

export const BUYER_PITCH_FORBIDDEN_CLAIM =
  /(?:รวยแน่นอน|เจริญแน่นอน|ร่ำรวยแน่นอน|เนื้อคู่ชัวร์|คู่ใจชัวร์|ต้องรีบซื้อ|ไม่เคยชน|ไม่เคยน้ำท่วม|ไม่จุกจิกแน่นอน|ไม่เสียแน่นอน|km\/l|กม\.\/ลิตร|กิโลเมตรต่อลิตร)/i;

function formatPrice(n: number): string {
  return n.toLocaleString("th-TH");
}

export function assertBuyerPitchSafe(text: string): void {
  if (BUYER_PITCH_FORBIDDEN_CLAIM.test(text)) {
    throw new Error(`Forbidden pitch claim: ${text.slice(0, 100)}`);
  }
}

function rankLabel(index: number): string {
  return RANK_LABELS[index] ?? `คันที่ ${index + 1}`;
}

function hasTag(
  intent: BuyerSearchIntent,
  ranked: BuyerMarketplaceScoredCandidate,
  tag: string
): boolean {
  return (
    intent.usageTags?.includes(tag) === true ||
    ranked.matchedTags?.includes(tag) === true
  );
}

function isOverBudgetCaution(ranked: BuyerMarketplaceScoredCandidate): boolean {
  return (ranked.cautions ?? []).some((c) => /เกินงบ/.test(c));
}

function isInBudget(
  intent: BuyerSearchIntent,
  ranked: BuyerMarketplaceScoredCandidate
): boolean {
  if (intent.budgetMax == null) return true;
  return ranked.car.price <= intent.budgetMax;
}

function reasonMentionsBudget(ranked: BuyerMarketplaceScoredCandidate): boolean {
  return ranked.reasons.some((r) => /งบ/.test(r));
}

function buildWarmAngle(
  intent: BuyerSearchIntent,
  ranked: BuyerMarketplaceScoredCandidate,
  index: number
): string {
  const body = String(ranked.car.bodyType ?? "").toLowerCase();
  const desc = String(ranked.car.description ?? "");

  if (isOverBudgetCaution(ranked)) {
    return "คันนี้น่าสนใจ แต่ราคาเกินงบเล็กน้อย — ถ้าสภาพและออปชันคุ้ม อาจเป็นตัวเลือกที่ขยับขึ้นมาแล้วได้ความสดขึ้นอีกนิด";
  }

  if (hasTag(intent, ranked, "firstCar") && index === 0) {
    return "คันนี้มีฟีลรถคู่ใจสำหรับเริ่มต้นดี ๆ ใช้งานง่าย และเหมาะกับคนที่อยากได้รถคันแรกแบบไม่กดดันกระเป๋ามากนัก";
  }

  if (hasTag(intent, ranked, "firstCar")) {
    return "เหมาะกับการพิจารณาเป็นรถคันแรก — จังหวะเข้ากับโจทย์พอดี";
  }

  if (hasTag(intent, ranked, "fuelEfficient")) {
    if (/ประหยัด/i.test(desc)) {
      return "รายละเอียดประกาศเน้นแนวประหยัด — ตัวนี้ฟีลรถใช้งานจริงในเมืองกำลังดี ขนาดไม่ใหญ่เกินไป";
    }
    if (body === "hatchback" || body === "sedan") {
      return "ตัวถังกะทัดรัด เหมาะมุมประหยัดน้ำมันและใช้งานจริง — เป็นอีกคันที่จังหวะเข้ากับโจทย์";
    }
    return "มุมประหยัดน้ำมันและใช้งานจริง — น่าดูต่อถ้าตรงสไตล์ที่ต้องการ";
  }

  if (hasTag(intent, ranked, "family") || (intent.seatsMin ?? 0) >= 7) {
    if (body === "mpv") {
      return "สายครอบครัวชัด ๆ — พาคนในบ้านหรือใช้งานหลายคนได้สบายขึ้น ตัวถัง MPV เข้าทางโจทย์";
    }
    if (body === "suv") {
      return "มุมครอบครัว/อเนกประสงค์ — เหมาะกับคนที่อยากได้พื้นที่และความมั่นใจเวลาพาครอบครัว";
    }
    return "เหมาะกับคนที่อยากได้รถช่วยพางาน พาครอบครัว หรือชีวิตประจำวันให้คล่องขึ้น";
  }

  if (hasTag(intent, ranked, "city")) {
    return "ตัวนี้ฟีลรถใช้งานเมืองกำลังดี — ขับไปทำงาน ไปพบลูกค้า หรือใช้ในชีวิตประจำวันได้คล่อง";
  }

  if (
    hasTag(intent, ranked, "easyMaintenance") ||
    hasTag(intent, ranked, "lowMaintenance")
  ) {
    return "สายใช้งานจริง ดูแลง่ายในภาพรวม — แต่ควรตรวจประวัติซ่อมและทดลองขับก่อนตัดสินใจ";
  }

  if (hasTag(intent, ranked, "financeIntent")) {
    return "ราคาจับต้องได้ในมุมผ่อนเบื้องต้น — ช่วยลดภาระค่างวดถ้าไฟแนนซ์ผ่าน (ไม่ใช่ใบเสนอจริง)";
  }

  if (reasonMentionsBudget(ranked) && isInBudget(intent, ranked)) {
    return "ราคาอยู่ในงบที่ตั้งไว้ — เหมือนเป็นตัวเลือกที่จังหวะเข้ากับโจทย์พอดี";
  }

  if (index === 0) {
    return "คันนี้เรียงมาเป็นลำดับแรกเพราะเข้าทางโจทย์ที่สุดในตลาดตอนนี้ — น่าดูต่อถ้าสเปกตรงใจ";
  }

  return "อีกทางเลือกที่ยังน่าสนใจ — ลองเทียบกับคันอื่นในการ์ดด้านล่างดูครับ";
}

function buildReasonWeave(ranked: BuyerMarketplaceScoredCandidate): string {
  const r = ranked.reasons.find(
    (line) =>
      line.length > 0 &&
      !/^(ราคาอยู่ในงบที่ตั้งไว้|ตัวถังและโจทย์)/.test(line)
  );
  if (!r) return "";
  if (r.length > 72) return ` (${r.slice(0, 70)}…)`;
  return ` (${r})`;
}

function buildClosingLine(
  ranked: BuyerMarketplaceScoredCandidate,
  isLast: boolean
): string {
  if (isOverBudgetCaution(ranked)) {
    return "หนูแนะนำให้ดูรายละเอียดกับทดลองขับก่อนตัดสินใจครับ";
  }
  return "ถ้าตรวจสภาพและประวัติดูแลรักษาแล้วถูกใจ คันนี้ถือว่าน่าดูต่อมากครับ";
}

/**
 * One warm pitch block for a scored listing (1–2 short sentences + headline).
 */
export function buildBuyerCarPitchLine(
  ranked: BuyerMarketplaceScoredCandidate,
  index: number,
  intent: BuyerSearchIntent,
  options?: { isLastInBatch?: boolean; addCheer?: boolean }
): string {
  const c = ranked.car;
  const label = rankLabel(index);
  const headline = `${label} ${c.brand} ${c.model} ราคา ${formatPrice(c.price)} บาท`;
  const angle = buildWarmAngle(intent, ranked, index);
  const weave = buildReasonWeave(ranked);
  const close = buildClosingLine(ranked, options?.isLastInBatch === true);
  let pitch = `${headline} — ${angle}${weave} ${close}`;

  if (options?.addCheer && options.isLastInBatch) {
    pitch += " ปังปุริเย่!";
  }

  assertBuyerPitchSafe(pitch);
  return pitch.trim();
}

function buildPitchOpener(
  message: string,
  intent: BuyerSearchIntent,
  count: number,
  sparseGlobal?: string[]
): string {
  const seed = buildStableSeed([message, "pitchOpener", String(count)]);
  const who = pickStableVariant(seed, "pitch.who", [
    "หนู",
    "น้องเอ",
    "น้องเอ",
  ]);

  let budgetPart = "";
  if (intent.budgetMax != null) {
    budgetPart = `งบไม่เกิน ${formatPrice(intent.budgetMax)} บาท`;
  } else if (intent.seatsMin != null && intent.seatsMin >= 7) {
    budgetPart = "รถครอบครัว 7 ที่นั่ง";
  } else if (intent.usageTags?.includes("family")) {
    budgetPart = "รถครอบครัว";
  } else if (intent.usageTags?.includes("fuelEfficient")) {
    budgetPart = "รถประหยัดน้ำมัน";
  } else if (intent.usageTags?.includes("city")) {
    budgetPart = "ใช้งานในเมือง";
  } else {
    budgetPart = "โจทย์ที่บอกมา";
  }

  const openers =
    count >= 3
      ? [
          `จาก${budgetPart} ${who}คัดจากรถที่มีจริงในตลาดตอนนี้มาให้ ${count} คันก่อนนะครับ รอบนี้ขอเรียงจากคันที่เข้าทางสุดก่อน`,
          `จาก${budgetPart} ${who}เลือกรถจริงในระบบมา ${count} คันให้ดูก่อน — เรียงจากเข้าทางสุดนะครับ`,
        ]
      : count === 2
        ? [
            `จาก${budgetPart} ${who}มี 2 คันที่น่าดูต่อจากตลาดจริงให้ก่อนนะครับ`,
          ]
        : [
            `จาก${budgetPart} ${who}เจอคันที่น่าสนใจจากตลาดจริงให้ก่อนนะครับ`,
          ];

  const lines = [pickStableVariant(seed, "pitch.open", openers)];

  if (sparseGlobal && sparseGlobal.length > 0) {
    const honest = sparseGlobal.find((c) => /ตัวเลือกตรงเงื่อนไข/.test(c));
    if (honest) lines.push(honest);
  }

  if (intent.needsClarification && intent.clarificationQuestion) {
    lines.push(intent.clarificationQuestion);
  }

  const text = lines.join("\n\n");
  assertBuyerPitchSafe(text);
  return text;
}

/**
 * Full scored-search intro: advisor opener + up to 3 warm pitches + closing + CTA hook.
 */
export function buildScoredCarPitchCopy(
  message: string,
  intent: BuyerSearchIntent,
  scoring: BuyerMarketplaceScoringResult,
  options: { hasMore: boolean; ctaLine: string }
): string {
  const highlightCount = Math.min(3, scoring.candidates.length);
  const parts: string[] = [
    buildPitchOpener(message, intent, highlightCount, scoring.cautions),
  ];

  const cheerSeed = buildStableSeed([
    message,
    "pitchCheer",
    ...scoring.candidates.map((c) => c.car.id),
  ]);
  const addCheer =
    highlightCount >= 2 &&
    pickStableVariant(cheerSeed, "pitch.cheer", ["yes", "no", "no"]) === "yes";

  for (let i = 0; i < highlightCount; i++) {
    const isLast = i === highlightCount - 1;
    parts.push(
      buildBuyerCarPitchLine(scoring.candidates[i], i, intent, {
        isLastInBatch: isLast,
        addCheer: addCheer && isLast,
      })
    );
  }

  parts.push(
    "อย่างไรก็ตาม ควรตรวจประวัติดูแลรักษาและทดลองขับก่อนตัดสินใจครับ — น้องเอไม่ได้การันตีสภาพจากข้อมูลในระบบเพียงอย่างเดียว"
  );

  const budgetCaution = (scoring.cautions ?? []).find((c) =>
    /ยังไม่มีรถในงบ/.test(c)
  );
  if (budgetCaution && !parts.includes(budgetCaution)) {
    parts.push(budgetCaution);
  }

  parts.push(options.ctaLine);

  const text = parts.join("\n\n");
  assertBuyerPitchSafe(text);
  return text;
}
