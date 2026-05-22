import type { ImageLinkCandidate } from "./imageLinkExtractor";
import type { PasteImagePrimaryKey, PasteQueuedUpload } from "./pasteUploadedImageQueue";
import type { PasteImagePreviewResult } from "./pasteImagePreview";

export interface PasteImageSelectionState {
  candidates: ImageLinkCandidate[];
  previews: PasteImagePreviewResult[];
  selectedSourceUrls: Set<string>;
  uploads: PasteQueuedUpload[];
  selectedUploadIds: Set<string>;
  primaryKey: PasteImagePrimaryKey | null;
  probing: boolean;
  uploadWarnings: string[];
}

export type { PasteImagePrimaryKey } from "./pasteUploadedImageQueue";

export function linkPrimaryKey(sourceUrl: string): PasteImagePrimaryKey {
  return `link:${sourceUrl}`;
}

export function uploadPrimaryKey(uploadId: string): PasteImagePrimaryKey {
  return `upload:${uploadId}`;
}

/** จัดลำดับรูปใน storage ให้ primary อยู่ตำแหน่งแรก */
export function orderStoredImagesWithPrimary(
  urls: string[],
  primaryUrl?: string
): string[] {
  if (!primaryUrl || !urls.includes(primaryUrl)) return urls;
  return [primaryUrl, ...urls.filter((u) => u !== primaryUrl)];
}

export function resolvePrimaryStoredUrl(
  primaryKey: PasteImagePrimaryKey | null,
  linkStoredUrls: string[],
  uploadIdToUrl: Map<string, string>
): string | undefined {
  if (primaryKey?.startsWith("upload:")) {
    return uploadIdToUrl.get(primaryKey.slice(7));
  }
  if (primaryKey?.startsWith("link:")) {
    return linkStoredUrls[0];
  }
  return linkStoredUrls[0] ?? [...uploadIdToUrl.values()][0];
}

export function mergeLinkAndUploadStoredUrls(
  linkStoredUrls: string[],
  uploadStoredUrls: string[],
  primaryKey: PasteImagePrimaryKey | null,
  uploadIdToUrl: Map<string, string>
): string[] {
  const merged = [...linkStoredUrls, ...uploadStoredUrls];
  const primary = resolvePrimaryStoredUrl(
    primaryKey,
    linkStoredUrls,
    uploadIdToUrl
  );
  return orderStoredImagesWithPrimary(merged, primary);
}
