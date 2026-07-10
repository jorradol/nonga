/**
 * v22.55 — Existing Gemini capability audit + hybrid restore guards (no live Lead / no network Gemini).
 * npm run test:v22.55
 */
import fs from "node:fs";
import path from "node:path";
import { tryOrchestrateChatReply } from "../src/services/ai/chat/chatSearchOrchestrator.ts";
import {
  parseMarketplaceSearchQuery,
  runMarketplaceChatSearch,
  type ChatInventoryCar,
} from "../src/services/ai/chat/marketplaceChatSearch.ts";
import { redactPiiForSalesBrainLog } from "../src/services/ai/salesBrainMock.ts";
import {
  detectOwnerControlledGeminiUxZone,
  evaluateRealProviderOutputSafety,
  evaluateUserVisibleRealProviderEligibility,
  hasDeterministicBoundaryBlock,
  hasUngroundedVehicleModelMention,
  isExactModelYearInventoryAsk,
  maybeApplyUserVisibleRealProvider,
  narrowPilotOrchestrationForExactInventoryAsk,
  resetUserVisibleGeminiCallerForTests,
  setUserVisibleGeminiCallerForTests,
} from "../src/services/ai/salesBrainUserVisibleRealProvider.ts";
import {
  beginBuyerLeadCaptureWithListing,
  clearBuyerLeadCaptureContext,
  getBuyerLeadCaptureContext,
  listMissingBuyerLeadFields,
  processBuyerLeadCaptureTurn,
} from "../src/services/leads/buyerLeadCaptureFlow.ts";
import {
  NONGA_LEAD_CAPTURE_ENABLED_ENV,
  isLeadCaptureEnabled,
} from "../src/services/leads/leadCaptureFlags.ts";
import { parseNaturalBuyerLeadText } from "../src/services/leads/buyerLeadTextParser.ts";

let pass = 0;
let fail = 0;

function ok(name: string, condition: boolean, detail = ""): void {
  if (condition) {
    pass += 1;
    console.log("PASS", name, detail);
    return;
  }
  fail += 1;
  console.log("FAIL", name, detail);
  process.exitCode = 1;
}

function env(overrides: Record<string, string | undefined> = {}) {
  return {
    NONGA_AI_OWNER_ONLY_CONTROLLED_UX_ENABLED: "true",
    NONGA_AI_USER_VISIBLE_REAL_PROVIDER_ENABLED: "true",
    NONGA_AI_USER_VISIBLE_ENABLED: "true",
    NONGA_AI_PROVIDER: "gemini",
    NONGA_AI_FIRST_ENABLED: "true",
    NONGA_AI_MODE: "high",
    NONGA_AI_BUDGET_DAILY_LIMIT: "100",
    NONGA_AI_BUDGET_MONTHLY_LIMIT: "1000",
    NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS: "owner-uid",
    GEMINI_API_KEY: "test-gemini-key-present",
    ...overrides,
  };
}

function readFrom(map: Record<string, string | undefined>) {
  return (key: string): string | undefined => map[key];
}

function bridgeResult(text = "deterministic legacy Corolla reply") {
  return {
    orchestrated: {
      text,
      carCards: [],
      skipGemini: true,
    },
    payload: {
      userVisibleText: text,
      pilotPathActive: true,
      fallbackToLegacy: false,
      skipGemini: true,
      carCardCount: 1,
      sliceId: "test-v2255",
    },
  };
}

const inventory: ChatInventoryCar[] = [
  {
    id: "corolla-2020",
    title: "Toyota Corolla 2020",
    brand: "Toyota",
    model: "Corolla",
    year: 2020,
    price: 459000,
    mileage: 62000,
  },
  {
    id: "corolla-2021",
    title: "Toyota Corolla 2021",
    brand: "Toyota",
    model: "Corolla",
    year: 2021,
    price: 499000,
    mileage: 41000,
  },
  {
    id: "camry-2019",
    title: "Toyota Camry 2019",
    brand: "Toyota",
    model: "Camry",
    year: 2019,
    price: 689000,
    mileage: 88000,
  },
  {
    id: "vios-2020",
    title: "Toyota Vios 2020",
    brand: "Toyota",
    model: "Vios",
    year: 2020,
    price: 389000,
    mileage: 55000,
  },
];

