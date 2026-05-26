import { getPublishMissingLabelsThai } from "../../../utils/dealerPublishGuard";

export function resolveMissingFieldsAfterChatImageUpload(
  missingFields: readonly string[],
  storedUrls: readonly string[]
): string[] {
  if (storedUrls.length === 0) return [...missingFields];
  return missingFields.filter((field) => field !== "image");
}

export function getChatDraftSaveMissingLabels(
  missingFields: readonly string[]
): string[] {
  return getPublishMissingLabelsThai(missingFields);
}
