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

const GEMINI_PROVIDER_ERROR_CLASSES = new Set<ConversationCoreGeminiToolTransportErrorCode>([
  "sdk-unavailable",
  "provider-timeout",
  "provider-aborted",
  "provider-error",
]);

export const CONVERSATION_CORE_BOUNDED_GEMINI_PROVIDER_ERROR_CLASSES = [
  "authentication_failed",
  "permission_denied",
  "quota_exhausted",
  "model_not_found",
  "provider_unavailable",
  "timeout",
  "network_error",
  "request_incompatible",
  "unknown_provider_error",
] as const;

export type ConversationCoreBoundedGeminiProviderErrorClass =
  (typeof CONVERSATION_CORE_BOUNDED_GEMINI_PROVIDER_ERROR_CLASSES)[number];

export const CONVERSATION_CORE_BOUNDED_GEMINI_HTTP_STATUS_CLASSES = ["4xx", "5xx"] as const;

export type ConversationCoreBoundedGeminiHttpStatusClass =
  (typeof CONVERSATION_CORE_BOUNDED_GEMINI_HTTP_STATUS_CLASSES)[number];

export const CONVERSATION_CORE_BOUNDED_GEMINI_STRUCTURED_CODES = [
  "INVALID_ARGUMENT",
  "UNAUTHENTICATED",
  "PERMISSION_DENIED",
  "NOT_FOUND",
  "RESOURCE_EXHAUSTED",
  "UNAVAILABLE",
  "INTERNAL",
  "DEADLINE_EXCEEDED",
  "ABORTED",
] as const;

export type ConversationCoreBoundedGeminiStructuredCode =
  (typeof CONVERSATION_CORE_BOUNDED_GEMINI_STRUCTURED_CODES)[number];

export const CONVERSATION_CORE_BOUNDED_GEMINI_DETAILS_REASONS = ["API_KEY_INVALID"] as const;

export type ConversationCoreBoundedGeminiDetailsReason =
  (typeof CONVERSATION_CORE_BOUNDED_GEMINI_DETAILS_REASONS)[number];

export const CONVERSATION_CORE_BOUNDED_GEMINI_ERROR_NAMES = [
  "ApiError",
  "AbortError",
  "TimeoutError",
  "APIConnectionTimeoutError",
  "APIUserAbortError",
  "APIConnectionError",
  "AuthenticationError",
  "PermissionDeniedError",
  "RateLimitError",
  "NotFoundError",
  "InternalServerError",
] as const;

export type ConversationCoreBoundedGeminiErrorName =
  (typeof CONVERSATION_CORE_BOUNDED_GEMINI_ERROR_NAMES)[number];

const STRUCTURED_GOOGLE_CODES = new Set<string>(CONVERSATION_CORE_BOUNDED_GEMINI_STRUCTURED_CODES);
const DETAILS_REASONS = new Set<string>(CONVERSATION_CORE_BOUNDED_GEMINI_DETAILS_REASONS);
const ALLOWLISTED_ERROR_NAMES = new Set<string>(CONVERSATION_CORE_BOUNDED_GEMINI_ERROR_NAMES);

const NETWORK_SYSTEM_CODES = new Set([
  "ECONNRESET",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ECONNREFUSED",
  "EPIPE",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ECONNABORTED",
  "ERR_NETWORK",
  "ERR_SOCKET",
]);

const TIMEOUT_SYSTEM_CODES = new Set([
  "ETIMEDOUT",
  "ERR_TIMEOUT",
  "timeout",
  "ABORT_ERR",
  "ERR_CANCELED",
]);

const STANDARD_TIMEOUT_NAMES = new Set([
  "AbortError",
  "TimeoutError",
  "APIConnectionTimeoutError",
  "APIUserAbortError",
]);

const STANDARD_NETWORK_NAMES = new Set(["APIConnectionError"]);

const STANDARD_CLASS_BY_NAME: Readonly<Record<string, ConversationCoreBoundedGeminiProviderErrorClass>> =
  Object.freeze({
    AuthenticationError: "authentication_failed",
    PermissionDeniedError: "permission_denied",
    RateLimitError: "quota_exhausted",
    NotFoundError: "model_not_found",
    InternalServerError: "provider_unavailable",
  });

