/**
 * WP-V2U-02 / R1 — Structured workspace actions with exact ToolResult grounding.
 */

import {
  CONVERSATION_CORE_MAX_LISTING_ID_COUNT,
  CONVERSATION_CORE_MAX_LISTING_ID_LENGTH,
  fail,
  isPlainObject,
  issue,
  rejectUnknownKeys,
  requireString,
  validateNonEmptyId,
  type ConversationCoreToolName,
  type ValidationIssue,
  type ValidationResult,
} from "./conversationTurnInput";
import {
  listingIdsFromToolResult,
  type ToolResult,
  type ToolResultProvenance,
} from "./toolEnvelope";

export const WORKSPACE_ACTION_TYPES = [
  "show-vehicle-results",
  "highlight-selected-vehicle",
] as const;

export type WorkspaceActionType = (typeof WORKSPACE_ACTION_TYPES)[number];

export const WORKSPACE_MODULE_TYPES = [
  "vehicle-results",
  "selected-vehicle-highlight",
] as const;

export type WorkspaceModuleType = (typeof WORKSPACE_MODULE_TYPES)[number];

export const WORKSPACE_RENDER_BEHAVIORS = ["replace", "append", "update"] as const;

export type WorkspaceRenderBehavior = (typeof WORKSPACE_RENDER_BEHAVIORS)[number];

export const WORKSPACE_ACTION_PAYLOAD_VERSION = "1";

export interface WorkspaceActionProvenance {
  toolRequestId: string;
  toolResultProvenance: ToolResultProvenance;
}

export interface ShowVehicleResultsPayload {
  listingIds: string[];
}

export interface HighlightSelectedVehiclePayload {
  listingId: string;
}

export type WorkspaceAction =
  | {
      actionType: "show-vehicle-results";
      conversationId: string;
      moduleType: "vehicle-results";
      payloadVersion: typeof WORKSPACE_ACTION_PAYLOAD_VERSION;
      payload: ShowVehicleResultsPayload;
      provenance: WorkspaceActionProvenance;
      renderBehavior: WorkspaceRenderBehavior;
    }
  | {
      actionType: "highlight-selected-vehicle";
      conversationId: string;
      moduleType: "selected-vehicle-highlight";
      payloadVersion: typeof WORKSPACE_ACTION_PAYLOAD_VERSION;
      payload: HighlightSelectedVehiclePayload;
      provenance: WorkspaceActionProvenance;
      renderBehavior: WorkspaceRenderBehavior;
    };

export interface WorkspaceActionValidationContext {
  expectedConversationId: string;
  trustedToolResults: ReadonlyMap<string, ToolResult>;
}

const ACTION_TO_MODULE: Record<WorkspaceActionType, WorkspaceModuleType> = {
  "show-vehicle-results": "vehicle-results",
  "highlight-selected-vehicle": "selected-vehicle-highlight",
};

const ACTION_ALLOWED_TOOLS: Record<WorkspaceActionType, readonly ConversationCoreToolName[]> = {
  "show-vehicle-results": ["inventory.fetch", "marketplace.search"],
  "highlight-selected-vehicle": ["vehicle.resolveSelection", "inventory.fetch"],
};

const WORKSPACE_ACTION_ALLOWED_KEYS = new Set([
  "actionType",
  "conversationId",
  "moduleType",
  "payloadVersion",
  "payload",
  "provenance",
  "renderBehavior",
]);

const WORKSPACE_PROVENANCE_ALLOWED_KEYS = new Set(["toolRequestId", "toolResultProvenance"]);

const SHOW_RESULTS_PAYLOAD_KEYS = new Set(["listingIds"]);
const HIGHLIGHT_PAYLOAD_KEYS = new Set(["listingId"]);

const FORBIDDEN_WORKSPACE_KEYS = [
  "rendererId",
  "componentName",
  "html",
  "jsx",
  "script",
  "css",
  "url",
] as const;

function validateListingIdArray(
  raw: unknown,
  path: string,
  issues: ValidationIssue[]
): string[] | null {
  if (!Array.isArray(raw)) {
    issues.push(issue(path, "invalid_payload", "Listing ids must be an array"));
    return null;
  }
  if (raw.length === 0) {
    issues.push(issue(path, "invalid_payload", "Listing ids cannot be empty"));
    return null;
  }
  if (raw.length > CONVERSATION_CORE_MAX_LISTING_ID_COUNT) {
    issues.push(issue(path, "listing_ids_too_many", "Listing id count exceeds maximum"));
    return null;
  }

  const listingIds: string[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < raw.length; index += 1) {
    const listingId = validateNonEmptyId(raw[index], `${path}[${index}]`, issues);
    if (!listingId) {
      return null;
    }
    if (listingId.length > CONVERSATION_CORE_MAX_LISTING_ID_LENGTH) {
      issues.push(
        issue(`${path}[${index}]`, "invalid_listing_id", "Listing id exceeds maximum length")
      );
      return null;
    }
    if (seen.has(listingId)) {
      issues.push(
        issue(`${path}[${index}]`, "duplicate_listing_id", "Listing ids must be unique")
      );
      return null;
    }
    seen.add(listingId);
    listingIds.push(listingId);
  }
  return listingIds;
}

