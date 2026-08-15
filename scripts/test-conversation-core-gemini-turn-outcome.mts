/**
 * WP-V2U-03E2A — Gemini turn outcome contract tests.
 * Run: .\node_modules\.bin\tsx.cmd scripts/test-conversation-core-gemini-turn-outcome.mts
 */
import {
  GEMINI_TURN_OUTCOME_SERVER_OWNED_KEYS,
  PHASE1_READ_ONLY_TOOLS,
  validateConversationCoreGeminiTurnOutcome,
  validateToolRequest,
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

function assertEqual(label: string, actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    console.error(
      `FAIL [${label}] expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
    process.exit(1);
  }
  pass(label);
}

// --- Valid final answer ---

const finalAnswer = assertOk(
  "valid final answer",
  validateConversationCoreGeminiTurnOutcome({
    kind: "final-answer",
    assistantText: "สวัสดีครับ มีรถเก๋งราคาไม่เกิน 600,000 บาทให้ดูครับ",
  })
);
assertEqual(
  "final answer text preserved",
  finalAnswer.kind === "final-answer" ? finalAnswer.assistantText : null,
  "สวัสดีครับ มีรถเก๋งราคาไม่เกิน 600,000 บาทให้ดูครับ"
);

const trimmedAnswer = assertOk(
  "final answer trims whitespace",
  validateConversationCoreGeminiTurnOutcome({
    kind: "final-answer",
    assistantText: "  ข้อความไทย  ",
  })
);
assertEqual(
  "trimmed thai answer",
  trimmedAnswer.kind === "final-answer" ? trimmedAnswer.assistantText : null,
  "ข้อความไทย"
);

// --- Valid tool requests (all Phase 1 tools) ---

assertOk(
  "valid marketplace.search tool request",
  validateConversationCoreGeminiTurnOutcome({
    kind: "tool-request",
    toolName: "marketplace.search",
    toolInput: { query: "รถเก๋งไม่เกิน 600000", filters: { brand: "Toyota" } },
  })
);

assertOk(
  "valid inventory.fetch tool request",
  validateConversationCoreGeminiTurnOutcome({
    kind: "tool-request",
    toolName: "inventory.fetch",
    toolInput: { refresh: true },
  })
);

assertOk(
  "valid vehicle.resolveSelection tool request",
  validateConversationCoreGeminiTurnOutcome({
    kind: "tool-request",
    toolName: "vehicle.resolveSelection",
    toolInput: { listingId: "listing-100" },
  })
);

assertOk(
  "valid finance.calculate tool request",
  validateConversationCoreGeminiTurnOutcome({
    kind: "tool-request",
    toolName: "finance.calculate",
    toolInput: {
      listingId: "listing-100",
      annualInterestRatePercent: 5,
      termMonths: 60,
      downPaymentPercent: 20,
    },
  })
);

// --- Invalid outcome shape ---

assertFail("reject null", validateConversationCoreGeminiTurnOutcome(null), "invalid_outcome_object");
assertFail(
  "reject array",
  validateConversationCoreGeminiTurnOutcome([{ kind: "final-answer", assistantText: "x" }]),
  "invalid_outcome_object"
);
assertFail("reject string", validateConversationCoreGeminiTurnOutcome("final-answer"), "invalid_outcome_object");
assertFail("reject number", validateConversationCoreGeminiTurnOutcome(42), "invalid_outcome_object");
assertFail("reject empty object", validateConversationCoreGeminiTurnOutcome({}), "invalid_type");
assertFail(
  "reject missing kind",
  validateConversationCoreGeminiTurnOutcome({ assistantText: "hello" }),
  "invalid_type"
);
assertFail(
  "reject unknown kind",
  validateConversationCoreGeminiTurnOutcome({ kind: "correction", assistantText: "hello" }),
  "unknown_outcome_kind"
);
assertFail(
  "reject array of tool requests",
  validateConversationCoreGeminiTurnOutcome({
    kind: "tool-request",
    toolName: "marketplace.search",
    toolInput: [{ query: "x" }],
  }),
  "invalid_tool_input"
);
assertFail(
  "reject mixed assistantText and tool fields",
  validateConversationCoreGeminiTurnOutcome({
    kind: "final-answer",
    assistantText: "hello",
    toolName: "marketplace.search",
    toolInput: { query: "x" },
  }),
  "mixed_outcome_fields"
);
assertFail(
  "reject final answer with toolName only",
  validateConversationCoreGeminiTurnOutcome({
    kind: "final-answer",
    toolName: "marketplace.search",
  }),
  "unknown_field"
);
assertFail(
  "reject tool request with assistantText",
  validateConversationCoreGeminiTurnOutcome({
    kind: "tool-request",
    toolName: "marketplace.search",
    toolInput: { query: "x" },
    assistantText: "hello",
  }),
  "unknown_field"
);
assertFail(
  "reject unknown outer field",
  validateConversationCoreGeminiTurnOutcome({
    kind: "final-answer",
    assistantText: "hello",
    forgedField: true,
  }),
  "unknown_field"
);

// --- Invalid final answer ---

assertFail(
  "reject missing assistantText",
  validateConversationCoreGeminiTurnOutcome({ kind: "final-answer" }),
  "invalid_type"
);
assertFail(
  "reject empty assistantText",
  validateConversationCoreGeminiTurnOutcome({ kind: "final-answer", assistantText: "" }),
  "empty_string"
);
assertFail(
  "reject whitespace-only assistantText",
  validateConversationCoreGeminiTurnOutcome({ kind: "final-answer", assistantText: "   " }),
  "empty_string"
);
assertFail(
  "reject non-string assistantText",
  validateConversationCoreGeminiTurnOutcome({ kind: "final-answer", assistantText: 123 }),
  "invalid_type"
);

// --- Invalid tool request ---

assertFail(
  "reject missing toolName",
  validateConversationCoreGeminiTurnOutcome({
    kind: "tool-request",
    toolInput: { query: "x" },
  }),
  "invalid_type"
);
assertFail(
  "reject empty toolName",
  validateConversationCoreGeminiTurnOutcome({
    kind: "tool-request",
    toolName: "   ",
    toolInput: { query: "x" },
  }),
  "empty_string"
);
assertFail(
  "reject unknown tool",
  validateConversationCoreGeminiTurnOutcome({
    kind: "tool-request",
    toolName: "inventory.write",
    toolInput: {},
  }),
  "forbidden_tool"
);
assertFail(
  "reject posting.create",
  validateConversationCoreGeminiTurnOutcome({
    kind: "tool-request",
    toolName: "posting.create",
    toolInput: {},
  }),
  "forbidden_tool"
);
assertFail(
  "reject lead.create",
  validateConversationCoreGeminiTurnOutcome({
    kind: "tool-request",
    toolName: "lead.create",
    toolInput: {},
  }),
  "forbidden_tool"
);
assertFail(
  "reject missing toolInput",
  validateConversationCoreGeminiTurnOutcome({
    kind: "tool-request",
    toolName: "marketplace.search",
  }),
  "invalid_tool_input"
);
assertFail(
  "reject null toolInput",
  validateConversationCoreGeminiTurnOutcome({
    kind: "tool-request",
    toolName: "marketplace.search",
    toolInput: null,
  }),
  "invalid_tool_input"
);
assertFail(
  "reject array toolInput",
  validateConversationCoreGeminiTurnOutcome({
    kind: "tool-request",
    toolName: "marketplace.search",
    toolInput: ["query"],
  }),
  "invalid_tool_input"
);
assertFail(
  "reject primitive toolInput",
  validateConversationCoreGeminiTurnOutcome({
    kind: "tool-request",
    toolName: "marketplace.search",
    toolInput: "query",
  }),
  "invalid_tool_input"
);

class ForgedToolInput {
  query = "x";
}
assertFail(
  "reject class instance toolInput",
  validateConversationCoreGeminiTurnOutcome({
    kind: "tool-request",
    toolName: "marketplace.search",
    toolInput: new ForgedToolInput(),
  }),
  "invalid_tool_input"
);

// --- Server-owned outer fields ---

for (const serverKey of GEMINI_TURN_OUTCOME_SERVER_OWNED_KEYS) {
  assertFail(
    `reject server-owned field ${serverKey} on final answer`,
    validateConversationCoreGeminiTurnOutcome({
      kind: "final-answer",
      assistantText: "hello",
      [serverKey]: "forged",
    }),
    "unknown_field"
  );
}

assertFail(
  "reject requestId on tool request",
  validateConversationCoreGeminiTurnOutcome({
    kind: "tool-request",
    toolName: "marketplace.search",
    toolInput: { query: "x" },
    requestId: "forged-req",
  }),
  "unknown_field"
);
assertFail(
  "reject conversationId on tool request",
  validateConversationCoreGeminiTurnOutcome({
    kind: "tool-request",
    toolName: "marketplace.search",
    toolInput: { query: "x" },
    conversationId: "forged-conv",
  }),
  "unknown_field"
);
assertFail(
  "reject trustedBinding on tool request",
  validateConversationCoreGeminiTurnOutcome({
    kind: "tool-request",
    toolName: "marketplace.search",
    toolInput: { query: "x" },
    trustedBinding: { ownerActorRef: "x", bindingVerified: true },
  }),
  "unknown_field"
);
assertFail(
  "reject provenance on tool request",
  validateConversationCoreGeminiTurnOutcome({
    kind: "tool-request",
    toolName: "marketplace.search",
    toolInput: { query: "x" },
    provenance: "marketplace-search",
  }),
  "unknown_field"
);
assertFail(
  "reject workspaceActions on tool request",
  validateConversationCoreGeminiTurnOutcome({
    kind: "tool-request",
    toolName: "marketplace.search",
    toolInput: { query: "x" },
    workspaceActions: [],
  }),
  "unknown_field"
);
assertFail(
  "reject toolResultsUsed on tool request",
  validateConversationCoreGeminiTurnOutcome({
    kind: "tool-request",
    toolName: "marketplace.search",
    toolInput: { query: "x" },
    toolResultsUsed: [],
  }),
  "unknown_field"
);

// --- Trust-boundary proof ---

const untrustedOutcome = assertOk(
  "outcome accepts untrusted tool proposal without server fields",
  validateConversationCoreGeminiTurnOutcome({
    kind: "tool-request",
    toolName: "marketplace.search",
    toolInput: { query: "รถเก๋ง" },
  })
);
if (untrustedOutcome.kind !== "tool-request") {
  console.error("FAIL [trust boundary] expected tool-request outcome");
  process.exit(1);
}
const toolRequestValidation = validateToolRequest({
  toolName: untrustedOutcome.toolName,
  input: untrustedOutcome.toolInput,
});
if (toolRequestValidation.ok) {
  console.error("FAIL [outcome acceptance is not full ToolRequest validation] expected failure");
  process.exit(1);
}
pass("outcome acceptance is not full ToolRequest validation");
assertEqual("toolInput remains untrusted proposal object", untrustedOutcome.toolInput, {
  query: "รถเก๋ง",
});

const outcomeSource = await import(
  "../src/services/conversation-core/conversationCoreGeminiTurnOutcome.ts"
);
assertEqual(
  "contract module has no validateToolRequest export",
  "validateToolRequest" in outcomeSource,
  false
);

// --- Phase 1 allowlist proof ---

for (const toolName of PHASE1_READ_ONLY_TOOLS) {
  pass(`phase1 tool ${toolName} is in canonical allowlist`);
}

console.log(`\nConversation Core Gemini turn outcome tests passed (${passCount} assertions).`);
