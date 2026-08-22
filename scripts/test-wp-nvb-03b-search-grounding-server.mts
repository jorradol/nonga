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
  SEARCH_READABLE_FALLBACK_NOTICE,
  unwrapSearchGroundingProviderContent,
  prepareSearchNarrativeForMarkdown,
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
import type {
  ChatV3ConversationResponse,
  ChatV3SearchCompositionMetadata,
} from "../src/services/ai/chat-v3/chatV3ConversationContracts.ts";
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
  searchComposition?: ChatV3SearchCompositionMetadata
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
    const localCount = validateSearchGroundingComposition({
      text: "เหมาะเป็นรถ 1 คันสำหรับครอบครัว จากข้อมูลที่ตรวจแล้ว",
      packet: packet.packet,
    });
    assertEqual("grounding: local 1 คัน does not fail concatenated composition", localCount.ok, true);
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
/** Authoritative Search ToolResult / card order for FOUR_CARS fixtures. */
const TOOL_RESULT_ORDER = ["id-a", "id-b", "id-c", "id-d"] as const;
/** Narrative analysis order only — must not force card order. */
const PATH_C_ORDER = ["id-c", "id-a", "id-b", "id-d"] as const;
const PATH_C_INTRO = "เจอรถเก๋งที่ตรวจแล้วในรอบนี้ 4 คันครับ ไล่ดูทีละคันได้เลย";
const PATH_C_INTRO_ALT = "จากรอบนี้มีรถเก๋งให้เทียบ 4 คันครับ ไล่จากตัวเลือกที่น่าดูก่อน";
const PATH_C_CLOSING =
  "แนะนำเทียบปี ราคา และเลขไมล์จากข้อมูลที่ตรวจแล้ว แล้วค่อยนัดดูรถจริงครับ";
const PATH_C_CLOSING_ALT =
  "ถ้ายังตัดสินใจไม่ได้ เทียบคันที่ปีใหม่กว่ากับคันที่งบเหลือมากกว่าได้ครับ";
const PATH_C_ANALYSES: ChatV3SearchCompositionMetadata["vehicleAnalyses"] = [
  {
    listingId: "id-c",
    analysisText: "คันนี้ปีใหม่กว่าในชุดนี้ เหมาะถ้าโฟกัสความใหม่ของรถเก๋งใช้ในเมือง",
  },
  {
    listingId: "id-a",
    analysisText: "คันนี้อยู่ในช่วงงบและน่าเทียบถ้าต้องการสมดุลราคากับการใช้งานทั่วไป",
  },
  {
    listingId: "id-b",
    analysisText: "คันนี้เป็นตัวเลือกสำรองถ้าอยากได้รถเก๋งขนาดเล็กกว่าในชุดนี้",
  },
  {
    listingId: "id-d",
    analysisText: "คันนี้เด่นเรื่องความใหญ่ของตัวรถในชุดนี้ แต่ควรเทียบงบก่อนตัดสินใจ",
  },
];
let expectedDeterministicFourText = "";

function pathCComposition(
  overrides: Partial<ChatV3SearchCompositionMetadata> = {}
): ChatV3SearchCompositionMetadata {
  return {
    introText: PATH_C_INTRO,
    vehicleAnalyses: PATH_C_ANALYSES,
    closingText: PATH_C_CLOSING,
    ...overrides,
  };
}

function v3StructuredSuccess(
  composition: ChatV3SearchCompositionMetadata = pathCComposition()
): ChatV3ConversationResponse {
  const content = [
    composition.introText,
    ...composition.vehicleAnalyses.map((item) => item.analysisText),
    composition.closingText,
  ]
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join("\n\n");
  return v3Success(content, composition);
}

function pathCProviderJson(
  overrides: Record<string, unknown> = {}
): string {
  return JSON.stringify({
    introText: PATH_C_INTRO,
    vehicleAnalyses: PATH_C_ANALYSES,
    closingText: PATH_C_CLOSING,
    ...overrides,
  });
}

function analysesForIds(
  ids: readonly string[],
  text = "คันนี้เป็นตัวเลือกที่เทียบได้จากข้อมูลที่ตรวจแล้วในรอบนี้"
): ChatV3SearchCompositionMetadata["vehicleAnalyses"] {
  return ids.map((listingId) => ({ listingId, analysisText: text }));
}

