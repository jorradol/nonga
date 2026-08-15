/**
 * WP-V2U-03D1 — Bounded read-only tool executor foundation.
 * No business services, no network, no provider calls, no retries.
 */
import {
  TOOL_REQUIRED_PROVENANCE_BY_TOOL,
  isPhase1ReadOnlyToolName,
  isPlainObject,
  validateNonEmptyId,
  validateToolRequest,
  validateToolResult,
  type ConversationCoreToolName,
  type ToolRequest,
  type ToolResult,
  type ValidationIssue,
} from "../../services/conversation-core/index";
import type {
  ConversationCoreToolHandler,
  ConversationCoreToolHandlerOutput,
  ConversationCoreToolRegistry,
} from "./conversationCoreToolRegistry";

export const CONVERSATION_CORE_TOOL_DEFAULT_TIMEOUT_MS = 5_000;
export const CONVERSATION_CORE_TOOL_MIN_TIMEOUT_MS = 100;
export const CONVERSATION_CORE_TOOL_MAX_TIMEOUT_MS = 20_000;

export const CONVERSATION_CORE_TOOL_EXECUTOR_ERROR_CODES = {
  toolNotAllowlisted: "tool_not_allowlisted",
  handlerUnavailable: "handler_unavailable",
  handlerThrew: "handler_threw",
  handlerTimeout: "handler_timeout",
  handlerInvalidResult: "handler_invalid_result",
  bindingMismatch: "binding_mismatch",
  invalidTrustedBinding: "invalid_trusted_binding",
  executorInfrastructureFailure: "executor_infrastructure_failure",
} as const;

export interface ConversationCoreToolTrustedBinding {
  readonly requestId: string;
  readonly conversationId: string;
  readonly toolName: ConversationCoreToolName;
}

export type ConversationCoreToolExecutorRejectReason =
  | "malformed_request"
  | "invalid_trusted_binding";

export type ConversationCoreToolExecutorOutcome =
  | { readonly kind: "completed"; readonly result: ToolResult }
  | {
      readonly kind: "rejected";
      readonly reasonCode: ConversationCoreToolExecutorRejectReason;
      readonly issues: readonly ValidationIssue[];
    };

export interface ConversationCoreToolExecutorInput {
  readonly rawRequest: unknown;
  readonly trustedBinding: unknown;
  readonly trustedToolAllowlist: readonly ConversationCoreToolName[];
  readonly timeoutMs?: number;
}

export interface ConversationCoreToolExecutorScheduleHandle {
  readonly cancel: () => void;
}

export interface ConversationCoreToolExecutorDeps {
  readonly registry: ConversationCoreToolRegistry;
  readonly scheduleTimeout?: (
    callback: () => void,
    ms: number
  ) => ConversationCoreToolExecutorScheduleHandle;
}

type InvokeHandlerOnceResult =
  | ConversationCoreToolHandlerOutput
  | "timeout"
  | "infrastructure_failure";

function freezeOutcome(
  outcome: ConversationCoreToolExecutorOutcome
): ConversationCoreToolExecutorOutcome {
  if (outcome.kind === "rejected") {
    return Object.freeze({
      kind: "rejected" as const,
      reasonCode: outcome.reasonCode,
      issues: Object.freeze([...outcome.issues]),
    });
  }
  return Object.freeze({
    kind: "completed" as const,
    result: outcome.result,
  });
}

function defaultScheduleTimeout(
  callback: () => void,
  ms: number
): ConversationCoreToolExecutorScheduleHandle {
  const id = setTimeout(callback, ms);
  return {
    cancel() {
      clearTimeout(id);
    },
  };
}

/**
 * Resolve a finite server-owned tool timeout.
 * Missing → default. Invalid/zero/negative/over-max → safe bounded default.
 */
export function resolveConversationCoreToolTimeoutMs(raw: unknown): number {
  if (raw === undefined) {
    return CONVERSATION_CORE_TOOL_DEFAULT_TIMEOUT_MS;
  }
  if (
    typeof raw !== "number" ||
    !Number.isFinite(raw) ||
    raw < CONVERSATION_CORE_TOOL_MIN_TIMEOUT_MS ||
    raw > CONVERSATION_CORE_TOOL_MAX_TIMEOUT_MS
  ) {
    return CONVERSATION_CORE_TOOL_DEFAULT_TIMEOUT_MS;
  }
  return raw;
}

