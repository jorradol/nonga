/**
 * v5.6I.5 — Durable settlement / adjustment / audit document model (types + guards).
 * No Firestore I/O in this module.
 */

import type {
  SettlementAdjustmentAction,
  SettlementAdjustmentAuditEntry,
  SettlementAdjustmentSource,
  SettlementAdjustmentState,
  SettlementStatus,
  SuccessFeePolicyType,
  SuccessFeeRecord,
} from "./leadTypes";
import { LEAD_ENGINE_COLLECTIONS } from "./leadTypes";

export const SETTLEMENT_COLLECTIONS = {
  successFeeRecords: LEAD_ENGINE_COLLECTIONS.successFeeRecords,
  settlementAdjustments: LEAD_ENGINE_COLLECTIONS.settlementAdjustments,
  settlementAuditLogs: LEAD_ENGINE_COLLECTIONS.settlementAuditLogs,
} as const;

export type SettlementAdjustmentType =
  | "partial_payment"
  | "paid_full"
  | "waived"
  | "disputed"
  | "cancelled"
  | "fee_revised"
  | "admin_note";

export type SettlementAuditEventType =
  | "settlement_created"
  | "adjustment_applied"
  | "status_changed"
  | "fee_revised"
  | "payment_recorded"
  | "note_added"
  | "settlement_cancelled"
  | "settlement_soft_deleted";

export type SettlementSnapshot = {
  feeAmount: number;
  paidAmount: number;
  remainingAmount: number;
  waivedAmount?: number;
  settlementStatus: SettlementStatus;
  adminNote?: string;
};

/** Durable `successFeeRecords/{recordId}` — no buyer PII fields. */
export type DurableSuccessFeeRecordDoc = {
  id: string;
  listingId: string;
  sellerId: string;
  ownerId?: string;
  dealerId?: string;
  leadId?: string;
  dealOutcomeId?: string;
  source: SettlementAdjustmentSource;
  closedDealPrice: number;
  feeAmount: number;
  paidAmount: number;
  remainingAmount: number;
  waivedAmount: number;
  feePolicyType: SuccessFeePolicyType;
  settlementStatus: SettlementStatus;
  note?: string;
  correlationId?: string;
  requestId?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancelledReason?: string;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
  updatedByRole?: "admin" | "superadmin" | "system";
};

/** Durable `settlementAdjustments/{adjustmentId}` — current overlay per listing/settlement. */
export type DurableSettlementAdjustmentDoc = {
  id: string;
  settlementId: string;
  listingId: string;
  sellerId: string;
  ownerId?: string;
  dealerId?: string;
  leadId?: string;
  source: SettlementAdjustmentSource;
  adjustmentType: SettlementAdjustmentType;
  adjustmentAmount: number;
  feeAmount: number;
  paidAmount: number;
  remainingAmount: number;
  waivedAmount: number;
  settlementStatus: SettlementStatus;
  note?: string;
  correlationId?: string;
  requestId?: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  updatedByRole: "admin" | "superadmin";
};

/** Durable `settlementAuditLogs/{auditId}` — immutable before/after trail. */
export type DurableSettlementAuditLogDoc = {
  id: string;
  settlementId: string;
  listingId: string;
  sellerId: string;
  ownerId?: string;
  dealerId?: string;
  leadId?: string;
  eventType: SettlementAuditEventType;
  adjustmentType?: SettlementAdjustmentType;
  source: SettlementAdjustmentSource;
  before: SettlementSnapshot;
  after: SettlementSnapshot;
  adjustmentAmount: number;
  reason: string;
  note?: string;
  correlationId?: string;
  requestId?: string;
  updatedBy: string;
  updatedByRole: "admin" | "superadmin" | "system";
  createdAt: string;
};

export const DURABLE_SUCCESS_FEE_REQUIRED_FIELDS = [
  "id",
  "listingId",
  "sellerId",
  "source",
  "closedDealPrice",
  "feeAmount",
  "paidAmount",
  "remainingAmount",
  "settlementStatus",
  "createdAt",
  "updatedAt",
] as const satisfies readonly (keyof DurableSuccessFeeRecordDoc)[];

