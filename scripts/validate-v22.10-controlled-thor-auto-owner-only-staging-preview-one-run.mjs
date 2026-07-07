import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v22.10-controlled-thor-auto-owner-only-staging-preview-one-run.md";
const FIXTURE_PATH = "docs/examples/v22.10-controlled-thor-auto-owner-only-staging-preview-one-run.example.json";

const REQUIRED_V2210_APPROVAL_PHRASE =
  "FINAL AUTHORIZE v22.10 CONTROLLED THOR AUTO OWNER-ONLY STAGING PREVIEW ONE-RUN / OWNER-BROWSER VIEW ONLY / OWNER-SUPPLIED PUBLIC-SALE-SAFE CAR DATA ONLY / STAGING ONLY / NO PUBLIC / NO PRODUCTION / NO REAL LEAD / NO REAL CUSTOMER DATA / NO PII PHONE PLATE VIN / NO TOKEN HEADER COOKIE SECRET SHARING / NO DEALER-FACING SEND / NO RETRY / NO SECOND-RUN / DO NOT MOVE TO STEP 4";

const REQUIRED_V2211_APPROVAL_PHRASE =
  "FINAL AUTHORIZE v22.11 CONTROLLED THOR AUTO OWNER-ONLY STAGING PREVIEW REVIEW AND STEP3 COMPLETION DECISION PACKET / OWNER-BROWSER EVIDENCE REVIEW ONLY / STAGING ONLY / NO PUBLIC / NO PRODUCTION / NO REAL LEAD / NO REAL CUSTOMER DATA / NO PII PHONE PLATE VIN / NO TOKEN HEADER COOKIE SECRET SHARING / NO DEALER-FACING SEND / NO RETRY / NO SECOND-RUN / DO NOT MOVE TO STEP 4";

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

console.log("=== v22.10 controlled thor auto owner-only staging preview one-run validator ===\n");

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

check("v22.9 baseline PASS", /PASS - v22\.9 controlled Thor Auto owner-only staging preview one-run prep prepared/i.test(doc));
check("v22.9 owner-only one-run prep only", /v22\.9 was owner-only staging preview one-run prep only/i.test(doc));
check("v22.9 owner-browser-only path documented", /v22\.9 documented owner-browser-only path/i.test(doc));
check("v22.9 no deploy", /v22\.9 did not deploy/i.test(doc));
check("v22.9 no owner preview run", /v22\.9 did not run owner preview/i.test(doc));
check("v22.9 no public preview", /v22\.9 did not publish public preview/i.test(doc));
check("v22.9 no real market import", /v22\.9 did not import real market inventory/i.test(doc));
check("v22.9 no dealer-facing send", /v22\.9 did not perform dealer-facing send/i.test(doc));
check("v22.9 no create send real lead", /v22\.9 did not create\/send real lead/i.test(doc));
check("v22.9 no forbidden fields", /v22\.9 found no forbidden fields/i.test(doc));

check("controlled owner-only staging preview one-run", /owner_only_staging_preview_one_run/i.test(doc));
check("owner-browser view only", /owner_browser_view_only/i.test(doc));
check("exactly one run only", /exactly_one_run_only/i.test(doc));
check("no retry", /no_retry/i.test(doc));
check("no second-run", /no_second_run/i.test(doc));
check("no re-arm", /no_rearm/i.test(doc));
check("staging only", /staging_only/i.test(doc));
check("no public", /- no_public| - no public/i.test(doc));
check("no production", /- no_production| - no production/i.test(doc));
check("no real market import", /no real market import/i.test(doc));
check("no public preview", /no public preview/i.test(doc));
check("no real inventory public production mutation", /no real inventory public\/production mutation/i.test(doc));
check("no dealer-facing send", /no dealer-facing send/i.test(doc));
check("no real dealer contact action", /no real dealer contact\/action/i.test(doc));
check("no real lead customer data", /no real lead\/customer data/i.test(doc));
check("no pii phone plate vin full registration data", /no PII\/phone\/plate\/VIN\/full registration data/i.test(doc));
check("no token header cookie secret env", /no token\/header\/cookie\/secret\/env/i.test(doc));

check("Step 1 completed", /Step 1: `completed`/i.test(doc));
check("Step 2 completed", /Step 2: `completed`/i.test(doc));
check("Step 3 owner_only_staging_preview_one_run", /Step 3: `owner_only_staging_preview_one_run`/i.test(doc));
check("Step 3 completed false", /Step 3 completed\?: `false`/i.test(doc));
check("Step 4 not_started", /Step 4: `not_started`/i.test(doc));
check("Step 5 not_started", /Step 5: `not_started`/i.test(doc));

