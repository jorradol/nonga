import { existsSync, readFileSync } from "node:fs";

const DOC_PATH = "docs/v20.7-step2-closure-readiness-packet.md";
const FIXTURE_PATH = "docs/examples/v20.7-step2-closure-readiness-packet.example.json";

const FUTURE_V208_PHRASE =
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

console.log("=== v20.7 step2 closure readiness packet validator ===\n");

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

const allowedStepStatus = new Set(["completed", "started", "not_started", "ready_for_owner_closure_decision"]);

check("version is v20.7", fixture.version === "v20.7");
check(
  "executionType matches",
  fixture.executionType === "STEP2_CLOSURE_READINESS_PACKET_ONLY_RECORD_ONLY_NO_NEW_RUN"
);
check("repo matches", fixture.repo === "https://github.com/jorradol/nonga.git");
check("localPath matches", fixture.localPath === "D:\\nonga");
check("branch matches", fixture.branch === "feature/chat-image-attachment-v1");
check("expectedHead is 345e618", fixture.expectedHead === "345e618");

check("baseline v20.6 pass and pushed", fixture.baselineV206PassAndPushed === true);
check("owner selected Option B", fixture.ownerSelectedOptionB === true);
check("closureReadinessOnly true", fixture.closureReadinessOnly === true);
check("noNewRun true", fixture.noNewRun === true);

check(
  "step1Status fail-closed completed",
  allowedStepStatus.has(fixture.step1Status) && fixture.step1Status === "completed",
  String(fixture.step1Status)
);
check(
  "step2Status fail-closed readiness",
  allowedStepStatus.has(fixture.step2Status) && fixture.step2Status === "ready_for_owner_closure_decision",
  String(fixture.step2Status)
);
check("step2Completed remains false", fixture.step2Completed === false);
check(
  "step3Status fail-closed not_started",
  allowedStepStatus.has(fixture.step3Status) && fixture.step3Status === "not_started",
  String(fixture.step3Status)
);
check(
  "step4Status fail-closed not_started",
  allowedStepStatus.has(fixture.step4Status) && fixture.step4Status === "not_started",
  String(fixture.step4Status)
);
check(
  "step5Status fail-closed not_started",
  allowedStepStatus.has(fixture.step5Status) && fixture.step5Status === "not_started",
  String(fixture.step5Status)
);

check("owner evidence recorded", fixture.ownerEvidenceRecorded === true);
check("private tester evidence recorded", fixture.privateTesterEvidenceRecorded === true);
check("owner summary recorded", fixture.ownerSummaryRecorded === true);
check("tester summary recorded", fixture.testerSummaryRecorded === true);
check("future v20.8 phrase documented only", fixture.futureV208ApprovalPhraseDocumentedOnly === true);
check("future v20.8 phrase not active", fixture.futureV208ApprovalPhraseActiveInThisTask === false);

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
check("step3Started false", fixture.step3Started === false);

const next = String(fixture.nextRecommendedStep ?? "");
check("nextRecommendedStep mentions v20.8", /v20\.8/i.test(next));
check("nextRecommendedStep does not move to Step 3", !/step\s*3/i.test(next));

check("doc includes v20.6 baseline pass pushed", /v20\.6 pushed successfully/i.test(doc));
check("doc records owner selected option b", /Option B selected/i.test(doc));
check("doc states closure readiness only", /closure readiness only/i.test(doc));
check("doc states no new run", /no new run/i.test(doc));
check("doc includes owner evidence summary", doc.includes("ทดลองถามแล้วตอบได้ดีมากไม่มีอะไรหลุดมา ปลอดภัยครับ"));
check("doc includes tester evidence summary", doc.includes("ให้คำแนะนำได้ดีเป็นธรรมชาติ"));
check("doc includes inventory limitation note", doc.includes("does not prove full inventory matching quality"));
check("doc keeps Step 2 not completed", /Step 2 completed\?: `false`/i.test(doc));
check("doc keeps Step 3 not started", /Step 3: `not_started`/i.test(doc));
check("doc keeps Step 4 not started", /Step 4: `not_started`/i.test(doc));
check("doc keeps Step 5 not started", /Step 5: `not_started`/i.test(doc));
check("doc includes future v20.8 phrase", doc.includes(FUTURE_V208_PHRASE));
check("doc states phrase documented only", /documented only/i.test(doc));
check("doc has no public/production/real dealer/lead/customer/pii", /no public[\s\S]*no production[\s\S]*no real dealer[\s\S]*no real lead[\s\S]*no real customer data[\s\S]*no PII/i.test(doc));
check(
  "doc includes exact thai boundary statement",
  doc.includes("ยังไม่ public, ยังไม่ production, ยังไม่ real dealer, ยังไม่ real lead และยังไม่แตะของจริง")
);

console.log(`\nDone - ${failures} failure(s).\n`);
if (failures > 0) {
  process.exitCode = 1;
  process.exit(process.exitCode);
}
