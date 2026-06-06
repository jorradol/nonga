/**
 * v5.6I.10 — Durable Firestore idempotency record model (readiness only; no I/O).
 * Cross-instance duplicate protection for settlement adjustments before writes enablement.
 */

import type { SettlementAdjustmentAction } from "./leadTypes";
import type { ApplySettlementAdjustmentInput } from "./settlementAdjustmentService";
import {
  buildAdjustmentPayloadFingerprint,
  buildSettlementIdempotencyCompositeKey,
  type SettlementAdjustmentIdempotencyRecord,
} from "./settlementIdempotency";

/** Firestore collection — server Admin SDK only; client deny-all in rules. */
export const SETTLEMENT_IDEMPOTENCY_COLLECTION = "settlementIdempotencyRecords" as const;

export type SettlementIdempotencyOperationType = "settlement_adjustment";

export type SettlementIdempotencyRecordStatus =
  | "processing"
  | "processed"
  | "conflict"
  | "failed";

/** Retention for completed idempotency records (days). Cleanup via scheduled job when enabled. */
export const SETTLEMENT_IDEMPOTENCY_RETENTION_DAYS = 90;

/** Documented transaction steps for future Firestore applyAdjustmentWithAudit wiring. */
export const DURABLE_IDEMPOTENCY_TRANSACTION_STEPS = [
  "start_transaction",
  "read_idempotency_record_by_deterministic_doc_id",
  "if_no_record_validate_payload_compute_state_and_audit",
  "if_no_record_create_idempotency_record_status_processing",
  "if_no_record_write_state_audit_and_finalize_idempotency_processed",
  "if_record_same_fingerprint_return_duplicate_without_new_audit",
  "if_record_different_fingerprint_reject_409_conflict",
  "if_transaction_fail_do_not_report_success",
  "if_backend_firestore_never_silent_fallback_to_memory",
] as const;

export type DurableIdempotencyResponseSnapshot = {
  outcome: "processed" | "duplicate";
  settlementStatus: string;
  feeAmount: number;
  paidAmount: number;
  remainingAmount: number;
  auditLogId: string;
};

/** Durable `settlementIdempotencyRecords/{docId}` — no buyer PII. */
export type DurableSettlementIdempotencyRecordDoc = {
  id: string;
  idempotencyKey: string;
  requestId: string;
  listingId: string;
  updatedBy: string;
  updatedByRole: "admin" | "superadmin";
  operationType: SettlementIdempotencyOperationType;
  payloadFingerprint: string;
  action: SettlementAdjustmentAction;
  amount?: number;
  newFeeAmount?: number;
  status: SettlementIdempotencyRecordStatus;
  settlementAdjustmentId: string;
  auditLogId: string;
  responseSnapshot?: DurableIdempotencyResponseSnapshot;
  createdAt: string;
  processedAt?: string;
  expiresAt: string;
  errorCode?: string;
  errorMessage?: string;
};

export const DURABLE_IDEMPOTENCY_REQUIRED_FIELDS = [
  "id",
  "idempotencyKey",
  "requestId",
  "listingId",
  "updatedBy",
  "updatedByRole",
  "operationType",
  "payloadFingerprint",
  "action",
  "status",
  "settlementAdjustmentId",
  "auditLogId",
  "createdAt",
  "expiresAt",
] as const satisfies readonly (keyof DurableSettlementIdempotencyRecordDoc)[];

const IDEMPOTENCY_PII_PATTERNS = /\b0[689]\d{8}\b|@|buyerphone|contactphone|ownerphone|buyeremail/i;

export function buildDurableIdempotencyDocId(
  listingId: string,
  updatedBy: string,
  requestId: string
): string {
  const safeActor = updatedBy.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
  const safeRequest = requestId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
  return `idem-${listingId.trim()}-${safeActor}-${safeRequest}`.slice(0, 500);
}

export function buildDurableIdempotencyKey(
  listingId: string,
  updatedBy: string,
  requestId: string
): string {
  return buildSettlementIdempotencyCompositeKey(listingId, updatedBy, requestId);
}

