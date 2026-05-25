import type { Request, Response, NextFunction } from "express";
import { normalizeDealerId, THOR_AUTO_DEALER_ID } from "../utils/dealerIdentity";
import type { AuthRole, DealerMembership, UserStatus } from "../utils/rbac";
import {
  authorizeDealerScope,
  getServerAuthContext,
  ServerAuthError,
} from "./serverAuthContext";

/** ข้อมูล auth หลังผ่าน guard — เตรียมต่อ Firebase ID token */
export interface ApiAuthContext {
  role: AuthRole;
  dealerId?: string;
  uid?: string;
  email?: string;
  displayName?: string;
  status?: UserStatus;
  dealerName?: string;
  memberships?: DealerMembership[];
  provider: "stub" | "firebase";
}

declare global {
  namespace Express {
    interface Request {
      apiAuth?: ApiAuthContext;
    }
  }
}

const DEFAULT_DEALER_TOKEN = "nonga-v4-dev-dealer-token";
const DEFAULT_ADMIN_TOKEN = "nonga-v4-dev-admin-token";

type DealerTokenBinding = {
  token: string;
  dealerId: string;
  uid?: string;
};

function dealerToken(): string {
  return (
    process.env.NONGA_DEALER_API_TOKEN?.trim() ||
    (process.env.NODE_ENV === "production" ? "" : DEFAULT_DEALER_TOKEN)
  );
}

function adminToken(): string {
  return (
    process.env.NONGA_ADMIN_API_TOKEN?.trim() ||
    (process.env.NODE_ENV === "production" ? "" : DEFAULT_ADMIN_TOKEN)
  );
}

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
    return [
      {
        dealerId: betaDealerId,
        token: betaToken,
        uid: `dealer-${betaDealerId}`,
      },
    ];
  }

  return [];
}

export function extractBearer(req: Request): string | null {
  const auth = req.headers.authorization;
  if (typeof auth === "string" && auth.startsWith("Bearer ")) {
    return auth.slice(7).trim();
  }
  const legacy = req.headers["x-api-token"];
  if (typeof legacy === "string" && legacy.trim()) {
    return legacy.trim();
  }
  return null;
}

function unauthorized(res: Response, message: string): void {
  res.status(401).json({ success: false, message });
}

function forbidden(res: Response, message: string): void {
  res.status(403).json({ success: false, message });
}

/** Guard /api/dealer/* — beta/prod ต้อง bind Bearer token กับ dealerId ฝั่ง server */
export function dealerApiAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = extractBearer(req);
  if (!token) {
    unauthorized(res, "Unauthorized — ต้องส่ง Authorization: Bearer <dealer-token>");
    return;
  }

  const rawDealer = req.headers["x-dealer-id"];
  const requestedDealerId =
    typeof rawDealer === "string" && rawDealer.trim()
      ? normalizeDealerId(rawDealer)
      : "";

  const bindings = parseDealerTokenMap();
  const bound = bindings.find((item) => item.token === token);
  if (bound) {
    if (requestedDealerId && requestedDealerId !== bound.dealerId) {
      res.status(403).json({
        success: false,
        message: "dealerId ไม่ตรงกับ session/token ของบัญชีนี้",
      });
      return;
    }

    req.apiAuth = {
      role: "dealer",
      dealerId: bound.dealerId,
      uid: bound.uid ?? `dealer-${bound.dealerId}`,
      provider: "stub",
    };
    next();
    return;
  }

  getServerAuthContext(req)
    .then((context) => {
      const scope = authorizeDealerScope(context, requestedDealerId);
      if (scope.ok === false) {
        forbidden(res, scope.message);
        return;
      }

      req.apiAuth = {
        role: context.role,
        dealerId: scope.dealerId,
        uid: context.uid,
        email: context.email,
        displayName: context.displayName,
        status: context.status,
        dealerName: context.dealerName,
        memberships: context.memberships,
        provider: "firebase",
      };
      next();
    })
    .catch((err) => {
      if (err instanceof ServerAuthError && err.status === 403) {
        res.status(err.status).json({
          success: false,
          message: err.message || "บัญชีนี้ไม่มีสิทธิ์ใช้งานส่วนนี้ครับ",
        });
        return;
      }
      if (process.env.NODE_ENV === "production") {
        const status = err instanceof ServerAuthError ? err.status : 401;
        res.status(status).json({
          success: false,
          message:
            status === 401
              ? "กรุณาเข้าสู่ระบบก่อนใช้งานส่วนนี้ครับ"
              : "บัญชีนี้ไม่มีสิทธิ์ใช้งานส่วนนี้ครับ",
        });
        return;
      }

      const expected = dealerToken();
      if (!expected || token !== expected) {
        unauthorized(res, "Unauthorized — dealer token ไม่ถูกต้อง");
        return;
      }

      if (!requestedDealerId) {
        res.status(403).json({
          success: false,
          message: "ต้องระบุ X-Dealer-Id ที่ตรงกับบัญชี dealer",
        });
        return;
      }

      req.apiAuth = {
        role: "dealer",
        dealerId: requestedDealerId,
        uid: `dealer-${requestedDealerId}`,
        provider: "stub",
      };
      next();
    });
}

/** Guard /api/admin/* — ต้องมี Bearer token ของ admin */
export function adminApiAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const expected = adminToken();
  const token = extractBearer(req);
  if (!token) {
    unauthorized(res, "กรุณาเข้าสู่ระบบก่อนใช้งานส่วนนี้ครับ");
    return;
  }

  if (!expected || token !== expected) {
    getServerAuthContext(req)
      .then((context) => {
        if (context.role !== "admin" && context.role !== "superadmin") {
          forbidden(res, "บัญชีนี้ไม่มีสิทธิ์เข้าถึงส่วนผู้ดูแลระบบครับ");
          return;
        }
        req.apiAuth = {
          role: context.role,
          dealerId: context.dealerId,
          uid: context.uid,
          email: context.email,
          displayName: context.displayName,
          status: context.status,
          dealerName: context.dealerName,
          memberships: context.memberships,
          provider: "firebase",
        };
        next();
      })
      .catch((err) => {
        const status = err instanceof ServerAuthError ? err.status : 401;
        res.status(status).json({
          success: false,
          message:
            status === 401
              ? "กรุณาเข้าสู่ระบบก่อนใช้งานส่วนนี้ครับ"
              : "บัญชีนี้ไม่มีสิทธิ์เข้าถึงส่วนผู้ดูแลระบบครับ",
        });
      });
    return;
  }

  const roleHeader = String(req.headers["x-user-role"] ?? "admin");
  const isSuper = roleHeader === "superadmin";

  req.apiAuth = {
    role: isSuper ? "superadmin" : "admin",
    dealerId: THOR_AUTO_DEALER_ID,
    uid: "admin",
    provider: "stub",
  };
  next();
}

/** สำหรับทดสอบ / เอกสาร */
export function getStubTokensForDev(): {
  dealerToken: string;
  adminToken: string;
} {
  if (process.env.NODE_ENV === "production") {
    return {
      dealerToken: dealerToken(),
      adminToken: adminToken(),
    };
  }
  return {
    dealerToken: dealerToken() || DEFAULT_DEALER_TOKEN,
    adminToken: adminToken() || DEFAULT_ADMIN_TOKEN,
  };
}
