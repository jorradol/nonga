import {
  assertApiSuccess,
  safeApiFetch,
  type ApiJsonEnvelope,
} from "../../utils/safeApiFetch";
import { getFirebaseAuthHeaders } from "../auth/firebaseAuthHeaders";
import type { DealerApiHeaders } from "../dealer/dealerApi";
import { dealerAuthHeadersAsync } from "../../utils/apiAuthHeaders";
import type { SellerRevenuePreviewApiPayload } from "./revenuePreviewBackend";
import type { MyListingsApiScope } from "../listings/myListingsApi";

async function ownerHeadersAsync(ownerId: string): Promise<HeadersInit> {
  return {
    ...((await getFirebaseAuthHeaders()) as Record<string, string>),
    "Content-Type": "application/json",
    "X-Owner-Id": ownerId,
  };
}

export async function fetchMyRevenuePreview(
  scope: MyListingsApiScope
): Promise<SellerRevenuePreviewApiPayload> {
  const headers = scope.dealerHeaders
    ? await dealerAuthHeadersAsync(scope.dealerHeaders.dealerId, scope.dealerHeaders.role)
    : await ownerHeadersAsync(scope.ownerId);

  const json = await safeApiFetch<
    ApiJsonEnvelope & { data?: SellerRevenuePreviewApiPayload }
  >("/api/my/revenue/preview", {
    headers,
    cache: "no-store",
  });
  assertApiSuccess(json, "/api/my/revenue/preview");
  return json.data as SellerRevenuePreviewApiPayload;
}
