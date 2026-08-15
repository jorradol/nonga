/**
 * WP-V2U-03D2B — Conversation Core vehicle business tool adapter tests.
 * Fake dependencies only. No network, Firebase, Gemini, or production inventory.
 * Run: .\node_modules\.bin\tsx.cmd scripts/test-conversation-core-vehicle-tool-adapters.mts
 */
import type { MarketplaceCarRecord } from "../src/server/marketplaceInventory";
import type { InventoryRepository } from "../src/server/repositories/inventoryRepository";
import type { VehicleDiscoveryResult } from "../src/services/ai/chat/vehicleDiscoveryIndex";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type {
  ToolRequest,
  InventoryFetchToolData,
  MarketplaceSearchToolData,
  VehicleResolveSelectionToolData,
} from "../src/services/conversation-core/index";
import {
  ConversationCoreToolRegistryDuplicateError,
  CONVERSATION_CORE_TOOL_EXECUTOR_ERROR_CODES,
  createConversationCoreToolRegistry,
  createConversationCoreVehicleToolRegistry,
  createConversationCoreVehicleToolRegistrations,
  INVENTORY_FETCH_ADAPTER_ERROR_CODES,
  MARKETPLACE_SEARCH_ADAPTER_ERROR_CODES,
  VEHICLE_RESOLVE_SELECTION_ADAPTER_ERROR_CODES,
  executeConversationCoreTool,
  type ConversationTrustedListingContextProvider,
  type LegacyMarketplaceSearchFn,
  type ScoredMarketplaceSearchFn,
} from "../src/server/conversation-core/index";
import type { ChatInventoryCar } from "../src/services/ai/chat/marketplaceChatSearch";

let passCount = 0;

