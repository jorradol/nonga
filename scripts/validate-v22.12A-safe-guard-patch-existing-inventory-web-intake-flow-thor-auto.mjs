import { existsSync, readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v22.12A-safe-guard-patch-existing-inventory-web-intake-flow-thor-auto.md";
const FIXTURE_PATH =
  "docs/examples/v22.12A-safe-guard-patch-existing-inventory-web-intake-flow-thor-auto.example.json";
const PATCH_PATH = "src/server/inventoryImportCommit.ts";

const REQUIRED_V2213_APPROVAL_PHRASE =
  "FINAL AUTHORIZE v22.13 CONTROLLED THOR AUTO EXISTING WEB INTAKE OWNER RUN / OWNER-BROWSER LOGIN ONLY / PUBLIC-SALE-SAFE REAL CAR DATA ONLY / STAGING MARKET ONLY / NO PUBLIC / NO PRODUCTION / NO REAL LEAD / NO REAL CUSTOMER DATA / NO PII PHONE PLATE VIN / NO TOKEN HEADER COOKIE SECRET SHARING / NO DEALER-FACING SEND / NO RETRY / NO SECOND-RUN / DO NOT MOVE TO STEP 4";

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
  "=== v22.12A safe guard patch existing intake flow validator ===\n"
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

check("v22.12 baseline confirmed", /Baseline confirmation from v22\.12/i.test(doc));
check("v22.12 NEED IMPLEMENTATION confirmed", /NEED IMPLEMENTATION/i.test(doc));
check("existing flow reused confirmed", /Existing flow reused/i.test(doc));
check("no duplicate import system confirmed", /no duplicate import system/i.test(doc));
check("minimal patch summary section exists", /Minimal guard patch summary/i.test(doc));
check("staging-only guard section exists", /Thor Auto staging-only guard/i.test(doc));
check(
  "forbidden-field section exists",
  /Forbidden-field stripping\/blocking/i.test(doc)
);
check("role permission section exists", /Role\/permission guard status/i.test(doc));
check("owner browser path section exists", /owner-browser login\/session/i.test(doc));
check("no owner run confirmed", /no owner run/i.test(doc));
check("no real inventory import confirmed", /no real inventory import/i.test(doc));
check("no public no production confirmed", /no public \/ no production/i.test(doc));
check("no real lead no dealer-facing send confirmed", /no real lead\/customer data action/i.test(doc));
check("Step 1 completed", /Step 1: `completed`/i.test(doc));
check("Step 2 completed", /Step 2: `completed`/i.test(doc));
check("Step 3 active guard patch completed", /Step 3: `active_guard_patch_completed`/i.test(doc));
check("Step 3 completed false", /Step 3 completed\?: `false`/i.test(doc));
check("Step 4 not_started", /Step 4: `not_started`/i.test(doc));
check("Step 5 not_started", /Step 5: `not_started`/i.test(doc));
check(
  "PASS NEED IMPLEMENTATION NEED REVIEW HOLD criteria exists",
  /PASS \/ NEED IMPLEMENTATION \/ NEED REVIEW \/ HOLD criteria/i.test(doc)
);
check("future v22.13 phrase exact", doc.includes(REQUIRED_V2213_APPROVAL_PHRASE));
check("future v22.13 documented only", /documented only/i.test(doc));

check("fixture version v22.12A", fixture.version === "v22.12A");
check("fixture baseline v22.12 confirmed", fixture.baseline_v2212_confirmed === true);
check(
  "fixture baseline recommendation NEED IMPLEMENTATION",
  fixture.baseline_v2212_recommendation === "NEED IMPLEMENTATION"
);
check("fixture existing flow reused true", fixture.existing_flow_reused === true);
check(
  "fixture duplicate import system false",
  fixture.duplicate_import_system_created === false
);
check("fixture minimal patch performed true", fixture.minimal_patch_performed === true);
check("fixture staging guard enabled", fixture.thor_auto_staging_only_guard?.enabled === true);
check(
  "fixture staging guard blocks in production",
  fixture.thor_auto_staging_only_guard?.blocks_in_production === true
);
check(
  "fixture forbidden vin guard true",
  fixture.forbidden_field_guard_after_patch?.vin_persist_disabled_for_thor === true
);
check(
  "fixture forbidden plate guard true",
  fixture.forbidden_field_guard_after_patch?.license_plate_persist_disabled_for_thor === true
);
check(
  "fixture private contact guard true",
  fixture.forbidden_field_guard_after_patch?.private_contact_persist_disabled_for_thor === true
);
check(
  "fixture no public activation true",
  fixture.forbidden_field_guard_after_patch?.listing_public_activation_forced_off_for_thor === true
);
check(
  "fixture owner token paste required false",
  fixture.role_permission_guard_status_after_patch?.owner_token_header_cookie_secret_env_paste_required === false
);
check("fixture no owner run true", fixture.no_owner_run_performed === true);
check(
  "fixture no real inventory import true",
  fixture.no_real_inventory_import_performed === true
);
check("fixture no public production action true", fixture.no_public_or_production_action === true);
check(
  "fixture no lead customer action true",
  fixture.no_real_lead_or_customer_data_action === true
);
check("fixture no dealer facing send true", fixture.no_dealer_facing_send === true);
check(
  "fixture no owner secret sharing requested true",
  fixture.no_owner_secret_sharing_requested === true
);
check("fixture step 1 completed", fixture.step_1_status === "completed");
check("fixture step 2 completed", fixture.step_2_status === "completed");
check(
  "fixture step 3 active guard patch completed",
  fixture.step_3_status === "active_guard_patch_completed"
);
check("fixture step 3 completed false", fixture.step_3_completed === false);
check("fixture step 4 not_started", fixture.step_4_status === "not_started");
check("fixture step 5 not_started", fixture.step_5_status === "not_started");
check(
  "fixture future v22.13 documented only",
  fixture.future_v2213_approval_phrase_documented_only === true
);
check(
  "fixture future v22.13 phrase exact",
  fixture.future_v2213_approval_phrase === REQUIRED_V2213_APPROVAL_PHRASE
);
check("fixture step4 movement false", fixture.step4_movement_included === false);
check(
  "fixture recommendation allowed set",
  ["PASS", "NEED IMPLEMENTATION", "NEED REVIEW", "HOLD"].includes(
    String(fixture.final_recommendation ?? "")
  )
);

check(
  "patch imports THOR_AUTO_DEALER_ID",
  patchCode.includes('import { THOR_AUTO_DEALER_ID } from "../utils/dealerIdentity";')
);
check("patch has resolveImportPolicy", /function resolveImportPolicy\(/.test(patchCode));
check("patch has sanitizeRowForPolicy", /function sanitizeRowForPolicy\(/.test(patchCode));
check(
  "patch blocks production for thor path",
  /Thor Auto controlled import is restricted to staging only; production import is blocked/.test(
    patchCode
  )
);
check(
  "patch disables vin when policy denies",
  /policy\.allowSensitiveVehicleFields[\s\S]*vin/.test(patchCode)
);
check(
  "patch disables license plate when policy denies",
  /policy\.allowSensitiveVehicleFields[\s\S]*licensePlate/.test(patchCode)
);
check(
  "patch disables private contact when policy denies",
  /policy\.allowPrivateContactFields[\s\S]*ownerPhone/.test(patchCode)
);
check(
  "patch forces hidden listing for thor path",
  /listingStatus: policy\.forceNoPublicListingActivation \? "hidden" : "published"/.test(
    patchCode
  )
);
check(
  "patch strips forbidden raw keys",
  /strippedRawKeys\.push\(k\)/.test(patchCode)
);

console.log(`\nDone - ${failures} failure(s).\n`);
if (failures > 0) {
  process.exitCode = 1;
  process.exit(process.exitCode);
}
