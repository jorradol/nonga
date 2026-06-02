import type { MarketplaceCarRecord } from "./marketplaceInventory";
import type { ListingReportStatus } from "./repositories/listingReportRepository";

export function buildListingPatchForNewReport(
  openReports: number
): Partial<MarketplaceCarRecord> {
  return {
    moderationStatus: "under_review",
    reportOpenCount: openReports,
  };
}

export function buildListingPatchForAdminReportAction(params: {
  action: "reviewed" | "dismiss" | "hide";
  nextStatus: ListingReportStatus;
  openReports: number;
  reviewedAt: string;
  reviewer: string;
  adminNote?: string;
}): Partial<MarketplaceCarRecord> {
  const patch: Partial<MarketplaceCarRecord> = {
    reportOpenCount: params.openReports,
    moderationStatus:
      params.nextStatus === "dismissed" && params.openReports === 0
        ? "none"
        : "under_review",
  };
  if (params.action === "hide") {
    patch.listingStatus = "hidden";
    patch.moderationStatus = "actioned";
    patch.adminHiddenAt = params.reviewedAt;
    patch.adminHiddenBy = params.reviewer;
    patch.adminHiddenReason = params.adminNote || "reported-listing";
  }
  return patch;
}
