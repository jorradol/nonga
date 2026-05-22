/** คิวรูปอัปโหลดจากเครื่อง — Dealer Paste Import เท่านั้น */

export const PASTE_MAX_IMAGES_TOTAL = 12;
export const PASTE_MAX_UPLOAD_FILE_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const ALLOWED_EXT = /\.(jpe?g|png|webp)$/i;

export interface PasteQueuedUpload {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
}

export type PasteImagePrimaryKey =
  | `link:${string}`
  | `upload:${string}`;

let uploadIdSeq = 0;

export function nextUploadId(): string {
  uploadIdSeq += 1;
  return `paste-up-${Date.now()}-${uploadIdSeq}`;
}

export function isAllowedPasteUploadFile(file: File): string | null {
  const name = file.name.toLowerCase();
  if (!ALLOWED_EXT.test(name) && !ALLOWED_MIME.has(file.type.toLowerCase())) {
    return "ประเภทไฟล์ไม่รองรับ — ใช้ .jpg .jpeg .png .webp เท่านั้น";
  }
  if (file.size > PASTE_MAX_UPLOAD_FILE_BYTES) {
    return `ไฟล์ใหญ่เกิน ${Math.round(PASTE_MAX_UPLOAD_FILE_BYTES / (1024 * 1024))}MB`;
  }
  if (file.size === 0) return "ไฟล์ว่าง";
  return null;
}

export function createQueuedUpload(file: File): PasteQueuedUpload {
  const id = nextUploadId();
  return {
    id,
    file,
    previewUrl: URL.createObjectURL(file),
    name: file.name,
  };
}

export function revokeQueuedUploadPreview(item: PasteQueuedUpload): void {
  try {
    URL.revokeObjectURL(item.previewUrl);
  } catch {
    /* ignore */
  }
}

export async function fileToPasteUploadPayload(
  file: File
): Promise<{ mimeType: string; dataBase64: string; name: string }> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const mime =
    file.type && ALLOWED_MIME.has(file.type.toLowerCase())
      ? file.type
      : "image/jpeg";
  return {
    mimeType: mime,
    dataBase64: btoa(binary),
    name: file.name || "upload.jpg",
  };
}

export function countTotalSelected(
  selectedLinkCount: number,
  selectedUploadCount: number
): number {
  return selectedLinkCount + selectedUploadCount;
}

export function canSelectMore(
  selectedLinkCount: number,
  selectedUploadCount: number
): boolean {
  return (
    countTotalSelected(selectedLinkCount, selectedUploadCount) <
    PASTE_MAX_IMAGES_TOTAL
  );
}
