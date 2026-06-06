import {
  assertApiSuccess,
  safeApiFetch,
  type ApiJsonEnvelope,
} from "../../utils/safeApiFetch";
import { adminAuthHeadersAsync } from "../../utils/apiAuthHeaders";
import type { SettlementAdjustmentAction } from "./leadTypes";
import type {
  RevenuePreviewApiPayload,
  RevenuePreviewApiRow,
} from "./revenuePreviewBackend";

export type AdminRevenueAdjustmentRequest = {
  listingId: string;
  leadId?: string;
  action: SettlementAdjustmentAction;
  amount?: number;
  newFeeAmount?: number;
  reason: string;
  adminNote?: string;
  /** v5.6I.9 — client idempotency key for safe retries (no PII). */
  requestId?: string;
};

export type AdminRevenueAdjustmentResponse = {
  adjustment: {
    listingId: string;
    feeAmount: number;
    paidAmount: number;
    remainingAmount: number;
    settlementStatus: string;
  };
  audit: {
    id: string;
    action: SettlementAdjustmentAction;
    reason: string;
    updatedBy: string;
    previousRemainingAmount: number;
    newRemainingAmount: number;
  };
  previewRow?: RevenuePreviewApiRow;
  idempotency?: {
    requestId: string;
    outcome: "processed" | "duplicate";
  };
};

export async function postAdminRevenueAdjustment(
  body: AdminRevenueAdjustmentRequest
): Promise<AdminRevenueAdjustmentResponse> {
  const json = await safeApiFetch<
    ApiJsonEnvelope & { data?: AdminRevenueAdjustmentResponse }
  >("/api/admin/revenue/adjustments", {
    method: "POST",
    headers: {
      ...(await adminAuthHeadersAsync()),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  assertApiSuccess(json, "/api/admin/revenue/adjustments");
  return json.data as AdminRevenueAdjustmentResponse;
}

export type { RevenuePreviewApiPayload };
