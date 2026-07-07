import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v22.9-controlled-thor-auto-owner-only-staging-preview-one-run-prep.md";
const FIXTURE_PATH = "docs/examples/v22.9-controlled-thor-auto-owner-only-staging-preview-one-run-prep.example.json";

const REQUIRED_V229_APPROVAL_PHRASE =
  "FINAL AUTHORIZE v22.9 CONTROLLED THOR AUTO OWNER-ONLY STAGING PREVIEW ONE-RUN PREP / OWNER-BROWSER VIEW ONLY / OWNER-SUPPLIED PUBLIC-SALE-SAFE CAR DATA ONLY / STAGING ONLY / NO PUBLIC / NO PRODUCTION / NO REAL LEAD / NO REAL CUSTOMER DATA / NO PII PHONE PLATE VIN / NO TOKEN HEADER COOKIE SECRET SHARING / NO DEALER-FACING SEND / NO RETRY / NO SECOND-RUN / DO NOT MOVE TO STEP 4";

const REQUIRED_V2210_APPROVAL_PHRASE =
  "FINAL AUTHORIZE v22.10 CONTROLLED THOR AUTO OWNER-ONLY STAGING PREVIEW ONE-RUN / OWNER-BROWSER VIEW ONLY / OWNER-SUPPLIED PUBLIC-SALE-SAFE CAR DATA ONLY / STAGING ONLY / NO PUBLIC / NO PRODUCTION / NO REAL LEAD / NO REAL CUSTOMER DATA / NO PII PHONE PLATE VIN / NO TOKEN HEADER COOKIE SECRET SHARING / NO DEALER-FACING SEND / NO RETRY / NO SECOND-RUN / DO NOT MOVE TO STEP 4";

const ALLOWED_KEYS = new Set([
  "dealer_group_label",
  "car_public_id",
  "brand",
  "model",
  "year",
  "trim",
  "body_type",
  "transmission",
  "fuel_type",
  "mileage_public",
  "price_public",
  "price_range_public",
  "location_zone",
  "public_sale_description",
  "public_features",
  "public_condition_notes",
  "photo_public_allowed",
  "photo_reference_placeholder",
  "sale_status",
  "general_public_notes",
]);

