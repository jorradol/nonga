import type { ParsedPasteVehicle } from "./pasteRawVehicleTypes";
import { DRIVE_FOLDER_AUTO_FETCH_WARNING } from "./googleDrivePermissionGuidance";

const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif)(\?|#|$)/i;
const MAX_CANDIDATES = 12;

export type ImageLinkKind = "direct" | "drive_file" | "drive_folder";

export interface ImageLinkCandidate {
  id: string;
  sourceUrl: string;
  kind: ImageLinkKind;
  /** URL สำหรับ preview / download (Drive แปลงเป็น uc) */
  previewUrl: string;
  label: string;
}

function hashId(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return `img-${Math.abs(h)}`;
}

export function isDirectImageUrl(url: string): boolean {
  return IMAGE_EXT_RE.test(url.trim().toLowerCase());
}

export function isYoutubeOrTiktokOrWebsiteProduct(url: string): boolean {
  const low = url.toLowerCase();
  if (low.includes("youtube.com") || low.includes("youtu.be")) return true;
  if (low.includes("tiktok.com")) return true;
  if (low.includes("thorautocar.com")) return true;
  return false;
}

export function parseGoogleDriveFileId(url: string): string | null {
  const m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m1) return m1[1];
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m2 && url.includes("drive.google.com")) return m2[1];
  return null;
}

export function parseGoogleDriveFolderId(url: string): string | null {
  const m = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

export function googleDriveFileDownloadUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

export function googleDriveFileViewUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

export function classifyDriveUrl(url: string): ImageLinkKind | null {
  if (!url.includes("drive.google.com")) return null;
  if (parseGoogleDriveFolderId(url)) return "drive_folder";
  if (parseGoogleDriveFileId(url)) return "drive_file";
  return null;
}

function splitLines(text: string): string[] {
  return text
    .split(/[\n\r,;]+/)
    .map((s) => s.trim())
    .filter((u) => /^https?:\/\//i.test(u));
}

/** แยก drive folder ออกจาก drive file สำหรับ warning (ไม่เปลี่ยน parser หลัก) */
export function splitDriveLinks(driveLinks: string[]): {
  driveFolderLinks: string[];
  driveFileLinks: string[];
} {
  const driveFolderLinks: string[] = [];
  const driveFileLinks: string[] = [];
  for (const url of driveLinks) {
    const kind = classifyDriveUrl(url);
    if (kind === "drive_folder") driveFolderLinks.push(url);
    else if (kind === "drive_file") driveFileLinks.push(url);
    else driveFileLinks.push(url);
  }
  return { driveFolderLinks, driveFileLinks };
}

/**
 * รวบรวม candidate รูปจาก parse result + ช่องลิงก์ใน form
 * ไม่รวม YouTube / TikTok / website
 */
export function extractImageLinkCandidates(
  parsed: ParsedPasteVehicle,
  imageLinksText?: string,
  driveLinksText?: string
): ImageLinkCandidate[] {
  const seen = new Set<string>();
  const out: ImageLinkCandidate[] = [];

  const add = (url: string, kind: ImageLinkKind, label: string, previewUrl: string) => {
    const clean = url.trim();
    if (!clean || seen.has(clean) || isYoutubeOrTiktokOrWebsiteProduct(clean)) return;
    seen.add(clean);
    out.push({
      id: hashId(clean),
      sourceUrl: clean,
      kind,
      previewUrl,
      label,
    });
  };

  for (const url of parsed.links.imageSourceUrls) {
    if (isDirectImageUrl(url)) {
      add(url, "direct", "รูปตรง (direct)", url);
    }
  }

  for (const url of splitLines(imageLinksText ?? "")) {
    if (isDirectImageUrl(url)) {
      add(url, "direct", "รูปตรง (direct)", url);
    }
  }

  const allDriveLinks = [
    ...parsed.links.driveLinks,
    ...splitLines(driveLinksText ?? ""),
  ];
  const { driveFileLinks } = splitDriveLinks(allDriveLinks);
  for (const url of driveFileLinks) {
    const fileId = parseGoogleDriveFileId(url);
    if (fileId) {
      add(
        url,
        "drive_file",
        "Google Drive (ไฟล์)",
        googleDriveFileViewUrl(fileId)
      );
    }
  }

  return out.slice(0, MAX_CANDIDATES);
}

export function driveFolderWarnings(driveLinks: string[]): string[] {
  const { driveFolderLinks } = splitDriveLinks(driveLinks);
  if (driveFolderLinks.length === 0) return [];
  return [DRIVE_FOLDER_AUTO_FETCH_WARNING];
}
