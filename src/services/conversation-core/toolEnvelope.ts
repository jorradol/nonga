/**
 * WP-V2U-02 / R1 — Read-only tool request/result envelopes (Phase 1).
 */

import {
  CONVERSATION_CORE_MAX_FINANCE_AMOUNT,
  CONVERSATION_CORE_MAX_ERROR_CODE_LENGTH,
  CONVERSATION_CORE_MAX_LISTING_ID_COUNT,
  CONVERSATION_CORE_MAX_LISTING_ID_LENGTH,
  CONVERSATION_CORE_MAX_MESSAGE_LENGTH,
  FORBIDDEN_TOOL_NAMES,
  FORBIDDEN_TOOL_NAME_PREFIXES,
  PHASE1_READ_ONLY_TOOLS,
  TOOL_REQUIRED_PROVENANCE_BY_TOOL,
  TOOL_RESULT_PROVENANCES,
  containsHtmlOrScript,
  fail,
  isForbiddenToolName,
  isPhase1ReadOnlyToolName,
  isPlainObject,
  issue,
  rejectUnknownKeys,
  requireFiniteNumber,
  requireString,
  validateNonEmptyId,
  type ConversationCoreToolName,
  type ToolResultProvenance,
  type ValidationIssue,
  type ValidationResult,
} from "./conversationTurnInput";

export {
  FORBIDDEN_TOOL_NAMES,
  FORBIDDEN_TOOL_NAME_PREFIXES,
  PHASE1_READ_ONLY_TOOLS,
  TOOL_REQUIRED_PROVENANCE_BY_TOOL,
  TOOL_RESULT_PROVENANCES,
  isForbiddenToolName,
  isPhase1ReadOnlyToolName,
  type ConversationCoreToolName,
  type ToolResultProvenance,
};

export const TOOL_RESULT_STATUSES = ["ok", "error", "fallback"] as const;
export type ToolResultStatus = (typeof TOOL_RESULT_STATUSES)[number];

export interface InventoryFetchToolInput {
  refresh?: boolean;
}

export interface MarketplaceSearchToolInput {
  query: string;
}

export interface VehicleResolveSelectionToolInput {
  listingId: string;
}

export const FINANCE_PRICE_SOURCES = ["inventory"] as const;
export type FinancePriceSource = (typeof FINANCE_PRICE_SOURCES)[number];

export const FINANCE_CALCULATION_MODES = ["listing-bound"] as const;
export type FinanceCalculationMode = (typeof FINANCE_CALCULATION_MODES)[number];

export const FINANCE_INTEREST_METHODS = ["flat"] as const;
export type FinanceInterestMethod = (typeof FINANCE_INTEREST_METHODS)[number];

export const FINANCE_CURRENCIES = ["THB"] as const;
export type FinanceCurrency = (typeof FINANCE_CURRENCIES)[number];

export const FINANCE_QUOTATION_STATUSES = ["not-quotation"] as const;
export type FinanceQuotationStatus = (typeof FINANCE_QUOTATION_STATUSES)[number];

export const FINANCE_VAT_STATUSES = ["not-calculated"] as const;
export type FinanceVatStatus = (typeof FINANCE_VAT_STATUSES)[number];

export const FINANCE_ADDITIONAL_CHARGES_STATUSES = ["not-calculated"] as const;
export type FinanceAdditionalChargesStatus =
  (typeof FINANCE_ADDITIONAL_CHARGES_STATUSES)[number];

export const FINANCE_MAX_INTEREST_RATE_PERCENT = 30;

export interface FinanceCalculateToolInput {
  listingId: string;
  annualInterestRatePercent: number;
  termMonths: number;
  downPayment?: number;
  downPaymentPercent?: number;
}

export type InventoryFetchToolRequest = {
  toolName: "inventory.fetch";
  requestId: string;
  conversationId: string;
  input: InventoryFetchToolInput;
};

export type MarketplaceSearchToolRequest = {
  toolName: "marketplace.search";
  requestId: string;
  conversationId: string;
  input: MarketplaceSearchToolInput;
};

export type VehicleResolveSelectionToolRequest = {
  toolName: "vehicle.resolveSelection";
  requestId: string;
  conversationId: string;
  input: VehicleResolveSelectionToolInput;
};

