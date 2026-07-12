/**
 * v22.54 — Buyer search precision + lead budget extraction (no live Lead submit).
 * npm run test:v22.54
 */
import fs from "node:fs";
import path from "node:path";
import { tryOrchestrateChatReply } from "../src/services/ai/chat/chatSearchOrchestrator.ts";
import {
  parseMarketplaceSearchQuery,
  runMarketplaceChatSearch,
  type ChatInventoryCar,
} from "../src/services/ai/chat/marketplaceChatSearch.ts";
import { buildGeneralModelContext } from "../src/services/ai/chat/vehicleModelContext.ts";
import {
  beginBuyerLeadCaptureWithListing,
  clearBuyerLeadCaptureContext,
  draftToCreateInput,
  getBuyerLeadCaptureContext,
  listMissingBuyerLeadFields,
  mergeBuyerLeadFieldsFromMessage,
  processBuyerLeadCaptureTurn,
  setBuyerLeadCaptureContextForTest,
} from "../src/services/leads/buyerLeadCaptureFlow.ts";
import {
  parseBahtFromThaiText,
  parseNaturalBuyerLeadText,
} from "../src/services/leads/buyerLeadTextParser.ts";
import {
  NONGA_LEAD_CAPTURE_ENABLED_ENV,
  isLeadCaptureEnabled,
} from "../src/services/leads/leadCaptureFlags.ts";
import {
  createConsentedBuyerLead,
  parseBuyerLeadCreateBody,
  resolveListingSellerId,
} from "../src/services/leads/buyerLeadService.ts";
import {
  createBuyerLeadRepository,
  resetBuyerLeadRepositoryForTests,
} from "../src/server/repositories/buyerLeadRepository.ts";
import { BUYER_LEAD_CONSENT_VERSION } from "../src/services/leads/buyerLeadValidation.ts";
import {
  BUYER_LEAD_PILOT_LIMIT_MESSAGE,
  DEFAULT_LEAD_PILOT_COUNTER_ID,
  NONGA_LEAD_PILOT_COUNTER_ID_ENV,
  NONGA_LEAD_PILOT_DEALER_IDS_ENV,
  NONGA_LEAD_PILOT_EXPIRES_AT_ENV,
  NONGA_LEAD_PILOT_LISTING_IDS_ENV,
  NONGA_LEAD_PILOT_MAX_CREATED_ENV,
  NONGA_LEAD_PILOT_STARTED_AT_ENV,
  evaluatePilotCreateGate,
} from "../src/services/leads/leadPilotGuard.ts";

let failures = 0;
function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) {
    failures += 1;
    process.exitCode = 1;
  }
}

function read(rel: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), rel), "utf8");
}

const INVENTORY: ChatInventoryCar[] = [
  {
    id: "camry-2019",
    title: "Toyota Camry ปี 2019",
    brand: "Toyota",
    model: "Camry",
    year: 2019,
    price: 699000,
    mileage: 70000,
    listingStatus: "published",
  },
  {
    id: "vios-2020",
    title: "Toyota Vios ปี 2020",
    brand: "Toyota",
    model: "Vios",
    year: 2020,
    price: 399000,
    mileage: 50000,
    listingStatus: "published",
  },
  {
    id: "corolla-2020",
    title: "Toyota Corolla ปี 2020",
    brand: "Toyota",
    model: "Corolla",
    year: 2020,
    price: 399000,
    mileage: 88000,
    showroomName: "Thor Auto",
    listingStatus: "published",
  },
  {
    id: "corolla-2020-b",
    title: "Toyota Corolla ปี 2020",
    brand: "Toyota",
    model: "Corolla",
    year: 2020,
    price: 429000,
    mileage: 62000,
    showroomName: "Thor Auto",
    listingStatus: "published",
  },
  {
    id: "corolla-2021",
    title: "Toyota Corolla ปี 2021",
    brand: "Toyota",
    model: "Corolla",
    year: 2021,
    price: 459000,
    mileage: 41000,
    showroomName: "Thor Auto",
    listingStatus: "published",
  },
  {
    id: "honda-city",
    title: "Honda City ปี 2020",
    brand: "Honda",
    model: "City",
    year: 2020,
    price: 420000,
    mileage: 40000,
    listingStatus: "published",
  },
];

