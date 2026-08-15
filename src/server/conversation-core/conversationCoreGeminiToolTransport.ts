/**
 * WP-V2U-03E2B2 — Mock-tested Gemini structured tool transport (no runtime wiring).
 */
import {
  FunctionCallingConfigMode,
  GoogleGenAI,
  createPartFromFunctionResponse,
  type FunctionCall,
  type GenerateContentConfig,
} from "@google/genai";
import {
  CONVERSATION_CORE_MAX_MESSAGE_LENGTH,
  isForbiddenToolName,
  isPhase1ReadOnlyToolName,
  validateConversationCoreGeminiTurnOutcome,
  validateToolResult,
  type ConversationCoreGeminiTurnOutcome,
  type ConversationCoreToolName,
  type ToolResult,
} from "../../services/conversation-core/index";
import {
  CONVERSATION_CORE_GEMINI_DEFAULT_TIMEOUT_MS,
  resolveConversationCoreGeminiTimeoutMs,
  type ConversationCoreGeminiContentTurn,
  type ConversationCoreGeminiTimeoutHandle,
} from "./conversationCoreGeminiAdapter";
import { buildConversationCoreGeminiFunctionDeclarations } from "./conversationCoreGeminiFunctionDeclarations";

const MAX_MARKETPLACE_LISTING_IDS_FOR_GEMINI = 10;

const SAFETY_BLOCKED_FINISH_REASONS = new Set([
  "SAFETY",
  "BLOCKLIST",
  "PROHIBITED_CONTENT",
  "SPII",
  "MALFORMED_FUNCTION_CALL",
  "UNEXPECTED_TOOL_CALL",
]);

export const CONVERSATION_CORE_GEMINI_TOOL_TRANSPORT_ERROR_CODES = [
  "sdk-unavailable",
  "provider-timeout",
  "provider-aborted",
  "provider-error",
  "safety-blocked",
  "empty-candidate",
  "multiple-candidates",
  "mixed-text-function-response",
  "multiple-function-calls",
  "function-call-view-mismatch",
  "unknown-function-name",
  "function-not-allowed-for-turn",
  "invalid-function-args",
  "invalid-mapped-turn-outcome",
  "invalid-validated-tool-result-input",
  "tool-result-not-ok",
  "tool-result-name-mismatch",
  "invalid-function-response-construction",
  "follow-up-function-call-rejected",
  "non-text-follow-up",
  "oversized-tool-result",
  "malformed-response",
  "empty-response",
  "oversized-response",
  "invalid-allowed-tool-declarations",
] as const;

export type ConversationCoreGeminiToolTransportErrorCode =
  (typeof CONVERSATION_CORE_GEMINI_TOOL_TRANSPORT_ERROR_CODES)[number];

export type ConversationCoreGeminiToolTransportResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly code: ConversationCoreGeminiToolTransportErrorCode };

export interface ConversationCoreGeminiToolTransportGenerateContentRequest {
  readonly model: string;
  readonly contents: readonly unknown[];
  readonly config: {
    readonly systemInstruction: string;
    readonly tools?: readonly unknown[];
    readonly toolConfig?: {
      readonly functionCallingConfig?: {
        readonly mode?: FunctionCallingConfigMode;
        readonly allowedFunctionNames?: readonly string[];
      };
    };
    readonly automaticFunctionCalling?: { readonly disable?: boolean };
    readonly abortSignal?: AbortSignal;
    readonly httpOptions?: {
      readonly timeout: number;
      readonly retryOptions: { readonly attempts: number };
    };
  };
}

export interface ConversationCoreGeminiToolTransportSdkSeam {
  generateContent(
    request: ConversationCoreGeminiToolTransportGenerateContentRequest
  ): Promise<unknown>;
}

export interface ConversationCoreGeminiProviderFunctionCallContext {
  readonly functionName: ConversationCoreToolName;
  readonly args: Record<string, unknown>;
  readonly callId?: string;
  readonly modelContent: {
    readonly role: "model";
    readonly parts: ReadonlyArray<{
      readonly functionCall: {
        readonly name: string;
        readonly args?: Record<string, unknown>;
        readonly id?: string;
      };
    }>;
  };
}

