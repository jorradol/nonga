import type {
  ImportCommitResult,
  ImportOwnerContext,
  MarketplaceImportPayload,
} from "./types";
import { adminAuthHeaders } from "../../apiAuthHeaders";

export async function commitInventoryImport(
  published: MarketplaceImportPayload[],
  drafts: MarketplaceImportPayload[],
  owner: ImportOwnerContext
): Promise<ImportCommitResult> {
  const res = await fetch("/api/admin/inventory-import/commit", {
    method: "POST",
    headers: adminAuthHeaders(),
    body: JSON.stringify({ published, drafts, owner }),
  });

  let body: ImportCommitResult & { error?: string };
  try {
    body = await res.json();
  } catch {
    throw new Error(`ไม่สามารถอ่านผลลัพธ์จากเซิร์ฟเวอร์ได้ (${res.status})`);
  }

  if (!res.ok || !body.success) {
    throw new Error(
      body.message ?? body.error ?? `นำเข้าล้มเหลว (${res.status})`
    );
  }

  return body;
}
