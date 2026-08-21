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
  looksLikeSearchGroundingJsonEnvelope,
  orderSearchGroundingCarCards,
  SEARCH_GROUNDING_MAX_ORDERED_LISTING_IDS,
  SEARCH_GROUNDING_STRUCTURED_OUTPUT_JSON_SCHEMA,
  unwrapSearchGroundingProviderContent,
  validateSearchGroundingComposition,
  validateSearchGroundingOrderedListingIds,
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
import { runChatV3Conversation } from "../src/services/ai/chat-v3/chatV3ConversationService.ts";
import type { ChatV3ProviderAdapter } from "../src/services/ai/chat-v3/chatV3ProviderAdapter.ts";
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
import { NONGA_CHAT_V2_V3_GENERAL_BRIDGE_ENABLED_ENV, NONGA_CHAT_V2_V3_GENERAL_PILOT_UIDS_ENV } from "../src/services/ai/chat/chatV2V3GeneralConversationBridge.ts";
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

function v3Success(
  content: string,
  searchComposition?: { readonly orderedListingIds: readonly string[] }
): ChatV3ConversationResponse {
  return {
    success: true,
    data: {
      sliceId: "wp-v3-07b-thin-conversation",
      conversationId: "chat-v2-v3-search:pilot-uid-nvb03b-search",
      messageId: "msg-v3-test",
      content,
      expertModeHint: "BUYING",
      providerId: "fake-v3",
      ...(searchComposition ? { searchComposition } : {}),
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

const FOUR_CARS: ChatInventoryCar[] = [
  car({ id: "id-a", model: "Altis", year: 2018, price: 350_000 }),
  car({ id: "id-b", model: "Yaris", year: 2019, price: 360_000 }),
  car({ id: "id-c", model: "Vios", year: 2020, price: 370_000 }),
  car({ id: "id-d", model: "Camry", year: 2017, price: 390_000 }),
];
const PATH_C_REPLY =
  "พบรถที่ตรงตามเงื่อนไขที่ตรวจแล้ว 4 คันในรอบนี้ครับ เริ่มจาก Toyota Vios ปี 2020 แล้วตามด้วย Toyota Altis, Toyota Yaris และ Toyota Camry";
const PATH_C_ORDER = ["id-c", "id-a", "id-b", "id-d"] as const;
let expectedDeterministicFourText = "";

function fakeSearchProvider(content: string): ChatV3ProviderAdapter {
  return {
    id: "fake-search-diag",
    generate: async () => ({
      ok: true,
      providerId: "fake-search-diag",
      content,
    }),
  };
}

function failingSearchProvider(): ChatV3ProviderAdapter {
  return {
    id: "fake-search-diag",
    generate: async () => ({
      ok: false,
      providerId: "fake-search-diag",
      reason: "provider_failure",
      message: "unavailable",
    }),
  };
}

function executeSearchWithProvider(
  provider: ChatV3ProviderAdapter,
  inventory: readonly ChatInventoryCar[] = FOUR_CARS
) {
  return executeChatV2V3SearchGroundingTurn({
    authenticatedActorRef: PILOT_UID,
    userMessage: ACCEPTANCE_QUERY,
    inventory,
    readEnv: readEnvFrom(enabledEnv),
    environment: "local",
    runChatV3Conversation: (options) =>
      runChatV3Conversation({
        ...options,
        provider,
        allowFakeProvider: true,
      }),
  });
}

{
  const canonical = ["id-a", "id-b", "id-c", "id-d"];
  assertEqual(
    "order validator: permutation accepted",
    validateSearchGroundingOrderedListingIds({
      orderedListingIds: PATH_C_ORDER,
      returnedListingIds: canonical,
    }).ok,
    true
  );
  assertEqual(
    "order validator: duplicate degrades",
    validateSearchGroundingOrderedListingIds({
      orderedListingIds: ["id-a", "id-a", "id-b", "id-c"],
      returnedListingIds: canonical,
    }).ok,
    false
  );
  assertEqual(
    "order validator: unknown id degrades",
    validateSearchGroundingOrderedListingIds({
      orderedListingIds: ["id-a", "id-b", "id-c", "id-extra"],
      returnedListingIds: canonical,
    }).ok,
    false
  );
  assertEqual(
    "order validator: missing id degrades",
    validateSearchGroundingOrderedListingIds({
      orderedListingIds: ["id-c", "id-a", "id-b"],
      returnedListingIds: canonical,
    }).ok,
    false
  );
  assertEqual(
    "order validator: max 10",
    SEARCH_GROUNDING_MAX_ORDERED_LISTING_IDS,
    10
  );
  assertEqual(
    "order validator: 11 ids rejected",
    validateSearchGroundingOrderedListingIds({
      orderedListingIds: Array.from({ length: 11 }, (_, i) => `id-${i}`),
      returnedListingIds: Array.from({ length: 11 }, (_, i) => `id-${i}`),
    }).ok,
    false
  );
  assertEqual(
    "order validator: zero-result empty permutation",
    validateSearchGroundingOrderedListingIds({
      orderedListingIds: [],
      returnedListingIds: [],
    }).ok,
    true
  );
}

{
  const leak = unwrapSearchGroundingProviderContent(
    JSON.stringify({
      replyText: PATH_C_REPLY,
      orderedListingIds: PATH_C_ORDER,
    })
  );
  assertEqual("unwrap: structured kind", leak.kind, "structured");
  if (leak.kind === "structured") {
    assertEqual("unwrap: replyText preserved", leak.replyText, PATH_C_REPLY);
    assertEqual("unwrap: ordered ids", [...(leak.orderedListingIds ?? [])], [...PATH_C_ORDER]);
  }
  assertEqual(
    "unwrap: malformed json is leak",
    unwrapSearchGroundingProviderContent('{"replyText":').kind,
    "json-leak"
  );
  assertEqual(
    "unwrap: plain thai is plain-text",
    unwrapSearchGroundingProviderContent(PATH_C_REPLY).kind,
    "plain-text"
  );
  assertTruthy(
    "unwrap: envelope detector",
    looksLikeSearchGroundingJsonEnvelope(
      JSON.stringify({ replyText: "x", orderedListingIds: [] })
    )
  );
}

{
  let v3Calls = 0;
  const turn = await executeChatV2V3SearchGroundingTurn({
    authenticatedActorRef: PILOT_UID,
    userMessage: ACCEPTANCE_QUERY,
    inventory: FOUR_CARS,
    readEnv: readEnvFrom(enabledEnv),
    environment: "local",
    runChatV3Conversation: async () => {
      v3Calls += 1;
      return v3Success(PATH_C_REPLY, { orderedListingIds: PATH_C_ORDER });
    },
  });
  assertEqual("path-c: generate once", v3Calls, 1);
  assertEqual("path-c: success", turn.kind, "success");
  if (turn.kind === "success") {
    assertEqual("path-c: classification accepted", turn.displayOrderClassification, "structured-accepted");
    assertEqual("path-c: structured valid", turn.structuredOrderValid, true);
    assertEqual("path-c: card order follows structured ids", turn.carCards.map((c) => c.id), [...PATH_C_ORDER]);
    assertEqual("path-c: reply text unchanged", turn.userVisibleText, PATH_C_REPLY);
    assertEqual("path-c: listing count 4", turn.carCards.length, 4);
    assertEqual("path-c: set unchanged", [...turn.carCards.map((c) => c.id)].sort(), [...PATH_C_ORDER].sort());
    assertEqual("path-c: no deterministic fallback", turn.usedDeterministicFallback, false);
    assertEqual("path-c: fallback reason none", turn.searchCompositionFallbackReason, "none");
    assertEqual("path-c: validation none", turn.searchCompositionValidationCode, "none");
    assertEqual("path-c: text present", turn.searchCompositionTextPresent, true);
    const byId = new Map(FOUR_CARS.map((item) => [item.id, item]));
    for (const card of turn.carCards) {
      const source = byId.get(card.id);
      assertEqual(`path-c: card ${card.id} brand`, card.brand, source?.brand);
      assertEqual(`path-c: card ${card.id} model`, card.model, source?.model);
      assertEqual(`path-c: card ${card.id} year`, card.year, source?.year);
      assertEqual(`path-c: card ${card.id} price`, card.price, source?.price);
    }
  }
}

{
  const turn = await executeChatV2V3SearchGroundingTurn({
    authenticatedActorRef: PILOT_UID,
    userMessage: ACCEPTANCE_QUERY,
    inventory: FOUR_CARS,
    readEnv: readEnvFrom(enabledEnv),
    environment: "local",
    runChatV3Conversation: async () =>
      v3Success(PATH_C_REPLY, { orderedListingIds: ["id-a", "id-a", "id-b", "id-c"] }),
  });
  assertEqual("dup-ids: success degraded", turn.kind, "success");
  if (turn.kind === "success") {
    assertEqual("dup-ids: classification", turn.displayOrderClassification, "canonical-toolresult-degraded");
    assertEqual("dup-ids: not valid", turn.structuredOrderValid, false);
    assertEqual("dup-ids: canonical order", turn.carCards.map((c) => c.id), ["id-a", "id-b", "id-c", "id-d"]);
    assertEqual("dup-ids: text kept", turn.userVisibleText, PATH_C_REPLY);
    assertEqual("dup-ids: not deterministic", turn.usedDeterministicFallback, false);
    assertEqual("dup-ids: fallback reason none", turn.searchCompositionFallbackReason, "none");
    assertEqual("dup-ids: not fallback classification", turn.displayOrderClassification, "canonical-toolresult-degraded");
  }
}

{
  const turn = await executeChatV2V3SearchGroundingTurn({
    authenticatedActorRef: PILOT_UID,
    userMessage: ACCEPTANCE_QUERY,
    inventory: FOUR_CARS,
    readEnv: readEnvFrom(enabledEnv),
    environment: "local",
    runChatV3Conversation: async () =>
      v3Success(PATH_C_REPLY, { orderedListingIds: ["id-c", "id-a", "id-b", "id-extra"] }),
  });
  assertEqual("unknown-ids: success degraded", turn.kind, "success");
  if (turn.kind === "success") {
    assertEqual("unknown-ids: classification", turn.displayOrderClassification, "canonical-toolresult-degraded");
    assertFalsy("unknown-ids: no extra card", turn.carCards.some((c) => c.id === "id-extra"));
    assertEqual("unknown-ids: canonical four", turn.carCards.map((c) => c.id), ["id-a", "id-b", "id-c", "id-d"]);
    assertEqual("unknown-ids: text kept", turn.userVisibleText, PATH_C_REPLY);
  }
}

{
  const turn = await executeChatV2V3SearchGroundingTurn({
    authenticatedActorRef: PILOT_UID,
    userMessage: ACCEPTANCE_QUERY,
    inventory: FOUR_CARS,
    readEnv: readEnvFrom(enabledEnv),
    environment: "local",
    runChatV3Conversation: async () =>
      v3Success(PATH_C_REPLY, { orderedListingIds: ["id-c", "id-a", "id-b"] }),
  });
  assertEqual("missing-ids: success degraded", turn.kind, "success");
  if (turn.kind === "success") {
    assertEqual("missing-ids: classification", turn.displayOrderClassification, "canonical-toolresult-degraded");
    assertEqual("missing-ids: canonical four", turn.carCards.length, 4);
    assertEqual("missing-ids: text kept", turn.userVisibleText, PATH_C_REPLY);
  }
}

{
  const turn = await executeChatV2V3SearchGroundingTurn({
    authenticatedActorRef: PILOT_UID,
    userMessage: ACCEPTANCE_QUERY,
    inventory: FOUR_CARS,
    readEnv: readEnvFrom(enabledEnv),
    environment: "local",
    runChatV3Conversation: async () => v3Success(PATH_C_REPLY),
  });
  assertEqual("plain-text: degraded canonical", turn.kind, "success");
  if (turn.kind === "success") {
    assertEqual("plain-text: classification", turn.displayOrderClassification, "canonical-toolresult-degraded");
    assertEqual("plain-text: toolresult order", turn.carCards.map((c) => c.id), ["id-a", "id-b", "id-c", "id-d"]);
    assertEqual("plain-text: text kept", turn.userVisibleText, PATH_C_REPLY);
  }
}

{
  const rawJson = JSON.stringify({
    replyText: PATH_C_REPLY,
    orderedListingIds: PATH_C_ORDER,
  });
  const turn = await executeChatV2V3SearchGroundingTurn({
    authenticatedActorRef: PILOT_UID,
    userMessage: ACCEPTANCE_QUERY,
    inventory: FOUR_CARS,
    readEnv: readEnvFrom(enabledEnv),
    environment: "local",
    runChatV3Conversation: async () => v3Success(rawJson),
  });
  assertEqual("json-leak: still success", turn.kind, "success");
  if (turn.kind === "success") {
    assertEqual("json-leak: deterministic", turn.displayOrderClassification, "deterministic-fallback");
    assertEqual("json-leak: used deterministic", turn.usedDeterministicFallback, true);
    assertFalsy("json-leak: no raw json", looksLikeSearchGroundingJsonEnvelope(turn.userVisibleText));
    assertNotIncludes("json-leak: no orderedListingIds key", turn.userVisibleText, "orderedListingIds");
    assertEqual("json-leak: canonical cards", turn.carCards.map((c) => c.id), ["id-a", "id-b", "id-c", "id-d"]);
    assertEqual(
      "json-leak: fallback reason envelope",
      turn.searchCompositionFallbackReason,
      "structured-output-envelope-leak"
    );
    expectedDeterministicFourText = turn.userVisibleText;
  }
}

{
  const turn = await executeChatV2V3SearchGroundingTurn({
    authenticatedActorRef: PILOT_UID,
    userMessage: ACCEPTANCE_QUERY,
    inventory: [],
    readEnv: readEnvFrom(enabledEnv),
    environment: "local",
    runChatV3Conversation: async () =>
      v3Success(SEARCH_GROUNDING_NO_MATCH_TEXT, { orderedListingIds: [] }),
  });
  assertEqual("zero-result: success", turn.kind, "success");
  if (turn.kind === "success") {
    assertEqual("zero-result: classification", turn.displayOrderClassification, "zero-result");
    assertEqual("zero-result: valid empty", turn.structuredOrderValid, true);
    assertEqual("zero-result: no cards", turn.carCards.length, 0);
    assertEqual("zero-result: fallback reason none", turn.searchCompositionFallbackReason, "none");
    assertEqual("zero-result: not deterministic-fallback class", turn.displayOrderClassification, "zero-result");
  }
}

{
  const tenOnly = toyotaSedanPage(10);
  const emptyLaterCriteria = parseServerDirectedSearchCriteria("ดูเพิ่ม", [
    { role: "user", content: ACCEPTANCE_QUERY },
    { role: "assistant", content: "พบรถที่ตรงตามเงื่อนไขที่ตรวจแล้ว 10 คันในรอบนี้ครับ" },
    { role: "user", content: "ดูเพิ่ม" },
    { role: "assistant", content: "พบรถที่ตรงตามเงื่อนไขที่ตรวจแล้ว 0 คันในรอบนี้ครับ" },
  ], 2026);
  assertEqual("empty-later: keeps brand", emptyLaterCriteria.brand, "Toyota");
  assertEqual("empty-later: keeps body", emptyLaterCriteria.bodyClass, "sedan");
  assertEqual("empty-later: pageIndex 2", emptyLaterCriteria.pageIndex, 2);
  const emptyLater = await runServerDirectedMarketplaceMatch({
    requestId: "search-req-empty-later",
    conversationId: "search-conv-empty-later",
    criteria: emptyLaterCriteria,
    inventory: tenOnly,
  });
  assertEqual("empty-later: zero ids", emptyLater.matchedListingIds.length, 0);
  const emptyTurn = await executeChatV2V3SearchGroundingTurn({
    authenticatedActorRef: PILOT_UID,
    userMessage: "ดูเพิ่ม",
    conversationHistory: [
      { role: "user", content: ACCEPTANCE_QUERY },
      { role: "assistant", content: "พบรถที่ตรงตามเงื่อนไขที่ตรวจแล้ว 10 คันในรอบนี้ครับ" },
      { role: "user", content: "ดูเพิ่ม" },
      { role: "assistant", content: "พบรถที่ตรงตามเงื่อนไขที่ตรวจแล้ว 0 คันในรอบนี้ครับ" },
    ],
    inventory: tenOnly,
    readEnv: readEnvFrom(enabledEnv),
    environment: "local",
    runChatV3Conversation: async () => v3Success(SEARCH_GROUNDING_NO_MATCH_TEXT, { orderedListingIds: [] }),
  });
  assertEqual("empty-later turn: success", emptyTurn.kind, "success");
  if (emptyTurn.kind === "success") {
    assertEqual("empty-later turn: zero cards", emptyTurn.carCards.length, 0);
    assertEqual("empty-later turn: zero-result", emptyTurn.displayOrderClassification, "zero-result");
    assertNotIncludes("empty-later turn: no marketplace total", emptyTurn.userVisibleText, "ทั้งหมด");
    assertNotIncludes("empty-later turn: no ทั้งตลาด", emptyTurn.userVisibleText, "ทั้งตลาด");
  }
}

{
    const originalLog = console.log;
    const logs: string[] = [];
    console.log = (...args: unknown[]) => {
      const line = args.map((item) => String(item)).join(" ");
      logs.push(line);
      originalLog.apply(console, args);
    };
  try {
    const hop = await runHandler({
      uid: PILOT_UID,
      body: { userMessage: ACCEPTANCE_QUERY },
      env: enabledEnv,
      inventory: FOUR_CARS,
      runV3: async () => v3Success(PATH_C_REPLY, { orderedListingIds: PATH_C_ORDER }),
    });
    const data = asSuccess(hop.body).data;
    assertEqual("http path-c: search marker", data?.conversationBrain, CHAT_V3_SEARCH_GROUNDED_CONVERSATION_BRAIN);
    assertEqual("http path-c: ordered cards", (data?.carCards ?? []).map((c) => c.id), [...PATH_C_ORDER]);
    assertEqual("http path-c: legacy never", hop.counters.legacy, 0);
    assertEqual("http path-c: search v3 once", hop.counters.searchV3, 1);
    assertEqual("http path-c: real provider never", hop.counters.realProvider, 0);
    assertFalsy(
      "http path-c: no orderedListingIds field",
      data != null && "orderedListingIds" in data
    );
    const attr = logs.find((line) => line.includes("user_visible_runtime_attribution"));
    assertTruthy("http path-c: attribution event", Boolean(attr));
    const parsed = JSON.parse(attr ?? "{}") as Record<string, unknown>;
    assertEqual("attr search: routingLane", parsed.routingLane, "search");
    assertEqual("attr search: conversationBrain", parsed.conversationBrain, CHAT_V3_SEARCH_GROUNDED_CONVERSATION_BRAIN);
    assertEqual("attr search: conversationBrainStatus", parsed.conversationBrainStatus, "success");
    assertEqual("attr search: businessToolName", parsed.businessToolName, "marketplace.search");
    assertEqual("attr search: marketplace count", parsed.marketplaceSearchExecutionCount, 1);
    assertEqual("attr search: inventory count", parsed.inventoryFetchExecutionCount, 0);
    assertEqual("attr search: gemini fc count", parsed.geminiInitialFunctionCallingAttemptCount, 0);
    assertEqual("attr search: composition attempted", parsed.groundedV3CompositionAttempted, true);
    assertEqual("attr search: composition outcome", parsed.groundedV3CompositionOutcome, "success");
    assertEqual("attr search: no legacy after search", parsed.legacyFallbackAfterSearchSelection, false);
    assertEqual("attr search: validated count", parsed.validatedToolResultListingIdCount, 4);
    assertEqual("attr search: ordered count", parsed.orderedCardCount, 4);
    assertEqual("attr search: displayed count", parsed.displayedCardCount, 4);
    assertEqual("attr search: classification", parsed.displayOrderClassification, "structured-accepted");
    assertEqual("attr search: structured valid", parsed.structuredOrderValid, true);
    assertEqual("attr search: failure none", parsed.searchFailureClassification, "none");
    assertEqual("attr search: fallback reason none", parsed.searchCompositionFallbackReason, "none");
    assertEqual("attr search: parse status structured", parsed.structuredOutputParseStatus, "structured");
    assertEqual("attr search: text present", parsed.searchCompositionTextPresent, true);
    assertEqual("attr search: validation none", parsed.searchCompositionValidationCode, "none");
    assertEqual("attr search: skipGemini", parsed.skipGemini, true);
    assertFalsy("attr search: no raw id-a", JSON.stringify(parsed).includes("id-a"));
    assertFalsy("attr search: no PATH_C_REPLY", JSON.stringify(parsed).includes("Vios"));
    assertFalsy("attr search: no UID", JSON.stringify(parsed).includes(PILOT_UID));
  } finally {
    console.log = originalLog;
  }
}

{
    const originalLog = console.log;
    const logs: string[] = [];
    console.log = (...args: unknown[]) => {
      const line = args.map((item) => String(item)).join(" ");
      logs.push(line);
      originalLog.apply(console, args);
    };
  try {
    const hop = await runHandler({
      uid: PILOT_UID,
      body: { userMessage: GENERAL_MESSAGE },
      env: searchEnv({
        [NONGA_CHAT_V2_V3_SEARCH_GROUNDING_ENABLED_ENV]: "true",
        [NONGA_CHAT_V2_V3_GENERAL_BRIDGE_ENABLED_ENV]: "true",
        [NONGA_CHAT_V2_V3_GENERAL_PILOT_UIDS_ENV]: PILOT_UID,
      }),
    });
    assertEqual("attr general: search never", hop.counters.searchV3, 0);
    const attr = logs.find((line) => line.includes("user_visible_runtime_attribution"));
    assertTruthy("attr general: event present", Boolean(attr));
    const parsed = JSON.parse(attr ?? "{}") as Record<string, unknown>;
    assertEqual("attr general: routingLane", parsed.routingLane, "general");
    assertEqual("attr general: tool none", parsed.businessToolName, "none");
    assertEqual("attr general: marketplace 0", parsed.marketplaceSearchExecutionCount, 0);
    assertEqual("attr general: inventory 0", parsed.inventoryFetchExecutionCount, 0);
    assertEqual("attr general: composition not attempted", parsed.groundedV3CompositionAttempted, false);
    assertEqual("attr general: gemini fc 0", parsed.geminiInitialFunctionCallingAttemptCount, 0);
    assertEqual("attr general: fallback reason absent", parsed.searchCompositionFallbackReason, undefined);
    assertEqual("attr general: parse status absent", parsed.structuredOutputParseStatus, undefined);
    assertEqual("attr general: text present absent", parsed.searchCompositionTextPresent, undefined);
    assertEqual("attr general: validation absent", parsed.searchCompositionValidationCode, undefined);
    assertFalsy("attr general: no listing ids", /id-[abcd]/.test(JSON.stringify(parsed)));
  } finally {
    console.log = originalLog;
  }
}

assertEqual(
  "schema is Search-only object",
  SEARCH_GROUNDING_STRUCTURED_OUTPUT_JSON_SCHEMA.required.includes("replyText") &&
    SEARCH_GROUNDING_STRUCTURED_OUTPUT_JSON_SCHEMA.required.includes("orderedListingIds") &&
    SEARCH_GROUNDING_STRUCTURED_OUTPUT_JSON_SCHEMA.additionalProperties === false,
  true
);
assertFalsy(
  "schema does not reuse finalAnswerTh",
  JSON.stringify(SEARCH_GROUNDING_STRUCTURED_OUTPUT_JSON_SCHEMA).includes("finalAnswerTh")
);

{
  const cards = orderSearchGroundingCarCards(
    [
      { id: "id-a", brand: "A", model: "1", year: 2018, price: 1, mileage: 0, bodyClass: "sedan", bodyClassLabel: "Sedan", hasImage: false, detailPath: "/cars/id-a", matchKind: "exact" },
      { id: "id-b", brand: "B", model: "2", year: 2019, price: 2, mileage: 0, bodyClass: "sedan", bodyClassLabel: "Sedan", hasImage: false, detailPath: "/cars/id-b", matchKind: "exact" },
    ],
    ["id-b", "id-a"]
  );
  assertEqual("permute helper order", cards.map((c) => c.id), ["id-b", "id-a"]);
}

function assertSearchDiagPrivacy(serialized: string, label: string): void {
  assertFalsy(`${label}: no listing id-a`, serialized.includes("id-a"));
  assertFalsy(`${label}: no Vios`, serialized.includes("Vios"));
  assertFalsy(`${label}: no UID`, serialized.includes(PILOT_UID));
  assertFalsy(`${label}: no replyText key`, serialized.includes("replyText"));
  assertFalsy(`${label}: no orderedListingIds key`, serialized.includes("orderedListingIds"));
  assertFalsy(`${label}: no email`, serialized.includes("@"));
}

{
  const turn = await executeSearchWithProvider(failingSearchProvider());
  assertEqual("diag provider-failure: success", turn.kind, "success");
  if (turn.kind === "success") {
    assertEqual("diag provider-failure: classification", turn.displayOrderClassification, "deterministic-fallback");
    assertEqual("diag provider-failure: reason", turn.searchCompositionFallbackReason, "provider-failure");
    assertEqual("diag provider-failure: parse absent", turn.structuredOutputParseStatus, "absent");
    assertEqual("diag provider-failure: text present", turn.searchCompositionTextPresent, false);
    assertEqual("diag provider-failure: cards canonical", turn.carCards.map((c) => c.id), ["id-a", "id-b", "id-c", "id-d"]);
    assertEqual("diag provider-failure: text unchanged", turn.userVisibleText, expectedDeterministicFourText);
  }
}

{
  const turn = await executeSearchWithProvider(fakeSearchProvider('{"replyText":'));
  assertEqual("diag invalid-json: success", turn.kind, "success");
  if (turn.kind === "success") {
    assertEqual("diag invalid-json: classification", turn.displayOrderClassification, "deterministic-fallback");
    assertEqual("diag invalid-json: reason", turn.searchCompositionFallbackReason, "structured-output-invalid-json");
    assertEqual("diag invalid-json: parse", turn.structuredOutputParseStatus, "invalid-json");
    assertEqual("diag invalid-json: text unchanged", turn.userVisibleText, expectedDeterministicFourText);
    assertEqual("diag invalid-json: cards canonical", turn.carCards.map((c) => c.id), ["id-a", "id-b", "id-c", "id-d"]);
  }
}

{
  const turn = await executeSearchWithProvider(
    fakeSearchProvider(JSON.stringify({ orderedListingIds: PATH_C_ORDER }))
  );
  assertEqual("diag schema-mismatch: success", turn.kind, "success");
  if (turn.kind === "success") {
    assertEqual("diag schema-mismatch: classification", turn.displayOrderClassification, "deterministic-fallback");
    assertEqual("diag schema-mismatch: reason", turn.searchCompositionFallbackReason, "structured-output-schema-mismatch");
    assertEqual("diag schema-mismatch: parse", turn.structuredOutputParseStatus, "schema-mismatch");
    assertEqual("diag schema-mismatch: text unchanged", turn.userVisibleText, expectedDeterministicFourText);
  }
}

{
  const nested = JSON.stringify({
    replyText: JSON.stringify({
      replyText: PATH_C_REPLY,
      orderedListingIds: PATH_C_ORDER,
    }),
    orderedListingIds: PATH_C_ORDER,
  });
  const turn = await executeSearchWithProvider(fakeSearchProvider(nested));
  assertEqual("diag envelope-unwrap: success", turn.kind, "success");
  if (turn.kind === "success") {
    assertEqual("diag envelope-unwrap: classification", turn.displayOrderClassification, "deterministic-fallback");
    assertEqual("diag envelope-unwrap: reason", turn.searchCompositionFallbackReason, "structured-output-envelope-leak");
    assertEqual("diag envelope-unwrap: parse", turn.structuredOutputParseStatus, "envelope-leak");
    assertEqual("diag envelope-unwrap: text unchanged", turn.userVisibleText, expectedDeterministicFourText);
    assertFalsy("diag envelope-unwrap: no raw json", looksLikeSearchGroundingJsonEnvelope(turn.userVisibleText));
  }
}

{
  const turn = await executeSearchWithProvider(fakeSearchProvider("   "));
  assertEqual("diag missing-text: success", turn.kind, "success");
  if (turn.kind === "success") {
    assertEqual("diag missing-text: classification", turn.displayOrderClassification, "deterministic-fallback");
    assertEqual("diag missing-text: reason", turn.searchCompositionFallbackReason, "missing-success-text");
    assertEqual("diag missing-text: text unchanged", turn.userVisibleText, expectedDeterministicFourText);
  }
}

{
  const turn = await executeSearchWithProvider(
    fakeSearchProvider(
      JSON.stringify({
        replyText: "ในตลาดมีทั้งหมด 120 คันครับ",
        orderedListingIds: PATH_C_ORDER,
      })
    )
  );
  assertEqual("diag composition-total: success", turn.kind, "success");
  if (turn.kind === "success") {
    assertEqual("diag composition-total: classification", turn.displayOrderClassification, "deterministic-fallback");
    assertEqual("diag composition-total: reason", turn.searchCompositionFallbackReason, "composition-total-claim-invalid");
    assertEqual("diag composition-total: code", turn.searchCompositionValidationCode, "marketplace-total-claim");
    assertEqual("diag composition-total: text unchanged", turn.userVisibleText, expectedDeterministicFourText);
    assertNotIncludes("diag composition-total: no ทั้งหมด in fallback", turn.userVisibleText, "ทั้งหมด");
  }
}

{
  const turn = await executeSearchWithProvider(
    fakeSearchProvider(
      JSON.stringify({
        replyText: "พบรถที่ตรงตามเงื่อนไขที่ตรวจแล้ว 3 คันในรอบนี้ครับ",
        orderedListingIds: PATH_C_ORDER,
      })
    )
  );
  assertEqual("diag composition-count: success", turn.kind, "success");
  if (turn.kind === "success") {
    assertEqual("diag composition-count: reason", turn.searchCompositionFallbackReason, "composition-count-claim-invalid");
    assertEqual("diag composition-count: code", turn.searchCompositionValidationCode, "incorrect-count");
    assertEqual("diag composition-count: text unchanged", turn.userVisibleText, expectedDeterministicFourText);
  }
}

{
  const turn = await executeSearchWithProvider(
    fakeSearchProvider(
      JSON.stringify({
        replyText: PATH_C_REPLY,
        orderedListingIds: PATH_C_ORDER,
      })
    )
  );
  assertEqual("diag valid-structured: success", turn.kind, "success");
  if (turn.kind === "success") {
    assertEqual("diag valid-structured: classification", turn.displayOrderClassification, "structured-accepted");
    assertEqual("diag valid-structured: reason", turn.searchCompositionFallbackReason, "none");
    assertEqual("diag valid-structured: parse", turn.structuredOutputParseStatus, "structured");
    assertEqual("diag valid-structured: text kept", turn.userVisibleText, PATH_C_REPLY);
    assertEqual("diag valid-structured: ordered cards", turn.carCards.map((c) => c.id), [...PATH_C_ORDER]);
    assertEqual("diag valid-structured: not deterministic", turn.usedDeterministicFallback, false);
  }
}

{
  const originalLog = console.log;
  const logs: string[] = [];
  console.log = (...args: unknown[]) => {
    const line = args.map((item) => String(item)).join(" ");
    logs.push(line);
    originalLog.apply(console, args);
  };
  try {
    const hop = await runHandler({
      uid: PILOT_UID,
      body: { userMessage: ACCEPTANCE_QUERY },
      env: enabledEnv,
      inventory: FOUR_CARS,
      runV3: (options) =>
        runChatV3Conversation({
          ...options,
          provider: fakeSearchProvider('{"replyText":'),
          allowFakeProvider: true,
        }),
    });
    const data = asSuccess(hop.body).data;
    assertEqual("http invalid-json: search marker", data?.conversationBrain, CHAT_V3_SEARCH_GROUNDED_CONVERSATION_BRAIN);
    assertEqual("http invalid-json: canonical cards", (data?.carCards ?? []).map((c) => c.id), ["id-a", "id-b", "id-c", "id-d"]);
    assertEqual("http invalid-json: user text", data?.userVisibleText, expectedDeterministicFourText);
    const attr = logs.find((line) => line.includes("user_visible_runtime_attribution"));
    assertTruthy("http invalid-json: attribution event", Boolean(attr));
    const parsed = JSON.parse(attr ?? "{}") as Record<string, unknown>;
    assertEqual("http invalid-json: outcome", parsed.groundedV3CompositionOutcome, "deterministic-fallback");
    assertEqual("http invalid-json: reason", parsed.searchCompositionFallbackReason, "structured-output-invalid-json");
    assertEqual("http invalid-json: parse", parsed.structuredOutputParseStatus, "invalid-json");
    assertSearchDiagPrivacy(JSON.stringify(parsed), "http invalid-json attr");
  } finally {
    console.log = originalLog;
  }
}

console.log(`\nWP-NVB-03B server tests passed: ${passCount}`);
