/**
 * WP-V2U-02 / R1 — Client turn request vs server-owned execution context.
 * Canonical Phase 1 policy primitives live here to prevent allowlist drift.
 */

export const CONVERSATION_CORE_POLICY_VERSION = "wp-v2u-02-v1";

export const CONVERSATION_CORE_MAX_ID_LENGTH = 128;
export const CONVERSATION_CORE_MAX_MESSAGE_LENGTH = 4000;
export const CONVERSATION_CORE_MAX_HISTORY_TURNS = 20;
export const CONVERSATION_CORE_MAX_HISTORY_CONTENT_CHARS = 24_000;
export const CONVERSATION_CORE_MAX_LOCALE_LENGTH = 16;
export const CONVERSATION_CORE_MAX_ATTACHED_IMAGE_COUNT = 12;
export const CONVERSATION_CORE_MAX_LISTING_ID_LENGTH = 128;
export const CONVERSATION_CORE_MAX_LISTING_ID_COUNT = 50;
export const CONVERSATION_CORE_MAX_VERIFIED_TEXT_LENGTH = 128;
export const CONVERSATION_CORE_MAX_ERROR_CODE_LENGTH = 64;
export const CONVERSATION_CORE_MAX_SNAPSHOT_VERSION_LENGTH = 64;
export const CONVERSATION_CORE_MAX_FINANCE_AMOUNT = 100_000_000;

/** Canonical Phase 1 read-only tool allowlist — single source of truth. */
export const PHASE1_READ_ONLY_TOOLS = [
  "inventory.fetch",
  "marketplace.search",
  "vehicle.resolveSelection",
  "finance.calculate",
] as const;

export type ConversationCoreToolName = (typeof PHASE1_READ_ONLY_TOOLS)[number];

export const TOOL_RESULT_PROVENANCES = [
  "inventory-api",
  "marketplace-search",
  "vehicle-selection",
  "finance-calculator",
] as const;

export type ToolResultProvenance = (typeof TOOL_RESULT_PROVENANCES)[number];

export const TOOL_REQUIRED_PROVENANCE_BY_TOOL: Record<
  ConversationCoreToolName,
  ToolResultProvenance
> = {
  "inventory.fetch": "inventory-api",
  "marketplace.search": "marketplace-search",
  "vehicle.resolveSelection": "vehicle-selection",
  "finance.calculate": "finance-calculator",
};

export const FORBIDDEN_TOOL_NAME_PREFIXES = ["posting.", "lead."] as const;

export const FORBIDDEN_TOOL_NAMES = [
  "posting.publish",
  "posting.delete",
  "lead.create",
  "lead.deliver",
  "inventory.write",
  "inventory.update",
  "consent.mutate",
] as const;

export const CONVERSATION_CORE_EXPERT_MODES = [
  "AUTO",
  "BUYING",
  "MAINTENANCE",
  "REPAIR",
  "INSURANCE",
  "FINANCE",
] as const;

export type ConversationCoreExpertMode =
  (typeof CONVERSATION_CORE_EXPERT_MODES)[number];

export const CONVERSATION_HISTORY_ROLES = ["user", "assistant"] as const;

export type ConversationHistoryRole = (typeof CONVERSATION_HISTORY_ROLES)[number];

export interface ConversationHistoryTurn {
  role: ConversationHistoryRole;
  content: string;
}

/** Client claim only — not trusted vehicle context. */
export interface SelectedVehicleRef {
  listingId: string;
}

export interface ConversationTurnRequest {
  conversationId: string;
  messageId: string;
  userMessage: string;
  history?: ConversationHistoryTurn[];
  expertMode?: ConversationCoreExpertMode;
  locale?: string;
  selectedVehicleRef?: SelectedVehicleRef;
  attachedImageCount?: number;
}

export interface ConversationCoreActorScope {
  kind: "anonymous" | "authenticated";
  actorRef: string;
  role?: "client" | "dealer" | "admin";
}

/** Execution-ready ownership binding — only verified bindings are representable. */
export interface ConversationCoreOwnershipBinding {
  ownerActorRef: string;
  bindingVerified: true;
}

