/**
 * v5.4.4i — Server-side magic-byte image validation
 * npm run test:v544i-image-magic-byte-validation
 */
import fs from "fs";
import path from "path";
import {
  IMAGE_UPLOAD_CORRUPTED_MESSAGE,
  IMAGE_UPLOAD_UNSUPPORTED_MESSAGE,
  validateImageUploadBuffer,
} from "../src/server/imageMagicByteValidation.ts";
import {
  PASTE_SOURCE_MAX_BYTES,
  processListingImageUpload,
} from "../src/server/listingImageProcessor.ts";
import {
  getListingImagesRoot,
  saveListingImageUpload,
} from "../src/server/listingImageStorage.ts";
import { persistPasteUploadedImages } from "../src/server/pasteUploadedImageStorage.ts";

const TINY_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const TINY_JPEG_B64 =
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDABALDA4MChAODQ4SERATGCgaGBwWGh0jICcwPjA/QUBBQFBSUFBQUFBSUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFD/wAALCAABAAEBAREA/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGeB//Z";

/** Minimal 1x1 lossy WebP */
const TINY_WEBP_B64 = "UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=";

function tinyPng(): Buffer {
  return Buffer.from(TINY_PNG_B64, "base64");
}

function tinyJpeg(): Buffer {
  return Buffer.from(TINY_JPEG_B64, "base64");
}

function tinyWebp(): Buffer {
  return Buffer.from(TINY_WEBP_B64, "base64");
}

function pass(label: string): void {
  console.log(`PASS: ${label}`);
}

function fail(label: string, detail = ""): never {
  console.error(`FAIL: ${label}`, detail);
  process.exit(1);
}

function assertOk(
  label: string,
  result:
    | { ok: true; storedUrl?: string; data?: { mainBuffer: Buffer } }
    | { ok: false; message?: string; error?: string }
): { ok: true; storedUrl?: string; data?: { mainBuffer: Buffer } } {
  if (result.ok === false) {
    fail(label, result.message ?? result.error ?? "unexpected reject");
  }
  return result;
}

function assertReject(
  label: string,
  result: { ok: boolean; message?: string; error?: string },
  expectedMessage?: string
): void {
  if (result.ok) fail(label, "expected reject");
  const msg = result.message ?? result.error ?? "";
  if (expectedMessage && !msg.includes(expectedMessage)) {
    fail(label, `expected "${expectedMessage}" got "${msg}"`);
  }
  if (/stack|Error:|at\s+\S+\.(ts|js)/i.test(msg)) {
    fail(label, "response leaked technical detail");
  }
  pass(label);
}

function cleanupListingDir(listingId: string): void {
  const dir = path.join(getListingImagesRoot(), listingId);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

async function main(): Promise<void> {
  console.log("=== Nong A v5.4.4i Image Magic-byte Validation ===\n");

  const pngMagic = await validateImageUploadBuffer(tinyPng(), "image/png");
  if (pngMagic.ok === false) fail("valid-png-magic", "rejected valid PNG");
  pass("valid-png-magic");

  const jpegMagic = await validateImageUploadBuffer(tinyJpeg(), "image/jpeg");
  if (jpegMagic.ok === false) fail("valid-jpeg-magic", "rejected valid JPEG");
  pass("valid-jpeg-magic");

  const webpMagic = await validateImageUploadBuffer(tinyWebp(), "image/webp");
  if (webpMagic.ok === false) fail("valid-webp-magic", "rejected valid WebP");
  pass("valid-webp-magic");

  const fakeHtml = await validateImageUploadBuffer(
    Buffer.from("<html><script>alert(1)</script></html>", "utf8"),
    "image/jpeg"
  );
  if (fakeHtml.ok !== false || fakeHtml.message !== IMAGE_UPLOAD_UNSUPPORTED_MESSAGE) {
    fail("fake-jpg-html", fakeHtml.ok === true ? "accepted html" : fakeHtml.message);
  }
  pass("fake-jpg-html");

  const mimeMismatch = await validateImageUploadBuffer(tinyPng(), "image/jpeg");
  if (mimeMismatch.ok !== false || mimeMismatch.message !== IMAGE_UPLOAD_UNSUPPORTED_MESSAGE) {
    fail("mime-mismatch", mimeMismatch.ok === true ? "accepted mismatch" : mimeMismatch.message);
  }
  pass("mime-mismatch");

  const unsupportedMime = await validateImageUploadBuffer(tinyPng(), "image/gif");
  if (unsupportedMime.ok !== false || unsupportedMime.message !== IMAGE_UPLOAD_UNSUPPORTED_MESSAGE) {
    fail("unsupported-mime", unsupportedMime.ok === true ? "accepted gif" : unsupportedMime.message);
  }
  pass("unsupported-mime");

  const truncatedJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
  const corruptedProcess = await processListingImageUpload(
    truncatedJpeg,
    "image/jpeg",
    "broken.jpg"
  );
  assertReject("corrupted-image", corruptedProcess, IMAGE_UPLOAD_CORRUPTED_MESSAGE);

  const oversized = Buffer.alloc(PASTE_SOURCE_MAX_BYTES + 1, 0xff);
  const sizeLimit = await processListingImageUpload(oversized, "image/jpeg", "big.jpg");
  assertReject("size-limit", sizeLimit, "ไฟล์ใหญ่เกิน");

  const badListingId = await saveListingImageUpload(
    "../evil",
    tinyPng(),
    "image/png",
    "x"
  );
  assertReject("path-traversal-listing-id", badListingId, "รหัสประกาศไม่ถูกต้อง");

  const carId = `car-magic-${Date.now()}`;
  try {
    const saved = assertOk(
      "save-listing-valid-png",
      await saveListingImageUpload(carId, tinyPng(), "image/png", "ok.png")
    );
    if (!saved.storedUrl?.startsWith(`/storage/listings/${carId}/`)) {
      fail("save-listing-valid-png", saved.storedUrl ?? "");
    }
    pass("save-listing-valid-png");

    const processed = assertOk(
      "process-listing-valid-png",
      await processListingImageUpload(tinyPng(), "image/png", "ok.png")
    );
    if ((processed.data?.mainBuffer.length ?? 0) === 0) {
      fail("process-listing-valid-png", "empty main buffer");
    }
    pass("process-listing-valid-png");
  } finally {
    cleanupListingDir(carId);
  }

  const draftId = `draft-import-${Date.now()}-d0`;
  try {
    const pasteOk = await persistPasteUploadedImages(draftId, [
      { mimeType: "image/png", dataBase64: TINY_PNG_B64, name: "paste.png" },
    ]);
    if (pasteOk.ok === false) fail("paste-valid-png", pasteOk.message);
    pass("paste-valid-png");

    const pasteFake = await persistPasteUploadedImages(draftId, [
      {
        mimeType: "image/jpeg",
        dataBase64: Buffer.from("<html>x</html>", "utf8").toString("base64"),
        name: "fake.jpg",
      },
    ]);
    if (pasteFake.ok === false || pasteFake.failed.length === 0) {
      fail("paste-fake-jpg", "expected per-file failure");
    }
    pass("paste-fake-jpg");
  } finally {
    cleanupListingDir(draftId);
  }

  console.log("\n=== v5.4.4i image magic-byte validation — OK ===");
}

main().catch((err) => {
  console.error("FAIL: unhandled", err instanceof Error ? err.message : err);
  process.exit(1);
});
