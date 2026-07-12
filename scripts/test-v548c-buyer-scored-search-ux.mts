/**
 * v5.4.8c — buyer scored search UX in orchestrator
 * npm run test:v548c-buyer-scored-search-ux
 */
import { tryOrchestrateChatReply } from "../src/services/ai/chat/chatSearchOrchestrator.ts";
import {
  shouldUseBuyerScoredMarketplaceSearch,
  tryBuyerScoredMarketplaceReply,
} from "../src/services/ai/chat/buyerScoredMarketplaceSearch.ts";
import { parseBuyerSearchIntent } from "../src/services/ai/chat/buyerSearchIntentParser.ts";
import {
  buildBuyerCarPitchLine,
  BUYER_PITCH_FORBIDDEN_CLAIM,
} from "../src/services/ai/chat/buyerCarPitchCopy.ts";
import { scoreBuyerMarketplaceCandidate } from "../src/services/ai/chat/buyerMarketplaceScoring.ts";
import type { ChatInventoryCar } from "../src/services/ai/chat/marketplaceChatSearch.ts";

const FORBIDDEN = BUYER_PITCH_FORBIDDEN_CLAIM;

const INVENTORY_BUDGET_FUEL: ChatInventoryCar[] = [
  {
    id: "car-vios",
    title: "Toyota Vios",
    brand: "Toyota",
    model: "Vios",
    year: 2018,
    price: 279_000,
    bodyType: "sedan",
    listingStatus: "published",
  },
  {
    id: "car-mira",
    title: "Daihatsu Mira",
    brand: "Daihatsu",
    model: "Mira",
    year: 2019,
    price: 295_000,
    bodyType: "hatchback",
    description: "รถประหยัดน้ำมัน",
    listingStatus: "published",
  },
  {
    id: "car-city-rs",
    title: "Honda City RS",
    brand: "Honda",
    model: "City",
    year: 2020,
    price: 325_000,
    bodyType: "sedan",
    listingStatus: "published",
  },
  {
    id: "car-fortuner",
    title: "Toyota Fortuner",
    brand: "Toyota",
    model: "Fortuner",
    year: 2018,
    price: 890_000,
    bodyType: "suv",
    listingStatus: "published",
  },
];

const INVENTORY_FAMILY: ChatInventoryCar[] = [
  {
    id: "car-ertiga",
    title: "Suzuki Ertiga",
    brand: "Suzuki",
    model: "Ertiga",
    year: 2021,
    price: 589_000,
    bodyType: "mpv",
    description: "รถครอบครัว 7 ที่นั่ง",
    listingStatus: "published",
  },
  {
    id: "car-crv",
    title: "Honda CR-V",
    brand: "Honda",
    model: "CR-V",
    year: 2019,
    price: 750_000,
    bodyType: "suv",
    listingStatus: "published",
  },
  {
    id: "car-city",
    title: "Honda City",
    brand: "Honda",
    model: "City",
    year: 2020,
    price: 450_000,
    bodyType: "sedan",
    listingStatus: "published",
  },
];

const INVENTORY_FIRST: ChatInventoryCar[] = [
  {
    id: "car-vios-first",
    title: "Toyota Vios",
    brand: "Toyota",
    model: "Vios",
    year: 2017,
    price: 249_000,
    bodyType: "sedan",
    listingStatus: "published",
  },
  {
    id: "car-bmw",
    title: "BMW 520d",
    brand: "BMW",
    model: "520d",
    year: 2018,
    price: 1_450_000,
    bodyType: "sedan",
    listingStatus: "published",
  },
];

const INVENTORY_CITY: ChatInventoryCar[] = [
  {
    id: "car-city-urban",
    title: "Honda City",
    brand: "Honda",
    model: "City",
    year: 2020,
    price: 420_000,
    bodyType: "sedan",
    listingStatus: "published",
  },
  {
    id: "car-fortuner-urban",
    title: "Toyota Fortuner",
    brand: "Toyota",
    model: "Fortuner",
    year: 2019,
    price: 1_100_000,
    bodyType: "suv",
    listingStatus: "published",
  },
];

const INVENTORY_CAMRY: ChatInventoryCar[] = [
  {
    id: "car-toyota-camry",
    title: "Toyota Camry",
    brand: "Toyota",
    model: "Camry",
    year: 2019,
    price: 850000,
    mileage: 120384,
    images: [],
  },
];

