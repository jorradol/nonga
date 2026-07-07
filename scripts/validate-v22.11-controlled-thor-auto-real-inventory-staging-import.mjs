import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v22.11-controlled-thor-auto-real-inventory-staging-import.md";
const FIXTURE_PATH = "docs/examples/v22.11-thor-auto-real-inventory-staging-import.example.json";

const REQUIRED_V2211_APPROVAL_PHRASE =
  "FINAL AUTHORIZE v22.11 CONTROLLED THOR AUTO REAL-INVENTORY STAGING IMPORT / OWNER-SUPPLIED PUBLIC-SALE-SAFE REAL CAR DATA ONLY / STAGING MARKET ONLY / NO PUBLIC / NO PRODUCTION / NO REAL LEAD / NO REAL CUSTOMER DATA / NO PII PHONE PLATE VIN / NO TOKEN HEADER COOKIE SECRET SHARING / NO DEALER-FACING SEND / NO RETRY / NO SECOND-RUN / DO NOT MOVE TO STEP 4";

const REQUIRED_V2212_APPROVAL_PHRASE =
  "FINAL AUTHORIZE v22.12 CONTROLLED THOR AUTO REAL-INVENTORY STAGING IMPORT REVIEW / OWNER-BROWSER STAGING MARKET REVIEW ONLY / STAGING ONLY / NO PUBLIC / NO PRODUCTION / NO REAL LEAD / NO REAL CUSTOMER DATA / NO PII PHONE PLATE VIN / NO TOKEN HEADER COOKIE SECRET SHARING / NO DEALER-FACING SEND / NO RETRY / NO SECOND-RUN / DO NOT MOVE TO STEP 4";

