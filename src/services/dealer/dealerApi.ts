import type {
  ImportCommitResult,
  ImportOwnerContext,
  MarketplaceImportPayload,
} from "../../utils/inventoryImport/import/types";
import { dealerAuthHeaders } from "../../utils/apiAuthHeaders";

export interface DealerApiHeaders {
  dealerId: string;
  role: string;
}

function headers(h: DealerApiHeaders): HeadersInit {
  return dealerAuthHeaders(h.dealerId, h.role);
}

export interface DealerInventoryCar {
  id: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  images: string[];
  listingStatus?: string;
  isSold: boolean;
  createdAt: string;
  dealerId?: string;
  duplicateStatus?: string;
  duplicateScore?: number;
  duplicateGroupId?: string;
  duplicateMatches?: { id: string; score: number; source: string }[];
}

export interface DealerDraftRecord {
  id: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  images: string[];
  missingFields: string[];
  warnings: string[];
  confidenceScore: number;
  status: "draft" | "needs_review";
  duplicateStatus?: string;
  duplicateScore?: number;
  duplicateMatches?: { id: string; score: number; source: string }[];
}

export interface DealerDashboardStats {
  published: number;
  hidden: number;
  draft: number;
  needsReview: number;
  noImages: number;
  possibleDuplicates?: number;
  confirmedDuplicates?: number;
  draftDuplicates?: number;
}

export interface DealerProfile {
  dealerId: string;
  showroomName: string;
  ownerName: string;
  phone: string;
  address: string;
  logoUrl?: string;
  businessHours?: string;
  lineId?: string;
  facebook?: string;
  tiktok?: string;
  website?: string;
}

export async function fetchDealerDashboard(
  h: DealerApiHeaders
): Promise<DealerDashboardStats> {
  const res = await fetch("/api/dealer/dashboard", { headers: headers(h) });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message ?? "โหลด dashboard ล้มเหลว");
  return body.data;
}

export async function fetchDealerInventory(
  h: DealerApiHeaders,
  q?: string
): Promise<DealerInventoryCar[]> {
  const params = q ? `?q=${encodeURIComponent(q)}` : "";
  const res = await fetch(`/api/dealer/inventory${params}`, {
    headers: headers(h),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message ?? "โหลด inventory ล้มเหลว");
  return body.data;
}

export async function patchDealerInventory(
  h: DealerApiHeaders,
  id: string,
  patch: Partial<DealerInventoryCar>
): Promise<DealerInventoryCar> {
  const res = await fetch(`/api/dealer/inventory/${id}`, {
    method: "PATCH",
    headers: headers(h),
    body: JSON.stringify(patch),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message ?? "บันทึกไม่สำเร็จ");
  return body.data;
}

export async function deleteDealerInventory(
  h: DealerApiHeaders,
  id: string
): Promise<void> {
  const res = await fetch(`/api/dealer/inventory/${id}`, {
    method: "DELETE",
    headers: headers(h),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message ?? "ลบไม่สำเร็จ");
}

export async function hideDealerInventory(
  h: DealerApiHeaders,
  id: string,
  hidden: boolean
): Promise<DealerInventoryCar> {
  const res = await fetch(`/api/dealer/inventory/${id}/visibility`, {
    method: "PATCH",
    headers: headers(h),
    body: JSON.stringify({ hidden }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message ?? "อัปเดตสถานะไม่สำเร็จ");
  return body.data;
}

export async function fetchDealerDrafts(
  h: DealerApiHeaders
): Promise<DealerDraftRecord[]> {
  const res = await fetch("/api/dealer/drafts", { headers: headers(h) });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message ?? "โหลด drafts ล้มเหลว");
  return body.data;
}

export async function patchDealerDraft(
  h: DealerApiHeaders,
  id: string,
  patch: Record<string, unknown>
): Promise<DealerDraftRecord> {
  const res = await fetch(`/api/dealer/drafts/${id}`, {
    method: "PATCH",
    headers: headers(h),
    body: JSON.stringify(patch),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message ?? "บันทึก draft ไม่สำเร็จ");
  return body.data;
}

export class PublishDraftBlockedError extends Error {
  readonly code = "missing_required_fields";
  readonly missingFields: string[];
  readonly missingLabelsThai: string[];

  constructor(
    message: string,
    missingFields: string[],
    missingLabelsThai: string[]
  ) {
    super(message);
    this.name = "PublishDraftBlockedError";
    this.missingFields = missingFields;
    this.missingLabelsThai = missingLabelsThai;
  }
}

export async function publishDealerDraft(
  h: DealerApiHeaders,
  id: string
): Promise<DealerInventoryCar> {
  const res = await fetch(`/api/dealer/drafts/${id}/publish`, {
    method: "POST",
    headers: headers(h),
  });
  const body = await res.json();
  if (!res.ok) {
    if (body.error === "missing_required_fields") {
      throw new PublishDraftBlockedError(
        body.message ?? "กรุณาเติมข้อมูลจำเป็นให้ครบก่อนส่งรถคันนี้เข้าตลาด",
        body.missingFields ?? [],
        body.missingLabelsThai ?? []
      );
    }
    throw new Error(body.message ?? body.error ?? "Publish ล้มเหลว");
  }
  return body.data;
}

export async function fetchDealerProfile(
  h: DealerApiHeaders
): Promise<DealerProfile> {
  const res = await fetch("/api/dealer/profile", { headers: headers(h) });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message ?? "โหลด profile ล้มเหลว");
  return body.data;
}

export async function patchDealerProfile(
  h: DealerApiHeaders,
  patch: Partial<DealerProfile>
): Promise<DealerProfile> {
  const res = await fetch("/api/dealer/profile", {
    method: "PATCH",
    headers: headers(h),
    body: JSON.stringify(patch),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message ?? "บันทึก profile ไม่สำเร็จ");
  return body.data;
}

export async function commitDealerImport(
  h: DealerApiHeaders,
  published: MarketplaceImportPayload[],
  drafts: MarketplaceImportPayload[],
  owner: ImportOwnerContext
): Promise<ImportCommitResult> {
  const res = await fetch("/api/dealer/import/commit", {
    method: "POST",
    headers: headers(h),
    body: JSON.stringify({ published, drafts, owner }),
  });
  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new Error(body.message ?? "นำเข้าล้มเหลว");
  }
  return body;
}
