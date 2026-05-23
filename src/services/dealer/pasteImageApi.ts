import type { DealerApiHeaders } from "./dealerApi";
import { dealerAuthHeaders } from "../../utils/apiAuthHeaders";
import type { ImageLinkCandidate } from "../../utils/inventoryImport/imageLinkExtractor";
import type { PasteImagePreviewResult } from "../../utils/inventoryImport/pasteImagePreview";

function headers(h: DealerApiHeaders): HeadersInit {
  return dealerAuthHeaders(h.dealerId, h.role);
}

export async function probePasteImages(
  h: DealerApiHeaders,
  candidates: ImageLinkCandidate[]
): Promise<PasteImagePreviewResult[]> {
  const res = await fetch("/api/dealer/paste-import/image-probe", {
    method: "POST",
    headers: headers(h),
    body: JSON.stringify({ candidates }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message ?? "โหลด preview ล้มเหลว");
  return body.data ?? [];
}

export async function importSelectedPasteImagesApi(
  h: DealerApiHeaders,
  listingId: string,
  candidates: ImageLinkCandidate[],
  selectedSourceUrls: string[],
  primarySourceUrl?: string
): Promise<{
  storedUrls: string[];
  thumbnails: string[];
  primaryImage?: string;
  failed: { sourceUrl: string; error: string }[];
  warnings: string[];
}> {
  const res = await fetch("/api/dealer/paste-import/import-selected-images", {
    method: "POST",
    headers: headers(h),
    body: JSON.stringify({
      listingId,
      candidates,
      selectedSourceUrls,
      primarySourceUrl,
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message ?? "ดาวน์โหลดรูปล้มเหลว");
  return body.data;
}

export interface PasteImageUploadResult {
  storedUrls: string[];
  thumbnails: string[];
  warnings: string[];
  failed: Array<{ name: string; error: string }>;
}

export async function uploadPasteImagesApi(
  h: DealerApiHeaders,
  listingId: string,
  files: Array<{ mimeType: string; dataBase64: string; name: string }>,
  opts?: {
    onFileStart?: (index: number) => void;
    onFileDone?: (index: number, ok: boolean) => void;
  }
): Promise<PasteImageUploadResult> {
  const storedUrls: string[] = [];
  const thumbnails: string[] = [];
  const warnings: string[] = [];
  const failed: Array<{ name: string; error: string }> = [];

  for (let i = 0; i < files.length; i++) {
    opts?.onFileStart?.(i);
    const res = await fetch("/api/dealer/paste-import/upload-images", {
      method: "POST",
      headers: headers(h),
      body: JSON.stringify({ listingId, files: [files[i]] }),
    });
    const body = await res.json();
    if (!res.ok) {
      const msg = body.message ?? "อัปโหลดรูปล้มเหลว";
      warnings.push(`${files[i].name}: ${msg}`);
      failed.push({ name: files[i].name, error: msg });
      opts?.onFileDone?.(i, false);
      continue;
    }
    const data = body.data as PasteImageUploadResult;
    if (data.storedUrls?.[0]) storedUrls.push(data.storedUrls[0]);
    if (data.thumbnails?.[0]) thumbnails.push(data.thumbnails[0]);
    if (data.warnings?.length) warnings.push(...data.warnings);
    if (data.failed?.length) failed.push(...data.failed);
    opts?.onFileDone?.(i, (data.storedUrls?.length ?? 0) > 0);
  }

  if (storedUrls.length === 0 && files.length > 0) {
    throw new Error(
      warnings.length > 0 ? warnings.join(" · ") : "อัปโหลดรูปจากเครื่องไม่สำเร็จ"
    );
  }

  return { storedUrls, thumbnails, warnings, failed };
}
