/**
 * WP-V2U-02 / R1 — Conversation Core contract validation tests.
 * Run: .\node_modules\.bin\tsx.cmd scripts/test-conversation-core-contracts.mts
 */
import {
  CONVERSATION_CORE_POLICY_VERSION,
  parseTrustedToolResults,
  validateConversationCoreExecutionContext,
  validateConversationCoreGeminiTurnOutcome,
  validateConversationCoreResult,
  validateConversationTurnRequest,
  validateToolRequest,
  validateToolResult,
  validateTrustedVehicleContext,
  validateWorkspaceAction,
  type ToolResult,
} from "../src/services/conversation-core/index";

let passCount = 0;

function pass(label: string): void {
  passCount += 1;
  console.log(`PASS: ${label}`);
}

function assertOk<T>(
  label: string,
  result: { ok: true; value: T } | { ok: false; issues: { code: string }[] }
): T {
  if (result.ok === false) {
    console.error(`FAIL [${label}]`, result.issues);
    process.exit(1);
  }
  pass(label);
  return result.value;
}

function assertFail(
  label: string,
  result: { ok: boolean; issues?: { code: string }[] },
  expectedCode?: string
): void {
  if (result.ok) {
    console.error(`FAIL [${label}] expected validation failure`);
    process.exit(1);
  }
  if (expectedCode) {
    const codes = (result.issues ?? []).map((item) => item.code);
    if (!codes.includes(expectedCode)) {
      console.error(
        `FAIL [${label}] expected code ${expectedCode}, got ${codes.join(",")}`,
        result.issues
      );
      process.exit(1);
    }
  }
  pass(label);
}

const CONVERSATION_ID = "conv-test-001";
const OTHER_CONVERSATION_ID = "conv-test-002";
const MESSAGE_ID = "msg-user-001";
const TOOL_REQUEST_ID = "tool-req-001";
const OPTIONAL_TOOL_REQUEST_ID = "tool-req-optional-001";

function validTurnRequest(overrides: Record<string, unknown> = {}) {
  return {
    conversationId: CONVERSATION_ID,
    messageId: MESSAGE_ID,
    userMessage: "อยากได้รถเก๋งราคาไม่เกิน 600000",
    history: [{ role: "user", content: "สวัสดีครับ" }],
    expertMode: "BUYING",
    locale: "th-TH",
    selectedVehicleRef: { listingId: "listing-100" },
    attachedImageCount: 1,
    ...overrides,
  };
}

function validExecutionContext(overrides: Record<string, unknown> = {}) {
  return {
    conversationId: CONVERSATION_ID,
    actorScope: { kind: "authenticated", actorRef: "actor-hash-1", role: "client" },
    conversationOwnership: { ownerActorRef: "actor-hash-1", bindingVerified: true },
    featureFlags: {
      coreEnabled: true,
      geminiEnabled: true,
      toolsEnabled: true,
      workspaceActionsEnabled: true,
    },
    toolAllowlist: ["inventory.fetch", "marketplace.search"],
    receivedAtMs: 1_700_000_000_000,
    policyVersion: CONVERSATION_CORE_POLICY_VERSION,
    correlationId: "corr-001",
    ...overrides,
  };
}

function validTrustedVehicle() {
  return {
    listingId: "listing-100",
    provenance: "inventory-api",
    selectedAtConversationId: CONVERSATION_ID,
    snapshotVersion: "snap-v1",
    observedAtMs: 1_700_000_000_000,
    verifiedFields: {
      brand: "Toyota",
      model: "Yaris",
      year: 2020,
      price: 420000,
      mileage: 35000,
      transmission: "auto",
      fuelType: "gasoline",
      stockStatus: "available",
    },
    missingDataBehavior: "omit",
  };
}

function validMarketplaceToolRequest() {
  return {
    toolName: "marketplace.search",
    requestId: TOOL_REQUEST_ID,
    conversationId: CONVERSATION_ID,
    input: { query: "รถเก๋งไม่เกิน 600000" },
  };
}

function validFinanceToolRequest(overrides: Record<string, unknown> = {}) {
  const input = {
    listingId: "listing-100",
    annualInterestRatePercent: 5,
    termMonths: 60,
    downPaymentPercent: 20,
    ...(overrides.input as Record<string, unknown> | undefined),
  };
  return {
    toolName: "finance.calculate",
    requestId: "fin-req-1",
    conversationId: CONVERSATION_ID,
    input,
    ...overrides,
  };
}

function validFinanceToolResult(): ToolResult {
  return {
    requestId: "fin-req-1",
    conversationId: CONVERSATION_ID,
    toolName: "finance.calculate",
    status: "ok",
    provenance: "finance-calculator",
    data: {
      listingId: "listing-100",
      vehiclePrice: 500_000,
      priceSource: "inventory",
      calculationMode: "listing-bound",
      downPaymentBaht: 100_000,
      downPaymentPercent: 20,
      loanAmount: 400_000,
      annualInterestRatePercent: 5,
      interestMethod: "flat",
      termMonths: 60,
      totalInterest: 100_000,
      monthlyPayment: 8_333,
      totalPayable: 500_000,
      currency: "THB",
      isEstimate: true,
      quotationStatus: "not-quotation",
      vatStatus: "not-calculated",
      additionalChargesStatus: "not-calculated",
    },
  };
}

