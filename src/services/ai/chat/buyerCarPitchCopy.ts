/** v5.4.8c–8d / v22.26 — warm buyer car pitch copy from scored listings (deterministic) */

import type { BuyerSearchIntent } from "./buyerSearchIntentParser";
import type { BuyerMarketplaceScoredCandidate } from "./buyerMarketplaceScoring";
import type { BuyerMarketplaceScoringResult } from "./buyerMarketplaceScoring";
import {
  resolveChatListingTransmission,
  type ChatInventoryCar,
} from "./marketplaceChatSearch";
import { BODY_CLASS_LABEL_TH, inferVehicleBodyClass } from "./vehicleBodyClassifier";
import { buildStableSeed, pickStableVariant } from "./thaiSalesCopyVariation";
import {
  assertNoHallucinatedVehicleClaim,
  buildGeneralModelContext,
} from "./vehicleModelContext";

const RANK_LABELS = ["คันแรก", "คันที่สอง", "คันที่สาม"] as const;

export const BUYER_PITCH_FORBIDDEN_CLAIM =
  /(?:รวยแน่นอน|เจริญแน่นอน|ร่ำรวยแน่นอน|เนื้อคู่ชัวร์|คู่ใจชัวร์|ต้องรีบซื้อ|ไม่เคยชน|ไม่เคยน้ำท่วม|ไม่จุกจิกแน่นอน|ไม่เสียแน่นอน|เครื่องดีแน่นอน|ซื้อแล้วค้าขายรุ่งแน่นอน|km\/l|กม\.\/ลิตร|กิโลเมตรต่อลิตร)/i;

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

function inferPerCarDifferentiator(ranked: BuyerMarketplaceScoredCandidate): string {
  const car = ranked.car;
  const desc = String(car.description ?? "").trim();
  const body = String(car.bodyType ?? "").toLowerCase();
  const modelCtx = buildGeneralModelContext({
    brand: car.brand,
    model: car.model,
    year: car.year,
    bodyClassLabel: bodyLabelOf(car),
  }).toLowerCase();
  const mileage = Number(car.mileage ?? 0);

  if (/ผู้บริหาร|นั่งสบาย|ห้องโดยสาร|สุภาพ|ภาพลักษณ์/i.test(desc) || /นั่งสบาย|ภาพลักษณ์สุภาพ/.test(modelCtx)) {
    return "จุดเด่นคือบรรยากาศห้องโดยสารและความนุ่มนวลเวลาใช้งาน เหมาะทั้งขับเองและใช้พบลูกค้า";
  }

  if (mileage > 0 && mileage <= 60_000) {
    return `ไมล์ ${formatPrice(mileage)} กม. ยังถือว่าไม่สูงเมื่อเทียบรถปีใกล้กัน เหมาะกับคนที่อยากเริ่มใช้งานระยะยาว`;
  }

  if (mileage > 0 && mileage >= 100_000) {
    return `ไมล์ ${formatPrice(mileage)} กม. ควรตรวจประวัติเช็กระยะและทดลองขับ แต่ถ้าสภาพจริงดีจะคุมงบได้คุ้ม`;
  }

  if (/ดูแลง่าย|ไม่จุกจิก/i.test(desc) || /ดูแลง่าย|ใช้งานง่าย/.test(modelCtx)) {
    return "มุมค่าใช้จ่ายหลังรับรถค่อนข้างเป็นมิตร เหมาะกับคนที่อยากคุมค่าดูแลต่อเนื่อง";
  }

  if (body === "suv" || body === "mpv") {
    return "ได้ความอเนกประสงค์และตำแหน่งนั่งที่มองทางง่ายขึ้น เหมาะกับวันที่ต้องใช้รถหลายบทบาท";
  }

  if (body === "hatchback") {
    return "ตัวรถกะทัดรัด คล่องในเมืองและหาที่จอดง่าย เหมาะกับการใช้งานทุกวัน";
  }

  return "ภาพรวมบาลานซ์ดีทั้งความคุ้มค่าและการใช้งานจริงในชีวิตประจำวัน";
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
    return `ขับในเมืองเข้ามือดี และพอเอาไปใช้งานจริงได้ต่อเนื่อง — ${inferPerCarDifferentiator(ranked)}`;
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
    return `ราคาอยู่ในงบที่ตั้งไว้ และจุดที่น่าดูต่อคือ ${inferPerCarDifferentiator(ranked)}`;
  }

  if (index === 0) {
    return "คันนี้เรียงมาเป็นลำดับแรกเพราะเข้าทางโจทย์ที่สุดในตลาดตอนนี้ — น่าดูต่อถ้าสเปกตรงใจ";
  }

  return "อีกทางเลือกที่ยังน่าสนใจ — ลองเทียบกับคันอื่นในชุดนี้ดูครับ";
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