export interface ConversationCoreGeminiStructuredInitialTurnInput {
  readonly model: string;
  readonly systemInstruction: string;
  readonly contents: readonly ConversationCoreGeminiContentTurn[];
  readonly allowedToolNames: readonly ConversationCoreToolName[];
  readonly transport: ConversationCoreGeminiToolTransportSdkSeam;
  readonly timeoutMs?: number;
  readonly scheduleTimeout?: (
    callback: () => void,
    ms: number
  ) => ConversationCoreGeminiTimeoutHandle;
}

export interface ConversationCoreGeminiStructuredInitialTurnSuccess {
  readonly outcome: ConversationCoreGeminiTurnOutcome;
  readonly providerContext?: ConversationCoreGeminiProviderFunctionCallContext;
}

export interface ConversationCoreGeminiFinalAnswerFromToolResultInput {
  readonly model: string;
  readonly systemInstruction: string;
  readonly contents: readonly ConversationCoreGeminiContentTurn[];
  readonly providerContext: ConversationCoreGeminiProviderFunctionCallContext;
  readonly toolResult: unknown;
  readonly transport: ConversationCoreGeminiToolTransportSdkSeam;
  readonly timeoutMs?: number;
  readonly scheduleTimeout?: (
    callback: () => void,
    ms: number
  ) => ConversationCoreGeminiTimeoutHandle;
}

function freezeOk<T>(value: T): ConversationCoreGeminiToolTransportResult<T> {
  return Object.freeze({ ok: true as const, value });
}

