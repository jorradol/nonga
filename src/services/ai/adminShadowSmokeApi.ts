import {
  assertApiSuccess,
  safeApiFetch,
  type ApiJsonEnvelope,
} from "../../utils/safeApiFetch";
import { adminAuthHeadersAsync } from "../../utils/apiAuthHeaders";

/** Must match server `SALES_BRAIN_ADMIN_SHADOW_SMOKE_ROUTE` — synthetic cases only. */
export const ADMIN_SHADOW_SMOKE_ROUTE = "/api/admin/sales-brain-shadow-smoke";

/** Fixed synthetic case IDs — no custom prompt / PII / real stock. */
export const ADMIN_SHADOW_SMOKE_CASE_IDS = [
  "SS-01",
  "SS-02",
  "SS-03",
  "SS-04",
  "SS-05",
  "SS-06",
  "SS-07",
  "SS-08",
] as const;

export type AdminShadowSmokeCaseId = (typeof ADMIN_SHADOW_SMOKE_CASE_IDS)[number];

export const ADMIN_SHADOW_SMOKE_CASE_LABELS: Record<AdminShadowSmokeCaseId, string> = {
  "SS-01": "Buyer generic search",
  "SS-02": "Buyer mock listing detail",
  "SS-03": "Seller start over",
  "SS-04": "Dealer inventory count",
  "SS-05": "Kill switch blocked",
  "SS-06": "Budget missing blocked",
  "SS-07": "User-visible blocked",
  "SS-08": "Production off",
};

export interface AdminShadowSmokeRedactedData {
  caseId: AdminShadowSmokeCaseId;
  shadowModeActive: boolean;
  skippedReason?: string;
  userVisibleResponse: string;
  userVisibleBlockedReason?: string;
  runtimeFlagsSummary: string;
  shadowEvaluationAllowed: boolean;
  enablementBlockedReason?: string;
  shadowDebugResult?: {
    salesBrainIntent: string;
    legacyRouteLabel: string;
    routesAlign: boolean;
    provider: "mock" | "gemini";
    routedVia: string;
    selectedCapabilities: string[];
    safetyDecision: string;
    paramsHash: string;
    comparisonNotes: string;
    providerModelId?: string;
    providerRequestIdHash?: string;
  };
  adminShadowRealProviderAttempted?: boolean;
  adminShadowRealProviderFallbackReason?: string;
  realProviderGateReason?: string;
}

export interface AdminShadowSmokeApiResponse {
  success: boolean;
  readOnly: boolean;
  userVisibleOff: boolean;
  providerNetwork: boolean;
  data: AdminShadowSmokeRedactedData;
}

export async function runAdminShadowSmokeCase(
  caseId: AdminShadowSmokeCaseId
): Promise<AdminShadowSmokeApiResponse> {
  const json = await safeApiFetch<
    ApiJsonEnvelope & Partial<AdminShadowSmokeApiResponse>
  >(ADMIN_SHADOW_SMOKE_ROUTE, {
    method: "POST",
    headers: {
      ...(await adminAuthHeadersAsync()),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ caseId }),
    cache: "no-store",
  });
  assertApiSuccess(json, ADMIN_SHADOW_SMOKE_ROUTE);
  return json as AdminShadowSmokeApiResponse;
}
