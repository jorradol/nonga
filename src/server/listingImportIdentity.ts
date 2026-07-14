/**
 * Deterministic import identity / upsert matching for CSV re-imports.
 *
 * Precedence (same dealer/import-owner scope only):
 * 1. full license plate (+ province when present) — exact, high confidence
 * 2. VIN exact — high confidence
 * 3. make/model/year/color/mileage/price fingerprint — exact, high confidence
 *    only when the fingerprint is unique among dealer listings
 *
 * Ambiguous matches (multiple candidates, or soft/partial overlap) → NEED REVIEW.
 * Never guess ("มั่วคัน").
 */

import { createHash } from "crypto";
import { normalizeDealerId } from "../utils/dealerIdentity";
import {
  extractVinFromText,
  normalizePlate,
  normalizeVin,
} from "../utils/duplicateDetection/textSimilarity";
import { extractRegistrationFields } from "../utils/vehicleRegistrationPrivacy";
import type { MarketplaceCarRecord } from "./marketplaceInventory";
import { resolveCarDealerId } from "./marketplaceInventory";
import type { DealerDraftRecord } from "./dealerDraftInventory";

/** Minimal row shape for identity extraction (avoids circular import). */
export interface ImportIdentityRowInput {
  brand?: string;
  model?: string;
  year?: number;
  price?: number;
  mileage?: number;
  description?: string;
  registrationProvince?: string;
  licensePlateMasked?: string;
  licensePlateFull?: string;
  rawRow?: Record<string, string>;
}

export type ImportMatchConfidence = "high" | "ambiguous" | "none";

export type ImportMatchKeyKind =
  | "dealer_plate"
  | "dealer_vin"
  | "dealer_fingerprint"
  | "none";

export interface ImportIdentityFields {
  dealerId: string;
  licensePlateFull: string;
  registrationProvince: string;
  vin: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  mileage: number;
  price: number;
}

export interface ImportMatchDecision {
  confidence: ImportMatchConfidence;
  keyKind: ImportMatchKeyKind;
  importKey: string;
  matchedId?: string;
  candidateIds: string[];
  reason: string;
}

export interface ImportIdentityCandidate {
  id: string;
  dealerId: string;
  licensePlateFull?: string;
  licensePlate?: string;
  registrationProvince?: string;
  vin?: string;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  mileage?: number;
  price?: number;
  description?: string;
  createdAt?: string;
}

