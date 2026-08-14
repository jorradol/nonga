/**
 * WP-V2U-02 / R1 — Conversation Core result envelope with fail-closed grounding.
 */

import {
  CONVERSATION_CORE_MAX_MESSAGE_LENGTH,
  containsHtmlOrScript,
  fail,
  isPlainObject,
  issue,
  rejectUnknownKeys,
  requireString,
  validateNonEmptyId,
  type ValidationIssue,
  isValidationFailure,
  type ValidationResult,
} from "./conversationTurnInput";
import {
  listingIdsFromToolResult,
  validateToolResult,
  type ConversationCoreToolName,
  type ToolResult,
} from "./toolEnvelope";
import {
  validateWorkspaceAction,
  type WorkspaceAction,
  type WorkspaceActionValidationContext,
} from "./workspaceAction";

export const SAFETY_OUTCOMES = ["pass", "short-circuit", "fallback"] as const;
export type SafetyOutcome = (typeof SAFETY_OUTCOMES)[number];

export const VALIDATOR_OUTCOMES = ["pass", "correction-required", "fallback"] as const;
export type ValidatorOutcome = (typeof VALIDATOR_OUTCOMES)[number];

export const CORRECTION_STATUSES = ["none", "attempted", "accepted", "fallback"] as const;
export type CorrectionStatus = (typeof CORRECTION_STATUSES)[number];

export const CORE_ERROR_CODES = [
  "none",
  "tool_unavailable",
  "tool_error",
  "provider_unavailable",
  "unsafe_output",
  "validation_fallback",
  "kill_switch",
] as const;

export type CoreErrorCode = (typeof CORE_ERROR_CODES)[number];

export const APPROVED_TOOL_FAILURE_ERROR_CODES = [
  "tool_unavailable",
  "tool_error",
] as const;

export const PROVIDER_METADATA_FORBIDDEN_KEYS = [
  "apiKey",
  "secret",
  "token",
  "GEMINI_API_KEY",
  "authorization",
  "credentials",
] as const;

export interface GroundedFactRef {
  kind: "listing" | "tool-result";
  id: string;
}

export interface ProviderMetadata {
  providerId: string;
  modelFamily?: string;
}

export interface ToolResultSummary {
  requestId: string;
  toolName: ConversationCoreToolName;
  status: ToolResult["status"];
  provenance: ToolResult["provenance"];
}

export interface ConversationCoreErrorState {
  code: CoreErrorCode;
  fallbackPath: "legacy-v2" | "honest-unavailable" | "deterministic-grounded";
  message?: string;
}

export interface ConversationCoreResult {
  conversationId: string;
  messageId: string;
  assistantText: string;
  groundedFactRefs: GroundedFactRef[];
  workspaceActions: WorkspaceAction[];
  safetyOutcome: SafetyOutcome;
  validatorOutcome: ValidatorOutcome;
  correctionStatus: CorrectionStatus;
  providerMetadata?: ProviderMetadata;
  toolResultsUsed: ToolResultSummary[];
  errorState?: ConversationCoreErrorState;
}

export interface ConversationCoreResultValidationContext {
  expectedConversationId: string;
  expectedMessageId: string;
  toolResults: unknown;
  requiredToolRequestIds?: unknown;
}

const RESULT_ALLOWED_KEYS = new Set([
  "conversationId",
  "messageId",
  "assistantText",
  "groundedFactRefs",
  "workspaceActions",
  "safetyOutcome",
  "validatorOutcome",
  "correctionStatus",
  "providerMetadata",
  "toolResultsUsed",
  "errorState",
]);

const GROUNDED_FACT_ALLOWED_KEYS = new Set(["kind", "id"]);
const TOOL_SUMMARY_ALLOWED_KEYS = new Set(["requestId", "toolName", "status", "provenance"]);
const PROVIDER_METADATA_ALLOWED_KEYS = new Set(["providerId", "modelFamily"]);
const ERROR_STATE_ALLOWED_KEYS = new Set(["code", "fallbackPath", "message"]);

const APPROVED_FALLBACK_PATHS = new Set([
  "legacy-v2",
  "honest-unavailable",
  "deterministic-grounded",
]);

function collectOkToolResults(toolResults: ToolResult[]): ToolResult[] {
  return toolResults.filter((item) => item.status === "ok");
}