export function assertIdempotencyKeyHasNoPii(key: string): boolean {
  if (!key.trim()) return false;
  if (IDEMPOTENCY_PII_PATTERNS.test(key)) return false;
  return true;
}

export function computeIdempotencyExpiresAt(
  createdAtIso: string,
  retentionDays = SETTLEMENT_IDEMPOTENCY_RETENTION_DAYS
): string {
  const base = new Date(createdAtIso);
  if (Number.isNaN(base.getTime())) {
    throw new Error("createdAt ต้องเป็น ISO string ที่ถูกต้องครับ");
  }
  base.setUTCDate(base.getUTCDate() + retentionDays);
  return base.toISOString();
}

export function redactIdempotencyResponseSnapshot(
  state: {
    settlementStatus: string;
    feeAmount: number;
    paidAmount: number;
    remainingAmount: number;
  },
  auditLogId: string,
  outcome: "processed" | "duplicate"
): DurableIdempotencyResponseSnapshot {
  return {
    outcome,
    settlementStatus: state.settlementStatus,
    feeAmount: state.feeAmount,
    paidAmount: state.paidAmount,
    remainingAmount: state.remainingAmount,
    auditLogId,
  };
}

export function assertNoBuyerPiiInIdempotencyRecord(
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
  ];
  for (const field of forbidden) {
    if (json.includes(`"${field}"`)) return false;
  }
  return true;
}

export type IdempotencyReplayClassification =
  | { kind: "new" }
  | { kind: "duplicate"; record: SettlementAdjustmentIdempotencyRecord }
  | { kind: "conflict" };

export function classifyIdempotencyReplay(
  existing: SettlementAdjustmentIdempotencyRecord | null | undefined,
  payloadFingerprint: string
): IdempotencyReplayClassification {
  if (!existing) return { kind: "new" };
  if (existing.payloadFingerprint === payloadFingerprint) {
    return { kind: "duplicate", record: existing };
  }
  return { kind: "conflict" };
}

export function buildDurableIdempotencyRecordDraft(params: {
  input: Pick<
    ApplySettlementAdjustmentInput,
    | "listingId"
    | "action"
    | "amount"
    | "newFeeAmount"
    | "reason"
    | "adminNote"
    | "leadId"
    | "updatedBy"
    | "updatedByRole"
  >;
  requestId: string;
  settlementAdjustmentId: string;
  auditLogId: string;
  status: SettlementIdempotencyRecordStatus;
  createdAt: string;
  processedAt?: string;
  responseSnapshot?: DurableIdempotencyResponseSnapshot;
  errorCode?: string;
  errorMessage?: string;
}): DurableSettlementIdempotencyRecordDoc {
  const idempotencyKey = buildDurableIdempotencyKey(
    params.input.listingId,
    params.input.updatedBy,
    params.requestId
  );
  const payloadFingerprint = buildAdjustmentPayloadFingerprint(params.input);

  return {
    id: buildDurableIdempotencyDocId(
      params.input.listingId,
      params.input.updatedBy,
      params.requestId
    ),
    idempotencyKey,
    requestId: params.requestId.trim(),
    listingId: params.input.listingId.trim(),
    updatedBy: params.input.updatedBy.trim(),
    updatedByRole: params.input.updatedByRole,
    operationType: "settlement_adjustment",
    payloadFingerprint,
    action: params.input.action,
    ...(params.input.amount !== undefined ? { amount: Math.floor(params.input.amount) } : {}),
    ...(params.input.newFeeAmount !== undefined
      ? { newFeeAmount: Math.floor(params.input.newFeeAmount) }
      : {}),
    status: params.status,
    settlementAdjustmentId: params.settlementAdjustmentId.trim(),
    auditLogId: params.auditLogId.trim(),
    responseSnapshot: params.responseSnapshot,
    createdAt: params.createdAt,
    processedAt: params.processedAt,
    expiresAt: computeIdempotencyExpiresAt(params.createdAt),
    errorCode: params.errorCode,
    errorMessage: params.errorMessage,
  };
}
