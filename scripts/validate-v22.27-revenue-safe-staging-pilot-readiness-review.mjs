import { existsSync, readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v22.27-revenue-safe-staging-pilot-readiness-review.md";
const FIXTURE_PATH =
  "docs/examples/v22.27-revenue-safe-staging-pilot-readiness-review.example.json";

const EXPECTED_RECOMMENDATION =
  "PASS — revenue-safe staging pilot readiness review completed; staging is ready for owner-controlled revenue-safe pilot preparation, while public/production/real-lead/dealer-facing actions remain locked.";

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

console.log("=== v22.27 revenue-safe staging pilot readiness review validator ===\n");

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

check(
  "execution type recorded",
  /REVENUE-SAFE STAGING PILOT READINESS REVIEW/i.test(doc)
);
check("cloud run revision recorded", /nonga-staging-00188-tm7/.test(doc));
check("hosting asset recorded", /assets\/index-DqPChjiO\.js/.test(doc));
check("image tag recorded", /v20260709-multi-car-b5487b3/.test(doc));
check("marketplace count 13 PASS", /Marketplace count 13 \| \*\*PASS\*\*|marketplace count 13 \| \*\*PASS\*\*/i.test(doc) || /Marketplace count 13[\s\S]*?\*\*PASS\*\*/i.test(doc));
check("publicSignupEnabled false", /publicSignupEnabled[\s\S]*?false/i.test(doc));
check("buyer-lead 401", /401/.test(doc) && /buyer-lead/i.test(doc));
check("firestore + firebase-storage", /firestore/i.test(doc) && /firebase-storage/i.test(doc));
check("no production deploy", /no production deploy/i.test(doc));
check("no real lead", /no real lead/i.test(doc));
check("no dealer-facing send", /no dealer-facing send/i.test(doc));
check("pilot run not started", /pilot \*\*run\*\*: `not_started`|pilot run: `not_started`|Revenue-safe staging pilot \*\*run\*\*: `not_started`/i.test(doc));
check("expected recommendation present", doc.includes(EXPECTED_RECOMMENDATION));
check(
  "does not recommend public/production launch",
  /Not public launch ready/i.test(doc) && /Not production ready/i.test(doc)
);

check("fixture version v22.27", fixture.version === "v22.27");
check(
  "fixture cloud run",
  fixture.current_revisions?.cloud_run_revision === "nonga-staging-00188-tm7"
);
check(
  "fixture hosting asset",
  fixture.current_revisions?.hosting_asset === "assets/index-DqPChjiO.js"
);
check("fixture marketplace PASS", fixture.checks.marketplace_count_13 === "PASS");
check(
  "fixture dto PASS",
  fixture.checks.public_dto_redacts_full_plate_vin_phone_address_import_key === "PASS"
);
check("fixture chat PASS", fixture.checks.chat_professional_crv_camry_budget === "PASS");
check(
  "fixture persistence PASS",
  fixture.checks.chat_persistence_after_reopen === "PASS"
);
check("fixture no production", fixture.production_deploy_performed === false);
check("fixture no public", fixture.public_enable_performed === false);
check("fixture no real lead", fixture.real_lead_created === false);
check("fixture no dealer-facing send", fixture.dealer_facing_send_performed === false);
check("fixture pilot not started", fixture.pilot_run_started === false);
check("fixture no owner token", fixture.owner_token_requested === false);
check("fixture recommendation matches", fixture.final_recommendation === EXPECTED_RECOMMENDATION);

if (failures > 0) {
  console.log(`\nFAIL v22.27 validator (${failures} checks)`);
  process.exit(1);
}

console.log("\nPASS test:v22.27 validator");