function assertNoCompetingMarkdownLayout(label: string, text: string): void {
  assertFalsy(`${label}: no ATX heading line`, /(^|\n)#{1,6}\s/.test(text));
  assertFalsy(`${label}: no blockquote line`, /(^|\n)>/.test(text));
  assertFalsy(`${label}: no code fence line`, /(^|\n)```/.test(text));
  assertFalsy(`${label}: no raw HTML tag`, /<(?:div|script|img|br|p|a)\b/i.test(text));
  assertFalsy(`${label}: no markdown image`, /!\[[^\]]*\]\s*\(/.test(text));
  assertFalsy(`${label}: no markdown link`, /\[[^\]]+\]\s*\(/.test(text));
  const lines = text.split("\n");
  const extraNumbered = lines.filter(
    (line) => /^\d+\.\s+/.test(line) && !/^\d+\.\s+\*\*/.test(line)
  );
  const extraBullets = lines.filter(
    (line) =>
      /^[-+]\s+/.test(line) &&
      !line.startsWith("- **ราคา:**") &&
      !line.startsWith("- **เลขไมล์:**") &&
      !line.startsWith("- **มุมมองของเอ:**")
  );
  assertEqual(`${label}: no extra numbered lines`, extraNumbered, []);
  assertEqual(`${label}: no extra bullet lines`, extraBullets, []);
}

function assertSeparatedVehicleSections(
  label: string,
  text: string,
  cars: readonly ChatInventoryCar[],
  order: readonly string[]
): void {
  const paragraphs = text.split(/\n\s*\n/);
  const identities = order.map((id) => {
    const item = cars.find((carItem) => carItem.id === id);
    return `${item?.year} ${item?.brand} ${item?.model}`;
  });
  for (let index = 0; index < identities.length; index += 1) {
    const heading = `${index + 1}. **${identities[index]}**`;
    assertIncludes(`${label}: section ${index + 1} heading`, text, heading);
    const item = cars.find((carItem) => carItem.id === order[index]);
    assertIncludes(
      `${label}: section ${index + 1} trusted price`,
      text,
      `**ราคา:** ${item?.price.toLocaleString("th-TH")} บาท`
    );
    if (item?.mileage) {
      assertIncludes(
        `${label}: section ${index + 1} trusted mileage`,
        text,
        `**เลขไมล์:** ${item.mileage.toLocaleString("th-TH")} กม.`
      );
    }
  }
  assertEqual(
    `${label}: not one dense paragraph`,
    identities.every((identity) => paragraphs.some((block) => identities.every((other) => block.includes(other)))),
    false
  );
  assertFalsy(
    `${label}: no raw listing id`,
    order.some((id) => text.includes(id))
  );
}

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
  const leak = unwrapSearchGroundingProviderContent(pathCProviderJson());
  assertEqual("unwrap: structured kind", leak.kind, "structured");
  if (leak.kind === "structured") {
    assertEqual("unwrap: introText preserved", leak.introText, PATH_C_INTRO);
    assertEqual("unwrap: closingText preserved", leak.closingText, PATH_C_CLOSING);
    assertEqual(
      "unwrap: analysis order",
      leak.vehicleAnalyses.map((item) => item.listingId),
      [...PATH_C_ORDER]
    );
  }
  assertEqual(
    "unwrap: malformed json is leak",
    unwrapSearchGroundingProviderContent('{"introText":').kind,
    "json-leak"
  );
  assertEqual(
    "unwrap: plain thai is plain-text",
    unwrapSearchGroundingProviderContent(PATH_C_REPLY).kind,
    "plain-text"
  );
  assertEqual(
    "unwrap: legacy replyText schema is leak",
    unwrapSearchGroundingProviderContent(
      JSON.stringify({ replyText: PATH_C_REPLY, orderedListingIds: PATH_C_ORDER })
    ).kind,
    "json-leak"
  );
  assertTruthy(
    "unwrap: envelope detector",
    looksLikeSearchGroundingJsonEnvelope(
      JSON.stringify({ introText: "x", vehicleAnalyses: [], closingText: "" })
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
      return v3StructuredSuccess();
    },
  });
  assertEqual("path-c: generate once", v3Calls, 1);
  assertEqual("path-c: success", turn.kind, "success");
  if (turn.kind === "success") {
    assertEqual("path-c: classification accepted", turn.displayOrderClassification, "structured-accepted");
    assertEqual("path-c: presentation vehicle-sections", turn.searchPresentationMode, "vehicle-sections");
    assertEqual("path-c: structured valid", turn.structuredOrderValid, true);
    assertEqual("path-c: card order follows toolresult ids", turn.carCards.map((c) => c.id), [...TOOL_RESULT_ORDER]);
    assertEqual("path-c: listing count 4", turn.carCards.length, 4);
    assertEqual("path-c: set unchanged", [...turn.carCards.map((c) => c.id)].sort(), [...TOOL_RESULT_ORDER].sort());
    assertEqual("path-c: no deterministic fallback", turn.usedDeterministicFallback, false);
    assertEqual("path-c: fallback reason none", turn.searchCompositionFallbackReason, "none");
    assertEqual("path-c: validation none", turn.searchCompositionValidationCode, "none");
    assertEqual("path-c: text present", turn.searchCompositionTextPresent, true);
    assertIncludes("path-c: provider intro", turn.userVisibleText, PATH_C_INTRO);
    assertIncludes("path-c: provider closing", turn.userVisibleText, PATH_C_CLOSING);
    assertIncludes("path-c: first analysis under vehicle", turn.userVisibleText, PATH_C_ANALYSES[0].analysisText);
    assertNotIncludes("path-c: no dense free-form list", turn.userVisibleText, PATH_C_REPLY);
    assertNotIncludes("path-c: no svg", turn.userVisibleText, "svg");
    assertSeparatedVehicleSections("path-c", turn.userVisibleText, FOUR_CARS, PATH_C_ORDER);
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
      v3StructuredSuccess(
        pathCComposition({
          vehicleAnalyses: analysesForIds(["id-a", "id-a", "id-b", "id-c"]),
        })
      ),
  });
  assertEqual("dup-ids: success fallback", turn.kind, "success");
  if (turn.kind === "success") {
    assertEqual("dup-ids: classification", turn.displayOrderClassification, "deterministic-fallback");
    assertEqual("dup-ids: presentation readable-fallback", turn.searchPresentationMode, "readable-fallback");
    assertEqual("dup-ids: not valid", turn.structuredOrderValid, false);
    assertEqual("dup-ids: canonical order", turn.carCards.map((c) => c.id), ["id-a", "id-b", "id-c", "id-d"]);
    assertEqual("dup-ids: used deterministic", turn.usedDeterministicFallback, true);
    assertEqual("dup-ids: fallback reason", turn.searchCompositionFallbackReason, "composition-validation-failed");
    assertIncludes("dup-ids: fallback notice", turn.userVisibleText, SEARCH_READABLE_FALLBACK_NOTICE);
    assertNotIncludes("dup-ids: no invented analysis", turn.userVisibleText, "มุมมองของเอ");
    assertSeparatedVehicleSections("dup-ids", turn.userVisibleText, FOUR_CARS, ["id-a", "id-b", "id-c", "id-d"]);
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
      v3StructuredSuccess(
        pathCComposition({
          vehicleAnalyses: analysesForIds(["id-c", "id-a", "id-b", "id-extra"]),
        })
      ),
  });
  assertEqual("unknown-ids: success fallback", turn.kind, "success");
  if (turn.kind === "success") {
    assertEqual("unknown-ids: classification", turn.displayOrderClassification, "deterministic-fallback");
    assertFalsy("unknown-ids: no extra card", turn.carCards.some((c) => c.id === "id-extra"));
    assertEqual("unknown-ids: canonical four", turn.carCards.map((c) => c.id), ["id-a", "id-b", "id-c", "id-d"]);
    assertNotIncludes("unknown-ids: no extra id in text", turn.userVisibleText, "id-extra");
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
      v3StructuredSuccess(
        pathCComposition({
          vehicleAnalyses: analysesForIds(["id-c", "id-a", "id-b"]),
        })
      ),
  });
  assertEqual("subset-analyses: success", turn.kind, "success");
  if (turn.kind === "success") {
    assertEqual("subset-analyses: classification", turn.displayOrderClassification, "structured-accepted");
    assertEqual("subset-analyses: presentation", turn.searchPresentationMode, "vehicle-sections");
    assertEqual("subset-analyses: canonical four cards", turn.carCards.map((c) => c.id), [...TOOL_RESULT_ORDER]);
    assertEqual("subset-analyses: not deterministic", turn.usedDeterministicFallback, false);
    assertEqual("subset-analyses: three views", (turn.userVisibleText.match(/มุมมองของเอ/g) ?? []).length, 3);
    assertNotIncludes("subset-analyses: no readable notice", turn.userVisibleText, SEARCH_READABLE_FALLBACK_NOTICE);
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
  assertEqual("plain-text: readable fallback", turn.kind, "success");
  if (turn.kind === "success") {
    assertEqual("plain-text: classification", turn.displayOrderClassification, "deterministic-fallback");
    assertEqual("plain-text: toolresult order", turn.carCards.map((c) => c.id), ["id-a", "id-b", "id-c", "id-d"]);
    assertIncludes("plain-text: fallback notice", turn.userVisibleText, SEARCH_READABLE_FALLBACK_NOTICE);
    assertNotIncludes("plain-text: no free-form list", turn.userVisibleText, PATH_C_REPLY);
  }
}

{
  const rawJson = pathCProviderJson();
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
    assertNotIncludes("json-leak: no vehicleAnalyses key", turn.userVisibleText, "vehicleAnalyses");
    assertEqual("json-leak: canonical cards", turn.carCards.map((c) => c.id), ["id-a", "id-b", "id-c", "id-d"]);
    assertEqual(
      "json-leak: fallback reason envelope",
      turn.searchCompositionFallbackReason,
      "structured-output-envelope-leak"
    );
    assertIncludes("json-leak: readable sections", turn.userVisibleText, SEARCH_READABLE_FALLBACK_NOTICE);
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
      v3StructuredSuccess({
        introText: SEARCH_GROUNDING_NO_MATCH_TEXT,
        vehicleAnalyses: [],
        closingText: "",
      }),
  });
  assertEqual("zero-result: success", turn.kind, "success");
  if (turn.kind === "success") {
    assertEqual("zero-result: classification", turn.displayOrderClassification, "zero-result");
    assertEqual("zero-result: presentation", turn.searchPresentationMode, "zero-result");
    assertEqual("zero-result: valid empty", turn.structuredOrderValid, true);
    assertEqual("zero-result: no cards", turn.carCards.length, 0);
    assertEqual("zero-result: listing count", turn.validatedToolResultListingIdCount, 0);
    assertEqual("zero-result: fallback reason none", turn.searchCompositionFallbackReason, "none");
    assertEqual("zero-result: text present", turn.searchCompositionTextPresent, true);
    assertEqual("zero-result: keeps V.3 text", turn.userVisibleText, SEARCH_GROUNDING_NO_MATCH_TEXT);
    assertEqual("zero-result: not deterministic-fallback class", turn.displayOrderClassification, "zero-result");
    assertEqual("zero-result: not deterministic fallback", turn.usedDeterministicFallback, false);
    assertNotIncludes("zero-result: no numbered section", turn.userVisibleText, "1. **");
  }
}

{
  let v3Calls = 0;
  const natural =
    "งบนี้ยังไม่มีตัวเลือกที่ตรวจแล้วครับ ถ้าปรับช่วงราคาได้ บอกเอได้นะครับ";
  const turn = await executeChatV2V3SearchGroundingTurn({
    authenticatedActorRef: PILOT_UID,
    userMessage: ACCEPTANCE_QUERY,
    inventory: [],
    readEnv: readEnvFrom(enabledEnv),
    environment: "local",
    runChatV3Conversation: async () => {
      v3Calls += 1;
      return v3StructuredSuccess({
        introText: natural,
        vehicleAnalyses: [],
        closingText: "",
      });
    },
  });
  assertEqual("zero-natural: success", turn.kind, "success");
  assertEqual("zero-natural: one model call", v3Calls, 1);
  if (turn.kind === "success") {
    assertEqual("zero-natural: classification", turn.displayOrderClassification, "zero-result");
    assertEqual("zero-natural: presentation", turn.searchPresentationMode, "zero-result");
    assertEqual("zero-natural: no cards", turn.carCards.length, 0);
    assertEqual("zero-natural: listing count", turn.validatedToolResultListingIdCount, 0);
    assertEqual("zero-natural: fallback none", turn.searchCompositionFallbackReason, "none");
    assertEqual("zero-natural: text present", turn.searchCompositionTextPresent, true);
    assertEqual("zero-natural: keeps V.3", turn.userVisibleText, natural);
    assertEqual("zero-natural: not deterministic", turn.usedDeterministicFallback, false);
    assertSearchDiagPrivacy(
      JSON.stringify({
        ...turn,
        userVisibleText: "",
      }),
      "zero-natural diag"
    );
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
      v3StructuredSuccess({
        introText: "",
        vehicleAnalyses: [],
        closingText: "",
      }),
  });
  assertEqual("zero-empty: success", turn.kind, "success");
  if (turn.kind === "success") {
    assertEqual("zero-empty: classification", turn.displayOrderClassification, "zero-result");
    assertEqual("zero-empty: presentation", turn.searchPresentationMode, "zero-result");
    assertEqual("zero-empty: cue", turn.userVisibleText, SEARCH_GROUNDING_NO_MATCH_TEXT);
    assertEqual("zero-empty: no cards", turn.carCards.length, 0);
    assertEqual("zero-empty: listing count", turn.validatedToolResultListingIdCount, 0);
    assertEqual("zero-empty: missing-success-text", turn.searchCompositionFallbackReason, "missing-success-text");
    assertEqual("zero-empty: empty-text code", turn.searchCompositionValidationCode, "empty-text");
    assertEqual("zero-empty: text present false", turn.searchCompositionTextPresent, false);
    assertEqual("zero-empty: not deterministic essay", turn.usedDeterministicFallback, false);
    assertNotIncludes("zero-empty: not unavailable", turn.userVisibleText, CHAT_V3_USER_FACING_UNAVAILABLE);
    assertNotIncludes("zero-empty: no numbered section", turn.userVisibleText, "1. **");
    assertSearchDiagPrivacy(JSON.stringify(turn), "zero-empty diag");
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
      v3StructuredSuccess({
        introText: "  \n\t  ",
        vehicleAnalyses: [],
        closingText: "   ",
      }),
  });
  assertEqual("zero-whitespace: success", turn.kind, "success");
  if (turn.kind === "success") {
    assertEqual("zero-whitespace: cue", turn.userVisibleText, SEARCH_GROUNDING_NO_MATCH_TEXT);
    assertEqual("zero-whitespace: no cards", turn.carCards.length, 0);
    assertEqual("zero-whitespace: missing-success-text", turn.searchCompositionFallbackReason, "missing-success-text");
    assertEqual("zero-whitespace: text present false", turn.searchCompositionTextPresent, false);
    assertEqual("zero-whitespace: not deterministic essay", turn.usedDeterministicFallback, false);
  }
}

{
  const turn = await executeChatV2V3SearchGroundingTurn({
    authenticatedActorRef: PILOT_UID,
    userMessage: ACCEPTANCE_QUERY,
    inventory: [],
    readEnv: readEnvFrom(enabledEnv),
    environment: "local",
    runChatV3Conversation: async () => v3Success(""),
  });
  assertEqual("zero-plain-empty: success", turn.kind, "success");
  if (turn.kind === "success") {
    assertEqual("zero-plain-empty: cue", turn.userVisibleText, SEARCH_GROUNDING_NO_MATCH_TEXT);
    assertEqual("zero-plain-empty: no cards", turn.carCards.length, 0);
    assertEqual("zero-plain-empty: missing-success-text", turn.searchCompositionFallbackReason, "missing-success-text");
    assertEqual("zero-plain-empty: not deterministic essay", turn.usedDeterministicFallback, false);
    assertNotIncludes("zero-plain-empty: not unavailable", turn.userVisibleText, CHAT_V3_USER_FACING_UNAVAILABLE);
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
      v3StructuredSuccess({
        introText: "พบรถที่ตรงตามเงื่อนไขที่ตรวจแล้ว 3 คันในรอบนี้ครับ",
        vehicleAnalyses: [],
        closingText: "",
      }),
  });
  assertEqual("zero-false-count: success", turn.kind, "success");
  if (turn.kind === "success") {
    assertEqual("zero-false-count: classification", turn.displayOrderClassification, "zero-result");
    assertNotIncludes("zero-false-count: no 3 คัน", turn.userVisibleText, "3 คัน");
    assertNotIncludes("zero-false-count: no พบรถที่ตรง", turn.userVisibleText, "พบรถที่ตรงตามเงื่อนไขที่ตรวจแล้ว");
    assertEqual("zero-false-count: no cards", turn.carCards.length, 0);
    assertEqual("zero-false-count: not unavailable", turn.kind, "success");
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
      v3StructuredSuccess({
        introText: "เจอรถที่ตรงแล้วครับ",
        vehicleAnalyses: [
          {
            listingId: "id-extra",
            analysisText: "คันนี้ราคา 370,000 บาท จากประกาศที่ตรวจแล้ว",
          },
        ],
        closingText: "",
      }),
  });
  assertEqual("zero-fabricated: success fail-safe", turn.kind, "success");
  if (turn.kind === "success") {
    assertEqual("zero-fabricated: no cards", turn.carCards.length, 0);
    assertNotIncludes("zero-fabricated: no extra id", turn.userVisibleText, "id-extra");
    assertNotIncludes("zero-fabricated: no invented price", turn.userVisibleText, "370,000");
    assertNotIncludes("zero-fabricated: no commentary", turn.userVisibleText, "มุมมองของเอ");
    assertEqual("zero-fabricated: validation failed", turn.searchCompositionValidationCode, "invalid-listing-ids");
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
    runChatV3Conversation: async () =>
      v3StructuredSuccess({
        introText: SEARCH_GROUNDING_NO_MATCH_TEXT,
        vehicleAnalyses: [],
        closingText: "",
      }),
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
      runV3: async () => v3StructuredSuccess(),
    });
    const data = asSuccess(hop.body).data;
    assertEqual("http path-c: search marker", data?.conversationBrain, CHAT_V3_SEARCH_GROUNDED_CONVERSATION_BRAIN);
    assertEqual("http path-c: ordered cards", (data?.carCards ?? []).map((c) => c.id), [...TOOL_RESULT_ORDER]);
    assertEqual("http path-c: legacy never", hop.counters.legacy, 0);
    assertEqual("http path-c: search v3 once", hop.counters.searchV3, 1);
    assertEqual("http path-c: real provider never", hop.counters.realProvider, 0);
    assertFalsy(
      "http path-c: no orderedListingIds field",
      data != null && "orderedListingIds" in data
    );
    assertFalsy(
      "http path-c: no vehicleAnalyses field",
      data != null && "vehicleAnalyses" in data
    );
    assertFalsy(
      "http path-c: no introText field",
      data != null && "introText" in data
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
    assertEqual("attr search: presentation", parsed.searchPresentationMode, "vehicle-sections");
    assertEqual("attr search: structured valid", parsed.structuredOrderValid, true);
    assertEqual("attr search: failure none", parsed.searchFailureClassification, "none");
    assertEqual("attr search: fallback reason none", parsed.searchCompositionFallbackReason, "none");
    assertEqual("attr search: parse status structured", parsed.structuredOutputParseStatus, "structured");
    assertEqual("attr search: text present", parsed.searchCompositionTextPresent, true);
    assertEqual("attr search: validation none", parsed.searchCompositionValidationCode, "none");
    assertEqual("attr search: count disposition none", parsed.searchCountClaimDisposition, "none");
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
    assertEqual("attr general: count disposition absent", parsed.searchCountClaimDisposition, undefined);
    assertFalsy("attr general: no listing ids", /id-[abcd]/.test(JSON.stringify(parsed)));
  } finally {
    console.log = originalLog;
  }
}

assertEqual(
  "schema is Search-only object",
  SEARCH_GROUNDING_STRUCTURED_OUTPUT_JSON_SCHEMA.required.includes("introText") &&
    SEARCH_GROUNDING_STRUCTURED_OUTPUT_JSON_SCHEMA.required.includes("vehicleAnalyses") &&
    SEARCH_GROUNDING_STRUCTURED_OUTPUT_JSON_SCHEMA.required.includes("closingText") &&
    SEARCH_GROUNDING_STRUCTURED_OUTPUT_JSON_SCHEMA.additionalProperties === false,
  true
);
assertFalsy(
  "schema does not reuse finalAnswerTh",
  JSON.stringify(SEARCH_GROUNDING_STRUCTURED_OUTPUT_JSON_SCHEMA).includes("finalAnswerTh")
);
assertFalsy(
  "schema does not keep replyText",
  JSON.stringify(SEARCH_GROUNDING_STRUCTURED_OUTPUT_JSON_SCHEMA).includes("replyText")
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
  assertFalsy(`${label}: no introText key`, serialized.includes("introText"));
  assertFalsy(`${label}: no vehicleAnalyses key`, serialized.includes("vehicleAnalyses"));
  assertFalsy(`${label}: no analysisText key`, serialized.includes("analysisText"));
  assertFalsy(`${label}: no closingText key`, serialized.includes("closingText"));
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
  const turn = await executeSearchWithProvider(failingSearchProvider(), []);
  assertEqual("diag provider-failure zero: success", turn.kind, "success");
  if (turn.kind === "success") {
    assertEqual("diag provider-failure zero: classification", turn.displayOrderClassification, "zero-result");
    assertEqual("diag provider-failure zero: reason", turn.searchCompositionFallbackReason, "provider-failure");
    assertEqual("diag provider-failure zero: no cards", turn.carCards.length, 0);
    assertEqual("diag provider-failure zero: not missing-success-text", turn.searchCompositionFallbackReason !== "missing-success-text", true);
    assertNotIncludes(
      "diag provider-failure zero: not unavailable",
      turn.userVisibleText,
      CHAT_V3_USER_FACING_UNAVAILABLE
    );
  }
}

{
  const turn = await executeSearchWithProvider(fakeSearchProvider('{"introText":'));
  assertEqual("diag invalid-json: success", turn.kind, "success");
  if (turn.kind === "success") {
    assertEqual("diag invalid-json: classification", turn.displayOrderClassification, "deterministic-fallback");
    assertEqual("diag invalid-json: reason", turn.searchCompositionFallbackReason, "structured-output-invalid-json");
    assertEqual("diag invalid-json: parse", turn.structuredOutputParseStatus, "invalid-json");
    assertEqual("diag invalid-json: presentation", turn.searchPresentationMode, "readable-fallback");
    assertEqual("diag invalid-json: text unchanged", turn.userVisibleText, expectedDeterministicFourText);
    assertEqual("diag invalid-json: cards canonical", turn.carCards.map((c) => c.id), ["id-a", "id-b", "id-c", "id-d"]);
    assertIncludes("diag invalid-json: readable notice", turn.userVisibleText, SEARCH_READABLE_FALLBACK_NOTICE);
    assertNotIncludes("diag invalid-json: no commentary", turn.userVisibleText, "มุมมองของเอ");
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
    introText: pathCProviderJson(),
    vehicleAnalyses: PATH_C_ANALYSES,
    closingText: PATH_C_CLOSING,
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
      pathCProviderJson({
        introText: "ในตลาดมีทั้งหมด 120 คันครับ",
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
      pathCProviderJson({
        introText: "พบรถที่ตรงตามเงื่อนไขที่ตรวจแล้ว 3 คันในรอบนี้ครับ",
      })
    )
  );
  assertEqual("diag composition-count: success", turn.kind, "success");
  if (turn.kind === "success") {
    assertEqual("diag composition-count: classification", turn.displayOrderClassification, "structured-accepted");
    assertEqual("diag composition-count: presentation", turn.searchPresentationMode, "vehicle-sections");
    assertEqual("diag composition-count: reason none", turn.searchCompositionFallbackReason, "none");
    assertEqual("diag composition-count: validation none", turn.searchCompositionValidationCode, "none");
    assertEqual("diag composition-count: disposition", turn.searchCountClaimDisposition, "intro-replaced");
    assertEqual("diag composition-count: not deterministic fallback", turn.usedDeterministicFallback, false);
    assertNotIncludes("diag composition-count: no server neutral intro", turn.userVisibleText, "เอคัดรถที่ตรงตามเงื่อนไขที่ตรวจแล้วมาให้ในรอบนี้ครับ");
    assertNotIncludes("diag composition-count: wrong count omitted", turn.userVisibleText, "3 คัน");
    assertNotIncludes("diag composition-count: wrong intro omitted", turn.userVisibleText, "พบรถที่ตรงตามเงื่อนไขที่ตรวจแล้ว 3 คันในรอบนี้ครับ");
    assertIncludes("diag composition-count: remaining V3 intro kept", turn.userVisibleText, "พบรถที่ตรงตามเงื่อนไขที่ตรวจแล้ว");
    assertNotIncludes("diag composition-count: no readable notice", turn.userVisibleText, SEARCH_READABLE_FALLBACK_NOTICE);
    assertEqual("diag composition-count: four views", (turn.userVisibleText.match(/มุมมองของเอ/g) ?? []).length, 4);
    assertEqual("diag composition-count: ordered cards", turn.carCards.map((c) => c.id), [...TOOL_RESULT_ORDER]);
    assertSeparatedVehicleSections("diag composition-count", turn.userVisibleText, FOUR_CARS, PATH_C_ORDER);
  }
}

{
  const turn = await executeSearchWithProvider(
    fakeSearchProvider(pathCProviderJson())
  );
  assertEqual("diag valid-structured: success", turn.kind, "success");
  if (turn.kind === "success") {
    assertEqual("diag valid-structured: classification", turn.displayOrderClassification, "structured-accepted");
    assertEqual("diag valid-structured: reason", turn.searchCompositionFallbackReason, "none");
    assertEqual("diag valid-structured: parse", turn.structuredOutputParseStatus, "structured");
    assertEqual("diag valid-structured: presentation", turn.searchPresentationMode, "vehicle-sections");
    assertEqual("diag valid-structured: count disposition none", turn.searchCountClaimDisposition, "none");
    assertIncludes("diag valid-structured: intro kept", turn.userVisibleText, PATH_C_INTRO);
    assertEqual("diag valid-structured: ordered cards", turn.carCards.map((c) => c.id), [...TOOL_RESULT_ORDER]);
    assertEqual("diag valid-structured: not deterministic", turn.usedDeterministicFallback, false);
    assertEqual("diag valid-structured: four views", (turn.userVisibleText.match(/มุมมองของเอ/g) ?? []).length, 4);
    assertSeparatedVehicleSections("diag valid-structured", turn.userVisibleText, FOUR_CARS, PATH_C_ORDER);
  }
}

{
  async function countClaimTurn(
    overrides: Partial<ChatV3SearchCompositionMetadata>
  ) {
    return executeSearchWithProvider(
      fakeSearchProvider(pathCProviderJson(overrides))
    );
  }

  function assertAcceptedFour(label: string, turn: Awaited<ReturnType<typeof executeSearchWithProvider>>) {
    assertEqual(`${label}: success`, turn.kind, "success");
    if (turn.kind !== "success") return;
    assertEqual(`${label}: classification`, turn.displayOrderClassification, "structured-accepted");
    assertEqual(`${label}: presentation`, turn.searchPresentationMode, "vehicle-sections");
    assertEqual(`${label}: fallback none`, turn.searchCompositionFallbackReason, "none");
    assertEqual(`${label}: validation none`, turn.searchCompositionValidationCode, "none");
    assertEqual(`${label}: not deterministic`, turn.usedDeterministicFallback, false);
    assertEqual(`${label}: cards`, turn.carCards.map((c) => c.id), [...TOOL_RESULT_ORDER]);
    assertEqual(`${label}: four views`, (turn.userVisibleText.match(/มุมมองของเอ/g) ?? []).length, 4);
    assertNotIncludes(`${label}: no readable notice`, turn.userVisibleText, SEARCH_READABLE_FALLBACK_NOTICE);
    assertSeparatedVehicleSections(label, turn.userVisibleText, FOUR_CARS, PATH_C_ORDER);
  }

  {
    const turn = await countClaimTurn({ introText: "เอคัดมาให้ 4 คัน" });
    assertAcceptedFour("count-accept explicit 4", turn);
    if (turn.kind === "success") {
      assertEqual("count-accept explicit 4: disposition", turn.searchCountClaimDisposition, "none");
      assertIncludes("count-accept explicit 4: intro kept", turn.userVisibleText, "เอคัดมาให้ 4 คัน");
    }
  }

  {
    const turn = await countClaimTurn({
      introText: "พบตัวเลือกที่ตรวจแล้ว 4 คัน",
    });
    assertAcceptedFour("count-accept found 4", turn);
    if (turn.kind === "success") {
      assertEqual("count-accept found 4: disposition", turn.searchCountClaimDisposition, "none");
    }
  }

  {
    const turn = await countClaimTurn({
      introText: "เจอรถเก๋งที่ตรวจแล้วในรอบนี้ครับ ไล่ดูทีละคันได้เลย",
    });
    assertAcceptedFour("count-accept no numeric total", turn);
    if (turn.kind === "success") {
      assertEqual("count-accept no numeric total: disposition", turn.searchCountClaimDisposition, "none");
    }
  }

  {
    const turn = await countClaimTurn({
      vehicleAnalyses: PATH_C_ANALYSES.map((item, index) => ({
        listingId: item.listingId,
        analysisText:
          index === 0 ? `${item.analysisText} รถคันแรกในชุดนี้` : item.analysisText,
      })),
    });
    assertAcceptedFour("count-accept คันแรก", turn);
    if (turn.kind === "success") {
      assertEqual("count-accept คันแรก: disposition", turn.searchCountClaimDisposition, "none");
      assertIncludes("count-accept คันแรก: local kept", turn.userVisibleText, "รถคันแรก");
    }
  }

  {
    const turn = await countClaimTurn({
      vehicleAnalyses: PATH_C_ANALYSES.map((item, index) => ({
        listingId: item.listingId,
        analysisText:
          index === 1 ? `${item.analysisText} รถคันที่ 1 ในชุดนี้` : item.analysisText,
      })),
    });
    assertAcceptedFour("count-accept คันที่ 1", turn);
    if (turn.kind === "success") {
      assertEqual("count-accept คันที่ 1: disposition", turn.searchCountClaimDisposition, "none");
      assertIncludes("count-accept คันที่ 1: local kept", turn.userVisibleText, "รถคันที่ 1");
    }
  }

  {
    const turn = await countClaimTurn({
      vehicleAnalyses: PATH_C_ANALYSES.map((item, index) => ({
        listingId: item.listingId,
        analysisText:
          index === 2
            ? `${item.analysisText} เหมาะเป็นรถ 1 คันสำหรับครอบครัว`
            : item.analysisText,
      })),
    });
    assertAcceptedFour("count-accept family 1 คัน", turn);
    if (turn.kind === "success") {
      assertEqual("count-accept family 1 คัน: disposition", turn.searchCountClaimDisposition, "none");
      assertIncludes("count-accept family 1 คัน: local kept", turn.userVisibleText, "เหมาะเป็นรถ 1 คันสำหรับครอบครัว");
    }
  }

  {
    const turn = await countClaimTurn({
      vehicleAnalyses: PATH_C_ANALYSES.map((item, index) => ({
        listingId: item.listingId,
        analysisText:
          index === 3 ? `${item.analysisText} มีรถอยู่แล้ว 1 คัน` : item.analysisText,
      })),
    });
    assertAcceptedFour("count-accept already own 1", turn);
    if (turn.kind === "success") {
      assertEqual("count-accept already own 1: disposition", turn.searchCountClaimDisposition, "none");
      assertIncludes("count-accept already own 1: local kept", turn.userVisibleText, "มีรถอยู่แล้ว 1 คัน");
    }
  }

  {
    const turn = await countClaimTurn({
      vehicleAnalyses: PATH_C_ANALYSES.map((item, index) => ({
        listingId: item.listingId,
        analysisText:
          index === 0
            ? `${item.analysisText} งบซ่อมประมาณ 5,000 บาท`
            : item.analysisText,
      })),
    });
    assertAcceptedFour("count-accept repair baht", turn);
    if (turn.kind === "success") {
      assertEqual("count-accept repair baht: disposition", turn.searchCountClaimDisposition, "none");
      assertIncludes("count-accept repair baht: kept", turn.userVisibleText, "5,000 บาท");
    }
  }

  {
    const turn = await countClaimTurn({
      vehicleAnalyses: PATH_C_ANALYSES.map((item, index) => ({
        listingId: item.listingId,
        analysisText:
          index === 1
            ? `${item.analysisText} ใช้ในเมืองวันละ 40 กม.`
            : item.analysisText,
      })),
    });
    assertAcceptedFour("count-accept daily km", turn);
    if (turn.kind === "success") {
      assertEqual("count-accept daily km: disposition", turn.searchCountClaimDisposition, "none");
      assertIncludes("count-accept daily km: kept", turn.userVisibleText, "40 กม.");
    }
  }

  {
    const turn = await countClaimTurn({
      introText:
        "พบรถที่ตรงตามเงื่อนไขที่ตรวจแล้ว 3 คันในรอบนี้ครับ ไล่ดูทีละคันจากข้อเท็จจริงที่ตรวจแล้วได้เลย",
    });
    assertEqual("count-strip intro keep rest: success", turn.kind, "success");
    if (turn.kind === "success") {
      assertEqual("count-strip intro keep rest: disposition", turn.searchCountClaimDisposition, "intro-replaced");
      assertEqual("count-strip intro keep rest: fallback none", turn.searchCompositionFallbackReason, "none");
      assertNotIncludes("count-strip intro keep rest: wrong count omitted", turn.userVisibleText, "3 คัน");
      assertIncludes(
        "count-strip intro keep rest: other sentence kept",
        turn.userVisibleText,
        "ไล่ดูทีละคันจากข้อเท็จจริงที่ตรวจแล้วได้เลย"
      );
      assertNotIncludes(
        "count-strip intro keep rest: no server neutral intro",
        turn.userVisibleText,
        "เอคัดรถที่ตรงตามเงื่อนไขที่ตรวจแล้วมาให้ในรอบนี้ครับ"
      );
      assertEqual("count-strip intro keep rest: four views", (turn.userVisibleText.match(/มุมมองของเอ/g) ?? []).length, 4);
      assertEqual("count-strip intro keep rest: cards", turn.carCards.map((c) => c.id), [...TOOL_RESULT_ORDER]);
    }
  }

  {
    const turn = await countClaimTurn({
      closingText: "ทั้งหมด 3 คัน จากรอบนี้ควรเทียบข้อเท็จจริงที่ตรวจแล้วครับ",
    });
    assertEqual("count-norm closing: success", turn.kind, "success");
    if (turn.kind === "success") {
      assertEqual("count-norm closing: classification", turn.displayOrderClassification, "structured-accepted");
      assertEqual("count-norm closing: presentation", turn.searchPresentationMode, "vehicle-sections");
      assertEqual("count-norm closing: disposition", turn.searchCountClaimDisposition, "closing-replaced");
      assertEqual("count-norm closing: fallback none", turn.searchCompositionFallbackReason, "none");
      assertEqual("count-norm closing: not deterministic", turn.usedDeterministicFallback, false);
      assertNotIncludes("count-norm closing: wrong closing omitted", turn.userVisibleText, "ทั้งหมด 3 คัน");
      assertIncludes(
        "count-norm closing: remaining closing kept",
        turn.userVisibleText,
        "จากรอบนี้ควรเทียบข้อเท็จจริงที่ตรวจแล้ว"
      );
      assertIncludes("count-norm closing: intro kept", turn.userVisibleText, PATH_C_INTRO);
      assertEqual("count-norm closing: four views", (turn.userVisibleText.match(/มุมมองของเอ/g) ?? []).length, 4);
      assertEqual("count-norm closing: cards", turn.carCards.map((c) => c.id), [...TOOL_RESULT_ORDER]);
      assertNotIncludes("count-norm closing: no readable notice", turn.userVisibleText, SEARCH_READABLE_FALLBACK_NOTICE);
      assertNotIncludes(
        "count-norm closing: no server neutral intro",
        turn.userVisibleText,
        "เอคัดรถที่ตรงตามเงื่อนไขที่ตรวจแล้วมาให้ในรอบนี้ครับ"
      );
      assertSeparatedVehicleSections("count-norm closing", turn.userVisibleText, FOUR_CARS, PATH_C_ORDER);
    }
  }

  {
    const turn = await countClaimTurn({
      vehicleAnalyses: PATH_C_ANALYSES.map((item, index) => ({
        listingId: item.listingId,
        analysisText:
          index === 0
            ? `ผลการค้นหามีทั้งหมด 3 คัน แต่คันนี้ปีใหม่กว่าในชุดนี้`
            : item.analysisText,
      })),
    });
    assertEqual("count-reject analysis: success", turn.kind, "success");
    if (turn.kind === "success") {
      assertEqual("count-reject analysis: classification", turn.displayOrderClassification, "structured-accepted");
      assertEqual("count-reject analysis: presentation", turn.searchPresentationMode, "vehicle-sections");
      assertEqual("count-reject analysis: disposition", turn.searchCountClaimDisposition, "vehicle-analysis-rejected");
      assertEqual("count-reject analysis: fallback none", turn.searchCompositionFallbackReason, "none");
      assertEqual("count-reject analysis: not deterministic", turn.usedDeterministicFallback, false);
      assertNotIncludes("count-reject analysis: false total omitted", turn.userVisibleText, "ผลการค้นหามีทั้งหมด 3 คัน");
      assertNotIncludes("count-reject analysis: wrong count omitted", turn.userVisibleText, "3 คัน");
      assertIncludes("count-reject analysis: remaining analysis kept", turn.userVisibleText, "แต่คันนี้ปีใหม่กว่าในชุดนี้");
      assertEqual("count-reject analysis: four views", (turn.userVisibleText.match(/มุมมองของเอ/g) ?? []).length, 4);
      assertIncludes("count-reject analysis: other view kept", turn.userVisibleText, PATH_C_ANALYSES[1].analysisText);
      assertEqual("count-reject analysis: cards", turn.carCards.map((c) => c.id), [...TOOL_RESULT_ORDER]);
      assertNotIncludes("count-reject analysis: no readable notice", turn.userVisibleText, SEARCH_READABLE_FALLBACK_NOTICE);
      assertSeparatedVehicleSections("count-reject analysis", turn.userVisibleText, FOUR_CARS, PATH_C_ORDER);
    }
  }
}

{
  async function adaptiveTurn(
    overrides: Partial<ChatV3SearchCompositionMetadata>,
    userMessage = ACCEPTANCE_QUERY
  ) {
    return executeChatV2V3SearchGroundingTurn({
      authenticatedActorRef: PILOT_UID,
      userMessage,
      inventory: FOUR_CARS,
      readEnv: readEnvFrom(enabledEnv),
      environment: "local",
      runChatV3Conversation: async () =>
        v3StructuredSuccess(pathCComposition(overrides)),
    });
  }

  {
    const turn = await adaptiveTurn({
      introText: "เจอ 4 คันครับ",
      vehicleAnalyses: [],
      closingText: "",
    });
    assertEqual("adaptive short: success", turn.kind, "success");
    if (turn.kind === "success") {
      assertEqual("adaptive short: accepted", turn.displayOrderClassification, "structured-accepted");
      assertEqual("adaptive short: cards", turn.carCards.map((c) => c.id), [...TOOL_RESULT_ORDER]);
      assertEqual("adaptive short: no views", (turn.userVisibleText.match(/มุมมองของเอ/g) ?? []).length, 0);
      assertIncludes("adaptive short: intro kept", turn.userVisibleText, "เจอ 4 คันครับ");
      assertNotIncludes("adaptive short: no readable notice", turn.userVisibleText, SEARCH_READABLE_FALLBACK_NOTICE);
      assertEqual("adaptive short: not deterministic", turn.usedDeterministicFallback, false);
      assertEqual("adaptive short: disposition none", turn.searchCountClaimDisposition, "none");
    }
  }

  {
    const turn = await adaptiveTurn({
      introText: "",
      vehicleAnalyses: [],
      closingText: "",
    });
    assertEqual("adaptive empty narrative: success", turn.kind, "success");
    if (turn.kind === "success") {
      assertEqual("adaptive empty narrative: accepted", turn.displayOrderClassification, "structured-accepted");
      assertEqual("adaptive empty narrative: cards", turn.carCards.map((c) => c.id), [...TOOL_RESULT_ORDER]);
      assertEqual("adaptive empty narrative: text empty", turn.userVisibleText.trim(), "");
      assertNotIncludes("adaptive empty narrative: no readable notice", turn.userVisibleText, SEARCH_READABLE_FALLBACK_NOTICE);
      assertNotIncludes("adaptive empty narrative: no zero-result cue", turn.userVisibleText, SEARCH_GROUNDING_NO_MATCH_TEXT);
      assertEqual("adaptive empty narrative: not deterministic", turn.usedDeterministicFallback, false);
    }
  }

  {
    const turn = await adaptiveTurn({
      introText: "ขอดูจากรายการได้เลยครับ",
      vehicleAnalyses: [],
      closingText: "",
    });
    assertEqual("adaptive view-only: success", turn.kind, "success");
    if (turn.kind === "success") {
      assertEqual("adaptive view-only: accepted", turn.displayOrderClassification, "structured-accepted");
      assertEqual("adaptive view-only: no essay sections", (turn.userVisibleText.match(/^\d+\. \*\*/m) ?? []).length, 0);
      assertEqual("adaptive view-only: cards", turn.carCards.length, 4);
      assertNotIncludes("adaptive view-only: no readable notice", turn.userVisibleText, SEARCH_READABLE_FALLBACK_NOTICE);
    }
  }

  {
    const turn = await adaptiveTurn({
      introText: "รอบนี้มีเพิ่มอีก 4 คันครับ",
      vehicleAnalyses: [],
      closingText: "",
    });
    assertEqual("adaptive load-more: success", turn.kind, "success");
    if (turn.kind === "success") {
      assertEqual("adaptive load-more: accepted", turn.displayOrderClassification, "structured-accepted");
      assertIncludes("adaptive load-more: short intro", turn.userVisibleText, "รอบนี้มีเพิ่มอีก 4 คันครับ");
      assertNotIncludes("adaptive load-more: no prior PATH_C_INTRO", turn.userVisibleText, PATH_C_INTRO);
      assertEqual("adaptive load-more: no views", (turn.userVisibleText.match(/มุมมองของเอ/g) ?? []).length, 0);
      assertEqual("adaptive load-more: cards", turn.carCards.map((c) => c.id), [...TOOL_RESULT_ORDER]);
    }
  }

  {
    const turn = await adaptiveTurn({
      introText: "สรุปเทียบสองคันที่ตรงเงื่อนไข",
      vehicleAnalyses: [
        {
          listingId: "id-a",
          analysisText: "คันนี้ไมล์ต่ำกว่ารุ่นเทียบในชุดนี้",
        },
        {
          listingId: "id-b",
          analysisText: "คันนี้ราคาต่ำกว่าเมื่อเทียบในชุดนี้",
        },
      ],
      closingText: "",
    });
    assertEqual("adaptive compare: success", turn.kind, "success");
    if (turn.kind === "success") {
      assertEqual("adaptive compare: accepted", turn.displayOrderClassification, "structured-accepted");
      assertEqual("adaptive compare: two views", (turn.userVisibleText.match(/มุมมองของเอ/g) ?? []).length, 2);
      assertEqual("adaptive compare: four cards", turn.carCards.length, 4);
      assertIncludes("adaptive compare: intro", turn.userVisibleText, "สรุปเทียบสองคันที่ตรงเงื่อนไข");
    }
  }

  {
    const turn = await adaptiveTurn({
      introText: "ถ้าเน้นใช้ในเมือง แนะนำดูคันไมล์ต่ำก่อนครับ",
      vehicleAnalyses: [
        {
          listingId: "id-a",
          analysisText: "เหมาะกับใช้ในเมืองจากไมล์และเกียร์ที่ตรวจแล้ว",
        },
      ],
      closingText: "อยากให้เทียบคันอื่นต่อไหมครับ",
    });
    assertEqual("adaptive city: success", turn.kind, "success");
    if (turn.kind === "success") {
      assertEqual("adaptive city: accepted", turn.displayOrderClassification, "structured-accepted");
      assertEqual("adaptive city: one view", (turn.userVisibleText.match(/มุมมองของเอ/g) ?? []).length, 1);
      assertIncludes("adaptive city: closing kept", turn.userVisibleText, "อยากให้เทียบคันอื่นต่อไหมครับ");
      assertEqual("adaptive city: cards", turn.carCards.length, 4);
    }
  }

  {
    const turn = await adaptiveTurn({
      introText: "",
      vehicleAnalyses: PATH_C_ANALYSES,
      closingText: "",
    });
    assertEqual("adaptive empty intro: success", turn.kind, "success");
    if (turn.kind === "success") {
      assertEqual("adaptive empty intro: accepted", turn.displayOrderClassification, "structured-accepted");
      assertEqual("adaptive empty intro: four views", (turn.userVisibleText.match(/มุมมองของเอ/g) ?? []).length, 4);
      assertEqual("adaptive empty intro: not deterministic", turn.usedDeterministicFallback, false);
    }
  }

  {
    const turn = await adaptiveTurn({
      introText: PATH_C_INTRO,
      vehicleAnalyses: PATH_C_ANALYSES,
      closingText: "",
    });
    assertEqual("adaptive empty closing: success", turn.kind, "success");
    if (turn.kind === "success") {
      assertEqual("adaptive empty closing: accepted", turn.displayOrderClassification, "structured-accepted");
      assertIncludes("adaptive empty closing: intro kept", turn.userVisibleText, PATH_C_INTRO);
      assertEqual("adaptive empty closing: not deterministic", turn.usedDeterministicFallback, false);
    }
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
          provider: fakeSearchProvider('{"introText":'),
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

{
  const altTurn = await executeChatV2V3SearchGroundingTurn({
    authenticatedActorRef: PILOT_UID,
    userMessage: ACCEPTANCE_QUERY,
    inventory: FOUR_CARS,
    readEnv: readEnvFrom(enabledEnv),
    environment: "local",
    runChatV3Conversation: async () =>
      v3StructuredSuccess(
        pathCComposition({
          introText: PATH_C_INTRO_ALT,
          closingText: PATH_C_CLOSING_ALT,
          vehicleAnalyses: PATH_C_ANALYSES.map((item, index) => ({
            listingId: item.listingId,
            analysisText: `${item.analysisText} ดูต่อได้จากข้อเท็จจริงที่ตรวจแล้ว`,
          })),
        })
      ),
  });
  assertEqual("wording: success", altTurn.kind, "success");
  if (altTurn.kind === "success") {
    assertEqual("wording: accepted", altTurn.displayOrderClassification, "structured-accepted");
    assertIncludes("wording: alt intro", altTurn.userVisibleText, PATH_C_INTRO_ALT);
    assertIncludes("wording: alt closing", altTurn.userVisibleText, PATH_C_CLOSING_ALT);
    assertNotIncludes("wording: renderer does not force first intro", altTurn.userVisibleText, PATH_C_INTRO);
  }
}

{
  const corolla = car({
    id: "id-corolla",
    brand: "Toyota",
    model: "Corolla",
    year: 2019,
    price: 420_000,
    mileage: 70_000,
    transmission: "auto",
  });
  const renameTurn = await executeChatV2V3SearchGroundingTurn({
    authenticatedActorRef: PILOT_UID,
    userMessage: ACCEPTANCE_QUERY,
    inventory: [corolla],
    readEnv: readEnvFrom(enabledEnv),
    environment: "local",
    runChatV3Conversation: async () =>
      v3StructuredSuccess({
        introText: "เจอรถเก๋งที่ตรวจแล้วในรอบนี้ 1 คันครับ",
        vehicleAnalyses: [
          {
            listingId: "id-corolla",
            analysisText: "คันนี้เป็น Corolla Altis ที่น่าสนใจและเกียร์ธรรมดา ราคา 999,000 บาท",
          },
        ],
        closingText: "แนะนำดูข้อเท็จจริงที่ตรวจแล้วก่อนตัดสินใจครับ",
      }),
  });
  assertEqual("rename: success fallback", renameTurn.kind, "success");
  if (renameTurn.kind === "success") {
    assertEqual("rename: not structured-accepted", renameTurn.displayOrderClassification, "deterministic-fallback");
    assertEqual("rename: presentation", renameTurn.searchPresentationMode, "readable-fallback");
    assertEqual("rename: validation", renameTurn.searchCompositionValidationCode, "identity-rename");
    assertIncludes("rename: trusted Corolla title", renameTurn.userVisibleText, "**2019 Toyota Corolla**");
    assertNotIncludes("rename: no Altis in trusted title", renameTurn.userVisibleText, "Corolla Altis");
    assertIncludes("rename: trusted price", renameTurn.userVisibleText, "420,000 บาท");
    assertNotIncludes("rename: no invented price", renameTurn.userVisibleText, "999,000");
    assertNotIncludes("rename: no commentary", renameTurn.userVisibleText, "มุมมองของเอ");
    assertEqual("rename: card model", renameTurn.carCards[0]?.model, "Corolla");
    assertEqual("rename: card price", renameTurn.carCards[0]?.price, 420_000);
  }
}

{
  const bmwIntro =
    "ในรอบนี้ยังไม่พบรถที่ตรงตามเงื่อนไขที่ระบุครับ งบ 500 บาทสำหรับ BMW น่าจะต่ำกว่าช่วงราคาที่เอค้นได้ ถ้าอยากให้ค้นต่อ ลองบอกราคาที่ปรับได้ไหมครับ";
  const bmwTurn = await executeChatV2V3SearchGroundingTurn({
    authenticatedActorRef: PILOT_UID,
    userMessage: "ช่วยหารถเก๋ง BMW เกียร์ออโต้ ราคาไม่เกิน 500 บาท",
    inventory: MIXED_INVENTORY,
    readEnv: readEnvFrom(enabledEnv),
    environment: "local",
    runChatV3Conversation: async () =>
      v3StructuredSuccess({
        introText: bmwIntro,
        vehicleAnalyses: [],
        closingText: "ถ้าอยากให้ค้นต่อ ลองบอกราคาที่ปรับได้ไหมครับ",
      }),
  });
  assertEqual("bmw-500: success", bmwTurn.kind, "success");
  if (bmwTurn.kind === "success") {
    assertEqual("bmw-500: zero-result", bmwTurn.displayOrderClassification, "zero-result");
    assertEqual("bmw-500: presentation", bmwTurn.searchPresentationMode, "zero-result");
    assertEqual("bmw-500: no cards", bmwTurn.carCards.length, 0);
    assertIncludes("bmw-500: conversational intro", bmwTurn.userVisibleText, bmwIntro);
    assertNotIncludes("bmw-500: no numbered section", bmwTurn.userVisibleText, "1. **");
    assertNotIncludes("bmw-500: no marketplace empty claim", bmwTurn.userVisibleText, "ทั้งหมด");
  }
}

{
  assertEqual(
    "r1 prepare: keeps svg word",
    prepareSearchNarrativeForMarkdown("คันนี้เหมาะกับใช้ในเมือง svg ครับ"),
    "คันนี้เหมาะกับใช้ในเมือง svg ครับ"
  );
  assertEqual(
    "r1 prepare: collapses breaks and keeps Thai",
    prepareSearchNarrativeForMarkdown("เหมาะกับใช้ในเมือง\n\tและเดินทางใกล้"),
    "เหมาะกับใช้ในเมือง และเดินทางใกล้"
  );
  assertNotIncludes(
    "r1 prepare: heading markers escaped",
    prepareSearchNarrativeForMarkdown("### หัวข้อ"),
    "### "
  );
}

{
  const markdownNoise = [
    "### หัวข้อ",
    "- รายการย่อย",
    "1. รายการเลข",
    "> อ้างอิง",
    "[ลิงก์](https://example.test)",
    "![รูป](https://example.test/car.png)",
    "```code```",
    "<div>html</div>",
  ].join("\n");
  const layoutTurn = await executeChatV2V3SearchGroundingTurn({
    authenticatedActorRef: PILOT_UID,
    userMessage: ACCEPTANCE_QUERY,
    inventory: FOUR_CARS,
    readEnv: readEnvFrom(enabledEnv),
    environment: "local",
    runChatV3Conversation: async () =>
      v3StructuredSuccess(
        pathCComposition({
          introText: `### หัวข้อแนะนำ\n${PATH_C_INTRO}`,
          closingText: `> ปิดท้าย\n${PATH_C_CLOSING}`,
          vehicleAnalyses: PATH_C_ANALYSES.map((item, index) => ({
            listingId: item.listingId,
            analysisText:
              index === 0
                ? `${item.analysisText} svg\n${markdownNoise}`
                : item.analysisText,
          })),
        })
      ),
  });
  assertEqual("r1 layout: success", layoutTurn.kind, "success");
  if (layoutTurn.kind === "success") {
    assertEqual("r1 layout: accepted", layoutTurn.displayOrderClassification, "structured-accepted");
    assertIncludes("r1 layout: natural intro survives", layoutTurn.userVisibleText, PATH_C_INTRO);
    assertIncludes("r1 layout: heading words survive", layoutTurn.userVisibleText, "หัวข้อแนะนำ");
    assertIncludes("r1 layout: analysis Thai survives", layoutTurn.userVisibleText, "เหมาะถ้าโฟกัสความใหม่");
    assertIncludes("r1 layout: svg word not stripped", layoutTurn.userVisibleText, "svg");
    assertSeparatedVehicleSections("r1 layout", layoutTurn.userVisibleText, FOUR_CARS, PATH_C_ORDER);
    assertNoCompetingMarkdownLayout("r1 layout", layoutTurn.userVisibleText);
    assertEqual("r1 layout: card order", layoutTurn.carCards.map((c) => c.id), [...TOOL_RESULT_ORDER]);
    assertNotIncludes("r1 layout: no vehicleAnalyses key", layoutTurn.userVisibleText, "vehicleAnalyses");
    assertNotIncludes("r1 layout: no raw json brace dump", layoutTurn.userVisibleText, '"listingId"');
    assertFalsy(
      "r1 layout: no raw listing ids",
      PATH_C_ORDER.some((id) => layoutTurn.userVisibleText.includes(id))
    );
  }
}

