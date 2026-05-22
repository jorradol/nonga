import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import { devMarketplaceLog } from "./marketplaceInventory";

const LISTING_IMAGES_ROOT = path.resolve(process.cwd(), "data/listing-images");
const MAX_IMAGES_PER_CAR = 12;
const DOWNLOAD_TIMEOUT_MS = 25_000;
const MAX_BYTES = 8 * 1024 * 1024;

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=600";

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
  /** จำนวนรถที่ไม่มี URL รูปในไฟล์ (totalUrls === 0) */
  carsWithoutImages: number;
  rows: RowImageDownloadReport[];
}

export function getListingImagesRoot(): string {
  return LISTING_IMAGES_ROOT;
}

export function isLocalListingImageUrl(url: string): boolean {
  return url.startsWith("/storage/listings/");
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function extFromContentType(ct: string | null, sourceUrl: string): string {
  if (ct?.includes("png")) return ".png";
  if (ct?.includes("webp")) return ".webp";
  if (ct?.includes("gif")) return ".gif";
  if (ct?.includes("jpeg") || ct?.includes("jpg")) return ".jpg";
  const m = sourceUrl.match(/\.(jpe?g|png|webp|gif)(\?|$)/i);
  if (m) return `.${m[1].toLowerCase().replace("jpeg", "jpg")}`;
  return ".jpg";
}

function hashSlug(input: string): string {
  return createHash("sha1").update(input).digest("hex").slice(0, 10);
}

async function downloadOneImage(
  carId: string,
  sourceUrl: string,
  index: number
): Promise<ImageDownloadItemResult> {
  const carDir = path.join(LISTING_IMAGES_ROOT, carId);
  ensureDir(carDir);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

    const res = await fetch(sourceUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "NongA-InventoryImport/1.0",
        Accept: "image/*",
      },
      redirect: "follow",
    });

    clearTimeout(timer);

    if (!res.ok) {
      return {
        sourceUrl,
        status: "failed",
        error: `HTTP ${res.status}`,
      };
    }

    const contentType = res.headers.get("content-type");
    if (contentType && !contentType.startsWith("image/")) {
      return {
        sourceUrl,
        status: "failed",
        error: `ไม่ใช่ไฟล์รูป (${contentType})`,
      };
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length === 0) {
      return { sourceUrl, status: "failed", error: "ไฟล์ว่าง" };
    }
    if (buffer.length > MAX_BYTES) {
      return { sourceUrl, status: "failed", error: "ไฟล์ใหญ่เกินไป" };
    }

    const ext = extFromContentType(contentType, sourceUrl);
    const filename = `${String(index + 1).padStart(2, "0")}-${hashSlug(sourceUrl)}${ext}`;
    const fullPath = path.join(carDir, filename);
    fs.writeFileSync(fullPath, buffer);

    const storedUrl = `/storage/listings/${carId}/${filename}`;
    return { sourceUrl, status: "ok", storedUrl };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "download failed";
    return { sourceUrl, status: "failed", error: msg };
  }
}

/**
 * ดาวน์โหลดรูปจาก URL ภายนอก → เก็บใน data/listing-images
 * ไม่ throw — คืน warning ต่อรูปที่ล้มเหลว
 */
export async function downloadListingImagesForCar(
  carId: string,
  sourceRowIndex: number,
  sourceUrls: string[]
): Promise<RowImageDownloadReport> {
  const unique = [
    ...new Set(
      sourceUrls
        .map((u) => u.trim())
        .filter((u) => /^https?:\/\//i.test(u))
    ),
  ].slice(0, MAX_IMAGES_PER_CAR);

  const items: ImageDownloadItemResult[] = [];
  const warnings: string[] = [];
  const storedUrls: string[] = [];

  if (unique.length === 0) {
    warnings.push("ไม่มีรูปภาพในไฟล์");
    return {
      sourceRowIndex,
      carId,
      totalUrls: 0,
      downloaded: 0,
      failed: 0,
      storedUrls: [],
      items: [],
      warnings,
    };
  }

  for (let i = 0; i < unique.length; i++) {
    const result = await downloadOneImage(carId, unique[i], i);
    items.push(result);
    if (result.status === "ok" && result.storedUrl) {
      storedUrls.push(result.storedUrl);
    } else {
      warnings.push(
        `ดึงรูปไม่สำเร็จ: ${unique[i].slice(0, 60)}${unique[i].length > 60 ? "…" : ""} (${result.error ?? "unknown"})`
      );
    }
  }

  devMarketplaceLog("image-download-row", {
    carId,
    sourceRowIndex,
    downloaded: storedUrls.length,
    failed: unique.length - storedUrls.length,
  });

  return {
    sourceRowIndex,
    carId,
    totalUrls: unique.length,
    downloaded: storedUrls.length,
    failed: unique.length - storedUrls.length,
    storedUrls,
    items,
    warnings,
  };
}

export function resolveStoredImagesForListing(
  report: RowImageDownloadReport
): { images: string[]; warnings: string[] } {
  const warnings = [...report.warnings];

  if (report.storedUrls.length > 0) {
    return { images: report.storedUrls, warnings };
  }

  warnings.push("ใช้รูป placeholder — ไม่มีรูปที่ดาวน์โหลดสำเร็จ");
  return { images: [PLACEHOLDER_IMAGE], warnings };
}
