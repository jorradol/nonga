/** ข้อความนำผลค้นหา Marketplace — โทนเป็นมิตร ข้อมูลจริง 100% */

import type { ChatCarCardData } from "../../../types";
import type { ChatCarSummary, ChatSearchCriteria } from "./marketplaceChatSearch";

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

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function cardCta(hasMore = false, includePang = false): string {
  const moreCtas = [
    "ผมเลือกตัวที่น่าสนใจจากราคาและเลขไมล์มาให้ 3 คันแรกก่อน ลองดูจากการ์ดด้านล่างได้เลยครับ ถ้ายังไม่ถูกใจ กด 'ดูเพิ่ม' ได้เลยครับ",
    "น้องเอคัด 3 คันเด็ดๆ มาให้ดูก่อนครับ ถ้าอยากดูคันอื่นในชุดนี้ กด 'ดูเพิ่ม' ได้เลย",
    "จัดมาให้ชม 3 คันแรกก่อนครับ สนใจคันไหนกดดูรายละเอียด หรือถ้าอยากดูตัวเลือกอื่น กด 'ดูเพิ่ม' ได้เลยครับ",
  ];
  
  const normalCtas = [
    "ลองดูการ์ดรถด้านล่างได้เลยครับ ถ้าถูกใจคันไหน กด 'ถามน้องเอ' แล้วน้องเอช่วยเปรียบเทียบต่อให้ได้ครับ",
    "สนใจคันไหนเป็นพิเศษ กดดูรายละเอียดที่การ์ดด้านล่าง หรือให้ผมช่วยเทียบสเปกให้ก็ได้ครับ",
    "เลื่อนดูการ์ดรถด้านล่างได้เลยครับ ถูกใจคันไหนทักถามน้องเอเพิ่มได้ตลอดเลย",
  ];

  const base = hasMore ? getRandomItem(moreCtas) : getRandomItem(normalCtas);
  return includePang ? `${base} ปังปุริเย่!` : base;
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
      traits.push("เด่นเรื่องปีใหม่กว่า ได้รถสภาพสดใหม่");
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
  
  const uniqueBodyTypes = Array.from(new Set(cars.map(c => safeBodyClass(c.bodyClassLabel)))).filter(b => b !== "รถ");
  const isMultiType = uniqueBodyTypes.length > 1;
  
  let typeHint = opts?.bodyTypeHint;
  if (!typeHint) {
    if (criteria.suvOnly) {
      typeHint = "SUV/Crossover";
    } else if (isMultiType) {
      typeHint = "รถหลายประเภท";
    } else if (uniqueBodyTypes.length === 1) {
      typeHint = uniqueBodyTypes[0];
    } else {
      typeHint = "รถ";
    }
  }

  let opener = "";
  const budgetPart = budget ? `ใน${budget}` : "";
  const budgetPart2 = budget ? ` อยู่ใน${budget}` : "";

  if (cars.length === 1) {
    const singleOpeners = [
      `เจอแล้วครับ ในตลาด Nong A มี ${carLabel(cars[0])}`,
      `มีรถที่ตรงใจ 1 คันครับ เป็น ${carLabel(cars[0])}`,
      `ค้นเจอ 1 คันที่ตรงสเปกครับ ${carLabel(cars[0])}`,
    ];
    opener = getRandomItem(singleOpeners) + `${budgetPart2}.`;
  } else {
    if (isMultiType && !criteria.suvOnly) {
      const multiTypeOpeners = [
        `เจอรถ${budgetPart}ทั้งหมด ${cars.length} คันครับ มีทั้ง ${uniqueBodyTypes.join(", ")}`,
        `${budgetPart} มีตัวเลือกให้ดูหลายแนวครับ ค้นเจอทั้งหมด ${cars.length} คัน`,
        `มีตัวเลือก${budgetPart}ทั้งหมด ${cars.length} คันครับ มีหลายประเภทเลย`,
      ];
      opener = getRandomItem(multiTypeOpeners) + ".";
    } else {
      const singleTypeOpeners = [
        `เจอทั้งหมด ${cars.length} คันครับ ในตลาด Nong A มี ${typeHint} ที่ตรงเงื่อนไข${budgetPart2}`,
        `ค้นเจอ ${cars.length} คันที่ตรงสเปกครับ สำหรับ ${typeHint}${budgetPart2}`,
        `มี ${typeHint} เข้าตา ${cars.length} คันครับ${budgetPart2}`,
      ];
      opener = getRandomItem(singleTypeOpeners) + ".";
    }
  }

  const lines: string[] = [opener];
  const shownCars = cars.slice(0, 3);

  if (cars.length === 1) {
    const c = cars[0];
    const mileage =
      c.mileage > 0 ? ` ราคา ${formatPrice(c.price)} บาท ไมล์ ${formatPrice(c.mileage)} กม.` : ` ราคา ${formatPrice(c.price)} บาท`;
    lines.push(
      `${c.brand} ${c.model} ปี ${c.year}${mileage} เป็น ${safeBodyClass(c.bodyClassLabel)} — ลองดูว่าตรงใจไหมครับ`
    );
  } else {
    const preSummaryOpeners = [
      `ผมคัด ${shownCars.length} คันแรกมาให้ดูคนละมุมครับ:`,
      `รอบแรกผมขอหยิบ ${shownCars.length} คันที่น่าสนใจมาให้ดูก่อน:`,
      `ลองดู ${shownCars.length} คันแรกที่ผมคัดมาให้ก่อนนะครับ:`,
    ];
    lines.push(getRandomItem(preSummaryOpeners));
    lines.push(buildCarRolesSummary(shownCars));
  }

  lines.push("\n" + cardCta(cars.length > 3, cars.length >= 2));
  return lines.join("\n");
}

