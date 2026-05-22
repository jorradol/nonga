import {
  googleDriveFileDownloadUrl,
  isDirectImageUrl,
  parseGoogleDriveFileId,
  type ImageLinkCandidate,
} from "./imageLinkExtractor";
import {
  classifyHttpProbeForDrive,
  DRIVE_PREVIEW_PERMISSION_MESSAGE,
  normalizeDriveFileProbeStatus,
} from "./googleDrivePermissionGuidance";

export type PasteImagePreviewStatus =
  | "ok"
  | "failed"
  | "needs_permission"
  | "unsupported";

export interface PasteImagePreviewResult {
  id: string;
  sourceUrl: string;
  kind: ImageLinkCandidate["kind"];
  status: PasteImagePreviewStatus;
  /** path สำหรับ <img src> ผ่าน proxy */
  proxyPath?: string;
  error?: string;
}

const PREVIEW_TIMEOUT_MS = 8_000;

export function resolveFetchUrlForCandidate(candidate: ImageLinkCandidate): string {
  if (candidate.kind === "drive_file") {
    const id = parseGoogleDriveFileId(candidate.sourceUrl);
    if (id) return googleDriveFileDownloadUrl(id);
  }
  return candidate.previewUrl;
}

export function isAllowedPreviewUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    if (host.includes("drive.google.com")) return true;
    if (isDirectImageUrl(url)) return true;
    return false;
  } catch {
    return false;
  }
}

function buildProbeResult(
  candidate: ImageLinkCandidate,
  status: PasteImagePreviewStatus,
  extra?: { proxyPath?: string; error?: string }
): PasteImagePreviewResult {
  const normalized = normalizeDriveFileProbeStatus(candidate.kind, status);
  const isDrivePerm = normalized === "needs_permission";
  return {
    id: candidate.id,
    sourceUrl: candidate.sourceUrl,
    kind: candidate.kind,
    status: normalized,
    proxyPath: extra?.proxyPath,
    error: isDrivePerm
      ? DRIVE_PREVIEW_PERMISSION_MESSAGE
      : extra?.error,
  };
}

export async function probeImagePreview(
  candidate: ImageLinkCandidate
): Promise<PasteImagePreviewResult> {
  const fetchUrl = resolveFetchUrlForCandidate(candidate);
  if (!isAllowedPreviewUrl(fetchUrl)) {
    return buildProbeResult(candidate, "unsupported", {
      error: "ไม่รองรับลิงก์นี้",
    });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PREVIEW_TIMEOUT_MS);
    let res = await fetch(fetchUrl, {
      method: "HEAD",
      signal: controller.signal,
      headers: {
        "User-Agent": "NongA-PasteImagePreview/1.0",
        Accept: "image/*",
      },
      redirect: "follow",
    });
    clearTimeout(timer);

    let contentType = res.headers.get("content-type");

    if (res.status === 405 || (candidate.kind === "drive_file" && !res.ok)) {
      const controller2 = new AbortController();
      const timer2 = setTimeout(() => controller2.abort(), PREVIEW_TIMEOUT_MS);
      res = await fetch(fetchUrl, {
        method: "GET",
        signal: controller2.signal,
        headers: {
          "User-Agent": "NongA-PasteImagePreview/1.0",
          Accept: "image/*",
          Range: "bytes=0-1023",
        },
        redirect: "follow",
      });
      clearTimeout(timer2);
      contentType = res.headers.get("content-type");
    }

    const driveStatus = classifyHttpProbeForDrive(
      candidate.kind,
      res.status,
      contentType
    );
    if (driveStatus) {
      return buildProbeResult(candidate, driveStatus);
    }

    if (res.status === 401 || res.status === 403) {
      return buildProbeResult(candidate, "needs_permission");
    }

    if (!res.ok) {
      return buildProbeResult(candidate, "failed", {
        error: `HTTP ${res.status}`,
      });
    }

    const ct = contentType ?? "";
    if (
      ct &&
      !ct.startsWith("image/") &&
      !ct.includes("octet-stream")
    ) {
      return buildProbeResult(candidate, "failed", {
        error: "ไม่ใช่ไฟล์รูป",
      });
    }

    const proxyPath = `/api/dealer/paste-import/preview-proxy?url=${encodeURIComponent(fetchUrl)}`;
    return buildProbeResult(candidate, "ok", { proxyPath });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "โหลดไม่สำเร็จ";
    return buildProbeResult(candidate, "failed", { error: msg });
  }
}
