/**
 * Phase 7 — AI Marketing Brain
 * Logic helper สำหรับวิเคราะห์และสร้างมุมขายโพสต์รถยนต์มือสอง (ไทย)
 * ไม่เรียก API — ใช้ร่วมกับ generatorService / useCarPostGenerator ในอนาคต
 */

/** ข้อมูลรถที่ใช้วิเคราะห์ — รองรับฟิลด์จากฟอร์มขายรถและ CarSpecsInput */
export interface CarMarketingInput {
  brand?: string;
  model?: string;
  year?: number | string;
  price?: number;
  mileage?: number;
  transmission?: string;
  fuelType?: string;
  color?: string;
  province?: string;
  condition?: string;
  highlights?: string;
  additionalDetails?: string;
  modifications?: string;
  negotiable?: boolean;
}

/** ผลลัพธ์รวมจาก buildCarMarketingBrain */
export interface CarMarketingBrainResult {
  carType: string;
  targetBuyer: string[];
  sellingPoints: string[];
  buyerPainPoints: string[];
  hooks: string[];
  sellingAngles: string[];
  callToAction: string[];
  closingBlessing: string;
}

/** ประเภทรถเชิงตลาด (ภายใน) */
type MarketCarCategory =
  | "suv_mpv_family"
  | "sedan_commuter"
  | "pickup_work"
  | "ev_hybrid"
  | "luxury_premium"
  | "sport_youth"
  | "economy_city"
  | "commercial"
  | "general_used";

const NONG_A_SIGNATURES = [
  "ปังปุริเย่!",
  "คันนี้มีคนทักแน่ครับ",
  "รถสวยจน AI ใจสั่น",
] as const;

// ——— Helpers (ไม่ export) ———

function normalizeText(value?: string): string {
  return (value ?? "").trim();
}

function hasText(value?: string): boolean {
  return normalizeText(value).length > 0;
}

function parseYear(year?: number | string): number | null {
  if (year === undefined || year === null || year === "") return null;
  const n = typeof year === "number" ? year : parseInt(String(year), 10);
  return Number.isFinite(n) && n > 1980 && n <= new Date().getFullYear() + 1
    ? n
    : null;
}

function formatPriceTHB(price?: number): string | null {
  if (price === undefined || price === null || price <= 0) return null;
  return `฿${price.toLocaleString("th-TH")}`;
}

function formatMileageTH(mileage?: number): string | null {
  if (mileage === undefined || mileage === null || mileage < 0) return null;
  return `${mileage.toLocaleString("th-TH")} กม.`;
}