{
  const punctCar = car({
    id: "id-punct",
    brand: "Toyota*",
    model: "Altis*GT",
    year: 2018,
    price: 350_000,
    mileage: 80_000,
    transmission: "auto",
  });
  const punctTurn = await executeChatV2V3SearchGroundingTurn({
    authenticatedActorRef: PILOT_UID,
    userMessage: ACCEPTANCE_QUERY,
    inventory: [punctCar],
    readEnv: readEnvFrom(enabledEnv),
    environment: "local",
    runChatV3Conversation: async () =>
      v3StructuredSuccess({
        introText: "เจอรถเก๋งที่ตรวจแล้วในรอบนี้ 1 คันครับ",
        vehicleAnalyses: [
          {
            listingId: "id-punct",
            analysisText: "คันนี้เหมาะกับใช้ในเมืองจากข้อมูลที่ตรวจแล้ว",
          },
        ],
        closingText: "แนะนำดูข้อเท็จจริงที่ตรวจแล้วก่อนตัดสินใจครับ",
      }),
  });
  assertEqual("r1 title: success", punctTurn.kind, "success");
  if (punctTurn.kind === "success") {
    assertEqual("r1 title: accepted", punctTurn.displayOrderClassification, "structured-accepted");
    assertIncludes("r1 title: escaped heading", punctTurn.userVisibleText, "1. **2018 Toyota\\* Altis\\*GT**");
    assertIncludes("r1 title: brand recognizable", punctTurn.userVisibleText, "Toyota");
    assertIncludes("r1 title: model recognizable", punctTurn.userVisibleText, "Altis");
    assertNotIncludes("r1 title: unescaped star does not break bold", punctTurn.userVisibleText, "**2018 Toyota*");
    assertEqual("r1 title: card brand unchanged", punctTurn.carCards[0]?.brand, "Toyota*");
    assertEqual("r1 title: card model unchanged", punctTurn.carCards[0]?.model, "Altis*GT");
    assertEqual("r1 title: card price unchanged", punctTurn.carCards[0]?.price, 350_000);
  }
}