check("owner-friendly one-run explanation", /Owner-friendly explanation: owner-only staging preview one-run means what/i.test(doc));
check("readiness checklist", /Readiness checklist before run/i.test(doc));
check("owner-browser-only run checklist", /Owner-browser-only run checklist/i.test(doc));
check("owner visible-results checklist in plain Thai", /Owner visible-results checklist in plain Thai/i.test(doc));
check("allowed fields section", /Allowed public-sale-safe fields/i.test(doc));
check("forbidden fields section", /Forbidden fields/i.test(doc));
check("separation section", /Clear separation of phases/i.test(doc));
check("owner no secret paste requirement", /do not ask ลุงเด่น to paste token\/header\/cookie\/secret\/env/i.test(doc));
check("owner-browser login/session requirement", /preview must use owner-browser login\/session as the main path/i.test(doc));
check("evidence checklist after run", /Evidence checklist after run/i.test(doc));
check("HOLD rules section", /HOLD rules/i.test(doc));
check("HOLD more than one run attempted", /more than one run is attempted/i.test(doc));
check("PASS NEED REVIEW HOLD section", /PASS \/ NEED REVIEW \/ HOLD criteria/i.test(doc));
check("future v22.11 approval phrase exact", doc.includes(REQUIRED_V2211_APPROVAL_PHRASE));
check("future v22.11 documented only", /v22\.11 phrase is documented only/i.test(doc));

check("no approval import to market", /no approval to import inventory to market/i.test(doc));
check("no approval publish public preview", /no approval to publish public preview/i.test(doc));
check("no approval contact dealer", /no approval to contact dealer/i.test(doc));
check("no approval create send real lead", /no approval to create\/send real lead/i.test(doc));
check("no Step 4 movement", /no Step 4 movement/i.test(doc));
check("exact v22.10 owner phrase present", doc.includes(REQUIRED_V2210_APPROVAL_PHRASE));

check("fixture label indicates v22.10 one-run", /v22\.10 owner-only staging preview one-run/i.test(String(fixture.label)));
check("fixture baseline v22.9 pass true", fixture.baseline_v229_pass === true);
check(
  "fixture baseline owner-only one-run prep only true",
  fixture.baseline_v229_owner_only_staging_preview_one_run_prep_only === true
);
check("fixture baseline owner-browser path documented true", fixture.baseline_v229_owner_browser_path_documented === true);

check("fixture owner_only_staging_preview_one_run true", fixture.owner_only_staging_preview_one_run === true);
check("fixture owner_browser_view_only true", fixture.owner_browser_view_only === true);
check("fixture exactly_one_run_only true", fixture.exactly_one_run_only === true);
check("fixture no_retry true", fixture.no_retry === true);
check("fixture no_second_run true", fixture.no_second_run === true);
check("fixture no_rearm true", fixture.no_rearm === true);
check("fixture staging_only true", fixture.staging_only === true);
check("fixture no_public true", fixture.no_public === true);
check("fixture no_production true", fixture.no_production === true);
check("fixture no_real_market_import true", fixture.no_real_market_import === true);
check("fixture no_public_preview true", fixture.no_public_preview === true);
check(
  "fixture no_real_inventory_public_production_mutation true",
  fixture.no_real_inventory_public_production_mutation === true
);
check("fixture no_dealer_facing_send true", fixture.no_dealer_facing_send === true);
check("fixture no_real_dealer_contact_action true", fixture.no_real_dealer_contact_action === true);
check("fixture no_real_lead true", fixture.no_real_lead === true);
check("fixture no_step4_movement true", fixture.no_step4_movement === true);

check("fixture readiness_checks_passed true", fixture.readiness_checks_passed === true);
check("fixture owner run performed flag boolean", typeof fixture.owner_preview_one_run_performed_in_v22_10 === "boolean");
check("fixture retry_attempted false", fixture.retry_attempted === false);
check("fixture second_run_attempted false", fixture.second_run_attempted === false);
check("fixture rearm_attempted false", fixture.rearm_attempted === false);

check("fixture step_1_status completed", fixture.step_1_status === "completed");
check("fixture step_2_status completed", fixture.step_2_status === "completed");
check("fixture step_3_status owner_only_staging_preview_one_run", fixture.step_3_status === "owner_only_staging_preview_one_run");
check("fixture step_3_completed false", fixture.step_3_completed === false);
check("fixture step_4_status not_started", fixture.step_4_status === "not_started");
check("fixture step_5_status not_started", fixture.step_5_status === "not_started");

if (fixture.owner_preview_one_run_performed_in_v22_10 === true) {
  check("fixture step_3_execution_started true when run performed", fixture.step_3_execution_started === true);
} else {
  check("fixture step_3_execution_started false when run not performed", fixture.step_3_execution_started === false);
  check(
    "fixture blocker present when run not performed",
    typeof fixture.owner_preview_one_run_blocker_if_not_run === "string" &&
      fixture.owner_preview_one_run_blocker_if_not_run.length > 0
  );
}

check(
  "fixture readiness checklist array",
  Array.isArray(fixture.readiness_checklist) && fixture.readiness_checklist.length >= 8
);
check(
  "fixture owner-browser-only future flow array",
  Array.isArray(fixture.owner_browser_only_future_flow) && fixture.owner_browser_only_future_flow.length >= 4
);
check(
  "fixture owner visible-results checklist plain thai array",
  Array.isArray(fixture.owner_visible_results_checklist_plain_thai) &&
    fixture.owner_visible_results_checklist_plain_thai.length >= 8
);
check(
  "fixture evidence checklist after run array",
  Array.isArray(fixture.evidence_checklist_after_run) && fixture.evidence_checklist_after_run.length >= 5
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
check("future v22.11 phrase documented only true", fixture.future_v2211_approval_phrase_documented_only === true);

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
