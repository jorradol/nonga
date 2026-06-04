/**
 * v5.6E — Client API for seller masked buyer lead queue.
 */

import { requireFirebaseAuthHeaders } from "../auth/firebaseAuthHeaders";
import type { LeadContactOutcome, SellerMaskedQueueEntry, SellerSkipReason } from "./leadTypes";
import {
  mapSellerQueueFetchError,
  type SellerLeadQueuePanelErrorKind,
} from "./sellerLeadQueuePanelMessages";

export type SellerMaskedLeadQueueFetchResult =
  | { ok: true; entries: SellerMaskedQueueEntry[]; interestCount: number }
  | {
      ok: false;
      status: number;
      message: string;
      errorKind: SellerLeadQueuePanelErrorKind;
      hidePanel: boolean;
      interestCount: number;
    };

export async function fetchListingInterestCount(listingId: string): Promise<number> {
  try {
    const res = await fetch(
      `/api/listings/${encodeURIComponent(listingId)}/interest-queue-stats`,
      { cache: "no-store" }
    );
    const json = (await res.json().catch(() => null)) as {
      success?: boolean;
      data?: { interestCount?: number };
    } | null;
    if (!res.ok || !json?.success || !json.data) return 0;
    const n = json.data.interestCount;
    return typeof n === "number" && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export async function fetchSellerMaskedLeadQueue(
  listingId: string,
  options?: { isListingOwnerContext?: boolean; knownInterestCount?: number }
): Promise<SellerMaskedLeadQueueFetchResult> {
  const interestFromStats =
    options?.knownInterestCount ??
    (await fetchListingInterestCount(listingId));

  if (interestFromStats <= 0) {
    return { ok: true, entries: [], interestCount: 0 };
  }

  let headers: HeadersInit;
  try {
    headers = await requireFirebaseAuthHeaders();
  } catch {
    const mapped = mapSellerQueueFetchError({
      status: 401,
      interestCount: interestFromStats,
      isListingOwnerContext: options?.isListingOwnerContext,
    });
    return {
      ok: false,
      status: 401,
      message: mapped.message,
      errorKind: mapped.kind,
      hidePanel: mapped.hidePanel,
      interestCount: interestFromStats,
    };
  }

  const queueRes = await fetch(
    `/api/seller/listings/${encodeURIComponent(listingId)}/buyer-lead-queue`,
    { headers, cache: "no-store" }
  );

  const queueJson = (await queueRes.json().catch(() => null)) as {
    success?: boolean;
    message?: string;
    data?: SellerMaskedQueueEntry[];
  } | null;

  if (!queueRes.ok || !queueJson?.success || !Array.isArray(queueJson.data)) {
    const mapped = mapSellerQueueFetchError({
      status: queueRes.status,
      message: queueJson?.message,
      interestCount: interestFromStats,
      isListingOwnerContext: options?.isListingOwnerContext,
    });
    return {
      ok: false,
      status: queueRes.status,
      message: mapped.message,
      errorKind: mapped.kind,
      hidePanel: mapped.hidePanel,
      interestCount: interestFromStats,
    };
  }

  return {
    ok: true,
    entries: queueJson.data,
    interestCount: interestFromStats,
  };
}

export async function skipSellerQueueLead(params: {
  leadId: string;
  reason: SellerSkipReason;
  note?: string;
}): Promise<
  | {
      ok: true;
      buyerQueueFeedback: string;
      nextRevealableLeadId: string | null;
    }
  | { ok: false; message: string }
> {
  let headers: HeadersInit;
  try {
    headers = await requireFirebaseAuthHeaders();
  } catch {
    return { ok: false, message: "กรุณาเข้าสู่ระบบก่อนดำเนินการครับ" };
  }

  const res = await fetch(
    `/api/seller/buyer-leads/${encodeURIComponent(params.leadId)}/skip`,
    {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reason: params.reason,
        ...(params.note?.trim() ? { note: params.note.trim() } : {}),
      }),
    }
  );

  const json = (await res.json().catch(() => null)) as {
    success?: boolean;
    message?: string;
    data?: { buyerQueueFeedback?: string; nextRevealableLeadId?: string | null };
  } | null;

  if (!res.ok || !json?.success || !json.data?.buyerQueueFeedback) {
    return { ok: false, message: json?.message || "ข้ามคิวไม่สำเร็จ" };
  }

  return {
    ok: true,
    buyerQueueFeedback: json.data.buyerQueueFeedback,
    nextRevealableLeadId: json.data.nextRevealableLeadId ?? null,
  };
}

export async function revealSellerQueueLead(params: {
  leadId: string;
}): Promise<
  | {
      ok: true;
      leadId: string;
      contactPhone: string;
      displayName: string;
      contactRevealStatus: string;
      contactRevealedAt: string | null;
    }
  | { ok: false; message: string }
> {
  let headers: HeadersInit;
  try {
    headers = await requireFirebaseAuthHeaders();
  } catch {
    return { ok: false, message: "กรุณาเข้าสู่ระบบก่อนดำเนินการครับ" };
  }

  const res = await fetch(
    `/api/seller/buyer-leads/${encodeURIComponent(params.leadId)}/reveal`,
    {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: "{}",
    }
  );

  const json = (await res.json().catch(() => null)) as {
    success?: boolean;
    message?: string;
    data?: {
      leadId?: string;
      contactPhone?: string;
      displayName?: string;
      contactRevealStatus?: string;
      contactRevealedAt?: string | null;
    };
  } | null;

  const phone = json?.data?.contactPhone?.trim();
  if (!res.ok || !json?.success || !json.data?.leadId || !phone) {
    return { ok: false, message: json?.message || "เปิดข้อมูลติดต่อไม่สำเร็จ" };
  }

  return {
    ok: true,
    leadId: json.data.leadId,
    contactPhone: phone,
    displayName: String(json.data.displayName ?? "").trim() || "ผู้ซื้อ",
    contactRevealStatus: String(json.data.contactRevealStatus ?? "revealed"),
    contactRevealedAt: json.data.contactRevealedAt ?? null,
  };
}

export async function recordSellerQueueOutcome(params: {
  leadId: string;
  outcome: LeadContactOutcome;
}): Promise<
  | { ok: true; leadId: string; nextRevealableLeadId: string | null }
  | { ok: false; message: string }
> {
  let headers: HeadersInit;
  try {
    headers = await requireFirebaseAuthHeaders();
  } catch {
    return { ok: false, message: "กรุณาเข้าสู่ระบบก่อนดำเนินการครับ" };
  }

  const res = await fetch(
    `/api/seller/buyer-leads/${encodeURIComponent(params.leadId)}/outcome`,
    {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ outcome: params.outcome }),
    }
  );

  const json = (await res.json().catch(() => null)) as {
    success?: boolean;
    message?: string;
    data?: { leadId?: string; nextRevealableLeadId?: string | null };
  } | null;

  if (!res.ok || !json?.success || !json.data?.leadId) {
    return { ok: false, message: json?.message || "บันทึกผลการติดต่อไม่สำเร็จ" };
  }

  return {
    ok: true,
    leadId: json.data.leadId,
    nextRevealableLeadId: json.data.nextRevealableLeadId ?? null,
  };
}
