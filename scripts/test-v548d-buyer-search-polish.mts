/**
 * v5.4.8d — buyer search polish: pitch every car, advisor fix, น้องเอ persona
 * npm run test:v548d-buyer-search-polish
 */
import { tryOrchestrateChatReply } from "../src/services/ai/chat/chatSearchOrchestrator.ts";
import {
  buildAllScoredPitchLines,
  buildScoredCarPitchCopy,
  BUYER_PITCH_FORBIDDEN_CLAIM,
} from "../src/services/ai/chat/buyerCarPitchCopy.ts";
import { detectBuyerAdvisorTopic } from "../src/services/ai/chat/chatBuyerAdvisorTemplates.ts";
import {
  classifyBuyerFactsQuestion,
  resolveTargetBuyerCar,
} from "../src/services/ai/chat/chatBuyerFactsQa.ts";
import { parseBuyerSearchIntent } from "../src/services/ai/chat/buyerSearchIntentParser.ts";
import { scoreBuyerMarketplaceCandidates } from "../src/services/ai/chat/buyerMarketplaceScoring.ts";
import type { ChatInventoryCar } from "../src/services/ai/chat/marketplaceChatSearch.ts";
import type { ChatCarCardData } from "../src/types.ts";

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
];

const INVENTORY_TWO: ChatInventoryCar[] = INVENTORY_BUDGET_FUEL.slice(0, 2);

const INVENTORY_ONE: ChatInventoryCar[] = [INVENTORY_BUDGET_FUEL[0]];

const INVENTORY_FIVE: ChatInventoryCar[] = [
  ...INVENTORY_BUDGET_FUEL,
  {
    id: "car-yaris",
    title: "Toyota Yaris",
    brand: "Toyota",
    model: "Yaris",
    year: 2019,
    price: 310_000,
    bodyType: "hatchback",
    listingStatus: "published",
  },
  {
    id: "car-march",
    title: "Nissan March",
    brand: "Nissan",
    model: "March",
    year: 2018,
    price: 285_000,
    bodyType: "hatchback",
    listingStatus: "published",
  },
];

const CAMRY_CARD: ChatCarCardData = {
  id: "car-toyota-camry",
  brand: "Toyota",
  model: "Camry",
  year: 2019,
  price: 850_000,
  mileage: 120_384,
  bodyClass: "sedan",
  bodyClassLabel: "Sedan",
  hasImage: false,
  imageUrl: "",
  imageUrls: [],
  detailPath: "/cars/car-toyota-camry",
  matchKind: "exact",
};

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function assertNoForbidden(text: string, label: string) {
  ok(`${label}-no-forbidden`, !FORBIDDEN.test(text), text.slice(0, 100));
}

function countPitchBlocks(text: string): number {
  return (text.match(/(?:คันแรก|คันที่สอง|คันที่สาม|ราคา [\d,]+ บาท —)/g) ?? [])
    .length;
}

console.log("=== Nong A v5.4.8d buyer search polish ===\n");

// --- persona & pitch every car (3) ---
const qFuel = "งบไม่เกิน 3 แสน อยากได้รถประหยัดน้ำมัน";
const orchFuel = tryOrchestrateChatReply(qFuel, INVENTORY_BUDGET_FUEL)!;
ok("fuel-uses-nong-a", /น้องเอ/.test(orchFuel.text), "");
ok("fuel-no-hnu", !/หนู/.test(orchFuel.text), orchFuel.text.slice(0, 80));
ok("fuel-three-pitches", countPitchBlocks(orchFuel.text) >= 3, String(countPitchBlocks(orchFuel.text)));
ok("fuel-pitch-per-card", countPitchBlocks(orchFuel.text) >= (orchFuel.carCards.length ?? 0), "");
assertNoForbidden(orchFuel.text, "fuel");

