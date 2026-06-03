/**
 * v5.6D — Per-listing buyer interest queue (pure policy, no I/O).
 */

import {
  canRevealNextLeadForListing,
  hasTerminalLeadContactOutcome,
  maskBuyerContact,
} from "./leadPolicy";
import type {
  BuyerLead,
  BuyerLeadQueueLifecycle,
  BuyerLeadRevealState,
  ListingSaleStatus,
  SellerMaskedQueueEntry,
} from "./leadTypes";

export function isQueueLeadActive(lead: Pick<BuyerLead, "queueLifecycle">): boolean {
  return lead.queueLifecycle === "active";
}

export function sortLeadsByQueuePosition<T extends Pick<BuyerLead, "queuePosition">>(
  leads: T[]
): T[] {
  return [...leads].sort((a, b) => a.queuePosition - b.queuePosition);
}

/** Next position = count of active queue members + 1. */
export function computeNextQueuePosition(
  existing: Pick<BuyerLead, "listingId" | "queueLifecycle" | "queuePosition">[],
  listingId: string
): number {
  const active = existing.filter(
    (l) => l.listingId === listingId && isQueueLeadActive(l)
  );
  if (active.length === 0) return 1;
  return Math.max(...active.map((l) => l.queuePosition)) + 1;
}

export function countActiveQueueForListing(
  leads: Pick<BuyerLead, "listingId" | "queueLifecycle">[],
  listingId: string
): number {
  return leads.filter((l) => l.listingId === listingId && isQueueLeadActive(l)).length;
}

/** Public stat for car cards — count only, no identities. */
export function getListingInterestQueueStats(
  leads: Pick<BuyerLead, "listingId" | "queueLifecycle">[],
  listingId: string
): { listingId: string; interestCount: number } {
  return {
    listingId,
    interestCount: countActiveQueueForListing(leads, listingId),
  };
}

export function buildBuyerJoinedQueueMessage(queuePosition: number): string {
  return [
    "ส่งข้อมูลให้ผู้ขายแล้วครับ",
    `ตอนนี้คุณอยู่ในคิวผู้สนใจลำดับที่ ${queuePosition}`,
    "ผู้ขายจะติดต่อกลับตามลำดับคิวครับ",
    "น้องเอไม่เปิดเผยชื่อหรือเบอร์ของผู้สนใจรายอื่นให้คุณเห็นครับ",
  ].join("\n");
}

export function buildPublicInterestLabel(interestCount: number): string {
  if (interestCount <= 0) return "";
  return `มีผู้สนใจเข้าคิวแล้ว ${interestCount} คน`;
}

export function getNextRevealableLead<T extends BuyerLeadRevealState & Pick<BuyerLead, "queuePosition" | "queueLifecycle">>(
  leads: T[],
  listingId: string
): T | undefined {
  if (!canRevealNextLeadForListing(leads, listingId)) return undefined;
  const candidates = sortLeadsByQueuePosition(
    leads.filter(
      (l) =>
        l.listingId === listingId &&
        isQueueLeadActive(l) &&
        l.contactRevealStatus === "locked" &&
        !hasTerminalLeadContactOutcome(l)
    )
  );
  return candidates[0];
}

export function assertSellerRevealTarget<T extends BuyerLead>(
  leads: T[],
  listingId: string,
  targetLeadId: string
): { ok: true; lead: T } | { ok: false; code: "outcome_required" | "not_your_turn" | "not_found" } {
  const lead = leads.find((l) => l.id === targetLeadId && l.listingId === listingId);
  if (!lead) return { ok: false, code: "not_found" };
  const next = getNextRevealableLead(leads, listingId);
  if (!next || next.id !== lead.id) {
    return { ok: false, code: "not_your_turn" };
  }
  if (!canRevealNextLeadForListing(leads, listingId)) {
    return { ok: false, code: "outcome_required" };
  }
  return { ok: true, lead };
}

