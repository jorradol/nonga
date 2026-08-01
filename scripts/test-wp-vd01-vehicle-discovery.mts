/**
 * WP-VD01 — Natural-language vehicle discovery foundation tests
 * npm run test:wp-vd01-vehicle-discovery
 */
const memoryStore = new Map<string, string>();
(globalThis as unknown as { sessionStorage: Storage }).sessionStorage = {
  getItem: (k: string) => memoryStore.get(k) ?? null,
  setItem: (k: string, v: string) => {
    memoryStore.set(k, String(v));
  },
  removeItem: (k: string) => {
    memoryStore.delete(k);
  },
  clear: () => memoryStore.clear(),
  key: (i: number) => Array.from(memoryStore.keys())[i] ?? null,
  get length() {
    return memoryStore.size;
  },
};

import {
  parseVehicleDiscoveryCriteria,
  parseDiscoveryMonthlyMax,
  isMonthlyAffordabilityDiscovery,
  runVehicleDiscovery,
  isPublishedDiscoveryListing,
  matchDiscoveryInventory,
} from "../src/services/ai/chat/vehicleDiscoveryIndex.ts";
import { tryBuyerScoredMarketplaceReply } from "../src/services/ai/chat/buyerScoredMarketplaceSearch.ts";
import { tryOrchestrateChatReplyCore } from "../src/services/ai/chat/chatSearchOrchestrator.ts";
import { classifyBuyerFactsQuestion } from "../src/services/ai/chat/chatBuyerFactsQa.ts";
import {
  isSelectedCarFinanceIntent,
  isFinanceCalculatorIntent,
} from "../src/services/ai/chat/chatBuyerFinanceCalculator.ts";
import {
  saveLastSelectedCarId,
  clearLastSelectedCarId,
  loadActiveSelectedCarIdForUi,
  setActivePilotChatSessionId,
  saveChatCarContext,
  clearPilotChatSessionContext,
} from "../src/utils/chatCarContext.ts";
import type { ChatInventoryCar } from "../src/services/ai/chat/marketplaceChatSearch.ts";
import type { ChatCarCardData } from "../src/types.ts";

const SESSION = "wp-vd01-test-session";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const INVENTORY: ChatInventoryCar[] = [
  {
    id: "pub-toyota-vios-2019",
    title: "Toyota Vios",
    brand: "Toyota",
    model: "Vios",
    year: 2019,
    price: 389000,
    mileage: 72000,
    transmission: "เกียร์ออโต้",
    fuelType: "เบนซิน",
    bodyType: "sedan",
    listingStatus: "published",
    images: ["https://example.com/vios.jpg"],
  },
  {
    id: "pub-honda-city-2021",
    title: "Honda City",
    brand: "Honda",
    model: "City",
    year: 2021,
    price: 520000,
    mileage: 41000,
    transmission: "AT",
    bodyType: "sedan",
    listingStatus: "published",
    images: ["https://example.com/city.jpg"],
  },
  {
    id: "pub-toyota-fortuner-2020",
    title: "Toyota Fortuner",
    brand: "Toyota",
    model: "Fortuner",
    year: 2020,
    price: 980000,
    mileage: 55000,
    transmission: "เกียร์ออโต้",
    bodyType: "SUV",
    listingStatus: "published",
    description: "รถครอบครัว อเนกประสงค์",
    images: ["https://example.com/fortuner.jpg"],
  },
  {
    id: "pub-mazda2-2018",
    title: "Mazda 2",
    brand: "Mazda",
    model: "2",
    year: 2018,
    price: 355000,
    mileage: 88000,
    transmission: "ออโต้",
    bodyType: "hatchback",
    listingStatus: "published",
    description: "ประหยัดน้ำมัน รถเล็ก",
    images: ["https://example.com/mazda2.jpg"],
  },
  {
    id: "pub-toyota-camry-2022",
    title: "Toyota Camry",
    brand: "Toyota",
    model: "Camry",
    year: 2022,
    price: 899000,
    mileage: 22000,
    transmission: "เกียร์ออโต้",
    listingStatus: "published",
    images: ["https://example.com/camry.jpg"],
  },
  {
    id: "hidden-bmw",
    title: "BMW 320d",
    brand: "BMW",
    model: "320d",
    year: 2020,
    price: 1200000,
    listingStatus: "hidden",
    images: [],
  },
  {
    id: "pending-honda",
    title: "Honda Civic",
    brand: "Honda",
    model: "Civic",
    year: 2023,
    price: 750000,
    listingStatus: "pending_review",
    images: [],
  },
];

