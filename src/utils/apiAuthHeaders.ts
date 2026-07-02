import { firebaseAuthUnavailableMessage } from "../lib/firebase";
import { getFirebaseAuthHeaders } from "../services/auth/firebaseAuthHeaders";

/**
 * Client beta/dev auth headers.
 * Production must use explicit env tokens or Firebase ID token helpers.
 */

const DEFAULT_DEALER = "nonga-v4-dev-dealer-token";
const DEFAULT_ADMIN = "nonga-v4-dev-admin-token";

export interface ClientApiAuthEnv {
  DEV?: boolean;
  PROD?: boolean;
  NONGA_ADMIN_API_TOKEN?: string;
  VITE_NONGA_DEALER_API_TOKEN?: string;
  VITE_NONGA_ADMIN_API_TOKEN?: string;
}

export type AdminAuthMode =
  | "admin_api_token"
  | "firebase_id_token"
  | "legacy_x_api_token"
  | "auto_legacy_compatible";

export type AdminTokenValidationIssue =
  | "missing"
  | "empty"
  | "surrounding_whitespace"
  | "contains_newline"
  | "quoted_literal"
  | "literal_env_reference"
  | "contains_bearer_prefix";

export interface AdminTokenValidationResult {
  ok: boolean;
  issue?: AdminTokenValidationIssue;
  normalized?: string;
}

export interface ResolveAdminApiTokenOptions {
  env?: ClientApiAuthEnv;
  allowViteAdminTokenFallback?: boolean;
}

export interface ResolvedAdminApiToken {
  token: string;
  source: "NONGA_ADMIN_API_TOKEN" | "VITE_NONGA_ADMIN_API_TOKEN";
}

export interface AdminAuthHeaderOptions {
  env?: ClientApiAuthEnv;
  mode?: AdminAuthMode;
  allowViteAdminTokenFallback?: boolean;
  role?: "admin" | "superadmin";
}

function readViteEnv(key: string): string {
  try {
    const meta = import.meta as { env?: Record<string, string | undefined> };
    const v = meta.env?.[key];
    return typeof v === "string" ? v.trim() : "";
  } catch {
    return "";
  }
}

function readViteEnvRaw(key: string): string {
  try {
    const meta = import.meta as { env?: Record<string, string | undefined> };
    const v = meta.env?.[key];
    return typeof v === "string" ? v : "";
  } catch {
    return "";
  }
}

function readNodeEnv(key: string): string {
  try {
    const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
    const value = proc?.env?.[key];
    return typeof value === "string" ? value : "";
  } catch {
    return "";
  }
}

function readViteFlag(key: "DEV" | "PROD"): boolean {
  try {
    const meta = import.meta as { env?: Record<string, unknown> };
    return Boolean(meta.env?.[key]);
  } catch {
    return false;
  }
}

