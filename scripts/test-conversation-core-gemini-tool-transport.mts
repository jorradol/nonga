/**
 * WP-V2U-03E2B2 — Gemini structured tool transport mock-only tests.
 * Run: .\node_modules\.bin\tsx.cmd scripts/test-conversation-core-gemini-tool-transport.mts
 */
import fs from "node:fs";
import { FunctionCallingConfigMode } from "@google/genai";
import {
  FINANCE_MAX_INTEREST_RATE_PERCENT,
  PHASE1_READ_ONLY_TOOLS,
  validateToolRequest,
} from "../src/services/conversation-core/index";
import {
  buildConversationCoreGeminiContents,
  createConversationCoreGeminiAdapter,
  inspectConversationCoreGeminiSdkResponse,
  type ConversationCoreGeminiToolTransportGenerateContentRequest,
  type ConversationCoreGeminiToolTransportSdkSeam,
  CONVERSATION_CORE_GEMINI_FUNCTION_DECLARATIONS,
  CONVERSATION_CORE_GEMINI_VISIBLE_INPUT_KEYS_BY_TOOL,
  buildConversationCoreGeminiFunctionDeclarations,
  generateFinalAnswerFromToolResult,
  generateStructuredInitialTurn,
  type ConversationCoreGeminiProviderFunctionCallContext,
} from "../src/server/conversation-core/index";

let passCount = 0;

function pass(label: string): void {
  passCount += 1;
  console.log(`PASS: ${label}`);
}

function assertOk<T>(
  label: string,
  result: { ok: true; value: T } | { ok: false; code?: string }
): T {
  if (result.ok === false) {
    console.error(`FAIL [${label}]`, result);
    process.exit(1);
  }
  pass(label);
  return result.value;
}

function assertFail(
  label: string,
  result: { ok: boolean; code?: string; issues?: Array<{ code: string }> },
  expectedCode?: string
): void {
  if (result.ok) {
    console.error(`FAIL [${label}] expected failure`);
    process.exit(1);
  }
  const actualCode = result.code ?? result.issues?.[0]?.code;
  if (expectedCode && actualCode !== expectedCode) {
    console.error(`FAIL [${label}] expected ${expectedCode}, got ${actualCode}`);
    process.exit(1);
  }
  pass(label);
}

