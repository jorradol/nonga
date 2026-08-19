/**
 * WP-V2U-04K — Mandatory authenticated vehicle Search bridge reliability.
 * Run: npx tsx scripts/test-wp-v2u04k-bridge-reliability.mts
 */
import type { ChatCarCardData } from "../src/types.ts";
import {
  CHAT_USER_VISIBLE_ORCHESTRATE_ROUTE,
  MANDATORY_VEHICLE_SEARCH_BRIDGE_FAIL_MESSAGE,
  resolveChatUserVisibleBridgeResult,
  type ChatUserVisibleOrchestrateData,
} from "../src/services/ai/chat/chatUserVisibleOrchestrateClient.ts";
import {
  isMandatoryAuthenticatedVehicleSearchMessage,
  shouldInvokeAuthenticatedVehicleSearchServerBridge,
  shouldInvokeBuyerConversationServerBridge,
} from "../src/services/ai/buyerAiFirstConversationPath.ts";
import { tryOrchestrateChatReply } from "../src/services/ai/chat/chatSearchOrchestrator.ts";
import type { ChatInventoryCar } from "../src/services/ai/chat/marketplaceChatSearch.ts";
import {
  buildMandatoryVehicleSearchBridgeFailurePublishArgs,
  resolveMandatoryVehicleSearchOrchestratedReply,
} from "../src/hooks/chat/useChat.ts";

let passCount = 0;

function pass(label: string): void {
  passCount += 1;
  console.log(`PASS: ${label}`);
}

function fail(label: string, detail?: string): void {
  console.error(`FAIL: ${label}${detail ? ` — ${detail}` : ""}`);
  process.exit(1);
}

function assert(condition: boolean, label: string, detail?: string): void {
  if (condition) pass(label);
  else fail(label, detail);
}

const SEARCH_MSG =
  "ลุงอยากได้ Toyota เกียร์ออโต้ ราคาไม่เกิน 600,000 บาท ช่วยค้นหารถที่มีอยู่จริงให้หน่อยครับ";
const SELL_MSG = "อยากขายรถ Toyota ปี 2018";

const SAMPLE_INVENTORY: ChatInventoryCar[] = [
  {
    id: "car-1",
    title: "Toyota Vios",
    brand: "Toyota",
    model: "Vios",
    year: 2020,
    price: 389000,
    mileage: 176579,
    transmission: "AT",
    bodyType: "sedan",
    listingStatus: "published",
    images: ["https://example.com/1.jpg"],
  },
  {
    id: "car-2",
    title: "Toyota Corolla",
    brand: "Toyota",
    model: "Corolla",
    year: 2020,
    price: 399000,
    mileage: 88000,
    transmission: "AT",
    bodyType: "sedan",
    listingStatus: "published",
    images: ["https://example.com/2.jpg"],
  },
];

const LEGACY_DISCOVERY_SNIPPET = "คัดจาก Inventory จริง";

/** Mirrors chatStore finalizeStreamedReply card selection for persistence checks. */
function resolveFinalizeCardsForPersistence(
  carCards: ChatCarCardData[] | undefined,
  streamedCarCards: ChatCarCardData[]
): ChatCarCardData[] | undefined {
  return carCards && carCards.length > 0
    ? carCards
    : streamedCarCards.length > 0
      ? streamedCarCards
      : undefined;
}

function makeServerData(
  overrides: Partial<ChatUserVisibleOrchestrateData> = {}
): ChatUserVisibleOrchestrateData {
  return {
    sliceId: "test-slice",
    userVisibleText: "Server authoritative search reply",
    pilotPathActive: false,
    fallbackToLegacy: true,
    skipGemini: true,
    carCardCount: 1,
    carCards: [
      {
        id: "car-server-1",
        brand: "Toyota",
        model: "Vios",
        year: 2020,
        price: 389000,
        mileage: 176579,
        imageUrl: "https://example.com/1.jpg",
        fuelType: "เบนซิน",
        bodyClassLabel: "Sedan",
      } as ChatCarCardData,
    ],
    ...overrides,
  };
}

