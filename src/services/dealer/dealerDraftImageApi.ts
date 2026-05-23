import type { DealerApiHeaders } from "./dealerApi";
import { dealerAuthHeaders } from "../../utils/apiAuthHeaders";

function headers(h: DealerApiHeaders): HeadersInit {
  return dealerAuthHeaders(h.dealerId, h.role);
}

export async function uploadDraftImagesApi(
  h: DealerApiHeaders,
  draftId: string,
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
    const res = await fetch(
      `/api/dealer/drafts/${encodeURIComponent(draftId)}/upload-images`,
      {
        method: "POST",
        headers: headers(h),
        body: JSON.stringify({ files: [file] }),
      }
    );
    const body = await res.json();
    if (!res.ok) {
      const msg = body.message ?? "อัปโหลดรูปล้มเหลว";
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
      warnings.length > 0 ? warnings.join(" · ") : "อัปโหลดรูปล้มเหลว"
    );
  }

  return { storedUrls, thumbnails, warnings, failed };
}
