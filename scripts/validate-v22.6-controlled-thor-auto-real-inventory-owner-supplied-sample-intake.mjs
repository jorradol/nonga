import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v22.6-controlled-thor-auto-real-inventory-owner-supplied-sample-intake.md";
const SAMPLE_PATH = "docs/examples/v22.6-thor-auto-owner-supplied-public-sale-safe-sample.example.json";

const REQUIRED_V226_APPROVAL_PHRASE =
  "FINAL AUTHORIZE v22.6 CONTROLLED THOR AUTO REAL-INVENTORY OWNER-SUPPLIED SAMPLE INTAKE / LIMITED PUBLIC-SALE-SAFE CAR DATA ONLY / STAGING ONLY / NO PUBLIC / NO PRODUCTION / NO REAL LEAD / NO REAL CUSTOMER DATA / NO PII PHONE PLATE VIN / NO TOKEN HEADER COOKIE SECRET SHARING / NO DEALER-FACING SEND / NO RETRY / NO SECOND-RUN / DO NOT MOVE TO STEP 4";

const REQUIRED_V227_APPROVAL_PHRASE =
  "FINAL AUTHORIZE v22.7 CONTROLLED THOR AUTO REAL-INVENTORY SAMPLE VALIDATION AND STAGING PREVIEW PREP / OWNER-SUPPLIED PUBLIC-SALE-SAFE CAR DATA ONLY / STAGING ONLY / NO PUBLIC / NO PRODUCTION / NO REAL LEAD / NO REAL CUSTOMER DATA / NO PII PHONE PLATE VIN / NO TOKEN HEADER COOKIE SECRET SHARING / NO DEALER-FACING SEND / NO RETRY / NO SECOND-RUN / DO NOT MOVE TO STEP 4";

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