function validateWorkspacePayload(
  actionType: WorkspaceActionType,
  raw: unknown,
  issues: ValidationIssue[]
): ShowVehicleResultsPayload | HighlightSelectedVehiclePayload | null {
  if (!isPlainObject(raw)) {
    issues.push(issue("payload", "invalid_payload", "Workspace payload must be an object"));
    return null;
  }

  if (actionType === "show-vehicle-results") {
    rejectUnknownKeys(raw, SHOW_RESULTS_PAYLOAD_KEYS, "payload", issues);
    const listingIds = validateListingIdArray(raw.listingIds, "payload.listingIds", issues);
    return listingIds ? { listingIds } : null;
  }

  rejectUnknownKeys(raw, HIGHLIGHT_PAYLOAD_KEYS, "payload", issues);
  const listingId = validateNonEmptyId(raw.listingId, "payload.listingId", issues);
  return listingId ? { listingId } : null;
}

function validateActionProvenance(
  raw: unknown,
  actionType: WorkspaceActionType,
  context: WorkspaceActionValidationContext,
  issues: ValidationIssue[]
): WorkspaceActionProvenance | null {
  if (!isPlainObject(raw)) {
    issues.push(issue("provenance", "missing_provenance", "Workspace action provenance is required"));
    return null;
  }

  rejectUnknownKeys(raw, WORKSPACE_PROVENANCE_ALLOWED_KEYS, "provenance", issues);

  const toolRequestId = validateNonEmptyId(raw.toolRequestId, "provenance.toolRequestId", issues);
  if (typeof raw.toolResultProvenance !== "string") {
    issues.push(
      issue("provenance.toolResultProvenance", "invalid_type", "Tool result provenance must be a string")
    );
    return null;
  }
  const toolResultProvenance = raw.toolResultProvenance.trim() as ToolResultProvenance;

  if (!toolRequestId) {
    return null;
  }

  const toolResult = context.trustedToolResults.get(toolRequestId);
  if (!toolResult) {
    issues.push(
      issue("provenance.toolRequestId", "unknown_tool_result", "Referenced tool result does not exist")
    );
    return null;
  }

  if (toolResult.status !== "ok") {
    issues.push(
      issue("provenance.toolRequestId", "tool_result_not_ok", "Workspace action requires successful tool result")
    );
    return null;
  }

  if (toolResult.conversationId !== context.expectedConversationId.trim()) {
    issues.push(
      issue("provenance.toolRequestId", "conversation_mismatch", "Referenced tool result conversation mismatch")
    );
    return null;
  }

  if (toolResult.provenance !== toolResultProvenance) {
    issues.push(
      issue(
        "provenance.toolResultProvenance",
        "provenance_mismatch",
        "Workspace provenance does not match referenced tool result"
      )
    );
    return null;
  }

  if (!ACTION_ALLOWED_TOOLS[actionType].includes(toolResult.toolName)) {
    issues.push(
      issue("provenance.toolRequestId", "tool_not_allowed_for_action", "Tool result cannot authorize this action")
    );
    return null;
  }

  return { toolRequestId, toolResultProvenance };
}

function validatePayloadGroundedToToolResult(
  actionType: WorkspaceActionType,
  payload: ShowVehicleResultsPayload | HighlightSelectedVehiclePayload,
  toolResult: ToolResult,
  issues: ValidationIssue[]
): void {
  const allowedListingIds = listingIdsFromToolResult(toolResult);

  if (actionType === "show-vehicle-results") {
    const listingIds = (payload as ShowVehicleResultsPayload).listingIds;
    for (let index = 0; index < listingIds.length; index += 1) {
      if (!allowedListingIds.has(listingIds[index])) {
        issues.push(
          issue(
            `payload.listingIds[${index}]`,
            "ungrounded_listing_id",
            "Listing id must come from the referenced tool result"
          )
        );
      }
    }
    return;
  }

  const listingId = (payload as HighlightSelectedVehiclePayload).listingId;
  if (!allowedListingIds.has(listingId)) {
    issues.push(
      issue(
        "payload.listingId",
        "ungrounded_listing_id",
        "Listing id must come from the referenced tool result"
      )
    );
  }
}

