import type { ImageLinkKind } from "./imageLinkExtractor";
import type { PasteImagePreviewStatus } from "./pasteImagePreview";

/** ข้อความหลักเมื่อ preview จาก Drive ไม่ขึ้น */
export const DRIVE_PREVIEW_PERMISSION_MESSAGE =
  "รูปจาก Google Drive ยังไม่สามารถแสดงได้ อาจเป็นเพราะยังไม่ได้ตั้งค่าสิทธิ์แชร์ กรุณาตั้งค่าเป็น 'ทุกคนที่มีลิงก์สามารถดูได้' แล้วกดตรวจรูปอีกครั้ง";

export const DRIVE_FOLDER_AUTO_FETCH_WARNING =
  "ลิงก์นี้เป็น Google Drive folder ระบบยังไม่สามารถดึงรูปทั้งหมดอัตโนมัติได้ กรุณาใช้ลิงก์รูปโดยตรง หรืออัปโหลดรูปภายหลัง";

export const DRIVE_SHARE_STEPS: string[] = [
  "เปิดลิงก์ Google Drive",
  "กด Share / แชร์",
  "เปลี่ยน General access เป็น Anyone with the link / ทุกคนที่มีลิงก์",
  "ตั้งสิทธิ์เป็น Viewer / ผู้มีสิทธิ์ดู",
  "กลับมากด \"ตรวจรูปอีกครั้ง\"",
];

export const PREVIEW_STATUS_LABELS: Record<
  PasteImagePreviewStatus | "pending",
  string
> = {
  pending: "รอดาวน์โหลด",
  ok: "แสดงตัวอย่างได้",
  failed: "โหลดไม่ได้",
  needs_permission: "ต้องตั้งค่าสิทธิ์แชร์",
  unsupported: "ไม่รองรับอัตโนมัติ",
};

/** แปลงผล probe ของไฟล์ Drive ที่ล้มเหลว → แนะนำเรื่องสิทธิ์แชร์ */
export function normalizeDriveFileProbeStatus(
  kind: ImageLinkKind,
  status: PasteImagePreviewStatus
): PasteImagePreviewStatus {
  if (kind !== "drive_file") return status;
  if (status === "ok" || status === "unsupported") return status;
  return "needs_permission";
}

export function isDrivePermissionProbeStatus(
  kind: ImageLinkKind,
  status: PasteImagePreviewStatus
): boolean {
  return kind === "drive_file" && status === "needs_permission";
}

export function classifyHttpProbeForDrive(
  kind: ImageLinkKind,
  httpStatus: number,
  contentType: string | null
): PasteImagePreviewStatus | null {
  if (kind !== "drive_file") return null;
  if (httpStatus === 401 || httpStatus === 403) return "needs_permission";
  const ct = (contentType ?? "").toLowerCase();
  if (ct.includes("text/html")) return "needs_permission";
  return null;
}

export function firstDriveFileLinkForPermission(
  driveLinks: string[]
): string | null {
  for (const url of driveLinks) {
    if (
      url.includes("drive.google.com") &&
      url.includes("/file/") &&
      !url.includes("/folders/")
    ) {
      return url;
    }
  }
  return driveLinks.find((u) => u.includes("drive.google.com")) ?? null;
}
