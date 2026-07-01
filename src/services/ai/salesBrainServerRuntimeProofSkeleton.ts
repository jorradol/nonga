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
  resolveRuntimeProofDryRunGate,
  resolveRuntimeProofRealProviderGuard,
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
    secretGuardReady: boolean;
    quotaGuardReady: boolean;
    costGuardReady: boolean;
    logRedactionGuardReady: boolean;
    blockedReason: RuntimeProofProviderBlockedReason;
  };
  dryRunGate: {
    dryRunOnlyEnforced: true;
    requestedDryRunOnly: boolean;
    ownerApprovedMode: boolean;
    readyForFutureRealProof: boolean;
    realProviderCallAllowed: false;
    effectiveProviderEnabled: false;
    deterministicFallback: true;
    networkAllowed: false;
    blockedReasons: string[];
  };
  realProviderGuard: {
    requestedRealProviderActivation: boolean;
    manualProofMode: boolean;
    ownerApprovalFlag: boolean;
    dryRunGatePassed: boolean;
    realProviderQuotaCapReady: boolean;
    realProviderQuotaCap: number | null;
    realProviderCallAllowed: boolean;
    effectiveProviderEnabled: boolean;
    networkAllowed: boolean;
    blockedReasons: string[];
    deterministicFallback: true;
  };
}

export function buildAdminRuntimeProofSkeletonPayload(
  flags: SalesBrainRuntimeProofFlags,
  providerWiring: ReturnType<typeof resolveRuntimeProofProviderWiring> = resolveRuntimeProofProviderWiring({
    flags,
  })
): AdminRuntimeProofSkeletonPayload {
  const dryRunGate = resolveRuntimeProofDryRunGate({
    flags,
    wiring: providerWiring,
  });
  const realProviderGuard = resolveRuntimeProofRealProviderGuard({
    flags,
    wiring: providerWiring,
    dryRunGate,
  });

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
      secretGuardReady: providerWiring.secretGuardReady,
      quotaGuardReady: providerWiring.quotaGuardReady,
      costGuardReady: providerWiring.costGuardReady,
      logRedactionGuardReady: providerWiring.logRedactionGuardReady,
      blockedReason: providerWiring.blockedReason,
    },
    dryRunGate: {
      dryRunOnlyEnforced: dryRunGate.dryRunOnlyEnforced,
      requestedDryRunOnly: dryRunGate.requestedDryRunOnly,
      ownerApprovedMode: dryRunGate.ownerApprovedMode,
      readyForFutureRealProof: dryRunGate.readyForFutureRealProof,
      realProviderCallAllowed: dryRunGate.realProviderCallAllowed,
      effectiveProviderEnabled: dryRunGate.effectiveProviderEnabled,
      deterministicFallback: dryRunGate.deterministicFallback,
      networkAllowed: dryRunGate.networkAllowed,
      blockedReasons: dryRunGate.blockedReasons,
    },
    realProviderGuard: {
      requestedRealProviderActivation: realProviderGuard.requestedRealProviderActivation,
      manualProofMode: realProviderGuard.manualProofMode,
      ownerApprovalFlag: realProviderGuard.ownerApprovalFlag,
      dryRunGatePassed: realProviderGuard.dryRunGatePassed,
      realProviderQuotaCapReady: realProviderGuard.realProviderQuotaCapReady,
      realProviderQuotaCap: realProviderGuard.realProviderQuotaCap,
      realProviderCallAllowed: realProviderGuard.realProviderCallAllowed,
      effectiveProviderEnabled: realProviderGuard.effectiveProviderEnabled,
      networkAllowed: realProviderGuard.networkAllowed,
      blockedReasons: realProviderGuard.blockedReasons,
      deterministicFallback: realProviderGuard.deterministicFallback,
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
