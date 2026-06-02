/**
 * v5.4.8a — buyer search intent parser foundation
 * npm run test:v548a-buyer-search-intent-parser
 */
import {
  parseBuyerSearchIntent,
  parseBuyerSearchBudgetMax,
  hasBuyerVehicleSearchSignals,
} from "../src/services/ai/chat/buyerSearchIntentParser.ts";
import { detectBuyerAdvisorTopic } from "../src/services/ai/chat/chatBuyerAdvisorTemplates.ts";
import { tryOrchestrateChatReply } from "../src/services/ai/chat/chatSearchOrchestrator.ts";
import { isMarketplaceSearchIntent } from "../src/services/ai/chat/marketplaceChatSearch.ts";
import type { ChatInventoryCar } from "../src/services/ai/chat/marketplaceChatSearch.ts";

const INVENTORY: ChatInventoryCar[] = [
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

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function includesAll(hay: string[] | undefined, needles: string[]) {
  if (!hay) return false;
  return needles.every((n) => hay.includes(n));
}

console.log("=== Nong A v5.4.8a buyer search intent parser ===\n");

// --- budget parsing ---
ok(
  "budget-3-san",
  parseBuyerSearchBudgetMax("งบไม่เกิน 3 แสน") === 300_000,
  String(parseBuyerSearchBudgetMax("งบไม่เกิน 3 แสน"))
);
ok(
  "budget-5-san",
  parseBuyerSearchBudgetMax("ต่ำกว่า 5 แสน") === 500_000,
  ""
);
ok(
  "budget-300k-digits",
  parseBuyerSearchBudgetMax("ไม่เกิน 300000") === 300_000,
  ""
);
ok(
  "budget-1-lan",
  parseBuyerSearchBudgetMax("ไม่เกิน 1 ล้าน") === 1_000_000,
  ""
);

// --- required regression cases ---
const case1 = parseBuyerSearchIntent("งบไม่เกิน 3 แสน อยากได้รถประหยัดน้ำมัน");
ok("c1-vehicle-search", case1.isVehicleSearch === true, "");
ok("c1-budget", case1.budgetMax === 300_000, String(case1.budgetMax));
ok(
  "c1-fuel-tag",
  includesAll(case1.usageTags, ["fuelEfficient"]),
  JSON.stringify(case1.usageTags)
);

const case2 = parseBuyerSearchIntent("รถครอบครัว 7 ที่นั่งมีไหม");
ok("c2-vehicle-search", case2.isVehicleSearch === true, "");
ok("c2-seats", case2.seatsMin === 7, String(case2.seatsMin));
ok(
  "c2-family-tag",
  includesAll(case2.usageTags, ["family"]),
  JSON.stringify(case2.usageTags)
);
ok(
  "c2-mpv-hint",
  case2.bodyTypeHints?.includes("mpv") === true,
  JSON.stringify(case2.bodyTypeHints)
);

const case3 = parseBuyerSearchIntent("รถคันแรก ดูแลง่าย ไม่จุกจิก");
ok("c3-vehicle-search", case3.isVehicleSearch === true, "");
ok(
  "c3-tags",
  includesAll(case3.usageTags, ["firstCar", "easyMaintenance", "lowMaintenance"]),
  JSON.stringify(case3.usageTags)
);

const case4 = parseBuyerSearchIntent("อยากได้รถใช้งานในเมือง");
ok("c4-vehicle-search", case4.isVehicleSearch === true, "");
ok(
  "c4-city-tag",
  includesAll(case4.usageTags, ["city"]),
  JSON.stringify(case4.usageTags)
);
ok("c4-clarify-budget", case4.needsClarification === true, "");

const case5 = parseBuyerSearchIntent("มีรถผ่อนเบา ๆ ไหม");
ok("c5-vehicle-search", case5.isVehicleSearch === true, "");
ok("c5-finance-intent", case5.financeIntent === true, "");
ok(
  "c5-no-budget-invented",
  case5.budgetMax == null,
  String(case5.budgetMax)
);

// --- advisor: not forced vehicle search ---
const advisorQs = [
  "ซื้อรถมือสองต้องดูอะไร",
  "รถน้ำท่วมดูยังไง",
  "ไฟแนนซ์ต้องเตรียมอะไร",
  "ดาวน์เท่าไหร่ดี",
  "แนะนำรถหน่อย",
  "มีอะไรน่าสนใจบ้าง",
];

for (const q of advisorQs) {
  const parsed = parseBuyerSearchIntent(q);
  ok(`advisor-not-search:${q.slice(0, 12)}`, parsed.isVehicleSearch === false, "");
  if (detectBuyerAdvisorTopic(q) || /แนะนำ|มีอะไร/.test(q)) {
    const orch = tryOrchestrateChatReply(q, INVENTORY);
    ok(
      `advisor-no-cards:${q.slice(0, 12)}`,
      orch != null && orch.carCards.length === 0,
      `cards=${orch?.carCards.length ?? "null"}`
    );
  }
}

// --- hasBuyerVehicleSearchSignals ---
ok(
  "signals-budget-fuel",
  hasBuyerVehicleSearchSignals("งบไม่เกิน 3 แสน อยากได้รถประหยัดน้ำมัน"),
  ""
);
ok(
  "signals-advisor-false",
  !hasBuyerVehicleSearchSignals("ซื้อรถมือสองต้องดูอะไร"),
  ""
);

// --- no hallucinated fuel economy numbers in parser output ---
const fuelCase = parseBuyerSearchIntent("อยากได้รถประหยัดน้ำมัน");
ok(
  "no-km-per-liter-field",
  !("kmPerLiter" in (fuelCase as object)),
  ""
);

// --- existing marketplace intent unchanged for explicit searches ---
ok(
  "marketplace-still-camry",
  isMarketplaceSearchIntent("มี Camry ไม่เกิน 1 ล้านไหม"),
  ""
);
ok(
  "marketplace-not-vague",
  !isMarketplaceSearchIntent("แนะนำรถหน่อย"),
  ""
);

console.log("\n=== v5.4.8a buyer search intent parser — done ===\n");
