/**
 * v5.4.8b — buyer marketplace candidate scoring
 * npm run test:v548b-buyer-marketplace-scoring
 */
import { parseBuyerSearchIntent } from "../src/services/ai/chat/buyerSearchIntentParser.ts";
import {
  scoreBuyerMarketplaceCandidate,
  scoreBuyerMarketplaceCandidates,
} from "../src/services/ai/chat/buyerMarketplaceScoring.ts";
import type { ChatInventoryCar } from "../src/services/ai/chat/marketplaceChatSearch.ts";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const KM_PER_LITER_IN_TEXT = /km\/l|กม\.\/ลิตร|กิโลเมตรต่อลิตร/i;

const FIXTURE_BUDGET: ChatInventoryCar[] = [
  {
    id: "car-vios-budget",
    title: "Toyota Vios",
    brand: "Toyota",
    model: "Vios",
    year: 2018,
    price: 279_000,
    mileage: 88000,
    bodyType: "sedan",
    listingStatus: "published",
  },
  {
    id: "car-city-budget",
    title: "Honda City",
    brand: "Honda",
    model: "City",
    year: 2019,
    price: 295_000,
    mileage: 72000,
    bodyType: "sedan",
    listingStatus: "published",
  },
  {
    id: "car-city-over-slight",
    title: "Honda City RS",
    brand: "Honda",
    model: "City",
    year: 2020,
    price: 325_000,
    mileage: 55000,
    bodyType: "sedan",
    listingStatus: "published",
  },
  {
    id: "car-fortuner-over",
    title: "Toyota Fortuner",
    brand: "Toyota",
    model: "Fortuner",
    year: 2018,
    price: 890_000,
    mileage: 120000,
    bodyType: "suv",
    listingStatus: "published",
  },
];

const FIXTURE_FUEL: ChatInventoryCar[] = [
  {
    id: "car-city-eco",
    title: "Honda City",
    brand: "Honda",
    model: "City",
    year: 2020,
    price: 420_000,
    bodyType: "sedan",
    description: "รถใช้งานดี ขับในเมือง",
    listingStatus: "published",
  },
  {
    id: "car-mira-eco-desc",
    title: "Daihatsu Mira",
    brand: "Daihatsu",
    model: "Mira",
    year: 2019,
    price: 380_000,
    bodyType: "hatchback",
    description: "รถประหยัดน้ำมัน เหมาะเมือง",
    listingStatus: "published",
  },
  {
    id: "car-fortuner-fuel",
    title: "Toyota Fortuner",
    brand: "Toyota",
    model: "Fortuner",
    year: 2019,
    price: 950_000,
    bodyType: "suv",
    listingStatus: "published",
  },
];

const FIXTURE_FAMILY: ChatInventoryCar[] = [
  {
    id: "car-ertiga-7",
    title: "Suzuki Ertiga 7 ที่นั่ง",
    brand: "Suzuki",
    model: "Ertiga",
    year: 2021,
    price: 589_000,
    bodyType: "mpv",
    description: "รถครอบครัว 7 ที่นั่ง",
    listingStatus: "published",
  },
  {
    id: "car-crv-family",
    title: "Honda CR-V",
    brand: "Honda",
    model: "CR-V",
    year: 2019,
    price: 750_000,
    bodyType: "suv",
    description: "SUV ครอบครัว",
    listingStatus: "published",
  },
  {
    id: "car-city-family",
    title: "Honda City",
    brand: "Honda",
    model: "City",
    year: 2020,
    price: 450_000,
    bodyType: "sedan",
    listingStatus: "published",
  },
];

const FIXTURE_FIRST_CAR: ChatInventoryCar[] = [
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
    id: "car-lux-first",
    title: "BMW 520d",
    brand: "BMW",
    model: "520d",
    year: 2018,
    price: 1_450_000,
    bodyType: "sedan",
    listingStatus: "published",
  },
];

const FIXTURE_SPARSE: ChatInventoryCar[] = [
  {
    id: "car-only-pickup",
    title: "Isuzu D-Max",
    brand: "Isuzu",
    model: "D-Max",
    year: 2019,
    price: 620_000,
    bodyType: "pickup",
    listingStatus: "published",
  },
];

function allReasonText(result: ReturnType<typeof scoreBuyerMarketplaceCandidates>): string {
  return result.candidates
    .flatMap((c) => [...c.reasons, ...(c.cautions ?? [])])
    .join("\n");
}

console.log("=== Nong A v5.4.8b buyer marketplace scoring ===\n");

// --- budget 3 แสน ---
const intentBudget = parseBuyerSearchIntent("งบไม่เกิน 3 แสน");
ok("budget-intent-search", intentBudget.isVehicleSearch === true, "");
const budgetRank = scoreBuyerMarketplaceCandidates(intentBudget, FIXTURE_BUDGET, {
  limit: 5,
});
ok("budget-has-results", budgetRank.candidates.length >= 2, "");
ok(
  "budget-top-in-budget",
  budgetRank.candidates[0].car.price <= 300_000,
  `top=${budgetRank.candidates[0].car.id} price=${budgetRank.candidates[0].car.price}`
);
ok(
  "budget-fortuner-not-first",
  budgetRank.candidates[0].car.id !== "car-fortuner-over",
  `first=${budgetRank.candidates[0].car.id}`
);
const fortunerIdx = budgetRank.candidates.findIndex(
  (c) => c.car.id === "car-fortuner-over"
);
if (fortunerIdx >= 0) {
  ok(
    "budget-fortuner-low-rank",
    fortunerIdx >= 2,
    `idx=${fortunerIdx}`
  );
}
ok(
  "budget-top-reason",
  budgetRank.candidates[0].reasons.some((r) => /งบ/.test(r)),
  budgetRank.candidates[0].reasons.join("|")
);

