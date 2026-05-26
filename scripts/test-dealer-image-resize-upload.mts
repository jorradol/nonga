/**
 * Dealer paste — large image resize/compress before storage
 * npm run test:dealer-image-resize-upload
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import {
  isAllowedPasteUploadFile,
  PASTE_MAX_UPLOAD_FILE_BYTES,
} from "../src/utils/inventoryImport/pasteUploadedImageQueue.ts";
import {
  decodeSinglePasteUploadFile,
  persistPasteUploadedImages,
} from "../src/server/pasteUploadedImageStorage.ts";
import {
  LISTING_MAIN_MAX_WIDTH,
  LISTING_THUMB_MAX_WIDTH,
  processListingImageUpload,
} from "../src/server/listingImageProcessor.ts";
import { getListingImagesRoot } from "../src/server/listingImageStorage.ts";
import { validateDraftForPublish } from "../src/utils/dealerPublishGuard.ts";
import { THOR_AUTO_DEALER_ID } from "../src/utils/dealerIdentity.ts";

const BASE = process.env.APP_URL ?? "http://localhost:3000";
const TOKEN = process.env.NONGA_DEALER_API_TOKEN ?? "nonga-v4-dev-dealer-token";
const THOR = THOR_AUTO_DEALER_ID;

const hdrs = (): Record<string, string> => ({
  Authorization: `Bearer ${TOKEN}`,
  "X-Dealer-Id": THOR,
  "X-User-Role": "dealer",
  "Content-Type": "application/json",
});

async function commitDraft(
  draftId: string,
  images: string[],
  title: string
): Promise<void> {
  const res = await fetch(`${BASE}/api/dealer/import/commit`, {
    method: "POST",
    headers: hdrs(),
    body: JSON.stringify({
      published: [],
      drafts: [
        {
          sourceRowIndex: 1,
          importStatus: "warning",
          title,
          brand: "Toyota",
          model: "ResizeTest",
          year: 2020,
          price: 450000,
          type: "used",
          condition: "มือสอง",
          mileage: 40000,
          fuelType: "petrol",
          description: "resize upload test",
          images,
          commitDraftId: draftId,
          skipSourceImageDownload: true,
          disposition: "draft",
        },
      ],
      owner: {
        dealerId: THOR,
        ownerId: `owner-${THOR}`,
        ownerName: "Resize Test",
        ownerPhone: "0815553335",
        showroomName: "Thor Auto",
      },
    }),
  });
  if (!res.ok) {
    const body = await res.json();
    throw new Error(body.message ?? `commit ${res.status}`);
  }
}

const TINY_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

function mockFile(name: string, type: string, size: number): File {
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], name, { type });
}

async function makeLargeJpeg(minBytes: number): Promise<Buffer> {
  const w = 3200;
  const h = 2400;
  const raw = Buffer.alloc(w * h * 3);
  for (let i = 0; i < raw.length; i++) {
    raw[i] = (i * 17 + 93) % 256;
  }
  const buf = await sharp(raw, { raw: { width: w, height: h, channels: 3 } })
    .jpeg({ quality: 95, mozjpeg: true })
    .toBuffer();
  ok(
    "setup-large-jpeg",
    buf.length > 3 * 1024 * 1024 && buf.length <= PASTE_MAX_UPLOAD_FILE_BYTES,
    `${Math.round(buf.length / 1024 / 1024)}MB`
  );
  ok(
    "1-over-old-5mb-client",
    isAllowedPasteUploadFile(mockFile("cam.jpg", "image/jpeg", 6 * 1024 * 1024)) ===
      null,
    ""
  );
  return buf;
}

async function main() {
  console.log("=== Dealer Image Resize Upload ===\n");

  // Case 1: client accepts >5MB under 15MB
  ok(
    "1-accept-8mb",
    isAllowedPasteUploadFile(mockFile("big.jpg", "image/jpeg", 8 * 1024 * 1024)) ===
      null,
    ""
  );
  ok(
    "1b-reject-25mb",
    isAllowedPasteUploadFile(
      mockFile("huge.jpg", "image/jpeg", 25 * 1024 * 1024)
    ) != null,
    ""
  );

  // Case 5: PDF reject
  ok(
    "5-reject-pdf",
    isAllowedPasteUploadFile(mockFile("x.pdf", "application/pdf", 1000)) != null,
    ""
  );

  // Case 4: server rejects >15MB
  const over = decodeSinglePasteUploadFile(
    {
      mimeType: "image/jpeg",
      dataBase64: Buffer.alloc(PASTE_MAX_UPLOAD_FILE_BYTES + 1).toString("base64"),
      name: "too-big.jpg",
    },
    0
  );
  if (over.ok === false) {
    ok("4-server-reject-25mb", true, over.failure.error);
  } else {
    ok("4-server-reject-25mb", false, "should reject");
  }

  const largeJpeg = await makeLargeJpeg(6 * 1024 * 1024);

  const processed = await processListingImageUpload(
    largeJpeg,
    "image/jpeg",
    "large.jpg"
  );
  if (processed.ok === false) {
    ok("2-process-large", false, processed.error);
  } else {
    ok("2-process-large", true, "");
    ok(
      "2-main-width",
      processed.data.mainWidth <= LISTING_MAIN_MAX_WIDTH,
      String(processed.data.mainWidth)
    );
    const thumbMeta = await sharp(processed.data.thumbBuffer).metadata();
    ok(
      "2-thumb-width",
      (thumbMeta.width ?? 9999) <= LISTING_THUMB_MAX_WIDTH,
      String(thumbMeta.width)
    );
    ok(
      "2-smaller-than-source",
      processed.data.mainBuffer.length < largeJpeg.length,
      `${processed.data.mainBuffer.length} vs ${largeJpeg.length}`
    );
  }

  const listingId = `draft-import-${Date.now()}-d0`;
  const up = await persistPasteUploadedImages(listingId, [
    {
      mimeType: "image/jpeg",
      dataBase64: largeJpeg.toString("base64"),
      name: "large.jpg",
    },
  ]);
  ok(
    "1-save-large",
    up.ok === true && up.storedUrls.length === 1,
    up.ok ? up.storedUrls[0] : (up as { message?: string }).message ?? ""
  );

  if (up.ok) {
    const mainUrl = up.storedUrls[0];
    ok(
      "1-storage-ext",
      /\.(webp|jpe?g)$/i.test(mainUrl),
      mainUrl
    );
    const root = getListingImagesRoot();
    const mainFile = path.join(root, listingId, path.basename(mainUrl));
    const thumbFile = path.join(
      root,
      listingId,
      path.basename(up.thumbnails[0] ?? "")
    );
    ok("1-main-on-disk", fs.existsSync(mainFile), mainFile);
    ok("1-thumb-on-disk", fs.existsSync(thumbFile), thumbFile);
    ok(
      "1-no-raw-original",
      fs.readdirSync(path.join(root, listingId)).every(
        (f) => !f.includes("large.jpg")
      ),
      ""
    );

    const guard = validateDraftForPublish({
      id: listingId,
      brand: "Honda",
      model: "CRV",
      year: 2020,
      price: 500000,
      mileage: 45000,
      images: up.storedUrls,
    });
    ok("7-publish-guard", guard.ok, guard.missingLabelsThai.join(","));
  }

  // Case 3: batch up to 10 images
  const batchId = `draft-import-${Date.now()}-d1`;
  const batchFiles = await Promise.all(
    Array.from({ length: 10 }, async (_, i) => {
      const buf = await sharp({
        create: {
          width: 800 + i * 10,
          height: 600,
          channels: 3,
          background: { r: i * 20, g: 50, b: 100 },
        },
      })
        .png()
        .toBuffer();
      return {
        mimeType: "image/png",
        dataBase64: buf.toString("base64"),
        name: `batch-${i}.png`,
      };
    })
  );
  const batch = await persistPasteUploadedImages(batchId, batchFiles);
  ok(
    "3-ten-images",
    batch.ok === true && batch.storedUrls.length === 10,
    batch.ok ? String(batch.storedUrls.length) : ""
  );

  // Case 6: partial failure — valid + corrupt
  const partialId = `draft-import-${Date.now()}-d2`;
  const partial = await persistPasteUploadedImages(partialId, [
    { mimeType: "image/png", dataBase64: TINY_PNG, name: "ok.png" },
    { mimeType: "image/jpeg", dataBase64: "not-valid-base64!!!", name: "bad.jpg" },
  ]);
  ok(
    "6-partial-save",
    partial.ok === true &&
      partial.storedUrls.length === 1 &&
      partial.failed.length >= 1,
    partial.ok
      ? `stored=${partial.storedUrls.length} failed=${partial.failed.length}`
      : ""
  );

  // Case 6: draft edit upload uses same resize pipeline (HTTP)
  const draftRouteId = `draft-import-${Date.now()}-d9`;
  await commitDraft(draftRouteId, [], "Case6 Draft Route");
  const draftUpRes = await fetch(
    `${BASE}/api/dealer/drafts/${encodeURIComponent(draftRouteId)}/upload-images`,
    {
      method: "POST",
      headers: hdrs(),
      body: JSON.stringify({
        files: [{ mimeType: "image/png", dataBase64: TINY_PNG, name: "d.png" }],
      }),
    }
  );
  const draftUpBody = await draftUpRes.json();
  ok(
    "6-draft-route-resize",
    draftUpRes.ok &&
      /\.webp$/i.test(draftUpBody.data?.storedUrls?.[0] ?? ""),
    draftUpBody.data?.storedUrls?.[0] ?? draftUpBody.message ?? ""
  );

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
