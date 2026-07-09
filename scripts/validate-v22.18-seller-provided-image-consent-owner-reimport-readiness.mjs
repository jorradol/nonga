import { existsSync, readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v22.18-seller-provided-image-consent-owner-reimport-readiness.md";
const FIXTURE_PATH =
  "docs/examples/v22.18-seller-provided-image-consent-owner-reimport-readiness.example.json";

const EXPECTED_RECOMMENDATION =
  "NEED REVIEW — seller-provided image consent policy is aligned with owner decision, durable Firebase Storage image backend remains ready, and owner-browser Confirm Import re-run is still required so Thor rows receive durable Firebase Storage image URLs.";

let failures = 0;

function check(name, condition, detail = "") {
  if (condition) {
    console.log("PASS", name, detail);
    return;
  }
  failures += 1;
  console.log("FAIL", name, detail);
}

function readText(path) {
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

console.log("=== v22.18 seller-provided image consent validator ===\n");

check("doc exists", existsSync(DOC_PATH));
check("fixture exists", existsSync(FIXTURE_PATH));

const doc = readText(DOC_PATH);
const fixture = JSON.parse(readText(FIXTURE_PATH));

check("execution type recorded", /SELLER-PROVIDED IMAGE CONSENT/i.test(doc));
check("no blur required recorded", /ไม่บังคับ|no manual blur|Automated plate blur/i.test(doc));
check("consent wording recorded", /สิทธิ์เผยแพร่|publish rights|listing-use consent/i.test(doc));
check("text DTO privacy retained", /full plate|VIN|phone|address/i.test(doc));
check("firebase-storage retained", /firebase-storage/i.test(doc));
check("owner re-import still required", /Confirm Import re-run|owner-browser/i.test(doc));
check("expected recommendation present", doc.includes(EXPECTED_RECOMMENDATION));

check("fixture version v22.18", fixture.version === "v22.18");
check(
  "fixture seller images allowed PASS",
  fixture.checks.seller_provided_images_allowed_with_visible_plate === "PASS"
);
check(
  "fixture consent wording PASS",
  fixture.checks.seller_consent_right_to_publish_wording === "PASS"
);
check(
  "fixture no automated blur PASS",
  fixture.checks.no_automated_plate_blur_required === "PASS"
);
check(
  "fixture reimport NEED_REVIEW",
  fixture.checks.owner_browser_confirm_import_reimport_still_required ===
    "NEED_REVIEW"
);
check("fixture no production", fixture.production_deploy_performed === false);
check("fixture no public", fixture.public_enable_performed === false);
check("fixture no real lead", fixture.real_lead_created === false);
check("fixture no dealer-facing send", fixture.dealer_facing_send_performed === false);
check("fixture recommendation matches", fixture.final_recommendation === EXPECTED_RECOMMENDATION);

if (failures > 0) {
  console.log(`\nFAIL v22.18 validator (${failures} checks)`);
  process.exit(1);
}

console.log("\nPASS test:v22.18-seller-provided-image-consent-review");
