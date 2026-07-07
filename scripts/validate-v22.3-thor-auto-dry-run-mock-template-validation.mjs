import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v22.3-thor-auto-dry-run-mock-template-validation.md";
const FIXTURE_PATH = "docs/examples/v22.3-thor-auto-dry-run-mock-template-validation.example.json";
const MOCK_TEMPLATE_PATH = "docs/examples/v22.3-thor-auto-mock-inventory-template.example.json";

const REQUIRED_V223_APPROVAL_PHRASE =
  "FINAL AUTHORIZE v22.3 THOR AUTO DRY-RUN MOCK TEMPLATE VALIDATION / MOCK DATA ONLY / STAGING ONLY / NO PUBLIC / NO PRODUCTION / NO REAL LEAD / NO REAL CUSTOMER DATA / NO PII PHONE PLATE VIN / NO TOKEN HEADER COOKIE SECRET SHARING / NO REAL INVENTORY IMPORT YET / NO DEALER-FACING SEND / NO RETRY / NO SECOND-RUN / DO NOT MOVE TO STEP 4";

const REQUIRED_V224_APPROVAL_PHRASE =
  "FINAL AUTHORIZE v22.4 THOR AUTO FUTURE DRY-RUN APPROVAL PACKET / OWNER DECISION ONLY / NO NEW RUN / NO REAL INVENTORY IMPORT YET / NO DEALER-FACING SEND / NO REAL LEAD / NO REAL CUSTOMER DATA / NO PII PHONE PLATE VIN / NO TOKEN HEADER COOKIE SECRET SHARING / NO PUBLIC / NO PRODUCTION / NO RETRY / NO SECOND-RUN / DO NOT MOVE TO STEP 4";

const REQUIRED_FIELDS = [
  "dealer_code",
  "car_id",
  "make",
  "model",
  "year",
  "transmission",
  "fuel_type",
  "mileage_range",
  "sanitized_price",
  "location_area",
  "public_description",
  "availability_status",
];

const OPTIONAL_FIELDS = ["trim", "body_type", "image_placeholder_url", "safety_notes"];