const INVENTORY_OWNER_SCENARIOS: ChatInventoryCar[] = [
  {
    id: "car-owner-camry",
    title: "Toyota Camry",
    brand: "Toyota",
    model: "Camry",
    year: 2019,
    price: 850_000,
    mileage: 120_384,
    bodyType: "sedan",
    description: "ห้องโดยสารนั่งสบาย ภาพลักษณ์สุภาพ",
    listingStatus: "published",
  },
  {
    id: "car-owner-vios",
    title: "Toyota Vios",
    brand: "Toyota",
    model: "Vios",
    year: 2020,
    price: 399_000,
    mileage: 88_000,
    bodyType: "sedan",
    description: "รถใช้งานประจำวัน ดูแลง่าย",
    listingStatus: "published",
  },
  {
    id: "car-owner-corolla",
    title: "Toyota Corolla Cross",
    brand: "Toyota",
    model: "Corolla",
    year: 2021,
    price: 429_000,
    mileage: 58_000,
    bodyType: "suv",
    description: "รถครอบครัว ขับในเมืองคล่อง",
    listingStatus: "published",
  },
];

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function assertNoForbidden(text: string, label: string) {
  ok(`${label}-no-forbidden-claims`, !FORBIDDEN.test(text), text.slice(0, 100));
}

console.log("=== Nong A v5.4.8c buyer scored search UX ===\n");

// --- routing ---
ok(
  "route-budget-fuel",
  shouldUseBuyerScoredMarketplaceSearch(
    "งบไม่เกิน 3 แสน อยากได้รถประหยัดน้ำมัน"
  ),
  ""
);
ok(
  "route-vague-false",
  !shouldUseBuyerScoredMarketplaceSearch("แนะนำรถหน่อย"),
  ""
);

// --- budget + fuel ---
const qBudgetFuel = "งบไม่เกิน 3 แสน อยากได้รถประหยัดน้ำมัน";
const orchFuel = tryOrchestrateChatReply(qBudgetFuel, INVENTORY_BUDGET_FUEL);
ok("fuel-orch-handled", orchFuel != null, "");
ok("fuel-orch-skip-gemini", orchFuel?.skipGemini === true, "");
ok("fuel-has-cards", (orchFuel?.carCards.length ?? 0) >= 1, "");
ok(
  "fuel-scored-intro",
  /งบไม่เกิน|คัดจากรถ|ตลาด/.test(orchFuel?.text ?? ""),
  orchFuel?.text.slice(0, 80)
);
// v7.4 — narrative fusion: warm per-car reason now lives on each card (fitReason),
// keeping the text bubble a short opener/closing instead of a wall of pitches.
const fuelFitReasons = (orchFuel?.carCards ?? [])
  .map((c) => c.fitReason ?? "")
  .filter((r) => r.trim().length > 0);
ok(
  "fuel-warm-pitch-tone",
  /ฟีล|จังหวะ|คู่ใจ|น่าดูต่อ|ใช้งานจริง|เหมาะ|งบ/.test(fuelFitReasons.join(" ")),
  fuelFitReasons.join(" ").slice(0, 120)
);
ok(
  "fuel-cards-have-fit-reason",
  fuelFitReasons.length >= Math.min(3, orchFuel?.carCards.length ?? 0),
  String(fuelFitReasons.length)
);
ok(
  "fuel-text-has-per-car-explanations",
  /คันแรก|คันที่สอง|คันที่สาม/.test(orchFuel?.text ?? "") &&
    /ราคา|ไมล์|จากข้อมูลประกาศ/.test(orchFuel?.text ?? ""),
  orchFuel?.text.slice(0, 160)
);
ok(
  "fuel-text-has-compare-or-cta",
  /สรุปช่วยตัดสินใจ|นัดดูรถ|ทดลองขับ|นัดชมรถ/.test(orchFuel?.text ?? ""),
  orchFuel?.text.slice(-100)
);
ok(
  "fuel-not-old-ui-cta",
  !/น้องเอจัดการ์ดไว้ด้านล่าง|กด 'ดูรายละเอียดในแชท'/.test(orchFuel?.text ?? ""),
  ""
);
assertNoForbidden(orchFuel?.text ?? "", "fuel");
ok(
  "fuel-top-in-budget",
  (orchFuel?.carCards[0]?.price ?? 999999) <= 300_000,
  String(orchFuel?.carCards[0]?.price)
);

