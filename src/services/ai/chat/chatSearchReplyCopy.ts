/** ข้อความนำผลค้นหา Marketplace — โทนเซลส์มืออาชีพ อบอุ่น น่าเชื่อถือ ข้อมูลจริง 100% */

import type { ChatCarCardData } from "../../../types";
import { detectBuyerRefinement } from "./chatPilotBuyerFollowUp";
import {
  buildRefinementFollowUpReplyCopy,
  buildRefinementNoContextCopy,
} from "./chatRefinementReplyCopy";
import {
  resolveChatListingTransmission,
  type ChatCarSummary,
  type ChatSearchCriteria,
} from "./marketplaceChatSearch";
import {
  appendOptionalSalesToneAccent,
  buildSelectedCarOpening,
  buildStableSeed,
  maybeOptionalSalesToneAccent,
  pickStableVariant,
} from "./thaiSalesCopyVariation";
import {
  assertNoHallucinatedVehicleClaim,
  buildGeneralModelContextBlock,
} from "./vehicleModelContext";

/**
 * v22.60 — thin alias over shared optional sales-tone accent.
 * Kept for existing source guards (v22.21/v22.22/v22.25).
 */
function maybeOptionalInventoryCheer(seed: string): string {
  return maybeOptionalSalesToneAccent(seed, "exact_found");
}

export interface CarHighlightFacts {
  id: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  bodyClassLabel: string;
}

function toHighlightFacts(c: ChatCarSummary | CarHighlightFacts): CarHighlightFacts {
  return {
    id: c.id,
    brand: c.brand,
    model: c.model,
    year: c.year,
    price: c.price,
    mileage: "mileage" in c ? c.mileage : 0,
    bodyClassLabel: c.bodyClassLabel,
  };
}

function formatPrice(n: number): string {
  return n.toLocaleString("th-TH");
}

function budgetPhrase(criteria: ChatSearchCriteria): string {
  return criteria.maxPrice != null
    ? `งบไม่เกิน ${formatPrice(criteria.maxPrice)} บาท`
    : "";
}

/**
 * Soft conversion CTA — viewing / test drive / seller follow-up invite.
 * Does not create a lead, does not ask for phone aggressively, no UI button instructions.
 */
function inventorySoftFollowUp(count: number, seed = "search"): string {
  if (count <= 0) return "";
  if (count === 1) {
    return pickStableVariant(seed, "search.soft.single", [
      "ถ้าสนใจคันนี้ น้องเอช่วยประสานนัดดูรถ ทดลองขับ หรือคุยเรื่องไฟแนนซ์เบื้องต้นกับผู้ขายให้ต่อได้ครับ",
      "อยากให้น้องเอช่วยสรุปจุดเด่นสั้น ๆ หรือนัดดูรถจริงไหมครับ — บอกได้เลย",
      "ถ้าถูกใจ น้องเอช่วยต่อให้ถึงขั้นนัดชมรถหรือทดลองขับได้ครับ โดยไม่ต้องรีบตัดสินใจ",
    ]);
  }
  if (count <= 3) {
    return pickStableVariant(seed, "search.soft.multi", [
      "ถ้าสนใจคันไหนเป็นพิเศษ น้องเอช่วยเทียบให้ชัด หรือประสานนัดดูรถ/ทดลองขับกับผู้ขายให้ต่อได้ครับ",
      "อยากให้น้องเอช่วยคัดคันที่คุ้มสุด ไมล์น้อยสุด หรือเหมาะครอบครัว แล้วต่อนัดชมรถไหมครับ",
      "ถ้าบอกโจทย์เพิ่ม เช่น คุมงบ / ไมล์น้อย / ใช้งานเมือง น้องเอช่วยคัดแล้วประสานติดต่อกลับอย่างสุภาพให้ได้ครับ",
    ]);
  }
  return pickStableVariant(seed, "search.soft.more", [
    "น้องเอคัดมาให้ดูก่อนชุดแรกครับ ถ้าสนใจคันไหน บอกได้เลย เดี๋ยวช่วยประสานนัดดูรถหรือทดลองขับต่อ",
    "ถ้าอยากดูชุดถัดไป หรืออยากให้น้องเอคัดตามงบ/ไมล์แล้วช่วยนัดชมรถ บอกได้เลยครับ",
  ]);
}

