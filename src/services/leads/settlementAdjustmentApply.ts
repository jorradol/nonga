/**
 * v5.6I.9 — Atomic settlement adjustment + audit apply helpers.
 */

import type {
  SettlementAdjustmentAuditEntry,
  SettlementAdjustmentState,
} from "./leadTypes";
import {
  applySettlementAdjustment,
  type ApplySettlementAdjustmentInput,
} from "./settlementAdjustmentService";
import {
  assertAuditHasBeforeAfterOrSufficientReason,
  assertNoBuyerPiiInSettlementDocument,
  auditEntryToDurableAuditLog,
} from "./settlementPersistenceModel";
import {
  assertAdjustmentInputHasNoBuyerPii,
  buildDeterministicAdjustmentAuditId,
  buildAdjustmentPayloadFingerprint,
  type SettlementAdjustmentIdempotencyOutcome,
} from "./settlementIdempotency";

export type ApplyAdjustmentWithAuditParams = {
  current: SettlementAdjustmentState;
  input: ApplySettlementAdjustmentInput;
  requestId: string;
  now?: string;
};

export type ApplyAdjustmentWithAuditResult = {
  state: SettlementAdjustmentState;
  audit: SettlementAdjustmentAuditEntry;
  outcome: SettlementAdjustmentIdempotencyOutcome;
  requestId: string;
  payloadFingerprint: string;
};

export class SettlementAdjustmentAuditInvariantError extends Error {
  readonly code = "SETTLEMENT_AUDIT_INVARIANT" as const;

  constructor(message: string) {
    super(message);
    this.name = "SettlementAdjustmentAuditInvariantError";
  }
}

export function validateAdjustmentAuditInvariant(
  audit: SettlementAdjustmentAuditEntry
): void {
  if (!audit.updatedBy?.trim()) {
    throw new SettlementAdjustmentAuditInvariantError(
      "audit ต้องมี updatedBy ครับ"
    );
  }
  if (audit.updatedByRole !== "admin" && audit.updatedByRole !== "superadmin") {
    throw new SettlementAdjustmentAuditInvariantError(
      "audit ต้องมี updatedByRole ที่ถูกต้องครับ"
    );
  }
  if (!assertAdjustmentInputHasNoBuyerPii(audit)) {
    throw new SettlementAdjustmentAuditInvariantError(
      "ห้ามบันทึก buyer phone/contact ใน adjustment ครับ"
    );
  }
  const durable = auditEntryToDurableAuditLog(audit);
  if (!assertNoBuyerPiiInSettlementDocument(durable)) {
    throw new SettlementAdjustmentAuditInvariantError(
      "audit durable doc มี PII ที่ไม่ได้รับอนุญาตครับ"
    );
  }
  if (!assertAuditHasBeforeAfterOrSufficientReason(durable)) {
    throw new SettlementAdjustmentAuditInvariantError(
      "audit ต้องมี before/after หรือเหตุผลที่เพียงพอครับ"
    );
  }
}

export function computeAdjustmentWithAuditDraft(
  params: ApplyAdjustmentWithAuditParams
): {
  next: SettlementAdjustmentState;
  audit: SettlementAdjustmentAuditEntry;
  payloadFingerprint: string;
} {
  const now = params.now ?? new Date().toISOString();
  if (!assertAdjustmentInputHasNoBuyerPii(params.input)) {
    throw new SettlementAdjustmentAuditInvariantError(
      "ห้ามบันทึก buyer phone/contact ใน adjustment ครับ"
    );
  }

  const payloadFingerprint = buildAdjustmentPayloadFingerprint(params.input);
  const { next, audit: auditDraft } = applySettlementAdjustment(
    params.current,
    params.input,
    now
  );

  const audit: SettlementAdjustmentAuditEntry = {
    ...auditDraft,
    id: buildDeterministicAdjustmentAuditId(
      params.requestId,
      params.input.listingId
    ),
    createdAt: now,
  };

  validateAdjustmentAuditInvariant(audit);

  return { next, audit, payloadFingerprint };
}
