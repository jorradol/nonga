import {
  assertApiSuccess,
  safeApiFetch,
  type ApiJsonEnvelope,
} from "../../utils/safeApiFetch";
import { adminAuthHeadersAsync } from "../../utils/apiAuthHeaders";
import type { RevenuePreviewApiPayload } from "./revenuePreviewBackend";

export async function fetchAdminRevenuePreview(): Promise<RevenuePreviewApiPayload> {
  const json = await safeApiFetch<ApiJsonEnvelope & { data?: RevenuePreviewApiPayload }>(
    "/api/admin/revenue/preview",
    {
      headers: await adminAuthHeadersAsync(),
      cache: "no-store",
    }
  );
  assertApiSuccess(json, "/api/admin/revenue/preview");
  return json.data as RevenuePreviewApiPayload;
}