function buildAlternativeIntro(
  alternatives: ChatCarSummary[],
  criteria: ChatSearchCriteria
): string {
  const budget = budgetPhrase(criteria);
  
  const altOpeners = [
    `ยังไม่เจอ SUV แท้${budget ? ` ใน${budget}` : ""} ในตลาด Nong A ตอนนี้ครับ`,
    `ตอนนี้ SUV แท้${budget ? ` ใน${budget}` : ""} ยังไม่มีในระบบครับ`,
    `ค้นดูแล้วยังไม่พบ SUV แท้ที่ตรงกับ${budget ? ` ${budget}` : "เงื่อนไข"}ครับ`,
  ];

  const lines: string[] = [
    getRandomItem(altOpeners),
    `แต่มีทางเลือกใกล้เคียงที่ยังอยู่ในงบให้พิจารณา ${alternatives.length} คัน — ผมแยกไว้ให้ชัดว่าเป็นทางเลือกแทน ไม่ใช่ SUV แท้นะครับ:`,
  ];

  const shownCars = alternatives.slice(0, 3);

  if (alternatives.length === 1) {
    lines.push(summarizeOneLine(alternatives[0]));
    lines.push(
      `เหมาะกับคนที่ต้องการพื้นที่และคุมงบ — ข้อมูลจากรายการจริงในระบบเท่านั้นครับ`
    );
  } else {
    lines.push(buildCarRolesSummary(shownCars));
  }

  lines.push(
    `\nถ้าต้องการ SUV แท้จริง ลองปรับงบหรือยี่ห้อ/รุ่น แล้วถามน้องเอใหม่ได้ครับ`
  );
  lines.push(cardCta(alternatives.length > 3, true));
  return lines.join("\n");
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

  return [
    getRandomItem(emptyOpeners),
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

  return [
    getRandomItem(notFoundOpeners),
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
    `\nน้องเอสรุปจากข้อมูลที่ลงประกาศจริงเท่านั้นนะครับ — ถ้าสนใจคันไหน กดดูรายละเอียดหรือนัดสอบถามได้เลยครับ`
  ].filter(Boolean).join("\n");
}

export function buildSelectedCarReplyCopy(car: ChatCarCardData): string {
  const mileage = car.mileage > 0 ? ` ไมล์ ${formatPrice(car.mileage)} กม.` : "";
  const color = car.color ? ` สี${car.color}` : "";
  
  const traits = [];
  if (car.price < 500000) traits.push("คุมงบได้ดี");
  if (car.mileage > 0 && car.mileage < 50000) traits.push("ไมล์น้อย");
  if (car.year >= new Date().getFullYear() - 3) traits.push("ปีใหม่");
  if (car.bodyClassLabel.includes("MPV") || car.bodyClassLabel.includes("SUV")) traits.push("ใช้งานครอบครัว");
  
  const traitText = traits.length > 0 ? ` จุดที่น่าสนใจคือเป็นรถที่${traits.join(" และ")}` : "";

  return [
    `คันนี้คือ ${car.brand} ${car.model} ปี ${car.year} ราคา ${formatPrice(car.price)} บาท${mileage}${color} เป็น ${car.bodyClassLabel} จากข้อมูลในระบบ`,
    `${traitText} มีข้อมูลพร้อมให้กดดูรายละเอียดต่อครับ`,
    `ถ้าต้องการ น้องเอช่วยเปรียบเทียบคันนี้กับคันอื่นให้ได้ครับ`
  ].join("\n\n");
}
export function buildFollowUpReplyCopy(
  cars: ChatCarCardData[],
  userMessage: string
): string {
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

  const bullets = [
    `ราคา ${formatPrice(c.price)} บาท`,
    c.mileage > 0 ? `ไมล์ ${formatPrice(c.mileage)} กม.` : null,
    c.color ? `สี${c.color}` : null,
    `ประเภท ${c.bodyClassLabel}`,
    c.fuelType ? `เชื้อเพลิง ${c.fuelType}` : null,
    c.showroomName ? `โชว์รูม ${c.showroomName}` : null,
  ].filter(Boolean);

  return [
    `สำหรับ ${c.brand} ${c.model} ปี ${c.year} จากข้อมูลในระบบตอนนี้:`,
    bullets.map((b) => `• ${b}`).join("\n"),
    `\nน้องเอสรุปจากข้อมูลที่ลงประกาศจริงเท่านั้นนะครับ — ดูรูปและรายละเอียดเพิ่มจากการ์ดด้านล่างได้เลย`,
    cardCta(),
    altNote,
  ]
    .filter(Boolean)
    .join("\n")
    .replace(/\n\n\n/g, "\n\n");
}
