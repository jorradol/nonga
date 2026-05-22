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

export async function uploadPasteImagesApi(
  h: DealerApiHeaders,
  listingId: string,
  files: Array<{ mimeType: string; dataBase64: string; name: string }>
): Promise<{ storedUrls: string[]; thumbnails: string[] }> {
  const res = await fetch("/api/dealer/paste-import/upload-images", {
    method: "POST",
    headers: headers(h),
    body: JSON.stringify({ listingId, files }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message ?? "อัปโหลดรูปล้มเหลว");
  return body.data;
}
