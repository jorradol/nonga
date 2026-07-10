/**
 * v5.6B — AI Sales Lead Engine data model foundation (types only).
 * Not wired to chat, Firestore writes, or runtime UI. See docs/v5.6A-ai-sales-lead-engine-blueprint.md
 *
 * Distinct from sandbox `Lead` in src/types/analytics.ts (dealer analytics prototype).
 */

/** Firestore-oriented collection names (future v5.6C+). */
export const LEAD_ENGINE_COLLECTIONS = {
  buyerLeads: "buyerLeads",
  leadContactLogs: "leadContactLogs",
  /** v22.52 — durable active-slot idempotency (Admin SDK only). */
  buyerLeadIdempotencyRecords: "buyerLeadIdempotencyRecords",
  /** v22.53 — controlled Pilot created-count counter (Admin SDK only; no PII). */
  buyerLeadPilotCounters: "buyerLeadPilotCounters",
  buyerPurchaseProfiles: "buyerPurchaseProfiles",
  dealOutcomes: "dealOutcomes",
  successFeeRecords: "successFeeRecords",
  settlementAdjustments: "settlementAdjustments",
  settlementAuditLogs: "settlementAuditLogs",
  settlementIdempotencyRecords: "settlementIdempotencyRecords",
  trustRewardEvents: "trustRewardEvents",
} as const;

export type LeadEngineCollectionName =
  (typeof LEAD_ENGINE_COLLECTIONS)[keyof typeof LEAD_ENGINE_COLLECTIONS];

/** Buyer lead pipeline (seller inbox). */
export type BuyerLeadStatus =
  | "new"
  | "consented"
  | "seller_reviewing"
  | "contact_revealed"
  | "in_contact"
  | "viewing_scheduled"
  | "not_proceeded"
  | "closed_won"
  | "closed_lost"
  | "reported";

export type ContactRevealStatus = "locked" | "revealed" | "outcome_required";

/** Seller contact outcome after reveal (v5.6A §5). */
export type LeadContactOutcome =
  | "contacting"
  | "viewing_scheduled"
  | "unreachable"
  | "no_progress"
  | "not_closed"
  | "closed_won"
  | "reported_to_admin";

/** Listing visibility for marketplace (extends legacy published/hidden). */
export type ListingSaleStatus =
  | "published"
  | "pending_sale"
  | "sold"
  | "sale_cancelled"
  | "hidden";

export type SettlementStatus =
  | "unbilled"
  | "pending_payment"
  | "partially_paid"
  | "paid"
  | "waived"
  | "disputed"
  | "cancelled";

export type PurchaseMethod = "cash" | "finance" | "undecided";

export type BuyerLeadSource = "chat";

/** v5.6D — Per-listing interest queue lifecycle (no PII across buyers). */
export type BuyerLeadQueueLifecycle = "active" | "superseded" | "withdrawn";

/** v5.6E — Seller skip before contact reveal (staging MVP). */
export type SellerSkipReason =
  | "offer_below_expectation"
  | "purchase_method_mismatch"
  | "insufficient_info"
  | "suspected_inaccurate"
  | "other";

/** v5.6I pilot default policy id. */
export type SuccessFeePolicyType =
  | "hundred_thousand_floor_tier"
  | "percent"
  | "manual_adjusted";

/** @deprecated v5.6B — maps to SuccessFeePolicyType in new records. */
export type SuccessFeeModel = "tier_b" | "percent_1";

export type TrustRewardTier = "none" | "silver" | "gold" | "platinum";

export type TrustScoreDimension =
  | "buyerTrustScore"
  | "sellerReliabilityScore"
  | "leadQualityScore"
  | "nongaMatchScore";

export interface BuyerLeadConsent {
  version: string;
  consentedAt: string;
  listingId: string;
}

export interface BuyerLead {
  id: string;
  listingId: string;
  sellerId: string;
  buyerUserId?: string;
  displayName: string;
  contactPhone: string;
  budgetMin?: number;
  budgetMax?: number;
  purchaseMethod: PurchaseMethod;
  offeredPrice?: number;
  preferredContactWindow: string;
  buyerSummary: string;
  consent: BuyerLeadConsent;
  source: BuyerLeadSource;
  status: BuyerLeadStatus;
  contactRevealStatus: ContactRevealStatus;
  leadContactOutcome?: LeadContactOutcome;
  contactRevealedAt?: string;
  /** 1-based position in this listing's interest queue (immutable after create). */
  queuePosition: number;
  /** Active until listing pending_sale/sold or buyer withdraws. */
  queueLifecycle: BuyerLeadQueueLifecycle;
  /** v5.6E — set when seller skips before reveal. */
  sellerSkipReason?: SellerSkipReason;
  sellerSkipNote?: string;
  buyerQueueFeedback?: string;
  floorAtCapture?: number;
  createdAt: string;
  updatedAt: string;
}

/** Public aggregate — no buyer PII (v5.6D). */
export interface ListingInterestQueueStats {
  listingId: string;
  interestCount: number;
}