export const DURABLE_ADJUSTMENT_REQUIRED_FIELDS = [
  "id",
  "settlementId",
  "listingId",
  "sellerId",
  "source",
  "adjustmentType",
  "adjustmentAmount",
  "feeAmount",
  "paidAmount",
  "remainingAmount",
  "settlementStatus",
  "updatedBy",
  "updatedByRole",
  "createdAt",
  "updatedAt",
] as const satisfies readonly (keyof DurableSettlementAdjustmentDoc)[];

export const DURABLE_AUDIT_REQUIRED_FIELDS = [
  "id",
  "settlementId",
  "listingId",
  "sellerId",
  "eventType",
  "source",
  "before",
  "after",
  "adjustmentAmount",
  "reason",
  "updatedBy",
  "updatedByRole",
  "createdAt",
] as const satisfies readonly (keyof DurableSettlementAuditLogDoc)[];

const BUYER_PII_FIELD_NAMES = [
  "buyerphone",
  "contactphone",
  "ownerphone",
  "buyeremail",
  "buyername",
  "displayname",
  "contactemail",
] as const;

export function mapAdjustmentActionToType(
  action: SettlementAdjustmentAction
): SettlementAdjustmentType {
  switch (action) {
    case "partial_payment":
    case "record_payment":
      return "partial_payment";
    case "mark_paid":
      return "paid_full";
    case "waive_fee":
      return "waived";
    case "dispute_fee":
      return "disputed";
    case "cancel_fee":
      return "cancelled";
    case "manual_adjustment":
      return "fee_revised";
    case "admin_note":
      return "admin_note";
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

export function mapAdjustmentActionToAuditEventType(
  action: SettlementAdjustmentAction
): SettlementAuditEventType {
  switch (action) {
    case "partial_payment":
    case "record_payment":
      return "payment_recorded";
    case "mark_paid":
    case "waive_fee":
    case "dispute_fee":
    case "cancel_fee":
    case "manual_adjustment":
      return "adjustment_applied";
    case "admin_note":
      return "note_added";
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

export function normalizeSettlementSource(
  source: SettlementAdjustmentSource
): SettlementAdjustmentSource {
  if (source === "admin_manual") return "manual_admin_adjustment";
  return source;
}

export function stateToSettlementSnapshot(
  state: Pick<
    SettlementAdjustmentState,
    | "feeAmount"
    | "paidAmount"
    | "remainingAmount"
    | "waivedAmount"
    | "settlementStatus"
    | "adminNote"
  >
): SettlementSnapshot {
  return {
    feeAmount: state.feeAmount,
    paidAmount: state.paidAmount,
    remainingAmount: state.remainingAmount,
    waivedAmount: state.waivedAmount,
    settlementStatus: state.settlementStatus,
    adminNote: state.adminNote,
  };
}

export function auditEntryToDurableAuditLog(
  entry: SettlementAdjustmentAuditEntry
): DurableSettlementAuditLogDoc {
  const adjustmentType = mapAdjustmentActionToType(entry.action);
  return {
    id: entry.id,
    settlementId: entry.settlementId,
    listingId: entry.listingId,
    sellerId: entry.sellerId,
    ownerId: entry.ownerId,
    dealerId: entry.dealerId,
    leadId: entry.leadId,
    eventType: mapAdjustmentActionToAuditEventType(entry.action),
    adjustmentType,
    source: normalizeSettlementSource(entry.source),
    before: {
      feeAmount: entry.previousFeeAmount,
      paidAmount: entry.previousPaidAmount,
      remainingAmount: entry.previousRemainingAmount,
      settlementStatus: entry.previousStatus,
    },
    after: {
      feeAmount: entry.newFeeAmount,
      paidAmount: entry.newPaidAmount,
      remainingAmount: entry.newRemainingAmount,
      settlementStatus: entry.newStatus,
      adminNote: entry.adminNote,
    },
    adjustmentAmount: entry.amountDelta,
    reason: entry.reason,
    note: entry.adminNote,
    updatedBy: entry.updatedBy,
    updatedByRole: entry.updatedByRole,
    createdAt: entry.createdAt,
  };
}

export function stateToDurableAdjustmentDoc(
  state: SettlementAdjustmentState,
  meta: {
    source?: SettlementAdjustmentSource;
    adjustmentType?: SettlementAdjustmentType;
    adjustmentAmount?: number;
    updatedBy: string;
    updatedByRole: "admin" | "superadmin";
    createdAt?: string;
  }
): DurableSettlementAdjustmentDoc {
  const now = state.updatedAt;
  return {
    id: state.settlementId,
    settlementId: state.settlementId,
    listingId: state.listingId,
    sellerId: state.sellerId,
    ownerId: state.ownerId,
    dealerId: state.dealerId,
    leadId: state.leadId,
    source: normalizeSettlementSource(meta.source ?? "manual_admin_adjustment"),
    adjustmentType: meta.adjustmentType ?? "admin_note",
    adjustmentAmount: meta.adjustmentAmount ?? 0,
    feeAmount: state.feeAmount,
    paidAmount: state.paidAmount,
    remainingAmount: state.remainingAmount,
    waivedAmount: state.waivedAmount,
    settlementStatus: state.settlementStatus,
    note: state.adminNote,
    createdAt: meta.createdAt ?? now,
    updatedAt: now,
    updatedBy: meta.updatedBy,
    updatedByRole: meta.updatedByRole,
  };
}

export function successFeeRecordToDurableDoc(
  record: SuccessFeeRecord,
  meta?: {
    source?: DurableSuccessFeeRecordDoc["source"];
    dealerId?: string;
    correlationId?: string;
    requestId?: string;
    updatedBy?: string;
    updatedByRole?: DurableSuccessFeeRecordDoc["updatedByRole"];
  }
): DurableSuccessFeeRecordDoc {
  return {
    id: record.id,
    listingId: record.listingId,
    sellerId: record.sellerId,
    ownerId: record.ownerId,
    dealerId: meta?.dealerId,
    leadId: record.buyerLeadId === "preview" ? undefined : record.buyerLeadId,
    dealOutcomeId: record.dealOutcomeId || undefined,
    source: meta?.source ?? "lead_outcome",
    closedDealPrice: record.closedDealPrice,
    feeAmount: record.feeAmount,
    paidAmount: record.paidAmount,
    remainingAmount: record.remainingAmount,
    waivedAmount: record.amountWaived,
    feePolicyType: record.feePolicyType,
    settlementStatus: record.settlementStatus,
    note: record.adminNote,
    correlationId: meta?.correlationId,
    requestId: meta?.requestId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    updatedBy: meta?.updatedBy,
    updatedByRole: meta?.updatedByRole,
  };
}

export function hasRequiredFields<T extends object>(
  doc: T,
  required: readonly (keyof T)[]
): boolean {
  return required.every((key) => {
    const value = doc[key];
    if (value === undefined || value === null) return false;
    if (typeof value === "string" && value.trim() === "") return false;
    return true;
  });
}

export function assertNoBuyerPiiInSettlementDocument(
  doc: Record<string, unknown>
): boolean {
  const json = JSON.stringify(doc).toLowerCase();
  if (/\b0[689]\d{8}\b/.test(json)) return false;
  for (const field of BUYER_PII_FIELD_NAMES) {
    if (json.includes(`"${field}"`)) return false;
  }
  return true;
}

export function assertAuditHasBeforeAfterOrSufficientReason(
  audit: Pick<DurableSettlementAuditLogDoc, "before" | "after" | "reason" | "eventType">
): boolean {
  const reason = String(audit.reason ?? "").trim();
  if (!reason) return false;
  if (audit.eventType === "note_added") {
    return reason.length >= 1;
  }
  const before = audit.before;
  const after = audit.after;
  if (!before || !after) return false;
  const changed =
    before.feeAmount !== after.feeAmount ||
    before.paidAmount !== after.paidAmount ||
    before.remainingAmount !== after.remainingAmount ||
    before.settlementStatus !== after.settlementStatus ||
    before.adminNote !== after.adminNote;
  return changed || reason.length >= 3;
}
