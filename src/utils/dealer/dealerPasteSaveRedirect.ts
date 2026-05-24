/** นำทางหลังบันทึก Dealer Paste Import เป็น Draft สำเร็จ */

import { DEALER_DRAFTS_PATH } from "./dealerDraftNavigation";

export { DEALER_DRAFTS_PATH };

/** redirect เฉพาะเมื่อ save สำเร็จ */
export function shouldRedirectAfterPasteDraftSave(success: boolean): boolean {
  return success === true;
}

/**
 * อัปเดต URL และ tab ภายใน Dealer Portal
 * @param setTab — จาก DealerPortalView (เช่น setTab("drafts"))
 */
export function navigateToDealerDraftsAfterPasteSave(
  setTab?: (tab: "drafts") => void
): void {
  if (typeof window === "undefined") return;
  window.history.replaceState(null, "", DEALER_DRAFTS_PATH);
  setTab?.("drafts");
}