function assertEqual(label: string, actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    console.error(`FAIL [${label}] expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    process.exit(1);
  }
  pass(label);
}

const MODEL = "gemini-3.5-flash";
const SYSTEM = "You are Nong'a, a helpful automotive assistant.";
const USER_MESSAGE = "ช่วยหารถเก๋งให้หน่อย";
const CONTENTS = buildConversationCoreGeminiContents([], USER_MESSAGE);
const ALL_TOOLS = [...PHASE1_READ_ONLY_TOOLS] as const;

type ScriptedResponse =
  | { type: "sdk"; value: Record<string, unknown> }
  | { type: "throw"; error: Error };

function createRecordingTransport(
  script: ScriptedResponse | readonly ScriptedResponse[]
): ConversationCoreGeminiToolTransportSdkSeam & {
  requests: ConversationCoreGeminiToolTransportGenerateContentRequest[];
  callCount: number;
} {
  const queue = Array.isArray(script) ? [...script] : [script];
  const requests: ConversationCoreGeminiToolTransportGenerateContentRequest[] = [];
  return {
    requests,
    get callCount() {
      return requests.length;
    },
    async generateContent(request) {
      requests.push(request);
      const next = queue.shift();
      if (!next) {
        throw new Error("unexpected transport call");
      }
      if (next.type === "throw") {
        throw next.error;
      }
      return next.value;
    },
  };
}

function textResponse(text: string) {
  return {
    type: "sdk" as const,
    value: {
      candidates: [{ content: { parts: [{ text }] }, finishReason: "STOP" }],
    },
  };
}

function toolPartResponse(input: {
  name: string;
  args?: Record<string, unknown>;
  id?: string;
  topLevel?: boolean;
  thought?: string;
}) {
  const call = {
    name: input.name,
    args: input.args ?? {},
    ...(input.id ? { id: input.id } : {}),
  };
  const parts: Record<string, unknown>[] = [{ functionCall: call }];
  if (input.thought) {
    parts.unshift({ thought: true, text: input.thought });
  }
  return {
    type: "sdk" as const,
    value: {
      ...(input.topLevel ? { functionCalls: [call] } : {}),
      candidates: [{ content: { parts }, finishReason: "STOP" }],
    },
  };
}

function validMarketplaceToolResult(listingIds: string[]) {
  return {
    requestId: "tool-req-001",
    conversationId: "conv-001",
    toolName: "marketplace.search",
    status: "ok",
    provenance: "marketplace-search",
    data: { listingIds, query: "รถเก๋ง" },
  };
}

function validFinanceToolResult() {
  return {
    requestId: "fin-req-1",
    conversationId: "conv-001",
    toolName: "finance.calculate",
    status: "ok",
    provenance: "finance-calculator",
    data: {
      listingId: "listing-100",
      vehiclePrice: 420000,
      priceSource: "inventory",
      calculationMode: "listing-bound",
      downPaymentBaht: 84000,
      downPaymentPercent: 20,
      loanAmount: 336000,
      annualInterestRatePercent: 5,
      interestMethod: "flat",
      termMonths: 60,
      totalInterest: 42000,
      monthlyPayment: 6300,
      totalPayable: 378000,
      currency: "THB",
      isEstimate: true,
      quotationStatus: "not-quotation",
      vatStatus: "not-calculated",
      additionalChargesStatus: "not-calculated",
    },
  };
}

// --- Declarations ---

assertEqual(
  "declarations: canonical tool count",
  CONVERSATION_CORE_GEMINI_FUNCTION_DECLARATIONS.length,
  4
);
for (const toolName of PHASE1_READ_ONLY_TOOLS) {
  const declaration = CONVERSATION_CORE_GEMINI_FUNCTION_DECLARATIONS.find(
    (item) => item.name === toolName
  );
  assertEqual(`declarations: dotted name preserved ${toolName}`, declaration?.name, toolName);
  const schema = declaration?.parametersJsonSchema as Record<string, unknown> | undefined;
  assertEqual(
    `declarations: additionalProperties false ${toolName}`,
    schema?.additionalProperties,
    false
  );
  const visibleKeys = CONVERSATION_CORE_GEMINI_VISIBLE_INPUT_KEYS_BY_TOOL[toolName];
  const schemaProps = (schema?.properties ?? {}) as Record<string, unknown>;
  assertEqual(
    `declarations: visible keys match contract ${toolName}`,
    Object.keys(schemaProps).sort(),
    [...visibleKeys].sort()
  );
}

const financeSchema = CONVERSATION_CORE_GEMINI_FUNCTION_DECLARATIONS.find(
  (item) => item.name === "finance.calculate"
)?.parametersJsonSchema as Record<string, unknown>;
assertEqual(
  "declarations: finance rate max bound",
  (financeSchema.properties as Record<string, { maximum?: number }>).annualInterestRatePercent
    .maximum,
  FINANCE_MAX_INTEREST_RATE_PERCENT
);

const financeDescription = CONVERSATION_CORE_GEMINI_FUNCTION_DECLARATIONS.find(
  (item) => item.name === "finance.calculate"
)?.description;
if (!financeDescription?.includes("exactly one")) {
  console.error("FAIL [declarations: finance XOR documented in description]");
  process.exit(1);
}
pass("declarations: finance XOR documented in description");

assertFail(
  "declarations: empty allowlist rejected",
  buildConversationCoreGeminiFunctionDeclarations([]),
  "empty_allowlist"
);
assertFail(
  "declarations: duplicate tool rejected",
  buildConversationCoreGeminiFunctionDeclarations(["marketplace.search", "marketplace.search"]),
  "duplicate_tool_name"
);
assertFail(
  "declarations: unknown tool rejected",
  buildConversationCoreGeminiFunctionDeclarations(["posting.create"]),
  "forbidden_tool"
);

const subset = assertOk(
  "declarations: subset ordering canonical",
  buildConversationCoreGeminiFunctionDeclarations(["finance.calculate", "inventory.fetch"])
);
assertEqual(
  "declarations: subset order",
  subset.map((item) => item.name),
  ["inventory.fetch", "finance.calculate"]
);

// --- Initial final answer ---

const textTransport = createRecordingTransport(textResponse("สวัสดีครับ มีรถให้ดูครับ"));
const textResult = assertOk(
  "initial: text-only final answer",
  await generateStructuredInitialTurn({
    model: MODEL,
    systemInstruction: SYSTEM,
    contents: CONTENTS,
    allowedToolNames: ALL_TOOLS,
    transport: textTransport,
  })
);
assertEqual("initial: final answer kind", textResult.outcome.kind, "final-answer");
assertEqual("initial: one provider call", textTransport.callCount, 1);

const initialConfig = textTransport.requests[0]!.config;
assertEqual(
  "initial: mode AUTO",
  initialConfig.toolConfig?.functionCallingConfig?.mode,
  FunctionCallingConfigMode.AUTO
);
assertEqual("initial: automatic function calling disabled", initialConfig.automaticFunctionCalling?.disable, true);
assertEqual(
  "initial: allowedFunctionNames match turn allowlist",
  initialConfig.toolConfig?.functionCallingConfig?.allowedFunctionNames,
  [...ALL_TOOLS]
);

// --- Tool requests for all 4 tools ---

const toolCases = [
  {
    label: "marketplace.search",
    name: "marketplace.search",
    args: { query: "รถเก๋ง" },
  },
  {
    label: "inventory.fetch",
    name: "inventory.fetch",
    args: { refresh: true },
  },
  {
    label: "vehicle.resolveSelection",
    name: "vehicle.resolveSelection",
    args: { listingId: "listing-100" },
  },
  {
    label: "finance.calculate",
    name: "finance.calculate",
    args: {
      listingId: "listing-100",
      annualInterestRatePercent: 5,
      termMonths: 60,
      downPaymentPercent: 20,
    },
  },
] as const;

for (const toolCase of toolCases) {
  const transport = createRecordingTransport(
    toolPartResponse({ name: toolCase.name, args: { ...toolCase.args } })
  );
  const result = assertOk(
    `initial: tool request ${toolCase.label}`,
    await generateStructuredInitialTurn({
      model: MODEL,
      systemInstruction: SYSTEM,
      contents: CONTENTS,
      allowedToolNames: ALL_TOOLS,
      transport,
    })
  );
  assertEqual(`initial: ${toolCase.label} kind`, result.outcome.kind, "tool-request");
  if (result.outcome.kind === "tool-request") {
    assertEqual(`initial: ${toolCase.label} toolName`, result.outcome.toolName, toolCase.name);
  }
}

// --- Dual view normalization ---

const dualViewTransport = createRecordingTransport(
  toolPartResponse({
    name: "marketplace.search",
    args: { query: "รถเก๋ง" },
    id: "call-1",
    topLevel: true,
  })
);
assertOk(
  "initial: matching dual views accepted once",
  await generateStructuredInitialTurn({
    model: MODEL,
    systemInstruction: SYSTEM,
    contents: CONTENTS,
    allowedToolNames: ALL_TOOLS,
    transport: dualViewTransport,
  })
);

const mismatchTransport = createRecordingTransport({
  type: "sdk",
  value: {
    functionCalls: [{ name: "marketplace.search", args: { query: "a" }, id: "x" }],
    candidates: [
      {
        content: {
          parts: [{ functionCall: { name: "marketplace.search", args: { query: "b" }, id: "x" } }],
        },
      },
    ],
  },
});
assertFail(
  "initial: mismatched dual views rejected",
  await generateStructuredInitialTurn({
    model: MODEL,
    systemInstruction: SYSTEM,
    contents: CONTENTS,
    allowedToolNames: ALL_TOOLS,
    transport: mismatchTransport,
  }),
  "function-call-view-mismatch"
);

// --- Initial fail-closed ---

assertFail(
  "initial: multiple function calls rejected",
  await generateStructuredInitialTurn({
    model: MODEL,
    systemInstruction: SYSTEM,
    contents: CONTENTS,
    allowedToolNames: ALL_TOOLS,
    transport: createRecordingTransport({
      type: "sdk",
      value: {
        candidates: [
          {
            content: {
              parts: [
                { functionCall: { name: "marketplace.search", args: { query: "a" } } },
                { functionCall: { name: "inventory.fetch", args: {} } },
              ],
            },
          },
        ],
      },
    }),
  }),
  "multiple-function-calls"
);

assertFail(
  "initial: mixed text and function rejected",
  await generateStructuredInitialTurn({
    model: MODEL,
    systemInstruction: SYSTEM,
    contents: CONTENTS,
    allowedToolNames: ALL_TOOLS,
    transport: createRecordingTransport({
      type: "sdk",
      value: {
        candidates: [
          {
            content: {
              parts: [
                { text: "ขอค้นหาก่อน" },
                { functionCall: { name: "marketplace.search", args: { query: "x" } } },
              ],
            },
          },
        ],
      },
    }),
  }),
  "mixed-text-function-response"
);

const thoughtAccepted = await generateStructuredInitialTurn({
  model: MODEL,
  systemInstruction: SYSTEM,
  contents: CONTENTS,
  allowedToolNames: ALL_TOOLS,
  transport: createRecordingTransport(
    toolPartResponse({
      name: "marketplace.search",
      args: { query: "รถเก๋ง" },
      thought: "internal reasoning only",
    })
  ),
});
if (!thoughtAccepted.ok || thoughtAccepted.value.outcome.kind !== "tool-request") {
  console.error("FAIL [initial: thought plus function accepted]", thoughtAccepted);
  process.exit(1);
}
pass("initial: thought plus function accepted");

assertFail(
  "initial: unknown tool rejected",
  await generateStructuredInitialTurn({
    model: MODEL,
    systemInstruction: SYSTEM,
    contents: CONTENTS,
    allowedToolNames: ALL_TOOLS,
    transport: createRecordingTransport(
      toolPartResponse({ name: "posting.create", args: {} })
    ),
  }),
  "unknown-function-name"
);

assertFail(
  "initial: tool outside turn allowlist rejected",
  await generateStructuredInitialTurn({
    model: MODEL,
    systemInstruction: SYSTEM,
    contents: CONTENTS,
    allowedToolNames: ["marketplace.search"],
    transport: createRecordingTransport(
      toolPartResponse({ name: "inventory.fetch", args: {} })
    ),
  }),
  "function-not-allowed-for-turn"
);

assertFail(
  "initial: invalid args rejected",
  await generateStructuredInitialTurn({
    model: MODEL,
    systemInstruction: SYSTEM,
    contents: CONTENTS,
    allowedToolNames: ALL_TOOLS,
    transport: createRecordingTransport({
      type: "sdk",
      value: {
        candidates: [
          {
            content: {
              parts: [{ functionCall: { name: "marketplace.search", args: null } }],
            },
            finishReason: "STOP",
          },
        ],
      },
    }),
  }),
  "invalid-function-args"
);

assertFail(
  "initial: no candidate rejected",
  await generateStructuredInitialTurn({
    model: MODEL,
    systemInstruction: SYSTEM,
    contents: CONTENTS,
    allowedToolNames: ALL_TOOLS,
    transport: createRecordingTransport({ type: "sdk", value: { candidates: [] } }),
  }),
  "empty-candidate"
);

assertFail(
  "initial: multiple candidates rejected",
  await generateStructuredInitialTurn({
    model: MODEL,
    systemInstruction: SYSTEM,
    contents: CONTENTS,
    allowedToolNames: ALL_TOOLS,
    transport: createRecordingTransport({
      type: "sdk",
      value: {
        candidates: [
          { content: { parts: [{ text: "a" }] } },
          { content: { parts: [{ text: "b" }] } },
        ],
      },
    }),
  }),
  "multiple-candidates"
);

assertFail(
  "initial: safety blocked rejected",
  await generateStructuredInitialTurn({
    model: MODEL,
    systemInstruction: SYSTEM,
    contents: CONTENTS,
    allowedToolNames: ALL_TOOLS,
    transport: createRecordingTransport({
      type: "sdk",
      value: {
        candidates: [{ finishReason: "SAFETY", content: { parts: [{ text: "blocked" }] } }],
      },
    }),
  }),
  "safety-blocked"
);

assertFail(
  "initial: executable part rejected",
  await generateStructuredInitialTurn({
    model: MODEL,
    systemInstruction: SYSTEM,
    contents: CONTENTS,
    allowedToolNames: ALL_TOOLS,
    transport: createRecordingTransport({
      type: "sdk",
      value: {
        candidates: [
          {
            content: {
              parts: [{ executableCode: { language: "PYTHON", code: "print(1)" } }],
            },
          },
        ],
      },
    }),
  }),
  "malformed-response"
);

// --- Follow-up ---

const initialForFollowUp = assertOk(
  "follow-up: initial tool request",
  await generateStructuredInitialTurn({
    model: MODEL,
    systemInstruction: SYSTEM,
    contents: CONTENTS,
    allowedToolNames: ALL_TOOLS,
    transport: createRecordingTransport(
      toolPartResponse({
        name: "marketplace.search",
        args: { query: "รถเก๋ง" },
        id: "provider-call-1",
      })
    ),
  })
);
if (!initialForFollowUp.providerContext) {
  console.error("FAIL [follow-up: provider context present]");
  process.exit(1);
}
pass("follow-up: provider context present");

const providerContext = initialForFollowUp.providerContext;
const followUpTransport = createRecordingTransport(textResponse("พบรถที่เหมาะกับคุณ 3 คันครับ"));
const followUpResult = assertOk(
  "follow-up: final text accepted",
  await generateFinalAnswerFromToolResult({
    model: MODEL,
    systemInstruction: SYSTEM,
    contents: CONTENTS,
    providerContext,
    toolResult: validMarketplaceToolResult(
      Array.from({ length: 12 }, (_, index) => `listing-${index + 1}`)
    ),
    transport: followUpTransport,
  })
);
assertEqual("follow-up: final text", followUpResult, "พบรถที่เหมาะกับคุณ 3 คันครับ");
assertEqual("follow-up: one provider call", followUpTransport.callCount, 1);

const followConfig = followUpTransport.requests[0]!.config;
assertEqual(
  "follow-up: mode NONE",
  followConfig.toolConfig?.functionCallingConfig?.mode,
  FunctionCallingConfigMode.NONE
);
assertEqual(
  "follow-up: automatic function calling disabled",
  followConfig.automaticFunctionCalling?.disable,
  true
);

const followContents = followUpTransport.requests[0]!.contents as Array<Record<string, unknown>>;
assertEqual("follow-up: contents include model function call", followContents.length, 3);
assertEqual(
  "follow-up: function response role user",
  (followContents[2] as { role?: string }).role,
  "user"
);

const trimmedPayload = JSON.parse(
  JSON.stringify(
    (
      (followContents[2] as { parts?: Array<{ functionResponse?: { response?: { data?: { listingIds?: string[] } } } }> })
        .parts?.[0]?.functionResponse?.response
    )
  )
);
assertEqual("follow-up: marketplace listing ids trimmed to 10", trimmedPayload.data.listingIds.length, 10);

const financeFollowUpTransport = createRecordingTransport(textResponse("ค่างวดประมาณ 6,300 บาทครับ"));
assertOk(
  "follow-up: finance metadata preserved",
  await generateFinalAnswerFromToolResult({
    model: MODEL,
    systemInstruction: SYSTEM,
    contents: CONTENTS,
    providerContext: {
      ...providerContext,
      functionName: "finance.calculate",
      modelContent: {
        role: "model",
        parts: [
          {
            functionCall: {
              name: "finance.calculate",
              args: {
                listingId: "listing-100",
                annualInterestRatePercent: 5,
                termMonths: 60,
                downPaymentPercent: 20,
              },
            },
          },
        ],
      },
    },
    toolResult: validFinanceToolResult(),
    transport: financeFollowUpTransport,
  })
);

assertFail(
  "follow-up: error tool result rejected",
  await generateFinalAnswerFromToolResult({
    model: MODEL,
    systemInstruction: SYSTEM,
    contents: CONTENTS,
    providerContext,
    toolResult: {
      requestId: "tool-req-001",
      conversationId: "conv-001",
      toolName: "marketplace.search",
      status: "error",
      provenance: "marketplace-search",
      errorCode: "tool_error",
    },
    transport: createRecordingTransport(textResponse("should-not-run")),
  }),
  "tool-result-not-ok"
);

assertFail(
  "follow-up: fallback tool result rejected",
  await generateFinalAnswerFromToolResult({
    model: MODEL,
    systemInstruction: SYSTEM,
    contents: CONTENTS,
    providerContext,
    toolResult: {
      requestId: "tool-req-001",
      conversationId: "conv-001",
      toolName: "marketplace.search",
      status: "fallback",
      provenance: "marketplace-search",
      errorCode: "tool_unavailable",
      fallbackUsed: true,
    },
    transport: createRecordingTransport(textResponse("should-not-run")),
  }),
  "tool-result-not-ok"
);

assertFail(
  "follow-up: tool name mismatch rejected",
  await generateFinalAnswerFromToolResult({
    model: MODEL,
    systemInstruction: SYSTEM,
    contents: CONTENTS,
    providerContext,
    toolResult: {
      ...validFinanceToolResult(),
      toolName: "finance.calculate",
    },
    transport: createRecordingTransport(textResponse("should-not-run")),
  }),
  "tool-result-name-mismatch"
);

assertFail(
  "follow-up: second function call rejected",
  await generateFinalAnswerFromToolResult({
    model: MODEL,
    systemInstruction: SYSTEM,
    contents: CONTENTS,
    providerContext,
    toolResult: validMarketplaceToolResult(["listing-1"]),
    transport: createRecordingTransport(
      toolPartResponse({ name: "marketplace.search", args: { query: "again" } })
    ),
  }),
  "follow-up-function-call-rejected"
);

// --- Direct adapter regression from this suite ---

const directAdapter = createConversationCoreGeminiAdapter({
  transport: {
    async generate() {
      return inspectConversationCoreGeminiSdkResponse({
        candidates: [{ content: { parts: [{ functionCall: { name: "marketplace.search" } }] } }],
      });
    },
  },
});
const directTool = await directAdapter.generate({
  model: MODEL,
  systemInstruction: SYSTEM,
  userMessage: USER_MESSAGE,
});
assertEqual("direct adapter: function call still non-text", directTool.ok, false);
if (directTool.ok !== false) {
  console.error("FAIL [direct adapter: function call still non-text] expected failure");
  process.exit(1);
}
assertEqual("direct adapter: non-text code", directTool.code, "non-text-response");

const directTextAdapter = createConversationCoreGeminiAdapter({
  transport: {
    async generate() {
      return { kind: "text" as const, text: "คำตอบตรงจาก Gemini" };
    },
  },
});
const directText = await directTextAdapter.generate({
  model: MODEL,
  systemInstruction: SYSTEM,
  userMessage: USER_MESSAGE,
});
assertEqual("direct adapter: text-only still accepted", directText.ok, true);

// --- Trust boundary: outcome acceptance != validateToolRequest ---

const untrustedOutcome = assertOk(
  "trust: outcome accepts untrusted tool proposal",
  await generateStructuredInitialTurn({
    model: MODEL,
    systemInstruction: SYSTEM,
    contents: CONTENTS,
    allowedToolNames: ALL_TOOLS,
    transport: createRecordingTransport(
      toolPartResponse({ name: "marketplace.search", args: { query: "รถเก๋ง" } })
    ),
  })
);
if (untrustedOutcome.outcome.kind !== "tool-request") {
  console.error("FAIL [trust: tool-request outcome]");
  process.exit(1);
}
const toolRequestValidation = validateToolRequest({
  toolName: untrustedOutcome.outcome.toolName,
  input: untrustedOutcome.outcome.toolInput,
});
if (toolRequestValidation.ok) {
  console.error("FAIL [trust: outcome is not full ToolRequest validation]");
  process.exit(1);
}
pass("trust: outcome is not full ToolRequest validation");

// --- Import boundary ---

const transportSourceText = fs.readFileSync(
  "src/server/conversation-core/conversationCoreGeminiToolTransport.ts",
  "utf8"
);
if (/process\.env/.test(transportSourceText)) {
  console.error("FAIL [boundary: transport has no process.env]");
  process.exit(1);
}
pass("boundary: transport has no process.env");

const declarationsSourceText = fs.readFileSync(
  "src/server/conversation-core/conversationCoreGeminiFunctionDeclarations.ts",
  "utf8"
);
if (/process\.env/.test(declarationsSourceText)) {
  console.error("FAIL [boundary: declarations has no process.env]");
  process.exit(1);
}
pass("boundary: declarations has no process.env");

console.log(`\nConversation Core Gemini tool transport tests passed (${passCount} assertions).`);
