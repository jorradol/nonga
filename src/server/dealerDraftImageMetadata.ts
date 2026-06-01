import type { ListingImageSetMetadataFields } from "../utils/listingImageSetConsistencyShared.ts";
import type { DealerDraftImageMetadata } from "./dealerDraftInventory.ts";
import type { StoredListingImageMetadata } from "./repositories/imageStorageRepository.ts";

export type DraftImageMetadataSource =
  | "paste-import"
  | "chat-image-attachment-v1"
  | "draft-upload"
  | string;

export interface DraftImageMetadataInput extends ListingImageSetMetadataFields {
  dealerId: string;
  draftId: string;
  fileName?: string;
  imageId?: string;
  originalFileName?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  size?: number;
  imagePath?: string;
  imageUrl?: string;
  publicUrl?: string;
  storagePath?: string;
  thumbnailPath?: string;
  thumbnailUrl?: string;
  createdAt?: string;
  sortOrder?: number;
  source?: DraftImageMetadataSource;
}

/** Resolve display/original name without ever returning undefined for Firestore. */
export function resolveDraftImageOriginalFileName(
  item: DraftImageMetadataInput,
  fallbackName?: string
): string | undefined {
  const candidates = [
    item.originalFileName,
    fallbackName,
    item.fileName,
    item.imageId,
    item.imagePath?.split("/").pop(),
    item.storagePath?.split("/").pop(),
    item.imageUrl?.split("/").pop()?.split("?")[0],
  ];
  for (const candidate of candidates) {
    const text = String(candidate ?? "").trim();
    if (text) return text;
  }
  return undefined;
}

export function mapStoredListingImageToDealerDraftMetadata(
  item: StoredListingImageMetadata,
  draftId: string,
  index: number,
  options: { source?: DraftImageMetadataSource } = {}
): DealerDraftImageMetadata {
  return mapDraftImageMetadataInput(
    {
      dealerId: item.dealerId,
      draftId,
      fileName: item.fileName,
      imageId: item.imageId,
      originalFileName: item.originalFileName,
      mimeType: item.mimeType,
      width: item.width,
      height: item.height,
      size: item.size,
      imagePath: item.imagePath ?? item.storagePath,
      imageUrl: item.imageUrl ?? item.publicUrl,
      storagePath: item.storagePath,
      thumbnailPath: item.thumbnailPath,
      thumbnailUrl: item.thumbnailUrl,
      createdAt: item.createdAt,
      sortOrder: item.sortOrder ?? index,
      source: options.source,
    },
    index
  );
}

export function mapDraftImageMetadataInput(
  item: DraftImageMetadataInput,
  index: number
): DealerDraftImageMetadata {
  const fileName =
    String(item.fileName ?? item.imageId ?? "").trim() ||
    `image-${index + 1}`;
  const originalFileName = resolveDraftImageOriginalFileName(item);
  const record: DealerDraftImageMetadata = {
    dealerId: item.dealerId,
    draftId: item.draftId,
    fileName,
    mimeType: String(item.mimeType ?? "image/jpeg").trim() || "image/jpeg",
    width: Number(item.width) || 0,
    height: Number(item.height) || 0,
    size: Number(item.size) || 0,
    imagePath: String(item.imagePath ?? item.storagePath ?? "").trim(),
    imageUrl: String(item.imageUrl ?? item.publicUrl ?? "").trim(),
    thumbnailPath: String(item.thumbnailPath ?? "").trim(),
    thumbnailUrl: String(item.thumbnailUrl ?? "").trim(),
    createdAt: String(item.createdAt ?? new Date().toISOString()),
    sortOrder: Number.isFinite(item.sortOrder) ? Number(item.sortOrder) : index,
    ...(item.source ? { source: item.source } : {}),
    ...(originalFileName ? { originalFileName } : {}),
    ...(item.hasVehicle !== undefined ? { hasVehicle: item.hasVehicle } : {}),
    ...(item.vehicleConfidence !== undefined
      ? { vehicleConfidence: item.vehicleConfidence }
      : {}),
    ...(item.vehicleImageStatus
      ? { vehicleImageStatus: item.vehicleImageStatus }
      : {}),
    ...(item.vehicleImageReason
      ? { vehicleImageReason: item.vehicleImageReason }
      : {}),
    ...(item.imageRole ? { imageRole: item.imageRole } : {}),
    ...(item.imageSetConsistencyStatus
      ? { imageSetConsistencyStatus: item.imageSetConsistencyStatus }
      : {}),
  };
  return record;
}

export function mapDraftImageMetadataList(
  items: DraftImageMetadataInput[],
  startSortOrder = 0
): DealerDraftImageMetadata[] {
  return items.map((item, offset) =>
    mapDraftImageMetadataInput(item, startSortOrder + offset)
  );
}