// --- family 7 seats ---
const qFamily = "รถครอบครัว 7 ที่นั่งมีไหม";
const orchFamily = tryOrchestrateChatReply(qFamily, INVENTORY_FAMILY)!;
ok("family-cards", orchFamily.carCards.length >= 1, "");
ok(
  "family-ertiga-first",
  orchFamily.carCards[0].id === "car-ertiga",
  orchFamily.carCards[0].id
);
ok(
  "family-advisor-tone",
  /ครอบครัว|7|MPV|ตลาด/.test(orchFamily.text),
  orchFamily.text.slice(0, 90)
);
assertNoForbidden(orchFamily.text, "family");

// --- first car search (not full advisor template) ---
const qFirst = "รถคันแรก ดูแลง่าย ไม่จุกจิก";
const orchFirst = tryOrchestrateChatReply(qFirst, INVENTORY_FIRST)!;
ok("first-has-cards", orchFirst.carCards.length >= 1, "");
ok(
  "first-not-long-advisor-template",
  !/เล่มทะเบียน สำเนาบัตรผู้ขาย/.test(orchFirst.text),
  orchFirst.text.slice(0, 80)
);
ok(
  "first-advisor-scoring-tone",
  /พิจารณา|ตรวจประวัติ|ทดลองขับ|คัด/.test(orchFirst.text),
  ""
);
ok(
  "first-no-guarantee",
  !/ไม่จุกจิกแน่นอน/.test(orchFirst.text),
  ""
);
assertNoForbidden(orchFirst.text, "first");

// --- city ---
const qCity = "อยากได้รถใช้งานในเมือง";
const orchCity = tryOrchestrateChatReply(qCity, INVENTORY_CITY)!;
ok("city-cards", orchCity.carCards.length >= 1, "");
ok(
  "city-sedan-first",
  orchCity.carCards[0].id === "car-city-urban",
  orchCity.carCards[0].id
);
assertNoForbidden(orchCity.text, "city");

// --- owner scenario: per-car reason must not collapse to one repeated sentence ---
const ownerWorkday = tryBuyerScoredMarketplaceReply(
  "วันนี้ต้องการรถไว้ขับไปทำงานครับ",
  INVENTORY_OWNER_SCENARIOS
);
ok("owner-workday-handled", ownerWorkday != null, "");
ok(
  "owner-workday-no-premature-city-assumption",
  !/จากใช้งานในเมือง/.test(ownerWorkday?.text ?? ""),
  ownerWorkday?.text?.slice(0, 140) ?? ""
);
ok(
  "owner-workday-smart-followup-usage-shape",
  /ในเมืองเป็นหลักหรือมีวิ่งทางไกล/.test(ownerWorkday?.text ?? ""),
  ownerWorkday?.text ?? ""
);
ok(
  "owner-workday-no-force-brand-model-question",
  !/ยี่ห้อ\/รุ่นที่สนใจ/.test(ownerWorkday?.text ?? ""),
  ownerWorkday?.text ?? ""
);
const ownerWorkdayReasons = (ownerWorkday?.carCards ?? [])
  .slice(0, 3)
  .map((c) => (c.fitReason ?? "").trim())
  .filter(Boolean);
ok("owner-workday-three-reasons", ownerWorkdayReasons.length === 3, ownerWorkdayReasons.join(" | "));
ok(
  "owner-workday-reasons-not-all-identical",
  new Set(ownerWorkdayReasons).size > 1,
  ownerWorkdayReasons.join(" | ")
);
ok(
  "owner-workday-no-unsupported-comfort-claims",
  !/(ความนุ่มนวล|ภาพลักษณ์สุภาพ|ค่าใช้จ่ายหลังรับรถ)/.test(
    ownerWorkdayReasons.join(" | ")
  ),
  ownerWorkdayReasons.join(" | ")
);
ok(
  "owner-workday-candidate-order-unchanged",
  (ownerWorkday?.carCards ?? []).slice(0, 3).map((c) => c.id).join(",") ===
    "car-owner-vios,car-owner-camry,car-owner-corolla",
  (ownerWorkday?.carCards ?? []).slice(0, 3).map((c) => c.id).join(",")
);
ok(
  "owner-workday-price-mileage-unchanged",
  (ownerWorkday?.carCards ?? [])
    .slice(0, 3)
    .map((c) => `${c.id}:${c.price}:${c.mileage}`)
    .join("|") ===
    "car-owner-vios:399000:88000|car-owner-camry:850000:120384|car-owner-corolla:429000:58000",
  (ownerWorkday?.carCards ?? [])
    .slice(0, 3)
    .map((c) => `${c.id}:${c.price}:${c.mileage}`)
    .join("|")
);