function normText(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    // Keep letters, numbers, and combining marks (Thai vowels/tone marks).
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractColorFromText(text: string): string {
  const m = String(text ?? "").match(/(?:สี|color)\s*[:：]?\s*([^\n|,;]+)/i);
  return normText(m?.[1] ?? "");
}

function plateFromRecord(record: {
  licensePlateFull?: string;
  licensePlate?: string;
}): string {
  return normalizePlate(
    String(record.licensePlateFull ?? record.licensePlate ?? "").trim()
  );
}

function vinFromRecord(record: { vin?: string; description?: string }): string {
  const direct = normalizeVin(String(record.vin ?? "").trim());
  if (direct.length === 17) return direct;
  return extractVinFromText(record.description) || "";
}

export function extractImportIdentityFromRow(
  row: ImportIdentityRowInput,
  dealerId: string
): ImportIdentityFields {
  const raw = row.rawRow ?? {};
  const registration = extractRegistrationFields({
    plateValue:
      row.licensePlateFull ??
      String(
        raw.licensePlate ??
          raw["ทะเบียน"] ??
          raw.plate ??
          raw["ทะเบียน/จังหวัด"] ??
          ""
      ),
    provinceValue:
      row.registrationProvince ??
      String(
        raw.registrationProvince ??
          raw["จังหวัดทะเบียน"] ??
          raw.province ??
          ""
      ),
  });

  const color =
    normText(raw.color ?? raw["สี"] ?? "") ||
    extractColorFromText(String(row.description ?? ""));

  const vin =
    extractVinFromText(String(row.description ?? "")) ||
    extractVinFromText(JSON.stringify(raw)) ||
    "";

  return {
    dealerId: normalizeDealerId(dealerId),
    licensePlateFull: normalizePlate(registration.licensePlateFull),
    registrationProvince: normText(registration.registrationProvince),
    vin,
    brand: normText(row.brand),
    model: normText(row.model),
    year: Number(row.year) || 0,
    color,
    mileage: Math.max(0, Number(row.mileage) || 0),
    price: Math.max(0, Number(row.price) || 0),
  };
}

export function extractImportIdentityFromListing(
  car: MarketplaceCarRecord | ImportIdentityCandidate
): ImportIdentityFields {
  const dealerId =
    "dealerId" in car && car.dealerId
      ? normalizeDealerId(String(car.dealerId))
      : resolveCarDealerId(car as MarketplaceCarRecord);
  return {
    dealerId,
    licensePlateFull: plateFromRecord(car),
    registrationProvince: normText(car.registrationProvince),
    vin: vinFromRecord(car),
    brand: normText(car.brand),
    model: normText(car.model),
    year: Number(car.year) || 0,
    color:
      normText((car as { color?: string }).color) ||
      extractColorFromText(String(car.description ?? "")),
    mileage: Math.max(0, Number(car.mileage) || 0),
    price: Math.max(0, Number(car.price) || 0),
  };
}

export function extractImportIdentityFromDraft(
  draft: DealerDraftRecord
): ImportIdentityFields {
  const nd = draft.normalizedData;
  return {
    dealerId: normalizeDealerId(draft.dealerId),
    licensePlateFull: normalizePlate(
      String(draft.licensePlateFull ?? draft.licensePlate ?? nd?.licensePlate ?? "")
    ),
    registrationProvince: normText(
      draft.registrationProvince ?? nd?.registrationProvince ?? nd?.province
    ),
    vin: vinFromRecord(draft),
    brand: normText(draft.brand || nd?.brand),
    model: normText(draft.model || nd?.model),
    year: Number(draft.year || nd?.year) || 0,
    color: normText(nd?.color) || extractColorFromText(draft.description),
    mileage: Math.max(0, Number(draft.mileage || nd?.mileage) || 0),
    price: Math.max(0, Number(draft.price || nd?.price) || 0),
  };
}

/** Stable opaque key — never expose raw plate/VIN in public surfaces. */
export function buildImportKey(
  kind: Exclude<ImportMatchKeyKind, "none">,
  identity: ImportIdentityFields
): string {
  let material = "";
  if (kind === "dealer_plate") {
    material = [
      identity.dealerId,
      identity.licensePlateFull,
      identity.registrationProvince,
    ].join("|");
  } else if (kind === "dealer_vin") {
    material = [identity.dealerId, identity.vin].join("|");
  } else {
    material = [
      identity.dealerId,
      identity.brand,
      identity.model,
      String(identity.year),
      identity.color,
      String(identity.mileage),
      String(identity.price),
    ].join("|");
  }
  const hash = createHash("sha256").update(material).digest("hex").slice(0, 24);
  return `${kind}:${hash}`;
}

function hasUsablePlate(identity: ImportIdentityFields): boolean {
  // Require enough plate material to avoid masked-only collisions (e.g. "กข**").
  const plate = identity.licensePlateFull;
  if (plate.length < 5) return false;
  if (/\*/.test(plate)) return false;
  // Province-only tokens (no digits) must not participate in plate upsert keys.
  if (!/\d/.test(plate)) return false;
  const alnum = plate.replace(/[^A-Z0-9\u0E00-\u0E7F]/gi, "");
  return alnum.length >= 5;
}

function hasUsableVin(identity: ImportIdentityFields): boolean {
  return identity.vin.length === 17;
}

function hasUsableFingerprint(identity: ImportIdentityFields): boolean {
  return Boolean(
    identity.brand &&
      identity.model &&
      identity.year >= 1980 &&
      identity.color &&
      identity.mileage > 0 &&
      identity.price > 0
  );
}

function sameDealer(
  a: ImportIdentityFields,
  b: ImportIdentityFields
): boolean {
  return a.dealerId && b.dealerId && a.dealerId === b.dealerId;
}

function plateExactMatch(
  a: ImportIdentityFields,
  b: ImportIdentityFields
): boolean {
  if (!hasUsablePlate(a) || !hasUsablePlate(b)) return false;
  if (a.licensePlateFull !== b.licensePlateFull) return false;
  // Province is reinforcing when both sides have it; missing on one side is OK.
  if (
    a.registrationProvince &&
    b.registrationProvince &&
    a.registrationProvince !== b.registrationProvince
  ) {
    return false;
  }
  return true;
}

function vinExactMatch(
  a: ImportIdentityFields,
  b: ImportIdentityFields
): boolean {
  return (
    hasUsableVin(a) && hasUsableVin(b) && a.vin === b.vin
  );
}

function fingerprintExactMatch(
  a: ImportIdentityFields,
  b: ImportIdentityFields
): boolean {
  if (!hasUsableFingerprint(a) || !hasUsableFingerprint(b)) return false;
  return (
    a.brand === b.brand &&
    a.model === b.model &&
    a.year === b.year &&
    a.color === b.color &&
    a.mileage === b.mileage &&
    a.price === b.price
  );
}

function softOverlap(
  a: ImportIdentityFields,
  b: ImportIdentityFields
): boolean {
  if (!sameDealer(a, b)) return false;
  const brandModelYear =
    a.brand &&
    b.brand &&
    a.brand === b.brand &&
    a.model &&
    b.model &&
    a.model === b.model &&
    a.year > 0 &&
    a.year === b.year;
  if (!brandModelYear) return false;
  const colorClose = !a.color || !b.color || a.color === b.color;
  const mileageClose =
    a.mileage <= 0 ||
    b.mileage <= 0 ||
    Math.abs(a.mileage - b.mileage) <= Math.max(500, a.mileage * 0.02);
  const priceClose =
    a.price <= 0 ||
    b.price <= 0 ||
    Math.abs(a.price - b.price) / Math.max(a.price, b.price, 1) <= 0.05;
  return colorClose && mileageClose && priceClose;
}

function pickOldestId(
  candidates: ImportIdentityCandidate[],
  ids: string[]
): string {
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const sorted = [...ids].sort((a, b) => {
    const ca = byId.get(a)?.createdAt ?? "";
    const cb = byId.get(b)?.createdAt ?? "";
    if (ca && cb && ca !== cb) return ca.localeCompare(cb);
    return a.localeCompare(b);
  });
  return sorted[0];
}

/**
 * Resolve whether an incoming import row should update an existing listing,
 * create a new one, or be held for review.
 */
export function resolveImportUpsertMatch(
  incoming: ImportIdentityFields,
  corpus: ImportIdentityCandidate[]
): ImportMatchDecision {
  const scoped = corpus.filter((c) => {
    const existing = extractImportIdentityFromListing(c);
    return sameDealer(incoming, existing);
  });

  const plateHits = scoped.filter((c) =>
    plateExactMatch(incoming, extractImportIdentityFromListing(c))
  );
  if (plateHits.length === 1) {
    return {
      confidence: "high",
      keyKind: "dealer_plate",
      importKey: buildImportKey("dealer_plate", incoming),
      matchedId: plateHits[0].id,
      candidateIds: [plateHits[0].id],
      reason: "dealer_scope_full_plate_exact",
    };
  }
  if (plateHits.length > 1) {
    return {
      confidence: "ambiguous",
      keyKind: "dealer_plate",
      importKey: buildImportKey("dealer_plate", incoming),
      candidateIds: plateHits.map((c) => c.id),
      reason: "multiple_plate_matches_need_review",
    };
  }

  const vinHits = scoped.filter((c) =>
    vinExactMatch(incoming, extractImportIdentityFromListing(c))
  );
  if (vinHits.length === 1) {
    return {
      confidence: "high",
      keyKind: "dealer_vin",
      importKey: buildImportKey("dealer_vin", incoming),
      matchedId: vinHits[0].id,
      candidateIds: [vinHits[0].id],
      reason: "dealer_scope_vin_exact",
    };
  }
  if (vinHits.length > 1) {
    return {
      confidence: "ambiguous",
      keyKind: "dealer_vin",
      importKey: buildImportKey("dealer_vin", incoming),
      candidateIds: vinHits.map((c) => c.id),
      reason: "multiple_vin_matches_need_review",
    };
  }

  if (hasUsableFingerprint(incoming)) {
    const fpHits = scoped.filter((c) =>
      fingerprintExactMatch(incoming, extractImportIdentityFromListing(c))
    );
    if (fpHits.length === 1) {
      return {
        confidence: "high",
        keyKind: "dealer_fingerprint",
        importKey: buildImportKey("dealer_fingerprint", incoming),
        matchedId: fpHits[0].id,
        candidateIds: [fpHits[0].id],
        reason: "dealer_scope_fingerprint_exact_unique",
      };
    }
    if (fpHits.length > 1) {
      return {
        confidence: "ambiguous",
        keyKind: "dealer_fingerprint",
        importKey: buildImportKey("dealer_fingerprint", incoming),
        candidateIds: fpHits.map((c) => c.id),
        reason: "multiple_fingerprint_matches_need_review",
      };
    }
  }

  // Unique soft overlap (same dealer brand/model/year + close color/mileage/price):
  // safe to upsert when exactly one candidate — covers re-import with changed price.
  // Multiple soft hits → NEED REVIEW (do not guess).
  const softHits = scoped.filter((c) =>
    softOverlap(incoming, extractImportIdentityFromListing(c))
  );
  if (softHits.length === 1) {
    const only = softHits[0];
    const keyKind: ImportMatchKeyKind = hasUsableFingerprint(incoming)
      ? "dealer_fingerprint"
      : "none";
    return {
      confidence: "high",
      keyKind,
      importKey:
        keyKind === "none" ? "" : buildImportKey(keyKind, incoming),
      matchedId: only.id,
      candidateIds: [only.id],
      reason: "dealer_scope_soft_unique_no_guess",
    };
  }
  if (softHits.length > 1) {
    return {
      confidence: "ambiguous",
      keyKind: "none",
      importKey: "",
      candidateIds: softHits.map((c) => c.id),
      reason: "soft_overlap_need_review_no_guess",
    };
  }

  const keyKind: ImportMatchKeyKind = hasUsablePlate(incoming)
    ? "dealer_plate"
    : hasUsableVin(incoming)
      ? "dealer_vin"
      : hasUsableFingerprint(incoming)
        ? "dealer_fingerprint"
        : "none";

  return {
    confidence: "none",
    keyKind,
    importKey:
      keyKind === "none" ? "" : buildImportKey(keyKind, incoming),
    candidateIds: [],
    reason: "no_existing_match_create_new",
  };
}

/**
 * Prefer the oldest listing as canonical keeper when cleaning clear duplicates.
 */
export function chooseCanonicalListingId(
  candidates: ImportIdentityCandidate[]
): string | null {
  if (candidates.length === 0) return null;
  return pickOldestId(
    candidates,
    candidates.map((c) => c.id)
  );
}

/** True when value is present and should overwrite existing data. */
export function isPresentImportValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value) && value !== 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/**
 * Blank-field-safe merge: only overwrite with explicitly present incoming values.
 * Never replace working images with empty/placeholder when preserveExistingImages.
 */
