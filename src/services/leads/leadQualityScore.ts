/**
 * v5.6F — Lead quality score foundation (policy only; no seller UI in this round).
 */

import type { BuyerLead, PurchaseMethod } from "./leadTypes";
import { applySuspiciousBuyerReportPolicy } from "./leadPolicy";
import {
  evaluatePurchaseMethodFit,
  isOfferBelowSellerFloor,
  type SellerLeadCriteria,
} from "./sellerLeadCriteria";
import { guardSmartSalesAiInput } from "./smartSalesAiGuards";

export type LeadQualityTier = "hot" | "warm" | "needs_info" | "risky";

export interface LeadQualityScoreResult {
  score: number;
  tier: LeadQualityTier;
  factors: string[];
  /** Human-readable hints for seller inbox (future); not punitive. */
  sellerHints: string[];
}

const SUSPICIOUS_SUMMARY_PATTERNS = [
  /โอนก่อน/i,
  /มัดจำ.*ด่วน/i,
  /ส่งบัตร/i,
  /สำเนาบัตร/i,
  /line.*@/i,
];

function hasCompleteLeadFields(lead: Pick<
  BuyerLead,
  "displayName" | "purchaseMethod" | "preferredContactWindow" | "buyerSummary" | "budgetMin" | "budgetMax" | "offeredPrice"
>): boolean {
  const hasBudget =
    (lead.budgetMin != null && lead.budgetMin > 0) ||
    (lead.budgetMax != null && lead.budgetMax > 0) ||
    (lead.offeredPrice != null && lead.offeredPrice > 0);
  return Boolean(
    lead.displayName?.trim() &&
      lead.purchaseMethod &&
      lead.preferredContactWindow?.trim() &&
      lead.buyerSummary?.trim() &&
      hasBudget
  );
}

function scorePurchaseMethod(
  method: PurchaseMethod,
  criteria?: SellerLeadCriteria | null
): { delta: number; factor?: string } {
  const fit = evaluatePurchaseMethodFit(method, criteria);
  if (fit === "match") return { delta: 12, factor: "purchase_method_match" };
  if (fit === "mismatch") return { delta: -15, factor: "purchase_method_mismatch" };
  return { delta: 4, factor: "purchase_method_undecided" };
}

function scoreOfferFit(params: {
  offeredPrice?: number;
  listedPrice?: number;
  floorAtCapture?: number;
  criteria?: SellerLeadCriteria | null;
}): { delta: number; factor?: string; hint?: string } {
  const { offeredPrice, listedPrice, floorAtCapture, criteria } = params;
  if (offeredPrice == null || !Number.isFinite(offeredPrice) || offeredPrice <= 0) {
    return { delta: -8, factor: "no_clear_offer", hint: "ยังไม่มีราคาเสนอชัดเจน" };
  }
  const list = listedPrice ?? 0;
  if (list > 0) {
    const below = isOfferBelowSellerFloor({ offeredPrice, listedPrice: list, criteria });
    if (below) {
      return {
        delta: -18,
        factor: "offer_below_floor",
        hint: "ราคาเสนอต่ำกว่าเกณฑ์ที่ผู้ขายน่าจะพิจารณา — แนะนำต่อรองหรือเสนอทางเลือก",
      };
    }
    const ratio = offeredPrice / list;
    if (ratio >= 0.95) return { delta: 20, factor: "offer_near_list" };
    if (ratio >= 0.9) return { delta: 12, factor: "offer_reasonable" };
  }
  if (floorAtCapture != null && offeredPrice >= floorAtCapture) {
    return { delta: 10, factor: "offer_at_or_above_capture_floor" };
  }
  return { delta: 0 };
}

export function computeLeadQualityScore(params: {
  lead: BuyerLead;
  listedPrice?: number;
  sellerCriteria?: SellerLeadCriteria | null;
  suspiciousReported?: boolean;
}): LeadQualityScoreResult {
  const { lead, listedPrice, sellerCriteria, suspiciousReported } = params;
  const factors: string[] = [];
  const sellerHints: string[] = [];
  let score = 50;

  if (hasCompleteLeadFields(lead)) {
    score += 15;
    factors.push("profile_complete");
  } else {
    score -= 12;
    factors.push("profile_incomplete");
    sellerHints.push("ข้อมูลผู้ซื้อยังไม่ครบ — ขอเพิ่มเติมก่อนตัดสินใจ");
  }

  const pm = scorePurchaseMethod(lead.purchaseMethod, sellerCriteria);
  score += pm.delta;
  if (pm.factor) factors.push(pm.factor);

  const offer = scoreOfferFit({
    offeredPrice: lead.offeredPrice,
    listedPrice,
    floorAtCapture: lead.floorAtCapture,
    criteria: sellerCriteria,
  });
  score += offer.delta;
  if (offer.factor) factors.push(offer.factor);
  if (offer.hint) sellerHints.push(offer.hint);

  if (lead.preferredContactWindow.trim().length >= 8) {
    score += 6;
    factors.push("contact_window_clear");
  } else {
    score -= 4;
    factors.push("contact_window_vague");
  }

  const summaryGuard = guardSmartSalesAiInput(lead.buyerSummary);
  if (summaryGuard.ok === false && summaryGuard.reason === "sensitive_document_request") {
    score -= 25;
    factors.push("sensitive_document_language");
    sellerHints.push("ไม่ควรขอเอกสารสำคัญในแชท — ให้ผู้ขาย/แอดมินพิจารณา");
  }

  if (SUSPICIOUS_SUMMARY_PATTERNS.some((re) => re.test(lead.buyerSummary))) {
    score -= 20;
    factors.push("summary_suspicious_pattern");
    sellerHints.push("มีสัญญาณที่ควรระวัง — ส่งให้ผู้ขายพิจารณา ไม่ลงโทษอัตโนมัติ");
  }

  if (suspiciousReported) {
    const policy = applySuspiciousBuyerReportPolicy({
      reason: "other",
      buyerLeadId: lead.id,
    });
    score = Math.min(score, 35);
    factors.push("suspicious_report_admin_review");
    sellerHints.push(
      policy.requiresAdminReview
        ? "รายงานน่าสงสัย — รอแอดมิน/ผู้ขายพิจารณา (ไม่มีโทษอัตโนมัติ)"
        : "รายงานน่าสงสัย"
    );
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let tier: LeadQualityTier = "warm";
  if (score >= 75) tier = "hot";
  else if (score >= 55) tier = "warm";
  else if (score >= 35) tier = "needs_info";
  else tier = "risky";

  return { score, tier, factors, sellerHints };
}