/** วิเคราะห์จุดเด่นจากราคา / ไมล์ / ปี — ไม่แต่งข้อมูลนอก field */
export function buildListingComparisonInsight(
  cars: Array<ChatCarSummary | CarHighlightFacts>
): string {
  if (cars.length < 2) return "";

  const facts = cars.map(toHighlightFacts);

  const modelKey = (c: CarHighlightFacts) =>
    `${c.brand}|${c.model}`.toLowerCase();
  const groups = new Map<string, CarHighlightFacts[]>();
  for (const c of facts) {
    const k = modelKey(c);
    groups.set(k, [...(groups.get(k) ?? []), c]);
  }

  const sameModelGroup = [...groups.values()].find((g) => g.length >= 2);
  const pool = sameModelGroup ?? facts;

  const sortedByPrice = [...pool].sort((a, b) => a.price - b.price);
  const cheapest = sortedByPrice[0];
  const withMileage = pool.filter((c) => c.mileage > 0);
  const lowestMileage =
    withMileage.length >= 2
      ? [...withMileage].sort((a, b) => a.mileage - b.mileage)[0]
      : null;

  const parts: string[] = [];

  if (sameModelGroup && sameModelGroup.length >= 2) {
    const label = safeBodyClass(sameModelGroup[0].bodyClassLabel);
    parts.push(
      `จุดน่าสนใจคือทั้ง ${sameModelGroup.length} คันเป็น ${label} รุ่นเดียวกัน แต่ราคาและเลขไมล์ต่างกัน`
    );

    // v22.58 — explicit buyer-oriented deltas for a two-car same-model pair
    if (sameModelGroup.length === 2) {
      const [a, b] = sameModelGroup;
      const priceDiff = Math.abs(a.price - b.price);
      const yearDiff = Math.abs(a.year - b.year);
      const mileageDiff =
        a.mileage > 0 && b.mileage > 0 ? Math.abs(a.mileage - b.mileage) : 0;
      const cheaper = a.price <= b.price ? a : b;
      const newer = a.year >= b.year ? a : b;
      const lowerMiles =
        a.mileage > 0 && b.mileage > 0
          ? a.mileage <= b.mileage
            ? a
            : b
          : null;
      if (priceDiff > 0) {
        parts.push(
          `${carLabel(cheaper)} ถูกกว่าประมาณ ${formatPrice(priceDiff)} บาท — เหมาะถ้าโฟกัสงบซื้อ`
        );
      }
      if (yearDiff > 0) {
        parts.push(
          `${carLabel(newer)} ใหม่กว่า ${yearDiff} ปีรุ่น — เหมาะถ้าอยากได้ปีใหม่กว่า`
        );
      }
      if (lowerMiles && mileageDiff > 0) {
        parts.push(
          `${carLabel(lowerMiles)} ไมล์น้อยกว่าประมาณ ${formatPrice(mileageDiff)} กม. — เหมาะถ้าโฟกัสเลขไมล์`
        );
      }
      parts.push(
        "ยังไม่ฟันธงว่าคันไหนดีกว่าโดยไม่มีลำดับความสำคัญของลูกค้าและการตรวจสภาพจริงครับ"
      );
    } else {
      for (const c of sameModelGroup) {
        const traits: string[] = [];
        if (c.id === cheapest.id && sameModelGroup.length > 1) {
          traits.push("เด่นเรื่องงบ");
        }
        if (
          lowestMileage &&
          c.id === lowestMileage.id &&
          sameModelGroup.some((o) => o.mileage > 0 && o.mileage !== c.mileage)
        ) {
          traits.push("เด่นเรื่องเลขไมล์น้อยกว่า");
        } else if (
          c.id !== cheapest.id &&
          c.price > cheapest.price &&
          sameModelGroup.length === 2
        ) {
          traits.push("ยังอยู่ในงบสบาย ๆ");
        }
        if (traits.length > 0) {
          const mileage =
            c.mileage > 0 ? ` ไมล์ ${formatPrice(c.mileage)} กม.` : "";
          parts.push(
            `คันราคา ${formatPrice(c.price)} บาท${mileage} ${traits.join(" ")}`
          );
        }
      }
    }
  } else {
    if (cheapest) {
      const mileage =
        cheapest.mileage > 0
          ? ` ไมล์ ${formatPrice(cheapest.mileage)} กม.`
          : "";
      parts.push(
        `${carLabel(cheapest)} ราคา ${formatPrice(cheapest.price)} บาท${mileage} เด่นเรื่องงบ`
      );
    }
    if (
      lowestMileage &&
      lowestMileage.id !== cheapest.id &&
      lowestMileage.mileage > 0
    ) {
      parts.push(
        `${carLabel(lowestMileage)} ไมล์ ${formatPrice(lowestMileage.mileage)} กม. เด่นเรื่องเลขไมล์น้อยกว่า`
      );
    }
    const newest = [...pool].sort((a, b) => b.year - a.year)[0];
    const oldest = [...pool].sort((a, b) => a.year - b.year)[0];
    if (newest.year !== oldest.year && pool.length >= 2) {
      parts.push(
        `ถ้าอยากได้ปีใหม่กว่า ลองดู ${carLabel(newest)} ถ้าโฟกัสงบ ${carLabel(cheapest)} น่าจะตอบโจทย์ครับ`
      );
    }
  }

  return parts.join(" ");
}

