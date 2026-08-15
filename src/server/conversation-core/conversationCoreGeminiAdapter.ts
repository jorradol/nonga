/**
 * WP-V2U-03C3 / R1 — Core-owned Gemini adapter (text-only, injectable transport, no V.3 import).
 *
 * Timeout design:
 * - Adapter always bounds `transport.generate` with a finite Promise.race.
 * - Installed `@google/genai` GenerateContentConfig supports `abortSignal` and
 *   `httpOptions.timeout`. SDK transport passes both. SDK docs note AbortSignal is
 *   client-only and does not cancel the remote operation; the adapter still returns
 *   `provider-timeout` to the caller within the bound.
 * - Invalid/zero/negative/over-max timeout values use the safe bounded default.
 * - No provider retry is performed here.
 */
import { GoogleGenAI } from "@google/genai";
import {
  CONVERSATION_CORE_MAX_MESSAGE_LENGTH,
  type ConversationHistoryTurn,
} from "../../services/conversation-core/index";

export const CONVERSATION_CORE_GEMINI_DEFAULT_TIMEOUT_MS = 8_000;
export const CONVERSATION_CORE_GEMINI_MAX_TIMEOUT_MS = 20_000;

export type ConversationCoreGeminiRole = "user" | "model";

export interface ConversationCoreGeminiContentPart {
  readonly text: string;
}

export interface ConversationCoreGeminiContentTurn {
  readonly role: ConversationCoreGeminiRole;
  readonly parts: readonly ConversationCoreGeminiContentPart[];
}

export interface ConversationCoreGeminiGenerateRequest {
  readonly model: string;
  readonly systemInstruction: string;
  readonly contents: readonly ConversationCoreGeminiContentTurn[];
}

export type ConversationCoreGeminiTransportResult =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "non-text" }
  | { readonly kind: "malformed" };

export interface ConversationCoreGeminiTransportGenerateOptions {
  readonly signal?: AbortSignal;
}

export interface ConversationCoreGeminiTransport {
  generate(
    request: ConversationCoreGeminiGenerateRequest,
    options?: ConversationCoreGeminiTransportGenerateOptions
  ): Promise<ConversationCoreGeminiTransportResult>;
}

export type ConversationCoreGeminiAdapterErrorCode =
  | "empty-response"
  | "malformed-response"
  | "non-text-response"
  | "oversized-response"
  | "provider-timeout"
  | "provider-aborted"
  | "provider-error";

export type ConversationCoreGeminiAdapterResult =
  | { readonly ok: true; readonly text: string }
  | { readonly ok: false; readonly code: ConversationCoreGeminiAdapterErrorCode };

export interface ConversationCoreGeminiAdapterInput {
  readonly model: string;
  readonly systemInstruction: string;
  readonly userMessage: string;
  readonly history?: readonly ConversationHistoryTurn[];
}

export interface ConversationCoreGeminiAdapter {
  generate(
    input: ConversationCoreGeminiAdapterInput
  ): Promise<ConversationCoreGeminiAdapterResult>;
}

export interface ConversationCoreGeminiTimeoutHandle {
  cancel(): void;
}

export interface ConversationCoreGeminiAdapterOptions {
  readonly transport: ConversationCoreGeminiTransport;
  readonly maxMessageLength?: number;
  readonly timeoutMs?: number;
  readonly scheduleTimeout?: (
    callback: () => void,
    ms: number
  ) => ConversationCoreGeminiTimeoutHandle;
}

function cloneContents(
  contents: readonly ConversationCoreGeminiContentTurn[]
): ConversationCoreGeminiContentTurn[] {
  return contents.map((turn) =>
    Object.freeze({
      role: turn.role,
      parts: Object.freeze(turn.parts.map((part) => Object.freeze({ text: part.text }))),
    })
  );
}

function freezeRequest(
  request: ConversationCoreGeminiGenerateRequest
): ConversationCoreGeminiGenerateRequest {
  return Object.freeze({
    model: request.model,
    systemInstruction: request.systemInstruction,
    contents: Object.freeze(cloneContents(request.contents)),
  });
}

export function mapConversationHistoryRoleToGemini(
  role: ConversationHistoryTurn["role"]
): ConversationCoreGeminiRole {
  return role === "assistant" ? "model" : "user";
}