{
  const factCar = car({
    id: "id-fact",
    model: "Altis",
    year: 2018,
    price: 350_000,
    mileage: 80_000,
    transmission: "auto",
  });
  async function factTurn(analysisText: string) {
    return executeChatV2V3SearchGroundingTurn({
      authenticatedActorRef: PILOT_UID,
      userMessage: ACCEPTANCE_QUERY,
      inventory: [factCar],
      readEnv: readEnvFrom(enabledEnv),
      environment: "local",
      runChatV3Conversation: async () =>
        v3StructuredSuccess({
          introText: "เจอรถเก๋งที่ตรวจแล้วในรอบนี้ 1 คันครับ",
          vehicleAnalyses: [{ listingId: "id-fact", analysisText }],
          closingText: "แนะนำดูข้อเท็จจริงที่ตรวจแล้วก่อนตัดสินใจครับ",
        }),
    });
  }

  const ordinary = await factTurn("คันนี้เป็นตัวเลือกธรรมดา เหมาะกับใช้ในเมือง");
  assertEqual("r1 gear ordinary: success", ordinary.kind, "success");
  if (ordinary.kind === "success") {
    assertEqual("r1 gear ordinary: accepted", ordinary.displayOrderClassification, "structured-accepted");
    assertIncludes("r1 gear ordinary: wording kept", ordinary.userVisibleText, "ตัวเลือกธรรมดา");
  }

  const manualClaim = await factTurn("คันนี้เป็นเกียร์ธรรมดา เหมาะกับใช้ในเมือง");
  assertEqual("r1 gear conflict: success fallback", manualClaim.kind, "success");
  if (manualClaim.kind === "success") {
    assertEqual("r1 gear conflict: fallback", manualClaim.displayOrderClassification, "deterministic-fallback");
    assertEqual("r1 gear conflict: validation", manualClaim.searchCompositionValidationCode, "unsupported-listing-claim");
    assertNotIncludes("r1 gear conflict: no invented commentary", manualClaim.userVisibleText, "เกียร์ธรรมดา");
  }

  const budget = await factTurn("คันนี้ควรเผื่องบซ่อมและบำรุงไว้ประมาณ 15,000 บาท");
  assertEqual("r1 price budget: success", budget.kind, "success");
  if (budget.kind === "success") {
    assertEqual("r1 price budget: accepted", budget.displayOrderClassification, "structured-accepted");
    assertIncludes("r1 price budget: trusted price unchanged", budget.userVisibleText, "350,000 บาท");
    assertIncludes("r1 price budget: commentary kept", budget.userVisibleText, "15,000 บาท");
  }

  const salePrice = await factTurn("คันนี้ราคาขาย 999,000 บาท จากข้อมูลที่ดูแล้ว");
  assertEqual("r1 price conflict: success fallback", salePrice.kind, "success");
  if (salePrice.kind === "success") {
    assertEqual("r1 price conflict: fallback", salePrice.displayOrderClassification, "deterministic-fallback");
    assertEqual("r1 price conflict: validation", salePrice.searchCompositionValidationCode, "unsupported-listing-claim");
    assertIncludes("r1 price conflict: trusted price remains", salePrice.userVisibleText, "350,000 บาท");
    assertNotIncludes("r1 price conflict: invented sale price omitted", salePrice.userVisibleText, "999,000");
  }

  const dailyKm = await factTurn("ถ้าใช้ในเมืองวันละ 40 กม. ก็ถือว่าเหมาะกับการใช้งานทั่วไป");
  assertEqual("r1 mileage daily: success", dailyKm.kind, "success");
  if (dailyKm.kind === "success") {
    assertEqual("r1 mileage daily: accepted", dailyKm.displayOrderClassification, "structured-accepted");
    assertIncludes("r1 mileage daily: trusted mileage unchanged", dailyKm.userVisibleText, "80,000 กม.");
    assertIncludes("r1 mileage daily: commentary kept", dailyKm.userVisibleText, "40 กม.");
  }

  const odometer = await factTurn("คันนี้เลขไมล์ 12,345 กม. ซึ่งควรเช็กกับข้อเท็จจริงที่ตรวจแล้ว");
  assertEqual("r1 mileage conflict: success fallback", odometer.kind, "success");
  if (odometer.kind === "success") {
    assertEqual("r1 mileage conflict: fallback", odometer.displayOrderClassification, "deterministic-fallback");
    assertEqual("r1 mileage conflict: validation", odometer.searchCompositionValidationCode, "unsupported-listing-claim");
    assertIncludes("r1 mileage conflict: trusted mileage remains", odometer.userVisibleText, "80,000 กม.");
    assertNotIncludes("r1 mileage conflict: invented odometer omitted", odometer.userVisibleText, "12,345");
  }
}

{
  const composeSrc = readFileSync(
    "src/services/ai/chat/chatV2V3SearchGroundingCompose.ts",
    "utf8"
  );
  const serviceSrc = readFileSync(
    "src/services/ai/chat-v3/chatV3ConversationService.ts",
    "utf8"
  );
  assertNotIncludes("compose template has no literal svg", composeSrc, "svg");
  assertNotIncludes("conversation service has no literal svg", serviceSrc, "svg");
}

console.log(`\nWP-NVB-03B server tests passed: ${passCount}`);