const MAX_PROVIDER_ERROR_ENVELOPE_CHARS = 8192;

type BoundedGeminiErrorSignals = {
  httpStatus?: number;
  httpStatusClass?: ConversationCoreBoundedGeminiHttpStatusClass;
  structuredCode?: ConversationCoreBoundedGeminiStructuredCode;
  detailsReason?: ConversationCoreBoundedGeminiDetailsReason;
  errorName?: ConversationCoreBoundedGeminiErrorName;
  systemCode?: string;
};

function isBoundedIntegerStatus(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 100 && value <= 599;
}

function toHttpStatusClass(status: number): ConversationCoreBoundedGeminiHttpStatusClass | undefined {
  if (status >= 400 && status <= 499) {
    return "4xx";
  }
  if (status >= 500 && status <= 599) {
    return "5xx";
  }
  return undefined;
}

function takeFromSet<T extends string>(value: unknown, allowed: ReadonlySet<string>): T | undefined {
  return typeof value === "string" && allowed.has(value) ? (value as T) : undefined;
}

function readUnknown(record: object, key: string): unknown {
  try {
    return (record as Record<string, unknown>)[key];
  } catch {
    return undefined;
  }
}

function parseGeminiApiErrorEnvelope(message: unknown): Pick<
  BoundedGeminiErrorSignals,
  "httpStatus" | "structuredCode" | "detailsReason"
> {
  if (typeof message !== "string" || message.length === 0 || message.length > MAX_PROVIDER_ERROR_ENVELOPE_CHARS) {
    return {};
  }
  const trimmed = message.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const root = parsed as Record<string, unknown>;
    const nested = readUnknown(root, "error");
    const errorNode =
      nested && typeof nested === "object" && !Array.isArray(nested)
        ? (nested as Record<string, unknown>)
        : root;
    const result: Pick<BoundedGeminiErrorSignals, "httpStatus" | "structuredCode" | "detailsReason"> = {};
    const httpStatus =
      takeHttpStatus(readUnknown(errorNode, "code")) ?? takeHttpStatus(readUnknown(errorNode, "status"));
    if (httpStatus !== undefined) {
      result.httpStatus = httpStatus;
    }
    const structured =
      takeFromSet<ConversationCoreBoundedGeminiStructuredCode>(
        readUnknown(errorNode, "status"),
        STRUCTURED_GOOGLE_CODES
      ) ??
      takeFromSet<ConversationCoreBoundedGeminiStructuredCode>(
        readUnknown(errorNode, "code"),
        STRUCTURED_GOOGLE_CODES
      );
    if (structured) {
      result.structuredCode = structured;
    }
    const details = readUnknown(errorNode, "details");
    if (Array.isArray(details)) {
      for (const detail of details) {
        if (!detail || typeof detail !== "object") {
          continue;
        }
        const reason = takeFromSet<ConversationCoreBoundedGeminiDetailsReason>(
          readUnknown(detail, "reason"),
          DETAILS_REASONS
        );
        if (reason) {
          result.detailsReason = reason;
          break;
        }
      }
    }
    return result;
  } catch {
    return {};
  }
}

function takeHttpStatus(value: unknown): number | undefined {
  return isBoundedIntegerStatus(value) ? value : undefined;
}

function mergeEnvelope(
  into: BoundedGeminiErrorSignals,
  envelope: Pick<BoundedGeminiErrorSignals, "httpStatus" | "structuredCode" | "detailsReason">
): void {
  if (into.httpStatus === undefined && envelope.httpStatus !== undefined) {
    into.httpStatus = envelope.httpStatus;
  }
  if (into.structuredCode === undefined && envelope.structuredCode !== undefined) {
    into.structuredCode = envelope.structuredCode;
  }
  if (into.detailsReason === undefined && envelope.detailsReason !== undefined) {
    into.detailsReason = envelope.detailsReason;
  }
}

