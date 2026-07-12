import { commitDealerImport } from "../src/services/dealer/dealerApi.ts";
import { toUserFacingMessage } from "../src/utils/userFacingErrors.ts";
import type { MarketplaceImportPayload } from "../src/utils/inventoryImport/import/types.ts";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

async function main() {
  const fallback =
    "ระบบยังไม่พร้อมบันทึกข้อมูลใน staging กรุณาแจ้งผู้ดูแลระบบ";
  const rawTokenError =
    "Missing admin API token for server mode (primary NONGA_ADMIN_API_TOKEN; optional explicit fallback VITE_NONGA_ADMIN_API_TOKEN)";
  assert(
    toUserFacingMessage(rawTokenError, fallback) === fallback,
    "user-facing message must hide env/token names"
  );

  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  const fakeFetch: typeof fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    return {
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        importedCount: 1,
        publishedCount: 1,
        draftCount: 0,
        skippedCount: 0,
        warningCount: 0,
        errorCount: 0,
        imported: [],
        drafts: [],
        failed: [],
      }),
    } as Response;
  }) as typeof fetch;
  globalThis.fetch = fakeFetch;

  try {
    const sampleRow = {
      sourceRowIndex: 1,
      importStatus: "valid" as const,
      title: "Toyota Vios 2021",
      brand: "Toyota",
      model: "Vios",
      year: 2021,
      price: 369000,
      type: "used" as const,
      condition: "good",
      mileage: 127101,
      fuelType: "petrol",
      images: [] as string[],
      description: "Synthetic owner browser import row",
      ownerId: "owner-thor-auto",
      ownerName: "thor owner",
      ownerPhone: "",
      sourceImageUrls: [] as string[],
      rawRow: {
        "ทะเบียน/จังหวัด": "2ขร3120 กรุงเทพฯ",
      },
      warnings: [] as string[],
    } satisfies MarketplaceImportPayload;

    await commitDealerImport(
      { dealerId: "thor-auto", role: "dealer" },
      [sampleRow],
      [],
      {
        dealerId: "thor-auto",
        ownerId: "owner-thor-auto",
        ownerName: "thor owner",
        ownerPhone: "",
        showroomName: "Thor Auto",
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert(calls.length === 1, "expected one commit API call");
  assert(
    calls[0].url === "/api/dealer/import/commit",
    "owner browser flow must hit dealer commit endpoint"
  );
  assert(
    calls[0].init?.headers != null,
    "dealer commit must include authenticated headers"
  );

  console.log("PASS test-owner-browser-import-confirm-auth");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