/**
 * Build Gemini contents from history + latest user message.
 * Does not concatenate the user message into the system instruction.
 */
export function buildConversationCoreGeminiContents(
  history: readonly ConversationHistoryTurn[] | undefined,
  latestUserMessage: string
): ConversationCoreGeminiContentTurn[] {
  const contents: ConversationCoreGeminiContentTurn[] = [];
  for (const turn of history ?? []) {
    contents.push(
      Object.freeze({
        role: mapConversationHistoryRoleToGemini(turn.role),
        parts: Object.freeze([{ text: turn.content }]),
      })
    );
  }
  contents.push(
    Object.freeze({
      role: "user" as const,
      parts: Object.freeze([{ text: latestUserMessage }]),
    })
  );
  return contents;
}

function freezeAdapterSuccess(text: string): ConversationCoreGeminiAdapterResult {
  return Object.freeze({ ok: true as const, text });
}

function freezeAdapterFailure(
  code: ConversationCoreGeminiAdapterErrorCode
): ConversationCoreGeminiAdapterResult {
  return Object.freeze({ ok: false as const, code });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isConversationCoreGeminiAdapter(
  value: unknown
): value is ConversationCoreGeminiAdapter {
  return isPlainObject(value) && typeof value.generate === "function";
}

/**
 * Resolve a finite server-owned timeout.
 * Missing → default. Invalid/zero/negative/over-max → safe bounded default.
 */
export function resolveConversationCoreGeminiTimeoutMs(raw: unknown): number {
  if (raw === undefined) {
    return CONVERSATION_CORE_GEMINI_DEFAULT_TIMEOUT_MS;
  }
  if (
    typeof raw !== "number" ||
    !Number.isFinite(raw) ||
    raw <= 0 ||
    raw > CONVERSATION_CORE_GEMINI_MAX_TIMEOUT_MS
  ) {
    return CONVERSATION_CORE_GEMINI_DEFAULT_TIMEOUT_MS;
  }
  return raw;
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

function mapProviderException(error: unknown): ConversationCoreGeminiAdapterErrorCode {
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

function partLooksNonText(part: unknown): boolean {
  if (!isPlainObject(part)) {
    return false;
  }
  return (
    part.functionCall !== undefined ||
    part.function_call !== undefined ||
    part.executableCode !== undefined ||
    part.codeExecutionResult !== undefined ||
    part.inlineData !== undefined ||
    part.fileData !== undefined ||
    part.toolCall !== undefined
  );
}

function sdkResponseHasNonText(response: unknown): boolean {
  if (!isPlainObject(response)) {
    return false;
  }
  if (Array.isArray(response.functionCalls) && response.functionCalls.length > 0) {
    return true;
  }
  if (Array.isArray(response.function_calls) && response.function_calls.length > 0) {
    return true;
  }
  const candidates = Array.isArray(response.candidates) ? response.candidates : [];
  for (const candidate of candidates) {
    if (!isPlainObject(candidate)) {
      continue;
    }
    const content = candidate.content;
    if (!isPlainObject(content) || !Array.isArray(content.parts)) {
      continue;
    }
    if (content.parts.some(partLooksNonText)) {
      return true;
    }
  }
  return false;
}

function extractSdkResponseText(response: unknown): string | null {
  if (!isPlainObject(response)) {
    return null;
  }
  if (typeof response.text === "string") {
    const direct = response.text.trim();
    if (direct) {
      return response.text;
    }
  }
  const parts: string[] = [];
  const candidates = Array.isArray(response.candidates) ? response.candidates : [];
  for (const candidate of candidates) {
    if (!isPlainObject(candidate)) {
      continue;
    }
    const content = candidate.content;
    if (!isPlainObject(content) || !Array.isArray(content.parts)) {
      continue;
    }
    for (const part of content.parts) {
      if (!isPlainObject(part)) {
        continue;
      }
      if (part.thought === true) {
        continue;
      }
      if (typeof part.text === "string") {
        parts.push(part.text);
      }
    }
  }
  if (parts.length === 0 && typeof response.text !== "string") {
    return null;
  }
  return parts.join("");
}

export function inspectConversationCoreGeminiSdkResponse(
  response: unknown
): ConversationCoreGeminiTransportResult {
  if (response === null || response === undefined) {
    return Object.freeze({ kind: "malformed" as const });
  }
  if (sdkResponseHasNonText(response)) {
    return Object.freeze({ kind: "non-text" as const });
  }
  const text = extractSdkResponseText(response);
  if (text === null) {
    return Object.freeze({ kind: "malformed" as const });
  }
  return Object.freeze({ kind: "text" as const, text });
}

function coerceTransportResult(raw: unknown): ConversationCoreGeminiTransportResult {
  if (raw === null || raw === undefined || Array.isArray(raw) || !isPlainObject(raw)) {
    return Object.freeze({ kind: "malformed" as const });
  }
  if (raw.kind === "malformed") {
    return Object.freeze({ kind: "malformed" as const });
  }
  if (raw.kind === "non-text") {
    return Object.freeze({ kind: "non-text" as const });
  }
  if (raw.kind === "text" && typeof raw.text === "string") {
    return Object.freeze({ kind: "text" as const, text: raw.text });
  }
  return Object.freeze({ kind: "malformed" as const });
}

async function raceWithTimeout<T>(input: {
  promise: Promise<T>;
  timeoutMs: number;
  scheduleTimeout: (
    callback: () => void,
    ms: number
  ) => ConversationCoreGeminiTimeoutHandle;
  onTimeout: () => void;
}): Promise<T> {
  let settled = false;
  let handle: ConversationCoreGeminiTimeoutHandle | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    handle = input.scheduleTimeout(() => {
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

/**
 * Production SDK transport. Tests must inject a fake transport instead of calling this.
 * Never logs the API key, request, or response body.
 */
export function createConversationCoreGeminiSdkTransport(input: {
  readonly apiKey: string;
  readonly timeoutMs?: number;
}): ConversationCoreGeminiTransport {
  const timeoutMs = resolveConversationCoreGeminiTimeoutMs(input.timeoutMs);
  const client = new GoogleGenAI({ apiKey: input.apiKey });
  return {
    async generate(request, options) {
      const response = await client.models.generateContent({
        model: request.model,
        contents: request.contents.map((turn) => ({
          role: turn.role,
          parts: turn.parts.map((part) => ({ text: part.text })),
        })),
        config: {
          systemInstruction: request.systemInstruction,
          abortSignal: options?.signal,
          httpOptions: {
            timeout: timeoutMs,
            retryOptions: { attempts: 1 },
          },
        },
      });
      return inspectConversationCoreGeminiSdkResponse(response);
    },
  };
}

export function createConversationCoreGeminiAdapter(
  input: ConversationCoreGeminiAdapterOptions
): ConversationCoreGeminiAdapter {
  const maxMessageLength = input.maxMessageLength ?? CONVERSATION_CORE_MAX_MESSAGE_LENGTH;
  const timeoutMs = resolveConversationCoreGeminiTimeoutMs(input.timeoutMs);
  const scheduleTimeout = input.scheduleTimeout ?? defaultScheduleTimeout;

  return {
    async generate(adapterInput) {
      const controller = new AbortController();
      try {
        const contents = buildConversationCoreGeminiContents(
          adapterInput.history,
          adapterInput.userMessage
        );
        const request = freezeRequest({
          model: adapterInput.model,
          systemInstruction: adapterInput.systemInstruction,
          contents,
        });

        const rawTransportResult: unknown = await raceWithTimeout({
          promise: Promise.resolve().then(() =>
            input.transport.generate(request, { signal: controller.signal })
          ),
          timeoutMs,
          scheduleTimeout,
          onTimeout: () => controller.abort(),
        });
        const transportResult = coerceTransportResult(rawTransportResult);

        if (transportResult.kind === "malformed") {
          return freezeAdapterFailure("malformed-response");
        }
        if (transportResult.kind === "non-text") {
          return freezeAdapterFailure("non-text-response");
        }

        const text = transportResult.text;
        if (typeof text !== "string") {
          return freezeAdapterFailure("malformed-response");
        }
        if (text.trim().length === 0) {
          return freezeAdapterFailure("empty-response");
        }
        if (text.length > maxMessageLength) {
          return freezeAdapterFailure("oversized-response");
        }

        return freezeAdapterSuccess(text);
      } catch (error) {
        if (!controller.signal.aborted) {
          controller.abort();
        }
        return freezeAdapterFailure(mapProviderException(error));
      }
    },
  };
}
