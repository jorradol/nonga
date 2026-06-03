/**
 * v5.6D — Per-listing buyer interest queue (server-side; in-memory repo).
 */

import type { BuyerLeadRepository } from "../../server/repositories/buyerLeadRepository";
import {
  deriveContactRevealStatusAfterOutcome,
  deriveContactRevealStatusAfterReveal,
  getNextLeadOutcomeRequiredMessage,
  TERMINAL_LEAD_CONTACT_OUTCOMES,
} from "./leadPolicy";
import type {
  BuyerLead,
  LeadContactOutcome,
  ListingInterestQueueStats,
  ListingSaleStatus,
  SellerMaskedQueueEntry,
} from "./leadTypes";
import {
  assertSellerRevealTarget,
  buildBuyerJoinedQueueMessage,
  computeNextQueuePosition,
  getListingInterestQueueStats,
  getNextRevealableLead,
  supersedeActiveQueueForListingSale,
  toSellerMaskedQueue,
} from "./buyerLeadQueuePolicy";
import { maskBuyerContact } from "./leadPolicy";

export async function listLeadsForListing(
  repository: BuyerLeadRepository,
  listingId: string
): Promise<BuyerLead[]> {
  return repository.listBuyerLeadsByListingId(listingId);
}

export async function getListingInterestStats(
  repository: BuyerLeadRepository,
  listingId: string
): Promise<ListingInterestQueueStats> {
  const leads = await listLeadsForListing(repository, listingId);
  return getListingInterestQueueStats(leads, listingId);
}

export async function assignQueuePositionOnCreate(
  repository: BuyerLeadRepository,
  listingId: string
): Promise<number> {
  const existing = await listLeadsForListing(repository, listingId);
  return computeNextQueuePosition(existing, listingId);
}

export function buyerSuccessMessageForQueue(queuePosition: number): string {
  return buildBuyerJoinedQueueMessage(queuePosition);
}

export async function sellerRevealQueueLead(params: {
  repository: BuyerLeadRepository;
  listingId: string;
  sellerId: string;
  leadId: string;
  actorUserId: string;
}): Promise<
  | { ok: true; lead: BuyerLead }
  | { ok: false; status: 400 | 403 | 404; message: string }
> {
  const leads = await listLeadsForListing(params.repository, params.listingId);
  const lead = leads.find((l) => l.id === params.leadId);
  if (!lead) {
    return { ok: false, status: 404, message: "ไม่พบลีดในคิวครับ" };
  }
  if (lead.sellerId !== params.sellerId) {
    return { ok: false, status: 403, message: "ไม่มีสิทธิ์เปิดเบอร์ลีดนี้ครับ" };
  }

  const gate = assertSellerRevealTarget(leads, params.listingId, params.leadId);
  if (gate.ok === false) {
    if (gate.code === "outcome_required") {
      return { ok: false, status: 400, message: getNextLeadOutcomeRequiredMessage() };
    }
    return {
      ok: false,
      status: 400,
      message: "ยังไม่ถึงคิวของลีดนี้ครับ กรุณาเปิดเบอร์ตามลำดับคิว",
    };
  }

  const now = new Date().toISOString();
  const updated: BuyerLead = {
    ...gate.lead,
    contactRevealStatus: deriveContactRevealStatusAfterReveal(gate.lead.contactRevealStatus),
    contactRevealedAt: now,
    status: "contact_revealed",
    updatedAt: now,
  };
  await params.repository.updateBuyerLead(updated);
  await params.repository.appendContactLog({
    id: `bclog-reveal-${Date.now()}`,
    buyerLeadId: updated.id,
    listingId: updated.listingId,
    sellerId: updated.sellerId,
    action: "contact_revealed",
    createdAt: now,
    createdByUserId: params.actorUserId,
  });
  return { ok: true, lead: updated };
}

export async function sellerRecordQueueOutcome(params: {
  repository: BuyerLeadRepository;
  listingId: string;
  sellerId: string;
  leadId: string;
  outcome: LeadContactOutcome;
  actorUserId: string;
}): Promise<
  | { ok: true; lead: BuyerLead; nextRevealableLeadId?: string }
  | { ok: false; status: 400 | 403 | 404; message: string }