function validMarketplaceToolResult(): ToolResult {
  return {
    requestId: TOOL_REQUEST_ID,
    conversationId: CONVERSATION_ID,
    toolName: "marketplace.search",
    status: "ok",
    provenance: "marketplace-search",
    data: {
      listingIds: ["listing-100", "listing-101"],
      query: "รถเก๋งไม่เกิน 600000",
    },
  };
}

function validWorkspaceAction() {
  return {
    actionType: "show-vehicle-results",
    conversationId: CONVERSATION_ID,
    moduleType: "vehicle-results",
    payloadVersion: "1",
    payload: { listingIds: ["listing-100", "listing-101"] },
    provenance: {
      toolRequestId: TOOL_REQUEST_ID,
      toolResultProvenance: "marketplace-search",
    },
    renderBehavior: "replace",
  };
}

function toolResultMap(...results: ToolResult[]) {
  return new Map(results.map((item) => [item.requestId, item]));
}

function validCoreResult() {
  return {
    conversationId: CONVERSATION_ID,
    messageId: "msg-assistant-001",
    assistantText: "มีรถที่ตรงเงื่อนไข 2 คันครับ",
    groundedFactRefs: [
      { kind: "tool-result", id: TOOL_REQUEST_ID },
      { kind: "listing", id: "listing-100" },
    ],
    workspaceActions: [validWorkspaceAction()],
    safetyOutcome: "pass",
    validatorOutcome: "pass",
    correctionStatus: "none",
    providerMetadata: { providerId: "conversation-core-stub", modelFamily: "gemini" },
    toolResultsUsed: [
      {
        requestId: TOOL_REQUEST_ID,
        toolName: "marketplace.search",
        status: "ok",
        provenance: "marketplace-search",
      },
    ],
  };
}

function rawToolResults(...items: unknown[]) {
  return items;
}

// --- Positive cases ---
assertOk("valid ConversationTurnRequest", validateConversationTurnRequest(validTurnRequest()));
assertOk(
  "valid ConversationCoreExecutionContext",
  validateConversationCoreExecutionContext(validExecutionContext())
);
assertOk(
  "valid TrustedVehicleContext",
  validateTrustedVehicleContext(validTrustedVehicle(), CONVERSATION_ID)
);
assertOk("valid ToolRequest", validateToolRequest(validMarketplaceToolRequest()));
assertOk(
  "valid ToolResult",
  validateToolResult(validMarketplaceToolResult(), {
    requestId: TOOL_REQUEST_ID,
    conversationId: CONVERSATION_ID,
    toolName: "marketplace.search",
  })
);
assertOk(
  "valid WorkspaceAction",
  validateWorkspaceAction(validWorkspaceAction(), {
    expectedConversationId: CONVERSATION_ID,
    trustedToolResults: toolResultMap(validMarketplaceToolResult()),
  })
);

const parsedToolResults = assertOk(
  "parseTrustedToolResults",
  parseTrustedToolResults([validMarketplaceToolResult()])
);
assertOk(
  "valid ConversationCoreResult grounded",
  validateConversationCoreResult(validCoreResult(), {
    expectedConversationId: CONVERSATION_ID,
    expectedMessageId: "msg-assistant-001",
    toolResults: rawToolResults(validMarketplaceToolResult()),
  })
);

assertOk(
  "anonymous opaque session actor binding accepted",
  validateConversationCoreExecutionContext({
    conversationId: CONVERSATION_ID,
    actorScope: { kind: "anonymous", actorRef: "session-actor-1" },
    conversationOwnership: { ownerActorRef: "session-actor-1", bindingVerified: true },
    featureFlags: {
      coreEnabled: false,
      geminiEnabled: false,
      toolsEnabled: false,
      workspaceActionsEnabled: false,
    },
    toolAllowlist: [],
    receivedAtMs: 1_700_000_000_000,
    policyVersion: CONVERSATION_CORE_POLICY_VERSION,
  })
);

assertOk(
  "required tool failure with honest fallback accepted",
  validateConversationCoreResult(
    {
      ...validCoreResult(),
      workspaceActions: [],
      groundedFactRefs: [],
      toolResultsUsed: [],
      errorState: {
        code: "tool_error",
        fallbackPath: "honest-unavailable",
        message: "ค้นหาไม่สำเร็จชั่วคราว",
      },
    },
    {
      expectedConversationId: CONVERSATION_ID,
      expectedMessageId: "msg-assistant-001",
      toolResults: rawToolResults({
        ...validMarketplaceToolResult(),
        status: "error",
        errorCode: "inventory_unavailable",
        data: undefined,
      }),
      requiredToolRequestIds: [TOOL_REQUEST_ID],
    }
  )
);