async function run(): Promise<void> {
  console.log("=== v22.55 Gemini hybrid Buyer chat restore ===\n");

  const exactQ = "มีรถ โตโยต้า Corolla 2020 ไหม";
  ok(
    "1 exact Corolla zone opens natural_search",
    detectOwnerControlledGeminiUxZone(exactQ) === "natural_search_explanation"
  );
  ok("1b exact model+year ask detected", isExactModelYearInventoryAsk(exactQ));

  const criteria = parseMarketplaceSearchQuery(exactQ)!;
  const search = runMarketplaceChatSearch(exactQ, inventory)!;
  ok("1c criteria model Corolla", criteria.model?.toLowerCase() === "corolla");
  ok("1d criteria year 2020", criteria.year === 2020);
  ok(
    "1e exact grounded primary only Corolla 2020",
    search.primary.length === 1 && search.primary[0]?.id === "corolla-2020"
  );
  ok("1f Camry not in exact primary", !search.primary.some((c) => /camry/i.test(c.model)));

  const orchestrated = tryOrchestrateChatReply(exactQ, inventory);
  ok("1g orchestrator returns skipGemini deterministic", Boolean(orchestrated?.skipGemini));
  ok(
    "1h orchestrator text mentions Corolla",
    /Corolla/i.test(orchestrated?.text ?? "")
  );
  ok(
    "1i orchestrator text does not lead with Camry recommendation",
    !/แนะนำ.*Camry|Camry.*น่าสนใจ/i.test(orchestrated?.text ?? "")
  );

  const broad = runMarketplaceChatSearch("มี Toyota ไหม", inventory);
  ok(
    "4 broad Toyota may include multiple models",
    (broad?.primary.length ?? 0) + (broad?.alternatives.length ?? 0) >= 2
  );

  const noExact = runMarketplaceChatSearch("มีรถ Toyota Corolla 2015 ไหม", inventory)!;
  ok("5 exact no-match primary empty", noExact.primary.length === 0);
  ok(
    "5b nearby alternatives before inventing other brands",
    noExact.alternatives.every((c) => /corolla/i.test(c.model))
  );

  ok(
    "6 family follow-up zone",
    detectOwnerControlledGeminiUxZone("อยากได้ไว้ใช้ครอบครัว") === "car_fit_reason"
  );
  ok(
    "6b mileage follow-up zone",
    detectOwnerControlledGeminiUxZone("ไมล์เยอะไปไหม") === "car_fit_reason"
  );
  ok(
    "6c finance follow-up zone via คันนี้",
    detectOwnerControlledGeminiUxZone("คันนี้จัดไฟแนนซ์ได้ไหม") ===
      "same_chat_context_switching_wording"
  );
  ok(
    "6c2 finance-only zone opens budget_location",
    detectOwnerControlledGeminiUxZone("ผ่อนประมาณเท่าไหร่ได้ไหม") ===
      "budget_location_explanation"
  );
  ok(
    "6d compare zone",
    detectOwnerControlledGeminiUxZone("เทียบกับ Corolla 2021 ให้หน่อย") ===
      "compare_car_types"
  );

  const leadIntent =
    "ชื่อ จิตประสงค์ ต้องการจัดไฟแนนซ์ ตั้งงบเอาไว้ที่ 350,000 ติดต่อได้ตลอดเวลา";
  ok(
    "11 lead-intent blocked from Gemini",
    hasDeterministicBoundaryBlock(leadIntent)
  );
  ok(
    "15 name redacted from provider input helper",
    redactPiiForSalesBrainLog(leadIntent).includes("[name-redacted]") &&
      !redactPiiForSalesBrainLog(leadIntent).includes("จิตประสงค์")
  );
  ok(
    "15b phone still redacted",
    redactPiiForSalesBrainLog("เบอร์ 0812345678").includes("[phone-redacted]")
  );

  const parsedLead = parseNaturalBuyerLeadText(leadIntent);
  ok(
    "8 budget phrase retained deterministically",
    parsedLead.budgetMax === 350000 || parsedLead.budgetMax === 350_000
  );

  const sid = "v2255-lead-modal";
  clearBuyerLeadCaptureContext(sid);
  beginBuyerLeadCaptureWithListing(sid, "corolla-2020");
  const turn = processBuyerLeadCaptureTurn({
    sessionId: sid,
    message: leadIntent,
  });
  const after = getBuyerLeadCaptureContext(sid)!;
  ok(
    "9 no repeated budget missing after ตั้งงบเอาไว้ที่",
    !listMissingBuyerLeadFields(after.fields).includes("งบประมาณหรือราคาที่เสนอ")
  );
  ok(
    "11b modal readiness without phone submit",
    turn.handled &&
      turn.stage === "ready_for_modal" &&
      !after.fields.contactPhone
  );
  clearBuyerLeadCaptureContext(sid);

  const mixedCards = {
    carCardCount: 3,
    recentCarCards: [
      {
        index: 1,
        brand: "Toyota",
        model: "Corolla",
        year: 2020,
        price: 459000,
        mileage: 62000,
      },
      {
        index: 2,
        brand: "Toyota",
        model: "Camry",
        year: 2019,
        price: 689000,
        mileage: 88000,
      },
      {
        index: 3,
        brand: "Toyota",
        model: "Vios",
        year: 2020,
        price: 389000,
        mileage: 55000,
      },
    ],
  };
  const narrowed = narrowPilotOrchestrationForExactInventoryAsk(exactQ, mixedCards)!;
  ok(
    "2 exact ask narrows grounded set to Corolla only",
    narrowed.recentCarCards?.length === 1 &&
      narrowed.recentCarCards?.[0]?.model === "Corolla"
  );
  ok(
    "2b Camry mention unsafe when only Corolla grounded",
    hasUngroundedVehicleModelMention(
      "มี Camry น่าสนใจด้วยครับ",
      narrowed
    )
  );
  ok(
    "3 price/mileage alteration rejected via ungrounded? Corolla ok",
    !hasUngroundedVehicleModelMention(
      "มี Toyota Corolla ปี 2020 ราคา 459,000 บาทครับ",
      narrowed
    )
  );

  const unsafeCamry = evaluateRealProviderOutputSafety(
    "มีครับ นอกจาก Corolla แล้วยังมี Camry น่าสนใจด้วยครับ",
    exactQ,
    1,
    { pilotOrchestration: narrowed }
  );
  ok("2c Gemini Camry invention discarded", !unsafeCamry.safe);

  const baseEnv = env();
  ok(
    "16 buyer role cannot override owner-only recipient/path",
    evaluateUserVisibleRealProviderEligibility({
      firebaseUid: "owner-uid",
      userRole: "buyer",
      environment: "staging",
      env: baseEnv,
      readEnv: readFrom(baseEnv),
    }).gateReason === "owner_role_required"
  );
  ok(
    "17 owner admin eligible under controlled flags",
    evaluateUserVisibleRealProviderEligibility({
      firebaseUid: "owner-uid",
      userRole: "admin",
      environment: "staging",
      env: baseEnv,
      readEnv: readFrom(baseEnv),
    }).eligible === true
  );

  let leadDispatch = 0;
  setUserVisibleGeminiCallerForTests(async () => {
    leadDispatch += 1;
    return {
      providerNetworkUsed: true,
      providerOutputFull:
        '{"finalAnswerTh":"รับทราบชื่อและงบแล้วครับ เดี๋ยวส่งให้ผู้ขายเลยครับ"}',
      redactedProviderOutput:
        '{"finalAnswerTh":"รับทราบชื่อและงบแล้วครับ เดี๋ยวส่งให้ผู้ขายเลยครับ"}',
      requestIdHash: "lead-block",
      modelId: "gemini-3.5-flash",
    };
  });
  const blockedLead = await maybeApplyUserVisibleRealProvider({
    bridgeResult: bridgeResult(),
    userMessage: leadIntent,
    firebaseUid: "owner-uid",
    userRole: "admin",
    environment: "staging",
    env: baseEnv,
    readEnv: readFrom(baseEnv),
    pilotOrchestration: narrowed,
  });
  ok("12 no provider dispatch on lead-intent", leadDispatch === 0);
  ok(
    "12b lead-intent gate deterministic_boundary_blocked",
    blockedLead.payload.realProviderGateReason === "deterministic_boundary_blocked"
  );

  let timeoutCalls = 0;
  setUserVisibleGeminiCallerForTests(async () => {
    timeoutCalls += 1;
    throw new Error("timeout");
  });
  const timeoutResult = await maybeApplyUserVisibleRealProvider({
    bridgeResult: bridgeResult("fallback Corolla deterministic"),
    userMessage: exactQ,
    firebaseUid: "owner-uid",
    userRole: "admin",
    environment: "staging",
    env: baseEnv,
    readEnv: readFrom(baseEnv),
    pilotOrchestration: narrowed,
  });
  ok("13 timeout falls back deterministic", timeoutCalls === 1);
  ok(
    "13b timeout keeps legacy text",
    timeoutResult.payload.userVisibleText.includes("fallback Corolla") &&
      timeoutResult.payload.realProviderNetwork === false
  );

  let okCalls = 0;
  setUserVisibleGeminiCallerForTests(async () => {
    okCalls += 1;
    return {
      providerNetworkUsed: true,
      providerOutputFull: JSON.stringify({
        finalAnswerTh:
          "มีครับ เจอ Toyota Corolla ปี 2020 ราคา 459,000 บาท ไมล์ 62,000 กม. จากข้อมูลในประกาศนี้ครับ โดยทั่วไปรุ่นนี้เหมาะกับใช้งานเมืองและครอบครัวเล็ก — ไม่ใช่การยืนยันสภาพของรถคันนี้โดยตรงครับ ถ้าสนใจคันนี้ เดี๋ยวน้องเอพาไปขั้นตอนยืนยันความสนใจอย่างปลอดภัยก่อนนะครับ",
      }),
      redactedProviderOutput: "redacted",
      requestIdHash: "ok",
      modelId: "gemini-3.5-flash",
    };
  });
  const okResult = await maybeApplyUserVisibleRealProvider({
    bridgeResult: bridgeResult(),
    userMessage: exactQ,
    firebaseUid: "owner-uid",
    userRole: "admin",
    environment: "staging",
    env: baseEnv,
    readEnv: readFrom(baseEnv),
    pilotOrchestration: narrowed,
  });
  ok("20 exact Corolla can use real provider when gated", okCalls === 1);
  ok(
    "20b real provider call ok",
    okResult.payload.realProviderGateReason === "real_provider_call_ok" &&
      /Corolla/.test(okResult.payload.userVisibleText)
  );

  process.env[NONGA_LEAD_CAPTURE_ENABLED_ENV] = "false";
  ok("24 capture OFF still readable", isLeadCaptureEnabled() === false);
  delete process.env[NONGA_LEAD_CAPTURE_ENABLED_ENV];

  const legacyDoc = fs.readFileSync(
    path.join(process.cwd(), "src/server/security/legacyGeminiSafety.ts"),
    "utf8"
  );
  ok(
    "legacy public Gemini remains fail-closed in source",
    /NONGA_AI_LEGACY_PUBLIC_GEMINI_ENABLED/.test(legacyDoc) &&
      /legacy_public_disabled/.test(legacyDoc)
  );

  const noNewAi =
    fs.existsSync(path.join(process.cwd(), "src/services/ai/salesBrainUserVisibleRealProvider.ts")) &&
    !fs.existsSync(path.join(process.cwd(), "src/services/ai/newGeminiBuyerAgent.ts"));
  ok("12c no new parallel AI system file", noNewAi);

  resetUserVisibleGeminiCallerForTests();

  console.log(`\n=== v22.55 result: ${pass} passed, ${fail} failed ===`);
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