function freezeFail<T>(
  code: ConversationCoreGeminiToolTransportErrorCode
): ConversationCoreGeminiToolTransportResult<T> {
  return Object.freeze({ ok: false as const, code });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!isPlainObject(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function stableJson(value: unknown): string {
  if (!isPlainRecord(value)) {
    return JSON.stringify(value);
  }
  const sortedKeys = Object.keys(value).sort();
  const normalized: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    normalized[key] = value[key];
  }
  return JSON.stringify(normalized);
}

function normalizeFunctionCall(call: FunctionCall | undefined | null): {
  name: string;
  id?: string;
  argsJson: string;
} | null {
  if (!call || typeof call.name !== "string") {
    return null;
  }
  const name = call.name.trim();
  if (!name) {
    return null;
  }
  return {
    name,
    id: typeof call.id === "string" && call.id.trim() ? call.id.trim() : undefined,
    argsJson: stableJson(call.args ?? {}),
  };
}

function callsEquivalent(
  left: ReturnType<typeof normalizeFunctionCall>,
  right: ReturnType<typeof normalizeFunctionCall>
): boolean {
  if (!left || !right) {
    return false;
  }
  return left.name === right.name && left.id === right.id && left.argsJson === right.argsJson;
}

function partHasUnsafeNonText(part: Record<string, unknown>): boolean {
  return (
    part.executableCode !== undefined ||
    part.codeExecutionResult !== undefined ||
    part.inlineData !== undefined ||
    part.fileData !== undefined ||
    part.toolCall !== undefined ||
    part.functionResponse !== undefined
  );
}

function isThoughtPart(part: Record<string, unknown>): boolean {
  return part.thought === true;
}

function isSafetyBlockedCandidate(candidate: Record<string, unknown>): boolean {
  const finishReason = candidate.finishReason;
  return typeof finishReason === "string" && SAFETY_BLOCKED_FINISH_REASONS.has(finishReason);
}

function extractTopLevelFunctionCalls(response: Record<string, unknown>): FunctionCall[] {
  if (Array.isArray(response.functionCalls)) {
    return response.functionCalls as FunctionCall[];
  }
  if (Array.isArray(response.function_calls)) {
    return response.function_calls as FunctionCall[];
  }
  return [];
}

function extractCandidateFunctionCalls(candidate: Record<string, unknown>): FunctionCall[] {
  const content = candidate.content;
  if (!isPlainObject(content) || !Array.isArray(content.parts)) {
    return [];
  }
  const calls: FunctionCall[] = [];
  for (const part of content.parts) {
    if (!isPlainObject(part)) {
      continue;
    }
    if (part.functionCall && isPlainObject(part.functionCall)) {
      calls.push(part.functionCall as FunctionCall);
    }
    if (part.function_call && isPlainObject(part.function_call)) {
      calls.push(part.function_call as FunctionCall);
    }
  }
  return calls;
}

function extractOrdinaryTextParts(candidate: Record<string, unknown>): string {
  const content = candidate.content;
  if (!isPlainObject(content) || !Array.isArray(content.parts)) {
    return "";
  }
  const chunks: string[] = [];
  for (const part of content.parts) {
    if (!isPlainObject(part) || isThoughtPart(part)) {
      continue;
    }
    if (typeof part.text === "string") {
      chunks.push(part.text);
    }
  }
  return chunks.join("");
}

function candidateHasUnsafeParts(candidate: Record<string, unknown>): boolean {
  const content = candidate.content;
  if (!isPlainObject(content) || !Array.isArray(content.parts)) {
    return false;
  }
  for (const part of content.parts) {
    if (!isPlainObject(part) || isThoughtPart(part)) {
      continue;
    }
    if (partHasUnsafeNonText(part)) {
      return true;
    }
  }
  return false;
}

function resolveSingleFunctionCall(input: {
  candidateCalls: FunctionCall[];
  topLevelCalls: FunctionCall[];
}):
  | { ok: true; call: FunctionCall }
  | { ok: false; code: ConversationCoreGeminiToolTransportErrorCode } {
  const canonicalCalls = input.candidateCalls;
  if (canonicalCalls.length > 1) {
    return { ok: false, code: "multiple-function-calls" };
  }
  if (canonicalCalls.length === 0) {
    return { ok: false, code: "malformed-response" };
  }

  const canonical = normalizeFunctionCall(canonicalCalls[0]);
  if (!canonical) {
    return { ok: false, code: "malformed-response" };
  }

  if (input.topLevelCalls.length > 1) {
    return { ok: false, code: "multiple-function-calls" };
  }

  if (input.topLevelCalls.length === 1) {
    const top = normalizeFunctionCall(input.topLevelCalls[0]);
    if (!callsEquivalent(canonical, top)) {
      return { ok: false, code: "function-call-view-mismatch" };
    }
  }

  return { ok: true, call: canonicalCalls[0]! };
}

function mapProviderException(error: unknown): ConversationCoreGeminiToolTransportErrorCode {
  if (error && typeof error === "object") {
    const record = error as { name?: unknown; code?: unknown };
    const name = typeof record.name === "string" ? record.name : "";
    const code = typeof record.code === "string" ? record.code : "";
    if (name === "AbortError" || code === "ABORT_ERR" || code === "ERR_CANCELED") {
      return "provider-aborted";
    }
    if (
      name === "TimeoutError" ||
      code === "ETIMEDOUT" ||
      code === "ERR_TIMEOUT" ||
      code === "timeout"
    ) {
      return "provider-timeout";
    }
  }
  return "provider-error";
}

function defaultScheduleTimeout(
  callback: () => void,
  ms: number
): ConversationCoreGeminiTimeoutHandle {
  const id = setTimeout(callback, ms);
  return {
    cancel() {
      clearTimeout(id);
    },
  };
}

async function raceWithTimeout<T>(input: {
  promise: Promise<T>;
  timeoutMs: number;
  scheduleTimeout?: (callback: () => void, ms: number) => ConversationCoreGeminiTimeoutHandle;
  onTimeout: () => void;
}): Promise<T> {
  const scheduleTimeout = input.scheduleTimeout ?? defaultScheduleTimeout;
  let settled = false;
  let handle: ConversationCoreGeminiTimeoutHandle | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    handle = scheduleTimeout(() => {
      if (settled) {
        return;
      }
      input.onTimeout();
      const error = new Error("provider-timeout");
      error.name = "TimeoutError";
      (error as Error & { code?: string }).code = "ETIMEDOUT";
      reject(error);
    }, input.timeoutMs);
  });
  try {
    return await Promise.race([input.promise, timeoutPromise]);
  } finally {
    settled = true;
    handle?.cancel();
  }
}