console.log("=== v22.54 Search Precision ===\n");

{
  const q = "มีรถ โตโยต้า Corolla 2020 ไหม";
  const criteria = parseMarketplaceSearchQuery(q)!;
  ok("thai brand+Corolla+bare year → model", criteria.model === "Corolla", JSON.stringify(criteria));
  ok("thai brand+Corolla+bare year → year", criteria.year === 2020, JSON.stringify(criteria));
  ok("thai brand+Corolla+bare year → brand", criteria.brand === "Toyota", JSON.stringify(criteria));

  const result = runMarketplaceChatSearch(q, INVENTORY)!;
  ok("exact Corolla 2020 first", result.primary[0]?.id === "corolla-2020" || result.primary[0]?.model === "Corolla");
  ok(
    "only Corolla 2020 in primary",
    result.primary.every((c) => c.model === "Corolla" && c.year === 2020),
    result.primary.map((c) => `${c.model}${c.year}`).join(",")
  );
  ok("no Camry in primary", !result.primary.some((c) => /Camry/i.test(c.model)));
  ok("no Vios in primary", !result.primary.some((c) => /Vios/i.test(c.model)));

  const reply = tryOrchestrateChatReply(q, INVENTORY)!;
  ok("direct Corolla answer", /Corolla/i.test(reply.text) && /2020/.test(reply.text), reply.text.slice(0, 120));
  ok("no Camry general description", !/Camry/i.test(reply.text), reply.text.slice(0, 200));
  ok(
    "Corolla general context",
    /Corolla/i.test(reply.text) && /ข้อมูลทั่วไปของรุ่น/.test(reply.text),
    reply.text.slice(0, 280)
  );
  ok(
    "no unrelated model recommendation as primary pitch",
    !/ลองโฟกัส Toyota Camry|แนะนำ.*Camry|โฟกัส.*Vios/i.test(reply.text)
  );
  ok("marketplace facts from listing", /399,000|399000|88,000|88000/.test(reply.text.replace(/,/g, "")));
}

{
  const q = "มี Toyota Corolla ปี 2020 ไหม";
  const criteria = parseMarketplaceSearchQuery(q)!;
  ok("EN Corolla year labeled", criteria.model === "Corolla" && criteria.year === 2020);
  const reply = tryOrchestrateChatReply(q, INVENTORY)!;
  ok("EN query Corolla first card", reply.carCards[0]?.model === "Corolla" && reply.carCards[0]?.year === 2020);
}

{
  const q = "มี Corolla 2020 หรือเปล่า";
  const criteria = parseMarketplaceSearchQuery(q)!;
  ok("model-only Corolla+year", criteria.model === "Corolla" && criteria.year === 2020, JSON.stringify(criteria));
  const result = runMarketplaceChatSearch(q, INVENTORY)!;
  ok(
    "model-only prioritizes Corolla",
    result.primary.every((c) => c.model === "Corolla" && c.year === 2020)
  );
}

{
  const result = runMarketplaceChatSearch("มี Toyota Corolla ปี 2020 ไหม", INVENTORY)!;
  ok("multiple exact matches counted", result.primary.length === 2);
  const reply = tryOrchestrateChatReply("มี Toyota Corolla ปี 2020 ไหม", INVENTORY)!;
  ok("multi exact states count", /2\s*คัน/.test(reply.text));
}