function collectGroundedListingIds(okToolResults: ToolResult[]): Set<string> {
  const ids = new Set<string>();
  for (const result of okToolResults) {
    for (const listingId of listingIdsFromToolResult(result)) {
      ids.add(listingId);
    }
  }
  return ids;
}

function buildTrustedToolResultMap(toolResults: ToolResult[]): Map<string, ToolResult> {
  const map = new Map<string, ToolResult>();
  for (const item of toolResults) {
    map.set(item.requestId, item);
  }
  return map;
}

function parseRequiredToolRequestIds(raw: unknown): ValidationResult<string[]> {
  if (raw === undefined) {
    return { ok: true, value: [] };
  }
  if (!Array.isArray(raw)) {
    return fail([
      issue("requiredToolRequestIds", "invalid_type", "Required tool request ids must be an array"),
    ]);
  }

  const issues: ValidationIssue[] = [];
  const ids: string[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < raw.length; index += 1) {
    const requestId = validateNonEmptyId(
      raw[index],
      `requiredToolRequestIds[${index}]`,
      issues
    );
    if (!requestId) {
      continue;
    }
    if (seen.has(requestId)) {
      issues.push(
        issue(
          `requiredToolRequestIds[${index}]`,
          "duplicate_required_tool_id",
          "Required tool request ids must be unique"
        )
      );
      continue;
    }
    seen.add(requestId);
    ids.push(requestId);
  }

  if (issues.length > 0) {
    return fail(issues);
  }

  return { ok: true, value: ids };
}

export function parseTrustedToolResults(raw: unknown): ValidationResult<ToolResult[]> {
  if (!Array.isArray(raw)) {
    return fail([issue("toolResults", "invalid_tool_results", "Tool results must be an array")]);
  }

  const issues: ValidationIssue[] = [];
  const parsed: ToolResult[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < raw.length; index += 1) {
    const validated = validateToolResult(raw[index]);
    if (isValidationFailure(validated)) {
      for (const childIssue of validated.issues) {
        issues.push({
          ...childIssue,
          path: `toolResults[${index}].${childIssue.path}`,
        });
      }
      continue;
    }

    if (seen.has(validated.value.requestId)) {
      issues.push(
        issue(
          `toolResults[${index}].requestId`,
          "duplicate_tool_result",
          "Tool result request ids must be unique"
        )
      );
      continue;
    }
    seen.add(validated.value.requestId);
    parsed.push(validated.value);
  }

  if (issues.length > 0) {
    return fail(issues);
  }

  return { ok: true, value: parsed };
}

function parseContextToolResults(
  raw: unknown,
  expectedConversationId: string
): ValidationResult<ToolResult[]> {
  const parsed = parseTrustedToolResults(raw);
  if (!parsed.ok) {
    return parsed;
  }

  const issues: ValidationIssue[] = [];
  const validated: ToolResult[] = [];

  for (let index = 0; index < parsed.value.length; index += 1) {
    const result = parsed.value[index];
    if (result.conversationId !== expectedConversationId.trim()) {
      issues.push(
        issue(
          `toolResults[${index}].conversationId`,
          "conversation_mismatch",
          "Tool result conversation id does not match expected conversation"
        )
      );
      continue;
    }
    validated.push(result);
  }

  if (issues.length > 0) {
    return fail(issues);
  }

  return { ok: true, value: validated };
}

function validateProviderMetadata(
  raw: unknown,
  issues: ValidationIssue[]
): ProviderMetadata | undefined {
  if (raw === undefined) {
    return undefined;
  }
  if (!isPlainObject(raw)) {
    issues.push(
      issue("providerMetadata", "invalid_provider_metadata", "Provider metadata must be an object")
    );
    return undefined;
  }

  for (const key of PROVIDER_METADATA_FORBIDDEN_KEYS) {
    if (key in raw) {
      issues.push(
        issue(`providerMetadata.${key}`, "secret_field_forbidden", "Provider metadata cannot include secrets")
      );
    }
  }

  rejectUnknownKeys(raw, PROVIDER_METADATA_ALLOWED_KEYS, "providerMetadata", issues);

  const providerId = requireString(raw.providerId, "providerMetadata.providerId", issues, {
    maxLength: 128,
  });
  if (!providerId) {
    return undefined;
  }

  let modelFamily: string | undefined;
  if (raw.modelFamily !== undefined) {
    const parsed = requireString(raw.modelFamily, "providerMetadata.modelFamily", issues, {
      maxLength: 64,
    });
    if (parsed) {
      modelFamily = parsed;
    }
  }

  return {
    providerId,
    ...(modelFamily ? { modelFamily } : {}),
  };
}

