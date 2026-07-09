/** ข้อความนำผลค้นหา Marketplace — โทนเป็นมิตร ข้อมูลจริง 100% */

import type { ChatCarCardData } from "../../../types";
import { detectBuyerRefinement } from "./chatPilotBuyerFollowUp";
import {
  buildRefinementFollowUpReplyCopy,
  buildRefinementNoContextCopy,
} from "./chatRefinementReplyCopy";
import type { ChatCarSummary, ChatSearchCriteria } from "./marketplaceChatSearch";
import {
  buildSelectedCarOpening,
  buildStableSeed,
  pickStableVariant,
} from "./thaiSalesCopyVariation";

/** Optional tone accent — sparingly, never a default inventory suffix. */
function maybeOptionalInventoryCheer(seed: string): string {
  const roll = pickStableVariant(seed, "search.cheer", [
    "no",
    "no",
    "no",
    "no",
    "yes",
  ] as const);
  return roll === "yes" ? " ปังปุริเย่!" : "";
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

/** Soft follow-up after inventory cards — buyer-focused, not UI instruction. */
function inventorySoftFollowUp(count: number, seed = "search"): string {
  if (count <= 0) return "";
  if (count === 1) {
    return pickStableVariant(seed, "search.soft.single", [
      "ถ้าสนใจ น้องเอช่วยสรุปราคา ไมล์ จุดเด่น และความเหมาะกับการใช้งานให้ต่อได้ครับ",
      "ถ้าอยากให้ช่วยไล่จุดเด่นหรือเทียบกับรุ่นใกล้เคียง บอกน้องเอได้เลยครับ",
      "สนใจคันนี้ไหมครับ ถ้าอยากให้น้องเอสรุปสั้น ๆ จากข้อมูลประกาศจริง บอกได้เลย",
    ]);
  }
  if (count <= 3) {
    return pickStableVariant(seed, "search.soft.multi", [
      "ถ้าต้องการคันที่คุ้มสุด ไมล์น้อยสุด หรือราคาดีสุด น้องเอช่วยคัดให้ได้ครับ",
      "อยากให้น้องเอช่วยเทียบสั้น ๆ ตามงบหรือการใช้งานไหมครับ",
      "ถ้าบอกโจทย์เพิ่ม เช่น คุมงบ / ไมล์น้อย / ใช้งานเมือง น้องเอช่วยคัดให้ต่อได้ครับ",
    ]);
  }
  return pickStableVariant(seed, "search.soft.more", [
    "น้องเอคัดมาให้ดูก่อนชุดแรกครับ ถ้ายังไม่ตรงใจ บอกโจทย์เพิ่มได้ เดี๋ยวช่วยคัดต่อ",
    "ถ้าอยากดูชุดถัดไปหรืออยากให้น้องเอคัดตามงบ/ไมล์ บอกได้เลยครับ",
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
    return `คันนี้เป็น ${body} ใช้งานครอบครัวได้ดี เหมาะกับคนที่อยากได้รถนั่งสบาย พื้นที่เยอะ และภาพลักษณ์ดี`;
  }
  if (body.includes("MPV")) {
    return `คันนี้เป็น ${body} / รถครอบครัว เหมาะกับคนที่ต้องการที่นั่งเยอะและการใช้งานอเนกประสงค์`;
  }
  if (body.includes("Sedan") || body.includes("ซีดาน")) {
    return `คันนี้เป็นซีดานขับสบาย นั่งหลังสบาย ภาพลักษณ์ดี และดูเป็นผู้ใหญ่กว่ารถเล็กทั่วไป`;
  }
  if (body.includes("Hatchback")) {
    return `คันนี้เป็น ${body} กะทัดรัด เหมาะกับขับในเมืองและใช้งานประจำวัน`;
  }
  if (body.includes("Pickup") || body.includes("กระบะ")) {
    return `คันนี้เป็น ${body} เหมาะกับการบรรทุกและใช้งานหนัก`;
  }
  return `คันนี้เป็นตัวเลือกที่น่าดูต่อจากข้อมูลในตลาดตอนนี้`;
}

/** Compact selling-point line from safe public fields only. */
function buildSafeSellingPoints(c: ChatCarSummary): string {
  const parts: string[] = [];
  if (c.price > 0) parts.push(`ราคา ${formatPrice(c.price)} บาท`);
  if (c.mileage > 0) parts.push(`ไมล์ ${formatPrice(c.mileage)} กม.`);
  if (c.color) parts.push(`สี${c.color}`);
  const gear = (c.transmission ?? "").trim();
  if (gear && gear.length <= 24) parts.push(`เกียร์${gear}`);
  const condition = (c.condition ?? "").trim();
  if (
    condition &&
    condition.length <= 40 &&
    !/(ทะเบียน|VIN|vin|โทร|เบอร์|ที่อยู่|importKey)/i.test(condition)
  ) {
    parts.push(`สภาพ${condition}`);
  }
  return parts.join(" ");
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
  if (c.id === cheapest.id) return "จุดเด่นคือคุมงบได้ดีในชุดนี้";
  if (lowestMileage && c.id === lowestMileage.id) {
    return "จุดเด่นคือเลขไมล์น้อยกว่าในชุดนี้";
  }
  return "จุดเด่นคือเป็นอีกตัวเลือกที่เทียบกันได้จากราคาและไมล์";
}

function buildSingleCarNarrative(c: ChatCarSummary): string {
  const facts = buildSafeSellingPoints(c);
  const usage = buildUsageSuitability(c);
  const cardNote =
    "ถ้าดูจากข้อมูลในตลาด น้องเอแสดงการ์ดไว้ให้แล้ว พร้อมราคา ไมล์ รูป และจุดเด่นของรถคันนี้ครับ";
  return [usage, facts ? `จากข้อมูลที่มี — ${facts}` : "", cardNote]
    .filter(Boolean)
    .join("\n");
}

function buildMultiCarNarratives(cars: ChatCarSummary[]): string {
  const shown = cars.slice(0, 3);
  const lines = shown.map((c, i) => {
    const oneLine = summarizeOneLine(c);
    const trait = buildRelativeTrait(c, shown);
    return `${i + 1}. ${oneLine}${trait ? ` — ${trait}` : ""}`;
  });
  const modelHint =
    cars[0] != null
      ? buildUsageSuitability(cars[0]).replace(/^คันนี้/, "โดยรุ่นนี้")
      : "";
  const compareHelp =
    "จากข้อมูลที่มี น้องเอช่วยเทียบให้ต่อได้ว่าแต่ละคันต่างกันที่ราคา ไมล์ สี สภาพ และจุดเด่นอะไรบ้าง ถ้าคุณเน้นคุ้มสุด ไมล์น้อยสุด หรือใช้งานประจำวัน น้องเอช่วยคัดให้ได้ครับ";
  return [modelHint, lines.join("\n"), compareHelp].filter(Boolean).join("\n\n");
}

/** @deprecated kept for callers/tests that expect role bullets — delegates to multi narrative */
function buildCarRolesSummary(shownCars: ChatCarSummary[]): string {
  if (shownCars.length === 0) return "";
  return buildMultiCarNarratives(shownCars);
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
  const cheer = maybeOptionalInventoryCheer(seed);

  if (cars.length === 1) {
    const opener = pickStableVariant(seed, "search.natural.single", [
      `มีครับ เจอ ${carLabel(cars[0])} อยู่ 1 คันในตลาดตอนนี้ครับ`,
      `มีครับ เจอ ${carLabel(cars[0])} ในตลาดตอนนี้ 1 คันครับ`,
      `มีครับ — ${carLabel(cars[0])} ตอนนี้มี 1 คันในตลาดครับ`,
    ]);
    return [
      `${opener}${cheer}`,
      buildSingleCarNarrative(cars[0]),
      inventorySoftFollowUp(1, seed),
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  const typeHint =
    opts?.bodyTypeHint ??
    (criteria.suvOnly ? "SUV/Crossover" : label || "รุ่นที่ถาม");
  const opener = pickStableVariant(seed, "search.natural.multi", [
    `มีครับ เจอ ${typeHint}${budgetPart} อยู่ ${cars.length} คันในตลาดตอนนี้ครับ`,
    `มีครับ ตอนนี้มี ${typeHint}${budgetPart} ให้ดู ${cars.length} คันครับ`,
    `มีครับ เจอ ${cars.length} คันสำหรับ ${typeHint}${budgetPart} ในตลาดตอนนี้ครับ`,
  ]);
  return [
    `${opener}${cheer}`,
    buildMultiCarNarratives(cars),
    inventorySoftFollowUp(cars.length, seed),
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildAlternativeIntro(
  alternatives: ChatCarSummary[],
  criteria: ChatSearchCriteria
): string {
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
    return buildNotFoundIntro(criteria);
  }

  return buildFoundIntro(primary, criteria);
}

export function buildCompareReplyCopy(cars: ChatCarCardData[]): string {
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
  
  const lines = cars.map((c, i) => {
    const mileage = c.mileage > 0 ? ` ไมล์ ${formatPrice(c.mileage)} กม.` : "";
    return `${i + 1}. ${c.brand} ${c.model} ปี ${c.year} — ราคา ${formatPrice(c.price)} บาท${mileage} (${c.bodyClassLabel})`;
  });

  return [
    `เปรียบเทียบ ${cars.length} คันจากข้อมูลจริงในระบบครับ:`,
    lines.join("\n"),
    insight ? `\n${insight}` : "",
    `\n${inventorySoftFollowUp(cars.length, cars[0]?.id ?? "compare")}`,
  ].filter(Boolean).join("\n");
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
    `ถ้าอยากให้น้องเอสรุปจุดเด่นหรือเทียบกับคันอื่นจากข้อมูลประกาศจริง บอกได้เลยครับ`,
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
