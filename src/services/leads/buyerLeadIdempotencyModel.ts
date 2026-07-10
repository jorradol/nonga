/**
 * v22.52 — Durable buyer-lead active-slot idempotency (pure model; no I/O).
 *
 * Duplicate definition:
 *   Same authenticated buyerUserId + listingId while an active Lead exists
 *   for that pair → at most one active Lead. Withdrawn/terminal does not
 *   permanently block a later legitimate inquiry. Different listingIds are
 *   always distinct inquiries.
 *
 * Key rules:
 *   - Server-authoritative deterministic doc id (no Buyer-chosen recipient)
 *   - No raw PII in doc id / record fields
 *   - Safe under multi-instance via Firestore transaction create-if-absent
 */

import { createHash } from "node:crypto";

/** Firestore collection — Admin SDK only; client deny-all in rules. */
export const BUYER_LEAD_IDEMPOTENCY_COLLECTION = "buyerLeadIdempotencyRecords" as const;

export const BUYER_LEAD_ACTIVE_SLOT_RETENTION_DAYS = 90;

export type BuyerLeadIdempotencyRecordStatus = "active" | "released" | "superseded";

/** Durable active-slot record — no buyer phone/name/email. */
export type BuyerLeadActiveSlotRecord = {
  id: string;
  listingId: string;
  buyerUserId: string;
  /** Opaque fingerprint of normalized phone (sha256 hex prefix) — not raw PII. */
  contactFingerprint: string;
  leadId: string;
  contactLogId: string;
  status: BuyerLeadIdempotencyRecordStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
};

const PII_PATTERNS = /\b0[689]\d{8}\b|@|buyerphone|contactphone|ownerphone|buyeremail|buyername/i;

export function buildBuyerLeadActiveSlotDocId(
  listingId: string,
  buyerUserId: string
): string {
  const safeListing = listingId.trim().replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120);
  const safeBuyer = buyerUserId.trim().replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120);
  return `active-${safeListing}-${safeBuyer}`.slice(0, 500);
}

/** SHA-256 hex prefix of normalized contact — never store raw phone in the key. */
export function buildBuyerLeadContactFingerprint(normalizedContact: string): string {
  const raw = String(normalizedContact ?? "").trim();
  if (!raw) return "empty";
  return createHash("sha256").update(raw, "utf8").digest("hex").slice(0, 32);
}

export function computeBuyerLeadSlotExpiresAt(
  createdAtIso: string,
  retentionDays = BUYER_LEAD_ACTIVE_SLOT_RETENTION_DAYS
): string {
  const base = new Date(createdAtIso);
  if (Number.isNaN(base.getTime())) {
    throw new Error("createdAt ต้องเป็น ISO string ที่ถูกต้องครับ");
  }
  base.setUTCDate(base.getUTCDate() + retentionDays);
  return base.toISOString();
}

export function assertBuyerLeadIdempotencyKeyHasNoPii(key: string): boolean {
  if (!key.trim()) return false;
  if (PII_PATTERNS.test(key)) return false;
  return true;
}

export function assertNoBuyerPiiInActiveSlotRecord(
  doc: Record<string, unknown>
): boolean {
  const json = JSON.stringify(doc).toLowerCase();
  if (/\b0[689]\d{8}\b/.test(json)) return false;
  const forbidden = [
    "buyerphone",
    "contactphone",
    "ownerphone",
    "buyeremail",
    "contactemail",
    "buyername",
    "displayname",
  ];
  for (const field of forbidden) {
    if (json.includes(`"${field}"`)) return false;
  }
  return true;
}

export function buildBuyerLeadActiveSlotDraft(params: {
  listingId: string;
  buyerUserId: string;
  contactFingerprint: string;
  leadId: string;
  contactLogId: string;
  createdAt: string;
  status?: BuyerLeadIdempotencyRecordStatus;
}): BuyerLeadActiveSlotRecord {
  const id = buildBuyerLeadActiveSlotDocId(params.listingId, params.buyerUserId);
  if (!assertBuyerLeadIdempotencyKeyHasNoPii(id)) {
    throw new Error("active-slot doc id must not contain PII");
  }
  return {
    id,
    listingId: params.listingId.trim(),
    buyerUserId: params.buyerUserId.trim(),
    contactFingerprint: params.contactFingerprint.trim(),
    leadId: params.leadId.trim(),
    contactLogId: params.contactLogId.trim(),
    status: params.status ?? "active",
    createdAt: params.createdAt,
    updatedAt: params.createdAt,
    expiresAt: computeBuyerLeadSlotExpiresAt(params.createdAt),
  };
}

export type ActiveSlotTransactionDecision =
  | { kind: "create" }
  | { kind: "duplicate"; leadId: string }
  | { kind: "reuse_slot" };

/**
 * Pure decision for active-slot read inside a transaction.
 * - No record / released / superseded → create
 * - Active record → duplicate (caller verifies lead still active)
 */
export function resolveActiveSlotTransactionDecision(
  existing: Pick<BuyerLeadActiveSlotRecord, "status" | "leadId"> | null | undefined
): ActiveSlotTransactionDecision {
  if (!existing) return { kind: "create" };
  if (existing.status === "released" || existing.status === "superseded") {
    return { kind: "reuse_slot" };
  }
  if (existing.status === "active" && existing.leadId.trim()) {
    return { kind: "duplicate", leadId: existing.leadId };
  }
  return { kind: "create" };
}