function validateGroundedFactRefs(
  raw: unknown,
  issues: ValidationIssue[],
  okToolResultIds: Set<string>,
  groundedListingIds: Set<string>
): GroundedFactRef[] {
  if (!Array.isArray(raw)) {
    issues.push(
      issue("groundedFactRefs", "invalid_grounded_refs", "Grounded fact refs must be an array")
    );
    return [];
  }

  const refs: GroundedFactRef[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < raw.length; index += 1) {
    const item = raw[index];
    const path = `groundedFactRefs[${index}]`;
    if (!isPlainObject(item)) {
      issues.push(issue(path, "invalid_grounded_ref", "Grounded fact ref must be an object"));
      continue;
    }
    rejectUnknownKeys(item, GROUNDED_FACT_ALLOWED_KEYS, path, issues);

    if (typeof item.kind !== "string") {
      issues.push(issue(`${path}.kind`, "invalid_type", "Grounded fact kind must be a string"));
      continue;
    }
    const kind = item.kind.trim();
    const id = validateNonEmptyId(item.id, `${path}.id`, issues);
    if (!id) {
      continue;
    }

    const dedupeKey = `${kind}:${id}`;
    if (seen.has(dedupeKey)) {
      issues.push(issue(`${path}.id`, "duplicate_grounded_ref", "Grounded fact refs must be unique"));
      continue;
    }
    seen.add(dedupeKey);

    if (kind === "tool-result") {
      if (!okToolResultIds.has(id)) {
        issues.push(
          issue(`${path}.id`, "ungrounded_tool_result", "Grounded tool result must be successful")
        );
      }
      refs.push({ kind: "tool-result", id });
      continue;
    }
    if (kind === "listing") {
      if (!groundedListingIds.has(id)) {
        issues.push(
          issue(`${path}.id`, "ungrounded_listing_id", "Grounded listing ref must exist in successful tool results")
        );
      }
      refs.push({ kind: "listing", id });
      continue;
    }
    issues.push(issue(`${path}.kind`, "invalid_grounded_kind", "Grounded fact kind is invalid"));
  }
  return refs;
}

function validateToolResultSummaries(
  raw: unknown,
  issues: ValidationIssue[],
  toolResults: ToolResult[]
): ToolResultSummary[] {
  if (!Array.isArray(raw)) {
    issues.push(
      issue("toolResultsUsed", "invalid_tool_summaries", "Tool result summaries must be an array")
    );
    return [];
  }

  const known = new Map(toolResults.map((item) => [item.requestId, item]));
  const summaries: ToolResultSummary[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < raw.length; index += 1) {
    const item = raw[index];
    const path = `toolResultsUsed[${index}]`;
    if (!isPlainObject(item)) {
      issues.push(issue(path, "invalid_tool_summary", "Tool result summary must be an object"));
      continue;
    }
    rejectUnknownKeys(item, TOOL_SUMMARY_ALLOWED_KEYS, path, issues);

    const requestId = validateNonEmptyId(item.requestId, `${path}.requestId`, issues);
    if (!requestId) {
      continue;
    }
    if (seen.has(requestId)) {
      issues.push(issue(`${path}.requestId`, "duplicate_tool_summary", "Tool summaries must be unique"));
      continue;
    }
    seen.add(requestId);

    const knownResult = known.get(requestId);
    if (!knownResult) {
      issues.push(issue(`${path}.requestId`, "unknown_tool_result", "Tool result summary is unknown"));
      continue;
    }

    if (typeof item.toolName !== "string") {
      issues.push(issue(`${path}.toolName`, "invalid_type", "Tool name must be a string"));
      continue;
    }
    if (item.toolName.trim() !== knownResult.toolName) {
      issues.push(issue(`${path}.toolName`, "tool_mismatch", "Tool result summary tool name mismatch"));
    }

    if (typeof item.status !== "string") {
      issues.push(issue(`${path}.status`, "invalid_type", "Status must be a string"));
      continue;
    }
    if (item.status.trim() !== knownResult.status) {
      issues.push(issue(`${path}.status`, "status_mismatch", "Tool result summary status mismatch"));
    }

    if (typeof item.provenance !== "string") {
      issues.push(issue(`${path}.provenance`, "invalid_type", "Provenance must be a string"));
      continue;
    }
    if (item.provenance.trim() !== knownResult.provenance) {
      issues.push(
        issue(`${path}.provenance`, "provenance_mismatch", "Tool result summary provenance mismatch")
      );
    }

    summaries.push({
      requestId,
      toolName: knownResult.toolName,
      status: knownResult.status,
      provenance: knownResult.provenance,
    });
  }

  return summaries;
}

