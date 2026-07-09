/**
 * Seller-provided vehicle image consent + plate-in-image policy (v2).
 *
 * Owner decision (v22.18): sellers are NOT required to blur/crop plates in
 * photos before submitting images to Nong A. Seller-provided images may be
 * displayed when the seller confirms publish rights and consents to listing use,
 * even if a plate is visible in the photo.
 *
 * System-controlled text fields / public DTOs must still never expose full
 * license plate, VIN, phone, address, or other sensitive PII.
 *
 * No automated plate blur is required in this slice.
 */

export const SELLER_PROVIDED_IMAGE_CONSENT_POLICY_ID =
  "seller-provided-image-consent-v1" as const;

/** @deprecated Prefer SELLER_PROVIDED_IMAGE_CONSENT_POLICY_ID */
export const PLATE_IN_IMAGE_PRIVACY_POLICY_ID =
  SELLER_PROVIDED_IMAGE_CONSENT_POLICY_ID;

export const SELLER_PROVIDED_IMAGE_CONSENT_NOTICE =
  "รูปที่ผู้ขายส่งสามารถแสดงได้ตามที่ส่งมา หากผู้ขายยืนยันว่ามีสิทธิ์เผยแพร่และยินยอมให้ใช้เพื่อประกาศขาย แม้ในภาพอาจเห็นป้ายทะเบียน — ระบบยังไม่เปิดเผยทะเบียนเต็ม/VIN/เบอร์โทร/ที่อยู่ในช่องข้อความที่ระบบควบคุม";

/** @deprecated Prefer SELLER_PROVIDED_IMAGE_CONSENT_NOTICE */
export const PLATE_IN_IMAGE_PRIVACY_IMPORT_WARNING =
  SELLER_PROVIDED_IMAGE_CONSENT_NOTICE;

export const SELLER_IMAGE_CONSENT_CONFIRM_BULLETS = [
  "ผู้ขายยืนยันว่ามีสิทธิ์เผยแพร่รูปภาพรถที่ส่งเข้าระบบ",
  "ผู้ขายยินยอมให้แสดงรูปเพื่อการประกาศขาย",
  "รูปอาจแสดงตามที่ส่งมา แม้ในภาพอาจเห็นป้ายทะเบียน",
  "ระบบยังปิดทะเบียนเต็ม / VIN / เบอร์โทร / ที่อยู่ในช่องข้อความและ API สาธารณะที่ระบบควบคุม",
] as const;

export type SellerProvidedImageConsentStatus =
  | "not_applicable"
  | "seller_provided_images_allowed_with_consent"
  | "seller_consented_publish_rights";

/** @deprecated Prefer SellerProvidedImageConsentStatus */
export type PlateInImagePrivacyStatus = SellerProvidedImageConsentStatus;

export interface SellerProvidedImageConsentInput {
  /** Listing has cover/gallery/source image URLs (not placeholder-only). */
  hasSourceOrStoredImages: boolean;
  /**
   * Seller/owner confirmed publish rights + listing-use consent for images.
   * Confirm Import UI presents this as part of the confirmation action.
   */
  sellerConfirmedPublishRightsAndListingConsent?: boolean;
}

/** @deprecated Prefer SellerProvidedImageConsentInput */
export interface PlateInImagePrivacyInput {
  hasSourceOrStoredImages: boolean;
  /** @deprecated No longer used — blur/plate-safe attestation is not required. */
  ownerAttestedPlateSafeImages?: boolean;
  sellerConfirmedPublishRightsAndListingConsent?: boolean;
}

export interface SellerProvidedImageConsentResult {
  policyId: typeof SELLER_PROVIDED_IMAGE_CONSENT_POLICY_ID;
  status: SellerProvidedImageConsentStatus;
  /** Text masking still does not alter pixels inside photos. */
  textMaskingDoesNotCoverImagePlates: true;
  /** Visible plate in seller photos does not block display under this policy. */
  blocksPublicFacingUse: false;
  /** Automated plate blur is not required in this slice. */
  requiresAutomatedPlateBlur: false;
  /** Seller-provided images may be shown as submitted when consent applies. */
  sellerProvidedImagesAllowedEvenIfPlateVisible: true;
  warnings: string[];
  consentBullets: readonly string[];
}

/** @deprecated Prefer SellerProvidedImageConsentResult */
export type PlateInImagePrivacyResult = SellerProvidedImageConsentResult;

export function evaluateSellerProvidedImageConsent(
  input: SellerProvidedImageConsentInput
): SellerProvidedImageConsentResult {
  if (!input.hasSourceOrStoredImages) {
    return {
      policyId: SELLER_PROVIDED_IMAGE_CONSENT_POLICY_ID,
      status: "not_applicable",
      textMaskingDoesNotCoverImagePlates: true,
      blocksPublicFacingUse: false,
      requiresAutomatedPlateBlur: false,
      sellerProvidedImagesAllowedEvenIfPlateVisible: true,
      warnings: [],
      consentBullets: SELLER_IMAGE_CONSENT_CONFIRM_BULLETS,
    };
  }

  const consented =
    input.sellerConfirmedPublishRightsAndListingConsent === true;

  return {
    policyId: SELLER_PROVIDED_IMAGE_CONSENT_POLICY_ID,
    status: consented
      ? "seller_consented_publish_rights"
      : "seller_provided_images_allowed_with_consent",
    textMaskingDoesNotCoverImagePlates: true,
    blocksPublicFacingUse: false,
    requiresAutomatedPlateBlur: false,
    sellerProvidedImagesAllowedEvenIfPlateVisible: true,
    warnings: [SELLER_PROVIDED_IMAGE_CONSENT_NOTICE],
    consentBullets: SELLER_IMAGE_CONSENT_CONFIRM_BULLETS,
  };
}

/**
 * Compatibility wrapper for v22.17 call sites.
 * Plate-safe / blur attestation is ignored — seller consent policy applies.
 */
export function evaluatePlateInImagePrivacyReadiness(
  input: PlateInImagePrivacyInput
): SellerProvidedImageConsentResult {
  return evaluateSellerProvidedImageConsent({
    hasSourceOrStoredImages: input.hasSourceOrStoredImages,
    sellerConfirmedPublishRightsAndListingConsent:
      input.sellerConfirmedPublishRightsAndListingConsent === true ||
      input.ownerAttestedPlateSafeImages === true,
  });
}