function bodyLabelOf(car: ChatInventoryCar): string {
  const cls = inferVehicleBodyClass(car);
  return BODY_CLASS_LABEL_TH[cls] ?? "รถ";
}

function buildInventoryFactLine(car: ChatInventoryCar): string {
  const parts: string[] = [];
  if (car.price > 0) parts.push(`ราคา ${formatPrice(car.price)} บาท`);
  const mileage = Number(car.mileage ?? 0);
  if (mileage > 0) parts.push(`ไมล์ ${formatPrice(mileage)} กม.`);
  if (car.year > 0) parts.push(`ปี ${car.year}`);
  if (car.color) parts.push(`สี${car.color}`);
  const gear = resolveChatListingTransmission(car)?.trim() ?? "";
  if (gear && gear.length <= 24) {
    parts.push(gear.startsWith("เกียร์") ? gear : `เกียร์${gear}`);
  }
  const condition = String(car.condition ?? "").trim();
  if (
    condition &&
    condition.length <= 40 &&
    !/(ทะเบียน|VIN|vin|โทร|เบอร์|ที่อยู่|importKey|เกียร์|AT|MT|CVT)/i.test(condition)
  ) {
    parts.push(`สภาพ${condition}`);
  }
  const desc = String(car.description ?? "").trim();
  if (
    desc &&
    desc.length >= 8 &&
    desc.length <= 72 &&
    !/(ทะเบียน|VIN|vin|โทร|เบอร์|ที่อยู่|importKey|ไม่เคยชน|ไม่เคยน้ำท่วม)/i.test(desc)
  ) {
    parts.push(`จุดเด่นจากประกาศ: ${desc}`);
  }
  return parts.join(" · ");
}

function buildWhoItSuits(
  intent: BuyerSearchIntent,
  ranked: BuyerMarketplaceScoredCandidate
): string {
  const body = String(ranked.car.bodyType ?? "").toLowerCase();
  const label = bodyLabelOf(ranked.car);
  if (hasTag(intent, ranked, "family") || (intent.seatsMin ?? 0) >= 7) {
    return `เหมาะกับครอบครัวที่อยากได้${label}`;
  }
  if (hasTag(intent, ranked, "city") || body === "sedan" || body === "hatchback") {
    return `เหมาะกับใช้งานเมือง / ขับประจำวัน`;
  }
  if (body === "suv" || body === "mpv" || /SUV|MPV|Crossover/i.test(label)) {
    return `เหมาะกับครอบครัวหรือคนที่อยากได้นั่งสบายและพื้นที่ใช้สอย`;
  }
  if (intent.budgetMax != null && isInBudget(intent, ranked)) {
    return `เหมาะกับคนที่คุมงบไม่เกิน ${formatPrice(intent.budgetMax)} บาท`;
  }
  return `เหมาะกับคนที่มองหารถใช้งานจริงในงบนี้`;
}