// --- fuel efficient ---
const intentFuel = parseBuyerSearchIntent("งบไม่เกิน 3 แสน อยากได้รถประหยัดน้ำมัน");
const fuelRank = scoreBuyerMarketplaceCandidates(intentFuel, FIXTURE_FUEL, {
  limit: 5,
});
ok("fuel-top-not-suv", fuelRank.candidates[0].car.bodyType !== "suv", fuelRank.candidates[0].car.id);
ok(
  "fuel-mira-or-city-first",
  ["car-mira-eco-desc", "car-city-eco"].includes(fuelRank.candidates[0].car.id),
  fuelRank.candidates[0].car.id
);
ok(
  "fuel-fortuner-behind",
  fuelRank.candidates.findIndex((c) => c.car.id === "car-fortuner-fuel") >
    fuelRank.candidates.findIndex((c) => c.car.id === "car-mira-eco-desc"),
  ""
);

// --- family 7 seats ---
const intentFamily = parseBuyerSearchIntent("รถครอบครัว 7 ที่นั่งมีไหม");
const familyRank = scoreBuyerMarketplaceCandidates(intentFamily, FIXTURE_FAMILY, {
  limit: 5,
});
ok(
  "family-ertiga-first",
  familyRank.candidates[0].car.id === "car-ertiga-7",
  familyRank.candidates[0].car.id
);
ok(
  "family-reason-tone",
  familyRank.candidates[0].reasons.some((r) => /ครอบครัว|MPV|7/i.test(r)),
  familyRank.candidates[0].reasons.join("|")
);
ok(
  "family-city-behind-mpv",
  familyRank.candidates.findIndex((c) => c.car.id === "car-city-family") >
    familyRank.candidates.findIndex((c) => c.car.id === "car-ertiga-7"),
  ""
);

// --- first car advisor wording ---
const intentFirst = parseBuyerSearchIntent("รถคันแรก ดูแลง่าย ไม่จุกจิก");
const firstRank = scoreBuyerMarketplaceCandidates(intentFirst, FIXTURE_FIRST_CAR, {
  limit: 3,
});
const viosFirst = firstRank.candidates.find((c) => c.car.id === "car-vios-first");
ok("first-vios-ranked", viosFirst != null, "");
ok(
  "first-advisor-reason",
  (viosFirst?.reasons ?? []).some((r) =>
    /เหมาะกับการพิจารณาเป็นรถคันแรก/.test(r)
  ),
  viosFirst?.reasons.join("|") ?? ""
);
ok(
  "first-no-guarantee",
  ![...(viosFirst?.reasons ?? []), ...(viosFirst?.cautions ?? [])].some((r) =>
    /ไม่จุกจิกแน่นอน|ไม่เสีย/.test(r)
  ),
  ""
);
ok(
  "first-vios-before-luxury",
  firstRank.candidates[0].car.id === "car-vios-first",
  firstRank.candidates[0].car.id
);

// --- no km/l in reasons ---
const noKmText = allReasonText(fuelRank) + allReasonText(budgetRank) + allReasonText(familyRank);
ok("no-km-per-liter-claims", !KM_PER_LITER_IN_TEXT.test(noKmText), noKmText.slice(0, 120));

// --- sparse match caution ---
const intentCityOnly = parseBuyerSearchIntent("อยากได้รถใช้งานในเมือง");
const sparseRank = scoreBuyerMarketplaceCandidates(intentCityOnly, FIXTURE_SPARSE, {
  limit: 3,
});
ok(
  "sparse-global-caution",
  (sparseRank.cautions ?? []).some((c) => /ตัวเลือกตรงเงื่อนไขยังมีไม่มาก/.test(c)),
  JSON.stringify(sparseRank.cautions)
);
ok("sparse-still-returns", sparseRank.candidates.length >= 1, "");

// --- limit clamp ---
const limited = scoreBuyerMarketplaceCandidates(intentFamily, FIXTURE_FAMILY, {
  limit: 10,
});
ok("limit-max-5", limited.candidates.length <= 5, String(limited.candidates.length));

// --- hidden/sold filtered ---
const withHidden: ChatInventoryCar[] = [
  ...FIXTURE_BUDGET,
  {
    id: "car-hidden",
    title: "Hidden",
    brand: "Honda",
    model: "City",
    year: 2020,
    price: 200_000,
    listingStatus: "hidden",
  },
];
const hiddenRank = scoreBuyerMarketplaceCandidates(intentBudget, withHidden);
ok(
  "hidden-excluded",
  !hiddenRank.candidates.some((c) => c.car.id === "car-hidden"),
  ""
);

// --- non-search intent empty ---
const empty = scoreBuyerMarketplaceCandidates(
  { isVehicleSearch: false },
  FIXTURE_BUDGET
);
ok("non-search-empty", empty.candidates.length === 0, "");

// --- single candidate API ---
const single = scoreBuyerMarketplaceCandidate(intentBudget, FIXTURE_BUDGET[0]);
ok("single-score-positive", single.score > 0, String(single.score));

console.log("\n--- sample scoring (budget 3 แสน) ---");
for (const c of budgetRank.candidates.slice(0, 3)) {
  console.log(
    `  ${c.car.id} score=${c.score} price=${c.car.price}`,
    `\n    reasons: ${c.reasons.join(" | ") || "(none)"}`,
    c.cautions?.length ? `\n    cautions: ${c.cautions.join(" | ")}` : ""
  );
}

console.log("\n=== v5.4.8b buyer marketplace scoring — done ===\n");
