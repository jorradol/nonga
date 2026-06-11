/** ข้อความนำผลค้นหา Marketplace — โทนเป็นมิตร ข้อมูลจริง 100% */

import type { ChatCarCardData } from "../../../types";
import { detectBuyerRefinement } from "./chatPilotBuyerFollowUp";
import {
  buildRefinementFollowUpReplyCopy,
  buildRefinementNoContextCopy,
} from "./chatRefinementReplyCopy";
import type { ChatCarSummary, ChatSearchCriteria } from "./marketplaceChatSearch";
import {
  buildSearchFoundOpener,
  buildSelectedCarOpening,
  buildStableSeed,
  inferThaiCopyStyle,
  pickStableVariant,
} from "./thaiSalesCopyVariation";

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

function cardCta(hasMore = false, seed = "search"): string {
  const moreCtas = [
    "ผมเลือกตัวที่น่าสนใจจากราคาและเลขไมล์มาให้ 3 คันแรกก่อน ลองดูจากการ์ดด้านล่างได้เลยครับ ถ้ายังไม่ถูกใจ กด 'ดูเพิ่ม' ได้เลยครับ",
    "น้องเอคัด 3 คันเด็ดๆ มาให้ดูก่อนครับ ถ้าอยากดูคันอื่นในชุดนี้ กด 'ดูเพิ่ม' ได้เลย",
    "จัดมาให้ชม 3 คันแรกก่อนครับ สนใจคันไหน กด 'ดูรายละเอียดในแชท' เพื่อดูข้อมูลรถเพิ่มเติมได้เลย หรือถ้าอยากดูตัวเลือกอื่น กด 'ดูเพิ่ม' ได้เลยครับ",
  ];

  const normalCtas = [
    "ลองดูการ์ดรถด้านล่างได้เลยครับ ถ้าถูกใจคันไหน กด 'ดูรายละเอียดในแชท' เพื่อดูข้อมูลรถเพิ่มเติมได้เลยครับ",
    "สนใจคันไหนเป็นพิเศษ กด 'ดูรายละเอียดในแชท' ที่การ์ดด้านล่างเพื่อดูสเปกและรูปเพิ่มได้เลยครับ",
    "เลื่อนดูการ์ดรถด้านล่างได้เลยครับ ถูกใจคันไหน กด 'ดูรายละเอียดในแชท' ดูข้อมูลเพิ่มได้ทันทีครับ",
  ];

  const slot = hasMore ? "search.cta.more" : "search.cta.normal";
  return pickStableVariant(seed, slot, hasMore ? moreCtas : normalCtas);
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

function buildCarRolesSummary(shownCars: ChatCarSummary[]): string {
  if (shownCars.length === 0) return "";
  
  const sortedByPrice = [...shownCars].sort((a, b) => a.price - b.price);
  const cheapest = sortedByPrice[0];
  
  const withMileage = shownCars.filter((c) => c.mileage > 0);
  const lowestMileage = withMileage.length > 0
    ? [...withMileage].sort((a, b) => a.mileage - b.mileage)[0]
    : null;
    
  const newest = [...shownCars].sort((a, b) => b.year - a.year)[0];
  const oldest = [...shownCars].sort((a, b) => a.year - b.year)[0];

  const bullets = shownCars.map((c) => {
    const traits: string[] = [];
    
    const isCheapest = c.id === cheapest.id && shownCars.length > 1;
    const isLowestMileage = lowestMileage && c.id === lowestMileage.id && shownCars.length > 1;
    const isNewest = c.id === newest.id && newest.year > oldest.year && shownCars.length > 1;
    
    const body = safeBodyClass(c.bodyClassLabel);
    
    if (isCheapest) {
      traits.push("เด่นเรื่องราคาเริ่มต้นต่ำ เหมาะกับคนคุมงบ");
    } else if (isLowestMileage) {
      traits.push("เด่นเรื่องเลขไมล์น้อยกว่าในชุดนี้");
    } else if (isNewest) {
      traits.push("เด่นเรื่องปีใหม่กว่า");
    }
    
    if (traits.length === 0) {
      if (body.includes("SUV") || body.includes("Crossover")) {
        traits.push(`เป็น ${body} ในงบ เหมาะกับคนอยากได้รถอเนกประสงค์`);
      } else if (body.includes("MPV")) {
        traits.push(`เป็น ${body} / รถครอบครัว เหมาะกับคนต้องการที่นั่งและการใช้งานอเนกประสงค์`);
      } else if (body.includes("Sedan")) {
        traits.push(`เป็น ${body} ขับขี่คล่องตัว เหมาะกับการใช้งานทั่วไป`);
      } else if (body.includes("Hatchback")) {
        traits.push(`เป็น ${body} กะทัดรัด เหมาะกับขับในเมือง`);
      } else if (body.includes("Pickup") || body.includes("กระบะ")) {
        traits.push(`เป็น ${body} เหมาะกับการบรรทุกและใช้งานหนัก`);
      } else {
        traits.push("เป็นอีกตัวเลือกที่น่าสนใจในงบนี้");
      }
    }
    
    return `• ${carLabel(c)} — ${traits[0]}`;
  });
  
  return bullets.join("\n");
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
  const style = inferThaiCopyStyle({
    brand: cars[0]?.brand,
    model: cars[0]?.model,
    price: cars[0]?.price,
    bodyClassLabel: cars[0]?.bodyClassLabel,
  });

  const uniqueBodyTypes = Array.from(new Set(cars.map(c => safeBodyClass(c.bodyClassLabel)))).filter(b => b !== "รถ");
  const isMultiType = uniqueBodyTypes.length > 1;

  let typeHint = opts?.bodyTypeHint;
  if (!typeHint) {
    if (criteria.suvOnly) {
      typeHint = "SUV/Crossover";
    } else if (isMultiType) {
      typeHint = "หลายแนว";
    } else if (uniqueBodyTypes.length === 1) {
      typeHint = uniqueBodyTypes[0];
    } else {
      typeHint = "รถ";
    }
  }

  const budgetPart = budget ? `ใน${budget}` : "";

  if (cars.length === 1) {
    const opener = buildSearchFoundOpener(style, seed, "single", {
      label: carLabel(cars[0]),
      budgetPart,
    });
    return `${opener}\n\nน้องเอจัดการ์ดไว้ด้านล่างให้แล้ว ถ้าสนใจ กด 'ดูรายละเอียดในแชท' เพื่อดูสเปกและรูปเพิ่มได้เลยครับ ปังปุริเย่!`;
  }

  let opener = "";
  if (isMultiType && !criteria.suvOnly) {
    opener = buildSearchFoundOpener(style, seed, "multi", {
      count: cars.length,
      budgetPart,
      typeHint: "หลายแนว",
    });
  } else {
    opener = buildSearchFoundOpener(style, seed, "multi", {
      count: cars.length,
      budgetPart,
      typeHint,
    });
  }

  const shownCount = Math.min(cars.length, 3);
  const showMoreText = cars.length > 3 ? ` ถ้ายังไม่ถูกใจ กด 'ดูเพิ่ม' เพื่อดูคันอื่นได้ครับ` : "";

  if (cars.length <= 3) {
    return `${opener}\n\nน้องเอจัดการ์ดไว้ด้านล่างให้แล้ว ถ้าสนใจคันไหน กด 'ดูรายละเอียดในแชท' เพื่อดูสเปกและรูปเพิ่มได้เลยครับ`;
  }

  return `${opener}\n\nน้องเอแสดง ${shownCount} คันแรกไว้ในการ์ดด้านล่างแล้วครับ ลองดูรูป ราคา ไมล์ และรายละเอียดจากการ์ดได้เลย${showMoreText}`;
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

  const shownCount = Math.min(alternatives.length, 3);
  const showMoreText = alternatives.length > 3 ? ` ถ้ายังไม่ถูกใจ กด 'ดูเพิ่ม' เพื่อดูคันอื่นได้ครับ` : "";

  if (alternatives.length <= 3) {
    return [
      pickStableVariant(seed, "search.alt.open", altOpeners),
      `แต่มีทางเลือกใกล้เคียงที่ยังอยู่ในงบให้พิจารณา ${alternatives.length} คัน — ผมแยกไว้ให้ชัดว่าเป็นทางเลือกแทน ไม่ใช่ SUV แท้นะครับ`,
      `\nน้องเอจัดการ์ดไว้ด้านล่างให้แล้ว ถ้าสนใจคันไหน กด 'ดูรายละเอียดในแชท' เพื่อดูสเปกและรูปเพิ่มได้เลยครับ`
    ].join("\n");
  }

  return [
    pickStableVariant(seed, "search.alt.open", altOpeners),
    `แต่มีทางเลือกใกล้เคียงที่ยังอยู่ในงบให้พิจารณา ${alternatives.length} คัน — ผมแยกไว้ให้ชัดว่าเป็นทางเลือกแทน ไม่ใช่ SUV แท้นะครับ`,
    `\nน้องเอแสดง ${shownCount} คันแรกไว้ในการ์ดด้านล่างแล้วครับ ลองดูรายละเอียดจากการ์ดได้เลย${showMoreText}`
  ].join("\n");
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

  const emptyOpeners = [
    `ตอนนี้ยังไม่เจอรถที่ตรงกับ${cond ? ` ${cond}` : " เงื่อนไขที่ถาม"} ในตลาด Nong A ครับ`,
    `ค้นดูแล้วยังไม่มีรถที่ตรงกับ${cond ? ` ${cond}` : " เงื่อนไขนี้"}ครับ`,
    `ยังไม่พบรถสเปกนี้${cond ? ` (${cond})` : ""} ในระบบตอนนี้ครับ`,
  ];
  const seed = buildStableSeed([cond, "empty"]);

  return [
    pickStableVariant(seed, "search.empty", emptyOpeners),
    `น้องเอค้นจากรายการจริงในระบบเท่านั้น — ไม่ได้แต่งรายการขึ้นมา`,
    `ลองปรับงบ ยี่ห้อ รุ่น หรือปีรถ แล้วถามใหม่ได้เลยครับ`,
  ].join("\n\n");
}

function buildNotFoundIntro(criteria: ChatSearchCriteria): string {
  const label = [criteria.brand, criteria.model, budgetPhrase(criteria)]
    .filter(Boolean)
    .join(" ");

  const notFoundOpeners = [
    `ตอนนี้ยังไม่เจอรถที่ตรงกับ "${label || "เงื่อนไขที่ถาม"}" ในตลาด Nong A ครับ`,
    `ค้นดูแล้วยังไม่มีรถ "${label || "เงื่อนไขที่ถาม"}" ในระบบครับ`,
    `ยังไม่พบรถที่ตรงกับ "${label || "เงื่อนไขที่ถาม"}" ครับ`,
  ];
  const seed = buildStableSeed([label, "notfound"]);

  return [
    pickStableVariant(seed, "search.notfound", notFoundOpeners),
    `น้องเอค้นจากรายการจริงเท่านั้น — ถ้าสนใจรุ่นใกล้เคียง ลองถามยี่ห้อหรืองบใหม่ได้ครับ`,
  ].join("\n\n");
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
    `\nน้องเอสรุปจากข้อมูลที่ลงประกาศจริงเท่านั้น — ถ้าสนใจคันไหน กด 'ดูรายละเอียดในแชท' เพื่อดูสเปกและรูปเพิ่มได้เลยครับ`,
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
    `ถ้าสนใจคันนี้ กด 'ดูรายละเอียดในแชท' เพื่อดูข้อมูลจากระบบได้เลยครับ`,
    `ถ้าต้องการ น้องเอช่วยเทียบคันนี้กับคันอื่นให้ได้ครับ`,
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
    `\nน้องเอสรุปจากข้อมูลที่ลงประกาศจริงเท่านั้น — ดูรูปและรายละเอียดเพิ่มจากการ์ดด้านล่างได้เลยครับ`,
    cardCta(false, c.id),
    altNote,
  ]
    .filter(Boolean)
    .join("\n")
    .replace(/\n\n\n/g, "\n\n");
}