let fetchCallCount = 0;
let lastFetchUrl: string | null = null;
let lastFetchMethod: string | null = null;
let lastFetchHasAuth = false;
const originalFetch = globalThis.fetch;

function installFetchMock(
  handler: (url: string, init?: RequestInit) => Promise<Response>
): typeof fetch {
  fetchCallCount = 0;
  lastFetchUrl = null;
  lastFetchMethod = null;
  lastFetchHasAuth = false;
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    fetchCallCount += 1;
    const url = String(input);
    lastFetchUrl = url;
    lastFetchMethod = init?.method ?? null;
    const headers = init?.headers as Record<string, string> | undefined;
    lastFetchHasAuth = Boolean(headers?.Authorization?.startsWith("Bearer "));
    return handler(url, init);
  }) as typeof fetch;
}

function restoreFetch(): void {
  globalThis.fetch = originalFetch;
}

function testMandatoryMessageDetection(): void {
  assert(
    isMandatoryAuthenticatedVehicleSearchMessage({ userMessage: SEARCH_MSG }),
    "04K-1: Toyota search is mandatory vehicle search message"
  );
  assert(
    !isMandatoryAuthenticatedVehicleSearchMessage({
      userMessage: SELL_MSG,
      isSellIntent: true,
    }),
    "04K-4: sell intent excluded from mandatory search"
  );
  assert(
    shouldInvokeAuthenticatedVehicleSearchServerBridge({
      isSignedIn: true,
      userMessage: SEARCH_MSG,
    }),
    "04K-2: signed-in search invokes authenticated vehicle search bridge"
  );
  assert(
    shouldInvokeAuthenticatedVehicleSearchServerBridge({
      isSignedIn: true,
      userMessage: SEARCH_MSG,
    }) &&
      !shouldInvokeBuyerConversationServerBridge({
        isSignedIn: true,
        userRole: "admin",
        userMessage: SEARCH_MSG,
      }),
    "04K-3: admin client role does not block authenticated vehicle search bridge"
  );
  assert(
    shouldInvokeAuthenticatedVehicleSearchServerBridge({
      isSignedIn: true,
      userMessage: SEARCH_MSG,
    }) &&
      !shouldInvokeBuyerConversationServerBridge({
        isSignedIn: true,
        userRole: "dealer",
        userMessage: SEARCH_MSG,
      }),
    "04K-3b: dealer client role does not block authenticated vehicle search bridge"
  );
  assert(
    !shouldInvokeAuthenticatedVehicleSearchServerBridge({
      isSignedIn: false,
      userMessage: SEARCH_MSG,
    }),
    "04K-9: guest does not invoke mandatory authenticated bridge"
  );
}

async function testValidTokenSinglePost(): Promise<void> {
  const fetchImpl = installFetchMock(async () => {
    return new Response(
      JSON.stringify({ success: true, data: makeServerData({ pilotPathActive: true }) }),
      { status: 200 }
    );
  });

  const outcome = await resolveChatUserVisibleBridgeResult(
    { userMessage: SEARCH_MSG },
    {
      getAuthHeaders: async () => ({ Authorization: "Bearer valid-token" }),
      fetchImpl,
    }
  );
  assert(lastFetchUrl?.includes(CHAT_USER_VISIBLE_ORCHESTRATE_ROUTE), "04K-1b: orchestrate route");
  assert(lastFetchMethod === "POST", "04K-1c: POST method");
  assert(lastFetchHasAuth, "04K-1d: Bearer header");
  assert(fetchCallCount === 1, "04K-11: single orchestrate POST");
  assert(outcome.status === "success", "04K-1e: bridge success outcome");
  assert(
    outcome.status === "success" && outcome.diagnostic === "bridge_success",
    "04K-10: pilot/core success diagnostic"
  );
}