function collectBoundedGeminiErrorSignals(
  error: unknown,
  into: BoundedGeminiErrorSignals,
  depth: number
): void {
  if (depth > 2 || !error || typeof error !== "object") {
    return;
  }
  try {
    const record = error as object;
    if (into.httpStatus === undefined) {
      const httpStatus =
        takeHttpStatus(readUnknown(record, "status")) ??
        takeHttpStatus(readUnknown(record, "statusCode")) ??
        takeHttpStatus(readUnknown(record, "code"));
      if (httpStatus !== undefined) {
        into.httpStatus = httpStatus;
      }
    }
    if (into.structuredCode === undefined) {
      const structured =
        takeFromSet<ConversationCoreBoundedGeminiStructuredCode>(
          readUnknown(record, "code"),
          STRUCTURED_GOOGLE_CODES
        ) ??
        takeFromSet<ConversationCoreBoundedGeminiStructuredCode>(
          readUnknown(record, "status"),
          STRUCTURED_GOOGLE_CODES
        );
      if (structured) {
        into.structuredCode = structured;
      }
    }
    if (into.detailsReason === undefined) {
      const topReason = takeFromSet<ConversationCoreBoundedGeminiDetailsReason>(
        readUnknown(record, "reason"),
        DETAILS_REASONS
      );
      if (topReason) {
        into.detailsReason = topReason;
      }
    }
    const systemCode = readUnknown(record, "code");
    if (into.systemCode === undefined && typeof systemCode === "string") {
      if (NETWORK_SYSTEM_CODES.has(systemCode) || TIMEOUT_SYSTEM_CODES.has(systemCode)) {
        into.systemCode = systemCode;
      }
    }
    if (into.errorName === undefined) {
      const errorName = takeFromSet<ConversationCoreBoundedGeminiErrorName>(
        readUnknown(record, "name"),
        ALLOWLISTED_ERROR_NAMES
      );
      if (errorName) {
        into.errorName = errorName;
      }
    }
    const details = readUnknown(record, "details");
    if (Array.isArray(details)) {
      for (const detail of details) {
        if (!detail || typeof detail !== "object") {
          continue;
        }
        if (into.detailsReason === undefined) {
          const reason = takeFromSet<ConversationCoreBoundedGeminiDetailsReason>(
            readUnknown(detail, "reason"),
            DETAILS_REASONS
          );
          if (reason) {
            into.detailsReason = reason;
          }
        }
        if (into.structuredCode === undefined) {
          const structured = takeFromSet<ConversationCoreBoundedGeminiStructuredCode>(
            readUnknown(detail, "reason"),
            STRUCTURED_GOOGLE_CODES
          );
          if (structured) {
            into.structuredCode = structured;
          }
        }
      }
    }
    mergeEnvelope(into, parseGeminiApiErrorEnvelope(readUnknown(record, "message")));
    const nestedError = readUnknown(record, "error");
    if (nestedError && typeof nestedError === "object" && !Array.isArray(nestedError)) {
      collectBoundedGeminiErrorSignals(nestedError, into, depth + 1);
    }
    const nestedCause = readUnknown(record, "cause");
    if (nestedCause && typeof nestedCause === "object" && !Array.isArray(nestedCause)) {
      collectBoundedGeminiErrorSignals(nestedCause, into, depth + 1);
    }
  } catch {
    // Hostile getters/proxies must not fail Conversation Core.
  }
}

function finalizeBoundedGeminiErrorSignals(signals: BoundedGeminiErrorSignals): BoundedGeminiErrorSignals {
  if (signals.httpStatus !== undefined && signals.httpStatusClass === undefined) {
    const statusClass = toHttpStatusClass(signals.httpStatus);
    if (statusClass) {
      signals.httpStatusClass = statusClass;
    }
  }
  return signals;
}

function extractBoundedGeminiErrorSignals(error: unknown): BoundedGeminiErrorSignals {
  const signals: BoundedGeminiErrorSignals = {};
  try {
    collectBoundedGeminiErrorSignals(error, signals, 0);
  } catch {
    return {};
  }
  return finalizeBoundedGeminiErrorSignals(signals);
}

