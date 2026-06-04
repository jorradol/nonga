/**
 * v5.6E.1 / v5.6F — Buyer purchase profile reuse (client/session in-memory; no phone).
 * Server-side Firestore persistence: see buyerPurchaseProfileRepository.ts (future wire from API).
 */

import type { BuyerLeadDraftFields } from "./buyerLeadCaptureFlow";
import {
  hasBuyerLeadBudgetOrOffer,
  listMissingBuyerLeadFields,
} from "./buyerLeadCaptureFlow";
import type { PurchaseMethod } from "./leadTypes";

export interface BuyerPurchaseProfile {
  displayName: string;
  purchaseMethod: PurchaseMethod;
  budgetMin?: number;
  budgetMax?: number;
  offeredPrice?: number;
  preferredContactWindow: string;
  updatedAt: string;
}

const profilesByBuyerUserId = new Map<string, BuyerPurchaseProfile>();

export function isBuyerPurchaseProfileComplete(
  profile: Partial<BuyerPurchaseProfile>
): boolean {
  const missing = listMissingBuyerLeadFields(
    {
      displayName: profile.displayName,
      purchaseMethod: profile.purchaseMethod,
      budgetMin: profile.budgetMin,
      budgetMax: profile.budgetMax,
      offeredPrice: profile.offeredPrice,
      preferredContactWindow: profile.preferredContactWindow,
    },
    { requireListing: false }
  );
  return missing.length === 0;
}

export function getBuyerPurchaseProfile(
  buyerUserId: string | undefined | null
): BuyerPurchaseProfile | null {
  const id = buyerUserId?.trim();
  if (!id) return null;
  const profile = profilesByBuyerUserId.get(id);
  if (!profile || !isBuyerPurchaseProfileComplete(profile)) return null;
  return profile;
}

export function profileToDraftFields(
  profile: BuyerPurchaseProfile,
  listingId: string
): BuyerLeadDraftFields {
  return {
    listingId: listingId.trim(),
    displayName: profile.displayName,
    purchaseMethod: profile.purchaseMethod,
    budgetMin: profile.budgetMin,
    budgetMax: profile.budgetMax,
    offeredPrice: profile.offeredPrice,
    preferredContactWindow: profile.preferredContactWindow,
  };
}

export function saveBuyerPurchaseProfileFromDraft(
  buyerUserId: string,
  fields: BuyerLeadDraftFields
): BuyerPurchaseProfile | null {
  const id = buyerUserId.trim();
  if (!id) return null;
  if (!fields.displayName?.trim() || !fields.purchaseMethod) return null;
  if (!fields.preferredContactWindow?.trim()) return null;
  if (!hasBuyerLeadBudgetOrOffer(fields)) return null;

  const profile: BuyerPurchaseProfile = {
    displayName: fields.displayName.trim().slice(0, 60),
    purchaseMethod: fields.purchaseMethod,
    preferredContactWindow: fields.preferredContactWindow.trim().slice(0, 120),
    updatedAt: new Date().toISOString(),
    ...(fields.budgetMin != null ? { budgetMin: fields.budgetMin } : {}),
    ...(fields.budgetMax != null ? { budgetMax: fields.budgetMax } : {}),
    ...(fields.offeredPrice != null ? { offeredPrice: fields.offeredPrice } : {}),
  };

  if (!isBuyerPurchaseProfileComplete(profile)) return null;
  profilesByBuyerUserId.set(id, profile);
  return profile;
}

/** Profile storage must never retain phone numbers. */
export function buyerPurchaseProfileHasNoPhone(
  profile: BuyerPurchaseProfile | Record<string, unknown> | null | undefined
): boolean {
  if (!profile) return true;
  const forbidden = ["contactPhone", "phone", "mobile"];
  return !forbidden.some((k) => {
    const v = profile[k as keyof typeof profile];
    return typeof v === "string" && v.trim().length > 0;
  });
}

export function resetBuyerPurchaseProfilesForTests(): void {
  profilesByBuyerUserId.clear();
}

export function setBuyerPurchaseProfileForTest(
  buyerUserId: string,
  profile: BuyerPurchaseProfile
): void {
  profilesByBuyerUserId.set(buyerUserId.trim(), profile);
}
