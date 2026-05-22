/**
 * Dealer paste import — ThorAuto tab-separated row parser
 * npm run test:dealer-paste-import
 */
import {
  parseThorAutoPasteRow,
  splitPasteRawLine,
} from "../src/utils/inventoryImport/pasteRawVehicleParser.ts";
import { pasteParsedToDraftPayload } from "../src/utils/inventoryImport/pasteToImportPayload.ts";
import {
  createEditablePasteDraft,
  editablePasteDraftToPayload,
} from "../src/utils/inventoryImport/editablePasteDraft.ts";
import { THOR_AUTO_DEALER_ID } from "../src/utils/dealerIdentity.ts";

const OWNER = {
  dealerId: THOR_AUTO_DEALER_ID,
  ownerId: "owner-thor-auto",
  ownerName: "Thor Auto Test",
  ownerPhone: "0815553335",
  showroomName: "Thor Auto",
};

const SAMPLE_ROW = [
  "Honda",
  "CRV",
  "8กผ2813",
  "2.4ES 4WD",
  "บ.หนังไฟฟ้าคู่หน้า + ไฟ.ลกข + ไฟหน้าLED",
  "AT",
  "2019",
  "ดำ",
  "161,392",
  "699",
  "840,000",
  "AAA",
  "18/06/2024",
  "ปกติ",
  "1",
  "TRUE",
  "TRUE",
  "11,703 / 84",
  "https://drive.google.com/drive/folders/abc123",
  "https://www.thorautocar.com/product/honda-crv-2019",
  "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "https://www.tiktok.com/@thorautocar/video/123",
].join("\t");

function ok(name: string, pass: boolean, detail = "") {
  console.log(pass ? "PASS" : "FAIL", name, detail);
  if (!pass) process.exitCode = 1;
}

async function main() {
  console.log("=== Dealer Paste Import (ThorAuto parser) ===\n");

  const cols = splitPasteRawLine(SAMPLE_ROW);
  ok("1-tab-columns", cols.length >= 18, `cols=${cols.length}`);

  const parsed = parseThorAutoPasteRow(SAMPLE_ROW);
  ok("2-brand", parsed.brand === "Honda", parsed.brand);
  ok("3-model", parsed.model === "CRV", parsed.model);
  ok("4-plate", parsed.plateNumber === "8กผ2813", parsed.plateNumber);
  ok("5-year", parsed.year === 2019, String(parsed.year));
  ok("6-mileage", parsed.mileage === 161392, String(parsed.mileage));
  ok("7-price", parsed.price === 699000, String(parsed.price));
  ok("8-price-confidence", parsed.priceConfidence === "medium", parsed.priceConfidence);
  ok("9-reference", parsed.referencePrice === 840000, String(parsed.referencePrice));
  ok("10-gear", parsed.transmissionNormalized === "อัตโนมัติ", parsed.transmissionNormalized);
  ok("11-color", parsed.colorNormalized === "ดำ", parsed.colorNormalized);
  ok(
    "12-website-url",
    !!parsed.links.websiteUrl?.includes("thorautocar.com"),
    parsed.links.websiteUrl ?? ""
  );
  ok(
    "13-youtube",
    !!parsed.links.youtubeUrl?.includes("youtube.com"),
    parsed.links.youtubeUrl ?? ""
  );
  ok(
    "14-tiktok",
    !!parsed.links.tiktokUrl?.includes("tiktok.com"),
    parsed.links.tiktokUrl ?? ""
  );
  ok("15-drive", parsed.links.driveLinks.length >= 1, String(parsed.links.driveLinks.length));
  ok(
    "16-drive-warning",
    parsed.warnings.some((w) => w.includes("Google Drive")),
    "drive warning"
  );
  ok(
    "17-image-warnings",
    parsed.warnings.some(
      (w) => w.includes("Google Drive") || w.includes("ไม่พบ URL รูป")
    ),
    "drive or no-image warning"
  );
  ok(
    "18-suggested-draft",
    parsed.suggestedDisposition === "draft",
    parsed.suggestedDisposition
  );

  const draft = pasteParsedToDraftPayload(parsed, OWNER);
  ok("19-draft-payload", draft != null, "");
  ok(
    "20-dealer-id",
    draft?.ownerId === OWNER.ownerId,
    `owner=${draft?.ownerId}`
  );
  ok(
    "21-draft-disposition",
    draft?.disposition === "draft",
    String(draft?.disposition)
  );
  ok(
    "22-draft-price",
    draft?.price === 699000,
    String(draft?.price)
  );

  const ambiguousRow = SAMPLE_ROW.split("\t");
  ambiguousRow[9] = "389";
  const parsed389 = parseThorAutoPasteRow(ambiguousRow.join("\t"));
  ok(
    "23-ambiguous-price-warning",
    parsed389.warnings.some((w) => w.includes("ไม่ชัดเจน") || w.includes("389")),
    "price ambiguity"
  );

  const editable389 = createEditablePasteDraft(parsed389);
  editable389.price = "389000";
  editable389.mileage = "88000";
  editable389.description = "รายละเอียดทดสอบแก้ไขจากฟอร์ม";
  const edited = editablePasteDraftToPayload(editable389, OWNER, parsed389);
  ok("24-edited-price", edited.payload?.price === 389000, String(edited.payload?.price));
  ok("25-edited-mileage", edited.payload?.mileage === 88000, String(edited.payload?.mileage));
  ok(
    "26-edited-description",
    (edited.payload?.description ?? "").includes("รายละเอียดทดสอบแก้ไข"),
    edited.payload?.description?.slice(0, 40)
  );
  ok(
    "27-drive-warning-preserved",
    edited.validation.warnings.some((w) => w.includes("Google Drive")),
    "drive"
  );
  ok(
    "28-draft-only-disposition",
    edited.payload?.disposition === "draft",
    String(edited.payload?.disposition)
  );

  const BASE = process.env.APP_URL ?? "http://localhost:3000";
  const TOKEN = process.env.NONGA_DEALER_API_TOKEN ?? "nonga-v4-dev-dealer-token";

  try {
    const ping = await fetch(BASE);
    ok("29-server", ping.ok, String(ping.status));
  } catch (e) {
    ok("29-server", false, String(e));
    console.log("\nSkip API draft commit — server not running");
    process.exit(process.exitCode === 1 ? 1 : 0);
  }

  const apiDraft = edited.payload ?? draft;
  if (apiDraft) {
    const res = await fetch(`${BASE}/api/dealer/import/commit`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "X-Dealer-Id": THOR_AUTO_DEALER_ID,
        "X-User-Role": "dealer",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        published: [],
        drafts: [apiDraft],
        owner: OWNER,
      }),
    });
    const body = await res.json();
    ok("30-api-draft-commit", res.ok && body.success === true, JSON.stringify(body).slice(0, 120));
    ok(
      "31-draft-count",
      (body.draftCount ?? 0) >= 1,
      `draftCount=${body.draftCount}`
    );
    ok(
      "32-api-published-zero",
      (body.publishedCount ?? 0) === 0,
      `published=${body.publishedCount}`
    );
  }

  console.log("\nDone.");
  process.exit(process.exitCode === 1 ? 1 : 0);
}

main();
