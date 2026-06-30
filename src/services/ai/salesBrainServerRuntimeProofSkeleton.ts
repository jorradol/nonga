/**
 * v9.2 - Disabled Admin-only Runtime Proof Skeleton.
 * Safety-first: read-only, provider network disabled, deterministic fallback preserved.
 */
import type { Express, Request, Response } from "express";
import {
  resolveSalesBrainRuntimeProofFlags,
  type SalesBrainRuntimeProofFlags,
} from "./salesBrainRuntimeProofFlags";
import {
  createDisabledRuntimeProofProviderAdapter,
  resolveRuntimeProofProviderWiring,
  type RuntimeProofProviderBlockedReason,
} from "./salesBrainRuntimeProofProviderWiring";

export const SALES_BRAIN_ADMIN_RUNTIME_PROOF_SKELETON_ROUTE =
  "/api/admin/sales-brain-runtime-proof-skeleton";

export interface AdminRuntimeProofSkeletonPayload {
  status: "disabled";
  readOnly: true;
  adminOnly: true;
  providerNetwork: false;
  geminiActivated: false;
  deterministicSourceOfTruth: true;
  fallbackMode: "deterministic";
  blockedReason: SalesBrainRuntimeProofFlags["blockedReason"];
  providerWiring: {
    providerName: "gemini-placeholder";
    requestedProviderEnabled: boolean;
    effectiveProviderEnabled: false;
    killSwitchActive: boolean;
    quotaGuardReady: boolean;
    costGuardReady: boolean;
    logRedactionGuardReady: boolean;
    blockedReason: RuntimeProofProviderBlockedReason;
  };
}

export function buildAdminRuntimeProofSkeletonPayload(
  flags: SalesBrainRuntimeProofFlags,
  providerWiring: ReturnType<typeof resolveRuntimeProofProviderWiring> = resolveRuntimeProofProviderWiring({
    flags,
  })
): AdminRuntimeProofSkeletonPayload {
  return {
    status: "disabled",
    readOnly: true,
    adminOnly: true,
    providerNetwork: false,
    geminiActivated: false,
    deterministicSourceOfTruth: true,
    fallbackMode: "deterministic",
    blockedReason: flags.blockedReason,
    providerWiring: {
      providerName: providerWiring.providerName,
      requestedProviderEnabled: providerWiring.requestedProviderEnabled,
      effectiveProviderEnabled: providerWiring.effectiveProviderEnabled,
      killSwitchActive: providerWiring.killSwitchActive,
      quotaGuardReady: providerWiring.quotaGuardReady,
      costGuardReady: providerWiring.costGuardReady,
      logRedactionGuardReady: providerWiring.logRedactionGuardReady,
      blockedReason: providerWiring.blockedReason,
    },
  };
}

export async function handleAdminRuntimeProofSkeletonPost(
  req: Request,
  res: Response
): Promise<void> {
  const flags = resolveSalesBrainRuntimeProofFlags();
  const providerWiring = resolveRuntimeProofProviderWiring({ flags });
  const adapter = createDisabledRuntimeProofProviderAdapter();
  const providerResult = await adapter.invoke({
    message: String(req.body?.message ?? ""),
    state: providerWiring,
  });
  const data = buildAdminRuntimeProofSkeletonPayload(flags, providerWiring);

  res.json({
    success: true,
    route: SALES_BRAIN_ADMIN_RUNTIME_PROOF_SKELETON_ROUTE,
    providerCall: providerResult,
    data,
  });
}

export function registerSalesBrainAdminRuntimeProofSkeletonRoutes(app: Express): void {
  app.post(
    SALES_BRAIN_ADMIN_RUNTIME_PROOF_SKELETON_ROUTE,
    handleAdminRuntimeProofSkeletonPost
  );
}
