import type { Request } from "express";
import {
  getDealerInventoryCars,
  getOwnerMarketplaceCars,
  resolveCarDealerId,
  type MarketplaceCarRecord,
} from "./marketplaceInventory";
import { extractBearer } from "./apiAuth";
import { getServerAuthContext } from "./serverAuthContext";
import { normalizeDealerId } from "../utils/dealerIdentity";

const DEFAULT_DEALER_TOKEN = "nonga-v4-dev-dealer-token";
const DEFAULT_ADMIN_TOKEN = "nonga-v4-dev-admin-token";

export type OwnerAuthProvider = "firebase" | "beta-token" | "dev-stub" | "dev-legacy";

export interface OwnerRequestScope {
  ownerId: string | null;
  dealerId: string | null;
  isAdmin: boolean;
  role: string;
  provider: OwnerAuthProvider;
}

export type OwnerAccessResult =
  | { ok: true; scope: OwnerRequestScope }
  | { ok: false; status: 401 | 403; message: string };

function adminToken(): string {
  return (
    process.env.NONGA_ADMIN_API_TOKEN?.trim() ||
    (process.env.NODE_ENV === "production" ? "" : DEFAULT_ADMIN_TOKEN)
  );
}

function dealerToken(): string {
  return (
    process.env.NONGA_DEALER_API_TOKEN?.trim() ||
    (process.env.NODE_ENV === "production" ? "" : DEFAULT_DEALER_TOKEN)
  );
}

function dealerOwnerId(dealerId: string): string {
  return `owner-${normalizeDealerId(dealerId)}`;
}

function readBody(req: Request): Record<string, unknown> {
  return (req.body ?? {}) as Record<string, unknown>;
}

function requestOwnerId(req: Request): string {
  const header = req.headers["x-owner-id"];
  if (typeof header === "string" && header.trim()) return header.trim();
  const body = readBody(req);
  const bodyOwner = body.ownerId;
  if (typeof bodyOwner === "string" && bodyOwner.trim()) return bodyOwner.trim();
  const queryOwner = req.query.ownerId;
  if (typeof queryOwner === "string" && queryOwner.trim()) return queryOwner.trim();
  return "";
}

function requestedDealerId(req: Request): string {
  const header = req.headers["x-dealer-id"];
  if (typeof header === "string" && header.trim()) {
    return normalizeDealerId(header);
  }
  const bodyDealer = readBody(req).dealerId;
  if (typeof bodyDealer === "string" && bodyDealer.trim()) {
    return normalizeDealerId(bodyDealer);
  }
  const queryDealer = req.query.dealerId;
  if (typeof queryDealer === "string" && queryDealer.trim()) {
    return normalizeDealerId(queryDealer);
  }
  return "";
}

type DealerTokenBinding = {
  token: string;
  dealerId: string;
  uid?: string;
};

function parseDealerTokenMap(): DealerTokenBinding[] {
  const rawMap = process.env.NONGA_DEALER_TOKEN_MAP?.trim();
  if (rawMap) {
    try {
      const parsed = JSON.parse(rawMap);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => {
            const token = String(item?.token ?? "").trim();
            const dealerId = normalizeDealerId(String(item?.dealerId ?? ""));
            const uid = String(item?.uid ?? "").trim();
            return token && dealerId
              ? { token, dealerId, ...(uid ? { uid } : {}) }
              : null;
          })
          .filter((item): item is DealerTokenBinding => item !== null);
      }
      if (parsed && typeof parsed === "object") {
        return Object.entries(parsed)
          .map(([dealerId, token]) => {
            const normalizedDealerId = normalizeDealerId(dealerId);
            const normalizedToken = String(token ?? "").trim();
            return normalizedDealerId && normalizedToken
              ? { dealerId: normalizedDealerId, token: normalizedToken }
              : null;
          })
          .filter((item): item is DealerTokenBinding => item !== null);
      }
    } catch (err) {
      console.warn("Invalid NONGA_DEALER_TOKEN_MAP JSON:", err);
    }
  }

  const betaDealerId = normalizeDealerId(
    process.env.NONGA_BETA_DEALER_ID?.trim() || ""
  );
  const betaToken = process.env.NONGA_DEALER_API_TOKEN?.trim();
  if (betaDealerId && betaToken) {
    return [{ dealerId: betaDealerId, token: betaToken }];
  }
  return [];
}

export function isAdminRequest(req: Request): boolean {
  const expected = adminToken();
  if (!expected) return false;
  const token = extractBearer(req);
  return Boolean(token && token === expected);
}

export function getRequestOwnerId(req: Request): string {
  return requestOwnerId(req);
}

function devLegacyScope(req: Request): OwnerAccessResult {
  if (process.env.NODE_ENV === "production") {
    return {
      ok: false,
      status: 401,
      message: "กรุณาเข้าสู่ระบบก่อนใช้งานส่วนนี้ครับ",
    };
  }

  const dealerId = requestedDealerId(req);
  const ownerId = requestOwnerId(req) || (dealerId ? dealerOwnerId(dealerId) : "");
  if (!ownerId && !dealerId) {
    return {
      ok: false,
      status: 403,
      message: "ไม่พบข้อมูลเจ้าของประกาศ",
    };
  }

  return {
    ok: true,
    scope: {
      ownerId: ownerId || null,
      dealerId: dealerId || null,
      isAdmin: false,
      role: String(req.headers["x-user-role"] ?? "dev"),
      provider: "dev-legacy",
    },
  };
}