// --- 1 car ---
const qOne = "งบไม่เกิน 3 แสน รถประหยัดน้ำมัน";
const orchOne = tryOrchestrateChatReply(qOne, INVENTORY_ONE)!;
ok("one-card", orchOne.carCards.length === 1, "");
ok("one-pitch", /คันแรก/.test(orchOne.text), orchOne.text.slice(0, 100));
ok("one-no-second", !/คันที่สอง/.test(orchOne.text), "");

// --- 2 cars ---
const orchTwo = tryOrchestrateChatReply(qFuel, INVENTORY_TWO)!;
ok("two-cards", orchTwo.carCards.length === 2, "");
ok("two-pitches", /คันแรก/.test(orchTwo.text) && /คันที่สอง/.test(orchTwo.text), "");
ok("two-no-third", !/คันที่สาม/.test(orchTwo.text), "");

// --- advisor: ซื้อมือสองต้องดูอะไร (no Camry leak) ---
ok(
  "advisor-detect-shorthand",
  detectBuyerAdvisorTopic("ซื้อมือสองต้องดูอะไร") === "prePurchase",
  ""
);
ok(
  "facts-not-prePurchase-general",
  classifyBuyerFactsQuestion("ซื้อมือสองต้องดูอะไร") === "none",
  ""
);
const orchAdvisor = tryOrchestrateChatReply(
  "ซื้อมือสองต้องดูอะไร",
  INVENTORY_BUDGET_FUEL,
  undefined
)!;
ok("advisor-no-cards", orchAdvisor.carCards.length === 0, "");
ok("advisor-once", !/เล่มทะเบียน[\s\S]*เล่มทะเบียน/.test(orchAdvisor.text), "");
ok("advisor-no-camry", !/Camry/i.test(orchAdvisor.text), orchAdvisor.text.slice(0, 120));
ok("advisor-body", /เล่มทะเบียน|ช่าง/.test(orchAdvisor.text), "");

const implicitCamry = resolveTargetBuyerCar(
  "ซื้อมือสองต้องดูอะไร",
  INVENTORY_BUDGET_FUEL,
  [CAMRY_CARD],
  { allowSessionFallback: false }
);
ok("no-implicit-camry", implicitCamry == null, String(implicitCamry?.id));

// --- selected car advisor ---
const orchSelected = tryOrchestrateChatReply(
  "คันนี้ต้องดูอะไร",
  INVENTORY_BUDGET_FUEL,
  undefined
)!;
ok("selected-advisor-no-cards", orchSelected.carCards.length === 0, "");
ok(
  "selected-or-ask",
  /เล่มทะเบียน|หมายถึงรถคันไหน/.test(orchSelected.text),
  orchSelected.text.slice(0, 80)
);

// --- vague ---
const orchVague = tryOrchestrateChatReply("แนะนำรถหน่อย", INVENTORY_BUDGET_FUEL)!;
ok("vague-no-cards", orchVague.carCards.length === 0, "");
ok("vague-clarify", /งบ|ประเภท|ยี่ห้อ/.test(orchVague.text), "");

// --- unit: pitch lines for 5 candidates ---
const intentFuel = parseBuyerSearchIntent(qFuel);
const scoringFive = scoreBuyerMarketplaceCandidates(intentFuel, INVENTORY_FIVE, {
  limit: 5,
});
const allPitches = buildAllScoredPitchLines(qFuel, intentFuel, scoringFive);
ok("five-pitch-lines", allPitches.length === scoringFive.candidates.length, "");
const introThree = buildScoredCarPitchCopy(qFuel, intentFuel, scoringFive, {
  hasMore: true,
  ctaLine: "ดูการ์ด",
  displayCount: 3,
});
ok("intro-three-pitches", countPitchBlocks(introThree) >= 3, "");

console.log("\n--- sample: budget fuel ---");
console.log(orchFuel.text.slice(0, 500));
console.log("\n--- sample: ซื้อมือสองต้องดูอะไร ---");
console.log(orchAdvisor.text.slice(0, 400));

console.log("\n=== v5.4.8d buyer search polish — done ===\n");