const ownerBudget = tryBuyerScoredMarketplaceReply(
  "งบไม่เกินล้าน มีคันไหนน่าสนใจ",
  INVENTORY_OWNER_SCENARIOS
);
ok("owner-budget-handled", ownerBudget != null, "");
const ownerBudgetReasons = (ownerBudget?.carCards ?? [])
  .slice(0, 3)
  .map((c) => (c.fitReason ?? "").trim())
  .filter(Boolean);
ok("owner-budget-three-reasons", ownerBudgetReasons.length === 3, ownerBudgetReasons.join(" | "));
ok(
  "owner-budget-reasons-not-all-identical",
  new Set(ownerBudgetReasons).size > 1,
  ownerBudgetReasons.join(" | ")
);

// --- advisor: no cards ---
const advisorCases = [
  { q: "ซื้อรถมือสองต้องดูอะไร", snippet: /เล่มทะเบียน|ช่าง/ },
  { q: "ซื้อมือสองต้องดูอะไร", snippet: /เล่มทะเบียน|ช่าง/ },
  { q: "ดาวน์เท่าไหร่ดี", snippet: /ดาวน์|20|30/ },
  { q: "ไฟแนนซ์ต้องเตรียมอะไร", snippet: /บัตรประชาชน/ },
];

for (const { q, snippet } of advisorCases) {
  const orch = tryOrchestrateChatReply(q, INVENTORY_CAMRY);
  ok(`advisor-${q.slice(0, 8)}-handled`, orch != null, "");
  ok(`advisor-${q.slice(0, 8)}-no-cards`, (orch?.carCards.length ?? 0) === 0, "");
  ok(`advisor-${q.slice(0, 8)}-no-camry`, !/Camry/i.test(orch?.text ?? ""), "");
  ok(`advisor-${q.slice(0, 8)}-body`, snippet.test(orch?.text ?? ""), "");
  assertNoForbidden(orch?.text ?? "", `advisor-${q.slice(0, 6)}`);
}

ok(
  "fuel-uses-nong-a-not-hnu",
  /น้องเอ/.test(orchFuel?.text ?? "") && !/หนู/.test(orchFuel?.text ?? ""),
  ""
);

// --- vague clarify ---
const orchVague = tryOrchestrateChatReply("แนะนำรถหน่อย", INVENTORY_FAMILY)!;
ok("vague-no-cards", orchVague.carCards.length === 0, "");
ok(
  "vague-clarify",
  /งบ|ประเภท|ยี่ห้อ|การใช้งาน/.test(orchVague.text),
  orchVague.text.slice(0, 80)
);

const orchVague2 = tryOrchestrateChatReply("อยากได้รถดี ๆ", INVENTORY_FAMILY)!;
ok("vague2-no-cards", orchVague2.carCards.length === 0, "");
ok("vague2-clarify", /งบ|รายละเอียด|ประเภท/.test(orchVague2.text), "");

// --- down payment not search ---
ok(
  "down-not-vehicle-search",
  parseBuyerSearchIntent("ดาวน์เท่าไหร่ดี").isVehicleSearch === false,
  ""
);

// --- legacy camry still works ---
const orchCamry = tryOrchestrateChatReply(
  "มี Camry ไม่เกิน 1 ล้านไหม",
  INVENTORY_CAMRY
);
ok("camry-still-cards", (orchCamry?.carCards.length ?? 0) >= 1, "");

// --- unit: pitch line helper ---
const intentFuel = parseBuyerSearchIntent(qBudgetFuel);
const viosRanked = scoreBuyerMarketplaceCandidate(
  intentFuel,
  INVENTORY_BUDGET_FUEL[0]
);
const pitchLine = buildBuyerCarPitchLine(viosRanked, 0, intentFuel);
ok("pitch-line-has-rank", /คันแรก/.test(pitchLine), pitchLine.slice(0, 60));
ok("pitch-line-has-price", /279,000/.test(pitchLine), "");
assertNoForbidden(pitchLine, "pitch-unit");

console.log("\n--- sample pitch (budget fuel) ---");
console.log(orchFuel?.text?.slice(0, 600) ?? "");

console.log("\n=== v5.4.8c buyer scored search UX — done ===\n");