function carLabel(c: CarHighlightFacts): string {
  return `${c.brand} ${c.model} ปี ${c.year}`;
}

function safeBodyClass(label: string): string {
  return label === "ไม่ระบุประเภทตัวถัง" ? "รถ" : label;
}

function summarizeOneLine(c: ChatCarSummary): string {
  const mileage =
    c.mileage > 0 ? ` ไมล์ ${formatPrice(c.mileage)} กม.` : "";
  const color = c.color ? ` สี${c.color}` : "";
  const body = safeBodyClass(c.bodyClassLabel);
  return `${carLabel(c)} ราคา ${formatPrice(c.price)} บาท${mileage}${color} (${body})`;
}

/** Buyer-facing usage angle from safe body-class only — no invented history. */
function buildUsageSuitability(c: ChatCarSummary): string {
  const body = safeBodyClass(c.bodyClassLabel);
  if (body.includes("SUV") || body.includes("Crossover")) {
    return `คันนี้เป็น ${body} — เหมาะกับครอบครัวที่อยากได้นั่งสบาย พื้นที่เยอะ และภาพลักษณ์ดี`;
  }
  if (body.includes("MPV")) {
    return `คันนี้เป็น ${body} / รถครอบครัว — เหมาะกับคนที่ต้องการที่นั่งเยอะและการใช้งานอเนกประสงค์`;
  }
  if (body.includes("Sedan") || body.includes("ซีดาน")) {
    return `คันนี้เป็นซีดานนั่งสบาย — เหมาะกับใช้งานเมือง คนทำงาน หรือครอบครัวเล็กที่เน้นความสุภาพ`;
  }
  if (body.includes("Hatchback")) {
    return `คันนี้เป็น ${body} กะทัดรัด — เหมาะกับขับในเมืองและใช้งานประจำวัน`;
  }
  if (body.includes("Pickup") || body.includes("กระบะ")) {
    return `คันนี้เป็น ${body} — เหมาะกับการบรรทุกและใช้งานหนัก`;
  }
  return `คันนี้เป็นตัวเลือกที่น่าสนใจจากข้อมูลในตลาดตอนนี้`;
}

/** Compact selling-point line from safe public fields only. */
function buildSafeSellingPoints(c: ChatCarSummary): string {
  const parts: string[] = [];
  if (c.price > 0) parts.push(`ราคา ${formatPrice(c.price)} บาท`);
  if (c.mileage > 0) parts.push(`ไมล์ ${formatPrice(c.mileage)} กม.`);
  if (c.year > 0) parts.push(`ปี ${c.year}`);
  if (c.color) parts.push(`สี${c.color}`);
  const gear = resolveChatListingTransmission(c)?.trim() ?? "";
  if (gear && gear.length <= 24) {
    parts.push(gear.startsWith("เกียร์") ? gear : `เกียร์${gear}`);
  }
  const condition = (c.condition ?? "").trim();
  if (
    condition &&
    condition.length <= 40 &&
    !/(ทะเบียน|VIN|vin|โทร|เบอร์|ที่อยู่|importKey|เกียร์|AT|MT|CVT)/i.test(condition)
  ) {
    parts.push(`สภาพ${condition}`);
  }
  const desc = (c.description ?? "").trim();
  if (
    desc &&
    desc.length >= 8 &&
    desc.length <= 80 &&
    !/(ทะเบียน|VIN|vin|โทร|เบอร์|ที่อยู่|importKey|ไม่เคยชน|ไม่เคยน้ำท่วม)/i.test(desc)
  ) {
    parts.push(`จุดเด่นจากประกาศ: ${desc}`);
  }
  return parts.join(" · ");
}

function buildRelativeTrait(
  c: ChatCarSummary,
  shown: ChatCarSummary[]
): string {
  if (shown.length < 2) return "";
  const cheapest = [...shown].sort((a, b) => a.price - b.price)[0];
  const withMileage = shown.filter((x) => x.mileage > 0);
  const lowestMileage =
    withMileage.length >= 2
      ? [...withMileage].sort((a, b) => a.mileage - b.mileage)[0]
      : null;
  const newest = [...shown].sort((a, b) => b.year - a.year)[0];
  const body = safeBodyClass(c.bodyClassLabel);

  if (c.id === cheapest.id) return "มุมคุ้มค่า / คุมงบได้ดีในชุดนี้";
  if (lowestMileage && c.id === lowestMileage.id) {
    return "มุมไมล์น้อยกว่าในชุดนี้ — น่าดูถ้าเน้นความสดของรถ";
  }
  if (
    newest &&
    c.id === newest.id &&
    shown.some((o) => o.year !== c.year)
  ) {
    return "มุมปีใหม่กว่าในชุดนี้";
  }
  if (body.includes("SUV") || body.includes("MPV") || body.includes("Crossover")) {
    return "มุมครอบครัว / พื้นที่ใช้สอย";
  }
  if (body.includes("Sedan") || body.includes("ซีดาน")) {
    return "มุมนั่งสบาย / ใช้งานเมือง";
  }
  return "อีกตัวเลือกที่เทียบกันได้จากราคาและไมล์";
}