async function invokeTransport(input: {
  transport: ConversationCoreGeminiToolTransportSdkSeam;
  request: ConversationCoreGeminiToolTransportGenerateContentRequest;
  timeoutMs?: number;
  scheduleTimeout?: (callback: () => void, ms: number) => ConversationCoreGeminiTimeoutHandle;
}): Promise<ConversationCoreGeminiToolTransportResult<unknown>> {
  const controller = new AbortController();
  const timeoutMs = resolveConversationCoreGeminiTimeoutMs(
    input.timeoutMs ?? CONVERSATION_CORE_GEMINI_DEFAULT_TIMEOUT_MS
  );
  try {
    const response = await raceWithTimeout({
      promise: input.transport.generateContent({
        ...input.request,
        config: {
          ...input.request.config,
          abortSignal: controller.signal,
          httpOptions: {
            timeout: timeoutMs,
            retryOptions: { attempts: 1 },
          },
        },
      }),
      timeoutMs,
      scheduleTimeout: input.scheduleTimeout,
      onTimeout: () => controller.abort(),
    });
    return freezeOk(response);
  } catch (error) {
    if (!controller.signal.aborted) {
      controller.abort();
    }
    return freezeFail(mapProviderException(error));
  }
}

function parseInitialCandidate(input: {
  response: Record<string, unknown>;
  allowedToolNames: readonly ConversationCoreToolName[];
}):
  | {
      ok: true;
      value: ConversationCoreGeminiStructuredInitialTurnSuccess;
    }
  | { ok: false; code: ConversationCoreGeminiToolTransportErrorCode } {
  const candidates = Array.isArray(input.response.candidates) ? input.response.candidates : [];
  if (candidates.length === 0) {
    return { ok: false, code: "empty-candidate" };
  }
  if (candidates.length > 1) {
    return { ok: false, code: "multiple-candidates" };
  }

  const candidate = candidates[0];
  if (!isPlainObject(candidate)) {
    return { ok: false, code: "malformed-response" };
  }
  if (isSafetyBlockedCandidate(candidate)) {
    return { ok: false, code: "safety-blocked" };
  }
  if (candidateHasUnsafeParts(candidate)) {
    return { ok: false, code: "malformed-response" };
  }

  const allowedSet = new Set(input.allowedToolNames);
  const topLevelCalls = extractTopLevelFunctionCalls(input.response);
  const candidateCalls = extractCandidateFunctionCalls(candidate);
  const ordinaryText = extractOrdinaryTextParts(candidate).trim();

  if (candidateCalls.length > 0) {
    if (ordinaryText.length > 0) {
      return { ok: false, code: "mixed-text-function-response" };
    }
    const resolved = resolveSingleFunctionCall({ candidateCalls, topLevelCalls });
    if (resolved.ok === false) {
      return { ok: false, code: resolved.code };
    }
    const call = resolved.call;
    const toolName = typeof call.name === "string" ? call.name.trim() : "";
    if (!toolName) {
      return { ok: false, code: "unknown-function-name" };
    }
    if (isForbiddenToolName(toolName) || !isPhase1ReadOnlyToolName(toolName)) {
      return { ok: false, code: "unknown-function-name" };
    }
    if (!allowedSet.has(toolName)) {
      return { ok: false, code: "function-not-allowed-for-turn" };
    }
    if (!isPlainRecord(call.args)) {
      return { ok: false, code: "invalid-function-args" };
    }

    const outcomeValidation = validateConversationCoreGeminiTurnOutcome({
      kind: "tool-request",
      toolName,
      toolInput: call.args,
    });
    if (!outcomeValidation.ok) {
      return { ok: false, code: "invalid-mapped-turn-outcome" };
    }
    if (outcomeValidation.value.kind !== "tool-request") {
      return { ok: false, code: "invalid-mapped-turn-outcome" };
    }

    const providerContext: ConversationCoreGeminiProviderFunctionCallContext = Object.freeze({
      functionName: outcomeValidation.value.toolName,
      args: outcomeValidation.value.toolInput,
      callId: typeof call.id === "string" ? call.id : undefined,
      modelContent: Object.freeze({
        role: "model" as const,
        parts: Object.freeze([
          Object.freeze({
            functionCall: Object.freeze({
              name: toolName,
              args: outcomeValidation.value.toolInput,
              ...(typeof call.id === "string" ? { id: call.id } : {}),
            }),
          }),
        ]),
      }),
    });

    return {
      ok: true,
      value: Object.freeze({
        outcome: outcomeValidation.value,
        providerContext,
      }),
    };
  }

  if (topLevelCalls.length > 0) {
    return { ok: false, code: "function-call-view-mismatch" };
  }

  if (!ordinaryText) {
    return { ok: false, code: "empty-candidate" };
  }
  if (ordinaryText.length > CONVERSATION_CORE_MAX_MESSAGE_LENGTH) {
    return { ok: false, code: "oversized-response" };
  }

  const outcomeValidation = validateConversationCoreGeminiTurnOutcome({
    kind: "final-answer",
    assistantText: ordinaryText,
  });
  if (!outcomeValidation.ok) {
    return { ok: false, code: "invalid-mapped-turn-outcome" };
  }
  if (outcomeValidation.value.kind !== "final-answer") {
    return { ok: false, code: "invalid-mapped-turn-outcome" };
  }

  return {
    ok: true,
    value: Object.freeze({
      outcome: outcomeValidation.value,
    }),
  };
}

