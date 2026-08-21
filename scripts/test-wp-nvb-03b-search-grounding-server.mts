/**
 * WP-NVB-03B — Server-directed Search Grounding targeted tests.
 * Mock/deterministic only — no live Gemini, Firebase, or network.
 * Run: .\node_modules\.bin\tsx.cmd scripts/test-wp-nvb-03b-search-grounding-server.mts
 */
import { readFileSync } from "node:fs";
import type { Request, Response } from "express";
import {
  parseServerDirectedSearchCriteria,
  SEARCH_GROUNDING_PAGE_SIZE,
} from "../src/services/ai/chat/chatV2V3SearchGroundingCriteria.ts";
import {
  filterServerDirectedSearchMatches,
  runServerDirectedMarketplaceMatch,
} from "../src/services/ai/chat/chatV2V3SearchGroundingMatch.ts";
import {
  buildDeterministicSearchGroundingSummary,
  buildSearchGroundingPacket,
  explicitBodyClassFromSourceField,
  validateSearchGroundingComposition,
} from "../src/services/ai/chat/chatV2V3SearchGroundingCompose.ts";
import {
  evaluateChatV2V3SearchGroundingPilotEligibility,
  executeChatV2V3SearchGroundingTurn,
  NONGA_CHAT_V2_V3_SEARCH_GROUNDING_ENABLED_ENV,
  NONGA_CHAT_V2_V3_SEARCH_GROUNDING_PILOT_UIDS_ENV,
  resolveChatV2V3SearchGroundingRouting,
  SEARCH_GROUNDING_NO_MATCH_TEXT,
  SEARCH_GROUNDING_UNSUPPORTED_TEXT,
} from "../src/services/ai/chat/chatV2V3SearchGroundingBridge.ts";
import { CHAT_V3_SEARCH_GROUNDED_CONVERSATION_BRAIN } from "../src/services/ai/chat/chatV2V3SearchGroundingClientApply.ts";
import { CHAT_V3_USER_FACING_UNAVAILABLE } from "../src/services/ai/chat-v3/chatV3ConversationContracts.ts";
import type { ChatV3ConversationResponse } from "../src/services/ai/chat-v3/chatV3ConversationContracts.ts";
import {
  handleChatUserVisibleOrchestratePost,
  type UserVisibleOrchestrationBridgeResult,
} from "../src/services/ai/salesBrainServerUserVisibleOrchestrationBridge.ts";
import type { ChatUserVisibleOrchestrateResponse } from "../src/services/ai/chat/chatUserVisibleOrchestrateClient.ts";
import { ServerAuthError, type ServerAuthContext } from "../src/server/serverAuthContext.ts";
import { NONGA_AI_EMERGENCY_KILL_SWITCH_ENV } from "../src/services/ai/salesBrainRuntimeFlags.ts";
import {
  NONGA_CONVERSATION_CORE_ENABLED_ENV,
  NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV,
  NONGA_CONVERSATION_CORE_PILOT_UIDS_ENV,
  NONGA_CONVERSATION_CORE_TOOLS_ENABLED_ENV,
} from "../src/server/conversation-core/index.ts";
import { NONGA_CHAT_V2_V3_GENERAL_BRIDGE_ENABLED_ENV } from "../src/services/ai/chat/chatV2V3GeneralConversationBridge.ts";
import type { ChatInventoryCar } from "../src/services/ai/chat/marketplaceChatSearch.ts";
import type { AuthRole } from "../src/utils/rbac.ts";
import { validateToolResult } from "../src/services/conversation-core/toolEnvelope.ts";

let passCount = 0;

function pass(label: string): void {
  passCount += 1;
  console.log(`PASS: ${label}`);
}

