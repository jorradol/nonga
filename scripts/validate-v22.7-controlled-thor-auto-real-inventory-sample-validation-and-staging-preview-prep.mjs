import { existsSync, readFileSync } from "node:fs";

const DOC_PATH =
  "docs/v22.7-controlled-thor-auto-real-inventory-sample-validation-and-staging-preview-prep.md";
const FIXTURE_PATH = "docs/examples/v22.7-thor-auto-sample-validation-and-staging-preview-prep.example.json";

const REQUIRED_V227_APPROVAL_PHRASE =
  "FINAL AUTHORIZE v22.7 CONTROLLED THOR AUTO REAL-INVENTORY SAMPLE VALIDATION AND STAGING PREVIEW PREP / OWNER-SUPPLIED PUBLIC-SALE-SAFE CAR DATA ONLY / STAGING ONLY / NO PUBLIC / NO PRODUCTION / NO REAL LEAD / NO REAL CUSTOMER DATA / NO PII PHONE PLATE VIN / NO TOKEN HEADER COOKIE SECRET SHARING / NO DEALER-FACING SEND / NO RETRY / NO SECOND-RUN / DO NOT MOVE TO STEP 4";

const REQUIRED_V228_APPROVAL_PHRASE =
  "FINAL AUTHORIZE v22.8 CONTROLLED THOR AUTO OWNER-ONLY STAGING PREVIEW PACKET / OWNER-SUPPLIED PUBLIC-SALE-SAFE CAR DATA ONLY / OWNER-BROWSER VIEW ONLY / STAGING ONLY / NO PUBLIC / NO PRODUCTION / NO REAL LEAD / NO REAL CUSTOMER DATA / NO PII PHONE PLATE VIN / NO TOKEN HEADER COOKIE SECRET SHARING / NO DEALER-FACING SEND / NO RETRY / NO SECOND-RUN / DO NOT MOVE TO STEP 4";

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

console.log("=== v22.7 controlled thor auto sample validation and staging preview prep validator ===\n");

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

check("v22.6 baseline PASS", /PASS — v22\.6 controlled Thor Auto owner-supplied real-inventory sample intake prepared/i.test(doc));
check("owner-supplied sample intake only confirmed", /owner-supplied sample intake only/i.test(doc));
check("limited public-sale-safe fields only confirmed", /limited public-sale-safe fields only/i.test(doc));
check("forbidden fields found no", /v22\.6 found no forbidden fields/i.test(doc));
check("sample validation only", /sample validation only/i.test(doc));
check("staging preview prep only", /staging preview prep only/i.test(doc));
check("no real market import", /no real market import/i.test(doc));
check("no public preview yet", /no public preview yet/i.test(doc));
check("no real inventory public production mutation", /no real inventory public\/production mutation/i.test(doc));
check("no dealer-facing send", /no dealer-facing send/i.test(doc));
check("no real dealer contact action", /no real dealer contact\/action/i.test(doc));
check("no real lead customer data", /no real lead\/customer data/i.test(doc));
check("no pii phone plate vin full registration", /no PII\/phone\/plate\/VIN\/full registration data/i.test(doc));
check("no token header cookie secret env", /no token\/header\/cookie\/secret\/env/i.test(doc));
check("no deploy public production", /no deploy\/public\/production/i.test(doc));

check("Step 1 completed", /Step 1: `completed`/i.test(doc));
check("Step 2 completed", /Step 2: `completed`/i.test(doc));
check(
  "Step 3 sample_validation_and_staging_preview_prep_only",
  /Step 3: `sample_validation_and_staging_preview_prep_only`/i.test(doc)
);
check("Step 3 execution started false", /Step 3 execution started\?: `false`/i.test(doc));
check("Step 3 completed false", /Step 3 completed\?: `false`/i.test(doc));
check("Step 4 not_started", /Step 4: `not_started`/i.test(doc));
check("Step 5 not_started", /Step 5: `not_started`/i.test(doc));

check("owner-friendly staging preview prep explanation", /Owner-friendly explanation: staging preview prep means what/i.test(doc));
check("validation checklist present", /Validation checklist for ลุงเด่น/i.test(doc));
check("allowed fields section", /Allowed public-sale-safe fields/i.test(doc));
check("forbidden fields section", /Forbidden fields/i.test(doc));
check("staging preview preparation checklist section", /Staging preview preparation checklist/i.test(doc));
check("separation section present", /Clear separation: sample vs staging-preview-prep vs real-market-import/i.test(doc));
check("HOLD rules section", /HOLD rules/i.test(doc));
check("PASS NEED REVIEW HOLD section", /PASS \/ NEED REVIEW \/ HOLD criteria/i.test(doc));
check("future v22.8 phrase exact", doc.includes(REQUIRED_V228_APPROVAL_PHRASE));
check("future v22.8 documented only", /documented only/i.test(doc));
check("no approval import to market", /no approval to import inventory to market/i.test(doc));
check("no approval publish preview", /no approval to publish preview/i.test(doc));
check("no approval contact dealer", /no approval to contact dealer/i.test(doc));
check("no approval create send lead", /no approval to create\/send real lead/i.test(doc));
check("no Step 4 movement", /no Step 4 movement/i.test(doc));
check("exact v22.7 owner phrase present", doc.includes(REQUIRED_V227_APPROVAL_PHRASE));

check("fixture label indicates v22.7 prep only", /v22\.7 sample validation and staging preview prep only/i.test(String(fixture.label)));
check("fixture baseline v22.6 pass true", fixture.baseline_v226_pass === true);
check("fixture owner supplied sample only true", fixture.baseline_v226_owner_supplied_sample_only === true);
check(
  "fixture limited public sale safe fields true",
  fixture.baseline_v226_limited_public_sale_safe_fields_only === true
);
check("fixture forbidden fields found false", fixture.baseline_v226_forbidden_fields_found === false);
check("fixture sample_validation_only true", fixture.sample_validation_only === true);
check("fixture staging_preview_prep_only true", fixture.staging_preview_prep_only === true);
check("fixture no_real_market_import true", fixture.no_real_market_import === true);
check("fixture no_public_preview_yet true", fixture.no_public_preview_yet === true);
check("fixture no_dealer_facing_send true", fixture.no_dealer_facing_send === true);
check("fixture no_real_lead true", fixture.no_real_lead === true);
check("fixture step4_not_started true", fixture.step4_not_started === true);
check("fixture validation checklist array", Array.isArray(fixture.validation_checklist_items) && fixture.validation_checklist_items.length > 0);

const guard = fixture.forbidden_field_guard_results;
check("guard object exists", guard && typeof guard === "object");
if (guard && typeof guard === "object") {
  check("guard phone false", guard.phone_found === false);
  check("guard plate false", guard.plate_found === false);
  check("guard vin false", guard.vin_found === false);
  check("guard registration false", guard.registration_found === false);
  check("guard pii false", guard.pii_found === false);
  check("guard token secret false", guard.token_secret_found === false);
}

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
