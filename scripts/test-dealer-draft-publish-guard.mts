/**
 * Draft publish guard — required fields before marketplace
 * npm run test:dealer-draft-publish-guard
 */
import {
  validateDraftForPublish,
  getValidPublishImages,
} from "../src/utils/dealerPublishGuard.ts";
import {
  getDealerDraftById,
  updateDealerDraft,
  bulkAddDealerDrafts,
  removeDealerDraft,
} from "../src/server/dealerDraftInventory.ts";
import { publishDealerDraftToMarketplace } from "../src/server/publishDraftListing.ts";
import { createEmptyNormalizedRow } from "../src/utils/inventoryImport/inventoryImportSchema.ts";
import { THOR_AUTO_DEALER_ID } from "../src/utils/dealerIdentity.ts";

const BASE = process.env.APP_URL ?? "http://localhost:3000";
const TOKEN = process.env.NONGA_DEALER_API_TOKEN ?? "nonga-v4-dev-dealer-token";
const TEST_ID = `draft-guard-e2e-${Date.now()}`;

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function completeDraft(id: string) {
  return {
    id,
    brand: "Toyota",
    model: "Camry",
    price: 650000,
    images: [`/storage/listings/${id}/1.jpg`],
  };
}

async function main() {
  console.log("=== Dealer Draft Publish Guard ===\n");

  const v1 = validateDraftForPublish({
    id: "x1",
    brand: "Honda",
    model: "CRV",
    price: 500000,
    images: [],
  });
  ok(
    "1-no-image",
    !v1.ok && v1.missingFields.includes("image"),
    v1.missingLabelsThai.join(",")
  );
  ok(
    "1-thai-image",
    v1.missingLabelsThai.includes("ขาดรูปภาพสินค้า"),
    ""
  );

  const v2 = validateDraftForPublish({
    id: "x2",
    brand: "",
    model: "CRV",
    price: 500000,
    images: ["/storage/listings/x2/1.jpg"],
  });
  ok("2-no-brand", !v2.ok && v2.missingFields.includes("brand"), "");
  ok("2-thai-brand", v2.missingLabelsThai.includes("ขาดยี่ห้อรถ"), "");

  const v3 = validateDraftForPublish({
    id: "x3",
    brand: "Honda",
    model: "",
    price: 500000,
    images: ["/storage/listings/x3/1.jpg"],
  });
  ok("3-no-model", !v3.ok && v3.missingFields.includes("model"), "");

  const v4 = validateDraftForPublish({
    id: "x4",
    brand: "Honda",
    model: "CRV",
    price: 0,
    images: ["/storage/listings/x4/1.jpg"],
  });
  ok("4-no-price", !v4.ok && v4.missingFields.includes("price"), "");
  ok("4-thai-price", v4.missingLabelsThai.includes("ขาดราคาขาย"), "");

  const v5 = validateDraftForPublish({
    id: "x5",
    brand: "",
    model: "",
    price: 0,
    images: [],
  });
  ok("5-multi-missing", v5.missingFields.length >= 4, String(v5.missingFields.length));

  const v6 = validateDraftForPublish(completeDraft("x6"));
  ok("6-complete", v6.ok, v6.missingFields.join(","));

  const v7 = validateDraftForPublish({
    id: "x7",
    brand: "Honda",
    model: "CRV",
    price: 500000,
    images: [],
    sourceImageUrls: ["https://drive.google.com/drive/folders/abc"],
  });
  ok("7-drive-only", !v7.ok && v7.missingFields.includes("image"), "");

  ok(
    "8-placeholder-not-valid",
    getValidPublishImages("x8", [
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=600",
    ]).length === 0,
    ""
  );

  const norm = createEmptyNormalizedRow();
  bulkAddDealerDrafts([
    {
      id: TEST_ID,
      dealerId: THOR_AUTO_DEALER_ID,
      dealerName: "Test",
      ownerName: "Test",
      phone: "0815553335",
      rawRow: {},
      normalizedData: norm,
      missingFields: ["image", "price"],
      warnings: [],
      confidenceScore: 40,
      status: "draft",
      images: [],
      title: "Guard Test",
      brand: "TestBrand",
      model: "TestModel",
      year: 2020,
      price: 0,
      mileage: 0,
      fuelType: "petrol",
      condition: "มือสอง",
      description: "e2e guard",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);

  const serverBlock = await publishDealerDraftToMarketplace(TEST_ID);
  ok(
    "9-server-reject",
    "error" in serverBlock &&
      serverBlock.error === "missing_required_fields",
    JSON.stringify(serverBlock).slice(0, 80)
  );

  updateDealerDraft(TEST_ID, {
    price: 450000,
    images: [`/storage/listings/${TEST_ID}/1.jpg`],
    description: "e2e guard publish complete",
  });
  const serverOk = await publishDealerDraftToMarketplace(TEST_ID);
  ok(
    "10-server-publish-with-fix",
    "car" in serverOk,
    "error" in serverOk ? serverOk.error : "ok"
  );
  if ("car" in serverOk) {
    removeDealerDraft(TEST_ID);
  }

  try {
    const ping = await fetch(BASE);
    ok("11-server-http", ping.ok, String(ping.status));
  } catch (e) {
    ok("11-server-http", false, String(e));
    console.log("\nSkip API test");
    process.exit(process.exitCode === 1 ? 1 : 0);
  }

  const hdrs = {
    Authorization: `Bearer ${TOKEN}`,
    "X-Dealer-Id": THOR_AUTO_DEALER_ID,
    "X-User-Role": "dealer",
    "Content-Type": "application/json",
  };
  const listRes = await fetch(`${BASE}/api/dealer/drafts`, { headers: hdrs });
  const listBody = await listRes.json();
  const draftList = (listBody.data ?? []) as {
    id: string;
    brand: string;
    model: string;
    year: number;
    price: number;
    images: string[];
  }[];
  const target = draftList.find((d) => d.brand?.trim() && d.model?.trim());
  if (target) {
    const savedImages = target.images ?? [];
    await fetch(`${BASE}/api/dealer/drafts/${target.id}`, {
      method: "PATCH",
      headers: hdrs,
      body: JSON.stringify({
        brand: target.brand,
        model: target.model,
        year: target.year || 2020,
        price: target.price || 100000,
        images: [],
      }),
    });
    const res = await fetch(
      `${BASE}/api/dealer/drafts/${target.id}/publish`,
      { method: "POST", headers: hdrs }
    );
    const body = await res.json();
    const rejected =
      res.status === 400 &&
      body.error === "missing_required_fields" &&
      (body.missingFields?.includes("image") ||
        body.missingLabelsThai?.some((l: string) => l.includes("รูป")));
    ok("12-api-reject", rejected, JSON.stringify(body).slice(0, 120));
    if (savedImages.length) {
      await fetch(`${BASE}/api/dealer/drafts/${target.id}`, {
        method: "PATCH",
        headers: hdrs,
        body: JSON.stringify({ images: savedImages }),
      });
    }
  } else {
    ok("12-api-reject", true, "skip — no drafts on server");
  }

  console.log("\nDone.");
  process.exit(process.exitCode === 1 ? 1 : 0);
}

main();