function pass(label: string): void {
  passCount += 1;
  console.log(`PASS: ${label}`);
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

function assertEqual<T>(label: string, actual: T, expected: T): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    console.error(
      `[${label}] expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
    process.exit(1);
  }
  pass(label);
}

function assertNotEqual<T>(label: string, actual: T, unexpected: T): void {
  if (JSON.stringify(actual) === JSON.stringify(unexpected)) {
    console.error(`FAIL [${label}] must not equal ${JSON.stringify(unexpected)}`);
    process.exit(1);
  }
  pass(label);
}

const CONVERSATION_A = "conv-vehicle-adapters-a";
const CONVERSATION_B = "conv-vehicle-adapters-b";

function baseRecord(overrides: Partial<MarketplaceCarRecord> = {}): MarketplaceCarRecord {
  return {
    id: "listing-pub-1",
    title: "Honda City 2020",
    brand: "Honda",
    model: "City",
    year: 2020,
    price: 450000,
    type: "used",
    condition: "good",
    mileage: 50000,
    fuelType: "gasoline",
    transmission: "auto",
    images: ["https://example.com/a.jpg"],
    description: "test",
    ownerId: "owner-1",
    ownerName: "Dealer A",
    ownerPhone: "0800000000",
    isSold: false,
    listingStatus: "published",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function createFakeInventoryRepository(input: {
  published?: MarketplaceCarRecord[];
  byId?: Record<string, MarketplaceCarRecord | null>;
  listPublishedThrows?: boolean;
  getByIdThrows?: boolean;
}): InventoryRepository {
  const published = input.published ?? [baseRecord()];
  const byId = input.byId ?? Object.fromEntries(published.map((r) => [r.id, r]));
  return {
    backend: "file",
    listings: {
      async listPublished() {
        if (input.listPublishedThrows) {
          throw new Error("listPublished failed");
        }
        return published;
      },
      async listAll() {
        return published;
      },
      async listByDealer() {
        return published;
      },
      async getById(id: string) {
        if (input.getByIdThrows) {
          throw new Error("getById failed");
        }
        return byId[id] ?? null;
      },
      async createListing(_dealerId, record) {
        return record;
      },
      async updateListing() {
        return null;
      },
      async updateVisibility() {
        return null;
      },
      async deleteListing() {
        return false;
      },
    },
    drafts: {
      async listByDealer() {
        return [];
      },
      async getById() {
        return null;
      },
      async createDraft(_dealerId, record) {
        return record;
      },
      async updateDraft() {
        return null;
      },
      async deleteDraft() {
        return false;
      },
    },
    async publishDraft() {
      return { error: "not-implemented" };
    },
  };
}

function fakeInventoryCar(id: string): ChatInventoryCar {
  return {
    id,
    title: "Honda City",
    brand: "Honda",
    model: "City",
    year: 2020,
    price: 450000,
    mileage: 50000,
    listingStatus: "published",
  };
}

function discoveryResult(
  ids: string[],
  options: { relaxed?: boolean } = {}
): VehicleDiscoveryResult {
  const candidates = ids.map((id) => ({
    car: fakeInventoryCar(id),
    listingId: id,
    score: 1,
    reasons: ["test"],
    isExactMatch: !options.relaxed,
  }));
  return {
    criteria: { isDiscovery: true },
    exactMatches: options.relaxed ? [] : candidates,
    nearAlternatives: options.relaxed ? candidates : [],
    blockingConstraints: [],
    summaryText: "",
    carCards: [],
    allCarCards: [],
    hasMoreCars: false,
    isRelaxed: Boolean(options.relaxed),
  };
}

function buildRegistry(input: {
  published?: MarketplaceCarRecord[];
  byId?: Record<string, MarketplaceCarRecord | null>;
  scoredSearch?: ScoredMarketplaceSearchFn;
  legacySearch?: LegacyMarketplaceSearchFn;
  trustedContextProvider?: ConversationTrustedListingContextProvider | null;
  loadPublishedInventory?: () => Promise<ChatInventoryCar[]>;
  listPublishedThrows?: boolean;
  getByIdThrows?: boolean;
}) {
  const inventoryRepository = createFakeInventoryRepository({
    published: input.published,
    byId: input.byId,
    listPublishedThrows: input.listPublishedThrows,
    getByIdThrows: input.getByIdThrows,
  });
  const registry = createConversationCoreVehicleToolRegistry({
    inventoryRepository,
    trustedContextProvider: input.trustedContextProvider ?? null,
    ...(input.scoredSearch ? { scoredMarketplaceSearch: input.scoredSearch } : {}),
    ...(input.legacySearch ? { legacyMarketplaceSearch: input.legacySearch } : {}),
    ...(input.loadPublishedInventory
      ? { loadPublishedInventory: input.loadPublishedInventory }
      : {}),
  });
  if (!registry) {
    throw new Error("expected registry");
  }
  return { registry, inventoryRepository };
}

async function runTool(
  registry: ReturnType<typeof buildRegistry>["registry"],
  request: ToolRequest,
  allowlist: ToolRequest["toolName"][] = [request.toolName]
) {
  return executeConversationCoreTool(
    {
      rawRequest: request,
      trustedBinding: {
        requestId: request.requestId,
        conversationId: request.conversationId,
        toolName: request.toolName,
      },
      trustedToolAllowlist: allowlist,
    },
    { registry }
  );
}

// ---------- Factory / registry ----------

assertFalsy(
  "factory: missing inventory repository returns null registrations",
  createConversationCoreVehicleToolRegistrations({
    inventoryRepository: null as unknown as InventoryRepository,
  })
);
assertFalsy(
  "factory: missing inventory repository returns null registry",
  createConversationCoreVehicleToolRegistry({
    inventoryRepository: null as unknown as InventoryRepository,
  })
);

const defaultRegistry = buildRegistry({});
assertTruthy(
  "factory: all three handlers registered",
  defaultRegistry.registry.isRegistered("marketplace.search") &&
    defaultRegistry.registry.isRegistered("inventory.fetch") &&
    defaultRegistry.registry.isRegistered("vehicle.resolveSelection")
);
assertEqual(
  "factory: registered tool names",
  [...defaultRegistry.registry.registeredToolNames].sort(),
  ["inventory.fetch", "marketplace.search", "vehicle.resolveSelection"]
);

const duplicateRegistrations = createConversationCoreVehicleToolRegistrations({
  inventoryRepository: createFakeInventoryRepository({ published: [baseRecord()] }),
});
assertTruthy("factory: duplicate registration setup", duplicateRegistrations);
let duplicateThrown = false;
try {
  createConversationCoreToolRegistry([
    ...(duplicateRegistrations ?? []),
    {
      toolName: "marketplace.search",
      handler: async () => ({ status: "error", errorCode: "dup" }),
    },
  ]);
} catch (error) {
  duplicateThrown = error instanceof ConversationCoreToolRegistryDuplicateError;
}
assertTruthy("factory: duplicate registration rejected", duplicateThrown);

// ---------- Marketplace search ----------

const scoredSearch: ScoredMarketplaceSearchFn = (message, _inventory) => {
  if (message.includes("legacy-only") || message.includes("legacy-many")) {
    return null;
  }
  if (message.includes("throw-infra")) {
    throw new Error("infra");
  }
  if (message.includes("malformed")) {
    return discoveryResult([""]);
  }
  if (message.includes("no-result")) {
    return discoveryResult([]);
  }
  if (message.includes("exact-ten")) {
    return discoveryResult([
      "ten-1",
      "ten-2",
      "ten-3",
      "ten-4",
      "ten-5",
      "ten-6",
      "ten-7",
      "ten-8",
      "ten-9",
      "ten-10",
    ]);
  }
  if (message.includes("fewer-than-ten")) {
    return discoveryResult(["few-1", "few-2", "few-3"]);
  }
  if (message.includes("duplicate")) {
    return discoveryResult([
      "listing-a",
      "listing-a",
      "listing-b",
      "listing-c",
      "listing-d",
      "listing-e",
      "listing-f",
      "listing-g",
      "listing-h",
      "listing-i",
      "listing-j",
      "listing-k",
    ]);
  }
  return discoveryResult([
    "listing-z",
    "listing-y",
    "listing-x",
    "listing-w",
    "listing-v",
    "listing-u",
    "listing-t",
    "listing-s",
    "listing-r",
    "listing-q",
    "listing-p",
  ]);
};

const legacySearch: LegacyMarketplaceSearchFn = (message, _cars) => {
  if (message.includes("legacy-only")) {
    return {
      criteria: {},
      primary: [
        {
          id: "legacy-1",
          title: "Legacy",
          brand: "Toyota",
          model: "Yaris",
          year: 2019,
          price: 300000,
          mileage: 40000,
          bodyClass: "sedan",
          bodyClassLabel: "เก๋ง",
          hasImage: true,
        },
      ],
      alternatives: [],
      introText: "legacy",
    };
  }
  if (message.includes("legacy-many")) {
    const primary = Array.from({ length: 12 }, (_, index) => ({
      id: `legacy-${index + 1}`,
      title: "Legacy",
      brand: "Toyota",
      model: "Yaris",
      year: 2019,
      price: 300000,
      mileage: 40000,
      bodyClass: "sedan" as const,
      bodyClassLabel: "เก๋ง",
      hasImage: true,
    }));
    return {
      criteria: {},
      primary,
      alternatives: [],
      introText: "legacy",
    };
  }
  return null;
};

const searchRegistry = buildRegistry({ scoredSearch, legacySearch });

const validSearchOutcome = await runTool(searchRegistry.registry, {
  toolName: "marketplace.search",
  requestId: "req-search-1",
  conversationId: CONVERSATION_A,
  input: { query: "รถเก๋งไม่เกิน 600000" },
});
assertEqual("marketplace: valid scored search completes", validSearchOutcome.kind, "completed");
if (validSearchOutcome.kind === "completed" && validSearchOutcome.result.status === "ok") {
  const data = validSearchOutcome.result.data as MarketplaceSearchToolData;
  assertEqual("marketplace: valid scored search status", validSearchOutcome.result.status, "ok");
  assertEqual(
    "marketplace: valid scored search provenance",
    validSearchOutcome.result.provenance,
    "marketplace-search"
  );
  assertEqual(
    "marketplace: valid scored search ids",
    data.listingIds,
    [
      "listing-z",
      "listing-y",
      "listing-x",
      "listing-w",
      "listing-v",
      "listing-u",
      "listing-t",
      "listing-s",
      "listing-r",
      "listing-q",
    ]
  );
}

const trimSearchOutcome = await runTool(searchRegistry.registry, {
  toolName: "marketplace.search",
  requestId: "req-search-trim",
  conversationId: CONVERSATION_A,
  input: { query: "  รถเก๋ง  " },
});
if (trimSearchOutcome.kind === "completed" && trimSearchOutcome.result.status === "ok") {
  const data = trimSearchOutcome.result.data as MarketplaceSearchToolData;
  assertEqual("marketplace: query trimming", data.query, "รถเก๋ง");
  pass("marketplace: query trimming");
}

const duplicateOutcome = await runTool(searchRegistry.registry, {
  toolName: "marketplace.search",
  requestId: "req-search-dup",
  conversationId: CONVERSATION_A,
  input: { query: "duplicate" },
});
if (duplicateOutcome.kind === "completed" && duplicateOutcome.result.status === "ok") {
  const data = duplicateOutcome.result.data as MarketplaceSearchToolData;
  assertEqual(
    "marketplace: duplicate ids removed without reordering",
    data.listingIds,
    [
      "listing-a",
      "listing-b",
      "listing-c",
      "listing-d",
      "listing-e",
      "listing-f",
      "listing-g",
      "listing-h",
      "listing-i",
      "listing-j",
    ]
  );
}

const noResultOutcome = await runTool(searchRegistry.registry, {
  toolName: "marketplace.search",
  requestId: "req-search-empty",
  conversationId: CONVERSATION_A,
  input: { query: "no-result" },
});
if (noResultOutcome.kind === "completed" && noResultOutcome.result.status === "ok") {
  const data = noResultOutcome.result.data as MarketplaceSearchToolData;
  assertEqual("marketplace: no result empty ids", data.listingIds, []);
}

const legacyOutcome = await runTool(searchRegistry.registry, {
  toolName: "marketplace.search",
  requestId: "req-search-legacy",
  conversationId: CONVERSATION_A,
  input: { query: "legacy-only" },
});
if (legacyOutcome.kind === "completed" && legacyOutcome.result.status === "ok") {
  const data = legacyOutcome.result.data as MarketplaceSearchToolData;
  assertEqual("marketplace: legacy fallback ids", data.listingIds, ["legacy-1"]);
}

const infraOutcome = await runTool(searchRegistry.registry, {
  toolName: "marketplace.search",
  requestId: "req-search-infra",
  conversationId: CONVERSATION_A,
  input: { query: "throw-infra" },
});
if (infraOutcome.kind === "completed") {
  assertEqual(
    "marketplace: infrastructure error not masked by fallback",
    infraOutcome.result.errorCode,
    MARKETPLACE_SEARCH_ADAPTER_ERROR_CODES.searchInfrastructureFailure
  );
}

const malformedOutcome = await runTool(searchRegistry.registry, {
  toolName: "marketplace.search",
  requestId: "req-search-malformed",
  conversationId: CONVERSATION_A,
  input: { query: "malformed" },
});
if (malformedOutcome.kind === "completed") {
  assertEqual(
    "marketplace: malformed business response",
    malformedOutcome.result.errorCode,
    MARKETPLACE_SEARCH_ADAPTER_ERROR_CODES.malformedSearchResult
  );
}

const inventoryFailRegistry = buildRegistry({
  scoredSearch,
  listPublishedThrows: true,
});
const inventoryFailOutcome = await runTool(inventoryFailRegistry.registry, {
  toolName: "marketplace.search",
  requestId: "req-search-inv-fail",
  conversationId: CONVERSATION_A,
  input: { query: "รถเก๋ง" },
});
if (inventoryFailOutcome.kind === "completed") {
  assertEqual(
    "marketplace: repository failure",
    inventoryFailOutcome.result.errorCode,
    MARKETPLACE_SEARCH_ADAPTER_ERROR_CODES.inventoryLoadFailed
  );
}

let injectedSearchCalled = false;
const injectedRegistry = buildRegistry({
  scoredSearch: () => {
    injectedSearchCalled = true;
    return discoveryResult(["injected-1"]);
  },
});
const injectedOutcome = await runTool(injectedRegistry.registry, {
  toolName: "marketplace.search",
  requestId: "req-search-injected",
  conversationId: CONVERSATION_A,
  input: { query: "injected" },
});
assertTruthy("marketplace: backend dependency injected", injectedSearchCalled);
if (injectedOutcome.kind === "completed" && injectedOutcome.result.status === "ok") {
  const data = injectedOutcome.result.data as MarketplaceSearchToolData;
  assertEqual(
    "marketplace: no gemini fabricated listing id",
    validSearchOutcome.kind === "completed" &&
      validSearchOutcome.result.status === "ok"
      ? (validSearchOutcome.result.data as MarketplaceSearchToolData).listingIds.includes(
          "gemini-fake-id"
        )
      : false,
    false
  );
  assertNotEqual(
    "marketplace: injected id used",
    data.listingIds,
    ["gemini-fake-id"]
  );
}

const publishedOnlyRegistry = buildRegistry({
  published: [
    baseRecord({ id: "visible-1", listingStatus: "published" }),
    baseRecord({ id: "hidden-1", listingStatus: "hidden" }),
    baseRecord({ id: "pending-1", listingStatus: "pending_review" }),
    baseRecord({ id: "sold-1", listingStatus: "published", saleStatus: "sold" }),
  ],
  scoredSearch: (_message, inventory) =>
    discoveryResult(inventory.map((car) => car.id)),
});
const publishedOnlyOutcome = await runTool(publishedOnlyRegistry.registry, {
  toolName: "marketplace.search",
  requestId: "req-search-visible",
  conversationId: CONVERSATION_A,
  input: { query: "filter" },
});
if (publishedOnlyOutcome.kind === "completed" && publishedOnlyOutcome.result.status === "ok") {
  const data = publishedOnlyOutcome.result.data as MarketplaceSearchToolData;
  assertEqual(
    "marketplace: published visible only",
    data.listingIds,
    ["visible-1"]
  );
}

const exactTenOutcome = await runTool(searchRegistry.registry, {
  toolName: "marketplace.search",
  requestId: "req-search-exact-ten",
  conversationId: CONVERSATION_A,
  input: { query: "exact-ten" },
});
if (exactTenOutcome.kind === "completed" && exactTenOutcome.result.status === "ok") {
  const data = exactTenOutcome.result.data as MarketplaceSearchToolData;
  assertEqual(
    "marketplace: exactly ten results preserved",
    data.listingIds,
    [
      "ten-1",
      "ten-2",
      "ten-3",
      "ten-4",
      "ten-5",
      "ten-6",
      "ten-7",
      "ten-8",
      "ten-9",
      "ten-10",
    ]
  );
}

const fewerThanTenOutcome = await runTool(searchRegistry.registry, {
  toolName: "marketplace.search",
  requestId: "req-search-fewer",
  conversationId: CONVERSATION_A,
  input: { query: "fewer-than-ten" },
});
if (fewerThanTenOutcome.kind === "completed" && fewerThanTenOutcome.result.status === "ok") {
  const data = fewerThanTenOutcome.result.data as MarketplaceSearchToolData;
  assertEqual(
    "marketplace: fewer than ten returns actual count",
    data.listingIds,
    ["few-1", "few-2", "few-3"]
  );
}

const legacyManyOutcome = await runTool(searchRegistry.registry, {
  toolName: "marketplace.search",
  requestId: "req-search-legacy-many",
  conversationId: CONVERSATION_A,
  input: { query: "legacy-many" },
});
if (legacyManyOutcome.kind === "completed" && legacyManyOutcome.result.status === "ok") {
  const data = legacyManyOutcome.result.data as MarketplaceSearchToolData;
  assertEqual(
    "marketplace: legacy fallback limited to ten",
    data.listingIds.length,
    10
  );
  assertEqual(
    "marketplace: legacy fallback preserves order",
    data.listingIds[0],
    "legacy-1"
  );
}

const relaxedRegistry = buildRegistry({
  scoredSearch: () =>
    discoveryResult(["relaxed-1", "relaxed-2", "relaxed-3"], { relaxed: true }),
});
const relaxedOutcome = await runTool(relaxedRegistry.registry, {
  toolName: "marketplace.search",
  requestId: "req-search-relaxed",
  conversationId: CONVERSATION_A,
  input: { query: "relaxed" },
});
if (relaxedOutcome.kind === "completed" && relaxedOutcome.result.status === "ok") {
  const data = relaxedOutcome.result.data as MarketplaceSearchToolData;
  assertEqual(
    "marketplace: near alternatives preserve scored order",
    data.listingIds,
    ["relaxed-1", "relaxed-2", "relaxed-3"]
  );
}

const emptyQueryOutcome = await runTool(searchRegistry.registry, {
  toolName: "marketplace.search",
  requestId: "req-search-empty-query",
  conversationId: CONVERSATION_A,
  input: { query: "   " },
});
if (emptyQueryOutcome.kind === "completed") {
  assertEqual(
    "marketplace: empty query fail closed",
    emptyQueryOutcome.result.errorCode,
    MARKETPLACE_SEARCH_ADAPTER_ERROR_CODES.emptyQuery
  );
}

const adapterSourcePath = fileURLToPath(
  new URL(
    "../src/server/conversation-core/adapters/marketplaceSearchToolAdapter.ts",
    import.meta.url
  )
);
const adapterSource = readFileSync(adapterSourcePath, "utf8");
for (const forbidden of [
  "vehicleResultsPagination",
  "takeInitialVehiclePage",
  "VEHICLE_RESULTS_PAGE_SIZE",
  "tryBuyerScoredMarketplaceReply",
]) {
  assertFalsy(`marketplace: adapter source avoids ${forbidden}`, adapterSource.includes(forbidden));
}
assertTruthy(
  "marketplace: adapter uses pure discovery path",
  adapterSource.includes("runVehicleDiscovery")
);
assertTruthy(
  "marketplace: adapter uses server-owned result bound",
  adapterSource.includes("MAX_MARKETPLACE_TOOL_RESULTS")
);

// ---------- Inventory fetch ----------

const inventoryRecords = [
  baseRecord({ id: "inv-1", listingStatus: "published" }),
  baseRecord({ id: "inv-2", listingStatus: "hidden" }),
  baseRecord({ id: "inv-3", listingStatus: "pending_review" }),
  baseRecord({ id: "inv-4", listingStatus: "published", saleStatus: "sold" }),
  baseRecord({ id: "inv-1", listingStatus: "published" }),
  baseRecord({ id: "inv-5", listingStatus: "published" }),
];
const inventoryRegistry = buildRegistry({ published: inventoryRecords });

const inventoryOutcome = await runTool(inventoryRegistry.registry, {
  toolName: "inventory.fetch",
  requestId: "req-inv-1",
  conversationId: CONVERSATION_A,
  input: {},
});
if (inventoryOutcome.kind === "completed" && inventoryOutcome.result.status === "ok") {
  const data = inventoryOutcome.result.data as InventoryFetchToolData;
  assertEqual(
    "inventory: published visible snapshot",
    data.listingIds,
    ["inv-1", "inv-5"]
  );
  assertFalsy(
    "inventory: no full listing payload",
    (inventoryOutcome.result.data as { ownerPhone?: string }).ownerPhone
  );
}

const refreshOutcome = await runTool(inventoryRegistry.registry, {
  toolName: "inventory.fetch",
  requestId: "req-inv-refresh",
  conversationId: CONVERSATION_A,
  input: { refresh: true },
});
if (refreshOutcome.kind === "completed" && refreshOutcome.result.status === "ok") {
  const data = refreshOutcome.result.data as InventoryFetchToolData;
  assertEqual(
    "inventory: refresh does not bypass rules",
    data.listingIds,
    ["inv-1", "inv-5"]
  );
}

const inventoryFail = buildRegistry({ listPublishedThrows: true });
const inventoryFailFetch = await runTool(inventoryFail.registry, {
  toolName: "inventory.fetch",
  requestId: "req-inv-fail",
  conversationId: CONVERSATION_A,
  input: {},
});
if (inventoryFailFetch.kind === "completed") {
  assertEqual(
    "inventory: repository failure",
    inventoryFailFetch.result.errorCode,
    INVENTORY_FETCH_ADAPTER_ERROR_CODES.inventoryLoadFailed
  );
}

const malformedInventory = buildRegistry({
  published: [baseRecord({ id: "   " })],
});
const malformedInventoryOutcome = await runTool(malformedInventory.registry, {
  toolName: "inventory.fetch",
  requestId: "req-inv-malformed",
  conversationId: CONVERSATION_A,
  input: {},
});
if (malformedInventoryOutcome.kind === "completed") {
  assertEqual(
    "inventory: malformed record",
    malformedInventoryOutcome.result.errorCode,
    INVENTORY_FETCH_ADAPTER_ERROR_CODES.malformedInventoryRecord
  );
}

// ---------- Vehicle resolve selection ----------

const trustedProvider: ConversationTrustedListingContextProvider = {
  getContext(conversationId) {
    if (conversationId === CONVERSATION_A) {
      return {
        conversationId: CONVERSATION_A,
        allowedListingIds: [
          "listing-pub-1",
          "listing-pub-2",
          "listing-withdrawn",
        ],
      };
    }
    if (conversationId === CONVERSATION_B) {
      return {
        conversationId: CONVERSATION_B,
        allowedListingIds: ["listing-other"],
      };
    }
    return null;
  },
};

const selectionRegistry = buildRegistry({
  published: [
    baseRecord({ id: "listing-pub-1", listingStatus: "published" }),
    baseRecord({ id: "listing-pub-2", listingStatus: "published" }),
    baseRecord({ id: "listing-hidden", listingStatus: "hidden" }),
  ],
  byId: {
    "listing-pub-1": baseRecord({ id: "listing-pub-1", listingStatus: "published" }),
    "listing-pub-2": baseRecord({ id: "listing-pub-2", listingStatus: "published" }),
    "listing-hidden": baseRecord({ id: "listing-hidden", listingStatus: "hidden" }),
    "listing-withdrawn": baseRecord({
      id: "listing-withdrawn",
      listingStatus: "published",
      saleStatus: "sold",
    }),
  },
  trustedContextProvider: trustedProvider,
});

const resolveOk = await runTool(selectionRegistry.registry, {
  toolName: "vehicle.resolveSelection",
  requestId: "req-resolve-ok",
  conversationId: CONVERSATION_A,
  input: { listingId: "listing-pub-1" },
});
if (resolveOk.kind === "completed" && resolveOk.result.status === "ok") {
  assertEqual("vehicle: explicit trusted resolve", resolveOk.result.data, {
    listingId: "listing-pub-1",
    resolved: true,
  });
  assertEqual(
    "vehicle: output contract provenance",
    resolveOk.result.provenance,
    "vehicle-selection"
  );
}

const missingProviderRegistry = buildRegistry({ trustedContextProvider: null });
const missingProvider = await runTool(missingProviderRegistry.registry, {
  toolName: "vehicle.resolveSelection",
  requestId: "req-resolve-no-provider",
  conversationId: CONVERSATION_A,
  input: { listingId: "listing-pub-1" },
});
if (missingProvider.kind === "completed") {
  assertEqual(
    "vehicle: missing trusted provider",
    missingProvider.result.errorCode,
    VEHICLE_RESOLVE_SELECTION_ADAPTER_ERROR_CODES.trustedContextUnavailable
  );
}

const missingContext = await runTool(selectionRegistry.registry, {
  toolName: "vehicle.resolveSelection",
  requestId: "req-resolve-no-context",
  conversationId: "conv-unknown",
  input: { listingId: "listing-pub-1" },
});
if (missingContext.kind === "completed") {
  assertEqual(
    "vehicle: missing conversation context",
    missingContext.result.errorCode,
    VEHICLE_RESOLVE_SELECTION_ADAPTER_ERROR_CODES.missingConversationContext
  );
}

const outsideTrusted = await runTool(selectionRegistry.registry, {
  toolName: "vehicle.resolveSelection",
  requestId: "req-resolve-outside",
  conversationId: CONVERSATION_A,
  input: { listingId: "listing-other" },
});
if (outsideTrusted.kind === "completed") {
  assertEqual(
    "vehicle: listing outside trusted allowed set",
    outsideTrusted.result.errorCode,
    VEHICLE_RESOLVE_SELECTION_ADAPTER_ERROR_CODES.listingNotInTrustedSet
  );
}

const crossRoom = await runTool(selectionRegistry.registry, {
  toolName: "vehicle.resolveSelection",
  requestId: "req-resolve-cross-room",
  conversationId: CONVERSATION_B,
  input: { listingId: "listing-pub-1" },
});
if (crossRoom.kind === "completed") {
  assertEqual(
    "vehicle: context from another conversation rejected",
    crossRoom.result.errorCode,
    VEHICLE_RESOLVE_SELECTION_ADAPTER_ERROR_CODES.listingNotInTrustedSet
  );
}

const withdrawn = await runTool(selectionRegistry.registry, {
  toolName: "vehicle.resolveSelection",
  requestId: "req-resolve-withdrawn",
  conversationId: CONVERSATION_A,
  input: { listingId: "listing-withdrawn" },
});
if (withdrawn.kind === "completed") {
  assertEqual(
    "vehicle: unavailable withdrawn listing rejected",
    withdrawn.result.errorCode,
    VEHICLE_RESOLVE_SELECTION_ADAPTER_ERROR_CODES.listingNotPublished
  );
}

const hiddenSelection = await runTool(
  buildRegistry({
    trustedContextProvider: {
      getContext: () => ({
        conversationId: CONVERSATION_A,
        allowedListingIds: ["listing-hidden"],
      }),
    },
    byId: {
      "listing-hidden": baseRecord({ id: "listing-hidden", listingStatus: "hidden" }),
    },
  }).registry,
  {
    toolName: "vehicle.resolveSelection",
    requestId: "req-resolve-hidden",
    conversationId: CONVERSATION_A,
    input: { listingId: "listing-hidden" },
  }
);
if (hiddenSelection.kind === "completed") {
  assertEqual(
    "vehicle: listing still published and visible check",
    hiddenSelection.result.errorCode,
    VEHICLE_RESOLVE_SELECTION_ADAPTER_ERROR_CODES.listingNotPublished
  );
}

const missingListing = await runTool(selectionRegistry.registry, {
  toolName: "vehicle.resolveSelection",
  requestId: "req-resolve-missing",
  conversationId: CONVERSATION_A,
  input: { listingId: "listing-missing" },
});
if (missingListing.kind === "completed") {
  assertEqual(
    "vehicle: missing listing rejected",
    missingListing.result.errorCode,
    VEHICLE_RESOLVE_SELECTION_ADAPTER_ERROR_CODES.listingNotInTrustedSet
  );
}

const lookupFail = await runTool(
  buildRegistry({
    trustedContextProvider: trustedProvider,
    getByIdThrows: true,
  }).registry,
  {
    toolName: "vehicle.resolveSelection",
    requestId: "req-resolve-lookup-fail",
    conversationId: CONVERSATION_A,
    input: { listingId: "listing-pub-1" },
  }
);
if (lookupFail.kind === "completed") {
  assertEqual(
    "vehicle: repository failure",
    lookupFail.result.errorCode,
    VEHICLE_RESOLVE_SELECTION_ADAPTER_ERROR_CODES.inventoryLookupFailed
  );
}

const malformedContext = await runTool(
  buildRegistry({
    trustedContextProvider: {
      getContext: () => ({
        conversationId: CONVERSATION_A,
        allowedListingIds: [""],
      }),
    },
  }).registry,
  {
    toolName: "vehicle.resolveSelection",
    requestId: "req-resolve-malformed-context",
    conversationId: CONVERSATION_A,
    input: { listingId: "listing-pub-1" },
  }
);
if (malformedContext.kind === "completed") {
  assertEqual(
    "vehicle: malformed context",
    malformedContext.result.errorCode,
    VEHICLE_RESOLVE_SELECTION_ADAPTER_ERROR_CODES.malformedTrustedContext
  );
}

const autoFirst = await runTool(
  buildRegistry({
    trustedContextProvider: {
      getContext: () => ({
        conversationId: CONVERSATION_A,
        allowedListingIds: ["listing-pub-1", "listing-pub-2"],
      }),
    },
  }).registry,
  {
    toolName: "vehicle.resolveSelection",
    requestId: "req-resolve-no-auto",
    conversationId: CONVERSATION_A,
    input: { listingId: "listing-pub-2" },
  }
);
if (autoFirst.kind === "completed" && autoFirst.result.status === "ok") {
  const data = autoFirst.result.data as VehicleResolveSelectionToolData;
  assertEqual(
    "vehicle: no automatic first-car fallback",
    data.listingId,
    "listing-pub-2"
  );
}

// ---------- Executor integration with factory ----------

const integrationRegistry = buildRegistry({
  scoredSearch: () => discoveryResult(["trusted-listing-1"]),
  trustedContextProvider: {
    getContext: (conversationId) =>
      conversationId === CONVERSATION_A
        ? { conversationId: CONVERSATION_A, allowedListingIds: ["trusted-listing-1"] }
        : null,
  },
  byId: {
    "trusted-listing-1": baseRecord({ id: "trusted-listing-1" }),
  },
});

const integrationSearch = await runTool(integrationRegistry.registry, {
  toolName: "marketplace.search",
  requestId: "req-integration-search",
  conversationId: CONVERSATION_A,
  input: { query: "integration" },
});
if (integrationSearch.kind === "completed" && integrationSearch.result.status === "ok") {
  assertEqual(
    "integration: adapter success provenance",
    integrationSearch.result.provenance,
    "marketplace-search"
  );
}

const integrationResolve = await runTool(integrationRegistry.registry, {
  toolName: "vehicle.resolveSelection",
  requestId: "req-integration-resolve",
  conversationId: CONVERSATION_A,
  input: { listingId: "trusted-listing-1" },
});
assertEqual("integration: trusted conversation binding resolve", integrationResolve.kind, "completed");

const integrationCrossRoom = await runTool(integrationRegistry.registry, {
  toolName: "vehicle.resolveSelection",
  requestId: "req-integration-cross",
  conversationId: CONVERSATION_B,
  input: { listingId: "trusted-listing-1" },
});
if (integrationCrossRoom.kind === "completed") {
  assertEqual(
    "integration: cross-room rejection",
    integrationCrossRoom.result.errorCode,
    VEHICLE_RESOLVE_SELECTION_ADAPTER_ERROR_CODES.missingConversationContext
  );
}

const timeoutOutcome = await executeConversationCoreTool(
  {
    rawRequest: {
      toolName: "marketplace.search",
      requestId: "req-timeout",
      conversationId: CONVERSATION_A,
      input: { query: "slow" },
    },
    trustedBinding: {
      requestId: "req-timeout",
      conversationId: CONVERSATION_A,
      toolName: "marketplace.search",
    },
    trustedToolAllowlist: ["marketplace.search"],
    timeoutMs: 1,
  },
  {
    registry: createConversationCoreToolRegistry([
      {
        toolName: "marketplace.search",
        handler: () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  status: "ok",
                  data: { listingIds: ["late"], query: "slow" },
                }),
              50
            );
          }),
      },
    ]),
    scheduleTimeout(callback) {
      callback();
      return { cancel() {} };
    },
  }
);
if (timeoutOutcome.kind === "completed") {
  assertEqual(
    "integration: timeout behavior preserved",
    timeoutOutcome.result.errorCode,
    CONVERSATION_CORE_TOOL_EXECUTOR_ERROR_CODES.handlerTimeout
  );
}

const notAllowlisted = await executeConversationCoreTool(
  {
    rawRequest: {
      toolName: "inventory.fetch",
      requestId: "req-allowlist",
      conversationId: CONVERSATION_A,
      input: {},
    },
    trustedBinding: {
      requestId: "req-allowlist",
      conversationId: CONVERSATION_A,
      toolName: "inventory.fetch",
    },
    trustedToolAllowlist: ["marketplace.search"],
  },
  { registry: integrationRegistry.registry }
);
if (notAllowlisted.kind === "completed") {
  assertEqual(
    "integration: tool allowlist still enforced",
    notAllowlisted.result.errorCode,
    CONVERSATION_CORE_TOOL_EXECUTOR_ERROR_CODES.toolNotAllowlisted
  );
}

console.log(`\nConversation Core vehicle tool adapter tests passed (${passCount} assertions).`);
