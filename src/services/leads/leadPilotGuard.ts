/**
 * v22.53 — Controlled Real Lead Pilot server guard (no secrets / no Buyer PII).
 *
 * When Lead Capture is ON, Pilot config is required (fail closed).
 * Enforces: listing allowlist, dealer ownership, max created count, expiry window.
 * Duplicate replay must not consume a Pilot slot (caller checks duplicate first;
 * durable counter increments only on new creates).
 */

import {
  resolveCarDealerId,
  type MarketplaceCarRecord,
} from "../../server/marketplaceInventory";
import { isLeadCaptureEnabled } from "./leadCaptureFlags";

export const NONGA_LEAD_PILOT_LISTING_IDS_ENV = "NONGA_LEAD_PILOT_LISTING_IDS";
export const NONGA_LEAD_PILOT_MAX_CREATED_ENV = "NONGA_LEAD_PILOT_MAX_CREATED";
export const NONGA_LEAD_PILOT_EXPIRES_AT_ENV = "NONGA_LEAD_PILOT_EXPIRES_AT";
export const NONGA_LEAD_PILOT_STARTED_AT_ENV = "NONGA_LEAD_PILOT_STARTED_AT";
export const NONGA_LEAD_PILOT_DEALER_IDS_ENV = "NONGA_LEAD_PILOT_DEALER_IDS";
/** Durable Firestore/memory counter doc id (no PII). */
export const NONGA_LEAD_PILOT_COUNTER_ID_ENV = "NONGA_LEAD_PILOT_COUNTER_ID";
/**
 * Test-only: allow maxCreated > 3 for isolated suites.
 * Must never be set on Staging/Production Cloud Run.
 */
export const NONGA_LEAD_PILOT_TEST_RELAX_MAX_ENV = "NONGA_LEAD_PILOT_TEST_RELAX_MAX";

export const DEFAULT_LEAD_PILOT_COUNTER_ID = "controlled-real-lead-v2253";

export const BUYER_LEAD_PILOT_NOT_ELIGIBLE_MESSAGE =
  "ประกาศนี้ยังไม่เปิดรับลีดในรอบ pilot นี้ครับ";

export const BUYER_LEAD_PILOT_EXPIRED_MESSAGE =
  "รอบรับลีด pilot นี้สิ้นสุดแล้วครับ — ยังไม่มีการบันทึกลีดใหม่";

export const BUYER_LEAD_PILOT_LIMIT_MESSAGE =
  "รอบรับลีด pilot นี้ครบจำนวนแล้วครับ — ยังไม่มีการบันทึกลีดใหม่";

export const BUYER_LEAD_PILOT_CONFIG_INVALID_MESSAGE =
  "ระบบรับลีดยังไม่พร้อมในรอบนี้ครับ — ยังไม่มีการบันทึกลีด";

export type LeadPilotConfig = {
  listingIds: string[];
  dealerIds: string[];
  maxCreated: number;
  startedAt: string;
  expiresAt: string;
  counterId: string;
};

export type LeadPilotConfigResult =
  | { ok: true; config: LeadPilotConfig }
  | { ok: false; reason: "missing" | "invalid" };