function validateErrorState(
  raw: unknown,
  issues: ValidationIssue[]
): ConversationCoreErrorState | undefined {
  if (raw === undefined) {
    return undefined;
  }
  if (!isPlainObject(raw)) {
    issues.push(issue("errorState", "invalid_error_state", "Error state must be an object"));
    return undefined;
  }

  rejectUnknownKeys(raw, ERROR_STATE_ALLOWED_KEYS, "errorState", issues);

  if (typeof raw.code !== "string") {
    issues.push(issue("errorState.code", "invalid_type", "Error code must be a string"));
    return undefined;
  }
  const code = raw.code.trim();
  if (!(CORE_ERROR_CODES as readonly string[]).includes(code) || code === "none") {
    issues.push(issue("errorState.code", "invalid_error_code", "Error code is invalid"));
    return undefined;
  }

  if (typeof raw.fallbackPath !== "string") {
    issues.push(issue("errorState.fallbackPath", "invalid_type", "Fallback path must be a string"));
    return undefined;
  }
  const fallbackPath = raw.fallbackPath.trim();
  if (!APPROVED_FALLBACK_PATHS.has(fallbackPath)) {
    issues.push(issue("errorState.fallbackPath", "invalid_fallback_path", "Fallback path is invalid"));
    return undefined;
  }

  let message: string | undefined;
  if (raw.message !== undefined) {
    const parsed = requireString(raw.message, "errorState.message", issues, {
      maxLength: CONVERSATION_CORE_MAX_MESSAGE_LENGTH,
    });
    if (parsed) {
      message = parsed;
    }
  }

  return {
    code: code as CoreErrorCode,
    fallbackPath: fallbackPath as ConversationCoreErrorState["fallbackPath"],
    ...(message ? { message } : {}),
  };
}

function validateRequiredToolFailures(
  requiredToolRequestIds: string[],
  toolResults: ToolResult[],
  errorState: ConversationCoreErrorState | undefined,
  workspaceActions: WorkspaceAction[],
  groundedFactRefs: GroundedFactRef[],
  issues: ValidationIssue[]
): void {
  if (requiredToolRequestIds.length === 0) {
    return;
  }

  const toolById = buildTrustedToolResultMap(toolResults);

  for (const requiredId of requiredToolRequestIds) {
    const result = toolById.get(requiredId);
    const failed = !result || result.status !== "ok";

    if (!failed) {
      continue;
    }

    const hasApprovedErrorState =
      errorState !== undefined &&
      (APPROVED_TOOL_FAILURE_ERROR_CODES as readonly string[]).includes(errorState.code) &&
      APPROVED_FALLBACK_PATHS.has(errorState.fallbackPath);

    if (!hasApprovedErrorState) {
      issues.push(
        issue(
          "$",
          "required_tool_failure",
          "Required tool failure must include approved error state fallback"
        )
      );
    }

    for (let index = 0; index < workspaceActions.length; index += 1) {
      if (workspaceActions[index].provenance.toolRequestId === requiredId) {
        issues.push(
          issue(
            `workspaceActions[${index}]`,
            "workspace_from_failed_required_tool",
            "Workspace action cannot reference a failed required tool"
          )
        );
      }
    }

    for (let index = 0; index < groundedFactRefs.length; index += 1) {
      const ref = groundedFactRefs[index];
      if (ref.kind === "tool-result" && ref.id === requiredId) {
        issues.push(
          issue(
            `groundedFactRefs[${index}].id`,
            "grounded_failed_required_tool",
            "Grounded fact cannot reference a failed required tool"
          )
        );
      }
    }
  }
}