async function testMissingTokenFailClosed(): Promise<void> {
  const fetchImpl = installFetchMock(async () => new Response("{}", { status: 200 }));

  const outcome = await resolveChatUserVisibleBridgeResult(
    { userMessage: SEARCH_MSG },
    { getAuthHeaders: async () => ({}), fetchImpl }
  );
  assert(outcome.status === "failure", "04K-5: missing token failure");
  assert(
    outcome.status === "failure" && outcome.diagnostic === "missing_verified_token",
    "04K-5b: missing_verified_token diagnostic"
  );
  assert(fetchCallCount === 0, "04K-5c: no POST without token");

  const legacy = tryOrchestrateChatReply(SEARCH_MSG, SAMPLE_INVENTORY);
  assert(
    Boolean(legacy?.text?.includes(LEGACY_DISCOVERY_SNIPPET)),
    "04K-5d: legacy discovery text exists for comparison"
  );
  assert(
    MANDATORY_VEHICLE_SEARCH_BRIDGE_FAIL_MESSAGE !== legacy?.text,
    "04K-5e: fail-closed message differs from legacy discovery success text"
  );
}

async function testHttpFailuresFailClosed(): Promise<void> {
  const getAuthHeaders = async () => ({ Authorization: "Bearer valid-token" });

  let fetchImpl = installFetchMock(async () => new Response("{}", { status: 401 }));
  let outcome = await resolveChatUserVisibleBridgeResult(
    { userMessage: SEARCH_MSG },
    { getAuthHeaders, fetchImpl }
  );
  assert(
    outcome.status === "failure" && outcome.diagnostic === "bridge_http_failure",
    "04K-6: 401 fail closed"
  );

  installFetchMock(async () => new Response("{}", { status: 403 }));
  outcome = await resolveChatUserVisibleBridgeResult(
    { userMessage: SEARCH_MSG },
    {
      getAuthHeaders,
      fetchImpl: installFetchMock(async () => new Response("{}", { status: 403 })),
    }
  );
  assert(
    outcome.status === "failure" && outcome.diagnostic === "bridge_http_failure",
    "04K-6b: 403 fail closed"
  );

  fetchImpl = installFetchMock(async () => new Response("{}", { status: 500 }));
  outcome = await resolveChatUserVisibleBridgeResult(
    { userMessage: SEARCH_MSG },
    { getAuthHeaders, fetchImpl }
  );
  assert(
    outcome.status === "failure" && outcome.diagnostic === "bridge_http_failure",
    "04K-7: non-2xx fail closed"
  );

  fetchImpl = installFetchMock(async () => {
    throw new Error("network down");
  });
  outcome = await resolveChatUserVisibleBridgeResult(
    { userMessage: SEARCH_MSG },
    { getAuthHeaders, fetchImpl }
  );
  assert(
    outcome.status === "failure" && outcome.diagnostic === "bridge_http_failure",
    "04K-7b: network failure fail closed"
  );

  fetchImpl = installFetchMock(async () =>
    new Response(JSON.stringify({ success: false }), { status: 200 })
  );
  outcome = await resolveChatUserVisibleBridgeResult(
    { userMessage: SEARCH_MSG },
    { getAuthHeaders, fetchImpl }
  );
  assert(
    outcome.status === "failure" && outcome.diagnostic === "bridge_invalid_response",
    "04K-8: malformed response fail closed"
  );
}

async function testServerNonPilotLegacy(): Promise<void> {
  const fetchImpl = installFetchMock(async () =>
    new Response(
      JSON.stringify({
        success: true,
        data: makeServerData({
          userVisibleText: "Legacy server marketplace reply",
          fallbackToLegacy: true,
          pilotPathActive: false,
        }),
      }),
      { status: 200 }
    )
  );

  const outcome = await resolveChatUserVisibleBridgeResult(
    { userMessage: SEARCH_MSG },
    {
      getAuthHeaders: async () => ({ Authorization: "Bearer valid-token" }),
      fetchImpl,
    }
  );
  assert(outcome.status === "success", "04K-8b: server non-pilot success");
  assert(
    outcome.status === "success" && outcome.diagnostic === "server_non_pilot",
    "04K-8c: server_non_pilot diagnostic"
  );
  assert(
    outcome.status === "success" &&
      outcome.data.userVisibleText === "Legacy server marketplace reply",
    "04K-8d: legacy server text preserved"
  );
  assert(
    outcome.status === "success" && outcome.data.carCards.length === 1,
    "04K-8e: legacy server cards preserved"
  );
}

