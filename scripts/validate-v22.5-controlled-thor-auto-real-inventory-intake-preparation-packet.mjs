import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v22.5-controlled-thor-auto-real-inventory-intake-preparation-packet.md";
const FIXTURE_PATH =
  "docs/examples/v22.5-controlled-thor-auto-real-inventory-intake-preparation-packet.example.json";

const REQUIRED_V225_APPROVAL_PHRASE =
  "FINAL AUTHORIZE v22.5 CONTROLLED THOR AUTO REAL-INVENTORY INTAKE PREPARATION PACKET / OWNER-SUPPLIED PUBLIC-SALE-SAFE FIELDS ONLY / STAGING ONLY / NO PUBLIC / NO PRODUCTION / NO REAL LEAD / NO REAL CUSTOMER DATA / NO PII PHONE PLATE VIN / NO TOKEN HEADER COOKIE SECRET SHARING / NO DEALER-FACING SEND / NO RETRY / NO SECOND-RUN / DO NOT MOVE TO STEP 4";

const REQUIRED_V226_APPROVAL_PHRASE =
  "FINAL AUTHORIZE v22.6 CONTROLLED THOR AUTO REAL-INVENTORY INTAKE VALIDATION CHECKLIST / OWNER-REVIEWED PUBLIC-SALE-SAFE FIELDS ONLY / STAGING ONLY / NO PUBLIC / NO PRODUCTION / NO REAL LEAD / NO REAL CUSTOMER DATA / NO PII PHONE PLATE VIN / NO TOKEN HEADER COOKIE SECRET SHARING / NO DEALER-FACING SEND / NO RETRY / NO SECOND-RUN / DO NOT MOVE TO STEP 4";

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

console.log("=== v22.5 controlled thor auto real-inventory intake preparation packet validator ===\n");

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

check("version is v22.5", fixture.version === "v22.5");
check(
  "executionType matches",
  fixture.executionType ===
    "CONTROLLED_THOR_AUTO_REAL_INVENTORY_INTAKE_PREPARATION_PACKET_OWNER_SUPPLIED_PUBLIC_SALE_SAFE_FIELDS_ONLY_STAGING_ONLY_NO_NEW_RUN_NO_REAL_LEAD_NO_REAL_CUSTOMER_DATA_NO_DEALER_FACING_SEND"
);
check("repo matches", fixture.repo === "https://github.com/jorradol/nonga.git");
check("localPath matches", fixture.localPath === "D:\\nonga");
check("branch matches", fixture.branch === "feature/chat-image-attachment-v1");
check("expectedHead is d354ad2", fixture.expectedHead === "d354ad2");
check(
  "expected latest commit message recorded",
  fixture.expectedLatestCommitMessage === "docs(ai): add v22.4 thor auto future dry-run approval packet"
);

check("exact v22.5 owner approval phrase recorded", fixture.ownerV225ApprovalPhraseRecordedExact === true);
check("preparation packet only", fixture.preparationPacketOnly === true);
check(
  "owner-supplied public-sale-safe fields only",
  fixture.ownerSuppliedPublicSaleSafeFieldsOnly === true
);
check("no new run", fixture.noNewRun === true);
check("no real dealer action", fixture.noRealDealerAction === true);
check("no dealer-facing send", fixture.noDealerFacingSend === true);
check("no real inventory import/mutation", fixture.noRealInventoryImportMutation === true);
check("no real lead/customer data", fixture.noRealLeadCustomerData === true);
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
  "Step 3 real_inventory_intake_preparation_packet_only",
  fixture.step3Status === "real_inventory_intake_preparation_packet_only",
  String(fixture.step3Status)
);
check("Step 3 execution started false", fixture.step3ExecutionStarted === false);
check("Step 3 completed false", fixture.step3Completed === false);
check("Step 4 not_started", fixture.step4Status === "not_started", String(fixture.step4Status));
check("Step 5 not_started", fixture.step5Status === "not_started", String(fixture.step5Status));

check("public-sale-safe field set included", fixture.publicSaleSafeFieldSetIncluded === true);
check("blocked field set included", fixture.blockedFieldSetIncluded === true);
check("intake boundary rules included", fixture.intakeBoundaryRulesIncluded === true);
check("owner-friendly checklist included", fixture.ownerFriendlyChecklistIncluded === true);
check("technical checklist included", fixture.technicalChecklistIncluded === true);
check("PASS / NEED REVIEW / HOLD criteria included", fixture.passNeedReviewHoldCriteriaIncluded === true);
check("future v22.6 approval phrase documented only", fixture.futureV226ApprovalPhraseDocumentedOnly === true);
check("no approval to import real inventory", fixture.approvalToImportRealInventoryIncluded === false);
check("no approval to contact dealer", fixture.approvalToContactDealerIncluded === false);
check("no approval to create/send real lead", fixture.approvalToCreateSendRealLeadIncluded === false);
check("no Step 4 movement", fixture.step4MovementIncluded === false);

check("doc includes exact v22.5 owner phrase", doc.includes(REQUIRED_V225_APPROVAL_PHRASE));
check("doc states preparation packet only", /preparation packet only/i.test(doc));
check("doc states owner-supplied public-sale-safe fields only", /owner-supplied public-sale-safe fields only/i.test(doc));
check("doc states no new run", /no new run/i.test(doc));
check("doc records no real dealer action", /no real dealer action/i.test(doc));
check("doc records no dealer-facing send", /no dealer-facing send/i.test(doc));
check("doc records no real inventory import/mutation", /no real inventory import\/mutation/i.test(doc));
check("doc records no real lead/customer data", /no real lead\/customer data/i.test(doc));
check(
  "doc records no token/header/cookie/secret/env handling",
  /no token\/header\/cookie\/secret\/env handling/i.test(doc)
);
check("doc records no pii phone plate vin", /no PII\/phone\/plate\/VIN/i.test(doc));
check("doc records no deploy public production", /no deploy\/public\/production/i.test(doc));
check(
  "doc includes public-sale-safe fields section",
  /Public-sale-safe field set/i.test(doc)
);
check("doc includes blocked fields section", /Explicitly blocked fields/i.test(doc));
check("doc includes intake boundary rules", /Intake boundary rules/i.test(doc));
check("doc includes owner-friendly checklist", /Owner-friendly checklist/i.test(doc));
check("doc includes technical checklist", /Technical checklist for น้องซี/i.test(doc));
check("doc includes PASS / NEED REVIEW / HOLD", /PASS \/ NEED REVIEW \/ HOLD criteria/i.test(doc));
check("doc includes required v22.6 phrase exactly", doc.includes(REQUIRED_V226_APPROVAL_PHRASE));
check("doc says v22.6 phrase documented only", /documented only/i.test(doc));
check("doc says no v22.6 work performed", /no v22\.6 work is performed/i.test(doc));
check("doc Step 1 completed", /Step 1: `completed`/i.test(doc));
check("doc Step 2 completed", /Step 2: `completed`/i.test(doc));
check(
  "doc Step 3 real_inventory_intake_preparation_packet_only",
  /Step 3: `real_inventory_intake_preparation_packet_only`/i.test(doc)
);
check("doc Step 3 execution started false", /Step 3 execution started\?: `false`/i.test(doc));
check("doc Step 3 completed false", /Step 3 completed\?: `false`/i.test(doc));
check("doc Step 4 not_started", /Step 4: `not_started`/i.test(doc));
check("doc Step 5 not_started", /Step 5: `not_started`/i.test(doc));
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
