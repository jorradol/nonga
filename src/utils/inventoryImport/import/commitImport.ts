import type {
  ImportCommitResult,
  ImportOwnerContext,
  MarketplaceImportPayload,
} from "./types";
import { adminAuthHeadersAsync } from "../../apiAuthHeaders";
import { logTechnicalError, toUserFacingMessage } from "../../userFacingErrors";

function formatFailedRows(
  failed: { sourceRowIndex: number; message: string }[] | undefined
): string | null {
  if (!failed?.length) return null;
  const preview = failed
    .slice(0, 3)
    .map((row) => `แถว ${row.sourceRowIndex}: ${row.message}`)
    .join(" · ");
  const more =
    failed.length > 3 ? ` และอีก ${failed.length - 3} แถว` : "";
  return `${preview}${more}`;
}

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
    throw new Error(
      toUserFacingMessage(
        error instanceof Error ? error.message : String(error),
        "กรุณาเข้าสู่ระบบใหม่แล้วลอง Confirm Import อีกครั้งครับ"
      )
    );
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
    const rowLevel = formatFailedRows(body.failed);
    const technicalMessage =
      rowLevel ??
      body.message ??
      body.error ??
      `นำเข้าล้มเหลว (${res.status})`;
    logTechnicalError("inventory-import-commit", technicalMessage, {
      status: res.status,
      requestId: body.requestId,
      errorCode: body.errorCode,
    });
    const friendly = toUserFacingMessage(technicalMessage, fallbackMessage, {
      requestId: body.requestId,
    });
    const err = new Error(friendly) as Error & {
      requestId?: string;
      errorCode?: string;
    };
    err.requestId = body.requestId;
    err.errorCode = body.errorCode;
    throw err;
  }

  return body;
}