export function mergeImportListingFields<T extends Record<string, unknown>>(
  existing: T,
  incoming: Partial<T>,
  options: {
    preserveExistingImages?: boolean;
    imageFailed?: boolean;
    incomingImages?: string[];
    placeholderUrl?: string;
  } = {}
): T {
  const merged: Record<string, unknown> = { ...existing };
  const preserveId = existing.id;
  const preserveCreatedAt = existing.createdAt;
  const preserveDealerId = existing.dealerId;
  const preserveOwnerId = existing.ownerId;

  for (const [key, value] of Object.entries(incoming)) {
    if (key === "id" || key === "createdAt" || key === "dealerId" || key === "ownerId") {
      continue;
    }
    if (key === "images") continue;
    if (!isPresentImportValue(value)) continue;
    merged[key] = value;
  }

  const placeholder = options.placeholderUrl ?? "";
  const existingImages = Array.isArray(existing.images)
    ? (existing.images as string[]).filter(
        (u) => u && (!placeholder || u !== placeholder)
      )
    : [];
  const incomingImages = (options.incomingImages ?? []).filter(
    (u) => u && (!placeholder || u !== placeholder)
  );

  if (options.imageFailed || incomingImages.length === 0) {
    if (options.preserveExistingImages !== false && existingImages.length > 0) {
      merged.images = existingImages;
    } else if (incomingImages.length > 0) {
      merged.images = incomingImages;
    } else if (existingImages.length > 0) {
      merged.images = existingImages;
    }
  } else {
    merged.images = incomingImages;
  }

  merged.id = preserveId;
  if (preserveCreatedAt != null) merged.createdAt = preserveCreatedAt;
  if (preserveDealerId != null) merged.dealerId = preserveDealerId;
  if (preserveOwnerId != null) merged.ownerId = preserveOwnerId;

  return merged as T;
}
