/**
 * v5.6C — Client API for consented buyer leads.
 */

import { requireFirebaseAuthHeaders } from "../auth/firebaseAuthHeaders";
import type { PublicBuyerLead } from "./buyerLeadView";
import type { PurchaseMethod } from "./leadTypes";
import {
  BUYER_LEAD_MODAL_SUBMIT_GENERIC_ERROR,
  BUYER_LEAD_MODAL_SUBMIT_NETWORK_ERROR,
  BUYER_LEAD_MODAL_SUBMIT_SESSION_ERROR,
} from "./buyerLeadConsentModalCopy";
import { BUYER_LEAD_CONSENT_VERSION } from "./buyerLeadValidation";
import { BUYER_LEAD_CAPTURE_DISABLED_MESSAGE } from "./leadCaptureFlags";

/** Maps POST /api/buyer-leads HTTP status to user-facing Thai copy (no PII). */
export function mapBuyerLeadHttpError(
  status: number,
  serverMessage?: string
): string {
  const trimmed = serverMessage?.trim();
  if (status === 401) {
    return BUYER_LEAD_MODAL_SUBMIT_SESSION_ERROR;
  }
  if (status === 403) {
    if (
      trimmed &&
      (trimmed === BUYER_LEAD_CAPTURE_DISABLED_MESSAGE ||
        /ยังไม่เปิดใช้งาน|ไม่เปิดส่งข้อมูล/.test(trimmed))
    ) {
      return trimmed;
    }
    return trimmed || "ไม่มีสิทธิ์ส่งข้อมูลในตอนนี้ กรุณาลองใหม่อีกครั้ง";
  }
  if (status === 400 || status === 404) {
    return trimmed || "ข้อมูลไม่ครบหรือไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง";
  }
  if (status >= 500) {
    return BUYER_LEAD_MODAL_SUBMIT_GENERIC_ERROR;
  }
  return trimmed || BUYER_LEAD_MODAL_SUBMIT_GENERIC_ERROR;
}

export interface CreateBuyerLeadApiParams {
  listingId: string;
  displayName: string;
  contactPhone: string;
  purchaseMethod: PurchaseMethod;
  preferredContactWindow: string;
  budgetMin?: number;
  budgetMax?: number;
  offeredPrice?: number;
  consentConfirmed: boolean;
}

export async function createBuyerLeadFromChat(
  params: CreateBuyerLeadApiParams
): Promise<
  | { ok: true; lead: PublicBuyerLead; message: string; queuePosition?: number }
  | { ok: false; message: string }
> {
  let headers: HeadersInit;
  try {
    headers = await requireFirebaseAuthHeaders();
  } catch {
    return {
      ok: false,
      message: BUYER_LEAD_MODAL_SUBMIT_SESSION_ERROR,
    };
  }

  let res: Response;
  try {
    res = await fetch("/api/buyer-leads", {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...params,
        consentVersion: BUYER_LEAD_CONSENT_VERSION,
      }),
    });
  } catch {
    return { ok: false, message: BUYER_LEAD_MODAL_SUBMIT_NETWORK_ERROR };
  }

  const json = (await res.json().catch(() => null)) as {
    success?: boolean;
    message?: string;
    data?: PublicBuyerLead;
    queuePosition?: number;
  } | null;

  if (!res.ok || !json?.success || !json.data) {
    return {
      ok: false,
      message: mapBuyerLeadHttpError(res.status, json?.message),
    };
  }
  return {
    ok: true,
    lead: json.data,
    message: json.message || "บันทึกแล้ว",
    queuePosition: json.queuePosition ?? json.data.queuePosition,
  };
}

export async function fetchListingInterestQueueStats(
  listingId: string
): Promise<{ interestCount: number } | null> {
  try {
    const res = await fetch(
      `/api/listings/${encodeURIComponent(listingId)}/interest-queue-stats`,
      { cache: "no-store" }
    );
    const json = (await res.json().catch(() => null)) as {
      success?: boolean;
      data?: { interestCount?: number };
    } | null;
    if (!res.ok || !json?.success || !json.data) return null;
    const n = json.data.interestCount;
    return { interestCount: typeof n === "number" && n >= 0 ? n : 0 };
  } catch {
    return null;
  }
}