function trimToolResultDataForGemini(toolResult: ToolResult): Record<string, unknown> {
  if (!toolResult.data) {
    return {};
  }
  if (toolResult.toolName === "marketplace.search" || toolResult.toolName === "inventory.fetch") {
    const listingIds = toolResult.data.listingIds.slice(0, MAX_MARKETPLACE_LISTING_IDS_FOR_GEMINI);
    if (toolResult.toolName === "marketplace.search") {
      return {
        listingIds,
        query: toolResult.data.query,
      };
    }
    return { listingIds };
  }
  if (toolResult.toolName === "vehicle.resolveSelection") {
    return {
      listingId: toolResult.data.listingId,
      resolved: toolResult.data.resolved,
    };
  }
  return { ...toolResult.data };
}

function buildGeminiFunctionResponsePayload(toolResult: ToolResult): Record<string, unknown> {
  return {
    status: "ok",
    provenance: toolResult.provenance,
    data: trimToolResultDataForGemini(toolResult),
  };
}

function parseFinalAnswerCandidate(
  response: Record<string, unknown>
): ConversationCoreGeminiToolTransportResult<string> {
  const candidates = Array.isArray(response.candidates) ? response.candidates : [];
  if (candidates.length === 0) {
    return freezeFail("empty-candidate");
  }
  if (candidates.length > 1) {
    return freezeFail("multiple-candidates");
  }

  const candidate = candidates[0];
  if (!isPlainObject(candidate)) {
    return freezeFail("malformed-response");
  }
  if (isSafetyBlockedCandidate(candidate)) {
    return freezeFail("safety-blocked");
  }
  if (candidateHasUnsafeParts(candidate)) {
    return freezeFail("non-text-follow-up");
  }

  const topLevelCalls = extractTopLevelFunctionCalls(response);
  const candidateCalls = extractCandidateFunctionCalls(candidate);
  if (topLevelCalls.length > 0 || candidateCalls.length > 0) {
    return freezeFail("follow-up-function-call-rejected");
  }

  const text = extractOrdinaryTextParts(candidate).trim();
  if (!text) {
    return freezeFail("empty-response");
  }
  if (text.length > CONVERSATION_CORE_MAX_MESSAGE_LENGTH) {
    return freezeFail("oversized-response");
  }

  return freezeOk(text);
}

