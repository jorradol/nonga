/**
 * WP-V2U-03C3 — Conversation Core Gemini adapter and max-one correction tests.
 * Fake provider transport only. No network. No real Gemini.
 * Run: .\node_modules\.bin\tsx.cmd scripts/test-conversation-core-gemini-correction.mts
 */
import fs from "node:fs";
import path from "node:path";
import {
  CONVERSATION_CORE_MAX_HISTORY_CONTENT_CHARS,
  CONVERSATION_CORE_MAX_HISTORY_TURNS,
  CONVERSATION_CORE_MAX_MESSAGE_LENGTH,
  CONVERSATION_CORE_POLICY_VERSION,
  CONVERSATION_TURN_CLIENT_FORBIDDEN_KEYS,
  buildConversationCoreBaseInstruction,
  validateConversationCoreCandidate,
  validateConversationCoreHighRisk,
  validateConversationCoreResult,
  validateConversationCoreSafety,
  validateConversationCoreTypography,
  validateConversationCoreExecutionContext,
  validateConversationTurnRequest,
  type ConversationCoreExecutionContext,
  type ConversationCorePolicyLane,
  type ConversationTurnRequest,
} from "../src/services/conversation-core/index";
import {
  CONVERSATION_CORE_ALLOWED_GEMINI_MODELS,
  CONVERSATION_CORE_GEMINI_API_KEY_ENV,
  CONVERSATION_CORE_GEMINI_DEFAULT_TIMEOUT_MS,
  CONVERSATION_CORE_GEMINI_MAX_TIMEOUT_MS,
  CONVERSATION_CORE_GEMINI_MODEL_FAMILY,
  CONVERSATION_CORE_GEMINI_PROVIDER_ID,
  CONVERSATION_CORE_HIGH_RISK_FALLBACK_TEXT,
  CONVERSATION_CORE_MAX_PROVIDER_CALLS,
  NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV,
  NONGA_CONVERSATION_CORE_GEMINI_MODEL_ENV,
  buildConversationCoreCorrectionInstruction,
  buildConversationCoreGeminiContents,
  buildConversationCoreHighRiskFallback,
  createConversationCoreGeminiAdapter,
  hasSecretOrPiiHardReject,
  inspectConversationCoreGeminiConfigStatus,
  inspectConversationCoreGeminiSdkResponse,
  mapConversationHistoryRoleToGemini,
  resolveConversationCoreGeminiConfig,
  resolveConversationCoreGeminiTimeoutMs,
  runConversationCoreExecutionService,
  runConversationCoreMaxOneCorrection,
  type ConversationCoreGeminiAdapter,
  type ConversationCoreGeminiConfigStatus,
  type ConversationCoreGeminiGenerateRequest,
  type ConversationCoreGeminiTransport,
  type ConversationCoreGeminiTransportResult,
  type ConversationCoreMaxOneCorrectionInput,
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
      `FAIL [${label}] expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
    process.exit(1);
  }
  pass(label);
}

function assertIncludes(label: string, haystack: string, needle: string): void {
  if (!haystack.includes(needle)) {
    console.error(`FAIL [${label}] expected to include: ${needle}`);
    process.exit(1);
  }
  pass(label);
}

function assertExcludes(label: string, haystack: string, needle: string): void {
  if (haystack.includes(needle)) {
    console.error(`FAIL [${label}] expected to exclude: ${needle}`);
    process.exit(1);
  }
  pass(label);
}

function read(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

const AUTH_UID = "firebase-uid-core-gemini-001";
const CONVERSATION_ID = "conv-core-gemini-001";
const MESSAGE_ID = "msg-core-gemini-001";
const ALLOWED_MODEL = CONVERSATION_CORE_ALLOWED_GEMINI_MODELS[0];
const SECRET_LIKE_CANDIDATE = `อย่าเก็บค่านี้ AIzaSyDummyTestKeyValue0001 ไว้ในคำตอบ`;
const SAFE_GENERAL_TEXT =
  "รถแต่ละรุ่นดูแลไม่เหมือนกัน ถ้ายังไม่มีข้อมูลที่ยืนยันจากระบบ ขอเล่าหลักการทั่วไปก่อนได้";
const CORRECTION_REQUIRED_TEXT = "ดูสูตร $x^2$ ประกอบคำอธิบายทั่วไปเรื่องการดูแลรักษารถ";
const HARD_REJECT_HIGH_RISK_TEXT = "ดับเครื่องขณะรถยังเคลื่อนที่";
const CORRECTION_REQUIRED_HIGH_RISK_TEXT = "แรงช่วยเบรกเหมือนกันทุกคัน";
const HTML_CANDIDATE = "คำตอบทั่วไป <script>alert(1)</script>";
const FAKE_SECRET_VALUE = "super-secret-key-value-xyz-do-not-leak";

const PRODUCTION_FILES = [
  "src/server/conversation-core/conversationCoreGeminiConfig.ts",
  "src/server/conversation-core/conversationCoreGeminiAdapter.ts",
  "src/server/conversation-core/conversationCoreCorrectionService.ts",
  "src/server/conversation-core/conversationCoreHighRiskFallback.ts",
  "src/server/conversation-core/conversationCoreExecutionService.ts",
  "src/server/conversation-core/index.ts",
];

function envReader(values: Record<string, string | undefined>) {
  return (key: string) => values[key];
}

type FakeConversationCoreGeminiScriptedResponse =
  | { readonly type: "text"; readonly text: string }
  | { readonly type: "empty" }
  | { readonly type: "malformed" }
  | { readonly type: "non-text" }
  | { readonly type: "timeout" }
  | { readonly type: "abort" }
  | { readonly type: "error"; readonly message?: string }
  | { readonly type: "pending" }
  | { readonly type: "raw"; readonly value: unknown }
  | { readonly type: "sync-throw"; readonly message?: string }
  | { readonly type: "reject"; readonly message?: string };

interface FakeConversationCoreGeminiTransport extends ConversationCoreGeminiTransport {
  readonly requests: readonly ConversationCoreGeminiGenerateRequest[];
  readonly callCount: number;
}

function freezeFakeRequest(
  request: ConversationCoreGeminiGenerateRequest
): ConversationCoreGeminiGenerateRequest {
  return Object.freeze({
    model: request.model,
    systemInstruction: request.systemInstruction,
    contents: Object.freeze(
      request.contents.map((turn) =>
        Object.freeze({
          role: turn.role,
          parts: Object.freeze(turn.parts.map((part) => Object.freeze({ text: part.text }))),
        })
      )
    ),
  });
}

function createFakeConversationCoreGeminiTransport(
  script:
    | FakeConversationCoreGeminiScriptedResponse
    | readonly FakeConversationCoreGeminiScriptedResponse[]
): FakeConversationCoreGeminiTransport {
  const responses = Array.isArray(script) ? [...script] : [script];
  const requests: ConversationCoreGeminiGenerateRequest[] = [];
  return {
    get requests() {
      return requests;
    },
    get callCount() {
      return requests.length;
    },
    async generate(request) {
      requests.push(freezeFakeRequest(request));
      const next = responses[requests.length - 1] ?? responses[responses.length - 1];
      if (!next) {
        return Object.freeze({ kind: "malformed" as const });
      }
      if (next.type === "pending") {
        return new Promise<ConversationCoreGeminiTransportResult>(() => undefined);
      }
      if (next.type === "timeout") {
        const error = new Error("provider timeout");
        (error as Error & { code?: string }).code = "ETIMEDOUT";
        throw error;
      }
      if (next.type === "abort") {
        const error = new Error("provider aborted");
        error.name = "AbortError";
        (error as Error & { code?: string }).code = "ABORT_ERR";
        throw error;
      }
      if (next.type === "error") {
        throw new Error(next.message ?? "provider failure");
      }
      if (next.type === "sync-throw") {
        throw new Error(next.message ?? "provider sync throw");
      }
      if (next.type === "reject") {
        return Promise.reject(new Error(next.message ?? "provider rejected"));
      }
      if (next.type === "raw") {
        return next.value as ConversationCoreGeminiTransportResult;
      }
      if (next.type === "empty") {
        return Object.freeze({ kind: "text" as const, text: "" });
      }
      if (next.type === "malformed") {
        return Object.freeze({ kind: "malformed" as const });
      }
      if (next.type === "non-text") {
        return Object.freeze({ kind: "non-text" as const });
      }
      if (next.type === "text") {
        return Object.freeze({ kind: "text" as const, text: next.text });
      }
      return Object.freeze({ kind: "malformed" as const });
    },
  };
}

function validTurnBody(overrides: Record<string, unknown> = {}) {
  return {
    conversationId: CONVERSATION_ID,
    messageId: MESSAGE_ID,
    userMessage: "อยากได้คำปรึกษาเรื่องดูแลรักษารถ",
    history: [
      { role: "user", content: "สวัสดีครับ" },
      { role: "assistant", content: "สวัสดีค่ะ มีอะไรให้ช่วยเรื่องรถไหม" },
    ],
    expertMode: "MAINTENANCE",
    locale: "th-TH",
    ...overrides,
  };
}

function validContextBody(overrides: Record<string, unknown> = {}) {
  return {
    conversationId: CONVERSATION_ID,
    actorScope: { kind: "authenticated", actorRef: AUTH_UID, role: "client" },
    conversationOwnership: { ownerActorRef: AUTH_UID, bindingVerified: true },
    featureFlags: {
      coreEnabled: true,
      geminiEnabled: true,
      toolsEnabled: false,
      workspaceActionsEnabled: false,
    },
    toolAllowlist: [],
    receivedAtMs: 1_700_000_000_000,
    policyVersion: CONVERSATION_CORE_POLICY_VERSION,
    ...overrides,
  };
}

function validatedTurn(overrides: Record<string, unknown> = {}): ConversationTurnRequest {
  const parsed = validateConversationTurnRequest(validTurnBody(overrides));
  if (!parsed.ok) {
    throw new Error("turn fixture invalid");
  }
  return parsed.value;
}

function validatedContext(
  overrides: Record<string, unknown> = {}
): ConversationCoreExecutionContext {
  const parsed = validateConversationCoreExecutionContext(validContextBody(overrides));
  if (!parsed.ok) {
    throw new Error("context fixture invalid");
  }
  return parsed.value;
}

function readyConfig(): ConversationCoreGeminiConfigStatus {
  return resolveConversationCoreGeminiConfig({
    readEnv: envReader({
      [NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV]: "true",
      [NONGA_CONVERSATION_CORE_GEMINI_MODEL_ENV]: ALLOWED_MODEL,
    }),
    apiKeyReady: true,
  });
}

function adapterWith(
  script:
    | FakeConversationCoreGeminiScriptedResponse
    | readonly FakeConversationCoreGeminiScriptedResponse[],
  options: {
    timeoutMs?: number;
    scheduleTimeout?: Parameters<typeof createConversationCoreGeminiAdapter>[0]["scheduleTimeout"];
  } = {}
) {
  const transport = createFakeConversationCoreGeminiTransport(script);
  return {
    transport,
    adapter: createConversationCoreGeminiAdapter({
      transport,
      timeoutMs: options.timeoutMs,
      scheduleTimeout: options.scheduleTimeout,
    }),
  };
}

async function runExecution(input: {
  lane: ConversationCorePolicyLane;
  script?:
    | FakeConversationCoreGeminiScriptedResponse
    | readonly FakeConversationCoreGeminiScriptedResponse[];
  config?: ConversationCoreGeminiConfigStatus;
  request?: ConversationTurnRequest;
  context?: ConversationCoreExecutionContext;
  fallbackBuilder?: Parameters<typeof runConversationCoreExecutionService>[0]["fallbackBuilder"];
  candidateContext?: Parameters<typeof runConversationCoreExecutionService>[0]["candidateContext"];
  timeoutMs?: number;
  scheduleTimeout?: Parameters<typeof createConversationCoreGeminiAdapter>[0]["scheduleTimeout"];
  adapter?: ConversationCoreGeminiAdapter;
  raw?: Record<string, unknown>;
}) {
  const { adapter, transport } = adapterWith(
    input.script ?? { type: "text", text: SAFE_GENERAL_TEXT },
    { timeoutMs: input.timeoutMs, scheduleTimeout: input.scheduleTimeout }
  );
  const request = input.request ?? validatedTurn();
  const payload = {
    request,
    context: input.context ?? validatedContext(),
    baseInstruction: buildConversationCoreBaseInstruction({
      expertMode: request.expertMode ?? "AUTO",
    }),
    policyLane: input.lane,
    geminiConfig: input.config ?? readyConfig(),
    adapter: input.adapter ?? adapter,
    fallbackBuilder: input.fallbackBuilder,
    candidateContext: input.candidateContext,
    ...(input.raw ?? {}),
  };
  const result = await runConversationCoreExecutionService(
    payload as Parameters<typeof runConversationCoreExecutionService>[0]
  );
  return { result, transport, adapter, request };
}

function completedResultText(result: Awaited<ReturnType<typeof runExecution>>["result"]): string {
  if (result.kind !== "completed") {
    throw new Error(`expected completed, got ${result.kind}`);
  }
  return result.result.assistantText;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const configDefault = resolveConversationCoreGeminiConfig({ readEnv: envReader({}) });
assertEqual("config: missing flag => disabled", configDefault.status, "disabled");

const configEmpty = resolveConversationCoreGeminiConfig({
  readEnv: envReader({ [NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV]: "" }),
  apiKeyReady: true,
});
assertEqual("config: empty flag => disabled", configEmpty.status, "disabled");

const configFalse = resolveConversationCoreGeminiConfig({
  readEnv: envReader({
    [NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV]: "false",
    [NONGA_CONVERSATION_CORE_GEMINI_MODEL_ENV]: ALLOWED_MODEL,
  }),
  apiKeyReady: true,
});
assertEqual("config: explicit false => disabled", configFalse.status, "disabled");

const configOne = resolveConversationCoreGeminiConfig({
  readEnv: envReader({
    [NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV]: "1",
    [NONGA_CONVERSATION_CORE_GEMINI_MODEL_ENV]: ALLOWED_MODEL,
  }),
  apiKeyReady: true,
});
assertEqual("config: 1 is not explicit true => disabled", configOne.status, "disabled");

const configYes = resolveConversationCoreGeminiConfig({
  readEnv: envReader({
    [NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV]: "yes",
    [NONGA_CONVERSATION_CORE_GEMINI_MODEL_ENV]: ALLOWED_MODEL,
  }),
  apiKeyReady: true,
});
assertEqual("config: yes is not explicit true => disabled", configYes.status, "disabled");

const configUpper = resolveConversationCoreGeminiConfig({
  readEnv: envReader({
    [NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV]: "TRUE",
    [NONGA_CONVERSATION_CORE_GEMINI_MODEL_ENV]: ALLOWED_MODEL,
  }),
  apiKeyReady: true,
});
assertEqual("config: TRUE is not exact true => disabled", configUpper.status, "disabled");

const configMalformed = resolveConversationCoreGeminiConfig({
  readEnv: envReader({
    [NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV]: "maybe",
    [NONGA_CONVERSATION_CORE_GEMINI_MODEL_ENV]: ALLOWED_MODEL,
  }),
  apiKeyReady: true,
});
assertEqual("config: malformed => disabled", configMalformed.status, "disabled");

const configV3Live = resolveConversationCoreGeminiConfig({
  readEnv: envReader({
    NONGA_AI_CHAT_V3_LIVE_PROVIDER_ENABLED: "true",
    NONGA_AI_CHAT_V3_PROVIDER: "gemini",
    NONGA_AI_CHAT_V3_MODEL: ALLOWED_MODEL,
    NONGA_AI_LEGACY_PUBLIC_GEMINI_ENABLED: "true",
    [NONGA_CONVERSATION_CORE_GEMINI_MODEL_ENV]: ALLOWED_MODEL,
  }),
  apiKeyReady: true,
});
assertEqual("config: V.3 flags do not enable Core", configV3Live.status, "disabled");

const configMissingModel = resolveConversationCoreGeminiConfig({
  readEnv: envReader({ [NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV]: "true" }),
  apiKeyReady: true,
});
assertEqual("config: missing model => unavailable", configMissingModel.status, "unavailable");
if (configMissingModel.status === "unavailable") {
  assertEqual("config: missing model reason", configMissingModel.reasonCode, "missing-model");
}

const configEmptyModel = resolveConversationCoreGeminiConfig({
  readEnv: envReader({
    [NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV]: "true",
    [NONGA_CONVERSATION_CORE_GEMINI_MODEL_ENV]: "   ",
  }),
  apiKeyReady: true,
});
assertEqual("config: empty model => unavailable", configEmptyModel.status, "unavailable");

const configInvalidModel = resolveConversationCoreGeminiConfig({
  readEnv: envReader({
    [NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV]: "true",
    [NONGA_CONVERSATION_CORE_GEMINI_MODEL_ENV]: "gpt-4o",
  }),
  apiKeyReady: true,
});
assertEqual("config: invalid model => unavailable", configInvalidModel.status, "unavailable");
if (configInvalidModel.status === "unavailable") {
  assertEqual("config: invalid model reason", configInvalidModel.reasonCode, "invalid-model");
}

const configMissingKey = resolveConversationCoreGeminiConfig({
  readEnv: envReader({
    [NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV]: "true",
    [NONGA_CONVERSATION_CORE_GEMINI_MODEL_ENV]: ALLOWED_MODEL,
  }),
  apiKeyReady: false,
});
assertEqual("config: missing api-key readiness => unavailable", configMissingKey.status, "unavailable");
if (configMissingKey.status === "unavailable") {
  assertEqual("config: missing api-key reason", configMissingKey.reasonCode, "missing-api-key");
}

const configReady = readyConfig();
assertEqual("config: explicit true + model + readiness => ready", configReady.status, "ready");
if (configReady.status === "ready") {
  assertEqual("config: ready providerId", configReady.providerId, CONVERSATION_CORE_GEMINI_PROVIDER_ID);
  assertEqual("config: ready model is server-owned", configReady.model, ALLOWED_MODEL);
  assertEqual("config: ready modelFamily", configReady.modelFamily, CONVERSATION_CORE_GEMINI_MODEL_FAMILY);
}

const configWithSecretEnv = resolveConversationCoreGeminiConfig({
  readEnv: envReader({
    [NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV]: "true",
    [NONGA_CONVERSATION_CORE_GEMINI_MODEL_ENV]: ALLOWED_MODEL,
    [CONVERSATION_CORE_GEMINI_API_KEY_ENV]: FAKE_SECRET_VALUE,
  }),
});
assertEqual("config: key presence without injected readiness still ready", configWithSecretEnv.status, "ready");
const configSerialized = JSON.stringify(configWithSecretEnv);
assertExcludes("config: serialized status has no secret value", configSerialized, FAKE_SECRET_VALUE);
assertExcludes("config: serialized status has no apiKey field", configSerialized, "apiKey");
assertExcludes("config: serialized status has no GEMINI_API_KEY value pair", configSerialized, `${CONVERSATION_CORE_GEMINI_API_KEY_ENV}=`);

assertEqual(
  "config: env name is Core-owned",
  NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV,
  "NONGA_CONVERSATION_CORE_GEMINI_ENABLED"
);

const configTrimTrue = resolveConversationCoreGeminiConfig({
  readEnv: envReader({
    [NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV]: " true ",
    [NONGA_CONVERSATION_CORE_GEMINI_MODEL_ENV]: ALLOWED_MODEL,
  }),
  apiKeyReady: true,
});
assertEqual("config: trimmed true enables", configTrimTrue.status, "ready");

const configV3ModelDoesNotSelectCoreModel = resolveConversationCoreGeminiConfig({
  readEnv: envReader({
    [NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV]: "true",
    NONGA_AI_CHAT_V3_MODEL: ALLOWED_MODEL,
  }),
  apiKeyReady: true,
});
assertEqual(
  "config: V.3 model env does not supply Core model",
  configV3ModelDoesNotSelectCoreModel.status,
  "unavailable"
);

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------
const historyFixture = Object.freeze([
  Object.freeze({ role: "user" as const, content: "สวัสดีครับ" }),
  Object.freeze({ role: "assistant" as const, content: "สวัสดีค่ะ" }),
  Object.freeze({ role: "user" as const, content: "ถามต่อเรื่องยาง" }),
]);
const contents = buildConversationCoreGeminiContents(historyFixture, "ข้อความล่าสุด");
assertEqual("adapter: history length plus latest user", contents.length, 4);
assertEqual("adapter: first history role stays user", contents[0]?.role, "user");
assertEqual("adapter: assistant maps to model", contents[1]?.role, "model");
assertEqual("adapter: third history role stays user", contents[2]?.role, "user");
assertEqual("adapter: latest user appended last", contents[3]?.role, "user");
assertEqual("adapter: latest user text preserved", contents[3]?.parts[0]?.text, "ข้อความล่าสุด");
assertEqual("adapter: history order first content", contents[0]?.parts[0]?.text, "สวัสดีครับ");
assertEqual("adapter: history order second content", contents[1]?.parts[0]?.text, "สวัสดีค่ะ");
assertEqual("adapter: map assistant role", mapConversationHistoryRoleToGemini("assistant"), "model");
assertEqual("adapter: map user role", mapConversationHistoryRoleToGemini("user"), "user");

const systemInstruction = buildConversationCoreBaseInstruction({ expertMode: "MAINTENANCE" });
const { adapter: textAdapter, transport: textTransport } = adapterWith({
  type: "text",
  text: SAFE_GENERAL_TEXT,
});
const userMessage = "อยากได้คำปรึกษาเรื่องดูแลรักษารถ";
const frozenHistory = historyFixture;
const adapterInput = Object.freeze({
  model: ALLOWED_MODEL,
  systemInstruction,
  userMessage,
  history: frozenHistory,
});
const textResult = await textAdapter.generate(adapterInput);
assertEqual("adapter: text-only accepted ok", textResult.ok, true);
if (textResult.ok) {
  assertEqual("adapter: text-only accepted text", textResult.text, SAFE_GENERAL_TEXT);
}
assertEqual("adapter: one transport call", textTransport.callCount, 1);
assertEqual("adapter: recorded model is server-owned", textTransport.requests[0]?.model, ALLOWED_MODEL);
assertEqual(
  "adapter: system instruction sent separately",
  textTransport.requests[0]?.systemInstruction,
  systemInstruction
);
assertExcludes(
  "adapter: user message not concatenated into system instruction",
  textTransport.requests[0]?.systemInstruction ?? "",
  userMessage
);
assertEqual(
  "adapter: last content is user message",
  textTransport.requests[0]?.contents.at(-1)?.parts[0]?.text,
  userMessage
);

const afterHistory = JSON.stringify(frozenHistory);
assertEqual("adapter: history not mutated", afterHistory, JSON.stringify(historyFixture));
assertEqual("adapter: userMessage not mutated", adapterInput.userMessage, userMessage);

const emptyResult = await adapterWith({ type: "empty" }).adapter.generate(adapterInput);
assertEqual("adapter: empty response rejected", emptyResult.ok, false);
if (emptyResult.ok === false) {
  assertEqual("adapter: empty code", emptyResult.code, "empty-response");
}

const whitespaceResult = await adapterWith({ type: "text", text: "   \n" }).adapter.generate(adapterInput);
assertEqual("adapter: whitespace response rejected", whitespaceResult.ok, false);
if (whitespaceResult.ok === false) {
  assertEqual("adapter: whitespace code", whitespaceResult.code, "empty-response");
}

const malformedResult = await adapterWith({ type: "malformed" }).adapter.generate(adapterInput);
assertEqual("adapter: malformed rejected", malformedResult.ok, false);
if (malformedResult.ok === false) {
  assertEqual("adapter: malformed code", malformedResult.code, "malformed-response");
}

const toolResult = await adapterWith({ type: "non-text" }).adapter.generate(adapterInput);
assertEqual("adapter: tool/function call rejected", toolResult.ok, false);
if (toolResult.ok === false) {
  assertEqual("adapter: non-text code", toolResult.code, "non-text-response");
}

const inspectedFunctionCall = inspectConversationCoreGeminiSdkResponse({
  functionCalls: [{ name: "inventory.fetch" }],
  text: "should-not-use",
});
assertEqual("adapter: SDK functionCalls inspected as non-text", inspectedFunctionCall.kind, "non-text");

const inspectedPartCall = inspectConversationCoreGeminiSdkResponse({
  candidates: [{ content: { parts: [{ functionCall: { name: "lead.create" } }] } }],
});
assertEqual("adapter: SDK functionCall part inspected as non-text", inspectedPartCall.kind, "non-text");

const inspectedExecutable = inspectConversationCoreGeminiSdkResponse({
  candidates: [{ content: { parts: [{ executableCode: { language: "PYTHON", code: "print(1)" } }] } }],
});
assertEqual("adapter: executable payload inspected as non-text", inspectedExecutable.kind, "non-text");

const inspectedMalformed = inspectConversationCoreGeminiSdkResponse(null);
assertEqual("adapter: null SDK response malformed", inspectedMalformed.kind, "malformed");

const oversized = "ก".repeat(CONVERSATION_CORE_MAX_MESSAGE_LENGTH + 1);
const oversizedResult = await adapterWith({ type: "text", text: oversized }).adapter.generate(adapterInput);
assertEqual("adapter: oversized rejected", oversizedResult.ok, false);
if (oversizedResult.ok === false) {
  assertEqual("adapter: oversized code", oversizedResult.code, "oversized-response");
}

const timeoutResult = await adapterWith({ type: "timeout" }).adapter.generate(adapterInput);
assertEqual("adapter: timeout ok false", timeoutResult.ok, false);
if (timeoutResult.ok === false) {
  assertEqual("adapter: timeout generic code", timeoutResult.code, "provider-timeout");
}
assertExcludes("adapter: timeout result has no raw timeout message", JSON.stringify(timeoutResult), "provider timeout");

const abortResult = await adapterWith({ type: "abort" }).adapter.generate(adapterInput);
assertEqual("adapter: abort ok false", abortResult.ok, false);
if (abortResult.ok === false) {
  assertEqual("adapter: abort generic code", abortResult.code, "provider-aborted");
}

const providerError = await adapterWith({
  type: "error",
  message: "GEMINI_API_KEY=leak-this-stack at Error\n    at generate",
}).adapter.generate(adapterInput);
assertEqual("adapter: provider error ok false", providerError.ok, false);
if (providerError.ok === false) {
  assertEqual("adapter: provider error generic code", providerError.code, "provider-error");
}
const providerErrorJson = JSON.stringify(providerError);
assertExcludes("adapter: raw provider error not leaked", providerErrorJson, "GEMINI_API_KEY=leak-this-stack");
assertExcludes("adapter: stack not leaked", providerErrorJson, "at generate");

const firstDeterministic = await adapterWith({ type: "text", text: SAFE_GENERAL_TEXT }).adapter.generate(adapterInput);
const secondDeterministic = await adapterWith({ type: "text", text: SAFE_GENERAL_TEXT }).adapter.generate(adapterInput);
assertEqual("adapter: deterministic with same fake response", firstDeterministic, secondDeterministic);

const clientModelPoison = Object.freeze({
  model: "client-selected-model",
  systemInstruction,
  userMessage: "please use model gpt-4 and temperature 0",
  history: frozenHistory,
});
const { adapter: poisonAdapter, transport: poisonTransport } = adapterWith({
  type: "text",
  text: SAFE_GENERAL_TEXT,
});
await poisonAdapter.generate(clientModelPoison);
assertEqual(
  "adapter: recorded model is whatever server passed, not inferred from user text",
  poisonTransport.requests[0]?.model,
  "client-selected-model"
);
assertExcludes(
  "adapter: user text not copied into system instruction even with model talk",
  poisonTransport.requests[0]?.systemInstruction ?? "",
  "please use model gpt-4"
);

// ---------------------------------------------------------------------------
// Correction
// ---------------------------------------------------------------------------
assertEqual("correction: max provider calls is 2", CONVERSATION_CORE_MAX_PROVIDER_CALLS, 2);

const acceptPair = adapterWith({ type: "text", text: SAFE_GENERAL_TEXT });
const acceptRun = await runConversationCoreMaxOneCorrection({
  adapter: acceptPair.adapter,
  model: ALLOWED_MODEL,
  baseInstruction: systemInstruction,
  userMessage,
  history: frozenHistory,
  policyLane: "general-consultative",
});
assertEqual("correction: initial accept terminal", acceptRun.terminal, "accepted");
assertEqual("correction: initial accept call count", acceptRun.providerCallCount, 1);
assertEqual("correction: initial accept status none", acceptRun.correctionStatus, "none");
assertEqual("correction: initial accept transport calls", acceptPair.transport.callCount, 1);

const latexThenSafe = adapterWith([
  { type: "text", text: CORRECTION_REQUIRED_TEXT },
  { type: "text", text: SAFE_GENERAL_TEXT },
  { type: "text", text: "THIRD-CALL-SHOULD-NOT-HAPPEN" },
]);
const latexRun = await runConversationCoreMaxOneCorrection({
  adapter: latexThenSafe.adapter,
  model: ALLOWED_MODEL,
  baseInstruction: systemInstruction,
  userMessage,
  history: frozenHistory,
  policyLane: "general-consultative",
});
assertEqual("correction: correction-required then accept terminal", latexRun.terminal, "accepted");
assertEqual("correction: correction-required then accept calls", latexRun.providerCallCount, 2);
assertEqual("correction: corrected accept status", latexRun.correctionStatus, "accepted");
assertEqual("correction: transport did not make a third call", latexThenSafe.transport.callCount, 2);

const fullHistoryTurns = Array.from({ length: CONVERSATION_CORE_MAX_HISTORY_TURNS }, (_, index) =>
  Object.freeze({
    role: index % 2 === 0 ? ("user" as const) : ("assistant" as const),
    content: `turn-${String(index).padStart(2, "0")} ${"ก".repeat(1100)}`,
  })
);
const originalFullHistory = Object.freeze(fullHistoryTurns);
const originalFullHistorySnapshot = JSON.stringify(originalFullHistory);
const latestUserMarker = "latest-user-context-marker";
const boundedHistoryPair = adapterWith([
  { type: "text", text: CORRECTION_REQUIRED_TEXT },
  { type: "text", text: SAFE_GENERAL_TEXT },
  { type: "text", text: "THIRD-CALL-SHOULD-NOT-HAPPEN" },
]);
const boundedHistoryRun = await runConversationCoreMaxOneCorrection({
  adapter: boundedHistoryPair.adapter,
  model: ALLOWED_MODEL,
  baseInstruction: systemInstruction,
  userMessage: `${latestUserMarker} ${userMessage}`,
  history: originalFullHistory,
  policyLane: "general-consultative",
});
assertEqual("correction: full history still max two calls", boundedHistoryRun.providerCallCount, 2);
assertEqual("correction: full history no third call", boundedHistoryPair.transport.callCount, 2);
assertEqual(
  "correction: original full history not mutated",
  JSON.stringify(originalFullHistory),
  originalFullHistorySnapshot
);
const secondContents = boundedHistoryPair.transport.requests[1]?.contents ?? [];
const historyPortion = secondContents.slice(0, -1);
const latestCorrectionTurn = secondContents.at(-1);
assertTruthy("correction: second request has contents", secondContents.length > 0);
assertEqual(
  "correction: latest contents turn is the correction user turn",
  latestCorrectionTurn?.role,
  "user"
);
assertTruthy(
  "correction: latest contents turn is not original user message",
  (latestCorrectionTurn?.parts[0]?.text ?? "").includes("กรุณาเขียนคำตอบใหม่")
);
assertTruthy(
  "correction: history portion within max turns",
  historyPortion.length <= CONVERSATION_CORE_MAX_HISTORY_TURNS
);
const historyPortionChars = historyPortion.reduce(
  (total, turn) => total + (turn.parts[0]?.text?.length ?? 0),
  0
);
assertTruthy(
  "correction: history portion within max chars",
  historyPortionChars <= CONVERSATION_CORE_MAX_HISTORY_CONTENT_CHARS
);
assertTruthy(
  "correction: latest user context remains in history portion",
  historyPortion.some((turn) => (turn.parts[0]?.text ?? "").includes(latestUserMarker))
);
assertFalsy(
  "correction: oldest original turn dropped before exceeding budget",
  historyPortion.some((turn) => (turn.parts[0]?.text ?? "").startsWith("turn-00 "))
);
const originalMarkers = historyPortion
  .map((turn) => /^turn-(\d{2}) /.exec(turn.parts[0]?.text ?? "")?.[1])
  .filter((value): value is string => Boolean(value))
  .map((value) => Number(value));
assertTruthy("correction: kept original turns remain chronological", originalMarkers.length > 1);
assertEqual(
  "correction: chronological original markers",
  originalMarkers.slice(),
  [...originalMarkers].sort((left, right) => left - right)
);
assertEqual(
  "correction: previous candidate is last history-portion turn",
  historyPortion.at(-1)?.role,
  "model"
);
assertIncludes(
  "correction: previous candidate remains in history portion",
  historyPortion.at(-1)?.parts[0]?.text ?? "",
  CORRECTION_REQUIRED_TEXT
);
assertEqual(
  "correction: recorded second-call model is exact allowlist member",
  boundedHistoryPair.transport.requests[1]?.model,
  ALLOWED_MODEL
);
assertIncludes(
  "correction: second call uses correction instruction",
  latexThenSafe.transport.requests[1]?.systemInstruction ?? "",
  "[Correction]"
);
assertIncludes(
  "correction: second call includes stable issue code",
  latexThenSafe.transport.requests[1]?.systemInstruction ?? "",
  "typography.raw_latex"
);
assertExcludes(
  "correction: instruction does not dump detector regex",
  latexThenSafe.transport.requests[1]?.systemInstruction ?? "",
  "LATEX_COMMAND_RE"
);
assertExcludes(
  "correction: instruction does not force CTA",
  latexThenSafe.transport.requests[1]?.systemInstruction ?? "",
  "ต้องปิดการขาย"
);
assertIncludes(
  "correction: previous candidate returned when not secret-hard-reject",
  JSON.stringify(latexThenSafe.transport.requests[1]?.contents ?? []),
  CORRECTION_REQUIRED_TEXT
);

const stillBad = adapterWith([
  { type: "text", text: CORRECTION_REQUIRED_TEXT },
  { type: "text", text: CORRECTION_REQUIRED_TEXT },
  { type: "text", text: "THIRD-CALL-SHOULD-NOT-HAPPEN" },
]);
const stillBadRun = await runConversationCoreMaxOneCorrection({
  adapter: stillBad.adapter,
  model: ALLOWED_MODEL,
  baseInstruction: systemInstruction,
  userMessage,
  history: frozenHistory,
  policyLane: "general-consultative",
});
assertEqual("correction: corrected still correction-required terminal", stillBadRun.terminal, "unavailable");
assertEqual("correction: corrected still correction-required calls", stillBadRun.providerCallCount, 2);
assertEqual("correction: no third call after still correction-required", stillBad.transport.callCount, 2);

const correctedReject = adapterWith([
  { type: "text", text: CORRECTION_REQUIRED_TEXT },
  { type: "text", text: HTML_CANDIDATE },
  { type: "text", text: "THIRD-CALL-SHOULD-NOT-HAPPEN" },
]);
const correctedRejectRun = await runConversationCoreMaxOneCorrection({
  adapter: correctedReject.adapter,
  model: ALLOWED_MODEL,
  baseInstruction: systemInstruction,
  userMessage,
  history: frozenHistory,
  policyLane: "general-consultative",
});
assertEqual("correction: corrected reject terminal", correctedRejectRun.terminal, "unavailable");
assertEqual("correction: corrected reject calls", correctedRejectRun.providerCallCount, 2);
assertEqual("correction: no third call after corrected reject", correctedReject.transport.callCount, 2);

const hardReject = adapterWith([
  { type: "text", text: HTML_CANDIDATE },
  { type: "text", text: SAFE_GENERAL_TEXT },
]);
const hardRejectRun = await runConversationCoreMaxOneCorrection({
  adapter: hardReject.adapter,
  model: ALLOWED_MODEL,
  baseInstruction: systemInstruction,
  userMessage,
  history: frozenHistory,
  policyLane: "general-consultative",
});
assertEqual("correction: initial hard reject no correction", hardRejectRun.providerCallCount, 1);
assertEqual("correction: initial hard reject terminal", hardRejectRun.terminal, "unavailable");
assertEqual("correction: initial hard reject transport calls", hardReject.transport.callCount, 1);

const secretPair = adapterWith([
  { type: "text", text: SECRET_LIKE_CANDIDATE },
  { type: "text", text: SAFE_GENERAL_TEXT },
]);
const secretValidation = validateConversationCoreCandidate({
  candidateText: SECRET_LIKE_CANDIDATE,
  context: { policyLane: "general-consultative" },
});
assertEqual("correction: secret-like candidate is reject", secretValidation.outcome, "reject");
assertTruthy(
  "correction: secret-like is hard-reject code",
  hasSecretOrPiiHardReject(secretValidation.issues)
);
const secretRun = await runConversationCoreMaxOneCorrection({
  adapter: secretPair.adapter,
  model: ALLOWED_MODEL,
  baseInstruction: systemInstruction,
  userMessage,
  history: frozenHistory,
  policyLane: "general-consultative",
});
assertEqual("correction: secret-like hard reject no second call", secretPair.transport.callCount, 1);
assertEqual("correction: secret-like terminal unavailable", secretRun.terminal, "unavailable");
assertExcludes(
  "correction: secret-like candidate not sent back to provider",
  JSON.stringify(secretPair.transport.requests.slice(1)),
  "AIzaSyDummyTestKeyValue0001"
);

const errorNoRetry = adapterWith([
  { type: "error", message: "boom" },
  { type: "text", text: SAFE_GENERAL_TEXT },
]);
const errorRun = await runConversationCoreMaxOneCorrection({
  adapter: errorNoRetry.adapter,
  model: ALLOWED_MODEL,
  baseInstruction: systemInstruction,
  userMessage,
  history: frozenHistory,
  policyLane: "general-consultative",
});
assertEqual("correction: provider error does not retry", errorNoRetry.transport.callCount, 1);
assertEqual("correction: provider error terminal unavailable", errorRun.terminal, "unavailable");
assertEqual("correction: provider error generic reason", errorRun.reasonCode, "provider-error");

const issueInstruction = buildConversationCoreCorrectionInstruction({
  issueCodes: ["typography.raw_latex", "high_risk.braking_absolute_claim", "typography.raw_latex"],
});
assertIncludes("correction: stable first issue code", issueInstruction, "- typography.raw_latex");
assertIncludes(
  "correction: stable second issue code",
  issueInstruction,
  "- high_risk.braking_absolute_claim"
);
assertEqual(
  "correction: issue codes are unique in instruction",
  issueInstruction.split("typography.raw_latex").length - 1,
  1
);
assertExcludes("correction: instruction has no secret", issueInstruction, FAKE_SECRET_VALUE);
assertExcludes("correction: instruction has no system dump marker regex", issueInstruction, "(?:system");

// ---------------------------------------------------------------------------
// Lane + execution
// ---------------------------------------------------------------------------
const generalReady = await runExecution({
  lane: "general-consultative",
  script: { type: "text", text: SAFE_GENERAL_TEXT },
});
assertEqual("lane: general ready kind", generalReady.result.kind, "completed");
assertEqual("lane: general ready call count", generalReady.transport.callCount, 1);
if (generalReady.result.kind === "completed") {
  const validated = validateConversationCoreResult(generalReady.result.result, {
    expectedConversationId: CONVERSATION_ID,
    expectedMessageId: MESSAGE_ID,
    toolResults: [],
  });
  assertTruthy("result: general completed passes result validator", validated.ok);
  assertEqual("result: general toolResultsUsed empty", generalReady.result.result.toolResultsUsed, []);
  assertEqual("result: general workspaceActions empty", generalReady.result.result.workspaceActions, []);
  assertEqual("result: general groundedFactRefs empty", generalReady.result.result.groundedFactRefs, []);
  assertEqual("result: general correctionStatus none", generalReady.result.result.correctionStatus, "none");
  assertEqual("result: general safety pass", generalReady.result.result.safetyOutcome, "pass");
  assertEqual(
    "result: general providerId",
    generalReady.result.result.providerMetadata?.providerId,
    CONVERSATION_CORE_GEMINI_PROVIDER_ID
  );
  assertEqual(
    "result: general modelFamily only",
    generalReady.result.result.providerMetadata?.modelFamily,
    CONVERSATION_CORE_GEMINI_MODEL_FAMILY
  );
}

const authoritative = await runExecution({
  lane: "authoritative-data",
  script: { type: "text", text: SAFE_GENERAL_TEXT },
});
assertEqual("lane: authoritative kind", authoritative.result.kind, "honest-unavailable");
assertEqual("lane: authoritative call count", authoritative.transport.callCount, 0);
if (authoritative.result.kind === "honest-unavailable") {
  assertEqual("lane: authoritative reason", authoritative.result.reasonCode, "tools-not-ready");
}

const writeBlocked = await runExecution({
  lane: "write-action-blocked",
  script: { type: "text", text: SAFE_GENERAL_TEXT },
});
assertEqual("lane: write blocked kind", writeBlocked.result.kind, "blocked");
assertEqual("lane: write blocked call count", writeBlocked.transport.callCount, 0);
const writeJson = JSON.stringify(writeBlocked.result);
assertExcludes("lane: write blocked does not claim success", writeJson, "สำเร็จ");
assertExcludes("lane: write blocked does not claim posted", writeJson, "โพสต์");
assertExcludes("lane: write blocked does not claim lead", writeJson, "Lead");
if (writeBlocked.result.kind === "blocked") {
  assertEqual("lane: write blocked reason", writeBlocked.result.reasonCode, "write-action-blocked");
  assertEqual("lane: write blocked providerCallCount", writeBlocked.result.providerCallCount, 0);
}

const highRiskAccept = await runExecution({
  lane: "high-risk-automotive",
  script: { type: "text", text: SAFE_GENERAL_TEXT },
});
assertEqual("lane: high-risk accepted kind", highRiskAccept.result.kind, "completed");
assertEqual("lane: high-risk accepted calls", highRiskAccept.transport.callCount, 1);
if (highRiskAccept.result.kind === "completed") {
  assertTruthy(
    "result: high-risk accepted passes result validator",
    validateConversationCoreResult(highRiskAccept.result.result, {
      expectedConversationId: CONVERSATION_ID,
      expectedMessageId: MESSAGE_ID,
      toolResults: [],
    }).ok
  );
}

const highRiskFailedCorrection = await runExecution({
  lane: "high-risk-automotive",
  script: [
    { type: "text", text: CORRECTION_REQUIRED_HIGH_RISK_TEXT },
    { type: "text", text: CORRECTION_REQUIRED_HIGH_RISK_TEXT },
    { type: "text", text: "THIRD-CALL-SHOULD-NOT-HAPPEN" },
  ],
});
assertEqual("lane: high-risk failed correction kind", highRiskFailedCorrection.result.kind, "completed");
assertEqual("lane: high-risk failed correction calls", highRiskFailedCorrection.transport.callCount, 2);
if (highRiskFailedCorrection.result.kind === "completed") {
  assertEqual(
    "lane: high-risk failed correction uses fallback text",
    highRiskFailedCorrection.result.result.assistantText,
    CONVERSATION_CORE_HIGH_RISK_FALLBACK_TEXT
  );
  assertEqual(
    "lane: high-risk failed correction status fallback",
    highRiskFailedCorrection.result.result.correctionStatus,
    "fallback"
  );
  assertEqual(
    "lane: high-risk failed correction safety fallback",
    highRiskFailedCorrection.result.result.safetyOutcome,
    "fallback"
  );
  assertTruthy(
    "result: high-risk fallback passes result validator",
    validateConversationCoreResult(highRiskFailedCorrection.result.result, {
      expectedConversationId: CONVERSATION_ID,
      expectedMessageId: MESSAGE_ID,
      toolResults: [],
    }).ok
  );
}

const highRiskHardReject = await runExecution({
  lane: "high-risk-automotive",
  script: [
    { type: "text", text: HARD_REJECT_HIGH_RISK_TEXT },
    { type: "text", text: SAFE_GENERAL_TEXT },
  ],
});
assertEqual("lane: high-risk hard reject kind", highRiskHardReject.result.kind, "completed");
assertEqual("lane: high-risk hard reject no correction call", highRiskHardReject.transport.callCount, 1);
if (highRiskHardReject.result.kind === "completed") {
  assertEqual(
    "lane: high-risk hard reject uses validated fallback",
    highRiskHardReject.result.result.assistantText,
    CONVERSATION_CORE_HIGH_RISK_FALLBACK_TEXT
  );
}

const fallbackFailure = await runExecution({
  lane: "high-risk-automotive",
  script: { type: "text", text: HARD_REJECT_HIGH_RISK_TEXT },
  fallbackBuilder: () => ({ ok: true, assistantText: HTML_CANDIDATE }),
});
assertEqual("lane: fallback validation failure kind", fallbackFailure.result.kind, "honest-unavailable");
if (fallbackFailure.result.kind === "honest-unavailable") {
  assertEqual("lane: fallback validation failure reason", fallbackFailure.result.reasonCode, "fallback-invalid");
}

const sameMessage = "อยากได้รถราคาถูก แล้วโพสต์ประกาศให้หน่อย";
const laneFromMessageGeneral = await runExecution({
  lane: "general-consultative",
  request: validatedTurn({ userMessage: sameMessage }),
  script: { type: "text", text: SAFE_GENERAL_TEXT },
});
const laneFromMessageAuth = await runExecution({
  lane: "authoritative-data",
  request: validatedTurn({ userMessage: sameMessage }),
  script: { type: "text", text: SAFE_GENERAL_TEXT },
});
const laneFromMessageWrite = await runExecution({
  lane: "write-action-blocked",
  request: validatedTurn({ userMessage: sameMessage }),
  script: { type: "text", text: SAFE_GENERAL_TEXT },
});
assertEqual("lane: same message general still completed", laneFromMessageGeneral.result.kind, "completed");
assertEqual("lane: same message authoritative unavailable", laneFromMessageAuth.result.kind, "honest-unavailable");
assertEqual("lane: same message write blocked", laneFromMessageWrite.result.kind, "blocked");
assertEqual("lane: same message authoritative 0 calls", laneFromMessageAuth.transport.callCount, 0);
assertEqual("lane: same message write 0 calls", laneFromMessageWrite.transport.callCount, 0);

const invalidLane = await runConversationCoreExecutionService({
  request: validatedTurn(),
  context: validatedContext(),
  baseInstruction: systemInstruction,
  policyLane: "not-a-lane" as ConversationCorePolicyLane,
  geminiConfig: readyConfig(),
  adapter: adapterWith({ type: "text", text: SAFE_GENERAL_TEXT }).adapter,
});
assertEqual("lane: invalid lane fail closed", invalidLane.kind, "honest-unavailable");
if (invalidLane.kind === "honest-unavailable") {
  assertEqual("lane: invalid lane reason", invalidLane.reasonCode, "invalid-lane");
  assertEqual("lane: invalid lane 0 calls", invalidLane.providerCallCount, 0);
}

const disabledConfigRun = await runExecution({
  lane: "general-consultative",
  config: resolveConversationCoreGeminiConfig({ readEnv: envReader({}) }),
});
assertEqual("lane: gemini disabled unavailable", disabledConfigRun.result.kind, "honest-unavailable");
assertEqual("lane: gemini disabled 0 calls", disabledConfigRun.transport.callCount, 0);

const mismatch = await runConversationCoreExecutionService({
  request: validatedTurn(),
  context: validatedContext({ conversationId: "conv-other" }),
  baseInstruction: systemInstruction,
  policyLane: "general-consultative",
  geminiConfig: readyConfig(),
  adapter: adapterWith({ type: "text", text: SAFE_GENERAL_TEXT }).adapter,
});
assertEqual("execution: conversation mismatch fail closed", mismatch.kind, "honest-unavailable");

const htmlThroughValidators = await runExecution({
  lane: "general-consultative",
  script: { type: "text", text: HTML_CANDIDATE },
});
assertEqual("adapter/validators: HTML rejected via validators", htmlThroughValidators.result.kind, "honest-unavailable");
assertEqual("adapter/validators: HTML does not retry unbounded", htmlThroughValidators.transport.callCount, 1);

const generalCorrectedCompleted = await runExecution({
  lane: "general-consultative",
  script: [
    { type: "text", text: CORRECTION_REQUIRED_TEXT },
    { type: "text", text: SAFE_GENERAL_TEXT },
  ],
});
assertEqual("result: general corrected kind", generalCorrectedCompleted.result.kind, "completed");
if (generalCorrectedCompleted.result.kind === "completed") {
  assertEqual("result: general corrected status accepted", generalCorrectedCompleted.result.correctionStatus, "accepted");
  assertTruthy(
    "result: general corrected passes result validator",
    validateConversationCoreResult(generalCorrectedCompleted.result.result, {
      expectedConversationId: CONVERSATION_ID,
      expectedMessageId: MESSAGE_ID,
      toolResults: [],
    }).ok
  );
}

const generalTimeout = await runExecution({
  lane: "general-consultative",
  script: { type: "timeout" },
});
assertEqual("result: general timeout unavailable", generalTimeout.result.kind, "honest-unavailable");
if (generalTimeout.result.kind === "honest-unavailable") {
  assertEqual("result: general timeout generic code", generalTimeout.result.reasonCode, "provider-timeout");
}
assertExcludes("result: timeout serialization has no stack", JSON.stringify(generalTimeout.result), "Error");

const highRiskProviderError = await runExecution({
  lane: "high-risk-automotive",
  script: { type: "error", message: "raw provider boom GEMINI_API_KEY=abc" },
});
assertEqual("lane: high-risk provider error uses fallback", highRiskProviderError.result.kind, "completed");
if (highRiskProviderError.result.kind === "completed") {
  assertEqual(
    "lane: high-risk provider error fallback text",
    highRiskProviderError.result.result.assistantText,
    CONVERSATION_CORE_HIGH_RISK_FALLBACK_TEXT
  );
}
assertExcludes(
  "result: high-risk provider error serialization has no secret",
  JSON.stringify(highRiskProviderError.result),
  "GEMINI_API_KEY=abc"
);

assertFalsy(
  "execution: result kinds exclude legacy-delegate",
  JSON.stringify(generalReady.result).includes("legacy-delegate")
);

const frozenRequest = Object.freeze(validatedTurn());
const frozenContext = Object.freeze(validatedContext());
const frozenBefore = JSON.stringify({ request: frozenRequest, context: frozenContext });
await runConversationCoreExecutionService({
  request: frozenRequest,
  context: frozenContext,
  baseInstruction: systemInstruction,
  policyLane: "general-consultative",
  geminiConfig: readyConfig(),
  adapter: adapterWith({ type: "text", text: SAFE_GENERAL_TEXT }).adapter,
});
assertEqual(
  "execution: input not mutated",
  JSON.stringify({ request: frozenRequest, context: frozenContext }),
  frozenBefore
);

const clientForbidden = new Set(CONVERSATION_TURN_CLIENT_FORBIDDEN_KEYS);
assertTruthy("boundary: client cannot send model", clientForbidden.has("model"));
assertTruthy("boundary: client cannot send provider", clientForbidden.has("provider"));
assertTruthy("boundary: client cannot send apiKey", clientForbidden.has("apiKey"));
assertTruthy("boundary: client cannot send featureFlags", clientForbidden.has("featureFlags"));
assertFalsy(
  "boundary: client turn body has no policyLane key in fixture",
  Object.prototype.hasOwnProperty.call(validTurnBody(), "policyLane")
);

const fallbackBuilt = buildConversationCoreHighRiskFallback({ policyLane: "high-risk-automotive" });
assertEqual("fallback: builder ok", fallbackBuilt.ok, true);
if (fallbackBuilt.ok) {
  assertEqual(
    "fallback: typography accept",
    validateConversationCoreTypography({ candidateText: fallbackBuilt.assistantText }).outcome,
    "accept"
  );
  assertEqual(
    "fallback: safety accept",
    validateConversationCoreSafety({ candidateText: fallbackBuilt.assistantText }).outcome,
    "accept"
  );
  assertEqual(
    "fallback: high-risk accept",
    validateConversationCoreHighRisk({
      candidateText: fallbackBuilt.assistantText,
      context: { policyLane: "high-risk-automotive" },
    }).outcome,
    "accept"
  );
  assertEqual(
    "fallback: candidate accept",
    validateConversationCoreCandidate({
      candidateText: fallbackBuilt.assistantText,
      context: { policyLane: "high-risk-automotive" },
    }).outcome,
    "accept"
  );
}
const fallbackWrongLane = buildConversationCoreHighRiskFallback({ policyLane: "general-consultative" });
assertEqual("fallback: wrong lane invalid", fallbackWrongLane.ok, false);

const secretExec = await runExecution({
  lane: "general-consultative",
  script: { type: "text", text: SECRET_LIKE_CANDIDATE },
});
assertExcludes(
  "result: secret-like candidate not in execution serialization",
  JSON.stringify(secretExec.result),
  "AIzaSyDummyTestKeyValue0001"
);
assertExcludes(
  "result: fake env secret not in execution serialization",
  JSON.stringify(secretExec.result),
  FAKE_SECRET_VALUE
);

if (generalReady.result.kind === "completed") {
  const meta = JSON.stringify(generalReady.result.result.providerMetadata ?? {});
  assertExcludes("result: provider metadata has no apiKey", meta, "apiKey");
  assertExcludes("result: provider metadata has no GEMINI_API_KEY", meta, "GEMINI_API_KEY");
  assertFalsy("result: no fabricated ToolResult object", Array.isArray(generalReady.result.result.toolResultsUsed) && generalReady.result.result.toolResultsUsed.length > 0);
}

assertEqual(
  "result: completed text equals safe candidate",
  completedResultText(generalReady.result),
  SAFE_GENERAL_TEXT
);

const recordedGeneralModel = generalReady.transport.requests[0]?.model;
assertEqual("execution: adapter model comes from resolved config", recordedGeneralModel, ALLOWED_MODEL);

const recordedInstruction = generalReady.transport.requests[0]?.systemInstruction ?? "";
assertEqual(
  "execution: system instruction is base instruction",
  recordedInstruction,
  buildConversationCoreBaseInstruction({ expertMode: "MAINTENANCE" })
);

// ---------------------------------------------------------------------------
// Boundary / source
// ---------------------------------------------------------------------------
const FORBIDDEN_IMPORTS: Array<{ label: string; pattern: RegExp; files?: string[] }> = [
  { label: "chat-v3", pattern: /from\s+["'][^"']*chat-v3/ },
  { label: "V.2 UI", pattern: /from\s+["'][^"']*components\/chat-v2/ },
  { label: "Sales Brain", pattern: /from\s+["'][^"']*salesBrain/ },
  { label: "Express", pattern: /from\s+["']express["']/ },
  { label: "Firebase", pattern: /from\s+["'][^"']*firebase/ },
  { label: "Firestore", pattern: /firestore/i },
];

for (const file of PRODUCTION_FILES) {
  const source = read(file);
  for (const item of FORBIDDEN_IMPORTS) {
    if (file.endsWith("index.ts") && item.label === "Express") {
      continue;
    }
    assertFalsy(`boundary: ${file} has no ${item.label} import`, item.pattern.test(source));
  }
}

const adapterSource = read("src/server/conversation-core/conversationCoreGeminiAdapter.ts");
assertIncludes("boundary: adapter uses installed @google/genai", adapterSource, 'from "@google/genai"');
assertFalsy("boundary: adapter does not import chat-v3", /chat-v3/.test(adapterSource));

const executionSource = read("src/server/conversation-core/conversationCoreExecutionService.ts");
assertFalsy("boundary: execution has no classifyLane", /classifyLane/.test(executionSource));
assertFalsy("boundary: execution has no detectLane", /detectLane/.test(executionSource));
assertFalsy("boundary: execution has no keyword routing helper", /keywordRoute|routeByKeyword/.test(executionSource));
assertFalsy("boundary: execution does not persist", /firestore|writeFile|localStorage/.test(executionSource));
assertFalsy("boundary: execution does not execute tools", /inventory\.fetch|lead\.create/.test(executionSource));
assertFalsy("boundary: execution does not return legacy-delegate", /legacy-delegate/.test(executionSource));
assertFalsy(
  "boundary: execution does not read policyLane from request",
  /request\.policyLane/.test(executionSource)
);
assertFalsy("boundary: execution does not read client model", /request\.model/.test(executionSource));

const correctionSource = read("src/server/conversation-core/conversationCoreCorrectionService.ts");
assertIncludes(
  "boundary: correction hard-caps provider calls at 2",
  correctionSource,
  "CONVERSATION_CORE_MAX_PROVIDER_CALLS"
);
assertFalsy("boundary: correction has no while(true) loop", /while\s*\(\s*true\s*\)/.test(correctionSource));
assertFalsy("boundary: correction does not log candidate", /console\.(log|info|debug|warn)\([^)]*candidate/.test(correctionSource));
assertFalsy("boundary: correction does not log prompt", /console\.(log|info|debug|warn)\([^)]*prompt/.test(correctionSource));

assertFalsy("boundary: adapter does not log history", /console\.(log|info|debug|warn)\([^)]*history/.test(adapterSource));
assertFalsy("boundary: adapter does not log prompt", /console\.(log|info|debug|warn)\([^)]*prompt/.test(adapterSource));
assertFalsy("boundary: adapter does not create WorkspaceAction", /WorkspaceAction/.test(adapterSource));
assertFalsy("boundary: adapter does not create ToolResult", /ToolResult/.test(adapterSource));
assertFalsy("boundary: adapter does not finalize ConversationCoreResult", /validateConversationCoreResult/.test(adapterSource));
assertFalsy("boundary: adapter does not select policy lane", /policyLane/.test(adapterSource));

const fallbackSource = read("src/server/conversation-core/conversationCoreHighRiskFallback.ts");
assertFalsy("boundary: fallback does not classify user message", /userMessage/.test(fallbackSource));
assertFalsy("boundary: fallback has no classifyLane", /classifyLane/.test(fallbackSource));
assertFalsy("boundary: fallback has no detectLane", /detectLane/.test(fallbackSource));

const configSource = read("src/server/conversation-core/conversationCoreGeminiConfig.ts");
assertFalsy("boundary: config does not return process.env secret assignment", /return process\.env/.test(configSource));
assertIncludes("boundary: config default is explicit true only", configSource, '=== "true"');

const indexSource = read("src/server/conversation-core/index.ts");
assertTruthy("boundary: index is export-only", /^\s*(\/\*\*[\s\S]*?\*\/\s*)?export\s/m.test(indexSource));
assertFalsy("boundary: index has no runtime logic function", /function\s+\w+\s*\(/.test(indexSource));
assertFalsy("boundary: index has no Express app.listen", /app\.listen/.test(indexSource));

const routeSource = read("src/server/conversation-core/conversationCoreRouteHandler.ts");
assertFalsy("boundary: route not wired to execution service", /conversationCoreExecutionService/.test(routeSource));
assertFalsy("boundary: route not wired to Gemini adapter", /conversationCoreGeminiAdapter/.test(routeSource));
assertFalsy("boundary: route not wired to Gemini config", /NONGA_CONVERSATION_CORE_GEMINI_ENABLED/.test(routeSource));

const orchestratorSource = read("src/server/conversation-core/conversationCoreOrchestrator.ts");
assertFalsy("boundary: orchestrator not wired to execution", /conversationCoreExecutionService/.test(orchestratorSource));
assertIncludes("boundary: orchestrator still honest-unavailable", orchestratorSource, "core-not-ready");

const flagsSource = read("src/server/conversation-core/conversationCoreFeatureFlags.ts");
assertFalsy(
  "boundary: 03B flags file does not open Core Gemini flag",
  /NONGA_CONVERSATION_CORE_GEMINI_ENABLED/.test(flagsSource)
);
assertIncludes("boundary: 03B snapshot still geminiEnabled false", flagsSource, "geminiEnabled: false");

function immediateTimeoutScheduler(onCancel: () => void = () => undefined) {
  return (callback: () => void) => {
    callback();
    return {
      cancel() {
        onCancel();
      },
    };
  };
}

const invalidTurnRun = await runExecution({
  lane: "general-consultative",
  raw: { request: { conversationId: 123, messageId: MESSAGE_ID, userMessage: "x" } },
});
assertEqual("runtime: invalid raw turn kind", invalidTurnRun.result.kind, "honest-unavailable");
assertEqual("runtime: invalid raw turn 0 calls", invalidTurnRun.transport.callCount, 0);
if (invalidTurnRun.result.kind === "honest-unavailable") {
  assertEqual("runtime: invalid raw turn reason", invalidTurnRun.result.reasonCode, "invalid-input");
}

const invalidContextRun = await runExecution({
  lane: "general-consultative",
  raw: { context: { conversationId: CONVERSATION_ID } },
});
assertEqual("runtime: invalid raw context 0 calls", invalidContextRun.transport.callCount, 0);

const unverifiedOwnership = await runExecution({
  lane: "general-consultative",
  raw: {
    context: {
      ...validContextBody(),
      conversationOwnership: { ownerActorRef: AUTH_UID, bindingVerified: false },
    },
  },
});
assertEqual("runtime: ownership unverified 0 calls", unverifiedOwnership.transport.callCount, 0);

const actorMismatch = await runExecution({
  lane: "general-consultative",
  raw: {
    context: validContextBody({
      actorScope: { kind: "authenticated", actorRef: AUTH_UID, role: "client" },
      conversationOwnership: { ownerActorRef: "firebase-uid-other-owner", bindingVerified: true },
    }),
  },
});
assertEqual("runtime: actor/owner mismatch 0 calls", actorMismatch.transport.callCount, 0);

const emptyInstruction = await runExecution({
  lane: "general-consultative",
  raw: { baseInstruction: "   " },
});
assertEqual("runtime: empty base instruction 0 calls", emptyInstruction.transport.callCount, 0);

const forgedConfig = await runExecution({
  lane: "general-consultative",
  raw: {
    geminiConfig: {
      status: "ready",
      providerId: CONVERSATION_CORE_GEMINI_PROVIDER_ID,
      model: ALLOWED_MODEL,
      modelFamily: CONVERSATION_CORE_GEMINI_MODEL_FAMILY,
      apiKey: "AIzaSyShouldNeverLeak0000000001",
    },
  },
});
assertEqual("runtime: forged config 0 calls", forgedConfig.transport.callCount, 0);
assertExcludes(
  "runtime: forged config serialization has no secret",
  JSON.stringify(forgedConfig.result),
  "AIzaSyShouldNeverLeak0000000001"
);

const invalidAdapter = await runExecution({
  lane: "general-consultative",
  adapter: { generate: "nope" } as unknown as ConversationCoreGeminiAdapter,
});
assertEqual("runtime: invalid adapter 0 calls", invalidAdapter.transport.callCount, 0);

const coreOffReady = await runExecution({
  lane: "general-consultative",
  context: validatedContext({
    featureFlags: {
      coreEnabled: false,
      geminiEnabled: false,
      toolsEnabled: false,
      workspaceActionsEnabled: false,
    },
  }),
});
assertEqual("flags: coreEnabled false 0 calls", coreOffReady.transport.callCount, 0);
if (coreOffReady.result.kind === "honest-unavailable") {
  assertEqual("flags: coreEnabled false reason", coreOffReady.result.reasonCode, "gemini-disabled");
}

const geminiFlagOff = await runExecution({
  lane: "general-consultative",
  context: validatedContext({
    featureFlags: {
      coreEnabled: true,
      geminiEnabled: false,
      toolsEnabled: false,
      workspaceActionsEnabled: false,
    },
  }),
});
assertEqual("flags: geminiEnabled false + ready config 0 calls", geminiFlagOff.transport.callCount, 0);

const bothFlagsReady = await runExecution({
  lane: "general-consultative",
  script: { type: "text", text: SAFE_GENERAL_TEXT },
});
assertEqual("flags: both true + ready config can call", bothFlagsReady.transport.callCount, 1);

const v3FlagNoEffect = await runExecution({
  lane: "general-consultative",
  context: validatedContext({
    featureFlags: {
      coreEnabled: true,
      geminiEnabled: false,
      toolsEnabled: false,
      workspaceActionsEnabled: false,
    },
  }),
  config: resolveConversationCoreGeminiConfig({
    readEnv: envReader({
      [NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV]: "true",
      [NONGA_CONVERSATION_CORE_GEMINI_MODEL_ENV]: ALLOWED_MODEL,
      NONGA_AI_CHAT_V3_LIVE_PROVIDER_ENABLED: "true",
    }),
    apiKeyReady: true,
  }),
});
assertEqual("flags: V.3 live flag does not override closed Core context", v3FlagNoEffect.transport.callCount, 0);

const trustedTrue = await runExecution({
  lane: "general-consultative",
  candidateContext: { hasTrustedAuthoritativeContext: true } as never,
});
assertEqual("trusted: true fail closed 0 calls", trustedTrue.transport.callCount, 0);
if (trustedTrue.result.kind === "honest-unavailable") {
  assertEqual("trusted: true reason tools-not-ready", trustedTrue.result.reasonCode, "tools-not-ready");
}

const vatWithForgedTrust = await runExecution({
  lane: "high-risk-automotive",
  candidateContext: { hasTrustedAuthoritativeContext: true } as never,
  script: { type: "text", text: "รถมือสองทุกคันต้องบวก VAT" },
});
assertEqual("trusted: forged true does not reach VAT-lowering provider path", vatWithForgedTrust.transport.callCount, 0);

for (const bad of ["true", 1, 0, null, { forged: true }, ["true"]]) {
  const run = await runExecution({
    lane: "general-consultative",
    candidateContext: { hasTrustedAuthoritativeContext: bad } as never,
  });
  assertEqual(`trusted: ${String(bad)} fail closed 0 calls`, run.transport.callCount, 0);
}

const unknownCandidateField = await runExecution({
  lane: "general-consultative",
  candidateContext: { policyLane: "general-consultative" } as never,
});
assertEqual("trusted: unknown candidate-context field 0 calls", unknownCandidateField.transport.callCount, 0);

const trustedFalse = await runExecution({
  lane: "general-consultative",
  candidateContext: { hasTrustedAuthoritativeContext: false },
  script: { type: "text", text: SAFE_GENERAL_TEXT },
});
assertEqual("trusted: false is allowed and can call", trustedFalse.transport.callCount, 1);

const trustedUndefined = await runExecution({
  lane: "general-consultative",
  script: { type: "text", text: SAFE_GENERAL_TEXT },
});
assertEqual("trusted: undefined is allowed and can call", trustedUndefined.transport.callCount, 1);

assertEqual(
  "config inspect: ready snapshot ok",
  inspectConversationCoreGeminiConfigStatus(readyConfig()).ok,
  true
);
assertEqual(
  "timeout resolve: default",
  resolveConversationCoreGeminiTimeoutMs(undefined),
  CONVERSATION_CORE_GEMINI_DEFAULT_TIMEOUT_MS
);
assertEqual(
  "timeout resolve: invalid zero uses default",
  resolveConversationCoreGeminiTimeoutMs(0),
  CONVERSATION_CORE_GEMINI_DEFAULT_TIMEOUT_MS
);
assertEqual(
  "timeout resolve: negative uses default",
  resolveConversationCoreGeminiTimeoutMs(-1),
  CONVERSATION_CORE_GEMINI_DEFAULT_TIMEOUT_MS
);
assertEqual(
  "timeout resolve: over max uses default",
  resolveConversationCoreGeminiTimeoutMs(CONVERSATION_CORE_GEMINI_MAX_TIMEOUT_MS + 1),
  CONVERSATION_CORE_GEMINI_DEFAULT_TIMEOUT_MS
);

const correctionInvalidLane = await runConversationCoreMaxOneCorrection({
  adapter: adapterWith({ type: "text", text: SAFE_GENERAL_TEXT }).adapter,
  model: ALLOWED_MODEL,
  baseInstruction: systemInstruction,
  userMessage,
  history: frozenHistory,
  policyLane: "not-a-lane",
} as unknown as ConversationCoreMaxOneCorrectionInput);
assertEqual("correction: invalid lane 0 calls", correctionInvalidLane.providerCallCount, 0);
assertEqual("correction: invalid lane reason", correctionInvalidLane.reasonCode, "invalid-input");

const correctionEmptyModel = await runConversationCoreMaxOneCorrection({
  adapter: adapterWith({ type: "text", text: SAFE_GENERAL_TEXT }).adapter,
  model: "   ",
  baseInstruction: systemInstruction,
  userMessage,
  history: frozenHistory,
  policyLane: "general-consultative",
});
assertEqual("correction: empty model 0 calls", correctionEmptyModel.providerCallCount, 0);

const correctionEmptyInstruction = await runConversationCoreMaxOneCorrection({
  adapter: adapterWith({ type: "text", text: SAFE_GENERAL_TEXT }).adapter,
  model: ALLOWED_MODEL,
  baseInstruction: "",
  userMessage,
  history: frozenHistory,
  policyLane: "general-consultative",
});
assertEqual("correction: empty instruction 0 calls", correctionEmptyInstruction.providerCallCount, 0);

const paddedModelLeading = await runConversationCoreMaxOneCorrection({
  adapter: adapterWith({ type: "text", text: SAFE_GENERAL_TEXT }).adapter,
  model: ` ${ALLOWED_MODEL}`,
  baseInstruction: systemInstruction,
  userMessage,
  history: frozenHistory,
  policyLane: "general-consultative",
});
assertEqual("correction: leading whitespace model 0 calls", paddedModelLeading.providerCallCount, 0);
assertEqual("correction: leading whitespace model reason", paddedModelLeading.reasonCode, "invalid-input");

const paddedModelTrailing = await runConversationCoreMaxOneCorrection({
  adapter: adapterWith({ type: "text", text: SAFE_GENERAL_TEXT }).adapter,
  model: `${ALLOWED_MODEL} `,
  baseInstruction: systemInstruction,
  userMessage,
  history: frozenHistory,
  policyLane: "general-consultative",
});
assertEqual("correction: trailing whitespace model 0 calls", paddedModelTrailing.providerCallCount, 0);

const paddedModelBoth = await runConversationCoreMaxOneCorrection({
  adapter: adapterWith({ type: "text", text: SAFE_GENERAL_TEXT }).adapter,
  model: ` ${ALLOWED_MODEL} `,
  baseInstruction: systemInstruction,
  userMessage,
  history: frozenHistory,
  policyLane: "general-consultative",
});
assertEqual("correction: padded whitespace model 0 calls", paddedModelBoth.providerCallCount, 0);

const wrongCaseModel = await runConversationCoreMaxOneCorrection({
  adapter: adapterWith({ type: "text", text: SAFE_GENERAL_TEXT }).adapter,
  model: ALLOWED_MODEL.toUpperCase(),
  baseInstruction: systemInstruction,
  userMessage,
  history: frozenHistory,
  policyLane: "general-consultative",
});
assertEqual("correction: wrong-case model 0 calls", wrongCaseModel.providerCallCount, 0);

const instructionAtCap = "ก".repeat(CONVERSATION_CORE_MAX_MESSAGE_LENGTH);
const instructionAtCapPair = adapterWith({ type: "text", text: SAFE_GENERAL_TEXT });
const instructionAtCapRun = await runConversationCoreMaxOneCorrection({
  adapter: instructionAtCapPair.adapter,
  model: ALLOWED_MODEL,
  baseInstruction: instructionAtCap,
  userMessage,
  history: frozenHistory,
  policyLane: "general-consultative",
});
assertEqual("correction: instruction at cap can call", instructionAtCapRun.providerCallCount, 1);
assertEqual(
  "correction: instruction at cap recorded exact model",
  instructionAtCapPair.transport.requests[0]?.model,
  ALLOWED_MODEL
);

const oversizedInstructionMarker = "OVERSIZED-BASE-INSTRUCTION-MARKER";
const oversizedInstruction = `${oversizedInstructionMarker}${"ก".repeat(CONVERSATION_CORE_MAX_MESSAGE_LENGTH)}`;
const oversizedInstructionPair = adapterWith({ type: "text", text: SAFE_GENERAL_TEXT });
const oversizedInstructionRun = await runConversationCoreMaxOneCorrection({
  adapter: oversizedInstructionPair.adapter,
  model: ALLOWED_MODEL,
  baseInstruction: oversizedInstruction,
  userMessage,
  history: frozenHistory,
  policyLane: "general-consultative",
});
assertEqual("correction: oversized instruction 0 calls", oversizedInstructionRun.providerCallCount, 0);
assertEqual("correction: oversized instruction reason", oversizedInstructionRun.reasonCode, "invalid-input");
assertEqual(
  "correction: oversized instruction did not use transport",
  oversizedInstructionPair.transport.callCount,
  0
);
assertExcludes(
  "correction: oversized instruction not leaked in result",
  JSON.stringify(oversizedInstructionRun),
  oversizedInstructionMarker
);

const correctionBadAdapterPair = adapterWith({ type: "text", text: SAFE_GENERAL_TEXT });
const correctionBadAdapter = await runConversationCoreMaxOneCorrection({
  adapter: {} as ConversationCoreGeminiAdapter,
  model: ALLOWED_MODEL,
  baseInstruction: systemInstruction,
  userMessage,
  history: frozenHistory,
  policyLane: "general-consultative",
});
assertEqual("correction: invalid adapter 0 calls", correctionBadAdapter.providerCallCount, 0);
assertEqual("correction: invalid adapter did not use transport", correctionBadAdapterPair.transport.callCount, 0);

const correctionBadFlag = adapterWith({ type: "text", text: SAFE_GENERAL_TEXT });
const correctionStringFlag = await runConversationCoreMaxOneCorrection({
  adapter: correctionBadFlag.adapter,
  model: ALLOWED_MODEL,
  baseInstruction: systemInstruction,
  userMessage,
  history: frozenHistory,
  policyLane: "general-consultative",
  candidateContext: { highRiskTopicDeclared: "true" },
} as unknown as ConversationCoreMaxOneCorrectionInput);
assertEqual("correction: string optional flag not silently omitted", correctionBadFlag.transport.callCount, 0);
assertEqual("correction: string optional flag reason", correctionStringFlag.reasonCode, "invalid-input");

let timeoutCancelCount = 0;
const pendingPair = adapterWith({ type: "pending" }, {
  timeoutMs: 5,
  scheduleTimeout: immediateTimeoutScheduler(() => {
    timeoutCancelCount += 1;
  }),
});
const pendingResult = await pendingPair.adapter.generate(adapterInput);
assertEqual("timeout: pending fake returns provider-timeout", pendingResult.ok, false);
if (pendingResult.ok === false) {
  assertEqual("timeout: pending code", pendingResult.code, "provider-timeout");
}
assertEqual("timeout: pending does not retry", pendingPair.transport.callCount, 1);
assertTruthy("timeout: timer cleanup ran", timeoutCancelCount >= 1);
assertExcludes("timeout: no raw stack in adapter result", JSON.stringify(pendingResult), "Error");

function resolveConfigUnchecked(label: string, input: unknown) {
  try {
    return resolveConversationCoreGeminiConfig(input);
  } catch {
    console.error(`FAIL [${label}] resolver threw`);
    process.exit(1);
  }
}

for (const bad of [null, undefined, 1, "true", true, ["env"]]) {
  const label = JSON.stringify(bad);
  const resolved = resolveConfigUnchecked(`config: ${label} does not throw`, bad);
  assertEqual(`config: ${label} fail closed disabled`, resolved.status, "disabled");
}

const missingReadEnv = resolveConfigUnchecked("config: missing readEnv does not throw", {});
assertEqual("config: missing readEnv unavailable", missingReadEnv.status, "unavailable");
if (missingReadEnv.status === "unavailable") {
  assertEqual("config: missing readEnv reason", missingReadEnv.reasonCode, "invalid-config");
}

const nonFnReadEnv = resolveConfigUnchecked("config: non-function readEnv does not throw", {
  readEnv: "not-a-function",
});
assertEqual("config: non-function readEnv fail closed", nonFnReadEnv.status, "unavailable");

const throwingReadEnv = resolveConfigUnchecked("config: throwing readEnv does not throw", {
  readEnv: () => {
    throw new Error("GEMINI_API_KEY=secret-stack-value\n    at readEnv");
  },
});
assertEqual("config: throwing readEnv status", throwingReadEnv.status, "unavailable");
if (throwingReadEnv.status === "unavailable") {
  assertEqual("config: throwing readEnv reason", throwingReadEnv.reasonCode, "invalid-config");
}
assertExcludes(
  "config: throwing readEnv serialization has no secret",
  JSON.stringify(throwingReadEnv),
  "secret-stack-value"
);
assertExcludes(
  "config: throwing readEnv serialization has no stack",
  JSON.stringify(throwingReadEnv),
  "at readEnv"
);

const throwAfterEnable = resolveConfigUnchecked("config: later key throw does not throw", {
  readEnv: (key: string) => {
    if (key === NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV) {
      return "true";
    }
    throw new Error("env boom");
  },
});
assertEqual("config: later key throw status", throwAfterEnable.status, "unavailable");

for (const badReady of ["true", 1, null, { ok: true }, ["true"]]) {
  const resolved = resolveConfigUnchecked(`config: apiKeyReady ${String(badReady)} does not throw`, {
    readEnv: envReader({
      [NONGA_CONVERSATION_CORE_GEMINI_ENABLED_ENV]: "true",
      [NONGA_CONVERSATION_CORE_GEMINI_MODEL_ENV]: ALLOWED_MODEL,
    }),
    apiKeyReady: badReady,
  });
  assertEqual(`config: apiKeyReady ${String(badReady)} fail closed`, resolved.status, "unavailable");
  if (resolved.status === "unavailable") {
    assertEqual(
      `config: apiKeyReady ${String(badReady)} reason`,
      resolved.reasonCode,
      "invalid-config"
    );
  }
}

const correctionBadModelPair = adapterWith({ type: "text", text: SAFE_GENERAL_TEXT });
const correctionBadModel = await runConversationCoreMaxOneCorrection({
  adapter: correctionBadModelPair.adapter,
  model: "gpt-4o",
  baseInstruction: systemInstruction,
  userMessage,
  history: frozenHistory,
  policyLane: "general-consultative",
});
assertEqual("correction: non-allowlisted model 0 calls", correctionBadModel.providerCallCount, 0);
assertEqual("correction: non-allowlisted model reason", correctionBadModel.reasonCode, "invalid-input");
assertEqual(
  "correction: non-allowlisted model did not use transport",
  correctionBadModelPair.transport.callCount,
  0
);

const correctionArbitraryModel = await runConversationCoreMaxOneCorrection({
  adapter: adapterWith({ type: "text", text: SAFE_GENERAL_TEXT }).adapter,
  model: "gemini-pro",
  baseInstruction: systemInstruction,
  userMessage,
  history: frozenHistory,
  policyLane: "general-consultative",
});
assertEqual("correction: arbitrary model 0 calls", correctionArbitraryModel.providerCallCount, 0);

const correctionEmptyUser = await runConversationCoreMaxOneCorrection({
  adapter: adapterWith({ type: "text", text: SAFE_GENERAL_TEXT }).adapter,
  model: ALLOWED_MODEL,
  baseInstruction: systemInstruction,
  userMessage: "   ",
  history: frozenHistory,
  policyLane: "general-consultative",
});
assertEqual("correction: empty userMessage 0 calls", correctionEmptyUser.providerCallCount, 0);

const oversizedUser = "ก".repeat(CONVERSATION_CORE_MAX_MESSAGE_LENGTH + 1);
const correctionOversizedUser = await runConversationCoreMaxOneCorrection({
  adapter: adapterWith({ type: "text", text: SAFE_GENERAL_TEXT }).adapter,
  model: ALLOWED_MODEL,
  baseInstruction: systemInstruction,
  userMessage: oversizedUser,
  history: frozenHistory,
  policyLane: "general-consultative",
});
assertEqual("correction: oversized userMessage 0 calls", correctionOversizedUser.providerCallCount, 0);

const excessiveHistory = Array.from({ length: CONVERSATION_CORE_MAX_HISTORY_TURNS + 1 }, () => ({
  role: "user" as const,
  content: "สวัสดีครับ",
}));
const correctionExcessiveHistory = await runConversationCoreMaxOneCorrection({
  adapter: adapterWith({ type: "text", text: SAFE_GENERAL_TEXT }).adapter,
  model: ALLOWED_MODEL,
  baseInstruction: systemInstruction,
  userMessage,
  history: excessiveHistory,
  policyLane: "general-consultative",
});
assertEqual("correction: excessive history 0 calls", correctionExcessiveHistory.providerCallCount, 0);

const correctionMalformedHistory = await runConversationCoreMaxOneCorrection({
  adapter: adapterWith({ type: "text", text: SAFE_GENERAL_TEXT }).adapter,
  model: ALLOWED_MODEL,
  baseInstruction: systemInstruction,
  userMessage,
  history: [{ role: "user", content: "สวัสดีครับ", extra: true }],
  policyLane: "general-consultative",
} as unknown as ConversationCoreMaxOneCorrectionInput);
assertEqual("correction: malformed history 0 calls", correctionMalformedHistory.providerCallCount, 0);

const oversizedHistoryTurn = [
  { role: "user" as const, content: "ก".repeat(CONVERSATION_CORE_MAX_MESSAGE_LENGTH + 1) },
];
const correctionOversizedHistoryTurn = await runConversationCoreMaxOneCorrection({
  adapter: adapterWith({ type: "text", text: SAFE_GENERAL_TEXT }).adapter,
  model: ALLOWED_MODEL,
  baseInstruction: systemInstruction,
  userMessage,
  history: oversizedHistoryTurn,
  policyLane: "general-consultative",
});
assertEqual(
  "correction: oversized history turn 0 calls",
  correctionOversizedHistoryTurn.providerCallCount,
  0
);

const heavyHistory = Array.from({ length: CONVERSATION_CORE_MAX_HISTORY_TURNS }, () => ({
  role: "user" as const,
  content: "ก".repeat(Math.floor(CONVERSATION_CORE_MAX_HISTORY_CONTENT_CHARS / 10)),
}));
const correctionHeavyHistory = await runConversationCoreMaxOneCorrection({
  adapter: adapterWith({ type: "text", text: SAFE_GENERAL_TEXT }).adapter,
  model: ALLOWED_MODEL,
  baseInstruction: systemInstruction,
  userMessage,
  history: heavyHistory,
  policyLane: "general-consultative",
});
assertEqual("correction: oversized history total 0 calls", correctionHeavyHistory.providerCallCount, 0);

const emptyHistoryContent = await runConversationCoreMaxOneCorrection({
  adapter: adapterWith({ type: "text", text: SAFE_GENERAL_TEXT }).adapter,
  model: ALLOWED_MODEL,
  baseInstruction: systemInstruction,
  userMessage,
  history: [{ role: "user", content: "   " }],
  policyLane: "general-consultative",
});
assertEqual("correction: empty history content 0 calls", emptyHistoryContent.providerCallCount, 0);

const syncThrowPair = adapterWith({
  type: "sync-throw",
  message: "GEMINI_API_KEY=leak-sync\n    at generate",
});
const syncThrowResult = await syncThrowPair.adapter.generate(adapterInput);
assertEqual("adapter: sync throw ok false", syncThrowResult.ok, false);
if (syncThrowResult.ok === false) {
  assertEqual("adapter: sync throw code", syncThrowResult.code, "provider-error");
}
assertEqual("adapter: sync throw one call", syncThrowPair.transport.callCount, 1);
assertExcludes("adapter: sync throw has no secret", JSON.stringify(syncThrowResult), "leak-sync");
assertExcludes("adapter: sync throw has no stack", JSON.stringify(syncThrowResult), "at generate");

const rejectPair = adapterWith({
  type: "reject",
  message: "GEMINI_API_KEY=leak-reject",
});
const rejectResult = await rejectPair.adapter.generate(adapterInput);
assertEqual("adapter: rejected promise ok false", rejectResult.ok, false);
if (rejectResult.ok === false) {
  assertEqual("adapter: rejected promise code", rejectResult.code, "provider-error");
}
assertEqual("adapter: rejected promise no retry", rejectPair.transport.callCount, 1);
assertExcludes("adapter: rejected promise has no secret", JSON.stringify(rejectResult), "leak-reject");

for (const raw of [null, undefined, ["text"], { kind: "weird" }]) {
  const pair = adapterWith({ type: "raw", value: raw });
  const result = await pair.adapter.generate(adapterInput);
  assertEqual(`adapter: raw ${String(raw)} ok false`, result.ok, false);
  if (result.ok === false) {
    assertEqual(`adapter: raw ${String(raw)} malformed`, result.code, "malformed-response");
  }
  assertEqual(`adapter: raw ${String(raw)} no retry`, pair.transport.callCount, 1);
}

const throwingAdapter: ConversationCoreGeminiAdapter = {
  generate() {
    throw new Error("GEMINI_API_KEY=correction-sync-leak");
  },
};
const correctionSyncThrow = await runConversationCoreMaxOneCorrection({
  adapter: throwingAdapter,
  model: ALLOWED_MODEL,
  baseInstruction: systemInstruction,
  userMessage,
  history: frozenHistory,
  policyLane: "general-consultative",
});
assertEqual("correction: adapter sync throw counted", correctionSyncThrow.providerCallCount, 1);
assertEqual("correction: adapter sync throw reason", correctionSyncThrow.reasonCode, "provider-error");
assertExcludes(
  "correction: adapter sync throw serialization has no secret",
  JSON.stringify(correctionSyncThrow),
  "correction-sync-leak"
);

const rejectingAdapter: ConversationCoreGeminiAdapter = {
  generate() {
    return Promise.reject(new Error("GEMINI_API_KEY=correction-reject-leak"));
  },
};
const correctionReject = await runConversationCoreMaxOneCorrection({
  adapter: rejectingAdapter,
  model: ALLOWED_MODEL,
  baseInstruction: systemInstruction,
  userMessage,
  history: frozenHistory,
  policyLane: "general-consultative",
});
assertEqual("correction: adapter reject counted", correctionReject.providerCallCount, 1);
assertEqual("correction: adapter reject reason", correctionReject.reasonCode, "provider-error");
assertExcludes(
  "correction: adapter reject serialization has no secret",
  JSON.stringify(correctionReject),
  "correction-reject-leak"
);

const invalidFallback = await runExecution({
  lane: "high-risk-automotive",
  raw: { fallbackBuilder: "not-a-function" },
});
assertEqual("fallback: invalid builder 0 calls", invalidFallback.transport.callCount, 0);
if (invalidFallback.result.kind === "honest-unavailable") {
  assertEqual("fallback: invalid builder reason", invalidFallback.result.reasonCode, "invalid-input");
}

const throwingFallback = await runExecution({
  lane: "high-risk-automotive",
  script: { type: "text", text: HARD_REJECT_HIGH_RISK_TEXT },
  fallbackBuilder: () => {
    throw new Error("GEMINI_API_KEY=fallback-leak");
  },
});
assertEqual("fallback: throwing builder kind", throwingFallback.result.kind, "honest-unavailable");
assertEqual("fallback: throwing builder no extra provider call", throwingFallback.transport.callCount, 1);
if (throwingFallback.result.kind === "honest-unavailable") {
  assertEqual("fallback: throwing builder reason", throwingFallback.result.reasonCode, "fallback-invalid");
}
assertExcludes(
  "fallback: throwing builder serialization has no secret",
  JSON.stringify(throwingFallback.result),
  "fallback-leak"
);

const malformedFallback = await runExecution({
  lane: "high-risk-automotive",
  script: { type: "text", text: HARD_REJECT_HIGH_RISK_TEXT },
  fallbackBuilder: () => null as never,
});
assertEqual("fallback: malformed builder kind", malformedFallback.result.kind, "honest-unavailable");
assertEqual("fallback: malformed builder no extra provider call", malformedFallback.transport.callCount, 1);
if (malformedFallback.result.kind === "honest-unavailable") {
  assertEqual("fallback: malformed builder reason", malformedFallback.result.reasonCode, "fallback-invalid");
}

assertEqual("regression: max provider calls remains 2", CONVERSATION_CORE_MAX_PROVIDER_CALLS, 2);
assertEqual("regression: timeout still bounded default", CONVERSATION_CORE_GEMINI_DEFAULT_TIMEOUT_MS, 8_000);
assertEqual("flags: geminiEnabled false still 0 calls", geminiFlagOff.transport.callCount, 0);
assertEqual("trusted: true still 0 calls", trustedTrue.transport.callCount, 0);

const generalTimeoutExec = await runExecution({
  lane: "general-consultative",
  script: { type: "pending" },
  timeoutMs: 5,
  scheduleTimeout: immediateTimeoutScheduler(),
});
assertEqual("timeout: general kind", generalTimeoutExec.result.kind, "honest-unavailable");
assertEqual("timeout: general no retry", generalTimeoutExec.transport.callCount, 1);
if (generalTimeoutExec.result.kind === "honest-unavailable") {
  assertEqual("timeout: general reason", generalTimeoutExec.result.reasonCode, "provider-timeout");
}

const highRiskTimeoutExec = await runExecution({
  lane: "high-risk-automotive",
  script: { type: "pending" },
  timeoutMs: 5,
  scheduleTimeout: immediateTimeoutScheduler(),
});
assertEqual("timeout: high-risk kind", highRiskTimeoutExec.result.kind, "completed");
assertEqual("timeout: high-risk no retry", highRiskTimeoutExec.transport.callCount, 1);
if (highRiskTimeoutExec.result.kind === "completed") {
  assertEqual(
    "timeout: high-risk uses fallback text",
    highRiskTimeoutExec.result.result.assistantText,
    CONVERSATION_CORE_HIGH_RISK_FALLBACK_TEXT
  );
}

assertFalsy(
  "boundary: production adapter has no fake transport factory",
  /createFakeConversationCoreGeminiTransport/.test(adapterSource)
);
assertFalsy(
  "boundary: production adapter has no mutable SDK call counter",
  /sdkNetworkCallCount/.test(adapterSource)
);
assertFalsy(
  "boundary: barrel has no fake transport export",
  /createFakeConversationCoreGeminiTransport/.test(indexSource)
);
assertFalsy(
  "boundary: barrel has no SDK call counter export",
  /getConversationCoreGeminiSdkNetworkCallCount/.test(indexSource)
);
assertFalsy(
  "boundary: test path does not invoke production SDK factory",
  /createConversationCoreGeminiSdkTransport\s*\(/.test(
    read("scripts/test-conversation-core-gemini-correction.mts")
  )
);

if (passCount < 400) {
  console.error(`FAIL expected at least 400 assertions, got ${passCount}`);
  process.exit(1);
}

console.log(`\nConversation Core Gemini/correction tests passed (${passCount} assertions).`);
