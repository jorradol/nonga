import { existsSync, readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v22.17-staging-image-durability-plate-in-image-privacy-review.md";
const FIXTURE_PATH =
  "docs/examples/v22.17-staging-image-durability-plate-in-image-privacy-review.example.json";

const EXPECTED_RECOMMENDATION =
  "NEED REVIEW — staging image backend and CSV import path are fixed for durable Firebase Storage serving, and plate-in-image privacy policy/warnings are in place, but existing Thor imported listings still reference ephemeral /storage/listings paths until owner-browser Confirm Import re-run; production/public/real lead/dealer-facing remain blocked.";

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

console.log("=== v22.17 image durability + plate-in-image privacy validator ===\n");

check("doc exists", existsSync(DOC_PATH));
check("fixture exists", existsSync(FIXTURE_PATH));

const doc = readText(DOC_PATH);
const fixture = JSON.parse(readText(FIXTURE_PATH));

check("execution type recorded", /IMAGE DURABILITY \+ PLATE-IN-IMAGE PRIVACY/i.test(doc));
check("root cause recorded", /ephemeral|imageBackend: file|404/i.test(doc));
check("firebase-storage decision recorded", /NONGA_IMAGE_BACKEND=firebase-storage|firebase-storage/i.test(doc));
check("plate-in-image policy recorded", /plate-in-image|text masking does \*\*not\*\*|ข้อความ/i.test(doc));
check("no production boundary", /no production deploy/i.test(doc));
check("no real lead boundary", /no real lead/i.test(doc));
check("no dealer-facing boundary", /no dealer-facing send/i.test(doc));
check("expected recommendation present", doc.includes(EXPECTED_RECOMMENDATION));
check("deploy revision recorded", /nonga-staging-00181-5k6/i.test(doc));
check("health firebase-storage recorded", /imageBackend:firebase-storage|imageBackend.*firebase-storage/i.test(doc));
check("owner re-import required recorded", /Confirm Import re-run|owner-browser/i.test(doc));

check("fixture version v22.17", fixture.version === "v22.17");
check(
  "fixture durable routing PASS",
  fixture.checks.durable_import_image_repository_routing === "PASS"
);
check(
  "fixture plate privacy PASS",
  fixture.checks.plate_in_image_privacy_warning === "PASS"
);
check(
  "fixture existing rows NEED_REVIEW",
  fixture.checks.existing_thor_rows_rewritten_to_firebase_urls === "NEED_REVIEW"
);
check("fixture no production", fixture.production_deploy_performed === false);
check("fixture no public", fixture.public_enable_performed === false);
check("fixture no real lead", fixture.real_lead_created === false);
check("fixture no dealer-facing send", fixture.dealer_facing_send_performed === false);
check("fixture recommendation matches", fixture.final_recommendation === EXPECTED_RECOMMENDATION);

if (failures > 0) {
  console.log(`\nFAIL v22.17 validator (${failures} checks)`);
  process.exit(1);
}

console.log("\nPASS test:v22.17-image-durability-plate-privacy-review");