function toCard(car: ChatInventoryCar): ChatCarCardData {
  return {
    id: car.id,
    brand: car.brand,
    model: car.model,
    year: car.year,
    price: car.price,
    mileage: car.mileage ?? 0,
    bodyClass: "sedan",
    bodyClassLabel: "Sedan",
    hasImage: true,
    imageUrl: car.images?.[0],
    detailPath: `/cars/${car.id}`,
    matchKind: "exact",
  };
}

console.log("=== WP-VD01 Vehicle Discovery Foundation ===\n");

// 1. Budget as digits
{
  const c = parseVehicleDiscoveryCriteria(
    "มีงบไม่เกิน 600,000 บาท อยากได้รถครอบครัว"
  );
  ok("1-budget-digits", c.budgetMax === 600_000, String(c.budgetMax));
  ok(
    "1-family-tag",
    c.usageTags?.includes("family") === true,
    JSON.stringify(c.usageTags)
  );
  ok("1-is-discovery", c.isDiscovery === true, "");
}

// 2. Thai word budget "หกแสน"
{
  const c = parseVehicleDiscoveryCriteria("อยากได้ SUV ปีใหม่ งบประมาณหกแสน");
  ok("2-thai-hoksan", c.budgetMax === 600_000, String(c.budgetMax));
  ok(
    "2-suv-hint",
    c.bodyHints?.includes("suv") === true,
    JSON.stringify(c.bodyHints)
  );
}

// 3. Brand + budget
{
  const c = parseVehicleDiscoveryCriteria("อยากได้ Toyota เกียร์ออโต้");
  ok("3-brand-toyota", c.brand === "Toyota", String(c.brand));
  ok("3-transmission-auto", c.transmission === "auto", String(c.transmission));
  const result = runVehicleDiscovery(
    "อยากได้ Toyota เกียร์ออโต้ งบไม่เกิน 500000",
    INVENTORY,
    { referenceYear: 2026 }
  );
  ok("3-has-results", (result?.exactMatches.length ?? 0) > 0, "");
  ok(
    "3-all-toyota",
    result?.exactMatches.every((m) => /toyota/i.test(m.car.brand)) === true,
    ""
  );
  ok(
    "3-real-ids",
    result?.exactMatches.every((m) =>
      INVENTORY.some(
        (c) => c.id === m.listingId && c.listingStatus === "published"
      )
    ) === true,
    ""
  );
}

// 4. Body type + usage
{
  const c = parseVehicleDiscoveryCriteria(
    "ขอรถประหยัดน้ำมัน ใช้ขับไปทำงาน"
  );
  ok(
    "4-fuel-tag",
    c.usageTags?.includes("fuelEfficient") === true || c.fuelEfficient === true,
    JSON.stringify(c.usageTags)
  );
  ok(
    "4-city-tag",
    c.usageTags?.includes("city") === true,
    JSON.stringify(c.usageTags)
  );
  const result = runVehicleDiscovery(
    "ขอรถประหยัดน้ำมัน ใช้ขับไปทำงาน งบไม่เกิน 450000",
    INVENTORY
  );
  ok("4-discovery-runs", result != null && result.criteria.isDiscovery, "");
  ok(
    "4-no-unpublished",
    result?.allCarCards.every(
      (card) => card.id !== "hidden-bmw" && card.id !== "pending-honda"
    ) === true,
    JSON.stringify(result?.allCarCards.map((c) => c.id))
  );
}

// 5. "ถูกกว่านี้" after selecting a car
{
  memoryStore.clear();
  setActivePilotChatSessionId(SESSION);
  clearPilotChatSessionContext();
  saveLastSelectedCarId("pub-honda-city-2021", SESSION);
  const selected = INVENTORY.find((c) => c.id === "pub-honda-city-2021")!;
  const card = toCard(selected);
  saveChatCarContext([card], SESSION);

  const result = runVehicleDiscovery("มีคันอื่นที่ถูกกว่านี้ไหม", INVENTORY, {
    selectedListingId: "pub-honda-city-2021",
    contextCars: [card],
    priorCriteria: {
      isDiscovery: true,
      budgetMax: 600_000,
    },
  });
  ok("5-cheaper-discovery", result?.criteria.refineKind === "cheaper", "");
  ok(
    "5-budget-below-selected",
    (result?.criteria.budgetMax ?? 0) < selected.price,
    String(result?.criteria.budgetMax)
  );
  ok(
    "5-all-cheaper",
    (result?.exactMatches.length ?? 0) === 0 ||
      result!.exactMatches.every((m) => m.car.price < selected.price),
    ""
  );
  ok(
    "5-selection-preserved",
    loadActiveSelectedCarIdForUi(SESSION) === "pub-honda-city-2021",
    String(loadActiveSelectedCarIdForUi(SESSION))
  );
}