const optionalFailedRaw = rawToolResults(
  validMarketplaceToolResult(),
  {
    requestId: OPTIONAL_TOOL_REQUEST_ID,
    conversationId: CONVERSATION_ID,
    toolName: "finance.calculate",
    status: "error",
    errorCode: "finance_unavailable",
    provenance: "finance-calculator",
    fallbackUsed: true,
  }
);
assertOk(
  "optional unrelated tool failure does not invalidate grounded success",
  validateConversationCoreResult(validCoreResult(), {
    expectedConversationId: CONVERSATION_ID,
    expectedMessageId: "msg-assistant-001",
    toolResults: optionalFailedRaw,
    requiredToolRequestIds: [TOOL_REQUEST_ID],
  })
);

// --- Primitive / strict type rejection ---
assertFail(
  "numeric conversation id rejected",
  validateConversationTurnRequest(validTurnRequest({ conversationId: 123 })),
  "invalid_type"
);
assertFail(
  "object user message rejected",
  validateConversationTurnRequest(validTurnRequest({ userMessage: { text: "hello" } })),
  "invalid_type"
);
assertFail(
  "object provenance rejected on trusted vehicle",
  validateTrustedVehicleContext(
    { ...validTrustedVehicle(), provenance: { source: "inventory-api" } },
    CONVERSATION_ID
  ),
  "invalid_type"
);
assertFail(
  "decimal year rejected",
  validateTrustedVehicleContext(
    {
      ...validTrustedVehicle(),
      verifiedFields: { brand: "Toyota", year: 2020.5 },
    },
    CONVERSATION_ID
  ),
  "invalid_integer"
);
assertFail(
  "NaN finance value rejected",
  validateToolRequest(
    validFinanceToolRequest({
      input: {
        listingId: "listing-100",
        annualInterestRatePercent: 5,
        termMonths: 60,
        downPayment: Number.NaN,
      },
    })
  ),
  "invalid_number"
);
assertFail(
  "Infinity timestamp rejected",
  validateConversationCoreExecutionContext(
    validExecutionContext({ receivedAtMs: Number.POSITIVE_INFINITY })
  ),
  "invalid_number"
);

// --- Nested unknown fields ---
assertFail(
  "history nested unknown field rejected",
  validateConversationTurnRequest(
    validTurnRequest({ history: [{ role: "user", content: "hi", rendererId: "x" }] })
  ),
  "unknown_field"
);
assertFail(
  "actorScope nested unknown field rejected",
  validateConversationCoreExecutionContext(
    validExecutionContext({ actorScope: { kind: "authenticated", actorRef: "a", isAdmin: true } })
  ),
  "unknown_field"
);
assertFail(
  "verifiedFields sellerPhone rejected",
  validateTrustedVehicleContext(
    {
      ...validTrustedVehicle(),
      verifiedFields: { brand: "Toyota", sellerPhone: "0812345678" },
    },
    CONVERSATION_ID
  ),
  "unknown_field"
);
assertFail(
  "tool input writePermission rejected",
  validateToolRequest({
    toolName: "marketplace.search",
    requestId: "x",
    conversationId: CONVERSATION_ID,
    input: { query: "suv", writePermission: true },
  }),
  "unknown_field"
);
assertFail(
  "tool result data secret rejected",
  validateToolResult({
    ...validMarketplaceToolResult(),
    data: {
      listingIds: ["listing-100"],
      query: "suv",
      secret: "token",
    },
  }),
  "unknown_field"
);
assertFail(
  "workspace payload rendererId rejected",
  validateWorkspaceAction(
    {
      ...validWorkspaceAction(),
      payload: { listingIds: ["listing-100"], rendererId: "Custom" },
    },
    {
      expectedConversationId: CONVERSATION_ID,
      trustedToolResults: toolResultMap(validMarketplaceToolResult()),
    }
  ),
  "unknown_field"
);
assertFail(
  "errorState debugToken rejected",
  validateConversationCoreResult(
    {
      ...validCoreResult(),
      errorState: {
        code: "tool_error",
        fallbackPath: "honest-unavailable",
        debugToken: "secret",
      },
    },
    {
      expectedConversationId: CONVERSATION_ID,
      expectedMessageId: "msg-assistant-001",
      toolResults: rawToolResults(validMarketplaceToolResult()),
      requiredToolRequestIds: [TOOL_REQUEST_ID],
    }
  ),
  "unknown_field"
);