export function validateWorkspaceAction(
  raw: unknown,
  context: WorkspaceActionValidationContext
): ValidationResult<WorkspaceAction> {
  const issues: ValidationIssue[] = [];

  if (!isPlainObject(raw)) {
    return fail([issue("$", "invalid_workspace_action", "Workspace action must be an object")]);
  }

  for (const key of FORBIDDEN_WORKSPACE_KEYS) {
    if (key in raw) {
      issues.push(
        issue(key, "forbidden_workspace_field", "Workspace action cannot specify renderer or markup")
      );
    }
  }

  rejectUnknownKeys(raw, WORKSPACE_ACTION_ALLOWED_KEYS, "$", issues);

  if (typeof raw.actionType !== "string") {
    issues.push(issue("actionType", "invalid_type", "Action type must be a string"));
    return fail(issues);
  }
  const actionType = raw.actionType.trim();
  if (!(WORKSPACE_ACTION_TYPES as readonly string[]).includes(actionType)) {
    issues.push(issue("actionType", "unknown_action", "Workspace action type is not allowed"));
    return fail(issues);
  }
  const typedActionType = actionType as WorkspaceActionType;

  const conversationId = validateNonEmptyId(raw.conversationId, "conversationId", issues);
  if (conversationId && conversationId !== context.expectedConversationId.trim()) {
    issues.push(
      issue("conversationId", "conversation_mismatch", "Workspace action must match active conversation")
    );
  }

  if (typeof raw.moduleType !== "string") {
    issues.push(issue("moduleType", "invalid_type", "Module type must be a string"));
  } else {
    const moduleType = raw.moduleType.trim();
    if (!(WORKSPACE_MODULE_TYPES as readonly string[]).includes(moduleType)) {
      issues.push(issue("moduleType", "unknown_module", "Workspace module type is not allowed"));
    } else if (ACTION_TO_MODULE[typedActionType] !== moduleType) {
      issues.push(
        issue("moduleType", "module_action_mismatch", "Module type does not match action type")
      );
    }
  }

  if (typeof raw.payloadVersion !== "string") {
    issues.push(issue("payloadVersion", "invalid_type", "Payload version must be a string"));
  } else if (raw.payloadVersion.trim() !== WORKSPACE_ACTION_PAYLOAD_VERSION) {
    issues.push(issue("payloadVersion", "invalid_payload_version", "Payload version is not supported"));
  }

  if (typeof raw.renderBehavior !== "string") {
    issues.push(issue("renderBehavior", "invalid_type", "Render behavior must be a string"));
  } else {
    const renderBehavior = raw.renderBehavior.trim();
    if (!(WORKSPACE_RENDER_BEHAVIORS as readonly string[]).includes(renderBehavior)) {
      issues.push(issue("renderBehavior", "invalid_render_behavior", "Render behavior is not allowed"));
    }
  }

  const provenance = validateActionProvenance(
    raw.provenance,
    typedActionType,
    context,
    issues
  );

  const payload = validateWorkspacePayload(typedActionType, raw.payload, issues);

  if (provenance && payload) {
    const toolResult = context.trustedToolResults.get(provenance.toolRequestId);
    if (toolResult) {
      validatePayloadGroundedToToolResult(typedActionType, payload, toolResult, issues);
    }
  }

  if (
    issues.length > 0 ||
    !conversationId ||
    !provenance ||
    !payload ||
    typeof raw.renderBehavior !== "string" ||
    typeof raw.moduleType !== "string"
  ) {
    return fail(issues);
  }

  const renderBehavior = raw.renderBehavior.trim() as WorkspaceRenderBehavior;

  if (typedActionType === "show-vehicle-results") {
    return {
      ok: true,
      value: {
        actionType: "show-vehicle-results",
        conversationId,
        moduleType: "vehicle-results",
        payloadVersion: WORKSPACE_ACTION_PAYLOAD_VERSION,
        payload: payload as ShowVehicleResultsPayload,
        provenance,
        renderBehavior,
      },
    };
  }

  return {
    ok: true,
    value: {
      actionType: "highlight-selected-vehicle",
      conversationId,
      moduleType: "selected-vehicle-highlight",
      payloadVersion: WORKSPACE_ACTION_PAYLOAD_VERSION,
      payload: payload as HighlightSelectedVehiclePayload,
      provenance,
      renderBehavior,
    },
  };
}