function readFromEnv(env: ClientApiAuthEnv | undefined, key: keyof ClientApiAuthEnv): string {
  const value = env?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function readFromEnvRaw(env: ClientApiAuthEnv | undefined, key: keyof ClientApiAuthEnv): string {
  const value = env?.[key];
  return typeof value === "string" ? value : "";
}

export function validateAdminTokenCandidate(rawToken: string): AdminTokenValidationResult {
  if (rawToken == null) return { ok: false, issue: "missing" };
  if (rawToken.length === 0) return { ok: false, issue: "empty" };
  if (rawToken.trim().length === 0) return { ok: false, issue: "empty" };
  if (rawToken !== rawToken.trim()) return { ok: false, issue: "surrounding_whitespace" };
  if (/[\r\n]/.test(rawToken)) return { ok: false, issue: "contains_newline" };
  if (/^['"].*['"]$/.test(rawToken)) return { ok: false, issue: "quoted_literal" };
  if (/^\$[A-Z0-9_]+$/i.test(rawToken) || /^\$\{[A-Z0-9_]+\}$/i.test(rawToken)) {
    return { ok: false, issue: "literal_env_reference" };
  }
  if (/^(undefined|null)$/i.test(rawToken)) return { ok: false, issue: "literal_env_reference" };
  if (/^Bearer\s+/i.test(rawToken)) return { ok: false, issue: "contains_bearer_prefix" };
  return { ok: true, normalized: rawToken };
}

function requireValidAdminToken(rawToken: string, sourceLabel: string): string {
  const validation = validateAdminTokenCandidate(rawToken);
  if (!validation.ok || !validation.normalized) {
    throw new Error(
      `Invalid admin token (${sourceLabel}): ${validation.issue ?? "unknown"}`
    );
  }
  return validation.normalized;
}

export function resolveClientDealerToken(env?: ClientApiAuthEnv): string {
  const configured =
    readFromEnv(env, "VITE_NONGA_DEALER_API_TOKEN") ||
    readViteEnv("VITE_NONGA_DEALER_API_TOKEN");
  if (configured) return configured;

  const isProd = env?.PROD ?? readViteFlag("PROD");
  const isDev = env?.DEV ?? readViteFlag("DEV");
  return !isProd || isDev ? DEFAULT_DEALER : "";
}

export function resolveClientAdminToken(env?: ClientApiAuthEnv): string {
  const configured =
    readFromEnv(env, "VITE_NONGA_ADMIN_API_TOKEN") ||
    readViteEnv("VITE_NONGA_ADMIN_API_TOKEN");
  if (configured) return configured;

  const isProd = env?.PROD ?? readViteFlag("PROD");
  const isDev = env?.DEV ?? readViteFlag("DEV");
  return !isProd || isDev ? DEFAULT_ADMIN : "";
}

export function resolveAdminApiTokenForServer(
  options: ResolveAdminApiTokenOptions = {}
): ResolvedAdminApiToken {
  const env = options.env;
  const primaryRaw =
    readFromEnvRaw(env, "NONGA_ADMIN_API_TOKEN") ||
    readNodeEnv("NONGA_ADMIN_API_TOKEN");
  if (primaryRaw) {
    return {
      token: requireValidAdminToken(primaryRaw, "NONGA_ADMIN_API_TOKEN"),
      source: "NONGA_ADMIN_API_TOKEN",
    };
  }

  if (options.allowViteAdminTokenFallback) {
    const fallbackRaw =
      readFromEnvRaw(env, "VITE_NONGA_ADMIN_API_TOKEN") ||
      readViteEnvRaw("VITE_NONGA_ADMIN_API_TOKEN");
    if (fallbackRaw) {
      return {
        token: requireValidAdminToken(fallbackRaw, "VITE_NONGA_ADMIN_API_TOKEN"),
        source: "VITE_NONGA_ADMIN_API_TOKEN",
      };
    }
  }

  throw new Error(
    "Missing admin API token for server mode (primary NONGA_ADMIN_API_TOKEN; optional explicit fallback VITE_NONGA_ADMIN_API_TOKEN)"
  );
}

function requireClientToken(token: string): string {
  if (!token) {
    throw new Error(firebaseAuthUnavailableMessage);
  }
  return token;
}

function dealerToken(): string {
  return requireClientToken(resolveClientDealerToken());
}

function adminToken(): string {
  return requireClientToken(
    resolveAdminApiTokenForServer({ allowViteAdminTokenFallback: true }).token
  );
}

export function bearerDealer(): string {
  return `Bearer ${dealerToken()}`;
}

export function bearerAdmin(): string {
  return `Bearer ${adminToken()}`;
}

export function dealerAuthHeaders(
  dealerId: string,
  role: string
): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: bearerDealer(),
    "X-Dealer-Id": dealerId,
    "X-User-Role": role,
  };
}

export async function dealerAuthHeadersAsync(
  dealerId: string,
  role: string
): Promise<HeadersInit> {
  const firebaseHeaders = (await getFirebaseAuthHeaders()) as Record<string, string>;
  if (firebaseHeaders.Authorization) {
    return {
      ...firebaseHeaders,
      "Content-Type": "application/json",
      "X-Dealer-Id": dealerId,
      "X-User-Role": role,
    };
  }
  return dealerAuthHeaders(dealerId, role);
}

export function adminAuthHeaders(): HeadersInit {
  const token = resolveAdminApiTokenForServer({
    allowViteAdminTokenFallback: true,
  }).token;
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "X-User-Role": "admin",
  };
}

export async function adminAuthHeadersAsync(
  role: "admin" | "superadmin" = "admin",
  options: AdminAuthHeaderOptions = {}
): Promise<HeadersInit> {
  const mode = options.mode ?? "auto_legacy_compatible";
  if (mode === "admin_api_token") {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${
        resolveAdminApiTokenForServer({
          env: options.env,
          allowViteAdminTokenFallback: options.allowViteAdminTokenFallback ?? false,
        }).token
      }`,
      "X-User-Role": role,
    };
  }
  if (mode === "legacy_x_api_token") {
    return {
      "Content-Type": "application/json",
      "x-api-token": resolveAdminApiTokenForServer({
        env: options.env,
        allowViteAdminTokenFallback: options.allowViteAdminTokenFallback ?? false,
      }).token,
      "X-User-Role": role,
    };
  }

  const firebaseHeaders = (await getFirebaseAuthHeaders()) as Record<string, string>;
  if (firebaseHeaders.Authorization) {
    return {
      ...firebaseHeaders,
      "Content-Type": "application/json",
      "X-User-Role": role,
    };
  }

  if (mode === "firebase_id_token") {
    throw new Error("Missing Firebase ID token for firebase_id_token mode");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${
      resolveAdminApiTokenForServer({
        env: options.env,
        allowViteAdminTokenFallback: options.allowViteAdminTokenFallback ?? true,
      }).token
    }`,
    "X-User-Role": role,
  };
}

export function buildSanitizedAdminAuthHeaderPreview(
  mode: Exclude<AdminAuthMode, "auto_legacy_compatible"> = "admin_api_token"
): string {
  if (mode === "legacy_x_api_token") {
    return "x-api-token: ***MASKED***";
  }
  return "Authorization: Bearer ***MASKED***";
}