{
  const result = runMarketplaceChatSearch("มี Toyota Corolla ปี 2018 ไหม", INVENTORY)!;
  ok("no exact year → empty primary", result.primary.length === 0);
  ok("nearby same-model alternatives", result.alternatives.length > 0 && result.alternatives.every((c) => c.model === "Corolla"));
  ok(
    "clear no-match before alternatives",
    /ยังไม่เจอ/.test(result.introText) && /ทางเลือกใกล้เคียง|ปีใกล้เคียง/.test(result.introText),
    result.introText.slice(0, 160)
  );
}

{
  const result = runMarketplaceChatSearch("มีรถ โตโยต้า ไหม", INVENTORY)!;
  ok(
    "make-only may return multiple Toyota models",
    result.primary.length >= 2 &&
      new Set(result.primary.map((c) => c.model)).size >= 2
  );
}

{
  const result = runMarketplaceChatSearch("มี Vios ไหม", INVENTORY)!;
  ok("model-only prioritizes Vios", result.primary.every((c) => /Vios/i.test(c.model)));
}

{
  const withYear = parseMarketplaceSearchQuery("มี Corolla 2020 ไหม")!;
  const noYearIgnored = parseMarketplaceSearchQuery("มี Corolla ปี 2021 ไหม")!;
  ok("year not silently ignored (2020)", withYear.year === 2020);
  ok("year not silently ignored (2021)", noYearIgnored.year === 2021);
  const r2021 = runMarketplaceChatSearch("มี Corolla ปี 2021 ไหม", INVENTORY)!;
  ok("year filter applied", r2021.primary.every((c) => c.year === 2021));
}

{
  const ctx = buildGeneralModelContext({ brand: "Toyota", model: "Corolla", year: 2020 });
  ok("general description matches Corolla", /Corolla/i.test(ctx) && !/Camry/i.test(ctx));
}

console.log("\n=== v22.54 Lead Budget Extraction ===\n");

{
  const cases: Array<{ name: string; msg: string; budget: number }> = [
    { name: "ตั้งงบเอาไว้ที่", msg: "ตั้งงบเอาไว้ที่ 350,000", budget: 350000 },
    { name: "งบ bare", msg: "งบ 350000", budget: 350000 },
    { name: "งบประมาณ บาท", msg: "งบประมาณ 350,000 บาท", budget: 350000 },
  ];
  for (const c of cases) {
    const r = parseNaturalBuyerLeadText(c.msg);
    ok(`${c.name} extracts budget`, r.budgetMax === c.budget, String(r.budgetMax));
  }
}

{
  // Thai word-number "สามแสนห้าหมื่น" is not supported by current digit/แสน parser.
  const r = parseNaturalBuyerLeadText("มีงบสามแสนห้าหมื่น");
  ok(
    "สามแสนห้าหมื่น unsupported (documented)",
    r.budgetMax == null,
    "parser does not guess Thai word amounts beyond digit+แสน/ล้าน"
  );
  ok("3 แสนห้า still works", parseBahtFromThaiText("3 แสนห้า") === 350000);
}

{
  const owner =
    "ชื่อ จิตประสงค์ ต้องการจัดไฟแนนซ์ ตั้งงบเอาไว้ที่ 350,000 ติดต่อได้ตลอดเวลา";
  const r = parseNaturalBuyerLeadText(owner);
  ok("owner sentence name", r.displayName === "จิตประสงค์", r.displayName);
  ok("owner sentence finance", r.purchaseMethod === "finance");
  ok("owner sentence budget", r.budgetMax === 350000, String(r.budgetMax));
  ok(
    "owner sentence contact",
    r.preferredContactWindow === "ติดต่อได้ตลอดเวลา",
    r.preferredContactWindow
  );
  ok("owner sentence no missing budget", !r.missingFields.includes("งบประมาณหรือราคาที่เสนอ"));
  ok("owner sentence complete chat fields", r.missingFields.length === 0, r.missingFields.join(","));
}