function buildBuyerCompareGuide(
  shown: ChatCarSummary[],
  criteria?: ChatSearchCriteria
): string {
  if (shown.length < 2) return "";
  // Exact model query: compare within that model only — never pitch a different model.
  if (criteria?.model?.trim()) {
    const cheapest = [...shown].sort((a, b) => a.price - b.price)[0];
    const withMileage = shown.filter((x) => x.mileage > 0);
    const lowestMileage =
      withMileage.length >= 2
        ? [...withMileage].sort((a, b) => a.mileage - b.mileage)[0]
        : null;
    const tips: string[] = [];
    if (cheapest) {
      tips.push(`ถ้าเน้นคุ้มงบ ลองโฟกัส ${carLabel(cheapest)} ก่อน`);
    }
    if (lowestMileage && lowestMileage.id !== cheapest?.id) {
      tips.push(`ถ้าเน้นไมล์น้อย ${carLabel(lowestMileage)} น่าสนใจ`);
    }
    if (tips.length === 0) return "";
    return `ช่วยตัดสินใจสั้น ๆ: ${tips.join(" · ")} — อิงจากข้อมูลประกาศจริงเท่านั้นครับ`;
  }
  const cheapest = [...shown].sort((a, b) => a.price - b.price)[0];
  const withMileage = shown.filter((x) => x.mileage > 0);
  const lowestMileage =
    withMileage.length >= 2
      ? [...withMileage].sort((a, b) => a.mileage - b.mileage)[0]
      : null;
  const familyish = shown.find((c) =>
    /SUV|MPV|Crossover/i.test(safeBodyClass(c.bodyClassLabel))
  );
  const comfort = shown.find((c) =>
    /Sedan|ซีดาน|SUV|MPV/i.test(safeBodyClass(c.bodyClassLabel))
  );

  const tips: string[] = [];
  if (cheapest) {
    tips.push(`ถ้าเน้นคุ้มงบ ลองโฟกัส ${carLabel(cheapest)} ก่อน`);
  }
  if (lowestMileage && lowestMileage.id !== cheapest?.id) {
    tips.push(`ถ้าเน้นไมล์น้อย ${carLabel(lowestMileage)} น่าสนใจ`);
  }
  if (familyish) {
    tips.push(`ถ้าเน้นครอบครัว ${carLabel(familyish)} เข้าทางโจทย์`);
  } else if (comfort && comfort.id !== cheapest?.id) {
    tips.push(`ถ้าเน้นนั่งสบาย ${carLabel(comfort)} คุ้มพิจารณา`);
  }
  if (tips.length === 0) return "";
  return `ช่วยตัดสินใจสั้น ๆ: ${tips.join(" · ")} — อิงจากข้อมูลประกาศจริงเท่านั้นครับ`;
}

function resolveModelContextInput(
  cars: ChatCarSummary[],
  criteria?: ChatSearchCriteria
): { brand?: string; model?: string; year?: number; bodyClassLabel?: string } {
  const requestedModel = criteria?.model?.trim();
  const requestedBrand = criteria?.brand?.trim();
  if (requestedModel) {
    const match =
      cars.find(
        (c) =>
          c.model.toLowerCase().replace(/-/g, "").includes(
            requestedModel.toLowerCase().replace(/-/g, "")
          ) &&
          (!requestedBrand ||
            c.brand.toLowerCase().includes(requestedBrand.toLowerCase()))
      ) ?? cars[0];
    return {
      brand: requestedBrand || match?.brand,
      model: requestedModel,
      year: criteria?.year ?? match?.year,
      bodyClassLabel: match?.bodyClassLabel,
    };
  }
  const c = cars[0];
  if (!c) return {};
  return {
    brand: c.brand,
    model: c.model,
    year: c.year,
    bodyClassLabel: c.bodyClassLabel,
  };
}

