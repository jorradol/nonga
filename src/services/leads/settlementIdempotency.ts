/**
 * v5.6I.9 — Settlement adjustment idempotency keys (no PII).
 */

import type { SettlementAdjustmentAction } from "./leadTypes";
import type { ApplySettlementAdjustmentInput } from "./settlementAdjustmentService";

export type SettlementAdjustmentIdempotencyOutcome = "processed" | "duplicate";

export const SETTLEMENT_REQUEST_ID_MAX_LEN = 128;

const PII_IN_REQUEST_ID =
  /\b0[689]\d{8}\b|@|buyerphone|contactphone|ownerphone/i;

export class SettlementAdjustmentIdempotencyConflictError extends Error {
  readonly code = "SETTLEMENT_IDEMPOTENCY_CONFLICT" as const;

  constructor(message = "requestId นี้ถูกใช้กับ payload อื่นแล้วครับ") {
    super(message);
    this.name = "SettlementAdjustmentIdempotencyConflictError";
  }
}

export type SettlementAdjustmentIdempotencyRecord = {
  compositeKey: string;
  listingId: string;
  updatedBy: string;
  requestId: string;
  payloadFingerprint: string;
  auditId: string;
  processedAt: string;
};

export function normalizeSettlementRequestId(
  value: unknown
): string | undefined {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return undefined;
  if (trimmed.length > SETTLEMENT_REQUEST_ID_MAX_LEN) {
    return trimmed.slice(0, SETTLEMENT_REQUEST_ID_MAX_LEN);
  }
  return trimmed;
}

export function assertSettlementRequestIdHasNoPii(requestId: string): boolean {
  if (!requestId.trim()) return false;
  if (PII_IN_REQUEST_ID.test(requestId)) return false;
  return true;
}

export function generateServerSettlementRequestId(now = Date.now()): string {
  const suffix = Math.random().toString(36).slice(2, 10);
  return `srv-${now}-${suffix}`;
}

export function resolveSettlementRequestId(
  provided: unknown,
  now = Date.now()
): string {
  const normalized = normalizeSettlementRequestId(provided);
  if (normalized) {
    if (!assertSettlementRequestIdHasNoPii(normalized)) {
      throw new Error("requestId ต้องไม่มีข้อมูลติดต่อหรือ PII ครับ");
    }
    return normalized;
  }
  return generateServerSettlementRequestId(now);
}

export function buildSettlementIdempotencyCompositeKey(
  listingId: string,
  updatedBy: string,
  requestId: string
): string {
  return `${listingId.trim()}|${updatedBy.trim()}|${requestId.trim()}`;
}

export type AdjustmentPayloadFingerprintInput = Pick<
  ApplySettlementAdjustmentInput,
  "listingId" | "action" | "amount" | "newFeeAmount" | "reason" | "adminNote" | "leadId"
>;

export function buildAdjustmentPayloadFingerprint(
  input: AdjustmentPayloadFingerprintInput
): string {
  const payload: Record<string, string | number | null> = {
    listingId: input.listingId.trim(),
    action: input.action,
    amount:
      input.amount === undefined || input.amount === null
        ? null
        : Math.floor(Number(input.amount)),
    newFeeAmount:
      input.newFeeAmount === undefined || input.newFeeAmount === null
        ? null
        : Math.floor(Number(input.newFeeAmount)),
    reason: String(input.reason ?? "").trim(),
    adminNote: input.adminNote?.trim() || null,
    leadId: input.leadId?.trim() || null,
  };
  return JSON.stringify(payload);
}

export function buildDeterministicAdjustmentAuditId(
  requestId: string,
  listingId: string
): string {
  const safeRequest = requestId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
  return `adj-audit-${listingId.trim()}-${safeRequest}`;
}

export function assertAdjustmentInputHasNoBuyerPii(
  input: Pick<
    ApplySettlementAdjustmentInput,
    "reason" | "adminNote" | "leadId"
  >
): boolean {
  const blob = JSON.stringify({
    reason: input.reason,
    adminNote: input.adminNote,
    leadId: input.leadId,
  }).toLowerCase();
  if (/\b0[689]\d{8}\b/.test(blob)) return false;
  if (blob.includes("buyerphone") || blob.includes("contactphone")) {
    return false;
  }
  return true;
}