const FORBIDDEN_HINTS = [
  "phone",
  "lead",
  "plate",
  "vin",
  "registration",
  "private",
  "customer_name",
  "cost",
  "margin",
  "bank",
  "transfer",
  "token",
  "header",
  "cookie",
  "secret",
  "env",
  "authorization",
  "credential",
  "pii",
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

console.log("=== v22.9 controlled thor auto owner-only staging preview one-run prep validator ===\n");

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

check("v22.8 baseline PASS", /PASS - v22\.8 controlled Thor Auto owner-only staging preview packet prepared/i.test(doc));
check("v22.8 owner-only staging preview packet only", /v22\.8 was owner-only staging preview packet only/i.test(doc));
check("v22.8 owner-browser-only path documented", /v22\.8 documented owner-browser-only path/i.test(doc));
check("v22.8 no deploy", /v22\.8 did not deploy/i.test(doc));
check("v22.8 no owner preview run", /v22\.8 did not run owner preview/i.test(doc));
check("v22.8 no public preview", /v22\.8 did not publish public preview/i.test(doc));
check("v22.8 no real market import", /v22\.8 did not import real market inventory/i.test(doc));
check("v22.8 no dealer-facing send", /v22\.8 did not perform dealer-facing send/i.test(doc));
check("v22.8 no create send real lead", /v22\.8 did not create\/send real lead/i.test(doc));
check("v22.8 no forbidden fields", /v22\.8 found no forbidden fields/i.test(doc));

check("owner-only staging preview one-run prep only", /owner_only_staging_preview_one_run_prep_only/i.test(doc));
check("owner-browser view only", /owner_browser_view_only/i.test(doc));
check("no owner preview run in v22.9", /no owner preview run in v22\.9/i.test(doc));
check("no deploy", /no deploy/i.test(doc));
check("no real market import", /no real market import/i.test(doc));
check("no public preview", /no public preview/i.test(doc));
check("no public", /- no public/i.test(doc));
check("no production", /- no production/i.test(doc));
check("no real inventory public production mutation", /no real inventory public\/production mutation/i.test(doc));
check("no dealer-facing send", /no dealer-facing send/i.test(doc));
check("no real dealer contact action", /no real dealer contact\/action/i.test(doc));
check("no real lead customer data", /no real lead\/customer data/i.test(doc));
check("no pii phone plate vin full registration data", /no PII\/phone\/plate\/VIN\/full registration data/i.test(doc));
check("no token header cookie secret env", /no token\/header\/cookie\/secret\/env/i.test(doc));

check("Step 1 completed", /Step 1: `completed`/i.test(doc));
check("Step 2 completed", /Step 2: `completed`/i.test(doc));
check(
  "Step 3 owner_only_staging_preview_one_run_prep_only",
  /Step 3: `owner_only_staging_preview_one_run_prep_only`/i.test(doc)
);
check("Step 3 execution started false", /Step 3 execution started\?: `false`/i.test(doc));
check("Step 3 completed false", /Step 3 completed\?: `false`/i.test(doc));
check("Step 4 not_started", /Step 4: `not_started`/i.test(doc));
check("Step 5 not_started", /Step 5: `not_started`/i.test(doc));

check(
  "owner-friendly one-run prep explanation",
  /Owner-friendly explanation: owner-only staging preview one-run prep means what/i.test(doc)
);
check("future one-run readiness checklist", /Future one-run readiness checklist/i.test(doc));
check("owner-browser-only checklist", /Owner-browser-only checklist/i.test(doc));
check("owner visible-results checklist in plain thai", /Owner visible-results checklist in plain Thai/i.test(doc));
check("thai visible line open page", /เปิดหน้าได้ \/ เปิดหน้าไม่ได้/i.test(doc));
check("thai visible line card", /เห็นการ์ดรถ \/ ไม่เห็นการ์ดรถ/i.test(doc));
check("allowed fields section", /Allowed public-sale-safe fields/i.test(doc));
check("forbidden fields section", /Forbidden fields/i.test(doc));
check("separation section present", /Clear separation of phases/i.test(doc));
check("owner no secret paste requirement", /do not ask ลุงเด่น to paste token\/header\/cookie\/secret\/env/i.test(doc));
check("owner-browser login/session main path requirement", /future preview must use owner-browser login\/session as the main path/i.test(doc));
check("HOLD rules section", /HOLD rules/i.test(doc));
check("HOLD owner preview run occurs in v22.9", /owner preview run executed in v22\.9/i.test(doc));
check("PASS NEED REVIEW HOLD section", /PASS \/ NEED REVIEW \/ HOLD criteria/i.test(doc));
check("future v22.10 approval phrase exact", doc.includes(REQUIRED_V2210_APPROVAL_PHRASE));
check("future v22.10 documented only", /v22\.10 phrase is documented only/i.test(doc));

check("no approval to deploy", /no approval to deploy/i.test(doc));
check("no approval to run owner preview in v22.9", /no approval to run owner preview in v22\.9/i.test(doc));
check("no approval to import inventory to market", /no approval to import inventory to market/i.test(doc));
check("no approval to publish public preview", /no approval to publish public preview/i.test(doc));
check("no approval to contact dealer", /no approval to contact dealer/i.test(doc));
check("no approval to create send real lead", /no approval to create\/send real lead/i.test(doc));
check("no Step 4 movement", /no Step 4 movement/i.test(doc));
check("exact v22.9 owner phrase present", doc.includes(REQUIRED_V229_APPROVAL_PHRASE));

check("fixture label indicates v22.9 one-run prep only", /v22\.9 owner-only staging preview one-run prep only/i.test(String(fixture.label)));
check("fixture baseline v22.8 pass true", fixture.baseline_v228_pass === true);
check(
  "fixture baseline owner-only staging preview packet only true",
  fixture.baseline_v228_owner_only_staging_preview_packet_only === true
);
check("fixture baseline owner-browser path documented true", fixture.baseline_v228_owner_browser_path_documented === true);
check("fixture owner_only_staging_preview_one_run_prep_only true", fixture.owner_only_staging_preview_one_run_prep_only === true);
check("fixture owner_browser_view_only true", fixture.owner_browser_view_only === true);
check("fixture no_owner_preview_run_in_v22_9 true", fixture.no_owner_preview_run_in_v22_9 === true);
check("fixture no_deploy true", fixture.no_deploy === true);
check("fixture no_real_market_import true", fixture.no_real_market_import === true);
check("fixture no_public_preview true", fixture.no_public_preview === true);
check("fixture no_public true", fixture.no_public === true);
check("fixture no_production true", fixture.no_production === true);
check(
  "fixture no_real_inventory_public_production_mutation true",
  fixture.no_real_inventory_public_production_mutation === true
);
check("fixture no_dealer_facing_send true", fixture.no_dealer_facing_send === true);
check("fixture no_real_dealer_contact_action true", fixture.no_real_dealer_contact_action === true);
check("fixture no_real_lead true", fixture.no_real_lead === true);
check("fixture no_step4_movement true", fixture.no_step4_movement === true);

check("fixture step_1_status completed", fixture.step_1_status === "completed");
check("fixture step_2_status completed", fixture.step_2_status === "completed");
check(
  "fixture step_3_status owner_only_staging_preview_one_run_prep_only",
  fixture.step_3_status === "owner_only_staging_preview_one_run_prep_only"
);
check("fixture step_3_execution_started false", fixture.step_3_execution_started === false);
check("fixture step_3_completed false", fixture.step_3_completed === false);
check("fixture step_4_status not_started", fixture.step_4_status === "not_started");
check("fixture step_5_status not_started", fixture.step_5_status === "not_started");

check(
  "fixture owner-browser-only future flow array",
  Array.isArray(fixture.owner_browser_only_future_flow) && fixture.owner_browser_only_future_flow.length >= 4
);
check(
  "fixture owner visible-results checklist plain thai array",
  Array.isArray(fixture.owner_visible_results_checklist_plain_thai) &&
    fixture.owner_visible_results_checklist_plain_thai.length >= 5
);
check(
  "fixture owner visible-results thai line open page",
  fixture.owner_visible_results_checklist_plain_thai?.some((line) => String(line).includes("เปิดหน้าได้"))
);

const guard = fixture.forbidden_field_guard_results;
check("guard object exists", guard && typeof guard === "object");
if (guard && typeof guard === "object") {
  check("guard phone false", guard.phone_found === false);
  check("guard plate false", guard.plate_found === false);
  check("guard vin false", guard.vin_found === false);
  check("guard registration false", guard.registration_found === false);
  check("guard pii false", guard.pii_found === false);
  check("guard token false", guard.token_found === false);
  check("guard header false", guard.header_found === false);
  check("guard cookie false", guard.cookie_found === false);
  check("guard secret false", guard.secret_found === false);
  check("guard env false", guard.env_found === false);
  check("guard authorization header false", guard.authorization_header_found === false);
  check("guard credential false", guard.credential_found === false);
  check("guard lead data false", guard.lead_data_found === false);
}

check("owner must not paste secrets true", fixture.owner_must_not_paste_token_header_cookie_secret_env === true);
check("owner browser login/session main path later true", fixture.owner_browser_login_session_main_path_later === true);
check(
  "no token header cookie secret env requirement for owner true",
  fixture.no_token_header_cookie_secret_env_requirement_for_owner === true
);
check("future v22.10 phrase documented only true", fixture.future_v2210_approval_phrase_documented_only === true);

check("fixture records array exists", Array.isArray(fixture.records) && fixture.records.length > 0, String(fixture.records?.length ?? 0));
if (Array.isArray(fixture.records)) {
  fixture.records.forEach((record, idx) => {
    const p = `record[${idx}]`;
    check(`${p} object`, record && typeof record === "object");
    if (!record || typeof record !== "object") return;
    for (const key of Object.keys(record)) {
      check(`${p} key allowlisted ${key}`, ALLOWED_KEYS.has(key));
      const lowerKey = key.toLowerCase();
      check(`${p} key not forbidden-hint ${key}`, !FORBIDDEN_HINTS.some((hint) => lowerKey.includes(hint)));
    }
  });
}

const recordsPayload = JSON.stringify(fixture.records ?? []).toLowerCase();
check("records payload has no real phone number pattern", !/\+?\d{8,}/.test(recordsPayload));
for (const hint of FORBIDDEN_HINTS) {
  check(
    `records payload has no forbidden hint key "${hint}"`,
    !new RegExp(`"${hint}[^"]*"`).test(recordsPayload)
  );
}

console.log(`\nDone - ${failures} failure(s).\n`);
if (failures > 0) {
  process.exitCode = 1;
  process.exit(process.exitCode);
}