export async function resolveOwnerRequestScope(
  req: Request
): Promise<OwnerAccessResult> {
  const token = extractBearer(req);
  const requestedDealer = requestedDealerId(req);

  if (token) {
    const expectedAdmin = adminToken();
    if (expectedAdmin && token === expectedAdmin) {
      return {
        ok: true,
        scope: {
          ownerId: requestOwnerId(req) || null,
          dealerId: requestedDealer || null,
          isAdmin: true,
          role: String(req.headers["x-user-role"] ?? "admin"),
          provider: "dev-stub",
        },
      };
    }

    const bound = parseDealerTokenMap().find((item) => item.token === token);
    if (bound) {
      if (requestedDealer && requestedDealer !== bound.dealerId) {
        return {
          ok: false,
          status: 403,
          message: "dealerId ไม่ตรงกับสิทธิ์ของบัญชีนี้",
        };
      }
      return {
        ok: true,
        scope: {
          ownerId: dealerOwnerId(bound.dealerId),
          dealerId: bound.dealerId,
          isAdmin: false,
          role: "dealer",
          provider: "beta-token",
        },
      };
    }

    const expectedDealer = dealerToken();
    if (
      process.env.NODE_ENV !== "production" &&
      expectedDealer &&
      token === expectedDealer
    ) {
      if (!requestedDealer) {
        return {
          ok: false,
          status: 403,
          message: "ต้องระบุ dealerId",
        };
      }
      return {
        ok: true,
        scope: {
          ownerId: dealerOwnerId(requestedDealer),
          dealerId: requestedDealer,
          isAdmin: false,
          role: "dealer",
          provider: "dev-stub",
        },
      };
    }

    try {
      const context = await getServerAuthContext(req);
      if (context.status === "suspended") {
        return {
          ok: false,
          status: 403,
          message: "บัญชีนี้ถูกระงับการใช้งานครับ กรุณาติดต่อผู้ดูแลระบบ",
        };
      }
      if (context.role === "admin" || context.role === "superadmin") {
        return {
          ok: true,
          scope: {
            ownerId: requestOwnerId(req) || null,
            dealerId: requestedDealer || context.dealerId || null,
            isAdmin: true,
            role: context.role,
            provider: "firebase",
          },
        };
      }

      if (context.dealerId) {
        if (requestedDealer && requestedDealer !== context.dealerId) {
          return {
            ok: false,
            status: 403,
            message: "dealerId ไม่ตรงกับสิทธิ์ของบัญชีนี้",
          };
        }
        return {
          ok: true,
          scope: {
            ownerId: dealerOwnerId(context.dealerId),
            dealerId: context.dealerId,
            isAdmin: false,
            role: context.role,
            provider: "firebase",
          },
        };
      }

      return {
        ok: true,
        scope: {
          ownerId: context.uid,
          dealerId: null,
          isAdmin: false,
          role: context.role,
          provider: "firebase",
        },
      };
    } catch {
      if (process.env.NODE_ENV === "production") {
        return {
          ok: false,
          status: 401,
          message: "กรุณาเข้าสู่ระบบก่อนใช้งานส่วนนี้ครับ",
        };
      }
    }
  }

  return devLegacyScope(req);
}

export function canManageListing(
  req: Request,
  car: MarketplaceCarRecord
): boolean {
  if (isAdminRequest(req)) return true;
  const ownerId = getRequestOwnerId(req);
  return Boolean(ownerId && ownerId === car.ownerId);
}

export function canManageListingWithScope(
  scope: OwnerRequestScope,
  car: MarketplaceCarRecord
): boolean {
  if (scope.isAdmin) return true;
  if (scope.dealerId && resolveCarDealerId(car) === scope.dealerId) return true;
  return Boolean(scope.ownerId && scope.ownerId === car.ownerId);
}

export function getListingsForScope(scope: OwnerRequestScope): MarketplaceCarRecord[] {
  if (scope.dealerId) return getDealerInventoryCars(scope.dealerId);
  if (scope.ownerId) return getOwnerMarketplaceCars(scope.ownerId);
  return [];
}

export function resolveCreateListingOwner(
  scope: OwnerRequestScope,
  body: Record<string, unknown>
): { ownerId: string; dealerId?: string } | { error: string } {
  if (scope.dealerId) {
    return { ownerId: dealerOwnerId(scope.dealerId), dealerId: scope.dealerId };
  }
  if (scope.ownerId) {
    return { ownerId: scope.ownerId };
  }
  if (scope.isAdmin) {
    const ownerId = typeof body.ownerId === "string" ? body.ownerId.trim() : "";
    const dealerId =
      typeof body.dealerId === "string" ? normalizeDealerId(body.dealerId) : "";
    if (ownerId || dealerId) {
      return { ownerId: ownerId || dealerOwnerId(dealerId), ...(dealerId ? { dealerId } : {}) };
    }
  }
  return { error: "ไม่พบข้อมูลเจ้าของประกาศ" };
}
