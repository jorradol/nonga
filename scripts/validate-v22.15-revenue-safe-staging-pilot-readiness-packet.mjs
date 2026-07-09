import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v22.15-revenue-safe-staging-pilot-readiness-packet.md";
const FIXTURE_PATH =
  "docs/examples/v22.15-revenue-safe-staging-pilot-readiness-packet.example.json";
const PASS_DOC_PATH =
  "docs/v22.14-step3-thor-auto-real-csv-staging-import-pass-record.md";

const EXPECTED_RECOMMENDATION =
  "PASS — v22.15 revenue-safe staging pilot readiness packet prepared; Step 3 import core remains complete; pilot run not started.";

const REQUIRED_CHECKS = [
  "marketplace list shows imported Thor cars",
  "listing detail refresh keeps data/images",
  "chat card can retrieve imported persisted listings",
  "license plate remains masked and full plate is not echoed",
  "no real lead is created",
  "no dealer-facing send is triggered",
  "public signup remains disabled",
];

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

console.log("=== v22.15 revenue-safe staging pilot readiness packet validator ===\n");

check("doc exists", existsSync(DOC_PATH));
check("fixture exists", existsSync(FIXTURE_PATH));
check("v22.14 pass doc exists", existsSync(PASS_DOC_PATH));

const doc = readText(DOC_PATH);
let fixture;
try {
  fixture = parseJson(FIXTURE_PATH);
  check("fixture parses json", true);
} catch (err) {
  check("fixture parses json", false, String(err));
  process.exit(1);
}

check("execution type recorded", /REVENUE-SAFE PILOT READINESS PACKET ONLY/i.test(doc));
check("baseline from v22.14 mentioned", /Baseline from v22\.14/i.test(doc));
check("readiness packet only stated", /readiness-only/i.test(doc));
check("pilot run not started stated", /pilot run not started/i.test(doc));
check("step 3 remains completed", /Step 3 completed\?: `true`/i.test(doc));
check("step 4 not started", /Step 4: `not_started`/i.test(doc));
check("no production listed", /no production/i.test(doc));
check("no public listed", /no public/i.test(doc));
check("no real lead listed", /no real lead/i.test(doc));
check("no dealer-facing send listed", /no dealer-facing send/i.test(doc));
check("thai owner checklist exists", /Owner-friendly Thai readiness checklist/i.test(doc));
check("expected recommendation present", doc.includes(EXPECTED_RECOMMENDATION));

for (const item of REQUIRED_CHECKS) {
  check(`readiness check documented: ${item}`, doc.includes(item));
}

check("fixture version v22.15", fixture.version === "v22.15");
check("fixture readiness only", fixture.readiness_packet_only === true);
check("fixture pilot not started", fixture.pilot_run_started === false);
check("fixture step 3 completed", fixture.step_3_completed === true);
check("fixture step 4 not started", fixture.step_4_status === "not_started");
check("fixture no production", fixture.production_deploy_included === false);
check("fixture no public", fixture.public_enable_included === false);
check("fixture no real lead", fixture.real_lead_creation_included === false);
check("fixture no dealer-facing send", fixture.dealer_facing_send_included === false);
check(
  "fixture verification focus count",
  Array.isArray(fixture.verification_focus) && fixture.verification_focus.length === 7
);
check(
  "fixture recommendation matches",
  fixture.final_recommendation === EXPECTED_RECOMMENDATION
);

if (failures > 0) {
  console.log(`\nFAIL v22.15 validator (${failures} checks)`);
  process.exit(1);
}

console.log("\nPASS test:v22.15");
