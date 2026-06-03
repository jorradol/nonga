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
  dealOutcomes: "dealOutcomes",
  successFeeRecords: "successFeeRecords",
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
  floorAtCapture?: number;
  createdAt: string;
  updatedAt: string;
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
  | "admin_review_closed";

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

export interface SuccessFeeRecord {
  id: string;
  dealOutcomeId: string;
  buyerLeadId: string;
  listingId: string;
  sellerId: string;
  feeModel: SuccessFeeModel;
  closedPrice: number;
  feeAmount: number;
  amountDue: number;
  amountReceived: number;
  amountWaived: number;
  settlementStatus: SettlementStatus;
  paymentLogs: SuccessFeePaymentLogEntry[];
  adminNote?: string;
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
