import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v22.0-step3-real-dealer-dry-run-readiness-planning.md";
const FIXTURE_PATH =
  "docs/examples/v22.0-step3-real-dealer-dry-run-readiness-planning.example.json";

const REQUIRED_V221_APPROVAL_PHRASE =
  "FINAL AUTHORIZE v22.1 STEP 3 REAL DEALER DRY-RUN PREP PACKET / THOR AUTO CANDIDATE ONLY / STAGING ONLY / NO PUBLIC / NO PRODUCTION / NO REAL LEAD / NO REAL CUSTOMER DATA / NO PII PHONE PLATE VIN / NO TOKEN HEADER COOKIE SECRET SHARING / NO REAL INVENTORY IMPORT YET / NO DEALER-FACING SEND / NO RETRY / NO SECOND-RUN / DO NOT MOVE TO STEP 4";

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

console.log("=== v22.0 step3 real dealer dry-run readiness planning validator ===\n");

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

check("version is v22.0", fixture.version === "v22.0");
check(
  "executionType matches",
  fixture.executionType === "STEP3_READINESS_PLANNING_ONLY_NO_REAL_DEALER_ACTION_NO_NEW_RUN"
);
check("repo matches", fixture.repo === "https://github.com/jorradol/nonga.git");
check("localPath matches", fixture.localPath === "D:\\nonga");
check("branch matches", fixture.branch === "feature/chat-image-attachment-v1");
check("expectedHead is 87106ac", fixture.expectedHead === "87106ac");
check(
  "expected latest commit message recorded",
  fixture.expectedLatestCommitMessage === "docs(ai): add v20.8 step2 closure record"
);

check("v20.8 baseline pass", fixture.baselineV208Pass === true);
check("step1 completed", fixture.step1Status === "completed", String(fixture.step1Status));
check("step2 completed", fixture.step2Status === "completed", String(fixture.step2Status));
check(
  "step3 readiness planning only",
  fixture.step3Status === "readiness_planning_only",
  String(fixture.step3Status)
);
check("step3 started false", fixture.step3Started === false);
check("step3 completed false", fixture.step3Completed === false);
check("step4 not_started", fixture.step4Status === "not_started", String(fixture.step4Status));
check("step5 not_started", fixture.step5Status === "not_started", String(fixture.step5Status));

check("no real dealer action", fixture.noRealDealerAction === true);
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
check("no retry", fixture.noRetry === true);
check("no second-run", fixture.noSecondRun === true);
check("no re-arm", fixture.noReArm === true);
check("no deploy", fixture.noDeploy === true);
check("no public", fixture.noPublic === true);
check("no production", fixture.noProduction === true);
check("owner-friendly controls included", fixture.ownerFriendlyControlsIncluded === true);
check(
  "future v22.1 approval phrase documented only",
  fixture.futureV221ApprovalPhraseDocumentedOnly === true
);
check(
  "separate fresh owner approval required before any Step 3 dry-run/prep execution",
  fixture.separateFreshOwnerApprovalRequiredBeforeStep3DryRunPrepExecution === true
);
check("owner approval not used to start step3", fixture.ownerApprovalUsedToStartStep3Execution === false);
check("step3 execution started in v22.0 false", fixture.step3ExecutionStartedInV220 === false);
check("did not move to step4", fixture.movedToStep4 === false);

check(
  "doc includes v20.8 baseline pass",
  doc.includes("PASS — v20.8 Step 2 closure record completed, Step 2 completed, Step 3 not started")
);
check("doc records step1 completed", /Step 1: `completed`/i.test(doc));
check("doc records step2 completed", /Step 2: `completed`/i.test(doc));
check("doc records step3 readiness planning only", /Step 3: `readiness_planning_only`/i.test(doc));
check("doc records step3 started false", /Step 3 started\?: `false`/i.test(doc));
check("doc records step3 completed false", /Step 3 completed\?: `false`/i.test(doc));
check("doc records step4 not_started", /Step 4: `not_started`/i.test(doc));
check("doc records step5 not_started", /Step 5: `not_started`/i.test(doc));
check("doc records no real dealer action", /no real dealer action/i.test(doc));
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
check("doc records owner-friendly controls included", /owner-friendly controls included/i.test(doc));
check("doc includes required v22.1 phrase exactly", doc.includes(REQUIRED_V221_APPROVAL_PHRASE));
check("doc says phrase documented only", /documented only/i.test(doc));
check(
  "doc says separate fresh owner approval required",
  /separate fresh owner approval required before any Step 3 dry-run\/prep execution/i.test(doc)
);
check("doc says do not start step3", /do not start Step 3 execution/i.test(doc));
check("doc says do not move to step4", /do not move to Step 4/i.test(doc));
check("doc has owner-friendly checklist section", /Owner-friendly checklist draft/i.test(doc));
check("doc has technical readiness section", /Technical readiness checklist for น้องซี/i.test(doc));
check("doc has pass need review hold section", /PASS \/ NEED REVIEW \/ HOLD criteria/i.test(doc));
check("doc confirms planning only", /READINESS PLANNING ONLY/i.test(doc));
check(
  "doc includes exact thai boundary statement",
  doc.includes("ยังไม่ public, ยังไม่ production, ยังไม่ real dealer, ยังไม่ real lead และยังไม่แตะของจริง")
);

console.log(`\nDone - ${failures} failure(s).\n`);
if (failures > 0) {
  process.exitCode = 1;
  process.exit(process.exitCode);
}