export async function generateStructuredInitialTurn(
  input: ConversationCoreGeminiStructuredInitialTurnInput
): Promise<ConversationCoreGeminiToolTransportResult<ConversationCoreGeminiStructuredInitialTurnSuccess>> {
  const declarationsResult = buildConversationCoreGeminiFunctionDeclarations(input.allowedToolNames);
  if (!declarationsResult.ok) {
    return freezeFail("invalid-allowed-tool-declarations");
  }

  const allowedFunctionNames = input.allowedToolNames.map((name) => name);
  const transportResult = await invokeTransport({
    transport: input.transport,
    timeoutMs: input.timeoutMs,
    scheduleTimeout: input.scheduleTimeout,
    request: {
      model: input.model,
      contents: input.contents,
      config: {
        systemInstruction: input.systemInstruction,
        tools: [{ functionDeclarations: declarationsResult.value }],
        toolConfig: {
          functionCallingConfig: {
            mode: FunctionCallingConfigMode.AUTO,
            allowedFunctionNames,
          },
        },
        automaticFunctionCalling: { disable: true },
      },
    },
  });
  if (transportResult.ok === false) {
    return freezeFail(transportResult.code);
  }
  if (!isPlainObject(transportResult.value)) {
    return freezeFail("malformed-response");
  }

  const parsed = parseInitialCandidate({
    response: transportResult.value,
    allowedToolNames: input.allowedToolNames,
  });
  if (parsed.ok === false) {
    return freezeFail(parsed.code);
  }
  return freezeOk(parsed.value);
}

export async function generateFinalAnswerFromToolResult(
  input: ConversationCoreGeminiFinalAnswerFromToolResultInput
): Promise<ConversationCoreGeminiToolTransportResult<string>> {
  const validated = validateToolResult(input.toolResult);
  if (!validated.ok) {
    return freezeFail("invalid-validated-tool-result-input");
  }
  if (validated.value.toolName !== input.providerContext.functionName) {
    return freezeFail("tool-result-name-mismatch");
  }
  if (validated.value.status !== "ok") {
    return freezeFail("tool-result-not-ok");
  }

  const responsePayload = buildGeminiFunctionResponsePayload(validated.value);
  const payloadJson = JSON.stringify(responsePayload);
  if (payloadJson.length > CONVERSATION_CORE_MAX_MESSAGE_LENGTH) {
    return freezeFail("oversized-tool-result");
  }

  let functionResponsePart: ReturnType<typeof createPartFromFunctionResponse>;
  try {
    functionResponsePart = createPartFromFunctionResponse(
      input.providerContext.callId ?? "",
      input.providerContext.functionName,
      responsePayload
    );
  } catch {
    return freezeFail("invalid-function-response-construction");
  }

  const followUpContents = [
    ...input.contents,
    input.providerContext.modelContent,
    {
      role: "user" as const,
      parts: [functionResponsePart],
    },
  ];

  const transportResult = await invokeTransport({
    transport: input.transport,
    timeoutMs: input.timeoutMs,
    scheduleTimeout: input.scheduleTimeout,
    request: {
      model: input.model,
      contents: followUpContents,
      config: {
        systemInstruction: input.systemInstruction,
        toolConfig: {
          functionCallingConfig: {
            mode: FunctionCallingConfigMode.NONE,
          },
        },
        automaticFunctionCalling: { disable: true },
      },
    },
  });
  if (transportResult.ok === false) {
    return freezeFail(transportResult.code);
  }
  if (!isPlainObject(transportResult.value)) {
    return freezeFail("malformed-response");
  }

  return parseFinalAnswerCandidate(transportResult.value);
}

/** Production SDK seam — inject config; never reads environment at import time. */
export function createConversationCoreGeminiToolTransportSdkSeam(input: {
  readonly apiKey: string;
  readonly timeoutMs?: number;
}): ConversationCoreGeminiToolTransportSdkSeam {
  const client = new GoogleGenAI({ apiKey: input.apiKey });
  const timeoutMs = resolveConversationCoreGeminiTimeoutMs(input.timeoutMs);
  return {
    async generateContent(request) {
      return client.models.generateContent({
        model: request.model,
        contents: request.contents as never,
        config: {
          ...request.config,
          httpOptions: {
            timeout: timeoutMs,
            retryOptions: { attempts: 1 },
            ...(request.config.httpOptions ?? {}),
          },
        } as GenerateContentConfig,
      });
    },
  };
}

export function isConversationCoreGeminiToolTransportErrorCode(
  value: string
): value is ConversationCoreGeminiToolTransportErrorCode {
  return (CONVERSATION_CORE_GEMINI_TOOL_TRANSPORT_ERROR_CODES as readonly string[]).includes(
    value
  );
}