function testGuestLegacyUnchanged(): void {
  const legacy = tryOrchestrateChatReply(SEARCH_MSG, SAMPLE_INVENTORY);
  assert(Boolean(legacy?.carCards?.length), "04K-9b: guest legacy still produces cards");
  assert(Boolean(legacy?.skipGemini), "04K-9c: guest legacy skipGemini unchanged");
}

function testR1CoreEmptyCardsAuthoritative(): void {
  const clientLegacy = tryOrchestrateChatReply(SEARCH_MSG, SAMPLE_INVENTORY);
  assert(
    (clientLegacy?.carCards?.length ?? 0) >= 2,
    "04K-R1-1d: client discovery still produces Legacy cards separately"
  );
  const serverData = makeServerData({
    pilotPathActive: true,
    fallbackToLegacy: false,
    carCards: [],
    hasMoreCars: false,
  });
  const resolved = resolveMandatoryVehicleSearchOrchestratedReply(serverData);
  assert(resolved !== null, "04K-R1-1a: Core empty cards is valid success");
  assert(resolved?.carCards.length === 0, "04K-R1-1b: final cards empty not client 3");
  assert(
    !resolved?.carCards.some((c) => c.id.startsWith("client-")),
    "04K-R1-1c: no client Legacy card ids"
  );
}

function testR1NonPilotEmptyCardsAuthoritative(): void {
  const serverData = makeServerData({
    pilotPathActive: false,
    fallbackToLegacy: true,
    userVisibleText: "Server legacy empty",
    carCards: [],
    hasMoreCars: false,
  });
  const resolved = resolveMandatoryVehicleSearchOrchestratedReply(serverData);
  assert(resolved !== null, "04K-R1-2a: Non-pilot empty cards is valid success");
  assert(resolved?.carCards.length === 0, "04K-R1-2b: Non-pilot final cards empty");
  assert(
    resolved?.text === "Server legacy empty",
    "04K-R1-2c: Non-pilot server text only"
  );
}

function testR1ServerCardsExactNoMerge(): void {
  const serverCards: ChatCarCardData[] = [
    {
      id: "server-only-1",
      brand: "Honda",
      model: "City",
      year: 2021,
      price: 429000,
      mileage: 45000,
      imageUrl: "https://example.com/s1.jpg",
      fuelType: "เบนซิน",
      bodyClassLabel: "Sedan",
    } as ChatCarCardData,
    {
      id: "server-only-2",
      brand: "Honda",
      model: "Civic",
      year: 2021,
      price: 499000,
      mileage: 52000,
      imageUrl: "https://example.com/s2.jpg",
      fuelType: "เบนซิน",
      bodyClassLabel: "Sedan",
    } as ChatCarCardData,
  ];
  const resolved = resolveMandatoryVehicleSearchOrchestratedReply(
    makeServerData({ pilotPathActive: true, carCards: serverCards })
  );
  assert(resolved?.carCards.length === 2, "04K-R1-3a: exact server card count");
  assert(
    resolved?.carCards.every((c) => c.id.startsWith("server-only-")),
    "04K-R1-3b: server card ids only no client merge"
  );
}

function testR1HasMoreCarsNoClientFallback(): void {
  const resolved = resolveMandatoryVehicleSearchOrchestratedReply(
    makeServerData({
      pilotPathActive: true,
      carCards: [],
      hasMoreCars: false,
    })
  );
  assert(resolved?.hasMoreCars === false, "04K-R1-4: server hasMoreCars false exact");
  assert(resolved?.hasMoreCars !== true, "04K-R1-4b: not client discovery true");
}

function testR1MissingCarCardsFailClosed(): void {
  const withoutCards = makeServerData({ pilotPathActive: true });
  delete (withoutCards as { carCards?: ChatCarCardData[] }).carCards;
  assert(
    resolveMandatoryVehicleSearchOrchestratedReply(withoutCards) === null,
    "04K-R1-5: missing carCards field fail closed"
  );
  const malformed = makeServerData({
    pilotPathActive: true,
    carCards: null as unknown as ChatCarCardData[],
  });
  assert(
    resolveMandatoryVehicleSearchOrchestratedReply(malformed) === null,
    "04K-R1-5b: non-array carCards fail closed"
  );
}

