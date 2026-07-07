import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v20.8-step2-closure-record.md";
const FIXTURE_PATH = "docs/examples/v20.8-step2-closure-record.example.json";

const REQUIRED_APPROVAL_PHRASE =
  "FINAL AUTHORIZE v20.8 STEP 2 CLOSURE RECORD / MARK STEP 2 COMPLETED ONLY / NO NEW RUN / NO TOKEN HEADER COOKIE SECRET SHARING / NO RETRY / NO SECOND-RUN / NO RE-ARM / NO PUBLIC / NO PRODUCTION / NO REAL DEALER / NO REAL LEAD / NO REAL CUSTOMER DATA / NO PII PHONE PLATE VIN / DO NOT START STEP 3";

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

console.log("=== v20.8 step2 closure record validator ===\n");

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

const allowedStatus = new Set(["completed", "not_started", "started", "ready_for_owner_closure_decision"]);

check("version is v20.8", fixture.version === "v20.8");
check(
  "executionType matches",
  fixture.executionType === "STEP2_CLOSURE_RECORD_ONLY_MARK_STEP2_COMPLETED_ONLY_NO_NEW_RUN"
);
check("repo matches", fixture.repo === "https://github.com/jorradol/nonga.git");
check("localPath matches", fixture.localPath === "D:\\nonga");
check("branch matches", fixture.branch === "feature/chat-image-attachment-v1");
check("expectedHead is 249842b", fixture.expectedHead === "249842b");

check("baseline v20.7 pass", fixture.baselineV207Pass === true);
check("owner approval phrase recorded exact flag", fixture.ownerApprovalPhraseRecordedExact === true);
check("closureRecordOnly true", fixture.closureRecordOnly === true);
check("noNewRun true", fixture.noNewRun === true);

check(
  "step1Status fail-closed completed",
  allowedStatus.has(fixture.step1Status) && fixture.step1Status === "completed",
  String(fixture.step1Status)
);
check(
  "step2Status fail-closed completed",
  allowedStatus.has(fixture.step2Status) && fixture.step2Status === "completed",
  String(fixture.step2Status)
);
check("step2Completed true", fixture.step2Completed === true);
check(
  "step3Status fail-closed not_started",
  allowedStatus.has(fixture.step3Status) && fixture.step3Status === "not_started",
  String(fixture.step3Status)
);
check(
  "step4Status fail-closed not_started",
  allowedStatus.has(fixture.step4Status) && fixture.step4Status === "not_started",
  String(fixture.step4Status)
);
check(
  "step5Status fail-closed not_started",
  allowedStatus.has(fixture.step5Status) && fixture.step5Status === "not_started",
  String(fixture.step5Status)
);

check("owner evidence recorded", fixture.ownerEvidenceRecorded === true);
check("private tester evidence recorded", fixture.privateTesterEvidenceRecorded === true);
check("owner summary recorded", fixture.ownerSummaryRecorded === true);
check("tester summary recorded", fixture.testerSummaryRecorded === true);

check("agentBrowserExecution false", fixture.agentBrowserExecution === false);
check("newOwnerRunRequested false", fixture.newOwnerRunRequested === false);
check("newPrivateTesterRunRequested false", fixture.newPrivateTesterRunRequested === false);
check("tokenHandlingRequired false", fixture.tokenHandlingRequired === false);
check("envVarRequiredForOwnerOrTester false", fixture.envVarRequiredForOwnerOrTester === false);
check("secretExposure false", fixture.secretExposure === false);
check("headerCookieExposure false", fixture.headerCookieExposure === false);
check("retry false", fixture.retry === false);
check("secondRun false", fixture.secondRun === false);
check("reArm false", fixture.reArm === false);
check("deploy false", fixture.deploy === false);
check("public false", fixture.public === false);
check("production false", fixture.production === false);
check("realDealerAction false", fixture.realDealerAction === false);
check("realLead false", fixture.realLead === false);
check("realCustomerData false", fixture.realCustomerData === false);
check("piiPhonePlateVin false", fixture.piiPhonePlateVin === false);
check("inventoryMatchingQualityProven false", fixture.inventoryMatchingQualityProven === false);

check("no step3 start approval included", fixture.step3StartApprovalIncluded === false);
check(
  "future step3 requires fresh owner approval",
  fixture.futureStep3RequiresFreshOwnerApproval === true
);

const next = String(fixture.nextRecommendedStep ?? "");
check("nextRecommendedStep mentions v22", /v22/i.test(next));
check("nextRecommendedStep indicates fresh owner approval", /fresh owner approval/i.test(next));
check("nextRecommendedStep does not start step3", !/start step\s*3/i.test(next));

check("doc includes v20.7 baseline pass", /v20\.7 Step 2 closure readiness packet prepared/i.test(doc));
check("doc includes exact v20.8 approval phrase", doc.includes(REQUIRED_APPROVAL_PHRASE));
check("doc states closure record only", /closure record only/i.test(doc));
check("doc states no new run", /no new run/i.test(doc));
check("doc states no token header cookie secret env handling", /no token\/header\/cookie\/secret\/env handling/i.test(doc));
check("doc includes owner evidence summary", doc.includes("ทดลองถามแล้วตอบได้ดีมากไม่มีอะไรหลุดมา ปลอดภัยครับ"));
check("doc includes tester evidence summary", doc.includes("ให้คำแนะนำได้ดีเป็นธรรมชาติ"));
check("doc includes inventory limitation", doc.includes("not proof of full inventory matching quality"));
check("doc step1 completed", /Step 1: `completed`/i.test(doc));
check("doc step2 completed", /Step 2: `completed`/i.test(doc) && /Step 2 completed\?: `true`/i.test(doc));
check("doc step3 not_started", /Step 3: `not_started`/i.test(doc));
check("doc step4 not_started", /Step 4: `not_started`/i.test(doc));
check("doc step5 not_started", /Step 5: `not_started`/i.test(doc));
check(
  "doc has no public production real dealer lead customer pii",
  /no public[\s\S]*no production[\s\S]*no real dealer[\s\S]*no real lead[\s\S]*no real customer data[\s\S]*no PII/i.test(doc)
);
check("doc no step3 start approval", /does not authorize Step 3 start/i.test(doc));
check("doc future step3 needs fresh approval", /separate fresh owner approval/i.test(doc));
check(
  "doc includes exact thai boundary statement",
  doc.includes("ยังไม่ public, ยังไม่ production, ยังไม่ real dealer, ยังไม่ real lead และยังไม่แตะของจริง")
);

console.log(`\nDone - ${failures} failure(s).\n`);
if (failures > 0) {
  process.exitCode = 1;
  process.exit(process.exitCode);
}
