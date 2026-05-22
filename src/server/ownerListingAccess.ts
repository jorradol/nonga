import type { Request } from "express";
import type { MarketplaceCarRecord } from "./marketplaceInventory";
import { extractBearer } from "./apiAuth";

const DEFAULT_ADMIN_TOKEN = "nonga-v4-dev-admin-token";

function adminToken(): string {
  return (
    process.env.NONGA_ADMIN_API_TOKEN?.trim() ||
    (process.env.NODE_ENV === "production" ? "" : DEFAULT_ADMIN_TOKEN)
  );
}

export function isAdminRequest(req: Request): boolean {
  const expected = adminToken();
  if (!expected) return false;
  const token = extractBearer(req);
  return Boolean(token && token === expected);
}

export function getRequestOwnerId(req: Request): string {
  const header = req.headers["x-owner-id"];
  if (typeof header === "string" && header.trim()) return header.trim();
  const body = req.body as { ownerId?: string } | undefined;
  if (body?.ownerId?.trim()) return body.ownerId.trim();
  return "";
}

export function canManageListing(
  req: Request,
  car: MarketplaceCarRecord
): boolean {
  if (isAdminRequest(req)) return true;
  const ownerId = getRequestOwnerId(req);
  return Boolean(ownerId && ownerId === car.ownerId);
}
