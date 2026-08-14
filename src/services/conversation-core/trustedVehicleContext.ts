/**
 * WP-V2U-02 / R1 — Trusted vehicle context from verified business sources only.
 */

import {
  CONVERSATION_CORE_MAX_LISTING_ID_LENGTH,
  CONVERSATION_CORE_MAX_SNAPSHOT_VERSION_LENGTH,
  CONVERSATION_CORE_MAX_VERIFIED_TEXT_LENGTH,
  fail,
  isPlainObject,
  issue,
  rejectUnknownKeys,
  requireFiniteNumber,
  requireString,
  validateNonEmptyId,
  type ValidationIssue,
  type ValidationResult,
} from "./conversationTurnInput";

export const TRUSTED_VEHICLE_PROVENANCES = [
  "inventory-api",
  "marketplace-search",
] as const;

export type TrustedVehicleProvenance = (typeof TRUSTED_VEHICLE_PROVENANCES)[number];

export const FORBIDDEN_VEHICLE_PROVENANCES = [
  "ai-generated",
  "llm",
  "model-inferred",
  "client-claimed",
  "user-selection",
  "orchestrator-search",
] as const;

export const TRUSTED_VEHICLE_MISSING_BEHAVIORS = [
  "omit",
  "ask-clarification",
  "fail-closed",
] as const;

export type TrustedVehicleMissingBehavior =
  (typeof TRUSTED_VEHICLE_MISSING_BEHAVIORS)[number];

export const VERIFIED_VEHICLE_FIELD_KEYS = [
  "brand",
  "model",
  "variant",
  "year",
  "price",
  "mileage",
  "transmission",
  "fuelType",
  "stockStatus",
] as const;

export type VerifiedVehicleFieldKey = (typeof VERIFIED_VEHICLE_FIELD_KEYS)[number];

export interface VerifiedVehicleFields {
  brand?: string;
  model?: string;
  variant?: string;
  year?: number;
  price?: number;
  mileage?: number;
  transmission?: string;
  fuelType?: string;
  stockStatus?: string;
}

export interface TrustedVehicleContext {
  listingId: string;
  provenance: TrustedVehicleProvenance;
  selectedAtConversationId: string;
  snapshotVersion?: string;
  observedAtMs?: number;
  verifiedFields: VerifiedVehicleFields;
  missingDataBehavior: TrustedVehicleMissingBehavior;
}

const TRUSTED_VEHICLE_ALLOWED_KEYS = new Set([
  "listingId",
  "provenance",
  "selectedAtConversationId",
  "snapshotVersion",
  "observedAtMs",
  "verifiedFields",
  "missingDataBehavior",
]);

const VERIFIED_FIELDS_KEY_SET = new Set<string>(VERIFIED_VEHICLE_FIELD_KEYS);

function validateVerifiedStringField(
  raw: unknown,
  path: string,
  issues: ValidationIssue[]
): string | undefined {
  if (raw === undefined) {
    return undefined;
  }
  const value = requireString(raw, path, issues, {
    maxLength: CONVERSATION_CORE_MAX_VERIFIED_TEXT_LENGTH,
  });
  return value ?? undefined;
}

function validateVerifiedFields(
  raw: unknown,
  issues: ValidationIssue[]
): VerifiedVehicleFields | null {
  if (!isPlainObject(raw)) {
    issues.push(
      issue("verifiedFields", "invalid_verified_fields", "Verified fields must be an object")
    );
    return null;
  }

  rejectUnknownKeys(raw, VERIFIED_FIELDS_KEY_SET, "verifiedFields", issues);

  const verifiedFields: VerifiedVehicleFields = {};

  const brand = validateVerifiedStringField(raw.brand, "verifiedFields.brand", issues);
  if (brand !== undefined) verifiedFields.brand = brand;

  const model = validateVerifiedStringField(raw.model, "verifiedFields.model", issues);
  if (model !== undefined) verifiedFields.model = model;

  const variant = validateVerifiedStringField(raw.variant, "verifiedFields.variant", issues);
  if (variant !== undefined) verifiedFields.variant = variant;

  const transmission = validateVerifiedStringField(
    raw.transmission,
    "verifiedFields.transmission",
    issues
  );
  if (transmission !== undefined) verifiedFields.transmission = transmission;

  const fuelType = validateVerifiedStringField(
    raw.fuelType,
    "verifiedFields.fuelType",
    issues
  );
  if (fuelType !== undefined) verifiedFields.fuelType = fuelType;

  const stockStatus = validateVerifiedStringField(
    raw.stockStatus,
    "verifiedFields.stockStatus",
    issues
  );
  if (stockStatus !== undefined) verifiedFields.stockStatus = stockStatus;

  if (raw.year !== undefined) {
    const year = requireFiniteNumber(raw.year, "verifiedFields.year", issues, {
      min: 1950,
      max: 2100,
      integer: true,
    });
    if (year !== null) {
      verifiedFields.year = year;
    }
  }

  if (raw.price !== undefined) {
    const price = requireFiniteNumber(raw.price, "verifiedFields.price", issues, {
      min: 0,
      max: 100_000_000,
    });
    if (price !== null) {
      verifiedFields.price = price;
    }
  }

  if (raw.mileage !== undefined) {
    const mileage = requireFiniteNumber(raw.mileage, "verifiedFields.mileage", issues, {
      min: 0,
      max: 2_000_000,
    });
    if (mileage !== null) {
      verifiedFields.mileage = mileage;
    }
  }

  if (Object.keys(verifiedFields).length === 0) {
    issues.push(
      issue("verifiedFields", "empty_verified_fields", "At least one verified field is required")
    );
  }

  return verifiedFields;
}