function isHandlerOutput(value: unknown): value is ConversationCoreToolHandlerOutput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as { status?: unknown; data?: unknown; errorCode?: unknown };
  if (record.status === "ok") {
    return record.data !== undefined;
  }
  if (record.status === "error" || record.status === "fallback") {
    return typeof record.errorCode === "string" && record.errorCode.trim().length > 0;
  }
  return false;
}

function isScheduleHandle(value: unknown): value is ConversationCoreToolExecutorScheduleHandle {
  if (!value || typeof value !== "object") {
    return false;
  }
  try {
    const cancel = (value as ConversationCoreToolExecutorScheduleHandle).cancel;
    return typeof cancel === "function";
  } catch {
    return false;
  }
}

function safeCancelTimeout(handle: ConversationCoreToolExecutorScheduleHandle | null): void {
  if (!handle) {
    return;
  }
  try {
    handle.cancel();
  } catch {
    // Fail closed without surfacing scheduler cancel failures.
  }
}

function validateTrustedBinding(raw: unknown): ValidationIssue[] | ConversationCoreToolTrustedBinding {
  const issues: ValidationIssue[] = [];
  if (!isPlainObject(raw)) {
    return [
      {
        path: "trustedBinding",
        code: "invalid_trusted_binding",
        message: "Trusted binding must be an object",
      },
    ];
  }

  const allowedKeys = new Set(["requestId", "conversationId", "toolName"]);
  for (const key of Object.keys(raw)) {
    if (!allowedKeys.has(key)) {
      issues.push({
        path: `trustedBinding.${key}`,
        code: "unknown_field",
        message: "Trusted binding contains an unknown field",
      });
    }
  }

  const requestId = validateNonEmptyId(raw.requestId, "trustedBinding.requestId", issues);
  const conversationId = validateNonEmptyId(
    raw.conversationId,
    "trustedBinding.conversationId",
    issues
  );

  let toolName: ConversationCoreToolName | null = null;
  if (typeof raw.toolName !== "string") {
    issues.push({
      path: "trustedBinding.toolName",
      code: "invalid_type",
      message: "Trusted binding tool name must be a string",
    });
  } else {
    const normalized = raw.toolName.trim();
    if (!isPhase1ReadOnlyToolName(normalized)) {
      issues.push({
        path: "trustedBinding.toolName",
        code: "unknown_tool",
        message: "Trusted binding tool name is not in the read-only allowlist",
      });
    } else {
      toolName = normalized;
    }
  }

  if (issues.length > 0 || !requestId || !conversationId || !toolName) {
    return issues;
  }

  return {
    requestId,
    conversationId,
    toolName,
  };
}

function requestMatchesTrustedBinding(
  request: ToolRequest,
  trustedBinding: ConversationCoreToolTrustedBinding
): boolean {
  return (
    request.requestId === trustedBinding.requestId &&
    request.conversationId === trustedBinding.conversationId &&
    request.toolName === trustedBinding.toolName
  );
}

function buildBoundToolResult(
  trustedBinding: ConversationCoreToolTrustedBinding,
  handlerOutput: ConversationCoreToolHandlerOutput
): unknown {
  const provenance = TOOL_REQUIRED_PROVENANCE_BY_TOOL[trustedBinding.toolName];
  const base = {
    requestId: trustedBinding.requestId,
    conversationId: trustedBinding.conversationId,
    toolName: trustedBinding.toolName,
    provenance,
  };

  if (handlerOutput.status === "ok") {
    return {
      ...base,
      status: "ok",
      data: handlerOutput.data,
    };
  }

  if (handlerOutput.status === "fallback") {
    return {
      ...base,
      status: "fallback",
      errorCode: handlerOutput.errorCode,
      fallbackUsed: true,
    };
  }

  return {
    ...base,
    status: "error",
    errorCode: handlerOutput.errorCode,
  };
}

