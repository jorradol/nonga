/**
 * npm run test:payload-too-large
 */
import assert from "node:assert/strict";
import express from "express";
import {
  isListingImageUploadPath,
  registerJsonBodyParsers,
  registerPayloadTooLargeHandler,
} from "../src/server/httpBodyLimits.ts";
import {
  decodeListingImageFiles,
  MAX_LISTING_IMAGE_DECODED_BYTES,
} from "../src/server/listingImageUploadBody.ts";
import { mapHttpStatusToFriendly } from "../src/utils/appFriendlyError.ts";

assert.ok(isListingImageUploadPath("/api/cars/abc/images"));
assert.ok(!isListingImageUploadPath("/api/cars"));

const hugeB64 = Buffer.alloc(MAX_LISTING_IMAGE_DECODED_BYTES + 1).toString("base64");
const decoded = decodeListingImageFiles([
  { mimeType: "image/png", dataBase64: hugeB64, name: "big.png" },
]);
assert.equal(decoded.ok, false);
if (decoded.ok === false) {
  assert.equal(decoded.status, 413);
  assert.equal(decoded.error, "PAYLOAD_TOO_LARGE");
}

const friendly413 = mapHttpStatusToFriendly(413, "/api/cars/x/images");
assert.ok(friendly413.friendlyMessage.includes("ใหญ่เกินไป"));

const app = express();
registerJsonBodyParsers(app);
app.post("/api/ping", (req, res) => {
  res.json({ ok: true, keys: Object.keys(req.body ?? {}) });
});
registerPayloadTooLargeHandler(app);

await new Promise<void>((resolve, reject) => {
  const server = app.listen(0, async () => {
    try {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      const base = `http://127.0.0.1:${port}`;

      const big = await fetch(`${base}/api/ping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: "x".repeat(700_000) }),
      });
      assert.equal(big.status, 413);
      const ct = big.headers.get("content-type") ?? "";
      assert.ok(ct.includes("json"), `expected JSON, got ${ct}`);
      const json = (await big.json()) as { error?: string; message?: string };
      assert.equal(json.error, "PAYLOAD_TOO_LARGE");
      assert.ok(json.message?.includes("ใหญ่เกินไป"));

      server.close(() => resolve());
    } catch (e) {
      server.close(() => reject(e));
    }
  });
});

console.log("test:payload-too-large — OK");
