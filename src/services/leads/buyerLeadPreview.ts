/**
 * v5.6C.1 — Build consent modal preview from draft fields + target car.
 */

import type { BuyerLeadTargetCar } from "../../utils/buyerLeadTarget";
import { buyerLeadTargetTitle } from "../../utils/buyerLeadTarget";
import {
  hasBuyerLeadBudgetOrOffer,
  type BuyerLeadDraftFields,
} from "./buyerLeadCaptureFlow";
import type { PurchaseMethod } from "./leadTypes";
import { buildBuyerLeadSummary } from "./buyerLeadValidation";

export interface BuyerLeadModalPreview {
  listingId: string;
  carTitle: string;
  carPriceLabel: string;
  displayName: string;
  purchaseMethodLabel: string;
  budgetLabel: string;
  offeredPriceLabel: string | null;
  preferredContactWindow: string;
  sellerSummary: string;
}

export function formatPurchaseMethodLabel(method: PurchaseMethod): string {
  if (method === "cash") return "เงินสด";
  if (method === "finance") return "ไฟแนนซ์";
  return "ยังไม่แน่ใจ";
}

function formatBudgetLabel(fields: BuyerLeadDraftFields): string {
  if (fields.budgetMin != null && fields.budgetMax != null && fields.budgetMin !== fields.budgetMax) {
    return `${fields.budgetMin.toLocaleString("th-TH")}–${fields.budgetMax.toLocaleString("th-TH")} บาท`;
  }
  const v = fields.budgetMax ?? fields.budgetMin;
  if (v != null && v > 0) return `ประมาณ ${v.toLocaleString("th-TH")} บาท`;
  if (fields.offeredPrice != null && fields.offeredPrice > 0) return "ไม่ระบุงบ (มีราคาเสนอ)";
  return "ไม่ระบุ";
}

export function buildBuyerLeadModalPreview(
  fields: BuyerLeadDraftFields,
  target: BuyerLeadTargetCar | null
): BuyerLeadModalPreview | null {
  if (!fields.listingId?.trim() || !fields.displayName?.trim()) return null;
  if (!fields.purchaseMethod || !fields.preferredContactWindow?.trim()) return null;
  if (!hasBuyerLeadBudgetOrOffer(fields)) return null;

  const carTitle = target
    ? buyerLeadTargetTitle(target)
    : `รหัสประกาศ ${fields.listingId}`;
  const carPriceLabel =
    target && target.price > 0
      ? `${target.price.toLocaleString("th-TH")} บาท`
      : "ติดต่อสอบถาม";

  const offeredPriceLabel =
    fields.offeredPrice != null && fields.offeredPrice > 0
      ? `${fields.offeredPrice.toLocaleString("th-TH")} บาท`
      : null;

  const sellerSummary = buildBuyerLeadSummary({
    displayName: fields.displayName,
    purchaseMethod: fields.purchaseMethod,
    budgetMin: fields.budgetMin,
    budgetMax: fields.budgetMax,
    offeredPrice: fields.offeredPrice,
    preferredContactWindow: fields.preferredContactWindow,
    listingTitle: target ? buyerLeadTargetTitle(target) : undefined,
  });

  return {
    listingId: fields.listingId,
    carTitle,
    carPriceLabel,
    displayName: fields.displayName,
    purchaseMethodLabel: formatPurchaseMethodLabel(fields.purchaseMethod),
    budgetLabel: formatBudgetLabel(fields),
    offeredPriceLabel,
    preferredContactWindow: fields.preferredContactWindow,
    sellerSummary,
  };
}

export function isReadyForBuyerLeadConsentModal(fields: BuyerLeadDraftFields): boolean {
  return (
    Boolean(fields.listingId?.trim()) &&
    Boolean(fields.displayName?.trim()) &&
    Boolean(fields.purchaseMethod) &&
    Boolean(fields.preferredContactWindow?.trim()) &&
    hasBuyerLeadBudgetOrOffer(fields)
  );
}
