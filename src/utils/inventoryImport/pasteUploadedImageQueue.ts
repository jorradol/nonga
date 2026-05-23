/** คิวรูปอัปโหลดจากเครื่อง — Dealer Paste Import + Draft edit */

export const PASTE_MAX_IMAGES_TOTAL = 12;
export const PASTE_MAX_UPLOAD_FILE_BYTES = 15 * 1024 * 1024;

export const PASTE_UPLOAD_HELP_TEXT =
  "รองรับ JPG, PNG, WEBP สูงสุด 15MB ต่อรูป ระบบจะย่อและบีบอัดให้อัตโนมัติก่อนบันทึก";

export type PasteUploadClientStatus =
  | "pending"
  | "preparing"
  | "converted"
  | "failed"
  | "too_large"
  | "unsupported";

export const PASTE_UPLOAD_STATUS_LABEL: Record<PasteUploadClientStatus, string> = {
  pending: "รออัปโหลด",
  preparing: "กำลังเตรียมรูป",
  converted: "แปลงสำเร็จ",
  failed: "แปลงไม่ได้",
  too_large: "ไฟล์ใหญ่เกินกำหนด",
  unsupported: "ชนิดไฟล์ไม่รองรับ",
};

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const ALLOWED_EXT = /\.(jpe?g|png|webp)$/i;
const HEIC_EXT = /\.(heic|heif)$/i;
const HEIC_MIME = /image\/(heic|heif)/i;

export interface PasteQueuedUpload {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  clientStatus: PasteUploadClientStatus;
  statusMessage: string;
}

export type PasteImagePrimaryKey = `link:${string}` | `upload:${string}`;

let uploadIdSeq = 0;

export function nextUploadId(): string {
  uploadIdSeq += 1;
  return `paste-up-${Date.now()}-${uploadIdSeq}`;
}

export function isHeicUploadFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return HEIC_EXT.test(name) || HEIC_MIME.test(file.type.toLowerCase());
}

export function pasteUploadStatusForFile(file: File): {
  clientStatus: PasteUploadClientStatus;
  statusMessage: string;
  error: string | null;
} {
  if (isHeicUploadFile(file)) {
    return {
      clientStatus: "unsupported",
      statusMessage: PASTE_UPLOAD_STATUS_LABEL.unsupported,
      error: "ไฟล์ HEIC/HEIF ยังไม่รองรับ กรุณาแปลงเป็น JPG ก่อนอัปโหลด",
    };
  }

  if (
    !ALLOWED_EXT.test(file.name.toLowerCase()) &&
    !ALLOWED_MIME.has(file.type.toLowerCase())
  ) {
    return {
      clientStatus: "unsupported",
      statusMessage: PASTE_UPLOAD_STATUS_LABEL.unsupported,
      error: "ประเภทไฟล์ไม่รองรับ — ใช้ .jpg .jpeg .png .webp เท่านั้น",
    };
  }

  if (file.size > PASTE_MAX_UPLOAD_FILE_BYTES) {
    return {
      clientStatus: "too_large",
      statusMessage: PASTE_UPLOAD_STATUS_LABEL.too_large,
      error: `ไฟล์ใหญ่เกิน ${Math.round(PASTE_MAX_UPLOAD_FILE_BYTES / (1024 * 1024))}MB`,
    };
  }

  if (file.size === 0) {
    return {
      clientStatus: "failed",
      statusMessage: PASTE_UPLOAD_STATUS_LABEL.failed,
      error: "ไฟล์ว่าง",
    };
  }

  return {
    clientStatus: "pending",
    statusMessage: PASTE_UPLOAD_STATUS_LABEL.pending,
    error: null,
  };
}

export function isAllowedPasteUploadFile(file: File): string | null {
  return pasteUploadStatusForFile(file).error;
}

export function createQueuedUpload(file: File): PasteQueuedUpload {
  const id = nextUploadId();
  const status = pasteUploadStatusForFile(file);
  return {
    id,
    file,
    previewUrl: URL.createObjectURL(file),
    name: file.name,
    clientStatus: status.clientStatus,
    statusMessage: status.statusMessage,
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