export interface ConversationCoreFeatureFlagSnapshot {
  coreEnabled: boolean;
  geminiEnabled: boolean;
  toolsEnabled: boolean;
  workspaceActionsEnabled: boolean;
}

export interface ConversationCoreExecutionContext {
  conversationId: string;
  actorScope: ConversationCoreActorScope;
  conversationOwnership: ConversationCoreOwnershipBinding;
  featureFlags: ConversationCoreFeatureFlagSnapshot;
  toolAllowlist: readonly ConversationCoreToolName[];
  receivedAtMs: number;
  policyVersion: string;
  correlationId?: string;
}

export interface ValidationIssue {
  path: string;
  code: string;
  message: string;
}

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; issues: ValidationIssue[] };

export function isValidationFailure<T>(
  result: ValidationResult<T>
): result is { ok: false; issues: ValidationIssue[] } {
  return result.ok === false;
}

const CLIENT_ALLOWED_KEYS = new Set([
  "conversationId",
  "messageId",
  "userMessage",
  "history",
  "expertMode",
  "locale",
  "selectedVehicleRef",
  "attachedImageCount",
]);

export const CONVERSATION_TURN_CLIENT_FORBIDDEN_KEYS = [
  "userAuthScope",
  "authScope",
  "featureFlags",
  "featureFlagContext",
  "toolCapabilities",
  "toolAllowlist",
  "consentStatus",
  "writePermission",
  "role",
  "isAdmin",
  "isDealer",
  "environment",
  "serverFeatureFlags",
  "systemPrompt",
  "systemInstruction",
  "provider",
  "providerId",
  "model",
  "modelId",
  "apiKey",
  "secret",
  "token",
  "rendererId",
  "workspaceActions",
  "verifiedFields",
  "toolResults",
] as const;

const HTML_COMMENT_OR_DECLARATION_PATTERN = /<!--|<!\s*[a-z]/i;
const HTML_EVENT_HANDLER_PATTERN = /\bon[a-z]+\s*=/i;
const JAVASCRIPT_URI_PATTERN = /javascript\s*:/i;
/** Requires a tag name and closing `>` so comparisons like `3 < 5` are not treated as HTML. */
const HTML_TAG_PATTERN = /<\s*\/?\s*[a-z][a-z0-9-]*(?:\s+[^<>]*?)?\/?>/i;

const HISTORY_TURN_ALLOWED_KEYS = new Set(["role", "content"]);
const ACTOR_SCOPE_ALLOWED_KEYS = new Set(["kind", "actorRef", "role"]);
const OWNERSHIP_ALLOWED_KEYS = new Set(["ownerActorRef", "bindingVerified"]);
const FEATURE_FLAG_ALLOWED_KEYS = new Set([
  "coreEnabled",
  "geminiEnabled",
  "toolsEnabled",
  "workspaceActionsEnabled",
]);
const EXECUTION_CONTEXT_ALLOWED_KEYS = new Set([
  "conversationId",
  "actorScope",
  "conversationOwnership",
  "featureFlags",
  "toolAllowlist",
  "receivedAtMs",
  "policyVersion",
  "correlationId",
]);
const SELECTED_VEHICLE_REF_ALLOWED_KEYS = new Set(["listingId"]);

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function containsHtmlOrScript(value: string): boolean {
  return (
    HTML_COMMENT_OR_DECLARATION_PATTERN.test(value) ||
    HTML_EVENT_HANDLER_PATTERN.test(value) ||
    JAVASCRIPT_URI_PATTERN.test(value) ||
    HTML_TAG_PATTERN.test(value)
  );
}

export function issue(
  path: string,
  code: string,
  message: string
): ValidationIssue {
  return { path, code, message };
}

export function fail<T>(issues: ValidationIssue[]): ValidationResult<T> {
  return { ok: false, issues };
}

export function rejectUnknownKeys(
  raw: Record<string, unknown>,
  allowedKeys: ReadonlySet<string>,
  path: string,
  issues: ValidationIssue[]
): void {
  for (const key of Object.keys(raw)) {
    if (!allowedKeys.has(key)) {
      issues.push(issue(`${path}.${key}`, "unknown_field", "Unknown field is not allowed"));
    }
  }
}

