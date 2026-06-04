/**
 * v5.6E.5 — Seller queue panel copy + error kind mapping (UI only).
 */

export type SellerLeadQueuePanelErrorKind =
  | "forbidden"
  | "auth_required"
  | "sync_mismatch"
  | "load_failed"
  | "network";

export const SELLER_QUEUE_NO_LEADS_MESSAGE = "ยังไม่มีลีดสำหรับประกาศนี้";

export const SELLER_QUEUE_SYNC_MISMATCH_MESSAGE =
  "ยังไม่พบข้อมูลคิวในรอบนี้ อาจต้องให้ผู้ซื้อส่งความสนใจใหม่อีกครั้ง";

export const SELLER_QUEUE_LOAD_FAILED_MESSAGE =
  "โหลดคิวผู้สนใจไม่สำเร็จ ลองใหม่อีกครั้ง";

export function mapSellerQueueFetchError(params: {
  status: number;
  message?: string;
  interestCount: number;
  isListingOwnerContext?: boolean;
}): { kind: SellerLeadQueuePanelErrorKind; message: string; hidePanel: boolean } {
  const raw = String(params.message ?? "").trim();

  if (params.status === 401) {
    return {
      kind: "auth_required",
      message: raw || "กรุณาเข้าสู่ระบบก่อนดูคิวผู้สนใจครับ",
      hidePanel: true,
    };
  }

  if (params.status === 403) {
    if (params.isListingOwnerContext) {
      if (params.interestCount > 0) {
        return {
          kind: "sync_mismatch",
          message: SELLER_QUEUE_SYNC_MISMATCH_MESSAGE,
          hidePanel: false,
        };
      }
      return {
        kind: "sync_mismatch",
        message: SELLER_QUEUE_NO_LEADS_MESSAGE,
        hidePanel: true,
      };
    }
    return {
      kind: "forbidden",
      message: raw || "ไม่มีสิทธิ์ดูคิวนี้ครับ",
      hidePanel: true,
    };
  }

  if (params.interestCount > 0) {
    return {
      kind: "sync_mismatch",
      message: SELLER_QUEUE_SYNC_MISMATCH_MESSAGE,
      hidePanel: false,
    };
  }

  return {
    kind: params.status >= 500 ? "network" : "load_failed",
    message: SELLER_QUEUE_LOAD_FAILED_MESSAGE,
    hidePanel: false,
  };
}

export function shouldHideSellerQueuePanel(params: {
  interestCount: number;
  entryCount: number;
  errorKind?: SellerLeadQueuePanelErrorKind;
  hidePanel?: boolean;
}): boolean {
  if (params.hidePanel) return true;
  if (params.errorKind === "forbidden" || params.errorKind === "auth_required") return true;
  if (params.interestCount <= 0 && params.entryCount === 0) return true;
  return false;
}
