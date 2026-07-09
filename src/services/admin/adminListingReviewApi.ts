/**
 * v22.34 — Admin pending listing review (browser UI).
 * Uses Firebase session headers — no owner token paste required.
 */
import { getFirebaseAuthHeaders } from "../auth/firebaseAuthHeaders";

export interface AdminPendingListingItem {
  id: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  mileage?: number;
  images?: string[];
  listingStatus?: string;
  showroomName?: string;
  ownerName?: string;
  dealerId?: string;
  createdAt?: string;
  description?: string;
}

async function adminHeaders(): Promise<Record<string, string>> {
  return {
    "Content-Type": "application/json",
    ...((await getFirebaseAuthHeaders()) as Record<string, string>),
  };
}

export async function fetchAdminPendingListings(): Promise<
  AdminPendingListingItem[]
> {
  const res = await fetch("/api/admin/listings/pending-review", {
    headers: await adminHeaders(),
  });
  const json = (await res.json().catch(() => null)) as {
    success?: boolean;
    data?: AdminPendingListingItem[];
    message?: string;
  } | null;
  if (!res.ok || !json?.success || !Array.isArray(json.data)) {
    throw new Error(json?.message || "โหลดคิวรออนุมัติไม่สำเร็จ");
  }
  return json.data;
}

export async function approveAdminPendingListing(
  listingId: string
): Promise<AdminPendingListingItem> {
  const res = await fetch(
    `/api/admin/listings/${encodeURIComponent(listingId)}/approve`,
    {
      method: "POST",
      headers: await adminHeaders(),
    }
  );
  const json = (await res.json().catch(() => null)) as {
    success?: boolean;
    data?: AdminPendingListingItem;
    message?: string;
  } | null;
  if (!res.ok || !json?.success || !json.data) {
    throw new Error(json?.message || "อนุมัติประกาศไม่สำเร็จ");
  }
  return json.data;
}

/** Hold = hide from marketplace; remains non-public (reject-lite). */
export async function holdAdminPendingListing(
  listingId: string
): Promise<AdminPendingListingItem> {
  const res = await fetch(
    `/api/admin/listings/${encodeURIComponent(listingId)}/hold`,
    {
      method: "POST",
      headers: await adminHeaders(),
    }
  );
  const json = (await res.json().catch(() => null)) as {
    success?: boolean;
    data?: AdminPendingListingItem;
    message?: string;
  } | null;
  if (!res.ok || !json?.success || !json.data) {
    throw new Error(json?.message || "พักประกาศไม่สำเร็จ");
  }
  return json.data;
}