export function requireString(
  raw: unknown,
  path: string,
  issues: ValidationIssue[],
  options?: { maxLength?: number; allowEmpty?: boolean }
): string | null {
  if (typeof raw !== "string") {
    issues.push(issue(path, "invalid_type", "Value must be a string"));
    return null;
  }
  const value = raw.trim();
  const maxLength = options?.maxLength ?? CONVERSATION_CORE_MAX_ID_LENGTH;
  if (!options?.allowEmpty && !value) {
    issues.push(issue(path, "empty_string", "String value is required"));
    return null;
  }
  if (value.length > maxLength) {
    issues.push(issue(path, "string_too_long", "String value exceeds maximum length"));
    return null;
  }
  if (value && containsHtmlOrScript(value)) {
    issues.push(issue(path, "markup_not_allowed", "String must be plain text"));
    return null;
  }
  return value;
}

export function validateNonEmptyId(
  raw: unknown,
  path: string,
  issues: ValidationIssue[]
): string | null {
  if (typeof raw !== "string") {
    issues.push(issue(path, "invalid_type", "ID must be a string"));
    return null;
  }
  const value = raw.trim();
  if (!value || value.length > CONVERSATION_CORE_MAX_ID_LENGTH) {
    issues.push(
      issue(path, "invalid_id", "ID is required and must be within bounds")
    );
    return null;
  }
  if (containsHtmlOrScript(value)) {
    issues.push(issue(path, "invalid_id", "ID contains disallowed markup"));
    return null;
  }
  return value;
}

export function requireFiniteNumber(
  raw: unknown,
  path: string,
  issues: ValidationIssue[],
  options?: { min?: number; max?: number; integer?: boolean }
): number | null {
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    issues.push(issue(path, "invalid_number", "Value must be a finite number"));
    return null;
  }
  if (options?.integer && !Number.isInteger(raw)) {
    issues.push(issue(path, "invalid_integer", "Value must be an integer"));
    return null;
  }
  if (options?.min !== undefined && raw < options.min) {
    issues.push(issue(path, "number_out_of_bounds", "Number is below minimum"));
    return null;
  }
  if (options?.max !== undefined && raw > options.max) {
    issues.push(issue(path, "number_out_of_bounds", "Number exceeds maximum"));
    return null;
  }
  return raw;
}

export function requireBoolean(
  raw: unknown,
  path: string,
  issues: ValidationIssue[]
): boolean | null {
  if (typeof raw !== "boolean") {
    issues.push(issue(path, "invalid_type", "Value must be a boolean"));
    return null;
  }
  return raw;
}

export function isPhase1ReadOnlyToolName(
  value: string
): value is ConversationCoreToolName {
  return (PHASE1_READ_ONLY_TOOLS as readonly string[]).includes(value);
}

