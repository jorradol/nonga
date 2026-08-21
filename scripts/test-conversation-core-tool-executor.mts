/**
 * WP-V2U-03D1 — Conversation Core tool registry and bounded executor tests.
 * Fake handlers only. No network, Firebase, Gemini, inventory, or finance runtime.
 * Run: .\node_modules\.bin\tsx.cmd scripts/test-conversation-core-tool-executor.mts
 */
import {
  PHASE1_READ_ONLY_TOOLS,
  type ConversationCoreToolName,
  type ToolRequest,
} from "../src/services/conversation-core/index";
import {
  CONVERSATION_CORE_TOOL_DEFAULT_TIMEOUT_MS,
  CONVERSATION_CORE_TOOL_EXECUTOR_ERROR_CODES,
  CONVERSATION_CORE_TOOL_MAX_TIMEOUT_MS,
  CONVERSATION_CORE_TOOL_MIN_TIMEOUT_MS,
  ConversationCoreToolRegistryDuplicateError,
  VEHICLE_RESOLVE_SELECTION_ADAPTER_ERROR_CODES,
  createConversationCoreToolRegistry,
  createConversationCoreVehicleToolRegistry,
  createEmptyConversationCoreToolRegistry,
  executeConversationCoreTool,
  resolveConversationCoreToolTimeoutMs,
  type ConversationCoreToolExecutorDeps,
  type ConversationCoreToolExecutorInput,
  type ConversationCoreToolExecutorOutcome,
  type ConversationCoreToolExecutorScheduleHandle,
  type ConversationCoreToolHandler,
  type ConversationCoreToolHandlerOutput,
  type ConversationCoreToolTrustedBinding,
} from "../src/server/conversation-core/index";
import type { InventoryRepository } from "../src/server/repositories/inventoryRepository";
import type { MarketplaceCarRecord } from "../src/server/marketplaceInventory";
import type { MarketplaceSearchToolData } from "../src/services/conversation-core/index";
import type { VehicleDiscoveryResult } from "../src/services/ai/chat/vehicleDiscoveryIndex";

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
    console.error(`FAIL [${label}] expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
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

async function withWatchdog<T>(
  label: string,
  run: () => Promise<T>,
  timeoutMs = 250
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const watchdog = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`watchdog timeout: ${label}`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([run(), watchdog]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

const CONVERSATION_ID = "conv-tool-exec-001";
const REQUEST_ID = "tool-req-001";

function validMarketplaceRequest(
  overrides: Partial<ToolRequest> = {}
): ToolRequest {
  return {
    toolName: "marketplace.search",
    requestId: REQUEST_ID,
    conversationId: CONVERSATION_ID,
    input: { query: "รถเก๋งไม่เกิน 600000" },
    ...overrides,
  } as ToolRequest;
}

function trustedBindingFor(
  request: ToolRequest
): ConversationCoreToolTrustedBinding {
  return {
    requestId: request.requestId,
    conversationId: request.conversationId,
    toolName: request.toolName,
  };
}

function executorInput(
  rawRequest: unknown,
  options: {
    trustedBinding?: unknown;
    trustedToolAllowlist?: readonly ConversationCoreToolName[];
    timeoutMs?: number;
  } = {}
): ConversationCoreToolExecutorInput {
  const defaultRequest = validMarketplaceRequest();
  let trustedBinding: unknown =
    options.trustedBinding !== undefined
      ? options.trustedBinding
      : trustedBindingFor(defaultRequest);

  if (
    options.trustedBinding === undefined &&
    rawRequest &&
    typeof rawRequest === "object" &&
    !Array.isArray(rawRequest)
  ) {
    const candidate = rawRequest as Partial<ToolRequest>;
    if (
      typeof candidate.requestId === "string" &&
      candidate.requestId.trim().length > 0 &&
      typeof candidate.conversationId === "string" &&
      candidate.conversationId.trim().length > 0 &&
      typeof candidate.toolName === "string" &&
      candidate.toolName.trim().length > 0
    ) {
      trustedBinding = trustedBindingFor(rawRequest as ToolRequest);
    }
  }

  return {
    rawRequest,
    trustedBinding,
    trustedToolAllowlist: options.trustedToolAllowlist ?? ["marketplace.search"],
    ...(options.timeoutMs !== undefined ? { timeoutMs: options.timeoutMs } : {}),
  };
}

function okMarketplaceOutput(): ConversationCoreToolHandlerOutput {
  return {
    status: "ok",
    data: {
      listingIds: ["listing-100"],
      query: "รถเก๋งไม่เกิน 600000",
    },
  };
}

function countingHandler(
  output: ConversationCoreToolHandlerOutput | Promise<ConversationCoreToolHandlerOutput>
): { handler: ConversationCoreToolHandler; calls: { count: number } } {
  const calls = { count: 0 };
  const handler: ConversationCoreToolHandler = () => {
    calls.count += 1;
    return output;
  };
  return { handler, calls };
}

function registryWithMarketplaceHandler(handler: ConversationCoreToolHandler) {
  return createConversationCoreToolRegistry([
    { toolName: "marketplace.search", handler },
  ]);
}

// ---------- Registry ----------

const emptyRegistry = createEmptyConversationCoreToolRegistry();
assertEqual(
  "registry: canonical tool names match contract",
  [...emptyRegistry.canonicalToolNames],
  [...PHASE1_READ_ONLY_TOOLS]
);
assertFalsy("registry: marketplace.search unavailable by default", emptyRegistry.isRegistered("marketplace.search"));
assertFalsy(
  "registry: unknown tool name rejected",
  emptyRegistry.isCanonicalToolName("vehicle.search")
);
assertFalsy(
  "registry: case variation rejected",
  emptyRegistry.isCanonicalToolName("Marketplace.search")
);
assertFalsy(
  "registry: near-match rejected",
  emptyRegistry.isCanonicalToolName("marketplace.searchx")
);

const firstHandler: ConversationCoreToolHandler = () => okMarketplaceOutput();
const secondHandler: ConversationCoreToolHandler = () => ({
  status: "ok",
  data: { listingIds: ["listing-200"], query: "other" },
});
let duplicateThrown = false;
try {
  createConversationCoreToolRegistry([
    { toolName: "marketplace.search", handler: firstHandler },
    { toolName: "marketplace.search", handler: secondHandler },
  ]);
} catch (err) {
  duplicateThrown = err instanceof ConversationCoreToolRegistryDuplicateError;
}
assertTruthy("registry: duplicate registration throws", duplicateThrown);

const registeredRegistry = createConversationCoreToolRegistry([
  { toolName: "marketplace.search", handler: firstHandler },
]);
assertTruthy("registry: canonical tool registered", registeredRegistry.isRegistered("marketplace.search"));
assertEqual(
  "registry: registered tool names immutable snapshot",
  [...registeredRegistry.registeredToolNames],
  ["marketplace.search"]
);
Object.freeze(registeredRegistry.registeredToolNames);
try {
  (registeredRegistry.registeredToolNames as string[]).push("inventory.fetch");
} catch {
  // expected on strict engines
}
assertEqual(
  "registry: external mutation does not change registered tools",
  [...registeredRegistry.registeredToolNames],
  ["marketplace.search"]
);

// ---------- Request and allowlist ----------

async function runExecutor(
  rawRequest: unknown,
  options: {
    handler?: ConversationCoreToolHandler;
    trustedBinding?: unknown;
    trustedToolAllowlist?: readonly ConversationCoreToolName[];
    timeoutMs?: number;
    scheduleTimeout?: ConversationCoreToolExecutorDeps["scheduleTimeout"];
  } = {}
) {
  const handler = options.handler ?? (() => okMarketplaceOutput());
  const registry = registryWithMarketplaceHandler(handler);
  return executeConversationCoreTool(executorInput(rawRequest, options), {
    registry,
    ...(options.scheduleTimeout ? { scheduleTimeout: options.scheduleTimeout } : {}),
  });
}

const validRequest = validMarketplaceRequest();
const validOutcome = await runExecutor(validRequest);
assertEqual("request: valid request completes", validOutcome.kind, "completed");
if (validOutcome.kind === "completed") {
  assertEqual("request: valid result status", validOutcome.result.status, "ok");
}

const malformedOutcome = await runExecutor({ toolName: "marketplace.search" });
assertEqual("request: malformed request rejected", malformedOutcome.kind, "rejected");
if (malformedOutcome.kind === "rejected") {
  assertEqual("request: malformed reason code", malformedOutcome.reasonCode, "malformed_request");
}

const invalidTrustedBindingCounter = countingHandler(okMarketplaceOutput());
const invalidTrustedBindingOutcome = await executeConversationCoreTool(
  {
    rawRequest: validRequest,
    trustedBinding: { requestId: "", conversationId: CONVERSATION_ID, toolName: "marketplace.search" },
    trustedToolAllowlist: ["marketplace.search"],
  },
  { registry: registryWithMarketplaceHandler(invalidTrustedBindingCounter.handler) }
);
assertEqual(
  "binding: invalid trusted binding rejected",
  invalidTrustedBindingOutcome.kind,
  "rejected"
);
assertEqual(
  "binding: invalid trusted binding handler count",
  invalidTrustedBindingCounter.calls.count,
  0
);
if (invalidTrustedBindingOutcome.kind === "rejected") {
  assertEqual(
    "binding: invalid trusted binding reason",
    invalidTrustedBindingOutcome.reasonCode,
    "invalid_trusted_binding"
  );
}

const matchingBindingCounter = countingHandler(okMarketplaceOutput());
const matchingBindingOutcome = await executeConversationCoreTool(
  executorInput(validRequest, { trustedBinding: trustedBindingFor(validRequest) }),
  { registry: registryWithMarketplaceHandler(matchingBindingCounter.handler) }
);
assertEqual("binding: matching trusted binding succeeds", matchingBindingOutcome.kind, "completed");
assertEqual("binding: matching trusted binding handler count", matchingBindingCounter.calls.count, 1);

const forgedRequestIdCounter = countingHandler(okMarketplaceOutput());
const forgedRequestIdOutcome = await executeConversationCoreTool(
  executorInput(validMarketplaceRequest({ requestId: "forged-request-id" }), {
    trustedBinding: trustedBindingFor(validRequest),
  }),
  { registry: registryWithMarketplaceHandler(forgedRequestIdCounter.handler) }
);
assertEqual("binding: forged requestId fails closed", forgedRequestIdOutcome.kind, "completed");
assertEqual("binding: forged requestId handler count", forgedRequestIdCounter.calls.count, 0);
if (forgedRequestIdOutcome.kind === "completed") {
  assertEqual(
    "binding: forged requestId error code",
    forgedRequestIdOutcome.result.errorCode,
    CONVERSATION_CORE_TOOL_EXECUTOR_ERROR_CODES.bindingMismatch
  );
  assertEqual(
    "binding: forged requestId result uses trusted requestId",
    forgedRequestIdOutcome.result.requestId,
    REQUEST_ID
  );
  assertNotIncludes(
    "binding: forged requestId not leaked",
    JSON.stringify(forgedRequestIdOutcome.result),
    "forged-request-id"
  );
}

const forgedConversationCounter = countingHandler(okMarketplaceOutput());
const forgedConversationOutcome = await executeConversationCoreTool(
  executorInput(validMarketplaceRequest({ conversationId: "forged-conversation" }), {
    trustedBinding: trustedBindingFor(validRequest),
  }),
  { registry: registryWithMarketplaceHandler(forgedConversationCounter.handler) }
);
assertEqual("binding: forged conversationId fails closed", forgedConversationOutcome.kind, "completed");
assertEqual("binding: forged conversationId handler count", forgedConversationCounter.calls.count, 0);
if (forgedConversationOutcome.kind === "completed") {
  assertEqual(
    "binding: forged conversationId error code",
    forgedConversationOutcome.result.errorCode,
    CONVERSATION_CORE_TOOL_EXECUTOR_ERROR_CODES.bindingMismatch
  );
  assertEqual(
    "binding: forged conversationId result uses trusted conversationId",
    forgedConversationOutcome.result.conversationId,
    CONVERSATION_ID
  );
  assertNotIncludes(
    "binding: forged conversationId not leaked",
    JSON.stringify(forgedConversationOutcome.result),
    "forged-conversation"
  );
}

const forgedToolCounter = countingHandler(okMarketplaceOutput());
const forgedToolRequest: ToolRequest = {
  toolName: "inventory.fetch",
  requestId: REQUEST_ID,
  conversationId: CONVERSATION_ID,
  input: {},
};
const forgedToolOutcome = await executeConversationCoreTool(
  executorInput(forgedToolRequest, {
    trustedBinding: trustedBindingFor(validRequest),
  }),
  {
    registry: createConversationCoreToolRegistry([
      { toolName: "inventory.fetch", handler: forgedToolCounter.handler },
      { toolName: "marketplace.search", handler: () => okMarketplaceOutput() },
    ]),
  }
);
assertEqual("binding: forged toolName fails closed", forgedToolOutcome.kind, "completed");
assertEqual("binding: forged toolName handler count", forgedToolCounter.calls.count, 0);
if (forgedToolOutcome.kind === "completed") {
  assertEqual(
    "binding: forged toolName error code",
    forgedToolOutcome.result.errorCode,
    CONVERSATION_CORE_TOOL_EXECUTOR_ERROR_CODES.bindingMismatch
  );
  assertEqual(
    "binding: forged toolName result uses trusted toolName",
    forgedToolOutcome.result.toolName,
    "marketplace.search"
  );
}

const smuggledBindingOutcome = await executeConversationCoreTool(
  {
    rawRequest: {
      ...validRequest,
      trustedBinding: {
        requestId: "smuggled-request",
        conversationId: "smuggled-conversation",
        toolName: "inventory.fetch",
      },
    },
    trustedBinding: trustedBindingFor(validRequest),
    trustedToolAllowlist: ["marketplace.search"],
  },
  { registry: registryWithMarketplaceHandler(() => okMarketplaceOutput()) }
);
assertEqual(
  "binding: smuggled trusted binding object in raw request rejected",
  smuggledBindingOutcome.kind,
  "rejected"
);

const notAllowlistedOutcome = await runExecutor(validRequest, {
  trustedToolAllowlist: ["inventory.fetch"],
});
assertEqual("allowlist: tool not in trusted allowlist fails closed", notAllowlistedOutcome.kind, "completed");
if (notAllowlistedOutcome.kind === "completed") {
  assertEqual(
    "allowlist: not allowlisted error code",
    notAllowlistedOutcome.result.errorCode,
    CONVERSATION_CORE_TOOL_EXECUTOR_ERROR_CODES.toolNotAllowlisted
  );
}

const emptyAllowlistOutcome = await runExecutor(validRequest, {
  trustedToolAllowlist: [],
});
assertEqual("allowlist: empty trusted allowlist fails closed", emptyAllowlistOutcome.kind, "completed");
if (emptyAllowlistOutcome.kind === "completed") {
  assertEqual(
    "allowlist: empty allowlist error code",
    emptyAllowlistOutcome.result.errorCode,
    CONVERSATION_CORE_TOOL_EXECUTOR_ERROR_CODES.toolNotAllowlisted
  );
}

const smuggledAllowlistOutcome = await executeConversationCoreTool(
  {
    rawRequest: {
      ...validRequest,
      trustedToolAllowlist: ["inventory.fetch"],
    },
    trustedBinding: trustedBindingFor(validRequest),
    trustedToolAllowlist: ["marketplace.search"],
  },
  { registry: registryWithMarketplaceHandler(() => okMarketplaceOutput()) }
);
assertEqual(
  "allowlist: client-smuggled allowlist field rejected before handler",
  smuggledAllowlistOutcome.kind,
  "rejected"
);

const preflightCounter = countingHandler(okMarketplaceOutput());
const preflightOutcome = await executeConversationCoreTool(
  executorInput({ toolName: "marketplace.search" }),
  { registry: registryWithMarketplaceHandler(preflightCounter.handler) }
);
assertEqual("allowlist: malformed request skips handler", preflightOutcome.kind, "rejected");
assertEqual("allowlist: malformed request handler call count", preflightCounter.calls.count, 0);

const missingHandlerOutcome = await executeConversationCoreTool(
  executorInput(validRequest),
  { registry: emptyRegistry }
);
assertEqual("allowlist: missing handler unavailable", missingHandlerOutcome.kind, "completed");
if (missingHandlerOutcome.kind === "completed") {
  assertEqual(
    "allowlist: missing handler error code",
    missingHandlerOutcome.result.errorCode,
    CONVERSATION_CORE_TOOL_EXECUTOR_ERROR_CODES.handlerUnavailable
  );
}

// ---------- Execution ----------

const successCounter = countingHandler(okMarketplaceOutput());
const successOutcome = await runExecutor(validRequest, {
  handler: successCounter.handler,
});
assertEqual("execution: successful handler called once", successCounter.calls.count, 1);
assertEqual("execution: successful handler completes", successOutcome.kind, "completed");

const syncThrowOutcome = await runExecutor(validRequest, {
  handler: () => {
    throw new Error("SECRET_SYNC_TOKEN stack at handler.ts:99");
  },
});
assertEqual("execution: sync throw mapped to completed error", syncThrowOutcome.kind, "completed");
if (syncThrowOutcome.kind === "completed") {
  assertEqual(
    "execution: sync throw error code",
    syncThrowOutcome.result.errorCode,
    CONVERSATION_CORE_TOOL_EXECUTOR_ERROR_CODES.handlerThrew
  );
  const serialized = JSON.stringify(syncThrowOutcome.result);
  assertNotIncludes("execution: sync throw hides secret", serialized, "SECRET_SYNC_TOKEN");
  assertNotIncludes("execution: sync throw hides stack path", serialized, "handler.ts");
}

const asyncRejectOutcome = await runExecutor(validRequest, {
  handler: () => Promise.reject(new Error("SECRET_ASYNC_TOKEN")),
});
assertEqual("execution: rejected promise mapped to completed error", asyncRejectOutcome.kind, "completed");
if (asyncRejectOutcome.kind === "completed") {
  assertEqual(
    "execution: rejected promise error code",
    asyncRejectOutcome.result.errorCode,
    CONVERSATION_CORE_TOOL_EXECUTOR_ERROR_CODES.handlerThrew
  );
  assertNotIncludes(
    "execution: rejected promise hides secret",
    JSON.stringify(asyncRejectOutcome.result),
    "SECRET_ASYNC_TOKEN"
  );
}

const syncTimeoutCounter = countingHandler(
  new Promise<ConversationCoreToolHandlerOutput>(() => {
    // never resolves
  })
);
let syncTimeoutFired = false;
const syncTimeoutOutcome = await executeConversationCoreTool(
  executorInput(validRequest, { timeoutMs: 1 }),
  {
    registry: registryWithMarketplaceHandler(syncTimeoutCounter.handler),
    scheduleTimeout(callback) {
      syncTimeoutFired = true;
      callback();
      return { cancel() {} };
    },
  }
);
assertTruthy("timeout: synchronous timeout scheduler invoked", syncTimeoutFired);
assertEqual("timeout: synchronous timeout handler count", syncTimeoutCounter.calls.count, 0);
assertEqual("timeout: synchronous timeout mapped to completed error", syncTimeoutOutcome.kind, "completed");
if (syncTimeoutOutcome.kind === "completed") {
  assertEqual(
    "timeout: synchronous timeout error code",
    syncTimeoutOutcome.result.errorCode,
    CONVERSATION_CORE_TOOL_EXECUTOR_ERROR_CODES.handlerTimeout
  );
}

const schedulerThrowCounter = countingHandler(okMarketplaceOutput());
const schedulerThrowOutcome = await executeConversationCoreTool(
  executorInput(validRequest, { timeoutMs: 50 }),
  {
    registry: registryWithMarketplaceHandler(schedulerThrowCounter.handler),
    scheduleTimeout() {
      throw new Error("SECRET_SCHEDULER_THROW stack at scheduler.ts:42");
    },
  }
);
assertEqual("timeout: scheduler throw handler count", schedulerThrowCounter.calls.count, 0);
assertEqual("timeout: scheduler throw completes safely", schedulerThrowOutcome.kind, "completed");
if (schedulerThrowOutcome.kind === "completed") {
  assertEqual(
    "timeout: scheduler throw error code",
    schedulerThrowOutcome.result.errorCode,
    CONVERSATION_CORE_TOOL_EXECUTOR_ERROR_CODES.executorInfrastructureFailure
  );
  const serialized = JSON.stringify(schedulerThrowOutcome.result);
  assertNotIncludes("timeout: scheduler throw hides secret", serialized, "SECRET_SCHEDULER_THROW");
  assertNotIncludes("timeout: scheduler throw hides stack path", serialized, "scheduler.ts");
}

const malformedHandleCounter = countingHandler(okMarketplaceOutput());
const malformedHandleOutcome = await executeConversationCoreTool(
  executorInput(validRequest, { timeoutMs: 50 }),
  {
    registry: registryWithMarketplaceHandler(malformedHandleCounter.handler),
    scheduleTimeout() {
      return { cancel: "not-a-function" } as unknown as { cancel: () => void };
    },
  }
);
assertEqual("timeout: malformed handle handler count", malformedHandleCounter.calls.count, 0);
assertEqual("timeout: malformed handle completes safely", malformedHandleOutcome.kind, "completed");
if (malformedHandleOutcome.kind === "completed") {
  assertEqual(
    "timeout: malformed handle error code",
    malformedHandleOutcome.result.errorCode,
    CONVERSATION_CORE_TOOL_EXECUTOR_ERROR_CODES.executorInfrastructureFailure
  );
}

const throwingGetterSecret = "SECRET_THROWING_GETTER_CANCEL";
const throwingGetterCounter = countingHandler(okMarketplaceOutput());
const throwingGetterOutcome = await executeConversationCoreTool(
  executorInput(validRequest, { timeoutMs: 50 }),
  {
    registry: registryWithMarketplaceHandler(throwingGetterCounter.handler),
    scheduleTimeout() {
      const hostile = Object.create(null) as { cancel?: () => void };
      Object.defineProperty(hostile, "cancel", {
        get() {
          throw new Error(`${throwingGetterSecret} stack at hostile.ts:1`);
        },
        enumerable: true,
        configurable: true,
      });
      return hostile as ConversationCoreToolExecutorScheduleHandle;
    },
  }
);
assertEqual("timeout: throwing getter handle handler count", throwingGetterCounter.calls.count, 0);
assertEqual("timeout: throwing getter handle completes safely", throwingGetterOutcome.kind, "completed");
if (throwingGetterOutcome.kind === "completed") {
  assertEqual(
    "timeout: throwing getter handle error code",
    throwingGetterOutcome.result.errorCode,
    CONVERSATION_CORE_TOOL_EXECUTOR_ERROR_CODES.executorInfrastructureFailure
  );
  const serialized = JSON.stringify(throwingGetterOutcome.result);
  assertNotIncludes("timeout: throwing getter hides secret", serialized, throwingGetterSecret);
  assertNotIncludes("timeout: throwing getter hides stack path", serialized, "hostile.ts");
}

const cancelThrowCounter = countingHandler(
  new Promise<ConversationCoreToolHandlerOutput>((resolve) => {
    setTimeout(() => resolve(okMarketplaceOutput()), 5);
  })
);
const cancelThrowOutcome = await withWatchdog("cancel throw settles", () =>
  executeConversationCoreTool(executorInput(validRequest, { timeoutMs: 1000 }), {
    registry: registryWithMarketplaceHandler(cancelThrowCounter.handler),
    scheduleTimeout(callback, ms) {
      const id = setTimeout(callback, ms);
      return {
        cancel() {
          throw new Error("SECRET_CANCEL_THROW");
        },
        // keep timer alive so handler can finish unless timeout wins
        _id: id,
      };
    },
  })
);
assertEqual("timeout: cancel throw settles", cancelThrowOutcome.kind, "completed");
assertEqual("timeout: cancel throw handler called once", cancelThrowCounter.calls.count, 1);
if (cancelThrowOutcome.kind === "completed") {
  assertNotIncludes(
    "timeout: cancel throw hides secret",
    JSON.stringify(cancelThrowOutcome.result),
    "SECRET_CANCEL_THROW"
  );
}

let lateResolveSettled: ConversationCoreToolExecutorOutcome | null = null;
await executeConversationCoreTool(
  executorInput(validMarketplaceRequest({ requestId: "tool-req-late" }), { timeoutMs: 1 }),
  {
    registry: registryWithMarketplaceHandler(
      () =>
        new Promise<ConversationCoreToolHandlerOutput>((resolve) => {
          setTimeout(() => {
            resolve({
              status: "ok",
              data: {
                listingIds: ["listing-late"],
                query: "late",
              },
            });
          }, 10);
        })
    ),
    scheduleTimeout(callback) {
      callback();
      return { cancel() {} };
    },
  }
).then((outcome) => {
  lateResolveSettled = outcome;
});
assertEqual("execution: late resolve keeps timeout outcome", lateResolveSettled?.kind, "completed");
if (lateResolveSettled?.kind === "completed") {
  assertEqual(
    "execution: late resolve error code remains timeout",
    lateResolveSettled.result.errorCode,
    CONVERSATION_CORE_TOOL_EXECUTOR_ERROR_CODES.handlerTimeout
  );
}

let lateRejectUnhandled = false;
const lateRejectSecret = "late-reject-secret";
const onLateRejectUnhandled = (reason: unknown) => {
  if (reason instanceof Error && reason.message === lateRejectSecret) {
    lateRejectUnhandled = true;
  }
};
process.on("unhandledRejection", onLateRejectUnhandled);
const lateRejectCalls = { count: 0 };
const lateRejectHandler: ConversationCoreToolHandler = () => {
  lateRejectCalls.count += 1;
  return new Promise<ConversationCoreToolHandlerOutput>((_, reject) => {
    setTimeout(() => reject(new Error(lateRejectSecret)), 10);
  });
};
const lateRejectOutcome = await executeConversationCoreTool(
  executorInput(validRequest, { timeoutMs: 1 }),
  {
    registry: registryWithMarketplaceHandler(lateRejectHandler),
    scheduleTimeout(callback) {
      callback();
      return { cancel() {} };
    },
  }
);
await new Promise((resolve) => setTimeout(resolve, 20));
process.off("unhandledRejection", onLateRejectUnhandled);
assertEqual("execution: late rejection handler count", lateRejectCalls.count, 0);
assertEqual("execution: late rejection ignored", lateRejectOutcome.kind, "completed");
if (lateRejectOutcome.kind === "completed") {
  assertEqual(
    "execution: late rejection remains timeout",
    lateRejectOutcome.result.errorCode,
    CONVERSATION_CORE_TOOL_EXECUTOR_ERROR_CODES.handlerTimeout
  );
}
assertFalsy("execution: late rejection does not cause unhandled rejection", lateRejectUnhandled);

const asyncLateResolveCalls = { count: 0 };
const asyncLateResolveOutcome = await withWatchdog("async late resolve", () =>
  executeConversationCoreTool(
    executorInput(validMarketplaceRequest({ requestId: "tool-req-async-late-resolve" }), {
      timeoutMs: 100,
    }),
    {
      registry: registryWithMarketplaceHandler(() => {
        asyncLateResolveCalls.count += 1;
        return new Promise<ConversationCoreToolHandlerOutput>((resolve) => {
          setTimeout(() => resolve(okMarketplaceOutput()), 200);
        });
      }),
      scheduleTimeout(callback, ms) {
        const id = setTimeout(callback, ms);
        return { cancel() { clearTimeout(id); } };
      },
    }
  )
);
assertEqual("async late resolve: handler called once", asyncLateResolveCalls.count, 1);
assertEqual("async late resolve: executor returns completed", asyncLateResolveOutcome.kind, "completed");
if (asyncLateResolveOutcome.kind === "completed") {
  assertEqual(
    "async late resolve: executor returns handler_timeout",
    asyncLateResolveOutcome.result.errorCode,
    CONVERSATION_CORE_TOOL_EXECUTOR_ERROR_CODES.handlerTimeout
  );
}
await new Promise((resolve) => setTimeout(resolve, 220));
assertEqual(
  "async late resolve: outcome remains timeout after handler settles",
  asyncLateResolveOutcome.kind,
  "completed"
);
if (asyncLateResolveOutcome.kind === "completed") {
  assertEqual(
    "async late resolve: no second settle after handler resolves",
    asyncLateResolveOutcome.result.errorCode,
    CONVERSATION_CORE_TOOL_EXECUTOR_ERROR_CODES.handlerTimeout
  );
  assertEqual(
    "async late resolve: no retry status flip to ok",
    asyncLateResolveOutcome.result.status,
    "error"
  );
}

const asyncLateRejectSecret = "async-late-reject-secret";
let asyncLateRejectUnhandled = false;
const onAsyncLateRejectUnhandled = (reason: unknown) => {
  if (reason instanceof Error && reason.message === asyncLateRejectSecret) {
    asyncLateRejectUnhandled = true;
  }
};
process.on("unhandledRejection", onAsyncLateRejectUnhandled);
const asyncLateRejectCalls = { count: 0 };
const asyncLateRejectOutcome = await withWatchdog("async late reject", () =>
  executeConversationCoreTool(
    executorInput(validMarketplaceRequest({ requestId: "tool-req-async-late-reject" }), {
      timeoutMs: 100,
    }),
    {
      registry: registryWithMarketplaceHandler(() => {
        asyncLateRejectCalls.count += 1;
        return new Promise<ConversationCoreToolHandlerOutput>((_, reject) => {
          setTimeout(() => reject(new Error(asyncLateRejectSecret)), 200);
        });
      }),
      scheduleTimeout(callback, ms) {
        const id = setTimeout(callback, ms);
        return { cancel() { clearTimeout(id); } };
      },
    }
  )
);
await new Promise((resolve) => setTimeout(resolve, 220));
process.off("unhandledRejection", onAsyncLateRejectUnhandled);
assertEqual("async late reject: handler called once", asyncLateRejectCalls.count, 1);
assertEqual("async late reject: executor returns completed", asyncLateRejectOutcome.kind, "completed");
if (asyncLateRejectOutcome.kind === "completed") {
  assertEqual(
    "async late reject: executor returns handler_timeout",
    asyncLateRejectOutcome.result.errorCode,
    CONVERSATION_CORE_TOOL_EXECUTOR_ERROR_CODES.handlerTimeout
  );
  assertNotIncludes(
    "async late reject: secret not leaked",
    JSON.stringify(asyncLateRejectOutcome.result),
    asyncLateRejectSecret
  );
}
assertFalsy("async late reject: no unhandled rejection", asyncLateRejectUnhandled);

const retryCounter = countingHandler(Promise.reject(new Error("no-retry")));
const retryOutcome = await runExecutor(validRequest, {
  handler: retryCounter.handler,
});
assertEqual("execution: no retry after error", retryCounter.calls.count, 1);
assertEqual("execution: single call on error", retryOutcome.kind, "completed");

const malformedOutputOutcome = await runExecutor(validRequest, {
  handler: () => ({
    status: "ok",
    data: { listingIds: ["ok-1"], query: "q", unexpectedKey: true },
  }),
});
assertEqual("execution: malformed handler output rejected", malformedOutputOutcome.kind, "completed");
if (malformedOutputOutcome.kind === "completed") {
  assertEqual(
    "execution: malformed output error code",
    malformedOutputOutcome.result.errorCode,
    CONVERSATION_CORE_TOOL_EXECUTOR_ERROR_CODES.handlerInvalidResult
  );
}

const zeroSearchOutcome = await runExecutor(validRequest, {
  handler: () => ({
    status: "ok",
    data: { listingIds: [], query: "รถเก๋ง Toyota เกียร์ออโต้ ราคาไม่เกิน 500000" },
  }),
});
assertEqual("execution: marketplace.search zero-result completed", zeroSearchOutcome.kind, "completed");
if (zeroSearchOutcome.kind === "completed") {
  assertEqual("execution: marketplace.search zero-result status", zeroSearchOutcome.result.status, "ok");
  const zeroData = zeroSearchOutcome.result.data as MarketplaceSearchToolData | undefined;
  assertEqual(
    "execution: marketplace.search zero-result empty ids",
    zeroData?.listingIds ?? null,
    []
  );
}

const unsupportedFieldOutcome = await runExecutor(validRequest, {
  handler: () =>
    ({
      status: "ok",
      data: {
        listingIds: ["listing-100"],
        query: "รถเก๋งไม่เกิน 600000",
        forgedPrice: 1,
      },
    }) as ConversationCoreToolHandlerOutput,
});
assertEqual("execution: unsupported output fields rejected", unsupportedFieldOutcome.kind, "completed");
if (unsupportedFieldOutcome.kind === "completed") {
  assertEqual(
    "execution: unsupported fields error code",
    unsupportedFieldOutcome.result.errorCode,
    CONVERSATION_CORE_TOOL_EXECUTOR_ERROR_CODES.handlerInvalidResult
  );
}

const bindingOutcome = await runExecutor(
  validMarketplaceRequest({ requestId: "tool-req-bind", conversationId: "conv-bind" }),
  {
    trustedBinding: {
      requestId: "tool-req-bind",
      conversationId: "conv-bind",
      toolName: "marketplace.search",
    },
    handler: () => okMarketplaceOutput(),
  }
);
assertEqual("execution: server binding preserved", bindingOutcome.kind, "completed");
if (bindingOutcome.kind === "completed") {
  assertEqual("execution: bound request id", bindingOutcome.result.requestId, "tool-req-bind");
  assertEqual("execution: bound conversation id", bindingOutcome.result.conversationId, "conv-bind");
  assertEqual("execution: bound tool name", bindingOutcome.result.toolName, "marketplace.search");
}

const forgedDataOutcome = await runExecutor(validRequest, {
  handler: () => ({
    status: "ok",
    data: {
      listingIds: ["listing-100"],
      query: "รถเก๋งไม่เกิน 600000",
      forgedConversationId: "forged-conversation",
    },
  }),
});
assertEqual("execution: forged data fields rejected", forgedDataOutcome.kind, "completed");
if (forgedDataOutcome.kind === "completed") {
  assertEqual(
    "execution: forged data maps to invalid result",
    forgedDataOutcome.result.errorCode,
    CONVERSATION_CORE_TOOL_EXECUTOR_ERROR_CODES.handlerInvalidResult
  );
}

assertEqual(
  "timeout-config: default",
  resolveConversationCoreToolTimeoutMs(undefined),
  CONVERSATION_CORE_TOOL_DEFAULT_TIMEOUT_MS
);
assertEqual(
  "timeout-config: invalid uses default",
  resolveConversationCoreToolTimeoutMs(-1),
  CONVERSATION_CORE_TOOL_DEFAULT_TIMEOUT_MS
);
assertEqual(
  "timeout-config: over max uses default",
  resolveConversationCoreToolTimeoutMs(CONVERSATION_CORE_TOOL_MAX_TIMEOUT_MS + 1),
  CONVERSATION_CORE_TOOL_DEFAULT_TIMEOUT_MS
);
assertEqual(
  "timeout-config: below min uses default",
  resolveConversationCoreToolTimeoutMs(CONVERSATION_CORE_TOOL_MIN_TIMEOUT_MS - 1),
  CONVERSATION_CORE_TOOL_DEFAULT_TIMEOUT_MS
);
assertEqual(
  "timeout-config: valid value preserved",
  resolveConversationCoreToolTimeoutMs(1500),
  1500
);

let unboundedScheduleUsed = false;
await executeConversationCoreTool(
  executorInput(validMarketplaceRequest({ requestId: "tool-req-timeout-default" }), {
    timeoutMs: Number.NaN,
  }),
  {
    registry: registryWithMarketplaceHandler(() => okMarketplaceOutput()),
    scheduleTimeout(callback, ms) {
      unboundedScheduleUsed = true;
      assertEqual(
        "timeout-config: invalid timeout still schedules bounded default",
        ms,
        CONVERSATION_CORE_TOOL_DEFAULT_TIMEOUT_MS
      );
      callback();
      return { cancel() {} };
    },
  }
);
assertTruthy("timeout-config: invalid timeout still uses scheduler", unboundedScheduleUsed);

// ---------- Vehicle adapter factory integration (03D2B) ----------

function adapterTestRecord(id: string): MarketplaceCarRecord {
  return {
    id,
    title: "Honda City",
    brand: "Honda",
    model: "City",
    year: 2020,
    price: 450000,
    type: "used",
    condition: "good",
    mileage: 50000,
    fuelType: "gasoline",
    images: ["https://example.com/a.jpg"],
    description: "test",
    ownerId: "owner-1",
    ownerName: "Dealer",
    ownerPhone: "0800000000",
    isSold: false,
    listingStatus: "published",
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

function adapterTestInventoryRepository(
  published: MarketplaceCarRecord[] = [adapterTestRecord("adapter-listing-1")]
): InventoryRepository {
  const byId = Object.fromEntries(published.map((record) => [record.id, record]));
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

const adapterConversationId = "conv-tool-exec-adapters";
const adapterVehicleRegistry = createConversationCoreVehicleToolRegistry({
  inventoryRepository: adapterTestInventoryRepository(),
  trustedContextProvider: {
    getContext(conversationId) {
      return conversationId === adapterConversationId
        ? {
            conversationId: adapterConversationId,
            allowedListingIds: ["adapter-listing-1"],
          }
        : null;
    },
  },
  scoredMarketplaceSearch: (): VehicleDiscoveryResult => ({
    criteria: { isDiscovery: true },
    exactMatches: [
      {
        car: {
          id: "adapter-listing-1",
          title: "Honda City",
          brand: "Honda",
          model: "City",
          year: 2020,
          price: 450000,
          mileage: 50000,
          listingStatus: "published",
        },
        listingId: "adapter-listing-1",
        score: 1,
        reasons: ["test"],
        isExactMatch: true,
      },
    ],
    nearAlternatives: [],
    blockingConstraints: [],
    summaryText: "",
    carCards: [],
    allCarCards: [],
    hasMoreCars: false,
    isRelaxed: false,
  }),
});
assertTruthy("adapter-integration: factory registry created", adapterVehicleRegistry);

const adapterSearchRequest = validMarketplaceRequest({
  requestId: "tool-req-adapter-search",
  conversationId: adapterConversationId,
});
const adapterSearchOutcome = await executeConversationCoreTool(
  executorInput(adapterSearchRequest, {
    trustedToolAllowlist: ["marketplace.search", "vehicle.resolveSelection"],
  }),
  { registry: adapterVehicleRegistry! }
);
assertEqual("adapter-integration: marketplace search completes", adapterSearchOutcome.kind, "completed");
if (adapterSearchOutcome.kind === "completed") {
  assertEqual(
    "adapter-integration: marketplace search provenance",
    adapterSearchOutcome.result.provenance,
    "marketplace-search"
  );
  assertEqual(
    "adapter-integration: marketplace search listing ids",
    adapterSearchOutcome.result.status === "ok"
      ? (adapterSearchOutcome.result.data as MarketplaceSearchToolData).listingIds
      : null,
    ["adapter-listing-1"]
  );
}

const adapterResolveRequest: ToolRequest = {
  toolName: "vehicle.resolveSelection",
  requestId: "tool-req-adapter-resolve",
  conversationId: adapterConversationId,
  input: { listingId: "adapter-listing-1" },
};
const adapterResolveOutcome = await executeConversationCoreTool(
  {
    rawRequest: adapterResolveRequest,
    trustedBinding: trustedBindingFor(adapterResolveRequest),
    trustedToolAllowlist: ["marketplace.search", "vehicle.resolveSelection"],
  },
  { registry: adapterVehicleRegistry! }
);
if (adapterResolveOutcome.kind === "completed" && adapterResolveOutcome.result.status === "ok") {
  assertEqual(
    "adapter-integration: trusted resolve data",
    adapterResolveOutcome.result.data,
    { listingId: "adapter-listing-1", resolved: true }
  );
}

const adapterMissingContextRequest: ToolRequest = {
  toolName: "vehicle.resolveSelection",
  requestId: "tool-req-adapter-missing-context",
  conversationId: "conv-tool-exec-other-room",
  input: { listingId: "adapter-listing-1" },
};
const adapterMissingContextOutcome = await executeConversationCoreTool(
  {
    rawRequest: adapterMissingContextRequest,
    trustedBinding: trustedBindingFor(adapterMissingContextRequest),
    trustedToolAllowlist: ["vehicle.resolveSelection"],
  },
  { registry: adapterVehicleRegistry! }
);
if (adapterMissingContextOutcome.kind === "completed") {
  assertEqual(
    "adapter-integration: missing context rejection",
    adapterMissingContextOutcome.result.errorCode,
    VEHICLE_RESOLVE_SELECTION_ADAPTER_ERROR_CODES.missingConversationContext
  );
}

const adapterCrossRoomRequest: ToolRequest = {
  toolName: "vehicle.resolveSelection",
  requestId: "tool-req-adapter-cross-room",
  conversationId: adapterConversationId,
  input: { listingId: "adapter-listing-2" },
};
const adapterCrossRoomOutcome = await executeConversationCoreTool(
  {
    rawRequest: adapterCrossRoomRequest,
    trustedBinding: trustedBindingFor(adapterCrossRoomRequest),
    trustedToolAllowlist: ["vehicle.resolveSelection"],
  },
  { registry: adapterVehicleRegistry! }
);
if (adapterCrossRoomOutcome.kind === "completed") {
  assertEqual(
    "adapter-integration: cross-room rejection",
    adapterCrossRoomOutcome.result.errorCode,
    VEHICLE_RESOLVE_SELECTION_ADAPTER_ERROR_CODES.listingNotInTrustedSet
  );
}

const adapterTimeoutOutcome = await executeConversationCoreTool(
  executorInput(
    validMarketplaceRequest({
      requestId: "tool-req-adapter-timeout",
      conversationId: adapterConversationId,
    }),
    { timeoutMs: 1 }
  ),
  {
    registry: createConversationCoreToolRegistry([
      {
        toolName: "marketplace.search",
        handler: () =>
          new Promise<ConversationCoreToolHandlerOutput>((resolve) => {
            setTimeout(
              () =>
                resolve({
                  status: "ok",
                  data: {
                    listingIds: ["late-listing"],
                    query: "slow",
                  },
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
if (adapterTimeoutOutcome.kind === "completed") {
  assertEqual(
    "adapter-integration: handler timeout preserved",
    adapterTimeoutOutcome.result.errorCode,
    CONVERSATION_CORE_TOOL_EXECUTOR_ERROR_CODES.handlerTimeout
  );
}

// ---------- Safety and scope ----------

assertFalsy(
  "safety: empty registry has no default business handler",
  emptyRegistry.resolveHandler("marketplace.search")
);
assertEqual(
  "safety: canonical tool set exact match",
  [...PHASE1_READ_ONLY_TOOLS],
  [
    "inventory.fetch",
    "marketplace.search",
    "vehicle.resolveSelection",
    "finance.calculate",
  ]
);

const MIN_TOOL_EXECUTOR_ASSERTIONS = 109;
const EXPECTED_TOOL_EXECUTOR_ASSERTIONS = 120;

if (passCount < MIN_TOOL_EXECUTOR_ASSERTIONS) {
  console.error(
    `FAIL expected at least ${MIN_TOOL_EXECUTOR_ASSERTIONS} assertions, got ${passCount}`
  );
  process.exit(1);
}

if (passCount !== EXPECTED_TOOL_EXECUTOR_ASSERTIONS) {
  console.error(
    `FAIL expected ${EXPECTED_TOOL_EXECUTOR_ASSERTIONS} assertions, got ${passCount}`
  );
  process.exit(1);
}

console.log(`\nConversation Core tool executor tests passed (${passCount} assertions).`);
