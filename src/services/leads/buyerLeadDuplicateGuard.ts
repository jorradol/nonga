/**
 * v22.49 — Minimum duplicate protection for buyer-lead create (controlled durable readiness).
 *
 * Not production-grade exactly-once. Prevents a second *active* Lead for the same
 * buyerUserId + listingId + normalized phone within the listing queue.
 * Buyer cannot set seller/recipient. No new public API fields required.
 */

import type { BuyerLead } from "./leadTypes";
import { isQueueLeadActive } from "./buyerLeadQueuePolicy";
import { normalizeThaiPhone } from "./buyerLeadValidation";

export const BUYER_LEAD_DUPLICATE_ACTIVE_MESSAGE =
  "คุณมีคิวสนใจประกาศนี้อยู่แล้วครับ ไม่ต้องส่งซ้ำ";

export function findActiveDuplicateBuyerLead(params: {
  existing: BuyerLead[];
  listingId: string;
  buyerUserId: string;
  contactPhone: string;
}): BuyerLead | null {
  const listingId = params.listingId.trim();
  const buyerUserId = params.buyerUserId.trim();
  const phone =
    normalizeThaiPhone(params.contactPhone) ?? params.contactPhone.trim();
  if (!listingId || !buyerUserId || !phone) return null;

  for (const lead of params.existing) {
    if (lead.listingId !== listingId) continue;
    if (!isQueueLeadActive(lead)) continue;
    if (String(lead.buyerUserId ?? "").trim() !== buyerUserId) continue;
    const existingPhone =
      normalizeThaiPhone(lead.contactPhone) ?? lead.contactPhone.trim();
    if (existingPhone === phone) return lead;
  }
  return null;
}
