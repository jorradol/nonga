/**
 * v5.6B — Pure policy helpers for AI Sales Lead Engine (no I/O).
 */

import type {
  BuyerLeadRevealState,
  ContactRevealStatus,
  LeadContactOutcome,
  ListingSaleStatus,
  SuspiciousBuyerReport,
  TrustRewardTier,
} from "./leadTypes";

export const TRUST_TIER_THRESHOLDS = {
  silver: 1_000,
  gold: 2_000,
  platinum: 3_000,
} as const;

/** Outcomes that unblock the next contact reveal for the same listing. */
export const TERMINAL_LEAD_CONTACT_OUTCOMES: ReadonlySet<LeadContactOutcome> =
  new Set([
    "unreachable",
    "no_progress",
    "not_closed",
    "closed_won",
    "reported_to_admin",
  ]);

export const LEAD_OUTCOME_UI_LABELS: Record<LeadContactOutcome, string> = {
  contacting: "กำลังติดต่อ",
  viewing_scheduled: "นัดดูรถแล้ว",
  unreachable: "ติดต่อไม่ได้",
  no_progress: "ไม่ได้ไปต่อ",
  not_closed: "ไม่ปิดการขาย",
  closed_won: "ปิดการขายแล้ว",
  reported_to_admin: "รายงานให้แอดมินตรวจสอบ",
};

/** UI must not use “ไม่จบ” — canonical label is “ไม่ได้ไปต่อ”. */
export const DISALLOWED_OUTCOME_UI_LABELS = ["ไม่จบ"] as const;

export function hasTerminalLeadContactOutcome(
  lead: Pick<BuyerLeadRevealState, "leadContactOutcome">
): boolean {
  const o = lead.leadContactOutcome;
  return o !== undefined && TERMINAL_LEAD_CONTACT_OUTCOMES.has(o);
}

export function isLeadBlockingNextReveal(lead: BuyerLeadRevealState): boolean {
  if (lead.contactRevealStatus === "locked") return false;
  if (lead.contactRevealStatus === "outcome_required") return true;
  if (lead.contactRevealStatus === "revealed") {
    return !hasTerminalLeadContactOutcome(lead);
  }
  return false;
}

export function getActiveRevealLeadForListing(
  leads: BuyerLeadRevealState[],
  listingId: string
): BuyerLeadRevealState | undefined {
  return leads
    .filter((l) => l.listingId === listingId)
    .find((l) => isLeadBlockingNextReveal(l));
}

/**
 * Seller may reveal at most one buyer contact per listing until that lead has a terminal outcome.
 */
export function canRevealNextLeadForListing(
  leads: BuyerLeadRevealState[],
  listingId: string
): boolean {
  return getActiveRevealLeadForListing(leads, listingId) === undefined;
}

export function deriveContactRevealStatusAfterReveal(
  current: ContactRevealStatus
): ContactRevealStatus {
  if (current === "locked") return "revealed";
  return current;
}

export function deriveContactRevealStatusAfterOutcome(
  outcome: LeadContactOutcome
): ContactRevealStatus {
  return TERMINAL_LEAD_CONTACT_OUTCOMES.has(outcome) ? "locked" : "outcome_required";
}

export interface MaskedBuyerContact {
  displayName: string;
  contactPhone: string;
  phoneMasked: boolean;
  nameMasked: boolean;
}

export function maskBuyerContact(input: {
  displayName: string;
  contactPhone: string;
  revealContact?: boolean;
}): MaskedBuyerContact {
  const reveal = input.revealContact === true;
  if (reveal) {
    return {
      displayName: input.displayName,
      contactPhone: input.contactPhone,
      phoneMasked: false,
      nameMasked: false,
    };
  }
  const phone = maskPhoneNumber(input.contactPhone);
  const name = maskDisplayName(input.displayName);
  return {
    displayName: name,
    contactPhone: phone,
    phoneMasked: true,
    nameMasked: name !== input.displayName,
  };
}

function maskPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "••••";
  const tail = digits.slice(-4);
  return `•••-•••-${tail}`;
}

function maskDisplayName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "ผู้ซื้อ";
  if (trimmed.length <= 2) return `${trimmed[0] ?? ""}•`;
  return `${trimmed[0]}•••`;
}

export function shouldHideListingFromMarketplace(
  status: ListingSaleStatus
): boolean {
  return status === "pending_sale" || status === "sold";
}

export function canRelistAfterSaleCancelled(status: ListingSaleStatus): boolean {
  return status === "sale_cancelled";
}

export function getNextLeadOutcomeRequiredMessage(): string {
  return "กรุณาอัปเดตผลการติดต่อลีดนี้ก่อนเปิดเบอร์ผู้ซื้อรายถัดไปครับ";
}

export function normalizeLeadOutcomeLabel(
  outcome: LeadContactOutcome
): string {
  return LEAD_OUTCOME_UI_LABELS[outcome];
}

export function assertOutcomeUiLabelPolicy(label: string): boolean {
  return !DISALLOWED_OUTCOME_UI_LABELS.includes(
    label as (typeof DISALLOWED_OUTCOME_UI_LABELS)[number]
  );
}

export interface SuspiciousBuyerReportPolicyResult {
  autoPenaltyApplied: false;
  requiresAdminReview: true;
  buyerLeadStatus: "reported";
  contactRevealStatus: "outcome_required";
}

/**
 * Reports enter admin queue only — no automatic trust penalty or account sanction.
 */
export function applySuspiciousBuyerReportPolicy(
  _report: Pick<SuspiciousBuyerReport, "reason" | "buyerLeadId">
): SuspiciousBuyerReportPolicyResult {
  return {
    autoPenaltyApplied: false,
    requiresAdminReview: true,
    buyerLeadStatus: "reported",
    contactRevealStatus: "outcome_required",
  };
}

/** Default negotiation floor: 10% below listed price (v5.6A §9). */
export function calculateNegotiationFloor(
  listedPrice: number,
  minimumAcceptablePrice?: number
): number {
  if (
    minimumAcceptablePrice !== undefined &&
    Number.isFinite(minimumAcceptablePrice) &&
    minimumAcceptablePrice > 0
  ) {
    return Math.round(minimumAcceptablePrice);
  }
  return Math.round(listedPrice * 0.9);
}

export function isOfferBelowFloor(
  offeredPrice: number,
  floor: number
): boolean {
  return offeredPrice < floor;
}

export function getTrustTierFromPoints(points: number): TrustRewardTier {
  if (!Number.isFinite(points) || points < TRUST_TIER_THRESHOLDS.silver) {
    return "none";
  }
  if (points >= TRUST_TIER_THRESHOLDS.platinum) return "platinum";
  if (points >= TRUST_TIER_THRESHOLDS.gold) return "gold";
  return "silver";
}
