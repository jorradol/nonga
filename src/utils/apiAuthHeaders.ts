/**
 * Client auth headers — stub ก่อน Firebase Auth
 * ตั้งใน .env: VITE_NONGA_DEALER_API_TOKEN, VITE_NONGA_ADMIN_API_TOKEN
 */

const DEFAULT_DEALER = "nonga-v4-dev-dealer-token";
const DEFAULT_ADMIN = "nonga-v4-dev-admin-token";

function readViteEnv(key: string): string {
  try {
    const meta = import.meta as { env?: Record<string, string | undefined> };
    const v = meta.env?.[key];
    return typeof v === "string" ? v.trim() : "";
  } catch {
    return "";
  }
}

function dealerToken(): string {
  return readViteEnv("VITE_NONGA_DEALER_API_TOKEN") || DEFAULT_DEALER;
}

function adminToken(): string {
  return readViteEnv("VITE_NONGA_ADMIN_API_TOKEN") || DEFAULT_ADMIN;
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