> {
  if (!TERMINAL_LEAD_CONTACT_OUTCOMES.has(params.outcome)) {
    return {
      ok: false,
      status: 400,
      message: "ผลลัพธ์นี้ยังไม่ปล่อยคิวถัดไปครับ กรุณาเลือกผลที่ชัดเจนก่อน",
    };
  }

  const lead = await params.repository.getBuyerLeadById(params.leadId);
  if (!lead || lead.listingId !== params.listingId) {
    return { ok: false, status: 404, message: "ไม่พบลีดครับ" };
  }
  if (lead.sellerId !== params.sellerId) {
    return { ok: false, status: 403, message: "ไม่มีสิทธิ์อัปเดตลีดนี้ครับ" };
  }
  if (lead.contactRevealStatus !== "revealed" && lead.contactRevealStatus !== "outcome_required") {
    return { ok: false, status: 400, message: "ยังไม่ได้เปิดเบอร์ลีดนี้ครับ" };
  }

  const now = new Date().toISOString();
  const updated: BuyerLead = {
    ...lead,
    leadContactOutcome: params.outcome,
    contactRevealStatus: deriveContactRevealStatusAfterOutcome(params.outcome),
    status: params.outcome === "closed_won" ? "closed_won" : lead.status,
    updatedAt: now,
  };
  await params.repository.updateBuyerLead(updated);
  await params.repository.appendContactLog({
    id: `bclog-outcome-${Date.now()}`,
    buyerLeadId: updated.id,
    listingId: updated.listingId,
    sellerId: updated.sellerId,
    action: "outcome_updated",
    metadata: { outcome: params.outcome },
    createdAt: now,
    createdByUserId: params.actorUserId,
  });

  const refreshed = await listLeadsForListing(params.repository, params.listingId);
  const next = getNextRevealableLead(refreshed, params.listingId);
  return { ok: true, lead: updated, nextRevealableLeadId: next?.id };
}

export async function applyListingSaleToBuyerQueue(params: {
  repository: BuyerLeadRepository;
  listingId: string;
  saleStatus: ListingSaleStatus;
}): Promise<{
  supersededCount: number;
  buyerNotifications: Array<{ leadId: string; buyerUserId?: string; message: string }>;
}> {
  const leads = await listLeadsForListing(params.repository, params.listingId);
  const now = new Date().toISOString();
  const { updated, buyerNotifications } = supersedeActiveQueueForListingSale(
    leads,
    params.listingId,
    params.saleStatus,
    now
  );
  for (const lead of updated) {
    await params.repository.updateBuyerLead(lead);
  }
  return { supersededCount: updated.length, buyerNotifications };
}

export async function getSellerMaskedQueueForListing(
  repository: BuyerLeadRepository,
  listingId: string,
  sellerId: string
): Promise<SellerMaskedQueueEntry[] | { ok: false; message: string }> {
  const leads = await listLeadsForListing(repository, listingId);
  if (leads.length === 0) return [];
  if (!leads.every((l) => l.sellerId === sellerId)) {
    return { ok: false, message: "ไม่มีสิทธิ์ดูคิวของประกาศนี้ครับ" };
  }
  return toSellerMaskedQueue(leads, listingId);
}

/** Ensures seller masked rows never leak another buyer's full phone in list view. */
export function sellerQueueListNeverShowsFullPhoneOfOthers(
  entries: SellerMaskedQueueEntry[]
): boolean {
  return entries.every((e) => e.contactMasked);
}

export function buyerSelfViewHasOnlyOwnQueueFields(
  allLeads: BuyerLead[],
  viewerUserId: string
): boolean {
  const others = allLeads.filter((l) => l.buyerUserId && l.buyerUserId !== viewerUserId);
  return others.every((l) => {
    const masked = maskBuyerContact({
      displayName: l.displayName,
      contactPhone: l.contactPhone,
      revealContact: false,
    });
    return masked.phoneMasked && masked.nameMasked;
  });
}