{
  const sid = "v2254-retain";
  clearBuyerLeadCaptureContext(sid);
  beginBuyerLeadCaptureWithListing(sid, "corolla-2020");
  processBuyerLeadCaptureTurn({
    sessionId: sid,
    message: "ชื่อ ทดสอบ จัดไฟแนนซ์ ตั้งงบเอาไว้ที่ 350,000 ติดต่อได้ตลอดเวลา",
  });
  const after = getBuyerLeadCaptureContext(sid)!;
  ok("capture ready_for_modal", after.stage === "ready_for_modal");
  ok("budget retained after merge", after.fields.budgetMax === 350000);
  ok("no false budget missing", listMissingBuyerLeadFields(after.fields).length === 0);

  const later = mergeBuyerLeadFieldsFromMessage(after.fields, "สะดวกช่วงเย็น");
  ok("later contact does not erase budget", later.budgetMax === 350000);
  ok("later contact updates window", later.preferredContactWindow?.includes("เย็น") === true);
  ok("name retained", later.displayName === "ทดสอบ");
  ok("finance retained", later.purchaseMethod === "finance");
}

{
  const sid = "v2254-modal";
  clearBuyerLeadCaptureContext(sid);
  beginBuyerLeadCaptureWithListing(sid, "corolla-2020");
  const turn = processBuyerLeadCaptureTurn({
    sessionId: sid,
    message: "ชื่อ ทดสอบ จัดไฟแนนซ์ งบ 350,000 ติดต่อได้ตลอดเวลา",
  });
  ok("completed fields → ready_for_modal", turn.handled && turn.stage === "ready_for_modal");
  const fields = getBuyerLeadCaptureContext(sid)!.fields;
  ok("phone not in chat draft", !fields.contactPhone);
  ok("modal still required for phone", draftToCreateInput(fields, true) === null);
  ok(
    "copy says phone in summary modal",
    /เบอร์โทรจะกรอกในหน้าต่างสรุป/.test(
      read("src/services/leads/buyerLeadCaptureCopy.ts")
    )
  );
}

console.log("\n=== v22.54 Flow / Pilot regressions (isolated) ===\n");

ok(
  "Capture OFF fail-closed",
  isLeadCaptureEnabled({ [NONGA_LEAD_CAPTURE_ENABLED_ENV]: "false" }) === false &&
    isLeadCaptureEnabled({}) === false
);

