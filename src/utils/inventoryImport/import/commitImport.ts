import type {
  ImportCommitResult,
  ImportOwnerContext,
  MarketplaceImportPayload,
} from "./types";
import { adminAuthHeadersAsync } from "../../apiAuthHeaders";
import { logTechnicalError, toUserFacingMessage } from "../../userFacingErrors";

export async function commitInventoryImport(
  published: MarketplaceImportPayload[],
  drafts: MarketplaceImportPayload[],
  owner: ImportOwnerContext
): Promise<ImportCommitResult> {
  const fallbackMessage =
    "ระบบยังไม่พร้อมบันทึกข้อมูลใน staging กรุณาแจ้งผู้ดูแลระบบ";
  let headers: HeadersInit;
  try {
    headers = await adminAuthHeadersAsync("admin", {
      mode: "auto_legacy_compatible",
      allowViteAdminTokenFallback: false,
    });
  } catch (error) {
    logTechnicalError("inventory-import-auth", error);
    throw new Error(fallbackMessage);
  }

  const res = await fetch("/api/admin/inventory-import/commit", {
    method: "POST",
    headers,
    body: JSON.stringify({ published, drafts, owner }),
  });

  let body: ImportCommitResult & { error?: string };
  try {
    body = await res.json();
  } catch {
    throw new Error(`ไม่สามารถอ่านผลลัพธ์จากเซิร์ฟเวอร์ได้ (${res.status})`);
  }

  if (!res.ok || !body.success) {
    const technicalMessage =
      body.message ?? body.error ?? `นำเข้าล้มเหลว (${res.status})`;
    logTechnicalError("inventory-import-commit", technicalMessage, {
      status: res.status,
    });
    throw new Error(
      toUserFacingMessage(technicalMessage, fallbackMessage)
    );
  }

  return body;
}