// --- Server authority / flags ---
assertFail(
  "client cannot send feature flags",
  validateConversationTurnRequest(validTurnRequest({ featureFlags: { coreEnabled: true } })),
  "client_forbidden_field"
);
assertFail(
  "execution context arbitrary tool rejected",
  validateConversationCoreExecutionContext(
    validExecutionContext({ toolAllowlist: ["lead.create"] })
  ),
  "forbidden_tool"
);
assertFail(
  "gemini enabled without core rejected",
  validateConversationCoreExecutionContext(
    validExecutionContext({
      featureFlags: {
        coreEnabled: false,
        geminiEnabled: true,
        toolsEnabled: false,
        workspaceActionsEnabled: false,
      },
      toolAllowlist: [],
    })
  ),
  "invalid_flag_combination"
);
assertFail(
  "tools enabled with empty allowlist rejected",
  validateConversationCoreExecutionContext(
    validExecutionContext({
      featureFlags: {
        coreEnabled: true,
        geminiEnabled: false,
        toolsEnabled: true,
        workspaceActionsEnabled: false,
      },
      toolAllowlist: [],
    })
  ),
  "empty_tool_allowlist"
);
assertFail(
  "ownership binding mismatch rejected",
  validateConversationCoreExecutionContext(
    validExecutionContext({
      actorScope: { kind: "authenticated", actorRef: "actor-a", role: "client" },
      conversationOwnership: { ownerActorRef: "actor-b", bindingVerified: true },
    })
  ),
  "ownership_mismatch"
);

// --- Tool contracts ---
assertFail(
  "inventory fetch with search query rejected",
  validateToolRequest({
    toolName: "inventory.fetch",
    requestId: "x",
    conversationId: CONVERSATION_ID,
    input: { query: "suv" },
  }),
  "unknown_field"
);
assertFail(
  "tool provenance mismatch rejected",
  validateToolResult({
    ...validMarketplaceToolResult(),
    provenance: "inventory-api",
  }),
  "provenance_tool_mismatch"
);
assertFail(
  "error tool result carrying data rejected",
  validateToolResult({
    ...validMarketplaceToolResult(),
    status: "error",
    errorCode: "search_failed",
    data: {
      listingIds: ["listing-100"],
      query: "suv",
    },
  }),
  "failed_tool_has_data"
);
assertFail(
  "fallback without fallbackUsed rejected",
  validateToolResult({
    ...validMarketplaceToolResult(),
    status: "fallback",
    errorCode: "search_timeout",
    data: undefined,
  }),
  "missing_fallback_flag"
);
assertFail(
  "duplicate listing ids rejected",
  validateToolResult({
    ...validMarketplaceToolResult(),
    data: {
      listingIds: ["listing-100", "listing-100"],
      query: "suv",
    },
  }),
  "duplicate_listing_id"
);

// --- Finance tool contracts ---
assertOk("valid finance ToolRequest", validateToolRequest(validFinanceToolRequest()));
assertOk(
  "valid finance ToolResult",
  validateToolResult(validFinanceToolResult(), {
    requestId: "fin-req-1",
    conversationId: CONVERSATION_ID,
    toolName: "finance.calculate",
  })
);
assertFail(
  "finance missing annualInterestRatePercent rejected",
  validateToolRequest(
    validFinanceToolRequest({
      input: {
        listingId: "listing-100",
        termMonths: 60,
        downPaymentPercent: 20,
      },
    })
  ),
  "invalid_number"
);
assertFail(
  "finance missing termMonths rejected",
  validateToolRequest(
    validFinanceToolRequest({
      input: {
        listingId: "listing-100",
        annualInterestRatePercent: 5,
        downPaymentPercent: 20,
      },
    })
  ),
  "invalid_number"
);
assertFail(
  "finance conflicting down payment rejected",
  validateToolRequest(
    validFinanceToolRequest({
      input: {
        listingId: "listing-100",
        annualInterestRatePercent: 5,
        termMonths: 60,
        downPayment: 100_000,
        downPaymentPercent: 20,
      },
    })
  ),
  "conflicting_down_payment"
);
assertFail(
  "finance missing down payment rejected",
  validateToolRequest(
    validFinanceToolRequest({
      input: {
        listingId: "listing-100",
        annualInterestRatePercent: 5,
        termMonths: 60,
      },
    })
  ),
  "missing_down_payment"
);
assertFail(
  "finance unknown input field rejected",
  validateToolRequest(
    validFinanceToolRequest({
      input: {
        listingId: "listing-100",
        annualInterestRatePercent: 5,
        termMonths: 60,
        downPaymentPercent: 20,
        vehiclePrice: 500_000,
      },
    })
  ),
  "unknown_field"
);
assertFail(
  "finance result missing estimate metadata rejected",
  validateToolResult({
    ...validFinanceToolResult(),
    data: {
      ...validFinanceToolResult().data,
      isEstimate: false,
    },
  }),
  "invalid_type"
);
assertFail(
  "finance result unknown data field rejected",
  validateToolResult({
    ...validFinanceToolResult(),
    data: {
      ...validFinanceToolResult().data,
      vatAmount: 700,
    },
  }),
  "unknown_field"
);

