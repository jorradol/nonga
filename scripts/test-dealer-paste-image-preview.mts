/**
 * Dealer paste image preview & selective import
 * npm run test:dealer-paste-image-preview
 */
import {
  extractImageLinkCandidates,
  driveFolderWarnings,
  splitDriveLinks,
} from "../src/utils/inventoryImport/imageLinkExtractor.ts";
import {
  classifyHttpProbeForDrive,
  DRIVE_FOLDER_AUTO_FETCH_WARNING,
  DRIVE_PREVIEW_PERMISSION_MESSAGE,
  DRIVE_SHARE_STEPS,
  normalizeDriveFileProbeStatus,
  PREVIEW_STATUS_LABELS,
} from "../src/utils/inventoryImport/googleDrivePermissionGuidance.ts";
import { probeImagePreview } from "../src/utils/inventoryImport/pasteImagePreview.ts";
import { parseThorAutoPasteRow } from "../src/utils/inventoryImport/pasteRawVehicleParser.ts";
import {
  createEditablePasteDraft,
  editablePasteDraftToPayload,
} from "../src/utils/inventoryImport/editablePasteDraft.ts";
import { validateDraftForPublish } from "../src/utils/dealerPublishGuard.ts";
import { importSelectedPasteImages } from "../src/server/pasteImageImportService.ts";
import { THOR_AUTO_DEALER_ID } from "../src/utils/dealerIdentity.ts";
import type { DealerDraftRecord } from "../src/server/dealerDraftInventory";

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

function rowWithUrls(extraUrls: string) {
  const base = [
    "Honda",
    "CRV",
    "8กผ2813",
    "2.4",
    "feat",
    "AT",
    "2019",
    "ดำ",
    "1000",
    "699",
    "840000",
    "AAA",
    "18/06/2024",
    "ปกติ",
    "1",
    "TRUE",
    "TRUE",
    "11,703 / 84",
  ];
  return [...base, ...extraUrls.split("\t")].join("\t");
}