export function buildListingUnavailableBuyerMessage(
  saleStatus: ListingSaleStatus
): string {
  if (saleStatus === "sold") {
    return "รถคันนี้มีผู้ดำเนินการซื้อขายแล้วครับ คิวผู้สนใจสำหรับคันนี้ปิดแล้ว — ขอบคุณที่แสดงความสนใจนะครับ";
  }
  return "รถคันนี้อยู่ระหว่างมีผู้ดำเนินการซื้อขายแล้วครับ คิวผู้สนใจสำหรับคันนี้หยุดชั่วคราว — ถ้าดีลไม่สำเร็จอาจกลับมาเปิดรับความสนใจใหม่ได้ครับ";
}

export function shouldSupersedeQueueForListingStatus(
  status: ListingSaleStatus
): boolean {
  return status === "pending_sale" || status === "sold";
}

export interface SupersedeQueueResult<T extends BuyerLead> {
  updated: T[];
  buyerNotifications: Array<{ leadId: string; buyerUserId?: string; message: string }>;
}

export function supersedeActiveQueueForListingSale<T extends BuyerLead>(
  leads: T[],
  listingId: string,
  saleStatus: ListingSaleStatus,
  now: string
): SupersedeQueueResult<T> {
  if (!shouldSupersedeQueueForListingStatus(saleStatus)) {
    return { updated: [], buyerNotifications: [] };
  }
  const message = buildListingUnavailableBuyerMessage(saleStatus);
  const updated: T[] = [];
  const buyerNotifications: SupersedeQueueResult<T>["buyerNotifications"] = [];

  for (const lead of leads) {
    if (lead.listingId !== listingId || !isQueueLeadActive(lead)) continue;
    const next: T = {
      ...lead,
      queueLifecycle: "superseded" as BuyerLeadQueueLifecycle,
      status: lead.status === "closed_won" ? lead.status : "not_proceeded",
      updatedAt: now,
    };
    updated.push(next);
    buyerNotifications.push({
      leadId: lead.id,
      buyerUserId: lead.buyerUserId,
      message,
    });
  }
  return { updated, buyerNotifications };
}

export function toSellerMaskedQueue(
  leads: BuyerLead[],
  listingId: string
): SellerMaskedQueueEntry[] {
  const activeSorted = sortLeadsByQueuePosition(
    leads.filter((l) => l.listingId === listingId && isQueueLeadActive(l))
  );
  const nextId = getNextRevealableLead(activeSorted, listingId)?.id;

  return activeSorted.map((lead) => {
    const reveal =
      lead.id === nextId && lead.contactRevealStatus === "revealed";
    const masked = maskBuyerContact({
      displayName: lead.displayName,
      contactPhone: lead.contactPhone,
      revealContact: reveal,
    });
    return {
      leadId: lead.id,
      queuePosition: lead.queuePosition,
      displayName: masked.displayName,
      contactPhone: masked.contactPhone,
      purchaseMethod: lead.purchaseMethod,
      buyerSummary: lead.buyerSummary,
      status: lead.status,
      contactRevealStatus: lead.contactRevealStatus,
      leadContactOutcome: lead.leadContactOutcome,
      contactMasked: masked.phoneMasked || masked.nameMasked,
      isCurrentSellerTurn: lead.id === nextId,
    };
  });
}

/** Buyer may only see their own queue position — never other buyers' rows. */
export function filterBuyerVisibleQueueFields(
  lead: BuyerLead,
  viewerUserId: string
): Pick<BuyerLead, "queuePosition" | "queueLifecycle" | "listingId"> | null {
  if (lead.buyerUserId !== viewerUserId) return null;
  return {
    listingId: lead.listingId,
    queuePosition: lead.queuePosition,
    queueLifecycle: lead.queueLifecycle,
  };
}

export function publicQueuePayloadHasNoOtherBuyerPii(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return true;
  const o = payload as Record<string, unknown>;
  const forbidden = ["displayName", "contactPhone", "buyerSummary", "buyerUserId"];
  return !forbidden.some((k) => k in o);
}