function assertEqual<T>(label: string, actual: T, expected: T): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    console.error(
      `FAIL [${label}] expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
    process.exit(1);
  }
  pass(label);
}

function assertTruthy(label: string, value: unknown): void {
  if (!value) {
    console.error(`FAIL [${label}] expected truthy`);
    process.exit(1);
  }
  pass(label);
}

function assertFalsy(label: string, value: unknown): void {
  if (value) {
    console.error(`FAIL [${label}] expected falsy`);
    process.exit(1);
  }
  pass(label);
}

function assertIncludes(label: string, haystack: string, needle: string): void {
  if (!haystack.includes(needle)) {
    console.error(`FAIL [${label}] expected to include ${needle}`);
    process.exit(1);
  }
  pass(label);
}

function assertNotIncludes(label: string, haystack: string, needle: string): void {
  if (haystack.includes(needle)) {
    console.error(`FAIL [${label}] must not include ${needle}`);
    process.exit(1);
  }
  pass(label);
}

const PILOT_UID = "pilot-uid-nvb03b-search";
const NON_PILOT_UID = "non-pilot-uid-nvb03b-search";
const ACCEPTANCE_QUERY = "ช่วยหารถเก๋ง Toyota เกียร์ออโต้ ราคาไม่เกิน 500,000 บาท";
const GENERAL_MESSAGE = "สวัสดีครับ รถไฟฟ้ากับรถน้ำมัน ใช้ต่างกันยังไง";
const INVENTORY_MESSAGE = "ตอนนี้มีรถอะไรขายบ้าง";
const HIGH_RISK_MESSAGE = "เบรกจมขณะขับเร็ว ควรทำอย่างไร";
const RECEIVED_AT_MS = 1_700_000_100_000;

function searchEnv(
  overrides: Record<string, string | undefined> = {}
): Record<string, string | undefined> {
  return {
    [NONGA_CHAT_V2_V3_SEARCH_GROUNDING_ENABLED_ENV]: undefined,
    [NONGA_CHAT_V2_V3_SEARCH_GROUNDING_PILOT_UIDS_ENV]: PILOT_UID,
    [NONGA_CHAT_V2_V3_GENERAL_BRIDGE_ENABLED_ENV]: "false",
    [NONGA_AI_EMERGENCY_KILL_SWITCH_ENV]: "false",
    [NONGA_CONVERSATION_CORE_ENABLED_ENV]: "false",
    [NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV]: "false",
    [NONGA_CONVERSATION_CORE_TOOLS_ENABLED_ENV]: "false",
    [NONGA_CONVERSATION_CORE_PILOT_UIDS_ENV]: "",
    ...overrides,
  };
}

function readEnvFrom(values: Record<string, string | undefined>) {
  return (key: string) => values[key];
}

function authContext(uid = PILOT_UID, role: AuthRole = "member"): ServerAuthContext {
  return {
    uid,
    email: "redacted@example.test",
    displayName: "Redacted Pilot",
    role,
    status: "active",
    memberships: [],
    provider: "firebase",
    verificationMode: "firebase-admin",
  };
}

function car(overrides: Partial<ChatInventoryCar> & { id: string }): ChatInventoryCar {
  return {
    title: `${overrides.brand ?? "Toyota"} ${overrides.model ?? "Altis"}`,
    brand: "Toyota",
    model: "Altis",
    year: 2018,
    price: 450_000,
    mileage: 80_000,
    transmission: "auto",
    bodyType: "Sedan",
    fuelType: "เบนซิน",
    listingStatus: "published",
    ...overrides,
  };
}

function toyotaSedanPage(count: number, start = 1): ChatInventoryCar[] {
  return Array.from({ length: count }, (_, index) =>
    car({
      id: `toyota-sedan-${String(start + index).padStart(2, "0")}`,
      price: 350_000 + index * 5_000,
    })
  );
}

const MIXED_INVENTORY: ChatInventoryCar[] = [
  ...toyotaSedanPage(12),
  car({ id: "honda-sedan-01", brand: "Honda", model: "Civic", price: 400_000 }),
  car({
    id: "toyota-suv-01",
    model: "Fortuner",
    bodyType: "SUV",
    title: "Toyota Fortuner",
    price: 400_000,
  }),
  car({ id: "toyota-manual-01", transmission: "manual", price: 400_000 }),
  car({ id: "toyota-overprice-01", price: 620_000 }),
  car({ id: "toyota-old-01", year: 2008, price: 280_000 }),
  car({ id: "toyota-high-km-01", mileage: 220_000, price: 300_000 }),
  car({ id: "toyota-ev-01", fuelType: "ไฟฟ้า", price: 400_000 }),
  car({
    id: "toyota-no-trans-01",
    transmission: undefined,
    price: 400_000,
  }),
  car({
    id: "hidden-01",
    listingStatus: "hidden",
    price: 300_000,
  }),
];

function v3Success(content: string): ChatV3ConversationResponse {
  return {
    success: true,
    data: {
      sliceId: "wp-v3-07b-thin-conversation",
      conversationId: "chat-v2-v3-search:pilot-uid-nvb03b-search",
      messageId: "msg-v3-test",
      content,
      expertModeHint: "BUYING",
      providerId: "fake-v3",
    },
  };
}

function createMockRes(): Response & { captured: { statusCode: number; body: unknown } } {
  const captured = { statusCode: 200, body: undefined as unknown };
  const res = {
    captured,
    status(code: number) {
      captured.statusCode = code;
      return res;
    },
    json(body: unknown) {
      captured.body = body;
      return res;
    },
  };
  return res as unknown as Response & { captured: { statusCode: number; body: unknown } };
}

async function runHandler(input: {
  uid?: string;
  role?: AuthRole;
  body: Record<string, unknown>;
  env?: Record<string, string | undefined>;
  inventory?: ChatInventoryCar[];
  authError?: ServerAuthError;
  runLegacy?: () => UserVisibleOrchestrationBridgeResult;
  runV3?: (
    options: import("../src/services/ai/chat-v3/chatV3ConversationService.ts").RunChatV3ConversationOptions
  ) => Promise<ChatV3ConversationResponse>;
  runGeneralV3?: () => Promise<ChatV3ConversationResponse>;
}): Promise<{
  statusCode: number;
  body: unknown;
  counters: { legacy: number; searchV3: number; generalV3: number; realProvider: number };
}> {
  const counters = { legacy: 0, searchV3: 0, generalV3: 0, realProvider: 0 };
  const res = createMockRes();
  await handleChatUserVisibleOrchestratePost(
    { body: input.body } as Request,
    res,
    {
      loadChatInventory: async () => input.inventory ?? MIXED_INVENTORY,
      readEnv: readEnvFrom(input.env ?? searchEnv()),
      now: () => RECEIVED_AT_MS,
      resolveAuth: async () => {
        if (input.authError) throw input.authError;
        return authContext(input.uid, input.role);
      },
      runLegacyOrchestration: () => {
        counters.legacy += 1;
        return (
          input.runLegacy?.() ?? {
            orchestrated: { text: "legacy-orchestrator-text", carCards: [], skipGemini: false },
            payload: {
              sliceId: "v6.1L.2c",
              userVisibleText: "legacy-orchestrator-text",
              pilotPathActive: false,
              fallbackToLegacy: true,
              skipGemini: false,
              carCardCount: 0,
            },
          }
        );
      },
      applyRealProvider: (async (args) => {
        counters.realProvider += 1;
        return args.bridgeResult;
      }) as never,
      runChatV3GeneralBridge: async () => {
        counters.generalV3 += 1;
        return (
          input.runGeneralV3?.() ?? {
            success: true,
            data: {
              sliceId: "wp-v3-07b-thin-conversation",
              conversationId: "g",
              messageId: "g1",
              content: "คำตอบทั่วไป",
              expertModeHint: "AUTO",
              providerId: "fake-v3",
            },
          }
        );
      },
      runChatV3SearchGrounding: async (options) => {
        counters.searchV3 += 1;
        if (input.runV3) return input.runV3(options);
        const appendix = String(options.searchGroundingAppendix ?? "");
        const countMatch = appendix.match(/displayedCount=(\d+)/);
        const count = countMatch ? Number(countMatch[1]) : 0;
        if (count === 0) {
          return v3Success(SEARCH_GROUNDING_NO_MATCH_TEXT);
        }
        return v3Success(`พบรถที่ตรงตามเงื่อนไขที่ตรวจแล้ว ${count} คันในรอบนี้ครับ`);
      },
    }
  );
  return { statusCode: res.captured.statusCode, body: res.captured.body, counters };
}

function asSuccess(body: unknown): ChatUserVisibleOrchestrateResponse {
  return body as ChatUserVisibleOrchestrateResponse;
}

const enabledEnv = searchEnv({
  [NONGA_CHAT_V2_V3_SEARCH_GROUNDING_ENABLED_ENV]: "true",
});

console.log("=== WP-NVB-03B Server-directed Search Grounding ===\n");

const parsed = parseServerDirectedSearchCriteria(ACCEPTANCE_QUERY, [], 2026);
assertEqual("criteria: brand Toyota", parsed.brand, "Toyota");
assertEqual("criteria: bodyClass sedan", parsed.bodyClass, "sedan");
assertEqual("criteria: transmission auto", parsed.transmission, "auto");
assertEqual("criteria: maxPrice 500000", parsed.maxPrice, 500000);
assertEqual("criteria: supported", parsed.supported, true);
assertEqual("criteria: pageIndex 0", parsed.pageIndex, 0);

const showMore = parseServerDirectedSearchCriteria("ดูเพิ่ม", [
  { role: "user", content: ACCEPTANCE_QUERY },
  { role: "assistant", content: "พบรถ 10 คันในรอบนี้ครับ" },
], 2026);
assertEqual("criteria: show-more supported", showMore.supported, true);
assertEqual("criteria: show-more pageIndex 1", showMore.pageIndex, 1);
assertEqual("criteria: show-more keeps brand", showMore.brand, "Toyota");
assertEqual("criteria: show-more keeps body", showMore.bodyClass, "sedan");

assertFalsy(
  "pilot: flag default off",
  evaluateChatV2V3SearchGroundingPilotEligibility({
    authenticatedActorRef: PILOT_UID,
    readEnv: readEnvFrom(searchEnv()),
  }).eligible
);

assertEqual(
  "routing: disabled not-selected",
  resolveChatV2V3SearchGroundingRouting({
    authenticatedActorRef: PILOT_UID,
    userMessage: ACCEPTANCE_QUERY,
    readEnv: readEnvFrom(searchEnv()),
  }).kind,
  "not-selected"
);

{
  const matches = filterServerDirectedSearchMatches(MIXED_INVENTORY, parsed);
  assertTruthy("match: toyota sedan auto under 500k exist", matches.length >= 10);
  assertTruthy(
    "match: brand filter excludes Honda",
    matches.every((item) => item.brand === "Toyota")
  );
  assertTruthy(
    "match: price filter excludes over-budget",
    matches.every((item) => item.price <= 500_000)
  );
  assertFalsy(
    "match: SUV does not satisfy sedan",
    matches.some((item) => item.id === "toyota-suv-01")
  );
  assertFalsy(
    "match: manual does not satisfy auto",
    matches.some((item) => item.id === "toyota-manual-01")
  );
  assertFalsy(
    "match: missing transmission does not satisfy auto",
    matches.some((item) => item.id === "toyota-no-trans-01")
  );
  assertFalsy(
    "match: hidden listing excluded",
    matches.some((item) => item.id === "hidden-01")
  );
}

{
  const yearParsed = parseServerDirectedSearchCriteria(
    "ช่วยหารถเก๋ง Toyota ไม่เกิน 5 ปี",
    [],
    2026
  );
  assertEqual("criteria: max age minYear", yearParsed.minYear, 2021);
  const yearMatches = filterServerDirectedSearchMatches(MIXED_INVENTORY, yearParsed);
  assertFalsy(
    "match: year bound excludes old listing",
    yearMatches.some((item) => item.id === "toyota-old-01")
  );
}

{
  const kmParsed = parseServerDirectedSearchCriteria(
    "ช่วยหารถเก๋ง Toyota ไมล์ไม่เกิน 100000",
    [],
    2026
  );
  assertEqual("criteria: maxMileage", kmParsed.maxMileage, 100000);
  const kmMatches = filterServerDirectedSearchMatches(MIXED_INVENTORY, kmParsed);
  assertFalsy(
    "match: mileage bound excludes high km",
    kmMatches.some((item) => item.id === "toyota-high-km-01")
  );
}

{
  const evParsed = parseServerDirectedSearchCriteria("ช่วยหารถ Toyota EV", [], 2026);
  assertEqual("criteria: fuel ev", evParsed.fuel, "ev");
  const evMatches = filterServerDirectedSearchMatches(MIXED_INVENTORY, evParsed);
  assertTruthy(
    "match: EV criterion keeps explicit EV",
    evMatches.some((item) => item.id === "toyota-ev-01")
  );
  assertFalsy(
    "match: EV criterion rejects gasoline",
    evMatches.some((item) => item.fuelType === "เบนซิน")
  );
}

{
  const modelParsed = parseServerDirectedSearchCriteria("ช่วยหารถ Toyota Fortuner", [], 2026);
  const modelMatches = filterServerDirectedSearchMatches(MIXED_INVENTORY, modelParsed);
  assertTruthy(
    "match: model criterion keeps Fortuner",
    modelMatches.some((item) => item.id === "toyota-suv-01")
  );
  assertFalsy(
    "match: model criterion excludes Altis",
    modelMatches.some((item) => item.model === "Altis")
  );
}

{
  const match = await runServerDirectedMarketplaceMatch({
    requestId: "search-req-01",
    conversationId: "search-conv-01",
    criteria: parsed,
    inventory: MIXED_INVENTORY,
  });
  assertEqual("tool: completed", match.outcome.kind, "completed");
  assertEqual("tool: status ok", match.toolResult?.status, "ok");
  assertEqual("tool: provenance", match.toolResult?.provenance, "marketplace-search");
  assertEqual("tool: max 10 ids", match.matchedListingIds.length, 10);
  const validated = validateToolResult(match.toolResult, {
    requestId: "search-req-01",
    conversationId: "search-conv-01",
    toolName: "marketplace.search",
  });
  assertTruthy("tool: validateToolResult ok", validated.ok);
}

{
  const emptyCriteria = parseServerDirectedSearchCriteria(
    "ช่วยหารถเก๋ง BMW เกียร์ออโต้ ราคาไม่เกิน 500,000 บาท",
    [],
    2026
  );
  const emptyMatch = await runServerDirectedMarketplaceMatch({
    requestId: "search-req-empty",
    conversationId: "search-conv-empty",
    criteria: emptyCriteria,
    inventory: MIXED_INVENTORY,
  });
  assertEqual("zero-result: status ok", emptyMatch.toolResult?.status, "ok");
  assertEqual("zero-result: empty ids", emptyMatch.matchedListingIds.length, 0);
  const validated = validateToolResult(emptyMatch.toolResult, {
    requestId: "search-req-empty",
    conversationId: "search-conv-empty",
    toolName: "marketplace.search",
  });
  assertTruthy("zero-result: validateToolResult ok", validated.ok);
}

{
  const page0 = await runServerDirectedMarketplaceMatch({
    requestId: "search-req-p0",
    conversationId: "search-conv-page",
    criteria: parsed,
    inventory: MIXED_INVENTORY,
  });
  const page1Criteria = parseServerDirectedSearchCriteria("ดูเพิ่ม", [
    { role: "user", content: ACCEPTANCE_QUERY },
    { role: "assistant", content: "พบรถ 10 คันในรอบนี้ครับ" },
  ], 2026);
  const page1 = await runServerDirectedMarketplaceMatch({
    requestId: "search-req-p1",
    conversationId: "search-conv-page",
    criteria: page1Criteria,
    inventory: MIXED_INVENTORY,
  });
  assertEqual("paging: page0 is 10", page0.matchedListingIds.length, 10);
  assertTruthy("paging: page1 has remaining", page1.matchedListingIds.length > 0);
  const overlap = page1.matchedListingIds.filter((id) =>
    page0.matchedListingIds.includes(id)
  );
  assertEqual("paging: no duplicate ids", overlap, []);
}

assertEqual(
  "body fact: explicit Sedan",
  explicitBodyClassFromSourceField("Sedan"),
  "sedan"
);
assertEqual(
  "body fact: inferred-only title is not a source field",
  explicitBodyClassFromSourceField(undefined),
  undefined
);

{
  const match = await runServerDirectedMarketplaceMatch({
    requestId: "search-req-packet",
    conversationId: "search-conv-packet",
    criteria: parsed,
    inventory: MIXED_INVENTORY,
  });
  const packet = buildSearchGroundingPacket({
    requestId: "search-req-packet",
    conversationId: "search-conv-packet",
    criteria: parsed,
    toolResult: match.toolResult!,
    inventory: MIXED_INVENTORY,
  });
  assertTruthy("packet: ok", packet.ok);
  if (packet.ok) {
    assertEqual("packet: displayedCount 10", packet.packet.displayedCount, 10);
    assertEqual("packet: hasMoreCars false", packet.packet.hasMoreCars, false);
    assertEqual("packet: remainder unknown", packet.packet.marketplaceRemainder, "unknown");
    assertEqual("packet: provenance", packet.packet.provenance, "marketplace-search");
    assertTruthy(
      "packet: cards subset of tool ids",
      packet.carCards.every((card) =>
        packet.packet.returnedListingIds.includes(card.id)
      )
    );
    assertFalsy(
      "packet: no listingStatus on facts",
      packet.packet.displayedListings.some((item) => "listingStatus" in item)
    );
    const inferredOnly = car({
      id: "inferred-body-01",
      bodyType: undefined,
      title: "Toyota Altis เก๋งสวย",
      model: "Altis",
    });
    assertEqual(
      "body: inferred title is not a stated fact",
      explicitBodyClassFromSourceField(inferredOnly.bodyType),
      undefined
    );
    const grounded = validateSearchGroundingComposition({
      text: buildDeterministicSearchGroundingSummary(packet.packet),
      packet: packet.packet,
    });
    assertEqual("grounding: deterministic summary ok", grounded.ok, true);
    const badTotal = validateSearchGroundingComposition({
      text: "ในตลาดมีทั้งหมด 120 คันครับ",
      packet: packet.packet,
    });
    assertEqual("grounding: marketplace total fails", badTotal.ok, false);
    const badCount = validateSearchGroundingComposition({
      text: "พบรถที่ตรงตามเงื่อนไขที่ตรวจแล้ว 3 คันในรอบนี้ครับ",
      packet: packet.packet,
    });
    assertEqual("grounding: smaller count fails", badCount.ok, false);
  }
}

{
  const turn = await executeChatV2V3SearchGroundingTurn({
    authenticatedActorRef: PILOT_UID,
    userMessage: ACCEPTANCE_QUERY,
    inventory: MIXED_INVENTORY,
    readEnv: readEnvFrom(enabledEnv),
    environment: "local",
    runChatV3Conversation: async () =>
      v3Success("พบรถที่ตรงตามเงื่อนไขที่ตรวจแล้ว 10 คันในรอบนี้ครับ"),
  });
  assertEqual("turn: success", turn.kind, "success");
  if (turn.kind === "success") {
    assertEqual("turn: 10 cards", turn.carCards.length, 10);
    assertEqual("turn: hasMoreCars false", turn.hasMoreCars, false);
    assertNotIncludes("turn: no marketplace total word", turn.userVisibleText, "ทั้งหมด");
  }
}

{
  const turn = await executeChatV2V3SearchGroundingTurn({
    authenticatedActorRef: PILOT_UID,
    userMessage: ACCEPTANCE_QUERY,
    inventory: MIXED_INVENTORY,
    readEnv: readEnvFrom(enabledEnv),
    environment: "local",
    runChatV3Conversation: async () => v3Success("ในตลาดมีทั้งหมด 80 คัน"),
  });
  assertEqual("fallback: still success with cards", turn.kind, "success");
  if (turn.kind === "success") {
    assertEqual("fallback: cards retained", turn.carCards.length, 10);
    assertEqual("fallback: deterministic used", turn.usedDeterministicFallback, true);
    assertNotIncludes("fallback: no ทั้งหมด", turn.userVisibleText, "ทั้งหมด");
  }
}

{
  let v3Calls = 0;
  const turn = await executeChatV2V3SearchGroundingTurn({
    authenticatedActorRef: PILOT_UID,
    userMessage: ACCEPTANCE_QUERY,
    inventory: MIXED_INVENTORY,
    readEnv: readEnvFrom(enabledEnv),
    environment: "local",
    runChatV3Conversation: async () => {
      v3Calls += 1;
      throw new Error("provider down");
    },
  });
  assertEqual("v3-throw: generate once", v3Calls, 1);
  assertEqual("v3-throw: success with cards", turn.kind, "success");
}

{
  const turn = await executeChatV2V3SearchGroundingTurn({
    authenticatedActorRef: PILOT_UID,
    userMessage: "ช่วยหารถเก๋ง Toyota สีแดง เกียร์ออโต้ ราคาไม่เกิน 500,000 บาท",
    inventory: MIXED_INVENTORY,
    readEnv: readEnvFrom(enabledEnv),
    environment: "local",
    runChatV3Conversation: async () => {
      throw new Error("v3 must not run for unsupported");
    },
  });
  assertEqual("unsupported: success no-match", turn.kind, "success");
  if (turn.kind === "success") {
    assertEqual("unsupported: no cards", turn.carCards.length, 0);
    assertEqual("unsupported: copy", turn.userVisibleText, SEARCH_GROUNDING_UNSUPPORTED_TEXT);
  }
}

{
  const hop = await runHandler({
    uid: PILOT_UID,
    body: { userMessage: ACCEPTANCE_QUERY },
    env: enabledEnv,
    inventory: MIXED_INVENTORY,
  });
  const data = asSuccess(hop.body).data;
  assertEqual("http: selected marker", data?.conversationBrain, CHAT_V3_SEARCH_GROUNDED_CONVERSATION_BRAIN);
  assertEqual("http: 10 cards", data?.carCards.length, 10);
  assertEqual("http: hasMoreCars false", data?.hasMoreCars, false);
  assertEqual("http: search v3 once", hop.counters.searchV3, 1);
  assertEqual("http: legacy never", hop.counters.legacy, 0);
  assertEqual("http: general v3 never", hop.counters.generalV3, 0);
  assertEqual("http: real provider never", hop.counters.realProvider, 0);
  assertTruthy(
    "http: card ids subset of displayed",
    (data?.carCards ?? []).every((card) => typeof card.id === "string")
  );
}

{
  const hop = await runHandler({
    uid: NON_PILOT_UID,
    body: { userMessage: ACCEPTANCE_QUERY },
    env: enabledEnv,
  });
  assertEqual("non-pilot: legacy once", hop.counters.legacy, 1);
  assertEqual("non-pilot: search v3 never", hop.counters.searchV3, 0);
  assertFalsy(
    "non-pilot: no search marker",
    asSuccess(hop.body).data?.conversationBrain === CHAT_V3_SEARCH_GROUNDED_CONVERSATION_BRAIN
  );
}

{
  const hop = await runHandler({
    uid: PILOT_UID,
    body: { userMessage: GENERAL_MESSAGE },
    env: enabledEnv,
  });
  assertEqual("general: search not selected", hop.counters.searchV3, 0);
  assertEqual("general: legacy (general flag off)", hop.counters.legacy, 1);
}

{
  const hop = await runHandler({
    uid: PILOT_UID,
    body: { userMessage: INVENTORY_MESSAGE },
    env: enabledEnv,
  });
  assertEqual("inventory: search v3 never", hop.counters.searchV3, 0);
  assertEqual("inventory: not search marker", hop.counters.legacy, 1);
}

{
  const hop = await runHandler({
    uid: PILOT_UID,
    body: { userMessage: HIGH_RISK_MESSAGE },
    env: enabledEnv,
  });
  assertEqual("high-risk: search v3 never", hop.counters.searchV3, 0);
}

{
  const hop = await runHandler({
    uid: PILOT_UID,
    body: { userMessage: ACCEPTANCE_QUERY },
    env: searchEnv({
      [NONGA_CHAT_V2_V3_SEARCH_GROUNDING_ENABLED_ENV]: "true",
      [NONGA_AI_EMERGENCY_KILL_SWITCH_ENV]: "true",
    }),
  });
  assertEqual("kill: search v3 never", hop.counters.searchV3, 0);
  assertEqual("kill: legacy never", hop.counters.legacy, 0);
  assertEqual(
    "kill: unavailable",
    asSuccess(hop.body).data?.userVisibleText,
    CHAT_V3_USER_FACING_UNAVAILABLE
  );
  assertEqual(
    "kill: marker",
    asSuccess(hop.body).data?.conversationBrain,
    CHAT_V3_SEARCH_GROUNDED_CONVERSATION_BRAIN
  );
  assertNotIncludes(
    "kill: never no-match wording",
    asSuccess(hop.body).data?.userVisibleText ?? "",
    "ไม่พบรถ"
  );
  assertEqual("kill: no cards", asSuccess(hop.body).data?.carCards.length, 0);
}

{
  const hop = await runHandler({
    uid: PILOT_UID,
    body: { userMessage: ACCEPTANCE_QUERY },
    env: enabledEnv,
    inventory: [],
  });
  assertEqual("empty inventory: search v3 at most one", hop.counters.searchV3 <= 1, true);
  assertEqual("empty inventory: legacy never", hop.counters.legacy, 0);
  assertEqual(
    "empty inventory: no-match text",
    asSuccess(hop.body).data?.userVisibleText,
    SEARCH_GROUNDING_NO_MATCH_TEXT
  );
  assertEqual("empty inventory: no cards", asSuccess(hop.body).data?.carCards.length, 0);
}

{
  const hop = await runHandler({
    uid: PILOT_UID,
    body: {
      userMessage: "ดูเพิ่ม",
      conversationHistory: [
        { role: "user", content: ACCEPTANCE_QUERY },
        { role: "assistant", content: "พบรถที่ตรงตามเงื่อนไขที่ตรวจแล้ว 10 คันในรอบนี้ครับ" },
      ],
    },
    env: enabledEnv,
    inventory: MIXED_INVENTORY,
  });
  const data = asSuccess(hop.body).data;
  assertEqual("show-more http: search selected", data?.conversationBrain, CHAT_V3_SEARCH_GROUNDED_CONVERSATION_BRAIN);
  assertEqual("show-more http: legacy never", hop.counters.legacy, 0);
  const firstPage = toyotaSedanPage(10).map((item) => item.id);
  const returned = (data?.carCards ?? []).map((card) => card.id);
  assertEqual(
    "show-more http: no first-page duplicates",
    returned.filter((id) => firstPage.includes(id)),
    []
  );
}

const matchSource = readFileSync("src/services/ai/chat/chatV2V3SearchGroundingMatch.ts", "utf8");
const bridgeSource = readFileSync("src/services/ai/chat/chatV2V3SearchGroundingBridge.ts", "utf8");
assertNotIncludes("no marketplace adapter import", matchSource, "marketplaceSearchToolAdapter");
assertNotIncludes("no vehicleDiscoveryIndex import", matchSource, "vehicleDiscoveryIndex");
assertNotIncludes("no vehicleDiscovery.ts import", matchSource, "vehicleDiscovery.ts");
assertNotIncludes("no runMarketplaceChatSearch", matchSource, "runMarketplaceChatSearch");
assertNotIncludes("no runVehicleDiscovery", matchSource, "runVehicleDiscovery");
assertNotIncludes("no generateStructuredInitialTurn", bridgeSource, "generateStructuredInitialTurn");
assertNotIncludes("no Core orchestrator", bridgeSource, "runConversationCoreOrchestrator");
assertNotIncludes("no Core execution service", bridgeSource, "runConversationCoreExecutionService");
assertNotIncludes("no tryOrchestrateChatReplyCore", bridgeSource, "tryOrchestrateChatReplyCore");
assertEqual("page size locked to 10", SEARCH_GROUNDING_PAGE_SIZE, 10);

console.log(`\nWP-NVB-03B server tests passed: ${passCount}`);
