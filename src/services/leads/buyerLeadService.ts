/**
 * v5.6C / v22.52 / v22.53 — Buyer lead create/read (server-side core; importable from tests).
 */

import type { MarketplaceCarRecord } from "../../server/marketplaceInventory";
import {
  buildBuyerLeadSummary,
  BUYER_LEAD_CONSENT_VERSION,
  normalizeThaiPhone,
  validateBuyerLeadCreateInput,
  type BuyerLeadCreateInput,
} from "./buyerLeadValidation";
import { toPublicBuyerLead } from "./buyerLeadView";
import type { BuyerLead, LeadContactLog, PurchaseMethod } from "./leadTypes";
import { LEAD_ENGINE_COLLECTIONS } from "./leadTypes";
import type { BuyerLeadRepository } from "../../server/repositories/buyerLeadRepository";
import { buyerSuccessMessageForQueue } from "./buyerLeadQueueService";
import {
  BUYER_LEAD_CAPTURE_DISABLED_MESSAGE,
  isLeadCaptureEnabled,
} from "./leadCaptureFlags";
import {
  BUYER_LEAD_DUPLICATE_ACTIVE_MESSAGE,
  findActiveDuplicateBuyerLead,
} from "./buyerLeadDuplicateGuard";
import {
  buildBuyerLeadContactFingerprint,
} from "./buyerLeadIdempotencyModel";
import {
  BUYER_LEAD_PILOT_LIMIT_MESSAGE,
  evaluatePilotCreateGate,
  parseLeadPilotConfig,
} from "./leadPilotGuard";

export interface CreateBuyerLeadParams {
  input: BuyerLeadCreateInput;
  buyerUserId: string;
  listing: Pick<
    MarketplaceCarRecord,
    "id" | "title" | "price" | "ownerId" | "dealerId" | "listingStatus" | "isSold"
  >;
  repository: BuyerLeadRepository;
  /**
   * Optional env for kill-switch / Pilot evaluation (tests).
   * Production routes omit this → uses process.env (default OFF).
   */
  env?: Record<string, string | undefined>;
}

export type CreateBuyerLeadResult =
  | {
      ok: true;
      lead: BuyerLead;
      publicLead: ReturnType<typeof toPublicBuyerLead>;
      queuePosition: number;
      buyerMessage: string;
      duplicate?: false;
    }
  | {
      ok: true;
      lead: BuyerLead;
      publicLead: ReturnType<typeof toPublicBuyerLead>;
      queuePosition: number;
      buyerMessage: string;
      duplicate: true;
    }
  | { ok: false; status: 400 | 403; message: string; errors?: string[] };

export function resolveListingSellerId(
  listing: Pick<MarketplaceCarRecord, "ownerId">
): string {
  return String(listing.ownerId ?? "").trim();
}

