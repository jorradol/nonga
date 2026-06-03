/**
 * v5.6E — Client API for seller masked buyer lead queue.
 */

import { requireFirebaseAuthHeaders } from "../auth/firebaseAuthHeaders";
import type { SellerMaskedQueueEntry, SellerSkipReason } from "./leadTypes";

export async function fetchSellerMaskedLeadQueue(
  listingId: string
): Promise<
  | { ok: true; entries: SellerMaskedQueueEntry[]; interestCount: number }
  | { ok: false; status: number; message: string }
> {
  let headers: HeadersInit;
  try {
    headers = await requireFirebaseAuthHeaders();
  } catch {
    return { ok: false, status: 401, message: "กรุณาเข้าสู่ระบบก่อนดูคิวผู้สนใจครับ" };
  }

  const [queueRes, statsRes] = await Promise.all([
    fetch(`/api/seller/listings/${encodeURIComponent(listingId)}/buyer-lead-queue`, {
      headers,
      cache: "no-store",
    }),
    fetch(`/api/listings/${encodeURIComponent(listingId)}/interest-queue-stats`, {
      cache: "no-store",
    }),
  ]);

  const queueJson = (await queueRes.json().catch(() => null)) as {
    success?: boolean;
    message?: string;
    data?: SellerMaskedQueueEntry[];
  } | null;

  if (!queueRes.ok || !queueJson?.success || !Array.isArray(queueJson.data)) {
    return {
      ok: false,
      status: queueRes.status,
      message: queueJson?.message || "โหลดคิวผู้สนใจไม่สำเร็จ",
    };
  }

  let interestCount = queueJson.data.length;
  const statsJson = (await statsRes.json().catch(() => null)) as {
    success?: boolean;
    data?: { interestCount?: number };
  } | null;
  if (statsRes.ok && statsJson?.success && statsJson.data) {
    const n = statsJson.data.interestCount;
    if (typeof n === "number" && n >= 0) interestCount = n;
  }

  return { ok: true, entries: queueJson.data, interestCount };
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