// --- Workspace grounding ---
assertFail(
  "fake workspace toolRequestId rejected",
  validateWorkspaceAction(
    {
      ...validWorkspaceAction(),
      provenance: {
        toolRequestId: "missing-tool",
        toolResultProvenance: "marketplace-search",
      },
    },
    {
      expectedConversationId: CONVERSATION_ID,
      trustedToolResults: toolResultMap(validMarketplaceToolResult()),
    }
  ),
  "unknown_tool_result"
);
assertFail(
  "workspace provenance mismatch rejected",
  validateWorkspaceAction(
    {
      ...validWorkspaceAction(),
      provenance: {
        toolRequestId: TOOL_REQUEST_ID,
        toolResultProvenance: "inventory-api",
      },
    },
    {
      expectedConversationId: CONVERSATION_ID,
      trustedToolResults: toolResultMap(validMarketplaceToolResult()),
    }
  ),
  "provenance_mismatch"
);

const inventoryToolResult = assertOk(
  "parse inventory tool result",
  validateToolResult({
    requestId: "tool-req-inventory",
    conversationId: CONVERSATION_ID,
    toolName: "inventory.fetch",
    status: "ok",
    provenance: "inventory-api",
    data: { listingIds: ["listing-200"] },
  })
);
assertFail(
  "action listing grounded by tool A but cites tool B rejected",
  validateWorkspaceAction(
    {
      ...validWorkspaceAction(),
      payload: { listingIds: ["listing-200"] },
      provenance: {
        toolRequestId: TOOL_REQUEST_ID,
        toolResultProvenance: "marketplace-search",
      },
    },
    {
      expectedConversationId: CONVERSATION_ID,
      trustedToolResults: toolResultMap(validMarketplaceToolResult(), inventoryToolResult),
    }
  ),
  "ungrounded_listing_id"
);

// --- Result fail-closed ---
assertFail(
  "grounded fact referencing failed tool rejected",
  validateConversationCoreResult(
    {
      ...validCoreResult(),
      groundedFactRefs: [{ kind: "tool-result", id: TOOL_REQUEST_ID }],
      workspaceActions: [],
      toolResultsUsed: [],
    },
    {
      expectedConversationId: CONVERSATION_ID,
      expectedMessageId: "msg-assistant-001",
      toolResults: rawToolResults({
        ...validMarketplaceToolResult(),
        status: "error",
        errorCode: "inventory_unavailable",
        data: undefined,
      }),
      requiredToolRequestIds: [TOOL_REQUEST_ID],
    }
  ),
  "ungrounded_tool_result"
);
assertFail(
  "required tool failure without fallback error state rejected",
  validateConversationCoreResult(
    {
      ...validCoreResult(),
      workspaceActions: [],
      groundedFactRefs: [],
      toolResultsUsed: [],
    },
    {
      expectedConversationId: CONVERSATION_ID,
      expectedMessageId: "msg-assistant-001",
      toolResults: rawToolResults({
        ...validMarketplaceToolResult(),
        status: "error",
        errorCode: "inventory_unavailable",
        data: undefined,
      }),
      requiredToolRequestIds: [TOOL_REQUEST_ID],
    }
  ),
  "required_tool_failure"
);

// --- Legacy negative coverage retained ---
assertFail(
  "user-selection rejected as trusted business provenance",
  validateTrustedVehicleContext(
    { ...validTrustedVehicle(), provenance: "user-selection" },
    CONVERSATION_ID
  ),
  "forbidden_provenance"
);
assertFail(
  "unknown trusted vehicle top-level field rejected",
  validateTrustedVehicleContext(
    { ...validTrustedVehicle(), dealerPhone: "0812345678" },
    CONVERSATION_ID
  ),
  "unknown_field"
);
assertFail(
  "posting tool rejected",
  validateToolRequest({
    toolName: "posting.publish",
    requestId: "x",
    conversationId: CONVERSATION_ID,
    input: {},
  }),
  "forbidden_tool"
);
assertFail(
  "cross-conversation trusted vehicle rejected",
  validateTrustedVehicleContext(validTrustedVehicle(), OTHER_CONVERSATION_ID),
  "conversation_mismatch"
);
assertFail(
  "provider metadata secret rejected",
  validateConversationCoreResult(
    {
      ...validCoreResult(),
      providerMetadata: { providerId: "x", apiKey: "secret-key" },
    },
    {
      expectedConversationId: CONVERSATION_ID,
      expectedMessageId: "msg-assistant-001",
      toolResults: rawToolResults(validMarketplaceToolResult()),
    }
  ),
  "secret_field_forbidden"
);

