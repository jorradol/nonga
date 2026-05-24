import type { DealerApiHeaders } from "./dealerApi";
import { dealerAuthHeaders } from "../../utils/apiAuthHeaders";
import { toUserFacingMessage } from "../../utils/userFacingErrors";

export type DealerListingImageTarget = "draft" | "inventory";

const UPLOAD_FAIL_THAI =
  "อัปโหลดรูปไม่สำเร็จครับ กรุณาลองใหม่อีกครั้ง";

function headers(h: DealerApiHeaders): HeadersInit {
  return dealerAuthHeaders(h.dealerId, h.role);
}

function uploadPath(target: DealerListingImageTarget, listingId: string): string {
  const enc = encodeURIComponent(listingId);
  return target === "draft"
    ? `/api/dealer/drafts/${enc}/upload-images`
    : `/api/dealer/inventory/${enc}/upload-images`;
}

export async function uploadListingImagesApi(
  h: DealerApiHeaders,
  listingId: string,
  target: DealerListingImageTarget,
  files: Array<{ mimeType: string; dataBase64: string; name: string }>
): Promise<{
  storedUrls: string[];
  thumbnails: string[];
  warnings: string[];
  failed: Array<{ name: string; error: string }>;
}> {
  const storedUrls: string[] = [];
  const thumbnails: string[] = [];
  const warnings: string[] = [];
  const failed: Array<{ name: string; error: string }> = [];

  for (const file of files) {
    const res = await fetch(uploadPath(target, listingId), {
      method: "POST",
      headers: headers(h),
      body: JSON.stringify({ files: [file] }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const raw =
        typeof body.message === "string" ? body.message : UPLOAD_FAIL_THAI;
      const msg = toUserFacingMessage(raw, UPLOAD_FAIL_THAI);
      try {
        const env = (import.meta as { env?: { DEV?: boolean } }).env;
        if (env?.DEV) {
          console.error("[uploadListingImagesApi]", {
          target,
          listingId,
          status: res.status,
          raw,
        });
        }
      } catch {
        // ignore
      }
      warnings.push(`${file.name}: ${msg}`);
      failed.push({ name: file.name, error: msg });
      continue;
    }
    const data = body.data as {
      storedUrls?: string[];
      thumbnails?: string[];
      warnings?: string[];
      failed?: Array<{ name: string; error: string }>;
    };
    if (data.storedUrls?.[0]) storedUrls.push(data.storedUrls[0]);
    if (data.thumbnails?.[0]) thumbnails.push(data.thumbnails[0]);
    if (data.warnings?.length) warnings.push(...data.warnings);
    if (data.failed?.length) failed.push(...data.failed);
  }

  if (storedUrls.length === 0 && files.length > 0) {
    throw new Error(
      warnings.length > 0 ? warnings.join(" · ") : UPLOAD_FAIL_THAI
    );
  }

  return { storedUrls, thumbnails, warnings, failed };
}

/** @deprecated use uploadListingImagesApi(..., 'draft', ...) */
export async function uploadDraftImagesApi(
  h: DealerApiHeaders,
  draftId: string,
  files: Array<{ mimeType: string; dataBase64: string; name: string }>
) {
  return uploadListingImagesApi(h, draftId, "draft", files);
}