/** Seller inbox row — masked, ordered by queue (v5.6D). */
export interface SellerMaskedQueueEntry {
  leadId: string;
  queuePosition: number;
  displayName: string;
  contactPhone: string;
  purchaseMethod: PurchaseMethod;
  buyerSummary: string;
  status: BuyerLeadStatus;
  contactRevealStatus: ContactRevealStatus;
  leadContactOutcome?: LeadContactOutcome;
  contactMasked: boolean;
  isCurrentSellerTurn: boolean;
  preferredContactWindow: string;
  budgetLabel: string;
  offeredPriceLabel: string | null;
  /** null when it is seller's turn */
  waitingReason: string | null;
  canSkip: boolean;
  /** v5.6G — true when this row is head of queue and contact still locked */
  canRevealContact: boolean;
  /** v5.6G — seller must record outcome before next reveal */
  needsOutcome: boolean;
}

/** Minimal shape for policy helpers and tests. */
export type BuyerLeadRevealState = Pick<
  BuyerLead,
  "id" | "listingId" | "contactRevealStatus" | "leadContactOutcome" | "status"
>;

export type LeadContactLogAction =
  | "consent_recorded"
  | "seller_viewed"
  | "contact_reveal_requested"
  | "contact_revealed"
  | "outcome_updated"
  | "suspicious_buyer_reported"
  | "admin_review_opened"
  | "admin_review_closed"
  | "queue_skipped_before_reveal";

export interface LeadContactLog {
  id: string;
  buyerLeadId: string;
  listingId: string;
  sellerId: string;
  action: LeadContactLogAction;
  metadata?: Record<string, string | number | boolean>;
  createdAt: string;
  createdByUserId?: string;
}

export interface DealOutcome {
  id: string;
  buyerLeadId: string;
  listingId: string;
  sellerId: string;
  outcome: LeadContactOutcome;
  closedPrice?: number;
  listingSaleStatus: ListingSaleStatus;
  pendingSaleStartedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SuccessFeePaymentLogEntry {
  id: string;
  amount: number;
  channel: string;
  paidAt: string;
  adminNote?: string;
  recordedByAdminId: string;
}

/** Alias for admin manual payment log (v5.6I). */
export type SettlementPaymentRecord = SuccessFeePaymentLogEntry;

/** v5.6I.4 — Admin manual settlement adjustment actions (no payment gateway). */
export type SettlementAdjustmentAction =
  | "record_payment"
  | "partial_payment"
  | "mark_paid"
  | "waive_fee"
  | "dispute_fee"
  | "cancel_fee"
  | "manual_adjustment"
  | "admin_note";

/** v5.6I.4 legacy + v5.6I.5 durable source taxonomy. */
export type SettlementAdjustmentSource =
  | "admin_manual"
  | "lead_outcome"
  | "manual_admin_adjustment"
  | "system_recompute";

/** Runtime overlay state keyed by listing (memory store in v5.6I.4). */
export interface SettlementAdjustmentState {
  settlementId: string;
  listingId: string;
  leadId?: string;
  sellerId: string;
  ownerId?: string;
  dealerId?: string;
  feeAmount: number;
  paidAmount: number;
  waivedAmount: number;
  remainingAmount: number;
  settlementStatus: SettlementStatus;
  adminNote?: string;
  updatedAt: string;
}

/** Immutable audit entry for every admin adjustment. */
export interface SettlementAdjustmentAuditEntry {
  id: string;
  settlementId: string;
  listingId: string;
  leadId?: string;
  sellerId: string;
  ownerId?: string;
  dealerId?: string;
  action: SettlementAdjustmentAction;
  previousFeeAmount: number;
  newFeeAmount: number;
  previousPaidAmount: number;
  newPaidAmount: number;
  previousRemainingAmount: number;
  newRemainingAmount: number;
  previousStatus: SettlementStatus;
  newStatus: SettlementStatus;
  amountDelta: number;
  reason: string;
  adminNote?: string;
  updatedBy: string;
  updatedByRole: "admin" | "superadmin";
  createdAt: string;
  source: SettlementAdjustmentSource;
}

export interface SuccessFeeRecord {
  id: string;
  listingId: string;
  buyerLeadId: string;
  sellerId: string;
  /** Member owner scope when distinct from dealer sellerId. */
  ownerId?: string;
  dealOutcomeId: string;
  /** v5.6I canonical closed price field. */
  closedDealPrice: number;
  /** @deprecated use closedDealPrice — kept for v5.6B compat. */
  closedPrice: number;
  feeAmount: number;
  feePolicyType: SuccessFeePolicyType;
  /** @deprecated use feePolicyType */
  feeModel?: SuccessFeeModel;
  settlementStatus: SettlementStatus;
  paidAmount: number;
  remainingAmount: number;
  amountDue: number;
  amountReceived: number;
  amountWaived: number;
  paymentLogs: SuccessFeePaymentLogEntry[];
  adminNote?: string;
  dueAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type TrustRewardEventType =
  | "outcome_logged_on_time"
  | "closed_sale_confirmed"
  | "consent_completed"
  | "admin_trust_adjustment";

export interface TrustRewardEvent {
  id: string;
  userId: string;
  dimension: TrustScoreDimension;
  deltaPoints: number;
  eventType: TrustRewardEventType;
  buyerLeadId?: string;
  /** Suspicious reports do not apply negative deltas until admin acts. */
  pendingAdminReview?: boolean;
  createdAt: string;
}

export type SuspiciousBuyerReportReason =
  | "fake_phone"
  | "unreachable"
  | "scam_behavior"
  | "other";

export interface SuspiciousBuyerReport {
  id: string;
  buyerLeadId: string;
  listingId: string;
  sellerId: string;
  reason: SuspiciousBuyerReportReason;
  description?: string;
  createdAt: string;
}