const FORBIDDEN_KEY_HINTS = [
  "phone",
  "buyer",
  "lead",
  "plate",
  "vin",
  "registration",
  "customer_name",
  "private_note",
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

console.log("=== v22.6 controlled thor auto real-inventory owner-supplied sample intake validator ===\n");

check("doc exists", existsSync(DOC_PATH));
check("sample fixture exists", existsSync(SAMPLE_PATH));

const doc = readText(DOC_PATH);
let sample;
try {
  sample = parseJson(SAMPLE_PATH);
  check("sample parses json", true);
} catch (err) {
  check("sample parses json", false, String(err));
}

if (!sample || typeof sample !== "object") {
  process.exitCode = 1;
  process.exit(process.exitCode);
}

check(
  "v22.5 baseline PASS included",
  /PASS — v22\.5 controlled Thor Auto real-inventory intake preparation packet prepared/i.test(doc)
);
check("v22.5 preparation packet only noted", /v22\.5 was preparation packet only/i.test(doc));
check("v22.5 no real inventory import noted", /no real inventory was imported in v22\.5/i.test(doc));

check("owner-supplied sample intake only", /owner-supplied sample intake only/i.test(doc));
check("limited public-sale-safe car data only", /limited public-sale-safe car data only/i.test(doc));
check("no real market import yet", /no real market import yet/i.test(doc));
check("no real inventory public production mutation", /no real inventory mutation into public\/production\/live market/i.test(doc));
check("no dealer-facing send", /no dealer-facing send/i.test(doc));
check("no real dealer contact action", /no real dealer contact\/action/i.test(doc));
check("no real lead customer data", /no real lead\/customer data/i.test(doc));
check("no pii phone plate vin full registration", /no PII\/phone\/plate\/VIN\/full registration data/i.test(doc));
check("no token header cookie secret env", /no token\/header\/cookie\/secret\/env/i.test(doc));
check("no deploy public production", /no deploy\/public\/production/i.test(doc));

check("Step 1 completed", /Step 1: `completed`/i.test(doc));
check("Step 2 completed", /Step 2: `completed`/i.test(doc));
check(
  "Step 3 owner_supplied_real_inventory_sample_intake_only",
  /Step 3: `owner_supplied_real_inventory_sample_intake_only`/i.test(doc)
);
check("Step 3 execution started false", /Step 3 execution started\?: `false`/i.test(doc));
check("Step 3 completed false", /Step 3 completed\?: `false`/i.test(doc));
check("Step 4 not_started", /Step 4: `not_started`/i.test(doc));
check("Step 5 not_started", /Step 5: `not_started`/i.test(doc));

check("owner-friendly sample intake checklist", /Owner-friendly sample intake checklist/i.test(doc));
check("allowed fields section", /Allowed public-sale-safe fields/i.test(doc));
check("forbidden fields section", /Forbidden fields/i.test(doc));
check("sample json shape section", /Sample JSON shape/i.test(doc));
check("validation rules section", /Validation rules for public-sale-safe fields/i.test(doc));
check("HOLD rules section", /HOLD rules/i.test(doc));
check("technical checklist section", /Technical checklist for น้องซี/i.test(doc));
check("PASS NEED REVIEW HOLD section", /PASS \/ NEED REVIEW \/ HOLD criteria/i.test(doc));
check("future v22.7 phrase exact", doc.includes(REQUIRED_V227_APPROVAL_PHRASE));
check("future v22.7 documented only", /documented only/i.test(doc));
check("no approval import to market", /no approval to import inventory to market/i.test(doc));
check("no approval contact dealer", /no approval to contact dealer/i.test(doc));
check("no approval create send real lead", /no approval to create\/send real lead/i.test(doc));
check("no Step 4 movement", /no Step 4 movement/i.test(doc));
check("exact v22.6 owner phrase present", doc.includes(REQUIRED_V226_APPROVAL_PHRASE));

check("sample label exists", /v22\.6 owner-supplied public-sale-safe sample intake only/i.test(String(sample.sample_label)));
check("sample_intake_only true", sample.sample_intake_only === true);
check("no_real_market_import_yet true", sample.no_real_market_import_yet === true);
check("no_dealer_facing_send true", sample.no_dealer_facing_send === true);
check("no_real_lead true", sample.no_real_lead === true);
check("step4_not_started true", sample.step4_not_started === true);
check("records array exists", Array.isArray(sample.records) && sample.records.length > 0, String(sample.records?.length ?? 0));

if (Array.isArray(sample.records)) {
  sample.records.forEach((record, idx) => {
    const prefix = `record[${idx}]`;
    check(`${prefix} object`, record && typeof record === "object");
    if (!record || typeof record !== "object") return;

    for (const key of Object.keys(record)) {
      check(`${prefix} key allowlisted ${key}`, ALLOWED_KEYS.has(key));
      const lowerKey = key.toLowerCase();
      check(
        `${prefix} key not forbidden-hint ${key}`,
        !FORBIDDEN_KEY_HINTS.some((hint) => lowerKey.includes(hint))
      );
    }

    check(`${prefix} has dealer_group_label`, typeof record.dealer_group_label === "string" && record.dealer_group_label.length > 0);
    check(`${prefix} has car_public_id`, typeof record.car_public_id === "string" && record.car_public_id.length > 0);
    check(`${prefix} car_public_id not vin/plate`, !/vin|plate/i.test(record.car_public_id), String(record.car_public_id));
    check(`${prefix} has brand`, typeof record.brand === "string" && record.brand.length > 0);
    check(`${prefix} has model`, typeof record.model === "string" && record.model.length > 0);
    check(
      `${prefix} year safe range`,
      Number.isInteger(record.year) && record.year >= 1990 && record.year <= 2035,
      String(record.year)
    );
    check(`${prefix} has mileage_public`, typeof record.mileage_public === "string" && record.mileage_public.length > 0);
    check(
      `${prefix} has price_public or price_range_public`,
      typeof record.price_public === "string" || typeof record.price_range_public === "string"
    );
    check(
      `${prefix} photo_reference_placeholder safe`,
      !record.photo_reference_placeholder || /placeholder/i.test(String(record.photo_reference_placeholder)),
      String(record.photo_reference_placeholder ?? "")
    );
  });
}

const lowerPayload = JSON.stringify(sample).toLowerCase();
for (const hint of FORBIDDEN_KEY_HINTS) {
  check(`payload has no forbidden hint key "${hint}"`, !new RegExp(`"${hint}[^"]*"`).test(lowerPayload));
}

console.log(`\nDone - ${failures} failure(s).\n`);
if (failures > 0) {
  process.exitCode = 1;
  process.exit(process.exitCode);
}
