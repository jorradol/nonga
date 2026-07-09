/**
 * Plate-in-image privacy policy helpers.
 *
 * Text-field masking (licensePlateMasked) does NOT hide a full plate that is
 * visually present inside cover/gallery photos. Public / revenue-facing use
 * requires owner/dealer plate-safe (blurred/cropped/masked) source images.
 */

export const PLATE_IN_IMAGE_PRIVACY_POLICY_ID =
  "plate-in-image-privacy-v1" as const;

export const PLATE_IN_IMAGE_PRIVACY_IMPORT_WARNING =
  "รูปต้นทางอาจมีป้ายทะเบียนเต็มในภาพ — การปิดทะเบียนในข้อความไม่ปิดป้ายในรูป ต้องใช้รูปที่เบลอ/ครอปป้ายก่อนเปิดสาธารณะหรือรอบรายได้";

export const PLATE_IN_IMAGE_PRIVACY_PUBLIC_BLOCK_REASON =
  "plate_visible_in_source_images_unattested";

export type PlateInImagePrivacyStatus =
  | "not_applicable"
  | "needs_owner_plate_safe_images"
  | "owner_attested_plate_safe";

export interface PlateInImagePrivacyInput {
  /** Listing has cover/gallery/source image URLs (not placeholder-only). */
  hasSourceOrStoredImages: boolean;
  /**
   * Owner/dealer attested that published images are plate-blurred / plate-safe.
   * Default false — attestation is explicit and never inferred from text masking.
   */
  ownerAttestedPlateSafeImages?: boolean;
}

export interface PlateInImagePrivacyResult {
  policyId: typeof PLATE_IN_IMAGE_PRIVACY_POLICY_ID;
  status: PlateInImagePrivacyStatus;
  /** Text masking alone is insufficient when images may show a plate. */
  textMaskingDoesNotCoverImagePlates: true;
  /** Block public-facing / revenue pilot until plate-safe images are attested. */
  blocksPublicFacingUse: boolean;
  warnings: string[];
}

export function evaluatePlateInImagePrivacyReadiness(
  input: PlateInImagePrivacyInput
): PlateInImagePrivacyResult {
  const attested = input.ownerAttestedPlateSafeImages === true;
  if (!input.hasSourceOrStoredImages) {
    return {
      policyId: PLATE_IN_IMAGE_PRIVACY_POLICY_ID,
      status: "not_applicable",
      textMaskingDoesNotCoverImagePlates: true,
      blocksPublicFacingUse: false,
      warnings: [],
    };
  }
  if (attested) {
    return {
      policyId: PLATE_IN_IMAGE_PRIVACY_POLICY_ID,
      status: "owner_attested_plate_safe",
      textMaskingDoesNotCoverImagePlates: true,
      blocksPublicFacingUse: false,
      warnings: [],
    };
  }
  return {
    policyId: PLATE_IN_IMAGE_PRIVACY_POLICY_ID,
    status: "needs_owner_plate_safe_images",
    textMaskingDoesNotCoverImagePlates: true,
    blocksPublicFacingUse: true,
    warnings: [PLATE_IN_IMAGE_PRIVACY_IMPORT_WARNING],
  };
}
