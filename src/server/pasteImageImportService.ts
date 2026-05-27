import fs from "fs";
import path from "path";
import { getListingImagesRoot } from "./listingImageStorage";
import { processListingImageUpload } from "./listingImageProcessor";
import {
  createImageStorageRepository,
  type ListingImageTargetType,
} from "./repositories/imageStorageRepository";
import {
  extractImageLinkCandidates,
  type ImageLinkCandidate,
} from "../utils/inventoryImport/imageLinkExtractor";
import {
  isAllowedPreviewUrl,
  probeImagePreview,
  resolveFetchUrlForCandidate,
  type PasteImagePreviewResult,
} from "../utils/inventoryImport/pasteImagePreview";
import type { ParsedPasteVehicle } from "../utils/inventoryImport/pasteRawVehicleTypes";

const PREVIEW_PROXY_TIMEOUT_MS = 12_000;
const SAFE_LISTING_ID = /^(?:draft(?:-import-[0-9]+-d\d+|-[0-9]+)|car-[0-9]+)$/;

export interface SelectedImageImportResult {
  storedUrls: string[];
  thumbnails: string[];
  primaryImage?: string;
  failed: { sourceUrl: string; error: string }[];
  warnings: string[];
}

export function createThumbnailSiblingFiles(
  listingId: string,
  storedMainUrls: string[]
): string[] {
  const root = getListingImagesRoot();
  const thumbs: string[] = [];

  for (const storedUrl of storedMainUrls) {
    if (!storedUrl.startsWith(`/storage/listings/${listingId}/`)) continue;
    const filename = storedUrl.split("/").pop() ?? "";
    const carDir = path.join(root, listingId);
    const mainPath = path.join(carDir, filename);
    if (!fs.existsSync(mainPath)) continue;

    const thumbName = filename.startsWith("thumb-")
      ? filename
      : `thumb-${filename}`;
    const thumbPath = path.join(carDir, thumbName);
    if (!fs.existsSync(thumbPath)) {
      fs.copyFileSync(mainPath, thumbPath);
    }
    thumbs.push(`/storage/listings/${listingId}/${thumbName}`);
  }

  return thumbs;
}

export async function probePasteImageCandidates(
  candidates: ImageLinkCandidate[]
): Promise<PasteImagePreviewResult[]> {
  const results: PasteImagePreviewResult[] = [];
  for (const c of candidates) {
    results.push(await probeImagePreview(c));
  }
  return results;
}

export async function fetchPreviewProxy(
  url: string
): Promise<{ ok: true; buffer: Buffer; contentType: string } | { ok: false; status: number; message: string }> {
  if (!isAllowedPreviewUrl(url)) {
    return { ok: false, status: 400, message: "URL ไม่ได้รับอนุญาต" };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PREVIEW_PROXY_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "NongA-PasteImagePreview/1.0",
        Accept: "image/*",
      },
      redirect: "follow",
    });
    clearTimeout(timer);

    if (!res.ok) {
      return { ok: false, status: res.status, message: `HTTP ${res.status}` };
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length === 0) {
      return { ok: false, status: 502, message: "ไฟล์ว่าง" };
    }
    const contentType =
      res.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
    return { ok: true, buffer, contentType };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "โหลดไม่สำเร็จ";
    return { ok: false, status: 502, message: msg };
  }
}

export async function importSelectedPasteImages(
  listingId: string,
  candidates: ImageLinkCandidate[],
  selectedSourceUrls: string[],
  primarySourceUrl?: string,
  dealerId = "legacy-dealer"
): Promise<SelectedImageImportResult> {
  if (!SAFE_LISTING_ID.test(listingId)) {
    return {
      storedUrls: [],
      thumbnails: [],
      failed: [],
      warnings: ["รหัสประกาศไม่ถูกต้องสำหรับบันทึกรูป"],
    };
  }

  const selected = new Set(selectedSourceUrls);
  const fetchUrls: string[] = [];
  const sourceByFetch = new Map<string, string>();

  for (const c of candidates) {
    if (!selected.has(c.sourceUrl)) continue;
    const fetchUrl = resolveFetchUrlForCandidate(c);
    fetchUrls.push(fetchUrl);
    sourceByFetch.set(fetchUrl, c.sourceUrl);
  }

  const warnings: string[] = [];
  const failed: { sourceUrl: string; error: string }[] = [];

  if (fetchUrls.length === 0) {
    return {
      storedUrls: [],
      thumbnails: [],
      failed: [],
      warnings: ["ยังไม่มีรูปภาพสำหรับประกาศ"],
    };
  }

  const imageStorage = createImageStorageRepository();
  const targetType: ListingImageTargetType = listingId.startsWith("draft-")
    ? "draft"
    : "listing";
  let storedUrls: string[] = [];
  const thumbnails: string[] = [];
  const storedBySource = new Map<string, string>();

  for (const fetchUrl of fetchUrls) {
    const original = sourceByFetch.get(fetchUrl) ?? fetchUrl;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), PREVIEW_PROXY_TIMEOUT_MS);
      const res = await fetch(fetchUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "NongA-PasteImageImport/1.0",
          Accept: "image/*",
        },
        redirect: "follow",
      });
      clearTimeout(timer);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const mimeType =
        res.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
      if (!mimeType.startsWith("image/")) {
        throw new Error(`ไม่ใช่ไฟล์รูป (${mimeType})`);
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      const processed = await processListingImageUpload(buffer, mimeType, original);
      if (processed.ok === false) {
        throw new Error(processed.error);
      }
      const saved = await imageStorage.uploadListingImagePair(
        dealerId,
        listingId,
        {
          mainBuffer: processed.data.mainBuffer,
          thumbBuffer: processed.data.thumbBuffer,
          ext: processed.data.mainExt,
          mimeType:
            processed.data.mainExt === ".webp" ? "image/webp" : "image/jpeg",
          width: processed.data.mainWidth,
          height: processed.data.mainHeight,
          originalFileName: original.split("/").pop() || "paste-image",
          seed: original,
          sortOrder: storedUrls.length,
          targetType,
        }
      );
      storedUrls.push(saved.storedUrl);
      storedBySource.set(original, saved.storedUrl);
      if (saved.thumbnailUrl) thumbnails.push(saved.thumbnailUrl);
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : "ล้มเหลว";
      failed.push({ sourceUrl: original, error });
      warnings.push(`รูปบางรายการโหลดไม่ได้: ${original.slice(0, 80)}`);
    }
  }

  let primaryImage: string | undefined;
  if (primarySourceUrl) {
    primaryImage = storedBySource.get(primarySourceUrl);
  }
  if (!primaryImage && storedUrls.length > 0) {
    primaryImage = storedUrls[0];
    const rest = storedUrls.filter((u) => u !== primaryImage);
    storedUrls = primaryImage ? [primaryImage, ...rest] : storedUrls;
  }

  if (failed.length > 0) {
    warnings.push(
      `โหลดรูปสำเร็จ ${storedUrls.length}/${fetchUrls.length} รูป — Draft ยังบันทึกได้`
    );
  }

  return {
    storedUrls,
    thumbnails,
    primaryImage,
    failed,
    warnings,
  };
}

export function buildCandidatesFromPaste(
  parsed: ParsedPasteVehicle,
  imageLinksText?: string
): ImageLinkCandidate[] {
  return extractImageLinkCandidates(parsed, imageLinksText);
}
