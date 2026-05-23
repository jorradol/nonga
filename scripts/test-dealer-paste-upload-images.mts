/**
 * Dealer paste — local image upload + merged selection
 * npm run test:dealer-paste-upload-images
 */
import {
  isAllowedPasteUploadFile,
  PASTE_MAX_IMAGES_TOTAL,
  canSelectMore,
  countTotalSelected,
} from "../src/utils/inventoryImport/pasteUploadedImageQueue.ts";
import {
  mergeLinkAndUploadStoredUrls,
  uploadPrimaryKey,
  orderStoredImagesWithPrimary,
} from "../src/utils/inventoryImport/pasteImageSelectionState.ts";
import { persistPasteUploadedImages } from "../src/server/pasteUploadedImageStorage.ts";
import { validateDraftForPublish } from "../src/utils/dealerPublishGuard.ts";
import { editablePasteDraftToPayload } from "../src/utils/inventoryImport/editablePasteDraft.ts";
import { parseThorAutoPasteRow } from "../src/utils/inventoryImport/pasteRawVehicleParser.ts";
import { createEditablePasteDraft } from "../src/utils/inventoryImport/editablePasteDraft.ts";
import { THOR_AUTO_DEALER_ID } from "../src/utils/dealerIdentity.ts";
import type { DealerDraftRecord } from "../src/server/dealerDraftInventory";

const TINY_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const OWNER = {
  dealerId: THOR_AUTO_DEALER_ID,
  ownerId: "owner-thor-auto",
  ownerName: "Test",
  ownerPhone: "0815553335",
  showroomName: "Thor Auto",
};

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function mockFile(name: string, type: string, size: number): File {
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], name, { type });
}

async function main() {
  console.log("=== Dealer Paste Upload Images ===\n");

  ok(
    "1-reject-pdf",
    isAllowedPasteUploadFile(mockFile("x.pdf", "application/pdf", 100)) != null,
    ""
  );
  ok(
    "2-accept-jpg",
    isAllowedPasteUploadFile(mockFile("a.jpg", "image/jpeg", 1000)) === null,
    ""
  );
  ok(
    "2b-accept-10mb",
    isAllowedPasteUploadFile(
      mockFile("big.jpg", "image/jpeg", 10 * 1024 * 1024)
    ) === null,
    ""
  );
  ok(
    "3-max-selection",
    !canSelectMore(PASTE_MAX_IMAGES_TOTAL, 0),
    ""
  );
  ok(
    "4-count-total",
    countTotalSelected(2, 2) === 4,
    ""
  );

  const listingId = `draft-import-${Date.now()}-d0`;
  const up1 = await persistPasteUploadedImages(listingId, [
    {
      mimeType: "image/png",
      dataBase64: TINY_PNG_B64,
      name: "one.png",
    },
  ]);
  if (up1.ok === false) {
    ok("5-upload-one", false, up1.message);
    return;
  }
  ok(
    "5-upload-one",
    up1.storedUrls.length === 1 &&
      /\.(webp|jpe?g|png)$/i.test(up1.storedUrls[0] ?? ""),
    up1.storedUrls[0] ?? ""
  );

  const up2 = await persistPasteUploadedImages(listingId, [
    { mimeType: "image/png", dataBase64: TINY_PNG_B64, name: "two.png" },
  ]);
  if (up2.ok === false) {
    ok("6-upload-second", false, up2.message);
    return;
  }
  ok("6-upload-second", up2.storedUrls.length === 1, "");

  const uploadIdToUrl = new Map([["u1", up2.storedUrls[0]]]);
  const merged = mergeLinkAndUploadStoredUrls(
    up1.storedUrls,
    up2.storedUrls,
    uploadPrimaryKey("u1"),
    uploadIdToUrl
  );
  ok(
    "7-merge-two-with-primary",
    merged.length === 2 && merged[0] === up2.storedUrls[0],
    merged.join()
  );

  const ordered = orderStoredImagesWithPrimary(
    [up1.storedUrls[0], up2.storedUrls[0]],
    up2.storedUrls[0]
  );
  ok("8-primary-first", ordered[0] === up2.storedUrls[0], ordered[0] ?? "");

  const draftWithUpload: DealerDraftRecord = {
    id: listingId,
    dealerId: THOR_AUTO_DEALER_ID,
    dealerName: "T",
    ownerName: "T",
    phone: "0",
    rawRow: {},
    normalizedData: {} as never,
    missingFields: [],
    warnings: [],
    confidenceScore: 0,
    status: "draft",
    images: merged,
    title: "T",
    brand: "Honda",
    model: "CRV",
    year: 2019,
    price: 699000,
    mileage: 0,
    fuelType: "petrol",
    condition: "มือสอง",
    description: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const guard = validateDraftForPublish(draftWithUpload);
  ok(
    "9-publish-guard-has-upload-image",
    !guard.missingFields.includes("image"),
    guard.missingFields.join()
  );

  const parsed = parseThorAutoPasteRow(
    ["Honda", "CRV", "x", "t", "f", "AT", "2019", "ดำ", "1", "699", "0", "A", "d", "n", "1", "T", "T", "m"].join(
      "\t"
    )
  );
  const { payload } = editablePasteDraftToPayload(
    createEditablePasteDraft(parsed),
    OWNER,
    parsed,
    {
      commitDraftId: listingId,
      storedImages: merged,
    }
  );
  ok(
    "10-draft-payload-images",
    (payload?.images.length ?? 0) >= 2,
    String(payload?.images.length)
  );
  ok("10b-skip-auto-download", payload?.skipSourceImageDownload === true, "");

  const tooMany = Array.from({ length: 13 }, (_, i) => ({
    mimeType: "image/png",
    dataBase64: TINY_PNG_B64,
    name: `f${i}.png`,
  }));
  const over = await persistPasteUploadedImages(
    `draft-import-${Date.now()}-d0`,
    tooMany
  );
  ok("11-reject-over-12", over.ok === false, over.ok === false ? "" : "should fail");

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