// --- R2: anonymous ownership binding ---
assertFail(
  "anonymous without actorRef rejected",
  validateConversationCoreExecutionContext(
    validExecutionContext({
      actorScope: { kind: "anonymous" },
      conversationOwnership: { ownerActorRef: "session-actor-1", bindingVerified: true },
      featureFlags: {
        coreEnabled: false,
        geminiEnabled: false,
        toolsEnabled: false,
        workspaceActionsEnabled: false,
      },
      toolAllowlist: [],
    })
  ),
  "missing_actor_ref"
);
assertFail(
  "anonymous without ownerActorRef rejected",
  validateConversationCoreExecutionContext(
    validExecutionContext({
      actorScope: { kind: "anonymous", actorRef: "session-actor-1" },
      conversationOwnership: { bindingVerified: true },
      featureFlags: {
        coreEnabled: false,
        geminiEnabled: false,
        toolsEnabled: false,
        workspaceActionsEnabled: false,
      },
      toolAllowlist: [],
    })
  ),
  "missing_owner_actor_ref"
);
assertFail(
  "anonymous owner mismatch rejected",
  validateConversationCoreExecutionContext(
    validExecutionContext({
      actorScope: { kind: "anonymous", actorRef: "session-a" },
      conversationOwnership: { ownerActorRef: "session-b", bindingVerified: true },
      featureFlags: {
        coreEnabled: false,
        geminiEnabled: false,
        toolsEnabled: false,
        workspaceActionsEnabled: false,
      },
      toolAllowlist: [],
    })
  ),
  "ownership_mismatch"
);
assertFail(
  "anonymous privileged role rejected",
  validateConversationCoreExecutionContext(
    validExecutionContext({
      actorScope: { kind: "anonymous", actorRef: "session-actor-1", role: "admin" },
      conversationOwnership: { ownerActorRef: "session-actor-1", bindingVerified: true },
      featureFlags: {
        coreEnabled: false,
        geminiEnabled: false,
        toolsEnabled: false,
        workspaceActionsEnabled: false,
      },
      toolAllowlist: [],
    })
  ),
  "invalid_role_for_anonymous"
);

// --- R2: internal tool result parsing ---
assertFail(
  "non-array toolResults rejected",
  validateConversationCoreResult(validCoreResult(), {
    expectedConversationId: CONVERSATION_ID,
    expectedMessageId: "msg-assistant-001",
    toolResults: validMarketplaceToolResult(),
  }),
  "invalid_tool_results"
);
assertFail(
  "invalid raw toolResult in context rejected",
  validateConversationCoreResult(validCoreResult(), {
    expectedConversationId: CONVERSATION_ID,
    expectedMessageId: "msg-assistant-001",
    toolResults: rawToolResults({ toolName: "marketplace.search" }),
  }),
  "invalid_type"
);
assertFail(
  "cross-conversation toolResult in context rejected",
  validateConversationCoreResult(validCoreResult(), {
    expectedConversationId: CONVERSATION_ID,
    expectedMessageId: "msg-assistant-001",
    toolResults: rawToolResults({
      ...validMarketplaceToolResult(),
      conversationId: OTHER_CONVERSATION_ID,
    }),
  }),
  "conversation_mismatch"
);
assertFail(
  "duplicate toolResult request ids rejected",
  validateConversationCoreResult(validCoreResult(), {
    expectedConversationId: CONVERSATION_ID,
    expectedMessageId: "msg-assistant-001",
    toolResults: rawToolResults(
      validMarketplaceToolResult(),
      validMarketplaceToolResult()
    ),
  }),
  "duplicate_tool_result"
);
assertOk(
  "parseTrustedToolResults accepts unknown input",
  parseTrustedToolResults(rawToolResults(validMarketplaceToolResult()))
);

// --- R2: required tool request id validation ---
assertFail(
  "duplicate required tool ids rejected",
  validateConversationCoreResult(validCoreResult(), {
    expectedConversationId: CONVERSATION_ID,
    expectedMessageId: "msg-assistant-001",
    toolResults: rawToolResults(validMarketplaceToolResult()),
    requiredToolRequestIds: [TOOL_REQUEST_ID, TOOL_REQUEST_ID],
  }),
  "duplicate_required_tool_id"
);
assertFail(
  "invalid required tool id type rejected",
  validateConversationCoreResult(validCoreResult(), {
    expectedConversationId: CONVERSATION_ID,
    expectedMessageId: "msg-assistant-001",
    toolResults: rawToolResults(validMarketplaceToolResult()),
    requiredToolRequestIds: [123],
  }),
  "invalid_type"
);

// --- R2: assistant markdown vs raw HTML ---
assertFail(
  "assistant script tag rejected",
  validateConversationCoreResult(
    { ...validCoreResult(), assistantText: "<script>alert(1)</script>" },
    {
      expectedConversationId: CONVERSATION_ID,
      expectedMessageId: "msg-assistant-001",
      toolResults: rawToolResults(validMarketplaceToolResult()),
    }
  ),
  "markup_not_allowed"
);
assertFail(
  "assistant div tag rejected",
  validateConversationCoreResult(
    { ...validCoreResult(), assistantText: "<div>payload</div>" },
    {
      expectedConversationId: CONVERSATION_ID,
      expectedMessageId: "msg-assistant-001",
      toolResults: rawToolResults(validMarketplaceToolResult()),
    }
  ),
  "markup_not_allowed"
);
assertOk(
  "assistant markdown accepted",
  validateConversationCoreResult(
    {
      ...validCoreResult(),
      assistantText: "**ข้อความสำคัญ**\n- รายการหนึ่ง\n- รายการสอง",
    },
    {
      expectedConversationId: CONVERSATION_ID,
      expectedMessageId: "msg-assistant-001",
      toolResults: rawToolResults(validMarketplaceToolResult()),
    }
  )
);
assertOk(
  "assistant thai plain text accepted",
  validateConversationCoreResult(
    { ...validCoreResult(), assistantText: "มีรถที่ตรงเงื่อนไข 2 คันครับ" },
    {
      expectedConversationId: CONVERSATION_ID,
      expectedMessageId: "msg-assistant-001",
      toolResults: rawToolResults(validMarketplaceToolResult()),
    }
  )
);

