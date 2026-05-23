import {
  PASTE_MAX_IMAGES_TOTAL,
  type PasteQueuedUpload,
} from "../inventoryImport/pasteUploadedImageQueue";
import { orderStoredImagesWithPrimary } from "../inventoryImport/pasteImageSelectionState";

export { PASTE_MAX_IMAGES_TOTAL as DRAFT_MAX_IMAGES };

export function orderDraftImagesWithPrimary(
  urls: string[],
  primaryUrl?: string | null
): string[] {
  return orderStoredImagesWithPrimary(urls, primaryUrl ?? undefined);
}

export function countDraftEditImages(
  storedUrls: string[],
  pendingUploads: PasteQueuedUpload[]
): number {
  return storedUrls.length + pendingUploads.length;
}

export function canAddDraftImages(
  storedUrls: string[],
  pendingUploads: PasteQueuedUpload[],
  addCount = 1
): boolean {
  return (
    countDraftEditImages(storedUrls, pendingUploads) + addCount <=
    PASTE_MAX_IMAGES_TOTAL
  );
}

export function resolveDraftPrimaryUrl(
  storedUrls: string[],
  primaryStoredUrl: string | null,
  primaryPendingId: string | null,
  pendingIdToUrl: Map<string, string>
): string | undefined {
  if (primaryPendingId) {
    const fromPending = pendingIdToUrl.get(primaryPendingId);
    if (fromPending) return fromPending;
  }
  if (primaryStoredUrl && storedUrls.includes(primaryStoredUrl)) {
    return primaryStoredUrl;
  }
  return storedUrls[0];
}

export function mergeUploadedPendingUrls(
  storedUrls: string[],
  pendingUploads: PasteQueuedUpload[],
  uploadedUrls: string[]
): { urls: string[]; pendingIdToUrl: Map<string, string> } {
  const pendingIdToUrl = new Map<string, string>();
  pendingUploads.forEach((p, i) => {
    if (uploadedUrls[i]) pendingIdToUrl.set(p.id, uploadedUrls[i]);
  });
  const urls = [...storedUrls, ...uploadedUrls];
  return { urls, pendingIdToUrl };
}
