import type { ListingReportReason } from "../services/listings/listingReportApi";

export const LISTING_REPORT_REASON_LABELS: Record<ListingReportReason, string> = {
  "incorrect-info": "ข้อมูลไม่ถูกต้อง",
  "image-mismatch-or-inappropriate": "รูปไม่ตรงหรือไม่เหมาะสม",
  "suspected-fraud": "สงสัยทุจริต",
  "duplicate-listing": "ประกาศซ้ำ",
  "contact-unreachable-or-unclear": "ติดต่อไม่ได้หรือไม่ชัด",
  other: "อื่นๆ",
};

export const LISTING_REPORT_STATUS_LABELS: Record<
  "open" | "reviewed" | "dismissed" | "actioned",
  string
> = {
  open: "เปิดอยู่",
  reviewed: "ตรวจแล้ว",
  dismissed: "ยกเลิกแล้ว",
  actioned: "ดำเนินการแล้ว (ซ่อนประกาศ)",
};

export function formatListingReportReason(reason: ListingReportReason): string {
  return LISTING_REPORT_REASON_LABELS[reason] ?? reason;
}

export function formatListingReportStatus(
  status: "open" | "reviewed" | "dismissed" | "actioned"
): string {
  return LISTING_REPORT_STATUS_LABELS[status] ?? status;
}
