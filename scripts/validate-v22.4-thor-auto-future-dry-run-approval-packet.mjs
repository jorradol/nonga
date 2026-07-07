import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v22.4-thor-auto-future-dry-run-approval-packet.md";
const FIXTURE_PATH = "docs/examples/v22.4-thor-auto-future-dry-run-approval-packet.example.json";

const REQUIRED_V225_APPROVAL_PHRASE =
  "FINAL AUTHORIZE v22.5 CONTROLLED THOR AUTO REAL-INVENTORY INTAKE PREPARATION PACKET / OWNER-SUPPLIED PUBLIC-SALE-SAFE FIELDS ONLY / STAGING ONLY / NO PUBLIC / NO PRODUCTION / NO REAL LEAD / NO REAL CUSTOMER DATA / NO PII PHONE PLATE VIN / NO TOKEN HEADER COOKIE SECRET SHARING / NO DEALER-FACING SEND / NO RETRY / NO SECOND-RUN / DO NOT MOVE TO STEP 4";

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

console.log("=== v22.4 thor auto future dry-run approval packet validator ===\n");

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

check("version is v22.4", fixture.version === "v22.4");
check(
  "executionType matches",
  fixture.executionType ===
    "THOR_AUTO_FUTURE_DRY_RUN_APPROVAL_PACKET_OWNER_DECISION_ONLY_NO_NEW_RUN_NO_REAL_INVENTORY_IMPORT_YET_NO_DEALER_FACING_SEND_NO_REAL_LEAD"
);
check("repo matches", fixture.repo === "https://github.com/jorradol/nonga.git");
check("localPath matches", fixture.localPath === "D:\\nonga");
check("branch matches", fixture.branch === "feature/chat-image-attachment-v1");
check("expectedHead is 3ad352d", fixture.expectedHead === "3ad352d");
check(
  "expected latest commit message recorded",
  fixture.expectedLatestCommitMessage === "docs(ai): add v22.3 thor auto dry-run mock template validation"
);

check("v22.3 baseline PASS", fixture.baselineV223Pass === true);
check("v22.3 must not be repeated", fixture.v223MustNotBeRepeated === true);
check("owner decision packet only", fixture.ownerDecisionPacketOnly === true);
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
  "Step 3 owner_decision_packet_only",
  fixture.step3Status === "owner_decision_packet_only",
  String(fixture.step3Status)
);
check("Step 3 execution started false", fixture.step3ExecutionStarted === false);
check("Step 3 completed false", fixture.step3Completed === false);
check("Step 4 not_started", fixture.step4Status === "not_started", String(fixture.step4Status));
check("Step 5 not_started", fixture.step5Status === "not_started", String(fixture.step5Status));

check("Option A included", fixture.optionAIncluded === true);
check("Option B included", fixture.optionBIncluded === true);
check("recommendation toward Option A included", fixture.recommendationTowardOptionAIncluded === true);
check("recommendation is not owner approval", fixture.recommendationIsNotOwnerApproval === true);
check("future v22.5 approval phrase documented only", fixture.futureV225ApprovalPhraseDocumentedOnly === true);
check("no approval to import real inventory", fixture.approvalToImportRealInventoryIncluded === false);
check("no approval to contact dealer", fixture.approvalToContactDealerIncluded === false);
check("no approval to create/send real lead", fixture.approvalToCreateSendRealLeadIncluded === false);
check("no Step 4 movement", fixture.step4MovementIncluded === false);

check(
  "doc includes v22.3 baseline PASS",
  doc.includes(
    "PASS — v22.3 Thor Auto mock template validation prepared with mock data only, no real dealer action performed"
  )
);
check("doc states v22.3 must not be repeated", /must not be repeated/i.test(doc));
check("doc states owner decision packet only", /owner decision packet only/i.test(doc));
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
check("doc Step 1 completed", /Step 1: `completed`/i.test(doc));
check("doc Step 2 completed", /Step 2: `completed`/i.test(doc));
check("doc Step 3 owner_decision_packet_only", /Step 3: `owner_decision_packet_only`/i.test(doc));
check("doc Step 3 execution started false", /Step 3 execution started\?: `false`/i.test(doc));
check("doc Step 3 completed false", /Step 3 completed\?: `false`/i.test(doc));
check("doc Step 4 not_started", /Step 4: `not_started`/i.test(doc));
check("doc Step 5 not_started", /Step 5: `not_started`/i.test(doc));
check("doc includes Option A", /Option A/i.test(doc));
check("doc includes Option B", /Option B/i.test(doc));
check("doc includes recommendation toward Option A", /Recommended path: Option A/i.test(doc));
check("doc warns recommendation is non-approval", /not owner approval/i.test(doc));
check("doc includes required v22.5 phrase exactly", doc.includes(REQUIRED_V225_APPROVAL_PHRASE));
check("doc says v22.5 phrase documented only", /documented only/i.test(doc));
check("doc says no v22.5 work performed", /no v22\.5 work is performed/i.test(doc));
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