export type FinanceCalculateToolRequest = {
  toolName: "finance.calculate";
  requestId: string;
  conversationId: string;
  input: FinanceCalculateToolInput;
};

export type ToolRequest =
  | InventoryFetchToolRequest
  | MarketplaceSearchToolRequest
  | VehicleResolveSelectionToolRequest
  | FinanceCalculateToolRequest;

export interface InventoryFetchToolData {
  listingIds: string[];
}

export interface MarketplaceSearchToolData {
  listingIds: string[];
  query: string;
}

export interface VehicleResolveSelectionToolData {
  listingId: string;
  resolved: boolean;
}

export interface FinanceCalculateToolData {
  listingId: string;
  vehiclePrice: number;
  priceSource: FinancePriceSource;
  calculationMode: FinanceCalculationMode;
  downPaymentBaht: number;
  downPaymentPercent: number;
  loanAmount: number;
  annualInterestRatePercent: number;
  interestMethod: FinanceInterestMethod;
  termMonths: number;
  totalInterest: number;
  monthlyPayment: number;
  totalPayable: number;
  currency: FinanceCurrency;
  isEstimate: true;
  quotationStatus: FinanceQuotationStatus;
  vatStatus: FinanceVatStatus;
  additionalChargesStatus: FinanceAdditionalChargesStatus;
}

export type InventoryFetchToolResult = {
  requestId: string;
  conversationId: string;
  toolName: "inventory.fetch";
  status: ToolResultStatus;
  provenance: "inventory-api";
  data?: InventoryFetchToolData;
  errorCode?: string;
  fallbackUsed?: boolean;
};

export type MarketplaceSearchToolResult = {
  requestId: string;
  conversationId: string;
  toolName: "marketplace.search";
  status: ToolResultStatus;
  provenance: "marketplace-search";
  data?: MarketplaceSearchToolData;
  errorCode?: string;
  fallbackUsed?: boolean;
};

export type VehicleResolveSelectionToolResult = {
  requestId: string;
  conversationId: string;
  toolName: "vehicle.resolveSelection";
  status: ToolResultStatus;
  provenance: "vehicle-selection";
  data?: VehicleResolveSelectionToolData;
  errorCode?: string;
  fallbackUsed?: boolean;
};

export type FinanceCalculateToolResult = {
  requestId: string;
  conversationId: string;
  toolName: "finance.calculate";
  status: ToolResultStatus;
  provenance: "finance-calculator";
  data?: FinanceCalculateToolData;
  errorCode?: string;
  fallbackUsed?: boolean;
};

export type ToolResult =
  | InventoryFetchToolResult
  | MarketplaceSearchToolResult
  | VehicleResolveSelectionToolResult
  | FinanceCalculateToolResult;

const TOOL_REQUEST_ALLOWED_KEYS = new Set([
  "toolName",
  "requestId",
  "conversationId",
  "input",
]);

const TOOL_RESULT_ALLOWED_KEYS = new Set([
  "requestId",
  "conversationId",
  "toolName",
  "status",
  "provenance",
  "data",
  "errorCode",
  "fallbackUsed",
]);

const INVENTORY_FETCH_INPUT_KEYS = new Set(["refresh"]);
const MARKETPLACE_SEARCH_INPUT_KEYS = new Set(["query"]);
const VEHICLE_RESOLVE_INPUT_KEYS = new Set(["listingId"]);
const FINANCE_CALCULATE_INPUT_KEYS = new Set([
  "listingId",
  "annualInterestRatePercent",
  "termMonths",
  "downPayment",
  "downPaymentPercent",
]);

const INVENTORY_FETCH_DATA_KEYS = new Set(["listingIds"]);
const MARKETPLACE_SEARCH_DATA_KEYS = new Set(["listingIds", "query"]);
const VEHICLE_RESOLVE_DATA_KEYS = new Set(["listingId", "resolved"]);
const FINANCE_CALCULATE_DATA_KEYS = new Set([
  "listingId",
  "vehiclePrice",
  "priceSource",
  "calculationMode",
  "downPaymentBaht",
  "downPaymentPercent",
  "loanAmount",
  "annualInterestRatePercent",
  "interestMethod",
  "termMonths",
  "totalInterest",
  "monthlyPayment",
  "totalPayable",
  "currency",
  "isEstimate",
  "quotationStatus",
  "vatStatus",
  "additionalChargesStatus",
]);