function combinedSearchText(input: CarMarketingInput): string {
  return [
    input.brand,
    input.model,
    input.fuelType,
    input.transmission,
    input.highlights,
    input.additionalDetails,
    input.modifications,
    input.condition,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function detectCategory(input: CarMarketingInput): MarketCarCategory {
  const text = combinedSearchText(input);
  const brand = normalizeText(input.brand).toLowerCase();
  const price = input.price ?? 0;
  const fuel = normalizeText(input.fuelType).toLowerCase();

  if (
    /รถกระบะ|pickup|hilux|revo|navara|ranger|d-max|carry|carry boy|triton/i.test(
      text
    ) ||
    /hilux|revo|navara|ranger|d-max|triton/i.test(brand)
  ) {
    return "pickup_work";
  }

  if (
    /ev|ไฟฟ้า|electric|hybrid|ปลั๊กอิน|plug-in|phev|bev|model 3|model y|byd|leaf|i4|taycan/i.test(
      text
    ) ||
    fuel.includes("electric") ||
    fuel.includes("hybrid") ||
    fuel.includes("ปลั๊ก")
  ) {
    return "ev_hybrid";
  }

  if (
    /fortuner|pajero|mu-x|everest|x-trail|cr-v|rav4|cx-5|sorento|staria|alphard|vellfire|suv|mpv|ครอบครัว|7 ที่นั่ง|8 ที่นั่ง/i.test(
      text
    )
  ) {
    return "suv_mpv_family";
  }

  if (
    /benz|mercedes|bmw|porsche|lexus|audi|volvo|maserati|bentley|rolls|luxury|หรู|พรีเมียม/i.test(
      text
    ) ||
    price >= 2_500_000
  ) {
    return "luxury_premium";
  }

  if (
    /civic|accord|mazda3|altis|yaris|city|jazz|sport|rs|turbo|ซิ่ง|วัยรุ่น|coupe|hot hatch/i.test(
      text
    )
  ) {
    return "sport_youth";
  }

  if (
    /van|commuter|hiace|commuter|carry|รถตู้|รถบรรทุก|commercial/i.test(text)
  ) {
    return "commercial";
  }

  if (
    /march|mirage|swift|celerio|aygo|eco|ประหยัด|รถเมือง|รถเรียน|รถคันแรก/i.test(
      text
    ) ||
    (price > 0 && price < 400_000)
  ) {
    return "economy_city";
  }

  if (/sedan|altis|camry|accord|civic|city|vios|almera|ซีดาน|รถใช้งานประจำวัน/i.test(text)) {
    return "sedan_commuter";
  }

  return "general_used";
}

const CAR_TYPE_LABELS: Record<MarketCarCategory, string> = {
  suv_mpv_family: "รถอเนกประสงค์ / SUV / MPV สายครอบครัว",
  sedan_commuter: "รถซีดานสายใช้งานประจำวัน / รถคันแรก",
  pickup_work: "รถกระบะ / รถใช้งานและธุรกิจ",
  ev_hybrid: "รถไฟฟ้า / ไฮบริด สายประหยัดพลังงาน",
  luxury_premium: "รถหรู / พรีเมียม สายภาพลักษณ์",
  sport_youth: "รถสปอร์ต / สไตล์วัยรุ่น",
  economy_city: "รถเมืองราคาเข้าถึงง่าย",
  commercial: "รถตู้ / รถเชิงพาณิชย์",
  general_used: "รถมือสองทั่วไป",
};

// ——— Exported functions ———

/**
 * วิเคราะห์ประเภทของรถจากสเปกและข้อความเสริม
 */
export function analyzeCarType(input: CarMarketingInput): string {
  const category = detectCategory(input);
  const brand = normalizeText(input.brand);
  const model = normalizeText(input.model);
  const year = parseYear(input.year);

  let label = CAR_TYPE_LABELS[category];

  if (brand && model) {
    label = `${label} — ${brand} ${model}`;
  } else if (brand) {
    label = `${label} — ${brand}`;
  }

  if (year) {
    label += ` (ปี ${year})`;
  }

  return label;
}

/**
 * วิเคราะห์กลุ่มลูกค้าเป้าหมายที่น่าจะสนใจรถคันนี้
 */
export function detectTargetBuyer(input: CarMarketingInput): string[] {
  const category = detectCategory(input);
  const buyers: string[] = [];
  const year = parseYear(input.year);
  const mileage = input.mileage;
  const price = input.price ?? 0;
  const province = normalizeText(input.province);

  const byCategory: Record<MarketCarCategory, string[]> = {
    suv_mpv_family: [
      "ครอบครัวที่ต้องการพื้นที่และความปลอดภัย",
      "ผู้ปกครองที่มองหารถรับส่งลูกสบาย ๆ",
      "คนทำงานที่ชอบขับทริปต่างจังหวัดเป็นครั้งคราว",
    ],
    sedan_commuter: [
      "พนักงานออฟฟิศที่ใช้รถประจำวัน",
      "ผู้ซื้อรถคันแรกที่เน้นความคุ้มค่า",
      "คนทำงานในเมืองที่ต้องการรถดูแลง่าย",
    ],
    pickup_work: [
      "เจ้าของธุรกิจ / รับเหมาก่อสร้าง",
      "ผู้ประกอบการที่ใช้รถขนของ",
      "คนชอบออฟโรดเบา ๆ และใช้งานจริง",
    ],
    ev_hybrid: [
      "คนเมืองที่อยากลดค่าน้ำมัน",
      "ผู้สนใจเทคโนโลยีและรถยนต์ไฟฟ้า",
      "คนทำงานที่วิ่งในเมืองเป็นหลัก",
    ],
    luxury_premium: [
      "ผู้บริหาร / เจ้าของธุรกิจ",
      "คนรักแบรนด์หรูและภาพลักษณ์",
      "ผู้ที่ต้องการความสะดวกสบายระดับพรีเมียม",
    ],
    sport_youth: [
      "วัยรุ่นและคนทำงานรุ่นใหม่",
      "คนรักสไตล์สปอร์ตและการขับขี่",
      "ผู้ซื้อที่อยากได้รถดูเท่ในงบมือสอง",
    ],
    economy_city: [
      "นักศึกษา / คนทำงานใหม่",
      "ผู้ซื้อที่เน้นงบจำกัดแต่ต้องการรถใช้งานจริง",
      "คนต้องการรถเมืองขับง่าย จอดสะดวก",
    ],
    commercial: [
      "เจ้าของร้าน / ธุรกิจบริการ",
      "ผู้ประกอบการที่ต้องการรถขนส่งหรือรับส่งลูกค้า",
      "ทีมงานที่ต้องการรถใช้งานหลายที่นั่ง",
    ],
    general_used: [
      "ผู้ซื้อรถมือสองทั่วไปที่มองหาความคุ้มค่า",
      "คนที่ต้องการรถใช้งานจริงในงบที่เหมาะสม",
      "ผู้ซื้อที่อยากนัดดูรถและเจรจาราคาได้",
    ],
  };

  buyers.push(...byCategory[category]);

  if (mileage !== undefined && mileage >= 0 && mileage <= 50_000) {
    buyers.push("ผู้ซื้อที่ให้ความสำคัญกับเลขไมล์ต่ำ");
  }

  if (year && year >= new Date().getFullYear() - 3) {
    buyers.push("คนที่ชอบรถรุ่นใหม่ ๆ แต่ไม่อยากจ่ายราคาป้ายแดงเต็ม ๆ");
  }

  if (price > 0 && price < 600_000) {
    buyers.push("ผู้ซื้อที่เน้นงบประมาณและต้นทุนการดูแล");
  }

  if (hasText(province)) {
    buyers.push(`ผู้ซื้อในพื้นที่ ${province} หรือใกล้เคียงที่สะดวกนัดดูรถ`);
  }

  if (input.negotiable) {
    buyers.push("ผู้ซื้อที่อยากเจรจาราคาแบบเปิดใจ");
  }

  return [...new Set(buyers)].slice(0, 6);
}

/**
 * สกัดจุดขายจากข้อมูลที่มี — ไม่อ้างเกินจริง
 */
export function extractCarSellingPoints(input: CarMarketingInput): string[] {
  const points: string[] = [];
  const brand = normalizeText(input.brand);
  const model = normalizeText(input.model);
  const year = parseYear(input.year);
  const priceStr = formatPriceTHB(input.price);
  const mileageStr = formatMileageTH(input.mileage);
  const condition = normalizeText(input.condition);
  const province = normalizeText(input.province);
  const highlights = normalizeText(input.highlights);
  const mods = normalizeText(input.modifications);
  const details = normalizeText(input.additionalDetails);
  const color = normalizeText(input.color);
  const fuel = normalizeText(input.fuelType);
  const transmission = normalizeText(input.transmission);
  const category = detectCategory(input);

  if (brand && model) {
    points.push(`ยี่ห้อและรุ่นที่คุ้นเคยในตลาด — ${brand} ${model}`);
  } else if (brand) {
    points.push(`แบรนด์ ${brand} ที่มีฐานผู้ใช้ในตลาดมือสอง`);
  }

  if (year) {
    points.push(`ปีจดทะเบียน ${year} เหมาะกับผู้มองหารถในกลุ่มอายุรถที่ต้องการ`);
  }

  if (mileageStr) {
    const mileage = input.mileage ?? -1;
    if (mileage <= 30_000) {
      points.push(`เลขไมล์ ${mileageStr} — เหมาะกับคนที่ให้ความสำคัญกับการใช้งานน้อย`);
    } else if (mileage <= 80_000) {
      points.push(`เลขไมล์ ${mileageStr} — อยู่ในเกณฑ์ที่หลายคนพิจารณาได้`);
    } else {
      points.push(`เลขไมล์ ${mileageStr} — โปร่งใสระบุไว้ในโพสต์เพื่อให้ตัดสินใจได้`);
    }
  }

  if (priceStr) {
    if (input.negotiable) {
      points.push(`ราคาเสนอ ${priceStr} — เปิดโอกาสเจรจาได้ตามความเหมาะสม`);
    } else {
      points.push(`ราคาเสนอ ${priceStr} — ช่วยให้ผู้ซื้อเทียบงบได้ชัดเจน`);
    }
  }

  if (hasText(condition)) {
    points.push(`สภาพที่ระบุ: ${condition} (อ้างอิงตามข้อมูลที่ผู้ขายให้)`);
  }

  if (hasText(color)) {
    points.push(`สีตัวรถ: ${color}`);
  }

  if (hasText(fuel)) {
    if (/ไฟฟ้า|electric|ev/i.test(fuel)) {
      points.push("เชื้อเพลิงไฟฟ้า — เหมาะกับผู้สนใจลดค่าใช้จ่ายน้ำมันในเมือง");
    } else if (/hybrid|ไฮบริด/i.test(fuel)) {
      points.push("ระบบไฮบริด — ช่วยลดการใช้น้ำมันเมื่อเทียบรถเครื่องยนต์ทั่วไป");
    } else {
      points.push(`เชื้อเพลิง: ${fuel}`);
    }
  }

  if (hasText(transmission)) {
    points.push(`ระบบเกียร์: ${transmission}`);
  }

  if (hasText(province)) {
    points.push(`ตั้งอยู่จังหวัด ${province} — สะดวกนัดดูรถในพื้นที่`);
  }

  if (hasText(highlights)) {
    points.push(`จุดเด่นที่ผู้ขายระบุ: ${highlights}`);
  }

  if (hasText(mods)) {
    points.push(`ของแต่ง / อุปกรณ์เสริม: ${mods}`);
  }

  if (hasText(details)) {
    points.push(`รายละเอียดเพิ่มเติม: ${details}`);
  }

  const categoryAngles: Partial<Record<MarketCarCategory, string>> = {
    suv_mpv_family: "พื้นที่โดยสารและความอเนกประสงค์เหมาะกับครอบครัว",
    pickup_work: "ตอบโจทย์งานขนของและการใช้งานจริง",
    ev_hybrid: "ทางเลือกสำหรับคนที่สนใจเทคโนโลยีและค่าใช้จ่ายระยะยาว",
    luxury_premium: "เน้นความสะดวกสบายและภาพลักษณ์ระดับพรีเมียม",
    sport_youth: "สไตล์และความรู้สึกในการขับที่ดึงดูดกลุ่มวัยรุ่น",
    economy_city: "เหมาะกับงบจำกัดแต่ต้องการรถใช้งานจริงในเมือง",
  };

  const extra = categoryAngles[category];
  if (extra) points.push(extra);

  if (points.length === 0) {
    points.push(
      "รถมือสองที่ระบุข้อมูลโปร่งใส — เหมาะกับผู้ซื้อที่อยากถามรายละเอียดก่อนตัดสินใจ"
    );
  }

  return [...new Set(points)].slice(0, 8);
}

/**
 * วิเคราะห์ pain point ของคนซื้อรถ (ตลาดไทย) — ไม่ฟันธงเรื่องที่ไม่มีข้อมูล
 */
export function detectBuyerPainPoints(input: CarMarketingInput): string[] {
  const pains: string[] = [];
  const category = detectCategory(input);
  const fuel = normalizeText(input.fuelType).toLowerCase();
  const price = input.price ?? 0;

  const universal = [
    "กังวลเรื่องประวัติรถและความตรงตามที่โพสต์บอก",
    "อยากรู้ค่าใช้จ่ายซ่อมบำรุงและอะไหล่โดยประมาณ",
    "ต้องการความชัดเจนเรื่องเอกสารและขั้นตอนโอน",
    "อยากนัดดูรถจริงก่อนตัดสินใจ",
  ];
  pains.push(...universal);

  if (category === "ev_hybrid" || fuel.includes("electric") || fuel.includes("ไฟฟ้า")) {
    pains.push("สนใจสุขภาพแบตเตอรี่และระยะทางชาร์จ (ควรสอบถามรายละเอียดจากผู้ขาย)");
    pains.push("กังวลเรื่องจุดชาร์จในพื้นที่ที่ใช้รถ");
  }

  if (category === "luxury_premium" || price >= 1_500_000) {
    pains.push("อยากมั่นใจเรื่องค่าบำรุงรักษาและอะไหล่แท้/เทียบ");
    pains.push("ต้องการความโปร่งใสเรื่องประวัติการใช้งาน");
  }

  if (category === "pickup_work") {
    pains.push("กังวลเรื่องความทนทานและภาระงานที่รถรับได้");
    pains.push("อยากรู้ว่าเหมาะกับงานขนของหรือใช้ส่วนตัวแค่ไหน");
  }

  if (category === "suv_mpv_family") {
    pains.push("อยากมั่นใจเรื่องความปลอดภัยและพื้นที่สำหรับครอบครัว");
    pains.push("สนใจค่าใช้จ่ายน้ำมันเมื่อใช้รถยาว ๆ");
  }

  if (category === "economy_city" || (price > 0 && price < 500_000)) {
    pains.push("กังวลเรื่องค่าซ่อมและอะไหล์เมื่อรถมีอายุ");
    pains.push("อยากให้ราคาและสภาพสมเหตุสมผลกับงบ");
  }

  if (!hasText(input.province)) {
    pains.push("อยากทราบพื้นที่นัดดูรถและความสะดวกในการเดินทาง");
  }

  if (input.mileage !== undefined && input.mileage > 100_000) {
    pains.push("อยากเข้าใจว่าเลขไมล์สูงส่งผลต่อการใช้งานอย่างไร");
  }

  return [...new Set(pains)].slice(0, 7);
}

/**
 * สร้าง hook เปิดโพสต์ — ไม่ใช้คำอ้างเกินจริง
 */
export function createCarPostHooks(input: CarMarketingInput): string[] {
  const hooks: string[] = [];
  const brand = normalizeText(input.brand) || "รถคันนี้";
  const model = normalizeText(input.model);
  const year = parseYear(input.year);
  const category = detectCategory(input);
  const label = model ? `${brand} ${model}` : brand;
  const yearPart = year ? ` ปี ${year}` : "";

  const templates: Record<MarketCarCategory, string[]> = {
    suv_mpv_family: [
      `มองหารถครอบครัวที่ขับสบาย? ลองดู ${label}${yearPart} คันนี้`,
      `พื้นที่กว้าง นั่งสบาย — ${label} อาจตอบโจทย์ทริปครอบครัว`,
    ],
    sedan_commuter: [
      `รถใช้งานประจำวันที่ดูแลง่าย — ${label}${yearPart}`,
      `เหมาะกับคนทำงานในเมืองที่อยากได้รถคุ้มค่า: ${label}`,
    ],
    pickup_work: [
      `รถกระบะที่พร้อมลุยงาน — ${label}${yearPart}`,
      `ต้องการรถขนของและใช้งานจริง? มาดู ${label} กัน`,
    ],
    ev_hybrid: [
      `สายประหยัดพลังงานมาทางนี้ — ${label}${yearPart}`,
      `ลดค่าน้ำมันในเมืองด้วย ${label} (ข้อมูลตามที่ผู้ขายระบุ)`,
    ],
    luxury_premium: [
      `สัมผัสความหรูในงบมือสอง — ${label}${yearPart}`,
      `ภาพลักษณ์พรีเมียมเริ่มที่ ${label} คันนี้`,
    ],
    sport_youth: [
      `สไตล์สปอร์ตที่ดึงสายตา — ${label}${yearPart}`,
      `ชอบขับสนุก? ${label} อาจเป็นคำตอบของคุณ`,
    ],
    economy_city: [
      `งบจำกัดแต่อยากได้รถใช้จริง — ดู ${label}${yearPart}`,
      `รถเมืองที่ช่วยให้เริ่มต้นได้ง่ายขึ้น: ${label}`,
    ],
    commercial: [
      `รถใช้งานธุรกิจที่น่าสนใจ — ${label}${yearPart}`,
      `ต้องการพื้นที่และความคุ้มค่า? ลอง ${label}`,
    ],
    general_used: [
      `รถมือสองที่น่าสนใจในตลาด — ${label}${yearPart}`,
      `เปิดดูรายละเอียด ${label} ก่อนตัดสินใจ`,
    ],
  };

  hooks.push(...(templates[category] ?? templates.general_used));

  const mileageStr = formatMileageTH(input.mileage);
  if (mileageStr && (input.mileage ?? 0) <= 40_000) {
    hooks.push(`เลขไมล์ ${mileageStr} — น่าจับตามองสำหรับคนรักรถสภาพดี`);
  }

  if (hasText(input.highlights)) {
    hooks.push(`จุดเด่นที่โดดเด่น: ${normalizeText(input.highlights).slice(0, 60)}${normalizeText(input.highlights).length > 60 ? "…" : ""}`);
  }

  return [...new Set(hooks)].slice(0, 5);
}

/**
 * สร้างมุมขาย (selling angle) สำหรับโพสต์
 */
export function createSellingAngles(input: CarMarketingInput): string[] {
  const angles: string[] = [];
  const category = detectCategory(input);
  const sellingPoints = extractCarSellingPoints(input);
  const pains = detectBuyerPainPoints(input);

  const categoryAngles: Record<MarketCarCategory, string[]> = {
    suv_mpv_family: [
      "เน้นความอเนกประสงค์และความสบายของครอบครัว",
      "เทียบกับรถใหม่ — ได้สเปกใกล้เคียงในงบที่ยืดหยุ่นกว่า",
    ],
    sedan_commuter: [
      "เหมาะกับการเดินทางในเมืองทุกวัน",
      "ดูแลง่าย เหมาะกับคนทำงานที่ต้องการรถคุ้มค่า",
    ],
    pickup_work: [
      "ตอบโจทย์งานและชีวิตที่ต้องใช้รถหนัก ๆ เป็นครั้งคราว",
      "ทางเลือกสำหรับผู้ประกอบการที่ไม่อยากผูกกับรถใหม่ราคาสูง",
    ],
    ev_hybrid: [
      "ลดค่าใช้จ่ายน้ำมันเมื่อเทียบรถเครื่องยนต์ทั่วไป (ตามสภาพการใช้งาน)",
      "ทางเลือกสำหรับคนที่อยากลองเทคโนโลยีในงบมือสอง",
    ],
    luxury_premium: [
      "ได้สัมผัสแบรนด์และความสะดวกสบายในราคามือสอง",
      "เหมาะกับผู้ที่ให้ความสำคัญกับภาพลักษณ์และคุณภาพ",
    ],
    sport_youth: [
      "ดึงดูดกลุ่มที่ชอบสไตล์และความรู้สึกในการขับ",
      "ทางเลือกสำหรับคนที่อยากได้รถดูเท่โดยไม่ต้องซื้อป้ายแดง",
    ],
    economy_city: [
      "เริ่มต้นมีรถใช้ได้ด้วยงบที่เข้าถึงได้",
      "เหมาะกับการใช้งานในเมืองและระยะทางสั้น ๆ",
    ],
    commercial: [
      "ช่วยลดต้นทุนการลงทุนรถสำหรับธุรกิจ",
      "พื้นที่และความยืดหยุ่นในการใช้งาน",
    ],
    general_used: [
      "โปร่งใสข้อมูล — ถามรายละเอียดก่อนตัดสินใจได้",
      "ทางเลือกในตลาดมือสองที่ช่วยเทียบราคาได้",
    ],
  };

  angles.push(...(categoryAngles[category] ?? categoryAngles.general_used));

  if (sellingPoints.length > 0) {
    angles.push(`ชูจุดเด่นที่มีข้อมูลรองรับ: ${sellingPoints[0]}`);
  }

  if (pains.length > 0) {
    angles.push(`ตอบข้อกังวลผู้ซื้อ: ${pains[0]}`);
  }

  if (input.negotiable) {
    angles.push("เปิดช่องเจรจาราคา — ช่วยให้ผู้ซื้อรู้สึกว่าคุยได้");
  }

  if (hasText(input.province)) {
    angles.push(`เน้นความสะดวกนัดดูรถใน ${normalizeText(input.province)}`);
  }

  return [...new Set(angles)].slice(0, 6);
}

/**
 * สร้าง Call-to-Action สำหรับโพสต์ขายรถ
 */
export function createCarCallToAction(input: CarMarketingInput): string[] {
  const ctas: string[] = [];
  const province = normalizeText(input.province);

  ctas.push("สนใจทักแชทสอบถามรายละเอียดเพิ่มเติมได้เลยครับ");
  ctas.push("นัดดูรถจริงก่อนตัดสินใจ — แนะนำให้ตรวจสภาพตามความสะดวก");

  if (input.negotiable) {
    ctas.push("เปิดรับการเจรจาราคาตามความเหมาะสม — ทักมาคุยได้");
  } else if (formatPriceTHB(input.price)) {
    ctas.push(`สอบถามราคา ${formatPriceTHB(input.price)} และเงื่อนไขการโอนได้ทันที`);
  }

  if (province) {
    ctas.push(`นัดชมรถในพื้นที่ ${province} หรือตกลงสถานที่ที่สะดวกทั้งสองฝ่าย`);
  } else {
    ctas.push("สอบถามพื้นที่นัดดูรถและเวลาที่สะดวกได้");
  }

  ctas.push("ขอดูเอกสารและประวัติการดูแลตามที่ผู้ขายพร้อมให้ข้อมูล");

  const category = detectCategory(input);
  if (category === "ev_hybrid") {
    ctas.push("สอบถามข้อมูลแบตเตอรี่และการชาร์จก่อนตัดสินใจ");
  }

  return [...new Set(ctas)].slice(0, 5);
}

/**
 * สร้างคำอวยพรปิดท้ายสไตล์น้องเอ (ตลาดรถมือสอง)
 */
export function createNongAClosingBlessing(input: CarMarketingInput): string {
  const brand = normalizeText(input.brand);
  const model = normalizeText(input.model);
  const carLabel = brand && model ? `${brand} ${model}` : brand || "รถคันนี้";

  const blessings = [
    `ขอให้ลุงเด่นและทีมงานปิดดีล ${carLabel} ได้อย่างราบรื่นนะครับ — น้องเอเป็นกำลังใจให้ทุกโพสต์ครับ`,
    `ขอให้ผู้ซื้อที่เหมาะสมเจอ ${carLabel} คันนี้เร็ว ๆ นะครับ มีอะไรให้น้องเอช่วยร่างแคปชั่นเพิ่ม บอกได้เลยครับ`,
    `ปิดท้ายด้วยความปังจากน้องเอ — ขอให้โพสต์ ${carLabel} ดึงดูดคนจริงจัง และเจรจาจบด้วยความพอใจทั้งสองฝ่ายครับ`,
  ];

  const index =
    (carLabel.length + (input.price ?? 0) + (input.mileage ?? 0)) %
    blessings.length;

  let closing = blessings[index];

  if (detectCategory(input) === "sport_youth" || detectCategory(input) === "luxury_premium") {
    closing = closing.replace(
      "ปังจากน้องเอ",
      `${NONG_A_SIGNATURES[0]} จากน้องเอ`
    );
    if (!closing.includes(NONG_A_SIGNATURES[0])) {
      closing += ` ${NONG_A_SIGNATURES[0]}`;
    }
  }

  return closing;
}

/**
 * รวมผลการวิเคราะห์ทั้งหมดเป็น Marketing Brain object เดียว
 */
export function buildCarMarketingBrain(
  input: CarMarketingInput
): CarMarketingBrainResult {
  const safeInput: CarMarketingInput = {
    brand: normalizeText(input.brand) || undefined,
    model: normalizeText(input.model) || undefined,
    year: input.year,
    price: input.price,
    mileage: input.mileage,
    transmission: normalizeText(input.transmission) || undefined,
    fuelType: normalizeText(input.fuelType) || undefined,
    color: normalizeText(input.color) || undefined,
    province: normalizeText(input.province) || undefined,
    condition: normalizeText(input.condition) || undefined,
    highlights: normalizeText(input.highlights) || undefined,
    additionalDetails: normalizeText(input.additionalDetails) || undefined,
    modifications: normalizeText(input.modifications) || undefined,
    negotiable: input.negotiable,
  };

  return {
    carType: analyzeCarType(safeInput),
    targetBuyer: detectTargetBuyer(safeInput),
    sellingPoints: extractCarSellingPoints(safeInput),
    buyerPainPoints: detectBuyerPainPoints(safeInput),
    hooks: createCarPostHooks(safeInput),
    sellingAngles: createSellingAngles(safeInput),
    callToAction: createCarCallToAction(safeInput),
    closingBlessing: createNongAClosingBlessing(safeInput),
  };
}