export async function createConsentedBuyerLead(
  params: CreateBuyerLeadParams
): Promise<CreateBuyerLeadResult> {
  const env =
    params.env ?? (process.env as Record<string, string | undefined>);

  // v22.30 — global kill switch (default OFF). Blocks even authenticated create.
  // Must run before any repository / idempotency write.
  if (!isLeadCaptureEnabled(env)) {
    return {
      ok: false,
      status: 403,
      message: BUYER_LEAD_CAPTURE_DISABLED_MESSAGE,
    };
  }

  const validation = validateBuyerLeadCreateInput(params.input, {
    checkForbiddenInSummary: true,
  });
  if (!validation.ok) {
    return {
      ok: false,
      status: 400,
      message: "ข้อมูลไม่ครบหรือยังไม่ได้ยินยอมส่งให้ผู้ขายครับ",
      errors: validation.errors,
    };
  }

  const sellerId = resolveListingSellerId(params.listing);
  if (!sellerId) {
    return { ok: false, status: 400, message: "ไม่พบผู้ขายของประกาศนี้ครับ" };
  }

  // Soft pre-check (best-effort). Authoritative dedupe is createBuyerLeadAtomic.
  // Duplicate replay must not consume a Pilot slot.
  const existingForListing = await params.repository.listBuyerLeadsByListingId(
    params.listing.id
  );
  const softDup = findActiveDuplicateBuyerLead({
    existing: existingForListing,
    listingId: params.listing.id,
    buyerUserId: params.buyerUserId,
  });
  if (softDup) {
    return {
      ok: true,
      lead: softDup,
      publicLead: toPublicBuyerLead(softDup, "buyer_self"),
      queuePosition: softDup.queuePosition,
      buyerMessage: BUYER_LEAD_DUPLICATE_ACTIVE_MESSAGE,
      duplicate: true,
    };
  }

  // v22.53 — Pilot gate (allowlist / dealer / window / soft count).
  // Authoritative max is enforced inside createBuyerLeadAtomic via durable counter.
  const pilotParsed = parseLeadPilotConfig(env);
  const softPilotCount = pilotParsed.ok
    ? await params.repository.getPilotCreatedCount(pilotParsed.config.counterId)
    : 0;

  const pilotGate = evaluatePilotCreateGate({
    env,
    listing: params.listing,
    createdCount: softPilotCount,
  });
  if (!pilotGate.ok) {
    return {
      ok: false,
      status: pilotGate.status,
      message: pilotGate.message,
    };
  }

  const now = new Date().toISOString();
  const id = `blead-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const normalizedPhone =
    normalizeThaiPhone(params.input.contactPhone) ??
    params.input.contactPhone.trim();
  const summary =
    params.input.buyerSummary?.trim() ||
    buildBuyerLeadSummary({
      displayName: params.input.displayName.trim(),
      purchaseMethod: params.input.purchaseMethod,
      budgetMin: params.input.budgetMin,
      budgetMax: params.input.budgetMax,
      offeredPrice: params.input.offeredPrice,
      preferredContactWindow: params.input.preferredContactWindow.trim(),
      listingTitle: params.listing.title,
    });

  // queuePosition placeholder — atomic path recomputes inside the transaction.
  const lead: BuyerLead = {
    id,
    listingId: params.listing.id,
    sellerId,
    buyerUserId: params.buyerUserId,
    displayName: params.input.displayName.trim(),
    contactPhone: normalizedPhone,
    ...(params.input.budgetMin != null ? { budgetMin: params.input.budgetMin } : {}),
    ...(params.input.budgetMax != null ? { budgetMax: params.input.budgetMax } : {}),
    purchaseMethod: params.input.purchaseMethod,
    ...(params.input.offeredPrice != null ? { offeredPrice: params.input.offeredPrice } : {}),
    preferredContactWindow: params.input.preferredContactWindow.trim(),
    buyerSummary: summary,
    consent: {
      version: BUYER_LEAD_CONSENT_VERSION,
      consentedAt: now,
      listingId: params.listing.id,
    },
    source: "chat",
    status: "consented",
    contactRevealStatus: "locked",
    queuePosition: 0,
    queueLifecycle: "active",
    createdAt: now,
    updatedAt: now,
  };

  const log: LeadContactLog = {
    id: `bclog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    buyerLeadId: lead.id,
    listingId: lead.listingId,
    sellerId: lead.sellerId,
    action: "consent_recorded",
    createdAt: now,
    createdByUserId: params.buyerUserId,
  };

  const atomic = await params.repository.createBuyerLeadAtomic({
    lead,
    contactLog: log,
    contactFingerprint: buildBuyerLeadContactFingerprint(normalizedPhone),
    pilotLimit: {
      counterId: pilotGate.config.counterId,
      maxCreated: pilotGate.config.maxCreated,
    },
  });

  if (atomic.kind === "duplicate") {
    return {
      ok: true,
      lead: atomic.lead,
      publicLead: toPublicBuyerLead(atomic.lead, "buyer_self"),
      queuePosition: atomic.lead.queuePosition,
      buyerMessage: BUYER_LEAD_DUPLICATE_ACTIVE_MESSAGE,
      duplicate: true,
    };
  }

  if (atomic.kind === "pilot_limit") {
    return {
      ok: false,
      status: 403,
      message: BUYER_LEAD_PILOT_LIMIT_MESSAGE,
    };
  }

  return {
    ok: true,
    lead: atomic.lead,
    publicLead: toPublicBuyerLead(atomic.lead, "buyer_self"),
    queuePosition: atomic.lead.queuePosition,
    buyerMessage: buyerSuccessMessageForQueue(atomic.lead.queuePosition),
    duplicate: false,
  };
}

export function parseBuyerLeadCreateBody(
  body: Record<string, unknown>
): BuyerLeadCreateInput | null {
  const listingId = String(body.listingId ?? "").trim();
  const displayName = String(body.displayName ?? "").trim();
  const contactPhone = String(body.contactPhone ?? "").trim();
  const preferredContactWindow = String(body.preferredContactWindow ?? "").trim();
  const purchaseMethod = String(body.purchaseMethod ?? "").trim() as PurchaseMethod;
  if (
    purchaseMethod !== "cash" &&
    purchaseMethod !== "finance" &&
    purchaseMethod !== "undecided"
  ) {
    return null;
  }
  const consentConfirmed = body.consentConfirmed === true;
  const consentVersion = String(body.consentVersion ?? "").trim();
  const budgetMin = parseOptionalNumber(body.budgetMin);
  const budgetMax = parseOptionalNumber(body.budgetMax);
  const offeredPrice = parseOptionalNumber(body.offeredPrice);
  const buyerSummary =
    typeof body.buyerSummary === "string" ? body.buyerSummary.trim() : undefined;

  return {
    listingId,
    displayName,
    contactPhone,
    purchaseMethod,
    preferredContactWindow,
    consentConfirmed,
    consentVersion,
    ...(budgetMin != null ? { budgetMin } : {}),
    ...(budgetMax != null ? { budgetMax } : {}),
    ...(offeredPrice != null ? { offeredPrice } : {}),
    ...(buyerSummary ? { buyerSummary } : {}),
  };
}

function parseOptionalNumber(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export { LEAD_ENGINE_COLLECTIONS };