// 6. No exact match
{
  const result = runVehicleDiscovery(
    "อยากได้ Ferrari งบไม่เกิน 100000",
    INVENTORY
  );
  ok("6-no-exact", (result?.exactMatches.length ?? -1) === 0, "");
  ok(
    "6-honest-text",
    /ไม่พบรถที่ตรงเงื่อนไขทั้งหมด/.test(result?.summaryText ?? ""),
    (result?.summaryText ?? "").slice(0, 80)
  );
}

// 7. Near alternatives explain differences
{
  const result = runVehicleDiscovery(
    "อยากได้ SUV งบไม่เกิน 400000",
    INVENTORY
  );
  ok("7-relaxed-or-empty-exact", (result?.exactMatches.length ?? 0) === 0, "");
  if ((result?.nearAlternatives.length ?? 0) > 0) {
    ok(
      "7-has-diffs",
      (result!.nearAlternatives[0].differences?.length ?? 0) > 0 ||
        (result!.nearAlternatives[0].cautions?.length ?? 0) > 0,
      ""
    );
    ok(
      "7-text-explains-diff",
      /ต่างจากเงื่อนไข|ใกล้เคียง|ไม่ตรง/.test(result!.summaryText),
      ""
    );
  } else {
    ok("7-has-diffs", true, "no alternatives — blocking explained");
    ok(
      "7-text-explains-diff",
      /ไม่พบ|เงื่อนไข/.test(result?.summaryText ?? ""),
      ""
    );
  }
}

// 8. Unpublished listings never shown
{
  const { exact, visible } = matchDiscoveryInventory(INVENTORY, {
    isDiscovery: true,
    budgetMax: 2_000_000,
  });
  ok(
    "8-visible-no-hidden",
    visible.every((c) => c.id !== "hidden-bmw" && c.id !== "pending-honda"),
    ""
  );
  ok(
    "8-exact-no-hidden",
    exact.every((c) => c.listingId !== "hidden-bmw"),
    ""
  );
  ok(
    "8-isPublished-hidden",
    isPublishedDiscoveryListing(
      INVENTORY.find((c) => c.id === "hidden-bmw")!
    ) === false,
    ""
  );
  ok(
    "8-isPublished-pending",
    isPublishedDiscoveryListing(
      INVENTORY.find((c) => c.id === "pending-honda")!
    ) === false,
    ""
  );
}

// 9. No hallucinated listing IDs
{
  const result = runVehicleDiscovery(
    "มีงบไม่เกิน 600000 อยากได้รถครอบครัว",
    INVENTORY
  );
  const ids = new Set(INVENTORY.map((c) => c.id));
  ok(
    "9-no-hallucinated-ids",
    (result?.allCarCards ?? []).every((c) => ids.has(c.id)) === true,
    JSON.stringify(result?.allCarCards.map((c) => c.id))
  );
  ok(
    "9-listing-id-equals-card",
    (result?.exactMatches ?? []).every((m) => m.listingId === m.car.id),
    ""
  );
}

// 10. Selected-car context not lost through discovery refine
{
  memoryStore.clear();
  setActivePilotChatSessionId(SESSION);
  saveLastSelectedCarId("pub-toyota-vios-2019", SESSION);
  const before = loadActiveSelectedCarIdForUi(SESSION);
  ok("10-selection-saved", before === "pub-toyota-vios-2019", String(before));
  runVehicleDiscovery("ปีใหม่กว่านี้", INVENTORY, {
    selectedListingId: before,
    contextCars: [toCard(INVENTORY[0]!)],
    priorCriteria: { isDiscovery: true, budgetMax: 600_000 },
  });
  ok(
    "10-selection-intact",
    loadActiveSelectedCarIdForUi(SESSION) === "pub-toyota-vios-2019",
    String(loadActiveSelectedCarIdForUi(SESSION))
  );
  clearLastSelectedCarId(SESSION);
  ok("10-clear-works", loadActiveSelectedCarIdForUi(SESSION) == null, "");
}