function buildSingleCarNarrative(
  c: ChatCarSummary,
  criteria?: ChatSearchCriteria
): string {
  const exactModelYear =
    Boolean(criteria?.model?.trim()) && criteria?.year != null;
  const body = safeBodyClass(c.bodyClassLabel);

  // v22.57 — salesperson tone: weave facts into buyer value, one next step,
  // avoid rigid field dumps / repeated disclaimer blocks on exact matches.
  // v22.63 — clearer suitability (no รถสุภาพ); one CTA only; opener already
  // carries listing facts so skip redundant summary + second soft follow-up.
  if (exactModelYear) {
    const appealParts: string[] = [];
    if (/Sedan|ซีดาน/i.test(body)) {
      appealParts.push(
        "คันนี้เป็นซีดานที่เหมาะกับการขับใช้งานประจำวัน เดินทางในเมือง หรือใช้กับครอบครัวขนาดเล็ก"
      );
    } else if (/SUV|Crossover|MPV/i.test(body)) {
      appealParts.push(
        `คันนี้เป็น${body} ที่ช่วยเรื่องพื้นที่ใช้สอย — น่าสนใจถ้าเน้นครอบครัวหรือนั่งหลายคน`
      );
    } else if (body) {
      appealParts.push(`คันนี้เป็น${body} ที่ตรงรุ่นและปีที่ถาม`);
    }
    if (c.mileage > 0) {
      appealParts.push(
        "จุดที่ควรพิจารณาคือราคา ปีรถ และเลขไมล์ควบคู่กับประวัติการดูแลและสภาพจริงตอนดูรถ — ยังไม่ฟันธงสภาพจากตัวเลขอย่างเดียวครับ"
      );
    } else if (c.price > 0 && c.price < 500_000) {
      appealParts.push("ช่วงราคานี้ช่วยตั้งกรอบงบได้ชัดจากข้อมูลประกาศ");
    } else if (c.price > 0) {
      appealParts.push("ราคาตามประกาศช่วยตั้งกรอบตัดสินใจได้ทันที");
    }

    const text = [
      appealParts.join(" "),
      "ถ้าสนใจ น้องเอช่วยเทียบความเหมาะสมกับรูปแบบการใช้งาน หรือนัดดูรถและทดลองขับกับผู้ขายให้ต่อได้ครับ",
    ]
      .filter(Boolean)
      .join("\n");
    assertNoHallucinatedVehicleClaim(text);
    return text;
  }

  const facts = buildSafeSellingPoints(c);
  const usage = buildUsageSuitability(c);
  const modelCtx = buildGeneralModelContextBlock(
    resolveModelContextInput([c], criteria)
  );
  const cardNote =
    "น้องเอแนบการ์ดรถไว้ให้แล้ว พร้อมราคา ไมล์ รูป และจุดเด่นจากประกาศ — ดูประกอบการตัดสินใจได้เลยครับ";
  const text = [usage, facts ? `จากข้อมูลประกาศ — ${facts}` : "", modelCtx, cardNote]
    .filter(Boolean)
    .join("\n");
  assertNoHallucinatedVehicleClaim(text);
  return text;
}

function buildMultiCarNarratives(
  cars: ChatCarSummary[],
  criteria?: ChatSearchCriteria
): string {
  const shown = cars.slice(0, 3);
  const lines = shown.map((c, i) => {
    const oneLine = summarizeOneLine(c);
    const trait = buildRelativeTrait(c, shown);
    return `${i + 1}. ${oneLine}${trait ? ` — ${trait}` : ""}`;
  });
  const modelCtx = buildGeneralModelContextBlock(
    resolveModelContextInput(cars, criteria)
  );
  const compareGuide = buildBuyerCompareGuide(shown, criteria);
  const compareHelp = criteria?.model?.trim()
    ? "น้องเอช่วยเทียบต่อได้ว่าแต่ละคันต่างกันที่ราคา ไมล์ สี และจุดเด่นอะไรบ้างครับ"
    : "น้องเอช่วยเทียบต่อได้ว่าแต่ละคันต่างกันที่ราคา ไมล์ สี และจุดเด่นอะไรบ้าง ถ้าคุณเน้นคุ้มสุด ไมล์น้อยสุด ครอบครัว หรือนั่งสบาย บอกได้เลยครับ";
  const text = [modelCtx, lines.join("\n"), compareGuide, compareHelp]
    .filter(Boolean)
    .join("\n\n");
  assertNoHallucinatedVehicleClaim(text);
  return text;
}

/** @deprecated kept for callers/tests that expect role bullets — delegates to multi narrative */
function buildCarRolesSummary(shownCars: ChatCarSummary[]): string {
  if (shownCars.length === 0) return "";
  return buildMultiCarNarratives(shownCars);
}

