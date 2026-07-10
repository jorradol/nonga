/**
 * v22.49 / v22.52 — Duplicate protection for buyer-lead create.
 *
 * v22.52 duplicate definition (revenue-safe):
 *   Same buyerUserId + listingId while queueLifecycle === "active"
 *   → reuse existing Lead (at most one active inquiry per listing per buyer).
 *   Withdrawn / terminal leads do NOT permanently block a later inquiry.
 *   Different listingIds remain distinct (buyer may inquire on multiple cars).
 *
 * Phone is no longer required for the active-slot match (double-submit with a
 * typo'd phone must not create a second active Lead). Contact fingerprint is
 * stored on the durable slot for audit only.
 */

import type { BuyerLead } from "./leadTypes";
import { isQueueLeadActive } from "./buyerLeadQueuePolicy";

export const BUYER_LEAD_DUPLICATE_ACTIVE_MESSAGE =
  "คุณมีคิวสนใจประกาศนี้อยู่แล้วครับ ไม่ต้องส่งซ้ำ";

export function findActiveDuplicateBuyerLead(params: {
  existing: BuyerLead[];
  listingId: string;
  buyerUserId: string;
  /** @deprecated v22.52 — ignored for match; kept for call-site compatibility. */
  contactPhone?: string;
}): BuyerLead | null {
  const listingId = params.listingId.trim();
  const buyerUserId = params.buyerUserId.trim();
  if (!listingId || !buyerUserId) return null;

  for (const lead of params.existing) {
    if (lead.listingId !== listingId) continue;
    if (!isQueueLeadActive(lead)) continue;
    if (String(lead.buyerUserId ?? "").trim() !== buyerUserId) continue;
    return lead;
  }
  return null;
}
