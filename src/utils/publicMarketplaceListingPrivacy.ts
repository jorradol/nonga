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

/** Internal-only fields that should not be exposed on public marketplace APIs. */
export const PUBLIC_LISTING_REDACTED_INTERNAL_FIELDS = [
  "sellerConsentAccepted",
  "sellerConsentAcceptedAt",
  "sellerConsentVersion",
  "sellerConsentSource",
  "sellerConsentTextKey",
] as const;

export type PublicListingRedactedContactField =
  (typeof PUBLIC_LISTING_REDACTED_CONTACT_FIELDS)[number];

function redactContactFieldsOnRecord(
  record: Record<string, unknown>
): Record<string, unknown> {
  const next = { ...record };
  for (const key of PUBLIC_LISTING_REDACTED_CONTACT_FIELDS) {
    if (key in next) {
      next[key] = "";
    }
  }
  for (const key of PUBLIC_LISTING_REDACTED_INTERNAL_FIELDS) {
    if (key in next) {
      delete next[key];
    }
  }
  return next;
}

/** Strip private contact fields while preserving listing shape for clients. */
export function redactListingPrivateContactFields(
  record: Record<string, unknown>
): Record<string, unknown> {
  return redactContactFieldsOnRecord(record);
}

/** Public DTO for GET /api/cars — Firestore source data unchanged. */
export function toPublicMarketplaceCarDto(
  car: MarketplaceCarRecord
): MarketplaceCarRecord {
  return redactContactFieldsOnRecord(
    car as unknown as Record<string, unknown>
  ) as unknown as MarketplaceCarRecord;
}

export function toPublicMarketplaceCarDtoList(
  cars: MarketplaceCarRecord[]
): MarketplaceCarRecord[] {
  return cars.map(toPublicMarketplaceCarDto);
}