function buildExactMatchDirectLine(c: ChatCarSummary): string {
  const mileage =
    c.mileage > 0 ? ` ไมล์ตามประกาศ ${formatPrice(c.mileage)} กม.` : "";
  const showroom = c.showroomName ? ` ของ ${c.showroomName}` : "";
  return `มีครับ — เจอ ${c.brand} ${c.model} ปี ${c.year}${showroom} ราคา ${formatPrice(c.price)} บาท${mileage} ตรงที่ถาม 1 คันในตลาดตอนนี้ครับ`;
}

function buildFoundIntro(
  cars: ChatCarSummary[],
  criteria: ChatSearchCriteria,
  opts?: { bodyTypeHint?: string }
): string {
  const budget = budgetPhrase(criteria);
  const seed = buildStableSeed([
    cars[0]?.id,
    criteria.brand,
    criteria.model,
    criteria.maxPrice,
  ]);
  const label =
    criteria.brand || criteria.model
      ? [criteria.brand, criteria.model, criteria.year != null ? `ปี ${criteria.year}` : null]
          .filter(Boolean)
          .join(" ")
      : carLabel(cars[0]);
  const budgetPart = budget ? ` ใน${budget}` : "";
  const exactModelYear =
    Boolean(criteria.model?.trim()) && criteria.year != null;

  if (cars.length === 1) {
    const opener = exactModelYear
      ? buildExactMatchDirectLine(cars[0])
      : pickStableVariant(seed, "search.natural.single", [
          `มีครับ เจอ ${carLabel(cars[0])} อยู่ 1 คันในตลาดตอนนี้ครับ`,
          `มีครับ เจอ ${carLabel(cars[0])} ในตลาดตอนนี้ 1 คันครับ`,
          `มีครับ — ${carLabel(cars[0])} ตอนนี้มี 1 คันในตลาดครับ`,
        ]);
    // v22.60 — optional accent near end only (never opener / never every answer)
    // v22.63 — exact model+year narrative already ends with one CTA; do not
    // append inventorySoftFollowUp (that caused duplicate ถ้าสนใจ invitations).
    const narrative = buildSingleCarNarrative(cars[0], criteria);
    const parts = exactModelYear
      ? [opener, narrative]
      : [opener, narrative, inventorySoftFollowUp(1, seed)];
    const text = appendOptionalSalesToneAccent(
      parts.filter(Boolean).join("\n\n"),
      seed,
      "exact_found"
    );
    assertNoHallucinatedVehicleClaim(text);
    return text;
  }

  const typeHint =
    opts?.bodyTypeHint ??
    (criteria.suvOnly ? "SUV/Crossover" : label || "รุ่นที่ถาม");
  const opener = exactModelYear
    ? `มีครับ เจอ ${label} ตรงตามที่ถาม ${cars.length} คันในตลาดตอนนี้ครับ`
    : pickStableVariant(seed, "search.natural.multi", [
        `มีครับ เจอ ${typeHint}${budgetPart} อยู่ ${cars.length} คันในตลาดตอนนี้ครับ`,
        `มีครับ ตอนนี้มี ${typeHint}${budgetPart} ให้ดู ${cars.length} คันครับ`,
        `มีครับ เจอ ${cars.length} คันสำหรับ ${typeHint}${budgetPart} ในตลาดตอนนี้ครับ`,
      ]);
  const text = appendOptionalSalesToneAccent(
    [
      opener,
      buildMultiCarNarratives(cars, criteria),
      inventorySoftFollowUp(cars.length, seed),
    ]
      .filter(Boolean)
      .join("\n\n"),
    seed,
    "exact_found"
  );
  assertNoHallucinatedVehicleClaim(text);
  return text;
}

