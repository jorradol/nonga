import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v22.2-thor-auto-dry-run-data-shape-review.md";
const FIXTURE_PATH = "docs/examples/v22.2-thor-auto-dry-run-data-shape-review.example.json";

const REQUIRED_V222_APPROVAL_PHRASE =
  "FINAL AUTHORIZE v22.2 THOR AUTO DRY-RUN DATA SHAPE REVIEW / MOCK OR SANITIZED TEMPLATE ONLY / STAGING ONLY / NO PUBLIC / NO PRODUCTION / NO REAL LEAD / NO REAL CUSTOMER DATA / NO PII PHONE PLATE VIN / NO TOKEN HEADER COOKIE SECRET SHARING / NO REAL INVENTORY IMPORT YET / NO DEALER-FACING SEND / NO RETRY / NO SECOND-RUN / DO NOT MOVE TO STEP 4";

const REQUIRED_V223_APPROVAL_PHRASE =
  "FINAL AUTHORIZE v22.3 THOR AUTO DRY-RUN MOCK TEMPLATE VALIDATION / MOCK DATA ONLY / STAGING ONLY / NO PUBLIC / NO PRODUCTION / NO REAL LEAD / NO REAL CUSTOMER DATA / NO PII PHONE PLATE VIN / NO TOKEN HEADER COOKIE SECRET SHARING / NO REAL INVENTORY IMPORT YET / NO DEALER-FACING SEND / NO RETRY / NO SECOND-RUN / DO NOT MOVE TO STEP 4";

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

console.log("=== v22.2 thor auto dry-run data shape review validator ===\n");

check("doc exists", existsSync(DOC_PATH));
check("fixture exists", existsSync(FIXTURE_PATH));

const doc = readText(DOC_PATH);
let fixture;
try {
  fixture = JSON.parse(readText(FIXTURE_PATH));
  check("fixture parses json", true);
} catch (err) {
  check("fixture parses json", false, String(err));
}

if (!fixture || typeof fixture !== "object") {
  process.exitCode = 1;
  process.exit(process.exitCode);
}

check("version is v22.2", fixture.version === "v22.2");
check(
  "executionType matches",
  fixture.executionType ===
    "THOR_AUTO_DATA_SHAPE_REVIEW_ONLY_MOCK_OR_SANITIZED_TEMPLATE_ONLY_NO_REAL_INVENTORY_IMPORT_NO_DEALER_FACING_SEND_NO_REAL_LEAD"
);
check("repo matches", fixture.repo === "https://github.com/jorradol/nonga.git");
check("localPath matches", fixture.localPath === "D:\\nonga");
check("branch matches", fixture.branch === "feature/chat-image-attachment-v1");
check("expectedHead is f0bb05e", fixture.expectedHead === "f0bb05e");
check(
  "expected latest commit message recorded",
  fixture.expectedLatestCommitMessage === "docs(ai): add v22.1 step3 real dealer dry-run prep packet"
);

check("v22.1 baseline PASS", fixture.baselineV221Pass === true);
check("exact v22.2 owner approval phrase recorded", fixture.ownerV222ApprovalPhraseRecordedExact === true);
check("data shape review only", fixture.dataShapeReviewOnly === true);
check("mock or sanitized template only", fixture.mockOrSanitizedTemplateOnly === true);
check("no real dealer action", fixture.noRealDealerAction === true);
check("no dealer-facing send", fixture.noDealerFacingSend === true);
check("no real inventory import", fixture.noRealInventoryImport === true);
check("no real inventory mutation", fixture.noRealInventoryMutation === true);
check("no real lead creation/send", fixture.noRealLeadCreationSend === true);
check("no real customer data", fixture.noRealCustomerData === true);
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
  "Step 3 data_shape_review_only",
  fixture.step3Status === "data_shape_review_only",
  String(fixture.step3Status)
);
check("Step 3 execution started false", fixture.step3ExecutionStarted === false);
check("Step 3 completed false", fixture.step3Completed === false);
check("Step 4 not_started", fixture.step4Status === "not_started", String(fixture.step4Status));
check("Step 5 not_started", fixture.step5Status === "not_started", String(fixture.step5Status));