export function validateTrustedVehicleContext(
  raw: unknown,
  expectedConversationId: string
): ValidationResult<TrustedVehicleContext> {
  const issues: ValidationIssue[] = [];

  if (!isPlainObject(raw)) {
    return fail([issue("$", "invalid_trusted_vehicle", "Trusted vehicle must be an object")]);
  }

  rejectUnknownKeys(raw, TRUSTED_VEHICLE_ALLOWED_KEYS, "$", issues);

  const listingId = validateNonEmptyId(raw.listingId, "listingId", issues);
  if (listingId && listingId.length > CONVERSATION_CORE_MAX_LISTING_ID_LENGTH) {
    issues.push(issue("listingId", "invalid_listing_id", "Listing id exceeds maximum length"));
  }

  let provenance: TrustedVehicleProvenance | null = null;
  if (typeof raw.provenance !== "string") {
    issues.push(issue("provenance", "invalid_type", "Vehicle provenance must be a string"));
  } else {
    const normalized = raw.provenance.trim().toLowerCase();
    if ((FORBIDDEN_VEHICLE_PROVENANCES as readonly string[]).includes(normalized)) {
      issues.push(
        issue("provenance", "forbidden_provenance", "Vehicle provenance is not a trusted business source")
      );
    } else if (!(TRUSTED_VEHICLE_PROVENANCES as readonly string[]).includes(normalized)) {
      issues.push(issue("provenance", "invalid_provenance", "Vehicle provenance is not trusted"));
    } else {
      provenance = normalized as TrustedVehicleProvenance;
    }
  }

  const selectedAtConversationId = validateNonEmptyId(
    raw.selectedAtConversationId,
    "selectedAtConversationId",
    issues
  );
  if (
    selectedAtConversationId &&
    selectedAtConversationId !== expectedConversationId.trim()
  ) {
    issues.push(
      issue(
        "selectedAtConversationId",
        "conversation_mismatch",
        "Selected vehicle must be bound to the active conversation"
      )
    );
  }

  let missingDataBehavior: TrustedVehicleMissingBehavior | null = null;
  if (typeof raw.missingDataBehavior !== "string") {
    issues.push(
      issue("missingDataBehavior", "invalid_type", "Missing data behavior must be a string")
    );
  } else {
    const normalized = raw.missingDataBehavior.trim();
    if (!(TRUSTED_VEHICLE_MISSING_BEHAVIORS as readonly string[]).includes(normalized)) {
      issues.push(
        issue(
          "missingDataBehavior",
          "invalid_missing_behavior",
          "Missing data behavior is not allowed"
        )
      );
    } else {
      missingDataBehavior = normalized as TrustedVehicleMissingBehavior;
    }
  }

  let snapshotVersion: string | undefined;
  if (raw.snapshotVersion !== undefined) {
    const parsed = requireString(raw.snapshotVersion, "snapshotVersion", issues, {
      maxLength: CONVERSATION_CORE_MAX_SNAPSHOT_VERSION_LENGTH,
    });
    if (parsed) {
      snapshotVersion = parsed;
    }
  }

  let observedAtMs: number | undefined;
  if (raw.observedAtMs !== undefined) {
    const parsed = requireFiniteNumber(raw.observedAtMs, "observedAtMs", issues, {
      min: 0,
      integer: true,
    });
    if (parsed !== null) {
      observedAtMs = parsed;
    }
  }

  const verifiedFields = validateVerifiedFields(raw.verifiedFields, issues);

  if (
    issues.length > 0 ||
    !listingId ||
    !provenance ||
    !selectedAtConversationId ||
    !missingDataBehavior ||
    verifiedFields === null
  ) {
    return fail(issues);
  }

  return {
    ok: true,
    value: {
      listingId,
      provenance,
      selectedAtConversationId,
      verifiedFields,
      missingDataBehavior,
      ...(snapshotVersion ? { snapshotVersion } : {}),
      ...(observedAtMs !== undefined ? { observedAtMs } : {}),
    },
  };
}
