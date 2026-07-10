/**
 * v5.6E — Seller skip queue lead before reveal (in-memory repo).
 */

import type { BuyerLeadRepository } from "../../server/repositories/buyerLeadRepository";
import type { BuyerLead, SellerSkipReason } from "./leadTypes";
import { getNextRevealableLead } from "./buyerLeadQueuePolicy";
import { listLeadsForListing } from "./buyerLeadQueueService";
import {
  assertSellerCanSkipBeforeReveal,
  buildBuyerSkipFeedbackMessage,
  isValidSellerSkipReason,
  validateSellerSkipNote,
} from "./sellerSkipQueuePolicy";

export async function sellerSkipQueueLead(params: {
  repository: BuyerLeadRepository;
  listingId: string;
  sellerId: string;
  leadId: string;
  reason: string;
  note?: string;
  actorUserId: string;
}): Promise<
  | {
      ok: true;
      lead: BuyerLead;
      buyerQueueFeedback: string;
      nextRevealableLeadId?: string;
    }
  | { ok: false; status: 400 | 403 | 404; message: string }
> {
  if (!isValidSellerSkipReason(params.reason)) {
    return { ok: false, status: 400, message: "กรุณาเลือกเหตุผลการข้ามคิวครับ" };
  }
  const noteCheck = validateSellerSkipNote(params.reason, params.note);
  if (noteCheck.ok === false) {
    return { ok: false, status: 400, message: noteCheck.message };
  }

  const leads = await listLeadsForListing(params.repository, params.listingId);
  const owned = leads.find((l) => l.id === params.leadId);
  if (owned && owned.sellerId !== params.sellerId) {
    return { ok: false, status: 403, message: "ไม่มีสิทธิ์ข้ามลีดนี้ครับ" };
  }
  const gate = assertSellerCanSkipBeforeReveal(leads, params.listingId, params.leadId);
  if (gate.ok === false) {
    if (gate.code === "not_found") {
      return { ok: false, status: 404, message: "ไม่พบลีดในคิวครับ" };
    }
    if (gate.code === "already_revealed") {
      return { ok: false, status: 400, message: "ลีดนี้เปิดเบอร์แล้ว ไม่สามารถข้ามแบบก่อนเปิดเบอร์ได้ครับ" };
    }
    if (gate.code === "outcome_required") {
      return {
        ok: false,
        status: 400,
        message: "กรุณาบันทึกผลการติดต่อลีดที่เปิดเบอร์แล้วก่อนข้ามคิวถัดไปครับ",
      };
    }
    return {
      ok: false,
      status: 400,
      message: "ยังไม่ถึงคิวของลีดนี้ครับ กรุณาดำเนินการตามลำดับคิว",
    };
  }

  const skipReason = params.reason as SellerSkipReason;
  const buyerQueueFeedback = buildBuyerSkipFeedbackMessage(
    skipReason,
    noteCheck.note
  );
  const now = new Date().toISOString();
  const updated: BuyerLead = {
    ...gate.lead,
    queueLifecycle: "withdrawn",
    status: "not_proceeded",
    sellerSkipReason: skipReason,
    sellerSkipNote: noteCheck.note,
    buyerQueueFeedback,
    updatedAt: now,
  };
  await params.repository.updateBuyerLead(updated);
  await params.repository.appendContactLog({
    id: `bclog-skip-${Date.now()}`,
    buyerLeadId: updated.id,
    listingId: updated.listingId,
    sellerId: updated.sellerId,
    action: "queue_skipped_before_reveal",
    metadata: {
      reason: skipReason,
      ...(noteCheck.note ? { note: noteCheck.note } : {}),
      autoBuyerPenalty: false,
    },
    createdAt: now,
    createdByUserId: params.actorUserId,
  });
  // v22.52 — release active-slot so a later legitimate inquiry is allowed.
  await params.repository.releaseBuyerLeadActiveSlot({
    listingId: updated.listingId,
    buyerUserId: updated.buyerUserId,
  });

  const refreshed = await listLeadsForListing(params.repository, params.listingId);
  const next = getNextRevealableLead(refreshed, params.listingId);
  return {
    ok: true,
    lead: updated,
    buyerQueueFeedback,
    nextRevealableLeadId: next?.id,
  };
}
