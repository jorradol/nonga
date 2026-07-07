import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v22.1-step3-real-dealer-dry-run-prep-packet.md";
const FIXTURE_PATH = "docs/examples/v22.1-step3-real-dealer-dry-run-prep-packet.example.json";

const REQUIRED_V221_APPROVAL_PHRASE =
  "FINAL AUTHORIZE v22.1 STEP 3 REAL DEALER DRY-RUN PREP PACKET / THOR AUTO CANDIDATE ONLY / STAGING ONLY / NO PUBLIC / NO PRODUCTION / NO REAL LEAD / NO REAL CUSTOMER DATA / NO PII PHONE PLATE VIN / NO TOKEN HEADER COOKIE SECRET SHARING / NO REAL INVENTORY IMPORT YET / NO DEALER-FACING SEND / NO RETRY / NO SECOND-RUN / DO NOT MOVE TO STEP 4";

const REQUIRED_V222_APPROVAL_PHRASE =
  "FINAL AUTHORIZE v22.2 THOR AUTO DRY-RUN DATA SHAPE REVIEW / MOCK OR SANITIZED TEMPLATE ONLY / STAGING ONLY / NO PUBLIC / NO PRODUCTION / NO REAL LEAD / NO REAL CUSTOMER DATA / NO PII PHONE PLATE VIN / NO TOKEN HEADER COOKIE SECRET SHARING / NO REAL INVENTORY IMPORT YET / NO DEALER-FACING SEND / NO RETRY / NO SECOND-RUN / DO NOT MOVE TO STEP 4";

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

console.log("=== v22.1 step3 real dealer dry-run prep packet validator ===\n");

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

check("version is v22.1", fixture.version === "v22.1");
check(
  "executionType matches",
  fixture.executionType ===
    "STEP3_REAL_DEALER_DRY_RUN_PREP_PACKET_ONLY_THOR_AUTO_CANDIDATE_NO_REAL_INVENTORY_IMPORT_NO_DEALER_FACING_SEND_NO_REAL_LEAD"
);
check("repo matches", fixture.repo === "https://github.com/jorradol/nonga.git");
check("localPath matches", fixture.localPath === "D:\\nonga");
check("branch matches", fixture.branch === "feature/chat-image-attachment-v1");
check("expectedHead is 766e4e6", fixture.expectedHead === "766e4e6");
check(
  "expected latest commit message recorded",
  fixture.expectedLatestCommitMessage === "docs(ai): add v22.0 step3 real dealer dry-run readiness planning"
);

check("v22.0 baseline pass", fixture.baselineV220Pass === true);
check("exact v22.1 owner approval phrase recorded", fixture.ownerV221ApprovalPhraseRecordedExact === true);
check("prep packet only", fixture.prepPacketOnly === true);
check("Thor Auto candidate only", fixture.thorAutoCandidateOnly === true);
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
check("Step 3 prep_packet_only", fixture.step3Status === "prep_packet_only", String(fixture.step3Status));
check("Step 3 execution started false", fixture.step3ExecutionStarted === false);
check("Step 3 completed false", fixture.step3Completed === false);
check("Step 4 not_started", fixture.step4Status === "not_started", String(fixture.step4Status));
check("Step 5 not_started", fixture.step5Status === "not_started", String(fixture.step5Status));

check("owner-friendly checklist included", fixture.ownerFriendlyChecklistIncluded === true);
check("technical readiness checklist included", fixture.technicalReadinessChecklistIncluded === true);
check("data safety / PDPA guardrails included", fixture.dataSafetyPdpaGuardrailsIncluded === true);
check(
  "allowed placeholder/mock data guidance included",
  fixture.allowedPlaceholderMockDataGuidanceIncluded === true
);
check("disallowed real data guidance included", fixture.disallowedRealDataGuidanceIncluded === true);
check("PASS / NEED REVIEW / HOLD criteria included", fixture.passNeedReviewHoldCriteriaIncluded === true);
check("future v22.2 approval phrase documented only", fixture.futureV222ApprovalPhraseDocumentedOnly === true);
check("no approval to import real inventory", fixture.approvalToImportRealInventoryIncluded === false);
check("no approval to contact dealer", fixture.approvalToContactDealerIncluded === false);
check("no approval to create/send real lead", fixture.approvalToCreateSendRealLeadIncluded === false);
check("no Step 4 movement", fixture.step4MovementIncluded === false);

check(
  "doc includes v22.0 baseline PASS",
  doc.includes("PASS — v22.0 Step 3 real dealer dry-run readiness planning prepared, Step 3 execution not started")
);
check("doc includes exact v22.1 owner phrase", doc.includes(REQUIRED_V221_APPROVAL_PHRASE));
check("doc says prep packet only", /prep packet only/i.test(doc));
check("doc says Thor Auto candidate only", /Thor Auto candidate only/i.test(doc));
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
check("doc Step 3 prep_packet_only", /Step 3: `prep_packet_only`/i.test(doc));
check("doc Step 3 execution started false", /Step 3 execution started\?: `false`/i.test(doc));
check("doc Step 3 completed false", /Step 3 completed\?: `false`/i.test(doc));
check("doc Step 4 not_started", /Step 4: `not_started`/i.test(doc));
check("doc Step 5 not_started", /Step 5: `not_started`/i.test(doc));
check("doc includes owner-friendly checklist", /Owner-friendly checklist draft/i.test(doc));
check("doc includes technical checklist", /Technical readiness checklist for น้องซี/i.test(doc));
check("doc includes data safety / PDPA guardrails", /Data safety \/ PDPA guardrails/i.test(doc));
check("doc includes allowed placeholder guidance", /Allowed placeholder\/mock data guidance/i.test(doc));
check("doc includes disallowed real data guidance", /Disallowed real data guidance/i.test(doc));
check("doc includes PASS / NEED REVIEW / HOLD", /PASS \/ NEED REVIEW \/ HOLD criteria/i.test(doc));
check("doc includes required v22.2 phrase exactly", doc.includes(REQUIRED_V222_APPROVAL_PHRASE));
check("doc says v22.2 phrase documented only", /documented only/i.test(doc));
check("doc says not treated as approval", /not treated as approval/i.test(doc));
check("doc no approval to import real inventory", /no approval to import real inventory/i.test(doc));
check("doc no approval to contact dealer", /no approval to contact dealer/i.test(doc));
check("doc no approval to create/send real lead", /no approval to create\/send real lead/i.test(doc));
check("doc no step 4 movement", /no Step 4 movement/i.test(doc));
check(
  "doc includes exact thai boundary statement",
  doc.includes("ยังไม่ public, ยังไม่ production, ยังไม่ real dealer, ยังไม่ real lead และยังไม่แตะของจริง")
);

console.log(`\nDone - ${failures} failure(s).\n`);
if (failures > 0) {
  process.exitCode = 1;
  process.exit(process.exitCode);
}