function validateBoundedErrorCode(
  raw: unknown,
  path: string,
  issues: ValidationIssue[]
): string | null {
  return requireString(raw, path, issues, {
    maxLength: CONVERSATION_CORE_MAX_ERROR_CODE_LENGTH,
  });
}

function validateListingIdList(
  raw: unknown,
  path: string,
  issues: ValidationIssue[]
): string[] | null {
  if (!Array.isArray(raw)) {
    issues.push(issue(path, "invalid_listing_ids", "Listing ids must be an array"));
    return null;
  }
  if (raw.length === 0) {
    issues.push(issue(path, "empty_listing_ids", "Listing ids cannot be empty"));
    return null;
  }
  if (raw.length > CONVERSATION_CORE_MAX_LISTING_ID_COUNT) {
    issues.push(issue(path, "listing_ids_too_many", "Listing id count exceeds maximum"));
    return null;
  }

  const ids: string[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < raw.length; index += 1) {
    const id = validateNonEmptyId(raw[index], `${path}[${index}]`, issues);
    if (!id) {
      return null;
    }
    if (id.length > CONVERSATION_CORE_MAX_LISTING_ID_LENGTH) {
      issues.push(
        issue(`${path}[${index}]`, "invalid_listing_id", "Listing id exceeds maximum length")
      );
      return null;
    }
    if (seen.has(id)) {
      issues.push(
        issue(`${path}[${index}]`, "duplicate_listing_id", "Listing ids must be unique")
      );
      return null;
    }
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

function validateInventoryFetchInput(
  raw: unknown,
  issues: ValidationIssue[]
): InventoryFetchToolInput | null {
  if (!isPlainObject(raw)) {
    issues.push(issue("input", "invalid_tool_input", "Tool input must be an object"));
    return null;
  }
  rejectUnknownKeys(raw, INVENTORY_FETCH_INPUT_KEYS, "input", issues);
  if (raw.refresh !== undefined && typeof raw.refresh !== "boolean") {
    issues.push(issue("input.refresh", "invalid_type", "Refresh flag must be a boolean"));
    return null;
  }
  const input: InventoryFetchToolInput = {};
  if (typeof raw.refresh === "boolean") {
    input.refresh = raw.refresh;
  }
  return input;
}

function validateMarketplaceSearchInput(
  raw: unknown,
  issues: ValidationIssue[]
): MarketplaceSearchToolInput | null {
  if (!isPlainObject(raw)) {
    issues.push(issue("input", "invalid_tool_input", "Tool input must be an object"));
    return null;
  }
  rejectUnknownKeys(raw, MARKETPLACE_SEARCH_INPUT_KEYS, "input", issues);
  const query = requireString(raw.query, "input.query", issues, {
    maxLength: CONVERSATION_CORE_MAX_MESSAGE_LENGTH,
  });
  if (!query) {
    return null;
  }
  return { query };
}

function validateVehicleResolveInput(
  raw: unknown,
  issues: ValidationIssue[]
): VehicleResolveSelectionToolInput | null {
  if (!isPlainObject(raw)) {
    issues.push(issue("input", "invalid_tool_input", "Tool input must be an object"));
    return null;
  }
  rejectUnknownKeys(raw, VEHICLE_RESOLVE_INPUT_KEYS, "input", issues);
  const listingId = validateNonEmptyId(raw.listingId, "input.listingId", issues);
  return listingId ? { listingId } : null;
}

function requireLiteralEnum<T extends string>(
  raw: unknown,
  allowed: readonly T[],
  path: string,
  issues: ValidationIssue[]
): T | null {
  if (typeof raw !== "string") {
    issues.push(issue(path, "invalid_type", "Value must be a string"));
    return null;
  }
  const value = raw.trim();
  if (!(allowed as readonly string[]).includes(value)) {
    issues.push(issue(path, "invalid_enum", "Value is not an allowed enum literal"));
    return null;
  }
  return value as T;
}

function validateFinanceCalculateInput(
  raw: unknown,
  issues: ValidationIssue[]
): FinanceCalculateToolInput | null {
  if (!isPlainObject(raw)) {
    issues.push(issue("input", "invalid_tool_input", "Tool input must be an object"));
    return null;
  }
  rejectUnknownKeys(raw, FINANCE_CALCULATE_INPUT_KEYS, "input", issues);
  const listingId = validateNonEmptyId(raw.listingId, "input.listingId", issues);
  if (!listingId) {
    return null;
  }

  const annualInterestRatePercent = requireFiniteNumber(
    raw.annualInterestRatePercent,
    "input.annualInterestRatePercent",
    issues,
    { min: 0, max: FINANCE_MAX_INTEREST_RATE_PERCENT }
  );
  if (annualInterestRatePercent === null) {
    return null;
  }

  const termMonths = requireFiniteNumber(raw.termMonths, "input.termMonths", issues, {
    min: 1,
    max: 120,
    integer: true,
  });
  if (termMonths === null) {
    return null;
  }

  const hasDownPayment = raw.downPayment !== undefined;
  const hasDownPaymentPercent = raw.downPaymentPercent !== undefined;
  if (hasDownPayment && hasDownPaymentPercent) {
    issues.push(
      issue(
        "input",
        "conflicting_down_payment",
        "Down payment must be specified as either amount or percent, not both"
      )
    );
    return null;
  }
  if (!hasDownPayment && !hasDownPaymentPercent) {
    issues.push(
      issue(
        "input",
        "missing_down_payment",
        "Down payment amount or percent is required"
      )
    );
    return null;
  }

  const input: FinanceCalculateToolInput = {
    listingId,
    annualInterestRatePercent,
    termMonths,
  };

  if (hasDownPayment) {
    const downPayment = requireFiniteNumber(raw.downPayment, "input.downPayment", issues, {
      min: 0,
      max: CONVERSATION_CORE_MAX_FINANCE_AMOUNT,
    });
    if (downPayment === null) {
      return null;
    }
    input.downPayment = downPayment;
  }

  if (hasDownPaymentPercent) {
    const downPaymentPercent = requireFiniteNumber(
      raw.downPaymentPercent,
      "input.downPaymentPercent",
      issues,
      { min: 0, max: 100 }
    );
    if (downPaymentPercent === null) {
      return null;
    }
    input.downPaymentPercent = downPaymentPercent;
  }

  return input;
}

function validateToolInput(
  toolName: ConversationCoreToolName,
  raw: unknown,
  issues: ValidationIssue[]
): ToolRequest["input"] | null {
  if (toolName === "inventory.fetch") {
    return validateInventoryFetchInput(raw, issues);
  }
  if (toolName === "marketplace.search") {
    return validateMarketplaceSearchInput(raw, issues);
  }
  if (toolName === "vehicle.resolveSelection") {
    return validateVehicleResolveInput(raw, issues);
  }
  return validateFinanceCalculateInput(raw, issues);
}

function validateInventoryFetchData(
  raw: unknown,
  issues: ValidationIssue[]
): InventoryFetchToolData | undefined {
  if (!isPlainObject(raw)) {
    issues.push(issue("data", "invalid_tool_data", "Tool result data must be an object"));
    return undefined;
  }
  rejectUnknownKeys(raw, INVENTORY_FETCH_DATA_KEYS, "data", issues);
  const listingIds = validateListingIdList(raw.listingIds, "data.listingIds", issues);
  return listingIds ? { listingIds } : undefined;
}

function validateMarketplaceSearchData(
  raw: unknown,
  issues: ValidationIssue[]
): MarketplaceSearchToolData | undefined {
  if (!isPlainObject(raw)) {
    issues.push(issue("data", "invalid_tool_data", "Tool result data must be an object"));
    return undefined;
  }
  rejectUnknownKeys(raw, MARKETPLACE_SEARCH_DATA_KEYS, "data", issues);
  const listingIds = validateListingIdList(raw.listingIds, "data.listingIds", issues);
  const query = requireString(raw.query, "data.query", issues, {
    maxLength: CONVERSATION_CORE_MAX_MESSAGE_LENGTH,
  });
  if (!listingIds || !query) {
    return undefined;
  }
  return { listingIds, query };
}

function validateVehicleResolveData(
  raw: unknown,
  issues: ValidationIssue[]
): VehicleResolveSelectionToolData | undefined {
  if (!isPlainObject(raw)) {
    issues.push(issue("data", "invalid_tool_data", "Tool result data must be an object"));
    return undefined;
  }
  rejectUnknownKeys(raw, VEHICLE_RESOLVE_DATA_KEYS, "data", issues);
  const listingId = validateNonEmptyId(raw.listingId, "data.listingId", issues);
  const resolved = raw.resolved;
  if (typeof resolved !== "boolean") {
    issues.push(issue("data.resolved", "invalid_type", "Resolved flag must be a boolean"));
    return undefined;
  }
  return listingId ? { listingId, resolved } : undefined;
}

function validateFinanceCalculateData(
  raw: unknown,
  issues: ValidationIssue[]
): FinanceCalculateToolData | undefined {
  if (!isPlainObject(raw)) {
    issues.push(issue("data", "invalid_tool_data", "Tool result data must be an object"));
    return undefined;
  }
  rejectUnknownKeys(raw, FINANCE_CALCULATE_DATA_KEYS, "data", issues);
  const listingId = validateNonEmptyId(raw.listingId, "data.listingId", issues);
  if (!listingId) {
    return undefined;
  }

  const vehiclePrice = requireFiniteNumber(raw.vehiclePrice, "data.vehiclePrice", issues, {
    min: 0,
    max: CONVERSATION_CORE_MAX_FINANCE_AMOUNT,
  });
  const priceSource = requireLiteralEnum(
    raw.priceSource,
    FINANCE_PRICE_SOURCES,
    "data.priceSource",
    issues
  );
  const calculationMode = requireLiteralEnum(
    raw.calculationMode,
    FINANCE_CALCULATION_MODES,
    "data.calculationMode",
    issues
  );
  const downPaymentBaht = requireFiniteNumber(
    raw.downPaymentBaht,
    "data.downPaymentBaht",
    issues,
    { min: 0, max: CONVERSATION_CORE_MAX_FINANCE_AMOUNT }
  );
  const downPaymentPercent = requireFiniteNumber(
    raw.downPaymentPercent,
    "data.downPaymentPercent",
    issues,
    { min: 0, max: 100 }
  );
  const loanAmount = requireFiniteNumber(raw.loanAmount, "data.loanAmount", issues, {
    min: 0,
    max: CONVERSATION_CORE_MAX_FINANCE_AMOUNT,
  });
  const annualInterestRatePercent = requireFiniteNumber(
    raw.annualInterestRatePercent,
    "data.annualInterestRatePercent",
    issues,
    { min: 0, max: FINANCE_MAX_INTEREST_RATE_PERCENT }
  );
  const interestMethod = requireLiteralEnum(
    raw.interestMethod,
    FINANCE_INTEREST_METHODS,
    "data.interestMethod",
    issues
  );
  const termMonths = requireFiniteNumber(raw.termMonths, "data.termMonths", issues, {
    min: 1,
    max: 120,
    integer: true,
  });
  const totalInterest = requireFiniteNumber(
    raw.totalInterest,
    "data.totalInterest",
    issues,
    { min: 0, max: CONVERSATION_CORE_MAX_FINANCE_AMOUNT }
  );
  const monthlyPayment = requireFiniteNumber(
    raw.monthlyPayment,
    "data.monthlyPayment",
    issues,
    { min: 0, max: CONVERSATION_CORE_MAX_FINANCE_AMOUNT }
  );
  const totalPayable = requireFiniteNumber(raw.totalPayable, "data.totalPayable", issues, {
    min: 0,
    max: CONVERSATION_CORE_MAX_FINANCE_AMOUNT,
  });
  const currency = requireLiteralEnum(
    raw.currency,
    FINANCE_CURRENCIES,
    "data.currency",
    issues
  );
  const quotationStatus = requireLiteralEnum(
    raw.quotationStatus,
    FINANCE_QUOTATION_STATUSES,
    "data.quotationStatus",
    issues
  );
  const vatStatus = requireLiteralEnum(
    raw.vatStatus,
    FINANCE_VAT_STATUSES,
    "data.vatStatus",
    issues
  );
  const additionalChargesStatus = requireLiteralEnum(
    raw.additionalChargesStatus,
    FINANCE_ADDITIONAL_CHARGES_STATUSES,
    "data.additionalChargesStatus",
    issues
  );

  if (raw.isEstimate !== true) {
    issues.push(issue("data.isEstimate", "invalid_type", "Estimate flag must be true"));
    return undefined;
  }

  if (
    vehiclePrice === null ||
    !priceSource ||
    !calculationMode ||
    downPaymentBaht === null ||
    downPaymentPercent === null ||
    loanAmount === null ||
    annualInterestRatePercent === null ||
    !interestMethod ||
    termMonths === null ||
    totalInterest === null ||
    monthlyPayment === null ||
    totalPayable === null ||
    !currency ||
    !quotationStatus ||
    !vatStatus ||
    !additionalChargesStatus
  ) {
    return undefined;
  }

  return {
    listingId,
    vehiclePrice,
    priceSource,
    calculationMode,
    downPaymentBaht,
    downPaymentPercent,
    loanAmount,
    annualInterestRatePercent,
    interestMethod,
    termMonths,
    totalInterest,
    monthlyPayment,
    totalPayable,
    currency,
    isEstimate: true,
    quotationStatus,
    vatStatus,
    additionalChargesStatus,
  };
}

function validateToolResultData(
  toolName: ConversationCoreToolName,
  raw: unknown,
  issues: ValidationIssue[]
): ToolResult["data"] | undefined {
  if (raw === undefined) {
    return undefined;
  }
  if (toolName === "inventory.fetch") {
    return validateInventoryFetchData(raw, issues);
  }
  if (toolName === "marketplace.search") {
    return validateMarketplaceSearchData(raw, issues);
  }
  if (toolName === "vehicle.resolveSelection") {
    return validateVehicleResolveData(raw, issues);
  }
  return validateFinanceCalculateData(raw, issues);
}

function parseToolName(raw: unknown, issues: ValidationIssue[]): ConversationCoreToolName | null {
  if (typeof raw !== "string") {
    issues.push(issue("toolName", "invalid_type", "Tool name must be a string"));
    return null;
  }
  const toolName = raw.trim();
  if (isForbiddenToolName(toolName)) {
    issues.push(issue("toolName", "forbidden_tool", "Tool is not allowed in Phase 1"));
    return null;
  }
  if (!isPhase1ReadOnlyToolName(toolName)) {
    issues.push(issue("toolName", "unknown_tool", "Tool name is not in the read-only allowlist"));
    return null;
  }
  return toolName;
}

function parseToolStatus(raw: unknown, issues: ValidationIssue[]): ToolResultStatus | null {
  if (typeof raw !== "string") {
    issues.push(issue("status", "invalid_type", "Tool result status must be a string"));
    return null;
  }
  const status = raw.trim();
  if (!(TOOL_RESULT_STATUSES as readonly string[]).includes(status)) {
    issues.push(issue("status", "invalid_status", "Tool result status is invalid"));
    return null;
  }
  return status as ToolResultStatus;
}

function parseToolProvenance(
  raw: unknown,
  issues: ValidationIssue[]
): ToolResultProvenance | null {
  if (typeof raw !== "string") {
    issues.push(issue("provenance", "invalid_type", "Tool result provenance must be a string"));
    return null;
  }
  const provenance = raw.trim();
  if (!(TOOL_RESULT_PROVENANCES as readonly string[]).includes(provenance)) {
    issues.push(issue("provenance", "invalid_provenance", "Tool result provenance is invalid"));
    return null;
  }
  return provenance as ToolResultProvenance;
}

export function validateToolRequest(raw: unknown): ValidationResult<ToolRequest> {
  const issues: ValidationIssue[] = [];

  if (!isPlainObject(raw)) {
    return fail([issue("$", "invalid_tool_request", "Tool request must be an object")]);
  }

  rejectUnknownKeys(raw, TOOL_REQUEST_ALLOWED_KEYS, "$", issues);

  const toolName = parseToolName(raw.toolName, issues);
  const requestId = validateNonEmptyId(raw.requestId, "requestId", issues);
  const conversationId = validateNonEmptyId(raw.conversationId, "conversationId", issues);

  let input: ToolRequest["input"] | null = null;
  if (toolName) {
    input = validateToolInput(toolName, raw.input, issues);
  }

  if (issues.length > 0 || !toolName || !requestId || !conversationId || !input) {
    return fail(issues);
  }

  return {
    ok: true,
    value: {
      toolName,
      requestId,
      conversationId,
      input,
    } as ToolRequest,
  };
}

export function validateToolResult(
  raw: unknown,
  expected?: { requestId?: string; conversationId?: string; toolName?: ConversationCoreToolName }
): ValidationResult<ToolResult> {
  const issues: ValidationIssue[] = [];

  if (!isPlainObject(raw)) {
    return fail([issue("$", "invalid_tool_result", "Tool result must be an object")]);
  }

  rejectUnknownKeys(raw, TOOL_RESULT_ALLOWED_KEYS, "$", issues);

  const toolName = parseToolName(raw.toolName, issues);
  const requestId = validateNonEmptyId(raw.requestId, "requestId", issues);
  const conversationId = validateNonEmptyId(raw.conversationId, "conversationId", issues);
  const status = parseToolStatus(raw.status, issues);
  const provenance = parseToolProvenance(raw.provenance, issues);

  if (toolName && provenance && provenance !== TOOL_REQUIRED_PROVENANCE_BY_TOOL[toolName]) {
    issues.push(
      issue("provenance", "provenance_tool_mismatch", "Tool result provenance does not match tool name")
    );
  }

  if (expected?.requestId && requestId && requestId !== expected.requestId) {
    issues.push(issue("requestId", "request_mismatch", "Tool result request id does not match"));
  }
  if (
    expected?.conversationId &&
    conversationId &&
    conversationId !== expected.conversationId
  ) {
    issues.push(
      issue("conversationId", "conversation_mismatch", "Tool result conversation id does not match")
    );
  }
  if (expected?.toolName && toolName && toolName !== expected.toolName) {
    issues.push(issue("toolName", "tool_mismatch", "Tool result tool name does not match"));
  }

  let fallbackUsed: boolean | undefined;
  if (raw.fallbackUsed !== undefined) {
    const parsed = raw.fallbackUsed;
    if (typeof parsed !== "boolean") {
      issues.push(issue("fallbackUsed", "invalid_type", "Fallback flag must be a boolean"));
    } else {
      fallbackUsed = parsed;
    }
  }

  let errorCode: string | undefined;
  if (raw.errorCode !== undefined) {
    const parsed = validateBoundedErrorCode(raw.errorCode, "errorCode", issues);
    if (parsed) {
      errorCode = parsed;
    }
  }

  if (status === "ok") {
    if (errorCode) {
      issues.push(
        issue("errorCode", "business_success_conflict", "Successful tool result cannot include error code")
      );
    }
    if (fallbackUsed === true) {
      issues.push(
        issue("fallbackUsed", "invalid_fallback_flag", "Successful tool result cannot set fallbackUsed")
      );
    }
    if (raw.data === undefined) {
      issues.push(issue("data", "missing_tool_data", "Successful tool result must include data"));
    }
  }

  if ((status === "error" || status === "fallback") && !errorCode) {
    issues.push(
      issue("errorCode", "missing_error_code", "Failed tool result must include error code")
    );
  }

  if ((status === "error" || status === "fallback") && raw.data !== undefined) {
    issues.push(
      issue("data", "failed_tool_has_data", "Failed tool result cannot include business data")
    );
  }

  if (status === "fallback" && fallbackUsed !== true) {
    issues.push(
      issue("fallbackUsed", "missing_fallback_flag", "Fallback tool result must set fallbackUsed to true")
    );
  }

  let data: ToolResult["data"] | undefined;
  if (toolName && status === "ok") {
    data = validateToolResultData(toolName, raw.data, issues);
    if (data === undefined) {
      issues.push(issue("data", "missing_tool_data", "Successful tool result data is invalid"));
    }
  }

  if (issues.length > 0 || !toolName || !requestId || !conversationId || !status || !provenance) {
    return fail(issues);
  }

  return {
    ok: true,
    value: {
      requestId,
      conversationId,
      toolName,
      status,
      provenance,
      ...(data !== undefined ? { data } : {}),
      ...(errorCode ? { errorCode } : {}),
      ...(fallbackUsed !== undefined ? { fallbackUsed } : {}),
    } as ToolResult,
  };
}

export function listingIdsFromToolResult(result: ToolResult): ReadonlySet<string> {
  const ids = new Set<string>();
  if (result.status !== "ok" || !result.data) {
    return ids;
  }
  if ("listingIds" in result.data) {
    for (const listingId of result.data.listingIds) {
      ids.add(listingId);
    }
  }
  if ("listingId" in result.data) {
    ids.add(result.data.listingId);
  }
  return ids;
}
