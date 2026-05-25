import { firebaseAuthUnavailableMessage } from "../lib/firebase";

/**
 * Client beta/dev auth headers.
 * Production must use explicit env tokens or Firebase ID token helpers.
 */

const DEFAULT_DEALER = "nonga-v4-dev-dealer-token";
const DEFAULT_ADMIN = "nonga-v4-dev-admin-token";

export interface ClientApiAuthEnv {
  DEV?: boolean;
  PROD?: boolean;
  VITE_NONGA_DEALER_API_TOKEN?: string;
  VITE_NONGA_ADMIN_API_TOKEN?: string;
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
  return requireClientToken(resolveClientAdminToken());
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

export function adminAuthHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: bearerAdmin(),
    "X-User-Role": "admin",
  };
}