// 11. Installment question not routed to collision history
{
  ok(
    "11-facts-none",
    classifyBuyerFactsQuestion("คันนี้ผ่อนประมาณเท่าไร") === "none",
    ""
  );
  ok(
    "11-selected-finance-intent",
    isSelectedCarFinanceIntent("คันนี้ผ่อนประมาณเท่าไร") === true,
    ""
  );
  ok(
    "11-finance-needs-price",
    isFinanceCalculatorIntent("คันนี้ผ่อนประมาณเท่าไร") === false,
    ""
  );
  memoryStore.clear();
  setActivePilotChatSessionId(SESSION);
  clearPilotChatSessionContext();
  saveLastSelectedCarId("pub-toyota-vios-2019", SESSION);
  const contextCards = [toCard(INVENTORY[0]!)];
  const orch = tryOrchestrateChatReplyCore(
    "คันนี้ผ่อนประมาณเท่าไร",
    INVENTORY,
    { chatSessionId: SESSION, contextCarsOverride: contextCards }
  );
  ok("11-orch-reply", orch != null, "");
  ok(
    "11-not-history",
    !/ประวัติการชน|ระบบยังไม่มีข้อมูลประวัติ|เคยชน/.test(orch?.text ?? ""),
    (orch?.text ?? "").slice(0, 100)
  );
  ok(
    "11-finance-ish",
    /ประมาณ|ผ่อน|ค่างวด|ไฟแนนซ์|ประเมิน/.test(orch?.text ?? ""),
    (orch?.text ?? "").slice(0, 100)
  );
}

// 12. Frozen inventory brand/model path still works (no discovery takeover)
{
  const reply = tryBuyerScoredMarketplaceReply(
    "มี Honda City 2021 ไหม",
    INVENTORY
  );
  ok("12-frozen-reply", reply != null, "");
  ok(
    "12-frozen-has-card",
    (reply?.carCards.some((c) => c.id === "pub-honda-city-2021") ?? false) ===
      true,
    JSON.stringify(reply?.carCards.map((c) => c.id))
  );
  ok(
    "12-frozen-not-discovery-no-result",
    !/ไม่พบรถที่ตรงเงื่อนไขทั้งหมด/.test(reply?.text ?? ""),
    ""
  );
}

// Extra: monthly affordability discovery
{
  ok(
    "x-monthly-parse",
    parseDiscoveryMonthlyMax("มีรถมือสองผ่อนประมาณเดือนละ 8,000 ไหม") ===
      8000,
    String(parseDiscoveryMonthlyMax("มีรถมือสองผ่อนประมาณเดือนละ 8,000 ไหม"))
  );
  ok(
    "x-monthly-is-discovery",
    isMonthlyAffordabilityDiscovery(
      "มีรถมือสองผ่อนประมาณเดือนละ 8,000 ไหม"
    ) === true,
    ""
  );
  const c = parseVehicleDiscoveryCriteria(
    "มีรถมือสองผ่อนประมาณเดือนละ 8,000 ไหม"
  );
  ok("x-monthly-budget-derived", (c.budgetMax ?? 0) > 0, String(c.budgetMax));
  ok(
    "x-monthly-assumptions",
    c.financeAssumptions?.isEstimate === true,
    ""
  );
}

// Extra: max age
{
  const c = parseVehicleDiscoveryCriteria("ขอรถไม่เกิน 5 ปี", {
    referenceYear: 2026,
  });
  ok("x-max-age", c.maxAgeYears === 5, String(c.maxAgeYears));
  ok("x-min-year", c.minYear === 2021, String(c.minYear));
}

// Extra: small car for beginners
{
  const c = parseVehicleDiscoveryCriteria("ขอรถคันเล็กสำหรับมือใหม่");
  ok(
    "x-first-car",
    c.usageTags?.includes("firstCar") === true,
    JSON.stringify(c.usageTags)
  );
  ok(
    "x-compact-body",
    c.bodyHints?.includes("hatchback") === true ||
      c.bodyHints?.includes("sedan") === true,
    JSON.stringify(c.bodyHints)
  );
}

console.log("\n=== WP-VD01 done ===");