function validateAuditLinkConsistency(
  workspaceActions: WorkspaceAction[],
  groundedFactRefs: GroundedFactRef[],
  toolResultsUsed: ToolResultSummary[],
  validatedToolResults: ToolResult[],
  issues: ValidationIssue[]
): void {
  const summaryIds = new Set(toolResultsUsed.map((item) => item.requestId));
  const okToolById = new Map(
    validatedToolResults
      .filter((item) => item.status === "ok")
      .map((item) => [item.requestId, item])
  );

  for (let index = 0; index < workspaceActions.length; index += 1) {
    const toolRequestId = workspaceActions[index].provenance.toolRequestId;
    if (!summaryIds.has(toolRequestId)) {
      issues.push(
        issue(
          `workspaceActions[${index}].provenance.toolRequestId`,
          "audit_link_missing",
          "Workspace action must declare its tool result in toolResultsUsed"
        )
      );
    }
  }

  for (let index = 0; index < groundedFactRefs.length; index += 1) {
    const ref = groundedFactRefs[index];
    if (ref.kind === "tool-result") {
      if (!summaryIds.has(ref.id)) {
        issues.push(
          issue(
            `groundedFactRefs[${index}].id`,
            "audit_link_missing",
            "Grounded tool result must appear in toolResultsUsed"
          )
        );
      }
      continue;
    }

    const hasAuditedListingSource = toolResultsUsed.some((summary) => {
      const source = okToolById.get(summary.requestId);
      return source ? listingIdsFromToolResult(source).has(ref.id) : false;
    });
    if (!hasAuditedListingSource) {
      issues.push(
        issue(
          `groundedFactRefs[${index}].id`,
          "audit_link_missing",
          "Grounded listing must be backed by a declared successful tool result"
        )
      );
    }
  }
}

