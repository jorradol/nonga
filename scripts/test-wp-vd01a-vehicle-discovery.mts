/**
 * WP-VD01A — Multi-turn vehicle discovery correction regression
 * npm run test:wp-vd01a-vehicle-discovery
 *
 * Calls production parser / discovery / ranker / orchestrator / selection /
 * finance routing — no mocked discovery logic.
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
  parsePreferNewerYear,
  runVehicleDiscovery,
  matchDiscoveryInventory,
  rankDiscoveryCandidates,
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
  loadActiveSelectedCarIdForUi,
  setActivePilotChatSessionId,
  saveChatCarContext,
  clearPilotChatSessionContext,
} from "../src/utils/chatCarContext.ts";
import type { ChatInventoryCar } from "../src/services/ai/chat/marketplaceChatSearch.ts";
import type { ChatCarCardData } from "../src/types.ts";
import type { VehicleDiscoveryCriteria } from "../src/services/ai/chat/vehicleDiscoveryTypes.ts";

const SESSION = "wp-vd01a-test-session";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

const INVENTORY: ChatInventoryCar[] = [
  {
    id: "hrv-2014",
    title: "Honda HR-V",
    brand: "Honda",
    model: "HR-V",
    year: 2014,
    price: 429000,
    mileage: 120000,
    transmission: "AT",
    bodyType: "SUV",
    listingStatus: "published",
    images: ["https://example.com/hrv14.jpg"],
  },
  {
    id: "hrv-2020",
    title: "Honda HR-V",
    brand: "Honda",
    model: "HR-V",
    year: 2020,
    price: 589000,
    mileage: 55000,
    transmission: "AT",
    bodyType: "SUV",
    listingStatus: "published",
    images: ["https://example.com/hrv20.jpg"],
  },
  {
    id: "vios-2019",
    title: "Toyota Vios",
    brand: "Toyota",
    model: "Vios",
    year: 2019,
    price: 389000,
    mileage: 72000,
    transmission: "เกียร์ออโต้",
    bodyType: "sedan",
    listingStatus: "published",
    images: ["https://example.com/vios.jpg"],
  },
  {
    id: "camry-2018",
    title: "Toyota Camry",
    brand: "Toyota",
    model: "Camry",
    year: 2018,
    price: 559000,
    mileage: 80000,
    transmission: "เกียร์ออโต้",
    bodyType: "sedan",
    listingStatus: "published",
    images: ["https://example.com/camry.jpg"],
  },
  {
    id: "fort-2020",
    title: "Toyota Fortuner",
    brand: "Toyota",
    model: "Fortuner",
    year: 2020,
    price: 899000,
    mileage: 40000,
    transmission: "เกียร์ออโต้",
    bodyType: "SUV",
    listingStatus: "published",
    images: ["https://example.com/fort.jpg"],
  },
  {
    id: "fake-unpublished",
    title: "Ghost Car",
    brand: "Ferrari",
    model: "Ghost",
    year: 2024,
    price: 100000,
    listingStatus: "hidden",
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
    bodyClass: /suv/i.test(String(car.bodyType)) ? "suv" : "sedan",
    bodyClassLabel: /suv/i.test(String(car.bodyType)) ? "SUV" : "Sedan",
    hasImage: true,
    imageUrl: car.images?.[0],
    detailPath: `/cars/${car.id}`,
    matchKind: "exact",
  };
}

const FORBIDDEN_FABRICATED =
  /(?:รับรองว่า(?:สินเชื่อ)?ผ่าน|ไฟแนนซ์ผ่านแน่นอน|ไม่เคยชน|นั่งสบาย|สภาพดี(?:ที่สุด)?|คุ้มที่สุด|เหมาะที่สุด|ช่วยพางาน\s*พาครอบครัว)/i;

console.log("=== WP-VD01A Multi-turn Discovery Correction ===\n");

memoryStore.clear();
setActivePilotChatSessionId(SESSION);
clearPilotChatSessionContext();

// --- A. budget 600k + family ---
{
  const msg = "มีงบไม่เกิน 600,000 บาท อยากได้รถครอบครัว";
  const c = parseVehicleDiscoveryCriteria(msg, { referenceYear: 2026 });
  ok("A-budget", c.budgetMax === 600_000, String(c.budgetMax));
  ok("A-family", c.usageTags?.includes("family") === true, "");
  const orch = tryOrchestrateChatReplyCore(msg, INVENTORY, {
    chatSessionId: SESSION,
  });
  ok("A-reply", Boolean(orch?.text), "");
  ok("A-cards", (orch?.carCards?.length ?? 0) > 0, "");
  // Classic family+budget path may use frozen pitch copy; fabrication guard is on discovery turns.
  ok(
    "A-real-ids",
    (orch?.carCards ?? []).every((card) =>
      INVENTORY.some((c) => c.id === card.id && c.listingStatus === "published")
    ),
    ""
  );
}

// Capture prior after A via orchestrator-saved context by re-parsing with merge
let prior: VehicleDiscoveryCriteria | null = parseVehicleDiscoveryCriteria(
  "มีงบไม่เกิน 600,000 บาท อยากได้รถครอบครัว",
  { referenceYear: 2026 }
);

// --- B. SUV + ปีใหม่ + 600k ---
{
  const msg = "อยากได้ SUV ปีใหม่ งบประมาณหกแสน";
  ok("B-prefer-newer-cue", parsePreferNewerYear(msg) === true, "");
  const c = parseVehicleDiscoveryCriteria(msg, {
    priorCriteria: prior,
    referenceYear: 2026,
  });
  ok("B-budget", c.budgetMax === 600_000, String(c.budgetMax));
  ok("B-suv", c.bodyHints?.includes("suv") === true, JSON.stringify(c.bodyHints));
  ok("B-prefer-newer", c.preferNewerYear === true, "");
  ok("B-no-invented-minYear", c.minYear == null, String(c.minYear));
  ok("B-sort-yearDesc", c.sort === "yearDesc", String(c.sort));

  const scored = tryBuyerScoredMarketplaceReply(msg, INVENTORY, {
    discoveryContext: { priorCriteria: prior, referenceYear: 2026 },
  });
  const ids = (scored?.carCards ?? []).map((x) => x.id);
  ok("B-hrv2020-before-2014", ids.indexOf("hrv-2020") < ids.indexOf("hrv-2014") || (ids[0] === "hrv-2020"), ids.join(","));
  ok("B-no-vios-exact", !ids.includes("vios-2019"), ids.join(","));
  ok(
    "B-exact-all-suv",
    (scored?.carCards ?? []).every((card) => {
      const inv = INVENTORY.find((c) => c.id === card.id);
      return /suv/i.test(String(inv?.bodyType));
    }),
    ""
  );
  ok("B-label-newer", /ปีใหม่|เน้นปีใหม่/.test(scored?.text ?? ""), "");
  ok("B-no-fabricated", !FORBIDDEN_FABRICATED.test(scored?.text ?? ""), "");

  const orch = tryOrchestrateChatReplyCore(msg, INVENTORY, {
    chatSessionId: SESSION,
  });
  const orchIds = (orch?.carCards ?? []).map((x) => x.id);
  ok(
    "B-orch-hrv2020-first",
    orchIds[0] === "hrv-2020",
    orchIds.join(",")
  );
  ok("B-orch-no-sedan", !orchIds.includes("vios-2019"), orchIds.join(","));

  prior = c;
}

// --- C. Toyota + automatic ---
{
  const msg = "อยากได้ Toyota เกียร์ออโต้";
  ok("C-facts-none", classifyBuyerFactsQuestion(msg) === "none", classifyBuyerFactsQuestion(msg));
  const c = parseVehicleDiscoveryCriteria(msg, {
    priorCriteria: prior,
    referenceYear: 2026,
  });
  ok("C-brand", c.brand === "Toyota", String(c.brand));
  ok("C-tx", c.transmission === "auto", String(c.transmission));
  ok("C-keep-budget", c.budgetMax === 600_000, String(c.budgetMax));
  ok("C-keep-suv", c.bodyHints?.includes("suv") === true, JSON.stringify(c.bodyHints));
  ok(
    "C-label-thai-tx",
    c.appliedLabels?.some((l) => /เกียร์อัตโนมัติ/.test(l)) === true,
    JSON.stringify(c.appliedLabels)
  );

  const orch = tryOrchestrateChatReplyCore(msg, INVENTORY, {
    chatSessionId: SESSION,
  });
  ok(
    "C-not-ask-select",
    !/กดดูรายละเอียดรถคันที่สนใจ/.test(orch?.text ?? ""),
    (orch?.text ?? "").slice(0, 100)
  );
  ok("C-searches", /เข้าใจเงื่อนไข|พบรถ|ไม่พบรถ/.test(orch?.text ?? ""), "");
  ok(
    "C-label-near-if-relaxed",
    (orch?.text ?? "").includes("ไม่พบ")
      ? /ใกล้เคียง|ต่าง/.test(orch?.text ?? "")
      : true,
    ""
  );
  prior = c;
}

// --- D. monthly 8000 ---
{
  const msg = "มีรถมือสองผ่อนประมาณเดือนละ 8,000 ไหม";
  const c = parseVehicleDiscoveryCriteria(msg, {
    priorCriteria: prior,
    referenceYear: 2026,
  });
  ok("D-monthly", c.estimatedMonthlyMax === 8000, String(c.estimatedMonthlyMax));
  ok("D-not-price-8000", c.budgetMax !== 8000 && (c.budgetMax ?? 0) > 100_000, String(c.budgetMax));
  ok("D-assumptions", c.financeAssumptions?.isEstimate === true, "");

  const orch = tryOrchestrateChatReplyCore(msg, INVENTORY, {
    chatSessionId: SESSION,
  });
  ok(
    "D-not-usage-clarify",
    !/ใช้รถแบบไหนเป็นหลัก/.test(orch?.text ?? ""),
    (orch?.text ?? "").slice(0, 120)
  );
  ok(
    "D-estimate-disclaimer",
    /ประมาณการ|สมมติฐาน|ไม่ใช่ผลอนุมัติ/.test(orch?.text ?? ""),
    ""
  );
  ok("D-no-approval", !/รับรอง|ผ่านแน่นอน/.test(orch?.text ?? ""), "");
  ok("D-facts-none", classifyBuyerFactsQuestion(msg) === "none", "");
  prior = c;
}

// --- E. selected → cheaper ---
{
  memoryStore.clear();
  setActivePilotChatSessionId(SESSION);
  clearPilotChatSessionContext();
  // Seed discovery context via a search turn
  tryOrchestrateChatReplyCore(
    "อยากได้ SUV ปีใหม่ งบประมาณหกแสน",
    INVENTORY,
    { chatSessionId: SESSION }
  );
  saveLastSelectedCarId("hrv-2020", SESSION);
  saveChatCarContext([toCard(INVENTORY.find((c) => c.id === "hrv-2020")!)], SESSION);

  const msg = "มีคันอื่นที่ถูกกว่านี้ไหม";
  const result = runVehicleDiscovery(msg, INVENTORY, {
    selectedListingId: "hrv-2020",
    contextCars: [toCard(INVENTORY.find((c) => c.id === "hrv-2020")!)],
    priorCriteria: {
      isDiscovery: true,
      budgetMax: 600_000,
      bodyHints: ["suv"],
      preferNewerYear: true,
    },
  });
  ok("E-refine-cheaper", result?.criteria.refineKind === "cheaper", "");
  ok(
    "E-budget-below",
    (result?.criteria.budgetMax ?? 0) < 589000,
    String(result?.criteria.budgetMax)
  );
  const allIds = [
    ...(result?.exactMatches ?? []).map((m) => m.listingId),
    ...(result?.nearAlternatives ?? []).map((m) => m.listingId),
  ];
  ok("E-exclude-selected", !allIds.includes("hrv-2020"), allIds.join(","));
  ok(
    "E-all-cheaper",
    [...(result?.exactMatches ?? []), ...(result?.nearAlternatives ?? [])].every(
      (m) => m.car.price < 589000
    ),
    ""
  );

  const orch = tryOrchestrateChatReplyCore(msg, INVENTORY, {
    chatSessionId: SESSION,
  });
  ok(
    "E-orch-exclude-selected",
    !(orch?.carCards ?? []).some((c) => c.id === "hrv-2020"),
    ""
  );
  ok(
    "E-selection-survives",
    loadActiveSelectedCarIdForUi(SESSION) === "hrv-2020",
    String(loadActiveSelectedCarIdForUi(SESSION))
  );
}

// --- F + J. selected → installment finance ---
{
  const msg = "คันนี้ผ่อนประมาณเท่าไร";
  ok("J-facts-none", classifyBuyerFactsQuestion(msg) === "none", "");
  ok("J-finance-intent", isSelectedCarFinanceIntent(msg) === true, "");
  ok(
    "J-not-bare-finance-without-price",
    isFinanceCalculatorIntent(msg) === false,
    ""
  );

  const orch = tryOrchestrateChatReplyCore(msg, INVENTORY, {
    chatSessionId: SESSION,
  });
  ok("F-has-reply", Boolean(orch?.text), "");
  ok(
    "F-names-car-or-price",
    /HR-V|589|Honda|ราคา/.test(orch?.text ?? ""),
    (orch?.text ?? "").slice(0, 160)
  );
  ok(
    "F-estimate",
    /ประมาณ|สมมติฐาน|ดาวน์|เดือน/.test(orch?.text ?? ""),
    ""
  );
  ok("F-no-approval", !/รับรองว่า|ผ่านแน่นอน/.test(orch?.text ?? ""), "");
  ok(
    "I-selection-after-finance",
    loadActiveSelectedCarIdForUi(SESSION) === "hrv-2020",
    String(loadActiveSelectedCarIdForUi(SESSION))
  );
}

// --- G. no exact → labelled near ---
{
  const result = runVehicleDiscovery(
    "อยากได้ Ferrari งบไม่เกิน 100000",
    INVENTORY
  );
  ok("G-no-exact", (result?.exactMatches.length ?? -1) === 0, "");
  ok(
    "G-honest",
    /ไม่พบรถที่ตรง/.test(result?.summaryText ?? ""),
    ""
  );
  if ((result?.nearAlternatives.length ?? 0) > 0) {
    ok(
      "G-labelled-near",
      /ใกล้เคียง|ต่าง/.test(result!.summaryText),
      ""
    );
  } else {
    ok("G-labelled-near", true, "empty near ok");
  }
}

// --- H. changed make/body replaces conflicting ---
{
  const t1 = parseVehicleDiscoveryCriteria("อยากได้ Honda ซีดาน งบ 500000");
  const t2 = parseVehicleDiscoveryCriteria("อยากได้ Toyota SUV", {
    priorCriteria: t1,
  });
  ok("H-brand-toyota", t2.brand === "Toyota", String(t2.brand));
  ok("H-body-suv", t2.bodyHints?.includes("suv") === true, JSON.stringify(t2.bodyHints));
  ok("H-no-sedan-hint", !t2.bodyHints?.includes("sedan"), JSON.stringify(t2.bodyHints));
  ok("H-keep-budget", t2.budgetMax === 500_000, String(t2.budgetMax));
}

// --- K. Sedan never exact SUV match ---
{
  const { exact } = matchDiscoveryInventory(INVENTORY, {
    isDiscovery: true,
    budgetMax: 600_000,
    bodyHints: ["suv"],
    preferNewerYear: true,
  });
  ok(
    "K-no-sedan-exact",
    exact.every((m) => !/sedan/i.test(String(m.car.bodyType))),
    exact.map((m) => m.listingId).join(",")
  );
  ok(
    "K-has-hrv",
    exact.some((m) => m.listingId === "hrv-2020"),
    ""
  );
  const ranked = rankDiscoveryCandidates(
    {
      isDiscovery: true,
      budgetMax: 600_000,
      bodyHints: ["suv"],
      preferNewerYear: true,
      sort: "yearDesc",
    },
    exact
  );
  ok(
    "K-year-order",
    ranked[0]?.listingId === "hrv-2020",
    ranked.map((m) => m.listingId).join(",")
  );
}

// --- L. no fabricated listing / finance / facts ---
{
  const result = runVehicleDiscovery(
    "อยากได้ SUV ปีใหม่ งบประมาณหกแสน",
    INVENTORY,
    { referenceYear: 2026 }
  );
  const pubIds = new Set(
    INVENTORY.filter((c) => c.listingStatus === "published").map((c) => c.id)
  );
  ok(
    "L-no-ghost-ids",
    (result?.allCarCards ?? []).every((c) => pubIds.has(c.id)),
    ""
  );
  ok("L-no-hidden", !(result?.allCarCards ?? []).some((c) => c.id === "fake-unpublished"), "");
  ok("L-no-fabricated-copy", !FORBIDDEN_FABRICATED.test(result?.summaryText ?? ""), "");
  ok(
    "L-reasons-from-data",
    (result?.exactMatches ?? []).every(
      (m) =>
        m.reasons.length === 0 ||
        m.reasons.some((r) => /ปี|ราคา|SUV|งบ|เกียร์|ยี่ห้อ|รุ่น/.test(r))
    ),
    ""
  );
}

// --- 6-turn state transition table (assert) ---
{
  console.log("\n--- Context transition table ---");
  let p: VehicleDiscoveryCriteria | null = null;
  const turns: Array<{ msg: string; note: string }> = [
    { msg: "มีงบไม่เกิน 600,000 บาท อยากได้รถครอบครัว", note: "set budget+family" },
    { msg: "อยากได้ SUV ปีใหม่ งบประมาณหกแสน", note: "replace body→suv, set preferNewer, keep budget" },
    { msg: "อยากได้ Toyota เกียร์ออโต้", note: "set brand+tx, keep budget/suv/preferNewer" },
    { msg: "มีรถมือสองผ่อนประมาณเดือนละ 8,000 ไหม", note: "set monthly, keep brand/body/tx" },
  ];
  for (const t of turns) {
    const c = parseVehicleDiscoveryCriteria(t.msg, {
      priorCriteria: p,
      referenceYear: 2026,
    });
    console.log(
      JSON.stringify({
        msg: t.msg,
        note: t.note,
        budget: c.budgetMax,
        body: c.bodyHints,
        brand: c.brand,
        tx: c.transmission,
        preferNewer: c.preferNewerYear,
        monthly: c.estimatedMonthlyMax,
      })
    );
    p = c;
  }
  ok("transition-ends-with-toyota-suv-monthly", p?.brand === "Toyota" && p?.bodyHints?.includes("suv") && p?.estimatedMonthlyMax === 8000, "");
}

console.log("\n=== WP-VD01A done ===\n");
