import type { Request, Response, NextFunction } from "express";
import { normalizeDealerId, THOR_AUTO_DEALER_ID } from "../utils/dealerIdentity";

/** ข้อมูล auth หลังผ่าน guard — เตรียมต่อ Firebase ID token */
export interface ApiAuthContext {
  role: "dealer" | "admin" | "superadmin";
  dealerId?: string;
  uid?: string;
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

/** Guard /api/dealer/* — ต้องมี Bearer token ของ dealer + X-Dealer-Id */
export function dealerApiAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const expected = dealerToken();
  if (!expected) {
    unauthorized(res, "NONGA_DEALER_API_TOKEN ไม่ได้ตั้งค่า");
    return;
  }
  const token = extractBearer(req);
  if (!token || token !== expected) {
    unauthorized(res, "Unauthorized — ต้องส่ง Authorization: Bearer <dealer-token>");
    return;
  }

  const rawDealer = req.headers["x-dealer-id"];
  const dealerId =
    typeof rawDealer === "string" && rawDealer.trim()
      ? normalizeDealerId(rawDealer)
      : "";

  if (!dealerId) {
    res.status(403).json({
      success: false,
      message: "ต้องระบุ X-Dealer-Id ที่ตรงกับบัญชี dealer",
    });
    return;
  }

  req.apiAuth = {
    role: "dealer",
    dealerId,
    uid: `dealer-${dealerId}`,
    provider: "stub",
  };
  next();
}

/** Guard /api/admin/* — ต้องมี Bearer token ของ admin */
export function adminApiAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const expected = adminToken();
  if (!expected) {
    unauthorized(res, "NONGA_ADMIN_API_TOKEN ไม่ได้ตั้งค่า");
    return;
  }
  const token = extractBearer(req);
  if (!token || token !== expected) {
    unauthorized(
      res,
      "Unauthorized — ต้องส่ง Authorization: Bearer <admin-token>"
    );
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
  return {
    dealerToken: dealerToken() || DEFAULT_DEALER_TOKEN,
    adminToken: adminToken() || DEFAULT_ADMIN_TOKEN,
  };
}