// --- R2: audit-link consistency ---
assertFail(
  "workspace tool not in toolResultsUsed rejected",
  validateConversationCoreResult(
    {
      ...validCoreResult(),
      toolResultsUsed: [],
    },
    {
      expectedConversationId: CONVERSATION_ID,
      expectedMessageId: "msg-assistant-001",
      toolResults: rawToolResults(validMarketplaceToolResult()),
    }
  ),
  "audit_link_missing"
);
assertFail(
  "grounded tool ref missing from summary rejected",
  validateConversationCoreResult(
    {
      ...validCoreResult(),
      groundedFactRefs: [{ kind: "tool-result", id: TOOL_REQUEST_ID }],
      toolResultsUsed: [],
      workspaceActions: [],
    },
    {
      expectedConversationId: CONVERSATION_ID,
      expectedMessageId: "msg-assistant-001",
      toolResults: rawToolResults(validMarketplaceToolResult()),
    }
  ),
  "audit_link_missing"
);
assertFail(
  "listing grounded from undeclared tool summary rejected",
  validateConversationCoreResult(
    {
      ...validCoreResult(),
      groundedFactRefs: [{ kind: "listing", id: "listing-100" }],
      toolResultsUsed: [],
      workspaceActions: [],
    },
    {
      expectedConversationId: CONVERSATION_ID,
      expectedMessageId: "msg-assistant-001",
      toolResults: rawToolResults(validMarketplaceToolResult()),
    }
  ),
  "audit_link_missing"
);
assertOk(
  "audit links complete accepted",
  validateConversationCoreResult(validCoreResult(), {
    expectedConversationId: CONVERSATION_ID,
    expectedMessageId: "msg-assistant-001",
    toolResults: rawToolResults(validMarketplaceToolResult()),
  })
);

const MISSING_REQUIRED_TOOL_ID = "tool-req-missing-001";

assertFail(
  "missing required tool result without fallback rejected",
  validateConversationCoreResult(
    {
      ...validCoreResult(),
      workspaceActions: [],
      groundedFactRefs: [],
      toolResultsUsed: [
        {
          requestId: TOOL_REQUEST_ID,
          toolName: "marketplace.search",
          status: "ok",
          provenance: "marketplace-search",
        },
      ],
    },
    {
      expectedConversationId: CONVERSATION_ID,
      expectedMessageId: "msg-assistant-001",
      toolResults: rawToolResults(validMarketplaceToolResult()),
      requiredToolRequestIds: [MISSING_REQUIRED_TOOL_ID],
    }
  ),
  "required_tool_failure"
);

assertOk(
  "missing required tool result with approved fallback accepted",
  validateConversationCoreResult(
    {
      ...validCoreResult(),
      workspaceActions: [],
      groundedFactRefs: [],
      toolResultsUsed: [
        {
          requestId: TOOL_REQUEST_ID,
          toolName: "marketplace.search",
          status: "ok",
          provenance: "marketplace-search",
        },
      ],
      errorState: {
        code: "tool_unavailable",
        fallbackPath: "honest-unavailable",
      },
    },
    {
      expectedConversationId: CONVERSATION_ID,
      expectedMessageId: "msg-assistant-001",
      toolResults: rawToolResults(validMarketplaceToolResult()),
      requiredToolRequestIds: [MISSING_REQUIRED_TOOL_ID],
    }
  )
);