function buildNearbyModelYearAlternativeIntro(
  alternatives: ChatCarSummary[],
  criteria: ChatSearchCriteria
): string {
  const label = [
    criteria.brand,
    criteria.model,
    criteria.year != null ? `ปี ${criteria.year}` : null,
  ]
    .filter(Boolean)
    .join(" ");
  const seed = buildStableSeed([label, "nearby-year", alternatives[0]?.id]);
  const lines = alternatives.slice(0, 3).map((c, i) => summarizeOneLine(c));
  const modelCtx = buildGeneralModelContextBlock(
    resolveModelContextInput(alternatives, criteria)
  );
  return [
    `ตอนนี้ยังไม่เจอ ${label} ตรงปีที่ถามในตลาดครับ`,
    `แต่มีรุ่นเดียวกันปีใกล้เคียงให้พิจารณา ${alternatives.length} คัน — เป็นทางเลือกใกล้เคียง ไม่ใช่ปีที่ถามตรง ๆ นะครับ`,
    modelCtx,
    lines.join("\n"),
    inventorySoftFollowUp(alternatives.length, seed),
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildAlternativeIntro(
  alternatives: ChatCarSummary[],
  criteria: ChatSearchCriteria
): string {
  if (criteria.model?.trim() && criteria.year != null) {
    return buildNearbyModelYearAlternativeIntro(alternatives, criteria);
  }
  const budget = budgetPhrase(criteria);
  const seed = buildStableSeed([
    alternatives[0]?.id,
    criteria.brand,
    criteria.maxPrice,
    "alt",
  ]);

  const altOpeners = [
    `ยังไม่เจอ SUV แท้${budget ? ` ใน${budget}` : ""} ในตลาด Nong A ตอนนี้ครับ`,
    `ตอนนี้ SUV แท้${budget ? ` ใน${budget}` : ""} ยังไม่มีในระบบครับ`,
    `ค้นดูแล้วยังไม่พบ SUV แท้ที่ตรงกับ${budget ? ` ${budget}` : "เงื่อนไข"}ครับ`,
  ];

  return [
    pickStableVariant(seed, "search.alt.open", altOpeners),
    `แต่มีทางเลือกใกล้เคียงที่ยังอยู่ในงบให้พิจารณา ${alternatives.length} คัน — น้องเอแยกไว้ให้ชัดว่าเป็นทางเลือกแทน ไม่ใช่ SUV แท้นะครับ`,
    inventorySoftFollowUp(alternatives.length, seed),
  ].join("\n\n");
}

function buildEmptyIntro(criteria: ChatSearchCriteria): string {
  const budget = budgetPhrase(criteria);
  const cond = [
    criteria.suvOnly ? "SUV/MPV" : null,
    criteria.brand,
    criteria.model,
    budget,
  ]
    .filter(Boolean)
    .join(" ");
  const seed = buildStableSeed([cond, "empty"]);

  return pickStableVariant(seed, "search.empty", [
    `ตอนนี้ยังไม่เจอรุ่นนี้ในตลาดครับ ถ้ารับรุ่นใกล้เคียงได้ น้องเอช่วยหาแบรนด์ใกล้เคียง ปีใกล้กัน หรืองบใกล้กันให้ได้ครับ`,
    `ยังไม่เจอ${cond ? ` ${cond}` : " ตามที่ถาม"} ในตลาดตอนนี้ครับ ถ้ารับรุ่นใกล้เคียง น้องเอช่วยหาปีใกล้กันหรืองบใกล้กันให้ได้ครับ`,
    `ตอนนี้ยังไม่มีคันที่ตรงเป๊ะครับ แต่บอกงบหรือแนวรถที่รับได้ได้เลย น้องเอช่วยหาทางเลือกใกล้เคียงให้ครับ`,
  ]);
}

function buildNotFoundIntro(criteria: ChatSearchCriteria): string {
  const label = [
    criteria.brand,
    criteria.model,
    criteria.year != null ? `ปี ${criteria.year}` : null,
    budgetPhrase(criteria),
  ]
    .filter(Boolean)
    .join(" ");
  const seed = buildStableSeed([label, "notfound"]);

  return pickStableVariant(seed, "search.notfound", [
    `ตอนนี้ยังไม่เจอรุ่นนี้ในตลาดครับ ถ้ารับรุ่นใกล้เคียงได้ น้องเอช่วยหาแบรนด์ใกล้เคียง ปีใกล้กัน หรืองบใกล้กันให้ได้ครับ`,
    `ยังไม่เจอ${label ? ` ${label}` : " ตามที่ถาม"} ในตลาดตอนนี้ครับ ถ้ารับรุ่นใกล้เคียง น้องเอช่วยหาปีใกล้กันหรืองบใกล้กันให้ได้ครับ`,
    `ตอนนี้ยังไม่มีคันที่ตรงเป๊ะครับ แต่บอกงบหรือแนวรถที่รับได้ได้เลย น้องเอช่วยหาทางเลือกใกล้เคียงให้ครับ`,
  ]);
}

export function buildMarketplaceSearchIntroCopy(
  result: {
    criteria: ChatSearchCriteria;
    primary: ChatCarSummary[];
    alternatives: ChatCarSummary[];
  }
): string {
  const { criteria, primary, alternatives } = result;

  if (criteria.suvOnly) {
    if (primary.length > 0) {
      return buildFoundIntro(primary, criteria, { bodyTypeHint: "SUV/Crossover" });
    }
    if (alternatives.length > 0) {
      return buildAlternativeIntro(alternatives, criteria);
    }
    return buildEmptyIntro(criteria);
  }

  if (primary.length === 0) {
    if (alternatives.length > 0) {
      return buildAlternativeIntro(alternatives, criteria);
    }
    return buildNotFoundIntro(criteria);
  }

  return buildFoundIntro(primary, criteria);
}

export function buildCompareReplyCopy(cars: ChatCarCardData[]): string {
  const uniqueIds = [
    ...new Set(cars.map((c) => String(c.id ?? "").trim()).filter(Boolean)),
  ];
  if (cars.length < 2 || uniqueIds.length < 2) {
    return "เทียบคันเดิมกับตัวเองไม่ได้ครับ อยากให้เทียบกับรุ่นหรือปีไหนเป็นพิเศษ บอกน้องเอได้เลยครับ";
  }

  const highlights: CarHighlightFacts[] = cars.map((c) => ({
    id: c.id,
    brand: c.brand,
    model: c.model,
    year: c.year,
    price: c.price,
    mileage: c.mileage,
    bodyClassLabel: c.bodyClassLabel,
  }));

  const insight = buildListingComparisonInsight(highlights);
  const seed = buildStableSeed([
    cars[0]?.id,
    cars[1]?.id,
    "compare",
    cars.length,
  ]);

  const lines = cars.map((c, i) => {
    const mileage = c.mileage > 0 ? ` ไมล์ ${formatPrice(c.mileage)} กม.` : "";
    return `${i + 1}. ${c.brand} ${c.model} ปี ${c.year} — ราคา ${formatPrice(c.price)} บาท${mileage} (${c.bodyClassLabel})`;
  });

  // v22.60 — optional end accent on clear two-car choice moments only
  return appendOptionalSalesToneAccent(
    [
      `เปรียบเทียบ ${cars.length} คันจากข้อมูลจริงในระบบครับ:`,
      lines.join("\n"),
      insight ? `\n${insight}` : "",
      `\n${inventorySoftFollowUp(cars.length, cars[0]?.id ?? "compare")}`,
    ]
      .filter(Boolean)
      .join("\n"),
    seed,
    "clear_compare"
  );
}

export function buildSelectedCarReplyCopy(car: ChatCarCardData): string {
  const mileage = car.mileage > 0 ? ` ไมล์ ${formatPrice(car.mileage)} กม.` : "";
  const color = car.color ? ` สี${car.color}` : "";

  const traits = [];
  if (car.price < 500000) traits.push("คุมงบได้ดี");
  if (car.mileage > 0 && car.mileage < 50000) traits.push("เลขไมล์ไม่สูง (ตามที่ระบุในระบบ)");
  if (car.year >= new Date().getFullYear() - 3) traits.push("ปีค่อนข้างใหม่ (ตามที่ระบุในระบบ)");
  if (car.bodyClassLabel.includes("MPV") || car.bodyClassLabel.includes("SUV")) {
    traits.push("เหมาะกับการใช้งานครอบครัว (จากประเภทรถในระบบ)");
  }

  const traitText =
    traits.length > 0
      ? `ถ้ามองในมุมใช้งานจริง จุดที่น่าสนใจคือ ${traits.join(" และ")}`
      : "";

  return [
    buildSelectedCarOpening(car),
    `ราคา ${formatPrice(car.price)} บาท${mileage}${color} (${car.bodyClassLabel})`,
    traitText,
    `ถ้าสนใจคันนี้ น้องเอช่วยประสานนัดดูรถ ทดลองขับ หรือคุยไฟแนนซ์เบื้องต้นกับผู้ขายให้ต่อได้ครับ`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
export function buildFollowUpReplyCopy(
  cars: ChatCarCardData[],
  userMessage: string
): string {
  const refinement = detectBuyerRefinement(userMessage);
  if (refinement) {
    if (cars.length === 0) {
      return buildRefinementNoContextCopy(refinement);
    }
    return buildRefinementFollowUpReplyCopy(refinement, cars);
  }

  if (cars.length === 0) {
    return (
      "น้องเอยังไม่มีรถจากการค้นหาล่าสุดในบทสนทนานี้ครับ\n\n" +
      "ลองถามหารถในตลาดก่อน เช่น \"มี SUV ไม่เกิน 700,000\" แล้วค่อยถามต่อว่า \"คันนี้ดีไหม\" ได้เลยครับ"
    );
  }

  const c = cars[0];
  const altNote =
    c.matchKind === "alternative"
      ? "\n\nหมายเหตุ: คันนี้เป็นทางเลือกใกล้เคียง ไม่ใช่ SUV แท้ตามที่ถามก่อนหน้า"
      : "";

  return [
    `จากข้อมูลที่มี ${c.brand} ${c.model} ปี ${c.year} ตอนนี้:`,
    inventorySoftFollowUp(1, c.id),
    altNote,
  ]
    .filter(Boolean)
    .join("\n\n")
    .replace(/\n\n\n/g, "\n\n");
}
