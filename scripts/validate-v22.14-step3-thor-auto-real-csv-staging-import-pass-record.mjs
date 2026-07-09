import { existsSync, readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v22.14-step3-thor-auto-real-csv-staging-import-pass-record.md";
const FIXTURE_PATH =
  "docs/examples/v22.14-step3-thor-auto-real-csv-staging-import-pass-record.example.json";

const EXPECTED_RECOMMENDATION =
  "PASS — Step 3 Thor Auto real CSV staging import core is complete, and the project is ready for the next controlled staging revenue-safe pilot readiness step.";

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

console.log("=== v22.14 Step 3 Thor CSV staging import PASS record validator ===\n");

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

check("execution type recorded", /CONTROLLED STAGING STEP 3 PASS RECORD/i.test(doc));
check("owner retest section exists", /Owner retest result/i.test(doc));
check("thor csv import succeeded stated", /Thor Auto real CSV import into staging succeeded/i.test(doc));
check("confirm import succeeded stated", /Confirm Import succeeded/i.test(doc));
check("listings remain after refresh stated", /remain visible after refresh/i.test(doc));
check("staging only stated", /still staging only/i.test(doc));
check("no production stated", /No production deploy occurred/i.test(doc));
check("no public stated", /No public enable occurred/i.test(doc));
check("no real lead stated", /No real lead creation occurred/i.test(doc));
check("no dealer-facing send stated", /No dealer-facing send occurred/i.test(doc));
check("revision 00180 recorded", /nonga-staging-00180-7sq/.test(doc));
check("step 3 completed true", /Step 3 completed\?: `true`/i.test(doc));
check("step 4 not started", /Step 4: `not_started`/i.test(doc));
check("expected recommendation present", doc.includes(EXPECTED_RECOMMENDATION));

check("fixture version v22.14", fixture.version === "v22.14");
check("fixture thor import succeeded", fixture.thor_csv_import_succeeded_in_staging === true);
check("fixture confirm import succeeded", fixture.confirm_import_succeeded === true);
check(
  "fixture listings remain after refresh",
  fixture.imported_listings_remain_after_refresh === true
);
check("fixture staging only", fixture.staging_only_confirmed === true);
check("fixture no production", fixture.production_deploy_performed === false);
check("fixture no public", fixture.public_enable_performed === false);
check("fixture no real lead", fixture.real_lead_created === false);
check("fixture no dealer-facing send", fixture.dealer_facing_send_performed === false);
check("fixture step 3 completed", fixture.step_3_completed === true);
check("fixture step 4 not started", fixture.step_4_status === "not_started");
check(
  "fixture recommendation matches",
  fixture.final_recommendation === EXPECTED_RECOMMENDATION
);

if (failures > 0) {
  console.log(`\nFAIL v22.14 validator (${failures} checks)`);
  process.exit(1);
}

console.log("\nPASS test:v22.14");
