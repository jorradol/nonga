/**
 * v5.6C — Buyer lead create/read (server-side core; importable from tests).
 */

import type { MarketplaceCarRecord } from "../../server/marketplaceInventory";
import {
  buildBuyerLeadSummary,
  BUYER_LEAD_CONSENT_VERSION,
  normalizeThaiPhone,
  validateBuyerLeadCreateInput,
  type BuyerLeadCreateInput,
} from "./buyerLeadValidation";
import { toPublicBuyerLead, type BuyerLeadViewerRole } from "./buyerLeadView";
import type { BuyerLead, LeadContactLog, PurchaseMethod } from "./leadTypes";
import { LEAD_ENGINE_COLLECTIONS } from "./leadTypes";
import type { BuyerLeadRepository } from "../../server/repositories/buyerLeadRepository";
import { assignQueuePositionOnCreate, buyerSuccessMessageForQueue } from "./buyerLeadQueueService";
import {
  BUYER_LEAD_CAPTURE_DISABLED_MESSAGE,
  isLeadCaptureEnabled,
} from "./leadCaptureFlags";

export interface CreateBuyerLeadParams {
  input: BuyerLeadCreateInput;
  buyerUserId: string;
  listing: Pick<MarketplaceCarRecord, "id" | "title" | "price" | "ownerId">;
  repository: BuyerLeadRepository;
  /**
   * Optional env for kill-switch evaluation (tests).
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
  // v22.30 — global kill switch (default OFF). Blocks even authenticated create.
  if (
    !isLeadCaptureEnabled(
      params.env ??
        (process.env as Record<string, string | undefined>)
    )
  ) {
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

  const now = new Date().toISOString();
  const queuePosition = await assignQueuePositionOnCreate(
    params.repository,
    params.listing.id
  );
  const id = `blead-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

  const lead: BuyerLead = {
    id,
    listingId: params.listing.id,
    sellerId,
    buyerUserId: params.buyerUserId,
    displayName: params.input.displayName.trim(),
    contactPhone:
      normalizeThaiPhone(params.input.contactPhone) ?? params.input.contactPhone.trim(),
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
    queuePosition,
    queueLifecycle: "active",
    createdAt: now,
    updatedAt: now,
  };

  const saved = await params.repository.createBuyerLead(lead);
  const log: LeadContactLog = {
    id: `bclog-${Date.now()}`,
    buyerLeadId: saved.id,
    listingId: saved.listingId,
    sellerId: saved.sellerId,
    action: "consent_recorded",
    createdAt: now,
    createdByUserId: params.buyerUserId,
  };
  await params.repository.appendContactLog(log);

  return {
    ok: true,
    lead: saved,
    publicLead: toPublicBuyerLead(saved, "buyer_self"),
    queuePosition: saved.queuePosition,
    buyerMessage: buyerSuccessMessageForQueue(saved.queuePosition),
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
