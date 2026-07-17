import {
  AppFriendlyError,
  mapHttpStatusToFriendly,
  networkFriendlyError,
  notJsonResponseError,
} from "./appFriendlyError";
import { isUiFixtureBuild, UI_FIXTURE_DISABLED_REASON } from "../fixture/uiFixtureMode";

export interface ApiJsonEnvelope {
  success?: boolean;
  message?: string;
  data?: unknown;
  [key: string]: unknown;
}

export interface SafeApiFetchResponseMeta {
  status: number;
  ok: boolean;
  contentType: string | null;
}

export interface SafeApiFetchOptions extends RequestInit {
  onResponseMeta?: (meta: SafeApiFetchResponseMeta) => void;
}

function isJsonContentType(ct: string | null): boolean {
  if (!ct) return false;
  return ct.includes("application/json") || ct.includes("+json");
}

async function readBodyPreview(res: Response, max = 120): Promise<string> {
  try {
    const text = await res.clone().text();
    return text.slice(0, max);
  } catch {
    return "";
  }
}

function fixtureMutationBlockedError(url: string, method: string): AppFriendlyError {
  return new AppFriendlyError({
    code: "forbidden",
    friendlyTitle: UI_FIXTURE_DISABLED_REASON,
    friendlyMessage: UI_FIXTURE_DISABLED_REASON,
    technicalDetail: `fixture-blocked ${method} ${url}`,
    status: 403,
    url,
  });
}

/**
 * อ่าน response อย่างปลอดภัย — ไม่เรียก .json() ถ้าไม่ใช่ JSON
 */
export async function parseApiJsonResponse<T extends ApiJsonEnvelope>(
  res: Response,
  url: string
): Promise<T> {
  const contentType = res.headers.get("content-type");
  const preview = await readBodyPreview(res);
  const looksJson =
    preview.trim().startsWith("{") || preview.trim().startsWith("[");

  if (!isJsonContentType(contentType) && !looksJson) {
    throw notJsonResponseError(url, res.status, contentType, preview);
  }

  let json: T;
  try {
    json = (await res.json()) as T;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "JSON parse failed";
    console.error("[safeApiFetch] parse failed", { url, status: res.status, msg });
    throw notJsonResponseError(url, res.status, contentType, preview || msg);
  }

  if (!res.ok) {
    const serverMsg =
      typeof json.message === "string"
        ? json.message
        : typeof json.error === "string" && json.error === "PAYLOAD_TOO_LARGE"
          ? "ข้อมูลรูปภาพใหญ่เกินไป กรุณาลดจำนวนรูปหรือขนาดรูป แล้วลองใหม่อีกครั้ง"
          : undefined;
    if (serverMsg === UI_FIXTURE_DISABLED_REASON) {
      throw fixtureMutationBlockedError(url, "RESPONSE");
    }
    throw mapHttpStatusToFriendly(res.status, url, serverMsg);
  }

  return json;
}

export async function safeApiFetch<T extends ApiJsonEnvelope>(
  url: string,
  init?: SafeApiFetchOptions
): Promise<T> {
  const method = String(init?.method || "GET").toUpperCase();
  if (isUiFixtureBuild && method !== "GET" && method !== "HEAD") {
    throw fixtureMutationBlockedError(url, method);
  }
  try {
    const res = await fetch(url, init);
    init?.onResponseMeta?.({
      status: res.status,
      ok: res.ok,
      contentType: res.headers.get("content-type"),
    });
    return await parseApiJsonResponse<T>(res, url);
  } catch (err) {
    if (err instanceof AppFriendlyError) throw err;
    if (err instanceof TypeError) {
      throw networkFriendlyError(url, err.message);
    }
    throw err;
  }
}

export function assertApiSuccess(
  json: ApiJsonEnvelope,
  url: string
): void {
  if (json.success === false) {
    throw mapHttpStatusToFriendly(
      400,
      url,
      typeof json.message === "string" ? json.message : undefined
    );
  }
}