function buildCompareSummary(
  intent: BuyerSearchIntent,
  shown: BuyerMarketplaceScoredCandidate[]
): string {
  if (shown.length < 2) return "";
  const byPrice = [...shown].sort((a, b) => a.car.price - b.car.price);
  const cheapest = byPrice[0]!;
  const withMileage = shown.filter((c) => Number(c.car.mileage ?? 0) > 0);
  const lowestMileage =
    withMileage.length >= 2
      ? [...withMileage].sort(
          (a, b) => Number(a.car.mileage ?? 0) - Number(b.car.mileage ?? 0)
        )[0]
      : null;
  const familyish = shown.find((c) => {
    const body = inferVehicleBodyClass(c.car);
    return body === "suv" || body === "mpv";
  });
  const comfort = shown.find((c) => {
    const body = inferVehicleBodyClass(c.car);
    return body === "sedan" || body === "suv" || body === "mpv";
  });

  const tips: string[] = [];
  tips.push(
    `ถ้าเน้นคุ้มงบ ลองโฟกัส ${cheapest.car.brand} ${cheapest.car.model} ปี ${cheapest.car.year} ก่อน`
  );
  if (lowestMileage && lowestMileage.car.id !== cheapest.car.id) {
    tips.push(
      `ถ้าเน้นไมล์น้อย ${lowestMileage.car.brand} ${lowestMileage.car.model} ปี ${lowestMileage.car.year} น่าสนใจ`
    );
  }
  if (familyish) {
    tips.push(
      `ถ้าเน้นครอบครัว ${familyish.car.brand} ${familyish.car.model} ปี ${familyish.car.year} เข้าทางโจทย์`
    );
  } else if (comfort && comfort.car.id !== cheapest.car.id) {
    tips.push(
      `ถ้าเน้นนั่งสบาย ${comfort.car.brand} ${comfort.car.model} ปี ${comfort.car.year} คุ้มพิจารณา`
    );
  }
  if (intent.budgetMax != null) {
    tips.push(`ทั้งชุดนี้อยู่ในกรอบงบไม่เกิน ${formatPrice(intent.budgetMax)} บาทตามข้อมูลประกาศ`);
  }
  const text = `สรุปช่วยตัดสินใจ: ${tips.join(" · ")} — อิงจากข้อมูลประกาศจริงเท่านั้นครับ`;
  assertBuyerPitchSafe(text);
  assertNoHallucinatedVehicleClaim(text);
  return text;
}

/**
 * One professional sales pitch block for a scored listing (facts + why + who).
 */
export function buildBuyerCarPitchLine(
  ranked: BuyerMarketplaceScoredCandidate,
  index: number,
  intent: BuyerSearchIntent,
  options?: { isLastInBatch?: boolean; addCheer?: boolean; compact?: boolean }
): string {
  const c = ranked.car;
  const label = rankLabel(index);
  const title = `${c.brand} ${c.model} ปี ${c.year}`.trim();
  const headline = options?.compact
    ? `${title} — ราคา ${formatPrice(c.price)} บาท`
    : `${label}: ${title}`;
  const facts = buildInventoryFactLine(c);
  const angle = buildWarmAngle(intent, ranked, index);
  const who = buildWhoItSuits(intent, ranked);
  const modelCtx = buildGeneralModelContext({
    brand: c.brand,
    model: c.model,
    year: c.year,
    bodyClassLabel: bodyLabelOf(c),
  });
  const weave = options?.compact ? "" : buildReasonWeave(ranked);

  const lines = [
    headline,
    facts ? `จากข้อมูลประกาศ — ${facts}` : "",
    `ทำไมน่าสนใจในงบนี้: ${angle}${weave}`,
    who,
    modelCtx
      ? `ข้อมูลทั่วไปของรุ่น (ไม่ใช่การยืนยันสภาพคันนี้): ${modelCtx}`
      : "",
  ].filter(Boolean);

  let pitch = lines.join("\n");
  if (options?.addCheer && options.isLastInBatch) {
    pitch += " ปังปุริเย่!";
  }

  assertBuyerPitchSafe(pitch);
  assertNoHallucinatedVehicleClaim(pitch);
  return pitch.trim();
}

