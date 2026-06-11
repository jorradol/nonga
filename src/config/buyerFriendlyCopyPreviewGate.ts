/**
 * v6.3B.2 — Buyer-friendly listing copy preview gate (default-deny, staging + allowlist).
 */

export const BUYER_FRIENDLY_COPY_PREVIEW_FLAG_ENV =
  "VITE_NONGA_BUYER_FRIENDLY_COPY_PREVIEW_ENABLED";

export const BUYER_FRIENDLY_COPY_PREVIEW_ALLOWLIST_UIDS_ENV =
  "VITE_NONGA_BUYER_FRIENDLY_COPY_PREVIEW_ALLOWLIST_UIDS";

export const STAGING_BUYER_FRIENDLY_COPY_HOST = "a.nongbot.org";

export const STAGING_BUYER_FRIENDLY_COPY_PROJECT_ID = "nonga-ce93c";

export const GUEST_SIMULATED_UID = "guest-user-100";

export interface BuyerFriendlyCopyPreviewContext {
  isSignedIn: boolean;
  uid?: string | null;
  hostname?: string;
  projectId?: string;
  readEnv?: (key: string) => string | undefined;
}

function defaultReadEnv(key: string): string | undefined {
  const env = (
    import.meta as unknown as { env: Record<string, string | undefined> }
  ).env;
  return env[key];
}

export function isBuyerFriendlyCopyPreviewFlagEnabled(
  readEnv: (key: string) => string | undefined = defaultReadEnv
): boolean {
  const raw = String(readEnv(BUYER_FRIENDLY_COPY_PREVIEW_FLAG_ENV) ?? "")
    .trim()
    .toLowerCase();
  return raw === "true";
}

export function parseBuyerFriendlyCopyPreviewAllowlistUids(
  readEnv: (key: string) => string | undefined = defaultReadEnv
): string[] {
  const raw = readEnv(BUYER_FRIENDLY_COPY_PREVIEW_ALLOWLIST_UIDS_ENV);
  if (raw === undefined || raw.trim() === "") {
    return [];
  }
  return raw
    .split(",")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
}

export function isStagingBuyerFriendlyCopyHost(ctx: {
  hostname?: string;
  projectId?: string;
}): boolean {
  const hostname = String(ctx.hostname ?? "").trim().toLowerCase();
  const projectId = String(ctx.projectId ?? "").trim();
  if (hostname === STAGING_BUYER_FRIENDLY_COPY_HOST) {
    return true;
  }
  return projectId === STAGING_BUYER_FRIENDLY_COPY_PROJECT_ID;
}

export function isUidAllowlistedForBuyerFriendlyCopyPreview(
  uid: string | undefined | null,
  allowlist: string[]
): boolean {
  const normalizedUid = String(uid ?? "").trim();
  if (!normalizedUid || allowlist.length === 0) {
    return false;
  }
  return allowlist.includes(normalizedUid);
}

export function isSignedInForBuyerFriendlyCopyPreview(
  isSignedIn: boolean,
  uid?: string | null
): boolean {
  if (!isSignedIn) return false;
  const normalizedUid = String(uid ?? "").trim();
  if (!normalizedUid || normalizedUid === GUEST_SIMULATED_UID) {
    return false;
  }
  return true;
}

export function resolveBuyerFriendlyCopyPreviewHostname(
  hostname?: string
): string {
  if (hostname !== undefined) {
    return hostname;
  }
  if (typeof window !== "undefined") {
    return window.location.hostname;
  }
  return "";
}

export function resolveBuyerFriendlyCopyPreviewProjectId(
  projectId?: string,
  readEnv: (key: string) => string | undefined = defaultReadEnv
): string {
  if (projectId !== undefined) {
    return projectId;
  }
  return String(readEnv("VITE_FIREBASE_PROJECT_ID") ?? "").trim();
}

export type BuyerFriendlyCopyPreviewGateReason =
  | "visible"
  | "flag-off"
  | "non-staging"
  | "guest-or-unsigned"
  | "empty-allowlist"
  | "not-allowlisted";

export interface BuyerFriendlyCopyPreviewGateEvaluation {
  visible: boolean;
  reason: BuyerFriendlyCopyPreviewGateReason;
  /** Flag on and staging host/project — preview feature is active on this build. */
  featureActive: boolean;
  /** Signed-in real user (not guest simulated). */
  signedInEligible: boolean;
}

function resolveGateContext(
  ctx: Pick<
    BuyerFriendlyCopyPreviewContext,
    "hostname" | "projectId" | "readEnv"
  >
) {
  const readEnv = ctx.readEnv ?? defaultReadEnv;
  const hostname = resolveBuyerFriendlyCopyPreviewHostname(ctx.hostname);
  const projectId = resolveBuyerFriendlyCopyPreviewProjectId(
    ctx.projectId,
    readEnv
  );
  const allowlist = parseBuyerFriendlyCopyPreviewAllowlistUids(readEnv);
  return { readEnv, hostname, projectId, allowlist };
}

export function isBuyerFriendlyCopyPreviewFeatureActive(
  ctx: Pick<
    BuyerFriendlyCopyPreviewContext,
    "hostname" | "projectId" | "readEnv"
  >
): boolean {
  const { readEnv, hostname, projectId } = resolveGateContext(ctx);
  if (!isBuyerFriendlyCopyPreviewFlagEnabled(readEnv)) {
    return false;
  }
  return isStagingBuyerFriendlyCopyHost({ hostname, projectId });
}

/** Evaluates each gate step — used for preview visibility and staging UX clarity. */
export function evaluateBuyerFriendlyCopyPreviewGate(
  ctx: BuyerFriendlyCopyPreviewContext
): BuyerFriendlyCopyPreviewGateEvaluation {
  const { readEnv, hostname, projectId, allowlist } = resolveGateContext(ctx);
  const signedInEligible = isSignedInForBuyerFriendlyCopyPreview(
    ctx.isSignedIn,
    ctx.uid
  );

  if (!isBuyerFriendlyCopyPreviewFlagEnabled(readEnv)) {
    return {
      visible: false,
      reason: "flag-off",
      featureActive: false,
      signedInEligible,
    };
  }

  const staging = isStagingBuyerFriendlyCopyHost({ hostname, projectId });
  if (!staging) {
    return {
      visible: false,
      reason: "non-staging",
      featureActive: false,
      signedInEligible,
    };
  }

  if (!signedInEligible) {
    return {
      visible: false,
      reason: "guest-or-unsigned",
      featureActive: true,
      signedInEligible: false,
    };
  }

  if (allowlist.length === 0) {
    return {
      visible: false,
      reason: "empty-allowlist",
      featureActive: true,
      signedInEligible: true,
    };
  }

  if (!isUidAllowlistedForBuyerFriendlyCopyPreview(ctx.uid, allowlist)) {
    return {
      visible: false,
      reason: "not-allowlisted",
      featureActive: true,
      signedInEligible: true,
    };
  }

  return {
    visible: true,
    reason: "visible",
    featureActive: true,
    signedInEligible: true,
  };
}

/** All gates must pass — default-deny. Guest and non-allowlisted users never see preview. */
export function shouldShowBuyerFriendlyCopyPreview(
  ctx: BuyerFriendlyCopyPreviewContext
): boolean {
  return evaluateBuyerFriendlyCopyPreviewGate(ctx).visible;
}
