/**
 * v9.2 - Disabled Admin-only Runtime Proof Skeleton.
 * Safety-first: read-only, provider network disabled, deterministic fallback preserved.
 */
import type { Express, Request, Response } from "express";
import {
  resolveSalesBrainRuntimeProofFlags,
  type SalesBrainRuntimeProofFlags,
} from "./salesBrainRuntimeProofFlags";

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
}

export function buildAdminRuntimeProofSkeletonPayload(
  flags: SalesBrainRuntimeProofFlags
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
  };
}

export async function handleAdminRuntimeProofSkeletonPost(
  _req: Request,
  res: Response
): Promise<void> {
  const flags = resolveSalesBrainRuntimeProofFlags();
  const data = buildAdminRuntimeProofSkeletonPayload(flags);

  res.json({
    success: true,
    route: SALES_BRAIN_ADMIN_RUNTIME_PROOF_SKELETON_ROUTE,
    data,
  });
}

export function registerSalesBrainAdminRuntimeProofSkeletonRoutes(app: Express): void {
  app.post(
    SALES_BRAIN_ADMIN_RUNTIME_PROOF_SKELETON_ROUTE,
    handleAdminRuntimeProofSkeletonPost
  );
}