function buildErrorToolResult(
  trustedBinding: ConversationCoreToolTrustedBinding,
  errorCode: string,
  status: "error" | "fallback" = "error"
): ToolResult | null {
  const raw =
    status === "fallback"
      ? {
          requestId: trustedBinding.requestId,
          conversationId: trustedBinding.conversationId,
          toolName: trustedBinding.toolName,
          provenance: TOOL_REQUIRED_PROVENANCE_BY_TOOL[trustedBinding.toolName],
          status: "fallback",
          errorCode,
          fallbackUsed: true,
        }
      : {
          requestId: trustedBinding.requestId,
          conversationId: trustedBinding.conversationId,
          toolName: trustedBinding.toolName,
          provenance: TOOL_REQUIRED_PROVENANCE_BY_TOOL[trustedBinding.toolName],
          status: "error",
          errorCode,
        };

  const validated = validateToolResult(raw, {
    requestId: trustedBinding.requestId,
    conversationId: trustedBinding.conversationId,
    toolName: trustedBinding.toolName,
  });
  return validated.ok ? validated.value : null;
}

function completeWithError(
  trustedBinding: ConversationCoreToolTrustedBinding,
  errorCode: string
): ConversationCoreToolExecutorOutcome {
  const result = buildErrorToolResult(trustedBinding, errorCode, "error");
  if (!result) {
    const fallback = buildErrorToolResult(
      trustedBinding,
      CONVERSATION_CORE_TOOL_EXECUTOR_ERROR_CODES.handlerInvalidResult,
      "error"
    );
    if (!fallback) {
      return freezeOutcome({
        kind: "rejected",
        reasonCode: "malformed_request",
        issues: [
          {
            path: "$",
            code: "executor_internal_error",
            message: "Unable to build a safe tool error result",
          },
        ],
      });
    }
    return freezeOutcome({ kind: "completed", result: fallback });
  }
  return freezeOutcome({ kind: "completed", result });
}

function normalizeTrustedAllowlist(
  raw: readonly ConversationCoreToolName[]
): ConversationCoreToolName[] {
  const seen = new Set<ConversationCoreToolName>();
  const normalized: ConversationCoreToolName[] = [];
  for (const toolName of raw) {
    if (!isPhase1ReadOnlyToolName(toolName) || seen.has(toolName)) {
      continue;
    }
    seen.add(toolName);
    normalized.push(toolName);
  }
  return normalized;
}

function isToolAllowlisted(
  trustedBinding: ConversationCoreToolTrustedBinding,
  trustedToolAllowlist: readonly ConversationCoreToolName[]
): boolean {
  if (trustedToolAllowlist.length === 0) {
    return false;
  }
  const allowlist = normalizeTrustedAllowlist(trustedToolAllowlist);
  return allowlist.includes(trustedBinding.toolName);
}

async function invokeHandlerOnce(
  handler: ConversationCoreToolHandler,
  request: ToolRequest,
  timeoutMs: number,
  scheduleTimeout: (
    callback: () => void,
    ms: number
  ) => ConversationCoreToolExecutorScheduleHandle
): Promise<InvokeHandlerOnceResult> {
  let settled = false;

  return new Promise<InvokeHandlerOnceResult>((resolve) => {
    const settle = (value: InvokeHandlerOnceResult) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(value);
    };

    let timeoutHandle: ConversationCoreToolExecutorScheduleHandle | null = null;
    try {
      timeoutHandle = scheduleTimeout(() => {
        settle("timeout");
      }, timeoutMs);
    } catch {
      settle("infrastructure_failure");
      return;
    }

    if (!isScheduleHandle(timeoutHandle)) {
      settle("infrastructure_failure");
      return;
    }

    if (settled) {
      safeCancelTimeout(timeoutHandle);
      return;
    }

    const finalize = (value: InvokeHandlerOnceResult) => {
      safeCancelTimeout(timeoutHandle);
      settle(value);
    };

    try {
      const maybePromise = handler(request);
      void Promise.resolve(maybePromise)
        .then((output) => {
          if (!isHandlerOutput(output)) {
            finalize({
              status: "error",
              errorCode: CONVERSATION_CORE_TOOL_EXECUTOR_ERROR_CODES.handlerInvalidResult,
            });
            return;
          }
          finalize(output);
        })
        .catch(() => {
          finalize({
            status: "error",
            errorCode: CONVERSATION_CORE_TOOL_EXECUTOR_ERROR_CODES.handlerThrew,
          });
        });
    } catch {
      finalize({
        status: "error",
        errorCode: CONVERSATION_CORE_TOOL_EXECUTOR_ERROR_CODES.handlerThrew,
      });
    }
  });
}