// --- R3: generic raw HTML closure ---
assertFail(
  "section tag rejected",
  validateConversationCoreResult(
    { ...validCoreResult(), assistantText: "<section>payload</section>" },
    {
      expectedConversationId: CONVERSATION_ID,
      expectedMessageId: "msg-assistant-001",
      toolResults: rawToolResults(validMarketplaceToolResult()),
    }
  ),
  "markup_not_allowed"
);
assertFail(
  "button tag rejected",
  validateConversationCoreResult(
    { ...validCoreResult(), assistantText: "<button>click</button>" },
    {
      expectedConversationId: CONVERSATION_ID,
      expectedMessageId: "msg-assistant-001",
      toolResults: rawToolResults(validMarketplaceToolResult()),
    }
  ),
  "markup_not_allowed"
);
assertFail(
  "table tag rejected",
  validateConversationCoreResult(
    { ...validCoreResult(), assistantText: "<table><tr><td>x</td></tr></table>" },
    {
      expectedConversationId: CONVERSATION_ID,
      expectedMessageId: "msg-assistant-001",
      toolResults: rawToolResults(validMarketplaceToolResult()),
    }
  ),
  "markup_not_allowed"
);
assertFail(
  "html comment rejected",
  validateConversationCoreResult(
    { ...validCoreResult(), assistantText: "payload <!-- comment -->" },
    {
      expectedConversationId: CONVERSATION_ID,
      expectedMessageId: "msg-assistant-001",
      toolResults: rawToolResults(validMarketplaceToolResult()),
    }
  ),
  "markup_not_allowed"
);
assertFail(
  "custom element opening tag rejected",
  validateConversationCoreResult(
    { ...validCoreResult(), assistantText: "<my-widget>payload</my-widget>" },
    {
      expectedConversationId: CONVERSATION_ID,
      expectedMessageId: "msg-assistant-001",
      toolResults: rawToolResults(validMarketplaceToolResult()),
    }
  ),
  "markup_not_allowed"
);
assertFail(
  "custom element self-closing tag rejected",
  validateConversationCoreResult(
    { ...validCoreResult(), assistantText: "before <my-widget /> after" },
    {
      expectedConversationId: CONVERSATION_ID,
      expectedMessageId: "msg-assistant-001",
      toolResults: rawToolResults(validMarketplaceToolResult()),
    }
  ),
  "markup_not_allowed"
);
assertOk(
  "markdown link accepted",
  validateConversationCoreResult(
    {
      ...validCoreResult(),
      assistantText: "ดูรายละเอียดที่ [ลิงก์นี้](https://example.com)",
    },
    {
      expectedConversationId: CONVERSATION_ID,
      expectedMessageId: "msg-assistant-001",
      toolResults: rawToolResults(validMarketplaceToolResult()),
    }
  )
);
assertOk(
  "comparison less-than accepted",
  validateConversationCoreResult(
    { ...validCoreResult(), assistantText: "ราคา 3 < 5 ล้านไม่ใช่ HTML" },
    {
      expectedConversationId: CONVERSATION_ID,
      expectedMessageId: "msg-assistant-001",
      toolResults: rawToolResults(validMarketplaceToolResult()),
    }
  )
);
assertOk(
  "comparison one less-than two accepted",
  validateConversationCoreResult(
    { ...validCoreResult(), assistantText: "1 < 2" },
    {
      expectedConversationId: CONVERSATION_ID,
      expectedMessageId: "msg-assistant-001",
      toolResults: rawToolResults(validMarketplaceToolResult()),
    }
  )
);
assertOk(
  "plain url accepted",
  validateConversationCoreResult(
    { ...validCoreResult(), assistantText: "ดูที่ https://example.com/listing-100" },
    {
      expectedConversationId: CONVERSATION_ID,
      expectedMessageId: "msg-assistant-001",
      toolResults: rawToolResults(validMarketplaceToolResult()),
    }
  )
);

// --- WP-V2U-03E2A Gemini turn outcome exports and validation ---

assertOk(
  "03E2A valid final-answer outcome",
  validateConversationCoreGeminiTurnOutcome({
    kind: "final-answer",
    assistantText: "สวัสดีครับ มีรถให้ดูครับ",
  })
);
assertOk(
  "03E2A valid tool-request outcome",
  validateConversationCoreGeminiTurnOutcome({
    kind: "tool-request",
    toolName: "marketplace.search",
    toolInput: { query: "รถเก๋ง" },
  })
);
assertFail(
  "03E2A reject unknown outer key on final answer",
  validateConversationCoreGeminiTurnOutcome({
    kind: "final-answer",
    assistantText: "hello",
    requestId: "forged",
  }),
  "unknown_field"
);
assertFail(
  "03E2A reject posting tool on outcome",
  validateConversationCoreGeminiTurnOutcome({
    kind: "tool-request",
    toolName: "posting.publish",
    toolInput: {},
  }),
  "forbidden_tool"
);
assertFail(
  "03E2A reject tool outside Phase 1 allowlist",
  validateConversationCoreGeminiTurnOutcome({
    kind: "tool-request",
    toolName: "inventory.write",
    toolInput: {},
  }),
  "forbidden_tool"
);
assertFail(
  "03E2A reject server-owned conversationId",
  validateConversationCoreGeminiTurnOutcome({
    kind: "tool-request",
    toolName: "inventory.fetch",
    toolInput: {},
    conversationId: CONVERSATION_ID,
  }),
  "unknown_field"
);
assertFail(
  "03E2A reject mixed outcome fields",
  validateConversationCoreGeminiTurnOutcome({
    kind: "final-answer",
    assistantText: "hello",
    toolName: "marketplace.search",
    toolInput: { query: "x" },
  }),
  "mixed_outcome_fields"
);

console.log(`\nConversation core contract gate: ${passCount} assertions passed.`);