/**
 * v7.4 — compact grounded "why this car fits" line for a single card.
 * Deterministic, derived only from the scored candidate's real fields + intent
 * (no mileage/fuel/history/finance/condition invented). Always safety-guarded.
 */
export function buildCardFitReason(
  ranked: BuyerMarketplaceScoredCandidate,
  index: number,
  intent: BuyerSearchIntent
): string {
  const angle = buildWarmAngle(intent, ranked, index).trim();
  assertBuyerPitchSafe(angle);
  return angle;
}

/** v7.4 — fit reasons parallel to scoring.candidates (for card narrative fusion). */
export function buildAllCardFitReasons(
  intent: BuyerSearchIntent,
  scoring: BuyerMarketplaceScoringResult
): string[] {
  return scoring.candidates.map((candidate, i) =>
    buildCardFitReason(candidate, i, intent)
  );
}

/** Pitch lines for every ranked candidate (compact style from index 3+). */
export function buildAllScoredPitchLines(
  message: string,
  intent: BuyerSearchIntent,
  scoring: BuyerMarketplaceScoringResult
): string[] {
  const cheerSeed = buildStableSeed([
    message,
    "pitchCheer",
    ...scoring.candidates.map((c) => c.car.id),
  ]);
  const addCheer =
    scoring.candidates.length >= 2 &&
    pickStableVariant(cheerSeed, "pitch.cheer", ["yes", "no", "no"]) === "yes";

  return scoring.candidates.map((candidate, i) =>
    buildBuyerCarPitchLine(candidate, i, intent, {
      compact: i >= 3,
      isLastInBatch: i === scoring.candidates.length - 1,
      addCheer: addCheer && i === scoring.candidates.length - 1,
    })
  );
}

function buildPitchOpener(
  message: string,
  intent: BuyerSearchIntent,
  count: number,
  sparseGlobal?: string[]
): string {
  const seed = buildStableSeed([message, "pitchOpener", String(count)]);
  const who = "น้องเอ";

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
 * Full scored-search intro: opener + per-car sales explanations + compare + soft CTA.
 * v22.26 — assistant text must explain each displayed car (cards alone are not enough).
 */
export function buildScoredCarPitchCopy(
  message: string,
  intent: BuyerSearchIntent,
  scoring: BuyerMarketplaceScoringResult,
  options: {
    hasMore: boolean;
    ctaLine: string;
    displayCount: number;
    /**
     * @deprecated v22.26 — multi-car answers always include per-car text.
     * Kept for call-site compatibility; ignored when falsey or truthy.
     */
    omitPerCarPitch?: boolean;
  }
): string {
  const displayCount = Math.min(
    options.displayCount,
    scoring.candidates.length
  );
  const shown = scoring.candidates.slice(0, displayCount);
  const parts: string[] = [
    buildPitchOpener(message, intent, displayCount, scoring.cautions),
  ];

  // Always include per-car sales explanations for displayed cars.
  const pitchLines = buildAllScoredPitchLines(message, intent, scoring);
  for (let i = 0; i < displayCount; i++) {
    parts.push(pitchLines[i]!);
  }

  const compare = buildCompareSummary(intent, shown);
  if (compare) parts.push(compare);

  const budgetCaution = (scoring.cautions ?? []).find((c) =>
    /ยังไม่มีรถในงบ/.test(c)
  );
  if (budgetCaution && !parts.includes(budgetCaution)) {
    parts.push(budgetCaution);
  }

  parts.push(options.ctaLine);

  // Concise safety note last — must not replace per-car explanations above.
  parts.push(
    "หมายเหตุสั้น ๆ: ควรตรวจสภาพจริง เอกสาร และทดลองขับก่อนตัดสินใจครับ — น้องเอสรุปจากข้อมูลประกาศเท่านั้น"
  );

  const text = parts.join("\n\n");
  assertBuyerPitchSafe(text);
  assertNoHallucinatedVehicleClaim(text);
  return text;
}