export function validateConversationCoreResult(
  raw: unknown,
  context: ConversationCoreResultValidationContext
): ValidationResult<ConversationCoreResult> {
  const issues: ValidationIssue[] = [];

  if (!isPlainObject(raw)) {
    return fail([issue("$", "invalid_core_result", "Conversation core result must be an object")]);
  }

  rejectUnknownKeys(raw, RESULT_ALLOWED_KEYS, "$", issues);

  const conversationId = validateNonEmptyId(raw.conversationId, "conversationId", issues);
  const messageId = validateNonEmptyId(raw.messageId, "messageId", issues);

  if (conversationId && conversationId !== context.expectedConversationId.trim()) {
    issues.push(
      issue("conversationId", "conversation_mismatch", "Result conversation id does not match request")
    );
  }
  if (messageId && messageId !== context.expectedMessageId.trim()) {
    issues.push(issue("messageId", "message_mismatch", "Result message id does not match request"));
  }

  let assistantText = "";
  if (typeof raw.assistantText !== "string") {
    issues.push(issue("assistantText", "invalid_type", "Assistant text must be a string"));
  } else {
    assistantText = raw.assistantText.trim();
    if (!assistantText) {
      issues.push(issue("assistantText", "empty_assistant_text", "Assistant text is required"));
    } else if (assistantText.length > CONVERSATION_CORE_MAX_MESSAGE_LENGTH) {
      issues.push(issue("assistantText", "message_too_large", "Assistant text is too long"));
    } else if (containsHtmlOrScript(assistantText)) {
      issues.push(
        issue("assistantText", "markup_not_allowed", "Assistant text must not include raw HTML or script")
      );
    }
  }

  let safetyOutcome: SafetyOutcome | null = null;
  if (typeof raw.safetyOutcome !== "string") {
    issues.push(issue("safetyOutcome", "invalid_type", "Safety outcome must be a string"));
  } else {
    const normalized = raw.safetyOutcome.trim();
    if (!(SAFETY_OUTCOMES as readonly string[]).includes(normalized)) {
      issues.push(issue("safetyOutcome", "invalid_safety_outcome", "Safety outcome is invalid"));
    } else {
      safetyOutcome = normalized as SafetyOutcome;
    }
  }

  let validatorOutcome: ValidatorOutcome | null = null;
  if (typeof raw.validatorOutcome !== "string") {
    issues.push(issue("validatorOutcome", "invalid_type", "Validator outcome must be a string"));
  } else {
    const normalized = raw.validatorOutcome.trim();
    if (!(VALIDATOR_OUTCOMES as readonly string[]).includes(normalized)) {
      issues.push(
        issue("validatorOutcome", "invalid_validator_outcome", "Validator outcome is invalid")
      );
    } else {
      validatorOutcome = normalized as ValidatorOutcome;
    }
  }

  let correctionStatus: CorrectionStatus | null = null;
  if (typeof raw.correctionStatus !== "string") {
    issues.push(issue("correctionStatus", "invalid_type", "Correction status must be a string"));
  } else {
    const normalized = raw.correctionStatus.trim();
    if (!(CORRECTION_STATUSES as readonly string[]).includes(normalized)) {
      issues.push(
        issue("correctionStatus", "invalid_correction_status", "Correction status is invalid")
      );
    } else {
      correctionStatus = normalized as CorrectionStatus;
    }
  }

  const providerMetadata = validateProviderMetadata(raw.providerMetadata, issues);

  const parsedToolResults = parseContextToolResults(
    context.toolResults,
    context.expectedConversationId
  );
  if (isValidationFailure(parsedToolResults)) {
    for (const childIssue of parsedToolResults.issues) {
      issues.push(childIssue);
    }
  }

  const parsedRequiredToolIds = parseRequiredToolRequestIds(context.requiredToolRequestIds);
  if (isValidationFailure(parsedRequiredToolIds)) {
    for (const childIssue of parsedRequiredToolIds.issues) {
      issues.push(childIssue);
    }
  }

  const validatedToolResults = parsedToolResults.ok ? parsedToolResults.value : [];
  const requiredToolRequestIds = parsedRequiredToolIds.ok ? parsedRequiredToolIds.value : [];

  const okToolResults = collectOkToolResults(validatedToolResults);
  const groundedListingIds = collectGroundedListingIds(okToolResults);
  const okToolResultIds = new Set(okToolResults.map((item) => item.requestId));
  const trustedToolResults = buildTrustedToolResultMap(validatedToolResults);

  const groundedFactRefs = validateGroundedFactRefs(
    raw.groundedFactRefs,
    issues,
    okToolResultIds,
    groundedListingIds
  );

  const toolResultsUsed = validateToolResultSummaries(
    raw.toolResultsUsed,
    issues,
    validatedToolResults
  );

  const workspaceActions: WorkspaceAction[] = [];
  if (!Array.isArray(raw.workspaceActions)) {
    issues.push(
      issue("workspaceActions", "invalid_workspace_actions", "Workspace actions must be an array")
    );
  } else {
    const workspaceContext: WorkspaceActionValidationContext = {
      expectedConversationId: context.expectedConversationId,
      trustedToolResults,
    };
    for (let index = 0; index < raw.workspaceActions.length; index += 1) {
      const validated = validateWorkspaceAction(raw.workspaceActions[index], workspaceContext);
      if (isValidationFailure(validated)) {
        for (const childIssue of validated.issues) {
          issues.push({
            ...childIssue,
            path: `workspaceActions[${index}].${childIssue.path}`,
          });
        }
      } else {
        workspaceActions.push(validated.value);
      }
    }
  }

  const errorState = validateErrorState(raw.errorState, issues);

  validateRequiredToolFailures(
    requiredToolRequestIds,
    validatedToolResults,
    errorState,
    workspaceActions,
    groundedFactRefs,
    issues
  );

  validateAuditLinkConsistency(
    workspaceActions,
    groundedFactRefs,
    toolResultsUsed,
    validatedToolResults,
    issues
  );

  if (
    issues.length > 0 ||
    !conversationId ||
    !messageId ||
    !assistantText ||
    !safetyOutcome ||
    !validatorOutcome ||
    !correctionStatus ||
    !parsedToolResults.ok ||
    !parsedRequiredToolIds.ok
  ) {
    return fail(issues);
  }

  return {
    ok: true,
    value: {
      conversationId,
      messageId,
      assistantText,
      groundedFactRefs,
      workspaceActions,
      safetyOutcome,
      validatorOutcome,
      correctionStatus,
      ...(providerMetadata ? { providerMetadata } : {}),
      toolResultsUsed,
      ...(errorState ? { errorState } : {}),
    },
  };
}