const FORBIDDEN_KEYS = [
  "customer_name",
  "customer_phone",
  "buyer_lead_info",
  "dealer_staff_phone",
  "dealer_private_notes",
  "license_plate",
  "vin",
  "registration_data",
  "internal_cost",
  "bank_account",
  "payment_details",
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

function readJson(path) {
  return JSON.parse(readText(path));
}

console.log("=== v22.3 thor auto dry-run mock template validation validator ===\n");

check("doc exists", existsSync(DOC_PATH));
check("fixture exists", existsSync(FIXTURE_PATH));
check("mock inventory template fixture exists", existsSync(MOCK_TEMPLATE_PATH));

const doc = readText(DOC_PATH);
let fixture;
let mockTemplate;
try {
  fixture = readJson(FIXTURE_PATH);
  check("fixture parses json", true);
} catch (err) {
  check("fixture parses json", false, String(err));
}

try {
  mockTemplate = readJson(MOCK_TEMPLATE_PATH);
  check("mock template parses json", true);
} catch (err) {
  check("mock template parses json", false, String(err));
}

if (!fixture || typeof fixture !== "object" || !mockTemplate || typeof mockTemplate !== "object") {
  process.exitCode = 1;
  process.exit(process.exitCode);
}

check("version is v22.3", fixture.version === "v22.3");
check(
  "executionType matches",
  fixture.executionType ===
    "THOR_AUTO_MOCK_TEMPLATE_VALIDATION_ONLY_MOCK_DATA_ONLY_NO_REAL_INVENTORY_IMPORT_NO_DEALER_FACING_SEND_NO_REAL_LEAD"
);
check("repo matches", fixture.repo === "https://github.com/jorradol/nonga.git");
check("localPath matches", fixture.localPath === "D:\\nonga");
check("branch matches", fixture.branch === "feature/chat-image-attachment-v1");
check("expectedHead is 1167632", fixture.expectedHead === "1167632");
check(
  "expected latest commit message recorded",
  fixture.expectedLatestCommitMessage === "docs(ai): add v22.2 thor auto dry-run data shape review"
);

check("v22.2 baseline PASS", fixture.baselineV222Pass === true);
check("exact v22.3 owner approval phrase recorded", fixture.ownerV223ApprovalPhraseRecordedExact === true);
check("mock template validation only", fixture.mockTemplateValidationOnly === true);
check("mock data only", fixture.mockDataOnly === true);
check("no real dealer action", fixture.noRealDealerAction === true);
check("no dealer-facing send", fixture.noDealerFacingSend === true);
check("no real inventory import", fixture.noRealInventoryImport === true);
check("no real inventory mutation", fixture.noRealInventoryMutation === true);
check("no real lead creation/send", fixture.noRealLeadCreationSend === true);
check("no real customer data", fixture.noRealCustomerData === true);
check("no real dealer data", fixture.noRealDealerData === true);
check(
  "no token/header/cookie/secret/env handling",
  fixture.noTokenHeaderCookieSecretEnvHandling === true
);
check("no Authorization header handling", fixture.noAuthorizationHeaderHandling === true);
check("no platform credential handling", fixture.noPlatformCredentialHandling === true);
check("no PII/phone/plate/VIN", fixture.noPiiPhonePlateVin === true);
check("no deploy", fixture.noDeploy === true);
check("staging only", fixture.stagingOnly === true);
check("no public", fixture.noPublic === true);
check("no production", fixture.noProduction === true);

check("Step 1 completed", fixture.step1Status === "completed", String(fixture.step1Status));
check("Step 2 completed", fixture.step2Status === "completed", String(fixture.step2Status));
check(
  "Step 3 mock_template_validation_only",
  fixture.step3Status === "mock_template_validation_only",
  String(fixture.step3Status)
);
check("Step 3 execution started false", fixture.step3ExecutionStarted === false);
check("Step 3 completed false", fixture.step3Completed === false);
check("Step 4 not_started", fixture.step4Status === "not_started", String(fixture.step4Status));
check("Step 5 not_started", fixture.step5Status === "not_started", String(fixture.step5Status));

check("required fields list included", fixture.requiredFieldsListIncluded === true);
check("optional fields list included", fixture.optionalFieldsListIncluded === true);
check("forbidden fields list included", fixture.forbiddenFieldsListIncluded === true);
check("field-level validation rules included", fixture.fieldLevelValidationRulesIncluded === true);
check("redaction rules included", fixture.redactionRulesIncluded === true);
check("owner-friendly checklist included", fixture.ownerFriendlyChecklistIncluded === true);
check("technical checklist included", fixture.technicalChecklistIncluded === true);
check("PASS / NEED REVIEW / HOLD criteria included", fixture.passNeedReviewHoldCriteriaIncluded === true);
check("future v22.4 approval phrase documented only", fixture.futureV224ApprovalPhraseDocumentedOnly === true);
check("no approval to import real inventory", fixture.approvalToImportRealInventoryIncluded === false);
check("no approval to contact dealer", fixture.approvalToContactDealerIncluded === false);
check("no approval to create/send real lead", fixture.approvalToCreateSendRealLeadIncluded === false);
check("no Step 4 movement", fixture.step4MovementIncluded === false);
check("mock inventory template fixture exists flag", fixture.mockInventoryTemplateFixtureExists === true);
check(
  "mock inventory template contains no forbidden fields flag",
  fixture.mockInventoryTemplateContainsNoForbiddenFields === true
);

for (const key of REQUIRED_FIELDS) {
  check(`mock template required field ${key}`, Object.prototype.hasOwnProperty.call(mockTemplate, key));
}

const allowedKeys = new Set([...REQUIRED_FIELDS, ...OPTIONAL_FIELDS]);
for (const key of Object.keys(mockTemplate)) {
  check(`mock template key allowlisted ${key}`, allowedKeys.has(key));
}

check(
  "dealer_code placeholder pattern",
  typeof mockTemplate.dealer_code === "string" && /^THOR_MOCK(?:_[A-Z0-9]+)?$/.test(mockTemplate.dealer_code),
  String(mockTemplate.dealer_code)
);
check(
  "car_id placeholder pattern",
  typeof mockTemplate.car_id === "string" && /^CAR_MOCK_[A-Z0-9]+$/i.test(mockTemplate.car_id),
  String(mockTemplate.car_id)
);
check(
  "year safe range",
  Number.isInteger(mockTemplate.year) && mockTemplate.year >= 1990 && mockTemplate.year <= 2035,
  String(mockTemplate.year)
);
check(
  "mileage_range string format",
  typeof mockTemplate.mileage_range === "string" && /-/.test(mockTemplate.mileage_range),
  String(mockTemplate.mileage_range)
);
check(
  "sanitized_price format",
  typeof mockTemplate.sanitized_price === "string" && /(xx|x,xxx|THB)/i.test(mockTemplate.sanitized_price),
  String(mockTemplate.sanitized_price)
);
check(
  "image placeholder URL if present",
  !Object.prototype.hasOwnProperty.call(mockTemplate, "image_placeholder_url") ||
    (typeof mockTemplate.image_placeholder_url === "string" && /mock/i.test(mockTemplate.image_placeholder_url)),
  String(mockTemplate.image_placeholder_url ?? "")
);

const lowerJson = JSON.stringify(mockTemplate).toLowerCase();
for (const forbidden of FORBIDDEN_KEYS) {
  check(`forbidden key absent ${forbidden}`, !lowerJson.includes(`"${forbidden}"`));
}

check(
  "doc includes v22.2 baseline PASS",
  doc.includes(
    "PASS — v22.2 Thor Auto data shape review prepared with mock/sanitized template only, no real dealer action performed"
  )
);
check("doc includes exact v22.3 owner phrase", doc.includes(REQUIRED_V223_APPROVAL_PHRASE));
check("doc says mock template validation only", /mock template validation only/i.test(doc));
check("doc says mock data only", /mock data only/i.test(doc));
check("doc records no real dealer action", /no real dealer action/i.test(doc));
check("doc records no dealer-facing send", /no dealer-facing send/i.test(doc));
check("doc records no real inventory import", /no real inventory import/i.test(doc));
check("doc records no real inventory mutation", /no real inventory mutation/i.test(doc));
check("doc records no real lead creation/send", /no real lead creation\/send/i.test(doc));
check("doc records no real customer data", /no real customer data/i.test(doc));
check("doc records no real dealer data", /no real dealer data/i.test(doc));
check(
  "doc records no token/header/cookie/secret/env handling",
  /no token\/header\/cookie\/secret\/env handling/i.test(doc)
);
check("doc records no pii phone plate vin", /no PII\/phone\/plate\/VIN/i.test(doc));
check("doc records no deploy public production", /no deploy\/public\/production/i.test(doc));
check("doc Step 1 completed", /Step 1: `completed`/i.test(doc));
check("doc Step 2 completed", /Step 2: `completed`/i.test(doc));
check("doc Step 3 mock_template_validation_only", /Step 3: `mock_template_validation_only`/i.test(doc));
check("doc Step 3 execution started false", /Step 3 execution started\?: `false`/i.test(doc));
check("doc Step 3 completed false", /Step 3 completed\?: `false`/i.test(doc));
check("doc Step 4 not_started", /Step 4: `not_started`/i.test(doc));
check("doc Step 5 not_started", /Step 5: `not_started`/i.test(doc));
check("doc includes required fields list", /Required fields list/i.test(doc));
check("doc includes optional fields list", /Optional fields list/i.test(doc));
check("doc includes forbidden fields list", /Forbidden fields list/i.test(doc));
check("doc includes field-level validation rules", /Field-level validation rules/i.test(doc));
check("doc includes redaction rules", /Redaction rules/i.test(doc));
check("doc includes owner-friendly checklist", /Owner-friendly checklist/i.test(doc));
check("doc includes technical checklist", /Technical checklist for น้องซี/i.test(doc));
check("doc includes PASS / NEED REVIEW / HOLD", /PASS \/ NEED REVIEW \/ HOLD criteria/i.test(doc));
check("doc includes required v22.4 phrase exactly", doc.includes(REQUIRED_V224_APPROVAL_PHRASE));
check("doc says v22.4 phrase documented only", /documented only/i.test(doc));
check("doc says not treated as approval", /not treated as approval/i.test(doc));
check("doc no approval to import real inventory", /no approval to import real inventory/i.test(doc));
check("doc no approval to contact dealer", /no approval to contact dealer/i.test(doc));
check("doc no approval to create/send real lead", /no approval to create\/send real lead/i.test(doc));
check("doc no Step 4 movement", /no Step 4 movement/i.test(doc));
check(
  "doc includes exact thai boundary statement",
  doc.includes("ยังไม่ public, ยังไม่ production, ยังไม่ real dealer, ยังไม่ real lead และยังไม่แตะของจริง")
);

console.log(`\nDone - ${failures} failure(s).\n`);
if (failures > 0) {
  process.exitCode = 1;
  process.exit(process.exitCode);
}
