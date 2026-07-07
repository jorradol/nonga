import { existsSync, readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v22.12-existing-inventory-web-intake-flow-confirmation-thor-auto.md";
const FIXTURE_PATH =
  "docs/examples/v22.12-existing-inventory-web-intake-flow-confirmation-thor-auto.example.json";

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
  "=== v22.12 existing inventory web intake flow confirmation validator ===\n"
);

check("doc exists", existsSync(DOC_PATH));
check("fixture exists", existsSync(FIXTURE_PATH));

const doc = readText(DOC_PATH);
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

check(
  "v22.11 baseline and blocker confirmed",
  /baseline confirmation from v22\.11/i.test(doc) &&
    /NEED OWNER DATA/i.test(doc)
);
check(
  "owner clarification existing flow expected",
  /Owner clarification acknowledged/i.test(doc) &&
    /already exists or is expected to exist/i.test(doc)
);
check(
  "not duplicate import creation confirmed",
  /not rebuilding a duplicate import system/i.test(doc)
);
check(
  "owner-browser login session intended path",
  /owner-browser login\/session/i.test(doc)
);
check("staging market only", /staging market only/i.test(doc));
check("no public", /- no public/i.test(doc));
check("no production", /- no production/i.test(doc));
check("no real lead customer data", /no real lead\/customer data/i.test(doc));
check("no dealer-facing send", /no dealer-facing send/i.test(doc));
check(
  "no pii phone plate vin private data",
  /no PII\/phone\/full plate\/VIN\/private data/i.test(doc)
);
check("no Step 4 movement", /no Step 4 movement/i.test(doc));

check("Step 1 completed", /Step 1: `completed`/i.test(doc));
check("Step 2 completed", /Step 2: `completed`/i.test(doc));
check(
  "Step 3 existing_inventory_web_intake_flow_confirmation",
  /Step 3: `existing_inventory_web_intake_flow_confirmation`/i.test(doc)
);
check("Step 3 execution started false", /Step 3 execution started\?: `false`/i.test(doc));
check("Step 3 completed false", /Step 3 completed\?: `false`/i.test(doc));
check("Step 4 not_started", /Step 4: `not_started`/i.test(doc));
check("Step 5 not_started", /Step 5: `not_started`/i.test(doc));

check(
  "existing flow discovery checklist exists",
  /Existing flow discovery checklist/i.test(doc)
);
check(
  "role permission checklist exists",
  /Role\/permission checklist status/i.test(doc)
);
check(
  "staging market target checklist exists",
  /Staging market target checklist status/i.test(doc)
);
check(
  "forbidden fields guard checklist exists",
  /Forbidden fields guard checklist status/i.test(doc)
);
check(
  "owner-friendly future instructions draft exists",
  /Owner-friendly future web intake instructions draft/i.test(doc)
);
check(
  "PASS NEED IMPLEMENTATION NEED REVIEW HOLD criteria exists",
  /PASS \/ NEED IMPLEMENTATION \/ NEED REVIEW \/ HOLD criteria/i.test(doc)
);
check(
  "future v22.13 phrase documented only",
  doc.includes(REQUIRED_V2213_APPROVAL_PHRASE) &&
    /v22\.12 this phrase is documented only/i.test(doc)
);
check(
  "no approval to import real cars yet",
  /no approval to import real cars yet/i.test(doc)
);
check(
  "no approval to publish public preview",
  /no approval to publish public preview/i.test(doc)
);
check("no approval to contact dealer", /no approval to contact dealer/i.test(doc));
check(
  "no approval to create send real lead",
  /no approval to create\/send real lead/i.test(doc)
);

check("fixture version v22.12", fixture.version === "v22.12");
check(
  "fixture baseline v22.11 confirmed true",
  fixture.baseline_v2211_confirmed === true
);
check(
  "fixture baseline blocker NEED OWNER DATA",
  fixture.baseline_v2211_blocker === "NEED OWNER DATA"
);
check(
  "fixture owner clarification true",
  fixture.owner_clarification_existing_import_flow_expected === true
);
check(
  "fixture not duplicate system creation true",
  fixture.not_duplicate_import_system_creation === true
);
check(
  "fixture confirmation scope true",
  fixture.confirmation_scope_existing_nonga_inventory_web_intake_flow === true
);
check(
  "fixture owner browser path true",
  fixture.owner_browser_login_session_intended_path === true
);
check(
  "fixture no token header cookie secret env sharing true",
  fixture.no_owner_token_header_cookie_secret_env_sharing === true
);
check("fixture staging market only true", fixture.staging_market_only === true);
check("fixture no public true", fixture.no_public === true);
check("fixture no production true", fixture.no_production === true);
check("fixture no real lead true", fixture.no_real_lead === true);
check("fixture no real customer data true", fixture.no_real_customer_data === true);
check("fixture no dealer facing send true", fixture.no_dealer_facing_send === true);
check(
  "fixture no pii phone plate vin private data true",
  fixture.no_pii_phone_plate_vin_private_data === true
);
check("fixture no step4 movement true", fixture.no_step4_movement === true);

check("fixture existing flow found true", fixture.existing_flow_found === true);
check(
  "fixture discovery route paths array",
  Array.isArray(fixture.existing_flow_discovery?.route_or_page_paths) &&
    fixture.existing_flow_discovery.route_or_page_paths.length > 0
);
check(
  "fixture discovery components array",
  Array.isArray(fixture.existing_flow_discovery?.components_or_files) &&
    fixture.existing_flow_discovery.components_or_files.length > 0
);
check(
  "fixture discovery api paths array",
  Array.isArray(fixture.existing_flow_discovery?.api_or_backend_paths) &&
    fixture.existing_flow_discovery.api_or_backend_paths.length > 0
);
check(
  "fixture discovery auth role gates array",
  Array.isArray(fixture.existing_flow_discovery?.auth_role_gates) &&
    fixture.existing_flow_discovery.auth_role_gates.length > 0
);
check(
  "fixture role permission owner browser sufficient",
  fixture.role_permission_status?.owner_browser_login_session_sufficient === true
);
check(
  "fixture duplicate import system created false",
  fixture.duplicate_import_system_created === false
);
check(
  "fixture minimal patch performed boolean",
  typeof fixture.minimal_patch_performed === "boolean"
);
check(
  "fixture step 1 completed",
  fixture.step_1_status === "completed"
);
check(
  "fixture step 2 completed",
  fixture.step_2_status === "completed"
);
check(
  "fixture step 3 status existing confirmation",
  fixture.step_3_status === "existing_inventory_web_intake_flow_confirmation"
);
check(
  "fixture step 3 execution started false",
  fixture.step_3_execution_started === false
);
check(
  "fixture step 3 completed false",
  fixture.step_3_completed === false
);
check("fixture step 4 not_started", fixture.step_4_status === "not_started");
check("fixture step 5 not_started", fixture.step_5_status === "not_started");
check(
  "fixture future v22.13 phrase documented only true",
  fixture.future_v2213_approval_phrase_documented_only === true
);
check(
  "fixture future v22.13 phrase exact",
  fixture.future_v2213_approval_phrase === REQUIRED_V2213_APPROVAL_PHRASE
);
check(
  "fixture recommendation allowed set",
  ["PASS", "NEED IMPLEMENTATION", "NEED REVIEW", "HOLD"].includes(
    String(fixture.final_recommendation ?? "")
  )
);

console.log(`\nDone - ${failures} failure(s).\n`);
if (failures > 0) {
  process.exitCode = 1;
  process.exit(process.exitCode);
}
