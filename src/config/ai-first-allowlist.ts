/**
 * User-visible AI access allowlist.
 *
 * Runtime environment identity does not grant access. Public staging accepts only
 * UIDs supplied through the existing server-side allowlist/tester environment keys.
 * Committed synthetic UIDs remain local-test-only.
 */
import {
  NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV,
  type SalesBrainRuntimeEnvironment,
} from "../services/ai/salesBrainRuntimeFlags";

export const AI_FIRST_ALLOWLIST_SLICE_ID = "ai-first-allowlist-v1";

function parseUserVisibleAllowlistUids(raw: string | undefined): string[] {
  if (raw === undefined || raw.trim() === "") {
    return [];
  }
  return raw
    .split(",")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
}

/** Offline / smoke synthetic UIDs — safe to commit (not production Firebase UIDs). */
export const INTERNAL_TESTER_UIDS = [
  "synthetic-tester-uid-v61l1",
  "synthetic-other-uid-v61l1",
  "firebase-admin-test-uid",
  "real-role-admin-uid",
] as const;

/** Owner/admin class — runtime env UIDs merged in resolveOwnerAdminUids(). */
export const OWNER_ADMIN_UIDS: readonly string[] = [];

const OWNER_ADMIN_ENV_KEYS = [
  "NONGA_TEST_ADMIN_UID",
  "NONGA_STAGING_ADMIN_UID",
] as const;

const INTERNAL_TESTER_ENV_KEYS = [
  "NONGA_TEST_MEMBER_UID",
  "NONGA_TEST_DEALER_UID",
  "NONGA_TEST_ADMIN_UID",
  "NONGA_INTERNAL_TESTER_UIDS",
] as const;

export type AiFirstGateAuthPath =
  | "env_allowlist"
  | "internal_tester"
  | "owner_admin"
  | "none";

export interface AiFirstAllowlistEvaluation {
  allowed: boolean;
  gateCheck: "PASSED" | "FAILED";
  authPath: AiFirstGateAuthPath;
  blockedReason: string;
}

function normalizeUid(uid: string | undefined | null): string {
  return String(uid ?? "").trim();
}

function parseCommaSeparatedUids(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function readEnvUids(
  readEnv: (key: string) => string | undefined,
  keys: readonly string[]
): string[] {
  const uids: string[] = [];
  for (const key of keys) {
    const value = readEnv(key);
    uids.push(...parseCommaSeparatedUids(value));
  }
  return uids;
}

export function resolveInternalTesterUids(
  readEnv?: (key: string) => string | undefined,
  includeLocalSyntheticUids = false
): string[] {
  const read =
    readEnv ??
    ((key: string) =>
      typeof process !== "undefined" ? (process.env[key] as string | undefined) : undefined);
  return [
    ...(includeLocalSyntheticUids ? INTERNAL_TESTER_UIDS : []),
    ...readEnvUids(read, INTERNAL_TESTER_ENV_KEYS),
  ];
}

export function resolveOwnerAdminUids(
  readEnv?: (key: string) => string | undefined
): string[] {
  const read =
    readEnv ??
    ((key: string) =>
      typeof process !== "undefined" ? (process.env[key] as string | undefined) : undefined);
  return [
    ...OWNER_ADMIN_UIDS,
    ...readEnvUids(read, OWNER_ADMIN_ENV_KEYS),
    ...parseUserVisibleAllowlistUids(read(NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV)),
  ];
}

/**
 * Evaluate AI access independently from environment identity.
 *
 * - production: explicit primary env allowlist only (the outer gate is default-off)
 * - staging: primary env allowlist or server-configured owner/tester env allowlists
 * - local: staging rules plus committed synthetic test UIDs
 * - unknown/missing environment inputs are normalized by the caller to
 *   production-strict before reaching this policy
 */
export function evaluateAiFirstAllowlist(input: {
  firebaseUid?: string | null;
  environment?: SalesBrainRuntimeEnvironment;
  readEnv?: (key: string) => string | undefined;
}): AiFirstAllowlistEvaluation {
  const environment = input.environment ?? "production";
  const readEnv =
    input.readEnv ??
    ((key: string) =>
      typeof process !== "undefined" ? (process.env[key] as string | undefined) : undefined);

  const uid = normalizeUid(input.firebaseUid);
  if (!uid) {
    return {
      allowed: false,
      gateCheck: "FAILED",
      authPath: "none",
      blockedReason: "guest_uid_missing",
    };
  }

  const envAllowlist = parseUserVisibleAllowlistUids(
    readEnv(NONGA_AI_USER_VISIBLE_ALLOWLIST_UIDS_ENV)
  );
  const envAllowlisted =
    envAllowlist.length > 0 && envAllowlist.includes(uid);

  if (environment === "production") {
    if (!envAllowlist.length) {
      return {
        allowed: false,
        gateCheck: "FAILED",
        authPath: "none",
        blockedReason: "allowlist_empty",
      };
    }
    if (!envAllowlisted) {
      return {
        allowed: false,
        gateCheck: "FAILED",
        authPath: "none",
        blockedReason: "uid_not_allowlisted",
      };
    }
    return {
      allowed: true,
      gateCheck: "PASSED",
      authPath: "env_allowlist",
      blockedReason: "user_visible_allowed",
    };
  }

  if (environment === "staging" || environment === "local") {
    if (envAllowlisted) {
      return {
        allowed: true,
        gateCheck: "PASSED",
        authPath: "env_allowlist",
        blockedReason: "user_visible_allowed",
      };
    }

    const ownerAdminUids = resolveOwnerAdminUids(readEnv);
    if (ownerAdminUids.includes(uid)) {
      return {
        allowed: true,
        gateCheck: "PASSED",
        authPath: "owner_admin",
        blockedReason: "user_visible_allowed",
      };
    }

    const internalTesterUids = resolveInternalTesterUids(
      readEnv,
      environment === "local"
    );
    if (internalTesterUids.includes(uid)) {
      return {
        allowed: true,
        gateCheck: "PASSED",
        authPath: "internal_tester",
        blockedReason: "user_visible_allowed",
      };
    }

  }

  if (envAllowlist.length === 0) {
    return {
      allowed: false,
      gateCheck: "FAILED",
      authPath: "none",
      blockedReason: "allowlist_empty",
    };
  }

  return {
    allowed: false,
    gateCheck: "FAILED",
    authPath: "none",
    blockedReason: "uid_not_allowlisted",
  };
}
