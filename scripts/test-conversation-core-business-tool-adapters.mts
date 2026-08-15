/**
 * WP-V2U-03D4B — Conversation Core business tool registry composition tests.
 * Fake dependencies only. No network, Firebase, Gemini, routes, or production inventory.
 * Run: .\node_modules\.bin\tsx.cmd scripts/test-conversation-core-business-tool-adapters.mts
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { MarketplaceCarRecord } from "../src/server/marketplaceInventory";
import type { InventoryRepository } from "../src/server/repositories/inventoryRepository";
import { calculateFlatRateFinance } from "../src/utils/financeCalculator";
import type { VehicleDiscoveryResult } from "../src/services/ai/chat/vehicleDiscoveryIndex";
import type {
  FinanceCalculateToolData,
  InventoryFetchToolData,
  MarketplaceSearchToolData,
  ToolRequest,
  VehicleResolveSelectionToolData,
} from "../src/services/conversation-core/index";
import {
  ConversationCoreToolRegistryDuplicateError,
  CONVERSATION_CORE_TOOL_EXECUTOR_ERROR_CODES,
  createConversationCoreBusinessToolRegistrations,
  createConversationCoreBusinessToolRegistry,
  createConversationCoreToolRegistry,
  FINANCE_CALCULATE_ADAPTER_ERROR_CODES,
  INVENTORY_FETCH_ADAPTER_ERROR_CODES,
  MARKETPLACE_SEARCH_ADAPTER_ERROR_CODES,
  VEHICLE_RESOLVE_SELECTION_ADAPTER_ERROR_CODES,
  executeConversationCoreTool,
  type ConversationCoreBusinessToolAdapterDependencies,
  type ConversationTrustedListingContextProvider,
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

const CONVERSATION_A = "conv-business-adapters-a";
const CONVERSATION_B = "conv-business-adapters-b";
const LISTING_ID = "listing-business-500k";
const FINANCE_REQUEST_ID = "biz-fin-req-1";

function baseRecord(overrides: Partial<MarketplaceCarRecord> = {}): MarketplaceCarRecord {
  return {
    id: LISTING_ID,
    title: "Toyota Camry 2019",
    brand: "Toyota",
    model: "Camry",
    year: 2019,
    price: 500_000,
    type: "used",
    condition: "good",
    mileage: 80000,
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
    title: "Toyota Camry",
    brand: "Toyota",
    model: "Camry",
    year: 2019,
    price: 500_000,
    mileage: 80000,
    listingStatus: "published",
  };
}

function discoveryResult(ids: string[]): VehicleDiscoveryResult {
  const candidates = ids.map((id) => ({
    car: fakeInventoryCar(id),
    listingId: id,
    score: 1,
    reasons: ["test"],
    isExactMatch: true,
  }));
  return {
    criteria: { isDiscovery: true },
    exactMatches: candidates,
    nearAlternatives: [],
    blockingConstraints: [],
    summaryText: "",
    carCards: [],
    allCarCards: [],
    hasMoreCars: false,
    isRelaxed: false,
  };
}

function trustedProviderForAOnly(
  listingIds: string[]
): ConversationTrustedListingContextProvider {
  return {
    async getContext(conversationId: string) {
      if (conversationId !== CONVERSATION_A) {
        return null;
      }
      return { conversationId: CONVERSATION_A, allowedListingIds: listingIds };
    },
  };
}

function sharedTrustedProvider(): ConversationTrustedListingContextProvider {
  return trustedProviderForAOnly([LISTING_ID]);
}

function buildBusinessDeps(input: {
  published?: MarketplaceCarRecord[];
  byId?: Record<string, MarketplaceCarRecord | null>;
  scoredSearch?: ScoredMarketplaceSearchFn;
  trusted?: ConversationTrustedListingContextProvider | null;
  vehicleInventory?: InventoryRepository | null;
  financeInventory?: InventoryRepository | null;
}): ConversationCoreBusinessToolAdapterDependencies {
  const inventoryRepository =
    input.vehicleInventory ??
    input.financeInventory ??
    createFakeInventoryRepository({
      published: input.published,
      byId: input.byId,
    });
  const trusted = input.trusted !== undefined ? input.trusted : sharedTrustedProvider();
  const vehicleDeps = {
    inventoryRepository: input.vehicleInventory ?? inventoryRepository,
    trustedContextProvider: trusted,
    ...(input.scoredSearch ? { scoredMarketplaceSearch: input.scoredSearch } : {}),
  };
  const financeDeps = {
    inventoryRepository: input.financeInventory ?? inventoryRepository,
    trustedContextProvider: trusted,
  };
  return {
    vehicle: input.vehicleInventory === null ? null : vehicleDeps,
    finance: input.financeInventory === null ? null : financeDeps,
  };
}

async function runTool(
  registry: NonNullable<ReturnType<typeof createConversationCoreBusinessToolRegistry>>,
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

function financeRequest(
  overrides: {
    conversationId?: string;
    requestId?: string;
    listingId?: string;
    annualInterestRatePercent?: number;
    termMonths?: number;
    downPaymentPercent?: number;
  } = {}
): ToolRequest {
  return {
    toolName: "finance.calculate",
    requestId: overrides.requestId ?? FINANCE_REQUEST_ID,
    conversationId: overrides.conversationId ?? CONVERSATION_A,
    input: {
      listingId: overrides.listingId ?? LISTING_ID,
      annualInterestRatePercent: overrides.annualInterestRatePercent ?? 5,
      termMonths: overrides.termMonths ?? 60,
      downPaymentPercent: overrides.downPaymentPercent ?? 20,
    },
  };
}

const scoredSearch: ScoredMarketplaceSearchFn = (message) => {
  if (message.includes("no-result")) {
    return discoveryResult([]);
  }
  return discoveryResult(["listing-z", "listing-y", "listing-x"]);
};

// ---------- 10.1 Exact registration ----------

const fullDeps = buildBusinessDeps({ scoredSearch });
const fullRegistry = createConversationCoreBusinessToolRegistry(fullDeps);
assertTruthy("exact: registry created", fullRegistry);
assertEqual(
  "exact: four registered tool names",
  [...fullRegistry!.registeredToolNames].sort(),
  ["finance.calculate", "inventory.fetch", "marketplace.search", "vehicle.resolveSelection"]
);
assertEqual(
  "exact: canonical tool names unchanged",
  [...fullRegistry!.canonicalToolNames].sort(),
  ["finance.calculate", "inventory.fetch", "marketplace.search", "vehicle.resolveSelection"]
);
assertFalsy(
  "exact: no extra registered tools",
  fullRegistry!.registeredToolNames.some(
    (name) =>
      name !== "finance.calculate" &&
      name !== "inventory.fetch" &&
      name !== "marketplace.search" &&
      name !== "vehicle.resolveSelection"
  )
);
assertTruthy("exact: registry object is frozen", Object.isFrozen(fullRegistry));
assertTruthy(
  "exact: registered tool names array is frozen",
  Object.isFrozen(fullRegistry!.registeredToolNames)
);

// ---------- 10.2 Partial composition ----------

const vehicleOnlyRegistry = createConversationCoreBusinessToolRegistry({
  vehicle: buildBusinessDeps({ scoredSearch }).vehicle,
  finance: null,
});
assertTruthy("partial: vehicle-only registry created", vehicleOnlyRegistry);
assertEqual(
  "partial: vehicle-only tool names",
  [...vehicleOnlyRegistry!.registeredToolNames].sort(),
  ["inventory.fetch", "marketplace.search", "vehicle.resolveSelection"]
);
assertFalsy(
  "partial: finance tool absent when finance module omitted",
  vehicleOnlyRegistry!.isRegistered("finance.calculate")
);

const financeOnlyRegistry = createConversationCoreBusinessToolRegistry({
  vehicle: null,
  finance: buildBusinessDeps({}).finance,
});
assertTruthy("partial: finance-only registry created", financeOnlyRegistry);
assertEqual(
  "partial: finance-only tool names",
  [...financeOnlyRegistry!.registeredToolNames],
  ["finance.calculate"]
);

assertFalsy(
  "partial: both modules missing returns null registry",
  createConversationCoreBusinessToolRegistry({ vehicle: null, finance: null })
);
assertFalsy(
  "partial: invalid inventory on both sides returns null registry",
  createConversationCoreBusinessToolRegistry({
    vehicle: { inventoryRepository: null as unknown as InventoryRepository },
    finance: { inventoryRepository: null as unknown as InventoryRepository },
  })
);

const vehicleOnlyMissingFinanceHandler = await runTool(vehicleOnlyRegistry!, {
  toolName: "finance.calculate",
  requestId: "req-missing-finance",
  conversationId: CONVERSATION_A,
  input: {
    listingId: LISTING_ID,
    annualInterestRatePercent: 5,
    termMonths: 60,
    downPaymentPercent: 20,
  },
});
assertEqual(
  "partial: missing finance handler executor completed",
  vehicleOnlyMissingFinanceHandler.kind,
  "completed"
);
if (vehicleOnlyMissingFinanceHandler.kind === "completed") {
  assertEqual(
    "partial: missing finance handler unavailable",
    vehicleOnlyMissingFinanceHandler.result.errorCode,
    CONVERSATION_CORE_TOOL_EXECUTOR_ERROR_CODES.handlerUnavailable
  );
}

// ---------- 10.3 Duplicate protection ----------

const businessRegistrations = createConversationCoreBusinessToolRegistrations(fullDeps);
assertTruthy("duplicate: business registrations created", businessRegistrations);
let duplicateThrown = false;
try {
  createConversationCoreToolRegistry([
    ...(businessRegistrations ?? []),
    {
      toolName: "finance.calculate",
      handler: async () => ({ status: "error", errorCode: "dup" }),
    },
  ]);
} catch (error) {
  duplicateThrown = error instanceof ConversationCoreToolRegistryDuplicateError;
}
assertTruthy("duplicate: composite path throws on duplicate tool name", duplicateThrown);

let nonAllowlistedThrown = false;
try {
  createConversationCoreToolRegistry([
    {
      toolName: "posting.create" as "finance.calculate",
      handler: async () => ({ status: "ok", data: {} }),
    },
  ]);
} catch {
  nonAllowlistedThrown = true;
}
assertTruthy("duplicate: non-allowlisted registration rejected", nonAllowlistedThrown);

// ---------- 10.4 Vehicle execution through composite registry ----------

const vehicleRegistry = createConversationCoreBusinessToolRegistry(
  buildBusinessDeps({
    scoredSearch,
    trusted: sharedTrustedProvider(),
  })
);
assertTruthy("vehicle: composite registry ready", vehicleRegistry);

const searchOutcome = await runTool(vehicleRegistry!, {
  toolName: "marketplace.search",
  requestId: "req-search",
  conversationId: CONVERSATION_A,
  input: { query: "toyota" },
});
if (searchOutcome.kind === "completed" && searchOutcome.result.status === "ok") {
  const data = searchOutcome.result.data as MarketplaceSearchToolData;
  assertTruthy("vehicle: marketplace search returns listing ids", data.listingIds.length > 0);
  assertEqual("vehicle: marketplace provenance", searchOutcome.result.provenance, "marketplace-search");
}

const fetchOutcome = await runTool(vehicleRegistry!, {
  toolName: "inventory.fetch",
  requestId: "req-fetch",
  conversationId: CONVERSATION_A,
  input: { refresh: false },
});
if (fetchOutcome.kind === "completed" && fetchOutcome.result.status === "ok") {
  const data = fetchOutcome.result.data as InventoryFetchToolData;
  assertTruthy("vehicle: inventory fetch returns listing ids", data.listingIds.length > 0);
  assertEqual("vehicle: inventory provenance", fetchOutcome.result.provenance, "inventory-api");
}

const resolveOutcome = await runTool(vehicleRegistry!, {
  toolName: "vehicle.resolveSelection",
  requestId: "req-resolve",
  conversationId: CONVERSATION_A,
  input: { listingId: LISTING_ID },
});
if (resolveOutcome.kind === "completed" && resolveOutcome.result.status === "ok") {
  const data = resolveOutcome.result.data as VehicleResolveSelectionToolData;
  assertEqual("vehicle: resolve selection output", data, {
    listingId: LISTING_ID,
    resolved: true,
  });
}

const crossRoomResolve = await runTool(vehicleRegistry!, {
  toolName: "vehicle.resolveSelection",
  requestId: "req-resolve-cross-room",
  conversationId: CONVERSATION_B,
  input: { listingId: LISTING_ID },
});
if (crossRoomResolve.kind === "completed") {
  assertEqual(
    "vehicle: cross-room trusted context rejected",
    crossRoomResolve.result.errorCode,
    VEHICLE_RESOLVE_SELECTION_ADAPTER_ERROR_CODES.missingConversationContext
  );
}

// ---------- 10.5 Finance execution through composite registry ----------

const financeRegistry = createConversationCoreBusinessToolRegistry(
  buildBusinessDeps({ trusted: sharedTrustedProvider() })
);
assertTruthy("finance: composite registry ready", financeRegistry);

const financeOutcome = await runTool(financeRegistry!, financeRequest());
assertEqual("finance: executor completed", financeOutcome.kind, "completed");
if (financeOutcome.kind === "completed" && financeOutcome.result.status === "ok") {
  const data = financeOutcome.result.data as FinanceCalculateToolData;
  const expected = calculateFlatRateFinance({
    carPrice: 500_000,
    downPaymentPercent: 20,
    annualFlatRatePercent: 5,
    termMonths: 60,
  });
  assertEqual("finance: monthly payment from inventory price", data.monthlyPayment, 8_333);
  assertEqual(
    "finance: matches flat-rate calculator",
    data.monthlyPayment,
    expected.monthlyInstallment
  );
  assertEqual("finance: price source inventory", data.priceSource, "inventory");
  assertEqual("finance: estimate metadata", data.isEstimate, true);
  assertEqual("finance: vat not calculated", data.vatStatus, "not-calculated");
  assertEqual("finance: provenance", financeOutcome.result.provenance, "finance-calculator");
}

const financeCrossRoomRegistry = createConversationCoreBusinessToolRegistry({
  vehicle: null,
  finance: {
    inventoryRepository: createFakeInventoryRepository({}),
    trustedContextProvider: {
      async getContext() {
        return {
          conversationId: CONVERSATION_B,
          allowedListingIds: [LISTING_ID],
        };
      },
    },
  },
});
assertTruthy("finance: cross-room registry ready", financeCrossRoomRegistry);
const crossRoomFinanceMismatch = await runTool(financeCrossRoomRegistry!, financeRequest());
assertEqual("finance: cross-room executor completed", crossRoomFinanceMismatch.kind, "completed");
if (crossRoomFinanceMismatch.kind === "completed") {
  assertEqual(
    "finance: cross-room listing rejected",
    crossRoomFinanceMismatch.result.errorCode,
    FINANCE_CALCULATE_ADAPTER_ERROR_CODES.malformedTrustedContext
  );
}

// ---------- 10.6 No activation ----------

const compositeSource = readFileSync(
  fileURLToPath(
    new URL("../src/server/conversation-core/conversationCoreBusinessToolAdapters.ts", import.meta.url)
  ),
  "utf8"
);
const indexSource = readFileSync(
  fileURLToPath(new URL("../src/server/conversation-core/index.ts", import.meta.url)),
  "utf8"
);

assertFalsy("no-activation: composite has no route handler import", /conversationCoreRouteHandler/.test(compositeSource));
assertFalsy("no-activation: composite has no orchestrator import", /conversationCoreOrchestrator/.test(compositeSource));
assertFalsy(
  "no-activation: composite has no execution service import",
  /conversationCoreExecutionService/.test(compositeSource)
);
assertFalsy(
  "no-activation: composite has no feature flag import",
  /conversationCoreFeatureFlags/.test(compositeSource)
);
assertFalsy("no-activation: composite has no chat-v2 import", /chat-v2/.test(compositeSource));
assertFalsy("no-activation: composite has no process.env", /process\.env/.test(compositeSource));
assertFalsy("no-activation: composite has no HTTP route registration", /app\.(post|get|use)\(/.test(compositeSource));
assertFalsy("no-activation: composite has no fetch call", /fetch\(/.test(compositeSource));
assertFalsy("no-activation: composite has no singleton cache", /singleton|globalRegistry/.test(compositeSource));
assertFalsy(
  "no-activation: composite does not call tool executor",
  /executeConversationCoreTool/.test(compositeSource)
);
assertFalsy(
  "no-activation: D4B index export does not wire route handler",
  /registerConversationCoreRoutes/.test(indexSource) &&
    /conversationCoreBusinessToolAdapters/.test(indexSource.split("registerConversationCoreRoutes")[0] ?? "")
);

void MARKETPLACE_SEARCH_ADAPTER_ERROR_CODES;
void INVENTORY_FETCH_ADAPTER_ERROR_CODES;
void CONVERSATION_CORE_TOOL_EXECUTOR_ERROR_CODES;

const MIN_BUSINESS_ADAPTER_ASSERTIONS = 45;
if (passCount < MIN_BUSINESS_ADAPTER_ASSERTIONS) {
  console.error(
    `FAIL expected at least ${MIN_BUSINESS_ADAPTER_ASSERTIONS} assertions, got ${passCount}`
  );
  process.exit(1);
}

console.log(`\nConversation Core business tool adapter tests passed (${passCount} assertions).`);
