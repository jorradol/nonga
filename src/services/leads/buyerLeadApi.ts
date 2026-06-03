/**
 * v5.6C — Client API for consented buyer leads.
 */

import { requireFirebaseAuthHeaders } from "../auth/firebaseAuthHeaders";
import type { PublicBuyerLead } from "./buyerLeadView";
import type { PurchaseMethod } from "./leadTypes";
import { BUYER_LEAD_CONSENT_VERSION } from "./buyerLeadValidation";

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
      message: "กรุณาเข้าสู่ระบบก่อนส่งข้อมูลให้ผู้ขายครับ",
    };
  }

  const res = await fetch("/api/buyer-leads", {
    method: "POST",
    headers,
    body: JSON.stringify({
      ...params,
      consentVersion: BUYER_LEAD_CONSENT_VERSION,
    }),
  });

  const json = (await res.json().catch(() => null)) as {
    success?: boolean;
    message?: string;
    data?: PublicBuyerLead;
    queuePosition?: number;
  } | null;

  if (!res.ok || !json?.success || !json.data) {
    return { ok: false, message: json?.message || "บันทึกลีดไม่สำเร็จ" };
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
