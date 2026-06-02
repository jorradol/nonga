import { getFirebaseAuthHeaders } from "../auth/firebaseAuthHeaders";

export type ListingReportReason =
  | "incorrect-info"
  | "image-mismatch-or-inappropriate"
  | "suspected-fraud"
  | "duplicate-listing"
  | "contact-unreachable-or-unclear"
  | "other";

export interface ListingReportItem {
  reportId: string;
  listingId: string;
  listingTitle?: string;
  reason: ListingReportReason;
  note?: string;
  reporterUserId?: string;
  reporterRole?: string;
  createdAt: string;
  status: "open" | "reviewed" | "dismissed" | "actioned";
  reviewedBy?: string;
  reviewedAt?: string;
  adminNote?: string;
}

export async function submitListingReport(params: {
  listingId: string;
  reason: ListingReportReason;
  note?: string;
}): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(await getFirebaseAuthHeaders()),
  } as Record<string, string>;
  const res = await fetch(`/api/cars/${encodeURIComponent(params.listingId)}/report`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      reason: params.reason,
      ...(params.note?.trim() ? { note: params.note.trim() } : {}),
    }),
  });
  const json = (await res.json().catch(() => null)) as { success?: boolean; message?: string } | null;
  if (!res.ok || !json?.success) {
    return { ok: false, message: json?.message || "ส่งรายงานไม่สำเร็จ" };
  }
  return { ok: true, message: json.message || "รับรายงานแล้ว" };
}

export async function fetchAdminListingReports(
  status: "open" | "reviewed" | "dismissed" | "actioned" | "all" = "open"
): Promise<ListingReportItem[]> {
  const headers: Record<string, string> = {
    ...(await getFirebaseAuthHeaders()),
  } as Record<string, string>;
  const query = status === "all" ? "" : `?status=${encodeURIComponent(status)}`;
  const res = await fetch(`/api/admin/listing-reports${query}`, { headers });
  const json = (await res.json()) as { success?: boolean; data?: ListingReportItem[]; message?: string };
  if (!res.ok || !json.success || !Array.isArray(json.data)) {
    throw new Error(json.message || "โหลดรายงานไม่สำเร็จ");
  }
  return json.data;
}

export async function updateAdminListingReport(params: {
  reportId: string;
  action: "reviewed" | "dismiss" | "hide";
  adminNote?: string;
}): Promise<ListingReportItem> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(await getFirebaseAuthHeaders()),
  } as Record<string, string>;
  const res = await fetch(`/api/admin/listing-reports/${encodeURIComponent(params.reportId)}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      action: params.action,
      ...(params.adminNote?.trim() ? { adminNote: params.adminNote.trim() } : {}),
    }),
  });
  const json = (await res.json()) as { success?: boolean; data?: ListingReportItem; message?: string };
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.message || "อัปเดตรายงานไม่สำเร็จ");
  }
  return json.data;
}