export function isForbiddenToolName(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if ((FORBIDDEN_TOOL_NAMES as readonly string[]).includes(normalized)) {
    return true;
  }
  return FORBIDDEN_TOOL_NAME_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function normalizeExpertMode(raw: unknown): ConversationCoreExpertMode | null {
  if (typeof raw !== "string") {
    return null;
  }
  const value = raw.trim().toUpperCase();
  return (CONVERSATION_CORE_EXPERT_MODES as readonly string[]).includes(value)
    ? (value as ConversationCoreExpertMode)
    : null;
}

function truncateHistoryToLimits(
  history: ConversationHistoryTurn[]
): ConversationHistoryTurn[] {
  const capped = history.slice(-CONVERSATION_CORE_MAX_HISTORY_TURNS);
  let total = 0;
  const kept: ConversationHistoryTurn[] = [];
  for (let index = capped.length - 1; index >= 0; index -= 1) {
    const turn = capped[index];
    const nextTotal = total + turn.content.length;
    if (
      nextTotal > CONVERSATION_CORE_MAX_HISTORY_CONTENT_CHARS &&
      kept.length > 0
    ) {
      break;
    }
    kept.unshift(turn);
    total = nextTotal;
  }
  return kept;
}

function validateHistory(
  raw: unknown,
  issues: ValidationIssue[]
): ConversationHistoryTurn[] | null {
  if (raw === undefined) {
    return [];
  }
  if (!Array.isArray(raw)) {
    issues.push(
      issue("history", "invalid_history", "History must be an array when provided")
    );
    return null;
  }
  if (raw.length > CONVERSATION_CORE_MAX_HISTORY_TURNS) {
    issues.push(
      issue("history", "history_too_large", "History exceeds maximum turn count")
    );
    return null;
  }

  const history: ConversationHistoryTurn[] = [];
  for (let index = 0; index < raw.length; index += 1) {
    const item = raw[index];
    const itemPath = `history[${index}]`;
    if (!isPlainObject(item)) {
      issues.push(
        issue(itemPath, "invalid_history", "History turn must be an object")
      );
      return null;
    }
    rejectUnknownKeys(item, HISTORY_TURN_ALLOWED_KEYS, itemPath, issues);

    if (typeof item.role !== "string") {
      issues.push(
        issue(`${itemPath}.role`, "invalid_type", "History role must be a string")
      );
      return null;
    }
    const role = item.role.trim().toLowerCase();
    if (!(CONVERSATION_HISTORY_ROLES as readonly string[]).includes(role)) {
      issues.push(
        issue(`${itemPath}.role`, "role_not_allowed", "History role is not allowed")
      );
      return null;
    }

    if (typeof item.content !== "string") {
      issues.push(
        issue(`${itemPath}.content`, "invalid_type", "History content must be a string")
      );
      return null;
    }
    const content = item.content;
    if (!content.trim()) {
      issues.push(
        issue(`${itemPath}.content`, "empty_content", "History content is required")
      );
      return null;
    }
    if (content.length > CONVERSATION_CORE_MAX_MESSAGE_LENGTH) {
      issues.push(
        issue(`${itemPath}.content`, "content_too_large", "History content is too long")
      );
      return null;
    }
    if (containsHtmlOrScript(content)) {
      issues.push(
        issue(`${itemPath}.content`, "markup_not_allowed", "History content must be plain text")
      );
      return null;
    }
    history.push({ role: role as ConversationHistoryRole, content });
  }

  return truncateHistoryToLimits(history);
}

function validateSelectedVehicleRef(
  raw: unknown,
  issues: ValidationIssue[]
): SelectedVehicleRef | undefined {
  if (raw === undefined) {
    return undefined;
  }
  if (!isPlainObject(raw)) {
    issues.push(
      issue(
        "selectedVehicleRef",
        "invalid_selected_vehicle_ref",
        "Selected vehicle reference must be an object"
      )
    );
    return undefined;
  }
  rejectUnknownKeys(raw, SELECTED_VEHICLE_REF_ALLOWED_KEYS, "selectedVehicleRef", issues);

  const listingId = validateNonEmptyId(
    raw.listingId,
    "selectedVehicleRef.listingId",
    issues
  );
  if (!listingId) {
    return undefined;
  }
  if (listingId.length > CONVERSATION_CORE_MAX_LISTING_ID_LENGTH) {
    issues.push(
      issue(
        "selectedVehicleRef.listingId",
        "invalid_listing_id",
        "Listing id exceeds maximum length"
      )
    );
    return undefined;
  }
  return { listingId };
}

function validateToolAllowlist(
  raw: unknown,
  toolsEnabled: boolean,
  issues: ValidationIssue[]
): ConversationCoreToolName[] | null {
  if (!Array.isArray(raw)) {
    issues.push(issue("toolAllowlist", "invalid_tool_allowlist", "Tool allowlist must be an array"));
    return null;
  }

  if (!toolsEnabled) {
    if (raw.length > 0) {
      issues.push(
        issue(
          "toolAllowlist",
          "tool_allowlist_must_be_empty",
          "Tool allowlist must be empty when tools are disabled"
        )
      );
    }
    return [];
  }

  if (raw.length === 0) {
    issues.push(
      issue("toolAllowlist", "empty_tool_allowlist", "Tool allowlist cannot be empty when tools are enabled")
    );
    return null;
  }

  const seen = new Set<string>();
  const allowlist: ConversationCoreToolName[] = [];

  for (let index = 0; index < raw.length; index += 1) {
    if (typeof raw[index] !== "string") {
      issues.push(
        issue(`toolAllowlist[${index}]`, "invalid_type", "Tool name must be a string")
      );
      return null;
    }
    const toolName = raw[index].trim();
    if (isForbiddenToolName(toolName)) {
      issues.push(
        issue(`toolAllowlist[${index}]`, "forbidden_tool", "Tool is not allowed in Phase 1")
      );
      return null;
    }
    if (!isPhase1ReadOnlyToolName(toolName)) {
      issues.push(
        issue(`toolAllowlist[${index}]`, "unknown_tool", "Tool name is not in the read-only allowlist")
      );
      return null;
    }
    if (seen.has(toolName)) {
      issues.push(
        issue(`toolAllowlist[${index}]`, "duplicate_tool", "Tool allowlist must not contain duplicates")
      );
      return null;
    }
    seen.add(toolName);
    allowlist.push(toolName);
  }

  return allowlist;
}

function validateFeatureFlagInvariants(
  flags: ConversationCoreFeatureFlagSnapshot,
  issues: ValidationIssue[]
): void {
  if (!flags.coreEnabled) {
    if (flags.geminiEnabled || flags.toolsEnabled || flags.workspaceActionsEnabled) {
      issues.push(
        issue(
          "featureFlags",
          "invalid_flag_combination",
          "Sub-capabilities require core to be enabled"
        )
      );
    }
  }
  if (flags.geminiEnabled && !flags.coreEnabled) {
    issues.push(
      issue("featureFlags.geminiEnabled", "invalid_flag_combination", "Gemini requires core enabled")
    );
  }
  if (flags.toolsEnabled && !flags.coreEnabled) {
    issues.push(
      issue("featureFlags.toolsEnabled", "invalid_flag_combination", "Tools require core enabled")
    );
  }
  if (flags.workspaceActionsEnabled && (!flags.coreEnabled || !flags.toolsEnabled)) {
    issues.push(
      issue(
        "featureFlags.workspaceActionsEnabled",
        "invalid_flag_combination",
        "Workspace actions require core and tools enabled"
      )
    );
  }
}

export function validateConversationTurnRequest(
  raw: unknown
): ValidationResult<ConversationTurnRequest> {
  const issues: ValidationIssue[] = [];

  if (!isPlainObject(raw)) {
    return fail([issue("$", "invalid_request", "Request must be a plain object")]);
  }

  for (const key of CONVERSATION_TURN_CLIENT_FORBIDDEN_KEYS) {
    if (key in raw) {
      issues.push(
        issue(key, "client_forbidden_field", "Client cannot send server-owned fields")
      );
    }
  }

  for (const key of Object.keys(raw)) {
    if (!CLIENT_ALLOWED_KEYS.has(key)) {
      issues.push(
        issue(key, "unknown_field", "Unknown field is not allowed on client request")
      );
    }
  }

  const conversationId = validateNonEmptyId(raw.conversationId, "conversationId", issues);
  const messageId = validateNonEmptyId(raw.messageId, "messageId", issues);

  let userMessage = "";
  if (typeof raw.userMessage !== "string") {
    issues.push(issue("userMessage", "invalid_type", "User message must be a string"));
  } else {
    userMessage = raw.userMessage.trim();
    if (!userMessage) {
      issues.push(issue("userMessage", "empty_message", "User message is required"));
    } else if (userMessage.length > CONVERSATION_CORE_MAX_MESSAGE_LENGTH) {
      issues.push(issue("userMessage", "message_too_large", "User message is too long"));
    } else if (containsHtmlOrScript(userMessage)) {
      issues.push(
        issue("userMessage", "markup_not_allowed", "User message must be plain text")
      );
    }
  }

  const history = validateHistory(raw.history, issues);

  let expertMode: ConversationCoreExpertMode | undefined;
  if (raw.expertMode !== undefined) {
    const normalized = normalizeExpertMode(raw.expertMode);
    if (!normalized) {
      issues.push(issue("expertMode", "invalid_expert_mode", "Expert mode is not allowed"));
    } else {
      expertMode = normalized;
    }
  }

  let locale: string | undefined;
  if (raw.locale !== undefined) {
    const parsedLocale = requireString(raw.locale, "locale", issues, {
      maxLength: CONVERSATION_CORE_MAX_LOCALE_LENGTH,
    });
    if (parsedLocale) {
      locale = parsedLocale;
    }
  }

  let attachedImageCount: number | undefined;
  if (raw.attachedImageCount !== undefined) {
    const count = requireFiniteNumber(raw.attachedImageCount, "attachedImageCount", issues, {
      min: 0,
      max: CONVERSATION_CORE_MAX_ATTACHED_IMAGE_COUNT,
      integer: true,
    });
    if (count !== null) {
      attachedImageCount = count;
    }
  }

  const selectedVehicleRef = validateSelectedVehicleRef(raw.selectedVehicleRef, issues);

  if (issues.length > 0 || !conversationId || !messageId || history === null || !userMessage) {
    return fail(issues);
  }

  return {
    ok: true,
    value: {
      conversationId,
      messageId,
      userMessage,
      ...(history.length > 0 ? { history } : {}),
      ...(expertMode ? { expertMode } : {}),
      ...(locale ? { locale } : {}),
      ...(selectedVehicleRef ? { selectedVehicleRef } : {}),
      ...(attachedImageCount !== undefined ? { attachedImageCount } : {}),
    },
  };
}

export function validateConversationCoreExecutionContext(
  raw: unknown
): ValidationResult<ConversationCoreExecutionContext> {
  const issues: ValidationIssue[] = [];

  if (!isPlainObject(raw)) {
    return fail([
      issue("$", "invalid_execution_context", "Execution context must be a plain object"),
    ]);
  }

  rejectUnknownKeys(raw, EXECUTION_CONTEXT_ALLOWED_KEYS, "$", issues);

  const conversationId = validateNonEmptyId(raw.conversationId, "conversationId", issues);

  let actorScope: ConversationCoreActorScope | null = null;
  if (!isPlainObject(raw.actorScope)) {
    issues.push(issue("actorScope", "invalid_actor_scope", "Actor scope is required"));
  } else {
    rejectUnknownKeys(raw.actorScope, ACTOR_SCOPE_ALLOWED_KEYS, "actorScope", issues);
    if (typeof raw.actorScope.kind !== "string") {
      issues.push(issue("actorScope.kind", "invalid_type", "Actor kind must be a string"));
    } else {
      const kind = raw.actorScope.kind.trim();
      if (kind !== "anonymous" && kind !== "authenticated") {
        issues.push(issue("actorScope.kind", "invalid_actor_kind", "Actor kind is invalid"));
      } else {
        const actorRef = requireString(raw.actorScope.actorRef, "actorScope.actorRef", issues, {
          maxLength: CONVERSATION_CORE_MAX_ID_LENGTH,
        });
        if (!actorRef) {
          issues.push(
            issue("actorScope.actorRef", "missing_actor_ref", "Actor reference is required")
          );
        } else {
          actorScope = { kind: kind as ConversationCoreActorScope["kind"], actorRef };
          if (raw.actorScope.role !== undefined) {
            if (typeof raw.actorScope.role !== "string") {
              issues.push(issue("actorScope.role", "invalid_type", "Actor role must be a string"));
            } else {
              const role = raw.actorScope.role.trim();
              if (!["client", "dealer", "admin"].includes(role)) {
                issues.push(issue("actorScope.role", "invalid_role", "Actor role is invalid"));
              } else if (kind === "anonymous" && (role === "dealer" || role === "admin")) {
                issues.push(
                  issue(
                    "actorScope.role",
                    "invalid_role_for_anonymous",
                    "Anonymous actor cannot use privileged roles"
                  )
                );
              } else {
                actorScope.role = role as ConversationCoreActorScope["role"];
              }
            }
          }
        }
      }
    }
  }

  let conversationOwnership: ConversationCoreOwnershipBinding | null = null;
  if (!isPlainObject(raw.conversationOwnership)) {
    issues.push(
      issue(
        "conversationOwnership",
        "invalid_ownership",
        "Conversation ownership binding is required"
      )
    );
  } else {
    rejectUnknownKeys(
      raw.conversationOwnership,
      OWNERSHIP_ALLOWED_KEYS,
      "conversationOwnership",
      issues
    );
    const bindingVerified = requireBoolean(
      raw.conversationOwnership.bindingVerified,
      "conversationOwnership.bindingVerified",
      issues
    );
    if (bindingVerified === false) {
      issues.push(
        issue(
          "conversationOwnership.bindingVerified",
          "ownership_not_verified",
          "Execution context requires verified ownership binding"
        )
      );
    }
    if (bindingVerified === true) {
      const ownerActorRef = requireString(
        raw.conversationOwnership.ownerActorRef,
        "conversationOwnership.ownerActorRef",
        issues,
        { maxLength: CONVERSATION_CORE_MAX_ID_LENGTH }
      );
      if (!ownerActorRef) {
        issues.push(
          issue(
            "conversationOwnership.ownerActorRef",
            "missing_owner_actor_ref",
            "Verified ownership requires owner actor reference"
          )
        );
      } else {
        conversationOwnership = { bindingVerified: true, ownerActorRef };
      }
    }
  }

  let featureFlags: ConversationCoreFeatureFlagSnapshot | null = null;
  if (!isPlainObject(raw.featureFlags)) {
    issues.push(issue("featureFlags", "invalid_feature_flags", "Feature flags are required"));
  } else {
    rejectUnknownKeys(raw.featureFlags, FEATURE_FLAG_ALLOWED_KEYS, "featureFlags", issues);
    const coreEnabled = requireBoolean(raw.featureFlags.coreEnabled, "featureFlags.coreEnabled", issues);
    const geminiEnabled = requireBoolean(
      raw.featureFlags.geminiEnabled,
      "featureFlags.geminiEnabled",
      issues
    );
    const toolsEnabled = requireBoolean(
      raw.featureFlags.toolsEnabled,
      "featureFlags.toolsEnabled",
      issues
    );
    const workspaceActionsEnabled = requireBoolean(
      raw.featureFlags.workspaceActionsEnabled,
      "featureFlags.workspaceActionsEnabled",
      issues
    );
    if (
      coreEnabled !== null &&
      geminiEnabled !== null &&
      toolsEnabled !== null &&
      workspaceActionsEnabled !== null
    ) {
      featureFlags = {
        coreEnabled,
        geminiEnabled,
        toolsEnabled,
        workspaceActionsEnabled,
      };
      validateFeatureFlagInvariants(featureFlags, issues);
    }
  }

  const toolsEnabled = featureFlags?.toolsEnabled === true;
  const toolAllowlist = validateToolAllowlist(raw.toolAllowlist, toolsEnabled, issues);

  const receivedAtMs = requireFiniteNumber(raw.receivedAtMs, "receivedAtMs", issues, {
    min: 0,
    integer: true,
  });

  let policyVersion: string | null = null;
  if (typeof raw.policyVersion !== "string") {
    issues.push(issue("policyVersion", "invalid_type", "Policy version must be a string"));
  } else if (raw.policyVersion.trim() !== CONVERSATION_CORE_POLICY_VERSION) {
    issues.push(
      issue("policyVersion", "unsupported_policy_version", "Policy version is not supported")
    );
  } else {
    policyVersion = raw.policyVersion.trim();
  }

  let correlationId: string | undefined;
  if (raw.correlationId !== undefined) {
    const parsed = requireString(raw.correlationId, "correlationId", issues, {
      maxLength: CONVERSATION_CORE_MAX_ID_LENGTH,
    });
    if (parsed) {
      correlationId = parsed;
    }
  }

  if (
    actorScope?.actorRef &&
    conversationOwnership?.ownerActorRef &&
    conversationOwnership.ownerActorRef !== actorScope.actorRef
  ) {
    issues.push(
      issue(
        "conversationOwnership.ownerActorRef",
        "ownership_mismatch",
        "Owner actor reference must match actor scope"
      )
    );
  }

  if (
    issues.length > 0 ||
    !conversationId ||
    !actorScope ||
    !conversationOwnership ||
    !featureFlags ||
    toolAllowlist === null ||
    receivedAtMs === null ||
    !policyVersion
  ) {
    return fail(issues);
  }

  return {
    ok: true,
    value: {
      conversationId,
      actorScope,
      conversationOwnership,
      featureFlags,
      toolAllowlist,
      receivedAtMs,
      policyVersion,
      ...(correlationId ? { correlationId } : {}),
    },
  };
}