const ALLOWED_RECORD_KEYS = new Set([
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

const FORBIDDEN_KEY_HINTS = [
  "phone",
  "tel",
  "mobile",
  "line_id",
  "customer_name",
  "plate",
  "license_plate",
  "registration_full",
  "vin",
  "token",
  "secret",
  "cookie",
  "authorization",
  "bearer",
  "api_key",
  "env",
  "bank",
  "account_number",
  "internal_cost",
  "cost",
  "margin",
  "private_note",
  "dealer_private_note",
  "lead",
  "customer",
  "buyer",
];

const FORBIDDEN_TEXT_PATTERNS = [
  /\bphone\b/i,
  /\btel\b/i,
  /\bmobile\b/i,
  /\bline[\s_-]*id\b/i,
  /\bcustomer_name\b/i,
  /\bplate\b/i,
  /\blicense_plate\b/i,
  /\bregistration_full\b/i,
  /\bvin\b/i,
  /\btoken\b/i,
  /\bsecret\b/i,
  /\bcookie\b/i,
  /\bauthorization\b/i,
  /\bbearer\b/i,
  /\bapi[_-]?key\b/i,
  /\benv\b/i,
  /\bbank\b/i,
  /\baccount_number\b/i,
  /\binternal_cost\b/i,
  /\bcost\b/i,
  /\bmargin\b/i,
  /\bprivate_note\b/i,
  /\bdealer_private_note\b/i,
  /\blead\b/i,
  /\bcustomer\b/i,
  /\bbuyer\b/i,
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

console.log(
  "=== v22.11 controlled thor auto real-inventory staging import validator ===\n"
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
  "v22.10 baseline confirmed",
  /PASS - v22\.10 controlled Thor Auto owner-only staging preview one-run prepared/i.test(
    doc
  )
);
check("v22.10 blocker acknowledged", /v22\.10 blocker carried into v22\.11/i.test(doc));
check("fresh v22.11 owner approval phrase exact", doc.includes(REQUIRED_V2211_APPROVAL_PHRASE));
check(
  "controlled real-inventory staging import scope",
  /controlled_real_inventory_staging_import/i.test(doc)
);
check(
  "owner-supplied public-sale-safe real car data only scope",
  /owner-supplied public-sale-safe real car data only/i.test(doc)
);
check("staging market only", /staging market only/i.test(doc));
check("no public", /- no public/i.test(doc));
check("no production", /- no production/i.test(doc));
check("no real lead customer data", /no real lead\/customer data/i.test(doc));
check("no dealer-facing send", /no dealer-facing send/i.test(doc));
check(
  "no pii phone plate vin full registration data",
  /no PII\/phone\/plate\/VIN\/full registration data/i.test(doc)
);
check(
  "no token header cookie secret env handling",
  /no token\/header\/cookie\/secret\/env handling/i.test(doc)
);
check("no retry", /- no retry/i.test(doc));
check("no second-run", /- no second-run/i.test(doc));
check("no re-arm", /- no re-arm/i.test(doc));
check("Step 1 completed", /Step 1: `completed`/i.test(doc));
check("Step 2 completed", /Step 2: `completed`/i.test(doc));
check(
  "Step 3 controlled_real_inventory_staging_import",
  /Step 3: `controlled_real_inventory_staging_import`/i.test(doc)
);
check("Step 3 completed false", /Step 3 completed\?: `false`/i.test(doc));
check("Step 4 not_started", /Step 4: `not_started`/i.test(doc));
check("Step 5 not_started", /Step 5: `not_started`/i.test(doc));
check(
  "owner-friendly staging market import explanation",
  /Owner-friendly explanation: staging market import means what/i.test(doc)
);
check("owner Thai checklist section", /Owner real car data checklist \(Thai\)/i.test(doc));
check("allowed fields section", /Allowed public-sale-safe fields/i.test(doc));
check("forbidden fields section", /Forbidden fields/i.test(doc));
check("staging-only import checklist section", /Staging-only import checklist/i.test(doc));
check("post-import owner review checklist section", /Post-import owner review checklist/i.test(doc));
check("HOLD rules section", /HOLD rules/i.test(doc));
check("PASS NEED REVIEW HOLD criteria section", /PASS \/ NEED REVIEW \/ HOLD criteria/i.test(doc));
check("future v22.12 phrase exact", doc.includes(REQUIRED_V2212_APPROVAL_PHRASE));
check("future v22.12 documented only", /v22\.12 phrase is documented only/i.test(doc));
check("no approval publish public preview", /no approval to publish public preview/i.test(doc));
check("no approval contact dealer", /no approval to contact dealer/i.test(doc));
check("no approval create send real lead", /no approval to create\/send real lead/i.test(doc));
check("no Step 4 movement", /no Step 4 movement/i.test(doc));

check("fixture version v22.11", fixture.version === "v22.11");
check(
  "fixture label indicates v22.11 controlled import",
  /v22\.11 controlled thor auto real-inventory staging import/i.test(
    String(fixture.label ?? "")
  )
);
check("fixture baseline v22.10 pass true", fixture.baseline_v2210_pass === true);
check(
  "fixture baseline blocker acknowledged true",
  fixture.baseline_v2210_blocker_acknowledged === true
);
check(
  "fixture owner approval phrase exact",
  fixture.owner_approval_phrase === REQUIRED_V2211_APPROVAL_PHRASE
);
check(
  "fixture controlled_real_inventory_staging_import true",
  fixture.controlled_real_inventory_staging_import === true
);
check(
  "fixture owner_supplied_public_sale_safe_real_car_data_only true",
  fixture.owner_supplied_public_sale_safe_real_car_data_only === true
);
check("fixture staging_market_only true", fixture.staging_market_only === true);
check("fixture no_public true", fixture.no_public === true);
check("fixture no_production true", fixture.no_production === true);
check("fixture no_real_lead true", fixture.no_real_lead === true);
check("fixture no_real_customer_data true", fixture.no_real_customer_data === true);
check("fixture no_dealer_facing_send true", fixture.no_dealer_facing_send === true);
check("fixture no_pii_phone_plate_vin true", fixture.no_pii_phone_plate_vin === true);
check(
  "fixture no_token_header_cookie_secret true",
  fixture.no_token_header_cookie_secret === true
);
check("fixture no_retry true", fixture.no_retry === true);
check("fixture no_second_run true", fixture.no_second_run === true);
check("fixture no_rearm true", fixture.no_rearm === true);
check("fixture no_step4_movement true", fixture.no_step4_movement === true);
check("fixture step_1_status completed", fixture.step_1_status === "completed");
check("fixture step_2_status completed", fixture.step_2_status === "completed");
check(
  "fixture step_3_status controlled_real_inventory_staging_import",
  fixture.step_3_status === "controlled_real_inventory_staging_import"
);
check("fixture step_3_completed false", fixture.step_3_completed === false);
check("fixture step_4_status not_started", fixture.step_4_status === "not_started");
check("fixture step_5_status not_started", fixture.step_5_status === "not_started");
check(
  "fixture imported_to_staging_market boolean",
  typeof fixture.imported_to_staging_market === "boolean"
);
check(
  "fixture imported_car_count number",
  typeof fixture.imported_car_count === "number"
);
check(
  "fixture future v22.12 documented only true",
  fixture.future_v2212_approval_phrase_documented_only === true
);

if (fixture.imported_to_staging_market === true) {
  check("step_3_execution_started true when imported", fixture.step_3_execution_started === true);
  check("imported_car_count positive when imported", fixture.imported_car_count > 0);
} else {
  check(
    "step_3_execution_started false when not imported",
    fixture.step_3_execution_started === false
  );
  check("imported_car_count zero when not imported", fixture.imported_car_count === 0);
  check(
    "real_car_data_source_status indicates NEED OWNER DATA or NEED REVIEW",
    ["NEED OWNER DATA", "NEED REVIEW"].includes(
      String(fixture.real_car_data_source_status ?? "")
    )
  );
}

const guard = fixture.forbidden_field_guard_results;
check("guard object exists", guard && typeof guard === "object");
if (guard && typeof guard === "object") {
  for (const [k, v] of Object.entries(guard)) {
    check(`guard ${k} false`, v === false);
  }
}

check("records array exists", Array.isArray(fixture.records));
if (Array.isArray(fixture.records)) {
  fixture.records.forEach((record, idx) => {
    const p = `record[${idx}]`;
    check(`${p} object`, record && typeof record === "object");
    if (!record || typeof record !== "object") return;
    for (const key of Object.keys(record)) {
      check(`${p} key allowlisted ${key}`, ALLOWED_RECORD_KEYS.has(key));
      const lowerKey = key.toLowerCase();
      const hasForbiddenHint = FORBIDDEN_KEY_HINTS.some((hint) =>
        lowerKey.includes(hint)
      );
      check(`${p} key no forbidden hint ${key}`, !hasForbiddenHint);
    }
  });
}

const recordsPayload = JSON.stringify(fixture.records ?? []);
for (const pattern of FORBIDDEN_TEXT_PATTERNS) {
  check(
    `records payload has no forbidden pattern ${pattern}`,
    !pattern.test(recordsPayload)
  );
}

console.log(`\nDone - ${failures} failure(s).\n`);
if (failures > 0) {
  process.exitCode = 1;
  process.exit(process.exitCode);
}