function splitCsv(raw: string | undefined): string[] {
  return String(raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseLeadPilotConfig(
  env: Record<string, string | undefined> = process.env as Record<
    string,
    string | undefined
  >
): LeadPilotConfigResult {
  const listingIds = splitCsv(env[NONGA_LEAD_PILOT_LISTING_IDS_ENV]);
  const dealerIds = splitCsv(env[NONGA_LEAD_PILOT_DEALER_IDS_ENV]);
  const maxRaw = String(env[NONGA_LEAD_PILOT_MAX_CREATED_ENV] ?? "").trim();
  const expiresAt = String(env[NONGA_LEAD_PILOT_EXPIRES_AT_ENV] ?? "").trim();
  const startedAt = String(env[NONGA_LEAD_PILOT_STARTED_AT_ENV] ?? "").trim();
  const counterId =
    String(env[NONGA_LEAD_PILOT_COUNTER_ID_ENV] ?? "").trim() ||
    DEFAULT_LEAD_PILOT_COUNTER_ID;

  if (
    listingIds.length === 0 ||
    dealerIds.length === 0 ||
    !maxRaw ||
    !expiresAt ||
    !startedAt
  ) {
    return { ok: false, reason: "missing" };
  }

  const maxCreated = Number(maxRaw);
  const relaxMax = String(env[NONGA_LEAD_PILOT_TEST_RELAX_MAX_ENV] ?? "").trim() === "1";
  const maxCeiling = relaxMax ? 100 : 3;
  if (!Number.isInteger(maxCreated) || maxCreated < 1 || maxCreated > maxCeiling) {
    // Hard ceiling: Owner Pilot authorization is max 3 (unless isolated test relax).
    return { ok: false, reason: "invalid" };
  }

  const expMs = Date.parse(expiresAt);
  const startMs = Date.parse(startedAt);
  if (Number.isNaN(expMs) || Number.isNaN(startMs)) {
    return { ok: false, reason: "invalid" };
  }
  if (expMs <= startMs) {
    return { ok: false, reason: "invalid" };
  }
  // Max window 7 days (+1h clock skew tolerance).
  const maxWindowMs = 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000;
  if (expMs - startMs > maxWindowMs) {
    return { ok: false, reason: "invalid" };
  }

  return {
    ok: true,
    config: {
      listingIds,
      dealerIds,
      maxCreated,
      startedAt,
      expiresAt,
      counterId,
    },
  };
}

export function isPilotListingAllowed(
  listingId: string,
  config: LeadPilotConfig
): boolean {
  return config.listingIds.includes(listingId.trim());
}

export function isPilotDealerAllowed(
  listing: Pick<MarketplaceCarRecord, "ownerId" | "dealerId">,
  config: LeadPilotConfig
): boolean {
  const dealerId = resolveCarDealerId(
    listing as MarketplaceCarRecord
  );
  return config.dealerIds.some(
    (allowed) => allowed.trim() === dealerId || allowed.trim() === String(listing.ownerId ?? "").trim()
  );
}

export function isPilotWindowOpen(
  config: LeadPilotConfig,
  nowMs: number = Date.now()
): boolean {
  const start = Date.parse(config.startedAt);
  const end = Date.parse(config.expiresAt);
  if (Number.isNaN(start) || Number.isNaN(end)) return false;
  return nowMs >= start && nowMs <= end;
}

export type PilotCreateGateResult =
  | { ok: true; config: LeadPilotConfig }
  | {
      ok: false;
      status: 403;
      message: string;
      code:
        | "capture_off"
        | "config_invalid"
        | "listing_not_allowed"
        | "dealer_not_allowed"
        | "expired"
        | "limit_reached"
        | "listing_not_ready";
    };

/**
 * Server-authoritative Pilot gate for a new Lead create (not duplicate replay).
 * Capture OFF is handled by the kill switch first; this still fail-closes if
 * Capture is ON but Pilot config is missing/invalid.
 */
export function evaluatePilotCreateGate(params: {
  env?: Record<string, string | undefined>;
  listing: Pick<
    MarketplaceCarRecord,
    "id" | "ownerId" | "dealerId" | "listingStatus" | "isSold"
  >;
  /** Authoritative created count for Pilot listings (includes withdrawn). */
  createdCount: number;
  nowMs?: number;
}): PilotCreateGateResult {
  const env =
    params.env ?? (process.env as Record<string, string | undefined>);

  if (!isLeadCaptureEnabled(env)) {
    return {
      ok: false,
      status: 403,
      message: BUYER_LEAD_PILOT_CONFIG_INVALID_MESSAGE,
      code: "capture_off",
    };
  }

  const parsed = parseLeadPilotConfig(env);
  if (!parsed.ok) {
    return {
      ok: false,
      status: 403,
      message: BUYER_LEAD_PILOT_CONFIG_INVALID_MESSAGE,
      code: "config_invalid",
    };
  }
  const { config } = parsed;

  if (!isPilotWindowOpen(config, params.nowMs ?? Date.now())) {
    return {
      ok: false,
      status: 403,
      message: BUYER_LEAD_PILOT_EXPIRED_MESSAGE,
      code: "expired",
    };
  }

  if (!isPilotListingAllowed(params.listing.id, config)) {
    return {
      ok: false,
      status: 403,
      message: BUYER_LEAD_PILOT_NOT_ELIGIBLE_MESSAGE,
      code: "listing_not_allowed",
    };
  }

  if (
    params.listing.isSold ||
    params.listing.listingStatus === "hidden" ||
    params.listing.listingStatus === "pending_review"
  ) {
    return {
      ok: false,
      status: 403,
      message: BUYER_LEAD_PILOT_NOT_ELIGIBLE_MESSAGE,
      code: "listing_not_ready",
    };
  }

  if (!isPilotDealerAllowed(params.listing, config)) {
    return {
      ok: false,
      status: 403,
      message: BUYER_LEAD_PILOT_NOT_ELIGIBLE_MESSAGE,
      code: "dealer_not_allowed",
    };
  }

  if (params.createdCount >= config.maxCreated) {
    return {
      ok: false,
      status: 403,
      message: BUYER_LEAD_PILOT_LIMIT_MESSAGE,
      code: "limit_reached",
    };
  }

  return { ok: true, config };
}

/** Safe health/diagnostic — no listing IDs, no PII. */
export function getLeadPilotHealthSnapshot(
  env: Record<string, string | undefined> = process.env as Record<
    string,
    string | undefined
  >
): {
  leadPilotConfigured: boolean;
  leadPilotActive: boolean;
  leadPilotMaxCreated: number | null;
  leadPilotExpiresAt: string | null;
} {
  const captureOn = isLeadCaptureEnabled(env);
  const parsed = parseLeadPilotConfig(env);
  if (!parsed.ok) {
    return {
      leadPilotConfigured: false,
      leadPilotActive: false,
      leadPilotMaxCreated: null,
      leadPilotExpiresAt: null,
    };
  }
  const open = isPilotWindowOpen(parsed.config);
  return {
    leadPilotConfigured: true,
    leadPilotActive: captureOn && open,
    leadPilotMaxCreated: parsed.config.maxCreated,
    leadPilotExpiresAt: parsed.config.expiresAt,
  };
}