function classifyFromBoundedGeminiErrorSignals(
  signals: BoundedGeminiErrorSignals
): ConversationCoreBoundedGeminiProviderErrorClass {
  if (
    (signals.errorName !== undefined && STANDARD_TIMEOUT_NAMES.has(signals.errorName)) ||
    (signals.systemCode !== undefined && TIMEOUT_SYSTEM_CODES.has(signals.systemCode)) ||
    signals.structuredCode === "DEADLINE_EXCEEDED" ||
    signals.structuredCode === "ABORTED"
  ) {
    return "timeout";
  }
  if (signals.errorName !== undefined && STANDARD_NETWORK_NAMES.has(signals.errorName)) {
    return "network_error";
  }
  if (signals.systemCode !== undefined && NETWORK_SYSTEM_CODES.has(signals.systemCode)) {
    return "network_error";
  }
  if (signals.errorName !== undefined && STANDARD_CLASS_BY_NAME[signals.errorName]) {
    return STANDARD_CLASS_BY_NAME[signals.errorName];
  }
  if (signals.detailsReason === "API_KEY_INVALID") {
    return "authentication_failed";
  }
  if (signals.structuredCode === "UNAUTHENTICATED" || signals.httpStatus === 401) {
    return "authentication_failed";
  }
  if (signals.structuredCode === "PERMISSION_DENIED" || signals.httpStatus === 403) {
    return "permission_denied";
  }
  if (signals.structuredCode === "RESOURCE_EXHAUSTED" || signals.httpStatus === 429) {
    return "quota_exhausted";
  }
  if (signals.structuredCode === "NOT_FOUND" || signals.httpStatus === 404) {
    return "model_not_found";
  }
  if (
    signals.structuredCode === "UNAVAILABLE" ||
    signals.structuredCode === "INTERNAL" ||
    signals.httpStatus === 500 ||
    signals.httpStatus === 502 ||
    signals.httpStatus === 503 ||
    signals.httpStatus === 504
  ) {
    return "provider_unavailable";
  }
  if (signals.structuredCode === "INVALID_ARGUMENT" || signals.httpStatus === 400) {
    return "request_incompatible";
  }
  return "unknown_provider_error";
}

export function classifyConversationCoreBoundedGeminiProviderError(
  error: unknown
): ConversationCoreBoundedGeminiProviderErrorClass {
  try {
    return classifyFromBoundedGeminiErrorSignals(extractBoundedGeminiErrorSignals(error));
  } catch {
    return "unknown_provider_error";
  }
}

export type ConversationCoreRuntimeObservabilityGeminiKind =
  | "tool_request"
  | "final_answer"
  | "provider_error"
  | "invalid_response";

export type ConversationCoreRuntimeObservabilityEvent = {
  readonly event: string;
  readonly [key: string]: string | number | boolean | undefined;
};

export type ConversationCoreRuntimeObservabilitySink = (
  event: ConversationCoreRuntimeObservabilityEvent
) => void;

export function emitConversationCoreRuntimeObservability(
  sink: ConversationCoreRuntimeObservabilitySink | undefined,
  event: ConversationCoreRuntimeObservabilityEvent
): void {
  if (typeof sink !== "function") {
    return;
  }
  try {
    sink(Object.freeze({ ...event }));
  } catch {
    // Observability must never change control flow or public results.
  }
}

