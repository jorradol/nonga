import type { RowValidationStatus } from "../cleaning/types";
import type { ImportDisposition } from "../importConfidence";
import type { NormalizedInventoryRow } from "../inventoryImportSchema";

/** Payload สำหรับ POST /api/admin/inventory-import/commit — ตรงกับ MarketplaceCarRecord */
export interface MarketplaceImportPayload {
  sourceRowIndex: number;
  importStatus: "valid" | "warning";
  title: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  type: "new" | "used" | "ev" | "luxury" | "motorcycle";
  condition: string;
  mileage: number;
  fuelType: string;
  /** URL ภายนอกจาก CSV — เซิร์ฟเวอร์จะดาวน์โหลดเข้า storage */
  sourceImageUrls?: string[];
  images: string[];
  description: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  showroomName?: string;
  disposition?: ImportDisposition;
  confidenceScore?: number;
  missingFields?: string[];
  rawRow?: Record<string, string>;
  warnings?: string[];
  /** Paste import: รหัส Draft ที่จองไว้ก่อนดาวน์โหลดรูป */
  commitDraftId?: string;
  /** Paste: ห้ามดาวน์โหลดรูปจาก sourceImageUrls อัตโนมัติ */
  skipSourceImageDownload?: boolean;
}

export interface ImportOwnerContext {
  dealerId: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  showroomName?: string;
  address?: string;
}

export interface ImageDownloadItemResult {
  sourceUrl: string;
  status: "ok" | "failed";
  storedUrl?: string;
  error?: string;
}

export interface RowImageDownloadReport {
  sourceRowIndex: number;
  carId: string;
  totalUrls: number;
  downloaded: number;
  failed: number;
  storedUrls: string[];
  items: ImageDownloadItemResult[];
  warnings: string[];
}

export interface BulkImageDownloadSummary {
  totalSourceUrls: number;
  downloaded: number;
  failed: number;
  carsWithoutImages: number;
  rows: RowImageDownloadReport[];
}

export interface PreparedImportRow {
  sourceRowIndex: number;
  importStatus: "valid" | "warning";
  payload: MarketplaceImportPayload;
  previewTitle: string;
}

export interface SkippedImportRow {
  sourceRowIndex: number;
  status: RowValidationStatus;
  reason: string;
  previewTitle: string;
}

export interface ImportPreparationSummary {
  totalRows: number;
  importableCount: number;
  skippedErrorCount: number;
  validImportCount: number;
  warningImportCount: number;
  rowsToImport: PreparedImportRow[];
  skippedRows: SkippedImportRow[];
}

export interface SmartPreparedRow {
  sourceRowIndex: number;
  confidenceScore: number;
  disposition: ImportDisposition;
  missingFields: string[];
  previewTitle: string;
  warnings: string[];
  rawRow: Record<string, string>;
  importStatus?: "valid" | "warning";
  payload: MarketplaceImportPayload | null;
  reason?: string;
}

export interface SmartImportPreparationSummary {
  totalRows: number;
  readyToPublish: SmartPreparedRow[];
  draftRows: SmartPreparedRow[];
  needsReview: SmartPreparedRow[];
  rejected: SmartPreparedRow[];
  forbiddenRawColumns: string[];
  importableCount: number;
  publishedCount: number;
  draftCount: number;
  needsReviewCount: number;
  rejectedCount: number;
}

export interface ImportCommitResult {
  success: boolean;
  importedCount: number;
  publishedCount?: number;
  draftCount?: number;
  skippedCount: number;
  warningCount: number;
  errorCount: number;
  imported: {
    id: string;
    title: string;
    sourceRowIndex: number;
    imageDownloaded?: number;
    imageFailed?: number;
    bucket?: "published" | "draft";
  }[];
  drafts?: {
    id: string;
    title: string;
    sourceRowIndex: number;
    status: string;
    confidenceScore: number;
  }[];
  failed: { sourceRowIndex: number; message: string }[];
  imageStats?: BulkImageDownloadSummary;
  rowWarnings?: { sourceRowIndex: number; warnings: string[] }[];
  duplicateWarnings?: {
    id: string;
    bucket: string;
    warnings: string[];
  }[];
  message?: string;
}
