import type { MarketplaceCarRecord } from "../server/marketplaceInventory";

/** Private seller / listing contact fields — never expose on unauthenticated marketplace APIs */
export const PUBLIC_LISTING_REDACTED_CONTACT_FIELDS = [
  "ownerPhone",
  "ownerEmail",
  "ownerLine",
  "contactPhone",
  "contactEmail",
  "contactLine",
  "contactName",
  "contactNote",
] as const;

/** Buyer / lead contact fields that must never appear on public listing payloads. */
export const PUBLIC_LISTING_REDACTED_BUYER_CONTACT_FIELDS = [
  "buyerPhone",
  "buyerEmail",
  "buyerLine",
  "buyerContactPhone",
  "buyerContactEmail",
  "buyerContactLine",
  "buyerDisplayName",
  "buyerName",
] as const;

/** Vehicle identifiers — strip from public marketplace DTO entirely. */
export const PUBLIC_LISTING_REDACTED_SENSITIVE_VEHICLE_FIELDS = [
  "vin",
  "licensePlate",
  "plate",
  "registration",
] as const;

/** Internal / wholesale pricing — never public on marketplace listings. */
export const PUBLIC_LISTING_REDACTED_PRICE_INTERNAL_FIELDS = [
  "wholesalePrice",
  "wholesaleInternalPrice",
  "internalPrice",
  "cost",
  "dealerCost",
] as const;

/** Internal-only fields that should not be exposed on public marketplace APIs. */
export const PUBLIC_LISTING_REDACTED_INTERNAL_FIELDS = [
  "sellerConsentAccepted",
  "sellerConsentAcceptedAt",
  "sellerConsentVersion",
  "sellerConsentSource",
  "sellerConsentTextKey",
  "moderationStatus",
  "adminHiddenReason",
  "adminHiddenAt",
  "adminHiddenBy",
  "reportOpenCount",
  "reports",
  "imageMetadata",
] as const;

/** Duplicate-detection metadata — internal matching signals only. */
export const PUBLIC_LISTING_REDACTED_DUPLICATE_FIELDS = [
  "duplicateStatus",
  "duplicateScore",
  "duplicateGroupId",
  "duplicateCanonicalId",
  "duplicateMatches",
  "duplicateReviewedAt",
  "duplicateReviewAction",
] as const;

export type PublicListingRedactedContactField =
  (typeof PUBLIC_LISTING_REDACTED_CONTACT_FIELDS)[number];

const PUBLIC_LISTING_DESCRIPTION_SANITIZE_PATTERNS: RegExp[] = [
  /\b0[689]\d[-\s]?\d{3}[-\s]?\d{4}\b/g,
  /\b0[689]\d{8}\b/g,
  /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
  /@[a-z0-9._-]{2,}/gi,
  /\b([A-HJ-NPR-Z0-9]{17})\b/gi,
  /[ก-ฮ]{2}[\s-]?\d{1,4}(?:[\s-]?[ก-ฮ]{1,2})?/g,
  /wholesale|ราคาส่ง|ราคาหน้าเต็นท์/gi,
];

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Remove contact / VIN / plate-like fragments from public listing description text. */
export function sanitizePublicListingDescription(
  description: string | null | undefined
): string {
  let out = String(description ?? "");
  for (const pattern of PUBLIC_LISTING_DESCRIPTION_SANITIZE_PATTERNS) {
    out = out.replace(pattern, " ");
  }
  return collapseWhitespace(out);
}

function deleteKeysOnRecord(
  record: Record<string, unknown>,
  keys: readonly string[]
): void {
  for (const key of keys) {
    if (key in record) {
      delete record[key];
    }
  }
}

function redactPublicListingRecord(
  record: Record<string, unknown>
): Record<string, unknown> {
  const next = { ...record };

  for (const key of PUBLIC_LISTING_REDACTED_CONTACT_FIELDS) {
    if (key in next) {
      next[key] = "";
    }
  }
  for (const key of PUBLIC_LISTING_REDACTED_BUYER_CONTACT_FIELDS) {
    if (key in next) {
      next[key] = "";
    }
  }

  deleteKeysOnRecord(next, PUBLIC_LISTING_REDACTED_SENSITIVE_VEHICLE_FIELDS);
  deleteKeysOnRecord(next, PUBLIC_LISTING_REDACTED_PRICE_INTERNAL_FIELDS);
  deleteKeysOnRecord(next, PUBLIC_LISTING_REDACTED_INTERNAL_FIELDS);
  deleteKeysOnRecord(next, PUBLIC_LISTING_REDACTED_DUPLICATE_FIELDS);

  if (typeof next.description === "string") {
    next.description = sanitizePublicListingDescription(next.description);
  }

  return next;
}

/** Strip private contact fields while preserving listing shape for clients. */
export function redactListingPrivateContactFields(
  record: Record<string, unknown>
): Record<string, unknown> {
  return redactPublicListingRecord(record);
}

/** Public DTO for GET /api/cars — Firestore source data unchanged. */
export function toPublicMarketplaceCarDto(
  car: MarketplaceCarRecord
): MarketplaceCarRecord {
  return redactPublicListingRecord(
    car as unknown as Record<string, unknown>
  ) as unknown as MarketplaceCarRecord;
}

export function toPublicMarketplaceCarDtoList(
  cars: MarketplaceCarRecord[]
): MarketplaceCarRecord[] {
  return cars.map(toPublicMarketplaceCarDto);
}
