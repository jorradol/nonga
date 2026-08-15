/**
 * WP-V2U-03E2B2 — Phase 1 Gemini function declarations (guidance only; server validates).
 */
import type { FunctionDeclaration } from "@google/genai";
import {
  FINANCE_MAX_INTEREST_RATE_PERCENT,
  FORBIDDEN_TOOL_NAMES,
  FORBIDDEN_TOOL_NAME_PREFIXES,
  PHASE1_READ_ONLY_TOOLS,
  fail,
  isForbiddenToolName,
  isPhase1ReadOnlyToolName,
  issue,
  type ConversationCoreToolName,
  type ValidationResult,
} from "../../services/conversation-core/index";

/** Visible Gemini input keys — must stay aligned with toolEnvelope validators. */
export const CONVERSATION_CORE_GEMINI_VISIBLE_INPUT_KEYS_BY_TOOL = {
  "inventory.fetch": ["refresh"],
  "marketplace.search": ["query"],
  "vehicle.resolveSelection": ["listingId"],
  "finance.calculate": [
    "listingId",
    "annualInterestRatePercent",
    "termMonths",
    "downPayment",
    "downPaymentPercent",
  ],
} as const satisfies Record<ConversationCoreToolName, readonly string[]>;

const DECLARATION_BY_TOOL: Record<ConversationCoreToolName, FunctionDeclaration> = {
  "marketplace.search": {
    name: "marketplace.search",
    description:
      "Search marketplace listings using a buyer query. Returns listing identifiers only after server execution.",
    parametersJsonSchema: {
      type: "object",
      additionalProperties: false,
      required: ["query"],
      properties: {
        query: {
          type: "string",
          description: "Buyer search query in plain text.",
        },
      },
    },
  },
  "inventory.fetch": {
    name: "inventory.fetch",
    description:
      "Fetch published dealer inventory listing identifiers. Optional refresh requests a fresh inventory read.",
    parametersJsonSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        refresh: {
          type: "boolean",
          description: "When true, request a refreshed inventory read.",
        },
      },
    },
  },
  "vehicle.resolveSelection": {
    name: "vehicle.resolveSelection",
    description: "Resolve a buyer-selected vehicle listing identifier for follow-up questions.",
    parametersJsonSchema: {
      type: "object",
      additionalProperties: false,
      required: ["listingId"],
      properties: {
        listingId: {
          type: "string",
          description: "Marketplace listing identifier selected by the buyer.",
        },
      },
    },
  },
  "finance.calculate": {
    name: "finance.calculate",
    description:
      "Calculate a financing estimate for a listing. Provide exactly one down-payment form: downPayment (baht) or downPaymentPercent — not both.",
    parametersJsonSchema: {
      type: "object",
      additionalProperties: false,
      required: ["listingId", "annualInterestRatePercent", "termMonths"],
      properties: {
        listingId: {
          type: "string",
          description: "Listing identifier bound to inventory price.",
        },
        annualInterestRatePercent: {
          type: "number",
          minimum: 0,
          maximum: FINANCE_MAX_INTEREST_RATE_PERCENT,
          description: "Annual interest rate percent.",
        },
        termMonths: {
          type: "integer",
          minimum: 1,
          maximum: 120,
          description: "Loan term in months.",
        },
        downPayment: {
          type: "number",
          minimum: 0,
          description: "Down payment amount in baht (mutually exclusive with downPaymentPercent).",
        },
        downPaymentPercent: {
          type: "number",
          minimum: 0,
          maximum: 100,
          description: "Down payment percent (mutually exclusive with downPayment).",
        },
      },
    },
  },
};

export const CONVERSATION_CORE_GEMINI_FUNCTION_DECLARATIONS: readonly FunctionDeclaration[] =
  Object.freeze(
    PHASE1_READ_ONLY_TOOLS.map((toolName) =>
      Object.freeze({ ...DECLARATION_BY_TOOL[toolName] })
    )
  );

function isDuplicateToolName(
  allowedToolNames: readonly string[],
  issues: { path: string; code: string; message: string }[]
): boolean {
  const seen = new Set<string>();
  for (let index = 0; index < allowedToolNames.length; index += 1) {
    const raw = allowedToolNames[index];
    if (typeof raw !== "string") {
      issues.push(
        issue(`allowedToolNames[${index}]`, "invalid_type", "Tool name must be a string")
      );
      return true;
    }
    const toolName = raw.trim();
    if (!toolName) {
      issues.push(
        issue(`allowedToolNames[${index}]`, "empty_string", "Tool name is required")
      );
      return true;
    }
    if (seen.has(toolName)) {
      issues.push(
        issue(`allowedToolNames[${index}]`, "duplicate_tool_name", "Tool names must be unique")
      );
      return true;
    }
    seen.add(toolName);
  }
  return false;
}

/**
 * Build Gemini function declarations for an exact turn allowlist.
 * Returns only Phase 1 read-only tools in canonical order.
 */
export function buildConversationCoreGeminiFunctionDeclarations(
  allowedToolNames: readonly string[]
): ValidationResult<FunctionDeclaration[]> {
  const issues: ReturnType<typeof issue>[] = [];

  if (!Array.isArray(allowedToolNames) || allowedToolNames.length === 0) {
    return fail([
      issue("allowedToolNames", "empty_allowlist", "At least one allowed tool name is required"),
    ]);
  }

  if (isDuplicateToolName(allowedToolNames, issues)) {
    return fail(issues);
  }

  const normalized: ConversationCoreToolName[] = [];
  for (let index = 0; index < allowedToolNames.length; index += 1) {
    const toolName = allowedToolNames[index]!.trim();
    if (isForbiddenToolName(toolName)) {
      issues.push(
        issue(`allowedToolNames[${index}]`, "forbidden_tool", "Tool is not allowed in Phase 1")
      );
      continue;
    }
    if (!isPhase1ReadOnlyToolName(toolName)) {
      issues.push(
        issue(`allowedToolNames[${index}]`, "unknown_tool", "Tool name is not in the read-only allowlist")
      );
      continue;
    }
    normalized.push(toolName);
  }

  if (issues.length > 0) {
    return fail(issues);
  }

  const allowedSet = new Set(normalized);
  const declarations = PHASE1_READ_ONLY_TOOLS.filter((toolName) => allowedSet.has(toolName)).map(
    (toolName) => Object.freeze({ ...DECLARATION_BY_TOOL[toolName] })
  );

  return { ok: true, value: [...declarations] };
}

/** Drift guard constants for tests — mirrors forbidden tool policy without importing private sets. */
export const CONVERSATION_CORE_GEMINI_FORBIDDEN_DECLARATION_PREFIXES =
  FORBIDDEN_TOOL_NAME_PREFIXES;
export const CONVERSATION_CORE_GEMINI_FORBIDDEN_DECLARATION_NAMES = FORBIDDEN_TOOL_NAMES;
