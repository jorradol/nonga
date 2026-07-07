import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v22.13-controlled-thor-auto-existing-web-intake-owner-run.md";
const FIXTURE_PATH =
  "docs/examples/v22.13-controlled-thor-auto-existing-web-intake-owner-run.example.json";
const PATCH_PATH = "src/server/inventoryImportCommit.ts";

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

console.log(
  "=== v22.13 controlled thor auto existing web intake owner run validator ===\n"
);

check("doc exists", existsSync(DOC_PATH));
check("fixture exists", existsSync(FIXTURE_PATH));
check("patch file exists", existsSync(PATCH_PATH));

const doc = readText(DOC_PATH);
const patchCode = readText(PATCH_PATH);
let fixture;
try {
  fixture = parseJson(FIXTURE_PATH);
  check("fixture parses json", true);
} catch (err) {
  check("fixture parses json", false, String(err));
}

if (!fixture || typeof fixture !== "object") {
  process.exitCode = 1;
  process.exit(process.exitCode);
}

check("v22.12A baseline PASS confirmed", /PASS - v22\.12A/i.test(doc));
check("existing flow reused mentioned", /Existing flow reused/i.test(doc));
check("no duplicate import system mentioned", /no duplicate import system/i.test(doc));
check("owner-browser login session only mentioned", /owner-browser login\/session only/i.test(doc));
check("staging-only pre-run checklist section exists", /Staging-only target pre-run confirmation/i.test(doc));
check("staging market only listed", /staging market only/i.test(doc));
check("no public listed", /no public/i.test(doc));
check("no production listed", /no production/i.test(doc));
check("no real lead listed", /no real lead/i.test(doc));
check("no dealer-facing send listed", /no dealer-facing send/i.test(doc));
check("thai owner instructions section exists", /Owner-friendly Thai instructions/i.test(doc));
check("owner instructions limit 1-3 cars", /1-3 คัน/i.test(doc));
check("safe evidence checklist section exists", /Safe evidence checklist after owner action/i.test(doc));
check(
  "criteria includes PASS NEED OWNER RUN NEED IMPLEMENTATION NEED REVIEW HOLD",
  /PASS \/ NEED OWNER RUN \/ NEED IMPLEMENTATION \/ NEED REVIEW \/ HOLD criteria/i.test(doc)
);
check("Step 1 completed", /Step 1: `completed`/i.test(doc));
check("Step 2 completed", /Step 2: `completed`/i.test(doc));
check(
  "Step 3 active_owner_browser_staging_import_run",
  /Step 3: `active_owner_browser_staging_import_run`/i.test(doc)
);
check("Step 3 completed false", /Step 3 completed\?: `false`/i.test(doc));
check("Step 4 not_started", /Step 4: `not_started`/i.test(doc));
check("Step 5 not_started", /Step 5: `not_started`/i.test(doc));
check("explicit non-approval Step 4 movement", /no Step 4 movement/i.test(doc));
check("explicit non-approval public production", /no public\/production approval/i.test(doc));
check("explicit non-approval real lead", /no real lead creation\/send approval/i.test(doc));
check("explicit non-approval dealer-facing send", /no dealer-facing send approval/i.test(doc));

check("fixture version v22.13", fixture.version === "v22.13");
check("fixture baseline v22.12A true", fixture.baseline_v2212a_pass_confirmed === true);
check("fixture existing flow reused true", fixture.existing_flow_reused === true);
check("fixture no duplicate import false", fixture.duplicate_import_system_created === false);
check("fixture owner browser only true", fixture.owner_browser_login_session_only === true);
check(
  "fixture owner token header cookie secret env requested false",
  fixture.owner_token_header_cookie_secret_env_requested === false
);
check(
  "fixture public-sale-safe rule documented true",
  fixture.public_sale_safe_real_thor_auto_data_only_rule_documented === true
);
check(
  "fixture thai instructions prepared true",
  fixture.owner_friendly_thai_run_instructions_prepared === true
);
check(
  "fixture controlled owner run performed boolean",
  typeof fixture.controlled_owner_browser_run_performed === "boolean"
);
check("fixture imported count number", typeof fixture.imported_car_count === "number");
check("fixture no public production action", fixture.public_or_production_action_performed === false);
check(
  "fixture no real lead customer data action",
  fixture.real_lead_or_customer_data_action_performed === false
);
check("fixture no dealer facing send", fixture.dealer_facing_send_performed === false);
check("fixture safe evidence path only true", fixture.safe_evidence_after_owner_action?.safe_route_page_path_evidence_only === true);
check("fixture no pii in evidence true", fixture.safe_evidence_after_owner_action?.contains_pii_or_sensitive_fields === false);
check("fixture step 1 completed", fixture.step_1_status === "completed");
check("fixture step 2 completed", fixture.step_2_status === "completed");
check(
  "fixture step 3 active owner browser staging run",
  fixture.step_3_status === "active_owner_browser_staging_import_run"
);
check("fixture step 3 completed false", fixture.step_3_completed === false);
check("fixture step 4 not started", fixture.step_4_status === "not_started");
check("fixture step 5 not started", fixture.step_5_status === "not_started");
check("fixture step4 movement false", fixture.step4_movement_included === false);
check(
  "fixture final recommendation allowed set",
  ["PASS", "NEED OWNER RUN", "NEED IMPLEMENTATION", "NEED REVIEW", "HOLD"].includes(
    String(fixture.final_recommendation ?? "")
  )
);

if (fixture.controlled_owner_browser_run_performed === false) {
  check(
    "fixture recommendation NEED OWNER RUN when run not performed",
    fixture.final_recommendation === "NEED OWNER RUN"
  );
  check("fixture imported count zero when run not performed", fixture.imported_car_count === 0);
}

check(
  "patch still has thor production block guard",
  /Thor Auto controlled import is restricted to staging only; production import is blocked/.test(
    patchCode
  )
);
check(
  "patch still forces hidden listing for thor path",
  /listingStatus: policy\.forceNoPublicListingActivation \? "hidden" : "published"/.test(
    patchCode
  )
);
check(
  "patch still strips forbidden raw keys",
  /strippedRawKeys\.push\(k\)/.test(patchCode)
);

console.log(`\nDone - ${failures} failure(s).\n`);
if (failures > 0) {
  process.exitCode = 1;
  process.exit(process.exitCode);
}