check(
  "safe mock/sanitized inventory template included",
  fixture.safeMockSanitizedInventoryTemplateIncluded === true
);
check("allowed fields list included", fixture.allowedFieldsListIncluded === true);
check("forbidden fields list included", fixture.forbiddenFieldsListIncluded === true);
check("redaction rules included", fixture.redactionRulesIncluded === true);
check("owner-friendly checklist included", fixture.ownerFriendlyChecklistIncluded === true);
check("technical checklist included", fixture.technicalChecklistIncluded === true);
check("PASS / NEED REVIEW / HOLD criteria included", fixture.passNeedReviewHoldCriteriaIncluded === true);
check("future v22.3 approval phrase documented only", fixture.futureV223ApprovalPhraseDocumentedOnly === true);
check("no approval to import real inventory", fixture.approvalToImportRealInventoryIncluded === false);
check("no approval to contact dealer", fixture.approvalToContactDealerIncluded === false);
check("no approval to create/send real lead", fixture.approvalToCreateSendRealLeadIncluded === false);
check("no Step 4 movement", fixture.step4MovementIncluded === false);

check(
  "doc includes v22.1 baseline PASS",
  doc.includes(
    "PASS — v22.1 Step 3 real dealer dry-run prep packet prepared for Thor Auto candidate only, no real dealer action performed"
  )
);
check("doc includes exact v22.2 owner phrase", doc.includes(REQUIRED_V222_APPROVAL_PHRASE));
check("doc says data shape review only", /data shape review only/i.test(doc));
check("doc says mock or sanitized template only", /mock or sanitized template only/i.test(doc));
check("doc records no real dealer action", /no real dealer action/i.test(doc));
check("doc records no dealer-facing send", /no dealer-facing send/i.test(doc));
check("doc records no real inventory import", /no real inventory import/i.test(doc));
check("doc records no real inventory mutation", /no real inventory mutation/i.test(doc));
check("doc records no real lead creation/send", /no real lead creation\/send/i.test(doc));
check("doc records no real customer data", /no real customer data/i.test(doc));
check(
  "doc records no token/header/cookie/secret/env handling",
  /no token\/header\/cookie\/secret\/env handling/i.test(doc)
);
check("doc records no pii phone plate vin", /no PII\/phone\/plate\/VIN/i.test(doc));
check("doc records no deploy public production", /no deploy\/public\/production/i.test(doc));
check("doc Step 1 completed", /Step 1: `completed`/i.test(doc));
check("doc Step 2 completed", /Step 2: `completed`/i.test(doc));
check("doc Step 3 data_shape_review_only", /Step 3: `data_shape_review_only`/i.test(doc));
check("doc Step 3 execution started false", /Step 3 execution started\?: `false`/i.test(doc));
check("doc Step 3 completed false", /Step 3 completed\?: `false`/i.test(doc));
check("doc Step 4 not_started", /Step 4: `not_started`/i.test(doc));
check("doc Step 5 not_started", /Step 5: `not_started`/i.test(doc));
check("doc includes safe template section", /Safe mock\/sanitized inventory template/i.test(doc));
check("doc includes allowed fields list", /Allowed fields list/i.test(doc));
check("doc includes forbidden fields list", /Forbidden fields list/i.test(doc));
check("doc includes redaction rules", /Redaction rules/i.test(doc));
check("doc includes owner-friendly checklist", /Owner-friendly checklist/i.test(doc));
check("doc includes technical checklist", /Technical checklist for น้องซี/i.test(doc));
check("doc includes PASS / NEED REVIEW / HOLD", /PASS \/ NEED REVIEW \/ HOLD criteria/i.test(doc));
check("doc includes required v22.3 phrase exactly", doc.includes(REQUIRED_V223_APPROVAL_PHRASE));
check("doc says v22.3 phrase documented only", /documented only/i.test(doc));
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