function classifyGeminiTransportKind(
  code: ConversationCoreGeminiToolTransportErrorCode
): Extract<ConversationCoreRuntimeObservabilityGeminiKind, "provider_error" | "invalid_response"> {
  return GEMINI_PROVIDER_ERROR_CLASSES.has(code) ? "provider_error" : "invalid_response";
}

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
  readonly observabilitySink?: ConversationCoreRuntimeObservabilitySink;
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
  readonly observabilitySink?: ConversationCoreRuntimeObservabilitySink;
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
  try {
    if (error && typeof error === "object") {
      const name = readUnknown(error, "name");
      const code = readUnknown(error, "code");
      const nameText = typeof name === "string" ? name : "";
      const codeText = typeof code === "string" ? code : "";
      if (nameText === "AbortError" || codeText === "ABORT_ERR" || codeText === "ERR_CANCELED") {
        return "provider-aborted";
      }
      if (
        nameText === "TimeoutError" ||
        codeText === "ETIMEDOUT" ||
        codeText === "ERR_TIMEOUT" ||
        codeText === "timeout"
      ) {
        return "provider-timeout";
      }
    }
  } catch {
    return "provider-error";
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
}): Promise<
  | { readonly ok: true; readonly value: unknown }
  | {
      readonly ok: false;
      readonly code: ConversationCoreGeminiToolTransportErrorCode;
      readonly providerErrorClass: ConversationCoreBoundedGeminiProviderErrorClass;
      readonly diagnostics: BoundedGeminiErrorSignals;
    }