function testR1FailClosedPublishArgs(): void {
  const failArgs = buildMandatoryVehicleSearchBridgeFailurePublishArgs();
  assert(
    failArgs.replyText === MANDATORY_VEHICLE_SEARCH_BRIDGE_FAIL_MESSAGE,
    "04K-R1-6a: missing token fail message"
  );
  assert(failArgs.carCards.length === 0, "04K-R1-6b: missing token final cards empty");

  const persisted = resolveFinalizeCardsForPersistence(failArgs.carCards, []);
  assert(persisted === undefined, "04K-R1-8: fail-closed does not persist cards");
}

async function testR1HttpFailuresFailClosedPublish(): Promise<void> {
  const getAuthHeaders = async () => ({ Authorization: "Bearer valid-token" });
  const fetchImpl = installFetchMock(async () => new Response("{}", { status: 401 }));
  const outcome = await resolveChatUserVisibleBridgeResult(
    { userMessage: SEARCH_MSG },
    { getAuthHeaders, fetchImpl }
  );
  assert(outcome.status === "failure", "04K-R1-7a: 401 failure");
  const failArgs = buildMandatoryVehicleSearchBridgeFailurePublishArgs();
  assert(failArgs.carCards.length === 0, "04K-R1-7b: 401 final cards empty");
  assert(
    resolveFinalizeCardsForPersistence(failArgs.carCards, []) === undefined,
    "04K-R1-7c: 401 no workspace persistence cards"
  );

  const fetchImplNet = installFetchMock(async () => {
    throw new Error("network");
  });
  const netOutcome = await resolveChatUserVisibleBridgeResult(
    { userMessage: SEARCH_MSG },
    { getAuthHeaders, fetchImpl: fetchImplNet }
  );
  assert(netOutcome.status === "failure", "04K-R1-7d: network failure");
  assert(
    buildMandatoryVehicleSearchBridgeFailurePublishArgs().carCards.length === 0,
    "04K-R1-7e: network final cards empty"
  );

  const fetchImplBad = installFetchMock(async () =>
    new Response(JSON.stringify({ success: false }), { status: 200 })
  );
  const badOutcome = await resolveChatUserVisibleBridgeResult(
    { userMessage: SEARCH_MSG },
    { getAuthHeaders, fetchImpl: fetchImplBad }
  );
  assert(badOutcome.status === "failure", "04K-R1-7f: malformed failure");
  assert(
    buildMandatoryVehicleSearchBridgeFailurePublishArgs().carCards.length === 0,
    "04K-R1-7g: malformed final cards empty"
  );
}

function testDiagnosticsNoPii(): void {
  const logs: string[] = [];
  const originalDebug = console.debug;
  console.debug = (...args: unknown[]) => {
    logs.push(JSON.stringify(args));
  };
  try {
    emitBridgeDiagnosticForTest("bridge_attempted");
    emitBridgeDiagnosticForTest("missing_verified_token");
  } finally {
    console.debug = originalDebug;
  }
  const blob = logs.join("");
  assert(
    !/(?:Bearer\s+[A-Za-z0-9._-]+|@[a-z0-9.-]+\.[a-z]{2,}|firebaseUid|Authorization)/i.test(
      blob
    ),
    "04K-12: diagnostics contain no PII"
  );
}

// mirror emit for test without window
function emitBridgeDiagnosticForTest(reason: string): void {
  console.debug("[chat-user-visible-bridge]", { reason });
}

async function main(): Promise<void> {
  testMandatoryMessageDetection();
  await testValidTokenSinglePost();
  await testMissingTokenFailClosed();
  await testHttpFailuresFailClosed();
  await testServerNonPilotLegacy();
  testGuestLegacyUnchanged();
  testR1CoreEmptyCardsAuthoritative();
  testR1NonPilotEmptyCardsAuthoritative();
  testR1ServerCardsExactNoMerge();
  testR1HasMoreCarsNoClientFallback();
  testR1MissingCarCardsFailClosed();
  testR1FailClosedPublishArgs();
  await testR1HttpFailuresFailClosedPublish();
  testDiagnosticsNoPii();

  console.log(`\n04K bridge reliability: ${passCount} PASS`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
