/**
 * WP-V2U-03D3B — Conversation Core finance business tool adapter tests.
 * Fake dependencies only. No network, Firebase, Gemini, or production inventory.
 * Run: .\node_modules\.bin\tsx.cmd scripts/test-conversation-core-finance-tool-adapter.mts
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { MarketplaceCarRecord } from "../src/server/marketplaceInventory";
import type { InventoryRepository } from "../src/server/repositories/inventoryRepository";
import { calculateFlatRateFinance } from "../src/utils/financeCalculator";
import type {
  FinanceCalculateToolData,
  ToolRequest,
} from "../src/services/conversation-core/index";
import {
  validateToolRequest,
  validateToolResult,
} from "../src/services/conversation-core/index";
import {
  ConversationCoreToolRegistryDuplicateError,
  CONVERSATION_CORE_TOOL_EXECUTOR_ERROR_CODES,
  createConversationCoreFinanceToolRegistry,
  createConversationCoreFinanceToolRegistrations,
  createConversationCoreToolRegistry,
  createConversationCoreVehicleToolRegistry,
  FINANCE_CALCULATE_ADAPTER_ERROR_CODES,
  executeConversationCoreTool,
  type ConversationTrustedListingContextProvider,
} from "../src/server/conversation-core/index";

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

const CONVERSATION_A = "conv-finance-adapters-a";
const CONVERSATION_B = "conv-finance-adapters-b";
const LISTING_ID = "listing-finance-500k";
const REQUEST_ID = "fin-req-1";

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
  getByIdThrows?: boolean;
}): InventoryRepository {
  const published = input.published ?? [baseRecord()];
  const byId = input.byId ?? Object.fromEntries(published.map((r) => [r.id, r]));
  return {
    backend: "file",
    listings: {
      async listPublished() {
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

function trustedProviderFor(
  conversationId: string,
  listingIds: string[]
): ConversationTrustedListingContextProvider {
  return {
    async getContext(id: string) {
      if (id !== conversationId) {
        return { conversationId: id, allowedListingIds: listingIds };
      }
      return { conversationId, allowedListingIds: listingIds };
    },
  };
}

function financeRequest(
  input: ToolRequest & { toolName: "finance.calculate" } extends { input: infer I }
    ? Partial<I> & Pick<I, never>
    : never,
  overrides: {
    conversationId?: string;
    requestId?: string;
  } = {}
): ToolRequest {
  return {
    toolName: "finance.calculate",
    requestId: overrides.requestId ?? REQUEST_ID,
    conversationId: overrides.conversationId ?? CONVERSATION_A,
    input: {
      listingId: LISTING_ID,
      annualInterestRatePercent: 5,
      termMonths: 60,
      downPaymentPercent: 20,
      ...input,
    },
  } as ToolRequest;
}

function createFinanceDeps(input: {
  inventory?: InventoryRepository;
  trusted?: ConversationTrustedListingContextProvider | null;
}) {
  return {
    inventoryRepository: input.inventory ?? createFakeInventoryRepository({}),
    trustedContextProvider:
      input.trusted !== undefined
        ? input.trusted
        : trustedProviderFor(CONVERSATION_A, [LISTING_ID]),
  };
}

async function runFinanceHandler(
  request: ToolRequest,
  deps = createFinanceDeps({})
) {
  const registrations = createConversationCoreFinanceToolRegistrations(deps);
  assertTruthy("registry: finance registrations created", registrations);
  const registry = createConversationCoreToolRegistry(registrations!);
  return executeConversationCoreTool(
    {
      rawRequest: request,
      trustedBinding: {
        requestId: request.requestId,
        conversationId: request.conversationId,
        toolName: request.toolName,
      },
      trustedToolAllowlist: ["finance.calculate"],
    },
    { registry: registry! }
  );
}

const EXPECTED_500K_20PCT = calculateFlatRateFinance({
  carPrice: 500_000,
  downPaymentPercent: 20,
  annualFlatRatePercent: 5,
  termMonths: 60,
});

// ---------- Formula ----------

{
  const outcome = await runFinanceHandler(financeRequest({ downPaymentPercent: 20 }));
  assertEqual("formula: outcome completed", outcome.kind, "completed");
  if (outcome.kind !== "completed") {
    process.exit(1);
  }
  const data = outcome.result.data as FinanceCalculateToolData;
  assertEqual("formula: monthly payment 8333", data.monthlyPayment, 8_333);
  assertEqual("formula: loan amount", data.loanAmount, 400_000);
  assertEqual("formula: total interest", data.totalInterest, 100_000);
  assertEqual("formula: total payable", data.totalPayable, 500_000);
  assertEqual(
    "formula: matches calculator",
    data.monthlyPayment,
    EXPECTED_500K_20PCT.monthlyInstallment
  );
}

{
  const outcome = await runFinanceHandler(
    financeRequest({ downPayment: 100_000, downPaymentPercent: undefined })
  );
  assertEqual("down-baht: completed", outcome.kind, "completed");
  if (outcome.kind === "completed") {
    const data = outcome.result.data as FinanceCalculateToolData;
    assertEqual(
      "down-baht: monthly payment",
      data.monthlyPayment,
      8_333
    );
  }
}

{
  const outcome = await runFinanceHandler(
    financeRequest({ downPaymentPercent: 0, downPayment: undefined })
  );
  assertEqual("zero-percent: completed", outcome.kind, "completed");
  if (outcome.kind === "completed") {
    const data = outcome.result.data as FinanceCalculateToolData;
    assertEqual("zero-percent: down baht", data.downPaymentBaht, 0);
    assertEqual("zero-percent: loan amount", data.loanAmount, 500_000);
  }
}

{
  const outcome = await runFinanceHandler(
    financeRequest({ downPayment: 0, downPaymentPercent: undefined })
  );
  assertEqual("zero-baht: completed", outcome.kind, "completed");
  if (outcome.kind === "completed") {
    const data = outcome.result.data as FinanceCalculateToolData;
    assertEqual("zero-baht: down baht", data.downPaymentBaht, 0);
  }
}

assertEqual(
  "rounding: per-step calculator monthly",
  EXPECTED_500K_20PCT.monthlyInstallment,
  8_333
);

{
  const outcome = await runFinanceHandler(financeRequest({ downPaymentPercent: 20 }));
  if (outcome.kind === "completed") {
    const data = outcome.result.data as FinanceCalculateToolData;
    assertNotEqual(
      "vat: monthly is not VAT-multiplied",
      data.monthlyPayment,
      Math.round(data.monthlyPayment * 1.07)
    );
    assertEqual("vat: status not-calculated", data.vatStatus, "not-calculated");
  }
}

// ---------- Contract/input via validateToolRequest ----------

function assertRequestFail(label: string, raw: unknown, code: string): void {
  const result = validateToolRequest(raw);
  if (result.ok !== false) {
    console.error(`FAIL [${label}] expected rejection`);
    process.exit(1);
  }
  if (!result.issues.some((issue) => issue.code === code)) {
    console.error(
      `FAIL [${label}] expected code ${code}, got ${result.issues.map((i) => i.code).join(",")}`
    );
    process.exit(1);
  }
  pass(label);
}

function assertRequestOk(label: string, raw: unknown): void {
  const result = validateToolRequest(raw);
  if (result.ok === false) {
    console.error(
      `FAIL [${label}] expected ok, got ${result.issues.map((i) => i.code).join(",")}`
    );
    process.exit(1);
  }
  pass(label);
}

assertRequestFail(
  "contract: missing rate rejected",
  financeRequest({ annualInterestRatePercent: undefined } as never),
  "invalid_number"
);
assertRequestOk(
  "contract: rate 0 accepted",
  financeRequest({ annualInterestRatePercent: 0 })
);
assertRequestFail(
  "contract: negative rate rejected",
  financeRequest({ annualInterestRatePercent: -1 }),
  "number_out_of_bounds"
);
assertRequestFail(
  "contract: rate above 30 rejected",
  financeRequest({ annualInterestRatePercent: 30.01 }),
  "number_out_of_bounds"
);
assertRequestFail(
  "contract: missing term rejected",
  financeRequest({ termMonths: undefined } as never),
  "invalid_number"
);
assertRequestFail(
  "contract: term 0 rejected",
  financeRequest({ termMonths: 0 }),
  "number_out_of_bounds"
);
assertRequestFail(
  "contract: negative term rejected",
  financeRequest({ termMonths: -12 }),
  "number_out_of_bounds"
);
assertRequestFail(
  "contract: decimal term rejected",
  financeRequest({ termMonths: 60.5 }),
  "invalid_integer"
);
assertRequestFail(
  "contract: term above 120 rejected",
  financeRequest({ termMonths: 121 }),
  "number_out_of_bounds"
);
assertRequestFail(
  "contract: missing both down forms rejected",
  financeRequest({ downPayment: undefined, downPaymentPercent: undefined }),
  "missing_down_payment"
);
assertRequestFail(
  "contract: both down forms rejected",
  financeRequest({ downPayment: 100_000, downPaymentPercent: 20 }),
  "conflicting_down_payment"
);
assertRequestFail(
  "contract: negative down payment rejected",
  financeRequest({ downPayment: -1, downPaymentPercent: undefined }),
  "number_out_of_bounds"
);
assertRequestFail(
  "contract: percent below 0 rejected",
  financeRequest({ downPaymentPercent: -1, downPayment: undefined }),
  "number_out_of_bounds"
);
assertRequestFail(
  "contract: percent above 100 rejected",
  financeRequest({ downPaymentPercent: 100.1, downPayment: undefined }),
  "number_out_of_bounds"
);
assertRequestFail(
  "contract: unknown field rejected",
  financeRequest({ vehiclePrice: 500_000 } as never),
  "unknown_field"
);
assertRequestFail(
  "contract: NaN down payment rejected",
  financeRequest({ downPayment: Number.NaN, downPaymentPercent: undefined }),
  "invalid_number"
);

// ---------- Trust ----------

{
  const outcome = await runFinanceHandler(financeRequest({ downPaymentPercent: 20 }));
  if (outcome.kind === "completed") {
    const data = outcome.result.data as FinanceCalculateToolData;
    assertEqual(
      "trust: price from inventory",
      data.vehiclePrice,
      500_000
    );
    assertEqual("trust: price source inventory", data.priceSource, "inventory");
  }
}

{
  const outcome = await runFinanceHandler(
    financeRequest({ downPaymentPercent: 20 }),
    createFinanceDeps({
      trusted: {
        async getContext() {
          return {
            conversationId: CONVERSATION_B,
            allowedListingIds: [LISTING_ID],
          };
        },
      },
    })
  );
  if (outcome.kind === "completed") {
    assertEqual(
      "trust: cross-room rejected",
      outcome.result.errorCode,
      FINANCE_CALCULATE_ADAPTER_ERROR_CODES.malformedTrustedContext
    );
  }
}

{
  const outcome = await runFinanceHandler(
    financeRequest({ downPaymentPercent: 20 }),
    createFinanceDeps({
      trusted: trustedProviderFor(CONVERSATION_A, ["other-listing"]),
    })
  );
  if (outcome.kind === "completed") {
    assertEqual(
      "trust: outside trusted set",
      outcome.result.errorCode,
      FINANCE_CALCULATE_ADAPTER_ERROR_CODES.listingNotInTrustedSet
    );
  }
}

{
  const outcome = await runFinanceHandler(
    financeRequest({ downPaymentPercent: 20 }),
    createFinanceDeps({ trusted: null })
  );
  if (outcome.kind === "completed") {
    assertEqual(
      "trust: missing trusted context",
      outcome.result.errorCode,
      FINANCE_CALCULATE_ADAPTER_ERROR_CODES.trustedContextUnavailable
    );
  }
}

{
  const outcome = await runFinanceHandler(
    financeRequest({ downPaymentPercent: 20 }),
    createFinanceDeps({
      inventory: createFakeInventoryRepository({ byId: { [LISTING_ID]: null } }),
    })
  );
  if (outcome.kind === "completed") {
    assertEqual(
      "trust: missing listing",
      outcome.result.errorCode,
      FINANCE_CALCULATE_ADAPTER_ERROR_CODES.listingNotFound
    );
  }
}

{
  const outcome = await runFinanceHandler(
    financeRequest({ downPaymentPercent: 20 }),
    createFinanceDeps({
      inventory: createFakeInventoryRepository({
        published: [baseRecord({ listingStatus: "hidden" })],
      }),
    })
  );
  if (outcome.kind === "completed") {
    assertEqual(
      "trust: unpublished listing",
      outcome.result.errorCode,
      FINANCE_CALCULATE_ADAPTER_ERROR_CODES.listingNotPublished
    );
  }
}

{
  const outcome = await runFinanceHandler(
    financeRequest({ downPaymentPercent: 20 }),
    createFinanceDeps({
      inventory: createFakeInventoryRepository({
        published: [baseRecord({ price: 0 })],
      }),
    })
  );
  if (outcome.kind === "completed") {
    assertEqual(
      "trust: invalid listing price",
      outcome.result.errorCode,
      FINANCE_CALCULATE_ADAPTER_ERROR_CODES.financePriceUnavailable
    );
  }
}

{
  const outcome = await runFinanceHandler(
    financeRequest({ downPayment: 600_000, downPaymentPercent: undefined })
  );
  if (outcome.kind === "completed") {
    assertEqual(
      "trust: down payment above price rejected",
      outcome.result.errorCode,
      FINANCE_CALCULATE_ADAPTER_ERROR_CODES.invalidFinanceInputs
    );
  }
}

{
  const outcome = await runFinanceHandler(
    financeRequest({ downPaymentPercent: 20 }),
    createFinanceDeps({
      inventory: createFakeInventoryRepository({ getByIdThrows: true }),
    })
  );
  if (outcome.kind === "completed") {
    assertEqual(
      "trust: inventory lookup failed",
      outcome.result.errorCode,
      FINANCE_CALCULATE_ADAPTER_ERROR_CODES.inventoryLookupFailed
    );
  }
}

// ---------- Output ----------

{
  const outcome = await runFinanceHandler(financeRequest({ downPaymentPercent: 20 }));
  assertEqual("output: completed", outcome.kind, "completed");
  if (outcome.kind !== "completed") {
    process.exit(1);
  }
  const validated = validateToolResult(outcome.result, {
    requestId: REQUEST_ID,
    conversationId: CONVERSATION_A,
    toolName: "finance.calculate",
  });
  assertTruthy("output: validates against contract", validated.ok);
  const data = outcome.result.data as FinanceCalculateToolData;
  assertEqual("output: calculation mode", data.calculationMode, "listing-bound");
  assertEqual("output: interest method flat", data.interestMethod, "flat");
  assertEqual("output: currency THB", data.currency, "THB");
  assertEqual("output: is estimate", data.isEstimate, true);
  assertEqual("output: not quotation", data.quotationStatus, "not-quotation");
  assertEqual("output: vat not calculated", data.vatStatus, "not-calculated");
  assertEqual(
    "output: additional charges not calculated",
    data.additionalChargesStatus,
    "not-calculated"
  );
  assertFalsy(
    "output: no NaN monthly",
    Number.isNaN(data.monthlyPayment) || !Number.isFinite(data.monthlyPayment)
  );
}

{
  const outcome = await runFinanceHandler(
    financeRequest({ downPaymentPercent: 20 }),
    createFinanceDeps({ trusted: null })
  );
  if (outcome.kind === "completed") {
    assertFalsy("output: error has no data", outcome.result.data);
    assertEqual("output: error status", outcome.result.status, "error");
  }
}

// ---------- Registry ----------

{
  const registrations = createConversationCoreFinanceToolRegistrations(
    createFinanceDeps({})
  );
  assertTruthy("registry: registrations created", registrations);
  assertEqual("registry: only finance.calculate", registrations!.map((r) => r.toolName), [
    "finance.calculate",
  ]);
  const registry = createConversationCoreFinanceToolRegistry(createFinanceDeps({}));
  assertTruthy("registry: registry created", registry);
  assertEqual(
    "registry: registered tool names",
    [...registry!.registeredToolNames],
    ["finance.calculate"]
  );
  assertFalsy(
    "registry: vehicle registry unaffected",
    createConversationCoreVehicleToolRegistry(
      createFinanceDeps({}) as Parameters<typeof createConversationCoreVehicleToolRegistry>[0]
    )?.isRegistered("finance.calculate")
  );
}

try {
  createConversationCoreToolRegistry([
    ...(createConversationCoreFinanceToolRegistrations(createFinanceDeps({})) ?? []),
    ...(createConversationCoreFinanceToolRegistrations(createFinanceDeps({})) ?? []),
  ]);
  console.error("FAIL registry: duplicate registration should throw");
  process.exit(1);
} catch (error) {
  assertTruthy(
    "registry: duplicate registration throws",
    error instanceof ConversationCoreToolRegistryDuplicateError
  );
}

// ---------- Import boundary ----------

const adapterSource = readFileSync(
  fileURLToPath(new URL("../src/server/conversation-core/adapters/financeCalculateToolAdapter.ts", import.meta.url)),
  "utf8"
);
const factorySource = readFileSync(
  fileURLToPath(
    new URL("../src/server/conversation-core/conversationCoreFinanceToolAdapters.ts", import.meta.url)
  ),
  "utf8"
);
assertFalsy("boundary: no browser component import in adapter", /components\//.test(adapterSource));
assertFalsy("boundary: no chat-v3 import in adapter", /chat-v3/.test(adapterSource));
assertFalsy("boundary: no process.env in adapter", /process\.env/.test(adapterSource));
assertFalsy("boundary: no process.env in factory", /process\.env/.test(factorySource));

// ---------- Executor integration ----------

{
  const outcome = await runFinanceHandler(financeRequest({ downPaymentPercent: 20 }));
  assertEqual("integration: executor completed", outcome.kind, "completed");
  if (outcome.kind === "completed") {
    assertEqual("integration: provenance", outcome.result.provenance, "finance-calculator");
  }
}

{
  const registry = createConversationCoreFinanceToolRegistry(createFinanceDeps({}));
  const outcome = await executeConversationCoreTool(
    {
      rawRequest: financeRequest({ downPaymentPercent: 20 }),
      trustedBinding: {
        requestId: REQUEST_ID,
        conversationId: CONVERSATION_A,
        toolName: "inventory.fetch",
      },
      trustedToolAllowlist: ["finance.calculate"],
    },
    { registry: registry! }
  );
  assertEqual("integration: binding mismatch completed", outcome.kind, "completed");
  if (outcome.kind === "completed") {
    assertEqual(
      "integration: binding mismatch error code",
      outcome.result.errorCode,
      CONVERSATION_CORE_TOOL_EXECUTOR_ERROR_CODES.bindingMismatch
    );
  }
}

void CONVERSATION_CORE_TOOL_EXECUTOR_ERROR_CODES;

const MIN_FINANCE_ADAPTER_ASSERTIONS = 55;
if (passCount < MIN_FINANCE_ADAPTER_ASSERTIONS) {
  console.error(
    `FAIL expected at least ${MIN_FINANCE_ADAPTER_ASSERTIONS} assertions, got ${passCount}`
  );
  process.exit(1);
}

console.log(`\nConversation Core finance tool adapter tests passed (${passCount} assertions).`);