> {
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
    return { ok: true as const, value: response };
  } catch (error) {
    if (!controller.signal.aborted) {
      controller.abort();
    }
    let code: ConversationCoreGeminiToolTransportErrorCode = "provider-error";
    let diagnostics: BoundedGeminiErrorSignals = {};
    let providerErrorClass: ConversationCoreBoundedGeminiProviderErrorClass = "unknown_provider_error";
    try {
      code = mapProviderException(error);
    } catch {
      code = "provider-error";
    }
    try {
      diagnostics = extractBoundedGeminiErrorSignals(error);
      providerErrorClass = classifyFromBoundedGeminiErrorSignals(diagnostics);
    } catch {
      diagnostics = {};
      providerErrorClass = "unknown_provider_error";
    }
    return {
      ok: false as const,
      code,
      providerErrorClass,
      diagnostics,
    };
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

function emitGeminiTransportOutcome(
  sink: ConversationCoreRuntimeObservabilitySink | undefined,
  phase: "initial" | "follow_up",
  kind: ConversationCoreRuntimeObservabilityGeminiKind,
  errorClass?: ConversationCoreGeminiToolTransportErrorCode,
  providerErrorClass?: ConversationCoreBoundedGeminiProviderErrorClass,
  diagnostics?: BoundedGeminiErrorSignals
): void {
  const isProviderError =
    errorClass !== undefined && GEMINI_PROVIDER_ERROR_CLASSES.has(errorClass);
  emitConversationCoreRuntimeObservability(sink, {
    event: "gemini_transport_outcome",
    phase,
    kind,
    ...(errorClass ? { errorClass } : {}),
    ...(isProviderError && errorClass ? { transportErrorCode: errorClass } : {}),
    ...(providerErrorClass ? { providerErrorClass } : {}),
    ...(isProviderError && diagnostics?.httpStatus !== undefined
      ? { httpStatus: diagnostics.httpStatus }
      : {}),
    ...(isProviderError && diagnostics?.httpStatusClass
      ? { httpStatusClass: diagnostics.httpStatusClass }
      : {}),
    ...(isProviderError && diagnostics?.structuredCode
      ? { structuredCode: diagnostics.structuredCode }
      : {}),
    ...(isProviderError && diagnostics?.detailsReason
      ? { detailsReason: diagnostics.detailsReason }
      : {}),
    ...(isProviderError && diagnostics?.errorName ? { errorName: diagnostics.errorName } : {}),
  });
}

function finishInitialTurn(
  sink: ConversationCoreRuntimeObservabilitySink | undefined,
  result: ConversationCoreGeminiToolTransportResult<ConversationCoreGeminiStructuredInitialTurnSuccess>,
  providerErrorClass?: ConversationCoreBoundedGeminiProviderErrorClass,
  diagnostics?: BoundedGeminiErrorSignals
): ConversationCoreGeminiToolTransportResult<ConversationCoreGeminiStructuredInitialTurnSuccess> {
  if (result.ok === false) {
    emitGeminiTransportOutcome(
      sink,
      "initial",
      classifyGeminiTransportKind(result.code),
      result.code,
      GEMINI_PROVIDER_ERROR_CLASSES.has(result.code) ? providerErrorClass : undefined,
      GEMINI_PROVIDER_ERROR_CLASSES.has(result.code) ? diagnostics : undefined
    );
    return result;
  }
  emitGeminiTransportOutcome(
    sink,
    "initial",
    result.value.outcome.kind === "tool-request" ? "tool_request" : "final_answer"
  );
  return result;
}

function finishFollowUp(
  sink: ConversationCoreRuntimeObservabilitySink | undefined,
  result: ConversationCoreGeminiToolTransportResult<string>,
  providerErrorClass?: ConversationCoreBoundedGeminiProviderErrorClass,
  diagnostics?: BoundedGeminiErrorSignals
): ConversationCoreGeminiToolTransportResult<string> {
  if (result.ok === false) {
    emitGeminiTransportOutcome(
      sink,
      "follow_up",
      classifyGeminiTransportKind(result.code),
      result.code,
      GEMINI_PROVIDER_ERROR_CLASSES.has(result.code) ? providerErrorClass : undefined,
      GEMINI_PROVIDER_ERROR_CLASSES.has(result.code) ? diagnostics : undefined
    );
    return result;
  }
  emitGeminiTransportOutcome(sink, "follow_up", "final_answer");
  return result;
}

export async function generateStructuredInitialTurn(
  input: ConversationCoreGeminiStructuredInitialTurnInput
): Promise<ConversationCoreGeminiToolTransportResult<ConversationCoreGeminiStructuredInitialTurnSuccess>> {
  const sink = input.observabilitySink;
  const declarationsResult = buildConversationCoreGeminiFunctionDeclarations(input.allowedToolNames);
  if (!declarationsResult.ok) {
    return finishInitialTurn(sink, freezeFail("invalid-allowed-tool-declarations"));
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
    return finishInitialTurn(
      sink,
      freezeFail(transportResult.code),
      transportResult.providerErrorClass,
      transportResult.diagnostics
    );
  }
  if (!isPlainObject(transportResult.value)) {
    return finishInitialTurn(sink, freezeFail("malformed-response"));
  }

  const parsed = parseInitialCandidate({
    response: transportResult.value,
    allowedToolNames: input.allowedToolNames,
  });
  if (parsed.ok === false) {
    return finishInitialTurn(sink, freezeFail(parsed.code));
  }
  return finishInitialTurn(sink, freezeOk(parsed.value));
}

export async function generateFinalAnswerFromToolResult(
  input: ConversationCoreGeminiFinalAnswerFromToolResultInput
): Promise<ConversationCoreGeminiToolTransportResult<string>> {
  const sink = input.observabilitySink;
  const validated = validateToolResult(input.toolResult);
  if (!validated.ok) {
    return finishFollowUp(sink, freezeFail("invalid-validated-tool-result-input"));
  }
  if (validated.value.toolName !== input.providerContext.functionName) {
    return finishFollowUp(sink, freezeFail("tool-result-name-mismatch"));
  }
  if (validated.value.status !== "ok") {
    return finishFollowUp(sink, freezeFail("tool-result-not-ok"));
  }

  const responsePayload = buildGeminiFunctionResponsePayload(validated.value);
  const payloadJson = JSON.stringify(responsePayload);
  if (payloadJson.length > CONVERSATION_CORE_MAX_MESSAGE_LENGTH) {
    return finishFollowUp(sink, freezeFail("oversized-tool-result"));
  }

  let functionResponsePart: ReturnType<typeof createPartFromFunctionResponse>;
  try {
    functionResponsePart = createPartFromFunctionResponse(
      input.providerContext.callId ?? "",
      input.providerContext.functionName,
      responsePayload
    );
  } catch {
    return finishFollowUp(sink, freezeFail("invalid-function-response-construction"));
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
    return finishFollowUp(
      sink,
      freezeFail(transportResult.code),
      transportResult.providerErrorClass,
      transportResult.diagnostics
    );
  }
  if (!isPlainObject(transportResult.value)) {
    return finishFollowUp(sink, freezeFail("malformed-response"));
  }

  return finishFollowUp(sink, parseFinalAnswerCandidate(transportResult.value));
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
