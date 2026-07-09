import { existsSync, readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v22.16-revenue-safe-staging-pilot-readiness-check-thor-imported-listings.md";
const FIXTURE_PATH =
  "docs/examples/v22.16-revenue-safe-staging-pilot-readiness-check-thor-imported-listings.example.json";

const EXPECTED_RECOMMENDATION =
  "NEED REVIEW — Thor Auto imported listings are visible and chat-retrievable on staging with privacy/lead boundaries intact, but durable cover/gallery image serving under the current file image backend remains unreliable and should be reviewed before revenue-safe pilot execution.";

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

function parseJson(path) {
  return JSON.parse(readText(path));
}

console.log("=== v22.16 revenue-safe staging pilot readiness check validator ===\n");

check("doc exists", existsSync(DOC_PATH));
check("fixture exists", existsSync(FIXTURE_PATH));

const doc = readText(DOC_PATH);
let fixture;
try {
  fixture = parseJson(FIXTURE_PATH);
  check("fixture parses json", true);
} catch (err) {
  check("fixture parses json", false, String(err));
  process.exit(1);
}

check("execution type recorded", /REVENUE-SAFE PILOT READINESS CHECK/i.test(doc));
check("marketplace list PASS recorded", /marketplace list shows imported Thor cars \| PASS/i.test(doc));
check("chat retrieve PASS recorded", /chat card retrieves imported persisted listings \| PASS/i.test(doc));
check("image serving NEED REVIEW recorded", /listing detail keeps images after refresh \| NEED REVIEW/i.test(doc));
check("public signup disabled PASS", /public signup remains disabled \| PASS/i.test(doc));
check("no real lead PASS", /no real lead created \| PASS/i.test(doc));
check("no dealer-facing send PASS", /no dealer-facing send triggered \| PASS/i.test(doc));
check("step 4 not started", /Step 4: `not_started`/i.test(doc));
check("pilot run not started", /pilot run: `not_started`|Revenue-safe staging pilot run: `not_started`/i.test(doc));
check("expected recommendation present", doc.includes(EXPECTED_RECOMMENDATION));

check("fixture version v22.16", fixture.version === "v22.16");
check("fixture marketplace PASS", fixture.checks.marketplace_list_shows_imported_thor_cars === "PASS");
check("fixture chat PASS", fixture.checks.chat_card_retrieves_imported_persisted_listings === "PASS");
check(
  "fixture images NEED_REVIEW",
  fixture.checks.listing_detail_keeps_images_after_refresh === "NEED_REVIEW"
);
check("fixture no production", fixture.production_deploy_performed === false);
check("fixture no public", fixture.public_enable_performed === false);
check("fixture no real lead", fixture.real_lead_created === false);
check("fixture no dealer-facing send", fixture.dealer_facing_send_performed === false);
check("fixture pilot not started", fixture.pilot_run_started === false);
check("fixture recommendation matches", fixture.final_recommendation === EXPECTED_RECOMMENDATION);

if (failures > 0) {
  console.log(`\nFAIL v22.16 validator (${failures} checks)`);
  process.exit(1);
}

console.log("\nPASS test:v22.16");