{
  const start = new Date();
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  const env = {
    [NONGA_LEAD_CAPTURE_ENABLED_ENV]: "true",
    [NONGA_LEAD_PILOT_LISTING_IDS_ENV]: "corolla-2020,corolla-2021",
    [NONGA_LEAD_PILOT_DEALER_IDS_ENV]: "thor-auto",
    [NONGA_LEAD_PILOT_MAX_CREATED_ENV]: "3",
    [NONGA_LEAD_PILOT_STARTED_AT_ENV]: start.toISOString(),
    [NONGA_LEAD_PILOT_EXPIRES_AT_ENV]: end.toISOString(),
    [NONGA_LEAD_PILOT_COUNTER_ID_ENV]: DEFAULT_LEAD_PILOT_COUNTER_ID,
  };
  const listing = {
    id: "corolla-2020",
    brand: "Toyota",
    model: "Corolla",
    year: 2020,
    price: 399000,
    dealerId: "thor-auto",
    ownerId: "thor-auto",
    listingStatus: "published",
  } as const;
  const gateOk = evaluatePilotCreateGate({
    listing: listing as never,
    env,
    createdCount: 0,
  });
  ok("pilot allowlist accepts Corolla listing", gateOk.ok === true);

  const gateOther = evaluatePilotCreateGate({
    listing: { ...listing, id: "camry-2019" } as never,
    env,
    createdCount: 0,
  });
  ok("pilot allowlist rejects non-allowlisted", gateOther.ok === false);

  resetBuyerLeadRepositoryForTests();
  const repo = createBuyerLeadRepository("memory");
  const body = parseBuyerLeadCreateBody({
    listingId: "corolla-2020",
    displayName: "ทดสอบ",
    contactPhone: "0812345678",
    purchaseMethod: "finance",
    budgetMax: 350000,
    preferredContactWindow: "ติดต่อได้ตลอดเวลา",
    consentConfirmed: true,
    consentVersion: BUYER_LEAD_CONSENT_VERSION,
    // Buyer must not override recipient
    sellerId: "attacker-dealer",
  });
  const created = await createConsentedBuyerLead({
    input: body,
    listing: listing as never,
    buyerUserId: "buyer-v2254",
    repository: repo,
    env,
  });
  ok("create ok in memory", created.ok === true);
  if (created.ok) {
    ok(
      "buyer recipient override ignored",
      resolveListingSellerId(listing as never) === created.lead.sellerId &&
        created.lead.sellerId !== "attacker-dealer",
      created.lead.sellerId
    );
  }

  const dup = await createConsentedBuyerLead({
    input: body,
    listing: listing as never,
    buyerUserId: "buyer-v2254",
    repository: repo,
    env,
  });
  ok("duplicate click protected", dup.ok === true && dup.duplicate === true);

  // Fill to max then reject
  for (const buyer of ["buyer-b", "buyer-c"]) {
    await createConsentedBuyerLead({
      input: { ...body, displayName: buyer },
      listing: listing as never,
      buyerUserId: buyer,
      repository: repo,
      env,
    });
  }
  const over = await createConsentedBuyerLead({
    input: { ...body, displayName: "over" },
    listing: listing as never,
    buyerUserId: "buyer-over",
    repository: repo,
    env,
  });
  ok(
    "pilot max count enforced",
    over.ok === false && over.message === BUYER_LEAD_PILOT_LIMIT_MESSAGE
  );
}

{
  // Cancel / no submit: clearing context creates zero leads
  const sid = "v2254-cancel";
  clearBuyerLeadCaptureContext(sid);
  beginBuyerLeadCaptureWithListing(sid, "corolla-2020");
  processBuyerLeadCaptureTurn({
    sessionId: sid,
    message: "ชื่อ ทดสอบ จัดไฟแนนซ์ งบ 350000 ติดต่อได้ตลอดเวลา",
  });
  ok("ready before cancel", getBuyerLeadCaptureContext(sid)?.stage === "ready_for_modal");
  clearBuyerLeadCaptureContext(sid);
  ok("cancel clears draft — no lead object", getBuyerLeadCaptureContext(sid) == null);
  ok(
    "draftToCreateInput never without phone",
    draftToCreateInput(
      {
        listingId: "corolla-2020",
        displayName: "ทดสอบ",
        purchaseMethod: "finance",
        budgetMax: 350000,
        preferredContactWindow: "ตลอด",
      },
      true
    ) === null
  );
}

{
  // setBuyerLeadCaptureContextForTest smoke — stage collecting stays collecting
  setBuyerLeadCaptureContextForTest("v2254-collect", {
    stage: "collecting",
    fields: { listingId: "corolla-2020", displayName: "ก" },
  });
  ok(
    "partial still collecting",
    getBuyerLeadCaptureContext("v2254-collect")?.stage === "collecting"
  );
  clearBuyerLeadCaptureContext("v2254-collect");
}

ok(
  "parser source has ตั้งงบเอาไว้ที่",
  /ตั้งงบ/.test(read("src/services/leads/buyerLeadTextParser.ts"))
);
ok(
  "search source has Corolla solo + Thai brand path",
  /Corolla/.test(read("src/services/ai/chat/marketplaceChatSearch.ts")) &&
    /modelMatchTh/.test(read("src/services/ai/chat/marketplaceChatSearch.ts"))
);

console.log(`\nDone v22.54 — failures=${failures}`);
if (failures > 0) process.exit(1);
