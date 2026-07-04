import { canAccessAdmin } from "../utils/rbac";

export const OWNER_FIREBASE_TOKEN_HELPER_FLAG_ENV =
  "VITE_NONGA_OWNER_FIREBASE_TOKEN_HELPER_ENABLED";
export const OWNER_GEMINI_ONE_RUN_HELPER_FLAG_ENV =
  "VITE_NONGA_OWNER_GEMINI_ONE_RUN_HELPER_ENABLED";
export const OWNER_FIREBASE_TOKEN_HELPER_ALLOWLIST_UIDS_ENV =
  "VITE_NONGA_OWNER_FIREBASE_TOKEN_HELPER_ALLOWLIST_UIDS";
export const OWNER_FIREBASE_TOKEN_HELPER_STAGING_HOST = "a.nongbot.org";
export const OWNER_FIREBASE_TOKEN_HELPER_STAGING_PROJECT_ID = "nonga-ce93c";
export const OWNER_FIREBASE_TOKEN_HELPER_GUEST_UID = "guest-user-100";

export type OwnerFirebaseTokenHelperGateReason =
  | "enabled"
  | "flag-off"
  | "non-staging"
  | "not-signed-in"
  | "not-admin"
  | "uid-not-allowlisted";

export interface OwnerFirebaseTokenHelperGateInput {
  isSignedIn: boolean;
  uid?: string | null;
  role?: string | null;
  status?: string | null;
  hostname?: string;
  projectId?: string;
  readEnv?: (key: string) => string | undefined;
}

export interface OwnerFirebaseTokenHelperGateEvaluation {
  enabled: boolean;
  reason: OwnerFirebaseTokenHelperGateReason;
}

function defaultReadEnv(key: string): string | undefined {
  const env = (
    import.meta as unknown as { env: Record<string, string | undefined> }
  ).env;
  return env[key];
}

function resolveHostname(hostname?: string): string {
  if (hostname !== undefined) return String(hostname).trim().toLowerCase();
  if (typeof window === "undefined") return "";
  return String(window.location.hostname).trim().toLowerCase();
}

function resolveProjectId(
  projectId?: string,
  readEnv: (key: string) => string | undefined = defaultReadEnv
): string {
  if (projectId !== undefined) return String(projectId).trim();
  return String(readEnv("VITE_FIREBASE_PROJECT_ID") ?? "").trim();
}

function parseAllowlistUids(
  readEnv: (key: string) => string | undefined = defaultReadEnv
): string[] {
  const raw = String(readEnv(OWNER_FIREBASE_TOKEN_HELPER_ALLOWLIST_UIDS_ENV) ?? "").trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function isFlagEnabled(
  readEnv: (key: string) => string | undefined = defaultReadEnv
): boolean {
  const raw = String(readEnv(OWNER_FIREBASE_TOKEN_HELPER_FLAG_ENV) ?? "")
    .trim()
    .toLowerCase();
  return raw === "true";
}

export function isOwnerFirebaseTokenHelperEnabled(
  readEnv: (key: string) => string | undefined = defaultReadEnv
): boolean {
  return isFlagEnabled(readEnv);
}

export function isOwnerGeminiOneRunHelperEnabled(
  readEnv: (key: string) => string | undefined = defaultReadEnv
): boolean {
  const raw = String(readEnv(OWNER_GEMINI_ONE_RUN_HELPER_FLAG_ENV) ?? "")
    .trim()
    .toLowerCase();
  return raw === "true";
}

function isStagingEnvironment(input: { hostname: string; projectId: string }): boolean {
  if (input.hostname === OWNER_FIREBASE_TOKEN_HELPER_STAGING_HOST) return true;
  return input.projectId === OWNER_FIREBASE_TOKEN_HELPER_STAGING_PROJECT_ID;
}

function isEligibleSignedInUser(input: {
  isSignedIn: boolean;
  uid: string;
}): boolean {
  if (!input.isSignedIn) return false;
  if (!input.uid) return false;
  return input.uid !== OWNER_FIREBASE_TOKEN_HELPER_GUEST_UID;
}

export function evaluateOwnerFirebaseTokenHelperGate(
  input: OwnerFirebaseTokenHelperGateInput
): OwnerFirebaseTokenHelperGateEvaluation {
  const readEnv = input.readEnv ?? defaultReadEnv;
  const uid = String(input.uid ?? "").trim();
  const hostname = resolveHostname(input.hostname);
  const projectId = resolveProjectId(input.projectId, readEnv);
  const allowlist = parseAllowlistUids(readEnv);

  if (!isFlagEnabled(readEnv)) {
    return { enabled: false, reason: "flag-off" };
  }
  if (!isStagingEnvironment({ hostname, projectId })) {
    return { enabled: false, reason: "non-staging" };
  }
  if (!isEligibleSignedInUser({ isSignedIn: input.isSignedIn, uid })) {
    return { enabled: false, reason: "not-signed-in" };
  }
  if (!canAccessAdmin({ role: input.role ?? undefined, status: input.status ?? undefined })) {
    return { enabled: false, reason: "not-admin" };
  }
  if (allowlist.length > 0 && !allowlist.includes(uid)) {
    return { enabled: false, reason: "uid-not-allowlisted" };
  }
  return { enabled: true, reason: "enabled" };
}