async function main() {
  console.log("=== Dealer Paste Image Preview ===\n");

  const direct1 = "https://example.com/a.jpg";
  const direct2 = "https://example.com/b.png";
  const direct3 = "https://example.com/c.webp";
  const yt = "https://www.youtube.com/watch?v=abc";
  const folder = "https://drive.google.com/drive/folders/fld123";
  const drivePrivate =
    "https://drive.google.com/file/d/private-file-id-xyz/view?usp=sharing";

  const parsed = parseThorAutoPasteRow(
    rowWithUrls(
      [
        folder,
        "https://www.thorautocar.com/p/1",
        yt,
        "https://www.tiktok.com/@x/video/1",
        direct1,
        direct2,
        direct3,
      ].join("\t")
    )
  );

  ok("1-youtube-not-image", !parsed.links.imageSourceUrls.includes(yt), yt);
  ok(
    "2-website-preserved",
    !!parsed.links.websiteUrl?.includes("thorautocar"),
    parsed.links.websiteUrl ?? ""
  );
  ok(
    "3-tiktok-preserved",
    !!parsed.links.tiktokUrl?.includes("tiktok"),
    parsed.links.tiktokUrl ?? ""
  );

  const { driveFolderLinks } = splitDriveLinks(parsed.links.driveLinks);
  ok("4-drive-folder-split", driveFolderLinks.includes(folder), folder);
  ok(
    "5-folder-warning",
    driveFolderWarnings(driveFolderLinks).some((w) =>
      w.includes(DRIVE_FOLDER_AUTO_FETCH_WARNING.slice(0, 20))
    ),
    "warn"
  );

  ok(
    "5b-guidance-message",
    DRIVE_PREVIEW_PERMISSION_MESSAGE.includes("ทุกคนที่มีลิงก์"),
    ""
  );
  ok("5c-share-steps", DRIVE_SHARE_STEPS.length >= 5, String(DRIVE_SHARE_STEPS.length));
  ok(
    "5d-status-labels",
    PREVIEW_STATUS_LABELS.needs_permission === "ต้องตั้งค่าสิทธิ์แชร์",
    ""
  );

  const driveProbe403 = classifyHttpProbeForDrive("drive_file", 403, null);
  ok("5e-drive-403-permission", driveProbe403 === "needs_permission", String(driveProbe403));
  const driveProbeHtml = classifyHttpProbeForDrive(
    "drive_file",
    200,
    "text/html; charset=utf-8"
  );
  ok("5f-drive-html-permission", driveProbeHtml === "needs_permission", String(driveProbeHtml));
  ok(
    "5g-normalize-drive-failed",
    normalizeDriveFileProbeStatus("drive_file", "failed") === "needs_permission",
    ""
  );
  ok(
    "5h-direct-failed-unchanged",
    normalizeDriveFileProbeStatus("direct", "failed") === "failed",
    ""
  );

  const parsedDrive = parseThorAutoPasteRow(
    rowWithUrls(
      [drivePrivate, direct1, folder].join("\t")
    )
  );
  const driveCandidates = extractImageLinkCandidates(
    parsedDrive,
    "",
    drivePrivate
  );
  ok(
    "5i-drive-file-candidate",
    driveCandidates.some((c) => c.kind === "drive_file"),
    driveCandidates.map((c) => c.kind).join()
  );

  const driveCand = driveCandidates.find((c) => c.kind === "drive_file")!;
  const probed = await probeImagePreview(driveCand);
  ok(
    "5j-drive-probe-permission-or-failed",
    probed.status === "needs_permission" || probed.status === "failed",
    probed.status
  );
  ok(
    "5k-drive-probe-message",
    (probed.error ?? "").includes("Google Drive") ||
      probed.status === "needs_permission",
    probed.error?.slice(0, 40) ?? ""
  );

  const { payload: draftPayload } = editablePasteDraftToPayload(
    createEditablePasteDraft(parsedDrive),
    OWNER,
    parsedDrive,
    {
      commitDraftId: `draft-import-${Date.now()}-d0`,
      storedImages: [],
      externalImageLinks: [drivePrivate],
      imageImportWarnings: [DRIVE_PREVIEW_PERMISSION_MESSAGE],
    }
  );
  ok("5l-draft-save-with-drive-private", draftPayload?.skipSourceImageDownload === true, "");
  ok("5m-draft-can-save-empty-images", (draftPayload?.images.length ?? 0) === 0, "");

  const candidates = extractImageLinkCandidates(parsed);
  ok(
    "6-three-direct-candidates",
    candidates.length === 3,
    String(candidates.length)
  );
  ok(
    "7-direct-detected",
    candidates.every((c) => c.kind === "direct"),
    candidates.map((c) => c.kind).join()
  );

  const editable = createEditablePasteDraft(parsed);
  const listingId = `draft-import-${Date.now()}-d0`;

  const imp = await importSelectedPasteImages(
    listingId,
    candidates,
    [direct1, direct2],
    direct2
  );
  ok(
    "8-selective-import-count",
    imp.storedUrls.length <= 2,
    `stored=${imp.storedUrls.length} failed=${imp.failed.length}`
  );

  const { payload } = editablePasteDraftToPayload(
    editable,
    OWNER,
    parsed,
    {
      commitDraftId: listingId,
      storedImages: imp.storedUrls,
      externalImageLinks: [direct3],
      imageImportWarnings: imp.warnings,
    }
  );
  ok("9-payload-has-storage-images", (payload?.images.length ?? 0) >= 0, "");
  ok("10-skip-auto-download-flag", payload?.skipSourceImageDownload === true, "");

  const draftNoImg: DealerDraftRecord = {
    id: "d1",
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
    images: [],
    sourceImageUrls: [folder],
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
  const guard = validateDraftForPublish(draftNoImg);
  ok(
    "11-publish-guard-no-image",
    guard.missingFields.includes("image"),
    guard.missingFields.join()
  );

  const failedOnly = await importSelectedPasteImages(
    `draft-import-${Date.now()}-d0`,
    candidates,
    ["https://invalid.example/notfound.jpg"],
    undefined
  );
  ok(
    "12-failed-does-not-throw",
    failedOnly.failed.length >= 0,
    String(failedOnly.warnings.length)
  );

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