/**
 * Execute one validated read-only tool request under server-owned policy.
 * Fails closed on malformed input, allowlist violations, missing handlers,
 * handler failures, timeouts, and malformed handler output.
 */
export async function executeConversationCoreTool(
  input: ConversationCoreToolExecutorInput,
  deps: ConversationCoreToolExecutorDeps
): Promise<ConversationCoreToolExecutorOutcome> {
  const validatedBinding = validateTrustedBinding(input.trustedBinding);
  if (Array.isArray(validatedBinding)) {
    return freezeOutcome({
      kind: "rejected",
      reasonCode: "invalid_trusted_binding",
      issues: validatedBinding,
    });
  }
  const trustedBinding = validatedBinding;

  const validatedRequest = validateToolRequest(input.rawRequest);
  if (validatedRequest.ok === false) {
    return freezeOutcome({
      kind: "rejected",
      reasonCode: "malformed_request",
      issues: validatedRequest.issues,
    });
  }

  const request = validatedRequest.value;

  if (!requestMatchesTrustedBinding(request, trustedBinding)) {
    return completeWithError(
      trustedBinding,
      CONVERSATION_CORE_TOOL_EXECUTOR_ERROR_CODES.bindingMismatch
    );
  }

  if (!deps.registry.isCanonicalToolName(trustedBinding.toolName)) {
    return completeWithError(
      trustedBinding,
      CONVERSATION_CORE_TOOL_EXECUTOR_ERROR_CODES.toolNotAllowlisted
    );
  }

  if (!isToolAllowlisted(trustedBinding, input.trustedToolAllowlist)) {
    return completeWithError(
      trustedBinding,
      CONVERSATION_CORE_TOOL_EXECUTOR_ERROR_CODES.toolNotAllowlisted
    );
  }

  const handler = deps.registry.resolveHandler(trustedBinding.toolName);
  if (!handler) {
    return completeWithError(
      trustedBinding,
      CONVERSATION_CORE_TOOL_EXECUTOR_ERROR_CODES.handlerUnavailable
    );
  }

  const timeoutMs = resolveConversationCoreToolTimeoutMs(input.timeoutMs);
  const scheduleTimeout = deps.scheduleTimeout ?? defaultScheduleTimeout;
  const handlerOutcome = await invokeHandlerOnce(
    handler,
    request,
    timeoutMs,
    scheduleTimeout
  );

  if (handlerOutcome === "timeout") {
    return completeWithError(
      trustedBinding,
      CONVERSATION_CORE_TOOL_EXECUTOR_ERROR_CODES.handlerTimeout
    );
  }

  if (handlerOutcome === "infrastructure_failure") {
    return completeWithError(
      trustedBinding,
      CONVERSATION_CORE_TOOL_EXECUTOR_ERROR_CODES.executorInfrastructureFailure
    );
  }

  const boundRaw = buildBoundToolResult(trustedBinding, handlerOutcome);
  const validatedResult = validateToolResult(boundRaw, {
    requestId: trustedBinding.requestId,
    conversationId: trustedBinding.conversationId,
    toolName: trustedBinding.toolName,
  });

  if (!validatedResult.ok) {
    return completeWithError(
      trustedBinding,
      CONVERSATION_CORE_TOOL_EXECUTOR_ERROR_CODES.handlerInvalidResult
    );
  }

  const result = validatedResult.value;
  if (
    result.requestId !== trustedBinding.requestId ||
    result.conversationId !== trustedBinding.conversationId ||
    result.toolName !== trustedBinding.toolName
  ) {
    return completeWithError(
      trustedBinding,
      CONVERSATION_CORE_TOOL_EXECUTOR_ERROR_CODES.handlerInvalidResult
    );
  }

  return freezeOutcome({ kind: "completed", result });
}
